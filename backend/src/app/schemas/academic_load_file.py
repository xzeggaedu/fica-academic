from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class AcademicLoadFileBase(BaseModel):
    faculty_id: int = Field(..., description="ID de la facultad")
    school_id: int = Field(..., description="ID de la escuela")
    term_id: int = Field(..., description="ID del período académico")


class AcademicLoadFileCreate(AcademicLoadFileBase):
    strict_validation: bool = False


class AcademicLoadFileUpdate(BaseModel):
    faculty_id: int | None = None
    school_id: int | None = None
    term_id: int | None = None
    ingestion_status: str | None = None
    notes: str | None = None
    strict_validation: bool | None = None


class AcademicLoadFileResponse(AcademicLoadFileBase):
    id: int
    user_id: UUID
    user_name: str
    original_filename: str
    original_file_path: str
    upload_date: datetime
    ingestion_status: str
    version: int
    is_active: bool
    strict_validation: bool
    superseded_at: datetime | None = None
    superseded_by_id: int | None = None

    class Config:
        from_attributes = True


class AcademicLoadFileListResponse(BaseModel):
    id: int
    faculty_name: str
    faculty_acronym: str
    school_name: str
    school_acronym: str
    term_id: int
    term_name: str | None = None
    term_term: int | None = None
    term_year: int | None = None
    original_filename: str
    upload_date: datetime
    ingestion_status: str
    user_name: str
    notes: str | None = None
    version: int
    is_active: bool
    strict_validation: bool

    class Config:
        from_attributes = True
