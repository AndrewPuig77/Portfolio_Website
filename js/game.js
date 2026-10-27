// Neon Drift: a trail-racing mini game. Racers move on a grid and leave light trails
// that fade after a few seconds; touching any live trail or the wall is a crash.
(function () {
    'use strict';

    const canvas = document.getElementById('game');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const stage = document.querySelector('.game-stage');
    const overlay = document.querySelector('.game-overlay');
    const shell = document.querySelector('.game-shell');
    const panels = new Map([...document.querySelectorAll('[data-panel]')].map((el) => [el.dataset.panel, el]));

    const hud = {
        score: document.getElementById('hud-score'),
        round: document.getElementById('hud-round'),
        best: document.getElementById('hud-best'),
        boost: document.getElementById('hud-boost'),
        effects: document.getElementById('hud-effects')
    };

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const PLAYER_COLOR = '#00f0ff';
    const CPU_COLORS = ['#ff2bd6', '#ff8a1f', '#9d6bff'];
    const PICKUPS = {
        extend: { color: '#ffe14d', label: 'Extend' },
        shrink: { color: '#39ff8a', label: 'Shrink' },
        charge: { color: '#ffffff', label: 'Charge' }
    };

    const DIFFICULTY = {
        easy: { cpus: 1, lookahead: 45, noise: 4, aggression: 0, pickupPull: 0.4, mistake: 0.05, boost: false },
        normal: { cpus: 2, lookahead: 130, noise: 1.5, aggression: 0.5, pickupPull: 0.8, mistake: 0.015, boost: true },
        hard: { cpus: 3, lookahead: 240, noise: 0.4, aggression: 1.1, pickupPull: 1, mistake: 0, boost: true }
    };

    const TRAIL_SECONDS = 3;
    const TRAIL_FADE_SECONDS = 1.2;   // trails dim during their last moments
    const EXTEND_SECONDS = 2;
    const EFFECT_SECONDS = 7;
    const BOOST_SECONDS = 1;
    const BOOST_COOLDOWN_SECONDS = 4;
    const SHRINK_START_SECONDS = 15;
    const SHRINK_EVERY_SECONDS = 5;
    const PICKUP_EVERY_SECONDS = 5;
    const MAX_PICKUPS = 2;
    const MIN_ARENA = 10;

    const DIRS = {
        up: { x: 0, y: -1 },
        down: { x: 0, y: 1 },
        left: { x: -1, y: 0 },
        right: { x: 1, y: 0 }
    };
    const turnLeft = (d) => ({ x: d.y, y: -d.x });
    const turnRight = (d) => ({ x: -d.y, y: d.x });
    const sameDir = (a, b) => a.x === b.x && a.y === b.y;
    const isReverse = (a, b) => a.x === -b.x && a.y === -b.y;

    const state = {
        mode: 'menu',          // menu | countdown | playing | paused | dying | cleared | over
        demo: true,            // CPUs race behind the menu
        difficulty: 'normal',
        round: 1,
        score: 0,
        cols: 60,
        rows: 38,
        tps: 13,
        tick: 0,
        inset: 0,
        grid: null,            // tick at which each cell's trail expires (0 = empty)
        owner: null,
        racers: [],
        player: null,
        pickups: [],
        particles: [],
        floaters: [],
        nextPickup: 0,
        accumulator: 0,
        shake: 0
    };

    let cell = 10;
    let gridLayer = null;
    let visit, queue, dist, stamp = 0;

    const sec = (s) => Math.round(s * state.tps);

    // ---------- Storage ----------

    function loadBest(difficulty) {
        try {
            return Number(localStorage.getItem(`neonDrift.best.${difficulty}`)) || 0;
        } catch {
            return 0;
        }
    }

    function saveBest(difficulty, value) {
        try {
            localStorage.setItem(`neonDrift.best.${difficulty}`, String(value));
        } catch {
            // storage unavailable (private mode); the best score just won't persist
        }
    }

    // ---------- Layout ----------

    // Leave room for the nav, HUD and control hints so the whole arena fits on screen
    function maxStageHeight() {
        return Math.max(300, window.innerHeight - 245);
    }

    function chooseDims() {
        return stage.clientWidth / maxStageHeight() < 0.9 ? { cols: 30, rows: 42 } : { cols: 60, rows: 38 };
    }

    function resize() {
        cell = Math.max(6, Math.floor(Math.min(stage.clientWidth / state.cols, maxStageHeight() / state.rows)));
        const width = cell * state.cols;
        const height = cell * state.rows;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        stage.style.height = `${height}px`;
        buildGridLayer(width, height, dpr);
    }

    // The floor grid never changes during a round, so draw it once off-screen
    function buildGridLayer(width, height, dpr) {
        gridLayer = document.createElement('canvas');
        gridLayer.width = canvas.width;
        gridLayer.height = canvas.height;
        const g = gridLayer.getContext('2d');
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        const bg = g.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) * 0.7);
        bg.addColorStop(0, '#140726');
        bg.addColorStop(1, '#07020f');
        g.fillStyle = bg;
        g.fillRect(0, 0, width, height);
        for (let x = 0; x <= state.cols; x++) {
            g.strokeStyle = x % 5 === 0 ? 'rgba(255, 43, 214, 0.14)' : 'rgba(255, 43, 214, 0.05)';
            g.beginPath();
            g.moveTo(x * cell + 0.5, 0);
            g.lineTo(x * cell + 0.5, height);
            g.stroke();
        }
        for (let y = 0; y <= state.rows; y++) {
            g.strokeStyle = y % 5 === 0 ? 'rgba(255, 43, 214, 0.14)' : 'rgba(255, 43, 214, 0.05)';
            g.beginPath();
            g.moveTo(0, y * cell + 0.5);
            g.lineTo(width, y * cell + 0.5);
            g.stroke();
        }
    }

    // ---------- Round setup ----------

    function makeRacer(id, spawn, color, isPlayer) {
        return {
            id,
            color,
            isPlayer,
            x: spawn.x,
            y: spawn.y,
            px: spawn.x,
            py: spawn.y,
            dir: spawn.dir,
            turns: [],
            alive: true,
            boostLeft: 0,
            boostCooldown: 0,
            extendUntil: 0,
            shrinkUntil: 0,
            trail: []
        };
    }

    function setupRound(demo) {
        state.demo = demo;
        const dims = chooseDims();
        state.cols = dims.cols;
        state.rows = dims.rows;
        resize();

        state.tps = demo ? 13 : Math.min(19, 12 + state.round);
        const size = state.cols * state.rows;
        state.grid = new Int32Array(size);
        state.owner = new Int8Array(size).fill(-1);
        visit = new Int32Array(size);
        queue = new Int32Array(size);
        dist = new Int32Array(size);
        state.tick = 1;
        state.inset = 0;
        state.pickups = [];
        state.particles = [];
        state.floaters = [];
        state.accumulator = 0;
        state.nextPickup = sec(3);

        const { cols, rows } = state;
        const portrait = rows > cols;
        const spawns = [
            { x: Math.floor(cols * 0.15), y: Math.floor(rows / 2), dir: DIRS.right },
            { x: Math.floor(cols * 0.85), y: Math.floor(rows / 2), dir: DIRS.left },
            { x: Math.floor(cols / 2), y: Math.floor(rows * 0.15), dir: DIRS.down },
            { x: Math.floor(cols / 2), y: Math.floor(rows * 0.85), dir: DIRS.up }
        ];
        if (portrait) spawns.unshift(...spawns.splice(2, 2).reverse());

        const cpuCount = demo ? 3 : DIFFICULTY[state.difficulty].cpus;
        state.racers = [];
        state.player = null;
        let next = 0;
        if (!demo) {
            state.player = makeRacer(0, spawns[next++], PLAYER_COLOR, true);
            state.racers.push(state.player);
        }
        for (let i = 0; i < cpuCount; i++) {
            state.racers.push(makeRacer(state.racers.length, spawns[next++], CPU_COLORS[i], false));
        }
        state.racers.forEach((r) => layTrail(r, r.x, r.y));
    }

    // ---------- Simulation ----------

    const index = (x, y) => y * state.cols + x;

    function inArena(x, y) {
        const i = state.inset;
        return x >= i && y >= i && x < state.cols - i && y < state.rows - i;
    }

    function blocked(x, y, atTick) {
        return !inArena(x, y) || state.grid[index(x, y)] > atTick;
    }

    function trailLife(r) {
        let life = sec(TRAIL_SECONDS);
        if (r.extendUntil > state.tick) life += sec(EXTEND_SECONDS);
        if (state.racers.some((o) => o !== r && o.alive && o.shrinkUntil > state.tick)) life = Math.ceil(life / 2);
        return life;
    }

    function layTrail(r, x, y) {
        const exp = state.tick + trailLife(r);
        const i = index(x, y);
        state.grid[i] = exp;
        state.owner[i] = r.id;
        r.trail.push({ x, y, exp, t: state.tick });
    }

    function maxInset() {
        return Math.max(0, Math.floor((Math.min(state.cols, state.rows) - MIN_ARENA) / 2));
    }

    function ticksUntilShrink() {
        const start = sec(SHRINK_START_SECONDS);
        const every = sec(SHRINK_EVERY_SECONDS);
        if (state.inset >= maxInset()) return Infinity;
        if (state.tick < start) return start - state.tick;
        const since = (state.tick - start) % every;
        return since === 0 ? 0 : every - since;
    }

    function step() {
        state.tick++;
        const t = state.tick;

        if (ticksUntilShrink() === 0) {
            state.inset++;
            for (const r of state.racers) {
                if (r.alive && !inArena(r.x, r.y)) crash(r);
            }
            state.pickups = state.pickups.filter((p) => inArena(p.x, p.y));
        }

        const alive = state.racers.filter((r) => r.alive);
        for (const r of alive) {
            if (r.isPlayer) steerPlayer(r);
            else think(r);
            r.px = r.x;
            r.py = r.y;
            r.moves = r.boostLeft > 0 ? 2 : 1;
        }

        // Boosting racers move twice per tick; resolve each sub-step together so head-ons are fair
        for (let s = 0; s < 2; s++) {
            const movers = state.racers.filter((r) => r.alive && r.moves > s);
            if (!movers.length) break;
            const targets = movers.map((r) => ({ r, x: r.x + r.dir.x, y: r.y + r.dir.y }));
            const crashed = new Set();
            for (const m of targets) {
                if (blocked(m.x, m.y, t)) crashed.add(m.r);
            }
            for (let i = 0; i < targets.length; i++) {
                for (let j = i + 1; j < targets.length; j++) {
                    if (targets[i].x === targets[j].x && targets[i].y === targets[j].y) {
                        crashed.add(targets[i].r);
                        crashed.add(targets[j].r);
                    }
                }
            }
            for (const m of targets) {
                if (crashed.has(m.r)) {
                    crash(m.r);
                    continue;
                }
                m.r.x = m.x;
                m.r.y = m.y;
                layTrail(m.r, m.x, m.y);
                collectPickup(m.r);
            }
        }

        for (const r of state.racers) {
            if (r.boostLeft > 0) r.boostLeft--;
            if (r.boostCooldown > 0) r.boostCooldown--;
            while (r.trail.length && r.trail[0].exp <= t) r.trail.shift();
        }

        if (t >= state.nextPickup) {
            if (state.pickups.length < MAX_PICKUPS) spawnPickup();
            state.nextPickup = t + sec(PICKUP_EVERY_SECONDS);
        }

        if (state.player && state.player.alive) state.score += 10 / state.tps;
        checkRoundEnd();
    }

    function crash(r) {
        if (!r.alive) return;
        r.alive = false;
        burst(r.x, r.y, r.color, reducedMotion ? 10 : 34, 1);
        if (r.isPlayer) {
            if (!reducedMotion) state.shake = 10;
        } else if (state.player && state.player.alive) {
            state.score += 100;
            floater(r.x, r.y, '+100', r.color);
        }
    }

    function tryBoost(r) {
        if (!r || !r.alive || r.boostCooldown > 0) return;
        r.boostLeft = sec(BOOST_SECONDS);
        r.boostCooldown = sec(BOOST_SECONDS + BOOST_COOLDOWN_SECONDS);
    }

    function spawnPickup() {
        const types = Object.keys(PICKUPS);
        for (let attempt = 0; attempt < 40; attempt++) {
            const x = state.inset + 2 + Math.floor(Math.random() * (state.cols - 2 * state.inset - 4));
            const y = state.inset + 2 + Math.floor(Math.random() * (state.rows - 2 * state.inset - 4));
            if (blocked(x, y, state.tick)) continue;
            if (state.pickups.some((p) => p.x === x && p.y === y)) continue;
            if (state.racers.some((r) => r.alive && Math.abs(r.x - x) + Math.abs(r.y - y) < 4)) continue;
            state.pickups.push({ x, y, type: types[Math.floor(Math.random() * types.length)], born: performance.now() });
            return;
        }
    }

    function collectPickup(r) {
        const i = state.pickups.findIndex((p) => p.x === r.x && p.y === r.y);
        if (i < 0) return;
        const pickup = state.pickups.splice(i, 1)[0];
        const t = state.tick;

        if (pickup.type === 'extend') {
            r.extendUntil = t + sec(EFFECT_SECONDS);
        } else if (pickup.type === 'shrink') {
            r.shrinkUntil = t + sec(EFFECT_SECONDS);
            // Cut everyone else's existing trails in half right away
            for (const o of state.racers) {
                if (o === r) continue;
                for (const p of o.trail) {
                    const shortened = t + Math.ceil((p.exp - t) / 2);
                    const cellIndex = index(p.x, p.y);
                    if (state.owner[cellIndex] === o.id && state.grid[cellIndex] === p.exp) state.grid[cellIndex] = shortened;
                    p.exp = shortened;
                }
            }
        } else if (pickup.type === 'charge') {
            r.boostCooldown = 0;
        }

        burst(r.x, r.y, PICKUPS[pickup.type].color, reducedMotion ? 6 : 16, 0.6);
        if (r.isPlayer) floater(r.x, r.y, PICKUPS[pickup.type].label, PICKUPS[pickup.type].color);
    }

    // ---------- Player ----------

    function queueTurn(dir) {
        const r = state.player;
        if (!r || !r.alive) return;
        const last = r.turns.length ? r.turns[r.turns.length - 1] : r.dir;
        if (sameDir(last, dir) || isReverse(last, dir)) return;
        if (r.turns.length < 2) r.turns.push(dir);
    }

    function steerPlayer(r) {
        const next = r.turns.shift();
        if (next && !isReverse(next, r.dir)) r.dir = next;
    }

    // ---------- CPU racers ----------

    // Count reachable cells from (sx, sy), treating trails as passable once they will
    // have faded by the time the racer could get there.
    function openSpace(sx, sy, limit) {
        stamp++;
        const { cols } = state;
        const t = state.tick;
        let head = 0;
        let tail = 0;
        const start = index(sx, sy);
        visit[start] = stamp;
        queue[tail] = start;
        dist[tail++] = 0;
        let count = 0;
        while (head < tail && count < limit) {
            const i = queue[head];
            const d = dist[head++];
            count++;
            const x = i % cols;
            const y = (i - x) / cols;
            for (let k = 0; k < 4; k++) {
                const nx = x + (k === 0 ? 1 : k === 1 ? -1 : 0);
                const ny = y + (k === 2 ? 1 : k === 3 ? -1 : 0);
                if (!inArena(nx, ny)) continue;
                const n = index(nx, ny);
                if (visit[n] === stamp || state.grid[n] > t + d + 1) continue;
                visit[n] = stamp;
                queue[tail] = n;
                dist[tail++] = d + 1;
            }
        }
        return count;
    }

    function clearAhead(r, cells) {
        for (let i = 1; i <= cells; i++) {
            if (blocked(r.x + r.dir.x * i, r.y + r.dir.y * i, state.tick + i)) return false;
        }
        return true;
    }

    function think(r) {
        const ai = state.demo ? DIFFICULTY.normal : DIFFICULTY[state.difficulty];
        const options = [r.dir, turnLeft(r.dir), turnRight(r.dir)];
        const target = state.player && state.player.alive ? state.player : null;
        let best = null;
        let bestScore = -Infinity;
        const safe = [];

        for (const d of options) {
            const nx = r.x + d.x;
            const ny = r.y + d.y;
            if (blocked(nx, ny, state.tick)) continue;
            safe.push(d);
            let score = openSpace(nx, ny, ai.lookahead) * 3;
            if (d === r.dir) score += 2;
            for (const o of state.racers) {
                if (o !== r && o.alive && o.x + o.dir.x === nx && o.y + o.dir.y === ny) score -= 60;
            }
            if (state.pickups.length) {
                const nearest = Math.min(...state.pickups.map((p) => Math.abs(p.x - nx) + Math.abs(p.y - ny)));
                score -= ai.pickupPull * nearest;
            }
            if (target && ai.aggression) {
                const tx = target.x + target.dir.x * 5;
                const ty = target.y + target.dir.y * 5;
                score -= ai.aggression * (Math.abs(tx - nx) + Math.abs(ty - ny));
            }
            score += (Math.random() - 0.5) * 2 * ai.noise;
            if (score > bestScore) {
                bestScore = score;
                best = d;
            }
        }

        if (safe.length > 1 && Math.random() < ai.mistake) best = safe[Math.floor(Math.random() * safe.length)];
        if (best) r.dir = best;

        if (ai.boost && target && r.boostCooldown === 0) {
            const near = Math.abs(target.x - r.x) + Math.abs(target.y - r.y) < 14;
            if (near && clearAhead(r, 8) && Math.random() < 0.15) tryBoost(r);
        }
    }

    // ---------- Round flow ----------

    function checkRoundEnd() {
        if (state.demo) {
            if (state.racers.filter((r) => r.alive).length <= 1) {
                state.mode = 'demo-end';
                setTimeout(() => {
                    if (state.mode === 'demo-end') startDemo();
                }, 1500);
            }
            return;
        }
        if (!state.player.alive) {
            state.mode = 'dying';
            setTimeout(gameOver, 1100);
            return;
        }
        if (state.racers.every((r) => r.isPlayer || !r.alive)) {
            state.mode = 'cleared';
            state.score += 250;
            document.getElementById('cleared-title').textContent = `Round ${state.round} cleared`;
            showPanel('cleared');
            setTimeout(() => {
                if (state.mode !== 'cleared') return;
                state.round++;
                beginRound();
            }, 1800);
        }
    }

    function startDemo() {
        setupRound(true);
        state.mode = 'menu';
    }

    function startGame() {
        state.round = 1;
        state.score = 0;
        shell.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
        beginRound();
    }

    function beginRound() {
        setupRound(false);
        state.mode = 'countdown';
        showPanel('countdown');
        const label = document.getElementById('countdown');
        let n = 3;
        label.textContent = n;
        const timer = setInterval(() => {
            if (state.mode !== 'countdown') {
                clearInterval(timer);
                return;
            }
            n--;
            if (n > 0) {
                label.textContent = n;
            } else if (n === 0) {
                label.textContent = 'GO';
            } else {
                clearInterval(timer);
                state.mode = 'playing';
                showPanel(null);
            }
        }, 600);
    }

    function gameOver() {
        if (state.mode !== 'dying') return;
        state.mode = 'over';
        const score = Math.floor(state.score);
        const previousBest = loadBest(state.difficulty);
        const isBest = score > previousBest;
        if (isBest) saveBest(state.difficulty, score);
        document.getElementById('over-score').textContent = score.toLocaleString();
        document.getElementById('over-detail').textContent = isBest
            ? `New best on ${state.difficulty}!`
            : `Reached round ${state.round}. Best on ${state.difficulty}: ${previousBest.toLocaleString()}`;
        showPanel('over');
    }

    function pause() {
        if (state.mode !== 'playing') return;
        state.mode = 'paused';
        showPanel('paused');
    }

    function resume() {
        if (state.mode !== 'paused') return;
        state.mode = 'playing';
        showPanel(null);
    }

    function toMenu() {
        showPanel('menu');
        startDemo();
    }

    function showPanel(name) {
        overlay.hidden = !name;
        panels.forEach((el, key) => {
            el.hidden = key !== name;
        });
        if (name === 'menu') updateMenu();
        const focusTarget = name && panels.get(name).querySelector('[data-action]');
        if (focusTarget) focusTarget.focus({ preventScroll: true });
    }

    function updateMenu() {
        document.querySelectorAll('[data-difficulty]').forEach((button) => {
            button.setAttribute('aria-pressed', String(button.dataset.difficulty === state.difficulty));
        });
        const cpus = DIFFICULTY[state.difficulty].cpus;
        document.getElementById('menu-note').textContent =
            `${cpus} CPU racer${cpus > 1 ? 's' : ''} · best ${loadBest(state.difficulty).toLocaleString()}`;
    }

    // ---------- Effects ----------

    function burst(x, y, color, count, power) {
        const cx = (x + 0.5) * cell;
        const cy = (y + 0.5) * cell;
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = (60 + Math.random() * 220) * power;
            state.particles.push({
                x: cx,
                y: cy,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 0.5 + Math.random() * 0.6,
                color
            });
        }
    }

    function floater(x, y, text, color) {
        state.floaters.push({ x: (x + 0.5) * cell, y: (y + 0.5) * cell, text, color, life: 1 });
    }

    // ---------- Rendering ----------

    function center(v) {
        return (v + 0.5) * cell;
    }

    function render(now, frac) {
        const width = state.cols * cell;
        const height = state.rows * cell;
        const tf = state.tick + frac;

        ctx.save();
        if (state.shake > 0) ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
        ctx.drawImage(gridLayer, 0, 0, width, height);

        drawArenaEdge(now, width, height);
        drawPickups(now);

        ctx.globalCompositeOperation = 'lighter';
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        const fadeTicks = sec(TRAIL_FADE_SECONDS);
        for (const r of state.racers) drawTrail(r, tf, frac, fadeTicks);
        for (const r of state.racers) {
            if (r.alive) drawRacer(r, frac);
        }
        drawParticles();
        ctx.globalCompositeOperation = 'source-over';
        drawFloaters();
        ctx.restore();
    }

    function drawArenaEdge(now, width, height) {
        const i = state.inset * cell;
        if (state.inset > 0) {
            ctx.fillStyle = 'rgba(255, 0, 90, 0.12)';
            ctx.fillRect(0, 0, width, i);
            ctx.fillRect(0, height - i, width, i);
            ctx.fillRect(0, i, i, height - 2 * i);
            ctx.fillRect(width - i, i, i, height - 2 * i);
        }

        // Flash the ring that is about to close
        const warning = !state.demo && state.mode === 'playing' && ticksUntilShrink() <= sec(1.2);
        if (warning && Math.floor(now / 150) % 2 === 0) {
            ctx.fillStyle = 'rgba(255, 40, 90, 0.35)';
            const w = width - 2 * i;
            const h = height - 2 * i;
            ctx.fillRect(i, i, w, cell);
            ctx.fillRect(i, height - i - cell, w, cell);
            ctx.fillRect(i, i + cell, cell, h - 2 * cell);
            ctx.fillRect(width - i - cell, i + cell, cell, h - 2 * cell);
        }

        ctx.save();
        ctx.strokeStyle = warning ? '#ff2a5f' : '#ff2bd6';
        ctx.lineWidth = 2;
        ctx.shadowColor = ctx.strokeStyle;
        ctx.shadowBlur = 14;
        ctx.strokeRect(i + 1, i + 1, width - 2 * i - 2, height - 2 * i - 2);
        ctx.restore();
    }

    function drawPickups(now) {
        for (const p of state.pickups) {
            const cx = center(p.x);
            const cy = center(p.y);
            const pulse = 1 + Math.sin((now - p.born) / 180) * 0.15;
            const size = cell * 0.55 * pulse;
            const { color } = PICKUPS[p.type];
            ctx.save();
            ctx.shadowColor = color;
            ctx.shadowBlur = 16;
            ctx.fillStyle = color;
            ctx.strokeStyle = color;
            ctx.translate(cx, cy);
            if (p.type === 'extend') {
                ctx.beginPath();
                ctx.moveTo(0, -size);
                ctx.lineTo(size, 0);
                ctx.lineTo(0, size);
                ctx.lineTo(-size, 0);
                ctx.closePath();
                ctx.fill();
            } else if (p.type === 'shrink') {
                ctx.lineWidth = Math.max(2, cell * 0.14);
                ctx.beginPath();
                ctx.arc(0, 0, size * 0.85, 0, Math.PI * 2);
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(0, 0, size * 0.3, 0, Math.PI * 2);
                ctx.fill();
            } else {
                const s = size / 10;
                ctx.beginPath();
                ctx.moveTo(1 * s, -10 * s);
                ctx.lineTo(-8 * s, 2 * s);
                ctx.lineTo(-1 * s, 2 * s);
                ctx.lineTo(-2 * s, 10 * s);
                ctx.lineTo(7 * s, -2 * s);
                ctx.lineTo(0, -2 * s);
                ctx.closePath();
                ctx.fill();
            }
            ctx.restore();
        }
    }

    function headPosition(r, frac) {
        return {
            x: center(r.px + (r.x - r.px) * frac),
            y: center(r.py + (r.y - r.py) * frac)
        };
    }

    // Stroke a run of connected points as one path (a soft wide glow, then a bright core)
    // so the joints between cells don't overlap and bead up under additive blending.
    function strokeRun(run, color, alpha) {
        if (run.length < 2) return;
        ctx.strokeStyle = color;
        for (const [width, a] of [[cell * 0.9, alpha * 0.2], [Math.max(2, cell * 0.32), alpha]]) {
            ctx.globalAlpha = a;
            ctx.lineWidth = width;
            ctx.beginPath();
            ctx.moveTo(run[0].x, run[0].y);
            for (let i = 1; i < run.length; i++) ctx.lineTo(run[i].x, run[i].y);
            ctx.stroke();
        }
    }

    function drawTrail(r, tf, frac, fadeTicks) {
        const pts = r.trail;
        const moving = r.alive && (state.mode === 'playing' || state.mode === 'menu');
        ctx.lineCap = 'butt';

        // Group segments into runs that share a (rounded) fade level
        let run = [];
        let runAlpha = -1;
        const flush = () => {
            strokeRun(run, r.color, runAlpha);
            run = [];
        };
        const addSegment = (ax, ay, bx, by, alpha) => {
            const level = Math.ceil(alpha * 10) / 10;
            const last = run[run.length - 1];
            if (level !== runAlpha || !last || last.x !== ax || last.y !== ay) {
                flush();
                runAlpha = level;
                run.push({ x: ax, y: ay });
            }
            run.push({ x: bx, y: by });
        };

        for (let i = 1; i < pts.length; i++) {
            const a = pts[i - 1];
            const b = pts[i];
            // Segments laid this tick are drawn up to the interpolated head instead
            if (moving && b.t >= state.tick) continue;
            if (Math.abs(a.x - b.x) + Math.abs(a.y - b.y) !== 1) continue;
            const alpha = Math.min(1, Math.max(0, (a.exp - tf) / fadeTicks));
            if (alpha <= 0) continue;
            addSegment(center(a.x), center(a.y), center(b.x), center(b.y), alpha);
        }
        if (moving) {
            const head = headPosition(r, frac);
            addSegment(center(r.px), center(r.py), head.x, head.y, 1);
        }
        flush();
        ctx.globalAlpha = 1;
        ctx.lineCap = 'round';
    }

    function drawRacer(r, frac) {
        const moving = state.mode === 'playing' || state.mode === 'menu';
        const head = moving ? headPosition(r, frac) : { x: center(r.x), y: center(r.y) };
        const angle = Math.atan2(r.dir.y, r.dir.x);
        const len = cell * 1.25;
        const wid = cell * 0.62;
        ctx.save();
        ctx.translate(head.x, head.y);
        ctx.rotate(angle);
        ctx.shadowColor = r.color;
        ctx.shadowBlur = r.boostLeft > 0 ? 28 : 16;
        ctx.fillStyle = r.color;
        ctx.beginPath();
        ctx.moveTo(len * 0.55, 0);
        ctx.lineTo(len * 0.15, -wid / 2);
        ctx.lineTo(-len * 0.45, -wid / 2);
        ctx.lineTo(-len * 0.45, wid / 2);
        ctx.lineTo(len * 0.15, wid / 2);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-len * 0.2, -wid * 0.18, len * 0.45, wid * 0.36);
        ctx.restore();
    }

    function drawParticles() {
        for (const p of state.particles) {
            ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 1.6));
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
        }
        ctx.globalAlpha = 1;
    }

    function drawFloaters() {
        ctx.font = `700 ${Math.max(12, cell * 0.9)}px Orbitron, sans-serif`;
        ctx.textAlign = 'center';
        for (const f of state.floaters) {
            ctx.globalAlpha = Math.max(0, f.life);
            ctx.fillStyle = f.color;
            ctx.shadowColor = f.color;
            ctx.shadowBlur = 10;
            ctx.fillText(f.text, f.x, f.y - (1 - f.life) * cell * 2.5);
        }
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
    }

    function updateEffects(dt) {
        for (const p of state.particles) {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vx *= 0.94;
            p.vy *= 0.94;
            p.life -= dt;
        }
        state.particles = state.particles.filter((p) => p.life > 0);
        for (const f of state.floaters) f.life -= dt * 0.9;
        state.floaters = state.floaters.filter((f) => f.life > 0);
        state.shake = Math.max(0, state.shake - dt * 30);
    }

    // ---------- HUD ----------

    const hudCache = {};
    function setText(key, el, value) {
        if (hudCache[key] === value) return;
        hudCache[key] = value;
        el.textContent = value;
    }

    function updateHud() {
        const p = state.player;
        setText('score', hud.score, Math.floor(state.demo ? 0 : state.score).toLocaleString());
        setText('round', hud.round, String(state.demo ? 1 : state.round));
        setText('best', hud.best, loadBestCached().toLocaleString());

        let charge = 1;
        if (p && p.boostLeft > 0) charge = 0;
        else if (p && p.boostCooldown > 0) charge = 1 - p.boostCooldown / sec(BOOST_COOLDOWN_SECONDS);
        const width = `${Math.round(Math.max(0, Math.min(1, charge)) * 100)}%`;
        if (hudCache.boost !== width) {
            hudCache.boost = width;
            hud.boost.style.width = width;
            hud.boost.parentElement.classList.toggle('is-ready', charge >= 1);
        }

        const effects = [];
        if (p && p.alive) {
            if (p.extendUntil > state.tick) effects.push(['extend', Math.ceil((p.extendUntil - state.tick) / state.tps)]);
            if (p.shrinkUntil > state.tick) effects.push(['shrink', Math.ceil((p.shrinkUntil - state.tick) / state.tps)]);
        }
        const key = effects.map((e) => e.join(':')).join('|');
        if (hudCache.effects !== key) {
            hudCache.effects = key;
            hud.effects.innerHTML = effects
                .map(([type, s]) => `<span class="effect-badge" style="--c: ${PICKUPS[type].color}">${PICKUPS[type].label} ${s}s</span>`)
                .join('');
        }
    }

    let bestCache = { difficulty: null, value: 0, mode: null };
    function loadBestCached() {
        if (bestCache.difficulty !== state.difficulty || bestCache.mode !== state.mode) {
            bestCache = { difficulty: state.difficulty, value: loadBest(state.difficulty), mode: state.mode };
        }
        return bestCache.value;
    }

    // ---------- Main loop ----------

    let last = performance.now();
    function frame(now) {
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;

        const running = state.mode === 'playing' || state.mode === 'menu';
        const tickMs = 1000 / state.tps;
        if (running) {
            state.accumulator += dt * 1000;
            while (state.accumulator >= tickMs && (state.mode === 'playing' || state.mode === 'menu')) {
                state.accumulator -= tickMs;
                step();
            }
        }
        const frac = running ? Math.min(1, state.accumulator / tickMs) : 1;

        updateEffects(dt);
        render(now, frac);
        updateHud();
        requestAnimationFrame(frame);
    }

    // ---------- Input ----------

    const KEY_DIRS = {
        ArrowUp: 'up', w: 'up', W: 'up',
        ArrowDown: 'down', s: 'down', S: 'down',
        ArrowLeft: 'left', a: 'left', A: 'left',
        ArrowRight: 'right', d: 'right', D: 'right'
    };

    window.addEventListener('keydown', (event) => {
        if (event.target.closest && event.target.closest('input, textarea')) return;
        const active = ['countdown', 'playing', 'paused', 'dying', 'cleared'].includes(state.mode);
        const dirName = KEY_DIRS[event.key];

        if (dirName) {
            if (active) event.preventDefault();
            if (state.mode === 'playing' || state.mode === 'countdown') queueTurn(DIRS[dirName]);
        } else if (event.key === ' ' || event.key === 'Shift') {
            if (active) event.preventDefault();
            if (state.mode === 'playing') tryBoost(state.player);
        } else if (event.key === 'p' || event.key === 'P' || event.key === 'Escape') {
            if (state.mode === 'playing') pause();
            else if (state.mode === 'paused') resume();
        } else if (event.key === 'Enter') {
            if (state.mode === 'menu' || state.mode === 'demo-end' || state.mode === 'over') {
                event.preventDefault();
                startGame();
            }
        }
    });

    // Swipe to steer, tap to boost
    let touchStart = null;
    stage.addEventListener('touchstart', (event) => {
        if (overlay.hidden === false && state.mode !== 'countdown') return;
        const t = event.changedTouches[0];
        touchStart = { x: t.clientX, y: t.clientY };
    }, { passive: true });

    stage.addEventListener('touchend', (event) => {
        if (!touchStart) return;
        const t = event.changedTouches[0];
        const dx = t.clientX - touchStart.x;
        const dy = t.clientY - touchStart.y;
        touchStart = null;
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) {
            if (state.mode === 'playing') tryBoost(state.player);
            return;
        }
        const dirName = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
        queueTurn(DIRS[dirName]);
    });

    document.addEventListener('click', (event) => {
        const button = event.target.closest('[data-action], [data-difficulty]');
        if (!button) return;
        if (button.dataset.difficulty) {
            state.difficulty = button.dataset.difficulty;
            updateMenu();
            return;
        }
        switch (button.dataset.action) {
            case 'start': startGame(); break;
            case 'resume': resume(); break;
            case 'menu': toMenu(); break;
            case 'pause': state.mode === 'paused' ? resume() : pause(); break;
            case 'boost': tryBoost(state.player); break;
        }
    });

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) pause();
    });

    window.addEventListener('resize', () => {
        resize();
    });

    // ---------- Start ----------

    startDemo();
    showPanel('menu');
    requestAnimationFrame(frame);
})();
