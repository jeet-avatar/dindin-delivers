# apps/hospital-pricing/backend/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from auth.router import router as auth_router


def create_app() -> FastAPI:
    app = FastAPI(
        title="Hospital Wholesale Pricing Assurance",
        version="1.0.0",
        description="B2B SaaS for hospital procurement pricing verification",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173"],  # Vite dev server
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(auth_router)

    @app.get("/health")
    async def health() -> dict:
        return {"status": "ok"}

    return app


app = create_app()
