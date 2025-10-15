"""Schemas de Pydantic para el catálogo de asignaturas."""

from datetime import datetime

from pydantic import BaseModel, Field, field_validator


class CatalogCourseBase(BaseModel):
    """Schema base para CatalogCourse."""

    course_code: str = Field(..., min_length=1, max_length=20, description="Código del curso")
    course_name: str = Field(..., min_length=1, max_length=255, description="Nombre del curso")
    department_code: str = Field(..., min_length=1, max_length=20, description="Código del departamento")
    is_active: bool = Field(default=True, description="Estado del curso")

    @field_validator("course_code", "department_code")
    @classmethod
    def validate_codes(cls, v: str) -> str:
        """Validar que los códigos no contengan espacios en blanco."""
        if " " in v:
            raise ValueError("Los códigos no pueden contener espacios")
        return v.strip().upper()

    @field_validator("course_name")
    @classmethod
    def validate_course_name(cls, v: str) -> str:
        """Validar y normalizar el nombre del curso."""
        return v.strip()


class CatalogCourseCreate(CatalogCourseBase):
    """Schema para crear un nuevo curso."""

    school_ids: list[int] = Field(default_factory=list, description="Lista de IDs de escuelas asociadas al curso")


class CatalogCourseUpdate(BaseModel):
    """Schema para actualizar un curso."""

    course_code: str | None = Field(None, min_length=1, max_length=20)
    course_name: str | None = Field(None, min_length=1, max_length=255)
    department_code: str | None = Field(None, min_length=1, max_length=20)
    is_active: bool | None = None
    school_ids: list[int] | None = Field(None, description="Lista de IDs de escuelas asociadas al curso")

    @field_validator("course_code")
    @classmethod
    def validate_course_code(cls, v: str | None) -> str | None:
        """Validar que course_code no contenga espacios."""
        if v is None:
            return v
        if " " in v:
            raise ValueError("El código del curso no puede contener espacios")
        return v.strip().upper()

    @field_validator("department_code")
    @classmethod
    def validate_department_code(cls, v: str | None) -> str | None:
        """Validar y normalizar department_code (permite espacios)."""
        if v is None:
            return v
        return v.strip().upper()

    @field_validator("course_name")
    @classmethod
    def validate_course_name(cls, v: str | None) -> str | None:
        """Validar y normalizar el nombre del curso."""
        if v is None:
            return v
        return v.strip()


class CourseSchoolRead(BaseModel):
    """Schema para leer relaciones de escuelas."""

    id: int
    school_id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class CatalogCourseRead(CatalogCourseBase):
    """Schema para leer un curso."""

    id: int
    created_at: datetime
    updated_at: datetime
    schools: list[CourseSchoolRead] = Field(default_factory=list)

    model_config = {"from_attributes": True}
