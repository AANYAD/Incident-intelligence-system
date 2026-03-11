"""
Run this to test your email setup BEFORE starting the backend.
Usage:  py test_email.py
"""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# ── FILL THESE IN ─────────────────────────────────────────────────────
SMTP_EMAIL    = "your@gmail.com"   # your Gmail
SMTP_PASSWORD = "16 char"      # 16-char App Password from:
                                         # https://myaccount.google.com/apppasswords
TEST_SEND_TO  = "your@gmail.com"  # who to send the test mail to (can be yourself)
# ──────────────────────────────────────────────────────────────────────

print("Testing email with:", SMTP_EMAIL)

try:
    msg = MIMEMultipart("alternative")
    msg["Subject"] = "UrbanPulse — Email Test"
    msg["From"]    = "UrbanPulse <{}>".format(SMTP_EMAIL)
    msg["To"]      = TEST_SEND_TO
    msg.attach(MIMEText("<h2 style='color:#ff4d00;'>UrbanPulse_</h2><p>Email is working correctly.</p>", "html"))

    with smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=10) as s:
        s.login(SMTP_EMAIL, SMTP_PASSWORD)
        s.sendmail(SMTP_EMAIL, TEST_SEND_TO, msg.as_string())

    print("SUCCESS — check your inbox at", TEST_SEND_TO)

except smtplib.SMTPAuthenticationError:
    print("FAILED — Wrong email or App Password.")
    print("Make sure you used an App Password, not your regular Gmail password.")
    print("Get one at: https://myaccount.google.com/apppasswords")

except smtplib.SMTPException as e:
    print("FAILED — SMTP error:", e)

except Exception as e:
    print("FAILED — Error:", e)
