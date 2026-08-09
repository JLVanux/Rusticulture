# Icônes des cultures

Trois dossiers, un par état de la culture :

```
public/icons/
├── Graine/    ce qu'on plante
├── Buisson/   ce qui pousse
└── Baie/      ce qu'on récolte
```

Les noms de fichiers sont ceux du jeu. Extension `.png` ou `.webp`, indifféremment.

| Culture | Graine | Buisson | Récolte |
|---|---|---|---|
| Chanvre | `seed-hemp` | `hemp-collectable` | `cloth` |
| Baie rouge | `seed-red-berry` | `red-berry-collectable` | `red-berry` |
| Baie jaune | `seed-yellow-berry` | `yellow-berry-collectable` | `yellow-berry` |
| Baie bleue | `seed-blue-berry` | `blue-berry-collectable` | `blue-berry` |
| Baie verte | `seed-green-berry` | `green-berry-collectable` | `green-berry` |
| Baie blanche | `seed-white-berry` | `white-berry-collectable` | `white-berry` |
| Citrouille | `seed-pumpkin` | `pumpkin-collectable` | `pumpkin` |
| Maïs | `seed-corn` | `corn-collectable` | `corn` |
| Pomme de terre | `seed-potato` | `potato-collectable` | `potato` |
| Blé | `seed-wheat` | `wheat-collectable` | `wheat` |

**Les six premières lignes sont confirmées.** Les quatre dernières — citrouille, maïs, pomme de terre, blé — suivent la même logique mais n'ont pas été vérifiées : à corriger dans `src/data/game.ts` si les fichiers du jeu portent d'autres noms.

## Ce qui se passe si un fichier manque

Une pastille de la couleur de la culture s'affiche à la place. Rien ne casse, aucun carré blanc, aucun clignotement — on peut donc les déposer une par une.

## Droits

Ces images ne sont pas fournies avec le projet : ce sont des ressources de Facepunch Studios. C'est à toi de les obtenir et de juger si leur usage te convient.
