# Johnson McGinnis Game — Full Session Summary + Code Assessment

## 0) MANDATORY MAINTENANCE POLICY (Effective Immediately)
- This file **must be updated every time code is written, updated, or retained**.
- No code change is considered complete until `summary.md` is updated with:
  - what changed,
  - why it changed,
  - where it changed,
  - and what remains.
- `summary.md` is now the single source of truth for previous and current implementation context.

### Latest update log
- Date: **2026-03-01** (update 2)
- Action: Implemented 3 gameplay features — varied consequence types, in-world direction signs, enhanced branding. Updated all sections below.

## 1) What this project is
- A browser-based interactive estate-planning game using:
  - `index.html` (UI structure)
  - `styles.css` (overlay/hud styling)
  - `scenarios.js` (6 question scenarios + answers/feedback)
  - `main.js` (game flow/state machine + UI events)
  - `game.js` (Three.js renderer, road/intersection/scenery/car movement)
  - `config.js` (messages, thresholds, endpoint config)
- Gameplay loop: drive -> stop at intersection -> choose L/S/R -> feedback -> OK -> car turns -> repeat -> final arrival -> results screen.

---

## 2) Conversation history (what was requested and changed)

### Early requests (previous sessions)
- Replace earlier 3D-style environment elements with PNG-based illustrated scenery.
- Add randomized scenery per direction (left/right/straight) so each path feels different.

### Mid-session bug reports (previous sessions)
- Scenery popping/recreating/glitching during or after turns.
- Fences/tree/barn interfering with road visibility.
- Hills too large/too close or blocking the view.
- Barn floating above ground.
- Road alignment issues after turns.

### Applied fixes over previous sessions
- Added pre-generation system for all 3 directions per intersection.
- Added immediate scenery switch on direction selection to reduce pop-in.
- Added anti-duplication flags (`currentRoadSceneryCreated`, `pregenSceneryCreated`).
- Moved scenery placements farther from road; tuned some closer for visibility.
- Reworked road repositioning to use car forward vector.
- Added dedicated directional scenery helpers (`createFenceForDirection`, `createLakeForDirection`).
- Added end-of-game destination behavior (ARRIVING -> PARKING state flow).

### Session 2: Major assets2 integration (current session)

**Phase 1 — Comprehensive asset migration to assets2:**
- Replaced ALL primary textures with assets2 sources (20 files total)
- Kept assets/barn.png and assets/rock-small/medium/large.png as supplements
- Car: Replaced ~240 lines of 3D geometry with Car.png sprite (rear view, auto-faces camera)
- Stop Sign: Replaced 3D ExtrudeGeometry octagon with Stop Sign.png on PlaneGeometry
- Hills: Replaced 7 SphereGeometry hemispheres with 3 PNG layered planes (far/mid/near)
- Trees: Changed to assets2 Tree 1/2/3 only
- Lakes: Added Lake 1 & Lake 2 variant random selection
- Fences: Migrated to assets2 Fence.png and Fence - Long.png
- Bushes: Migrated to assets2 bush-small/medium/large.png
- NEW createBillboard(): Billboard 1/2.png on two cylinder posts
- NEW createHouse(): House 1/2/3.png as PlaneGeometry
- Final destination: Redesigned with House (office) + Billboard (Johnson McGinnis sign) + parking lot with painted stripes

**Phase 2 — Bug fixes from screenshot feedback:**
User reported 5 issues from live testing:

1. **Car slides off road when turning** — FIXED: Changed Bezier curve control point from an offset formula to the intersection center point (`intX, intZ`). This gives a perfect 90-degree curve that stays within the junction area at all rotations.

2. **Autumn trees still appearing** — FIXED: Removed all autumn tree texture loading (`treeAutumn1/2/3`). Removed entire autumn/green/mixed selection logic from `createTree()`. Now only uses assets2 Tree 1/2/3. Changed `getRandomSceneryConfig()` to always use `treeStyle: 'green'`.

3. **Lakes not visible** — FIXED: Lakes were positioned too far from the road (±55 x-offset) and too close to the car (only 15 units ahead). Changed to ±35 x-offset and 30 units ahead for `createLake()`, and ±25 side-offset for `createLakeForDirection()`. Also added `depthWrite: false` for proper transparency rendering and lowered `alphaTest` to 0.05. Lake config now always includes a lake (removed 'none' option).

