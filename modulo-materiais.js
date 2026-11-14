/* MASTERS GESTÃO - Correção 3B-3b: solicitações com material livre (sem cadastro prévio em Materiais)
   e histórico de cada material. Carregar DEPOIS de modulo-compras.js. */

E.materiais.vazio='Nenhum material ainda. Eles entram aqui automaticamente quando você cadastra ou importa solicitações e pedidos.';
E.materiais.f.find(f=>f.k==='codigo').h='Não pode repetir. Não é obrigatório cadastrar aqui antes: os materiais das solicitações entram sozinhos.';

const nm2=s=>String(s==null?'':s).toLowerCase().trim().replace(/\s+/g,' ');

/* ===== nova solicitação: material livre ===== */
async function nova(){await loadRefs(REFS);
 if(!(cache.obras||[]).length){toast('Cadastre antes uma obra.');return}
 const{data:ms}=await sb.from('materiais').select('id,codigo,descricao,unidade').order('descricao');
 const MS=ms||[];
 const achar=(d,u)=>MS.find(m=>nm2(m.descricao)===nm2(d)&&nm2(m.unidade)===nm2(u));
 const S={obra:'',sol:'',data:hoje(),num:'',obs:'',it:[]};
 const err=t=>{const e=$('#me');e.textContent=t;e.classList.remove('hide')};
 const passo=(n,t)=>`<p class="hint"><b>Passo ${n} de 3:</b> ${t}</p>`;
 const lerP1=()=>{S.obra=$('#s_o').value;S.sol=$('#s_s').value;S.data=$('#s_d').value;S.num=$('#s_n').value.trim();S.obs=$('#s_b').value.trim()};
 const fillSol=()=>{const L=(cache.funcionarios||[]).filter(f=>f.obra_id===$('#s_o').value&&f.situacao==='Ativo');$('#s_s').innerHTML='<option value="">Selecione…</option>'+L.map(f=>`<option value="${f.id}" ${f.id===S.sol?'selected':''}>${esc(f.nome)}</option>`).join('')};
 const chip=x=>achar(x.d,x.u)?'<span class="chip">Já cadastrado</span>':'<span class="chip blue">Novo em Materiais</span>';
 const p1=()=>{modal('Nova solicitação',passo(1,'dados da solicitação')+`<label class="fl" for="s_o">Obra <b class="rq">*</b></label><select id="s_o"><option value="">Selecione…</option>${cache.obras.map(o=>`<option value="${o.id}" ${o.id===S.obra?'selected':''}>${esc(o.nome)}</option>`).join('')}</select>
  <label class="fl" for="s_s">Solicitante <b class="rq">*</b></label><select id="s_s"></select><div class="hint">Aparecem os funcionários ativos da obra escolhida.</div>
  <label class="fl" for="s_d">Data da solicitação <b class="rq">*</b></label><input id="s_d" type="date" value="${S.data}">
  <label class="fl" for="s_n">Número da requisição do Sienge</label><input id="s_n" value="${esc(S.num)}"><div class="hint">Pode ser informado depois, mas é obrigatório para registrar a aprovação.</div>
  <label class="fl" for="s_b">Observação</label><textarea id="s_b" rows="2">${esc(S.obs)}</textarea>
  <div class="acts"><button class="btn" id="s_x" type="button">Continuar</button></div>`,null);
  fillSol();$('#s_o').onchange=()=>{S.sol='';fillSol()};
  $('#s_x').onclick=()=>{lerP1();if(!S.obra)return err('Escolha a obra.');if(!S.sol)return err('Escolha o solicitante.');if(!S.data)return err('Informe a data da solicitação.');p2()}};
 const p2=()=>{const dl=[...new Set(MS.map(m=>m.descricao))],du=[...new Set(MS.map(m=>m.unidade))];
  modal('Nova solicitação',passo(2,'materiais e quantidades')+`<div class="card"><div class="hint">Digite o material como ele aparece na requisição. Não precisa estar cadastrado antes.</div>
  <label class="fl" for="s_m">Descrição do material <b class="rq">*</b></label><input id="s_m" list="s_dl" autocomplete="off"><datalist id="s_dl">${dl.map(d=>`<option value="${esc(d)}">`).join('')}</datalist>
  <label class="fl" for="s_u">Unidade de medida <b class="rq">*</b></label><input id="s_u" list="s_du" autocomplete="off"><datalist id="s_du">${du.map(d=>`<option value="${esc(d)}">`).join('')}</datalist><div class="hint">Como o material é contado: metro, peça, caixa...</div>
  <label class="fl" for="s_q">Quantidade <b class="rq">*</b></label><input id="s_q" type="number" step="any" min="0" inputmode="decimal">
  <label class="fl" for="s_c">Código do material</label><input id="s_c"><div class="hint">Opcional. Código do Sienge, se houver.</div>
  <div class="hint" id="s_h" style="color:var(--blue);font-weight:600"></div>
  <div class="acts"><button class="sec" id="s_a" type="button">Adicionar item</button></div></div>
  <h3>Itens da solicitação (${S.it.length})</h3>${S.it.length?S.it.map((x,k)=>`<div class="mv">${esc(x.d)} — <b>${x.q} ${esc(x.u)}</b> ${chip(x)} <button class="mini" style="float:right" data-x="${k}">Remover</button></div>`).join(''):'<p class="empty">Nenhum item adicionado ainda.</p>'}
  <div class="acts"><button class="sec" id="s_v" type="button">Voltar</button><button class="btn" id="s_x" type="button">Continuar</button></div>`,null);
  const hint=()=>{const d=$('#s_m').value,u=$('#s_u').value;$('#s_h').textContent=(!d.trim()||!u.trim())?'':achar(d,u)?'Este material já está cadastrado e será associado.':'Material novo: será cadastrado automaticamente em Materiais.'};
  $('#s_m').oninput=()=>{const m=MS.find(a=>nm2(a.descricao)===nm2($('#s_m').value));if(m&&!$('#s_u').value.trim())$('#s_u').value=m.unidade;hint()};
  $('#s_u').oninput=hint;
  $('#s_a').onclick=()=>{const d=$('#s_m').value.trim().replace(/\s+/g,' '),u=$('#s_u').value.trim(),q=Number($('#s_q').value),c=$('#s_c').value.trim();
   if(!d)return err('Informe a descrição do material.');if(!u)return err('Informe a unidade de medida.');if(!(q>0))return err('Informe uma quantidade maior que zero.');
   if(S.it.some(x=>nm2(x.d)===nm2(d)&&nm2(x.u)===nm2(u)))return err('Este material já está na lista. Remova-o para informar outra quantidade.');
   S.it.push({d,u,q,c});p2()};
  document.querySelectorAll('[data-x]').forEach(b=>b.onclick=()=>{S.it.splice(Number(b.dataset.x),1);p2()});
  $('#s_v').onclick=p1;$('#s_x').onclick=()=>{if(!S.it.length)return err('Adicione ao menos um material.');p3()}};
 const p3=()=>{const novos=S.it.filter(x=>!achar(x.d,x.u)).length;
  modal('Nova solicitação',passo(3,'confira e grave')+`<p><b>Obra:</b> ${nmRef('obras',S.obra)}<br><b>Solicitante:</b> ${nmRef('funcionarios',S.sol)}<br><b>Data:</b> ${dt(S.data)}<br><b>Requisição Sienge:</b> ${esc(S.num||'ainda sem número')}${S.obs?'<br><b>Observação:</b> '+esc(S.obs):''}</p>
  <h3>Itens (${S.it.length})</h3>${S.it.map(x=>`<div class="mv">${esc(x.d)} — <b>${x.q} ${esc(x.u)}</b> ${chip(x)}</div>`).join('')}
  ${novos?`<p class="hint">${novos} material(is) novo(s) será(ão) cadastrado(s) automaticamente em Materiais. Isso não cria estoque: o estoque só muda quando o almoxarife confirmar o recebimento.</p>`:''}
  <div class="acts"><button class="sec" id="s_v" type="button">Voltar</button><button class="btn" id="s_g" type="button">Gravar solicitação</button></div>`,null);
  $('#s_v').onclick=p2;
  $('#s_g').onclick=async()=>{const b=$('#s_g');b.disabled=true;
   const{error}=await sb.rpc('criar_solicitacao',{p_obra:S.obra,p_solicitante:S.sol,p_data:S.data,p_numero:S.num||null,p_obs:S.obs||null,p_itens:S.it.map(x=>({codigo:x.c||null,descricao:x.d,unidade:x.u,quantidade:x.q}))});
   if(error){b.disabled=false;return err(error.code==='23505'?'Este número de requisição do Sienge já está cadastrado.':msg(error))}
   cache={};$('#dlg').close();toast('Solicitação gravada.');telaSol()}};
 p1()}

