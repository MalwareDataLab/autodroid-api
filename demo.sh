#!/bin/sh

HOST=http://localhost
PORT=3333

API_IMAGE_NAME="malwaredatalab/autodroid-api"
WORKER_IMAGE_NAME="malwaredatalab/autodroid-worker"
CONTAINER_NAME_PREFIX="autodroid_worker"
VOLUME_NAME="autodroid_worker_data"
DEFAULT_NUM_WORKERS=1
DEFAULT_NUM_PROCESSING_REQUESTS=1

DATASET_FILE_PATH="./docs/samples/dataset_example.csv"

clear

show_help() {
  echo "Usage: $0 [-k FIREBASEKEY] [-u USERNAME] [-p PASSWORD] [-n NUM_WORKERS] [-r NUM_PROCESSING_REQUESTS]"
  echo
  echo "Options:"
  echo "  -k, --firebasekey FIREBASEKEY   Firebase API key"
  echo "  -u, --username USERNAME         Firebase username (email)"
  echo "  -p, --password PASSWORD         Firebase password"
  echo "  -n, --num-workers NUM_WORKERS   Number of worker containers (default: 1)"
  echo "  -r, --num-requests NUM_REQUESTS Number of processing requests (default: 1)"
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
    -n|--num-workers)
      NUM_WORKERS="$2"
      shift 2
      ;;
    -r|--num-requests)
      NUM_PROCESSING_REQUESTS="$2"
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

if [ -z "$NUM_WORKERS" ]; then
  NUM_WORKERS=$DEFAULT_NUM_WORKERS
fi

if [ -z "$NUM_PROCESSING_REQUESTS" ]; then
  NUM_PROCESSING_REQUESTS=$DEFAULT_NUM_PROCESSING_REQUESTS
fi

if ! echo "$NUM_WORKERS" | grep -qE '^[0-9]+$' || [ "$NUM_WORKERS" -lt 0 ]; then
  exit_on_error "Number of workers must be a non-negative integer"
fi

if ! echo "$NUM_PROCESSING_REQUESTS" | grep -qE '^[0-9]+$' || [ "$NUM_PROCESSING_REQUESTS" -lt 1 ]; then
  exit_on_error "Number of processing requests must be a positive integer"
fi

dropVolumeData() {
  if [ -d "./.runtime" ]; then
    echo "[INFO] Removing ./.runtime directory..." >&2
    docker run --rm -v "$(pwd)":/workdir busybox rm -rf /workdir/.runtime
  fi
}

