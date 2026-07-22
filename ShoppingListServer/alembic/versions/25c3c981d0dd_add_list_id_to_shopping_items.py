"""Add list_id to shopping items

Revision ID: 25c3c981d0dd
Revises: 
Create Date: 2026-07-23 01:09:11.376095

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '25c3c981d0dd'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # הוספת עמודת list_id לטבלת ה-items ויצירת קשר Foreign Key לטבלת ה-shopping_lists
    op.add_column('items', sa.Column('list_id', sa.Integer(), nullable=True))
    op.create_foreign_key(
        'fk_items_shopping_lists_id',
        'items',
        'shopping_lists',
        ['list_id'],
        ['id']
    )


def downgrade() -> None:
    """Downgrade schema."""
    # הסרת ה-Foreign Key והעמודה במקרה של rollback
    op.drop_constraint('fk_items_shopping_lists_id', 'items', type_='foreignkey')
    op.drop_column('items', 'list_id')