# n8n MCP Server Connector - Complete Setup Guide

## Quick Start

### 1. Install the Extension

1. Download `n8n-mcp-connector.dxt` from [GitHub Releases](https://github.com/shalalalaw/n8n-mcp-connector/releases)
2. Open Claude Desktop
3. Navigate to **Extensions** → **Install Extension**
4. Select the `.dxt` file
5. The configuration dialog will appear automatically

### 2. Set Up n8n MCP Server

#### Option A: Import Example Workflow

1. Download `examples/n8n-mcp-server-workflow.json`
2. In n8n, go to **Workflows** → **Import**
3. Import the JSON file
4. Activate the workflow
5. Copy the webhook URL

#### Option B: Create Custom MCP Server

1. Create a new workflow in n8n
2. Add a **Webhook** node with these settings:
   - HTTP Method: `POST`
   - Path: `mcp-server` (or your choice)
   - Response Mode: `Response Node`
   - Authentication: Configure as needed

3. Add a **Code** node to handle MCP protocol:

```javascript
// Basic MCP handler structure
const request = $input.item.json;

// Validate JSON-RPC 2.0
if (request.jsonrpc !== '2.0') {
  return {
    jsonrpc: '2.0',
    error: { code: -32600, message: 'Invalid Request' },
    id: request.id
  };
}

// Handle methods
switch (request.method) {
  case 'tools/list':
    return {
      jsonrpc: '2.0',
      result: {
        tools: [
          // Your tools here
        ]
      },
      id: request.id
    };
    
  case 'tools/call':
    // Handle tool execution
    break;
}
```

4. Add a **Respond to Webhook** node
5. Connect: Webhook → Code → Respond
6. Activate the workflow

### 3. Configure the Extension

When installing the extension, you'll see the configuration dialog:

```
┌─────────────────────────────────────────┐
│     Configure n8n MCP Server Endpoints   │
├─────────────────────────────────────────┤
│                                         │
│  Name: production-tools                 │
│  URL: https://n8n.site.com/webhook/123 │
│  Auth: Bearer Token                     │
│  Token: ****************                │
│                                         │
│  [+ Add MCP Server]                     │
│                                         │
│  [Cancel]              [Save & Connect] │
└─────────────────────────────────────────┘
```

## Configuration Options

### Authentication Types

#### 1. **No Authentication**
```json
{
  "auth_type": "none"
}
```

#### 2. **Basic Authentication**
```json
{
  "auth_type": "basic",
  "username": "user",
  "auth_value": "password"
}
```

#### 3. **Bearer Token**
```json
{
  "auth_type": "bearer",
  "auth_value": "your-jwt-token"
}
```

#### 4. **API Key**
```json
{
  "auth_type": "api_key",
  "auth_value": "your-api-key"
}
```

### n8n Webhook Authentication

Configure matching authentication in your n8n webhook node:

1. **Basic Auth**: Enable in webhook node settings
2. **Header Auth**: Check for `Authorization` or `X-API-Key` headers in your code node
3. **Query Auth**: Use query parameters for simple API keys

## Creating MCP Tools

### Tool Definition Structure

```javascript
{
  name: 'tool_name',
  description: 'What this tool does',
  inputSchema: {
    type: 'object',
    properties: {
      param1: {
        type: 'string',
        description: 'Parameter description'
      }
    },
    required: ['param1']
  }
}
```

### Example Tools

#### 1. Database Query Tool

```javascript
case 'tools/list':
  return {
    jsonrpc: '2.0',
    result: {
      tools: [{
        name: 'query_database',
        description: 'Query the company database',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'SQL query to execute'
            },
            database: {
              type: 'string',
              enum: ['customers', 'orders', 'products'],
              description: 'Target database'
            }
          },
          required: ['query', 'database']
        }
      }]
    },
    id: request.id
  };

case 'tools/call':
  if (params.name === 'query_database') {
    // Add database query logic
    // Use n8n's database nodes
  }
```

#### 2. API Integration Tool

```javascript
{
  name: 'send_slack_message',
  description: 'Send a message to Slack',
  inputSchema: {
    type: 'object',
    properties: {
      channel: {
        type: 'string',
        description: 'Slack channel ID or name'
      },
      message: {
        type: 'string',
        description: 'Message content'
      }
    },
    required: ['channel', 'message']
  }
}
```

## Testing Your Setup

### 1. Using the Test Script

```bash
# Create test configuration
cat > test-config.json << EOF
{
  "endpoints": [{
    "name": "my-mcp-server",
    "url": "https://n8n.mysite.com/webhook/abc123",
    "auth_type": "bearer",
    "auth_value": "your-token",
    "timeout": 30
  }]
}
EOF

# Run tests
npm test
```

### 2. Manual Testing with cURL

```bash
# Test tools/list
curl -X POST https://n8n.mysite.com/webhook/abc123 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/list",
    "params": {},
    "id": 1
  }'

# Test tools/call
curl -X POST https://n8n.mysite.com/webhook/abc123 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "echo",
      "arguments": {"message": "Hello, MCP!"}
    },
    "id": 2
  }'
```

### 3. Testing in Claude Desktop

After configuration, test your tools:

1. Open Claude Desktop
2. Type: "What tools are available from my n8n servers?"
3. Claude should list all discovered tools
4. Try using a tool: "Use the echo tool to say hello"

## Troubleshooting

### Common Issues

#### "Connection Failed"
- Verify webhook URL is correct
- Check n8n workflow is active
- Ensure authentication matches
- Test with cURL first

#### "No tools found"
- Verify `tools/list` returns proper format
- Check JSON-RPC response structure
- Ensure webhook returns JSON

#### "Tool execution failed"
- Check n8n execution logs
- Verify tool parameters match schema
- Test tool logic independently

### Debug Mode

Enable debug logging in n8n:
1. Set `N8N_LOG_LEVEL=debug`
2. Check execution details
3. Monitor webhook node outputs