// Minimal PE32+ helpers for patching the game exe: parse headers, and extend
// the image with new sections for patch code/data plus an enlarged exception
// (unwind) table. No dependencies. See docs/patching.md, "Exe sections".
//
// Layout produced by extend(), after the base image's last section:
//
//   .fspcode  RX   code window   (fixed RVA/size from patches/bases.json)
//   .fspdata  RW   data window   (fixed RVA/size, directly after the code window)
//   .pdata2   R    the base exception table + every patch's unwind entries
//                  (only when some patch declares unwind entries)
//
// The windows have fixed sizes so one patch's claims never move another's.
// Patches claim fixed RVAs inside them; the builder owns all header fields
// (section table, NumberOfSections, SizeOfImage, SizeOfCode,
// SizeOfInitializedData, the exception directory and CheckSum).

'use strict';

const SCN_CODE = 0x60000020;   // CNT_CODE | MEM_EXECUTE | MEM_READ
const SCN_DATA = 0xc0000040;   // CNT_INITIALIZED_DATA | MEM_READ | MEM_WRITE
const SCN_RDATA = 0x40000040;  // CNT_INITIALIZED_DATA | MEM_READ
const DIR_EXCEPTION = 3;
const DIR_SECURITY = 4;
const SECTION_HEADER = 40;
const RUNTIME_FUNCTION = 12;

const align = (n, a) => Math.ceil(n / a) * a;
const hex = (n) => '0x' + n.toString(16).toUpperCase();

function parse(buf) {
    if (buf.readUInt16LE(0) !== 0x5a4d) throw new Error('not an MZ file');
    const peOff = buf.readUInt32LE(0x3c);
    if (buf.readUInt32LE(peOff) !== 0x4550) throw new Error('no PE signature');
    const numSec = buf.readUInt16LE(peOff + 6);
    const optSize = buf.readUInt16LE(peOff + 20);
    const opt = peOff + 24;
    if (buf.readUInt16LE(opt) !== 0x20b) throw new Error('not PE32+');
    const pe = {
        peOff, opt, numSec,
        off: {
            numSec: peOff + 6,
            sizeOfCode: opt + 4,
            sizeOfInitData: opt + 8,
            sizeOfImage: opt + 56,
            checkSum: opt + 64,
            dirs: opt + 112,
        },
        sectionAlignment: buf.readUInt32LE(opt + 32),
        fileAlignment: buf.readUInt32LE(opt + 36),
        sizeOfImage: buf.readUInt32LE(opt + 56),
        sizeOfHeaders: buf.readUInt32LE(opt + 60),
        numDirs: buf.readUInt32LE(opt + 108),
        secTable: opt + optSize,
        sections: [],
    };
    for (let i = 0; i < numSec; i++) {
        const o = pe.secTable + i * SECTION_HEADER;
        pe.sections.push({
            name: buf.toString('latin1', o, o + 8).replace(/\0+$/, ''),
            vsize: buf.readUInt32LE(o + 8), va: buf.readUInt32LE(o + 12),
            rawSize: buf.readUInt32LE(o + 16), rawPtr: buf.readUInt32LE(o + 20),
            chars: buf.readUInt32LE(o + 36),
        });
    }
    return pe;
}

function dir(buf, pe, i) {
    if (i >= pe.numDirs) return { rva: 0, size: 0 };
    const o = pe.off.dirs + i * 8;
    return { rva: buf.readUInt32LE(o), size: buf.readUInt32LE(o + 4) };
}

function rvaToOffset(pe, rva) {
    for (const s of pe.sections) {
        if (rva >= s.va && rva < s.va + Math.max(s.vsize, s.rawSize)) {
            if (rva - s.va >= s.rawSize) throw new Error(`RVA ${hex(rva)} is in ${s.name} but not file-backed`);
            return s.rawPtr + (rva - s.va);
        }
    }
    throw new Error(`RVA ${hex(rva)} is not in any section`);
}

