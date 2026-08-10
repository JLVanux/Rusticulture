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
