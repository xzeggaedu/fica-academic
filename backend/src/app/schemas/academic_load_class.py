"""Schemas para AcademicLoadClass."""

from datetime import datetime

from pydantic import BaseModel, Field


class AcademicLoadClassBase(BaseModel):
    """Base schema para AcademicLoadClass."""

    academic_load_file_id: int = Field(..., description="ID del documento fuente")
    subject_id: int | None = Field(None, description="ID de la asignatura")
    coordination_id: int | None = Field(None, description="ID de la coordinación")
    professor_id: int | None = Field(None, description="ID del profesor")
    subject_name: str = Field(..., description="Nombre de la asignatura")
    subject_code: str = Field(..., description="Código de la asignatura")
    section: str = Field(..., description="Número de sección")
    schedule: str = Field(..., description="Horario")
    duration: int = Field(..., description="Duración en horas")
    days: str = Field(..., description="Días de la semana")
    modality: str = Field(..., description="Modalidad")
    professor_category: str | None = Field(None, description="Categoría del profesor")
    professor_academic_title: str | None = Field(None, description="Título académico del profesor")
    professor_is_bilingual: bool = Field(False, description="Es bilingüe")
    professor_doctorates: int = Field(0, description="Número de doctorados")
    professor_masters: int = Field(0, description="Número de maestrías")


class AcademicLoadClassCreate(AcademicLoadClassBase):
    """Schema para crear un registro de clase."""

    pass


class AcademicLoadClassUpdate(BaseModel):
    """Schema para actualizar un registro de clase."""

    subject_id: int | None = None
    coordination_id: int | None = None
    professor_id: int | None = None
    subject_name: str | None = None
    subject_code: str | None = None
    section: str | None = None
    schedule: str | None = None
    duration: int | None = None
    days: str | None = None
    modality: str | None = None
    professor_category: str | None = None
    professor_academic_title: str | None = None
    professor_is_bilingual: bool | None = None
    professor_doctorates: int | None = None
    professor_masters: int | None = None


class AcademicLoadClassResponse(AcademicLoadClassBase):
    """Schema para respuesta de clase."""

    id: int
    ingestion_date: datetime
    created_at: datetime
    updated_at: datetime | None = None

    class Config:
        from_attributes = True


class AcademicLoadClassListResponse(BaseModel):
    """Schema para listar clases (incluye solo datos esenciales)."""

    id: int
    academic_load_file_id: int
    subject_name: str
    subject_code: str
    section: str
    schedule: str
    duration: int
    days: str
    modality: str
    professor_category: str | None
    ingestion_date: datetime

    class Config:
        from_attributes = True
