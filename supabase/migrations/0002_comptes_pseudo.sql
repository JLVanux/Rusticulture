-- =============================================================================
-- RustiCulture — comptes par pseudo
--
-- Aucun e-mail n'est demandé ni envoyé. Supabase exige techniquement une
-- adresse pour un compte à mot de passe : l'application en dérive une du pseudo
-- (`thomas@comptes.rusticulture.app`), jamais affichée.
--
-- Deux garde-fous d'unicité, volontairement redondants :
--   - l'adresse dérivée, unique côté authentification ;
--   - un index unique insensible à la casse sur le pseudo, ici.
-- Sans le second, « Thomas » et « THOMAS » cohabiteraient dans la liste des
-- membres et deviendraient indiscernables.
--
-- À exécuter après 0001.
-- =============================================================================

-- Le pseudo sert d'identifiant de connexion : le renommer casserait l'adresse
-- dérivée. On retire donc la politique de modification posée en 0001.
drop policy if exists "modifier mon profil" on profils;

create unique index if not exists profils_pseudo_unique on profils (lower(pseudo));

create or replace function creer_profil()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  pseudo_choisi text;
begin
  pseudo_choisi := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'pseudo'), ''),
    -- Replis pour un fournisseur externe, si Discord est ajouté plus tard.
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'Fermier'
  );

  -- On tronque plutôt que d'échouer : une inscription refusée ici laisserait un
  -- compte sans profil, donc un utilisateur connecté mais invisible.
  pseudo_choisi := left(pseudo_choisi, 32);
  if char_length(pseudo_choisi) < 2 then
    pseudo_choisi := 'Fermier';
  end if;

  insert into profils (id, pseudo, avatar_url)
  values (new.id, pseudo_choisi, new.raw_user_meta_data ->> 'avatar_url')
  on conflict (id) do nothing;

  return new;
end;
$$;
