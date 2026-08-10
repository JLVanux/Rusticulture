-- =============================================================================
-- RustiCulture — profils
--
-- Le compte ne permettait rien : ni changer son mot de passe, ni se présenter
-- autrement que par son identifiant de connexion.
--
-- Trois principes tenus ici :
--
-- 1. **Le pseudo reste l'identifiant** et ne change pas : c'est ce qui permet de
--    se passer d'adresse e-mail. Le nom affiché est une couche par-dessus.
-- 2. **Un profil est privé par défaut.** Le site promet dans sa page
--    Confidentialité que rien n'est visible de l'extérieur ; rendre cela public
--    sans demander serait un manquement, pas une amélioration.
-- 3. **Pas de téléversement d'images.** Dès qu'on accepte un fichier, on hérite
--    d'un devoir de modération et du risque qu'on y mette n'importe quoi. Les
--    avatars sont choisis dans une liste fermée.
--
-- À exécuter après 0002.
-- =============================================================================

alter table profils
  add column if not exists nom_affiche text
    check (nom_affiche is null or char_length(trim(nom_affiche)) between 2 and 24),
  add column if not exists bio text
    check (bio is null or char_length(bio) <= 280),
  add column if not exists avatar text,
  add column if not exists profil_public boolean not null default false,
  add column if not exists administrateur boolean not null default false;

/**
 * Le nom sous lequel se présenter : le nom affiché s'il existe, le pseudo
 * sinon. Une seule définition, pour que l'affichage soit cohérent partout.
 */
create or replace function nom_visible(p profils)
returns text
language sql
immutable
as $$
  select coalesce(nullif(trim(p.nom_affiche), ''), p.pseudo);
$$;

-- ---------------------------------------------------------------------------
-- Lecture publique, sur consentement
-- ---------------------------------------------------------------------------

/** Deux personnes partagent-elles une ferme ? Sert à ce qu'une équipe se voie
 *  sans que chacun ait à rendre son profil public. */
create or replace function est_membre_commun(autre uuid)
returns boolean
language sql
security definer stable set search_path = public
as $$
  select exists (
    select 1 from membres a
    join membres b on a.ferme_id = b.ferme_id
    where a.profil_id = auth.uid() and b.profil_id = autre
  );
$$;

drop policy if exists "lire profils publics" on profils;
create policy "lire profils publics" on profils for select
  using (profil_public or id = auth.uid() or est_membre_commun(id));

/**
 * Modifie son propre profil.
 *
 * `administrateur` n'est volontairement PAS modifiable ici : personne ne se
 * nomme administrateur soi-même. Ce drapeau se pose à la main dans la base.
 */
create or replace function modifier_profil(
  p_nom_affiche text default null,
  p_bio text default null,
  p_avatar text default null,
  p_public boolean default null
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  moi uuid := auth.uid();
begin
  if moi is null then
    raise exception 'connexion requise';
  end if;

  update profils set
    nom_affiche   = coalesce(nullif(trim(coalesce(p_nom_affiche, '')), ''), nom_affiche),
    bio           = coalesce(p_bio, bio),
    avatar        = coalesce(p_avatar, avatar),
    profil_public = coalesce(p_public, profil_public)
  where id = moi;
end;
$$;

/** Le profil public d'un pseudo, avec ce qu'il a le droit de montrer. */
create or replace function profil_public_de(p_pseudo text)
returns jsonb
language sql
security definer stable set search_path = public
as $$
  select case when p.profil_public is not true and p.id <> auth.uid() then null
  else jsonb_build_object(
    'pseudo', p.pseudo,
    'nom', nom_visible(p),
    'bio', p.bio,
    'avatar', p.avatar,
    'inscrit_le', p.cree_le,
    'wipes', (
      select count(distinct w.id) from membres m
      join wipes w on w.ferme_id = m.ferme_id
      where m.profil_id = p.id
    ),
    'fermes', (select count(*) from membres m where m.profil_id = p.id)
  ) end
  from profils p where lower(p.pseudo) = lower(trim(p_pseudo));
$$;
