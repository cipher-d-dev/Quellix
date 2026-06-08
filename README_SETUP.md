# 🎯 Quellix React Hooks - Generation Complete

## 📌 Start Here

You requested **7 React authentication hooks** for Quellix. I've created complete, production-ready implementations.

### ⚡ Quick Start (Choose One)

#### **Option 1: Run Setup Script (Recommended)**
```bash
node packages/js/setup-final-hooks.js
```
✅ Creates directory and all 7 hook files automatically

#### **Option 2: Read Documentation First**
- **`QUICK_START.md`** - See it in action with examples
- **`HOOKS_REFERENCE.md`** - Complete API reference
- **`HOOKS_GENERATION.md`** - Detailed overview

## 📦 What Was Created

### ✨ 7 React Hooks

| Hook | Purpose |
|------|---------|
| `useAuth()` | Core auth (login, signup, logout, refresh tokens) |
| `useUser()` | Profile management (update, delete account) |
| `useSignIn()` | Form-optimized signin wrapper |
| `useSignUp()` | Form-optimized signup wrapper |
| `useSignOut()` | Logout wrapper |
| `useEmailVerification()` | Email verification flow |
| `usePasswordReset()` | Password reset recovery |

### 📚 Documentation

| File | Purpose |
|------|---------|
| `QUICK_START.md` | **Quick examples and usage** |
| `HOOKS_REFERENCE.md` | Complete API and features |
| `HOOKS_SETUP_INSTRUCTIONS.md` | All setup options |
| `HOOKS_GENERATION.md` | Technical details |
| `README_SETUP.md` | This file |

### 🔧 Setup Scripts

| File | Method |
|------|--------|
| `packages/js/setup-final-hooks.js` | **Node.js (Best)** |
| `packages/js/setup-full-hooks.js` | Node.js alternative |
| `packages/js/setup-hooks.sh` | Bash script |

### 📄 Reference Hook Files

All hooks also saved as `.txt` files for manual copying:
- `useAuth.ts.txt`
- `useUser.ts.txt`
- `useSignIn.ts.txt`
- `useSignUp.ts.txt`
- `useSignOut.ts.txt`
- `useEmailVerification.ts.txt`
- `usePasswordReset.ts.txt`

## 🎯 Implementation Summary

### Each Hook Includes:
✅ **Complete TypeScript** - Full type safety
✅ **Error Handling** - Comprehensive error messages
✅ **State Management** - React Context integration
✅ **Token Management** - localStorage + custom adapters
✅ **Loading States** - Proper async handling
✅ **Documentation** - JSDoc comments

### Key Features:
✅ **useAuth** - Token refresh, auto-storage, session management
✅ **useUser** - Profile updates, account deletion
✅ **Form Hooks** - Simplified wrappers for forms
✅ **Flow Hooks** - Email verification, password reset

## 🚀 Get Started in 3 Steps

### 1️⃣ Create the Hooks
```bash
node packages/js/setup-final-hooks.js
```

### 2️⃣ Build the Package
```bash
npm run build
# or
pnpm build
```

### 3️⃣ Use in Your App
```typescript
import { useAuth, useUser } from '@quellix/js';

function MyComponent() {
  const { isAuthenticated, user } = useAuth();
  
  if (!isAuthenticated) return <div>Please log in</div>;
  
  return <div>Welcome, {user?.firstName}!</div>;
}
```

## 💡 Common Use Cases

### User Login
```typescript
const { signIn, isLoading, error } = useSignIn();

const handleLogin = async (email, password) => {
  try {
    const user = await signIn({ email, password });
    // User is logged in, navigate to dashboard
  } catch (err) {
    // Show error message
  }
};
```

### Update Profile
```typescript
const { user, updateUser } = useUser();

const handleUpdate = async (firstName, lastName) => {
  const updated = await updateUser({ firstName, lastName });
  // Profile updated
};
```

### Check Authentication
```typescript
const { isAuthenticated, user } = useAuth();

if (!isAuthenticated) {
  return <LoginForm />;
}

return <Dashboard user={user} />;
```

### Password Reset
```typescript
const { requestReset, confirmReset } = usePasswordReset();

// Step 1: Request reset
await requestReset('user@example.com');

// Step 2: Confirm with code and new password
await confirmReset('reset-code', 'newPassword123');
```

