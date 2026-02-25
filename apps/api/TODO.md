## Remove console logs from config/db.ts


**Frontend shows:**
```
⚠️ Verify your email to generate API keys
[Resend verification email]
```

---

## The flow you should implement
```
Signup → Allow login → Show banner → Gate features → User verifies → Full access
```

Not:
```
Signup → Block login → User frustrated → Spam folder → Lost user