# Uploads Directory

Esta carpeta contiene archivos subidos por usuarios y datos del sistema.

## Estructura

```
uploads/
├── data/           # Datos del sistema (CSV, configuraciones, etc.)
│   └── schedules/  # Archivos CSV de horarios
├── users/          # Archivos subidos por usuarios
├── temp/           # Archivos temporales
└── index.html      # Previene listado de directorios
```

## Seguridad

- Los archivos en esta carpeta NO están expuestos directamente por el servidor web
- Se usa `.gitignore` para excluir archivos sensibles del control de versiones
- El archivo `index.html` previene el listado de directorios

## Uso

- **data/schedules/**: Para archivos CSV de horarios y datos del sistema
- **users/**: Para archivos subidos por usuarios (perfiles, documentos, etc.)
- **temp/**: Para archivos temporales que se eliminan automáticamente

## Permisos

Esta carpeta debe tener permisos restrictivos en producción para evitar acceso directo.
