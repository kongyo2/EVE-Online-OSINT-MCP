# EVE Online OSINT MCP Server

[![smithery badge](https://smithery.ai/badge/@kongyo2/eve-online-osint-mcp)](https://smithery.ai/server/@kongyo2/eve-online-osint-mcp)

<a href="https://glama.ai/mcp/servers/@kongyo2/EVE-Online-OSINT-MCP">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/@kongyo2/EVE-Online-OSINT-MCP/badge" />
</a>

An MCP (Model Context Protocol) server that provides OSINT (Open Source Intelligence) capabilities for EVE Online using multiple APIs including ESI, EveWho, and zKillboard. This server allows AI assistants to gather comprehensive intelligence on EVE Online characters, corporations, and alliances by name.

## Features

- **Character Intelligence**: Get detailed information about EVE Online characters including:
  - ESI public character data (birthday, gender, description, security status)
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

### Installing via Smithery

To install eve-online-osint-mcp for Claude Desktop automatically via [Smithery](https://smithery.ai/server/@kongyo2/eve-online-osint-mcp):

```bash
npx -y @smithery/cli install @kongyo2/eve-online-osint-mcp --client claude
```

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




## License

MIT License - see LICENSE file for details.
