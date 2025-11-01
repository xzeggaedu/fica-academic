"""Schemas para AcademicLoadClass."""

from datetime import datetime

from pydantic import BaseModel, Field


class AcademicLoadClassBase(BaseModel):
    """Base schema para AcademicLoadClass."""

    academic_load_file_id: int = Field(..., description="ID del documento fuente")
    correlative: str | None = Field(None, description="Número correlativo")
    coordination_code: str | None = Field(None, description="Código de coordinación")
    subject_code: str = Field(..., description="Código de la asignatura")
    subject_name: str = Field(..., description="Nombre de la asignatura")
    section_unique: str | None = Field(None, description="Sección única")
    class_section: str = Field(..., description="Número de sección de clase")
    class_service_assigned: str | None = Field(None, description="Servicio asignado a la clase")
    class_duration: int = Field(..., description="Duración de la clase")
    class_schedule: str = Field(..., description="Horario de la clase")
    class_days: str = Field(..., description="Días de la clase")
    class_type: str = Field(..., description="Tipo de clase")
    professor_institute: str | None = Field(None, description="Instituto del profesor")
    professor_academic_title: str | None = Field(None, description="Título académico del profesor")
    professor_name: str = Field(..., description="Nombre del profesor")
    professor_raw_cont: str | None = Field(None, description="Raw data del profesor")
    professor_phone: str | None = Field(None, description="Teléfono del profesor")
    professor_id: str | None = Field(None, description="ID del profesor")
    professor_category: str | None = Field(None, description="Categoría del profesor")
    professor_is_billing: bool = Field(False, description="Si el profesor está activo en facturación")
    professor_profile: str | None = Field(None, description="Perfil del profesor")
    professor_final_note: str | None = Field(None, description="Nota final del profesor")
    professor_masters: int = Field(0, description="Número de maestrías del profesor")
    professor_institutional_email: str | None = Field(None, description="Email institucional del profesor")
    professor_personal_email: str | None = Field(None, description="Email personal del profesor")
    is_bilingual: bool = Field(False, description="Si la asignatura y maestro son bilingües")
    observations: str | None = Field(None, description="Observaciones")
    team_channel_responsible: str | None = Field(None, description="Responsable del canal de Teams")
    validation_status: str = Field("valid", description="Estado de validación: valid, warning, error")
    validation_errors: str | None = Field(None, description="Mensajes de validación")


class AcademicLoadClassCreate(AcademicLoadClassBase):
    """Schema para crear un registro de clase."""

    pass


class AcademicLoadClassUpdate(BaseModel):
    """Schema para actualizar un registro de clase."""

    correlative: str | None = None
    coordination_code: str | None = None
    subject_code: str | None = None
    subject_name: str | None = None
    section_unique: str | None = None
    class_section: str | None = None
    class_service_assigned: str | None = None
    class_duration: int | None = None
    class_schedule: str | None = None
    class_days: str | None = None
    class_type: str | None = None
    professor_institute: str | None = None
    professor_academic_title: str | None = None
    professor_name: str | None = None
    professor_raw_cont: str | None = None
    professor_phone: str | None = None
    professor_id: str | None = None
    professor_category: str | None = None
    professor_is_billing: bool | None = None
    professor_profile: str | None = None
    professor_final_note: str | None = None
    professor_masters: int | None = None
    professor_institutional_email: str | None = None
    professor_personal_email: str | None = None
    is_bilingual: bool | None = None
    observations: str | None = None
    team_channel_responsible: str | None = None
    validation_status: str | None = None
    validation_errors: str | None = None


class AcademicLoadClassResponse(AcademicLoadClassBase):
    """Schema para respuesta de clase."""

    id: int
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
    class_section: str
    class_schedule: str
    class_duration: int
    class_days: str
    class_type: str
    professor_name: str
    validation_status: str
    created_at: datetime

    class Config:
        from_attributes = True
