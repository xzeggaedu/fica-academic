"""Create all tables

Revision ID: 971f41cb8620
Revises: 
Create Date: 2025-09-22 23:50:48.616511

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '971f41cb8620'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create user_role_enum type if it doesn't exist
    op.execute("DO $$ BEGIN CREATE TYPE user_role_enum AS ENUM ('admin', 'director', 'decano', 'vicerrector', 'unauthorized'); EXCEPTION WHEN duplicate_object THEN null; END $$;")
    
    # Create user table
    op.execute("""
        CREATE TABLE "user" (
            id SERIAL PRIMARY KEY,
            name VARCHAR(30) NOT NULL,
            username VARCHAR(20) NOT NULL UNIQUE,
            email VARCHAR(50) NOT NULL UNIQUE,
            hashed_password TEXT NOT NULL,
            profile_image_url TEXT,
            uuid UUID NOT NULL UNIQUE,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE,
            deleted_at TIMESTAMP WITH TIME ZONE,
            is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
            role user_role_enum NOT NULL DEFAULT 'unauthorized'
        )
    """)


def downgrade() -> None:
    # Drop tables in reverse order
    op.execute("DROP TABLE IF EXISTS \"user\"")
    
    # Drop enum type
    op.execute("DROP TYPE IF EXISTS user_role_enum")
