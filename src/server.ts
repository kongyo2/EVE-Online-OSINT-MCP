import { FastMCP } from "fastmcp";
import { z } from "zod";

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 5,
): Promise<Response> {
  let lastError: Error | undefined;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);

      // Retry on server errors (5xx), rate limiting (429), and timeout (408)
      const shouldRetry =
        response.status >= 500 ||
        response.status === 429 ||
        response.status === 408;

      if (shouldRetry) {
        if (i === maxRetries - 1) return response; // Return last attempt
        const delay = Math.pow(2, i) * 1000 + Math.random() * 1000; // Exponential backoff with jitter
        await sleep(delay);
        continue;
      }

      return response; // Success or non-retryable error
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (i === maxRetries - 1) throw lastError; // Rethrow last attempt's error
      const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
      await sleep(delay);
    }
  }

  // This should never be reached, but TypeScript requires it
  throw lastError || new Error(`Request failed after ${maxRetries} retries.`);
}

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
// zKillboard API base URL
const ZKILLBOARD_BASE_URL = "https://zkillboard.com/api";

interface ESIAllianceInfo {
  creator_corporation_id: number;
  creator_id: number;
  date_founded: string;
  executor_corporation_id?: number;
  faction_id?: number;
  name: string;
  ticker: string;
}

interface ESICharacterCorporationHistory {
  corporation_id: number;
  is_deleted?: boolean;
  record_id: number;
  start_date: string;
}

interface ESICharacterInfo {
  alliance_id?: number;
  birthday: string;
  bloodline_id: number;
  corporation_id: number;
  description?: string;
  faction_id?: number;
  gender: string;
  name: string;
  race_id: number;
  security_status?: number;
  title?: string;
}

interface ESICorporationInfo {
  alliance_id?: number;
  ceo_id: number;
  creator_id: number;
  date_founded?: string;
  description?: string;
  faction_id?: number;
  home_station_id?: number;
  member_count: number;
  name: string;
  shares?: number;
  tax_rate: number;
  ticker: string;
  url?: string;
  war_eligible?: boolean;
}

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

interface ZKillboardKillmail {
  attackers: Array<{
    alliance_id?: number;
    character_id?: number;
    corporation_id?: number;
    damage_done: number;
    faction_id?: number;
    final_blow: boolean;
    security_status: number;
    ship_type_id?: number;
    weapon_type_id?: number;
  }>;
  killmail_id: number;
  killmail_time: string;
  solar_system_id: number;
  victim: {
    alliance_id?: number;
    character_id?: number;
    corporation_id: number;
    damage_taken: number;
    faction_id?: number;
    items?: Array<{
      flag: number;
      item_type_id: number;
      quantity_destroyed?: number;
      quantity_dropped?: number;
      singleton: number;
    }>;
    position: {
      x: number;
      y: number;
      z: number;
    };
    ship_type_id: number;
  };
  zkb: {
    awox: boolean;
    destroyedValue: number;
    droppedValue: number;
    fittedValue: number;
    hash: string;
    href: string;
    locationID: number;
    npc: boolean;
    points: number;
    solo: boolean;
    totalValue: number;
  };
}

interface ZKillboardStats {
  allTimeSum: number;
  groups: Record<string, ZKillboardStatsEntry>;
  id: number;
  info?: {
    id: number;
    name: string;
    type: string;
  };
  months: Record<string, ZKillboardStatsEntry>;
  topAllTime: Array<{
    id: number;
    isk: number;
    kills: number;
    type: string;
  }>;
  topIsk: Array<{
    id: number;
    isk: number;
    kills: number;
    type: string;
  }>;
  type: string;
}

interface ZKillboardStatsEntry {
  isk: number;
  kills: number;
}

/**
 * Get alliance member corporations from EveWho
 */
