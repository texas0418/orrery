# Orrery

**https://orrery.simonbuilds.app**

A live, dependency-free model of the solar system. Real planetary positions,
computed in the browser from the JPL low-precision Keplerian element table
(Standish, *Approximate Positions of the Major Planets*, valid 1800–2050).

- One HTML file. No frameworks, no build step, no server, no analytics.
- Kepler's equation solved per body per frame; orbits drawn as true ellipses
  with the Sun at a focus.
- Event search finds the next opposition (outer planets) or greatest elongation
  (Mercury, Venus) by daily scan + bisection to the minute.
- Verified against published ephemerides: Mars opposition 2027-02-19,
  Jupiter 2027-02-11, Saturn 2026-10-04, Neptune 2026-09-26.

## Deploy

```
rsync -rz --delete -e "ssh -p 18765 -i ~/.ssh/siteground_simonbuilds" \
  public_html/ siteground-simonbuilds:~/www/orrery.simonbuilds.app/public_html/
```

Then flush SuperCacher → Dynamic Cache for orrery.simonbuilds.app in Site Tools.
