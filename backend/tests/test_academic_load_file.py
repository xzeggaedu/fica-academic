"""Tests for Academic Load File CRUD operations."""

from unittest.mock import AsyncMock, Mock

import pytest

from src.app.crud.academic_load_file import AcademicLoadFileCRUD
from src.app.schemas.academic_load_file import AcademicLoadFileCreate, AcademicLoadFileUpdate


class TestAcademicLoadFileCRUD:
    """Test cases for Academic Load File CRUD operations."""

    @pytest.mark.asyncio
    async def test_create_academic_load_file(self, db_session):
        """Test successful creation of an academic load file record."""
        crud = AcademicLoadFileCRUD()

        # Mock database operations
        db_session.add = Mock()
        db_session.commit = AsyncMock()
        db_session.refresh = AsyncMock(side_effect=lambda obj: setattr(obj, "id", 1))

        # Create academic load file data
        obj_in = AcademicLoadFileCreate(faculty_id=1, school_id=1, term_id=1)

        await crud.create(
            db=db_session,
            obj_in=obj_in,
            user_id="test-user-id",
            user_name="Test User",
            original_filename="test.xlsx",
            original_file_path="/path/to/original",
            ingestion_status="pending",
            version=1,
            is_active=True,
        )

        # Verify database operations were called
        assert db_session.add.called
        assert db_session.commit.called
        assert db_session.refresh.called

    @pytest.mark.asyncio
    async def test_get_academic_load_file(self, db_session):
        """Test getting an academic load file by ID."""
        crud = AcademicLoadFileCRUD()

        # Mock academic load file object
        mock_file = Mock()
        mock_file.id = 1
        mock_file.user_id = "test-user-id"

        mock_result = Mock()
        mock_result.scalar_one_or_none.return_value = mock_file

        db_session.execute = AsyncMock(return_value=mock_result)

        result = await crud.get(db=db_session, id=1)

        assert result is not None
        assert db_session.execute.called

    @pytest.mark.asyncio
    async def test_get_academic_load_file_not_found(self, db_session):
        """Test getting a non-existent academic load file."""
        crud = AcademicLoadFileCRUD()

        mock_result = Mock()
        mock_result.scalar_one_or_none.return_value = None

        db_session.execute = AsyncMock(return_value=mock_result)

        result = await crud.get(db=db_session, id=999)

        assert result is None

    @pytest.mark.asyncio
    async def test_get_multi_academic_load_files(self, db_session):
        """Test getting multiple academic load files with pagination."""
        crud = AcademicLoadFileCRUD()

        # Mock multiple files
        mock_files = [Mock(), Mock(), Mock()]
        mock_result = Mock()
        mock_result.scalars.return_value.all.return_value = mock_files

        db_session.execute = AsyncMock(return_value=mock_result)

        await crud.get_multi(db=db_session, skip=0, limit=10)

        assert db_session.execute.called

    @pytest.mark.asyncio
    async def test_update_academic_load_file(self, db_session):
        """Test updating an academic load file."""
        crud = AcademicLoadFileCRUD()

        # Mock existing file
        mock_file = Mock()
        mock_file.id = 1
        mock_file.ingestion_status = "pending"

        mock_result = Mock()
        mock_result.scalar_one_or_none.return_value = mock_file

        db_session.execute = AsyncMock(return_value=mock_result)
        db_session.add = Mock()
        db_session.commit = AsyncMock()
        db_session.refresh = AsyncMock()

        obj_in = AcademicLoadFileUpdate(ingestion_status="completed")

        await crud.update(db=db_session, db_obj=mock_file, obj_in=obj_in)

        assert db_session.add.called
        assert db_session.commit.called
        assert db_session.refresh.called

    @pytest.mark.asyncio
    async def test_delete_academic_load_file(self, db_session):
        """Test deleting an academic load file."""
        crud = AcademicLoadFileCRUD()

        # Mock file to delete
        mock_file = Mock()
        mock_file.id = 1

        mock_result = Mock()
        mock_result.scalar_one_or_none.return_value = mock_file

        db_session.execute = AsyncMock(return_value=mock_result)
        db_session.delete = AsyncMock()
        db_session.commit = AsyncMock()

        result = await crud.delete(db=db_session, id=1)

        assert result is not None
        assert db_session.delete.called
        assert db_session.commit.called

    @pytest.mark.asyncio
    async def test_get_latest_version(self, db_session):
        """Test getting the latest version of a document."""
        crud = AcademicLoadFileCRUD()

        # Mock latest version
        mock_file = Mock()
        mock_file.id = 1
        mock_file.version = 3
        mock_file.faculty_id = 1
        mock_file.school_id = 1
        mock_file.term_id = 1
        mock_file.is_active = True

        mock_result = Mock()
        mock_result.scalar_one_or_none.return_value = mock_file

        db_session.execute = AsyncMock(return_value=mock_result)

        result = await crud.get_latest_version(db=db_session, faculty_id=1, school_id=1, term_id=1)

        assert result is not None
        assert result.version == 3
        assert db_session.execute.called

    @pytest.mark.asyncio
    async def test_get_all_versions(self, db_session):
        """Test getting all versions of a document."""
        crud = AcademicLoadFileCRUD()

        # Mock multiple versions
        mock_files = [Mock(), Mock(), Mock()]
        for i, f in enumerate(mock_files):
            f.id = i + 1
            f.version = 3 - i
            f.is_active = i == 0

        mock_result = Mock()
        mock_result.scalars.return_value.all.return_value = mock_files

        db_session.execute = AsyncMock(return_value=mock_result)

        result = await crud.get_all_versions(db=db_session, faculty_id=1, school_id=1, term_id=1)

        assert len(result) == 3
        assert db_session.execute.called
