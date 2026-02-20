# Quellix

**Open-source authentication SDK for React.** Drop-in components, hooks, sessions, MFA, and organizations — all in one package.

---

## MVP Scope

Quellix MVP ships a fully working, self-hostable authentication system with a React SDK and a supporting backend API. The goal l/mis feature parity with the core of Clerk — without the vendor lock-in.

---

## Architecture

```
quellix/
├── apps/
│   ├── api/           # Authentication backend (Fastify + PostgreSQL)
│   └── dashboard/     # Developer portal
├── packages/
│   ├── react/         # @quellix/react — SDK, components, hooks
│   ├── types/         # @quellix/types — shared TypeScript types
│   └── testing/       # @quellix/testing — mock providers & test utils
└── docs/              # Documentation site
```

Built as a **pnpm monorepo** orchestrated by **Turborepo**.

---

## MVP Features

### Authentication Backend (`apps/api`)
- User signup, signin, signout
- JWT access tokens + refresh token rotation
- httpOnly cookie session management
- Password hashing (argon2)
- Email verification
- Rate limiting and CSRF protection

### React SDK (`@quellix/react`)

#### Provider
```tsx
import { QuellixProvider } from '@quellix/react'

export default function App() {
  return (
    <QuellixProvider publishableKey="qlx_...">
      <YourApp />
    </QuellixProvider>
  )
}
```

#### Pre-built Components
| Component | Description |
|---|---|
| `<SignIn />` | Customizable sign-in form |
| `<SignUp />` | Registration form with validation |
| `<UserButton />` | User avatar + profile dropdown |
| `<UserProfile />` | Full profile management UI |
| `<SignedIn />` | Renders children only when authenticated |
| `<SignedOut />` | Renders children only when unauthenticated |
| `<ProtectedRoute />` | Route-level auth guard |
| `<RedirectToSignIn />` | Redirects unauthenticated users |

#### Hooks
| Hook | Description |
|---|---|
| `useAuth()` | Auth state, signIn, signOut methods |
| `useUser()` | Current user object and update methods |
| `useSession()` | Session data and lifecycle |

#### Social Auth
```tsx
<SignIn providers={['google', 'github', 'microsoft']} />
```

#### MFA
```tsx
<MFASettings /> // TOTP, SMS, backup codes
```

#### Organization Support
```tsx
const { organization, membership } = useOrganization()
```

### Theming
Full theming via CSS variables — drop in your own design system or use the default.

```tsx
<QuellixProvider appearance={{ theme: 'dark', variables: { colorPrimary: '#6366f1' } }}>
```

Headless variants available for full UI control.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend runtime | Node.js + TypeScript |
| Backend framework | Fastify |
| Database | PostgreSQL |
| Cache / Sessions | Redis |
| SDK build | tsup (CJS + ESM) |
| Monorepo | pnpm workspaces + Turborepo |
| Forms | React Hook Form + Zod |
| Testing | Vitest + Testing Library |
| Email | Postmark |

---

## Getting Started

```bash
# Clone the repo
git clone https://github.com/yourhandle/quellix.git
cd quellix

# Install all dependencies
pnpm install

# Set up environment variables
cp apps/api/.env.example apps/api/.env

# Run everything in dev mode
pnpm dev
```

### Add to your React project

```bash
pnpm add @quellix/react
```

---

## Roadmap

- [x] Monorepo setup
- [ ] Backend API — auth core
- [ ] `@quellix/react` — provider + hooks
- [ ] Pre-built components
- [ ] Social OAuth (Google, GitHub, Microsoft, Apple)
- [ ] Multi-factor authentication (TOTP, SMS)
- [ ] Organization management + RBAC
- [ ] Session management UI
- [ ] Developer portal
- [ ] CLI (`npx create-quellix-app`)
- [ ] Next.js + Remix integrations
- [ ] Security audit
- [ ] Public launch

---

## Contributing

Quellix is in active early development. Issues and PRs are welcome once the initial architecture is stable. Watch this repo for updates.

---

## License

MIT