async function getAllianceCorps(
  allianceId: number,
): Promise<EveWhoAllianceResponse> {
  try {
    const response = await fetchWithRetry(`${EVEWHO_BASE_URL}/allilist/${allianceId}`, {
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
    const response = await fetchWithRetry(
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
 * Get character killmails from zKillboard (latest 20)
 */
async function getCharacterKillmails(
  characterId: number,
): Promise<ZKillboardKillmail[]> {
  try {
    const response = await fetchWithRetry(
      `${ZKILLBOARD_BASE_URL}/characterID/${characterId}/`,
      {
        headers: {
          "Accept-Encoding": "gzip",
          "User-Agent": "EVE-OSINT-MCP/1.0.0 Maintainer: eve-osint@example.com",
        },
      },
    );

    if (!response.ok) {
      throw new Error(
        `zKillboard API error: ${response.status} ${response.statusText}`,
      );
    }

    const killmails = (await response.json()) as ZKillboardKillmail[];
    return killmails.slice(0, 20); // Return latest 20 killmails
  } catch (error) {
    throw new Error(
      `Failed to get character killmails: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Get character statistics from zKillboard
 */
async function getCharacterStats(
  characterId: number,
): Promise<ZKillboardStats> {
  try {
    const response = await fetchWithRetry(
      `${ZKILLBOARD_BASE_URL}/stats/characterID/${characterId}/`,
      {
        headers: {
          "Accept-Encoding": "gzip",
          "User-Agent": "EVE-OSINT-MCP/1.0.0 Maintainer: eve-osint@example.com",
        },
      },
    );

    if (!response.ok) {
      throw new Error(
        `zKillboard API error: ${response.status} ${response.statusText}`,
      );
    }

    return (await response.json()) as ZKillboardStats;
  } catch (error) {
    throw new Error(
      `Failed to get character stats: ${error instanceof Error ? error.message : String(error)}`,
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
    const response = await fetchWithRetry(
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
 * Get alliance information from ESI
 */
async function getESIAllianceInfo(
  allianceId: number,
): Promise<ESIAllianceInfo> {
  try {
    const response = await fetchWithRetry(`${ESI_BASE_URL}/alliances/${allianceId}/`, {
      headers: {
        "User-Agent": "EVE-OSINT-MCP/1.0.0",
      },
    });

    if (!response.ok) {
      throw new Error(
        `ESI API error: ${response.status} ${response.statusText}`,
      );
    }

    return (await response.json()) as ESIAllianceInfo;
  } catch (error) {
    throw new Error(
      `Failed to get ESI alliance info: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Get character corporation history from ESI
 */
async function getESICharacterCorporationHistory(
  characterId: number,
): Promise<ESICharacterCorporationHistory[]> {
  try {
    const response = await fetchWithRetry(
      `${ESI_BASE_URL}/characters/${characterId}/corporationhistory/`,
      {
        headers: {
          "User-Agent": "EVE-OSINT-MCP/1.0.0",
        },
      },
    );

    if (!response.ok) {
      throw new Error(
        `ESI API error: ${response.status} ${response.statusText}`,
      );
    }

    return (await response.json()) as ESICharacterCorporationHistory[];
  } catch (error) {
    throw new Error(
      `Failed to get ESI character corporation history: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Get character public information from ESI
 */
async function getESICharacterInfo(
  characterId: number,
): Promise<ESICharacterInfo> {
  try {
    const response = await fetchWithRetry(`${ESI_BASE_URL}/characters/${characterId}/`, {
      headers: {
        "User-Agent": "EVE-OSINT-MCP/1.0.0",
      },
    });

    if (!response.ok) {
      throw new Error(
        `ESI API error: ${response.status} ${response.statusText}`,
      );
    }

    return (await response.json()) as ESICharacterInfo;
  } catch (error) {
    throw new Error(
      `Failed to get ESI character info: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}



/**
 * Get corporation information from ESI
 */
async function getESICorporationInfo(
  corporationId: number,
): Promise<ESICorporationInfo> {
  try {
    const response = await fetchWithRetry(
      `${ESI_BASE_URL}/corporations/${corporationId}/`,
      {
        headers: {
          "User-Agent": "EVE-OSINT-MCP/1.0.0",
        },
      },
    );

    if (!response.ok) {
      throw new Error(
        `ESI API error: ${response.status} ${response.statusText}`,
      );
    }

    return (await response.json()) as ESICorporationInfo;
  } catch (error) {
    throw new Error(
      `Failed to get ESI corporation info: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Resolve IDs to names using ESI
 */
async function resolveIdsToNames(
  ids: number[],
): Promise<Array<{ category: string; id: number; name: string }>> {
  try {
    const response = await fetchWithRetry(`${ESI_BASE_URL}/universe/names/`, {
      body: JSON.stringify(ids),
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

    return (await response.json()) as Array<{
      category: string;
      id: number;
      name: string;
    }>;
  } catch (error) {
    throw new Error(
      `Failed to resolve IDs to names: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Resolve entity names to IDs using ESI
 */
async function resolveNamesToIds(names: string[]): Promise<ESIResolveResponse> {
  try {
    const response = await fetchWithRetry(`${ESI_BASE_URL}/universe/ids/`, {
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

      // Get character information from multiple sources
      log.info("Fetching character data from multiple sources", {
        characterId: character.id,
      });
      const [
        esiCharacterInfo,
        esiCorpHistory,
        eveWhoInfo,
        killmails,
        zkbStats,
      ] = await Promise.allSettled([
        getESICharacterInfo(character.id),
        getESICharacterCorporationHistory(character.id),
        getCharacterInfo(character.id),
        getCharacterKillmails(character.id),
        getCharacterStats(character.id),
      ]);

      let result = `# Character OSINT Report: ${character.name}\n\n`;
      result += `**Character ID:** ${character.id}\n`;
      result += `**Character Name:** ${character.name}\n\n`;

      // ESI Character Information
      if (esiCharacterInfo.status === "fulfilled") {
        const esiInfo = esiCharacterInfo.value;
        result += `## ESI Character Information\n`;
        result += `**Birthday:** ${esiInfo.birthday}\n`;
        result += `**Gender:** ${esiInfo.gender}\n`;
        result += `**Corporation ID:** ${esiInfo.corporation_id}\n`;
        if (esiInfo.alliance_id) {
          result += `**Alliance ID:** ${esiInfo.alliance_id}\n`;
        }
        if (esiInfo.security_status !== undefined) {
          result += `**Security Status:** ${esiInfo.security_status.toFixed(2)}\n`;
        }
        if (esiInfo.description) {
          result += `**Description:** ${esiInfo.description}\n`;
        }
        if (esiInfo.title) {
          result += `**Title:** ${esiInfo.title}\n`;
        }
        result += `\n`;
      }



      // ESI Corporation History
      if (esiCorpHistory.status === "fulfilled") {
        const corpHistory = esiCorpHistory.value;
        result += `## Corporation History (ESI)\n`;
        if (corpHistory.length > 0) {
          // Get corporation names for the history
          const corpIds = [
            ...new Set(corpHistory.map((entry) => entry.corporation_id)),
          ];
          try {
            const corpNames = await resolveIdsToNames(corpIds);
            const corpNameMap = new Map(
              corpNames.map((corp) => [corp.id, corp.name]),
            );

            corpHistory.forEach((entry, index: number) => {
              const corpName =
                corpNameMap.get(entry.corporation_id) ||
                `Unknown (${entry.corporation_id})`;
              result += `${index + 1}. **${corpName}** (ID: ${entry.corporation_id}) - Started: ${entry.start_date}`;
              if (entry.is_deleted) {
                result += ` [DELETED]`;
              }
              result += `\n`;
            });
          } catch {
            // Fallback to showing IDs only
            corpHistory.forEach((entry, index: number) => {
              result += `${index + 1}. **Corporation ID: ${entry.corporation_id}** - Started: ${entry.start_date}`;
              if (entry.is_deleted) {
                result += ` [DELETED]`;
              }
              result += `\n`;
            });
          }
        } else {
          result += "No corporation history available.\n";
        }
        result += `\n`;
      }

      // EveWho Information (for additional context)
      if (eveWhoInfo.status === "fulfilled") {
        const eveWhoData = eveWhoInfo.value;
        result += `## EveWho Additional Information\n`;
        if (eveWhoData.corporation) {
          result += `**Corporation:** ${eveWhoData.corporation.name} (ID: ${eveWhoData.corporation.corporation_id})\n`;
        }
        if (eveWhoData.alliance) {
          result += `**Alliance:** ${eveWhoData.alliance.name} (ID: ${eveWhoData.alliance.alliance_id})\n`;
        }
        if (eveWhoData.last_login) {
          result += `**Last Login:** ${eveWhoData.last_login}\n`;
        }
        result += `\n`;
      }

      // Add zKillboard statistics
      if (zkbStats.status === "fulfilled") {
        result += `\n## zKillboard Statistics (Raw Data)\n`;
        result += `\`\`\`json\n${JSON.stringify(zkbStats.value, null, 2)}\n\`\`\`\n`;
      } else {
        result += `\n## zKillboard Statistics\n`;
        result += `Error fetching statistics: ${zkbStats.reason}\n`;
      }

      // Add recent killmails
      if (killmails.status === "fulfilled" && killmails.value.length > 0) {
        result += `\n## Recent Killmails (Latest 20 - Raw Data)\n`;
        result += `\`\`\`json\n${JSON.stringify(killmails.value, null, 2)}\n\`\`\`\n`;
      } else if (killmails.status === "fulfilled") {
        result += `\n## Recent Killmails\n`;
        result += `No recent killmails found.\n`;
      } else {
        result += `\n## Recent Killmails\n`;
        result += `Error fetching killmails: ${killmails.reason}\n`;
      }

      result += `\n---\n*Data provided by EveWho API and zKillboard API*`;

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

      // Get corporation information from multiple sources
      log.info("Fetching corporation data from multiple sources", {
        corporationId: corporation.id,
      });
      const [esiCorpInfo, eveWhoCorpData] = await Promise.allSettled([
        getESICorporationInfo(corporation.id),
        getCorporationMembers(corporation.id),
      ]);

      let result = `# Corporation OSINT Report: ${corporation.name}\n\n`;
      result += `**Corporation ID:** ${corporation.id}\n`;
      result += `**Corporation Name:** ${corporation.name}\n\n`;

      // ESI Corporation Information
      if (esiCorpInfo.status === "fulfilled") {
        const esiInfo = esiCorpInfo.value;
        result += `## ESI Corporation Information\n`;
        result += `**Name:** ${esiInfo.name}\n`;
        result += `**Ticker:** ${esiInfo.ticker}\n`;
        result += `**Member Count:** ${esiInfo.member_count}\n`;
        result += `**Tax Rate:** ${(esiInfo.tax_rate * 100).toFixed(1)}%\n`;
        if (esiInfo.date_founded) {
          result += `**Founded:** ${esiInfo.date_founded}\n`;
        }
        if (esiInfo.alliance_id) {
          result += `**Alliance ID:** ${esiInfo.alliance_id}\n`;
        }
        result += `**CEO ID:** ${esiInfo.ceo_id}\n`;
        result += `**Creator ID:** ${esiInfo.creator_id}\n`;
        if (esiInfo.description) {
          result += `**Description:** ${esiInfo.description}\n`;
        }
        if (esiInfo.url) {
          result += `**URL:** ${esiInfo.url}\n`;
        }
        if (esiInfo.war_eligible !== undefined) {
          result += `**War Eligible:** ${esiInfo.war_eligible ? "Yes" : "No"}\n`;
        }
        result += `\n`;
      }

      // EveWho Corporation Data
      if (eveWhoCorpData.status === "fulfilled") {
        const corpData = eveWhoCorpData.value;
        result += `## EveWho Corporation Statistics\n`;
        if (corpData.memberCount !== undefined) {
          result += `**Total Members (EveWho):** ${corpData.memberCount}\n`;
        }
        if (corpData.delta !== undefined) {
          result += `**7-Day Delta:** ${corpData.delta > 0 ? "+" : ""}${corpData.delta}\n`;
        }
        if (corpData.alliance) {
          result += `**Alliance:** ${corpData.alliance.name} (ID: ${corpData.alliance.alliance_id})\n`;
        }

        result += `\n## Member List (EveWho)\n`;
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

      // Get alliance information from multiple sources
      log.info("Fetching alliance data from multiple sources", {
        allianceId: alliance.id,
      });
      const [esiAllianceInfo, eveWhoAllianceData] = await Promise.allSettled([
        getESIAllianceInfo(alliance.id),
        getAllianceCorps(alliance.id),
      ]);

      let result = `# Alliance OSINT Report: ${alliance.name}\n\n`;
      result += `**Alliance ID:** ${alliance.id}\n`;
      result += `**Alliance Name:** ${alliance.name}\n\n`;

      // ESI Alliance Information
      if (esiAllianceInfo.status === "fulfilled") {
        const esiInfo = esiAllianceInfo.value;
        result += `## ESI Alliance Information\n`;
        result += `**Name:** ${esiInfo.name}\n`;
        result += `**Ticker:** ${esiInfo.ticker}\n`;
        result += `**Founded:** ${esiInfo.date_founded}\n`;
        result += `**Creator Corporation ID:** ${esiInfo.creator_corporation_id}\n`;
        result += `**Creator ID:** ${esiInfo.creator_id}\n`;
        if (esiInfo.executor_corporation_id) {
          result += `**Executor Corporation ID:** ${esiInfo.executor_corporation_id}\n`;
        }
        if (esiInfo.faction_id) {
          result += `**Faction ID:** ${esiInfo.faction_id}\n`;
        }
        result += `\n`;
      }

      // EveWho Alliance Data
      if (eveWhoAllianceData.status === "fulfilled") {
        const allianceData = eveWhoAllianceData.value;
        result += `## EveWho Alliance Statistics\n`;
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
      text: `# API Information

This MCP server uses multiple APIs to provide comprehensive OSINT data for EVE Online entities.

## EveWho API

EveWho is a service that allows you to view the members of EVE Online corporations and alliances, information that is not available within the game itself.

### Endpoints Used
- **Character Info**: \`https://evewho.com/api/character/{character_id}\`
- **Corporation Members**: \`https://evewho.com/api/corplist/{corporation_id}\`
- **Alliance Corporations**: \`https://evewho.com/api/allilist/{alliance_id}\`

### Rate Limiting
EveWho has a rate limit of 10 requests within a 30-second time period. Exceeding this limit will result in temporary blocking.

### Delta Explanation
Delta represents the change in member count from 7 days ago. A positive delta indicates growth, while a negative delta indicates a decrease in membership.

## zKillboard API

zKillboard provides killmail and PvP statistics for EVE Online entities.

### Endpoints Used
- **Character Killmails**: \`https://zkillboard.com/api/characterID/{character_id}/\`
- **Character Statistics**: \`https://zkillboard.com/api/stats/characterID/{character_id}/\`

### Rate Limiting
- Do not hammer the server with API requests
- Space out multiple requests as much as possible
- Maximum of 1000 killmails per request
- Be reasonable with request frequency

### Data Format
- All killmail data is returned in raw JSON format
- Statistics include all-time totals, monthly breakdowns, and top kills
- Killmails include full victim, attacker, and item information

## ESI API

EVE Swagger Interface (ESI) is the official API for EVE Online, providing access to public game data.

### Endpoints Used
- **Name Resolution**: \`https://esi.evetech.net/latest/universe/ids/\`
- **ID to Name Resolution**: \`https://esi.evetech.net/latest/universe/names/\`
- **Character Public Info**: \`https://esi.evetech.net/latest/characters/{character_id}/\`
- **Character Portrait**: \`https://esi.evetech.net/latest/characters/{character_id}/portrait/\`
- **Character Affiliation**: \`https://esi.evetech.net/latest/characters/affiliation/\`
- **Character Corporation History**: \`https://esi.evetech.net/latest/characters/{character_id}/corporationhistory/\`
- **Corporation Info**: \`https://esi.evetech.net/latest/corporations/{corporation_id}/\`
- **Alliance Info**: \`https://esi.evetech.net/latest/alliances/{alliance_id}/\`

### Authentication
All endpoints used in this MCP server are **public and require no authentication**. They provide access to publicly available information only.

### Rate Limiting
ESI has built-in rate limiting. The server respects these limits and includes appropriate error handling.

## Data Sources

All data is within CCP Games' Terms of Service and uses publicly available information.
`,
    };
  },
  mimeType: "text/markdown",
  name: "API Information",
  uri: "api://info",
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

// Export functions for testing
export {
  fetchWithRetry,
  resolveNamesToIds,
  resolveIdsToNames,
  getESICharacterInfo,
  getESICorporationInfo,
  getESIAllianceInfo,
  getCharacterInfo,
  getCorporationMembers,
  getAllianceCorps,
  getCharacterKillmails,
  getCharacterStats,
};

// Start server only if not in test environment
if (process.env.NODE_ENV !== "test") {
  server.start({
    transportType: "stdio",
  });
}
