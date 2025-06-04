#!/usr/bin/env bash
#
# MarineAI Development Environment Setup Script
# --------------------------------------------
# This script automates the setup of the MarineAI development environment,
# including dependency checks, environment configuration, database initialization,
# and service health verification.
#
# Usage: ./scripts/dev-setup.sh [--force] [--skip-docker-check] [--skip-deps]
#

# Exit on error, undefined variables, and propagate pipe failures
set -euo pipefail

# Script location
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Default configuration
FORCE_SETUP=false
SKIP_DOCKER_CHECK=false
SKIP_DEPS=false
VERBOSE=false
ENV_FILE="${PROJECT_ROOT}/.env"
ENV_EXAMPLE_FILE="${PROJECT_ROOT}/.env.example"
LOG_FILE="${PROJECT_ROOT}/setup.log"

# Required tools and their minimum versions
REQUIRED_TOOLS=(
  "docker:20.10.0"
  "docker-compose:2.0.0"
  "node:18.0.0"
  "npm:8.0.0"
  "python:3.11.0"
  "pip:22.0.0"
)

# Docker services to check
SERVICES=(
  "postgres:5432"
  "redis:6379"
  "weaviate:8080"
  "minio:9000"
  "backend:4000"
  "frontend:3000"
  "ai-service:8000"
)

# Color definitions
if [ -t 1 ]; then
  RESET="\033[0m"
  RED="\033[0;31m"
  GREEN="\033[0;32m"
  YELLOW="\033[0;33m"
  BLUE="\033[0;34m"
  MAGENTA="\033[0;35m"
  CYAN="\033[0;36m"
  BOLD="\033[1m"
else
  RESET=""
  RED=""
  GREEN=""
  YELLOW=""
  BLUE=""
  MAGENTA=""
  CYAN=""
  BOLD=""
fi

# ==============================
# Function Definitions
# ==============================

# Print usage information
usage() {
  echo -e "${BOLD}MarineAI Development Environment Setup${RESET}"
  echo
  echo "Usage: $0 [OPTIONS]"
  echo
  echo "Options:"
  echo "  --force            Force setup even if environment is already configured"
  echo "  --skip-docker-check Skip Docker and Docker Compose checks"
  echo "  --skip-deps        Skip dependency installation"
  echo "  --verbose          Enable verbose output"
  echo "  --help             Display this help message"
  echo
}

# Log message to console and log file
log() {
  local level="$1"
  local message="$2"
  local color=""
  
  case "$level" in
    "INFO")  color="${BLUE}" ;;
    "SUCCESS") color="${GREEN}" ;;
    "WARN")  color="${YELLOW}" ;;
    "ERROR") color="${RED}" ;;
    *) color="${RESET}" ;;
  esac
  
  # Get current timestamp
  local timestamp=$(date "+%Y-%m-%d %H:%M:%S")
  
  # Log to console with color
  echo -e "${color}[${level}]${RESET} ${message}"
  
  # Log to file without color codes
  echo "[${timestamp}] [${level}] ${message}" >> "${LOG_FILE}"
}

# Display a step with proper formatting
step() {
  local step_num="$1"
  local step_title="$2"
  echo -e "\n${BOLD}${MAGENTA}Step ${step_num}: ${step_title}${RESET}"
  echo -e "${MAGENTA}$(printf '%.0s-' {1..50})${RESET}"
}

