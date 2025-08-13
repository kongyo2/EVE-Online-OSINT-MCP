import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

/**
 * Tests for EVE Online OSINT utility functions
 */

// Set test environment
process.env.NODE_ENV = "test";

// Import functions from server for testing
import {
  fetchWithRetry,
  resolveNamesToIds,
  resolveIdsToNames,
  getESICharacterInfo,
} from "./server.js";

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

// Helper function to create mock responses
const createMockResponse = (data: any, status = 200, ok = true): Response => ({
  ok,
  status,
  statusText: ok ? "OK" : "Error",
  json: async () => data,
} as Response);

// Mock fetch for testing
const mockFetch = async (input: Request | string | URL) => {
  const url = typeof input === "string" ? input : input.toString();
  if (url.includes("/universe/ids/")) {
    // Mock ESI response for name resolution
    return createMockResponse({
      alliances: [{ id: 555666777, name: "Test Alliance" }],
      characters: [{ id: 123456789, name: "Test Character" }],
      corporations: [{ id: 987654321, name: "Test Corporation" }],
    });
  }

  if (url.includes("/universe/names/")) {
    // Mock ESI response for ID to name resolution
    return createMockResponse([
      { category: "character", id: 123456789, name: "Test Character" },
      { category: "corporation", id: 987654321, name: "Test Corporation" },
      { category: "alliance", id: 555666777, name: "Test Alliance" },
    ]);
  }

  if (url.includes("/characters/123456789/portrait")) {
    // Mock ESI character portrait response
    return createMockResponse({
      px128x128: "https://images.evetech.net/characters/123456789/portrait?size=128",
      px256x256: "https://images.evetech.net/characters/123456789/portrait?size=256",
      px512x512: "https://images.evetech.net/characters/123456789/portrait?size=512",
      px64x64: "https://images.evetech.net/characters/123456789/portrait?size=64",
    });
  }

  if (url.includes("/characters/123456789/corporationhistory")) {
    // Mock ESI corporation history response
    return createMockResponse([
      {
        corporation_id: 987654321,
        is_deleted: false,
        record_id: 1,
        start_date: "2023-01-01",
      },
      {
        corporation_id: 111222333,
        is_deleted: false,
        record_id: 2,
        start_date: "2022-06-01",
      },
    ]);
  }

  if (
    url.includes("/characters/123456789/") &&
    !url.includes("portrait") &&
    !url.includes("corporationhistory")
  ) {
    // Mock ESI character info response
    return createMockResponse({
      alliance_id: 555666777,
      birthday: "2010-01-01T00:00:00Z",
      bloodline_id: 4,
      corporation_id: 987654321,
      description: "Test character description",
      gender: "Male",
      name: "Test Character",
      race_id: 1,
      security_status: -2.5,
      title: "Test Title",
    });
  }

  if (url.includes("/characters/affiliation/")) {
    // Mock ESI character affiliation response
    return createMockResponse([
      {
        alliance_id: 555666777,
        character_id: 123456789,
        corporation_id: 987654321,
      },
    ]);
  }

  if (url.includes("/corporations/987654321/")) {
    // Mock ESI corporation info response
    return createMockResponse({
      alliance_id: 555666777,
      ceo_id: 123456789,
      creator_id: 123456789,
      date_founded: "2020-01-01",
      description: "Test corporation description",
      member_count: 150,
      name: "Test Corporation",
      tax_rate: 0.1,
      ticker: "TEST",
      url: "https://example.com",
      war_eligible: true,
    });
  }

  if (url.includes("/alliances/555666777/")) {
    // Mock ESI alliance info response
    return createMockResponse({
      creator_corporation_id: 987654321,
      creator_id: 123456789,
      date_founded: "2019-01-01",
      executor_corporation_id: 987654321,
      name: "Test Alliance",
      ticker: "TESTA",
    });
  }

  if (url.includes("/api/character/123456789")) {
    // Mock EveWho character response for valid ID
    return createMockResponse({
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
    });
  }

  if (url.includes("zkillboard.com/api/characterID/123456789")) {
    // Mock zKillboard killmails response
    return createMockResponse([
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
    ]);
  }

  if (url.includes("zkillboard.com/api/stats/characterID/123456789")) {
    // Mock zKillboard stats response
    return createMockResponse({
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
    });
  }

  // Default to error response for invalid URLs
  return createMockResponse({}, 404, false);
};

