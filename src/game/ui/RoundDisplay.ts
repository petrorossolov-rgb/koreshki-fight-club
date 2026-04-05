import { Scene, GameObjects } from 'phaser';
import { STAGE_WIDTH, ROUNDS_TO_WIN } from '@shared/constants';
import { RoundPhase } from '@shared/types';

const TIMER_Y = 16;
const DOT_Y = 50;
const DOT_RADIUS = 6;
const DOT_GAP = 16;
const TIMER_DANGER_THRESHOLD = 10;

export class RoundDisplay {
    private timerText: GameObjects.Text;
    private dots: GameObjects.Arc[][] = [[], []]; // [player][dotIndex]
    private announcement: GameObjects.Text;
    private lastPhase: RoundPhase | null = null;
    private timerPulseTween: Phaser.Tweens.Tween | null = null;
    private isDangerMode = false;

    constructor(scene: Scene) {
        // Timer — centered at top with shadow
        this.timerText = scene.add.text(STAGE_WIDTH / 2, TIMER_Y, '99', {
            fontFamily: 'Arial Black',
            fontSize: '36px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 6,
            shadow: { offsetX: 2, offsetY: 2, color: '#000000', blur: 4, fill: true },
        }).setOrigin(0.5, 0).setDepth(100);

        // Round win dots — 2 per player (ROUNDS_TO_WIN)
        for (let p = 0; p < 2; p++) {
            for (let d = 0; d < ROUNDS_TO_WIN; d++) {
                const offsetX = p === 0
                    ? STAGE_WIDTH / 2 - 40 - d * DOT_GAP
                    : STAGE_WIDTH / 2 + 40 + d * DOT_GAP;

                const dot = scene.add.circle(offsetX, DOT_Y, DOT_RADIUS, 0x555555)
                    .setStrokeStyle(2, 0xffffff)
                    .setDepth(100);
                this.dots[p].push(dot);
            }
        }

        // Announcement text (FIGHT! / KO!) with strong outline
        this.announcement = scene.add.text(STAGE_WIDTH / 2, 200, '', {
            fontFamily: 'Arial Black',
            fontSize: '72px',
            color: '#ffcc00',
            stroke: '#000000',
            strokeThickness: 8,
            shadow: { offsetX: 3, offsetY: 3, color: '#000000', blur: 6, fill: true },
        }).setOrigin(0.5).setDepth(200).setAlpha(0);

        this.lastPhase = null;
    }

    update(
        scene: Scene,
        roundTimer: number,
        roundPhase: RoundPhase,
        roundWins: [number, number],
    ): void {
        // Timer display
        this.timerText.setText(String(Math.max(0, Math.ceil(roundTimer))));

        // Timer danger pulse when < 10 seconds
        const inDanger = roundTimer > 0 && roundTimer <= TIMER_DANGER_THRESHOLD && roundPhase === RoundPhase.Fight;
        if (inDanger && !this.isDangerMode) {
            this.isDangerMode = true;
            this.timerPulseTween = scene.tweens.add({
                targets: this.timerText,
                alpha: { from: 1, to: 0.4 },
                duration: 400,
                yoyo: true,
                repeat: -1,
                onUpdate: () => {
                    // Lerp color between white and red based on alpha
                    const a = this.timerText.alpha;
                    this.timerText.setColor(a > 0.7 ? '#ff3333' : '#ff0000');
                },
            });
        } else if (!inDanger && this.isDangerMode) {
            this.isDangerMode = false;
            if (this.timerPulseTween) {
                this.timerPulseTween.destroy();
                this.timerPulseTween = null;
            }
            this.timerText.setAlpha(1);
            this.timerText.setColor('#ffffff');
        }

        // Dot fills
        for (let p = 0; p < 2; p++) {
            for (let d = 0; d < ROUNDS_TO_WIN; d++) {
                this.dots[p][d].fillColor = d < roundWins[p] ? 0xffcc00 : 0x555555;
            }
        }

        // Phase announcements (trigger once per phase transition)
        if (roundPhase !== this.lastPhase) {
            this.lastPhase = roundPhase;

            if (roundPhase === RoundPhase.Fight) {
                this.showAnnouncement(scene, 'FIGHT!');
            } else if (roundPhase === RoundPhase.KO) {
                this.showAnnouncement(scene, 'K.O.!');
            }
        }
    }

    private showAnnouncement(scene: Scene, text: string): void {
        this.announcement.setText(text);
        this.announcement.setScale(0.3).setAlpha(1);

        scene.tweens.add({
            targets: this.announcement,
            scaleX: 1,
            scaleY: 1,
            duration: 300,
            ease: 'Back.easeOut',
            onComplete: () => {
                scene.tweens.add({
                    targets: this.announcement,
                    alpha: 0,
                    delay: 600,
                    duration: 300,
                });
            },
        });
    }
}
