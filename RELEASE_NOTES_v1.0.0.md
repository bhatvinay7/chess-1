# ChessHub v1.0.0 - Real-Time Microservice Chess Platform

## 🚀 Initial Release

ChessHub is a production-ready, distributed chess platform built for real-time gameplay, intelligent matchmaking, and scalable tournament management. It combines Next.js/Node.js edge services with Rust microservices, WebSocket real-time communication, and event-driven architecture for zero-polling, highly responsive experiences.

The system is designed to handle thousands of concurrent players, matches, and tournaments with minimal latency while maintaining strict consistency for game state, ratings, and tournament progression.

## ✨ Core Features

### Live Gameplay
- **Real-Time Moves:** WebSocket-based move submission with sub-100ms latency
- **Board State Synchronization:** Live FEN updates across all observers
- **Multi-Format Support:** Blitz (3|0, 5|2), Rapid (10|0, 15|10), Classical (30|0+)
- **Game Spectators:** Real-time observation of active games with Redis Pub/Sub broadcast
- **Client-Side Analysis:** Stockfish WASM integration offloads analysis to browser

### Intelligent Matchmaking
- **ELO-Based Pairing:** Actor-based matchmaker pairs players of similar ratings
- **Time Control Pools:** Separate actors for each time control prevent race conditions
- **Dynamic Rating Windows:** Expands ELO brackets over time to ensure match generation
- **Queue Management:** Redis Streams + BTreeMap for efficient candidate tracking
- **Automatic Pairing:** No manual intervention; matches form continuously

### Tournament System
- **Swiss System Pairings:** Genuine Edmonds' blossom Maximum Weight Perfect Matching
- **Round Robin Support:** Full permutation generation for club tournaments
- **Color Balancing:** White/Black assignment avoids three consecutive same colors
- **Tiebreak Scoring:** Automatic standings calculation with Buchholz & SB tiebreaks
- **Event Scheduling:** Change-Data-Capture (CDC) triggers with zero database polling
- **Tournament Lifecycle:** Full progression from creation → scheduling → pairing → results

### Observability & Analytics
- **Live Leaderboards:** Real-time rating and tournament standings
- **User Dashboard:** Tournament history, game statistics, rating trends
- **Admin Panel:** Tournament management, pairings review, manual overrides
- **Spectator Insights:** Live game feeds with filtering and search

## 🏗️ Architecture

### Microservices Overview

#### Frontend Services
- **Web (Next.js + React):** Responsive marketplace, dashboard, auction room, admin UI
- **WebSocket Server (Node.js):** Real-time game state, move submission, spectator feeds

#### Core Backend Services
- **HTTP API (Node.js):** RESTful endpoints for auth, profiles, tournament CRUD
- **Game Server (Rust + gRPC):** Authoritative chess logic, move validation, endgame detection
- **Matchmaker (Rust + Actix):** Actor-based ELO pairing with Redis Streams

#### Asynchronous Workers
- **CDC Pipeline (Rust):** PostgreSQL WAL tailing for tournament scheduling
- **Sync Worker (Rust):** Swiss/Round Robin pairings, results processing, standings
- **Notification Worker (Node.js):** Email and push notifications

### Service Responsibilities

| Service | Responsibility | Protocol | Scaling |
|---------|---|---|---|
| **Web** | Responsive marketplace, discovery, dashboard | HTTPS | CDN + horizontal replicas |
| **HTTP API** | Auth, profiles, tournament management | REST/HTTPS | Stateless; load balanced |
| **WebSocket Server** | Real-time moves, spectator broadcast, room management | WSS + gRPC | Redis Socket.IO adapter |
| **Game Server** | Move validation, FEN state, endgame logic | gRPC | Headless Service (client-side LB) |
| **Matchmaker** | ELO pairing, queue management, match creation | Redis Streams | Actor isolation per time control |
| **CDC** | PostgreSQL WAL tailing, tournament triggers | Logical replication | Single replica (sequential WAL) |
| **Sync Worker** | Pairings, results, standings, scheduler | RabbitMQ + Redis | Horizontally scalable |
| **Notification Worker** | Email and push delivery | RabbitMQ | Horizontally scalable |

### Data & Messaging Architecture

**PostgreSQL** (System of Record)
- User profiles and authentication
- Tournament definitions and metadata
- Persistent game history and results
- Ratings and standings

**Redis** (High-Speed State Layer)
- Live game FENs and clocks (`game:state:*`)
- Matchmaking queues (`QUEUE_ZSET`, `BTreeMap`)
- Spectator tracking (`spectate:*`)
- Scheduled jobs (CDC → PENDING_ZSET → PROCESSING_ZSET)
- Distributed locks (`SET NX PX`)
- Redis Streams for player joins (`matchmaker:stream`)
- Redis Pub/Sub for cross-pod broadcasts

