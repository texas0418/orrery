# Orrery — handoff, updated 2026-10-08

**Live:** https://orrery.simonbuilds.app · **Repo:** github.com/texas0418/orrery
**Deployed build: 213,374 bytes.** Live, disk and the `/orrery` redirect all agree.

---

## 1. State of play

The site is fully working and deployed. The camera problem in §3 is **fixed and
shipped**: `CAM.alt` is now a first-class camera property and every moon system
frames on screen. The light-and-shadow pass of 2026-10-08 is also shipped — see
§3b. Nothing is pending in the tree.

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
  altitude. But **`camKm(b)` is the only source of the camera distance**, and it
  reads `CAM.alt`. Never invert the drawn radius to get it back: the globe has a
  1.5 px floor so a body still shows from far out, and inverting a floored
  radius places every companion as though you were three times closer. That bug
  put Saturn 28,000 px off screen from Tethys, and it is invisible until you
  measure, because it only bites past `camF()/1.5` ≈ 480 radii.
- **Three altitudes, and the difference between them is the design.** `worldAlt()`
  (7.0 radii) is where clicking a body puts you: the body as a world, with room
  around it. `approachAlt(b)` (2.61, or 6.6 for Saturn so its rings are not cut
  off) is where the Approach button puts you. `outerAlt(b)` is the outer edge:
  `altFor(systemRadii(b), .45)` for a planet, or **three times the separation**
  for a moon, which is what puts its planet inside 18° of the axis *whichever
  way you are facing* — where the planet appears is a question of facing, not
  distance, and it lies within `atan(S/alt)` of the moon. `altFor(radii, frac)`
  = `radii / (frac · tan(HALF_FOV))`.
- **The wheel enters and leaves at the same altitude, `outerAlt`.** That is the
  whole reason it exists as a separate number. Entry and exit are instant and
  identical, so a scroll that carries on through the boundary carries on going;
  only the scene zoom changes across it. Set entry anywhere else and scrolling
  back in teleports — which is exactly what Simon reported on 15 Aug, when
  re-entry jumped to the close view and the Moon filled the screen again.
- Scene zoom during approach is a constant, `APPROACH_SCENE = 60`: enough that
  nothing else is in the cone. It is no longer load-bearing.
- Wheel/pinch scale `alt` when in approach and `zoom` otherwise, crossing at
  `APPROACH_ZOOM` (4) going in and `outerAlt(b)` coming out. Deselecting is a
  different thing — that is *leaving*, and it flies the whole way out to zoom 1.
- `alt` rides in the hash as `h=`. A link from before the split (zoom ≥ 4, no
  `h=`) is converted on read — it meant "at this body", so it lands there.

**Consequences worth knowing before you "improve" any of them:**

- **Clicking anything gives you the world** — Simon's call, 15 Aug, and the
  right one. The system view is what you scroll out to, and it is exactly where
  the boundary sits, so pulling back always ends on it.
- **A moon's planet is not somewhere you can arrive.** To have both in frame the
  camera must be roughly opposite the planet — which is the moon's *anti-planet*
  hemisphere, the one Voyager never charted for half of them. So the page does
  not aim the camera for you. Pulling back gathers the planet in instead, and
  the About says so.
- Below 4 px a globe is drawn in the body's own colour and **its map is never
  fetched** — a megabyte to colour nine pixels. Zoom in and it loads.
- `drawMoons` is now `drawMoonOrbits` and draws *only* paths. The moons
  themselves were always also drawn by `drawCompanions`, in a different
  projection — two labels, and a moon that could sit off its own orbit line.

**Verified:** all 33 bodies, at 1280×720 and 375×812. Every one arrives at
7.02 radii on a click; every one leaves and re-enters at the identical altitude
with no jump; and at that boundary everything each body belongs to is in frame —
planets' moon systems 28–119 px out, and every moon's planet 83–205 px, against
a `min(W,H)/2` limit of 360. Entry, exit, sky round-trip, deselect and old-style
links are in the session log; there are no tests in the repo (see §5.3).

---

## 3b. LIGHT AND SHADOW — shipped 2026-10-08

Four things, one engine, because they are all the same question: does the light
get there. Built because Simon asked for something no other orrery page does,
and chosen over the alternatives because every one of them **shortened** the
About's list of admissions instead of lengthening it.

