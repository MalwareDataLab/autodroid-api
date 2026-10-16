import dns from "node:dns";
import { EventEmitter } from "node:events";
import { IncomingHttpHeaders } from "node:http";
import { RequestOptions } from "node:https";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Target import
import { ssrfSafeJsonFetch } from ".";

const { httpsRequestMock } = vi.hoisted(() => ({ httpsRequestMock: vi.fn() }));

vi.mock("node:https", () => ({
  default: { request: httpsRequestMock },
  request: httpsRequestMock,
}));

class FakeClientRequest extends EventEmitter {
  destroy = vi.fn((error?: Error) => {
    if (error) this.emit("error", error);
    return this;
  });

  end = vi.fn();
}

class FakeIncomingMessage extends EventEmitter {
  constructor(
    readonly statusCode: number | undefined,
    readonly headers: IncomingHttpHeaders,
  ) {
    super();
  }
}

type RespondToRequest = (
  statusCode: number | undefined,
  headers: IncomingHttpHeaders,
) => FakeIncomingMessage;

const createdRequests: FakeClientRequest[] = [];

const serveOnRequestEnd = (
  scenario: (respond: RespondToRequest, request: FakeClientRequest) => void,
) => {
  httpsRequestMock.mockImplementation(
    (
      _options: RequestOptions,
      onResponse: (response: FakeIncomingMessage) => void,
    ) => {
      const request = new FakeClientRequest();
      createdRequests.push(request);
      request.end.mockImplementation(() =>
        scenario((statusCode, headers) => {
          const response = new FakeIncomingMessage(statusCode, headers);
          onResponse(response);
          return response;
        }, request),
      );
      return request;
    },
  );
};

const serveJsonBody = (body: string) =>
  serveOnRequestEnd(respond => {
    const response = respond(200, { "content-type": "application/json" });
    response.emit("data", Buffer.from(body));
    response.emit("end");
    response.emit("close");
  });

const mockDnsResolution = (ipv4: string[] | Error, ipv6: string[] | Error) => {
  vi.spyOn(dns.promises.Resolver.prototype, "resolve4").mockImplementation(
    async () => {
      if (ipv4 instanceof Error) throw ipv4;
      return ipv4;
    },
  );
  vi.spyOn(dns.promises.Resolver.prototype, "resolve6").mockImplementation(
    async () => {
      if (ipv6 instanceof Error) throw ipv6;
      return ipv6;
    },
  );
};

const PUBLIC_IPV4 = "93.184.216.34";
const PUBLIC_IPV6 = "2606:2800:220:1:248:1893:25c8:1946";
const DEFAULT_OPTIONS = { timeoutMs: 2000, maxResponseBytes: 1024 };

