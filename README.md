# Orrery

**https://orrery.simonbuilds.app**

A live, dependency-free model of the solar system — and of the sky above you.
One HTML file, no frameworks, no build step, no server, no analytics.

## Orrery view

Real planetary positions from the JPL low-precision Keplerian element table
(Standish, *Approximate Positions of the Major Planets*, 1800–2050). Kepler's
equation solved per body per frame. Perihelion and aphelion marked on the
selected orbit.

Drawn with a perspective camera in three dimensions — orbit it, dolly in,
fly to a body, or drop to *Edge on* to see the real orbital inclinations
against the plane of Earth's orbit. Each planet drops a line to that plane so
its height is readable. Pluto's 17° is the one worth looking at.

Distances are radially compressed by the *Spread* exponent, which scales how
far a body sits from the Sun but never which way — so ecliptic latitude and
longitude on screen are exact at every setting (verified to 1e-9). Orbit
*shapes*, and on-screen angles as seen from Earth, are true only at Spread 100.

## Sky view

The same vectors rotated to equatorial, precessed J2000 → date (IAU 1976), and
turned into altitude/azimuth for the observer. Includes the Sun, the Moon (with
phase), 1,637 stars to magnitude 5, and 89 constellation figures. Selecting a
planet and leaving the trail on draws its apparent path against the stars —
which is how you see a retrograde loop.

Observer location is guessed from the browser time zone (no permission needed),
typeable by hand, or read from the geolocation API on request. Nothing about it
leaves the page.

## Approach

Select a planet and press **Approach**: the marker becomes a lit sphere mapped
with spacecraft imagery. Orientation comes from IAU pole and prime-meridian
elements, so the face turned toward you matches the date; illumination is the
true Sun direction, so the terminator and the sub-solar point are computed.
Sizes are exaggerated — unavoidably, since Earth is far under a pixel at honest
scale — and the panel prints the live factor (`×3.8 thousand actual size`).

Maps are fetched on demand, one body at a time, so the page stays ~60 kB until
you ask for a world. In Sky view the Moon needs no exaggeration at all: narrow
the field below ~12° and it is drawn at its true half-degree.

Not pretended about: bodies are spheres, though Saturn is really flattened by a
tenth; Saturn's rings use measured radii but cast no shadows; Venus is its cloud
deck; Uranus and Neptune are near-featureless in reality, so their banding is
interpretive; the Moon's libration terms are omitted (good to a degree or two).

## Coming up

One daily pass over the next 1,826 days yields every opposition, greatest
elongation, and close planet pairing; candidates refined by bisection to the
minute. Click an entry to travel there.

## Verified against

| Check | Result |
|---|---|
| Earth heliocentric distance at J2000 | 0.98331 AU ✓ |
| Mars oppositions | 2027-02-19, 2031-05-04 at 0.56 AU ✓ |
| Jupiter / Saturn / Neptune oppositions | 2027-02-11 / 2026-10-04 / 2026-09-26 ✓ |
| Sun's declination at solstice | ±23.435° ✓ |
| NYC sunrise/sunset, both solstices | within 1 minute of published ✓ |
| Solstice noon altitude, 40.71°N | 72.72° / 25.85° vs 72.73° / 25.85° ✓ |
| Polaris | due north, altitude = latitude ✓ |
| Moon synodic period / distance / max latitude | 29.546 d, 356.3–405.8 Mm, 5.30° ✓ |
| Sub-solar point on Earth vs RA(sun) − GMST | agrees to <1.2° over 50 yr (precession) ✓ |
| Rotation periods from IAU elements | Venus 243.02 d retro, Jupiter 9h55m, Mars 24h37m ✓ |
| Earth at 12:00 UT / 00:00 UT | Africa / Pacific under the Sun ✓ |

Known simplifications: no nutation or aberration (<1'), mean sidereal time,
abridged lunar theory (a few arcminutes), no apparent magnitudes.

## Data

- Stars: **HYG database v3.8**, David Nash / astronexus — **CC BY-SA 4.0**.
  The embedded extract remains under CC BY-SA 4.0.
- Surface maps: **Solar System Scope** — **CC BY 4.0**, downscaled to 1024×512.
- Rotational elements: **IAU WGCCRE 2015 report**.
- Constellation figures: **d3-celestial**, © 2015 Olaf Frohn — **BSD 3-Clause**.
- Lunar theory: Paul Schlyter's abridged series.

Regenerate the embedded payload (downloads are not committed):

```
curl -sSL -o hyg.csv.gz https://raw.githubusercontent.com/astronexus/HYG-Database/main/hyg/v3/hyg_v38.csv.gz
gunzip -c hyg.csv.gz > hyg.csv
curl -sSL -o conlines.json https://raw.githubusercontent.com/ofrohn/d3-celestial/master/data/constellations.lines.json
node build-skydata.js .        # writes skydata.js, paste into index.html
```

## Deploy

```
rsync -rz --delete -e "ssh -p 18765 -i ~/.ssh/siteground_simonbuilds" \
  public_html/ siteground-simonbuilds:~/www/orrery.simonbuilds.app/public_html/
```

Then flush Site Tools → Speed → SuperCacher → **Dynamic Cache** for
orrery.simonbuilds.app, or the bare URL keeps serving the old page.