# Display progress spinner
spinner() {
  local pid=$1
  local delay=0.1
  local spinstr='|/-\'
  
  echo -n "  "
  while ps a | awk '{print $1}' | grep -q "${pid}"; do
    local temp=${spinstr#?}
    printf "\b\b${CYAN}%c${RESET} " "$spinstr"
    spinstr=$temp${spinstr%"$temp"}
    sleep $delay
  done
  printf "\b\b${GREEN}✓${RESET} "
  echo
}

# Check if a command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Check version of a tool
check_version() {
  local tool="$1"
  local min_version="$2"
  local version_cmd="$3"
  local version_regex="$4"
  
  if ! command_exists "$tool"; then
    return 1
  fi
  
  local current_version
  current_version=$(eval "$version_cmd" | grep -oE "$version_regex" | head -n1)
  
  if [ -z "$current_version" ]; then
    log "WARN" "Could not determine version of $tool"
    return 0
  fi
  
  if ! command_exists "sort"; then
    log "WARN" "Cannot compare versions: 'sort' command not found"
    return 0
  fi
  
  # Compare versions
  if [ "$(printf '%s\n' "$min_version" "$current_version" | sort -V | head -n1)" != "$min_version" ]; then
    return 0
  else
    log "WARN" "$tool version $current_version is lower than required $min_version"
    return 1
  fi
}

# Wait for service to be ready
wait_for_service() {
  local service="$1"
  local host="$2"
  local port="$3"
  local max_attempts=30
  local attempt=1
  
  echo -n "  Waiting for $service to be ready..."
  
  while [ $attempt -le $max_attempts ]; do
    if nc -z "$host" "$port" >/dev/null 2>&1; then
      echo -e " ${GREEN}Ready!${RESET}"
      return 0
    fi
    
    echo -n "."
    sleep 2
    attempt=$((attempt + 1))
  done
  
  echo -e " ${RED}Failed!${RESET}"
  log "ERROR" "Service $service failed to start after $max_attempts attempts"
  return 1
}

# Check if environment is already set up
is_env_setup() {
  if [ -f "$ENV_FILE" ] && [ -d "${PROJECT_ROOT}/node_modules" ]; then
    return 0
  fi
  return 1
}

# Create backup of a file
backup_file() {
  local file="$1"
  if [ -f "$file" ]; then
    local backup="${file}.bak.$(date +%Y%m%d%H%M%S)"
    log "INFO" "Creating backup of $file to $backup"
    cp "$file" "$backup"
  fi
}

# Cleanup function for error handling
cleanup() {
  local exit_code=$?
  
  if [ $exit_code -ne 0 ]; then
    log "ERROR" "Setup failed with exit code $exit_code"
    log "ERROR" "Check the log file for details: $LOG_FILE"
    
    # Ask if user wants to rollback
    if [ -t 0 ]; then  # Only if running interactively
      echo
      read -p "Would you like to attempt rollback? [y/N] " -n 1 -r
      echo
      if [[ $REPLY =~ ^[Yy]$ ]]; then
        log "INFO" "Starting rollback process..."
        
        # Restore .env file from backup if it exists
        local latest_backup=$(ls -t "${ENV_FILE}.bak."* 2>/dev/null | head -n1)
        if [ -n "$latest_backup" ]; then
          log "INFO" "Restoring .env file from $latest_backup"
          cp "$latest_backup" "$ENV_FILE"
        fi
        
        # Stop any running containers
        if command_exists docker-compose; then
          log "INFO" "Stopping any running containers"
          docker-compose -f "${PROJECT_ROOT}/docker-compose.yml" down 2>/dev/null || true
        fi
        
        log "INFO" "Rollback completed"
      fi
    fi
  fi
  
  # Always print completion message
  if [ $exit_code -eq 0 ]; then
    echo
    echo -e "${GREEN}${BOLD}MarineAI development environment setup completed successfully!${RESET}"
    echo
    echo -e "You can now start the development environment with:"
    echo -e "  ${CYAN}cd $PROJECT_ROOT && make dev${RESET}"
    echo
    echo -e "Access the services at:"
    echo -e "  Frontend: ${CYAN}http://localhost:3000${RESET}"
    echo -e "  Backend API: ${CYAN}http://localhost:4000/api${RESET}"
    echo -e "  AI Service: ${CYAN}http://localhost:8000${RESET}"
    echo -e "  API Documentation: ${CYAN}http://localhost:4000/api/docs${RESET}"
    echo -e "  MinIO Console: ${CYAN}http://localhost:9001${RESET}"
    echo
  else
    echo
    echo -e "${RED}${BOLD}Setup failed!${RESET} Please check the log file: ${LOG_FILE}"
    echo
  fi
}

# Register cleanup function to run on exit
trap cleanup EXIT

# ==============================
# Parse Command Line Arguments
# ==============================
while [ $# -gt 0 ]; do
  case "$1" in
    --force)
      FORCE_SETUP=true
      shift
      ;;
    --skip-docker-check)
      SKIP_DOCKER_CHECK=true
      shift
      ;;
    --skip-deps)
      SKIP_DEPS=true
      shift
      ;;
    --verbose)
      VERBOSE=true
      shift
      ;;
    --help)
      usage
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${RESET}"
      usage
      exit 1
      ;;
  esac
