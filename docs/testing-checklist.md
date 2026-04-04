# End-to-End Testing Checklist

Manual testing checklist for verifying the full game loop on real devices.

## Prerequisites

- [ ] Client deployed to GitHub Pages (or local `npm run dev`)
- [ ] Server deployed to Deno Deploy (or local `deno run ... server/main.ts`)
- [ ] Two test devices (phones or phone + desktop)

## 1. Local Mode (single device)

- [ ] Open game URL in mobile browser
- [ ] Portrait warning shown, landscape works
- [ ] FULLSCREEN button works on mobile
- [ ] Tap LOCAL — fight scene loads
- [ ] Touch joystick moves P1 fighter (left/right/jump/crouch)
- [ ] Attack buttons trigger punch/kick animations
- [ ] P2 controlled via second set of touch buttons or keyboard
- [ ] HP bars update on hit
- [ ] Timer counts down from 99
- [ ] Round announcements show ("FIGHT!", "KO!")
- [ ] Round dots fill on round win
- [ ] Match ends after 2 round wins → GameOver screen
- [ ] REMATCH returns to fight
- [ ] MENU returns to main menu

## 2. Online Mode (two devices)

### Connection

- [ ] Device A: ONLINE → CREATE ROOM → 4-letter code displayed
- [ ] Device B: ONLINE → JOIN ROOM → enter code → connected
- [ ] Both see "Waiting for opponent..." / room status
- [ ] Both tap READY → fight starts

### Gameplay

- [ ] Both fighters visible and responsive on both screens
- [ ] Local input feels responsive (< 100ms perceived delay)
- [ ] Opponent movements are smooth (no teleporting)
- [ ] Hits register correctly on both screens
- [ ] HP bars sync between clients
- [ ] Timer syncs between clients
- [ ] Round transitions work (KO → next round → match end)

### Edge cases

- [ ] One player disconnects → other returns to menu (or error shown)
- [ ] Invalid room code → error message shown
- [ ] Server restart → clients handle reconnect gracefully (or show error)
- [ ] 5-minute continuous session with no crashes or freezes

## 3. Cross-device matrix

| Device A | Device B | Result |
|---|---|---|
| Phone (Chrome Android) | Phone (Chrome Android) | |
| Phone (Safari iOS) | Phone (Safari iOS) | |
| Phone (Chrome Android) | Desktop (Chrome) | |
| Phone (Safari iOS) | Desktop (Firefox) | |

## 4. Performance

- [ ] No visible frame drops during combat
- [ ] Touch controls responsive (no missed inputs)
- [ ] Memory usage stable over 5-minute session (no leaks)
- [ ] Network traffic reasonable (~20 state updates/sec)

## Notes

Record any issues found during testing here:

- 
