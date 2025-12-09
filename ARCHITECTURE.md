# Mini-Binance Architecture & Database Design

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENT LAYER                                   │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │  React 18 SPA (Vite Dev Server)                                 │    │
│  │  - Authentication Pages (Login, Register, 2FA)                  │    │
│  │  - Trading Interface (Order Book, Place Orders)                 │    │
│  │  - Portfolio Dashboard (Balances, Orders, Trades)               │    │
│  │  - Admin Panel (User Management, KYC, Transactions)             │    │
│  │  - State Management: Zustand + React Query                      │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                          ↕ HTTPS (Nginx)                                │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                         PRESENTATION LAYER                               │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │  Nginx (Reverse Proxy)                                          │    │
│  │  - TLS Termination                                              │    │
│  │  - Static File Serving                                          │    │
│  │  - Security Headers (CSP, HSTS, X-Frame-Options)               │    │
│  │  - Request Routing                                              │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                          ↕ FastCGI                                      │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                        APPLICATION LAYER                                 │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │  Laravel 11 (PHP 8.2-FPM)                                       │    │
│  │  ┌──────────────────────────────────────────────────────────┐  │    │
│  │  │  HTTP Controllers (RESTful API)                           │  │    │
│  │  │  - AuthController (Login, Register, 2FA)                  │  │    │
│  │  │  - OrderController (Place, Cancel, History)               │  │    │
│  │  │  - MarketController (Order Book, Ticker, Trades)          │  │    │
│  │  │  - WalletController (Balances)                            │  │    │
│  │  │  - TransactionController (Deposit, Withdraw)              │  │    │
│  │  │  - KycController (Upload, Status)                         │  │    │
│  │  │  - AdminController (User/KYC/Transaction Management)      │  │    │
│  │  └──────────────────────────────────────────────────────────┘  │    │
│  │  ┌──────────────────────────────────────────────────────────┐  │    │
│  │  │  Middleware (Security & Rate Limiting)                    │  │    │
│  │  │  - Sanctum Auth (CSRF + Session)                          │  │    │
│  │  │  - EnsureEmailIsVerified                                  │  │    │
│  │  │  - EnsureUserIsAdmin                                      │  │    │
│  │  │  - ThrottleLogin (5 req/min)                              │  │    │
│  │  │  - ThrottleOtp (3 req/5min)                               │  │    │
│  │  │  - Rate Limiters (Orders: 10/min, Withdrawals: 5/hr)     │  │    │
│  │  └──────────────────────────────────────────────────────────┘  │    │
│  │  ┌──────────────────────────────────────────────────────────┐  │    │
│  │  │  Eloquent Models (ORM)                                    │  │    │
│  │  │  - User, Wallet, Asset, Order, Trade, Transaction        │  │    │
│  │  │  - KycDocument, AuditLog                                  │  │    │
│  │  └──────────────────────────────────────────────────────────┘  │    │
│  └────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                         BUSINESS LOGIC LAYER                             │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │  Queue Jobs (Laravel Horizon Worker)                            │    │
│  │  ┌──────────────────────────────────────────────────────────┐  │    │
│  │  │  ProcessOrderMatching                                     │  │    │
│  │  │  - Price-Time Priority Matching                           │  │    │
│  │  │  - Atomic Trade Execution (DB Transactions)               │  │    │
│  │  │  - Fund Locking/Unlocking                                 │  │    │
│  │  │  - Balance Updates (BCMath Precision)                     │  │    │
│  │  │  - Trade Record Creation                                  │  │    │
│  │  └──────────────────────────────────────────────────────────┘  │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                          ↕ Redis Queue                                  │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                           DATA LAYER                                     │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐     │
│  │  PostgreSQL 15+  │  │  Redis 7         │  │  File Storage    │     │
│  │  ┌────────────┐  │  │  ┌────────────┐  │  │  ┌────────────┐  │     │
│  │  │ Users      │  │  │  │ Sessions   │  │  │  │ KYC Docs   │  │     │
│  │  │ Wallets    │  │  │  │ Cache      │  │  │  │ (Outside   │  │     │
│  │  │ Assets     │  │  │  │ Rate Limit │  │  │  │  webroot)  │  │     │
│  │  │ Orders     │  │  │  │ Queues     │  │  │  └────────────┘  │     │
│  │  │ Trades     │  │  │  └────────────┘  │  │                  │     │
│  │  │ Txns       │  │  │                  │  │                  │     │
│  │  │ KYC        │  │  │                  │  │                  │     │
│  │  │ Audit Logs │  │  │                  │  │                  │     │
│  │  └────────────┘  │  └──────────────────┘  └──────────────────┘     │
│  │  - Row Locking  │  │  - Pub/Sub (future)│  │  - 5MB limit     │     │
│  │  - Transactions │  │  - Atomic Ops      │  │  - Whitelist ext │     │
│  │  - Constraints  │  │  - Sliding Window  │  │  - Random names  │     │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘     │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                        SUPPORTING SERVICES                               │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  MailHog (Development Email Testing)                              │  │
│  │  - Captures all outgoing emails                                   │  │
│  │  - Web UI on port 8025                                            │  │
│  │  - SMTP server on port 1025                                       │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                         EXTERNAL SERVICES                                │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  Have I Been Pwned API (Pwned Password Check)                     │  │
│  │  - K-anonymity (5 SHA-1 hash prefix)                              │  │
│  │  - No plaintext password transmission                             │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Request Flow Diagrams

