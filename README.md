# RustiCulture — les outils d'agriculture de Rust

Site d'aide en français pour l'agriculture dans Rust : génétique, croisement, rendement, thés, tartes, poulailler, minuteurs, et un calculateur de coût de raid.

Next.js 16 (App Router, Turbopack) + React 19 + TypeScript + Tailwind 3. Aucune base de données, aucun compte : tout est stocké dans le navigateur du visiteur.

## Lancer en local

```bash
npm install
npm run dev
```

Puis http://localhost:3000

Au premier lancement, Next affiche un message disant qu'il a reconfiguré `tsconfig.json` (`jsx` passé à `react-jsx`, ajout de `.next/dev/types` aux includes). C'est normal et sans conséquence — le fichier livré contient déjà ces valeurs, le message ne devrait donc plus réapparaître ensuite.

## Déployer sur Vercel

Pousse le dossier sur un dépôt GitHub, puis « Import Project » sur Vercel. Aucune variable d'environnement, aucun réglage : Vercel détecte Next.js tout seul. Le plan Hobby est gratuit et largement suffisant.

## Ce qu'il y a dans le site

| Page | Ce qu'elle fait |
| --- | --- |
| `/` | Les règles de croisement expliquées, la légende des gènes, les génomes à viser |
| `/scanner` | Partage d'écran + lecture automatique des gènes (OCR restreint aux 5 lettres) |
| `/genetique` | Banque de graines : saisie case par case, import par copier-coller, tri par qualité |
| `/bac` | **Assistant guidé** en 3 étapes : tes graines → ta cible → le plan, avec justification case par case |
| `/bac-manuel` | Éditeur libre : place les 9 plants toi-même, vois la probabilité et la dérive de chacun |
| `/rendement` | Durée de cycle stade par stade, récolte par plant / bac / heure, comparatif des génomes |
| `/thes` | Calcul inverse : des thés voulus vers les baies, les plants, les bacs et le temps. Et le sens direct |
| `/tartes` | Combo tarte à l'ours + thé de récolte, chiffré par nœud. Fiche de toutes les tartes |
| `/poulailler` | Cadence de ponte, saturation de la case de sortie, tartes possibles par heure |
| `/minuteurs` | Décomptes persistants avec notification à l'ouverture de la fenêtre de clonage et à la récolte |
| `/raid` | Coût en explosifs et en soufre, planificateur de raid, conversion en nœuds à miner |
| `/reglages` | Calibrage du modèle sur des mesures faites en jeu, export JSON, purge des données |

## Où sont les données

Tout est dans `src/data/`, séparé du code pour pouvoir être mis à jour à chaque patch sans toucher aux composants :

- `game.ts` — gènes et leurs poids, plantes, stades de vie, baies
- `teas.ts` — recettes de thé, paliers, tartes
- `raid.ts` — PV des cibles, coûts en explosifs, soufre

Le modèle de croissance et de rendement est dans `src/lib/model.ts`, avec ses coefficients regroupés dans `CONSTANTES_DEFAUT`. Ces coefficients sont modifiables depuis `/reglages`, par curseur ou par calibrage assisté : on mesure un cycle en jeu (pour la vitesse) ou une récolte (pour le rendement), et le coefficient correspondant est résolu par inversion de la formule.

## Fiabilité des données

**Solide** — les poids de croisement (0,6 pour G/Y/H contre 1,0 pour W/X), la règle du dépassement strict, les recettes des thés principaux, les conversions 4 pour 1 entre paliers, les coûts de raid.

