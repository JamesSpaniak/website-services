const { S3Client, PutObjectTaggingCommand } = require("@aws-sdk/client-s3");

const s3 = new S3Client();

exports.handler = async (event) => {
  const detail = event.detail;
  const status = detail.status;
  const sourceKey = detail.userMetadata?.sourceKey;

  if (!sourceKey) {
    console.log("No sourceKey in userMetadata, skipping");
    return;
  }

  console.log(`MediaConvert job ${status} for source: ${sourceKey}`);

  const tagValue = status === "COMPLETE" ? "done" : "error";

  await s3.send(
    new PutObjectTaggingCommand({
      Bucket: process.env.RAW_BUCKET,
      Key: sourceKey,
      Tagging: {
        TagSet: [
          { Key: "transcode-status", Value: tagValue },
          { Key: "completed-at", Value: new Date().toISOString() },
        ],
      },
    })
  );

  console.log(`Tagged s3://${process.env.RAW_BUCKET}/${sourceKey} with transcode-status=${tagValue}`);
};
