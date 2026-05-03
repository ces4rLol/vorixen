import path from "path";
import { fileURLToPath } from "url";
import { runCodeSelfAudit, formatCodeSelfAudit } from "../src/engines/code-self-audit-engine.js";

const __filename=fileURLToPath(import.meta.url);
const __dirname=path.dirname(__filename);
const rootDir=path.resolve(__dirname,"..");
const report=runCodeSelfAudit({rootDir,apply:false});
console.log(formatCodeSelfAudit(report));
if(report.findings.some(f=>f.severity==="critical")) process.exitCode=1;
