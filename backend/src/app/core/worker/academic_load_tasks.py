"""Background tasks para procesamiento de carga académica."""

from datetime import datetime
from pathlib import Path
from typing import Any

import pandas as pd
from arq import Worker
from sqlalchemy import select

from ...core.db.database import async_get_db
from ...crud.academic_load_class import academic_load_class
from ...crud.academic_load_file import academic_load_file
from ...models.catalog_coordination import CatalogCoordination
from ...models.catalog_professor import CatalogProfessor
from ...models.catalog_subject import CatalogSubject
from ...schemas.academic_load_class import AcademicLoadClassCreate
from ...schemas.academic_load_file import AcademicLoadFileUpdate
from .academic_load_config import REQUIRED_COLUMNS, validate_headers


async def lookup_subject(db, subject_id: str | None, subject_code: str | None) -> tuple[int | None, str, str]:
    """Buscar asignatura por SUBJECT_ID o COD_ASIG.

    Args:
        db: Sesión de base de datos
        subject_id: ID de la asignatura (de SUBJECT_ID column)
        subject_code: Código de la asignatura (de COD_ASIG column)

    Returns:
        Tuple de (subject_id: int, subject_name: str, subject_code: str)
    """
    try:
        # Priorizar SUBJECT_ID si existe
        if subject_id and pd.notna(subject_id):
            # Extraer ID numérico de "SUBJECT_ID" si viene como string
            try:
                subject_id_int = int(float(str(subject_id)))
            except (ValueError, TypeError):
                subject_id_int = None

            if subject_id_int:
                result = await db.execute(select(CatalogSubject).filter(CatalogSubject.id == subject_id_int))
                subject = result.scalar_one_or_none()
                if subject:
                    return subject.id, subject.subject_name, subject.subject_code

        # Si no se encontró por ID, buscar por COD_ASIG
        if subject_code and pd.notna(subject_code):
            result = await db.execute(
                select(CatalogSubject).filter(CatalogSubject.subject_code == str(subject_code).strip())
            )
            subject = result.scalar_one_or_none()
            if subject:
                return subject.id, subject.subject_name, subject.subject_code

        # Si no se encontró, extraer nombre de ASIGNATURA column
        return None, "Asignatura no encontrada", str(subject_code or "")
    except Exception as e:
        print(f"⚠️ Error buscando asignatura: {e}")
        return None, str(subject_code or "Unknown"), str(subject_code or "")


async def lookup_professor(db, professor_id: str) -> tuple[int | None, dict[str, Any]]:
    """Buscar profesor por ID_DOCENTE y extraer snapshot.

    Args:
        db: Sesión de base de datos
        professor_id: ID del profesor (ID_DOCENTE column)

    Returns:
        Tuple de (professor_id: int, snapshot_data: dict)
    """
    if not professor_id or pd.isna(professor_id):
        return None, {
            "professor_category": None,
            "professor_academic_title": None,
            "professor_is_bilingual": False,
            "professor_doctorates": 0,
            "professor_masters": 0,
        }

    try:
        result = await db.execute(
            select(CatalogProfessor).filter(CatalogProfessor.professor_id == str(professor_id).strip())
        )
        professor = result.scalar_one_or_none()

        if professor:
            return professor.id, {
                "professor_category": professor.professor_category,
                "professor_academic_title": professor.academic_title,
                "professor_is_bilingual": professor.is_bilingual,
                "professor_doctorates": professor.doctorates,
                "professor_masters": professor.masters,
            }

        # Profesor no encontrado
        return None, {
            "professor_category": None,
            "professor_academic_title": None,
            "professor_is_bilingual": False,
            "professor_doctorates": 0,
            "professor_masters": 0,
        }
    except Exception as e:
        print(f"⚠️ Error buscando profesor {professor_id}: {e}")
        return None, {
            "professor_category": None,
            "professor_academic_title": None,
            "professor_is_bilingual": False,
            "professor_doctorates": 0,
            "professor_masters": 0,
        }


