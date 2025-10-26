"""Transformación de plantillas PL1 a PL2 usando datos reales de la base de datos."""

import re
from datetime import datetime, timedelta
from typing import Any

import pandas as pd
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from xlsxwriter.utility import xl_col_to_name as col_to_name

from ...models.catalog_professor import CatalogProfessor
from ...models.catalog_subject import CatalogSubject
from ...models.faculty import Faculty
from ...models.school import School
from ...models.subject_school import SubjectSchool

# --- 1. UTILIDADES ---


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


def validate_pl1_format(file_path: str) -> bool:
    """Valida que el archivo Excel tenga el formato PL1 esperado."""
    try:
        df = pd.read_excel(file_path, header=1, sheet_name=0)

        # Normalizar nombres de columnas (remover puntos y espacios extra)
        df.columns = df.columns.astype(str).str.strip().str.replace(".", "", regex=False)

        required_columns = ["MATERIA", "CODIGO", "SEC", "HORAS", "MODALIDAD"]
        day_columns = ["LUNES", "MARTES", "MIERC", "JUEVES", "VIERNES", "SABADO", "DOMINGO"]

        # Verificar columnas requeridas
        missing_cols = [col for col in required_columns if col not in df.columns]
        if missing_cols:
            print(f"❌ Columnas faltantes en PL1: {missing_cols}")
            print(f"📋 Columnas disponibles: {list(df.columns)}")
            return False

        # Verificar al menos algunos días de la semana
        day_cols_found = [col for col in day_columns if col in df.columns]
        if len(day_cols_found) < 3:  # Mínimo 3 días
            print(f"❌ Días de la semana insuficientes. Encontrados: {day_cols_found}")
            return False

        print(f"✅ Formato PL1 válido. Días encontrados: {day_cols_found}")
        return True
    except Exception as e:
        print(f"❌ Error validando formato PL1: {e}")
        return False


def generate_output_filename(school_acronym: str, upload_date: datetime) -> str:
    """Genera nombre de archivo: carga_{cod_escuela}_{fecha-creacion}.xlsx"""
    date_str = upload_date.strftime("%Y%m%d_%H%M%S")
    return f"carga_{school_acronym}_{date_str}.xlsx"


# --- 2. CARGA DE DATOS DESDE BASE DE DATOS ---


async def load_db_materias(db: AsyncSession, school_id: int) -> pd.DataFrame:
    """Carga materias filtradas por school_id desde la base de datos."""
    print(f"📚 Cargando materias para school_id: {school_id}...")

    query = (
        select(
            CatalogSubject.id,
            CatalogSubject.subject_code,
            CatalogSubject.subject_name,
            CatalogSubject.coordination_code,
        )
        .select_from(
            CatalogSubject.__table__.join(SubjectSchool.__table__, CatalogSubject.id == SubjectSchool.subject_id)
        )
        .where(
            SubjectSchool.school_id == school_id, CatalogSubject.is_active.is_(True), CatalogSubject.deleted.is_(False)
        )
    )

    result = await db.execute(query)
    rows = result.fetchall()

    df_materia = pd.DataFrame(rows, columns=["id", "subject_code", "subject_name", "coordination_code"])
    print(f"✅ Materias cargadas: {len(df_materia)}")
    return df_materia


async def load_db_docentes(db: AsyncSession) -> pd.DataFrame:
    """Carga todos los docentes activos desde la base de datos."""
    print("👨‍🏫 Cargando docentes...")

    query = select(CatalogProfessor.id, CatalogProfessor.professor_name, CatalogProfessor.academic_title).where(
        CatalogProfessor.is_active.is_(True), CatalogProfessor.deleted.is_(False)
    )

    result = await db.execute(query)
    rows = result.fetchall()

    df_docente = pd.DataFrame(rows, columns=["id", "professor_name", "academic_title"])
    print(f"✅ Docentes cargados: {len(df_docente)}")
    return df_docente


