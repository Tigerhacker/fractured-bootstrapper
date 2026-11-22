// Minimal deterministic zip writer/reader (no dependencies, no zip64: every
// file and the archive must stay under 4 GiB, which our payload does).
// Entries are written in the given order with a fixed timestamp, so the same
// inputs always give the same archive bytes.
'use strict';
const fs = require('fs');
const zlib = require('zlib');

const DOS_TIME = 0;                          // 00:00:00
const DOS_DATE = (0 << 9) | (1 << 5) | 1;    // 1980-01-01
const UTF8_FLAG = 0x0800;

function crc32(buf) {
    if (zlib.crc32) return zlib.crc32(buf) >>> 0;
    let c, crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
        c = (crc ^ buf[i]) & 0xff;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        crc = (crc >>> 8) ^ c;
    }
    return (crc ^ 0xffffffff) >>> 0;
}

// entries: [{ name: 'dir/file.ext', data: Buffer }]
function writeZip(file, entries) {
    const fd = fs.openSync(file, 'w');
    const central = [];
    let offset = 0;
    const write = (b) => { fs.writeSync(fd, b); offset += b.length; };
    try {
        for (const { name, data } of entries) {
            const nameBuf = Buffer.from(name, 'utf8');
            const crc = crc32(data);
            let method = 8;
            let body = zlib.deflateRawSync(data, { level: 9 });
            if (body.length >= data.length) { method = 0; body = data; } // already-compressed data (encrypted paks)
            if (body.length > 0xffffffff || data.length > 0xffffffff || offset > 0xffffffff) throw new Error(`${name}: too large for non-zip64 archive`);
            const local = Buffer.alloc(30);
            local.writeUInt32LE(0x04034b50, 0);
            local.writeUInt16LE(20, 4);
            local.writeUInt16LE(UTF8_FLAG, 6);
            local.writeUInt16LE(method, 8);
            local.writeUInt16LE(DOS_TIME, 10);
            local.writeUInt16LE(DOS_DATE, 12);
            local.writeUInt32LE(crc, 14);
            local.writeUInt32LE(body.length, 18);
            local.writeUInt32LE(data.length, 22);
            local.writeUInt16LE(nameBuf.length, 26);
            local.writeUInt16LE(0, 28);
            const at = offset;
            write(local); write(nameBuf); write(body);
            const c = Buffer.alloc(46);
            c.writeUInt32LE(0x02014b50, 0);
            c.writeUInt16LE(20, 4);
            c.writeUInt16LE(20, 6);
            c.writeUInt16LE(UTF8_FLAG, 8);
            c.writeUInt16LE(method, 10);
            c.writeUInt16LE(DOS_TIME, 12);
            c.writeUInt16LE(DOS_DATE, 14);
            c.writeUInt32LE(crc, 16);
            c.writeUInt32LE(body.length, 20);
            c.writeUInt32LE(data.length, 24);
            c.writeUInt16LE(nameBuf.length, 28);
            c.writeUInt32LE(at, 42);
            central.push(Buffer.concat([c, nameBuf]));
        }
        const cdStart = offset;
        for (const c of central) write(c);
        const end = Buffer.alloc(22);
        end.writeUInt32LE(0x06054b50, 0);
        end.writeUInt16LE(central.length, 8);
        end.writeUInt16LE(central.length, 10);
        end.writeUInt32LE(offset - cdStart, 12);
        end.writeUInt32LE(cdStart, 16);
        write(end);
    } finally {
        fs.closeSync(fd);
    }
}

// Returns [{ name, read() -> Buffer }] for archives written by writeZip (or any
// plain non-zip64, non-encrypted zip using store/deflate).
function readZip(file) {
    const buf = fs.readFileSync(file);
    let eocd = -1;
    for (let i = buf.length - 22; i >= Math.max(0, buf.length - 22 - 0xffff); i--) {
        if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) throw new Error(`${file}: not a zip file`);
    const count = buf.readUInt16LE(eocd + 10);
    let p = buf.readUInt32LE(eocd + 16);
    const out = [];
    for (let i = 0; i < count; i++) {
        if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error(`${file}: bad central directory`);
        const method = buf.readUInt16LE(p + 10);
        const crc = buf.readUInt32LE(p + 16);
        const csize = buf.readUInt32LE(p + 20);
        const nlen = buf.readUInt16LE(p + 28), xlen = buf.readUInt16LE(p + 30), clen = buf.readUInt16LE(p + 32);
        const at = buf.readUInt32LE(p + 42);
        const name = buf.toString('utf8', p + 46, p + 46 + nlen);
        p += 46 + nlen + xlen + clen;
        out.push({
            name,
            read() {
                const start = at + 30 + buf.readUInt16LE(at + 26) + buf.readUInt16LE(at + 28);
                const body = buf.subarray(start, start + csize);
                const data = method === 0 ? Buffer.from(body) : method === 8 ? zlib.inflateRawSync(body) : null;
                if (!data) throw new Error(`${name}: unsupported compression method ${method}`);
                if (crc32(data) !== crc) throw new Error(`${name}: CRC mismatch`);
                return data;
            },
        });
    }
    return out;
}

module.exports = { writeZip, readZip };
