# RustiCulture — état d'avancement

Ce fichier est la mémoire du projet. Il suit la vision « le cerveau de ma ferme Rust » point par point, et note les décisions déjà tranchées pour ne pas les rejouer.

Dernière mise à jour : après la suppression de compte et la page de confidentialité.

---

## Fait

### Fondations
- **Supabase** : Postgres, comptes, permissions par politiques de base. Région européenne.
- **Modèle** profil → ferme → wipe → (graines, plantations, timers, récoltes, objectifs, activités).
- **Le wipe est le conteneur** des données temporelles, pas la ferme. Un nouveau wipe repart de zéro sans rien effacer.
- **Comptes par pseudo et mot de passe**, aucun e-mail demandé ni envoyé. Le pseudo est l'identifiant, donc non modifiable. Un mot de passe oublié est définitivement perdu — annoncé dans l'interface.
- Le site reste **entièrement utilisable sans compte** : calculateurs, scanner, génétique en local. Sans variables d'environnement, la partie ferme s'affiche comme indisponible et rien d'autre ne bouge.

### Ferme collaborative
- Création, adhésion par **code d'invitation**, gestion des membres.
- **Trois rôles** — propriétaire, membre, lecture seule — appliqués par la base, pas par le code. Un appel direct à l'API ne peut pas les contourner.
- **Journal d'activité** en ajout seul : l'historique ne se réécrit pas, propriétaire compris.
- **Suppression de compte** réelle, avec transmission de la ferme au plus ancien membre restant.
- **Page de confidentialité**.

### Données partagées
- **Graines** : une seule interface (`useGraines`) pour deux stockages, local ou ferme. Index unique et fonctions atomiques côté base pour que deux coéquipiers puissent scanner en même temps.
- **Timers** : appartiennent à la ferme, avec le nom de qui les a lancés. Aucune connexion permanente — un timer n'est qu'une date de départ. Relecture toutes les 30 s et au retour sur l'onglet. L'état « déjà notifié » reste sur l'appareil.
- **Plantations** : contenants déclarés, avec grand bac, bac triangulaire, petit bac et pot.
- **Récoltes réelles**, avec **contrôle de plausibilité** confronté à la capacité théorique. Avertit sans bloquer.
- **Objectifs** : production, génétique, construction, libre. Progression **dérivée** des faits, jamais stockée.

### Tableau de bord et statistiques
- Production estimée par ressource et par heure, à partir des contenants déclarés.
- Alerte sur les plants à inspecter.
- Statistiques du wipe : totaux, moyenne, meilleure récolte, **rendement réel** rapporté à l'estimation.
- Vocabulaire « estimé » contre « enregistré » tenu partout.

### Navigation
- Tiroir mobile donnant accès aux dix-huit pages. Colonne fixe au-dessus de 1024 px.

---

## Reste à faire

Dans l'ordre recommandé.

### 1. Recommandations — « Que dois-je faire maintenant ? »
La pièce centrale de la vision, et **toutes les données nécessaires sont désormais en place**. À base de règles, jamais de devinettes. Pistes déjà identifiées :
- un plant est en stade Croisement → aller le bouturer ;
- une graine en réserve est meilleure que celle plantée dans un bac → la remplacer, avec le gain estimé chiffré ;
- assez de baies pour un thé avant la prochaine récolte ;
- un objectif est à portée ;
- le rendement réel décroche de l'estimé → replanter plus vite.

### 2. Planificateur de wipe
Le modèle est prêt depuis le premier jour, il ne manque que l'interface : clôturer un wipe, afficher son résumé, en démarrer un nouveau, consulter les anciens. `wipes.fin` et `wipes.actif` existent déjà, avec un index unique garantissant un seul wipe actif par ferme.

### 3. Poulailler dans la ferme
La page poulailler est un calculateur isolé. Nombre de poulaillers et de poules devraient rejoindre la configuration de la ferme et alimenter la production estimée en œufs — ressource déjà déclarable dans les récoltes.

### 4. Évolution dans le temps
Les statistiques donnent des totaux, pas des courbes. Les récoltes sont horodatées : tout est là pour tracer une progression par jour de wipe.

### 5. Classement entre amis
**Décision déjà prise : entre amis d'abord, pas de classement mondial.** Conséquence d'architecture : il faut une notion de **groupe de fermes**, rejointes par code. Le classement se calcule alors à la demande sur quelques fermes, sans tâche planifiée ni table de scores.

Classer sur des **ratios** — rendement réel, production par grand bac — et jamais sur des totaux bruts, qui récompensent le temps de jeu et la taille d'équipe.

