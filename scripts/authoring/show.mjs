import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { render } from "./compose.mjs";

const here = fileURLToPath(new URL(".", import.meta.url));
const out = join(here, "authored.json");
const shipped = join(here, "../../src/content/templates.json");
const read = path => JSON.parse(readFileSync(path, "utf8"));
const drafts = existsSync(out) ? read(out) : [];
const ts = [...new Map([...read(shipped), ...drafts].map(t => [t.id, t])).values()];
const want = process.argv[2];
for (const t of ts) {
  if (want && t.id !== want) continue;
  console.log(`\n=== ${t.id} (${t.kind}) ${t.props.length} props`);
  console.log(render(t));
}
