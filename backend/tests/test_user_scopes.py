"""Unit tests for user scopes API endpoints."""

from unittest.mock import AsyncMock, Mock, patch
from uuid import uuid4

import pytest

from src.app.api.v1.users import assign_user_scope, get_user_scope_assignments
from src.app.core.exceptions.http_exceptions import ForbiddenException, NotFoundException
from src.app.models.role import UserRoleEnum
from src.app.schemas.user_scope import UserScopeAssignment


class TestAssignUserScope:
    """Test user scope assignment endpoint."""

    @pytest.mark.asyncio
    async def test_assign_scope_to_decano(self, mock_db, current_admin_user_dict):
        """Test assigning faculty scope to a DECANO user."""
        from datetime import datetime

        user_uuid = uuid4()
        assignment = UserScopeAssignment(faculty_id=1, school_id=None)

        mock_user = {
            "uuid": user_uuid,
            "role": UserRoleEnum.DECANO,
        }

        mock_faculty = {"id": 1, "name": "Facultad de Ingeniería"}
        mock_scope = Mock(id=1, fk_user=user_uuid, fk_faculty=1, fk_school=None, assigned_at=datetime.now())

        with patch("src.app.api.v1.users.crud_users") as mock_crud:
            mock_crud.get = AsyncMock(return_value=mock_user)

            with patch("src.app.api.v1.users.delete_user_scopes") as mock_delete_scopes:
                mock_delete_scopes.return_value = None

                with patch("src.app.api.v1.users.get_faculty_by_uuid") as mock_get_faculty:
                    mock_get_faculty.return_value = mock_faculty

                    with patch("src.app.api.v1.users.create_faculty_scope") as mock_create_scope:
                        mock_create_scope.return_value = mock_scope

                        result = await assign_user_scope(
                            Mock(), user_uuid, assignment, mock_db, current_admin_user_dict
                        )

                        assert len(result) == 1
                        assert result[0].fk_faculty == 1
                        mock_create_scope.assert_called_once()

    @pytest.mark.asyncio
    async def test_assign_scope_to_director(self, mock_db, current_admin_user_dict):
        """Test assigning school scope to a DIRECTOR user."""
        from datetime import datetime

        user_uuid = uuid4()
        assignment = UserScopeAssignment(faculty_id=1, school_id=1)

        mock_user = {
            "uuid": user_uuid,
            "role": UserRoleEnum.DIRECTOR,
        }

        mock_school = {"id": 1, "name": "Escuela de Sistemas", "fk_faculty": 1}
        mock_scope = Mock(id=1, fk_user=user_uuid, fk_faculty=1, fk_school=1, assigned_at=datetime.now())

        with patch("src.app.api.v1.users.crud_users") as mock_crud:
            mock_crud.get = AsyncMock(return_value=mock_user)

            with patch("src.app.api.v1.users.delete_user_scopes") as mock_delete_scopes:
                mock_delete_scopes.return_value = None

                with patch("src.app.api.v1.users.get_school_by_uuid") as mock_get_school:
                    mock_get_school.return_value = mock_school

                    with patch("src.app.api.v1.users.create_school_scope") as mock_create_scope:
                        mock_create_scope.return_value = mock_scope

                        result = await assign_user_scope(
                            Mock(), user_uuid, assignment, mock_db, current_admin_user_dict
                        )

                        assert len(result) == 1
                        assert result[0].fk_school == 1
                        mock_create_scope.assert_called_once()

    @pytest.mark.asyncio
    async def test_assign_scope_user_not_found(self, mock_db, current_admin_user_dict):
        """Test assigning scope when user doesn't exist."""
        user_uuid = uuid4()
        assignment = UserScopeAssignment(faculty_id=1, school_id=None)

        with patch("src.app.api.v1.users.crud_users") as mock_crud:
            mock_crud.get = AsyncMock(return_value=None)

            with pytest.raises(NotFoundException, match="User with uuid.*not found"):
                await assign_user_scope(Mock(), user_uuid, assignment, mock_db, current_admin_user_dict)

    @pytest.mark.asyncio
    async def test_assign_scope_invalid_role(self, mock_db, current_admin_user_dict):
        """Test assigning scope to user with invalid role (not DECANO or DIRECTOR)."""
        user_uuid = uuid4()
        assignment = UserScopeAssignment(faculty_id=1, school_id=None)

        mock_user = {
            "uuid": user_uuid,
            "role": UserRoleEnum.ADMIN,  # ADMIN doesn't support scope assignment
        }

        with patch("src.app.api.v1.users.crud_users") as mock_crud:
            mock_crud.get = AsyncMock(return_value=mock_user)

            with pytest.raises(ForbiddenException, match="does not support scope assignment"):
                await assign_user_scope(Mock(), user_uuid, assignment, mock_db, current_admin_user_dict)


class TestGetUserScopeAssignments:
    """Test get user scope assignments endpoint."""

    @pytest.mark.asyncio
    async def test_get_user_scopes_success(self, mock_db, current_admin_user_dict):
        """Test successful retrieval of user scopes."""
        user_uuid = uuid4()
        mock_user = {"uuid": user_uuid, "role": UserRoleEnum.DECANO}
        mock_scopes = [Mock(id=1, fk_user=user_uuid, fk_faculty=1, fk_school=None, assigned_at=Mock())]

        with patch("src.app.api.v1.users.crud_users") as mock_crud:
            mock_crud.get = AsyncMock(return_value=mock_user)

            with patch("src.app.api.v1.users.get_user_scopes") as mock_get_scopes:
                mock_get_scopes.return_value = mock_scopes

                result = await get_user_scope_assignments(Mock(), user_uuid, mock_db, current_admin_user_dict)

                assert len(result) == 1
                assert result[0]["fk_faculty"] == 1
                mock_get_scopes.assert_called_once_with(db=mock_db, user_uuid=user_uuid)

    @pytest.mark.asyncio
    async def test_get_user_scopes_user_not_found(self, mock_db, current_admin_user_dict):
        """Test getting scopes when user doesn't exist."""
        user_uuid = uuid4()

        with patch("src.app.api.v1.users.crud_users") as mock_crud:
            mock_crud.get = AsyncMock(return_value=None)

            with pytest.raises(NotFoundException, match="User with uuid.*not found"):
                await get_user_scope_assignments(Mock(), user_uuid, mock_db, current_admin_user_dict)
