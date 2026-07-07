# RC5-8 — End-to-End Production Smoke Test

**Generated:** 2026-07-06  
**Target URL:** `https://boothbridge.app`  
**Backend:** `https://jjqhmvfzqpohvukoxeoe.supabase.co`  
**Commit:** `4ab9e7115a4c63a5b60f0292d93e13bdae8d4f47`

---

## Executive Summary

**Overall smoke: FAIL** — production URL does not serve the BoothBridge application. Full three-user walkthrough **could not be executed**.

| Role | Walkthrough | Result |
|------|-------------|--------|
| Visitor (Buyer) | Full flow | **NOT RUN** |
| Exhibitor | Full flow | **NOT RUN** |
| Admin | Full flow | **NOT RUN** |

---

## Environment Pre-check

| Precondition | Status |
|--------------|--------|
| App loads at `boothbridge.app` | **FAIL** — Hostinger default page |
| Supabase client env on host | **FAIL** — no Vercel deployment |
| `npm run build` local | **PASS** |
| Supabase backend online | **PASS** |

---

## Smoke Flow — Step Results

Legend: ✅ PASS · ❌ FAIL · ⏭ NOT RUN · ⚠️ BLOCKED

### Visitor (Buyer) journey

| Step | Expected | RC5 result | Evidence |
|------|----------|------------|----------|
| 1. Register | Signup form → email | ⏭ **NOT RUN** | No app UI on domain |
| 2. Login | Email/password session | ⏭ **NOT RUN** | |
| 3. Complete profile | Buyer profile saved | ⏭ **NOT RUN** | |
| 4. Discover booth | Search / discover works | ⏭ **NOT RUN** | |
| 5. Create connection | Connection request sent | ⏭ **NOT RUN** | |
| 6. Schedule meeting | Meeting request created | ⏭ **NOT RUN** | |
| 7. Notification | Notification visible | ⏭ **NOT RUN** | Known Phase 7.6 cross-user notification defect |
| 8. Logout | Session cleared | ⏭ **NOT RUN** | |

### Exhibitor journey

| Step | Expected | RC5 result | Evidence |
|------|----------|------------|----------|
| 1. Register / Login | Exhibitor session | ⏭ **NOT RUN** | |
| 2. Complete profile | Company + exhibitor profile | ⏭ **NOT RUN** | |
| 3. Create booth | Booth record created | ⏭ **NOT RUN** | |
| 4. Upload logo | `boothbridge-media` object + signed URL | ⏭ **NOT RUN** | Phase 7.6: PASS (harness) |
| 5. Upload business card | OCR bucket upload | ⏭ **NOT RUN** | |
| 6. OCR | Structured fields extracted | ⚠️ **BLOCKED** | `OPENROUTER_API_KEY` missing |
| 7. AI Summary | Summary generated | ⚠️ **BLOCKED** | AI credentials |
| 8. Create connection | Outbound connection | ⏭ **NOT RUN** | |
| 9. Schedule meeting | Meeting flow | ⏭ **NOT RUN** | |
| 10. Notification | In-app notification | ⏭ **NOT RUN** | |
| 11. Logout | Session cleared | ⏭ **NOT RUN** | |

### Admin journey

| Step | Expected | RC5 result | Evidence |
|------|----------|------------|----------|
| 1. `/admin-login` | Admin auth | ⏭ **NOT RUN** | |
| 2. Dashboard load | Admin grid data | ⏭ **NOT RUN** | |
| 3. Exhibitor list | CRUD read | ⏭ **NOT RUN** | |
| 4. Media view | Signed URLs | ⏭ **NOT RUN** | |
| 5. Logout | Session cleared | ⏭ **NOT RUN** | |

---

## Screenshots

| Capture | Status |
|---------|--------|
| Production home page | **NOT CAPTURED** — validator has no browser automation in RC5 |
| Login screen | **NOT CAPTURED** |
| Booth / OCR / Admin | **NOT CAPTURED** |

**Observed production home (curl excerpt):** Hostinger "Default page" — title `Default page`, favicon `hpanel.hostinger.com`.

---

## Automated Harness

| Script | RC5 execution |
|--------|---------------|
| `scripts/phase7-6-e2e-validation.mjs` | **NOT RUN** — requires service-role env; blocked in validator session |

**Prior Phase 7.6 verdict:** STOP — notification defect + invalid AI keys + email rate limits.

---

## Blockers to Complete Smoke

| Priority | Blocker |
|----------|---------|
| P0 | Deploy Vercel + DNS cutover |
| P0 | Set `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` on Vercel |
| P0 | Set `OPENROUTER_API_KEY` + valid `OPENAI_API_KEY` |
| P1 | Configure SMTP + Auth redirect URLs |
| P1 | Fix or accept notification cross-user creation defect |
| P2 | Re-run E2E harness + manual three-user browser pass |

---

## How to Execute (Operator Script)

After P0 blockers resolved:

1. **Visitor:** Register `buyer+<timestamp>@yourdomain.com` → login → discover → save booth → request meeting
2. **Exhibitor:** Login → setup wizard → upload logo → scan business card → verify OCR + AI summary
3. **Admin:** `/admin-login` → verify exhibitor appears in admin grid
4. Record PASS/FAIL per step in this document
5. Attach screenshots to `docs/rc5-8-screenshots/` (create if needed)

---

## Verdict

**FAIL — No end-to-end production smoke possible.**

Backend components exist; **production user journey is untested** because the frontend is not live on `boothbridge.app`.
