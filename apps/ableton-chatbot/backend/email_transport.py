"""Send one email through the configured provider (SES in production, SMTP locally)."""

import logging
import os
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

log = logging.getLogger("beatmind.email")


def send_email(to_email: str, subject: str, plain: str, html: str, headers: dict | None = None) -> str:
    sender = os.getenv("SMTP_USER", "support@beatmind.io")
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"BeatMind <{sender}>"
    msg["To"] = to_email
    for key, value in (headers or {}).items():
        msg[key] = value
    msg.attach(MIMEText(plain, "plain", "utf-8"))
    msg.attach(MIMEText(html, "html", "utf-8"))
    provider = os.getenv("BEATMIND_EMAIL_PROVIDER", "smtp")
    if provider == "ses":
        import boto3
        result = boto3.client("ses", region_name=os.getenv("AWS_REGION", "us-east-1")).send_raw_email(
            Source=sender, Destinations=[to_email], RawMessage={"Data": msg.as_bytes()})
        return result["MessageId"]
    if provider != "smtp":
        raise RuntimeError("Unsupported email provider")
    import smtplib
    with smtplib.SMTP("smtp.gmail.com", 587, timeout=15) as server:
        server.starttls()
        server.login(sender, os.getenv("SMTP_PASSWORD", ""))
        server.sendmail(sender, to_email, msg.as_string())
    return "smtp"
