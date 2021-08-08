/**
 * Custom File object that wraps a native File object.
 * This class behaves similar to a duplex stream,
 * except without the piping mechanism.
 * The File object works in two modes:
 * * mode 1 - write mode, default
 * * mode 2 - read mode
 */

import { EventEmitter } from "events";
import queueMicrotask from "queue-microtask";
import toBuffer from "blob-to-buffer";
import streamSaver from "streamsaver";
import { promisify } from "util";
import { CustomFileError } from "../errors/custom-file-errors";

export type NativeFile = File;
export type FileMode = 0x1 | 0x2;

export interface CustomFileOptions {
  file?: NativeFile;
  pieces: number;
  pieceLength: number;
  filename: string;
  type: string;
  size: number;
}

export class CustomFile extends EventEmitter {
  private _mode: number;
  private _file: NativeFile;
  private _memoryStorage: Array<any>;
  private _requestFileSystem: any;
  private _fs: any;
  private _name: string;
  private _localName: string;
  private _type: string;
  private _size: number;
  private _pieces: number;
  private _pieceLength: number;
  private _readStream: ReadableStream;
  private _writeStream: any; // WritableStream
  private _writer: any; // Default writable stream writer
  private _reader: ReadableStreamDefaultReader;
  private _writeMode: "fs" | "mem" | "stream";
  private _create: boolean;
  private _fileEntry: any;
  private _bytesWritten: number;
  private _bytesRead: number;
  private _destroyed: boolean;

  constructor(mode: FileMode = 0x1, opts: CustomFileOptions) {
    super();
    this._mode = mode;

    this._file = opts.file;
    this._localName = `${new Date().getTime()}-${opts.filename}`;
    this._name = opts.filename;
    this._type = opts.type;
    this._size = opts.size;
    this._pieces = opts.pieces;
    this._pieceLength = opts.pieceLength;
    this._memoryStorage = null; // do not create one before its needed.
    this._requestFileSystem =
      window["requestFileSystem"] || window["webkitRequestFileSystem"];
    this._fs = null; // this is assigned when the file system is available.
    this._writeMode = null;
    this._create = true;
    this._destroyed = false;
    this._bytesWritten = 0;
    this._bytesRead = 0;
    this._writeStream = null;
    this._writer = null;
    this._readStream = null;
    this._reader = null;

    this.on("finish", this.destroy.bind(this));
  }

  get mode(): number {
    return this._mode;
  }
  get name(): string {
    return this._name;
  }
  get type(): string {
    return this._type;
  }
  get size(): number {
    return this._size;
  }
  get pieces(): number {
    return this._pieces;
  }
  get pieceLength(): number {
    return this._pieceLength;
  }

  get destroyed(): boolean {
    return this._destroyed;
  }

  public async init() {
    try {
      switch (this._mode) {
        case 0x1:
          // write mode
          // todo: implement showSaveFilePicker write mode

          // use memory storage for files less than 500 mb
          if (this._size < 500 * 1024 * 1024) {
            console.log("Using memory storage for files less than 500mb.");
            this._memoryStorage = [];
            this._writeMode = "mem";
            this.emit("ready");
            return;
          }

          if (streamSaver.supported && streamSaver.createWriteStream) {
            console.log("Using stream write mode.");
            this._writeMode = "stream";
            this._writeStream = streamSaver.createWriteStream(this._name, {
              size: this._size,
            });
            this.emit("ready");
            return;
          }

          // check if we have a streaming way to store file before using memory storage
          // window.requestFileSystem might not be available in some browsers.
          if (this._requestFileSystem && window["TEMPORARY"]) {
            let self = this;
            this._requestFileSystem(
              window["TEMPORARY"],
              self._size,
              (fs: any) => {
                self._fs = fs;
                self._writeMode = "fs";
                self.emit("ready");
                self = null;
              },
              (err: Error) => {
                self.emit(
                  "error",
                  new CustomFileError("Error requesting file system", err)
                );
                self = null;
              }
            );
          } else {
            // no support for file system.
            // store data in chunks in memory.
            console.warn(
              "File system is not available. Using memory storage method to download file."
            );
            this._memoryStorage = [];
            this._writeMode = "mem";
            this.emit("ready");
          }

          break;

        case 0x2:
          // read mode
          try {
            // file property should be defined
            if (this._file instanceof File) {
              this._readStream = this._file.stream();
              this.emit("ready");
            } else {
              this.emit(
                "error",
                new CustomFileError(
                  "Reading mode. Expected File instance but received " +
                    typeof this._file,
                  null
                )
              );
            }
          } catch (error) {
            this.emit(
              "error",
              new CustomFileError(
                "Error getting read stream for file. Fallback to normal blob slicing method.",
                error
              )
            );
            this.emit("ready");
          }
          break;

        default:
          throw new Error("Unsupported file mode.");
      }
    } catch (error) {
      this.emit(
        "error",
        new CustomFileError(
          "Error initializing custom file access mode.",
          error
        )
      );
    }
  }