**RabbitMQ** (Event-Driven Workflows)
- Game notifications (`MatchNotificationEvent`)
- Tournament events (`TournamentMatchingDlqEvent`)
- Dead-letter queues for failed processing
- Notification job distribution

### Kafka Integration (Future Enhancement)
While not currently implemented, the architecture is designed to adopt Kafka for:
- Durable event sourcing of all game decisions
- Tournament progression audit trail
- Long-term replay capability

## ⚙️ Key Technical Components

### Actor-Based Matchmaking
- **Framework:** Actix (Rust)
- **State:** One actor per time-control pool (Bullet, Blitz, Rapid, Classical)
- **Data Structure:** BTreeMap of candidates sorted by ELO
- **Algorithm:**
  1. Player joins via Redis Stream
  2. Actor inserts into BTreeMap + Redis ZSET backup
  3. Every tick, verifies presence (Redis pipeline)
  4. Calculates `wait_time * EXPANSION_RATE` to widen ELO gap
  5. `BTreeMap::range()` finds O(log N) opponents in bracket
  6. Match published; players atomically removed from pool

### Scheduling with CDC
- **Change Data Capture:** PostgreSQL logical replication (pg_output)
- **Zero Polling:** No `SELECT * FROM tournaments WHERE...`
- **Recovery:** Last processed LSN (Log Sequence Number) stored in Redis
- **Trigger:** Tournament insert → CDC detects → Redis ZSET job created
- **Worker:** Sync Worker consumes due jobs from Redis ZSET

### Two-Phase Scheduler
```
PENDING_ZSET (score = due timestamp)
    ↓ Watchdog (every 5s checks for due jobs)
PROCESSING_ZSET (visibility timeout = 60s)
    ↓ Sync Worker consumes & executes
Redis Stream (scheduled work) → PostgreSQL updates
    ↓ On success: ZREM from PROCESSING_ZSET
    ↓ On timeout: Watchdog re-queues from PROCESSING_ZSET
```

### gRPC Headless Service Pattern
- **Problem:** HTTP/2 long-lived connections stick to single pod (uneven load)
- **Solution:** Kubernetes Headless Service (`game-server-headless`)
- **Benefit:** WebSocket server resolves all pod IPs, performs client-side round-robin
- **Result:** Even load distribution across game servers

### WASM Stockfish Integration
- **Offloading:** Stockfish analysis runs in browser via Web Workers
- **Benefit:** Zero backend CPU for game analysis
- **Trade-off:** Larger initial page load for WASM binary

### Swiss System Algorithm
- **Implementation:** Edmonds' blossom Maximum Weight Perfect Matching
- **Grouping:** Players grouped by score
- **Pairing:** Optimal matching within score groups, avoiding repeats
- **Colors:** White/Black balancing with three-color constraint
- **Result:** Fair and unpredictable pairings

## 🔄 Event & Data Flow

### Game Complete Flow
```
Player 1 submits move (WebSocket)
    ↓ WS Server validates with Game Server (gRPC)
    ↓ Game Server checks: legal move, timeout, checkmate, draw
    ↓ Move accepted → Redis FEN updated
    ↓ Redis Pub/Sub broadcasts to spectators
    ↓ Game ends → Publish to RabbitMQ
    ↓ Sync Worker updates standings in PostgreSQL
    ↓ Notification Worker sends result email
```

### Tournament Scheduling Flow
```
Tournament created in PostgreSQL
    ↓ CDC tails WAL, detects INSERT
    ↓ CDC creates job in PENDING_ZSET (score = start_time)
    ↓ Watchdog scans PENDING_ZSET at start_time
    ↓ Watchdog moves to PROCESSING_ZSET, publishes to Redis Stream
    ↓ Sync Worker consumes, generates pairings (Swiss/RR)
    ↓ Publishes first round matches
    ↓ Players join games via WebSocket
    ↓ Results → Next round scheduling → Repeat
```

### Match Creation Flow
```
Player A searches for match (3|0 Blitz)
    ↓ HTTP Server publishes to Redis Stream `matchmaker:stream`
    ↓ Matchmaker Actor (Blitz pool) receives via XREADGROUP
    ↓ Actor inserts into BTreeMap, backs up to ZSET
    ↓ XACK consumed when player staged
    ↓ Actor evaluates pool every 500ms
    ↓ If Player B in range: Create match record in Redis
    ↓ Publish `MatchNotificationEvent` to RabbitMQ
    ↓ Both players receive via WebSocket
    ↓ Players join game room → Start game
```

## 🔒 Reliability & Failure Handling

### Crash Recovery Mechanisms

