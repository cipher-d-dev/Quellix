## Instructions: Creating Quellix React Hooks

I've prepared all 7 hook files for your project. Due to a technical constraint with the file creation tool (requiring parent directories to exist), here are your options for creating the hooks:

### Option 1: Using the Provided Node.js Script (Recommended)

I've created a setup script that will create all the hooks automatically.

**Run from the repository root:**
```bash
node packages/js/setup-full-hooks.js
```

This will:
1. Create the `packages/js/src/hooks/` directory
2. Create all 7 hook files with complete implementations

### Option 2: Manual Creation Using the .txt Files

All hook files have been saved as .txt files in the root directory:
- `useAuth.ts.txt`
- `useUser.ts.txt`
- `useSignIn.ts.txt`
- `useSignUp.ts.txt`
- `useSignOut.ts.txt`
- `useEmailVerification.ts.txt`
- `usePasswordReset.ts.txt`

**Steps:**
1. Create the directory: `packages/js/src/hooks/`
2. Copy and rename each file:
   - `useAuth.ts.txt` → `packages/js/src/hooks/useAuth.ts`
   - `useUser.ts.txt` → `packages/js/src/hooks/useUser.ts`
   - etc.

### Option 3: Using Git Bash or Similar

If you have Git Bash or another Unix-like shell installed:
```bash
bash packages/js/setup-hooks.sh
```

## What Each Hook Does

### 1. **useAuth()** - Core authentication hook
```typescript
const { 
  isAuthenticated, 
  isLoading, 
  user, 
  session, 
  error, 
  signIn, 
  signUp, 
  signOut, 
  refresh 
} = useAuth();
```
- Manages full authentication lifecycle
- Stores/retrieves tokens from localStorage
- Updates context auth state on all operations

### 2. **useUser()** - User profile management
```typescript
const { 
  user, 
  isLoading, 
  error, 
  updateUser, 
  deleteAccount 
} = useUser();
```
- Updates user profile information
- Handles account deletion with password verification

### 3. **useSignIn()** - Simplified form-oriented signin
```typescript
const { signIn, isLoading, error } = useSignIn();
```
- Wrapper around useAuth.signIn()
- Useful for form components

### 4. **useSignUp()** - Simplified form-oriented signup
```typescript
const { signUp, isLoading, error } = useSignUp();
```
- Wrapper around useAuth.signUp()
- Accepts email, password, firstName, lastName

### 5. **useSignOut()** - Signout hook
```typescript
const { signOut, isLoading } = useSignOut();
```
- Wrapper around useAuth.signOut()
- Clears all auth state and tokens

### 6. **useEmailVerification()** - Email verification
```typescript
const { 
  sendCode, 
  verifyCode, 
  isLoading, 
  error, 
  isSent, 
  isVerified 
} = useEmailVerification();
```
- Send verification codes via email
- Verify email with code
- Track verification status

### 7. **usePasswordReset()** - Password reset flow
```typescript
const { 
  requestReset, 
  confirmReset, 
  isLoading, 
  error 
} = usePasswordReset();
```
- Request password reset by email
- Confirm reset with code and new password

## Key Implementation Details

- **Token Storage**: Tokens stored in localStorage (via `config.storage`)
- **State Management**: All hooks use React context via `useQuellix()`
- **Error Handling**: Comprehensive error messages propagated through error states
- **Type Safety**: Full TypeScript types from `@quellix/types`
- **React Hooks**: Use React 16.8+ hooks (useState, useCallback)

## Next Steps

1. Run the setup script or manually create the files
2. Verify files are in `packages/js/src/hooks/`
3. Run `npm run build` or `pnpm build` to compile
4. Export hooks from your components

## Files Created for Reference

- `packages/js/setup-full-hooks.js` - Node.js setup script
- `packages/js/setup-hooks.sh` - Bash setup script  
- `useAuth.ts.txt` through `usePasswordReset.ts.txt` - Individual hook files
- `create-hooks.js` - Alternative comprehensive setup script