cleanup() {
  docker-compose down -v

  docker ps -aq -f name="$CONTAINER_NAME_PREFIX" | while read -r container_id; do
    echo "[INFO] Removing container $container_id..." >&2
    docker rm -f "$container_id"
  done

  if [ "$(docker volume ls -q -f name=$VOLUME_NAME)" ]; then
    echo "[INFO] Removing existing $VOLUME_NAME volume..." >&2
    docker volume rm $VOLUME_NAME
  fi

  dropVolumeData
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
  wait
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

if [ ! -f "$DATASET_FILE_PATH" ]; then
  exit_on_error "File $DATASET_FILE_PATH not found."
fi

FILE_SIZE=$(stat -c%s "$DATASET_FILE_PATH")
FILE_MD5=$(md5sum "$DATASET_FILE_PATH" | awk '{ print $1 }')
MIME_TYPE=$(file --mime-type -b "$DATASET_FILE_PATH")

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

trap 'stop' 0
trap 'stop' INT

set -e

echo "[INFO] Press Ctrl+C to stop the demo."

docker-compose down
dropVolumeData
docker-compose pull
docker-compose up -d

until [ "$(curl -s -o /dev/null -w ''%{http_code}'' $HOST:$PORT/health/readiness)" -eq 200 ]; do
  echo "[INFO] Waiting for backend to be ready..."
  sleep 5
done
echo "[INFO] Backend is ready."

echo "[INFO] Worker container started."

call_backend() {
  local CALL_BACKEND_METHOD="$1"
  local CALL_BACKEND_ENDPOINT="$HOST:$PORT$2"
  local CALL_BACKEND_TOKEN="$(refresh_and_get_token)"
  local CALL_BACKEND_BODY="$3"

  RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" -X $CALL_BACKEND_METHOD -H "Authorization: Bearer $CALL_BACKEND_TOKEN" -H "Content-Type: application/json" -d "$CALL_BACKEND_BODY" $CALL_BACKEND_ENDPOINT)

  RESPONSE_BODY=$(echo "$RESPONSE" | sed -e 's/HTTPSTATUS\:.*//g')
  RESPONSE_HTTP_STATUS=$(echo "$RESPONSE" | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')

  if ! echo "$RESPONSE_HTTP_STATUS" | grep -qE '^[0-9]+$'; then
    echo "ERROR RESPONSE: " "$RESPONSE_BODY" >&2
    exit_on_error "Invalid HTTP status: $RESPONSE_HTTP_STATUS"
  elif [ "$RESPONSE_HTTP_STATUS" -lt 200 ] || [ "$RESPONSE_HTTP_STATUS" -ge 300 ]; then
    echo "ERROR RESPONSE: " "$RESPONSE_BODY" >&2
    exit_on_error "Backend returned HTTP status $RESPONSE_HTTP_STATUS."
  elif echo "$RESPONSE_BODY" | jq . >/dev/null 2>&1; then
    echo "$RESPONSE_BODY"
  else
    exit_on_error "Failed to parse JSON response."
  fi
}

check_workers_available() {
  local WORKERS_RESPONSE=$(call_backend "GET" "/admin/worker")
  local WORKERS_WITH_LAST_SEEN=$(echo "$WORKERS_RESPONSE" | jq -r '.edges[] | select(.node.last_seen_at != null) | .node.id' | wc -l)
  
  if [ "$WORKERS_WITH_LAST_SEEN" -eq 0 ]; then
    echo "[INFO] No workers detected yet..."
    return 1
  fi
  
  if [ "$WORKERS_WITH_LAST_SEEN" -lt "$NUM_WORKERS" ]; then
    echo "[INFO] Waiting for workers to be active... (Active workers: $WORKERS_WITH_LAST_SEEN/$NUM_WORKERS)"
    return 1
  fi

  echo "[INFO] All workers are available and active."
  return 0
}

#
# STEP 1
#
step "Step 1" "Create a processor - getting the processor_id to request processing."
PROCESSOR_CREATE_RESPONSE=$(call_backend "POST" "/admin/processor" "{
            \"name\": \"DroidAugmentor\",
            \"version\": \"0.0.1\",
            \"image_tag\": \"malwaredatalab/droidaugmentor:latest\",
            \"description\": \"Expande datasets de malware\",
            \"tags\": \"one,two,three\",
            \"allowed_mime_types\": \"text/csv\",
            \"visibility\": \"HIDDEN\",
            \"configuration\": {
                \"parameters\": [
                    {
                      \"sequence\": 1, \"type\": \"STRING\", \"is_required\": false, \"default_value\": null,
                      \"name\": \"data_type\", \"description\": \"data_type\"
                    },
                    {
                      \"sequence\": 2, \"type\": \"STRING\", \"is_required\": false, \"default_value\": null,
                      \"name\": \"num_samples_class_malware\", \"description\": \"num_samples_class_malware\"
                    },
                    {
                      \"sequence\": 3, \"type\": \"STRING\", \"is_required\": false, \"default_value\": null,
                      \"name\": \"num_samples_class_benign\", \"description\": \"num_samples_class_benign\"
                    },
                    {
                      \"sequence\": 4, \"type\": \"STRING\", \"is_required\": false, \"default_value\": null,
                      \"name\": \"number_epochs\", \"description\": \"number_epochs\"
                    },
                    {
                      \"sequence\": 5, \"type\": \"STRING\", \"is_required\": false, \"default_value\": null,
                      \"name\": \"k_fold\", \"description\": \"k_fold\"
                    },
                    {
                      \"sequence\": 6, \"type\": \"STRING\", \"is_required\": false, \"default_value\": null,
                      \"name\": \"initializer_mean\", \"description\": \"initializer_mean\"
                    },
                    {
                      \"sequence\": 7, \"type\": \"STRING\", \"is_required\": false, \"default_value\": null,
                      \"name\": \"initializer_deviation\", \"description\": \"initializer_deviation\"
                    },
                    {
                      \"sequence\": 8, \"type\": \"STRING\", \"is_required\": false, \"default_value\": null,
                      \"name\": \"latent_dimension\", \"description\": \"latent_dimension\"
                    },
                    {
                      \"sequence\": 9, \"type\": \"STRING\", \"is_required\": false, \"default_value\": null,
                      \"name\": \"training_algorithm\", \"description\": \"training_algorithm\"
                    },
                    {
                      \"sequence\": 10, \"type\": \"STRING\", \"is_required\": false, \"default_value\": null,
                      \"name\": \"activation_function\", \"description\": \"activation_function\"
                    },
                    {
                      \"sequence\": 11, \"type\": \"STRING\", \"is_required\": false, \"default_value\": null,
                      \"name\": \"dropout_decay_rate_g\", \"description\": \"dropout_decay_rate_g\"
                    },
                    {
                      \"sequence\": 12, \"type\": \"STRING\", \"is_required\": false, \"default_value\": null,
                      \"name\": \"dropout_decay_rate_d\", \"description\": \"dropout_decay_rate_d\"
                    },
                    {
                      \"sequence\": 13, \"type\": \"STRING\", \"is_required\": false, \"default_value\": null,
                      \"name\": \"dense_layer_sizes_g\", \"description\": \"dense_layer_sizes_g\"
                    },
                    {
                      \"sequence\": 14, \"type\": \"STRING\", \"is_required\": false, \"default_value\": null,
                      \"name\": \"dense_layer_sizes_d\", \"description\": \"dense_layer_sizes_d\"
                    },
                    {
                      \"sequence\": 15, \"type\": \"STRING\", \"is_required\": false, \"default_value\": null,
                      \"name\": \"batch_size\", \"description\": \"batch_size\"
                    },
                    {
                      \"sequence\": 16, \"type\": \"STRING\", \"is_required\": false, \"default_value\": null,
                      \"name\": \"verbosity\", \"description\": \"verbosity\"
                    },
                    {
                      \"sequence\": 17, \"type\": \"STRING\", \"is_required\": false, \"default_value\": null,
                      \"name\": \"save_models\", \"description\": \"save_models\"
                    },
                    {
                      \"sequence\": 18, \"type\": \"STRING\", \"is_required\": false, \"default_value\": null,
                      \"name\": \"path_confusion_matrix\", \"description\": \"path_confusion_matrix\"
                    },
                    {
                      \"sequence\": 19, \"type\": \"STRING\", \"is_required\": false, \"default_value\": null,
                      \"name\": \"path_curve_loss\", \"description\": \"path_curve_loss\"
                    }
                ],
                \"dataset_input_argument\": \"input_dataset\",
                \"dataset_input_value\": \"/droidaugmentor/shared/inputs\",
                \"dataset_output_argument\": \"output_dir\",
                \"dataset_output_value\": \"/droidaugmentor/shared/outputs\",
                \"command\": \"/droidaugmentor/shared/app_run.sh\",
                \"output_result_file_glob_patterns\": [\"*\"],
                \"output_metrics_file_glob_patterns\": [\"*\"]
            }
        }")
