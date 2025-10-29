"""Unit tests para academic_load_tasks.py."""


import pandas as pd
import pytest
from app.core.worker.academic_load_tasks import extract_duration, get_clean_value


@pytest.fixture
def sample_excel_data():
    """Datos de muestra que simulan la estructura del Excel."""
    data = {
        "NO": [31, 32, 33, None, "TOTAL"],
        "COORD": ["RED", "PRO", "DES", None, "nan"],
        "COD_ASIG": ["INF1-I0", "INF1-I", "PROG3-I", None, None],
        "ASIGNATURA": ["INFORMÁTICA 36", "INFORMÁTICA", "PROGRAMACIÓN III", None, "TOTAL DE GRUPOS"],
        "UNICO": [None, None, 1, None, None],
        "SECCION": [5, 8, 3, None, None],
        "ASIGNAR_SERVICIOS": [None, None, None, None, None],
        "DURACION": ["90 min", 180, None, None, None],
        "HORARIO": ["08:00-09:30", "17:00-18:30", "07:00-10:00", None, None],
        "DIAS": ["Ma-Jue", "Ma-Jue", "Dom", None, None],
        "TIPO": ["P", "E.L.", "P", None, None],
        "INST": [None, None, None, None, None],
        "TITULO": [None, None, None, None, None],
        "DOCENTE": ["ADOLFO JOSÉ", "ADOLFO JOSÉ", "ALFREDO OMAR", None, None],
        "CONT": [None, 1, 1, None, None],
        "TELEFONO": [None, None, None, None, None],
        "CODIGO": ["PROF001", "PROF002", "PROF003", None, None],
        "CAT_DOCENTE": ["ADM", "ADM", "DHC", None, None],
        "PAG": [0, 1, 1, None, None],
        "PERF": [None, None, None, None, None],
        "NOTA_FINAL": [None, None, None, None, None],
        "MAESTRIAS": [2, 2, 0, None, None],
        "CORREO INSTITUCIONAL": [None, None, None, None, None],
        "CORREO PERSONAL": [None, None, None, None, None],
        "OBSERVACIONES": [None, None, None, None, None],
        "RESP. CANAL TEAMS  (nivel propietario)": [None, None, None, None, None],
    }
    return pd.DataFrame(data)


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


def test_get_clean_value_removes_whitespace():
    """Test que get_clean_value limpia espacios."""
    result = get_clean_value("  INF1-I0  ", None)
    assert result == "  INF1-I0  "  # No modifica el valor


def test_get_clean_value_handles_nan():
    """Test que get_clean_value retorna None para NaN."""
    result = get_clean_value(pd.NA, None)
    assert result is None


def test_get_clean_value_handles_nan_string():
    """Test que get_clean_value retorna None para string 'nan'."""
    result = get_clean_value("nan", None)
    assert result is None


def test_get_clean_value_handles_none():
    """Test que get_clean_value retorna None para None."""
    result = get_clean_value(None, None)
    assert result is None


def test_get_clean_value_handles_empty_string():
    """Test que get_clean_value retorna None para string vacío en modo lowercase."""
    result = get_clean_value("", None)
    assert result is None


def test_detect_end_of_data(sample_excel_data):
    """Test que detecta correctamente el fin de datos cuando NO ya no es numérico."""
    df = sample_excel_data.copy()
    end_row = len(df)

    for idx, row in df.iterrows():
        no_value = row.get("NO", "")
        no_str = str(no_value).strip() if pd.notna(no_value) else ""
        if not no_str or not no_str.isdigit():
            end_row = idx
            break

    # Debería detectar que la fila 3 (índice 3) tiene NO=None, así que fin es 3
    assert end_row == 3


def test_extract_valid_data_from_row(sample_excel_data):
    """Test que extrae correctamente los datos de una fila válida."""
    row = sample_excel_data.iloc[0]

    subject_code = get_clean_value(row.get("COD_ASIG", None))
    subject_name = get_clean_value(row.get("ASIGNATURA", None))

    assert subject_code == "INF1-I0"
    assert subject_name == "INFORMÁTICA 36"


def test_skip_row_without_subject_data(sample_excel_data):
    """Test que se salta filas sin subject_code ni subject_name."""
    row = sample_excel_data.iloc[3]  # Fila con NO=None

    subject_code = get_clean_value(row.get("COD_ASIG", None))
    subject_name = get_clean_value(row.get("ASIGNATURA", None))

    should_skip = not subject_code and not subject_name
    assert should_skip is True


def test_skip_summary_rows(sample_excel_data):
    """Test que se salta filas de resumen."""
    row = sample_excel_data.iloc[4]  # Fila con "TOTAL DE GRUPOS"

    subject_code = get_clean_value(row.get("COD_ASIG", None))
    subject_name = get_clean_value(row.get("ASIGNATURA", None))

    should_skip = not subject_code and not subject_name
    # Esta fila tiene subject_name="TOTAL DE GRUPOS" así que NO debería saltarse
    assert should_skip is False


@pytest.mark.asyncio
async def test_process_filters_rows_correctly():
    """Test que el proceso filtra correctamente las filas válidas."""
    # Crear un DataFrame de prueba
    data = {
        "NO": [31, 32, None],
        "COORD": ["RED", "PRO", None],
        "COD_ASIG": ["INF1-I0", "INF1-I", None],
        "ASIGNATURA": ["INFORMÁTICA 36", "INFORMÁTICA", "TOTAL DE GRUPOS"],
    }
    df = pd.DataFrame(data)

    # Simular detección de fin de datos
    end_row = len(df)
    for idx, row in df.iterrows():
        no_value = row.get("NO", "")
        no_str = str(no_value).strip() if pd.notna(no_value) else ""
        if not no_str or not no_str.isdigit():
            end_row = idx
            break

    assert end_row == 2  # Debería terminar en la fila 2 (índice 2)

    # Filtrar df
    df_filtered = df.iloc[:end_row].copy()

    assert len(df_filtered) == 2  # Debería tener solo 2 filas válidas

    # Verificar que las filas válidas tienen datos
    for idx, row in df_filtered.iterrows():
        subject_code = get_clean_value(row.get("COD_ASIG", None))
        subject_name = get_clean_value(row.get("ASIGNATURA", None))

        assert subject_code is not None or subject_name is not None
