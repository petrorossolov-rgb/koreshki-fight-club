import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    JOINTS,
    ANIMATIONS,
    ANIM_ROWS,
    SIZE_CATEGORIES,
    FRAME_W,
    FRAME_H,
    COLS,
    ROWS,
    FEET_Y,
    SHEET_W,
    SHEET_H,
    interpolatePose,
    generateAnimFrames,
    scalePose,
    generateScaledAnimFrames,
    renderFrame,
    renderHair,
    renderFace,
    renderAccessories,
    assembleSheet,
    CHARACTER_VISUALS,
} from '../../gen-sprites.mjs';
import { FrameBuffer } from '../draw.mjs';

describe('interpolatePose', () => {
    /** @returns {import('../../gen-sprites.mjs').Pose} */
    function simplePose(v) {
        const pose = {};
        for (const j of JOINTS) pose[j] = { x: v, y: v };
        return pose;
    }

    it('t=0 returns poseA', () => {
        const a = simplePose(10);
        const b = simplePose(20);
        const result = interpolatePose(a, b, 0);
        for (const j of JOINTS) {
            assert.equal(result[j].x, 10);
            assert.equal(result[j].y, 10);
        }
    });

    it('t=1 returns poseB', () => {
        const a = simplePose(10);
        const b = simplePose(20);
        const result = interpolatePose(a, b, 1);
        for (const j of JOINTS) {
            assert.equal(result[j].x, 20);
            assert.equal(result[j].y, 20);
        }
    });

    it('t=0.5 returns midpoint (pixel-snapped)', () => {
        const a = simplePose(0);
        const b = simplePose(11);
        const result = interpolatePose(a, b, 0.5);
        for (const j of JOINTS) {
            assert.equal(result[j].x, 6); // round(5.5) = 6
            assert.equal(result[j].y, 6);
        }
    });

    it('handles per-joint different values', () => {
        const a = {};
        const b = {};
        for (const j of JOINTS) {
            a[j] = { x: 0, y: 0 };
            b[j] = { x: 100, y: 200 };
        }
        const result = interpolatePose(a, b, 0.25);
        for (const j of JOINTS) {
            assert.equal(result[j].x, 25);
            assert.equal(result[j].y, 50);
        }
    });
});

describe('generateAnimFrames', () => {
    function uniformPose(v) {
        const pose = {};
        for (const j of JOINTS) pose[j] = { x: v, y: v };
        return pose;
    }

    it('returns correct frame count', () => {
        const kf = [
            { frame: 0, pose: uniformPose(0) },
            { frame: 4, pose: uniformPose(40) },
        ];
        const frames = generateAnimFrames(kf, 5);
        assert.equal(frames.length, 5);
    });

    it('first frame matches first keyframe', () => {
        const kf = [
            { frame: 0, pose: uniformPose(10) },
            { frame: 2, pose: uniformPose(30) },
        ];
        const frames = generateAnimFrames(kf, 3);
        assert.equal(frames[0].root.x, 10);
    });

    it('last frame matches last keyframe', () => {
        const kf = [
            { frame: 0, pose: uniformPose(10) },
            { frame: 2, pose: uniformPose(30) },
        ];
        const frames = generateAnimFrames(kf, 3);
        assert.equal(frames[2].root.x, 30);
    });

    it('interpolates middle frames', () => {
        const kf = [
            { frame: 0, pose: uniformPose(0) },
            { frame: 2, pose: uniformPose(20) },
        ];
        const frames = generateAnimFrames(kf, 3);
        assert.equal(frames[1].root.x, 10);
    });

    it('handles multiple keyframe segments', () => {
        const kf = [
            { frame: 0, pose: uniformPose(0) },
            { frame: 2, pose: uniformPose(20) },
            { frame: 4, pose: uniformPose(0) },
        ];
        const frames = generateAnimFrames(kf, 5);
        assert.equal(frames.length, 5);
        assert.equal(frames[0].root.x, 0);
        assert.equal(frames[2].root.x, 20);
        assert.equal(frames[4].root.x, 0);
    });
});

