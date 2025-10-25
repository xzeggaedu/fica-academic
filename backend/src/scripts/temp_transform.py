import re
from datetime import datetime, timedelta

# [NUEVO] Se importa 'Optional' para el nuevo parámetro
from typing import Any

import pandas as pd
from xlsxwriter.utility import xl_col_to_name as col_to_name

# --- 1. UTILIDADES (Sin cambios) ---


def remove_title(name: str) -> str:
    """Remueve títulos comunes (Dr., Lic., Msc., Profe., etc.) del nombre."""
    if not isinstance(name, str):
        return name
    titles_to_remove = r"^(Dr\.|Lic\.|Ing\.|Msc\.|Mtra\.|Profe\.|Prof\.)\s*"
    return re.sub(titles_to_remove, "", name, flags=re.IGNORECASE).strip()


def calculate_duration(time_range: str) -> str | None:
    """Calcula la duración en minutos."""
    time_range = str(time_range).strip()
    if "00:00-23:59" in time_range or "-" not in time_range:
        return None
    try:
        start_str, end_str = time_range.split("-")
        start_time = datetime.strptime(start_str, "%H:%M")
        end_time = datetime.strptime(end_str, "%H:%M")

        if end_time <= start_time:
            duration = (
                (datetime.strptime("23:59", "%H:%M") - start_time)
                + (end_time - datetime.strptime("00:00", "%H:%M"))
                + timedelta(minutes=1)
            )
        else:
            duration = end_time - start_time
        return f"{int(duration.total_seconds() / 60)} min"
    except Exception:
        return None


def robust_read_csv(file_path: str, use_cols: list[str]) -> pd.DataFrame:
    """Intenta leer un CSV probando varias codificaciones y delimitadores."""
    encodings = ["utf-8", "latin-1"]
    separators = [",", ";"]
    for encoding in encodings:
        for sep in separators:
            try:
                return pd.read_csv(file_path, encoding=encoding, sep=sep, usecols=use_cols)
            except Exception:
                continue

    print(f"Error fatal: No se pudo leer '{file_path}'. Verifique que las columnas {use_cols} existan.")
    return pd.DataFrame(columns=use_cols)


# --- 2. LECTURA Y LIMPIEZA DE DATOS ---


def load_db_materias() -> pd.DataFrame:
    """Carga y reporta el CSV de materias."""
    print("Cargando [catalog_subject.csv]...")
    # [MODIFICADO] Leemos 'id' porque ahora es crucial para el join
    subject_cols = ["id", "subject_code", "subject_name", "coordination_code"]
    df_materia = robust_read_csv("catalog_subject.csv", use_cols=subject_cols)
    print(f"Materias cargadas: {len(df_materia)}")
    return df_materia


def load_db_docentes() -> pd.DataFrame:
    """Carga el CSV de docentes (datos crudos)."""
    print("Cargando [catalog_professor.csv]...")
    professor_cols = ["id", "professor_name", "academic_title"]
    df_docente = robust_read_csv("catalog_professor.csv", use_cols=professor_cols)
    return df_docente


# --- [NUEVA FUNCIÓN] ---
def load_db_subject_school() -> pd.DataFrame:
    """Carga la tabla de relación entre materias y escuelas."""
    print("Cargando [subject_school.csv]...")
    link_cols = ["subject_id", "school_id"]
    df_link = robust_read_csv("subject_school.csv", use_cols=link_cols)
    df_link = df_link.drop_duplicates()
    print(f"Relaciones Materia-Escuela cargadas: {len(df_link)}")
    return df_link


# --- [FIN NUEVA FUNCIÓN] ---


def clean_db_docentes(df_docente_raw: pd.DataFrame) -> pd.DataFrame:
    """Limpia y transforma el DataFrame de docentes."""
    if df_docente_raw.empty:
        print("Docentes cargados (limpios): 0")
        return df_docente_raw

    df_docente = (
        df_docente_raw.assign(clean_name=lambda df: df["professor_name"].apply(remove_title))
        .rename(columns={"id": "ID_DOCENTE", "academic_title": "Titulo"})
        .loc[:, ["clean_name", "Titulo", "ID_DOCENTE"]]
        .drop_duplicates(subset=["clean_name"])
        .sort_values(by="clean_name")
        .reset_index(drop=True)
    )
    print(f"Docentes cargados (limpios): {len(df_docente)}")
    return df_docente


