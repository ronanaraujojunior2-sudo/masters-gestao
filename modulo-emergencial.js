/* MASTERS GESTÃO - Autorização emergencial em pedidos de compra (tela "Solicitações e pedidos").
   Precisa do SQL 13 no Supabase. Sem ele, este arquivo não faz nada e o sistema continua como antes.
   O que faz:
   1) Na requisição aberta: mostra, em cada pedido anterior à aprovação formal, a situação (Autorizado emergencialmente /
      Pendente de regularização), responsável, data, justificativa, quem registrou e quando, e o histórico de alterações.
      O administrador MASTERS pode consultar e editar (cada edição fica no histórico).
   2) "Registrar pedido": a data do pedido pode ser anterior à aprovação; nesse caso a tela avisa e pede a autorização emergencial
      (ou permite registrar como Pendente de regularização).
   3) Aviso na lista: quantos pedidos estão pendentes de regularização.
   A autorização emergencial NUNCA altera a aprovação formal da requisição e NUNCA mexe no estoque. */
try{(function(){
const dt=d=>d?new Date(d+'T00:00').toLocaleDateString('pt-BR'):'—';
const dh=d=>d?new Date(d).toLocaleString('pt-BR'):'—';
const hojeMN=()=>new Date(Date.now()-4*3600e3).toISOString().slice(0,10);   /* hoje em Manaus */
const isAdm=()=>!!(me&&me.perfil==='MASTERS');
const nf=n=>Number(n).toLocaleString('pt-BR',{maximumFractionDigits:3});
const sit=p=>!p.antes_aprovacao?'':(p.emerg_autorizada?'Autorizado emergencialmente':'Pendente de regularização');

function estilo(){if(document.getElementById('em2_css'))return;const s=document.createElement('style');s.id='em2_css';
 s.textContent='.em2{background:var(--soft);border:1px solid var(--line);border-radius:10px;padding:10px 12px;margin-top:8px}.em2 .hint{display:block}.em2 .l{margin:2px 0}'+
  '.em2 details{margin-top:6px}.em2 summary{cursor:pointer;min-height:32px;display:flex;align-items:center}.em2 .h{border-top:1px solid var(--line);padding:6px 0;font-size:13px}'+
  '.em2 .mini{margin-top:6px;margin-right:6px}.em-av2{color:var(--ink);font-weight:700;border-left:4px solid var(--red);padding-left:8px;margin-bottom:4px}.em2 .rq,.em-f2 .rq{color:var(--ink)}'+
  '.em-f2 label.o{display:flex;gap:10px;align-items:flex-start;margin:8px 0;cursor:pointer;font-weight:400}.em-f2 input[type=radio]{width:22px;height:22px;min-height:22px;flex:0 0 22px;margin-top:2px}'+
  '.em-f2 .c{margin:4px 0 8px 32px}.em-f2 .c label{display:block;margin-top:6px;font-weight:600}.em-f2 .c input,.em-f2 .c textarea{width:100%}'+
  '#em_pnl{margin:10px 0;display:flex;gap:12px;align-items:center;flex-wrap:wrap}#em_pnl .t{flex:1 1 240px;min-width:0}';
 document.head.appendChild(s)}

/* ---------- formulário da autorização (usado no cadastro manual e na edição) ---------- */
function formAut(pre,v){v=v||{};const sel=v.sel||'';
 return '<div class="em-f2" id="'+pre+'_box">'+
  '<label class="o"><input type="radio" name="'+pre+'_r" value="sim"'+(sel==='sim'?' checked':'')+'><span><b>Houve autorização emergencial.</b> Informe quem autorizou e por quê.</span></label>'+
  '<div class="c'+(sel==='sim'?'':' hide')+'" id="'+pre+'_c"><label>Responsável pela autorização <b class="rq">*</b><input id="'+pre+'_resp" maxlength="120" value="'+esc(v.responsavel||'')+'"></label>'+
  '<label>Data da autorização <b class="rq">*</b><input id="'+pre+'_dt" type="date" max="'+hojeMN()+'" value="'+esc(v.data||'')+'"></label>'+
  '<label>Justificativa (motivo da compra ou retirada imediata) <b class="rq">*</b><textarea id="'+pre+'_jus" rows="3" maxlength="500">'+esc(v.justificativa||'')+'</textarea></label></div>'+
  '<label class="o"><input type="radio" name="'+pre+'_r" value="nao"'+(sel==='nao'?' checked':'')+'><span><b>Não há autorização emergencial registrada.</b> O pedido fica como “Pendente de regularização” (não é tratado como aprovado nem como irregular).</span></label></div>'}
function ligaForm(pre){document.querySelectorAll('input[name="'+pre+'_r"]').forEach(r=>r.onchange=()=>{const c=document.getElementById(pre+'_c');if(c)c.classList.toggle('hide',r.value!=='sim')})}
function lerForm(pre){const r=document.querySelector('input[name="'+pre+'_r"]:checked');if(!r)return{erro:'Escolha uma opção de autorização emergencial.'};
 if(r.value==='nao')return{dados:{autorizada:false}};
 const resp=document.getElementById(pre+'_resp').value.trim(),d=document.getElementById(pre+'_dt').value,j=document.getElementById(pre+'_jus').value.trim();
 if(resp.length<3)return{erro:'Informe o responsável pela autorização.'};if(!d)return{erro:'Informe a data da autorização.'};if(d>hojeMN())return{erro:'A data da autorização não pode estar no futuro.'};
 if(j.length<5)return{erro:'Escreva a justificativa (mínimo 5 letras).'};
 return{dados:{autorizada:true,responsavel:resp,data:d,justificativa:j}}}
const reabrir=id=>{if(typeof abrir==='function')abrir(id)};
const semSql=e=>!!e&&(['42703','42P01','42883','PGRST204','PGRST205','PGRST202'].includes(e.code)||/emerg|antes_aprovacao|schema cache|does not exist/i.test(e.message||''));
const erroTxt=e=>semSql(e)?'Falta instalar o SQL 13 no Supabase (autorização emergencial).':msg(e);

/* ---------- 1) requisição aberta: mostra a autorização em cada pedido ---------- */
function blocoPedido(p,hs,s){const H=hs.filter(h=>h.pedido_id===p.id),reg=H.filter(h=>h.acao==='Registro').slice(-1)[0]||H[H.length-1];
 const aut=!!p.emerg_autorizada,c=aut?'blue':'red';
 let h='<div class="em2" data-emp="'+p.id+'"><div><span class="chip red">Compra anterior à aprovação formal</span> <span class="chip '+c+'">'+sit(p)+'</span></div>'+
  '<div class="l">Data do pedido: <b>'+dt(p.data_pedido)+'</b> · Aprovação formal da requisição: <b>'+dt(s.data_aprovacao)+'</b></div>';
 if(aut)h+='<div class="l"><b>Responsável pela autorização:</b> '+esc(p.emerg_responsavel)+'<br><b>Data da autorização:</b> '+dt(p.emerg_data)+'<br><b>Justificativa:</b> '+esc(p.emerg_justificativa)+'</div>';
 else h+='<div class="l">Sem autorização emergencial registrada. '+(p.emerg_justificativa?'<br><b>Justificativa:</b> '+esc(p.emerg_justificativa):'')+'</div>';
 h+='<span class="hint">'+(p.emerg_registrado_em?'Registrado por '+esc((reg&&reg.usuario_nome)||'usuário do sistema')+' em '+dh(p.emerg_registrado_em)+'. ':'')+'A autorização emergencial é um registro à parte: não substitui nem altera a aprovação formal.</span>';
 if(isAdm())h+='<button type="button" class="mini" data-emed="'+p.id+'">Consultar / editar autorização</button>';
 if(H.length)h+='<details><summary>Histórico da autorização ('+H.length+')</summary>'+H.slice().reverse().map(x=>{const d=x.depois||{},a=x.antes;
  return '<div class="h"><b>'+esc(x.acao)+'</b> · '+dh(x.em)+' · '+esc(x.usuario_nome||'usuário do sistema')+'<br>'+(d.autorizada?'Autorização emergencial: <b>Sim</b> · '+esc(d.responsavel||'')+' · '+dt(d.data)+' · '+esc(d.justificativa||''):'Autorização emergencial: <b>Não</b> (pendente de regularização)'+(d.justificativa?' · '+esc(d.justificativa):''))+
   (a?'<br><span class="hint">Antes: '+(a.autorizada?'Sim · '+esc(a.responsavel||'')+' · '+dt(a.data)+' · '+esc(a.justificativa||''):'Não')+'</span>':'')+'</div>'}).join('')+'</details>';
 return h+'</div>'}

async function realcar(){
 const d=document.getElementById('dlg');if(!d||!d.open)return;const h=d.querySelector('h2');
 if(!h||h.dataset.em||!/^Requisição /.test(h.textContent))return;
 const num=h.textContent.replace(/^Requisição\s+/,'').trim();if(!num||num[0]==='(')return;
 h.dataset.em='1';
 const{data:ss,error:e1}=await sb.from('solicitacoes').select('id,numero_sienge,data_aprovacao,status,obra_id').eq('numero_sienge',num).limit(2);
 if(e1||!ss||ss.length!==1)return;const s=ss[0];
 const{data:ps,error:e2}=await sb.from('pedidos_compra').select('id,numero_pedido,data_pedido,antes_aprovacao,emerg_autorizada,emerg_responsavel,emerg_data,emerg_justificativa,emerg_registrado_por,emerg_registrado_em').eq('solicitacao_id',s.id);
 if(e2||!ps)return;                       /* SQL 13 ainda não instalado: nada muda na tela */
 let hs=[];if(ps.length){const q=await sb.from('pedido_emerg_historico').select('*').in('pedido_id',ps.map(p=>p.id)).order('em',{ascending:true});hs=q.data||[]}
 if(!d.open||d.querySelector('h2')!==h)return;
 estilo();
 d.querySelectorAll('.mv').forEach(mv=>{const b=mv.querySelector(':scope > b'),m=b&&/^Pedido (.+)$/.exec(b.textContent);if(!m||mv.querySelector('.em2'))return;
  const p=ps.find(x=>String(x.numero_pedido)===m[1]);if(!p||!p.antes_aprovacao)return;
  const ph=hs.filter(x=>x.pedido_id===p.id);mv.insertAdjacentHTML('beforeend',blocoPedido(p,ph,s))});
 d.querySelectorAll('[data-emed]').forEach(bt=>bt.onclick=()=>editarAut(ps.find(x=>x.id===bt.dataset.emed),s));
 /* "Registrar pedido": troca pelo cadastro que aceita data anterior à aprovação */
 const bp=d.querySelector('#b_pd');
 if(bp&&!bp.dataset.em){const nb=bp.cloneNode(true);nb.dataset.em='1';bp.replaceWith(nb);nb.onclick=()=>novoPedido(s)}}

/* ---------- 2) administrador consulta / edita ---------- */
function editarAut(p,s){if(!p)return;if(!isAdm()){toast('Somente o administrador MASTERS edita a autorização emergencial.');return}
 const v={sel:p.emerg_autorizada?'sim':'nao',responsavel:p.emerg_responsavel,data:p.emerg_data,justificativa:p.emerg_justificativa};
 modal('Autorização emergencial — Pedido '+esc(p.numero_pedido),
  '<p>Data do pedido: <b>'+dt(p.data_pedido)+'</b> · Aprovação formal da requisição: <b>'+dt(s.data_aprovacao)+'</b></p>'+
  '<div class="hint">Alterar aqui não muda a aprovação formal nem as datas do pedido. O que estava registrado antes continua guardado no histórico.</div>'+formAut('ea',v),'Salvar autorização',async()=>{
  const r=lerForm('ea');if(r.erro)return r.erro;const x=r.dados;
  if(!confirm('Salvar a autorização emergencial do pedido '+p.numero_pedido+'?\nO registro anterior continua no histórico.'))return 'Nada foi gravado.';
  const{error}=await sb.rpc('definir_autorizacao_emergencial',{p_pedido:p.id,p_autorizada:x.autorizada,p_responsavel:x.responsavel||null,p_data:x.data||null,p_justificativa:x.justificativa||null});
  if(error)return erroTxt(error);
  toast('Autorização emergencial salva.');setTimeout(()=>reabrir(s.id),0)});
 ligaForm('ea');const mc=document.getElementById('mc');if(mc)mc.onclick=()=>{document.getElementById('dlg').close();reabrir(s.id)}}

/* ---------- 3) cadastro manual do pedido (data pode ser anterior à aprovação) ---------- */
async function novoPedido(s){await loadRefs([{t:'ref',ref:'fornecedores',lab:'nome'}]);
 const F=cache.fornecedores||[];if(!F.length){toast('Cadastre antes o fornecedor em Fornecedores.');return}
 const[a,b]=await Promise.all([sb.from('solicitacao_itens').select('*, materiais(codigo,descricao,unidade)').eq('solicitacao_id',s.id),
  sb.from('pedidos_compra').select('id, pedido_itens(solicitacao_item_id,quantidade)').eq('solicitacao_id',s.id)]);
 if(a.error||b.error){toast(msg(a.error||b.error));return}
 const comp={};b.data.forEach(p=>p.pedido_itens.forEach(x=>comp[x.solicitacao_item_id]=(comp[x.solicitacao_item_id]||0)+Number(x.quantidade)));
 const falta=i=>Number(i.quantidade)-(comp[i.id]||0),pend=a.data.filter(i=>falta(i)>0).sort((x,y)=>x.materiais.descricao.localeCompare(y.materiais.descricao));
 if(!pend.length){toast('Todos os materiais desta requisição já foram comprados.');return}
 modal('Registrar pedido de compra',`<label class="fl" for="np_n">Número do pedido <b class="rq">*</b></label><input id="np_n">
 <label class="fl" for="np_f">Fornecedor <b class="rq">*</b></label><select id="np_f"><option value="">Selecione…</option>${F.map(f=>`<option value="${f.id}">${esc(f.nome)}</option>`).join('')}</select>
 <label class="fl" for="np_d">Data do pedido <b class="rq">*</b></label><input id="np_d" type="date" value="${hojeMN()}">
 <div class="hint">A previsão de chegada será calculada pelo sistema: 5 dias úteis depois da data do pedido, sem fins de semana e feriados cadastrados. Aprovação formal da requisição: <b>${dt(s.data_aprovacao)}</b>.</div>
 <div id="np_em" class="em2 hide"><div class="em-av2">Compra anterior à aprovação formal.</div><div class="hint">O pedido será registrado normalmente e as datas serão mantidas. A autorização emergencial é um registro à parte: não substitui nem altera a aprovação formal.</div>${formAut('np',{})}</div>
 <h3>Quantidade comprada neste pedido</h3><div class="hint">Deixe 0 nos materiais que não entraram neste pedido.</div>
 ${pend.map(i=>`<div class="mv"><b>${esc(i.materiais.descricao)}</b><br><span class="hint">Falta comprar: ${nf(falta(i))} ${esc(i.materiais.unidade)}</span><input id="q_${i.id}" type="number" step="any" min="0" max="${falta(i)}" value="${falta(i)}" inputmode="decimal"></div>`).join('')}`,'Registrar pedido',async()=>{
  const n=$('#np_n').value.trim(),f=$('#np_f').value,d=$('#np_d').value,arr=[];
  if(!n)return 'Informe o número do pedido.';if(!f)return 'Escolha o fornecedor.';if(!d)return 'Informe a data do pedido.';
  pend.forEach(i=>{const q=Number($('#q_'+i.id).value);if(q>0)arr.push({solicitacao_item_id:i.id,quantidade:q})});
  if(!arr.length)return 'Informe a quantidade comprada de pelo menos um material.';
  const antes=d<s.data_aprovacao;let em=null;
  if(antes){const r=lerForm('np');if(r.erro)return r.erro;em=r.dados}
  if(!confirm('Confirmar o registro do pedido '+n+'?'+(antes?'\n\nData anterior à aprovação formal: '+(em.autorizada?'com autorização emergencial de '+em.responsavel+'.':'ficará “Pendente de regularização”.'):'')))return 'Nada foi gravado.';
  const{error}=antes?await sb.rpc('registrar_pedido_emergencial',{p_solic:s.id,p_numero:n,p_fornecedor:f,p_data:d,p_itens:arr,p_emerg:em})
                    :await sb.rpc('registrar_pedido',{p_solic:s.id,p_numero:n,p_fornecedor:f,p_data:d,p_itens:arr});
  if(error)return error.code==='23505'?'Este número de pedido já está registrado nesta solicitação.':erroTxt(error);
  toast('Pedido registrado.');cache={};setTimeout(()=>{if(typeof depois==='function')depois(s.id);else reabrir(s.id)},0)});
 ligaForm('np');
 const di=$('#np_d'),box=$('#np_em'),mostra=()=>box.classList.toggle('hide',!(di.value&&di.value<s.data_aprovacao));
 di.oninput=mostra;di.onchange=mostra;mostra();
 const mc=$('#mc');if(mc)mc.onclick=()=>{$('#dlg').close();reabrir(s.id)}}

/* ---------- 4) aviso na lista: pedidos pendentes de regularização ---------- */
async function painel(){const v=document.getElementById('view'),h=v&&v.querySelector('h1');
 if(!h||h.textContent.trim()!=='Solicitações e pedidos'||h.dataset.em||document.getElementById('em_pnl'))return;h.dataset.em='1';
 const q=await sb.from('pedidos_compra').select('id',{count:'exact',head:true}).eq('antes_aprovacao',true).or('emerg_autorizada.is.null,emerg_autorizada.eq.false');
 if(q.error||!q.count)return;
 const alvo=v.querySelector('.bar');if(!alvo||document.getElementById('em_pnl')||v.querySelector('h1')!==h)return;estilo();
 alvo.insertAdjacentHTML('beforebegin','<div class="card" id="em_pnl"><div class="t"><b>'+q.count+' pedido(s) pendente(s) de regularização</b><span class="hint" style="display:block">Compras feitas antes da aprovação formal e ainda sem autorização emergencial registrada.</span></div><button type="button" class="sec" id="em_ver">Ver pedidos</button></div>');
 document.getElementById('em_ver').onclick=listaPend}
async function listaPend(){
 const{data,error}=await sb.from('pedidos_compra').select('id,numero_pedido,data_pedido,solicitacao_id,fornecedores(nome),solicitacoes(numero_sienge,data_aprovacao)').eq('antes_aprovacao',true).or('emerg_autorizada.is.null,emerg_autorizada.eq.false').order('data_pedido',{ascending:false}).limit(300);
 if(error){toast(erroTxt(error));return}
 modal('Pedidos pendentes de regularização',(data&&data.length?data.map(p=>'<div class="mv"><b>Pedido '+esc(p.numero_pedido)+'</b> — requisição '+esc(p.solicitacoes?p.solicitacoes.numero_sienge:'—')+'<br>'+esc(p.fornecedores?p.fornecedores.nome:'—')+'<br>Pedido em '+dt(p.data_pedido)+' · aprovação formal em '+dt(p.solicitacoes&&p.solicitacoes.data_aprovacao)+'<br><button type="button" class="mini" data-emab="'+p.solicitacao_id+'">Abrir requisição</button></div>').join(''):'<p class="empty">Nenhum pedido pendente.</p>')+'<p class="hint">Para regularizar, abra a requisição: o administrador MASTERS registra a autorização emergencial no pedido.</p>',null);
 document.querySelectorAll('[data-emab]').forEach(b=>b.onclick=()=>reabrir(b.dataset.emab))}

/* ---------- ligação ---------- */
const tick=()=>{try{realcar().catch(()=>{});painel().catch(()=>{})}catch(e){}};
const dlg=document.getElementById('dlg'),vw=document.getElementById('view');
if(dlg)new MutationObserver(tick).observe(dlg,{childList:true,subtree:true,attributes:true,attributeFilter:['open']});
if(vw)new MutationObserver(tick).observe(vw,{childList:true,subtree:true});
window.__emergTeste={sit,formAut,lerForm,blocoPedido};
})()}catch(e){window.__emergErro=e;console.error('Autorização emergencial não carregou:',e)}