async def lookup_coordination(db, cod_cate: str) -> int | None:
    """Buscar coordinación por COD_CATE.

    Args:
        db: Sesión de base de datos
        cod_cate: Código de la coordinación

    Returns:
        coordination_id: int | None
    """
    if not cod_cate or pd.isna(cod_cate):
        return None

    try:
        result = await db.execute(select(CatalogCoordination).filter(CatalogCoordination.code == str(cod_cate).strip()))
        coordination = result.scalar_one_or_none()
        if coordination:
            return coordination.id
        return None
    except Exception as e:
        print(f"⚠️ Error buscando coordinación {cod_cate}: {e}")
        return None


def extract_duration(duration_str: str | int | float) -> int:
    """Extraer duración en minutos de un string o número.

    Args:
        duration_str: String con formato "90 min" o número

    Returns:
        Duración en minutos como int
    """
    import re

    if pd.isna(duration_str):
        return 0

    # Si ya es un número
    if isinstance(duration_str, int | float):
        return int(duration_str)

    # Si es string, extraer el número
    duration_str = str(duration_str).strip()

    # Buscar patrones como "90 min", "90", "1.5h", etc.
    match = re.search(r"(\d+(?:\.\d+)?)", duration_str)
    if match:
        num = float(match.group(1))
        # Si contiene 'h' o 'hr', convertir a minutos
        if "h" in duration_str.lower():
            return int(num * 60)
        return int(num)

    return 0


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

                # Ingestar datos fila por fila
                print(f"📊 Ingiriendo {len(df_filtered)} clases...")

                rows_inserted = 0
                rows_failed = 0

                for idx, row in df_filtered.iterrows():
                    try:
                        # Extraer datos de la fila
                        cod_cate = row.get("COD_CATE", None)
                        subject_id = row.get("SUBJECT_ID", None)
                        subject_code = row.get("COD_ASIG", None)
                        subject_name = row.get("ASIGNATURA", "Unknown")
                        section = str(row.get("SECCION", ""))
                        schedule = str(row.get("HORARIO", ""))
                        duration = extract_duration(row.get("DURACION", 0))
                        days = str(row.get("DIAS", ""))
                        modality = str(row.get("MODALIDAD", ""))
                        professor_id = row.get("ID_DOCENTE", None)

                        # Buscar en catálogos
                        db_subject_id, db_subject_name, db_subject_code = await lookup_subject(
                            db, subject_id, subject_code
                        )

                        # Usar nombres del catálogo si se encontró, sino usar los del Excel
                        final_subject_name = db_subject_name if db_subject_id else subject_name
                        final_subject_code = (
                            db_subject_code if db_subject_id else (str(subject_code) if subject_code else "")
                        )

                        # Buscar coordinación
                        coordination_id = await lookup_coordination(db, cod_cate)

                        # Buscar profesor y obtener snapshot
                        db_professor_id, professor_snapshot = await lookup_professor(db, professor_id)

                        # Crear registro de clase
                        class_data = AcademicLoadClassCreate(
                            academic_load_file_id=file_id,
                            subject_id=db_subject_id,
                            coordination_id=coordination_id,
                            professor_id=db_professor_id,
                            subject_name=final_subject_name,
                            subject_code=final_subject_code,
                            section=section,
                            schedule=schedule,
                            duration=duration,
                            days=days,
                            modality=modality,
                            professor_category=professor_snapshot.get("professor_category"),
                            professor_academic_title=professor_snapshot.get("professor_academic_title"),
                            professor_is_bilingual=professor_snapshot.get("professor_is_bilingual", False),
                            professor_doctorates=professor_snapshot.get("professor_doctorates", 0),
                            professor_masters=professor_snapshot.get("professor_masters", 0),
                        )

                        await academic_load_class.create(db, obj_in=class_data)
                        rows_inserted += 1

                        if (rows_inserted + rows_failed) % 100 == 0:
                            print(f"📊 Progreso: {rows_inserted} insertadas, {rows_failed} fallidas")

                    except Exception as e:
                        print(f"⚠️ Error procesando fila {idx}: {e}")
                        rows_failed += 1
                        continue

                print(f"✅ Ingestion completada: {rows_inserted} clases insertadas, {rows_failed} errores")

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