def load_and_clean_pl1(file_path: str) -> pd.DataFrame | None:
    """Carga y aplica la limpieza inicial al archivo Excel PL1."""
    print(f"--- 2. Cargando y Limpiando PL1 (Excel) desde: {file_path} ---")
    try:
        df_pl1 = pd.read_excel(file_path, header=1, sheet_name=0)
        df_pl1 = df_pl1.iloc[:, 1:].copy()
    except Exception as e:
        print(f"Error fatal al leer el archivo Excel: {e}")
        return None

    df_pl1.columns = df_pl1.columns.astype(str).str.strip().str.replace(".", "", regex=False)

    if "MATERIA" not in df_pl1.columns:
        print("Error: No se encontró la columna 'MATERIA' para realizar el filtro.")
        return None

    df_pl1 = (
        df_pl1.loc[df_pl1["MATERIA"].astype(str).str.strip() != "MATERIA"]
        .assign(CODIGO=lambda df: df["CODIGO"].astype(str).str.strip())
        .copy()
    )
    return df_pl1


# --- 3. LÓGICA DE TRANSFORMACIÓN (PIPELINE DECLARATIVO) ---
def _get_valid_subject_codes(
    df_materia: pd.DataFrame, df_school_link: pd.DataFrame, school_id: int | None
) -> list[str]:
    """Retorna la lista de 'subject_code' permitidos.

    Si 'school_id' se proporciona, filtra por esa escuela.
    """
    if school_id is None:
        print("Procesando todas las escuelas.")
        return df_materia["subject_code"].unique()

    print(f"Filtrando materias por school_id: {school_id}...")

    # 1. Encontrar los subject_id para la escuela dada
    valid_subject_ids = df_school_link[df_school_link["school_id"] == school_id]["subject_id"].unique()

    # 2. Filtrar el catálogo de materias usando esos subject_id
    df_filtered_materia = df_materia[df_materia["id"].isin(valid_subject_ids)]

    # 3. Retornar los 'subject_code' (CODIGO) de esas materias
    valid_codigos = df_filtered_materia["subject_code"].unique()

    print(f"Materias (subject_code) encontradas para esta escuela: {len(valid_codigos)}")
    return valid_codigos


def _filter_by_codigos(df: pd.DataFrame, valid_codigos: list[str]) -> pd.DataFrame:
    """Filtra el DF principal por los códigos de materia válidos."""

    original_count = len(df)
    filtered_df = df[df["CODIGO"].isin(valid_codigos)].copy()
    removed_count = original_count - len(filtered_df)

    if removed_count > 0:
        print(f"Filtrado PL1: {removed_count} filas eliminadas por no coincidir con los códigos de escuela/materia.")

    return filtered_df


# --- [FIN DE MODIFICACIONES] ---


def _melt_days(df: pd.DataFrame) -> pd.DataFrame:
    """Transforma el DataFrame de ancho (días en columnas) a largo."""
    id_cols_base = [
        "CODIGO",
        "MATERIA",
        "SEC",
        "CRIT",
        "COD",
        "PROY",
        "HORAS",
        "AULA TEAMS (SI/NO)",
        "MODALIDAD",
        "CAMBIOS",
    ]
    day_cols_base = ["LUNES", "MARTES", "MIERC", "JUEVES", "VIERNES", "SABADO", "DOMINGO"]

    id_cols = [col for col in id_cols_base if col in df.columns]
    day_cols = [col for col in day_cols_base if col in df.columns]

    return df.melt(id_vars=id_cols, value_vars=day_cols, var_name="DIA_COMPLETO", value_name="MARCA_DIA")


def _filter_active_days(df: pd.DataFrame) -> pd.DataFrame:
    """Filtra solo las filas que tienen marcada la 'S'."""
    return df[df["MARCA_DIA"].astype(str).str.upper() == "S"].copy()


def _merge_subject_data(df: pd.DataFrame, df_materia: pd.DataFrame) -> pd.DataFrame:
    """Cruza con la información de la materia (nombre y cátedra)."""
    # [MODIFICADO] Se quita 'id' de la selección, ya no se necesita aquí
    return df.merge(
        df_materia[["subject_code", "subject_name", "coordination_code"]],
        left_on="CODIGO",
        right_on="subject_code",
        how="inner",
    )


