/* MASTERS GESTÃO - Módulo 3B-3: Solicitações, pedidos de compra e feriados.
   Antes de usar, rode no Supabase o SQL da parte de compras. */

E.feriados={p:'Feriados',btn:'Cadastrar feriado',vazio:'Nenhum feriado cadastrado ainda.',adm:1,cols:['data','descricao','escopo','obra_id'],f:[
 {k:'data',l:'Data',r:1,t:'date'},{k:'descricao',l:'Descrição',r:1},
 {k:'escopo',l:'Tipo',r:1,t:'sel',o:['Nacional','Estadual','Municipal','Empresa'],d:'Nacional'},
 {k:'obra_id',l:'Obra',t:'ref',ref:'obras',lab:'nome',h:'Preencha só se o feriado vale para uma obra específica. Em branco, vale para todas.'}]};

const hoje=()=>new Date().toLocaleDateString('sv-SE');
const dt=d=>d?new Date(d+'T00:00').toLocaleDateString('pt-BR'):'—';
const dh=d=>new Date(d).toLocaleString('pt-BR');
const nmRef=(k,id)=>{const r=(cache[k]||[]).find(x=>x.id===id);return r?esc(r.nome):'—'};
const FECHADA=['Concluída','Cancelada'];
const REFS=[{t:'ref',ref:'obras',lab:'nome'},{t:'ref',ref:'funcionarios',lab:'nome'}];
const depois=id=>{telaSol();setTimeout(()=>abrir(id),500)};

/* menu */
const _menu3=menu;
menu=function(){_menu3();const m=$('#menu');
 const s=[...m.querySelectorAll('.soon')].find(x=>x.textContent==='Solicitações e pedidos');if(s)s.remove();
 const h=[...m.querySelectorAll('h4')].find(x=>x.textContent==='Em breve');
 if(h)h.insertAdjacentHTML('beforebegin','<h4>Compras</h4><button class="nav" data-v="solicitacoes">Solicitações e pedidos</button><button class="nav" data-v="feriados">Feriados</button>');
 m.querySelectorAll('.nav').forEach(n=>n.onclick=()=>{const v=n.dataset.v;v==='painel'?painel():v==='consulta'?consulta():v==='solicitacoes'?telaSol():show(v)})};

/* lista */
async function telaSol(){cur='solicitacoes';mark();const v=$('#view');
 v.innerHTML='<h1>Solicitações e pedidos</h1><p class="sub">Carregando…</p>';
 await loadRefs(REFS);
 const[{data:ss,error},{data:ps}]=await Promise.all([sb.from('solicitacoes').select('*').order('criado_em',{ascending:false}).limit(1000),sb.from('pedidos_compra').select('solicitacao_id,previsao_entrega')]);
 if(error){v.innerHTML='<h1>Solicitações e pedidos</h1><div class="err">'+esc(msg(error))+'</div>';return}
 const prev=id=>{const L=(ps||[]).filter(p=>p.solicitacao_id===id).map(p=>p.previsao_entrega).sort();return L.length?L[L.length-1]:null};
 const rows=ss.map(s=>{const pv=prev(s.id),venc=pv&&pv<hoje()&&!FECHADA.includes(s.status),c=s.status==='Concluída'?'blue':s.status==='Cancelada'?'red':'';
  return `<tr><td><b>${esc(s.numero_sienge||'Sem número')}</b></td><td>${nmRef('obras',s.obra_id)}</td><td>${nmRef('funcionarios',s.solicitante_id)}</td><td>${dt(s.data_solicitacao)}</td><td>${dt(s.data_aprovacao)}</td><td>${dt(pv)}${venc?' <span class="chip red">Vencida</span>':''}</td><td><span class="chip ${c}">${esc(s.status)}</span></td><td><button class="mini" data-o="${s.id}">Abrir</button></td></tr>`}).join('');
 v.innerHTML=`<h1>Solicitações e pedidos</h1><p class="sub">${ss.length} solicitação(ões)</p><div class="bar"><input id="q" type="search" placeholder="Pesquisar por número, obra ou solicitante" aria-label="Pesquisar">${canW({})||(me&&me.assistente)?'<button class="btn" id="nw">Nova solicitação</button>':''}</div>
 <div class="card wrap">${ss.length?`<table><thead><tr><th>Requisição Sienge</th><th>Obra</th><th>Solicitante</th><th>Solicitação</th><th>Aprovação</th><th>Previsão de chegada</th><th>Situação</th><th></th></tr></thead><tbody>${rows}</tbody></table>`:'<div class="empty">Nenhuma solicitação cadastrada ainda.'+(canW({})?'<br>Clique em “Nova solicitação” para começar.':'')+'</div>'}</div>`;
 if($('#nw'))$('#nw').onclick=nova;
 if($('#q'))$('#q').oninput=x=>{const t=x.target.value.toLowerCase();v.querySelectorAll('tbody tr').forEach(tr=>tr.classList.toggle('hide',!tr.textContent.toLowerCase().includes(t)))};
 v.querySelectorAll('[data-o]').forEach(b=>b.onclick=()=>abrir(b.dataset.o))}

