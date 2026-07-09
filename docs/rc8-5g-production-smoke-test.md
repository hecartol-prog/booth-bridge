# RC8.5G — Production Smoke Test

Date: 2026-07-08  
Target: https://www.boothbridge.app

## Required Walkthrough vs Executed Evidence

| Required step | Status | Evidence |
|---|---|---|
| Manual registration | **NOT EXECUTED** | Browser/manual account creation loop not completed in this environment. |
| Business card OCR registration | **NOT EXECUTED** | Not executed on production UI. |
| Email verification | **NOT EXECUTED** | No mailbox loop executed on production host. |
| Login | **PARTIAL** | Route reachability confirmed (`/login` 200), no manual credential session on production UI. |
| Logout | **NOT EXECUTED** | No full browser-auth session run on production UI. |
| Password reset | **NOT EXECUTED** | No production-mail token loop run on production UI. |
| Create company | **NOT EXECUTED** | Not executed in production browser walkthrough. |
| Create booth | **NOT EXECUTED** | Not executed in production browser walkthrough. |
| Upload logo | **NOT EXECUTED** | Not executed in production browser walkthrough. |
| Upload business card | **NOT EXECUTED** | Not executed in production browser walkthrough. |
| Run OCR | **NOT EXECUTED** | Not executed in production browser walkthrough. |
| Create meeting | **NOT EXECUTED** | Not executed in production browser walkthrough. |
| View meetings | **PARTIAL** | Route `/meetings` returns 200; no authenticated meeting list validation. |
| Notifications | **PARTIAL** | Route `/notifications` returns 200; no authenticated event validation in production browser. |
| Profile update | **NOT EXECUTED** | Not executed in production browser walkthrough. |
| Reload session | **NOT EXECUTED** | Not executed in production browser walkthrough. |
| Offline mode | **PARTIAL** | `/sw.js` returns 200; no full manual offline user journey replay. |
| Reconnect | **NOT EXECUTED** | No manual disconnect/reconnect scenario on production browser. |

## Failures Recorded

1. **Smoke test completeness failure:** full required production walkthrough was not completed as specified.
2. **Environment limitation encountered:** no successful browser automation runtime available to complete manual-equivalent production journey in this shell.

## Result

**FAIL**

