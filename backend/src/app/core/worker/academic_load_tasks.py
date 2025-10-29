"""Background tasks para procesamiento de carga académica."""

import sys
from datetime import datetime
from pathlib import Path
from typing import Any

import pandas as pd
from arq import Worker

from ...core.db.database import async_get_db
from ...crud.academic_load_class import academic_load_class
from ...crud.academic_load_file import academic_load_file
from ...schemas.academic_load_class import AcademicLoadClassCreate
from ...schemas.academic_load_file import AcademicLoadFileUpdate
from .academic_load_config import EXCEL_TO_MODEL_MAPPING, find_data_end, find_header_row
from .validators import (
    CoordinationValidator,
    ProfessorValidator,
    ScheduleValidator,
    SubjectValidator,
    ValidationLevel,
)


def _log_stderr(message: str) -> None:
    """Helper function para escribir a stderr con flush automático."""
    sys.stderr.write(f"{message}\n")
    sys.stderr.flush()


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


async def validate_row_data(db, row_data: dict, strict_mode: bool = False) -> tuple[bool, list[str]]:
    """Validar fila usando pipeline de validación.

    Args:
        db: Sesión de base de datos
        row_data: Diccionario con datos de la fila
        strict_mode: Si True, bloquea errores; si False, solo warnings

    Returns:
        Tuple de (passed, messages)
    """
    # Ejecutar todos los validadores
    validators = [
        CoordinationValidator(strict_mode=strict_mode),
        SubjectValidator(strict_mode=strict_mode),
        ProfessorValidator(strict_mode=strict_mode),
        ScheduleValidator(strict_mode=strict_mode),
    ]

    all_results = []
    for validator in validators:
        results = await validator.validate(db, row_data)
        all_results.extend(results)

    # Separar errores y warnings
    errors = [r for r in all_results if r.level == ValidationLevel.ERROR]
    _warnings = [r for r in all_results if r.level == ValidationLevel.WARNING]

    messages = [r.message for r in all_results]

    # Si hay errores en strict_mode, no pasa
    passed = len(errors) == 0 if strict_mode else True

    return passed, messages


def determine_validation_status(validation_passed: bool, validation_messages: list[str]) -> tuple[str, str | None]:
    """Determina status de validación y texto de errores."""
    if validation_messages:
        if not validation_passed:
            return "error", "; ".join(validation_messages)
        return "warning", "; ".join(validation_messages)
    return "valid", None


def map_excel_row_to_class_data(row: dict, file_id: int, validation_status: str, validation_errors: str | None) -> dict:
    """Mapea una fila del Excel a los datos del modelo AcademicLoadClass.

    Args:
        row: Diccionario con los datos de la fila del Excel
        file_id: ID del archivo de carga académica
        validation_status: Estado de validación
        validation_errors: Errores de validación o None

    Returns:
        Diccionario con los datos mapeados para AcademicLoadClassCreate
    """

    # Helper para limpiar valores
    def get_clean_value(val, default=None):
        if val is None or (isinstance(val, float) and pd.isna(val)):
            return default
        val_str = str(val).strip().lower()
        if val_str in ["nan", "none", "", "null"]:
            return default
        return val

    def get_str_value(val, default=""):
        if val is None or (isinstance(val, float) and pd.isna(val)):
            return default
        val_str = str(val).strip()
        if val_str.lower() in ["nan", "none", "", "null"]:
            return default
        return val_str

    # Mapear cada columna del Excel al campo del modelo
    class_data = {
        "academic_load_file_id": file_id,
        "validation_status": validation_status,
        "validation_errors": validation_errors,
    }

    # Mapear usando EXCEL_TO_MODEL_MAPPING
    for excel_col, model_field in EXCEL_TO_MODEL_MAPPING.items():
        excel_value = row.get(excel_col)

        # Aplicar limpieza según el tipo de campo
        if model_field in ["professor_masters"]:
            # Campos numéricos
            class_data[model_field] = int(excel_value) if pd.notna(excel_value) and excel_value != "" else 0
        elif model_field == "class_duration":
            # Duración usa extract_duration
            class_data[model_field] = extract_duration(excel_value)
        elif model_field in ["professor_is_billing"]:
            # Campos booleanos
            class_data[model_field] = bool(excel_value) if pd.notna(excel_value) and excel_value != "" else False
        else:
            # Campos string
            if excel_value is None or pd.isna(excel_value):
                class_data[model_field] = None if "optional" in model_field else ""
            else:
                class_data[model_field] = str(excel_value).strip()

    return class_data