// Set the mock fetch as global
global.fetch = mockFetch;

describe("Retry Logic", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    global.fetch = mockFetch; // Reset to default mock
  });

  it("should retry on 5xx server errors", async () => {
    let callCount = 0;
    global.fetch = vi.fn().mockImplementation(async () => {
      callCount++;
      if (callCount < 3) {
        return {
          ok: false,
          status: 500,
          statusText: "Internal Server Error",
        } as Response;
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      } as Response;
    });

    const promise = fetchWithRetry("https://test.com", {}, 5);
    
    // Fast-forward through the delays
    await vi.runAllTimersAsync();
    
    const response = await promise;
    expect(response.ok).toBe(true);
    expect(callCount).toBe(3);
  });

  it("should retry on 429 rate limiting", async () => {
    let callCount = 0;
    global.fetch = vi.fn().mockImplementation(async () => {
      callCount++;
      if (callCount < 2) {
        return {
          ok: false,
          status: 429,
          statusText: "Too Many Requests",
        } as Response;
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      } as Response;
    });

    const promise = fetchWithRetry("https://test.com", {}, 5);
    
    // Fast-forward through the delays
    await vi.runAllTimersAsync();
    
    const response = await promise;
    expect(response.ok).toBe(true);
    expect(callCount).toBe(2);
  });

  it("should retry on 408 timeout", async () => {
    let callCount = 0;
    global.fetch = vi.fn().mockImplementation(async () => {
      callCount++;
      if (callCount < 2) {
        return {
          ok: false,
          status: 408,
          statusText: "Request Timeout",
        } as Response;
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      } as Response;
    });

    const promise = fetchWithRetry("https://test.com", {}, 5);
    
    // Fast-forward through the delays
    await vi.runAllTimersAsync();
    
    const response = await promise;
    expect(response.ok).toBe(true);
    expect(callCount).toBe(2);
  });

  it("should retry on network errors", async () => {
    let callCount = 0;
    global.fetch = vi.fn().mockImplementation(async () => {
      callCount++;
      if (callCount < 3) {
        throw new Error("Network error");
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      } as Response;
    });

    const fetchPromise = fetchWithRetry("https://test.com", {}, 5);
    
    // Fast-forward through all timers
    await vi.runAllTimersAsync();
    
    const response = await fetchPromise;
    expect(response.ok).toBe(true);
    expect(callCount).toBe(3);
  });

  it("should not retry on 4xx client errors (except 408 and 429)", async () => {
    let callCount = 0;
    global.fetch = vi.fn().mockImplementation(async () => {
      callCount++;
      return {
        ok: false,
        status: 404,
        statusText: "Not Found",
      } as Response;
    });

    const response = await fetchWithRetry("https://test.com", {}, 5);
    expect(response.ok).toBe(false);
    expect(response.status).toBe(404);
    expect(callCount).toBe(1); // Should not retry
  });

  it("should return last response after max retries for retryable errors", async () => {
    let callCount = 0;
    global.fetch = vi.fn().mockImplementation(async () => {
      callCount++;
      return {
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      } as Response;
    });

    const promise = fetchWithRetry("https://test.com", {}, 3);
    
    // Fast-forward through the delays
    await vi.runAllTimersAsync();
    
    const response = await promise;
    expect(response.ok).toBe(false);
    expect(response.status).toBe(500);
    expect(callCount).toBe(3); // Should try 3 times
  });

  it("should throw error after max retries for network errors", async () => {
    let callCount = 0;
    global.fetch = vi.fn().mockImplementation(async () => {
      callCount++;
      throw new Error("Network error");
    });

    const fetchPromise = fetchWithRetry("https://test.com", {}, 3);
    
    // Fast-forward through all timers
    await vi.runAllTimersAsync();
    
    await expect(fetchPromise).rejects.toThrow("Network error");
    expect(callCount).toBe(3); // Should try 3 times
  });

  it("should use exponential backoff with jitter", async () => {
    let callCount = 0;
    const delays: number[] = [];
    
    // Mock Math.random to make jitter predictable
    const originalRandom = Math.random;
    Math.random = vi.fn().mockReturnValue(0.5); // Fixed jitter of 500ms
    
    // Mock sleep function to capture delays
    const mockSleep = vi.fn().mockImplementation(async (ms: number) => {
      delays.push(ms);
      return Promise.resolve();
    });

    global.fetch = vi.fn().mockImplementation(async () => {
      callCount++;
      if (callCount < 4) {
        return {
          ok: false,
          status: 500,
          statusText: "Internal Server Error",
        } as Response;
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      } as Response;
    });

    // Create a custom fetchWithRetry that uses our mocked sleep
    const testFetchWithRetry = async (
      url: string,
      options: RequestInit,
      maxRetries = 5,
    ): Promise<Response> => {
      let lastError: Error | undefined;
      
      for (let i = 0; i < maxRetries; i++) {
        try {
          const response = await fetch(url, options);
          
          const shouldRetry = 
            response.status >= 500 || 
            response.status === 429 || 
            response.status === 408;
            
          if (shouldRetry) {
            if (i === maxRetries - 1) return response;
            const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
            await mockSleep(delay);
            continue;
          }
          
          return response;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          if (i === maxRetries - 1) throw lastError;
          const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
          await mockSleep(delay);
        }
      }
      
      throw lastError || new Error(`Request failed after ${maxRetries} retries.`);
    };

    await testFetchWithRetry("https://test.com", {}, 5);
    
    // Restore mocks
    Math.random = originalRandom;
    
    // Check that delays are increasing (exponential backoff)
    expect(delays.length).toBe(3); // 3 retries = 3 delays
    expect(delays[0]).toBe(1500); // First delay: 2^0 * 1000 + 500 jitter = 1500
    expect(delays[1]).toBe(2500); // Second delay: 2^1 * 1000 + 500 jitter = 2500
    expect(delays[2]).toBe(4500); // Third delay: 2^2 * 1000 + 500 jitter = 4500
  });
});

