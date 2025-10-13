"""add_catalog_course_tables

Revision ID: 73e597f64356
Revises: 11dc5195775d
Create Date: 2025-10-13 05:05:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '73e597f64356'
down_revision: Union[str, None] = '11dc5195775d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Crear tabla catalog_course
    op.create_table(
        'catalog_course',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('course_code', sa.String(length=20), nullable=False),
        sa.Column('course_name', sa.String(length=255), nullable=False),
        sa.Column('department_code', sa.String(length=20), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('course_code')
    )
    op.create_index(op.f('ix_catalog_course_id'), 'catalog_course', ['id'], unique=False)
    op.create_index(op.f('ix_catalog_course_course_code'), 'catalog_course', ['course_code'], unique=True)
    
    # Crear tabla course_school (relación N:N entre cursos y escuelas)
    op.create_table(
        'course_school',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('course_id', sa.Integer(), nullable=False),
        sa.Column('school_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['course_id'], ['catalog_course.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['school_id'], ['school.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_course_school_id'), 'course_school', ['id'], unique=False)
    op.create_index(op.f('ix_course_school_course_id'), 'course_school', ['course_id'], unique=False)
    op.create_index(op.f('ix_course_school_school_id'), 'course_school', ['school_id'], unique=False)


def downgrade() -> None:
    # Eliminar tabla course_school
    op.drop_index(op.f('ix_course_school_school_id'), table_name='course_school')
    op.drop_index(op.f('ix_course_school_course_id'), table_name='course_school')
    op.drop_index(op.f('ix_course_school_id'), table_name='course_school')
    op.drop_table('course_school')
    
    # Eliminar tabla catalog_course
    op.drop_index(op.f('ix_catalog_course_course_code'), table_name='catalog_course')
    op.drop_index(op.f('ix_catalog_course_id'), table_name='catalog_course')
    op.drop_table('catalog_course')