PROCESSOR_ID=$(echo "$PROCESSOR_CREATE_RESPONSE" | jq -r .id)
if [ -z "$PROCESSOR_ID" ] || [ "$PROCESSOR_ID" = "null" ]; then
  exit_on_error "Failed to create processor. Processor ID is missing."
fi
echo "Processor ID: $PROCESSOR_ID"


#
# STEP 2
#
step "Step 2" "Create a registration token to register a worker."
WORKER_REGISTRATION_TOKEN=$(call_backend "POST" "/admin/worker/registration-token" "{
  \"is_unlimited_usage\": true
}" | jq -r .token)
if [ -z "$WORKER_REGISTRATION_TOKEN" ] || [ "$WORKER_REGISTRATION_TOKEN" = "null" ]; then
  exit_on_error "Failed to create worker registration token."
fi
echo "Worker Registration Token: $WORKER_REGISTRATION_TOKEN"
echo
echo "[INFO] To start a worker on a remote server, run this command:"
echo "docker run --rm --network host \\"
echo "  -v /var/run/docker.sock:/var/run/docker.sock \\"
echo "  -v autodroid_worker_data:/usr/app/temp:rw \\"
echo "  --pull always $WORKER_IMAGE_NAME \\"
echo "  -u \"http://<<THIS_BACKEND_MACHINE_NETWORK_IP>>:$PORT\" \\"
echo "  -n \"remote_worker_X\" \\"
echo "  -t \"$WORKER_REGISTRATION_TOKEN\""
echo
echo "Remember to replace <<THIS_BACKEND_MACHINE_NETWORK_IP>> with the IP address of the target machine in the network."
echo "Replace X with the worker number, for example, if you want to start 2 workers, you should run the command 2 times, with remote_worker_1 and remote_worker_2 as the worker names."
echo "Also create the folder /usr/app/temp in the target machine before running the command."
echo
echo "[INFO] The script will start $NUM_WORKERS local worker(s)."
echo "[INFO] Press Enter to continue after starting all workers (local and remote)..."
read dummy


