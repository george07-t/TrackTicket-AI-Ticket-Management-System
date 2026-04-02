import logging

from langchain_core.output_parsers import JsonOutputParser
from langchain_core.prompts import PromptTemplate
from langchain_groq import ChatGroq
from pydantic import BaseModel, ValidationError
from groq import AuthenticationError

from app.config import settings
from app.models.ticket import TicketCategory, TicketPriority

logger = logging.getLogger(__name__)

_PROMPT_TEMPLATE = """\
You are an expert support ticket classifier for a SaaS platform.
Analyze the ticket below and return ONLY valid JSON — no explanation, no markdown, no extra text.

Ticket Title: {title}
Ticket Description: {description}

Classification rules:
- category must be one of: billing, technical, account, general
  * billing  → payment issues, invoices, refunds, pricing, charges
  * technical → bugs, crashes, performance, integrations, API errors
  * account   → login, password, permissions, profile, deactivation
  * general   → feature requests, questions, feedback, anything else

- priority must be one of: low, medium, high, critical
  * critical → system down, data loss, security breach, no workaround
  * high     → major feature broken, significant business impact
  * medium   → partial degradation, workaround exists
  * low      → cosmetic, question, feature request

- suggested_response: a professional, empathetic first-response message (2-3 sentences)
- confidence_note: a brief note explaining your classification reasoning (1 sentence)

Return JSON with exactly these keys:
{{
  "category": "...",
  "priority": "...",
  "suggested_response": "...",
  "confidence_note": "..."
}}
"""

_ASSIGNMENT_PROMPT_TEMPLATE = """\
You are an expert support operations router.
Choose the best agent for this ticket from the provided candidate list.
Return ONLY valid JSON.

Ticket Title: {title}
Ticket Description: {description}
Ticket Category: {category}
Ticket Priority: {priority}

Candidate Agents JSON: {agents_json}

Rules:
- Pick at most one agent ID from the candidate list.
- Prefer skill match first, then lower current_load_ratio.
- If no strong match exists, return null for suggested_agent_id.
- confidence must be a float from 0 to 1.
- rationale must be a concise sentence.

Return JSON with exactly these keys:
{{
    "suggested_agent_id": "uuid-or-null",
    "confidence": 0.0,
    "rationale": "..."
}}
"""

_REPLY_PROMPT_TEMPLATE = """\
You are a senior customer support agent.
Write a concise, empathetic, and actionable support reply.

Ticket Title: {title}
Ticket Description: {description}
Ticket Status: {status}
Previous Suggested Reply: {previous_reply}
Recent Conversation Context: {conversation_context}

Rules:
- Keep to 2-4 sentences.
- Acknowledge the issue and mention the next best action.
- If status is resolved/closed, confirm resolution and ask if anything else is needed.
- If status is open/in_progress, give clear next step and expected follow-up.
- Do not include markdown.

Return only plain text.
"""


class AiClassification(BaseModel):
    category: TicketCategory
    priority: TicketPriority
    suggested_response: str
    confidence_note: str = ""


class AiAgentSuggestion(BaseModel):
    suggested_agent_id: str | None = None
    confidence: float = 0.0
    rationale: str = ""


class AiService:
    def __init__(self) -> None:
        api_key = settings.normalized_groq_api_key
        self._enabled = bool(
            api_key and not api_key.startswith("your-")
        )
        if self._enabled:
            self._llm = ChatGroq(
                api_key=api_key,
                model="llama-3.3-70b-versatile",
                temperature=0,
                max_tokens=512,
            )
            self._parser = JsonOutputParser()
            self._prompt = PromptTemplate.from_template(_PROMPT_TEMPLATE)
            self._chain = self._prompt | self._llm | self._parser
            self._assignment_prompt = PromptTemplate.from_template(_ASSIGNMENT_PROMPT_TEMPLATE)
            self._assignment_chain = self._assignment_prompt | self._llm | self._parser
            self._reply_prompt = PromptTemplate.from_template(_REPLY_PROMPT_TEMPLATE)
            self._reply_chain = self._reply_prompt | self._llm

    @staticmethod
    def fallback_classification() -> AiClassification:
        return AiClassification(
            category=TicketCategory.GENERAL,
            priority=TicketPriority.MEDIUM,
            suggested_response=(
                "Thank you for reaching out to our support team. "
                "We have received your request and a team member will review it shortly."
            ),
            confidence_note="Fallback classification — AI unavailable.",
        )

    async def classify_ticket(self, title: str, description: str) -> AiClassification:
        if not self._enabled:
            return self.fallback_classification()

        try:
            raw: dict = await self._chain.ainvoke(
                {"title": title, "description": description}
            )
        except AuthenticationError:
            logger.error("Groq authentication failed. Check GROQ_API_KEY in backend .env")
            return self.fallback_classification()
        except Exception:
            logger.exception("Groq API call failed")
            return self.fallback_classification()

        try:
            return AiClassification(**raw)
        except (ValidationError, TypeError):
            logger.warning("AI returned invalid JSON shape: %s", raw)
            return self.fallback_classification()

    async def suggest_agent(
        self,
        *,
        title: str,
        description: str,
        category: str,
        priority: str,
        agents_json: str,
    ) -> AiAgentSuggestion:
        if not self._enabled:
            return AiAgentSuggestion(confidence=0.0, rationale="AI unavailable")

        try:
            raw: dict = await self._assignment_chain.ainvoke(
                {
                    "title": title,
                    "description": description,
                    "category": category,
                    "priority": priority,
                    "agents_json": agents_json,
                }
            )
        except AuthenticationError:
            logger.error("Groq authentication failed during assignment suggestion")
            return AiAgentSuggestion(confidence=0.0, rationale="AI auth failed")
        except Exception:
            logger.exception("Groq assignment suggestion failed")
            return AiAgentSuggestion(confidence=0.0, rationale="AI call failed")

        try:
            parsed = AiAgentSuggestion(**raw)
            parsed.confidence = max(0.0, min(1.0, float(parsed.confidence)))
            return parsed
        except (ValidationError, TypeError, ValueError):
            logger.warning("AI returned invalid assignment JSON shape: %s", raw)
            return AiAgentSuggestion(confidence=0.0, rationale="AI returned invalid format")

    async def generate_reply(
        self,
        *,
        title: str,
        description: str,
        status: str,
        previous_reply: str,
        conversation_context: str,
    ) -> str:
        if not self._enabled:
            return (
                "Thank you for your message. We are reviewing your request and "
                "will provide the next update shortly."
            )

        try:
            result = await self._reply_chain.ainvoke(
                {
                    "title": title,
                    "description": description,
                    "status": status,
                    "previous_reply": previous_reply or "none",
                    "conversation_context": conversation_context or "none",
                }
            )
            text = str(result.content if hasattr(result, "content") else result).strip()
            return text or (
                "Thank you for your message. We are reviewing your request and "
                "will provide the next update shortly."
            )
        except Exception:
            logger.exception("AI reply generation failed")
            return (
                "Thank you for your message. We are reviewing your request and "
                "will provide the next update shortly."
            )