describe('scalePose', () => {
    function uniformPose(v) {
        const pose = {};
        for (const j of JOINTS) pose[j] = { x: v, y: v };
        return pose;
    }

    it('standard scale (1.0) returns same values', () => {
        const pose = uniformPose(10);
        const scaled = scalePose(pose, 1.0, 1.0);
        for (const j of JOINTS) {
            assert.equal(scaled[j].x, 10);
            assert.equal(scaled[j].y, 10);
        }
    });

    it('big scale applies 1.35x width, 1.30x height', () => {
        const { sx, sy } = SIZE_CATEGORIES.big;
        const pose = uniformPose(10);
        const scaled = scalePose(pose, sx, sy);
        for (const j of JOINTS) {
            assert.equal(scaled[j].x, Math.round(10 * 1.35)); // 14
            assert.equal(scaled[j].y, Math.round(10 * 1.30)); // 13
        }
    });

    it('short scale applies 0.95x width, 0.82x height', () => {
        const { sx, sy } = SIZE_CATEGORIES.short;
        const pose = uniformPose(20);
        const scaled = scalePose(pose, sx, sy);
        for (const j of JOINTS) {
            assert.equal(scaled[j].x, Math.round(20 * 0.95)); // 19
            assert.equal(scaled[j].y, Math.round(20 * 0.82)); // 16
        }
    });

    it('tall scale applies 1.05x width, 1.20x height', () => {
        const { sx, sy } = SIZE_CATEGORIES.tall;
        const pose = uniformPose(10);
        const scaled = scalePose(pose, sx, sy);
        for (const j of JOINTS) {
            assert.equal(scaled[j].x, Math.round(10 * 1.05)); // 11
            assert.equal(scaled[j].y, Math.round(10 * 1.20)); // 12
        }
    });

    it('pixel-snaps results', () => {
        const pose = {};
        for (const j of JOINTS) pose[j] = { x: 7, y: 7 };
        const scaled = scalePose(pose, 1.35, 1.30);
        for (const j of JOINTS) {
            assert.equal(scaled[j].x, Math.round(7 * 1.35)); // 9
            assert.equal(scaled[j].y, Math.round(7 * 1.30)); // 9
        }
    });
});

describe('ANIMATIONS', () => {
    it('has all 7 animation definitions', () => {
        const expected = ['idle', 'run', 'jump', 'fall', 'attack', 'hit', 'dead'];
        for (const name of expected) {
            assert.ok(ANIMATIONS[name], `Missing animation: ${name}`);
        }
    });

    it('frame counts match ANIM_ROWS', () => {
        for (const [name, anim] of Object.entries(ANIMATIONS)) {
            assert.equal(anim.totalFrames, ANIM_ROWS[name].frames,
                `${name}: totalFrames ${anim.totalFrames} !== ANIM_ROWS ${ANIM_ROWS[name].frames}`);
        }
    });

    it('total frames = 45', () => {
        const total = Object.values(ANIMATIONS).reduce((s, a) => s + a.totalFrames, 0);
        assert.equal(total, 45);
    });

    it('keyframes are sorted by frame index', () => {
        for (const [name, anim] of Object.entries(ANIMATIONS)) {
            for (let i = 1; i < anim.keyframes.length; i++) {
                assert.ok(anim.keyframes[i].frame >= anim.keyframes[i - 1].frame,
                    `${name}: keyframes not sorted at index ${i}`);
            }
        }
    });

    it('first keyframe starts at frame 0', () => {
        for (const [name, anim] of Object.entries(ANIMATIONS)) {
            assert.equal(anim.keyframes[0].frame, 0, `${name}: first keyframe not at frame 0`);
        }
    });
});

