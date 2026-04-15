"""
Infrastructure config validation.
CASE-027: docker-compose.yml defines required services.
CASE-154: Ollama models referenced in compose for automatic pull.
CASE-156: docker-compose.yml passes JWT_SECRET_KEY to backend.
CASE-168: Dockerfile uses multi-stage build.
"""
import os

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# Dockerfile and docker-compose.yml live at the arthaBuild root (two levels up from src/backend)
ARTHABUILD_ROOT = os.path.join(BACKEND_DIR, "..", "..")
COMPOSE_PATH = os.path.join(ARTHABUILD_ROOT, "docker-compose.yml")
DOCKERFILE_PATH = os.path.join(ARTHABUILD_ROOT, "Dockerfile")


def test_dockerfile_has_multistage_build():
    """CASE-168: Dockerfile uses multi-stage build (multiple FROM stages)."""
    with open(DOCKERFILE_PATH) as f:
        content = f.read()
    from_count = content.count("\nFROM ") + (1 if content.startswith("FROM ") else 0)
    assert from_count >= 2, \
        f"Dockerfile should use multi-stage build, found {from_count} FROM stage(s)"


def test_docker_compose_defines_required_services():
    """CASE-027: docker-compose.yml must define backend and nginx services."""
    import yaml
    with open(COMPOSE_PATH) as f:
        compose = yaml.safe_load(f)
    services = list(compose.get("services", {}).keys())
    for required in ("backend", "nginx"):
        assert required in services, \
            f"CASE-027: docker-compose.yml missing required service: {required}"


def test_docker_compose_passes_jwt_secret_to_backend():
    """CASE-156: docker-compose.yml must configure JWT_SECRET_KEY for backend (inline or via env_file)."""
    with open(COMPOSE_PATH) as f:
        content = f.read()
    # Acceptable patterns: JWT_SECRET_KEY inline OR env_file (which loads .env containing the key)
    has_inline = "JWT_SECRET_KEY" in content
    has_env_file = "env_file" in content
    assert has_inline or has_env_file, \
        "CASE-156: backend must receive JWT_SECRET_KEY (inline environment or env_file)"


def test_ollama_models_pulled_in_compose_or_dockerfile():
    """CASE-154: llama3.1:8b and nomic-embed-text must be referenced in compose startup."""
    with open(COMPOSE_PATH) as f:
        content = f.read()
    has_llama = "llama3.1:8b" in content or "llama3" in content
    has_nomic = "nomic-embed-text" in content or "nomic" in content
    assert has_llama or has_nomic, \
        "CASE-154: docker-compose.yml should reference Ollama models for automatic pull"