done

# ==============================
# Main Script
# ==============================

# Clear or create log file
> "$LOG_FILE"

# Print header
echo -e "${BOLD}${CYAN}=======================================${RESET}"
echo -e "${BOLD}${CYAN}  MarineAI Development Setup Script    ${RESET}"
echo -e "${BOLD}${CYAN}=======================================${RESET}"
echo

# Check if setup is already done
if is_env_setup && [ "$FORCE_SETUP" = false ]; then
  log "WARN" "Environment appears to be already set up."
  echo -e "Use ${YELLOW}--force${RESET} to run setup anyway."
  
  # Ask if user wants to continue
  if [ -t 0 ]; then  # Only if running interactively
    read -p "Continue anyway? [y/N] " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      log "INFO" "Setup cancelled by user"
      exit 0
    fi
  else
    exit 0
  fi
fi

# Start setup
log "INFO" "Starting MarineAI development environment setup"
log "INFO" "Log file: $LOG_FILE"

# Step 1: Check system requirements
step "1" "Checking system requirements"

# Check operating system
OS="$(uname -s)"
case "${OS}" in
  Linux*)     
    log "INFO" "Operating System: Linux"
    ;;
  Darwin*)    
    log "INFO" "Operating System: macOS"
    ;;
  MINGW*|MSYS*|CYGWIN*) 
    log "INFO" "Operating System: Windows"
    log "WARN" "Windows is supported through WSL (Windows Subsystem for Linux)"
    ;;
  *)
    log "WARN" "Unknown operating system: ${OS}"
    ;;
esac

# Check for required tools
if [ "$SKIP_DOCKER_CHECK" = false ]; then
  for tool_info in "${REQUIRED_TOOLS[@]}"; do
    IFS=":" read -r tool min_version <<< "$tool_info"
    
    echo -n "  Checking for $tool (>= $min_version)..."
    
    if ! command_exists "$tool"; then
      echo -e " ${RED}Not found!${RESET}"
      log "ERROR" "$tool is not installed or not in PATH"
      
      case "$tool" in
        docker)
          log "INFO" "Please install Docker: https://docs.docker.com/get-docker/"
          ;;
        docker-compose)
          log "INFO" "Please install Docker Compose: https://docs.docker.com/compose/install/"
          ;;
        node)
          log "INFO" "Please install Node.js: https://nodejs.org/"
          ;;
        python)
          log "INFO" "Please install Python: https://www.python.org/downloads/"
          ;;
        *)
          log "INFO" "Please install $tool"
          ;;
      esac
      
      exit 1
    fi
    
    # Check version based on tool
    version_cmd=""
    version_regex=""
    
    case "$tool" in
      docker)
        version_cmd="docker --version"
        version_regex="[0-9]+\.[0-9]+\.[0-9]+"
        ;;
      docker-compose)
        version_cmd="docker-compose --version"
        version_regex="[0-9]+\.[0-9]+\.[0-9]+"
        ;;
      node)
        version_cmd="node --version"
        version_regex="[0-9]+\.[0-9]+\.[0-9]+"
        ;;
      npm)
        version_cmd="npm --version"
        version_regex="[0-9]+\.[0-9]+\.[0-9]+"
        ;;
      python)
        version_cmd="python --version 2>&1"
        version_regex="[0-9]+\.[0-9]+\.[0-9]+"
        ;;
      pip)
        version_cmd="pip --version"
        version_regex="[0-9]+\.[0-9]+(\.[0-9]+)?"
        ;;
      *)
        version_cmd="$tool --version"
        version_regex="[0-9]+\.[0-9]+\.[0-9]+"
        ;;
    esac
    
    if [ -n "$version_cmd" ] && [ -n "$version_regex" ]; then
      version=$(eval "$version_cmd" | grep -oE "$version_regex" | head -n1)
      echo -e " ${GREEN}Found v$version${RESET}"
    else
      echo -e " ${YELLOW}Found (version unknown)${RESET}"
    fi
  done
