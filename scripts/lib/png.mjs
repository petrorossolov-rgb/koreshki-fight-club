/**
 * Minimal PNG encoder for RGBA pixel buffers.
 * Produces valid 8-bit RGBA PNGs using zlib compression.
 */
import { deflateSync } from 'zlib';

function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
        c ^= buf[i];
        for (let j = 0; j < 8; j++) {
            c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
        }
    }
    return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const typeData = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(typeData));
    return Buffer.concat([len, typeData, crc]);
}

/**
 * Encode raw RGBA pixel buffer into a PNG file buffer.
 * @param {number} width
 * @param {number} height
 * @param {Buffer} rgbaBuffer - width * height * 4 bytes (RGBA)
 * @returns {Buffer} Complete PNG file
 */
export function encodePNG(width, height, rgbaBuffer) {
    // Build raw scanlines (filter byte 0 = None for each row)
    const raw = Buffer.alloc(height * (1 + width * 4));
    for (let y = 0; y < height; y++) {
        const rowOffset = y * (1 + width * 4);
        raw[rowOffset] = 0; // filter: None
        rgbaBuffer.copy(raw, rowOffset + 1, y * width * 4, (y + 1) * width * 4);
    }

    const compressed = deflateSync(raw);

    // IHDR: 13 bytes
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8;  // bit depth
    ihdr[9] = 6;  // color type: RGBA
    ihdr[10] = 0; // compression
    ihdr[11] = 0; // filter
    ihdr[12] = 0; // interlace

    return Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]), // PNG signature
        chunk('IHDR', ihdr),
        chunk('IDAT', compressed),
        chunk('IEND', Buffer.alloc(0)),
    ]);
}
