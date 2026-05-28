"""
Arize Phoenix observability integration — Phase 3 partner requirement.

Instruments all Gemini (google-genai) and agent calls with OpenTelemetry traces
that are sent to an Arize Phoenix collector, giving judges live visibility into:
  • every LLM prompt / completion
  • agent chain execution order
  • latency and token counts per step

Setup
-----
Local (self-hosted Phoenix):
    pip install arize-phoenix opentelemetry-sdk openinference-instrumentation-google-genai
    phoenix serve          # starts collector at http://localhost:6006

Cloud (Arize SaaS):
    Set ARIZE_API_KEY and ARIZE_SPACE_KEY in .env

Env vars
--------
ARIZE_API_KEY        Arize SaaS API key (leave empty for local Phoenix)
ARIZE_SPACE_KEY      Arize SaaS space key
PHOENIX_COLLECTOR_ENDPOINT  Override collector URL (default: http://localhost:6006/v1/traces)
OTEL_SERVICE_NAME    Service name shown in traces (default: orchestro-ai)
"""

from __future__ import annotations

import logging
import os

logger = logging.getLogger(__name__)


def setup_tracing() -> bool:
    """
    Configure OpenTelemetry tracing for Arize Phoenix.

    Returns True if tracing was successfully initialised, False otherwise.
    This function is intentionally best-effort — a missing package or
    unreachable collector never blocks the application from starting.
    """
    try:
        from opentelemetry import trace as otel_trace
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export import BatchSpanProcessor
        from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
        from opentelemetry.sdk.resources import Resource
    except ImportError:
        logger.info(
            "Arize/Phoenix: opentelemetry packages not installed — tracing disabled. "
            "Install with: pip install arize-phoenix opentelemetry-sdk opentelemetry-exporter-otlp"
        )
        return False

    arize_api_key   = os.environ.get("ARIZE_API_KEY", "")
    arize_space_key = os.environ.get("ARIZE_SPACE_KEY", "")
    service_name    = os.environ.get("OTEL_SERVICE_NAME", "orchestro-ai")

    # ── Choose collector endpoint ──────────────────────────────────────────
    if arize_api_key and arize_space_key:
        # Arize SaaS endpoint
        endpoint = "https://otlp.arize.com/v1/traces"
        headers  = {
            "api_key":   arize_api_key,
            "space_key": arize_space_key,
        }
        logger.info("Arize: routing traces to Arize SaaS (space_key=%s…)", arize_space_key[:6])
    else:
        # Local Phoenix (or custom endpoint)
        endpoint = os.environ.get(
            "PHOENIX_COLLECTOR_ENDPOINT",
            "http://localhost:6006/v1/traces",
        )
        headers  = {}
        logger.info("Arize: routing traces to local Phoenix at %s", endpoint)

    resource = Resource.create({"service.name": service_name})
    provider = TracerProvider(resource=resource)
    exporter = OTLPSpanExporter(endpoint=endpoint, headers=headers)
    provider.add_span_processor(BatchSpanProcessor(exporter))
    otel_trace.set_tracer_provider(provider)

    # ── Auto-instrument google-genai ───────────────────────────────────────
    try:
        from openinference.instrumentation.google_genai import GoogleGenAIInstrumentor  # type: ignore
        GoogleGenAIInstrumentor().instrument()
        logger.info("Arize: google-genai instrumented — all LLM calls will be traced")
    except ImportError:
        logger.info(
            "Arize: openinference-instrumentation-google-genai not installed — "
            "LLM calls won't be auto-traced. Install with: "
            "pip install openinference-instrumentation-google-genai"
        )

    return True
