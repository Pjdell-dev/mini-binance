# Mini-Binance - Crypto Exchange Simulation

A complete, secure crypto-exchange simulation built with Laravel 11, React, TypeScript, and TailwindCSS following security-by-design principles.

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- Git

### Initial Setup

1. **Clone and Navigate:**
   ```bash
   cd mini-binance
   ```

2. **Copy Environment Files:**
   ```bash
   # Root
   copy .env.example .env
   
   # API
   copy api\.env.example api\.env
   ```

3. **Start Docker Services:**
   ```bash
   docker-compose up -d
   ```

4. **Install Laravel Dependencies & Setup:**
   ```bash
   # Access API container
   docker exec -it mini-binance-api sh
   
   # Inside container:
   composer install
   php artisan key:generate
   php artisan migrate --seed
   php artisan storage:link
   exit
   ```

5. **Install Frontend Dependencies:**
   ```bash
   # Access client container
   docker exec -it mini-binance-client sh
   
   # Inside container:
   npm install
   exit
   ```

6. **Access the Application:**
   - Frontend: http://localhost:5173
   - API: http://localhost/api
   - MailHog: http://localhost:8025

## 📋 Features

### Authentication & Security
- ✅ User registration with email verification
- ✅ Secure login with Argon2id password hashing
- ✅ TOTP 2FA (Google Authenticator compatible)
- ✅ Backup codes for 2FA recovery
- ✅ Password reset functionality
- ✅ Session management with auto-expiry
- ✅ CSRF protection
- ✅ Rate limiting on sensitive endpoints

### Wallet Management
- ✅ Multi-asset wallet support (BTC, ETH, USDT)
- ✅ Deposit/withdrawal requests
- ✅ Admin approval workflow
- ✅ Real-time balance updates

### Trading
- ✅ Order book trading (BTC/USDT market)
- ✅ Limit and market orders
- ✅ Price-time priority matching engine
- ✅ Real-time order book view
- ✅ Trade history
- ✅ Portfolio dashboard

### KYC (Know Your Customer)
- ✅ Document upload system
- ✅ Admin review workflow
- ✅ Status tracking (pending/approved/rejected)

### Admin Panel
- ✅ User management
- ✅ Freeze/unfreeze accounts
- ✅ KYC document review
- ✅ Transaction approvals
- ✅ Manual wallet credit/debit
- ✅ Comprehensive audit logs

## 🏗️ Architecture

### Services
- **db**: PostgreSQL 15 (database)
- **redis**: Redis 7 (cache, queues, sessions)
- **api**: Laravel 11 + PHP 8.2 (backend API)
- **worker**: Laravel queue worker (async processing)
- **web**: Nginx (web server)
- **client**: React + Vite + TypeScript (frontend)
- **mailhog**: Email testing tool

### Tech Stack

**Backend:**
- Laravel 11
- PHP 8.2+
- PostgreSQL 15+
- Redis 7
- PHPUnit (testing)

**Frontend:**
- React 18
- TypeScript
- Vite
- TailwindCSS
- Zustand (state management)
- React Router
- Axios
- Vitest (testing)

## 🔐 Security Features

### Password Security
- Argon2id hashing (OWASP recommended)
- Minimum 12 characters
- Complexity requirements enforced

### Session Security
- HttpOnly cookies
- Secure flag (HTTPS)
- SameSite=Strict
- Auto-expiry: 30min idle, 24h absolute
- Session rotation on login

### Rate Limiting
- Login attempts: 5/min
- OTP verification: 3/min
- Order placement: 100/min
- Withdrawals: 10/min

### Access Control
- Role-based (user/admin)
- Server-side enforcement
- Deny-by-default policy

### Audit Logging
- All authentication events
- Balance changes
- Admin actions
- IP and user agent tracking

### File Upload Security
- Type whitelist (images only for KYC)
- Size limits (5MB)
- Random filenames
- Storage outside web root

### Headers
- X-Frame-Options: SAMEORIGIN
- X-Content-Type-Options: nosniff
- Content-Security-Policy
- Referrer-Policy

## 📊 Database Schema

### Core Tables
- `users` - User accounts
- `assets` - Crypto assets (BTC, ETH, USDT)
- `wallets` - User balances per asset
- `orders` - Buy/sell orders
- `trades` - Executed trades
- `transactions` - Deposits/withdrawals
- `kyc_documents` - KYC verification files
- `audit_logs` - Security audit trail

