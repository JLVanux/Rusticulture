#!/usr/bin/env bash
#
# Remplace le contenu du dépôt par une archive décompressée, sans toucher à ce
# qui est propre à ta machine.
#
#   ./outils/maj.sh ~/Downloads/rusticulture
#
# `--delete` est nécessaire pour que les fichiers supprimés dans l'archive
# disparaissent aussi du dépôt. C'est aussi ce qui rend les exclusions
# indispensables : sans elles, il emporterait .env.local, node_modules — et
# `public/icons`, dont le contenu n'est jamais livré avec l'archive puisque ce
# sont des ressources du jeu. Retirer cette exclusion effacerait les icônes à
# chaque mise à jour, sans le moindre message.

set -euo pipefail

SOURCE="${1:-}"

if [[ -z "$SOURCE" ]]; then
  echo "Usage : ./outils/maj.sh chemin/vers/archive/decompressee" >&2
  exit 1
fi

if [[ ! -d "$SOURCE" ]]; then
  echo "Dossier introuvable : $SOURCE" >&2
  exit 1
fi

if [[ ! -f "$SOURCE/package.json" ]]; then
  echo "Ce dossier ne ressemble pas au projet (package.json absent) : $SOURCE" >&2
  exit 1
fi

if [[ ! -d .git ]]; then
  echo "À lancer depuis la racine du dépôt (.git introuvable)." >&2
  exit 1
fi

rsync -a --delete \
  --exclude '.git' \
  --exclude '.env' \
  --exclude '.env.*' \
  --exclude 'node_modules' \
  --exclude '.next' \
  --exclude '.vercel' \
  --exclude '.DS_Store' \
  --exclude 'public/icons' \
  "${SOURCE%/}/" .

echo "Fichiers à jour. Ensuite :"
echo "  npm install && npm run build"
echo "  git add -A && git commit -F COMMIT.txt && git push"