/* detalhe */
async function abrir(id){
 const[{data:s,error:e1},{data:it,error:e2},{data:pd,error:e3}]=await Promise.all([
  sb.from('solicitacoes').select('*').eq('id',id).single(),
  sb.from('solicitacao_itens').select('*, materiais(codigo,descricao,unidade)').eq('solicitacao_id',id),
  sb.from('pedidos_compra').select('*, fornecedores(nome), pedido_itens(solicitacao_item_id,quantidade)').eq('solicitacao_id',id).order('data_pedido')]);
 if(e1||e2||e3){toast(msg(e1||e2||e3));return}
 let hs=[];if(pd.length){const q=await sb.from('previsao_historico').select('*').in('pedido_id',pd.map(p=>p.id)).order('em',{ascending:false});hs=q.data||[]}
 await loadRefs(REFS);
 const comp={};pd.forEach(p=>p.pedido_itens.forEach(x=>comp[x.solicitacao_item_id]=(comp[x.solicitacao_item_id]||0)+Number(x.quantidade)));
 it.sort((a,b)=>a.materiais.descricao.localeCompare(b.materiais.descricao));
 const falta=i=>Number(i.quantidade)-(comp[i.id]||0);
 const sit=i=>!(comp[i.id]>0)?'Não atendido':falta(i)>0?'Parcialmente atendido':'Atendido integralmente';
 const pode=canW({}),aberta=!FECHADA.includes(s.status),temFalta=it.some(i=>falta(i)>0);
 modal('Requisição '+esc(s.numero_sienge||'(sem número)'),
  `<p><b>Obra:</b> ${nmRef('obras',s.obra_id)}<br><b>Solicitante:</b> ${nmRef('funcionarios',s.solicitante_id)}<br><b>Data da solicitação:</b> ${dt(s.data_solicitacao)}<br><b>Aprovação do gestor:</b> ${s.data_aprovacao?dt(s.data_aprovacao):'ainda não registrada'}<br><b>Situação:</b> ${esc(s.status)}${s.observacao?'<br><b>Observação:</b> '+esc(s.observacao):''}</p>
  <div class="bar">${pode&&s.status==='Aguardando aprovação'?'<button class="btn" id="b_ap">Registrar aprovação</button>':''}${pode&&s.data_aprovacao&&aberta&&temFalta&&s.status!=='Aguardando aprovação'?'<button class="btn" id="b_pd">Registrar pedido</button>':''}${pode&&aberta?'<button class="sec" id="b_ed">Editar dados</button>':''}</div>
  <h3>Materiais</h3><div class="wrap"><table style="min-width:0"><thead><tr><th>Material</th><th>Solicitado</th><th>Comprado</th><th>Falta comprar</th><th>Compra</th></tr></thead><tbody>${it.map(i=>`<tr><td>${esc(i.materiais.descricao)}<br><span class="hint">${esc(i.materiais.codigo)}</span></td><td>${i.quantidade} ${esc(i.materiais.unidade)}</td><td>${comp[i.id]||0}</td><td>${falta(i)}</td><td>${sit(i)}</td></tr>`).join('')}</tbody></table></div>
  <p class="hint">Material comprado ainda não é material recebido. O recebimento será confirmado pelo almoxarife.</p>
  <h3>Pedidos de compra</h3>`+(pd.length?pd.map(p=>`<div class="mv"><b>Pedido ${esc(p.numero_pedido)}</b> — ${esc(p.fornecedores?p.fornecedores.nome:'—')}<br>Data do pedido: ${dt(p.data_pedido)}<br>Previsão de chegada: <b>${dt(p.previsao_entrega)}</b>${p.previsao_entrega!==p.previsao_original?' <span class="chip">Alterada (original: '+dt(p.previsao_original)+')</span>':''}${hs.filter(h=>h.pedido_id===p.id).map(h=>`<br><span class="hint">${dt(h.anterior)} → ${dt(h.nova)}: ${esc(h.justificativa)} (${dh(h.em)})</span>`).join('')}${pode&&aberta?`<br><button class="mini" style="margin-top:6px" data-pv="${p.id}">Alterar previsão</button>`:''}</div>`).join(''):'<p class="empty">Nenhum pedido de compra registrado ainda.</p>'),null);
 if($('#b_ap'))$('#b_ap').onclick=()=>aprovar(s);
 if($('#b_pd'))$('#b_pd').onclick=()=>novoPedido(s,it,falta);
 if($('#b_ed'))$('#b_ed').onclick=()=>editar(s);
 document.querySelectorAll('[data-pv]').forEach(b=>b.onclick=()=>alterarPrev(pd.find(p=>p.id===b.dataset.pv)))}

