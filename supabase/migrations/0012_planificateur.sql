-- =============================================================================
-- RustiCulture — planificateur des notifications
--
-- Remplace GitHub Actions, dont les tâches planifiées accusent couramment dix à
-- trente minutes de retard sur les runners gratuits : c'est la nature du
-- service, pas un réglage. Sur des alertes de récolte, ce décalage vide la
-- fonctionnalité de son intérêt.
--
-- `pg_cron` s'exécute dans la base elle-même, à la minute près, sur le plan
-- gratuit de Supabase. Une pièce mobile en moins, et un effet de bord utile :
-- le projet est interrogé chaque minute, donc il ne se met plus en pause après
-- sept jours d'inactivité.
--
-- PRÉALABLE — activer les deux extensions dans le tableau de bord Supabase,
-- Database → Extensions : `pg_cron` et `pg_net`. Ce script échoue sinon.
-- =============================================================================

-- Le secret n'a pas sa place dans un fichier versionné : on le range dans la
-- base, hors d'atteinte du client, et la tâche va l'y chercher.
create table if not exists reglages_serveur (
  cle    text primary key,
  valeur text not null
);

alter table reglages_serveur enable row level security;
-- Aucune politique : inaccessible depuis le navigateur, quel que soit le rôle.

/**
 * Déclenche l'envoi des notifications.
 *
 * Isolée dans une fonction plutôt qu'écrite dans la planification : la modifier
 * ne demande pas de reprogrammer la tâche, et on peut l'appeler à la main pour
 * tester.
 */
create or replace function declencher_notifications()
returns void
language plpgsql
security definer set search_path = public, extensions
as $$
declare
  adresse text;
  secret  text;
begin
  select valeur into adresse from reglages_serveur where cle = 'url_notifications';
  select valeur into secret  from reglages_serveur where cle = 'cron_secret';

  if adresse is null or secret is null then
    raise notice 'planificateur non configuré : renseigner url_notifications et cron_secret';
    return;
  end if;

  perform net.http_get(
    url := adresse,
    headers := jsonb_build_object('Authorization', 'Bearer ' || secret),
    timeout_milliseconds := 20000
  );
end;
$$;

-- Toutes les minutes. La route est protégée par son secret et ne fait rien
-- quand aucun seuil n'est franchi : un passage à vide coûte une requête.
select cron.unschedule('notifications-rusticulture')
where exists (select 1 from cron.job where jobname = 'notifications-rusticulture');

select cron.schedule(
  'notifications-rusticulture',
  '* * * * *',
  $$ select declencher_notifications(); $$
);
