// Minimal reader/writer for Fractured Space's Unreal pak files (pak version 4,
// AES-256-ECB encrypted entries, zlib-compressed blocks, unencrypted index).
//
// Layout notes (verified against the shipped BP.pak):
//  - Footer (45 bytes): u8 bEncryptedIndex, u32 magic 0x5A6F12E1, i32 version,
//    i64 indexOffset, i64 indexSize, sha1(index)[20].
//  - Index: FString mountPoint, i32 count, then per entry: FString name + record.
//  - Record: i64 offset, i64 size, i64 uncompressedSize, i32 compression,
//    sha1[20], [i32 blockCount, (i64 start, i64 end)*] if compressed,
//    u8 encrypted, u32 compressionBlockSize. Block offsets are ABSOLUTE file
//    offsets. The same record (with offset 0) precedes each entry's data.
//  - Encrypted data is padded to 16 bytes. Compressed blocks are encrypted one
//    by one; padding repeats the block's leading bytes (what UnrealPak does).
//  - The entry hash is sha1 of the first `size` stored (encrypted) bytes.
//
// The key is never stored in the repo: pass it in or set FS_PAK_AES_KEY, or put
// it in a gitignored `.pak-key` file at the repo root (hex, optional 0x).

'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const zlib = require('zlib');

const MAGIC = 0x5a6f12e1;
const FOOTER_SIZE = 45;
const BLOCK_SIZE = 65536;
const COMPRESS_ZLIB = 1;

function loadKey(explicit) {
    let k = explicit || process.env.FS_PAK_AES_KEY;
    if (!k) {
        const f = path.join(__dirname, '..', '..', '.pak-key');
        if (fs.existsSync(f)) k = fs.readFileSync(f, 'utf8');
    }
    if (!k) throw new Error('No pak AES key: set FS_PAK_AES_KEY or create .pak-key (see docs/patching.md)');
    k = k.trim().replace(/^0x/i, '');
    if (!/^[0-9a-fA-F]{64}$/.test(k)) throw new Error('Pak AES key must be 64 hex characters');
    return Buffer.from(k, 'hex');
}

const align16 = (n) => Math.ceil(n / 16) * 16;
const sha1 = (b) => crypto.createHash('sha1').update(b).digest();

function aes(key, buf, decrypt) {
    const c = decrypt
        ? crypto.createDecipheriv('aes-256-ecb', key, null)
        : crypto.createCipheriv('aes-256-ecb', key, null);
    c.setAutoPadding(false);
    return Buffer.concat([c.update(buf), c.final()]);
}

// Pad to 16 bytes by repeating the buffer's leading bytes (UnrealPak behaviour).
function pad16(buf) {
    const n = align16(buf.length);
    if (n === buf.length) return buf;
    const out = Buffer.alloc(n);
    buf.copy(out);
    for (let i = buf.length; i < n; i++) out[i] = buf[(i - buf.length) % buf.length];
    return out;
}

// ---- reading -------------------------------------------------------------

class Reader {
    constructor(buf) { this.b = buf; this.o = 0; }
    u8() { return this.b[this.o++]; }
    i32() { const v = this.b.readInt32LE(this.o); this.o += 4; return v; }
    u32() { const v = this.b.readUInt32LE(this.o); this.o += 4; return v; }
    i64() { const v = Number(this.b.readBigInt64LE(this.o)); this.o += 8; return v; }
    bytes(n) { const v = this.b.subarray(this.o, this.o + n); this.o += n; return v; }
    fstring() {
        const n = this.i32();
        if (n === 0) return '';
        if (n < 0) { const s = this.b.toString('utf16le', this.o, this.o - n * 2 - 2); this.o += -n * 2; return s; }
        const s = this.b.toString('latin1', this.o, this.o + n - 1); this.o += n; return s;
    }
    record() {
        const e = {
            offset: this.i64(), size: this.i64(), uncompressedSize: this.i64(),
            compression: this.i32(), hash: Buffer.from(this.bytes(20)),
        };
        e.blocks = [];
        if (e.compression) {
            const n = this.i32();
            for (let i = 0; i < n; i++) e.blocks.push([this.i64(), this.i64()]);
        }
        e.encrypted = this.u8() !== 0;
        e.blockSize = this.u32();
        return e;
    }
}

function openPak(file, key) {
    const buf = fs.readFileSync(file);
    const ft = buf.subarray(buf.length - FOOTER_SIZE);
    if (ft.readUInt32LE(1) !== MAGIC) throw new Error(`${file}: not a pak file (bad footer magic)`);
    const version = ft.readInt32LE(5);
    if (version !== 4) throw new Error(`${file}: pak version ${version} not supported (expected 4)`);
    if (ft[0]) throw new Error(`${file}: encrypted index not supported`);
    const indexOffset = Number(ft.readBigInt64LE(9));
    const indexSize = Number(ft.readBigInt64LE(17));
    const r = new Reader(buf.subarray(indexOffset, indexOffset + indexSize));
    const mountPoint = r.fstring();
    const count = r.i32();
    const entries = [];
    for (let i = 0; i < count; i++) {
        const name = r.fstring();
        entries.push({ name, ...r.record() });
    }
    return { file, buf, version, mountPoint, entries, key: key || null };
}

function headerSize(e) {
    return 8 + 8 + 8 + 4 + 20 + (e.compression ? 4 + 16 * e.blocks.length : 0) + 1 + 4;
}

// The bytes stored for an entry: its in-data record plus its (padded) payload.
function rawRecord(pak, e) {
    const len = headerSize(e) + (e.encrypted ? align16(e.size) : e.size);
    return pak.buf.subarray(e.offset, e.offset + len);
}

