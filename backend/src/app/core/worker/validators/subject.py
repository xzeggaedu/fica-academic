"""Validador de asignaturas."""

import re

from sqlalchemy import select

from ....models.catalog_subject import CatalogSubject
from .base import BaseValidator, ValidationLevel, ValidationResult, calculate_similarity


def has_different_roman_numbers(name1: str, name2: str) -> bool:
    """Detecta si las asignaturas difieren solo en números romanos.

    Args:
        name1: Primer nombre
        name2: Segundo nombre

    Returns:
        True si solo difieren en números romanos (ej: "II" vs "VI")
    """
    # Extraer números romanos al final de cada nombre
    roman1 = re.findall(r"\b[IVX]+$", name1.upper())
    roman2 = re.findall(r"\b[IVX]+$", name2.upper())

    # Si ambos tienen números romanos al final
    if roman1 and roman2 and roman1[0] != roman2[0]:
        # Eliminar los números romanos para comparar solo la base
        base1 = re.sub(r"\s+[IVX]+$", "", name1.lower().strip())
        base2 = re.sub(r"\s+[IVX]+$", "", name2.lower().strip())

        # Si la base del nombre es muy similar (>= 90%), solo difieren en el número
        if base1 and base2 and calculate_similarity(base1, base2) >= 0.90:
            return True

    return False


class SubjectValidator(BaseValidator):
    """Valida asignaturas contra catálogo."""

    async def validate(self, db, data: dict) -> list[ValidationResult]:
        """Validar COD_ASIG y ASIGNATURA contra catalog_subject.

        Reglas:
        - Si COD_ASIG existe en el catálogo y ASIGNATURA coincide, válido
        - Si COD_ASIG no existe, error (si strict_mode) o warning
        - Si COD_ASIG existe pero ASIGNATURA no coincide, error
        - Si COD_ASIG vacío, error (si strict_mode) o warning
        """
        results = []

        # Extraer campos del Excel
        subject_code = data.get("COD_ASIG", "").strip() if data.get("COD_ASIG") else ""
        subject_name = data.get("ASIGNATURA", "").strip() if data.get("ASIGNATURA") else ""

        # Si ambos están vacíos
        if not subject_code and not subject_name:
            level = ValidationLevel.ERROR if self.strict_mode else ValidationLevel.WARNING
            results.append(
                ValidationResult(
                    level=level,
                    message="Asignatura: Código y nombre vacíos",
                    field="COD_ASIG/ASIGNATURA",
                    actual=f"COD_ASIG='{subject_code}', ASIGNATURA='{subject_name}'",
                )
            )
            return results

        # Buscar la asignatura en el catálogo
        if subject_code:
            result = await db.execute(
                select(CatalogSubject)
                .where(CatalogSubject.subject_code == subject_code)
                .where((CatalogSubject.deleted.is_(False)) | (CatalogSubject.deleted.is_(None)))
            )
            catalog_subject = result.scalar_one_or_none()

            if catalog_subject:
                # El código existe, verificar que el nombre coincida
                if subject_name:
                    # Normalizar ambos nombres para comparación
                    catalog_name = catalog_subject.subject_name.strip().lower()
                    excel_name = subject_name.strip().lower()

                    # Comparación exacta o similaridad alta
                    if catalog_name == excel_name:
                        # Coincidencia exacta
                        pass  # Válido, no agregar error
                    elif calculate_similarity(catalog_name, excel_name) >= 0.85:
                        # Alta similitud - verificar si difieren solo en números romanos
                        if has_different_roman_numbers(subject_name, catalog_subject.subject_name):
                            # Son asignaturas DIFERENTES (ej: "II" vs "VI")
                            level = ValidationLevel.ERROR if self.strict_mode else ValidationLevel.WARNING
                            results.append(
                                ValidationResult(
                                    level=level,
                                    message=f"Asignatura: Código '{subject_code}' corresponde a '{catalog_subject.subject_name}' (nivel diferente), pero se encontró '{subject_name}'",
                                    field="ASIGNATURA",
                                    expected=catalog_subject.subject_name,
                                    actual=subject_name,
                                )
                            )
                        else:
                            # Alta similitud (posible typo menor)
                            level = ValidationLevel.WARNING
                            results.append(
                                ValidationResult(
                                    level=level,
                                    message=f"Asignatura: Nombre similar pero no exacto. Esperado '{catalog_subject.subject_name}', encontrado '{subject_name}'",
                                    field="ASIGNATURA",
                                    expected=catalog_subject.subject_name,
                                    actual=subject_name,
                                )
                            )
                    else:
                        # Nombres muy diferentes
                        level = ValidationLevel.ERROR if self.strict_mode else ValidationLevel.WARNING
                        results.append(
                            ValidationResult(
                                level=level,
                                message=f"Asignatura: Código '{subject_code}' corresponde a '{catalog_subject.subject_name}', pero se encontró '{subject_name}'",
                                field="ASIGNATURA",
                                expected=catalog_subject.subject_name,
                                actual=subject_name,
                            )
                        )
                else:
                    # Código existe pero nombre vacío
                    level = ValidationLevel.WARNING
                    results.append(
                        ValidationResult(
                            level=level,
                            message=f"Asignatura: Código '{subject_code}' válido pero nombre vacío. Nombre en catálogo: '{catalog_subject.subject_name}'",
                            field="ASIGNATURA",
                            expected=catalog_subject.subject_name,
                            actual="",
                        )
                    )
            else:
                # El código no existe en el catálogo
                level = ValidationLevel.ERROR if self.strict_mode else ValidationLevel.WARNING
                message = f"Asignatura: Código '{subject_code}' no existe en catálogo"
                if subject_name:
                    message += f" (nombre provisto: '{subject_name}')"
                results.append(
                    ValidationResult(
                        level=level,
                        message=message,
                        field="COD_ASIG",
                        actual=subject_code,
                    )
                )
        else:
            # Código vacío pero nombre presente
            level = ValidationLevel.ERROR if self.strict_mode else ValidationLevel.WARNING
            results.append(
                ValidationResult(
                    level=level,
                    message=f"Asignatura: Código vacío pero nombre provisto '{subject_name}'. No se puede validar contra catálogo.",
                    field="COD_ASIG",
                    actual="",
                )
            )

        return results
