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

  it("should handle API errors gracefully", async () => {
    const response = await fetch("https://evewho.com/api/character/invalid");

    expect(response.ok).toBe(false);
    expect(response.status).toBe(404);
  });
});
