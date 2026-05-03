// VORIXEN vNext 11
// Case Memory Engine
// Purpose: provide case continuity without allowing memory to override current legal truth.

export function buildCaseMemoryState(conversation = {}, runtime = {}, analysis = {}) {
  const turns = Array.isArray(conversation.turns) ? conversation.turns.slice(-10) : [];
  const priorTopic = conversation.lastLegalTopic || null;
  const continuitySignals = [];
  if (priorTopic?.id && analysis.topic?.id && priorTopic.id === analysis.topic.id) continuitySignals.push("same_topic_continuity");
  if (conversation.lastRuntime?.status === "procedural_action_required") continuitySignals.push("prior_procedural_action_pending");
  if (conversation.lastOutputMode && conversation.lastOutputMode === runtime.outputMode) continuitySignals.push("same_output_mode");

  return {
    version: "vNext11_case_memory",
    priorTopic: priorTopic ? { id: priorTopic.id, label: priorTopic.label } : null,
    lastStatus: conversation.lastRuntime?.status || null,
    continuitySignals,
    recentTurns: turns.map(t => ({ at: t.at, topic: t.topic, mode: t.mode })),
    memoryRule: "La memoria orienta continuidad, pero no reemplaza norma vigente, prueba suficiente ni hecho activador del presente."
  };
}

export function applyCaseMemory(runtime, analysis = {}, conversation = {}) {
  const caseMemory = buildCaseMemoryState(conversation, runtime, analysis);
  return { ...runtime, caseMemory };
}
