import fs from "fs";

const files=[
 "src/knowledge/legal-topic-catalog.js",
 "src/engines/objective-engine.js",
 "src/engines/temporal-validity-engine.js",
 "src/engines/normative-activation-engine.js",
 "src/engines/analysis-engine.js",
 "src/engines/legal-concept-engine.js",
 "src/engines/comprehension-engine.js",
 "src/engines/decision-engine.js",
 "src/engines/intent-engine.js",
 "src/engines/output-mode-engine.js",
 "src/engines/response-engine.js",
 "src/engines/legal-support-engine.js",
 "src/engines/legal-output-sufficiency-engine.js",
 "src/engines/code-self-audit-engine.js",
 "src/engines/truth-anchor-engine.js",
 "src/engines/proof-sufficiency-engine.js",
 "src/engines/case-memory-engine.js",
 "src/engines/strategic-governor-engine.js",
 "src/ai/ai-request-contract-engine.js",
 "src/ai/ai-response-validator-engine.js",
 "src/ai/openai-client.js",
 "src/ai/ai-control-layer.js",
 "src/core/auth-store.js",
 "src/core/auth.js",
 "src/core/config.js",
 "src/governance/governor.js",
 "src/governance/execution-precision.js",
 "src/governance/legal-speech-lock.js",
 "src/pipeline/vorixen-pipeline.js",
 "src/server.js",
 "scripts/check_production_env.js",
 "scripts/run-node-env.js",
 "scripts/self_audit.js",
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
 "tests/run-all-tests.js"
];

let failed=0;
for(const file of files){
  const text=fs.existsSync(file)?fs.readFileSync(file,"utf8"):"";
  if(!text.trim()){ console.error(`FAIL syntax ${file}: empty_or_missing`); failed++; continue; }
  if(file!=="src/engines/code-self-audit-engine.js" && (text.includes("<<<<<<<")||text.includes(">>>>>>>")||text.includes("======="))){ console.error(`FAIL syntax ${file}: merge_conflict_marker`); failed++; continue; }
  if(!/\b(import|export|const|function|class)\b/.test(text)){ console.error(`FAIL syntax ${file}: no_js_construct_detected`); failed++; continue; }
  if((text.match(/\{/g)||[]).length !== (text.match(/\}/g)||[]).length){ console.error(`FAIL syntax ${file}: brace_mismatch`); failed++; continue; }
  if((text.match(/\(/g)||[]).length !== (text.match(/\)/g)||[]).length){ console.error(`FAIL syntax ${file}: paren_mismatch`); failed++; continue; }
  console.log(`PASS syntax ${file}`);
}
if(failed){ console.error(`FAIL syntax ${failed}/${files.length}`); process.exit(1); }
console.log(`PASS syntax total ${files.length}/${files.length}`);
process.exit(0);
