#!/usr/bin/env bash
set -euo pipefail

# ── Config ──────────────────────────────────────────────────────────
COMPOSE_FILE=""
SERVICE="taken"
MANAGE_URL="https://raw.githubusercontent.com/niekp/taken/main/manage.sh"
SELF="$(realpath "$0")"
LOCAL_MODE=false

# ── Terminal setup ──────────────────────────────────────────────────
init_term() {
  stty -echo -icanon 2>/dev/null || true
  printf '\e[?25l'  # hide cursor
  trap cleanup EXIT INT TERM
}

cleanup() {
  printf '\e[?25h'  # show cursor
  stty sane 2>/dev/null || true
  printf '\e[0m'
  clear
}

# ── ANSI / Drawing ──────────────────────────────────────────────────
readonly C_RESET='\e[0m'
readonly C_BOLD='\e[1m'
readonly C_DIM='\e[2m'
readonly C_ITALIC='\e[3m'
readonly C_CYAN='\e[36m'
readonly C_GREEN='\e[32m'
readonly C_YELLOW='\e[33m'
readonly C_RED='\e[31m'
readonly C_WHITE='\e[97m'
readonly C_BG_CYAN='\e[46m'
readonly C_BG_DARK='\e[48;5;236m'
readonly C_GRAY='\e[90m'
readonly C_BG_SELECT='\e[48;5;24m'
readonly C_FG_SELECT='\e[97m'

TERM_COLS=0
TERM_ROWS=0

get_term_size() {
  TERM_COLS=$(tput cols 2>/dev/null || echo 80)
  TERM_ROWS=$(tput lines 2>/dev/null || echo 24)
}

move_to() { printf '\e[%d;%dH' "$1" "$2"; }
clear_screen() { printf '\e[2J\e[H'; }
clear_line() { printf '\e[2K'; }

# Draw a horizontal line
hr() {
  local char="${1:-─}"
  local width="${2:-$TERM_COLS}"
  local line=""
  for ((i = 0; i < width; i++)); do line+="$char"; done
  echo -e "$line"
}

# Center text in terminal
center() {
  local text="$1"
  # Strip ANSI for length calculation
  local plain
  plain=$(echo -e "$text" | sed 's/\x1b\[[0-9;]*m//g')
  local len=${#plain}
  local pad=$(( (TERM_COLS - len) / 2 ))
  ((pad < 0)) && pad=0
  printf '%*s' "$pad" ''
  echo -e "$text"
}

# Draw the header
draw_header() {
  get_term_size
  clear_screen

  echo -e "${C_CYAN}${C_BOLD}"
  center "┌─────────────────────────────────┐"
  center "│     Huishouden  ·  Beheer       │"
  center "└─────────────────────────────────┘"
  echo -e "${C_RESET}"
  center "${C_DIM}compose: ${COMPOSE_FILE}${C_RESET}"
  echo
}

# Draw a status bar at the bottom
draw_status_bar() {
  local text="$1"
  local plain
  plain=$(echo -e "$text" | sed 's/\x1b\[[0-9;]*m//g')
  local len=${#plain}
  local pad=$((TERM_COLS - len - 2))
  ((pad < 0)) && pad=0
  move_to "$TERM_ROWS" 1
  clear_line
  echo -ne "${C_BG_DARK}${C_WHITE} ${text}$(printf '%*s' "$pad" '') ${C_RESET}"
}

# ── Key reading ─────────────────────────────────────────────────────
# Returns: "up" "down" "enter" "back" "q" or a character
read_key() {
  local key
  IFS= read -rsn1 key

  case "$key" in
    $'\x1b')
      local seq
      IFS= read -rsn1 -t 0.05 seq || true
      if [[ "$seq" == "[" ]]; then
        IFS= read -rsn1 -t 0.05 seq || true
        case "$seq" in
          A) echo "up"; return ;;
          B) echo "down"; return ;;
          C) echo "right"; return ;;
          D) echo "left"; return ;;
        esac
      fi
      echo "back"
      return
      ;;
    $'\x7f'|$'\x08')  # Backspace / Delete
      echo "back"
      return
      ;;
    ""|$'\n')
      echo "enter"
      return
      ;;
    "q"|"Q")
      echo "q"
      return
      ;;
    *)
      echo "$key"
      return
      ;;
  esac
}

