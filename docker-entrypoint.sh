#!/usr/bin/env sh
set -e

# Optionally apply pending Prisma migrations at boot. Off by default — prefer a
# dedicated migration step in your deploy pipeline (a single runner, not every
# replica) to avoid concurrent `migrate deploy` races. Enable with
# RUN_DB_MIGRATIONS=true for simple single-instance deploys.
if [ "${RUN_DB_MIGRATIONS}" = "true" ]; then
  echo "[entrypoint] Running prisma migrate deploy..."
  npx prisma migrate deploy
fi

exec "$@"
