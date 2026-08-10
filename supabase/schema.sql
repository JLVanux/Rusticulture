-- =============================================================================
-- RustiCulture — schéma complet
--
-- TOUT LE SCHÉMA EN UN SEUL FICHIER. À coller dans le SQL Editor de Supabase et
-- exécuter d'un bloc.
--
-- Il est REJOUABLE : on peut le relancer autant de fois que nécessaire sans
-- erreur. C'est ce qui permet de le repasser après chaque livraison sans se
-- demander quelles migrations ont déjà été appliquées.
--
-- -----------------------------------------------------------------------------
-- DEUX RÉGLAGES MANUELS, à faire AVANT d'exécuter ce fichier
-- -----------------------------------------------------------------------------
--
-- 1. Authentication → Sign In / Providers → Email :
--    activer le fournisseur et les inscriptions, DÉSACTIVER « Confirm email ».
--    Sans ça, la création de compte échoue — le site ne demande pas d'adresse.
--
-- 2. Database → Extensions : activer `pg_cron` ET `pg_net`.
--    Sans elles, la partie planificateur échoue et les notifications Discord ne
--    partiront jamais.
--
-- -----------------------------------------------------------------------------
-- APRÈS L'EXÉCUTION
-- -----------------------------------------------------------------------------
--
-- Renseigner l'adresse et le secret du planificateur :
--
--   insert into reglages_serveur (cle, valeur) values
--     ('url_notifications', 'https://rusticulture.vercel.app/api/notifications'),
--     ('cron_secret', 'LA_MEME_VALEUR_QUE_SUR_VERCEL')
--   on conflict (cle) do update set valeur = excluded.valeur;
--
-- Se nommer administrateur :
--
--   update profils set administrateur = true where pseudo = 'TON_PSEUDO';
--
-- -----------------------------------------------------------------------------
-- COMMENT CE FICHIER EST FAIT
-- -----------------------------------------------------------------------------
--
-- C'est la concaténation des migrations, dans l'ordre. Elles sont conservées
-- séparément dans `supabase/migrations/` : ce sont elles qui portent
-- l'historique et les raisons de chaque décision.
--
-- Certaines étapes se corrigent l'une l'autre — la 0004 remplace une fonction
-- de la 0001, par exemple. C'est voulu : l'enchaînement converge vers le bon
-- état, alors qu'un schéma réécrit à la main risquerait d'oublier une politique
-- au passage.
--
-- NE PAS MODIFIER CE FICHIER À LA MAIN : il est régénéré depuis les migrations.
-- =============================================================================




-- =============================================================================
-- 0001_fondations.sql
-- =============================================================================

-- =============================================================================
-- RustiCulture — fondations
--
-- Modèle : profil → ferme → wipe → (graines, plantations, timers, récoltes,
-- objectifs, activités).
--
-- Le WIPE est le conteneur de toutes les données temporelles, pas la ferme.
-- Un nouveau wipe repart de zéro sans rien effacer, et les anciens restent
-- consultables. Accrocher ces données à la ferme obligerait à inventer des
-- remises à zéro partout.
--
-- On stocke des FAITS. Production horaire, totaux, efficacité, scores de
-- classement, recommandations : tout se recalcule. Aucun nombre dérivé n'est
-- stocké, sous peine de dériver silencieusement.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Profils
-- -----------------------------------------------------------------------------

create table profils (
  id          uuid primary key references auth.users on delete cascade,
  pseudo      text not null check (char_length(pseudo) between 2 and 32),
  avatar_url  text,
  cree_le     timestamptz not null default now()
);