def _add_calculated_cols(df: pd.DataFrame) -> pd.DataFrame:
    """Añade columnas calculadas (Duración, Día Abreviado)."""
    day_map = {
        "LUNES": "Lu",
        "MARTES": "Ma",
        "MIERC": "Mi",
        "JUEVES": "Ju",
        "VIERNES": "Vi",
        "SABADO": "Sa",
        "DOMINGO": "Do",
    }

    return df.assign(
        DURACION=lambda df: df["HORAS"].apply(calculate_duration), DIA_ABREV=lambda df: df["DIA_COMPLETO"].map(day_map)
    )


def _aggregate_days(df: pd.DataFrame) -> pd.DataFrame:
    """Agrupa por materia/sección para crear la cadena 'Lu-Ma-Mi'."""
    group_keys = ["CODIGO", "HORAS", "SEC"]

    df_dias = (
        df.sort_values(by=group_keys + ["DIA_ABREV"])
        .groupby(group_keys)
        .agg(DIAS=("DIA_ABREV", lambda x: "-".join(x.unique())))
        .reset_index()
    )

    df_base = df.drop_duplicates(subset=group_keys)

    return df_base.merge(df_dias, on=group_keys, how="left")


def _structure_final_df(df: pd.DataFrame) -> pd.DataFrame:
    """Renombra, añade columnas vacías y ordena para el PL2 final."""
    final_columns_order = [
        "No",
        "COD_CATE",
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

    df_renamed = df.rename(
        columns={
            "subject_name": "ASIGNATURA",
            "coordination_code": "COD_CATE",
            "CODIGO": "COD_ASIG",
            "HORAS": "HORARIO",
            "MODALIDAD": "MODALIDAD",
            "SEC": "SECCION",
        }
    )

    df_final = df_renamed.assign(No=range(1, len(df_renamed) + 1), TIT="", DOCENTE="", ID_DOCENTE="")

    return df_final.reindex(columns=final_columns_order)


# --- [FUNCIÓN MODIFICADA] ---
def transform_pl1_to_pl2(
    df_pl1: pd.DataFrame, df_materia: pd.DataFrame, df_school_link: pd.DataFrame, school_id: int | None
) -> pd.DataFrame:
    """Pipeline declarativo que transforma los datos de PL1 al formato PL2, filtrando opcionalmente por
    school_id."""
    print("--- 3. Filtrado (JOIN con DB) y Transformación ---")

    # 1. Determinar qué 'CODIGOS' (subject_code) son válidos
    valid_codigos = _get_valid_subject_codes(df_materia, df_school_link, school_id)

    # 2. Ejecutar el pipeline
    df_pl2 = (
        df_pl1.pipe(_filter_by_codigos, valid_codigos=valid_codigos)  # <-- FILTRO APLICADO
        .pipe(_melt_days)
        .pipe(_filter_active_days)
        .pipe(_merge_subject_data, df_materia=df_materia)
        .pipe(_add_calculated_cols)
        .pipe(_aggregate_days)
        .pipe(_structure_final_df)
    )

    return df_pl2


# --- [FIN DE MODIFICACIÓN] ---


# --- 4. EXPORTACIÓN Y FORMATO DE EXCEL (Sin cambios) ---
# ... (El bloque de _define_excel_formats y el resto de funciones de
#      exportación permanecen exactamente iguales) ...


def _define_excel_formats(workbook: Any) -> dict[str, Any]:
    """Define todos los formatos de celda en un diccionario declarativo."""
    header = workbook.add_format(
        {
            "bold": True,
            "valign": "vcenter",
            "fg_color": "#8B1539",
            "font_color": "#FFFFFF",
            "border": 1,
            "align": "center",
            "text_wrap": True,
            "font_size": 14,
            "locked": True,
        }
    )
    unlocked_center = workbook.add_format({"font_size": 14, "valign": "vcenter", "locked": False, "align": "center"})
    unlocked_left = workbook.add_format({"font_size": 14, "valign": "vcenter", "locked": False, "align": "left"})
    locked_center = workbook.add_format(
        {"font_size": 14, "valign": "vcenter", "locked": True, "fg_color": "#F2F2F2", "align": "center"}
    )
    locked_left = workbook.add_format(
        {"font_size": 14, "valign": "vcenter", "locked": True, "fg_color": "#F2F2F2", "align": "left"}
    )  # Corregido color

    return {
        "header": header,
        "unlocked_center": unlocked_center,
        "unlocked_left": unlocked_left,
        "locked_center": locked_center,
        "locked_left": locked_left,
    }


def _get_column_settings(formats: dict[str, Any]) -> dict[str, dict[str, Any]]:
    """Define las propiedades (ancho, formato, fórmulas) de cada columna."""
    return {
        "No": {"width": 5, "format": formats["locked_center"]},
        "COD_CATE": {"width": 12, "format": formats["unlocked_center"]},
        "COD_ASIG": {"width": 12, "format": formats["unlocked_center"]},
        "ASIGNATURA": {"width": 60, "format": formats["unlocked_left"]},
        "SECCION": {"width": 10, "format": formats["unlocked_center"]},
        "HORARIO": {"width": 15, "format": formats["unlocked_center"]},
        "DURACION": {"width": 12, "format": formats["unlocked_center"]},
        "DIAS": {"width": 25, "format": formats["unlocked_left"]},
        "MODALIDAD": {"width": 16, "format": formats["unlocked_left"]},
        "TIT": {
            "width": 6,
            "format": formats["locked_left"],
            "formula_template": '=IFERROR(VLOOKUP(DOCENTE_CELL,VLOOKUP_RANGE,2,FALSE),"")',
        },
        "DOCENTE": {"width": 40, "format": formats["unlocked_left"]},
        "ID_DOCENTE": {
            "width": 15,
            "format": formats["locked_center"],
            "formula_template": '=IFERROR(VLOOKUP(DOCENTE_CELL,VLOOKUP_RANGE,3,FALSE),"")',
            "hidden": True,
        },
    }


def _write_docentes_sheet(writer: pd.ExcelWriter, df_docente: pd.DataFrame):
    """Escribe la hoja 'Docentes_Lista'."""
    df_docente.to_excel(
        writer, sheet_name="Docentes_Lista", index=False, header=["DOCENTE (Clave)", "TITULO", "ID_DOCENTE"]
    )
    ws_docentes = writer.sheets["Docentes_Lista"]
    ws_docentes.set_column("A:A", 30)
    ws_docentes.set_column("B:B", 15)
    ws_docentes.set_column("C:C", 15)


def _write_pl2_sheet(writer: pd.ExcelWriter, df_pl2: pd.DataFrame, df_docente: pd.DataFrame):
    """Escribe y formatea la hoja principal 'PL2_Horarios'."""
    workbook = writer.book
    worksheet = workbook.add_worksheet("PL2_Horarios")

    formats = _define_excel_formats(workbook)
    col_settings = _get_column_settings(formats)
    final_columns = list(df_pl2.columns)

    num_rows = len(df_pl2)
    docentes_count = len(df_docente)
    vlookup_range = f"Docentes_Lista!$A$2:$C${docentes_count + 1}"

    # Escribir encabezado
    for col_idx, col_name in enumerate(final_columns):
        worksheet.write(0, col_idx, col_name, formats["header"])

    docente_col_idx = final_columns.index("DOCENTE")

    for row_idx, data_row in enumerate(df_pl2.itertuples(index=False), start=1):
        docente_cell_ref = f"{col_to_name(docente_col_idx)}{row_idx + 1}"

        for col_idx, col_name in enumerate(final_columns):
            settings = col_settings.get(col_name, {})
            cell_format = settings.get("format", formats["unlocked_left"])

            if "formula_template" in settings:
                formula = (
                    settings["formula_template"]
                    .replace("DOCENTE_CELL", docente_cell_ref)
                    .replace("VLOOKUP_RANGE", vlookup_range)
                )
                worksheet.write_formula(row_idx, col_idx, formula, cell_format)
            elif col_name == "DOCENTE":
                worksheet.write_blank(row_idx, col_idx, None, cell_format)
            else:
                worksheet.write(row_idx, col_idx, data_row[col_idx], cell_format)

    # Aplicar anchos de columna
    for col_idx, col_name in enumerate(final_columns):
        settings = col_settings.get(col_name, {})
        width = settings.get("width", 15)
        options = {"hidden": True} if settings.get("hidden", False) else {}
        worksheet.set_column(col_idx, col_idx, width, None, options)

    # Aplicar altura de filas
    worksheet.set_row(0, 30)
    if num_rows > 0:
        for row_index in range(1, num_rows + 1):
            worksheet.set_row(row_index, 30)

    # Aplicar Data Validation (Dropdown)
    if num_rows > 0:
        docentes_dropdown_formula = f"=Docentes_Lista!$A$2:$A${docentes_count + 1}"
        worksheet.data_validation(
            1, docente_col_idx, num_rows, docente_col_idx, {"validate": "list", "source": docentes_dropdown_formula}
        )

    worksheet.protect()


def export_pl2_to_excel(df_pl2_export: pd.DataFrame, df_docente: pd.DataFrame, output_file_name: str):
    """Orquestador de la escritura del archivo Excel."""
    print(f"--- 5. Generando archivo {output_file_name} con formato final ---")

    try:
        with pd.ExcelWriter(output_file_name, engine="xlsxwriter") as writer:
            _write_pl2_sheet(writer, df_pl2_export, df_docente)
            _write_docentes_sheet(writer, df_docente)

        print("\n✅ Proceso completado con éxito. ¡Formato final aplicado! 🎉")
        print(f"Archivo guardado como '{output_file_name}'.")

        if len(df_pl2_export) == 0:
            print("\n⚠️ Advertencia: El archivo final no contiene filas.")
            print("   Esto puede ser normal si el 'school_id' no tiene materias en el Excel de entrada.")

    except Exception as e:
        print(f"\n❌ Error al guardar el archivo Excel: {e}")
        print("Asegúrate de que el archivo no esté abierto por otro programa.")


# --- 5. FUNCIÓN PRINCIPAL (ORQUESTADOR) ---


# --- [FUNCIÓN MODIFICADA] ---
def process_and_generate_pl2(
    file_path_pl1: str,
    school_id: int | None = None,  # <-- [NUEVO] Parámetro opcional
    output_file_name: str = "PL2_Final_Export.xlsx",
):
    """Orquesta el proceso completo de ETL (Extract, Transform, Load) y la generación del archivo Excel formateado.

    Args:
        file_path_pl1: Ruta al archivo Excel 'PL1' de entrada.
        school_id: (Opcional) ID de la escuela para filtrar. Si es None,
                   procesa todas las materias.
        output_file_name: Nombre del archivo Excel de salida.
    """
    # 1. EXTRACT (Cargar datos)
    print("--- 1. Cargando datos de la Base de Datos desde archivos CSV ---")
    df_materia = load_db_materias()
    df_docente_raw = load_db_docentes()
    df_school_link = load_db_subject_school()  # <-- [NUEVO] Cargar la relación

    # 2. TRANSFORM (Limpiar y transformar)
    df_docente = clean_db_docentes(df_docente_raw)

    if df_materia.empty or df_docente.empty or df_school_link.empty:
        print("Error: No se pudieron cargar los datos de la DB (Materias, Docentes o Relación Escuela). Abortando.")
        return

    df_pl1_cleaned = load_and_clean_pl1(file_path_pl1)
    if df_pl1_cleaned is None:
        print("Error: No se pudo cargar el archivo PL1. Abortando.")
        return

    # [MODIFICADO] Pasa los nuevos datos a la función de transformación
    df_pl2_final = transform_pl1_to_pl2(df_pl1_cleaned, df_materia, df_school_link, school_id)

    # 3. LOAD (Exportar a Excel)
    export_pl2_to_excel(df_pl2_final, df_docente, output_file_name)


# --- [FIN DE MODIFICACIÓN] ---


# --- 6. EJECUCIÓN EN EL NOTEBOOK ---

# 🛑 IMPORTANTE: Asegúrate de que esta ruta sea correcta.
FILE_PATH_PL1 = "GENERAL (REVISADO CON EL DOCTOR).xlsx"

# --- EJEMPLOS DE CÓMO LLAMAR LA FUNCIÓN ---

# Para ejecutar el reporte filtrando SOLO por la escuela con ID = 1:
# process_and_generate_pl2(FILE_PATH_PL1, school_id=1, output_file_name='PL2_Escuela_1.xlsx')

# Para ejecutar el reporte filtrando SOLO por la escuela con ID = 2:
# process_and_generate_pl2(FILE_PATH_PL1, school_id=2, output_file_name='PL2_Escuela_2.xlsx')

# Para ejecutar el reporte para TODAS las escuelas (comportamiento original):
# process_and_generate_pl2(FILE_PATH_PL1, school_id=None, output_file_name='PL2_Todas_Escuelas.xlsx')

# (Descomenta la línea que desees ejecutar)