def process_validation_error(
    row_idx: int,
    validation_errors_str: str,
    row_data: dict,
) -> tuple[str | None, dict | None]:
    """Procesa errores de validación en modo estricto.

    Args:
        row_idx: Índice de la fila con error
        validation_errors_str: Mensaje de error de validación
        row_data: Diccionario con datos de la fila

    Returns:
        Tuple con (error_type, error_details) donde:
        - error_type: Tipo de error (missing_coordination, missing_subject, etc.) o None
        - error_details: Diccionario con detalles del error o None
    """
    # Extraer campos de la fila
    cod_cate = row_data.get("COD_CATEDRA")
    subject_code = row_data.get("COD_ASIG")
    subject_name = row_data.get("ASIGNATURA")
    professor_id = row_data.get("CODIGO")
    docente_name = row_data.get("DOCENTE", "No especificado")
    schedule = row_data.get("HORARIO", "")
    days = row_data.get("DIAS", "")

    # Determinar tipo de error
    error_type = None
    if "Coordinación" in validation_errors_str:
        error_type = "missing_coordination"
    elif "Asignatura" in validation_errors_str:
        error_type = "missing_subject"
    elif "Profesor" in validation_errors_str:
        error_type = "missing_professor"
    elif "Horario" in validation_errors_str:
        error_type = "invalid_schedule"

    # Determinar campo problemático y valor para el detalle del error
    field_name = "general"
    error_value = str(subject_name)[:50] if subject_name else "N/A"

    if error_type == "missing_coordination":
        field_name = "COD_CATEDRA"
        error_value = str(cod_cate)[:50] if cod_cate else "Vacío"
    elif error_type == "missing_subject":
        field_name = "COD_ASIG / ASIGNATURA"
        error_value = f"{subject_code} - {subject_name}"[:50] if subject_code or subject_name else "Vacío"
    elif error_type == "missing_professor":
        field_name = "CODIGO / DOCENTE"
        error_value = f"{professor_id or 'Vacío'} ({docente_name})"[:50]
    elif error_type == "invalid_schedule":
        field_name = "HORARIO / DIAS"
        error_value = f"{schedule} - {days}"[:50]

    error_details = {
        "row": int(row_idx),
        "field": field_name,
        "value": error_value,
        "reason": validation_errors_str,
        "validators": ["Multiple"],
    }

    return error_type, error_details


