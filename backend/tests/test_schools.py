"""Unit tests for schools API endpoints."""

from unittest.mock import AsyncMock, Mock, patch

import pytest

from src.app.api.v1.schools import (
    create_school,
    delete_school,
    get_school,
    list_schools,
    update_school,
)
from src.app.core.exceptions.http_exceptions import DuplicateValueException, NotFoundException
from src.app.schemas.school import SchoolCreate, SchoolUpdate


class TestCreateSchool:
    """Test school creation endpoint."""

    @pytest.mark.asyncio
    async def test_create_school_success(self, mock_db, current_admin_user_dict):
        """Test successful school creation."""
        school_data = SchoolCreate(name="Escuela de Sistemas", acronym="ESI", fk_faculty=1, is_active=True)

        mock_created_school = Mock(id=1)
        mock_school_read = {
            "id": 1,
            "name": "Escuela de Sistemas",
            "acronym": "ESI",
            "fk_faculty": 1,
            "is_active": True,
        }

        mock_faculty = {"id": 1, "name": "Facultad de Ingeniería"}

        with patch("src.app.api.v1.schools.get_faculty_by_uuid") as mock_get_faculty:
            mock_get_faculty.return_value = mock_faculty

            with patch("src.app.api.v1.schools.school_exists") as mock_exists:
                mock_exists.return_value = False

                with patch("src.app.api.v1.schools.school_acronym_exists") as mock_acronym_exists:
                    mock_acronym_exists.return_value = False

                    with patch("src.app.api.v1.schools.crud_schools") as mock_crud:
                        mock_crud.create = AsyncMock(return_value=mock_created_school)
                        mock_crud.get = AsyncMock(return_value=mock_school_read)

                        result = await create_school(Mock(), school_data, mock_db, current_admin_user_dict)

                        assert result == mock_school_read
                        mock_crud.create.assert_called_once()

    @pytest.mark.asyncio
    async def test_create_school_faculty_not_found(self, mock_db, current_admin_user_dict):
        """Test school creation when faculty doesn't exist."""
        school_data = SchoolCreate(name="Escuela de Sistemas", acronym="ESI", fk_faculty=999, is_active=True)

        with patch("src.app.api.v1.schools.get_faculty_by_uuid") as mock_get_faculty:
            mock_get_faculty.return_value = None

            with pytest.raises(NotFoundException, match="No se encontró la facultad"):
                await create_school(Mock(), school_data, mock_db, current_admin_user_dict)

    @pytest.mark.asyncio
    async def test_create_school_duplicate_name(self, mock_db, current_admin_user_dict):
        """Test school creation with duplicate name in same faculty."""
        school_data = SchoolCreate(name="Escuela Existente", acronym="EE", fk_faculty=1, is_active=True)

        mock_faculty = {"id": 1, "name": "Facultad de Ingeniería"}

        with patch("src.app.api.v1.schools.get_faculty_by_uuid") as mock_get_faculty:
            mock_get_faculty.return_value = mock_faculty

            with patch("src.app.api.v1.schools.school_exists") as mock_exists:
                mock_exists.return_value = True

                with pytest.raises(DuplicateValueException, match="Ya existe una escuela con el nombre"):
                    await create_school(Mock(), school_data, mock_db, current_admin_user_dict)


class TestListSchools:
    """Test schools list endpoint."""

    @pytest.mark.asyncio
    async def test_list_schools_success(self, mock_db, current_user_dict):
        """Test successful schools list retrieval."""
        mock_schools_data = {"data": [{"id": 1}, {"id": 2}], "total_count": 2}

        with patch("src.app.api.v1.schools.crud_schools") as mock_crud:
            mock_crud.get_multi = AsyncMock(return_value=mock_schools_data)

            with patch("src.app.api.v1.schools.paginated_response") as mock_paginated:
                expected_response = {"data": [{"id": 1}, {"id": 2}], "total_count": 2, "page": 1, "items_per_page": 10}
                mock_paginated.return_value = expected_response

                result = await list_schools(Mock(), mock_db, current_user_dict, page=1, items_per_page=10)

                assert result == expected_response
                mock_crud.get_multi.assert_called_once()
                mock_paginated.assert_called_once()

    @pytest.mark.asyncio
    async def test_list_schools_with_faculty_filter(self, mock_db, current_user_dict):
        """Test schools list with faculty filter."""
        mock_schools_data = {"data": [{"id": 1, "fk_faculty": 1}], "total_count": 1}

        with patch("src.app.api.v1.schools.crud_schools") as mock_crud:
            mock_crud.get_multi = AsyncMock(return_value=mock_schools_data)

            with patch("src.app.api.v1.schools.paginated_response") as mock_paginated:
                expected_response = {"data": [{"id": 1}], "total_count": 1}
                mock_paginated.return_value = expected_response

                result = await list_schools(Mock(), mock_db, current_user_dict, page=1, items_per_page=10, faculty_id=1)

                assert result == expected_response
                # Verificar que se pasó el filtro de faculty
                call_kwargs = mock_crud.get_multi.call_args[1]
                assert call_kwargs.get("fk_faculty") == 1


