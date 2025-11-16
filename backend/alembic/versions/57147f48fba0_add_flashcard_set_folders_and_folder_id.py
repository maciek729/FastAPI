"""add_flashcard_set_folders_and_folder_id

Revision ID: 57147f48fba0
Revises: b23c56d3c5fe
Create Date: 2025-11-12 19:16:43.050354

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '57147f48fba0'
down_revision: Union[str, None] = 'b23c56d3c5fe'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create flashcard_set_folders table
    op.create_table(
        'flashcard_set_folders',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('notebook_id', sa.Integer(), nullable=True),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('name', sa.String(), nullable=True),
        sa.Column('parent_folder_id', sa.Integer(), nullable=True),
        sa.Column('grid_position', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['notebook_id'], ['notebooks.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['parent_folder_id'], ['flashcard_set_folders.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_flashcard_set_folders_id'), 'flashcard_set_folders', ['id'], unique=False)

    # Add folder_id column to flashcard_sets table
    op.add_column('flashcard_sets', sa.Column('folder_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_flashcard_sets_folder_id', 'flashcard_sets', 'flashcard_set_folders', ['folder_id'], ['id'])


def downgrade() -> None:
    """Downgrade schema."""
    # Remove folder_id from flashcard_sets
    op.drop_constraint('fk_flashcard_sets_folder_id', 'flashcard_sets', type_='foreignkey')
    op.drop_column('flashcard_sets', 'folder_id')

    # Drop flashcard_set_folders table
    op.drop_index(op.f('ix_flashcard_set_folders_id'), table_name='flashcard_set_folders')
    op.drop_table('flashcard_set_folders')
