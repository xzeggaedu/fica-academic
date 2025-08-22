# Estado del repositorio: fica-academic

## Descripción general

Este repositorio contiene el sistema FICA Academic, desarrollado para la Facultad de Informática y Ciencias Aplicadas (FICA) de la Universidad Tecnológica de El Salvador. El sistema incluye:

- **Backend:** API desarrollada en FastAPI, conectada a una base de datos PostgreSQL.
- **Frontend:** Aplicación web en React + Vite, con integración y despliegue vía Docker.
- **Infraestructura:** Archivos Docker y Docker Compose para desarrollo y producción, permitiendo levantar todos los servicios fácilmente.

## Estado actual

- El backend está funcional, expuesto en `http://localhost:3025`, con documentación Swagger disponible en `/docs`.
- El frontend está integrado y accesible en `http://localhost:3000`.
- El entorno de desarrollo soporta hot reload para ambos servicios.
- El entorno de producción está listo, con archivos separados (`Dockerfile.prod`, `docker-compose.prod.yml`).
- Linters y pre-commit configurados para mantener la calidad del código.
- Documentación actualizada en `README.md` y archivos de progreso.

## Próximos pasos

- Mejorar endpoints y lógica de negocio en el backend.
- Ampliar funcionalidades y diseño en el frontend.
- Integrar autenticación y seguridad.
- Pruebas automatizadas y despliegue en servidores externos.

---

Para dudas o sugerencias, consulta el README o abre un issue en GitHub.
