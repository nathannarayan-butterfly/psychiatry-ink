#!/usr/bin/env sh
set -e

# Optionally apply pending Prisma migrations at boot. Off by default — prefer a
# dedicated migration step in your deploy pipeline (a single runner, not every
# replica) to avoid concurrent `migrate deploy` races. Enable with
# RUN_DB_MIGRATIONS=true for simple single-instance deploys.
if [ "${RUN_DB_MIGRATIONS}" = "true" ]; then
  echo "[entrypoint] Running prisma migrate deploy..."
  # Never let a migration failure (e.g. P3005, auth) block the server from
  # starting and listening on $PORT — Cloud Run kills the revision if nothing
  # binds before the startup timeout. Prefer a dedicated migration step in the
  # deploy pipeline; this best-effort run only logs on failure.
  if npx prisma migrate deploy; then
    echo "[entrypoint] prisma migrate deploy succeeded."
  else
    echo "[entrypoint] WARNING: prisma migrate deploy failed — starting server anyway." >&2
  fi
fi

exec "$@"
