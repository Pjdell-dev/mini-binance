Mini-binance Project: Developer & Reviewer Requirements (4th Year It) 
Mini-Binance Project 
Audience: 4th Year IT (Dev & Reviewer tracks) 
Build a simplified crypto-exchange–style web app focusing on security-by-design. 
Developers will implement core features with a modern stack; Reviewers will plan 
and execute a lightweight VAPT and verify controls. 
Part A — Developer Requirements (Laravel + React) 
1) Scope (what to build) 
A minimum, working, classroom-safe exchange simulation (no real money/crypto!): 
● Auth & Accounts: register, email verify, login, logout, password reset, TOTP 2FA (e.g., 
Google Authenticator). 
● User Profile & KYC (mock): upload ID image (store locally or S3-compatible dev 
service), status: pending/approved/rejected. 
● Wallets (simulated): balances for at least 2 demo assets (e.g., BTC & ETH test 
tokens). Seed demo balances; allow deposit/withdraw requests (no real blockchain). 
● Order Book Trading (single market: BTC/USDT or BTC/PHPT): place/cancel limit 
and market orders; match engine to create trades; live order book & recent trades 
view. 
● Portfolio: balances, open orders, order/trade history. 
● Admin: approve KYC, freeze user, credit/debit demo tokens, view audit logs. 
Optional nice-to-haves: price chart from seeded data, websockets for live book, 
email/SMS notifications (use MailHog for dev). 
2) Tech Stack (required) 
● Docker (Compose) for all services. 
● Backend: Laravel v12 (or latest available) + PHP 8.2+, Redis (queues/cache), 
PostgreSQL 15+. 
● Frontend: React + Vite + TailwindCSS. 
● Web server: Nginx inside container. 
● Testing: PHPUnit/Pest (backend), Vitest/RTL (frontend). 
● Lint/Static: PHPStan/Psalm, ESLint/TypeScript (TS optional but recommended). 
3) Architecture (suggested Docker Compose services) 
● api: Laravel app (PHP-FPM) 
● web: Nginx serving Laravel API & built React 
● client: React dev server (for local DX) 
● db: PostgreSQL 
● redis: for queues/rate limiting/cache 
● worker: Laravel queue worker (match engine jobs, mail) 
● mailhog: capture outgoing mail in dev 
Directory layout (example): 
repo/ 
/api (Laravel) 
/client (React) 
docker-compose.yml 
/deploy/nginx/nginx.conf 
.env.example (root), api/.env.example, client/.env.example 
4) Data Model (minimum tables) 
● users (id, name, email, password_hash, mfa_secret, kyc_status, role, is_frozen, 
created_at,…) 
● kyc_documents (user_id, doc_type, file_path, status, reviewer_id, notes) 
● assets (id, symbol, name, precision) 
● wallets (id, user_id, asset_id, balance_available, balance_locked) 
● orders (id, user_id, side[buy/sell], type[limit/market], price, qty, qty_filled, status, market, 
created_at,…) 
● trades (id, buy_order_id, sell_order_id, price, qty, taker_user_id, maker_user_id, 
created_at) 
● transactions (id, user_id, asset_id, type[deposit/withdraw], amount, 
status[pending/approved/rejected], created_at) 
● audit_logs (id, actor_user_id, action, target_type, target_id, ip, ua, metadata_json, 
created_at) 
5) API Design (sample endpoints) 
● POST /api/auth/register, POST /api/auth/login, POST 
/api/auth/enable-2fa, POST /api/auth/verify-2fa 
● GET /api/me, PUT /api/me 
● POST /api/kyc/submit, GET /api/kyc/status 
● GET /api/wallets, POST /api/transactions/deposit, POST 
/api/transactions/withdraw 
● GET /api/market/orderbook?market=BTC-USDT, GET /api/market/trades 
● POST /api/orders, DELETE /api/orders/{id}, GET /api/orders/open, GET 
/api/orders/history 
● Admin: GET /api/admin/users, POST /api/admin/users/{id}/freeze, POST 
/api/admin/kyc/{id}/approve, POST /api/admin/credit 
Auth choice: Use server sessions with HttpOnly Secure SameSite=Strict cookies 
(recommended for SPAs) + CSRF tokens for state-changing routes. 
6) Order Matching (simplified) 
Maintain two price-sorted queues per market (bids/asks), price-time priority. 
On new order: match against opposite side while price crosses; create trades; update wallets 
(lock funds for open orders; release on fill/cancel). 
Run matching inside a queue job to keep atomicity (DB transactions + row-level locking) and to 
isolate from HTTP. 
7) Security Requirements (must-have) 
● Passwords: Argon2id; min 12 chars; block pwned passwords (optional: 
haveibeenpwned k-anonymity). 
● 2FA (TOTP) for login and withdrawals; backup codes. 
● Sessions: HttpOnly + Secure + SameSite=Strict; rotate on login; auto-expire (e.g., 30 
min idle, 24h absolute). 
● CSRF on all state-changing POST/PUT/PATCH/DELETE. 
● Input validation & output encoding (backend; React auto-escapes by default but treat 
user content carefully). 
● Rate limiting: login, OTP verify, order placement, withdrawals; IP + user based. 
● Access control: RBAC (user/admin); deny-by-default policy; server-side checks only. 
● File uploads: type/size whitelist, store outside web root, random filenames, scan (basic), 
do not execute. 
● Secrets: NEVER commit .env; use .env.example; load via Docker secrets/compose 
env. 
● Logging & Audit: auth events, admin actions, balance changes, order actions with IP & 
UA. Protect logs. 
● Error handling: no stack traces in production; return generic messages. 
● Headers: HSTS (dev off), CSP (restrict to your origin), X-Frame-Options, 
X-Content-Type-Options, Referrer-Policy. 
● DB: least-privileged DB user; use transactions; enforce constraints; avoid raw SQL. 
● Dependencies: composer audit, npm audit, lockfile committed. 
● Containers: run as non-root; minimal base images; pin versions; no secrets baked into 
images. 
8) Non-Functional 
● Performance: handle 50 concurrent users; p95 < 400ms for main endpoints. 
● Availability: graceful handling of worker restarts; queue retries with backoff. 
● UX: responsive, keyboard-accessible, clear error messages. 
● Testing: unit + feature tests for auth, orders, matching, wallet updates; front-end tests 
for critical flows. 
9) Dev Environment & Commands (examples) 
● docker compose up -d to run services; seed DB with demo users/assets. 
● php artisan migrate --seed; php artisan queue:work (or worker container). 
● npm run dev (client) during active dev; npm run build for production assets. 
10) Deliverables (Dev team) 
1. Repo with clean commit history, README, architecture diagram, ERD. 
2. Dockerized app: docker compose up should start everything. 
3. Test suite with passing status. 
4. Security design doc (3–5 pages): threat model, controls, assumptions, trade-offs. 
5. Demo data & 3 test accounts: (admin, user with 2FA, frozen user). 
6. Short video (≤7 min) walkthrough of features and security controls. 
11) Milestones 
● Week 1–2: Architecture, data model, auth, sessions, 2FA. 
● Week 3–4: Wallets, order model, basic matching. 
● Week 5: Admin, KYC mock, audit logs. 
● Week 6: Hardening, tests, docs, VAPT handoff. 
12) Grading Rubric (Dev) 
● Security-by-design 35% 
● Correctness & reliability 25% 
● Code quality & tests 20% 
● UX & completeness 15% 
● Docs & demo 5% 