#!/bin/sh

HOST=http://localhost
PORT=3333
IMAGE_NAME="malwaredatalab/autodroid-worker"
CONTAINER_NAME="autodroid_worker"
VOLUME_NAME="autodroid_worker_data"

show_help() {
  echo "Usage: $0 [-k FIREBASEKEY] [-u USERNAME] [-p PASSWORD]"
  echo
  echo "Options:"
  echo "  -k, --firebasekey FIREBASEKEY   Firebase API key"
  echo "  -u, --username USERNAME         Firebase username (email)"
  echo "  -p, --password PASSWORD         Firebase password"
  echo "  -h, --help                      Show this help message"
}

greeting() {
  echo "__________________________________________________________________\n"
  cat << 'EOF'
                 __               __                       __
                /\ \__           /\ \               __    /\ \
   __     __  __\ \ ,_\   ___    \_\ \  _ __   ___ /\_\   \_\ \
 /'__`\  /\ \/\ \\ \ \/  / __`\  /'_` \/\`'__\/ __`\/\ \  /'_` \
/\ \L\.\_\ \ \_\ \\ \ \_/\ \L\ \/\ \L\ \ \ \//\ \L\ \ \ \/\ \L\ \
\ \__/.\_\\ \____/ \ \__\ \____/\ \___,_\ \_\\ \____/\ \_\ \___,_\
 \/__/\/_/ \/___/   \/__/\/___/  \/__,_ /\/_/ \/___/  \/_/\/__,_ /
EOF
  echo "\n__________________________________________________________________\n"
  if [ $# -gt 0 ]; then
    for param in "$@"; do
      echo "$param"
    done
    echo "__________________________________________________________________"
  fi

}

step() {
  echo "__________________________________________________________________\n"
  for param in "$@"; do
    echo "$param"
  done
  echo "__________________________________________________________________\n"
}

while [ $# -gt 0 ]; do
  case "$1" in
    -k|--firebasekey)
      FIREBASEKEY="$2"
      shift 2
      ;;
    -u|--username)
      USERNAME="$2"
      shift 2
      ;;
    -p|--password)
      PASSWORD="$2"
      shift 2
      ;;
    -h|--help)
      show_help
      exit 0
      ;;
    *)
      echo "[ERROR] Invalid option: $1" >&2
      show_help
      exit 1
      ;;
  esac
done

cleanup() {
  docker-compose down -v

  if [ "$(docker ps -aq -f name=$CONTAINER_NAME)" ]; then
    echo "[INFO] Removing existing $CONTAINER_NAME container..." >&2
    docker rm -f $CONTAINER_NAME
  fi

  if [ "$(docker volume ls -q -f name=$VOLUME_NAME)" ]; then
    echo "[INFO] Removing existing $VOLUME_NAME volume..." >&2
    docker volume rm $VOLUME_NAME
  fi
}