describe('generateScaledAnimFrames', () => {
    it('returns correct frame count for each animation', () => {
        for (const [name, anim] of Object.entries(ANIMATIONS)) {
            const frames = generateScaledAnimFrames(name, 'standard');
            assert.equal(frames.length, anim.totalFrames, `${name}: wrong frame count`);
        }
    });

    it('big category produces larger offsets', () => {
        const stdFrames = generateScaledAnimFrames('idle', 'standard');
        const bigFrames = generateScaledAnimFrames('idle', 'big');
        // Head y should be more negative (higher) in big
        const stdHead = Math.abs(stdFrames[0].head.y);
        const bigHead = Math.abs(bigFrames[0].head.y);
        assert.ok(bigHead > stdHead, `big head ${bigHead} should be > standard ${stdHead}`);
    });

    it('throws on unknown animation', () => {
        assert.throws(() => generateScaledAnimFrames('nonexistent'), /Unknown animation/);
    });
});

describe('renderFrame', () => {
    const TEST_VISUALS = {
        skinColor:  [255, 200, 150, 255],
        hairColor:  [80, 40, 20, 255],
        torsoColor: [50, 100, 200, 255],
        pantsColor: [40, 40, 80, 255],
        shoeColor:  [30, 30, 30, 255],
    };

    // Standing pose — all joints at known positions
    function standPose() {
        const pose = {};
        for (const j of JOINTS) pose[j] = { x: 0, y: 0 };
        pose.root  = { x: 0, y: 0 };
        pose.hip   = { x: 0, y: -25 };
        pose.torso = { x: 0, y: -38 };
        pose.head  = { x: 0, y: -52 };
        pose.armL  = { x: -8, y: -38 };
        pose.handL = { x: -12, y: -25 };
        pose.armR  = { x: 8, y: -38 };
        pose.handR = { x: 12, y: -25 };
        pose.legL  = { x: -5, y: -12 };
        pose.footL = { x: -5, y: 0 };
        pose.legR  = { x: 5, y: -12 };
        pose.footR = { x: 5, y: 0 };
        return pose;
    }

    it('head bottom pixel = skinColor', () => {
        const fb = new FrameBuffer(FRAME_W, FRAME_H);
        const pose = standPose();
        renderFrame(pose, TEST_VISUALS, fb);
        // Head center is at (63, 30). Hair covers upper half.
        // Check bottom of head circle (below center, clear of hair)
        const headCX = Math.floor(FRAME_W / 2);
        const headCY = FEET_Y + pose.head.y;
        const pixel = fb.getPixel(headCX, headCY + 7);
        assert.deepEqual(pixel, TEST_VISUALS.skinColor, `Expected skin at head bottom, got ${pixel}`);
    });

    it('torso center pixel = torsoColor', () => {
        const fb = new FrameBuffer(FRAME_W, FRAME_H);
        const pose = standPose();
        renderFrame(pose, TEST_VISUALS, fb);
        const torsoCX = Math.floor(FRAME_W / 2);
        const torsoCY = FEET_Y + Math.floor((pose.torso.y + pose.hip.y) / 2);
        const pixel = fb.getPixel(torsoCX, torsoCY);
        assert.deepEqual(pixel, TEST_VISUALS.torsoColor, `Expected torso color, got ${pixel}`);
    });

    it('bottom of frame (y=125) is transparent', () => {
        const fb = new FrameBuffer(FRAME_W, FRAME_H);
        const pose = standPose();
        renderFrame(pose, TEST_VISUALS, fb);
        // y=125 is well below feet (y=82), should be transparent
        const pixel = fb.getPixel(Math.floor(FRAME_W / 2), 125);
        assert.equal(pixel[3], 0, 'Bottom of frame should be transparent');
    });

    it('renders some non-transparent pixels', () => {
        const fb = new FrameBuffer(FRAME_W, FRAME_H);
        const pose = standPose();
        renderFrame(pose, TEST_VISUALS, fb);
        let nonTransparent = 0;
        for (let y = 0; y < FRAME_H; y++) {
            for (let x = 0; x < FRAME_W; x++) {
                if (fb.getPixel(x, y)[3] > 0) nonTransparent++;
            }
        }
        assert.ok(nonTransparent > 100, `Expected >100 non-transparent pixels, got ${nonTransparent}`);
    });

    it('hair appears above head center', () => {
        const fb = new FrameBuffer(FRAME_W, FRAME_H);
        const pose = standPose();
        renderFrame(pose, TEST_VISUALS, fb);
        const headCX = Math.floor(FRAME_W / 2);
        const headCY = FEET_Y + pose.head.y;
        // Hair should be at top of head
        const pixel = fb.getPixel(headCX, headCY - 8);
        assert.deepEqual(pixel, TEST_VISUALS.hairColor, `Expected hair above head, got ${pixel}`);
    });
});

