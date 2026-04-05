import nipplejs from 'nipplejs';
import { InputBit } from '@shared/types';

const BUTTON_SIZE = 56;    // px, >= 48px touch target
const BUTTON_GAP = 12;

/**
 * DOM-overlay touch controls: nipplejs joystick (left) + attack buttons (right).
 * Only instantiated on touch devices.
 */
export class TouchControls {
    private joystickBits = 0;
    private buttonBits = 0;
    private container!: HTMLDivElement;
    private manager!: ReturnType<typeof nipplejs.create>;
    private buttons: HTMLButtonElement[] = [];

    constructor() {
        this.createContainer();
        this.createJoystick();
        this.createButtons();
    }

    /** Read packed InputBit flags from current touch state. */
    readBits(): number {
        return this.joystickBits | this.buttonBits;
    }

    /** Remove DOM elements and listeners. */
    destroy(): void {
        this.manager.destroy();
        this.container.remove();
    }

    // ── Joystick (left side) ────────────────────────────────────────

    private createContainer(): void {
        this.container = document.createElement('div');
        this.container.id = 'touch-controls';
        this.container.style.cssText =
            'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:10;';
        document.body.appendChild(this.container);
    }

    private createJoystick(): void {
        const zone = document.createElement('div');
        zone.style.cssText =
            'position:absolute;left:0;top:0;width:40%;height:100%;pointer-events:auto;';
        this.container.appendChild(zone);

        this.manager = nipplejs.create({
            zone,
            mode: 'semi',
            catchDistance: 150,
            size: 120,
            color: 'rgba(255,255,255,0.35)',
            position: { left: '80px', bottom: '80px' },
        });

        this.manager.on('move', (evt) => {
            const data = evt.data;
            let bits = 0;
            if (data.direction) {
                if (data.direction.x === 'left') bits |= InputBit.LEFT;
                if (data.direction.x === 'right') bits |= InputBit.RIGHT;
                if (data.direction.y === 'up') bits |= InputBit.UP;
                if (data.direction.y === 'down') bits |= InputBit.DOWN;
            }
            this.joystickBits = bits;
        });

        this.manager.on('end', () => {
            this.joystickBits = 0;
        });
    }

    // ── Attack buttons (right side) ─────────────────────────────────

    private createButtons(): void {
        const btnDefs: Array<{ label: string; bit: number; col: number; row: number }> = [
            { label: 'P', bit: InputBit.PUNCH, col: 0, row: 0 },
            { label: 'K', bit: InputBit.KICK, col: 1, row: 0 },
            { label: 'P+K', bit: InputBit.PUNCH | InputBit.KICK, col: 0, row: 1 },
            { label: '\u2193', bit: InputBit.DOWN, col: 1, row: 1 },
        ];

        const wrapper = document.createElement('div');
        wrapper.style.cssText =
            'position:absolute;right:16px;bottom:24px;pointer-events:auto;' +
            'display:grid;grid-template-columns:repeat(2,1fr);gap:' + BUTTON_GAP + 'px;';
        this.container.appendChild(wrapper);

        for (const def of btnDefs) {
            const btn = document.createElement('button');
            btn.textContent = def.label;
            btn.style.cssText =
                `width:${BUTTON_SIZE}px;height:${BUTTON_SIZE}px;border-radius:50%;` +
                'border:2px solid rgba(255,255,255,0.5);background:rgba(255,255,255,0.15);' +
                'color:#fff;font-size:16px;font-weight:bold;touch-action:none;' +
                'user-select:none;-webkit-user-select:none;outline:none;' +
                'pointer-events:auto;';

            btn.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                this.buttonBits |= def.bit;
                btn.style.background = 'rgba(255,255,255,0.4)';
            }, { passive: false });

            btn.addEventListener('pointerup', (e) => {
                e.preventDefault();
                this.buttonBits &= ~def.bit;
                btn.style.background = 'rgba(255,255,255,0.15)';
            }, { passive: false });

            btn.addEventListener('pointercancel', () => {
                this.buttonBits &= ~def.bit;
                btn.style.background = 'rgba(255,255,255,0.15)';
            });

            wrapper.appendChild(btn);
            this.buttons.push(btn);
        }
    }
}

/** Returns true if the device supports touch. */
export function isTouchDevice(): boolean {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}
