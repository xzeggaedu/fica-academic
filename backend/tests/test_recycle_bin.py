"""Unit tests for recycle bin API endpoints."""

from unittest.mock import Mock, patch

import pytest

from src.app.api.v1.recycle_bin import (
    get_recycle_bin_item,
    list_recycle_bin,
    mark_as_permanently_deleted,
    restore_from_recycle_bin,
)
from src.app.core.exceptions.http_exceptions import NotFoundException
from src.app.schemas.recycle_bin import RecycleBinRestore


class TestListRecycleBin:
    """Test recycle bin list endpoint."""

    @pytest.mark.asyncio
    async def test_list_recycle_bin_all(self, mock_db, current_admin_user_dict):
        """Test listing all deleted items."""
        mock_items_data = {"data": [{"id": 1}, {"id": 2}], "total_count": 2}

        with patch("src.app.api.v1.recycle_bin.get_all_deleted_items") as mock_get_items:
            mock_get_items.return_value = mock_items_data

            with patch("src.app.api.v1.recycle_bin.paginated_response") as mock_paginated:
                expected_response = {"data": [{"id": 1}, {"id": 2}], "total_count": 2}
                mock_paginated.return_value = expected_response

                result = await list_recycle_bin(Mock(), mock_db, current_admin_user_dict, page=1, items_per_page=10)

                assert result == expected_response
                mock_get_items.assert_called_once()

    @pytest.mark.asyncio
    async def test_list_recycle_bin_by_type(self, mock_db, current_admin_user_dict):
        """Test listing deleted items filtered by type."""
        mock_items_data = {"data": [{"id": 1, "entity_type": "user"}], "total_count": 1}

        with patch("src.app.api.v1.recycle_bin.get_deleted_items_by_type") as mock_get_by_type:
            mock_get_by_type.return_value = mock_items_data

            with patch("src.app.api.v1.recycle_bin.paginated_response") as mock_paginated:
                expected_response = {"data": [{"id": 1}], "total_count": 1}
                mock_paginated.return_value = expected_response

                result = await list_recycle_bin(
                    Mock(), mock_db, current_admin_user_dict, page=1, items_per_page=10, entity_type="user"
                )

                assert result == expected_response
                mock_get_by_type.assert_called_once()


class TestGetRecycleBinItem:
    """Test get recycle bin item by ID."""

    @pytest.mark.asyncio
    async def test_get_recycle_bin_item_success(self, mock_db, current_admin_user_dict):
        """Test successful recycle bin item retrieval."""
        item_id = 1
        mock_item = {
            "id": 1,
            "entity_type": "user",
            "entity_id": "test-uuid",
            "entity_display_name": "Test User",
            "can_restore": True,
        }

        with patch("src.app.api.v1.recycle_bin.get_recycle_bin_by_id") as mock_get:
            mock_get.return_value = mock_item

            result = await get_recycle_bin_item(Mock(), item_id, mock_db, current_admin_user_dict)

            assert result == mock_item
            mock_get.assert_called_once_with(db=mock_db, recycle_bin_id=item_id)

    @pytest.mark.asyncio
    async def test_get_recycle_bin_item_not_found(self, mock_db, current_admin_user_dict):
        """Test recycle bin item retrieval when item doesn't exist."""
        item_id = 999

        with patch("src.app.api.v1.recycle_bin.get_recycle_bin_by_id") as mock_get:
            mock_get.return_value = None

            with pytest.raises(NotFoundException, match="No se encontró el elemento"):
                await get_recycle_bin_item(Mock(), item_id, mock_db, current_admin_user_dict)


