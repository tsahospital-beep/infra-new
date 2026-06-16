# Infra Core — landing (SynthAI-style)

Static landing page for **Infra Core** (B2B IT supplier, Georgia), built in a
clean monochrome + pastel "SynthAI" design language.

Plain **HTML + CSS + a little vanilla JS** — no build step, no framework.

## Structure
```
index.html      — the page
styles.css      — all styles (design tokens + components)
assets/         — 3D category illustrations (computers, monitors, networking,
                  printers, headsets, software)
.nojekyll       — serve folders as-is on GitHub Pages
```

## Run locally
Open `index.html` in a browser, or serve the folder:
```bash
npx serve .
```

## Deploy (GitHub Pages)
Settings → Pages → Source: **Deploy from a branch** → `main` / root.
The site is fully static, so it works as-is.

## Sections
Header (frosted on scroll) · Hero · trust band · product cards (sticky panels) ·
how-we-work stepper · brands marquee · why · services (gradient cards) ·
footer with CTA.
