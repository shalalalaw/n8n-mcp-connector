import { Extension } from '@anthropic/claude-desktop-sdk';
import axios from 'axios';

// If MCP client SDK is not available, use this simple implementation
class SimpleMCPClient {
  constructor(config) {
    this.name = config.name;
    this.transport = config.transport;
    this.requestId = 0;
  }

  async request(method, params = {}) {
    const requestId = ++this.requestId;
    
    const payload = {
      jsonrpc: '2.0',
      method,
      params,
      id: requestId,
    };

    const response = await axios.post(
      this.transport.url,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          ...this.transport.headers,
        },
        timeout: this.transport.timeout,
      }
    );

    if (response.data.error) {
      throw new Error(response.data.error.message || 'Unknown error');
    }

    return response.data.result;
  }

  async disconnect() {
    // Clean up if needed
  }
}

// Use SDK client if available, otherwise use simple implementation
const MCPClient = globalThis.MCPClient || SimpleMCPClient;

class N8nMCPConnectorExtension extends Extension {
  constructor() {
    super({
      name: 'n8n MCP Server Connector',
      version: '1.0.0',
      description: 'Connect to MCP Server Triggers hosted on n8n instances',
      author: 'shalalalaw',
    });

    this.mcpConnections = new Map();
    this.endpoints = [];
  }

  async onInstall() {
    await this.showConfigurationDialog();
  }

  async onActivate() {
    this.endpoints = await this.storage.get('mcp_endpoints') || [];
    
    if (this.endpoints.length === 0) {
      await this.showConfigurationDialog();
    } else {
      await this.connectToAllServers();
    }
  }

  async onDeactivate() {
    for (const [name, connection] of this.mcpConnections) {
      try {
        await connection.disconnect();
      } catch (error) {
        console.error(`Error disconnecting from ${name}:`, error);
      }
    }
    this.mcpConnections.clear();
  }

  async showConfigurationDialog() {
    const result = await this.ui.showDialog({
      title: 'Configure n8n MCP Server Endpoints',
      type: 'form',
      description: 'Add your n8n instances that are running MCP Server Triggers',
      fields: [
        {
          id: 'endpoints',
          type: 'dynamic-list',
          label: 'MCP Server Endpoints',
          itemFields: [
            {
              id: 'name',
              type: 'text',
              label: 'Name',
              placeholder: 'e.g., production-mcp',
              required: true,
            },
            {
              id: 'url',
              type: 'url',
              label: 'MCP Server URL',
              placeholder: 'https://n8n.mysite.com/webhook/mcp-server',
              required: true,
            },
            {
              id: 'auth_type',
              type: 'select',
              label: 'Authentication Type',
              options: [
                { value: 'none', label: 'None' },
                { value: 'basic', label: 'Basic Auth' },
                { value: 'bearer', label: 'Bearer Token' },
                { value: 'api_key', label: 'API Key' },
              ],
              default: 'none',
              required: true,
            },
            {
              id: 'auth_value',
              type: 'password',
              label: 'Authentication Value',
              showIf: { auth_type: ['basic', 'bearer', 'api_key'] },
            },
            {
              id: 'username',
              type: 'text',
              label: 'Username',
              showIf: { auth_type: 'basic' },
            },
            {
              id: 'timeout',
              type: 'number',
              label: 'Timeout (seconds)',
              default: 30,
              min: 5,
              max: 300,
            },
          ],
          minItems: 1,
          addButtonText: 'Add MCP Server',
        },
      ],
      buttons: [
        { id: 'cancel', label: 'Cancel', style: 'secondary' },
        { id: 'save', label: 'Save & Connect', style: 'primary' },
      ],
    });

    if (result.buttonId === 'save' && result.values.endpoints) {
      this.endpoints = result.values.endpoints;
      await this.storage.set('mcp_endpoints', this.endpoints);
      await this.connectToAllServers();
    }
  }

