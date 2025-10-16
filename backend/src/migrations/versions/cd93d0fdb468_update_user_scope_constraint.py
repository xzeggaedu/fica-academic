"""update_user_scope_constraint.

Revision ID: cd93d0fdb468
Revises: 73e597f64356
Create Date: 2025-10-13 17:51:32.000000
"""
from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "cd93d0fdb468"
down_revision: str | None = "73e597f64356"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Eliminar la restricción CHECK antigua
    op.drop_constraint("check_single_scope_assignment", "user_scope", type_="check")

    # Crear la nueva restricción CHECK que permite:
    # - DECANO: solo fk_faculty NOT NULL
    # - DIRECTOR: fk_school NOT NULL y fk_faculty NOT NULL
    op.create_check_constraint(
        "check_at_least_one_scope", "user_scope", "(fk_school IS NOT NULL OR fk_faculty IS NOT NULL)"
    )


def downgrade() -> None:
    # Eliminar la nueva restricción CHECK
    op.drop_constraint("check_at_least_one_scope", "user_scope", type_="check")

    # Restaurar la restricción CHECK original
    op.create_check_constraint(
        "check_single_scope_assignment",
        "user_scope",
        "(fk_school IS NOT NULL AND fk_faculty IS NULL) OR (fk_school IS NULL AND fk_faculty IS NOT NULL)",
    )
