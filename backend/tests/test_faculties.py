"""Unit tests for faculties API endpoints."""

from unittest.mock import AsyncMock, Mock, patch

import pytest

from src.app.api.v1.faculties import (
    create_faculty,
    delete_faculty,
    get_faculty,
    list_faculties,
    restore_faculty_endpoint,
    soft_delete_faculty_endpoint,
    update_faculty,
)
from src.app.core.exceptions.http_exceptions import DuplicateValueException, NotFoundException
from src.app.schemas.faculty import FacultyCreate, FacultyUpdate


class TestCreateFaculty:
    """Test faculty creation endpoint."""

    @pytest.mark.asyncio
    async def test_create_faculty_success(self, mock_db, current_admin_user_dict):
        """Test successful faculty creation."""
        faculty_data = FacultyCreate(name="Facultad de Ingeniería", acronym="FI", is_active=True)

        mock_created_faculty = Mock(id=1)
        mock_faculty_read = {
            "id": 1,
            "name": "Facultad de Ingeniería",
            "acronym": "FI",
            "is_active": True,
        }

        with patch("src.app.api.v1.faculties.faculty_exists") as mock_exists:
            mock_exists.return_value = False

            with patch("src.app.api.v1.faculties.faculty_acronym_exists") as mock_acronym_exists:
                mock_acronym_exists.return_value = False

                with patch("src.app.api.v1.faculties.crud_faculties") as mock_crud:
                    mock_crud.create = AsyncMock(return_value=mock_created_faculty)
                    mock_crud.get = AsyncMock(return_value=mock_faculty_read)

                    result = await create_faculty(Mock(), faculty_data, mock_db, current_admin_user_dict)

                    assert result == mock_faculty_read
                    mock_crud.create.assert_called_once()
                    mock_crud.get.assert_called_once()

    @pytest.mark.asyncio
    async def test_create_faculty_duplicate_name(self, mock_db, current_admin_user_dict):
        """Test faculty creation with duplicate name."""
        faculty_data = FacultyCreate(name="Facultad Existente", acronym="FE", is_active=True)

        with patch("src.app.api.v1.faculties.faculty_exists") as mock_exists:
            mock_exists.return_value = True

            with pytest.raises(DuplicateValueException, match="Ya existe una facultad con el nombre"):
                await create_faculty(Mock(), faculty_data, mock_db, current_admin_user_dict)

    @pytest.mark.asyncio
    async def test_create_faculty_duplicate_acronym(self, mock_db, current_admin_user_dict):
        """Test faculty creation with duplicate acronym."""
        faculty_data = FacultyCreate(name="Nueva Facultad", acronym="FI", is_active=True)

        with patch("src.app.api.v1.faculties.faculty_exists") as mock_exists:
            mock_exists.return_value = False

            with patch("src.app.api.v1.faculties.faculty_acronym_exists") as mock_acronym_exists:
                mock_acronym_exists.return_value = True

                with pytest.raises(DuplicateValueException, match="Ya existe una facultad con el acrónimo"):
                    await create_faculty(Mock(), faculty_data, mock_db, current_admin_user_dict)


class TestListFaculties:
    """Test faculties list endpoint."""

    @pytest.mark.asyncio
    async def test_list_faculties_success(self, mock_db, current_user_dict):
        """Test successful faculties list retrieval."""
        mock_faculties_data = {"data": [{"id": 1}, {"id": 2}], "total_count": 2}

        with patch("src.app.api.v1.faculties.get_non_deleted_faculties") as mock_get_faculties:
            mock_get_faculties.return_value = mock_faculties_data

            with patch("src.app.api.v1.faculties.paginated_response") as mock_paginated:
                expected_response = {"data": [{"id": 1}, {"id": 2}], "total_count": 2, "page": 1, "items_per_page": 10}
                mock_paginated.return_value = expected_response

                result = await list_faculties(Mock(), mock_db, current_user_dict, page=1, items_per_page=10)

                assert result == expected_response
                mock_get_faculties.assert_called_once()
                mock_paginated.assert_called_once()


class TestGetFaculty:
    """Test get faculty by ID endpoint."""

    @pytest.mark.asyncio
    async def test_get_faculty_success(self, mock_db, current_user_dict):
        """Test successful faculty retrieval."""
        faculty_id = 1
        mock_faculty = {
            "id": 1,
            "name": "Facultad de Ingeniería",
            "acronym": "FI",
            "is_active": True,
        }

        with patch("src.app.api.v1.faculties.get_faculty_by_uuid") as mock_get:
            mock_get.return_value = mock_faculty

            result = await get_faculty(Mock(), faculty_id, mock_db, current_user_dict)

            assert result == mock_faculty
            mock_get.assert_called_once_with(db=mock_db, faculty_id=faculty_id)

    @pytest.mark.asyncio
    async def test_get_faculty_not_found(self, mock_db, current_user_dict):
        """Test faculty retrieval when faculty doesn't exist."""
        faculty_id = 999

        with patch("src.app.api.v1.faculties.get_faculty_by_uuid") as mock_get:
            mock_get.return_value = None

            with pytest.raises(NotFoundException, match="No se encontró la facultad"):
                await get_faculty(Mock(), faculty_id, mock_db, current_user_dict)


