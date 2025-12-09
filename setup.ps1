# Mini-Binance Setup Script for Windows
# Run this script in PowerShell as Administrator

Write-Host "🚀 Mini-Binance Setup Script" -ForegroundColor Cyan
Write-Host "================================`n" -ForegroundColor Cyan

# Check if Docker is installed
Write-Host "📋 Checking prerequisites..." -ForegroundColor Yellow
try {
    docker --version | Out-Null
    Write-Host "✅ Docker is installed" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker is not installed. Please install Docker Desktop first." -ForegroundColor Red
    Write-Host "   Download from: https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
    exit 1
}

# Check if Docker Compose is available
try {
    docker-compose --version | Out-Null
    Write-Host "✅ Docker Compose is available" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker Compose is not available." -ForegroundColor Red
    exit 1
}

# Create .env files
Write-Host "`n📝 Creating environment files..." -ForegroundColor Yellow

if (!(Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "✅ Created root .env file" -ForegroundColor Green
} else {
    Write-Host "ℹ️  Root .env file already exists" -ForegroundColor Cyan
}

if (!(Test-Path "api\.env")) {
    Copy-Item "api\.env.example" "api\.env"
    Write-Host "✅ Created api/.env file" -ForegroundColor Green
} else {
    Write-Host "ℹ️  API .env file already exists" -ForegroundColor Cyan
}

# Start Docker containers
Write-Host "`n🐳 Starting Docker containers..." -ForegroundColor Yellow
docker-compose up -d

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Docker containers started successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to start Docker containers" -ForegroundColor Red
    exit 1
}

# Wait for services to be ready
Write-Host "`n⏳ Waiting for services to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Install Composer dependencies
Write-Host "`n📦 Installing Laravel dependencies..." -ForegroundColor Yellow
docker exec mini-binance-api composer install

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Composer dependencies installed" -ForegroundColor Green
} else {
    Write-Host "⚠️  Composer install encountered issues" -ForegroundColor Yellow
}

# Generate Laravel application key
Write-Host "`n🔑 Generating Laravel application key..." -ForegroundColor Yellow
docker exec mini-binance-api php artisan key:generate

# Run migrations
Write-Host "`n🗄️  Running database migrations..." -ForegroundColor Yellow
docker exec mini-binance-api php artisan migrate --force

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Database migrations completed" -ForegroundColor Green
} else {
    Write-Host "❌ Database migration failed" -ForegroundColor Red
    exit 1
}

# Seed database
Write-Host "`n🌱 Seeding database with demo data..." -ForegroundColor Yellow
docker exec mini-binance-api php artisan db:seed

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Database seeded successfully" -ForegroundColor Green
} else {
    Write-Host "⚠️  Database seeding encountered issues" -ForegroundColor Yellow
}

# Create storage link
Write-Host "`n🔗 Creating storage symbolic link..." -ForegroundColor Yellow
docker exec mini-binance-api php artisan storage:link

# Install frontend dependencies
Write-Host "`n📦 Installing frontend dependencies..." -ForegroundColor Yellow
docker exec mini-binance-client npm install

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Frontend dependencies installed" -ForegroundColor Green
} else {
    Write-Host "⚠️  Frontend install encountered issues" -ForegroundColor Yellow
}

# Final summary
Write-Host "`n" -ForegroundColor Green
Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  ✅ Mini-Binance Setup Complete!                      ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host "`n📍 Application URLs:" -ForegroundColor Cyan
Write-Host "   • Frontend:  http://localhost:5173" -ForegroundColor White
Write-Host "   • API:       http://localhost/api" -ForegroundColor White
Write-Host "   • MailHog:   http://localhost:8025" -ForegroundColor White

Write-Host "`n👤 Test Accounts:" -ForegroundColor Cyan
Write-Host "   • Admin:" -ForegroundColor White
Write-Host "     Email:    admin@minibinance.local" -ForegroundColor Gray
Write-Host "     Password: Admin@12345678" -ForegroundColor Gray
Write-Host ""
Write-Host "   • User with 2FA:" -ForegroundColor White
Write-Host "     Email:    user2fa@minibinance.local" -ForegroundColor Gray
Write-Host "     Password: User2FA@12345678" -ForegroundColor Gray
Write-Host ""
Write-Host "   • Frozen User:" -ForegroundColor White
Write-Host "     Email:    frozen@minibinance.local" -ForegroundColor Gray
Write-Host "     Password: Frozen@12345678" -ForegroundColor Gray

Write-Host "`n📖 For more information, see SETUP_GUIDE.md" -ForegroundColor Cyan
Write-Host "`n🛠️  Useful Commands:" -ForegroundColor Cyan
Write-Host "   • Stop:     docker-compose stop" -ForegroundColor White
Write-Host "   • Start:    docker-compose start" -ForegroundColor White
Write-Host "   • Restart:  docker-compose restart" -ForegroundColor White
Write-Host "   • Logs:     docker-compose logs -f" -ForegroundColor White
Write-Host "   • Down:     docker-compose down" -ForegroundColor White
Write-Host ""
