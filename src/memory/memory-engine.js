import fs from "fs"; import path from "path"; import { config } from "../core/config.js";
let memory={failures:[],successes:[],recurrentConflicts:[],recurrentNorms:[],conversations:{}};
loadMemory();
export function getConversation(sessionId="default"){if(!memory.conversations[sessionId]) memory.conversations[sessionId]={lastLegalTopic:null,lastRuntime:null,lastOutputMode:null,turns:[]}; return memory.conversations[sessionId];}
export function updateConversation(sessionId="default",patch={}){
  const conv=getConversation(sessionId);
  Object.assign(conv,patch);
  conv.turns.push({at:new Date().toISOString(),topic:patch.lastLegalTopic?.id||conv.lastLegalTopic?.id||null,mode:patch.lastOutputMode||conv.lastOutputMode||null});
  if(config.enableMemory) saveMemory();
  return conv;
}
export function recordMemory(runtime,sessionId="default"){if(!config.enableMemory||!runtime) return memory; if(runtime.status==="blocked_by_governance") memory.failures.push({reason:runtime.reason,at:new Date().toISOString()}); if(runtime.normReference) memory.recurrentNorms.push({norm:runtime.normReference,at:new Date().toISOString()}); if(runtime.status==="ready_for_legal_execution") memory.successes.push({action:runtime.concreteAction,at:new Date().toISOString()}); saveMemory(); return memory;}
export function getMemory(){return memory;}
function loadMemory(){try{if(!config.enableMemory||!fs.existsSync(config.memoryFile)) return; memory=JSON.parse(fs.readFileSync(config.memoryFile,"utf-8")); if(!memory.conversations) memory.conversations={};}catch{memory={failures:[],successes:[],recurrentConflicts:[],recurrentNorms:[],conversations:{}};}}
function saveMemory(){try{fs.mkdirSync(path.dirname(config.memoryFile),{recursive:true}); fs.writeFileSync(config.memoryFile,JSON.stringify(memory,null,2));}catch{}}
