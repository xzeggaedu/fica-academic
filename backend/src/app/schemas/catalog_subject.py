"""Schemas de Pydantic para el catálogo de asignaturas."""

from datetime import datetime

from pydantic import BaseModel, Field, field_validator


class CatalogSubjectBase(BaseModel):
    """Schema base para CatalogSubject."""

    subject_code: str = Field(..., min_length=1, max_length=20, description="Código de la asignatura")
    subject_name: str = Field(..., min_length=1, max_length=255, description="Nombre de la asignatura")
    department_code: str = Field(..., min_length=1, max_length=20, description="Código del departamento")
    is_bilingual: bool = Field(default=False, description="Indica si la asignatura es bilingüe")
    is_active: bool = Field(default=True, description="Estado de la asignatura")

    @field_validator("subject_code", "department_code")
    @classmethod
    def validate_codes(cls, v: str) -> str:
        """Validar que los códigos no contengan espacios en blanco."""
        if " " in v:
            raise ValueError("Los códigos no pueden contener espacios")
        return v.strip().upper()

    @field_validator("subject_name")
    @classmethod
    def validate_subject_name(cls, v: str) -> str:
        """Validar y normalizar el nombre de la asignatura."""
        return v.strip()


class CatalogSubjectCreate(CatalogSubjectBase):
    """Schema para crear una nueva asignatura."""

    school_ids: list[int] = Field(
        default_factory=list, description="Lista de IDs de escuelas asociadas a la asignatura"
    )


class CatalogSubjectUpdate(BaseModel):
    """Schema para actualizar una asignatura."""

    subject_code: str | None = Field(None, min_length=1, max_length=20)
    subject_name: str | None = Field(None, min_length=1, max_length=255)
    department_code: str | None = Field(None, min_length=1, max_length=20)
    is_bilingual: bool | None = None
    is_active: bool | None = None
    deleted: bool | None = None
    deleted_at: datetime | None = None
    school_ids: list[int] | None = Field(None, description="Lista de IDs de escuelas asociadas a la asignatura")

    @field_validator("subject_code")
    @classmethod
    def validate_subject_code(cls, v: str | None) -> str | None:
        """Validar que subject_code no contenga espacios."""
        if v is None:
            return v
        if " " in v:
            raise ValueError("El código de la asignatura no puede contener espacios")
        return v.strip().upper()

    @field_validator("department_code")
    @classmethod
    def validate_department_code(cls, v: str | None) -> str | None:
        """Validar y normalizar department_code (permite espacios)."""
        if v is None:
            return v
        return v.strip().upper()

    @field_validator("subject_name")
    @classmethod
    def validate_subject_name(cls, v: str | None) -> str | None:
        """Validar y normalizar el nombre de la asignatura."""
        if v is None:
            return v
        return v.strip()


class SubjectSchoolRead(BaseModel):
    """Schema para leer relaciones de escuelas."""

    id: int
    school_id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class CatalogSubjectRead(CatalogSubjectBase):
    """Schema para leer una asignatura."""

    id: int
    deleted: bool
    created_at: datetime
    updated_at: datetime
    deleted_at: datetime | None
    schools: list[SubjectSchoolRead] = Field(default_factory=list)

    model_config = {"from_attributes": True}