# ── Menu widget ─────────────────────────────────────────────────────
# Interactive menu with arrow key selection
# Usage: menu_select result_var "Title" "item1" "item2" ...
# Items can have format "label|description" for two-column display
# Returns 0 and sets result_var to selected index, or returns 1 on back/quit
menu_select() {
  local -n _result=$1
  shift
  local title="$1"
  shift
  local items=("$@")
  local count=${#items[@]}
  local selected=0

  while true; do
    draw_header

    # Title
    echo -e "  ${C_BOLD}${C_WHITE}${title}${C_RESET}"
    echo -e "  ${C_DIM}$(hr '─' 40)${C_RESET}"
    echo

    # Menu items
    for ((i = 0; i < count; i++)); do
      local item="${items[$i]}"
      local label="${item%%|*}"
      local desc=""
      [[ "$item" == *"|"* ]] && desc="${item#*|}"

      local menu_w=$((TERM_COLS - 4))
      ((menu_w < 40)) && menu_w=40

      if ((i == selected)); then
        local lpad=$((menu_w - ${#label} - 4))
        ((lpad < 1)) && lpad=1
        echo -e "  ${C_BG_SELECT}${C_FG_SELECT}${C_BOLD}  ▸ ${label}$(printf '%*s' "$lpad" '')${C_RESET}"
        if [[ -n "$desc" ]]; then
          local dpad=$((menu_w - ${#desc} - 4))
          ((dpad < 1)) && dpad=1
          echo -e "  ${C_BG_SELECT}${C_FG_SELECT}    ${C_DIM}${desc}$(printf '%*s' "$dpad" '')${C_RESET}"
        fi
      else
        echo -e "    ${C_GRAY}  ${label}${C_RESET}"
        if [[ -n "$desc" ]]; then
          echo -e "      ${C_DIM}${desc}${C_RESET}"
        fi
      fi
    done

    draw_status_bar "↑↓ navigeer  ⏎ selecteer  Esc terug  q afsluiten"

    local key
    key=$(read_key)

    case "$key" in
      up)
        ((selected > 0)) && ((selected--)) || true
        ;;
      down)
        ((selected < count - 1)) && ((selected++)) || true
        ;;
      enter)
        _result=$selected
        return 0
        ;;
      back)
        return 1
        ;;
      q)
        cleanup
        exit 0
        ;;
      # Number shortcuts
      [0-9])
        if ((key > 0 && key <= count)); then
          _result=$((key - 1))
          return 0
        fi
        ;;
    esac
  done
}

# ── Input widgets ───────────────────────────────────────────────────

# Show a pager with output and wait for keypress
show_output() {
  local title="$1"
  local content="$2"

  draw_header
  echo -e "  ${C_BOLD}${C_WHITE}${title}${C_RESET}"
  echo -e "  ${C_DIM}$(hr '─' 40)${C_RESET}"
  echo
  echo -e "$content" | sed 's/^/    /'
  echo

  draw_status_bar "Druk op een toets om terug te gaan"

  read_key > /dev/null
}

# Read a text input with a prompt (re-enables echo temporarily)
# Usage: input_text result_var "Label" [hidden]
input_text() {
  local -n _input_result=$1
  local label="$2"
  local hidden="${3:-}"

  # Show cursor and restore echo for input
  printf '\e[?25h'
  stty echo icanon 2>/dev/null || true

  echo -ne "  ${C_BOLD}${label}:${C_RESET} "
  if [[ "$hidden" == "hidden" ]]; then
    read -rs _input_result
    echo
  else
    read -r _input_result
  fi

  # Hide cursor and disable echo again
  printf '\e[?25l'
  stty -echo -icanon 2>/dev/null || true
}

# Confirmation dialog
# Usage: confirm_action "Question?"
confirm_action() {
  local msg="$1"

  printf '\e[?25h'
  stty echo icanon 2>/dev/null || true

  echo
  echo -ne "  ${C_YELLOW}${msg}${C_RESET} ${C_DIM}(j/N)${C_RESET} "
  local answer
  read -r answer

  printf '\e[?25l'
  stty -echo -icanon 2>/dev/null || true

  [[ "${answer,,}" == "j" || "${answer,,}" == "y" ]]
}

# Color picker with arrow keys
# Usage: color_select result_var
color_select() {
  local -n _color_result=$1
  local colors=("blue" "pink" "green" "purple" "orange" "red" "teal" "yellow")
  local labels=("Blauw" "Roze" "Groen" "Paars" "Oranje" "Rood" "Teal" "Geel")
  local color_codes=(
    '\e[34m█'   # blue
    '\e[35m█'   # pink
    '\e[32m█'   # green
    '\e[35m█'   # purple
    '\e[33m█'   # orange
    '\e[31m█'   # red
    '\e[36m█'   # teal
    '\e[93m█'   # yellow
  )
  local count=${#colors[@]}
  local selected=0

  while true; do
    # Render color grid
    move_to 13 1
    for ((i = 0; i < count; i++)); do
      clear_line
      if ((i == selected)); then
        local cpad=$((TERM_COLS - ${#labels[$i]} - 12))
        ((cpad < 1)) && cpad=1
        echo -e "    ${C_BG_SELECT}${C_FG_SELECT}${C_BOLD} ▸ ${color_codes[$i]}${C_RESET}${C_BG_SELECT}${C_FG_SELECT} ${labels[$i]}$(printf '%*s' "$cpad" '')${C_RESET}"
      else
        echo -e "      ${color_codes[$i]}${C_RESET} ${C_GRAY}${labels[$i]}${C_RESET}"
      fi
    done

    draw_status_bar "↑↓ navigeer  ⏎ selecteer  Esc terug"

    local key
    key=$(read_key)

    case "$key" in
      up)    ((selected > 0)) && ((selected--)) ;;
      down)  ((selected < count - 1)) && ((selected++)) ;;
      enter)
        _color_result="${colors[$selected]}"
        return 0
        ;;
      back)  return 1 ;;
      q)     cleanup; exit 0 ;;
    esac
  done
}

