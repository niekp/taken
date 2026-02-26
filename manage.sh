#!/usr/bin/env bash
set -euo pipefail

# ── Config ──────────────────────────────────────────────────────────
COMPOSE_FILE=""
SERVICE="taken"

# Auto-detect compose file
detect_compose_file() {
  if [[ -n "$COMPOSE_FILE" ]]; then
    return
  fi
  if [[ -f "docker-compose.prod.yml" ]] && docker compose -f docker-compose.prod.yml ps --status running -q "$SERVICE" &>/dev/null; then
    COMPOSE_FILE="docker-compose.prod.yml"
  elif [[ -f "docker-compose.yml" ]] && docker compose ps --status running -q "$SERVICE" &>/dev/null; then
    COMPOSE_FILE="docker-compose.yml"
  elif [[ -f "docker-compose.prod.yml" ]]; then
    COMPOSE_FILE="docker-compose.prod.yml"
  else
    COMPOSE_FILE="docker-compose.yml"
  fi
}

dc() {
  docker compose -f "$COMPOSE_FILE" "$@"
}

exec_cli() {
  dc exec "$SERVICE" node server/cli.js "$@"
}

# ── Helpers ─────────────────────────────────────────────────────────
BOLD='\033[1m'
DIM='\033[2m'
CYAN='\033[36m'
GREEN='\033[32m'
YELLOW='\033[33m'
RED='\033[31m'
RESET='\033[0m'

header() {
  clear
  echo -e "${CYAN}${BOLD}╔══════════════════════════════════════╗${RESET}"
  echo -e "${CYAN}${BOLD}║        Taken  ·  Beheer Script       ║${RESET}"
  echo -e "${CYAN}${BOLD}╚══════════════════════════════════════╝${RESET}"
  echo -e "${DIM}  compose: ${COMPOSE_FILE}${RESET}"
  echo
}

pause() {
  echo
  read -rp "Druk op Enter om verder te gaan..."
}

confirm() {
  local msg="$1"
  read -rp "$msg (j/N) " answer
  [[ "${answer,,}" == "j" || "${answer,,}" == "y" ]]
}

check_running() {
  if ! dc ps --status running -q "$SERVICE" &>/dev/null; then
    echo -e "${RED}Container is niet actief.${RESET}"
    echo -e "Start met: ${BOLD}docker compose -f $COMPOSE_FILE up -d${RESET}"
    pause
    return 1
  fi
}

# ── User Management ────────────────────────────────────────────────
list_users() {
  header
  echo -e "${BOLD}Gebruikers${RESET}"
  echo
  exec_cli list-users
  pause
}

add_user() {
  header
  echo -e "${BOLD}Gebruiker toevoegen${RESET}"
  echo

  read -rp "Naam: " name
  [[ -z "$name" ]] && return

  read -rsp "PIN (4 cijfers): " pin
  echo
  [[ -z "$pin" ]] && return

  echo -e "\nKleuren: blue, pink, green, purple, orange, red, teal, yellow"
  read -rp "Kleur (standaard: blue): " color
  color="${color:-blue}"

  echo
  exec_cli add-user "$name" "$pin" "$color"
  pause
}

change_pin() {
  header
  echo -e "${BOLD}PIN wijzigen${RESET}"
  echo

  exec_cli list-users
  echo

  read -rp "Naam: " name
  [[ -z "$name" ]] && return

  read -rsp "Nieuwe PIN (4 cijfers): " pin
  echo
  [[ -z "$pin" ]] && return

  echo
  exec_cli change-pin "$name" "$pin"
  pause
}

remove_user() {
  header
  echo -e "${BOLD}Gebruiker verwijderen${RESET}"
  echo

  exec_cli list-users
  echo

  read -rp "Naam: " name
  [[ -z "$name" ]] && return

  if confirm "Weet je zeker dat je \"$name\" wilt verwijderen?"; then
    # Pass 'y' to the confirmation prompt inside the container
    echo "y" | dc exec -T "$SERVICE" node server/cli.js remove-user "$name"
  else
    echo "Geannuleerd."
  fi
  pause
}

user_menu() {
  while true; do
    header
    echo -e "${BOLD}Gebruikersbeheer${RESET}"
    echo
    echo "  1) Gebruikers tonen"
    echo "  2) Gebruiker toevoegen"
    echo "  3) PIN wijzigen"
    echo "  4) Gebruiker verwijderen"
    echo
    echo "  0) Terug"
    echo
    read -rp "Keuze: " choice

    check_running || continue

    case "$choice" in
      1) list_users ;;
      2) add_user ;;
      3) change_pin ;;
      4) remove_user ;;
      0|"") return ;;
      *) ;;
    esac
  done
}

# ── Utilities ───────────────────────────────────────────────────────
show_logs() {
  header
  echo -e "${BOLD}Logs${RESET} ${DIM}(Ctrl+C om te stoppen)${RESET}"
  echo
  dc logs -f --tail 100 "$SERVICE" || true
}

backup_db() {
  header
  echo -e "${BOLD}Database backup${RESET}"
  echo

  local timestamp
  timestamp=$(date +%Y%m%d_%H%M%S)
  local backup_file="backup_${timestamp}.db"

  dc exec "$SERVICE" cp /data/chores.db "/data/${backup_file}"
  echo -e "${GREEN}Backup aangemaakt: data/${backup_file}${RESET}"
  pause
}

restart_container() {
  header
  echo -e "${BOLD}Container herstarten${RESET}"
  echo

  if confirm "Container herstarten?"; then
    dc restart "$SERVICE"
    echo -e "${GREEN}Container herstart.${RESET}"
  fi
  pause
}

show_status() {
  header
  echo -e "${BOLD}Container status${RESET}"
  echo
  dc ps
  pause
}

update_image() {
  header
  echo -e "${BOLD}Image bijwerken${RESET}"
  echo

  if [[ "$COMPOSE_FILE" != "docker-compose.prod.yml" ]]; then
    echo -e "${YELLOW}Dit is alleen beschikbaar voor productie (docker-compose.prod.yml).${RESET}"
    pause
    return
  fi

  if confirm "Nieuwste image ophalen en container herstarten?"; then
    dc pull "$SERVICE"
    dc up -d "$SERVICE"
    echo -e "${GREEN}Bijgewerkt naar nieuwste versie.${RESET}"
  fi
  pause
}

# ── Main Menu ───────────────────────────────────────────────────────
main_menu() {
  while true; do
    header
    echo "  1) Gebruikersbeheer"
    echo "  2) Status"
    echo "  3) Logs bekijken"
    echo "  4) Database backup"
    echo "  5) Container herstarten"
    echo "  6) Image bijwerken  ${DIM}(prod)${RESET}"
    echo
    echo "  0) Afsluiten"
    echo
    read -rp "Keuze: " choice

    case "$choice" in
      1) user_menu ;;
      2) show_status ;;
      3) show_logs ;;
      4) check_running && backup_db ;;
      5) restart_container ;;
      6) update_image ;;
      0|"") echo -e "\n${DIM}Tot ziens!${RESET}"; exit 0 ;;
      *) ;;
    esac
  done
}

# ── Entry Point ─────────────────────────────────────────────────────
# Accept -f flag for compose file override
while getopts "f:" opt; do
  case "$opt" in
    f) COMPOSE_FILE="$OPTARG" ;;
    *) echo "Gebruik: $0 [-f docker-compose.yml]"; exit 1 ;;
  esac
done

detect_compose_file
main_menu
