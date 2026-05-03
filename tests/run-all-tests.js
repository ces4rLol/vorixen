import { spawnSync } from "child_process";
import path from "path";
import { pathToFileURL } from "url";
import { Worker } from "worker_threads";

const testFiles = [
  "tests/run-tests.js",
  "tests/extra-audit-tests.js",
  "tests/vnext-objective-activation-tests.js",
  "tests/vnext-1-bottleneck-tests.js",
  "tests/vnext-2-general-formula-tests.js",
  "tests/vnext-3-universal-input-concept-tests.js",
  "tests/vnext-4-professional-output-tests.js",
  "tests/vnext-5-hardening-regression-tests.js",
  "tests/vnext-6-sufficiency-output-tests.js",
  "tests/vnext-7-code-self-audit-tests.js",
  "tests/vnext-8-brutal-compatibility-tests.js",
  "tests/vnext-9-hidden-bottleneck-tests.js",
  "tests/vnext-10-ai-control-layer-tests.js",
  "tests/vnext-11-truth-proof-memory-tests.js",
  "tests/vnext-12-required-ai-monitoring-tests.js",
  "tests/auth-sqlite-tests.js",
  "tests/check-syntax.js"
];

process.env.NODE_ENV = "test";
process.env.OPENAI_API_KEY = "";
process.env.ENABLE_MEMORY = "false";

let failed = 0;
let passedSuites = 0;

for (const file of testFiles) {
  const result = await runSuite(file);

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);

  if (result.error || result.status !== 0 || result.signal) {
    failed++;
    console.error(`FAIL suite ${file}`);
    if (result.error) console.error(result.error.message || result.error);
    if (result.signal) console.error(`signal: ${result.signal}`);
    if (result.status !== null && result.status !== undefined) console.error(`exit_status: ${result.status}`);
  } else {
    passedSuites++;
    console.log(`PASS suite ${file}`);
  }
}

if (failed) {
  console.error(`FAIL run-all ${failed}/${testFiles.length}`);
  process.exit(1);
}
console.log(`PASS run-all ${passedSuites}/${testFiles.length}`);
process.exit(0);

async function runSuite(file){
  const child = spawnSync(process.execPath, [file], {
    stdio: "pipe",
    encoding: "utf8",
    env: { ...process.env, NODE_ENV: "test", OPENAI_API_KEY: "", ENABLE_MEMORY: "false" },
    timeout: 30000
  });
  if (!child.error || !String(child.error.message || "").includes("EPERM")) return child;
  return runSuiteInWorker(file);
}

function runSuiteInWorker(file){
  return new Promise((resolve)=>{
    const worker = new Worker(pathToFileURL(path.resolve(file)), {});
    let resolved = false;
    worker.on("error",(error)=>{
      if(resolved) return;
      resolved = true;
      resolve({ status: 1, signal: null, stdout: "", stderr: "", error });
    });
    worker.on("exit",(code)=>{
      if(resolved) return;
      resolved = true;
      resolve({ status: code, signal: null, stdout: "", stderr: "", error: null });
    });
  });
}
