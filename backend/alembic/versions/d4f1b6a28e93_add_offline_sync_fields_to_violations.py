"""add received_at and client_id to violations for offline sync

Revision ID: d4f1b6a28e93
Revises: c3e9a47d1f50
Create Date: 2026-10-10 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd4f1b6a28e93'
down_revision: Union[str, None] = 'c3e9a47d1f50'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('violations', sa.Column('received_at', sa.DateTime(), nullable=True))
    # Existing violations were all recorded online: received when they happened.
    op.execute("UPDATE violations SET received_at = confirmed_at")
    op.alter_column('violations', 'received_at', nullable=False)
    op.add_column('violations', sa.Column('client_id', sa.Uuid(), nullable=True))
    op.create_unique_constraint('uq_violations_client_id', 'violations', ['client_id'])


def downgrade() -> None:
    op.drop_constraint('uq_violations_client_id', 'violations', type_='unique')
    op.drop_column('violations', 'client_id')
    op.drop_column('violations', 'received_at')
