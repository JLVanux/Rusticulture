-- =============================================================================
-- RustiCulture — parcours du wipe
--
-- Seules les étapes que le site ne peut pas vérifier tout seul ont besoin
-- d'être stockées : brancher l'eau, préparer un thé, chronométrer un cycle.
-- Tout le reste se déduit des graines, des bacs, des minuteurs et des récoltes,
-- et n'occupe donc aucune ligne.
--
-- Les quatre politiques sont écrites à la main : la boucle de 0001 ne couvre
-- que les tables qui existaient alors.
--
-- À exécuter après 0001.
-- =============================================================================

create table if not exists parcours (
  wipe_id  uuid not null references wipes on delete cascade,
  etape_id text not null,
  fait_le  timestamptz not null default now(),
  par_qui  uuid references profils on delete set null,
  primary key (wipe_id, etape_id)
);

alter table parcours enable row level security;

drop policy if exists "lire parcours" on parcours;
create policy "lire parcours" on parcours for select
  using (est_membre_ferme(ferme_du_wipe(wipe_id)));

drop policy if exists "ecrire parcours" on parcours;
create policy "ecrire parcours" on parcours for insert
  with check (peut_ecrire_ferme(ferme_du_wipe(wipe_id)));

drop policy if exists "modifier parcours" on parcours;
create policy "modifier parcours" on parcours for update
  using (peut_ecrire_ferme(ferme_du_wipe(wipe_id)))
  with check (peut_ecrire_ferme(ferme_du_wipe(wipe_id)));

drop policy if exists "supprimer parcours" on parcours;
create policy "supprimer parcours" on parcours for delete
  using (peut_ecrire_ferme(ferme_du_wipe(wipe_id)));
