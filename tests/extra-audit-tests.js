
import assert from "assert";
import { runVorixen } from "../src/pipeline/vorixen-pipeline.js";

function must(name, fn) {
  try { fn(); console.log("PASS extra " + name); }
  catch (e) { console.error("FAIL extra " + name); console.error(e); process.exitCode = 1; }
}

must("follow-up concepto mantiene tema hecho generador", () => {
  const sessionId = "extra-followup-1";
  runVorixen("háblame sobre el hecho generador del ICA", { sessionId });
  const r = runVorixen("amplía la respuesta como concepto jurídico", { sessionId });
  assert.equal(r.mode, "format_transform");
  assert.ok(r.output.includes("Hecho generador del ICA"));
  assert.ok(r.output.includes("CONCEPTO JURÍDICO") || r.output.includes("NORMA:"));
});

must("consulta base gravable no se vuelve caso concreto por 2017", () => {
  const r = runVorixen("cuál es la base gravable del ICA después de 2017");
  assert.equal(r.mode, "normative_query");
  assert.equal(r.runtime.status, "ready_for_legal_execution");
});

must("Arauca convierte a caso concreto", () => {
  const r = runVorixen("en Arauca cuál es la base gravable del ICA 2022");
  assert.equal(r.mode, "concrete_case");
});

must("caso concreto de hecho generador con municipio y año puede ejecutar", () => {
  const r = runVorixen("mi empresa realiza actividad comercial en Arauca periodo 2022 para ICA");
  assert.equal(r.mode, "concrete_case");
  assert.notEqual(r.runtime.status, "non_legal_passthrough");
});

must("dictamen directo con tema jurídico activa modo dictamen", () => {
  const r = runVorixen("hazme un dictamen de revisor fiscal sobre la base gravable del ICA después de 2017", { sessionId: "extra-dictamen-directo" });
  assert.equal(r.outputMode, "fiscal_auditor_opinion");
  assert.ok(r.output.includes("DICTAMEN TÉCNICO DE REVISOR FISCAL"));
});

must("no suaviza en dictamen", () => {
  const r = runVorixen("hazme un dictamen de revisor fiscal sobre la base gravable del ICA después de 2017", { sessionId: "extra-soft" });
  const out = r.output.toLowerCase();
  assert.ok(!out.includes("podría"));
  assert.ok(!out.includes("sería recomendable"));
  assert.ok(!out.includes("opción"));
});

must("tema desconocido jurídico no debe inventar norma", () => {
  const r = runVorixen("háblame sobre una figura jurídica inventada llamada tributo lunar municipal");
  assert.notEqual(r.runtime.status, "ready_for_legal_execution");
});
process.exit(process.exitCode||0);
