# MarineAI – Project Status _(04 Jun 2025)_

---

## 1. Executive Summary
The core repository skeleton for the Droid-driven **MarineAI** platform is in place.  
Key directories, Docker/Compose definitions, Makefile automation, baseline NestJS / FastAPI / React services, and extensive documentation (README + development plan) have been committed.  
Local container orchestration is **not yet healthy** due to networking issues inside the current environment.

---

## 2. Implemented To-Date
| Area | Details & Files |
|------|-----------------|
| **Repository Layout** | `backend/`, `frontend/`, `ai-service/`, `docs/`, `scripts/`, `init-scripts/`, `.github/workflows/` |
| **Backend (NestJS)** | `src/main.ts`, `src/app.module.ts`, entities (`user`, `vessel`, `manual`), comprehensive `health/health.controller.ts`, `package.json` with full deps |
| **AI Service (FastAPI)** | Skeleton structure `app/{core,services,routers,...}`, `main.py`, `requirements.txt` |
| **Frontend (React + Vite)** | Basic Vite scaffold, sample `src/App.tsx`, `index.html`, full dependency list in `package.json` |
| **Dev Env** | `docker-compose.yml`, simplified `docker-compose.simple.yml`, `Dockerfile.dev` for each service, `.env.example`, `Makefile` with >40 recipes |
| **Docs** | `README.md` (rewritten), `MarineAI-Droid-Development-Plan.md`, generated ADR scaffolding |
| **CI/CD** | Stub GitHub workflow `.github/workflows/ci.yml` |

---

## 3. Current Issues / Blockers
1. **Docker Networking (iptables raw table)**  
   Containers fail to attach networks in the sandbox → compose up aborts.  
2. **MinIO client tag mismatch** (`minio/mc:<date>`) → manifest not found.  
3. **Missing `package-lock.json`** for frontend & backend → `npm ci` step breaks image build.  
4. **Large image build time** (node installs, python libs) slows feedback loop.  
5. **Application code incomplete** – only health endpoint is functional; CRUD modules, AI endpoints, and React UI are placeholders.

---

## 4. Immediate Actions (Next 48 h)
| Priority | Task | Owner |
|----------|------|-------|
| 🔴 P0 | Replace problematic iptables rules: add `network_mode: host` OR use rootless Docker in compose; verify inside Factory sandbox. | DevOps Droid |
| 🔴 P0 | Pin a stable MinIO client tag (`minio/mc:latest`) or remove init container step. | DevOps Droid |
| 🟠 P1 | Generate `package-lock.json` files (`npm install --package-lock-only`) and commit; update Dockerfiles to use `npm ci || npm install`. | Code Droid |
| 🟠 P1 | Validate `docker-compose.simple.yml` path; ensure PG, Redis, MinIO come up cleanly. | DevOps Droid |
| 🟢 P2 | Scaffold backend Auth, User, Vessel modules via `/droid scaffold nestjs module`. | Code Droid |
| 🟢 P2 | Add Playwright + Vitest baseline tests via Test Droid; hook into CI. | Test Droid |

---

## 5. Short-Term Roadmap (Sprint 1)
1. **Environment Stability** – resolve compose, push passing CI.
2. **Auth Flow MVP** – JWT login, user registration endpoint + React login screen.
3. **File Upload Path** – S3 presigned POST from backend; manual metadata saved.
4. **AI Service v0** – plain text extraction & OpenAI “chat” without vector DB.
5. **Health & Observability** – Prometheus exporters, `/metrics` route.

---

## 6. Architecture Snapshot
```
SPA (React/Vite) ───▶  NestJS API (Port 4000) ─┬── PostgreSQL 16
                                               ├── Redis 7
                                               ├── MinIO (S3) 9000
                                               └── FastAPI AI-Service (Port 8000) ──▶ OpenAI
```
Weaviate is planned but temporarily disabled to simplify networking.

---

## 7. File Inventory (Key New Files)
- **Infrastructure**
  - `docker-compose.yml`, `docker-compose.simple.yml`
  - `frontend/Dockerfile.dev`, `backend/Dockerfile.dev`, `ai-service/Dockerfile.dev`
  - `Makefile`, `.env.example`
- **Backend**
  - `backend/src/app.module.ts`, `backend/src/main.ts`
  - `backend/src/database/entities/{user,vessel,manual}.entity.ts`
  - `backend/src/health/health.controller.ts`
- **AI Service**
  - `ai-service/app/main.py`
- **Frontend**
  - `frontend/src/App.tsx`, `frontend/index.html`
- **Docs**
  - `README.md`, `MarineAI-Droid-Development-Plan.md`

*(Full tree omitted for brevity – run `tree -L 2`)*

---

## 8. How to Continue Development Locally
1. **Clone & Install Deps**
   ```
   git clone https://github.com/Viktoria-Secret/Marine-AI.git
   cd Marine-AI
   npm install -w frontend
   npm install -w backend
   python -m venv .venv && source .venv/bin/activate && pip install -r ai-service/requirements.txt
   ```
2. **Start Databases Only**
   ```
   docker compose -f docker-compose.simple.yml up -d postgres redis minio
   ```
3. **Run Services in Watch Mode**
   ```
   # Terminal 1
   cd backend && npm run start:dev
   # Terminal 2
   cd ai-service && uvicorn app.main:app --reload --port 8000
   # Terminal 3
   cd frontend && npm run dev
   ```
4. **Check Health**
   - http://localhost:4000/health  
   - http://localhost:8000/docs  
   - http://localhost:3000  

---

## 9. Risks & Mitigations
| Risk | Mitigation |
|------|------------|
| Compose still fails in CI | Use Docker-in-Docker GitHub runner or disable raw table rules |
| Dependency bloat | Enable Docker buildx & caching; prune devDeps in production images |
| AI token cost spike | Add usage logging middleware + monthly budgets |
| Data loss (MinIO) | Nightly volume snapshot; S3 lifecycle to Glacier |

---

## 10. Contacts / Ownership
- **Tech Lead**: Vitya Petrenko (Slack: `@vitya`)  
- **DevOps**: DevOps Droid (GitHub bot)  
- **Frontend**: Frontend Droid, Alice S.  
- **Backend**: Backend Droid, Bob K.  
- **ML / AI**: AI Droid, Carol M.

---

_This status sheet is auto-generated by Doc Droid. Update via `/droid doc update status`._
