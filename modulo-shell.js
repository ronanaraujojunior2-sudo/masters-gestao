/* MASTERS GESTÃO - modulo-shell.js (redesenho, onda 1)
   1) Menu lateral: reúne os botões que os módulos já criam em 6 categorias recolhíveis
      (Cadastros, Malões e malas, Compras, Importações, Administração, Aplicativo). Os botões são os mesmos
      (mesmos data-v e mesmas ações): só mudam de lugar. Categoria sem nenhum item para o perfil não aparece.
   2) Painel novo: só lê dados reais (RLS por obra) e cada cartão, barra e alerta abre a tela correspondente.
   Não grava nada, não cria tabelas, não altera SQL. Carregar por último, depois de todos os outros módulos. */
try{(function(){
const $q=s=>document.querySelector(s);
const NF=n=>new Intl.NumberFormat('pt-BR').format(n);
const svg=(d,s)=>'<svg width="'+(s||18)+'" height="'+(s||18)+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+d+'"/></svg>';
const IC={clip:'M9 4h6a1 1 0 0 1 1 1v1H8V5a1 1 0 0 1 1-1zM8 6H6a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-2M9 12h6M9 16h4',
 truck:'M10 17h4V5H2v12h3M14 8h4l4 4v5h-3M7 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM17 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
 swap:'M7 7h13M16 3l4 4-4 4M17 17H4M8 13l-4 4 4 4',
 wrench:'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z',
 alert:'M12 3 2 20h20zM12 9v5M12 17h.01',clock:'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
 pack:'M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73zM12 22V12M3.3 7 12 12l8.7-5M7.5 4.27l9 5.15',
 layers:'M12 3 2 8l10 5 10-5zM2 13l10 5 10-5'};
const CHEV='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';

/* ================= 1) MENU EM CATEGORIAS ================= */
const CAT=[['cadastros','Cadastros'],['maloes','Malões e malas'],['compras','Compras'],['importacoes','Importações'],['admin','Administração'],['app','Aplicativo']];
const MAPV={obras:'cadastros',funcionarios:'cadastros',ferramentas:'cadastros',materiais:'cadastros',fornecedores:'cadastros',disciplinas:'cadastros',categorias:'cadastros',
 maloes:'maloes',malas:'maloes',consulta:'maloes',
 solicitacoes:'compras',receber:'compras',estoque:'compras',
 imp_solic:'importacoes',imp_ped:'importacoes',imp_solicitacoes:'importacoes',imp_feriados:'importacoes',imp_obras:'importacoes',importacoes:'importacoes',
 usuarios:'admin',feriados:'admin'};
const ORD={cadastros:['obras','funcionarios','ferramentas','materiais','fornecedores','disciplinas','categorias'],maloes:['maloes','malas','consulta'],
 compras:['solicitacoes','receber','estoque'],importacoes:['imp_solic','imp_ped','imp_solicitacoes','imp_obras','imp_feriados'],admin:['usuarios','feriados'],app:[]};
const H4={cadastros:'cadastros','maloes e malas':'maloes',compras:'compras',importacao:'importacoes',importacoes:'importacoes',administracao:'admin',aplicativo:'app',almoxarifado:'compras'};
const norm=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().trim();
const abertas=new Set();let ativoAnt=null,obs=null,tmo=null;

function aplica(){const m=$q('#menu');if(!m)return;
 m.querySelectorAll('.mg').forEach(g=>{const k=g.dataset.g,a=abertas.has(k),h=g.querySelector('.mg-h'),b=g.querySelector('.mg-b');
  if(g.classList.contains('aberta')!==a)g.classList.toggle('aberta',a);
  h.setAttribute('aria-expanded',a?'true':'false');if(b.hidden===a)b.hidden=!a})}
function sync(force){const m=$q('#menu');if(!m)return;
 const on=m.querySelector('.nav.on'),g=on&&on.closest('.mg'),k=g?g.dataset.g:null,v=on?on.dataset.v||on.dataset.pwa:null;
 if(force||v!==ativoAnt){ativoAnt=v;if(k)abertas.add(k)}
 m.querySelectorAll('.mg').forEach(x=>{const a=x.dataset.g===k;if(x.classList.contains('ativa')!==a)x.classList.toggle('ativa',a)});
 aplica()}
function organizar(){
 const m=$q('#menu');if(!m||!m.children.length)return;
 let h=null;
 m.querySelectorAll('h4,button.nav').forEach(x=>{if(x.tagName==='H4'){h=H4[norm(x.textContent)]||null;return}
  if(!x.dataset.mgc&&h&&!x.closest('.mg'))x.dataset.mgc=h});
 const navs=[...m.querySelectorAll('button.nav')],pn=navs.find(b=>b.dataset.v==='painel');
 const G={};CAT.forEach(c=>G[c[0]]=[]);const soltos=[];
 navs.forEach(b=>{if(b===pn)return;const c=b.dataset.pwa==='inst'?'app':(MAPV[b.dataset.v]||b.dataset.mgc);(c&&G[c]?G[c]:soltos).push(b)});
 CAT.forEach(c=>{const o=ORD[c[0]];G[c[0]].sort((a,b)=>{const i=o.indexOf(a.dataset.v),j=o.indexOf(b.dataset.v);return(i<0?99:i)-(j<0?99:j)})});
 const id=b=>b.dataset.v||b.dataset.pwa||b.textContent;
 const sig=CAT.map(c=>c[0]+':'+G[c[0]].map(id).join(',')).join('|')+'|s:'+soltos.map(id).join(',')+'|p:'+(pn?1:0);
 if(m.dataset.sig===sig&&!m.querySelector(':scope>h4,:scope>.soon'))return sync();
 if(obs)obs.disconnect();
 const fr=document.createDocumentFragment();if(pn)fr.appendChild(pn);
 CAT.forEach(c=>{const L=G[c[0]];if(!L.length)return;
  const g=document.createElement('div');g.className='mg';g.dataset.g=c[0];
  const bh=document.createElement('button');bh.type='button';bh.className='mg-h';bh.id='mgh-'+c[0];bh.setAttribute('aria-controls','mgb-'+c[0]);bh.innerHTML='<span>'+c[1]+'</span>'+CHEV;
  const bb=document.createElement('div');bb.className='mg-b';bb.id='mgb-'+c[0];bb.setAttribute('role','group');bb.setAttribute('aria-labelledby','mgh-'+c[0]);
  L.forEach(b=>bb.appendChild(b));g.appendChild(bh);g.appendChild(bb);fr.appendChild(g)});
 soltos.forEach(b=>fr.appendChild(b));
 m.replaceChildren(fr);m.dataset.sig=sig;
 if(!m.dataset.mgl){m.dataset.mgl='1';m.addEventListener('click',e=>{const bt=e.target.closest('.mg-h');if(!bt)return;
  const k=bt.parentNode.dataset.g;if(abertas.has(k))abertas.delete(k);else abertas.add(k);aplica()})}
 sync(true);vigia()}
function vigia(){const m=$q('#menu');if(!m)return;
 if(!obs)obs=new MutationObserver(rs=>{if(!rs.some(r=>r.type==='childList'||(r.target.classList&&r.target.classList.contains('nav'))))return;
  clearTimeout(tmo);tmo=setTimeout(organizar,0)});
 obs.observe(m,{childList:true,subtree:true,attributes:true,attributeFilter:['class']})}
/* organiza só DEPOIS que toda a cadeia de menu() terminou (qualquer ordem de carga dos módulos): os módulos antigos procuram o título "Em breve" para se encaixar */
const _menuS=menu;menu=function(){const r=_menuS.apply(this,arguments);queueMicrotask(organizar);return r};
vigia();if($q('#menu')&&$q('#menu').children.length)organizar();

/* ================= 2) PAINEL ================= */
let D=null,OBRA='',seq=0,canal=null,tRt=null,rt='';
const SP=[['Aguardando autorização','s4'],['Dentro do prazo','s1'],['Prazo vencido','s5'],['Regularizado','s3']];
const SR=[['Não comprado','s4'],['Aguardando recebimento','s2'],['Recebimento parcial','s3'],['Recebido totalmente','s1'],['Com divergência','s5']];
const temNav=v=>!!document.querySelector('#menu .nav[data-v="'+v+'"]');
function esperar(sel,ms,fn){const t0=Date.now();(function p(){const e=document.querySelector(sel);if(e)return fn(e);if(Date.now()-t0<ms)setTimeout(p,150)})()}
function ir(v,filtro,depois){const b=document.querySelector('#menu .nav[data-v="'+v+'"]');if(!b)return;b.click();
 if(filtro)Object.keys(filtro).forEach(k=>esperar('[data-pzs="'+k+'"]',5000,s=>{if([...s.options].some(o=>o.value===filtro[k])){s.value=filtro[k];s.dispatchEvent(new Event('change',{bubbles:true}))}}));
 if(depois)esperar(depois,5000,e=>e.click())}
async function todos(tab,cols,mod){const out=[];
 for(let a=0;a<20000;a+=1000){let q=sb.from(tab).select(cols);if(mod)q=mod(q);const r=await q.order('id').range(a,a+999);
  if(r.error)return{erro:msg(r.error)||String(r.error)};out.push(...r.data);if(r.data.length<1000)break}
 return{data:out}}
const um=async p=>{try{const r=await p;return r.error?{erro:msg(r.error)||String(r.error)}:{data:r.data,count:r.count}}catch(e){return{erro:msg(e)||String(e)}}};
const TCOLS='id,tipo,status,obra_origem_id,obra_destino_id,obra_origem_nome,obra_destino_nome,solicitado_em,solicitado_por_nome,confirmado_em,confirmado_por_nome,cancelado_em,cancelamento_tipo';
async function carregar(){
 const [sp,sr,tp,tr,fe,fu,ob,es,ma,pi,fm,rc,cm]=await Promise.all([
  todos('solicitacoes_prazo','id,obra_id,numero_sienge,situacao,atraso'),
  todos('solicitacoes_recebimento','id,obra_id,situacao'),
  um(sb.from('transferencias').select(TCOLS).eq('status','Pendente')),
  um(sb.from('transferencias').select(TCOLS).order('solicitado_em',{ascending:false}).limit(10)),
  todos('ferramentas','id,nome,codigo_patrimonial,obra_id,situacao'),
  todos('funcionarios','id,obra_id,situacao'),
  um(sb.from('obras').select('id,codigo,nome,status').order('nome')),
  todos('estoque_material','id,obra_id,material_id,saldo'),
  todos('materiais','id,descricao,estoque_minimo',q=>q.gt('estoque_minimo',0).eq('ativo',true)),
  todos('pedido_itens','id,pedido_id',q=>q.eq('unidade_divergente',true)),
  um(sb.from('ferramenta_movs').select('id,ferramenta_id,tipo,em,obra_id').in('tipo',['Retirada','Devolução']).order('em',{ascending:false}).limit(10)),
  um(sb.from('recebimentos_pedido').select('id,solicitacao_id,obra_id,criado_em,usuario_nome,estornado_em').order('criado_em',{ascending:false}).limit(10)),
  um(sb.from('materiais').select('id',{count:'exact',head:true}))]);
 let ped=[];
 if(pi.data&&pi.data.length){const ids=[...new Set(pi.data.map(x=>x.pedido_id))];
  for(let i=0;i<ids.length;i+=100){const r=await um(sb.from('pedidos_compra').select('id,obra_id').in('id',ids.slice(i,i+100)));if(r.data)ped.push(...r.data)}}
 return{sp,sr,tp,tr,fe,fu,ob,es,ma,pi,fm,rc,cm,ped,em:new Date()}}
  
const quando=d=>{const t=new Date(d),h=new Date(),hh=t.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}),dia=x=>x.toDateString();
 const ont=new Date(h);ont.setDate(h.getDate()-1);
 return dia(t)===dia(h)?'hoje, '+hh:dia(t)===dia(ont)?'ontem, '+hh:t.toLocaleDateString('pt-BR')+' '+hh};
function calc(){
 const d=D,ok=r=>r&&r.data?r.data:[],f=x=>!OBRA||x.obra_id===OBRA;
 const obras=ok(d.ob),obraNome=id=>{const o=obras.find(x=>x.id===id);return o?o.nome:'—'};
 const sp=ok(d.sp).filter(f),sr=ok(d.sr).filter(f),spM=new Map(sp.map(x=>[x.id,x])),srM=new Map(sr.map(x=>[x.id,x]));
 const aberta=x=>{const r=srM.get(x.id);return x.situacao!=='Cancelada'&&!(r&&r.situacao==='Recebido totalmente')};
 const abertas=sp.filter(aberta),venc=abertas.filter(x=>x.situacao==='Prazo vencido'),aut=abertas.filter(x=>x.situacao==='Aguardando autorização');
 const areceber=sr.filter(x=>x.situacao==='Aguardando recebimento'||x.situacao==='Recebimento parcial'),parc=sr.filter(x=>x.situacao==='Recebimento parcial'),dv=sr.filter(x=>x.situacao==='Com divergência');
 const tf=ok(d.tp).filter(x=>!OBRA||x.obra_origem_id===OBRA||x.obra_destino_id===OBRA);
 const fe=ok(d.fe).filter(f),cnt=s=>fe.filter(x=>x.situacao===s).length;
 const fu=ok(d.fu).filter(f),mats=ok(d.ma),saldo=new Map();
 ok(d.es).filter(f).forEach(x=>saldo.set(x.material_id,(saldo.get(x.material_id)||0)+Number(x.saldo)));
 const comSaldo=mats.filter(m=>saldo.has(m.id)),abaixo=comSaldo.filter(m=>saldo.get(m.id)<Number(m.estoque_minimo));
 const ud=ok(d.pi).filter(x=>{const p=d.ped.find(q=>q.id===x.pedido_id);return p&&(!OBRA||p.obra_id===OBRA)});
 const contar=(L,M,cat)=>cat.map(c=>({n:c[0],c:c[1],q:L.filter(x=>x.situacao===c[0]).length}));
 const obrasEsc=obras.filter(o=>!OBRA||o.id===OBRA).map(o=>({o,ab:abertas.filter(x=>x.obra_id===o.id).length,vc:venc.filter(x=>x.obra_id===o.id).length,
  ar:areceber.filter(x=>x.obra_id===o.id).length,eu:fe.filter(x=>x.obra_id===o.id&&x.situacao==='Em uso').length,fu:fu.filter(x=>x.obra_id===o.id&&x.situacao==='Ativo').length}));
 const mv=[];
 ok(d.rc).filter(f).forEach(r=>{const s=spM.get(r.solicitacao_id);mv.push({t:r.criado_em,ic:'truck',ti:r.estornado_em?'Recebimento registrado (estornado depois)':'Recebimento registrado',
  me:'Solicitação '+(s&&s.numero_sienge?s.numero_sienge:'—')+' · '+obraNome(r.obra_id)+' · '+quando(r.criado_em)+(r.usuario_nome?' · por '+r.usuario_nome:'')})});
 ok(d.tr).filter(x=>!OBRA||x.obra_origem_id===OBRA||x.obra_destino_id===OBRA).forEach(x=>{const rota=x.obra_origem_nome+' → '+x.obra_destino_nome;
  mv.push({t:x.solicitado_em,ic:'swap',ti:'Transferência solicitada',me:rota+' · '+quando(x.solicitado_em)+(x.solicitado_por_nome?' · por '+x.solicitado_por_nome:'')});
  if(x.confirmado_em)mv.push({t:x.confirmado_em,ic:'swap',ti:'Transferência concluída',me:rota+' · '+quando(x.confirmado_em)+(x.confirmado_por_nome?' · por '+x.confirmado_por_nome:'')});
  if(x.cancelado_em)mv.push({t:x.cancelado_em,ic:'swap',ti:x.cancelamento_tipo==='Recusada'?'Transferência recusada':'Transferência cancelada',me:rota+' · '+quando(x.cancelado_em)})});
 const fer=new Map(ok(d.fe).map(x=>[x.id,x]));
 ok(d.fm).filter(f).forEach(x=>{const t=fer.get(x.ferramenta_id);mv.push({t:x.em,ic:'wrench',ti:x.tipo==='Retirada'?'Ferramenta retirada':'Ferramenta devolvida',me:(t?t.nome+' ('+t.codigo_patrimonial+')':'Ferramenta')+' · '+quando(x.em)})});
 mv.sort((a,b)=>new Date(b.t)-new Date(a.t));
 return{obras,obrasEsc,abertas,venc,aut,areceber,parc,dv,tf,fe,cnt,fu,ud,abaixo,comSaldo,
  prazo:contar(sp,0,SP),receb:contar(sr,0,SR),mv:mv.slice(0,8),maxAb:Math.max(1,...obrasEsc.map(x=>x.ab))}}

function desenhar(){
 const v=$q('#view');if(!v||cur!=='painel'||!D)return;const c=calc(),d=D;
 const err=(r,n)=>r&&r.erro?'<div class="pn-err" role="status">'+esc(n)+': não foi possível ler ('+esc(r.erro)+').</div>':'';
 const erros=[[d.sp,'Prazo das solicitações'],[d.sr,'Recebimento das solicitações'],[d.tp,'Transferências'],[d.fe,'Ferramentas'],[d.es,'Estoque'],[d.ob,'Obras']].map(x=>err(x[0],x[1])).join('');
 const kpi=(go,lb,ic,val,meta,red,src,ok)=>{const t=ok&&go&&temNav(go.v)?'button':'div';
  return '<'+t+(t==='button'?' type="button" data-kp="'+go.k+'"':'')+' class="pn-kpi"><span class="pn-kl"><span>'+lb+'</span><span class="pn-ic">'+svg(IC[ic])+'</span></span><span class="pn-v">'+val+'</span><span class="pn-m'+(red?' red':'')+'">'+meta+'</span><span class="pn-src">Fonte: '+src+'</span></'+t+'>'};
 const sOk=d.sp.data&&d.sr.data;
 const ks=[
  kpi({k:'abertas',v:'solicitacoes'},'Solicitações em andamento','clip',sOk?NF(c.abertas.length):'—',sOk?(c.venc.length?NF(c.venc.length)+' com prazo vencido':'Nenhuma com prazo vencido'):'Indisponível',sOk&&c.venc.length>0,'solicitacoes_prazo',sOk),
  kpi({k:'areceber',v:'solicitacoes'},'Aguardando recebimento','truck',d.sr.data?NF(c.areceber.length):'—',d.sr.data?NF(c.parc.length)+' com recebimento parcial':'Indisponível',false,'solicitacoes_recebimento',!!d.sr.data),
  kpi({k:'transf',v:'ferramentas'},'Transferências pendentes','swap',d.tp.data?NF(c.tf.length):'—',d.tp.data?'Aguardando confirmação na obra de destino':'Indisponível',false,'transferencias (ferramentas)',!!d.tp.data),
  kpi({k:'ferr',v:'ferramentas'},'Ferramentas disponíveis','wrench',d.fe.data?NF(c.cnt('Disponível')):'—',d.fe.data?NF(c.cnt('Em uso'))+' em uso · '+NF(c.cnt('Em manutenção'))+' em manutenção':'Indisponível',false,'ferramentas',!!d.fe.data),
  kpi({k:'minimo',v:'materiais'},'Materiais abaixo do mínimo','alert',d.es.data&&d.ma.data?NF(c.abaixo.length):'—',d.es.data&&d.ma.data?'de '+NF(c.comSaldo.length)+' com saldo registrado':'Indisponível',d.es.data&&c.abaixo.length>0,'estoque_material e materiais',!!(d.es.data&&d.ma.data))].join('');
 const bar=(L,tp)=>{const tot=L.reduce((a,x)=>a+x.q,0);
  return '<div class="pn-bar" role="img" aria-label="'+L.map(x=>esc(x.n)+': '+x.q).join(', ')+'">'+L.filter(x=>x.q>0).map(x=>'<button type="button" class="pn-seg '+x.c+'" style="flex-grow:'+x.q+'" data-fl="'+tp+'|'+esc(x.n)+'" title="'+esc(x.n)+': '+x.q+'" aria-label="'+esc(x.n)+': '+x.q+'. Abrir solicitações com este status"></button>').join('')+(tot?'':'<span style="flex:1"></span>')+'</div>'+
  '<div class="pn-leg">'+L.map(x=>'<button type="button" data-fl="'+tp+'|'+esc(x.n)+'"'+(x.q?'':' disabled')+'><span class="pn-sw '+x.c+'"></span>'+esc(x.n)+' <b>'+NF(x.q)+'</b></button>').join('')+'</div>'};
 const al=[];
 if(c.venc.length)al.push({t:'Solicitações com prazo vencido',s:'Mais de 5 dias úteis desde a autorização',n:c.venc.length,ic:'clock',red:1,k:'a_venc'});
 if(c.dv.length)al.push({t:'Recebimentos com divergência',s:'Excedente, avaria ou falta a resolver',n:c.dv.length,ic:'alert',red:1,k:'a_div'});
 if(c.tf.length)al.push({t:'Transferências a confirmar',s:'Aguardando confirmação na obra de destino',n:c.tf.length,ic:'swap',k:'a_tf'});
 if(c.ud.length)al.push({t:'Unidades divergentes',s:'O administrador precisa regularizar antes do recebimento',n:c.ud.length,ic:'layers',k:'a_ud'});
 if(c.abaixo.length)al.push({t:'Materiais abaixo do estoque mínimo',s:'Conforme o mínimo cadastrado em Materiais',n:c.abaixo.length,ic:'pack',red:1,k:'a_min'});
 const alDest={a_venc:'solicitacoes',a_div:'solicitacoes',a_tf:'ferramentas',a_ud:'solicitacoes',a_min:'materiais'};
 const alH=al.length?al.map(a=>{const t=temNav(alDest[a.k])?'button':'div';return '<'+t+(t==='button'?' type="button" data-al="'+a.k+'"':'')+' class="pn-al"><span class="pn-ic'+(a.red?' red':'')+'">'+svg(IC[a.ic])+'</span><span class="pn-at"><b>'+a.t+'</b><small>'+a.s+'</small></span><span class="pn-n'+(a.red?' red':'')+'">'+NF(a.n)+'</span>'+(t==='button'?CHEV:'')+'</'+t+'>'}).join(''):'<p class="pn-ok">Nenhuma pendência no momento.</p>';
 const obH=c.obrasEsc.length?c.obrasEsc.map(x=>'<tr><td>'+esc(x.o.nome)+'<small>'+esc(x.o.status)+'</small></td><td class="r"><span class="pn-ob"><i><u style="width:'+Math.round(x.ab/c.maxAb*100)+'%"></u></i><b>'+NF(x.ab)+'</b></span></td><td class="r">'+(x.vc?'<span class="pn-badge">'+NF(x.vc)+'</span>':'<b style="color:var(--mute)">0</b>')+'</td><td class="r"><b>'+NF(x.ar)+'</b></td><td class="r"><b>'+NF(x.eu)+'</b></td><td class="r"><b>'+NF(x.fu)+'</b></td></tr>').join(''):'<tr><td colspan="6" class="empty">Nenhuma obra cadastrada ou liberada para você.</td></tr>';
 const mvH=c.mv.length?c.mv.map(m=>'<div class="pn-mv"><span class="pn-ic">'+svg(IC[m.ic],16)+'</span><span class="pn-mt"><b>'+esc(m.ti)+'</b><small>'+esc(m.me)+'</small></span></div>').join(''):'<p class="pn-ok">Ainda não há movimentações registradas.</p>';
 const nob=c.obras.length,cad=[['obras','Obras',nob],['funcionarios','Funcionários',d.fu.data?d.fu.data.length:null],['ferramentas','Ferramentas',d.fe.data?d.fe.data.length:null],['materiais','Materiais',d.cm.count==null?null:d.cm.count]].filter(x=>temNav(x[0]));
 const vazio=!nob||!(d.fu.data&&d.fu.data.length);
 const sel=nob>1?'<label>Obra<select id="pn_obra" aria-label="Filtrar o Painel por obra"><option value="">Todas as obras</option>'+c.obras.map(o=>'<option value="'+o.id+'"'+(o.id===OBRA?' selected':'')+'>'+esc(o.nome)+'</option>').join('')+'</select></label>':'';
 v.innerHTML='<div class="pn"><section class="pn-hero"><div class="pn-top"><div><p class="pn-kick">Painel de gestão</p><h1>Painel</h1><p>Bem-vindo(a), '+esc(me.nome||me.login||'')+' · '+esc(me.perfil)+' · '+(OBRA?esc((c.obras.find(o=>o.id===OBRA)||{}).nome||''):(nob===1?esc(c.obras[0].nome):'todas as obras a que você tem acesso'))+'</p></div>'+
  '<div class="pn-tools">'+sel+'<button type="button" id="pn_atu">Atualizar</button></div></div>'+
  '<div class="pn-stat"><span class="pn-live'+(rt==='SUBSCRIBED'?' on':'')+'" id="pn_rt">'+(rt==='SUBSCRIBED'?'Recebimentos em tempo real: ativo':'Recebimentos em tempo real: indisponível')+'</span><span id="pn_hr">Atualizado às '+d.em.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})+'</span></div></section>'+
  (erros?'<div>'+erros+'</div>':'')+
  '<section class="pn-kpis" aria-label="Indicadores">'+ks+'</section>'+
  '<div class="pn-row"><section class="pn-card pn-big" aria-label="Prazo e recebimento"><div class="pn-ch"><h2>Prazo e recebimento das solicitações</h2><span>Dois status independentes</span></div>'+
  '<div class="pn-lb">Status do prazo (5 dias úteis)</div>'+bar(c.prazo,'p')+'<div class="pn-lb" style="margin-top:22px">Status do recebimento</div>'+bar(c.receb,'r')+
  '<div class="pn-fonte">Fonte: solicitacoes_prazo e solicitacoes_recebimento. Não inclui solicitações canceladas. Receber o material não apaga um atraso.</div></section>'+
  '<section class="pn-card pn-side" aria-label="Atenção agora"><div class="pn-ch"><h2>Atenção agora</h2><span>por importância</span></div>'+alH+'</section></div>'+
  '<div class="pn-row"><section class="pn-card pn-big" aria-label="Situação das obras"><div class="pn-ch"><h2>Situação das obras</h2><span>Cada usuário vê só as obras a que tem acesso</span></div><div class="pn-tb wrap"><table><thead><tr><th>Obra</th><th class="r">Solicitações em andamento</th><th class="r">Prazo vencido</th><th class="r">A receber</th><th class="r">Ferramentas em uso</th><th class="r">Funcionários ativos</th></tr></thead><tbody>'+obH+'</tbody></table></div>'+
  '<div class="pn-fonte">Fonte: obras, solicitacoes_prazo, solicitacoes_recebimento, ferramentas, funcionarios.</div></section>'+
  '<section class="pn-card pn-side" aria-label="Últimas movimentações"><div class="pn-ch"><h2>Últimas movimentações</h2><span>recebimentos, transferências e ferramentas</span></div>'+mvH+
  '<div class="pn-fonte">Fonte: recebimentos_pedido, transferencias, ferramenta_movs (o que o seu perfil pode ler).</div></section></div>'+
  (cad.length?'<section class="pn-card" aria-label="Cadastros"><div class="pn-ch"><h2>Cadastros</h2><span>abrir a lista</span></div><div class="pn-cad">'+cad.map(x=>'<button type="button" data-cd="'+x[0]+'">'+x[1]+' <b>'+(x[2]==null?'—':NF(x[2]))+'</b></button>').join('')+'</div></section>':'')+
  '<section class="pn-card pn"><details'+(vazio?' open':'')+'><summary>Por onde começar</summary><ol class="steps"><li>Cadastre as <button class="link" data-g="obras">obras</button> (somente o administrador).</li><li>Cadastre as <button class="link" data-g="disciplinas">disciplinas</button> e as <button class="link" data-g="categorias">categorias</button>.</li><li>Cadastre os <button class="link" data-g="funcionarios">funcionários</button>.</li><li>Cadastre as <button class="link" data-g="ferramentas">ferramentas</button> e os <button class="link" data-g="materiais">materiais</button>.</li></ol></details></section></div>';
 /* ações: tudo o que aparece clicável faz algo */
 const AC={abertas:()=>ir('solicitacoes'),areceber:()=>ir('solicitacoes'),transf:()=>ir('ferramentas',null,'#tf_lista'),ferr:()=>ir('ferramentas'),minimo:()=>ir('materiais'),
  a_venc:()=>ir('solicitacoes',{p:'Prazo vencido'}),a_div:()=>ir('solicitacoes',{r:'Com divergência'}),a_tf:()=>ir('ferramentas',null,'#tf_lista'),a_ud:()=>ir('solicitacoes'),a_min:()=>ir('materiais')};
 v.querySelectorAll('[data-kp]').forEach(b=>b.onclick=()=>AC[b.dataset.kp]());
 v.querySelectorAll('[data-al]').forEach(b=>b.onclick=()=>AC[b.dataset.al]());
 v.querySelectorAll('[data-fl]').forEach(b=>b.onclick=()=>{const p=b.dataset.fl.split('|');if(!temNav('solicitacoes'))return toast('Seu perfil não tem acesso à tela de solicitações.');const f={};f[p[0]]=p[1];ir('solicitacoes',f)});
 v.querySelectorAll('[data-cd]').forEach(b=>b.onclick=()=>ir(b.dataset.cd));
 v.querySelectorAll('[data-g]').forEach(b=>b.onclick=()=>show(b.dataset.g));
 const so2=$q('#pn_obra');if(so2)so2.onchange=()=>{OBRA=so2.value;desenhar()};
 $q('#pn_atu').onclick=()=>recarregar(true)}