#
# STEP 3
#
step "Step 3" "Start $NUM_WORKERS worker container(s)."
if [ "$NUM_WORKERS" -gt 0 ]; then
  for i in $(seq 1 "$NUM_WORKERS"); do
    CONTAINER_NAME="${CONTAINER_NAME_PREFIX}_${i}"
    
    docker run --name "$CONTAINER_NAME" --rm --network host \
      -v /var/run/docker.sock:/var/run/docker.sock \
      -v "$VOLUME_NAME":/usr/app/temp:rw \
      --pull always "$WORKER_IMAGE_NAME" \
      -u "http://host.docker.internal:$PORT" \
      -n "$CONTAINER_NAME" \
      -t "$WORKER_REGISTRATION_TOKEN" &
    
    echo "Worker container $CONTAINER_NAME started."
  done

  while ! check_workers_available; do
    sleep 5
  done
else
  echo "[INFO] No local workers will be started."
  echo "[INFO] Waiting for at least one remote worker to be available..."
  while ! check_workers_available; do
    sleep 5
  done
fi

#
# STEP 4
#
step "Step 4" "Create a dataset - getting the upload_url to send it."
echo "Dataset Information" "Size: $FILE_SIZE bytes" "MD5 Hash: $FILE_MD5" "MIME Type: $MIME_TYPE"
DATASET_CREATE_RESPONSE=$(call_backend "POST" "/dataset" "{
  \"description\": \"Test dataset\",
  \"tags\": \"test,remove\",
  \"filename\": \"dataset_example.csv\",
  \"md5_hash\": \"$FILE_MD5\",
  \"size\": $FILE_SIZE,
  \"mime_type\": \"$MIME_TYPE\"
}")
DATASET_ID=$(echo "$DATASET_CREATE_RESPONSE" | jq -r .id)
UPLOAD_URL=$(echo "$DATASET_CREATE_RESPONSE" | jq -r .file.upload_url)

if [ -z "$DATASET_ID" ] || [ "$DATASET_ID" = "null" ]; then
  exit_on_error "Failed to create dataset. Dataset ID is missing."
fi

if [ -z "$UPLOAD_URL" ] || [ "$UPLOAD_URL" = "null" ]; then
  exit_on_error "Failed to create dataset. Upload URL is missing."
fi

echo "Dataset ID: $DATASET_ID"

