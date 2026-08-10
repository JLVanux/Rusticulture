# Base de données — mise en place

## 1. Créer le projet

Depuis le dossier du projet :

```bash
vercel install supabase
```

Ça provisionne le projet Supabase, le rattache au projet Vercel et injecte les identifiants en variables d'environnement. Choisis une **région européenne** (Paris ou Francfort) : les utilisateurs visés sont francophones, et c'est aussi le plus simple côté RGPD.

## 2. Appliquer les migrations

Dans l'ordre, une seule fois chacune :

| Fichier | Rôle |
|---|---|
| `0001_fondations.sql` | tables, permissions, fonctions |
| `0002_comptes_pseudo.sql` | comptes par pseudo, unicité |
| `0003_graines.sql` | graines partagées, opérations atomiques |
| `0004_code_invitation.sql` | correctif du code d'invitation |

### Deux pièges rencontrés, à retenir

**Pas d'agrégat `min` sur uuid.** Postgres n'en fournit pas. Il faut passer par `min(id::text)::uuid` — l'ordre est arbitraire mais déterministe, ce qui suffit pour désigner une ligne survivante.

**`search_path = public` exclut les extensions.** Supabase installe pgcrypto dans le schéma `extensions`. Une fonction `SECURITY DEFINER` avec `set search_path = public` ne trouve donc pas `gen_random_bytes`, alors qu'une valeur par défaut de colonne y arrive très bien — d'où une erreur qui n'apparaît qu'à l'usage.

Ce `set search_path` ne doit pas être élargi pour autant : sans lui, une fonction `SECURITY DEFINER` est détournable. La bonne réponse est de supprimer la dépendance, ici en passant à `gen_random_uuid()`, qui appartient au cœur de Postgres.

## Détail de la première migration

Dans le tableau de bord Supabase, onglet SQL Editor, colle le contenu de `migrations/0001_fondations.sql` et exécute-le. Une seule fois.

Vérification rapide, à exécuter juste après :

```sql
-- Doit renvoyer 10 lignes, toutes avec rowsecurity = true
select tablename, rowsecurity from pg_tables
where schemaname = 'public' order by tablename;
```

Si une table apparaît avec `rowsecurity = false`, elle est **lisible par n'importe qui**. Ne pas continuer sans avoir corrigé.

## 3. Régler l'authentification

Authentication → **Sign In / Providers** → Email :

Trois réglages, tous les trois nécessaires :

- **« Enable Email provider » : ACTIVÉ.** Sinon aucun compte à mot de passe n'est possible.
- **« Allow new users to sign up » : ACTIVÉ.** Sinon l'inscription échoue avec « Email signups are disabled ». Ce réglage peut aussi se trouver au niveau global, dans Authentication → Settings.
- **« Confirm email » : DÉSACTIVÉ.** C'est lui qui déclenche l'envoi d'un message de validation. Tant qu'il est actif, la création de compte semble fonctionner puis la connexion est refusée avec « Email not confirmed ».

Les trois messages d'erreur correspondants sont traduits dans l'interface et pointent le réglage fautif.

Rien d'autre. Aucun SMTP, aucun fournisseur externe, aucune application Discord à créer.

Discord reste ajoutable plus tard : les fournisseurs se cumulent et les comptes existants ne sont pas affectés.

## 4. Éviter la mise en pause

Un projet Supabase gratuit est mis en pause après **sept jours sans la moindre requête**, et il faut alors le réveiller à la main.

**Ce problème est réglé depuis la mise en place de `pg_cron`** : la tâche des notifications interroge la base chaque minute, donc elle ne s'endort jamais. Voir `PLANIFICATEUR.md`.

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

---

# Comptes — état actuel

Création de compte avec **un pseudo et un mot de passe**. Aucun e-mail n'est demandé ni envoyé.

Supabase exige techniquement une adresse pour un compte à mot de passe : on en dérive une du pseudo (`thomas@comptes.rusticulture.app`), jamais affichée et jamais utilisée pour écrire à qui que ce soit. C'est l'unicité de cette adresse qui garantit l'unicité du pseudo côté authentification, doublée d'un index unique insensible à la casse sur `profils.pseudo`.

Le pseudo est **l'identifiant de connexion** : il n'est donc pas modifiable. La politique de modification du profil posée en 0001 est retirée par la migration `0002_comptes_pseudo.sql`, **à exécuter après 0001**.

## Réglage obligatoire dans le tableau de bord

Authentication → Sign In / Providers → Email :

- **« Confirm email » : DÉSACTIVÉ.** S'il reste actif, Supabase attend une confirmation qui n'arrivera jamais et la connexion échoue juste après l'inscription.
- « Enable Email provider » : activé.

Sans ce réglage, la création de compte semblera fonctionner puis la connexion sera refusée. Le message d'erreur est traduit dans l'interface pour pointer directement ce réglage.

## Le compromis assumé

Sans e-mail, **aucune récupération de mot de passe n'est possible**. Un mot de passe oublié, c'est un compte perdu — et pour un propriétaire, une ferme perdue avec.

