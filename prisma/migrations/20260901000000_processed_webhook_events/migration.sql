-- Migration: processed_webhook_events
-- Adds an idempotency log so the Stripe webhook handler can detect and skip
-- replayed events (`checkout.session.completed`, `charge.refunded`, etc.).
-- Strictly additive — no changes to existing tables.

CREATE TABLE "ProcessedWebhookEvent" (
    "eventId"    TEXT NOT NULL PRIMARY KEY,
    "source"     TEXT NOT NULL DEFAULT 'stripe',
    "eventType"  TEXT NOT NULL,
    "receivedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "ProcessedWebhookEvent_source_receivedAt_idx"
    ON "ProcessedWebhookEvent"("source", "receivedAt");
