import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User, UserRole
from app.schemas.user import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    ResetPasswordWithTokenRequest,
    ResendEmailOtpRequest,
    TokenResponse,
    UserLogin,
    UserOut,
    UserProfileUpdate,
    UserRegister,
    VerifyEmailOtpRequest,
    VerifyResetOtpRequest,
)
from app.services.auth_service import AuthService
from app.services.email_service import send_otp_email

router = APIRouter(prefix="/auth", tags=["auth"])
logger = logging.getLogger(__name__)

MAX_OTP_ATTEMPTS = 5
MAX_EMAIL_OTP_ATTEMPTS = 5


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def register(
    payload: UserRegister,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
) -> User:
    existing = await db.execute(select(User).where(User.email == payload.email.lower()))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered"
        )

    if payload.phone:
        existing_phone = await db.execute(select(User).where(User.phone == payload.phone))
        if existing_phone.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Phone already registered",
            )

    user = User(
        email=payload.email.lower(),
        phone=payload.phone,
        hashed_password=AuthService.hash_password(payload.password),
        full_name=payload.full_name.strip(),
        role=payload.role,
        email_verified=False,
        expertise_tags=[],
        is_available=True,
        max_active_tickets=10,
    )
    user.email_otp_code = AuthService.generate_otp()
    user.email_otp_expires_at = AuthService.otp_expiry()
    user.email_otp_attempts = 0
    db.add(user)
    await db.commit()
    await db.refresh(user)
    background_tasks.add_task(send_otp_email, user.email, user.full_name, user.email_otp_code)
    logger.info("New %s registered: %s", user.role.value, user.email)
    return user


@router.post("/login", response_model=TokenResponse)
async def login(payload: UserLogin, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    result = await db.execute(select(User).where(User.email == payload.email.lower()))
    user = result.scalar_one_or_none()

    # Run password verification regardless of whether the user exists to prevent timing attacks.
    dummy_hash = AuthService.hash_password("__dummy_timing_prevention__")
    candidate_hash = user.hashed_password if user else dummy_hash

    if not AuthService.verify_password(payload.password, candidate_hash) or not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Account is deactivated"
        )

    if not user.email_verified and user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email not verified. Please verify your email OTP first.",
        )

    user.last_login_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(user)

    token = AuthService.create_access_token(str(user.id))
    return TokenResponse(access_token=token, user=user)


@router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(get_current_user)) -> User:
    return current_user


@router.patch("/me/profile", response_model=UserOut)
async def update_my_profile(
    payload: UserProfileUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> User:
    if payload.full_name is not None:
        current_user.full_name = payload.full_name.strip()
    if payload.phone is not None:
        existing_phone = await db.execute(
            select(User).where(User.phone == payload.phone, User.id != current_user.id)
        )
        if existing_phone.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Phone already registered",
            )
        current_user.phone = payload.phone

    if current_user.role == UserRole.AGENT:
        if payload.is_available is not None:
            current_user.is_available = payload.is_available
        if payload.expertise_tags is not None:
            current_user.expertise_tags = payload.expertise_tags
        if payload.max_active_tickets is not None:
            current_user.max_active_tickets = payload.max_active_tickets

    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.post("/forgot-password", status_code=status.HTTP_200_OK)
