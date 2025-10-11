"""Create all tables with complete schema.

Revision ID: 971f41cb8620
Revises:
Create Date: 2025-09-22 23:50:48.616511
Updated: 2025-10-11 - Added Faculty, School, UserScope tables with INT PKs
"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "971f41cb8620"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Create user_role_enum type if it doesn't exist
    op.execute(
        "DO $$ BEGIN "
        "IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role_enum') THEN "
        "CREATE TYPE user_role_enum AS ENUM ('admin', 'director', 'decano', 'vicerrector', 'unauthorized'); "
        "END IF; "
        "END $$;"
    )

    # Create user table if it doesn't exist
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS "user" (
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
    """
    )

    # Create faculty table
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS faculty (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL UNIQUE,
            acronym VARCHAR(20) NOT NULL UNIQUE,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE
        )
    """
    )

    # Create indexes for faculty
    op.execute("CREATE INDEX IF NOT EXISTS idx_faculty_name ON faculty(name)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_faculty_acronym ON faculty(acronym)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_faculty_is_active ON faculty(is_active)")

    # Create school table
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS school (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            acronym VARCHAR(20) NOT NULL,
            fk_faculty INTEGER NOT NULL,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE,
            FOREIGN KEY (fk_faculty) REFERENCES faculty(id) ON DELETE CASCADE
        )
    """
    )

    # Create indexes for school
    op.execute("CREATE INDEX IF NOT EXISTS idx_school_name ON school(name)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_school_acronym ON school(acronym)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_school_fk_faculty ON school(fk_faculty)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_school_is_active ON school(is_active)")

    # Create unique index for school acronym per faculty
    op.execute(
        """
        CREATE UNIQUE INDEX IF NOT EXISTS idx_school_acronym_per_faculty
        ON school(acronym, fk_faculty)
        WHERE is_active = TRUE
    """
    )

    # Create user_scope table
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS user_scope (
            id SERIAL PRIMARY KEY,
            fk_user INTEGER NOT NULL,
            fk_school INTEGER NULL,
            fk_faculty INTEGER NULL,
            assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            FOREIGN KEY (fk_user) REFERENCES "user"(id) ON DELETE CASCADE,
            FOREIGN KEY (fk_school) REFERENCES school(id) ON DELETE CASCADE,
            FOREIGN KEY (fk_faculty) REFERENCES faculty(id) ON DELETE CASCADE,
            CONSTRAINT check_single_scope_assignment
            CHECK ((fk_school IS NOT NULL AND fk_faculty IS NULL) OR
                   (fk_school IS NULL AND fk_faculty IS NOT NULL))
        )
    """
    )

    # Create indexes for user_scope
    op.execute("CREATE INDEX IF NOT EXISTS idx_user_scope_fk_user ON user_scope(fk_user)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_user_scope_fk_school ON user_scope(fk_school)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_user_scope_fk_faculty ON user_scope(fk_faculty)")


def downgrade() -> None:
    # Drop tables in reverse order (respecting dependencies)
    op.execute("DROP TABLE IF EXISTS user_scope CASCADE")
    op.execute("DROP TABLE IF EXISTS school CASCADE")
    op.execute("DROP TABLE IF EXISTS faculty CASCADE")
    op.execute('DROP TABLE IF EXISTS "user" CASCADE')

    # Drop enum type
    op.execute("DROP TYPE IF EXISTS user_role_enum")
