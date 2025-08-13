import { FastMCP } from "fastmcp";
import { z } from "zod";

/**
 * EVE Online OSINT MCP Server using EveWho API
 * Provides intelligence gathering capabilities for EVE Online entities
 */

const server = new FastMCP({
  instructions:
    "This server provides OSINT (Open Source Intelligence) capabilities for EVE Online using the EveWho API. It can gather information about characters, corporations, and alliances by name, automatically resolving names to IDs using ESI.",
  name: "EVE Online OSINT",
  version: "1.0.0",
});

// ESI API base URL
const ESI_BASE_URL = "https://esi.evetech.net/latest";
// EveWho API base URL
const EVEWHO_BASE_URL = "https://evewho.com/api";

interface ESIResolveResponse {
  alliances?: Array<{ id: number; name: string }>;
  characters?: Array<{ id: number; name: string }>;
  corporations?: Array<{ id: number; name: string }>;
}

interface EveWhoAllianceResponse {
  corporationCount?: number;
  corporations?: Array<{
    corporation_id: number;
    delta?: number;
    memberCount?: number;
    name: string;
    start_date?: string;
  }>;
  delta?: number;
  memberCount?: number;
}

interface EveWhoCharacterResponse {
  alliance?: {
    alliance_id: number;
    name: string;
  };
  character_id: number;
  corporation?: {
    corporation_id: number;
    name: string;
  };
  history?: Array<{
    corporation: { name: string };
    end_date?: string;
    start_date: string;
  }>;
  last_login?: string;
  name: string;
  security_status?: number;
}

interface EveWhoCorporationResponse {
  alliance?: {
    alliance_id: number;
    name: string;
  };
  characters?: Array<{
    character_id: number;
    name: string;
    security_status?: number;
    start_date?: string;
  }>;
  delta?: number;
  memberCount?: number;
}

/**
 * Get alliance member corporations from EveWho
 */
