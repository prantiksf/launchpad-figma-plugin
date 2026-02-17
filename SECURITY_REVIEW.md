# Security Review: Starter Kit Figma Plugin

**Date:** February 17, 2026  
**Version Reviewed:** 1.18.0

---

## Executive Summary

The Starter Kit plugin and its Heroku backend handle design metadata (templates, clouds, saved items, activity logs) rather than highly sensitive credentials or PII. The review found **no critical vulnerabilities**. Several recommendations from the initial review have been implemented in v1.18.0 to harden security and reduce risk.

---

## 1. Data Storage & Transmission

### ✅ Strengths

| Area | Status | Notes |
|------|--------|-------|
| **HTTPS** | ✅ | API uses `https://` (Heroku). Plugin manifest restricts network to `https://*.herokuapp.com` and `https://api.figma.com`. |
| **Database** | ✅ | PostgreSQL with parameterized queries throughout `db.js` – no raw string concatenation in SQL. |
| **Secrets** | ✅ | `DATABASE_URL` and other secrets in `.env`; `.env.example` has no real credentials. |
| **Client storage** | ✅ | Figma `clientStorage` for local fallback; `localStorage` only for dark mode preference (non-sensitive). |

### ⚠️ Recommendations

1. **API base URL** – `API_BASE_URL` is hardcoded in both `api.ts` and `useBackendStorage.ts`. Prefer a single source (e.g. env at build time) to avoid drift and simplify deployment.
2. **SSL for PostgreSQL** – Prefer proper CA configuration for Heroku Postgres.

---

## 2. Authentication & Authorization

### ✅ Current State (v1.18.0)

| Issue | Severity | Description |
|-------|----------|-------------|
| **API auth** | ✅ | Optional `API_KEY` supported. When set, `/api/*` and `/admin/*` require `X-API-Key`. |
| **Admin endpoints** | ✅ | Protected by the same API key middleware when `API_KEY` is configured. |
| **User impersonation** | Medium | User-specific data (default cloud, hidden clouds, onboarding) is keyed by `figmaUserId` from the client. A malicious actor could send arbitrary `figmaUserId` values. |

### Recommendations (remaining)

1. **Ensure API key is configured in production** – Set `API_KEY` in the backend environment and set `STARTER_KIT_API_KEY` at build time for the plugin.
2. **Validate Figma user identity** – If possible, verify `figmaUserId` against Figma’s API or a signed token from the plugin.

---

## 3. Input Validation & Injection

### ✅ Strengths

- **SQL injection** – All queries use parameterized placeholders (`$1`, `$2`, etc.). No string concatenation into SQL.
- **Templates** – Strict validation: must be array, each item must have `id` and `name`, bulk-delete limits.
- **Data protection** – Bulk delete and accidental wipe protections (e.g. max 2 deletions at a time, no >50% reduction).

### ⚠️ Recommendations

1. **Backup `dataKey`** – Implemented in v1.18.0: `dataKey` is validated against a whitelist to reduce abuse (e.g. probing arbitrary keys).
2. **Request body size** – `express.json({ limit: '50mb' })` is large for base64 previews. Consider separate limits per route or stricter limits for non-preview endpoints.
3. **Activity log params** – `action`, `assetId`, `assetName`, etc. are stored as-is. Sanitize or constrain length to avoid abuse (e.g. very long strings).

---

## 4. XSS (Cross-Site Scripting)

### ✅ Current State (v1.18.0)

| Location | Risk | Notes |
|----------|------|-------|
| `src/ui.tsx` / `scripts/build.ts` / `src/ui.html` | ✅ | Dynamic error strings are escaped before being placed into `innerHTML`. |
| React rendering | ✅ | No `dangerouslySetInnerHTML` in App; React escapes by default. |

### Recommendations (remaining)

1. Prefer `textContent` where possible for error display (defense-in-depth).

---

## 5. postMessage & Plugin Communication

### ✅ Strengths

- `postMessage` is used for Figma plugin ↔ UI communication, which is the standard pattern.
- Target `'*'` is typical for plugin iframes; Figma controls the embedding context.

### ⚠️ Note

- `parent.postMessage(..., '*')` sends to any parent. In the plugin context this is expected, but ensure no sensitive data is sent that could be intercepted by a malicious parent (unlikely in normal Figma usage).

---

## 6. Sensitive Data Handling

### ✅ Strengths

- No passwords, API keys, or tokens stored in the app.
- User data: Figma user ID, name, photo URL – low sensitivity.
- Stored data: templates, clouds, saved items, activity logs – design metadata, not financial or health data.

### Recommendations

1. **User names in activity log** – `figma.currentUser?.name` is stored. Document that this is design metadata and covered by your privacy policy if applicable.
2. **Backup retention** – Backups are kept (e.g. 30–50 per data type). Consider retention limits and deletion for compliance if needed.

---

## 7. CORS & Network

### Current Setup

- CORS restricted to known origins (Figma + deployment domains). See `backend/server.js`.

### Recommendation

- Restrict CORS to known origins (e.g. Figma plugin origin, your frontend) when possible. Figma plugin UIs may use `https://www.figma.com` or similar; confirm and narrow the allowlist.

---

## 8. Dependency & Build Security

### Recommendations

1. Run `npm audit` regularly and address high/critical issues.
2. Pin dependency versions in `package.json` to reduce supply-chain risk.
3. Ensure `node_modules` and `.env` are in `.gitignore` (`.env` should already be ignored).

---

## 9. Checklist Summary

| Category | Status | Action |
|----------|--------|--------|
| HTTPS | ✅ | None |
| SQL injection | ✅ | None |
| Secrets in code | ✅ | None |
| API authentication | ✅ | Optional `API_KEY` + `X-API-Key` middleware (configure in production) |
| Admin endpoint protection | ✅ | Protected by the same middleware when `API_KEY` is set |
| XSS | ✅ | Escape dynamic content before `innerHTML` |
| CORS | ✅ | Restricted to known origins |
| User identity validation | ⚠️ | Validate figmaUserId where possible |
| Input validation | ✅ | Good for templates; extend to other inputs |
| Backup dataKey validation | ⚠️ | Whitelist allowed keys |

---

## 10. Priority Actions

1. **High** – Ensure `API_KEY` is set in production and distributed securely (do not hardcode in repo).
2. **Medium** – Validate `figmaUserId` where possible (mitigate impersonation).
3. **Low** – Reduce request body limits for non-preview endpoints (DoS hardening).

---

*This review is based on static code analysis. A full security assessment would include dynamic testing, dependency scanning, and penetration testing.*
