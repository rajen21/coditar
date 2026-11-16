#!/bin/sh
# Creates the coditar_test database (idempotent) and applies migrations to it.
# Assumes the docker-compose postgres service is up (see docker-compose.yml).
set -e

CONTAINER=$(docker compose ps -q postgres)
if [ -z "$CONTAINER" ]; then
  echo "postgres container not running - run 'docker compose up -d' first" >&2
  exit 1
fi

docker exec "$CONTAINER" psql -U coditar -tc "SELECT 1 FROM pg_database WHERE datname = 'coditar_test'" | grep -q 1 \
  || docker exec "$CONTAINER" psql -U coditar -c "CREATE DATABASE coditar_test"

set -a
. ./.env.test
set +a
npx prisma migrate deploy
