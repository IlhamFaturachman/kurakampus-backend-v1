# KuraKampus Backend - Setup & Deployment Guide

## 🚀 Quick Start

### Prerequisites
- Node.js 20.x or higher
- pnpm 10.x
- PostgreSQL 16
- Redis 7 (optional, for caching)
- Docker & Docker Compose (for local development)

### Local Development with Docker

1. **Clone the repository**
```bash
git clone <repository-url>
cd kurakampus-backend-v1
```

2. **Copy environment variables**
```bash
cp .env.example .env.development
```

3. **Start services with Docker Compose**
```bash
docker-compose up -d
```

This will start:
- PostgreSQL on port 5432
- Redis on port 6379
- Mailhog on ports 1025 (SMTP) and 8025 (Web UI)

4. **Install dependencies**
```bash
pnpm install
```

5. **Run database migrations**
```bash
pnpm prisma migrate dev
```

6. **Seed the database**
```bash
pnpm seed
```

7. **Start development server**
```bash
pnpm start:dev
```

The API will be available at:
- API: http://localhost:3000/api
- Swagger Docs: http://localhost:3000/api/docs
- Health Check: http://localhost:3000/health
- Mailhog UI: http://localhost:8025

### Default Credentials

After seeding, you can login with:
- **Email:** superadmin@kurakampus.com
- **Password:** password123

---

## 📦 Installation without Docker

### 1. Install PostgreSQL
```bash
# macOS
brew install postgresql@16
brew services start postgresql@16

# Ubuntu/Debian
sudo apt install postgresql-16
sudo systemctl start postgresql
```

### 2. Install Redis (optional)
```bash
# macOS
brew install redis
brew services start redis

# Ubuntu/Debian
sudo apt install redis-server
sudo systemctl start redis
```

### 3. Create Database
```bash
createdb kurakampus
```

### 4. Configure Environment
```bash
cp .env.example .env.development
```

Edit `.env.development`:
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/kurakampus"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="your-secret-key-here"
REFRESH_TOKEN_SECRET="your-refresh-secret-here"
COOKIE_SECRET="your-cookie-secret-here"
```

### 5. Run Migrations & Seed
```bash
pnpm install
pnpm prisma migrate dev
pnpm seed
pnpm start:dev
```

---

## 🔐 Security Features

### Implemented
- ✅ Argon2 password hashing
- ✅ JWT with refresh token rotation
- ✅ Secure httpOnly cookies
- ✅ Helmet security headers
- ✅ CSRF protection
- ✅ Rate limiting (Redis-backed)
- ✅ Account lockout (5 attempts, 30 min lockout)
- ✅ Two-Factor Authentication (TOTP)
- ✅ Email verification
- ✅ Password reset flow
- ✅ Security event logging
- ✅ Audit logging
- ✅ Structured logging (Pino)

### Configuration

**Account Lockout:**
```env
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION_MINUTES=30
```

**Email Service:**
```env
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=your-username
SMTP_PASS=your-password
SMTP_FROM=noreply@kurakampus.com
FRONTEND_URL=http://localhost:3000
```

---

## 📚 API Documentation

### Swagger UI
Visit http://localhost:3000/api/docs for interactive API documentation.

### Key Endpoints

#### Authentication
```
POST   /api/auth/register          - Register new user
POST   /api/auth/login             - Login
POST   /api/auth/refresh           - Refresh access token
POST   /api/auth/logout            - Logout
POST   /api/auth/verify-email      - Verify email address
POST   /api/auth/resend-verification - Resend verification email
POST   /api/auth/forgot-password   - Request password reset
POST   /api/auth/reset-password    - Reset password with token
```

#### Two-Factor Authentication
```
POST   /api/auth/2fa/generate      - Generate 2FA QR code
POST   /api/auth/2fa/enable        - Enable 2FA
POST   /api/auth/2fa/verify        - Verify 2FA code during login
POST   /api/auth/2fa/disable       - Disable 2FA
```

#### Health Checks
```
GET    /health                     - Comprehensive health check
GET    /health/liveness            - Kubernetes liveness probe
GET    /health/readiness           - Kubernetes readiness probe
```

#### Organizations
```
GET    /api/organizations          - List organizations (paginated)
GET    /api/organizations/:id      - Get organization details
POST   /api/organizations          - Create organization
PATCH  /api/organizations/:id      - Update organization
DELETE /api/organizations/:id      - Delete organization
POST   /api/organizations/bulk-delete - Bulk delete
POST   /api/organizations/import-csv - Import from CSV
GET    /api/organizations/export-csv - Export to CSV
GET    /api/organizations/stats    - Get statistics
```

---

## 🧪 Testing

### Unit Tests
```bash
pnpm test
```

### E2E Tests
```bash
pnpm test:e2e
```

### Test Coverage
```bash
pnpm test:cov
```

---

## 🐳 Docker Deployment

### Build Image
```bash
docker build -t kurakampus-backend:latest .
```

### Run Container
```bash
docker run -d \
  --name kurakampus-backend \
  -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e JWT_SECRET="..." \
  -e REFRESH_TOKEN_SECRET="..." \
  -e COOKIE_SECRET="..." \
  kurakampus-backend:latest
