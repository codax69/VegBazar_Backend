#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -L)"
if [[ "$(basename "$SCRIPT_DIR")" == ".deployment-current" ]]; then
  APP_DIR="$(cd -- "$SCRIPT_DIR/.." && pwd -P)"
else
  APP_DIR="$SCRIPT_DIR"
fi
COMPOSE_FILE="$SCRIPT_DIR/docker-compose.yml"
ENV_FILE="$APP_DIR/.env"
RELEASE_FILE="$APP_DIR/release.env"
PREVIOUS_FILE="$APP_DIR/.previous-release.env"
PENDING_DIR="$APP_DIR/.pending-deployment"
HEALTH_URL="http://127.0.0.1:4041/health"
SERVICE="backend"
TAG_KEY="BACKEND_IMAGE_TAG"

usage() {
  echo "Usage: $0 deploy <40-character-commit-sha> [--lock-held] | rollback" >&2
  exit 2
}

[[ $# -ge 1 ]] || usage
ACTION="$1"
LOCK_HELD=0
case "$ACTION" in
  deploy)
    [[ $# -eq 2 || ( $# -eq 3 && "$3" == "--lock-held" ) ]] || usage
    [[ $# -eq 3 ]] && LOCK_HELD=1
    ;;
  rollback)
    [[ $# -eq 1 ]] || usage
    ;;
  *)
    usage
    ;;
esac

command -v docker >/dev/null
command -v curl >/dev/null
command -v flock >/dev/null

if [[ "$LOCK_HELD" -eq 1 ]]; then
  lock_target="$(readlink "/proc/$$/fd/9" 2>/dev/null || true)"
  [[ "$lock_target" == "$APP_DIR/.deploy.lock" ]] && flock -n 9 || {
    echo "--lock-held requires the deployment lock on file descriptor 9." >&2
    exit 1
  }
else
  exec 9>"$APP_DIR/.deploy.lock"
  flock -w 600 9 || {
    echo "Timed out waiting for the active VegBazar Backend deployment to finish." >&2
    exit 1
  }
fi

if [[ ! -f "$COMPOSE_FILE" ]]; then
  echo "Missing docker-compose.yml in $SCRIPT_DIR" >&2
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing required environment file: $ENV_FILE" >&2
  echo "Create $ENV_FILE on the VPS with production database & backend secrets (DB_URI, JWT_SECRET, etc.)." >&2
  exit 1
fi

if [[ ! -f "$RELEASE_FILE" ]]; then
  echo "release.env not found in $APP_DIR; initializing with default release metadata." >&2
  cat <<'EOF' > "$RELEASE_FILE"
GHCR_OWNER=codax69
BACKEND_IMAGE_TAG=0000000000000000000000000000000000000000
EOF
  chmod 640 "$RELEASE_FILE"
fi

chmod 600 "$ENV_FILE"

compose_with_release() {
  local release_file="$1"
  shift
  env -u BACKEND_IMAGE_TAG -u GHCR_OWNER docker compose \
    --env-file "$ENV_FILE" \
    --env-file "$release_file" \
    -f "$COMPOSE_FILE" \
    "$@"
}

compose() {
  compose_with_release "$RELEASE_FILE" "$@"
}

read_release_value() {
  local key="$1"
  local file="${2:-$RELEASE_FILE}"
  sed -n "s/^${key}=//p" "$file" | tail -n 1
}

validate_release() {
  local file="${1:-$RELEASE_FILE}"
  local owner tag
  owner="$(read_release_value GHCR_OWNER "$file")"
  tag="$(read_release_value "$TAG_KEY" "$file")"

  [[ "$owner" =~ ^[a-z0-9][a-z0-9-]*$ ]] || {
    echo "release.env must contain a lowercase GHCR_OWNER." >&2
    return 1
  }
  [[ "$tag" =~ ^[0-9a-f]{40}$ ]] || {
    echo "release.env must contain a full 40-character commit SHA tag." >&2
    return 1
  }
}

write_release_tag() {
  local file="$1"
  local key="$2"
  local value="$3"
  local temporary
  temporary="$(mktemp "$APP_DIR/.release-update.XXXXXX")"
  awk -v key="$key" -v value="$value" '
    BEGIN { found = 0 }
    index($0, key "=") == 1 {
      print key "=" value
      found = 1
      next
    }
    { print }
    END {
      if (!found) print key "=" value
    }
  ' "$file" > "$temporary"
  chmod 640 "$temporary"
  mv "$temporary" "$file"
}

wait_for_health() {
  local attempt
  for attempt in $(seq 1 30); do
    if curl --fail --silent --show-error --max-time 3 "$HEALTH_URL" >/dev/null 2>&1; then
      return 0
    fi
    sleep 2
  done
  return 1
}

atomic_restore() {
  local source_file="$1"
  local destination="$2"
  local temporary
  temporary="$(mktemp "$APP_DIR/.release-restore.XXXXXX")"
  if ! cp -- "$source_file" "$temporary"; then
    rm -f -- "$temporary"
    return 1
  fi
  if ! chmod 640 "$temporary"; then
    rm -f -- "$temporary"
    return 1
  fi
  if ! mv -- "$temporary" "$destination"; then
    rm -f -- "$temporary"
    return 1
  fi
}

start_pending_release() {
  local candidate_file="$1"
  local temporary_dir
  [[ ! -e "$PENDING_DIR" ]] || {
    echo "An unfinished deployment still needs recovery." >&2
    return 1
  }

  temporary_dir="$(mktemp -d "$APP_DIR/.pending-deployment.XXXXXX")"
  if ! cp -- "$candidate_file" "$temporary_dir/candidate.env" ||
    ! cp -- "$RELEASE_FILE" "$temporary_dir/current-release.env"; then
    rm -rf -- "$temporary_dir"
    return 1
  fi
  if [[ -f "$PREVIOUS_FILE" ]]; then
    if ! cp -- "$PREVIOUS_FILE" "$temporary_dir/previous-release.env"; then
      rm -rf -- "$temporary_dir"
      return 1
    fi
  else
    : > "$temporary_dir/.previous-release-absent"
  fi
  if ! validate_release "$temporary_dir/candidate.env" ||
    ! validate_release "$temporary_dir/current-release.env"; then
    rm -rf -- "$temporary_dir"
    return 1
  fi
  mv -- "$temporary_dir" "$PENDING_DIR"
}

restore_pending_metadata() {
  if ! atomic_restore "$PENDING_DIR/current-release.env" "$RELEASE_FILE"; then
    echo "Could not restore release.env from the pending deployment backup." >&2
    return 1
  fi
  if [[ -f "$PENDING_DIR/.previous-release-absent" ]]; then
    rm -f -- "$PREVIOUS_FILE"
  elif ! atomic_restore "$PENDING_DIR/previous-release.env" "$PREVIOUS_FILE"; then
    echo "Could not restore previous-release metadata from the pending deployment backup." >&2
    return 1
  fi
}

finish_pending_release() {
  local candidate_tag
  local current_tag
  candidate_tag="$(read_release_value "$TAG_KEY" "$PENDING_DIR/candidate.env")"
  current_tag="$(read_release_value "$TAG_KEY" "$PENDING_DIR/current-release.env")"

  if [[ "$candidate_tag" != "$current_tag" ]] &&
    ! atomic_restore "$PENDING_DIR/current-release.env" "$PREVIOUS_FILE"; then
    echo "Could not record the last verified release as the previous release." >&2
    return 1
  fi
  if ! cmp -s "$PENDING_DIR/candidate.env" "$RELEASE_FILE" &&
    ! atomic_restore "$PENDING_DIR/candidate.env" "$RELEASE_FILE"; then
    echo "Could not commit the verified release metadata." >&2
    return 1
  fi
  rm -rf -- "$PENDING_DIR"
}

recover_pending_release() {
  local candidate_tag
  local original_tag

  [[ -d "$PENDING_DIR" ]] || return 0
  if ! validate_release "$PENDING_DIR/candidate.env" ||
    ! validate_release "$PENDING_DIR/current-release.env"; then
    echo "Pending deployment metadata is invalid; recover $PENDING_DIR before continuing." >&2
    return 1
  fi

  candidate_tag="$(read_release_value "$TAG_KEY" "$PENDING_DIR/candidate.env")"
  original_tag="$(read_release_value "$TAG_KEY" "$PENDING_DIR/current-release.env")"

  if cmp -s "$PENDING_DIR/candidate.env" "$RELEASE_FILE" &&
    validate_release &&
    compose up -d --wait --wait-timeout 90 "$SERVICE" &&
    wait_for_health; then
    if ! finish_pending_release; then
      return 1
    fi
    echo "Recovered the verified $SERVICE deployment $candidate_tag."
    return 0
  fi

  if ! restore_pending_metadata; then
    return 1
  fi
  if [[ "$original_tag" == "0000000000000000000000000000000000000000" ]]; then
    rm -rf -- "$PENDING_DIR"
    echo "Discarded an interrupted initial deployment; no verified release existed to restore." >&2
    return 0
  fi
  if compose up -d --wait --wait-timeout 90 "$SERVICE" &&
    wait_for_health; then
    rm -rf -- "$PENDING_DIR"
    echo "Recovered the last verified $SERVICE release $original_tag." >&2
    return 0
  fi

  echo "Could not recover a healthy $SERVICE release; pending metadata was retained at $PENDING_DIR." >&2
  return 1
}

deploy_component() {
  local new_tag="$1"
  local old_tag
  local candidate_tmp

  [[ "$new_tag" =~ ^[0-9a-f]{40}$ ]] || {
    echo "Deployment tag must be a full 40-character commit SHA." >&2
    return 2
  }

  old_tag="$(read_release_value "$TAG_KEY")"
  candidate_tmp="$(mktemp "$APP_DIR/.release-candidate.XXXXXX")"
  if ! cp -- "$RELEASE_FILE" "$candidate_tmp"; then
    rm -f -- "$candidate_tmp"
    return 1
  fi
  write_release_tag "$candidate_tmp" "$TAG_KEY" "$new_tag"
  if ! start_pending_release "$candidate_tmp"; then
    rm -f -- "$candidate_tmp"
    return 1
  fi
  rm -f -- "$candidate_tmp"

  mkdir -p "$APP_DIR/data/invoices" "$APP_DIR/data/uploads" "$APP_DIR/data/reports"

  echo "Pulling $SERVICE image for commit $new_tag."
  if ! compose_with_release "$PENDING_DIR/candidate.env" pull "$SERVICE" ||
    ! compose_with_release "$PENDING_DIR/candidate.env" up -d --wait --wait-timeout 90 "$SERVICE" ||
    ! wait_for_health; then
    echo "Deployment failed; recovering the last verified $SERVICE release." >&2
    if ! recover_pending_release; then
      return 1
    fi
    [[ "$old_tag" != "0000000000000000000000000000000000000000" ]] ||
      echo "No previous release existed to restore (initial deployment failed)." >&2
    return 1
  fi

  if ! finish_pending_release; then
    echo "Deployment is healthy, but release metadata could not be committed; recover it with the next locked operation." >&2
    return 1
  fi
  echo "$SERVICE deployment $new_tag is healthy."
}

rollback_component() {
  local previous_tag
  local current_tag
  [[ -f "$PREVIOUS_FILE" ]] || {
    echo "No previous successful release is recorded." >&2
    return 1
  }

  previous_tag="$(read_release_value "$TAG_KEY" "$PREVIOUS_FILE")"
  current_tag="$(read_release_value "$TAG_KEY")"
  if [[ "$previous_tag" == "$current_tag" ]]; then
    echo "No earlier $SERVICE image tag is available for rollback." >&2
    return 1
  fi
  if [[ "$previous_tag" == "0000000000000000000000000000000000000000" ]]; then
    echo "Previous $SERVICE release tag is initial placeholder; cannot rollback." >&2
    return 1
  fi

  if ! validate_release "$PREVIOUS_FILE" ||
    ! start_pending_release "$PREVIOUS_FILE"; then
    echo "Previous release metadata is invalid or could not be staged." >&2
    return 1
  fi

  if ! compose_with_release "$PENDING_DIR/candidate.env" pull "$SERVICE" ||
    ! compose_with_release "$PENDING_DIR/candidate.env" up -d --wait --wait-timeout 90 "$SERVICE" ||
    ! wait_for_health; then
    echo "Rollback failed; recovering the release that was active before this rollback attempt." >&2
    recover_pending_release
    return 1
  fi

  if ! finish_pending_release; then
    echo "Rollback is healthy, but release metadata could not be committed; recover it with the next locked operation." >&2
    return 1
  fi
  echo "$SERVICE has been rolled back to the previous successful release."
}

if [[ ! -f "$RELEASE_FILE" ]]; then
  echo "release.env not found in $APP_DIR; initializing with default release metadata." >&2
  cat <<'EOF' > "$RELEASE_FILE"
GHCR_OWNER=codax69
BACKEND_IMAGE_TAG=0000000000000000000000000000000000000000
EOF
  chmod 640 "$RELEASE_FILE"
fi

recover_pending_release
validate_release

case "$ACTION" in
  deploy)
    deploy_component "$2"
    ;;
  rollback)
    rollback_component
    ;;
esac
