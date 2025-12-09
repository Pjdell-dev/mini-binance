# Mini-Binance Security Design Document

## 1. Executive Summary

Mini-Binance is a classroom-safe cryptocurrency exchange simulation built with security-by-design principles. This document outlines the threat model, security controls, assumptions, and design trade-offs implemented to protect user data and system integrity.

**Target Audience**: 4th Year IT (Dev & Reviewer tracks)  
**Technology Stack**: Laravel 11 (PHP 8.2+), React 18, PostgreSQL 15+, Redis, Docker  
**Classification**: Educational/Demonstration System (No Real Money)

---

## 2. Threat Model

### 2.1 Assets to Protect

1. **User Credentials**: Passwords, 2FA secrets, backup codes
2. **Session Tokens**: Authentication cookies and CSRF tokens
3. **Financial Data**: Simulated wallet balances, order history, trade records
4. **Personal Information**: Email addresses, KYC documents
5. **System Integrity**: Order matching logic, balance calculations, audit logs

### 2.2 Threat Actors

| Actor | Motivation | Capability | Likelihood |
|-------|-----------|------------|------------|
| External Attacker | Financial gain, data theft | Medium-High | High |
| Malicious Insider | Account manipulation | Low-Medium | Low |
| Curious Student | Testing/learning | Low | High |
| Automated Bot | Brute force, scraping | High | High |

### 2.3 Attack Scenarios

#### High Priority Threats

1. **Authentication Bypass**
   - Brute force attacks on login
   - Session hijacking via XSS/CSRF
   - 2FA bypass attempts
   
2. **Injection Attacks**
   - SQL injection via order parameters
   - XSS through user inputs (profile, KYC notes)
   - Command injection in file uploads

3. **Business Logic Flaws**
   - Order manipulation (negative quantities)
   - Balance overflow/underflow
   - Double-spending via race conditions
   - Unauthorized withdrawals

4. **Data Exposure**
   - Sensitive data in error messages
   - Direct object reference vulnerabilities
   - Information disclosure via timing attacks

#### Medium Priority Threats

5. **Denial of Service**
   - Resource exhaustion via order flooding
   - API rate limit bypass
   - Queue job saturation

6. **File Upload Attacks**
   - Malicious file execution
   - Path traversal in KYC uploads
   - XXE attacks in XML processing

---

## 3. Security Controls

### 3.1 Authentication & Access Control

#### Password Security
```php
// Implementation in AuthController.php
PasswordRule::min(12)
    ->letters()
    ->mixedCase()
    ->numbers()
    ->symbols()
    ->uncompromised() // Have I Been Pwned check
```

**Controls:**
- ✅ Argon2id hashing (OWASP recommended)
- ✅ Minimum 12 characters with complexity requirements
- ✅ Pwned password check using k-anonymity API (5 SHA-1 hash prefix)
- ✅ Password history prevention (future enhancement)

**Rationale:** Argon2id is memory-hard and resistant to GPU/ASIC attacks. The 12-character minimum with complexity requirements provides ~68 bits of entropy.

#### Two-Factor Authentication
```php
// Google Authenticator TOTP implementation
use PragmaRX\Google2FA\Google2FA;

$google2fa = new Google2FA();
$secret = $google2fa->generateSecretKey();
$valid = $google2fa->verifyKey($secret, $code);
```

**Controls:**
- ✅ TOTP (Time-based One-Time Password) compatible with Google Authenticator
- ✅ 30-second time window with 1-step clock drift tolerance
- ✅ 8 backup codes (bcrypt hashed) for account recovery
- ✅ Rate limiting: 3 attempts per 5 minutes

**Attack Surface Reduction:** 2FA required for withdrawals, preventing unauthorized fund transfers even if password is compromised.

#### Session Management
```php
// config/session.php
'driver' => 'redis',
'lifetime' => 30, // 30 minutes idle timeout
'expire_on_close' => false,
'secure' => true,
'http_only' => true,
'same_site' => 'strict',
```

**Controls:**
- ✅ HttpOnly cookies (XSS protection)
- ✅ Secure flag (HTTPS only)
- ✅ SameSite=Strict (CSRF protection)
- ✅ Session rotation on login
- ✅ Idle timeout: 30 minutes
- ✅ Absolute timeout: 24 hours
- ✅ Redis storage (fast invalidation)