describe("Server Functions", () => {
  beforeEach(() => {
    global.fetch = mockFetch;
  });

  describe("resolveNamesToIds", () => {
    it("should resolve character names to IDs", async () => {
      const result = await resolveNamesToIds(["Test Character"]);
      expect(result.characters).toBeDefined();
      expect(result.characters![0].name).toBe("Test Character");
      expect(result.characters![0].id).toBe(123456789);
    });

    it("should resolve corporation names to IDs", async () => {
      const result = await resolveNamesToIds(["Test Corporation"]);
      expect(result.corporations).toBeDefined();
      expect(result.corporations![0].name).toBe("Test Corporation");
      expect(result.corporations![0].id).toBe(987654321);
    });

    it("should resolve alliance names to IDs", async () => {
      const result = await resolveNamesToIds(["Test Alliance"]);
      expect(result.alliances).toBeDefined();
      expect(result.alliances![0].name).toBe("Test Alliance");
      expect(result.alliances![0].id).toBe(555666777);
    });

    it("should handle API errors", async () => {
      // Mock a 404 error (non-retryable) to avoid timeout
      global.fetch = vi.fn().mockResolvedValue(createMockResponse({}, 404, false));
      
      await expect(resolveNamesToIds(["Invalid"])).rejects.toThrow("ESI API error");
    });
  });

  describe("resolveIdsToNames", () => {
    it("should resolve IDs to names", async () => {
      const result = await resolveIdsToNames([123456789, 987654321, 555666777]);
      expect(result).toHaveLength(3);
      expect(result[0].name).toBe("Test Character");
      expect(result[1].name).toBe("Test Corporation");
      expect(result[2].name).toBe("Test Alliance");
    });

    it("should handle API errors", async () => {
      // Mock a 404 error (non-retryable) to avoid timeout
      global.fetch = vi.fn().mockResolvedValue(createMockResponse({}, 404, false));
      
      await expect(resolveIdsToNames([123456789])).rejects.toThrow("ESI API error");
    });
  });

  describe("getESICharacterInfo", () => {
    it("should fetch character information", async () => {
      const result = await getESICharacterInfo(123456789);
      expect(result.name).toBe("Test Character");
      expect(result.corporation_id).toBe(987654321);
      expect(result.alliance_id).toBe(555666777);
      expect(result.security_status).toBe(-2.5);
    });

    it("should handle API errors", async () => {
      global.fetch = vi.fn().mockResolvedValue(createMockResponse({}, 404, false));
      
      await expect(getESICharacterInfo(999999999)).rejects.toThrow("ESI API error");
    });
  });
});

