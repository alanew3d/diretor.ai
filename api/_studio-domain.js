export class StudioError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export function uuid(value) {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) throw new StudioError(400, 'Identificador inválido.');
  return value;
}
export function text(value, max, required = false) {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) throw new StudioError(400, 'Confira os campos e seus limites.');
  return value.trim();
}
export function planning(input) {
  if (!input || input.schemaVersion !== 1 || !['product','narrative','music','microdrama'].includes(input.type) || !['9:16','16:9','1:1'].includes(input.format) || ![15,30,60].includes(input.duration) || !['own','director','mixed'].includes(input.route)) throw new StudioError(400, 'Planejamento inválido.');
  const result = {schemaVersion:1,executionEnabled:false,planningMethod:'local-template',type:input.type,format:input.format,duration:input.duration,route:input.route};
  for (const [key,max] of Object.entries({name:100,brief:3000,continuity:2000,tools:300})) result[key]=text(input[key],max,key==='name');
  if (input.budget !== null && (!Number.isFinite(input.budget) || input.budget < 0 || input.budget > 1000000)) throw new StudioError(400, 'Orçamento inválido.');
  result.budget=input.budget;
  if (!Array.isArray(input.shots) || input.shots.length>12) throw new StudioError(400, 'Planos inválidos.');
  result.shots=input.shots.map((shot,index)=>{
    if(!Number.isInteger(shot.seconds)||shot.seconds<1||shot.seconds>60||typeof shot.reviewed!=='boolean')throw new StudioError(400,'Plano inválido.');
    return {id:index+1,title:text(shot.title,160,true),action:text(shot.action,2000),camera:text(shot.camera,500),seconds:shot.seconds,reviewed:shot.reviewed};
  });
  if(result.shots.length&&result.shots.reduce((sum,s)=>sum+s.seconds,0)!==result.duration)throw new StudioError(400,'Duração dos planos inválida.');
  result.updatedAt=new Date().toISOString();
  return result;
}
export function sameOrigin(req) {
  const host=req.headers.host;
  const origin=req.headers.origin;
  if(!host||!origin)throw new StudioError(403,'Origem não autorizada.');
  let url;try{url=new URL(origin);}catch{throw new StudioError(403,'Origem não autorizada.');}
  if(url.host!==host||url.protocol!=='https:')throw new StudioError(403,'Origem não autorizada.');
  return url.origin;
}
export function cookies(req) {
  const result={};
  for(const chunk of (req.headers.cookie||'').split(';')){
    const index=chunk.indexOf('=');if(index<0)continue;
    try{result[chunk.slice(0,index).trim()]=decodeURIComponent(chunk.slice(index+1));}catch{}
  }
  return result;
}
