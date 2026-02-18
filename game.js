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
        this.turnStartRot = 0;
        this.turnEndRot = 0;
        
        // Road constants
        this.ROAD_WIDTH = 8;
        this.INTERSECTION_DISTANCE = 80;
        this.STOP_DISTANCE = 28; // Distance from intersection center where car stops
        
        // Callbacks
        this.onTurnComplete = null;
        this.onArrivalComplete = null;
        this.onStopAtIntersection = null;
    }
    
    init() {
        this.container = document.createElement('div');
        this.container.id = 'game-canvas';
        document.body.insertBefore(this.container, document.body.firstChild);
        
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB);
        
        // Add fog for depth
        this.scene.fog = new THREE.Fog(0x87CEEB, 100, 400);
        
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.container.appendChild(this.renderer.domElement);
        
        // Build scene
        this.setupLighting();
        this.createGround();
        this.createHills();
        this.createInfiniteRoad();
        this.createIntersection();
        this.createScenery();
        this.createCar();
        
        // Position intersection ahead of car
        this.positionIntersectionAhead();
        
        this.updateCamera(true);
        this.animate();
        
        window.addEventListener('resize', () => this.onResize());
    }
    
    setupLighting() {
        const ambient = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambient);
        
        const sun = new THREE.DirectionalLight(0xffffff, 0.9);
        sun.position.set(50, 100, 50);
        sun.castShadow = true;
        sun.shadow.mapSize.width = 2048;
        sun.shadow.mapSize.height = 2048;
        sun.shadow.camera.near = 10;
        sun.shadow.camera.far = 500;
        sun.shadow.camera.left = -200;
        sun.shadow.camera.right = 200;
        sun.shadow.camera.top = 200;
        sun.shadow.camera.bottom = -200;
        this.scene.add(sun);
        this.sun = sun;
    }
    
    createGround() {
        // Large ground plane - grass field
        const groundGeo = new THREE.PlaneGeometry(2000, 2000);
        const groundMat = new THREE.MeshLambertMaterial({ color: 0x4CAF50 });
        this.ground = new THREE.Mesh(groundGeo, groundMat);
        this.ground.rotation.x = -Math.PI / 2;
        this.ground.position.y = -0.1;
        this.ground.receiveShadow = true;
        this.scene.add(this.ground);
    }
    
    createHills() {
        // Tennessee rolling hills in background
        this.hillGroup = new THREE.Group();
        
        const hillConfigs = [
            { x: -250, z: -350, height: 55, color: 0x2d5a2d },
            { x: 0, z: -400, height: 70, color: 0x2d5a2d },
            { x: 250, z: -370, height: 60, color: 0x2d5a2d },
            { x: -350, z: -320, height: 50, color: 0x2d5a2d },
            { x: 350, z: -350, height: 52, color: 0x2d5a2d },
            { x: -180, z: -280, height: 40, color: 0x3d6b3d },
            { x: 120, z: -300, height: 45, color: 0x3d6b3d },
            { x: -280, z: -250, height: 35, color: 0x3d6b3d },
            { x: 280, z: -280, height: 38, color: 0x3d6b3d },
        ];
        
        hillConfigs.forEach(cfg => {
            const hillGeo = new THREE.SphereGeometry(cfg.height * 2, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
            const hillMat = new THREE.MeshLambertMaterial({ color: cfg.color });
            const hill = new THREE.Mesh(hillGeo, hillMat);
            hill.position.set(cfg.x, 0, cfg.z);
            hill.scale.set(2.5, 1, 2.5);
            this.hillGroup.add(hill);
        });
        
        this.scene.add(this.hillGroup);
    }
    
    createInfiniteRoad() {
        // Main road the car drives on
        this.roadGroup = new THREE.Group();
        
        const roadMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
        const lineMat = new THREE.MeshBasicMaterial({ color: 0xFFFF00 });
        const edgeMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
        
        const roadLength = 600;
        const roadGeo = new THREE.PlaneGeometry(this.ROAD_WIDTH, roadLength);
        const road = new THREE.Mesh(roadGeo, roadMat);
        road.rotation.x = -Math.PI / 2;
        road.position.set(0, 0.01, 0);
        road.receiveShadow = true;
        this.roadGroup.add(road);
        
        // Center yellow dashed line
        for (let z = roadLength / 2; z > -roadLength / 2; z -= 10) {
            const dashGeo = new THREE.PlaneGeometry(0.25, 5);
            const dash = new THREE.Mesh(dashGeo, lineMat);
            dash.rotation.x = -Math.PI / 2;
            dash.position.set(0, 0.02, z);
            this.roadGroup.add(dash);
        }
        
        // White edge lines
        const edgeGeo = new THREE.PlaneGeometry(0.3, roadLength);
        const leftEdge = new THREE.Mesh(edgeGeo, edgeMat);
        leftEdge.rotation.x = -Math.PI / 2;
        leftEdge.position.set(-this.ROAD_WIDTH / 2 + 0.2, 0.02, 0);
        this.roadGroup.add(leftEdge);
        
        const rightEdge = new THREE.Mesh(edgeGeo, edgeMat);
        rightEdge.rotation.x = -Math.PI / 2;
        rightEdge.position.set(this.ROAD_WIDTH / 2 - 0.2, 0.02, 0);
        this.roadGroup.add(rightEdge);
        
        this.scene.add(this.roadGroup);
    }
    
    createIntersection() {
        this.intersectionGroup = new THREE.Group();
        
        const roadMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
        
        // === INTERSECTION CENTER (crossroads) ===
        // Make it a proper connected intersection
        const junctionSize = this.ROAD_WIDTH * 2.5;
        const junctionGeo = new THREE.PlaneGeometry(junctionSize, junctionSize);
        const junction = new THREE.Mesh(junctionGeo, roadMat);
        junction.rotation.x = -Math.PI / 2;
        junction.position.set(0, 0.015, 0);
        junction.receiveShadow = true;
        this.intersectionGroup.add(junction);
        
        // === CONNECTED ROADS ===
        const sideRoadLength = 200;
        
        // LEFT ROAD - connects directly to junction
        const leftRoadGeo = new THREE.PlaneGeometry(this.ROAD_WIDTH, sideRoadLength);
        const leftRoad = new THREE.Mesh(leftRoadGeo, roadMat);
        leftRoad.rotation.x = -Math.PI / 2;
        leftRoad.rotation.z = Math.PI / 2;
        leftRoad.position.set(-junctionSize / 2 - sideRoadLength / 2, 0.01, 0);
        leftRoad.receiveShadow = true;
        this.intersectionGroup.add(leftRoad);
        
        // RIGHT ROAD - connects directly to junction
        const rightRoad = new THREE.Mesh(leftRoadGeo, roadMat);
        rightRoad.rotation.x = -Math.PI / 2;
        rightRoad.rotation.z = Math.PI / 2;
        rightRoad.position.set(junctionSize / 2 + sideRoadLength / 2, 0.01, 0);
        rightRoad.receiveShadow = true;
        this.intersectionGroup.add(rightRoad);
        
        // STRAIGHT ROAD - connects directly to junction
        const straightRoadGeo = new THREE.PlaneGeometry(this.ROAD_WIDTH, sideRoadLength);
        const straightRoad = new THREE.Mesh(straightRoadGeo, roadMat);
        straightRoad.rotation.x = -Math.PI / 2;
        straightRoad.position.set(0, 0.01, -junctionSize / 2 - sideRoadLength / 2);
        straightRoad.receiveShadow = true;
        this.intersectionGroup.add(straightRoad);
        
        // BACK ROAD (where car comes from) - extends back
        const backRoad = new THREE.Mesh(straightRoadGeo, roadMat);
        backRoad.rotation.x = -Math.PI / 2;
        backRoad.position.set(0, 0.01, junctionSize / 2 + sideRoadLength / 2);
        backRoad.receiveShadow = true;
        this.intersectionGroup.add(backRoad);
        
        // === YELLOW DIRECTION POLES - at the far side of intersection ===
        this.createDirectionPole(-8, -12, 'LEFT', 'left');
        this.createDirectionPole(0, -15, 'STRAIGHT', 'straight');
        this.createDirectionPole(8, -12, 'RIGHT', 'right');
        
        // === STOP SIGN - on the RIGHT side of road, before intersection ===
        this.createStopSign(this.ROAD_WIDTH / 2 + 2, 18);
        
        // === WHITE STOP LINE on road - at edge of junction ===
        const junctionEdge = this.ROAD_WIDTH * 2.5 / 2;
        const stopLineGeo = new THREE.PlaneGeometry(this.ROAD_WIDTH - 1, 0.8);
        const stopLineMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
        const stopLine = new THREE.Mesh(stopLineGeo, stopLineMat);
        stopLine.rotation.x = -Math.PI / 2;
        stopLine.position.set(0, 0.025, junctionEdge + 2);
        this.intersectionGroup.add(stopLine);
        
        this.intersectionGroup.visible = false;
        this.scene.add(this.intersectionGroup);
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
        
        // Create rich Tennessee scenery on both sides of the road
        this.createRoadsideScenery();
    }
    
    createRoadsideScenery() {
        const roadSide = this.ROAD_WIDTH / 2 + 3;
        
        // Trees along both sides - ONLY BEFORE intersection (z > 20)
        // Intersection is at z = -10 approximately, so keep scenery away from there
        for (let z = 80; z > 25; z -= 12) {
            // Left side trees
            const leftTree = this.createTree();
            leftTree.position.set(-roadSide - 10 - Math.random() * 12, 0, z + Math.random() * 5);
            this.scene.add(leftTree);
            this.sceneryObjects.push(leftTree);
            
            // Right side trees
            const rightTree = this.createTree();
            rightTree.position.set(roadSide + 10 + Math.random() * 12, 0, z + Math.random() * 5);
            this.scene.add(rightTree);
            this.sceneryObjects.push(rightTree);
        }
        
        // Fences along both sides - ONLY before the intersection area
        this.createFence(-roadSide - 4, 75, 30, 'left');
        this.createFence(roadSide + 4, 75, 30, 'right');
        
        // Barns FAR in the distance (not near intersection)
        const barn1 = this.createBarn();
        barn1.position.set(-70, 0, 60);
        barn1.rotation.y = 0.3;
        this.scene.add(barn1);
        this.sceneryObjects.push(barn1);
        
        const barn2 = this.createBarn();
        barn2.position.set(75, 0, 50);
        barn2.rotation.y = -0.5;
        this.scene.add(barn2);
        this.sceneryObjects.push(barn2);
        
        // Hay bales - only in far areas, not near intersection
        for (let i = 0; i < 6; i++) {
            const hayBale = this.createHayBale();
            const side = i % 2 === 0 ? -1 : 1;
            hayBale.position.set(
                side * (40 + Math.random() * 35),
                0,
                70 - i * 8 + Math.random() * 5
            );
            this.scene.add(hayBale);
            this.sceneryObjects.push(hayBale);
        }
        
        // Additional scattered trees in far fields only
        for (let i = 0; i < 12; i++) {
            const tree = this.createTree();
            const side = Math.random() > 0.5 ? -1 : 1;
            tree.position.set(
                side * (45 + Math.random() * 50),
                0,
                90 - Math.random() * 60
            );
            this.scene.add(tree);
            this.sceneryObjects.push(tree);
        }
    }
    
    createTree() {
        const tree = new THREE.Group();
        
        // Trunk
        const trunkGeo = new THREE.CylinderGeometry(0.3, 0.5, 4, 8);
        const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.y = 2;
        trunk.castShadow = true;
        tree.add(trunk);
        
        // Foliage layers (pine tree style)
        const foliageMat = new THREE.MeshLambertMaterial({ color: 0x228B22 });
        const layers = [
            { y: 4, radius: 3, height: 3.5 },
            { y: 6, radius: 2.3, height: 3 },
            { y: 7.5, radius: 1.6, height: 2.5 },
            { y: 8.7, radius: 0.9, height: 2 }
        ];
        
        layers.forEach(layer => {
            const coneGeo = new THREE.ConeGeometry(layer.radius, layer.height, 8);
            const cone = new THREE.Mesh(coneGeo, foliageMat);
            cone.position.y = layer.y;
            cone.castShadow = true;
            tree.add(cone);
        });
        
        const scale = 0.6 + Math.random() * 0.5;
        tree.scale.set(scale, scale, scale);
        
        return tree;
    }
    
    createFence(x, startZ, endZ, side) {
        const fenceGroup = new THREE.Group();
        const postMat = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        const railMat = new THREE.MeshLambertMaterial({ color: 0x654321 });
        
        const postSpacing = 8;
        const posts = [];
        
        for (let z = startZ; z >= endZ; z -= postSpacing) {
            // Fence post
            const postGeo = new THREE.CylinderGeometry(0.1, 0.12, 1.5, 6);
            const post = new THREE.Mesh(postGeo, postMat);
            post.position.set(x, 0.75, z);
            post.castShadow = true;
            fenceGroup.add(post);
            posts.push({ x, z });
        }
        
        // Horizontal rails between posts
        for (let i = 0; i < posts.length - 1; i++) {
            const p1 = posts[i];
            const p2 = posts[i + 1];
            const length = Math.abs(p2.z - p1.z);
            
            // Top rail
            const railGeo = new THREE.BoxGeometry(0.08, 0.08, length);
            const topRail = new THREE.Mesh(railGeo, railMat);
            topRail.position.set(x, 1.3, (p1.z + p2.z) / 2);
            fenceGroup.add(topRail);
            
            // Bottom rail
            const bottomRail = new THREE.Mesh(railGeo, railMat);
            bottomRail.position.set(x, 0.6, (p1.z + p2.z) / 2);
            fenceGroup.add(bottomRail);
        }
        
        this.scene.add(fenceGroup);
        this.sceneryObjects.push(fenceGroup);
    }
    
    createBarn() {
        const barn = new THREE.Group();
        
        // Main structure
        const wallMat = new THREE.MeshLambertMaterial({ color: 0x8B0000 }); // Dark red
        const roofMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
        
        // Walls
        const wallsGeo = new THREE.BoxGeometry(12, 8, 16);
        const walls = new THREE.Mesh(wallsGeo, wallMat);
        walls.position.y = 4;
        walls.castShadow = true;
        walls.receiveShadow = true;
        barn.add(walls);
        
        // Roof (triangular prism)
        const roofShape = new THREE.Shape();
        roofShape.moveTo(-7, 0);
        roofShape.lineTo(0, 5);
        roofShape.lineTo(7, 0);
        roofShape.closePath();
        
        const roofGeo = new THREE.ExtrudeGeometry(roofShape, { depth: 17, bevelEnabled: false });
        const roof = new THREE.Mesh(roofGeo, roofMat);
        roof.rotation.x = -Math.PI / 2;
        roof.position.set(0, 8, 8.5);
        roof.castShadow = true;
        barn.add(roof);
        
        // White trim/doors
        const trimMat = new THREE.MeshLambertMaterial({ color: 0xFFFFFF });
        const doorGeo = new THREE.PlaneGeometry(4, 6);
        const door = new THREE.Mesh(doorGeo, trimMat);
        door.position.set(0, 3, 8.01);
        barn.add(door);
        
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
        
        // Station wagon style - warm beige color
        const bodyMat = new THREE.MeshLambertMaterial({ color: 0xD4A574 });
        
        // Main body
        const bodyGeo = new THREE.BoxGeometry(2.6, 1.0, 4.2);
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.8;
        body.castShadow = true;
        this.car.add(body);
        
        // Cabin (station wagon extended)
        const cabinGeo = new THREE.BoxGeometry(2.3, 0.85, 3.0);
        const cabin = new THREE.Mesh(cabinGeo, bodyMat);
        cabin.position.set(0, 1.65, 0);
        cabin.castShadow = true;
        this.car.add(cabin);
        
        // Windows
        const windowMat = new THREE.MeshBasicMaterial({ color: 0x87CEEB, transparent: true, opacity: 0.7 });
        
        // Front window
        const frontWinGeo = new THREE.PlaneGeometry(2.0, 0.75);
        const frontWin = new THREE.Mesh(frontWinGeo, windowMat);
        frontWin.position.set(0, 1.65, -1.51);
        frontWin.rotation.x = 0.1;
        this.car.add(frontWin);
        
        // Rear window
        const rearWin = new THREE.Mesh(frontWinGeo, windowMat);
        rearWin.position.set(0, 1.65, 1.51);
        rearWin.rotation.x = -0.1;
        this.car.add(rearWin);
        
        // Wheels
        const wheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 16);
        const wheelMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
        
        [{ x: -1.1, z: -1.2 }, { x: 1.1, z: -1.2 }, { x: -1.1, z: 1.2 }, { x: 1.1, z: 1.2 }].forEach(pos => {
            const wheel = new THREE.Mesh(wheelGeo, wheelMat);
            wheel.rotation.z = Math.PI / 2;
            wheel.position.set(pos.x, 0.4, pos.z);
            wheel.castShadow = true;
            this.car.add(wheel);
        });
        
        // Headlights
        const lightMat = new THREE.MeshBasicMaterial({ color: 0xFFFFAA });
        const lightGeo = new THREE.CircleGeometry(0.15, 8);
        [-0.8, 0.8].forEach(x => {
            const light = new THREE.Mesh(lightGeo, lightMat);
            light.position.set(x, 0.7, -2.11);
            this.car.add(light);
        });
        
        // Car starts position
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
        
        // Reposition main road
        this.roadGroup.position.set(this.car.position.x, 0, this.car.position.z - 100);
        this.roadGroup.rotation.y = this.car.rotation.y;
    }
    
    updateCamera(instant = false) {
        if (!this.car) return;
        
        const behindX = this.car.position.x + Math.sin(this.car.rotation.y) * this.cameraOffset.z;
        const behindZ = this.car.position.z + Math.cos(this.car.rotation.y) * this.cameraOffset.z;
        const targetY = this.cameraOffset.y;
        
        if (instant) {
            this.camera.position.set(behindX, targetY, behindZ);
        } else {
            // Smoother camera follow during turns
            const smoothing = this.state === 'TURNING' ? 0.03 : 0.05;
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
            // Calculate distance to intersection CENTER (car stops in the middle)
            const stopX = this.intersectionGroup.position.x;
            const stopZ = this.intersectionGroup.position.z;
            
            const dx = this.car.position.x - stopX;
            const dz = this.car.position.z - stopZ;
            const distToStop = Math.sqrt(dx * dx + dz * dz);
            
            // Slow down based on distance to stop point
            const targetSpeed = Math.max(0.5, distToStop * 0.35);
            this.carSpeed += (targetSpeed - this.carSpeed) * 2 * delta;
            
            this.car.position.x -= Math.sin(this.car.rotation.y) * this.carSpeed * delta;
            this.car.position.z -= Math.cos(this.car.rotation.y) * this.carSpeed * delta;
            
            this.car.position.y = Math.sin(Date.now() * 0.003) * 0.02 * Math.max(0.1, this.carSpeed / 15);
            
            // Stop when close to intersection center
            if (distToStop < 2) {
                this.setState('STOPPED');
                this.carSpeed = 0;
                // Snap to exact center position
                this.car.position.x = stopX;
                this.car.position.z = stopZ;
                if (this.onStopAtIntersection) {
                    this.onStopAtIntersection();
                }
            }
        }
        
        if (this.state === 'TURNING') {
            // Slower, smoother turn
            this.turnProgress += delta * 0.35;
            
            if (this.turnProgress >= 1) {
                this.turnProgress = 1;
                this.completeTurn();
                return;
            }
            
            const t = this.easeInOutCubic(this.turnProgress);
            
            if (this.turnStartPos && this.turnEndPos) {
                this.car.position.x = this.turnStartPos.x + (this.turnEndPos.x - this.turnStartPos.x) * t;
                this.car.position.z = this.turnStartPos.z + (this.turnEndPos.z - this.turnStartPos.z) * t;
            }
            
            this.car.rotation.y = this.turnStartRot + (this.turnEndRot - this.turnStartRot) * t;
            this.car.position.y = Math.sin(this.turnProgress * Math.PI) * 0.04;
        }
        
        if (this.state === 'ARRIVING') {
            this.carSpeed *= 0.95;
            this.car.position.x -= Math.sin(this.car.rotation.y) * this.carSpeed * delta;
            this.car.position.z -= Math.cos(this.car.rotation.y) * this.carSpeed * delta;
            
            if (this.carSpeed < 0.1) {
                this.carSpeed = 0;
                if (this.onArrivalComplete) this.onArrivalComplete();
            }
        }
        
        // Update ground to follow car
        if (this.ground) {
            this.ground.position.x = this.car.position.x;
            this.ground.position.z = this.car.position.z;
        }
        
        // Update hills relative to car
        if (this.hillGroup) {
            this.hillGroup.position.x = this.car.position.x;
            this.hillGroup.position.z = this.car.position.z - 300;
        }
        
        this.updateCamera();
    }
    
    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
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
    
    turn(direction) {
        this.turnDirection = direction;
        this.turnProgress = 0;
        this.turnStartPos = { x: this.car.position.x, z: this.car.position.z };
        this.turnStartRot = this.car.rotation.y;
        
        const intX = this.intersectionGroup.position.x;
        const intZ = this.intersectionGroup.position.z;
        const intRot = this.intersectionGroup.rotation.y;
        
        const junctionSize = this.ROAD_WIDTH * 2.5;
        const exitDist = junctionSize / 2 + 30;
        
        if (direction === 'left') {
            this.turnEndRot = intRot + Math.PI / 2;
            this.turnEndPos = {
                x: intX - Math.cos(intRot) * exitDist,
                z: intZ + Math.sin(intRot) * exitDist
            };
        } else if (direction === 'right') {
            this.turnEndRot = intRot - Math.PI / 2;
            this.turnEndPos = {
                x: intX + Math.cos(intRot) * exitDist,
                z: intZ - Math.sin(intRot) * exitDist
            };
        } else { // straight
            this.turnEndRot = intRot;
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
        
        // Reposition road under car
        this.roadGroup.position.set(this.car.position.x, 0, this.car.position.z);
        this.roadGroup.rotation.y = this.car.rotation.y;
        
        if (this.onTurnComplete) {
            this.onTurnComplete();
        }
    }
    
    showNextIntersection() {
        this.positionIntersectionAhead();
    }
    
    driveToFinish() {
        this.setState('ARRIVING');
        this.targetCarSpeed = 8;
    }
    
    reset() {
        this.car.position.set(0, 0, 70);
        this.car.rotation.y = 0;
        this.carSpeed = 0;
        this.targetCarSpeed = 0;
        this.state = 'IDLE';
        this.intersectionGroup.visible = false;
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
