from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from app.api import inventory, nbfc, payments, whatsapp
from app.redis_client import redis_client

SPEC_DIR = Path(__file__).resolve().parents[1] / "openapi"
SPECS = {
    "inventory.yaml": "inventory.yaml",
    "whatsapp.yaml": "whatsapp.yaml",
    "nbfc.yaml": "nbfc.yaml",
    "payments.yaml": "payments.yaml",
}


@asynccontextmanager
async def lifespan(app: FastAPI):
    redis_client.ping()
    yield


app = FastAPI(
    title="Paytm Vyapar AI",
    version="1.0.0",
    description="Inventory forecasting, NBFC restock credit, WhatsApp campaigns, and Paytm-gated payments.",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(inventory.router)
app.include_router(whatsapp.router)
app.include_router(nbfc.router)
app.include_router(payments.router)


@app.get("/health")
def health() -> dict[str, str]:
    redis_client.ping()
    return {"status": "ok"}


@app.get("/specs/{name}")
def openapi_spec(name: str) -> FileResponse:
    filename = SPECS.get(name)
    if filename is None:
        raise HTTPException(status_code=404, detail="Spec not found")
    return FileResponse(SPEC_DIR / filename, media_type="application/yaml")
