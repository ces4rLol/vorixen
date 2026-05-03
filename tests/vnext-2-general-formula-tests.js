import assert from "assert";
import { runVorixen } from "../src/pipeline/vorixen-pipeline.js";

function test(name,fn){try{fn();console.log(`PASS vNext.2 ${name}`);}catch(error){console.error(`FAIL vNext.2 ${name}`);console.error(error);process.exitCode=1;}}

test("ICA queda como dominio activado, no como motor base",()=>{
  const r=runVorixen("cuál es la base gravable del ICA después de 2017",{sessionId:"vnext2-ica"});
  assert.equal(r.analysis.domain.tax,"ica");
  assert.equal(r.analysis.topic.id,"ica_base_gravable_after_2017");
  assert.ok(r.analysis.domain.evidence.includes("ica"));
});

test("laboral entra como jurídico general sin usar normas ICA",()=>{
  const r=runVorixen("tengo contrato de trabajo firmado y afiliación ARL desde noviembre de 2022",{sessionId:"vnext2-labor"});
  assert.equal(r.analysis.domain.domain,"labor");
  assert.notEqual(r.runtime.status,"non_legal_passthrough");
  assert.ok(!String(r.runtime.normReference||"").includes("ICA"));
});

test("civil/comercial entra como jurídico general sin inventar red tributaria",()=>{
  const r=runVorixen("analiza incumplimiento de contrato de arrendamiento comercial",{sessionId:"vnext2-civil"});
  assert.equal(r.analysis.domain.domain,"civil");
  assert.notEqual(r.runtime.status,"non_legal_passthrough");
  assert.ok(!String(r.runtime.normReference||"").includes("Estatuto Tributario"));
});

test("administrativo general no inventa tax si no hay ancla tributaria",()=>{
  const r=runVorixen("nulidad de acto administrativo sancionatorio por falta de notificación",{sessionId:"vnext2-admin"});
  assert.equal(r.analysis.domain.domain,"administrative");
  assert.ok(!String(r.runtime.normReference||"").includes("Estatuto Tributario"));
});

test("IVA sigue reconocido como tributario no cargado sin contaminación ICA",()=>{
  const r=runVorixen("base gravable de IVA en 2024",{sessionId:"vnext2-iva"});
  assert.equal(r.analysis.domain.domain,"tax");
  assert.equal(r.analysis.domain.tax,"iva");
  assert.equal(r.runtime.status,"procedural_action_required");
  assert.ok(!String(r.runtime.normReference||"").includes("Decreto Ley 1333"));
});

test("explica no activa ICA por substring y activa artículo 745 si hay ancla legal",()=>{
  const r=runVorixen("explica el artículo 745 del Estatuto Tributario",{sessionId:"vnext2-explica"});
  assert.equal(r.analysis.domain.tax,"general");
  assert.equal(r.analysis.topic.id,"tax_doubt_favors_taxpayer");
  assert.ok(!r.analysis.providedFacts.includes("tax_ica"));
});

test("base gravable sin tributo no inventa impuesto",()=>{
  const r=runVorixen("base gravable después de 2017",{sessionId:"vnext2-ambiguous"});
  assert.equal(r.runtime.status,"procedural_action_required");
  assert.equal(r.analysis.domain.domain,"tax");
  assert.equal(r.analysis.domain.tax,"general");
  assert.ok(r.analysis.topic);
});

process.exit(process.exitCode||0);
