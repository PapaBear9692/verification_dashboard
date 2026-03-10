import random
import os
from datetime import datetime, timedelta
from flask import session
from dotenv import load_dotenv
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

load_dotenv()

# ---------------------------------------------------------------------------
# Configuration — add these to your .env file:
#
#   SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxx
#   SENDGRID_SENDER=yourverifiedemail@gmail.com
# ---------------------------------------------------------------------------

SENDGRID_API_KEY   = os.getenv("SENDGRID_API_KEY")
SENDGRID_SENDER    = os.getenv("SENDGRID_SENDER")
OTP_EXPIRY_MINUTES = 10


class OTPModel:

    # ------------------------------------------------------------------
    # SEND OTP
    # Generates a 6-digit OTP, stores it in Flask session, emails it.
    # Returns (True, "message") on success, (False, "error") on failure.
    # ------------------------------------------------------------------
    def send_otp(self, username: str, email: str) -> tuple[bool, str]:
        otp = str(random.randint(100000, 999999))
        expiry = (datetime.now() + timedelta(minutes=OTP_EXPIRY_MINUTES)).isoformat()

        # Store in session — keyed by username so concurrent users don't clash
        session["otp_data"] = {
            "username": username,
            "otp":      otp,
            "expiry":   expiry,
            "verified": False,
        }

        success, msg = self._send_email(email, otp)
        if not success:
            session.pop("otp_data", None)   # clean up on send failure
            return False, msg

        masked = self._mask_email(email)
        return True, f"OTP sent to {masked}. Valid for {OTP_EXPIRY_MINUTES} minutes."


    # ------------------------------------------------------------------
    # VERIFY OTP
    # Checks the OTP the user typed against what we stored in session.
    # Returns (True, "ok") or (False, "reason").
    # ------------------------------------------------------------------
    def verify_otp(self, username: str, otp_input: str) -> tuple[bool, str]:
        otp_data = session.get("otp_data")

        if not otp_data:
            return False, "No OTP request found. Please request a new OTP."

        if otp_data.get("username") != username:
            return False, "Username mismatch. Please request a new OTP."

        expiry = datetime.fromisoformat(otp_data["expiry"])
        if datetime.now() > expiry:
            session.pop("otp_data", None)
            return False, "OTP has expired. Please request a new one."

        if otp_data.get("otp") != str(otp_input).strip():
            return False, "Incorrect OTP. Please try again."

        # Mark as verified — app.py reset route checks this flag
        session["otp_data"]["verified"] = True
        return True, "OTP verified successfully."


    # ------------------------------------------------------------------
    # IS VERIFIED?
    # Used by app.py before allowing the final password reset.
    # ------------------------------------------------------------------
    def is_otp_verified(self, username: str) -> bool:
        otp_data = session.get("otp_data")
        if not otp_data:
            return False
        if otp_data.get("username") != username:
            return False
        if not otp_data.get("verified"):
            return False
        expiry = datetime.fromisoformat(otp_data["expiry"])
        if datetime.now() > expiry:
            session.pop("otp_data", None)
            return False
        return True


    # ------------------------------------------------------------------
    # CLEAR OTP
    # Called after a successful password reset to clean up session.
    # ------------------------------------------------------------------
    def clear_otp(self):
        session.pop("otp_data", None)


    # ------------------------------------------------------------------
    # INTERNAL: Send email via SendGrid HTTP API (no SMTP, uses port 443)
    # ------------------------------------------------------------------
    def _send_email(self, recipient: str, otp: str) -> tuple[bool, str]:
        if not SENDGRID_API_KEY or not SENDGRID_SENDER:
            return False, "Email service is not configured. Contact your administrator."

        body = f"""Hello,

Your One-Time Password (OTP) for resetting your Square Pharmaceuticals
Verification Portal password is:

        {otp}

This OTP is valid for {OTP_EXPIRY_MINUTES} minutes.
If you did not request this, please ignore this email.

— Square Pharmaceuticals PLC. IT Team"""

        message = Mail(
            from_email=SENDGRID_SENDER,
            to_emails=recipient,
            subject="Square Pharma — Password Reset OTP",
            plain_text_content=body,
        )

        try:
            sg = SendGridAPIClient(SENDGRID_API_KEY)
            response = sg.send(message)

            # SendGrid returns 2xx on success
            if response.status_code in (200, 201, 202):
                return True, "Email sent."
            else:
                return False, f"SendGrid returned status {response.status_code}."

        except Exception as e:
            return False, f"Failed to send email: {str(e)}"


    # ------------------------------------------------------------------
    # INTERNAL: Mask email for display
    # john.doe@squaregroup.com  →  j*******e@squaregroup.com
    # ------------------------------------------------------------------
    def _mask_email(self, email: str) -> str:
        try:
            local, domain = email.split("@", 1)
            if len(local) <= 2:
                masked_local = "*" * len(local)
            else:
                masked_local = local[0] + "*" * (len(local) - 2) + local[-1]
            return f"{masked_local}@{domain}"
        except Exception:
            return "your registered email"