async def load_school_info(db: AsyncSession, school_id: int) -> dict[str, str]:
    """Carga información de la escuela (nombre, acrónimo, facultad)."""
    print(f"🏫 Cargando información de escuela ID: {school_id}...")

    query = (
        select(School.name, School.acronym, Faculty.name.label("faculty_name"))
        .select_from(School.__table__.join(Faculty.__table__, School.fk_faculty == Faculty.id))
        .where(School.id == school_id)
    )

    result = await db.execute(query)
    row = result.fetchone()

    if not row:
        raise ValueError(f"Escuela con ID {school_id} no encontrada")

    school_info = {"name": row.name, "acronym": row.acronym, "faculty_name": row.faculty_name}

    print(f"✅ Escuela: {school_info['name']} ({school_info['acronym']}) - Facultad: {school_info['faculty_name']}")
    return school_info


# --- 3. LIMPIEZA Y TRANSFORMACIÓN DE DATOS ---


def clean_db_docentes(df_docente_raw: pd.DataFrame) -> pd.DataFrame:
    """Limpia y transforma el DataFrame de docentes."""
    if df_docente_raw.empty:
        print("⚠️ Docentes cargados (limpios): 0")
        return df_docente_raw

    df_docente = (
        df_docente_raw.assign(clean_name=lambda df: df["professor_name"].apply(remove_title))
        .rename(columns={"id": "ID_DOCENTE", "academic_title": "Titulo"})
        .loc[:, ["clean_name", "Titulo", "ID_DOCENTE"]]
        .drop_duplicates(subset=["clean_name"])
        .sort_values(by="clean_name")
        .reset_index(drop=True)
    )
    print(f"✅ Docentes cargados (limpios): {len(df_docente)}")
    return df_docente


def load_and_clean_pl1(file_path: str) -> pd.DataFrame | None:
    """Carga y aplica la limpieza inicial al archivo Excel PL1."""
    print(f"📄 Cargando y limpiando PL1 desde: {file_path}")
    try:
        df_pl1 = pd.read_excel(file_path, header=1, sheet_name=0)
        df_pl1 = df_pl1.iloc[:, 1:].copy()
    except Exception as e:
        print(f"❌ Error fatal al leer el archivo Excel: {e}")
        return None

    # Normalizar nombres de columnas (igual que en validate_pl1_format)
    df_pl1.columns = df_pl1.columns.astype(str).str.strip().str.replace(".", "", regex=False)

    if "MATERIA" not in df_pl1.columns:
        print("❌ Error: No se encontró la columna 'MATERIA' para realizar el filtro.")
        return None

    df_pl1 = (
        df_pl1.loc[df_pl1["MATERIA"].astype(str).str.strip() != "MATERIA"]
        .assign(CODIGO=lambda df: df["CODIGO"].astype(str).str.strip())
        .copy()
    )

    print(f"✅ PL1 cargado y limpiado: {len(df_pl1)} filas")
    return df_pl1


# --- 4. LÓGICA DE TRANSFORMACIÓN ---


def _get_valid_subject_codes(df_materia: pd.DataFrame) -> list[str]:
    """Retorna la lista de 'subject_code' permitidos para la escuela."""
    valid_codigos = df_materia["subject_code"].unique()
    print(f"📋 Códigos de materia válidos para esta escuela: {len(valid_codigos)}")
    return valid_codigos


def _filter_by_codigos(df: pd.DataFrame, valid_codigos: list[str]) -> pd.DataFrame:
    """Filtra el DF principal por los códigos de materia válidos."""
    original_count = len(df)
    filtered_df = df[df["CODIGO"].isin(valid_codigos)].copy()
    removed_count = original_count - len(filtered_df)

    if removed_count > 0:
        print(f"🔍 Filtrado PL1: {removed_count} filas eliminadas por no coincidir con los códigos de escuela/materia.")

    print(f"✅ Filas después del filtrado: {len(filtered_df)}")
    return filtered_df


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

    melted_df = df.melt(id_vars=id_cols, value_vars=day_cols, var_name="DIA_COMPLETO", value_name="MARCA_DIA")

    print(f"🔄 Transformación ancho→largo: {len(df)} → {len(melted_df)} filas")
    return melted_df


