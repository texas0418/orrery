# Orrery — handoff, 2026-08-15

**Live:** https://orrery.simonbuilds.app · **Repo:** github.com/texas0418/orrery
**Deployed build: 196,780 bytes.** Live, disk and the `/orrery` redirect all agree.

---

## 1. State of play

The site is fully working and deployed. The camera problem in §3 is **fixed and
shipped**: `CAM.alt` is now a first-class camera property and every moon system
frames on screen. Nothing is pending in the tree.

### Deploy procedure (every time)
```
rsync -rz --delete -e "ssh -p 18765 -i ~/.ssh/siteground_simonbuilds" \
  public_html/ siteground-simonbuilds:~/www/orrery.simonbuilds.app/public_html/
```
Then **Simon must flush**: Site Tools → Speed → SuperCacher → **Dynamic Cache** →
`orrery.simonbuilds.app`. Claude cannot flush. Until he does, the bare URL serves
the old page while `?cb=$RANDOM` serves the truth — compare both before believing
anything is broken.

DNS moved to Cloudflare on 2026-08-07. Serving is unchanged; only *new subdomains*
now need a manual DNS-only A record to 35.212.97.226 in Cloudflare as well as the
SiteGround subdomain.

---

## 2. What the page is

One HTML file plus 22 surface maps. No framework, no build step, no server, no
analytics. ~77 kB gzipped on the wire; maps load only when you approach a body.

- **Orrery** — 3D perspective camera. 8 planets, Pluto, 4 asteroids, 20 moons.
  Real inclinations, apsides, ecliptic grid. Approach any body for a ray-traced
  lit globe from real spacecraft imagery.
- **Sky** — the same positions as altitude/azimuth for any location on Earth.
  1,637 stars, 89 constellations, the Moon at true angular size, retrograde loops.
- **Coming up** — five-year sweep of oppositions, elongations, close pairings.

### The spine of the project
**It tells the truth, and says so when it can't.** Three bodies were *left out*
rather than shipped wrong: Hygiea (5° off), Mimas (111° off, 2:1 resonance with
Tethys), and the entire JPL satellite mean-element dataset (up to 178° of phase
error). The About page names all three and explains why. Uranus's five moons have
no map because Voyager 2 only ever photographed their southern hemispheres.
**Preserve this. It is the reason the rest is believable.**

The only deliberate exaggeration is body size in Approach, and the panel prints
the live factor (`×16.7 thousand actual size`).

---

## 3. THE CAMERA — solved 2026-08-15, read before touching it

