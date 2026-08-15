# Orrery — handoff, 2026-08-15

**Live:** https://orrery.simonbuilds.app · **Repo:** github.com/texas0418/orrery
**Deployed build: 189,543 bytes.** Live, disk and the `/orrery` redirect all agree.

---

## 1. State of play

The site is fully working and deployed. There is **one uncommitted change in the
working tree** (190,988 bytes) that is a partial improvement with a known flaw —
see §3. It compiles and runs; it is simply not finished, and is **not deployed**.

**Do not deploy the working tree until §3 is resolved.** Live is correct.

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

## 3. THE OPEN PROBLEM — start here

**Symptom (Simon's report):** "There's no orbit for the moon? There is for the
other moons."

**Diagnosis (confirmed by measurement, not guesswork):** the orbit *is* drawn,
2,973 px off screen. The Moon orbits at **59.5 Earth-radii**; Io orbits at **6
Jupiter-radii**. At one approach zoom, Jupiter's system fits and Earth's cannot.

**Root cause:** `CAM.zoom` controls two different things at once — how much of the
(radially compressed) solar system is in frame, *and* the implied altitude above
the body being approached, via `globeRadius()`. Framing Earth's Moon needs a low
altitude-equivalent but a high scene zoom. One number cannot do both.

**Uncommitted attempt (in the tree now):** `APPROACH_ZOOM` 4→2, globe radius floor
7→1.5 keyed to zoom/4, `flyTo` frames a planet by its outermost moon, and moon
orbit paths now use the same perspective projection as `drawCompanions`. Every
moon system now measurably fits on screen. **But** flying to Earth lands at zoom
2.7, where the scene still shows the whole solar system, so the Earth–Moon pair is
a small detail in a busy field. Better arithmetic, worse picture.

**The fix I was halfway through:** add `CAM.alt` — altitude above the selected
body, in its own radii — as a first-class camera property, separate from
`CAM.zoom`.

- `CAM = {..., alt: 0}`; `alt > 1.001` means "in approach".
- `globeRadius()` returns `CV.f / sqrt(alt² - 1)` when `alt` is set, else current.
- `flyTo` animates `alt` alongside zoom. Moon → `zoom 60, alt 3`. Planet with
  moons → `zoom 60, alt = outermostMoonRadii × 2.4`. Planet without → `zoom 60,
  alt 8`. Approach button → `alt 2.6`.
- Wheel/pinch scales `alt` when in approach (flying in and out), and only touches
  `zoom` otherwise. `alt > 20000` exits approach: `alt = 0, zoom = 1`.
- Everything currently testing `CAM.zoom >= APPROACH_ZOOM` becomes
  `(CAM.alt > 1.001 || CAM.zoom >= APPROACH_ZOOM)` — there are four such sites.
- Carry `alt` in the URL hash as `h=`.

The edit script failed on the wheel-handler anchor only; the other replacements
were all correct. Nothing was written, so the tree is clean of it.

**Verify with:** fly to each of earth/mars/jupiter/saturn/uranus/neptune/pluto and
assert the outermost moon lands within `min(W,H)/2` px of the planet *and* that no
unrelated planet is in frame.

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

### Accuracy, measured against JPL Horizons
| | |
|---|---|
| Planets | sub-arcminute; oppositions match published dates |
| Asteroids | worst 0.72° across 1800–2050 |
| Moons | 14 of 19 under 1°, 12 under 0.3°; worst Triton 4.9°, Miranda 4.6° |
| Sunrise/sunset | within 1 minute of published NYC times |
| Sub-solar point | 0.0001° at solstices |

---

## 5. Backlog, roughly in order

1. **Finish §3.** Nothing else should ship first.
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