### 1. User Registration Flow

```
User Browser          Nginx         Laravel API       PostgreSQL      Redis     MailHog
     │                 │                │                │             │           │
     ├─POST /register─>│                │                │             │           │
     │                 ├─FastCGI──────>│                │             │           │
     │                 │                ├─Validate input │             │           │
     │                 │                ├─Check pwned pw─┼─(external)─>│           │
     │                 │                │<─PwnedAPI OK───┤             │           │
     │                 │                ├─Hash password─>│             │           │
     │                 │                ├─INSERT user───>│             │           │
     │                 │                │<─User created──┤             │           │
     │                 │                ├─CREATE wallets>│             │           │
     │                 │                ├─Send verify email──────────────────────>│
     │                 │                ├─Log action────>│             │           │
     │                 │<─201 Created───┤                │             │           │
     │<─JSON response──┤                │                │             │           │
     │                 │                │                │             │           │
```

### 2. Order Placement & Matching Flow

```
User Browser     Nginx    Laravel API   ProcessOrderMatching  PostgreSQL  Redis
     │            │           │                  │                │         │
     ├─POST order─>│           │                  │                │         │
     │            ├─FastCGI──>│                  │                │         │
     │            │           ├─Validate input   │                │         │
     │            │           ├─Check balance───>│                │         │
     │            │           │<─Sufficient─────┤                │         │
     │            │           ├─BEGIN TXN───────>│                │         │
     │            │           ├─INSERT order────>│                │         │
     │            │           ├─LOCK wallet─────>│                │         │
     │            │           ├─UPDATE balance──>│                │         │
     │            │           ├─COMMIT TXN──────>│                │         │
     │            │           ├─Dispatch job──────────────────────────────>│
     │            │           ├─Log action──────>│                │         │
     │            │<─201 OK───┤                  │                │         │
     │<─JSON──────┤           │                  │                │         │
     │            │           │                  │                │         │
     │            │           │                  │<─Pull job──────┤         │
     │            │           │                  ├─BEGIN TXN─────>│         │
     │            │           │                  ├─LOCK wallets──>│         │
     │            │           │                  ├─Match orders──>│         │
     │            │           │                  ├─CREATE trade──>│         │
     │            │           │                  ├─UPDATE balances>│        │
     │            │           │                  ├─UPDATE orders─>│         │
     │            │           │                  ├─COMMIT TXN────>│         │
     │            │           │                  ├─Log trades────>│         │
```

### 3. 2FA Login Flow