function readEntry(pak, e) {
    const key = e.encrypted ? (pak.key || (pak.key = loadKey())) : null;
    if (!e.compression) {
        const start = e.offset + headerSize(e);
        let d = pak.buf.subarray(start, start + (e.encrypted ? align16(e.size) : e.size));
        if (e.encrypted) d = aes(key, d, true);
        return d.subarray(0, e.size);
    }
    if (e.compression !== COMPRESS_ZLIB) throw new Error(`${e.name}: unsupported compression ${e.compression}`);
    const parts = e.blocks.map(([s, t]) => {
        let d = pak.buf.subarray(s, s + (e.encrypted ? align16(t - s) : t - s));
        if (e.encrypted) d = aes(key, d, true);
        return zlib.inflateSync(d.subarray(0, t - s));
    });
    const out = Buffer.concat(parts);
    if (out.length !== e.uncompressedSize) throw new Error(`${e.name}: size mismatch after inflate`);
    return out;
}

// ---- writing -------------------------------------------------------------

class Writer {
    constructor() { this.parts = []; this.len = 0; }
    push(b) { this.parts.push(b); this.len += b.length; }
    u8(v) { this.push(Buffer.from([v])); }
    i32(v) { const b = Buffer.alloc(4); b.writeInt32LE(v); this.push(b); }
    u32(v) { const b = Buffer.alloc(4); b.writeUInt32LE(v); this.push(b); }
    i64(v) { const b = Buffer.alloc(8); b.writeBigInt64LE(BigInt(v)); this.push(b); }
    fstring(s) {
        if (!s) return this.i32(0);
        if (/^[\x00-\xff]*$/.test(s)) { this.i32(s.length + 1); this.push(Buffer.from(s + '\0', 'latin1')); }
        else { this.i32(-(s.length + 1)); this.push(Buffer.from(s + '\0', 'utf16le')); }
    }
    record(e) {
        this.i64(e.offset); this.i64(e.size); this.i64(e.uncompressedSize);
        this.i32(e.compression); this.push(e.hash);
        if (e.compression) { this.i32(e.blocks.length); for (const [s, t] of e.blocks) { this.i64(s); this.i64(t); } }
        this.u8(e.encrypted ? 1 : 0); this.u32(e.blockSize);
    }
    buffer() { return Buffer.concat(this.parts, this.len); }
}

// Encode one entry placed at `offset`. Deterministic: same input, same bytes.
// Compressed entries use zlib level 9; output differs from UnrealPak's zlib but
// the game only needs valid zlib streams.
function encodeEntry(name, data, offset, opts) {
    const { key, compress = true, encrypt = true } = opts;
    const e = { offset: 0, uncompressedSize: data.length, compression: 0, encrypted: encrypt, blocks: [], blockSize: 0 };
    let payload;
    if (compress && data.length) {
        e.compression = COMPRESS_ZLIB;
        e.blockSize = Math.min(BLOCK_SIZE, data.length);
        const chunks = [];
        for (let i = 0; i < data.length; i += BLOCK_SIZE) {
            let c = zlib.deflateSync(data.subarray(i, i + BLOCK_SIZE), { level: 9 });
            const clen = c.length;
            if (encrypt) c = pad16(c);
            chunks.push({ c, clen });
        }
        // Header size is known once the block count is.
        e.blocks = chunks.map(() => [0, 0]);
        let pos = offset + headerSize(e);
        e.blocks = chunks.map(({ c, clen }) => { const b = [pos, pos + clen]; pos += c.length; return b; });
        payload = Buffer.concat(chunks.map(({ c }) => (encrypt ? aes(key, c, false) : c)));
        e.size = payload.length;
    } else {
        payload = encrypt ? aes(key, pad16(data), false) : data;
        e.size = data.length;
    }
    e.hash = sha1(payload.subarray(0, e.size));
    const w = new Writer();
    w.record(e);
    w.push(payload);
    return { entry: { name, ...e, offset }, bytes: w.buffer() };
}

// Re-place a stored record from another pak at a new offset (block offsets are
// absolute, so they shift; everything else is copied byte for byte).
function relocateRecord(pak, e, offset) {
    const raw = rawRecord(pak, e);
    const delta = offset - e.offset;
    const moved = { ...e, offset, blocks: e.blocks.map(([s, t]) => [s + delta, t + delta]) };
    const w = new Writer();
    w.record({ ...moved, offset: 0 });
    w.push(raw.subarray(headerSize(e)));
    return { entry: moved, bytes: w.buffer() };
}

// items: [{ name, data } | { name, from: { pak, entry } }] in output order.
function writePak(file, { mountPoint, items, key, version = 4 }) {
    const out = [];
    const entries = [];
    let offset = 0;
    for (const it of items) {
        const r = it.from
            ? relocateRecord(it.from.pak, it.from.entry, offset)
            : encodeEntry(it.name, it.data, offset, { key, compress: it.compress !== false, encrypt: it.encrypt !== false });
        r.entry.name = it.name;
        entries.push(r.entry);
        out.push(r.bytes);
        offset += r.bytes.length;
    }
    const iw = new Writer();
    iw.fstring(mountPoint);
    iw.i32(entries.length);
    for (const e of entries) { iw.fstring(e.name); iw.record(e); }
    const index = iw.buffer();
    const ft = Buffer.alloc(FOOTER_SIZE);
    ft[0] = 0;
    ft.writeUInt32LE(MAGIC, 1);
    ft.writeInt32LE(version, 5);
    ft.writeBigInt64LE(BigInt(offset), 9);
    ft.writeBigInt64LE(BigInt(index.length), 17);
    sha1(index).copy(ft, 25);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, Buffer.concat([...out, index, ft]));
    return entries;
}

module.exports = { loadKey, openPak, readEntry, writePak, rawRecord, headerSize };
