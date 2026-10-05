/** Extracts the structured answer a model gives (first JSON object in its text). */

export interface ModelAnswer {
  date?: string | null;
  version?: string | null;
  article?: string | null;
  quote?: string | null;
  answer?: string | null;
  verdict?: string | null;
}

const FIELDS = ["date", "version", "article", "quote", "answer", "verdict"] as const;

/** Text of the first balanced `{...}` starting at the first "{" (string literals respected); null if it never closes. */
function firstObjectText(text: string): string | null {
  const start = text.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i] as string;
    if (inString) {
      if (ch === "\\") i++;
      else if (ch === '"') inString = false;
    } else if (ch === '"') inString = true;
    else if (ch === "{") depth++;
    else if (ch === "}" && --depth === 0) return text.slice(start, i + 1);
  }
  return null;
}

/** Parses the first JSON object in `text` (also inside ```json fences). No object or invalid JSON: null. */
export function parseAnswer(text: string): ModelAnswer | null {
  const fence = /```(?:json)?[ \t]*\r?\n?([\s\S]*?)```/i.exec(text);
  const source = fence && fence[1]?.includes("{") ? fence[1] : text;
  const raw = firstObjectText(source);
  if (raw === null) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const obj = value as Record<string, unknown>;
  const out: ModelAnswer = {};
  for (const f of FIELDS) {
    const v = obj[f];
    if (typeof v === "string") out[f] = v;
    else if (typeof v === "number" || typeof v === "boolean") out[f] = String(v);
    else if (v === null) out[f] = null;
  }
  return out;
}
