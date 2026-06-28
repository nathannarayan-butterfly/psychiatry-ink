# Subprocessors

**Suggested URL:** `/en/subprocessors`  
**Last updated:** 27 June 2026

This page lists third-party providers that Psychiatry Ink Ltd uses, or may use, to provide Psychiatry.Ink. A subprocessor is a provider that processes personal data on behalf of Psychiatry Ink Ltd where Psychiatry Ink Ltd acts as processor for a customer.

Do not publish providers as “current” until they are actually active in production.

## Controller and processor context

For clinical workspace data, the customer is usually the controller and Psychiatry Ink Ltd is usually the processor. The providers below may act as subprocessors depending on which features the customer uses.

For account, billing, website, and business-administration data, some providers may act as independent controllers or processors depending on their role and contract.

## Current subprocessors

| Provider | Purpose | Data categories | Processing location | Safeguards / notes |
|---|---|---|---|---|
| Google Cloud | Hosting, infrastructure, logging, deployment, storage, compute | Application data, logs, metadata, encrypted content where applicable | **[insert selected regions, e.g. EU/UK]** | Use region-restricted deployment where configured; DPA required |
| Supabase | Database, authentication, storage, backend services | Account data, app data, metadata, encrypted content where applicable | **[insert region]** | DPA required; confirm production region |
| Stripe | Payments, subscriptions, billing, invoices, tax metadata | Billing contact data, payment metadata, invoice data | Global / provider-controlled | Stripe may act as independent controller for some payment processing |
| Google Workspace | Business email, support inbox, administrative communication | Emails, contact messages, attachments voluntarily provided | **[insert region/control setting]** | Do not send patient data by email unless authorised |
| Resend (Resend, Inc.) | Transactional and system email (account confirmation, password reset, notifications) | Recipient email addresses, email content and subject lines, delivery metadata | USA (third-country transfer); infrastructure on AWS | DPA in place; transfers safeguarded under EU Standard Contractual Clauses (and EU–US Data Privacy Framework where applicable) |

## Feature-specific AI subprocessors

These providers are used only when the relevant AI feature, model, or mode is enabled.

| Provider | Purpose | Data categories | Processing location | Safeguards / notes |
|---|---|---|---|---|
| OpenAI | AI drafting, summarisation, editing, transcription, clinical text support | Prompts, selected text, generated output, model metadata | **[insert region/contract setting]** | Use only under appropriate API/DPA configuration; minimise identifiers |
| Google / Gemini | AI drafting, generation, summarisation, text support | Prompts, selected text, generated output, model metadata | **[insert region/contract setting]** | Use only under appropriate API/DPA configuration; minimise identifiers |
| DeepSeek | AI drafting or economic model mode | Prompts, selected text, generated output, model metadata | **[insert region/contract setting]** | Do not enable for production clinical data unless transfer, DPA, and risk assessment are approved |
| Mistral AI | AI model processing, if enabled | Prompts, selected text, generated output, model metadata | **[insert region/contract setting]** | Optional provider; include only if active |

## Optional or planned providers

Move providers from this section to “Current subprocessors” only after they are active in production.

| Provider | Planned purpose | Status |
|---|---|---|
| LiveKit | Video consultation or voice-chat infrastructure | Optional / country-specific |
| Sentry / Logtail / Datadog / similar | Error monitoring and diagnostics | **[choose one or remove]** |
| Analytics provider | Website analytics | **[choose provider or state none]** |

## Changes to subprocessors

We may update this page when providers change. Where required by the Data Processing Agreement, we will provide notice of material new subprocessors and allow customers to object on reasonable data-protection grounds within the stated objection period.

## Customer responsibility

Customers should review this list before using production clinical data and should ensure that use of Psychiatry.Ink, selected AI providers, country settings, and data-transfer safeguards are compatible with their own legal and institutional obligations.
