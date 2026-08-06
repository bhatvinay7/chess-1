# Rooky — Next-Generation Distributed Chess Platform

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Rust](https://img.shields.io/badge/Rust-2021%20Edition-000000?logo=rust&logoColor=white)](https://www.rust-lang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js&logoColor=white)](https://nextjs.org/)
[![Actix](https://img.shields.io/badge/Actix--Web-4.x-E53935?logo=rust&logoColor=white)](https://actix.rs/)
[![Kubernetes](https://img.shields.io/badge/Kubernetes-Production-326CE5?logo=kubernetes&logoColor=white)](https://kubernetes.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.x-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Redis](https://img.shields.io/badge/Redis-7.x-DC382D?logo=redis&logoColor=white)](https://redis.io/)

---

## 1. Executive Summary & System Overview

**Rooky** is an enterprise-grade, high-concurrency real-time chess platform built as a **polyglot microservices monorepo**. Designed to support thousands of concurrent chess games with sub-millisecond matchmaking and zero-lag board state synchronization, the platform combines **TypeScript/Node.js** for web presentation and REST APIs with **high-performance Rust** for compute-heavy real-time matchmaking and Change Data Capture (CDC) streaming.

```mermaid
graph TD
    subgraph Client Layer
        Web[apps/web<br/>Next.js 15 Client]
    end

    subgraph API & Gateway Layer
        HTTP[apps/http-server<br/>Express REST API]
        WS[apps/ws-server<br/>WebSocket Server]
    end

    subgraph Real-Time & Authoritative Core
        GS[apps/game-server<br/>Chess State Engine]
        MM[apps/matchmaker<br/>Rust Actix / Tokio Matchmaker]
    end

    subgraph Event & CDC Streaming
        CDC[apps/cdc<br/>Rust WAL Logical Replication]
        SYNC[apps/sync-worker<br/>DB Sync Worker]
        NOTIF[apps/notification-worker<br/>RabbitMQ Worker]
    end

    subgraph Polyglot Data Store
        PG[(PostgreSQL<br/>OLTP Core DB)]
        MONGO[(MongoDB<br/>Game Archives & PGN)]
        REDIS[(Redis Cluster<br/>Streams, PubSub & Cache)]
        RMQ[(RabbitMQ<br/>Async Task Queue)]
    end

    %% Client flows
    Web <-->|REST / OAuth| HTTP
    Web <-->|WebSocket WSS| WS

    %% Real-time gameplay
    WS <-->|PubSub & Game State| REDIS
    WS <-->|RPC| GS
    GS -->|Persist Result| PG
    GS -->|Archive Move Log| MONGO

    %% Matchmaking flow
    WS -->|XADD INGEST_STREAM| REDIS
    REDIS -->|XREADGROUP Consumer Group| MM
    MM -->|Match Result Event| REDIS

    %% CDC Replication flow
    PG -.->|pg_output WAL Slot| CDC
    CDC -->|Schedule Tournament / Event| REDIS
    CDC -->|Dispatch Task| RMQ
    RMQ --> NOTIF
    SYNC -->|Sync Analytics| MONGO
```

---

## 2. Microservices Architecture & Server Specifications

The workspace is organized into specialized services (`apps/`) and reusable modular libraries (`packages/`).

### Server Architecture Summary Table

| Service / App | Primary Language | Framework / Runtime | Core Responsibilities & Functionality |
| :--- | :--- | :--- | :--- |
| **`apps/web`** | TypeScript | Next.js 15 (React 19) | Premium responsive web interface, interactive chessboard, dark-mode styling, Google One-Tap/OAuth button, and game analytics dashboards. |
| **`apps/http-server`** | TypeScript | Node.js / Express | Authoritative REST API for User Authentication (2-Table schema), User Profile, Tournaments, Ratings, Admin panels, and JWT session issuing. |
| **`apps/ws-server`** | TypeScript | Node.js / WebSockets | Low-latency bi-directional WebSocket gateway for live chess moves, spectator broadcasting, game chat, and server-synchronized clocks. |
| **`apps/game-server`** | TypeScript | Node.js | Authoritative game state engine; validates legality of chess moves, handles time forfeits, draws, and rating calculations. |
| **`apps/matchmaker`** | **Rust** | Actix / Tokio / Redis | Ultra-fast in-memory matchmaking brackets (Bullet, Blitz, Rapid), standard Chess & Chess960 support, and Prometheus metrics exporting. |
| **`apps/cdc`** | **Rust** | Tokio / `pgwire` WAL | PostgreSQL Logical Replication WAL reader (`pg_output`); decodes row-level mutations to trigger tournament scheduling without polling. |
| **`apps/sync-worker`** | TypeScript | Node.js | Background synchronization engine that mirrors relational user summaries into MongoDB document archives and cache warmup. |
| **`apps/notification-worker`** | TypeScript | Node.js / RabbitMQ | Asynchronous event worker for transactional email delivery (OTP verification, password resets, tournament invitations). |
| **`apps/docs`** | TypeScript | Next.js | Developer documentation and internal API reference portal. |

---

### Deep Dive: Individual Server Architecture

#### 1. `apps/web` — Frontend Client
- **Architecture**: App-router Next.js 15 application utilizing CSS variables for cohesive dark-mode aesthetics.
- **Key Modules**:
  - `components/auth/`: Features `GoogleAuthButton.tsx` (loading Google Identity Services dynamically) and `AuthLanding.tsx` for credential/email auth.
  - `components/layout/`: Includes `SideNav.tsx` with dynamic path-based layout suppression (`if (pathname.startsWith("/auth")) return null`).
  - `app/api/auth/`: Type-safe Axios SDK (`authApi`) connecting to the REST backend.

#### 2. `apps/http-server` — Core REST API
- **Architecture**: Modular Express.js server structured by domain controllers (`userAuth`, `profile`, `tournaments`, `admin`).
- **Authentication Engine**:
  - Handles login, signup verification, password resets, and Google OAuth ID token verification (`/api/auth/google`).
  - Interacts with `UserAuth` credentials table to isolate password hashes from OAuth identities.

#### 3. `apps/ws-server` & `apps/game-server` — Real-Time Game Engine
- **Architecture**: Stateful WebSocket connection handlers backed by a **Redis Pub/Sub backplane**.
- **Execution Flow**:
  - Player moves are sent over WSS $\rightarrow$ verified for chess rules and clock integrity $\rightarrow$ broadcasted instantly to opponents and spectators via Redis pub/sub channels.

#### 4. `apps/matchmaker` — Rust High-Performance Matchmaker
- **Architecture**: Actix Actor system running on Tokio asynchronous runtime.
- **Ingestion Engine**: Consumes matchmaking ticket requests from Redis Streams (`INGEST_STREAM`) using Redis **Consumer Groups** (`xgroup_create_mkstream`).
- **Data Structures**: Utilizes B-Tree and Hash maps (`BTreeMap`, `HashMap`) in `MatchPool` to maintain instant rating brackets across Bullet, Blitz, and Rapid modes.
- **Observability**: Exposes real-time Prometheus histograms and counters on port `9103` (`metrics_rustclient`).

```mermaid
sequenceDiagram
    autonumber
    participant Player as Client (WS)
    participant WS as WS Server
    participant Redis as Redis Stream (INGEST_STREAM)
    participant MM as Rust Matchmaker (Actix)
    participant PubSub as Redis PubSub (MATCH_FOUND)

    Player->>WS: Request Match (Mode: BLITZ, Rating: 1550)
    WS->>Redis: XADD INGEST_STREAM (Ticket Payload)
    Redis-->>MM: XREADGROUP Consumer Group ($)
    Note over MM: BTreeMap Rating Bracket Search<br/>Sub-Millisecond Matching
    MM->>MM: Pair Player A (1550) & Player B (1545)
    MM->>PubSub: PUBLISH match_found (GameID, White, Black)
    PubSub-->>WS: Deliver Game Session
    WS-->>Player: Start Chess Game (Board Ready)
```

#### 5. `apps/cdc` — Rust Change Data Capture (CDC) Service
- **Architecture**: Asynchronous PostgreSQL Write-Ahead Log (WAL) listener using `pgwire_replication`.
- **Replication Mechanism**:
  - Connects directly to PostgreSQL replication slots (`SLOT_NAME`) using the `pg_output` logical decoding plugin.
  - Decodes binary WAL frames into domain-level events (`CdcEvent::Schedule`, `CdcEvent::Reschedule`).
  - Prevents split-brain duplication using SQLSTATE `55006` (`object_in_use`) detection.

---

### Shared Packages Architecture (`packages/`)

```mermaid
graph LR
    subgraph Packages
        PG[packages/postgres-db<br/>Prisma ORM & Schema]
        MONGO[packages/mongo-db<br/>Mongoose PGN Schema]
        REDIS_PKG[packages/redis-db<br/>Redis Client]
        RMQ_PKG[packages/rabbit-mq<br/>RabbitMQ Bus]
        GRPC_PKG[packages/grpc<br/>Proto Stubs]
    end

    HTTP[http-server] --> PG
    WS[ws-server] --> REDIS_PKG
    WS --> GRPC_PKG
    CDC[cdc-service] --> RMQ_PKG
    SYNC[sync-worker] --> MONGO
```

1. **`packages/postgres-db`**: Centralized relational schema defining `User`, `UserAuth`, `Tournament`, `Rating`, `Wallet`, and migrations.
2. **`packages/mongo-db`**: Document models for archival PGN chess move records and historical game analytics.
3. **`packages/redis-db`**: Unified Redis connection clients for caching, stream ingestion, and pub/sub.
4. **`packages/rabbit-mq`**: Message producer/consumer helpers for guaranteed background task processing.
5. **`packages/grpc`**: Compiled Protocol Buffer (`.proto`) interfaces for low-overhead service-to-service RPC.

---

## 3. Architectural Decisions & Technical Rationale (The "Why")

### Decision 1: Why Rust for Matchmaking (`apps/matchmaker`)?
- **Zero Garbage Collection (GC) Pauses**: In real-time Bullet (1-minute) and Blitz (3-minute) chess, a 50ms Node.js or JVM GC pause during peak matchmaking load can cause perceived lag or clock drift. Rust's deterministic memory management guarantees **sub-millisecond (<1ms) P99 latency**.
- **Actix Actor Concurrency**: Matchmaking requires mutating shared rating brackets concurrently. Using Rust's **Actix actors**, state mutation is message-driven and lock-free, eliminating mutex contention across CPU cores.
- **Crash-Resilient Redis Streams (`XGROUP`)**: Instead of ephemeral in-memory queues, matchmaking requests are persisted in Redis Streams. If a matchmaker pod crashes, unacknowledged tickets are reclaimed by another consumer in the group, ensuring zero lost matchmaking tickets.

---

### Decision 2: Why Rust for Change Data Capture (`apps/cdc`)?
- **Zero-Polling Architecture**: Traditional architectures poll the database (`SELECT * FROM tournaments WHERE start_time <= NOW()`), causing expensive CPU spikes and lock contention. Our CDC service reads PostgreSQL **Write-Ahead Logs (WAL)** directly via replication slots (`pg_output`), reacting to database INSERTs/UPDATEs in real time with near-zero database CPU overhead.
- **Zero-Copy WAL Deserialization**: Rust decodes Postgres binary replication frames directly into typed Rust structs (`WalEvent`) without intermediate JSON serialization, achieving throughput exceeding **10,000 events/second**.
- **SQLSTATE `55006` Safety Guard**: In Kubernetes deployments, if a pod is evicted, the CDC service checks Postgres SQLSTATE `55006` (`object_in_use`). If another pod is already holding the replication slot, the standby pod waits gracefully, preventing duplicate event firing.

```mermaid
graph LR
    subgraph PostgreSQL WAL
        DB[(PostgreSQL Neon DB)] -->|WAL Binary Frame| SLOT[Replication Slot<br/>pg_output]
    end

    subgraph Rust CDC Worker
        SLOT -->|pgwire_replication| DEC[WAL Decoder<br/>RelationRegistry]
        DEC -->|CdcEvent::Schedule| SCHED[Tournament Scheduler]
    end

    SCHED -->|Fire Event| RMQ[RabbitMQ / Redis PubSub]
```

---

### Decision 3: Why a 2-Table Authentication Schema (`User` + `UserAuth`)?
- **The Problem with Single-Table Auth**: Storing `passwordHash`, `googleId`, `appleId`, and `authProvider` in a single `User` table leads to nullable column bloat and schema conflicts when users link multiple sign-in methods.
- **Our 2-Table Solution**:
  1. **`model User`**: Contains only pure identity and domain properties (`username`, `email`, `rating`, `profileImageUrl`).
  2. **`model UserAuth`**: Contains credentials (`authType`, `providerId`, `passwordHash`) linked via `userId`.
- **Composite Unique Constraint (`@@unique([userId, authType])`)**: Ensures a user can have at most one credential record per provider type (`CREDENTIALS`, `GOOGLE`).
- **Seamless Account Linking**: If a user signs up with Google (`providerId: sub`) and later adds an email/password, the system simply inserts a second `UserAuth` row without altering identity records.

```mermaid
erDiagram
    User ||--o{ UserAuth : "authMethods (1 to N)"
    User {
        string id PK
        string username
        string email UK
        int rating
        string profileImageUrl
    }
    UserAuth {
        string id PK
        string userId FK
        AuthType authType "CREDENTIALS | GOOGLE"
        string providerId "Email or Google Sub ID"
        string passwordHash "Nullable for OAuth"
    }
```

---

### Decision 4: Why a Hybrid Polyglot Database Architecture?

```mermaid
graph TD
    subgraph OLTP ACID Domain
        PG[(PostgreSQL<br/>Relational DB)] --- U[Users & Wallets]
        PG --- T[Tournaments & Ratings]
    end

    subgraph OLAP Document Domain
        MONGO[(MongoDB<br/>Document DB)] --- M[Move Histories & PGN]
        MONGO --- A[Game Analytics & Replay]
    end

    subgraph Real-Time & Caching Domain
        REDIS[(Redis Cluster<br/>In-Memory DB)] --- S[Live Sessions & Clocks]
        REDIS --- B[Matchmaking Streams]
    end

    subgraph Async Message Bus
        RMQ[(RabbitMQ)] --- E[Email Notifications]
    end
```

- **PostgreSQL (OLTP)**: Selected for transactional ACID guarantees. Absolutely required for user balances, tournament fee deductions, and ELO rating updates where consistency is paramount.
- **MongoDB (OLAP / Unstructured Documents)**: A standard chess game can generate hundreds of move records, PGN annotations, and clock ticks. Storing millions of complete game histories in Postgres causes index bloat; MongoDB documents store nested move arrays efficiently for instant game replay loading.
- **Redis (In-Memory Cache & PubSub)**: Serves as the high-speed state store for active game clocks, WebSocket sticky session mappings, and matchmaking queues.
- **RabbitMQ**: Decouples non-blocking notification tasks (sending emails/OTPs) from user API latency.

---

## 4. Kubernetes Production Architecture & Scaling Guide

The entire Rooky platform is designed for cloud-native orchestration on **Kubernetes (k8s)** with automated CI/CD (`ci-cd.yaml`).

### Kubernetes Topology & Scaling Strategy

```mermaid
graph TD
    subgraph External Traffic
        USER[Users / Chess Players] -->|HTTPS / WSS| ING[Kubernetes Ingress Controller]
    end

    subgraph k8s Stateless Workers - Horizontal Pod Autoscaler HPA
        ING -->|/api/*| HTTP_SVC[Service: http-server]
        ING -->|/ws/*| WS_SVC[Service: ws-server]
        ING -->|/*| WEB_SVC[Service: web]

        HTTP_SVC --> HTTP_PODS[http-server Pods<br/>Min: 2, Max: 20<br/>CPU Target: 70%]
        WS_SVC --> WS_PODS[ws-server Pods<br/>Min: 3, Max: 50<br/>Redis PubSub Backplane]
        WEB_SVC --> WEB_PODS[web Pods<br/>Min: 2, Max: 10]
    end

    subgraph k8s Specialized Rust Computing Nodes
        MM_DEPLOY[Deployment: matchmaker<br/>Sharded Rating Consumer Groups<br/>Min: 2, Max: 10]
        CDC_STS[StatefulSet: cdc-service<br/>Singleton Leader per Replication Slot<br/>SQLSTATE 55006 Guard]
    end

    WS_PODS <-->|XADD / XREADGROUP| MM_DEPLOY
    HTTP_PODS -->|SQL| PG_SVC[(Managed PostgreSQL / Neon)]
    CDC_STS -.->|WAL Slot| PG_SVC
```

---

### Detailed Scaling Strategies by Service Type

#### 1. Stateless HTTP & Frontend Pods (`web`, `http-server`)
- **Scaling Mechanism**: **Horizontal Pod Autoscaler (HPA)** based on CPU utilization (target: `70%`) and memory utilization.
- **Load Balancing**: Standard round-robin load balancing via Kubernetes ClusterIP Services.
- **Zero-Downtime Rolling Updates**: Configured with `maxSurge: 25%` and `maxUnavailable: 0` to ensure no dropped user requests during deployments.

#### 2. WebSocket Real-Time Pods (`ws-server`, `game-server`)
- **Scaling Mechanism**: Scaled horizontally based on active concurrent WebSocket connection counts.
- **Multi-Pod Resilience**: Because WebSockets are persistent TCP connections, players connected to Pod A must receive move broadcasts from opponents connected to Pod B. This is achieved using a **Redis PubSub Backplane**—every pod subscribes to game channel events, enabling infinite horizontal WebSocket pod scaling.

#### 3. Rust Matchmaker Scaling (`matchmaker`)
- **Scaling Mechanism**: Sharded consumer group workers.
- **Concurrency Control**: Multiple `matchmaker` pods consume from the Redis stream `INGEST_STREAM` under consumer group `matchmaker-group`. Redis automatically partitions unread tickets across available pods. If matchmaking volume spikes, scaling from 2 to 10 pods linearly multiplies matchmaking bracket evaluations without race conditions.

#### 4. Rust CDC Replication Scaling (`cdc`)
- **Scaling Mechanism**: **Singleton Leader / StatefulSet** per replication slot.
- **Concurrency Control**: PostgreSQL replication slots (`SLOT_NAME`) can only be read by a single active receiver at a time. The CDC service is deployed as a Kubernetes StatefulSet with `replicas: 1` (or active-passive standby pods using SQLSTATE `55006` lock detection).

---

### Secrets Management & CI/CD Pipeline

In our automated GitHub Actions workflow (`.github/workflows/ci-cd.yaml`), database credentials, OAuth keys, and replication parameters are securely injected into the Kubernetes cluster as generic secrets:

```bash
kubectl create secret generic chess-secrets \
  --from-literal=DATABASE_URL="postgresql://user:pass@pooler.neon.tech/db" \
  --from-literal=MONGO_DB_URL="mongodb+srv://cluster.mongodb.net/chess" \
  --from-literal=REDIS_URL="redis://default:pass@redis-cluster:6379" \
  --from-literal=RABBITMQ_URL="amqp://user:pass@rabbitmq:5672" \
  --from-literal=SLOT_NAME="rooky_cdc_slot" \
  --from-literal=PUBLICATION="rooky_publication" \
  --from-literal=GOOGLE_CLIENT_ID="your_client_id.apps.googleusercontent.com" \
  --from-literal=GOOGLE_CLIENT_SECRET="your_client_secret"
```

---

## 5. Local Development & Quickstart Guide

### Prerequisites
- **Node.js** v18+ & **pnpm** v9+
- **Rust** 1.75+ (Cargo)
- **Docker & Docker Compose** (for local Redis, Postgres, MongoDB, RabbitMQ)

### 1. Install Workspace Dependencies
```bash
pnpm install
```

### 2. Configure Environment Variables
Create your local `.env` files across the workspace:
```bash
# Root .env
cp .env.example .env

# Web Frontend (.env)
NEXT_PUBLIC_URL="http://localhost:3002"
NEXT_PUBLIC_SOCKET_URL="ws://localhost:8080"
NEXT_PUBLIC_GOOGLE_CLIENT_ID="your_google_client_id.apps.googleusercontent.com"
```

### 3. Synchronize Database Schemas
Synchronize the PostgreSQL 2-Table auth schema (`User` & `UserAuth`):
```bash
cd packages/postgres-db
npx prisma generate
npx prisma db push
```

### 4. Build All Apps and Packages
```bash
pnpm build
# Or using Turbo CLI directly:
npx turbo build
```

### 5. Launch Local Development Cluster
Run all frontends, REST APIs, WebSocket servers, and Rust workers concurrently:
```bash
pnpm dev
```
- **Web App (`apps/web`)**: http://localhost:3002
- **REST API (`apps/http-server`)**: http://localhost:3001
- **WebSocket Server (`apps/ws-server`)**: ws://localhost:8080
- **Matchmaker Metrics (`apps/matchmaker`)**: http://localhost:9103/metrics

---

## 6. Verification & Quality Assurance

To ensure zero type regressions across the TypeScript and Rust codebase:

```bash
# Verify TypeScript type integrity across packages & apps
npx tsc --noEmit -p packages/postgres-db
npx tsc --noEmit -p apps/http-server
npx tsc --noEmit -p apps/web

# Verify Rust compile & lint checks
cargo check --manifest-path apps/matchmaker/Cargo.toml
cargo check --manifest-path apps/cdc/Cargo.toml
```

---
*Built by the Rooky Engineering Team — Combining advanced AI agentic workflows, Rust systems performance, and Next.js UI excellence.*
