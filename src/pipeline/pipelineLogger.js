/**
 * RC9 structured pipeline logging — every stage emits a log entry.
 */

/**
 * @typedef {Object} PipelineLogEntry
 * @property {string} ts
 * @property {string} runId
 * @property {string} stage
 * @property {"start"|"ok"|"error"|"skip"} status
 * @property {number} [latencyMs]
 * @property {string} [code]
 * @property {string} [message]
 * @property {Record<string, unknown>} [details]
 */

/**
 * @param {string} runId
 * @param {(entry: PipelineLogEntry) => void} [onLog]
 * @param {string} [tag]
 */
export function createPipelineLogger(runId, onLog, tag = "rc9-pipeline") {
  /** @type {PipelineLogEntry[]} */
  const entries = [];

  /**
   * @param {string} stage
   * @param {"start"|"ok"|"error"|"skip"} status
   * @param {Record<string, unknown>} [details]
   */
  function log(stage, status, details = {}) {
    const entry = {
      ts: new Date().toISOString(),
      runId,
      stage,
      status,
      ...details,
    };
    entries.push(/** @type {PipelineLogEntry} */ (entry));
    const payload = JSON.stringify(entry);
    if (status === "error") {
      console.error(`[${tag}]`, payload);
    } else {
      console.info(`[${tag}]`, payload);
    }
    onLog?.(/** @type {PipelineLogEntry} */ (entry));
    return entry;
  }

  return {
    log,
    getEntries: () => [...entries],
    getTotalLatency: () =>
      entries.reduce((sum, e) => sum + (Number(e.latencyMs) || 0), 0),
  };
}

export function makePipelineError(stage, code, message, details = {}) {
  return Object.assign(new Error(message), {
    name: "PipelineError",
    stage,
    code,
    details,
  });
}
