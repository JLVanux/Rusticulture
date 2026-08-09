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

### Recommandations — « Que dois-je faire maintenant ? »
- Moteur à règles sur les données réelles : chaque proposition affiche **le fait qui la déclenche**. Sans lui, le site jouerait les oracles et on ne pourrait ni le contredire ni le corriger.
- Priorité : **ce qui se referme passe devant ce qui attend**. Une fenêtre de bouturage manquée ne se rattrape pas ; une graine à remplacer attendra demain.
- Une action principale mise en avant, les autres repliées.
- Règles : bouturage, récolte prête, plant qui dépérit, configuration manquante, **remplacement de graine avec gain chiffré** par le même moteur que la page Rendement, objectif à portée, conditions dégradées, décrochage du réel sur l'estimé.
- Seuils : un remplacement sous 5 % de gain est ignoré, une graine en un seul exemplaire n'est jamais proposée à la plantation, le décrochage attend 6 h de wipe et 3 récoltes.

### Planificateur de wipe
- Clôture, démarrage, réouverture, archives consultables.
- Clôture et démarrage passent par des fonctions en base : les deux opérations doivent être **atomiques**, sinon un échec au milieu laisse la ferme sans wipe actif, ou en violation de l'index unique.
- Fonctions en **SECURITY INVOKER**, donc soumises aux politiques : seul le propriétaire gère les wipes. Ne pas les passer en `security definer`.
- Rouvrir refuse s'il existe déjà un wipe actif, plutôt que d'en clôturer un dans le dos de l'utilisateur.
- **Le résumé n'est jamais figé** : recalculé à chaque affichage depuis les faits du wipe. Rouvrir et ajouter une récolte oubliée le met à jour tout seul.
- Limite : le résumé ne compte que les objectifs libres cochés. La progression des objectifs de production et de génétique se recalcule dans le contexte courant, impossible à rejouer sur un wipe clos.

### Élevage dans la ferme
- Poulaillers, poules et bonheur déclarés au niveau du wipe, une seule ligne par wipe.
- Les œufs entrent dans la production estimée du tableau de bord, aux côtés des plantes.
- **Toute nouvelle table du wipe doit refaire ses quatre politiques explicitement.** La boucle de 0001 ne couvre que les tables existantes à l'époque ; oublier la sécurité au niveau des lignes rendrait la table lisible par tout le monde.
- **Aucune recommandation sur la saturation des poulaillers.** Elle survient au bout d'une dizaine de minutes par construction, la règle se déclencherait donc à chaque visite. Un conseil qui s'affiche toujours cesse d'être lu et décrédibilise les autres. L'information reste sur le tableau de bord, où elle est utile sans être une alerte.

### Évolution dans le temps
- Production par jour de wipe, barres du jour et courbe de cumul, sur la page Statistiques.
- **Dessiné à la main en SVG**, pas de bibliothèque de graphiques : ce sont des barres et une courbe, une dépendance de cent kilo-octets se paierait au chargement de chaque page.
- Les jours sont comptés en **jours de wipe**, pas en dates : « jour 4 » parle plus qu'un 12 août, et un jour sans récolte reste visible à zéro au lieu de disparaître.
- Comparaison **sept derniers jours contre les sept précédents** : la seule honnête tant qu'il n'y a pas d'autres fermes. Exige au moins huit jours de wipe, sinon la référence est vide.
- Tableau des chiffres sous le graphique : une image de données sans équivalent textuel n'est pas consultable au lecteur d'écran.

### Notifications Discord
- Un **webhook par ferme**, créé par le propriétaire dans son propre salon. Rien à installer, aucune application Discord.
- L'URL vit dans la table `integrations`, **sécurité activée et aucune politique** : personne ne la lit depuis le navigateur, pas même le propriétaire. Seule la clé de service, côté serveur, y accède. Une table séparée plutôt qu'une colonne sur `fermes` — masquer une colonne oblige à redonner le droit de lecture colonne par colonne, et chaque colonne ajoutée plus tard deviendrait invisible sans qu'on s'en aperçoive.
- Filtre sur la forme de l'URL : refuse tout ce qui n'est pas un domaine Discord, pour qu'un copier-coller malheureux n'envoie pas les notifications d'une équipe vers un serveur inconnu.
- **Première route serveur du projet** : `/api/notifications`. Authentification avant toute autre chose, y compris avant la vérification de la configuration — un appelant non autorisé ne doit rien apprendre.
- **Les tâches planifiées de Vercel sont inutilisables ici** : le plan Hobby les limite à une exécution par jour. On passe par GitHub Actions, toutes les dix minutes. Effet de bord utile : ça maintient Supabase éveillé.
- Anti-doublon par clé primaire composite dans `notifications_envoyees`, pas par une fenêtre de temps : deux exécutions concurrentes ne peuvent pas envoyer deux fois.
- Un webhook supprimé côté Discord renvoie 404 : l'intégration est désactivée plutôt que réessayée indéfiniment.
- Deux messages seulement, les deux qui demandent une action. Le bruit est ce qui fait retirer un bot d'un serveur.
- **Les messages disent quoi faire, pas ce que le jeu a calculé.** « Les gènes viennent d'être recalculés » est exact mais ne dit rien à qui n'a pas la mécanique en tête ; « Va voir ton chanvre, le croisement est fait » se comprend sans explication.
- `Plante.genre` porte le genre grammatical : sans lui, la moitié des plantes produisaient « ton citrouille » à chaque message.

