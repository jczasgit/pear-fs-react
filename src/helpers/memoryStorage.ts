export class MemoryStorage {
  private _slotsCount: number; // the length in terms of memory slots to store.
  private _byteLength: number; // the bytes stored in memory.
  private _chunkSize: number; // the size of each chunk stored in memory.
  private _storage: any[]; // where all chunks is going to be stored.
  private _length: number; // keep track of the index of storage.

  constructor(length: number, opts?: { chunkSize: number }) {
    this._slotsCount = length;
    this._chunkSize = opts.chunkSize ?? 0;
    this._byteLength = 0;
    this._storage = new Array(length);
    for (let i = 0; i < length; i++) {
      this._storage[i] = null;
    }
  }

  get slotsCount(): number {
    return this._slotsCount;
  }
  get byteLength(): number {
    return this._byteLength;
  }
  get chunkSize(): number {
    return this._chunkSize;
  }

  public get(index: number) {
    if (index < 0 || index > this._length - 1) return null;

    let chunk = this._storage[index];
    this._storage[index] = null;
    return chunk;
  }

  public put(index: number, chunk: any): boolean {
    if (index > this._length - 1 || this._length === this._slotsCount)
      return false;

    this._storage[index] = chunk;
    this._length += 1;
    return true;
  }
}
