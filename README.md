# n8n MCP Server Connector

[![Build and Test](https://github.com/shalalalaw/n8n-mcp-connector/actions/workflows/build.yml/badge.svg)](https://github.com/shalalalaw/n8n-mcp-connector/actions/workflows/build.yml)
[![Release](https://img.shields.io/github/v/release/shalalalaw/n8n-mcp-connector)](https://github.com/shalalalaw/n8n-mcp-connector/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Connect Claude Desktop to MCP Server Triggers hosted on your n8n instances!

## Overview

This extension allows Claude Desktop to connect to Model Context Protocol (MCP) servers that are running as webhook triggers on n8n. Once connected, all tools exposed by your n8n MCP servers become available in Claude.

## Features

- 🔌 Connect to multiple n8n MCP Server Triggers
- 🔐 Support for various authentication methods (Basic, Bearer, API Key)
- 🛠️ Automatic tool discovery and registration
- 📊 Connection status monitoring
- ⚡ Real-time tool execution
- 🔄 Simple, lightweight implementation using vanilla JavaScript

## Installation

1. Download `n8n-mcp-connector.dxt` from the [releases page](https://github.com/shalalalaw/n8n-mcp-connector/releases)
2. Open Claude Desktop
3. Go to **Extensions** → **Install Extension**
4. Select the downloaded `.dxt` file
5. Configure your n8n MCP server endpoints

## Setting up MCP Server Triggers in n8n

Before using this extension, you need to set up MCP Server Triggers in your n8n instances:

1. Create a new workflow in n8n
2. Add a **Webhook** trigger node
3. Configure it to handle MCP protocol requests
4. Add your MCP tool logic in subsequent nodes
5. Activate the workflow and copy the webhook URL

Example n8n webhook configuration:
- **HTTP Method**: POST
- **Path**: `/mcp-server` (or your preferred path)
- **Response Mode**: "When last node finishes"
- **Response Data**: "Last node's data"

## Configuration

When you install the extension, you'll be prompted to add your n8n MCP server endpoints as JSON configuration:

### Endpoint Configuration

Configure endpoints as a JSON array with the following structure:

```json
[
  {
    "name": "production-tools",
    "url": "https://n8n.company.com/webhook/prod-mcp-server",
    "auth_type": "bearer",
    "auth_value": "your-bearer-token",
    "timeout": 30
  },
  {
    "name": "dev-tools",
    "url": "https://dev-n8n.company.com/webhook/dev-mcp",
    "auth_type": "none",
    "timeout": 30
  }
]
```

### Configuration Fields

- **name**: A friendly identifier (e.g., "production-tools", "dev-mcp")
- **url**: The full webhook URL from n8n
- **auth_type**: Authentication method:
  - `"none"`: No authentication required
  - `"basic"`: Username and password (requires `username` and `auth_value`)
  - `"bearer"`: JWT or OAuth token
  - `"api_key"`: Custom API key header
- **auth_value**: The credential value (token, password, or API key)
- **username**: Username for basic auth (only needed if auth_type is "basic")
- **timeout**: Request timeout in seconds (default: 30)

## Usage

Once configured, your n8n MCP tools will appear in Claude with the server name as a prefix:

- If your MCP server "production-tools" exposes a tool called "get_data"
- It will appear in Claude as "get_data (production-tools)"

You can then use these tools naturally in conversation:
- "Use the production tools to get the latest data"
- "Call the dev-mcp server to test the new feature"

## Recent Fixes (v1.0.0)

This version includes major fixes:
- ✅ Removed dependency on non-existent `@anthropic/claude-desktop-sdk`
- ✅ Uses proper Claude Desktop Extension API
- ✅ Simplified build process with no complex bundling
- ✅ Uses native `fetch` API instead of axios
- ✅ Proper error handling and connection management
- ✅ Works with current Claude Desktop Extension system

## Security Considerations

- Credentials are stored securely in Claude Desktop's encrypted storage
- All connections use HTTPS
- Authentication headers are only sent to configured endpoints
- Each MCP server connection is isolated

## Building from Source

```bash
# Clone the repository
git clone https://github.com/shalalalaw/n8n-mcp-connector
cd n8n-mcp-connector

# Install dependencies (minimal - only build tools)
npm install

# Build the extension
npm run build

# Create .dxt package
npm run package
```

## Development

```bash
# Build with file watching
npm run dev

# Test connections
npm test

# Clean build artifacts
npm run clean
```

## Troubleshooting

### Connection Failed
- Verify the webhook URL is correct and accessible
- Check that the n8n workflow is active
- Ensure authentication credentials are correct
- Test the webhook manually with curl or Postman

### Tools Not Appearing
- Check that your n8n MCP server implements the `tools/list` method
- Verify the response format matches MCP protocol specification
- Use the "Connection Status" option from the extension menu

### Authentication Issues
- For Basic Auth: Ensure both username and password are provided
- For Bearer Token: Include only the token, not the "Bearer" prefix
- For API Key: Verify the correct header name with your n8n setup

### Configuration Issues
- Ensure JSON configuration is valid (use a JSON validator)
- Check that all required fields are present
- Verify URLs are accessible from your network

## License

MIT © 2025 shalalalaw

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

- Create an issue on [GitHub](https://github.com/shalalalaw/n8n-mcp-connector/issues)
- Check the [n8n documentation](https://docs.n8n.io) for webhook setup
- Review the [MCP specification](https://modelcontextprotocol.io)