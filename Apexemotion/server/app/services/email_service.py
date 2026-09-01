import html
import logging
import os
from datetime import datetime, timezone

import aiohttp

logger = logging.getLogger(__name__)

RESEND_API_URL = os.getenv("RESEND_API_URL", "https://api.resend.com/emails")
RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
EMAIL_FROM = os.getenv("ALERT_EMAIL_FROM", "ApexEmotion <onboarding@resend.dev>")
EMAIL_PROVIDER = os.getenv("ALERT_EMAIL_PROVIDER", "resend")


def build_alert_html(contact_name: str, risk_level: str, risk_score: float) -> str:
    safe_name = html.escape(contact_name)
    safe_level = html.escape(risk_level)
    score = f"{float(risk_score):.1f}"
    return f"""<!doctype html>
<html>
  <body style="font-family:Arial,sans-serif;background:#f6f8fb;padding:24px;color:#172033">
    <div style="max-width:620px;margin:auto;background:white;border:1px solid #e5e7eb;border-radius:12px;padding:28px">
      <h1 style="margin-top:0">ApexEmotion Wellbeing Alert</h1>
      <p>Hello {safe_name},</p>
      <p><strong>Persistent high emotional distress signals were detected.</strong></p>
      <p>Risk Level: <strong>{safe_level}</strong></p>
      <p>Risk Score: <strong>{score}/100</strong></p>
      <p>Please consider checking in with the user.</p>
      <hr style="border:0;border-top:1px solid #e5e7eb;margin:24px 0">
      <p style="font-size:13px;color:#64748b">
        This is an automated wellbeing alert and is not a medical diagnosis.
        No raw video, raw audio, or private chat transcript is included in this email.
      </p>
    </div>
  </body>
</html>"""


async def send_wellbeing_alert(contact_name: str, contact_email: str, risk_level: str, risk_score: float) -> dict:
    if EMAIL_PROVIDER.lower() != "resend":
        return {"success": False, "provider": EMAIL_PROVIDER, "message": "Unsupported email provider"}

    if not RESEND_API_KEY:
        return {"success": False, "provider": "resend", "message": "RESEND_API_KEY is not configured"}

    payload = {
        "from": EMAIL_FROM,
        "to": [contact_email],
        "subject": "ApexEmotion Wellbeing Alert",
        "html": build_alert_html(contact_name, risk_level, risk_score),
    }
    headers = {
        "Authorization": f"Bearer {RESEND_API_KEY}",
        "Content-Type": "application/json",
    }

    try:
        timeout = aiohttp.ClientTimeout(total=20)
        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.post(RESEND_API_URL, json=payload, headers=headers) as response:
                body = await response.text()
                if response.status >= 400:
                    logger.error("Resend email failed: %s %s", response.status, body[:500])
                    return {
                        "success": False,
                        "provider": "resend",
                        "message": f"Resend HTTP {response.status}: {body[:500]}",
                    }
                try:
                    data = await response.json()
                except Exception:
                    data = {}
                return {
                    "success": True,
                    "provider": "resend",
                    "message": data.get("id", "Email accepted by provider"),
                }
    except Exception as exc:
        logger.exception("Email provider request failed")
        return {"success": False, "provider": "resend", "message": str(exc)}
