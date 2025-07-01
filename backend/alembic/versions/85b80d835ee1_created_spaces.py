"""created spaces

Revision ID: 85b80d835ee1
Revises: 80acaea90e8c
Create Date: 2025-07-01 17:16:32.596536

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '85b80d835ee1'
down_revision: Union[str, None] = '80acaea90e8c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
