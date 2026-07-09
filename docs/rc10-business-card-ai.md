# RC10 — Business Card AI Architecture

**Version:** RC10  
**Default vision model:** `qwen/qwen-2.5-vl-72b-instruct`  
**Default normalize model:** `qwen/qwen-2.5-72b-instruct`

---

## Two-stage architecture

RC10 separates **reading** from **understanding**:

```
Stage 1 — Vision model (image → verbatim text JSON)
Stage 2 — Text LLM (verbatim text → structured profile + per-field confidence)
Stage 3 — Entity validation (flag uncertain values)
Stage 4 — Field mapping (app form shape)
```

This mirrors enterprise document AI patterns and is reusable for catalogs, brochures, badges, invoices.

---

## Stage 1: Vision extraction

**API:** `extractRc10VisionText()` in `src/api/aiClient.js`  
**Prompt:** `src/ai/prompts/businessCard/rc10VisionExtract.js`

### Rules enforced in prompt

- Extract ALL visible text exactly as printed
- NEVER summarize, paraphrase, translate, or invent
- Preserve capitalization, punctuation, accents, CJK characters
- Support multi-language and mixed-language cards
- Return `null`/empty for absent information (via empty strings in blocks)

### Output schema

```json
{
  "full_text": "line1\nline2\n...",
  "text_blocks": [
    { "text": "...", "region": "header|body|footer|left|right|back" }
  ],
  "languages_detected": ["en", "zh"],
  "layout_notes": "dual-language, vertical layout",
  "has_qr_code": true,
  "has_multiple_phones": true,
  "has_multiple_emails": false,
  "has_multiple_addresses": false
}
```

---

## Stage 2: Structure normalization

**API:** `normalizeRc10BusinessCard()` in `src/api/aiClient.js`  
**Prompt:** `src/ai/prompts/businessCard/rc10StructureNormalize.js`

### Field schema (per-field confidence)

Each field returns:

```json
{
  "email": {
    "value": "hector@company.com",
    "confidence": 97,
    "source": "vision"
  }
}
```

### Supported fields

`company_name`, `legal_company_name`, `brand_name`, `first_name`, `last_name`, `full_name`, `job_title`, `department`, `email`, `secondary_email`, `phone`, `mobile`, `fax`, `website`, `linkedin`, `wechat`, `whatsapp`, `line`, `telegram`, `address`, `city`, `state`, `postal_code`, `country`, `industry`, `company_description`, `notes`, `languages_detected`

### Normalization rules

- Use ONLY text from Stage 1
- `inferred` source only for unambiguous name splits
- Multiple phones → `phone` + `mobile`
- Multiple emails → `email` + `secondary_email`
- Company suffix recognition: Ltd, LLC, GmbH, 株式会社, 有限公司, S.A., BV, etc.

---

## Stage 3: Entity validation

**Module:** `src/pipeline/documentIntelligence/entityValidation.js`

| Check | Action on failure |
|-------|-------------------|
| Email format | Flag + cap confidence at 75 |
| Phone format | Flag |
| URL format | Flag |
| Postal code | Flag |
| Country | Normalize aliases (US → United States) |
| Company name | Flag if &lt;3 chars |

**Never rejects** — values always pass through for user review.

---

## Stage 4: Field mapping

| UI target | Mapper | Key transforms |
|-----------|--------|----------------|
| Onboarding | `mapToRegistrationFields()` | `company_name` → `company`, `address` → `companyAddress` |
| OCR Scanner | `mapToOcrScannerFields()` | Full RC10 field set in snake_case |

---

## Pipeline modes

| Mode | Stage 1 | Stage 2 | Use case |
|------|---------|---------|----------|
| `manual` | Skip | Skip | User fills form |
| `ocr_only` | Vision | Skip | Debug / fast preview |
| `ocr_ai` | Vision | Normalize + validate | Production default |

---

## Environment configuration

```env
VITE_RC10_VISION_MODEL=qwen/qwen-2.5-vl-72b-instruct
VITE_RC10_NORMALIZE_MODEL=qwen/qwen-2.5-72b-instruct
VITE_AI_ENABLED=true
```

---

## International optimization

Handled via prompt design + preprocessing:

| Scenario | RC10 approach |
|----------|---------------|
| English / CJK / mixed | Verbatim extraction preserves scripts |
| Dual-sided cards | `text_blocks.region` + layout_notes |
| Vertical layouts | Vision model reads top-to-bottom per region |
| QR codes | `has_qr_code` flag; printed labels extracted |
| Logo-only areas | Skipped unless legible characters |
| Multiple phones/emails | Stage 2 maps to primary + secondary fields |
| Two addresses | Primary → `address`; overflow → `notes` |

---

## Future document types

`runDocumentIntelligencePipeline()` accepts `documentType`:

| Type | Status |
|------|--------|
| `business_card` | RC10 full pipeline |
| `badge` | Legacy flat extraction (badge prompt) |
| `catalog_page` | Planned — reuse Stage 1+2 pattern |
| `product_sheet` | Planned |
| `brochure` | Planned |
| `invoice` | Planned |

Add new prompts in `src/ai/prompts/{documentType}/` and register in `documentIntelligence/index.js`.

---

## API surface (backward compatible)

```javascript
import { runBusinessCardPipeline, PIPELINE_MODES } from "@/pipeline/businessCardPipeline";

const result = await runBusinessCardPipeline({
  file,
  mode: PIPELINE_MODES.OCR_AI,
  scanType: "business_card",
  userId: user.id,
  target: "scanner",
});

// RC10 additions in result:
result.structuredProfile;  // per-field confidence objects
result.fieldConfidence;    // flat confidence map
result.validationFlags;    // flagged fields
result.visionRaw;          // Stage 1 verbatim JSON
result.metrics.preprocessing;
```
