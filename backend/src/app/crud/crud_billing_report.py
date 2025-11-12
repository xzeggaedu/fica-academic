"""CRUD operations for BillingReport."""

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.billing_report import (
    BillingReport,
    BillingReportMonthlyItem,
    BillingReportPaymentSummary,
    BillingReportRateSnapshot,
)
from ..schemas.billing_report import BillingReportCreate, BillingReportUpdate


class BillingReportCRUD:
    async def create(
        self,
        db: AsyncSession,
        obj_in: BillingReportCreate,
        user_id: str,
        user_name: str,
    ) -> BillingReport:
        """Crear un nuevo reporte de facturación con sus items hijos."""
        db_obj = BillingReport(
            user_id=user_id,
            user_name=user_name,
            academic_load_file_id=obj_in.academic_load_file_id,
            notes=obj_in.notes,
        )

        db.add(db_obj)
        await db.flush()  # Para obtener el ID del reporte

        # Crear payment summaries
        for payment_summary in obj_in.payment_summaries:
            db_payment_summary = BillingReportPaymentSummary(
                billing_report_id=db_obj.id,
                class_days=payment_summary.class_days,
                class_schedule=payment_summary.class_schedule,
                class_duration=payment_summary.class_duration,
                payment_rate_grado=payment_summary.payment_rate_grado,
                payment_rate_maestria_1=payment_summary.payment_rate_maestria_1,
                payment_rate_maestria_2=payment_summary.payment_rate_maestria_2,
                payment_rate_doctor=payment_summary.payment_rate_doctor,
                payment_rate_bilingue=payment_summary.payment_rate_bilingue,
            )
            db.add(db_payment_summary)

        # Crear monthly items
        for monthly_item in obj_in.monthly_items:
            db_monthly_item = BillingReportMonthlyItem(
                billing_report_id=db_obj.id,
                class_days=monthly_item.class_days,
                class_schedule=monthly_item.class_schedule,
                class_duration=monthly_item.class_duration,
                year=monthly_item.year,
                month=monthly_item.month,
                month_name=monthly_item.month_name,
                sessions=monthly_item.sessions,
                real_time_minutes=monthly_item.real_time_minutes,
                total_class_hours=monthly_item.total_class_hours,
                total_dollars=monthly_item.total_dollars,
            )
            db.add(db_monthly_item)

        # Crear rate snapshots
        for rate_snapshot in obj_in.rate_snapshots:
            db_rate_snapshot = BillingReportRateSnapshot(
                billing_report_id=db_obj.id,
                academic_level_id=rate_snapshot.academic_level_id,
                academic_level_code=rate_snapshot.academic_level_code,
                academic_level_name=rate_snapshot.academic_level_name,
                rate_per_hour=rate_snapshot.rate_per_hour,
                reference_date=rate_snapshot.reference_date,
            )
            db.add(db_rate_snapshot)

        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def get(self, db: AsyncSession, id: int) -> BillingReport | None:
        """Obtener un reporte por ID con todos sus items."""
        result = await db.execute(select(BillingReport).filter(BillingReport.id == id))
        return result.scalar_one_or_none()

    async def get_multi(self, db: AsyncSession, *, skip: int = 0, limit: int = 100) -> list[BillingReport]:
        """Obtener múltiples reportes con paginación."""
        result = await db.execute(
            select(BillingReport).order_by(desc(BillingReport.created_at)).offset(skip).limit(limit)
        )
        return result.scalars().all()

    async def get_by_file_id(
        self, db: AsyncSession, academic_load_file_id: int, *, skip: int = 0, limit: int = 100
    ) -> list[BillingReport]:
        """Obtener reportes por archivo de carga académica."""
        result = await db.execute(
            select(BillingReport)
            .filter(BillingReport.academic_load_file_id == academic_load_file_id)
            .order_by(desc(BillingReport.created_at))
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()

    async def update(self, db: AsyncSession, *, db_obj: BillingReport, obj_in: BillingReportUpdate) -> BillingReport:
        """Actualizar un reporte existente y sus items."""
        # Marcar como editado si hay cambios en los items
        if obj_in.payment_summaries is not None or obj_in.monthly_items is not None:
            db_obj.is_edited = True

        # Actualizar campos del reporte principal
        update_data = obj_in.model_dump(exclude_unset=True, exclude={"payment_summaries", "monthly_items"})
        for field, value in update_data.items():
            setattr(db_obj, field, value)

        db.add(db_obj)
        await db.flush()

        # Actualizar payment summaries si vienen en el update
        if obj_in.payment_summaries is not None:
            # Eliminar los existentes
            await db.execute(
                select(BillingReportPaymentSummary).filter(BillingReportPaymentSummary.billing_report_id == db_obj.id)
            )
            existing_summaries = (
                (
                    await db.execute(
                        select(BillingReportPaymentSummary).filter(
                            BillingReportPaymentSummary.billing_report_id == db_obj.id
                        )
                    )
                )
                .scalars()
                .all()
            )

            for summary in existing_summaries:
                await db.delete(summary)

            # Crear los nuevos con los datos actualizados
            # Nota: El update viene con IDs o con campos para buscar el matching
            # Por ahora, simplemente actualizamos los valores si vienen
            # TODO: Implementar matching inteligente por class_days + class_schedule + class_duration

        # Actualizar monthly items si vienen en el update
        if obj_in.monthly_items is not None:
            # Similar a payment summaries
            existing_items = (
                (
                    await db.execute(
                        select(BillingReportMonthlyItem).filter(BillingReportMonthlyItem.billing_report_id == db_obj.id)
                    )
                )
                .scalars()
                .all()
            )

            for item in existing_items:
                await db.delete(item)

            # TODO: Implementar matching inteligente

        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def delete(self, db: AsyncSession, *, id: int) -> BillingReport | None:
        """Eliminar un reporte (se eliminan cascádicamente sus items)."""
        obj = await self.get(db, id)
        if obj:
            await db.delete(obj)
            await db.commit()
        return obj


billing_report = BillingReportCRUD()
