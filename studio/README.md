# Ink, Toner & Moore Studio

A small marketing site for the software side of the Westbrook Mall shop.
It introduces the services, shop project, process and contact details.

These are plain static HTML, CSS, JavaScript and SVG files.
There is no framework, package installation or build step.

Preview from the repository root:
`python3 -m http.server -d studio 8090`
Open http://localhost:8090 in your browser.

Deploy from the repository root:
`wrangler pages deploy studio --project-name ink-toner-moore --branch studio`

Contact details live in one place in `main.js`, in the `CONTACT` object.
Keep the static contact fallbacks in `index.html` in sync for visitors without JavaScript.
The footer year also has a static fallback of 2026.
Remove the robots noindex meta tags when the site moves to its real domain.
