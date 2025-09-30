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
        
        // Camera setup
        this.camera = new THREE.PerspectiveCamera(
            75, 
            window.innerWidth / window.innerHeight, 
            0.1, 
            1000
        );
        this.camera.position.set(0, 20, 50);
        this.camera.lookAt(0, 0, 0);
        
        // Renderer setup
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: this.canvas, 
            antialias: true,
            alpha: true 
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setClearColor(0x000000, 0);
        
        console.log('✅ Scene setup complete');
        
        // Add a simple test cube to make sure it's working
        const testGeometry = new THREE.BoxGeometry(5, 5, 5);
        const testMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xff00ff,
            wireframe: true 
        });
        const testCube = new THREE.Mesh(testGeometry, testMaterial);
        testCube.position.set(0, 10, 0);
        this.scene.add(testCube);
        console.log('🧊 Test cube added');
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