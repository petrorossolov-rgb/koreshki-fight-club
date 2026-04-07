import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { FrameBuffer, fillRect, fillCircle, fillOval, drawLine, blit } from '../draw.mjs';
import { encodePNG } from '../png.mjs';

const RED = [255, 0, 0, 255];
const GREEN = [0, 255, 0, 255];
const BLUE = [0, 0, 255, 255];
const TRANSPARENT = [0, 0, 0, 0];

describe('FrameBuffer', () => {
    it('initializes with all transparent pixels', () => {
        const fb = new FrameBuffer(4, 4);
        assert.deepStrictEqual(fb.getPixel(0, 0), TRANSPARENT);
        assert.deepStrictEqual(fb.getPixel(3, 3), TRANSPARENT);
    });

    it('setPixel/getPixel round-trip', () => {
        const fb = new FrameBuffer(8, 8);
        fb.setPixel(3, 5, RED);
        assert.deepStrictEqual(fb.getPixel(3, 5), RED);
        // Other pixels unchanged
        assert.deepStrictEqual(fb.getPixel(0, 0), TRANSPARENT);
    });

    it('clips out-of-bounds setPixel silently', () => {
        const fb = new FrameBuffer(4, 4);
        fb.setPixel(-1, 0, RED);
        fb.setPixel(0, -1, RED);
        fb.setPixel(4, 0, RED);
        fb.setPixel(0, 4, RED);
        // No pixels should be set
        for (let y = 0; y < 4; y++)
            for (let x = 0; x < 4; x++)
                assert.deepStrictEqual(fb.getPixel(x, y), TRANSPARENT);
    });

    it('getPixel returns transparent for out-of-bounds', () => {
        const fb = new FrameBuffer(4, 4);
        assert.deepStrictEqual(fb.getPixel(-1, 0), TRANSPARENT);
        assert.deepStrictEqual(fb.getPixel(4, 0), TRANSPARENT);
    });

    it('clear() resets all pixels', () => {
        const fb = new FrameBuffer(4, 4);
        fb.setPixel(1, 1, RED);
        fb.clear();
        assert.deepStrictEqual(fb.getPixel(1, 1), TRANSPARENT);
    });

    it('toBuffer() returns raw RGBA data', () => {
        const fb = new FrameBuffer(2, 2);
        fb.setPixel(0, 0, RED);
        const buf = fb.toBuffer();
        assert.ok(Buffer.isBuffer(buf));
        assert.equal(buf.length, 2 * 2 * 4);
        assert.deepStrictEqual([buf[0], buf[1], buf[2], buf[3]], RED);
    });
});

describe('fillRect', () => {
    it('fills rectangular region', () => {
        const fb = new FrameBuffer(8, 8);
        fillRect(fb, 2, 3, 3, 2, RED);
        // Inside
        assert.deepStrictEqual(fb.getPixel(2, 3), RED);
        assert.deepStrictEqual(fb.getPixel(4, 4), RED);
        // Outside
        assert.deepStrictEqual(fb.getPixel(1, 3), TRANSPARENT);
        assert.deepStrictEqual(fb.getPixel(5, 3), TRANSPARENT);
        assert.deepStrictEqual(fb.getPixel(2, 5), TRANSPARENT);
    });

    it('clips to bounds', () => {
        const fb = new FrameBuffer(4, 4);
        fillRect(fb, -2, -2, 10, 10, RED);
        // All pixels should be red (clipped to 4x4)
        assert.deepStrictEqual(fb.getPixel(0, 0), RED);
        assert.deepStrictEqual(fb.getPixel(3, 3), RED);
    });
});

describe('fillCircle', () => {
    it('fills circular region', () => {
        const fb = new FrameBuffer(16, 16);
        fillCircle(fb, 8, 8, 3, RED);
        // Center
        assert.deepStrictEqual(fb.getPixel(8, 8), RED);
        // Edge points (within radius)
        assert.deepStrictEqual(fb.getPixel(8, 5), RED);
        assert.deepStrictEqual(fb.getPixel(8, 11), RED);
        // Outside
        assert.deepStrictEqual(fb.getPixel(0, 0), TRANSPARENT);
    });

    it('clips to bounds when circle extends past edge', () => {
        const fb = new FrameBuffer(4, 4);
        // Circle centered at 0,0 with r=2 — should fill what's in-bounds
        fillCircle(fb, 0, 0, 2, RED);
        assert.deepStrictEqual(fb.getPixel(0, 0), RED);
        assert.deepStrictEqual(fb.getPixel(1, 0), RED);
    });
});

describe('fillOval', () => {
    it('fills elliptical region', () => {
        const fb = new FrameBuffer(20, 20);
        fillOval(fb, 10, 10, 5, 3, BLUE);
        // Center
        assert.deepStrictEqual(fb.getPixel(10, 10), BLUE);
        // Along x axis (rx=5)
        assert.deepStrictEqual(fb.getPixel(15, 10), BLUE);
        // Along y axis (ry=3)
        assert.deepStrictEqual(fb.getPixel(10, 13), BLUE);
        // Beyond y-radius
        assert.deepStrictEqual(fb.getPixel(10, 14), TRANSPARENT);
    });
});

describe('drawLine', () => {
    it('draws a horizontal thick line', () => {
        const fb = new FrameBuffer(20, 20);
        drawLine(fb, 2, 10, 18, 10, 4, GREEN);
        // Center of line
        assert.deepStrictEqual(fb.getPixel(10, 10), GREEN);
        // Above/below within thickness
        assert.deepStrictEqual(fb.getPixel(10, 9), GREEN);
        // Far away
        assert.deepStrictEqual(fb.getPixel(10, 0), TRANSPARENT);
    });

    it('draws a zero-length line (dot)', () => {
        const fb = new FrameBuffer(10, 10);
        drawLine(fb, 5, 5, 5, 5, 4, RED);
        assert.deepStrictEqual(fb.getPixel(5, 5), RED);
    });
});

describe('blit', () => {
    it('copies src onto dst at offset', () => {
        const src = new FrameBuffer(2, 2);
        src.setPixel(0, 0, RED);
        src.setPixel(1, 1, GREEN);

        const dst = new FrameBuffer(8, 8);
        blit(src, dst, 3, 4);

        assert.deepStrictEqual(dst.getPixel(3, 4), RED);
        assert.deepStrictEqual(dst.getPixel(4, 5), GREEN);
        // Transparent src pixels not copied
        assert.deepStrictEqual(dst.getPixel(4, 4), TRANSPARENT);
    });

    it('clips when blit extends past dst bounds', () => {
        const src = new FrameBuffer(4, 4);
        fillRect(src, 0, 0, 4, 4, BLUE);

        const dst = new FrameBuffer(4, 4);
        blit(src, dst, 2, 2);

        // Only 2x2 area should be blitted
        assert.deepStrictEqual(dst.getPixel(2, 2), BLUE);
        assert.deepStrictEqual(dst.getPixel(3, 3), BLUE);
        assert.deepStrictEqual(dst.getPixel(0, 0), TRANSPARENT);
    });
});

describe('integration with encodePNG', () => {
    it('FrameBuffer.toBuffer() produces valid PNG via encodePNG', () => {
        const fb = new FrameBuffer(4, 4);
        fillRect(fb, 0, 0, 4, 4, RED);

        const png = encodePNG(fb.width, fb.height, fb.toBuffer());
        // Valid PNG signature
        assert.deepStrictEqual(
            [...png.subarray(0, 8)],
            [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]
        );
        // Contains IHDR
        assert.ok(png.indexOf('IHDR') > 0);
    });
});
