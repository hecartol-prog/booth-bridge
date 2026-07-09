/**
 * RC9/RC10 — backward-compatible re-export.
 * New code should import from pipeline/documentIntelligence.
 */export {
  runBusinessCardPipeline,
  runDocumentIntelligencePipeline,
  dataUrlToFile,
  PIPELINE_MODES,
  RC10_VISION_MODEL,
  RC10_NORMALIZE_MODEL,
} from "@/pipeline/documentIntelligence";