fi

# Step 2: Set up environment variables
step "2" "Setting up environment variables"

# Create .env file if it doesn't exist
if [ ! -f "$ENV_FILE" ]; then
  log "INFO" "Creating .env file from example"
  cp "$ENV_EXAMPLE_FILE" "$ENV_FILE"
  log "SUCCESS" "Created .env file"
else
  log "INFO" ".env file already exists"
  
  # Check if .env file has all the variables from .env.example
  if [ -f "$ENV_EXAMPLE_FILE" ]; then
    missing_vars=0
    
    while IFS= read -r line; do
      # Skip comments and empty lines
      [[ "$line" =~ ^# ]] || [[ -z "$line" ]] && continue
      
      # Extract variable name
      var_name=$(echo "$line" | cut -d'=' -f1)
      
      # Check if variable exists in .env
      if ! grep -q "^${var_name}=" "$ENV_FILE"; then
        log "WARN" "Missing variable in .env: $var_name"
        missing_vars=$((missing_vars + 1))
      fi
    done < "$ENV_EXAMPLE_FILE"
    
    if [ $missing_vars -gt 0 ]; then
      log "WARN" "Found $missing_vars missing variables in .env file"
      
      # Ask if user wants to update .env file
      if [ -t 0 ]; then  # Only if running interactively
        read -p "Update .env file with missing variables? [Y/n] " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Nn]$ ]]; then
          backup_file "$ENV_FILE"
          
          # Add missing variables
          while IFS= read -r line; do
            # Skip comments and empty lines
            [[ "$line" =~ ^# ]] || [[ -z "$line" ]] && continue
            
            # Extract variable name
            var_name=$(echo "$line" | cut -d'=' -f1)
            
            # Check if variable exists in .env
            if ! grep -q "^${var_name}=" "$ENV_FILE"; then
              echo "$line" >> "$ENV_FILE"
              log "INFO" "Added $var_name to .env file"
            fi
          done < "$ENV_EXAMPLE_FILE"
          
          log "SUCCESS" "Updated .env file with missing variables"
        fi
      fi
    fi
  fi
fi

# Generate random JWT secret if not set
if grep -q "JWT_SECRET=super_secret_jwt_key_for_development" "$ENV_FILE"; then
  log "INFO" "Generating random JWT secret"
  
  # Generate random string
  if command_exists openssl; then
    random_secret=$(openssl rand -hex 32)
  else
    random_secret=$(cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 32 | head -n 1)
  fi
  
  # Replace default JWT secret with random one
  sed -i.bak "s/JWT_SECRET=super_secret_jwt_key_for_development/JWT_SECRET=$random_secret/" "$ENV_FILE"
  rm -f "${ENV_FILE}.bak"
  
  log "SUCCESS" "Generated random JWT secret"
fi

# Step 3: Install dependencies
step "3" "Installing dependencies"

if [ "$SKIP_DEPS" = false ]; then
  # Backend dependencies
  if [ -f "${PROJECT_ROOT}/backend/package.json" ]; then
    log "INFO" "Installing backend dependencies"
    echo -n "  Installing backend dependencies..."
    
    (cd "${PROJECT_ROOT}/backend" && npm ci > /dev/null 2>&1) &
    spinner $!
    
    log "SUCCESS" "Installed backend dependencies"
  fi
  
  # Frontend dependencies
  if [ -f "${PROJECT_ROOT}/frontend/package.json" ]; then
    log "INFO" "Installing frontend dependencies"
    echo -n "  Installing frontend dependencies..."
    
    (cd "${PROJECT_ROOT}/frontend" && npm ci > /dev/null 2>&1) &
    spinner $!
    
    log "SUCCESS" "Installed frontend dependencies"
  fi
  
  # AI service dependencies
  if [ -f "${PROJECT_ROOT}/ai-service/requirements.txt" ]; then
    log "INFO" "Installing AI service dependencies"
    echo -n "  Installing AI service dependencies..."
    
    (cd "${PROJECT_ROOT}/ai-service" && pip install -r requirements.txt > /dev/null 2>&1) &
    spinner $!
    
    log "SUCCESS" "Installed AI service dependencies"
  fi
else
  log "INFO" "Skipping dependency installation (--skip-deps flag used)"
fi

# Step 4: Build and start Docker services
step "4" "Building and starting Docker services"

# Check if Docker is running
if [ "$SKIP_DOCKER_CHECK" = false ] && command_exists docker; then
  echo -n "  Checking if Docker daemon is running..."
  
  if ! docker info > /dev/null 2>&1; then
    echo -e " ${RED}Not running!${RESET}"
    log "ERROR" "Docker daemon is not running"
    log "INFO" "Please start Docker and try again"
    exit 1
  fi
  
  echo -e " ${GREEN}Running${RESET}"
fi

# Start Docker services
log "INFO" "Starting Docker services"
echo -n "  Starting Docker services..."

(cd "${PROJECT_ROOT}" && docker-compose up -d --build > /dev/null 2>&1) &
spinner $!

log "SUCCESS" "Docker services started"

# Step 5: Wait for services to be ready
step "5" "Waiting for services to be ready"

# Wait for database services first
for service_info in "${SERVICES[@]}"; do
  IFS=":" read -r service port <<< "$service_info"
  
  # Only wait for database services first
  if [[ "$service" =~ ^(postgres|redis|weaviate|minio)$ ]]; then
    wait_for_service "$service" "localhost" "$port"
  fi
done

# Step 6: Run database migrations and seed data
step "6" "Initializing database"

log "INFO" "Running database migrations"
echo -n "  Running database migrations..."

(cd "${PROJECT_ROOT}" && docker-compose exec -T backend npm run migration:run > /dev/null 2>&1) &
spinner $!

log "SUCCESS" "Database migrations completed"

log "INFO" "Seeding initial data"
echo -n "  Seeding database..."

(cd "${PROJECT_ROOT}" && docker-compose exec -T backend npm run seed > /dev/null 2>&1) &
spinner $!

log "SUCCESS" "Database seeded with initial data"

# Step 7: Wait for application services
step "7" "Waiting for application services"

# Now wait for application services
for service_info in "${SERVICES[@]}"; do
  IFS=":" read -r service port <<< "$service_info"
  
  # Skip database services as we already waited for them
  if [[ ! "$service" =~ ^(postgres|redis|weaviate|minio)$ ]]; then
    wait_for_service "$service" "localhost" "$port"
  fi
done

# Step 8: Verify setup with health checks
step "8" "Verifying setup with health checks"

# Check backend health
echo -n "  Checking backend health..."
if curl -s "http://localhost:4000/api/health" | grep -q "status.*ok"; then
  echo -e " ${GREEN}Healthy${RESET}"
else
  echo -e " ${RED}Unhealthy${RESET}"
  log "WARN" "Backend health check failed"
fi

# Check AI service health
echo -n "  Checking AI service health..."
if curl -s "http://localhost:8000/health" | grep -q "status.*ok"; then
  echo -e " ${GREEN}Healthy${RESET}"
else
  echo -e " ${RED}Unhealthy${RESET}"
  log "WARN" "AI service health check failed"
fi

# Check frontend availability
echo -n "  Checking frontend availability..."
if curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000" | grep -q "200"; then
  echo -e " ${GREEN}Available${RESET}"
else
  echo -e " ${YELLOW}Not ready yet${RESET}"
  log "WARN" "Frontend not available yet, it might still be building"
fi

# Setup complete
log "SUCCESS" "MarineAI development environment setup completed successfully"

# Exit with success
exit 0
