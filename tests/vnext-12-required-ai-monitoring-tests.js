import assert from "assert";
import fs from "fs";
import path from "path";
import { config, validateConfig } from "../src/core/config.js";
import { runVorixenControlled } from "../src/pipeline/vorixen-pipeline.js";
import { callOpenAIChat } from "../src/ai/openai-client.js";
import { getOpenAIMetrics } from "../src/ai/openai-monitor.js";

let pass=0;
function ok(name,fn){try{fn(); pass++; console.log(`PASS ${name}`);}catch(e){console.error(`FAIL ${name}`); console.error(e); process.exit(1);}}
async function okAsync(name,fn){try{await fn(); pass++; console.log(`PASS ${name}`);}catch(e){console.error(`FAIL ${name}`); console.error(e); process.exit(1);}}

const previous={...config};
function restore(){ Object.assign(config, previous); }

ok("validateConfig blocks required AI without key",()=>{
  Object.assign(config, previous, { requireAI:true, enableAIControl:true, openaiApiKey:"" });
  assert.throws(()=>validateConfig(),/OPENAI_API_KEY requerido/);
  restore();
});

await okAsync("required AI refuses silent local fallback when key missing",async()=>{
  Object.assign(config, previous, { requireAI:true, enableAIControl:true, openaiApiKey:"" });
  await assert.rejects(()=>runVorixenControlled("base gravable del ICA 2017",{sessionId:"v12-no-key"}),/required_ai_unavailable/);
  restore();
});

await okAsync("required AI validates and uses controlled OpenAI output",async()=>{
  Object.assign(config, previous, { requireAI:true, enableAIControl:true, openaiApiKey:"sk-test-abcdefghijklmnopqrstuvwxyz", openaiMaxRetries:0 });
  const fetchImpl=async()=>({
    ok:true,
    status:200,
    json:async()=>({ model:"test-model", usage:{ total_tokens:123 }, choices:[{ message:{ content:"Ejecutar consecuencia jurídica gobernante\n\nI. PROBLEMA JURÍDICO\nDefinir la regla jurídica aplicable.\n\nII. MARCO NORMATIVO APLICABLE\nLey 1819 de 2016, artículo 342; Estatuto Tributario, artículos 28 y 21-1.\n\nIII. INTERPRETACIÓN TÉCNICO-JURÍDICA\nLa definición legal del ingreso gobierna la lectura normativa.\n\nIV. SOPORTE JURISPRUDENCIAL Y DOCTRINAL\nNo se incorporan citas no verificadas.\n\nV. APLICACIÓN AL CASO O A LA CONSULTA\nLa regla se aplica al periodo consultado.\n\nVI. CONCLUSIÓN JURÍDICA\nEjecutar la consecuencia jurídica gobernante." }}] })
  });
  const result=await runVorixenControlled("me puedes decir cual es la base gravable del ica a partir de 2017?",{sessionId:"v12-ai-ok",fetchImpl});
  assert.equal(result.aiControl.usedAI,true);
  assert(result.output.includes("PROBLEMA JURÍDICO"));
  assert(result.aiControl.usage.total_tokens===123);
  restore();
});

await okAsync("required AI rejects weak OpenAI output instead of falling back silently",async()=>{
  Object.assign(config, previous, { requireAI:true, enableAIControl:true, openaiApiKey:"sk-test-abcdefghijklmnopqrstuvwxyz", openaiMaxRetries:0 });
  const fetchImpl=async()=>({ ok:true, status:200, json:async()=>({ choices:[{ message:{ content:"podría ser recomendable revisar el caso" }}] }) });
  await assert.rejects(()=>runVorixenControlled("hazme un dictamen jurídico",{sessionId:"v12-ai-reject",fetchImpl}),/required_ai_rejected_by_vorixen/);
  restore();
});

await okAsync("OpenAI client retries retryable failures and then succeeds",async()=>{
  Object.assign(config, previous, { openaiApiKey:"sk-test-abcdefghijklmnopqrstuvwxyz", openaiMaxRetries:2, openaiTimeoutMs:5000 });
  let calls=0;
  const fetchImpl=async()=>{
    calls++;
    if(calls<2) return { ok:false, status:500, json:async()=>({ error:{ message:"server" } }) };
    return { ok:true, status:200, json:async()=>({ choices:[{ message:{ content:"ok" }}], usage:{ total_tokens:1 } }) };
  };
  const result=await callOpenAIChat({ messages:[{role:"user",content:"x"}], fetchImpl });
  assert.equal(result.ok,true);
  assert.equal(calls,2);
  assert.equal(result.attempts,2);
  restore();
});

ok("OpenAI metrics expose configured requireAI and model without secrets",()=>{
  Object.assign(config, previous, { requireAI:true, openaiApiKey:"sk-test-abcdefghijklmnopqrstuvwxyz", openaiModel:"gpt-test" });
  const metrics=getOpenAIMetrics();
  assert.equal(metrics.requireAI,true);
  assert.equal(metrics.configured,true);
  assert.equal(metrics.model,"gpt-test");
  assert(!JSON.stringify(metrics).includes("sk-test"));
  restore();
});

await okAsync("OpenAI errors are written to configured log",async()=>{
  const logFile=path.resolve("./logs/test_openai_errors.log");
  fs.rmSync(logFile,{force:true});
  Object.assign(config, previous, { openaiApiKey:"sk-test-abcdefghijklmnopqrstuvwxyz", openaiMaxRetries:0, openaiLogFile:logFile });
  const fetchImpl=async()=>({ ok:false, status:429, json:async()=>({ error:{ message:"rate" } }) });
  const result=await callOpenAIChat({ messages:[{role:"user",content:"x"}], fetchImpl });
  assert.equal(result.ok,false);
  const raw=fs.readFileSync(logFile,"utf-8");
  assert(raw.includes("openai_http_error"));
  assert(!raw.includes("sk-test"));
  restore();
});

console.log(`PASS vnext-12-required-ai-monitoring-tests ${pass}/7`);
