"""added groups

Revision ID: ad835af95ef4
Revises: 51ac3d4bc1b7
Create Date: 2025-06-08 10:55:52.043013

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ad835af95ef4'
down_revision: Union[str, None] = '51ac3d4bc1b7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
