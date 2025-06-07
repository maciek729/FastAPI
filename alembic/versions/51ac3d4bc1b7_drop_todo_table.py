"""drop_todo_table

Revision ID: 51ac3d4bc1b7
Revises: b0a6b8ee93a8
Create Date: 2025-06-07 13:18:13.340543

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '51ac3d4bc1b7'
down_revision: Union[str, None] = 'b0a6b8ee93a8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_table('todos')



def downgrade() -> None:
    """Downgrade schema."""
    pass
