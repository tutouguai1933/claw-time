#!/bin/sh
set -eu
# Reuse an existing image containing /usr/local/bin/node 22.13+; never pull.
: "${NODE_IMAGE:?Set NODE_IMAGE to an existing local Node.js image}"
: "${APP_DIR:?Set APP_DIR to the absolute release directory}"
: "${DATA_DIR:?Set DATA_DIR to an absolute persistent directory}"
: "${PUBLIC_ORIGIN:?Set PUBLIC_ORIGIN, for example http://SERVER_IP:3080}"
PORT=${PORT:-3080}
NAME=${NAME:-claw-time}
APP_VERSION=${APP_VERSION:-development}
case "$APP_DIR:$DATA_DIR" in /*:/*) ;; *) echo 'Use absolute application and data paths' >&2; exit 1;; esac
test -f "$APP_DIR/server/index.cjs"
mkdir -p "$DATA_DIR"
chmod 700 "$DATA_DIR"
# Refuse to replace an existing service implicitly. Stop/rename it for rollback first.
if docker container inspect "$NAME" >/dev/null 2>&1; then echo "Container $NAME already exists; preserve or remove it explicitly before deployment" >&2; exit 1; fi
docker run -d --pull=never --name "$NAME" --restart unless-stopped \
  --user "$(id -u):$(id -g)" --read-only --cap-drop ALL \
  --security-opt no-new-privileges --pids-limit 64 --memory 320m --memory-swap 448m \
  --log-opt max-size=5m --log-opt max-file=2 \
  --mount "type=bind,src=$APP_DIR,dst=/app,readonly" \
  --mount "type=bind,src=$DATA_DIR,dst=/data" \
  -p "$PORT:3080" -e HOST=0.0.0.0 -e PORT=3080 -e DATA_DIR=/data \
  -e "PUBLIC_ORIGIN=$PUBLIC_ORIGIN" -e "APP_VERSION=$APP_VERSION" \
  --workdir /app --entrypoint /usr/local/bin/node "$NODE_IMAGE" /app/server/index.cjs