```
User Browser     Nginx    Laravel API    Redis      PostgreSQL
     │            │           │            │             │
     ├─POST login─>│           │            │             │
     │            ├─FastCGI──>│            │             │
     │            │           ├─Rate limit check────────>│
     │            │           │<─OK───────────────────────┤
     │            │           ├─Find user───────────────>│
     │            │           │<─User data───────────────┤
     │            │           ├─Verify password          │
     │            │           ├─Check 2FA enabled        │
     │            │<─200 OK───┤ (2FA required)           │
     │<─JSON──────┤           │                          │
     │            │           │                          │
     ├─POST verify-2fa────────>│                          │
     │            ├─FastCGI──>│                          │
     │            │           ├─OTP rate limit──────────>│
     │            │           │<─OK──────────────────────┤
     │            │           ├─Verify TOTP code         │
     │            │           ├─Create session──────────>│
     │            │           ├─Log login──────────────>│
     │            │<─200 OK───┤                          │
     │<─Set-Cookie─┤           │                          │
```

---

## Entity Relationship Diagram (ERD)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CORE ENTITIES                                    │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────┐         ┌──────────────────────────────┐
│          USERS               │         │          ASSETS              │
├──────────────────────────────┤         ├──────────────────────────────┤
│ PK id                 bigint │         │ PK id                 bigint │
│    name               varchar│         │    symbol             varchar│
│    email              varchar│◄────┐   │    name               varchar│
│    password_hash      varchar│     │   │    precision          int    │
│    email_verified_at  timestamp    │   │    is_active          boolean│
│    kyc_status         enum    │     │   │    created_at         timestamp
│    role               enum    │     │   │    updated_at         timestamp
│    is_admin           boolean│     │   └──────────────────────────────┘
│    is_frozen          boolean│     │                  │
│    mfa_enabled        boolean│     │                  │ 1
│    mfa_secret         varchar│     │                  │
│    backup_codes       json   │     │                  │
│    created_at         timestamp     │                  │
│    updated_at         timestamp     │            *     ▼
└──────────────────────────────┘     │   ┌──────────────────────────────┐
           │                         │   │         WALLETS              │
           │ 1                       │   ├──────────────────────────────┤
           │                         └───│ PK id                 bigint │
           │                             │ FK user_id            bigint │
           │                             │ FK asset_id           bigint │
           │                             │    balance_available  decimal│
           │ *                           │    balance_locked     decimal│
           ▼                             │    created_at         timestamp
┌──────────────────────────────┐         │    updated_at         timestamp
│         ORDERS               │         └──────────────────────────────┘
├──────────────────────────────┤                  │
│ PK id                 bigint │                  │ 1
│ FK user_id            bigint │                  │
│    market             varchar│                  │
│    side               enum   │                  │
│    type               enum   │                  │ *
│    price              decimal│                  ▼
│    quantity           decimal│         ┌──────────────────────────────┐
│    quantity_filled    decimal│         │      TRANSACTIONS            │
│    quantity_remaining decimal│         ├──────────────────────────────┤
│    status             enum   │         │ PK id                 bigint │
│    created_at         timestamp        │ FK user_id            bigint │
│    updated_at         timestamp        │ FK asset_id           bigint │
└──────────────────────────────┘         │    type               enum   │
           │                             │    amount             decimal│
           │ 2 (buy + sell)              │    status             enum   │
           │                             │    address            varchar│
           ▼                             │    txid               varchar│
┌──────────────────────────────┐         │    approved_by        bigint │
│          TRADES              │         │    approved_at        timestamp
├──────────────────────────────┤         │    rejected_reason    text   │
│ PK id                 bigint │         │    created_at         timestamp
│ FK buy_order_id       bigint │         │    updated_at         timestamp
│ FK sell_order_id      bigint │         └──────────────────────────────┘
│    price              decimal│
│    quantity           decimal│                  │ *
│    buyer_user_id      bigint │                  │
│    seller_user_id     bigint │                  │
│    taker_user_id      bigint │           1      ▼
│    maker_user_id      bigint │         ┌──────────────────────────────┐
│    market             varchar│         │      KYC_DOCUMENTS           │
│    created_at         timestamp        ├──────────────────────────────┤
└──────────────────────────────┘         │ PK id                 bigint │
                                        │ FK user_id            bigint │
                                        │    doc_type           enum   │
                                        │    file_path          varchar│
                                        │    status             enum   │
                                        │    reviewer_id        bigint │
                                        │    review_notes       text   │
                                        │    reviewed_at        timestamp