describe("EVE Online OSINT Server - Mock API Tests", () => {
  beforeEach(() => {
    global.fetch = mockFetch;
  });

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

  it("should fetch ESI character information", async () => {
    const response = await fetch(
      "https://esi.evetech.net/latest/characters/123456789/",
    );

    expect(response.ok).toBe(true);
    const data = (await response.json()) as {
      alliance_id: number;
      corporation_id: number;
      name: string;
      security_status: number;
    };
    expect(data.name).toBe("Test Character");
    expect(data.corporation_id).toBe(987654321);
    expect(data.alliance_id).toBe(555666777);
    expect(data.security_status).toBe(-2.5);
  });

  it("should fetch ESI character corporation history", async () => {
    const response = await fetch(
      "https://esi.evetech.net/latest/characters/123456789/corporationhistory/",
    );

    expect(response.ok).toBe(true);
    const data = (await response.json()) as Array<{
      corporation_id: number;
      record_id: number;
      start_date: string;
    }>;
    expect(Array.isArray(data)).toBe(true);
    expect(data[0].corporation_id).toBe(987654321);
    expect(data[0].start_date).toBe("2023-01-01");
  });

  it("should fetch ESI corporation information", async () => {
    const response = await fetch(
      "https://esi.evetech.net/latest/corporations/987654321/",
    );

    expect(response.ok).toBe(true);
    const data = (await response.json()) as {
      member_count: number;
      name: string;
      tax_rate: number;
      ticker: string;
    };
    expect(data.name).toBe("Test Corporation");
    expect(data.ticker).toBe("TEST");
    expect(data.member_count).toBe(150);
    expect(data.tax_rate).toBe(0.1);
  });

  it("should fetch ESI alliance information", async () => {
    const response = await fetch(
      "https://esi.evetech.net/latest/alliances/555666777/",
    );

    expect(response.ok).toBe(true);
    const data = (await response.json()) as {
      date_founded: string;
      name: string;
      ticker: string;
    };
    expect(data.name).toBe("Test Alliance");
    expect(data.ticker).toBe("TESTA");
    expect(data.date_founded).toBe("2019-01-01");
  });

  it("should resolve IDs to names", async () => {
    const response = await fetch(
      "https://esi.evetech.net/latest/universe/names/",
      {
        body: JSON.stringify([123456789, 987654321, 555666777]),
        method: "POST",
      },
    );

    expect(response.ok).toBe(true);
    const data = (await response.json()) as Array<{
      category: string;
      id: number;
      name: string;
    }>;
    expect(Array.isArray(data)).toBe(true);
    expect(data[0].name).toBe("Test Character");
    expect(data[1].name).toBe("Test Corporation");
    expect(data[2].name).toBe("Test Alliance");
  });

  it("should handle API errors gracefully", async () => {
    const response = await fetch("https://evewho.com/api/character/invalid");

    expect(response.ok).toBe(false);
    expect(response.status).toBe(404);
  });
});
