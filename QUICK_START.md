# Quick Start - Email Verification System

## 🚀 Deploy in 3 Steps

### Step 1: Run the Migration
```bash
npm run migrate
```

Or directly:
```bash
node server/migrations/run_migration.js
```

**What this does:**
- Creates the `pending_registrations` table
- Adds necessary indexes
- Verifies the table was created successfully

**Expected output:**
```
🔄 Connecting to database...
✅ Connected to database

🔄 Running migration...
   Creating pending_registrations table...
✅ Migration completed successfully!

✅ Verified: pending_registrations table exists

📋 Table structure:
   - id: uuid
   - email: text
   - password_hash: text
   - name: text
   - token: text
   - expires_at: timestamp with time zone
   - created_at: timestamp with time zone

🔍 Indexes:
   - pending_registrations_pkey
   - idx_pending_registrations_token
   - idx_pending_registrations_email
   - idx_pending_registrations_expires
   - idx_pending_registrations_email_unique

🎉 All done! You can now restart your server.
   The new email verification flow is ready to use.
```

### Step 2: Restart Your Server
```bash
# Stop your current server (Ctrl+C)
# Then start it again:
npm run dev
# or
npm start
```

### Step 3: Test It!
1. **Register a new account** on your app
2. **Check the console** for the verification link (if SMTP not configured):
   ```
   [DEV] Verification link for user@example.com: http://localhost:5000/api/auth/verify-email?token=...
   ```
3. **Click the link** (or paste in browser)
4. **Get redirected** to login page with success message
5. **Login successfully** with your new account!

---

## ✅ What Changed?

### Before
- User registers → immediately added to database (unverified)
- User can login even without verifying email

### After
- User registers → stored in temporary `pending_registrations` table
- User **MUST** verify email before account is created
- Only verified users can login

---

## 🔍 Verify It Worked

### Check Database
After registration (before clicking link):
```sql
SELECT * FROM pending_registrations;
-- Should show your registration

SELECT * FROM users WHERE email = 'your@email.com';
-- Should be empty
```

After clicking verification link:
```sql
SELECT * FROM pending_registrations;
-- Should be empty (deleted after verification)

SELECT * FROM users WHERE email = 'your@email.com';
-- Should show your user with verified = TRUE
```

---

## 🛠️ Troubleshooting

### Migration Script Won't Run
**Problem:** `Cannot find module 'pg'`
**Solution:** Make sure you're in the project root and dependencies are installed:
```bash
cd "D:\Code\Web Apps\PeakSelf"
npm install
```

### Table Already Exists
**Problem:** Migration says table already exists
**Solution:** That's fine! The migration uses `CREATE TABLE IF NOT EXISTS`, so it won't error. Just restart your server.

### Email Not Sending
**Problem:** Not receiving verification emails
**Solution:** In development, emails are logged to console. Check your server terminal for:
```
[DEV] Verification link for user@example.com: http://...
```

For production, make sure these environment variables are set:
```
SMTP_HOST=your-smtp-host.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-password
EMAIL_FROM=noreply@yourdomain.com
```

### Frontend Shows Wrong Message
**Problem:** Frontend doesn't handle the new response format
**Solution:** Update your frontend registration handler to expect:
```json
{
  "message": "Registration initiated. Please check your email to verify your account before logging in.",
  "email": "user@example.com"
}
```

---

## 📚 More Information

- **Full Documentation:** See `server/migrations/README.md`
- **Implementation Details:** See `IMPLEMENTATION_SUMMARY.md`
- **Rollback Instructions:** In `server/migrations/README.md`

---

## 🎉 That's It!

Your email verification system is now live. New users will need to verify their email before they can login. Enjoy the cleaner, more secure registration flow!
