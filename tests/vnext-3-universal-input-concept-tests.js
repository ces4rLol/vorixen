import assert from "assert";
import { runVorixen } from "../src/pipeline/vorixen-pipeline.js";

function test(name,fn){try{fn();console.log(`PASS vNext.3 ${name}`);}catch(error){console.error(`FAIL vNext.3 ${name}`);console.error(error);process.exitCode=1;}}

test("entrada jurídica normativa no se bloquea por falta de caso concreto",()=>{
  const r=runVorixen("háblame sobre el hecho generador de ica",{sessionId:"vnext3-entrada"});
  assert.equal(r.mode,"normative_query");
  assert.equal(r.runtime.status,"ready_for_legal_execution");
  assert.ok(r.output.includes("Hecho generador del ICA"));
});

test("cambio de formato mantiene espacio jurídico anterior",()=>{
  const sessionId="vnext3-formato";
  runVorixen("me puedes decir cual es la base gravable del ica a partir de 2017?",{sessionId});
  const r=runVorixen("tu respuesta es muy superficial, damela tipo dictamen de revisor fiscal",{sessionId});
  assert.equal(r.mode,"format_transform");
  assert.equal(r.outputMode,"fiscal_auditor_opinion");
  assert.ok(r.output.includes("DICTAMEN TÉCNICO DE REVISOR FISCAL"));
});

test("conceptos definidos por ley se incorporan como conceptos obligatorios",()=>{
  const r=runVorixen("los conceptos definidos por la ley deben leerse literalmente como parte de la ley",{sessionId:"vnext3-concepto"});
  assert.notEqual(r.runtime.status,"non_legal_passthrough");
  assert.ok(r.output.includes("CONCEPTOS LEGALES OBLIGATORIOS"));
  assert.ok(r.output.includes("sustituyen el significado común"));
});

test("laboral entra sin activar tributario",()=>{
  const r=runVorixen("analiza relación laboral con contrato de trabajo, salario y afiliación ARL",{sessionId:"vnext3-labor"});
  assert.equal(r.analysis.domain.domain,"labor");
  assert.ok(!String(r.runtime.normReference||"").includes("Estatuto Tributario"));
  assert.ok(!String(r.runtime.normReference||"").includes("ICA"));
});

test("penal entra sin activar tributario",()=>{
  const r=runVorixen("analiza una denuncia penal por estafa y prueba insuficiente",{sessionId:"vnext3-penal"});
  assert.equal(r.analysis.domain.domain,"criminal");
  assert.ok(!String(r.runtime.normReference||"").includes("Estatuto Tributario"));
});

test("civil entra sin activar tributario",()=>{
  const r=runVorixen("analiza incumplimiento de contrato de arrendamiento comercial",{sessionId:"vnext3-civil"});
  assert.equal(r.analysis.domain.domain,"civil");
  assert.ok(!String(r.runtime.normReference||"").includes("Estatuto Tributario"));
});

process.exit(process.exitCode||0);