**Symptom (Simon's report):** "There's no orbit for the moon? There is for the
other moons." The orbit *was* drawn — 2,973 px off screen. The Moon orbits at
**59.5 Earth-radii**, Io at **6 Jupiter-radii**, and `CAM.zoom` was controlling
both how much of the compressed solar system was in frame *and* the implied
altitude above the body, via `globeRadius()`. One number cannot do both.

**The fix: `CAM.alt` is now a first-class camera property** — altitude above the
selected body, in that body's own radii, 0 when you are not at one.

- `inApproach()` is `CAM.alt > 1.001`, and is the only test for "at a body".
  `CAM.zoom` no longer decides it.
- `globeRadius()` is `camF() / sqrt(alt² - 1)` — the drawn radius *is* the
  altitude, and `drawCompanions` / `drawMoonOrbits` invert it to recover the
  camera distance. Change one and the other follows for free.
- `frameAlt(b)` is where you arrive: `altFor(systemRadii(b), .62)` for a planet
  with moons — far enough to hold the widest orbit, sampled over a whole
  revolution — or `approachAlt(b)` otherwise. `approachAlt` is 2.61 radii, except
  for Saturn, where the ring outer edge sets it (6.6) or the rings would be cut
  off. `altFor(radii, frac)` = `radii / (frac · tan(HALF_FOV))`.
- Scene zoom during approach is a constant, `APPROACH_SCENE = 60`: enough that
  nothing else is in the cone. It is no longer load-bearing.
- Wheel/pinch scale `alt` when in approach and `zoom` otherwise. Crossing
  `APPROACH_ZOOM` (4) with a body selected hands over to `alt` and eases zoom in;
  passing `exitAlt()` hands back. Entry and exit are 500 ms flights, and exit
  drops zoom to `APPROACH_ZOOM` first so a scroll that carries on through the
  handover carries on out instead of stranding the camera at 60× over nothing.
- `alt` rides in the hash as `h=`. A link from before the split (zoom ≥ 4, no
  `h=`) is converted on read — it meant "at this body", so it lands there.

**Consequences worth knowing before you "improve" any of them:**

- **Fly to** now frames a planet's whole system; **Approach** goes inside it to
  the planet. Two different views, and the About says so.
- Framing Earth's system means Earth is **2.5 px** across. That is not a bug —
  the Moon's orbit is 59.5 radii out, and you cannot have both. Saturn framed by
  Iapetus is the same.
- Below 4 px a globe is drawn in the body's own colour and **its map is never
  fetched** — a megabyte to colour nine pixels. Zoom in and it loads.
- `drawMoons` is now `drawMoonOrbits` and draws *only* paths. The moons
  themselves were always also drawn by `drawCompanions`, in a different
  projection — two labels, and a moon that could sit off its own orbit line.

**Verified:** all 33 bodies flown to, at 1280×720 and 375×812; every outermost
moon lands ~166 px out against a `min(W,H)/2` limit; no unrelated planet in
frame except Pallas from Vesta, which really is in that direction. Entry, exit,
sky round-trip, deselect, old-style links, and the 33-body sweep are in the
session log; there are no tests in the repo to run (see §5.3).

---

## 4. Hard-won facts — do not rediscover these

- **Never call `positionAt()` on something that might be a moon.** It returns a
  moon's position *relative to its planet*, and Earth's Moon has no elements at
  all (it uses `moonGeo`, Schlyter's theory). Always use **`helioOf(b, t)`**.
- **`frame()` wraps drawing in try/catch.** Without it, one exception kills
  `requestAnimationFrame` permanently — a hard lockup on the last drawn frame.
  This guard is what turned an unfindable freeze into a stack trace. **Keep it.**
- **Anything added to `MOONS` must go in before the `for (const m of MOONS)` loop**
  that stamps `moon:true`. Added after = listed but undrawable.
- **Occlusion must use true kilometres, not depth.** Radial compression squashes a
  moon's distance from its planet below the difference in compressed depths, so a
  painter's sort compares rounding noise. And only skip a companion that is *fully*
  covered — Jupiter is bigger than Europa beyond ~15,000 km.
- **Companion placement needs a real perspective projection**, not linear
  pixels-per-km. Jupiter is 433 Europa-radii away and a linear scale put it 43,000
  px off screen.
- **Moon mean motion must come from a dense short Horizons series** where the
  revolution count is unambiguous. The osculating `N` Horizons reports wobbles
  enough to miscount 400 revolutions between 5-year samples and throw a moon 60°
  off. Published `P` in the satellite table is wrong for the Galileans.
- **Phobos needs a quadratic mean longitude.** It is spiralling into Mars, so its
  mean motion accelerates; a straight line leaves it 12° out, a quadratic 2.2°.
- **`getImageData` works in device pixels**, not CSS pixels. Multiply by `DPR` or
  you will sample empty canvas and think the renderer is broken.
- **Textures taint a `file://` canvas.** Test over `python3 -m http.server`, never
  `file://`, or every map silently fails to load.
- **Headless Chrome captures smooth scrolls and image loads mid-flight.** Verify
  interaction in a real browser; headless is for stills only.
- **A hidden preview pane stops `requestAnimationFrame` and reports the canvas as
  0×0.** Every flight freezes and `VIEW.fit` falls to its floor, which looks
  exactly like a camera bug. Screenshot to bring the pane back, or drive
  `stepFly(CAM.fly.t0 + CAM.fly.ms + 1)` by hand when scripting checks.
- **Approach and the scene are different spaces, and no zoom joins them.** Radial
  compression means that at Earth's system-framing altitude the scene camera
  would have to sit at zoom ~1,150 to show the same field, and for the two to
  match at zoom 1 you would be 250,000 Earth-radii out. Do not try to make the
  handover continuous. Animate it and let it be a change of place.

### Accuracy, measured against JPL Horizons
| | |
|---|---|
| Planets | sub-arcminute; oppositions match published dates |
| Asteroids | worst 0.72° across 1800–2050 |
| Moons | 14 of the 19 fitted under 1°, 12 under 0.3°; worst Triton 4.9°, Miranda 4.6°. Our own Moon is the 20th and comes from Schlyter, not a fit |
| Sunrise/sunset | within 1 minute of published NYC times |
| Sub-solar point | 0.0001° at solstices |

---

## 5. Backlog, roughly in order

1. **Mobile portrait is cramped.** `computeView()` now counts the detail card as
   top chrome on narrow screens, so the view is at last centred on the band you
   can actually see rather than behind the card — but with the card open that
   band is only ~100 px tall and `VIEW.fit` has a floor of 70, so a framed moon
   system still overspills it. The fix is a layout one (a collapsible card), not
   a camera one. Desktop is unaffected.
2. Triton (4.9°) and Miranda (4.6°) still exceed the rest. Both need a proper
   perturbation model, not a better fit — a different kind of project. Currently
   disclosed in the About.
3. No CI on this repo; it is the odd one out among the twelve.
4. `simonbuilds.app` homepage now has a **Just For Fun** section linking here
   (backup at `index-backup-2026-08-15.html` on the server). Local mirror at
   `~/My Documents/Apps/MyWebsite/` was updated to match.

## 6. Licences — obligations, not courtesies
- Code MIT. **Star catalogue is CC BY-SA 4.0** (HYG) — share-alike, so the extract
  stays under it. Constellation lines BSD-3 (d3-celestial). Planet maps CC BY 4.0
  (Solar System Scope). Moon maps public domain (USGS/NASA).
- All credited in the About panel, `LICENSE`, and the file header. Keep them.
