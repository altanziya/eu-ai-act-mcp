/**
 * npm run record -- --quote "..." --ref art_5.par_1.a --as-of 2026-09-01 --lang en --release <id> [--question ...] [--creator ...]
 * Prints the evidence record (JSON) and the verify link. `created_at` is the local time of this CLI call.
 */
import { join } from "node:path";
import { parseArgs } from "node:util";
import { REPO_ROOT } from "../src/config.js";
import { isLang } from "../src/tools/corpus.js";
import { createRecord, encodeRecordForUrl } from "../src/record/record.js";
import { loadRelease } from "../src/release/context.js";

const { values } = parseArgs({
  options: {
    quote: { type: "string" },
    ref: { type: "string" },
    "as-of": { type: "string" },
    lang: { type: "string", default: "en" },
    release: { type: "string" },
    question: { type: "string" },
    creator: { type: "string" },
    "created-at": { type: "string" },
  },
  strict: true,
});
const lang = values.lang;
if (!values.quote || !values["as-of"] || !values.release || !isLang(lang)) {
  console.error('usage: npm run record -- --quote "..." [--ref art_5.par_1.a] --as-of YYYY-MM-DD --lang en|de --release <id> [--question ...] [--creator ...]');
  process.exit(2);
}
const ctx = loadRelease(join(REPO_ROOT, "release", values.release));
const record = createRecord(
  {
    quote: values.quote,
    as_of: values["as-of"],
    lang,
    release_id: values.release,
    created_at: values["created-at"] ?? new Date().toISOString(),
    ...(values.ref !== undefined ? { claimed_ref: values.ref } : {}),
    ...(values.question !== undefined ? { question: values.question } : {}),
    ...(values.creator !== undefined ? { creator: values.creator } : {}),
  },
  ctx,
);
console.log(JSON.stringify(record, null, 2));
const frag = encodeRecordForUrl(record);
console.log(`\nverify link (after npm run build:site && npm run site:serve):\nhttp://localhost:8787/verify/#${frag}`);
console.log(`\nfile form: site/verify/index.html#${frag}  (fetch needs the local server, not file://)`);
