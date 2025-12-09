# 🚀 Mini-Binance - Crypto Exchange Simulation

A professional crypto-exchange simulation built with Laravel 11, React 18, PostgreSQL, and Redis. Features secure trading, 2FA authentication, KYC verification, and real-time order matching.

![Status](https://img.shields.io/badge/Status-Beta-yellow)
![Laravel](https://img.shields.io/badge/Laravel-11-red)
![React](https://img.shields.io/badge/React-18-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Docker](https://img.shields.io/badge/Docker-Ready-blue)

---

## ✨ Features

### 🔐 Security First
- **Two-Factor Authentication (2FA):** Google Authenticator TOTP
- **Password Security:** Argon2id hashing, strength requirements
- **Session Management:** HttpOnly, Secure, SameSite cookies
- **Rate Limiting:** 5 login/min, 3 OTP/min, 100 orders/min
- **CSRF Protection:** On all state-changing endpoints
- **Audit Logging:** Complete trail of sensitive actions
- **Security Headers:** CSP, X-Frame-Options, HSTS

### 💱 Trading Engine
- **Order Types:** Limit and Market orders
- **Order Sides:** Buy and Sell
- **Order Matching:** Atomic price-time priority matching
- **Fund Locking:** Automatic during order placement
- **Order Book:** Real-time bid/ask display
- **Market Data:** Ticker, recent trades, 24h statistics
- **Portfolio Tracking:** Multi-asset balance overview

### 💰 Wallet System
- **Multi-Asset Support:** BTC, ETH, USDT (extensible)
- **Dual Balance Tracking:** Available and locked funds
- **Deposit System:** Request-based with admin approval
- **Withdrawal System:** 2FA-protected with admin approval
- **Transaction History:** Complete audit trail

### 📋 KYC Verification
- **Document Upload:** ID, selfie, proof of address
- **Admin Workflow:** Approve/reject submissions
- **Status Tracking:** Pending, approved, rejected states
- **Compliance Ready:** Structured for regulatory requirements

### 👮 Admin Panel
- **User Management:** Freeze/unfreeze, grant admin role
- **KYC Management:** Review and approve documents
- **Transaction Control:** Approve/reject deposit/withdrawal
- **Manual Operations:** Credit/debit wallets directly
- **Audit Log Review:** Complete system activity history

---

## 🎯 Quick Start (5 Minutes)

### Prerequisites
- **Docker Desktop** (running)
- **PowerShell 5.1+** (Windows) or Bash (Linux/Mac)
- **8GB RAM** minimum
- **Ports Available:** 80, 5173, 5432, 6379, 8025

### Installation

```powershell
# 1. Clone the repository
git clone https://github.com/yourusername/mini-binance.git
cd mini-binance

# 2. Run automated setup (Windows)
.\setup.ps1

# Or manually (Linux/Mac)
cp .env.example .env
cp api/.env.example api/.env
docker-compose up -d
docker-compose exec api composer install
docker-compose exec api php artisan key:generate
docker-compose exec api php artisan migrate:fresh --seed
cd client && npm install && npm run dev
```

### Access the Application

- **Frontend:** http://localhost:5173
- **API:** http://localhost/api
- **MailHog:** http://localhost:8025 (test emails)

### Test Accounts

**User with Balance:**
```
Email: user2fa@minibinance.local
Password: User2FA@12345678
Balances: 0.5 BTC, 5 ETH, 10,000 USDT
```

**Admin Account:**
```
Email: admin@minibinance.local
Password: Admin@12345678
```

---

## 🏗️ Architecture

```
┌──────────────┐
│    Browser   │
│  (React 18)  │
└──────┬───────┘
       │
       ▼
┌──────────────┐     ┌────────────────┐
│    Nginx     │────▶│  Laravel API   │
│  Port 80     │     │   PHP 8.2      │
└──────────────┘     └────────┬───────┘
                              │
                 ┌────────────┼────────────┐
                 │            │            │
                 ▼            ▼            ▼
          ┌──────────┐ ┌──────────┐ ┌──────────┐
          │PostgreSQL│ │  Redis   │ │  Queue   │
          │    15    │ │    7     │ │  Worker  │
          └──────────┘ └──────────┘ └──────────┘
```

### Tech Stack

**Backend:**
- Laravel 11 (PHP 8.2)
- PostgreSQL 15
- Redis 7 (cache/queue/sessions)
- Laravel Sanctum (authentication)
- Spatie Permissions (RBAC)
- PragmaRX Google2FA (2FA)

**Frontend:**
- React 18
- TypeScript 5
- Vite 5
- TailwindCSS 3
- Zustand (state management)
- React Router 6
- Axios (HTTP client)
- React Hot Toast (notifications)
- Lucide React (icons)

**Infrastructure:**
- Docker & Docker Compose
- Nginx (reverse proxy)
- MailHog (email testing)
- Supervisor (queue worker)

---

## 📁 Project Structure

```
mini-binance/
├── api/                    # Laravel Backend
│   ├── app/
│   │   ├── Http/
│   │   │   ├── Controllers/Api/
│   │   │   │   ├── AuthController.php
│   │   │   │   ├── TwoFactorController.php
│   │   │   │   ├── WalletController.php
│   │   │   │   ├── OrderController.php
│   │   │   │   ├── MarketController.php
│   │   │   │   ├── TransactionController.php
│   │   │   │   ├── KycController.php
│   │   │   │   └── AdminController.php
│   │   │   └── Middleware/
│   │   │       ├── ThrottleLogin.php
│   │   │       ├── ThrottleOtp.php
│   │   │       ├── Require2FA.php
│   │   │       └── EnsureEmailIsVerified.php
│   │   ├── Models/
│   │   │   ├── User.php
│   │   │   ├── Asset.php
│   │   │   ├── Wallet.php
│   │   │   ├── Order.php
│   │   │   ├── Trade.php
│   │   │   ├── Transaction.php
│   │   │   ├── KycDocument.php
│   │   │   └── AuditLog.php
│   │   └── Jobs/
│   │       └── ProcessOrderMatching.php
│   ├── database/
│   │   ├── migrations/
│   │   └── seeders/
│   └── routes/
│       └── api.php
│
├── client/                 # React Frontend
│   ├── src/
│   │   ├── pages/
│   │   │   ├── auth/
│   │   │   │   ├── Login.tsx
│   │   │   │   ├── Register.tsx
│   │   │   │   └── ForgotPassword.tsx
│   │   │   ├── admin/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Trading.tsx
│   │   │   ├── Wallets.tsx
│   │   │   ├── Orders.tsx
│   │   │   ├── Portfolio.tsx
│   │   │   ├── KYC.tsx
│   │   │   └── Profile.tsx
│   │   ├── layouts/
│   │   │   ├── AuthLayout.tsx
│   │   │   └── MainLayout.tsx
│   │   ├── stores/
│   │   │   └── authStore.ts
│   │   ├── lib/
│   │   │   └── api.ts
│   │   └── App.tsx
│   ├── public/
│   ├── package.json
│   └── vite.config.ts
│
├── deploy/
│   └── nginx/
│       ├── nginx.conf
│       └── conf.d/default.conf
│
├── docker-compose.yml
├── setup.ps1
├── .env.example
├── README.md
├── SETUP_GUIDE.md
├── QUICK_START.md
└── BUILD_COMPLETE.md
```

---

## 🔌 API Endpoints

### Authentication
```
POST   /api/auth/register          # Register new user
POST   /api/auth/login             # Login
POST   /api/auth/logout            # Logout
GET    /api/auth/user              # Get current user
POST   /api/auth/forgot-password   # Request password reset
POST   /api/auth/reset-password    # Reset password
POST   /api/auth/change-password   # Change password
```

### Two-Factor Authentication
```
POST   /api/2fa/enable             # Enable 2FA (get QR code)
POST   /api/2fa/verify             # Verify 2FA code
POST   /api/2fa/disable            # Disable 2FA
```

### Wallets
```
GET    /api/wallets                # List all wallets
```

### Trading
```
POST   /api/orders                 # Place order
GET    /api/orders                 # List user orders
DELETE /api/orders/{id}            # Cancel order
GET    /api/orders/portfolio       # Get portfolio summary
```

### Market Data (Public)
```
GET    /api/market/orderbook/{base}/{quote}  # Get order book
GET    /api/market/trades/{base}/{quote}     # Get recent trades
GET    /api/market/ticker/{base}/{quote}     # Get ticker data
```

### Transactions
```
POST   /api/transactions/deposit   # Request deposit
POST   /api/transactions/withdraw  # Request withdrawal
```

### KYC
```
POST   /api/kyc/upload            # Upload KYC document
GET    /api/kyc/status            # Get KYC status
```

### Admin
```
GET    /api/admin/users           # List all users
POST   /api/admin/users/{id}/freeze     # Freeze user
POST   /api/admin/users/{id}/unfreeze   # Unfreeze user
POST   /api/admin/users/{id}/grant-admin # Grant admin role
GET    /api/admin/kyc             # List KYC submissions
POST   /api/admin/kyc/{id}/approve     # Approve KYC
POST   /api/admin/kyc/{id}/reject      # Reject KYC
GET    /api/admin/transactions    # List transactions
POST   /api/admin/transactions/{id}/approve  # Approve transaction
POST   /api/admin/transactions/{id}/reject   # Reject transaction
POST   /api/admin/wallets/credit  # Credit wallet
POST   /api/admin/wallets/debit   # Debit wallet
GET    /api/admin/audit-logs      # View audit logs
```

---

## 🧪 Testing

### Manual Testing
```powershell
# Start all services
docker-compose up -d

# Check service health
docker-compose ps

# View logs
docker-compose logs -f api
docker-compose logs -f worker

# Run Laravel tests (when implemented)
docker-compose exec api php artisan test

# Run frontend tests (when implemented)
cd client && npm test
```

### Test Scenarios

**1. Authentication Flow**
- Register → Verify Email → Login → Setup 2FA → Trade

**2. Trading Flow**
- Login → Place Limit Buy Order → View Order Book → Place Limit Sell Order → Observe Match

**3. Wallet Flow**
- Deposit Request → Admin Approves → Check Balance → Withdraw → Admin Approves

**4. Admin Flow**
- Review KYC → Approve/Reject → Manage Users → View Audit Logs

---

## 🔧 Development

### Local Development Setup

```powershell
# Start backend services
docker-compose up -d db redis

# Run Laravel development server
cd api
composer install
php artisan serve

# Run frontend development server
cd client
npm install
npm run dev
```

### Database Management

```powershell
# Fresh migration with seed data
docker-compose exec api php artisan migrate:fresh --seed

# Create new migration
docker-compose exec api php artisan make:migration create_table_name

# Create new model
docker-compose exec api php artisan make:model ModelName -m

# Create new controller
docker-compose exec api php artisan make:controller Api/ControllerName
```

### Queue Management

```powershell
# View queue jobs
docker-compose exec api php artisan queue:work --verbose

# Clear failed jobs
docker-compose exec api php artisan queue:flush

# Restart queue worker
docker-compose restart worker
```

---

## 🐛 Troubleshooting

### Port Conflicts
```powershell
# Check what's using port 80
netstat -ano | findstr :80

# Kill process (replace PID)
taskkill /PID <PID> /F
```

### Database Issues
```powershell
# Reset database
docker-compose exec api php artisan migrate:fresh --seed

# Check database connection
docker-compose exec api php artisan db:show
```

### Frontend Issues
```powershell
# Clear cache and reinstall
cd client
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install
```

### Docker Issues
```powershell
# Rebuild all containers
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

---

## 📚 Documentation

- **[SETUP_GUIDE.md](SETUP_GUIDE.md)** - Comprehensive setup instructions
- **[QUICK_START.md](QUICK_START.md)** - 5-minute quick start guide
- **[BUILD_COMPLETE.md](BUILD_COMPLETE.md)** - Build status and next steps
- **[PROJECT_STATUS.md](PROJECT_STATUS.md)** - Detailed project status

---

## 🎓 Learning Resources

### Laravel
- [Laravel Documentation](https://laravel.com/docs/11.x)
- [Laravel Sanctum](https://laravel.com/docs/11.x/sanctum)
- [Laravel Queues](https://laravel.com/docs/11.x/queues)

### React
- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [TailwindCSS](https://tailwindcss.com/docs)

### Security
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Laravel Security Best Practices](https://laravel.com/docs/11.x/security)

---

## 📝 License

This project is built for educational purposes as part of a 4th Year IT project.

---

## 🙏 Acknowledgments

- Laravel Framework
- React Team
- TailwindCSS
- Docker
- PostgreSQL
- Redis

---

## 📞 Support

For issues, questions, or contributions:
- Open an issue on GitHub
- Check the documentation files
- Review the troubleshooting section

---

**Built with ❤️ by 4th Year IT Students**  
**Stack:** Laravel 11 | React 18 | PostgreSQL 15 | Redis 7 | Docker