// Standard PE image checksum (what imagehlp's CheckSumMappedFile computes).
function checksum(buf, checkSumOff) {
    let sum = 0;
    const n = buf.length & ~1;
    for (let i = 0; i < n; i += 2) {
        if (i === checkSumOff || i === checkSumOff + 2) continue;
        sum += buf.readUInt16LE(i);
        sum = (sum & 0xffff) + (sum >>> 16);
    }
    if (buf.length & 1) { sum += buf[buf.length - 1]; sum = (sum & 0xffff) + (sum >>> 16); }
    sum = (sum & 0xffff) + (sum >>> 16);
    return (sum + buf.length) >>> 0;
}

function num(v, what) {
    const n = typeof v === 'number' ? v : Number(v);
    if (!Number.isInteger(n) || n < 0) throw new Error(`bad ${what}: ${v}`);
    return n;
}

// Header bytes the builder rewrites when it extends the image; byte edits
// must stay out of them (checked by the build).
function headerRange(pe) {
    return { start: 0, end: pe.sizeOfHeaders };
}

// layout: { code: { rva, size }, data: { rva, size } }  (from bases.json "extension")
// parts:  [{ who, code: [{ rva, bytes }], data: [{ rva, size, bytes? }], unwind: [{ begin, end, unwind }] }]
// Returns { buf, claims, sections } where claims lists every claimed range.
function extend(base, layout, parts) {
    const pe = parse(base);
    const SA = pe.sectionAlignment, FA = pe.fileAlignment;

    const last = pe.sections[pe.sections.length - 1];
    const fileEnd = Math.max(...pe.sections.map((s) => s.rawPtr + s.rawSize));
    if (fileEnd !== base.length) throw new Error('base exe has data after its last section (overlay); not supported');
    if (dir(base, pe, DIR_SECURITY).size) throw new Error('base exe is signed (security directory present); not supported');
    const imageEnd = align(last.va + Math.max(last.vsize, 1), SA);
    if (imageEnd !== align(pe.sizeOfImage, SA)) throw new Error('SizeOfImage does not match the last section');

    const code = { rva: num(layout.code.rva, 'code rva'), size: num(layout.code.size, 'code size') };
    const data = { rva: num(layout.data.rva, 'data rva'), size: num(layout.data.size, 'data size') };
    if (code.rva !== imageEnd) throw new Error(`extension code window must start at the end of the image (${hex(imageEnd)}), not ${hex(code.rva)}`);
    if (data.rva !== code.rva + code.size) throw new Error(`extension data window must follow the code window (${hex(code.rva + code.size)})`);
    for (const w of [code, data]) if (!w.size || w.size % SA) throw new Error(`window sizes must be non-zero multiples of ${hex(SA)}`);

    // Collect claims and check they sit inside their window without overlapping.
    const claims = [];
    const claim = (kind, who, rva, size, bytes, note) => {
        const w = kind === 'code' ? code : data;
        if (!size) throw new Error(`${who}: empty ${kind} claim at ${hex(rva)}`);
        if (rva < w.rva || rva + size > w.rva + w.size) {
            throw new Error(`${who}: ${kind} claim ${hex(rva)}+${hex(size)} is outside the ${kind} window ${hex(w.rva)}..${hex(w.rva + w.size)}`);
        }
        for (const c of claims) {
            if (rva < c.end && c.rva < rva + size) throw new Error(`${who}: ${kind} claim ${hex(rva)} overlaps ${c.who} (${hex(c.rva)}..${hex(c.end)})`);
        }
        claims.push({ kind, who, rva, end: rva + size, bytes, note });
    };
    for (const p of parts) {
        for (const c of p.code || []) claim('code', p.who, num(c.rva, 'rva'), c.bytes.length, c.bytes, c.note);
        for (const d of p.data || []) {
            const size = num(d.size, 'size');
            if (d.bytes && d.bytes.length > size) throw new Error(`${p.who}: data file at ${hex(d.rva)} is larger than its size`);
            claim('data', p.who, num(d.rva, 'rva'), size, d.bytes || null, d.note);
        }
    }

    // Unwind entries: each must cover code the same patch claimed, and point at
    // unwind info inside one of that patch's claims.
    const entries = [];
    const owns = (who, rva, len, kinds) => claims.some((c) => c.who === who && kinds.includes(c.kind) && rva >= c.rva && rva + len <= c.end);
    for (const p of parts) {
        for (const u of p.unwind || []) {
            const begin = num(u.begin, 'begin'), end = num(u.end, 'end'), info = num(u.unwind, 'unwind');
            if (end <= begin) throw new Error(`${p.who}: unwind entry ${hex(begin)} has end <= begin`);
            if (!owns(p.who, begin, end - begin, ['code'])) throw new Error(`${p.who}: unwind entry ${hex(begin)}..${hex(end)} is not inside its own code claim`);
            if (info % 4 || !owns(p.who, info, 4, ['code', 'data'])) throw new Error(`${p.who}: unwind info ${hex(info)} is not a 4-aligned address inside its own claims`);
            entries.push({ who: p.who, begin, end, info });
        }
    }
    entries.sort((a, b) => a.begin - b.begin);
    for (let i = 1; i < entries.length; i++) {
        if (entries[i].begin < entries[i - 1].end) throw new Error(`unwind entries overlap: ${entries[i - 1].who} and ${entries[i].who} at ${hex(entries[i].begin)}`);
    }

    // Section contents. Virtual size is always the full window, so SizeOfImage
    // and the .pdata2 RVA never depend on which patches are selected; raw data
    // is trimmed to the last claimed byte.
    const body = (w, kind) => {
        const mine = claims.filter((c) => c.kind === kind);
        const used = mine.length ? Math.max(...mine.map((c) => c.end)) - w.rva : 0;
        const out = Buffer.alloc(align(used, FA));
        for (const c of mine) if (c.bytes) c.bytes.copy(out, c.rva - w.rva);
        return out;
    };
    const sections = [
        { name: '.fspcode', va: code.rva, vsize: code.size, raw: body(code, 'code'), chars: SCN_CODE },
        { name: '.fspdata', va: data.rva, vsize: data.size, raw: body(data, 'data'), chars: SCN_DATA },
    ];
    const exc = dir(base, pe, DIR_EXCEPTION);
    if (entries.length) {
        if (!exc.size || exc.size % RUNTIME_FUNCTION) throw new Error('base exe has no usable exception directory');
        const old = base.subarray(rvaToOffset(pe, exc.rva), rvaToOffset(pe, exc.rva) + exc.size);
        const lastBegin = old.readUInt32LE(old.length - RUNTIME_FUNCTION);
        if (entries[0].begin <= lastBegin) throw new Error('new unwind entries must sort after the base table');
        const add = Buffer.alloc(entries.length * RUNTIME_FUNCTION);
        entries.forEach((e, i) => { add.writeUInt32LE(e.begin, i * 12); add.writeUInt32LE(e.end, i * 12 + 4); add.writeUInt32LE(e.info, i * 12 + 8); });
        const table = Buffer.concat([old, add]);
        const raw = Buffer.alloc(align(table.length, FA));
        table.copy(raw);
        sections.push({ name: '.pdata2', va: data.rva + data.size, vsize: table.length, raw, chars: SCN_RDATA, table: table.length });
    }

    // Section headers go into the header slack, which must be unused.
    const tableEnd = pe.secTable + (pe.numSec + sections.length) * SECTION_HEADER;
    if (tableEnd > pe.sizeOfHeaders) throw new Error('no room for more section headers');
    const firstRaw = Math.min(...pe.sections.filter((s) => s.rawSize).map((s) => s.rawPtr));
    if (tableEnd > firstRaw) throw new Error('section headers would overlap section data');
    const slack = base.subarray(pe.secTable + pe.numSec * SECTION_HEADER, tableEnd);
    if (slack.some((b) => b !== 0)) throw new Error('header slack for new section headers is not empty');

    const out = Buffer.concat([base, ...sections.map((s) => s.raw)]);
    let rawPtr = base.length;
    sections.forEach((s, i) => {
        const o = pe.secTable + (pe.numSec + i) * SECTION_HEADER;
        out.fill(0, o, o + SECTION_HEADER);
        out.write(s.name, o, 8, 'latin1');
        out.writeUInt32LE(s.vsize, o + 8);
        out.writeUInt32LE(s.va, o + 12);
        out.writeUInt32LE(s.raw.length, o + 16);
        out.writeUInt32LE(s.raw.length ? rawPtr : 0, o + 20);
        out.writeUInt32LE(s.chars, o + 36);
        s.rawPtr = s.raw.length ? rawPtr : 0;
        rawPtr += s.raw.length;
    });
    const lastNew = sections[sections.length - 1];
    out.writeUInt16LE(pe.numSec + sections.length, pe.off.numSec);
    out.writeUInt32LE(align(lastNew.va + lastNew.vsize, SA), pe.off.sizeOfImage);
    out.writeUInt32LE(base.readUInt32LE(pe.off.sizeOfCode) + sections[0].raw.length, pe.off.sizeOfCode);
    out.writeUInt32LE(base.readUInt32LE(pe.off.sizeOfInitData) + sections.slice(1).reduce((n, s) => n + s.raw.length, 0), pe.off.sizeOfInitData);
    const pdata2 = sections.find((s) => s.table);
    if (pdata2) {
        out.writeUInt32LE(pdata2.va, pe.off.dirs + DIR_EXCEPTION * 8);
        out.writeUInt32LE(pdata2.table, pe.off.dirs + DIR_EXCEPTION * 8 + 4);
    }
    out.writeUInt32LE(checksum(out, pe.off.checkSum), pe.off.checkSum);
    verify(out, layout, claims, entries, base);
    return { buf: out, claims, entries, sections };
}

