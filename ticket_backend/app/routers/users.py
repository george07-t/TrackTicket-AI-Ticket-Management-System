import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.models.user import User, UserRole
from app.schemas.user import UserCreateByAdmin, UserOut, UserUpdateByAdmin
from app.services.auth_service import AuthService

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/", response_model=list[UserOut])
async def list_users(
    role: UserRole | None = Query(default=None),
    is_active: bool | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(UserRole.ADMIN)),
) -> list[User]:
    stmt = select(User).order_by(User.created_at.desc())

    if role is not None:
        stmt = stmt.where(User.role == role)
    if is_active is not None:
        stmt = stmt.where(User.is_active == is_active)

    result = await db.execute(stmt)
    return list(result.scalars().all())


@router.post("/", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def create_user(
    payload: UserCreateByAdmin,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(UserRole.ADMIN)),
) -> User:
    if payload.role != UserRole.AGENT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only agent accounts can be created from user management",
        )

    existing = await db.execute(select(User).where(User.email == payload.email.lower()))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Email already exists"
        )

    if payload.phone:
        existing_phone = await db.execute(select(User).where(User.phone == payload.phone))
        if existing_phone.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Phone already exists",
            )

    user = User(
        email=payload.email.lower(),
        phone=payload.phone,
        full_name=payload.full_name.strip(),
        role=payload.role,
        email_verified=True,
        hashed_password=AuthService.hash_password(payload.password),
        expertise_tags=payload.expertise_tags,
        is_available=payload.is_available,
        max_active_tickets=payload.max_active_tickets,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.get("/{user_id}", response_model=UserOut)
async def get_user(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(UserRole.ADMIN)),
) -> User:
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


@router.patch("/{user_id}", response_model=UserOut)
async def update_user(
    user_id: uuid.UUID,
    payload: UserUpdateByAdmin,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(require_role(UserRole.ADMIN)),
) -> User:
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # Prevent admin from deactivating themselves
    if user_id == current_admin.id and payload.is_active is False:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot deactivate your own account",
        )

    # Prevent changing own role
    if user_id == current_admin.id and payload.role is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot change your own role",
        )

    if payload.role == UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Promoting users to admin is not allowed",
        )

    if payload.role is not None:
        user.role = payload.role
    if payload.is_active is not None:
        user.is_active = payload.is_active
    if payload.is_available is not None:
        user.is_available = payload.is_available
    if payload.full_name is not None:
        user.full_name = payload.full_name.strip()
    if payload.phone is not None:
        existing_phone = await db.execute(
            select(User).where(User.phone == payload.phone, User.id != user.id)
        )
        if existing_phone.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Phone already exists",
            )
        user.phone = payload.phone
    if payload.expertise_tags is not None:
        user.expertise_tags = payload.expertise_tags
    if payload.max_active_tickets is not None:
        user.max_active_tickets = payload.max_active_tickets

    await db.commit()
    await db.refresh(user)
    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(require_role(UserRole.ADMIN)),
) -> None:
    if user_id == current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot delete your own account",
        )

    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    await db.delete(user)
    await db.commit()
