/**
 * 2D drawing primitives for procedural sprite generation.
 * Works with raw RGBA pixel buffers compatible with encodePNG().
 */

export class FrameBuffer {
    /** @param {number} w @param {number} h */
    constructor(w, h) {
        this.width = w;
        this.height = h;
        this.data = Buffer.alloc(w * h * 4);
    }

    /** @param {number} x @param {number} y @returns {[number,number,number,number]} */
    getPixel(x, y) {
        x = Math.round(x);
        y = Math.round(y);
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return [0, 0, 0, 0];
        const i = (y * this.width + x) * 4;
        return [this.data[i], this.data[i + 1], this.data[i + 2], this.data[i + 3]];
    }

    /** @param {number} x @param {number} y @param {[number,number,number,number]} color */
    setPixel(x, y, color) {
        x = Math.round(x);
        y = Math.round(y);
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
        const i = (y * this.width + x) * 4;
        this.data[i] = color[0];
        this.data[i + 1] = color[1];
        this.data[i + 2] = color[2];
        this.data[i + 3] = color[3];
    }

    clear() {
        this.data.fill(0);
    }

    /** @returns {Buffer} Raw RGBA buffer for encodePNG */
    toBuffer() {
        return this.data;
    }
}

/**
 * Fill axis-aligned rectangle.
 * @param {FrameBuffer} fb
 * @param {number} x @param {number} y @param {number} w @param {number} h
 * @param {[number,number,number,number]} color
 */
export function fillRect(fb, x, y, w, h, color) {
    const x0 = Math.max(0, Math.round(x));
    const y0 = Math.max(0, Math.round(y));
    const x1 = Math.min(fb.width, Math.round(x + w));
    const y1 = Math.min(fb.height, Math.round(y + h));
    for (let py = y0; py < y1; py++) {
        for (let px = x0; px < x1; px++) {
            fb.setPixel(px, py, color);
        }
    }
}

/**
 * Fill circle using midpoint/scanline algorithm.
 * @param {FrameBuffer} fb
 * @param {number} cx @param {number} cy @param {number} r
 * @param {[number,number,number,number]} color
 */
export function fillCircle(fb, cx, cy, r, color) {
    cx = Math.round(cx);
    cy = Math.round(cy);
    r = Math.round(r);
    const r2 = r * r;
    for (let dy = -r; dy <= r; dy++) {
        const halfW = Math.floor(Math.sqrt(r2 - dy * dy));
        for (let dx = -halfW; dx <= halfW; dx++) {
            fb.setPixel(cx + dx, cy + dy, color);
        }
    }
}

/**
 * Fill ellipse (oval).
 * @param {FrameBuffer} fb
 * @param {number} cx @param {number} cy @param {number} rx @param {number} ry
 * @param {[number,number,number,number]} color
 */
export function fillOval(fb, cx, cy, rx, ry, color) {
    cx = Math.round(cx);
    cy = Math.round(cy);
    rx = Math.round(rx);
    ry = Math.round(ry);
    for (let dy = -ry; dy <= ry; dy++) {
        const halfW = Math.floor(rx * Math.sqrt(1 - (dy * dy) / (ry * ry)));
        for (let dx = -halfW; dx <= halfW; dx++) {
            fb.setPixel(cx + dx, cy + dy, color);
        }
    }
}

/**
 * Draw a line with thickness using Bresenham + perpendicular expansion.
 * @param {FrameBuffer} fb
 * @param {number} x0 @param {number} y0 @param {number} x1 @param {number} y1
 * @param {number} thickness
 * @param {[number,number,number,number]} color
 */
export function drawLine(fb, x0, y0, x1, y1, thickness, color) {
    x0 = Math.round(x0);
    y0 = Math.round(y0);
    x1 = Math.round(x1);
    y1 = Math.round(y1);
    const half = thickness / 2;

    // For thick lines, stamp circles along the line path
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len = Math.sqrt(dx * dx + dy * dy);

    if (len === 0) {
        fillCircle(fb, x0, y0, Math.floor(half), color);
        return;
    }

    const steps = Math.ceil(len);
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const px = x0 + dx * t;
        const py = y0 + dy * t;
        // Stamp a filled circle at each point
        const r = Math.floor(half);
        const r2 = r * r;
        for (let oy = -r; oy <= r; oy++) {
            const hw = Math.floor(Math.sqrt(r2 - oy * oy));
            for (let ox = -hw; ox <= hw; ox++) {
                fb.setPixel(Math.round(px + ox), Math.round(py + oy), color);
            }
        }
    }
}

/**
 * Blit (copy) source FrameBuffer onto destination, skipping alpha=0 pixels.
 * @param {FrameBuffer} src
 * @param {FrameBuffer} dst
 * @param {number} dx @param {number} dy — top-left offset in destination
 */
export function blit(src, dst, dx, dy) {
    dx = Math.round(dx);
    dy = Math.round(dy);
    for (let sy = 0; sy < src.height; sy++) {
        for (let sx = 0; sx < src.width; sx++) {
            const pixel = src.getPixel(sx, sy);
            if (pixel[3] === 0) continue;
            dst.setPixel(dx + sx, dy + sy, pixel);
        }
    }
}