class TestGetSchool:
    """Test get school by ID endpoint."""

    @pytest.mark.asyncio
    async def test_get_school_success(self, mock_db, current_user_dict):
        """Test successful school retrieval."""
        school_id = 1
        mock_school = {
            "id": 1,
            "name": "Escuela de Sistemas",
            "acronym": "ESI",
            "fk_faculty": 1,
        }

        with patch("src.app.api.v1.schools.get_school_by_uuid") as mock_get:
            mock_get.return_value = mock_school

            result = await get_school(Mock(), school_id, mock_db, current_user_dict)

            assert result == mock_school
            mock_get.assert_called_once_with(db=mock_db, school_id=school_id)

    @pytest.mark.asyncio
    async def test_get_school_not_found(self, mock_db, current_user_dict):
        """Test school retrieval when school doesn't exist."""
        school_id = 999

        with patch("src.app.api.v1.schools.get_school_by_uuid") as mock_get:
            mock_get.return_value = None

            with pytest.raises(NotFoundException, match="No se encontró la escuela"):
                await get_school(Mock(), school_id, mock_db, current_user_dict)


class TestUpdateSchool:
    """Test school update endpoint."""

    @pytest.mark.asyncio
    async def test_update_school_success(self, mock_db, current_admin_user_dict):
        """Test successful school update."""
        school_id = 1
        update_data = SchoolUpdate(name="Nuevo Nombre")

        mock_existing_school = {
            "id": 1,
            "name": "Nombre Anterior",
            "acronym": "ESI",
            "fk_faculty": 1,
        }

        mock_updated_school = {
            "id": 1,
            "name": "Nuevo Nombre",
            "acronym": "ESI",
            "fk_faculty": 1,
        }

        with patch("src.app.api.v1.schools.get_school_by_uuid") as mock_get:
            mock_get.side_effect = [mock_existing_school, mock_updated_school]

            with patch("src.app.api.v1.schools.school_exists") as mock_exists:
                mock_exists.return_value = False

                with patch("src.app.api.v1.schools.crud_schools") as mock_crud:
                    mock_crud.update = AsyncMock()

                    result = await update_school(Mock(), school_id, update_data, mock_db, current_admin_user_dict)

                    assert result == mock_updated_school
                    mock_crud.update.assert_called_once()


class TestDeleteSchool:
    """Test school deletion endpoint."""

    @pytest.mark.asyncio
    async def test_delete_school_success(self, mock_db, current_admin_user_dict):
        """Test successful school deletion."""
        school_id = 1
        mock_school = {
            "id": 1,
            "name": "Escuela de Sistemas",
            "acronym": "ESI",
        }

        with patch("src.app.api.v1.schools.get_school_by_uuid") as mock_get:
            mock_get.return_value = mock_school

            with patch("src.app.api.v1.schools.crud_schools") as mock_crud:
                mock_crud.delete = AsyncMock()

                result = await delete_school(Mock(), school_id, mock_db, current_admin_user_dict)

                assert result is None
                mock_crud.delete.assert_called_once_with(db=mock_db, id=school_id)

    @pytest.mark.asyncio
    async def test_delete_school_not_found(self, mock_db, current_admin_user_dict):
        """Test school deletion when school doesn't exist."""
        school_id = 999

        with patch("src.app.api.v1.schools.get_school_by_uuid") as mock_get:
            mock_get.return_value = None

            with pytest.raises(NotFoundException, match="No se encontró la escuela"):
                await delete_school(Mock(), school_id, mock_db, current_admin_user_dict)
