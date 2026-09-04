class WebsocketUnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    Object.setPrototypeOf(this, WebsocketUnauthorizedError.prototype);
    this.name = "WebsocketUnauthorizedError";
  }
}

export { WebsocketUnauthorizedError };
