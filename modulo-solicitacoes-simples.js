/* MASTERS GESTÃO - Escopo simplificado (orientação da gestão da Masters Engenharia).
   1) Solicitações e pedidos em modo SIMPLES: número da solicitação, data da solicitação, data da aprovação e
      data do pedido de compra. Os insumos aparecem só como observação de consulta, no botão "+" de cada linha.
      O detalhamento das compras e dos materiais é feito no Sienge.
   2) Módulo Materiais inativo: sai do menu e o banco bloqueia novos cadastros e movimentações de materiais.
   Tudo é controlado por duas chaves (tabela config_sistema, SQL 23) que SÓ o administrador MASTERS muda, na tela
   Administração > Módulos e escopo. Nada é apagado: voltar ao modo completo / reativar Materiais é só mudar a chave.
   Sem o SQL 23 instalado, este arquivo não muda nada (o sistema continua como era).
   Carregue este arquivo ANTES de modulo-shell.js. Não altera nenhum outro módulo. */
try{(function(){
const Q=s=>document.querySelector(s);
const hojeISO=()=>new Date().toLocaleDateString('sv-SE');
const fd=d=>d?new Date(d+'T00:00').toLocaleDateString('pt-BR'):'—';
const adm=()=>!!(me&&me.perfil==='MASTERS');
/* quem grava solicitação/aprovação/pedido: todos, menos funcionário e almoxarife (o banco já recusa esses dois; aqui só não mostramos o botão) */
const gravaCompras=()=>!!(me&&me.perfil!=='FUNCIONARIO'&&me.perfil!=='ALMOXARIFE');
const podeNova=()=>gravaCompras()||!!(me&&me.assistente);
const MAT_NAV=['materiais','receber','estoque'];

/* ---------------- chaves ---------------- */
let CFG=null;                                       /* {mat:boolean, simples:boolean, info:{}} */
const PADRAO=()=>({mat:true,simples:false,info:{},lido:false});
async function lerCfg(){
 try{const{data,error}=await sb.from('config_sistema').select('chave,valor,motivo,atualizado_em');
  if(error)throw error;
  const m={};(data||[]).forEach(r=>m[r.chave]=r);
  CFG={mat:!m.modulo_materiais||m.modulo_materiais.valor!=='inativo',simples:!!m.solicitacoes_modo&&m.solicitacoes_modo.valor==='simples',info:m,lido:true};
  try{sessionStorage.setItem('sx_cfg',JSON.stringify({mat:CFG.mat,simples:CFG.simples}))}catch(x){}}
 catch(e){CFG=PADRAO();window.__cfgErro=e;try{sessionStorage.removeItem('sx_cfg')}catch(x){}}                /* tabela ainda não existe: comportamento antigo */
 return CFG}
/* último valor lido, só para o menu já nascer certo no próximo acesso (a leitura do banco sempre confirma depois) */
const guardado=()=>{try{const x=JSON.parse(sessionStorage.getItem('sx_cfg')||'null');return x&&typeof x.mat==='boolean'?{mat:x.mat,simples:!!x.simples,info:{},lido:false}:null}catch(e){return null}};
const cfg=()=>CFG||guardado()||PADRAO();

/* ---------------- menu ---------------- */
function ajustaMenu(){
 const m=Q('#menu');if(!m)return;
 if(!cfg().mat){
  MAT_NAV.forEach(v=>m.querySelectorAll('[data-v="'+v+'"]').forEach(n=>n.remove()));
  [...m.querySelectorAll('h4')].forEach(h=>{if(/^Almoxarifado$/i.test(h.textContent.trim())){const n=h.nextElementSibling;if(!n||n.tagName==='H4')h.remove()}})}
 if(adm()&&cfg().lido!==false&&!m.querySelector('[data-v="cfg_modulos"]')){
  m.insertAdjacentHTML('beforeend','<button class="nav" data-v="cfg_modulos" data-mgc="admin">Módulos e escopo</button>');
  const n=m.querySelector('[data-v="cfg_modulos"]');n.onclick=telaCfg;n.classList.toggle('on',cur==='cfg_modulos')}}
const _menuE=menu;
menu=function(){const r=_menuE.apply(this,arguments);ajustaMenu();
 if(!CFG)lerCfg().then(()=>{if(CFG.lido){menu();mark()}limpaPainel()});
 return r};

/* quem ainda tentar abrir Materiais por outro caminho (atalho do painel, por exemplo) recebe o aviso */
const _show=show;
show=function(name){
 if(name==='materiais'&&!cfg().mat){toast('O módulo Materiais está inativado temporariamente.');return}
 return _show.apply(this,arguments)};

/* ---------------- Solicitações e pedidos ---------------- */
const _telaSol=telaSol;
telaSol=async function(){
 const antes=cfg().mat;await lerCfg();
 if(cfg().mat!==antes){menu();mark()}                   /* a chave mudou em outro aparelho: o menu acompanha */
 if(!cfg().simples)return _telaSol.apply(this,arguments);
 return telaSimples()};

const TITULO='Solicitações e pedidos';
let ABERTAS=new Set();
let MEMO=new Map();                                  /* insumos já lidos, por solicitação */

function estilo(){if(Q('#sx_css'))return;const s=document.createElement('style');s.id='sx_css';
 s.textContent='.sx-t{width:56px}.sx-b{min-width:44px;min-height:44px;font-size:22px;font-weight:700;line-height:1;padding:0;margin:0}'+
 '.sx-r td{vertical-align:middle}.sx-n{font-size:16px}.sx-o{display:block;color:var(--mute);font-size:13.5px}.sx-p{display:block;white-space:nowrap}.sx-p small{color:var(--mute);margin-left:6px}'+
 '.sx-d>td{background:var(--soft);padding:14px 16px}.sx-box h4{margin:0 0 6px;font-size:14px;color:var(--ink)}.sx-box p{margin:0 0 12px}.sx-l{margin:0 0 12px;padding-left:20px}.sx-l li{margin:2px 0}'+
 '.sx-aj{display:flex;flex-wrap:wrap;gap:8px;margin-top:4px}.sx-c{white-space:nowrap}'+
 '.sx-cfg{display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between}.sx-cfg h3{margin:0}';
 document.head.appendChild(s)}

async function lerPedidos(ids){
 const out=[];
 for(let i=0;i<ids.length;i+=100){
  const{data,error}=await sb.from('pedidos_compra').select('id,solicitacao_id,numero_pedido,data_pedido').in('solicitacao_id',ids.slice(i,i+100)).order('data_pedido');
  if(error)throw error;out.push(...(data||[]))}
 return out}

async function telaSimples(){
 cur='solicitacoes';mark();estilo();
 const v=Q('#view');v.innerHTML='<h1>'+TITULO+'</h1><p class="sub">Carregando…</p>';
 const h1=v.querySelector('h1');h1.dataset.em='1';           /* o aviso de pedidos emergenciais é do modo completo */
 try{
  await loadRefs([{t:'ref',ref:'obras',lab:'nome'}]);
  const{data:ss,error}=await sb.from('solicitacoes').select('id,obra_id,numero_sienge,data_solicitacao,data_aprovacao,observacao,status,criado_em').order('criado_em',{ascending:false}).limit(1000);
  if(error)throw error;
  const ps=await lerPedidos((ss||[]).map(s=>s.id));
  const obra=id=>{const o=(cache.obras||[]).find(x=>x.id===id);return o?o.nome:'—'};
  const ped=id=>ps.filter(p=>p.solicitacao_id===id);
  const g=gravaCompras();
  const linhas=(ss||[]).map(s=>{
   const pd=ped(s.id),num=s.numero_sienge||'Sem número',aberta=ABERTAS.has(s.id);
   const aprov=s.data_aprovacao?fd(s.data_aprovacao):(g&&s.status!=='Cancelada'?'<button type="button" class="mini" data-ap="'+s.id+'">Registrar aprovação</button>':'<span class="hint">Aguardando</span>');
   const pedH=pd.map(p=>'<span class="sx-p">'+fd(p.data_pedido)+'<small>Pedido '+esc(p.numero_pedido)+'</small></span>').join('')||(s.data_aprovacao?'<span class="hint">Sem pedido</span>':'<span class="hint">—</span>');
   const novo=g&&s.data_aprovacao&&s.status!=='Cancelada'?'<button type="button" class="mini" data-pc="'+s.id+'">'+(pd.length?'Outro pedido':'Registrar pedido')+'</button>':'';
   return '<tr class="sx-r" data-id="'+s.id+'"><td class="sx-t"><button type="button" class="mini sx-b" data-sx="'+s.id+'" aria-expanded="'+aberta+'" aria-controls="sx-d-'+s.id+'" aria-label="Insumos e observações da solicitação '+esc(num)+'" title="Insumos / Observações">'+(aberta?'−':'+')+'</button></td>'+
    '<td><b class="sx-n">'+esc(num)+'</b><span class="sx-o">'+esc(obra(s.obra_id))+'</span></td>'+
    '<td class="sx-c">'+fd(s.data_solicitacao)+'</td><td>'+aprov+'</td><td>'+pedH+novo+'</td></tr>'+
    '<tr class="sx-d'+(aberta?'':' hide')+'" id="sx-d-'+s.id+'" data-d="'+s.id+'"><td colspan="5"><div class="sx-box" data-box="'+s.id+'"></div></td></tr>'}).join('');
  v.innerHTML='<h1>'+TITULO+'</h1><p class="sub">'+(ss||[]).length+' solicitação(ões). Toque no <b>+</b> para ver os insumos e as observações de cada uma. O detalhamento das compras fica no Sienge.</p>'+
   '<div class="bar"><input id="q" type="search" placeholder="Número, obra ou pedido" aria-label="Pesquisar">'+(podeNova()?'<button class="btn" id="nw">Nova solicitação</button>':'')+'</div>'+
   '<div class="card wrap">'+((ss||[]).length?'<table><thead><tr><th></th><th>Número da solicitação</th><th>Data da solicitação</th><th>Data da aprovação</th><th>Data do pedido de compra</th></tr></thead><tbody>'+linhas+'</tbody></table>'
    :'<div class="empty">Nenhuma solicitação cadastrada ainda.'+(podeNova()?'<br>Use “Nova solicitação” ou importe do Sienge.':'')+'</div>')+'</div>';
  v.querySelector('h1').dataset.em='1';
  const dummy=document.createElement('span');dummy.id='un_pnl';dummy.hidden=true;v.appendChild(dummy);   /* o painel de unidades divergentes é do modo completo */
  (ss||[]).forEach(s=>{if(ABERTAS.has(s.id))preencher(s)});
  window.__sxDados=ss;
  ligar(v,ss||[],ps)
 }catch(e){v.innerHTML='<h1>'+TITULO+'</h1><div class="err">'+esc(msg(e))+'</div>'}}

function caixaHtml(s,itens,erro){
 const linhas=[...new Set((itens||[]).map(i=>i.materiais&&i.materiais.descricao).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
 const ins=erro?'<p class="hint">Não foi possível ler os insumos agora: '+esc(erro)+'</p>':
  linhas.length?'<ul class="sx-l">'+linhas.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>':'<p class="hint">Nenhum insumo registrado para esta solicitação.</p>';
 return '<h4>Insumos relacionados</h4>'+ins+
  '<h4>Informações complementares</h4>'+(s.observacao?'<p>'+esc(s.observacao).replace(/\n/g,'<br>')+'</p>':'<p class="hint">Sem informações complementares.</p>')+
  '<p class="hint">Somente para consulta. Quantidades, unidades, valores, fornecedores e etapas ficam no Sienge.</p>'+
  (gravaCompras()?'<div class="sx-aj"><button type="button" class="mini" data-ed="'+s.id+'">Editar número e informações</button></div>':'')}

async function preencher(s){
 const box=Q('[data-box="'+s.id+'"]');if(!box)return;
 if(MEMO.has(s.id)){box.innerHTML=caixaHtml(s,MEMO.get(s.id).itens,MEMO.get(s.id).erro);return}
 box.innerHTML='<p class="hint">Carregando…</p>';
 let itens=[],erro=null;
 try{const r=await sb.from('solicitacao_itens').select('id,materiais(descricao)').eq('solicitacao_id',s.id);
  if(r.error)throw r.error;itens=r.data||[];MEMO.set(s.id,{itens,erro:null})}
 catch(e){erro=msg(e)}
 const b2=Q('[data-box="'+s.id+'"]');if(b2)b2.innerHTML=caixaHtml(s,itens,erro);
 window.__sxAbertas=(window.__sxAbertas||0)+1}

function alterna(id,ss){
 const b=Q('[data-sx="'+id+'"]'),d=Q('[data-d="'+id+'"]'),s=ss.find(x=>x.id===id);if(!b||!d||!s)return;
 const abre=b.getAttribute('aria-expanded')!=='true';
 b.setAttribute('aria-expanded',abre?'true':'false');b.textContent=abre?'−':'+';d.classList.toggle('hide',!abre);
 if(abre){ABERTAS.add(id);preencher(s)}else ABERTAS.delete(id)}

function ligar(v,ss,ps){
 v.addEventListener('click',e=>{
  const sx=e.target.closest('[data-sx]');if(sx){alterna(sx.dataset.sx,ss);return}
  const ap=e.target.closest('[data-ap]');if(ap){aprovar(ss.find(x=>x.id===ap.dataset.ap));return}
  const pc=e.target.closest('[data-pc]');if(pc){pedido(ss.find(x=>x.id===pc.dataset.pc));return}
  const ed=e.target.closest('[data-ed]');if(ed){editar(ss.find(x=>x.id===ed.dataset.ed));return}});
 if(Q('#nw'))Q('#nw').onclick=nova;
 if(Q('#q'))Q('#q').oninput=x=>{const t=x.target.value.toLowerCase().trim();
  v.querySelectorAll('tr.sx-r').forEach(tr=>{const id=tr.dataset.id,mostra=!t||tr.textContent.toLowerCase().includes(t);
   tr.classList.toggle('hide',!mostra);const d=Q('[data-d="'+id+'"]');if(d)d.classList.toggle('hide',!mostra||!ABERTAS.has(id))})}}

const recarrega=()=>{MEMO=new Map();return telaSimples()};

/* ---------------- formulários curtos ---------------- */
async function nova(){
 await loadRefs([{t:'ref',ref:'obras',lab:'nome'}]);
 const O=cache.obras||[];if(!O.length){toast('Cadastre antes uma obra.');return}
 modal('Nova solicitação','<div class="hint">Os campos com <b class="rq">*</b> são obrigatórios.</div>'+
  '<label class="fl" for="x_o">Obra <b class="rq">*</b></label><select id="x_o"><option value="">Selecione…</option>'+O.map(o=>'<option value="'+o.id+'"'+(O.length===1?' selected':'')+'>'+esc(o.nome)+'</option>').join('')+'</select>'+
  '<label class="fl" for="x_n">Número da solicitação <b class="rq">*</b></label><input id="x_n" autocomplete="off"><div class="hint">O mesmo número da requisição no Sienge. Não pode repetir.</div>'+
  '<label class="fl" for="x_d">Data da solicitação <b class="rq">*</b></label><input id="x_d" type="date" value="'+hojeISO()+'">'+
  '<label class="fl" for="x_b">Insumos / informações complementares</label><textarea id="x_b" rows="3" maxlength="1000"></textarea><div class="hint">Texto livre, só para consulta. Os insumos importados do Sienge aparecem sozinhos.</div>',
  'Gravar solicitação',async()=>{
  const o=Q('#x_o').value,n=Q('#x_n').value.trim(),d=Q('#x_d').value,b=Q('#x_b').value.trim();
  if(!o)return 'Escolha a obra.';if(!n)return 'Informe o número da solicitação.';if(!d)return 'Informe a data da solicitação.';
  const{error}=await sb.rpc('sol_simples_criar',{p_obra:o,p_numero:n,p_data:d,p_obs:b||null});
  if(error)return error.code==='23505'?'Este número de solicitação já está cadastrado.':msg(error);
  toast('Solicitação gravada.');recarrega()})}

function aprovar(s){if(!s)return;
 modal('Registrar aprovação — Solicitação '+esc(s.numero_sienge||'(sem número)'),
  '<label class="fl" for="x_a">Data da aprovação <b class="rq">*</b></label><input id="x_a" type="date" value="'+hojeISO()+'" min="'+s.data_solicitacao+'"><div class="hint">Data em que a solicitação foi aprovada.</div>',
  'Registrar aprovação',async()=>{
  const d=Q('#x_a').value;if(!d)return 'Informe a data da aprovação.';
  if(!confirm('Confirmar a aprovação em '+fd(d)+'?'))return 'Nada foi gravado.';
  const{error}=await sb.rpc('sol_simples_aprovar',{p_solic:s.id,p_data:d});if(error)return msg(error);
  toast('Aprovação registrada.');recarrega()})}

function pedido(s){if(!s)return;
 modal('Registrar pedido de compra — Solicitação '+esc(s.numero_sienge||'(sem número)'),
  '<label class="fl" for="x_pn">Número do pedido de compra <b class="rq">*</b></label><input id="x_pn" autocomplete="off"><div class="hint">O número do pedido no Sienge. Não pode repetir nesta solicitação.</div>'+
  '<label class="fl" for="x_pd">Data do pedido de compra <b class="rq">*</b></label><input id="x_pd" type="date" value="'+hojeISO()+'" min="'+(s.data_aprovacao||'')+'">',
  'Registrar pedido',async()=>{
  const n=Q('#x_pn').value.trim(),d=Q('#x_pd').value;
  if(!n)return 'Informe o número do pedido.';if(!d)return 'Informe a data do pedido.';
  if(!confirm('Confirmar o pedido '+n+' em '+fd(d)+'?'))return 'Nada foi gravado.';
  const{error}=await sb.rpc('sol_simples_pedido',{p_solic:s.id,p_numero:n,p_data:d});
  if(error)return error.code==='23505'?'Este número de pedido já está registrado nesta solicitação.':msg(error);
  toast('Pedido registrado.');recarrega()})}

function editar(s){if(!s)return;
 modal('Editar solicitação',
  '<label class="fl" for="x_en">Número da solicitação</label><input id="x_en" value="'+esc(s.numero_sienge||'')+'"><div class="hint">Não pode repetir.</div>'+
  '<label class="fl" for="x_eb">Insumos / informações complementares</label><textarea id="x_eb" rows="3" maxlength="1000">'+esc(s.observacao||'')+'</textarea>',
  'Salvar alterações',async()=>{
  const n=Q('#x_en').value.trim();if(!n)return 'Informe o número da solicitação.';
  if(!confirm('Salvar as alterações?'))return 'Nada foi alterado.';
  const{error}=await sb.from('solicitacoes').update({numero_sienge:n,observacao:Q('#x_eb').value.trim()||null}).eq('id',s.id);
  if(error)return error.code==='23505'?'Este número de solicitação já está cadastrado.':msg(error);
  toast('Alterações salvas.');recarrega()})}

/* ---------------- Painel: some o que dependia de material e de recebimento ---------------- */
function limpaPainel(){
 const v=Q('#view');if(!v||cur!=='painel')return;
 const c=cfg(),ocultar=[];
 if(c.simples)ocultar.push('Aguardando recebimento','Recebimentos com divergência','Unidades divergentes');
 if(!c.mat)ocultar.push('Materiais abaixo do mínimo','Materiais abaixo do estoque mínimo');
 if(!ocultar.length)return;
 v.querySelectorAll('.pn-kpi,.pn-al').forEach(el=>{const t=el.textContent.trim();if(ocultar.some(x=>t.startsWith(x))&&!el.hidden){el.hidden=true;el.style.display='none'}})}
const vw=Q('#view');if(vw)new MutationObserver(limpaPainel).observe(vw,{childList:true,subtree:true});

/* ---------------- tela do administrador: as duas chaves ---------------- */
async function telaCfg(){
 cur='cfg_modulos';mark();estilo();
 const v=Q('#view');v.innerHTML='<h1>Módulos e escopo</h1><p class="sub">Carregando…</p>';
 if(!adm()){v.innerHTML='<h1>Módulos e escopo</h1><div class="err">Somente o administrador MASTERS acessa esta tela.</div>';return}
 await lerCfg();
 if(!CFG.lido){v.innerHTML='<h1>Módulos e escopo</h1><div class="err">As chaves ainda não existem no banco. Rode o SQL 23 (banco/23_modo_simplificado.sql) no Supabase.</div>';return}
 const I=CFG.info,quando=r=>r&&r.atualizado_em?new Date(r.atualizado_em).toLocaleString('pt-BR'):'—';
 const cartao=(titulo,ativo,rotulo,texto,botao,chave,valor,r)=>'<div class="card"><div class="sx-cfg"><h3>'+titulo+'</h3><span class="chip '+(ativo?'blue':'')+'">'+rotulo+'</span></div>'+
  '<p>'+texto+'</p><p class="hint">Última alteração: '+quando(r)+(r&&r.motivo?'. Motivo: '+esc(r.motivo):'')+'</p>'+
  '<div class="acts"><button class="btn" type="button" data-cfg="'+chave+'|'+valor+'">'+botao+'</button></div></div>';
 v.innerHTML='<h1>Módulos e escopo</h1><p class="sub">Chaves controladas e reversíveis, somente do administrador. Nada é apagado ao mudar: tabelas, registros e histórico continuam guardados, e cada mudança fica na auditoria.</p>'+
  cartao('Módulo Materiais',CFG.mat,CFG.mat?'Ativo':'Inativo',
   CFG.mat?'Materiais está disponível no menu, com cadastros, estoque e recebimento de materiais.':'Materiais está fora do menu e o banco bloqueia novos cadastros e movimentações de materiais. Os dados, os históricos e os vínculos com solicitações, malas e malões continuam guardados. Os insumos das solicitações continuam aparecendo como observação.',
   CFG.mat?'Inativar módulo Materiais':'Reativar módulo Materiais','modulo_materiais',CFG.mat?'inativo':'ativo',I.modulo_materiais)+
  cartao('Solicitações e pedidos',!CFG.simples,CFG.simples?'Modo simples':'Modo completo',
   CFG.simples?'Mostra só o número da solicitação, a data da solicitação, a data da aprovação e a data do pedido de compra, com os insumos em um botão + de consulta.':'Modo completo anterior: itens, quantidades, atendimento, prazo, recebimento e unidades.',
   CFG.simples?'Voltar ao modo completo':'Usar o modo simples','solicitacoes_modo',CFG.simples?'completo':'simples',I.solicitacoes_modo);
 v.querySelectorAll('[data-cfg]').forEach(b=>b.onclick=()=>trocar(b.dataset.cfg.split('|')))}

function trocar([chave,valor]){
 const nome=chave==='modulo_materiais'?'Módulo Materiais':'Solicitações e pedidos',acao=valor==='ativo'?'reativar':valor==='inativo'?'inativar':valor==='simples'?'usar o modo simples em':'voltar ao modo completo em';
 modal('Confirmar mudança','<p>Você vai <b>'+acao+'</b> «'+nome+'». Nenhum dado é apagado e dá para desfazer depois.</p>'+
  '<label class="fl" for="x_m">Motivo <b class="rq">*</b></label><textarea id="x_m" rows="3" maxlength="300"></textarea><div class="hint">Fica registrado na auditoria.</div>','Confirmar',async()=>{
  const m=Q('#x_m').value.trim();if(m.length<5)return 'Informe o motivo (mínimo 5 letras).';
  const{error}=await sb.rpc('config_definir',{p_chave:chave,p_valor:valor,p_motivo:m});if(error)return msg(error);
  await lerCfg();MEMO=new Map();toast('Configuração gravada.');menu();mark();telaCfg()})}

window.__escopo={get cfg(){return cfg()},lerCfg,telaSimples,telaCfg};
}())}catch(e){window.__escopoErro=e;console.error('Escopo simplificado não carregou:',e);
 const av=()=>{const t=document.getElementById('toast');if(t){t.textContent='Escopo simplificado não carregou: '+e.message;t.classList.add('on')}};
 if(document.readyState==='complete')av();else window.addEventListener('load',av)}
