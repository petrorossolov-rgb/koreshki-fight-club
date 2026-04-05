const STORAGE_KEY = 'koreshki_muted';

export class SoundManager {
    private scene: Phaser.Scene;
    private _muted: boolean;
    private currentMusic: Phaser.Sound.BaseSound | null = null;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this._muted = localStorage.getItem(STORAGE_KEY) === '1';
        this.scene.sound.mute = this._muted;
    }

    /** Play a one-shot SFX */
    play(key: string, volume = 1): void {
        this.scene.sound.play(key, { volume });
    }

    /** Play looping background music (stops any previous track) */
    playMusic(key: string, volume = 0.4): void {
        this.stopMusic();
        this.currentMusic = this.scene.sound.add(key, { loop: true, volume });
        this.currentMusic.play();
    }

    /** Stop current background music */
    stopMusic(): void {
        if (this.currentMusic) {
            this.currentMusic.stop();
            this.currentMusic.destroy();
            this.currentMusic = null;
        }
    }

    /** Set mute state and persist to localStorage */
    setMute(muted: boolean): void {
        this._muted = muted;
        this.scene.sound.mute = muted;
        localStorage.setItem(STORAGE_KEY, muted ? '1' : '0');
    }

    /** Toggle mute state. Returns new muted value. */
    toggleMute(): boolean {
        this.setMute(!this._muted);
        return this._muted;
    }

    get isMuted(): boolean {
        return this._muted;
    }

    /** Transfer SoundManager to a new scene (updates internal scene reference) */
    transferTo(scene: Phaser.Scene): void {
        this.scene = scene;
        this.scene.sound.mute = this._muted;
    }
}
