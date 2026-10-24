import { createClient } from '@supabase/supabase-js';
import { studioConfig } from './_studio-config.js';
import { StudioError, uuid, text, planning, sameOrigin, cookies } from './_studio-domain.js';

const names={access:'__Host-studio_access',refresh:'__Host-studio_refresh',verifier:'__Host-studio_pkce'};
const options={persistSession:false,autoRefreshToken:false,detectSessionInUrl:false,experimental:{appendPkceFlowIdToRedirects:false}};
function writeCookie(res,name,value,age){
  const list=res.getHeader('Set-Cookie')||[];
  res.setHeader('Set-Cookie',[...(Array.isArray(list)?list:[list]),`${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${age}; HttpOnly; Secure; SameSite=Lax`]);
}
function sessionCookies(res,session){
  writeCookie(res,names.access,session.access_token,session.expires_in||3600);
  writeCookie(res,names.refresh,session.refresh_token,60*60*24*30);
}
function clearSession(res){for(const name of Object.values(names))writeCookie(res,name,'',0);}
function authClient(){return createClient(studioConfig.url,studioConfig.key,{auth:options});}
async function identity(req,res){
  const jar=cookies(req);let token=jar[names.access];let user;
  if(token){const result=await authClient().auth.getUser(token);if(!result.error)user=result.data.user;}
  if(!user&&jar[names.refresh]){
    const result=await authClient().auth.refreshSession({refresh_token:jar[names.refresh]});
    if(!result.error&&result.data.session){sessionCookies(res,result.data.session);token=result.data.session.access_token;user=result.data.user;}
  }
  if(!user)return null;
  const db=createClient(studioConfig.url,studioConfig.key,{auth:options,global:{headers:{Authorization:`Bearer ${token}`}}});
  return {user,token,db};
}
function dbError(error){
  if(!error)return;
  if(['42P01','PGRST205'].includes(error.code))throw new StudioError(503,'O banco do Studio ainda não está disponível.');
  throw new StudioError(503,'Não foi possível acessar seus dados. Tente novamente.');
}
export function createStudioHandler({identify=identity,client=authClient}={}){
  return async function handler(req,res){
    res.setHeader('Cache-Control','private, no-store');
    res.setHeader('Vary','Cookie');
    res.setHeader('Referrer-Policy','no-referrer');
    res.setHeader('X-Content-Type-Options','nosniff');
    try{
      if(!['GET','POST','PATCH'].includes(req.method))throw new StudioError(405,'Método não permitido.');
      const action=typeof req.query?.action==='string'?req.query.action:'session';
      const body=req.body||{};
      if(req.method!=='GET')sameOrigin(req);
      if(Buffer.byteLength(JSON.stringify(body))>48000)throw new StudioError(413,'O conteúdo excedeu o limite.');
      if(action==='signin'&&req.method==='POST'){
        const email=text(body.email,254,true);
        if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new StudioError(400,'Informe um e-mail válido.');
        const jar=cookies(req);
        const storage={
          getItem:key=>key==='studio-login-code-verifier'?jar[names.verifier]||null:null,
          setItem:(key,value)=>{if(key==='studio-login-code-verifier')writeCookie(res,names.verifier,value,600);},
          removeItem:key=>{if(key==='studio-login-code-verifier')writeCookie(res,names.verifier,'',0);},
        };
        const auth=createClient(studioConfig.url,studioConfig.key,{auth:{...options,persistSession:true,flowType:'pkce',storageKey:'studio-login',storage}});
        const {error}=await auth.auth.signInWithOtp({email,options:{shouldCreateUser:true,emailRedirectTo:`${sameOrigin(req)}/studio/studio.html?view=cloud`}});
        if(error)throw new StudioError(error.status===429?429:503,error.status===429?'Aguarde antes de pedir outro link.':'Não foi possível enviar o link. Confira o e-mail e tente novamente.');
        return res.status(200).json({sent:true});
      }
      if(action==='callback'&&req.method==='POST'){
        const jar=cookies(req);
        if(!jar[names.verifier])throw new StudioError(401,'Abra o link no mesmo navegador em que pediu o acesso.');
        const code=text(body.code,2048,true);
        const storage={getItem:key=>key==='studio-login-code-verifier'?jar[names.verifier]:null,setItem:()=>{},removeItem:()=>{}};
        const auth=createClient(studioConfig.url,studioConfig.key,{auth:{...options,persistSession:true,flowType:'pkce',storageKey:'studio-login',storage}});
        const {data,error}=await auth.auth.exchangeCodeForSession(code);
        writeCookie(res,names.verifier,'',0);
        if(error||!data.session||!data.user)throw new StudioError(401,'O link expirou ou já foi utilizado. Peça outro.');
        sessionCookies(res,data.session);
        return res.status(200).json({user:{id:data.user.id,email:data.user.email}});
      }
      const account=await identify(req,res);
      if(action==='session'&&req.method==='GET')return res.status(200).json({user:account?{id:account.user.id,email:account.user.email}:null});
      if(action==='signout'&&req.method==='POST'){
        clearSession(res);
        if(account){try{const auth=client();await auth.auth.setSession({access_token:account.token,refresh_token:cookies(req)[names.refresh]||''});await auth.auth.signOut({scope:'local'});}catch{}}
        return res.status(200).json({signedOut:true});
      }
      if(!account)throw new StudioError(401,'Entre na sua conta para continuar.');
      const {db,user}=account;
      if(action==='projects'&&req.method==='GET'){
        const {data,error}=await db.from('studio_projects').select('id,name,kind,revision,created_at,updated_at').eq('owner_id',user.id).order('updated_at',{ascending:false}).limit(100);
        dbError(error);return res.status(200).json({projects:data});
      }
      if(action==='projects'&&req.method==='POST'){
        const payload=planning(body.planning);const id=uuid(body.id);
        const {data,error}=await db.from('studio_projects').insert({id,owner_id:user.id,name:payload.name,kind:payload.type,planning:payload}).select('id,name,kind,planning,revision,updated_at').single();
        if(error?.code==='23505'){
          const prior=await db.from('studio_projects').select('id,name,kind,planning,revision,updated_at').eq('id',id).eq('owner_id',user.id).maybeSingle();dbError(prior.error);
          const comparable=value=>JSON.stringify({...planning(value),updatedAt:null});
          if(prior.data&&comparable(prior.data.planning)===comparable(payload))return res.status(200).json({project:prior.data});
          throw new StudioError(409,'Esse projeto já foi criado. Atualize a lista.');
        }
        dbError(error);return res.status(201).json({project:data});
      }
      const id=uuid(req.query?.id);
      if(action==='project'&&req.method==='GET'){
        const {data,error}=await db.from('studio_projects').select('id,name,kind,planning,revision,updated_at').eq('owner_id',user.id).eq('id',id).maybeSingle();
        dbError(error);if(!data)throw new StudioError(404,'Projeto não encontrado.');
        return res.status(200).json({project:data});
      }
      if(action==='project'&&req.method==='PATCH'){
        if(!Number.isInteger(body.revision)||body.revision<1)throw new StudioError(400,'Versão inválida.');
        const payload=planning(body.planning);
        const {data,error}=await db.from('studio_projects').update({name:payload.name,kind:payload.type,planning:payload}).eq('owner_id',user.id).eq('id',id).eq('revision',body.revision).select('id,name,kind,planning,revision,updated_at').maybeSingle();
        dbError(error);if(!data)throw new StudioError(409,'O projeto mudou em outra sessão. Reabra a versão salva antes de atualizar.');
        return res.status(200).json({project:data});
      }
      if(action==='messages'&&['GET','POST'].includes(req.method)){
        const {data:parent,error:parentError}=await db.from('studio_projects').select('id').eq('id',id).eq('owner_id',user.id).maybeSingle();
        dbError(parentError);if(!parent)throw new StudioError(404,'Projeto não encontrado.');
        if(req.method==='GET'){
          const before=req.query?.before;let query=db.from('studio_messages').select('id,body,kind,created_at').eq('owner_id',user.id).eq('project_id',id).order('created_at',{ascending:false}).order('id',{ascending:false}).limit(50);
          if(before){if(typeof before!=='string'||!/^\d{4}-\d\d-\d\dT[\d:.]+Z$/.test(before))throw new StudioError(400,'Data inválida.');query=query.lt('created_at',before);}
          const {data,error}=await query;dbError(error);return res.status(200).json({messages:data.reverse(),hasMore:data.length===50});
        }
        const message={id:uuid(body.id),project_id:id,owner_id:user.id,kind:'note',body:text(body.text,6000,true)};
        const {data,error}=await db.from('studio_messages').insert(message).select('id,body,kind,created_at').single();
        if(error?.code==='23505'){
          const result=await db.from('studio_messages').select('id,body,kind,created_at').eq('id',message.id).eq('owner_id',user.id).eq('project_id',id).maybeSingle();dbError(result.error);
          if(!result.data||result.data.body!==message.body)throw new StudioError(409,'Identificador de mensagem já utilizado.');
          return res.status(200).json({message:result.data});
        }
        dbError(error);return res.status(201).json({message:data});
      }
      throw new StudioError(404,'Ação não encontrada.');
    }catch(error){
      if(!error.status)console.error('Studio request failed',error.name);
      return res.status(error.status||503).json({error:error.status?error.message:'O Studio não conseguiu concluir a solicitação. Tente novamente.'});
    }
  };
}
export default createStudioHandler();