**Approché** — les durées de pousse, la découpe en stades et les rendements par plant. Facepunch ne publie pas ses formules, et les sources communautaires se contredisent nettement : certaines listent 6 stades, d'autres 8 ; les temps annoncés pour un même génome vont du simple au double. Le modèle retient une décroissance géométrique d'environ 17 % par gène G (la seule courbe par-gène publiée qu'on ait trouvée) sur une base d'environ 3 h. La page Réglages sert précisément à corriger ça à partir de mesures réelles.

**Corrigé en cours de route** — une première version du modèle appliquait un gain de vitesse linéaire (`temps = base / (1 + 0,72·nG)`), ce qui surestimait massivement l'effet des gènes G. Et l'interface présentait le stade Croisement comme une fenêtre de clonage qui se referme définitivement ; la majorité des sources dit au contraire que le bouturage est possible du stade Jeune pousse jusqu'au dépérissement. Le stade Croisement est le moment où les gènes sont *recalculés*, pas la seule occasion de bouturer.

**À vérifier en jeu** — les recettes des thés réchauffant, rafraîchissant, de récolte et de qualité d'artisanat divergent entre les sources. Elles sont signalées dans l'interface par un encadré orange.

## L'assistant `/bac`

C'est la page centrale du site, structurée en trois étapes sur une seule vue :

1. **Tes graines** — saisie inline (coller ou scanner), pas d'aller-retour vers une autre page.
2. **Ta cible** — présentée par objectif de jeu ("le meilleur compromis", "rendement maximum") plutôt que par code génétique.
3. **Ton plan** — un verdict en une phrase (« C'est garanti » / « 1 chance sur 4 » / « Pas en une génération »), la disposition physique du bac, la justification case par case, et la marche à suivre en jeu.

La justification vient de `expliquerPlant` : pour chaque case, on reconstitue le vote (qui pousse quoi, avec quel poids) et on classe le résultat en cinq statuts — `acquis`, `gagne`, `egalite`, `perdu`, `menace`. Le statut `menace` est celui qu'aucun autre outil ne montre : la case est déjà bonne sur le plant central, mais les voisines vont la lui prendre. Quand une case échoue, `manque` indique combien de donneuses supplémentaires portant le gène cible il faudrait.

Quand la cible est hors de portée, `optimiserProgres` cherche la disposition qui maximise le score attendu et renvoie le génome intermédiaire à viser d'abord. La réponse n'est jamais « impossible », c'est « voilà par où passer ».

## Les stades de croissance

Les sept noms — Plantule, Jeune pousse, Croisement, Mature, Fructification, Mûr, Mourant — sont confirmés par six sources concordantes. Les durées relatives sont calées sur la seule série de mesures publiée qu'on ait trouvée (Jeune pousse finissant à 31 min, Croisement long de 2 min, Mature long de 42 min). Avec le modèle actuel, un GGGYYY place son Croisement à 28 min pour une durée de 2 min : cohérent avec la mesure.

`minutesJusquMur` est le temps pour atteindre la récolte. Mûr et Mourant sont des **fenêtres après** ce point, pas des étapes de croissance — les cinq premiers stades totalisent 1,0.

### Piège de migration à connaître

`facteurG` a changé de sens entre deux versions : gain de vitesse linéaire (0,72 = « +72 % ») puis réduction géométrique (0,17 = « −17 % du temps restant par G »). Une sauvegarde locale d'avant le changement, relue par la nouvelle formule, produisait des cycles de **quatre minutes** au lieu de cent trois.

D'où le versionnage dans `useConstantes` : la clé de stockage porte un numéro de version, et une valeur hors bornes déclenche un retour aux valeurs par défaut. **Toute modification du sens d'une constante persistée doit incrémenter ce numéro.**

## Dérive génétique

`calculerDerive` répond à la question que les autres outils ignorent : **qu'est-ce que ce plant risque de perdre ?** Tous les plants d'un bac se réécrivent mutuellement, donc une bonne graine placée à côté de déchets en ressort abîmée. Un GGGYYY parfait entouré de quatre XXXXXX est détruit à 100 % — le poids 1,0 des rouges écrase le 0,6 des verts.

Les six cases étant indépendantes, on convole leurs distributions de variation de score : le résultat est exact, pas simulé. La page `/bac` affiche pour chaque emplacement sa chance d'atteindre la cible et sa variation de score attendue.

**Note sur les boutures.** Une bouture copie les gènes du parent sans tirage, c'est acquis. Mais une fois replantée, les sources divergent : certaines la disent verrouillée à vie, d'autres affirment qu'elle se recroise comme n'importe quel plant. Le site retient la seconde version, la plus prudente.

## Moteur de croisement

`src/lib/crossbreed.ts` calcule les probabilités exactes, case par case, plutôt que de simuler des tirages :

1. Chaque case de gène est résolue indépendamment des cinq autres.
2. On additionne le poids des voisins par type de gène.
3. Le total le plus haut l'emporte, mais seulement s'il dépasse strictement le poids du gène déjà en place.
4. Égalité entre donneurs : tirage équiprobable.

L'optimiseur exploite le fait que seul le plant central touche les huit autres, et que l'ordre des donneurs autour de lui n'a aucune importance. Le problème se ramène au choix d'un plant central plus un multiensemble de donneurs.

Deux pièges qui rendent la recherche gloutonne naïve **inopérante**, et qu'il faut contourner :

1. **Le paysage est plat.** La probabilité d'atteindre la cible vaut zéro tant qu'une seule des six cases est fausse. Une montée de gradient sur cette valeur ne démarre jamais. On grimpe donc sur `Σ log(p_case + ε)`, qui donne une pente case par case, et on ne calcule la vraie probabilité qu'à la fin.
2. **Le pas de un est toujours perdant.** Il faut deux donneurs verts pour déloger un rouge (1,2 > 1,0), et un donneur ajouté seul dégrade presque toujours une case déjà correcte. La construction teste donc l'ajout d'un donneur **et** l'ajout de deux d'un coup.

Sans ces deux corrections, l'optimiseur renvoyait 0 % sur des banques parfaitement solubles. Avec, la même banque passe à 100 %.

## Jeux de graines pour tester

À coller dans « Coller une liste » sur `/genetique`, cible GGGYYY :

```
# 100 % — banque de deuxième génération
GGGYYW GGXYYY WGGYYY GXGYYY GGGWYY GGGYXY XGGYYW GGWYYY GGGYWY GWGXYY

# 50 % — une égalité, donc un pile ou face
YGYGYW HYGYWG WYGWYG XWYYGH WGGYGY HGGHXX GYGXGY GWHGYY XYGGGG GYGYYX YYGGWH HYXWYG

# 0 % — graines sauvages brutes, trois rouges chacune : impossible en une génération
XWYGYH GHYWXG WXGYHY YHWXGG GXWHYY HYGXWY WGHYXG XGYWHY GWXYHG YXHGWY
```

## Le scanner d'écran

`/scanner` utilise `getDisplayMedia` pour récupérer un flux de la fenêtre de Rust. Deux méthodes de lecture, dans `src/lib/scan.ts` :

**Reconnaissance de texte (Tesseract.js).** L'OCR est bridé à un alphabet de cinq caractères (`tessedit_char_whitelist: "GYHWX"`) et au mode de segmentation ligne unique (`tessedit_pageseg_mode: 7`) ou bloc (6). L'image est agrandie 4×, désaturée et binarisée sur deux variantes (texte clair et texte sombre) ; on garde celle qui produit un génome complet avec la meilleure confiance. Le modèle (~3 Mo) se télécharge au premier scan puis reste en cache.

**Couleur.** Chaque gène s'affiche dans une teinte distincte en jeu. La zone est découpée en six colonnes ; pour chacune on ne garde que le quart de pixels les plus saturés et lumineux (pour ignorer le fond) et on en tire une signature `[chromaticité rouge, chromaticité verte, saturation]`. La lecture est un plus-proche-voisin dans cet espace. Déterministe et instantané.

La palette n'est pas codée en dur : elle s'apprend. On ne peut pas connaître de l'extérieur la palette exacte du jeu, et elle peut changer d'un patch à l'autre — l'utilisateur affiche une graine dont il connaît les gènes, les saisit, et le site retient les couleurs. Tant que les cinq lettres ne sont pas apprises, le site le signale, parce qu'une lettre inconnue produirait une substitution silencieuse.

Rien ne sort du navigateur : l'analyse est faite sur la machine.

## Planification sur plusieurs générations

`planifierRoutes` (dans `crossbreed.ts`) fait une recherche en faisceau : à chaque génération elle teste si la cible est atteignable directement, puis explore les meilleurs ponts possibles, en ajoutant à la banque simulée trois boutures du pont obtenu. Elle retient la **meilleure route pour chaque nombre de générations** plutôt qu'une seule « meilleure », parce que l'arbitrage appartient à l'utilisateur.

Métrique de comparaison : les **cycles de pousse attendus**, soit la somme des `1/p` de chaque étape — une étape à 50 % coûte deux cycles en moyenne puisqu'on la retente. Ce choix produit un résultat contre-intuitif et instructif : sur une banque de test, un coup unique à 50 % et une route en deux étapes à 100 % coûtent tous deux 2,0 cycles attendus. Même temps moyen, mais l'une est certaine et l'autre non — d'où le départage sur `pireEtape`.

Quand aucune route n'existe, `diagnostiquerBanque` dit **pourquoi** : pour chaque case, combien de graines portent le gène visé. En dessous de deux, c'est mathématiquement bloqué (il faut deux verts pour déloger un rouge), et aucune patience n'y changera rien.

Budget : environ 250 ms pour cinq générations avec un faisceau de 5. Recalculé uniquement quand la banque ou la cible changent.

## Stockage local

Toutes les données de l'utilisateur (banque de graines, minuteurs, coefficients, conditions, zone de scan, palette apprise) vivent dans `localStorage` sous le préfixe `rusticulture:`. Rien ne part sur un serveur.

Deux mécanismes de sécurité, tous deux nés d'un bug réel :

- **Versionnage des coefficients.** `facteurG` a changé de sens entre deux versions du modèle ; relire l'ancienne valeur avec la nouvelle formule produisait des cycles de quatre minutes. La clé porte désormais un numéro de version, et une valeur hors bornes déclenche un retour aux valeurs par défaut. Toute modification du sens d'une constante persistée doit incrémenter ce numéro.
- **Migration de préfixe.** Le site s'appelait auparavant « La Serre » et stockait sous `rustfarm:`. `migrerAncienStockage` déplace les anciennes clés au premier chargement, sans jamais écraser une clé déjà présente sous le nouveau nom. Renommer un préfixe sans migration revient à effacer les données de tous les utilisateurs existants.

## Navigation

- **≥ 1024 px** — colonne latérale fixe, les dix pages groupées par thème.
- **< 1024 px** — en-tête collant avec un bouton Menu qui ouvre un tiroir donnant accès aux **dix** pages. L'en-tête reste collant parce qu'il est le seul accès au menu et que les pages sont longues.

Le tiroir se ferme à la navigation, à l'Échap et au clic sur le fond ; le défilement du fond est bloqué pendant son ouverture.

Attention en ajoutant une page : il faut l'inscrire dans `GROUPES`, sinon elle devient inaccessible sur mobile. C'est exactement ce qui était arrivé à six pages — la barre du bas n'en affiche que quatre et rien d'autre ne menait aux autres.

## Permaliens

`src/lib/partage.ts`. Tout l'état tient dans le **fragment** d'URL (`#`) plutôt que la requête (`?`) : le fragment n'est jamais transmis au serveur, ne perturbe pas le rendu statique de Next, et se met à jour sans rechargement via `history.replaceState`.

Format volontairement lisible plutôt que compressé, pour qu'un lien reste compréhensible et corrigeable à la main :

```
/bac#p=chanvre&c=GGGYYY&g=GGGYYWx2,GGXYYY,WGGYYY
```

À l'ouverture d'un lien partagé, les graines reçues ne sont **pas** écrites en banque : elles sont affichées avec un bouton d'import explicite, pour ne pas polluer la banque de la personne sans son accord.

## Idées pour la suite

- Version anglaise
- Planificateur d'électricité et d'eau (plafonniers, arroseurs, pompes, panneaux)
- Référencement, une fois l'outil validé à l'usage
