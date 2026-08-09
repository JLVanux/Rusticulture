# Charte graphique

## D'où elle vient

Pas d'un tableau de bord SaaS. De **l'inventaire de Rust** : des cases carrées, des bordures d'un pixel, des surfaces plates, un orange qui ne sert qu'à signaler. Un joueur reconnaît ce langage avant même de lire un mot.

Cette source n'est pas un habillage. Elle dicte la structure : le site est une **grille de cases**, comme le jeu.

## Ce qui est proscrit

Ces éléments reviennent dans toute interface produite sans intention. Ils sont interdits ici, sans exception.

| Interdit | Pourquoi |
|---|---|
| `backdrop-filter`, verre dépoli | Signature immédiate du gabarit générique. Coûteux au défilement sur téléphone. |
| Halos, lueurs, `box-shadow` colorée | Le jeu n'en a aucun. L'emphase se fait par la couleur et la taille. |
| Taches floues colorées en fond | Le marqueur le plus reconnaissable de l'interface générée. |
| Texte en dégradé | Idem. Un titre se lit, il ne brille pas. |
| Coins très arrondis | Rust est anguleux. Rayon maximum : 4 px. Les cases : 2 px. |
| Capitales condensées partout | Cliché du « site de jeu ». Réservées aux étiquettes techniques. |
| Émojis dans l'interface | Une icône dessinée, ou rien. |
| Ombres portées douces | La structure vient des **traits**, pas de la profondeur. |

## Couleurs

Du béton sale et du métal oxydé. Aucune couleur froide.

| Jeton | Valeur | Usage |
|---|---|---|
| `fond` | `#141210` | Le fond de la page |
| `case` | `#1c1a17` | Une case, un panneau |
| `case-haute` | `#242019` | Case survolée ou active |
| `trait` | `#2f2a24` | Toutes les séparations |
| `trait-vif` | `#453d34` | Bordure au survol |
| `rouille` | `#ce422b` | L'accent, et lui seul |
| `braise` | `#e8683f` | Texte accentué sur fond sombre |
| `craie` | `#e8e2d8` | Texte principal, blanc cassé chaud |
| `cendre` | `#a09788` | Texte secondaire |
| `poussiere` | `#6b6358` | Texte tertiaire, étiquettes |

Les cinq couleurs de gène restent inchangées : ce sont des **données**, pas de la décoration. Ce sont les seules couleurs vives autorisées en dehors de la rouille.

## Typographie

Une seule famille de texte, une mono. Pas de troisième.

**Archivo** pour tout le texte. Titres en 800, tracking serré, **casse normale** — pas de capitales. Corps en 400.

**JetBrains Mono** pour **tous les chiffres**, les gènes, les étiquettes techniques, les durées. C'est un outil de lecture de chiffres : ils méritent leur propre voix, et la chasse fixe empêche une valeur qui change chaque seconde de faire danser la ligne.

Les étiquettes en petites capitales mono avec chasse élargie sont le seul usage de la capitale. Elles servent de repères, comme sur une fiche technique.

## La case

L'atome du site, repris du jeu. Un carré, bordure d'un pixel, fond légèrement plus sombre que son support.

Elle sert partout : une lettre de gène, une icône de plante, un emplacement de bac, une statistique. C'est ce qui donne son unité au site sans qu'aucun effet ne soit nécessaire.

## Structure

Les sections sont annoncées par une **étiquette et un filet**, comme sur un plan technique — pas par des cartes flottantes. Le trait porte la structure ; la profondeur n'existe pas.

## Mobile d'abord

Le site s'utilise sur un téléphone posé à côté du PC, d'une seule main, dans une pièce sombre.

- Navigation en bas, sous le pouce, avec la marge de sécurité iPhone
- Cibles d'au moins 44 px, champs en 16 px sinon iOS zoome
- Échelle typographique fluide, pas de saut aux points de rupture
- Rangées défilantes plutôt que retours à la ligne
