import { Scene } from 'phaser';

export class Preloader extends Scene
{
    constructor ()
    {
        super('Preloader');
    }

    init ()
    {
        //  We loaded this image in our Boot Scene, so we can display it here
        this.add.image(512, 288, 'background');

        //  A simple progress bar. This is the outline of the bar.
        this.add.rectangle(512, 288, 468, 32).setStrokeStyle(1, 0xffffff);

        //  This is the progress bar itself. It will increase in size from the left based on the % of progress.
        const bar = this.add.rectangle(512-230, 288, 4, 28, 0xffffff);

        //  Use the 'progress' event emitted by the LoaderPlugin to update the loading bar
        this.load.on('progress', (progress: number) => {

            //  Update the progress bar (our bar is 464px wide, so 100% = 464px)
            bar.width = 4 + (460 * progress);

        });
    }

    preload ()
    {
        // Phase 1: manifest, logo, audio, default config
        this.load.setPath('assets');
        this.load.image('logo', 'logo.png');

        this.load.setPath('assets/audio');
        this.load.audio('bgm_menu', 'bgm_menu.wav');
        this.load.audio('bgm_fight', 'bgm_fight.wav');
        this.load.audio('hit_light', 'hit_light.wav');
        this.load.audio('hit_heavy', 'hit_heavy.wav');
        this.load.audio('block', 'block.wav');
        this.load.audio('ko', 'ko.wav');
        this.load.audio('fight', 'fight.wav');
        this.load.audio('special', 'special.wav');
        this.load.audio('ui_select', 'ui_select.wav');
        this.load.audio('ui_confirm', 'ui_confirm.wav');
        this.load.audio('round_start', 'round_start.wav');

        this.load.setPath('');
        this.load.json('char_manifest', 'data/characters/manifest.json');
        this.load.json('char_default', 'data/characters/default.json');
    }

    create ()
    {
        // Phase 2: read manifest, dynamically load all character spritesheets + portraits
        const manifest = this.cache.json.get('char_manifest') as { characters: Array<{ id: string }> };
        const characters = manifest.characters;

        this.load.setPath('assets/fighters');
        for (const char of characters) {
            this.load.spritesheet(char.id, `${char.id}.png`, {
                frameWidth: 126,
                frameHeight: 126,
            });
            this.load.image(`${char.id}-portrait`, `${char.id}-portrait.png`);
        }
        this.load.setPath('');

        this.load.once('complete', () => {
            this.scene.start('MainMenu');
        });

        this.load.start();
    }
}
