import assert from "assert";
import path from "path";
import { fileURLToPath } from "url";
import { runVorixen, runCodeSelfAudit } from "../src/pipeline/vorixen-pipeline.js";
import { isCodeSelfAuditRequest, formatCodeSelfAudit } from "../src/engines/code-self-audit-engine.js";

const __filename=fileURLToPath(import.meta.url);
const __dirname=path.dirname(__filename);
const rootDir=path.resolve(__dirname,"..");

function test(name,fn){
  try{ fn(); console.log(`PASS ${name}`); }
  catch(error){ console.error(`FAIL ${name}`); console.error(error); process.exitCode=1; }
}

test("detecta solicitud de autoauditoría de código",()=>{
  assert.equal(isCodeSelfAuditRequest("audita y mejora tu propio codigo"),true);
  assert.equal(isCodeSelfAuditRequest("hablame del hecho generador del ICA"),false);
});

test("ejecuta autoauditoría sin escribir por defecto",()=>{
  const report=runCodeSelfAudit({rootDir});
  assert.equal(report.engine,"CODE_SELF_AUDIT_ENGINE");
  assert.ok(report.scannedFiles>10);
  assert.equal(report.compatibility.safeSelfModification,"disabled_by_default");
  assert.ok(report.score>=80);
});

test("la respuesta de chat activa motor de código sin contaminar jurídico",()=>{
  const result=runVorixen("revisa muchas veces tu codigo, busca cuellos de botella y compatibilidad",{rootDir,sessionId:"code-audit-test"});
  assert.equal(result.mode,"code_self_audit");
  assert.equal(result.runtime.engine,"CODE_SELF_AUDIT_ENGINE");
  assert.ok(result.output.includes("AUTOAUDITORÍA DE CÓDIGO VORIXEN"));
  assert.ok(result.output.includes("REGLA SOBERANA DE AUTO-MEJORA"));
});

test("formato de auditoría contiene ambiente y conclusión",()=>{
  const report=runCodeSelfAudit({rootDir});
  const output=formatCodeSelfAudit(report);
  assert.ok(output.includes("Node.js >=24"));
  assert.ok(output.includes("POST /chat"));
  assert.ok(output.includes("CONCLUSIÓN"));
});

test("la auditoría conserva pipeline jurídico existente",()=>{
  const result=runVorixen("me puedes decir cual es la base gravable del ica a partir de 2017?",{rootDir,sessionId:"legal-after-audit"});
  assert.notEqual(result.mode,"code_self_audit");
  assert.ok(result.output.includes("MARCO NORMATIVO"));
  assert.ok(result.output.includes("Ley 1819 de 2016"));
});

process.exit(process.exitCode||0);