# ── Docker helpers ──────────────────────────────────────────────────

detect_compose_file() {
  if $LOCAL_MODE; then
    COMPOSE_FILE="(lokaal)"
    return
  fi
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
  if $LOCAL_MODE; then
    echo "Docker is niet beschikbaar in lokale modus." >&2
    return 1
  fi
  docker compose -f "$COMPOSE_FILE" "$@"
}

exec_cli() {
  if $LOCAL_MODE; then
    node server/cli.js "$@"
  else
    dc exec -T "$SERVICE" node server/cli.js "$@"
  fi
}

check_running() {
  if $LOCAL_MODE; then
    return 0
  fi
  if ! dc ps --status running -q "$SERVICE" &>/dev/null; then
    show_output "Fout" "${C_RED}Container is niet actief.${C_RESET}\n\nStart met:\n${C_BOLD}docker compose -f $COMPOSE_FILE up -d${C_RESET}"
    return 1
  fi
}

# ── Actions ─────────────────────────────────────────────────────────

action_list_users() {
  local output
  output=$(exec_cli list-users 2>&1) || output="${C_RED}Kon gebruikers niet ophalen.${C_RESET}"
  show_output "Gebruikers" "$output"
}

action_add_user() {
  draw_header
  echo -e "  ${C_BOLD}${C_WHITE}Gebruiker toevoegen${C_RESET}"
  echo -e "  ${C_DIM}$(hr '─' 40)${C_RESET}"
  echo

  local name pin color

  input_text name "Naam"
  [[ -z "$name" ]] && return

  input_text pin "PIN (4 cijfers)" hidden
  [[ -z "$pin" ]] && return

  echo
  echo -e "  ${C_BOLD}Kies een kleur:${C_RESET}"
  echo

  if color_select color; then
    echo
    local output
    output=$(exec_cli add-user "$name" "$pin" "$color" 2>&1) || true
    show_output "Resultaat" "$output"
  fi
}

action_change_pin() {
  draw_header
  echo -e "  ${C_BOLD}${C_WHITE}PIN wijzigen${C_RESET}"
  echo -e "  ${C_DIM}$(hr '─' 40)${C_RESET}"
  echo

  local users_output
  users_output=$(exec_cli list-users 2>&1) || true
  echo -e "$users_output" | sed 's/^/    /'
  echo

  local name pin

  input_text name "Naam"
  [[ -z "$name" ]] && return

  input_text pin "Nieuwe PIN (4 cijfers)" hidden
  [[ -z "$pin" ]] && return

  echo
  local output
  output=$(exec_cli change-pin "$name" "$pin" 2>&1) || true
  show_output "Resultaat" "$output"
}

