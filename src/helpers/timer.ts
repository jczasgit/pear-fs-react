import { EventEmitter } from "events";

export class Timer extends EventEmitter {
  private _timeoutId: number;
  private _delay: number;
  private _start: number;
  private _remaining: number;
  private _target: string;

  constructor(target: string, delay: number = 5000) {
    super();
    this._target = target;
    this._delay = delay;
    this._start = 0;
    this._timeoutId = null;
  }

  get timeoutId(): number {
    return this._timeoutId;
  }
  get delay(): number {
    return this._delay;
  }
  get target(): string {
    return this._target;
  }

  public start() {
    this._start = Date.now();
    clearTimeout(this._timeoutId);
    this._timeoutId = window.setTimeout(() => {
      this.emit("timeout", this._target);
    }, this._delay);
  }

  public pause() {
    clearTimeout(this._timeoutId);
    this._delay -= Date.now() - this._start;
  }

  public clear() {
    clearTimeout(this._timeoutId);
  }
}