  async connectToAllServers() {
    for (const [name, connection] of this.mcpConnections) {
      await connection.disconnect();
    }
    this.mcpConnections.clear();

    const connectionResults = [];
    
    for (const endpoint of this.endpoints) {
      const result = await this.connectToMCPServer(endpoint);
      connectionResults.push({
        name: endpoint.name,
        url: endpoint.url,
        ...result,
      });
    }

    const successCount = connectionResults.filter(r => r.success).length;
    const failureCount = connectionResults.filter(r => !r.success).length;

    if (failureCount > 0) {
      await this.ui.showNotification({
        type: 'warning',
        message: `Connected to ${successCount} MCP servers, ${failureCount} failed`,
      });
    } else {
      await this.ui.showNotification({
        type: 'success',
        message: `Successfully connected to ${successCount} MCP servers`,
      });
    }

    await this.registerToolsFromServers();
  }

  async connectToMCPServer(endpoint) {
    try {
      const clientConfig = {
        name: endpoint.name,
        transport: {
          type: 'http',
          url: endpoint.url,
          timeout: endpoint.timeout * 1000,
        },
      };

      if (endpoint.auth_type !== 'none') {
        clientConfig.transport.headers = this.getAuthHeaders(endpoint);
      }

      const mcpClient = new MCPClient(clientConfig);
      const response = await mcpClient.request('tools/list', {});
      
      this.mcpConnections.set(endpoint.name, mcpClient);

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
        const credentials = `${endpoint.username}:${endpoint.auth_value}`;
        headers['Authorization'] = `Basic ${Buffer.from(credentials).toString('base64')}`;
        break;
      
      case 'bearer':
        headers['Authorization'] = `Bearer ${endpoint.auth_value}`;
        break;
      
      case 'api_key':
        headers['X-API-Key'] = endpoint.auth_value;
        break;
    }

    return headers;
  }

  async registerToolsFromServers() {
    this.tools.clear();

    for (const [serverName, mcpClient] of this.mcpConnections) {
      try {
        const response = await mcpClient.request('tools/list', {});
        const tools = response.tools || [];

        for (const tool of tools) {
          const prefixedToolId = `${serverName}_${tool.name}`;
          
          this.tools.register({
            id: prefixedToolId,
            name: `${tool.name} (${serverName})`,
            description: tool.description || `Tool from ${serverName}`,
            inputSchema: tool.inputSchema || { type: 'object', properties: {} },
            handler: async (input) => {
              return this.callMCPTool(serverName, tool.name, input);
            },
          });
        }
      } catch (error) {
        console.error(`Failed to register tools from ${serverName}:`, error);
      }
    }
  }

  async callMCPTool(serverName, toolName, input) {
    const mcpClient = this.mcpConnections.get(serverName);
    
    if (!mcpClient) {
      throw new Error(`MCP server ${serverName} not connected`);
    }

    try {
      const response = await mcpClient.request('tools/call', {
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
        icon: 'settings',
        handler: () => this.showConfigurationDialog(),
      },
      {
        id: 'refresh',
        label: 'Refresh Connections',
        icon: 'refresh',
        handler: () => this.connectToAllServers(),
      },
      {
        id: 'status',
        label: 'Connection Status',
        icon: 'info',
        handler: () => this.showConnectionStatus(),
      },
    ];
  }

  async showConnectionStatus() {
    const status = [];
    
    for (const endpoint of this.endpoints) {
      const isConnected = this.mcpConnections.has(endpoint.name);
      status.push({
        name: endpoint.name,
        url: endpoint.url,
        connected: isConnected,
      });
    }

    const content = status.map(s => 
      `${s.connected ? '✅' : '❌'} ${s.name}\n   URL: ${s.url}`
    ).join('\n\n');

    await this.ui.showDialog({
      title: 'MCP Server Connection Status',
      type: 'info',
      content,
      buttons: [{ id: 'ok', label: 'OK', style: 'primary' }],
    });
  }
}

export default N8nMCPConnectorExtension;