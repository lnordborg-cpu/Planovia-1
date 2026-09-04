# Planovia Auth Testing Playbook

Two auth methods are supported, both producing a `session_token` cookie:

1. **Email/Password** (bcrypt + session token)
2. **Emergent-managed Google** (redirect + session_id exchange)

## Endpoints

| Method | Path                         | Auth   | Purpose                                       |
|--------|------------------------------|--------|-----------------------------------------------|
| POST   | `/api/auth/register`         | none   | `{email, password, name}` → user + cookie     |
| POST   | `/api/auth/login`            | none   | `{email, password}` → user + cookie           |
| POST   | `/api/auth/session`          | none   | header `X-Session-ID` → user + cookie (Google) |
| GET    | `/api/auth/me`               | cookie | current user                                  |
| POST   | `/api/auth/logout`           | cookie | clear cookie + delete session                 |
| GET    | `/api/sync/state`            | cookie | user's planner state blob                     |
| PUT    | `/api/sync/state`            | cookie | replace user's planner state blob             |
| POST   | `/api/uploads`               | cookie or none (guest→shared) | upload file  |

Cookie: `session_token`, httpOnly, secure, samesite="none", path="/", 7-day expiry.

## MongoDB collections
- `users`: `{user_id, email, name, picture?, password_hash?, provider, created_at, updated_at}`
- `user_sessions`: `{session_token, user_id, expires_at, created_at}`
- `user_snapshots`: `{user_id, state, updated_at}`
- `login_attempts`: `{identifier, count, first_attempt}` (brute force lockout)
- `files`: existing + `user_id` field for authenticated uploads

## Curl smoke tests

```bash
API=$REACT_APP_BACKEND_URL

# Register
curl -c c.txt -X POST "$API/api/auth/register" -H "Content-Type: application/json" \
  -d '{"email":"lisa@planovia.test","password":"Test1234","name":"Lisa"}'

# Me
curl -b c.txt "$API/api/auth/me"

# Push state
curl -b c.txt -X PUT "$API/api/sync/state" -H "Content-Type: application/json" \
  -d '{"state": {"classes": [{"id":"c1","name":"6A"}]}}'

# Pull state
curl -b c.txt "$API/api/sync/state"

# Logout
curl -b c.txt -X POST "$API/api/auth/logout"
```

## Frontend routing
- `/logga-in` shows two paths: Google button + email/password form
- `/valkommen` – logged-out marketing
- All other routes work without login (guest mode) but show a "Logga in för att synka" hint
- After Google redirect, URL contains `#session_id=…`. AuthCallback exchanges it via `POST /api/auth/session` then navigates to `/oversikt`.
- After first login, if guest has local data: show merge dialog with two options ("Behåll min planerare" → PUT current localStorage state / "Börja tomt")

## Reminder
DO NOT HARDCODE THE GOOGLE REDIRECT URL. Use `window.location.origin + '/oversikt'`.
