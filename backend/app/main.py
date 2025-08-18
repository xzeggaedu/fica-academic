from fastapi import FastAPI
from app.api.routes import router as api_router

app = FastAPI(
    title="FICA Academic API",
    description="API para la generación de estadísticos de carga académica en la FICA",
    version="0.1.0",
)


@app.get("/")
def root():
    return {"message": "Bienvenido a la FICA Academic API 🚀"}


# Registrar rutas
app.include_router(api_router, prefix="/api")
