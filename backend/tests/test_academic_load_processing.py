"""Unit tests para validar el procesamiento de carga académica."""


import pandas as pd

from src.app.core.worker.academic_load_tasks import extract_duration


def test_extract_duration_with_minutes():
    """Test que extract_duration funciona con formato '90 min'."""
    assert extract_duration("90 min") == 90
    assert extract_duration("180 min") == 180


def test_extract_duration_with_hours():
    """Test que extract_duration convierte horas a minutos."""
    assert extract_duration("1.5h") == 90


def test_extract_duration_with_number():
    """Test que extract_duration acepta números directos."""
    assert extract_duration(90) == 90
    assert extract_duration(180) == 180


def test_extract_duration_with_nan():
    """Test que extract_duration retorna 0 para NaN."""
    assert extract_duration(pd.NA) == 0


def test_validate_excel_structure():
    """Test que valida la estructura esperada del Excel."""
    # Simular lectura del Excel
    sample_data = {
        "NO": ["31", "32", "33", None, "TOTAL"],
        "COORD": ["RED", "PRO", "DES", None, "nan"],
        "COD_ASIG": ["INF1-I0", "INF1-I", "PROG3-I", None, None],
        "ASIGNATURA": ["INFORMÁTICA 36", "INFORMÁTICA", "PROGRAMACIÓN III", None, "TOTAL DE GRUPOS"],
        "UNICO": [None, None, "1", None, None],
        "SECCION": ["5", "8", "3", None, None],
        "ASIGNAR_SERVICIOS": [None, None, None, None, None],
        "DURACION": ["90 min", "180", None, None, None],
        "HORARIO": ["08:00-09:30", "17:00-18:30", "07:00-10:00", None, None],
        "DIAS": ["Ma-Jue", "Ma-Jue", "Dom", None, None],
        "TIPO": ["P", "E.L.", "P", None, None],
        "INST": [None, None, None, None, None],
        "TITULO": [None, None, None, None, None],
        "DOCENTE": ["ADOLFO JOSÉ", "ADOLFO JOSÉ", "ALFREDO OMAR", None, None],
        "CONT": [None, "1", "1", None, None],
        "TELEFONO": [None, None, None, None, None],
        "CODIGO": ["PROF001", "PROF002", "PROF003", None, None],
        "CAT_DOCENTE": ["ADM", "ADM", "DHC", None, None],
        "PAG": ["0", "1", "1", None, None],
        "PERF": [None, None, None, None, None],
        "NOTA_FINAL": [None, None, None, None, None],
        "MAESTRIAS": ["2", "2", "0", None, None],
    }

    df = pd.DataFrame(sample_data)

    # Validar estructura
    required_columns = [
        "NO",
        "COORD",
        "COD_ASIG",
        "ASIGNATURA",
        "UNICO",
        "SECCION",
        "ASIGNAR_SERVICIOS",
        "DURACION",
        "HORARIO",
        "DIAS",
        "TIPO",
        "INST",
        "TITULO",
        "DOCENTE",
        "CONT",
        "TELEFONO",
        "CODIGO",
        "CAT_DOCENTE",
        "PAG",
        "PERF",
        "NOTA_FINAL",
        "MAESTRIAS",
    ]

    for col in required_columns:
        assert col in df.columns, f"Columna requerida '{col}' no encontrada"

    # Validar que detecta correctamente el fin de datos
    end_row = len(df)

    for idx, row in df.iterrows():
        no_value = row.get("NO", "")
        no_str = str(no_value).strip() if pd.notna(no_value) else ""
        if not no_str or not no_str.isdigit():
            end_row = idx
            break

    # Debería terminar en la fila 3 (índice 3) donde NO=None
    assert end_row == 3, f"Fin de datos debería estar en fila 3, pero está en {end_row}"

    # Filtrar df hasta end_row
    df_filtered = df.iloc[:end_row].copy()
    assert len(df_filtered) == 3, f"Debería haber 3 filas válidas, pero hay {len(df_filtered)}"

    # Validar que todas las filas válidas tienen datos
    valid_rows = 0
    for idx, row in df_filtered.iterrows():

        def get_clean_value(val, default=None):
            if val is None or (isinstance(val, float) and pd.isna(val)):
                return default
            val_str = str(val).strip().lower()
            if val_str in ["nan", "none", "", "null"]:
                return default
            return val

        subject_code = get_clean_value(row.get("COD_ASIG", None))
        subject_name = get_clean_value(row.get("ASIGNATURA", None))

        if subject_code or subject_name:
            valid_rows += 1

    # Todas las filas válidas deberían tener datos
    assert valid_rows == 3, f"Debería haber 3 filas con datos, pero hay {valid_rows}"
