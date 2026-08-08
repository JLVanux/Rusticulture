-- =============================================================================
-- RustiCulture — code d'invitation
--
-- 0001 générait le code avec `gen_random_bytes`, qui appartient à l'extension
-- pgcrypto. Sur Supabase, pgcrypto vit dans le schéma `extensions`, absent du
-- `search_path = public` imposé aux fonctions SECURITY DEFINER.
--
-- Conséquence : la valeur par défaut de la colonne fonctionnait (une valeur par
-- défaut n'a pas ce search_path restreint), mais `regenerer_code_invitation`
-- échouait avec « function gen_random_bytes(integer) does not exist ».
--
-- On passe donc à `gen_random_uuid`, intégré au cœur de Postgres depuis la
-- version 13, disponible quel que soit le search_path.
--
-- À exécuter après 0001.
-- =============================================================================

create or replace function nouveau_code_invitation()
returns text
language sql volatile
as $$
  select substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
$$;

alter table fermes
  alter column code_invitation set default nouveau_code_invitation();

create or replace function regenerer_code_invitation(f uuid)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  nouveau text;
  essais  int := 0;
begin
  if not est_proprietaire(f) then
    raise exception 'reserve au proprietaire';
  end if;

  -- Le code est unique : une collision est très improbable mais pas
  -- impossible, et elle ferait échouer la régénération sans explication.
  loop
    nouveau := nouveau_code_invitation();
    exit when not exists (select 1 from fermes where code_invitation = nouveau);
    essais := essais + 1;
    if essais > 10 then
      raise exception 'impossible de generer un code unique';
    end if;
  end loop;

  update fermes set code_invitation = nouveau where id = f;
  return nouveau;
end;
$$;
