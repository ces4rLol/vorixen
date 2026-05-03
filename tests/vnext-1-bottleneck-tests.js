import assert from "assert";
import { runVorixen } from "../src/pipeline/vorixen-pipeline.js";

function test(name,fn){try{fn();console.log(`PASS vNext.1 ${name}`);}catch(error){console.error(`FAIL vNext.1 ${name}`);console.error(error);process.exitCode=1;}}

test("explica no activa ICA por contener 'ica' dentro de la palabra",()=>{
  const r=runVorixen("explica articulo 745 del estatuto tributario",{sessionId:"vnext1-745"});
  assert.equal(r.analysis.domain.tax,"general");
  assert.equal(r.analysis.topic.id,"tax_doubt_favors_taxpayer");
  assert.ok(!r.analysis.providedFacts.includes("tax_ica"));
});

test("renta 2016 no cae en base ICA anterior a 2017",()=>{
  const r=runVorixen("cual es la base gravable de renta en 2016",{sessionId:"vnext1-renta2016"});
  assert.equal(r.analysis.domain.tax,"renta");
  assert.equal(r.analysis.topic.id,"income_tax_net_taxable_income");
  assert.ok(r.runtime.normReference.includes("Estatuto Tributario, artículo 26"));
  assert.ok(!r.runtime.normReference.includes("Decreto Ley 1333"));
});

test("IVA no usa indebidamente red ICA",()=>{
  const r=runVorixen("base gravable de IVA",{sessionId:"vnext1-iva"});
  assert.equal(r.analysis.domain.tax,"iva");
  assert.equal(r.runtime.status,"procedural_action_required");
  assert.ok(!String(r.runtime.normReference||"").includes("Decreto Ley 1333"));
});

test("retefuente no usa indebidamente red ICA",()=>{
  const r=runVorixen("base gravable de retefuente",{sessionId:"vnext1-rete"});
  assert.equal(r.analysis.domain.tax,"retencion_fuente");
  assert.equal(r.runtime.status,"procedural_action_required");
});

test("consulta no jurídica con 'que es' no se vuelve jurídica",()=>{
  const r=runVorixen("que es el amor",{sessionId:"vnext1-nonlegal"});
  assert.equal(r.mode,"non_legal");
  assert.equal(r.runtime.status,"non_legal_passthrough");
});

test("ingresos genéricos no activan ICA sin dominio",()=>{
  const r=runVorixen("que son ingresos",{sessionId:"vnext1-income-generic"});
  assert.equal(r.runtime.status,"non_legal_passthrough");
});

test("base gravable sin impuesto no inventa ICA",()=>{
  const r=runVorixen("base gravable despues de 2017",{sessionId:"vnext1-base-ambiguous"});
  assert.equal(r.runtime.status,"procedural_action_required");
  assert.equal(r.analysis.domain.tax,"general");
  assert.ok(!String(r.runtime.normReference||"").includes("Decreto Ley 1333"));
});

process.exit(process.exitCode||0);
