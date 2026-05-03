import path from "path";
import { pathToFileURL } from "url";

const [, , nodeEnv, entry] = process.argv;

if (!nodeEnv || !entry) {
  console.error("usage: node scripts/run-node-env.js <NODE_ENV> <entry.js>");
  process.exit(1);
}

process.env.NODE_ENV = nodeEnv;
if (nodeEnv === "test") {
  process.env.ENABLE_MEMORY = "false";
  process.env.OPENAI_API_KEY = "";
}
await import(pathToFileURL(path.resolve(entry)).href);
