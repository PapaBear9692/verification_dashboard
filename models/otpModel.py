import secrets
import redis
from flask_mail import Message


class OTPModel:
    """
    OTP Model for handling OTP generation, sending, and verification.
    Used for user registration and password reset flows.
    """

    def __init__(self, mail=None, redis_host='localhost', redis_port=6079):
        """
        Initialize OTPModel with mail and Redis configuration.
        
        Args:
            mail: Flask-Mail instance from the main app
            redis_host: Redis server host (default: localhost)
            redis_port: Redis server port (default: 6379)
        """
        self.mail = mail
        self.verified_otps = {}  # Track verified OTPs in session: {username: True/False}
        
        # Initialize Redis connection
        try:
            self.redis_conn = redis.Redis(
                host=redis_host, 
                port=redis_port, 
                decode_responses=True
            )
            # Test connection
            self.redis_conn.ping()
        except Exception as e:
            print(f"Redis Connection Error: {e}")
            self.redis_conn = None

    def generate_otp(self):
        """
        Generate a 6-digit OTP.
        
        Returns:
            str: 6-digit OTP code
        """
        return ''.join([str(secrets.randbelow(10)) for _ in range(6)])

    def send_otp(self, username, email):
        """
        Generate OTP, store in Redis, and send via email.
        
        Args:
            username (str): Username of the user
            email (str): Email address to send OTP to
            
        Returns:
            tuple: (success: bool, message: str)
        """
        if not self.mail:
            return False, "Mail service not configured"
        
        if not self.redis_conn:
            return False, "Redis connection failed"
        
        if not email:
            return False, "Email is required"

        try:
            otp_code = self.generate_otp()
            
            # Store OTP in Redis for 5 minutes (300 seconds)
            # Key format: otp:{username}
            self.redis_conn.setex(f"otp:{username}", 300, otp_code)
            
            # Send OTP via email
            msg = Message(
                "Your OTP for Password Reset",
                recipients=[email]
            )
            msg.body = (
                f"Hello {username},\n\n"
                f"Your OTP for account recovery is: {otp_code}\n\n"
                f"This code will expire in 5 minutes.\n\n"
                f"If you did not request this OTP, please ignore this email."
            )
            self.mail.send(msg)
            
            return True, "OTP successfully sent to your email"
        except Exception as e:
            return False, f"Failed to send OTP: {str(e)}"

    def verify_otp(self, username, otp_input):
        """
        Verify the OTP provided by the user.
        
        Args:
            username (str): Username of the user
            otp_input (str): OTP provided by the user
            
        Returns:
            tuple: (verified: bool, message: str)
        """
        if not self.redis_conn:
            return False, "Redis connection failed"
        
        if not username or not otp_input:
            return False, "Username and OTP are required"

        try:
            stored_otp = self.redis_conn.get(f"otp:{username}")
            
            if not stored_otp:
                return False, "OTP has expired or is invalid"
            
            if stored_otp == str(otp_input).strip():
                # Mark OTP as verified in session
                self.verified_otps[username] = True
                # Don't delete yet - user might need to reset password
                return True, "OTP verified successfully"
            else:
                return False, "Invalid OTP"
        except Exception as e:
            return False, f"OTP verification failed: {str(e)}"

    def is_otp_verified(self, username):
        """
        Check if OTP has been verified for the user in this session.
        
        Args:
            username (str): Username to check
            
        Returns:
            bool: True if OTP was verified, False otherwise
        """
        return self.verified_otps.get(username, False)

    def clear_otp(self, username=None):
        """
        Clear OTP data after successful password reset.
        
        Args:
            username (str, optional): Specific username to clear. If None, clears all.
        """
        if username:
            # Clear specific user's verified flag
            if username in self.verified_otps:
                del self.verified_otps[username]
            # Delete OTP from Redis
            if self.redis_conn:
                self.redis_conn.delete(f"otp:{username}")
        else:
            # Clear all verified OTPs
            self.verified_otps.clear()