/**
 * Supabase query translation for dbClient — filter operators, sort, pagination.
 * Maps Base44-style filter objects to PostgREST / supabase-js chain methods.
 */

/** RFC-4122 v4 UUID — shared by dbClient writes and Supabase create paths */
export function generateUUID() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const OPERATOR_SUFFIX_RE =
  /_(eq|neq|gt|gte|lt|lte|like|ilike|in|contains)$/;

const OPERATOR_ALIASES = {
  eq: "eq",
  neq: "neq",
  gt: "gt",
  gte: "gte",
  lt: "lt",
  lte: "lte",
  like: "like",
  ilike: "ilike",
  in: "in",
  contains: "contains",
};

/**
 * @param {string} sort Base44 sort string, e.g. "-created_date" or "proposed_time"
 * @returns {{ column: string, ascending: boolean }}
 */
export function parseSort(sort = "-created_date") {
  if (!sort || typeof sort !== "string") {
    return { column: "created_date", ascending: false };
  }
  if (sort.startsWith("+")) {
    return { column: sort.slice(1), ascending: true };
  }
  const ascending = !sort.startsWith("-");
  const column = ascending ? sort : sort.slice(1);
  return { column, ascending };
}

/**
 * Resolve limit/offset from list/filter positional args and optional page object.
 * @param {number} defaultLimit
 * @param {number|{ limit?: number, offset?: number, page?: number }|undefined} third
 * @returns {{ limit: number, offset: number }}
 */
export function resolvePagination(defaultLimit, third) {
  if (third == null) {
    return { limit: defaultLimit, offset: 0 };
  }
  if (typeof third === "number") {
    return { limit: defaultLimit, offset: Math.max(0, third) };
  }
  if (typeof third === "object") {
    const limit = third.limit ?? defaultLimit;
    if (third.page != null) {
      const page = Math.max(1, Number(third.page) || 1);
      return { limit, offset: (page - 1) * limit };
    }
    return { limit, offset: Math.max(0, Number(third.offset) || 0) };
  }
  return { limit: defaultLimit, offset: 0 };
}

function parseOperatorKey(key) {
  const match = key.match(OPERATOR_SUFFIX_RE);
  if (!match) return null;
  return {
    column: key.slice(0, -(match[1].length + 1)),
    operator: match[1],
  };
}

function normalizeOperatorObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const keys = Object.keys(value);
  if (keys.length !== 1) return null;
  const raw = keys[0].replace(/^\$/, "");
  const operator = OPERATOR_ALIASES[raw];
  if (!operator) return null;
  return { operator, operand: value[keys[0]] };
}

/**
 * Apply a single filter clause to a supabase query builder.
 * @param {import('@supabase/supabase-js').PostgrestFilterBuilder} query
 */
function applyClause(query, column, operator, operand) {
  /** @type {any} */
  const q = query;
  switch (operator) {
    case "eq":
      return q.eq(column, operand);
    case "neq":
      return q.neq(column, operand);
    case "gt":
      return q.gt(column, operand);
    case "gte":
      return q.gte(column, operand);
    case "lt":
      return q.lt(column, operand);
    case "lte":
      return q.lte(column, operand);
    case "like":
      return q.like(column, operand);
    case "ilike":
      return q.ilike(column, operand);
    case "in":
      return q.in(column, Array.isArray(operand) ? operand : [operand]);
    case "contains":
      if (typeof operand === "string") {
        return q.ilike(column, `%${operand}%`);
      }
      return q.contains(column, operand);
    default:
      return q.eq(column, operand);
  }
}

/**
 * Apply Base44-style filter object to a supabase query builder.
 * Supports: eq (default), neq, gt, gte, lt, lte, like, ilike, in, contains
 * via suffix keys (field_gt), $operator objects ({ field: { $gt: n } }), or arrays (in).
 *
 * @param {import('@supabase/supabase-js').PostgrestFilterBuilder} query
 * @param {Record<string, unknown>|null|undefined} filters
 */
export function applyFilters(query, filters) {
  if (!filters || typeof filters !== "object") return query;

  let result = query;
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined) continue;

    const suffix = parseOperatorKey(key);
    if (suffix) {
      result = applyClause(result, suffix.column, suffix.operator, value);
      continue;
    }

    const opObj = normalizeOperatorObject(value);
    if (opObj) {
      result = applyClause(result, key, opObj.operator, opObj.operand);
      continue;
    }

    if (Array.isArray(value)) {
      result = result.in(key, value);
      continue;
    }

    result = result.eq(key, value);
  }
  return result;
}

/**
 * Apply sort + pagination to a select query.
 */
export function applySortAndLimit(query, sort, limit, offset = 0) {
  const { column, ascending } = parseSort(sort);
  let result = query.order(column, { ascending });
  if (limit != null && limit > 0) {
    if (offset > 0) {
      result = result.range(offset, offset + limit - 1);
    } else {
      result = result.limit(limit);
    }
  }
  return result;
}

/**
 * Throw a readable error from a Supabase response.
 */
export function assertNoError(error, context) {
  if (error) {
    throw new Error(`[dbClient] ${context}: ${error.message}`);
  }
}
