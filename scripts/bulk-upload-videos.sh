#!/usr/bin/env bash
set -euo pipefail

# ──────────────────────────────────────────────────────────────────
# bulk-upload-videos.sh
#
# Uploads local video files to the raw-video S3 bucket.
# MediaConvert automatically transcodes them into HLS on upload.
#
# Usage:
#   ./scripts/bulk-upload-videos.sh <video-dir> [--bucket NAME] [--region REGION]
#
# Prerequisites:
#   - AWS CLI configured (aws sts get-caller-identity should succeed)
#   - Videos as .mp4, .mov, .mkv, or .webm files
#
# Output:
#   - Prints a JSON mapping of filename -> course video_url path
#   - Also writes the mapping to <video-dir>/video-mapping.json
#
# Authentication:
#   Uses standard AWS credential chain (~/.aws/credentials, env vars,
#   AWS_PROFILE, etc.) — same as any other AWS CLI command.
# ──────────────────────────────────────────────────────────────────

DEFAULT_BUCKET="personal-site-raw-video"
DEFAULT_REGION="us-east-1"
MEDIA_DOMAIN="media.thedroneedge.com"

usage() {
  echo "Usage: $0 <video-directory> [--bucket BUCKET] [--region REGION]"
  echo ""
  echo "Options:"
  echo "  --bucket   S3 raw video bucket name (default: $DEFAULT_BUCKET)"
  echo "  --region   AWS region (default: $DEFAULT_REGION)"
  echo ""
  echo "Example:"
  echo "  $0 ./course-videos"
  echo "  $0 ./course-videos --bucket my-raw-bucket --region us-west-2"
  exit 1
}

if [ $# -lt 1 ]; then
  usage
fi

VIDEO_DIR="$1"
shift

BUCKET="$DEFAULT_BUCKET"
REGION="$DEFAULT_REGION"

while [ $# -gt 0 ]; do
  case "$1" in
    --bucket) BUCKET="$2"; shift 2 ;;
    --region) REGION="$2"; shift 2 ;;
    *) echo "Unknown option: $1"; usage ;;
  esac
done

if [ ! -d "$VIDEO_DIR" ]; then
  echo "Error: '$VIDEO_DIR' is not a directory."
  exit 1
fi

echo "Checking AWS credentials..."
if ! aws sts get-caller-identity --region "$REGION" > /dev/null 2>&1; then
  echo "Error: AWS credentials not configured. Run 'aws configure' or set AWS_PROFILE."
  exit 1
fi

echo "Verifying bucket s3://$BUCKET exists..."
if ! aws s3api head-bucket --bucket "$BUCKET" --region "$REGION" 2>/dev/null; then
  echo "Error: Bucket '$BUCKET' does not exist or you don't have access."
  exit 1
fi

EXTENSIONS=("mp4" "mov" "mkv" "webm")
FILES=()

for ext in "${EXTENSIONS[@]}"; do
  while IFS= read -r -d '' file; do
    FILES+=("$file")
  done < <(find "$VIDEO_DIR" -maxdepth 1 -type f -iname "*.${ext}" -print0)
done

if [ ${#FILES[@]} -eq 0 ]; then
  echo "No video files (.mp4, .mov, .mkv, .webm) found in '$VIDEO_DIR'."
  exit 1
fi

echo ""
echo "Found ${#FILES[@]} video file(s) to upload:"
for f in "${FILES[@]}"; do
  basename "$f"
done
echo ""

MAPPING="{"
FIRST=true
UPLOADED=0
FAILED=0

for filepath in "${FILES[@]}"; do
  filename=$(basename "$filepath")
  base="${filename%.*}"

  echo "Uploading: $filename -> s3://$BUCKET/$filename"

  if aws s3 cp "$filepath" "s3://$BUCKET/$filename" --region "$REGION" 2>/dev/null; then
    UPLOADED=$((UPLOADED + 1))
    hls_path="courses/videos/${base}/${base}.m3u8"

    if [ "$FIRST" = true ]; then
      FIRST=false
    else
      MAPPING+=","
    fi
    MAPPING+="\"${base}\":\"${hls_path}\""

    echo "  -> Transcoded HLS will be at: https://$MEDIA_DOMAIN/$hls_path"
  else
    FAILED=$((FAILED + 1))
    echo "  -> FAILED to upload $filename"
  fi
done

MAPPING+="}"

echo ""
echo "========================================="
echo "Upload complete: $UPLOADED succeeded, $FAILED failed"
echo "========================================="
echo ""

MAPPING_FILE="${VIDEO_DIR}/video-mapping.json"
echo "$MAPPING" | python3 -m json.tool > "$MAPPING_FILE" 2>/dev/null || echo "$MAPPING" > "$MAPPING_FILE"

echo "Video mapping saved to: $MAPPING_FILE"
echo ""
echo "Use these paths as video_url values in your course JSON."
echo "MediaConvert will process each video automatically (typically 2-10 min)."
echo ""
echo "To check transcode status:"
echo "  aws s3api get-object-tagging --bucket $BUCKET --key <filename> --region $REGION"
cat "$MAPPING_FILE"