def _filter_active_days(df: pd.DataFrame) -> pd.DataFrame:
    """Filtra solo las filas que tienen marcada la 'S'."""
    filtered_df = df[df["MARCA_DIA"].astype(str).str.upper() == "S"].copy()
    print(f"📅 Días activos filtrados: {len(filtered_df)} filas")
    return filtered_df


def _merge_subject_data(df: pd.DataFrame, df_materia: pd.DataFrame) -> pd.DataFrame:
    """Cruza con la información de la materia (nombre y cátedra)."""
    merged_df = df.merge(
        df_materia[["id", "subject_code", "subject_name", "coordination_code"]],
        left_on="CODIGO",
        right_on="subject_code",
        how="inner",
    )
    print(f"🔗 Merge con datos de materias: {len(merged_df)} filas")
    return merged_df


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

    df_with_calc = df.assign(
        DURACION=lambda df: df["HORAS"].apply(calculate_duration), DIA_ABREV=lambda df: df["DIA_COMPLETO"].map(day_map)
    )

    print("🧮 Columnas calculadas añadidas: DURACION, DIA_ABREV")
    return df_with_calc


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
    aggregated_df = df_base.merge(df_dias, on=group_keys, how="left")

    print(f"📊 Agregación de días completada: {len(aggregated_df)} filas")
    return aggregated_df


def _structure_final_df(df: pd.DataFrame) -> pd.DataFrame:
    """Renombra, añade columnas vacías y ordena para el PL2 final."""
    final_columns_order = [
        "No",
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

    df_renamed = df.rename(
        columns={
            "subject_name": "ASIGNATURA",
            "coordination_code": "COD_CATE",
            "id": "SUBJECT_ID",
            "CODIGO": "COD_ASIG",
            "HORAS": "HORARIO",
            "MODALIDAD": "MODALIDAD",
            "SEC": "SECCION",
        }
    )

    df_final = df_renamed.assign(No=range(1, len(df_renamed) + 1), TIT="", DOCENTE="", ID_DOCENTE="")

    final_df = df_final.reindex(columns=final_columns_order)
    print(f"📋 Estructura final PL2: {len(final_df)} filas, {len(final_columns_order)} columnas")
    return final_df


def transform_pl1_to_pl2(df_pl1: pd.DataFrame, df_materia: pd.DataFrame) -> pd.DataFrame:
    """Pipeline declarativo que transforma los datos de PL1 al formato PL2, filtrando por las materias de la
    escuela específica."""
    print("🔄 Iniciando transformación PL1 → PL2...")

    # 1. Determinar qué 'CODIGOS' (subject_code) son válidos
    valid_codigos = _get_valid_subject_codes(df_materia)

    # 2. Ejecutar el pipeline
    df_pl2 = (
        df_pl1.pipe(_filter_by_codigos, valid_codigos=valid_codigos)
        .pipe(_melt_days)
        .pipe(_filter_active_days)
        .pipe(_merge_subject_data, df_materia=df_materia)
        .pipe(_add_calculated_cols)
        .pipe(_aggregate_days)
        .pipe(_structure_final_df)
    )

    print(f"✅ Transformación completada: {len(df_pl2)} filas finales")
    return df_pl2


# --- 5. EXPORTACIÓN Y FORMATO DE EXCEL ---


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
    )

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
        "COD_CATE": {"width": 12, "format": formats["locked_center"]},
        "SUBJECT_ID": {
            "width": 15,
            "format": formats["locked_center"],
            "hidden": True,
        },
        "COD_ASIG": {"width": 12, "format": formats["locked_center"]},
        "ASIGNATURA": {"width": 60, "format": formats["locked_left"]},
        "SECCION": {"width": 10, "format": formats["locked_center"]},
        "HORARIO": {"width": 15, "format": formats["locked_center"]},
        "DURACION": {"width": 12, "format": formats["locked_center"]},
        "DIAS": {"width": 25, "format": formats["locked_left"]},
        "MODALIDAD": {"width": 16, "format": formats["locked_left"]},
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


