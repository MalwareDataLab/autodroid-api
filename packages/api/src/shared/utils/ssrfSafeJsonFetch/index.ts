import dns from "node:dns";
import { IncomingHttpHeaders, RequestOptions } from "node:http";
import https from "node:https";
import net from "node:net";

// Util import
import { isPublicIpAddress } from "../isPublicIpAddress";

interface ISsrfSafeJsonFetchOptions {
  timeoutMs: number;
  maxResponseBytes: number;
}

interface ISsrfSafeJsonFetchResult {
  body: unknown;
  headers: IncomingHttpHeaders;
}

interface IRequestOptionsWithAutoSelectFamily extends RequestOptions {
  autoSelectFamily?: boolean;
}

const resolveHostAddresses = async (
  hostname: string,
  timeoutMs: number,
): Promise<{ address: string; family: number }[]> => {
  const literalFamily = net.isIP(hostname);
  if (literalFamily) return [{ address: hostname, family: literalFamily }];

  const resolver = new dns.promises.Resolver();
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      (async () => {
        const [v4Result, v6Result] = await Promise.allSettled([
          resolver.resolve4(hostname),
          resolver.resolve6(hostname),
        ]);

        const addresses = [
          ...(v4Result.status === "fulfilled"
            ? v4Result.value.map(address => ({ address, family: 4 }))
            : []),
          ...(v6Result.status === "fulfilled"
            ? v6Result.value.map(address => ({ address, family: 6 }))
            : []),
        ];

        if (!addresses.length)
          throw new Error(`Could not resolve host "${hostname}".`);

        return addresses;
      })(),
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => {
          resolver.cancel();
          reject(new Error("Request timed out."));
        }, timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
};

const resolveValidatedAddress = async (
  hostname: string,
  timeoutMs: number,
): Promise<{ address: string; family: number }> => {
  const addresses = await resolveHostAddresses(hostname, timeoutMs);

  addresses.forEach(({ address }) => {
    if (!isPublicIpAddress(address))
      throw new Error(
        `Refusing to fetch a non-public address (${address}) for host "${hostname}".`,
      );
  });

  return addresses[0];
};

const ssrfSafeJsonFetch = async (
  url: string,
  options: ISsrfSafeJsonFetchOptions,
): Promise<ISsrfSafeJsonFetchResult> => {
  const { timeoutMs, maxResponseBytes } = options;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`"${url}" is not a valid URL.`);
  }

  if (parsed.protocol !== "https:")
    throw new Error("Only HTTPS URLs are allowed.");

  if (parsed.username || parsed.password)
    throw new Error("The URL must not contain user credentials.");

  if (parsed.hash) throw new Error("The URL must not contain a fragment.");

  const deadlineAt = Date.now() + timeoutMs;

  const hostname = parsed.hostname.replace(/^\[(.*)\]$/, "$1");

  const validatedAddress = await resolveValidatedAddress(
    hostname,
    Math.max(0, deadlineAt - Date.now()),
  );

  return new Promise<ISsrfSafeJsonFetchResult>((resolve, reject) => {
    let settled = false;
    let deadlineTimer: ReturnType<typeof setTimeout>;
    const settle = (fn: () => void): void => {
      if (settled) return;
      settled = true;
      clearTimeout(deadlineTimer);
      fn();
    };

    const request = https.request(
      {
        hostname,
        lookup: (_hostname, _lookupOptions, callback) =>
          callback(null, validatedAddress.address, validatedAddress.family),
        port: parsed.port || 443,
        path: `${parsed.pathname}${parsed.search}`,
        method: "GET",
        headers: { Accept: "application/json" },
        autoSelectFamily: false,
      } as IRequestOptionsWithAutoSelectFamily,
      response => {
        const { statusCode } = response;
        if (!statusCode || statusCode < 200 || statusCode >= 300) {
          request.destroy();
          settle(() =>
            reject(new Error(`Unexpected HTTP status ${statusCode}.`)),
          );
          return;
        }

        const contentType = response.headers["content-type"] || "";
        if (!contentType.includes("application/json")) {
          request.destroy();
          settle(() =>
            reject(
              new Error(
                `Unexpected content type "${contentType}", expected JSON.`,
              ),
            ),
          );
          return;
        }

        let receivedBytes = 0;
        const chunks: Buffer[] = [];

        response.on("data", (chunk: Buffer) => {
          receivedBytes += chunk.length;
          if (receivedBytes > maxResponseBytes) {
            request.destroy();
            settle(() =>
              reject(
                new Error(
                  `Response exceeded the maximum allowed size of ${maxResponseBytes} bytes.`,
                ),
              ),
            );
            return;
          }
          chunks.push(chunk);
        });

        response.on("end", () => {
          settle(() => {
            try {
              resolve({
                body: JSON.parse(Buffer.concat(chunks).toString("utf8")),
                headers: response.headers,
              });
            } catch {
              reject(new Error("The response body was not valid JSON."));
            }
          });
        });

        response.on("close", () => {
          settle(() =>
            reject(
              new Error(
                "The connection was closed before the response completed.",
              ),
            ),
          );
        });
      },
    );

    request.on("error", error => settle(() => reject(error)));

    deadlineTimer = setTimeout(
      () => {
        request.destroy(new Error("Request timed out."));
      },
      Math.max(0, deadlineAt - Date.now()),
    );

    request.end();
  });
};

export { ssrfSafeJsonFetch };