async def forgot_password(
    payload: ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await db.execute(select(User).where(User.email == payload.email.lower()))
    user = result.scalar_one_or_none()

    # Always return the same message to avoid leaking whether an email exists.
    if not user or not user.is_active:
        return {"message": "If that email exists, an OTP has been sent."}

    otp = AuthService.generate_otp()
    user.otp_code = otp
    user.otp_expires_at = AuthService.otp_expiry()
    user.otp_attempts = 0
    await db.commit()

    background_tasks.add_task(send_otp_email, user.email, user.full_name, otp)
    logger.info("OTP generated for %s", user.email)
    return {"message": "If that email exists, an OTP has been sent."}


@router.post("/resend-email-otp", status_code=status.HTTP_200_OK)
async def resend_email_otp(
    payload: ResendEmailOtpRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await db.execute(select(User).where(User.email == payload.email.lower()))
    user = result.scalar_one_or_none()

    if not user:
        return {"message": "If that email exists, an OTP has been sent."}

    if user.email_verified:
        return {"message": "Email already verified"}

    otp = AuthService.generate_otp()
    user.email_otp_code = otp
    user.email_otp_expires_at = AuthService.otp_expiry()
    user.email_otp_attempts = 0
    await db.commit()

    background_tasks.add_task(send_otp_email, user.email, user.full_name, otp)
    return {"message": "If that email exists, an OTP has been sent."}


@router.post("/verify-email-otp", status_code=status.HTTP_200_OK)
async def verify_email_otp(
    payload: VerifyEmailOtpRequest,
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await db.execute(select(User).where(User.email == payload.email.lower()))
    user = result.scalar_one_or_none()

    if not user or not user.email_otp_code:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired OTP")

    if user.email_verified:
        return {"message": "Email already verified"}

    if user.email_otp_attempts >= MAX_EMAIL_OTP_ATTEMPTS:
        user.email_otp_code = None
        user.email_otp_expires_at = None
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed attempts. Request a new OTP.",
        )

    now = datetime.now(timezone.utc)
    if not user.email_otp_expires_at or user.email_otp_expires_at < now:
        user.email_otp_code = None
        await db.commit()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="OTP has expired")

    if user.email_otp_code != payload.otp:
        user.email_otp_attempts += 1
        await db.commit()
        remaining = MAX_EMAIL_OTP_ATTEMPTS - user.email_otp_attempts
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid OTP. {remaining} attempt(s) remaining.",
        )

    user.email_verified = True
    user.email_otp_code = None
    user.email_otp_expires_at = None
    user.email_otp_attempts = 0
    await db.commit()
    return {"message": "Email verified successfully"}


@router.post("/verify-reset-otp", status_code=status.HTTP_200_OK)
async def verify_reset_otp(
    payload: VerifyResetOtpRequest,
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await db.execute(select(User).where(User.email == payload.email.lower()))
    user = result.scalar_one_or_none()

    if not user or not user.otp_code:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired OTP")

    if user.otp_attempts >= MAX_OTP_ATTEMPTS:
        user.otp_code = None
        user.otp_expires_at = None
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed attempts. Request a new OTP.",
        )

    now = datetime.now(timezone.utc)
    if not user.otp_expires_at or user.otp_expires_at < now:
        user.otp_code = None
        await db.commit()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="OTP has expired")

    if user.otp_code != payload.otp:
        user.otp_attempts += 1
        await db.commit()
        remaining = MAX_OTP_ATTEMPTS - user.otp_attempts
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid OTP. {remaining} attempt(s) remaining.",
        )

    reset_token = AuthService.create_purpose_token(str(user.id), "password_reset", expires_minutes=15)
    return {"message": "OTP verified", "reset_token": reset_token}


@router.post("/reset-password", status_code=status.HTTP_200_OK)
async def reset_password_with_token(
    payload: ResetPasswordWithTokenRequest,
    db: AsyncSession = Depends(get_db),
) -> dict:
    subject = AuthService.decode_purpose_token(payload.reset_token, "password_reset")
    if not subject:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset token")

    try:
        user_id = uuid.UUID(subject)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid reset token payload")

    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.hashed_password = AuthService.hash_password(payload.new_password)
    user.otp_code = None
    user.otp_expires_at = None
    user.otp_attempts = 0
    await db.commit()
    return {"message": "Password reset successful. You can now log in."}


@router.post("/change-password", status_code=status.HTTP_200_OK)
async def change_password(
    payload: ChangePasswordRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    if not AuthService.verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect"
        )

    if payload.current_password == payload.new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be different from the current password",
        )

    current_user.hashed_password = AuthService.hash_password(payload.new_password)
    await db.commit()
    return {"message": "Password changed successfully"}
