/* MASTERS GESTÃO — Módulo 4: Central de importações dentro de "Solicitações e pedidos".
   Reúne no mesmo lugar: Importar Solicitações de Compra e Importar Pedidos de Compra.
   A importação de OBRAS do Sienge fica SOMENTE na tela Obras (botão “Importar Obras do Sienge”), e usa as funções deste arquivo (window.__hubObras).
   Usa os leitores que já existem (index.html = solicitações; modulo-importar-pedidos.js = pedidos). Não grava nada sem confirmação.
   Obras: confere o código oficial do Sienge, evita cópias, deixa o administrador MASTERS corrigir códigos e cadastrar obras novas
   (SQL 12). Importar pedido NÃO dá entrada no estoque: o estoque só muda no recebimento. */
try{(function(){
const SC=()=>window.__impSolicTeste,PC=()=>window.__impPedTeste;
const $h=id=>document.getElementById(id);
const nz=s=>String(s==null?'':s).normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[º°]/g,'o').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const vz=v=>String(v==null?'':v).trim()==='';
const cod=s=>String(s==null?'':s).trim().toUpperCase();
const fdt=d=>d?new Date(d+'T00:00').toLocaleDateString('pt-BR'):'—';
const nf=n=>Number(n).toLocaleString('pt-BR',{maximumFractionDigits:3});
const mo=n=>Number(n).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const isAdm=()=>!!me&&(me.perfil_real||me.perfil)==='MASTERS';
let F=null,ULT=null;   /* F = importação em andamento; ULT = último relatório (continua na tela depois de recarregar a lista) */

/* ---------- comparação de nomes de obra (mesma regra do banco: obra_parecidas) ---------- */
const STOP=new Set(['de','da','do','das','dos','e','a','o','ltda','sa','s','eireli','me','epp']);
const toks=s=>new Set(nz(s).split(' ').filter(t=>t.length>=2&&!STOP.has(t)));
function parecidas(a,b){const na=nz(a),nb=nz(b);if(!na||!nb)return false;if(na===nb)return true;
 if(na.length>=4&&(' '+nb+' ').includes(' '+na+' '))return true;if(nb.length>=4&&(' '+na+' ').includes(' '+nb+' '))return true;
 const A=toks(a),B=toks(b);let i=0;A.forEach(t=>{if(B.has(t))i++});const u=A.size+B.size-i;return u>0&&i/u>=0.6}

/* ---------- estilo (só usa as cores do sistema) ---------- */
function estilo(){if($h('hub_css'))return;const s=document.createElement('style');s.id='hub_css';
 s.textContent='#imp_sol_btn,#imp_ped_btn,#menu [data-v="imp_solic"],#menu [data-v="imp_ped"]{display:none!important}'+
 '.hub{margin-bottom:14px}.hub h3{margin:0 0 4px}.hub-b{display:flex;gap:10px;flex-wrap:wrap;margin:12px 0 0}.hub-b button{flex:1 1 220px}'+
 '.hub-b .on{outline:3px solid var(--blue);outline-offset:2px}.hub-a{margin-top:14px;border-top:1px solid var(--line);padding-top:14px}.hub-a:empty{display:none}.hub-o{border-top:0;padding-top:0;margin-top:0}'+
 '.hub-t{max-height:360px;overflow:auto}.hub-t table{min-width:560px}.hub-ob{background:var(--soft);border-radius:10px;padding:12px;margin:10px 0;border:1px solid var(--line)}'+
 '.hub-ob label{display:flex;gap:10px;align-items:flex-start;margin:8px 0;cursor:pointer}.hub-ob input[type=radio],.hub-ob input[type=checkbox],.hub-ck input{width:22px;height:22px;min-height:22px;flex:0 0 22px;margin-top:2px}'+
 '.hub-ob .hint{display:block}.hub-j{width:100%;margin-top:6px}.hub-ck{display:flex;gap:10px;align-items:center;margin-top:12px}'+
 '.hub .kpis{grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px}.hub .kpi{padding:10px 12px;font-size:13px}.hub .kpi b{font-size:22px}.hub .kpi .kpi{margin:0}.hub details{margin:6px 0}.hub summary{cursor:pointer;min-height:32px;display:flex;align-items:center}.hub-w{color:var(--redt);font-weight:600}.hub .chip{white-space:normal}.hub .hub-t table{min-width:0}.hub details table{min-width:420px}.hub-i{color:var(--mute);display:block;font-size:13px;margin-top:3px}';
 document.head.appendChild(s)}

/* ---------- leitura de dados do sistema ---------- */
async function lerTudo(t,c,ord){let a=[],i=0;for(;;){const{data,error}=await sb.from(t).select(c).order(ord||'id').range(i,i+999);if(error)throw error;a=a.concat(data||[]);if(!data||data.length<1000)break;i+=1000}return a}
async function baseObras(){
 let obras,semSql14=false;
 try{obras=await lerTudo('obras','id,codigo,nome,endereco,status,cliente,situacao_sienge,dados_sienge')}catch(e){semSql14=true;obras=await lerTudo('obras','id,codigo,nome,endereco,status')}
 const ref=new Map();let semSql=false;
 try{(await lerTudo('obras_sienge','codigo,nome,empresa,projeto,categoria,tipo_negocio,area_negocio,situacao,data_cadastro','codigo')).forEach(x=>ref.set(cod(x.codigo),x))}catch(e){semSql=true}
 return{obras,ref,semSql,semSql14}}
async function ctxSC(){const[fu,ma,so]=await Promise.all([lerTudo('funcionarios','id,nome,matricula,obra_id'),lerTudo('materiais','id,codigo,descricao,unidade'),lerTudo('solicitacoes','id,numero_sienge')]);
 return{func:fu,mat:ma,exist:new Set(so.filter(s=>s.numero_sienge).map(s=>nz(s.numero_sienge)))}}

/* ---------- reconhecimento das obras ---------- */
const chave=(c,n)=>vz(c)?'N:'+nz(n):'C:'+cod(c);
function refsDe(rows){const m=new Map(),rk=new Map();
 rows.forEach(r=>{const v=r.v||{},c=String(v.obraCodigo==null?'':v.obraCodigo).trim(),n=String(v.obraNome||v.obra||'').trim();if(vz(c)&&vz(n))return;
  const k=chave(c,n);rk.set((r.arq||'')+'|'+r.linha,k);if(!m.has(k))m.set(k,{key:k,codigo:c,nome:n,linhas:0});m.get(k).linhas++});
 return{refs:[...m.values()],rk}}
function resolver(refs,base,oficiaisExtra){
 const{obras,ref}=base,ehOf=c=>ref.has(cod(c))||(oficiaisExtra&&oficiaisExtra.has(cod(c)));
 return refs.map(r=>{const E={...r,status:'',obra:null,cands:[],notas:[],exigeJust:false,oficial:r.codigo?ref.get(cod(r.codigo))||null:null};
  if(!vz(r.codigo)){
   const s=obras.find(o=>cod(o.codigo)===cod(r.codigo));
   if(s){E.status='ok';E.obra=s;if(r.nome&&!parecidas(s.nome,r.nome))E.notas.push('No sistema esta obra se chama “'+s.nome+'”; no arquivo, “'+r.nome+'”. O código é o que vale; confira o nome.')}
   else{const sem=obras.filter(o=>cod(o.codigo)!==cod(r.codigo)&&parecidas(o.nome,r.nome));
    E.cands=sem.filter(o=>!ehOf(o.codigo));   /* obra cujo código já é oficial (na referência ou neste mesmo arquivo) não é candidata a “corrigir código” */
    E.exigeJust=sem.some(o=>!(ehOf(r.codigo)&&ehOf(o.codigo)));
    E.parecidas=sem;E.status=E.cands.length?'corrigir':'nova'}}
  else{const s=obras.find(o=>nz(o.nome)===nz(r.nome));if(s){E.status='ok';E.obra=s}else E.status='semcodigo'}
  return E})}
function decPadrao(E,tipo){if(E.status==='corrigir')return{acao:'nao'};if(E.status==='nova')return{acao:tipo==='ob'?(isAdm()&&!E.exigeJust?'nova':'nao'):(!isAdm()||tipo==='pc'?'nao':'nova')};return{acao:'nao'}}
function obrasX(){const L=F.base.obras.map(o=>({...o}));
 F.E.forEach(E=>{const d=F.dec[E.key]||{};
  if(E.status==='corrigir'&&d.acao==='corrigir'){const o=L.find(a=>a.id===d.obraId);if(o)o.codigo=E.codigo}
  else if(E.status==='nova'&&d.acao==='nova'&&F.tipo==='sc')L.push({id:'__novo__'+E.key,codigo:E.codigo,nome:E.nome})});
 /* o CÓDIGO decide: o nome fica com o código junto, assim uma obra nunca é "adivinhada" só pelo nome
    (ex.: DIRETORIA 50 e DIRETORIA 500; ou ESTORIL 55 e um arquivo que traz 999 - ESTORIL) */
 L.forEach(o=>{o.nome=o.nome+' (cód. '+o.codigo+')'});
 return L}
/* linhas que só trazem o nome da obra passam a carregar o código da obra já reconhecida pelo nome exato */
function linhasX(){return F.rows.map(r=>{const k=F.rk.get((r.arq||'')+'|'+r.linha),E=k&&F.E.find(e=>e.key===k);
  if(!E||E.status!=='ok'||!E.obra||!vz(r.v.obraCodigo))return r;return{...r,v:{...r.v,obraCodigo:E.obra.codigo}}})}
function msgObra(E){const t='Obra “'+E.nome+'”'+(E.codigo?' (código '+E.codigo+')':'');
 if(E.status==='semcodigo')return null;
 if(!isAdm())return t+' não está cadastrada com este código. Peça ao administrador MASTERS para conferir ou cadastrar a obra (tela Obras → Importar Obras do Sienge) e importe de novo.';
 if(E.status==='corrigir')return t+': possível correção de código aguardando a decisão do administrador. Nada foi importado para esta obra.';
 return t+' ainda não está cadastrada'+(F.tipo==='pc'?'. Importe antes a solicitação deste pedido.':' e não foi marcada para cadastro.')}

/* ---------- conferência do arquivo (usa os leitores existentes) ---------- */
function validarTudo(){const x=F.tipo==='sc'?{obras:F.semSql?F.base.obras:obrasX(),func:F.ctx.func,mat:F.ctx.mat,exist:F.ctx.exist,multi:F.files.length>1}
  :Object.assign({},F.ctx,{obras:F.semSql?F.base.obras:obrasX(),multi:F.files.length>1});
 const res=(F.tipo==='sc'?SC().validar(F.semSql?F.rows:linhasX(),x):PC().validar(F.semSql?F.rows:linhasX(),x)).concat(F.falhas);
 res.forEach(a=>{if(a.estado!=='rej'||F.semSql)return;const k=F.rk.get((a.arq||'')+'|'+a.linha),E=k&&F.E.find(e=>e.key===k);
  if(E&&E.status!=='ok'&&E.status!=='semcodigo'&&/não encontrada|é diferente da obra/.test(a.motivo||'')){const m=msgObra(E);if(m)a.motivo=m}});
 return res}
const chaveRes=a=>F.rk.get((a.arq||'')+'|'+a.linha)||null;
function chavesUsadas(N){const s=new Set();N.forEach(a=>{const k=chaveRes(a),E=k&&F.E.find(e=>e.key===k),d=E&&F.dec[k];
  if(E&&((E.status==='corrigir'&&d.acao==='corrigir')||(E.status==='nova'&&d.acao==='nova'&&F.tipo==='sc')))s.add(k)});return[...s]}
function acaoDe(E,d){return d.acao==='corrigir'?{acao:'corrigir_codigo',codigo:E.codigo,nome:E.nome,obra_id:d.obraId,confirmado:true,justificativa:d.just||null}
  :{acao:'cadastrar',codigo:E.codigo,nome:E.nome,justificativa:d.just||null,dados:E.dados||null}}
const resumoAcao=(E,d)=>d.acao==='corrigir'?'corrigir o código da obra “'+((F.base.obras.find(o=>o.id===d.obraId)||{}).nome||'?')+'” de '+((F.base.obras.find(o=>o.id===d.obraId)||{}).codigo||'?')+' para '+E.codigo:'cadastrar a obra nova '+E.codigo+' · '+E.nome;
const faltaJust=(E,d)=>d.acao==='nova'&&E.exigeJust&&String(d.just||'').trim().length<5;

/* ---------- pedaços de tela ---------- */
const chip=(t,c)=>'<span class="chip'+(c?' '+c:'')+'">'+t+'</span>';
function vincTxt(id){const v=(F.vinc||{})[id];if(!v)return 'não consegui conferir as ligações';const N={solicitacoes:'solicitação(ões)',pedidos_compra:'pedido(s)',funcionarios:'funcionário(s)',ferramentas:'ferramenta(s)',maloes:'malão(ões)',malas:'mala(s)',usuario_obras:'usuário(s) com acesso',feriados:'feriado(s)',estoque:'saldo(s) de estoque'};
 const L=Object.entries(v).map(([k,n])=>n+' '+(N[k]||k.replace(/_/g,' ')));return L.length?L.join(', '):'nenhuma ligação ainda'}
function cartaoDecisao(E,i,permitirNova){const d=F.dec[E.key]||{acao:'nao'},nm='dec'+i;
 const info='<b>Obra do arquivo:</b> código '+esc(E.codigo)+' · '+esc(E.nome)+' '+chip('Possível correção de código','red')+
  '<span class="hint">'+E.linhas+' linha(s) no arquivo'+(E.oficial?' · este código consta na relação oficial do Sienge':'')+'</span>';
 const c1=E.cands.map(c=>'<label><input type="radio" name="'+nm+'" data-k="'+esc(E.key)+'" value="c:'+c.id+'"'+(d.acao==='corrigir'&&d.obraId===c.id?' checked':'')+'><span><b>É a mesma obra.</b> Corrigir o código de “'+esc(c.nome)+'” de <b>'+esc(c.codigo)+'</b> para <b>'+esc(E.codigo)+'</b>.'+
  '<span class="hint">Cadastro atual: código '+esc(c.codigo)+' · endereço '+esc(c.endereco||'não informado')+' · situação '+esc(c.status||'—')+'</span><span class="hint">Ligações que continuam como estão: '+esc(vincTxt(c.id))+'.</span></span></label>').join('');
 const c2=permitirNova?'<label><input type="radio" name="'+nm+'" data-k="'+esc(E.key)+'" value="nova"'+(d.acao==='nova'?' checked':'')+'><span><b>É outra obra.</b> Cadastrar como obra nova (código '+esc(E.codigo)+').</span></label>'+
  (d.acao==='nova'?'<input class="hub-j" data-k="'+esc(E.key)+'" placeholder="Por que são obras diferentes? (obrigatório)" value="'+esc(d.just||'')+'" aria-label="Justificativa">':''):'';
 const c3='<label><input type="radio" name="'+nm+'" data-k="'+esc(E.key)+'" value="nao"'+(d.acao==='nao'?' checked':'')+'><span>Decidir depois.'+(F.tipo==='ob'?' Nada é cadastrado nem corrigido para esta obra.':' As linhas desta obra não serão importadas agora.')+'</span></label>';
 return '<div class="hub-ob">'+info+c1+c2+c3+'</div>'}
function cartaoNova(E){const d=F.dec[E.key]||{acao:'nao'},ps=(E.parecidas||[]).map(o=>'“'+esc(o.nome)+'” (código '+esc(o.codigo)+')').join(', ');
 return '<div class="hub-ob"><b>Obra do arquivo:</b> código '+esc(E.codigo)+' · '+esc(E.nome)+' '+chip('Obra nova','blue')+'<span class="hint">'+E.linhas+' linha(s) no arquivo'+(E.oficial?' · consta na relação oficial do Sienge':(F.base.ref.size?' · NÃO consta na relação oficial carregada':''))+'</span>'+
  '<label><input type="checkbox" data-n="'+esc(E.key)+'"'+(d.acao==='nova'?' checked':'')+'><span>Cadastrar esta obra.</span></label>'+
  (E.exigeJust&&ps?'<span class="hint">Atenção: já existe obra com nome parecido: '+ps+'. Se for a mesma obra, não cadastre: use a correção de código.</span>':'')+
  (d.acao==='nova'&&E.exigeJust?'<input class="hub-j" data-k="'+esc(E.key)+'" placeholder="Por que é outra obra? (obrigatório)" value="'+esc(d.just||'')+'" aria-label="Justificativa">':'')+'</div>'}
function blocoObras(){const L=F.E;if(!L.length)return '';
 const adm=isAdm(),st={ok:chip('Já cadastrada','blue'),corrigir:chip('Possível correção de código','red'),nova:F.tipo==='pc'?chip('Obra não cadastrada','red'):chip('Obra nova'),semcodigo:chip('Sem código no arquivo','red')};
 const tab='<div class="wrap hub-t"><table style="min-width:0"><thead><tr><th>Código</th><th>Obra no arquivo</th><th>Situação</th><th>Observação</th></tr></thead><tbody>'+L.map(E=>'<tr><td>'+esc(E.codigo||'—')+'</td><td>'+esc(E.nome)+'</td><td>'+st[E.status]+'</td><td>'+esc(E.notas.join(' ')||(E.status==='semcodigo'?'O arquivo não traz o código da obra e o nome não foi encontrado no cadastro.':''))+'</td></tr>').join('')+'</tbody></table></div>';
 const prec=L.filter(E=>E.status==='corrigir'||E.status==='nova');
 const dec=!F.semSql&&prec.length?(adm?'<p class="hint">Estas obras ainda não existem com o código do Sienge. Confira e decida: nada é alterado antes do seu “Confirmar”.</p>'+prec.map((E,i)=>E.status==='corrigir'?cartaoDecisao(E,i,F.tipo==='sc'):(F.tipo==='sc'?cartaoNova(E):'')).join('')
  :'<div class="err">Há obra não cadastrada com o código do Sienge. Somente o administrador MASTERS cadastra obra ou corrige código. As linhas dessas obras serão rejeitadas.</div>'):'';
 return '<h3>Obras do arquivo</h3>'+(F.semSql?'<div class="err">Falta instalar o SQL 12 no Supabase para o sistema conferir e corrigir obras. Por enquanto vale a regra antiga: a obra precisa estar cadastrada.</div>':'')+
  (!F.base.ref.size&&!F.semSql?'<p class="hint">A relação oficial de obras do Sienge ainda não foi carregada. Carregue em Obras → “Importar Obras do Sienge” para o sistema conferir os códigos oficiais.</p>':'')+tab+dec}
function linhasItens(a){const L=(a.payload&&a.payload.itens)||[];if(!L.length)return '';
 return '<details><summary>'+L.length+' item(ns)</summary><table style="min-width:440px"><thead><tr><th>Material</th><th>Un.</th><th>Qtd.</th>'+(L[0].valor_total!==undefined?'<th>Valor unit.</th><th>Total</th>':'')+(L[0].vinculo!==undefined?'<th>Ligação à requisição</th>':'')+'</tr></thead><tbody>'+
  L.map(i=>'<tr><td>'+(i.linha?'<span class="hint" style="display:inline">Linha '+i.linha+' · </span>':'')+esc((i.codigo?i.codigo+' - ':'')+i.descricao)+(i.insumo_original&&/ \| /.test(i.insumo_original)?'<span class="hub-i">Especificação no arquivo: '+esc(i.insumo_original)+'</span>':'')+'</td><td>'+(i.divergente?esc(i.unidade_pedido)+'<span class="hub-i">Unidade divergente (requisição: '+esc(i.unidade)+')</span>':esc(i.unidade))+'</td><td>'+nf(i.quantidade)+'</td>'+(i.valor_total!==undefined?'<td>'+(i.valor_unitario==null?'—':mo(i.valor_unitario))+'</td><td>'+(i.valor_total==null?'—':mo(i.valor_total))+'</td>':'')+(i.vinculo!==undefined?'<td>'+(i.solicitacao_item_id?esc(i.vinculo||'Automático'):'<b>A conferir</b> (escolha abaixo)')+(i.vinculo_obs?'<span class="hub-i">'+esc(i.vinculo_obs)+'</span>':'')+'</td>':'')+'</tr>').join('')+'</tbody></table></details>'}

/* ---------- prévia (solicitações e pedidos) ---------- */
function render(){const A=$h('hub_area');if(!A||!F)return;
 const sc=F.tipo==='sc',res=validarTudo();F.res=res;
 const N=res.filter(a=>a.estado==='novo'),I=res.filter(a=>a.estado==='ign'),J=res.filter(a=>a.estado==='rej'),AV=N.filter(a=>a.motivo).length;F.N=N;F.I=I;F.J=J;F.AV=AV;
 const nO={ok:F.E.filter(e=>e.status==='ok').length,nova:F.E.filter(e=>e.status==='nova').length,cor:F.E.filter(e=>e.status==='corrigir').length};
 const lb={novo:sc?'Nova':'Novo',ign:sc?'Já cadastrada':'Já cadastrado',rej:sc?'Rejeitada':'Rejeitado'},cl={novo:'blue',ign:'',rej:'red'};
 const nome=sc?'requisição(ões)':'pedido(s)';
 A.innerHTML='<div class="card"><h3 style="margin-top:0">Prévia: '+(sc?'Solicitações de Compra':'Pedidos de Compra')+'</h3>'+
  '<p>'+F.files.length+' arquivo(s) · '+F.rows.length+' linha(s) de material · '+res.length+' '+nome+' encontrado(s). <b>Nada foi gravado ainda.</b></p>'+
  '<div class="kpis"><div class="card kpi"><b>'+N.length+'</b>'+(sc?'Solicitações novas':'Pedidos novos')+'</div><div class="card kpi"><b>'+I.length+'</b>'+(sc?'Já cadastradas':'Já cadastrados')+'</div><div class="card kpi al"><b>'+J.length+'</b>Inconsistências / rejeitados</div>'+
  '<div class="card kpi"><b>'+nO.ok+'</b>Obras já cadastradas</div><div class="card kpi"><b>'+nO.nova+'</b>Obras novas</div><div class="card kpi al"><b>'+nO.cor+'</b>Possíveis correções de código</div></div>'+
  blocoObras()+
  '<h3>Dados encontrados no arquivo</h3><div class="hub-t">'+res.slice(0,500).map(a=>'<div class="mv"><div><b>'+esc(a.resumo)+'</b> '+chip(lb[a.estado],cl[a.estado])+(!sc&&a.estado==='novo'&&a.total?' <span class="hint" style="display:inline">· '+mo(a.total)+'</span>':'')+'</div>'+
   (a.motivo?'<div class="'+(/^ATENÇÃO/.test(a.motivo)?'hub-w':'hint')+'" style="font-weight:400">'+esc(a.motivo)+'</div>':'')+(a.info?'<span class="hub-i">'+esc(a.info)+'</span>':'')+(a.estado==='novo'?linhasItens(a):'')+(!sc&&PC().vin&&PC().vin.tem(a)?PC().vin.caixa(a,F.vin):'')+(!sc&&a.estado==='novo'&&a.antes&&PC().em?PC().em.caixa(a,F.em):'')+'</div>').join('')+'</div>'+(res.length>500?'<p class="hint">Mostrando as 500 primeiras. A importação considera todas.</p>':'')+
  (AV?'<label class="hub-ck"><input type="checkbox" id="hub_av"><span><b>'+AV+' '+nome+' com ATENÇÃO.</b> Li os avisos da prévia e confirmo a importação.</span></label>':'')+
  '<div class="err hide" id="hub_e"></div><div class="hub-w" id="hub_m"></div><div class="acts"><button type="button" class="sec" id="hub_x">Cancelar</button><button type="button" class="btn" id="hub_ok">Confirmar e importar '+N.length+' '+(sc?'requisição(ões) nova(s)':'pedido(s) novo(s)')+'</button></div></div>';
 atualizaBotao();
 $h('hub_x').onclick=fecharFluxo;$h('hub_ok').onclick=executar;const av=$h('hub_av');if(av)av.onchange=atualizaBotao;
 if(!sc&&PC().em)PC().em.ligar($h('hub_area'),F.em,atualizaBotao);
 if(!sc&&PC().vin)PC().vin.ligar($h('hub_area'),F.vin,atualizaBotao)}
function atualizaBotao(){const b=$h('hub_ok');if(!b)return;
 const bloq=F.E.filter(E=>{const d=F.dec[E.key]||{};return faltaJust(E,d)});
 const av=$h('hub_av'),m=$h('hub_m');
 const VI=F.tipo==='pc'&&PC().vin,Nv=F.N?F.N.filter(a=>!(VI&&VI.pula(a,F.vin))):[];   /* pedidos deixados para depois não exigem as outras escolhas */
 const pe=F.tipo==='pc'&&PC().em&&F.N?PC().em.pend(Nv,F.em):[],pv=VI&&F.N?VI.pend(F.N,F.vin):[];
 b.disabled=!F.N||!Nv.length||!!(F.AV&&av&&!av.checked)||bloq.length>0||pe.length>0||pv.length>0;
 if(m)m.textContent=bloq.length?'Informe a justificativa das obras marcadas como “obra diferente” (mínimo 5 letras).':(pv.length?pv.length+' pedido(s) aguardam a sua escolha do item da requisição (veja a caixa “Conferência” dentro de cada pedido) ou marque “Não importar este pedido agora”.':pe.length?pe.length+' pedido(s) anterior(es) à aprovação formal aguardam a sua escolha sobre a autorização emergencial (veja a caixa dentro de cada pedido).':'')}

/* ---------- execução (solicitações e pedidos) ---------- */
function envia(a){return{linha:a.linha||0,motivo:(a.num&&!/^(Requisição|Pedido)/.test(a.motivo||'')?(F.tipo==='sc'?'Requisição ':'Pedido ')+a.num+': ':'')+(a.arq&&F.files.length>1?'['+a.arq+'] ':'')+(a.motivo||'')}}
async function executar(){
 const b=$h('hub_ok'),E1=$h('hub_e');if(!F||!b)return;
 const sc=F.tipo==='sc',VI=!sc&&PC().vin,P=VI?F.N.filter(a=>VI.pula(a,F.vin)):[],N=F.N.filter(a=>!P.includes(a)),I=F.I,J=F.J.slice(),usadas=chavesUsadas(N);
 P.forEach(a=>J.push({...a,estado:'rej',payload:undefined,motivo:'Não importado por escolha sua na conferência dos itens. Nada foi gravado deste pedido; importe-o de novo quando for conferir.'}));
 const mudancas=usadas.map(k=>{const E=F.E.find(e=>e.key===k);return '• '+resumoAcao(E,F.dec[k])});
 if(!confirm('Importar '+N.length+' '+(sc?'requisição(ões) nova(s)':'pedido(s) novo(s)')+'?\n'+I.length+' já cadastrado(s) serão ignorados e '+J.length+' rejeitado(s).'+(mudancas.length?'\n\nAlterações no cadastro de obras (auditadas):\n'+mudancas.join('\n'):'')+(sc?'':(()=>{const A=N.filter(a=>a.antes);if(!A.length)return '';const n1=A.filter(a=>(PC().em.dados(a,F.em)||{}).autorizada).length;return '\n\nPedidos anteriores à aprovação formal: '+n1+' com autorização emergencial e '+(A.length-n1)+' pendente(s) de regularização. A aprovação formal das requisições não é alterada.'})()+'\n\nIsto não dá entrada no estoque.')))return;
 b.disabled=true;E1.classList.add('hide');
 try{
  let cr={resultados:[],cadastradas:0,corrigidas:0,falhas:0};const mapa=new Map();
  if(usadas.length){const{data,error}=await sb.rpc('obras_conciliar',{p_arquivo:nomeArq(),p_acoes:usadas.map(k=>acaoDe(F.E.find(e=>e.key===k),F.dec[k]))});if(error)throw error;cr=data;usadas.forEach((k,i)=>mapa.set(k,cr.resultados[i]))}
  const ok=[];
  N.forEach(a=>{const k=chaveRes(a),E=k&&F.E.find(e=>e.key===k);let p=VI?VI.dados(a,F.vin):a.payload;const r=k&&mapa.get(k);
   if(r&&!r.ok){J.push({...a,estado:'rej',payload:undefined,motivo:'Obra “'+E.nome+'”: '+r.motivo});return}
   if(sc&&String(p.obra_id).startsWith('__novo__')){const q=r&&r.obra_id;if(!q){J.push({...a,estado:'rej',payload:undefined,motivo:'A obra não foi cadastrada.'});return}p={...p,obra_id:q}}
   if(!sc&&a.antes&&PC().em)p={...p,emergencia:PC().em.dados(a,F.em)};
   ok.push({...a,payload:p})});
  let data={importados:0,ignorados:I.length,rejeitados:J.length,itens:0,detalhes:{ignorados:[],rejeitados:[]}};
  if(ok.length||I.length||J.length){const r=await sb.rpc(sc?'importar_solicitacoes':'importar_pedidos',{p_arquivo:nomeArq(),p_dados:ok.map(a=>a.payload),p_rejeitados:J.map(envia),p_ignorados:I.map(envia)});
   if(r.error){E1.textContent=msg(r.error)+(cr.cadastradas+cr.corrigidas?' As obras já foram cadastradas/corrigidas e continuam assim; importe de novo o arquivo.':'');E1.classList.remove('hide');b.disabled=false;return}data=r.data}
  cache={};
  const rejRpc=(data.detalhes&&data.detalhes.rejeitados)||[],ignRpc=(data.detalhes&&data.detalhes.ignorados)||[];
  const txtRpc=rejRpc.concat(ignRpc).map(x=>x.motivo||'').join(' | ');
  const imp=ok.filter(a=>!a.num||!txtRpc.includes((sc?'Requisição ':'Pedido ')+a.num+':'));
  const R={titulo:'Resultado: '+(sc?'Solicitações de Compra':'Pedidos de Compra'),importados:data.importados,atualizados:cr.corrigidas,ignorados:data.ignorados,rejeitados:data.rejeitados,secoes:[]};
  if(cr.resultados.length)R.secoes.push({t:'Obras',l:cr.resultados.map(x=>(x.ok?(x.acao==='cadastrada'?'Obra cadastrada: ':x.acao==='corrigida'?'Código corrigido: ':'Sem alteração: '):'NÃO aplicado: ')+(x.codigo||'')+(x.nome?' · '+x.nome:'')+(x.codigo_anterior?' (antes: '+x.codigo_anterior+')':'')+(x.vinculos&&Object.keys(x.vinculos).length?' — ligações preservadas: '+vincDe(x.vinculos):'')+(x.motivo&&!x.ok?' — '+x.motivo:''))});
  R.secoes.push({t:sc?'Requisições importadas':'Pedidos importados',l:imp.map(a=>a.resumo)});
  if(!sc&&PC().em)R.secoes.push({t:'Pedidos anteriores à aprovação formal',l:PC().em.lista(data)});
  if(!sc&&(data.unidades_divergentes||[]).length)R.secoes.push({t:'Unidades divergentes (importadas e sinalizadas, sem conversão)',l:data.unidades_divergentes.map(d=>'Pedido '+d.pedido+' (requisição '+d.requisicao+'): '+d.material+' — no pedido: '+nf(d.quantidade_pedido)+' '+d.unidade_pedido+' · na requisição: '+d.unidade_requisicao+'. Não entra no % de atendimento até a regularização pelo administrador MASTERS.')});
  R.secoes.push({t:'Ignorados',l:I.map(a=>envia(a).motivo).concat(ignRpc.map(x=>x.motivo))});
  R.secoes.push({t:'Rejeitados',l:J.map(a=>envia(a).motivo).concat(rejRpc.map(x=>x.motivo))});
  if(!sc){const ids=[...new Set(imp.map(a=>{const s=F.ctx.sol.get(PC().nk(String(a.payload.requisicao)));return s&&s.id}).filter(Boolean))];
   const at=await atendimento(ids);if(at.length)R.secoes.push({t:'Atendimento das solicitações atualizado',l:at});
   R.nota='O percentual de atendimento é de COMPRA, não de recebimento. O estoque não foi alterado: ele só muda quando o almoxarife confirma o recebimento em “Receber materiais”.'}
  else R.nota='Materiais novos aparecem em “Materiais”, marcados para conferência. Nenhum estoque foi criado.';
  ULT=R;toast('Importação concluída.');voltarLista()
 }catch(e){E1.textContent=msg(e)||String(e);E1.classList.remove('hide');b.disabled=false}}
const vincDe=v=>Object.entries(v).map(([k,n])=>n+' '+k.replace(/_/g,' ')).join(', ');
const nomeArq=()=>F.files.length>1?F.files.length+' arquivos ('+F.files[0].name+', ...)':F.files[0].name;
async function atendimento(ids){const out=[],T=window.__atdTeste;if(!T)return out;
 for(const id of ids){try{const[a,b]=await Promise.all([sb.from('solicitacao_itens').select('id,solicitacao_id,quantidade,materiais(codigo,descricao,unidade)').eq('solicitacao_id',id),
   sb.from('pedidos_compra').select('id,solicitacao_id,numero_pedido,data_pedido,fornecedores(nome),pedido_itens(*)').eq('solicitacao_id',id)]);
  if(a.error||b.error)continue;const r=T.calcular(a.data,b.data),s=[...F.ctx.sol.values()].find(x=>x.id===id);
  out.push('Requisição '+(s?s.numero_sienge:'?')+': '+(r.estado||'—')+(r.estado&&r.estado!=='Pendente'?' · '+T.pc(r.pct):'')+' · '+r.npedidos+' pedido(s) ligado(s)')}catch(e){}}return out}

/* ---------- relatório ---------- */
function relHTML(R){return '<div class="card"><h3 style="margin-top:0">'+esc(R.titulo)+'</h3><div class="kpis"><div class="card kpi"><b>'+R.importados+'</b>Importados</div><div class="card kpi"><b>'+R.atualizados+'</b>Atualizados</div><div class="card kpi"><b>'+R.ignorados+'</b>Ignorados</div><div class="card kpi al"><b>'+R.rejeitados+'</b>Rejeitados</div></div>'+
 R.secoes.filter(s=>s.l&&s.l.length).map(s=>'<h3>'+esc(s.t)+' ('+s.l.length+')</h3>'+(s.l.length>40?'<details><summary>Mostrar a lista</summary>':'')+s.l.map(x=>'<div class="mv">'+esc(x)+'</div>').join('')+(s.l.length>40?'</details>':'')).join('')+
 (R.nota?'<p class="hint">'+esc(R.nota)+'</p>':'')+'<div class="acts"><button type="button" class="sec" id="hub_rx">Fechar relatório</button></div></div>'}
function mostrarRel(){const A=$h('hub_area');if(!A||!ULT)return;A.innerHTML=relHTML(ULT);$h('hub_rx').onclick=()=>{ULT=null;A.innerHTML=''};A.scrollIntoView&&A.scrollIntoView({block:'nearest'})}
function voltarLista(){F=null;const b=document.querySelector('#menu [data-v="'+(ULT&&ULT.pag==='obras'?'obras':'solicitacoes')+'"]');if(b)b.click();else mostrarRel()}
function fecharFluxo(){F=null;const A=$h('hub_area');if(A)A.innerHTML='';document.querySelectorAll('#hub [data-hub]').forEach(x=>x.classList.remove('on'))}
   
/* ---------- relação de obras do Sienge (aberta pelo botão da tela Obras) ---------- */
/* dados do arquivo que ficam gravados na obra. O arquivo do Sienge não traz endereço, cidade, CNPJ nem datas de início/término:
   por isso esses campos NÃO são inventados nem tocados. “Projeto” é o cliente da obra. */
function dadosDe(r){const o={cliente:r.projeto,situacao:r.situacao,empresa:r.empresa,categoria:r.categoria,area_negocio:r.area_negocio,tipo_negocio:r.tipo_negocio,
  situacao_orcamento:r.situacao_orcamento,nivel_apropriacao:r.nivel_apropriacao,data_cadastro_sienge:r.data_cadastro};
 Object.keys(o).forEach(k=>{if(o[k]==null||String(o[k]).trim()==='')delete o[k]});return o}
const ROT={cliente:'Cliente',situacao:'Situação no Sienge',empresa:'Empresa',categoria:'Categoria',area_negocio:'Área de negócio',tipo_negocio:'Tipo de negócio',situacao_orcamento:'Situação do orçamento',nivel_apropriacao:'Nível de apropriação',data_cadastro_sienge:'Data de cadastro no Sienge'};
/* o que mudaria numa obra JÁ cadastrada: só campos preenchidos no arquivo e diferentes do que está salvo (vazio nunca apaga) */
function difsObra(o,d){const ant=(k)=>k==='cliente'?o.cliente:k==='situacao'?o.situacao_sienge:(o.dados_sienge||{})[k],out=[];
 Object.keys(d).forEach(k=>{const a=ant(k);if(nz(a==null?'':a)!==nz(d[k]))out.push({k,rot:ROT[k]||k,antes:a==null||a===''?'—':String(a),depois:String(d[k])})});return out}
function lerRelacao(arr){
 let hi=-1,ja=0;for(let i=0;i<Math.min(arr.length,60);i++){const j=(arr[i]||[]).findIndex(c=>nz(c)==='obra centro de custo');if(j>=0){hi=i;ja=j;break}}
 if(hi<0)throw new Error('Não reconheci este arquivo como a relação de obras do Sienge (não achei a coluna “Obra/Centro de custo”).');
 const H=arr[hi].map(nz),col=(...n)=>H.findIndex(h=>n.includes(h)),P={data:col('data de cadastro'),cat:col('categoria'),emp:col('empresa'),proj:col('projeto'),tipo:col('tipo de negocio'),area:col('area de negocio'),sit:H.findIndex(h=>h.startsWith('situacao da obra')),sorc:col('situacao do orcamento'),niv:col('nivel de apropriacao')};
 const pd=PC().parseData,g=(r,k)=>P[k]<0?'':String(r[P[k]]==null?'':r[P[k]]).trim();
 const rows=[],rej=[],vis=new Map();
 for(let i=hi+1;i<arr.length;i++){const r=arr[i]||[],a=String(r[ja]==null?'':r[ja]).trim();
  if(!a||/^\d{1,2}\/\d{1,2}\/\d{4}\s*-\s*\d/.test(a))break;
  const m=a.match(/^(\d+)\s*-\s*([\s\S]+)$/);
  if(!m){rej.push({linha:i+1,motivo:'Linha '+(i+1)+': a obra “'+a+'” não começa com o código do Sienge (código - nome).'});continue}
  const c=m[1];if(vis.has(c)){rej.push({linha:i+1,motivo:'Linha '+(i+1)+': código '+c+' repetido no arquivo (já aparece na linha '+vis.get(c)+').'});continue}
  vis.set(c,i+1);
  rows.push({linha:i+1,codigo:c,nome:m[2].replace(/\s+/g,' ').trim(),empresa:g(r,'emp'),projeto:g(r,'proj'),categoria:g(r,'cat'),tipo_negocio:g(r,'tipo'),area_negocio:g(r,'area'),situacao:g(r,'sit'),situacao_orcamento:g(r,'sorc'),nivel_apropriacao:g(r,'niv'),data_cadastro:vz(g(r,'data'))?null:(typeof r[P.data]==='number'?pd(r[P.data]):pd(g(r,'data')))})}
 if(!rows.length)throw new Error('Não encontrei obras abaixo dos títulos.');
 return{rows,rej}}
async function lerArquivoObras(f){const n=f.name.toLowerCase();if(!(n.endsWith('.xlsx')||n.endsWith('.xls')))throw new Error('Use o arquivo Excel (.xlsx) com a relação de obras do Sienge.');
 const wb=XLSX.read(await f.arrayBuffer(),{type:'array'});let ult;
 for(const k of wb.SheetNames){try{return lerRelacao(XLSX.utils.sheet_to_json(wb.Sheets[k],{header:1,raw:true,defval:''}))}catch(e){ult=e}}throw ult}
function renderObras(){const A=$h('hub_area');if(!A||!F)return;
 const L=F.E,ok=L.filter(e=>e.status==='ok'),nv=L.filter(e=>e.status==='nova'),cr=L.filter(e=>e.status==='corrigir'),adm=isAdm(),
  precisa=ok.filter(e=>e.key in F.upd),nSelAtu=precisa.filter(e=>F.upd[e.key]).length,okNota=ok.filter(e=>e.notas.length);
 const nSel=nv.filter(e=>(F.dec[e.key]||{}).acao==='nova').length,nCor=cr.filter(e=>(F.dec[e.key]||{}).acao==='corrigir').length;
 const arqCod=new Set(F.rowsO.map(r=>cod(r.codigo))),fora=F.base.obras.filter(o=>!arqCod.has(cod(o.codigo)));
 const mesmoNome=[];{const m={};F.rowsO.forEach(r=>{(m[nz(r.nome)]=m[nz(r.nome)]||[]).push(r.codigo)});Object.entries(m).forEach(([k,v])=>{if(v.length>1)mesmoNome.push(v.join(' e '))})}
 const dupSis=[];F.base.obras.forEach((a,i)=>F.base.obras.slice(i+1).forEach(b=>{if(parecidas(a.nome,b.nome))dupSis.push('“'+a.nome+'” ('+a.codigo+') e “'+b.nome+'” ('+b.codigo+')')}));
 const novasRef=F.rowsO.filter(r=>!F.base.ref.has(cod(r.codigo))).length,altRef=F.rowsO.filter(r=>{const o=F.base.ref.get(cod(r.codigo));return o&&nz(o.nome)!==nz(r.nome)}).length;
 const incons=F.rej.length+okNota.length+mesmoNome.length;
 A.innerHTML='<div class="card"><h3 style="margin-top:0">Prévia: Importar Obras do Sienge</h3><p>'+esc(F.files[0].name)+' · '+F.rowsO.length+' obra(s) lida(s). <b>Nada foi gravado ainda.</b> Nenhuma obra é apagada por esta importação.</p>'+
 (F.semSql?'<div class="err">Falta instalar o SQL 12 no Supabase. Instale e tente de novo.</div>':'')+
 (F.semSql14&&!F.semSql?'<div class="err">Falta instalar o SQL 14 no Supabase (ele guarda cliente, situação e demais dados do Sienge nas obras). Instale e tente de novo.</div>':'')+
 '<div class="kpis"><div class="card kpi"><b>'+F.rowsO.length+'</b>Obras no arquivo</div><div class="card kpi"><b>'+ok.length+'</b>Já cadastradas no sistema</div><div class="card kpi"><b>'+nv.length+'</b>Obras novas</div><div class="card kpi al"><b>'+precisa.length+'</b>Precisam de atualização</div><div class="card kpi al"><b>'+cr.length+'</b>Possíveis duplicidades (código diferente)</div><div class="card kpi al"><b>'+incons+'</b>Inconsistências para conferir</div></div>'+
 '<p class="hint">A relação oficial também fica guardada como referência para conferir códigos: '+novasRef+' obra(s) nova(s) na referência, '+altRef+' com nome diferente do que estava guardado. Isso, sozinho, não cria nem altera obras do cadastro.</p>'+
 '<p class="hint">O arquivo do Sienge traz código, nome, projeto (cliente), situação, empresa e categoria. Ele <b>não traz</b> endereço, cidade, CNPJ nem datas de início e término; por isso esses campos não são alterados.</p>'+
 (mesmoNome.length?'<p class="hint">Atenção: no próprio Sienge há nomes iguais com códigos diferentes ('+esc(mesmoNome.join('; '))+'). São tratadas como obras diferentes, pois o código oficial é diferente.</p>':'')+
 (cr.length?'<h3>Possíveis correções de código</h3>'+(adm?'<p class="hint">Obras cadastradas à mão que parecem ser a obra do Sienge. Confira e decida: nada muda antes do “Confirmar”.</p>'+cr.map((E,i)=>cartaoDecisao(E,i,true)).join(''):''):'')+
 (precisa.length?'<h3>Obras já cadastradas que precisam de atualização</h3><p class="hint">Somente campos preenchidos no arquivo e diferentes do cadastro. Campo vazio no arquivo nunca apaga nada. Nome, código, endereço e situação da obra no sistema não são alterados. <b>Desmarque</b> as obras que não devem ser atualizadas.</p>'+
  '<div class="wrap hub-t"><table style="min-width:560px"><thead><tr><th>Atualizar</th><th>Obra</th><th>O que muda</th></tr></thead><tbody>'+precisa.map(E=>'<tr><td><input type="checkbox" data-a="'+esc(E.key)+'" aria-label="Atualizar '+esc(E.obra.nome)+'"'+(F.upd[E.key]?' checked':'')+(adm?'':' disabled')+'></td><td>'+esc(E.codigo)+' · '+esc(E.obra.nome)+'</td><td>'+difsObra(E.obra,E.dados).map(d=>'<span class="hub-i"><b>'+esc(d.rot)+'</b>: '+esc(d.antes)+' → '+esc(d.depois)+'</span>').join('')+'</td></tr>').join('')+'</tbody></table></div>':'')+
 (nv.length?'<h3>Obras novas</h3><p class="hint">Já estão marcadas as obras novas que serão cadastradas. Desmarque as que a empresa não quer cadastrar agora (continuam só na relação de referência e podem ser cadastradas depois). Não há limite de obras.</p>'+
  '<div class="acts" style="justify-content:flex-start;margin:0 0 8px"><button type="button" class="mini" id="hub_all">Marcar todas as novas</button><button type="button" class="mini" id="hub_none">Desmarcar todas</button></div>'+
  '<div class="wrap hub-t"><table style="min-width:560px"><thead><tr><th>Cadastrar</th><th>Código</th><th>Obra</th><th>Cliente / categoria</th></tr></thead><tbody>'+nv.map(E=>{const d=F.dec[E.key]||{acao:'nao'},r=F.rowsO.find(x=>cod(x.codigo)===cod(E.codigo));
   return '<tr><td><input type="checkbox" data-n="'+esc(E.key)+'" aria-label="Cadastrar '+esc(E.nome)+'"'+(d.acao==='nova'?' checked':'')+(adm?'':' disabled')+'></td><td>'+esc(E.codigo)+'</td><td>'+esc(E.nome)+(E.exigeJust&&E.parecidas&&E.parecidas.length?'<span class="hub-i">Parecida com “'+esc(E.parecidas[0].nome)+'” ('+esc(E.parecidas[0].codigo)+').</span>'+(d.acao==='nova'?'<input class="hub-j" data-k="'+esc(E.key)+'" placeholder="Por que é outra obra? (obrigatório)" value="'+esc(d.just||'')+'">':''):'')+'</td><td>'+esc([r&&r.projeto,r&&r.categoria].filter(Boolean).join(' · '))+'</td></tr>'}).join('')+'</tbody></table></div>':'')+
 '<details><summary>Obras já cadastradas ('+ok.length+') — mantidas como estão, salvo as marcadas acima</summary><div class="wrap hub-t"><table style="min-width:460px"><thead><tr><th>Código</th><th>No arquivo</th><th>No sistema</th></tr></thead><tbody>'+ok.map(E=>'<tr><td>'+esc(E.codigo)+'</td><td>'+esc(E.nome)+'</td><td>'+esc(E.obra.nome)+(E.notas.length?'<span class="hub-i">'+esc(E.notas.join(' '))+'</span>':'')+'</td></tr>').join('')+'</tbody></table></div></details>'+
 (fora.length?'<details><summary>No sistema e fora da relação ('+fora.length+')</summary><p class="hint">Não serão apagadas nem alteradas.</p>'+fora.map(o=>'<div class="mv">'+esc(o.codigo)+' · '+esc(o.nome)+'</div>').join('')+'</details>':'')+
 (dupSis.length?'<details open><summary class="hub-w">Possíveis duplicidades já existentes no cadastro ('+dupSis.length+')</summary><p class="hint">Confira na lista de Obras. Nada foi alterado.</p>'+dupSis.map(t=>'<div class="mv">'+esc(t)+'</div>').join('')+'</details>':'')+
 (incons?'<details'+(okNota.length||mesmoNome.length?' open':'')+'><summary class="hub-w">Inconsistências para conferir ('+incons+')</summary>'+F.rej.map(r=>'<div class="mv">Rejeitada — '+esc(r.motivo)+'</div>').join('')+okNota.map(E=>'<div class="mv">Obra '+esc(E.codigo)+' — '+esc(E.notas.join(' '))+'</div>').join('')+mesmoNome.map(t=>'<div class="mv">Códigos '+esc(t)+': mesmo nome no Sienge, tratados como obras diferentes.</div>').join('')+'</details>':'')+
 (!adm?'<div class="err">Somente o administrador MASTERS importa obras.</div>':'')+
 '<div class="err hide" id="hub_e"></div><div class="hub-w" id="hub_m"></div><div class="acts"><button type="button" class="sec" id="hub_x">Cancelar</button><button type="button" class="btn" id="hub_ok">Confirmar importação</button></div></div>';
 $h('hub_x').onclick=fecharFluxo;$h('hub_ok').onclick=executarObras;
 const aa=$h('hub_all'),an=$h('hub_none');
 if(aa)aa.onclick=()=>{nv.forEach(E=>{if(!F.dec[E.key]||F.dec[E.key].acao!=='nova')F.dec[E.key]={acao:'nova',just:(F.dec[E.key]||{}).just}});renderObras()};
 if(an)an.onclick=()=>{nv.forEach(E=>{F.dec[E.key]={acao:'nao'}});renderObras()};
 atualizaBotaoObras()}
function atualizaBotaoObras(){const b=$h('hub_ok'),m=$h('hub_m');if(!b)return;const bloq=F.E.filter(E=>faltaJust(E,F.dec[E.key]||{}));
 b.disabled=F.semSql||F.semSql14||!isAdm()||bloq.length>0;if(m)m.textContent=bloq.length?'Informe a justificativa das obras marcadas que têm nome parecido com outra obra (mínimo 5 letras).':''}
async function executarObras(){const b=$h('hub_ok'),E1=$h('hub_e');if(!F||!b)return;
 const usadas=F.E.filter(E=>(E.status==='nova'||E.status==='corrigir')&&['nova','corrigir'].includes((F.dec[E.key]||{}).acao)),mud=usadas.map(E=>'• '+resumoAcao(E,F.dec[E.key])),
  atu=F.E.filter(E=>E.status==='ok'&&F.upd[E.key]);atu.forEach(E=>mud.push('• atualizar dados da obra '+E.codigo+' · '+E.obra.nome+' ('+difsObra(E.obra,E.dados).map(d=>d.rot).join(', ')+')'));
 if(!confirm('Importar as obras do Sienge ('+F.rowsO.length+' no arquivo)?'+(mud.length?'\n\nAlterações no cadastro de obras (auditadas):\n'+mud.join('\n'):'\n\nNenhuma obra será cadastrada, corrigida ou atualizada.')+'\n\nNenhuma obra será apagada. As ligações (solicitações, pedidos, funcionários, materiais, ferramentas) são preservadas.'))return;
 b.disabled=true;E1.classList.add('hide');
 try{
  const r1=await sb.rpc('obras_sienge_atualizar',{p_arquivo:F.files[0].name,p_linhas:F.rowsO});if(r1.error)throw r1.error;
  let cr={resultados:[],cadastradas:0,corrigidas:0,atualizadas:0,falhas:0};
  const acoes=usadas.map(E=>acaoDe(E,F.dec[E.key])).concat(atu.map(E=>({acao:'atualizar_dados',codigo:E.codigo,nome:E.nome,obra_id:E.obra.id,dados:E.dados,confirmado:true})));
  if(acoes.length){const r2=await sb.rpc('obras_conciliar',{p_arquivo:F.files[0].name,p_acoes:acoes});if(r2.error)throw r2.error;cr=r2.data}
  cache={};const d=r1.data,ok=F.E.filter(e=>e.status==='ok'),naoMarc=F.E.filter(e=>e.status==='nova'&&!['nova'].includes((F.dec[e.key]||{}).acao)).length,
   semMud=ok.filter(e=>!F.upd[e.key]).length+cr.resultados.filter(x=>x.ok&&x.acao==='sem_alteracao').length;
  const R={pag:'obras',titulo:'Resultado: Importação de obras do Sienge',importados:cr.cadastradas,atualizados:cr.corrigidas+(cr.atualizadas||0),ignorados:semMud+naoMarc,rejeitados:F.rej.length+cr.falhas,secoes:[]},
   nm=x=>(x.codigo||'')+(x.nome?' · '+x.nome:'');
  R.secoes.push({t:'Obras importadas (cadastradas agora)',l:cr.resultados.filter(x=>x.ok&&x.acao==='cadastrada').map(nm)});
  R.secoes.push({t:'Obras atualizadas (dados do Sienge)',l:cr.resultados.filter(x=>x.ok&&x.acao==='atualizada').map(nm)});
  R.secoes.push({t:'Códigos corrigidos',l:cr.resultados.filter(x=>x.ok&&x.acao==='corrigida').map(x=>nm(x)+(x.codigo_anterior?' (antes: '+x.codigo_anterior+')':'')+(x.vinculos&&Object.keys(x.vinculos).length?' — ligações preservadas: '+vincDe(x.vinculos):''))});
  R.secoes.push({t:'Ignoradas',l:(semMud?['Obras já cadastradas, sem alteração: '+semMud]:[]).concat(naoMarc?['Obras novas que você não marcou (continuam só na referência): '+naoMarc]:[])});
  R.secoes.push({t:'Rejeitadas',l:F.rej.map(x=>x.motivo).concat(cr.resultados.filter(x=>!x.ok).map(x=>'Obra '+x.codigo+': '+x.motivo))});
  R.secoes.push({t:'Relação oficial (referência de códigos)',l:['Novas na referência: '+d.novas,'Atualizadas na referência: '+d.atualizadas,'Sem diferença: '+d.sem_diferenca]});
  R.nota='Nenhuma obra foi apagada. Correções de código e atualizações mantêm todas as ligações (solicitações, pedidos, funcionários, materiais, ferramentas, malas) e ficam registradas na auditoria. As obras importadas já estão na lista de Obras.';
  ULT=R;toast('Importação de obras concluída.');voltarLista()
 }catch(e){E1.textContent=msg(e)||String(e);E1.classList.remove('hide');b.disabled=false}}

/* ---------- abrir cada importação ---------- */
const TEXTOS={
 sc:['Importar Solicitações de Compra','Escolha o relatório <b>“Solicitações de Compra”</b> do Sienge, do jeito que ele sai. Pode escolher <b>vários arquivos de uma vez</b>. O sistema lê a requisição, a obra, o solicitante e os materiais, e pula o que já foi importado.'],
 pc:['Importar Pedidos de Compra','Escolha o relatório <b>“Pedido de Compra”</b> do Sienge, do jeito que ele sai. Pode escolher <b>vários arquivos de uma vez</b>. A solicitação ligada ao pedido precisa estar importada e aprovada. <b>Isto não dá entrada no estoque.</b>'],
 ob:['Importar Obras do Sienge','Escolha o arquivo Excel com a <b>relação de obras</b> do Sienge, do jeito que ele sai. O sistema confere o <b>código oficial</b>, reconhece as obras já cadastradas, mostra uma prévia e só grava depois da sua confirmação. <b>Nenhuma obra é apagada.</b>']};
function abrirFluxo(tipo){const A=$h('hub_area');if(!A)return;
 if(!window.XLSX){toast('A biblioteca de planilhas ainda está carregando. Tente de novo em instantes.');return}
 if(!(tipo==='sc'?SC():tipo==='pc'?PC():true)){toast('A importação de '+(tipo==='sc'?'solicitações':'pedidos')+' não carregou. Recarregue a página.');return}
 F={tipo,dec:{},em:{},vin:{},E:[],files:[],rows:[],falhas:[],rk:new Map()};ULT=null;
 document.querySelectorAll('#hub [data-hub]').forEach(x=>x.classList.toggle('on',x.dataset.hub===tipo));
 A.innerHTML='<div class="card"><h3 style="margin-top:0">'+TEXTOS[tipo][0]+'</h3><p>'+TEXTOS[tipo][1]+'</p><input id="hub_f" type="file" accept=".xlsx,.xls'+(tipo==='ob'?'':',.csv')+'"'+(tipo==='ob'?'':' multiple')+' aria-label="Escolher arquivo"><div id="hub_r"></div></div>';
 $h('hub_f').onchange=e=>lerArquivos([...e.target.files]);A.scrollIntoView&&A.scrollIntoView({block:'nearest'})}
async function lerArquivos(files){if(!files.length||!F)return;const tipo=F.tipo,R=$h('hub_r');R.innerHTML='<p class="sub">Lendo o arquivo…</p>';F.files=files;
 try{
  F.base=await baseObras();F.semSql=F.base.semSql;
  if(tipo==='ob'){const rows=[],rej=[];try{const r=await lerArquivoObras(files[0]);rows.push(...r.rows);rej.push(...r.rej)}catch(e){R.innerHTML='<div class="err">'+esc(e.message||String(e))+'</div>';return}
   F.rowsO=rows;F.rej=rej;const ofic=new Set(rows.map(r=>cod(r.codigo)));
   F.E=resolver(rows.map(r=>({key:chave(r.codigo,r.nome),codigo:r.codigo,nome:r.nome,linhas:1})),F.base,ofic);
   F.E.forEach(E=>{const r=rows.find(x=>cod(x.codigo)===cod(E.codigo));E.dados=r?dadosDe(r):{};F.dec[E.key]=decPadrao(E,'ob')});
   F.upd={};if(!F.semSql14)F.E.forEach(E=>{if(E.status==='ok'&&E.obra&&difsObra(E.obra,E.dados).length)F.upd[E.key]=true});
   await vinculos();A_ob();return}
  let rows=[];const falhas=[];
  for(const f of files){try{rows=rows.concat(await(tipo==='sc'?SC().ler(f):PC().ler(f)))}catch(e){falhas.push({linha:0,arq:f.name,resumo:'Arquivo '+f.name,estado:'rej',motivo:e.message||String(e)})}}
  F.rows=rows;F.falhas=falhas;F.ctx=tipo==='sc'?await ctxSC():await PC().contexto();
  const{refs,rk}=refsDe(rows);F.rk=rk;F.E=resolver(refs,F.base);F.E.forEach(E=>{F.dec[E.key]=decPadrao(E,tipo)});await vinculos();
  if(!rows.length&&falhas.length){R.innerHTML='';A_vazio(falhas);return}
  render()
 }catch(e){R.innerHTML='<div class="err">'+esc(e.message||msg(e))+'</div>'}}
function A_vazio(falhas){const A=$h('hub_area');A.innerHTML='<div class="card"><h3 style="margin-top:0">Não foi possível ler o arquivo</h3>'+falhas.map(f=>'<div class="err">'+esc(f.arq+': '+f.motivo)+'</div>').join('')+'<div class="acts"><button type="button" class="sec" id="hub_x">Fechar</button></div></div>';$h('hub_x').onclick=fecharFluxo}
function A_ob(){renderObras()}
async function vinculos(){F.vinc={};if(!isAdm()||F.semSql)return;const ids=[...new Set(F.E.flatMap(E=>E.cands.map(c=>c.id)))];if(!ids.length)return;
 try{const{data,error}=await sb.rpc('obras_vinculos',{p_ids:ids});if(!error&&data)F.vinc=data}catch(e){}}

/* decisões: um tratador só, para qualquer tela de importação */
function decidir(e){const t=e.target,A=$h('hub_area');if(!F||!A||!A.contains(t))return;
 if(t.matches('input[type=radio][data-k]')){const k=t.dataset.k,v=t.value,d=F.dec[k]||{};
  F.dec[k]=v==='nao'?{acao:'nao'}:v==='nova'?{acao:'nova',just:d.just}:{acao:'corrigir',obraId:v.slice(2)};
  if(v.startsWith('c:'))Object.keys(F.dec).forEach(o=>{if(o!==k&&F.dec[o].acao==='corrigir'&&F.dec[o].obraId===v.slice(2))F.dec[o]={acao:'nao'}});  /* um cadastro só pode ser corrigido para um código */(F.tipo==='ob'?renderObras:render)();return}
 if(t.matches('input[type=checkbox][data-a]')){F.upd[t.dataset.a]=t.checked;renderObras();return}
 if(t.matches('input[type=checkbox][data-n]')){const k=t.dataset.n;F.dec[k]=t.checked?{acao:'nova',just:(F.dec[k]||{}).just}:{acao:'nao'};(F.tipo==='ob'?renderObras:render)();return}
 if(t.matches('input.hub-j')){const k=t.dataset.k;F.dec[k]=Object.assign({},F.dec[k],{just:t.value});F.tipo==='ob'?atualizaBotaoObras():atualizaBotao()}}

/* ---------- painel no alto de "Solicitações e pedidos" ---------- */
function injetar(){const v=$h('view'),h=v&&v.querySelector('h1');
 if(!h||h.textContent.trim()!=='Solicitações e pedidos'||!me||me.perfil==='FUNCIONARIO'||v.querySelector('#hub'))return;
 const bar=v.querySelector('.bar');if(!bar)return;estilo();
 const el=document.createElement('div');el.className='card hub';el.id='hub';
 el.innerHTML='<h3>Importar do Sienge</h3><p class="hint">Use os relatórios do Sienge do jeito que saem. Nada é gravado antes da sua confirmação.</p><div class="hub-b">'+
  '<button type="button" class="btn" data-hub="sc">Importar Solicitações de Compra</button><button type="button" class="btn" data-hub="pc">Importar Pedidos de Compra</button>'+
  '</div><div id="hub_area" class="hub-a" aria-live="polite"></div>';
 bar.insertAdjacentElement('beforebegin',el);
 el.querySelectorAll('[data-hub]').forEach(b=>b.onclick=()=>abrirFluxo(b.dataset.hub));
 if(ULT&&ULT.pag!=='obras')mostrarRel()}
/* área de prévia/relatório na tela Obras (o botão “Importar Obras do Sienge” é o que já existe nessa tela, em modulo-importar-obras.js) */
function injetarObras(){const v=$h('view'),h=v&&v.querySelector('h1');
 if(!h||h.textContent.trim()!=='Obras'||!isAdm())return;
 if(v.querySelector('#hub_area'))return;const bar=v.querySelector('.bar');if(!bar)return;estilo();
 const a=document.createElement('div');a.id='hub_area';a.className='card hub hub-a hub-o';a.setAttribute('aria-live','polite');bar.insertAdjacentElement('afterend',a);
 if(ULT&&ULT.pag==='obras')mostrarRel()}
function abrirObras(){injetarObras();if(!$h('hub_area'))return false;abrirFluxo('ob');return true}
document.addEventListener('change',decidir,true);document.addEventListener('input',e=>{if(e.target&&e.target.matches&&e.target.matches('input.hub-j'))decidir(e)},true);
new MutationObserver(()=>{injetar();injetarObras()}).observe($h('view'),{childList:true,subtree:true});
estilo();injetar();injetarObras();
window.__hubObras={abrir:abrirObras};
window.__hubTeste={parecidas,resolver,lerRelacao,refsDe,get F(){return F},set F(v){F=v},get ULT(){return ULT},baseObras,chave,decPadrao,injetar};
})()}catch(e){window.__hubErro=e;console.error('Central de importações não carregou:',e);
 const av=()=>{const t=document.getElementById('toast');if(t){t.textContent='Central de importações não carregou: '+e.message;t.classList.add('on')}};
 if(document.readyState==='complete')av();else window.addEventListener('load',av)}
