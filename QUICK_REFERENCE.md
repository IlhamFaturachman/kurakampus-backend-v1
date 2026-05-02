# 🚀 Quick Reference - KuraKampus Backend

## 📦 Installation

```bash
# Clone & install
git clone <repo>
cd kurakampus-backend-v1
pnpm install

# Start services
docker-compose up -d

# Run migrations
pnpm prisma migrate dev

# Seed database
pnpm seed

# Start dev server
pnpm start:dev
```

## 🔗 URLs

- API: http://localhost:3000/api
- Docs: http://localhost:3000/api/docs
- Health: http://localhost:3000/health
- Mailhog: http://localhost:8025

## 🔑 Default Login

```
Email: superadmin@kurakampus.com
Password: password123
```

## 📝 Common Commands

```bash
# Development
pnpm start:dev          # Start with watch mode
pnpm build              # Build for production
pnpm start:prod         # Start production

# Database
pnpm prisma studio      # Open Prisma Studio
pnpm prisma migrate dev # Run migrations
pnpm seed               # Seed database

# Testing
pnpm test               # Unit tests
pnpm test:e2e           # E2E tests
pnpm test:cov           # Coverage

# Docker
docker-compose up -d    # Start services
docker-compose down     # Stop services
docker-compose logs -f  # View logs
```

## 🔐 Security Features

### Account Lockout
- Max attempts: 5
- Lockout duration: 30 minutes
- Email notification sent

### 2FA Setup
```bash
POST /api/auth/2fa/generate  # Get QR code
POST /api/auth/2fa/enable    # Enable with code
POST /api/auth/2fa/verify    # Verify during login
POST /api/auth/2fa/disable   # Disable 2FA
```

### Password Reset
```bash
POST /api/auth/forgot-password  # Request reset
POST /api/auth/reset-password   # Reset with token
```

### Email Verification
```bash
POST /api/auth/verify-email           # Verify email
POST /api/auth/resend-verification    # Resend email
```

## 🏥 Health Checks

```bash
GET /health            # Full health check
GET /health/liveness   # Liveness probe
GET /health/readiness  # Readiness probe
```

## 📊 Monitoring

### View Logs
```bash
# Development (pretty)
pnpm start:dev

# Production (JSON)
NODE_ENV=production pnpm start:prod
```

### Check Security Events
```sql
SELECT * FROM security_events 
WHERE type = 'LOGIN_FAILED' 
ORDER BY created_at DESC 
LIMIT 10;
```

### Check Audit Logs
```sql
SELECT * FROM audit_logs 
WHERE entity = 'Organization' 
AND action = 'UPDATE'
ORDER BY created_at DESC;
```

## 🔧 Environment Variables

### Required
```env
DATABASE_URL=postgresql://...
JWT_SECRET=<32+ chars>
REFRESH_TOKEN_SECRET=<32+ chars>
COOKIE_SECRET=<32+ chars>
```

### Optional
```env
REDIS_URL=redis://localhost:6379
SMTP_HOST=localhost
SMTP_PORT=1025
FRONTEND_URL=http://localhost:3000
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION_MINUTES=30
LOG_LEVEL=info
```

## 🐳 Docker

### Build
```bash
docker build -t kurakampus-backend .
```

### Run
```bash
docker run -p 3000:3000 \
  -e DATABASE_URL="..." \
  -e JWT_SECRET="..." \
  kurakampus-backend
```

## 🧪 Testing

### Unit Tests
```bash
pnpm test                    # Run all tests
pnpm test auth.service       # Test specific file
pnpm test --coverage         # With coverage
```

### E2E Tests
```bash
pnpm test:e2e               # Run E2E tests
```

### Manual Testing
```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"superadmin@kurakampus.com","password":"password123"}'

# Get organizations (with auth)
curl http://localhost:3000/api/organizations \
  -H "Authorization: Bearer <token>"
```

## 📚 API Endpoints

### Auth
```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/refresh
POST   /api/auth/logout
POST   /api/auth/verify-email
POST   /api/auth/forgot-password
POST   /api/auth/reset-password
POST   /api/auth/2fa/generate
POST   /api/auth/2fa/enable
POST   /api/auth/2fa/verify
POST   /api/auth/2fa/disable
```

### Organizations
```
GET    /api/organizations
GET    /api/organizations/:id
POST   /api/organizations
PATCH  /api/organizations/:id
DELETE /api/organizations/:id
POST   /api/organizations/bulk-delete
POST   /api/organizations/import-csv
GET    /api/organizations/export-csv
GET    /api/organizations/stats
```

### Users
```
GET    /api/users
GET    /api/users/:id
POST   /api/users
PATCH  /api/users/:id
DELETE /api/users/:id
POST   /api/users/:id/assign-role
DELETE /api/users/:id/roles/:roleId
```

### RBAC
```
GET    /api/rbac/roles
GET    /api/rbac/roles/:id
POST   /api/rbac/roles
PATCH  /api/rbac/roles/:id
DELETE /api/rbac/roles/:id
GET    /api/rbac/permissions
```

## 🔍 Troubleshooting

### Database Connection Error
```bash
# Check if PostgreSQL is running
docker-compose ps

# Restart PostgreSQL
docker-compose restart postgres

# Check logs
docker-compose logs postgres
```

### Redis Connection Error
```bash
# Check if Redis is running
docker-compose ps

# Restart Redis
docker-compose restart redis
```

### Email Not Sending
```bash
# Check Mailhog
open http://localhost:8025

# Check SMTP config in .env
echo $SMTP_HOST
echo $SMTP_PORT
```

### Migration Failed
```bash
# Reset database (WARNING: deletes all data)
pnpm prisma migrate reset

# Or manually
pnpm prisma migrate dev --name fix_migration
```

## 📖 Documentation

- Setup Guide: `SETUP_GUIDE.md`
- Implementation: `IMPLEMENTATION_SUMMARY.md`
- Final Report: `FINAL_REPORT.md`
- Security: `SECURITY_UPDATE.md`
- API Docs: http://localhost:3000/api/docs

## 🆘 Common Issues

### Port Already in Use
```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>
```

### Permission Denied
```bash
# Fix file permissions
chmod +x node_modules/.bin/*
```

### Module Not Found
```bash
# Reinstall dependencies
rm -rf node_modules
pnpm install
```

## 🎯 Production Checklist

- [ ] Set NODE_ENV=production
- [ ] Generate strong secrets
- [ ] Configure ALLOWED_ORIGINS
- [ ] Setup PostgreSQL with pooling
- [ ] Setup Redis
- [ ] Configure SMTP
- [ ] Enable HTTPS
- [ ] Setup monitoring
- [ ] Configure backups
- [ ] Test disaster recovery

## 📞 Support

- GitHub Issues: <repo-url>/issues
- Email: support@kurakampus.com
- Docs: http://localhost:3000/api/docs

---

**Last Updated:** 2025-01-19
**Version:** 1.0.0
