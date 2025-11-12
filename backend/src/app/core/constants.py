"""Constantes del sistema."""

# Categorías válidas de profesores
PROFESSOR_CATEGORIES = {
    "DEC": "Decano",
    "DIR": "Director",
    "COOR": "Coordinador",
    "DTC": "Docente Tiempo Completo",
    "ADM": "Administrativo",
    "DHC": "Docente Honorario",
}

# Lista de códigos de categorías válidas
VALID_PROFESSOR_CATEGORY_CODES = list(PROFESSOR_CATEGORIES.keys())

# Mapeo de códigos a nombres completos
PROFESSOR_CATEGORY_NAMES = PROFESSOR_CATEGORIES
