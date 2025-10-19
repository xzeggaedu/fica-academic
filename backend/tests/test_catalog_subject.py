"""Pruebas unitarias para el catálogo de asignaturas."""

import pytest
from pydantic import ValidationError

from src.app.schemas.catalog_subject import (
    CatalogSubjectBase,
    CatalogSubjectCreate,
    CatalogSubjectUpdate,
)


class TestCatalogSubjectValidation:
    """Pruebas para la validación de datos de CatalogSubject."""

    def test_subject_code_validation_valid(self):
        """Prueba que códigos de asignatura válidos pasen la validación."""
        subject = CatalogSubjectBase(
            subject_code="CS101", subject_name="Introducción a la Programación", department_code="CS", is_active=True
        )

        assert subject.subject_code == "CS101"
        assert subject.subject_name == "Introducción a la Programación"
        assert subject.department_code == "CS"
        assert subject.is_active is True

    def test_subject_code_uppercase_normalization(self):
        """Prueba que los códigos se normalicen a mayúsculas."""
        subject = CatalogSubjectBase(
            subject_code="cs101", subject_name="Test Subject", department_code="cs", is_active=True
        )

        assert subject.subject_code == "CS101"
        assert subject.department_code == "CS"

    def test_subject_code_no_spaces(self):
        """Prueba que los códigos no puedan contener espacios."""
        with pytest.raises(ValidationError) as exc_info:
            CatalogSubjectBase(subject_code="CS 101", subject_name="Test Subject", department_code="CS", is_active=True)

        assert "Los códigos no pueden contener espacios" in str(exc_info.value)

    def test_department_code_no_spaces(self):
        """Prueba que el código de departamento no pueda contener espacios."""
        with pytest.raises(ValidationError) as exc_info:
            CatalogSubjectBase(subject_code="CS101", subject_name="Test Subject", department_code="C S", is_active=True)

        # El validador genérico usa el mensaje "Los códigos no pueden contener espacios"
        assert "Los códigos no pueden contener espacios" in str(exc_info.value)

    def test_subject_name_trimming(self):
        """Prueba que el nombre de la asignatura se limpie de espacios."""
        subject = CatalogSubjectBase(
            subject_code="CS101",
            subject_name="  Introducción a la Programación  ",
            department_code="CS",
            is_active=True,
        )

        assert subject.subject_name == "Introducción a la Programación"

    def test_subject_code_required(self):
        """Prueba que subject_code sea requerido."""
        with pytest.raises(ValidationError):
            CatalogSubjectBase(subject_name="Test Subject", department_code="CS", is_active=True)

    def test_subject_name_required(self):
        """Prueba que subject_name sea requerido."""
        with pytest.raises(ValidationError):
            CatalogSubjectBase(subject_code="CS101", department_code="CS", is_active=True)

    def test_department_code_required(self):
        """Prueba que department_code sea requerido."""
        with pytest.raises(ValidationError):
            CatalogSubjectBase(subject_code="CS101", subject_name="Test Subject", is_active=True)

    def test_is_active_default_value(self):
        """Prueba que is_active tenga valor por defecto True."""
        subject = CatalogSubjectBase(subject_code="CS101", subject_name="Test Subject", department_code="CS")

        assert subject.is_active is True


class TestCatalogSubjectCreate:
    """Pruebas para el schema de creación de asignaturas."""

    def test_create_subject_with_schools(self):
        """Prueba crear una asignatura con escuelas asociadas."""
        subject_data = CatalogSubjectCreate(
            subject_code="CS101",
            subject_name="Introducción a la Programación",
            department_code="CS",
            school_ids=[1, 2, 3],
        )

        assert subject_data.subject_code == "CS101"
        assert subject_data.school_ids == [1, 2, 3]

    def test_create_subject_without_schools(self):
        """Prueba crear una asignatura sin escuelas asociadas."""
        subject_data = CatalogSubjectCreate(
            subject_code="CS101", subject_name="Introducción a la Programación", department_code="CS"
        )

        assert subject_data.school_ids == []

    def test_create_subject_with_empty_school_list(self):
        """Prueba crear una asignatura con lista vacía de escuelas."""
        subject_data = CatalogSubjectCreate(
            subject_code="CS101", subject_name="Introducción a la Programación", department_code="CS", school_ids=[]
        )

        assert subject_data.school_ids == []


