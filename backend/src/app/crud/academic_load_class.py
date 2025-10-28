"""CRUD operations para AcademicLoadClass."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.academic_load_class import AcademicLoadClass
from ..schemas.academic_load_class import AcademicLoadClassCreate, AcademicLoadClassUpdate


class AcademicLoadClassCRUD:
    async def create(self, db: AsyncSession, obj_in: AcademicLoadClassCreate) -> AcademicLoadClass:
        """Crear un nuevo registro de clase."""
        db_obj = AcademicLoadClass(**obj_in.model_dump())
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def get(self, db: AsyncSession, id: int) -> AcademicLoadClass | None:
        """Obtener un registro por ID."""
        result = await db.execute(select(AcademicLoadClass).filter(AcademicLoadClass.id == id))
        return result.scalar_one_or_none()

    async def get_multi(self, db: AsyncSession, *, skip: int = 0, limit: int = 100) -> list[AcademicLoadClass]:
        """Obtener múltiples registros con paginación."""
        result = await db.execute(select(AcademicLoadClass).offset(skip).limit(limit))
        return result.scalars().all()

    async def get_by_file_id(
        self, db: AsyncSession, file_id: int, *, skip: int = 0, limit: int = 100
    ) -> list[AcademicLoadClass]:
        """Obtener todas las clases de un archivo específico."""
        result = await db.execute(
            select(AcademicLoadClass)
            .filter(AcademicLoadClass.academic_load_file_id == file_id)
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()

    async def update(
        self, db: AsyncSession, *, db_obj: AcademicLoadClass, obj_in: AcademicLoadClassUpdate
    ) -> AcademicLoadClass:
        """Actualizar un registro existente."""
        update_data = obj_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_obj, field, value)
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def delete(self, db: AsyncSession, *, id: int) -> AcademicLoadClass | None:
        """Eliminar un registro."""
        obj = await self.get(db, id)
        if obj:
            await db.delete(obj)
            await db.commit()
        return obj


academic_load_class = AcademicLoadClassCRUD()
