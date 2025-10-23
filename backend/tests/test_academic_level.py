import pytest


class TestAcademicLevelValidation:
    """Pruebas para la validación de datos de AcademicLevel."""

    def test_create_academic_level_valid(self):
        """Prueba que se pueda crear un nivel académico válido."""
        from src.app.schemas.academic_level import AcademicLevelCreate

        level = AcademicLevelCreate(
            code="BLG",
            name="Bilingüe (Clase y Profesor)",
            priority=5,
            description="Nivel más alto - Dominio de idiomas",
            is_active=True,
        )

        assert level.code == "BLG"
        assert level.name == "Bilingüe (Clase y Profesor)"
        assert level.priority == 5

    def test_create_academic_level_minimal(self):
        """Prueba que se pueda crear un nivel académico con campos mínimos."""
        from src.app.schemas.academic_level import AcademicLevelCreate

        level = AcademicLevelCreate(code="GDO", name="Grado Base", priority=1)

        assert level.code == "GDO"
        assert level.name == "Grado Base"
        assert level.priority == 1
        assert level.description is None
        assert level.is_active is True

    def test_code_uppercase_validation(self):
        """Prueba que el código use el Enum correcto."""
        from src.app.schemas.academic_level import AcademicLevelCode, AcademicLevelCreate

        level = AcademicLevelCreate(code=AcademicLevelCode.BLG, name="Bilingüe", priority=5)

        assert level.code == AcademicLevelCode.BLG

    def test_code_no_spaces_validation(self):
        """Prueba que el código use solo valores del Enum permitidos."""
        from pydantic import ValidationError

        from src.app.schemas.academic_level import AcademicLevelCreate

        with pytest.raises(ValidationError) as exc_info:
            AcademicLevelCreate(code="INVALID_CODE", name="Bilingüe", priority=5)

        # Verificar que el error menciona los valores permitidos
        error_message = str(exc_info.value).lower()
        assert "should be" in error_message or "invalid" in error_message

    def test_priority_range_validation(self):
        """Prueba que la prioridad esté en el rango válido."""
        from pydantic import ValidationError

        from src.app.schemas.academic_level import AcademicLevelCreate

        # Prioridad menor que 1
        with pytest.raises(ValidationError):
            AcademicLevelCreate(code="TEST", name="Test", priority=0)

        # Prioridad mayor que 5
        with pytest.raises(ValidationError):
            AcademicLevelCreate(code="TEST", name="Test", priority=6)

    def test_code_length_validation(self):
        """Prueba que el código respete la longitud máxima."""
        from pydantic import ValidationError

        from src.app.schemas.academic_level import AcademicLevelCreate

        # Código muy largo (>10 caracteres)
        with pytest.raises(ValidationError):
            AcademicLevelCreate(code="VERYLONGCODE", name="Test", priority=1)

    def test_name_length_validation(self):
        """Prueba que el nombre respete la longitud máxima."""
        from pydantic import ValidationError

        from src.app.schemas.academic_level import AcademicLevelCreate

        # Nombre muy largo (>100 caracteres)
        long_name = "A" * 101
        with pytest.raises(ValidationError):
            AcademicLevelCreate(code="TEST", name=long_name, priority=1)

    def test_name_empty_validation(self):
        """Prueba que el nombre no pueda estar vacío."""
        from pydantic import ValidationError

        from src.app.schemas.academic_level import AcademicLevelCreate

        with pytest.raises(ValidationError) as exc_info:
            AcademicLevelCreate(code="TEST", name="   ", priority=1)

        assert "no puede estar vacío" in str(exc_info.value).lower()


class TestAcademicLevelUpdate:
    """Pruebas para actualización de Academic Level."""

    def test_update_all_fields(self):
        """Prueba que se puedan actualizar todos los campos."""
        from src.app.schemas.academic_level import AcademicLevelUpdate

        update = AcademicLevelUpdate(
            code="DR",
            name="Doctorado Actualizado",
            priority=4,
            description="Nueva descripción",
            is_active=False,
        )

        assert update.code == "DR"
        assert update.name == "Doctorado Actualizado"
        assert update.priority == 4

    def test_update_partial_fields(self):
        """Prueba que se pueda actualizar parcialmente."""
        from src.app.schemas.academic_level import AcademicLevelUpdate

        update = AcademicLevelUpdate(priority=3)

        assert update.priority == 3
        assert update.code is None
        assert update.name is None

    def test_update_code_uppercase(self):
        """Prueba que el código use el Enum correcto en actualización."""
        from src.app.schemas.academic_level import AcademicLevelCode, AcademicLevelUpdate

        update = AcademicLevelUpdate(code=AcademicLevelCode.M1)

        assert update.code == AcademicLevelCode.M1


class TestAcademicLevelRead:
    """Pruebas para lectura de Academic Level."""

    def test_read_schema_with_timestamps(self):
        """Prueba que el schema de lectura incluya timestamps."""
        from datetime import datetime

        from src.app.schemas.academic_level import AcademicLevelRead

        level = AcademicLevelRead(
            id=1,
            code="BLG",
            name="Bilingüe",
            priority=5,
            description="Test",
            is_active=True,
            created_at=datetime.now(),
            updated_at=None,
        )

        assert level.id == 1
        assert level.created_at is not None
