import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    JOINTS,
    ANIMATIONS,
    ANIM_ROWS,
    SIZE_CATEGORIES,
    interpolatePose,
    generateAnimFrames,
    scalePose,
    generateScaledAnimFrames,
} from '../../gen-sprites.mjs';

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
