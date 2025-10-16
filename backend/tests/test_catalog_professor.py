"""Unit tests for professors catalog API endpoints."""

from datetime import datetime
from unittest.mock import AsyncMock, Mock, patch

import pytest
from fastapi import HTTPException

from src.app.api.v1.catalog_professor import (
    create_professor,
    delete_professor,
    read_active_professors,
    read_professor,
    read_professors,
    restore_professor_endpoint,
    soft_delete_professor_endpoint,
    update_professor,
)
from src.app.schemas.catalog_professor import CatalogProfessorCreate, CatalogProfessorUpdate


class TestCreateProfessor:
    """Test professor creation endpoint."""

    @pytest.mark.asyncio
    async def test_create_professor_success(self, mock_db, current_admin_user_dict):
        """Test successful professor creation."""
        professor_data = CatalogProfessorCreate(
            professor_id="P001",
            professor_name="Dr. Juan Pérez",
            institutional_email="juan.perez@utec.edu.sv",
            professor_category="DHC",
            academic_title="Dr.",
            doctorates=1,
            masters=0,
            is_bilingual=True,
            is_paid=True,
            is_active=True,
        )

        mock_created_professor = Mock(
            id=1,
            professor_id="P001",
            professor_name="Dr. Juan Pérez",
            institutional_email="juan.perez@utec.edu.sv",
            personal_email=None,
            phone_number=None,
            professor_category="DHC",
            academic_title="Dr.",
            doctorates=1,
            masters=0,
            is_bilingual=True,
            is_paid=True,
            is_active=True,
            deleted=False,
            deleted_at=None,
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )

        with patch("src.app.api.v1.catalog_professor.professor_code_exists") as mock_code_exists:
            mock_code_exists.return_value = False

            with patch("src.app.api.v1.catalog_professor.professor_name_exists") as mock_name_exists:
                mock_name_exists.return_value = False

                with patch("src.app.api.v1.catalog_professor.crud_catalog_professor") as mock_crud:
                    mock_crud.create = AsyncMock(return_value=mock_created_professor)

                    result = await create_professor(professor_data, mock_db, current_admin_user_dict)

                    assert result.professor_id == "P001"
                    mock_crud.create.assert_called_once()

    @pytest.mark.asyncio
    async def test_create_professor_duplicate_code(self, mock_db, current_admin_user_dict):
        """Test professor creation with duplicate professor_id."""
        professor_data = CatalogProfessorCreate(
            professor_id="P001",
            professor_name="Dr. Juan Pérez",
            institutional_email="juan.perez@utec.edu.sv",
            is_active=True,
        )

        with patch("src.app.api.v1.catalog_professor.professor_code_exists") as mock_code_exists:
            mock_code_exists.return_value = True

            with pytest.raises(HTTPException) as exc_info:
                await create_professor(professor_data, mock_db, current_admin_user_dict)

            assert exc_info.value.status_code == 400

    @pytest.mark.asyncio
    async def test_create_professor_duplicate_name(self, mock_db, current_admin_user_dict):
        """Test professor creation with duplicate name."""
        professor_data = CatalogProfessorCreate(
            professor_id="P002",
            professor_name="Dr. Juan Pérez",
            institutional_email="juan.perez@utec.edu.sv",
            is_active=True,
        )

        with patch("src.app.api.v1.catalog_professor.professor_code_exists") as mock_code_exists:
            mock_code_exists.return_value = False

            with patch("src.app.api.v1.catalog_professor.professor_name_exists") as mock_name_exists:
                mock_name_exists.return_value = True

                with pytest.raises(HTTPException) as exc_info:
                    await create_professor(professor_data, mock_db, current_admin_user_dict)

                assert exc_info.value.status_code == 400


class TestReadProfessors:
    """Test professors list endpoint."""

    @pytest.mark.asyncio
    async def test_read_professors_success(self, mock_db, current_user_dict):
        """Test successful professors list retrieval."""
        mock_professors_data = [
            Mock(
                id=1,
                professor_id="P001",
                professor_name="Dr. Juan Pérez",
                institutional_email="juan.perez@utec.edu.sv",
                personal_email=None,
                phone_number=None,
                professor_category="DHC",
                academic_title="Dr.",
                doctorates=1,
                masters=0,
                is_bilingual=True,
                is_paid=True,
                is_active=True,
                deleted=False,
                deleted_at=None,
                created_at=datetime.now(),
                updated_at=datetime.now(),
            ),
            Mock(
                id=2,
                professor_id="P002",
                professor_name="Ing. María López",
                institutional_email="maria.lopez@utec.edu.sv",
                personal_email=None,
                phone_number=None,
                professor_category="ADM",
                academic_title="Ing.",
                doctorates=0,
                masters=1,
                is_bilingual=False,
                is_paid=True,
                is_active=True,
                deleted=False,
                deleted_at=None,
                created_at=datetime.now(),
                updated_at=datetime.now(),
            ),
        ]

        mock_result = Mock()
        mock_result.scalar_one.return_value = 2
        mock_result.scalars.return_value.all.return_value = mock_professors_data

        mock_db.execute = AsyncMock(return_value=mock_result)

        result = await read_professors(mock_db, current_user_dict, page=1, items_per_page=10)

        assert result["total_count"] == 2
        assert len(result["data"]) == 2


