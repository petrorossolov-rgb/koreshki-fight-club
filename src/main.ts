import StartGame from './game/main';

document.addEventListener('DOMContentLoaded', () => {

    StartGame('game-container');

    // ── iOS Safari: block pinch-to-zoom gestures ────────────────────
    // 'gesturestart' and 'gesturechange' are non-standard Safari events
    // that fire on pinch/rotate even when touch-action CSS is set.
    for (const evt of ['gesturestart', 'gesturechange'] as const) {
        document.addEventListener(evt, (e) => e.preventDefault(), { passive: false } as EventListenerOptions);
    }

    // ── Portrait fullscreen button (inside portrait-warning overlay) ─
    const portraitFsBtn = document.getElementById('portrait-fs-btn');
    if (portraitFsBtn) {
        portraitFsBtn.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            const el = document.documentElement as HTMLElement & { webkitRequestFullscreen?(): Promise<void> };
            (el.requestFullscreen?.() ?? el.webkitRequestFullscreen?.())?.catch(() => {});
            try {
                const orientation = screen.orientation as ScreenOrientation & { lock?(type: string): Promise<void> };
                orientation.lock?.('landscape')?.catch(() => {});
            } catch { /* not supported */ }
        });
    }

    // ── Fullscreen exit button (DOM overlay) ────────────────────────
    const fsBtn = document.getElementById('fs-exit-btn');
    if (fsBtn) {
        const updateVisibility = () => {
            const doc = document as Document & { webkitFullscreenElement?: Element };
            const isFs = !!(doc.fullscreenElement || doc.webkitFullscreenElement);
            fsBtn.style.display = isFs ? 'block' : 'none';
        };

        fsBtn.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const exitDoc = document as Document & { webkitExitFullscreen?(): Promise<void> };
            (exitDoc.exitFullscreen?.() ?? exitDoc.webkitExitFullscreen?.())?.catch(() => {});
        });

        document.addEventListener('fullscreenchange', updateVisibility);
        document.addEventListener('webkitfullscreenchange', updateVisibility);
        updateVisibility();
    }
});