# Icônes

> **Le dossier `public` n'est jamais livré dans l'archive, ni touché par le
> script de mise à jour.** Il t'appartient entièrement : les images du jeu, le
> favicon, tout ce que tu y mets. Les inclure revenait à les écraser à chaque
> copie — c'est arrivé, d'où cette règle.


Les images du jeu, à plat, en `.jpg`. Elles ne sont pas fournies avec le
projet : ce sont des ressources de Facepunch Studios.

## Règle de nommage — à respecter absolument

**Minuscules, sans accent, sans espace.**

Deux pièges qui ne se voient pas en développement et cassent une fois en ligne :

- **La casse.** macOS confond `Citrouille.jpg` et `citrouille.jpg`, Vercel non.
  Une icône qui s'affiche chez toi peut être introuvable en production.
- **Les accents.** macOS enregistre `blé.jpg` avec un accent décomposé, Linux
  l'attend composé. Ce sont deux noms de fichiers différents pour le système.

## Fichiers attendus

| Culture | Fichier |
|---|---|
| Chanvre | `chanvre.jpg` |
| Baie rouge | `baie-rouge.jpg` |
| Baie jaune | `baie-jaune.jpg` |
| Baie bleue | `baie-bleu.jpg` |
| Baie verte | `baie-verte.jpg` |
| Baie blanche | `baie-blanche.jpg` |
| Citrouille | `citrouille.jpg` |
| Maïs | `mais.jpg` |
| Pomme de terre | `patate.jpg` |
| Blé | `ble.jpg` |

Autres : `oeuf.jpg`, `pie-apple.jpg`, `pie-chicken.jpg`, `pie-fish.jpg`,
`pie-pork.jpg`, `pie-pumpkin.jpg`.

Les noms des fichiers sont déclarés dans `src/data/game.ts` (`icone`) et
`src/data/teas.ts`. Pour en ajouter, poser le fichier ici et renseigner son nom
au bon endroit.

## Si un fichier manque

Une pastille de la couleur de la culture s'affiche à la place. Rien ne casse,
aucun carré blanc — on peut donc les déposer une par une.
