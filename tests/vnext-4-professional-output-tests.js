import assert from "assert";
import { runVorixen } from "../src/pipeline/vorixen-pipeline.js";

function test(name,fn){
  try{ fn(); console.log(`PASS ${name}`); }
  catch(err){ console.error(`FAIL ${name}`); console.error(err); process.exitCode=1; }
}

test("salida jurídica profesional reemplaza formato robótico básico",()=>{
  const r=runVorixen("háblame sobre el hecho generador del ICA");
  assert.equal(r.runtime.status,"ready_for_legal_execution");
  assert.ok(r.output.includes("I. PROBLEMA JURÍDICO"));
  assert.ok(r.output.includes("II. MARCO NORMATIVO APLICABLE"));
  assert.ok(r.output.includes("III. INTERPRETACIÓN TÉCNICO-JURÍDICA"));
  assert.ok(r.output.includes("IV. JURISPRUDENCIA, SENTENCIAS Y DOCTRINA OFICIAL DE SOPORTE"));
  assert.ok(r.output.includes("VI. CONCLUSIÓN JURÍDICA"));
});

test("dictamen de revisor fiscal mantiene fondo jurídico y formato profesional",()=>{
  const sessionId="vnext4-dictamen";
  runVorixen("me puedes decir cual es la base gravable del ica a partir de 2017?",{sessionId});
  const r=runVorixen("tu respuesta es muy superficial, por favor damela tipo dictamen de revisor fiscal",{sessionId});
  assert.equal(r.outputMode,"fiscal_auditor_opinion");
  assert.ok(r.output.includes("DICTAMEN TÉCNICO DE REVISOR FISCAL"));
  assert.ok(r.output.includes("MARCO NORMATIVO"));
  assert.ok(r.output.includes("SOPORTE JURISPRUDENCIAL"));
  assert.ok(r.output.includes("Ley 1819 de 2016"));
});

test("soportes no inventan radicados ni sentencias específicas",()=>{
  const r=runVorixen("dame concepto jurídico sobre base gravable del ICA desde 2017");
  assert.ok(r.output.includes("VORIXEN no inventa radicados ni fechas"));
  assert.ok(r.output.includes("Consejo de Estado"));
  assert.ok(r.output.includes("DIAN") || r.output.includes("Ministerio de Hacienda"));
});

test("salida extensa incluye regla de no desechar prueba útil",()=>{
  const r=runVorixen("háblame del artículo 745 del Estatuto Tributario aplicado a ICA");
  assert.ok(r.output.includes("Ningún elemento probatorio o normativo útil debe descartarse"));
  assert.ok(r.output.includes("Estatuto Tributario, artículo 745"));
});

test("dominio laboral también recibe soporte profesional no tributario",()=>{
  const r=runVorixen("háblame sobre primacía de la realidad en una relación laboral");
  assert.notEqual(r.runtime.status,"non_legal_passthrough");
  assert.ok(r.output.includes("I. PROBLEMA JURÍDICO"));
  assert.ok(r.output.includes("Corte Suprema de Justicia, Sala Laboral") || r.output.includes("Corte Constitucional"));
});

test("dominio penal también recibe soporte profesional no tributario",()=>{
  const r=runVorixen("explícame la tipicidad en un caso penal");
  assert.notEqual(r.runtime.status,"non_legal_passthrough");
  assert.ok(r.output.includes("Código Penal"));
  assert.ok(r.output.includes("Sala Penal") || r.output.includes("Corte Constitucional"));
});

process.exit(process.exitCode||0);