/* ===== Materiais: histórico de cada material ===== */
const _acts2=acts;
acts=function(n,r){let h=_acts2(n,r);if(n==='materiais')h='<button class="mini" data-m="'+r.id+'">Histórico</button>'+h;return h};
document.addEventListener('click',e=>{const b=e.target.closest('[data-m]');if(b)histMat(b.dataset.m)});
async function histMat(id){
 const[{data:m,error:e1},{data:it,error:e2}]=await Promise.all([
  sb.from('materiais').select('*').eq('id',id).single(),
  sb.from('solicitacao_itens').select('*, solicitacoes(numero_sienge,status,data_solicitacao,obra_id), pedido_itens(quantidade, pedidos_compra(numero_pedido,data_pedido))').eq('material_id',id)]);
 if(e1||e2){toast(msg(e1||e2));return}
 await loadRefs(REFS);
 const org={'Manual':'Cadastrado manualmente','Solicitação':'Criado automaticamente por uma solicitação','Importação':'Criado automaticamente por uma importação'}[m.origem]||m.origem;
 modal('Material: '+esc(m.descricao),
  `<p><b>Código:</b> ${esc(m.codigo)}<br><b>Unidade:</b> ${esc(m.unidade)}<br><b>Origem:</b> ${esc(org)}</p>
  ${m.precisa_conferir?`<div class="err">Criado automaticamente. Confira o código e a descrição.${canW(E.materiais)?'<br><button class="mini" id="m_ok" style="margin-top:8px">Marcar como conferido</button>':''}</div>`:''}
  <h3>Solicitações e compras (${it.length})</h3>`+(it.length?it.map(i=>{const s=i.solicitacoes||{},comp=i.pedido_itens.reduce((a,p)=>a+Number(p.quantidade),0);
   return `<div class="mv"><b>Requisição ${esc(s.numero_sienge||'sem número')}</b> — ${nmRef('obras',s.obra_id)}<br>Solicitado: ${i.quantidade} ${esc(m.unidade)} em ${dt(s.data_solicitacao)} · Comprado: ${comp}<br><span class="hint">Situação: ${esc(s.status||'—')}${i.pedido_itens.map(p=>' · Pedido '+esc(p.pedidos_compra.numero_pedido)+' ('+dt(p.pedidos_compra.data_pedido)+'): '+p.quantidade).join('')}</span></div>`}).join(''):'<p class="empty">Este material ainda não foi usado em nenhuma solicitação.</p>')+
  '<p class="hint">Estar cadastrado aqui não significa comprado nem recebido. O estoque só será atualizado depois que o almoxarife autorizado confirmar o recebimento.</p>',null);
 if($('#m_ok'))$('#m_ok').onclick=async()=>{const{error}=await sb.from('materiais').update({precisa_conferir:false}).eq('id',id);if(error){toast(msg(error));return}toast('Marcado como conferido.');histMat(id)}}
