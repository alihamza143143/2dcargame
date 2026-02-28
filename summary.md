# Johnson McGinnis Game — Full Session Summary + Code Assessment

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

---

## 3) Current code architecture

### UI + flow
- `main.js`
  - `GameController` controls screens, scoring, scenarios, and renderer callbacks.
  - Key methods: `startGame()`, `showScenario()`, `handleOptionSelect(direction)`, `handleFeedbackOk()`, `onTurnComplete()`, `showEndScreen()`

### 3D renderer
- `game.js` (~2237 lines)
  - `GameRenderer` manages scene, camera, road, intersection, scenery, car, and movement states.
  - **Movement states:** IDLE → DRIVING → APPROACHING → STOPPED → TURNING → POST_TURN_DRIVING → (repeat 6x) → ARRIVING → PARKING
  - **Key methods:**
    - Scene: `createRoad()`, `createIntersection()`, `createHills()`, `createScenery()`
    - Assets: `createTree()`, `createBush()`, `createBarn()`, `createBillboard()`, `createHouse()`, `createStopSign()`
    - Lakes: `createLake()`, `createLakeForDirection()`
    - Intersection: `positionIntersectionAhead()`, `addIntersectionScenery()`, `createIntersectionFence()`
    - Pregeneration: `pregenerateAllDirections()`, `createSceneryForDirection()`, `showPregenSceneryForDirection()`
    - Movement: `turn()`, `completeTurn()`, `driveToFinish()`, `createFinalDestination()`
    - Turn curve: Quadratic Bezier with control point at intersection center

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

---

## 7) Quick resume checklist
1. Open `game.js` — inspect `turn()`, `completeTurn()`, `createFinalDestination()`
2. Run `python -m http.server 8080` in project directory
3. Open http://localhost:8080 — test full cycle: drive → stop → choose → turn → repeat
4. Check for: turn smoothness, scenery visibility, lake rendering, fence gaps, stop sign orientation