### Badges
- Tous personnels et dérivés des faits : aucun ne dépend des autres joueurs. « Top 10 » viendra avec le classement.
- Volontairement peu nombreux et lents. Un badge par geste ne récompense rien.

### Charte graphique — voir CHARTE.md
Les trois tentatives précédentes changeaient les couleurs sans changer le **langage** : fond sombre, verre dépoli, halo, coins arrondis, capitales condensées. C'est la signature de toute interface produite sans intention, et elle survit à n'importe quel changement de palette.

La charte part donc d'une source précise : **l'inventaire de Rust**. Des cases carrées, des bordures d'un pixel, des surfaces plates, un orange qui ne sert qu'à signaler. Un joueur reconnaît ce langage avant de lire un mot.

`CHARTE.md` liste les jetons et surtout **les interdits**, avec leur raison : pas de `backdrop-filter`, pas de halo, pas de taches floues en fond, pas de texte en dégradé, rayon maximum 4 px, pas de capitales condensées en dehors des étiquettes, pas d'émoji dans l'interface, pas d'ombre portée douce.

- **La case** est l'atome : lettre de gène, icône, emplacement de bac, statistique. C'est elle qui donne son unité au site, sans effet.
- **Les sections s'annoncent par une étiquette et un filet**, comme sur un plan technique, pas par des cartes flottantes. La structure vient des traits ; la profondeur n'existe pas.
- **Archivo** remplace Barlow Condensed. Titres en 800, casse normale — les capitales condensées partout étaient le cliché du « site de jeu ».
- **JetBrains Mono pour tous les chiffres.** C'est un outil de lecture de chiffres.
- Les anciens noms de jetons sont conservés comme alias : les réécrire dans vingt et une pages n'aurait rien changé au rendu et aurait multiplié les risques.

Mobile d'abord, inchangé : barre sous le pouce avec marge iPhone, cibles de 44 px, champs de 16 px, échelle fluide, rangées défilantes.

### Les trois états d'une culture
- **`public/icons` est exclu du script de mise à jour.** Ces fichiers ne sont jamais livrés avec l'archive : sans l'exclusion, `rsync --delete` les effaçait à chaque mise à jour, silencieusement.
- Une culture n'est pas une chose mais une chaîne : **graine → buisson → produit**, chacun avec son nom exact et son icône. C'est la confusion la plus fréquente chez un débutant, d'autant que les noms ne se déduisent pas — la baie bleue donne des « Myrtilles », le chanvre donne du « Tissu ».
- `Plante.etats` porte les trois noms et les trois noms de fichiers.
- `IconePlante` lit `public/icons/{Graine,Buisson,Baie}/<fichier>.png`, avec repli sur `.webp` puis sur une pastille colorée. Les images ne sont pas fournies : ressources de Facepunch.
- `ChaineCulture` affiche la progression complète, à la manière des fiches d'objet de RustHelp.
- **Les noms de fichiers des quatre cultures alimentaires sont déduits du motif, pas vérifiés** : citrouille, maïs, pomme de terre, blé. À corriger dans `src/data/game.ts` si besoin.

### Navigation
- Tiroir mobile donnant accès aux dix-huit pages. Colonne fixe au-dessus de 1024 px.

---

## Reste à faire

Dans l'ordre recommandé.

### 1. Classement entre amis
**Décision déjà prise : entre amis d'abord, pas de classement mondial.** Conséquence d'architecture : il faut une notion de **groupe de fermes**, rejointes par code. Le classement se calcule alors à la demande sur quelques fermes, sans tâche planifiée ni table de scores.

Classer sur des **ratios** — rendement réel, production par grand bac — et jamais sur des totaux bruts, qui récompensent le temps de jeu et la taille d'équipe.

À ne construire qu'une fois qu'il y a du monde. « Toi 1 840, moyenne 1 420 » calculé sur trois fermes, c'est du bruit présenté comme une statistique.

### 2. Comparaison avec les autres
Même condition que le classement. En attendant, la comparaison utile est **avec soi-même** : cette semaine contre la semaine dernière.

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
- **Discord : webhook par ferme d'abord, bot ensuite.** Un webhook ne s'installe pas, il se colle ; un bot s'installe via un lien d'invitation. Les deux se cumulent.

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
| `0007_wipes.sql` | clôture, démarrage et réouverture de wipe |
| `0008_elevage.sql` | élevage de la ferme |
| `0009_discord.sql` | webhook Discord et journal des envois |

Réglage manuel dans Supabase : Authentication → Sign In / Providers → Email. Activer le fournisseur et les inscriptions, **désactiver « Confirm email »**.