#
# STEP 5
#
step "Step 5" "Upload the dataset to the storage provider."
UPLOAD_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" -X PUT -H "Content-Type: $MIME_TYPE" --data-binary @"$DATASET_FILE_PATH" "$UPLOAD_URL")
UPLOAD_RESPONSE_BODY=$(echo "$UPLOAD_RESPONSE" | sed -e 's/HTTPSTATUS\:.*//g')
UPLOAD_HTTP_STATUS=$(echo "$UPLOAD_RESPONSE" | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')

if ! echo "$UPLOAD_HTTP_STATUS" | grep -qE '^[0-9]+$'; then
  echo "ERROR RESPONSE: " "$UPLOAD_RESPONSE" >&2
  exit_on_error "Invalid HTTP status: $UPLOAD_HTTP_STATUS"
elif [ "$UPLOAD_HTTP_STATUS" -ne 200 ]; then
  echo "ERROR RESPONSE: " "$UPLOAD_RESPONSE" >&2
  exit_on_error "Failed to upload dataset. HTTP status $UPLOAD_HTTP_STATUS."
else
  echo "[INFO] Dataset uploaded successfully."
  
  DATASET_URL_RESPONSE=$(call_backend "GET" "/dataset/$DATASET_ID")
  DATASET_PUBLIC_URL=$(echo "$DATASET_URL_RESPONSE" | jq -r .file.public_url)
  if [ -z "$DATASET_PUBLIC_URL" ] || [ "$DATASET_PUBLIC_URL" = "null" ]; then
    echo "[WARNING] Could not get dataset public URL."
  fi
fi

#
# STEP 6
#
step "Step 6" "Request processing for the dataset(s)."
PROCESSING_REQUEST_IDS=""

for i in $(seq 1 "$NUM_PROCESSING_REQUESTS"); do
  echo "[INFO] Requesting processing job $i of $NUM_PROCESSING_REQUESTS"
  PROCESSING_REQUEST_RESPONSE=$(call_backend "POST" "/processing" "{
    \"dataset_id\": \"$DATASET_ID\",
    \"processor_id\": \"$PROCESSOR_ID\",
    \"parameters\": []
  }")
  PROCESSING_REQUEST_ID=$(echo "$PROCESSING_REQUEST_RESPONSE" | jq -r .id)
  if [ -z "$PROCESSING_REQUEST_ID" ] || [ "$PROCESSOR_ID" = "null" ]; then
    exit_on_error "Failed to request processing. Processing Request ID is missing."
  fi
  PROCESSING_REQUEST_IDS="$PROCESSING_REQUEST_IDS $PROCESSING_REQUEST_ID"
  echo "Processing Request ID $i: $PROCESSING_REQUEST_ID"
done

#
# STEP 7
#
step "Step 7" "Check the processing status for all requests - Waiting for all processing to finish."
check_worker_container() {
  local running_workers=$(docker ps -q -f name="$CONTAINER_NAME_PREFIX" | wc -l)
  if [ "$running_workers" -lt "$NUM_WORKERS" ]; then
    exit_on_error "Not all worker containers are running. Expected $NUM_WORKERS, found $running_workers. Please restart the demo."
  fi
}

check_all_processing_complete() {
  local all_complete=true
  local all_succeeded=true
  local result_urls=""
  local metric_urls=""
  local first=true

  for request_id in $PROCESSING_REQUEST_IDS; do
    PROCESSING_STATUS_RESPONSE=$(call_backend "GET" "/processing/$request_id")
    PROCESSING_STATUS=$(echo "$PROCESSING_STATUS_RESPONSE" | jq -r .status)

    if [ "$PROCESSING_STATUS" = "SUCCEEDED" ]; then
      local result_url=$(echo "$PROCESSING_STATUS_RESPONSE" | jq -r .result_file.public_url)
      local metrics_url=$(echo "$PROCESSING_STATUS_RESPONSE" | jq -r .metrics_file.public_url)
      
      if [ -n "$result_url" ] && [ -n "$metrics_url" ]; then
        if [ "$first" = true ]; then
          result_urls="$result_url"
          metric_urls="$metrics_url"
          first=false
        else
          result_urls="$result_urls|$result_url"
          metric_urls="$metric_urls|$metrics_url"
        fi
      else
        all_complete=false
        echo "[WARNING] Processing request $request_id is missing result or metrics URL"
      fi
    elif [ "$PROCESSING_STATUS" = "FAILED" ]; then
      all_succeeded=false
      echo "[ERROR] Processing request $request_id FAILED."
    else
      all_complete=false
      echo "[INFO] Processing request $request_id status: $PROCESSING_STATUS"
    fi
  done

  if [ "$all_complete" = true ]; then
    if [ "$all_succeeded" = true ]; then
      echo "All processing requests completed successfully."
      PROCESSING_RESULT_URLS="$result_urls"
      PROCESSING_METRICS_URLS="$metric_urls"
      return 0
    else
      exit_on_error "One or more processing requests failed."
    fi
  fi
  return 1
}

while true; do
  check_worker_container
  
  if check_all_processing_complete; then
    break
  fi
  
  sleep 5
done

RESULTS_MESSAGE="Project demonstration finished.\n"
i=1
for result_url in $(echo "$PROCESSING_RESULT_URLS" | tr '|' ' '); do
  metrics_url=$(echo "$PROCESSING_METRICS_URLS" | tr '|' ' ' | cut -d' ' -f$i)
  RESULTS_MESSAGE="$RESULTS_MESSAGE\nProcessing Request $i Results:\n"
  RESULTS_MESSAGE="$RESULTS_MESSAGE Result File URL: $result_url\n"
  RESULTS_MESSAGE="$RESULTS_MESSAGE Metrics File URL: $metrics_url\n"
  i=$((i + 1))
done
RESULTS_MESSAGE="$RESULTS_MESSAGE\nOriginal Dataset URL: $DATASET_PUBLIC_URL\n"
RESULTS_MESSAGE="$RESULTS_MESSAGE Homepage: https://malwaredatalab.github.io/\n"
RESULTS_MESSAGE="$RESULTS_MESSAGE Engineer: Luiz Felipe Laviola <luiz@laviola.dev>\n"
RESULTS_MESSAGE="$RESULTS_MESSAGE Enjoy!"

stop "$RESULTS_MESSAGE"
