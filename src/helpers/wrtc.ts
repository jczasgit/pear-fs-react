// todo: refactor code

import { EventEmitter } from "events";
import { CustomFile } from "./customFile";
import queueMicrotask from "queue-microtask";

export interface SignalData {
  payload: string; // stringify version of RTCSessionDescription
  from: string; // id of the signaler
  to: string; // id of the signal target
}

export interface JsonData {
  type: string;
  payload: any;
}

export interface Metadata {
  pieces: number;
  pieceLength: number;
  filename: string;
  type: string;
  size: number;
}

export type ConnectionState =
  | "new"
  | "connecting"
  | "connected"
  | "disconnected"
  | "failed"
  | "closed";
export type IceConnectionState =
  | "new"
  | "checking"
  | "connected"
  | "completed"
  | "failed"
  | "closed"
  | "disconnected";

export class WRTC extends EventEmitter {
  private _peerConnection: RTCPeerConnection;
  private _dataChannel: RTCDataChannel;
  private _file: CustomFile; // custom File object
  private _connected: boolean;
  private _wrtcConfig: RTCConfiguration;
  readonly myid: string; // this is the id for local peer, aka yourself.
  readonly peerid: string; // this is the id for remote peer, aka the target.

  constructor(myid: string, peerid: string) {
    super();

    this.myid = myid;
    this.peerid = peerid;

    this._connected = false;
    this._peerConnection = null;
    this._dataChannel = null;
    this._file = null;
    this._wrtcConfig = {
      iceServers: [
        {
          urls: ["stun:stun.l.google.com:19302"],
          username: "",
          credential: "",
        },
        {
          urls: ["stun:stun2.l.google.com:19302"],
          username: "",
          credential: "",
        },
        {
          urls: ["stun:stun3.l.google.com:19302"],
          username: "",
          credential: "",
        },
        {
          urls: ["stun:stun4.l.google.com:19302"],
          username: "",
          credential: "",
        },
      ],
      iceTransportPolicy: "all",
    };
  }

  get peerConnection(): RTCPeerConnection {
    return this._peerConnection;
  }
  get dataChannel(): RTCDataChannel {
    return this._dataChannel;
  }

  get connected(): boolean {
    return this._connected;
  }

  get file(): CustomFile {
    return this._file;
  }

  public async setFile(file: File) {
    return new Promise<void>((resolve, reject) => {
      console.log("Create new CustomFile");
      this._file = new CustomFile(0x2, {
        file,
        filename: file.name,
        pieceLength: 16 * 1024,
        pieces: Math.ceil(file.size / (16 * 1024)),
        size: file.size,
        type: file.type,
      });
      this._file.once("ready", () => {
        console.log("File is ready.");
        resolve();
      });
      this._file.on("data", (data) => {
        if (data === null) {
          this.emit("done", this._file.name);
          this.sendJson({
            type: "done",
            payload: {},
          });
          this._file.destroy();
          return;
        }
        this.sendBinary(data);
      });

      this._file.once("done", () => {
        console.log("File download done.");
      });
      this._file.once("destroy", () => {
        console.log("File destroyed.");
        this._file = null;
        this._dataChannel.close();
      });
      this._file.on("progress", (progress) => {
        this.emit("progress", progress);
      });
      this._file.on("error", (error) => {
        this.emit("error", error);
      });
      this._file.init();
    });
  }

  public acceptFile(metadata: Metadata) {
    console.log("Create new CustomFile");
    this._file = new CustomFile(0x1, metadata);
    this._file.once("ready", () => {
      console.log("File ready.");
      this.sendJson({
        type: "download",
        payload: {},
      });
    });
    this._file.on("progress", (progress) => {
      this.emit("progress", progress);
    });
    this._file.once("done", () => {
      console.log("File download done.");
    });
    this._file.once("destroy", () => {
      console.log("File destroyed.");
      this._file = null;
      this._dataChannel.close();
    });
    this._file.on("error", (error) => {
      this.emit("error", error);
    });

    this._file.init();
  }

  public rejectFile(metadata: Metadata) {
    this.sendJson({
      type: "reject",
      payload: metadata,
    });
  }

  public close() {
    this._peerConnection.close();
    this._connected = false;
    this._peerConnection = null;
    this._dataChannel = null;
    this._file = null;
    console.log("Connection closed.");
  }

  public sendBinary(data: ArrayBuffer) {
    this._dataChannel.send(data);
  }

  public sendJson(json: JsonData) {
    this._dataChannel.send(JSON.stringify(json));
  }

