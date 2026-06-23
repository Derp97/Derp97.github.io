(() => {
  'use strict';

  const canvas = document.getElementById('gridCanvas');
  const ctx = canvas.getContext('2d', { alpha: false });

  const ui = {
    connectPanel: document.getElementById('connectPanel'),
    connectButton: document.getElementById('connectButton'),
    interactionPanel: document.getElementById('interactionPanel'),
    dataStreamPanel: document.getElementById('dataStreamPanel'),
    coreStatusPanel: document.getElementById('coreStatusPanel'),
    phasePanel: document.getElementById('phasePanel'),    
    phaseLabel: document.getElementById('phaseLabel'),
    soundButton: document.getElementById('soundButton'),
    gameOverlay: document.getElementById('gameOverlay'),
    gameTitle: document.getElementById('gameTitle'),
    gameMessage: document.getElementById('gameMessage'),
    startGameButton: document.getElementById('startGameButton'),
    returnCoreButton: document.getElementById('returnCoreButton'),
    gameHud: document.getElementById('gameHud'),
    timeValue: document.getElementById('timeValue'),
    bestValue: document.getElementById('bestValue'),
    stabilityValue: document.getElementById('stabilityValue'),
    stabilityMeter: document.getElementById('stabilityMeter'),
    energyValue: document.getElementById('energyValue'),
    energyMeter: document.getElementById('energyMeter'),
    stateValue: document.getElementById('stateValue'),
    packetA: document.getElementById('packetA'),
    packetB: document.getElementById('packetB'),
    packetC: document.getElementById('packetC')
  };

  const TAU = Math.PI * 2;
  const rand = (min, max) => min + Math.random() * (max - min);
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const lerp = (a, b, t) => a + (b - a) * t;

  const AUDIO_TRACKS = {
    core: 'assets/audio/End-of-Line-Ambient.mp3',
    tunnel: 'assets/audio/The-Grid-Tunnel.mp3',
    arena: 'assets/audio/Europe-The-Final-Countdown-Azept-Hardstyle-Bootleg-Lightcycle.mp3'
  };

  const AUDIO_VOLUME = {
    core: 0.35,
    tunnel: 0.45,
    arena: 0.4
  };

  const TUNNEL_DURATION = 45;

  const state = {
    width: 0,
    height: 0,
    dpr: 1,
    mode: 'core',
    time: 0,
    lastTime: performance.now(),
    mouse: { x: 0, y: 0, nx: 0, ny: 0, active: false },
    corePulseSpeed: 3.2,
    corePulseDepth: 8,
    tunnelProgress: 0,
    tunnelSpeed: 0,
    audio: null,
    soundOn: false,
    currentAudioTrack: 'core',
    particles: [],
    packets: [],
    stars: [],
    energyRisers: [],
    cityLights: [],
    game: null,
    pulseRings: [],
    recognizers: [],
    hudTimer: 0,
    tunnelFlybys: [],
    tunnelLastPhase: -1,
  };

  function resize() {
    state.dpr = Math.min(window.devicePixelRatio || 1, 1.25);
    state.width = window.innerWidth;
    state.height = window.innerHeight;
    canvas.width = Math.floor(state.width * state.dpr);
    canvas.height = Math.floor(state.height * state.dpr);
    canvas.style.width = `${state.width}px`;
    canvas.style.height = `${state.height}px`;
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    rebuildVisuals();
    if (state.game) resetGameGeometry();
  }

  function rebuildVisuals() {
    state.particles = Array.from({ length: 45 }, () => ({
      angle: rand(0, TAU),
      radius: rand(40, Math.min(state.width, state.height) * 0.25),
      speed: rand(0.08, 0.45) * (Math.random() < 0.5 ? -1 : 1),
      size: rand(0.8, 2.6),
      alpha: rand(0.18, 0.65)
    }));

    state.energyRisers = Array.from({ length: 50 }, () => ({
      xOffset: rand(-26, 26),
      y: rand(0, 1),
      speed: rand(0.16, 0.8),
      length: rand(14, 70),
      alpha: rand(0.18, 0.78),
      width: rand(0.7, 2.2)
    }));

    state.packets = Array.from({ length: 32 }, () => ({
      lane: Math.floor(rand(-12, 13)),
      z: rand(0, 1),
      speed: rand(0.045, 0.15),
      size: rand(2, 7)
    }));

    state.stars = Array.from({ length: 100 }, () => ({
      x: rand(0, state.width),
      y: rand(0, state.height),
      speed: rand(0.05, 0.75),
      alpha: rand(0.08, 0.58)
    }));

    state.coreLinePackets = Array.from({ length: 8 }, (_, i) => ({
      offset: i / 4 ,
      direction: i % 2 === 0 ? 1 : -1
    })),

    state.cityLights = Array.from({ length: 80 }, () => ({
      x: rand(0, state.width),
      y: rand(state.height * 0.43, state.height * 0.72),
      w: rand(1, 5),
      alpha: rand(0.08, 0.45),
      flicker: rand(0.5, 3.0)
    }));
  }

  function setMouse(clientX, clientY) {
    state.mouse.x = clientX;
    state.mouse.y = clientY;
    state.mouse.nx = (clientX / state.width - 0.5) * 2;
    state.mouse.ny = (clientY / state.height - 0.5) * 2;
    state.mouse.active = true;
  }

  window.addEventListener('resize', resize);
  window.addEventListener('pointermove', (event) => setMouse(event.clientX, event.clientY));

  function fadeAudio(audio, targetVolume, duration = 1000, onComplete = null) {
    if (!audio) return;

    const startVolume = audio.volume;
    const startTime = performance.now();

    function update(now) {
      const progress = Math.min((now - startTime) / duration, 1);
      audio.volume = startVolume + (targetVolume - startVolume) * progress;

      if (progress < 1) {
        requestAnimationFrame(update);
      } else if (typeof onComplete === 'function') {
        onComplete();
      }
    }

    requestAnimationFrame(update);
  }

  function initAudio() {
    if (state.audio) return;

    state.audio = Object.fromEntries(
      Object.entries(AUDIO_TRACKS).map(([trackName, src]) => {
        const audio = new Audio(src);
        audio.loop = true;
        audio.preload = 'auto';
        audio.volume = 0;
        return [trackName, audio];
      })
    );
  }

  function setAudioTrack(trackName, fadeDuration = 1000) {
    initAudio();

    if (!state.audio[trackName]) {
      console.warn(`Audio track "${trackName}" has not been configured.`);
      return;
    }

    if (state.currentAudioTrack === trackName) return;

    const previousTrackName = state.currentAudioTrack;
    const previousAudio = state.audio[previousTrackName];
    const nextAudio = state.audio[trackName];

    state.currentAudioTrack = trackName;

    if (!state.soundOn) return;

    if (previousAudio) {
      fadeAudio(previousAudio, 0, fadeDuration, () => {
        if (state.currentAudioTrack !== previousTrackName) {
          previousAudio.pause();
          previousAudio.currentTime = 0;
        }
      });
    }

    nextAudio.volume = 0;
    nextAudio.currentTime = 0;
    nextAudio.play().catch((error) => {
      console.warn('Audio playback was blocked or failed:', error);
    });

    fadeAudio(nextAudio, AUDIO_VOLUME[trackName] ?? 0.4, fadeDuration);
  }

  function toggleSound() {
    initAudio();

    state.soundOn = !state.soundOn;
    const activeAudio = state.audio[state.currentAudioTrack];

    if (state.soundOn) {
      activeAudio.volume = 0;
      activeAudio.play().catch((error) => {
        console.warn('Audio playback was blocked or failed:', error);
      });
      fadeAudio(activeAudio, AUDIO_VOLUME[state.currentAudioTrack] ?? 0.4, 1500);
    } else {
      for (const audio of Object.values(state.audio)) {
        fadeAudio(audio, 0, 1000, () => {
          if (!state.soundOn) {
            audio.pause();
            audio.currentTime = 0;
          }
        });
      }
    }

    ui.soundButton.textContent = `Ambient Sound: ${state.soundOn ? 'On' : 'Off'}`;
  }

  ui.soundButton.addEventListener('click', toggleSound);

  function updateTunnelEvents() {
    const progress = clamp(state.tunnelProgress / 1.05, 0, 1);
    const phase = Math.floor(progress * 10);

    if (phase !== state.tunnelLastPhase) {
      state.tunnelLastPhase = phase;

      if (phase === 1 || phase === 3 || phase === 5 || phase === 7) {
        spawnTunnelFlyby(phase);
      }
    }

    state.tunnelFlybys = state.tunnelFlybys.filter((item) => {
      item.age += 0.016;
      return item.age < item.life;
    });
  }

  function spawnTunnelFlyby(phase) {
    const count = phase >= 5 ? 3 : 2;

    for (let i = 0; i < count; i++) {
      state.tunnelFlybys.push({
        age: 0,
        life: rand(0.8, 1.4),
        side: Math.random() < 0.5 ? -1 : 1,
        yOffset: rand(-0.35, 0.35),
        speed: rand(1.0, 1.8),
        size: rand(0.5, 1.2),
        delay: i * rand(0.08, 0.18),
        kind: Math.random() < 0.5 ? 'glyph' : 'panel'
      });
    }
  }

  function drawTunnelSyncOverlay() {
    const progress = clamp(state.tunnelProgress / 1.05, 0, 1);
    const jitter = Math.sin(state.time * 32) * 0.006 + rand(-0.004, 0.004);
    const shownProgress = clamp(progress + jitter, 0, 1);
    const percent = Math.floor(shownProgress * 100);

    const w = Math.min(520, state.width * 0.62);
    const h = 10;
    const x = state.width / 2 - w / 2;
    const y = state.height * 0.84;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    ctx.strokeStyle = 'rgba(0, 212, 255, 0.45)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);

    ctx.fillStyle = 'rgba(0, 212, 255, 0.28)';
    ctx.fillRect(x, y, w * shownProgress, h);

    ctx.fillStyle = 'rgba(215, 248, 255, 0.9)';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`SYNCHRONIZATION ${percent}%`, state.width / 2, y - 12);

    ctx.restore();
  }

  function drawTunnelFlybys(cx, cy) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    for (const item of state.tunnelFlybys) {
      const localAge = item.age - item.delay;
      if (localAge < 0) continue;

      const t = clamp(localAge / item.life, 0, 1);
      const depth = Math.pow(t, 0.45);

      const x = cx + item.side * lerp(state.width * 0.08, state.width * 0.62, depth);
      const y = cy + item.yOffset * state.height + Math.sin(t * TAU) * 20;
      const s = lerp(0.2, 2.2, depth) * item.size;
      const alpha = (1 - t) * 0.8;

      ctx.save();
      ctx.translate(x, y);
      ctx.scale(s, s);
      ctx.rotate(item.side * 0.15);

      if (item.kind === 'panel') {
        ctx.strokeStyle = `rgba(0, 212, 255, ${alpha})`;
        ctx.lineWidth = 2;
        ctx.strokeRect(-28, -14, 56, 28);

        ctx.beginPath();
        ctx.moveTo(-20, -4);
        ctx.lineTo(18, -4);
        ctx.moveTo(-20, 5);
        ctx.lineTo(10, 5);
        ctx.stroke();
      } else {
        ctx.strokeStyle = `rgba(125, 249, 255, ${alpha})`;
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.moveTo(0, -24);
        ctx.lineTo(18, 0);
        ctx.lineTo(0, 24);
        ctx.lineTo(-18, 0);
        ctx.closePath();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(-8, 0);
        ctx.lineTo(8, 0);
        ctx.stroke();
      }

      ctx.restore();
    }

    ctx.restore();
  }

  function startConnection() {
    if (state.mode !== 'core') return;

    setAudioTrack('tunnel', 800);
    state.mode = 'connecting';
    state.tunnelFlybys = [];
    state.tunnelLastPhase = -1;
    state.tunnelProgress = 0;
    state.tunnelSpeed = 0;
    ui.connectButton.disabled = true;
    ui.phaseLabel.textContent = 'ESTABLISHING NEURAL LINK...';
    ui.connectPanel.classList.remove('faded');

    setTimeout(() => {
      if (state.mode === 'connecting') {
        ui.phaseLabel.textContent = 'SYNCHRONISING IDENTITY SIGNATURE...';
      }
    }, 900);

    setTimeout(() => {
      if (state.mode === 'connecting') {
        ui.phaseLabel.textContent = 'ROUTING TO LIGHTCYCLE GRID...';
      }
    }, 1900);

    setTimeout(() => {
      if (state.mode === 'connecting') {
        state.mode = 'tunnel';
        // setAudioTrack('tunnel', 1200);
        ui.connectPanel.classList.add('faded');
      }
    }, 2850);
  }

  ui.connectButton.addEventListener('click', startConnection);

  function returnToCore() {
    setAudioTrack('core', 1200);
    state.mode = 'core';
    state.tunnelProgress = 0;
    state.tunnelSpeed = 0;
    state.game = null;
    ui.connectButton.disabled = false;
    ui.phaseLabel.textContent = 'GRID STATUS: STABLE';
    ui.connectPanel.classList.remove('hidden', 'faded');
    ui.gameOverlay.classList.add('hidden');
    ui.gameHud.classList.add('hidden');
    ui.phasePanel.classList.remove('hidden');
    ui.interactionPanel.classList.remove('hidden');
    ui.dataStreamPanel.classList.remove('hidden');
    ui.coreStatusPanel.classList.remove('hidden');
  }

  ui.returnCoreButton.addEventListener('click', returnToCore);

  function revealGameIntro() {
    setAudioTrack('arena', 1200);
    state.mode = 'gameIntro';
    ui.gameOverlay.classList.remove('hidden');
    ui.gameHud.classList.add('hidden');
    ui.gameTitle.textContent = 'Lightcycle Arena';
    ui.gameMessage.textContent = 'Avoid walls, trails, and enemy riders. Use WASD or arrow keys to turn.';
    ui.startGameButton.textContent = 'Start Run';
    ui.connectPanel.classList.add('hidden');
    ui.bestValue.textContent = getBestTime().toFixed(1);
  }

  ui.startGameButton.addEventListener('click', () => {
    setAudioTrack('arena', 600);
    initGame();
    state.mode = 'game';

    ui.gameOverlay.classList.add('hidden');
    ui.gameHud.classList.add('hidden');
    ui.phasePanel.classList.add('hidden');
    ui.interactionPanel.classList.add('hidden');
    ui.dataStreamPanel.classList.add('hidden');
    ui.coreStatusPanel.classList.add('hidden');
    ui.connectPanel.classList.add('hidden');
  });

  window.addEventListener('keydown', (event) => {
    if (state.mode !== 'game' || !state.game || state.game.over) return;

    const key = event.key.toLowerCase();
    const player = state.game.riders[0];

    if ((key === 'arrowup' || key === 'w') && player.dir.y !== 1) player.nextDir = { x: 0, y: -1 };
    if ((key === 'arrowdown' || key === 's') && player.dir.y !== -1) player.nextDir = { x: 0, y: 1 };
    if ((key === 'arrowleft' || key === 'a') && player.dir.x !== 1) player.nextDir = { x: -1, y: 0 };
    if ((key === 'arrowright' || key === 'd') && player.dir.x !== -1) player.nextDir = { x: 1, y: 0 };
  });

  function getBestTime() {
    return Number(localStorage.getItem('gridCoreBestTime') || 0);
  }

  function setBestTime(value) {
    const best = getBestTime();
    if (value > best) localStorage.setItem('gridCoreBestTime', String(value));
  }

  function initGame() {
    const cell = Math.max(8, Math.floor(Math.min(state.width, state.height) / 64));
    const cols = Math.floor(state.width / cell);
    const rows = Math.floor(state.height / cell);

    const makeRider = (name, x, y, dir, color, ai) => ({
      name,
      x,
      y,
      dir,
      nextDir: { ...dir },
      color,
      ai,
      alive: true,
      stepTimer: 0,
      turnCooldown: ai ? rand(0.15, 0.55) : 0,
      aggression: ai ? rand(0.45, 0.85) : 0,
      caution: ai ? rand(0.65, 1.15) : 0,
      reaction: ai ? rand(0.12, 0.34) : 0,
      trail: [{ x, y }]
    });

    state.game = {
      cell,
      cols,
      rows,
      elapsed: 0,
      over: false,
      trails: new Map(),
      riders: [
        makeRider('Player', Math.floor(cols * 0.5), Math.floor(rows * 0.68), { x: 0, y: -1 }, '#00d4ff', false),
        makeRider('AI_01', Math.floor(cols * 0.24), Math.floor(rows * 0.25), { x: 1, y: 0 }, '#ff4f8b', true),
        makeRider('AI_02', Math.floor(cols * 0.75), Math.floor(rows * 0.28), { x: -1, y: 0 }, '#ffd166', true),
        makeRider('AI_03', Math.floor(cols * 0.35), Math.floor(rows * 0.82), { x: 0, y: -1 }, '#7cffc4', true)
      ]
    };

    const game = state.game;

    for (const rider of game.riders) {
      game.trails.set(`${rider.x},${rider.y}`, rider.color);
    }

    ui.timeValue.textContent = '0.0';
    ui.bestValue.textContent = getBestTime().toFixed(1);
  }

  function resetGameGeometry() {
    if (state.mode === 'game' || state.mode === 'gameIntro') initGame();
  }

  function safeDirections(rider) {
    const dirs = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 }
    ];

    return dirs.filter((dir) => {
      if (dir.x === -rider.dir.x && dir.y === -rider.dir.y) return false;
      const nx = rider.x + dir.x;
      const ny = rider.y + dir.y;
      return isGameCellSafe(nx, ny);
    });
  }

  function isGameCellSafe(x, y) {
    const game = state.game;
    if (!game) return false;
    if (x < 1 || y < 1 || x >= game.cols - 1 || y >= game.rows - 1) return false;
    return !game.trails.has(`${x},${y}`);
  }

  function distanceToBlock(x, y, dir, maxSteps = 24) {
    let distance = 0;

    for (let i = 1; i <= maxSteps; i++) {
      const nx = x + dir.x * i;
      const ny = y + dir.y * i;

      if (!isGameCellSafe(nx, ny)) break;
      distance++;
    }

    return distance;
  }

  function nearestLiveOpponent(rider) {
    const game = state.game;
    if (!game) return null;

    let nearest = null;
    let nearestDistance = Infinity;

    for (const other of game.riders) {
      if (other === rider || !other.alive) continue;

      const distance = Math.abs(other.x - rider.x) + Math.abs(other.y - rider.y);
      if (distance < nearestDistance) {
        nearest = other;
        nearestDistance = distance;
      }
    }

    return nearest;
  }

  function directionScore(rider, dir) {
    const game = state.game;
    if (!game) return -Infinity;

    const nx = rider.x + dir.x;
    const ny = rider.y + dir.y;

    if (!isGameCellSafe(nx, ny)) return -Infinity;

    const forwardSpace = distanceToBlock(nx, ny, dir, 28);
    const leftDir = { x: -dir.y, y: dir.x };
    const rightDir = { x: dir.y, y: -dir.x };
    const leftSpace = distanceToBlock(nx, ny, leftDir, 14);
    const rightSpace = distanceToBlock(nx, ny, rightDir, 14);
    const escapeSpace = Math.max(leftSpace, rightSpace);
    const corridorSpace = Math.min(leftSpace, rightSpace);

    const centerX = game.cols / 2;
    const centerY = game.rows / 2;
    const centerBias = -0.025 * (Math.abs(nx - centerX) + Math.abs(ny - centerY));

    const opponent = nearestLiveOpponent(rider);
    let pressureScore = 0;

    if (opponent) {
      const currentDistance = Math.abs(opponent.x - rider.x) + Math.abs(opponent.y - rider.y);
      const nextDistance = Math.abs(opponent.x - nx) + Math.abs(opponent.y - ny);
      const closing = currentDistance - nextDistance;
      const aligned = opponent.x === nx || opponent.y === ny;
      const opponentAhead = aligned && (
        (dir.x !== 0 && Math.sign(opponent.x - nx) === dir.x) ||
        (dir.y !== 0 && Math.sign(opponent.y - ny) === dir.y)
      );

      pressureScore += closing * 2.4 * rider.aggression;
      if (aligned) pressureScore += 2.2 * rider.aggression;
      if (opponentAhead && currentDistance < 13) pressureScore += 3.5 * rider.aggression;
    }

    const keepGoingBonus = dir.x === rider.dir.x && dir.y === rider.dir.y ? 1.35 : 0;
    const openRoadScore = forwardSpace * 1.8 * rider.caution;
    const escapeScore = escapeSpace * 0.85;
    const trapPenalty = forwardSpace < 4 ? -18 : 0;
    const narrowPenalty = corridorSpace < 2 ? -3 : 0;
    const unpredictability = rand(-0.65, 0.65);

    return openRoadScore + escapeScore + pressureScore + keepGoingBonus + centerBias + trapPenalty + narrowPenalty + unpredictability;
  }

  function chooseAIDirection(rider) {
    const options = safeDirections(rider);
    if (options.length === 0) return rider.dir;

    let bestDir = options[0];
    let bestScore = -Infinity;

    for (const dir of options) {
      const score = directionScore(rider, dir);
      if (score > bestScore) {
        bestScore = score;
        bestDir = dir;
      }
    }

    return bestDir;
  }

  function updateAI(rider, dt) {
    rider.turnCooldown -= dt;

    const frontSpace = distanceToBlock(rider.x, rider.y, rider.dir, 12);
    const dangerAhead = frontSpace <= 3;
    const shouldReconsider = dangerAhead || rider.turnCooldown <= 0;

    if (!shouldReconsider) return;

    rider.nextDir = chooseAIDirection(rider);
    rider.turnCooldown = dangerAhead ? rider.reaction : rand(0.28, 0.95);
  }

  function updateGame(dt) {
    const game = state.game;
    if (!game || game.over) return;

    game.elapsed += dt;
    ui.timeValue.textContent = game.elapsed.toFixed(1);

    for (const rider of game.riders) {
      if (!rider.alive) continue;

      if (rider.ai) updateAI(rider, dt);
      rider.stepTimer += dt;

      const stepDelay = rider.ai ? 0.075 : 0.065;

      while (rider.stepTimer >= stepDelay && rider.alive) {
        rider.stepTimer -= stepDelay;
        rider.dir = { ...rider.nextDir };

        const nx = rider.x + rider.dir.x;
        const ny = rider.y + rider.dir.y;

        if (!isGameCellSafe(nx, ny)) {
          rider.alive = false;
          if (!rider.ai) endGame();
          break;
        }

        rider.x = nx;
        rider.y = ny;
        game.trails.set(`${rider.x},${rider.y}`, rider.color);
        rider.trail.push({ x: rider.x, y: rider.y });
      }
    }

    checkGameWinCondition();
  }

  function checkGameWinCondition() {
    const game = state.game;
    if (!game || game.over) return;

    const aliveRiders = game.riders.filter((rider) => rider.alive);

    if (aliveRiders.length === 1 && !aliveRiders[0].ai) {
      winGame();
    }
  }

  function winGame() {
    const game = state.game;
    if (!game || game.over) return;

    game.over = true;
    setBestTime(game.elapsed);
    ui.bestValue.textContent = getBestTime().toFixed(1);
    ui.gameTitle.textContent = 'Grid Victory';
    ui.gameMessage.textContent = `You are the last rider standing. Synchronization held for ${game.elapsed.toFixed(1)} seconds.`;
    ui.startGameButton.textContent = 'Play Again';
    ui.returnCoreButton.textContent = 'Back To Core';
    ui.gameOverlay.classList.remove('hidden');
  }

  function endGame() {
    const game = state.game;
    if (!game) return;

    game.over = true;
    setBestTime(game.elapsed);
    ui.bestValue.textContent = getBestTime().toFixed(1);
    ui.gameTitle.textContent = 'Derezzed';
    ui.gameMessage.textContent = `You survived ${game.elapsed.toFixed(1)} seconds. Recompile and run again.`;
    ui.startGameButton.textContent = 'Play Again';
    ui.returnCoreButton.textContent = 'Back To Core';
    ui.gameOverlay.classList.remove('hidden');
  }

  function drawBackground() {
    const cx = state.width / 2;
    const cy = state.height * 0.48;
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(state.width, state.height) * 0.82);
    gradient.addColorStop(0, '#09233d');
    gradient.addColorStop(0.32, '#041326');
    gradient.addColorStop(0.72, '#020711');
    gradient.addColorStop(1, '#000105');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, state.width, state.height);

    drawStormClouds();

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const star of state.stars) {
      const y = (star.y + state.time * star.speed * 12) % state.height;
      ctx.fillStyle = `rgba(0, 212, 255, ${star.alpha})`;
      ctx.fillRect(star.x, y, 1.4, 1.4);
    }
    ctx.restore();
  }

  function drawStormClouds() {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    for (let i = 0; i < 9; i++) {
      const x = state.width * (i / 8);
      const y = state.height * (0.08 + 0.1 * Math.sin(i * 1.7 + state.time * 0.04));
      const r = state.width * (0.18 + 0.04 * Math.sin(i));

      const cloud = ctx.createRadialGradient(x, y, 0, x, y, r);
      cloud.addColorStop(0, 'rgba(43, 126, 170, 0.15)');
      cloud.addColorStop(0.42, 'rgba(18, 55, 92, 0.09)');
      cloud.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = cloud;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.fill();
    }

    ctx.restore();
  }

  function drawPerspectiveGrid(intensity = 1) {
    const horizon = state.height * 0.49;
    const vanishX = state.width / 2;
    const bottom = state.height + 130;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineWidth = 1;

    for (let i = -34; i <= 34; i++) {
      const x = state.width / 2 + i * state.width * 0.04;
      ctx.strokeStyle = `rgba(0, 212, 255, ${0.08 * intensity})`;
      ctx.beginPath();
      ctx.moveTo(vanishX, horizon);
      ctx.lineTo(x, bottom);
      ctx.stroke();
    }

    for (let i = 0; i < 42; i++) {
      const t = i / 41;
      const y = lerp(horizon, bottom, t * t);
      const alpha = lerp(0.03, 0.22, t) * intensity;
      ctx.strokeStyle = `rgba(0, 212, 255, ${alpha})`;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(state.width, y);
      ctx.stroke();
    }

    for (const packet of state.packets) {
      packet.z += packet.speed * 0.007 * intensity;
      if (packet.z > 1) packet.z = 0;

      const y = lerp(horizon, bottom, packet.z * packet.z);
      const x = lerp(vanishX, state.width / 2 + packet.lane * state.width * 0.042, packet.z);

      ctx.fillStyle = `rgba(0, 212, 255, ${0.18 + packet.z * 0.55})`;
      ctx.shadowBlur = 6;
      ctx.shadowColor = '#00d4ff';
      ctx.fillRect(x - packet.size / 2, y - packet.size / 2, packet.size, packet.size);
    }

    ctx.restore();
  }

  function drawCityHorizon() {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    const horizon = state.height * 0.5;

    for (const light of state.cityLights) {
      const flicker = 0.6 + Math.sin(state.time * light.flicker + light.x) * 0.4;
      ctx.fillStyle = `rgba(0, 212, 255, ${light.alpha * flicker})`;
      ctx.fillRect(light.x, light.y, light.w, 1);
    }

    const glow = ctx.createLinearGradient(0, horizon - 50, 0, horizon + 120);
    glow.addColorStop(0, 'rgba(255, 0, 0, 0)');
    glow.addColorStop(0.48, 'rgba(0, 212, 255, 0.12)');
    glow.addColorStop(1, 'rgba(0, 212, 255, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, horizon - 50, state.width, 170);

    ctx.restore();
  }

  function spawnRecognizerPatrol() {
    const direction = Math.random() < 0.5 ? 1 : -1;
    const count = Math.floor(rand(1, 3));

    const y = rand(state.height * 0.32, state.height * 0.44);
    const speed = rand(18, 42);
    const scale = rand(0.12, 0.22);

    for (let i = 0; i < count; i++) {
      state.recognizers.push({
        x: direction === 1
          ? -120 - i * rand(60, 100)
          : state.width + 120 + i * rand(60, 100),
        y: y + rand(-8, 8),
        direction,
        speed: speed * rand(0.85, 1.15),
        scale: scale * rand(0.85, 1.15),
        alpha: rand(0.18, 0.38)
      });
    }
  }

  function updateRecognizers(dt) {
    if (Math.random() < 0.006) {
      spawnRecognizerPatrol();
    }

    state.recognizers = state.recognizers.filter((r) => {
      r.x += r.direction * r.speed * dt;

      if (r.direction === 1) {
        return r.x < state.width + 260;
      }

      return r.x > -260;
    });
  }

  function drawRecognizers() {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    for (const r of state.recognizers) {
      ctx.save();
      ctx.translate(r.x, r.y);
      ctx.scale(r.direction * r.scale, r.scale);

      const red = `rgba(255, 30, 40, ${r.alpha})`;
      const cyan = `rgba(0, 212, 255, ${r.alpha * 0.25})`;
      const fill = `rgba(2, 8, 14, ${r.alpha * 0.6})`;

      ctx.lineWidth = 1.4;
      ctx.shadowBlur = 1;
      ctx.shadowColor = '#ff2030';
      ctx.strokeStyle = red;
      ctx.fillStyle = fill;

      // top bridge
      ctx.beginPath();
      ctx.moveTo(-90, -28);
      ctx.lineTo(90, -28);
      ctx.lineTo(78, -14);
      ctx.lineTo(-82, -14);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // upper body / cockpit wedge
      ctx.beginPath();
      ctx.moveTo(-35, -28);
      ctx.lineTo(0, -58);
      ctx.lineTo(48, -34);
      ctx.lineTo(70, -14);
      ctx.lineTo(-45, -14);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // cockpit window
      ctx.beginPath();
      ctx.moveTo(4, -46);
      ctx.lineTo(26, -38);
      ctx.lineTo(22, -27);
      ctx.lineTo(0, -30);
      ctx.closePath();
      ctx.stroke();

      // underside body
      ctx.beginPath();
      ctx.moveTo(-54, -14);
      ctx.lineTo(54, -14);
      ctx.lineTo(36, 6);
      ctx.lineTo(-36, 6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // left leg
      ctx.beginPath();
      ctx.moveTo(-76, -14);
      ctx.lineTo(-54, -14);
      ctx.lineTo(-48, 86);
      ctx.lineTo(-72, 100);
      ctx.lineTo(-92, 94);
      ctx.lineTo(-90, 6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // right leg
      ctx.beginPath();
      ctx.moveTo(76, -14);
      ctx.lineTo(54, -14);
      ctx.lineTo(48, 86);
      ctx.lineTo(72, 100);
      ctx.lineTo(92, 94);
      ctx.lineTo(90, 6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // inner struts
      ctx.strokeStyle = cyan;
      ctx.shadowColor = '#00d4ff';
      ctx.beginPath();
      ctx.moveTo(-54, -10);
      ctx.lineTo(-22, 2);
      ctx.moveTo(54, -10);
      ctx.lineTo(22, 2);
      ctx.moveTo(-72, 12);
      ctx.lineTo(-56, 80);
      ctx.moveTo(72, 12);
      ctx.lineTo(56, 80);
      ctx.stroke();

      ctx.restore();
    }

    ctx.restore();
  }

  function drawSpireBeam(cx, baseY, topY, pulse) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    const beamWidth = Math.max(18, state.width * 0.018);
    const glowWidth = Math.max(120, state.width * 0.12);

    const wideGlow = ctx.createLinearGradient(cx - glowWidth, 0, cx + glowWidth, 0);
    wideGlow.addColorStop(0, 'rgba(0, 212, 255, 0)');
    wideGlow.addColorStop(0.42, `rgba(0, 212, 255, ${0.08 + pulse * 0.04})`);
    wideGlow.addColorStop(0.5, `rgba(180, 245, 255, ${0.28 + pulse * 0.08})`);
    wideGlow.addColorStop(0.58, `rgba(0, 212, 255, ${0.08 + pulse * 0.04})`);
    wideGlow.addColorStop(1, 'rgba(0, 212, 255, 0)');

    ctx.fillStyle = wideGlow;
    ctx.fillRect(cx - glowWidth, 0, glowWidth * 2, baseY);

    const beamGradient = ctx.createLinearGradient(cx - beamWidth, 0, cx + beamWidth, 0);
    beamGradient.addColorStop(0, 'rgba(0, 212, 255, 0)');
    beamGradient.addColorStop(0.28, `rgba(0, 212, 255, ${0.42 + pulse * 0.12})`);
    beamGradient.addColorStop(0.5, 'rgba(245, 255, 255, 0.95)');
    beamGradient.addColorStop(0.72, `rgba(0, 212, 255, ${0.42 + pulse * 0.12})`);
    beamGradient.addColorStop(1, 'rgba(0, 212, 255, 0)');

    ctx.fillStyle = beamGradient;
    ctx.fillRect(cx - beamWidth, topY, beamWidth * 2, baseY - topY);

    ctx.strokeStyle = `rgba(220, 252, 255, ${0.55 + pulse * 0.25})`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(cx, topY);
    ctx.lineTo(cx, baseY);
    ctx.stroke();

    for (const riser of state.energyRisers) {
      riser.y -= riser.speed * 0.008;
      if (riser.y < 0) riser.y = 1;

      const y = lerp(baseY, topY, riser.y);
      const localWidth = beamWidth * (0.28 + (1 - riser.y) * 0.22);

      ctx.strokeStyle = `rgba(205, 250, 255, ${riser.alpha})`;
      ctx.lineWidth = riser.width;
      ctx.beginPath();
      ctx.moveTo(cx + riser.xOffset * 0.25, y);
      ctx.lineTo(cx + riser.xOffset * 0.25, y + riser.length);
      ctx.stroke();

      if (Math.abs(riser.xOffset) < localWidth) {
        ctx.fillStyle = `rgba(255, 255, 255, ${riser.alpha * 0.5})`;
        ctx.fillRect(cx + riser.xOffset * 0.12, y, 1, 1);
      }
    }

    ctx.restore();
  }

  function drawPylon(ctx, x, baseY, width, height, lean, alphaScale = 1) {
    const topY = baseY - height;
    const half = width / 2;
    const innerLean = lean * 0.42;

    ctx.save();
    ctx.globalCompositeOperation = 'source-over';

    const body = ctx.createLinearGradient(x - half, topY, x + half, baseY);
    body.addColorStop(0, 'rgba(5, 24, 42, 0.92)');
    body.addColorStop(0.45, 'rgba(3, 12, 24, 0.98)');
    body.addColorStop(1, 'rgba(2, 8, 18, 1)');

    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(x + lean - half * 0.28, topY);
    ctx.lineTo(x + lean + half * 0.28, topY);
    ctx.lineTo(x + half, baseY);
    ctx.lineTo(x - half, baseY);
    ctx.closePath();
    ctx.fill();

    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(0, 212, 255, ${0.35 * alphaScale})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + lean - half * 0.28, topY);
    ctx.lineTo(x - half, baseY);
    ctx.moveTo(x + lean + half * 0.28, topY);
    ctx.lineTo(x + half, baseY);
    ctx.stroke();

    ctx.strokeStyle = `rgba(150, 245, 255, ${0.22 * alphaScale})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + innerLean, topY + height * 0.18);
    ctx.lineTo(x + innerLean * 0.35, baseY - height * 0.08);
    ctx.stroke();

    ctx.restore();
  }

  function drawPlatform(cx, baseY, scale, pulse) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    const platformW = scale * 5.2;
    const platformH = scale * 1.05;

    ctx.strokeStyle = 'rgba(0, 212, 255, 0.32)';
    ctx.lineWidth = 1.4;
    ctx.shadowBlur = 6;
    ctx.shadowColor = '#00d4ff';

    for (let i = 0; i < 5; i++) {
      const w = platformW * (0.36 + i * 0.13);
      const h = platformH * (0.22 + i * 0.09);
      const y = baseY + i * scale * 0.08;

      ctx.beginPath();
      ctx.moveTo(cx, y - h);
      ctx.lineTo(cx + w * 0.5, y);
      ctx.lineTo(cx, y + h);
      ctx.lineTo(cx - w * 0.5, y);
      ctx.closePath();
      ctx.stroke();
    }

    for (let i = -4; i <= 4; i++) {
      const offset = i * scale * 0.55;
      ctx.strokeStyle = `rgba(0, 212, 255, ${0.09 + Math.abs(i) * 0.015})`;
      ctx.beginPath();
      ctx.moveTo(cx + offset * 0.12, baseY - platformH * 0.34);
      ctx.lineTo(cx + offset, state.height + 80);
      ctx.stroke();
    }

    const chamberGradient = ctx.createRadialGradient(cx, baseY - scale * 0.52, 0, cx, baseY - scale * 0.52, scale * 0.8);
    chamberGradient.addColorStop(0, `rgba(255,255,255,${0.76 + pulse * 0.14})`);
    chamberGradient.addColorStop(0.18, `rgba(150,245,255,${0.5 + pulse * 0.12})`);
    chamberGradient.addColorStop(0.65, 'rgba(0,212,255,0.16)');
    chamberGradient.addColorStop(1, 'rgba(0,212,255,0)');

    ctx.fillStyle = chamberGradient;
    ctx.beginPath();
    ctx.arc(cx, baseY - scale * 0.52, scale * 0.82, 0, TAU);
    ctx.fill();

    ctx.restore();
  }

  function drawSpireCore() {
    const cx = state.width / 2;
    const baseY = state.height * 0.75;
    const scale = Math.min(state.width, state.height) * 0.165;
    const pulseWave = (Math.sin(state.time * state.corePulseSpeed) + 1) / 2;
    const pulse = 0.35 + pulseWave * 0.65;

    drawPerspectiveGrid(1);
    drawCityHorizon();
    drawRecognizers();
    drawPulseRings(cx, baseY, scale);

    const beamBaseY = baseY - scale * 1.46;
    drawSpireBeam(cx, beamBaseY, -60, pulse);

    drawPlatform(cx, baseY, scale, pulse);

    ctx.save();

    const rearScale = 0.68;
    drawPylon(ctx, cx - scale * 1.55, baseY - scale * 0.2, scale * 0.34, scale * 1.36 * rearScale, -scale * 0.08, 0.55);
    drawPylon(ctx, cx + scale * 1.55, baseY - scale * 0.2, scale * 0.34, scale * 1.36 * rearScale, scale * 0.08, 0.55);

    drawPylon(ctx, cx - scale * 0.45, baseY - scale * 0.55, scale * 0.38, scale * 2.05, -scale * 0.16, 1);
    drawPylon(ctx, cx + scale * 0.45, baseY - scale * 0.55, scale * 0.38, scale * 2.05, scale * 0.16, 1);

    ctx.restore();

    drawCentralSpireSilhouette(cx, baseY, scale, pulse);
    drawAtmosphericEnergy(cx, baseY, scale);
  }

  function drawCentralSpireSilhouette(cx, baseY, scale, pulse) {
    const topY = baseY - scale * 3.05;
    const neckY = baseY - scale * 1.52;
    const footY = baseY - scale * 0.18;

    ctx.save();

    const body = ctx.createLinearGradient(cx - scale, topY, cx + scale, baseY);
    body.addColorStop(0, 'rgba(8, 34, 58, 0.95)');
    body.addColorStop(0.35, 'rgba(3, 16, 32, 0.98)');
    body.addColorStop(1, 'rgba(1, 7, 16, 1)');

    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(cx - scale * 0.16, topY);
    ctx.lineTo(cx + scale * 0.16, topY);
    ctx.lineTo(cx + scale * 0.34, neckY);
    ctx.lineTo(cx + scale * 0.72, footY);
    ctx.lineTo(cx + scale * 0.38, baseY);
    ctx.lineTo(cx - scale * 0.38, baseY);
    ctx.lineTo(cx - scale * 0.72, footY);
    ctx.lineTo(cx - scale * 0.34, neckY);
    ctx.closePath();
    ctx.fill();

    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(0, 212, 255, ${0.42 + pulse})`;
    ctx.lineWidth = 1.4;
    ctx.shadowBlur = 6;
    ctx.shadowColor = '#00d4ff';

    ctx.beginPath();
    ctx.moveTo(cx - scale * 0.16, topY);
    ctx.lineTo(cx - scale * 0.34, neckY);
    ctx.lineTo(cx - scale * 0.72, footY);
    ctx.moveTo(cx + scale * 0.16, topY);
    ctx.lineTo(cx + scale * 0.34, neckY);
    ctx.lineTo(cx + scale * 0.72, footY);
    ctx.stroke();

    const windowY = baseY - scale * 0.86;
    const windowGlow = ctx.createLinearGradient(cx - scale * 0.34, windowY, cx + scale * 0.34, windowY);
    windowGlow.addColorStop(0, 'rgba(0,212,255,0)');
    windowGlow.addColorStop(0.5, `rgba(210,252,255,${0.72 + pulse})`);
    windowGlow.addColorStop(1, 'rgba(0,212,255,0)');

    ctx.fillStyle = windowGlow;
    ctx.fillRect(cx - scale * 0.34, windowY - scale * 0.22, scale * 0.68, scale * 0.48);

    for (let i = -3; i <= 3; i++) {
      ctx.fillStyle = `rgba(180, 245, 255, ${0.28 + pulse})`;
      ctx.fillRect(cx + i * scale * 0.07, windowY - scale * 0.18, 1.6, scale * 0.36);
    }

    ctx.restore();
  }

  function updatePulseRings(dt) {
    if (Math.random() < 0.025) {
      state.pulseRings.push({
        age: 0,
        life: rand(1.4, 2.4),
        width: rand(0.55, 1.15),
        height: rand(0.045, 0.095),
        xWobble: rand(-8, 8),
        alpha: rand(0.35, 0.85),
        rotation: rand(-0.08, 0.08)
      });
    }

    state.pulseRings = state.pulseRings.filter((disc) => {
      disc.age += dt;
      return disc.age < disc.life;
    });
  }

  function drawPulseRings(cx, baseY, scale) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    for (const disc of state.pulseRings) {
      const t = disc.age / disc.life;

      const yStart = baseY - scale * 0.52;
      const yEnd = -80;
      const y = lerp(yStart, yEnd, t);

      const x = cx + Math.sin(state.time * 3 + disc.age * 7) * disc.xWobble;

      const w = scale * disc.width;
      const h = scale * disc.height;
      const alpha = disc.alpha * (1 - t);

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(disc.rotation);

      const glow = ctx.createLinearGradient(-w, 0, w, 0);
      glow.addColorStop(0, 'rgba(0, 212, 255, 0)');
      glow.addColorStop(0.2, `rgba(0, 212, 255, ${alpha * 0.45})`);
      glow.addColorStop(0.5, `rgba(245, 255, 255, ${alpha})`);
      glow.addColorStop(0.8, `rgba(0, 212, 255, ${alpha * 0.45})`);
      glow.addColorStop(1, 'rgba(0, 212, 255, 0)');

      ctx.strokeStyle = glow;
      ctx.lineWidth = 2;
      ctx.shadowBlur = 6;
      ctx.shadowColor = '#7df9ff';

      ctx.beginPath();
      ctx.ellipse(0, 0, w, h, 0, 0, TAU);
      ctx.stroke();

      ctx.fillStyle = `rgba(125, 249, 255, ${alpha * 0.08})`;
      ctx.beginPath();
      ctx.ellipse(0, 0, w * 0.9, h * 0.8, 0, 0, TAU);
      ctx.fill();

      ctx.restore();
    }

    ctx.restore();
  }

  function drawCoreTransferLines() {
    const cx = state.width / 2;
    const cy = state.height * 0.64;

    const leftStart = { x: state.width * 0.33, y: state.height * 1.82 };
    const rightStart = { x: state.width * 0.67, y: state.height * 1.82 };

    drawTransferLine(leftStart.x, leftStart.y, cx, cy, 1);
    drawTransferLine(rightStart.x, rightStart.y, cx, cy, -1);
  }

  function drawTransferLine(x1, y1, x2, y2, direction) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    ctx.strokeStyle = 'rgba(0, 212, 255, 0.45)';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#00d4ff';

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    for (let i = 0; i < 3; i++) {
      let t = (state.time * 0.09 + i * 0.28) % 1;

      if (direction === -1) {
        t = 1 - t;
      }

      const x = lerp(x1, x2, t);
      const y = lerp(y1, y2, t);

      ctx.save();
      ctx.translate(x, y);

      const angle = Math.atan2(y2 - y1, x2 - x1);
      ctx.rotate(angle);

      ctx.fillStyle = 'rgba(125, 249, 255, 0.9)';
      ctx.shadowBlur = 6;
      ctx.shadowColor = '#7df9ff';

      ctx.fillRect(-10, -4, 20, 8);

      ctx.restore();
    }

    ctx.restore();
  }

  function drawAtmosphericEnergy(cx, baseY, scale) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    for (const p of state.particles) {
      const a = p.angle + state.time * p.speed;
      const r = p.radius * 1.2;
      const x = cx + Math.cos(a) * r;
      const y = baseY - scale * 0.58 + Math.sin(a) * r * 0.18;

      ctx.fillStyle = `rgba(0, 212, 255, ${p.alpha * 0.42})`;
      ctx.shadowBlur = 6;
      ctx.shadowColor = '#00d4ff';
      ctx.beginPath();
      ctx.arc(x, y, p.size, 0, TAU);
      ctx.fill();
    }

    const groundMist = ctx.createRadialGradient(cx, baseY - scale * 0.2, 0, cx, baseY - scale * 0.2, scale * 3.2);
    groundMist.addColorStop(0, 'rgba(0, 212, 255, 0.22)');
    groundMist.addColorStop(0.5, 'rgba(0, 212, 255, 0.08)');
    groundMist.addColorStop(1, 'rgba(0, 212, 255, 0)');

    ctx.fillStyle = groundMist;
    ctx.beginPath();
    ctx.ellipse(cx, baseY - scale * 0.1, scale * 3.2, scale * 0.72, 0, 0, TAU);
    ctx.fill();

    ctx.restore();
  }

  function drawCore() {
    drawSpireCore();
    drawCoreTransferLines();
  }

  function drawTunnel(dt) {
    state.tunnelSpeed = lerp(state.tunnelSpeed, 1, 0.015);
    state.tunnelProgress += dt * (1.05 / TUNNEL_DURATION) * state.tunnelSpeed;

    const cx = state.width / 2 + state.mouse.nx * 60;
    const cy = state.height / 2 + state.mouse.ny * 40;

    updateTunnelEvents();

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    for (let i = 0; i < 42; i++) {
      const z = ((i / 42) + state.tunnelProgress * 1.35) % 1;
      const radius = Math.pow(z, 14) * Math.max(state.width, state.height) * 1.05 + 12;
      const alpha = (1 - z) * 0.5 + 0.1;
      const sides = 4;
      const rot = state.time * 0.9 + i * 0.18;

      ctx.strokeStyle = `rgba(0, 212, 255, ${alpha})`;
      ctx.lineWidth = 1 + z * 3.2;
      ctx.beginPath();

      for (let s = 0; s <= sides; s++) {
        const a = rot + Math.PI / 4 + s * TAU / sides;
        const x = cx + Math.cos(a) * radius;
        const y = cy + Math.sin(a) * radius;

        if (s === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }

      ctx.stroke();
    }

    for (let i = 0; i < 26; i++) {
      const a = i * TAU / 26 + Math.sin(state.time * 0.6) * 0.2;
      const inner = 40 + (state.tunnelProgress % 1) * 50;
      const outer = Math.max(state.width, state.height);
      const bend = Math.sin(state.time * 1.4 + i) * 30;

      ctx.strokeStyle = `rgba(125, 249, 255, ${0.08 + (i % 5 === 0 ? 0.2 : 0)})`;
      ctx.lineWidth = i % 5 === 0 ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
      ctx.lineTo(cx + Math.cos(a) * outer + bend, cy + Math.sin(a) * outer + bend);
      ctx.stroke();
    }

    drawTunnelFlybys(cx, cy);
    drawTunnelSyncOverlay();

    const flash = clamp((state.tunnelProgress - 0.84) / 0.16, 0, 1);
    if (flash > 0) {
      ctx.fillStyle = `rgba(215, 248, 255, ${flash * 0.7})`;
      ctx.fillRect(0, 0, state.width, state.height);
    }

    ctx.restore();

    if (state.tunnelProgress >= 1.05) revealGameIntro();
  }

  function drawGameArena() {
    const game = state.game;
    if (!game) return;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(0, 212, 255, 0.15)';
    ctx.lineWidth = 1;

    for (let x = 0; x <= game.cols; x += 4) {
      ctx.beginPath();
      ctx.moveTo(x * game.cell, 0);
      ctx.lineTo(x * game.cell, state.height);
      ctx.stroke();
    }

    for (let y = 0; y <= game.rows; y += 4) {
      ctx.beginPath();
      ctx.moveTo(0, y * game.cell);
      ctx.lineTo(state.width, y * game.cell);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(0, 212, 255, 0.65)';
    ctx.lineWidth = 1;
    ctx.shadowBlur = 1;
    ctx.shadowColor = '#00d4ff';
    ctx.strokeRect(game.cell, game.cell, (game.cols - 2) * game.cell, (game.rows - 2) * game.cell);

    const wallThickness = Math.max(2, game.cell * 0.18);

    ctx.lineCap = 'square';
    ctx.lineJoin = 'miter';
    ctx.miterLimit = 2;

    for (const rider of game.riders) {
      if (!rider.trail || rider.trail.length < 2) continue;

      ctx.strokeStyle = rider.color;
      ctx.lineWidth = wallThickness;
      ctx.shadowBlur = 4;
      ctx.shadowColor = rider.color;

      ctx.beginPath();

      const first = rider.trail[0];
      ctx.moveTo(
        first.x * game.cell + game.cell / 2,
        first.y * game.cell + game.cell / 2
      );

      for (let i = 1; i < rider.trail.length; i++) {
        const point = rider.trail[i];
        ctx.lineTo(
          point.x * game.cell + game.cell / 2,
          point.y * game.cell + game.cell / 2
        );
      }

      ctx.stroke();
    }

    for (const rider of game.riders) {
      if (!rider.alive) continue;

      const x = rider.x * game.cell + game.cell / 2;
      const y = rider.y * game.cell + game.cell / 2;

      ctx.fillStyle = rider.color;
      ctx.shadowBlur = 6;
      ctx.shadowColor = rider.color;
      ctx.beginPath();
      ctx.arc(x, y, game.cell * 0.55, 0, TAU);
      ctx.fill();
    }

    ctx.restore();
  }

  function updateHud() {
    const stability = 97.5 + Math.sin(state.time * 0.8) * 1.1;
    const energy = 2.2 + Math.sin(state.time * 1.1) * 0.25;

    ui.stabilityValue.textContent = `${stability.toFixed(1)}%`;
    ui.stabilityMeter.style.width = `${clamp(stability, 0, 100)}%`;
    ui.energyValue.textContent = `${energy.toFixed(2)} GB`;
    ui.energyMeter.style.width = `${clamp(energy * 24, 12, 100)}%`;
    ui.stateValue.textContent =
      state.mode === 'core'
        ? 'NOMINAL'
        : state.mode === 'connecting'
          ? 'LINKING'
          : state.mode === 'tunnel'
            ? 'SYNCRONIZING'
            : 'CONNECTED: GRID';

    const packetBase = Math.floor(state.time * 18)
      .toString(16)
      .toUpperCase()
      .padStart(4, '0');

    ui.packetA.textContent = `Packet_${packetBase} >>`;
    ui.packetB.textContent = `Packet_${(Number.parseInt(packetBase, 16) + 1).toString(16).toUpperCase().padStart(4, '0')} >>`;
    ui.packetC.textContent = `Packet_${(Number.parseInt(packetBase, 16) + 2).toString(16).toUpperCase().padStart(4, '0')} >>`;
  }

  function frame(now) {
    const dt = Math.min((now - state.lastTime) / 1000, 0.033);
    state.lastTime = now;
    state.time += dt;

    if (state.mode === 'core' || state.mode === 'connecting') {
      updatePulseRings(dt);
      updateRecognizers(dt);
    }
    drawBackground();

    if (state.mode === 'core' || state.mode === 'connecting') {
      drawCore();
    } else if (state.mode === 'tunnel') {
      drawTunnel(dt);
    } else if (state.mode === 'gameIntro') {
      drawGameArena();
    } else if (state.mode === 'game') {
      updateGame(dt);
      drawGameArena();
    }

    state.hudTimer += dt;
    if (state.hudTimer >= 0.25) {
      updateHud();
      state.hudTimer = 0;
    }
    requestAnimationFrame(frame);
  }

  const soundHintBanner = document.getElementById('soundHintBanner');

  setTimeout(() => {
    soundHintBanner?.classList.add('hidden');
  }, 9800);

  setTimeout(() => {
    soundHintBanner?.remove();
  }, 11000);

  resize();
  requestAnimationFrame(frame);
})();
