import { readFileSync } from "node:fs";
import { render } from "./compose.mjs";

const HERE = new URL(".", import.meta.url).pathname;
const OUT = HERE + "authored.json";
const ts = JSON.parse(readFileSync(OUT, "utf8"));
const want = process.argv[2];
for (const t of ts) {
  if (want && t.id !== want) continue;
  console.log(`\n=== ${t.id} (${t.kind}) ${t.props.length} props`);
  console.log(render(t));
}
