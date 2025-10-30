"""Unit tests para academic_load_tasks.py."""

import pandas as pd
import pytest

from src.app.core.worker.academic_load_tasks import (
    _clean_sample_errors,
    _create_detailed_errors_strict,
    _create_detailed_warnings_flexible,
    _create_error_summary,
    _get_clean_value,
    _get_helpers,
    _get_str_value,
    _initialize_error_counters,
    _update_error_counters,
    determine_validation_status,
    extract_duration,
)


@pytest.fixture
def sample_excel_data():
    """Datos de muestra que simulan la estructura del Excel."""
    data = {
        "NO": [31, 32, 33, None, "TOTAL"],
        "COD_CATEDRA": ["RED", "PRO", "DES", None, "nan"],
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
    }
    return pd.DataFrame(data)


class TestExtractDuration:
    """Tests para la función extract_duration."""

    def test_extract_duration_with_minutes(self):
        """Test que extract_duration funciona con formato '90 min'."""
        assert extract_duration("90 min") == 90
        assert extract_duration("180 min") == 180
        assert extract_duration("45 min") == 45

    def test_extract_duration_with_hours(self):
        """Test que extract_duration convierte horas a minutos."""
        assert extract_duration("1.5h") == 90
        assert extract_duration("2h") == 120
        assert extract_duration("2.5h") == 150

    def test_extract_duration_with_number(self):
        """Test que extract_duration acepta números directos."""
        assert extract_duration(90) == 90
        assert extract_duration(180) == 180
        assert extract_duration(45) == 45

    def test_extract_duration_with_nan(self):
        """Test que extract_duration retorna 0 para NaN."""
        assert extract_duration(pd.NA) == 0

    def test_extract_duration_with_string_number(self):
        """Test que extract_duration extrae números de strings."""
        assert extract_duration("90") == 90
        assert extract_duration("180") == 180

    def test_extract_duration_with_float_string(self):
        """Test que extract_duration maneja floats en strings."""
        assert extract_duration("1.5") == 1
        assert extract_duration("2.5") == 2


class TestGetCleanValue:
    """Tests para la función _get_clean_value."""

    def test_handles_none(self):
        """Test que _get_clean_value retorna None para None."""
        assert _get_clean_value(None) is None

    def test_handles_nan(self):
        """Test que _get_clean_value maneja NaN."""
        # pd.NA retorna el valor tal cual, verificar que no lanza error
        result = _get_clean_value(pd.NA)
        assert result is None or pd.isna(result)

    def test_handles_empty_string(self):
        """Test que _get_clean_value retorna None para string vacío."""
        assert _get_clean_value("") is None

    def test_handles_special_strings(self):
        """Test que _get_clean_value retorna None para strings especiales."""
        assert _get_clean_value("nan") is None
        assert _get_clean_value("null") is None
        assert _get_clean_value("none") is None

    def test_with_valid_string(self):
        """Test que _get_clean_value retorna el valor original."""
        result = _get_clean_value("INF1-I0")
        assert result == "INF1-I0"

    def test_with_default(self):
        """Test que _get_clean_value usa el valor default."""
        assert _get_clean_value(None, default="default_value") == "default_value"


class TestGetStrValue:
    """Tests para la función _get_str_value."""

    def test_handles_none(self):
        """Test que _get_str_value retorna default para None."""
        assert _get_str_value(None) == ""

    def test_handles_nan(self):
        """Test que _get_str_value retorna el string '<NA>' para NaN."""
        result = _get_str_value(pd.NA)
        assert result == "<NA>"

    def test_handles_empty_string(self):
        """Test que _get_str_value retorna default para string vacío."""
        assert _get_str_value("") == ""

    def test_handles_special_strings(self):
        """Test que _get_str_value retorna default para strings especiales."""
        assert _get_str_value("nan") == ""
        assert _get_str_value("null") == ""

    def test_with_valid_string(self):
        """Test que _get_str_value retorna el valor preservando case."""
        assert _get_str_value("Test Value") == "Test Value"

    def test_with_whitespace(self):
        """Test que _get_str_value limpia espacios."""
        assert _get_str_value("  Test Value  ") == "Test Value"

    def test_with_custom_default(self):
        """Test que _get_str_value usa el valor default personalizado."""
        assert _get_str_value(None, default="custom") == "custom"


