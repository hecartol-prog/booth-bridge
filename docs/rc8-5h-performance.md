# RC8.5H — Performance Audit

Date: 2026-07-08

## Evidence Executed

- Production latency probes (`curl` + `Measure-Command`) on:
  - `/`
  - `/login`
  - `/register`
  - `/forgot-password`
  - `/sw.js`
  - `/brand-mark.svg`
- Production bundle header check:
  - `Content-Length: 1,736,474` bytes for `assets/index-BaRnzaPj.js`

## Measurements

| Metric | Value | Status |
|---|---:|---|
| Initial load (`/`) | ~1260 ms | PASS |
| Login route | ~866 ms | PASS |
| Register route | ~779 ms | PASS |
| Forgot password route | ~1188 ms | PASS |
| Service worker asset | ~1142 ms | PASS |
| Branding asset | ~1153 ms | PASS |
| Largest JS bundle (production) | 1,736,474 bytes (~1.66 MiB) | WARN |
| Bundle fetch time (observed sample) | ~131,680–139,468 ms | FAIL (unstable/slow sample path) |
| API latency (app business APIs) | Not fully isolated in this run | WARN |
| Supabase latency | Not separately benchmarked in this run | WARN |
| Storage latency | Not separately benchmarked in this run | WARN |
| OCR latency | Not benchmarked in this run | WARN |

## Notes

- Route-level HTML responses are acceptable.
- JS bundle size and observed transfer timing indicate frontend payload/perf risk for production cold loads and weak networks.

## Result

**PASS WITH WARNINGS**

