#!/bin/sh
# Builds both targets from the same sources. tiles.js is generated — run
# tools/make-tiles.js after editing content.js.
#   index.html  — for publishing as a Claude artifact (the host supplies <head>)
#   docs/       — a standalone static site with offline support, served by GitHub Pages
set -e
cd "$(dirname "$0")"

{ cat _head.html; echo '<script>'; cat content.js; cat tiles.js; cat _legacy-ids.js; echo '</script>'
  echo '<script>'; cat _game.js; echo '</script>'; } > index.html

mkdir -p docs
{ cat _standalone-head.html; cat index.html; cat _standalone-foot.html; } > docs/index.html
sed "s/__STAMP__/$(date +%Y%m%d%H%M%S)/" _sw.js > docs/sw.js

echo "index.html     $(wc -c < index.html | tr -d ' ') bytes"
echo "docs/index.html $(wc -c < docs/index.html | tr -d ' ') bytes"