function aprovar(s){modal('Registrar aprovação do gestor',`<label class="fl" for="ap_d">Data da aprovação <b class="rq">*</b></label><input id="ap_d" type="date" value="${hoje()}" min="${s.data_solicitacao}"><div class="hint">Data em que o gestor aprovou a requisição.</div>`,'Registrar aprovação',async()=>{
 const d=$('#ap_d').value;if(!d)return 'Informe a data da aprovação.';
 if(!confirm('Confirmar a aprovação em '+dt(d)+'?'))return 'Nada foi gravado.';
 const{error}=await sb.rpc('registrar_aprovacao',{p_solic:s.id,p_data:d});if(error)return msg(error);
 toast('Aprovação registrada.');depois(s.id)})}

async function novoPedido(s,it,falta){await loadRefs([{t:'ref',ref:'fornecedores',lab:'nome'}]);
 const F=cache.fornecedores||[];if(!F.length){toast('Cadastre antes o fornecedor em Fornecedores.');return}
 const pend=it.filter(i=>falta(i)>0);
 modal('Registrar pedido de compra',`<label class="fl" for="np_n">Número do pedido <b class="rq">*</b></label><input id="np_n">
 <label class="fl" for="np_f">Fornecedor <b class="rq">*</b></label><select id="np_f"><option value="">Selecione…</option>${F.map(f=>`<option value="${f.id}">${esc(f.nome)}</option>`).join('')}</select>
 <label class="fl" for="np_d">Data do pedido <b class="rq">*</b></label><input id="np_d" type="date" value="${hoje()}" min="${s.data_aprovacao}">
 <div class="hint">A previsão de chegada será calculada pelo sistema: 5 dias úteis depois da data do pedido, sem fins de semana e feriados cadastrados.</div>
 <h3>Quantidade comprada neste pedido</h3><div class="hint">Deixe 0 nos materiais que não entraram neste pedido.</div>
 ${pend.map(i=>`<div class="mv"><b>${esc(i.materiais.descricao)}</b><br><span class="hint">Falta comprar: ${falta(i)} ${esc(i.materiais.unidade)}</span><input id="q_${i.id}" type="number" step="any" min="0" max="${falta(i)}" value="${falta(i)}" inputmode="decimal"></div>`).join('')}`,'Registrar pedido',async()=>{
  const n=$('#np_n').value.trim(),f=$('#np_f').value,d=$('#np_d').value,arr=[];
  if(!n)return 'Informe o número do pedido.';if(!f)return 'Escolha o fornecedor.';if(!d)return 'Informe a data do pedido.';
  pend.forEach(i=>{const q=Number($('#q_'+i.id).value);if(q>0)arr.push({solicitacao_item_id:i.id,quantidade:q})});
  if(!arr.length)return 'Informe a quantidade comprada de pelo menos um material.';
  if(!confirm('Confirmar o registro do pedido '+n+'?'))return 'Nada foi gravado.';
  const{error}=await sb.rpc('registrar_pedido',{p_solic:s.id,p_numero:n,p_fornecedor:f,p_data:d,p_itens:arr});
  if(error)return error.code==='23505'?'Este número de pedido já está registrado nesta solicitação.':msg(error);
  toast('Pedido registrado.');depois(s.id)})}

