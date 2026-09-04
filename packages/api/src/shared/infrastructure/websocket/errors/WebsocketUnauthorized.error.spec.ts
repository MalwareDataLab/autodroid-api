import { describe, expect, it } from "vitest";

// Error import
import { WebsocketUnauthorizedError } from "./WebsocketUnauthorized.error";

describe("Websocket: WebsocketUnauthorizedError", () => {
  it("should build an unauthorized error with the expected name and message", () => {
    const error = new WebsocketUnauthorizedError();

    expect(error).toBeInstanceOf(WebsocketUnauthorizedError);
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("WebsocketUnauthorizedError");
    expect(error.message).toBe("Unauthorized");
  });
});
