"""Pruebas unitarias para el catálogo de coordinaciones."""

import pytest
from pydantic import ValidationError

from src.app.schemas.catalog_coordination import (
    CatalogCoordinationBase,
    CatalogCoordinationCreate,
    CatalogCoordinationUpdate,
)


class TestCatalogCoordinationValidation:
    """Pruebas para la validación de datos de CatalogCoordination."""

    def test_code_validation_valid(self):
        """Prueba que códigos válidos pasen la validación."""
        coordination = CatalogCoordinationBase(
            code="MATE",
            name="Coordinación de Matemáticas",
            faculty_id=1,
            school_id=1,
            is_active=True,
        )

        assert coordination.code == "MATE"
        assert coordination.name == "Coordinación de Matemáticas"
        assert coordination.faculty_id == 1
        assert coordination.school_id == 1

    def test_code_uppercase_normalization(self):
        """Prueba que los códigos se normalicen a mayúsculas."""
        coordination = CatalogCoordinationBase(
            code="mate", name="Coordinación de Matemáticas", faculty_id=1, school_id=1
        )

        assert coordination.code == "MATE"

    def test_code_no_spaces(self):
        """Prueba que el código no pueda contener espacios."""
        with pytest.raises(ValidationError) as exc_info:
            CatalogCoordinationBase(code="MA TE", name="Test", faculty_id=1, school_id=1)

        assert "El código no puede contener espacios" in str(exc_info.value)

    def test_name_trimming(self):
        """Prueba que el nombre se limpie de espacios."""
        coordination = CatalogCoordinationBase(
            code="MATE", name="  Coordinación de Matemáticas  ", faculty_id=1, school_id=1
        )

        assert coordination.name == "Coordinación de Matemáticas"

    def test_code_required(self):
        """Prueba que code sea requerido."""
        with pytest.raises(ValidationError):
            CatalogCoordinationBase(name="Test", faculty_id=1, school_id=1)

    def test_name_required(self):
        """Prueba que name sea requerido."""
        with pytest.raises(ValidationError):
            CatalogCoordinationBase(code="MATE", faculty_id=1, school_id=1)

    def test_faculty_id_required(self):
        """Prueba que faculty_id sea requerido."""
        with pytest.raises(ValidationError):
            CatalogCoordinationBase(code="MATE", name="Test", school_id=1)

    def test_school_id_required(self):
        """Prueba que school_id sea requerido."""
        with pytest.raises(ValidationError):
            CatalogCoordinationBase(code="MATE", name="Test", faculty_id=1)

    def test_is_active_default_value(self):
        """Prueba que is_active tenga valor por defecto True."""
        coordination = CatalogCoordinationBase(code="MATE", name="Test", faculty_id=1, school_id=1)

        assert coordination.is_active is True

    def test_description_optional(self):
        """Prueba que description sea opcional."""
        coordination = CatalogCoordinationBase(code="MATE", name="Test", faculty_id=1, school_id=1)

        assert coordination.description is None

    def test_coordinator_professor_id_optional(self):
        """Prueba que coordinator_professor_id sea opcional."""
        coordination = CatalogCoordinationBase(code="MATE", name="Test", faculty_id=1, school_id=1)

        assert coordination.coordinator_professor_id is None


class TestCatalogCoordinationCreate:
    """Pruebas para el schema de creación de coordinaciones."""

    def test_create_coordination_with_all_fields(self):
        """Prueba crear una coordinación con todos los campos."""
        coordination_data = CatalogCoordinationCreate(
            code="MATE",
            name="Coordinación de Matemáticas",
            description="Área de matemáticas y estadística",
            faculty_id=1,
            school_id=1,
            coordinator_professor_id=5,
            is_active=True,
        )

        assert coordination_data.code == "MATE"
        assert coordination_data.name == "Coordinación de Matemáticas"
        assert coordination_data.description == "Área de matemáticas y estadística"
        assert coordination_data.faculty_id == 1
        assert coordination_data.school_id == 1
        assert coordination_data.coordinator_professor_id == 5

    def test_create_coordination_minimal_fields(self):
        """Prueba crear una coordinación solo con campos requeridos."""
        coordination_data = CatalogCoordinationCreate(
            code="PROG", name="Coordinación de Programación", faculty_id=1, school_id=1
        )

        assert coordination_data.code == "PROG"
        assert coordination_data.description is None
        assert coordination_data.coordinator_professor_id is None


