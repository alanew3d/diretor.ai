(() => {
  const byId=id=>document.getElementById(id);
  const state={user:null,active:null,request:0,pendingMessage:null,before:null};
  const status=message=>{byId('cloud-status').textContent=message;};
  async function api(action,{method='GET',id,body,before}={}){
    const query=new URLSearchParams({action});if(id)query.set('id',id);if(before)query.set('before',before);
    const response=await fetch('/api/studio?'+query,{method,credentials:'same-origin',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});
    const data=await response.json().catch(()=>({error:'Resposta indisponível. Tente novamente.'}));
    if(!response.ok){if(response.status===401)accountView(null);throw new Error(data.error||'Não foi possível concluir.');}
    return data;
  }
  async function busy(button,action){
    if(button.disabled)return;button.disabled=true;button.setAttribute('aria-busy','true');
    try{await action();}catch(error){status(error.message);}finally{button.disabled=false;button.removeAttribute('aria-busy');}
  }
  function node(tag,value,cls){const el=document.createElement(tag);if(value!==undefined)el.textContent=value;if(cls)el.className=cls;return el;}
  function accountView(user){
    state.user=user;byId('cloud-login').hidden=!!user;byId('cloud-account').hidden=!user;
    byId('cloud-email-display').textContent=user?.email||'';
    if(!user){state.request++;state.active=null;state.pendingMessage=null;byId('cloud-project-list').replaceChildren();byId('cloud-detail').hidden=true;}
  }
  async function listProjects(){
    const {projects}=await api('projects');
    const list=byId('cloud-project-list');list.replaceChildren();
    if(!projects.length){list.append(node('p','Você ainda não salvou projetos na conta. Crie um abaixo ou salve o planejamento que está aberto.','cloud-empty'));return;}
    for(const project of projects){
      const item=node('button',undefined,'cloud-project');item.type='button';item.setAttribute('aria-pressed',String(project.id===state.active?.id));
      item.append(node('strong',project.name),node('small',new Date(project.updated_at).toLocaleString('pt-BR')));
      item.addEventListener('click',()=>busy(item,()=>openProject(project.id)));list.append(item);
    }
  }
  function renderMessages(messages,prepend=false){
    const feed=byId('cloud-messages');if(!prepend)feed.replaceChildren();
    const fragment=document.createDocumentFragment();
    for(const message of messages){
      const card=node('article',undefined,'cloud-message');card.append(node('small','Você · '+new Date(message.created_at).toLocaleString('pt-BR')),node('p',message.body));fragment.append(card);
    }
    if(prepend)feed.prepend(fragment);else feed.append(fragment);
    if(!feed.childNodes.length)feed.append(node('p','Registre a ideia, uma decisão ou o próximo passo.','cloud-empty'));
  }
  async function openProject(id){
    const switching=state.active?.id!==id;
    if(byId('cloud-message-text').value.trim()&&switching&&!confirm('Há um texto ainda não enviado. Descartá-lo e abrir outro projeto?'))return;
    const draft=switching?'':byId('cloud-message-text').value;
    const request=++state.request;const [{project},history]=await Promise.all([api('project',{id}),api('messages',{id})]);
    if(request!==state.request)return;
    state.active=project;if(switching)state.pendingMessage=null;state.before=history.messages[0]?.created_at||null;
    byId('cloud-message-text').value=draft;byId('cloud-detail').hidden=false;byId('cloud-active-name').textContent=project.name;
    byId('cloud-active-revision').textContent='Planejamento · versão '+project.revision;
    renderMessages(history.messages);byId('cloud-load-older').hidden=!history.hasMore;
    await listProjects();status('Projeto aberto. O planejamento do navegador só muda quando você escolher carregar.');
  }
  byId('cloud-signin-form').addEventListener('submit',event=>{
    event.preventDefault();busy(byId('cloud-send-link'),async()=>{
      await api('signin',{method:'POST',body:{email:byId('cloud-email').value.trim()}});
      status('Link solicitado. Confira seu e-mail e abra o link neste mesmo navegador. Se não chegar, aguarde antes de tentar novamente.');
    });
  });
  byId('cloud-signout').addEventListener('click',()=>busy(byId('cloud-signout'),async()=>{
    await api('signout',{method:'POST',body:{}});accountView(null);status('Você saiu da conta. O rascunho local continua neste navegador.');
  }));
  byId('cloud-refresh').addEventListener('click',()=>busy(byId('cloud-refresh'),async()=>{await listProjects();status('Lista atualizada.');}));
  byId('cloud-create-form').addEventListener('submit',event=>{
    event.preventDefault();busy(byId('cloud-create'),async()=>{
      const name=byId('cloud-new-name').value.trim();const plan=window.directorPlanning.blank();plan.name=name;
      const {project}=await api('projects',{method:'POST',body:{id:crypto.randomUUID(),planning:plan}});
      byId('cloud-new-name').value='';await openProject(project.id);status('Projeto criado na conta. Seu rascunho local foi preservado.');
    });
  });
  byId('cloud-save-planning').addEventListener('click',()=>busy(byId('cloud-save-planning'),async()=>{
    const plan=window.directorPlanning.snapshot();
    if(!plan.name.trim())throw new Error('Dê um nome ao planejamento antes de salvar na conta.');
    const active=state.active;
    if(active&&!confirm(`Atualizar o projeto “${active.name}” com o planejamento aberto neste navegador?`))return;
    const result=active?await api('project',{id:active.id,method:'PATCH',body:{revision:active.revision,planning:plan}}):await api('projects',{method:'POST',body:{id:crypto.randomUUID(),planning:plan}});
    await openProject(result.project.id);status('Planejamento salvo na conta. Ele pode ser aberto em outro dispositivo.');
  }));
  byId('cloud-load-planning').addEventListener('click',()=>{
    if(!state.active)return;
    const plan=structuredClone(state.active.planning);
    window.directorPlanning.load(plan);
  });
  byId('cloud-message-form').addEventListener('submit',event=>{
    event.preventDefault();busy(byId('cloud-send-message'),async()=>{
      if(!state.active)throw new Error('Abra um projeto primeiro.');
      const id=state.active.id;const value=byId('cloud-message-text').value.trim();
      if(!state.pendingMessage||state.pendingMessage.text!==value||state.pendingMessage.project!==id)state.pendingMessage={id:crypto.randomUUID(),text:value,project:id};
      await api('messages',{id,method:'POST',body:{id:state.pendingMessage.id,text:value}});
      state.pendingMessage=null;byId('cloud-message-text').value='';
      const history=await api('messages',{id});if(state.active?.id!==id)return;
      renderMessages(history.messages);state.before=history.messages[0]?.created_at||null;byId('cloud-load-older').hidden=!history.hasMore;
      status('Mensagem salva. O assistente de IA ainda não está conectado.');
    });
  });
  byId('cloud-load-older').addEventListener('click',()=>busy(byId('cloud-load-older'),async()=>{
    const id=state.active?.id;if(!id||!state.before)return;
    const history=await api('messages',{id,before:state.before});if(state.active?.id!==id)return;
    renderMessages(history.messages,true);state.before=history.messages[0]?.created_at||state.before;byId('cloud-load-older').hidden=!history.hasMore;
  }));
  (async()=>{
    try{
      const url=new URL(location.href);const code=url.searchParams.get('code');
      if(code||url.searchParams.get('view')==='cloud')window.directorPlanning.showCloud();
      if(code){url.searchParams.delete('code');history.replaceState(null,'',url);await api('callback',{method:'POST',body:{code}});}
      const {user}=await api('session');accountView(user);
      if(user){await listProjects();status('Sua conta está conectada. Escolha ou crie um projeto.');}
      else status('Entre para salvar projetos e manter um histórico entre dispositivos.');
    }catch(error){status(error.message);}
  })();
})();
