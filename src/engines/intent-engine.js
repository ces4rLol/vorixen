import { QueryMode } from "../core/types.js";
import { normalize } from "../utils/normalize.js";
import { findLegalTopic } from "../knowledge/legal-topic-catalog.js";
import { isFollowUpFormatRequest } from "./output-mode-engine.js";
import { detectLegalObjective, detectDomain, hasPhrase } from "./objective-engine.js";

export function classifyIntent(message,conversation){
  const text=normalize(message);
  if(isFollowUpFormatRequest(text)&&conversation?.lastLegalTopic) return QueryMode.FORMAT_TRANSFORM;
  const objective=detectLegalObjective(message);
  const domain=detectDomain(message);
  const litigation=["demanda","nulidad","restablecimiento","recurso","contestacion","alegatos","cargo juridico","pretensiones","juzgado","cpaca","liquidacion oficial"];
  const concrete=["mi empresa","mi caso","municipio de","periodo","vigencia","ano gravable","nit","declaracion","requerimiento","requerimiento de informacion","solicitud de informacion","expediente","notificacion","arauca","2021","2022","2023","2024","2025","2026","vencio","notificado","contrato firmado","afiliacion arl","despido","denuncia","audiencia","contrato de arrendamiento"];
  const generalLegal=["hecho generador","base gravable","base imponible","base grabable","bawse grabable","sujeto pasivo","tarifa","territorialidad","firmeza","caducidad","prescripcion","inspeccion tributaria","procedimiento tributario","estatuto tributario","articulo 26","art 26","renta liquida","articulo 745","745","contrato de trabajo","acto administrativo","cpaca","codigo penal","codigo civil","codigo sustantivo del trabajo","derecho fundamental","debido proceso","prorroga","ampliacion de termino","plazo para responder","solicitud de informacion"];
  if(litigation.some(s=>hasPhrase(text,s))) return QueryMode.LITIGATION;
  const topic=findLegalTopic(text, objective.id, domain);
  const hasConcrete=concrete.some(s=>hasPhrase(text,s));
  const hasGeneral=generalLegal.some(s=>hasPhrase(text,s)) || (domain.domain!=="unknown" && domain.confidence>0);
  if(hasConcrete) return QueryMode.CONCRETE_CASE;
  if(topic||hasGeneral) return QueryMode.NORMATIVE_QUERY;
  return QueryMode.NON_LEGAL;
}
