"""Schemas package - Pydantic models for API validation."""

from .annual_holiday import (
    AnnualHolidayCreate,
    AnnualHolidayInternal,
    AnnualHolidayRead,
    AnnualHolidayUpdate,
)
from .catalog_subject import (
    CatalogSubjectCreate,
    CatalogSubjectRead,
    CatalogSubjectUpdate,
    SubjectSchoolRead,
)
from .faculty import FacultyCreate, FacultyRead, FacultyReadWithSchools, FacultyUpdate
from .fixed_holiday_rule import (
    FixedHolidayRuleCreate,
    FixedHolidayRuleInternal,
    FixedHolidayRuleRead,
    FixedHolidayRuleUpdate,
)
from .holiday import HolidayCreate, HolidayInternal, HolidayRead, HolidayUpdate
from .job import Job
from .school import SchoolCreate, SchoolRead, SchoolReadWithFaculty, SchoolUpdate
from .term import TermCreate, TermInternal, TermRead, TermUpdate
from .user import (
    User,
    UserCreate,
    UserCreateAdmin,
    UserCreateInternal,
    UserDelete,
    UserPasswordUpdate,
    UserRead,
    UserRestoreDeleted,
    UserUpdate,
    UserUpdateAdmin,
)
from .user_scope import UserScopeAssignment, UserScopeCreate, UserScopeRead

__all__ = [
    "User",
    "UserCreate",
    "UserCreateAdmin",
    "UserCreateInternal",
    "UserRead",
    "UserUpdate",
    "UserUpdateAdmin",
    "UserDelete",
    "UserPasswordUpdate",
    "UserRestoreDeleted",
    "Job",
    "FacultyCreate",
    "FacultyRead",
    "FacultyReadWithSchools",
    "FacultyUpdate",
    "SchoolCreate",
    "SchoolRead",
    "SchoolReadWithFaculty",
    "SchoolUpdate",
    "UserScopeCreate",
    "UserScopeRead",
    "UserScopeAssignment",
    "CatalogSubjectCreate",
    "CatalogSubjectRead",
    "CatalogSubjectUpdate",
    "SubjectSchoolRead",
    "FixedHolidayRuleCreate",
    "FixedHolidayRuleRead",
    "FixedHolidayRuleUpdate",
    "FixedHolidayRuleInternal",
    "HolidayCreate",
    "HolidayRead",
    "HolidayUpdate",
    "HolidayInternal",
    "AnnualHolidayCreate",
    "AnnualHolidayRead",
    "AnnualHolidayUpdate",
    "AnnualHolidayInternal",
    "TermCreate",
    "TermRead",
    "TermUpdate",
    "TermInternal",
]
