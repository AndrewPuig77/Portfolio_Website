// Synthwave background: an endless neon valley with light cycles racing toward a striped sun.
// Built on Three.js r160 with bloom post-processing. If WebGL or the CDN is unavailable,
// the canvas is removed and the CSS gradient on <body> shows instead.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const PALETTE = {
    pink: 0xff2bd6,
    hotPink: 0xff0080,
    cyan: 0x00f0ff,
    purple: 0x8a2be2,
    amber: 0xffb31a,
    sunTop: 0xffd319,
    sunBottom: 0xff1f8e,
    skyTop: 0x030008,
    skyMid: 0x1b0638,
    haze: 0x3b0b4f,
    ground: 0x07020f,
    peak: 0x1d0833
};

const WORLD_SPEED = 14;        // how fast the ground scrolls toward the camera (units/s)
const TRAIL_LENGTH = 24;       // light wall length behind each cycle
const TRAIL_HEIGHT = 1.1;
const LANE_HALF_WIDTH = 12;    // cycles stay inside the flat valley floor

const isMobile = window.matchMedia('(max-width: 768px)').matches;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- Shared GLSL ----------

// 2D simplex noise (Ashima Arts / Stefan Gustavson, MIT)
const NOISE_GLSL = /* glsl */ `
vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod(i, 289.0);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
    m = m * m;
    m = m * m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
}
float fbm(vec2 p) {
    float sum = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 4; i++) {
        sum += amp * snoise(p);
        p *= 2.03;
        amp *= 0.5;
    }
    return sum;
}
`;

// ---------- Scene pieces ----------

function createSky() {
    const material = new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
            uTime: { value: 0 },
            uTop: { value: new THREE.Color(PALETTE.skyTop) },
            uMid: { value: new THREE.Color(PALETTE.skyMid) },
            uHaze: { value: new THREE.Color(PALETTE.haze) },
            uGlow: { value: new THREE.Color(PALETTE.hotPink) }
        },
        vertexShader: /* glsl */ `
            varying vec3 vDir;
            void main() {
                vDir = (modelMatrix * vec4(position, 1.0)).xyz - cameraPosition;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: /* glsl */ `
            uniform float uTime;
            uniform vec3 uTop, uMid, uHaze, uGlow;
            varying vec3 vDir;
            float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
            void main() {
                vec3 d = normalize(vDir);
                float y = d.y;
                vec3 col = mix(uHaze, uMid, smoothstep(0.0, 0.2, y));
                col = mix(col, uTop, smoothstep(0.2, 0.75, y));

                // Pink glow hugging the horizon behind the sun
                // Square by multiplying: pow() with a negative base is undefined in GLSL and returns NaN on many GPUs
                float gx = d.x * 1.6;
                float glow = exp(-gx * gx * 6.0) * exp(-max(y, 0.0) * 9.0);
                col += uGlow * glow * 0.22;

                // Twinkling stars
                vec2 sp = vec2(atan(d.x, -d.z), y) * 240.0;
                vec2 cell = floor(sp);
                float h = hash(cell);
                float star = step(0.986, h) * smoothstep(0.32, 0.0, length(fract(sp) - 0.5));
                star *= 0.55 + 0.45 * sin(uTime * (1.0 + h * 3.0) + h * 60.0);
                star *= smoothstep(0.1, 0.4, y);
                col += vec3(0.85, 0.9, 1.0) * star * 1.4;

                gl_FragColor = vec4(col, 1.0);
                #include <tonemapping_fragment>
                #include <colorspace_fragment>
            }
        `
    });
    return new THREE.Mesh(new THREE.SphereGeometry(600, 32, 16), material);
}

function createSun() {
    const group = new THREE.Group();
    const radius = 50;

    const sunMaterial = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: {
            uTime: { value: 0 },
            uTop: { value: new THREE.Color(PALETTE.sunTop) },
            uBottom: { value: new THREE.Color(PALETTE.sunBottom) }
        },
        vertexShader: /* glsl */ `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: /* glsl */ `
            uniform float uTime;
            uniform vec3 uTop, uBottom;
            varying vec2 vUv;
            void main() {
                vec2 p = vUv * 2.0 - 1.0;
                float r = length(p);
                float edge = 1.0 - smoothstep(0.985, 1.0, r);
                vec3 col = mix(uBottom, uTop, smoothstep(-0.7, 0.85, p.y));

                // Retro cut-out bands that thicken toward the bottom and drift downward
                float bands = p.y * 7.0 + uTime * 0.22;
                float thickness = clamp((0.45 - p.y) * 0.45, 0.0, 0.75);
                float f = fract(bands);
                float fw = fwidth(bands);
                float cut = thickness > 0.0 ? smoothstep(thickness - fw, thickness + fw, f) : 1.0;

                gl_FragColor = vec4(col * 1.25, edge * cut);
                #include <tonemapping_fragment>
                #include <colorspace_fragment>
            }
        `
    });
    const sun = new THREE.Mesh(new THREE.PlaneGeometry(radius * 2, radius * 2), sunMaterial);
    sun.renderOrder = 2;
    group.add(sun);

    const haloMaterial = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { uColor: { value: new THREE.Color(PALETTE.hotPink) } },
        vertexShader: sunMaterial.vertexShader,
        fragmentShader: /* glsl */ `
            uniform vec3 uColor;
            varying vec2 vUv;
            void main() {
                float r = length(vUv * 2.0 - 1.0);
                float a = pow(max(0.0, 1.0 - r), 2.4);
                gl_FragColor = vec4(uColor * a * 0.32, 1.0);
                #include <tonemapping_fragment>
                #include <colorspace_fragment>
            }
        `
    });
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(radius * 5, radius * 5), haloMaterial);
    halo.position.z = -1;
    halo.renderOrder = 1;
    group.add(halo);

    group.position.set(0, 20, -340);
    return { group, material: sunMaterial };
}

