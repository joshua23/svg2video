svg2video

## 父与子 · Father and Son

A 5′53″ animated short made entirely from SVG with this project's Remotion stack. It is an
homage to Michaël Dudok de Wit's Academy Award–winning *Father and Daughter* (2000), retold as
the story of a Chinese father and son: a ride along a poplar-lined river dike on a 二八大杠
bicycle, a willow switch broken in farewell (折柳), a sampan sculled away into the haze. The boy
plants the switch on the dike and keeps coming back through the seasons of his life. The
chapters are titled with solar terms (节气), from 清明 to 立春, and the willow grows with him.

- **Watch in the app:** `npm run dev`, then open `/film.html` (chapters are clickable;
  `/film.html?t=95` starts at 1:35).
- **Remotion Studio:** `npm run film:studio`, composition `FatherAndSon`.
- **Render to MP4:** `npm run film:render` writes `out/father-and-son.mp4` (1920×1080, 24 fps).
- **Regenerate the score:** `npm run film:score` synthesises `public/father-and-son/score.mp3`
  from the same `timeline.json` the film uses, so music cues stay locked to picture.

How it is built (`src/films/father-and-son/`):

| Part | What it does |
| --- | --- |
| `rig/` | Silhouette figures on a two-bone-IK skeleton (walk, run, ride, kneel, hug, scull, back views for turning round), the bicycle, the 乌篷 sampan, props |
| `scenery/` | The dike set with parallax and depth projection, long sheared shadows, poplars, willows that grow from a switch to an old tree, reeds, weather, paper grain |
| `scenes/` | One component per chapter; choreography is keyframed in seconds |
| `lib/look.ts` | Palettes for each hour and season, blended for dusk and the time-lapse |
| `timeline.json` | Scene durations shared by the film and the score generator |
| `scripts/father-and-son-score.mjs` | A pentatonic waltz for synthetic guzheng, dizi, erhu and sheng, plus bell, wind and rain |

Type: the title, chapter cards and credits are set in Ma Shan Zheng and Cormorant Garamond (SIL
Open Font License), baked to SVG outlines by `scripts/father-and-son-glyphs.py` so renders never
wait on a web font. The outlines and licences live in `src/films/father-and-son/fonts/`.
