export class RTCError extends Error {
  readonly inner: Error;
  public name: string;

  constructor(message: string, inner: Error) {
    super(message);
    this.inner = inner;
    this.name = "RTCError";
  }
}

export class RTCSessionDescriptionError extends RTCError {
  constructor(message: string, err: Error) {
    super(message, err);
    this.name = "RTCSessionDescriptionError";
  }
}

export class RTCConnectionError extends RTCError {
  constructor(message: string, err: Error) {
    super(message, err);
    this.name = "RTCConnectionError";
  }
}

export class RTCDataChannelError extends RTCError {
  constructor(message: string, err: Error) {
    super(message, err);
    this.name = "RTCDataChannelError";
  }
}
