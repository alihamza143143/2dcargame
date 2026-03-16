/**
 * 3D Game Renderer - Tennessee Driving Experience
 * Features: Connected roads, proper stop signs, rich scenery (trees, fences, barns, fields)
 * Realistic street lights at intersections
 */

class GameRenderer {
    constructor() {
        this.container = null;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        
        // Game objects
        this.car = null;
        this.intersectionGroup = null;
        this.sceneryObjects = [];
        this.roadObjects = [];
        
        // PNG Textures for sprites
        this.textures = {};
        this.texturesLoaded = false;
        
        // State
        this.state = 'IDLE';
        this.carSpeed = 0;
        this.targetCarSpeed = 0;
        
        // Camera settings
        this.cameraOffset = { y: 5, z: 14 };
        
        // Animation
        this.clock = new THREE.Clock();
        
        // Turn animation
        this.turnProgress = 0;
        this.turnDirection = null;
        this.turnStartPos = null;
        this.turnEndPos = null;
        this.turnControlPoint = null;
        this.turnStartRot = 0;
        this.turnEndRot = 0;
        
        // Parking animation
        this.parkingProgress = 0;
        this.parkingSpot = null;
        this.parkingStartPos = null;
        this.parkingStartRot = 0;
        this.parkingTargetRot = 0;
        this.parkingWaitStarted = false;
        this.destinationBarn = null;
        
        // Road constants
        this.ROAD_WIDTH = 8;
        this.INTERSECTION_DISTANCE = 80;
        this.STOP_DISTANCE = 28; // Distance from intersection center where car stops
        
        // Scenery configuration (randomized per intersection)
        this.sceneryConfig = null;
        
        // Pre-generated scenery for all 3 directions (for smooth transitions)
        this.pregenScenery = {
            left: { objects: [], config: null },
            right: { objects: [], config: null },
            straight: { objects: [], config: null }
        };
        
        // Flags to prevent duplicate scenery creation (fixes glitching)
        this.currentRoadSceneryCreated = false;
        this.pregenSceneryCreated = false;
        
        // Pothole/bump state
        this.bumpProgress = 0;
        this.isBumping = false;
        this.bumpCallback = null;
        this.potholeObjects = [];
        
        // Fallen tree state (tree consequence)
        this.fallenTreeObjects = [];
        this.treeHitProgress = 0;
        this.treeHitCallback = null;
        
        // Swerve/debris state (bump consequence)
        this.roadDebrisObjects = [];
        this.swerveProgress = 0;
        this.swerveCallback = null;
        
        // Direction signs at intersection
        this.directionSignObjects = [];
        
        // Pause state
        this.paused = false;
        this.manuallyPaused = false;
        
        // Callbacks
        this.onTurnComplete = null;
        this.onArrivalComplete = null;
        this.onStopAtIntersection = null;
    }
    
    // Generate random scenery configuration
    getRandomSceneryConfig() {
        const lakeSide = Math.random() > 0.5 ? 'left' : 'right'; // Always show a lake
        const barnSide = Math.random() > 0.5 ? 'left' : 'right';
        const treeStyle = 'green'; // Only assets2 trees
        const fenceType = Math.random() > 0.5 ? 'long' : 'short';
        
        return {
            lakeSide: lakeSide,
            barnSide: barnSide,
            treeStyle: treeStyle, // Only assets2 trees
            fenceType: fenceType,
            bushCount: 8 + Math.floor(Math.random() * 8), // 8-15 bushes
            rockCount: 4 + Math.floor(Math.random() * 6), // 4-9 rocks
            treeCount: 10 + Math.floor(Math.random() * 8), // 10-17 trees per side
        };
    }
    
    // Load all PNG textures
    loadTextures() {
        const loader = new THREE.TextureLoader();
        const textureFiles = {
            // Hills from assets2
            hillsFar: 'assets2/hills-far.png',
            hillsMid: 'assets2/hills-mid.png',
            hillsNear: 'assets2/hills-near.png',
            // Primary trees from assets2 (always more prominent & in front)
            tree1: 'assets2/Tree 1.png',
            tree2: 'assets2/Tree 2.png',
            tree3: 'assets2/Tree 3.png',
            // Barn from assets2
            barn: 'assets2/barn.png',
            // Fences from assets2
            fenceLong: 'assets2/Fence - Long.png',
            fenceShort: 'assets2/Fence.png',
            // Lakes from assets2 (two variants)
            lake1: 'assets2/Lake 1.png',
            lake2: 'assets2/Lake 2.png',
            // Bushes from assets2
            bushSmall: 'assets2/bush-small.png',
            bushMedium: 'assets2/bush-medium.png',
            bushLarge: 'assets2/bush-large.png',
            // Rocks from assets2
            rockSmall: 'assets2/rock-small.png',
            rockMedium: 'assets2/rock-medium.png',
            rockLarge: 'assets2/rock-large.png',
            // Car from assets2
            car: 'assets2/Car.png',
            // Stop sign from assets2
            stopSign: 'assets2/Stop Sign.png',
            // Billboards from assets2 (branding along road)
            billboard1: 'assets2/Billboard 1.png',
            billboard2: 'assets2/Billboard 2.png',
            // Houses from assets2 (roadside scenery)
            house1: 'assets2/House 1.png',
            house2: 'assets2/House 2.png',
            house3: 'assets2/House 3.png'
        };
        
        const promises = Object.entries(textureFiles).map(([key, path]) => {
            return new Promise((resolve) => {
                loader.load(path, (texture) => {
                    // Don't set colorSpace for transparent PNGs to preserve alpha
                    texture.minFilter = THREE.LinearFilter;
                    texture.magFilter = THREE.LinearFilter;
                    texture.premultiplyAlpha = false;
                    this.textures[key] = texture;
                    console.log(`Loaded texture: ${key}`);
                    resolve();
                }, undefined, (err) => {
                    console.warn(`Failed to load texture: ${path}`, err);
                    resolve();
                });
            });
        });
        
        return Promise.all(promises).then(() => {
            this.texturesLoaded = true;
        });
    }
    
