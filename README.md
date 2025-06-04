# MarineAI – Architecture & Implementation Plan  
_Comprehensive guide for building an AI-powered vessel-manual system_

---

## 1. Technical Plan (Macro-Architecture)

| Layer | Component | Tech Choices | Purpose |
|-------|-----------|--------------|---------|
| **UI / Frontend** | SPA | **React + TypeScript**, Vite, Tailwind CSS | Responsive web app, state management via Zustand/Redux |
|                  | PDF Viewer | `@react-pdf-viewer/core` | In-browser manual reading; supports thumbnails, search, annotations |
| **API Gateway**  | REST/GraphQL edge | **NestJS (Node 18+)** | Auth, routing, request validation, rate-limiting |
| **Core Services (backend)** | User/Vessel/Manual Service | NestJS modules, PostgreSQL via TypeORM | CRUD for domain data |
|                  | Auth Service | JWT (access/refresh) + **OAuth2 / OIDC** option | Password or SSO login; RBAC (“admin”, “engineer”) |
|                  | File Service | Direct S3 pre-signed uploads, virus scan (ClamAV) | Stores PDFs, thumbnails, OCR text |
|                  | AI Service | Python 3.11 + FastAPI | Handles ingestion, OCR, embedding, retrieval, OpenAI calls |
| **Data Stores**  | Relational DB | **PostgreSQL 16** | Users, metadata, chat history |
|                  | Vector DB | **Weaviate (open-source) OR Pinecone (managed)** | Stores embeddings for semantic search |
|                  | Cache / Queue | Redis | Short-term chat context, task queues (RQ/BullMQ) |
|                  | Object Storage | AWS S3 / MinIO | Raw PDFs, processed text, derived artifacts |
| **DevOps**       | Containerization | Docker & docker-compose, Helm charts | Local dev & k8s deployment |
|                  | CI/CD | GitHub Actions → staging → prod | Test, lint, scan, deploy |
|                  | Monitoring | Prometheus + Grafana, Loki logs | Health checks, latency, cost alerts |

---

## 2. Detailed API Plan

### Authentication (`/api/auth`)
| Method | Path | Body / Params | Description |
|--------|------|---------------|-------------|
| POST | `/register` | `{email, password, name}` | Create account |
| POST | `/login` | `{email, password}` | Issue JWTs |
| POST | `/logout` | — | Invalidate refresh token |
| GET  | `/me` | header Auth | Return profile |
| POST | `/refresh` | `{refreshToken}` | Rotate tokens |

### Vessels (`/api/vessels`)
| Method | Path | Body | Notes |
|--------|------|------|-------|
| GET | `/` | — | List vessels (user scope) |
| POST | `/` | `{name, imo?}` | Create vessel |
| GET | `/:id` | — | Details incl. manual count |
| PUT | `/:id` | `{...}` | Update |
| DELETE | `/:id` | — | Soft delete |

### Manuals (`/api/vessels/:vesselId/manuals`)
| Method | Path | Body / Query | Purpose |
|--------|------|-------------|---------|
| GET | `/` | `?q=search` | List / search |
| POST | `/` | multipart form | Initiate upload (meta) |
| PUT  | `/:mid/complete` | `{s3Key}` | Mark upload done → triggers processing |
| GET  | `/:mid` | — | Metadata, processing status |
| DELETE | `/:mid` | — | Remove manual |
| GET  | `/:mid/file` | — | Pre-signed download URL |

### AI Assistant (`/api/ai`)
| Method | Path | Body | Description |
|--------|------|------|-------------|
| POST | `/query` | `{vesselId, message, historyId?}` | Returns `{answer, citations:[{manualId,page}...]}` |
| GET  | `/history/:id` | — | Retrieve past convo |
| DELETE | `/history/:id` | — | Remove |

### Internal Webhooks / Events
- `POST /internal/webhook/manual-processed` – AI service notifies API when OCR/embeddings complete.
- Message queue events: `manual.ingested`, `chat.request`, etc.

---

## 3. AI Integration Scenarios

