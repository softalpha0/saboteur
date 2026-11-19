# TodoMVC (React), second target app

This is the official React TodoMVC from [tastejs/todomvc](https://github.com/tastejs/todomvc) (`examples/react`, commit `ff43b02`, MIT, see `LICENSE.md`). Saboteur uses it to show it works on an app it did not write.

Changes from upstream, all build-only:

- Built with Vite instead of webpack (`index.html`, `vite.config.js`, `package.json`).
- `src/index.js` renamed to `src/index.jsx` so Vite parses its JSX.
- React 18 and react-router-dom 6, the same versions as the demo shop (upstream uses 19 and 7). Only `HashRouter`, `Routes`, `Route` and `useLocation` are used, which work the same in both.
- The TodoMVC "learn" sidebar script (`base.js`) is not included. Its stylesheet still is.

Nothing in `src/` is changed. The bugs live in `mutations/` as patches and are only applied to temporary copies.

Run it from the repo root:

```bash
pnpm saboteur -c examples/todomvc/saboteur.config.json doctor --replay
```
