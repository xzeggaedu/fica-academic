from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class AcademicLoadFileBase(BaseModel):
    faculty_id: int = Field(..., description="ID de la facultad")
    school_id: int = Field(..., description="ID de la escuela")
    term_id: int = Field(..., description="ID del período académico")


class AcademicLoadFileCreate(AcademicLoadFileBase):
    pass


class AcademicLoadFileUpdate(BaseModel):
    faculty_id: int | None = None
    school_id: int | None = None
    term_id: int | None = None
    ingestion_status: str | None = None
    notes: str | None = None


class AcademicLoadFileResponse(AcademicLoadFileBase):
    id: int
    user_id: UUID
    user_name: str
    original_filename: str
    original_file_path: str
    upload_date: datetime
    ingestion_status: str

    class Config:
        from_attributes = True


class AcademicLoadFileListResponse(BaseModel):
    id: int
    faculty_name: str
    faculty_acronym: str
    school_name: str
    school_acronym: str
    term_id: int
    original_filename: str
    upload_date: datetime
    ingestion_status: str
    user_name: str

    class Config:
        from_attributes = True