    init() {
        this.container = document.createElement('div');
        this.container.id = 'game-canvas';
        document.body.insertBefore(this.container, document.body.firstChild);
        
        this.scene = new THREE.Scene();
        
        // Load PNG textures first, then build scene
        this.loadTextures().then(() => {
            // Create sky using canvas gradient
            this.createSkyGradient();
            
            // Set scene background to match sky horizon color (prevents black)
            this.scene.background = new THREE.Color(0x87CEEB);
            
            // Push fog very far back — only for blending distant objects, not for atmosphere
            this.scene.fog = new THREE.Fog(0xA8D8EA, 600, 1200);
        
            this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1500);
            
            this.renderer = new THREE.WebGLRenderer({ antialias: true });
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            // No tone mapping — preserves original vibrant colors without foggy/smoky wash
            this.renderer.toneMapping = THREE.NoToneMapping;
            this.renderer.toneMappingExposure = 1.0;
            this.container.appendChild(this.renderer.domElement);
            
            // Build scene
            this.setupLighting();
            this.createGround();
            this.createHills();
            this.createInfiniteRoad();
            this.createIntersection();
            this.createCar();
            
            // Position intersection ahead of car (this also creates initial scenery)
            this.positionIntersectionAhead();
            
            this.updateCamera(true);
            this.animate();
            
            window.addEventListener('resize', () => this.onResize());
            
            // Pause game when tab is hidden to prevent time jumps
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    this.pauseForVisibility();
                } else {
                    this.resumeFromVisibility();
                }
            });
            
            // Also handle window blur/focus as fallback
            window.addEventListener('blur', () => this.pauseForVisibility());
            window.addEventListener('focus', () => this.resumeFromVisibility());
        });
    }
    
    setupLighting() {
        // Bright natural ambient lighting
        const ambient = new THREE.AmbientLight(0xFFFFFF, 0.75);
        this.scene.add(ambient);
        
        // Hemisphere light — bright sky blue on top, warm ground green below
        const hemiLight = new THREE.HemisphereLight(0x87CEEB, 0x6B8E50, 0.6);
        this.scene.add(hemiLight);
        
        // Warm sunlight
        const sun = new THREE.DirectionalLight(0xFFFAF0, 0.9);
        sun.position.set(60, 80, -80);
        sun.castShadow = true;
        sun.shadow.mapSize.width = 2048;
        sun.shadow.mapSize.height = 2048;
        sun.shadow.camera.near = 10;
        sun.shadow.camera.far = 500;
        sun.shadow.camera.left = -200;
        sun.shadow.camera.right = 200;
        sun.shadow.camera.top = 200;
        sun.shadow.camera.bottom = -200;
        sun.shadow.bias = -0.0005;
        this.scene.add(sun);
        this.sun = sun;
        
        // Fill light for softer shadows
        const fillLight = new THREE.DirectionalLight(0xD0D8D0, 0.4);
        fillLight.position.set(-50, 40, 50);
        this.scene.add(fillLight);
    }
    
    createSkyGradient() {
        // Always use canvas sky for reliable rendering
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        // Bright natural sky — blue top fading to warm horizon
        const gradient = ctx.createLinearGradient(0, 0, 0, 512);
        gradient.addColorStop(0, '#5DADE2');    // Vivid sky blue at top
        gradient.addColorStop(0.2, '#85C1E9');  // Lighter blue
        gradient.addColorStop(0.45, '#AED6F1'); // Pale blue
        gradient.addColorStop(0.65, '#D4E6F1'); // Very light blue
        gradient.addColorStop(0.8, '#E8F0F2');  // Near-white haze
        gradient.addColorStop(1, '#A8D8EA');    // Soft horizon blue
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 512, 512);
        
        // Soft white clouds
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.ellipse(120, 160, 110, 28, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(350, 140, 95, 24, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(240, 200, 80, 20, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        
        const skyTexture = new THREE.CanvasTexture(canvas);
        const skyGeo = new THREE.SphereGeometry(700, 32, 32);
        const skyMat = new THREE.MeshBasicMaterial({
            map: skyTexture,
            side: THREE.BackSide
        });
        const sky = new THREE.Mesh(skyGeo, skyMat);
        this.scene.add(sky);
        this.sky = sky;
    }
    
    createGround() {
        // Create flat solid grass matching 2D illustrated style
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        // Solid muted green like screenshot - flat illustrated look
        ctx.fillStyle = '#6B8E50';
        ctx.fillRect(0, 0, 512, 512);
        
        // Very subtle variation for depth - keep it minimal
        for (let i = 0; i < 500; i++) {
            const x = Math.random() * 512;
            const y = Math.random() * 512;
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = Math.random() > 0.5 ? '#5E8045' : '#78995A';
            ctx.fillRect(x, y, 2 + Math.random() * 3, 2 + Math.random() * 3);
        }
        ctx.globalAlpha = 1;
        
        const grassTexture = new THREE.CanvasTexture(canvas);
        grassTexture.wrapS = THREE.RepeatWrapping;
        grassTexture.wrapT = THREE.RepeatWrapping;
        grassTexture.repeat.set(50, 50);
        
        // Large ground plane - flat solid green like 2D illustration
        const groundGeo = new THREE.PlaneGeometry(2000, 2000);
        const groundMat = new THREE.MeshLambertMaterial({ 
            map: grassTexture,
            color: 0x6B8E50  // Muted meadow green matching screenshot
        });
        this.ground = new THREE.Mesh(groundGeo, groundMat);
        this.ground.rotation.x = -Math.PI / 2;
        this.ground.position.y = -1.1;
        this.ground.receiveShadow = true;
        this.scene.add(this.ground);
    }
    
    createHills() {
        this.hillGroup = new THREE.Group();
        
        // Hills as a 360-degree panorama ring surrounding the entire scene.
        // Panels face inward so hills are visible from every direction.
        // hillGroup only TRANSLATES with the car (no rotation) so hills stay static.
        if (this.textures.hillsFar || this.textures.hillsMid || this.textures.hillsNear) {
            const panelCount = 8;
            const angleStep = (Math.PI * 2) / panelCount;
            
            // Far hills — outermost ring
            if (this.textures.hillsFar) {
                const radius = 400;
                for (let i = 0; i < panelCount; i++) {
                    const angle = i * angleStep;
                    const farMat = new THREE.MeshBasicMaterial({
                        map: this.textures.hillsFar,
                        transparent: true,
                        alphaTest: 0.05,
                        side: THREE.DoubleSide,
                        depthWrite: false
                    });
                    const chordWidth = 2 * radius * Math.sin(angleStep / 2) + 20;
                    const farGeo = new THREE.PlaneGeometry(chordWidth, 80);
                    const farPlane = new THREE.Mesh(farGeo, farMat);
                    farPlane.position.set(
                        Math.sin(angle) * radius,
                        30,
                        Math.cos(angle) * radius
                    );
                    farPlane.rotation.y = angle + Math.PI;
                    this.hillGroup.add(farPlane);
                }
            }
            
            // Mid hills — middle ring (offset for layering)
            if (this.textures.hillsMid) {
                const radius = 340;
                for (let i = 0; i < panelCount; i++) {
                    const angle = i * angleStep + angleStep * 0.5;
                    const midMat = new THREE.MeshBasicMaterial({
                        map: this.textures.hillsMid,
                        transparent: true,
                        alphaTest: 0.05,
                        side: THREE.DoubleSide,
                        depthWrite: false
                    });
                    const chordWidth = 2 * radius * Math.sin(angleStep / 2) + 15;
                    const midGeo = new THREE.PlaneGeometry(chordWidth, 60);
                    const midPlane = new THREE.Mesh(midGeo, midMat);
                    midPlane.position.set(
                        Math.sin(angle) * radius,
                        22,
                        Math.cos(angle) * radius
                    );
                    midPlane.rotation.y = angle + Math.PI;
                    this.hillGroup.add(midPlane);
                }
            }
            
            // Near hills — innermost ring
            if (this.textures.hillsNear) {
                const radius = 280;
                for (let i = 0; i < panelCount; i++) {
                    const angle = i * angleStep + angleStep * 0.25;
                    const nearMat = new THREE.MeshBasicMaterial({
                        map: this.textures.hillsNear,
                        transparent: true,
                        alphaTest: 0.05,
                        side: THREE.DoubleSide,
                        depthWrite: false
                    });
                    const chordWidth = 2 * radius * Math.sin(angleStep / 2) + 10;
                    const nearGeo = new THREE.PlaneGeometry(chordWidth, 45);
                    const nearPlane = new THREE.Mesh(nearGeo, nearMat);
                    nearPlane.position.set(
                        Math.sin(angle) * radius,
                        15,
                        Math.cos(angle) * radius
                    );
                    nearPlane.rotation.y = angle + Math.PI;
                    this.hillGroup.add(nearPlane);
                }
            }
        } else {
            // Fallback: hemisphere hills in a ring
            const hillCount = 12;
            const radius = 300;
            for (let i = 0; i < hillCount; i++) {
                const angle = (i / hillCount) * Math.PI * 2;
                const height = 20 + Math.random() * 15;
                const hillGeo = new THREE.SphereGeometry(height, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
                const hillMat = new THREE.MeshLambertMaterial({
                    color: i % 2 === 0 ? 0x6B8B5A : 0x5C7D4C
                });
                const hill = new THREE.Mesh(hillGeo, hillMat);
                hill.position.set(Math.sin(angle) * radius, 0, Math.cos(angle) * radius);
                hill.scale.set(3, 0.8, 2);
                hill.receiveShadow = true;
                this.hillGroup.add(hill);
            }
        }
        
        this.scene.add(this.hillGroup);
    }
    
    createInfiniteRoad() {
        // Main road the car drives on
        this.roadGroup = new THREE.Group();
        
        // Create asphalt texture
        const asphaltCanvas = document.createElement('canvas');
        asphaltCanvas.width = 256;
        asphaltCanvas.height = 256;
        const aCtx = asphaltCanvas.getContext('2d');
        
        // Dark asphalt base
        aCtx.fillStyle = '#2A2A2A';
        aCtx.fillRect(0, 0, 256, 256);
        
        // Add gravel/texture noise
        for (let i = 0; i < 2000; i++) {
            const x = Math.random() * 256;
            const y = Math.random() * 256;
            const shade = Math.random();
            if (shade < 0.3) {
                aCtx.fillStyle = '#1A1A1A';
            } else if (shade < 0.6) {
                aCtx.fillStyle = '#333333';
            } else {
                aCtx.fillStyle = '#3A3A3A';
            }
            aCtx.fillRect(x, y, 1 + Math.random() * 2, 1 + Math.random() * 2);
        }
        
        const asphaltTexture = new THREE.CanvasTexture(asphaltCanvas);
        asphaltTexture.wrapS = THREE.RepeatWrapping;
        asphaltTexture.wrapT = THREE.RepeatWrapping;
        asphaltTexture.repeat.set(2, 150);
        
        const roadMat = new THREE.MeshLambertMaterial({ map: asphaltTexture });
        this.roadMaterial = roadMat; // Store for reuse
        
        const lineMat = new THREE.MeshBasicMaterial({ color: 0xFFDD00 });
        const edgeMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
        
        const roadLength = 600;
        const roadGeo = new THREE.PlaneGeometry(this.ROAD_WIDTH, roadLength);
        const road = new THREE.Mesh(roadGeo, roadMat);
        road.rotation.x = -Math.PI / 2;
        road.position.set(0, 0.05, 0);
        road.receiveShadow = true;
        this.roadGroup.add(road);
        
        // Center yellow dashed line - raised higher
        for (let z = roadLength / 2; z > -roadLength / 2; z -= 10) {
            const dashGeo = new THREE.PlaneGeometry(0.25, 5);
            const dash = new THREE.Mesh(dashGeo, lineMat);
            dash.rotation.x = -Math.PI / 2;
            dash.position.set(0, 0.08, z);
            this.roadGroup.add(dash);
        }
        
        // White edge lines - raised higher
        const edgeGeo = new THREE.PlaneGeometry(0.3, roadLength);
        const leftEdge = new THREE.Mesh(edgeGeo, edgeMat);
        leftEdge.rotation.x = -Math.PI / 2;
        leftEdge.position.set(-this.ROAD_WIDTH / 2 + 0.2, 0.08, 0);
        this.roadGroup.add(leftEdge);
        
        const rightEdge = new THREE.Mesh(edgeGeo, edgeMat);
        rightEdge.rotation.x = -Math.PI / 2;
        rightEdge.position.set(this.ROAD_WIDTH / 2 - 0.2, 0.08, 0);
        this.roadGroup.add(rightEdge);
        
        this.scene.add(this.roadGroup);
    }
    
    createIntersection() {
        this.intersectionGroup = new THREE.Group();
        
        // Use the same asphalt texture as main road, or create new if not exists
        let roadMat;
        if (this.roadMaterial) {
            roadMat = this.roadMaterial;
        } else {
            // Fallback - create asphalt texture
            const asphaltCanvas = document.createElement('canvas');
            asphaltCanvas.width = 256;
            asphaltCanvas.height = 256;
            const aCtx = asphaltCanvas.getContext('2d');
            aCtx.fillStyle = '#2A2A2A';
            aCtx.fillRect(0, 0, 256, 256);
            for (let i = 0; i < 2000; i++) {
                const x = Math.random() * 256;
                const y = Math.random() * 256;
                aCtx.fillStyle = Math.random() > 0.5 ? '#333333' : '#1A1A1A';
                aCtx.fillRect(x, y, 1 + Math.random() * 2, 1 + Math.random() * 2);
            }
            const asphaltTexture = new THREE.CanvasTexture(asphaltCanvas);
            asphaltTexture.wrapS = THREE.RepeatWrapping;
            asphaltTexture.wrapT = THREE.RepeatWrapping;
            asphaltTexture.repeat.set(2, 50);
            roadMat = new THREE.MeshLambertMaterial({ map: asphaltTexture });
        }
        
        const lineMat = new THREE.MeshBasicMaterial({ color: 0xFFDD00 });
        const edgeMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
        
        // === INTERSECTION CENTER (crossroads) ===
        const junctionSize = this.ROAD_WIDTH * 2.5;
        const junctionGeo = new THREE.PlaneGeometry(junctionSize, junctionSize);
        const junction = new THREE.Mesh(junctionGeo, roadMat);
        junction.rotation.x = -Math.PI / 2;
        junction.position.set(0, 0.06, 0);
        junction.receiveShadow = true;
        this.intersectionGroup.add(junction);
        
        // === CONNECTED ROADS WITH MARKINGS ===
        const sideRoadLength = 200;
        const junctionEdge = junctionSize / 2;
        
        // LEFT ROAD
        const leftRoadGeo = new THREE.PlaneGeometry(this.ROAD_WIDTH, sideRoadLength);
        const leftRoad = new THREE.Mesh(leftRoadGeo, roadMat);
        leftRoad.rotation.x = -Math.PI / 2;
        leftRoad.rotation.z = Math.PI / 2;
        leftRoad.position.set(-junctionEdge - sideRoadLength / 2, 0.04, 0);
        leftRoad.receiveShadow = true;
        this.intersectionGroup.add(leftRoad);
        
        // Left road markings - yellow center dashes
        for (let x = -junctionEdge - 15; x > -junctionEdge - sideRoadLength; x -= 10) {
            const dashGeo = new THREE.PlaneGeometry(5, 0.25);
            const dash = new THREE.Mesh(dashGeo, lineMat);
            dash.rotation.x = -Math.PI / 2;
            dash.position.set(x, 0.08, 0);
            this.intersectionGroup.add(dash);
        }
        // Left road white edges
        const leftEdgeGeo = new THREE.PlaneGeometry(sideRoadLength, 0.3);
        const leftEdgeTop = new THREE.Mesh(leftEdgeGeo, edgeMat);
        leftEdgeTop.rotation.x = -Math.PI / 2;
        leftEdgeTop.position.set(-junctionEdge - sideRoadLength / 2, 0.08, -this.ROAD_WIDTH / 2 + 0.2);
        this.intersectionGroup.add(leftEdgeTop);
        const leftEdgeBottom = new THREE.Mesh(leftEdgeGeo, edgeMat);
        leftEdgeBottom.rotation.x = -Math.PI / 2;
        leftEdgeBottom.position.set(-junctionEdge - sideRoadLength / 2, 0.08, this.ROAD_WIDTH / 2 - 0.2);
        this.intersectionGroup.add(leftEdgeBottom);
        
        // RIGHT ROAD
        const rightRoad = new THREE.Mesh(leftRoadGeo, roadMat);
        rightRoad.rotation.x = -Math.PI / 2;
        rightRoad.rotation.z = Math.PI / 2;
        rightRoad.position.set(junctionEdge + sideRoadLength / 2, 0.04, 0);
        rightRoad.receiveShadow = true;
        this.intersectionGroup.add(rightRoad);
        
        // Right road markings - yellow center dashes
        for (let x = junctionEdge + 15; x < junctionEdge + sideRoadLength; x += 10) {
            const dashGeo = new THREE.PlaneGeometry(5, 0.25);
            const dash = new THREE.Mesh(dashGeo, lineMat);
            dash.rotation.x = -Math.PI / 2;
            dash.position.set(x, 0.08, 0);
            this.intersectionGroup.add(dash);
        }
        // Right road white edges
        const rightEdgeTop = new THREE.Mesh(leftEdgeGeo, edgeMat);
        rightEdgeTop.rotation.x = -Math.PI / 2;
        rightEdgeTop.position.set(junctionEdge + sideRoadLength / 2, 0.08, -this.ROAD_WIDTH / 2 + 0.2);
        this.intersectionGroup.add(rightEdgeTop);
        const rightEdgeBottom = new THREE.Mesh(leftEdgeGeo, edgeMat);
        rightEdgeBottom.rotation.x = -Math.PI / 2;
        rightEdgeBottom.position.set(junctionEdge + sideRoadLength / 2, 0.08, this.ROAD_WIDTH / 2 - 0.2);
        this.intersectionGroup.add(rightEdgeBottom);
        
        // STRAIGHT ROAD (ahead)
        const straightRoadGeo = new THREE.PlaneGeometry(this.ROAD_WIDTH, sideRoadLength);
        const straightRoad = new THREE.Mesh(straightRoadGeo, roadMat);
        straightRoad.rotation.x = -Math.PI / 2;
        straightRoad.position.set(0, 0.04, -junctionEdge - sideRoadLength / 2);
        straightRoad.receiveShadow = true;
        this.intersectionGroup.add(straightRoad);
        
        // Straight road markings - yellow center dashes
        for (let z = -junctionEdge - 15; z > -junctionEdge - sideRoadLength; z -= 10) {
            const dashGeo = new THREE.PlaneGeometry(0.25, 5);
            const dash = new THREE.Mesh(dashGeo, lineMat);
            dash.rotation.x = -Math.PI / 2;
            dash.position.set(0, 0.08, z);
            this.intersectionGroup.add(dash);
        }
        // Straight road white edges
        const straightEdgeGeo = new THREE.PlaneGeometry(0.3, sideRoadLength);
        const straightEdgeLeft = new THREE.Mesh(straightEdgeGeo, edgeMat);
        straightEdgeLeft.rotation.x = -Math.PI / 2;
        straightEdgeLeft.position.set(-this.ROAD_WIDTH / 2 + 0.2, 0.08, -junctionEdge - sideRoadLength / 2);
        this.intersectionGroup.add(straightEdgeLeft);
        const straightEdgeRight = new THREE.Mesh(straightEdgeGeo, edgeMat);
        straightEdgeRight.rotation.x = -Math.PI / 2;
        straightEdgeRight.position.set(this.ROAD_WIDTH / 2 - 0.2, 0.08, -junctionEdge - sideRoadLength / 2);
        this.intersectionGroup.add(straightEdgeRight);
        
        // BACK ROAD (where car comes from)
        const backRoad = new THREE.Mesh(straightRoadGeo, roadMat);
        backRoad.rotation.x = -Math.PI / 2;
        backRoad.position.set(0, 0.04, junctionEdge + sideRoadLength / 2);
        backRoad.receiveShadow = true;
        this.intersectionGroup.add(backRoad);
        
        // Back road markings - yellow center dashes
        for (let z = junctionEdge + 15; z < junctionEdge + sideRoadLength; z += 10) {
            const dashGeo = new THREE.PlaneGeometry(0.25, 5);
            const dash = new THREE.Mesh(dashGeo, lineMat);
            dash.rotation.x = -Math.PI / 2;
            dash.position.set(0, 0.08, z);
            this.intersectionGroup.add(dash);
        }
        // Back road white edges
        const backEdgeLeft = new THREE.Mesh(straightEdgeGeo, edgeMat);
        backEdgeLeft.rotation.x = -Math.PI / 2;
        backEdgeLeft.position.set(-this.ROAD_WIDTH / 2 + 0.2, 0.08, junctionEdge + sideRoadLength / 2);
        this.intersectionGroup.add(backEdgeLeft);
        const backEdgeRight = new THREE.Mesh(straightEdgeGeo, edgeMat);
        backEdgeRight.rotation.x = -Math.PI / 2;
        backEdgeRight.position.set(this.ROAD_WIDTH / 2 - 0.2, 0.08, junctionEdge + sideRoadLength / 2);
        this.intersectionGroup.add(backEdgeRight);
        
        // === ADD SCENERY TO INTERSECTION ROADS ===
        this.addIntersectionScenery(junctionEdge, sideRoadLength);
        
        // === STREET LIGHTS (no center pole) ===
        const shoulderOffset = this.ROAD_WIDTH / 2 + 3;
        this.createStreetLight(-shoulderOffset, -10, Math.PI / 2);
        this.createStreetLight(shoulderOffset, -10, -Math.PI / 2);
        
        // === STOP SIGN ===
        this.createStopSign(this.ROAD_WIDTH / 2 + 2, 18);
        
        // === WHITE STOP LINE ===
        const stopLineGeo = new THREE.PlaneGeometry(this.ROAD_WIDTH - 1, 0.8);
        const stopLineMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
        const stopLine = new THREE.Mesh(stopLineGeo, stopLineMat);
        stopLine.rotation.x = -Math.PI / 2;
        stopLine.position.set(0, 0.09, junctionEdge + 2);
        this.intersectionGroup.add(stopLine);
        
        this.intersectionGroup.visible = false;
        this.scene.add(this.intersectionGroup);
    }
    
    addIntersectionScenery(junctionEdge, roadLength) {
        const roadSide = this.ROAD_WIDTH / 2 + 8; // Larger buffer
        
        // === LEFT ROAD SCENERY ===
        // Trees along left road - far from road, START FAR from junction
        for (let x = -junctionEdge - 50; x > -140; x -= 18) {
            const tree1 = this.createTree();
            tree1.position.set(x, 0, -roadSide - 10 - Math.random() * 8);
            this.intersectionGroup.add(tree1);
            
            const tree2 = this.createTree();
            tree2.position.set(x - 5, 0, roadSide + 10 + Math.random() * 8);
            this.intersectionGroup.add(tree2);
        }
        // Fences along left road - start well after the junction cross-road opening
        this.createIntersectionFence(-junctionEdge - 40, -150, -roadSide - 6, 'horizontal');
        this.createIntersectionFence(-junctionEdge - 40, -150, roadSide + 6, 'horizontal');
        
        // === RIGHT ROAD SCENERY ===
        // Trees along right road - far from road, START FAR from junction
        for (let x = junctionEdge + 50; x < 140; x += 18) {
            const tree1 = this.createTree();
            tree1.position.set(x, 0, -roadSide - 10 - Math.random() * 8);
            this.intersectionGroup.add(tree1);
            
            const tree2 = this.createTree();
            tree2.position.set(x + 5, 0, roadSide + 10 + Math.random() * 8);
            this.intersectionGroup.add(tree2);
        }
        // Fences along right road - start well after the junction cross-road opening
        this.createIntersectionFence(junctionEdge + 40, 150, -roadSide - 6, 'horizontal');
        this.createIntersectionFence(junctionEdge + 40, 150, roadSide + 6, 'horizontal');
        
        // === STRAIGHT ROAD SCENERY ===
        // Trees along straight road - far from road, START FAR from junction
        for (let z = -junctionEdge - 50; z > -140; z -= 18) {
            const tree1 = this.createTree();
            tree1.position.set(-roadSide - 10 - Math.random() * 8, 0, z);
            this.intersectionGroup.add(tree1);
            
            const tree2 = this.createTree();
            tree2.position.set(roadSide + 10 + Math.random() * 8, 0, z - 5);
            this.intersectionGroup.add(tree2);
        }
        // Fences along straight road - start well after the junction cross-road opening
        this.createIntersectionFence(-junctionEdge - 40, -150, -roadSide - 6, 'vertical-left');
        this.createIntersectionFence(-junctionEdge - 40, -150, roadSide + 6, 'vertical-right');
        
        // === BACK ROAD FENCES (where car comes from) - only beyond the junction edge ===
        // These run along Z axis from junctionEdge outward, on both sides of the back road
        // They do NOT extend into the junction area, so left/right cross-roads stay open
        this.createIntersectionFence(junctionEdge + 40, 80, -roadSide - 6, 'vertical-left');
        this.createIntersectionFence(junctionEdge + 40, 80, roadSide + 6, 'vertical-right');
        
        // === BARNS near intersection - one barn far from road, removed rotation since PlaneGeometry needs to face camera ===
        const barn1 = this.createBarn();
        barn1.position.set(-70, 0, -50);
        // No rotation for barn - let it face default direction for now
        this.intersectionGroup.add(barn1);
    }
    
    createIntersectionFence(start, end, offset, direction) {
        // Brown wooden fence matching screenshot - simple style
        const postMat = new THREE.MeshLambertMaterial({ color: 0x8B5A3C });
        const railMat = new THREE.MeshLambertMaterial({ color: 0x7A4A30 });
        const postSpacing = 5;
        const posts = [];
        
        if (direction === 'horizontal') {
            // Fence runs along X axis
            const step = start < end ? postSpacing : -postSpacing;
            for (let x = start; (step > 0 ? x < end : x > end); x += step) {
                const postGeo = new THREE.BoxGeometry(0.25, 1.6, 0.25);
                const post = new THREE.Mesh(postGeo, postMat);
                post.position.set(x, 0.8, offset);
                post.castShadow = true;
                this.intersectionGroup.add(post);
                
                posts.push({ x: x, z: offset });
            }
            // Rails
            for (let i = 0; i < posts.length - 1; i++) {
                const p1 = posts[i];
                const p2 = posts[i + 1];
                const length = Math.abs(p2.x - p1.x);
                const railGeo = new THREE.BoxGeometry(length, 0.12, 0.15);
                
                const topRail = new THREE.Mesh(railGeo, railMat);
                topRail.position.set((p1.x + p2.x) / 2, 1.3, offset);
                this.intersectionGroup.add(topRail);
                
                const bottomRail = new THREE.Mesh(railGeo, railMat);
                bottomRail.position.set((p1.x + p2.x) / 2, 0.5, offset);
                this.intersectionGroup.add(bottomRail);
            }
        } else {
            // Fence runs along Z axis
            const side = direction === 'vertical-left' ? -1 : 1;
            for (let z = start; z > end; z -= postSpacing) {
                const postGeo = new THREE.BoxGeometry(0.25, 1.6, 0.25);
                const post = new THREE.Mesh(postGeo, postMat);
                post.position.set(offset * side, 0.8, z);
                post.castShadow = true;
                this.intersectionGroup.add(post);
                
                posts.push({ x: offset * side, z: z });
            }
            // Rails
            for (let i = 0; i < posts.length - 1; i++) {
                const p1 = posts[i];
                const p2 = posts[i + 1];
                const length = Math.abs(p2.z - p1.z);
                const railGeo = new THREE.BoxGeometry(0.15, 0.12, length);
                
                const topRail = new THREE.Mesh(railGeo, railMat);
                topRail.position.set(offset * side, 1.3, (p1.z + p2.z) / 2);
                this.intersectionGroup.add(topRail);
                
                const bottomRail = new THREE.Mesh(railGeo, railMat);
                bottomRail.position.set(offset * side, 0.5, (p1.z + p2.z) / 2);
                this.intersectionGroup.add(bottomRail);
            }
        }
    }
    
    createStreetLight(x, z, rotationY = 0) {
        const lightGroup = new THREE.Group();

        // Base
        const baseGeo = new THREE.CylinderGeometry(0.28, 0.34, 0.35, 10);
        const baseMat = new THREE.MeshLambertMaterial({ color: 0x4A4A4A });
        const base = new THREE.Mesh(baseGeo, baseMat);
        base.position.y = 0.175;
        lightGroup.add(base);

        // Main pole
        const poleGeo = new THREE.CylinderGeometry(0.09, 0.12, 6.2, 10);
        const poleMat = new THREE.MeshLambertMaterial({ color: 0x7A7A7A });
        const pole = new THREE.Mesh(poleGeo, poleMat);
        pole.position.y = 3.45;
        pole.castShadow = true;
        lightGroup.add(pole);

        // Curved arm
        const armGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.8, 8);
        const arm = new THREE.Mesh(armGeo, poleMat);
        arm.position.set(0.7, 6.35, 0);
        arm.rotation.z = -Math.PI / 2.7;
        lightGroup.add(arm);

        // Lamp head
        const headGeo = new THREE.BoxGeometry(0.45, 0.22, 0.32);
        const headMat = new THREE.MeshLambertMaterial({ color: 0x2F2F2F });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.set(1.25, 6.05, 0);
        lightGroup.add(head);

        // Bulb glow (subtle)
        const bulbGeo = new THREE.SphereGeometry(0.08, 8, 8);
        const bulbMat = new THREE.MeshBasicMaterial({ color: 0xFFF2B0 });
        const bulb = new THREE.Mesh(bulbGeo, bulbMat);
        bulb.position.set(1.25, 5.92, 0);
        lightGroup.add(bulb);

        lightGroup.position.set(x, 0, z);
        lightGroup.rotation.y = rotationY;
        this.intersectionGroup.add(lightGroup);
    }
    
    createStopSign(x, z) {
        const signGroup = new THREE.Group();
        
        // Metal pole
        const postGeo = new THREE.CylinderGeometry(0.1, 0.1, 3.5, 8);
        const postMat = new THREE.MeshLambertMaterial({ color: 0x666666 });
        const post = new THREE.Mesh(postGeo, postMat);
        post.position.y = 1.75;
        post.castShadow = true;
        signGroup.add(post);
        
        if (this.textures.stopSign) {
            // Use Stop Sign PNG - face the approaching car (from +z direction)
            const material = new THREE.MeshBasicMaterial({
                map: this.textures.stopSign,
                transparent: true,
                alphaTest: 0.1,
                side: THREE.DoubleSide
            });
            const planeGeo = new THREE.PlaneGeometry(1.8, 1.8);
            const signPlane = new THREE.Mesh(planeGeo, material);
            signPlane.position.y = 3.8;
            // No rotation - default plane faces +z which is toward approaching car
            signGroup.add(signPlane);
        } else {
            // Fallback: 3D octagon
            const signShape = new THREE.Shape();
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2 - Math.PI / 8;
                const px = Math.cos(angle) * 0.9;
                const py = Math.sin(angle) * 0.9;
                if (i === 0) signShape.moveTo(px, py);
                else signShape.lineTo(px, py);
            }
            signShape.closePath();
            const signGeo = new THREE.ExtrudeGeometry(signShape, { depth: 0.05, bevelEnabled: false });
            const signMat = new THREE.MeshLambertMaterial({ color: 0xCC0000 });
            const sign = new THREE.Mesh(signGeo, signMat);
            sign.position.y = 3.8;
            sign.rotation.y = Math.PI;
            signGroup.add(sign);
            
            const borderShape = new THREE.Shape();
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2 - Math.PI / 8;
                const px = Math.cos(angle) * 0.75;
                const py = Math.sin(angle) * 0.75;
                if (i === 0) borderShape.moveTo(px, py);
                else borderShape.lineTo(px, py);
            }
            borderShape.closePath();
            const borderGeo = new THREE.ShapeGeometry(borderShape);
            const borderMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF, side: THREE.DoubleSide });
            const border = new THREE.Mesh(borderGeo, borderMat);
            border.position.set(0, 3.8, 0.06);
            border.rotation.y = Math.PI;
            signGroup.add(border);
        }
        
        signGroup.position.set(x, 0, z);
        this.intersectionGroup.add(signGroup);
    }
    
    createScenery() {
        this.sceneryObjects.forEach(obj => this.scene.remove(obj));
        this.sceneryObjects = [];
        
        // Generate random config for this intersection
        this.sceneryConfig = this.getRandomSceneryConfig();
        const config = this.sceneryConfig;
        
        // Create rich Tennessee scenery on both sides of the road
        this.createRoadsideScenery(config);
        
        // Add lake/pond based on config
        this.createLake(config);
    }
    
    createLake(config) {
        // Skip if config says no lake
        if (!config || config.lakeSide === 'none') {
            return;
        }
        
        // Create lake using PNG texture on a flat plane - randomly pick variant
        const lakeGroup = new THREE.Group();
        const carZ = this.car ? this.car.position.z : 70;
        const carX = this.car ? this.car.position.x : 0;
        
        const lakeTex = Math.random() > 0.5 ? this.textures.lake1 : this.textures.lake2;
        
        if (lakeTex) {
            const material = new THREE.MeshBasicMaterial({
                map: lakeTex,
                transparent: true,
                alphaTest: 0.05,
                side: THREE.DoubleSide,
                depthWrite: false
            });
            
            const lakeSize = 30 + Math.random() * 12;
            const planeGeo = new THREE.PlaneGeometry(lakeSize, lakeSize * 0.65);
            const lake = new THREE.Mesh(planeGeo, material);
            lake.rotation.x = -Math.PI / 2;
            
            // Position closer to road and further ahead for visibility
            const xOffset = config.lakeSide === 'left' ? -35 : 35;
            lake.position.set(carX + xOffset, 0.12, carZ - 30);
            lakeGroup.add(lake);
        } else {
            // Fallback to 3D lake
            const waterGeo = new THREE.CircleGeometry(20, 32);
            const waterMat = new THREE.MeshLambertMaterial({ color: 0x5A8A9A });
            const water = new THREE.Mesh(waterGeo, waterMat);
            water.rotation.x = -Math.PI / 2;
            const xOffset = config.lakeSide === 'left' ? -35 : 35;
            water.position.set(carX + xOffset, 0.1, carZ - 30);
            lakeGroup.add(water);
        }
        
        this.scene.add(lakeGroup);
        this.sceneryObjects.push(lakeGroup);
    }
    
    createRoadsideScenery(config) {
        const roadSide = this.ROAD_WIDTH / 2 + 8; // Larger buffer from road
        const carZ = this.car ? this.car.position.z : 70;
        const carX = this.car ? this.car.position.x : 0;
        
        // Use config values or defaults
        const treeCount = config ? config.treeCount : 10;
        const bushCount = config ? config.bushCount : 8;
        const rockCount = config ? config.rockCount : 5;
        const treeStyle = config ? config.treeStyle : 'mixed';
        const fenceType = config ? config.fenceType : 'long';
        const barnSide = config ? config.barnSide : 'left';
        
        // Trees along both sides - FAR from road, only AHEAD of car (not behind)
        for (let z = carZ - 10; z > carZ - 70; z -= 20) {
            // Left side trees - far from road
            const leftTree = this.createTree(treeStyle);
            leftTree.position.set(carX - roadSide - 14 - Math.random() * 6, 0, z + Math.random() * 3);
            this.scene.add(leftTree);
            this.sceneryObjects.push(leftTree);
            
            // Right side trees - far from road
            const rightTree = this.createTree(treeStyle);
            rightTree.position.set(carX + roadSide + 14 + Math.random() * 6, 0, z + Math.random() * 3);
            this.scene.add(rightTree);
            this.sceneryObjects.push(rightTree);
        }
        
        // Fences along both sides - STOP before intersection so cross-road openings are clear
        this.createFence(carX - roadSide - 6, carZ - 25, carZ - 55, 'left', fenceType);
        this.createFence(carX + roadSide + 6, carZ - 25, carZ - 55, 'right', fenceType);
        
        // Single barn on configured side - CLOSER to road for visibility
        const barn = this.createBarn();
        const barnX = barnSide === 'left' ? carX - 31 : carX + 31;
        barn.position.set(barnX, 0, carZ - 40);
        barn.rotation.y = this.car ? this.car.rotation.y : 0; // Face toward camera
        this.scene.add(barn);
        this.sceneryObjects.push(barn);
        
        // House on opposite side of barn for Tennessee residential feel
        const house = this.createHouse();
        const houseX = barnSide === 'left' ? carX + 34 : carX - 34;
        house.position.set(houseX, 0, carZ - 55);
        house.rotation.y = this.car ? this.car.rotation.y : 0;
        this.scene.add(house);
        this.sceneryObjects.push(house);
        
        // Billboard along the road (branding per specs)
        const billboard = this.createBillboard();
        const bbSide = Math.random() > 0.5 ? -1 : 1;
        billboard.position.set(carX + bbSide * (roadSide + 11), 0, carZ - 60);
        billboard.rotation.y = this.car ? this.car.rotation.y : 0;
        this.scene.add(billboard);
        this.sceneryObjects.push(billboard);
        
        // Johnson McGinnis roadside sign
        const jmSign = this.createRoadsideSign();
        const jmSide = Math.random() > 0.5 ? -1 : 1;
        jmSign.position.set(carX + jmSide * (roadSide + 8), 0, carZ - 30);
        jmSign.rotation.y = this.car ? this.car.rotation.y : 0;
        this.scene.add(jmSign);
        this.sceneryObjects.push(jmSign);
        
        // Additional scattered trees in fields - MINIMUM 40 from road center, only AHEAD
        for (let i = 0; i < treeCount; i++) {
            const tree = this.createTree(treeStyle);
            const side = Math.random() > 0.5 ? -1 : 1;
            tree.position.set(
                carX + side * (34 + Math.random() * 24),
                0,
                carZ - 10 - Math.random() * 60 // Only ahead of car
            );
            this.scene.add(tree);
            this.sceneryObjects.push(tree);
        }
        
        // Add bushes/shrubs - MINIMUM 30 from road center, only AHEAD
        for (let i = 0; i < bushCount; i++) {
            const bush = this.createBush();
            const side = Math.random() > 0.5 ? -1 : 1;
            bush.position.set(
                carX + side * (26 + Math.random() * 20),
                0,
                carZ - 5 - Math.random() * 55 // Only ahead
            );
            this.scene.add(bush);
            this.sceneryObjects.push(bush);
        }
        
        // Add rocks scattered around - MINIMUM 25 from road center, only AHEAD
        for (let i = 0; i < rockCount; i++) {
            const rock = this.createRock();
            const side = Math.random() > 0.5 ? -1 : 1;
            rock.position.set(
                carX + side * (22 + Math.random() * 24),
                0,
                carZ - 5 - Math.random() * 60 // Only ahead
            );
            this.scene.add(rock);
            this.sceneryObjects.push(rock);
        }
    }
    
    createRock() {
        const rock = new THREE.Group();
        
        const rockTextures = [
            this.textures.rockSmall,
            this.textures.rockMedium,
            this.textures.rockLarge,
        ].filter(t => t);
        
        if (rockTextures.length > 0) {
            const selectedTexture = rockTextures[Math.floor(Math.random() * rockTextures.length)];
            const material = new THREE.SpriteMaterial({
                map: selectedTexture,
                transparent: true,
                alphaTest: 0.1,
                sizeAttenuation: true
            });
            const sprite = new THREE.Sprite(material);
            const scale = 2 + Math.random() * 2;
            sprite.scale.set(scale, scale * 0.7, 1);
            // Anchor at bottom center
            sprite.center.set(0.5, 0);
            sprite.position.y = 0;
            rock.add(sprite);
        } else {
            // Fallback to 3D rock
            const rockMat = new THREE.MeshLambertMaterial({ color: 0x888888 });
            const rockGeo = new THREE.DodecahedronGeometry(0.8, 0);
            const rockMesh = new THREE.Mesh(rockGeo, rockMat);
            rockMesh.scale.set(1, 0.6, 1);
            rockMesh.position.y = 0.4;
            rock.add(rockMesh);
        }
        
        return rock;
    }
    
    createBush() {
        // Use PNG bush sprites if available
        const bush = new THREE.Group();
        
        const bushTextures = [
            this.textures.bushSmall,
            this.textures.bushMedium,
            this.textures.bushLarge,
        ].filter(t => t);
        
        if (bushTextures.length > 0) {
            const selectedTexture = bushTextures[Math.floor(Math.random() * bushTextures.length)];
            const material = new THREE.SpriteMaterial({
                map: selectedTexture,
                transparent: true,
                alphaTest: 0.1,
                sizeAttenuation: true
            });
            const sprite = new THREE.Sprite(material);
            const scale = 3 + Math.random() * 2;
            const height = scale * 0.8;
            sprite.scale.set(scale, height, 1);
            // Anchor at bottom center
            sprite.center.set(0.5, 0);
            sprite.position.y = 0;
            bush.add(sprite);
        } else {
            // Fallback to 3D bush
            const bushMat = new THREE.MeshLambertMaterial({ color: 0x3D5030 });
            const bushGeo = new THREE.SphereGeometry(1.5, 12, 8);
            const bushMesh = new THREE.Mesh(bushGeo, bushMat);
            bushMesh.scale.set(1, 0.6, 1);
            bushMesh.position.y = 0.8;
            bush.add(bushMesh);
        }
        
        const scale = 0.6 + Math.random() * 0.5;
        bush.scale.set(scale, scale, scale);
        
        return bush;
    }
    
    createTree(style = 'mixed') {
        const tree = new THREE.Group();
        
        // Only use assets2 trees (Tree 1/2/3)
        const treeTextures = [
            this.textures.tree1,
            this.textures.tree2,
            this.textures.tree3,
        ].filter(t => t);
        
        if (treeTextures.length > 0) {
            const selectedTexture = treeTextures[Math.floor(Math.random() * treeTextures.length)];
            const material = new THREE.SpriteMaterial({
                map: selectedTexture,
                transparent: true,
                alphaTest: 0.1,
                sizeAttenuation: true
            });
            const sprite = new THREE.Sprite(material);
            const scale = 8 + Math.random() * 4; // Size variation
            sprite.scale.set(scale, scale * 1.2, 1);
            // Anchor at bottom center so tree sits on ground
            sprite.center.set(0.5, 0);
            sprite.position.y = 0;
            tree.add(sprite);
        } else {
            // Fallback to 3D tree if PNGs not loaded
            const treeType = Math.random();
            
            // Trunk
            const trunkGeo = new THREE.CylinderGeometry(0.2, 0.3, 3, 8);
            const trunkMat = new THREE.MeshLambertMaterial({ color: 0x5D4037 });
            const trunk = new THREE.Mesh(trunkGeo, trunkMat);
            trunk.position.y = 1.5;
            tree.add(trunk);
            
            if (treeType < 0.25) {
                const fallColors = [0xB85C38, 0xC96A40, 0xA85030, 0xD07848];
                const foliageColor = fallColors[Math.floor(Math.random() * fallColors.length)];
                const foliageMat = new THREE.MeshLambertMaterial({ color: foliageColor });
                const canopyGeo = new THREE.SphereGeometry(2.8, 16, 12);
                const canopy = new THREE.Mesh(canopyGeo, foliageMat);
                canopy.position.y = 5;
                canopy.scale.set(1, 0.85, 1);
                tree.add(canopy);
            } else {
                const greenColors = [0x4A7040, 0x3D6035, 0x456838, 0x3A5830, 0x4D7545];
                const foliageColor = greenColors[Math.floor(Math.random() * greenColors.length)];
                const foliageMat = new THREE.MeshLambertMaterial({ color: foliageColor });
                const canopyGeo = new THREE.SphereGeometry(2.8, 16, 12);
                const canopy = new THREE.Mesh(canopyGeo, foliageMat);
                canopy.position.y = 5;
                canopy.scale.set(1, 0.85, 1);
                tree.add(canopy);
            }
        }
        
        const scale = 0.8 + Math.random() * 0.4;
        tree.scale.set(scale, scale, scale);
        
        return tree;
    }
    
    createFence(x, startZ, endZ, side, fenceType = 'long') {
        const fenceGroup = new THREE.Group();
        
        // Use PNG fence texture based on type
        const fenceTexture = fenceType === 'long' ? 
            (this.textures.fenceLong || this.textures.fenceShort) : 
            (this.textures.fenceShort || this.textures.fenceLong);
        
        if (fenceTexture) {
            const material = new THREE.MeshBasicMaterial({
                map: fenceTexture,
                transparent: true,
                alphaTest: 0.1,
                side: THREE.DoubleSide
            });
            
            // Place fence planes along the path - rotated to face road
            const spacing = fenceType === 'long' ? 15 : 10;
            for (let z = startZ; z >= endZ; z -= spacing) {
                const fenceWidth = fenceType === 'long' ? 15 : 10;
                const planeGeo = new THREE.PlaneGeometry(fenceWidth, 4);
                const plane = new THREE.Mesh(planeGeo, material);
                plane.position.set(x, 2, z);
                // Rotate to face the road (perpendicular to road)
                plane.rotation.y = side === 'left' ? Math.PI / 2 : -Math.PI / 2;
                fenceGroup.add(plane);
            }
        } else {
            // Fallback to 3D fence
            const postMat = new THREE.MeshLambertMaterial({ color: 0x8B5A3C });
            const railMat = new THREE.MeshLambertMaterial({ color: 0x7A4A30 });
            
            const postSpacing = 5;
            const posts = [];
            
            for (let z = startZ; z >= endZ; z -= postSpacing) {
                const postGeo = new THREE.BoxGeometry(0.25, 1.6, 0.25);
                const post = new THREE.Mesh(postGeo, postMat);
                post.position.set(x, 0.8, z);
                fenceGroup.add(post);
                posts.push({ x, z });
            }
            
            for (let i = 0; i < posts.length - 1; i++) {
                const p1 = posts[i];
                const p2 = posts[i + 1];
                const length = Math.abs(p2.z - p1.z);
                
                const railGeo = new THREE.BoxGeometry(0.15, 0.12, length);
                const topRail = new THREE.Mesh(railGeo, railMat);
                topRail.position.set(x, 1.3, (p1.z + p2.z) / 2);
                fenceGroup.add(topRail);
                
                const bottomRail = new THREE.Mesh(railGeo, railMat);
                bottomRail.position.set(x, 0.5, (p1.z + p2.z) / 2);
                fenceGroup.add(bottomRail);
            }
        }
        
        this.scene.add(fenceGroup);
        this.sceneryObjects.push(fenceGroup);
    }
    
    createBarn() {
        const barn = new THREE.Group();
        
        // Use PNG barn texture on a PlaneGeometry (not sprite - avoids floating issues)
        if (this.textures.barn) {
            const material = new THREE.MeshBasicMaterial({
                map: this.textures.barn,
                transparent: true,
                alphaTest: 0.1,
                side: THREE.DoubleSide
            });
            const width = 20;
            const height = 16;
            const planeGeo = new THREE.PlaneGeometry(width, height);
            // Shift geometry so bottom edge is at local y=0 (grounded)
            planeGeo.translate(0, height / 2, 0);
            const plane = new THREE.Mesh(planeGeo, material);
            // Push down slightly to bury the transparent bottom pixels of the PNG
            plane.position.y = -4.5;
            barn.add(plane);
        } else {
            // Fallback to 3D barn
            const wallCanvas = document.createElement('canvas');
            wallCanvas.width = 256;
            wallCanvas.height = 256;
            const wCtx = wallCanvas.getContext('2d');
            
            wCtx.fillStyle = '#A83232';
            wCtx.fillRect(0, 0, 256, 256);
            
            wCtx.strokeStyle = '#8B2828';
            wCtx.lineWidth = 1;
            for (let y = 0; y < 256; y += 16) {
                wCtx.beginPath();
                wCtx.moveTo(0, y);
                wCtx.lineTo(256, y);
                wCtx.stroke();
            }
            
            const wallTexture = new THREE.CanvasTexture(wallCanvas);
            const wallMat = new THREE.MeshLambertMaterial({ map: wallTexture });
            const roofMat = new THREE.MeshLambertMaterial({ color: 0x6B6B6B });
            
            const wallsGeo = new THREE.BoxGeometry(12, 8, 14);
            const walls = new THREE.Mesh(wallsGeo, wallMat);
            walls.position.y = 4;
            barn.add(walls);
            
            const roofShape = new THREE.Shape();
            roofShape.moveTo(-7, 0);
            roofShape.lineTo(-6, 3);
            roofShape.lineTo(-3, 5);
            roofShape.lineTo(0, 5.5);
            roofShape.lineTo(3, 5);
            roofShape.lineTo(6, 3);
            roofShape.lineTo(7, 0);
            roofShape.closePath();
            
            const roofGeo = new THREE.ExtrudeGeometry(roofShape, { depth: 15, bevelEnabled: false });
            const roof = new THREE.Mesh(roofGeo, roofMat);
            roof.rotation.x = -Math.PI / 2;
            roof.position.set(0, 8, 7.5);
            barn.add(roof);
        }
        
        return barn;
    }
    
    createBillboard() {
        const billboard = new THREE.Group();
        
        // Randomly pick billboard variant
        const bbTextures = [this.textures.billboard1, this.textures.billboard2].filter(t => t);
        
        if (bbTextures.length > 0) {
            const selectedTexture = bbTextures[Math.floor(Math.random() * bbTextures.length)];
            const material = new THREE.MeshBasicMaterial({
                map: selectedTexture,
                transparent: true,
                alphaTest: 0.1,
                side: THREE.DoubleSide
            });
            
            // Billboard panel
            const panelGeo = new THREE.PlaneGeometry(10, 6);
            const panel = new THREE.Mesh(panelGeo, material);
            panel.position.y = 9; // Elevated on posts
            billboard.add(panel);
            
            // Two support posts
            const postMat = new THREE.MeshLambertMaterial({ color: 0x666666 });
            const postGeo = new THREE.CylinderGeometry(0.15, 0.18, 7, 8);
            const leftPost = new THREE.Mesh(postGeo, postMat);
            leftPost.position.set(-3, 3.5, 0);
            leftPost.castShadow = true;
            billboard.add(leftPost);
            
            const rightPost = new THREE.Mesh(postGeo, postMat);
            rightPost.position.set(3, 3.5, 0);
            rightPost.castShadow = true;
            billboard.add(rightPost);
        } else {
            // Fallback: colored rectangle with text shape
            const panelMat = new THREE.MeshLambertMaterial({ color: 0xF5A623 });
            const panelGeo = new THREE.BoxGeometry(10, 5, 0.3);
            const panel = new THREE.Mesh(panelGeo, panelMat);
            panel.position.y = 8;
            billboard.add(panel);
            
            const postMat = new THREE.MeshLambertMaterial({ color: 0x666666 });
            const postGeo = new THREE.CylinderGeometry(0.15, 0.18, 6, 8);
            const post = new THREE.Mesh(postGeo, postMat);
            post.position.set(0, 3, 0);
            billboard.add(post);
        }
        
        return billboard;
    }
    
    createHouse() {
        const house = new THREE.Group();
        
        // Randomly pick house variant
        const houseTextures = [
            this.textures.house1, 
            this.textures.house2, 
            this.textures.house3
        ].filter(t => t);
        
        if (houseTextures.length > 0) {
            const selectedTexture = houseTextures[Math.floor(Math.random() * houseTextures.length)];
            const material = new THREE.MeshBasicMaterial({
                map: selectedTexture,
                transparent: true,
                alphaTest: 0.1,
                side: THREE.DoubleSide
            });
            
            const width = 14;
            const height = 12;
            const planeGeo = new THREE.PlaneGeometry(width, height);
            const plane = new THREE.Mesh(planeGeo, material);
            // Position so bottom sits on ground
            plane.position.y = height / 2 - 1;
            house.add(plane);
        } else {
            // Fallback: simple 3D house
            const wallMat = new THREE.MeshLambertMaterial({ color: 0xDEB887 });
            const wallsGeo = new THREE.BoxGeometry(8, 6, 8);
            const walls = new THREE.Mesh(wallsGeo, wallMat);
            walls.position.y = 3;
            house.add(walls);
            
            const roofMat = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
            const roofGeo = new THREE.ConeGeometry(6.5, 3, 4);
            const roof = new THREE.Mesh(roofGeo, roofMat);
            roof.position.y = 7.5;
            roof.rotation.y = Math.PI / 4;
            house.add(roof);
        }
        
        return house;
    }
    
    createCar() {
        this.car = new THREE.Group();
        
        if (this.textures.car) {
            // Use Car.png as a sprite (rear view - auto-faces camera)
            const material = new THREE.SpriteMaterial({
                map: this.textures.car,
                transparent: true,
                alphaTest: 0.05,
                sizeAttenuation: true
            });
            const sprite = new THREE.Sprite(material);
            // Scale to match approximate car size (width ~3.5, height ~3.0)
            sprite.scale.set(4.0, 3.2, 1);
            // Anchor at bottom center so car sits on road
            sprite.center.set(0.5, 0.05);
            sprite.position.y = 0;
            this.car.add(sprite);
        } else {
            // Fallback: simple 3D copper box car
            const bodyMat = new THREE.MeshPhongMaterial({ color: 0xB87333, shininess: 100 });
            const mainBody = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.9, 4.8), bodyMat);
            mainBody.position.set(0, 0.7, 0);
            this.car.add(mainBody);
            const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.8, 2.4), bodyMat);
            cabin.position.set(0, 1.55, 0.2);
            this.car.add(cabin);
            // Simple wheels
            const darkMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
            [[-1, -1.4], [1, -1.4], [-1, 1.4], [1, 1.4]].forEach(([x, z]) => {
                const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.32, 16), darkMat);
                tire.rotation.z = Math.PI / 2;
                tire.position.set(x, 0.42, z);
                this.car.add(tire);
            });
        }
        
        // Car starting position
        this.car.position.set(0, 0, 70);
        this.car.rotation.y = 0;
        
        this.scene.add(this.car);
    }
    
    positionIntersectionAhead() {
        const dist = this.INTERSECTION_DISTANCE;
        const ix = this.car.position.x - Math.sin(this.car.rotation.y) * dist;
        const iz = this.car.position.z - Math.cos(this.car.rotation.y) * dist;
        
        this.intersectionGroup.position.set(ix, 0, iz);
        this.intersectionGroup.rotation.y = this.car.rotation.y;
        this.intersectionGroup.visible = true;
        
        // Reposition main road using car's forward direction
        const roadOffset = 100;
        const roadX = this.car.position.x - Math.sin(this.car.rotation.y) * roadOffset;
        const roadZ = this.car.position.z - Math.cos(this.car.rotation.y) * roadOffset;
        this.roadGroup.position.set(roadX, 0, roadZ);
        this.roadGroup.rotation.y = this.car.rotation.y;
        
        // Reposition sky and hills to follow the car
        if (this.sky) {
            this.sky.position.copy(this.car.position);
        }
        if (this.hillGroup) {
            // 360° panorama ring: center on car, NO rotation
            this.hillGroup.position.set(this.car.position.x, 0, this.car.position.z);
        }
        if (this.ground) {
            this.ground.position.set(this.car.position.x, -0.1, this.car.position.z);
        }
        
        // Only create scenery if not already created for this road segment
        if (!this.currentRoadSceneryCreated) {
            this.createScenery();
            this.currentRoadSceneryCreated = true;
        }
        
        // Only pre-generate once per intersection
        if (!this.pregenSceneryCreated) {
            this.pregenerateAllDirections();
            this.pregenSceneryCreated = true;
        }
    }
    
    pregenerateAllDirections() {
        // Clear any existing pre-generated scenery
        ['left', 'right', 'straight'].forEach(dir => {
            this.pregenScenery[dir].objects.forEach(obj => this.scene.remove(obj));
            this.pregenScenery[dir].objects = [];
        });
        
        const intX = this.intersectionGroup.position.x;
        const intZ = this.intersectionGroup.position.z;
        const intRot = this.intersectionGroup.rotation.y;
        const exitDist = 40; // Match turn() exitDist so scenery aligns with car position
        
        // Generate for each direction
        ['left', 'right', 'straight'].forEach(direction => {
            let endX, endZ, endRot;
            
            if (direction === 'left') {
                endRot = intRot + Math.PI / 2;
                endX = intX - Math.cos(intRot) * exitDist;
                endZ = intZ + Math.sin(intRot) * exitDist;
            } else if (direction === 'right') {
                endRot = intRot - Math.PI / 2;
                endX = intX + Math.cos(intRot) * exitDist;
                endZ = intZ - Math.sin(intRot) * exitDist;
            } else {
                endRot = intRot;
                endX = intX - Math.sin(intRot) * exitDist;
                endZ = intZ - Math.cos(intRot) * exitDist;
            }
            
            // Generate config for this direction
            this.pregenScenery[direction].config = this.getRandomSceneryConfig();
            
            // Pre-generate scenery objects (but keep them invisible)
            const objects = this.createSceneryForDirection(endX, endZ, endRot, this.pregenScenery[direction].config);
            this.pregenScenery[direction].objects = objects;
            
            // Hide pre-generated scenery until direction is chosen
            objects.forEach(obj => {
                obj.visible = false;
                this.scene.add(obj);
            });
        });
    }
    
    createSceneryForDirection(carX, carZ, carRot, config) {
        const objects = [];
        const roadSide = this.ROAD_WIDTH / 2 + 8;
        const treeStyle = config.treeStyle;
        
        // Trees along both sides - CLOSE to road like the first scene (~12-20 from road edge)
        // Start at 30 to clear the intersection area
        for (let dist = 30; dist < 100; dist += 12) {
            const baseX = carX - Math.sin(carRot) * dist;
            const baseZ = carZ - Math.cos(carRot) * dist;
            
            // Left side tree
            const leftTree = this.createTree(treeStyle);
            const leftOffset = roadSide + 10 + Math.random() * 6;
            leftTree.position.set(
                baseX - Math.cos(carRot) * leftOffset,
                0,
                baseZ + Math.sin(carRot) * leftOffset
            );
            objects.push(leftTree);
            
            // Right side tree
            const rightTree = this.createTree(treeStyle);
            const rightOffset = roadSide + 10 + Math.random() * 6;
            rightTree.position.set(
                baseX + Math.cos(carRot) * rightOffset,
                0,
                baseZ - Math.sin(carRot) * rightOffset
            );
            objects.push(rightTree);
        }
        
        // Fences along both sides - CLOSE to road (~6 from road edge, matching first scene)
        const fenceGroup = this.createFenceForDirection(carX, carZ, carRot, roadSide, config.fenceType);
        if (fenceGroup) objects.push(fenceGroup);
        
        // Barn on configured side - close to road for visibility (~28 from center)
        if (config.barnSide !== 'none') {
            const barn = this.createBarn();
            const barnSide = config.barnSide === 'left' ? -1 : 1;
            const barnDist = 32 + Math.random() * 12;
            barn.position.set(
                carX - Math.sin(carRot) * barnDist + Math.cos(carRot) * barnSide * 24,
                0,
                carZ - Math.cos(carRot) * barnDist - Math.sin(carRot) * barnSide * 24
            );
            barn.rotation.y = carRot;
            objects.push(barn);
        }
        
        // 2 houses on random sides, close to road
        for (let h = 0; h < 2; h++) {
            const hSide = (h === 0) ? (config.barnSide === 'left' ? 1 : -1) : (Math.random() > 0.5 ? 1 : -1);
            const house = this.createHouse();
            const houseDist = 36 + h * 22 + Math.random() * 8;
            house.position.set(
                carX - Math.sin(carRot) * houseDist + Math.cos(carRot) * hSide * (24 + Math.random() * 5),
                0,
                carZ - Math.cos(carRot) * houseDist - Math.sin(carRot) * hSide * (24 + Math.random() * 5)
            );
            house.rotation.y = carRot;
            objects.push(house);
        }
        
        // Billboard along the road (branding per specs)
        const billboard = this.createBillboard();
        const bbSide = Math.random() > 0.5 ? -1 : 1;
        const bbDist = 50 + Math.random() * 12;
        billboard.position.set(
            carX - Math.sin(carRot) * bbDist + Math.cos(carRot) * bbSide * (roadSide + 5),
            0,
            carZ - Math.cos(carRot) * bbDist - Math.sin(carRot) * bbSide * (roadSide + 5)
        );
        billboard.rotation.y = carRot;
        objects.push(billboard);
        
        // Second billboard for extra branding (opposite side, different distance)
        const billboard2 = this.createBillboard();
        const bb2Side = -bbSide;
        const bb2Dist = 25 + Math.random() * 10;
        billboard2.position.set(
            carX - Math.sin(carRot) * bb2Dist + Math.cos(carRot) * bb2Side * (roadSide + 8),
            0,
            carZ - Math.cos(carRot) * bb2Dist - Math.sin(carRot) * bb2Side * (roadSide + 8)
        );
        billboard2.rotation.y = carRot;
        objects.push(billboard2);
        
        // Johnson McGinnis roadside sign for subtle branding
        const jmSign = this.createRoadsideSign();
        const jmSide = Math.random() > 0.5 ? -1 : 1;
        const jmDist = 70 + Math.random() * 15;
        jmSign.position.set(
            carX - Math.sin(carRot) * jmDist + Math.cos(carRot) * jmSide * (roadSide + 4),
            0,
            carZ - Math.cos(carRot) * jmDist - Math.sin(carRot) * jmSide * (roadSide + 4)
        );
        jmSign.rotation.y = carRot;
        objects.push(jmSign);
        
        // Lake — always included, closer to road
        const lake = this.createLakeForDirection(carX, carZ, carRot, config.lakeSide);
        if (lake) objects.push(lake);
        
        // Bushes close to road (matching first scene ~15-30 from road center)
        for (let i = 0; i < config.bushCount; i++) {
            const bush = this.createBush();
            const side = Math.random() > 0.5 ? -1 : 1;
            const dist = 10 + Math.random() * 65;
            bush.position.set(
                carX - Math.sin(carRot) * dist + Math.cos(carRot) * side * (13 + Math.random() * 16),
                0,
                carZ - Math.cos(carRot) * dist - Math.sin(carRot) * side * (13 + Math.random() * 16)
            );
            objects.push(bush);
        }
        
        // Rocks scattered close, matching first scene
        for (let i = 0; i < config.rockCount; i++) {
            const rock = this.createRock();
            const side = Math.random() > 0.5 ? -1 : 1;
            const dist = 10 + Math.random() * 60;
            rock.position.set(
                carX - Math.sin(carRot) * dist + Math.cos(carRot) * side * (13 + Math.random() * 20),
                0,
                carZ - Math.cos(carRot) * dist - Math.sin(carRot) * side * (13 + Math.random() * 20)
            );
            objects.push(rock);
        }
        
        return objects;
    }
    
    // Create fences along a road direction (for pregenerated scenery)
    createFenceForDirection(carX, carZ, carRot, sideOffset, fenceType) {
        const fenceGroup = new THREE.Group();
        const fenceTexture = fenceType === 'long' ? 
            (this.textures.fenceLong || this.textures.fenceShort) : 
            (this.textures.fenceShort || this.textures.fenceLong);
        
        if (fenceTexture) {
            const material = new THREE.MeshBasicMaterial({
                map: fenceTexture,
                transparent: true,
                alphaTest: 0.1,
                side: THREE.DoubleSide
            });
            
            const spacing = fenceType === 'long' ? 15 : 10;
            const fenceWidth = fenceType === 'long' ? 15 : 10;
            
            // Place fences on both sides along the road — start past intersection area
            for (let dist = 40; dist < 120; dist += spacing) {
                const baseX = carX - Math.sin(carRot) * dist;
                const baseZ = carZ - Math.cos(carRot) * dist;
                
                // Left fence
                const leftPlaneGeo = new THREE.PlaneGeometry(fenceWidth, 4);
                const leftFence = new THREE.Mesh(leftPlaneGeo, material);
                leftFence.position.set(
                    baseX - Math.cos(carRot) * sideOffset,
                    2,
                    baseZ + Math.sin(carRot) * sideOffset
                );
                leftFence.rotation.y = carRot + Math.PI / 2;
                fenceGroup.add(leftFence);
                
                // Right fence
                const rightPlaneGeo = new THREE.PlaneGeometry(fenceWidth, 4);
                const rightFence = new THREE.Mesh(rightPlaneGeo, material);
                rightFence.position.set(
                    baseX + Math.cos(carRot) * sideOffset,
                    2,
                    baseZ - Math.sin(carRot) * sideOffset
                );
                rightFence.rotation.y = carRot + Math.PI / 2;
                fenceGroup.add(rightFence);
            }
        }
        
        return fenceGroup;
    }
    
    // Create lake for a specific road direction
    createLakeForDirection(carX, carZ, carRot, lakeSide) {
        // Randomly pick between two lake variants
        const lakeTex = Math.random() > 0.5 ? this.textures.lake1 : this.textures.lake2;
        if (!lakeTex) return null;
        
        const lakeGroup = new THREE.Group();
        const material = new THREE.MeshBasicMaterial({
            map: lakeTex,
            transparent: true,
            alphaTest: 0.05,
            side: THREE.DoubleSide,
            depthWrite: false
        });
        
        const lakeSize = 25 + Math.random() * 10;
        const planeGeo = new THREE.PlaneGeometry(lakeSize, lakeSize * 0.65);
        const lake = new THREE.Mesh(planeGeo, material);
        lake.rotation.x = -Math.PI / 2; // Lay flat
        
        // Position lake closer to road (matching first scene ~20 from center)
        const sideMultiplier = lakeSide === 'left' ? -1 : 1;
        const distAhead = 35 + Math.random() * 15;
        lake.position.set(
            carX - Math.sin(carRot) * distAhead + Math.cos(carRot) * sideMultiplier * 20,
            0.12,
            carZ - Math.cos(carRot) * distAhead - Math.sin(carRot) * sideMultiplier * 20
        );
        
        lakeGroup.add(lake);
        return lakeGroup;
    }

    updateCamera(instant = false) {
        if (!this.car) return;
        
        const behindX = this.car.position.x + Math.sin(this.car.rotation.y) * this.cameraOffset.z;
        const behindZ = this.car.position.z + Math.cos(this.car.rotation.y) * this.cameraOffset.z;
        const targetY = this.cameraOffset.y;
        
        if (instant) {
            this.camera.position.set(behindX, targetY, behindZ);
        } else {
            const smoothing = this.state === 'TURNING' ? 0.025 : 0.05;
            this.camera.position.x += (behindX - this.camera.position.x) * smoothing;
            this.camera.position.y += (targetY - this.camera.position.y) * smoothing;
            this.camera.position.z += (behindZ - this.camera.position.z) * smoothing;
        }
        
        const lookX = this.car.position.x - Math.sin(this.car.rotation.y) * 12;
        const lookZ = this.car.position.z - Math.cos(this.car.rotation.y) * 12;
        this.camera.lookAt(lookX, 1.2, lookZ);
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        // Skip updates when paused
        if (this.paused) {
            // Still render once so the scene stays visible
            if (this.renderer && this.scene && this.camera) {
                this.renderer.render(this.scene, this.camera);
            }
            return;
        }
        
        // Clamp delta to prevent time jumps (e.g. after tab switch)
        const delta = Math.min(this.clock.getDelta(), 0.1);
        this.update(delta);
        this.renderer.render(this.scene, this.camera);
    }
    
    update(delta) {
        if (this.state === 'DRIVING' || this.state === 'POST_TURN_DRIVING') {
            this.car.position.y = Math.sin(Date.now() * 0.005) * 0.03;
            
            this.car.position.x -= Math.sin(this.car.rotation.y) * this.carSpeed * delta;
            this.car.position.z -= Math.cos(this.car.rotation.y) * this.carSpeed * delta;
            
            this.carSpeed += (this.targetCarSpeed - this.carSpeed) * 3 * delta;
        }
        
        if (this.state === 'APPROACHING') {
            // Car stops BEFORE the intersection center (about 12 units back)
            const stopOffset = 12;
            const stopX = this.intersectionGroup.position.x + Math.sin(this.intersectionGroup.rotation.y) * stopOffset;
            const stopZ = this.intersectionGroup.position.z + Math.cos(this.intersectionGroup.rotation.y) * stopOffset;
            
            const dx = this.car.position.x - stopX;
            const dz = this.car.position.z - stopZ;
            const distToStop = Math.sqrt(dx * dx + dz * dz);
            
            // Slow down based on distance to stop point
            const targetSpeed = Math.max(0.3, distToStop * 0.3);
            this.carSpeed += (targetSpeed - this.carSpeed) * 2 * delta;
            
            this.car.position.x -= Math.sin(this.car.rotation.y) * this.carSpeed * delta;
            this.car.position.z -= Math.cos(this.car.rotation.y) * this.carSpeed * delta;
            
            this.car.position.y = Math.sin(Date.now() * 0.003) * 0.02 * Math.max(0.1, this.carSpeed / 15);
            
            // Stop when close to stop point
            if (distToStop < 1.5) {
                this.setState('STOPPED');
                this.carSpeed = 0;
                // Snap to exact stop position
                this.car.position.x = stopX;
                this.car.position.z = stopZ;
                if (this.onStopAtIntersection) {
                    this.onStopAtIntersection();
                }
            }
        }
        
        if (this.state === 'TURNING') {
            // Very slow, realistic turn speed
            this.turnProgress += delta * 0.25;
            
            if (this.turnProgress >= 1) {
                this.turnProgress = 1;
                this.completeTurn();
                return;
            }
            
            // Use smooth easing
            const t = this.easeInOutQuad(this.turnProgress);
            
            // For turns, use curved path (quadratic bezier)
            if (this.turnStartPos && this.turnEndPos && this.turnControlPoint) {
                // Quadratic bezier curve for realistic car path
                const oneMinusT = 1 - t;
                this.car.position.x = oneMinusT * oneMinusT * this.turnStartPos.x + 
                                     2 * oneMinusT * t * this.turnControlPoint.x + 
                                     t * t * this.turnEndPos.x;
                this.car.position.z = oneMinusT * oneMinusT * this.turnStartPos.z + 
                                     2 * oneMinusT * t * this.turnControlPoint.z + 
                                     t * t * this.turnEndPos.z;
            }
            
            // Rotate car smoothly - delay rotation slightly for realism
            const rotT = this.easeInOutQuad(Math.max(0, (this.turnProgress - 0.1) / 0.8));
            this.car.rotation.y = this.turnStartRot + (this.turnEndRot - this.turnStartRot) * rotT;
            
            // Slight bounce
            this.car.position.y = Math.sin(this.turnProgress * Math.PI) * 0.03;
        }
        
        if (this.state === 'ARRIVING') {
            // Drive steadily toward the parking area
            const targetSpeed = Math.max(4, this.carSpeed * 0.995);
            this.carSpeed = targetSpeed;
            
            this.car.position.x -= Math.sin(this.car.rotation.y) * this.carSpeed * delta;
            this.car.position.z -= Math.cos(this.car.rotation.y) * this.carSpeed * delta;
            
            // Subtle driving bounce
            this.car.position.y = Math.sin(Date.now() * 0.004) * 0.02;
            
            // Start parking when approaching the spot
            if (this.parkingSpot) {
                const dx = this.car.position.x - this.parkingSpot.x;
                const dz = this.car.position.z - this.parkingSpot.z;
                const distToParking = Math.sqrt(dx * dx + dz * dz);
                
                if (distToParking < 18) {
                    this.setState('PARKING');
                    this.parkingProgress = 0;
                    this.parkingStartPos = { x: this.car.position.x, z: this.car.position.z };
                    this.parkingStartRot = this.car.rotation.y;
                    this.parkingTargetRot = this.car.rotation.y;
                    this.parkingWaitStarted = false;
                }
            } else if (this.carSpeed < 0.5) {
                this.carSpeed = 0;
                if (this.onArrivalComplete) this.onArrivalComplete();
            }
        }
        
        if (this.state === 'PARKING') {
            // Two phases: (1) decelerate + steer right into lane, (2) straighten + stop
            this.parkingProgress += delta * 0.35; // ~2.8 seconds total for smooth pull-in
            
            if (this.parkingProgress >= 1) {
                this.parkingProgress = 1;
                this.carSpeed = 0;
                this.car.position.y = 0;
                this.car.rotation.z = 0;
                // Snap to exact parking spot, aligned with road
                this.car.position.x = this.parkingSpot.x;
                this.car.position.z = this.parkingSpot.z;
                this.car.rotation.y = this.parkingTargetRot;
                
                if (!this.parkingWaitStarted) {
                    this.parkingWaitStarted = true;
                    setTimeout(() => {
                        if (this.onArrivalComplete) this.onArrivalComplete();
                    }, 1500);
                }
            } else {
                const t = this.parkingProgress;
                
                // Phase 1 (0-0.6): steer right into the parking lane
                // Phase 2 (0.6-1.0): straighten and glide to spot
                const steerPhase = Math.min(t / 0.6, 1);
                const straightenPhase = Math.max((t - 0.6) / 0.4, 0);
                
                const dx = this.parkingSpot.x - this.parkingStartPos.x;
                const dz = this.parkingSpot.z - this.parkingStartPos.z;
                
                // Smooth S-curve for lateral movement (steer in then straighten)
                const lateralEase = this.easeInOutCubic(t);
                const forwardEase = t; // Linear forward motion
                
                // Blend: car moves forward linearly, laterally with S-curve
                const forwardDir = { x: -Math.sin(this.parkingTargetRot), z: -Math.cos(this.parkingTargetRot) };
                const lateralDir = { x: Math.cos(this.parkingTargetRot), z: -Math.sin(this.parkingTargetRot) };
                
                // Decompose displacement into forward and lateral components
                const totalForward = dx * forwardDir.x + dz * forwardDir.z;
                const totalLateral = dx * lateralDir.x + dz * lateralDir.z;
                
                this.car.position.x = this.parkingStartPos.x + 
                    forwardDir.x * totalForward * forwardEase + 
                    lateralDir.x * totalLateral * lateralEase;
                this.car.position.z = this.parkingStartPos.z + 
                    forwardDir.z * totalForward * forwardEase + 
                    lateralDir.z * totalLateral * lateralEase;
                
                // Slight steering angle during phase 1, then straighten in phase 2
                const steerAngle = Math.sin(steerPhase * Math.PI) * 0.12 * (1 - straightenPhase);
                this.car.rotation.y = this.parkingTargetRot + steerAngle;
                
                // Subtle settling bounce that fades
                this.car.position.y = Math.sin(t * Math.PI * 3) * 0.008 * (1 - t);
            }
        }
        
        if (this.state === 'BUMPING') {
            // Car drives forward into the pothole (12 units ahead), then jolts
            this.bumpProgress += delta * 1.8; // ~0.55 seconds — slightly slower so pothole is visible
            
            if (this.bumpProgress >= 1) {
                // Bump done — reset car height and proceed
                this.bumpProgress = 0;
                this.isBumping = false;
                this.car.position.y = 0;
                this.setState('STOPPED');
                // Clean up pothole after a short delay
                setTimeout(() => this.cleanupPotholes(), 600);
                if (this.bumpCallback) {
                    this.bumpCallback();
                    this.bumpCallback = null;
                }
            } else {
                // Move car forward into the pothole
                const fwdSpeed = 8;
                this.car.position.x -= Math.sin(this.car.rotation.y) * fwdSpeed * delta;
                this.car.position.z -= Math.cos(this.car.rotation.y) * fwdSpeed * delta;
                
                // Jarring bump: sharp drop then bounce up then settle
                const t = this.bumpProgress;
                if (t < 0.25) {
                    // Drop into pothole
                    this.car.position.y = -0.5 * (t / 0.25);
                } else if (t < 0.5) {
                    // Bounce up sharply
                    const bt = (t - 0.25) / 0.25;
                    this.car.position.y = -0.5 + 0.9 * bt;
                } else if (t < 0.75) {
                    // Small dip
                    const bt = (t - 0.5) / 0.25;
                    this.car.position.y = 0.4 - 0.25 * bt;
                } else {
                    // Settle back to 0
                    const bt = (t - 0.75) / 0.25;
                    this.car.position.y = 0.15 * (1 - bt);
                }
                
                // Slight random tilt for realism
                this.car.rotation.z = Math.sin(t * Math.PI * 4) * 0.04 * (1 - t);
            }
        }
        
        if (this.state === 'TREE_HIT') {
            this.treeHitProgress += delta * 0.85; // ~1.2 seconds
            
            if (this.treeHitProgress >= 1) {
                this.treeHitProgress = 0;
                this.car.position.y = 0;
                this.car.rotation.z = 0;
                this.setState('STOPPED');
                setTimeout(() => this.cleanupFallenTree(), 500);
                if (this.treeHitCallback) {
                    this.treeHitCallback();
                    this.treeHitCallback = null;
                }
            } else {
                const t = this.treeHitProgress;
                // Drive forward into the tree area
                const fwdSpeed = 7;
                this.car.position.x -= Math.sin(this.car.rotation.y) * fwdSpeed * delta;
                this.car.position.z -= Math.cos(this.car.rotation.y) * fwdSpeed * delta;
                
                // Swerve right to avoid the tree trunk (t=0.15-0.65)
                if (t > 0.15 && t < 0.65) {
                    const swerveT = (t - 0.15) / 0.5;
                    const swerveForce = Math.sin(swerveT * Math.PI) * 4;
                    this.car.position.x += Math.cos(this.car.rotation.y) * swerveForce * delta;
                    this.car.position.z -= Math.sin(this.car.rotation.y) * swerveForce * delta;
                }
                
                // Violent jolt from hitting branches (t=0.25-0.7)
                if (t > 0.25 && t < 0.7) {
                    const joltT = (t - 0.25) / 0.45;
                    this.car.position.y = Math.sin(joltT * Math.PI * 6) * 0.2 * (1 - joltT);
                } else if (t >= 0.7) {
                    this.car.position.y = Math.sin((t - 0.7) / 0.3 * Math.PI) * 0.05 * (1 - t);
                }
                
                // Strong tilt/shake from impact
                this.car.rotation.z = Math.sin(t * Math.PI * 5) * 0.07 * (1 - t);
            }
        }
        
        if (this.state === 'SWERVING') {
            this.swerveProgress += delta * 1.5; // ~0.67 seconds
            
            if (this.swerveProgress >= 1) {
                this.swerveProgress = 0;
                this.car.position.y = 0;
                this.car.rotation.z = 0;
                this.setState('STOPPED');
                setTimeout(() => this.cleanupRoadDebris(), 400);
                if (this.swerveCallback) {
                    this.swerveCallback();
                    this.swerveCallback = null;
                }
            } else {
                const t = this.swerveProgress;
                // Drive forward through the debris
                const fwdSpeed = 5;
                this.car.position.x -= Math.sin(this.car.rotation.y) * fwdSpeed * delta;
                this.car.position.z -= Math.cos(this.car.rotation.y) * fwdSpeed * delta;
                
                // S-curve swerve: left then right
                const swerveForce = Math.sin(t * Math.PI * 2) * 2.5;
                this.car.position.x += Math.cos(this.car.rotation.y) * swerveForce * delta;
                this.car.position.z -= Math.sin(this.car.rotation.y) * swerveForce * delta;
                
                // Mild bounce/rattle
                this.car.position.y = Math.abs(Math.sin(t * Math.PI * 4)) * 0.1 * (1 - t);
                this.car.rotation.z = Math.sin(t * Math.PI * 3) * 0.035 * (1 - t);
            }
        }
        
        // Update ground to follow car
        if (this.ground) {
            this.ground.position.x = this.car.position.x;
            this.ground.position.z = this.car.position.z;
        }
        
        // Update sky to follow car (keeps sky visible)
        if (this.sky) {
            this.sky.position.x = this.car.position.x;
            this.sky.position.z = this.car.position.z;
        }
        
        // Update hills: 360° panorama ring centered on car, no rotation
        if (this.hillGroup) {
            this.hillGroup.position.set(this.car.position.x, 0, this.car.position.z);
        }
        
        this.updateCamera();
    }
    
    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }
    
    easeInOutQuad(t) {
        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    }
    
    setState(newState) {
        this.state = newState;
    }
    
    // === PAUSE/RESUME ===
    
    pauseForVisibility() {
        if (!this.paused) {
            this.paused = true;
            this.clock.stop();
        }
    }
    
    resumeFromVisibility() {
        // Only auto-resume if not manually paused by the user
        if (this.paused && !this.manuallyPaused) {
            this.paused = false;
            this.clock.start();
        }
    }
    
    togglePause() {
        if (this.paused) {
            this.paused = false;
            this.manuallyPaused = false;
            this.clock.start();
        } else {
            this.paused = true;
            this.manuallyPaused = true;
            this.clock.stop();
        }
        return this.paused;
    }
    
    isPaused() {
        return this.paused;
    }
    
    // === POTHOLE & BUMP SYSTEM ===
    
    createPothole() {
        // Place a large, highly visible pothole on the road ahead of the car
        const potholeGroup = new THREE.Group();
        const carRot = this.car.rotation.y;
        
        // Position 12 units ahead so the player can see it before hitting
        const pX = this.car.position.x - Math.sin(carRot) * 12;
        const pZ = this.car.position.z - Math.cos(carRot) * 12;
        
        // Outer cracked edge (light brown dirt ring — contrasts with dark road)
        const outerRingGeo = new THREE.RingGeometry(2.6, 3.5, 20);
        const outerRingMat = new THREE.MeshBasicMaterial({ 
            color: 0x8B7355,
            side: THREE.DoubleSide
        });
        const outerRing = new THREE.Mesh(outerRingGeo, outerRingMat);
        outerRing.rotation.x = -Math.PI / 2;
        outerRing.position.set(pX, 0.07, pZ);
        potholeGroup.add(outerRing);
        
        // Dark crater circle (broken asphalt)
        const craterGeo = new THREE.CircleGeometry(2.8, 20);
        const craterMat = new THREE.MeshBasicMaterial({ color: 0x222222 });
        const crater = new THREE.Mesh(craterGeo, craterMat);
        crater.rotation.x = -Math.PI / 2;
        crater.position.set(pX, 0.08, pZ);
        potholeGroup.add(crater);
        
        // Inner deep hole (very dark)
        const innerGeo = new THREE.CircleGeometry(1.8, 16);
        const innerMat = new THREE.MeshBasicMaterial({ color: 0x050505 });
        const inner = new THREE.Mesh(innerGeo, innerMat);
        inner.rotation.x = -Math.PI / 2;
        inner.position.set(pX, 0.09, pZ);
        potholeGroup.add(inner);
        
        // Reddish-brown inner ring for depth glow effect
        const depthRingGeo = new THREE.RingGeometry(1.6, 2.5, 16);
        const depthRingMat = new THREE.MeshBasicMaterial({ 
            color: 0x5C3A1E,
            side: THREE.DoubleSide
        });
        const depthRing = new THREE.Mesh(depthRingGeo, depthRingMat);
        depthRing.rotation.x = -Math.PI / 2;
        depthRing.position.set(pX, 0.085, pZ);
        potholeGroup.add(depthRing);
        
        // Small debris chunks around the edge for realism
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2 + Math.random() * 0.5;
            const dist = 3.0 + Math.random() * 0.8;
            const chunkGeo = new THREE.CircleGeometry(0.25 + Math.random() * 0.2, 6);
            const chunkMat = new THREE.MeshBasicMaterial({ color: 0x666655 });
            const chunk = new THREE.Mesh(chunkGeo, chunkMat);
            chunk.rotation.x = -Math.PI / 2;
            chunk.position.set(
                pX + Math.cos(angle) * dist,
                0.075,
                pZ + Math.sin(angle) * dist
            );
            potholeGroup.add(chunk);
        }
        
        this.scene.add(potholeGroup);
        this.potholeObjects.push(potholeGroup);
        
        return potholeGroup;
    }
    
    triggerBump(callback) {
        // Show pothole, then animate car hitting it with a jarring bump
        this.createPothole();
        this.isBumping = true;
        this.bumpProgress = 0;
        this.bumpCallback = callback;
        this.setState('BUMPING');
    }
    
    cleanupPotholes() {
        this.potholeObjects.forEach(obj => this.scene.remove(obj));
        this.potholeObjects = [];
    }
    
    // === FALLEN TREE SYSTEM (tree consequence) ===
    
    createFallenTree() {
        const group = new THREE.Group();
        const carRot = this.car.rotation.y;
        
        // Position 14 units ahead so player sees it before the car hits
        const pX = this.car.position.x - Math.sin(carRot) * 14;
        const pZ = this.car.position.z - Math.cos(carRot) * 14;
        
        // Large trunk lying across the road
        const trunkGeo = new THREE.CylinderGeometry(0.45, 0.55, 12, 10);
        const trunkMat = new THREE.MeshLambertMaterial({ color: 0x5D4037 });
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.rotation.z = Math.PI / 2;
        trunk.rotation.y = carRot;
        trunk.position.set(pX, 0.55, pZ);
        trunk.castShadow = true;
        group.add(trunk);
        
        // Canopy/leaves at one end
        const leafMat = new THREE.MeshLambertMaterial({ color: 0x2E7D32 });
        const canopy1 = new THREE.Mesh(new THREE.SphereGeometry(2.5, 10, 8), leafMat);
        canopy1.position.set(
            pX + Math.cos(carRot) * 5.5,
            1.4,
            pZ - Math.sin(carRot) * 5.5
        );
        group.add(canopy1);
        
        const canopy2 = new THREE.Mesh(new THREE.SphereGeometry(1.8, 8, 6), new THREE.MeshLambertMaterial({ color: 0x388E3C }));
        canopy2.position.set(
            pX + Math.cos(carRot) * 4,
            2.0,
            pZ - Math.sin(carRot) * 4
        );
        group.add(canopy2);
        
        // Smaller branch at other end
        const branch = new THREE.Mesh(new THREE.SphereGeometry(1.2, 8, 6), leafMat);
        branch.position.set(
            pX - Math.cos(carRot) * 5,
            0.8,
            pZ + Math.sin(carRot) * 5
        );
        group.add(branch);
        
        // Broken branches scattered on road
        for (let i = 0; i < 6; i++) {
            const branchGeo = new THREE.CylinderGeometry(0.06, 0.1, 1.5 + Math.random() * 2, 5);
            const b = new THREE.Mesh(branchGeo, trunkMat);
            b.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
            b.position.set(
                pX + (Math.random() - 0.5) * 8,
                0.25 + Math.random() * 0.3,
                pZ + (Math.random() - 0.5) * 5
            );
            group.add(b);
        }
        
        // Leaf debris on the road
        for (let i = 0; i < 12; i++) {
            const debrisGeo = new THREE.CircleGeometry(0.2 + Math.random() * 0.3, 5);
            const debrisMat = new THREE.MeshBasicMaterial({
                color: Math.random() > 0.3 ? 0x2E7D32 : 0x4CAF50,
                side: THREE.DoubleSide
            });
            const debris = new THREE.Mesh(debrisGeo, debrisMat);
            debris.rotation.x = -Math.PI / 2 + (Math.random() - 0.5) * 0.3;
            debris.position.set(
                pX + (Math.random() - 0.5) * 10,
                0.07,
                pZ + (Math.random() - 0.5) * 7
            );
            group.add(debris);
        }
        
        this.scene.add(group);
        this.fallenTreeObjects.push(group);
        return group;
    }
    
    triggerTreeHit(callback) {
        this.createFallenTree();
        this.treeHitProgress = 0;
        this.treeHitCallback = callback;
        this.setState('TREE_HIT');
    }
    
    cleanupFallenTree() {
        this.fallenTreeObjects.forEach(obj => this.scene.remove(obj));
        this.fallenTreeObjects = [];
    }
    
    // === ROAD DEBRIS / SWERVE SYSTEM (bump consequence) ===
    
    createRoadDebris() {
        const group = new THREE.Group();
        const carRot = this.car.rotation.y;
        
        // Position 10 units ahead
        const pX = this.car.position.x - Math.sin(carRot) * 10;
        const pZ = this.car.position.z - Math.cos(carRot) * 10;
        
        // Scattered rocks/gravel on the road
        for (let i = 0; i < 7; i++) {
            const rockGeo = new THREE.DodecahedronGeometry(0.3 + Math.random() * 0.35, 0);
            const rockMat = new THREE.MeshLambertMaterial({
                color: new THREE.Color().setHSL(0.08, 0.25, 0.35 + Math.random() * 0.15)
            });
            const rock = new THREE.Mesh(rockGeo, rockMat);
            rock.position.set(
                pX + (Math.random() - 0.5) * 5,
                0.25,
                pZ + (Math.random() - 0.5) * 4
            );
            rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
            rock.scale.set(1, 0.6, 1);
            group.add(rock);
        }
        
        // Orange warning cone
        const coneMat = new THREE.MeshLambertMaterial({ color: 0xFF6600 });
        const coneGeo = new THREE.ConeGeometry(0.25, 0.9, 8);
        const cone = new THREE.Mesh(coneGeo, coneMat);
        cone.position.set(pX + 2, 0.45, pZ - 0.5);
        group.add(cone);
        
        // White stripe on cone
        const stripeGeo = new THREE.CylinderGeometry(0.27, 0.24, 0.12, 8);
        const stripeMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
        const stripe = new THREE.Mesh(stripeGeo, stripeMat);
        stripe.position.set(pX + 2, 0.55, pZ - 0.5);
        group.add(stripe);
        
        // Dirt/gravel patch on road
        const patchGeo = new THREE.CircleGeometry(2.5, 12);
        const patchMat = new THREE.MeshBasicMaterial({ color: 0x6B5B3A, side: THREE.DoubleSide });
        const patch = new THREE.Mesh(patchGeo, patchMat);
        patch.rotation.x = -Math.PI / 2;
        patch.position.set(pX, 0.06, pZ);
        group.add(patch);
        
        this.scene.add(group);
        this.roadDebrisObjects.push(group);
        return group;
    }
    
    triggerSwerve(callback) {
        this.createRoadDebris();
        this.swerveProgress = 0;
        this.swerveCallback = callback;
        this.setState('SWERVING');
    }
    
    cleanupRoadDebris() {
        this.roadDebrisObjects.forEach(obj => this.scene.remove(obj));
        this.roadDebrisObjects = [];
    }
    
    // === DIRECTION SIGNS AT INTERSECTION ===
    
    createDirectionSign(text, direction) {
        const signGroup = new THREE.Group();
        
        // Create canvas texture with direction arrow + answer text
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        
        // Green highway sign background with rounded corners
        const r = 14;
        ctx.fillStyle = '#006B3F';
        ctx.beginPath();
        ctx.moveTo(r, 0);
        ctx.lineTo(512 - r, 0);
        ctx.quadraticCurveTo(512, 0, 512, r);
        ctx.lineTo(512, 256 - r);
        ctx.quadraticCurveTo(512, 256, 512 - r, 256);
        ctx.lineTo(r, 256);
        ctx.quadraticCurveTo(0, 256, 0, 256 - r);
        ctx.lineTo(0, r);
        ctx.quadraticCurveTo(0, 0, r, 0);
        ctx.closePath();
        ctx.fill();
        
        // White border
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 6;
        ctx.stroke();
        
        // Direction arrow
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 56px Arial, sans-serif';
        ctx.textAlign = 'center';
        let arrow = '\u2190'; // ←
        if (direction === 'straight') arrow = '\u2191'; // ↑
        if (direction === 'right') arrow = '\u2192'; // →
        ctx.fillText(arrow, 256, 65);
        
        // Answer text (word-wrapped)
        ctx.font = '24px Arial, sans-serif';
        const maxWidth = 460;
        const words = text.split(' ');
        let line = '';
        let y = 110;
        const lineHeight = 32;
        const maxLines = 4;
        let lineCount = 0;
        
        for (const word of words) {
            const testLine = line + (line ? ' ' : '') + word;
            if (ctx.measureText(testLine).width > maxWidth && line) {
                ctx.fillText(line, 256, y);
                line = word;
                y += lineHeight;
                lineCount++;
                if (lineCount >= maxLines - 1) {
                    line += '...';
                    break;
                }
            } else {
                line = testLine;
            }
        }
        if (line) ctx.fillText(line, 256, y);
        
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            side: THREE.DoubleSide
        });
        
        // Sign panel
        const panelGeo = new THREE.PlaneGeometry(6, 3);
        const panel = new THREE.Mesh(panelGeo, material);
        panel.position.y = 5.5;
        signGroup.add(panel);
        
        // Metal post
        const postGeo = new THREE.CylinderGeometry(0.07, 0.07, 5, 8);
        const postMat = new THREE.MeshLambertMaterial({ color: 0x888888 });
        const post = new THREE.Mesh(postGeo, postMat);
        post.position.y = 2.5;
        signGroup.add(post);
        
        return signGroup;
    }
    
    createDirectionSigns(leftText, straightText, rightText) {
        this.removeDirectionSigns();
        
        const spacing = 8; // Space between sign centers
        const signZ = 2;   // In junction, close to approaching car
        
        // Left direction sign
        const leftSign = this.createDirectionSign(leftText, 'left');
        leftSign.position.set(-spacing, 0, signZ);
        this.intersectionGroup.add(leftSign);
        this.directionSignObjects.push(leftSign);
        
        // Straight direction sign (center)
        const straightSign = this.createDirectionSign(straightText, 'straight');
        straightSign.position.set(0, 0, signZ);
        this.intersectionGroup.add(straightSign);
        this.directionSignObjects.push(straightSign);
        
        // Right direction sign
        const rightSign = this.createDirectionSign(rightText, 'right');
        rightSign.position.set(spacing, 0, signZ);
        this.intersectionGroup.add(rightSign);
        this.directionSignObjects.push(rightSign);
    }
    
    removeDirectionSigns() {
        this.directionSignObjects.forEach(sign => {
            if (sign.parent) sign.parent.remove(sign);
        });
        this.directionSignObjects = [];
    }
    
    // === BRANDING ROADSIDE SIGN ===
    
    createRoadsideSign() {
        const signGroup = new THREE.Group();
        
        // Create canvas with Johnson McGinnis branding
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        
        // Warm professional brown background
        ctx.fillStyle = '#5C3D1E';
        ctx.fillRect(0, 0, 512, 256);
        
        // Gold border (double)
        ctx.strokeStyle = '#D4A437';
        ctx.lineWidth = 8;
        ctx.strokeRect(8, 8, 496, 240);
        ctx.lineWidth = 2;
        ctx.strokeRect(18, 18, 476, 220);
        
        // Firm name
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 38px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.fillText('JOHNSON McGINNIS', 256, 95);
        
        // Tagline
        ctx.font = '24px Georgia, serif';
        ctx.fillStyle = '#D4A437';
        ctx.fillText('Elder Law Attorneys', 256, 140);
        
        // Separator line
        ctx.strokeStyle = '#D4A437';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(120, 160);
        ctx.lineTo(392, 160);
        ctx.stroke();
        
        // Website
        ctx.font = '18px Arial, sans-serif';
        ctx.fillStyle = '#CCC';
        ctx.fillText('johnsonmcginnis.com', 256, 195);
        
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            side: THREE.DoubleSide
        });
        
        // Sign panel (smaller than billboards)
        const panelGeo = new THREE.PlaneGeometry(4.5, 2.25);
        const panel = new THREE.Mesh(panelGeo, material);
        panel.position.y = 3.5;
        signGroup.add(panel);
        
        // Two wooden posts
        const postMat = new THREE.MeshLambertMaterial({ color: 0x6B4226 });
        const postGeo = new THREE.CylinderGeometry(0.08, 0.1, 3.5, 6);
        
        const leftPost = new THREE.Mesh(postGeo, postMat);
        leftPost.position.set(-1.8, 1.75, 0);
        leftPost.castShadow = true;
        signGroup.add(leftPost);
        
        const rightPost = new THREE.Mesh(postGeo, postMat);
        rightPost.position.set(1.8, 1.75, 0);
        rightPost.castShadow = true;
        signGroup.add(rightPost);
        
        return signGroup;
    }
    
    // === PUBLIC API ===
    
    startDriving() {
        this.setState('DRIVING');
        this.targetCarSpeed = 16;
    }
    
    approachIntersection() {
        this.setState('APPROACHING');
        this.targetCarSpeed = 0;
    }
    
    stopAtIntersection() {
        this.setState('STOPPED');
        this.carSpeed = 0;
    }
    
    // Show pregenerated scenery immediately when direction is chosen (prevents glitch)
    showPregenSceneryForDirection(chosenDir) {
        // First, show the pregenerated scenery for chosen direction BEFORE clearing old
        // This prevents any visual gap/flash
        if (this.pregenScenery[chosenDir] && this.pregenScenery[chosenDir].objects.length > 0) {
            this.pregenScenery[chosenDir].objects.forEach(obj => {
                obj.visible = true;
            });
            this.sceneryConfig = this.pregenScenery[chosenDir].config;
        }
        
        // Now clear old scenery (after new is visible)
        this.sceneryObjects.forEach(obj => this.scene.remove(obj));
        this.sceneryObjects = [];
        
        // Transfer pregenerated scenery to sceneryObjects
        if (this.pregenScenery[chosenDir] && this.pregenScenery[chosenDir].objects.length > 0) {
            this.pregenScenery[chosenDir].objects.forEach(obj => {
                this.sceneryObjects.push(obj);
            });
            
            // Remove other directions' pregenerated scenery
            ['left', 'right', 'straight'].forEach(dir => {
                if (dir !== chosenDir && this.pregenScenery[dir]) {
                    this.pregenScenery[dir].objects.forEach(obj => this.scene.remove(obj));
                    this.pregenScenery[dir].objects = [];
                }
            });
            
            // Clear chosen direction's reference (now in sceneryObjects)
            this.pregenScenery[chosenDir].objects = [];
            
            // Mark scenery as created
            this.currentRoadSceneryCreated = true;
        }
    }

    turn(direction) {
        this.removeDirectionSigns();
        this.turnDirection = direction;
        this.turnProgress = 0;
        this.car.rotation.z = 0; // Reset any bump tilt
        this.turnStartPos = { x: this.car.position.x, z: this.car.position.z };
        this.turnStartRot = this.car.rotation.y;
        
        // IMMEDIATELY show pregenerated scenery for chosen direction (no glitch!)
        this.showPregenSceneryForDirection(direction);
        
        const intX = this.intersectionGroup.position.x;
        const intZ = this.intersectionGroup.position.z;
        const intRot = this.intersectionGroup.rotation.y;
        
        // Distances for turn path
        const turnRadius = 15; // How wide the turn arc is
        const exitDist = 40; // How far down the new road car ends up
        
        if (direction === 'left') {
            this.turnEndRot = intRot + Math.PI / 2;
            // Control point at intersection center for clean 90-degree curve that stays on road
            this.turnControlPoint = {
                x: intX,
                z: intZ
            };
            this.turnEndPos = {
                x: intX - Math.cos(intRot) * exitDist,
                z: intZ + Math.sin(intRot) * exitDist
            };
        } else if (direction === 'right') {
            this.turnEndRot = intRot - Math.PI / 2;
            // Control point at intersection center for clean 90-degree curve that stays on road
            this.turnControlPoint = {
                x: intX,
                z: intZ
            };
            this.turnEndPos = {
                x: intX + Math.cos(intRot) * exitDist,
                z: intZ - Math.sin(intRot) * exitDist
            };
        } else { // straight
            this.turnEndRot = intRot;
            // For straight, control point is just ahead
            this.turnControlPoint = {
                x: intX - Math.sin(intRot) * 20,
                z: intZ - Math.cos(intRot) * 20
            };
            this.turnEndPos = {
                x: intX - Math.sin(intRot) * exitDist,
                z: intZ - Math.cos(intRot) * exitDist
            };
        }
        
        this.setState('TURNING');
    }
    
    completeTurn() {
        this.intersectionGroup.visible = false;
        
        this.setState('POST_TURN_DRIVING');
        this.targetCarSpeed = 16;
        
        // Reset pregen flag for next intersection (need to pregenerate for new directions)
        this.pregenSceneryCreated = false;
        
        // Reposition road AHEAD of car using car's forward direction
        const roadOffset = 100; // Center of road ahead of car
        const roadX = this.car.position.x - Math.sin(this.car.rotation.y) * roadOffset;
        const roadZ = this.car.position.z - Math.cos(this.car.rotation.y) * roadOffset;
        this.roadGroup.position.set(roadX, 0, roadZ);
        this.roadGroup.rotation.y = this.car.rotation.y;
        
        // Update ground and hills immediately
        if (this.ground) {
            this.ground.position.set(this.car.position.x, -0.1, this.car.position.z);
        }
        if (this.hillGroup) {
            // 360° panorama ring: center on car, NO rotation
            this.hillGroup.position.set(this.car.position.x, 0, this.car.position.z);
        }
        
        // Scenery was already shown in turn() - no need to touch it here!
        // Just make sure currentRoadSceneryCreated is true to prevent recreation
        this.currentRoadSceneryCreated = true;
        
        if (this.onTurnComplete) {
            this.onTurnComplete();
        }
    }
    
    showNextIntersection() {
        this.positionIntersectionAhead();
    }
    
    driveToFinish() {
        // Build final destination first (invisible), then cross-fade
        this.createFinalDestination();
        
        this.setState('ARRIVING');
        this.targetCarSpeed = 10;
        this.carSpeed = 10;
    }
    
    createFinalDestination() {
        // Build final scene objects into a temporary array first
        const newObjects = [];
        
        const carX = this.car.position.x;
        const carZ = this.car.position.z;
        const carRot = this.car.rotation.y;
        const roadSide = this.ROAD_WIDTH / 2 + 8;
        
        // === LARGE OFFICE / HOME — already visible as car drives toward it ===
        const officeDist = 90;
        const officeSideOffset = 18;
        const office = this.createHouse();
        // Scale up to make it a prominent building
        office.scale.set(1.6, 1.6, 1.6);
        office.position.set(
            carX - Math.sin(carRot) * officeDist + Math.cos(carRot) * officeSideOffset,
            0,
            carZ - Math.cos(carRot) * officeDist - Math.sin(carRot) * officeSideOffset
        );
        office.rotation.y = carRot - Math.PI / 6;
        this.scene.add(office);
        newObjects.push(office);
        this.destinationBarn = office;
        
        // === BILLBOARD — in front of office, visible early ===
        const signDist = 40;
        const signSideOffset = 12;
        const sign = this.createBillboard();
        sign.position.set(
            carX - Math.sin(carRot) * signDist + Math.cos(carRot) * signSideOffset,
            0,
            carZ - Math.cos(carRot) * signDist - Math.sin(carRot) * signSideOffset
        );
        sign.rotation.y = carRot;
        this.scene.add(sign);
        newObjects.push(sign);
        
        // === PARKING LOT — right shoulder of road with marked lanes ===
        // Park spot is on the RIGHT side of the road, slightly off-shoulder
        const parkDist = 70;
        const parkLateralOffset = this.ROAD_WIDTH / 2 + 4; // Just off the right edge
        this.parkingSpot = {
            x: carX - Math.sin(carRot) * parkDist + Math.cos(carRot) * parkLateralOffset,
            z: carZ - Math.cos(carRot) * parkDist - Math.sin(carRot) * parkLateralOffset
        };
        
        // Parking lot surface
        const parkingGeo = new THREE.PlaneGeometry(10, 28);
        const parkingMat = new THREE.MeshLambertMaterial({ color: 0x555555 });
        const parkingLot = new THREE.Mesh(parkingGeo, parkingMat);
        parkingLot.rotation.x = -Math.PI / 2;
        parkingLot.rotation.z = carRot;
        parkingLot.position.set(this.parkingSpot.x, 0.03, this.parkingSpot.z);
        this.scene.add(parkingLot);
        newObjects.push(parkingLot);
        
        // Parking lane lines (white stripes) — 3 lanes
        const stripeMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
        for (let i = -1; i <= 1; i++) {
            const stripeGeo = new THREE.PlaneGeometry(0.2, 8);
            const stripe = new THREE.Mesh(stripeGeo, stripeMat);
            stripe.rotation.x = -Math.PI / 2;
            stripe.rotation.z = carRot;
            stripe.position.set(
                this.parkingSpot.x + Math.cos(carRot) * (i * 3.2),
                0.04,
                this.parkingSpot.z - Math.sin(carRot) * (i * 3.2)
            );
            this.scene.add(stripe);
            newObjects.push(stripe);
        }
        
        // === TREES along both sides ===
        for (let dist = 25; dist < 110; dist += 16) {
            const baseX = carX - Math.sin(carRot) * dist;
            const baseZ = carZ - Math.cos(carRot) * dist;
            
            // Left side trees
            const leftTree = this.createTree('green');
            leftTree.position.set(
                baseX - Math.cos(carRot) * (roadSide + 12),
                0,
                baseZ + Math.sin(carRot) * (roadSide + 12)
            );
            this.scene.add(leftTree);
            newObjects.push(leftTree);
            
            // Right side trees — skip near parking area
            if (dist < 55 || dist > 85) {
                const rightTree = this.createTree('green');
                rightTree.position.set(
                    baseX + Math.cos(carRot) * (roadSide + 18),
                    0,
                    baseZ - Math.sin(carRot) * (roadSide + 18)
                );
                this.scene.add(rightTree);
                newObjects.push(rightTree);
            }
        }
        
        // Lake on the left side
        const lake = this.createLakeForDirection(carX, carZ, carRot, 'left');
        if (lake) {
            this.scene.add(lake);
            newObjects.push(lake);
        }
        
        // Bushes around office
        for (let i = 0; i < 5; i++) {
            const bush = this.createBush();
            const angle = (i / 5) * Math.PI * 0.6 + Math.PI * 0.2;
            bush.position.set(
                office.position.x + Math.cos(angle) * (12 + Math.random() * 5),
                0,
                office.position.z + Math.sin(angle) * (12 + Math.random() * 5)
            );
            this.scene.add(bush);
            newObjects.push(bush);
        }
        
        // === FENCES on left side ===
        const fenceGroup = new THREE.Group();
        const postMat = new THREE.MeshLambertMaterial({ color: 0x8B5A3C });
        const railMat = new THREE.MeshLambertMaterial({ color: 0x7A4A30 });
        const fencePosts = [];
        
        for (let dist = 20; dist < 95; dist += 5) {
            const baseX = carX - Math.sin(carRot) * dist;
            const baseZ = carZ - Math.cos(carRot) * dist;
            
            const postGeo = new THREE.BoxGeometry(0.3, 1.8, 0.3);
            const post = new THREE.Mesh(postGeo, postMat);
            const px = baseX - Math.cos(carRot) * (roadSide + 6);
            const pz = baseZ + Math.sin(carRot) * (roadSide + 6);
            post.position.set(px, 0.9, pz);
            fenceGroup.add(post);
            fencePosts.push({ x: px, z: pz });
        }
        
        for (let i = 0; i < fencePosts.length - 1; i++) {
            const p1 = fencePosts[i];
            const p2 = fencePosts[i + 1];
            const dx = p2.x - p1.x;
            const dz = p2.z - p1.z;
            const length = Math.sqrt(dx * dx + dz * dz);
            const angle = Math.atan2(dx, dz);
            
            const railGeo = new THREE.BoxGeometry(0.12, 0.1, length);
            
            const topRail = new THREE.Mesh(railGeo, railMat);
            topRail.position.set((p1.x + p2.x) / 2, 1.5, (p1.z + p2.z) / 2);
            topRail.rotation.y = angle;
            fenceGroup.add(topRail);
            
            const bottomRail = new THREE.Mesh(railGeo, railMat);
            bottomRail.position.set((p1.x + p2.x) / 2, 0.5, (p1.z + p2.z) / 2);
            bottomRail.rotation.y = angle;
            fenceGroup.add(bottomRail);
        }
        
        this.scene.add(fenceGroup);
        newObjects.push(fenceGroup);
        
        // === NOW remove old scenery (new objects already in scene — no flash) ===
        this.sceneryObjects.forEach(obj => this.scene.remove(obj));
        this.sceneryObjects = newObjects;
        
        // Mark scenery as created
        this.currentRoadSceneryCreated = true;
    }
    
    reset() {
        this.car.position.set(0, 0, 70);
        this.car.rotation.y = 0;
        this.car.rotation.z = 0;
        this.carSpeed = 0;
        this.targetCarSpeed = 0;
        this.state = 'IDLE';
        this.intersectionGroup.visible = false;
        
        // Reset scenery flags for clean state
        this.currentRoadSceneryCreated = false;
        this.pregenSceneryCreated = false;
        
        // Reset parking state
        this.parkingProgress = 0;
        this.parkingSpot = null;
        this.parkingStartPos = null;
        this.parkingTargetRot = 0;
        this.parkingWaitStarted = false;
        this.destinationBarn = null;
        
        // Clean up potholes
        this.cleanupPotholes();
        this.isBumping = false;
        this.bumpProgress = 0;
        
        // Clean up fallen trees and road debris
        this.cleanupFallenTree();
        this.treeHitProgress = 0;
        this.treeHitCallback = null;
        this.cleanupRoadDebris();
        this.swerveProgress = 0;
        this.swerveCallback = null;
        this.removeDirectionSigns();
        
        this.positionIntersectionAhead();
        this.updateCamera(true);
    }
    
    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}

const gameRenderer = new GameRenderer();
