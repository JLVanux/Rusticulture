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

## Comportement sans configuration

Si les variables sont absentes, `supabaseConfigure` vaut `false` et les pages `/ferme` et `/connexion` affichent un message d'indisponibilité. Le reste du site est inchangé. Vérifié : les quatre pages répondent en 200 sans variables, et aucune requête réseau n'est tentée.
