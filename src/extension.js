// n8n MCP Server Connector Extension for Claude Desktop
// This extension connects to MCP Server Triggers hosted on n8n instances

class N8nMCPConnectorExtension {
  constructor() {
    this.name = 'n8n MCP Server Connector';
    this.version = '1.0.0';
    this.description = 'Connect to MCP Server Triggers hosted on n8n instances';
    this.author = 'shalalalaw';
    
    this.mcpConnections = new Map();
    this.endpoints = [];
    this.tools = new Map();
  }

  async onInstall() {
    await this.showConfigurationDialog();
  }

  async onActivate() {
    try {
      // Load saved endpoints from storage
      const savedEndpoints = await claude.storage.get('mcp_endpoints');
      this.endpoints = savedEndpoints || [];
      
      if (this.endpoints.length === 0) {
        await this.showConfigurationDialog();
      } else {
        await this.connectToAllServers();
      }
    } catch (error) {
      console.error('Activation error:', error);
      await this.showConfigurationDialog();
    }
  }

  async onDeactivate() {
    // Clean up connections
    for (const [name, connection] of this.mcpConnections) {
      try {
        if (connection.cleanup) {
          await connection.cleanup();
        }
      } catch (error) {
        console.error(`Error cleaning up connection ${name}:`, error);
      }
    }
    this.mcpConnections.clear();
    this.tools.clear();
  }

  async showConfigurationDialog() {
    const endpoints = this.endpoints.length > 0 ? this.endpoints : [
      {
        name: '',
        url: '',
        auth_type: 'none',
        auth_value: '',
        username: '',
        timeout: 30
      }
    ];

    const config = {
      title: 'Configure n8n MCP Server Endpoints',
      description: 'Add your n8n instances that are running MCP Server Triggers',
      endpoints: endpoints
    };

    // Show simple prompt for configuration
    const result = await claude.ui.showDialog({
      type: 'form',
      title: config.title,
      content: config.description,
      fields: [
        {
          type: 'text',
          name: 'endpoints_json',
          label: 'Endpoints Configuration (JSON)',
          value: JSON.stringify(endpoints, null, 2),
          multiline: true,
          rows: 10,
          placeholder: JSON.stringify([{
            name: 'production-mcp',
            url: 'https://n8n.mysite.com/webhook/mcp-server',
            auth_type: 'none',
            auth_value: '',
            username: '',
            timeout: 30
          }], null, 2)
        }
      ]
    });

    if (result && result.endpoints_json) {
      try {
        const parsedEndpoints = JSON.parse(result.endpoints_json);
        if (Array.isArray(parsedEndpoints)) {
          this.endpoints = parsedEndpoints;
          await claude.storage.set('mcp_endpoints', this.endpoints);
          await this.connectToAllServers();
        } else {
          throw new Error('Configuration must be an array');
        }
      } catch (error) {
        await claude.ui.showMessage({
          type: 'error',
          title: 'Configuration Error',
          message: `Invalid JSON configuration: ${error.message}`
        });
      }
    }
  }

  async connectToAllServers() {
    // Clear existing connections
    for (const [name, connection] of this.mcpConnections) {
      if (connection.cleanup) {
        await connection.cleanup();
      }
    }
    this.mcpConnections.clear();

    const connectionResults = [];
    
    for (const endpoint of this.endpoints) {
      if (!endpoint.name || !endpoint.url) {
        continue;
      }
      
      const result = await this.connectToMCPServer(endpoint);
      connectionResults.push({
        name: endpoint.name,
        url: endpoint.url,
        ...result,
      });
    }

    const successCount = connectionResults.filter(r => r.success).length;
    const failureCount = connectionResults.filter(r => !r.success).length;

    let message = `Connected to ${successCount} MCP servers`;
    if (failureCount > 0) {
      message += `, ${failureCount} failed`;
    }

    await claude.ui.showMessage({
      type: successCount > 0 ? 'info' : 'error',
      title: 'Connection Status',
      message: message
    });

    await this.registerToolsFromServers();
  }