action_remove_user() {
  draw_header
  echo -e "  ${C_BOLD}${C_WHITE}Gebruiker verwijderen${C_RESET}"
  echo -e "  ${C_DIM}$(hr '─' 40)${C_RESET}"
  echo

  local users_output
  users_output=$(exec_cli list-users 2>&1) || true
  echo -e "$users_output" | sed 's/^/    /'
  echo

  local name
  input_text name "Naam"
  [[ -z "$name" ]] && return

  if confirm_action "Weet je zeker dat je \"$name\" wilt verwijderen?"; then
    local output
    if $LOCAL_MODE; then
      output=$(echo "y" | node server/cli.js remove-user "$name" 2>&1) || true
    else
      output=$(echo "y" | dc exec -T "$SERVICE" node server/cli.js remove-user "$name" 2>&1) || true
    fi
    show_output "Resultaat" "$output"
  fi
}

action_set_chores() {
  draw_header
  echo -e "  ${C_BOLD}${C_WHITE}Taken in/uitschakelen${C_RESET}"
  echo -e "  ${C_DIM}$(hr '─' 40)${C_RESET}"
  echo

  local users_output
  users_output=$(exec_cli list-users 2>&1) || true
  echo -e "$users_output" | sed 's/^/    /'
  echo

  local name
  input_text name "Naam"
  [[ -z "$name" ]] && return

  local toggle_choice
  if ! menu_select toggle_choice "Kan taken uitvoeren?" \
    "Aan|Gebruiker kan taken uitvoeren" \
    "Uit|Gebruiker kan geen taken uitvoeren"; then
    return
  fi

  local value="on"
  [[ "$toggle_choice" -eq 1 ]] && value="off"

  local output
  output=$(exec_cli set-chores "$name" "$value" 2>&1) || true
  show_output "Resultaat" "$output"
}

action_status() {
  local output
  output=$(dc ps 2>&1) || output="${C_RED}Kon status niet ophalen.${C_RESET}"
  show_output "Container status" "$output"
}

action_logs() {
  # Logs need full terminal control
  printf '\e[?25h'
  stty sane 2>/dev/null || true
  clear

  echo -e "  ${C_BOLD}Logs${C_RESET} ${C_DIM}(Ctrl+C om te stoppen)${C_RESET}\n"
  dc logs -f --tail 100 "$SERVICE" 2>&1 || true

  # Restore TUI mode
  stty -echo -icanon 2>/dev/null || true
  printf '\e[?25l'
}

action_backup() {
  local timestamp
  timestamp=$(date +%Y%m%d_%H%M%S)
  local backup_file="backup_${timestamp}.db"

  local output
  output=$(dc exec -T "$SERVICE" cp /data/chores.db "/data/${backup_file}" 2>&1 && echo -e "${C_GREEN}Backup aangemaakt: data/${backup_file}${C_RESET}") || output="${C_RED}Backup mislukt.${C_RESET}"
  show_output "Database backup" "$output"
}

action_restart() {
  draw_header
  echo -e "  ${C_BOLD}${C_WHITE}Container herstarten${C_RESET}"
  echo -e "  ${C_DIM}$(hr '─' 40)${C_RESET}"
  echo

  if confirm_action "Container herstarten?"; then
    local output
    output=$(dc restart "$SERVICE" 2>&1) || true
    show_output "Resultaat" "${C_GREEN}Container herstart.${C_RESET}\n\n$output"
  fi
}

action_update() {
  draw_header
  echo -e "  ${C_BOLD}${C_WHITE}Bijwerken${C_RESET}"
  echo -e "  ${C_DIM}$(hr '─' 40)${C_RESET}"
  echo

  if ! confirm_action "Controleren op updates en bijwerken?"; then
    return
  fi

  echo
  echo -e "    ${C_DIM}Beheerscript controleren...${C_RESET}"

  # Step 1: Check if manage.sh itself needs updating
  local tmp_manage
  tmp_manage=$(mktemp)
  local script_updated=false

  if curl -fsSL "$MANAGE_URL" -o "$tmp_manage" 2>/dev/null; then
    if ! diff -q "$SELF" "$tmp_manage" &>/dev/null; then
      cp "$tmp_manage" "$SELF"
      chmod +x "$SELF"
      rm -f "$tmp_manage"

      script_updated=true

      # Restore terminal before message
      printf '\e[?25h'
      stty sane 2>/dev/null || true
      clear

      echo
      echo -e "  ${C_GREEN}${C_BOLD}Beheerscript is bijgewerkt.${C_RESET}"
      echo
      echo -e "  Start het script opnieuw om verder te gaan met de update:"
      echo -e "  ${C_BOLD}./manage.sh${C_RESET}"
      echo
      exit 0
    fi
  else
    echo -e "    ${C_YELLOW}Kon beheerscript niet ophalen, ga verder met image update...${C_RESET}"
  fi
  rm -f "$tmp_manage"

  if ! $script_updated; then
    echo -e "    ${C_DIM}Beheerscript is actueel.${C_RESET}"
  fi

  # Step 2: Pull latest image and restart
  echo
  echo -e "    ${C_DIM}Image ophalen...${C_RESET}"

  printf '\e[?25h'
  stty sane 2>/dev/null || true

  dc pull "$SERVICE" 2>&1 | sed 's/^/    /'
  dc up -d "$SERVICE" 2>&1 | sed 's/^/    /'

  stty -echo -icanon 2>/dev/null || true
  printf '\e[?25l'

  show_output "Resultaat" "${C_GREEN}Bijgewerkt naar nieuwste versie.${C_RESET}"
}

