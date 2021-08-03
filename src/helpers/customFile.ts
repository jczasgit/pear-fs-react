/**
 * Custom File object that wraps a native File object.
 * This class behaves similar to a duplex stream,
 * except without the piping mechanism.
 * The File object works in two modes:
 * * mode 1 - write mode, default
 * * mode 2 - read mode
 */

import { EventEmitter } from "events";
import { MemoryStorage } from "./memoryStorage";

export type NativeFile = File;
export type FileMode = 1 | 2;

export interface CustomFileOptions {
  file?: NativeFile;
  pieces?: number;
  pieceLength?: number;
  filename?: string;
  type?: string;
  size?: number;
}

export class CustomFile extends EventEmitter {
  private _mode: number;
  private _file: NativeFile;
  private _memoryStorage: Array<any>;
  private _showSaveFilePicker: any;
  private _requestFileSystem: any;
  private _fs: any;
  private _name: string;
  private _localName: string;
  private _type: string;
  private _size: number;
  private _pieces: number;
  private _pieceLength: number;
  private _readStream: ReadableStream;
  private _reader: ReadableStreamDefaultReader;
  private _writeMode: "fs" | "mem";
  private _create: boolean;
  private _fileEntry: any;
  private _seek: number;

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
    this._showSaveFilePicker = window["showSaveFilePicker"];
    this._requestFileSystem =
      window["requestFileSystem"] || window["webkitRequestFileSystem"];
    this._fs = null; // this is assigned when the file system is available.
    this._writeMode = null;
    this._create = true;
    this._fileEntry = null;
    this._seek = 0;
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
                self.emit("error", err);
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
          // file property should be defined
          if (this._file instanceof File) {
            this._readStream = this._file.stream();
            this.emit("ready");
          } else {
            this.emit(
              "error",
              new Error(
                "Reading mode. Expected File instance but received " +
                  typeof this._file
              )
            );
          }
          break;

        default:
          throw new Error("Unsupported file mode.");
      }
    } catch (error) {
      this.emit("error", error);
    }
  }

  public write(chunk: any) {
    // todo: handle the write according to browser support
    switch (this._writeMode) {
      case "mem":
        return this._writeMem(chunk);
      case "fs":
        return this._writeFs(chunk);
      default:
        this.emit("error", new Error("No write mode set."));
        return Promise.resolve();
    }
  }

  public async _writeMem(chunk: any) {
    this._memoryStorage.push(chunk);
    return;
  }

  public _writeFs(chunk: any) {
    let self = this;
    let opts = { create: this._create };

    return new Promise<void>((resolve) => {
      self._fs.root.getFile(
        self._localName,
        opts,
        (fileEntry: any) => {
          if (self._create) self._create = false;

          self._fileEntry = fileEntry;

          fileEntry.createWriter((writer) => {
            let blob = new Blob([chunk], { type: self._type });

            console.log(
              "File: Appending " + blob.size + " bytes at " + self._seek
            );

            writer.onwriteend = () => {
              self._seek += blob.size;
              blob = null;
              resolve();
            };

            writer.onerror = (err) => {
              self.emit("error", err);
            };

            writer.seek(self._seek);
            writer.write(blob);
          });
        },
        (err: any) => {
          self.emit("error", err);
        }
      );
    });
  }

  public read() {
    if (!this._readStream) {
      this.emit("error", new Error("Cannot read before init() is called."));
      return;
    }

    if (!this._reader) this._reader = this._readStream.getReader();

    let self = this;
    this._reader.read().then(({ value, done }) => {
      if (done) return self._finish();

      self.emit("data", value);
    });
  }

  public save() {
    // save file to downloads folder
  }

  private _finish() {
    // clean up
  }

  on(evt: "progress", callback: (progress: number) => void): this;
  on(evt: "done", callback: (done: boolean) => void): this;
  on(evt: "ready", callback: () => void): this;
  on(evt: "error", callback: (error: Error) => void): this;
  on(evt: "data", callback: (data: any) => void): this;
  on(evt: string | symbol, callback: (...args: any[]) => void): this {
    return super.on(evt, callback);
  }

  once(evt: "progress", callback: (progress: number) => void): this;
  once(evt: "done", callback: (done: boolean) => void): this;
  once(evt: "ready", callback: () => void): this;
  once(evt: "error", callback: (error: Error) => void): this;
  once(evt: "data", callback: (data: any) => void): this;
  once(evt: string | symbol, callback: (...args: any[]) => void): this {
    return super.on(evt, callback);
  }

  emit(evt: "progress", progress: number): boolean;
  emit(evt: "done", done: boolean): boolean;
  emit(evt: "ready"): boolean;
  emit(evt: "error", error: Error): boolean;
  emit(evt: "data", value: any): boolean;
  emit(evt: string | symbol, ...args: any[]): boolean {
    return super.emit(evt, ...args);
  }
}
