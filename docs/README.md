# PaperDrill documentation

This directory contains the Mintlify documentation site for PaperDrill.

## Local development

Install the Mintlify CLI, then start the documentation server from this directory:

```bash
npm install --global mint
mint dev
```

The local preview is available at `http://localhost:3000`.

## Validation

Run these checks before publishing documentation changes:

```bash
mint validate
mint broken-links
mint a11y
```

`openapi.yaml` is the public contract for developer-facing REST endpoints. Keep request fields, response schemas, authentication requirements, scopes, and examples aligned with `backend/src`.

Mintlify deploys from the `/docs` monorepo path. Production should use `docs.paperdrill.dev`.