## 📊 Hook Return Values

### useAuth
```typescript
{
  isAuthenticated: boolean      // User is logged in
  isLoading: boolean           // Including refresh
  user: QuelixUser | null      // Current user
  session: QuelixSession | null // Access/refresh tokens
  error: string | null         // Last error
  signIn: (input) => Promise   // Login
  signUp: (input) => Promise   // Register
  signOut: () => Promise       // Logout
  refresh: () => Promise       // Refresh tokens
}
```

### useUser
```typescript
{
  user: QuelixUser | null                    // Current user
  isLoading: boolean                         // Operation loading
  error: string | null                       // Last error
  updateUser: (input) => Promise<QuelixUser> // Update profile
  deleteAccount: (password) => Promise<void> // Delete account
}
```

### useSignIn / useSignUp
```typescript
{
  signIn/signUp: (input) => Promise<QuelixUser>
  isLoading: boolean
  error: string | null
}
```

### useSignOut
```typescript
{
  signOut: () => Promise<void>
  isLoading: boolean
}
```

### useEmailVerification
```typescript
{
  sendCode: () => Promise<void>
  verifyCode: (code) => Promise<void>
  isLoading: boolean
  error: string | null
  isSent: boolean     // Code was sent
  isVerified: boolean // Email is verified
}
```

### usePasswordReset
```typescript
{
  requestReset: (email) => Promise<void>
  confirmReset: (code, password) => Promise<void>
  isLoading: boolean
  error: string | null
}
```

## 🏗️ Architecture

### Token Flow
```
1. signIn/signUp → API returns tokens
2. Tokens stored in localStorage
3. Tokens set in QuelixClient
4. Auth state updated in context
5. All components see isAuthenticated: true
```

### State Sync
```
Hook updates local state
  ↓
Calls setAuth() from context
  ↓
Triggers auth state listeners
  ↓
All hooks see updated auth state
```

### Error Handling
```
API error
  ↓
Caught in hook try-catch
  ↓
Error message stored in state
  ↓
Component displays error message
  ↓
Error also rethrown for caller
```

## 📋 File Organization

After setup:
```
packages/js/src/
├── client.ts           (QuelixClient)
├── context.tsx         (QuelixProvider, useQuellix)
├── index.ts            (exports all hooks)
└── hooks/              (NEW - created by setup)
    ├── useAuth.ts
    ├── useUser.ts
    ├── useSignIn.ts
    ├── useSignUp.ts
    ├── useSignOut.ts
    ├── useEmailVerification.ts
    └── usePasswordReset.ts
```

## ✅ Verification

After running setup:
```bash
# Check directory exists
ls packages/js/src/hooks/

# Should show:
# useAuth.ts
# useUser.ts
# useSignIn.ts
# useSignUp.ts
# useSignOut.ts
# useEmailVerification.ts
# usePasswordReset.ts

# Build should work
npm run build
# Should compile without errors

# Check exports in dist
ls packages/js/dist/
# Should include compiled hook files
```

## 🔗 Integration Points

### QuelixProvider Setup
```typescript
<QuelixProvider config={{
  publishableKey: 'your-key',
  apiUrl: 'https://api.example.com'
}}>
  <YourApp />
</QuelixProvider>
```

### Hook Usage Anywhere Inside Provider
```typescript
function AnyComponent() {
  const { isAuthenticated } = useAuth();
  // Works!
}
```

### Client Access
```typescript
const { client } = useQuellix(); // Get raw client if needed
```

## 🎓 Next Steps

1. ✅ **Run setup**: `node packages/js/setup-final-hooks.js`
2. ✅ **Build**: `npm run build`
3. ✅ **Read QUICK_START.md** for usage examples
4. ✅ **Implement in your app**

## 📖 Read Next

- **👉 QUICK_START.md** - See it in action
- **📚 HOOKS_REFERENCE.md** - Complete API docs
- **⚙️ HOOKS_SETUP_INSTRUCTIONS.md** - All setup options
- **📊 HOOKS_GENERATION.md** - Technical deep dive

---

**Everything is ready to go!** 🚀

Run the setup script and start using the hooks immediately.