La parade la plus simple si ça devient un problème : proposer d'ajouter une adresse plus tard, en option, uniquement pour la récupération. Le schéma n'a pas besoin de changer, Supabase sait mettre à jour l'adresse d'un compte existant.

Discord reste ajoutable à tout moment : les fournisseurs se cumulent, et un compte pseudo pourra y être rattaché.

## Variables d'environnement

Dans le tableau de bord Supabase, bouton **Connect** en haut, onglet **Framework** (Next.js / App Router). Seul l'encadré `.env.local` est utile : copier les deux lignes dans un fichier `.env.local` à la racine du projet.

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

**Ignorer le reste de l'assistant Supabase.** Il propose d'installer `@supabase/ssr`, de créer `utils/supabase/server.ts` et un middleware de session : rien de tout ça n'est nécessaire ici, toutes les pages du site sont des composants client et `src/lib/supabase.ts` remplit déjà ce rôle. Suivre ces étapes créerait un second client concurrent. Laisser aussi Shadcn désactivé, le site a son propre système de composants.

Les mêmes deux variables sont à déclarer dans Vercel → Settings → Environment Variables.

Supabase a renommé sa clé publique : `sb_publishable_...` remplace l'ancienne clé « anon » en JWT. Le code accepte les deux noms.

Cette clé est **publique par nature** : elle est visible dans le navigateur de chaque visiteur, c'est normal et sans danger. Ce qui protège les données, ce sont les politiques de la base. En revanche la clé `service_role` contourne toutes les politiques — elle ne doit jamais apparaître dans une variable `NEXT_PUBLIC_`, ni dans le dépôt.

## Ce qui est public et ce qui ne l'est pas

`NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` sont **publiques par conception**. Le préfixe `NEXT_PUBLIC_` fait que Next les inscrit dans le JavaScript envoyé au navigateur : n'importe quel visiteur peut les lire. Les retrouver dans un dépôt public n'est donc pas une fuite.

Ce qui protège les données, ce sont les politiques de la base. C'est pour ça qu'il ne faut jamais désactiver la sécurité au niveau des lignes sur une table.

**Ne doivent jamais quitter ta machine, en revanche** :

- la clé `service_role` — elle contourne toutes les politiques ;
- le mot de passe de la base, donné à la création du projet ;
- toute chaîne de connexion Postgres directe.

Aucune de ces trois valeurs n'a besoin de figurer dans le projet en l'état.

## Fichiers d'environnement et git

Le motif `.env*.local`, courant dans les modèles Next, laisse passer `.env`, `.env.development` et `.env.production` — trois noms très employés. Le `.gitignore` du projet couvre désormais `.env` et `.env.*`, avec une exception pour les fichiers d'exemple.

Pour vérifier qu'aucun fichier d'environnement n'est suivi :

```bash
git ls-files | grep -i env
```

La seule ligne attendue est `.env.local.exemple`. Si un `.env` apparaît, le retirer du suivi sans effacer le fichier :

```bash
git rm --cached .env
git commit -m "Retire .env du suivi"
```

## Comportement sans configuration

Si les variables sont absentes, `supabaseConfigure` vaut `false` et les pages `/ferme` et `/connexion` affichent un message d'indisponibilité. Le reste du site est inchangé. Vérifié : les quatre pages répondent en 200 sans variables, et aucune requête réseau n'est tentée.

---

# Graines de la ferme

## Une seule interface, deux stockages

`src/lib/graines.ts` expose `useGraines()`. Les pages demandent des graines et des actions ; elles ne savent pas d'où elles viennent. La source est choisie automatiquement :

- **local** — pas connecté, ou aucune ferme sélectionnée. Comportement identique à avant.
- **ferme** — connecté avec une ferme active. Les graines sont partagées.

C'est la seule abstraction de ce genre dans le projet, et c'est délibéré : les graines sont la seule donnée qui existe réellement des deux côtés. Abstraire par avance ce qui n'a qu'une implémentation coûte sans rien rapporter.

Un bandeau indique en permanence où sont rangées les graines. Sans lui, on ne sait pas si son coéquipier verra ce qu'on vient d'ajouter.

## Concurrence

Deux coéquipiers peuvent scanner la même graine en même temps. Une lecture suivie d'une écriture côté client perdrait l'un des deux ajouts.

D'où, dans `0003_graines.sql`, un index unique sur `(wipe_id, plante, genes)` et deux fonctions qui font l'opération en un seul aller : `ajouter_graine` (insertion ou incrément) et `ajuster_graine` (incrément, suppression à zéro).

Ces fonctions sont volontairement en **SECURITY INVOKER**, contrairement à celles de 0001. Les politiques continuent donc de s'appliquer : un membre en lecture seule ne peut pas s'en servir pour contourner ses droits. Ne pas les passer en `security definer` sans en mesurer la conséquence.

## Reprise de la banque locale

Le bandeau propose de copier la banque du navigateur vers la ferme. Le local n'est **pas effacé** : un doublon se corrige, une perte non.

## Journal