class TestRestoreFromRecycleBin:
    """Test restore from recycle bin endpoint."""

    @pytest.mark.asyncio
    async def test_restore_user_from_recycle_bin(self, mock_db, current_admin_user_dict):
        """Test restoring a user from recycle bin."""
        item_id = 1
        mock_item = {
            "id": 1,
            "entity_type": "user",
            "entity_id": "123e4567-e89b-12d3-a456-426614174000",
            "entity_display_name": "Test User",
            "can_restore": True,
        }

        restore_data = RecycleBinRestore(
            restored_by_id=current_admin_user_dict["user_uuid"], restored_by_name=current_admin_user_dict["name"]
        )

        with patch("src.app.api.v1.recycle_bin.get_recycle_bin_by_id") as mock_get:
            mock_get.side_effect = [mock_item, mock_item]

            # Mock the dynamically imported restore_user function
            with patch("src.app.crud.crud_users.restore_user") as mock_restore:
                mock_restore.return_value = True

                with patch("src.app.api.v1.recycle_bin.mark_as_restored") as mock_mark:
                    mock_mark.return_value = True

                    result = await restore_from_recycle_bin(
                        Mock(), item_id, restore_data, mock_db, current_admin_user_dict
                    )

                    assert result == mock_item
                    mock_restore.assert_called_once()
                    mock_mark.assert_called_once()

    @pytest.mark.asyncio
    async def test_restore_faculty_from_recycle_bin(self, mock_db, current_admin_user_dict):
        """Test restoring a faculty from recycle bin."""
        item_id = 1
        mock_item = {
            "id": 1,
            "entity_type": "faculty",
            "entity_id": "5",
            "entity_display_name": "Facultad de Ingeniería",
            "can_restore": True,
        }

        restore_data = RecycleBinRestore(
            restored_by_id=current_admin_user_dict["user_uuid"], restored_by_name=current_admin_user_dict["name"]
        )

        with patch("src.app.api.v1.recycle_bin.get_recycle_bin_by_id") as mock_get:
            mock_get.side_effect = [mock_item, mock_item]

            # Mock the dynamically imported restore_faculty function
            with patch("src.app.crud.crud_faculties.restore_faculty") as mock_restore:
                mock_restore.return_value = True

                with patch("src.app.api.v1.recycle_bin.mark_as_restored") as mock_mark:
                    mock_mark.return_value = True

                    result = await restore_from_recycle_bin(
                        Mock(), item_id, restore_data, mock_db, current_admin_user_dict
                    )

                    assert result == mock_item
                    mock_restore.assert_called_once()

    @pytest.mark.asyncio
    async def test_restore_cannot_restore(self, mock_db, current_admin_user_dict):
        """Test restoring an item that cannot be restored."""
        item_id = 1
        mock_item = {
            "id": 1,
            "entity_type": "user",
            "entity_id": "test-uuid",
            "can_restore": False,  # Cannot be restored
        }

        restore_data = RecycleBinRestore(
            restored_by_id=current_admin_user_dict["user_uuid"], restored_by_name=current_admin_user_dict["name"]
        )

        with patch("src.app.api.v1.recycle_bin.get_recycle_bin_by_id") as mock_get:
            mock_get.return_value = mock_item

            with pytest.raises(NotFoundException, match="no puede ser restaurado"):
                await restore_from_recycle_bin(Mock(), item_id, restore_data, mock_db, current_admin_user_dict)


class TestPermanentDelete:
    """Test permanent deletion from recycle bin."""

    @pytest.mark.asyncio
    async def test_permanent_delete_user(self, mock_db, current_admin_user_dict):
        """Test permanently deleting a user from recycle bin."""
        item_id = 1
        mock_item = {
            "id": 1,
            "entity_type": "user",
            "entity_id": "123e4567-e89b-12d3-a456-426614174000",
            "entity_display_name": "Test User",
        }

        with patch("src.app.api.v1.recycle_bin.get_recycle_bin_by_id") as mock_get:
            mock_get.side_effect = [mock_item, mock_item]

            # Mock the dynamically imported hard_delete_user function
            with patch("src.app.crud.crud_users.hard_delete_user") as mock_hard_delete:
                mock_hard_delete.return_value = None

                with patch("src.app.crud.crud_recycle_bin.update_can_restore") as mock_update:
                    mock_update.return_value = None

                    result = await mark_as_permanently_deleted(Mock(), item_id, mock_db, current_admin_user_dict)

                    assert result == mock_item
                    mock_hard_delete.assert_called_once()
                    mock_update.assert_called_once()

    @pytest.mark.asyncio
    async def test_permanent_delete_faculty(self, mock_db, current_admin_user_dict):
        """Test permanently deleting a faculty from recycle bin."""
        item_id = 1
        mock_item = {
            "id": 1,
            "entity_type": "faculty",
            "entity_id": "5",
            "entity_display_name": "Facultad de Ingeniería",
        }

        with patch("src.app.api.v1.recycle_bin.get_recycle_bin_by_id") as mock_get:
            mock_get.side_effect = [mock_item, mock_item]

            # Mock the dynamically imported hard_delete_faculty function
            with patch("src.app.crud.crud_faculties.hard_delete_faculty") as mock_hard_delete:
                mock_hard_delete.return_value = None

                with patch("src.app.crud.crud_recycle_bin.update_can_restore") as mock_update:
                    mock_update.return_value = None

                    result = await mark_as_permanently_deleted(Mock(), item_id, mock_db, current_admin_user_dict)

                    assert result == mock_item
                    mock_hard_delete.assert_called_once()

    @pytest.mark.asyncio
    async def test_permanent_delete_not_found(self, mock_db, current_admin_user_dict):
        """Test permanent deletion when item doesn't exist."""
        item_id = 999

        with patch("src.app.api.v1.recycle_bin.get_recycle_bin_by_id") as mock_get:
            mock_get.return_value = None

            with pytest.raises(NotFoundException, match="No se encontró el elemento"):
                await mark_as_permanently_deleted(Mock(), item_id, mock_db, current_admin_user_dict)
