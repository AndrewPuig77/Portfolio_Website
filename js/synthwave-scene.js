// Simple test first to make sure Three.js is working
console.log('🚀 Synthwave Scene Starting...');

// Test if Three.js is loaded
if (typeof THREE === 'undefined') {
    console.error('❌ Three.js not loaded!');
} else {
    console.log('✅ Three.js loaded successfully');
}

// Synthwave 3D Scene Manager
class SynthwaveScene {
    constructor() {
        console.log('🎮 Initializing Synthwave Scene...');
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.canvas = null;
        this.mouse = { x: 0, y: 0 };
        this.animationId = null;
        
        // Scene objects
        this.grid = null;
        this.geometricShapes = [];
        this.particles = null;
        this.time = 0;
        
        this.init();
    }
    
    init() {
        console.log('🔧 Setting up canvas...');
        this.canvas = document.getElementById('synthwave-canvas');
        if (!this.canvas) {
            console.error('❌ Canvas not found!');
            return;
        }
        console.log('✅ Canvas found:', this.canvas);
        
        this.setupScene();
        this.createSynthwaveGrid();
        this.createFloatingGeometry();
        this.createParticleField();
        this.setupEventListeners();
        this.animate();
        
        console.log('🎉 Synthwave Scene initialized successfully!');
    }
    
    setupScene() {
        console.log('🎬 Setting up 3D scene...');
        // Scene setup
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.Fog(0x000011, 50, 200);
        
        // Camera setup - positioned to see the city skyline
        this.camera = new THREE.PerspectiveCamera(
            75, 
            window.innerWidth / window.innerHeight, 
            0.1, 
            1000
        );
        this.camera.position.set(0, 25, 80); // Higher and further back to see city
        this.camera.lookAt(0, 10, 0); // Look at city level
        
        // Renderer setup
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: this.canvas, 
            antialias: true,
            alpha: true 
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setClearColor(0x000000, 0);
        
        // Make sure canvas doesn't interfere with navigation clicks
        this.canvas.style.pointerEvents = 'none';
        this.canvas.style.zIndex = '1'; // Low z-index so it stays in background
        
        console.log('✅ Scene setup complete');
        
        // Add a MASSIVE test building to make sure it's working
        const testGeometry = new THREE.BoxGeometry(10, 20, 10);
        const testMaterial = new THREE.MeshPhongMaterial({ 
            color: 0xff00ff,
            emissive: 0xff00ff,
            emissiveIntensity: 0.3
        });
        const testBuilding = new THREE.Mesh(testGeometry, testMaterial);
        testBuilding.position.set(0, 10, 20); // Right in front of camera
        this.scene.add(testBuilding);
        console.log('🏢 MASSIVE test building added at position:', testBuilding.position);
    }
    
    createSynthwaveGrid() {
        const gridSize = 100;
        const divisions = 50;
        
        // Create the classic synthwave grid
        const gridHelper = new THREE.GridHelper(gridSize, divisions);
        gridHelper.material.color.setHex(0xff00ff);
        gridHelper.material.transparent = true;
        gridHelper.material.opacity = 0.6;
        gridHelper.position.y = -10;
        
        // Add glow effect to grid
        gridHelper.material.emissive.setHex(0x440044);
        
        this.grid = gridHelper;
        this.scene.add(this.grid);
        
        // Create animated grid lines
        this.createAnimatedGridLines();
        
        // Create the INSANE Synthwave City Skyline
        this.createSynthwaveCity();
    }
    
    createAnimatedGridLines() {
        const geometry = new THREE.BufferGeometry();
        const material = new THREE.LineBasicMaterial({ 
            color: 0x00ffff,
            transparent: true,
            opacity: 0.8
        });
        
        const points = [];
        for (let i = -50; i <= 50; i += 5) {
            points.push(new THREE.Vector3(i, -10, -50));
            points.push(new THREE.Vector3(i, -10, 50));
        }
        
        geometry.setFromPoints(points);
        const lines = new THREE.LineSegments(geometry, material);
        this.scene.add(lines);
    }
    
