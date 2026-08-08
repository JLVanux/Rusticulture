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
