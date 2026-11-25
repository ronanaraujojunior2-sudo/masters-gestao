-- MASTERS GESTÃO - SQL 24: recebimento de materiais DESATIVADO em Solicitações e Pedidos (orientação da gestão)
-- O controle de recebimento e de entrada de materiais é feito no Sienge.
-- Esta chave só DESLIGA o uso: nenhuma tabela, função, registro ou histórico é apagado ou alterado.
--   * recebimentos_pedido, recebimentos_pedido_itens, recebimento_divergencias (e as tabelas antigas, se existirem) continuam guardadas e legíveis.
--   * Com a chave INATIVA, o banco recusa novos registros, estornos e resoluções de recebimento (vale para tela, API e funções).
--   * Para voltar: tela Administração > Módulos e escopo (administrador MASTERS), ou no SQL Editor:
--       update config_sistema set valor = 'ativo' where chave = 'recebimento_compras';
-- Não toca em ferramentas, transferências de ferramentas, malas e malões, nem no estoque de ferramentas.
-- Precisa do SQL 23 (tabela config_sistema). Pode rodar de novo sem problema (idempotente). Rode inteiro, uma vez, no SQL Editor.

do $$
begin
  if to_regclass('public.config_sistema') is null then
    raise exception 'Rode antes o SQL 23 (banco/23_modo_simplificado.sql).';
  end if;
end $$;

-- ========== 1) a terceira chave ==========
alter table config_sistema drop constraint if exists config_sistema_valor_check;
alter table config_sistema add constraint config_sistema_valor_check check (
  (chave = 'modulo_materiais'    and valor in ('ativo', 'inativo')) or
  (chave = 'solicitacoes_modo'   and valor in ('simples', 'completo')) or
  (chave = 'recebimento_compras' and valor in ('ativo', 'inativo')));

-- valor pedido pela gestão (só entra se ainda não existir; rodar de novo não desfaz uma reativação)
insert into config_sistema(chave, valor, motivo) values
  ('recebimento_compras', 'inativo', 'Orientação da gestão: o recebimento de materiais é controlado no Sienge.')
on conflict (chave) do nothing;

create or replace function recebimento_ativo() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select valor from config_sistema where chave = 'recebimento_compras'), 'ativo') <> 'inativo' $$;

-- a função que o administrador usa passa a aceitar as três chaves (mesmas regras de antes: só MASTERS, motivo obrigatório, auditoria)
create or replace function config_definir(p_chave text, p_valor text, p_motivo text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not eh_admin() then raise exception 'Somente o administrador MASTERS altera esta configuração.'; end if;
  if length(btrim(coalesce(p_motivo, ''))) < 5 then raise exception 'Informe o motivo (mínimo 5 letras).'; end if;
  if p_chave not in ('modulo_materiais', 'solicitacoes_modo', 'recebimento_compras') then raise exception 'Configuração desconhecida.'; end if;
  insert into config_sistema(chave, valor, motivo, atualizado_em, atualizado_por)
  values (p_chave, p_valor, btrim(p_motivo), now(), auth.uid())
  on conflict (chave) do update
    set valor = excluded.valor, motivo = excluded.motivo, atualizado_em = now(), atualizado_por = auth.uid();
end $$;

-- ========== 2) bloqueio no banco: com o recebimento desativado, nada novo de recebimento entra ==========
-- Leitura e histórico continuam funcionando. Só as tabelas EXCLUSIVAS do recebimento de materiais das compras são bloqueadas.
create or replace function bloqueia_recebimento() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if recebimento_ativo() then return coalesce(new, old); end if;
  raise exception 'O registro de recebimento de materiais está desativado por orientação da gestão: o recebimento é controlado no Sienge. Para reativar, fale com o administrador MASTERS.';
end $$;

do $$
declare t text;
begin
  foreach t in array array['recebimentos_pedido', 'recebimentos_pedido_itens', 'recebimento_divergencias', 'recebimentos', 'recebimento_itens'] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop trigger if exists a_recebimento_inativo on %I', t);
      execute format('create trigger a_recebimento_inativo before insert or update or delete on %I for each row execute function bloqueia_recebimento()', t);
    end if;
  end loop;
end $$;

-- ========== 3) permissões das funções novas ==========
revoke all on function recebimento_ativo() from public, anon;
revoke all on function bloqueia_recebimento() from public, anon;
revoke all on function config_definir(text, text, text) from public, anon;
grant execute on function recebimento_ativo() to authenticated;
grant execute on function config_definir(text, text, text) to authenticated;