  public connect(description: RTCSessionDescription): void;
  public connect(initiator: boolean | RTCSessionDescription, opts?: { description: RTCSessionDescription }): void; //prettier-ignore
  // prettier-ignore
  public connect(initOrDesc: boolean | RTCSessionDescription = false, opts?: { description: RTCSessionDescription }): void { 
    if (typeof initOrDesc === "boolean" && initOrDesc === true) { 
      this._connectAsInitiator();
      return;
    }

    if (typeof initOrDesc === "boolean" && initOrDesc === false && typeof opts !== "undefined") {
      this._connect(opts.description);
      return;
    }

    if (initOrDesc instanceof RTCSessionDescription) {
      this._connect(initOrDesc);
      return;
    }

    this.emit("error", new Error("Invalid argument passed to connect(). Expected boolean or RTCSessionDescription but got " + typeof initOrDesc));
  }

  public async setAnswer(description: RTCSessionDescription) {
    if (!this._peerConnection) return;

    try {
      await this._peerConnection.setRemoteDescription(description);
    } catch (error) {
      this.emit("error", error);
    }

    return;
  }

  private async _connectAsInitiator() {
    this._peerConnection = new RTCPeerConnection(this._wrtcConfig);
    this._wrapPeerConnection(this._peerConnection);

    this._dataChannel = this._peerConnection.createDataChannel(
      "binary-channel",
      {
        negotiated: true,
        id: 0,
        protocol: "binary",
        ordered: true,
      }
    );

    this._dataChannel.binaryType = "arraybuffer";

    this._wrapDataChannel(this._dataChannel);

    try {
      await this._peerConnection.setLocalDescription(
        await this._peerConnection.createOffer()
      );
      console.log("Offer set as local description.");
    } catch (error) {
      this.emit("error", error);
    }
  }

  private async _connect(desc: RTCSessionDescription) {
    // Connect when received an offer from a peer.
    this._peerConnection = new RTCPeerConnection(this._wrtcConfig);

    this._wrapPeerConnection(this._peerConnection);

    // override the wrapper 👆
    // we do not need to signal the peer if we get an offer.
    this._peerConnection.onicecandidate = () => {};

    this._dataChannel = this._peerConnection.createDataChannel(
      "binary-channel",
      {
        negotiated: true,
        id: 0,
        protocol: "binary",
        ordered: true,
      }
    );

    this._wrapDataChannel(this._dataChannel);

    // Set offer as remote description.
    // Create an answer and signal back to offerer.
    try {
      await this._peerConnection.setRemoteDescription(desc);
      console.log("Offer set as remote description.");
      await this._peerConnection.setLocalDescription(
        await this._peerConnection.createAnswer()
      );
      console.log("Answer set as local description.");
      this.emit("answer", {
        payload: JSON.stringify(this._peerConnection.localDescription.toJSON()),
        from: this.myid,
        to: this.peerid,
      });
    } catch (error) {
      this.emit("error", error);
    }
  }

  private _wrapPeerConnection(pc: RTCPeerConnection) {
    pc.onicecandidate = this._onIceCandidate.bind(this);
    pc.onconnectionstatechange = this._onConnectionStateChange.bind(this);
    pc.onicecandidateerror = this._onIceCandidateError.bind(this);
    pc.oniceconnectionstatechange = this._onIceConnectionStateChange.bind(this);
  }

  private _wrapDataChannel(dc: RTCDataChannel) {
    dc.onclose = this._onClose.bind(this);
    dc.onerror = this._onError.bind(this);
    dc.onopen = this._onOpen.bind(this);
    dc.onmessage = this._onData.bind(this);
    if (dc["onclosing"]) dc["onclosing"] = this._onClosing.bind(this);
  }

  private _onClose() {
    this.emit("close");
  }

  private _onError(e: ErrorEvent) {
    this.emit("error", e);
  }

  private _onOpen() {
    this.emit("open");
  }

  private _onClosing() {
    this.emit("closing");
  }

  private _onData(e: MessageEvent) {
    if (typeof e.data === "string") {
      this._parseJSON(e);
    } else {
      this._write(e.data);
    }
  }

  private _write(chunk: Blob) {
    let self = this;
    this._file.write(chunk).then(() => {
      queueMicrotask(() => {
        self.sendJson({
          type: "download",
          payload: {},
        });
        self = null;
      });
    });
  }

  private _parseJSON(e: MessageEvent) {
    let json: JsonData = JSON.parse(e.data);

    switch (json.type) {
      case "file":
        this._incomingFile(json.payload);
        break;
      case "download":
        this._file.read(false);
        break;
      case "reject":
        this.emit("reject", this._file.name);
        this._file.destroy();
        break;
      case "done":
        this.emit("done", this._file.name);
        this._file.save();
        break;
      default:
        break;
    }
  }

  private _incomingFile(metadata: Metadata) {
    this.emit("incoming", metadata);
  }

