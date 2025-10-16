"""Schemas de Pydantic para el catálogo de profesores."""

from datetime import datetime

from pydantic import BaseModel, Field, field_validator


class CatalogProfessorBase(BaseModel):
    """Schema base para CatalogProfessor."""

    professor_id: str = Field(..., min_length=1, max_length=20, description="Código único institucional")
    professor_name: str = Field(..., min_length=2, max_length=150, description="Nombre completo del catedrático")
    institutional_email: str | None = Field(None, max_length=100, description="Correo institucional")
    personal_email: str | None = Field(None, max_length=100, description="Correo personal")
    phone_number: str | None = Field(None, max_length=20, description="Teléfono")
    professor_category: str | None = Field(None, max_length=10, description="Categoría (DHC, ADM)")
    academic_title: str | None = Field(None, max_length=20, description="Título (Ing., Dr., Lic.)")
    doctorates: int = Field(default=0, ge=0, description="Número de doctorados")
    masters: int = Field(default=0, ge=0, description="Número de maestrías")
    is_bilingual: bool = Field(default=False, description="Certificado bilingüe")
    is_paid: bool = Field(default=False, description="En nómina")
    is_active: bool = Field(default=True, description="Estado activo")

    @field_validator("professor_id")
    @classmethod
    def validate_professor_id(cls, v: str) -> str:
        """Validar que professor_id no contenga espacios."""
        if " " in v:
            raise ValueError("El código del profesor no puede contener espacios")
        return v.strip().upper()

    @field_validator("professor_name")
    @classmethod
    def validate_professor_name(cls, v: str) -> str:
        """Validar y normalizar el nombre del profesor."""
        return v.strip()

    @field_validator("professor_category")
    @classmethod
    def validate_professor_category(cls, v: str | None) -> str | None:
        """Normalizar categoría a mayúsculas."""
        if v is None:
            return v
        return v.strip().upper()

    @field_validator("academic_title")
    @classmethod
    def validate_academic_title(cls, v: str | None) -> str | None:
        """Normalizar título académico."""
        if v is None:
            return v
        return v.strip()


class CatalogProfessorCreate(CatalogProfessorBase):
    """Schema para crear un nuevo profesor."""

    pass


class CatalogProfessorUpdate(BaseModel):
    """Schema para actualizar un profesor."""

    professor_id: str | None = Field(None, min_length=1, max_length=20)
    professor_name: str | None = Field(None, min_length=2, max_length=150)
    institutional_email: str | None = Field(None, max_length=100)
    personal_email: str | None = Field(None, max_length=100)
    phone_number: str | None = Field(None, max_length=20)
    professor_category: str | None = Field(None, max_length=10)
    academic_title: str | None = Field(None, max_length=20)
    doctorates: int | None = Field(None, ge=0)
    masters: int | None = Field(None, ge=0)
    is_bilingual: bool | None = None
    is_paid: bool | None = None
    is_active: bool | None = None
    deleted: bool | None = None
    deleted_at: datetime | None = None

    @field_validator("professor_id")
    @classmethod
    def validate_professor_id(cls, v: str | None) -> str | None:
        """Validar que professor_id no contenga espacios."""
        if v is None:
            return v
        if " " in v:
            raise ValueError("El código del profesor no puede contener espacios")
        return v.strip().upper()

    @field_validator("professor_name")
    @classmethod
    def validate_professor_name(cls, v: str | None) -> str | None:
        """Validar y normalizar el nombre del profesor."""
        if v is None:
            return v
        return v.strip()

    @field_validator("professor_category")
    @classmethod
    def validate_professor_category(cls, v: str | None) -> str | None:
        """Normalizar categoría a mayúsculas."""
        if v is None:
            return v
        return v.strip().upper()

    @field_validator("academic_title")
    @classmethod
    def validate_academic_title(cls, v: str | None) -> str | None:
        """Normalizar título académico."""
        if v is None:
            return v
        return v.strip()


class CatalogProfessorRead(CatalogProfessorBase):
    """Schema para leer un profesor."""

    id: int
    deleted: bool
    deleted_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