def export_pl2_to_excel(df_pl2_export: pd.DataFrame, df_docente: pd.DataFrame, output_file_path: str):
    """Orquestador de la escritura del archivo Excel."""
    print(f"📊 Generando archivo Excel: {output_file_path}")

    try:
        with pd.ExcelWriter(output_file_path, engine="xlsxwriter") as writer:
            _write_pl2_sheet(writer, df_pl2_export, df_docente)
            _write_docentes_sheet(writer, df_docente)

        print(f"✅ Archivo Excel generado exitosamente: {output_file_path}")

        if len(df_pl2_export) == 0:
            print("⚠️ Advertencia: El archivo final no contiene filas.")
            print("   Esto puede ser normal si la escuela no tiene materias en el Excel de entrada.")

    except Exception as e:
        print(f"❌ Error al guardar el archivo Excel: {e}")
        raise


# --- 6. FUNCIÓN PRINCIPAL (ORQUESTADOR) ---


async def process_and_generate_pl2(file_path_pl1: str, school_id: int, db: AsyncSession, output_file_path: str) -> str:
    """Orquesta el proceso completo de ETL (Extract, Transform, Load) y la generación del archivo Excel formateado
    usando datos reales de la DB.

    Args:
        file_path_pl1: Ruta al archivo Excel 'PL1' de entrada.
        school_id: ID de la escuela para filtrar materias.
        db: Sesión de base de datos.
        output_file_path: Ruta completa del archivo Excel de salida.

    Returns:
        str: Ruta del archivo generado.

    Raises:
        ValueError: Si el formato PL1 no es válido o no se encuentran datos.
    """
    print(f"🚀 Iniciando proceso de transformación para escuela ID: {school_id}")

    # 1. VALIDAR FORMATO PL1
    if not validate_pl1_format(file_path_pl1):
        raise ValueError("El archivo no tiene el formato PL1 esperado")

    # 2. EXTRACT (Cargar datos desde DB)
    print("📚 Cargando datos desde la base de datos...")
    df_materia = await load_db_materias(db, school_id)
    df_docente_raw = await load_db_docentes(db)
    school_info = await load_school_info(db, school_id)

    if df_materia.empty:
        raise ValueError(f"No se encontraron materias para la escuela ID {school_id}")

    if df_docente_raw.empty:
        raise ValueError("No se encontraron docentes en la base de datos")

    # 3. TRANSFORM (Limpiar y transformar)
    print("🔄 Transformando datos...")
    df_docente = clean_db_docentes(df_docente_raw)

    df_pl1_cleaned = load_and_clean_pl1(file_path_pl1)
    if df_pl1_cleaned is None:
        raise ValueError("No se pudo cargar el archivo PL1")

    # 4. TRANSFORM (Pipeline de transformación)
    df_pl2_final = transform_pl1_to_pl2(df_pl1_cleaned, df_materia)

    if df_pl2_final.empty:
        error_msg = (
            "No se generaron datos después de la transformación. "
            "Verifique que las materias del Excel coincidan con las de la escuela."
        )
        raise ValueError(error_msg)

    # 5. LOAD (Exportar a Excel)
    export_pl2_to_excel(df_pl2_final, df_docente, output_file_path)

    print(f"🎉 Proceso completado exitosamente para escuela: {school_info['name']} ({school_info['acronym']})")
    return output_file_path
