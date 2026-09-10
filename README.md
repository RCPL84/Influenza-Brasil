## Monitoring & Audit

This repository includes a local monitoring stack and an audit-exporter that ships admin/audit events from Redis into Loki (logs) and Prometheus (metrics). Use this for local validation and short-term testing — for production use a managed log/metrics solution and secure access to Grafana/Loki.

Files and services added

- docker-compose.monitor.yml — runs Prometheus, Grafana, Loki, and the audit-exporter. Start with:

  docker compose -f docker-compose.monitor.yml up -d

- scripts/audit-exporter.js — tails Redis stream `audit:events` (via Redis consumer-groups), pushes batched JSON logs to Loki, and exposes Prometheus metrics at `/metrics` (port 9400).

- scripts/Dockerfile.audit-exporter — Dockerfile for the audit-exporter.

- loki/local-config.yaml — minimal Loki local config for dev.

- grafana/dashboard.json — Grafana dashboard skeleton for app metrics.

How it works

- The application writes audit events to a Redis stream `audit:events` (server-side admin actions like key create/revoke/rotate, token issues, etc.).
- The audit-exporter runs a Redis consumer-group to reliably read new entries, batches them, sends them to Loki as structured JSON logs, then acknowledges them in Redis.
- The exporter also increments Prometheus counters:
  - `audit_events_total{action="..."}`
  - `audit_events_by_key_total{keyId="..."}`

Local run / verification

1. Start application + Redis:

   docker compose up -d

2. Start monitoring stack (build first to build the exporter image):

   docker compose -f docker-compose.monitor.yml build
   docker compose -f docker-compose.monitor.yml up -d

3. Configure Grafana data sources (inside Grafana UI):
   - Prometheus: http://prometheus:9090 (or http://localhost:9090)
   - Loki: http://loki:3100 (or http://localhost:3100)

4. Verify exporter metrics:
   - curl http://localhost:9400/metrics

5. Inspect logs in Grafana (Explore -> Loki) with LogQL:
   - {job="audits"} | json
   - {job="audits", action="admin.rotate_key"} | json

6. Example Prometheus queries:
   - rate(audit_events_total[5m])
   - topk(10, sum by (keyId) (increase(audit_events_by_key_total[5m])))

Security & production notes

- Protect Grafana and Loki behind authentication and network controls. Audit logs can contain sensitive identifiers — treat them as sensitive data.
- Use a secret manager for ADMIN_SECRET, APP_JWT_SECRET, and GEMINI_API_KEY.
- For production reliability and scale, tune the exporter:
  - Adjust consumer-group/XAUTOCLAIM thresholds and batch sizes.
  - Add robust retries and error handling for Loki.
  - Consider a centralized logging pipeline (managed Loki, ELK, Splunk, Datadog, etc.) with RBAC and retention policies.

