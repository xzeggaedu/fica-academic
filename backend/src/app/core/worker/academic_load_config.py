"""Configuración de validación de encabezados para archivos de carga académica."""

import pandas as pd

# Campos requeridos para archivos de carga académica
REQUIRED_COLUMNS = [
    "NO",  # Número de fila (para detectar fin de datos)
    "COD_CATEDRA",  # Código de coordinación
    "COD_ASIG",  # Código de asignatura
    "ASIGNATURA",  # Nombre de asignatura
    "BLG",  # Bilingüe (asignatura y maestro)
    "UNICO",  # Sección única
    "SECCION",  # Número de sección
    "ASIGNAR_SERVICIOS",  # Servicios asignados
    "DURACION",  # Duración en minutos
    "HORARIO",  # Rango horario
    "DIAS",  # Días de la semana
    "TIPO",  # Tipo de clase
    "INST",  # Instituto
    "TITULO",  # Título del profesor
    "DOCENTE",  # Nombre del profesor
    "CONT",  # Raw data del profesor
    "TELEFONO",  # Teléfono del profesor
    "CODIGO",  # ID del profesor
    "CAT_DOCENTE",  # Categoría del profesor
    "PAG",  # Estado de facturación
    "PERF",  # Perfil del profesor
    "NOTA_FINAL",  # Nota final del profesor
    "MAESTRIAS",  # Número de maestrías
    "CORREO INSTITUCIONAL",  # Email institucional
    "CORREO PERSONAL",  # Email personal
    "OBSERVACIONES",  # Observaciones
    "RESP. CANAL TEAMS  (nivel propietario)",  # Responsable canal Teams
]

# Mapeo de columnas del Excel a campos del modelo AcademicLoadClass
EXCEL_TO_MODEL_MAPPING = {
    "NO": "correlative",
    "COD_CATEDRA": "coordination_code",
    "COD_ASIG": "subject_code",
    "ASIGNATURA": "subject_name",
    "UNICO": "section_unique",
    "SECCION": "class_section",
    "ASIGNAR_SERVICIOS": "class_service_assigned",
    "DURACION": "class_duration",
    "HORARIO": "class_schedule",
    "DIAS": "class_days",
    "TIPO": "class_type",
    "INST": "professor_institute",
    "TITULO": "professor_academic_title",
    "DOCENTE": "professor_name",
    "CONT": "professor_raw_cont",
    "TELEFONO": "professor_phone",
    "CODIGO": "professor_id",
    "CAT_DOCENTE": "professor_category",
    "PAG": "professor_payment_rate",
    "PERF": "professor_profile",
    "NOTA_FINAL": "professor_final_note",
    "MAESTRIAS": "professor_masters",
    "CORREO INSTITUCIONAL": "professor_institutional_email",
    "CORREO PERSONAL": "professor_personal_email",
    "BLG": "is_bilingual",
    "OBSERVACIONES": "observations",
    "RESP. CANAL TEAMS  (nivel propietario)": "team_channel_responsible",
}


def validate_headers(file_columns: list[str]) -> tuple[bool, str | None]:
    """Valida que los encabezados del archivo cumplan con los requerimientos.

    Args:
        file_columns: Lista de columnas del archivo a validar

    Returns:
        Tuple con (es_valido, mensaje_error)
    """
    # Normalizar nombres de columnas (remover espacios y convertir a mayúsculas)
    normalized_columns = [col.strip().upper() for col in file_columns]

    # Buscar campos faltantes
    missing_columns = []
    for required_col in REQUIRED_COLUMNS:
        if required_col.upper() not in normalized_columns:
            missing_columns.append(required_col)

    # Si hay campos faltantes, retornar error
    if missing_columns:
        error_msg = (
            f"El archivo no contiene las columnas requeridas. "
            f"Campos faltantes: {', '.join(missing_columns)}. "
            f"Columnas esperadas: {', '.join(REQUIRED_COLUMNS)}"
        )
        return False, error_msg

    return True, None


def find_header_row(df_raw: pd.DataFrame, max_search_rows: int = 20) -> tuple[int | None, list[str] | None, str | None]:
    """Busca dinámicamente la fila que contiene los encabezados válidos.

    Args:
        df_raw: DataFrame sin encabezados
        max_search_rows: Número máximo de filas a buscar (default: 20)

    Returns:
        Tuple con (row_index, columns_list, error_msg) si encuentra encabezados válidos,
        o (None, None, error_msg) si no encuentra encabezados válidos
    """
    last_error_msg = None
    for idx in range(min(max_search_rows, len(df_raw))):
        test_columns = df_raw.iloc[idx].astype(str).tolist()
        is_valid, error_msg = validate_headers(test_columns)
        if is_valid:
            return idx, test_columns, None
        last_error_msg = error_msg

    return None, None, last_error_msg


def find_data_end(df: pd.DataFrame, key_columns: list[str]) -> int:
    """Encuentra el índice de la última fila con datos válidos.

    Determina el fin de los datos buscando la primera fila donde todas las columnas
    clave están vacías o contienen valores inválidos.

    Args:
        df: DataFrame con datos
        key_columns: Lista de nombres de columnas clave para detectar el fin de datos

    Returns:
        El índice de la última fila válida (basado en 0), o la longitud del DataFrame
        si no se encuentra el fin de datos
    """
    for idx, row in df.iterrows():
        # Verificar si todas las columnas clave están vacías
        all_empty = True
        for col in key_columns:
            if col in row.index:
                val = row.get(col, "")
                # Verificar si tiene valor válido
                if pd.notna(val) and str(val).strip() and str(val).strip().lower() not in ["nan", "none", "", "null"]:
                    all_empty = False
                    break

        if all_empty:
            return int(idx)

    # Si no se encontró fin de datos, retornar la longitud completa
    return len(df)