// Re-parse the result and check it says what we meant. Cheap, and catches
// builder bugs before a broken exe reaches data/.
function verify(out, layout, claims, entries, base) {
    const pe = parse(out);
    const SA = pe.sectionAlignment;
    for (let i = 1; i < pe.sections.length; i++) {
        const a = pe.sections[i - 1], b = pe.sections[i];
        if (b.va !== align(a.va + Math.max(a.vsize, 1), SA)) throw new Error(`verify: ${b.name} is not contiguous with ${a.name}`);
        if (b.rawSize && b.rawPtr % pe.fileAlignment) throw new Error(`verify: ${b.name} raw data is misaligned`);
    }
    const last = pe.sections[pe.sections.length - 1];
    if (pe.sizeOfImage !== align(last.va + last.vsize, SA)) throw new Error('verify: SizeOfImage mismatch');
    for (const c of claims) {
        if (!c.bytes) continue;
        const o = rvaToOffset(pe, c.rva);
        if (!out.subarray(o, o + c.bytes.length).equals(c.bytes)) throw new Error(`verify: claim ${hex(c.rva)} not written`);
    }
    const exc = dir(out, pe, DIR_EXCEPTION);
    const t = out.subarray(rvaToOffset(pe, exc.rva), rvaToOffset(pe, exc.rva) + exc.size);
    for (let i = 12; i < t.length; i += 12) if (t.readUInt32LE(i) < t.readUInt32LE(i - 12)) throw new Error('verify: exception table not sorted');
    if (entries.length && t.length !== dir(base, parse(base), DIR_EXCEPTION).size + entries.length * 12) throw new Error('verify: exception table size');
    if (out.readUInt32LE(pe.off.checkSum) !== checksum(out, pe.off.checkSum)) throw new Error('verify: checksum');
    // Every byte of the base outside the header must be unchanged.
    if (!out.subarray(pe.sizeOfHeaders, base.length).equals(base.subarray(pe.sizeOfHeaders))) throw new Error('verify: base sections changed');
}

module.exports = { parse, dir, rvaToOffset, checksum, extend, headerRange, hex };