function alterarPrev(p){modal('Alterar previsão de chegada',`<p>Pedido <b>${esc(p.numero_pedido)}</b>. Previsão atual: <b>${dt(p.previsao_entrega)}</b>.</p><label class="fl" for="pv_d">Nova data de chegada <b class="rq">*</b></label><input id="pv_d" type="date" value="${p.previsao_entrega||''}">
 <label class="fl" for="pv_j">Justificativa <b class="rq">*</b></label><textarea id="pv_j" rows="3"></textarea><div class="hint">Todos os usuários autorizados verão esta justificativa.</div>`,'Alterar previsão',async()=>{
  const d=$('#pv_d').value,j=$('#pv_j').value.trim();
  if(!d)return 'Informe a nova data.';if(d===p.previsao_entrega)return 'A nova data é igual à atual.';if(j.length<5)return 'Escreva a justificativa da alteração.';
  if(!confirm('Alterar a previsão para '+dt(d)+'?'))return 'Nada foi alterado.';
  const{error}=await sb.rpc('alterar_previsao',{p_pedido:p.id,p_nova:d,p_justificativa:j});if(error)return msg(error);
  toast('Previsão alterada.');depois(p.solicitacao_id)})}

function editar(s){const L=(cache.funcionarios||[]).filter(f=>f.obra_id===s.obra_id&&f.situacao==='Ativo');
 modal('Editar dados da solicitação',`<label class="fl" for="ed_n">Número da requisição do Sienge</label><input id="ed_n" value="${esc(s.numero_sienge||'')}"><div class="hint">Não pode repetir.</div>
 <label class="fl" for="ed_s">Solicitante</label><select id="ed_s"><option value="">Selecione…</option>${L.map(f=>`<option value="${f.id}" ${f.id===s.solicitante_id?'selected':''}>${esc(f.nome)}</option>`).join('')}</select>
 <label class="fl" for="ed_o">Observação</label><textarea id="ed_o" rows="3">${esc(s.observacao||'')}</textarea>`,'Salvar alterações',async()=>{
  if(!confirm('Salvar as alterações?'))return 'Nada foi alterado.';
  const{error}=await sb.from('solicitacoes').update({numero_sienge:$('#ed_n').value.trim()||null,solicitante_id:$('#ed_s').value||null,observacao:$('#ed_o').value.trim()||null}).eq('id',s.id);
  if(error)return error.code==='23505'?'Este número de requisição do Sienge já está cadastrado.':msg(error);
  toast('Alterações salvas.');depois(s.id)})}

