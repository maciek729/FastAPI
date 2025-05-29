"""verification check for users

Revision ID: 8e5e52de7270
Revises: b58d7459b673
Create Date: 2025-05-29 10:10:21.762580

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8e5e52de7270'
down_revision: Union[str, None] = 'b58d7459b673'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