**Trade-off:** `SameSite=Strict` may break legitimate cross-site workflows. Acceptable for this use case as all operations occur within the SPA.

### 3.2 Input Validation & Output Encoding

#### SQL Injection Prevention
```php
// Eloquent ORM with parameterized queries
Order::where('user_id', $userId)
    ->where('status', 'open')
    ->lockForUpdate()
    ->get();
```

**Controls:**
- ✅ Laravel Eloquent ORM (parameterized queries)
- ✅ Raw SQL queries explicitly avoided
- ✅ Database-level constraints (foreign keys, CHECK constraints)
- ✅ Input validation via Form Requests

#### XSS Prevention
```tsx
// React automatic escaping
<div>{user.name}</div> // Automatically escaped
```

**Controls:**
- ✅ React automatic output encoding
- ✅ DOMPurify for rich text (if implemented)
- ✅ Content Security Policy (CSP)

**Note:** Current CSP allows `unsafe-inline` and `unsafe-eval` for development (Vite HMR). **Production deployment must use nonces or remove these directives.**

#### File Upload Security
```php
// KycController.php
$request->validate([
    'document' => 'required|file|mimes:jpg,jpeg,png,pdf|max:5120'
]);

$filename = Str::random(40) . '.' . $file->extension();
$file->storeAs('kyc', $filename, 'local');
```

**Controls:**
- ✅ Whitelist: jpg, jpeg, png, pdf only
- ✅ 5MB size limit
- ✅ Random filenames (no user-controlled paths)
- ✅ Storage outside webroot (`storage/app/kyc`)
- ✅ No execution permissions on storage directory
- ❌ **Missing:** Virus scanning (future enhancement)

### 3.3 CSRF Protection

```php
// Sanctum stateful authentication
Route::middleware(['auth:sanctum', 'verified'])->group(function () {
    Route::post('/orders', [OrderController::class, 'store']);
});
```

**Controls:**
- ✅ Laravel Sanctum CSRF token validation
- ✅ Double-submit cookie pattern
- ✅ SameSite=Strict cookies (additional layer)
- ✅ State-changing routes require CSRF token

### 3.4 Rate Limiting

```php
// ThrottleLogin middleware
$maxAttempts = 5;
$decayMinutes = 1;

// ThrottleOtp middleware  
$maxAttempts = 3;
$decayMinutes = 5;

// bootstrap/app.php
RateLimiter::for('orders', function ($request) {
    return Limit::perMinute(10)->by($request->user()->id);
});
```

**Controls:**
- ✅ Login: 5 attempts/minute (per IP)
- ✅ OTP: 3 attempts/5 minutes (per IP + user)
- ✅ Orders: 10 requests/minute (per user)
- ✅ Withdrawals: 5 requests/hour (per user)

**Implementation:** Redis-backed rate limiter with sliding window algorithm.

### 3.5 Audit Logging

```php
// AuditLog model
AuditLog::log(
    actorUserId: $user->id,
    action: 'order.placed',
    targetType: Order::class,
    targetId: $order->id,
    metadata: ['market' => 'BTC-USDT', 'side' => 'buy']
);
```

**Logged Events:**
- ✅ Authentication (login, logout, 2FA enable/disable)
- ✅ Password changes and resets
- ✅ Order placement and cancellation
- ✅ Deposits and withdrawals
- ✅ Admin actions (freeze user, approve KYC)
- ✅ Balance changes

**Storage:** PostgreSQL table with IP address, user agent, timestamp, and JSON metadata.

**Retention Policy:** Logs retained indefinitely for educational purposes. Production systems should implement log rotation.

---

## 4. Business Logic Security

### 4.1 Order Matching Engine

```php
// ProcessOrderMatching Job
DB::transaction(function () use ($takerOrder, $makerOrder) {
    // Lock wallets for update
    $buyerWallet->lockForUpdate();
    $sellerWallet->lockForUpdate();
    
    // Atomic transfer
    $buyerQuoteWallet->deductLocked($tradeTotal);
    $buyerBaseWallet->credit($tradeQuantity);
    $sellerBaseWallet->deductLocked($tradeQuantity);
    $sellerQuoteWallet->credit($tradeTotal);
    
    // Create trade record
    Trade::create([...]);
});
```