4. **Stop sign text is inverted/mirrored** — FIXED: Removed `signPlane.rotation.y = Math.PI` from `createStopSign()`. The default PlaneGeometry faces +z which is toward the approaching car, so no rotation is needed.

5. **Fences covering roads at intersection** — FIXED: Pushed intersection fence start positions from `junctionEdge + 55` to `junctionEdge + 80` (70 units away from junction center instead of 45). Also pushed tree start positions on left/right/straight roads to `junctionEdge + 50` from `junctionEdge + 30`.

**Dead code cleanup (Phase 1):**
- Removed `createHayBale()` (unused method)
- Removed `regenerateSceneryForNewRoad()` (never called)
- Removed `createFenceAlongRoad()` (only called by removed method)

### Git action performed in previous session
- Commit created and pushed on branch `ver2`.

### Session 3: Pause button fix + Visual overhaul + Pothole/bump feature

**Fix 1: Pause button not responding to clicks during gameplay.**
- Root cause: `#screen-hud` has `pointer-events: none` blocking child element interactions.
- Solution: Added `pointer-events: auto` to `.pause-btn` and `.btn-resume`.

**Fix 2: Hills/sky interfering with camera at late scenarios (5, 6, parking).**
- Root cause: `hillGroup` only translated with car position but never rotated. After turns, hill planes faced wrong direction and appeared in camera view.
- Solution: `hillGroup.rotation.y = this.car.rotation.y` — hills now rotate to always face the camera from the far horizon. Distance pushed from 170→350 units. Hill plane sizes increased (600-800 wide) for full horizon coverage.