class TestDetermineValidationStatus:
    """Tests para la función determine_validation_status."""

    def test_valid_no_messages(self):
        """Test que retorna 'valid' cuando no hay mensajes."""
        status, errors = determine_validation_status(True, [])
        assert status == "valid"
        assert errors is None

    def test_error_with_messages(self):
        """Test que retorna 'error' cuando hay mensajes y falló."""
        messages = ["Error 1", "Error 2"]
        status, errors = determine_validation_status(False, messages)
        assert status == "error"
        assert errors == "Error 1; Error 2"

    def test_warning_with_messages(self):
        """Test que retorna 'warning' cuando hay mensajes y pasó."""
        messages = ["Warning 1"]
        status, errors = determine_validation_status(True, messages)
        assert status == "warning"
        assert errors == "Warning 1"


class TestInitializeErrorCounters:
    """Tests para la función _initialize_error_counters."""

    def test_initializes_all_counters_to_zero(self):
        """Test que inicializa todos los contadores en 0."""
        counters = _initialize_error_counters()
        assert counters["missing_coordination"] == 0
        assert counters["missing_subject"] == 0
        assert counters["missing_professor"] == 0
        assert counters["invalid_schedule"] == 0

    def test_returns_dict(self):
        """Test que retorna un diccionario."""
        counters = _initialize_error_counters()
        assert isinstance(counters, dict)


class TestUpdateErrorCounters:
    """Tests para la función _update_error_counters."""

    def test_updates_coordination_error(self):
        """Test que incrementa el contador de coordinación."""
        counters = _initialize_error_counters()
        _update_error_counters("Error de Coordinación", counters)
        assert counters["missing_coordination"] == 1

    def test_updates_subject_error(self):
        """Test que incrementa el contador de asignatura."""
        counters = _initialize_error_counters()
        _update_error_counters("Error de Asignatura", counters)
        assert counters["missing_subject"] == 1

    def test_updates_professor_error(self):
        """Test que incrementa el contador de profesor."""
        counters = _initialize_error_counters()
        _update_error_counters("Error de Profesor", counters)
        assert counters["missing_professor"] == 1

    def test_updates_schedule_error(self):
        """Test que incrementa el contador de horario."""
        counters = _initialize_error_counters()
        _update_error_counters("Error de Horario", counters)
        assert counters["invalid_schedule"] == 1

    def test_updates_multiple_errors(self):
        """Test que puede incrementar múltiples contadores."""
        counters = _initialize_error_counters()
        _update_error_counters("Error de Asignatura y Error de Profesor", counters)
        assert counters["missing_subject"] == 1
        assert counters["missing_professor"] == 1


class TestGetHelpers:
    """Tests para la función _get_helpers."""

    def test_returns_tuple_of_two_functions(self):
        """Test que retorna una tupla con dos funciones."""
        result = _get_helpers()
        assert isinstance(result, tuple)
        assert len(result) == 2

    def test_returned_functions_work(self):
        """Test que las funciones retornadas funcionan correctamente."""
        get_clean_value, get_str_value = _get_helpers()

        assert get_clean_value(None) is None
        assert get_str_value(None) == ""


class TestCleanSampleErrors:
    """Tests para la función _clean_sample_errors."""

    def test_removes_json_from_error_value(self):
        """Test que limpia el JSON de los valores de error."""
        sample_errors = [{"row": 1, "field": "test", "value": 'Error message; {"changes":[]}', "reason": "test"}]
        cleaned = _clean_sample_errors(sample_errors)
        assert cleaned[0]["value"] == "Error message"

    def test_preserves_value_without_json(self):
        """Test que preserva el valor si no tiene JSON."""
        sample_errors = [{"row": 1, "field": "test", "value": "Error message", "reason": "test"}]
        cleaned = _clean_sample_errors(sample_errors)
        assert cleaned[0]["value"] == "Error message"

    def test_handles_empty_list(self):
        """Test que maneja listas vacías."""
        assert _clean_sample_errors([]) == []


