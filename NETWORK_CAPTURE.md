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

## Token-Saving Truncation

Network responses can be large and consume excessive tokens when used with LLM agents. By default, all network commands truncate JSON string values to 500 characters.

### Default Behavior (Truncated)

```bash
# Values truncated to 500 chars by default
agent-browser network list
agent-browser network body <requestId>
agent-browser network get <requestId>
```

Output shows truncated values with indicators:
```json
{
  "data": "This is a very long response that...[+1234 chars]",
  "nested": {
    "field": "Another long value that gets...[+567 chars]"
  }
}
```

The CLI shows a notice: `(Truncated. Use --full for complete data)`

### Full Data (No Truncation)

```bash
# Get complete untruncated data
agent-browser network body <requestId> --full
agent-browser network get <requestId> --full
agent-browser network list --full
```

### Custom Truncation Threshold

```bash
# Truncate to 200 characters per value
agent-browser network list --truncatejsonvalues 200

# Truncate to 1000 characters
agent-browser network body <requestId> --truncatejsonvalues 1000
```

### Smart Truncation Features

- **JSON-aware**: Preserves JSON structure, only truncates string values
- **Binary detection**: Shows `[Binary data: 45.2 KB]` for base64-encoded content
- **Headers**: Truncates long header values (e.g., long User-Agent strings)
- **URLs**: Truncates very long URLs with query strings

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
