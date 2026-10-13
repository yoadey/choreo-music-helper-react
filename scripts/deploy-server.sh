#!/usr/bin/env bash
# Deploys the web app on an own web server: downloads the build of the latest successful CI run on main
# (artifact "web-<commit>", see the job web-artifact in .github/workflows/ci.yml), saves the current state of the
# web root as a backup and replaces it with the new build. Backups can be listed and restored.
#
#   deploy-server.sh [update] [--force]   install the latest build of main (skipped if it is already installed)
#   deploy-server.sh update --file x.zip  install a downloaded artifact instead
#   deploy-server.sh list                 list the backups (newest first)
#   deploy-server.sh restore [backup]     restore a backup (default: the newest one)
#
# Configuration by environment variables (or in a file next to the script: deploy-server.env):
#   TARGET_DIR    web root of the app (required)
#   BACKUP_DIR    directory of the backups (default: $TARGET_DIR.backups)
#   GITHUB_TOKEN  token with read access to Actions of the repository (required for downloads, also for public
#                 repositories), e.g. a fine-grained token with "Actions: Read-only"
#   REPO          GitHub repository (default: yoadey/choreo-music-helper-react)
#   KEEP_BACKUPS  number of backups to keep (default: 10)
#   PRESERVE      files in the web root that are not part of the app and are kept (default: ".htaccess .well-known")
#
# Requires bash, curl, jq and unzip.
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=/dev/null
[[ -f "$SCRIPT_DIR/deploy-server.env" ]] && source "$SCRIPT_DIR/deploy-server.env"

REPO=${REPO:-yoadey/choreo-music-helper-react}
KEEP_BACKUPS=${KEEP_BACKUPS:-10}
PRESERVE=${PRESERVE:-.htaccess .well-known}
API=https://api.github.com/repos/$REPO

die() {
    echo "Error: $*" >&2
    exit 1
}

[[ -n "${TARGET_DIR:-}" ]] || die "TARGET_DIR is not set"
TARGET_DIR=${TARGET_DIR%/}
[[ -n "$TARGET_DIR" && "$TARGET_DIR" != / ]] || die "TARGET_DIR must not be /"
BACKUP_DIR=${BACKUP_DIR:-$TARGET_DIR.backups}
BACKUP_DIR=${BACKUP_DIR%/}
# The commit of the installed build, kept outside of the web root
VERSION_FILE=$BACKUP_DIR/.current-version

for tool in curl jq unzip; do
    command -v "$tool" > /dev/null || die "$tool is not installed"
done

WORK_DIR=$(mktemp -d)
trap 'rm -rf "$WORK_DIR"' EXIT

github() {
    [[ -n "${GITHUB_TOKEN:-}" ]] || die "GITHUB_TOKEN is not set"
    curl -fsSL -H "Authorization: Bearer $GITHUB_TOKEN" -H "Accept: application/vnd.github+json" \
        -H "X-GitHub-Api-Version: 2022-11-28" "$@"
}

is_preserved() {
    local name=$1 keep
    for keep in $PRESERVE; do
        [[ "$name" == "$keep" ]] && return 0
    done
    return 1
}

