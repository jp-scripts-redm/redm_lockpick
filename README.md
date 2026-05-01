# lockpick

A RedM lockpick minigame resource. Mouse to position the pin, WASD or arrow keys to turn the cylinder. Features a health bar, per-pin dot counter, proximity glow when you're near the sweet spot, and ESC to cancel.

Free release — grab it, use it, modify it.

---

## Credits

UI mechanic based on [antoxa-kms's CodePen](https://codepen.io/antoxa-kms/pen/qbqoMy), itself forked from [Teo Litto's original](https://codepen.io/teolitto/pen/vLEEbY).  
RedM NUI integration, difficulty system, health bar HUD, proximity glow, ESC handling, and difficulty presets by [JP Scripts](https://jp-scripts-shop.tebex.io/).

---

## Installation

1. Drop the `lockpick` folder into your server's `resources` directory.
2. Add `ensure lockpick` to your `server.cfg`.
3. That's it — no dependencies, no framework required.

> **Note:** This resource is built for RedM (`game "rdr3"`). For FiveM, change `game "rdr3"` to `game "gta5"` in `fxmanifest.lua` and remove the `rdr3_warning` line.

---

## Usage

The resource exposes a single export: `lockpick(difficulty)`.

It **blocks until the player succeeds or fails**, then returns `true` or `false`. That means you can drop it directly into any existing logic without callbacks or events.

```lua
local result = exports['lockpick']:lockpick("normal")

if result then
    -- player picked the lock
else
    -- player failed or pressed ESC
end
```

---

## Difficulty

Pass either a preset string or a custom settings table.

### Presets

| Preset   | Sweet Spot | Pin Damage | Pins | Lock Tolerance | Damage Interval |
|----------|-----------|------------|------|----------------|-----------------|
| `"easy"` | Wide (15) | Low (5)    | 5    | Forgiving (50) | Slow (300ms)    |
| `"normal"`| Medium (10)| Medium (10)| 3   | Medium (45)    | Medium (200ms)  |
| `"hard"` | Narrow (5) | High (20)  | 2    | Tight (40)     | Fast (150ms)    |

```lua
exports['lockpick']:lockpick("easy")
exports['lockpick']:lockpick("normal")
exports['lockpick']:lockpick("hard")
```

### Custom Table

You can override any individual value. Omitted values fall back to whatever is currently set in `script.js`.

```lua
exports['lockpick']:lockpick({
    solvePadding      = 8,   -- degrees of forgiveness around the sweet spot (higher = easier)
    pinDamage         = 15,  -- health lost per damage tick (higher = pins break faster)
    numPins           = 4,   -- how many pins the player gets
    maxDistFromSolve  = 42,  -- how far off you can be before the cylinder stops turning (lower = stricter)
    pinDamageInterval = 175  -- milliseconds between damage ticks when forcing (lower = faster damage)
})
```

---

## Integrating with syn_robbery (or any other resource)

Because `lockpick()` is a blocking export that returns a boolean, it slots into any robbery script wherever you'd normally check a skill check or minigame result.

Here's a generic pattern for syn_robbery door/safe interactions:

```lua
-- Wherever syn_robbery triggers its interaction (e.g. a target callback or zone enter):

local success = exports['lockpick']:lockpick("hard")

if success then
    -- trigger whatever syn_robbery expects on a successful pick
    -- e.g. open the door, start the loot sequence, fire a server event
    TriggerServerEvent('syn_robbery:server:unlockDoor', doorId)
else
    -- optional: break the lockpick item, play a fail sound, etc.
    TriggerEvent('syn_robbery:client:lockpickFailed')
end
```

If syn_robbery (or whichever script) uses a progress bar or skill check you want to **replace**, just swap out that check with the export call above. Since it blocks synchronously on the client, the rest of the script's logic won't run until the player finishes the minigame.

---

## Parameter Reference

| Parameter | Type | Description |
|---|---|---|
| `solvePadding` | number | Degrees of arc considered the "sweet spot". Higher = more forgiving. |
| `maxDistFromSolve` | number | Max degrees away from sweet spot before the cylinder won't turn at all. Lower = stricter. |
| `pinDamage` | number | Health lost per damage tick when forcing the cylinder. |
| `numPins` | number | Number of pins (lives) the player starts with. |
| `pinDamageInterval` | number | Milliseconds between damage ticks. Lower = pins break faster. |

---

## Controls

| Input | Action |
|---|---|
| Mouse left/right | Rotate the lockpick |
| WASD / ← → | Turn the cylinder |
| ESC | Cancel (counts as failure) |

---

## License

Free to use and modify. If you redistribute or build on it, please keep the credits above intact.
