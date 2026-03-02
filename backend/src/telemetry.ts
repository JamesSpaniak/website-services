/**
 * OpenTelemetry SDK bootstrap — loaded via `--require` BEFORE NestJS starts.
 *
 * Ships metrics + traces to Grafana Cloud via OTLP (http/protobuf).
 * Required env vars (set in ECS task definition):
 *   OTEL_EXPORTER_OTLP_ENDPOINT   https://otlp-gateway-prod-us-east-2.grafana.net/otlp
 *   OTEL_EXPORTER_OTLP_HEADERS    Authorization=Basic <token>   (from Secrets Manager)
 *   OTEL_EXPORTER_OTLP_PROTOCOL   http/protobuf
 *   OTEL_SERVICE_NAME             droneedge
 *
 * When OTEL_EXPORTER_OTLP_ENDPOINT is absent the SDK still boots but exports
 * nothing, so local dev runs are unaffected.
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-proto';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

const resource = resourceFromAttributes({
  [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || 'droneedge',
  [ATTR_SERVICE_VERSION]: process.env.npm_package_version || '0.0.1',
});

const sdk = new NodeSDK({
  resource,
  traceExporter: endpoint ? new OTLPTraceExporter() : undefined,
  metricReader: endpoint
    ? new PeriodicExportingMetricReader({
        exporter: new OTLPMetricExporter(),
        exportIntervalMillis: 30_000,
      })
    : undefined,
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': { enabled: false },
    }),
  ],
});

sdk.start();

process.on('SIGTERM', () => {
  sdk.shutdown().catch(console.error);
});
