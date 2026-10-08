"""add LICENSE_REINSTATED notification type

Revision ID: a7c41e90b2d3
Revises: cd6391130c4f
Create Date: 2026-10-09 09:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'a7c41e90b2d3'
down_revision: Union[str, None] = 'cd6391130c4f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ALTER TYPE ... ADD VALUE cannot run inside a transaction block.
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE notificationtype ADD VALUE IF NOT EXISTS 'LICENSE_REINSTATED'")


def downgrade() -> None:
    # Postgres cannot drop a single enum value. Leaving it in place is harmless:
    # nothing writes it once this code is rolled back.
    pass
