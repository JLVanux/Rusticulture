-- =============================================================================
-- RustiCulture — suppression de compte
--
-- Dès qu'il y a des comptes, il y a des données personnelles, et donc une
-- obligation de suppression réelle. Les cascades posées en 0001 font le gros du
-- travail ; restent deux cas que la base ne peut pas trancher seule.
--
-- 1. Le client ne peut pas supprimer sa propre ligne dans `auth.users` : cela
--    demande des droits d'administration. D'où cette fonction SECURITY DEFINER,
--    qui ne supprime QUE l'appelant — `auth.uid()` n'est pas un paramètre, il
--    ne peut donc pas être falsifié.
--
-- 2. Une ferme dont le propriétaire s'en va ne doit pas disparaître avec lui.
--    Elle est transmise au plus ancien membre restant. Elle n'est supprimée que
--    si personne d'autre n'y est. Sans ça, un propriétaire qui ferme son compte
--    effacerait le wipe entier de son équipe.
--
-- À exécuter après 0001.
-- =============================================================================

-- `cree_par` était en `on delete restrict`, ce qui bloquerait la suppression du
-- profil. La colonne est réaffectée au nouveau propriétaire avant suppression,
-- mais on la rend tolérante par sécurité.
alter table fermes
  drop constraint if exists fermes_cree_par_fkey;

alter table fermes
  alter column cree_par drop not null;

alter table fermes
  add constraint fermes_cree_par_fkey
  foreign key (cree_par) references profils(id) on delete set null;

create or replace function supprimer_mon_compte()
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  moi        uuid := auth.uid();
  la_ferme   uuid;
  successeur uuid;
begin
  if moi is null then
    raise exception 'connexion requise';
  end if;

  for la_ferme in
    select ferme_id from membres where profil_id = moi and role = 'proprietaire'
  loop
    -- Le plus ancien membre restant reprend la ferme.
    select profil_id into successeur
    from membres
    where ferme_id = la_ferme and profil_id <> moi
    order by rejoint_le asc
    limit 1;

    if successeur is null then
      delete from fermes where id = la_ferme;
    else
      update membres set role = 'proprietaire'
      where ferme_id = la_ferme and profil_id = successeur;

      update fermes set cree_par = successeur where id = la_ferme;
    end if;
  end loop;

  -- Le reste part en cascade : profil, appartenances, et mise à nul des
  -- signatures sur les graines, timers, récoltes et activités.
  delete from auth.users where id = moi;
end;
$$;
