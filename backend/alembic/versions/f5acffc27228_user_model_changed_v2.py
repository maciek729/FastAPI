"""user model changed v2

Revision ID: f5acffc27228
Revises: 2ef04eb1386d
Create Date: 2025-06-12 15:21:41.857791

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f5acffc27228'
down_revision: Union[str, None] = '2ef04eb1386d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
