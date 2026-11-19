/* MASTERS GESTÃO - Transferência de ferramentas entre obras (dentro da tela Ferramentas; não cria menu novo).
   Precisa do SQL 18 no Supabase. Sem ele, os botões aparecem mas avisam que falta instalar o SQL 18 (nada é gravado).
   O que faz:
   - Botão "Transferir" em cada ferramenta disponível e botão "Transferir ferramentas" (várias de uma vez) no topo da tela.
   - Botão "Transferências": lista Pendentes, Concluídas e Canceladas, com quem solicitou, autorizou, confirmou ou cancelou.
   - A ferramenta continua sendo a MESMA (mesmo código e histórico). Só muda de obra quando a obra de destino confirma o recebimento.
   - A obra da ferramenta não pode mais ser trocada pelo formulário de edição: só por transferência.
   - ASSISTENTE DE ENGENHARIA (SQL 22): não transfere direto. Ele SOLICITA (situação "Solicitada", nada é movido) e o gestor da obra de origem AUTORIZA;
     só depois o destino confirma o recebimento. O banco confere tudo; a tela só mostra os botões certos.
   Carregar DEPOIS do script principal do index.html e dos demais módulos. */
try{(function(){
const isAdm=()=>!!(me&&me.perfil==='MASTERS');
const hojeMN=()=>new Date(Date.now()-4*3600e3).toISOString().slice(0,10);   /* hoje em Manaus */
const dt=d=>d?new Date(String(d).slice(0,10)+'T00:00').toLocaleDateString('pt-BR'):'—';
const dh=d=>d?new Date(d).toLocaleString('pt-BR'):'—';
const uid=()=>{try{return crypto.randomUUID()}catch(x){return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0;return (c==='x'?r:(r&3|8)).toString(16)})}};
const semSql=e=>/Could not find the function|schema cache|does not exist|Could not find the table/i.test((e&&e.message)||'');
const erroTxt=e=>semSql(e)?(/solicitar_transferencia|autorizar_transferencia|eh_assistente/i.test((e&&e.message)||'')?'Falta instalar o SQL 22 no Supabase (perfil Assistente de Engenharia). Nada foi gravado.':'Falta instalar o SQL 18 no Supabase (transferência de ferramentas). Nada foi gravado.'):msg(e);
const podeAgir=()=>!!(me&&me.perfil!=='FUNCIONARIO');
const ehAss=()=>!!(me&&me.assistente);                 /* Assistente de Engenharia: só solicita */
const podeNova=()=>podeAgir()||ehAss();                /* quem pode abrir a janela de nova transferência/solicitação */
const ROT=()=>ehAss()?'Solicitar transferência':'Transferir';

/* obras em que o usuário trabalha (MASTERS: todas) */
let _mo=null,_moId=null;
async function minhasObras(){
 if(isAdm())return null;
 if(_mo&&_moId===me.id)return _mo;
 const{data}=await sb.from('usuario_obras').select('obra_id').eq('usuario_id',me.id);
 _mo=new Set((data||[]).map(x=>x.obra_id));_moId=me.id;return _mo}
const naObra=(S,o)=>S===null||S.has(o);

function estilo(){if(document.getElementById('tf_css'))return;const s=document.createElement('style');s.id='tf_css';
 s.textContent='.tf-l{max-height:240px;overflow:auto;border:1px solid var(--line);border-radius:10px;margin-top:6px}'+
 '.tf-l label{display:flex;gap:10px;align-items:center;min-height:44px;padding:6px 10px;border-bottom:1px solid var(--line);cursor:pointer}'+
 '.tf-l label:last-child{border-bottom:0}.tf-l input{width:22px;min-height:22px;flex:none}'+
 '.tf-tabs{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0}.tf-tabs button{min-height:40px}.tf-tabs .on{background:var(--blue);color:#fff;border-color:var(--blue)}'+
 '.tf-it{border:1px solid var(--line);border-radius:12px;padding:10px 12px;margin:8px 0}.tf-it .acts{margin-top:8px;flex-wrap:wrap}'+
 '.tf-av{border-left:4px solid var(--red);margin:8px 0}';
 document.head.appendChild(s)}

/* ===== lista de ferramentas: botão Transferir em cada linha ===== */
const _acts=acts;
acts=function(n,r){let h=_acts(n,r);
 if(n==='ferramentas'&&podeNova()&&r.situacao==='Disponível')h='<button class="mini" data-tf="'+r.id+'">'+ROT()+'</button>'+h;
 return h};
document.addEventListener('click',e=>{const b=e.target.closest('[data-tf]');if(b)novaTransferencia(b.dataset.tf)});

/* ===== formulário de edição: a obra não muda por aqui; ferramenta em transferência não se edita ===== */
const _form=form;
form=async function(name,row){
 if(name==='ferramentas'&&row&&row.situacao==='Em transferência'){toast('Esta ferramenta está em transferência pendente. Confirme ou cancele a transferência antes de editar.');return}
 const r=await _form(name,row);
 if(name==='ferramentas'&&row){const s=$('#f_obra_id');if(s){s.disabled=true;s.insertAdjacentHTML('afterend','<div class="hint">A obra só muda por transferência. Use o botão Transferir na lista.</div>')}}
 return r};

/* ===== botões no topo e aviso de pendências ===== */
async function aviso(){
 const box=document.getElementById('tf_av');if(!box)return;
 try{const[S,{data,error}]=await Promise.all([minhasObras(),sb.from('transferencias').select('id,status,obra_origem_id,obra_destino_id,solicitado_por').eq('tipo','Ferramenta').in('status',['Pendente','Solicitada'])]);
  if(error)throw error;
  const P=(data||[]).filter(t=>t.status==='Pendente'),Q=(data||[]).filter(t=>t.status==='Solicitada');
  const rec=P.filter(t=>naObra(S,t.obra_destino_id)).length,env=P.filter(t=>!naObra(S,t.obra_destino_id)&&naObra(S,t.obra_origem_id)).length;
  const aut=podeAgir()?Q.filter(t=>naObra(S,t.obra_origem_id)).length:0,minhas=ehAss()?Q.filter(t=>t.solicitado_por===me.id).length:0;
  if(!rec&&!env&&!aut&&!minhas){box.innerHTML='';return}
  box.innerHTML='<div class="card tf-av"><b>'+[aut?aut+' solicitação(ões) aguardando a sua autorização.':'',minhas?minhas+' solicitação(ões) sua(s) aguardando a autorização do gestor.':'',rec?rec+' transferência(s) aguardando a confirmação do recebimento nesta obra.':'',env?env+' enviada(s) aguardando a confirmação do destino.':''].filter(Boolean).join(' ')+'</b> <button class="mini" id="tf_ver">Ver</button></div>';
  document.getElementById('tf_ver').onclick=()=>listaTransferencias()
 }catch(x){box.innerHTML=''}}
function poeBotoes(){
 if(typeof cur==='undefined'||cur!=='ferramentas')return;
 const v=document.getElementById('view');if(!v||document.getElementById('tf_btns'))return;
 const bar=v.querySelector('.bar');if(!bar)return;
 estilo();
 const w=document.createElement('span');w.id='tf_btns';w.style.display='contents';
 w.innerHTML=(podeNova()?'<button class="btn" id="tf_nova" type="button">'+(ehAss()?'Solicitar transferência de ferramentas':'Transferir ferramentas')+'</button>':'')+'<button class="sec" id="tf_lista" type="button">Transferências</button>';
 bar.appendChild(w);
 const av=document.createElement('div');av.id='tf_av';bar.insertAdjacentElement('afterend',av);
 if(document.getElementById('tf_nova'))document.getElementById('tf_nova').onclick=()=>novaTransferencia();
 document.getElementById('tf_lista').onclick=()=>listaTransferencias();
 aviso()}
new MutationObserver(poeBotoes).observe(document.getElementById('view'),{childList:true,subtree:true});poeBotoes();

/* ===== nova transferência ===== */
async function novaTransferencia(pre){
 if(!podeNova()){toast('Seu perfil não pode transferir ferramentas.');return}
 const SOL=ehAss();
 estilo();
 const[ob,de,fu,fe,em]=await Promise.all([
  sb.from('obras').select('id,codigo,nome,status').order('nome'),
  sb.rpc('obras_para_transferencia'),
  sb.from('funcionarios').select('id,nome,matricula,obra_id').eq('situacao','Ativo').order('nome').limit(3000),
  sb.from('ferramentas').select('id,codigo_patrimonial,nome,obra_id,localizacao').eq('situacao','Disponível').order('nome').limit(3000),
  sb.from('itens_recipiente').select('ferramenta_id').not('ferramenta_id','is',null).is('retirado_em',null)]);
 if(de.error){toast(erroTxt(de.error));return}
 const err=ob.error||fu.error||fe.error||em.error;if(err){toast(erroTxt(err));return}
 const S=await minhasObras();
 const emMalao=new Set((em.data||[]).map(x=>x.ferramenta_id));
 const O=(ob.data||[]).filter(o=>(S===null||S.has(o.id))&&o.status!=='Concluída'),D=de.data||[],FU=fu.data||[],FE=(fe.data||[]).filter(f=>!emMalao.has(f.id));
 if(!O.length){toast('Você não tem obra ativa para transferir ferramentas.');return}
 const preF=pre?FE.find(f=>f.id===pre):null;
 const sel=new Set(preF?[preF.id]:[]);
 const chave=uid();
 const opt=(L,v)=>L.map(o=>'<option value="'+o.id+'"'+(o.id===v?' selected':'')+'>'+esc((o.codigo?o.codigo+' - ':'')+o.nome)+'</option>').join('');
 const o0=preF?preF.obra_id:(O.length===1?O[0].id:'');
 modal(SOL?'Solicitar transferência de ferramentas':'Transferir ferramentas',
  (SOL?'<p class="hint"><b>Isto é um pedido.</b> Nenhuma ferramenta é movida agora: o gestor da obra de origem precisa autorizar, e depois o destino confirma o recebimento. Os campos com <b class="rq">*</b> são obrigatórios.</p>':'<p class="hint">A ferramenta só passa a constar na obra de destino depois que o destino confirmar o recebimento. Os campos com <b class="rq">*</b> são obrigatórios.</p>')+
  '<label class="fl" for="tf_o">Obra de origem <b class="rq">*</b></label><select id="tf_o"><option value="">Selecione…</option>'+opt(O,o0)+'</select>'+
  '<label class="fl" for="tf_d">Obra de destino <b class="rq">*</b></label><select id="tf_d"></select>'+
  '<label class="fl" for="tf_q">Ferramentas <b class="rq">*</b></label><input id="tf_q" type="search" placeholder="Pesquisar por nome ou código" aria-label="Pesquisar ferramenta">'+
  '<div class="tf-l" id="tf_l"></div><div class="hint" id="tf_n"></div>'+
  '<label class="fl" for="tf_r">Responsável pela transferência <b class="rq">*</b></label><select id="tf_r"></select><div class="hint">Funcionário ativo da obra de origem que está enviando.</div>'+
  '<label class="fl" for="tf_c">Responsável pelo recebimento no destino</label><input id="tf_c" placeholder="Nome de quem vai receber (opcional)">'+
  '<label class="fl" for="tf_t">Data da movimentação <b class="rq">*</b></label><input id="tf_t" type="date" value="'+hojeMN()+'" max="'+hojeMN()+'">'+
  '<label class="fl" for="tf_b">Observação ou justificativa</label><textarea id="tf_b" rows="2" placeholder="Por que está transferindo (se necessário)"></textarea>',
  SOL?'Enviar solicitação':'Enviar transferência',async()=>{
   const o=$('#tf_o').value,d=$('#tf_d').value,r=$('#tf_r').value,t=$('#tf_t').value;
   if(!o)return 'Escolha a obra de origem.';if(!d)return 'Escolha a obra de destino.';if(o===d)return 'A obra de destino precisa ser diferente da origem.';
   if(!sel.size)return 'Escolha ao menos uma ferramenta.';if(!r)return 'Escolha o responsável pela transferência.';if(!t)return 'Informe a data.';
   const dn=(D.find(x=>x.id===d)||{}).nome||'',on=(O.find(x=>x.id===o)||{}).nome||'';
   if(!confirm(SOL?'Solicitar a transferência de '+sel.size+' ferramenta(s) de "'+on+'" para "'+dn+'"?\nNada é movido até o gestor autorizar.':'Enviar '+sel.size+' ferramenta(s) de "'+on+'" para "'+dn+'"?\nElas ficam "Em transferência" até o destino confirmar o recebimento.'))return 'Nada foi gravado.';
   const{error}=await sb.rpc(SOL?'solicitar_transferencia_ferramentas':'transferir_ferramentas',{p_origem:o,p_destino:d,p_ferramentas:[...sel],p_resp_envio:r,p_resp_receb:$('#tf_c').value.trim()||null,p_data:t,p_obs:$('#tf_b').value.trim()||null,p_chave:chave});
   if(error)return erroTxt(error);
   toast(SOL?'Solicitação registrada. Aguarda a autorização do gestor da obra de origem.':'Transferência registrada. Aguardando confirmação do destino.');cache={};setTimeout(()=>{if(cur==='ferramentas')show('ferramentas')},60)});
 const pintaLista=()=>{const o=$('#tf_o').value,q=$('#tf_q').value.trim().toLowerCase();
  const L=FE.filter(f=>f.obra_id===o&&(!q||(f.nome+' '+f.codigo_patrimonial).toLowerCase().includes(q)));
  $('#tf_l').innerHTML=!o?'<div class="hint" style="padding:10px">Escolha primeiro a obra de origem.</div>':!L.length?'<div class="hint" style="padding:10px">'+(q?'Nenhuma ferramenta com esse nome.':'Nenhuma ferramenta disponível nesta obra. (Ferramentas em uso, em manutenção, em malão ou já em transferência não aparecem.)')+'</div>':
   L.slice(0,80).map(f=>'<label><input type="checkbox" data-f="'+f.id+'"'+(sel.has(f.id)?' checked':'')+'><span><b>'+esc(f.nome)+'</b> <span class="hint">('+esc(f.codigo_patrimonial)+')'+(f.localizacao?' · '+esc(f.localizacao):'')+'</span></span></label>').join('')+(L.length>80?'<div class="hint" style="padding:8px">Mostrando 80 de '+L.length+'. Digite no campo de pesquisa para filtrar.</div>':'');
  $('#tf_l').querySelectorAll('[data-f]').forEach(c=>c.onchange=()=>{c.checked?sel.add(c.dataset.f):sel.delete(c.dataset.f);cont()});cont()};
 const cont=()=>{$('#tf_n').textContent=sel.size?sel.size+' ferramenta(s) selecionada(s).':'Nenhuma ferramenta selecionada.'};
 const pintaObra=()=>{const o=$('#tf_o').value;
  for(const id of [...sel]){const f=FE.find(x=>x.id===id);if(!f||f.obra_id!==o)sel.delete(id)}
  $('#tf_d').innerHTML='<option value="">Selecione…</option>'+opt(D.filter(x=>x.id!==o),'');
  const L=FU.filter(f=>f.obra_id===o);$('#tf_r').innerHTML='<option value="">Selecione…</option>'+L.map(f=>'<option value="'+f.id+'">'+esc(f.nome)+' ('+esc(f.matricula)+')</option>').join('');
  pintaLista()};
 $('#tf_o').onchange=pintaObra;$('#tf_q').oninput=pintaLista;pintaObra()}

/* ===== lista: Solicitadas, Pendentes, Concluídas, Canceladas ===== */
async function listaTransferencias(aba){
 estilo();
 const[S,{data,error}]=await Promise.all([minhasObras(),sb.from('transferencias').select('*, transferencia_itens(*)').eq('tipo','Ferramenta').order('solicitado_em',{ascending:false}).limit(300)]);
 if(error){toast(erroTxt(error));return}
 const T=data||[];
 const cnt=s=>T.filter(t=>t.status===s).length;
 aba=aba||((podeAgir()||ehAss())&&cnt('Solicitada')?'Solicitada':'Pendente');
 const cartao=t=>{const its=(t.transferencia_itens||[]).slice().sort((a,b)=>String(a.codigo_patrimonial).localeCompare(String(b.codigo_patrimonial)));
  const podeConf=podeAgir()&&naObra(S,t.obra_destino_id),podeOrig=podeAgir()&&naObra(S,t.obra_origem_id),minha=ehAss()&&t.solicitado_por===me.id&&naObra(S,t.obra_origem_id);
  const st=t.status==='Concluída'?'<span class="chip blue">Concluída</span>':t.status==='Cancelada'?'<span class="chip red">'+(t.cancelamento_tipo==='Recusada'?'Recusada no destino':'Cancelada')+'</span>':t.status==='Solicitada'?'<span class="chip">Solicitada · aguarda autorização</span>':'<span class="chip">Pendente</span>';
  let h='<div class="tf-it" data-t="'+(t.numero+' '+its.map(i=>i.nome+' '+i.codigo_patrimonial).join(' ')+' '+t.obra_origem_nome+' '+t.obra_destino_nome).toLowerCase().replace(/"/g,'')+'">'+
   '<b>Nº '+t.numero+'</b> '+st+' <span class="hint">· '+dt(t.data_transferencia)+'</span><br>'+
   'De <b>'+esc(t.obra_origem_nome)+'</b> para <b>'+esc(t.obra_destino_nome)+'</b><br>'+
   '<b>'+its.length+' ferramenta(s):</b> '+its.map(i=>esc(i.nome)+' <span class="hint">('+esc(i.codigo_patrimonial)+')</span>').join(', ')+'<br>'+
   '<span class="hint">Responsável pela transferência: '+esc(t.resp_envio_nome||'—')+' · Responsável pelo recebimento: '+esc(t.resp_receb_nome||'—')+'<br>'+
   'Solicitada por '+esc(t.solicitado_por_nome||'—')+' em '+dh(t.solicitado_em)+(t.status==='Solicitada'?' · <b>Aguardando autorização do gestor da obra de origem</b> (nada foi movido)':' · Autorizada por '+esc(t.autorizado_por_nome||'—')+' em '+dh(t.autorizado_em))+
   (t.observacao?'<br>Observação: '+esc(t.observacao):'')+'</span>';
  if(t.status==='Concluída')h+='<br><span class="hint">Recebimento confirmado por '+esc(t.confirmado_por_nome||'—')+' em '+dh(t.confirmado_em)+(t.localizacao_destino?' · Local: '+esc(t.localizacao_destino):'')+(t.obs_confirmacao?' · '+esc(t.obs_confirmacao):'')+'</span>';
  if(t.status==='Cancelada')h+='<br><span class="hint">'+(t.cancelamento_tipo==='Recusada'?'Recusada no destino':'Cancelada')+' por '+esc(t.cancelado_por_nome||'—')+' em '+dh(t.cancelado_em)+'. Motivo: '+esc(t.motivo_cancelamento||'—')+'. As ferramentas continuaram na obra de origem.</span>';
  if(t.status==='Solicitada'&&(podeOrig||minha)){h+='<div class="acts">'+(podeOrig?'<button class="btn" data-ta="'+t.id+'">Autorizar transferência</button>':'')+'<button class="sec" data-tx="'+t.id+'">'+(minha&&!podeOrig?'Cancelar minha solicitação':'Recusar solicitação')+'</button></div>'}
  if(t.status==='Pendente'&&(podeConf||podeOrig)){h+='<div class="acts">'+(podeConf?'<button class="btn" data-tc="'+t.id+'">Confirmar recebimento</button>':'')+(podeOrig||podeConf?'<button class="sec" data-tx="'+t.id+'">'+(podeOrig?'Cancelar transferência':'Recusar')+'</button>':'')+'</div>'}
  return h+'</div>'};
 const L=T.filter(t=>t.status===aba);
 modal('Transferências de ferramentas',
  '<div class="tf-tabs">'+['Solicitada','Pendente','Concluída','Cancelada'].map(s=>'<button class="sec'+(s===aba?' on':'')+'" data-ab="'+s+'" type="button">'+(s==='Solicitada'?'Solicitadas':s==='Pendente'?'Pendentes':s==='Concluída'?'Concluídas':'Canceladas')+' ('+cnt(s)+')</button>').join('')+'</div>'+
  '<input id="tf_bq" type="search" placeholder="Pesquisar por número, ferramenta ou obra" aria-label="Pesquisar">'+
  (L.length?L.map(cartao).join(''):'<p class="empty">Nenhuma transferência '+(aba==='Solicitada'?'solicitada':aba==='Pendente'?'pendente':aba==='Concluída'?'concluída':'cancelada')+'.</p>'),null);
 document.querySelectorAll('[data-ab]').forEach(b=>b.onclick=()=>listaTransferencias(b.dataset.ab));
 $('#tf_bq').oninput=x=>{const q=x.target.value.toLowerCase().trim();document.querySelectorAll('.tf-it').forEach(el=>el.classList.toggle('hide',!!q&&!el.dataset.t.includes(q)))};
 document.querySelectorAll('[data-tc]').forEach(b=>b.onclick=()=>confirmar(T.find(t=>t.id===b.dataset.tc)));
 document.querySelectorAll('[data-ta]').forEach(b=>b.onclick=()=>autorizar(T.find(t=>t.id===b.dataset.ta)));
 document.querySelectorAll('[data-tx]').forEach(b=>b.onclick=()=>cancelar(T.find(t=>t.id===b.dataset.tx),S))}

function autorizar(t){
 modal('Autorizar transferência nº '+t.numero,
  '<p>Você está <b>autorizando</b> o envio das ferramentas abaixo de <b>'+esc(t.obra_origem_nome)+'</b> para <b>'+esc(t.obra_destino_nome)+'</b>, pedido por <b>'+esc(t.solicitado_por_nome||'—')+'</b>. Elas ficam "Em transferência" até o destino confirmar o recebimento.</p>'+
  (t.transferencia_itens||[]).map(i=>'<div class="mv">'+esc(i.nome)+' <span class="hint">('+esc(i.codigo_patrimonial)+')</span></div>').join(''),
  'Autorizar transferência',async()=>{
   if(!confirm('Autorizar esta transferência? Ficará registrado que foi você.'))return 'Nada foi gravado.';
   const{error}=await sb.rpc('autorizar_transferencia',{p_id:t.id});
   if(error)return erroTxt(error);
   toast('Transferência autorizada. Aguardando a confirmação do destino.');cache={};setTimeout(()=>{if(cur==='ferramentas')show('ferramentas');listaTransferencias('Pendente')},60)})}

function confirmar(t){
 modal('Confirmar recebimento nº '+t.numero,
  '<p>Você está confirmando que as ferramentas abaixo <b>chegaram</b> em <b>'+esc(t.obra_destino_nome)+'</b>. Depois disso elas passam a constar nesta obra.</p>'+
  (t.transferencia_itens||[]).map(i=>'<div class="mv">'+esc(i.nome)+' <span class="hint">('+esc(i.codigo_patrimonial)+')</span></div>').join('')+
  '<label class="fl" for="tc_l">Localização na obra de destino</label><input id="tc_l" placeholder="Ex.: almoxarifado, container 2 (opcional)">'+
  '<label class="fl" for="tc_o">Observação</label><input id="tc_o" placeholder="Ex.: chegou com a caixa amassada (opcional)">',
  'Confirmar recebimento',async()=>{
   if(!confirm('Confirmar que as ferramentas chegaram nesta obra?'))return 'Nada foi gravado.';
   const{error}=await sb.rpc('confirmar_transferencia',{p_id:t.id,p_localizacao:$('#tc_l').value.trim()||null,p_obs:$('#tc_o').value.trim()||null});
   if(error)return erroTxt(error);
   toast('Recebimento confirmado. As ferramentas agora constam nesta obra.');cache={};setTimeout(()=>{if(cur==='ferramentas')show('ferramentas');listaTransferencias('Concluída')},60)})}

function cancelar(t,S){
 const origem=podeAgir()&&naObra(S,t.obra_origem_id),pedido=t.status==='Solicitada';
 if(pedido){
  const minha=ehAss()&&!origem;
  return modal((minha?'Cancelar solicitação':'Recusar solicitação')+' nº '+t.numero,
   '<p>Nenhuma ferramenta foi movida: elas continuam disponíveis em <b>'+esc(t.obra_origem_nome)+'</b>. O motivo fica registrado.</p>'+
   '<label class="fl" for="tx_m">Motivo <b class="rq">*</b></label><textarea id="tx_m" rows="2" placeholder="Explique em poucas palavras"></textarea>',
   minha?'Cancelar solicitação':'Recusar solicitação',async()=>{
    const m=$('#tx_m').value.trim();if(m.length<5)return 'Informe o motivo (pelo menos 5 letras).';
    if(!confirm((minha?'Cancelar':'Recusar')+' a solicitação nº '+t.numero+'?'))return 'Nada foi gravado.';
    const{error}=await sb.rpc('cancelar_transferencia',{p_id:t.id,p_motivo:m});
    if(error)return erroTxt(error);
    toast('Solicitação '+(minha?'cancelada':'recusada')+'. Nenhuma ferramenta foi movida.');cache={};setTimeout(()=>{if(cur==='ferramentas')show('ferramentas');listaTransferencias('Cancelada')},60)})}
 modal((origem?'Cancelar':'Recusar')+' transferência nº '+t.numero,
  '<p>'+(origem?'As ferramentas voltam a ficar disponíveis em <b>'+esc(t.obra_origem_nome)+'</b>.':'Você está recusando o recebimento. As ferramentas continuam em <b>'+esc(t.obra_origem_nome)+'</b>.')+' O motivo fica registrado.</p>'+
  '<label class="fl" for="tx_m">Motivo <b class="rq">*</b></label><textarea id="tx_m" rows="2" placeholder="Explique em poucas palavras"></textarea>',
  origem?'Cancelar transferência':'Recusar transferência',async()=>{
   const m=$('#tx_m').value.trim();if(m.length<5)return 'Informe o motivo (pelo menos 5 letras).';
   if(!confirm((origem?'Cancelar':'Recusar')+' a transferência nº '+t.numero+'?'))return 'Nada foi gravado.';
   const{error}=await sb.rpc('cancelar_transferencia',{p_id:t.id,p_motivo:m});
   if(error)return erroTxt(error);
   toast('Transferência '+(origem?'cancelada':'recusada')+'. As ferramentas continuam na obra de origem.');cache={};setTimeout(()=>{if(cur==='ferramentas')show('ferramentas');listaTransferencias('Cancelada')},60)})}

window.__tfTeste={novaTransferencia,listaTransferencias,confirmar,autorizar,cancelar,poeBotoes};
}())}catch(e){window.__tfErro=e;console.error('Transferência de ferramentas:',e)}