  private _onIceCandidate(e: RTCPeerConnectionIceEvent) {
    // We only want to signal when all candidates have been added.
    // As long as e.candidate is defined, more candidates are to be added.
    if (e.candidate) return;

    this.emit("signal", {
      payload: JSON.stringify(this._peerConnection.localDescription.toJSON()),
      from: this.myid,
      to: this.peerid,
    });
  }

  private _onConnectionStateChange() {
    // the following states are: new, connecting, connected, disconnected, failed, closed.
    this._connected = this._peerConnection.connectionState === "connected";
    this.emit("connectionstatechange", this._peerConnection.connectionState);
  }

  private _onIceCandidateError(e: RTCPeerConnectionIceErrorEvent) {
    this.emit("icegathetingerror", e);
  }

  private _onIceConnectionStateChange() {
    // the following states are: new, checking, connected, completed, failed, closed, disconnected.
    this.emit(
      "iceconnectionstatechange",
      this._peerConnection.iceConnectionState
    );
  }

  on(evt: "open", callback: () => void): this;
  on(evt: "error", callback: (err: any) => void): this;
  on(evt: "signal", callback: (signal: SignalData) => void): this;
  on(evt: "answer", callback: (answer: SignalData) => void): this;
  //prettier-ignore
  on(evt: "connectionstatechange", callback: (state: ConnectionState) => void): this;
  //prettier-ignore
  on(evt: "iceconnectionstatechange", callback: (state: IceConnectionState) => void): this;
  on(evt: "icegathetingerror", callback: (err: any) => void): this;
  on(evt: "incoming", callback: (metadata: Metadata) => void): this;
  on(evt: "progress", callback: (progress: number) => void): this;
  on(evt: "done", callback: (filename: string) => void): this;
  on(evt: "reject", callback: (filename: string) => void): this;
  on(evt: string | symbol, callback: (...args: any[]) => void): this;
  on(evt: string | symbol, callback: (...args: any[]) => void): this {
    return super.on(evt, callback);
  }

  once(evt: "error", callback: (err: any) => void): this;
  once(evt: "signal", callback: (signal: SignalData) => void): this;
  once(evt: "answer", callback: (answer: SignalData) => void): this;
  //prettier-ignore
  once(evt: "connectionstatechange", callback: (state: ConnectionState) => void): this;
  //prettier-ignore
  once(evt: "iceconnectionstatechange", callback: (state: IceConnectionState) => void): this;
  once(evt: "icegathetingerror", callback: (err: any) => void): this;
  once(evt: "incoming", callback: (metadata: Metadata) => void): this;
  once(evt: "progress", callback: (progress: number) => void): this;
  once(evt: "done", callback: (filename: string) => void): this;
  once(evt: "reject", callback: (filename: string) => void): this;
  once(evt: string | symbol, callback: (...args: any[]) => void): this;
  once(evt: string | symbol, callback: (...args: any[]) => void): this {
    return super.once(evt, callback);
  }

  off(evt: "open", callback: () => void): this;
  off(evt: "error", callback: (err: any) => void): this;
  off(evt: "signal", callback: (signal: SignalData) => void): this;
  off(evt: "answer", callback: (answer: SignalData) => void): this;
  //prettier-ignore
  off(evt: "connectionstatechange", callback: (state: ConnectionState) => void): this;
  //prettier-ignore
  off(evt: "iceconnectionstatechange", callback: (state: IceConnectionState) => void): this;
  off(evt: "icegathetingerror", callback: (err: any) => void): this;
  off(evt: "incoming", callback: (metadata: Metadata) => void): this;
  off(evt: "progress", callback: (progress: number) => void): this;
  off(evt: "done", callback: (filename: string) => void): this;
  off(evt: "reject", callback: (filename: string) => void): this;
  off(evt: string | symbol, callback: (...args: any[]) => void): this;
  off(evt: string | symbol, callback: (...args: any[]) => void): this {
    return super.off(evt, callback);
  }

  emit(evt: "open"): boolean;
  emit(evt: "error", err: any): boolean;
  emit(evt: "signal", signal: SignalData): boolean;
  emit(evt: "answer", answer: SignalData): boolean;
  //prettier-ignore
  emit(evt: "connectionstatechange", state: ConnectionState): boolean;
  //prettier-ignore
  emit(evt: "iceconnectionstatechange", state: IceConnectionState): boolean;
  emit(evt: "icegathetingerror", err: any): boolean;
  emit(evt: "incoming", metadata: Metadata): boolean;
  emit(evt: "progress", progress: number): boolean;
  emit(evt: "done", filename: string): boolean;
  emit(evt: "reject", filename: string): boolean;
  emit(evt: string | symbol, ...args: any[]): boolean;
  emit(evt: string | symbol, ...args: any[]): boolean {
    return super.emit(evt, ...args);
  }
}