# Prints the entries of a directory that belong to the app (all except the preserved ones)
app_entries() {
    local entry
    for entry in "$1"/* "$1"/.[!.]* "$1"/..?*; do
        [[ -e "$entry" ]] || continue
        is_preserved "$(basename "$entry")" || printf '%s\0' "$entry"
    done
}

installed_version() {
    cat "$VERSION_FILE" 2> /dev/null || echo unknown
}

# Copies the web root (without the preserved files) into a new backup, prints its name
backup_current() {
    local name entry
    name=$(date +%Y%m%d-%H%M%S)-$(installed_version | cut -c1-7)
    [[ -e "$BACKUP_DIR/$name" ]] && die "backup $name exists already"
    mkdir -p "$BACKUP_DIR/$name"
    while IFS= read -r -d '' entry; do
        cp -a "$entry" "$BACKUP_DIR/$name/"
    done < <(app_entries "$TARGET_DIR")
    installed_version > "$BACKUP_DIR/$name.version"
    echo "$name"
}

# Replaces the web root (except the preserved files) with the content of a directory
install_dir() {
    local source=$1 entry
    [[ -f "$source/index.html" ]] || die "$source contains no index.html, not a build of the app"
    mkdir -p "$TARGET_DIR"
    while IFS= read -r -d '' entry; do
        rm -rf "$entry"
    done < <(app_entries "$TARGET_DIR")
    # Entry by entry: copying the directory itself would also copy its permissions to the web root
    while IFS= read -r -d '' entry; do
        cp -a "$entry" "$TARGET_DIR/"
    done < <(app_entries "$source")
}

prune_backups() {
    local old
    # Backup names start with the date, sorted names are sorted by age
    find "$BACKUP_DIR" -mindepth 1 -maxdepth 1 -type d -printf '%f\n' | sort -r | tail -n +$((KEEP_BACKUPS + 1)) |
        while read -r old; do
            rm -rf "${BACKUP_DIR:?}/$old" "$BACKUP_DIR/$old.version"
        done
}

# Prints "<commit> <download url>" of the newest successful CI run on main that has a web artifact
latest_artifact() {
    local run_id sha url
    while read -r run_id sha; do
        url=$(github "$API/actions/runs/$run_id/artifacts" |
            jq -r '[.artifacts[] | select((.name | startswith("web-")) and (.expired | not))][0].archive_download_url // empty')
        if [[ -n "$url" ]]; then
            echo "$sha $url"
            return
        fi
    done < <(github "$API/actions/workflows/ci.yml/runs?branch=main&event=push&status=success&per_page=20" |
        jq -r '.workflow_runs[] | "\(.id) \(.head_sha)"')
    die "no successful CI run on main with a web artifact found (artifacts expire after 90 days)"
}

update() {
    local force=false file="" artifact sha url name
    while [[ $# -gt 0 ]]; do
        case $1 in
            --force) force=true ;;
            --file)
                file=${2:-}
                [[ -f "$file" ]] || die "--file needs an existing zip file"
                shift
                ;;
            *) die "unknown option $1" ;;
        esac
        shift
    done

    if [[ -n "$file" ]]; then
        # The name of a downloaded artifact contains the commit (web-<commit>.zip)
        sha=$(basename "$file" .zip)
        sha=${sha#web-}
        cp "$file" "$WORK_DIR/web.zip"
    else
        [[ -n "${GITHUB_TOKEN:-}" ]] || die "GITHUB_TOKEN is not set"
        artifact=$(latest_artifact)
        read -r sha url <<< "$artifact"
        if [[ "$sha" == "$(installed_version)" && "$force" == false ]]; then
            echo "The latest build ($sha) is already installed, use --force to install it again"
            return
        fi
        echo "Downloading the build of $sha"
        github -o "$WORK_DIR/web.zip" "$url"
    fi

    unzip -q "$WORK_DIR/web.zip" -d "$WORK_DIR/web"
    [[ -f "$WORK_DIR/web/index.html" ]] || die "the artifact contains no index.html"

    name=$(backup_current)
    echo "Backup of the current state: $BACKUP_DIR/$name"
    install_dir "$WORK_DIR/web"
    echo "$sha" > "$VERSION_FILE"
    prune_backups
    echo "Installed $sha in $TARGET_DIR"
}

list() {
    local name
    [[ -d "$BACKUP_DIR" ]] || return 0
    find "$BACKUP_DIR" -mindepth 1 -maxdepth 1 -type d -printf '%f\n' | sort -r | while read -r name; do
        echo "$name  (commit $(cat "$BACKUP_DIR/$name.version" 2> /dev/null || echo unknown))"
    done
    echo "Installed: commit $(installed_version)"
}

restore() {
    local name=${1:-} version current
    if [[ -z "$name" ]]; then
        name=$(find "$BACKUP_DIR" -mindepth 1 -maxdepth 1 -type d -printf '%f\n' 2> /dev/null | sort -r | head -n 1)
        [[ -n "$name" ]] || die "no backup in $BACKUP_DIR"
    fi
    [[ "$name" != */* && -d "$BACKUP_DIR/$name" ]] || die "backup $name not found, see: $0 list"
    version=$(cat "$BACKUP_DIR/$name.version" 2> /dev/null || echo unknown)

    # The restored backup is copied first: the backup of the current state may remove it when pruning
    cp -a "$BACKUP_DIR/$name" "$WORK_DIR/restore"
    current=$(backup_current)
    echo "Backup of the current state: $BACKUP_DIR/$current"
    install_dir "$WORK_DIR/restore"
    echo "$version" > "$VERSION_FILE"
    prune_backups
    echo "Restored $name (commit $version) in $TARGET_DIR"
}

command=${1:-update}
[[ $# -gt 0 ]] && shift
case $command in
    update) update "$@" ;;
    list) list ;;
    restore) restore "$@" ;;
    -h | --help | help) sed -n '2,/^set -euo/p' "$0" | sed '$d; s/^# \{0,1\}//' ;;
    *) die "unknown command $command, see: $0 --help" ;;
esac
