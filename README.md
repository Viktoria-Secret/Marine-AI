# MarineAI

AI-powered vessel-manual platform that turns thousands of pages of PDF documentation into an interactive, searchable knowledge system for crews, engineers, and fleet managers.

## 1&nbsp;· Mission Statement
Deliver safer, greener and more efficient voyages by giving every seafarer instant, reliable answers straight from the vessel’s technical manuals—anytime, anywhere.

## 2&nbsp;· Key Features
| Category | Capabilities |
|----------|--------------|
| Smart Search & Chat | Natural-language Q&A with citations to exact manual pages |
| Document Ingestion | Drag-and-drop PDFs, automatic OCR, chunking, vector indexing |
| Multi-Vessel Workspace | Manage manuals per vessel, fleet or organisation |
| Role-Based Access | JWT / OAuth2, RBAC (admin, engineer, viewer) |
| Offline Mode | PWA caching for low-bandwidth situations |
| Usage Analytics | Prometheus metrics, token-cost dashboards |
| Droid-Powered Dev | Code/Test/Doc/DevOps droids automate repetitive tasks |

## 3&nbsp;· Technology & Architecture
* **Frontend** – React + TypeScript, Vite, Tailwind  
* **API Gateway** – NestJS (Node 18), REST/GraphQL  
* **AI Service** – FastAPI (Python 3.11), OpenAI, Weaviate vector DB  
* **Data Stores** – PostgreSQL 16, Redis, MinIO (S3)  
* **Messaging / Queues** – BullMQ, RQ  
* **DevOps** – Docker, GitHub Actions CI/CD, Helm on EKS  
* **Observability** – Prometheus, Grafana, Loki  

Macro-architecture layers:

```
SPA ↔ API Gateway ↔ Core Services ─┬─ PostgreSQL
                                   ├─ S3 / MinIO
                                   ├─ Redis
                                   └─ AI Service ↔ Weaviate ↔ OpenAI
```

## 4&nbsp;· Quick Start

### Prerequisites
* Docker ≥ 20.10 & Docker Compose ≥ 2  
* Node ≥ 18, npm ≥ 8 (for local dev)  
* Python ≥ 3.11 (for AI-service hacking)

### One-liner
```bash
# clone & launch
git clone https://github.com/Viktoria-Secret/Marine-AI.git
cd Marine-AI
make dev          # builds images & starts all services
```

### Manual Steps
1. `cp .env.example .env` – edit secrets if needed  
2. `docker-compose up -d --build` – backend, frontend, dbs, AI service
   *(uses `network_mode: host` to avoid iptables issues – ensure ports are free)*
3. Browse:
   * http://localhost:3000 – UI  
   * http://localhost:4000/api/docs – Swagger  
   * http://localhost:8000/docs – AI service docs  
   * http://localhost:9001 – MinIO console  

## 5&nbsp;· Development Workflow (Droid-Driven)

| Stage | Human Role | Droid Role |
|-------|------------|-----------|
| Plan  | write issue → `/droid plan` | splits tasks, generates ADR & UML |
| Code  | prompt in IDE | Code Droid scaffolds Nest module, React hook |
| Test  | approve specs | Test Droid writes Jest/Playwright & Pytest |
| Review| eyeball logic | Review Droid runs ESLint, CodeQL, Bandit |
| Docs  | tweak phrasing| Doc Droid updates OpenAPI, Storybook, MkDocs |
| DevOps| merge PR      | DevOps Droid bumps Helm, pushes images, deploys |

All droid activity (prompt, diff, CI logs) is traceable for audit.

## 6&nbsp;· API Documentation

* **Gateway Swagger** – `/api/docs`  
* **GraphQL** – `/api/graphql` (playground enabled in dev)  
* **AI Service** – `/docs` (FastAPI Swagger)  

OpenAPI JSON is auto-generated on each build and published to `docs/` site.

## 7&nbsp;· Deployment

| Environment | Command | URL |
|-------------|---------|-----|
| Local k8s (kind) | `make k8s-apply ENV=local` | http://marineai.local |
| Staging (EKS) | Git push to `develop` → GitHub Actions → ArgoCD | `staging.marineai.example.com` |
| Production    | GitHub Release or `/deploy production` ChatOps | `app.marineai.example.com` |

Helm charts live in `k8s/`.  Images are published to GHCR with semantic tags and `sha-<commit>` digests.

## 8&nbsp;· Contributing

1. Fork & create a feature branch.  
2. Run `make ci-check` locally (lint, test).  
3. Commit using Conventional Commits.  
4. Open a PR – Review Droid will comment; keep CI green.  
5. One approval + passing checks → merge.  

Please read `CODE_OF_CONDUCT.md` before contributing.

## 9&nbsp;· Troubleshooting

| Symptom | Fix |
|---------|-----|
| `docker-compose up` hangs at ai-service | Ensure ≥ 4 GB RAM free; check proxy blocking OpenAI |
| 500 from `/api/ai/query` | Verify `OPENAI_API_KEY` in `.env`; tail `ai-service` logs |
| Stuck `processing` status | `docker-compose exec weaviate sh -c 'rm -rf /var/lib/weaviate/*'` then re-ingest |
| Frontend CORS errors | `VITE_API_URL` & `CORS_ORIGIN` mismatch – align in `.env` |
| Tests are slow | `npm run test:watch` uses in-memory db; ensure Redis not in `appendonly` mode |

## 10&nbsp;· Roadmap

| Phase | Highlights | ETA |
|-------|------------|-----|
| 2 – AI Upgrade (current) | OCR pipeline, vector RAG w/ citations | Q3 2025 |
| 3 – Quality & Ops | Low-quality scan review, cost dashboards | Q4 2025 |
| 4 – Collaboration | Annotations, shareable links, offline packs | Q1 2026 |
| 5 – Autopilot | On-device voice assistant, predictive maintenance insights | 2026+ |

See `ROADMAP.md` for granular issues and progress tracking.

---

© 2025 MarineAI Project – Built with ❤️ & robots 🤖
