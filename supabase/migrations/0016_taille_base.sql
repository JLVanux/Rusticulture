-- =============================================================================
-- RustiCulture — taille d'équipe d'une base
--
-- Une base ne se juge pas seulement à sa difficulté : une base solo et une base
-- de groupe n'ont ni la même surface, ni le même coût d'entretien, ni le même
-- nombre de bacs. C'est le premier filtre qu'un joueur applique.
--
-- Rappel : `create policy` n'a pas de variante « si absent ». Cette migration
-- n'en crée aucune, mais toute nouvelle doit faire précéder ses politiques d'un
-- `drop policy if exists`.
--
-- À exécuter après 0015.
-- =============================================================================

alter table bases
  add column if not exists taille text not null default 'duo_trio'
    check (taille in ('solo', 'solo_duo', 'duo_trio', 'groupe'));

create index if not exists bases_par_taille on bases (taille) where publiee;
