#!/bin/bash
set -e

# Read current version from package.json
CURRENT=$(node -p "require('./package.json').version")
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT"

echo "Current version: $CURRENT"
echo ""
echo "  1) patch  → $MAJOR.$MINOR.$((PATCH + 1))"
echo "  2) minor  → $MAJOR.$((MINOR + 1)).0"
echo "  3) major  → $((MAJOR + 1)).0.0"
echo ""
read -rp "Bump type [1/2/3]: " CHOICE

case "$CHOICE" in
  1) NEW="$MAJOR.$MINOR.$((PATCH + 1))" ;;
  2) NEW="$MAJOR.$((MINOR + 1)).0" ;;
  3) NEW="$((MAJOR + 1)).0.0" ;;
  *) echo "Invalid choice"; exit 1 ;;
esac

echo ""
read -rp "Release v$NEW? [y/N] " CONFIRM
if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
  echo "Cancelled."
  exit 0
fi

# Update package.json version
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));
pkg.version = '$NEW';
fs.writeFileSync('./package.json', JSON.stringify(pkg, null, 2) + '\n');
"

# Commit and tag
git add package.json
git commit -m "release v$NEW"
git tag "v$NEW"

# Push commit + tag (triggers deploy workflow)
git push && git push origin "v$NEW"

echo ""
echo "Released v$NEW"
