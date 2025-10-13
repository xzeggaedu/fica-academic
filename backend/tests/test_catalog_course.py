"""Pruebas unitarias para el catálogo de cursos."""

import pytest
from pydantic import ValidationError

from src.app.schemas.catalog_course import (
    CatalogCourseBase,
    CatalogCourseCreate,
    CatalogCourseUpdate,
)


class TestCatalogCourseValidation:
    """Pruebas para la validación de datos de CatalogCourse."""

    def test_course_code_validation_valid(self):
        """Prueba que códigos de curso válidos pasen la validación."""
        course = CatalogCourseBase(
            course_code="CS101",
            course_name="Introducción a la Programación",
            department_code="CS",
            is_active=True
        )
        
        assert course.course_code == "CS101"
        assert course.course_name == "Introducción a la Programación"
        assert course.department_code == "CS"
        assert course.is_active is True

    def test_course_code_uppercase_normalization(self):
        """Prueba que los códigos se normalicen a mayúsculas."""
        course = CatalogCourseBase(
            course_code="cs101",
            course_name="Test Course",
            department_code="cs",
            is_active=True
        )
        
        assert course.course_code == "CS101"
        assert course.department_code == "CS"

    def test_course_code_no_spaces(self):
        """Prueba que los códigos no puedan contener espacios."""
        with pytest.raises(ValidationError) as exc_info:
            CatalogCourseBase(
                course_code="CS 101",
                course_name="Test Course",
                department_code="CS",
                is_active=True
            )
        
        assert "Los códigos no pueden contener espacios" in str(exc_info.value)

    def test_department_code_no_spaces(self):
        """Prueba que el código de departamento no pueda contener espacios."""
        with pytest.raises(ValidationError) as exc_info:
            CatalogCourseBase(
                course_code="CS101",
                course_name="Test Course",
                department_code="C S",
                is_active=True
            )
        
        assert "Los códigos no pueden contener espacios" in str(exc_info.value)

    def test_course_name_trimming(self):
        """Prueba que el nombre del curso se limpie de espacios."""
        course = CatalogCourseBase(
            course_code="CS101",
            course_name="  Introducción a la Programación  ",
            department_code="CS",
            is_active=True
        )
        
        assert course.course_name == "Introducción a la Programación"

    def test_course_code_required(self):
        """Prueba que course_code sea requerido."""
        with pytest.raises(ValidationError):
            CatalogCourseBase(
                course_name="Test Course",
                department_code="CS",
                is_active=True
            )

    def test_course_name_required(self):
        """Prueba que course_name sea requerido."""
        with pytest.raises(ValidationError):
            CatalogCourseBase(
                course_code="CS101",
                department_code="CS",
                is_active=True
            )

    def test_department_code_required(self):
        """Prueba que department_code sea requerido."""
        with pytest.raises(ValidationError):
            CatalogCourseBase(
                course_code="CS101",
                course_name="Test Course",
                is_active=True
            )

    def test_is_active_default_value(self):
        """Prueba que is_active tenga valor por defecto True."""
        course = CatalogCourseBase(
            course_code="CS101",
            course_name="Test Course",
            department_code="CS"
        )
        
        assert course.is_active is True


class TestCatalogCourseCreate:
    """Pruebas para el schema de creación de cursos."""

    def test_create_course_with_schools(self):
        """Prueba crear un curso con escuelas asociadas."""
        course_data = CatalogCourseCreate(
            course_code="CS101",
            course_name="Introducción a la Programación",
            department_code="CS",
            school_ids=[1, 2, 3]
        )
        
        assert course_data.course_code == "CS101"
        assert course_data.school_ids == [1, 2, 3]

    def test_create_course_without_schools(self):
        """Prueba crear un curso sin escuelas asociadas."""
        course_data = CatalogCourseCreate(
            course_code="CS101",
            course_name="Introducción a la Programación",
            department_code="CS"
        )
        
        assert course_data.school_ids == []

    def test_create_course_with_empty_school_list(self):
        """Prueba crear un curso con lista vacía de escuelas."""
        course_data = CatalogCourseCreate(
            course_code="CS101",
            course_name="Introducción a la Programación",
            department_code="CS",
            school_ids=[]
        )
        
        assert course_data.school_ids == []


