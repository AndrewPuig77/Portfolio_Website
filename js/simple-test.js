console.log('🚀 Starting AMAZING Synthwave Scene...');

// Full Synthwave 3D Scene
function initSynthwaveScene() {
    console.log('🔧 Initializing amazing synthwave scene...');
    
    if (typeof THREE === 'undefined') {
        console.error('❌ Three.js not loaded!');
        return;
    }
    
    const canvas = document.getElementById('synthwave-canvas');
    if (!canvas) {
        console.error('❌ Canvas not found!');
        return;
    }
    
    console.log('✅ Canvas found, testing visibility...');
    
    // Test canvas visibility
    canvas.style.border = '3px solid red';
    canvas.style.background = 'rgba(255, 0, 0, 0.3)';
    console.log('Canvas dimensions:', canvas.offsetWidth, 'x', canvas.offsetHeight);
    console.log('Canvas position:', canvas.offsetLeft, ',', canvas.offsetTop);
    
    // Scene setup
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x000011, 30, 200);
    
    // Camera setup
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 10, 30); // Moved closer
    
    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0.2); // Make background slightly visible
    
    console.log('✅ Renderer created, size:', window.innerWidth, 'x', window.innerHeight);
    
    // Mouse tracking
    const mouse = { x: 0, y: 0 };
    let time = 0;
    
    // === SYNTHWAVE GRID FLOOR ===
    const gridSize = 50; // Smaller grid
    const divisions = 20; // Fewer divisions
    const gridHelper = new THREE.GridHelper(gridSize, divisions);
    gridHelper.material.color.setHex(0xff00ff);
    gridHelper.material.transparent = true;
    gridHelper.material.opacity = 1.0; // Full opacity
    gridHelper.position.y = -5; // Closer to camera
    gridHelper.material.emissive.setHex(0x440044);
    scene.add(gridHelper);
    
    console.log('✅ Grid added');
    
    // Add a big test cube right in front
    const testGeometry = new THREE.BoxGeometry(5, 5, 5);
    const testMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x00ffff,
        wireframe: true 
    });
    const testCube = new THREE.Mesh(testGeometry, testMaterial);
    testCube.position.set(0, 5, 0); // Right in front of camera
    scene.add(testCube);
    
    console.log('✅ Test cube added at:', testCube.position);
    
    // Additional grid lines for extra synthwave feel
    const geometry = new THREE.BufferGeometry();
    const material = new THREE.LineBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.6 });
    const points = [];
    for (let i = -50; i <= 50; i += 2.5) {
        points.push(new THREE.Vector3(i, -10, -50));
        points.push(new THREE.Vector3(i, -10, 50));
        points.push(new THREE.Vector3(-50, -10, i));
        points.push(new THREE.Vector3(50, -10, i));
    }
    geometry.setFromPoints(points);
    const lines = new THREE.LineSegments(geometry, material);
    scene.add(lines);
    
    // === FLOATING GEOMETRIC SHAPES ===
    const shapes = [];
    const shapeTypes = [
        { geo: () => new THREE.BoxGeometry(2, 2, 2), color: 0xff00ff },
        { geo: () => new THREE.SphereGeometry(1.5, 16, 16), color: 0x00ffff },
        { geo: () => new THREE.ConeGeometry(1.2, 3, 8), color: 0xff0080 },
        { geo: () => new THREE.OctahedronGeometry(1.5), color: 0x8a2be2 },
        { geo: () => new THREE.TetrahedronGeometry(2), color: 0x39ff14 }
    ];
    
    for (let i = 0; i < 20; i++) {
        const shapeType = shapeTypes[Math.floor(Math.random() * shapeTypes.length)];
        const geometry = shapeType.geo();
        
        const material = new THREE.MeshPhongMaterial({
            color: shapeType.color,
            emissive: shapeType.color,
            emissiveIntensity: 0.3,
            transparent: true,
            opacity: 0.8,
            wireframe: Math.random() > 0.6
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        
        // Position randomly
        mesh.position.set(
            (Math.random() - 0.5) * 80,
            Math.random() * 25 + 5,
            (Math.random() - 0.5) * 80
        );
        
        // Rotation speeds
        mesh.userData = {
            rotSpeed: {
                x: (Math.random() - 0.5) * 0.03,
                y: (Math.random() - 0.5) * 0.03,
                z: (Math.random() - 0.5) * 0.03
            },
            floatSpeed: Math.random() * 0.02 + 0.01,
            originalY: mesh.position.y
        };
        
        shapes.push(mesh);
        scene.add(mesh);
    }
    
    // === PARTICLE SYSTEM ===
    const particleCount = 2000;
    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    
    const colorPalette = [
        new THREE.Color(0xff00ff), // Pink
        new THREE.Color(0x00ffff), // Cyan
        new THREE.Color(0xff0080), // Hot pink
        new THREE.Color(0x8a2be2), // Purple
        new THREE.Color(0x39ff14)  // Neon green
    ];
    
    for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        
        // Positions - create a cloud around the scene
        positions[i3] = (Math.random() - 0.5) * 150;
        positions[i3 + 1] = Math.random() * 60;
        positions[i3 + 2] = (Math.random() - 0.5) * 150;
        
        // Colors
        const color = colorPalette[Math.floor(Math.random() * colorPalette.length)];
        colors[i3] = color.r;
        colors[i3 + 1] = color.g;
        colors[i3 + 2] = color.b;
        
        // Sizes
        sizes[i] = Math.random() * 2 + 0.5;
    }
    
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    const particleMaterial = new THREE.PointsMaterial({
        size: 0.8,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true
    });
    
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);
    
    // === LIGHTING ===
    const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
    scene.add(ambientLight);
    
    const directionalLight1 = new THREE.DirectionalLight(0xff00ff, 1.2);
    directionalLight1.position.set(50, 50, 50);
    scene.add(directionalLight1);
    
    const directionalLight2 = new THREE.DirectionalLight(0x00ffff, 1);
    directionalLight2.position.set(-50, 30, -50);
    scene.add(directionalLight2);
    
    // Mouse-following point light
    const mouseLight = new THREE.PointLight(0xff0080, 3, 100);
    mouseLight.position.set(0, 20, 30);
    scene.add(mouseLight);
    
    // === EVENT LISTENERS ===
    window.addEventListener('mousemove', (event) => {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    });
    
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
    
    // === ANIMATION LOOP ===
    function animate() {
        requestAnimationFrame(animate);
        
        time += 0.01;
        
        // Animate shapes
        shapes.forEach(shape => {
            shape.rotation.x += shape.userData.rotSpeed.x;
            shape.rotation.y += shape.userData.rotSpeed.y;
            shape.rotation.z += shape.userData.rotSpeed.z;
            
            // Floating motion
            shape.position.y = shape.userData.originalY + 
                Math.sin(time * shape.userData.floatSpeed) * 4;
        });
        
        // Animate particles
        const positions = particles.geometry.attributes.position.array;
        for (let i = 0; i < positions.length; i += 3) {
            positions[i + 1] += Math.sin(time + positions[i] * 0.01) * 0.02;
            
            // Create flowing effect
            positions[i] += Math.sin(time * 0.5 + positions[i + 2] * 0.01) * 0.01;
            positions[i + 2] += Math.cos(time * 0.3 + positions[i] * 0.01) * 0.01;
        }
        particles.geometry.attributes.position.needsUpdate = true;
        particles.rotation.y += 0.001;
        
        // Camera follows mouse smoothly
        camera.position.x += (mouse.x * 15 - camera.position.x) * 0.03;
        camera.position.y += (-mouse.y * 10 + 15 - camera.position.y) * 0.03;
        camera.lookAt(0, 0, 0);
        
        // Mouse light follows cursor
        mouseLight.position.x = mouse.x * 40;
        mouseLight.position.y = -mouse.y * 20 + 20;
        mouseLight.intensity = 3 + Math.sin(time * 3) * 0.5;
        
        // Grid pulsing effect
        gridHelper.material.opacity = 0.6 + Math.sin(time * 2) * 0.2;
        
        // Additional effects
        directionalLight1.intensity = 1.2 + Math.sin(time * 1.5) * 0.3;
        directionalLight2.intensity = 1 + Math.cos(time * 2) * 0.2;
        
        renderer.render(scene, camera);
    }
    
    console.log('🎉 SYNTHWAVE SCENE LAUNCHED! Move your mouse to interact!');
    animate();
}

// Initialize when ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, waiting a bit more...');
    setTimeout(function() {
        console.log('Starting synthwave scene...');
        initSynthwaveScene();
    }, 500); // Wait 500ms to ensure everything is ready
});