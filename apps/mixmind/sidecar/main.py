"""
MixMind sidecar — FastAPI backend for Electron frontend.
Scans ports 8765–8775 for a free one, writes chosen port to ~/.mixmind-port,
then starts uvicorn.
"""
import socket
from contextlib import asynccontextmanager
from pathlib import Path

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from health import router as health_router
from library import router as library_router
from duplicate_routes import router as duplicate_router
from version import VERSION

_chosen_port: int = 0


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Write port file after uvicorn has bound — port is set by caller
    if _chosen_port:
        write_port_file(_chosen_port)
    yield
    # cleanup on shutdown (future use)


app = FastAPI(title="MixMind Sidecar", version=VERSION, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Electron renderer — loopback only (bound to 127.0.0.1)
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(library_router)
app.include_router(duplicate_router)


def find_free_port(start: int = 8765, end: int = 8775) -> int:
    for port in range(start, end + 1):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)  # BEFORE bind
                s.bind(("127.0.0.1", port))
                return port
            except OSError:
                continue
    raise RuntimeError(f"No free port found in range {start}-{end}")


def write_port_file(port: int) -> None:
    port_file = Path.home() / ".mixmind-port"
    port_file.write_text(str(port))


if __name__ == "__main__":
    _chosen_port = find_free_port()
    uvicorn.run(app, host="127.0.0.1", port=_chosen_port, log_level="info")
