# ArthaBuild — PROJECT.md
**Version:** 1.0  
**Date:** 2026-04-07  
**Status:** Pre-development  

## What We're Building
ArthaBuild is an AI-powered NetSuite development & implementation platform. It runs entirely inside the customer's AWS VPC — no code, credentials, or data ever leaves their infrastructure. Uses a local Ollama LLM (not OpenAI) + FAISS vectorstore of 203K NetSuite knowledge chunks.

## Repository Location
`apps/arthaBuild/` inside the doordash-p2p monorepo

## Source Material
- Frontend: `~/Downloads/Artha.zip → artha-build.zip` (React + Vite + TS, fully built)
- Backend: `~/Downloads/Artha.zip → pythonn_backend pro.zip` (FastAPI + LangGraph + FAISS)

## Tech Stack
| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| Backend | Python FastAPI + LangChain + LangGraph |
| LLM | Ollama (llama3.1:8b) — local, no OpenAI |
| Embeddings | nomic-embed-text via Ollama |
| Vector Store | FAISS (203K NetSuite chunks, needs rebuild for local embeddings) |
| Database | SQLite via SQLAlchemy (user auth only) |
| NetSuite | SuiteCloud CLI via TBA per session |
| Deployment | Docker Compose + Terraform (customer's AWS) |
| License | ArthaBuild central license server (hosted by Vibing World inc.) |

## Deployment Model
BYOC (Bring Your Own Cloud) — entire stack runs in customer's AWS VPC.

## Milestone: v1.0 — First Customer Ready
**Goal:** One customer can deploy ArthaBuild in their AWS, connect their NetSuite, generate and deploy a SuiteScript via AI chat.

## Phase Roadmap

| Phase | Name | Status |
|-------|------|--------|
| Phase 1 | Foundation & Auth Backend | 🔲 Pending |
| Phase 2 | NetSuite TBA Session Management | 🔲 Pending |
| Phase 3 | LLM Migration (OpenAI → Ollama) | 🔲 Pending |
| Phase 4 | Frontend Wiring to Real Backend | 🔲 Pending |
| Phase 5 | Docker Compose Deployment Package | 🔲 Pending |
| Phase 6 | License Server | 🔲 Pending |
| Phase 7 | Terraform AWS Module | 🔲 Pending |
| Phase 8 | Testing, Hardening & Launch | 🔲 Pending |

## Key Decisions
- **Auth:** JWT + bcrypt in FastAPI (no third-party auth service — must work air-gapped)
- **NetSuite auth:** TBA per-session, never stored (credentials destroyed on logout/expiry)
- **LLM:** Ollama — data never leaves customer's VPC
- **DB:** SQLite (single-tenant per deployment, no Postgres overhead)
- **Deployment:** Docker Compose first, Terraform for production AWS

## Requirements Doc
`.planning/REQUIREMENTS.md` — full PRD with 80+ test cases

## Skills Protocol
- Every phase: `/gsd:plan-phase N` before ANY code
- Auth phase: invoke `auth-patterns` skill
- Implementation: invoke `superpowers:test-driven-development`
- Completion: invoke `superpowers:verification-before-completion`
- Bugs: `/gsd:debug`