class TestCatalogCourseUpdate:
    """Pruebas para el schema de actualización de cursos."""

    def test_update_course_partial(self):
        """Prueba actualización parcial de un curso."""
        update_data = CatalogCourseUpdate(
            course_name="Nuevo Nombre"
        )
        
        assert update_data.course_name == "Nuevo Nombre"
        assert update_data.course_code is None
        assert update_data.department_code is None
        assert update_data.is_active is None
        assert update_data.school_ids is None

    def test_update_course_schools_only(self):
        """Prueba actualizar solo las escuelas de un curso."""
        update_data = CatalogCourseUpdate(
            school_ids=[1, 2]
        )
        
        assert update_data.school_ids == [1, 2]
        assert update_data.course_code is None

    def test_update_course_code_normalization(self):
        """Prueba que el código se normalice en la actualización."""
        update_data = CatalogCourseUpdate(
            course_code="cs102"
        )
        
        assert update_data.course_code == "CS102"

    def test_update_course_code_no_spaces(self):
        """Prueba que no se permitan espacios en el código al actualizar."""
        with pytest.raises(ValidationError) as exc_info:
            CatalogCourseUpdate(
                course_code="CS 102"
            )
        
        assert "Los códigos no pueden contener espacios" in str(exc_info.value)

    def test_update_course_name_trimming(self):
        """Prueba que el nombre se limpie de espacios al actualizar."""
        update_data = CatalogCourseUpdate(
            course_name="  Nuevo Nombre  "
        )
        
        assert update_data.course_name == "Nuevo Nombre"

    def test_update_all_fields(self):
        """Prueba actualizar todos los campos a la vez."""
        update_data = CatalogCourseUpdate(
            course_code="CS102",
            course_name="Programación Avanzada",
            department_code="CS",
            is_active=False,
            school_ids=[1]
        )
        
        assert update_data.course_code == "CS102"
        assert update_data.course_name == "Programación Avanzada"
        assert update_data.department_code == "CS"
        assert update_data.is_active is False
        assert update_data.school_ids == [1]


class TestCourseCodeValidation:
    """Pruebas específicas para la validación de códigos de curso."""

    def test_valid_course_codes(self):
        """Prueba varios formatos válidos de códigos de curso."""
        valid_codes = ["CS101", "MATH201", "PHYS301", "ENG101A", "BIO101-L"]
        
        for code in valid_codes:
            course = CatalogCourseBase(
                course_code=code,
                course_name="Test Course",
                department_code="TEST"
            )
            assert course.course_code == code.upper()

    def test_course_code_max_length(self):
        """Prueba que el código no exceda la longitud máxima."""
        with pytest.raises(ValidationError):
            CatalogCourseBase(
                course_code="A" * 21,  # 21 caracteres, máximo es 20
                course_name="Test Course",
                department_code="CS"
            )

    def test_course_code_min_length(self):
        """Prueba que el código tenga al menos 1 carácter."""
        with pytest.raises(ValidationError):
            CatalogCourseBase(
                course_code="",
                course_name="Test Course",
                department_code="CS"
            )

    def test_department_code_max_length(self):
        """Prueba que el código de departamento no exceda la longitud máxima."""
        with pytest.raises(ValidationError):
            CatalogCourseBase(
                course_code="CS101",
                course_name="Test Course",
                department_code="A" * 21  # 21 caracteres, máximo es 20
            )


class TestCourseNameValidation:
    """Pruebas específicas para la validación de nombres de curso."""

    def test_course_name_max_length(self):
        """Prueba que el nombre no exceda la longitud máxima."""
        with pytest.raises(ValidationError):
            CatalogCourseBase(
                course_code="CS101",
                course_name="A" * 256,  # 256 caracteres, máximo es 255
                department_code="CS"
            )

    def test_course_name_min_length(self):
        """Prueba que el nombre tenga al menos 1 carácter."""
        with pytest.raises(ValidationError):
            CatalogCourseBase(
                course_code="CS101",
                course_name="",
                department_code="CS"
            )

    def test_course_name_with_special_characters(self):
        """Prueba que el nombre pueda contener caracteres especiales."""
        course = CatalogCourseBase(
            course_code="CS101",
            course_name="Introducción a la Programación I & II",
            department_code="CS"
        )
        
        assert course.course_name == "Introducción a la Programación I & II"

    def test_course_name_with_numbers(self):
        """Prueba que el nombre pueda contener números."""
        course = CatalogCourseBase(
            course_code="CS101",
            course_name="Programación 101 - Nivel 1",
            department_code="CS"
        )
        
        assert course.course_name == "Programación 101 - Nivel 1"