  public write(chunk: any) {
    // todo: handle the write according to browser support
    switch (this._writeMode) {
      case "stream":
        return this._writeStm(chunk);
      case "mem":
        return this._writeMem(chunk);
      case "fs":
        return this._writeFs(chunk);
      default:
        this.emit("error", new CustomFileError("No write mode set.", null));
        return Promise.resolve();
    }
  }

  private async _writeStm(chunk: any) {
    if (!this._writeStream) {
      this.emit(
        "error",
        new CustomFileError("Cannot write before init is called.", null)
      );
      return;
    }

    if (!this._writer) this._writer = this._writeStream.getWriter();

    let tobuffer = promisify(toBuffer);

    let buffer = await tobuffer(chunk);

    await this._writer.write(buffer);

    this._bytesWritten += buffer.length;

    this.emit("progress", this._bytesWritten / this._size);

    return;
  }

  private async _writeMem(chunk: any) {
    this._memoryStorage.push(chunk);
    this._bytesWritten += chunk.size;
    this.emit("progress", this._memoryStorage.length / this._pieces);
    return;
  }

  private _writeFs(chunk: any) {
    let self = this;
    let opts = { create: this._create };

    return new Promise<void>((resolve, reject) => {
      self._fs.root.getFile(
        self._localName,
        opts,
        (fileEntry: any) => {
          if (self._create) self._create = false;

          self._fileEntry = fileEntry;

          fileEntry.createWriter((writer) => {
            let blob = new Blob([chunk], { type: self._type });

            console.log(
              "File: Appending " + blob.size + " bytes at " + self._bytesWritten
            );

            writer.onwriteend = () => {
              self._bytesWritten += blob.size;
              self.emit("progress", self._bytesWritten / self._size);
              blob = null;
              resolve();
            };

            writer.onerror = (err) => {
              reject(err);
            };

            writer.seek(self._bytesWritten);
            writer.write(blob);
          });
        },
        (err: any) => {
          reject(err);
        }
      );
    });
  }

  public read(inChunk: boolean = true) {
    if (inChunk) {
      if (this._bytesRead < this._size) {
        let blob = this._file.slice(
          this._bytesRead,
          Math.min(this._bytesRead + this._pieceLength, this._size),
          this._type
        );
        this._bytesRead += blob.size;
        this.emit("data", blob);
        this.emit("progress", this._bytesRead / this._size);
      } else {
        console.log("No more data");
        this.emit("data", null);
      }
    } else {
      if (!this._readStream) {
        this.emit(
          "error",
          new CustomFileError("Error trying to read before initializing.", null)
        );
        return;
      }

      if (!this._reader) this._reader = this._readStream.getReader();

      let self = this;
      this._reader.read().then(({ value, done }) => {
        if (done) {
          try {
            self._reader.cancel().then(() => {
              if (!self._readStream.locked) {
                self._readStream.cancel().then(() => {
                  self._reader = null;
                  self._readStream = null;
                });
              } else {
                self._reader = null;
                self._readStream = null;
              }
            });
          } catch (error) {
            self.emit(
              "error",
              new CustomFileError(
                "Error while trying to read using readable stream.",
                error
              )
            );
          }
          self.emit("data", null);
          return;
        }

        self._bytesRead += value.bytesLenght;
        self.emit("data", value);
        self.emit("progress", this._bytesRead / this._size);
      });
    }
  }