**Fix 3: Foggy/smoky washed-out colors.**
- Root cause: `ACESFilmicToneMapping` desaturates colors; fog at 400-800 was too close; sky colors were yellowish-beige.
- Solution:
  - Changed to `THREE.NoToneMapping` for true original colors.
  - Fog pushed to 600-1200 range (only blends far objects, no atmosphere haze).
  - Sky gradient changed to natural blue (top #5DADE2 → horizon #A8D8EA).
  - Scene background changed to sky blue (0x87CEEB).
  - Lighting now brighter white ambient + sky-blue hemisphere light.
  - Camera far plane extended from 1000 to 1500.
  - Sky sphere radius increased from 500 to 700.

**Fix 4: Enriched scenery variety for all scenes.**
- `createSceneryForDirection()` now also generates rocks (was missing), 2 houses instead of 1, lakes always included.
- Bush placement spread closer (from 15 units ahead) and rocks scattered across landscape.
- Every direction pre-generates unique randomized config — each turn leads to a visibly different road.

**Fix 5: Pothole & bump feature (from specs point 5).**
- New methods: `createPothole()`, `triggerBump(callback)`, `cleanupPotholes()`
- New state: `BUMPING` — car drives 6 units forward into a visible pothole crater on the road.
- Bump animation: sharp drop (-0.5y), bounce up (+0.4y), small dip, settle back. Car tilts slightly for realism.
- Integration: `handleFeedbackOk()` in main.js checks if last answer was wrong → triggers bump before the turn. Correct answers turn smoothly.
- Pothole visual: dark crater circle + inner black hole + cracked edge ring on road surface.
- Potholes cleaned up after bump completes and on game reset.

### Session 4: Visual refinement — scenery placement, hills panorama, barn fix, parking (current session)

**Fix 1: Scenery too far from road on pregenerated directions.**
- All pregenerated scenery offsets in `createSceneryForDirection()` tightened to match first-scene closeness:
  - Trees: roadSide + 12 (was +18)
  - Fences: roadSide (was roadSide+5)
  - Barns: 28 units from center (was 35)
  - Houses: 28 units from center (was 35+)
  - Bushes: 15+ units ahead (was 25+)
  - Rocks: 15+ units ahead (was 22+)
- Lakes: side offset 20 (was 25), distAhead 35 (was 45)
- Result: all roads after every intersection now have rich, close scenery matching the first scene.

**Fix 2: Hills 360° panorama (hills no longer rotate with car).**
- Problem: Previous approach rotated `hillGroup.rotation.y` to match car direction, causing visible hill movement during turns.
- Solution: Replaced flat forward-facing planes with a **full 360° panoramic ring**:
  - 3 concentric rings of 8 panels each (24 total panels), all facing inward
  - Far: radius 400, 80-unit height
  - Mid: radius 340, 60-unit height (offset by half-angle for layering)
  - Near: radius 280, 45-unit height (offset by quarter-angle)
  - Panel width = chord length + overlap to eliminate gaps
  - `hillGroup` position follows car center (no offset ahead, no rotation)
- All 3 `hillGroup.rotation.y = this.car.rotation.y` assignments removed from:
  - `positionIntersectionAhead()`
  - `update()` main driving block
  - `completeTurn()`
- Fallback (no hill textures): 12 hemisphere hills in a ring at radius 300

**Fix 3: Barn floating above ground.**
- Changed `plane.position.y` in `createBarn()` from `height/2 - 4` (= 4.0 for 16-unit height) to `height * 0.38` (= 6.08). Barn sits lower on ground.

**Fix 4: Smooth realistic parking animation.**
- Replaced simple straight approach with 3-phase parking:
  - Phase 1 (0–0.4): Approach — car drives forward, slight turn toward spot
  - Phase 2 (0.4–0.7): Turn in — car rotates into parking position
  - Phase 3 (0.7–1.0): Straighten — car aligns parallel, eases to stop
- Speed reduced from `delta * 0.7` to `delta * 0.35` (slower, more realistic)
- 600ms delay after parking before triggering arrival callback

### Session 5: Barn/fence/parking/pothole fixes (current session)

**Fix 1: Barn still floating (went higher instead of lower).**
- Root cause: Previous `height * 0.38` = 6.08 was HIGHER than old `height/2 - 4` = 4.0 — moved barn UP instead of down.
- Solution: Use `planeGeo.translate(0, height/2, 0)` to shift geometry so bottom edge is at local y=0 (properly grounded). Then `plane.position.y = -1.5` to bury the transparent bottom pixels of the PNG into the ground.

**Fix 2: Fences still closing roads at some intersections.**
- Root cause: Intersection fences started at `junctionEdge + 25` (only ~35 units from center), and pregenerated fences started at dist=20 from car (too close to intersection).
- Solution:
  - Intersection fences: pushed start from `junctionEdge + 25` to `junctionEdge + 40` (50 units from center) for all 4 road directions.
  - Pregenerated fences (`createFenceForDirection`): start pushed from dist=20 to dist=40.
  - Pregenerated trees (`createSceneryForDirection`): start pushed from dist=10 to dist=30 to also clear intersection area.

**Fix 3: Parking re-done — car crosses billboard, then parks in lanes.**
- Problem: Billboard was at 45 units but parking triggered at 30 units from spot (62 units ahead), meaning car started parking BEFORE reaching the billboard.
- Solution — new layout order:
  - Billboard at 30 units (car passes it first)
  - Parking lot at 68 units (further ahead)
  - Office at 85 units (behind parking)
  - Parking activates when car is within 15 units of spot (at ~53 units from start, well past billboard at 30)
- New parking animation: smooth ease-out glide from approach point to exact spot center. Car decelerates naturally and ends exactly between lane stripes. Target rotation aligned with lanes.
- 1.5 second wait after car is parked before showing results screen.
- New state vars: `parkingTargetRot`, `parkingWaitStarted`.

**Fix 4: Pothole not visible on road.**
- Problem: Old pothole was too small (radius 1.5) and too close to car (6 units) — nearly invisible on dark road.
- Solution:
  - Pothole placed 12 units ahead (player sees it before bump).
  - Size doubled: outer ring 3.5, crater 2.8, inner hole 1.8.
  - High-contrast colors: light brown dirt outer ring (0x8B7355), reddish-brown depth ring (0x5C3A1E), dark crater, near-black center.
  - 6 small debris chunks scattered around edge for realism.
  - Bump speed slowed from `delta * 2.5` to `delta * 1.8` (~0.55s) with forward drive increased to 8 m/s so car reaches pothole.

### Session 6: Gameplay features — consequences, direction signs, branding (current session)

**Feature 1: Varied consequence types for wrong answers.**
- Problem: All wrong answers triggered the same pothole/bump animation regardless of the `consequence` field already defined in `scenarios.js` (`tree`, `bump`, `pothole`).
- Solution — 3 distinct consequence systems:
  - **Pothole** (`triggerBump`, `createPothole`, BUMPING state): Existing system, unchanged. Car drops into crater and bounces.
  - **Fallen tree** (`triggerTreeHit`, `createFallenTree`, TREE_HIT state): Large trunk + canopy + broken branches + leaf debris across road. Car swerves right to avoid, violent jolt + shake (~1.2s). Cleaned up after animation.
  - **Road debris** (`triggerSwerve`, `createRoadDebris`, SWERVING state): Scattered rocks + orange warning cone + dirt patch. Car does S-curve swerve through debris, mild bounce/rattle (~0.67s). Cleaned up after animation.
- In `main.js` `handleFeedbackOk()`: reads `this.pendingConsequence` (stored in `handleOptionSelect` from `option.consequence`) and dispatches to the matching trigger method.
- All 3 states handled in `update(delta)` with proper cleanup in `reset()`.

**Feature 2: In-world direction signs at intersections.**
- Problem: Spec calls for road signs at intersections showing answer options tied to directions. Only the overlay UI existed.
- Solution:
  - `createDirectionSign(text, direction)` — Creates a green highway-style sign using CanvasTexture: dark green background, white border, direction arrow (←/↑/→), word-wrapped answer text. PlaneGeometry 6×3 on thin metal post.
  - `createDirectionSigns(leftText, straightText, rightText)` — Creates 3 signs in a gantry row across the junction at positions (-8, 0, 2), (0, 0, 2), (8, 0, 2) in intersection local space. Added to `intersectionGroup`.
  - Called from `showScenario()` in `main.js` when scenario card and options become visible.
  - `removeDirectionSigns()` — Called in `turn()` (when car starts turning) and `reset()`.

**Feature 3: Enhanced branding moments along the road.**
- Problem: Only 1 billboard per road segment + final destination. Spec calls for more subtle branding throughout.
- Solution:
  - `createRoadsideSign()` — Creates a professional brown/gold sign with "JOHNSON McGINNIS | Elder Law Attorneys | johnsonmcginnis.com" using CanvasTexture. Smaller than billboards (4.5×2.25), on wooden posts at y=3.5.
  - `createSceneryForDirection()` now generates: 2 billboards (was 1) on opposite sides + 1 JM roadside sign per road segment.
  - `createRoadsideScenery()` (initial road) also adds 1 JM roadside sign.
  - Result: player sees JM branding 3× per road segment (2 billboards + 1 sign).

---

## 3) Current code architecture

### UI + flow
- `main.js`
  - `GameController` controls screens, scoring, scenarios, and renderer callbacks.
  - Key methods: `startGame()`, `showScenario()`, `handleOptionSelect(direction)`, `handleFeedbackOk()`, `onTurnComplete()`, `showEndScreen()`
  - `pendingConsequence` tracks the consequence type (`tree`, `bump`, `pothole`) for wrong answers.

### 3D renderer
- `game.js` (~3050 lines)
  - `GameRenderer` manages scene, camera, road, intersection, scenery, car, and movement states.
  - **Movement states:** IDLE → DRIVING → APPROACHING → STOPPED → (BUMPING | TREE_HIT | SWERVING) → TURNING → POST_TURN_DRIVING → (repeat 6x) → ARRIVING → PARKING
  - **Key methods:**
    - Scene: `createRoad()`, `createIntersection()`, `createHills()`, `createScenery()`
    - Assets: `createTree()`, `createBush()`, `createBarn()`, `createBillboard()`, `createHouse()`, `createStopSign()`
    - Lakes: `createLake()`, `createLakeForDirection()`
    - Intersection: `positionIntersectionAhead()`, `addIntersectionScenery()`, `createIntersectionFence()`
    - Pregeneration: `pregenerateAllDirections()`, `createSceneryForDirection()`, `showPregenSceneryForDirection()`
    - Movement: `turn()`, `completeTurn()`, `driveToFinish()`, `createFinalDestination()`
    - Turn curve: Quadratic Bezier with control point at intersection center
    - **Consequences:** `createPothole()` + `triggerBump()`, `createFallenTree()` + `triggerTreeHit()`, `createRoadDebris()` + `triggerSwerve()`
    - **Direction signs:** `createDirectionSign(text, dir)`, `createDirectionSigns(l, s, r)`, `removeDirectionSigns()`
    - **Branding:** `createRoadsideSign()` — JM-branded brown/gold roadside sign with canvas text

### Data
- `scenarios.js` — 6 scenarios with 3 directional options each, correct answer marked `isCorrect: true`

### Configuration
- `config.js` — End messages, score thresholds, CTA link/text, lead-capture endpoint toggle

---

## 4) Current asset mapping

### assets2/ (PRIMARY — 20 files)
| Asset | Texture Key | Used In |
|-------|-------------|---------|
| Tree 1/2/3.png | tree1, tree2, tree3 | createTree() — only source |
| hills-far/mid/near.png | hillsFar, hillsMid, hillsNear | createHills() |
| Fence.png, Fence - Long.png | fenceShort, fenceLong | createFenceForDirection(), createIntersectionFence() |
| Lake 1/2.png | lake1, lake2 | createLake(), createLakeForDirection() |
| bush-small/medium/large.png | bushSmall, bushMedium, bushLarge | createBush() |
| Car.png | car | createCar() — rear view sprite |
| Stop Sign.png | stopSign | createStopSign() |
| Billboard 1/2.png | billboard1, billboard2 | createBillboard() |
| House 1/2/3.png | house1, house2, house3 | createHouse() |

### assets/ (SUPPLEMENTARY — 4 files used)
| Asset | Texture Key | Used In |
|-------|-------------|---------|
| barn.png | barn | createBarn() |
| rock-small/medium/large.png | rockSmall/Med/Large | createRock() |

### assets/ (UNUSED — not loaded)
- tree-green-1/2/3.png, tree-autumn-1/2/3.png, sky.png, hills-*.png, fence-*.png, bush-*.png, lake.png

---

## 5) Current implemented behavior
- Direction-specific scenery is pre-generated and hidden until user chooses direction.
- On turn choice, renderer reveals chosen pre-generated scenery before cleanup (no flicker).
- Turn uses quadratic Bezier curve with control point at intersection center — car stays on road.
- Only assets2 trees (Tree 1/2/3) are used — no autumn trees.
- Lakes always appear (100% chance) — positioned closer to road (±25-35 offset) for visibility.
- Stop sign faces approaching car correctly (no inversion).
- Intersection fences start 80 units from junction edge — roads are completely clear.
- Final destination: House (office) + Billboard (Johnson McGinnis sign) + parking lot with painted stripes.
- Parking: 3-phase realistic parking (approach → turn-in → straighten) with 600ms delay before callback.
- Hills: 360° panoramic ring (3 layers × 8 panels) centered on car — no rotation, visible from all directions.
- **Consequence variety:** Wrong answers trigger different visual events based on `option.consequence` field:
  - `pothole` → pothole crater on road, car jolts down/up (BUMPING state)
  - `tree` → fallen tree with trunk/canopy/debris across road, car swerves right, violent shake (TREE_HIT state, ~1.2s)
  - `bump` → scattered rocks/gravel + orange cone, car S-curve swerves through debris (SWERVING state, ~0.67s)
  - Correct answers (`smooth`) → no consequence, car turns directly
- **In-world direction signs:** 3 green highway-style signs appear at intersection when scenario is shown.
  - Canvas-textured PlaneGeometry with direction arrow (←/↑/→) + answer text, word-wrapped
  - Positioned in a gantry row across the junction (x = -8, 0, +8 at z = 2 in intersection local space)
  - Signs are tall (panel at y=5.5) on thin metal posts — car can see them from stop position
  - Removed automatically when `turn()` starts and on `reset()`
- **Enhanced branding throughout the journey:**
  - Each road segment now has 2 billboards (was 1) + 1 JM roadside sign
  - JM roadside sign: brown/gold professional sign with "JOHNSON McGINNIS | Elder Law Attorneys | johnsonmcginnis.com" on wooden posts
  - Initial road scenery also includes a JM roadside sign
  - Final destination retains prominent billboard + office

---

## 6) Where to edit for common future requests

### A) "Scenery still glitches"
1. `showPregenSceneryForDirection(...)` — switch timing/cleanup order
2. `positionIntersectionAhead()` — flags (`currentRoadSceneryCreated`, `pregenSceneryCreated`)
3. `completeTurn()` — verify no unexpected scenery re-clear

### B) "Fences block roads at intersection"
- `addIntersectionScenery()` — change fence start offsets (currently `junctionEdge + 80`)

### C) "Lake too far or too close"
- Initial road: `createLake(config)` — x offset and z offset
- Directional: `createLakeForDirection(...)` — side multiplier and distAhead

### D) "Hills too near / too far"
- `createHills()` — 3 concentric rings (radii 400/340/280), panel counts, heights
- Hill tracking in `update(delta)`, `positionIntersectionAhead()`, `completeTurn()` — position only (no rotation)

### E) "Car turning issues"
- `turn(direction)` — Bezier control point is at intersection center (`intX, intZ`). Adjust if needed.
- `update(delta)` TURNING block — turn speed is `delta * 0.25`

### F) "End parking should change"
- `driveToFinish()`, `createFinalDestination()` — office/billboard/parking positions
- `update(delta)` ARRIVING and PARKING blocks

### G) "Consequence animation tweaks"
- Pothole: `createPothole()` (visual) + `update()` BUMPING block (animation)
- Fallen tree: `createFallenTree()` (visual) + `update()` TREE_HIT block (animation, ~1.2s, swerve + shake)
- Road debris: `createRoadDebris()` (visual) + `update()` SWERVING block (animation, ~0.67s, S-curve)
- Consequence type comes from `option.consequence` in `scenarios.js`
- Mapped in `main.js` `handleFeedbackOk()` → `triggerBump/triggerTreeHit/triggerSwerve`

### H) "Direction signs at intersection"
- `createDirectionSigns(l, s, r)` in `game.js` — called from `showScenario()` in `main.js`
- `removeDirectionSigns()` — called in `turn()` and `reset()`
- Sign visual: `createDirectionSign(text, direction)` — canvas texture, green highway style

### I) "Branding signs along road"
- `createRoadsideSign()` — standalone method, returns a group with canvas-textured panel + posts
- Added in `createSceneryForDirection()` and `createRoadsideScenery()`

---

## 7) Quick resume checklist
1. Open `game.js` — inspect `turn()`, `completeTurn()`, `createFinalDestination()`
2. Run `python -m http.server 8080` in project directory
3. Open http://localhost:8080 — test full cycle: drive → stop → choose → turn → repeat
4. Check for: turn smoothness, scenery visibility, lake rendering, fence gaps, stop sign orientation

---

## 8) Fresh status audit (specs.md vs current implementation)

### Implemented and aligned
- Required email gate before gameplay is implemented (`index.html`, `main.js`).
- reCAPTCHA block is present and validated client-side when available.
- Optional checkboxes (`over18`, `inTennessee`) are implemented.
- Profile selection (Senior / Child / Other) is implemented.
- 6-scenario gameplay loop with left/straight/right choice and immediate feedback is implemented.
- Variable end messages by score thresholds are implemented (`config.js`, `main.js`).
- Final destination flow (arrival + parking + result screen) is implemented.
- Tennessee-style roadside assets and subtle branding (billboard/final destination) are implemented.

### Partially implemented / needs production hardening
- Lead routing exists structurally but production integration is not complete:
  - `CONFIG.leadCapture.enableSubmission` is `false`
  - endpoint is placeholder (`YOUR_ZAPIER_HOOK`)
  - no server-side validation/persistence documented.
- reCAPTCHA currently uses Google test site key (good for dev, not production).

### Remaining work from spec (still open)
1. **Production lead pipeline**
  - Connect real Zapier/Mailchimp endpoint.
  - Switch to production reCAPTCHA keys.
  - Add backend verification + error handling/reporting.

2. ~~**Obstacle consequence variety**~~ DONE
  - Implemented tree/bump/pothole consequence types with distinct visuals and animations.

3. ~~**Intersection decision presentation polish**~~ DONE
  - Green highway-style direction signs with arrows + answer text appear at each intersection.

4. ~~**Branding journey moments expansion**~~ DONE
  - 2 billboards + 1 JM roadside sign per road segment. Professional brown/gold sign with firm details.

5. **Visual style verification pass against final stakeholder preference**
  - Final approval pass needed for "animated but not childish" / Tennessee realism targets from `specs.md`.

### Current highest-priority next tasks
- Priority 1: Wire real lead capture flow (Zapier/Mailchimp + production reCAPTCHA).
- Priority 2: Final visual polish pass with stakeholder feedback.
- Priority 3: Mobile responsiveness testing and touch input optimization.

