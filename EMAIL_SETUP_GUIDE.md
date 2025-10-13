# Email Setup Guide

## 📧 Email Configuration for Verification System

The new email verification system requires sending verification emails to users. Here's how to configure it properly.

---

## 🔍 Current Behavior

### Without SMTP Configuration (Development)
When SMTP is not configured, the system will:
- ✅ **NOT throw errors** - continues gracefully
- ✅ **Logs verification links to console** - you can click them to verify
- ✅ **Shows clear formatted output** - easy to spot in logs

**Console Output:**
```
================================================================================
📧 [DEV MODE] Email verification link:
   Email: user@example.com
   Link:  http://localhost:5000/api/auth/verify-email?token=abc123...
================================================================================
```

### With SMTP Configuration (Production)
When SMTP is configured:
- ✅ **Sends actual emails** via your SMTP provider
- ✅ **Logs success** - "✅ Verification email sent to user@example.com"
- ✅ **Falls back to console** if email fails (with error details)

---

## ⚙️ Configuration Options

### Option 1: Development Mode (No SMTP)
**Best for local development and testing**

Simply don't configure SMTP variables. The system will log verification links to console.

**Status Check:**
```
📧 Email (SMTP) not configured - verification links will be logged to console
   💡 To enable emails, set: SMTP_HOST, SMTP_USER, SMTP_PASS in .env
```

**How to test:**
1. Register a new account
2. Check your terminal/console for the verification link
3. Click the link (or paste in browser)
4. Account is verified!

---

### Option 2: Gmail SMTP (Recommended for Testing)
**Best for realistic testing with actual emails**

#### Step 1: Generate App Password
1. Go to your Google Account settings
2. Enable 2-Factor Authentication (required)
3. Go to: **Security** → **App Passwords**
4. Create a new app password for "Mail"
5. Copy the 16-character password

#### Step 2: Configure .env
```bash
# Email Configuration (Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password-here
EMAIL_FROM=noreply@peakself.com
```

#### Step 3: Restart Server
```bash
npm run dev
```

**Status Check:**
```
✅ Email (SMTP) configured: smtp.gmail.com
```

---

### Option 3: Mailtrap (Best for Testing)
**Best for catching test emails without sending real ones**

#### Step 1: Sign up for Mailtrap
1. Go to [mailtrap.io](https://mailtrap.io)
2. Sign up for free account
3. Create a new inbox
4. Copy SMTP credentials

#### Step 2: Configure .env
```bash
# Email Configuration (Mailtrap)
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=587
SMTP_USER=your-mailtrap-username
SMTP_PASS=your-mailtrap-password
EMAIL_FROM=noreply@peakself.com
```

#### Step 3: Restart Server
```bash
npm run dev
```

**Benefits:**
- ✅ Catches all test emails
- ✅ No risk of sending to real users
- ✅ Inspect email HTML/content
- ✅ Free for development

---

### Option 4: Production SMTP
**For production use with real email provider**

Popular providers:
- **SendGrid** - Free tier: 100 emails/day
- **AWS SES** - Very cheap, high limits
- **Postmark** - Great deliverability
- **Mailgun** - Popular choice
- **SMTP2GO** - Reliable service

#### Configuration Example (SendGrid)
```bash
# Email Configuration (SendGrid)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
EMAIL_FROM=noreply@yourdomain.com
```

---

## 🧪 Testing Email Configuration

### Test Registration
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!","name":"Test User"}'
```

### Expected Outputs

**Without SMTP:**
```
================================================================================
📧 [DEV MODE] Email verification link:
   Email: test@example.com
   Link:  http://localhost:5000/api/auth/verify-email?token=abc123...
================================================================================
```

**With SMTP (Success):**
```
✅ Verification email sent to test@example.com
```

**With SMTP (Failure):**
```
❌ Email send failed: Connection timeout
================================================================================
📧 [FALLBACK] Verification link (email failed to send):
   Email: test@example.com
   Link:  http://localhost:5000/api/auth/verify-email?token=abc123...
   Error: Connection timeout
================================================================================
```

---

## 🐛 Troubleshooting

### "Email send failed: Unexpected socket close"
**Cause:** SMTP_HOST is set but credentials are wrong or server is unreachable

**Solution:**
1. **Option A:** Remove SMTP variables from .env (use dev mode)
2. **Option B:** Fix SMTP credentials and restart server

### Email not received (Gmail)
**Cause:** Gmail blocking less secure apps or app password not generated

**Solutions:**
- Use App Password (not regular password)
- Check spam/junk folder
- Use Mailtrap for testing instead

### Verification link not working
**Cause:** APP_BASE_URL is incorrect

**Solution:**
```bash
# Add to .env
APP_BASE_URL=http://localhost:5000
```

---

## 📋 Environment Variables Reference

```bash
# Required for SMTP
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-username
SMTP_PASS=your-password
EMAIL_FROM=noreply@yourdomain.com

# Optional
APP_BASE_URL=http://localhost:5000  # Base URL for verification links
NODE_ENV=development                 # 'development' or 'production'
```

---

## 🎯 Recommended Setup by Environment

### Local Development
```bash
# No SMTP - console logs only
# (Leave SMTP variables unset)
```

### Staging/Testing
```bash
# Mailtrap
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=587
SMTP_USER=your-mailtrap-user
SMTP_PASS=your-mailtrap-pass
EMAIL_FROM=noreply@staging.peakself.com
```

### Production
```bash
# SendGrid/SES/Real provider
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-production-api-key
EMAIL_FROM=noreply@peakself.com
APP_BASE_URL=https://peakself.com
NODE_ENV=production
```

---

## 🎉 Summary

- ✅ **Development:** No SMTP needed - links logged to console
- ✅ **Testing:** Use Mailtrap or Gmail
- ✅ **Production:** Use professional SMTP provider
- ✅ **Graceful Fallback:** Always shows link if email fails
- ✅ **Clear Logging:** Know exactly what's happening

The system is designed to work perfectly in development without any email configuration, while supporting professional SMTP in production!
