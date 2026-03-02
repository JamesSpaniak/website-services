const { MediaConvertClient, CreateJobCommand, DescribeEndpointsCommand } = require("@aws-sdk/client-mediaconvert");

let cachedEndpoint = null;

async function getEndpoint(region) {
  if (cachedEndpoint) return cachedEndpoint;
  const client = new MediaConvertClient({ region });
  const { Endpoints } = await client.send(new DescribeEndpointsCommand({ MaxResults: 1 }));
  cachedEndpoint = Endpoints[0].Url;
  return cachedEndpoint;
}

exports.handler = async (event) => {
  const region = process.env.AWS_REGION_CUSTOM || process.env.AWS_REGION;
  const record = event.Records[0];
  const bucket = record.s3.bucket.name;
  const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));
  const baseName = key.replace(/\.[^.]+$/, "");

  console.log(`Transcode triggered for s3://${bucket}/${key}`);

  const endpoint = await getEndpoint(region);
  const client = new MediaConvertClient({ region, endpoint });

  const params = {
    Role: process.env.MEDIACONVERT_ROLE,
    Settings: {
      Inputs: [
        {
          FileInput: `s3://${bucket}/${key}`,
          AudioSelectors: { "Audio Selector 1": { DefaultSelection: "DEFAULT" } },
          VideoSelector: {},
        },
      ],
      OutputGroups: [
        {
          Name: "HLS",
          OutputGroupSettings: {
            Type: "HLS_GROUP_SETTINGS",
            HlsGroupSettings: {
              Destination: `s3://${process.env.MEDIA_BUCKET}/${process.env.OUTPUT_PREFIX}/${baseName}/`,
              SegmentLength: 6,
              MinSegmentLength: 0,
            },
          },
          Outputs: [
            {
              NameModifier: "_720p",
              ContainerSettings: { Container: "M3U8" },
              VideoDescription: {
                Width: 1280,
                Height: 720,
                CodecSettings: {
                  Codec: "H_264",
                  H264Settings: {
                    RateControlMode: "QVBR",
                    QvbrSettings: { QvbrQualityLevel: 7 },
                    MaxBitrate: 3000000,
                  },
                },
              },
              AudioDescriptions: [
                {
                  CodecSettings: {
                    Codec: "AAC",
                    AacSettings: { Bitrate: 128000, CodingMode: "CODING_MODE_2_0", SampleRate: 48000 },
                  },
                },
              ],
            },
            {
              NameModifier: "_480p",
              ContainerSettings: { Container: "M3U8" },
              VideoDescription: {
                Width: 854,
                Height: 480,
                CodecSettings: {
                  Codec: "H_264",
                  H264Settings: {
                    RateControlMode: "QVBR",
                    QvbrSettings: { QvbrQualityLevel: 6 },
                    MaxBitrate: 1500000,
                  },
                },
              },
              AudioDescriptions: [
                {
                  CodecSettings: {
                    Codec: "AAC",
                    AacSettings: { Bitrate: 96000, CodingMode: "CODING_MODE_2_0", SampleRate: 48000 },
                  },
                },
              ],
            },
          ],
        },
      ],
    },
    UserMetadata: { sourceKey: key },
  };

  await client.send(new CreateJobCommand(params));
  console.log(`MediaConvert job submitted for ${key}`);
};
