-- =============================================================================
-- RustiCulture — réglages des notifications
--
-- La tâche périodique attendait déjà ces colonnes ; elles n'avaient jamais été
-- créées. En l'état, la route échouait sur chaque exécution.
--
-- Le choix appartient à la FERME, pas au joueur : le webhook écrit dans un
-- salon commun, c'est donc le propriétaire qui décide de ce que son serveur
-- reçoit.
--
-- Tout est éteint par défaut sauf les alertes de culture. Un webhook qui
-- commente chaque geste dès son installation se fait retirer dans la semaine, et
-- on perd alors aussi les notifications qui comptent. Mieux vaut en rajouter que
-- d'avoir à en enlever.
--
-- À exécuter après 0009.
-- =============================================================================

alter table integrations
  add column if not exists notif_croisement      boolean not null default true,
  add column if not exists notif_recolte         boolean not null default true,
  add column if not exists notif_deperit         boolean not null default true,
  add column if not exists notif_plantation      boolean not null default false,
  add column if not exists notif_recolte_saisie  boolean not null default false,
  add column if not exists notif_graine_parfaite boolean not null default true,
  add column if not exists notif_objectif        boolean not null default false,
  add column if not exists notif_membre          boolean not null default false,
  add column if not exists notif_wipe_fin        boolean not null default false,
  add column if not exists notif_point_quotidien boolean not null default false,
  add column if not exists heure_point           int not null default 20
    check (heure_point between 0 and 23),
  add column if not exists dernier_point         date;

-- Le dépérissement rejoint les seuils suivis.
alter table notifications_envoyees
  drop constraint if exists notifications_envoyees_type_check;
alter table notifications_envoyees
  add constraint notifications_envoyees_type_check
  check (type in ('croisement', 'mur', 'deperit', 'plantation'));

-- Journal des envois qui ne sont pas liés à un minuteur : plantations,
-- récoltes, points quotidiens. La clé primaire empêche le doublon même si deux
-- exécutions se chevauchent.
create table if not exists notifs_envoyees (
  ferme_id  uuid not null references fermes on delete cascade,
  cle       text not null,
  envoye_le timestamptz not null default now(),
  primary key (ferme_id, cle)
);

alter table notifs_envoyees enable row level security;
-- Aucune politique : seule la tâche serveur y touche.

/** Lit les réglages sans jamais révéler le webhook. */
create or replace function preferences_notifications(f uuid)
returns jsonb
language sql
security definer stable set search_path = public
as $$
  select case when not est_membre_ferme(f) then null else coalesce(
    (select to_jsonb(i) - 'webhook_discord' - 'ferme_id' - 'maj_le' - 'dernier_point'
     from integrations i where i.ferme_id = f),
    '{}'::jsonb) end;
$$;

/**
 * Enregistre un réglage, booléen ou numérique.
 *
 * Le nom de colonne est validé contre une **liste blanche** avant d'être
 * interpolé : un nom venu du navigateur s'exécuterait sinon tel quel dans la
 * requête.
 */
create or replace function regler_notification(
  f uuid,
  champ text,
  valeur_bool boolean default null,
  valeur_int int default null
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not est_proprietaire(f) then
    raise exception 'reserve au proprietaire';
  end if;

  -- La ligne peut ne pas exister si aucun webhook n'a encore été posé : on la
  -- crée pour que les réglages survivent au branchement ultérieur.
  insert into integrations (ferme_id, maj_le) values (f, now())
  on conflict (ferme_id) do update set maj_le = now();

  if champ in (
    'notif_croisement', 'notif_recolte', 'notif_deperit', 'notif_plantation',
    'notif_recolte_saisie', 'notif_graine_parfaite', 'notif_objectif',
    'notif_membre', 'notif_membre_parti', 'notif_wipe_fin', 'notif_point_quotidien'
  ) then
    if valeur_bool is null then
      raise exception 'valeur booleenne attendue';
    end if;
    execute format('update integrations set %I = $1 where ferme_id = $2', champ)
    using valeur_bool, f;

  elsif champ = 'heure_point' then
    if valeur_int is null or valeur_int < 0 or valeur_int > 23 then
      raise exception 'heure invalide';
    end if;
    update integrations set heure_point = valeur_int where ferme_id = f;

  else
    raise exception 'reglage inconnu';
  end if;
end;
$$;
