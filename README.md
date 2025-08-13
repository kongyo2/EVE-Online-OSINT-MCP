# EVE Online OSINT MCP Server

An MCP (Model Context Protocol) server that provides OSINT (Open Source Intelligence) capabilities for EVE Online using the EveWho API. This server allows AI assistants to gather intelligence on EVE Online characters, corporations, and alliances by name.

## Features

- **Character Intelligence**: Get detailed information about EVE Online characters including corporation history, security status, and current affiliations
- **Corporation Analysis**: Retrieve member lists, activity metrics, and corporation details
- **Alliance Intelligence**: Analyze alliance composition, member corporations, and growth trends
- **Name Resolution**: Automatically converts entity names to IDs using EVE Online's ESI API
- **Rate Limiting Compliance**: Respects EveWho's API rate limits (10 requests per 30 seconds)

## Tools Available

### 1. Character OSINT (`character-osint`)

Investigates individual EVE Online characters by name.

**Parameters:**

- `characterName` (string): The exact name of the character to investigate

**Returns:**

- Character ID and basic information
- Current corporation and alliance
- Security status
- Corporation history with dates
- Last login information (when available)

### 2. Corporation OSINT (`corporation-osint`)

Analyzes EVE Online corporations by name.

**Parameters:**

- `corporationName` (string): The exact name of the corporation to investigate

**Returns:**

- Corporation ID and basic information
- Total member count and 7-day delta
- Alliance affiliation (if any)
- Complete member list with join dates and security status
- Activity metrics

### 3. Alliance OSINT (`alliance-osint`)

Examines EVE Online alliances by name.

**Parameters:**

- `allianceName` (string): The exact name of the alliance to investigate

**Returns:**

- Alliance ID and basic information
- Total member count across all corporations
- List of member corporations with individual statistics
- Growth trends and activity metrics

## Resources

- **EveWho API Information**: Documentation about the EveWho API, rate limits, and data sources

## Prompts

- **EVE OSINT Report**: Generate comprehensive intelligence reports with customizable focus areas (membership, activity, history, connections)

## Development

### Prerequisites

- Node.js 18+
- npm or pnpm

### Installation

```bash
git clone https://github.com/your-username/eve-online-osint-mcp.git
cd eve-online-osint-mcp
npm install
```

### Development Mode

Start the server in development mode with interactive CLI:

```bash
npm run dev
```

### Production Mode

Start the server for production use:

```bash
npm run start
```

### Testing

Run the test suite:

```bash
npm run test
```

### Linting and Formatting

```bash
# Check code style
npm run lint

# Fix code style issues
npm run format
```

## Usage with MCP Clients

### Claude Desktop

Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "eve-osint": {
      "command": "npx",
      "args": ["tsx", "/path/to/eve-online-osint-mcp/src/server.ts"],
      "env": {}
    }
  }
}
```

### Other MCP Clients

The server uses stdio transport and can be integrated with any MCP-compatible client.

## API Dependencies

This server relies on two external APIs:

1. **EVE Online ESI API** (`https://esi.evetech.net/`)

   - Used for resolving entity names to IDs
   - No authentication required for name resolution
   - Official CCP Games API

2. **EveWho API** (`https://evewho.com/api/`)
   - Provides corporation and alliance membership data
   - Rate limited to 10 requests per 30 seconds
   - Third-party service by zKillboard

## Rate Limiting

The server respects EveWho's rate limiting policy:

- Maximum 10 requests per 30-second window
- Automatic error handling for rate limit violations
- User-friendly error messages when limits are exceeded

## Data Privacy and Terms

- All data is sourced from publicly available APIs
- Complies with CCP Games' Terms of Service
- No personal or private information is accessed
- Data is provided as-is from EveWho's database

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite and linting
6. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Disclaimer

This tool is for educational and intelligence gathering purposes only. Users are responsible for complying with all applicable terms of service and local laws. The authors are not affiliated with CCP Games or EVE Online.