**Controls:**
- ✅ Database transactions (ACID guarantees)
- ✅ Row-level locking (`lockForUpdate()`)
- ✅ Queue-based processing (isolated from HTTP requests)
- ✅ Price-time priority matching
- ✅ Optimistic concurrency control

**Attack Prevention:**
- Double-spending via race conditions: **Prevented** by row-level locks
- Balance overflow: **Prevented** by bcmath precision arithmetic
- Negative quantity: **Prevented** by validation rules

### 4.2 Balance Management

```php
// Wallet model methods
public function credit(string $amount): void
{
    $this->balance_available = bcadd($this->balance_available, $amount, 8);
    $this->save();
}

public function lock(string $amount): bool
{
    if (bccomp($this->balance_available, $amount, 8) < 0) {
        return false; // Insufficient funds
    }
    
    $this->balance_available = bcsub($this->balance_available, $amount, 8);
    $this->balance_locked = bcadd($this->balance_locked, $amount, 8);
    $this->save();
    return true;
}
```

**Controls:**
- ✅ BCMath for decimal precision (8 decimal places)
- ✅ Separation of available vs. locked balances
- ✅ Validation before deductions
- ✅ Database constraints (`CHECK balance_available >= 0`)

---

## 5. Infrastructure Security

### 5.1 Docker Security

```dockerfile
# Non-root user
USER www-data

# Minimal base image
FROM php:8.2-fpm-alpine

# No secrets in images
ENV APP_KEY=""
```

**Controls:**
- ✅ Run as non-root user (www-data)
- ✅ Minimal Alpine Linux base images
- ✅ Version pinning (no :latest tags)
- ✅ Secrets via environment variables
- ✅ Network isolation (Docker Compose internal network)

### 5.2 Database Security

```yaml
# docker-compose.yml
db:
  environment:
    POSTGRES_DB: mini_binance
    POSTGRES_USER: minibin_user # Least-privileged user
    POSTGRES_PASSWORD: ${DB_PASSWORD} # From .env
```

**Controls:**
- ✅ Dedicated database user (not postgres superuser)
- ✅ Password authentication
- ✅ Network isolation (no public port exposure)
- ✅ PostgreSQL CHECK constraints
- ✅ Foreign key constraints

### 5.3 Security Headers

```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "..." always;
# Production only:
# add_header Strict-Transport-Security "max-age=31536000" always;
```

**Controls:**
- ✅ X-Frame-Options: SAMEORIGIN (clickjacking protection)
- ✅ X-Content-Type-Options: nosniff (MIME sniffing protection)
- ✅ CSP (XSS mitigation, but needs hardening for production)
- ⚠️ HSTS disabled (development uses HTTP)

---

## 6. Assumptions & Limitations

### 6.1 Assumptions

1. **No Real Money**: System handles simulated assets only. Real-world deployment would require regulatory compliance (AML/KYC, financial audits).
2. **Trusted Network**: Docker Compose network is assumed secure. Production requires firewall rules, VPN, or mTLS.
3. **Email Verification**: Users are assumed to control their email accounts. Real-world systems need SMS verification or identity proofing.
4. **Admin Trustworthiness**: Admin users are trusted operators. Production requires audit trails and separation of duties.

### 6.2 Known Limitations

1. **No WebSocket**: Real-time updates use polling (performance impact). WebSocket implementation deferred for simplicity.
2. **Basic KYC**: Document verification is manual. Real-world systems need OCR, liveness detection, and third-party verification.
3. **No Market Maker**: Order book depth depends on user activity. Production exchanges use market makers for liquidity.
4. **CSP Relaxed**: `unsafe-inline` and `unsafe-eval` allowed for development. **Must be removed for production.**
5. **No Virus Scanning**: Uploaded files not scanned for malware. Acceptable for classroom use.

---

## 7. Deployment Recommendations

### 7.1 Production Hardening Checklist