- **Eclipses.** `sunOpen()` in `drawGlobe` asks, per pixel of lit surface, how
  much of the Sun's disc an occulter covers from that point: the two discs on
  the sky and the area of their overlap. Umbra is where that reaches all of it,
  penumbra where it reaches some, annular where the occulter fits inside. The
  occulter list is `occultersOf(b, t)`: a planet's moons, or for a moon its
  planet and siblings. A cheap cone test rejects the whole occulter per frame
  when its penumbra cannot touch the body, so the cost is only paid during an
  actual eclipse.
- **Ring shadows, both ways.** `drawRings` splits each band's visible arc into
  lit and shadowed runs; a shadowed ring particle gives off nothing but still
  hides what is behind it, so it is filled as a dark filter at the band's own
  opacity rather than skipped. `ringShade()` does the other direction, following
  the ray from each surface pixel out to the ring plane and dimming by the band
  it crosses, with the depth divided by the slant so the shadow goes thin and
  hard near equinox.
- **Planetshine.** A moon's night side is lit by its planet. True ratio for
  Earth on the Moon is about 1/12,000 of sunlight, so it is lifted to 12% on
  screen (`SHINE_SHOW`) with the phase and incidence left real. Declared in the
  About in those words.
- **Libration.** Our Moon now uses the IAU 2015 lunar model, `lunarRot()`, with
  the full E1–E13 series, routed through the same `bodyFrame` the planets use.
  This also closed a split nobody had noticed: the sky view was using `ROT.moon`
  while the orrery used `moonFrame`'s perfect synchronous lock, so the same Moon
  had two orientations depending on the view.

**Verified against outside sources, not against itself:** NASA's published
eclipse path tables for 2024-04-08 and 2027-08-02, and JPL Horizons vectors for
Io and Ganymede. Numbers in the accuracy table below.

**The A/B that saved me.** The first Saturn render looked wrong and I was about
to go hunting in the shadow code. Instead I built a copy of the page with only
the ring shadows disabled and measured the same frame twice: the lit southern
hemisphere came out at 150.1 in both, identical, while the north went 134.3 →
94.7. The code was right and the rings had always looked like that at that
angle. **Do this before believing your eyes on a rendering change.**

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
- **The Moon's coordinates are of date; everything else is J2000.** Schlyter's
  series returns ecliptic longitude referred to the equinox of date. `moonGeo`
  now precesses it back to J2000 before returning. Leaving that out is a silent
  0.39° error in 2027 growing at ~50″/yr from 2000, so 1.7° at the 1800 end:
  two thirds of a lunar diameter, in BOTH the orrery and the sky view, while the
  About claimed a few arcminutes. It went unnoticed for months because nothing
  on the page cross-checked the Moon against anything. Eclipses did.
- **A close camera cannot see a thin crescent, and that is not a bug.** From
  `alt` radii up you see only `acos(1/alt)` from the point below you. At 2.3
  radii that is 64°, and a 5%-lit crescent lives past that horizon. You have to
  be as far off as Earth is to see one. Use ~20% lit for a close earthshine shot.
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
| Eclipse path | 137–143 km off NASA's centre line (2027-08-02), 226–239 km (2024-04-08) |
| Greatest eclipse | 26 s early (2024), 130 s late (2027); most of the latter is unmodelled Delta T |
| Galilean positions | Io 0.024° from Horizons, Ganymede 0.223°, at matched dynamical time |
| Lunar libration | ±8.0° longitude, ±6.9° latitude; 58.1% of the surface ever visible (59% published incl. diurnal) |

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
3. **Delta T is not modelled.** The page treats the clock reading as dynamical
   time, which is ~73 s off UT in 2027 and grows at both ends of the window. It
   is most of the residual in eclipse timing. Adding it would sharpen every date
   on the page and would mean re-checking the sunrise/sunset claim, so it is its
   own job, not a rider on something else.
4. No CI on this repo; it is the odd one out among the twelve.
5. `simonbuilds.app` homepage now has a **Just For Fun** section linking here
   (backup at `index-backup-2026-08-15.html` on the server). Local mirror at
   `~/My Documents/Apps/MyWebsite/` was updated to match.

## 6. Licences — obligations, not courtesies
- Code MIT. **Star catalogue is CC BY-SA 4.0** (HYG) — share-alike, so the extract
  stays under it. Constellation lines BSD-3 (d3-celestial). Planet maps CC BY 4.0
  (Solar System Scope). Moon maps public domain (USGS/NASA).
- All credited in the About panel, `LICENSE`, and the file header. Keep them.
