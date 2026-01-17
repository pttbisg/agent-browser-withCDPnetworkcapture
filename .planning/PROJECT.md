# Agent-Browser Network Extension

## What This Is

A fork of Vercel's agent-browser that exposes Chrome DevTools Protocol (CDP) network capabilities. Enables capturing all network traffic for CLI-based search/querying and making authenticated API requests using the browser's session state (cookies, auth tokens).

## Core Value

Enable programmatic access to network data and authenticated requests through the browser session — the two capabilities CDP provides but agent-browser doesn't expose.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Network traffic capture — intercept and store all HTTP requests/responses with headers, body, timing
- [ ] Network search CLI — query captured traffic by URL, method, status, content patterns
- [ ] Authenticated requests — make API calls that reuse the browser's cookies and session state
- [ ] Response/payload inspection — retrieve full details (headers, body) for any captured request

### Out of Scope

- Request interception/blocking — no modifying or blocking requests mid-flight (v1 is read-only + make requests)
- Request modification — no altering requests before they're sent
- Performance profiling — capturing data only, not analyzing timing

## Context

- Vercel's agent-browser uses Playwright with Chromium under the hood
- CDP (Chrome DevTools Protocol) already supports network interception via Network domain
- The extension adds a layer on top without breaking existing agent-browser functionality
- This is a fork, not a wrapper — direct modification of the codebase

## Constraints

- **Compatibility**: Must not break existing agent-browser API — existing usage patterns continue to work
- **Tech stack**: TypeScript (matching agent-browser's existing codebase)
- **Architecture**: Extend existing patterns rather than introducing new paradigms

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Fork over wrapper | Direct access to internals, simpler than wrapping | — Pending |
| CDP Network domain | Native Chromium capability, no additional dependencies | — Pending |

---
*Last updated: 2026-01-17 after initialization*
