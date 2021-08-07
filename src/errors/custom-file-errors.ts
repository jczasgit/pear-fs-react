export class CustomFileError extends Error {
  readonly inner: Error;
  public name: string;
  constructor(message: string, error: Error) {
    super(message);
    this.inner = error;
    this.name = "CustomFileBaseError";
  }
}
