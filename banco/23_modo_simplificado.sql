-- MASTERS GESTÃO - SQL 23: escopo simplificado (orientação da gestão)
--   1) Solicitações e Pedidos em modo SIMPLES: número, data da solicitação, data da aprovação, data do pedido de compra
--      (os insumos ficam como observação de consulta). O detalhamento fica no Sienge.
--   2) Módulo Materiais INATIVO de forma controlada e reversível.
-- Nada é apagado: tabelas, registros, histórico e estruturas continuam como estão.
-- Pode rodar de novo sem problema (idempotente). Rode no SQL Editor do Supabase, inteiro, uma vez.

-- ========== 1) chaves de configuração (somente o administrador MASTERS altera, e tudo fica na auditoria) ==========
create table if not exists config_sistema(
  chave text primary key,
  id text generated always as (chave) stored,
  valor text not null,
  motivo text,
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid default auth.uid());
alter table config_sistema drop constraint if exists config_sistema_valor_check;
alter table config_sistema add constraint config_sistema_valor_check check (
  (chave = 'modulo_materiais'  and valor in ('ativo', 'inativo')) or
  (chave = 'solicitacoes_modo' and valor in ('simples', 'completo')));
alter table config_sistema enable row level security;
drop policy if exists ler on config_sistema;
create policy ler on config_sistema for select using (usuario_ativo());     -- sem política de escrita: só a função abaixo grava
drop trigger if exists t_aud on config_sistema;
create trigger t_aud after insert or update or delete on config_sistema for each row execute function auditar();

-- valores pedidos pela gestão (só entram se ainda não existirem; rodar de novo não desfaz uma reativação)
insert into config_sistema(chave, valor, motivo) values
  ('modulo_materiais',  'inativo', 'Orientação da gestão: o controle de materiais é feito no Sienge.'),
  ('solicitacoes_modo', 'simples', 'Orientação da gestão: o detalhamento das compras é feito no Sienge.')
on conflict (chave) do nothing;

create or replace function config_valor(p_chave text) returns text
language sql stable security definer set search_path = public as $$
  select valor from config_sistema where chave = p_chave $$;

create or replace function materiais_ativo() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select valor from config_sistema where chave = 'modulo_materiais'), 'ativo') <> 'inativo' $$;

create or replace function config_definir(p_chave text, p_valor text, p_motivo text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not eh_admin() then raise exception 'Somente o administrador MASTERS altera esta configuração.'; end if;
  if length(btrim(coalesce(p_motivo, ''))) < 5 then raise exception 'Informe o motivo (mínimo 5 letras).'; end if;
  if p_chave not in ('modulo_materiais', 'solicitacoes_modo') then raise exception 'Configuração desconhecida.'; end if;
  insert into config_sistema(chave, valor, motivo, atualizado_em, atualizado_por)
  values (p_chave, p_valor, btrim(p_motivo), now(), auth.uid())
  on conflict (chave) do update
    set valor = excluded.valor, motivo = excluded.motivo, atualizado_em = now(), atualizado_por = auth.uid();
end $$;

-- ========== 2) bloqueio no banco: com Materiais inativo, nada novo de material entra ==========
-- Vale para quem chamar (tela, API ou função). Leitura e histórico continuam funcionando.
-- Única exceção: o insumo que chega por uma solicitação ou importação do Sienge (ele só vira observação de consulta).
create or replace function bloqueia_materiais() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if materiais_ativo() then return coalesce(new, old); end if;
  if tg_table_name = 'materiais' and tg_op = 'INSERT'
     and coalesce(current_setting('masters.sol', true), '') = '1' then
    return new;                                    -- insumo vindo de solicitação/importação
  end if;
  raise exception 'O módulo Materiais está inativado temporariamente por orientação da gestão. Cadastros e movimentações de materiais não são permitidos. Para reativar, fale com o administrador MASTERS.';
end $$;

do $$
declare t text;
begin
  foreach t in array array['materiais', 'estoque', 'estoque_movs', 'estoque_material', 'estoque_material_movs',
                           'recebimentos', 'recebimento_itens', 'recebimentos_pedido', 'recebimentos_pedido_itens',
                           'recebimento_divergencias'] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop trigger if exists a_materiais_inativo on %I', t);
      execute format('create trigger a_materiais_inativo before insert or update or delete on %I for each row execute function bloqueia_materiais()', t);
    end if;
  end loop;
end $$;

