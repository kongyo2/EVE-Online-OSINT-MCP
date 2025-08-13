# EVE Online OSINT MCP Server

An MCP (Model Context Protocol) server that provides OSINT (Open Source Intelligence) capabilities for EVE Online using multiple APIs including ESI, EveWho, and zKillboard. This server allows AI assistants to gather comprehensive intelligence on EVE Online characters, corporations, and alliances by name.

## Features

- **Character Intelligence**: Get detailed information about EVE Online characters including:
  - ESI public character data (birthday, gender, description, security status)
  - Character portraits in multiple resolutions
  - Complete corporation history with dates
  - Current affiliations and titles
  - zKillboard statistics and recent killmails
- **Corporation Analysis**: Retrieve comprehensive corporation data including:
  - ESI corporation information (member count, tax rate, founding date)
  - EveWho member lists with activity metrics
  - Alliance affiliations and leadership details
- **Alliance Intelligence**: Analyze alliance composition including:
  - ESI alliance information (founding date, ticker, executor corp)
  - Member corporations with detailed statistics
  - Growth trends and activity metrics
- **Name Resolution**: Automatically converts entity names to IDs and vice versa using ESI API
- **Multi-API Integration**: Combines data from ESI, EveWho, and zKillboard for comprehensive intelligence
- **Rate Limiting Compliance**: Respects all API rate limits and includes proper error handling

## Tools Available

### 1. Character OSINT (`character-osint`)

Investigates individual EVE Online characters by name.

**Parameters:**

- `characterName` (string): The exact name of the character to investigate

**Returns:**

- **ESI Character Information**: Birthday, gender, description, security status, title
- **Character Portraits**: URLs for 64x64, 128x128, 256x256, and 512x512 pixel images
- **Corporation History**: Complete history from ESI with corporation names and dates
- **Current Affiliations**: Corporation and alliance information
- **EveWho Data**: Additional context including last login information
- **zKillboard Data**: Recent killmails and PvP statistics

### 2. Corporation OSINT (`corporation-osint`)

Analyzes EVE Online corporations by name.

**Parameters:**

- `corporationName` (string): The exact name of the corporation to investigate

**Returns:**

- **ESI Corporation Information**: Name, ticker, member count, tax rate, founding date, CEO details
- **EveWho Statistics**: Total member count, 7-day delta, activity metrics
- **Alliance Affiliation**: Current alliance information (if applicable)
- **Member List**: Complete member roster with join dates and security status
- **Corporate Details**: Description, URL, war eligibility status

### 3. Alliance OSINT (`alliance-osint`)

Examines EVE Online alliances by name.

**Parameters:**

- `allianceName` (string): The exact name of the alliance to investigate

**Returns:**

- **ESI Alliance Information**: Name, ticker, founding date, creator and executor corporation details
- **EveWho Statistics**: Total member count, corporation count, 7-day delta
- **Member Corporations**: Complete list with individual member counts and activity metrics
- **Growth Trends**: Historical data and activity patterns
- **Leadership Information**: Creator and executor corporation details

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

This server relies on three external APIs:

1. **EVE Online ESI API** (`https://esi.evetech.net/`)

   - Official CCP Games API for EVE Online
   - Provides character, corporation, and alliance public information
   - Character portraits and corporation history
   - Name resolution (names ↔ IDs)
   - No authentication required for public endpoints
   - Built-in rate limiting

2. **EveWho API** (`https://evewho.com/api/`)

   - Provides corporation and alliance membership data
   - Historical tracking and activity metrics
   - Rate limited to 10 requests per 30 seconds
   - Third-party service

3. **zKillboard API** (`https://zkillboard.com/api/`)
   - Killmail and PvP statistics
   - Character combat history and statistics
   - Rate limiting: be reasonable with request frequency
   - Third-party service

## Rate Limiting

The server respects all API rate limiting policies:

- **EveWho**: Maximum 10 requests per 30-second window
- **zKillboard**: Reasonable request frequency, no hammering
- **ESI**: Built-in rate limiting handled automatically
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
