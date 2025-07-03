# Changelog

All notable changes to the n8n MCP Server Connector will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2025-07-03

### Fixed
- **BREAKING**: Removed dependency on non-existent `@anthropic/claude-desktop-sdk`
- **BREAKING**: Rewritten to use proper Claude Desktop Extension API
- **BREAKING**: Configuration now uses JSON format instead of complex forms
- Replaced axios with native fetch API for HTTP requests
- Fixed authentication header generation (now uses `btoa` instead of `Buffer`)
- Simplified build process - no more complex bundling or external dependencies
- Fixed packaging to use system zip command instead of archiver library
- Updated GitHub Actions workflow to work with simplified build process

### Changed
- Extension now uses vanilla JavaScript with Claude Desktop runtime API
- Configuration UI simplified to JSON text input
- Build process now just copies files and creates zip archive
- Removed all npm dependencies except development tools
- Uses native browser APIs instead of Node.js-specific modules

### Technical Details
- Extension class no longer extends from non-existent SDK base class
- Uses `claude.extensions.register()` API for registration
- HTTP requests use `fetch()` with proper error handling
- All MCP protocol communication over HTTP instead of complex client libraries

## [1.0.0] - 2025-06-27

### Added
- Initial release of n8n MCP Server Connector
- Support for multiple n8n MCP server endpoints
- Authentication methods: None, Basic Auth, Bearer Token, API Key
- Automatic tool discovery and registration
- Connection status monitoring
- Configuration UI in Claude Desktop
- Test script for verifying MCP server connections
- Example n8n workflow for MCP server implementation
- Comprehensive documentation and setup guide

### Features
- Connect to multiple n8n instances simultaneously
- Prefix tools with server names to avoid conflicts
- Secure credential storage in Claude Desktop
- Menu actions for configuration and status checking
- Error handling and connection retry logic

[1.0.1]: https://github.com/shalalalaw/n8n-mcp-connector/releases/tag/v1.0.1
[1.0.0]: https://github.com/shalalalaw/n8n-mcp-connector/releases/tag/v1.0.0