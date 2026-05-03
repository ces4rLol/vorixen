import assert from "assert";
import { runVorixen, runCodeSelfAudit } from "../src/pipeline/vorixen-pipeline.js";
import fs from "fs";

function test(name, fn) {
  try {
    fn();
    console.log(`PASS vNext.8 ${name}`);
  } catch (error) {
    console.error(`FAIL vNext.8 ${name}`);
    console.error(error);
    process.exitCode = 1;
  }
}

test("server no abre puerto al ser importado", () => {
  const serverSource = fs.readFileSync("src/server.js", "utf8");
  assert.ok(serverSource.includes("isDirectRun"));
  assert.ok(serverSource.includes("pathToFileURL"));
  assert.ok(!serverSource.includes("const server=app.listen"));
});

test("solicitud de prórroga produce documento listo para firma", () => {
  const r = runVorixen("quiero solicitar plazo de 15 dias para responder requerimiento de informacion de COMFIAR", { sessionId: "v8-prorroga", rootDir: process.cwd() });
  assert.equal(r.analysis.topic.id, "administrative_deadline_extension");
  assert.equal(r.runtime.status, "ready_for_legal_execution");
  assert.ok(r.output.includes("DOCUMENTO LISTO PARA FIRMA"));
  assert.ok(r.output.includes("SOLICITUD DE PRÓRROGA"));
  assert.ok(r.output.includes("quince (15) días hábiles"));
});

test("salida profesional no es robotica norma hecho accion", () => {
  const r = runVorixen("háblame sobre el hecho generador del ICA", { sessionId: "v8-output" });
  assert.ok(r.output.includes("PROBLEMA JURÍDICO"));
  assert.ok(r.output.includes("MARCO NORMATIVO"));
  assert.ok(r.output.includes("INTERPRETACIÓN"));
  assert.ok(r.output.includes("CONCLUSIÓN"));
});

test("auditoría de código detecta ambiente operacional", () => {
  const audit = runCodeSelfAudit({ rootDir: process.cwd(), apply: false });
  assert.ok(["codebase_operational", "codebase_review_required"].includes(audit.status));
  assert.equal(audit.compatibility.node, ">=24");
  assert.equal(audit.compatibility.server, "Express");
  assert.ok(audit.scannedFiles > 40);
});

test("producción no debe aceptar llaves inseguras de ejemplo", () => {
  const configSource = fs.readFileSync("src/core/config.js", "utf8");
  assert.ok(configSource.includes("dev_vorixen_key"));
  assert.ok(configSource.includes("CORS_ORIGIN no puede ser * en producción"));
  assert.ok(configSource.includes("VORIXEN_API_KEY seguro requerido en producción"));
});

test("npm test ejecuta run-all y no una sola suite parcial", () => {
  const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
  assert.ok(pkg.scripts.test.includes("run-all-tests.js"));
});

test("ICA no contamina laboral penal civil ni administrativo", () => {
  const cases = [
    ["despido injusto con contrato de trabajo", "labor"],
    ["denuncia penal por estafa", "criminal"],
    ["incumplimiento de contrato de arrendamiento", "civil"],
    ["acto administrativo sin notificación", "administrative"]
  ];
  for (const [message, expected] of cases) {
    const r = runVorixen(message, { sessionId: `v8-${expected}` });
    assert.equal(r.analysis.domain.domain, expected);
    assert.ok(!String(r.runtime.normReference || "").includes("Industria y Comercio"));
  }
});

process.exit(process.exitCode || 0);