┌──────────────────────────────┐         │    created_at         timestamp
│       AUDIT_LOGS             │         │    updated_at         timestamp
├──────────────────────────────┤         └──────────────────────────────┘
│ PK id                 bigint │
│ FK actor_user_id      bigint │
│    action             varchar│
│    target_type        varchar│
│    target_id          bigint │
│    ip_address         inet   │
│    user_agent         text   │
│    metadata           json   │
│    created_at         timestamp
└──────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                          RELATIONSHIPS                                   │
└─────────────────────────────────────────────────────────────────────────┘

USERS 1 ──< * WALLETS          (One user has many wallets)
ASSETS 1 ──< * WALLETS         (One asset appears in many wallets)
USERS 1 ──< * ORDERS           (One user places many orders)
ORDERS 2 ──< 1 TRADES          (One trade involves 2 orders: buy + sell)
USERS 1 ──< * TRANSACTIONS     (One user has many transactions)
ASSETS 1 ──< * TRANSACTIONS    (One asset has many transactions)
USERS 1 ──< * KYC_DOCUMENTS    (One user uploads many KYC documents)
USERS 1 ──< * AUDIT_LOGS       (One user performs many actions)

┌─────────────────────────────────────────────────────────────────────────┐
│                         DATABASE CONSTRAINTS                             │
└─────────────────────────────────────────────────────────────────────────┘

UNIQUE CONSTRAINTS:
- users.email
- assets.symbol
- (wallets.user_id, wallets.asset_id)

CHECK CONSTRAINTS:
- wallets.balance_available >= 0
- wallets.balance_locked >= 0
- orders.quantity > 0
- orders.quantity_filled >= 0
- orders.quantity_remaining >= 0
- orders.price > 0 (for limit orders)
- trades.quantity > 0
- trades.price > 0
- transactions.amount > 0

FOREIGN KEY CONSTRAINTS (ON DELETE):
- wallets.user_id -> users.id (CASCADE)
- wallets.asset_id -> assets.id (RESTRICT)
- orders.user_id -> users.id (CASCADE)
- trades.buy_order_id -> orders.id (RESTRICT)
- trades.sell_order_id -> orders.id (RESTRICT)
- transactions.user_id -> users.id (CASCADE)
- transactions.asset_id -> assets.id (RESTRICT)
- kyc_documents.user_id -> users.id (CASCADE)
- audit_logs.actor_user_id -> users.id (SET NULL)

INDEXES:
- users.email (UNIQUE)
- wallets.user_id, wallets.asset_id (COMPOSITE)
- orders.user_id, orders.status (COMPOSITE)
- orders.market, orders.status, orders.side, orders.price (for matching)
- trades.buyer_user_id, trades.seller_user_id
- transactions.user_id, transactions.status
- kyc_documents.user_id, kyc_documents.status
- audit_logs.actor_user_id, audit_logs.created_at (for queries)
```

---

## Technology Stack Details

### Backend
- **Framework**: Laravel 11.x
- **Language**: PHP 8.2+
- **Database**: PostgreSQL 15+
- **Cache/Queue**: Redis 7
- **Web Server**: Nginx 1.25+
- **Process Manager**: PHP-FPM
- **Authentication**: Laravel Sanctum (Session-based)
- **2FA**: PragmaRX Google2FA
- **Queue Worker**: Laravel Horizon (optional monitoring)

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite 5
- **Language**: TypeScript 5
- **State Management**: Zustand
- **Data Fetching**: Axios
- **Styling**: Tailwind CSS 3
- **Icons**: Lucide React
- **Notifications**: React Hot Toast

### Infrastructure
- **Containerization**: Docker + Docker Compose
- **Orchestration**: Docker Compose (dev), Kubernetes (future)
- **Mail Testing**: MailHog
- **Monitoring**: Laravel Telescope (dev), Prometheus/Grafana (prod)
- **Logging**: Laravel Log (files), Monolog

### Security Tools
- **Password Hashing**: Argon2id (native PHP)
- **Password Checking**: Have I Been Pwned API
- **Static Analysis**: PHPStan Level 5
- **Linting**: PHP_CodeSniffer (PSR-12)
- **CSRF**: Laravel Sanctum
- **Rate Limiting**: Redis-backed (sliding window)

---

**Document Version**: 1.0  
**Last Updated**: November 2025  
**Maintained by**: Mini-Binance Development Team
