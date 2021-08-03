// todo: refactor code

import { EventEmitter } from "events";
import queueMicrotask from "queue-microtask";
import { Buffer } from "buffer";

export interface SignalData {
  payload: string; // stringify version of RTCSessionDescription
  from: string; // id of the signaler
  to: string; // id of the signal target
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
  private _file: File; // custom File object
  private _connected: boolean;
  readonly myid: string; // this is the id for local peer, aka yourself.
  readonly peerid: string; // this is the id for remote peer, aka the target.

  constructor(myid: string, peerid: string) {
    super();

    this.myid = myid;
    this.peerid = peerid;

    this._connected = false;
    this._peerConnection = null;
    this._dataChannel = null;
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

  public send(data: any) {
    this._dataChannel.send(data);
  }

  // an id is needed to correctly write the chunk of data on the remote side.
  // max cuncurrent data transfer through data channel is 16;
  public sendBinary(data: ArrayBuffer, id?: number) {
    // todo: send data
    // todo: parse binary data
    /**
     * First 8 bits description👇👇👇
     * File data chunk size is fixed to 16kb.
     * ---------------------------------------------------
     * | type  of  data   | file id |   payload length  |
     * | 0x0 - binary data|   0x7   |       16kb        |
     * ----------------------------------------------------
     */
    this._dataChannel.send(data);
  }

  public sendJson(json: any) {
    // todo: send json
    /**
     * First 8 bits description👇👇👇
     * ---------------------------------------------------
     * | type  of  data   |       payload length        |
     * | 0x1 - json data  |    0x7f - 0 - 127 bytes     |
     * ----------------------------------------------------
     */
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
    this._peerConnection = new RTCPeerConnection();
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
    this._peerConnection = new RTCPeerConnection();

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
    dc.onmessage = this._onBinaryData.bind(this);
    if (dc["onclosing"]) dc["onclosing"] = this._onClosing.bind(this);
  }

  private _onClose() {
    this.emit("close");
  }

  private _onError(e: ErrorEvent) {}

  private _onOpen() {
    this.emit("open");
  }

  private _onClosing() {
    this.emit("closing");
  }

  private _onBinaryData(e: MessageEvent) {
    console.log(e.data);
  }

  /**
   * Writes binary data into file.
   * Since this WRTC can handle multiple file transfers,
   * a specific file needs to be passed to this function.
   * @param {ArrayBuffer} chunk
   * @param {File} file
   */
  private _write(chunk: ArrayBuffer, file) {}

  private _parseJSON(e: MessageEvent) {}

  private _encodeFileId(raw: ArrayBuffer) {}

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

  on(evt: "error", callback: (err: any) => void): this;
  on(evt: "signal", callback: (signal: SignalData) => void): this;
  on(evt: "answer", callback: (answer: SignalData) => void): this;
  //prettier-ignore
  on(evt: "connectionstatechange", callback: (state: ConnectionState) => void): this;
  //prettier-ignore
  on(evt: "iceconnectionstatechange", callback: (state: IceConnectionState) => void): this;
  on(evt: "icegathetingerror", callback: (err: any) => void): this;
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
  once(evt: string | symbol, callback: (...args: any[]) => void): this;
  once(evt: string | symbol, callback: (...args: any[]) => void): this {
    return super.once(evt, callback);
  }

  off(evt: "error", callback: (err: any) => void): this;
  off(evt: "signal", callback: (signal: SignalData) => void): this;
  off(evt: "answer", callback: (answer: SignalData) => void): this;
  //prettier-ignore
  off(evt: "connectionstatechange", callback: (state: ConnectionState) => void): this;
  //prettier-ignore
  off(evt: "iceconnectionstatechange", callback: (state: IceConnectionState) => void): this;
  off(evt: "icegathetingerror", callback: (err: any) => void): this;
  off(evt: string | symbol, callback: (...args: any[]) => void): this;
  off(evt: string | symbol, callback: (...args: any[]) => void): this {
    return super.off(evt, callback);
  }
}
