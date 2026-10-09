# Ink, Toner & Moore Studio

The site for the software side of the shop. Plain static files: no build, no
packages. It is separate from the shop app in `src/` and shares nothing with it.

The look is a print job: white paper and the four process inks. The headline is
three plates (cyan, magenta, yellow) laid over each other with `mix-blend-mode:
multiply`, so in register they read as black. `main.js` builds the plates and
moves them. With scripts off, or with reduced motion on, the headline is plain
black.

Preview:

    python3 -m http.server -d studio 8090

Deploy to https://studio.ink-toner-moore.pages.dev (from the repo root, see
`docs/ui-rehaul/HANDOFF.md` for the environment):

    wrangler pages deploy studio --project-name ink-toner-moore --branch studio

Contact details live in the `CONTACT` object in `main.js`, with the same values
repeated in `index.html` for when scripts are off. Change both.

The first, plainer version is at the git tag `studio-v1-plain`.