async def process_academic_load_file(ctx: Worker, file_id: int) -> dict[str, Any]:
    """Procesar la carga académica subida en segundo plano.

    Args:
        ctx: Contexto del worker ARQ
        file_id: ID del registro de academic load file

    Returns:
        Dict con el resultado del procesamiento
    """
    _log_stderr(f"🔄 Procesando carga académica ID: {file_id}")

    try:
        # Obtener sesión de base de datos
        async for db in async_get_db():
            # Obtener el registro de carga académica
            load_record = await academic_load_file.get(db, id=file_id)
            if not load_record:
                return {"error": f"Archivo de carga académica {file_id} no encontrado"}

            _log_stderr(f"📄 Archivo: {load_record.original_filename}")

            # Actualizar estado a "processing"
            await academic_load_file.update(
                db=db, db_obj=load_record, obj_in=AcademicLoadFileUpdate(ingestion_status="processing")
            )

            # Verificar que el archivo original existe
            original_path = Path(load_record.original_file_path)

            if not original_path.exists():
                error_msg = f"Archivo original no encontrado: {original_path}"
                _log_stderr(f"ERROR: {error_msg}")
                await academic_load_file.update(
                    db=db, db_obj=load_record, obj_in=AcademicLoadFileUpdate(ingestion_status="failed", notes=error_msg)
                )
                return {"error": error_msg, "file_id": file_id}

            # Leer el archivo Excel
            _log_stderr(f"INFO: Leyendo archivo: {original_path}")

            try:
                # Leer el archivo Excel SIN headers primero para analizar estructura
                df_raw = pd.read_excel(original_path, header=None)
                _log_stderr(f"INFO: Archivo leído: {len(df_raw)} filas")

                # Buscar dinámicamente la fila con los encabezados
                header_row, file_columns, error_msg = find_header_row(df_raw, max_search_rows=20)

                if header_row is None or error_msg:
                    final_error_msg = error_msg or "No se encontraron encabezados válidos en el archivo Excel"
                    _log_stderr(f"ERROR: {final_error_msg}")
                    await academic_load_file.update(
                        db=db,
                        db_obj=load_record,
                        obj_in=AcademicLoadFileUpdate(ingestion_status="failed", notes=final_error_msg),
                    )
                    return {"error": final_error_msg, "file_id": file_id}

                _log_stderr(f"INFO: Columnas encontradas en fila {header_row}: {file_columns[:5]}...")
                _log_stderr("INFO: Todas las columnas requeridas están presentes")

                # Crear DataFrame con headers correctos
                df = df_raw.iloc[header_row + 1 :].copy()  # Desde fila con headers en adelante
                df.columns = file_columns

                # Detectar fin de datos
                key_columns = ["COD_CATEDRA", "COD_ASIG", "ASIGNATURA"]
                end_row = find_data_end(df, key_columns)

                _log_stderr(f"INFO: Fin de datos detectado en fila {end_row}")

                df = df.iloc[:end_row].copy()

                # Ingestar datos fila por fila (todas las columnas del Excel)
                _log_stderr(f"📊 Ingiriendo {len(df)} clases...")

                rows_inserted = 0
                rows_failed = 0

                # Obtener modo de validación
                strict_mode = load_record.strict_validation if hasattr(load_record, "strict_validation") else False

                _log_stderr(f"INFO: strict_mode: {'Enabled' if strict_mode else 'Disabled'}")

                # Inicializar contadores de errores por tipo
                errors_by_type = {
                    "missing_coordination": 0,
                    "missing_subject": 0,
                    "missing_professor": 0,
                    "invalid_schedule": 0,
                }
                sample_errors = []  # Máximo 10 errores de ejemplo

                for idx, row in df.iterrows():
                    try:
                        # DEBUG: Ver todas las filas para debug (partido para cumplir E501)
                        debug_msg = (
                            f"DEBUG Fila {idx}: NO='{row.get('NO', 'N/A')}' "
                            f"COD_CATEDRA='{row.get('COD_CATEDRA', 'N/A')}' "
                            f"COD_ASIG='{row.get('COD_ASIG', 'N/A')}' "
                            f"ASIGNATURA='{row.get('ASIGNATURA', 'N/A')}'\n"
                        )
                        sys.stderr.write(debug_msg)
                        sys.stderr.flush()

                        # Helper para manejar valores NaN/vacíos
                        def get_clean_value(val, default=None):
                            if val is None or (isinstance(val, float) and pd.isna(val)):
                                return default
                            val_str = str(val).strip().lower()
                            if val_str in ["nan", "none", "", "null"]:
                                return default
                            return val

                        # Helper para obtener valores como string
                        def get_str_value(val, default=""):
                            if val is None or (isinstance(val, float) and pd.isna(val)):
                                return default
                            val_str = str(val).strip()
                            if val_str.lower() in ["nan", "none", "", "null"]:
                                return default
                            return val_str

                        # Extraer datos de la fila con limpieza de NaN
                        subject_name = get_clean_value(row.get("ASIGNATURA", None))
                        subject_code = get_clean_value(row.get("COD_ASIG", None))
                        section = get_str_value(row.get("SECCION", ""), "")
                        schedule = get_str_value(row.get("HORARIO", ""), "")
                        days = get_str_value(row.get("DIAS", ""), "")

                        # SKIP: Si faltan datos esenciales, no procesar esta fila
                        # Verificar que tenga al menos COD_ASIG o ASIGNATURA
                        if not subject_code or not subject_name or not section or not schedule or not days:
                            sys.stderr.write(f"⏭️  Saltando fila {idx}: sin materia ni código\n")
                            sys.stderr.flush()
                            continue

                        # Ejecutar validaciones
                        validation_passed, validation_messages = await validate_row_data(db, row.to_dict(), strict_mode)

                        # Determinar status de validación
                        validation_status, validation_errors_str = determine_validation_status(
                            validation_passed, validation_messages
                        )

                        # Si no pasa en strict_mode, guardar error y continuar
                        if not validation_passed and strict_mode:
                            _log_stderr(f"⚠️ Fila {idx} no pasó validación en modo estricto: {validation_errors_str}")
                            rows_failed += 1

                            # Procesar error de validación
                            error_type, error_details = process_validation_error(
                                row_idx=idx,
                                validation_errors_str=validation_errors_str,
                                row_data=row.to_dict(),
                            )

                            # Actualizar contadores de errores por tipo
                            if error_type:
                                errors_by_type[error_type] += 1

                            # Agregar a sample_errors si no excede el límite
                            if len(sample_errors) < 10 and error_details:
                                sample_errors.append(error_details)

                            # Aún así intentar crear registro para guardar el error
                            # Usar valores raw del Excel
                            try:
                                error_class_data_dict = map_excel_row_to_class_data(
                                    row.to_dict(), file_id, "error", validation_errors_str
                                )
                                error_class_data = AcademicLoadClassCreate(**error_class_data_dict)
                                await academic_load_class.create(db, obj_in=error_class_data)
                            except Exception as e:
                                _log_stderr(f"❌ Error guardando fila con error: {e}")

                            continue

                        # Crear registro de clase usando mapeo
                        class_data_dict = map_excel_row_to_class_data(
                            row.to_dict(), file_id, validation_status, validation_errors_str
                        )
                        class_data = AcademicLoadClassCreate(**class_data_dict)

                        await academic_load_class.create(db, obj_in=class_data)
                        rows_inserted += 1

                        if (rows_inserted + rows_failed) % 100 == 0:
                            _log_stderr(f"📊 Progreso: {rows_inserted} insertadas, {rows_failed} fallidas")

                    except Exception as e:
                        _log_stderr(f"⚠️ Error procesando fila {idx}: {e}")
                        rows_failed += 1
                        continue

                sys.stderr.write(
                    f"✅ DEBUG: Ingestion completada: {rows_inserted} clases insertadas, {rows_failed} errores\n"
                )
                sys.stderr.flush()
                _log_stderr(f"✅ Ingestion completada: {rows_inserted} clases insertadas, {rows_failed} errores")

                # Si hay errores en modo estricto y no se insertó ninguna fila, marcar como failed
                if strict_mode and rows_failed > 0 and rows_inserted == 0:
                    # Crear JSON detallado de errores
                    import json

                    detailed_errors = {
                        "summary": {
                            "total_rows": len(df),
                            "inserted": rows_inserted,
                            "failed": rows_failed,
                            "warnings": 0,
                        },
                        "errors_by_type": errors_by_type,
                        "sample_errors": sample_errors,
                    }

                    error_msg = f"Validación estricta falló: {rows_failed} filas rechazadas"
                    notes_json = json.dumps(detailed_errors, indent=2)
                    _log_stderr(f"❌ {error_msg}")
                    _log_stderr(f"📊 Errores detallados: {notes_json[:200]}...")

                    await academic_load_file.update(
                        db=db,
                        db_obj=load_record,
                        obj_in=AcademicLoadFileUpdate(ingestion_status="failed", notes=notes_json),
                    )
                    return {"error": error_msg, "file_id": file_id}

                # Actualizar estado a "completed"
                await academic_load_file.update(
                    db=db, db_obj=load_record, obj_in=AcademicLoadFileUpdate(ingestion_status="completed")
                )

                _log_stderr(f"✅ Carga académica ID {file_id} procesada exitosamente")

                return {
                    "success": True,
                    "file_id": file_id,
                    "status": "completed",
                    "rows_processed": len(df),
                    "processed_at": datetime.now().isoformat(),
                }

            except ValueError as e:
                # Error de validación de pandas
                error_msg = f"Error al leer el archivo Excel: {str(e)}"
                _log_stderr(f"❌ {error_msg}")
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
        _log_stderr(f"❌ Error procesando carga académica {file_id}: {error_msg}")
        return {"error": error_msg, "file_id": file_id}