    createSynthwaveCity() {
        console.log('🏙️ Creating INSANE Synthwave City Skyline...');
        
        this.cityBuildings = [];
        this.cityCars = [];
        
        // Create multiple rows of buildings - positioned to be visible
        this.createBuildingRow(-40, 0, 15); // Far back
        this.createBuildingRow(-20, 0, 12); // Middle back
        this.createBuildingRow(0, 0, 20);   // Center (tallest)
        this.createBuildingRow(20, 0, 15);  // Middle front
        this.createBuildingRow(40, 0, 10); // Front (shortest)
        
        // Create neon highways
        this.createNeonHighways();
        
        // Create animated cars
        this.createAnimatedCars();
        
        console.log('🌆 Synthwave City created with', this.cityBuildings.length, 'buildings!');
    }
    
    createBuildingRow(x, y, buildingCount) {
        for (let i = 0; i < buildingCount; i++) {
            const building = this.createSingleBuilding();
            
            // Position buildings in a row - closer to camera
            building.position.set(
                x + (i - buildingCount/2) * 6 + Math.random() * 3 - 1.5,
                y,
                Math.random() * 15 - 7.5
            );
            
            // Random height variation - taller buildings
            const height = Math.random() * 20 + 8;
            building.scale.y = height;
            
            // Store building data for animation
            building.userData = {
                originalHeight: height,
                pulseSpeed: Math.random() * 0.02 + 0.01,
                lightIntensity: Math.random() * 0.5 + 0.5,
                neonColor: this.getRandomNeonColor()
            };
            
            this.cityBuildings.push(building);
            this.scene.add(building);
        }
    }
    
    createSingleBuilding() {
        const group = new THREE.Group();
        
        // Main building structure - bigger and more visible
        const geometry = new THREE.BoxGeometry(6, 1, 6);
        const material = new THREE.MeshPhongMaterial({
            color: 0x2a2a3e,
            emissive: 0x1f1f33,
            emissiveIntensity: 0.2
        });
        
        const building = new THREE.Mesh(geometry, material);
        group.add(building);
        
        // Add neon windows
        this.addNeonWindows(group);
        
        // Add rooftop neon sign
        this.addRooftopNeon(group);
        
        return group;
    }
    
    addNeonWindows(buildingGroup) {
        const windowCount = 8;
        for (let i = 0; i < windowCount; i++) {
            const windowGeometry = new THREE.PlaneGeometry(0.8, 1.2);
            const windowMaterial = new THREE.MeshBasicMaterial({
                color: this.getRandomNeonColor(),
                transparent: true,
                opacity: 0.8,
                emissive: this.getRandomNeonColor(),
                emissiveIntensity: 0.3
            });
            
            const window = new THREE.Mesh(windowGeometry, windowMaterial);
            
            // Position windows on building faces
            const face = Math.floor(i / 2);
            const side = i % 2;
            
            switch(face) {
                case 0: // Front
                    window.position.set(0, 0.3, 2.1);
                    break;
                case 1: // Back
                    window.position.set(0, 0.3, -2.1);
                    window.rotation.y = Math.PI;
                    break;
                case 2: // Left
                    window.position.set(-2.1, 0.3, 0);
                    window.rotation.y = Math.PI / 2;
                    break;
                case 3: // Right
                    window.position.set(2.1, 0.3, 0);
                    window.rotation.y = -Math.PI / 2;
                    break;
            }
            
            window.userData = {
                pulseSpeed: Math.random() * 0.03 + 0.01,
                originalOpacity: 0.8
            };
            
            buildingGroup.add(window);
        }
    }
    
