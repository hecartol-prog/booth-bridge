# RC8.5C — Storage Validation

Date: 2026-07-08

## Evidence Executed

- `supabase storage ls ss:/// --linked --experimental`
- RC7.6 runtime E2E harness (executed during RC8.5): `C:\Users\hecto\AppData\Local\Temp\rc85-e2e.json`
- Attempted direct CLI upload/download via `supabase storage cp` in linked project mode.

## Verification Matrix

| Check | Status | Evidence |
|---|---|---|
| Storage buckets exist | **PASS** | CLI lists `boothbridge-media/`, `boothbridge-assets/`, `boothbridge-ocr/`. |
| Upload works | **PASS** | E2E `storage.ok=true`, upload=true on media/assets/ocr. |
| Download works | **PASS** | E2E download=true on media/assets/ocr. |
| Signed URLs work | **PASS** | E2E signed_url=true on media/assets/ocr. |
| Image rendering works | **PASS WITH WARNINGS** | Static image route `/brand-mark.svg` returns 200; full authenticated media rendering not browser-validated in this session. |
| Business card upload works | **PASS** | E2E `ai_business_card` endpoint exercised; OCR bucket upload path validated in storage section. |
| OCR upload works | **PASS** | E2E storage.ocr.upload=true. |

## Notes

- Direct `supabase storage cp` upload/download attempts in this shell returned `LegacyStorageUnsupportedOperationError`; however, runtime E2E using app-equivalent Supabase client calls validated upload/download/signed-url behavior successfully.

## Result

**PASS WITH WARNINGS**

### Warning

Authenticated browser image rendering of storage objects was not fully replayed end-to-end in this environment; API/runtime validations passed.