class TestReadProfessor:
    """Test get single professor endpoint."""

    @pytest.mark.asyncio
    async def test_read_professor_success(self, mock_db, current_user_dict):
        """Test successful professor retrieval."""
        mock_professor = {
            "id": 1,
            "professor_id": "P001",
            "professor_name": "Dr. Juan Pérez",
            "is_active": True,
        }

        with patch("src.app.api.v1.catalog_professor.crud_catalog_professor") as mock_crud:
            mock_crud.get = AsyncMock(return_value=mock_professor)

            result = await read_professor(1, mock_db, current_user_dict)

            assert result == mock_professor
            mock_crud.get.assert_called_once()

    @pytest.mark.asyncio
    async def test_read_professor_not_found(self, mock_db, current_user_dict):
        """Test professor retrieval when not found."""
        with patch("src.app.api.v1.catalog_professor.crud_catalog_professor") as mock_crud:
            mock_crud.get = AsyncMock(return_value=None)

            with pytest.raises(HTTPException) as exc_info:
                await read_professor(999, mock_db, current_user_dict)

            assert exc_info.value.status_code == 404


class TestUpdateProfessor:
    """Test professor update endpoint."""

    @pytest.mark.asyncio
    async def test_update_professor_success(self, mock_db, current_admin_user_dict):
        """Test successful professor update."""
        professor_data = CatalogProfessorUpdate(professor_name="Dr. Juan Pérez Actualizado")

        mock_existing_professor = {
            "id": 1,
            "professor_id": "P001",
            "professor_name": "Dr. Juan Pérez",
        }

        mock_updated_professor = {
            "id": 1,
            "professor_id": "P001",
            "professor_name": "Dr. Juan Pérez Actualizado",
        }

        with patch("src.app.api.v1.catalog_professor.crud_catalog_professor") as mock_crud:
            mock_crud.get = AsyncMock(side_effect=[mock_existing_professor, mock_updated_professor])
            mock_crud.update = AsyncMock()

            with patch("src.app.api.v1.catalog_professor.professor_name_exists") as mock_name_exists:
                mock_name_exists.return_value = False

                result = await update_professor(1, professor_data, mock_db, current_admin_user_dict)

                assert result == mock_updated_professor
                mock_crud.update.assert_called_once()

    @pytest.mark.asyncio
    async def test_update_professor_not_found(self, mock_db, current_admin_user_dict):
        """Test professor update when not found."""
        professor_data = CatalogProfessorUpdate(professor_name="Dr. Juan Pérez")

        with patch("src.app.api.v1.catalog_professor.crud_catalog_professor") as mock_crud:
            mock_crud.get = AsyncMock(return_value=None)

            with pytest.raises(HTTPException) as exc_info:
                await update_professor(999, professor_data, mock_db, current_admin_user_dict)

            assert exc_info.value.status_code == 404

    @pytest.mark.asyncio
    async def test_update_professor_duplicate_code(self, mock_db, current_admin_user_dict):
        """Test professor update with duplicate professor_id."""
        professor_data = CatalogProfessorUpdate(professor_id="P002")

        mock_existing_professor = {
            "id": 1,
            "professor_id": "P001",
            "professor_name": "Dr. Juan Pérez",
        }

        with patch("src.app.api.v1.catalog_professor.crud_catalog_professor") as mock_crud:
            mock_crud.get = AsyncMock(return_value=mock_existing_professor)

            with patch("src.app.api.v1.catalog_professor.professor_code_exists") as mock_code_exists:
                mock_code_exists.return_value = True

                with pytest.raises(HTTPException) as exc_info:
                    await update_professor(1, professor_data, mock_db, current_admin_user_dict)

                assert exc_info.value.status_code == 400


