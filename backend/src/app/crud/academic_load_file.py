from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from ..models.academic_load_file import AcademicLoadFile
from ..schemas.academic_load_file import AcademicLoadFileCreate, AcademicLoadFileUpdate


class AcademicLoadFileCRUD:
    async def create(
        self,
        db: AsyncSession,
        obj_in: AcademicLoadFileCreate,
        user_id: str,
        user_name: str,
        original_filename: str,
        original_file_path: str,
        ingestion_status: str = "pending",
        version: int = 1,
        is_active: bool = True,
    ) -> AcademicLoadFile:
        """Crear un nuevo registro de carga académica."""
        db_obj = AcademicLoadFile(
            user_id=user_id,
            user_name=user_name,
            faculty_id=obj_in.faculty_id,
            school_id=obj_in.school_id,
            term_id=obj_in.term_id,
            original_filename=original_filename,
            original_file_path=original_file_path,
            ingestion_status=ingestion_status,
            version=version,
            is_active=is_active,
        )
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def get(self, db: AsyncSession, id: int) -> AcademicLoadFile | None:
        """Obtener un registro por ID."""
        result = await db.execute(
            select(AcademicLoadFile)
            .options(
                joinedload(AcademicLoadFile.user),
                joinedload(AcademicLoadFile.faculty),
                joinedload(AcademicLoadFile.school),
                joinedload(AcademicLoadFile.term),
            )
            .filter(AcademicLoadFile.id == id)
        )
        return result.scalar_one_or_none()

    async def get_multi(self, db: AsyncSession, *, skip: int = 0, limit: int = 100) -> list[AcademicLoadFile]:
        """Obtener múltiples registros con paginación."""
        result = await db.execute(
            select(AcademicLoadFile)
            .options(
                joinedload(AcademicLoadFile.user),
                joinedload(AcademicLoadFile.faculty),
                joinedload(AcademicLoadFile.school),
                joinedload(AcademicLoadFile.term),
            )
            .order_by(desc(AcademicLoadFile.upload_date))
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()

    async def get_by_user(
        self, db: AsyncSession, user_id: str, *, skip: int = 0, limit: int = 100
    ) -> list[AcademicLoadFile]:
        """Obtener registros por usuario."""
        result = await db.execute(
            select(AcademicLoadFile)
            .filter(AcademicLoadFile.user_id == user_id)
            .options(
                joinedload(AcademicLoadFile.faculty),
                joinedload(AcademicLoadFile.school),
                joinedload(AcademicLoadFile.term),
            )
            .order_by(desc(AcademicLoadFile.upload_date))
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()

    async def update(
        self, db: AsyncSession, *, db_obj: AcademicLoadFile, obj_in: AcademicLoadFileUpdate
    ) -> AcademicLoadFile:
        """Actualizar un registro existente."""
        update_data = obj_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_obj, field, value)
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def delete(self, db: AsyncSession, *, id: int) -> AcademicLoadFile | None:
        """Eliminar un registro."""
        obj = await self.get(db, id)
        if obj:
            await db.delete(obj)
            await db.commit()
        return obj

    async def get_latest_version(
        self, db: AsyncSession, faculty_id: int, school_id: int, term_id: int
    ) -> AcademicLoadFile | None:
        """Obtener la última versión de un documento por contexto."""
        result = await db.execute(
            select(AcademicLoadFile)
            .filter(
                AcademicLoadFile.faculty_id == faculty_id,
                AcademicLoadFile.school_id == school_id,
                AcademicLoadFile.term_id == term_id,
            )
            .order_by(desc(AcademicLoadFile.version))
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def get_all_versions(
        self, db: AsyncSession, faculty_id: int, school_id: int, term_id: int
    ) -> list[AcademicLoadFile]:
        """Obtener todas las versiones de un documento."""
        result = await db.execute(
            select(AcademicLoadFile)
            .filter(
                AcademicLoadFile.faculty_id == faculty_id,
                AcademicLoadFile.school_id == school_id,
                AcademicLoadFile.term_id == term_id,
            )
            .order_by(desc(AcademicLoadFile.version))
        )
        return result.scalars().all()


academic_load_file = AcademicLoadFileCRUD()