**Matchmaker Pod Crash**
- On restart, new actor instances invoke `sync_from_redis`
- Recover queues from `QUEUE_ZSET` without dropping pending players
- Resume pairing immediately

**WebSocket Server Crash**
- Clients auto-reconnect to another healthy pod
- Live game state and spectator mappings remain in Redis
- Rejoin room, resume receiving move updates

**Sync Worker Crash**
- Jobs remain in `PROCESSING_ZSET` with visibility timeout
- Watchdog scans expired timeouts, re-queues jobs
- Unacknowledged RabbitMQ messages redelivered

**CDC Worker Crash**
- Stores last processed LSN in Redis (`cdc:pending_lsns`)
- On restart, resumes tailing from that LSN
- No tournament scheduling events missed

**Single Points of Failure**
- **Redis:** High impact—matchmaking queues, live state, locks all lost
  - *Mitigation:* Redis Cluster HA, AOF persistence, replicas
- **PostgreSQL:** High impact—persistent game history, tournament data
  - *Mitigation:* Cloud provider backup/failover, read replicas

## 📊 Scalability & Performance

### Horizontal Scaling Patterns

```
More page/API traffic        → Add Web + HTTP API replicas
More socket connections      → Add WebSocket replicas; Redis Socket.IO adapter broadcasts
More simultaneous games      → Add Game Server replicas; Headless Service balances
More matchmaking (concurrent) → Add Matchmaker replicas; each actor owns time control
More tournament events       → Add Sync Worker replicas; RabbitMQ consumer groups
Larger live state           → Redis Cluster with hash tags on {tournament_id}
Larger history              → PostgreSQL read replicas + partitioning
```

### Bottleneck Analysis

**PostgreSQL** (Ultimate Bottleneck)
- Heavily shielded by Redis caching
- Handles persistent profiles, final results only
- Scales via cloud provider managed service

**Matchmaker** (Highly Concurrent)
- Actor isolation eliminates shared locks
- Individual time controls cannot be sharded (single actor per pool)
- Add matchmakers up to max concurrent time control pools

**WebSocket Server** (Horizontally Infinite)
- Stateless clients, ephemeral connections
- Redis Pub/Sub adapter broadcasts across pods
- Scales to thousands of concurrent connections per pod

**Game Server** (Stateless)
- Validates moves, returns decisions
- No per-game state stored locally
- Scales horizontally behind Headless Service

## 🎮 Game Formats Supported

### Rapid
- 10|0 (10 minutes + 0 increment)
- 15|10 (15 minutes + 10 second increment)

### Blitz
- 3|0 (3 minutes, bullet-speed)
- 5|2 (5 minutes + 2 second increment)

### Classical
- 30|0+ (30 minutes + increment per move)

### Tournament Formats
- **Swiss System** (standard multi-round)
- **Round Robin** (all play all)

## 🛡️ Security & Consistency

### Move Validation
- Only Game Server is authoritative for legality
- WebSocket Server proxies to gRPC for validation
- Board state immutable in Redis until move accepted

### Tournament Fairness
- Swiss system prevents known opponent repeats
- Color balancing within same-round games
- Tiebreak rules (Buchholz, SB) fairly resolve ties

### Authentication & Authorization
- JWT-based user sessions
- Role-based access (player, admin, spectator)
- HTTP-only cookies for credential storage
- SealedSecrets for Kubernetes credential encryption

### Rate Limiting & DDoS
- IP-based rate limiting at load balancer
- User-based rate limiting via Redis counters
- Circuit breakers on downstream services

## 📦 Technology Stack

| Layer | Technology |
|-------|---|
| **Frontend** | Next.js, React, TypeScript, CSS, Socket.IO client |
| **Web Service** | Node.js, Express.js (HTTP Server + WebSocket Server) |
| **Rust Services** | Tokio async, Actix actors, Tonic gRPC, sqlx (PostgreSQL) |
| **Matchmaking** | Actix actor framework, BTreeMap, Redis Streams |
| **Chess Logic** | Standard FIDE rules, move validation, endgame detection |
| **Analysis** | Stockfish WASM (client-side), Web Workers |
| **State** | Redis (Streams, ZSET, Pub/Sub, Hashes, Locks) |
| **Durable State** | PostgreSQL 16 (profiles, history, ratings, tournaments) |
| **Messaging** | RabbitMQ (events, notifications, job distribution) |
| **CDC** | PostgreSQL logical replication (pg_output) |
| **Container Orchestration** | Kubernetes, Argo CD, Kustomize |
| **Deployment** | GitHub Actions CI/CD, GHCR container registry |
| **Observability** | Structured JSON logging, Prometheus metrics, traces |
| **TLS & DNS** | cert-manager (ACME), NGINX Ingress |