### 3.1 Ingestion Pipeline
1. **Upload completed** → File Service emits event.
2. **OCR & Text Extraction**
   - If PDF contains text layer → extract via **pdfplumber**.
   - Else run **OCRmyPDF** (Tesseract, 300 dpi upscale, deskew, noise removal).
3. **Chunking & Embedding**
   - Adaptive chunk size 500–800 tokens.
   - Embeddings via `text-embedding-3-large`.
4. **Vector Store Write** with metadata `{manualId, page, chunkIndex}`.
5. **Quality Metrics**: pages with low OCR confidence flagged for manual review.

### 3.2 Retrieval-Augmented QA
```
User query → embed → top-k vector search (filter vesselId) → 
context assembly (max 6 chunks, dedup pages) → 
LLM call (GPT-4o, system prompt instructs citations) → 
post-process to attach links/pages → deliver.
```

### 3.3 Conversation Management
- Chat history kept in PostgreSQL; last **N** messages cached in Redis for quick context.
- Follow-up questions reuse conversation id; LLM receives previous Q&A trimmed to 8 k tokens.

### 3.4 Reliability & Cost Controls
- Automatic fallback to shorter model (GPT-3.5-Turbo) if context small.
- Monthly token usage quotas per tenant.
- Streaming responses for low latency.

---

## 4. File Storage & Management Recommendations

| Aspect | Recommendation |
|--------|----------------|
| **Structure** | `/{vesselId}/{manualId}/{original.pdf}`; derived `ocr.txt`, `thumb.jpg` |
| **Retention** | Version each re-upload; soft delete with 30-day restore |
| **Security** | S3 server-side encryption (SSE-S3/AES-256); pre-signed URLs, no public buckets |
| **Validation** | Content-type whitelist, max 50 MB per file, ClamAV scan |
| **Backups** | Daily incremental S3 → Glacier; DB WAL shipping |
| **Performance** | Generate 150 px thumbnails for list views; CloudFront CDN for downloads |
| **Compliance** | Keep audit log of who accessed which manual (required by many fleets) |

Handling Bad Scans:
- Pre-processing: unsharp mask, binarization, de-speckle before OCR.
- Confidence score < 85 % ⇒ flag record; UI badge “low quality”.
- Allow manual upload of corrected PDF to replace.

---

## 5. Development & Migration Phases

### Phase 0 – Setup (1 week)
- Repo, lint, CI/CD skeleton  
- Docker baseline, staging env

### Phase 1 – MVP (4 weeks)
1. Auth (JWT), vessel & manual CRUD
2. S3 uploads, basic PDF viewer
3. AI Service v0: extract text only, simple search+GPT answer (no vector DB)

### Phase 2 – AI Upgrade (3 weeks)
- Integrate OCR pipeline
- Vector DB, embeddings, RAG answers with citations
- Chat UI with history

### Phase 3 – Quality & Ops (3 weeks)
- Low-quality scan handling, manual review queue
- Cost monitoring, usage dashboards
- Role-based access, audit logs

### Phase 4 – Expansion (ongoing)
- Multi-vessel, multi-fleet tenancy
- Mobile-first PWA
- Collaboration features: annotations, shared links
- Offline packs (service-worker cached PDFs)

---

## 6. Risk & Mitigation

| Risk | Mitigation |
|------|------------|
| OCR failures on degraded scans | manual flag & review workflow |
| LLM hallucinations | strict RAG with max-similarity threshold, citations enforced |
| Token cost overrun | per-user quotas, model downgrades |
| Data breach | WAF, IAM least privilege, regular pen-tests |

---

## 7. Team & Roles

- Product Owner (maritime SME)  
- Tech Lead / Architect  
- Frontend Dev (2)  
- Backend Dev (2)  
- AI/ML Engineer  
- DevOps / SRE  

---

### Appendix: Suggested Open-Source Libraries
- `ocrmypdf`, `pdfplumber`, `PyMuPDF`
- `langchain`, `weaviate-client`, `openai`
- `nestjs`, `class-validator`
- `react-query`, `zustand`

---

_End of document_