Chaque ajout, import ou purge écrit une ligne dans `activites`. Les échecs d'écriture du journal sont ignorés : un historique manquant ne doit jamais empêcher l'action elle-même.

---

# Correctifs 0003 et 0004

## `min(uuid)` n'existe pas

Postgres n'a pas d'agrégat `min()` sur le type uuid. Le regroupement des doublons dans `0003_graines.sql` passe donc par `min(id::text)::uuid` : le tri lexicographique désigne une ligne de façon déterministe, ce qui suffit pour choisir laquelle conserver.

## pgcrypto et le search_path

`0001` générait le code d'invitation avec `gen_random_bytes`, qui appartient à l'extension **pgcrypto**. Sur Supabase, pgcrypto est installée dans le schéma `extensions`, absent du `search_path = public` imposé aux fonctions SECURITY DEFINER.

Effet trompeur : la **valeur par défaut** de la colonne fonctionnait — une valeur par défaut n'a pas ce search_path restreint — donc la création de ferme produisait bien un code. Mais `regenerer_code_invitation` échouait avec « function gen_random_bytes(integer) does not exist ».

`0004_code_invitation.sql` remplace la génération par `gen_random_uuid`, intégrée au cœur de Postgres depuis la version 13 et donc disponible quel que soit le search_path. Elle ajoute aussi une boucle de réessai sur collision : le code est unique, et une collision non gérée ferait échouer la régénération sans explication.

**Leçon générale** : toute fonction `security definer set search_path = public` ne doit utiliser que des fonctions du cœur de Postgres ou du schéma `public`. Ajouter `extensions` au search_path est possible, mais élargit la surface d'attaque de la fonction.

---

# Timers partagés et journal

## Pourquoi aucune synchronisation permanente

Un timer n'est qu'une **date de départ et des durées**. Chacun charge la page et recalcule le temps restant : une ligne en base suffit, il n'y a rien à diffuser en continu.

Reste à voir apparaître les timers lancés par un coéquipier. Plutôt qu'une connexion permanente, on relit toutes les 30 secondes **et au retour sur l'onglet** — c'est le moment où l'on regarde vraiment. Supabase Realtime reste ajoutable si ça devient insuffisant, mais ce serait payer une connexion ouverte pour un gain marginal.

## Ce qui reste local

L'état « déjà notifié » appartient à l'appareil, pas à la ferme. Si Thomas a vu passer l'alerte sur son téléphone, Alex doit quand même la recevoir sur le sien. La table `timers` ne porte donc aucun drapeau de notification ; c'est le navigateur qui retient ce qu'il a déjà annoncé.

Limite inchangée : les notifications exigent qu'un onglet reste ouvert. C'est une contrainte du navigateur. Les dépasser demanderait des notifications push, donc un service worker et une clé serveur — envisageable plus tard.

## Journal

Chaque action notable écrit une ligne dans `activites` : ajout de graines, import, purge, lancement et suppression de timer. `decrireActivite` la rend lisible en français.

Un type inconnu n'est pas traité comme une erreur : une version plus ancienne du site peut lire des activités écrites par une plus récente, et affiche alors une phrase neutre plutôt que rien.

Les échecs d'écriture du journal sont ignorés : un historique manquant ne doit jamais empêcher l'action elle-même.

---

# Rejouer une migration

Toutes les migrations sont **rejouables** : on peut les exécuter deux fois sans erreur.

Ce n'était pas le cas au départ, et ça se paie exactement au mauvais moment. `create table` accepte `if not exists`, `create function` accepte `or replace` — mais **`create policy` n'a aucune variante de ce genre**. Rejouer une migration échouait donc sur la première politique déjà présente, et comme le SQL Editor exécute tout dans une transaction, l'échec annulait aussi les colonnes ajoutées juste avant.

D'où la règle : **toujours faire précéder un `create policy` d'un `drop policy if exists`**, y compris dans les politiques générées en boucle.

Le symptôme : `ERROR: 42710: policy "..." for table "..." already exists`.

---

# Un seul fichier

`supabase/schema.sql` réunit toutes les migrations. C'est celui à coller dans le SQL Editor : un bloc, une exécution.

Il est **rejouable**, donc on peut le repasser après chaque livraison sans se demander lesquelles ont déjà été appliquées — et sans risquer qu'un échec en cours de route laisse la base à moitié à jour.

Les fichiers de `migrations/` sont conservés : ce sont eux qui portent l'historique et la raison de chaque décision. `schema.sql` est **régénéré depuis eux**, jamais modifié à la main.

Certaines étapes se corrigent l'une l'autre — la 0004 remplace une fonction de la 0001. C'est voulu : l'enchaînement converge vers le bon état, alors qu'un schéma réécrit à la main risquerait d'oublier une politique au passage.

## Deux réglages manuels, avant d'exécuter

1. **Authentication → Sign In / Providers → Email** : activer le fournisseur et les inscriptions, **désactiver « Confirm email »**. Sans ça, la création de compte échoue — le site ne demande pas d'adresse.
2. **Database → Extensions** : activer `pg_cron` et `pg_net`. Sans elles, le planificateur échoue et les notifications ne partent jamais.
