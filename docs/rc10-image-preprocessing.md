# RC10 — Image Preprocessing

**Module:** `src/utils/imagePreprocessing.js`  
**Legacy alias:** `src/utils/imageCompression.js` → re-exports preprocessing

---

## Objective

Transform a trade-show business card photo into an OCR-optimized image that:

- Preserves small text (CJK, accents, multi-language)
- Handles phone camera orientation (EXIF)
- Stays under **1 MB** upload size
- Maximizes readable resolution up to **4K** (3840px longest edge)

**Quality over file size** when the two conflict — compression steps down only after enhancement.

---

## Pipeline steps

| Order | Step | Technique | Purpose |
|-------|------|-----------|---------|
| 1 | EXIF orientation | `createImageBitmap({ imageOrientation: "from-image" })` | Correct rotated phone photos |
| 2 | Resize | Bicubic scale to max 3840px | 4K card readability |
| 3 | Contrast enhancement | Luminance histogram stretch | Improve faint thermal-print text |
| 4 | Background cleanup | Near-white (avg &gt;245) → pure white | Reduce shadow noise |
| 5 | Adaptive sharpening | 3×3 unsharp mask kernel | Preserve glyph edges |
| 6 | JPEG encode | Quality 0.92 → 0.72 in 0.04 steps | Target &lt;1 MB |

### Not implemented (client-side limits)

| Technique | Status | Future |
|-----------|--------|--------|
| Deskew | Not in RC10 | Server OpenCV worker |
| Perspective correction | Not in RC10 | Server homography |
| Noise reduction (bilateral) | Partial via background cleanup | WASM/OpenCV |

---

## Configuration

```javascript
await preprocessBusinessCardImage(file, {
  maxDimension: 3840,      // default
  targetMaxBytes: 1_000_000,
  quality: 0.92,           // starting JPEG quality
});
```

---

## Metrics returned

```json
{
  "preprocessingMs": 142,
  "originalBytes": 3240000,
  "outputBytes": 876000,
  "originalWidth": 3024,
  "originalHeight": 4032,
  "outputWidth": 2880,
  "outputHeight": 3840,
  "jpegQuality": 0.88,
  "steps": [
    "exif_orientation",
    "resize",
    "contrast_enhancement",
    "background_cleanup",
    "adaptive_sharpening",
    "quality_reduction"
  ],
  "compressionRatio": 0.27
}
```

Emitted in pipeline `metrics.preprocessing` via `[rc10-pipeline]` logs.

---

## RC9 vs RC10 comparison

| Metric | RC9 | RC10 |
|--------|-----|------|
| Max dimension | 1600px | 3840px |
| Start JPEG quality | 0.82 | 0.92 |
| Min JPEG quality | 0.50 | 0.72 |
| Max data URL chars | 1,500,000 | 1 MB binary target |
| EXIF handling | None | Yes |
| Contrast/sharpen | None | Yes |
| Background cleanup | None | Yes |

### Expected impact

| Card type | Expected improvement |
|-----------|---------------------|
| Chinese/Japanese vertical cards | High — resolution + sharpening |
| Low-contrast thermal print | Medium — contrast stretch |
| Rotated phone photos | High — EXIF |
| Dark booth lighting | Medium — contrast + background |
| Already high-quality scan | Neutral — minimal recompression |

---

## Before/after measurement

Run preprocessing in browser devtools:

```javascript
import { preprocessBusinessCardImage } from "@/utils/imagePreprocessing";
const { dataUrl, metrics } = await preprocessBusinessCardImage(file);
console.table(metrics);
```

Compare `originalBytes` vs `outputBytes` and visually inspect `dataUrl` at 200% zoom for glyph clarity.

---

## Integration

Called automatically as Stage 1 of `runDocumentIntelligencePipeline()`. No UI changes required for upload flow — same file input, enhanced processing.
