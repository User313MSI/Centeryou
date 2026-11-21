#!/usr/bin/env bash
# ============================================================
# Scan de secrets BLOQUANT (M-13 Verrou) — CI Centeryou
#
# Cherche à la main (grep -E, zéro dépendance) les motifs de clés courantes
# dans le code source de l'app et les workflows. Toute occurrence = échec
# de la CI (exit 1). Les faux positifs des tests (clés factices courtes,
# ex. sk_test_faux_pour_test) ne correspondent pas aux motifs : les vrais
# secrets ont des suites longues sans séparateur.
#
# Périmètre : apps/centeryou (src, public, scripts, tests, configs racine)
# + .github — hors node_modules, .next, docs (journaux d'audit), *.md,
# package-lock.json.
# ============================================================
set -u

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT" || exit 2

# Motifs de clés/littéraux secrets (valeurs longues, sans séparateur).
PATTERNS=(
  'sk_(live|test)_[A-Za-z0-9]{16,}'
  'rk_(live|test)_[A-Za-z0-9]{16,}'
  'whsec_[A-Za-z0-9]{16,}'
  'pk_(live|test)_[A-Za-z0-9]{16,}'
  'xox[baprs]-[A-Za-z0-9-]{10,}'
  'ghp_[A-Za-z0-9]{20,}'
  'github_pat_[A-Za-z0-9_]{22,}'
  'glpat-[A-Za-z0-9_-]{20,}'
  'AIza[0-9A-Za-z_-]{35}'
  'eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}'
  '-----BEGIN [A-Z ]*PRIVATE KEY-----'
  'xi-api-key["'"'"']?[[:space:]]*[:=][[:space:]]*["'"'"'][A-Za-z0-9]{16,}["'"'"']'
)

# Affectation d'une variable d'environnement sensible à une VALEUR littérale
# entre guillemets (ex. STRIPE_SECRET_KEY: "sk_live_…") dans le code.
ENV_PATTERN='(STRIPE_SECRET_KEY|STRIPE_WEBHOOK_SECRET|ELEVENLABS_API_KEY|NEXT_ELEVENLABS_API_KEY|SUPABASE_SERVICE_ROLE_KEY|NEXT_PUBLIC_SUPABASE_ANON_KEY|KV_REST_API_TOKEN|CENTERYOU_URL)["'"'"']?[[:space:]]*[:=][[:space:]]*["'"'"'][^"'"'"' ]{8,}["'"'"']'

SCOPE=(
  apps/centeryou/src
  apps/centeryou/public
  apps/centeryou/scripts
  apps/centeryou/tests
  apps/centeryou/audit
  apps/centeryou/.env.local.example
  apps/centeryou/next.config.mjs
  apps/centeryou/postcss.config.mjs
  apps/centeryou/tailwind.config.ts
  apps/centeryou/vitest.config.ts
  apps/centeryou/vitest.audit.config.mts
  apps/centeryou/next-env.d.ts
  apps/centeryou/tsconfig.json
  apps/centeryou/package.json
  .github
)

EXCLUDES=(
  --exclude-dir=node_modules
  --exclude-dir=.next
  --exclude-dir=.test-build
  --exclude-dir=docs
  --exclude=package-lock.json
  --exclude='*.md'
  --exclude='*.map'
  --exclude='tsconfig.tsbuildinfo'
  --exclude='scan-secrets.sh'
)

// Vibe Work (21/11) : ne garder que les chemins existants — un chemin absent
// faisait sortir grep en erreur technique (rc=2) et échouait la CI sans
// aucun secret trouvé.
_existing=()
for p in "${SCOPE[@]}"; do
  [ -e "$p" ] && _existing+=("$p")
done
SCOPE=("${_existing[@]}")
if [ ${#SCOPE[@]} -eq 0 ]; then
  echo "::error::Scan de secrets : périmètre vide (aucun chemin n'existe)"
  exit 2
fi

fail=0

report() {
  echo "::error::SECRETS — $1 (motif: $2) — corrige avant merge (M-13 Verrou)"
  fail=1
}

for pattern in "${PATTERNS[@]}"; do
  # grep : 0 = trouvé, 1 = rien, 2 = erreur technique
  out="$(grep -rInE -e "$pattern" "${EXCLUDES[@]}" -- "${SCOPE[@]}" 2>/dev/null)"
  rc=$?
  if [ $rc -eq 0 ]; then
    echo "$out"
    report "occurrence(s) trouvée(s)" "$pattern"
  elif [ $rc -ne 1 ]; then
    echo "::error::Scan de secrets : erreur technique grep (rc=$rc) sur le motif $pattern"
    exit 2
  fi
done

# Les assignments process.env.X = '…' (fixtures de tests) sont filtrés :
# les vrais secrets sont déjà captés par les motifs de préfixe ci-dessus.
raw_out="$(grep -rInE -e "$ENV_PATTERN" "${EXCLUDES[@]}" -- "${SCOPE[@]}" 2>/dev/null)"
rc=$?
if [ $rc -eq 0 ]; then
  out="$(printf '%s
' "$raw_out" | grep -v 'process\.env\.' || true)"
  if [ -n "$out" ]; then
    echo "$out"
    report "valeur littérale de variable sensible" "$ENV_PATTERN"
  fi
elif [ $rc -ne 1 ]; then
  echo "::error::Scan de secrets : erreur technique grep (rc=$rc) sur le motif env"
  exit 2
fi

if [ $fail -ne 0 ]; then
  echo "ÉCHEC du scan de secrets : aucun secret ne doit être commité (voir AGENTS.md)."
  exit 1
fi

echo "Scan de secrets : aucune occurrence (${#PATTERNS[@]} motifs + variables d'environnement)."
exit 0
