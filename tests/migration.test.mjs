import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';

const config=JSON.parse(fs.readFileSync('vercel.json','utf8'));
function destination(urlPath,host='diretor.ai'){
  for(const route of config.routes){
    if(route.handle==='filesystem'){
      const p=path.join(process.cwd(),urlPath);
      if(fs.existsSync(p)&&fs.statSync(p).isFile())return urlPath;
      continue;
    }
    if(route.has?.some(c=>c.type==='host'&&!new RegExp('^(?:'+c.value+')$').test(host)))continue;
    const re=new RegExp('^(?:'+route.src+')$');
    if(re.test(urlPath))return urlPath.replace(re,route.dest);
  }
}
test('Manager remains the existing strategic application',()=>{
  const original=execFileSync('git',['show','main:index.html'],{encoding:'utf8'});
  const expected=original.replace('href="https://diretor.ai"','href="https://diretor.ai/manager"').replace('property="og:url" content="https://diretor.ai"','property="og:url" content="https://diretor.ai/manager"').replace('href="/manifest.json"','href="/manager/manifest.json"').replace(/\r\n/g,'\n');
  assert.equal(fs.readFileSync('manager/index.html','utf8'),expected);
});
test('Root presents audiovisual work and preserves old bookmark handling',()=>{
  const html=fs.readFileSync('index.html','utf8');
  assert.match(html,/Você imagina/);assert.match(html,/legacy-links\.js/);assert.match(html,/href="\/manager"/);
  assert.equal(destination('/'),'/index.html');
});
test('Manager deep links and manifest have stable destinations',()=>{
  for(const p of ['/manager','/manager/','/manager/analysis'])assert.equal(destination(p),'/manager/index.html');
  assert.equal(destination('/manager/manifest.json'),'/manager/manifest.json');
  const manifest=JSON.parse(fs.readFileSync('manager/manifest.json','utf8'));
  assert.equal(manifest.start_url,'/manager');assert.equal(manifest.scope,'/manager');
});
test('Studio subdomain and preview paths resolve UI and resources',()=>{
  assert.equal(destination('/','studio.diretor.ai'),'/studio/studio.html');
  for(const p of ['/index.html','/studio.html','/styles.css','/studio.css','/site.js','/studio.js','/icon.svg'])assert.equal(destination(p,'studio.diretor.ai'),'/studio'+p);
  assert.equal(destination('/assets/hero.mp4','studio.diretor.ai'),'/studio/assets/hero.mp4');
  assert.equal(destination('/studio'),'/studio/studio.html');
  assert.equal(destination('/studio/studio.html'),'/studio/studio.html');
});
test('Legacy APIs, KBC and assets retain their paths',()=>{
  for(const p of ['/api/auth','/api/payment','/api/ai','/api/territory'])assert.equal(destination(p),p);
  assert.equal(destination('/kbc'),'/kbc/index.html');assert.equal(destination('/kbc/history'),'/kbc/index.html');
  for(const p of ['/favicon.svg','/apple-touch-icon.png','/studio/assets/product.jpg'])assert.equal(destination(p),p);
});
test('Old hashes are transferred to Manager, portfolio anchors remain on the landing',()=>{
  const code=fs.readFileSync('legacy-links.js','utf8');
  for(const hash of ['#home','#app:diagnosis','#login','#admin','#section-faq']){
    let redirect;vm.runInNewContext(code,{location:{hash,search:'?source=bookmark',replace:v=>{redirect=v;}}});
    assert.equal(redirect,'/manager?source=bookmark'+hash);
  }
  for(const hash of ['','#filmes','#metodo','#formas','#conteudo']){
    let redirect;vm.runInNewContext(code,{location:{hash,search:'',replace:v=>{redirect=v;}}});assert.equal(redirect,undefined);
  }
});
test('Payment access links point to Manager; webhook and CORS remain unchanged',()=>{
  const original=execFileSync('git',['show','main:api/payment.js'],{encoding:'utf8'}).replace(/\r\n/g,'\n');
  assert.equal(fs.readFileSync('api/payment.js','utf8'),original.replace('href="https://diretor.ai"','href="https://diretor.ai/manager"'));
});
test('Every local landing asset resolves to a real file',()=>{
  const html=fs.readFileSync('index.html','utf8');
  const urls=[...html.matchAll(/(?:src|href|poster)="(\/[^"?#]+)(?:[^\"]*)"/g)].map(m=>m[1]);
  for(const url of urls){const dest=destination(url);assert.ok(dest,'Missing route '+url);assert.ok(fs.existsSync(path.join(process.cwd(),dest)),'Missing file '+dest);}
});
test('Studio keeps generation disabled and local planning disclosure',()=>{
  assert.match(fs.readFileSync('studio/studio.js','utf8'),/executionEnabled:false/);
  assert.match(fs.readFileSync('studio/studio.html','utf8'),/pagamentos ainda estão em preparação/);
  assert.match(fs.readFileSync('studio/site.js','utf8'),/document.currentScript.src/);
});
