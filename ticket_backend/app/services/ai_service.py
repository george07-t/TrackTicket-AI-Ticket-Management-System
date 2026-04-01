from pydantic import BaseModel, ValidationError

from langchain_core.output_parsers import JsonOutputParser
from langchain_core.prompts import PromptTemplate
from langchain_groq import ChatGroq

from app.config import settings
from app.models.ticket import TicketCategory, TicketPriority


class AiClassification(BaseModel):
    category: TicketCategory
    priority: TicketPriority
    suggested_response: str


class AiService:
    def __init__(self) -> None:
        self._llm = ChatGroq(api_key=settings.groq_api_key, model="llama-3.3-70b-versatile", temperature=0)
        self._parser = JsonOutputParser()

    @staticmethod
    def fallback_classification() -> AiClassification:
        return AiClassification(
            category=TicketCategory.GENERAL,
            priority=TicketPriority.MEDIUM,
            suggested_response="Thanks for reaching out. Our team is reviewing your request.",
        )

    async def classify_ticket(self, title: str, description: str) -> AiClassification:
        if not settings.groq_api_key or settings.groq_api_key.startswith("your-"):
            return self.fallback_classification()

        prompt = PromptTemplate.from_template(
            """
You are a support ticket classifier. Return valid JSON only with keys:
category, priority, suggested_response.

Allowed category values: billing, technical, account, general
Allowed priority values: low, medium, high, critical

Ticket title: {title}
Ticket description: {description}

Return only JSON.
"""
        )

        chain = prompt | self._llm | self._parser
        try:
            raw = await chain.ainvoke({"title": title, "description": description})
        except Exception:
            return self.fallback_classification()

        try:
            return AiClassification(**raw)
        except ValidationError:
            return self.fallback_classification()
