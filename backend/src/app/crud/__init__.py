"""CRUD package - Database operations."""

from .crud_faculties import (
    crud_faculties,
    faculty_acronym_exists,
    faculty_exists,
    get_active_faculties,
    get_faculty_by_uuid,
)
from .crud_schools import (
    crud_schools,
    get_active_schools,
    get_school_by_uuid,
    get_schools_by_faculty,
    school_acronym_exists,
    school_exists,
)
from .crud_user_scope import (
    create_faculty_scope,
    create_school_scope,
    crud_user_scope,
    delete_user_scopes,
    get_user_faculty_scope,
    get_user_school_scopes,
    get_user_scopes,
)
from .crud_users import crud_users

__all__ = [
    "crud_users",
    "crud_faculties",
    "crud_schools",
    "crud_user_scope",
    "get_faculty_by_uuid",
    "get_active_faculties",
    "faculty_exists",
    "faculty_acronym_exists",
    "get_school_by_uuid",
    "get_schools_by_faculty",
    "get_active_schools",
    "school_exists",
    "school_acronym_exists",
    "delete_user_scopes",
    "create_faculty_scope",
    "create_school_scope",
    "get_user_scopes",
    "get_user_faculty_scope",
    "get_user_school_scopes",
]