// One mesh for the whole landscape: a flat valley for the cycles with
// noise-shaped mountains rising on both sides. Everything scrolls in the shader.
function createTerrain() {
    const width = 260;
    const depth = 340;
    const geometry = new THREE.PlaneGeometry(width, depth, isMobile ? 90 : 160, isMobile ? 120 : 220);
    geometry.rotateX(-Math.PI / 2);
    geometry.translate(0, 0, -depth / 2 + 30);

    const material = new THREE.ShaderMaterial({
        extensions: { derivatives: true },
        uniforms: {
            uTime: { value: 0 },
            uOffset: { value: 0 },
            uLine: { value: new THREE.Color(PALETTE.pink) },
            uLinePeak: { value: new THREE.Color(PALETTE.cyan) },
            uGround: { value: new THREE.Color(PALETTE.ground) },
            uPeak: { value: new THREE.Color(PALETTE.peak) },
            uHaze: { value: new THREE.Color(PALETTE.haze) },
            uSun: { value: new THREE.Color(PALETTE.hotPink) }
        },
        vertexShader: /* glsl */ `
            uniform float uOffset;
            varying vec3 vGrid;
            varying float vDist;
            varying float vValley;
            ${NOISE_GLSL}
            void main() {
                vec4 world = modelMatrix * vec4(position, 1.0);
                float z = world.z - uOffset;
                float ax = abs(world.x);
                float rise = smoothstep(17.0, 48.0, ax);
                float n = fbm(vec2(world.x * 0.022, z * 0.022)) * 0.5 + 0.5;
                float ridge = 1.0 - abs(snoise(vec2(world.x * 0.011 + 7.0, z * 0.011)));
                float h = rise * (n * 20.0 + ridge * ridge * 24.0) * (0.55 + 0.45 * smoothstep(48.0, 120.0, ax));
                world.y += h;

                vGrid = vec3(world.x, h, z);
                vValley = 1.0 - rise;
                vec4 mv = viewMatrix * world;
                vDist = -mv.z;
                gl_Position = projectionMatrix * mv;
            }
        `,
        fragmentShader: /* glsl */ `
            uniform float uTime;
            uniform vec3 uLine, uLinePeak, uGround, uPeak, uHaze, uSun;
            varying vec3 vGrid;
            varying float vDist;
            varying float vValley;

            float gridLines(vec2 p, float width) {
                vec2 fw = fwidth(p);
                vec2 g = abs(fract(p - 0.5) - 0.5) / max(fw * width, 1e-4);
                float line = 1.0 - min(min(g.x, g.y), 1.0);
                // Fade lines out where they get thinner than a pixel to avoid moire
                return line * (1.0 - smoothstep(0.2, 0.65, max(fw.x, fw.y)));
            }

            void main() {
                float height = clamp(vGrid.y / 32.0, 0.0, 1.0);
                float lines = gridLines(vGrid.xz / 4.0, 1.3);

                vec3 base = mix(uGround, uPeak, smoothstep(0.0, 0.8, height));
                vec3 lineColor = mix(uLine, uLinePeak, smoothstep(0.08, 0.75, height));
                float pulse = 0.85 + 0.15 * sin(uTime * 1.4);
                float near = 1.0 - smoothstep(40.0, 260.0, vDist);
                vec3 col = base + lineColor * lines * (1.0 + 0.5 * height) * pulse * (0.3 + 0.7 * near);

                // Soft reflection of the sun running down the valley floor
                float spread = 2.0 + vDist * 0.07;
                float rx = vGrid.x / spread;
                float reflection = exp(-rx * rx) * smoothstep(12.0, 170.0, vDist) * vValley;
                col += uSun * reflection * 0.22;

                col = mix(col, uHaze, smoothstep(90.0, 300.0, vDist));
                gl_FragColor = vec4(col, 1.0);
                #include <tonemapping_fragment>
                #include <colorspace_fragment>
            }
        `
    });
    return new THREE.Mesh(geometry, material);
}

