import logging
import os
from logging.handlers import RotatingFileHandler

LOG_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "logs")
LOG_FILE_PATH = os.path.join(LOG_DIR, "app.log")

LOGGING_LEVEL = logging.INFO
LOGGING_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"

logging.basicConfig(level=LOGGING_LEVEL, format=LOGGING_FORMAT)

# Intentar configurar el file handler, pero fallar silenciosamente si no hay permisos
try:
    # Crear directorio si no existe
    if not os.path.exists(LOG_DIR):
        os.makedirs(LOG_DIR, exist_ok=True)

    # Verificar que podemos escribir en el directorio
    test_file = os.path.join(LOG_DIR, ".write_test")
    try:
        with open(test_file, "w") as f:
            f.write("test")
        os.remove(test_file)
    except (PermissionError, OSError):
        raise PermissionError(f"No se puede escribir en el directorio de logs: {LOG_DIR}")

    # Crear el file handler
    file_handler = RotatingFileHandler(LOG_FILE_PATH, maxBytes=10485760, backupCount=5)
    file_handler.setLevel(LOGGING_LEVEL)
    file_handler.setFormatter(logging.Formatter(LOGGING_FORMAT))
    logging.getLogger("").addHandler(file_handler)

except (PermissionError, OSError) as e:
    # Si no se puede escribir en el archivo, continuar solo con logging a consola
    # Esto es importante para que la aplicación pueda iniciar incluso si hay problemas de permisos
    logging.warning(f"No se pudo configurar el file handler de logs: {e}. Continuando solo con logging a consola.")