# ── Menus ───────────────────────────────────────────────────────────

user_menu() {
  while true; do
    local choice
    if ! menu_select choice "Gebruikersbeheer" \
      "Gebruikers tonen|Alle geregistreerde gebruikers" \
      "Gebruiker toevoegen|Naam, PIN en kleur instellen" \
      "PIN wijzigen|Nieuwe PIN voor bestaande gebruiker" \
      "Taken in/uitschakelen|Kan deze gebruiker taken uitvoeren?" \
      "Gebruiker verwijderen|Verwijder een gebruiker permanent"; then
      return
    fi

    check_running || continue

    case "$choice" in
      0) action_list_users ;;
      1) action_add_user ;;
      2) action_change_pin ;;
      3) action_set_chores ;;
      4) action_remove_user ;;
    esac
  done
}

# ── Bring! Actions ──────────────────────────────────────────────────

action_bring_status() {
  local output
  output=$(exec_cli bring-status 2>&1) || output="${C_RED}Kon Bring! status niet ophalen.${C_RESET}"
  show_output "Bring! Status" "$output"
}

action_bring_login() {
  draw_header
  echo -e "  ${C_BOLD}${C_WHITE}Bring! Inloggen${C_RESET}"
  echo -e "  ${C_DIM}$(hr '─' 40)${C_RESET}"
  echo

  local email password

  input_text email "E-mailadres"
  [[ -z "$email" ]] && return

  input_text password "Wachtwoord" hidden
  [[ -z "$password" ]] && return

  echo
  echo -e "    ${C_DIM}Inloggen bij Bring!...${C_RESET}"

  # Need terminal for potential long output
  printf '\e[?25h'
  stty sane 2>/dev/null || true

  local output
  output=$(exec_cli bring-login "$email" "$password" 2>&1) || true

  stty -echo -icanon 2>/dev/null || true
  printf '\e[?25l'

  show_output "Resultaat" "$output"
}