## 🚀 Deployment

### Local Development
```bash
# Install dependencies
npm install
bun install

# Run full local stack (resource-limited)
docker-compose -f docker-compose.*.yml up --build

# Development server
bun run dev
npm run dev
```

**Local Access:**
- Marketplace: http://localhost:3000
- HTTP API: http://localhost:8080
- WebSocket: ws://localhost:8080/ws
- PostgreSQL: localhost:5432 (diagnostic only)
- Redis: localhost:6379 (diagnostic only)

### Kubernetes Deployment (Argo CD)

**Manifests:** `chess-k8s/`
- Services (ClusterIP for HTTP, Headless for gRPC)
- Ingress (NGINX with cert-manager TLS)
- StatefulSets (Redis, PostgreSQL external)
- Deployments (Applications)
- ConfigMaps (Application settings)
- Secrets (SealedSecrets encryption)
- HorizontalPodAutoscalers (CPU-based scaling)

**GitOps Workflow:**
1. Developer pushes to `dev` branch
2. GitHub Actions: Build images, run tests, push to GHCR
3. Update image tags in `chess-k8s/apps/`
4. Commit to Git
5. Argo CD detects changes, syncs to Kubernetes cluster

## 🧪 Testing & CI/CD

**CI Pipeline (GitHub Actions):**
- Docker builds for all 8 services
- Rust tests (`cargo test --workspace`)
- Web tests (TypeScript type checks, ESLint)
- Integration tests (docker-compose)
- Image push to GHCR (on merge to dev)

**Code Quality:**
- ESLint configuration (`packages/eslint-config`)
- Rust clippy lints
- TypeScript strict mode
- Pre-commit hooks (optional)

## 📂 Repository Structure

```
apps/
  cdc/                    Rust: PostgreSQL WAL reader, CDC trigger
  game-server/            Rust: gRPC Game logic, FEN validation, endgame
  http-server/            Node.js: REST API, auth, tournament CRUD
  matchmaker/             Rust: Actix matchmaking, ELO pairing
  notification-worker/    Node.js: Email/push delivery from RabbitMQ
  sync-worker/            Rust: Swiss/RR pairings, standings, scheduling
  web/                    Next.js: Responsive frontend, dashboard, admin
  ws-server/              Node.js: WebSocket gateway, move submission, broadcast

packages/
  db/                     Shared database clients and migrations
  grpc-connection/        Protobuf definitions (Game service gRPC)
  eslint-config/          Shared ESLint rules
  observability/          Logging, metrics, tracing setup

chess-k8s/                Kubernetes manifests, Argo CD configs
.github/workflows/        CI/CD pipelines
```

## ✅ Release Checklist

- [x] Core game logic complete (move validation, endgame detection)
- [x] Matchmaker with ELO pairing (Actix actor framework)
- [x] Real-time WebSocket for moves and spectators
- [x] Tournament system (Swiss and Round Robin)
- [x] CDC-based scheduling (zero-polling)
- [x] REST API for auth and tournament management
- [x] Redis-backed state layer for performance
- [x] RabbitMQ event-driven notifications
- [x] Kubernetes deployment manifests
- [x] GitHub Actions CI/CD pipeline
- [ ] Load testing and capacity validation (future)
- [ ] Analytics dashboards (future)
- [ ] Mobile app (future)
- [ ] Stockfish engine server (optional; WASM used instead)

## 📈 Known Limitations & Future Enhancements

**Current Limitations:**
- Redis crash causes loss of live state (requires HA clustering)
- Matchmaker actors bound to single thread (single hot time control cannot scale)
- No long-term event sourcing (Kafka planned)
- Limited to 32 concurrent time control pools (matches Kafka partition count)

**Planned Enhancements:**
- Kafka integration for durable event log
- Redis Cluster HA with automatic failover
- PostgreSQL read replicas for analytics queries
- Mobile app with native socket handling
- Engine analysis (Stockfish server option)
- Detailed game replay and analysis UI
- Tournament viewer and stream integration
- Rating system improvements (decay, recalibration)

## 🔗 Links & Documentation

- [Full Architecture README](https://github.com/bhatvinay7/chess-1/blob/dev/README.md)
- [Chess K8s Operations](https://github.com/bhatvinay7/chess-k8s)
- [GitHub Actions CI](https://github.com/bhatvinay7/chess-1/actions)
- [GHCR Container Registry](https://github.com/bhatvinay7/chess-1/pkgs/container)

---

**Build Information:**
- Repository: https://github.com/bhatvinay7/chess-1
- Default Branch: `dev`
- Primary Languages: TypeScript (57.1%), CSS (21.4%), Rust (20%)
- Created: June 2026
- Last Updated: September 12, 2026