class TestUpdateFaculty:
    """Test faculty update endpoint."""

    @pytest.mark.asyncio
    async def test_update_faculty_success(self, mock_db, current_admin_user_dict):
        """Test successful faculty update."""
        faculty_id = 1
        update_data = FacultyUpdate(name="Nuevo Nombre")

        mock_existing_faculty = {
            "id": 1,
            "name": "Nombre Anterior",
            "acronym": "FI",
        }

        mock_updated_faculty = {
            "id": 1,
            "name": "Nuevo Nombre",
            "acronym": "FI",
        }

        with patch("src.app.api.v1.faculties.get_faculty_by_uuid") as mock_get:
            mock_get.side_effect = [mock_existing_faculty, mock_updated_faculty]

            with patch("src.app.api.v1.faculties.faculty_exists") as mock_exists:
                mock_exists.return_value = False

                with patch("src.app.api.v1.faculties.crud_faculties") as mock_crud:
                    mock_crud.update = AsyncMock()

                    result = await update_faculty(Mock(), faculty_id, update_data, mock_db, current_admin_user_dict)

                    assert result == mock_updated_faculty
                    mock_crud.update.assert_called_once()

    @pytest.mark.asyncio
    async def test_update_faculty_not_found(self, mock_db, current_admin_user_dict):
        """Test faculty update when faculty doesn't exist."""
        faculty_id = 999
        update_data = FacultyUpdate(name="Nuevo Nombre")

        with patch("src.app.api.v1.faculties.get_faculty_by_uuid") as mock_get:
            mock_get.return_value = None

            with pytest.raises(NotFoundException, match="No se encontró la facultad"):
                await update_faculty(Mock(), faculty_id, update_data, mock_db, current_admin_user_dict)


class TestDeleteFaculty:
    """Test faculty deletion endpoint."""

    @pytest.mark.asyncio
    async def test_delete_faculty_success(self, mock_db, current_admin_user_dict):
        """Test successful faculty deletion."""
        faculty_id = 1
        mock_faculty = {
            "id": 1,
            "name": "Facultad de Ingeniería",
            "acronym": "FI",
        }

        with patch("src.app.api.v1.faculties.get_faculty_by_uuid") as mock_get:
            mock_get.return_value = mock_faculty

            with patch("src.app.api.v1.faculties.crud_faculties") as mock_crud:
                mock_crud.delete = AsyncMock()

                result = await delete_faculty(Mock(), faculty_id, mock_db, current_admin_user_dict)

                assert result is None
                mock_crud.delete.assert_called_once_with(db=mock_db, id=faculty_id)


class TestSoftDeleteFaculty:
    """Test faculty soft delete endpoint."""

    @pytest.mark.asyncio
    async def test_soft_delete_faculty_success(self, mock_db, current_admin_user_dict):
        """Test successful faculty soft delete."""
        faculty_id = 1
        mock_faculty = {
            "id": 1,
            "name": "Facultad de Ingeniería",
            "acronym": "FI",
        }

        with patch("src.app.api.v1.faculties.get_faculty_by_uuid") as mock_get:
            mock_get.side_effect = [mock_faculty, mock_faculty]

            with patch("src.app.api.v1.faculties.soft_delete_faculty") as mock_soft_delete:
                mock_soft_delete.return_value = True

                with patch("src.app.api.v1.faculties.create_recycle_bin_entry") as mock_recycle:
                    mock_recycle.return_value = None

                    result = await soft_delete_faculty_endpoint(Mock(), faculty_id, mock_db, current_admin_user_dict)

                    assert result == mock_faculty
                    mock_soft_delete.assert_called_once()
                    mock_recycle.assert_called_once()


class TestRestoreFaculty:
    """Test faculty restore endpoint."""

    @pytest.mark.asyncio
    async def test_restore_faculty_success(self, mock_db, current_admin_user_dict):
        """Test successful faculty restore."""
        faculty_id = 1
        mock_faculty = {
            "id": 1,
            "name": "Facultad de Ingeniería",
            "acronym": "FI",
            "deleted": True,
        }

        with patch("src.app.api.v1.faculties.get_faculty_by_uuid") as mock_get:
            mock_get.side_effect = [mock_faculty, mock_faculty]

            with patch("src.app.api.v1.faculties.restore_faculty") as mock_restore:
                mock_restore.return_value = True

                with patch("src.app.api.v1.faculties.find_recycle_bin_entry") as mock_find:
                    mock_find.return_value = {"id": 1}

                    with patch("src.app.api.v1.faculties.mark_as_restored") as mock_mark:
                        mock_mark.return_value = None

                        result = await restore_faculty_endpoint(Mock(), faculty_id, mock_db, current_admin_user_dict)

                        assert result == mock_faculty
                        mock_restore.assert_called_once()
                        mock_mark.assert_called_once()