action_bring_select_list() {
  draw_header
  echo -e "  ${C_BOLD}${C_WHITE}Bring! Lijst selecteren${C_RESET}"
  echo -e "  ${C_DIM}$(hr '─' 40)${C_RESET}"
  echo
  echo -e "    ${C_DIM}Lijsten ophalen...${C_RESET}"

  # Fetch lists from CLI
  local lists_output
  lists_output=$(exec_cli bring-lists 2>&1) || true

  # Parse list UUIDs and names from the output
  # Expected format: "  <uuid>  <name>"
  local -a list_uuids=()
  local -a list_names=()

  while IFS= read -r line; do
    # Strip leading/trailing whitespace and ANSI codes
    local clean
    clean=$(echo "$line" | sed 's/\x1b\[[0-9;]*m//g' | sed 's/^[[:space:]]*//' | sed 's/[[:space:]]*$//')

    # Skip empty lines, headers, and separators
    [[ -z "$clean" ]] && continue
    [[ "$clean" == -* ]] && continue
    [[ "$clean" == Beschikbare* ]] && continue
    [[ "$clean" == No* ]] && continue

    # Parse UUID and name (UUID is first token, rest is name)
    local uuid name
    uuid=$(echo "$clean" | awk '{print $1}')
    # Name is everything after UUID, strip "← actief" marker
    name=$(echo "$clean" | sed "s/^${uuid}[[:space:]]*//" | sed 's/ ← actief$//')

    if [[ -n "$uuid" && -n "$name" ]]; then
      list_uuids+=("$uuid")
      list_names+=("$name")
    fi
  done <<< "$lists_output"

  if [[ ${#list_uuids[@]} -eq 0 ]]; then
    show_output "Bring! Lijsten" "${C_YELLOW}Geen lijsten gevonden. Log eerst in met Bring!.${C_RESET}\n\n$lists_output"
    return
  fi

  # Build menu items from lists
  local -a menu_items=()
  for ((i = 0; i < ${#list_names[@]}; i++)); do
    menu_items+=("${list_names[$i]}|${list_uuids[$i]}")
  done

  local choice
  if ! menu_select choice "Selecteer een lijst" "${menu_items[@]}"; then
    return
  fi

  local selected_uuid="${list_uuids[$choice]}"
  local selected_name="${list_names[$choice]}"

  local output
  output=$(exec_cli bring-set-list "$selected_uuid" "$selected_name" 2>&1) || true
  show_output "Resultaat" "$output"
}

action_bring_remove() {
  draw_header
  echo -e "  ${C_BOLD}${C_WHITE}Bring! Configuratie verwijderen${C_RESET}"
  echo -e "  ${C_DIM}$(hr '─' 40)${C_RESET}"
  echo

  if confirm_action "Weet je zeker dat je de Bring! configuratie wilt verwijderen?"; then
    local output
    if $LOCAL_MODE; then
      output=$(echo "y" | node server/cli.js bring-remove 2>&1) || true
    else
      output=$(echo "y" | dc exec -T "$SERVICE" node server/cli.js bring-remove 2>&1) || true
    fi
    show_output "Resultaat" "$output"
  fi
}

bring_menu() {
  while true; do
    local choice
    if ! menu_select choice "Bring! Instellingen" \
      "Status bekijken|Huidige Bring! configuratie" \
      "Inloggen|E-mail en wachtwoord instellen" \
      "Lijst selecteren|Kies een boodschappenlijst" \
      "Configuratie verwijderen|Bring! koppeling verwijderen"; then
      return
    fi

    check_running || continue

    case "$choice" in
      0) action_bring_status ;;
      1) action_bring_login ;;
      2) action_bring_select_list ;;
      3) action_bring_remove ;;
    esac
  done
}

main_menu() {
  while true; do
    local choice

    if $LOCAL_MODE; then
      if ! menu_select choice "Hoofdmenu" \
        "Gebruikersbeheer|Gebruikers beheren en PINs wijzigen" \
        "Bring! Instellingen|Boodschappenlijst koppelen"; then
        cleanup
        exit 0
      fi

      case "$choice" in
        0) user_menu ;;
        1) bring_menu ;;
      esac
    else
      if ! menu_select choice "Hoofdmenu" \
        "Gebruikersbeheer|Gebruikers beheren en PINs wijzigen" \
        "Bring! Instellingen|Boodschappenlijst koppelen" \
        "Status|Container status bekijken" \
        "Logs bekijken|Live logboek volgen" \
        "Database backup|Maak een kopie van de database" \
        "Container herstarten|Service opnieuw starten" \
        "Bijwerken|Script en image bijwerken (prod)"; then
        cleanup
        exit 0
      fi

      case "$choice" in
        0) user_menu ;;
        1) bring_menu ;;
        2) action_status ;;
        3) action_logs ;;
        4) check_running && action_backup ;;
        5) action_restart ;;
        6) action_update ;;
      esac
    fi
  done
}

# ── Entry Point ─────────────────────────────────────────────────────
while getopts "f:l" opt; do
  case "$opt" in
    f) COMPOSE_FILE="$OPTARG" ;;
    l) LOCAL_MODE=true ;;
    *) echo "Gebruik: $0 [-f docker-compose.yml] [-l]"; exit 1 ;;
  esac
done

# Auto-detect local mode if no compose file specified and no container found
if ! $LOCAL_MODE && [[ -z "$COMPOSE_FILE" ]]; then
  if ! docker compose ps -q "$SERVICE" &>/dev/null 2>&1 && \
     ! docker compose -f docker-compose.prod.yml ps -q "$SERVICE" &>/dev/null 2>&1; then
    # No Docker containers found — check if we have server/cli.js locally
    if [[ -f "server/cli.js" ]]; then
      LOCAL_MODE=true
    fi
  fi
fi

detect_compose_file
init_term
main_menu
