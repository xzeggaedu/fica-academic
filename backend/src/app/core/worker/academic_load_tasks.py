"""Background tasks para procesamiento de carga académica."""

import asyncio
from datetime import datetime
from pathlib import Path
from typing import Any

import pandas as pd
from arq import Worker

from ...core.db.database import async_get_db
from ...crud.academic_load_file import academic_load_file
from ...schemas.academic_load_file import AcademicLoadFileUpdate
from .academic_load_config import REQUIRED_COLUMNS, validate_headers


async def process_academic_load_file(ctx: Worker, file_id: int) -> dict[str, Any]:
    """Procesar la carga académica subida en segundo plano.

    Args:
        ctx: Contexto del worker ARQ
        file_id: ID del registro de academic load file

    Returns:
        Dict con el resultado del procesamiento
    """
    print(f"🔄 Procesando carga académica ID: {file_id}")

    try:
        # Obtener sesión de base de datos
        async for db in async_get_db():
            # Obtener el registro de carga académica
            load_record = await academic_load_file.get(db, id=file_id)
            if not load_record:
                return {"error": f"Archivo de carga académica {file_id} no encontrado"}

            print(f"🔄 Procesando carga académica ID: {file_id}")

            # Actualizar estado a "processing"
            await academic_load_file.update(
                db=db, db_obj=load_record, obj_in=AcademicLoadFileUpdate(ingestion_status="processing")
            )

            # Simular tiempo de procesamiento (fake process time)
            await asyncio.sleep(5)  # Esperar 5 segundos simulando procesamiento

            # Verificar que el archivo original existe
            original_path = Path(load_record.original_file_path)
            print(f"🔍 Verificando archivo: {original_path}")
            print(f"🔍 Archivo existe: {original_path.exists()}")
            if not original_path.exists():
                error_msg = f"Archivo original no encontrado: {original_path}"
                print(f"❌ {error_msg}")
                await academic_load_file.update(
                    db=db, db_obj=load_record, obj_in=AcademicLoadFileUpdate(ingestion_status="failed", notes=error_msg)
                )
                return {"error": error_msg, "file_id": file_id}

            # Leer el archivo Excel
            print(f"📄 Leyendo archivo: {original_path}")
            try:
                df = pd.read_excel(original_path)

                # Validar encabezados
                file_columns = df.columns.tolist()
                print(f"📋 Columnas encontradas: {file_columns[:5]}...")  # Debug log
                is_valid, error_msg = validate_headers(file_columns)

                if not is_valid:
                    print(f"❌ Error de validación: {error_msg}")
                    await academic_load_file.update(
                        db=db,
                        db_obj=load_record,
                        obj_in=AcademicLoadFileUpdate(ingestion_status="failed", notes=error_msg),
                    )
                    return {"error": error_msg, "file_id": file_id}

                print(f"✅ Encabezados válidos. Filas encontradas: {len(df)}")

                # Filtrar solo las columnas requeridas
                missing_cols = [col for col in REQUIRED_COLUMNS if col not in df.columns]
                if missing_cols:
                    error_msg = (
                        f"El archivo no contiene todas las columnas requeridas. Faltan: {', '.join(missing_cols)}"
                    )
                    print(f"❌ Error de validación: {error_msg}")
                    await academic_load_file.update(
                        db=db,
                        db_obj=load_record,
                        obj_in=AcademicLoadFileUpdate(ingestion_status="failed", notes=error_msg),
                    )
                    return {"error": error_msg, "file_id": file_id}

                df_filtered = df[REQUIRED_COLUMNS].copy()

                # TODO: Aquí va la lógica de ingesta de datos
                # Por ahora solo validamos y marcamos como completado
                print(f"📊 Datos listos para ingesta: {len(df_filtered)} filas")

                # Actualizar estado a "completed"
                await academic_load_file.update(
                    db=db, db_obj=load_record, obj_in=AcademicLoadFileUpdate(ingestion_status="completed")
                )

                print(f"✅ Carga académica ID {file_id} procesada exitosamente")

                return {
                    "success": True,
                    "file_id": file_id,
                    "status": "completed",
                    "rows_processed": len(df_filtered),
                    "processed_at": datetime.now().isoformat(),
                }

            except ValueError as e:
                # Error de validación de pandas
                error_msg = f"Error al leer el archivo Excel: {str(e)}"
                print(f"❌ {error_msg}")
                await academic_load_file.update(
                    db=db, db_obj=load_record, obj_in=AcademicLoadFileUpdate(ingestion_status="failed", notes=error_msg)
                )
                return {"error": error_msg, "file_id": file_id}

    except Exception as e:
        # En caso de error, marcar como failed
        error_msg = f"Error inesperado: {str(e)}"
        async for db in async_get_db():
            load_record = await academic_load_file.get(db, id=file_id)
            if load_record:
                await academic_load_file.update(
                    db=db, db_obj=load_record, obj_in=AcademicLoadFileUpdate(ingestion_status="failed", notes=error_msg)
                )
        print(f"❌ Error procesando carga académica {file_id}: {error_msg}")
        return {"error": error_msg, "file_id": file_id}