À ne construire qu'une fois qu'il y a du monde. « Toi 1 840, moyenne 1 420 » calculé sur trois fermes, c'est du bruit présenté comme une statistique.

### 6. Comparaison avec les autres
Même condition que le classement. En attendant, la comparaison utile est **avec soi-même** : cette semaine contre la semaine dernière.

### 7. Badges
En dernier, et avec parcimonie.

---

## Dette et angles morts

### À faire absolument
- **Aucun test sur le moteur de croisement.** Trois bugs réels y ont été trouvés — optimiseur renvoyant 0 % sur des banques solubles, coefficient de croissance donnant des cycles de quatre minutes, pont intermédiaire mal orienté. À chaque fois par hasard ou par signalement. Une trentaine de cas figés rendraient ces régressions impossibles.

### Ne dépend que d'un accès au PC de jeu
- **Le scanner n'a jamais tourné sur du vrai Rust.** Ni l'OCR, ni le mode couleur. Si l'OCR déçoit, basculer en mode couleur — plus fiable une fois la palette apprise.
- **Le modèle de croissance n'a jamais été calibré en jeu.** La page Réglages est faite pour ça. Les sources communautaires vont du simple au double.

### Limites connues, assumées et documentées dans l'interface
- **La configuration de la ferme n'est pas historisée.** Monter dix bacs aujourd'hui fait recalculer à la hausse la capacité des jours passés, donc baisser le rendement réel affiché.
- **Les récoltes sont invérifiables.** Seul le contrôle de plausibilité les encadre.
- **Les notifications exigent un onglet ouvert.** Les vraies notifications push demanderaient un service worker et une clé serveur.
- **Le planificateur multi-générations tourne sur le fil principal**, environ 250 ms sur ordinateur de bureau, davantage sur téléphone. Leviers, du plus rentable au moins : représentation en tableaux typés plutôt qu'en objets, cache par empreinte de banque, puis web worker.
- **Le responsive n'a jamais été vérifié dans un vrai navigateur.** Seulement audité dans le code, avec un contrôle arithmétique des largeurs. Six pages étaient inaccessibles sur mobile avant qu'un usage réel ne le révèle.

---

## Décisions tranchées — ne pas les rejouer

- **Serveur et comptes : oui.** Le collaboratif l'exigeait.
- **Supabase**, via la place de marché Vercel. Les permissions dans la base étaient l'argument décisif.
- **Pas de Discord** pour l'instant. Ajoutable plus tard sans toucher aux comptes existants.
- **Pas d'e-mail du tout.** Ni lien magique, ni confirmation, ni récupération.
- **On stocke des faits, on dérive le reste.** Seule exception assumée : les durées d'un timer, figées à la création pour que tous les membres voient le même décompte.
- **Le croisement suppose le grand bac**, seul contenant dont la grille 3×3 produit les probabilités du site. Les autres ne comptent que pour la production.
- **Une estimation n'est jamais présentée comme une observation.**

---

## Pièges rencontrés, à ne pas refaire

- `min(uuid)` n'existe pas en Postgres. Passer par `min(id::text)::uuid`.
- `set search_path = public` **exclut le schéma des extensions**. Une fonction `SECURITY DEFINER` n'y trouve pas `gen_random_bytes`. Ne pas élargir le chemin — c'est lui qui protège la fonction — mais supprimer la dépendance.
- Un `.gitignore` avec `.env*.local` laisse passer `.env`, `.env.development` et `.env.production`.
- `rsync --delete` sans exclusions emporte `.env.local`. Utiliser `./outils/maj.sh`.
- Les variables `NEXT_PUBLIC_` sont inscrites **à la construction** : les ajouter dans Vercel ne suffit pas, il faut redéployer.
- Une constante persistée dont le **sens** change doit faire changer la clé de stockage. Sinon une ancienne valeur relue par la nouvelle formule produit des chiffres absurdes sans erreur.
- Une source de données résolue en différé doit **bloquer l'écriture** le temps d'être connue, sinon la donnée part au mauvais endroit sans le moindre signe.

---

## Migrations

À exécuter dans l'ordre, une seule fois chacune.

| Fichier | Rôle |
|---|---|
| `0001_fondations.sql` | tables, permissions, fonctions |
| `0002_comptes_pseudo.sql` | comptes par pseudo, unicité |
| `0003_graines.sql` | graines partagées, opérations atomiques |
| `0004_code_invitation.sql` | correctif du code d'invitation |
| `0005_objectifs.sql` | cible génétique des objectifs |
| `0006_suppression_compte.sql` | suppression de compte, transmission de ferme |

Réglage manuel dans Supabase : Authentication → Sign In / Providers → Email. Activer le fournisseur et les inscriptions, **désactiver « Confirm email »**.
