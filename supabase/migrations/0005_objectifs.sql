-- =============================================================================
-- RustiCulture — objectifs génétiques
--
-- 0001 prévoyait `ressource` et `cible` : suffisant pour « produire 10 000
-- tissus » ou « monter 8 grands bacs », pas pour « obtenir GGGYYY ». On ajoute
-- une colonne dédiée plutôt que de détourner `ressource`, qui deviendrait
-- illisible et impossible à contraindre.
--
-- Le domaine `genes` impose les six lettres : un objectif génétique invalide est
-- refusé par la base.
--
-- À exécuter après 0001.
-- =============================================================================

alter table objectifs
  add column if not exists genes genes;

-- Un objectif de production a besoin d'une cible chiffrée, un objectif
-- génétique a besoin de gènes. Le type « libre » n'a besoin ni de l'un ni de
-- l'autre : il se coche à la main.
alter table objectifs
  drop constraint if exists objectifs_coherents;

alter table objectifs
  add constraint objectifs_coherents check (
    (type = 'genetique' and genes is not null)
    or (type in ('production', 'construction') and cible is not null)
    or (type = 'libre')
  );