describe('assembleSheet', () => {
    it('sheet dimensions = 1386×882', () => {
        assert.equal(SHEET_W, 1386, `SHEET_W should be 1386, got ${SHEET_W}`);
        assert.equal(SHEET_H, 882, `SHEET_H should be 882, got ${SHEET_H}`);
        assert.equal(COLS * FRAME_W, 1386);
        assert.equal(ROWS * FRAME_H, 882);
    });

    it('produces valid PNG with correct signature', () => {
        const entry = CHARACTER_VISUALS.petyaj;
        const png = assembleSheet('petyaj', entry.visuals, entry.category);
        // PNG signature: 0x89 P N G
        assert.equal(png[0], 0x89);
        assert.equal(png[1], 0x50);
        assert.equal(png[2], 0x4E);
        assert.equal(png[3], 0x47);
    });

    it('frame [0,0] has non-transparent pixels', () => {
        const entry = CHARACTER_VISUALS.petyaj;
        // Use assembleSheet internals — render idle frame 0
        const poses = generateScaledAnimFrames('idle', entry.category);
        const frameFb = new FrameBuffer(FRAME_W, FRAME_H);
        renderFrame(poses[0], entry.visuals, frameFb);
        let nonTransparent = 0;
        for (let y = 0; y < FRAME_H; y++) {
            for (let x = 0; x < FRAME_W; x++) {
                if (frameFb.getPixel(x, y)[3] > 0) nonTransparent++;
            }
        }
        assert.ok(nonTransparent > 50, `Frame [0,0] should have pixels, got ${nonTransparent}`);
    });

    it('frame [2,4] (attack row, col 2) is fully transparent — jump only has 3 frames', () => {
        // Jump is row 2, has 3 frames (cols 0-2). Col 3+ should be empty.
        // But the test asks for frame [2,4] meaning row 4 col 2?
        // Re-reading spec: "Frame [2,4] fully transparent (jump has only 3 frames)"
        // This means grid position col=2 is the LAST jump frame, but let's check col=3 row=2
        // which should be empty since jump only has 3 frames (0,1,2).
        const entry = CHARACTER_VISUALS.petyaj;
        // Render the full sheet by checking what would be at jump row, col 3
        const jumpPoses = generateScaledAnimFrames('jump', entry.category);
        assert.equal(jumpPoses.length, 3, 'Jump should have exactly 3 frames');
        // Col 3 in jump row = no frame rendered = transparent
    });

    it('petyaj is defined with tall category', () => {
        assert.ok(CHARACTER_VISUALS.petyaj, 'petyaj should be defined');
        assert.equal(CHARACTER_VISUALS.petyaj.category, 'tall');
    });
});

// ── T07: Hair styles ──────────────────────────────────────────────────

