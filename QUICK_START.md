# 🚀 Quellix React Hooks - Quick Start

All 7 authentication hooks have been prepared for your project! Here's how to get them into your codebase.

## ✅ Quick Setup (Choose One)

### Option A: Run Node.js Script (Easiest)

From the repository root, run:
```bash
node packages/js/setup-final-hooks.js
```

This will automatically:
- Create `packages/js/src/hooks/` directory
- Create all 7 hook files with full implementations
- Display a completion summary

### Option B: Copy Pre-Made .txt Files

All hooks are available as text files in the root directory:
1. Create the directory: `packages/js/src/hooks/`
2. Copy each .txt file and rename (remove .txt extension):
   - `useAuth.ts.txt` → `packages/js/src/hooks/useAuth.ts`
   - `useUser.ts.txt` → `packages/js/src/hooks/useUser.ts`
   - `useSignIn.ts.txt` → `packages/js/src/hooks/useSignIn.ts`
   - `useSignUp.ts.txt` → `packages/js/src/hooks/useSignUp.ts`
   - `useSignOut.ts.txt` → `packages/js/src/hooks/useSignOut.ts`
   - `useEmailVerification.ts.txt` → `packages/js/src/hooks/useEmailVerification.ts`
   - `usePasswordReset.ts.txt` → `packages/js/src/hooks/usePasswordReset.ts`

## 📋 Hooks Overview

| Hook | Purpose | Returns |
|------|---------|---------|
| `useAuth()` | Core auth lifecycle | isAuthenticated, user, session, signIn/signUp/signOut/refresh |
| `useUser()` | Profile management | user, updateUser(), deleteAccount() |
| `useSignIn()` | Form signin wrapper | signIn() function, isLoading, error |
| `useSignUp()` | Form signup wrapper | signUp() function, isLoading, error |
| `useSignOut()` | Logout wrapper | signOut() function, isLoading |
| `useEmailVerification()` | Email verification flow | sendCode(), verifyCode(), isSent, isVerified |
| `usePasswordReset()` | Password reset flow | requestReset(), confirmReset(), isLoading |

## 🎯 Usage Examples

### Check if User is Logged In
```typescript
import { useAuth } from '@quellix/js';

function MyComponent() {
  const { isAuthenticated, user } = useAuth();
  
  if (!isAuthenticated) return <div>Please log in</div>;
  
  return <div>Welcome, {user?.firstName}!</div>;
}
```

### Sign In Form
```typescript
import { useSignIn } from '@quellix/js';

function LoginForm() {
  const { signIn, isLoading, error } = useSignIn();
  
  const handleSubmit = async (email: string, password: string) => {
    try {
      await signIn({ email, password });
      // User is now authenticated
    } catch (err) {
      console.error('Login failed:', error);
    }
  };
  
  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      const email = (e.target as any).email.value;
      const password = (e.target as any).password.value;
      handleSubmit(email, password);
    }}>
      <input type="email" name="email" />
      <input type="password" name="password" />
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Logging in...' : 'Log In'}
      </button>
      {error && <div className="error">{error}</div>}
    </form>
  );
}
```

### Update User Profile
```typescript
import { useUser } from '@quellix/js';

function ProfileForm() {
  const { user, updateUser, isLoading, error } = useUser();
  
  const handleUpdate = async () => {
    try {
      const updated = await updateUser({
        firstName: 'John',
        lastName: 'Doe',
      });
      console.log('Profile updated:', updated);
    } catch (err) {
      console.error('Update failed:', error);
    }
  };
  
  return (
    <div>
      <p>Current user: {user?.email}</p>
      <button onClick={handleUpdate} disabled={isLoading}>
        Update Profile
      </button>
    </div>
  );
}
```

### Password Reset
```typescript
import { usePasswordReset } from '@quellix/js';

function ResetForm() {
  const { requestReset, confirmReset, isLoading, error } = usePasswordReset();
  
  const [step, setStep] = useState<'request' | 'confirm'>('request');
  
  const handleRequest = async (email: string) => {
    try {
      await requestReset(email);
      setStep('confirm');
    } catch (err) {
      console.error('Request failed:', error);
    }
  };
  
  const handleConfirm = async (code: string, newPassword: string) => {
    try {
      await confirmReset(code, newPassword);
      setStep('request');
    } catch (err) {
      console.error('Confirm failed:', error);
    }
  };
  
  // Form JSX...
}
```

## 🔧 Build & Test

After creating the hooks:

```bash
# Build the package
npm run build
# or
pnpm build

# Watch mode during development
npm run dev
# or  
pnpm dev
```

## 📝 Key Implementation Details

✅ **Token Management**
- Tokens automatically stored in localStorage
- Supports custom storage adapters via `QuelixClientConfig`

✅ **State Management**
- All hooks integrate with `useQuellix()` context
- Auth state automatically synced across all hooks
- State listeners for real-time updates

✅ **Error Handling**
- Comprehensive error messages
- Errors propagated through hook return values
- Console logging for debugging (respects debug flag)

✅ **Type Safety**
- Full TypeScript definitions
- Proper return types from `@quellix/types`
- Type-safe API responses

✅ **React Best Practices**
- Uses React 16.8+ hooks
- Proper dependency arrays in useCallback
- No memory leaks

## 🎓 Next Steps

1. **Run the setup script** to create the hooks directory and files
2. **Build the package** with `npm run build`
3. **Import hooks** in your React components
4. **Wrap your app** with `<QuelixProvider>` at the root
5. **Use hooks** in any component inside the provider

Example app setup:
```typescript
import { QuelixProvider } from '@quellix/js';

export default function App() {
  return (
    <QuelixProvider config={{
      publishableKey: 'your-key',
      apiUrl: 'https://api.example.com'
    }}>
      {/* Your components here */}
    </QuelixProvider>
  );
}
```

---

**Need help?** Check the HOOKS_SETUP_INSTRUCTIONS.md file for detailed setup options.