stop() {
  echo "[INFO] Stopping the demo..." >&2
  cleanup

  if [ $# -gt 0 ]; then
    greeting "$@"
  fi
  exit 0
}

exit_on_error() {
  echo "[ERROR] $1" >&2
  cleanup
  exit 1
}

firebase_login() {
  FIREBASE_LOGIN_RESPONSE=$(curl -s -X POST "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=$FIREBASEKEY" \
    -H "Content-Type: application/json" \
    -d '{
      "email": "'"$USERNAME"'",
      "password": "'"$PASSWORD"'",
      "returnSecureToken": true
    }')

  ID_TOKEN=$(echo "$FIREBASE_LOGIN_RESPONSE" | jq -r .idToken)
  REFRESH_TOKEN=$(echo "$FIREBASE_LOGIN_RESPONSE" | jq -r .refreshToken)

  if [ "$ID_TOKEN" = "null" ] || [ -z "$ID_TOKEN" ] || [ "$REFRESH_TOKEN" = "null" ] || [ -z "$REFRESH_TOKEN" ] ; then
    exit_on_error "Please check your Firebase credentials."
    return
  fi

  ID_TOKEN_EXP=$(echo "$ID_TOKEN" | cut -d "." -f2 | base64 -d 2>/dev/null | jq -r .exp)

  if [ "$ID_TOKEN_EXP" = "null" ] || [ -z "$ID_TOKEN_EXP" ];
  then
    exit_on_error "Failed to calculate Firebase token expiration date."
    return
  fi

  echo "[INFO] Logged into Firebase." >&2
}

exchange_refresh_to_id_token() {
  if [ -z "$REFRESH_TOKEN" ]; then
    exit_on_error "Refresh token is not set."
  fi

  echo "[INFO] Refreshing Firebase token..." >&2

  NEW_TOKEN_RESPONSE=$(curl -s -X POST "https://securetoken.googleapis.com/v1/token?key=$FIREBASEKEY" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "grant_type=refresh_token&refresh_token=$REFRESH_TOKEN")

  echo "[INFO] Refreshing Firebase token... $NEW_TOKEN_RESPONSE" >&2

  NEW_ID_TOKEN=$(echo "$NEW_TOKEN_RESPONSE" | jq -r .idToken)

   if [ "$NEW_ID_TOKEN" = "null" ]; then
    exit_on_error "Failed to refresh Firebase token."
  fi

  NEW_EXP=$(echo "$NEW_ID_TOKEN" | cut -d "." -f2 | base64 -d 2>/dev/null | jq -r .exp)

  if [ "$ID_TOKEN_EXP" = "null" ] || [ -z "$ID_TOKEN_EXP" ];
  then
    exit_on_error "Failed to calculate Firebase token expiration date."
    return
  fi

  ID_TOKEN="$NEW_ID_TOKEN"
  ID_TOKEN_EXP="$NEW_EXP"

  echo "[INFO] Firebase token refreshed." >&2
}

is_token_expiring_soon() {
  local CURRENT_TIME=$(date +%s)
  local TIME_LEFT=$((ID_TOKEN_EXP - CURRENT_TIME))

  if [ $TIME_LEFT -lt 300 ]; then
    return 0
  else
    return 1
  fi
}

refresh_and_get_token() {
  if is_token_expiring_soon; then
    exchange_refresh_to_id_token
  fi

  echo "$ID_TOKEN"
}

if ! command -v docker >/dev/null 2>&1; then
  exit_on_error "Docker is not installed. Please install Docker."
fi

if ! docker info >/dev/null 2>&1; then
  exit_on_error "Current user cannot run Docker commands."
fi

DOCKER_VERSION=$(docker version -f "{{.Server.Version}}")
DOCKER_VERSION_MAJOR=$(echo "$DOCKER_VERSION"| cut -d'.' -f 1)
DOCKER_VERSION_MINOR=$(echo "$DOCKER_VERSION"| cut -d'.' -f 2)
DOCKER_VERSION_BUILD=$(echo "$DOCKER_VERSION"| cut -d'.' -f 3)

if [ "${DOCKER_VERSION_MAJOR}" -lt 26 ]; then
  echo "Docker version should be 26.0.0 or higher. Got $DOCKER_VERSION"
  exit 1
fi

if [ ! -f "./docker-compose.yml" ]; then
  exit_on_error "docker-compose.yml not found in the current directory."
fi

if ! grep -q '^ *autodroid_api_gateway_prod:' docker-compose.yml; then
  exit_on_error "autodroid_api_gateway_prod service not found in docker-compose.yml."
fi

REQUIRED_ENV_VARS="
FIREBASE_AUTHENTICATION_PROVIDER_PROJECT_ID
FIREBASE_AUTHENTICATION_PROVIDER_CLIENT_EMAIL
FIREBASE_AUTHENTICATION_PROVIDER_PRIVATE_KEY
GOOGLE_STORAGE_PROVIDER_PROJECT_ID
GOOGLE_STORAGE_PROVIDER_CLIENT_EMAIL
GOOGLE_STORAGE_PROVIDER_PRIVATE_KEY
GOOGLE_STORAGE_PROVIDER_BUCKET_NAME
ADMIN_EMAILS
"

get_env_var() {
  VAR_NAME=$1
  VALUE=$(docker-compose config | awk -v var="$VAR_NAME" '$1 == var":"{gsub(/"/, "", $2); print $2}')

  if [ -z "$VALUE" ] || [ "$VALUE" = "null" ] || [ "$VALUE" = "" ]; then
    exit_on_error "$VAR_NAME is missing or empty in autodroid_api_gateway_prod environment variables."
  fi

  echo "$VALUE"
}

check_env_var() {
  VAR_NAME=$1
  VALUE=$(get_env_var "$VAR_NAME")

  if [ $? -ne 0 ]; then
    exit 1  # Exit the script if get_env_var failed
  fi
}

for VAR in $REQUIRED_ENV_VARS; do
  check_env_var "$VAR"
done

ADMIN_EMAILS=$(get_env_var "ADMIN_EMAILS")

check_if_admin() {
  if echo "$ADMIN_EMAILS" | grep -q "$USERNAME"; then
    return 0
  else
    return 1
  fi
}

greeting

while [ -z "$FIREBASEKEY" ] || [ ${#FIREBASEKEY} -lt 10 ]; do
  echo "Enter Firebase API KEY (find it inside your Firebase Project Settings → General → Your Apps → Select App → apiKey value):"
  read FIREBASEKEY
  if [ -z "$FIREBASEKEY" ] || [ ${#FIREBASEKEY} -lt 10 ]; then
    echo "[ERROR] Firebase API KEY must be at least 10 characters long. Please enter a valid key."
  fi
done

while [ -z "$USERNAME" ] || ! check_if_admin || ! echo "$USERNAME" | grep -E -q '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'; do
  echo "Enter Firebase email:"
  read USERNAME
  if [ -z "$USERNAME" ] || ! echo "$USERNAME" | grep -E -q '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'; then
    echo "[ERROR] Please enter a valid email address."
  fi

  if ! check_if_admin; then
    echo "[ERROR] $USERNAME is not an admin. Please enter an admin email like $ADMIN_EMAILS. (Set this on docker_compose.yml file)"
  fi
done

while [ -z "$PASSWORD" ] || [ ${#PASSWORD} -le 1 ] || [ -z "$ID_TOKEN"]; do

  while [ -z "$PASSWORD" ] || [ ${#PASSWORD} -le 1 ]; do
    stty -echo
    echo "Enter Firebase Password:"
    read PASSWORD
    stty echo

    if [ -z "$PASSWORD" ] || [ ${#PASSWORD} -le 1 ]; then
      echo "[ERROR] Password must be more than 1 character long. Please enter a valid password."
      continue
    fi
  done

  firebase_login

  if [ -n "$ID_TOKEN" ]; then
    break
  else
    echo "[ERROR] Wrong password or login failed."
    PASSWORD=""
  fi
done

trap stop INT
echo "[INFO] Press Ctrl+C to stop the demo."

docker pull $IMAGE_NAME
docker-compose down
docker-compose pull
docker-compose up -d

until [ "$(curl -s -o /dev/null -w ''%{http_code}'' $HOST:$PORT/health/ready)" -eq 200 ]; do
  echo "[INFO] Waiting for backend to be ready..."
  sleep 5
done
echo "[INFO] Backend is ready."

echo "[INFO] Worker container started."

call_backend() {
  local CALL_BACKEND_METHOD="$1"
  local CALL_BACKEND_ENDPOINT="$HOST:$PORT$2"
  local CALL_BACKEND_TOKEN="$(refresh_and_get_token)"

  RESPONSE=$(curl -s -X $CALL_BACKEND_METHOD -H "Authorization: Bearer $CALL_BACKEND_TOKEN" $CALL_BACKEND_ENDPOINT)

  if echo "$RESPONSE" | jq . >/dev/null 2>&1; then
    echo "$RESPONSE"
  else
    exit_on_error "[ERROR] Failed to parse JSON response."
  fi
}

#
# STEP 1
#
step "Step 1" "Create a dataset - getting the upload_url to send it."
call_backend "GET" "/user"

#
#
#
step
WORKER_REGISTRATION_TOKEN=GE34LlIhFF4tQfXqk3qlZ1W89ULvxHVJ
docker run --name $CONTAINER_NAME --rm --network host -v /var/run/docker.sock:/var/run/docker.sock -v $VOLUME_NAME:/usr/app/temp $IMAGE_NAME -u http://host.docker.internal:$PORT -t $WORKER_REGISTRATION_TOKEN &

stop "Project demonstration finished.\n" "Homepage: https://malwaredatalab.github.io/" "Developer: luiz@laviola.dev\n" "Enjoy!"