function createDust() {
    const count = isMobile ? 260 : 600;
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 160;
        positions[i * 3 + 1] = 0.5 + Math.random() * 40;
        positions[i * 3 + 2] = -Math.random() * 320;
        seeds[i] = Math.random();
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));

    const material = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
            uOffset: { value: 0 },
            uTime: { value: 0 },
            uPixelRatio: { value: 1 },
            uA: { value: new THREE.Color(PALETTE.cyan) },
            uB: { value: new THREE.Color(PALETTE.pink) }
        },
        vertexShader: /* glsl */ `
            uniform float uOffset, uTime, uPixelRatio;
            attribute float aSeed;
            varying float vSeed;
            varying float vFade;
            void main() {
                vec3 p = position;
                p.z = mod(p.z + uOffset * (0.4 + aSeed * 0.4) + 320.0, 340.0) - 320.0;
                p.y += sin(uTime * 0.6 + aSeed * 40.0) * 0.6;
                vec4 mv = modelViewMatrix * vec4(p, 1.0);
                gl_Position = projectionMatrix * mv;
                gl_PointSize = (1.2 + aSeed * 2.4) * uPixelRatio * (60.0 / -mv.z);
                vSeed = aSeed;
                vFade = smoothstep(2.0, 12.0, -mv.z) * (1.0 - smoothstep(150.0, 300.0, -mv.z));
            }
        `,
        fragmentShader: /* glsl */ `
            uniform vec3 uA, uB;
            varying float vSeed;
            varying float vFade;
            void main() {
                float d = length(gl_PointCoord - 0.5);
                float a = smoothstep(0.5, 0.0, d) * vFade;
                gl_FragColor = vec4(mix(uA, uB, step(0.5, vSeed)) * 1.6 * a, a);
                #include <tonemapping_fragment>
                #include <colorspace_fragment>
            }
        `
    });
    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;
    return points;
}

