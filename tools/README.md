# Internal dev tools (not part of the app)

Small helpers used to review the dashboard without a physical camera.
Run from this `tools/` folder after `npm install` here.

- **`shot.mjs`** — opens the dashboard in headless Chrome with a *fake* camera
  stream and saves a full-page screenshot (used to polish the UI).
  ```bash
  node shot.mjs http://localhost:5173/ shots/out.png 8000
  ```
- **`seed.mjs`** — emits synthetic face detections to the backend so the globe,
  heatmap and leaderboard populate for review.
  ```bash
  node seed.mjs http://localhost:4000 9
  ```

`shot.mjs` expects Chrome at the default Windows path; edit `CHROME` inside it
if yours differs. Neither script is needed to run the real app.
