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
        this.turnControlPoint = null;
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
        
        const roadMat = new THREE.MeshLambertMaterial({ color: 0x2a2a2a });
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
        
        const roadMat = new THREE.MeshLambertMaterial({ color: 0x2a2a2a });
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
        const roadSide = this.ROAD_WIDTH / 2 + 5;
        
        // === LEFT ROAD SCENERY ===
        // Trees along left road
        for (let x = -junctionEdge - 25; x > -120; x -= 15) {
            const tree1 = this.createTree();
            tree1.position.set(x, 0, -roadSide - 8 - Math.random() * 10);
            this.intersectionGroup.add(tree1);
            
            const tree2 = this.createTree();
            tree2.position.set(x - 5, 0, roadSide + 8 + Math.random() * 10);
            this.intersectionGroup.add(tree2);
        }
        // Fences along left road
        this.createIntersectionFence(-junctionEdge - 20, -100, -roadSide - 3, 'horizontal');
        this.createIntersectionFence(-junctionEdge - 20, -100, roadSide + 3, 'horizontal');
        
        // === RIGHT ROAD SCENERY ===
        // Trees along right road
        for (let x = junctionEdge + 25; x < 120; x += 15) {
            const tree1 = this.createTree();
            tree1.position.set(x, 0, -roadSide - 8 - Math.random() * 10);
            this.intersectionGroup.add(tree1);
            
            const tree2 = this.createTree();
            tree2.position.set(x + 5, 0, roadSide + 8 + Math.random() * 10);
            this.intersectionGroup.add(tree2);
        }
        // Fences along right road
        this.createIntersectionFence(junctionEdge + 20, 100, -roadSide - 3, 'horizontal');
        this.createIntersectionFence(junctionEdge + 20, 100, roadSide + 3, 'horizontal');
        
        // === STRAIGHT ROAD SCENERY ===
        // Trees along straight road
        for (let z = -junctionEdge - 25; z > -120; z -= 15) {
            const tree1 = this.createTree();
            tree1.position.set(-roadSide - 8 - Math.random() * 10, 0, z);
            this.intersectionGroup.add(tree1);
            
            const tree2 = this.createTree();
            tree2.position.set(roadSide + 8 + Math.random() * 10, 0, z - 5);
            this.intersectionGroup.add(tree2);
        }
        // Fences along straight road
        this.createIntersectionFence(-junctionEdge - 20, -100, -roadSide - 3, 'vertical-left');
        this.createIntersectionFence(-junctionEdge - 20, -100, roadSide + 3, 'vertical-right');
        
        // === BARNS near intersection ===
        const barn1 = this.createBarn();
        barn1.position.set(-60, 0, -50);
        barn1.rotation.y = 0.4;
        this.intersectionGroup.add(barn1);
        
        const barn2 = this.createBarn();
        barn2.position.set(70, 0, 40);
        barn2.rotation.y = -0.3;
        this.intersectionGroup.add(barn2);
        
        // === HAY BALES ===
        for (let i = 0; i < 4; i++) {
            const hay = this.createHayBale();
            hay.position.set(
                (i % 2 === 0 ? -1 : 1) * (50 + Math.random() * 20),
                0,
                -30 - i * 15
            );
            this.intersectionGroup.add(hay);
        }
    }
    
    createIntersectionFence(start, end, offset, direction) {
        const postMat = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        const railMat = new THREE.MeshLambertMaterial({ color: 0x654321 });
        const postSpacing = 8;
        const posts = [];
        
        if (direction === 'horizontal') {
            // Fence runs along X axis
            const step = start < end ? postSpacing : -postSpacing;
            for (let x = start; (step > 0 ? x < end : x > end); x += step) {
                const postGeo = new THREE.CylinderGeometry(0.1, 0.12, 1.5, 6);
                const post = new THREE.Mesh(postGeo, postMat);
                post.position.set(x, 0.75, offset);
                post.castShadow = true;
                this.intersectionGroup.add(post);
                posts.push({ x: x, z: offset });
            }
            // Rails
            for (let i = 0; i < posts.length - 1; i++) {
                const p1 = posts[i];
                const p2 = posts[i + 1];
                const length = Math.abs(p2.x - p1.x);
                const railGeo = new THREE.BoxGeometry(length, 0.08, 0.08);
                
                const topRail = new THREE.Mesh(railGeo, railMat);
                topRail.position.set((p1.x + p2.x) / 2, 1.3, offset);
                this.intersectionGroup.add(topRail);
                
                const bottomRail = new THREE.Mesh(railGeo, railMat);
                bottomRail.position.set((p1.x + p2.x) / 2, 0.6, offset);
                this.intersectionGroup.add(bottomRail);
            }
        } else {
            // Fence runs along Z axis
            const side = direction === 'vertical-left' ? -1 : 1;
            for (let z = start; z > end; z -= postSpacing) {
                const postGeo = new THREE.CylinderGeometry(0.1, 0.12, 1.5, 6);
                const post = new THREE.Mesh(postGeo, postMat);
                post.position.set(offset * side, 0.75, z);
                post.castShadow = true;
                this.intersectionGroup.add(post);
                posts.push({ x: offset * side, z: z });
            }
            // Rails
            for (let i = 0; i < posts.length - 1; i++) {
                const p1 = posts[i];
                const p2 = posts[i + 1];
                const length = Math.abs(p2.z - p1.z);
                const railGeo = new THREE.BoxGeometry(0.08, 0.08, length);
                
                const topRail = new THREE.Mesh(railGeo, railMat);
                topRail.position.set(offset * side, 1.3, (p1.z + p2.z) / 2);
                this.intersectionGroup.add(topRail);
                
                const bottomRail = new THREE.Mesh(railGeo, railMat);
                bottomRail.position.set(offset * side, 0.6, (p1.z + p2.z) / 2);
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
        
        // Create rich Tennessee scenery on both sides of the road
        this.createRoadsideScenery();
    }
    
    createRoadsideScenery() {
        const roadSide = this.ROAD_WIDTH / 2 + 3;
        
        // Trees along both sides - extend closer to intersection
        for (let z = 100; z > 15; z -= 12) {
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
        
        // Fences along both sides - extend closer to intersection
        this.createFence(-roadSide - 4, 95, 15, 'left');
        this.createFence(roadSide + 4, 95, 15, 'right');
        
        // Barns
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
        
        // Hay bales
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
            // Very smooth camera follow during turns (slower smoothing)
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
    
    turn(direction) {
        this.turnDirection = direction;
        this.turnProgress = 0;
        this.turnStartPos = { x: this.car.position.x, z: this.car.position.z };
        this.turnStartRot = this.car.rotation.y;
        
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
        
        // Reposition road under car
        this.roadGroup.position.set(this.car.position.x, 0, this.car.position.z);
        this.roadGroup.rotation.y = this.car.rotation.y;
        
        // Regenerate scenery for the new road direction
        this.regenerateSceneryForNewRoad();
        
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
        const roadSide = this.ROAD_WIDTH / 2 + 3;
        
        // Generate trees along the new road direction (ahead of car)
        for (let dist = 20; dist < 100; dist += 12) {
            // Position along the road (ahead)
            const baseX = carX - Math.sin(carRot) * dist;
            const baseZ = carZ - Math.cos(carRot) * dist;
            
            // Left side tree
            const leftTree = this.createTree();
            const leftOffset = roadSide + 8 + Math.random() * 15;
            leftTree.position.set(
                baseX - Math.cos(carRot) * leftOffset,
                0,
                baseZ + Math.sin(carRot) * leftOffset
            );
            this.scene.add(leftTree);
            this.sceneryObjects.push(leftTree);
            
            // Right side tree
            const rightTree = this.createTree();
            const rightOffset = roadSide + 8 + Math.random() * 15;
            rightTree.position.set(
                baseX + Math.cos(carRot) * rightOffset,
                0,
                baseZ - Math.sin(carRot) * rightOffset
            );
            this.scene.add(rightTree);
            this.sceneryObjects.push(rightTree);
        }
        
        // Add fences along the road
        this.createFenceAlongRoad(carX, carZ, carRot, -roadSide - 4, 20, 90);
        this.createFenceAlongRoad(carX, carZ, carRot, roadSide + 4, 20, 90);
        
        // Add a barn on one side
        const barn = this.createBarn();
        const barnSide = Math.random() > 0.5 ? 1 : -1;
        const barnDist = 50 + Math.random() * 30;
        barn.position.set(
            carX - Math.sin(carRot) * barnDist + Math.cos(carRot) * barnSide * 50,
            0,
            carZ - Math.cos(carRot) * barnDist - Math.sin(carRot) * barnSide * 50
        );
        barn.rotation.y = carRot + Math.random() * 0.5 - 0.25;
        this.scene.add(barn);
        this.sceneryObjects.push(barn);
        
        // Add hay bales
        for (let i = 0; i < 4; i++) {
            const hay = this.createHayBale();
            const side = i % 2 === 0 ? -1 : 1;
            const dist = 30 + i * 15 + Math.random() * 10;
            hay.position.set(
                carX - Math.sin(carRot) * dist + Math.cos(carRot) * side * (30 + Math.random() * 20),
                0,
                carZ - Math.cos(carRot) * dist - Math.sin(carRot) * side * (30 + Math.random() * 20)
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
