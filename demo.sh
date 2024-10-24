#!/bin/sh

stop() {
  echo "[INFO] Stopping the demo..."
  docker-compose down
  exit 0
}

exit_on_error() {
  echo "[ERROR] $1"
  docker-compose down
  exit 1
}

if ! command -v docker >/dev/null 2>&1; then
  exit_on_error "Docker is not installed. Please install Docker."
fi

if ! docker info >/dev/null 2>&1; then
  exit_on_error "Current user cannot run Docker commands."
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
"

check_env_var() {
  VAR_NAME=$1
  VALUE=$(docker-compose config | awk -v var="$VAR_NAME" '$1 == var":"{gsub(/"/, "", $2); print $2}')

  if [ -z "$VALUE" ] || [ "$VALUE" = "null" ] || [ "$VALUE" = "" ]; then
    exit_on_error "$VAR_NAME is missing or empty in autodroid_api_gateway_prod environment variables."
  fi
}

for VAR in $REQUIRED_ENV_VARS; do
  check_env_var "$VAR"
done

echo "[INFO] All environment variables are present."

echo "Enter Firebase API KEY (find it inside your Firebase Project Settings → General → Your Apps → Select App → apiKey value):"
read FIREBASEKEY
echo "Enter Firebase Username:"
read USERNAME

stty -echo
echo "Enter Firebase Password:"
read PASSWORD
stty echo

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
  fi

  ID_TOKEN_EXP=$(echo "$ID_TOKEN" | cut -d "." -f2 | base64 -d 2>/dev/null | jq -r .exp)

  if [ "$ID_TOKEN_EXP" = "null" ] || [ -z "$ID_TOKEN_EXP" ];
  then
    echo "[DEBUG] Full login response: $FIREBASE_LOGIN_RESPONSE"
    exit_on_error "Failed to parse Firebase token expiration time."
  fi
}

refresh_token() {
  REFRESH_TOKEN=$1

  NEW_TOKEN_RESPONSE=$(curl -s -X POST https://securetoken.googleapis.com/v1/token?key=YOUR_FIREBASE_API_KEY \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "grant_type=refresh_token&refresh_token=$REFRESH_TOKEN")

  NEW_ID_TOKEN=$(echo "$NEW_TOKEN_RESPONSE" | jq -r .id_token)
  NEW_EXP=$(echo "$NEW_ID_TOKEN" | cut -d "." -f2 | base64 -d 2>/dev/null | jq -r .exp)

  if [ "$NEW_ID_TOKEN" = "null" ]; then
    exit_on_error "Failed to refresh Firebase token."
  fi

  ID_TOKEN="$NEW_ID_TOKEN"
  ID_TOKEN_EXP="$NEW_EXP"

  echo "[INFO] Firebase token refreshed."
}

is_token_expiring_soon() {
  CURRENT_TIME=$(date +%s)
  TIME_LEFT=$((ID_TOKEN_EXP - CURRENT_TIME))

  if [ "$TIME_LEFT" -lt 300 ]; then
    return 0
  else
    return 1
  fi
}

refresh_and_get_token() {
  if is_token_expiring_soon; then
    refresh_token "$REFRESH_TOKEN"
  fi

  echo "$ID_TOKEN"
}

firebase_login
echo "[INFO] Logged into Firebase."

trap stop INT

docker-compose down
docker-compose pull
docker-compose up -d

until [ "$(curl -s -o /dev/null -w ''%{http_code}'' http://localhost:3333/health/ready)" -eq 200 ]; do
  echo "[INFO] Waiting for backend to be ready..."
  sleep 5
done
echo "[INFO] Backend is ready."

exit 0

# Call API endpoints with the Firebase token
while :; do
  RESPONSE=$(curl -s -H "Authorization: Bearer $ID_TOKEN" http://localhost:3333/process/status)

  STATUS=$(echo "$RESPONSE" | jq -r .status)

  if [ "$STATUS" = "COMPLETE" ]; then
    FILE_URL=$(echo "$RESPONSE" | jq -r .file.public_url)
    echo "[INFO] Process completed. File available at: $FILE_URL"
    break
  fi

  # Refresh Firebase token if needed
  NEW_TOKEN=$(curl -s -X POST https://securetoken.googleapis.com/v1/token?key=YOUR_FIREBASE_API_KEY \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "grant_type=refresh_token&refresh_token=$REFRESH_TOKEN" | jq -r .id_token)

  if [ "$NEW_TOKEN" != "null" ]; then
    ID_TOKEN="$NEW_TOKEN"
    echo "[INFO] Firebase token refreshed."
  else
    exit_on_error "Failed to refresh Firebase token."
  fi

  echo "[INFO] Checking process status..."
  sleep 10
done
