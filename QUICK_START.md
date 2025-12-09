# 🚀 Mini-Binance - Quick Start Guide

## Prerequisites
- ✅ Docker Desktop installed and running
- ✅ Git (for cloning)
- ✅ Windows PowerShell (Admin mode)

## Installation (5 Minutes)

### Step 1: Run Setup Script
```powershell
# Navigate to project directory
cd mini-binance

# Run the automated setup script
.\setup.ps1
```

The setup script will:
- ✅ Create environment files
- ✅ Start Docker containers
- ✅ Install Laravel dependencies
- ✅ Generate application key
- ✅ Run database migrations
- ✅ Seed demo data
- ✅ Install frontend dependencies

### Step 2: Access the Application

Once setup completes, open your browser:

- **Frontend (Trading App)**: http://localhost:5173
- **API Documentation**: http://localhost/api
- **Email Inbox (MailHog)**: http://localhost:8025

## 🔑 Test Accounts

### Admin Account (Full Access)
```
Email:    admin@minibinance.local
Password: Admin@12345678
```
**Can do:** Manage users, approve KYC, approve transactions, view audit logs

### Regular User (With Demo Balance)
```
Email:    user2fa@minibinance.local
Password: User2FA@12345678
```
**Has:** 0.5 BTC, 5 ETH, 10,000 USDT
**Can do:** Trade, deposit, withdraw, enable 2FA

### Frozen User (Restricted)
```
Email:    frozen@minibinance.local
Password: Frozen@12345678
```
**Status:** Account frozen - cannot trade

## 📝 What to Try

### As Regular User
1. ✅ **Login** → Navigate to login page
2. ✅ **View Wallets** → See BTC, ETH, USDT balances
3. ✅ **Place Order** → Go to Trading, place limit/market order
4. ✅ **Enable 2FA** → Profile → Enable 2FA, scan QR code
5. ✅ **Submit KYC** → Upload ID document for verification

### As Admin
1. ✅ **Approve KYC** → Admin Panel → KYC → Approve pending documents
2. ✅ **Approve Deposits** → Admin → Transactions → Approve pending deposits
3. ✅ **Freeze User** → Admin → Users → Select user → Freeze
4. ✅ **Credit Wallet** → Admin → Credit/Debit → Add demo tokens
5. ✅ **View Audit Logs** → See all system activities

## 🎯 Key Features to Test

### Trading
- Place **limit orders** (specify price)
- Place **market orders** (instant execution)
- View **order book** (live bids/asks)
- Check **trade history**
- Monitor **portfolio** performance

### Wallets
- Request **deposit** (admin approval required)
- Request **withdrawal** (requires 2FA if enabled)
- View **balance** (available + locked)

### Security
- Enable **TOTP 2FA** with Google Authenticator
- Test **backup codes** for recovery
- Check **session timeout** (30 min idle)
- Verify **rate limiting** (too many login attempts)

## 🛠️ Useful Commands

### View Logs
```powershell
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api
docker-compose logs -f client
docker-compose logs -f worker
```

### Restart Services
```powershell
# Restart all
docker-compose restart

# Restart specific
docker-compose restart api
docker-compose restart worker
```

### Database Operations
```powershell
# Reset database and reseed
docker exec mini-binance-api php artisan migrate:fresh --seed

# Run migrations only
docker exec mini-binance-api php artisan migrate

# Seed data only
docker exec mini-binance-api php artisan db:seed
```

### Laravel Commands
```powershell
# Clear cache
docker exec mini-binance-api php artisan cache:clear
docker exec mini-binance-api php artisan config:clear
docker exec mini-binance-api php artisan route:clear

# View routes
docker exec mini-binance-api php artisan route:list

# Run tests
docker exec mini-binance-api php artisan test
```

### Queue Worker
```powershell
# Check worker status
docker-compose ps worker

# View worker logs
docker-compose logs -f worker

# Restart worker
docker-compose restart worker
```

## 🐛 Troubleshooting

### Can't access http://localhost:5173
```powershell
# Check if client is running
docker-compose ps client

# Restart client
docker-compose restart client

# View client logs
docker-compose logs -f client
```

### Database connection error
```powershell
# Check if database is running
docker-compose ps db

# Restart database
docker-compose restart db

# Reset database
docker exec mini-binance-api php artisan migrate:fresh --seed
```

### Orders not matching
```powershell
# Check worker is running
docker-compose ps worker

# View worker logs
docker-compose logs -f worker

# Restart worker
docker-compose restart worker
```

### "Too many login attempts" error
Wait 1 minute, then try again. Rate limiting is active for security.

### Can't upload KYC documents
Check file size (max 5MB) and format (JPG, PNG, PDF only).

## 🧹 Clean Start

To completely reset everything:

```powershell
# Stop and remove all containers, volumes
docker-compose down -v

# Start fresh
docker-compose up -d

# Setup again
docker exec mini-binance-api composer install
docker exec mini-binance-api php artisan key:generate
docker exec mini-binance-api php artisan migrate:fresh --seed
docker exec mini-binance-api php artisan storage:link
docker exec mini-binance-client npm install
```

## 📊 Project Structure

```
mini-binance/
├── api/                    # Laravel backend
│   ├── app/
│   │   ├── Http/Controllers/   # API controllers
│   │   ├── Models/             # Eloquent models
│   │   ├── Jobs/               # Queue jobs (matching engine)
│   │   └── Http/Middleware/    # Custom middleware
│   ├── database/
│   │   ├── migrations/         # Database schema
│   │   └── seeders/            # Demo data
│   └── routes/api.php          # API routes
├── client/                 # React frontend
│   ├── src/
│   │   ├── pages/              # Page components
│   │   ├── components/         # Reusable components
│   │   ├── stores/             # State management
│   │   └── lib/                # Utilities
│   └── public/                 # Static assets
├── deploy/
│   └── nginx/                  # Nginx config
├── docker-compose.yml      # Docker services
└── setup.ps1               # Automated setup script
```

## 🔐 Security Features

- ✅ **Argon2id** password hashing
- ✅ **TOTP 2FA** (Google Authenticator)
- ✅ **Session management** (HttpOnly, Secure, SameSite)
- ✅ **CSRF protection**
- ✅ **Rate limiting** (login, OTP, orders)
- ✅ **Audit logging** (all sensitive actions)
- ✅ **File upload** security (whitelist, random names)
- ✅ **Security headers** (CSP, X-Frame-Options)

## 📞 Need Help?

- 📖 Full Documentation: `SETUP_GUIDE.md`
- 🐛 Check Logs: `docker-compose logs -f`
- 🔄 Reset: `docker-compose down -v && docker-compose up -d`

## ⚠️ Important Notes

1. **Demo Mode**: This uses simulated crypto - no real money/blockchain
2. **Local Only**: Not configured for production deployment
3. **Test Data**: All accounts and balances are for testing only
4. **Security**: Educational project - not audited for production use

---

**Ready to start?** Open http://localhost:5173 and login! 🎉