-- Un profil est créé automatiquement à l'inscription, à partir des données
-- renvoyées par Discord.
create or replace function creer_profil()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into profils (id, pseudo, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      'Fermier'
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger creer_profil_a_l_inscription
  after insert on auth.users
  for each row execute function creer_profil();

-- -----------------------------------------------------------------------------
-- Fermes et membres
-- -----------------------------------------------------------------------------

create type role_ferme as enum ('proprietaire', 'membre', 'lecture');

create table fermes (
  id               uuid primary key default gen_random_uuid(),
  nom              text not null check (char_length(nom) between 1 and 60),
  cree_par         uuid not null references profils on delete restrict,
  -- Code court partagé aux coéquipiers pour rejoindre la ferme.
  code_invitation  text not null unique default encode(gen_random_bytes(4), 'hex'),
  cree_le          timestamptz not null default now()
);

create table membres (
  ferme_id    uuid not null references fermes on delete cascade,
  profil_id   uuid not null references profils on delete cascade,
  role        role_ferme not null default 'membre',
  rejoint_le  timestamptz not null default now(),
  primary key (ferme_id, profil_id)
);

create index on membres (profil_id);

-- -----------------------------------------------------------------------------
-- Wipes
-- -----------------------------------------------------------------------------

create table wipes (
  id        uuid primary key default gen_random_uuid(),
  ferme_id  uuid not null references fermes on delete cascade,
  nom       text not null check (char_length(nom) between 1 and 60),
  serveur   text,
  debut     date not null default current_date,
  fin       date,
  actif     boolean not null default true,
  cree_le   timestamptz not null default now(),
  check (fin is null or fin >= debut)
);

-- Une ferme n'a qu'un seul wipe actif à la fois.
create unique index un_seul_wipe_actif on wipes (ferme_id) where actif;
create index on wipes (ferme_id);

-- -----------------------------------------------------------------------------
-- Données du wipe
-- -----------------------------------------------------------------------------

-- Les six lettres de gènes sont contraintes ici aussi : la base refusera une
-- valeur invalide même si un bug applicatif la laisse passer.
create domain genes as char(6) check (value ~ '^[GYHWX]{6}$');

create table graines (
  id          uuid primary key default gen_random_uuid(),
  wipe_id     uuid not null references wipes on delete cascade,
  plante      text not null,
  genes       genes not null,
  quantite    int not null default 1 check (quantite >= 0),
  note        text,
  origine     text not null default 'manuel' check (origine in ('scan', 'manuel', 'import')),
  ajoute_par  uuid references profils on delete set null,
  cree_le     timestamptz not null default now()
);

create index on graines (wipe_id);

create table plantations (
  id         uuid primary key default gen_random_uuid(),
  wipe_id    uuid not null references wipes on delete cascade,
  contenant  text not null check (contenant in ('grand_bac', 'petit_bac', 'bac_triangulaire', 'pot')),
  plante     text not null,
  genes      genes,
  quantite   int not null default 1 check (quantite > 0),
  libelle    text,
  cree_le    timestamptz not null default now()
);

create index on plantations (wipe_id);

-- Les durées sont figées à la création plutôt que recalculées à l'affichage :
-- tous les membres doivent voir le même décompte, même si les coefficients du
-- modèle changent entre-temps.
create table timers (
  id                   uuid primary key default gen_random_uuid(),
  wipe_id              uuid not null references wipes on delete cascade,
  cree_par             uuid references profils on delete set null,
  nom                  text not null,
  plante               text not null,
  genes                genes,
  debut                timestamptz not null default now(),
  minutes_croisement   numeric not null check (minutes_croisement >= 0),
  minutes_mur          numeric not null check (minutes_mur >= 0),
  minutes_fin          numeric not null check (minutes_fin >= 0),
  archive              boolean not null default false
);

create index on timers (wipe_id) where not archive;

create table recoltes (
  id          uuid primary key default gen_random_uuid(),
  wipe_id     uuid not null references wipes on delete cascade,
  cree_par    uuid references profils on delete set null,
  ressource   text not null,
  quantite    int not null check (quantite > 0),
  note        text,
  recolte_le  timestamptz not null default now()
);

create index on recoltes (wipe_id, recolte_le);

create table objectifs (
  id         uuid primary key default gen_random_uuid(),
  wipe_id    uuid not null references wipes on delete cascade,
  libelle    text not null,
  type       text not null check (type in ('production', 'genetique', 'construction', 'libre')),
  ressource  text,
  cible      numeric check (cible > 0),
  atteint_le timestamptz,
  cree_le    timestamptz not null default now()
);

create index on objectifs (wipe_id);

-- Journal en ajout seul : aucune politique de modification ni de suppression
-- n'est définie plus bas, donc personne ne peut réécrire l'historique.
create table activites (
  id       uuid primary key default gen_random_uuid(),
  wipe_id  uuid not null references wipes on delete cascade,
  acteur   uuid references profils on delete set null,
  type     text not null,
  donnees  jsonb not null default '{}'::jsonb,
  cree_le  timestamptz not null default now()
);

create index on activites (wipe_id, cree_le desc);

-- =============================================================================
-- Permissions
--
-- Ces fonctions sont en SECURITY DEFINER pour deux raisons. D'abord elles
-- contournent les politiques, ce qui évite la récursion infinie d'une politique
-- sur `membres` qui interrogerait `membres`. Ensuite elles centralisent la
-- règle : une seule définition de « qui peut écrire », impossible à oublier.
--
-- `set search_path` est obligatoire sur une fonction SECURITY DEFINER, sinon
-- elle est détournable en manipulant le chemin de recherche.
-- =============================================================================

create or replace function role_dans_ferme(f uuid)
returns role_ferme
language sql security definer stable set search_path = public
as $$
  select role from membres where ferme_id = f and profil_id = auth.uid();
$$;

create or replace function est_membre_ferme(f uuid)
returns boolean
language sql security definer stable set search_path = public
as $$
  select exists (select 1 from membres where ferme_id = f and profil_id = auth.uid());
$$;

create or replace function peut_ecrire_ferme(f uuid)
returns boolean
language sql security definer stable set search_path = public
as $$
  select role_dans_ferme(f) in ('proprietaire', 'membre');
$$;

create or replace function est_proprietaire(f uuid)
returns boolean
language sql security definer stable set search_path = public
as $$
  select role_dans_ferme(f) = 'proprietaire';
$$;

-- Remonte du wipe à sa ferme, pour que les tables filles n'aient pas à
-- dupliquer `ferme_id`.
create or replace function ferme_du_wipe(w uuid)
returns uuid
language sql security definer stable set search_path = public
as $$
  select ferme_id from wipes where id = w;
$$;

-- =============================================================================
-- Politiques
-- =============================================================================

alter table profils     enable row level security;
alter table fermes      enable row level security;
alter table membres     enable row level security;
alter table wipes       enable row level security;
alter table graines     enable row level security;
alter table plantations enable row level security;
alter table timers      enable row level security;
alter table recoltes    enable row level security;
alter table objectifs   enable row level security;
alter table activites   enable row level security;

-- Profils : chacun voit le sien, et ceux des membres de ses fermes.
drop policy if exists "voir les profils de mes fermes" on profils;
create policy "voir les profils de mes fermes" on profils for select
  using (
    id = auth.uid()
    or exists (
      select 1 from membres m1
      join membres m2 on m1.ferme_id = m2.ferme_id
      where m1.profil_id = auth.uid() and m2.profil_id = profils.id
    )
  );

drop policy if exists "modifier mon profil" on profils;
create policy "modifier mon profil" on profils for update
  using (id = auth.uid()) with check (id = auth.uid());

-- Fermes
drop policy if exists "voir mes fermes" on fermes;
create policy "voir mes fermes" on fermes for select
  using (est_membre_ferme(id));

drop policy if exists "creer une ferme" on fermes;
create policy "creer une ferme" on fermes for insert
  with check (cree_par = auth.uid());

drop policy if exists "le proprietaire modifie la ferme" on fermes;
create policy "le proprietaire modifie la ferme" on fermes for update
  using (est_proprietaire(id)) with check (est_proprietaire(id));

drop policy if exists "le proprietaire supprime la ferme" on fermes;
create policy "le proprietaire supprime la ferme" on fermes for delete
  using (est_proprietaire(id));

-- Membres
drop policy if exists "voir les membres de mes fermes" on membres;
create policy "voir les membres de mes fermes" on membres for select
  using (est_membre_ferme(ferme_id));

drop policy if exists "le proprietaire gere les membres" on membres;
create policy "le proprietaire gere les membres" on membres for all
  using (est_proprietaire(ferme_id)) with check (est_proprietaire(ferme_id));

-- Un membre peut toujours quitter une ferme de lui-même.
drop policy if exists "quitter une ferme" on membres;
create policy "quitter une ferme" on membres for delete
  using (profil_id = auth.uid());

-- Wipes : lecture par tous les membres, écriture réservée au propriétaire.
drop policy if exists "voir les wipes" on wipes;
create policy "voir les wipes" on wipes for select
  using (est_membre_ferme(ferme_id));

drop policy if exists "le proprietaire gere les wipes" on wipes;
create policy "le proprietaire gere les wipes" on wipes for all
  using (est_proprietaire(ferme_id)) with check (est_proprietaire(ferme_id));

-- Tables du wipe : lecture pour tout membre, écriture pour propriétaire et
-- membre, rien pour les comptes en lecture seule.
do $$
declare t text;
begin
  foreach t in array array['graines', 'plantations', 'timers', 'recoltes', 'objectifs']
  loop
    execute format($f$
      drop policy if exists "lire %1$s" on %1$s;
      create policy "lire %1$s" on %1$s for select
        using (est_membre_ferme(ferme_du_wipe(wipe_id)));

      drop policy if exists "ecrire %1$s" on %1$s;
      create policy "ecrire %1$s" on %1$s for insert
        with check (peut_ecrire_ferme(ferme_du_wipe(wipe_id)));

      drop policy if exists "modifier %1$s" on %1$s;
      create policy "modifier %1$s" on %1$s for update
        using (peut_ecrire_ferme(ferme_du_wipe(wipe_id)))
        with check (peut_ecrire_ferme(ferme_du_wipe(wipe_id)));

      drop policy if exists "supprimer %1$s" on %1$s;
      create policy "supprimer %1$s" on %1$s for delete
        using (peut_ecrire_ferme(ferme_du_wipe(wipe_id)));
    $f$, t);
  end loop;
end $$;

-- Activités : lecture et ajout seulement. Pas de modification, pas de
-- suppression — l'historique ne se réécrit pas.
drop policy if exists "lire les activites" on activites;
create policy "lire les activites" on activites for select
  using (est_membre_ferme(ferme_du_wipe(wipe_id)));

drop policy if exists "ajouter une activite" on activites;
create policy "ajouter une activite" on activites for insert
  with check (peut_ecrire_ferme(ferme_du_wipe(wipe_id)) and acteur = auth.uid());

-- =============================================================================
-- Création et adhésion
--
-- Ces deux opérations ne peuvent pas passer par de simples insertions : créer
-- une ferme demande d'y ajouter son auteur comme propriétaire dans la foulée,
-- et rejoindre une ferme demande de la retrouver par son code alors que les
-- politiques interdisent justement de voir les fermes dont on n'est pas membre.
-- =============================================================================

create or replace function creer_ferme(nom_ferme text, nom_wipe text default 'Wipe 1')
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  nouvelle_ferme uuid;
begin
  if auth.uid() is null then
    raise exception 'connexion requise';
  end if;

  insert into fermes (nom, cree_par) values (nom_ferme, auth.uid())
  returning id into nouvelle_ferme;

  insert into membres (ferme_id, profil_id, role)
  values (nouvelle_ferme, auth.uid(), 'proprietaire');

  insert into wipes (ferme_id, nom) values (nouvelle_ferme, nom_wipe);

  return nouvelle_ferme;
end;
$$;

create or replace function rejoindre_ferme(code text)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  cible uuid;
begin
  if auth.uid() is null then
    raise exception 'connexion requise';
  end if;

  select id into cible from fermes where code_invitation = lower(trim(code));
  if cible is null then
    raise exception 'code d''invitation inconnu';
  end if;

  insert into membres (ferme_id, profil_id, role)
  values (cible, auth.uid(), 'membre')
  on conflict (ferme_id, profil_id) do nothing;

  return cible;
end;
$$;

-- Régénérer le code, pour couper l'accès à un lien qui a fuité.
create or replace function regenerer_code_invitation(f uuid)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  nouveau text;
begin
  if not est_proprietaire(f) then
    raise exception 'reserve au proprietaire';
  end if;

  nouveau := encode(gen_random_bytes(4), 'hex');
  update fermes set code_invitation = nouveau where id = f;
  return nouveau;
end;
$$;


-- =============================================================================
-- 0002_comptes_pseudo.sql
-- =============================================================================

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


-- =============================================================================
-- 0003_graines.sql
-- =============================================================================

-- =============================================================================
-- RustiCulture — graines de la ferme
--
-- Deux coéquipiers peuvent scanner la même graine en même temps. Sans contrainte
-- d'unicité, on obtiendrait deux lignes identiques ; avec une lecture suivie
-- d'une écriture côté client, l'un des deux ajouts serait perdu.
--
-- D'où un index unique et deux fonctions qui font l'opération en un seul aller,
-- côté base. Elles sont volontairement en SECURITY INVOKER (le défaut) : les
-- politiques de 0001 continuent donc de s'appliquer, et un membre en lecture
-- seule ne peut pas les utiliser pour contourner ses droits.
--
-- À exécuter après 0001 et 0002.
-- =============================================================================

-- Regrouper d'éventuels doublons antérieurs avant de poser la contrainte.
--
-- Postgres n'a pas d'agrégat min() sur uuid : on passe par le texte pour
-- désigner de façon déterministe la ligne à conserver.
with regroupees as (
  select wipe_id, plante, genes,
         sum(quantite)      as total,
         min(id::text)::uuid as garde
  from graines
  group by wipe_id, plante, genes
  having count(*) > 1
)
update graines g
set quantite = r.total
from regroupees r
where g.id = r.garde;

delete from graines g
using (
  select wipe_id, plante, genes, min(id::text)::uuid as garde
  from graines
  group by wipe_id, plante, genes
) r
where g.wipe_id = r.wipe_id
  and g.plante = r.plante
  and g.genes = r.genes
  and g.id <> r.garde;

create unique index if not exists graines_uniques
  on graines (wipe_id, plante, genes);

-- Ajoute une graine, ou augmente la quantité si elle est déjà là.
create or replace function ajouter_graine(
  p_wipe     uuid,
  p_plante   text,
  p_genes    genes,
  p_quantite int default 1,
  p_origine  text default 'manuel'
)
returns uuid
language plpgsql
as $$
declare
  resultat uuid;
begin
  if p_quantite <= 0 then
    raise exception 'quantite invalide';
  end if;

  insert into graines (wipe_id, plante, genes, quantite, origine, ajoute_par)
  values (p_wipe, p_plante, p_genes, p_quantite, p_origine, auth.uid())
  on conflict (wipe_id, plante, genes)
    do update set quantite = graines.quantite + excluded.quantite
  returning id into resultat;

  return resultat;
end;
$$;

-- Ajuste une quantité, et supprime la ligne quand elle tombe à zéro.
create or replace function ajuster_graine(p_id uuid, p_delta int)
returns int
language plpgsql
as $$
declare
  restant int;
begin
  update graines set quantite = quantite + p_delta
  where id = p_id
  returning quantite into restant;

  if restant is null then
    return 0;
  end if;

  if restant <= 0 then
    delete from graines where id = p_id;
    return 0;
  end if;

  return restant;
end;
$$;


-- =============================================================================
-- 0004_code_invitation.sql
-- =============================================================================

-- =============================================================================
-- RustiCulture — code d'invitation
--
-- 0001 générait le code avec `gen_random_bytes`, qui appartient à l'extension
-- pgcrypto. Sur Supabase, pgcrypto vit dans le schéma `extensions`, absent du
-- `search_path = public` imposé aux fonctions SECURITY DEFINER.
--
-- Conséquence : la valeur par défaut de la colonne fonctionnait (une valeur par
-- défaut n'a pas ce search_path restreint), mais `regenerer_code_invitation`
-- échouait avec « function gen_random_bytes(integer) does not exist ».
--
-- On passe donc à `gen_random_uuid`, intégré au cœur de Postgres depuis la
-- version 13, disponible quel que soit le search_path.
--
-- À exécuter après 0001.
-- =============================================================================

create or replace function nouveau_code_invitation()
returns text
language sql volatile
as $$
  select substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
$$;

alter table fermes
  alter column code_invitation set default nouveau_code_invitation();

create or replace function regenerer_code_invitation(f uuid)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  nouveau text;
  essais  int := 0;
begin
  if not est_proprietaire(f) then
    raise exception 'reserve au proprietaire';
  end if;

  -- Le code est unique : une collision est très improbable mais pas
  -- impossible, et elle ferait échouer la régénération sans explication.
  loop
    nouveau := nouveau_code_invitation();
    exit when not exists (select 1 from fermes where code_invitation = nouveau);
    essais := essais + 1;
    if essais > 10 then
      raise exception 'impossible de generer un code unique';
    end if;
  end loop;

  update fermes set code_invitation = nouveau where id = f;
  return nouveau;
end;
$$;


-- =============================================================================
-- 0005_objectifs.sql
-- =============================================================================

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


-- =============================================================================
-- 0006_suppression_compte.sql
-- =============================================================================

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


-- =============================================================================
-- 0007_wipes.sql
-- =============================================================================

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


-- =============================================================================
-- 0008_elevage.sql
-- =============================================================================

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


-- =============================================================================
-- 0009_discord.sql
-- =============================================================================

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


-- =============================================================================
-- 0010_parcours.sql
-- =============================================================================

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


-- =============================================================================
-- 0011_notifications.sql
-- =============================================================================

-- =============================================================================
-- RustiCulture — réglages des notifications
--
-- La tâche périodique attendait déjà ces colonnes ; elles n'avaient jamais été
-- créées. En l'état, la route échouait sur chaque exécution.
--
-- Le choix appartient à la FERME, pas au joueur : le webhook écrit dans un
-- salon commun, c'est donc le propriétaire qui décide de ce que son serveur
-- reçoit.
--
-- Tout est éteint par défaut sauf les alertes de culture. Un webhook qui
-- commente chaque geste dès son installation se fait retirer dans la semaine, et
-- on perd alors aussi les notifications qui comptent. Mieux vaut en rajouter que
-- d'avoir à en enlever.
--
-- À exécuter après 0009.
-- =============================================================================

alter table integrations
  add column if not exists notif_croisement      boolean not null default true,
  add column if not exists notif_recolte         boolean not null default true,
  add column if not exists notif_deperit         boolean not null default true,
  add column if not exists notif_plantation      boolean not null default false,
  add column if not exists notif_recolte_saisie  boolean not null default false,
  add column if not exists notif_graine_parfaite boolean not null default true,
  add column if not exists notif_objectif        boolean not null default false,
  add column if not exists notif_membre          boolean not null default false,
  add column if not exists notif_wipe_fin        boolean not null default false,
  add column if not exists notif_point_quotidien boolean not null default false,
  add column if not exists heure_point           int not null default 20
    check (heure_point between 0 and 23),
  add column if not exists dernier_point         date;

-- Le dépérissement rejoint les seuils suivis.
alter table notifications_envoyees
  drop constraint if exists notifications_envoyees_type_check;
alter table notifications_envoyees
  add constraint notifications_envoyees_type_check
  check (type in ('croisement', 'mur', 'deperit', 'plantation'));

-- Journal des envois qui ne sont pas liés à un minuteur : plantations,
-- récoltes, points quotidiens. La clé primaire empêche le doublon même si deux
-- exécutions se chevauchent.
create table if not exists notifs_envoyees (
  ferme_id  uuid not null references fermes on delete cascade,
  cle       text not null,
  envoye_le timestamptz not null default now(),
  primary key (ferme_id, cle)
);

alter table notifs_envoyees enable row level security;
-- Aucune politique : seule la tâche serveur y touche.

/** Lit les réglages sans jamais révéler le webhook. */
create or replace function preferences_notifications(f uuid)
returns jsonb
language sql
security definer stable set search_path = public
as $$
  select case when not est_membre_ferme(f) then null else coalesce(
    (select to_jsonb(i) - 'webhook_discord' - 'ferme_id' - 'maj_le' - 'dernier_point'
     from integrations i where i.ferme_id = f),
    '{}'::jsonb) end;
$$;

/**
 * Enregistre un réglage, booléen ou numérique.
 *
 * Le nom de colonne est validé contre une **liste blanche** avant d'être
 * interpolé : un nom venu du navigateur s'exécuterait sinon tel quel dans la
 * requête.
 */
create or replace function regler_notification(
  f uuid,
  champ text,
  valeur_bool boolean default null,
  valeur_int int default null
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not est_proprietaire(f) then
    raise exception 'reserve au proprietaire';
  end if;

  -- La ligne peut ne pas exister si aucun webhook n'a encore été posé : on la
  -- crée pour que les réglages survivent au branchement ultérieur.
  insert into integrations (ferme_id, maj_le) values (f, now())
  on conflict (ferme_id) do update set maj_le = now();

  if champ in (
    'notif_croisement', 'notif_recolte', 'notif_deperit', 'notif_plantation',
    'notif_recolte_saisie', 'notif_graine_parfaite', 'notif_objectif',
    'notif_membre', 'notif_membre_parti', 'notif_wipe_fin', 'notif_point_quotidien'
  ) then
    if valeur_bool is null then
      raise exception 'valeur booleenne attendue';
    end if;
    execute format('update integrations set %I = $1 where ferme_id = $2', champ)
    using valeur_bool, f;

  elsif champ = 'heure_point' then
    if valeur_int is null or valeur_int < 0 or valeur_int > 23 then
      raise exception 'heure invalide';
    end if;
    update integrations set heure_point = valeur_int where ferme_id = f;

  else
    raise exception 'reglage inconnu';
  end if;
end;
$$;


-- =============================================================================
-- 0012_planificateur.sql
-- =============================================================================

-- =============================================================================
-- RustiCulture — planificateur des notifications
--
-- Remplace GitHub Actions, dont les tâches planifiées accusent couramment dix à
-- trente minutes de retard sur les runners gratuits : c'est la nature du
-- service, pas un réglage. Sur des alertes de récolte, ce décalage vide la
-- fonctionnalité de son intérêt.
--
-- `pg_cron` s'exécute dans la base elle-même, à la minute près, sur le plan
-- gratuit de Supabase. Une pièce mobile en moins, et un effet de bord utile :
-- le projet est interrogé chaque minute, donc il ne se met plus en pause après
-- sept jours d'inactivité.
--
-- PRÉALABLE — activer les deux extensions dans le tableau de bord Supabase,
-- Database → Extensions : `pg_cron` et `pg_net`. Ce script échoue sinon.
-- =============================================================================

-- Le secret n'a pas sa place dans un fichier versionné : on le range dans la
-- base, hors d'atteinte du client, et la tâche va l'y chercher.
create table if not exists reglages_serveur (
  cle    text primary key,
  valeur text not null
);

alter table reglages_serveur enable row level security;
-- Aucune politique : inaccessible depuis le navigateur, quel que soit le rôle.

/**
 * Déclenche l'envoi des notifications.
 *
 * Isolée dans une fonction plutôt qu'écrite dans la planification : la modifier
 * ne demande pas de reprogrammer la tâche, et on peut l'appeler à la main pour
 * tester.
 */
create or replace function declencher_notifications()
returns void
language plpgsql
security definer set search_path = public, extensions
as $$
declare
  adresse text;
  secret  text;
begin
  select valeur into adresse from reglages_serveur where cle = 'url_notifications';
  select valeur into secret  from reglages_serveur where cle = 'cron_secret';

  if adresse is null or secret is null then
    raise notice 'planificateur non configuré : renseigner url_notifications et cron_secret';
    return;
  end if;

  perform net.http_get(
    url := adresse,
    headers := jsonb_build_object('Authorization', 'Bearer ' || secret),
    timeout_milliseconds := 20000
  );
end;
$$;

-- Toutes les minutes. La route est protégée par son secret et ne fait rien
-- quand aucun seuil n'est franchi : un passage à vide coûte une requête.
select cron.unschedule('notifications-rusticulture')
where exists (select 1 from cron.job where jobname = 'notifications-rusticulture');

select cron.schedule(
  'notifications-rusticulture',
  '* * * * *',
  $$ select declencher_notifications(); $$
);


-- =============================================================================
-- 0013_mouvements_equipe.sql
-- =============================================================================

-- =============================================================================
-- RustiCulture — arrivées et départs
--
-- Ces événements se produisent dans le site : on les enregistre dans le journal
-- d'activité, et la tâche périodique les relaie. Le webhook est un secret, il ne
-- descend jamais dans le navigateur — c'est pourquoi rien n'est envoyé depuis le
-- client.
--
-- L'activité est attachée au wipe actif : sans wipe, pas de journal, donc pas de
-- notification. C'est cohérent avec le reste, où le wipe est le conteneur de
-- tout ce qui est temporel.
--
-- À exécuter après 0011.
-- =============================================================================

alter table integrations
  add column if not exists notif_membre_parti boolean not null default false;

/**
 * Trace une arrivée ou un départ.
 *
 * En SECURITY DEFINER parce qu'un membre qui part n'a plus le droit d'écrire
 * dans la ferme au moment où l'on veut noter son départ — c'est précisément
 * l'ordre inverse qui serait nécessaire.
 */
create or replace function journaliser_mouvement(
  f uuid,
  p_profil uuid,
  p_type text
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  le_wipe uuid;
  le_nom  text;
begin
  if p_type not in ('membre_rejoint', 'membre_parti', 'membre_retire') then
    raise exception 'type inconnu';
  end if;

  select id into le_wipe from wipes where ferme_id = f and actif limit 1;
  if le_wipe is null then
    return; -- pas de wipe actif : rien à journaliser
  end if;

  select pseudo into le_nom from profils where id = p_profil;

  insert into activites (wipe_id, acteur, type, donnees)
  values (le_wipe, p_profil, p_type, jsonb_build_object('pseudo', coalesce(le_nom, 'quelqu''un')));
end;
$$;


-- =============================================================================
-- 0014_profils.sql
-- =============================================================================

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


-- =============================================================================
-- 0015_bases.sql
-- =============================================================================

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


-- =============================================================================
-- 0016_taille_base.sql
-- =============================================================================

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