class TestDeleteProfessor:
    """Test professor soft delete endpoint."""

    @pytest.mark.asyncio
    async def test_delete_professor_success(self, mock_db, current_admin_user_dict):
        """Test successful professor soft delete."""
        mock_professor = {"id": 1, "professor_id": "P001"}

        with patch("src.app.api.v1.catalog_professor.crud_catalog_professor") as mock_crud:
            mock_crud.get = AsyncMock(return_value=mock_professor)

            with patch("src.app.api.v1.catalog_professor.soft_delete_professor") as mock_soft_delete:
                mock_soft_delete.return_value = True

                result = await delete_professor(1, mock_db, current_admin_user_dict)

                assert result is None
                mock_soft_delete.assert_called_once_with(mock_db, 1)

    @pytest.mark.asyncio
    async def test_delete_professor_not_found(self, mock_db, current_admin_user_dict):
        """Test professor soft delete when not found."""
        with patch("src.app.api.v1.catalog_professor.crud_catalog_professor") as mock_crud:
            mock_crud.get = AsyncMock(return_value=None)

            with pytest.raises(HTTPException) as exc_info:
                await delete_professor(999, mock_db, current_admin_user_dict)

            assert exc_info.value.status_code == 404


class TestSoftDeleteProfessor:
    """Test explicit soft delete endpoint."""

    @pytest.mark.asyncio
    async def test_soft_delete_professor_success(self, mock_db, current_admin_user_dict):
        """Test successful explicit soft delete."""
        mock_professor = {"id": 1, "professor_id": "P001"}

        with patch("src.app.api.v1.catalog_professor.crud_catalog_professor") as mock_crud:
            mock_crud.get = AsyncMock(return_value=mock_professor)

            with patch("src.app.api.v1.catalog_professor.soft_delete_professor") as mock_soft_delete:
                mock_soft_delete.return_value = True

                result = await soft_delete_professor_endpoint(1, mock_db, current_admin_user_dict)

                assert result is None
                mock_soft_delete.assert_called_once_with(mock_db, 1)


class TestRestoreProfessor:
    """Test professor restore endpoint."""

    @pytest.mark.asyncio
    async def test_restore_professor_success(self, mock_db, current_admin_user_dict):
        """Test successful professor restore."""
        mock_professor = {"id": 1, "professor_id": "P001", "deleted": True}
        mock_restored_professor = {"id": 1, "professor_id": "P001", "deleted": False}

        with patch("src.app.api.v1.catalog_professor.crud_catalog_professor") as mock_crud:
            mock_crud.get = AsyncMock(side_effect=[mock_professor, mock_restored_professor])

            with patch("src.app.api.v1.catalog_professor.restore_professor") as mock_restore:
                mock_restore.return_value = True

                result = await restore_professor_endpoint(1, mock_db, current_admin_user_dict)

                assert result == mock_restored_professor
                mock_restore.assert_called_once_with(mock_db, 1)

    @pytest.mark.asyncio
    async def test_restore_professor_not_found(self, mock_db, current_admin_user_dict):
        """Test professor restore when not found."""
        with patch("src.app.api.v1.catalog_professor.crud_catalog_professor") as mock_crud:
            mock_crud.get = AsyncMock(return_value=None)

            with pytest.raises(HTTPException) as exc_info:
                await restore_professor_endpoint(999, mock_db, current_admin_user_dict)

            assert exc_info.value.status_code == 404


class TestReadActiveProfessors:
    """Test active professors list endpoint."""

    @pytest.mark.asyncio
    async def test_read_active_professors_success(self, mock_db, current_user_dict):
        """Test successful active professors retrieval."""
        mock_professors = [
            Mock(
                id=1,
                professor_id="P001",
                professor_name="Dr. Juan Pérez",
                institutional_email="juan.perez@utec.edu.sv",
                personal_email=None,
                phone_number=None,
                professor_category="DHC",
                academic_title="Dr.",
                doctorates=1,
                masters=0,
                is_bilingual=True,
                is_paid=True,
                is_active=True,
                deleted=False,
                deleted_at=None,
                created_at=datetime.now(),
                updated_at=datetime.now(),
            ),
            Mock(
                id=2,
                professor_id="P002",
                professor_name="Ing. María López",
                institutional_email="maria.lopez@utec.edu.sv",
                personal_email=None,
                phone_number=None,
                professor_category="ADM",
                academic_title="Ing.",
                doctorates=0,
                masters=1,
                is_bilingual=False,
                is_paid=True,
                is_active=True,
                deleted=False,
                deleted_at=None,
                created_at=datetime.now(),
                updated_at=datetime.now(),
            ),
        ]

        with patch("src.app.api.v1.catalog_professor.get_active_professors") as mock_get_active:
            mock_get_active.return_value = mock_professors

            result = await read_active_professors(mock_db, current_user_dict)

            assert len(result) == 2
            mock_get_active.assert_called_once()
