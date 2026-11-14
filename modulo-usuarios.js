/* MASTERS GESTÃO - Módulo 3B-8: Usuários (só o administrador MASTERS).
   Antes de usar, rode no Supabase o SQL 07_usuarios. */
try{(function(){
const PERFIS=[['ALMOXARIFE','Almoxarife'],['ENCARREGADO','Encarregado'],['FUNCIONARIO','Funcionário (só consulta)']];
const rot=p=>p==='MASTERS'?'Administrador':(PERFIS.find(x=>x[0]===p)||[0,p])[1];
const usu=l=>String(l||'').replace(/@masters\.local$/i,'');

async function telaUsuarios(){cur='usuarios';mark();const v=$('#view');
 v.innerHTML='<h1>Usuários</h1><p class="sub">Carregando…</p>';
 const[a,b,c]=await Promise.all([sb.from('perfis').select('*'),sb.from('usuario_obras').select('*'),sb.from('obras').select('id,nome').order('nome')]);
 const e=a.error||b.error||c.error;if(e){v.innerHTML='<h1>Usuários</h1><div class="err">'+esc(msg(e))+'</div>';return}
 const O=c.data||[],obrasDe=id=>(b.data||[]).filter(x=>x.usuario_id===id).map(x=>x.obra_id);
 const L=(a.data||[]).slice().sort((x,y)=>(x.ativo-y.ativo)||String(x.nome||x.login).localeCompare(String(y.nome||y.login)));
 const linhas=L.map(u=>{const ob=u.perfil==='MASTERS'?'Todas':(obrasDe(u.id).map(i=>{const o=O.find(z=>z.id===i);return o?esc(o.nome):''}).filter(Boolean).join(', ')||'—');
  return `<tr><td><b>${esc(u.nome||'(sem nome)')}</b></td><td>${esc(usu(u.login))}</td><td>${esc(rot(u.perfil))}</td><td>${ob}</td><td>${u.ativo?'<span class="chip">Liberado</span>':'<span class="chip red">Aguardando liberação</span>'}</td><td><button class="mini" data-u="${u.id}">Editar</button></td></tr>`}).join('');
 v.innerHTML=`<h1>Usuários</h1><p class="sub">${L.length} usuário(s). Quem ainda não foi liberado não consegue entrar no sistema.</p>
 <div class="card"><b>Como criar um novo usuário</b>
 <ol class="steps"><li>No Supabase: <b>Authentication → Users → Add user → Create new user</b>.</li>
 <li>No e-mail, escreva <b>nomedousuario@masters.local</b> (a pessoa entrará só com <b>nomedousuario</b>). Crie uma senha e marque <b>Auto Confirm User</b>.</li>
 <li>Volte aqui, atualize a página, clique em <b>Editar</b> no novo usuário, escolha o perfil e as obras e marque <b>Acesso liberado</b>.</li></ol></div>
 <div class="card wrap" style="margin-top:12px">${L.length?`<table><thead><tr><th>Nome</th><th>Usuário</th><th>Perfil</th><th>Obras</th><th>Situação</th><th></th></tr></thead><tbody>${linhas}</tbody></table>`:'<p class="empty">Nenhum usuário.</p>'}</div>`;
 v.querySelectorAll('[data-u]').forEach(btn=>btn.onclick=()=>editar(L.find(u=>u.id===btn.dataset.u),O,obrasDe(btn.dataset.u)))}

function editar(u,O,mine){const adm=u.perfil==='MASTERS';
 modal('Usuário: '+esc(usu(u.login)),
 `<label class="fl" for="u_n">Nome completo <b class="rq">*</b></label><input id="u_n" value="${esc(u.nome||'')}">
 ${adm?'<p class="hint">O administrador MASTERS tem acesso a todas as obras e não pode ser bloqueado nem ter o perfil alterado.</p>':
 `<label class="fl" for="u_p">Perfil <b class="rq">*</b></label><select id="u_p">${PERFIS.map(p=>`<option value="${p[0]}" ${p[0]===u.perfil?'selected':''}>${p[1]}</option>`).join('')}</select>
 <div class="hint"><b>Almoxarife:</b> confirma recebimentos, dá saída de material e cadastra. <b>Encarregado:</b> cadastra e registra solicitações e pedidos. <b>Funcionário:</b> só consulta.</div>
 <label class="fl">Obras que este usuário pode acessar</label>
 ${O.length?O.map(o=>`<label style="display:block;padding:6px 0"><input type="checkbox" class="u_o" value="${o.id}" ${mine.includes(o.id)?'checked':''} style="width:22px;min-height:22px;vertical-align:middle"> ${esc(o.nome)}</label>`).join(''):'<div class="hint" style="color:var(--red)">Cadastre antes as obras.</div>'}
 <label style="display:block;padding:12px 0"><input type="checkbox" id="u_a" ${u.ativo?'checked':''} style="width:22px;min-height:22px;vertical-align:middle"> <b>Acesso liberado</b></label>
 <div class="hint">Desmarque para bloquear a entrada deste usuário.</div>`}`,
 'Salvar',async()=>{
  const nome=$('#u_n').value.trim();if(!nome)return 'Informe o nome do usuário.';
  let perfil=u.perfil,ativo=true,obras=[];
  if(!adm){perfil=$('#u_p').value;ativo=$('#u_a').checked;obras=[...document.querySelectorAll('.u_o:checked')].map(x=>x.value);
   if(ativo&&!obras.length)return 'Marque ao menos uma obra para liberar o acesso.'}
  if(!confirm('Salvar as alterações deste usuário?'))return 'Nada foi alterado.';
  const{error}=await sb.rpc('salvar_usuario',{p_id:u.id,p_nome:nome,p_perfil:perfil,p_ativo:ativo,p_obras:obras});
  if(error)return msg(error);
  toast('Usuário salvo.');telaUsuarios()})}

function poeMenu(){const m=$('#menu');if(!m||m.querySelector('[data-v="usuarios"]'))return;
 [...m.querySelectorAll('.soon')].filter(x=>/^Usuários/i.test(x.textContent)).forEach(x=>x.remove());
 const h=[...m.querySelectorAll('h4')].find(x=>x.textContent==='Em breve');if(h&&!(h.nextElementSibling&&h.nextElementSibling.classList.contains('soon')))h.remove();
 if(!me||me.perfil!=='MASTERS')return;
 m.insertAdjacentHTML('beforeend','<h4>Administração</h4><button class="nav" data-v="usuarios">Usuários</button>');
 const n=m.querySelector('[data-v="usuarios"]');n.onclick=telaUsuarios;n.classList.toggle('on',cur==='usuarios')}
const _menu8=menu;menu=function(){_menu8();poeMenu()};
if($('#menu')&&$('#menu').children.length)poeMenu();
}())}catch(e){window.__usuErro=e;try{toast('Usuários não carregou: '+e.message)}catch(x){}}
