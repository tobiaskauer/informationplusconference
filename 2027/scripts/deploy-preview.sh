#!/usr/bin/env bash
# Build the 2027 site in preview mode and sync it to a private server over SSH.
#
# Only this edition is uploaded: the historical archives (2016–2025) are added
# solely by the GitHub Pages workflow. Preview builds are hidden from search
# engines (noindex on every page + a blocking robots.txt) and never include the
# local-only Tina editor in admin/.
#
# Configure the destination in .env.preview (see .env.preview.example).
set -euo pipefail

cd "$(dirname "$0")/.."

if [[ ! -f .env.preview ]]; then
  echo "Missing .env.preview — copy .env.preview.example and fill it in." >&2
  exit 1
fi
set -a
# shellcheck disable=SC1091
source .env.preview
set +a

: "${PREVIEW_SSH:?Set PREVIEW_SSH (user@host) in .env.preview}"
: "${PREVIEW_PATH:?Set PREVIEW_PATH (remote folder) in .env.preview}"

PUBLIC_PREVIEW=true npm run build

printf 'User-agent: *\nDisallow: /\n' > dist/robots.txt

# Optional PREVIEW_SSH_KEY picks a specific key (e.g. when ~/.ssh/config doesn't).
SSH_CMD=(ssh)
if [[ -n "${PREVIEW_SSH_KEY:-}" ]]; then
  SSH_CMD+=(-i "${PREVIEW_SSH_KEY/#\~/$HOME}" -o IdentitiesOnly=yes)
fi

rsync -avz --delete \
  -e "${SSH_CMD[*]}" \
  --exclude 'admin/' \
  --exclude 'CNAME' \
  dist/ "${PREVIEW_SSH}:${PREVIEW_PATH%/}/"

echo
echo "Preview published${PREVIEW_SITE:+ at ${PREVIEW_SITE}${PREVIEW_BASE:-/}}"
