"""Remove uuid column from user table.

Revision ID: a1b2c3d4e5f6
Revises: 971f41cb8620
Create Date: 2025-10-11 18:00:00.000000
"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: str | None = "971f41cb8620"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Remove uuid column from user table."""
    # Drop the unique constraint on uuid column first
    op.drop_constraint("user_uuid_key", "user", type_="unique")
    
    # Drop the uuid column
    op.drop_column("user", "uuid")


def downgrade() -> None:
    """Re-add uuid column to user table."""
    # Add back the uuid column
    op.execute(
        """
        ALTER TABLE "user"
        ADD COLUMN uuid UUID
        """
    )
    
    # Generate UUIDs for existing rows
    op.execute(
        """
        UPDATE "user"
        SET uuid = gen_random_uuid()
        WHERE uuid IS NULL
        """
    )
    
    # Make the column NOT NULL and UNIQUE
    op.execute(
        """
        ALTER TABLE "user"
        ALTER COLUMN uuid SET NOT NULL
        """
    )
    
    op.create_unique_constraint("user_uuid_key", "user", ["uuid"])

