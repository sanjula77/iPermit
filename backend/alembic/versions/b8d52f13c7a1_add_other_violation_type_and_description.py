"""add the OTHER violation type and a violation description

Revision ID: b8d52f13c7a1
Revises: a7c41e90b2d3
Create Date: 2026-10-09 15:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b8d52f13c7a1'
down_revision: Union[str, None] = 'a7c41e90b2d3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ALTER TYPE ... ADD VALUE cannot run inside a transaction block.
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE violationtype ADD VALUE IF NOT EXISTS 'OTHER'")
    op.add_column('violations', sa.Column('description', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('violations', 'description')
    # Postgres cannot drop a single enum value. Leaving OTHER in the type is
    # harmless: nothing writes it once this code is rolled back.
