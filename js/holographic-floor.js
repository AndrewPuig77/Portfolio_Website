// 3D Holographic Floor Effect
console.log('🎆 Initializing 3D Holographic Floor...');

class HolographicFloor {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.canvas = null;
        this.animationId = null;
        this.mouse = { x: 0, y: 0 };
        this.time = 0;
        
        // 3D Objects
        this.grid = null;
        this.gridFloor = null;
        this.gradientFloor = null;
        this.waves = [];
        this.particles = null;
        this.tronTrails = [];
        this.tronBikes = [];
        this.vaporwaveSun = null;
        this.vaporwaveMountains = null;
        this.vaporwavePalmTrees = null;
        
        this.init();
    }
    
    init() {
        this.canvas = document.getElementById('hero-3d-floor');
        if (!this.canvas) {
            console.error('❌ Hero 3D canvas not found!');
            return;
        }
        
        console.log('✅ Initializing holographic floor...');
        this.setupScene();
        this.createHolographicGrid();
        this.createEnergyWaves();
        this.createParticleField();
        this.createVaporwaveMountains();
        this.createVaporwavePalmTrees();
        this.createTronTrails();
        this.createVaporwaveSun();
        this.setupEventListeners();
        this.animate();
        
        console.log('🎆 Holographic floor initialized!');
    }
    
    setupScene() {
        // Scene
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.Fog(0x000000, 50, 200);
        
        // Camera - positioned for horizontal floor view
        this.camera = new THREE.PerspectiveCamera(
            75, 
            window.innerWidth / window.innerHeight, 
            0.1, 
            1000
        );
        this.camera.position.set(0, 8, 25); // Higher and further back for vaporwave perspective
        this.camera.lookAt(0, -2, -20); // Look toward the sun
        
        // Renderer
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: this.canvas, 
            alpha: true, 
            antialias: true 
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setClearColor(0x000000, 0);
    }
    
    createHolographicGrid() {
        // Main holographic grid - smaller for better bike travel
        const gridSize = 70; // Reduced from 100
        const divisions = 35; // Proportionally reduced
        
        // Create solid floor plane first (underneath the wireframe)
        const floorGeometry = new THREE.PlaneGeometry(gridSize, gridSize);
        const floorMaterial = new THREE.MeshBasicMaterial({
            color: 0x1a0d26, // Deep purple matching website background --bg-card
            transparent: false, // Solid, not transparent
            side: THREE.DoubleSide
        });
        
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2; // Rotate to be horizontal
        floor.position.set(0, -5.01, 0); // Slightly below grid lines
        this.scene.add(floor);
        
        // Add subtle gradient overlay for depth effect
        const gradientGeometry = new THREE.PlaneGeometry(gridSize * 1.2, gridSize * 1.2);
        const gradientMaterial = new THREE.MeshBasicMaterial({
            color: 0x0a0a0a, // Even deeper matching --bg-dark
            transparent: true,
            opacity: 0.6, // Semi-transparent overlay only
            side: THREE.DoubleSide
        });
        
        const gradientFloor = new THREE.Mesh(gradientGeometry, gradientMaterial);
        gradientFloor.rotation.x = -Math.PI / 2;
        gradientFloor.position.set(0, -5.02, 0); // Even more below
        this.scene.add(gradientFloor);
        
        // Create custom grid with glowing lines (on top)
        const geometry = new THREE.BufferGeometry();
        const material = new THREE.LineBasicMaterial({ 
            color: 0xff0080, // Hot pink grid lines
            transparent: true,
            opacity: 0.9 // Bright and vibrant
        });
        
        const points = [];
        const step = gridSize / divisions;
        
        // Horizontal lines (spanning width)
        for (let i = 0; i <= divisions; i++) {
            const z = (i * step) - gridSize / 2;
            points.push(new THREE.Vector3(-gridSize / 2, 0, z));
            points.push(new THREE.Vector3(gridSize / 2, 0, z));
        }
        
        // Vertical lines (depth)
        for (let i = 0; i <= divisions; i++) {
            const x = (i * step) - gridSize / 2;
            points.push(new THREE.Vector3(x, 0, -gridSize / 2));
            points.push(new THREE.Vector3(x, 0, gridSize / 2));
        }
        
        geometry.setFromPoints(points);
        this.grid = new THREE.LineSegments(geometry, material);
        this.grid.position.set(0, -5, 0);
        this.scene.add(this.grid);
        
        // Store floor references for cleanup
        this.gridFloor = floor;
        this.gradientFloor = gradientFloor;
        
        // Lay flat as horizontal floor
        this.grid.rotation.x = 0;
    }
    
    createEnergyWaves() {
        // Create rippling energy waves across the grid
        for (let i = 0; i < 3; i++) {
            const waveGeometry = new THREE.RingGeometry(1, 1.2, 32);
            const waveMaterial = new THREE.MeshBasicMaterial({
                color: i === 0 ? 0xff00ff : i === 1 ? 0x00ffff : 0xff0080,
                transparent: true,
                opacity: 0.6,
                side: THREE.DoubleSide
            });
            
            const wave = new THREE.Mesh(waveGeometry, waveMaterial);
            wave.position.y = -4.8;
            wave.rotation.x = 0;
            wave.userData = {
                originalScale: 1,
                speed: 0.02 + i * 0.01,
                phase: i * Math.PI * 2 / 3
            };
            
            this.waves.push(wave);
            this.scene.add(wave);
        }
    }
    
    createParticleField() {
        // Floating particles above the grid
        const particleCount = 50;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        
        const colorPalette = [
            new THREE.Color(0xff00ff),
            new THREE.Color(0x00ffff),
            new THREE.Color(0xff0080)
        ];
        
        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            
            positions[i3] = (Math.random() - 0.5) * 60; // Match smaller grid
            positions[i3 + 1] = Math.random() * 8 - 3;
            positions[i3 + 2] = (Math.random() - 0.5) * 60;
            
            const color = colorPalette[Math.floor(Math.random() * colorPalette.length)];
            colors[i3] = color.r;
            colors[i3 + 1] = color.g;
            colors[i3 + 2] = color.b;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        const material = new THREE.PointsMaterial({
            size: 0.1,
            vertexColors: true,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending
        });
        
        this.particles = new THREE.Points(geometry, material);
        this.scene.add(this.particles);
    }
    

    
    createVaporwaveMountains() {
        // Create classic vaporwave wireframe mountains on the sides only
        const mountainGroup = new THREE.Group();
        
        // Left side mountains
        this.createMountainSide(mountainGroup, -1, 'left');
        
        // Right side mountains  
        this.createMountainSide(mountainGroup, 1, 'right');
        
        this.scene.add(mountainGroup);
        this.vaporwaveMountains = mountainGroup;
    }
    
    createMountainSide(parentGroup, side, sideName) {
        // Create multiple mountain ranges for depth with different color schemes
        const ranges = [
            { distance: 45, height: 20, segments: 6, opacity: 0.9, colorScheme: 'near' },
            { distance: 65, height: 35, segments: 8, opacity: 0.7, colorScheme: 'mid' },
            { distance: 85, height: 45, segments: 10, opacity: 0.5, colorScheme: 'far' }
        ];
        
        ranges.forEach((range, rangeIndex) => {
            const mountainCount = 4 + rangeIndex; // More mountains in back ranges
            
            for (let i = 0; i < mountainCount; i++) {
                // Position mountains along the side
                const z = -60 + (i * (120 / mountainCount));
                const x = side * range.distance;
                
                // Create wireframe mountain with appropriate color scheme
                const mountain = this.createWireframeMountain(range.height, range.segments, range.opacity, range.colorScheme);
                mountain.position.set(x, -5, z);
                
                // Add some random variation
                mountain.rotation.y = (Math.random() - 0.5) * 0.3;
                mountain.scale.y = 0.8 + Math.random() * 0.6;
                mountain.scale.x = 0.7 + Math.random() * 0.6;
                
                parentGroup.add(mountain);
            }
        });
    }
    
    createWireframeMountain(height, segments, opacity, colorScheme = 'near') {
        // Create classic triangular wireframe mountain with gradient fills
        const group = new THREE.Group();
        
        // Mountain geometry - cone for triangular shape
        const geometry = new THREE.ConeGeometry(height * 0.7, height, segments, 1, false);
        
        // Different color schemes based on distance - using website CSS colors
        let gradientColors;
        
        switch(colorScheme) {
            case 'near':
                gradientColors = [
                    { color: 0x1a0d26, opacity: opacity * 0.9 }, // Same as floor --bg-card
                    { color: 0x1a0d26, opacity: opacity * 0.7 }, // Same as floor
                    { color: 0x1a0d26, opacity: opacity * 0.5 }, // Same as floor
                    { color: 0x1a0d26, opacity: opacity * 0.3 }  // Same as floor
                ];
                break;
            case 'mid':
                gradientColors = [
                    { color: 0x1a0d26, opacity: opacity * 0.8 }, // Same as floor
                    { color: 0x1a0d26, opacity: opacity * 0.6 }, // Same as floor
                    { color: 0x1a0d26, opacity: opacity * 0.4 }, // Same as floor
                    { color: 0x1a0d26, opacity: opacity * 0.2 }  // Same as floor
                ];
                break;
            case 'far':
                gradientColors = [
                    { color: 0x1a0d26, opacity: opacity * 0.7 }, // Same as floor
                    { color: 0x1a0d26, opacity: opacity * 0.5 }, // Same as floor
                    { color: 0x1a0d26, opacity: opacity * 0.3 }, // Same as floor
                    { color: 0x1a0d26, opacity: opacity * 0.2 }  // Same as floor
                ];
                break;
        }
        
        // Add multiple layers for gradient effect
        gradientColors.forEach((layer, index) => {
            const fillMaterial = new THREE.MeshBasicMaterial({
                color: layer.color,
                transparent: true,
                opacity: layer.opacity,
                side: THREE.DoubleSide
            });
            
            const filledMountain = new THREE.Mesh(geometry, fillMaterial);
            // Slightly offset each layer for depth
            filledMountain.position.y = index * 0.1;
            group.add(filledMountain);
        });
        
        // Subtle wireframe outline using website colors
        const wireframeMaterial = new THREE.MeshBasicMaterial({
            color: 0xff0080, // --accent-color (hot pink) to match grid
            wireframe: true,
            transparent: true,
            opacity: opacity * 0.6, // More visible
            linewidth: 1
        });
        
        const wireframeMountain = new THREE.Mesh(geometry, wireframeMaterial);
        group.add(wireframeMountain);
        
        return group;
    }
    
    createVaporwavePalmTrees() {
        // Create multiple stylized vaporwave palm trees around the platform edges only
        this.vaporwavePalmTrees = new THREE.Group();
        
        // Position palm trees around the perimeter of the 70x70 grid
        const gridSize = 70;
        const edgeOffset = 8; // Distance from the grid edge
        
        // Define positions only at the edges, avoiding the center racing area
        const treePositions = [
            // Front edges (closer to camera)
            { x: -gridSize/2 - edgeOffset, z: gridSize/2 + edgeOffset }, // Front left corner
            { x: gridSize/2 + edgeOffset, z: gridSize/2 + edgeOffset },  // Front right corner
            { x: -20, z: gridSize/2 + edgeOffset }, // Front left-center
            { x: 20, z: gridSize/2 + edgeOffset },  // Front right-center
            
            // Back edges (toward the sun) - these are the ones you said were fine!
            { x: -25, z: -gridSize/2 - edgeOffset }, // Back left (next to sun)
            { x: 25, z: -gridSize/2 - edgeOffset },  // Back right (next to sun)
            
            // Side edges only (avoiding mountains that are at x = ±45, ±65, ±85)
            { x: -gridSize/2 - edgeOffset, z: 15 }, // Left side front (safe)
            { x: -36, z: -5 }, // Left side center (moved 3 grids away from center)
            { x: gridSize/2 + edgeOffset, z: 15 },  // Right side front (safe)
            { x: 36, z: -5 }   // Right side center (moved 3 grids away from center)
        ];
        
        treePositions.forEach((pos, index) => {
            const treeGroup = this.createSinglePalmTree();
            
            // Position at platform edges only
            treeGroup.position.set(pos.x, -5, pos.z);
            
            // Vary scale slightly for natural look
            const scale = 0.6 + (Math.random() * 0.3);
            treeGroup.scale.setScalar(scale);
            
            // Add some rotation variety, facing generally inward
            treeGroup.rotation.y = (Math.random() - 0.5) * Math.PI * 0.4;
            
            this.vaporwavePalmTrees.add(treeGroup);
        });
        
        this.scene.add(this.vaporwavePalmTrees);
    }
    
    createSinglePalmTree() {
        // Create a single stylized vaporwave palm tree
        const treeGroup = new THREE.Group();
        
        // Palm tree trunk - cylindrical with slight taper
        const trunkGeometry = new THREE.CylinderGeometry(0.3, 0.5, 12, 8);
        const trunkMaterial = new THREE.MeshBasicMaterial({
            color: 0x8a2be2, // Purple trunk matching website neon-purple
            transparent: true,
            opacity: 0.8
        });
        
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.set(0, 1, 0); // Position trunk above ground
        treeGroup.add(trunk);
        
        // Trunk wireframe for vaporwave aesthetic
        const trunkWireframe = new THREE.WireframeGeometry(trunkGeometry);
        const trunkWireframeMaterial = new THREE.LineBasicMaterial({
            color: 0xff0080, // Hot pink wireframe
            transparent: true,
            opacity: 0.9,
            linewidth: 2
        });
        
        const trunkLines = new THREE.LineSegments(trunkWireframe, trunkWireframeMaterial);
        trunkLines.position.copy(trunk.position);
        treeGroup.add(trunkLines);
        
        // Create 6 palm fronds radiating from the top
        const frondCount = 6;
        for (let i = 0; i < frondCount; i++) {
            const angle = (i / frondCount) * Math.PI * 2;
            const frond = this.createPalmFrond();
            
            // Position fronds at top of trunk
            frond.position.set(0, 7, 0);
            frond.rotation.y = angle;
            frond.rotation.z = -0.3; // Slight droop
            
            treeGroup.add(frond);
        }
        
        return treeGroup;
    }
    
    createPalmFrond() {
        // Create a single palm frond using curve geometry
        const frondGroup = new THREE.Group();
        
        // Main frond curve
        const curve = new THREE.QuadraticBezierCurve3(
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(2, 1, 1),
            new THREE.Vector3(4, -0.5, 2)
        );
        
        // Create frond geometry along the curve
        const tubeGeometry = new THREE.TubeGeometry(curve, 20, 0.2, 8, false);
        const frondMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff, // Cyan frond
            transparent: true,
            opacity: 0.7
        });
        
        const frond = new THREE.Mesh(tubeGeometry, frondMaterial);
        frondGroup.add(frond);
        
        // Add wireframe outline to frond
        const frondWireframe = new THREE.WireframeGeometry(tubeGeometry);
        const frondWireframeMaterial = new THREE.LineBasicMaterial({
            color: 0xff0080, // Hot pink outline
            transparent: true,
            opacity: 0.8,
            linewidth: 2
        });
        
        const frondLines = new THREE.LineSegments(frondWireframe, frondWireframeMaterial);
        frondGroup.add(frondLines);
        
        // Add smaller side fronds
        for (let i = 0; i < 8; i++) {
            const t = (i + 1) / 9; // Position along main frond
            const point = curve.getPointAt(t);
            
            // Create small side frond
            const sideFrondGeometry = new THREE.PlaneGeometry(0.8, 0.1);
            const sideFrondMaterial = new THREE.MeshBasicMaterial({
                color: 0x39ff14, // Neon green
                transparent: true,
                opacity: 0.6,
                side: THREE.DoubleSide
            });
            
            const sideFrond = new THREE.Mesh(sideFrondGeometry, sideFrondMaterial);
            sideFrond.position.copy(point);
            sideFrond.rotation.z = Math.random() * 0.5 - 0.25; // Random angle
            
            frondGroup.add(sideFrond);
        }
        
        return frondGroup;
    }
    
    createTronTrails() {
        // Create multiple Tron light cycle trails
        const trailCount = 8; // More bikes for more action
        const colors = [
            0x00ffff, // Cyan
            0xff00ff, // Magenta
            0xff0080, // Hot Pink
            0x39ff14, // Neon Green
            0xffff00, // Yellow
            0xff4500, // Orange Red
            0x8a2be2, // Blue Violet
            0x00ff80  // Spring Green
        ];
        
        for (let i = 0; i < trailCount; i++) {
            // Create trail path with matching color
            const trailColor = colors[i % colors.length];
            console.log(`Creating trail ${i} with color: 0x${trailColor.toString(16)}`);
            
            const trail = {
                points: [],
                geometry: null,
                material: null,
                line: null,
                trailColor: trailColor, // Store the color for reference
                position: {
                    x: (Math.random() - 0.5) * 50, // Smaller spawn area (25 units from center)
                    z: (Math.random() - 0.5) * 50
                },
                direction: {
                    x: (Math.random() - 0.5) * 2,
                    z: (Math.random() - 0.5) * 2
                },
                speed: 0.08 + Math.random() * 0.06, // Much slower
                maxPoints: 300, // 5 seconds at 60fps (increased from 180)
                turnCooldown: 0,
                id: i
            };
            
            // Normalize direction
            const length = Math.sqrt(trail.direction.x * trail.direction.x + trail.direction.z * trail.direction.z);
            trail.direction.x /= length;
            trail.direction.z /= length;
            
            // Create initial trail point
            trail.points.push(new THREE.Vector3(trail.position.x, -4.5, trail.position.z));
            
            this.tronTrails.push(trail);
            
            // Create actual Tron light cycle bike instead of simple line
            const bike = this.createTronBike(trailColor);
            bike.position.set(trail.position.x, -4.3, trail.position.z);
            this.scene.add(bike);
            
            this.tronBikes.push({
                mesh: bike,
                trail: trail,
                color: trailColor // Store the color for reference
            });
        }
    }
    
    createVaporwaveSun() {
        // Create the classic vaporwave sun at grid horizon
        const sunGroup = new THREE.Group();
        
        // Main sun circle
        const sunGeometry = new THREE.CircleGeometry(8, 32);
        const sunMaterial = new THREE.MeshBasicMaterial({
            color: 0xff0080, // Hot pink
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });
        
        const sun = new THREE.Mesh(sunGeometry, sunMaterial);
        sun.position.set(0, 2, -55); // Further back to avoid intersection
        sunGroup.add(sun);
        
        // Sun gradient rings
        for (let i = 1; i <= 5; i++) {
            const ringGeometry = new THREE.RingGeometry(8 + i * 1.5, 8 + i * 1.5 + 0.3, 32);
            const ringMaterial = new THREE.MeshBasicMaterial({
                color: i % 2 === 0 ? 0xff00ff : 0xff0080,
                transparent: true,
                opacity: 0.6 - i * 0.1,
                side: THREE.DoubleSide
            });
            
            const ring = new THREE.Mesh(ringGeometry, ringMaterial);
            ring.position.set(0, 2, -55); // Same position as sun
            sunGroup.add(ring);
        }
        
        // Horizontal scanlines across the sun
        const lineCount = 15;
        for (let i = 0; i < lineCount; i++) {
            const y = (i - lineCount/2) * 1.2;
            const lineGeometry = new THREE.PlaneGeometry(20, 0.2);
            const lineMaterial = new THREE.MeshBasicMaterial({
                color: 0x000000,
                transparent: true,
                opacity: 0.4
            });
            
            const line = new THREE.Mesh(lineGeometry, lineMaterial);
            line.position.set(0, 2 + y, -54.9); // Slightly in front of sun
            sunGroup.add(line);
        }
        
        // Add the sun group to scene
        this.scene.add(sunGroup);
        this.vaporwaveSun = {
            group: sunGroup,
            sun: sun,
            rings: sunGroup.children.filter(child => child.geometry instanceof THREE.RingGeometry)
        };
    }
    
    setupEventListeners() {
        // Mouse movement for interactive effects
        document.addEventListener('mousemove', (event) => {
            this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        });
        
        // Window resize
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
        
        // Setup lighting
        const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
        this.scene.add(ambientLight);
        
        const pointLight = new THREE.PointLight(0x00ffff, 2, 100);
        pointLight.position.set(0, 10, 0);
        this.scene.add(pointLight);
    }
    
    animate() {
        this.animationId = requestAnimationFrame(() => this.animate());
        
        this.time += 0.01;
        
        // Animate energy waves
        this.waves.forEach((wave, index) => {
            const scale = 1 + Math.sin(this.time * wave.userData.speed + wave.userData.phase) * 0.5;
            wave.scale.set(scale, 1, scale);
            wave.material.opacity = 0.6 - scale * 0.2;
        });
        
        // Animate particles
        if (this.particles) {
            const positions = this.particles.geometry.attributes.position.array;
            for (let i = 0; i < positions.length; i += 3) {
                positions[i + 1] += Math.sin(this.time + positions[i]) * 0.01;
            }
            this.particles.geometry.attributes.position.needsUpdate = true;
            this.particles.rotation.y += 0.002;
        }
        

        
        // Grid animation
        if (this.grid) {
            this.grid.material.opacity = 0.8 + Math.sin(this.time * 1.5) * 0.2;
        }
        
        // Animate Tron trails
        this.animateTronTrails();
        
        // Animate vaporwave sun
        this.animateVaporwaveSun();
        
        // Mouse interaction - tilt up/down based on mouse Y, slight side movement
        if (this.camera) {
            // Tilt camera up/down based on mouse Y position
            const targetTiltY = 5 + this.mouse.y * 3;
            const targetX = this.mouse.x * 5;
            
            this.camera.position.x += (targetX - this.camera.position.x) * 0.05;
            this.camera.position.y += (targetTiltY - this.camera.position.y) * 0.05;
            
            // Always look toward the vaporwave scene
            this.camera.lookAt(0, -5, -20);
        }
        
        this.renderer.render(this.scene, this.camera);
    }
    
    animateTronTrails() {
        this.tronTrails.forEach((trail, index) => {
            // Move trail forward
            trail.position.x += trail.direction.x * trail.speed;
            trail.position.z += trail.direction.z * trail.speed;
            
            // Boundary checking and turning
            const boundary = 30; // Smaller boundary to keep bikes within visible grid
            let shouldTurn = false;
            
            // Force bikes to stay within boundary (hard constraint)
            if (Math.abs(trail.position.x) > boundary) {
                trail.position.x = Math.sign(trail.position.x) * boundary;
                shouldTurn = true;
            }
            if (Math.abs(trail.position.z) > boundary) {
                trail.position.z = Math.sign(trail.position.z) * boundary;
                shouldTurn = true;
            }
            
            // Random turns (like in Tron) - less frequent for slower bikes
            if (trail.turnCooldown <= 0 && Math.random() < 0.008) {
                shouldTurn = true;
                trail.turnCooldown = 120; // Longer cooldown for slower movement
            }
            
            if (shouldTurn) {
                // Smart turning - face away from boundaries
                const turns = [
                    { x: 1, z: 0 },   // East
                    { x: -1, z: 0 },  // West
                    { x: 0, z: 1 },   // North
                    { x: 0, z: -1 }   // South
                ];
                
                // Filter turns that move away from boundaries
                let validTurns = turns.filter(turn => {
                    const newX = trail.position.x + turn.x * 5;
                    const newZ = trail.position.z + turn.z * 5;
                    return Math.abs(newX) < boundary * 0.9 && Math.abs(newZ) < boundary * 0.9;
                });
                
                // If no safe turns, just avoid going backwards
                if (validTurns.length === 0) {
                    validTurns = turns.filter(turn => 
                        Math.abs(turn.x - (-trail.direction.x)) > 0.1 || 
                        Math.abs(turn.z - (-trail.direction.z)) > 0.1
                    );
                }
                
                if (validTurns.length === 0) validTurns = turns;
                
                const newDirection = validTurns[Math.floor(Math.random() * validTurns.length)];
                trail.direction.x = newDirection.x;
                trail.direction.z = newDirection.z;
                trail.turnCooldown = 30;
            }
            
            trail.turnCooldown = Math.max(0, trail.turnCooldown - 1);
            
            // Add new point to trail
            const newPoint = new THREE.Vector3(trail.position.x, -4.5, trail.position.z);
            trail.points.push(newPoint);
            
            // Limit trail length
            if (trail.points.length > trail.maxPoints) {
                trail.points.shift();
            }
            
            // Update trail geometry - recreate the line with fresh material
            if (trail.points.length > 1) {
                // Remove old line
                if (trail.line) {
                    this.scene.remove(trail.line);
                    trail.line.geometry.dispose();
                    trail.line.material.dispose();
                }
                
                // Create fresh geometry and material
                const newGeometry = new THREE.BufferGeometry();
                newGeometry.setFromPoints(trail.points);
                
                const newMaterial = new THREE.LineBasicMaterial({
                    color: trail.trailColor,
                    transparent: true,
                    opacity: 0.9,
                    linewidth: 4
                });
                
                // Create new line and add to scene
                trail.line = new THREE.Line(newGeometry, newMaterial);
                trail.geometry = newGeometry;
                trail.material = newMaterial;
                this.scene.add(trail.line);
            }
            
            // Update bike position
            if (this.tronBikes[index]) {
                this.tronBikes[index].mesh.position.set(
                    trail.position.x, 
                    -4.3, 
                    trail.position.z
                );
                
                // Rotate bike to face movement direction (bikes are oriented along Z-axis)
                this.tronBikes[index].mesh.rotation.y = Math.atan2(trail.direction.x, trail.direction.z);
                
                // Pulse bike glow effects
                const pulseIntensity = 0.6 + Math.sin(this.time * 3) * 0.4;
                this.tronBikes[index].mesh.children.forEach(child => {
                    if (child.material && child.material.emissive) {
                        child.material.emissiveIntensity = pulseIntensity * 0.3;
                    }
                });
                
                // Animate wheels (they're now oriented along X-axis)
                const wheels = this.tronBikes[index].mesh.children.filter(child => 
                    child.geometry instanceof THREE.CylinderGeometry
                );
                wheels.forEach(wheel => {
                    wheel.rotation.z += trail.speed * 2; // Wheel rotation based on speed
                });
            }
            
            // Fade trail opacity based on point age (5-second persistence)
            if (trail.points.length > 1) {
                // Update trail geometry with proper colors
                trail.geometry.setFromPoints(trail.points);
                
                // Set the trail color to match the bike
                trail.material.color.setHex(trail.trailColor);
                trail.material.opacity = 0.9;
                
                // Create gradient fade effect along the trail
                const positions = trail.geometry.attributes.position.array;
                const colors = new Float32Array(positions.length);
                const color = new THREE.Color(trail.trailColor);
                
                for (let i = 0; i < trail.points.length; i++) {
                    const age = i / trail.points.length;
                    const opacity = Math.pow(age, 0.3) * 0.9; // Gradual fade
                    const i3 = i * 3;
                    colors[i3] = color.r * opacity;
                    colors[i3 + 1] = color.g * opacity;
                    colors[i3 + 2] = color.b * opacity;
                }
                
                if (!trail.geometry.attributes.color) {
                    trail.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
                    trail.material.vertexColors = true;
                } else {
                    trail.geometry.attributes.color.array = colors;
                    trail.geometry.attributes.color.needsUpdate = true;
                }
            }
        });
    }
    
    createTronBike(color) {
        // Create a proper elongated Tron light cycle
        const bikeGroup = new THREE.Group();
        
        // Main bike body (long and narrow - like a proper light cycle)
        const bodyGeometry = new THREE.BoxGeometry(0.2, 0.15, 1.2); // Z is length, X is width
        const bodyMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.9
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.set(0, 0.08, 0);
        bikeGroup.add(body);
        
        // Front nose (pointed front along Z axis)
        const noseGeometry = new THREE.ConeGeometry(0.08, 0.25, 6);
        const noseMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.9
        });
        const nose = new THREE.Mesh(noseGeometry, noseMaterial);
        nose.position.set(0, 0.08, 0.7); // Front of bike (positive Z)
        nose.rotation.x = -Math.PI / 2; // Point forward along Z axis
        bikeGroup.add(nose);
        
        // Rear section
        const rearGeometry = new THREE.BoxGeometry(0.15, 0.12, 0.2);
        const rearMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.8
        });
        const rear = new THREE.Mesh(rearGeometry, rearMaterial);
        rear.position.set(0, 0.06, -0.6); // Back of bike (negative Z)
        bikeGroup.add(rear);
        
        // Wheels (positioned along the length)
        const wheelGeometry = new THREE.CylinderGeometry(0.12, 0.12, 0.03, 8);
        const wheelMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.7
        });
        
        const frontWheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
        frontWheel.position.set(0, -0.04, 0.4); // Front wheel
        frontWheel.rotation.x = Math.PI / 2; // Proper wheel orientation
        bikeGroup.add(frontWheel);
        
        const backWheel = new THREE.Mesh(wheelGeometry, wheelMaterial.clone());
        backWheel.position.set(0, -0.04, -0.4); // Back wheel
        backWheel.rotation.x = Math.PI / 2; // Proper wheel orientation
        bikeGroup.add(backWheel);
        
        // Light strips along the bike length
        const stripGeometry = new THREE.BoxGeometry(0.02, 0.02, 1.0);
        const stripMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 1,
            emissive: color,
            emissiveIntensity: 0.3
        });
        
        // Side light strips (along the length)
        const leftStrip = new THREE.Mesh(stripGeometry, stripMaterial);
        leftStrip.position.set(0.11, 0.08, 0); // Left side
        bikeGroup.add(leftStrip);
        
        const rightStrip = new THREE.Mesh(stripGeometry, stripMaterial.clone());
        rightStrip.position.set(-0.11, 0.08, 0); // Right side
        bikeGroup.add(rightStrip);
        
        // Front headlight
        const headlightGeometry = new THREE.SphereGeometry(0.04, 6, 6);
        const headlightMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.9,
            emissive: 0xffffff,
            emissiveIntensity: 0.5
        });
        const headlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
        headlight.position.set(0, 0.08, 0.9); // Front tip
        bikeGroup.add(headlight);
        
        return bikeGroup;
    }
    
    animateVaporwaveSun() {
        if (!this.vaporwaveSun) return;
        
        // Animate the main sun
        this.vaporwaveSun.sun.material.opacity = 0.8 + Math.sin(this.time * 0.5) * 0.2;
        
        // Animate the rings with different phases
        this.vaporwaveSun.rings.forEach((ring, index) => {
            ring.material.opacity = (0.6 - index * 0.1) + Math.sin(this.time * 0.3 + index * 0.5) * 0.1;
            ring.rotation.z += 0.001 * (index + 1);
        });
        
        // Subtle sun movement at horizon
        const sunOffset = Math.sin(this.time * 0.1) * 0.5;
        this.vaporwaveSun.group.position.y = 2 + sunOffset;
    }
    
    destroy() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        
        // Clean up grid and floor
        if (this.grid) {
            this.scene.remove(this.grid);
            this.grid.geometry.dispose();
            this.grid.material.dispose();
        }
        
        if (this.gridFloor) {
            this.scene.remove(this.gridFloor);
            this.gridFloor.geometry.dispose();
            this.gridFloor.material.dispose();
        }
        
        if (this.gradientFloor) {
            this.scene.remove(this.gradientFloor);
            this.gradientFloor.geometry.dispose();
            this.gradientFloor.material.dispose();
        }
        
        // Clean up Tron trails
        this.tronTrails.forEach(trail => {
            if (trail.line) {
                this.scene.remove(trail.line);
                trail.geometry.dispose();
                trail.material.dispose();
            }
        });
        
        this.tronBikes.forEach(bike => {
            if (bike.mesh) {
                this.scene.remove(bike.mesh);
                // Clean up all child geometries and materials
                bike.mesh.children.forEach(child => {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) child.material.dispose();
                });
            }
        });
        
        // Clean up vaporwave sun
        if (this.vaporwaveSun) {
            this.scene.remove(this.vaporwaveSun.group);
            this.vaporwaveSun.group.children.forEach(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });
        }
        
        // Clean up vaporwave mountains
        if (this.vaporwaveMountains) {
            this.scene.remove(this.vaporwaveMountains);
            this.vaporwaveMountains.children.forEach(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });
        }
        
        // Clean up vaporwave palm tree
        if (this.vaporwavePalmTree) {
            this.scene.remove(this.vaporwavePalmTree);
            this.vaporwavePalmTree.children.forEach(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
                // Clean up nested children (fronds)
                if (child.children) {
                    child.children.forEach(grandChild => {
                        if (grandChild.geometry) grandChild.geometry.dispose();
                        if (grandChild.material) grandChild.material.dispose();
                    });
                }
            });
        }
        
        if (this.renderer) {
            this.renderer.dispose();
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait for Three.js to load
    if (typeof THREE !== 'undefined') {
        window.holographicFloor = new HolographicFloor();
    } else {
        console.error('❌ Three.js not loaded for holographic floor');
    }
});

// Cleanup
window.addEventListener('beforeunload', () => {
    if (window.holographicFloor) {
        window.holographicFloor.destroy();
    }
});