-- ========== 3) Solicitações e Pedidos em modo simples (funções próprias; as antigas continuam existindo) ==========
create or replace function sol_simples_criar(p_obra uuid, p_numero text, p_data date, p_obs text)
returns uuid language plpgsql security definer set search_path = public as $$
declare sid uuid;
begin
  if not pode_solicitar(p_obra) then raise exception 'Você não tem permissão nesta obra.'; end if;
  if length(btrim(coalesce(p_numero, ''))) = 0 then raise exception 'Informe o número da solicitação.'; end if;
  insert into solicitacoes(obra_id, data_solicitacao, numero_sienge, observacao)
  values (p_obra, coalesce(p_data, current_date), btrim(p_numero), nullif(btrim(coalesce(p_obs, '')), ''))
  returning id into sid;
  return sid;
end $$;

create or replace function sol_simples_aprovar(p_solic uuid, p_data date)
returns void language plpgsql security definer set search_path = public as $$
declare s solicitacoes%rowtype;
begin
  select * into s from solicitacoes where id = p_solic for update;
  if not found or not pode_gravar(s.obra_id) then raise exception 'Solicitação não encontrada ou sem permissão.'; end if;
  if s.status = 'Cancelada' then raise exception 'Esta solicitação está cancelada.'; end if;
  if s.data_aprovacao is not null then raise exception 'A aprovação desta solicitação já foi registrada.'; end if;
  if p_data is null then raise exception 'Informe a data da aprovação.'; end if;
  if p_data < s.data_solicitacao then raise exception 'A aprovação não pode ser anterior à data da solicitação.'; end if;
  update solicitacoes set data_aprovacao = p_data,
         status = case when status = 'Aguardando aprovação' then 'Aprovada' else status end
   where id = p_solic;
end $$;

create or replace function sol_simples_pedido(p_solic uuid, p_numero text, p_data date)
returns uuid language plpgsql security definer set search_path = public as $$
declare s solicitacoes%rowtype; pid uuid;
begin
  select * into s from solicitacoes where id = p_solic for update;
  if not found or not pode_gravar(s.obra_id) then raise exception 'Solicitação não encontrada ou sem permissão.'; end if;
  if s.data_aprovacao is null or s.status in ('Aguardando aprovação', 'Cancelada') then
    raise exception 'Registre antes a aprovação da solicitação.'; end if;
  if length(btrim(coalesce(p_numero, ''))) = 0 then raise exception 'Informe o número do pedido de compra.'; end if;
  if p_data is null then raise exception 'Informe a data do pedido de compra.'; end if;
  insert into pedidos_compra(solicitacao_id, numero_pedido, data_pedido)      -- previsão e obra são calculadas pelo gatilho do pedido
  values (p_solic, btrim(p_numero), p_data) returning id into pid;
  perform set_config('masters.sol', '1', true);
  update solicitacoes set status = 'Pedido emitido' where id = p_solic and status = 'Aprovada';
  if p_data < s.data_aprovacao and coalesce(current_setting('masters.emerg_skip', true), '') <> '1'
     and to_regproc('emerg_gravar(uuid,jsonb,text)') is not null then
    perform emerg_gravar(pid, jsonb_build_object('autorizada', false), 'Registro');     -- pedido antes da aprovação continua sinalizado, como antes
  end if;
  return pid;
end $$;

-- ========== 4) permissões das funções novas ==========
do $$
declare f text;
begin
  foreach f in array array[
    'config_valor(text)', 'materiais_ativo()', 'config_definir(text,text,text)', 'bloqueia_materiais()',
    'sol_simples_criar(uuid,text,date,text)', 'sol_simples_aprovar(uuid,date)', 'sol_simples_pedido(uuid,text,date)'] loop
    execute format('revoke all on function %s from public, anon', f);
  end loop;
  foreach f in array array[
    'config_valor(text)', 'materiais_ativo()', 'config_definir(text,text,text)',
    'sol_simples_criar(uuid,text,date,text)', 'sol_simples_aprovar(uuid,date)', 'sol_simples_pedido(uuid,text,date)'] loop
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;
grant select on config_sistema to authenticated;

-- Para REATIVAR Materiais ou voltar ao modo completo: tela Administração > Módulos e escopo (administrador MASTERS),
-- ou, no SQL Editor:  update config_sistema set valor = 'ativo' where chave = 'modulo_materiais';
--                     update config_sistema set valor = 'completo' where chave = 'solicitacoes_modo';
