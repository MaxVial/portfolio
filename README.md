**Live page → https://maxvial.github.io/portfolio/**

# Maxime Vial — Portfolio

A single-page portfolio written in plain HTML, CSS and JavaScript. No build step, no dependencies.

## How to run it

1. **Online:** https://maxvial.github.io/portfolio/
2. **On a laptop:** clone the repository and open `index.html` in a browser. Nothing to install. To serve it like the real site instead, run `python -m http.server 5173` in the folder and visit http://localhost:5173. With Docker: `docker build -t portfolio .` then `docker run -p 8080:80 portfolio` and visit http://localhost:8080.
3. **Hosting:** GitHub Pages, served over HTTPS from the `gh-pages` branch of this repository. To put a change online, commit it on `main`, then push it to both branches:

   ```bash
   git push origin main
   git push origin main:gh-pages
   ```

   GitHub Pages rebuilds the site within a minute or two.

## Structure

| File | Role |
| --- | --- |
| `index.html` | Content and structure of the page |
| `style.css` | Layout, typography, animations |
| `main.js` | Hero canvas, project sheets and their animations, stacked sections, timeline, fire-test chart |
| `assets/img/` | Project images (compressed JPEG / WebP) |
| `Dockerfile` | Optional: serves the folder with nginx |
| `assets/docs/` | Mycelium research paper (PDF) |

## Projects shown

1. **Mycelium vs. plasterboard** — experimental comparison of a mycelium composite and BA13.
2. **Reading the weather by radio** — Ecowitt weather station installation and RF decoding.
3. **CloudCaps** — bottle opener made of upcycled cellulose acetate, funded on Kickstarter.

## Contact

[LinkedIn](https://www.linkedin.com/in/maxime-vial-0b1971268/) · [GitHub](https://github.com/MaxVial)
