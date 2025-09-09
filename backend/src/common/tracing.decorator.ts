import { trace } from '@opentelemetry/api';

/**
 * A decorator that wraps a method in an OpenTelemetry span, automatically tracing its execution time,
 * recording errors, and linking it to the parent request trace.
 */
export function Trace() {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;
    const tracer = trace.getTracer('default');
    const className = target.constructor.name;

    descriptor.value = function (...args: any[]) {
      const spanName = `${className}.${propertyKey}`;
      return tracer.startActiveSpan(spanName, (span) => {
        try {
          const result = originalMethod.apply(this, args);
          // Handle async methods
          if (result instanceof Promise) {
            return result.finally(() => span.end());
          }
          // Handle sync methods
          span.end();
          return result;
        } catch (error) {
          span.recordException(error);
          span.end();
          throw error;
        }
      });
    };
    return descriptor;
  };
}