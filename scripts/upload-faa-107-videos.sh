#!/usr/bin/env bash
set -euo pipefail

# Upload the reviewed FAA 107 lesson videos with stable, URL-safe S3 keys.
# Add a mapping only after its source recording has one unambiguous course node.

SOURCE_DIR="assets/courses/faa-107/videos"
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
# Not mapped (author decisions Aug 23 2026):
#   "#1 registration 3-13.mp4"          — confirmed same content as the live u131 video; do not upload
#   "#1 night ops 7-13.mp4"             — author reviewing vs "fly at night 18" (u17); u171/u172 are candidates if distinct
#   "Part 107 - 11 Applicablity V1.mov" — old V1, superseded by "#1 applicability, 1-13.mp4"
# The combined falsification/accident recording sits on u132 for now (u131 keeps
# registration); revisit when the u131/u132 text is split or combined.
MAPPINGS=(
  "u11|#1 applicability, 1-13.mp4|faa-107-u11-applicability.mp4"
  "u12|#1 roles, 2-13.mp4|faa-107-u12-crew-roles.mp4"
  "u131|#1 registration& inspection 3-13.mp4|faa-107-u131-registration-inspection.mp4"
  "u133|#1 medical, alchol 5-13.mp4|faa-107-u133-medical-alcohol-drugs.mp4"
  "u132|#1 falsification, accident reports 4-13.mp4|faa-107-u132-falsification-accident-reporting.mp4"
  "u140|#1 over people 6-13.mp4|faa-107-u140-over-people-general.mp4"
  "u135|#1 multiple flights 9-13.mp4|faa-107-u135-vlos-multi-aircraft.mp4"
  "u138|#1 preflight familiarization 10-13.mp4|faa-107-u138-preflight-familiarization.mp4"
  "u14|#1 waivers 11-13.mp4|faa-107-u14-waivers.mp4"
  "u15|#1 remote ID intro 12-13.mp4|faa-107-u15-remote-id-intro.mp4"
  "u151|#1 stardard remote ID 13-13.mp4|faa-107-u151-standard-remote-id.mp4"
  "u152|#1 remote ID broadcast module 14.mp4|faa-107-u152-remote-id-broadcast-module.mp4"
  "u153|#1 FAA recognized ID areas 15.mp4|faa-107-u153-fria.mp4"
  "u161|#1 Means & declaration of compliance #16.mp4|faa-107-u161-means-declaration-compliance.mp4"
  "u165|#1 categories over ppl, obj #17.mp4|faa-107-u165-category-operations.mp4"
  "u17|#1 fly at night 18.mp4|faa-107-u17-night-operations.mp4"
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

  # Skip if the transcoded HLS output already exists (raw bucket has a 7-day
  # lifecycle, so check the media bucket). Delete the HLS prefix to re-upload.
  base_name="${upload_name%.*}"
  hls_key="courses/videos/$base_name/$base_name.m3u8"
  if aws s3api head-object --bucket "$MEDIA_BUCKET" --key "$hls_key" --region "$REGION" >/dev/null 2>&1; then
    echo "Skipping $unit_id: $hls_key already transcoded"
    continue
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
    if aws s3api head-object --bucket "$MEDIA_BUCKET" --key "$hls_key" --region "$REGION" >/dev/null 2>&1; then
      echo "$unit_id: HLS playlist present"
      break
    fi

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
