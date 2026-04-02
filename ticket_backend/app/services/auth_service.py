import random
import string
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config import settings

# Django-style default: PBKDF2-SHA256 avoids bcrypt's 72-byte input limit.
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")


class AuthService:
    @staticmethod
    def verify_password(plain: str, hashed: str) -> bool:
        try:
            return pwd_context.verify(plain, hashed)
        except Exception:
            # Invalid/corrupt hash or backend mismatch should not crash auth flow.
            return False

    @staticmethod
    def hash_password(password: str) -> str:
        return pwd_context.hash(password)

    @staticmethod
    def create_access_token(subject: str) -> str:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.access_token_expire_minutes
        )
        payload = {"sub": subject, "exp": expire}
        return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)

    @staticmethod
    def decode_token(token: str) -> str | None:
        try:
            payload = jwt.decode(
                token, settings.secret_key, algorithms=[settings.algorithm]
            )
            return payload.get("sub")
        except JWTError:
            return None

    @staticmethod
    def generate_otp() -> str:
        """Generate a 6-digit numeric OTP."""
        return "".join(random.choices(string.digits, k=6))

    @staticmethod
    def otp_expiry() -> datetime:
        return datetime.now(timezone.utc) + timedelta(
            minutes=settings.otp_expire_minutes
        )

    @staticmethod
    def create_purpose_token(subject: str, purpose: str, expires_minutes: int = 15) -> str:
        expire = datetime.now(timezone.utc) + timedelta(minutes=expires_minutes)
        payload = {"sub": subject, "purpose": purpose, "exp": expire}
        return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)

    @staticmethod
    def decode_purpose_token(token: str, expected_purpose: str) -> str | None:
        try:
            payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
            if payload.get("purpose") != expected_purpose:
                return None
            return payload.get("sub")
        except JWTError:
            return None
