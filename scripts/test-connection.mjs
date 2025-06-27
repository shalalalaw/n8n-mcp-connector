import axios from 'axios';
import chalk from 'chalk';
import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testMCPServer(endpoint) {
  console.log(chalk.blue(`\nTesting ${chalk.bold(endpoint.name)}...`));
  console.log(chalk.gray(`URL: ${endpoint.url}`));
  
  try {
    // Prepare headers
    const headers = { 'Content-Type': 'application/json' };
    
    if (endpoint.auth_type === 'basic' && endpoint.username && endpoint.auth_value) {
      const credentials = `${endpoint.username}:${endpoint.auth_value}`;
      headers['Authorization'] = `Basic ${Buffer.from(credentials).toString('base64')}`;
    } else if (endpoint.auth_type === 'bearer' && endpoint.auth_value) {
      headers['Authorization'] = `Bearer ${endpoint.auth_value}`;
    } else if (endpoint.auth_type === 'api_key' && endpoint.auth_value) {
      headers['X-API-Key'] = endpoint.auth_value;
    }
    
    // Test tools/list method
    console.log(chalk.gray('Testing tools/list...'));
    const listResponse = await axios.post(
      endpoint.url,
      {
        jsonrpc: '2.0',
        method: 'tools/list',
        params: {},
        id: 1,
      },
      {
        headers,
        timeout: (endpoint.timeout || 30) * 1000,
      }
    );
    
    const tools = listResponse.data?.result?.tools || [];
    console.log(chalk.green(`✅ Connected! Found ${tools.length} tools:`));
    
    tools.forEach(tool => {
      console.log(chalk.gray(`   - ${tool.name}: ${tool.description || 'No description'}`));
    });
    
    // Test a tool call if tools exist
    if (tools.length > 0) {
      const testTool = tools[0];
      console.log(chalk.gray(`\nTesting tool call: ${testTool.name}...`));
      
      try {
        const callResponse = await axios.post(
          endpoint.url,
          {
            jsonrpc: '2.0',
            method: 'tools/call',
            params: {
              name: testTool.name,
              arguments: {},
            },
            id: 2,
          },
          {
            headers,
            timeout: (endpoint.timeout || 30) * 1000,
          }
        );
        
        console.log(chalk.green(`✅ Tool call successful`));
        console.log(chalk.gray('Response:', JSON.stringify(callResponse.data?.result, null, 2)));
      } catch (error) {
        console.log(chalk.yellow(`⚠️  Tool call failed: ${error.response?.data?.error?.message || error.message}`));
      }
    }
    
    return { success: true, tools: tools.length };
  } catch (error) {
    console.log(chalk.red(`❌ Connection failed`));
    if (error.response) {
      console.log(chalk.red(`   Status: ${error.response.status}`));
      console.log(chalk.red(`   Error: ${error.response.data?.error?.message || error.response.statusText}`));
    } else if (error.request) {
      console.log(chalk.red(`   Error: No response (check URL and network)`));
    } else {
      console.log(chalk.red(`   Error: ${error.message}`));
    }
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log(chalk.bold.blue('🧪 n8n MCP Server Connection Tester\n'));
  
  // Try to load test configuration
  let endpoints = [];
  
  try {
    const configPath = path.join(__dirname, '..', 'test-config.json');
    const configData = await readFile(configPath, 'utf8');
    const config = JSON.parse(configData);
    endpoints = config.endpoints || [];
  } catch (error) {
    console.log(chalk.yellow('No test-config.json found. Using example endpoint.'));
    endpoints = [
      {
        name: 'example',
        url: 'https://n8n.example.com/webhook/mcp-server',
        auth_type: 'none',
        timeout: 30,
      },
    ];
  }
  
  if (endpoints.length === 0) {
    console.log(chalk.red('No endpoints configured!'));
    console.log(chalk.gray('\nCreate a test-config.json file with your endpoints:'));
    console.log(chalk.gray(JSON.stringify({
      endpoints: [
        {
          name: 'my-mcp-server',
          url: 'https://n8n.mysite.com/webhook/abc123',
          auth_type: 'bearer',
          auth_value: 'your-token',
          timeout: 30,
        },
      ],
    }, null, 2)));
    process.exit(1);
  }
  
  // Test each endpoint
  const results = [];
  for (const endpoint of endpoints) {
    const result = await testMCPServer(endpoint);
    results.push({ ...endpoint, ...result });
  }
  
  // Summary
  console.log(chalk.bold.blue('\n📊 Summary:'));
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(chalk.green(`✅ Successful: ${successful}`));
  console.log(chalk.red(`❌ Failed: ${failed}`));
}

main().catch(console.error);