class TestCatalogCoordinationUpdate:
    """Pruebas para el schema de actualización de coordinaciones."""

    def test_update_coordination_partial(self):
        """Prueba actualización parcial de coordinación."""
        update_data = CatalogCoordinationUpdate(name="Nuevo Nombre")

        assert update_data.name == "Nuevo Nombre"
        assert update_data.code is None
        assert update_data.faculty_id is None

    def test_update_code_normalization(self):
        """Prueba que el código se normalice en actualizaciones."""
        update_data = CatalogCoordinationUpdate(code="prog")

        assert update_data.code == "PROG"

    def test_update_code_no_spaces(self):
        """Prueba que el código no pueda contener espacios en actualizaciones."""
        with pytest.raises(ValidationError):
            CatalogCoordinationUpdate(code="PR OG")

    def test_update_name_trimming(self):
        """Prueba que el nombre se limpie en actualizaciones."""
        update_data = CatalogCoordinationUpdate(name="  Nuevo Nombre  ")

        assert update_data.name == "Nuevo Nombre"

    def test_update_all_fields(self):
        """Prueba actualización de todos los campos."""
        update_data = CatalogCoordinationUpdate(
            code="NEWCODE",
            name="Nuevo Nombre",
            description="Nueva descripción",
            faculty_id=2,
            school_id=2,
            coordinator_professor_id=10,
            is_active=False,
        )

        assert update_data.code == "NEWCODE"
        assert update_data.name == "Nuevo Nombre"
        assert update_data.description == "Nueva descripción"
        assert update_data.faculty_id == 2
        assert update_data.coordinator_professor_id == 10
        assert update_data.is_active is False


class TestCatalogCoordinationSoftDelete:
    """Pruebas para soft-delete de coordinaciones."""

    def test_update_schema_accepts_deleted_fields(self):
        """Prueba que el schema CatalogCoordinationUpdate acepta campos deleted y deleted_at."""
        from datetime import datetime

        update_data = CatalogCoordinationUpdate(deleted=True, deleted_at=datetime.now())

        assert update_data.deleted is True
        assert update_data.deleted_at is not None

    def test_update_schema_deleted_optional(self):
        """Prueba que deleted sea opcional en CatalogCoordinationUpdate."""
        update_data = CatalogCoordinationUpdate(name="Nuevo Nombre")

        assert update_data.deleted is None
        assert update_data.deleted_at is None

    def test_update_schema_restore_fields(self):
        """Prueba que el schema permita restaurar (deleted=False, deleted_at=None)."""
        update_data = CatalogCoordinationUpdate(deleted=False, deleted_at=None)

        assert update_data.deleted is False
        assert update_data.deleted_at is None


class TestCoordinationCodeValidation:
    """Pruebas específicas para la validación de códigos de coordinación."""

    def test_valid_coordination_codes(self):
        """Prueba que códigos válidos pasen la validación."""
        valid_codes = ["MATE", "PROG", "RED", "FIS", "QUIM"]

        for code in valid_codes:
            coordination = CatalogCoordinationBase(code=code, name="Test", faculty_id=1, school_id=1)
            assert coordination.code == code

    def test_code_max_length(self):
        """Prueba que el código no exceda la longitud máxima."""
        with pytest.raises(ValidationError):
            CatalogCoordinationBase(
                code="A" * 11,  # 11 caracteres, máximo es 10
                name="Test",
                faculty_id=1,
            )

    def test_code_min_length(self):
        """Prueba que el código tenga al menos 1 carácter."""
        with pytest.raises(ValidationError):
            CatalogCoordinationBase(code="", name="Test", faculty_id=1, school_id=1)


class TestCoordinationNameValidation:
    """Pruebas específicas para la validación de nombres de coordinación."""

    def test_name_max_length(self):
        """Prueba que el nombre no exceda la longitud máxima."""
        with pytest.raises(ValidationError):
            CatalogCoordinationBase(
                code="MATE",
                name="A" * 101,  # 101 caracteres, máximo es 100
                faculty_id=1,
            )

    def test_name_min_length(self):
        """Prueba que el nombre tenga al menos 1 carácter."""
        with pytest.raises(ValidationError):
            CatalogCoordinationBase(code="MATE", name="", faculty_id=1, school_id=1)

    def test_name_with_special_characters(self):
        """Prueba que el nombre pueda contener caracteres especiales."""
        coordination = CatalogCoordinationBase(
            code="MATE", name="Coordinación de Matemáticas & Física", faculty_id=1, school_id=1
        )

        assert coordination.name == "Coordinación de Matemáticas & Física"
