import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.models.user import UserRole


def _validate_password(v: str) -> str:
    if len(v) < 8:
        raise ValueError("Password must be at least 8 characters")
    if not any(c.isupper() for c in v):
        raise ValueError("Password must contain at least one uppercase letter")
    if not any(c.isdigit() for c in v):
        raise ValueError("Password must contain at least one digit")
    return v


class UserRegister(BaseModel):
    email: EmailStr
    phone: str | None = None
    password: str
    full_name: str
    role: UserRole = UserRole.CUSTOMER

    @field_validator("password")
    @classmethod
    def strong_password(cls, v: str) -> str:
        return _validate_password(v)

    @field_validator("full_name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Full name cannot be empty")
        if len(v) < 2:
            raise ValueError("Full name must be at least 2 characters")
        return v

    @field_validator("role")
    @classmethod
    def register_role_allowed(cls, v: UserRole) -> UserRole:
        if v == UserRole.ADMIN:
            raise ValueError("Admin accounts can only be created by create_admin.py")
        return v

    @field_validator("phone")
    @classmethod
    def normalize_phone(cls, v: str | None) -> str | None:
        if v is None:
            return v
        digits = "".join(ch for ch in v if ch.isdigit())
        if len(digits) < 7 or len(digits) > 15:
            raise ValueError("Phone number must be 7 to 15 digits")
        return digits


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserCreateByAdmin(BaseModel):
    email: EmailStr
    phone: str | None = None
    password: str
    full_name: str
    role: UserRole = UserRole.AGENT
    expertise_tags: list[str] = Field(default_factory=list)
    is_available: bool = True
    max_active_tickets: int = 10

    @field_validator("password")
    @classmethod
    def strong_password(cls, v: str) -> str:
        return _validate_password(v)

    @field_validator("role")
    @classmethod
    def only_agent(cls, v: UserRole) -> UserRole:
        if v != UserRole.AGENT:
            raise ValueError("Admin user creation endpoint only allows agent accounts")
        return v

    @field_validator("expertise_tags")
    @classmethod
    def normalize_admin_expertise_tags(cls, v: list[str]) -> list[str]:
        normalized = [tag.strip().lower() for tag in v if tag.strip()]
        return normalized[:10]

    @field_validator("max_active_tickets")
    @classmethod
    def validate_admin_max_active_tickets(cls, v: int) -> int:
        if v < 1 or v > 200:
            raise ValueError("max_active_tickets must be between 1 and 200")
        return v

    @field_validator("phone")
    @classmethod
    def normalize_admin_phone(cls, v: str | None) -> str | None:
        if v is None:
            return v
        digits = "".join(ch for ch in v if ch.isdigit())
        if len(digits) < 7 or len(digits) > 15:
            raise ValueError("Phone number must be 7 to 15 digits")
        return digits


class UserUpdateByAdmin(BaseModel):
    role: UserRole | None = None
    is_active: bool | None = None
    is_available: bool | None = None
    full_name: str | None = None
    phone: str | None = None
    expertise_tags: list[str] | None = None
    max_active_tickets: int | None = None

    @field_validator("role")
    @classmethod
    def cannot_assign_admin(cls, v: UserRole | None) -> UserRole | None:
        if v == UserRole.ADMIN:
            raise ValueError("Promoting users to admin is not allowed")
        return v

    @field_validator("expertise_tags")
    @classmethod
    def normalize_update_expertise_tags(cls, v: list[str] | None) -> list[str] | None:
        if v is None:
            return v
        normalized = [tag.strip().lower() for tag in v if tag.strip()]
        return normalized[:10]

    @field_validator("max_active_tickets")
    @classmethod
    def validate_update_max_active_tickets(cls, v: int | None) -> int | None:
        if v is None:
            return v
        if v < 1 or v > 200:
            raise ValueError("max_active_tickets must be between 1 and 200")
        return v

    @field_validator("phone")
    @classmethod
    def normalize_update_phone(cls, v: str | None) -> str | None:
        if v is None:
            return v
        digits = "".join(ch for ch in v if ch.isdigit())
        if len(digits) < 7 or len(digits) > 15:
            raise ValueError("Phone number must be 7 to 15 digits")
        return digits


class UserProfileUpdate(BaseModel):
    full_name: str | None = None
    phone: str | None = None
    is_available: bool | None = None
    expertise_tags: list[str] | None = None
    max_active_tickets: int | None = None

    @field_validator("full_name")
    @classmethod
    def profile_name_not_empty(cls, v: str | None) -> str | None:
        if v is None:
            return v
        v = v.strip()
        if not v:
            raise ValueError("Full name cannot be empty")
        return v

    @field_validator("expertise_tags")
    @classmethod
    def normalize_profile_expertise_tags(cls, v: list[str] | None) -> list[str] | None:
        if v is None:
            return v
        normalized = [tag.strip().lower() for tag in v if tag.strip()]
        return normalized[:10]

    @field_validator("max_active_tickets")
    @classmethod
    def validate_profile_max_active_tickets(cls, v: int | None) -> int | None:
        if v is None:
            return v
        if v < 1 or v > 200:
            raise ValueError("max_active_tickets must be between 1 and 200")
        return v

    @field_validator("phone")
    @classmethod
    def normalize_profile_phone(cls, v: str | None) -> str | None:
        if v is None:
            return v
        digits = "".join(ch for ch in v if ch.isdigit())
        if len(digits) < 7 or len(digits) > 15:
            raise ValueError("Phone number must be 7 to 15 digits")
        return digits


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def strong_password(cls, v: str) -> str:
        return _validate_password(v)


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class VerifyOtpRequest(BaseModel):
    email: EmailStr
    otp: str
    new_password: str

    @field_validator("otp")
    @classmethod
    def otp_format(cls, v: str) -> str:
        v = v.strip()
        if not v.isdigit() or len(v) != 6:
            raise ValueError("OTP must be a 6-digit number")
        return v

    @field_validator("new_password")
    @classmethod
    def strong_password(cls, v: str) -> str:
        return _validate_password(v)


class VerifyResetOtpRequest(BaseModel):
    email: EmailStr
    otp: str

    @field_validator("otp")
    @classmethod
    def otp_format(cls, v: str) -> str:
        v = v.strip()
        if not v.isdigit() or len(v) != 6:
            raise ValueError("OTP must be a 6-digit number")
        return v


class VerifyEmailOtpRequest(BaseModel):
    email: EmailStr
    otp: str

    @field_validator("otp")
    @classmethod
    def otp_format(cls, v: str) -> str:
        v = v.strip()
        if not v.isdigit() or len(v) != 6:
            raise ValueError("OTP must be a 6-digit number")
        return v


class ResendEmailOtpRequest(BaseModel):
    email: EmailStr


class ResetPasswordWithTokenRequest(BaseModel):
    reset_token: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def strong_password(cls, v: str) -> str:
        return _validate_password(v)


class UserOut(BaseModel):
    id: uuid.UUID
    email: EmailStr
    phone: str | None
    full_name: str
    role: UserRole
    email_verified: bool
    is_active: bool
    is_available: bool
    expertise_tags: list[str]
    max_active_tickets: int
    last_login_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
