import test from 'node:test';
import assert from 'node:assert/strict';
import { createStudioHandler } from '../api/studio.js';
import { planning, sameOrigin } from '../api/_studio-domain.js';

const user='a1100000-0000-4000-8000-000000000001';
const id='b1100000-0000-4000-8000-000000000001';
const valid={schemaVersion:1,name:'Filme',type:'product',format:'9:16',duration:30,brief:'Uma ideia',continuity:'',tools:'',budget:null,route:'own',shots:[]};
function response(){return {headers:{},statusCode:200,setHeader(k,v){this.headers[k]=v;},getHeader(k){return this.headers[k];},status(n){this.statusCode=n;return this;},json(data){this.body=data;return this;}};}
function request(action,method='GET',body={},extra={}){return {method,query:{action,id,...extra},body,headers:{host:'studio.diretor.ai',origin:'https://studio.diretor.ai'}};}
function database(result){const calls=[];const db={from(table){calls.push(['from',table]);const chain={then(resolve){return Promise.resolve(result).then(resolve);}};for(const method of ['select','eq','lt','order','limit','insert','update','single','maybeSingle'])chain[method]=(...args)=>{calls.push([method,...args]);return chain;};return chain;}};return {db,calls};}
test('Cloud planning strips execution flags and unknown input fields',()=>{
 const value=planning({...valid,executionEnabled:true,owner_id:'attacker',secret:'no'});
 assert.equal(value.executionEnabled,false);assert.equal(value.owner_id,undefined);assert.equal(value.secret,undefined);
 assert.throws(()=>planning({...valid,shots:[{seconds:5,reviewed:false,title:'A',action:'',camera:''}]}));
});
test('Mutations require an exact HTTPS origin',()=>{
 assert.throws(()=>sameOrigin({headers:{host:'studio.diretor.ai',origin:'https://evil.example'}}));
 assert.throws(()=>sameOrigin({headers:{host:'studio.diretor.ai'}}));
 assert.throws(()=>sameOrigin({headers:{host:'studio.diretor.ai',origin:'http://studio.diretor.ai'}}));
});
test('Unauthenticated users cannot read projects',async()=>{
 const res=response();await createStudioHandler({identify:async()=>null})(request('projects'),res);
 assert.equal(res.statusCode,401);assert.match(res.headers['Cache-Control'],/no-store/);
});
test('Owner comes from verified session, never request payload',async()=>{
 const {db,calls}=database({data:{id},error:null});const res=response();
 await createStudioHandler({identify:async()=>({user:{id:user},db})})(request('projects','POST',{id,planning:valid,owner_id:'attacker'}),res);
 assert.equal(res.statusCode,201);assert.equal(calls.find(c=>c[0]==='insert')[1].owner_id,user);
});
test('Lists always constrain owner before returning data',async()=>{
 const {db,calls}=database({data:[],error:null});const res=response();
 await createStudioHandler({identify:async()=>({user:{id:user},db})})(request('projects'),res);
 assert.equal(res.statusCode,200);assert.ok(calls.some(c=>c[0]==='eq'&&c[1]==='owner_id'&&c[2]===user));
});
test('Concurrent project edits return conflict instead of overwriting',async()=>{
 const {db,calls}=database({data:null,error:null});const res=response();
 await createStudioHandler({identify:async()=>({user:{id:user},db})})(request('project','PATCH',{planning:valid,revision:2}),res);
 assert.equal(res.statusCode,409);assert.ok(calls.some(c=>c[0]==='eq'&&c[1]==='revision'&&c[2]===2));
});
test('Messages cannot be inserted into a project invisible to user',async()=>{
 const {db,calls}=database({data:null,error:null});const res=response();
 await createStudioHandler({identify:async()=>({user:{id:user},db})})(request('messages','POST',{id,text:'Uma decisão'}),res);
 assert.equal(res.statusCode,404);assert.equal(calls.some(c=>c[0]==='insert'),false);
});
test('Invalid callback does not accept arbitrary browser tokens',async()=>{
 const res=response();await createStudioHandler()(request('callback','POST',{access_token:'forged',refresh_token:'forged'}),res);
 assert.equal(res.statusCode,401);assert.equal(res.headers['Set-Cookie'],undefined);
});
test('Email sign-in creates a PKCE challenge and HttpOnly verifier cookie without returning credentials',async()=>{
 const previous=globalThis.fetch;let sent;
 globalThis.fetch=async(url,options)=>{sent={url:String(url),body:JSON.parse(options.body)};return new Response('{}',{status:200,headers:{'Content-Type':'application/json'}});};
 try{
  const res=response();await createStudioHandler()(request('signin','POST',{email:'test@example.invalid'}),res);
  assert.equal(res.statusCode,200);assert.equal(sent.body.code_challenge_method,'s256');assert.ok(sent.body.code_challenge.length>30);
  assert.match(sent.url,/redirect_to=/);assert.ok(res.headers['Set-Cookie'].some(c=>c.startsWith('__Host-studio_pkce=')&&c.includes('HttpOnly; Secure; SameSite=Lax')));
  assert.deepEqual(res.body,{sent:true});
 }finally{globalThis.fetch=previous;}
});
test('PKCE callback exchanges only the verifier created for this browser and stores session in cookies',async()=>{
 const previous=globalThis.fetch;let sent;
 const token=Buffer.from(JSON.stringify({alg:'none'})).toString('base64url')+'.'+Buffer.from(JSON.stringify({sub:user,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')+'.signature';
 globalThis.fetch=async(url,options)=>{sent={url:String(url),body:JSON.parse(options.body)};return new Response(JSON.stringify({access_token:token,refresh_token:'test-refresh',token_type:'bearer',expires_in:3600,user:{id:user,email:'test@example.invalid'}}),{status:200,headers:{'Content-Type':'application/json'}});};
 try{
  const res=response();const req=request('callback','POST',{code:'one-time-code'});req.headers.cookie='__Host-studio_pkce='+encodeURIComponent(JSON.stringify('test-verifier'));
  await createStudioHandler()(req,res);
  assert.equal(res.statusCode,200);assert.equal(sent.body.code_verifier,'test-verifier');assert.match(sent.url,/grant_type=pkce/);
  assert.equal(res.body.access_token,undefined);assert.equal(res.body.user.id,user);
  assert.ok(res.headers['Set-Cookie'].some(c=>c.startsWith('__Host-studio_access=')&&c.includes('HttpOnly; Secure')));
 }finally{globalThis.fetch=previous;}
});