async function getAllianceCorps(
  allianceId: number,
): Promise<EveWhoAllianceResponse> {
  try {
    const response = await fetch(`${EVEWHO_BASE_URL}/allilist/${allianceId}`, {
      headers: {
        "User-Agent": "EVE-OSINT-MCP/1.0.0",
      },
    });

    if (!response.ok) {
      throw new Error(
        `EveWho API error: ${response.status} ${response.statusText}`,
      );
    }

    return (await response.json()) as EveWhoAllianceResponse;
  } catch (error) {
    throw new Error(
      `Failed to get alliance corporations: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Get character information from EveWho
 */
async function getCharacterInfo(
  characterId: number,
): Promise<EveWhoCharacterResponse> {
  try {
    const response = await fetch(
      `${EVEWHO_BASE_URL}/character/${characterId}`,
      {
        headers: {
          "User-Agent": "EVE-OSINT-MCP/1.0.0",
        },
      },
    );

    if (!response.ok) {
      throw new Error(
        `EveWho API error: ${response.status} ${response.statusText}`,
      );
    }

    return (await response.json()) as EveWhoCharacterResponse;
  } catch (error) {
    throw new Error(
      `Failed to get character info: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Get corporation member list from EveWho
 */
async function getCorporationMembers(
  corporationId: number,
): Promise<EveWhoCorporationResponse> {
  try {
    const response = await fetch(
      `${EVEWHO_BASE_URL}/corplist/${corporationId}`,
      {
        headers: {
          "User-Agent": "EVE-OSINT-MCP/1.0.0",
        },
      },
    );

    if (!response.ok) {
      throw new Error(
        `EveWho API error: ${response.status} ${response.statusText}`,
      );
    }

    return (await response.json()) as EveWhoCorporationResponse;
  } catch (error) {
    throw new Error(
      `Failed to get corporation members: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Resolve entity names to IDs using ESI
 */
async function resolveNamesToIds(names: string[]): Promise<ESIResolveResponse> {
  try {
    const response = await fetch(`${ESI_BASE_URL}/universe/ids/`, {
      body: JSON.stringify(names),
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "EVE-OSINT-MCP/1.0.0",
      },
      method: "POST",
    });

    if (!response.ok) {
      throw new Error(
        `ESI API error: ${response.status} ${response.statusText}`,
      );
    }

    return (await response.json()) as ESIResolveResponse;
  } catch (error) {
    throw new Error(
      `Failed to resolve names: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

// Character OSINT Tool
server.addTool({
  annotations: {
    openWorldHint: true,
    readOnlyHint: true,
    title: "Character OSINT",
  },
  description:
    "Get OSINT information about an EVE Online character by name. Returns character details, corporation history, and current status.",
  execute: async (args, { log }) => {
    try {
      log.info("Resolving character name to ID", {
        characterName: args.characterName,
      });

      // Resolve character name to ID
      const resolved = await resolveNamesToIds([args.characterName]);

      if (!resolved.characters || resolved.characters.length === 0) {
        return `Character "${args.characterName}" not found. Please check the spelling and ensure it's an exact match.`;
      }

      const character = resolved.characters[0];
      log.info("Character resolved", {
        id: character.id,
        name: character.name,
      });

      // Get character information from EveWho
      const characterInfo = await getCharacterInfo(character.id);

      let result = `# Character OSINT Report: ${character.name}\n\n`;
      result += `**Character ID:** ${character.id}\n`;
      result += `**Character Name:** ${character.name}\n\n`;

      if (characterInfo) {
        result += `## Current Status\n`;
        if (characterInfo.corporation) {
          result += `**Corporation:** ${characterInfo.corporation.name} (ID: ${characterInfo.corporation.corporation_id})\n`;
        }
        if (characterInfo.alliance) {
          result += `**Alliance:** ${characterInfo.alliance.name} (ID: ${characterInfo.alliance.alliance_id})\n`;
        }
        if (characterInfo.security_status !== undefined) {
          result += `**Security Status:** ${characterInfo.security_status.toFixed(2)}\n`;
        }
        if (characterInfo.last_login) {
          result += `**Last Login:** ${characterInfo.last_login}\n`;
        }

        result += `\n## Corporation History\n`;
        if (characterInfo.history && characterInfo.history.length > 0) {
          characterInfo.history.forEach((entry, index: number) => {
            result += `${index + 1}. **${entry.corporation.name}** (${entry.start_date}${entry.end_date ? ` - ${entry.end_date}` : " - Present"})\n`;
          });
        } else {
          result += "No corporation history available.\n";
        }
      }

      result += `\n---\n*Data provided by EveWho API*`;

      return result;
    } catch (error) {
      log.error("Character OSINT failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      return `Error: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
  name: "character-osint",
  parameters: z.object({
    characterName: z
      .string()
      .describe("The exact name of the EVE Online character to investigate"),
  }),
});

// Corporation OSINT Tool
server.addTool({
  annotations: {
    openWorldHint: true,
    readOnlyHint: true,
    title: "Corporation OSINT",
  },
  description:
    "Get OSINT information about an EVE Online corporation by name. Returns member list, activity metrics, and corporation details.",
  execute: async (args, { log }) => {
    try {
      log.info("Resolving corporation name to ID", {
        corporationName: args.corporationName,
      });

      // Resolve corporation name to ID
      const resolved = await resolveNamesToIds([args.corporationName]);

      if (!resolved.corporations || resolved.corporations.length === 0) {
        return `Corporation "${args.corporationName}" not found. Please check the spelling and ensure it's an exact match.`;
      }

      const corporation = resolved.corporations[0];
      log.info("Corporation resolved", {
        id: corporation.id,
        name: corporation.name,
      });

      // Get corporation member list from EveWho
      const corpData = await getCorporationMembers(corporation.id);

      let result = `# Corporation OSINT Report: ${corporation.name}\n\n`;
      result += `**Corporation ID:** ${corporation.id}\n`;
      result += `**Corporation Name:** ${corporation.name}\n\n`;

      if (corpData) {
        result += `## Corporation Statistics\n`;
        if (corpData.memberCount !== undefined) {
          result += `**Total Members:** ${corpData.memberCount}\n`;
        }
        if (corpData.delta !== undefined) {
          result += `**7-Day Delta:** ${corpData.delta > 0 ? "+" : ""}${corpData.delta}\n`;
        }
        if (corpData.alliance) {
          result += `**Alliance:** ${corpData.alliance.name} (ID: ${corpData.alliance.alliance_id})\n`;
        }

        result += `\n## Member List\n`;
        if (corpData.characters && corpData.characters.length > 0) {
          result += `Showing ${Math.min(corpData.characters.length, 50)} members:\n\n`;
          corpData.characters.slice(0, 50).forEach((member, index: number) => {
            result += `${index + 1}. **${member.name}** (ID: ${member.character_id})`;
            if (member.start_date) {
              result += ` - Joined: ${member.start_date}`;
            }
            if (member.security_status !== undefined) {
              result += ` - Sec Status: ${member.security_status.toFixed(2)}`;
            }
            result += `\n`;
          });

          if (corpData.characters.length > 50) {
            result += `\n*... and ${corpData.characters.length - 50} more members*\n`;
          }
        } else {
          result += "No member data available.\n";
        }
      }

      result += `\n---\n*Data provided by EveWho API*`;

      return result;
    } catch (error) {
      log.error("Corporation OSINT failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      return `Error: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
  name: "corporation-osint",
  parameters: z.object({
    corporationName: z
      .string()
      .describe("The exact name of the EVE Online corporation to investigate"),
  }),
});

// Alliance OSINT Tool
server.addTool({
  annotations: {
    openWorldHint: true,
    readOnlyHint: true,
    title: "Alliance OSINT",
  },
  description:
    "Get OSINT information about an EVE Online alliance by name. Returns member corporations, total member count, and alliance details.",
  execute: async (args, { log }) => {
    try {
      log.info("Resolving alliance name to ID", {
        allianceName: args.allianceName,
      });

      // Resolve alliance name to ID
      const resolved = await resolveNamesToIds([args.allianceName]);

      if (!resolved.alliances || resolved.alliances.length === 0) {
        return `Alliance "${args.allianceName}" not found. Please check the spelling and ensure it's an exact match.`;
      }

      const alliance = resolved.alliances[0];
      log.info("Alliance resolved", { id: alliance.id, name: alliance.name });

      // Get alliance corporation list from EveWho
      const allianceData = await getAllianceCorps(alliance.id);

      let result = `# Alliance OSINT Report: ${alliance.name}\n\n`;
      result += `**Alliance ID:** ${alliance.id}\n`;
      result += `**Alliance Name:** ${alliance.name}\n\n`;

      if (allianceData) {
        result += `## Alliance Statistics\n`;
        if (allianceData.memberCount !== undefined) {
          result += `**Total Members:** ${allianceData.memberCount}\n`;
        }
        if (allianceData.corporationCount !== undefined) {
          result += `**Total Corporations:** ${allianceData.corporationCount}\n`;
        }
        if (allianceData.delta !== undefined) {
          result += `**7-Day Delta:** ${allianceData.delta > 0 ? "+" : ""}${allianceData.delta}\n`;
        }

        result += `\n## Member Corporations\n`;
        if (allianceData.corporations && allianceData.corporations.length > 0) {
          allianceData.corporations.forEach((corp, index: number) => {
            result += `${index + 1}. **${corp.name}** (ID: ${corp.corporation_id})`;
            if (corp.memberCount !== undefined) {
              result += ` - ${corp.memberCount} members`;
            }
            if (corp.delta !== undefined) {
              result += ` (${corp.delta > 0 ? "+" : ""}${corp.delta} 7d)`;
            }
            if (corp.start_date) {
              result += ` - Joined: ${corp.start_date}`;
            }
            result += `\n`;
          });
        } else {
          result += "No corporation data available.\n";
        }
      }

      result += `\n---\n*Data provided by EveWho API*`;

      return result;
    } catch (error) {
      log.error("Alliance OSINT failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      return `Error: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
  name: "alliance-osint",
  parameters: z.object({
    allianceName: z
      .string()
      .describe("The exact name of the EVE Online alliance to investigate"),
  }),
});

server.addResource({
  async load() {
    return {
      text: `# EveWho API Information

EveWho is a service that allows you to view the members of EVE Online corporations and alliances, information that is not available within the game itself.

## API Endpoints Used

- **Character Info**: \`https://evewho.com/api/character/{character_id}\`
- **Corporation Members**: \`https://evewho.com/api/corplist/{corporation_id}\`
- **Alliance Corporations**: \`https://evewho.com/api/allilist/{alliance_id}\`

## Rate Limiting

EveWho has a rate limit of 10 requests within a 30-second time period. Exceeding this limit will result in temporary blocking.

## Data Sources

- Character, corporation, and alliance names are resolved to IDs using EVE Online's ESI API
- Member and activity data comes from EveWho's database
- All data is within CCP Games' Terms of Service

## Delta Explanation

Delta represents the change in member count from 7 days ago. A positive delta indicates growth, while a negative delta indicates a decrease in membership.
`,
    };
  },
  mimeType: "text/markdown",
  name: "EveWho API Information",
  uri: "evewho://api-info",
});

server.addPrompt({
  arguments: [
    {
      description: "Type of entity to investigate",
      enum: ["character", "corporation", "alliance"],
      name: "entityType",
      required: true,
    },
    {
      description: "Name of the entity to investigate",
      name: "entityName",
      required: true,
    },
    {
      description: "Specific area to focus the investigation on",
      enum: ["membership", "activity", "history", "connections", "general"],
      name: "focusArea",
      required: false,
    },
  ],
  description: "Generate a comprehensive OSINT report for an EVE Online entity",
  load: async (args) => {
    const { entityName, entityType, focusArea = "general" } = args;

    let prompt = `Generate a comprehensive OSINT (Open Source Intelligence) report for the EVE Online ${entityType} "${entityName}".`;

    switch (focusArea) {
      case "activity":
        prompt += ` Focus on activity metrics, including recent changes in membership, growth patterns, and signs of active vs inactive status.`;
        break;
      case "connections":
        prompt += ` Focus on relationship mapping, including alliance connections, corporate relationships, and network analysis.`;
        break;
      case "history":
        prompt += ` Focus on historical analysis, including past affiliations, membership changes over time, and significant events.`;
        break;
      case "membership":
        prompt += ` Focus particularly on membership analysis, including member activity patterns, recruitment trends, and member retention.`;
        break;
      default:
        prompt += ` Provide a balanced overview covering membership, activity, and key relationships.`;
    }

    prompt += `\n\nUse the appropriate OSINT tool (character-osint, corporation-osint, or alliance-osint) to gather the data, then analyze and present the findings in a structured intelligence report format.`;

    return prompt;
  },
  name: "eve-osint-report",
});

server.start({
  transportType: "stdio",
});
