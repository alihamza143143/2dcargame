/**
 * 3D Game Renderer - Smooth Continuous Driving
 * No fade transitions - car turns and continues driving smoothly
 * Intersection repositions ahead after each turn
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
        this.cameraOffset = { y: 6, z: 16 };
        
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
        this.ROAD_WIDTH = 10;
        this.INTERSECTION_DISTANCE = 70; // How far ahead intersection appears
        
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
        const ambient = new THREE.AmbientLight(0xffffff, 0.7);
        this.scene.add(ambient);
        
        const sun = new THREE.DirectionalLight(0xffffff, 0.8);
        sun.position.set(30, 80, 30);
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
        // Very large ground that follows player roughly
        const groundGeo = new THREE.PlaneGeometry(2000, 2000);
        const groundMat = new THREE.MeshLambertMaterial({ color: 0x4CAF50 });
        this.ground = new THREE.Mesh(groundGeo, groundMat);
        this.ground.rotation.x = -Math.PI / 2;
        this.ground.position.y = -0.1;
        this.ground.receiveShadow = true;
        this.scene.add(this.ground);
    }
    
    createHills() {
        // Background hills - these stay fixed far away
        this.hillGroup = new THREE.Group();
        
        const hillConfigs = [
            { x: -200, z: -400, height: 50, color: 0x2d5a2d },
            { x: 0, z: -450, height: 60, color: 0x2d5a2d },
            { x: 200, z: -420, height: 55, color: 0x2d5a2d },
            { x: -300, z: -380, height: 45, color: 0x2d5a2d },
            { x: 300, z: -400, height: 48, color: 0x2d5a2d },
            { x: -150, z: -300, height: 35, color: 0x3d6b3d },
            { x: 100, z: -320, height: 40, color: 0x3d6b3d },
            { x: -250, z: -280, height: 32, color: 0x3d6b3d },
            { x: 250, z: -310, height: 38, color: 0x3d6b3d },
        ];
        
        hillConfigs.forEach(cfg => {
            const hillGeo = new THREE.SphereGeometry(cfg.height * 2, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
            const hillMat = new THREE.MeshLambertMaterial({ color: cfg.color });
            const hill = new THREE.Mesh(hillGeo, hillMat);
            hill.position.set(cfg.x, 0, cfg.z);
            hill.scale.set(2, 1, 2);
            this.hillGroup.add(hill);
        });
        
        this.scene.add(this.hillGroup);
    }
    
    createInfiniteRoad() {
        // Create a very long road that the car drives on
        // This road will be repositioned as car moves
        this.roadGroup = new THREE.Group();
        
        const roadMat = new THREE.MeshLambertMaterial({ color: 0x444444 });
        const lineMat = new THREE.MeshBasicMaterial({ color: 0xFFFF00 });
        const edgeMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
        
        // Main road - very long
        const roadLength = 500;
        const roadGeo = new THREE.PlaneGeometry(this.ROAD_WIDTH, roadLength);
        const road = new THREE.Mesh(roadGeo, roadMat);
        road.rotation.x = -Math.PI / 2;
        road.position.set(0, 0.01, 0);
        road.receiveShadow = true;
        this.roadGroup.add(road);
        
        // Center dashes
        for (let z = roadLength / 2; z > -roadLength / 2; z -= 8) {
            const dashGeo = new THREE.PlaneGeometry(0.3, 4);
            const dash = new THREE.Mesh(dashGeo, lineMat);
            dash.rotation.x = -Math.PI / 2;
            dash.position.set(0, 0.02, z);
            this.roadGroup.add(dash);
        }
        
        // Edge lines
        const edgeGeo = new THREE.PlaneGeometry(0.4, roadLength);
        const leftEdge = new THREE.Mesh(edgeGeo, edgeMat);
        leftEdge.rotation.x = -Math.PI / 2;
        leftEdge.position.set(-this.ROAD_WIDTH / 2 + 0.3, 0.02, 0);
        this.roadGroup.add(leftEdge);
        
        const rightEdge = new THREE.Mesh(edgeGeo, edgeMat);
        rightEdge.rotation.x = -Math.PI / 2;
        rightEdge.position.set(this.ROAD_WIDTH / 2 - 0.3, 0.02, 0);
        this.roadGroup.add(rightEdge);
        
        this.scene.add(this.roadGroup);
    }
    
    createIntersection() {
        // Intersection is a separate group that can be positioned ahead of car
        this.intersectionGroup = new THREE.Group();
        
        const roadMat = new THREE.MeshLambertMaterial({ color: 0x444444 });
        const arrowMat = new THREE.MeshBasicMaterial({ color: 0x4CAF50 });
        
        // Junction pad (large intersection area)
        const junctionGeo = new THREE.PlaneGeometry(70, 50);
        const junction = new THREE.Mesh(junctionGeo, roadMat);
        junction.rotation.x = -Math.PI / 2;
        junction.position.set(0, 0.015, 0);
        junction.receiveShadow = true;
        this.intersectionGroup.add(junction);
        
        // LEFT ROAD (going left at 90 degrees)
        const sideRoadLength = 150;
        const leftRoadGeo = new THREE.PlaneGeometry(this.ROAD_WIDTH, sideRoadLength);
        const leftRoad = new THREE.Mesh(leftRoadGeo, roadMat);
        leftRoad.rotation.x = -Math.PI / 2;
        leftRoad.rotation.z = Math.PI / 2; // Perpendicular
        leftRoad.position.set(-35 - sideRoadLength / 2 + 10, 0.01, 0);
        leftRoad.receiveShadow = true;
        this.intersectionGroup.add(leftRoad);
        
        // RIGHT ROAD (going right at 90 degrees)
        const rightRoad = new THREE.Mesh(leftRoadGeo, roadMat);
        rightRoad.rotation.x = -Math.PI / 2;
        rightRoad.rotation.z = Math.PI / 2;
        rightRoad.position.set(35 + sideRoadLength / 2 - 10, 0.01, 0);
        rightRoad.receiveShadow = true;
        this.intersectionGroup.add(rightRoad);
        
        // STRAIGHT ROAD (continuing forward)
        const straightRoadGeo = new THREE.PlaneGeometry(this.ROAD_WIDTH, sideRoadLength);
        const straightRoad = new THREE.Mesh(straightRoadGeo, roadMat);
        straightRoad.rotation.x = -Math.PI / 2;
        straightRoad.position.set(0, 0.01, -25 - sideRoadLength / 2 + 10);
        straightRoad.receiveShadow = true;
        this.intersectionGroup.add(straightRoad);
        
        // GREEN ARROWS
        this.createArrowInGroup(-22, 18, 'left', arrowMat);
        this.createArrowInGroup(22, 18, 'right', arrowMat);
        
        // STOP SIGN
        this.createStopSignInGroup(0, 25);
        
        this.intersectionGroup.visible = false;
        this.scene.add(this.intersectionGroup);
    }
    
    createArrowInGroup(x, z, direction, material) {
        const arrowGroup = new THREE.Group();
        
        const bodyGeo = new THREE.BoxGeometry(5, 0.4, 2);
        const body = new THREE.Mesh(bodyGeo, material);
        arrowGroup.add(body);
        
        const headShape = new THREE.Shape();
        headShape.moveTo(0, 3);
        headShape.lineTo(-2, 0);
        headShape.lineTo(2, 0);
        headShape.closePath();
        
        const headGeo = new THREE.ExtrudeGeometry(headShape, { depth: 0.4, bevelEnabled: false });
        const head = new THREE.Mesh(headGeo, material);
        head.rotation.x = -Math.PI / 2;
        head.position.y = 0.2;
        arrowGroup.add(head);
        
        arrowGroup.position.set(x, 0.3, z);
        arrowGroup.rotation.y = direction === 'left' ? Math.PI / 2 : -Math.PI / 2;
        
        this.intersectionGroup.add(arrowGroup);
    }
    
    createStopSignInGroup(x, z) {
        const signGroup = new THREE.Group();
        
        const postGeo = new THREE.CylinderGeometry(0.12, 0.12, 3.5, 8);
        const postMat = new THREE.MeshLambertMaterial({ color: 0x666666 });
        const post = new THREE.Mesh(postGeo, postMat);
        post.position.y = 1.75;
        post.castShadow = true;
        signGroup.add(post);
        
        const signShape = new THREE.Shape();
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2 - Math.PI / 8;
            const px = Math.cos(angle) * 1;
            const py = Math.sin(angle) * 1;
            if (i === 0) signShape.moveTo(px, py);
            else signShape.lineTo(px, py);
        }
        signShape.closePath();
        
        const signGeo = new THREE.ShapeGeometry(signShape);
        const signMat = new THREE.MeshBasicMaterial({ color: 0xCC0000, side: THREE.DoubleSide });
        const sign = new THREE.Mesh(signGeo, signMat);
        sign.position.y = 4;
        sign.rotation.y = Math.PI;
        signGroup.add(sign);
        
        const textGeo = new THREE.PlaneGeometry(1.2, 0.4);
        const textMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF, side: THREE.DoubleSide });
        const text = new THREE.Mesh(textGeo, textMat);
        text.position.set(0, 4, 0.05);
        text.rotation.y = Math.PI;
        signGroup.add(text);
        
        signGroup.position.set(x, 0, z);
        this.intersectionGroup.add(signGroup);
    }
    
    createScenery() {
        this.sceneryObjects.forEach(obj => this.scene.remove(obj));
        this.sceneryObjects = [];
        
        // Initial trees around the starting area
        const treePositions = [
            { x: -20, z: 50 }, { x: -25, z: 30 }, { x: -22, z: 10 },
            { x: 20, z: 45 }, { x: 25, z: 25 }, { x: 22, z: 5 },
            { x: -30, z: -20 }, { x: -35, z: -50 },
            { x: 30, z: -25 }, { x: 35, z: -55 },
            { x: -40, z: -80 }, { x: 40, z: -85 },
        ];
        
        treePositions.forEach(pos => {
            const tree = this.createTree();
            tree.position.set(pos.x, 0, pos.z);
            this.scene.add(tree);
            this.sceneryObjects.push(tree);
        });
    }
    
    createTree() {
        const tree = new THREE.Group();
        
        const trunkGeo = new THREE.CylinderGeometry(0.3, 0.5, 4, 8);
        const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.y = 2;
        trunk.castShadow = true;
        tree.add(trunk);
        
        const foliageMat = new THREE.MeshLambertMaterial({ color: 0x228B22 });
        const layers = [
            { y: 3.5, radius: 3, height: 3.5 },
            { y: 5.5, radius: 2.3, height: 3 },
            { y: 7, radius: 1.6, height: 2.5 },
            { y: 8.2, radius: 1, height: 2 }
        ];
        
        layers.forEach(layer => {
            const coneGeo = new THREE.ConeGeometry(layer.radius, layer.height, 8);
            const cone = new THREE.Mesh(coneGeo, foliageMat);
            cone.position.y = layer.y;
            cone.castShadow = true;
            tree.add(cone);
        });
        
        const scale = 0.7 + Math.random() * 0.4;
        tree.scale.set(scale, scale, scale);
        
        return tree;
    }
    
    createCar() {
        this.car = new THREE.Group();
        
        const bodyMat = new THREE.MeshLambertMaterial({ color: 0xD4A574 });
        
        const bodyGeo = new THREE.BoxGeometry(2.8, 1.1, 4.5);
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.85;
        body.castShadow = true;
        this.car.add(body);
        
        const cabinGeo = new THREE.BoxGeometry(2.4, 0.9, 2.5);
        const cabin = new THREE.Mesh(cabinGeo, bodyMat);
        cabin.position.set(0, 1.75, -0.2);
        cabin.castShadow = true;
        this.car.add(cabin);
        
        const windowMat = new THREE.MeshBasicMaterial({ color: 0x87CEEB });
        
        const frontWinGeo = new THREE.PlaneGeometry(2.2, 0.8);
        const frontWin = new THREE.Mesh(frontWinGeo, windowMat);
        frontWin.position.set(0, 1.75, -1.46);
        frontWin.rotation.x = 0.15;
        this.car.add(frontWin);
        
        const rearWin = new THREE.Mesh(frontWinGeo, windowMat);
        rearWin.position.set(0, 1.75, 1.06);
        rearWin.rotation.x = -0.15;
        this.car.add(rearWin);
        
        const wheelGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.35, 16);
        const wheelMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
        
        [{ x: -1.2, z: -1.3 }, { x: 1.2, z: -1.3 }, { x: -1.2, z: 1.3 }, { x: 1.2, z: 1.3 }].forEach(pos => {
            const wheel = new THREE.Mesh(wheelGeo, wheelMat);
            wheel.rotation.z = Math.PI / 2;
            wheel.position.set(pos.x, 0.45, pos.z);
            wheel.castShadow = true;
            this.car.add(wheel);
        });
        
        // Car starts at origin facing forward (-Z direction)
        this.car.position.set(0, 0, 60);
        this.car.rotation.y = 0;
        
        this.scene.add(this.car);
    }
    
    positionIntersectionAhead() {
        // Position intersection ahead of car based on car's current position and rotation
        const dist = this.INTERSECTION_DISTANCE;
        const ix = this.car.position.x - Math.sin(this.car.rotation.y) * dist;
        const iz = this.car.position.z - Math.cos(this.car.rotation.y) * dist;
        
        this.intersectionGroup.position.set(ix, 0, iz);
        this.intersectionGroup.rotation.y = this.car.rotation.y;
        this.intersectionGroup.visible = true;
        
        // Also reposition the main road to be under the car and extending ahead
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
            this.camera.position.x += (behindX - this.camera.position.x) * 0.06;
            this.camera.position.y += (targetY - this.camera.position.y) * 0.06;
            this.camera.position.z += (behindZ - this.camera.position.z) * 0.06;
        }
        
        const lookX = this.car.position.x - Math.sin(this.car.rotation.y) * 15;
        const lookZ = this.car.position.z - Math.cos(this.car.rotation.y) * 15;
        this.camera.lookAt(lookX, 1.5, lookZ);
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        const delta = this.clock.getDelta();
        this.update(delta);
        this.renderer.render(this.scene, this.camera);
    }
    
    update(delta) {
        if (this.state === 'DRIVING' || this.state === 'POST_TURN_DRIVING') {
            this.car.position.y = Math.sin(Date.now() * 0.005) * 0.04;
            
            this.car.position.x -= Math.sin(this.car.rotation.y) * this.carSpeed * delta;
            this.car.position.z -= Math.cos(this.car.rotation.y) * this.carSpeed * delta;
            
            this.carSpeed += (this.targetCarSpeed - this.carSpeed) * 3 * delta;
        }
        
        if (this.state === 'APPROACHING') {
            // Calculate distance to intersection
            const dx = this.car.position.x - this.intersectionGroup.position.x;
            const dz = this.car.position.z - this.intersectionGroup.position.z;
            const distToInt = Math.sqrt(dx * dx + dz * dz);
            
            // Slow down based on distance
            const targetSpeed = Math.max(2, distToInt * 0.3);
            this.carSpeed += (targetSpeed - this.carSpeed) * 2 * delta;
            
            this.car.position.x -= Math.sin(this.car.rotation.y) * this.carSpeed * delta;
            this.car.position.z -= Math.cos(this.car.rotation.y) * this.carSpeed * delta;
            
            this.car.position.y = Math.sin(Date.now() * 0.003) * 0.02 * Math.max(0.1, this.carSpeed / 15);
            
            // Stop when close to intersection
            if (distToInt < 20) {
                this.setState('STOPPED');
                this.carSpeed = 0;
                if (this.onStopAtIntersection) {
                    this.onStopAtIntersection();
                }
            }
        }
        
        if (this.state === 'TURNING') {
            this.turnProgress += delta * 0.6;
            
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
            this.car.position.y = Math.sin(this.turnProgress * Math.PI) * 0.08;
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
        
        // Update ground position to follow car
        if (this.ground) {
            this.ground.position.x = this.car.position.x;
            this.ground.position.z = this.car.position.z;
        }
        
        // Update hills to be in general direction car is facing
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
        this.targetCarSpeed = 18;
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
        
        // Get intersection center position and rotation
        const intX = this.intersectionGroup.position.x;
        const intZ = this.intersectionGroup.position.z;
        const intRot = this.intersectionGroup.rotation.y;
        
        // Calculate turn endpoints based on direction
        // Forward direction is (-sin(rot), -cos(rot)) in XZ plane
        if (direction === 'left') {
            // Turn left 90 degrees
            this.turnEndRot = intRot + Math.PI / 2;
            // End position: 40 units down the left road from intersection center
            this.turnEndPos = {
                x: intX - Math.cos(intRot) * 40,
                z: intZ + Math.sin(intRot) * 40
            };
        } else if (direction === 'right') {
            // Turn right 90 degrees
            this.turnEndRot = intRot - Math.PI / 2;
            // End position: 40 units down the right road
            this.turnEndPos = {
                x: intX + Math.cos(intRot) * 40,
                z: intZ - Math.sin(intRot) * 40
            };
        } else { // straight
            this.turnEndRot = intRot;
            // End position: 50 units down the straight road
            this.turnEndPos = {
                x: intX - Math.sin(intRot) * 50,
                z: intZ - Math.cos(intRot) * 50
            };
        }
        
        this.setState('TURNING');
    }
    
    completeTurn() {
        // Car has completed turn - now driving on new road
        // Hide current intersection, set up for continuous driving
        this.intersectionGroup.visible = false;
        
        // Continue driving smoothly
        this.setState('POST_TURN_DRIVING');
        this.targetCarSpeed = 16;
        
        // Reposition road to be under car
        this.roadGroup.position.set(this.car.position.x, 0, this.car.position.z);
        this.roadGroup.rotation.y = this.car.rotation.y;
        
        if (this.onTurnComplete) {
            this.onTurnComplete();
        }
    }
    
    showNextIntersection() {
        // Called after driving for a while, show next intersection ahead
        this.positionIntersectionAhead();
    }
    
    driveToFinish() {
        this.setState('ARRIVING');
        this.targetCarSpeed = 8;
    }
    
    reset() {
        this.car.position.set(0, 0, 60);
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