## 🧪 Test Accounts

After seeding, these accounts are available:

1. **Admin Account:**
   - Email: admin@minibinance.local
   - Password: Admin@12345678
   - 2FA: Disabled

2. **User with 2FA:**
   - Email: user2fa@minibinance.local
   - Password: User2FA@12345678
   - 2FA: Enabled (scan QR on first login)

3. **Frozen User:**
   - Email: frozen@minibinance.local
   - Password: Frozen@12345678
   - Status: Frozen (cannot trade)

## 📝 API Endpoints

### Public
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/forgot-password` - Request password reset
- `GET /api/market/orderbook` - Get order book
- `GET /api/market/trades` - Recent trades

### Protected (Auth Required)
- `GET /api/me` - Get user profile
- `GET /api/wallets` - Get user wallets
- `POST /api/orders` - Place order
- `GET /api/orders/open` - Open orders
- `POST /api/transactions/deposit` - Request deposit
- `POST /api/transactions/withdraw` - Request withdrawal
- `POST /api/2fa/enable` - Enable 2FA
- `POST /api/kyc/submit` - Submit KYC

### Admin
- `GET /api/admin/users` - List users
- `POST /api/admin/users/{id}/freeze` - Freeze user
- `POST /api/admin/kyc/{id}/approve` - Approve KYC
- `POST /api/admin/transactions/{id}/approve` - Approve transaction
- `POST /api/admin/wallets/credit` - Credit wallet
- `GET /api/admin/audit-logs` - View audit logs

## 🔄 Development Workflow

### Running Migrations
```bash
docker exec -it mini-binance-api php artisan migrate
```

### Seeding Database
```bash
docker exec -it mini-binance-api php artisan db:seed
```

### Running Tests
```bash
# Backend
docker exec -it mini-binance-api php artisan test

# Frontend
docker exec -it mini-binance-client npm test
```

### Queue Worker
The queue worker runs automatically in the `worker` container and processes:
- Order matching
- Email notifications
- Transaction processing

### Clearing Cache
```bash
docker exec -it mini-binance-api php artisan cache:clear
docker exec -it mini-binance-api php artisan config:clear
docker exec -it mini-binance-api php artisan route:clear
```

## 🛠️ Troubleshooting

### Database Connection Issues
```bash
# Check if PostgreSQL is running
docker ps | findstr postgres

# View database logs
docker logs mini-binance-db
```

### Permission Issues (Linux/Mac)
```bash
# Fix Laravel storage permissions
sudo chown -R www-data:www-data api/storage api/bootstrap/cache
```

### Frontend Not Loading
```bash
# Rebuild client container
docker-compose up -d --build client

# Check client logs
docker logs mini-binance-client
```

### Clear All Data and Restart
```bash
docker-compose down -v
docker-compose up -d
docker exec -it mini-binance-api php artisan migrate:fresh --seed
```

## 📈 Performance

- Handles 50+ concurrent users
- P95 response time < 400ms
- Order matching via Redis queues
- Database connection pooling
- Redis caching for frequently accessed data

## 🔒 Security Considerations

**Demo Mode:**
This is a simulation for educational purposes. It does NOT:
- Connect to real blockchain networks
- Handle real cryptocurrency
- Process real financial transactions

**Production Deployment:**
For production use, additional measures needed:
- SSL/TLS certificates (HTTPS)
- WAF (Web Application Firewall)
- DDoS protection
- Regular security audits
- Database encryption at rest
- Secrets management (Vault/AWS Secrets Manager)
- Container security scanning
- Penetration testing

## 📚 Documentation

Additional documentation:
- [API Documentation](docs/API.md)
- [Security Design](docs/SECURITY.md)
- [Architecture Diagram](docs/ARCHITECTURE.md)
- [Database ERD](docs/ERD.md)

## 🤝 Contributing

This is an academic project. For modifications:
1. Create feature branch
2. Make changes with tests
3. Submit pull request
4. Ensure all tests pass

## 📄 License

MIT License - Educational purposes only.

## 👥 Credits

Built for 4th Year IT - Security-by-Design Project
Developed following OWASP security guidelines.
