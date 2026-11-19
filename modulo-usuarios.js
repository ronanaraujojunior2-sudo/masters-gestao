/* MASTERS GESTÃO - Módulo Usuários (administração completa, só o administrador MASTERS).
   Antes de usar: SQL 11 e SQL 16 no Supabase e a Edge Function "admin-usuarios" publicada (veja o guia).
   - NOVO USUÁRIO direto pelo sistema: a conta de acesso (Supabase Auth) é criada pela Edge Function, no servidor; nenhuma chave administrativa fica aqui;
   - lista com pesquisa e filtros; editar tudo; inativar/reativar; excluir com proteção (exclusão lógica); verificar/corrigir sincronização;
   - redefinir senha (senha provisória mostrada uma vez; a senha atual nunca aparece);
   - para todos os usuários: respeita as permissões liberadas, troca de senha obrigatória e saída automática de quem foi inativado.
   Todas as regras de segurança estão no banco (RLS e funções); esta tela só facilita o uso. */
try{(function(){
const ASS='ASSISTENTE DE ENGENHARIA';     /* perfil de auxiliares/assistentes de engenharia nas obras (precisa do SQL 22) */
const PERFIS=[['MASTERS','Administrador'],['ALMOXARIFE','Almoxarife'],['ENCARREGADO','Encarregado'],[ASS,'Assistente de Engenharia'],['FUNCIONARIO','Funcionário (só consulta)']];
const rot=p=>(PERFIS.find(x=>x[0]===p)||[0,p||'—'])[1];
const usu=l=>String(l||'').replace(/@masters\.local$/i,'');
const dt=v=>v?new Date(v).toLocaleDateString('pt-BR'):'—';
const dth=v=>v?new Date(v).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}):'—';
const sn=s=>String(s==null?'':s).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
const sit=u=>u.excluido_em?'excluido':u.ativo?'ativo':u.inativado_em?'inativo':'aguardando';
const padraoGravar=p=>p==='MASTERS'||p==='ALMOXARIFE'||p==='ENCARREGADO';
const padraoAlmox=p=>p==='MASTERS'||p==='ALMOXARIFE';
const VINC={auditoria:'registros de auditoria',solicitacoes:'solicitações',pedidos_compra:'pedidos de compra',recebimentos:'recebimentos de material',
 estoque_movs:'movimentações de estoque (entradas, saídas e entregas)',ferramenta_movs:'retiradas e devoluções de ferramentas',itens_recipiente:'itens de malas e malões',
 malas:'malas',maloes:'malões',materiais:'materiais cadastrados',ferramentas:'ferramentas cadastradas',funcionarios:'funcionários cadastrados',fornecedores:'fornecedores cadastrados',
 categorias:'categorias cadastradas',disciplinas:'disciplinas cadastradas',obras:'obras cadastradas ou importadas',importacoes:'importações de planilhas',
 previsao_historico:'histórico de previsões',feriados:'feriados cadastrados',calendario_conferencias:'conferências do calendário'};
let L=[],O=[],UO=[];                       /* usuários, obras, vínculos usuário-obra */
const S={q:'',perfil:'',sit:''};
const obrasDe=id=>UO.filter(x=>x.usuario_id===id).map(x=>x.obra_id);
const nomeObra=i=>{const o=O.find(z=>z.id===i);return o?o.nome:'(obra removida)'};
const quem=id=>{const u=L.find(x=>x.id===id);return u?(u.nome||usu(u.login||u.login_original)):'—'};
const nomeU=u=>u.nome||usu(u.excluido_em?u.login_original:u.login)||'(sem nome)';
const adm=()=>!!me&&(me.perfil_real||me.perfil)==='MASTERS';
/* abre uma janela depois que a atual terminou de fechar (a janela do sistema é uma só) */
const depois=f=>setTimeout(f,0);

/* ---------- estilo da lista (tabela no computador, cartões no celular) ---------- */
(function(){if(document.getElementById('usu_css'))return;const s=document.createElement('style');s.id='usu_css';
 s.textContent='.usu-t td small{display:block;color:var(--mute)}.usu-t th,.usu-t td{padding:8px 8px}.usu-ac{min-width:150px}.usu-ac .mini{margin:2px 6px 2px 0}.usu-top{display:flex;gap:10px;flex-wrap:wrap;margin:4px 0 8px}.usu-top>*{min-height:44px}.usu-fil{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px}.usu-fil>*{flex:1 1 200px;min-width:0}'+
 '.usu-det summary{cursor:pointer;font-weight:600;min-height:32px}.usu-box{border:1px solid var(--line);border-radius:10px;padding:10px 12px;margin-top:12px}.usu-box h3{margin:0 0 4px;font-size:15px}'+
 '.usu-pw{font:700 26px/1.3 ui-monospace,Menlo,Consolas,monospace;letter-spacing:2px;text-align:center;background:var(--soft);border-radius:10px;padding:14px 8px;margin:12px 0;user-select:all;word-break:break-all}'+
 '.usu-ck{display:flex;gap:10px;align-items:flex-start;padding:8px 0}.usu-ck input{width:24px;min-width:24px;min-height:24px;margin:2px 0 0}.usu-h li{margin:6px 0}'+
 '@media (max-width:1100px){.usu-t{min-width:0!important}.usu-t thead{display:none}.usu-t,.usu-t tbody,.usu-t tr,.usu-t td{display:block;width:100%}'+
 '.usu-t tr{border:1px solid var(--line);border-radius:12px;margin:0 0 12px;padding:6px 10px;background:var(--surf)}.usu-t td{border:0;padding:5px 0}'+
 '.usu-t td[data-l]::before{content:attr(data-l)": ";font-weight:600;color:var(--mute)}.usu-t td.usu-nm{font-size:17px}'+
 '.usu-ac .mini{min-height:44px;margin:6px 8px 4px 0;padding:0 16px}.usu-card-w{padding:8px!important;border:0!important;background:none!important}}';
 document.head.appendChild(s)}());

/* ---------- dados ---------- */
async function carregar(){
 const[a,b,c]=await Promise.all([sb.from('perfis').select('*'),sb.from('usuario_obras').select('*'),sb.from('obras').select('id,nome').order('nome')]);
 const e=a.error||b.error||c.error;if(e)throw e;
 L=a.data||[];UO=b.data||[];O=c.data||[]}

/* ---------- tela principal ---------- */
async function telaUsuarios(){cur='usuarios';mark();const v=$('#view');
 v.innerHTML='<h1>Usuários</h1><p class="sub">Carregando…</p>';
 try{await carregar()}catch(e){v.innerHTML='<h1>Usuários</h1><div class="err">'+esc(msg(e))+'<br>Se aparecer erro de coluna ou função, rode os SQL 11 e 16 no Supabase.</div>';return}
 v.innerHTML=`<h1>Usuários</h1><p class="sub" id="usu_n"></p>
 <div class="usu-top"><button class="btn" type="button" id="usu_novo">Novo usuário</button><button class="sec" type="button" id="usu_vs">Verificar sincronização</button></div>
 <p class="hint">Crie, edite, inative e exclua usuários aqui mesmo: a conta de acesso é criada e mantida automaticamente, sem abrir o painel do Supabase.</p>
 <div class="usu-fil"><input id="usu_q" type="search" placeholder="Pesquisar por nome ou login" aria-label="Pesquisar por nome ou login" value="${esc(S.q)}">
  <select id="usu_p" aria-label="Filtrar por perfil"><option value="">Todos os perfis</option>${PERFIS.map(p=>`<option value="${p[0]}" ${S.perfil===p[0]?'selected':''}>${p[1]}</option>`).join('')}</select>
  <select id="usu_s" aria-label="Filtrar por situação"><option value="">Todas as situações (menos excluídos)</option>${[['ativo','Ativo'],['inativo','Inativo'],['aguardando','Aguardando liberação'],['excluido','Excluído']].map(p=>`<option value="${p[0]}" ${S.sit===p[0]?'selected':''}>${p[1]}</option>`).join('')}</select></div>
 <div class="card wrap usu-card-w" id="usu_l"></div>
`;
 $('#usu_novo').onclick=()=>novo();$('#usu_vs').onclick=verificar;
 $('#usu_q').oninput=e=>{S.q=e.target.value;lista()};$('#usu_p').onchange=e=>{S.perfil=e.target.value;lista()};$('#usu_s').onchange=e=>{S.sit=e.target.value;lista()};
 lista()}

function filtrados(){const q=sn(S.q.trim());
 return L.filter(u=>{const s=sit(u);if(S.sit?s!==S.sit:s==='excluido')return false;if(S.perfil&&u.perfil!==S.perfil)return false;
  if(q&&!sn([u.nome,usu(u.login),usu(u.login_original),u.matricula,u.cargo,u.email_contato].join(' ')).includes(q))return false;return true})
 .sort((x,y)=>{const o={ativo:0,aguardando:1,inativo:2,excluido:3};return (o[sit(x)]-o[sit(y)])||nomeU(x).localeCompare(nomeU(y),'pt-BR')})}

function lista(){const F=filtrados(),el=$('#usu_l');if(!el)return;
 const ativos=L.filter(u=>sit(u)==='ativo').length;
 $('#usu_n').textContent=`${F.length} de ${L.filter(u=>sit(u)!=='excluido').length} usuário(s) na lista · ${ativos} ativo(s). Usuário inativo não consegue entrar nem trabalhar no sistema.`;
 if(!F.length){el.innerHTML='<p class="empty">Nenhum usuário encontrado com esse filtro.</p>';return}
 el.innerHTML=`<table class="usu-t"><thead><tr><th>Nome</th><th>Login</th><th>Perfil</th><th>Obras vinculadas</th><th>Situação</th><th>Cadastro</th><th>Ações</th></tr></thead><tbody>${F.map(linha).join('')}</tbody></table>`;
 el.querySelectorAll('[data-usu-a]').forEach(b=>b.onclick=()=>{const u=L.find(x=>x.id===b.dataset.usuI);if(!u)return;({ed:editar,st:alternar,ex:excluir,pw:senha,hi:historico,rs:alternar})[b.dataset.usuA](u)})}

function linha(u){const s=sit(u),eu=u.id===me.id;
 const obs=u.perfil==='MASTERS'?'Todas':(()=>{const n=obrasDe(u.id).map(nomeObra);return !n.length?'—':n.length>3?n.slice(0,3).join(', ')+' +'+(n.length-3):n.join(', ')})();
 const ch={ativo:'<span class="chip blue">Ativo</span>',inativo:'<span class="chip red">Inativo</span>',aguardando:'<span class="chip">Aguardando liberação</span>',excluido:'<span class="chip red">Excluído</span>'}[s];
 const ex=[];if(u.trocar_senha)ex.push('<span class="chip">Senha provisória</span>');if(eu)ex.push('<span class="chip">Você</span>');
 const sub=[u.cargo,u.matricula?'Matrícula '+u.matricula:'',u.email_contato].filter(Boolean).map(esc).join(' · ');
 const perm=(u.perm_gravar!=null||u.perm_almoxarifado!=null)&&u.perfil!=='MASTERS'?'<small>Permissões personalizadas</small>':'';
 const mot=s==='inativo'?`<small>desde ${dt(u.inativado_em)}${u.motivo_inativacao?' — '+esc(u.motivo_inativacao):''}</small>`:'';
 const b=(a,t)=>`<button class="mini" type="button" data-usu-a="${a}" data-usu-i="${u.id}">${t}</button>`;
 let ac;
 if(s==='excluido')ac=b('rs','Restaurar')+b('hi','Histórico');
 else ac=b('ed','Editar')+(eu?'':(s==='ativo'?b('st','Inativar'):b('st',s==='inativo'?'Reativar':'Liberar acesso'))+b('ex','Excluir'));
 return `<tr><td class="usu-nm"><b>${esc(nomeU(u))}</b>${sub?'<small>'+sub+'</small>':''}</td><td data-l="Login">${esc(usu(s==='excluido'?u.login_original:u.login))}</td><td data-l="Perfil">${esc(rot(u.perfil))}${perm}</td>
 <td data-l="Obras">${esc(obs)}</td><td data-l="Situação">${ch} ${ex.join(' ')}${mot}</td><td data-l="Cadastro">${dt(u.criado_em)}</td><td class="usu-ac">${ac}</td></tr>`}

/* ---------- editar ---------- */
const NP={'':'Padrão do perfil',sim:'Permitir',nao:'Não permitir'};
function editar(u){
 const eu=u.id===me.id,loginEd=/@masters\.local$/i.test(u.login||''),mine=obrasDe(u.id),s0=sit(u);
 const pv=x=>x==null?'':x?'sim':'nao';
 const permSel=(id,lab,val)=>`<label class="fl" for="${id}">${lab}</label><select id="${id}"><option value="" ${val===''?'selected':''}>Padrão do perfil</option><option value="sim" ${val==='sim'?'selected':''}>Permitir</option><option value="nao" ${val==='nao'?'selected':''}>Não permitir</option></select><div class="hint" id="${id}_h"></div>`;
 const html=`<div class="hint">Os campos com <b class="rq">*</b> são obrigatórios. A senha atual nunca é mostrada.</div>
 <label class="fl" for="u_n">Nome completo <b class="rq">*</b></label><input id="u_n" value="${esc(u.nome||'')}" autocomplete="off">
 <label class="fl" for="u_l">Login (usado para entrar) <b class="rq">*</b></label><input id="u_l" value="${esc(usu(u.login))}" ${loginEd?'':'disabled'} autocapitalize="none" autocorrect="off" spellcheck="false" autocomplete="off">
 <div class="hint">${loginEd?'De 3 a 30 letras minúsculas, números, ponto, hífen ou sublinhado. Se mudar, avise a pessoa. A senha continua a mesma e a conta de acesso é atualizada junto.':'Esta conta entra com e-mail próprio, e o login não muda por aqui.'}</div>
 <label class="fl" for="u_e">E-mail (opcional, só para contato)</label><input id="u_e" type="email" value="${esc(u.email_contato||'')}" autocomplete="off" autocapitalize="none">
 <label class="fl" for="u_m">Matrícula</label><input id="u_m" value="${esc(u.matricula||'')}" autocomplete="off">
 <label class="fl" for="u_c">Função / cargo</label><input id="u_c" value="${esc(u.cargo||'')}" autocomplete="off">
 <label class="fl" for="u_p2">Perfil de acesso <b class="rq">*</b></label><select id="u_p2" ${eu?'disabled':''}>${PERFIS.map(p=>`<option value="${p[0]}" ${p[0]===u.perfil?'selected':''}>${p[1]}</option>`).join('')}</select>
 <div class="hint" id="u_ph"></div>
 <div id="u_ob"><label class="fl">Obras que este usuário pode acessar</label>${O.length?O.map(o=>`<label class="usu-ck"><input type="checkbox" class="u_o" value="${o.id}" ${mine.includes(o.id)?'checked':''}><span>${esc(o.nome)}</span></label>`).join(''):'<div class="hint redt">Cadastre antes as obras.</div>'}</div>
 <div id="u_ad" class="hint hide">O administrador tem acesso a todas as obras e a todas as funções, inclusive gerenciar usuários.</div>
 <div id="u_pm" class="usu-box"><h3>Permissões específicas</h3><div class="hint">Use só quando esta pessoa precisar de algo diferente do perfil. Valem no banco de dados, não só na tela.</div>
  ${permSel('u_pg','Cadastrar e registrar (solicitações, pedidos, materiais…)',pv(u.perm_gravar))}
  ${permSel('u_pa','Almoxarifado (confirmar recebimentos e dar saída de material)',pv(u.perm_almoxarifado))}</div>
 <label class="fl" for="u_s">Situação</label><select id="u_s" ${eu?'disabled':''}><option value="ativo" ${s0==='ativo'?'selected':''}>Ativo</option><option value="inativo" ${s0==='inativo'?'selected':''}>Inativo (bloqueado, sem apagar nada)</option>${s0==='aguardando'?'<option value="aguardando" selected>Aguardando liberação</option>':''}</select>
 ${eu?'<div class="hint">Você não pode alterar o seu próprio perfil nem a sua situação. Para trocar a sua senha, use “Minha senha”.</div>':''}
 <div id="u_mo" class="hide"><label class="fl" for="u_mt">Motivo da inativação (opcional)</label><input id="u_mt" maxlength="200" placeholder="Ex.: férias, desligamento"></div>
 <div class="usu-box"><h3>Mais opções</h3>${eu?'':'<button type="button" class="mini" id="u_pw" style="min-height:44px">Redefinir senha</button> '}<button type="button" class="mini" id="u_hi" style="min-height:44px">Ver histórico deste usuário</button></div>`;
 modal('Editar usuário',html,'Revisar e salvar',()=>{
  const nome=$('#u_n').value.trim();if(!nome)return 'Informe o nome completo.';
  const login=$('#u_l').value.trim().toLowerCase();
  if(loginEd&&!/^[a-z0-9][a-z0-9._-]{2,29}$/.test(login))return 'Login inválido. Use de 3 a 30 letras minúsculas, números, ponto, hífen ou sublinhado, sem espaços.';
  const email=$('#u_e').value.trim().toLowerCase();if(email&&!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(email))return 'E-mail inválido.';
  const perfil=eu?u.perfil:$('#u_p2').value,s1=eu?s0:$('#u_s').value;
  const obras=[...document.querySelectorAll('.u_o:checked')].map(x=>x.value);
  if(perfil!=='MASTERS'&&s1==='ativo'&&!obras.length)return 'Marque ao menos uma obra para este usuário ficar ativo.';
  const pg=perfil===ASS?'':$('#u_pg').value,pa=perfil===ASS?'':$('#u_pa').value,val=x=>x===''?null:x==='sim';   /* o Assistente não guarda permissões específicas */
  const d={},res=[];   /* d: o que mudou (vai para o banco); res: texto do resumo */
  const nv=(k,rotulo,antes,novo)=>{if((antes||'')!==(novo||'')){d[k]=novo||null;res.push([rotulo,antes||'—',novo||'—'])}};
  nv('nome','Nome',u.nome,nome);if(loginEd)nv('login','Login',usu(u.login),login);
  nv('email','E-mail',u.email_contato,email);nv('matricula','Matrícula',u.matricula,$('#u_m').value.trim());nv('cargo','Função / cargo',u.cargo,$('#u_c').value.trim());
  if(perfil!==u.perfil){d.perfil=perfil;res.push(['Perfil de acesso',rot(u.perfil),rot(perfil)])}
  if(perfil!=='MASTERS'){
   if(val(pg)!==(u.perm_gravar==null?null:u.perm_gravar)){d.perm_gravar=val(pg);res.push(['Cadastrar e registrar',NP[pv(u.perm_gravar)],NP[pg]])}
   if(val(pa)!==(u.perm_almoxarifado==null?null:u.perm_almoxarifado)){d.perm_almoxarifado=val(pa);res.push(['Almoxarifado',NP[pv(u.perm_almoxarifado)],NP[pa]])}
   const add=obras.filter(x=>!mine.includes(x)),del=mine.filter(x=>!obras.includes(x));
   if(add.length||del.length){d.obras=obras;if(add.length)res.push(['Obras: acesso liberado','—',add.map(nomeObra).join(', ')]);if(del.length)res.push(['Obras: acesso removido',del.map(nomeObra).join(', '),'—'])}}
  const mudouSit=s1!==s0&&s1!=='aguardando';
  if(mudouSit)res.push(['Situação',{ativo:'Ativo',inativo:'Inativo',aguardando:'Aguardando liberação'}[s0],{ativo:'Ativo',inativo:'Inativo'}[s1]]);
  if(!res.length)return 'Nada foi alterado.';
  const motivo=($('#u_mt').value||'').trim();
  depois(()=>confirmar(u,d,res,mudouSit?s1==='ativo':null,motivo,perfil==='MASTERS'&&u.perfil!=='MASTERS'));
 });
 const ref=()=>{const p=eu?u.perfil:$('#u_p2').value,a=p==='MASTERS';
  $('#u_ob').classList.toggle('hide',a);$('#u_pm').classList.toggle('hide',a||p===ASS);$('#u_ad').classList.toggle('hide',!a);
  $('#u_pg_h').textContent='Padrão deste perfil: '+(padraoGravar(p)?'permite.':'não permite.');$('#u_pa_h').textContent='Padrão deste perfil: '+(padraoAlmox(p)?'permite.':'não permite.');
  $('#u_ph').innerHTML={MASTERS:'<b>Administrador:</b> acesso total, inclusive usuários. Dê só a quem for responsável pelo sistema.',ALMOXARIFE:'<b>Almoxarife:</b> confirma recebimentos, dá saída de material e cadastra.',ENCARREGADO:'<b>Encarregado:</b> cadastra e registra solicitações e pedidos.',[ASS]:'<b>Assistente de Engenharia:</b> consulta as obras vinculadas, registra solicitações de compra e solicita transferências (quem autoriza é o gestor). Não cadastra, não importa, não recebe material e não administra usuários.',FUNCIONARIO:'<b>Funcionário:</b> só consulta.'}[p];
  $('#u_mo').classList.toggle('hide',eu||$('#u_s').value!=='inativo'||s0==='inativo')};
 $('#u_p2').onchange=ref;$('#u_s').onchange=ref;ref();
 if($('#u_pw'))$('#u_pw').onclick=()=>{$('#dlg').close();depois(()=>senha(u))};
 $('#u_hi').onclick=()=>{$('#dlg').close();depois(()=>historico(u))}}

/* confirmação do resumo das alterações; depois grava */
function confirmar(u,d,res,mudouAtivo,motivo,viraAdm){
 const lista=res.map(r=>`<li><b>${esc(r[0])}:</b> ${esc(r[1])} → ${esc(r[2])}</li>`).join('');
 modal('Confirmar alterações de '+esc(nomeU(u)),`<p>Estas alterações serão gravadas e registradas na auditoria:</p><ul class="usu-h">${lista}</ul>
 ${viraAdm?'<div class="usu-box"><b class="redt">Atenção:</b> o Administrador pode tudo no sistema, inclusive criar, bloquear e excluir outros usuários.<label class="usu-ck"><input type="checkbox" id="u_ok"><span>Entendi e quero tornar esta pessoa administradora.</span></label></div>':''}
 ${mudouAtivo===false?'<p class="hint">Ao inativar, a pessoa perde o acesso na hora e não consegue mais entrar. O histórico dela continua guardado.</p>':''}`,'Confirmar e salvar',async()=>{
  if(viraAdm&&!$('#u_ok').checked)return 'Marque a caixa para confirmar.';
  let gravou=false,aviso=null;
  try{
   if(Object.keys(d).length){const r=await fn({acao:'editar',id:u.id,dados:d});if(!r.ok)return r.erro;gravou=true;if(r.aviso)aviso=r.aviso}
   if(mudouAtivo!==null){const r=await fn({acao:'situacao',id:u.id,ativo:mudouAtivo,motivo:motivo||null});
    if(!r.ok)return (gravou?'Os dados foram salvos, mas a situação não mudou: ':'')+r.erro;if(r.aviso)aviso=r.aviso}
  }catch(x){return msg(x)}
  if(aviso){depois(()=>{avisoSync(aviso,u);telaUsuarios()});return}
  toast('Usuário atualizado.');depois(telaUsuarios)})}

/* ---------- inativar / reativar / restaurar / liberar ---------- */
function alternar(u){const s=sit(u),eu=u.id===me.id;if(eu)return;
 if(s==='ativo'){
  modal('Inativar '+esc(nomeU(u))+'?',`<p>Esta pessoa <b>não poderá mais entrar nem trabalhar</b> no sistema, e a conta de acesso dela será bloqueada agora.</p>
  <ul class="usu-h"><li>Tudo o que ela já registrou (solicitações, retiradas, entregas, cadastros) <b>continua guardado</b>.</li><li>Você pode <b>reativar</b> quando quiser.</li></ul>
  <label class="fl" for="u_mt">Motivo (opcional)</label><input id="u_mt" maxlength="200" placeholder="Ex.: férias, desligamento">`,'Inativar',async()=>{
   const r=await fn({acao:'situacao',id:u.id,ativo:false,motivo:($('#u_mt').value||'').trim()||null});if(!r.ok)return r.erro;
   if(r.aviso){depois(()=>{avisoSync(r.aviso,u);telaUsuarios()});return}
   toast('Usuário inativado.');depois(telaUsuarios)})}
 else{const rest=s==='excluido';
  modal((rest?'Restaurar ':s==='inativo'?'Reativar ':'Liberar acesso de ')+esc(nomeU(u))+'?',
   `<p>${rest?'O usuário volta para a lista com o login que tinha antes (se ninguém tiver usado esse login nesse tempo) e fica ativo.':'A pessoa poderá entrar e trabalhar de novo, com as mesmas obras e permissões.'}</p>${u.trocar_senha?'<p class="hint">Ela ainda precisa trocar a senha provisória no primeiro acesso.</p>':''}`,
   rest?'Restaurar':s==='inativo'?'Reativar':'Liberar',async()=>{
   const r=await fn({acao:'situacao',id:u.id,ativo:true,motivo:null});if(!r.ok)return r.erro;
   if(r.aviso){depois(()=>{avisoSync(r.aviso,u);telaUsuarios()});return}
   toast(rest?'Usuário restaurado.':'Acesso liberado.');depois(telaUsuarios)})}}

/* ---------- excluir (exclusão lógica, com os vínculos à vista) ---------- */
async function excluir(u){
 modal('Excluir '+esc(nomeU(u))+'?','<p class="sub">Conferindo o que está ligado a este usuário…</p>',null);
 let v;try{const r=await sb.rpc('vinculos_usuario',{p_id:u.id});if(r.error)throw r.error;v=r.data||[]}catch(e){$('#dlg').close();toast(msg(e));return}
 const tot=v.reduce((a,x)=>a+Number(x.qtd||0),0);
 const lis=v.map(x=>{const lab=x.tabela==='itens_recipiente'&&x.coluna==='retirado_por'?'itens retirados de malas e malões':(VINC[x.tabela]||x.tabela);return `<li><b>${x.qtd}</b> ${esc(lab)}</li>`}).join('');
 $('#dlg').close();
 depois(()=>modal('Excluir '+esc(nomeU(u))+'?',`${tot?`<p>Este usuário tem <b>${tot} registro(s) vinculado(s)</b>:</p><ul class="usu-h">${lis}</ul>`:'<p>Este usuário não tem registros vinculados.</p>'}
  <div class="usu-box"><h3>O que acontece</h3><ul class="usu-h"><li>O usuário <b>some da lista</b>, perde o acesso na hora e o login fica livre para outra pessoa (a conta de acesso é bloqueada).</li>
  <li><b>Nada é apagado</b> e nenhum registro é desvinculado: o nome dele continua nas solicitações, retiradas, entregas e na auditoria.</li>
  <li>Dá para <b>restaurar</b> depois, em Situação → Excluído.</li></ul></div>
  <p class="hint">Se a pessoa só vai ficar afastada, prefira <b>Inativar</b>.</p>
  <label class="usu-ck"><input type="checkbox" id="u_ok"><span>Entendi e quero excluir <b>${esc(nomeU(u))}</b>.</span></label>`,'Excluir usuário',async()=>{
   if(!$('#u_ok').checked)return 'Marque a caixa para confirmar a exclusão.';
   const r=await fn({acao:'excluir',id:u.id});if(!r.ok)return r.erro;
   if(r.aviso){depois(()=>{avisoSync(r.aviso,u);telaUsuarios()});return}
   toast('Usuário excluído. Os registros foram preservados.');depois(telaUsuarios)}))}

/* ---------- senha provisória ---------- */
function mostrarSenha(titulo,login,pw,topo){
 modal(titulo,`${topo||''}<p>Entregue à pessoa <b>agora</b>, em particular. Esta senha não será mostrada outra vez.</p>
  <div class="hint">Login: <b>${esc(login)}</b></div><div class="usu-pw" id="u_pwv" aria-label="Senha provisória">${esc(pw)}</div>
  <div class="acts" style="justify-content:center"><button class="btn" type="button" id="u_cp">Copiar senha</button></div>
  <p class="hint">Ao entrar com ela, o sistema pede que a pessoa crie uma senha nova. A senha provisória não fica gravada em nenhum lugar.</p>`,null);
 $('#u_cp').onclick=async()=>{try{await navigator.clipboard.writeText(pw);toast('Senha copiada.')}catch(x){const r=document.createRange();r.selectNodeContents($('#u_pwv'));const s=getSelection();s.removeAllRanges();s.addRange(r);toast('Selecionada. Copie com o menu do aparelho.')}}}

function senha(u){
 modal('Redefinir senha de '+esc(nomeU(u)),`<p>Será criada uma senha provisória de 12 caracteres.</p>
  <ul class="usu-h"><li>A senha atual <b>deixa de funcionar agora</b>. Ela nunca é exibida.</li><li>No próximo acesso, a pessoa é obrigada a escolher uma senha nova.</li><li>A senha provisória aparece <b>uma única vez</b>, na próxima tela.</li></ul>`,'Gerar senha provisória',async()=>{
  const r=await fn({acao:'redefinir_senha',id:u.id});if(!r.ok)return r.erro;
  const pw=r.senha_provisoria;if(!pw)return 'Não foi possível gerar a senha. Tente de novo.';
  depois(()=>{mostrarSenha('Senha provisória de '+esc(nomeU(u)),usu(u.login),pw);telaUsuarios()})})}

/* ---------- histórico de um usuário (auditoria) ---------- */
const OPS={USUARIO_CRIADO:'Usuário criado pelo sistema',USUARIO_EDITADO:'Dados alterados',USUARIO_INATIVADO:'Inativado',USUARIO_REATIVADO:'Reativado',USUARIO_RESTAURADO:'Restaurado',USUARIO_EXCLUIDO:'Excluído (exclusão lógica)',USUARIO_SENHA_REDEFINIDA:'Senha provisória gerada',USUARIO_SENHA_TROCADA:'Senha trocada pelo próprio usuário'};
const CAMPOS={email:'E-mail',nome:'Nome',login:'Login',matricula:'Matrícula',cargo:'Função',perfil:'Perfil',perm_gravar:'Cadastrar e registrar',perm_almoxarifado:'Almoxarifado',ativo:'Ativo',motivo:'Motivo'};
function detalhe(r){const a=r.antes||{},b=r.depois||{},out=[];
 Object.keys(b).forEach(k=>{if(k[0]==='_'||k==='exclusao'||k==='trocar_senha')return;
  if(k==='obras_acrescentadas')out.push('Obras liberadas: '+esc((b[k]||[]).map(nomeObra).join(', ')));
  else if(k==='registros_vinculados')out.push(esc(b[k]||0)+' registro(s) vinculado(s) preservado(s)');
  else{const f=x=>x===true?'sim':x===false?'não':x==null?'—':k==='login'?usu(x):k==='perfil'?rot(x):x;out.push(esc(CAMPOS[k]||k)+': '+esc(f(a[k]))+' → '+esc(f(b[k])))}});
 if(a.obras_removidas)out.push('Obras removidas: '+esc(a.obras_removidas.map(nomeObra).join(', ')));
 return out.join('<br>')}
async function historico(u){
 modal('Histórico de '+esc(nomeU(u)),'<p class="sub">Carregando…</p>',null);
 const{data,error}=await sb.from('auditoria').select('*').eq('tabela','usuarios').eq('registro_id',u.id).order('em',{ascending:false}).limit(60);
 const box=$('#dlg>div');if(!box)return;
 if(error){box.innerHTML='<div class="err">'+esc(msg(error))+'</div>';return}
 box.innerHTML=(data||[]).length?(data||[]).map(r=>`<div class="mv"><b>${esc(OPS[r.operacao]||r.operacao)}</b> — ${esc(dth(r.em))}<br><span class="hint">Por: ${esc(r.usuario_id?quem(r.usuario_id):'sistema')}</span><div>${detalhe(r)}</div></div>`).join(''):'<p class="empty">Ainda não há alterações registradas para este usuário.</p>'}
   /* ---------- servidor de contas (Edge Function "admin-usuarios") ---------- */
const FN='admin-usuarios';
const urlSb=()=>String((sb&&sb.supabaseUrl)||(typeof SB_URL!=='undefined'?SB_URL:'')).replace(/\/$/,'');
/* Descobre a causa REAL de uma falha de comunicação. É um GET simples, sem cabeçalhos extras (não depende de CORS):
   rede = sem internet ou Supabase fora do ar · naopublicada = a função não existe neste projeto ·
   erro_servidor = existe, mas falhou ao iniciar · noar = publicada e respondendo (inclui o portão exigindo login). */
async function sonda(){
 let ctl=null,tm=null;try{ctl=new AbortController();tm=setTimeout(()=>ctl.abort(),8000)}catch(x){}
 let r;try{r=await fetch(urlSb()+'/functions/v1/'+FN,{method:'GET',cache:'no-store',signal:ctl?ctl.signal:undefined})}catch(e){return{estado:'rede'}}finally{if(tm)clearTimeout(tm)}
 let j=null;try{j=await r.json()}catch(x){}
 if(r.status===404||(j&&j.code==='NOT_FOUND'))return{estado:'naopublicada',status:r.status};
 if(r.status>=500)return{estado:'erro_servidor',status:r.status};
 return{estado:'noar',status:r.status,versao:j&&j.versao}}
const MSG={
 rede:'Sem conexão com o Supabase. Confira a internet do aparelho e tente de novo; nada será duplicado.',
 naopublicada:'O servidor de contas não está publicado neste projeto Supabase: a função "admin-usuarios" não existe (o Supabase respondeu "função não encontrada"). Não é problema de internet nem do seu login. É uma publicação feita uma única vez, em Supabase → Edge Functions → Deploy a new function → Via Editor, com o nome exatamente admin-usuarios. Depois dela, criar usuários não exige mais nada no painel.',
 erro_servidor:'A função "admin-usuarios" está publicada, mas falhou ao iniciar (erro do servidor). Em Supabase → Edge Functions → admin-usuarios → Logs veja o motivo e publique o código atual de novo.',
 cors:'A função "admin-usuarios" está publicada, mas o navegador bloqueou a chamada (CORS). Publique a versão atual do código da função e tente de novo.',
 portao:'O Supabase recusou a sessão antes de chegar na função (Verify JWT). Saia e entre de novo; se continuar, desligue "Verify JWT" da função admin-usuarios (ela mesma já confere o login e se você é o administrador).',
 tempo:'O servidor de contas não respondeu em 30 segundos. Tente de novo: nada será duplicado.'};
async function fn(body){
 let r,tm;
 try{r=await Promise.race([sb.functions.invoke(FN,{body}),new Promise((_,rej)=>{tm=setTimeout(()=>rej(Object.assign(new Error('tempo'),{tempo:true})),30000)})])}catch(e){r={error:e}}finally{if(tm)clearTimeout(tm)}
 if(r&&r.error){const e=r.error,c=e.context;let j=null;
  try{if(c&&typeof c.json==='function')j=await c.json()}catch(x){}
  if(j&&j.erro)return Object.assign({ok:false},j);                          /* a função respondeu com a própria mensagem */
  if(e.tempo)return{ok:false,causa:'tempo',rede:true,erro:MSG.tempo};
  const st=c&&c.status;
  if(st===401||st===403)return{ok:false,causa:'portao',erro:MSG.portao};
  if(st>=500)return{ok:false,causa:'erro_servidor',erro:MSG.erro_servidor+' (HTTP '+st+')'};
  const d=await sonda();                                                    /* sem resposta útil: descobre o que de fato aconteceu */
  if(d.estado==='naopublicada'||st===404)return{ok:false,causa:'naopublicada',semFn:true,erro:MSG.naopublicada};
  if(d.estado==='rede')return{ok:false,causa:'rede',rede:true,erro:MSG.rede};
  if(d.estado==='erro_servidor')return{ok:false,causa:'erro_servidor',erro:MSG.erro_servidor+' (HTTP '+d.status+')'};
  return{ok:false,causa:'cors',erro:MSG.cors+' ['+String((e&&e.message)||'').slice(0,80)+']'}}
 return (r&&r.data)||{ok:false,erro:'Resposta vazia do servidor de contas.'}}
/* lista de conferência mostrada quando a verificação falha: o que está de pé e o que falta */
async function diagnostico(){
 const L=[];const li=(ok,t)=>L.push('<li>'+(ok===true?'✔ ':ok===false?'✖ ':'• ')+esc(t)+'</li>');
 const d=await sonda();
 li(d.estado!=='rede','Internet e Supabase: '+(d.estado==='rede'?'sem resposta':'respondendo'));
 li(d.estado==='noar'||d.estado==='erro_servidor','Função "admin-usuarios" publicada: '+(d.estado==='naopublicada'?'NÃO (não encontrada neste projeto)':d.estado==='rede'?'não deu para conferir':'sim'+(d.versao?' (versão '+d.versao+')':'')));
 if(d.estado==='noar'){
  let p=null;try{const x=await sb.functions.invoke(FN,{body:{acao:'ping'}});p=x&&x.data}catch(e){}
  if(p&&p.ok){li(p.admin===true,'Sua sessão é de administrador MASTERS: '+(p.admin?'sim':'não'));
   if(p.admin){li(p.sql16===true,'SQL 16 (usuários pelo sistema) instalado: '+(p.sql16?'sim':'NÃO'));li(p.sql22===true,'SQL 22 (perfil Assistente de Engenharia) instalado: '+(p.sql22?'sim':'NÃO — rode o SQL 22'))}}
  else li(false,'Chamada de teste (ping) à função: sem resposta útil')}
 return '<ul class="usu-h">'+L.join('')+'</ul>'}

function avisoSync(aviso,u){
 modal('Atenção: sincronização pendente','<p>'+esc(aviso)+'</p><p class="hint">O que foi salvo no sistema continua salvo. A conta de acesso só precisa ser acertada.</p>','Tentar sincronizar agora',async()=>{
  const x=await fn({acao:'sincronizar',id:u.id});if(!x.ok)return x.erro;toast('Conta de acesso sincronizada.');depois(telaUsuarios)})}

async function verificar(){
 modal('Verificar sincronização','<p class="sub">Conferindo as contas de acesso e os perfis…</p>',null);
 const r=await fn({acao:'verificar'});const box=$('#dlg>div');if(!box)return;
 if(!r.ok){box.innerHTML='<div class="err">'+esc(r.erro||'Não foi possível verificar.')+'</div><p class="hint">Conferindo o que está funcionando…</p><div id="vf_dg"></div><div class="acts"><button type="button" class="sec" id="vf_re">Tentar de novo</button></div>';
  const re=$('#vf_re');if(re)re.onclick=()=>{$('#dlg').close();depois(verificar)};
  const h=await diagnostico();const g=$('#vf_dg');if(g){g.innerHTML=h;const hh=g.previousElementSibling;if(hh)hh.remove()}return}
 const dv=r.divergencias||[];
 box.innerHTML='<p>'+r.total_perfis+' cadastro(s) no sistema · '+r.total_contas+' conta(s) de acesso.</p>'+(dv.length?
  '<p>Foram encontradas <b>'+dv.length+'</b> diferença(s):</p><ul class="usu-h">'+dv.map(x=>'<li><b>'+esc(x.nome||x.login||'(sem nome)')+'</b> ('+esc(x.login||'—')+'): '+esc(x.texto)+' '+(x.corrigivel?'<button type="button" class="mini" data-vs="'+esc(x.id)+'">Corrigir</button>':'<span class="hint">precisa de conferência manual</span>')+'</li>').join('')+'</ul>':
  '<p><b>Tudo em ordem:</b> cada usuário tem a sua conta de acesso, com o mesmo login e a mesma situação (ativo ou bloqueado).</p>');
 box.querySelectorAll('[data-vs]').forEach(b=>b.onclick=async()=>{b.disabled=true;const x=await fn({acao:'sincronizar',id:b.dataset.vs});
  if(!x.ok){toast(x.erro);b.disabled=false;return}toast('Corrigido.');$('#dlg').close();depois(verificar)})}

/* ---------- novo usuário ---------- */
let criando=false;
function novo(){
 const permSel=(id,lab)=>`<label class="fl" for="${id}">${lab}</label><select id="${id}"><option value="" selected>Padrão do perfil</option><option value="sim">Permitir</option><option value="nao">Não permitir</option></select><div class="hint" id="${id}_h"></div>`;
 modal('Novo usuário',`<div class="hint">Os campos com <b class="rq">*</b> são obrigatórios. O sistema cria a conta de acesso sozinho e mostra uma senha provisória, uma única vez, no final.</div>
 <label class="fl" for="n_n">Nome completo <b class="rq">*</b></label><input id="n_n" autocomplete="off">
 <label class="fl" for="n_l">Login (usado para entrar) <b class="rq">*</b></label><input id="n_l" autocapitalize="none" autocorrect="off" spellcheck="false" autocomplete="off">
 <div class="hint">De 3 a 30 letras minúsculas, números, ponto, hífen ou sublinhado. Não precisa de e-mail: a pessoa entra só com o login.</div>
 <label class="fl" for="n_e">E-mail (opcional, só para contato)</label><input id="n_e" type="email" autocapitalize="none" autocomplete="off">
 <label class="fl" for="n_m">Matrícula (se tiver)</label><input id="n_m" autocomplete="off">
 <label class="fl" for="n_c">Função / cargo</label><input id="n_c" autocomplete="off">
 <label class="fl" for="n_p">Perfil de acesso <b class="rq">*</b></label><select id="n_p"><option value="">Escolha…</option>${PERFIS.map(p=>`<option value="${p[0]}">${p[1]}</option>`).join('')}</select>
 <div class="hint" id="n_ph"></div>
 <div id="n_ob"><label class="fl">Obras que este usuário pode acessar <b class="rq">*</b></label>${O.length?O.map(o=>`<label class="usu-ck"><input type="checkbox" class="n_o" value="${o.id}"><span>${esc(o.nome)}</span></label>`).join(''):'<div class="hint redt">Cadastre antes as obras.</div>'}</div>
 <div id="n_ad" class="usu-box hide"><b>Administrador:</b> acesso total, inclusive criar, bloquear e excluir usuários.<label class="usu-ck"><input type="checkbox" id="n_ok"><span>Confirmo que esta pessoa terá acesso total ao sistema.</span></label></div>
 <div id="n_pm" class="usu-box"><h3>Permissões específicas</h3><div class="hint">Use só quando esta pessoa precisar de algo diferente do perfil.</div>
  ${permSel('n_pg','Cadastrar e registrar (solicitações, pedidos, materiais…)')}${permSel('n_pa','Almoxarifado (confirmar recebimentos e dar saída de material)')}</div>
 <label class="fl" for="n_s">Situação da conta</label><select id="n_s"><option value="ativo" selected>Ativo</option><option value="inativo">Inativo (criar já bloqueado)</option></select>`,'Criar usuário',async()=>{
  if(criando)return 'Aguarde: o cadastro anterior ainda está sendo concluído.';
  const nome=$('#n_n').value.trim(),login=$('#n_l').value.trim().toLowerCase(),email=$('#n_e').value.trim().toLowerCase(),perfil=$('#n_p').value,sit0=$('#n_s').value;
  if(nome.length<3)return 'Informe o nome completo.';
  if(!/^[a-z0-9][a-z0-9._-]{2,29}$/.test(login))return 'Login inválido. Use de 3 a 30 letras minúsculas, números, ponto, hífen ou sublinhado, sem espaços.';
  if(login==='masters')return 'Este login é reservado pelo sistema.';
  if(email&&!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(email))return 'E-mail inválido.';
  if(!perfil)return 'Escolha o perfil de acesso.';
  const obras=perfil==='MASTERS'?[]:[...document.querySelectorAll('.n_o:checked')].map(x=>x.value);
  if(perfil==='MASTERS'&&!$('#n_ok').checked)return 'Marque a caixa para confirmar que esta pessoa será administradora.';
  if(perfil!=='MASTERS'&&sit0==='ativo'&&!obras.length)return 'Marque ao menos uma obra para a conta ficar ativa.';
  const val=x=>x===''?null:x==='sim';
  const d={nome,login,email:email||null,matricula:$('#n_m').value.trim()||null,cargo:$('#n_c').value.trim()||null,perfil,obras,situacao:sit0,
   perm_gravar:perfil==='MASTERS'||perfil===ASS?null:val($('#n_pg').value),perm_almoxarifado:perfil==='MASTERS'||perfil===ASS?null:val($('#n_pa').value),confirmar_admin:perfil==='MASTERS'?'true':undefined};
  criando=true;let r;try{r=await fn({acao:'criar',dados:d})}finally{criando=false}
  if(!r.ok){
   if(r.usuario_id){depois(()=>{modal('Atenção: cadastro criado, falta acertar a conta de acesso','<p>'+esc(r.erro)+'</p><p class="hint">Os dados que você preencheu foram salvos. Nada será duplicado.</p>',null);telaUsuarios()});return}
   if(perfil===ASS&&/perfil/i.test(r.erro||''))return r.erro+' (Se o SQL 22 ainda não foi executado no Supabase, execute-o antes de criar este perfil.)';
   return r.erro||'Não foi possível criar o usuário. Os dados preenchidos foram mantidos; tente de novo.'}
  depois(()=>{mostrarSenha('Usuário criado: '+esc(nome),r.login,r.senha_provisoria,
   '<ul class="usu-h"><li>✔ Conta de acesso criada e confirmada no Supabase Auth</li><li>✔ Perfil, permissões e obras gravados</li><li>✔ Sincronização conferida</li></ul>');telaUsuarios()})});
 const ref=()=>{const p=$('#n_p').value,a=p==='MASTERS';
  $('#n_ob').classList.toggle('hide',a||!p);$('#n_pm').classList.toggle('hide',a||!p||p===ASS);$('#n_ad').classList.toggle('hide',!a);
  if(p){$('#n_pg_h').textContent='Padrão deste perfil: '+(padraoGravar(p)?'permite.':'não permite.');$('#n_pa_h').textContent='Padrão deste perfil: '+(padraoAlmox(p)?'permite.':'não permite.')}
  $('#n_ph').innerHTML={MASTERS:'<b>Administrador:</b> acesso total, inclusive usuários. Dê só a quem for responsável pelo sistema.',ALMOXARIFE:'<b>Almoxarife:</b> confirma recebimentos, dá saída de material e cadastra.',ENCARREGADO:'<b>Encarregado:</b> cadastra e registra solicitações e pedidos.',[ASS]:'<b>Assistente de Engenharia:</b> consulta as obras vinculadas, registra solicitações de compra e solicita transferências (quem autoriza é o gestor). Não cadastra, não importa, não recebe material e não administra usuários.',FUNCIONARIO:'<b>Funcionário:</b> só consulta.'}[p]||''};
 $('#n_p').onchange=ref;ref()}

/* ---------- menu (só o administrador) ---------- */
function poeMenu(){const m=$('#menu');if(!m||m.querySelector('[data-v="usuarios"]'))return;
 [...m.querySelectorAll('.soon')].filter(x=>/^Usuários/i.test(x.textContent)).forEach(x=>x.remove());
 const h=[...m.querySelectorAll('h4')].find(x=>x.textContent==='Em breve');if(h&&!(h.nextElementSibling&&h.nextElementSibling.classList.contains('soon')))h.remove();
 if(!adm())return;
 m.insertAdjacentHTML('beforeend','<h4>Administração</h4><button class="nav" data-v="usuarios">Usuários</button>');
 const n=m.querySelector('[data-v="usuarios"]');n.onclick=telaUsuarios;n.classList.toggle('on',cur==='usuarios')}

/* ---------- vale para TODOS os usuários: permissões, troca de senha obrigatória, saída automática ---------- */
const assin=u=>[u.perfil,u.perm_gravar,u.perm_almoxarifado,u.ativo,u.excluido_em,u.trocar_senha].join('|');
/* o banco decide de verdade; aqui a tela só mostra ou esconde botões conforme perfil + permissões específicas */
function aplicaPerfil(){if(!me||me.__ui)return;me.__ui=1;me.perfil_real=me.perfil;me.__sig=assin(me);
 if(me.perfil==='MASTERS')return;
 /* Assistente de Engenharia: nas telas conta como "só consulta" (nada de cadastrar, importar, receber ou autorizar);
    me.assistente libera só o que ele pode: solicitar compra e solicitar transferência. O banco decide de verdade. */
 if(me.perfil===ASS){me.assistente=true;me.perfil='FUNCIONARIO';return}
 const g=me.perm_gravar!=null?me.perm_gravar:padraoGravar(me.perfil),a=me.perm_almoxarifado!=null?me.perm_almoxarifado:padraoAlmox(me.perfil);
 me.perfil=a?'ALMOXARIFE':g?'ENCARREGADO':'FUNCIONARIO'}
const _msgU=msg;msg=function(e){const t=((e&&e.message)||'')+' '+((e&&e.code)||'');
 if(/banned/i.test(t))return 'Seu acesso está inativo. Procure o administrador do sistema.';
 return _msgU(e)};

function sair(texto){(async()=>{try{await sb.auth.signOut()}catch(x){}me=null;try{$('#dlg').close()}catch(x){}tela('login');
 if(texto){const e=$('#le');if(e){e.textContent=texto;e.classList.remove('hide')}}})()}

function forcaTroca(){if(!me||!me.trocar_senha||window.__usuForca)return;window.__usuForca=1;
 const d=$('#dlg');d.addEventListener('cancel',e=>{if(window.__usuForca)e.preventDefault()});
 modal('Crie a sua senha',`<p>Você entrou com uma <b>senha provisória</b>. Por segurança, escolha agora uma senha só sua.</p>${pwf('n1','Nova senha')}${pwf('n2','Repita a nova senha')}<div class="hint">Use pelo menos 8 caracteres, com letras e números, sem o seu login.</div>`,'Salvar nova senha',async()=>{
  const a=$('#n1').value,b=$('#n2').value;if(a.length<8)return 'A senha precisa ter pelo menos 8 caracteres.';
  if(!/[A-Za-z]/.test(a)||!/[0-9]/.test(a))return 'Use letras e números na senha.';if(a!==b)return 'As duas senhas não são iguais.';
  const r=await fn({acao:'trocar_minha_senha',nova_senha:a});if(!r.ok)return r.erro;
  try{await sb.auth.signInWithPassword({email:me.login,password:a})}catch(x){}   /* sessão nova com a senha nova */
  window.__usuForca=0;toast('Senha criada. Bem-vindo(a)!');depois(()=>{entrar()})});
 const c=$('#mc');if(c){c.textContent='Sair';c.onclick=()=>{window.__usuForca=0;sair()}}}

let vig=null;
async function vigia(){if(!me||!sb||document.hidden)return;
 try{const{data,error}=await sb.from('perfis').select('*').eq('id',me.id).maybeSingle();
  if(error&&/jwt|auth|token|banned|session/i.test(error.message||'')){sair('Sua sessão terminou. Entre novamente.');return}
  if(error)return;                          /* sem internet: não derruba ninguém */
  if(!data||!data.ativo||data.excluido_em){sair('Seu acesso foi inativado pelo administrador.');return}
  if(assin(data)!==me.__sig){toast('Suas permissões foram atualizadas.');await entrar()}}catch(x){}}
function liga(){if(vig)return;vig=setInterval(vigia,45000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)vigia()})}

const _menuU=menu;menu=function(){aplicaPerfil();_menuU();poeMenu();
 try{$('#who').innerHTML=esc(me.nome||me.login)+'<br>'+esc(me.perfil_real||me.perfil)}catch(x){}
 liga();if(me&&me.trocar_senha)depois(forcaTroca)};
if($('#menu')&&$('#menu').children.length)poeMenu();
window.__usuTeste={sit,filtrados,aplicaPerfil,vigia,fn,novo,get L(){return L}};
}())}catch(e){window.__usuErro=e;try{toast('Usuários não carregou: '+e.message)}catch(x){}}