    addRooftopNeon(buildingGroup) {
        // Create neon sign on top
        const signGeometry = new THREE.BoxGeometry(3, 0.5, 0.2);
        const signMaterial = new THREE.MeshBasicMaterial({
            color: 0xff00ff,
            emissive: 0xff00ff,
            emissiveIntensity: 0.5
        });
        
        const neonSign = new THREE.Mesh(signGeometry, signMaterial);
        neonSign.position.set(0, 0.75, 0);
        
        neonSign.userData = {
            pulseSpeed: 0.05,
            originalIntensity: 0.5
        };
        
        buildingGroup.add(neonSign);
    }
    
    createNeonHighways() {
        // Create neon road lines
        const roadGeometry = new THREE.BufferGeometry();
        const roadMaterial = new THREE.LineBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.8
        });
        
        const roadPoints = [];
        
        // Create multiple highway lanes - closer to camera
        for (let lane = 0; lane < 3; lane++) {
            const z = -20 + lane * 15;
            for (let x = -60; x <= 60; x += 2) {
                roadPoints.push(new THREE.Vector3(x, -9.5, z));
                roadPoints.push(new THREE.Vector3(x + 2, -9.5, z));
            }
        }
        
        roadGeometry.setFromPoints(roadPoints);
        const highways = new THREE.LineSegments(roadGeometry, roadMaterial);
        this.scene.add(highways);
        
        // Add highway glow effect - smaller and closer
        const glowGeometry = new THREE.PlaneGeometry(120, 45);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.1,
            side: THREE.DoubleSide
        });
        
        const highwayGlow = new THREE.Mesh(glowGeometry, glowMaterial);
        highwayGlow.position.set(0, -9.4, 0);
        highwayGlow.rotation.x = -Math.PI / 2;
        this.scene.add(highwayGlow);
    }
    
    createAnimatedCars() {
        console.log('🚗 Creating animated cars with headlight trails...');
        
        for (let i = 0; i < 6; i++) {
            const car = this.createSingleCar();
            
            // Position cars on different lanes - closer to camera
            const lane = i % 3;
            car.position.set(
                Math.random() * 120 - 60,
                -9,
                -20 + lane * 15
            );
            
            car.userData = {
                speed: Math.random() * 0.5 + 0.2,
                lane: lane,
                trail: []
            };
            
            this.cityCars.push(car);
            this.scene.add(car);
        }
    }
    
    createSingleCar() {
        const group = new THREE.Group();
        
        // Car body
        const bodyGeometry = new THREE.BoxGeometry(2, 0.8, 1);
        const bodyMaterial = new THREE.MeshPhongMaterial({
            color: 0x333333,
            emissive: 0x111111,
            emissiveIntensity: 0.1
        });
        
        const carBody = new THREE.Mesh(bodyGeometry, bodyMaterial);
        group.add(carBody);
        
        // Headlights
        const headlightGeometry = new THREE.SphereGeometry(0.2, 8, 8);
        const headlightMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            emissive: 0x00ffff,
            emissiveIntensity: 1
        });
        
        const leftHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
        leftHeadlight.position.set(-0.8, 0, 0.6);
        group.add(leftHeadlight);
        
        const rightHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
        rightHeadlight.position.set(-0.8, 0, -0.6);
        group.add(rightHeadlight);
        
        // Taillights
        const taillightMaterial = new THREE.MeshBasicMaterial({
            color: 0xff0080,
            emissive: 0xff0080,
            emissiveIntensity: 0.8
        });
        
        const leftTaillight = new THREE.Mesh(headlightGeometry, taillightMaterial);
        leftTaillight.position.set(0.8, 0, 0.6);
        group.add(leftTaillight);
        
        const rightTaillight = new THREE.Mesh(headlightGeometry, taillightMaterial);
        rightTaillight.position.set(0.8, 0, -0.6);
        group.add(rightTaillight);
        
        return group;
    }
    
    getRandomNeonColor() {
        const colors = [0xff00ff, 0x00ffff, 0xff0080, 0x8a2be2, 0x39ff14];
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    createFloatingGeometry() {
        const shapes = [
            { type: 'box', color: 0xff00ff },
            { type: 'sphere', color: 0x00ffff },
            { type: 'cone', color: 0xff0080 },
            { type: 'octahedron', color: 0x8a2be2 }
        ];
        
        for (let i = 0; i < 15; i++) {
            const shape = shapes[Math.floor(Math.random() * shapes.length)];
            let geometry;
            
            switch(shape.type) {
                case 'box':
                    geometry = new THREE.BoxGeometry(2, 2, 2);
                    break;
                case 'sphere':
                    geometry = new THREE.SphereGeometry(1.5, 16, 16);
                    break;
                case 'cone':
                    geometry = new THREE.ConeGeometry(1.5, 3, 8);
                    break;
                case 'octahedron':
                    geometry = new THREE.OctahedronGeometry(1.5);
                    break;
            }
            
            const material = new THREE.MeshPhongMaterial({ 
                color: shape.color,
                emissive: shape.color,
                emissiveIntensity: 0.2,
                transparent: true,
                opacity: 0.8,
                wireframe: Math.random() > 0.5
            });
            
            const mesh = new THREE.Mesh(geometry, material);
            
            // Random positioning
            mesh.position.set(
                (Math.random() - 0.5) * 100,
                Math.random() * 30 + 5,
                (Math.random() - 0.5) * 100
            );
            
            // Random rotation speeds
            mesh.userData = {
                rotationSpeed: {
                    x: (Math.random() - 0.5) * 0.02,
                    y: (Math.random() - 0.5) * 0.02,
                    z: (Math.random() - 0.5) * 0.02
                },
                floatSpeed: Math.random() * 0.02 + 0.01,
                originalY: mesh.position.y
            };
            
            this.geometricShapes.push(mesh);
            this.scene.add(mesh);
        }
    }
    
    createParticleField() {
        const particleCount = 1000;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        
        const colorPalette = [
            new THREE.Color(0xff00ff),
            new THREE.Color(0x00ffff),
            new THREE.Color(0xff0080),
            new THREE.Color(0x8a2be2)
        ];
        
        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            
            // Positions
            positions[i3] = (Math.random() - 0.5) * 200;
            positions[i3 + 1] = Math.random() * 100;
            positions[i3 + 2] = (Math.random() - 0.5) * 200;
            
            // Colors
            const color = colorPalette[Math.floor(Math.random() * colorPalette.length)];
            colors[i3] = color.r;
            colors[i3 + 1] = color.g;
            colors[i3 + 2] = color.b;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        const material = new THREE.PointsMaterial({
            size: 0.5,
            vertexColors: true,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending
        });
        
        this.particles = new THREE.Points(geometry, material);
        this.scene.add(this.particles);
    }
    
    setupEventListeners() {
        // Mouse movement
        window.addEventListener('mousemove', (event) => {
            this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        });
        
        // Window resize
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
        
        // Add lights
        this.setupLighting();
    }
    
    setupLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
        this.scene.add(ambientLight);
        
        // Directional light (neon pink)
        const directionalLight1 = new THREE.DirectionalLight(0xff00ff, 1);
        directionalLight1.position.set(50, 50, 50);
        this.scene.add(directionalLight1);
        
        // Directional light (neon cyan)
        const directionalLight2 = new THREE.DirectionalLight(0x00ffff, 0.8);
        directionalLight2.position.set(-50, 30, -50);
        this.scene.add(directionalLight2);
        
        // Point light that follows mouse
        this.mouseLight = new THREE.PointLight(0xff0080, 2, 100);
        this.mouseLight.position.set(0, 20, 30);
        this.scene.add(this.mouseLight);
    }
    
    animate() {
        this.animationId = requestAnimationFrame(() => this.animate());
        
        this.time += 0.01;
        
        // Animate geometric shapes
        this.geometricShapes.forEach(shape => {
            shape.rotation.x += shape.userData.rotationSpeed.x;
            shape.rotation.y += shape.userData.rotationSpeed.y;
            shape.rotation.z += shape.userData.rotationSpeed.z;
            
            // Floating animation
            shape.position.y = shape.userData.originalY + 
                Math.sin(this.time * shape.userData.floatSpeed) * 3;
        });
        
        // Animate particles
        if (this.particles) {
            this.particles.rotation.y += 0.001;
            const positions = this.particles.geometry.attributes.position.array;
            
            for (let i = 0; i < positions.length; i += 3) {
                positions[i + 1] += Math.sin(this.time + positions[i] * 0.01) * 0.01;
            }
            this.particles.geometry.attributes.position.needsUpdate = true;
        }
        
        // 🏙️ ANIMATE SYNTHWAVE CITY BUILDINGS
        if (this.cityBuildings) {
            this.cityBuildings.forEach(building => {
                // Pulse building height
                const heightPulse = Math.sin(this.time * building.userData.pulseSpeed) * 0.1 + 1;
                building.scale.y = building.userData.originalHeight * heightPulse;
                
                // Animate neon windows
                building.children.forEach(child => {
                    if (child.material && child.material.emissive) {
                        // Pulse window lights
                        const intensity = Math.sin(this.time * child.userData.pulseSpeed) * 0.3 + 0.3;
                        child.material.emissiveIntensity = intensity;
                        child.material.opacity = child.userData.originalOpacity * (0.5 + intensity);
                    }
                });
            });
        }
        
        // 🚗 ANIMATE CARS WITH HEADLIGHT TRAILS
        if (this.cityCars) {
            this.cityCars.forEach(car => {
                // Move cars along highways
                car.position.x += car.userData.speed;
                
                // Reset car position when it goes off screen
                if (car.position.x > 120) {
                    car.position.x = -120;
                }
                
                // Create headlight trail effect
                this.createHeadlightTrail(car);
                
                // Animate car lights
                car.children.forEach(child => {
                    if (child.material && child.material.emissive) {
                        const intensity = Math.sin(this.time * 3) * 0.2 + 0.8;
                        child.material.emissiveIntensity = intensity;
                    }
                });
            });
        }
        
        // Camera movement based on mouse
        if (this.camera) {
            this.camera.position.x += (this.mouse.x * 10 - this.camera.position.x) * 0.02;
            this.camera.position.y += (-this.mouse.y * 5 + 20 - this.camera.position.y) * 0.02;
            this.camera.lookAt(0, 0, 0);
        }
        
        // Mouse light follows cursor
        if (this.mouseLight) {
            this.mouseLight.position.x = this.mouse.x * 50;
            this.mouseLight.position.y = -this.mouse.y * 30 + 20;
        }
        
        // Grid animation
        if (this.grid) {
            this.grid.material.opacity = 0.6 + Math.sin(this.time * 2) * 0.2;
        }
        
        this.renderer.render(this.scene, this.camera);
    }
    
    createHeadlightTrail(car) {
        // Create glowing trail particles behind cars
        if (Math.random() < 0.3) { // Only create trail occasionally for performance
            const trailGeometry = new THREE.SphereGeometry(0.1, 4, 4);
            const trailMaterial = new THREE.MeshBasicMaterial({
                color: 0x00ffff,
                transparent: true,
                opacity: 0.6,
                emissive: 0x00ffff,
                emissiveIntensity: 0.5
            });
            
            const trailParticle = new THREE.Mesh(trailGeometry, trailMaterial);
            trailParticle.position.set(
                car.position.x - 1,
                car.position.y,
                car.position.z + (Math.random() - 0.5) * 0.5
            );
            
            this.scene.add(trailParticle);
            
            // Remove trail particle after animation
            setTimeout(() => {
                this.scene.remove(trailParticle);
                trailParticle.geometry.dispose();
                trailParticle.material.dispose();
            }, 2000);
        }
    }
    
    destroy() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        
        if (this.renderer) {
            this.renderer.dispose();
        }
    }
}

// Initialize the scene when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit for the canvas to be ready
    setTimeout(() => {
        window.synthwaveScene = new SynthwaveScene();
    }, 100);
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (window.synthwaveScene) {
        window.synthwaveScene.destroy();
    }
});