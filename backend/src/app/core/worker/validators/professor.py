"""Validador de profesores."""

from sqlalchemy import select

from ....models.catalog_professor import CatalogProfessor
from ..normalizers.titles import normalize_academic_title
from .base import BaseValidator, ValidationLevel, ValidationResult, calculate_similarity


def safe_str(value) -> str:
    """Convierte un valor a string de forma segura."""
    import math

    if value is None:
        return ""
    if isinstance(value, float):
        # NaN check: value != value es True solo para NaN
        if math.isnan(value):
            return ""
        return str(value).strip()
    if not value:  # Empty string, False, 0, etc.
        return ""
    return str(value).strip()


class ProfessorValidator(BaseValidator):
    """Valida profesores contra catálogo.

    Valida en orden:
    1. professor_name (DOCENTE)
    2. academic_title (TITULO)
    3. professor_id (CODIGO)

    Si alguno falla, marca fallido y guarda el error en notes.
    """

    async def validate(self, db, data: dict) -> list[ValidationResult]:
        """Validar DOCENTE, TITULO y CODIGO contra catalog_professor.

        Reglas:
        1. Buscar por DOCENTE (nombre) - requiere coincidencia exacta o alta similitud
        2. Si encuentra, validar TITULO (título académico) - debe coincidir
        3. Si encuentra, validar CODIGO (professor_id) - debe coincidir
        4. Si cualquier validación falla, agregar error
        """
        results = []

        # Extraer campos del Excel
        professor_name = safe_str(data.get("DOCENTE", ""))
        academic_title = safe_str(data.get("TITULO", ""))
        professor_id = safe_str(data.get("CODIGO", ""))

        # Si el nombre está vacío, error
        if not professor_name:
            level = ValidationLevel.ERROR if self.strict_mode else ValidationLevel.WARNING
            results.append(
                ValidationResult(
                    level=level,
                    message="Profesor: Nombre (DOCENTE) vacío",
                    field="DOCENTE",
                    actual="",
                )
            )
            return results

        # Buscar el profesor por nombre (requiere coincidencia exacta o alta similitud)
        result = await db.execute(
            select(CatalogProfessor)
            .where(CatalogProfessor.professor_name == professor_name)
            .where((CatalogProfessor.deleted.is_(False)) | (CatalogProfessor.deleted.is_(None)))
        )
        catalog_professor = result.scalar_one_or_none()

        # Si no encuentra por nombre exacto, buscar por similitud
        if not catalog_professor:
            # Buscar todos los profesores activos y no eliminados
            result = await db.execute(
                select(CatalogProfessor).where(
                    (CatalogProfessor.deleted.is_(False)) | (CatalogProfessor.deleted.is_(None))
                )
            )
            all_professors = result.scalars().all()

            # Buscar el más similar
            best_match = None
            best_similarity = 0
            for prof in all_professors:
                similarity = calculate_similarity(professor_name, prof.professor_name)
                if similarity > best_similarity:
                    best_similarity = similarity
                    best_match = prof

            # Si encuentra similitud >= 85%, considerar match
            if best_match and best_similarity >= 0.85:
                catalog_professor = best_match
                # Si hay similitud alta pero no exacta, agregar warning
                if best_similarity < 1.0:
                    results.append(
                        ValidationResult(
                            level=ValidationLevel.WARNING,
                            message=(
                                f"Profesor: Nombre similar pero no exacto. "
                                f"Esperado '{best_match.professor_name}', "
                                f"encontrado '{professor_name}' (similitud: {int(best_similarity * 100)}%)"
                            ),
                            field="DOCENTE",
                            expected=best_match.professor_name,
                            actual=professor_name,
                        )
                    )
            else:
                # No encontró el profesor
                level = ValidationLevel.ERROR if self.strict_mode else ValidationLevel.WARNING
                message = f"Profesor: '{professor_name}' no existe en catálogo"
                if professor_id:
                    message += f" (código provisto: '{professor_id}')"
                results.append(
                    ValidationResult(
                        level=level,
                        message=message,
                        field="DOCENTE",
                        actual=professor_name,
                    )
                )
                return results

        # Validación 2: Título académico (si está presente en el Excel)
        # Nota: academic_title ya viene normalizado por apply_normalizers_to_row
        if academic_title and catalog_professor.academic_title:
            # Normalizar también el título del catálogo para comparar
            catalog_title_normalized = normalize_academic_title(catalog_professor.academic_title, ctx=None)

            # Comparar ambos títulos normalizados
            if academic_title != catalog_title_normalized:
                # Títulos no coinciden
                level = ValidationLevel.ERROR if self.strict_mode else ValidationLevel.WARNING
                results.append(
                    ValidationResult(
                        level=level,
                        message=(
                            f"Profesor: Título académico no coincide. "
                            f"En catálogo (normalizado): '{catalog_title_normalized}', "
                            f"en Excel (normalizado): '{academic_title}'"
                        ),
                        field="TITULO",
                        expected=catalog_title_normalized,
                        actual=academic_title,
                    )
                )
        elif academic_title and not catalog_professor.academic_title:
            # El Excel tiene título pero el catálogo no
            results.append(
                ValidationResult(
                    level=ValidationLevel.WARNING,
                    message=(
                        f"Profesor: Excel tiene título '{academic_title}' "
                        f"pero el catálogo no registra título para '{catalog_professor.professor_name}'"
                    ),
                    field="TITULO",
                    expected=None,
                    actual=academic_title,
                )
            )

        # Validación 3: Código del profesor (professor_id)
        if professor_id and catalog_professor.professor_id:
            # Normalizar ambos códigos
            excel_code = professor_id.strip().upper()
            catalog_code = catalog_professor.professor_id.strip().upper()

            if excel_code != catalog_code:
                # Códigos no coinciden
                level = ValidationLevel.ERROR if self.strict_mode else ValidationLevel.WARNING
                results.append(
                    ValidationResult(
                        level=level,
                        message=(
                            f"Profesor: Código no coincide. "
                            f"En catálogo: '{catalog_professor.professor_id}', "
                            f"en Excel: '{professor_id}'"
                        ),
                        field="CODIGO",
                        expected=catalog_professor.professor_id,
                        actual=professor_id,
                    )
                )
        elif professor_id and not catalog_professor.professor_id:
            # El Excel tiene código pero el catálogo no
            results.append(
                ValidationResult(
                    level=ValidationLevel.WARNING,
                    message=(
                        f"Profesor: Excel tiene código '{professor_id}' "
                        f"pero el catálogo no registra código para '{catalog_professor.professor_name}'"
                    ),
                    field="CODIGO",
                    expected=None,
                    actual=professor_id,
                )
            )

        return results