describe("Util: ssrfSafeJsonFetch", () => {
  beforeEach(() => {
    createdRequests.length = 0;
    httpsRequestMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("URL shape validation", () => {
    it.each([
      "http://example.com/doc.json",
      "http://127.0.0.1/doc.json",
      "ftp://example.com/doc.json",
    ])("should reject the non-https URL %s", async url => {
      await expect(
        ssrfSafeJsonFetch(url, DEFAULT_OPTIONS),
      ).rejects.toThrowError("Only HTTPS URLs are allowed.");
      expect(httpsRequestMock).not.toHaveBeenCalled();
    });

    it("should reject a malformed URL", async () => {
      await expect(
        ssrfSafeJsonFetch("not a url", DEFAULT_OPTIONS),
      ).rejects.toThrowError('"not a url" is not a valid URL.');
    });

    it("should reject a URL carrying userinfo", async () => {
      await expect(
        ssrfSafeJsonFetch(
          "https://attacker:secret@example.com/doc.json",
          DEFAULT_OPTIONS,
        ),
      ).rejects.toThrowError("The URL must not contain user credentials.");
    });

    it("should reject a URL carrying a fragment", async () => {
      await expect(
        ssrfSafeJsonFetch("https://example.com/doc.json#frag", DEFAULT_OPTIONS),
      ).rejects.toThrowError("The URL must not contain a fragment.");
    });
  });

  describe("address validation", () => {
    it.each([
      ["https://127.0.0.1/doc.json", "127.0.0.1"],
      ["https://10.0.0.5/doc.json", "10.0.0.5"],
      ["https://169.254.169.254/doc.json", "169.254.169.254"],
      ["https://[::1]/doc.json", "::1"],
      ["https://[fc00::1]/doc.json", "fc00::1"],
      ["https://[::ffff:10.0.0.5]/doc.json", "::ffff:a00:5"],
      ["https://[64:ff9b:1::a00:1]/doc.json", "64:ff9b:1::a00:1"],
    ])(
      "should reject the IP literal in %s as a non-public address without resolving or connecting",
      async (url, address) => {
        const resolve4Spy = vi.spyOn(
          dns.promises.Resolver.prototype,
          "resolve4",
        );

        await expect(
          ssrfSafeJsonFetch(url, DEFAULT_OPTIONS),
        ).rejects.toThrowError(
          `Refusing to fetch a non-public address (${address}) for host "${address}".`,
        );
        expect(resolve4Spy).not.toHaveBeenCalled();
        expect(httpsRequestMock).not.toHaveBeenCalled();
      },
    );

    it("should reject a hostname that resolves to a private address", async () => {
      mockDnsResolution(["10.0.0.5"], new Error("queryAaaa ENOTFOUND"));

      await expect(
        ssrfSafeJsonFetch("https://internal.test/doc.json", DEFAULT_OPTIONS),
      ).rejects.toThrowError(
        'Refusing to fetch a non-public address (10.0.0.5) for host "internal.test".',
      );
      expect(httpsRequestMock).not.toHaveBeenCalled();
    });

    it("should reject a hostname when any one of its resolved addresses is non-public", async () => {
      mockDnsResolution([PUBLIC_IPV4], ["::1"]);

      await expect(
        ssrfSafeJsonFetch("https://mixed.test/doc.json", DEFAULT_OPTIONS),
      ).rejects.toThrowError(
        'Refusing to fetch a non-public address (::1) for host "mixed.test".',
      );
      expect(httpsRequestMock).not.toHaveBeenCalled();
    });

    it("should reject a hostname that resolves to no address at all", async () => {
      mockDnsResolution(
        new Error("queryA ENOTFOUND"),
        new Error("queryAaaa ENOTFOUND"),
      );

      await expect(
        ssrfSafeJsonFetch(
          "https://empty-resolution.test/doc.json",
          DEFAULT_OPTIONS,
        ),
      ).rejects.toThrowError('Could not resolve host "empty-resolution.test".');
    });

    it("should cancel the outstanding resolver query once the timeout elapses when DNS resolution never settles", async () => {
      vi.useFakeTimers();
      vi.spyOn(dns.promises.Resolver.prototype, "resolve4").mockReturnValue(
        new Promise(() => {}),
      );
      vi.spyOn(dns.promises.Resolver.prototype, "resolve6").mockReturnValue(
        new Promise(() => {}),
      );
      const cancelSpy = vi.spyOn(dns.promises.Resolver.prototype, "cancel");

      const fetchResult = expect(
        ssrfSafeJsonFetch("https://never-resolves.test/doc.json", {
          ...DEFAULT_OPTIONS,
          timeoutMs: 50,
        }),
      ).rejects.toThrowError("Request timed out.");
      await vi.advanceTimersByTimeAsync(50);
      await fetchResult;

      expect(cancelSpy).toHaveBeenCalledTimes(1);
      expect(httpsRequestMock).not.toHaveBeenCalled();
    });
  });

  describe("request pinning", () => {
    it("should pin the connection to the validated IPv4 address and send a bodyless JSON GET to the default port", async () => {
      mockDnsResolution([PUBLIC_IPV4], new Error("queryAaaa ENOTFOUND"));
      serveJsonBody('{"ok":true}');

      await ssrfSafeJsonFetch(
        "https://metadata.test/client.json?version=2",
        DEFAULT_OPTIONS,
      );

      expect(httpsRequestMock).toHaveBeenCalledTimes(1);
      const [requestOptions] = httpsRequestMock.mock.calls[0] as [
        RequestOptions,
      ];
      expect(requestOptions).toEqual({
        hostname: "metadata.test",
        lookup: expect.any(Function),
        port: 443,
        path: "/client.json?version=2",
        method: "GET",
        headers: { Accept: "application/json" },
        autoSelectFamily: false,
      });
      const lookupCallback = vi.fn();
      requestOptions.lookup!("attacker-rebound.test", {}, lookupCallback);
      expect(lookupCallback).toHaveBeenCalledWith(null, PUBLIC_IPV4, 4);
      expect(createdRequests[0].end).toHaveBeenCalledTimes(1);
    });

    it("should pin an IPv6-only hostname resolved through resolve6 alone and keep an explicit port", async () => {
      mockDnsResolution(new Error("queryA ENOTFOUND"), [PUBLIC_IPV6]);
      serveJsonBody('{"ok":true}');

      await ssrfSafeJsonFetch(
        "https://ipv6-only.test:8443/doc.json",
        DEFAULT_OPTIONS,
      );

      const [requestOptions] = httpsRequestMock.mock.calls[0] as [
        RequestOptions,
      ];
      expect(requestOptions.hostname).toBe("ipv6-only.test");
      expect(requestOptions.port).toBe("8443");
      const lookupCallback = vi.fn();
      requestOptions.lookup!("ipv6-only.test", {}, lookupCallback);
      expect(lookupCallback).toHaveBeenCalledWith(null, PUBLIC_IPV6, 6);
    });

    it("should connect to a public IPv6 literal without DNS, stripping its brackets", async () => {
      const resolve4Spy = vi.spyOn(dns.promises.Resolver.prototype, "resolve4");
      serveJsonBody('{"ok":true}');

      await ssrfSafeJsonFetch(
        `https://[${PUBLIC_IPV6}]/doc.json`,
        DEFAULT_OPTIONS,
      );

      const [requestOptions] = httpsRequestMock.mock.calls[0] as [
        RequestOptions,
      ];
      expect(requestOptions.hostname).toBe(PUBLIC_IPV6);
      const lookupCallback = vi.fn();
      requestOptions.lookup!(PUBLIC_IPV6, {}, lookupCallback);
      expect(lookupCallback).toHaveBeenCalledWith(null, PUBLIC_IPV6, 6);
      expect(resolve4Spy).not.toHaveBeenCalled();
    });
  });

  describe("response handling", () => {
    const fetchPublicDocument = (
      options: typeof DEFAULT_OPTIONS = DEFAULT_OPTIONS,
    ) => ssrfSafeJsonFetch(`https://${PUBLIC_IPV4}/doc.json`, options);

    it("should resolve with the parsed JSON body and the response headers on a 200 JSON response", async () => {
      serveOnRequestEnd(respond => {
        const response = respond(200, {
          "content-type": "application/json; charset=utf-8",
          etag: '"v1"',
        });
        response.emit("data", Buffer.from('{"client_id":'));
        response.emit("data", Buffer.from('"https://app.test/client.json"}'));
        response.emit("end");
        response.emit("close");
      });

      const result = await fetchPublicDocument();

      expect(result).toEqual({
        body: { client_id: "https://app.test/client.json" },
        headers: {
          "content-type": "application/json; charset=utf-8",
          etag: '"v1"',
        },
      });
      expect(createdRequests[0].destroy).not.toHaveBeenCalled();
    });

    it("should clear the deadline timer once the response settles so the request is never destroyed afterwards", async () => {
      vi.useFakeTimers();
      serveJsonBody('{"ok":true}');

      await expect(fetchPublicDocument()).resolves.toEqual({
        body: { ok: true },
        headers: { "content-type": "application/json" },
      });
      await vi.advanceTimersByTimeAsync(DEFAULT_OPTIONS.timeoutMs * 2);

      expect(createdRequests[0].destroy).not.toHaveBeenCalled();
    });

    it.each([
      [404, "Unexpected HTTP status 404."],
      [500, "Unexpected HTTP status 500."],
      [199, "Unexpected HTTP status 199."],
      [undefined, "Unexpected HTTP status undefined."],
    ])(
      "should reject status %s and destroy the request instead of draining it",
      async (statusCode, message) => {
        serveOnRequestEnd(respond => {
          respond(statusCode, { "content-type": "application/json" });
        });

        await expect(fetchPublicDocument()).rejects.toThrowError(message);
        expect(createdRequests[0].destroy).toHaveBeenCalledTimes(1);
        expect(createdRequests[0].destroy).toHaveBeenCalledWith();
      },
    );

    it("should reject a redirect without following it", async () => {
      serveOnRequestEnd(respond => {
        respond(302, { location: "https://10.0.0.5/elsewhere" });
      });

      await expect(fetchPublicDocument()).rejects.toThrowError(
        "Unexpected HTTP status 302.",
      );
      expect(httpsRequestMock).toHaveBeenCalledTimes(1);
      expect(createdRequests[0].destroy).toHaveBeenCalledTimes(1);
    });

    it("should reject a non-JSON content type and destroy the request", async () => {
      serveOnRequestEnd(respond => {
        respond(200, { "content-type": "text/html" });
      });

      await expect(fetchPublicDocument()).rejects.toThrowError(
        'Unexpected content type "text/html", expected JSON.',
      );
      expect(createdRequests[0].destroy).toHaveBeenCalledTimes(1);
    });

    it("should treat an absent content-type header as empty and reject it", async () => {
      serveOnRequestEnd(respond => {
        respond(200, {});
      });

      await expect(fetchPublicDocument()).rejects.toThrowError(
        'Unexpected content type "", expected JSON.',
      );
    });

    it("should reject a body that is not valid JSON despite the JSON content type", async () => {
      serveJsonBody("not json");

      await expect(fetchPublicDocument()).rejects.toThrowError(
        "The response body was not valid JSON.",
      );
    });

    it("should accept a body exactly at the byte cap", async () => {
      serveJsonBody('{"a":1}');

      await expect(
        fetchPublicDocument({ ...DEFAULT_OPTIONS, maxResponseBytes: 7 }),
      ).resolves.toEqual({
        body: { a: 1 },
        headers: { "content-type": "application/json" },
      });
    });

    it("should reject a body one byte over the cap, destroy the request and ignore every later chunk", async () => {
      let lateChunksEmitted = false;
      serveOnRequestEnd(respond => {
        const response = respond(200, { "content-type": "application/json" });
        response.emit("data", Buffer.from('{"a":'));
        response.emit("data", Buffer.from("12}"));
        response.emit("data", Buffer.from("trailing"));
        response.emit("end");
        response.emit("close");
        lateChunksEmitted = true;
      });

      await expect(
        fetchPublicDocument({ ...DEFAULT_OPTIONS, maxResponseBytes: 7 }),
      ).rejects.toThrowError(
        "Response exceeded the maximum allowed size of 7 bytes.",
      );
      expect(lateChunksEmitted).toBe(true);
      expect(createdRequests[0].destroy).toHaveBeenNthCalledWith(1);
    });

    it("should reject a connection closed mid-body instead of hanging", async () => {
      serveOnRequestEnd(respond => {
        const response = respond(200, { "content-type": "application/json" });
        response.emit("data", Buffer.from('{"partial":"da'));
        response.emit("close");
      });

      await expect(fetchPublicDocument()).rejects.toThrowError(
        "The connection was closed before the response completed.",
      );
    });

    it("should reject with the transport error when the connection itself fails", async () => {
      const connectionError = new Error(
        "connect ECONNREFUSED 93.184.216.34:443",
      );
      serveOnRequestEnd((_respond, request) => {
        request.emit("error", connectionError);
      });

      await expect(fetchPublicDocument()).rejects.toBe(connectionError);
    });

    it("should destroy the request with a timeout error when no response arrives before the deadline", async () => {
      vi.useFakeTimers();
      serveOnRequestEnd(() => {});

      const fetchResult = expect(
        fetchPublicDocument({ ...DEFAULT_OPTIONS, timeoutMs: 50 }),
      ).rejects.toThrowError("Request timed out.");
      await vi.advanceTimersByTimeAsync(49);
      expect(createdRequests[0].destroy).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(1);
      await fetchResult;

      expect(createdRequests[0].destroy).toHaveBeenCalledWith(
        new Error("Request timed out."),
      );
    });

    it("should time out a slow-drip response on the total deadline even though chunks keep arriving", async () => {
      vi.useFakeTimers();
      let dripInterval: ReturnType<typeof setInterval> | undefined;
      serveOnRequestEnd(respond => {
        const response = respond(200, { "content-type": "application/json" });
        dripInterval = setInterval(
          () => response.emit("data", Buffer.from("0")),
          30,
        );
      });

      const fetchResult = expect(
        fetchPublicDocument({ ...DEFAULT_OPTIONS, timeoutMs: 150 }),
      ).rejects.toThrowError("Request timed out.");
      await vi.advanceTimersByTimeAsync(150);
      await fetchResult;
      clearInterval(dripInterval);

      expect(createdRequests[0].destroy).toHaveBeenCalledWith(
        new Error("Request timed out."),
      );
    });
  });

  it("should share one deadline across DNS resolution and the HTTP phase instead of granting each a fresh budget", async () => {
    vi.useFakeTimers();
    vi.spyOn(dns.promises.Resolver.prototype, "resolve4").mockImplementation(
      () =>
        new Promise(resolve => {
          setTimeout(() => resolve([PUBLIC_IPV4]), 100);
        }),
    );
    vi.spyOn(dns.promises.Resolver.prototype, "resolve6").mockRejectedValue(
      new Error("queryAaaa ENOTFOUND"),
    );
    serveOnRequestEnd(() => {});

    const fetchResult = expect(
      ssrfSafeJsonFetch("https://slow-dns.test/doc.json", {
        ...DEFAULT_OPTIONS,
        timeoutMs: 150,
      }),
    ).rejects.toThrowError("Request timed out.");
    await vi.advanceTimersByTimeAsync(100);
    expect(httpsRequestMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(49);
    expect(createdRequests[0].destroy).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    await fetchResult;

    expect(createdRequests[0].destroy).toHaveBeenCalledWith(
      new Error("Request timed out."),
    );
  });
});
