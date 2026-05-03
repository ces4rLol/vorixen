import { OutputMode } from "../core/types.js";
import { normalize } from "../utils/normalize.js";
export function detectOutputMode(message,conversation){
  const text=normalize(message);
  if(text.includes("dictamen")||text.includes("revisor fiscal")||text.includes("certificacion contable")) return OutputMode.FISCAL_AUDITOR_OPINION;
  if(text.includes("concepto juridico")||text.includes("concepto legal")||text.includes("explicame")||text.includes("hablame")) return OutputMode.LEGAL_CONCEPT;
  if(text.includes("cargo juridico")||text.includes("cargo de nulidad")) return OutputMode.LEGAL_CHARGE;
  if(text.includes("lista para presentar")||text.includes("documento listo")||text.includes("radicar")||text.includes("solicitar prorroga")||text.includes("solicitar plazo")||text.includes("plazo de 15 dias")||text.includes("ampliacion de termino")||text.includes("prorroga de 15 dias")) return OutputMode.READY_TO_FILE;
  if(isFollowUpFormatRequest(text)&&conversation?.lastOutputMode) return conversation.lastOutputMode;
  return OutputMode.STRUCTURED;
}
export function isFollowUpFormatRequest(text){return ["tu respuesta","respuesta","muy superficial","amplia","ampliar","profundiza","mas completo","tipo dictamen","corrige","mejorala","hazla","damela","damelo"].some(s=>text.includes(normalize(s)));}
