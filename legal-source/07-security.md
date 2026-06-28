# Security

**Suggested URL:** `/en/security`  
**Last updated:** 27 June 2026

Psychiatry.Ink is designed for psychiatric documentation and therefore treats confidentiality, minimisation, and controlled access as core product requirements.

This page provides a public overview. Detailed technical and organisational measures may be provided to customers under the Data Processing Agreement or security review process.

## 1. Security principles

Psychiatry.Ink is designed around the following principles:

- minimise direct patient identifiers;
- keep patient identity mapping local where possible;
- use encryption in transit and at rest;
- restrict access by role and organisation;
- log relevant security and audit events;
- separate customer data where applicable;
- avoid sending unnecessary identifiers to AI providers;
- keep clinicians responsible for final review and approval of outputs.

## 2. Local encrypted vault

Selected Psychiatry.Ink modes are designed so that patient names, dates of birth, and patient-to-document mapping can remain in a local encrypted browser vault on the clinician’s device.

Where this mode is enabled:

- the server should receive only case identifiers or pseudonymous references;
- the user’s device stores the identity mapping;
- loss of the local encryption key or vault may mean the data cannot be recovered;
- the customer remains responsible for endpoint security and backups where applicable.

## 3. Encryption

We use HTTPS/TLS for data in transit. Infrastructure providers may provide encryption at rest for stored data. Some local product components may use client-side encryption for sensitive mappings or local storage.

Encryption controls depend on the selected product configuration, browser, device, and infrastructure environment.

## 4. Access control

Psychiatry.Ink uses account-based access controls. Organisation features may include roles such as owner, admin, clinician, assistant, viewer, external consultant, or other role types depending on plan and configuration.

Users are responsible for protecting credentials, using strong passwords, enabling available authentication protections, and promptly removing users who should no longer have access.

## 5. Audit logging

The service may record audit and security logs such as login events, document actions, AI generation events, credit usage, access events, error events, and administrative actions. Audit log availability depends on plan and configuration.

## 6. AI data minimisation

AI features are designed to support drafting and documentation. Users should avoid unnecessary direct identifiers in prompts and source text. Where available, de-identification, privacy gates, or local-only modes should be used before sending clinical text to external AI providers.

AI output must always be reviewed by a qualified professional before clinical, legal, or administrative use.

## 7. Backups and recovery

Production infrastructure may include backups, snapshots, and recovery processes. Backup retention periods and recovery procedures depend on the final deployment configuration and customer plan.

Local encrypted vault data may not be recoverable by Psychiatry Ink Ltd if the user loses the local key, browser profile, or device storage.

## 8. Incident response

If we become aware of a security incident or personal data breach affecting customer data, we will investigate and notify affected customers where required by law and contract.

Security contact: **[security@psychiatry.ink – create mailbox if used]**  
Alternative contact: **data-protection@psychiatry.ink**

## 9. Responsible disclosure

If you believe you have found a vulnerability, contact us before disclosing it publicly. Please include enough information to reproduce the issue. Do not access, modify, download, or disclose data that does not belong to you.

## 10. Current limitations

No software system is completely secure. Psychiatry.Ink should not be used for production patient data until the relevant deployment, DPA, subprocessor list, data-transfer safeguards, retention settings, access controls, and privacy configuration have been approved for the intended jurisdiction and organisation.
