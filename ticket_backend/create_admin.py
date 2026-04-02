"""Create the first admin user for local/dev environments.

Usage:
  python create_admin.py --email admin@example.com --name "Admin User" --password "Password123!"
"""

import argparse
import asyncio

from sqlalchemy import select

from app.database import AsyncSessionLocal
from app.models.user import User, UserRole
from app.services.auth_service import AuthService


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Create admin account")
    parser.add_argument("--email", required=True, help="Admin email")
    parser.add_argument("--name", required=True, help="Admin full name")
    parser.add_argument("--password", required=True, help="Admin password")
    return parser.parse_args()


async def create_admin(email: str, name: str, password: str) -> None:
    async with AsyncSessionLocal() as db:
        existing_admin = await db.execute(select(User).where(User.role == UserRole.ADMIN))
        admin = existing_admin.scalar_one_or_none()
        if admin:
            print(f"Admin already exists: {admin.email}")
            return

        existing = await db.execute(select(User).where(User.email == email.lower().strip()))
        if existing.scalar_one_or_none():
            print(f"Admin already exists for email: {email}")
            return

        user = User(
            email=email.lower().strip(),
            full_name=name.strip(),
            role=UserRole.ADMIN,
            email_verified=True,
            hashed_password=AuthService.hash_password(password),
            is_active=True,
        )
        db.add(user)
        await db.commit()
        print(f"Admin created: {user.email}")


if __name__ == "__main__":
    args = parse_args()
    asyncio.run(create_admin(args.email, args.name, args.password))
