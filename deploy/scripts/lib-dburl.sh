# ─────────────────────────────────────────────────────────────────────────────
# Shared helper: convert a Prisma DATABASE_URL into one libpq tools accept.
#
# Prisma's connection string carries parameters that are meaningful only to
# Prisma. `pg_dump`, `pg_restore` and `psql` reject them outright:
#
#     pg_dump: error: invalid URI query parameter: "schema"
#
# Without this, every backup fails and leaves a zero-byte file behind — a
# failure that looks like a backup until the day you need one.
#
# Sourced by backup-database.sh, restore-database.sh and health-check.sh.
# ─────────────────────────────────────────────────────────────────────────────

# Parameters Prisma understands but libpq does not.
PRISMA_ONLY_PARAMS='schema|connection_limit|pool_timeout|pgbouncer|statement_cache_size|socket_timeout|connect_timeout_ms'

# Reads DATABASE_URL from an env file, stripping quotes.
read_database_url() {
  local env_file="$1"
  [ -f "$env_file" ] || return 1
  grep -E '^DATABASE_URL=' "$env_file" | head -1 | cut -d= -f2- | tr -d '"'"'"''
}

# Strips Prisma-only query parameters, keeping any genuine libpq ones
# (sslmode, application_name, …).
libpq_url() {
  local url="$1"
  local base="${url%%\?*}"
  local query=""
  [ "$url" != "$base" ] && query="${url#*\?}"

  [ -z "$query" ] && { echo "$base"; return; }

  local kept=""
  local IFS='&'
  for pair in $query; do
    local key="${pair%%=*}"
    if ! echo "$key" | grep -qE "^($PRISMA_ONLY_PARAMS)$"; then
      kept="${kept:+$kept&}$pair"
    fi
  done

  echo "${base}${kept:+?$kept}"
}

# Extracts the Prisma `schema` parameter, defaulting to `public`, so pg_dump
# can be told explicitly which schema to dump.
url_schema() {
  local url="$1"
  local found
  found="$(echo "$url" | grep -oE '[?&]schema=[^&]*' | head -1 | cut -d= -f2)"
  echo "${found:-public}"
}
