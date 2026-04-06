import os
import smtplib
from email.message import EmailMessage
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent / '.env')

SMTP_HOST = os.getenv("SMTP_HOST", "sandbox.smtp.mailtrap.io")
SMTP_PORT = int(os.getenv("SMTP_PORT", 2525))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASS = os.getenv("SMTP_PASS", "")

def send_email_with_pdf(to_email: str, subject: str, html_body: str, pdf_bytes: bytes, pdf_name: str = "weekly-summary.pdf"):
    """Sends an email with an optional PDF attachment."""
    if not SMTP_USER or not SMTP_PASS:
        print(f"Skipping email to {to_email} (No SMTP credentials)")
        return False
        
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = f"HabitFlow <no-reply@{SMTP_HOST}>"
    msg["To"] = to_email
    
    msg.set_content("Please enable HTML to view this email.")
    msg.add_alternative(html_body, subtype='html')
    
    if pdf_bytes:
        msg.add_attachment(pdf_bytes, maintype='application', subtype='pdf', filename=pdf_name)
        
    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.send_message(msg)
        return True
    except Exception as e:
        print(f"Error sending email to {to_email}: {e}")
        return False
