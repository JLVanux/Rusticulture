-- =============================================================================
-- RustiCulture — notifications Discord
--
-- L'URL d'un webhook est un VRAI secret, contrairement aux clés publiques du
-- site : qui l'a peut écrire dans le salon en se faisant passer pour le bot.
--
-- Elle vit donc dans une table à part, avec la sécurité activée et
-- AUCUNE POLITIQUE DE LECTURE. Sans politique, personne n'y accède depuis le
-- navigateur — pas même le propriétaire. Seule la clé de service, utilisée
-- exclusivement côté serveur, contourne les politiques et peut la lire.
--
-- Pourquoi une table séparée plutôt qu'une colonne sur `fermes` : masquer une
-- colonne demande de retirer le droit de lecture au niveau de la table puis de
-- le rendre colonne par colonne. Chaque nouvelle colonne ajoutée plus tard
-- serait alors invisible par défaut, et le bug passerait inaperçu. Une table
-- séparée rend la règle évidente et impossible à contourner par distraction.
--
-- À exécuter après 0001.
-- =============================================================================

create table if not exists integrations (
  ferme_id        uuid primary key references fermes on delete cascade,
  webhook_discord text,
  actif           boolean not null default true,
  maj_le          timestamptz not null default now()
);

alter table integrations enable row level security;

-- Volontairement aucune politique : la table est inaccessible depuis le client.
-- Les deux fonctions ci-dessous sont la seule porte d'entrée.

/** Enregistre ou efface le webhook. Réservé au propriétaire. */
create or replace function definir_webhook(f uuid, url text)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not est_proprietaire(f) then
    raise exception 'reserve au proprietaire';
  end if;

  if url is null or trim(url) = '' then
    delete from integrations where ferme_id = f;
    return;
  end if;

  -- Contrôle sommaire : on refuse ce qui n'est manifestement pas un webhook
  -- Discord, plutôt que d'envoyer les notifications d'une équipe vers un
  -- serveur inconnu à cause d'un copier-coller malheureux.
  if url !~ '^https://(canary\.|ptb\.)?discord(app)?\.com/api/webhooks/[0-9]+/[A-Za-z0-9_\-]+$' then
    raise exception 'ceci ne ressemble pas a une URL de webhook Discord';
  end if;

  insert into integrations (ferme_id, webhook_discord, actif, maj_le)
  values (f, trim(url), true, now())
  on conflict (ferme_id)
    do update set webhook_discord = excluded.webhook_discord, actif = true, maj_le = now();
end;
$$;

/** Dit si un webhook est configuré, sans jamais révéler lequel. */
create or replace function webhook_configure(f uuid)
returns boolean
language sql
security definer stable set search_path = public
as $$
  select est_membre_ferme(f)
     and exists (select 1 from integrations where ferme_id = f and webhook_discord is not null and actif);
$$;

-- ---------------------------------------------------------------------------
-- Journal des envois
--
-- Sans lui, chaque passage de la tâche planifiée renverrait les mêmes messages.
-- La clé primaire composite fait le travail : un même seuil d'un même minuteur
-- ne peut être inséré qu'une fois.
-- ---------------------------------------------------------------------------

create table if not exists notifications_envoyees (
  timer_id  uuid not null references timers on delete cascade,
  type      text not null check (type in ('croisement', 'mur')),
  envoye_le timestamptz not null default now(),
  primary key (timer_id, type)
);

alter table notifications_envoyees enable row level security;
-- Aucune politique non plus : seule la tâche serveur y touche.