async function recarregar(manual){const my=++seq;
 try{const x=await carregar();if(my!==seq||cur!=='painel')return;x.uid=D&&D.uid;D=x;desenhar();if(manual)toast('Painel atualizado.')}
 catch(e){if(my===seq&&cur==='painel'&&!D)$q('#view').innerHTML='<h1>Painel</h1><div class="err">'+esc(msg(e)||String(e))+'</div>'}}
function assinar(){if(canal||!sb||typeof sb.channel!=='function')return;
 try{canal=sb.channel('pn-'+Math.random().toString(36).slice(2,8));
  ['recebimentos_pedido','recebimentos_pedido_itens','recebimento_divergencias'].forEach(t=>canal.on('postgres_changes',{event:'*',schema:'public',table:t},()=>{clearTimeout(tRt);tRt=setTimeout(()=>{if(cur==='painel'&&!document.hidden&&me)recarregar(false)},600)}));
  canal.subscribe(s=>{rt=s;const e=$q('#pn_rt');if(e){e.classList.toggle('on',s==='SUBSCRIBED');e.textContent='Recebimentos em tempo real: '+(s==='SUBSCRIBED'?'ativo':'indisponível')}})}catch(e){canal=null}}
painel=async function(){cur='painel';mark();const v=$q('#view');const novo=!D||D.uid!==(me&&me.id);
 if(novo){D=null;OBRA=''}
 v.innerHTML='<div class="pn"><section class="pn-hero"><p class="pn-kick">Painel de gestão</p><h1>Painel</h1><p>Carregando os indicadores…</p></section></div>';
 const my=++seq;
 try{const x=await carregar();if(my!==seq||cur!=='painel')return;x.uid=me&&me.id;D=x;desenhar();assinar()}
 catch(e){if(my===seq&&cur==='painel')v.innerHTML='<h1>Painel</h1><div class="err">'+esc(msg(e)||String(e))+'</div>'}};
window.__shell={organizar,desenhar,calc:()=>D&&calc(),abertas,aplica};
})()}catch(e){window.__shellErro=e;console.error('Redesenho do menu e do Painel não carregou:',e)}