class TestCatalogSubjectUpdate:
    """Pruebas para el schema de actualización de asignaturas."""

    def test_update_subject_partial(self):
        """Prueba actualización parcial de una asignatura."""
        update_data = CatalogSubjectUpdate(subject_name="Nuevo Nombre")

        assert update_data.subject_name == "Nuevo Nombre"
        assert update_data.subject_code is None
        assert update_data.department_code is None
        assert update_data.is_active is None
        assert update_data.school_ids is None

    def test_update_subject_schools_only(self):
        """Prueba actualizar solo las escuelas de una asignatura."""
        update_data = CatalogSubjectUpdate(school_ids=[1, 2])

        assert update_data.school_ids == [1, 2]
        assert update_data.subject_code is None

    def test_update_subject_code_normalization(self):
        """Prueba que el código se normalice en la actualización."""
        update_data = CatalogSubjectUpdate(subject_code="cs102")

        assert update_data.subject_code == "CS102"

    def test_update_subject_code_no_spaces(self):
        """Prueba que no se permitan espacios en el código al actualizar."""
        with pytest.raises(ValidationError) as exc_info:
            CatalogSubjectUpdate(subject_code="CS 102")

        assert "El código de la asignatura no puede contener espacios" in str(exc_info.value)

    def test_update_subject_name_trimming(self):
        """Prueba que el nombre se limpie de espacios al actualizar."""
        update_data = CatalogSubjectUpdate(subject_name="  Nuevo Nombre  ")

        assert update_data.subject_name == "Nuevo Nombre"

    def test_update_all_fields(self):
        """Prueba actualizar todos los campos a la vez."""
        update_data = CatalogSubjectUpdate(
            subject_code="CS102",
            subject_name="Programación Avanzada",
            department_code="CS",
            is_active=False,
            school_ids=[1],
        )

        assert update_data.subject_code == "CS102"
        assert update_data.subject_name == "Programación Avanzada"
        assert update_data.department_code == "CS"
        assert update_data.is_active is False
        assert update_data.school_ids == [1]


class TestSubjectCodeValidation:
    """Pruebas específicas para la validación de códigos de asignatura."""

    def test_valid_subject_codes(self):
        """Prueba varios formatos válidos de códigos de asignatura."""
        valid_codes = ["CS101", "MATH201", "PHYS301", "ENG101A", "BIO101-L"]

        for code in valid_codes:
            subject = CatalogSubjectBase(subject_code=code, subject_name="Test Course", department_code="TEST")
            assert subject.subject_code == code.upper()

    def test_subject_code_max_length(self):
        """Prueba que el código no exceda la longitud máxima."""
        with pytest.raises(ValidationError):
            CatalogSubjectBase(
                subject_code="A" * 21,  # 21 caracteres, máximo es 20
                subject_name="Test Course",
                department_code="CS",
            )

    def test_subject_code_min_length(self):
        """Prueba que el código tenga al menos 1 carácter."""
        with pytest.raises(ValidationError):
            CatalogSubjectBase(subject_code="", subject_name="Test Course", department_code="CS")

    def test_department_code_max_length(self):
        """Prueba que el código de departamento no exceda la longitud máxima."""
        with pytest.raises(ValidationError):
            CatalogSubjectBase(
                subject_code="CS101",
                subject_name="Test Course",
                department_code="A" * 21,  # 21 caracteres, máximo es 20
            )


class TestSubjectNameValidation:
    """Pruebas específicas para la validación de nombres de asignatura."""

    def test_subject_name_max_length(self):
        """Prueba que el nombre no exceda la longitud máxima."""
        with pytest.raises(ValidationError):
            CatalogSubjectBase(
                subject_code="CS101",
                subject_name="A" * 256,  # 256 caracteres, máximo es 255
                department_code="CS",
            )

    def test_subject_name_min_length(self):
        """Prueba que el nombre tenga al menos 1 carácter."""
        with pytest.raises(ValidationError):
            CatalogSubjectBase(subject_code="CS101", subject_name="", department_code="CS")

    def test_subject_name_with_special_characters(self):
        """Prueba que el nombre pueda contener caracteres especiales."""
        subject = CatalogSubjectBase(
            subject_code="CS101", subject_name="Introducción a la Programación I & II", department_code="CS"
        )

        assert subject.subject_name == "Introducción a la Programación I & II"

    def test_subject_name_with_numbers(self):
        """Prueba que el nombre pueda contener números."""
        subject = CatalogSubjectBase(
            subject_code="CS101", subject_name="Programación 101 - Nivel 1", department_code="CS"
        )

        assert subject.subject_name == "Programación 101 - Nivel 1"


class TestCatalogSubjectSoftDelete:
    """Pruebas para soft-delete de asignaturas."""

    def test_update_schema_accepts_deleted_fields(self):
        """Prueba que el schema CatalogSubjectUpdate acepta campos deleted y deleted_at."""
        from datetime import datetime

        update_data = CatalogSubjectUpdate(deleted=True, deleted_at=datetime.now())

        assert update_data.deleted is True
        assert update_data.deleted_at is not None

    def test_update_schema_deleted_optional(self):
        """Prueba que deleted sea opcional en CatalogSubjectUpdate."""
        update_data = CatalogSubjectUpdate(subject_name="Nuevo Nombre")

        assert update_data.deleted is None
        assert update_data.deleted_at is None

    def test_update_schema_restore_fields(self):
        """Prueba que el schema permita restaurar (deleted=False, deleted_at=None)."""
        update_data = CatalogSubjectUpdate(deleted=False, deleted_at=None)

        assert update_data.deleted is False
        assert update_data.deleted_at is None
