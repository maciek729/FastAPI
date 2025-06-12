"""user model changed

Revision ID: 2ef04eb1386d
Revises: ad835af95ef4
Create Date: 2025-06-12 15:20:46.948212

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2ef04eb1386d'
down_revision: Union[str, None] = 'ad835af95ef4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
