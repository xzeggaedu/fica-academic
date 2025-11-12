"""Background tasks para procesamiento de plantillas."""

from datetime import datetime
from pathlib import Path
from typing import Any

from arq import Worker

from ...core.db.database import async_get_db
from ...crud.template_generation import template_generation
from ...schemas.template_generation import TemplateGenerationUpdate
from .template_transform import (
    generate_output_filename,
    load_school_info,
    process_and_generate_pl2,
    validate_pl1_format,
)


async def process_template_generation(ctx: Worker, template_id: int) -> dict[str, Any]:
    """Procesar la generación de plantilla PL1 a PL2 en segundo plano.

    Args:
        ctx: Contexto del worker ARQ
        template_id: ID del registro de template generation

    Returns:
        Dict con el resultado del procesamiento
    """
    # FORCE RELOAD: Timestamp único para forzar recarga del módulo
    print("🚨🚨🚨 WORKER ACTUALIZADO - VERSION 2025-10-25-22:05:00 🚨🚨🚨")
    print(f"🔄 WORKER VERSION: 2025-10-25-22:05:00 - Template ID: {template_id}")
    print("🔍 DEBUGGING: Verificando si el worker está usando el código actualizado")
    print("🔍 ESTE LOG DEBE APARECER SI EL WORKER ESTÁ USANDO EL CÓDIGO ACTUALIZADO")
    print("🔍 ARCHIVO ACTUAL: template_tasks_new.py")
    print(f"🔍 TIMESTAMP: {datetime.now()}")
    print(f"🔍 TIPO DE DATO template_id: {type(template_id)}")

    try:
        # Obtener sesión de base de datos
        async for db in async_get_db():
            # Obtener el registro de template
            template_record = await template_generation.get(db, id=template_id)
            if not template_record:
                return {"error": f"Template {template_id} no encontrado"}

            print(f"🔄 Procesando template ID: {template_id}, School ID: {template_record.school_id}")

            # Actualizar estado a "processing"
            await template_generation.update(
                db=db, db_obj=template_record, obj_in=TemplateGenerationUpdate(generation_status="processing")
            )

            # Verificar que el archivo original existe
            original_path = Path(template_record.original_file_path)
            if not original_path.exists():
                error_msg = f"Archivo original no encontrado: {original_path}"
                print(f"❌ {error_msg}")
                return {"error": error_msg}

            # Validar formato PL1
            if not validate_pl1_format(str(original_path)):
                error_msg = (
                    "El archivo no tiene el formato PL1 esperado. "
                    "Verifique que contenga las columnas requeridas: "
                    "MATERIA, CODIGO, SEC, HORAS, MODALIDAD y días de la semana."
                )
                print(f"❌ {error_msg}")
                return {"error": error_msg}

            # Obtener información de la escuela para el nombre del archivo
            school_info = await load_school_info(db, template_record.school_id)
            school_acronym = school_info["acronym"]
            output_filename = generate_output_filename(school_acronym, template_record.upload_date)

            # Usar el directorio de archivos generados (no depender del generated_file_path que es None)
            generated_dir = Path("/code/uploads/generated")
            generated_path = generated_dir / output_filename

            # Crear directorio de destino si no existe
            generated_path.parent.mkdir(parents=True, exist_ok=True)

            print("📊 Iniciando transformación PL1 → PL2...")
            print(f"📁 Archivo original: {original_path}")
            print(f"📁 Archivo generado: {generated_path}")

            # Ejecutar la transformación completa
            result_path = await process_and_generate_pl2(
                file_path_pl1=str(original_path),
                school_id=template_record.school_id,
                db=db,
                output_file_path=str(generated_path),
            )

            print(
                f"🎯 ANTES - Estado: {template_record.generation_status}, Ruta: {template_record.generated_file_path}"
            )

            # Actualizar la ruta del archivo generado en la base de datos
            print(f"🔄 Actualizando base de datos con ruta: {result_path}")
            update_data = TemplateGenerationUpdate(generation_status="completed", generated_file_path=str(result_path))
            await template_generation.update(
                db=db,
                db_obj=template_record,
                obj_in=update_data,
            )
            print("✅ Base de datos actualizada exitosamente")
            print(f"🔍 LOG ÚNICO: Worker está usando código actualizado - {template_id}")

            # Verificar que se actualizó correctamente
            updated_record = await template_generation.get(db, id=template_id)
            print(
                f"🎯 DESPUÉS - Estado: {updated_record.generation_status}, Ruta: {updated_record.generated_file_path}"
            )

            print(f"✅ Transformación completada exitosamente: {result_path}")

            return {
                "success": True,
                "template_id": template_id,
                "generated_file": str(result_path),
                "school_id": template_record.school_id,
                "message": "Plantilla PL2 generada exitosamente",
            }

    except ValueError as e:
        # Error de validación o datos
        error_msg = str(e)
        print(f"❌ Error de validación: {error_msg}")

        # Actualizar estado a "failed"
        try:
            async for db in async_get_db():
                template_record = await template_generation.get(db, id=template_id)
                if template_record:
                    await template_generation.update(
                        db=db, db_obj=template_record, obj_in=TemplateGenerationUpdate(generation_status="failed")
                    )
        except Exception:
            pass

        return {"error": error_msg, "template_id": template_id, "message": "Error de validación en la transformación"}

    except Exception as e:
        # Error general
        error_msg = f"Error inesperado al procesar plantilla: {str(e)}"
        print(f"❌ {error_msg}")

        # Actualizar estado a "failed"
        try:
            async for db in async_get_db():
                template_record = await template_generation.get(db, id=template_id)
                if template_record:
                    await template_generation.update(
                        db=db, db_obj=template_record, obj_in=TemplateGenerationUpdate(generation_status="failed")
                    )
        except Exception:
            pass

        return {"error": error_msg, "template_id": template_id, "message": "Error al procesar plantilla"}


# Registrar las tareas disponibles
TASKS = {
    "process_template_generation": process_template_generation,
}
