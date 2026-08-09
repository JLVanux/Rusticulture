-- =============================================================================
-- RustiCulture — planificateur de wipe
--
-- Clôturer un wipe et en démarrer un autre doivent se faire ensemble. Fait en
-- deux appels depuis le navigateur, un échec au milieu laisserait la ferme sans
-- wipe actif — ou en violation de l'index unique qui en garantit un seul.
--
-- Les deux fonctions sont en SECURITY INVOKER (le défaut) : les politiques de
-- 0001 s'appliquent, donc seul le propriétaire peut les utiliser. Ne pas les
-- passer en SECURITY DEFINER, ce serait ouvrir la gestion des wipes à tous les
-- membres.
--
-- À exécuter après 0001.
-- =============================================================================

alter table wipes
  add column if not exists nb_joueurs int check (nb_joueurs is null or nb_joueurs > 0);

-- Clôture : le wipe garde toutes ses données, il cesse simplement d'être actif.
create or replace function cloturer_wipe(p_wipe uuid)
returns void
language plpgsql
as $$
begin
  update wipes
  set actif = false,
      fin = coalesce(fin, current_date)
  where id = p_wipe and actif;

  if not found then
    raise exception 'wipe introuvable, deja cloture, ou droits insuffisants';
  end if;
end;
$$;

-- Démarrage : clôture l'actif s'il y en a un, puis crée le suivant. Les deux
-- dans la même transaction, donc jamais l'un sans l'autre.
create or replace function demarrer_wipe(
  p_ferme      uuid,
  p_nom        text,
  p_serveur    text default null,
  p_nb_joueurs int default null
)
returns uuid
language plpgsql
as $$
declare
  nouveau uuid;
begin
  update wipes
  set actif = false, fin = coalesce(fin, current_date)
  where ferme_id = p_ferme and actif;

  insert into wipes (ferme_id, nom, serveur, nb_joueurs)
  values (p_ferme, p_nom, nullif(trim(coalesce(p_serveur, '')), ''), p_nb_joueurs)
  returning id into nouveau;

  return nouveau;
end;
$$;

-- Rouvrir un wipe clôturé par erreur. Refuse s'il y en a déjà un actif, plutôt
-- que d'en clôturer un autre dans le dos de l'utilisateur.
create or replace function rouvrir_wipe(p_wipe uuid)
returns void
language plpgsql
as $$
declare
  la_ferme uuid;
begin
  select ferme_id into la_ferme from wipes where id = p_wipe;
  if la_ferme is null then
    raise exception 'wipe introuvable';
  end if;

  if exists (select 1 from wipes where ferme_id = la_ferme and actif) then
    raise exception 'un wipe est deja actif sur cette ferme';
  end if;

  update wipes set actif = true, fin = null where id = p_wipe;

  if not found then
    raise exception 'droits insuffisants';
  end if;
end;
$$;
