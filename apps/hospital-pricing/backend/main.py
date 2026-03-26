# apps/hospital-pricing/backend/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from auth.router import router as auth_router
from routers.contracts import router as contracts_router
from routers.invoices import router as invoices_router
from routers.discrepancies import router as discrepancies_router
from routers.audit import router as audit_router


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
    app.include_router(contracts_router)
    app.include_router(invoices_router)
    app.include_router(discrepancies_router)
    app.include_router(audit_router)

    @app.get("/health")
    async def health() -> dict:
        return {"status": "ok"}

    return app


app = create_app()
