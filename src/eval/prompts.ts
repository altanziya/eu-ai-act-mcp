/** Versioned prompts of the eval harness. Changing the wording requires a new PROMPT_VERSION. */
import type { Arm } from "./openrouter.js";

export const PROMPT_VERSION = "eval-prompt-v2";

/** System prompt with the case's reference date as "today". Identical for all models and arms except the arm hint (web: search sentence, tools: tools hint). */
export function buildSystemPrompt(asOf: string, arm: Arm): string {
  const base =
    `Today's date is ${asOf}. You answer questions about Regulation (EU) 2024/1689 (the EU AI Act) as it stands on that date. ` +
    `Reply with one JSON object only and no other text. Keys: ` +
    `"date" (YYYY-MM-DD: the date the question asks for, for example the date from which a provision applies; null if the question does not ask for a date), ` +
    `"version" (the version of the Regulation you relied on, named by CELEX number or amending act), ` +
    `"article" (the provision you cite, for example "Article 6(2)"), ` +
    `"quote" (an exact quotation from that provision), ` +
    `"answer" (your answer in at most 120 words), ` +
    `"verdict" ("correct" or "incorrect" if the question asks you to judge whether a statement or quotation is correct; otherwise null). ` +
    `Use null for a key you cannot fill. No markdown.`;
  if (arm === "tools") return `${base} You may call the provided tools to look up the provision text, the differences between versions and to verify a quotation.`;
  // v2: Claude Code decides itself whether to search, so the web arm says it may; for OpenRouter (plugin always on) the sentence is harmless.
  if (arm === "web") return `${base} You may search the web.`;
  return base;
}

export const buildUserPrompt = (question: string): string => question;
