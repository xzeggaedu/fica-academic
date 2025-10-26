from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class TemplateGenerationBase(BaseModel):
    faculty_id: int = Field(..., description="ID de la facultad")
    school_id: int = Field(..., description="ID de la escuela")
    notes: str | None = Field(None, description="Notas adicionales")


class TemplateGenerationCreate(TemplateGenerationBase):
    pass


class TemplateGenerationUpdate(BaseModel):
    faculty_id: int | None = None
    school_id: int | None = None
    notes: str | None = None
    generation_status: str | None = None
    generated_file_path: str | None = None


class TemplateGenerationResponse(TemplateGenerationBase):
    id: int
    user_id: UUID
    original_filename: str
    original_file_path: str
    generated_file_path: str | None = None
    upload_date: datetime
    generation_status: str

    class Config:
        from_attributes = True


class TemplateGenerationListResponse(BaseModel):
    id: int
    faculty_name: str
    faculty_acronym: str
    school_name: str
    school_acronym: str
    original_filename: str
    upload_date: datetime
    generation_status: str
    user_name: str
    download_url: str | None = None  # URL para descargar el archivo generado

    class Config:
        from_attributes = True