  public save() {
    // save file to downloads folder
    console.log("Saving file.");
    console.log("File:", this._name);

    let anchor = document.createElement("a");
    anchor.download = this._name;

    const finish = (link) => {
      document.body.appendChild(link);
      link.addEventListener("click", () => {
        queueMicrotask(this.remove.bind(this));
        link.parentNode.removeChild(link);
      });
      link.click();
    };

    if (this._writeMode === "stream") {
      this._writer.close().then(() => {
        queueMicrotask(this.remove.bind(this));
      });
    } else if (this._writeMode === "fs") {
      if (!!window["webkitRequestFileSystem"]) {
        anchor.href = this._fileEntry.toURL();
        finish(anchor);
      } else {
        this._fileEntry.file((file) => {
          anchor.href = (window.URL || window.webkitURL).createObjectURL(file);
          finish(anchor);
        });
      }
    } else if (this._writeMode === "mem") {
      let blob = new Blob(this._memoryStorage, { type: this._type });

      anchor.href = (window.URL || window.webkitURL).createObjectURL(blob);

      finish(anchor);
    }
  }

  public remove() {
    let self = this;
    return new Promise<void>((resolve, reject) => {
      if (self._writeMode === "stream") {
        if (self._writer) {
          self._writer.abort();
          self._writer = null;
        }

        // note: this seems not to be a function.
        // self._writeStream.cancel();
        self._writeStream = null;

        self.emit("finish");
        self = null;
      } else if (self._writeMode === "fs") {
        self._fs.root.getFile(
          self._localName,
          { create: false },
          (fileEntry) => {
            fileEntry.remove(
              () => {
                console.log("Temporary file removed.");
                console.log("File:", self._localName);
                self.emit("finish");
                self = null;
                resolve();
              },
              (err) => {
                self.emit(
                  "error",
                  new CustomFileError(
                    "Error while removing temporary file.",
                    err
                  )
                );
                self = null;
              }
            );
          },
          (err) => {
            self.emit(
              "error",
              new CustomFileError("Error getting temporary file.", err)
            );
            self = null;
          }
        );
      } else if (self._writeMode === "mem") {
        self.emit("finish");
        self = null;
      }
    });
  }

  public async destroy() {
    this.emit("done");

    // clean up
    // all these values are not reusable,
    // so its better to free memory.
    this._mode = null;
    this._file = null;
    this._localName = null;
    this._name = null;
    this._type = null;
    this._size = null;
    this._pieces = null;
    this._pieceLength = null;
    this._memoryStorage = null;
    this._requestFileSystem = null;
    this._fs = null;
    this._writeMode = null;
    this._bytesWritten = 0;
    this._bytesRead = 0;
    this._create = true;

    if (this._reader) await this._reader.cancel("Destroy custom file.");
    if (this._readStream) await this._readStream.cancel("Destroy custom file.");

    this._readStream = null;
    this._reader = null;

    if (this._writer) {
      this._writer.abort();
      this._writer = null;
    }
    if (this._writeStream) this._writeStream.cancel();

    this._writeStream = null;
    this._writer = null;

    // just a way to check if this function was called or not.
    this._destroyed = true;
    this.emit("destroy");
  }

  on(evt: "progress", callback: (progress: number) => void): this;
  on(evt: "done", callback: () => void): this;
  on(evt: "ready", callback: () => void): this;
  on(evt: "error", callback: (error: Error) => void): this;
  on(evt: "data", callback: (data: any) => void): this;
  on(evt: "destroy", callback: () => void): this;
  on(evt: string | symbol, callback: (...args: any[]) => void): this;
  on(evt: string | symbol, callback: (...args: any[]) => void): this {
    return super.on(evt, callback);
  }

  once(evt: "progress", callback: (progress: number) => void): this;
  once(evt: "done", callback: () => void): this;
  once(evt: "ready", callback: () => void): this;
  once(evt: "error", callback: (error: Error) => void): this;
  once(evt: "data", callback: (data: any) => void): this;
  once(evt: "destroy", callback: () => void): this;
  once(evt: string | symbol, callback: (...args: any[]) => void): this;
  once(evt: string | symbol, callback: (...args: any[]) => void): this {
    return super.on(evt, callback);
  }

  emit(evt: "progress", progress: number): boolean;
  emit(evt: "done"): boolean;
  emit(evt: "ready"): boolean;
  emit(evt: "error", error: Error): boolean;
  emit(evt: "data", value: any): boolean;
  emit(evt: "destroy"): boolean;
  emit(evt: string | symbol, ...args: any[]): boolean;
  emit(evt: string | symbol, ...args: any[]): boolean {
    return super.emit(evt, ...args);
  }
}
