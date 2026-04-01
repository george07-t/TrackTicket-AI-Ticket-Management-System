from logging.config import fileConfig
from pathlib import Path
import sys
import asyncio

# Make `ticket_backend` importable when Alembic is launched from different working dirs.
BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from alembic import context
from sqlalchemy import pool
from sqlalchemy.ext.asyncio import async_engine_from_config

from app.config import settings
from app.database import Base
from app.models import comment, ticket, user  # noqa: F401

config = context.config
config.set_main_option("sqlalchemy.url", settings.database_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    context.configure(url=config.get_main_option("sqlalchemy.url"), target_metadata=target_metadata, literal_binds=True)

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    def do_run_migrations(connection) -> None:
        context.configure(connection=connection, target_metadata=target_metadata)

        with context.begin_transaction():
            context.run_migrations()

    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async def do_migrations() -> None:
        async with connectable.connect() as connection:
            await connection.run_sync(do_run_migrations)

        await connectable.dispose()

    asyncio.run(do_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
