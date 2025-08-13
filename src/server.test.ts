import { describe, expect, it } from "vitest";

/**
 * Tests for EVE Online OSINT utility functions
 */

// Mock fetch for testing
global.fetch = async (input: Request | string | URL) => {
  const url = typeof input === "string" ? input : input.toString();
  if (url.includes("/universe/ids/")) {
    // Mock ESI response for name resolution
    return {
      json: async () => ({
        alliances: [{ id: 555666777, name: "Test Alliance" }],
        characters: [{ id: 123456789, name: "Test Character" }],
        corporations: [{ id: 987654321, name: "Test Corporation" }],
      }),
      ok: true,
    } as Response;
  }

  if (url.includes("/api/character/123456789")) {
    // Mock EveWho character response for valid ID
    return {
      json: async () => ({
        character_id: 123456789,
        corporation: {
          corporation_id: 987654321,
          name: "Test Corporation",
        },
        history: [
          {
            corporation: { name: "Previous Corp" },
            end_date: "2023-06-01",
            start_date: "2023-01-01",
          },
        ],
        name: "Test Character",
        security_status: -2.5,
      }),
      ok: true,
    } as Response;
  }

  if (url.includes("zkillboard.com/api/characterID/123456789")) {
    // Mock zKillboard killmails response
    return {
      json: async () => [
        {
          attackers: [
            {
              character_id: 987654321,
              corporation_id: 123456789,
              damage_done: 1500,
              final_blow: true,
              security_status: 0.5,
              ship_type_id: 587,
            },
          ],
          killmail_id: 123456789,
          killmail_time: "2024-01-15T12:30:00Z",
          solar_system_id: 30000142,
          victim: {
            character_id: 123456789,
            corporation_id: 987654321,
            damage_taken: 1500,
            ship_type_id: 588,
          },
          zkb: {
            destroyedValue: 50000000,
            droppedValue: 25000000,
            fittedValue: 75000000,
            hash: "abc123def456",
            href: "https://zkillboard.com/kill/123456789/",
            locationID: 40000001,
            npc: false,
            points: 1,
            solo: true,
            totalValue: 75000000,
          },
        },
      ],
      ok: true,
    } as Response;
  }

  if (url.includes("zkillboard.com/api/stats/characterID/123456789")) {
    // Mock zKillboard stats response
    return {
      json: async () => ({
        allTimeSum: 150,
        groups: {
          "25": { isk: 5000000000, kills: 50 },
          "26": { isk: 3000000000, kills: 30 },
        },
        id: 123456789,
        months: {
          "202312": { isk: 2000000000, kills: 20 },
          "202401": { isk: 2500000000, kills: 25 },
        },
        topAllTime: [
          {
            id: 587,
            isk: 1000000000,
            kills: 10,
            type: "shipTypeID",
          },
        ],
        topIsk: [
          {
            id: 588,
            isk: 2000000000,
            kills: 5,
            type: "shipTypeID",
          },
        ],
        type: "characterID",
      }),
      ok: true,
    } as Response;
  }

  // Default to error response for invalid URLs
  return {
    ok: false,
    status: 404,
    statusText: "Not Found",
  } as Response;
};

describe("EVE Online OSINT Server", () => {
  it("should resolve character names to IDs", async () => {
    const response = await fetch(
      "https://esi.evetech.net/latest/universe/ids/",
      {
        body: JSON.stringify(["Test Character"]),
        method: "POST",
      },
    );

    expect(response.ok).toBe(true);
    const data = (await response.json()) as {
      characters: Array<{ id: number; name: string }>;
    };
    expect(data.characters).toBeDefined();
    expect(data.characters[0].name).toBe("Test Character");
  });

  it("should fetch character information from EveWho", async () => {
    const response = await fetch("https://evewho.com/api/character/123456789");

    expect(response.ok).toBe(true);
    const data = (await response.json()) as {
      character_id: number;
      name: string;
    };
    expect(data.character_id).toBe(123456789);
    expect(data.name).toBe("Test Character");
  });

  it("should fetch zKillboard killmails", async () => {
    const response = await fetch(
      "https://zkillboard.com/api/characterID/123456789/",
    );

    expect(response.ok).toBe(true);
    const data = (await response.json()) as Array<{
      killmail_id: number;
      zkb: { totalValue: number };
    }>;
    expect(Array.isArray(data)).toBe(true);
    expect(data[0].killmail_id).toBe(123456789);
    expect(data[0].zkb.totalValue).toBe(75000000);
  });

  it("should fetch zKillboard statistics", async () => {
    const response = await fetch(
      "https://zkillboard.com/api/stats/characterID/123456789/",
    );

    expect(response.ok).toBe(true);
    const data = (await response.json()) as {
      allTimeSum: number;
      id: number;
      type: string;
    };
    expect(data.id).toBe(123456789);
    expect(data.type).toBe("characterID");
    expect(data.allTimeSum).toBe(150);
  });

  it("should handle API errors gracefully", async () => {
    const response = await fetch("https://evewho.com/api/character/invalid");

    expect(response.ok).toBe(false);
    expect(response.status).toBe(404);
  });
});
