"""add_grid_position_and_is_pinned_to_flashcard_sets

Revision ID: b23c56d3c5fe
Revises: 2554de3c47a9
Create Date: 2025-11-12 17:37:21.036964

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b23c56d3c5fe'
down_revision: Union[str, None] = '2554de3c47a9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add grid_position column to flashcard_sets table
    op.add_column('flashcard_sets', sa.Column('grid_position', sa.Integer(), nullable=True))

    # Add is_pinned column to flashcard_sets table
    op.add_column('flashcard_sets', sa.Column('is_pinned', sa.Boolean(), nullable=False, server_default='false'))


def downgrade() -> None:
    """Downgrade schema."""
    # Remove the columns if we need to rollback
    op.drop_column('flashcard_sets', 'is_pinned')
    op.drop_column('flashcard_sets', 'grid_position')
