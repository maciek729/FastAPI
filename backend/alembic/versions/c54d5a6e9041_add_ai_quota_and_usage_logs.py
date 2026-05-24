"""add ai quota and usage logs

Revision ID: c54d5a6e9041
Revises: f761b1280100
Create Date: 2026-05-24 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c54d5a6e9041'
down_revision: Union[str, None] = 'f761b1280100'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('monthly_quota_credits', sa.Integer(), nullable=False, server_default='300'))
    op.add_column('users', sa.Column('monthly_credits_used', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('users', sa.Column('quota_reset_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')))
    op.add_column('users', sa.Column('last_quota_warning_pct', sa.Integer(), nullable=True))

    op.create_table(
        'ai_usage_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('action_type', sa.String(length=50), nullable=False),
        sa.Column('endpoint', sa.String(length=100), nullable=False),
        sa.Column('cost_credits', sa.Integer(), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('message', sa.Text(), nullable=True),
        sa.Column('metadata_json', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_ai_usage_logs_id'), 'ai_usage_logs', ['id'], unique=False)
    op.create_index(op.f('ix_ai_usage_logs_user_id'), 'ai_usage_logs', ['user_id'], unique=False)

    op.alter_column('users', 'monthly_quota_credits', server_default=None)
    op.alter_column('users', 'monthly_credits_used', server_default=None)
    op.alter_column('users', 'quota_reset_at', server_default=None)


def downgrade() -> None:
    op.drop_index(op.f('ix_ai_usage_logs_user_id'), table_name='ai_usage_logs')
    op.drop_index(op.f('ix_ai_usage_logs_id'), table_name='ai_usage_logs')
    op.drop_table('ai_usage_logs')

    op.drop_column('users', 'last_quota_warning_pct')
    op.drop_column('users', 'quota_reset_at')
    op.drop_column('users', 'monthly_credits_used')
    op.drop_column('users', 'monthly_quota_credits')
