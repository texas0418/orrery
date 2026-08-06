# Orrery

**https://orrery.simonbuilds.app**

A live, dependency-free model of the solar system. Real planetary positions,
computed in the browser from the JPL low-precision Keplerian element table
(Standish, *Approximate Positions of the Major Planets*, valid 1800–2050).

- One HTML file. No frameworks, no build step, no server, no analytics.
- Kepler's equation solved per body per frame; orbits drawn as true ellipses
  with the Sun at a focus, warped only by the on-screen distance compression.
- **Coming up** — one daily pass over the next 1,826 days yields every
  opposition, greatest elongation and close pairing, refined by bisection to
  the minute. Click an entry to travel to that moment.
- Selecting a body marks its perihelion and aphelion.
- Date, selection, zoom and spread live in the URL hash, so any view is a link.

Verified against published ephemerides: Mars oppositions 2027-02-19 and
2031-05-04 (0.56 AU), Jupiter 2027-02-11, Saturn 2026-10-04, Neptune
2026-09-26; Earth at 0.98331 AU on J2000.

## Deploy

```
rsync -rz --delete -e "ssh -p 18765 -i ~/.ssh/siteground_simonbuilds" \
  public_html/ siteground-simonbuilds:~/www/orrery.simonbuilds.app/public_html/
```

Then flush Site Tools → Speed → SuperCacher → **Dynamic Cache** for
orrery.simonbuilds.app, or the bare URL keeps serving the old page.

## og.jpg

Regenerate by screenshotting the page itself at 1200x630:

```
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new \
  --window-size=1200,630 --virtual-time-budget=6000 --screenshot=og.png \
  "file://$PWD/public_html/index.html#t=2026-11-16T04:04Z&b=mars&s=42"
sips -s format jpeg -s formatOptions 82 og.png --out public_html/og.jpg
```
