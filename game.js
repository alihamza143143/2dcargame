/**
 * 3D Game Renderer - Tennessee Driving Experience
 * Features: Connected roads, proper stop signs, rich scenery (trees, fences, barns, fields)
 * Yellow direction poles at intersections
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
        
        // Callbacks
        this.onTurnComplete = null;
        this.onArrivalComplete = null;
        this.onStopAtIntersection = null;
    }
    
    // Generate random scenery configuration
    getRandomSceneryConfig() {
        const lakeOptions = ['left', 'right', 'left', 'right', 'none']; // 80% chance of lake
        const barnSide = Math.random() > 0.5 ? 'left' : 'right';
        const treeStyle = Math.random() < 0.33 ? 'green' : (Math.random() < 0.5 ? 'autumn' : 'mixed');
        const fenceType = Math.random() > 0.5 ? 'long' : 'short';
        
        return {
            lakeSide: lakeOptions[Math.floor(Math.random() * lakeOptions.length)],
            barnSide: barnSide,
            treeStyle: treeStyle, // 'green', 'autumn', or 'mixed'
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
            sky: 'assets/sky.png',
            hillsFar: 'assets/hills-far.png',
            hillsMid: 'assets/hills-mid.png',
            hillsNear: 'assets/hills-near.png',
            treeGreen1: 'assets/tree-green-1.png',
            treeGreen2: 'assets/tree-green-2.png',
            treeGreen3: 'assets/tree-green-3.png',
            treeAutumn1: 'assets/tree-autumn-1.png',
            treeAutumn2: 'assets/tree-autumn-2.png',
            treeAutumn3: 'assets/tree-autumn-3.png',
            barn: 'assets/barn.png',
            fenceLong: 'assets/fence-long.png',
            fenceShort: 'assets/fence-short.png',
            lake: 'assets/lake.png',
            bushSmall: 'assets/bush-small.png',
            bushMedium: 'assets/bush-medium.png',
            bushLarge: 'assets/bush-large.png',
            rockSmall: 'assets/rock-small.png',
            rockMedium: 'assets/rock-medium.png',
            rockLarge: 'assets/rock-large.png'
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
            this.scene.background = new THREE.Color(0xE5DDB0);
            
            // Minimal fog to keep sky visible
            this.scene.fog = new THREE.Fog(0xE0D8C0, 400, 800);
        
            this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
            
            this.renderer = new THREE.WebGLRenderer({ antialias: true });
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
            this.renderer.toneMappingExposure = 1.2;
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
        });
    }
    
    setupLighting() {
        // Soft even lighting for 2D illustrated look
        const ambient = new THREE.AmbientLight(0xE8E0D0, 0.7);
        this.scene.add(ambient);
        
        // Hemisphere light for natural color blending - muted tones
        const hemiLight = new THREE.HemisphereLight(0xC8D4C8, 0x8B9E6B, 0.5);
        this.scene.add(hemiLight);
        
        // Soft directional light - not too harsh
        const sun = new THREE.DirectionalLight(0xFFF5E0, 0.8);
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
        
        // Clean 2D illustrated gradient - warm muted tones matching reference
        const gradient = ctx.createLinearGradient(0, 0, 0, 512);
        gradient.addColorStop(0, '#B8CCD8');    // Muted pale blue at top
        gradient.addColorStop(0.25, '#C8D8D0'); // Soft sage
        gradient.addColorStop(0.5, '#D8E0C8');  // Pale green-beige
        gradient.addColorStop(0.7, '#E0DCC0');  // Warm cream
        gradient.addColorStop(0.85, '#E8E0B8'); // Sandy beige
        gradient.addColorStop(1, '#E5DDB0');    // Warm horizon
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 512, 512);
        
        // Add very subtle soft clouds - minimal like reference
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.ellipse(150, 180, 100, 25, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(380, 160, 90, 22, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        
        const skyTexture = new THREE.CanvasTexture(canvas);
        const skyGeo = new THREE.SphereGeometry(500, 32, 32);
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
        this.ground.position.y = -0.1;
        this.ground.receiveShadow = true;
        this.scene.add(this.ground);
    }
    
    createHills() {
        // Create layered rolling hills - on distant horizon, not too close
        this.hillGroup = new THREE.Group();
        
        const hillConfigs = [
            // Background hills - pushed back to stay on horizon
            { x: -120, z: -220, height: 25, color: 0x6B8B5A },
            { x: 0, z: -240, height: 35, color: 0x5C7D4C },
            { x: 120, z: -225, height: 28, color: 0x6B8B5A },
            { x: -60, z: -210, height: 22, color: 0x5C7D4C },
            { x: 60, z: -215, height: 24, color: 0x6B8B5A },
            // Additional hills spread wider
            { x: -180, z: -200, height: 20, color: 0x6B9450 },
            { x: 180, z: -205, height: 22, color: 0x6B9450 },
        ];
        
        hillConfigs.forEach(cfg => {
            const hillGeo = new THREE.SphereGeometry(cfg.height, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
            const hillMat = new THREE.MeshLambertMaterial({ color: cfg.color });
            const hill = new THREE.Mesh(hillGeo, hillMat);
            hill.position.set(cfg.x, 0, cfg.z);
            hill.scale.set(3, 0.8, 2); // Wider but shorter
            hill.receiveShadow = true;
            this.hillGroup.add(hill);
        });
        
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
        
        // === YELLOW DIRECTION POLES ===
        this.createDirectionPole(-8, -12, 'LEFT', 'left');
        this.createDirectionPole(0, -15, 'STRAIGHT', 'straight');
        this.createDirectionPole(8, -12, 'RIGHT', 'right');
        
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
        // Trees along left road - far from road
        for (let x = -junctionEdge - 30; x > -120; x -= 18) {
            const tree1 = this.createTree();
            tree1.position.set(x, 0, -roadSide - 15 - Math.random() * 10);
            this.intersectionGroup.add(tree1);
            
            const tree2 = this.createTree();
            tree2.position.set(x - 5, 0, roadSide + 15 + Math.random() * 10);
            this.intersectionGroup.add(tree2);
        }
        // Fences along left road - START FAR from junction to not block entrance
        this.createIntersectionFence(-junctionEdge - 55, -100, -roadSide - 6, 'horizontal');
        this.createIntersectionFence(-junctionEdge - 55, -100, roadSide + 6, 'horizontal');
        
        // === RIGHT ROAD SCENERY ===
        // Trees along right road - far from road
        for (let x = junctionEdge + 30; x < 120; x += 18) {
            const tree1 = this.createTree();
            tree1.position.set(x, 0, -roadSide - 15 - Math.random() * 10);
            this.intersectionGroup.add(tree1);
            
            const tree2 = this.createTree();
            tree2.position.set(x + 5, 0, roadSide + 15 + Math.random() * 10);
            this.intersectionGroup.add(tree2);
        }
        // Fences along right road - START FAR from junction to not block entrance
        this.createIntersectionFence(junctionEdge + 55, 100, -roadSide - 6, 'horizontal');
        this.createIntersectionFence(junctionEdge + 55, 100, roadSide + 6, 'horizontal');
        
        // === STRAIGHT ROAD SCENERY ===
        // Trees along straight road - far from road
        for (let z = -junctionEdge - 30; z > -120; z -= 18) {
            const tree1 = this.createTree();
            tree1.position.set(-roadSide - 15 - Math.random() * 10, 0, z);
            this.intersectionGroup.add(tree1);
            
            const tree2 = this.createTree();
            tree2.position.set(roadSide + 15 + Math.random() * 10, 0, z - 5);
            this.intersectionGroup.add(tree2);
        }
        // Fences along straight road - START FAR from junction
        this.createIntersectionFence(-junctionEdge - 55, -100, -roadSide - 6, 'vertical-left');
        this.createIntersectionFence(-junctionEdge - 55, -100, roadSide + 6, 'vertical-right');
        
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
    
    createDirectionPole(x, z, label, direction) {
        const poleGroup = new THREE.Group();
        
        // Yellow pole
        const poleGeo = new THREE.CylinderGeometry(0.15, 0.15, 4, 8);
        const poleMat = new THREE.MeshLambertMaterial({ color: 0xFFCC00 });
        const pole = new THREE.Mesh(poleGeo, poleMat);
        pole.position.y = 2;
        pole.castShadow = true;
        poleGroup.add(pole);
        
        // Yellow arrow sign on top
        const signGroup = new THREE.Group();
        
        // Arrow body
        const arrowBodyGeo = new THREE.BoxGeometry(1.5, 0.6, 0.15);
        const arrowMat = new THREE.MeshLambertMaterial({ color: 0xFFCC00 });
        const arrowBody = new THREE.Mesh(arrowBodyGeo, arrowMat);
        signGroup.add(arrowBody);
        
        // Arrow head (triangle)
        const headShape = new THREE.Shape();
        headShape.moveTo(0, 0.6);
        headShape.lineTo(-0.4, 0);
        headShape.lineTo(0.4, 0);
        headShape.closePath();
        
        const headGeo = new THREE.ExtrudeGeometry(headShape, { depth: 0.15, bevelEnabled: false });
        const arrowHead = new THREE.Mesh(headGeo, arrowMat);
        arrowHead.position.z = -0.075;
        
        if (direction === 'left') {
            arrowHead.rotation.z = Math.PI / 2;
            arrowHead.position.x = -1;
            arrowHead.position.y = -0.3;
        } else if (direction === 'right') {
            arrowHead.rotation.z = -Math.PI / 2;
            arrowHead.position.x = 1;
            arrowHead.position.y = 0.3;
        } else { // straight
            arrowHead.position.y = 0.45;
        }
        signGroup.add(arrowHead);
        
        signGroup.position.y = 4.5;
        signGroup.rotation.y = Math.PI; // Face the car
        poleGroup.add(signGroup);
        
        poleGroup.position.set(x, 0, z);
        this.intersectionGroup.add(poleGroup);
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
        
        // Octagon stop sign
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
        
        // White border
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
        
        // Create lake using PNG texture on a flat plane
        const lakeGroup = new THREE.Group();
        const carZ = this.car ? this.car.position.z : 70;
        const carX = this.car ? this.car.position.x : 0;
        
        if (this.textures.lake) {
            // Use plane geometry for lake so it lays flat on ground
            const material = new THREE.MeshBasicMaterial({
                map: this.textures.lake,
                transparent: true,
                alphaTest: 0.1,
                side: THREE.DoubleSide
            });
            
            // Position lake based on config - far from road
            const lakeSize = 25 + Math.random() * 10;
            const planeGeo = new THREE.PlaneGeometry(lakeSize, lakeSize * 0.7);
            const lake = new THREE.Mesh(planeGeo, material);
            lake.rotation.x = -Math.PI / 2; // Lay flat
            
            const xOffset = config.lakeSide === 'left' ? -55 : 55;
            lake.position.set(carX + xOffset, 0.15, carZ - 15);
            lakeGroup.add(lake);
        } else {
            // Fallback to 3D lake - far from road
            const waterGeo = new THREE.CircleGeometry(20, 32);
            const waterMat = new THREE.MeshLambertMaterial({ color: 0x5A8A9A });
            const water = new THREE.Mesh(waterGeo, waterMat);
            water.rotation.x = -Math.PI / 2;
            const xOffset = config.lakeSide === 'left' ? -55 : 55;
            water.position.set(carX + xOffset, 0.1, carZ - 15);
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
            leftTree.position.set(carX - roadSide - 20 - Math.random() * 8, 0, z + Math.random() * 3);
            this.scene.add(leftTree);
            this.sceneryObjects.push(leftTree);
            
            // Right side trees - far from road
            const rightTree = this.createTree(treeStyle);
            rightTree.position.set(carX + roadSide + 20 + Math.random() * 8, 0, z + Math.random() * 3);
            this.scene.add(rightTree);
            this.sceneryObjects.push(rightTree);
        }
        
        // Fences along both sides - START with gap for intersection opening
        this.createFence(carX - roadSide - 8, carZ - 25, carZ - 70, 'left', fenceType);
        this.createFence(carX + roadSide + 8, carZ - 25, carZ - 70, 'right', fenceType);
        
        // Single barn on configured side - CLOSER to road for visibility
        const barn = this.createBarn();
        const barnX = barnSide === 'left' ? carX - 35 : carX + 35;
        barn.position.set(barnX, 0, carZ - 40);
        // No rotation needed for initial road (faces default direction)
        this.scene.add(barn);
        this.sceneryObjects.push(barn);
        
        // Additional scattered trees in fields - MINIMUM 40 from road center, only AHEAD
        for (let i = 0; i < treeCount; i++) {
            const tree = this.createTree(treeStyle);
            const side = Math.random() > 0.5 ? -1 : 1;
            tree.position.set(
                carX + side * (40 + Math.random() * 25),
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
                carX + side * (30 + Math.random() * 25),
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
                carX + side * (25 + Math.random() * 30),
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
        
        // Select tree textures based on style
        let treeTextures = [];
        if (style === 'green') {
            treeTextures = [
                this.textures.treeGreen1,
                this.textures.treeGreen2,
                this.textures.treeGreen3,
            ].filter(t => t);
        } else if (style === 'autumn') {
            treeTextures = [
                this.textures.treeAutumn1,
                this.textures.treeAutumn2,
                this.textures.treeAutumn3,
            ].filter(t => t);
        } else {
            // Mixed - use all
            treeTextures = [
                this.textures.treeGreen1,
                this.textures.treeGreen2,
                this.textures.treeGreen3,
                this.textures.treeAutumn1,
                this.textures.treeAutumn2,
                this.textures.treeAutumn3,
            ].filter(t => t);
        }
        
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
            const treeType = style === 'autumn' ? 0 : (style === 'green' ? 1 : Math.random());
            
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
            const plane = new THREE.Mesh(planeGeo, material);
            // Position so bottom edge touches ground - adjust for PNG padding
            plane.position.y = height / 2 - 4; // Lower by 4 units to firmly ground it
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
    
    createHayBale() {
        const hayGroup = new THREE.Group();
        
        const hayMat = new THREE.MeshLambertMaterial({ color: 0xDAA520 }); // Golden
        const hayGeo = new THREE.CylinderGeometry(1.2, 1.2, 2, 16);
        const hay = new THREE.Mesh(hayGeo, hayMat);
        hay.rotation.z = Math.PI / 2;
        hay.position.y = 1.2;
        hay.castShadow = true;
        hayGroup.add(hay);
        
        return hayGroup;
    }
    
    createCar() {
        this.car = new THREE.Group();
        
        // Beautiful classic sedan - warm bronze/copper color
        const bodyColor = 0xB87333; // Copper bronze
        const bodyMat = new THREE.MeshPhongMaterial({ 
            color: bodyColor, 
            shininess: 100,
            specular: 0x444444
        });
        const chromeMat = new THREE.MeshPhongMaterial({ 
            color: 0xCCCCCC, 
            shininess: 150,
            specular: 0xFFFFFF
        });
        const darkMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
        const glassMat = new THREE.MeshPhongMaterial({ 
            color: 0x88CCFF, 
            transparent: true, 
            opacity: 0.6,
            shininess: 100 
        });
        const lightMat = new THREE.MeshBasicMaterial({ color: 0xFFFFCC });
        const tailLightMat = new THREE.MeshBasicMaterial({ color: 0xFF3333 });
        
        // === MAIN BODY - Lower section with rounded edges ===
        const bodyWidth = 2.4;
        const bodyHeight = 0.9;
        const bodyLength = 4.8;
        
        // Main body (box with beveled feel via multiple pieces)
        const mainBodyGeo = new THREE.BoxGeometry(bodyWidth, bodyHeight, bodyLength);
        const mainBody = new THREE.Mesh(mainBodyGeo, bodyMat);
        mainBody.position.set(0, 0.7, 0);
        mainBody.castShadow = true;
        this.car.add(mainBody);
        
        // Rounded front hood piece
        const hoodGeo = new THREE.BoxGeometry(bodyWidth - 0.1, 0.15, 1.2);
        const hood = new THREE.Mesh(hoodGeo, bodyMat);
        hood.position.set(0, 1.2, -1.6);
        hood.castShadow = true;
        this.car.add(hood);
        
        // Front bumper area - sloped
        const frontSlopeGeo = new THREE.BoxGeometry(bodyWidth, 0.4, 0.6);
        const frontSlope = new THREE.Mesh(frontSlopeGeo, bodyMat);
        frontSlope.position.set(0, 0.45, -2.5);
        frontSlope.rotation.x = 0.3;
        this.car.add(frontSlope);
        
        // === CABIN - Greenhouse ===
        const cabinWidth = 2.2;
        const cabinHeight = 0.8;
        const cabinLength = 2.4;
        
        const cabinGeo = new THREE.BoxGeometry(cabinWidth, cabinHeight, cabinLength);
        const cabin = new THREE.Mesh(cabinGeo, bodyMat);
        cabin.position.set(0, 1.55, 0.2);
        cabin.castShadow = true;
        this.car.add(cabin);
        
        // === WINDOWS ===
        // Windshield (angled)
        const windshieldShape = new THREE.Shape();
        windshieldShape.moveTo(-0.95, 0);
        windshieldShape.lineTo(-0.85, 0.7);
        windshieldShape.lineTo(0.85, 0.7);
        windshieldShape.lineTo(0.95, 0);
        windshieldShape.closePath();
        
        const windshieldGeo = new THREE.ExtrudeGeometry(windshieldShape, { depth: 0.05, bevelEnabled: false });
        const windshield = new THREE.Mesh(windshieldGeo, glassMat);
        windshield.position.set(0, 1.2, -1.03);
        windshield.rotation.x = -0.45;
        this.car.add(windshield);
        
        // Rear window
        const rearWindowGeo = new THREE.ExtrudeGeometry(windshieldShape, { depth: 0.05, bevelEnabled: false });
        const rearWindow = new THREE.Mesh(rearWindowGeo, glassMat);
        rearWindow.position.set(0, 1.2, 1.43);
        rearWindow.rotation.x = 0.45;
        rearWindow.rotation.y = Math.PI;
        this.car.add(rearWindow);
        
        // Side windows (left)
        const sideWinGeo = new THREE.PlaneGeometry(1.8, 0.55);
        const leftWin = new THREE.Mesh(sideWinGeo, glassMat);
        leftWin.position.set(-1.11, 1.6, 0.2);
        leftWin.rotation.y = Math.PI / 2;
        this.car.add(leftWin);
        
        // Side windows (right)
        const rightWin = new THREE.Mesh(sideWinGeo, glassMat);
        rightWin.position.set(1.11, 1.6, 0.2);
        rightWin.rotation.y = -Math.PI / 2;
        this.car.add(rightWin);
        
        // === WHEELS with hubcaps ===
        const wheelPositions = [
            { x: -1.0, z: -1.4 },
            { x: 1.0, z: -1.4 },
            { x: -1.0, z: 1.4 },
            { x: 1.0, z: 1.4 }
        ];
        
        wheelPositions.forEach(pos => {
            const wheelGroup = new THREE.Group();
            
            // Tire
            const tireGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.32, 24);
            const tire = new THREE.Mesh(tireGeo, darkMat);
            tire.rotation.z = Math.PI / 2;
            tire.castShadow = true;
            wheelGroup.add(tire);
            
            // Hubcap
            const hubGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.34, 16);
            const hub = new THREE.Mesh(hubGeo, chromeMat);
            hub.rotation.z = Math.PI / 2;
            wheelGroup.add(hub);
            
            // Hubcap detail (spokes)
            for (let i = 0; i < 5; i++) {
                const spokeGeo = new THREE.BoxGeometry(0.35, 0.05, 0.06);
                const spoke = new THREE.Mesh(spokeGeo, chromeMat);
                spoke.rotation.z = (i / 5) * Math.PI;
                spoke.position.x = pos.x > 0 ? 0.17 : -0.17;
                wheelGroup.add(spoke);
            }
            
            wheelGroup.position.set(pos.x, 0.42, pos.z);
            this.car.add(wheelGroup);
        });
        
        // === WHEEL WELLS - Fender arches ===
        const wellMat = new THREE.MeshLambertMaterial({ color: bodyColor });
        wheelPositions.forEach(pos => {
            const wellGeo = new THREE.TorusGeometry(0.5, 0.08, 8, 12, Math.PI);
            const well = new THREE.Mesh(wellGeo, wellMat);
            well.rotation.x = Math.PI / 2;
            well.rotation.z = pos.x > 0 ? -Math.PI / 2 : Math.PI / 2;
            well.position.set(pos.x > 0 ? bodyWidth / 2 + 0.01 : -bodyWidth / 2 - 0.01, 0.42, pos.z);
            this.car.add(well);
        });
        
        // === CHROME BUMPERS ===
        // Front bumper
        const frontBumperGeo = new THREE.BoxGeometry(bodyWidth + 0.2, 0.15, 0.2);
        const frontBumper = new THREE.Mesh(frontBumperGeo, chromeMat);
        frontBumper.position.set(0, 0.35, -2.55);
        this.car.add(frontBumper);
        
        // Rear bumper
        const rearBumper = new THREE.Mesh(frontBumperGeo, chromeMat);
        rearBumper.position.set(0, 0.35, 2.45);
        this.car.add(rearBumper);
        
        // === GRILLE ===
        const grilleGeo = new THREE.BoxGeometry(1.4, 0.4, 0.05);
        const grille = new THREE.Mesh(grilleGeo, chromeMat);
        grille.position.set(0, 0.55, -2.43);
        this.car.add(grille);
        
        // Grille slats
        for (let i = 0; i < 5; i++) {
            const slatGeo = new THREE.BoxGeometry(1.3, 0.03, 0.06);
            const slat = new THREE.Mesh(slatGeo, darkMat);
            slat.position.set(0, 0.4 + i * 0.08, -2.44);
            this.car.add(slat);
        }
        
        // === HEADLIGHTS ===
        const headlightGeo = new THREE.CircleGeometry(0.2, 16);
        [-0.75, 0.75].forEach(x => {
            // Chrome ring
            const ringGeo = new THREE.TorusGeometry(0.22, 0.03, 8, 16);
            const ring = new THREE.Mesh(ringGeo, chromeMat);
            ring.position.set(x, 0.65, -2.42);
            this.car.add(ring);
            
            // Light
            const light = new THREE.Mesh(headlightGeo, lightMat);
            light.position.set(x, 0.65, -2.41);
            this.car.add(light);
        });
        
        // === TAILLIGHTS ===
        const taillightGeo = new THREE.BoxGeometry(0.4, 0.2, 0.05);
        [-0.85, 0.85].forEach(x => {
            const taillight = new THREE.Mesh(taillightGeo, tailLightMat);
            taillight.position.set(x, 0.65, 2.41);
            this.car.add(taillight);
        });
        
        // === SIDE MIRRORS ===
        const mirrorMat = bodyMat;
        [-1.2, 1.2].forEach(x => {
            const mirrorGroup = new THREE.Group();
            
            // Mirror arm
            const armGeo = new THREE.BoxGeometry(0.08, 0.05, 0.25);
            const arm = new THREE.Mesh(armGeo, mirrorMat);
            arm.position.z = -0.12;
            mirrorGroup.add(arm);
            
            // Mirror housing
            const housingGeo = new THREE.BoxGeometry(0.15, 0.12, 0.08);
            const housing = new THREE.Mesh(housingGeo, mirrorMat);
            housing.position.z = -0.28;
            mirrorGroup.add(housing);
            
            // Mirror glass
            const mirrorGlassGeo = new THREE.PlaneGeometry(0.12, 0.1);
            const mirrorGlass = new THREE.Mesh(mirrorGlassGeo, glassMat);
            mirrorGlass.position.set(0, 0, -0.33);
            mirrorGroup.add(mirrorGlass);
            
            mirrorGroup.position.set(x, 1.4, -0.8);
            this.car.add(mirrorGroup);
        });
        
        // === DOOR HANDLES ===
        [-1.21, 1.21].forEach(x => {
            const handleGeo = new THREE.BoxGeometry(0.03, 0.05, 0.2);
            const handle = new THREE.Mesh(handleGeo, chromeMat);
            handle.position.set(x, 1.0, 0);
            this.car.add(handle);
            
            // Rear door handle
            const handle2 = new THREE.Mesh(handleGeo, chromeMat);
            handle2.position.set(x, 1.0, 0.8);
            this.car.add(handle2);
        });
        
        // === ROOF EDGE TRIM ===
        const roofTrimGeo = new THREE.BoxGeometry(cabinWidth + 0.1, 0.03, cabinLength + 0.1);
        const roofTrim = new THREE.Mesh(roofTrimGeo, chromeMat);
        roofTrim.position.set(0, 1.96, 0.2);
        this.car.add(roofTrim);
        
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
            // Hills positioned ahead on distant horizon using car's forward direction
            const hillOffsetX = this.car.position.x - Math.sin(this.car.rotation.y) * 170;
            const hillOffsetZ = this.car.position.z - Math.cos(this.car.rotation.y) * 170;
            this.hillGroup.position.set(hillOffsetX, 0, hillOffsetZ);
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
        const exitDist = 60; // How far down new road to generate scenery
        
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
        
        // Generate trees along the road direction - FAR from road
        for (let dist = 30; dist < 110; dist += 18) {
            const baseX = carX - Math.sin(carRot) * dist;
            const baseZ = carZ - Math.cos(carRot) * dist;
            
            // Left side tree
            const leftTree = this.createTree(treeStyle);
            const leftOffset = roadSide + 18 + Math.random() * 12;
            leftTree.position.set(
                baseX - Math.cos(carRot) * leftOffset,
                0,
                baseZ + Math.sin(carRot) * leftOffset
            );
            objects.push(leftTree);
            
            // Right side tree
            const rightTree = this.createTree(treeStyle);
            const rightOffset = roadSide + 18 + Math.random() * 12;
            rightTree.position.set(
                baseX + Math.cos(carRot) * rightOffset,
                0,
                baseZ - Math.sin(carRot) * rightOffset
            );
            objects.push(rightTree);
        }
        
        // Add fences along both sides of road
        const fenceGroup = this.createFenceForDirection(carX, carZ, carRot, roadSide + 5, config.fenceType);
        if (fenceGroup) objects.push(fenceGroup);
        
        // Add a barn - CLOSER to road for better visibility
        if (config.barnSide !== 'none') {
            const barn = this.createBarn();
            const barnSide = config.barnSide === 'left' ? -1 : 1;
            const barnDist = 50;
            barn.position.set(
                carX - Math.sin(carRot) * barnDist + Math.cos(carRot) * barnSide * 35,
                0,
                carZ - Math.cos(carRot) * barnDist - Math.sin(carRot) * barnSide * 35
            );
            // Rotate barn to face the road
            barn.rotation.y = carRot;
            objects.push(barn);
        }
        
        // Add lake if configured
        if (config.lakeSide !== 'none') {
            const lake = this.createLakeForDirection(carX, carZ, carRot, config.lakeSide);
            if (lake) objects.push(lake);
        }
        
        // Add bushes far from road
        for (let i = 0; i < config.bushCount; i++) {
            const bush = this.createBush();
            const side = Math.random() > 0.5 ? -1 : 1;
            const dist = 40 + Math.random() * 50;
            bush.position.set(
                carX - Math.sin(carRot) * dist + Math.cos(carRot) * side * (35 + Math.random() * 20),
                0,
                carZ - Math.cos(carRot) * dist - Math.sin(carRot) * side * (35 + Math.random() * 20)
            );
            objects.push(bush);
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
            
            // Place fences on both sides along the road - START AFTER INTERSECTION GAP
            for (let dist = 45; dist < 100; dist += spacing) {
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
        if (!this.textures.lake) return null;
        
        const lakeGroup = new THREE.Group();
        const material = new THREE.MeshBasicMaterial({
            map: this.textures.lake,
            transparent: true,
            alphaTest: 0.1,
            side: THREE.DoubleSide
        });
        
        const lakeSize = 25 + Math.random() * 10;
        const planeGeo = new THREE.PlaneGeometry(lakeSize, lakeSize * 0.7);
        const lake = new THREE.Mesh(planeGeo, material);
        lake.rotation.x = -Math.PI / 2; // Lay flat
        
        // Position lake to side of road ahead - CLOSER for better visibility
        const sideMultiplier = lakeSide === 'left' ? -1 : 1;
        const distAhead = 40 + Math.random() * 20;
        lake.position.set(
            carX - Math.sin(carRot) * distAhead + Math.cos(carRot) * sideMultiplier * 30,
            0.15,
            carZ - Math.cos(carRot) * distAhead - Math.sin(carRot) * sideMultiplier * 30
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
        const delta = this.clock.getDelta();
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
            // Smooth approach to destination
            const targetSpeed = Math.max(2, this.carSpeed * 0.97);
            this.carSpeed = targetSpeed;
            
            this.car.position.x -= Math.sin(this.car.rotation.y) * this.carSpeed * delta;
            this.car.position.z -= Math.cos(this.car.rotation.y) * this.carSpeed * delta;
            
            // Check if we should start parking
            if (this.parkingSpot) {
                const dx = this.car.position.x - this.parkingSpot.x;
                const dz = this.car.position.z - this.parkingSpot.z;
                const distToParking = Math.sqrt(dx * dx + dz * dz);
                
                if (distToParking < 30) {
                    this.setState('PARKING');
                    this.parkingProgress = 0;
                    this.parkingStartPos = { x: this.car.position.x, z: this.car.position.z };
                    this.parkingStartRot = this.car.rotation.y;
                }
            } else if (this.carSpeed < 0.5) {
                this.carSpeed = 0;
                if (this.onArrivalComplete) this.onArrivalComplete();
            }
        }
        
        if (this.state === 'PARKING') {
            // Smooth parking animation - pull off road to the right
            this.parkingProgress += delta * 0.4;
            
            if (this.parkingProgress >= 1) {
                this.parkingProgress = 1;
                this.carSpeed = 0;
                this.car.position.y = 0;
                if (this.onArrivalComplete) this.onArrivalComplete();
            } else {
                const t = this.easeInOutQuad(this.parkingProgress);
                
                // Move car to parking spot
                this.car.position.x = this.parkingStartPos.x + (this.parkingSpot.x - this.parkingStartPos.x) * t;
                this.car.position.z = this.parkingStartPos.z + (this.parkingSpot.z - this.parkingStartPos.z) * t;
                
                // Slight turn into parking spot
                const turnAmount = Math.PI / 8; // Small turn
                this.car.rotation.y = this.parkingStartRot + turnAmount * t;
                
                // Gentle bounce during movement
                this.car.position.y = Math.sin(this.parkingProgress * Math.PI * 2) * 0.02 * (1 - t);
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
        
        // Update hills relative to car - keep on distant horizon ahead
        if (this.hillGroup) {
            // Hills follow car but stay far ahead on distant horizon
            const hillOffsetX = this.car.position.x - Math.sin(this.car.rotation.y) * 170;
            const hillOffsetZ = this.car.position.z - Math.cos(this.car.rotation.y) * 170;
            this.hillGroup.position.x = hillOffsetX;
            this.hillGroup.position.z = hillOffsetZ;
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
        this.turnDirection = direction;
        this.turnProgress = 0;
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
            // Control point is at intersection center, offset toward the turn
            this.turnControlPoint = {
                x: intX - Math.cos(intRot) * turnRadius * 0.3,
                z: intZ + Math.sin(intRot) * turnRadius * 0.3 - Math.cos(intRot) * turnRadius * 0.3
            };
            this.turnEndPos = {
                x: intX - Math.cos(intRot) * exitDist,
                z: intZ + Math.sin(intRot) * exitDist
            };
        } else if (direction === 'right') {
            this.turnEndRot = intRot - Math.PI / 2;
            this.turnControlPoint = {
                x: intX + Math.cos(intRot) * turnRadius * 0.3,
                z: intZ - Math.sin(intRot) * turnRadius * 0.3 - Math.cos(intRot) * turnRadius * 0.3
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
        this.targetCarSpeed = 14;
        
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
            // Hills ahead on distant horizon using car's forward direction
            const hillOffsetX = this.car.position.x - Math.sin(this.car.rotation.y) * 170;
            const hillOffsetZ = this.car.position.z - Math.cos(this.car.rotation.y) * 170;
            this.hillGroup.position.set(hillOffsetX, 0, hillOffsetZ);
        }
        
        // Scenery was already shown in turn() - no need to touch it here!
        // Just make sure currentRoadSceneryCreated is true to prevent recreation
        this.currentRoadSceneryCreated = true;
        
        if (this.onTurnComplete) {
            this.onTurnComplete();
        }
    }
    
    regenerateSceneryForNewRoad() {
        // Clear old scenery
        this.sceneryObjects.forEach(obj => this.scene.remove(obj));
        this.sceneryObjects = [];
        
        const carX = this.car.position.x;
        const carZ = this.car.position.z;
        const carRot = this.car.rotation.y;
        const roadSide = this.ROAD_WIDTH / 2 + 8; // Larger buffer
        
        // Generate new random config for this road
        this.sceneryConfig = this.getRandomSceneryConfig();
        const treeStyle = this.sceneryConfig.treeStyle;
        
        // Generate trees along the new road direction (ahead of car) - FAR from road
        for (let dist = 25; dist < 100; dist += 15) {
            // Position along the road (ahead)
            const baseX = carX - Math.sin(carRot) * dist;
            const baseZ = carZ - Math.cos(carRot) * dist;
            
            // Left side tree - far from road
            const leftTree = this.createTree(treeStyle);
            const leftOffset = roadSide + 18 + Math.random() * 12;
            leftTree.position.set(
                baseX - Math.cos(carRot) * leftOffset,
                0,
                baseZ + Math.sin(carRot) * leftOffset
            );
            this.scene.add(leftTree);
            this.sceneryObjects.push(leftTree);
            
            // Right side tree - far from road
            const rightTree = this.createTree(treeStyle);
            const rightOffset = roadSide + 18 + Math.random() * 12;
            rightTree.position.set(
                baseX + Math.cos(carRot) * rightOffset,
                0,
                baseZ - Math.sin(carRot) * rightOffset
            );
            this.scene.add(rightTree);
            this.sceneryObjects.push(rightTree);
        }
        
        // Add fences along the road - further out
        this.createFenceAlongRoad(carX, carZ, carRot, -roadSide - 8, 20, 90);
        this.createFenceAlongRoad(carX, carZ, carRot, roadSide + 8, 20, 90);
        
        // Add a barn on one side - far from road
        const barn = this.createBarn();
        const barnSide = Math.random() > 0.5 ? 1 : -1;
        const barnDist = 55 + Math.random() * 25;
        barn.position.set(
            carX - Math.sin(carRot) * barnDist + Math.cos(carRot) * barnSide * 60,
            0,
            carZ - Math.cos(carRot) * barnDist - Math.sin(carRot) * barnSide * 60
        );
        // Rotate barn to face the road (toward player's view direction)
        barn.rotation.y = carRot;
        this.scene.add(barn);
        this.sceneryObjects.push(barn);
        
        // Add hay bales - far from road
        for (let i = 0; i < 4; i++) {
            const hay = this.createHayBale();
            const side = i % 2 === 0 ? -1 : 1;
            const dist = 40 + i * 15 + Math.random() * 10;
            hay.position.set(
                carX - Math.sin(carRot) * dist + Math.cos(carRot) * side * (40 + Math.random() * 20),
                0,
                carZ - Math.cos(carRot) * dist - Math.sin(carRot) * side * (40 + Math.random() * 20)
            );
            this.scene.add(hay);
            this.sceneryObjects.push(hay);
        }
    }
    
    createFenceAlongRoad(carX, carZ, carRot, sideOffset, startDist, endDist) {
        const fenceGroup = new THREE.Group();
        const postMat = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        const railMat = new THREE.MeshLambertMaterial({ color: 0x654321 });
        
        const postSpacing = 8;
        const posts = [];
        
        for (let dist = startDist; dist < endDist; dist += postSpacing) {
            const px = carX - Math.sin(carRot) * dist + Math.cos(carRot) * sideOffset;
            const pz = carZ - Math.cos(carRot) * dist - Math.sin(carRot) * sideOffset;
            
            const postGeo = new THREE.CylinderGeometry(0.1, 0.12, 1.5, 6);
            const post = new THREE.Mesh(postGeo, postMat);
            post.position.set(px, 0.75, pz);
            post.castShadow = true;
            fenceGroup.add(post);
            posts.push({ x: px, z: pz });
        }
        
        // Rails between posts
        for (let i = 0; i < posts.length - 1; i++) {
            const p1 = posts[i];
            const p2 = posts[i + 1];
            const dx = p2.x - p1.x;
            const dz = p2.z - p1.z;
            const length = Math.sqrt(dx * dx + dz * dz);
            const angle = Math.atan2(dx, dz);
            
            const railGeo = new THREE.BoxGeometry(0.08, 0.08, length);
            
            const topRail = new THREE.Mesh(railGeo, railMat);
            topRail.position.set((p1.x + p2.x) / 2, 1.3, (p1.z + p2.z) / 2);
            topRail.rotation.y = angle;
            fenceGroup.add(topRail);
            
            const bottomRail = new THREE.Mesh(railGeo, railMat);
            bottomRail.position.set((p1.x + p2.x) / 2, 0.6, (p1.z + p2.z) / 2);
            bottomRail.rotation.y = angle;
            fenceGroup.add(bottomRail);
        }
        
        this.scene.add(fenceGroup);
        this.sceneryObjects.push(fenceGroup);
    }
    
    showNextIntersection() {
        this.positionIntersectionAhead();
    }
    
    driveToFinish() {
        // Create final destination scenery with barn close to road
        this.createFinalDestination();
        
        this.setState('ARRIVING');
        this.targetCarSpeed = 10;
        this.carSpeed = 10;
    }
    
    createFinalDestination() {
        // Clear old scenery
        this.sceneryObjects.forEach(obj => this.scene.remove(obj));
        this.sceneryObjects = [];
        
        const carX = this.car.position.x;
        const carZ = this.car.position.z;
        const carRot = this.car.rotation.y;
        
        // Position for the barn (close to road, on the right side)
        const barnDist = 70;
        const barnSideOffset = 25; // Close to road
        this.destinationBarn = this.createBarn();
        this.destinationBarn.position.set(
            carX - Math.sin(carRot) * barnDist + Math.cos(carRot) * barnSideOffset,
            0,
            carZ - Math.cos(carRot) * barnDist - Math.sin(carRot) * barnSideOffset
        );
        this.destinationBarn.rotation.y = carRot - Math.PI / 4; // Angled for visibility
        this.scene.add(this.destinationBarn);
        this.sceneryObjects.push(this.destinationBarn);
        
        // Create parking spot next to barn
        this.parkingSpot = {
            x: carX - Math.sin(carRot) * 80 + Math.cos(carRot) * 18,
            z: carZ - Math.cos(carRot) * 80 - Math.sin(carRot) * 18
        };
        
        // Add parking lot surface (small gravel area)
        const parkingGeo = new THREE.PlaneGeometry(20, 25);
        const parkingMat = new THREE.MeshLambertMaterial({ color: 0x555555 });
        const parkingLot = new THREE.Mesh(parkingGeo, parkingMat);
        parkingLot.rotation.x = -Math.PI / 2;
        parkingLot.rotation.z = carRot;
        parkingLot.position.set(this.parkingSpot.x, 0.03, this.parkingSpot.z);
        this.scene.add(parkingLot);
        this.sceneryObjects.push(parkingLot);
        
        // Add some trees around the final area
        const roadSide = this.ROAD_WIDTH / 2 + 8;
        for (let dist = 30; dist < 100; dist += 20) {
            const baseX = carX - Math.sin(carRot) * dist;
            const baseZ = carZ - Math.cos(carRot) * dist;
            
            // Left side trees
            const leftTree = this.createTree('mixed');
            leftTree.position.set(
                baseX - Math.cos(carRot) * (roadSide + 15),
                0,
                baseZ + Math.sin(carRot) * (roadSide + 15)
            );
            this.scene.add(leftTree);
            this.sceneryObjects.push(leftTree);
            
            // Right side trees (fewer, leave space for parking)
            if (dist > 50) {
                const rightTree = this.createTree('mixed');
                rightTree.position.set(
                    baseX + Math.cos(carRot) * (roadSide + 25),
                    0,
                    baseZ - Math.sin(carRot) * (roadSide + 25)
                );
                this.scene.add(rightTree);
                this.sceneryObjects.push(rightTree);
            }
        }
        
        // Add fences but leave gap for parking entry
        const fenceGroup = new THREE.Group();
        const postMat = new THREE.MeshLambertMaterial({ color: 0x8B5A3C });
        const railMat = new THREE.MeshLambertMaterial({ color: 0x7A4A30 });
        
        // Left side fence
        for (let dist = 20; dist < 90; dist += 5) {
            const baseX = carX - Math.sin(carRot) * dist;
            const baseZ = carZ - Math.cos(carRot) * dist;
            
            const postGeo = new THREE.BoxGeometry(0.3, 1.8, 0.3);
            const post = new THREE.Mesh(postGeo, postMat);
            post.position.set(
                baseX - Math.cos(carRot) * (roadSide + 6),
                0.9,
                baseZ + Math.sin(carRot) * (roadSide + 6)
            );
            fenceGroup.add(post);
        }
        
        this.scene.add(fenceGroup);
        this.sceneryObjects.push(fenceGroup);
        
        // Mark scenery as created
        this.currentRoadSceneryCreated = true;
    }
    
    reset() {
        this.car.position.set(0, 0, 70);
        this.car.rotation.y = 0;
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
        this.destinationBarn = null;
        
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
