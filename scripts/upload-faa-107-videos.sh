#!/usr/bin/env bash
set -euo pipefail

# Upload the reviewed FAA 107 lesson videos with stable, URL-safe S3 keys.
# Add a mapping only after its source recording has one unambiguous course node.

SOURCE_DIR="assets/courses"
RAW_BUCKET="droneedge-dev-raw-video"
MEDIA_BUCKET="droneedge-dev-media"
REGION="us-east-1"
WAIT=false

usage() {
  echo "Usage: $0 [--source-dir DIR] [--bucket NAME] [--region REGION] [--wait]"
}

while [ $# -gt 0 ]; do
  case "$1" in
    --source-dir) SOURCE_DIR="$2"; shift 2 ;;
    --bucket) RAW_BUCKET="$2"; shift 2 ;;
    --region) REGION="$2"; shift 2 ;;
    --wait) WAIT=true; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1"; usage; exit 1 ;;
  esac
done

# unit id | local filename | canonical upload filename
# The combined 4-13 recording is intentionally excluded. A node has one
# video_url, so fold its falsification segment into u131 and map its
# accident-reporting segment to u132 after editing.
MAPPINGS=(
  "u11|#1 applicability, 1-13.mp4|faa-107-u11-applicability.mp4"
  "u12|#1 roles, 2-13.mp4|faa-107-u12-crew-roles.mp4"
  "u131|#1 registration& inspection 3-13.mp4|faa-107-u131-registration-inspection.mp4"
  "u133|#1 medical, alchol 5-13.mp4|faa-107-u133-medical-alcohol-drugs.mp4"
)

if ! aws sts get-caller-identity --region "$REGION" >/dev/null 2>&1; then
  echo "Error: AWS credentials are not configured."
  exit 1
fi

if ! aws s3api head-bucket --bucket "$RAW_BUCKET" --region "$REGION" 2>/dev/null; then
  echo "Error: raw-video bucket '$RAW_BUCKET' is unavailable."
  exit 1
fi

for mapping in "${MAPPINGS[@]}"; do
  IFS="|" read -r unit_id local_name upload_name <<< "$mapping"
  local_path="$SOURCE_DIR/$local_name"

  if [ ! -f "$local_path" ]; then
    echo "Error: source video not found: $local_path"
    exit 1
  fi

  echo "Uploading $unit_id: $local_name -> s3://$RAW_BUCKET/$upload_name"
  aws s3 cp "$local_path" "s3://$RAW_BUCKET/$upload_name" --region "$REGION"
done

echo
echo "Course video_url mappings:"
for mapping in "${MAPPINGS[@]}"; do
  IFS="|" read -r unit_id _ upload_name <<< "$mapping"
  base_name="${upload_name%.*}"
  echo "$unit_id: courses/videos/$base_name/$base_name.m3u8"
done

if [ "$WAIT" != true ]; then
  echo
  echo "Uploads complete. MediaConvert continues asynchronously; rerun with --wait to verify outputs."
  exit 0
fi

echo
echo "Waiting for MediaConvert (up to 20 minutes)..."
deadline=$(( $(date +%s) + 1200 ))

for mapping in "${MAPPINGS[@]}"; do
  IFS="|" read -r unit_id _ upload_name <<< "$mapping"
  base_name="${upload_name%.*}"
  hls_key="courses/videos/$base_name/$base_name.m3u8"

  while true; do
    status=$(aws s3api get-object-tagging \
      --bucket "$RAW_BUCKET" \
      --key "$upload_name" \
      --region "$REGION" \
      --query "TagSet[?Key=='transcode-status'].Value | [0]" \
      --output text 2>/dev/null || true)

    if [ "$status" = "done" ]; then
      aws s3api head-object \
        --bucket "$MEDIA_BUCKET" \
        --key "$hls_key" \
        --region "$REGION" >/dev/null
      echo "$unit_id: transcode complete and HLS playlist verified"
      break
    fi

    if [ "$status" = "error" ]; then
      echo "Error: MediaConvert failed for $unit_id ($upload_name)."
      exit 1
    fi

    if [ "$(date +%s)" -ge "$deadline" ]; then
      echo "Error: timed out waiting for $unit_id ($upload_name)."
      exit 1
    fi

    sleep 15
  done
done

echo "All mapped FAA 107 videos are ready."
