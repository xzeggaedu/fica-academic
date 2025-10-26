from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from ..models.template_generation import TemplateGeneration
from ..schemas.template_generation import TemplateGenerationCreate, TemplateGenerationUpdate


class TemplateGenerationCRUD:
    async def create(
        self,
        db: AsyncSession,
        obj_in: TemplateGenerationCreate,
        user_id: str,
        original_filename: str,
        original_file_path: str,
        generated_file_path: str,
        generation_status: str = "pending",
    ) -> TemplateGeneration:
        """Crear un nuevo registro de generación de plantilla."""
        db_obj = TemplateGeneration(
            user_id=user_id,
            faculty_id=obj_in.faculty_id,
            school_id=obj_in.school_id,
            original_filename=original_filename,
            original_file_path=original_file_path,
            generated_file_path=generated_file_path,
            notes=obj_in.notes,
            generation_status=generation_status,
        )
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def get(self, db: AsyncSession, id: int) -> TemplateGeneration | None:
        """Obtener un registro por ID."""
        result = await db.execute(
            select(TemplateGeneration)
            .options(
                joinedload(TemplateGeneration.user),
                joinedload(TemplateGeneration.faculty),
                joinedload(TemplateGeneration.school),
            )
            .filter(TemplateGeneration.id == id)
        )
        return result.scalar_one_or_none()

    async def get_multi(self, db: AsyncSession, *, skip: int = 0, limit: int = 100) -> list[TemplateGeneration]:
        """Obtener múltiples registros con paginación."""
        result = await db.execute(
            select(TemplateGeneration)
            .options(
                joinedload(TemplateGeneration.user),
                joinedload(TemplateGeneration.faculty),
                joinedload(TemplateGeneration.school),
            )
            .order_by(desc(TemplateGeneration.upload_date))
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()

    async def get_by_user(
        self, db: AsyncSession, user_id: str, *, skip: int = 0, limit: int = 100
    ) -> list[TemplateGeneration]:
        """Obtener registros por usuario."""
        result = await db.execute(
            select(TemplateGeneration)
            .filter(TemplateGeneration.user_id == user_id)
            .options(joinedload(TemplateGeneration.faculty), joinedload(TemplateGeneration.school))
            .order_by(desc(TemplateGeneration.upload_date))
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()

    async def update(
        self, db: AsyncSession, *, db_obj: TemplateGeneration, obj_in: TemplateGenerationUpdate
    ) -> TemplateGeneration:
        """Actualizar un registro existente."""
        update_data = obj_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_obj, field, value)
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def delete(self, db: AsyncSession, *, id: int) -> TemplateGeneration | None:
        """Eliminar un registro."""
        obj = await self.get(db, id)
        if obj:
            await db.delete(obj)
            await db.commit()
        return obj


template_generation = TemplateGenerationCRUD()