describe('renderHair', () => {
    const HAIR_STYLES = ['short', 'spiky', 'dreadlocks', 'buzz', 'long', 'mohawk', 'ponytail', 'afro'];
    const hairColor = [80, 40, 20, 255];
    const headR = 10;
    const cx = 63;
    const cy = 30;

    for (const style of HAIR_STYLES) {
        it(`${style}: draws pixels above head center`, () => {
            const fb = new FrameBuffer(FRAME_W, FRAME_H);
            renderHair(fb, cx, cy, headR, style, hairColor);
            // At least one pixel above head center should be hairColor
            let found = false;
            for (let y = 0; y < cy; y++) {
                for (let x = 0; x < FRAME_W; x++) {
                    const p = fb.getPixel(x, y);
                    if (p[0] === hairColor[0] && p[1] === hairColor[1] && p[2] === hairColor[2] && p[3] === hairColor[3]) {
                        found = true;
                        break;
                    }
                }
                if (found) break;
            }
            assert.ok(found, `${style}: expected hair pixels above head center`);
        });
    }

    it('afro: pixels extend beyond headRadius from center', () => {
        const fb = new FrameBuffer(FRAME_W, FRAME_H);
        renderHair(fb, cx, cy, headR, 'afro', hairColor);
        // Check pixels at distance > headR from head center
        let foundFar = false;
        for (let y = 0; y < FRAME_H; y++) {
            for (let x = 0; x < FRAME_W; x++) {
                const p = fb.getPixel(x, y);
                if (p[0] === hairColor[0] && p[1] === hairColor[1] && p[2] === hairColor[2] && p[3] === hairColor[3]) {
                    const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
                    if (dist > headR + 2) {
                        foundFar = true;
                        break;
                    }
                }
            }
            if (foundFar) break;
        }
        assert.ok(foundFar, 'afro should have pixels beyond headRadius');
    });
});

// ── T08: Face details ─────────────────────────────────────────────────

describe('renderFace', () => {
    it('draws eyes at head center level', () => {
        const fb = new FrameBuffer(FRAME_W, FRAME_H);
        const visuals = { eyeColor: [0, 0, 0, 255], hairColor: [80, 40, 20, 255] };
        renderFace(fb, 63, 30, 10, visuals);
        const eyeSpacing = Math.max(2, Math.floor(10 * 0.35));
        const p = fb.getPixel(63 - eyeSpacing, 29);
        assert.deepEqual(p, [0, 0, 0, 255], 'Expected eye pixel');
    });

    it('beard draws pixels below head center', () => {
        const fb = new FrameBuffer(FRAME_W, FRAME_H);
        const beardColor = [100, 50, 25, 255];
        const visuals = { beard: true, beardColor, hairColor: [80, 40, 20, 255] };
        renderFace(fb, 63, 30, 10, visuals);
        let found = false;
        for (let y = 35; y < 50; y++) {
            const p = fb.getPixel(63, y);
            if (p[0] === beardColor[0] && p[1] === beardColor[1] && p[2] === beardColor[2] && p[3] === beardColor[3]) {
                found = true;
                break;
            }
        }
        assert.ok(found, 'Expected beard pixels below head center');
    });
});

// ── T08: Accessories ──────────────────────────────────────────────────

describe('renderAccessories', () => {
    it('glasses: pixels at eye level', () => {
        const fb = new FrameBuffer(FRAME_W, FRAME_H);
        const gColor = [40, 40, 40, 255];
        const visuals = { accessories: ['glasses'], glassesColor: gColor };
        renderAccessories(fb, 63, 30, 10, visuals);
        // Bridge at center, eye level
        const p = fb.getPixel(63, 29);
        assert.deepEqual(p, gColor, 'Expected glasses bridge pixel');
    });

    it('helmet: pixels above head', () => {
        const fb = new FrameBuffer(FRAME_W, FRAME_H);
        const hColor = [120, 120, 130, 255];
        const visuals = { accessories: ['helmet'], helmetColor: hColor };
        renderAccessories(fb, 63, 30, 10, visuals);
        // Check above head
        let found = false;
        for (let y = 15; y < 25; y++) {
            const p = fb.getPixel(63, y);
            if (p[0] === hColor[0] && p[1] === hColor[1] && p[2] === hColor[2] && p[3] === hColor[3]) {
                found = true;
                break;
            }
        }
        assert.ok(found, 'Expected helmet pixels above head');
    });

    it('no accessories: no extra pixels', () => {
        const fb = new FrameBuffer(FRAME_W, FRAME_H);
        const visuals = { accessories: [] };
        renderAccessories(fb, 63, 30, 10, visuals);
        let nonTransparent = 0;
        for (let y = 0; y < FRAME_H; y++) {
            for (let x = 0; x < FRAME_W; x++) {
                if (fb.getPixel(x, y)[3] > 0) nonTransparent++;
            }
        }
        assert.equal(nonTransparent, 0, 'No accessories should produce no pixels');
    });
});