```

### Docker Compose Production
```yaml
version: '3.8'
services:
  app:
    image: kurakampus-backend:latest
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - JWT_SECRET=${JWT_SECRET}
      - REFRESH_TOKEN_SECRET=${REFRESH_TOKEN_SECRET}
      - COOKIE_SECRET=${COOKIE_SECRET}
    depends_on:
      - postgres
      - redis
    restart: unless-stopped
```

---

## 🔧 Environment Variables

### Required
```env
NODE_ENV=development|production
DATABASE_URL=postgresql://...
JWT_SECRET=<min-32-chars>
REFRESH_TOKEN_SECRET=<min-32-chars>
COOKIE_SECRET=<min-32-chars>
```

### Optional
```env
PORT=3000
REDIS_URL=redis://localhost:6379
ALLOWED_ORIGINS=http://localhost:3000
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION_MINUTES=30
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=username
SMTP_PASS=password
FRONTEND_URL=http://localhost:3000
LOG_LEVEL=info
```

---

## 📊 Monitoring & Logging

### Structured Logging
Logs are output in JSON format (production) or pretty-printed (development).

**Log Levels:**
- `debug` - Detailed debugging information
- `info` - General informational messages
- `warn` - Warning messages
- `error` - Error messages

**Configure:**
```env
LOG_LEVEL=info
```

### Health Monitoring
Use `/health` endpoint for monitoring:
```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "ok",
  "info": {
    "database": { "status": "up" },
    "memory_heap": { "status": "up" },
    "memory_rss": { "status": "up" },
    "storage": { "status": "up" }
  }
}
```

---

## 🚢 Production Deployment Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Generate strong secrets (32+ characters)
- [ ] Configure `ALLOWED_ORIGINS` whitelist
- [ ] Setup PostgreSQL with connection pooling
- [ ] Setup Redis for caching & rate limiting
- [ ] Configure SMTP for email notifications
- [ ] Enable HTTPS/TLS
- [ ] Setup monitoring (Sentry, Datadog, etc.)
- [ ] Configure log aggregation
- [ ] Setup automated backups
- [ ] Configure firewall rules
- [ ] Enable rate limiting
- [ ] Review security headers
- [ ] Test disaster recovery procedures

---

## 📖 Additional Documentation

- [Security Update](./SECURITY_UPDATE.md) - Security features & best practices
- [Implementation Summary](./IMPLEMENTATION_SUMMARY.md) - Detailed implementation notes
- [API Documentation](http://localhost:3000/api/docs) - Swagger UI

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the UNLICENSED License.

---

## 🆘 Support

For issues and questions:
- Create an issue on GitHub
- Email: support@kurakampus.com

---

**Last Updated:** 2025-01-19