  async connectToMCPServer(endpoint) {
    try {
      const headers = {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(endpoint)
      };

      const connection = {
        name: endpoint.name,
        url: endpoint.url,
        headers: headers,
        timeout: endpoint.timeout * 1000,
        
        async request(method, params = {}) {
          const payload = {
            jsonrpc: '2.0',
            method,
            params,
            id: Date.now(),
          };

          const response = await fetch(this.url, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(this.timeout)
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const data = await response.json();
          
          if (data.error) {
            throw new Error(data.error.message || 'Unknown MCP error');
          }

          return data.result;
        },

        async cleanup() {
          // Nothing to clean up for HTTP connections
        }
      };

      // Test connection by listing tools
      const response = await connection.request('tools/list', {});
      
      this.mcpConnections.set(endpoint.name, connection);

      return {
        success: true,
        toolCount: response.tools?.length || 0,
        tools: response.tools || [],
      };
    } catch (error) {
      console.error(`Failed to connect to ${endpoint.name}:`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  getAuthHeaders(endpoint) {
    const headers = {};

    switch (endpoint.auth_type) {
      case 'basic':
        if (endpoint.username && endpoint.auth_value) {
          const credentials = `${endpoint.username}:${endpoint.auth_value}`;
          headers['Authorization'] = `Basic ${btoa(credentials)}`;
        }
        break;
      
      case 'bearer':
        if (endpoint.auth_value) {
          headers['Authorization'] = `Bearer ${endpoint.auth_value}`;
        }
        break;
      
      case 'api_key':
        if (endpoint.auth_value) {
          headers['X-API-Key'] = endpoint.auth_value;
        }
        break;
    }

    return headers;
  }

  async registerToolsFromServers() {
    this.tools.clear();

    for (const [serverName, connection] of this.mcpConnections) {
      try {
        const response = await connection.request('tools/list', {});
        const tools = response.tools || [];

        for (const tool of tools) {
          const toolId = `${serverName}_${tool.name}`;
          
          // Register tool with Claude Desktop
          this.tools.set(toolId, {
            name: tool.name,
            description: tool.description || `Tool from ${serverName}`,
            inputSchema: tool.inputSchema || { type: 'object', properties: {} },
            serverName: serverName,
            toolName: tool.name,
            handler: async (input) => {
              return await this.callMCPTool(serverName, tool.name, input);
            }
          });
        }
      } catch (error) {
        console.error(`Failed to register tools from ${serverName}:`, error);
      }
    }

    // Register tools with Claude Desktop
    for (const [toolId, tool] of this.tools) {
      await claude.tools.register({
        name: `${tool.name} (${tool.serverName})`,
        description: tool.description,
        inputSchema: tool.inputSchema,
        handler: tool.handler
      });
    }
  }

  async callMCPTool(serverName, toolName, input) {
    const connection = this.mcpConnections.get(serverName);
    
    if (!connection) {
      throw new Error(`MCP server ${serverName} not connected`);
    }

    try {
      const response = await connection.request('tools/call', {
        name: toolName,
        arguments: input,
      });

      return {
        success: true,
        server: serverName,
        tool: toolName,
        result: response.content || response,
      };
    } catch (error) {
      console.error(`Error calling tool ${toolName} on ${serverName}:`, error);
      
      return {
        success: false,
        server: serverName,
        tool: toolName,
        error: error.message,
      };
    }
  }

  async getMenuItems() {
    return [
      {
        id: 'configure',
        label: 'Configure MCP Servers',
        handler: () => this.showConfigurationDialog(),
      },
      {
        id: 'refresh',
        label: 'Refresh Connections',
        handler: () => this.connectToAllServers(),
      },
      {
        id: 'status',
        label: 'Connection Status',
        handler: () => this.showConnectionStatus(),
      },
    ];
  }

  async showConnectionStatus() {
    const status = [];
    
    for (const endpoint of this.endpoints) {
      const isConnected = this.mcpConnections.has(endpoint.name);
      const connection = this.mcpConnections.get(endpoint.name);
      const toolCount = connection ? 
        Array.from(this.tools.values()).filter(t => t.serverName === endpoint.name).length : 0;
      
      status.push({
        name: endpoint.name,
        url: endpoint.url,
        connected: isConnected,
        toolCount: toolCount
      });
    }

    const content = status.map(s => 
      `${s.connected ? '✅' : '❌'} ${s.name}\n   URL: ${s.url}\n   Tools: ${s.toolCount}`
    ).join('\n\n');

    await claude.ui.showDialog({
      type: 'info',
      title: 'MCP Server Connection Status',
      content: content || 'No servers configured'
    });
  }
}

// Initialize and register the extension
const extension = new N8nMCPConnectorExtension();

// Export for Claude Desktop
if (typeof claude !== 'undefined') {
  claude.extensions.register(extension);
}

export default extension;