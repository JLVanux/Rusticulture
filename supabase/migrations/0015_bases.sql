-- =============================================================================
-- RustiCulture — répertoire de bases de farm
--
-- Un lien YouTube, une miniature, et ce que la base contient. Rien de plus.
--
-- **Seul YouTube est accepté**, vérifié par une contrainte : on ne stocke pas
-- une URL libre mais l'IDENTIFIANT de la vidéo. Un identifiant ne peut pointer
-- que vers YouTube — une URL arbitraire, elle, pourrait mener n'importe où, et
-- il suffirait d'un lien piégé validé par inadvertance.
--
-- La miniature s'obtient sans clé d'API ni quota : `img.youtube.com/vi/<id>`.
--
-- Deux régimes de dépôt : un administrateur publie directement, tout le monde
-- soumet et attend validation. C'est la contrainte de modération qui décide,
-- pas une préférence — un répertoire ouvert sans relecture devient une décharge
-- en quelques jours.
--
-- À exécuter après 0014.
-- =============================================================================

create table if not exists bases (
  id            uuid primary key default gen_random_uuid(),
  video_id      text not null unique
                check (video_id ~ '^[A-Za-z0-9_-]{11}$'),
  titre         text not null check (char_length(trim(titre)) between 3 and 120),
  auteur_video  text,
  description   text check (description is null or char_length(description) <= 500),

  -- Ce que la base contient. Renseigné à la main, ou lu dans la description de
  -- la vidéo quand elle l'indique — jamais deviné.
  grands_bacs   int not null default 0 check (grands_bacs >= 0),
  petits_bacs   int not null default 0 check (petits_bacs >= 0),
  pots          int not null default 0 check (pots >= 0),
  poulaillers   int not null default 0 check (poulaillers >= 0),
  difficulte    int not null default 3 check (difficulte between 1 and 5),

  publiee       boolean not null default false,
  propose_par   uuid references profils on delete set null,
  cree_le       timestamptz not null default now()
);

create index if not exists bases_publiees on bases (publiee, cree_le desc);

alter table bases enable row level security;

/** Est-on administrateur ? */
create or replace function est_admin()
returns boolean
language sql
security definer stable set search_path = public
as $$
  select coalesce((select administrateur from profils where id = auth.uid()), false);
$$;

-- Tout le monde voit les bases publiées. On voit en plus ses propres
-- propositions, pour savoir où elles en sont.
drop policy if exists "lire bases" on bases;
create policy "lire bases" on bases for select
  using (publiee or propose_par = auth.uid() or est_admin());

-- Proposer est ouvert à tout compte, mais `publiee` ne peut pas être vrai à
-- l'insertion : sans ce contrôle, n'importe qui publierait directement.
drop policy if exists "proposer une base" on bases;
create policy "proposer une base" on bases for insert
  with check (
    auth.uid() is not null
    and propose_par = auth.uid()
    and (publiee = false or est_admin())
  );

drop policy if exists "administrer les bases" on bases;
create policy "administrer les bases" on bases for update
  using (est_admin()) with check (est_admin());

drop policy if exists "supprimer une base" on bases;
create policy "supprimer une base" on bases for delete
  using (est_admin() or (propose_par = auth.uid() and publiee = false));

/** Les comptes, pour la page d'administration. Réservé aux administrateurs. */
create or replace function liste_comptes()
returns jsonb
language sql
security definer stable set search_path = public
as $$
  select case when not est_admin() then null else coalesce(
    (select jsonb_agg(jsonb_build_object(
       'id', p.id,
       'pseudo', p.pseudo,
       'nom', nom_visible(p),
       'inscrit_le', p.cree_le,
       'administrateur', p.administrateur,
       'fermes', (select count(*) from membres m where m.profil_id = p.id)
     ) order by p.cree_le desc)
     from profils p),
    '[]'::jsonb) end;
$$;
