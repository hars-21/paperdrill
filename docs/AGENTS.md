# PaperDrill documentation guidelines

## Project scope

- This directory is the source of truth for PaperDrill's public documentation.
- The site is built and hosted with Mintlify.
- Pages use MDX with YAML frontmatter. Site configuration lives in `docs.json`.
- Run `mint dev` from this directory to preview the site at `http://localhost:3000`.

## Writing style

- Use active voice and address the reader as “you”.
- Keep sentences concise and headings in sentence case.
- Use “simulated funds,” not “fake money” or “real funds.”
- Use “API key” and “WebSocket” consistently.
- Format commands, paths, fields, and enum values as code.
- State required API-key scopes next to protected endpoints.

## Accuracy

- Verify public REST routes against `backend/src` before changing endpoint documentation.
- Verify WebSocket channels and payloads against the backend and worker implementations.
- Represent prices, quantities, balances, and other decimal API values as strings.
- Never document internal admin endpoints, credentials, infrastructure secrets, or production topology.
- Do not describe planned competitions or challenges as available until they are released.

## Links

- Use relative links for pages inside this documentation site.
- Use absolute `https://paperdrill.dev` links for the platform and dashboard.
- Use `https://api.paperdrill.dev/v1` as the REST base URL.
- Use `wss://api.paperdrill.dev` as the public WebSocket URL.