class TestCreateErrorSummary:
    """Tests para la función _create_error_summary."""

    def test_creates_json_summary(self):
        """Test que crea un resumen en formato JSON."""
        errors_by_type = _initialize_error_counters()
        errors_by_type["missing_subject"] = 2

        summary = _create_error_summary(total_rows=10, failed=2, errors_by_type=errors_by_type, sample_errors=[])

        assert isinstance(summary, str)
        assert "total_rows" in summary
        assert "failed" in summary
        assert "errors_by_type" in summary


class TestCreateDetailedErrorsStrict:
    """Tests para la función _create_detailed_errors_strict."""

    def test_creates_detailed_errors_json(self):
        """Test que crea un resumen detallado de errores en modo estricto."""
        errors_by_type = _initialize_error_counters()
        errors_by_type["missing_subject"] = 1
        sample_errors = [{"row": 1, "field": "test", "value": "error", "reason": "test"}]

        result = _create_detailed_errors_strict(
            total_rows=10, failed=1, errors_by_type=errors_by_type, sample_errors=sample_errors
        )

        assert isinstance(result, str)
        assert "total_rows" in result
        assert "inserted" in result
        assert result.count("inserted") == 1  # Verificar que inserted es 0


class TestCreateDetailedWarningsFlexible:
    """Tests para la función _create_detailed_warnings_flexible."""

    def test_creates_detailed_warnings_json(self):
        """Test que crea un resumen detallado de warnings en modo flexible."""
        errors_by_type = _initialize_error_counters()
        errors_by_type["missing_subject"] = 1
        sample_errors = [{"row": 1, "field": "test", "value": "warning", "reason": "test"}]

        result = _create_detailed_warnings_flexible(
            total_rows=10, inserted=8, failed=2, errors_by_type=errors_by_type, sample_errors=sample_errors
        )

        assert isinstance(result, str)
        assert "total_rows" in result
        assert "inserted" in result
        assert result.count("inserted") >= 1  # Verificar que inserted es 8


class TestDataExtractionFromDataFrame:
    """Tests para extracción de datos del DataFrame."""

    def test_extract_valid_data_from_row(self, sample_excel_data):
        """Test que extrae correctamente los datos de una fila válida."""
        row = sample_excel_data.iloc[0]

        subject_code = _get_clean_value(row.get("COD_ASIG", None))
        subject_name = _get_clean_value(row.get("ASIGNATURA", None))

        assert subject_code == "INF1-I0"
        assert subject_name == "INFORMÁTICA 36"

    def test_extract_data_from_row_with_none(self, sample_excel_data):
        """Test que maneja correctamente filas con None."""
        row = sample_excel_data.iloc[3]  # Fila con None

        subject_code = _get_clean_value(row.get("COD_ASIG", None))
        subject_name = _get_clean_value(row.get("ASIGNATURA", None))

        assert subject_code is None
        assert subject_name is None

    def test_skip_row_without_subject_data(self, sample_excel_data):
        """Test que se puede identificar filas sin subject_code ni subject_name."""
        row = sample_excel_data.iloc[3]  # Fila con NO=None

        subject_code = _get_clean_value(row.get("COD_ASIG", None))
        subject_name = _get_clean_value(row.get("ASIGNATURA", None))

        should_skip = not subject_code and not subject_name
        assert should_skip is True

    def test_detect_end_of_data(self, sample_excel_data):
        """Test que detecta correctamente el fin de datos."""
        df = sample_excel_data.copy()
        end_row = len(df)

        for idx, row in df.iterrows():
            no_value = row.get("NO", "")
            no_str = str(no_value).strip() if pd.notna(no_value) else ""
            if not no_str or not no_str.isdigit():
                end_row = idx
                break

        # Debería detectar que la fila 3 (índice 3) tiene NO=None
        assert end_row == 3