/* nova solicitação em 3 passos */
async function nova(){await loadRefs(REFS);
 const{data:ms}=await sb.from('materiais').select('id,codigo,descricao,unidade').eq('ativo',true).order('descricao');
 if(!(cache.obras||[]).length){toast('Cadastre antes uma obra.');return}
 if(!(ms||[]).length){toast('Cadastre antes os materiais em Materiais.');return}
 const S={obra:'',sol:'',data:hoje(),num:'',obs:'',it:[]};
 const err=t=>{const e=$('#me');e.textContent=t;e.classList.remove('hide')};
 const ml=id=>{const m=ms.find(x=>x.id===id);return m?esc(m.descricao)+' ('+esc(m.codigo)+')':'—'};
 const un=id=>{const m=ms.find(x=>x.id===id);return m?esc(m.unidade):''};
 const passo=(n,t)=>`<p class="hint"><b>Passo ${n} de 3:</b> ${t}</p>`;
 const lerP1=()=>{S.obra=$('#s_o').value;S.sol=$('#s_s').value;S.data=$('#s_d').value;S.num=$('#s_n').value.trim();S.obs=$('#s_b').value.trim()};
 const fillSol=()=>{const L=(cache.funcionarios||[]).filter(f=>f.obra_id===$('#s_o').value&&f.situacao==='Ativo');$('#s_s').innerHTML='<option value="">Selecione…</option>'+L.map(f=>`<option value="${f.id}" ${f.id===S.sol?'selected':''}>${esc(f.nome)}</option>`).join('')};
 const p1=()=>{modal('Nova solicitação',passo(1,'dados da solicitação')+`<label class="fl" for="s_o">Obra <b class="rq">*</b></label><select id="s_o"><option value="">Selecione…</option>${cache.obras.map(o=>`<option value="${o.id}" ${o.id===S.obra?'selected':''}>${esc(o.nome)}</option>`).join('')}</select>
  <label class="fl" for="s_s">Solicitante <b class="rq">*</b></label><select id="s_s"></select><div class="hint">Aparecem os funcionários ativos da obra escolhida.</div>
  <label class="fl" for="s_d">Data da solicitação <b class="rq">*</b></label><input id="s_d" type="date" value="${S.data}">
  <label class="fl" for="s_n">Número da requisição do Sienge</label><input id="s_n" value="${esc(S.num)}"><div class="hint">Pode ser informado depois, mas é obrigatório para registrar a aprovação.</div>
  <label class="fl" for="s_b">Observação</label><textarea id="s_b" rows="2">${esc(S.obs)}</textarea>
  <div class="acts"><button class="btn" id="s_x" type="button">Continuar</button></div>`,null);
  fillSol();$('#s_o').onchange=()=>{S.sol='';fillSol()};
  $('#s_x').onclick=()=>{lerP1();if(!S.obra)return err('Escolha a obra.');if(!S.sol)return err('Escolha o solicitante.');if(!S.data)return err('Informe a data da solicitação.');p2()}};
 const p2=()=>{modal('Nova solicitação',passo(2,'materiais e quantidades')+`<div class="card"><label class="fl" for="s_m" style="margin-top:0">Material</label><select id="s_m"><option value="">Selecione…</option>${ms.map(m=>`<option value="${m.id}">${esc(m.descricao)} (${esc(m.codigo)}) — ${esc(m.unidade)}</option>`).join('')}</select>
  <label class="fl" for="s_q">Quantidade</label><input id="s_q" type="number" step="any" min="0" inputmode="decimal"><div class="acts"><button class="sec" id="s_a" type="button">Adicionar item</button></div></div>
  <h3>Itens da solicitação (${S.it.length})</h3>${S.it.length?S.it.map((x,k)=>`<div class="mv">${ml(x.m)} — <b>${x.q} ${un(x.m)}</b> <button class="mini" style="float:right" data-x="${k}">Remover</button></div>`).join(''):'<p class="empty">Nenhum item adicionado ainda.</p>'}
  <div class="acts"><button class="sec" id="s_v" type="button">Voltar</button><button class="btn" id="s_x" type="button">Continuar</button></div>`,null);
  $('#s_a').onclick=()=>{const m=$('#s_m').value,q=Number($('#s_q').value);if(!m)return err('Escolha o material.');if(!(q>0))return err('Informe uma quantidade maior que zero.');
   if(S.it.some(x=>x.m===m))return err('Este material já está na lista. Remova-o para informar outra quantidade.');S.it.push({m,q});p2()};
  document.querySelectorAll('[data-x]').forEach(b=>b.onclick=()=>{S.it.splice(Number(b.dataset.x),1);p2()});
  $('#s_v').onclick=p1;$('#s_x').onclick=()=>{if(!S.it.length)return err('Adicione ao menos um material.');p3()}};
 const p3=()=>{modal('Nova solicitação',passo(3,'confira e grave')+`<p><b>Obra:</b> ${nmRef('obras',S.obra)}<br><b>Solicitante:</b> ${nmRef('funcionarios',S.sol)}<br><b>Data:</b> ${dt(S.data)}<br><b>Requisição Sienge:</b> ${esc(S.num||'ainda sem número')}${S.obs?'<br><b>Observação:</b> '+esc(S.obs):''}</p>
  <h3>Itens (${S.it.length})</h3>${S.it.map(x=>`<div class="mv">${ml(x.m)} — <b>${x.q} ${un(x.m)}</b></div>`).join('')}
  <div class="acts"><button class="sec" id="s_v" type="button">Voltar</button><button class="btn" id="s_g" type="button">Gravar solicitação</button></div>`,null);
  $('#s_v').onclick=p2;
  $('#s_g').onclick=async()=>{const b=$('#s_g');b.disabled=true;
   const{error}=await sb.rpc('criar_solicitacao',{p_obra:S.obra,p_solicitante:S.sol,p_data:S.data,p_numero:S.num||null,p_obs:S.obs||null,p_itens:S.it.map(x=>({material_id:x.m,quantidade:x.q}))});
   if(error){b.disabled=false;return err(error.code==='23505'?'Este número de requisição do Sienge já está cadastrado.':msg(error))}
   $('#dlg').close();toast('Solicitação gravada.');telaSol()}};
 p1()}
