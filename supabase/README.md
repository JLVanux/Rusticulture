# Base de données — mise en place

## 1. Créer le projet

Depuis le dossier du projet :

```bash
vercel install supabase
```

Ça provisionne le projet Supabase, le rattache au projet Vercel et injecte les identifiants en variables d'environnement. Choisis une **région européenne** (Paris ou Francfort) : les utilisateurs visés sont francophones, et c'est aussi le plus simple côté RGPD.

## 2. Appliquer la migration

Dans le tableau de bord Supabase, onglet SQL Editor, colle le contenu de `migrations/0001_fondations.sql` et exécute-le. Une seule fois.

Vérification rapide, à exécuter juste après :

```sql
-- Doit renvoyer 10 lignes, toutes avec rowsecurity = true
select tablename, rowsecurity from pg_tables
where schemaname = 'public' order by tablename;
```

Si une table apparaît avec `rowsecurity = false`, elle est **lisible par n'importe qui**. Ne pas continuer sans avoir corrigé.

## 3. Activer la connexion Discord

Onglet Authentication → Providers → Discord. Il faut créer une application sur le portail développeur Discord et y déclarer l'URL de rappel fournie par Supabase.

Pourquoi Discord plutôt qu'un mot de passe : les joueurs de Rust y sont déjà, il n'y a aucun mot de passe à stocker ni à réinitialiser, et on récupère pseudo et avatar pour la liste des membres.

## 4. Éviter la mise en pause

Un projet Supabase gratuit est mis en pause après **sept jours sans la moindre requête**, et il faut alors le réveiller à la main. Tant que le trafic est faible, prévoir une tâche planifiée GitHub Actions qui interroge la base tous les trois jours. Ou passer au plan Pro à 25 $/mois, qui supprime le problème.

---

# Décisions d'architecture

## Le wipe est le conteneur, pas la ferme

Toutes les données temporelles pendent du wipe : graines, plantations, timers, récoltes, objectifs, activités. Un nouveau wipe repart à zéro sans rien effacer, et les anciens restent consultables. Si ces données étaient accrochées à la ferme, il faudrait inventer des remises à zéro partout, et l'historique serait perdu.

Une ferme n'a qu'un seul wipe actif à la fois, garanti par un index unique partiel.

## On stocke des faits, on dérive le reste

Une récolte est un fait. Une configuration de ferme est un fait. La production horaire, les totaux, l'efficacité, les scores de classement et les recommandations se recalculent à chaque fois.

Aucun nombre dérivé n'est stocké. C'est la même discipline que pour le modèle de croissance : un coefficient persisté dont le sens change produit des valeurs fausses que plus rien ne détecte.

## Les durées de timer sont figées à la création

`minutes_croisement`, `minutes_mur` et `minutes_fin` sont calculées une fois et écrites en base, plutôt que recalculées à l'affichage. Tous les membres doivent voir le même décompte, y compris si les coefficients du modèle changent en cours de wipe.

C'est la seule exception assumée à la règle précédente : ici la valeur calculée fait partie du fait.

## Les permissions vivent dans la base

Les trois rôles — propriétaire, membre, lecture seule — sont appliqués par des politiques Postgres, pas par du code applicatif. Un client qui interrogerait directement l'API ne peut pas les contourner.

Les fonctions d'appui (`est_membre_ferme`, `peut_ecrire_ferme`, `est_proprietaire`) sont en `security definer` pour deux raisons : éviter la récursion infinie d'une politique sur `membres` qui interrogerait `membres`, et centraliser la règle en un seul endroit. Le `set search_path = public` sur ces fonctions n'est pas décoratif — sans lui, elles sont détournables.

## Deux opérations passent par des fonctions

Créer une ferme et la rejoindre ne peuvent pas être de simples insertions. Créer demande d'ajouter son auteur comme propriétaire dans la même transaction. Rejoindre demande de retrouver une ferme par son code alors que les politiques interdisent précisément de voir les fermes dont on n'est pas membre.

## Le journal ne se réécrit pas

La table `activites` n'a que des politiques de lecture et d'ajout. Aucune modification, aucune suppression — y compris pour le propriétaire.

## Contraintes au plus près de la donnée

Le domaine `genes` impose les six lettres `[GYHWX]` au niveau de la base. Une quantité négative, une date de fin antérieure au début, un contenant inconnu : tout est refusé par Postgres même si un bug applicatif laisse passer la valeur.

---

# Ce que la phase 1 ne fait pas

Le site actuel n'est pas modifié. Les calculateurs, le scanner et la génétique continuent de fonctionner en local, sans compte.

Restent à faire, dans l'ordre :

1. Une couche d'accès aux données à deux implémentations — locale et Supabase — pour que les hooks existants fonctionnent dans les deux modes sans réécriture.
2. La connexion et la page « Ma ferme ».
3. La reprise de la banque de graines locale vers la ferme, sur action explicite.

## Points en attente

- **Le classement entre amis** demandera une notion de groupe de fermes. Pas de table pour l'instant : elle se greffera sans rien casser.
- **Le contrôle de plausibilité des récoltes** n'est pas encore posé. Une récolte saisie à la main doit être confrontée à la capacité théorique de la ferme déclarée, sinon les statistiques et le classement ne valent rien.
- **RGPD** : les données deviennent personnelles dès qu'il y a des comptes. Il faudra une politique de confidentialité et une suppression de compte réelle. Les cascades de suppression sont déjà en place côté base.
