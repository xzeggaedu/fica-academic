"""Configuración de validación de encabezados para archivos de carga académica."""

# Campos requeridos para archivos de carga académica
REQUIRED_COLUMNS = [
    "COD_CATE",
    "SUBJECT_ID",
    "COD_ASIG",
    "ASIGNATURA",
    "SECCION",
    "HORARIO",
    "DURACION",
    "DIAS",
    "MODALIDAD",
    "TIT",
    "DOCENTE",
    "ID_DOCENTE",
]

# Campos que deben ignorarse (serán descartados)
OPTIONAL_COLUMNS = [
    # Puedes agregar campos adicionales aquí si es necesario en el futuro
]


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