- [ ] Remove `unsafe-inline` and `unsafe-eval` from CSP
- [ ] Enable HSTS header with `preload` directive
- [ ] Implement certificate pinning for API
- [ ] Add virus scanning for file uploads (ClamAV)
- [ ] Enable database encryption at rest
- [ ] Configure firewall rules (allow only 80/443)
- [ ] Set up centralized logging (ELK stack)
- [ ] Implement intrusion detection (Fail2Ban)
- [ ] Add Web Application Firewall (ModSecurity)
- [ ] Enable database audit logging
- [ ] Implement backup and disaster recovery
- [ ] Configure monitoring and alerting (Prometheus/Grafana)

### 7.2 OWASP Top 10 Compliance

| OWASP Risk | Mitigation | Status |
|------------|------------|--------|
| A01: Broken Access Control | RBAC, middleware checks | ✅ |
| A02: Cryptographic Failures | Argon2id, HTTPS | ✅ |
| A03: Injection | ORM, validation | ✅ |
| A04: Insecure Design | Threat modeling, secure patterns | ✅ |
| A05: Security Misconfiguration | Strict headers, minimal attack surface | ⚠️ CSP needs hardening |
| A06: Vulnerable Components | Dependency scanning (`composer audit`) | ✅ |
| A07: Identification Failures | 2FA, rate limiting | ✅ |
| A08: Software/Data Integrity | Code reviews, CI/CD | ⚠️ Manual process |
| A09: Logging Failures | Comprehensive audit logs | ✅ |
| A10: SSRF | No outbound HTTP from user input | ✅ |

---

## 8. Testing & Verification

### 8.1 Automated Tests

```bash
# Backend tests
docker exec mini-binance-api php artisan test

# Frontend tests  
cd client && npm run test
```

**Coverage Goals:**
- Authentication: 100%
- Order placement: 100%
- Wallet operations: 100%
- Admin functions: 80%

### 8.2 Manual Security Testing

1. **Authentication**
   - [ ] Attempt brute force login (should be rate limited)
   - [ ] Try session fixation attack
   - [ ] Verify 2FA cannot be bypassed

2. **Authorization**
   - [ ] Access admin routes as regular user (should fail)
   - [ ] Manipulate other user's orders (should fail)
   - [ ] Cancel filled order (should fail)

3. **Input Validation**
   - [ ] SQL injection via order parameters
   - [ ] XSS via profile name field
   - [ ] Path traversal in file upload

4. **Business Logic**
   - [ ] Negative order quantity
   - [ ] Withdraw more than available balance
   - [ ] Double-spend via concurrent requests

---

## 9. Compliance & Privacy

### 9.1 GDPR Considerations (EU Deployment)

- **Data Minimization**: Only collect necessary information (name, email, KYC docs)
- **Right to Erasure**: Implement user account deletion with data scrubbing
- **Breach Notification**: 72-hour reporting requirement
- **Data Portability**: Export user data in machine-readable format (JSON)

### 9.2 PCI DSS (Future Credit Card Integration)

- **N/A**: System currently uses simulated assets only. Real-world payment processing requires PCI DSS Level 1 compliance.

---

## 10. Conclusion

Mini-Binance demonstrates secure-by-design principles appropriate for an educational cryptocurrency exchange simulation. The system implements defense-in-depth with:

- **Strong authentication** (Argon2id + 2FA + pwned password checks)
- **Comprehensive authorization** (RBAC with server-side enforcement)
- **Input validation** (ORM, form requests, file upload restrictions)
- **Audit logging** (complete action trail with IP/UA)
- **Rate limiting** (protection against brute force and DoS)

**Key Trade-offs:**
1. **CSP Relaxation**: Development convenience vs. XSS protection (acceptable for classroom use, **must fix for production**)
2. **No WebSocket**: Simplicity vs. real-time UX (polling is sufficient for learning objectives)
3. **Manual KYC**: Human review vs. automation (appropriate for small-scale simulation)

**Risk Assessment**: Low-to-Medium risk for educational deployment. High-risk items (CSP hardening, HTTPS enforcement) clearly documented for future production deployment.

---

**Document Version**: 1.0  
**Last Updated**: November 2025  
**Author**: Mini-Binance Development Team
