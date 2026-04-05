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

## 5. Phase 3: Combo System

- [ ] Punch → Punch chain connects (2-hit combo)
- [ ] Kick → Punch chain connects
- [ ] Combo counter appears at 2+ hits with hit count and damage
- [ ] Combo counter fades after combo drops
- [ ] Hitstun scaling reduces stun on later hits in a combo
- [ ] Crouch attack works (down + punch/kick)
- [ ] Jump attack works (airborne + punch/kick)

## 6. Phase 3: Special Moves

- [ ] P+K button triggers special move (touch)
- [ ] Special has startup, active, recovery phases
- [ ] Cooldown indicator fills during cooldown period
- [ ] Cooldown indicator flashes green when ready
- [ ] Special cannot be used during cooldown
- [ ] `special_used` event fires (visible in combo counter or server broadcast)

## 7. Phase 3: Audio

- [ ] Audio plays after first touch (autoplay policy respected)
- [ ] Hit SFX on punch/kick landing
- [ ] Block SFX on blocked attack
- [ ] KO SFX on round end
- [ ] Background music loops during fight
- [ ] Mute button toggles all audio (🔊 ↔ 🔇)
- [ ] Mute state persists across page reloads (localStorage)
- [ ] Music stops on scene transition (fight → game over)

## 8. Phase 3: Visual Effects

- [ ] Hit flash on damaged fighter
- [ ] Hit-stop zoom on impact
- [ ] Screen shake on heavy hits
- [ ] Hit spark particles at impact point

## 9. Phase 3: Invite Links

- [ ] Create room → COPY LINK button appears with room code
- [ ] Copied URL format: `https://...?room=ABCD`
- [ ] Open invite link → auto-joins room (no manual code entry)
- [ ] Server `/join/:code` redirect works cross-device
- [ ] URL parameter cleaned from address bar after join

## 10. Phase 3: Auto-Reconnect

- [ ] Disconnect mid-fight → "Переподключение..." overlay shown
- [ ] Reconnect attempt counter visible (e.g., "1/5")
- [ ] Successful reconnect → overlay hides, fight resumes
- [ ] Opponent disconnects → grace period countdown shown
- [ ] Opponent reconnects within grace period → fight resumes
- [ ] All reconnect attempts fail → return to main menu
- [ ] Switch to another app and back (mobile) → auto-reconnect

## Notes

Record any issues found during testing here:

- 
