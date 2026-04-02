import logging

import aiosmtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.config import settings

logger = logging.getLogger(__name__)


def _build_otp_html(full_name: str, otp: str, expire_minutes: int) -> str:
    return f"""
    <html><body style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px">
      <h2 style="color:#4F46E5">TrackTicket — Password Reset</h2>
      <p>Hi <strong>{full_name}</strong>,</p>
      <p>Your one-time password (OTP) to reset your account password is:</p>
      <div style="background:#F3F4F6;border-radius:8px;padding:20px;text-align:center;margin:20px 0">
        <span style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#4F46E5">{otp}</span>
      </div>
      <p>This OTP expires in <strong>{expire_minutes} minutes</strong>.</p>
      <p>If you did not request this, please ignore this email.</p>
      <hr style="margin-top:30px"/>
      <p style="color:#9CA3AF;font-size:12px">TrackTicket — AI Ticket Management System</p>
    </body></html>
    """


def _build_ticket_html(full_name: str, ticket_title: str, ticket_id: str, status: str) -> str:
    return f"""
    <html><body style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px">
      <h2 style="color:#4F46E5">TrackTicket — Ticket Update</h2>
      <p>Hi <strong>{full_name}</strong>,</p>
      <p>Your support ticket has been updated:</p>
      <div style="background:#F3F4F6;border-radius:8px;padding:16px;margin:20px 0">
        <p><strong>Ticket:</strong> {ticket_title}</p>
        <p><strong>New Status:</strong> <span style="color:#4F46E5">{status.upper()}</span></p>
        <p><strong>Reference:</strong> #{str(ticket_id)[:8].upper()}</p>
      </div>
      <p>Login to TrackTicket to view details and respond.</p>
      <hr style="margin-top:30px"/>
      <p style="color:#9CA3AF;font-size:12px">TrackTicket — AI Ticket Management System</p>
    </body></html>
    """


async def _send_email(to: str, subject: str, html: str) -> bool:
    """Core async send. Returns True on success, False on failure."""
    if not settings.smtp_user or not settings.smtp_password:
        logger.warning("SMTP not configured — skipping email to %s", to)
        return False

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{settings.email_from_name} <{settings.email_from or settings.smtp_user}>"
    msg["To"] = to
    msg.attach(MIMEText(html, "html"))

    try:
        await aiosmtplib.send(
            msg,
            hostname=settings.smtp_host,
            port=settings.smtp_port,
            username=settings.smtp_user,
            password=settings.smtp_password,
            start_tls=True,
        )
        logger.info("Email sent to %s — %s", to, subject)
        return True
    except Exception:
        logger.exception("Failed to send email to %s", to)
        return False


async def send_otp_email(to: str, full_name: str, otp: str) -> bool:
    html = _build_otp_html(full_name, otp, settings.otp_expire_minutes)
    return await _send_email(
        to=to,
        subject=f"[{settings.app_name}] Your password reset OTP",
        html=html,
    )


async def send_ticket_update_email(
    to: str, full_name: str, ticket_title: str, ticket_id: str, status: str
) -> bool:
    html = _build_ticket_html(full_name, ticket_title, ticket_id, status)
    return await _send_email(
        to=to,
        subject=f"[{settings.app_name}] Your ticket status has been updated",
        html=html,
    )


async def send_ticket_assigned_email(
    to: str, full_name: str, ticket_title: str, ticket_id: str
) -> bool:
    html = f"""
    <html><body style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px">
      <h2 style="color:#4F46E5">TrackTicket — New Ticket Assigned</h2>
      <p>Hi <strong>{full_name}</strong>,</p>
      <p>A new ticket has been assigned to you:</p>
      <div style="background:#F3F4F6;border-radius:8px;padding:16px;margin:20px 0">
        <p><strong>Ticket:</strong> {ticket_title}</p>
        <p><strong>Reference:</strong> #{str(ticket_id)[:8].upper()}</p>
      </div>
      <p>Login to TrackTicket to view and respond.</p>
    </body></html>
    """
    return await _send_email(
        to=to,
        subject=f"[{settings.app_name}] New ticket assigned to you",
        html=html,
    )
