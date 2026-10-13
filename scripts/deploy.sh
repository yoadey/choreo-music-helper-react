#!/usr/bin/env bash
# Installs the latest build of main (release "web-latest", published by .github/workflows/ci.yml) in the current
# directory. The files of the installed version are moved into a backup first, other files in the directory
# (e.g. this script, .htaccess) are not touched.
#
#   ./deploy.sh                   install the latest build
#   ./deploy.sh list              list the backups (newest first)
#   ./deploy.sh restore [backup]  restore a backup (default: the newest one)
#
# Requires bash, curl (or wget) and unzip. Backups are kept in .deploy-backups, the newest 5 are kept.
set -euo pipefail

URL=https://github.com/yoadey/choreo-music-helper-react/releases/download/web-latest/web.zip
BACKUP_DIR=.deploy-backups
KEEP_BACKUPS=5
# Names of the files and directories of the installed version
INSTALLED=$BACKUP_DIR/installed

die() {
    echo "Error: $*" >&2
    exit 1
}

command -v unzip > /dev/null || die "unzip is not installed"
mkdir -p "$BACKUP_DIR"
# The temporary directory is created here, /tmp may not be available (e.g. in a chroot of a web hosting)
TEMP=$BACKUP_DIR/tmp-$$
trap 'rm -rf "$TEMP"' EXIT

download() {
    if command -v curl > /dev/null; then
        curl -fsSL -o "$2" "$1"
    elif command -v wget > /dev/null; then
        wget -q -O "$2" "$1"
    else
        die "curl or wget is needed"
    fi
}

# Prints the names of the entries of a directory, one per line
entries() {
    ls -A1 "$1"
}

backups() {
    # Backup names start with the date, sorted names are sorted by age
    local backup
    for backup in "$BACKUP_DIR"/[0-9]*-[0-9]*; do
        [[ -d "$backup" ]] && basename "$backup"
    done | sort -r
}

# Moves the files of the installed version into a new backup. Without a list of the installed files (first
# installation), the files with the names of the new version ($1) are moved.
backup_current() {
    local name entry
    name=$(date +%Y%m%d-%H%M%S)
    [[ -e "$BACKUP_DIR/$name" ]] && die "backup $name exists already, try again in a second"
    mkdir "$BACKUP_DIR/$name"
    if [[ -f "$INSTALLED" ]]; then
        cat "$INSTALLED"
    else
        entries "$1"
    fi | while IFS= read -r entry; do
        # Never moves the backups or this script, whatever the list contains
        [[ -n "$entry" && "$entry" != "$BACKUP_DIR" && "$entry" != "$(basename "$0")" && "$entry" != */* ]] || continue
        if [[ -e "$entry" || -L "$entry" ]]; then mv "$entry" "$BACKUP_DIR/$name/"; fi
    done
    echo "Backup of the current version: $BACKUP_DIR/$name"
}

# Copies the entries of a directory into the current directory and remembers them as the installed version
install_from() {
    local entry
    entries "$1" | while IFS= read -r entry; do
        cp -a "$1/$entry" .
    done
    entries "$1" > "$INSTALLED"
}

prune_backups() {
    local old
    backups | tail -n +$((KEEP_BACKUPS + 1)) | while IFS= read -r old; do
        rm -rf "${BACKUP_DIR:?}/$old"
    done
}

update() {
    echo "Downloading $URL"
    mkdir -p "$TEMP/web"
    download "$URL" "$TEMP/web.zip" || die "download failed"
    unzip -q "$TEMP/web.zip" -d "$TEMP/web"
    [[ -f "$TEMP/web/index.html" ]] || die "the download contains no index.html"
    backup_current "$TEMP/web"
    install_from "$TEMP/web"
    prune_backups
    echo "Installed the latest version in $(pwd)"
}

list() {
    backups
}

restore() {
    local name=${1:-}
    [[ -n "$name" ]] || name=$(backups | head -n 1)
    [[ -n "$name" ]] || die "there is no backup"
    [[ "$name" != */* && -d "$BACKUP_DIR/$name" ]] || die "backup $name not found, see: $0 list"
    # Copied first: pruning after the backup of the current version could remove it
    cp -a "$BACKUP_DIR/$name" "$TEMP"
    backup_current "$TEMP"
    install_from "$TEMP"
    prune_backups
    echo "Restored backup $name in $(pwd)"
}

case ${1:-update} in
    update) update ;;
    list) list ;;
    restore) restore "${2:-}" ;;
    -h | --help | help) sed -n '2,/^set -euo/p' "$0" | sed '$d; s/^# \{0,1\}//' ;;
    *) die "unknown command $1, see: $0 --help" ;;
esac
