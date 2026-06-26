#!/usr/bin/env sh
set -e

# Schema/migrations are owned by Supabase (the single production source of
# truth) and applied out-of-band via the Supabase migration pipeline — never by
# the application container at boot. The server simply starts and binds $PORT.
exec "$@"
