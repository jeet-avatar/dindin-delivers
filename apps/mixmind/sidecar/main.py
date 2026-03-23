"""
MixMind sidecar — FastAPI backend for Electron frontend.
Scans ports 8765–8775 for a free one, writes chosen port to ~/.mixmind-port,
then starts uvicorn.
"""
import os
import socket
import sys
from pathlib import Path

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from health import router as health_router

app = FastAPI(title="MixMind Sidecar", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Electron renderer — no external access
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)


def find_free_port(start: int = 8765, end: int = 8775) -> int:
    for port in range(start, end + 1):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(("127.0.0.1", port))
                return port
            except OSError:
                continue
    raise RuntimeError(f"No free port found in range {start}-{end}")


def write_port_file(port: int) -> None:
    port_file = Path.home() / ".mixmind-port"
    port_file.write_text(str(port))


if __name__ == "__main__":
    port = find_free_port()
    write_port_file(port)
    uvicorn.run(app, host="127.0.0.1", port=port, log_level="info")
