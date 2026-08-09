-- =============================================================================
-- RustiCulture — arrivées et départs
--
-- Ces événements se produisent dans le site : on les enregistre dans le journal
-- d'activité, et la tâche périodique les relaie. Le webhook est un secret, il ne
-- descend jamais dans le navigateur — c'est pourquoi rien n'est envoyé depuis le
-- client.
--
-- L'activité est attachée au wipe actif : sans wipe, pas de journal, donc pas de
-- notification. C'est cohérent avec le reste, où le wipe est le conteneur de
-- tout ce qui est temporel.
--
-- À exécuter après 0011.
-- =============================================================================

alter table integrations
  add column if not exists notif_membre_parti boolean not null default false;

/**
 * Trace une arrivée ou un départ.
 *
 * En SECURITY DEFINER parce qu'un membre qui part n'a plus le droit d'écrire
 * dans la ferme au moment où l'on veut noter son départ — c'est précisément
 * l'ordre inverse qui serait nécessaire.
 */
create or replace function journaliser_mouvement(
  f uuid,
  p_profil uuid,
  p_type text
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  le_wipe uuid;
  le_nom  text;
begin
  if p_type not in ('membre_rejoint', 'membre_parti', 'membre_retire') then
    raise exception 'type inconnu';
  end if;

  select id into le_wipe from wipes where ferme_id = f and actif limit 1;
  if le_wipe is null then
    return; -- pas de wipe actif : rien à journaliser
  end if;

  select pseudo into le_nom from profils where id = p_profil;

  insert into activites (wipe_id, acteur, type, donnees)
  values (le_wipe, p_profil, p_type, jsonb_build_object('pseudo', coalesce(le_nom, 'quelqu''un')));
end;
$$;
