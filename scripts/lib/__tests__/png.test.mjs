import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { encodePNG } from '../png.mjs';

describe('encodePNG', () => {
    it('produces valid PNG with correct signature', () => {
        // 2x2 red RGBA image
        const w = 2, h = 2;
        const buf = Buffer.alloc(w * h * 4);
        for (let i = 0; i < w * h; i++) {
            buf[i * 4] = 255;     // R
            buf[i * 4 + 1] = 0;   // G
            buf[i * 4 + 2] = 0;   // B
            buf[i * 4 + 3] = 255; // A
        }

        const png = encodePNG(w, h, buf);

        // PNG signature: 0x89 P N G \r \n 0x1A \n
        assert.deepStrictEqual(
            [...png.subarray(0, 8)],
            [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]
        );
    });

    it('contains valid IHDR chunk with correct dimensions', () => {
        const w = 3, h = 5;
        const buf = Buffer.alloc(w * h * 4);
        const png = encodePNG(w, h, buf);

        // IHDR starts at offset 8: length(4) + "IHDR"(4) + data(13) + crc(4)
        const ihdrType = png.toString('ascii', 12, 16);
        assert.equal(ihdrType, 'IHDR');

        const ihdrWidth = png.readUInt32BE(16);
        const ihdrHeight = png.readUInt32BE(20);
        assert.equal(ihdrWidth, w);
        assert.equal(ihdrHeight, h);

        // bit depth = 8, color type = 6 (RGBA)
        assert.equal(png[24], 8);
        assert.equal(png[25], 6);
    });

    it('returns a Buffer', () => {
        const png = encodePNG(1, 1, Buffer.alloc(4));
        assert.ok(Buffer.isBuffer(png));
    });

    it('contains IEND chunk', () => {
        const png = encodePNG(1, 1, Buffer.alloc(4));
        // IEND is the last chunk: length(0) + "IEND" + crc
        const iendPos = png.indexOf('IEND');
        assert.ok(iendPos > 0, 'IEND chunk must be present');
    });
});
