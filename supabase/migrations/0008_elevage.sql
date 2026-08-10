-- =============================================================================
-- RustiCulture — élevage
--
-- Le poulailler était un calculateur isolé. Il rejoint la configuration de la
-- ferme pour alimenter la production estimée en œufs, ressource déjà déclarable
-- dans les récoltes.
--
-- Une seule ligne par wipe : c'est une configuration, pas une collection. D'où
-- l'index unique plutôt qu'une table de lignes multiples.
--
-- Les politiques sont écrites explicitement : la boucle de 0001 ne couvrait que
-- les tables existantes à l'époque. Toute nouvelle table du wipe doit refaire
-- ces quatre politiques, sinon elle reste inaccessible — ou pire, accessible à
-- tous si la sécurité au niveau des lignes est oubliée.
--
-- À exécuter après 0001.
-- =============================================================================

create table if not exists elevages (
  id                      uuid primary key default gen_random_uuid(),
  wipe_id                 uuid not null references wipes on delete cascade,
  poulaillers             int not null default 0 check (poulaillers >= 0),
  poules_par_poulailler   int not null default 4 check (poules_par_poulailler between 1 and 4),
  -- Part des jauges au vert : faim, soif, soleil, amour. En dessous de tout,
  -- la ponte s'arrête.
  bonheur                 numeric not null default 1 check (bonheur > 0 and bonheur <= 1),
  maj_le                  timestamptz not null default now()
);

create unique index if not exists elevages_un_par_wipe on elevages (wipe_id);

alter table elevages enable row level security;

drop policy if exists "lire elevages" on elevages;
create policy "lire elevages" on elevages for select
  using (est_membre_ferme(ferme_du_wipe(wipe_id)));

drop policy if exists "ecrire elevages" on elevages;
create policy "ecrire elevages" on elevages for insert
  with check (peut_ecrire_ferme(ferme_du_wipe(wipe_id)));

drop policy if exists "modifier elevages" on elevages;
create policy "modifier elevages" on elevages for update
  using (peut_ecrire_ferme(ferme_du_wipe(wipe_id)))
  with check (peut_ecrire_ferme(ferme_du_wipe(wipe_id)));

drop policy if exists "supprimer elevages" on elevages;
create policy "supprimer elevages" on elevages for delete
  using (peut_ecrire_ferme(ferme_du_wipe(wipe_id)));
