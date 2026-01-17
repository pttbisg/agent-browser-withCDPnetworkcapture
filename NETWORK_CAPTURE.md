# Network Capture Extension for Agent-Browser

This fork adds CDP (Chrome DevTools Protocol) network capture capabilities to agent-browser, enabling full traffic inspection, API discovery, and authenticated requests.

## New Commands

### Enable/Disable Capture

```bash
# Start capturing network traffic
agent-browser network capture start

# Stop capturing
agent-browser network capture stop
```

### List Captured Traffic

```bash
# List all captured requests
agent-browser network list

# Filter by URL pattern
agent-browser network list --url "api"

# Filter by HTTP method
agent-browser network list --method POST

# Filter by status code
agent-browser network list --status 200

# Filter by resource type (XHR, Fetch, Document, Script, etc.)
agent-browser network list --type XHR

# Limit results
agent-browser network list --limit 20

# Combine filters
agent-browser network list --method POST --status 200 --limit 10
```

### Inspect Request Details

```bash
# Get full request/response details (headers, timing, etc.)
agent-browser network get <requestId>

# Get response body
agent-browser network body <requestId>
```

### Search Traffic

```bash
# Search by URL, headers
agent-browser network search "api"

# Also search in response bodies (slower)
agent-browser network search "token" --in-body
```

### Make Authenticated Requests

```bash
# Make a request using the browser's cookies/session
agent-browser network fetch https://api.example.com/me

# With custom method
agent-browser network fetch https://api.example.com/data --method POST

# With headers
agent-browser network fetch https://api.example.com/data --headers '{"Content-Type":"application/json"}'

# With body
agent-browser network fetch https://api.example.com/data -m POST -d '{"query":"test"}'
```

### Clear Captured Traffic

```bash
agent-browser network clear
```

## Example Workflow: API Discovery

```bash
# 1. Start capture
agent-browser network capture start

# 2. Navigate to a page
agent-browser open https://example.com/dashboard

# 3. List JSON API calls
agent-browser network list --type XHR --json | jq '.data.entries[] | select(.mimeType | contains("json")) | .url'

# 4. Get the request ID of an interesting API
agent-browser network list --url "api/users" --json | jq '.data.entries[0].requestId'

# 5. Inspect the request headers (to find auth requirements)
agent-browser network get "12345.1" --json | jq '.data.request.headers'

# 6. Get the response body
agent-browser network body "12345.1"

# 7. Make your own authenticated request
agent-browser network fetch https://example.com/api/users --headers '{"X-Requested-With":"XMLHttpRequest"}'
```

## Technical Details

### How It Works

1. **CDP Network Domain**: Uses Chrome DevTools Protocol's Network domain to capture all traffic at the browser level
2. **On-Demand Body Retrieval**: Response bodies are stored by CDP and fetched only when requested (memory efficient)
3. **Session Persistence**: Network capture automatically re-enables when CDP sessions are invalidated (e.g., tab switches)
4. **Browser Fetch**: Uses `page.evaluate()` with the native `fetch()` API to make requests with the page's cookies

### Differences from Existing `network requests`

| Feature | `network requests` (Playwright) | `network capture` (CDP) |
|---------|--------------------------------|------------------------|
| Response bodies | No | Yes |
| Status codes | No | Yes |
| Response headers | No | Yes |
| Timing info | No | Yes |
| Search capability | Basic filter | Full search |
| Memory usage | Lower | Higher (bodies cached) |

### Limitations

- Only works with Chromium-based browsers (CDP requirement)
- Response bodies for streaming/WebSocket not captured
- Very large response bodies may be truncated

## Installation

See the main README for installation instructions. This fork can be installed locally:

```bash
# Clone and build
git clone <this-repo>
cd agent-browser
npm install
npm run build

# Build native CLI (optional, for faster startup)
cd cli && cargo build --release && cd ..

# Link globally
npm link

# Or use directly
./cli/target/release/agent-browser --help
```
