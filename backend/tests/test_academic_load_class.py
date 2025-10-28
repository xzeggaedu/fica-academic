"""Tests for Academic Load Class CRUD operations."""

from unittest.mock import AsyncMock, Mock

import pytest

from src.app.crud.academic_load_class import AcademicLoadClassCRUD
from src.app.schemas.academic_load_class import AcademicLoadClassCreate, AcademicLoadClassUpdate


class TestAcademicLoadClassCRUD:
    """Test cases for Academic Load Class CRUD operations."""

    @pytest.mark.asyncio
    async def test_create_academic_load_class(self, db_session):
        """Test successful creation of an academic load class record."""
        crud = AcademicLoadClassCRUD()

        # Mock database operations
        db_session.add = Mock()
        db_session.commit = AsyncMock()
        db_session.refresh = AsyncMock(side_effect=lambda obj: setattr(obj, "id", 1))

        # Create academic load class data
        obj_in = AcademicLoadClassCreate(
            academic_load_file_id=1,
            subject_id=1,
            coordination_id=1,
            professor_id=1,
            subject_name="Test Subject",
            subject_code="TEST001",
            section="01",
            schedule="08:00-10:00",
            duration=2,
            days="L, M, W",
            modality="Presencial",
            professor_category="DHC",
            professor_academic_title="Dr.",
            professor_is_bilingual=False,
            professor_doctorates=0,
            professor_masters=0,
        )

        await crud.create(db=db_session, obj_in=obj_in)

        # Verify database operations were called
        assert db_session.add.called
        assert db_session.commit.called
        assert db_session.refresh.called

    @pytest.mark.asyncio
    async def test_get_academic_load_class(self, db_session):
        """Test getting an academic load class by ID."""
        crud = AcademicLoadClassCRUD()

        # Mock class object
        mock_class = Mock()
        mock_class.id = 1

        mock_result = Mock()
        mock_result.scalar_one_or_none.return_value = mock_class

        db_session.execute = AsyncMock(return_value=mock_result)

        result = await crud.get(db=db_session, id=1)

        assert result is not None
        assert db_session.execute.called

    @pytest.mark.asyncio
    async def test_get_academic_load_class_not_found(self, db_session):
        """Test getting a non-existent academic load class."""
        crud = AcademicLoadClassCRUD()

        mock_result = Mock()
        mock_result.scalar_one_or_none.return_value = None

        db_session.execute = AsyncMock(return_value=mock_result)

        result = await crud.get(db=db_session, id=999)

        assert result is None

    @pytest.mark.asyncio
    async def test_get_multi_academic_load_classes(self, db_session):
        """Test getting multiple academic load classes with pagination."""
        crud = AcademicLoadClassCRUD()

        # Mock multiple classes
        mock_classes = [Mock(), Mock(), Mock()]
        mock_result = Mock()
        mock_result.scalars.return_value.all.return_value = mock_classes

        db_session.execute = AsyncMock(return_value=mock_result)

        await crud.get_multi(db=db_session, skip=0, limit=10)

        assert db_session.execute.called

    @pytest.mark.asyncio
    async def test_get_by_file_id(self, db_session):
        """Test getting classes by file ID."""
        crud = AcademicLoadClassCRUD()

        # Mock multiple classes
        mock_classes = [Mock(), Mock()]
        mock_result = Mock()
        mock_result.scalars.return_value.all.return_value = mock_classes

        db_session.execute = AsyncMock(return_value=mock_result)

        await crud.get_by_file_id(db=db_session, file_id=1)

        assert db_session.execute.called

    @pytest.mark.asyncio
    async def test_update_academic_load_class(self, db_session):
        """Test updating an academic load class."""
        crud = AcademicLoadClassCRUD()

        # Mock existing class
        mock_class = Mock()
        mock_class.id = 1
        mock_class.section = "01"

        mock_result = Mock()
        mock_result.scalar_one_or_none.return_value = mock_class

        db_session.execute = AsyncMock(return_value=mock_result)
        db_session.add = Mock()
        db_session.commit = AsyncMock()
        db_session.refresh = AsyncMock()

        obj_in = AcademicLoadClassUpdate(section="02")

        await crud.update(db=db_session, db_obj=mock_class, obj_in=obj_in)

        assert db_session.add.called
        assert db_session.commit.called
        assert db_session.refresh.called

    @pytest.mark.asyncio
    async def test_delete_academic_load_class(self, db_session):
        """Test deleting an academic load class."""
        crud = AcademicLoadClassCRUD()

        # Mock class to delete
        mock_class = Mock()
        mock_class.id = 1

        mock_result = Mock()
        mock_result.scalar_one_or_none.return_value = mock_class

        db_session.execute = AsyncMock(return_value=mock_result)
        db_session.delete = AsyncMock()
        db_session.commit = AsyncMock()

        result = await crud.delete(db=db_session, id=1)

        assert result is not None
        assert db_session.delete.called
        assert db_session.commit.called