// A tinted environment map so the cycles' dark chrome picks up pink and cyan reflections.
function createEnvironment(renderer) {
    const envScene = new THREE.Scene();
    const geometry = new THREE.SphereGeometry(10, 32, 16);
    const colors = [];
    const top = new THREE.Color(PALETTE.purple);
    const horizon = new THREE.Color(PALETTE.hotPink);
    const bottom = new THREE.Color(PALETTE.cyan).multiplyScalar(0.25);
    const color = new THREE.Color();
    const pos = geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i) / 10;
        if (y > 0) color.copy(horizon).lerp(top, Math.min(1, y * 1.6));
        else color.copy(horizon).lerp(bottom, Math.min(1, -y * 3));
        colors.push(color.r, color.g, color.b);
    }
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    envScene.add(new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));

    const pmrem = new THREE.PMREMGenerator(renderer);
    const texture = pmrem.fromScene(envScene, 0.02).texture;
    pmrem.dispose();
    geometry.dispose();
    return texture;
}

// ---------- Light cycles ----------

function glowMaterial(hex, intensity) {
    return new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(intensity) });
}

function createCycleModel(hex) {
    const model = new THREE.Group();

    // Side profile of the body, extruded into a sleek shell that wraps over both wheels
    const shape = new THREE.Shape();
    shape.moveTo(-1.65, 0.3);
    shape.quadraticCurveTo(-1.82, 0.98, -1.12, 1.03);
    shape.lineTo(-0.45, 0.78);
    shape.quadraticCurveTo(0.1, 0.6, 0.55, 0.88);
    shape.quadraticCurveTo(1.55, 1.04, 1.82, 0.42);
    shape.lineTo(1.55, 0.22);
    shape.lineTo(-1.45, 0.22);
    shape.closePath();

    const bodyGeometry = new THREE.ExtrudeGeometry(shape, {
        depth: 0.34,
        bevelEnabled: true,
        bevelThickness: 0.06,
        bevelSize: 0.05,
        bevelSegments: 2,
        curveSegments: 18
    });
    bodyGeometry.translate(0, 0, -0.17);
    bodyGeometry.rotateY(-Math.PI / 2); // profile's +x becomes the model's forward (+z)

    const chrome = new THREE.MeshStandardMaterial({ color: 0x0b0b14, metalness: 0.9, roughness: 0.22, envMapIntensity: 1.3 });
    model.add(new THREE.Mesh(bodyGeometry, chrome));

    const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(bodyGeometry, 28),
        new THREE.LineBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(4) })
    );
    model.add(edges);

    // Glowing seam along each flank
    const seamGeometry = new THREE.BoxGeometry(0.02, 0.04, 2.6);
    for (const side of [-1, 1]) {
        const seam = new THREE.Mesh(seamGeometry, glowMaterial(hex, 5));
        seam.position.set(side * 0.235, 0.5, 0.05);
        model.add(seam);
    }

    // Wheels: dark hubs with glowing rims on both sides
    const wheels = [];
    const hubGeometry = new THREE.CylinderGeometry(0.42, 0.42, 0.3, 32).rotateZ(Math.PI / 2);
    const rimGeometry = new THREE.TorusGeometry(0.43, 0.035, 8, 48).rotateY(Math.PI / 2);
    const innerRimGeometry = new THREE.TorusGeometry(0.24, 0.02, 6, 32).rotateY(Math.PI / 2);
    for (const z of [-1.15, 1.15]) {
        const wheel = new THREE.Group();
        wheel.position.set(0, 0.46, z);
        wheel.add(new THREE.Mesh(hubGeometry, chrome));
        for (const side of [-1, 1]) {
            const rim = new THREE.Mesh(rimGeometry, glowMaterial(hex, 4));
            rim.position.x = side * 0.16;
            wheel.add(rim);
            const inner = new THREE.Mesh(innerRimGeometry, glowMaterial(hex, 2.5));
            inner.position.x = side * 0.16;
            wheel.add(inner);
        }
        model.add(wheel);
        wheels.push(wheel);
    }

    const headlight = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), glowMaterial(0xffffff, 6));
    headlight.position.set(0, 0.5, 1.82);
    model.add(headlight);

    const taillight = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 0.03), glowMaterial(hex, 8));
    taillight.position.set(0, 0.62, -1.75);
    model.add(taillight);

    // Fake light pool on the floor beneath the cycle
    const underglow = new THREE.Mesh(
        new THREE.PlaneGeometry(3.2, 6).rotateX(-Math.PI / 2),
        new THREE.ShaderMaterial({
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            uniforms: { uColor: { value: new THREE.Color(hex) } },
            vertexShader: /* glsl */ `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: /* glsl */ `
                uniform vec3 uColor;
                varying vec2 vUv;
                void main() {
                    vec2 p = (vUv - 0.5) * 2.0;
                    float a = pow(max(0.0, 1.0 - length(p)), 2.0);
                    gl_FragColor = vec4(uColor * a * 0.9, 1.0);
                }
            `
        })
    );
    underglow.position.y = 0.03;
    model.add(underglow);

    model.scale.setScalar(1.35);
    return { model, wheels };
}

// A glowing light wall that follows a cycle's path. Paths are mostly straight
// segments, so only corners are stored and the buffer is updated in place.
class LightTrail {
    constructor(hex, capacity = 48) {
        this.capacity = capacity;
        this.points = [];
        this.positions = new Float32Array(capacity * 2 * 3);
        this.progress = new Float32Array(capacity * 2);

        const vertical = new Float32Array(capacity * 2);
        const indices = [];
        for (let i = 0; i < capacity; i++) {
            vertical[i * 2] = 0;
            vertical[i * 2 + 1] = 1;
            if (i < capacity - 1) {
                const a = i * 2;
                indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
            }
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage));
        geometry.setAttribute('aProgress', new THREE.BufferAttribute(this.progress, 1).setUsage(THREE.DynamicDrawUsage));
        geometry.setAttribute('aVertical', new THREE.BufferAttribute(vertical, 1));
        geometry.setIndex(indices);
        geometry.setDrawRange(0, 0);

        const material = new THREE.ShaderMaterial({
            transparent: true,
            depthWrite: false,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
            uniforms: { uColor: { value: new THREE.Color(hex) } },
            vertexShader: /* glsl */ `
                attribute float aProgress;
                attribute float aVertical;
                varying float vProgress;
                varying float vVertical;
                varying float vNear;
                void main() {
                    vProgress = aProgress;
                    vVertical = aVertical;
                    vec4 mv = modelViewMatrix * vec4(position, 1.0);
                    vNear = smoothstep(5.0, 16.0, -mv.z); // fade out as the wall reaches the camera
                    gl_Position = projectionMatrix * mv;
                }
            `,
            fragmentShader: /* glsl */ `
                uniform vec3 uColor;
                varying float vProgress;
                varying float vVertical;
                varying float vNear;
                void main() {
                    float fade = smoothstep(0.0, 0.7, vProgress) * vNear;
                    float v = clamp(vVertical, 0.0, 1.0);
                    float glow = 0.07 + pow(v, 12.0) * 3.0 + pow(1.0 - v, 6.0) * 0.5;
                    gl_FragColor = vec4(uColor * glow * fade, 1.0);
                }
            `
        });

        this.geometry = geometry;
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.frustumCulled = false;
    }

    start(x, z) {
        this.points = [{ x, z }, { x, z }];
    }

    // Pin the current head as a corner and start a new moving head from it.
    corner(x, z) {
        const head = this.points[this.points.length - 1];
        head.x = x;
        head.z = z;
        this.points.push({ x, z });
        if (this.points.length > this.capacity) this.points.shift();
    }

    update(x, z, gap) {
        const pts = this.points;
        const head = pts[pts.length - 1];
        head.x = x;
        head.z = z;

        // Drop the tail beyond the trail length
        let total = 0;
        for (let i = pts.length - 1; i > 0; i--) {
            const seg = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z);
            if (total + seg >= TRAIL_LENGTH + gap) {
                const t = (TRAIL_LENGTH + gap - total) / seg;
                pts[i - 1].x = pts[i].x + (pts[i - 1].x - pts[i].x) * t;
                pts[i - 1].z = pts[i].z + (pts[i - 1].z - pts[i].z) * t;
                pts.splice(0, i - 1);
                total = TRAIL_LENGTH + gap;
                break;
            }
            total += seg;
        }

        // Build the visible wall, leaving a gap so it starts behind the cycle instead of through it
        const visible = [];
        let fromHead = 0;
        for (let i = pts.length - 1; i >= 0; i--) {
            if (i < pts.length - 1) fromHead += Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].z - pts[i].z);
            if (fromHead < gap) continue;
            if (!visible.length && i < pts.length - 1) {
                // interpolate the exact point where the gap ends
                const a = pts[i + 1];
                const b = pts[i];
                const seg = Math.hypot(a.x - b.x, a.z - b.z) || 1;
                const back = gap - (fromHead - seg);
                visible.push({ x: a.x + (b.x - a.x) * (back / seg), z: a.z + (b.z - a.z) * (back / seg), d: gap });
            }
            visible.push({ x: pts[i].x, z: pts[i].z, d: fromHead });
        }

        const span = Math.max(total - gap, 1e-3);
        const count = Math.min(visible.length, this.capacity);
        for (let i = 0; i < count; i++) {
            const p = visible[i];
            const progress = 1 - (p.d - gap) / span; // 1 at the head, 0 at the tail
            const k = i * 6;
            this.positions[k] = p.x;
            this.positions[k + 1] = 0;
            this.positions[k + 2] = p.z;
            this.positions[k + 3] = p.x;
            this.positions[k + 4] = TRAIL_HEIGHT;
            this.positions[k + 5] = p.z;
            this.progress[i * 2] = progress;
            this.progress[i * 2 + 1] = progress;
        }
        this.geometry.attributes.position.needsUpdate = true;
        this.geometry.attributes.aProgress.needsUpdate = true;
        this.geometry.setDrawRange(0, Math.max(0, count - 1) * 6);
    }
}

const FORWARD = { x: 0, z: -1 };

class LightCycle {
    constructor(hex, laneMin, laneMax, cruiseZ) {
        const { model, wheels } = createCycleModel(hex);
        this.model = model;
        this.model.rotation.order = 'YXZ';
        this.wheels = wheels;
        this.trail = new LightTrail(hex);
        this.laneMin = laneMin;
        this.laneMax = laneMax;
        this.cruiseZ = cruiseZ;
        this.phase = Math.random() * Math.PI * 2;
        this.reset(0);
    }

    reset(offset) {
        this.x = this.pickLane(Infinity);
        this.z = this.cruiseZ - offset;
        this.dir = FORWARD;
        this.targetX = this.x;
        this.timer = 1 + Math.random() * 3;
        this.yaw = Math.PI;
        this.roll = 0;
        this.trail.start(this.x, this.z);
    }

    pickLane(current) {
        const lanes = [];
        for (let x = this.laneMin; x <= this.laneMax; x += 2) {
            if (Math.abs(x - current) >= 4) lanes.push(x);
        }
        return lanes[Math.floor(Math.random() * lanes.length)];
    }

    turn(dir) {
        this.trail.corner(this.x, this.z);
        this.dir = dir;
    }

    update(dt, time, offset) {
        // Hold a cruising distance ahead of the camera by matching the ground speed
        const worldZ = this.z + offset;
        const desiredZ = this.cruiseZ + Math.sin(time * 0.35 + this.phase) * 4;
        let speed = WORLD_SPEED + THREE.MathUtils.clamp((worldZ - desiredZ) * 0.9, -WORLD_SPEED * 0.35, WORLD_SPEED * 0.9);
        if (this.dir !== FORWARD) speed = Math.max(speed, WORLD_SPEED * 1.4);

        this.x += this.dir.x * speed * dt;
        this.z += this.dir.z * speed * dt;

        if (this.dir !== FORWARD) {
            if ((this.targetX - this.x) * this.dir.x <= 0) {
                this.x = this.targetX;
                this.turn(FORWARD);
            }
        } else {
            this.timer -= dt;
            if (this.timer <= 0) {
                this.targetX = this.pickLane(this.x);
                this.turn({ x: Math.sign(this.targetX - this.x), z: 0 });
                this.timer = 2.5 + Math.random() * 4;
            }
        }

        this.trail.update(this.x, this.z, 2.6);

        // Snap-turn with a quick lean, Tron style
        const targetYaw = Math.atan2(this.dir.x, this.dir.z);
        let delta = targetYaw - this.yaw;
        delta = Math.atan2(Math.sin(delta), Math.cos(delta));
        const step = delta * Math.min(1, dt * 16);
        this.yaw += step;
        const targetRoll = THREE.MathUtils.clamp(-step / Math.max(dt, 1e-3) * 0.06, -0.45, 0.45);
        this.roll += (targetRoll - this.roll) * Math.min(1, dt * 10);

        this.model.position.set(this.x, 0, this.z);
        this.model.rotation.set(0, this.yaw, this.roll);
        for (const wheel of this.wheels) wheel.rotation.x += (speed * dt) / (0.44 * 1.35);
    }
}

// ---------- Post-processing ----------

const FinishShader = {
    uniforms: {
        tDiffuse: { value: null },
        uTime: { value: 0 },
        uDim: { value: 1 },
        uResolution: { value: new THREE.Vector2(1, 1) }
    },
    vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: /* glsl */ `
        uniform sampler2D tDiffuse;
        uniform float uTime, uDim;
        uniform vec2 uResolution;
        varying vec2 vUv;
        float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
        void main() {
            vec2 c = vUv - 0.5;
            float d = dot(c, c);

            // Chromatic aberration that grows toward the edges
            vec2 shift = c * d * 0.006;
            vec3 col;
            col.r = texture2D(tDiffuse, vUv + shift).r;
            col.g = texture2D(tDiffuse, vUv).g;
            col.b = texture2D(tDiffuse, vUv - shift).b;

            col *= 1.0 - smoothstep(0.12, 0.55, d) * 0.6;                      // vignette
            col *= 0.97 + 0.03 * sin(vUv.y * uResolution.y * 1.4);             // faint scanlines
            col += (hash(vUv * uResolution + fract(uTime) * 91.0) - 0.5) * 0.025; // film grain
            col *= uDim;
            gl_FragColor = vec4(col, 1.0);
        }
    `
};

// ---------- Main ----------

function init() {
    const canvas = document.getElementById('bg-scene');
    if (!canvas) return;

    let renderer;
    try {
        renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    } catch (error) {
        console.warn('WebGL unavailable, using the CSS background instead.', error);
        canvas.remove();
        return;
    }

    let pixelRatio = Math.min(window.devicePixelRatio, isMobile ? 1.25 : 1.5);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    const scene = new THREE.Scene();
    scene.environment = createEnvironment(renderer);

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1500);
    const cameraBase = new THREE.Vector3(0, 3.4, 14);
    camera.position.copy(cameraBase);

    const sky = createSky();
    const sun = createSun();
    const terrain = createTerrain();
    const dust = createDust();
    scene.add(sky, sun.group, terrain, dust);

    // Everything that rides on the ground lives in this group, which scrolls with the terrain
    const ground = new THREE.Group();
    scene.add(ground);
    const cycles = [
        new LightCycle(PALETTE.cyan, -LANE_HALF_WIDTH, LANE_HALF_WIDTH, -1),
        new LightCycle(PALETTE.hotPink, -LANE_HALF_WIDTH, LANE_HALF_WIDTH, -7),
        new LightCycle(PALETTE.amber, -LANE_HALF_WIDTH, LANE_HALF_WIDTH, -14)
    ];
    for (const cycle of cycles) ground.add(cycle.model, cycle.trail.mesh);

    // Post-processing chain: scene -> bloom -> lens finish -> tone mapping/sRGB
    const target = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, {
        type: THREE.HalfFloatType,
        samples: renderer.capabilities.isWebGL2 ? 4 : 0
    });
    const composer = new EffectComposer(renderer, target);
    composer.setPixelRatio(pixelRatio);
    composer.setSize(window.innerWidth, window.innerHeight);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.9, 0.55, 0.62);
    composer.addPass(bloom);
    const finish = new ShaderPass(FinishShader);
    composer.addPass(finish);
    composer.addPass(new OutputPass());

    const pointer = { x: 0, y: 0 };
    window.addEventListener('pointermove', (event) => {
        pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
        pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
    });

    function resize() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        camera.aspect = w / h;
        // Pull the camera back on narrow screens so the valley still fits
        camera.fov = w / h < 0.8 ? 75 : 60;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
        composer.setSize(w, h);
        finish.uniforms.uResolution.value.set(w * pixelRatio, h * pixelRatio);
        dust.material.uniforms.uPixelRatio.value = pixelRatio;
    }
    window.addEventListener('resize', () => {
        resize();
        if (reducedMotion) render();
    });
    resize();

    let time = 0;
    let offset = 0;
    const lookTarget = new THREE.Vector3();

    function update(dt) {
        time += dt;
        offset += WORLD_SPEED * dt;

        terrain.material.uniforms.uOffset.value = offset;
        terrain.material.uniforms.uTime.value = time;
        dust.material.uniforms.uOffset.value = offset;
        dust.material.uniforms.uTime.value = time;
        sky.material.uniforms.uTime.value = time;
        sun.material.uniforms.uTime.value = time;
        ground.position.z = offset;
        for (const cycle of cycles) cycle.update(dt, time, offset);
    }

    function render() {
        // Dim the scene as the visitor scrolls into the content so text stays readable
        const scroll = Math.min(1, window.scrollY / window.innerHeight);
        finish.uniforms.uDim.value = 1 - scroll * 0.5;
        finish.uniforms.uTime.value = time;

        const ease = reducedMotion ? 1 : 0.04;
        const desiredX = cameraBase.x + pointer.x * 2.5;
        const desiredY = cameraBase.y + pointer.y * 1.0 + scroll * 1.5;
        camera.position.x += (desiredX - camera.position.x) * ease;
        camera.position.y += (desiredY - camera.position.y) * ease;
        sky.position.copy(camera.position);
        lookTarget.set(pointer.x * 4, -11 - scroll * 1.5, -80);
        camera.lookAt(lookTarget);

        composer.render();
    }

    // Simulate a few seconds up front so the cycles already have trails on the first frame
    for (let i = 0; i < 300; i++) update(1 / 60);

    if (reducedMotion) {
        render();
        window.addEventListener('scroll', render, { passive: true });
        return;
    }

    // Adaptive quality: if the first few seconds run slowly, lower resolution, then drop bloom
    let sampleTime = 0;
    let sampleFrames = 0;
    let qualityStep = 0;
    function adaptQuality(dt) {
        sampleTime += dt;
        sampleFrames++;
        if (sampleTime < 2.5) return;
        const fps = sampleFrames / sampleTime;
        sampleTime = 0;
        sampleFrames = 0;
        if (fps >= 45 || qualityStep >= 2) return;
        qualityStep++;
        if (qualityStep === 1) {
            pixelRatio = 1;
            renderer.setPixelRatio(pixelRatio);
            composer.setPixelRatio(pixelRatio);
            resize();
        } else {
            bloom.enabled = false;
        }
    }

    const clock = new THREE.Clock();
    renderer.setAnimationLoop(() => {
        const dt = Math.min(clock.getDelta(), 1 / 20);
        update(dt);
        render();
        adaptQuality(dt);
    });
}

try {
    init();
} catch (error) {
    console.warn('Background scene failed to start, using the CSS background instead.', error);
    document.getElementById('bg-scene')?.remove();
}
