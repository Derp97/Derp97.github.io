const canvas = document.getElementById("dungeonCanvas");
const ctx = canvas.getContext("2d");
const generateBtn = document.getElementById("generateBtn");
const buyMaxHealthBtn = document.getElementById("buyMaxHealthBtn");
const healBtn = document.getElementById("healBtn");
const buyArmourBtn = document.getElementById("buyArmourBtn");
const buyDashBtn = document.getElementById("buyDashBtn");


// Player variables
let maxHealth = 30;
let health = maxHealth;
const HEALTH_UPGRADE_COST = 50;
const HEAL_COST = 10;

let armourLevel = 0;
const MAX_ARMOUR_LEVEL = 5;
let armourCost = 25;

let player = { x: 0, y: 0 };
let score = 0;
let gold = 0;

const keysHeld = new Set();
let moveCooldown = 140;
let sprintCooldown = 70;
let isSprinting = false;
let lastMoveTime = 0;

let invulnerableUntil = 0;
let isDashing = false;

const HIT_INVULNERABILITY_TIME = 1000;

let dashCooldown = 15000;
let lastDashTime = 0;

let dashLevel = 0;
let dashUpgradeCost = 25;

const DASH_DISTANCE = 3;
const MAX_DASH_LEVEL = 5;
const DASH_COOLDOWN_STEP = 2400;

const MAX_HEALTH = 30;

//Dungeon Variables
const TILE_SIZE = 16;
const GRID_WIDTH = 60;
const GRID_HEIGHT = 35;
const ROOM_PADDING = 2;

const EMPTY = 0;
const FLOOR = 1;
const START = 2;
const EXIT = 3;
const TREASURE = 4;
const ENEMY = 5;
const CORRIDOR = 6;
const VISIBLE_WALL = 7;
const GRAND_CHEST = 8;
const CHEST_KEY = 9;
let hasChestKey = false;

let currentDungeon = null;
let dungeonFloor = 1;

// Enemy variables
let enemies = [];
const ENEMY_TYPES = {
  NORMAL: {
    name: "normal",
    color: "#a855f7",
    unlockFloor: 1,
    aggroRange: 6,
    maxSpawnDistance: 8,
    goldMin: 1,
    goldMax: 5,
    damage: 10,
    scoreValue: 1,
  },

  HUNTER: {
    name: "hunter",
    color: "#ef4444",
    unlockFloor: 5,
    aggroRange: 9,
    maxSpawnDistance: 12,
    goldMin: 3,
    goldMax: 8,
    damage: 12,
    scoreValue: 2,
  },

  BRUTE: {
    name: "brute",
    color: "#22c55e",
    unlockFloor: 10,
    aggroRange: 5,
    maxSpawnDistance: 6,
    goldMin: 5,
    goldMax: 12,
    damage: 18,
    scoreValue: 3,
  },
};

// player upgrade code
function updateShopButtons() {
  buyMaxHealthBtn.disabled = gold < HEALTH_UPGRADE_COST;
  healBtn.disabled = gold < HEAL_COST || health >= maxHealth;
  buyArmourBtn.disabled =
    gold < armourCost ||
    armourLevel >= MAX_ARMOUR_LEVEL;

  buyMaxHealthBtn.textContent = `Buy Max Health (${HEALTH_UPGRADE_COST}g)`;
  healBtn.textContent = `Heal (${HEAL_COST}g)`;

  buyArmourBtn.textContent =
    armourLevel >= MAX_ARMOUR_LEVEL
      ? "Armour Maxed"
      : `Buy Armour (${armourCost}g)`;

  buyDashBtn.disabled =
  gold < dashUpgradeCost ||
  dashLevel >= MAX_DASH_LEVEL;

  buyDashBtn.textContent =
    dashLevel >= MAX_DASH_LEVEL
      ? "Dash Maxed"
      : `Upgrade Dash (${dashUpgradeCost}g)`;
}

buyMaxHealthBtn.addEventListener("click", () => {
  if (gold < HEALTH_UPGRADE_COST) return;

  gold -= HEALTH_UPGRADE_COST;
  maxHealth += 10;
  health += 10;

  renderDungeon(currentDungeon);
});

healBtn.addEventListener("click", () => {
  if (gold < HEAL_COST) return;

  gold -= HEAL_COST;
  health += 10;
  if (health > maxHealth) health = maxHealth;


  renderDungeon(currentDungeon);
});

buyArmourBtn.addEventListener("click", () => {
  if (gold < armourCost) return;
  if (armourLevel >= MAX_ARMOUR_LEVEL) return;

  gold -= armourCost;
  armourLevel += 1;

  armourCost += 25;

  renderDungeon(currentDungeon);
});

buyDashBtn.addEventListener("click", () => {
  if (dashLevel >= MAX_DASH_LEVEL) return;
  if (gold < dashUpgradeCost) return;

  gold -= dashUpgradeCost;
  dashLevel += 1;

  dashCooldown = Math.max(
    3000,
    15000 - DASH_COOLDOWN_STEP * dashLevel
  );

  dashUpgradeCost += 25;

  renderDungeon(currentDungeon);
});

// Player movement code

function canMoveTo(grid, x, y) {
  return isWalkableTile(grid[y]?.[x]);
}

window.addEventListener("keydown", event => {
  const key = event.key.toLowerCase();

  keysHeld.add(key);

  if (event.code === "Space") {
    event.preventDefault();
    tryDash();
  }
});

window.addEventListener("keyup", event => {
  keysHeld.delete(event.key.toLowerCase());
});



function handlePlayerMovement() {
  if (!currentDungeon) return;

  const now = Date.now();
  const currentCooldown = isSprinting ? sprintCooldown : moveCooldown;

  if (now - lastMoveTime < currentCooldown) return;

  let dx = 0;
  let dy = 0;

  isSprinting = keysHeld.has("shift");

  if (keysHeld.has("arrowup") || keysHeld.has("w")) dy = -1;
  if (keysHeld.has("arrowdown") || keysHeld.has("s")) dy = 1;
  if (keysHeld.has("arrowleft") || keysHeld.has("a")) dx = -1;
  if (keysHeld.has("arrowright") || keysHeld.has("d")) dx = 1;

  if (dx === 0 && dy === 0) return;

  lastMoveTime = now;

  const nextX = player.x + dx;
  const nextY = player.y + dy;
  const nextTile = currentDungeon[nextY]?.[nextX];

  if (canMoveTo(currentDungeon, nextX, nextY)) {
    if (nextTile === TREASURE) {
      score += 1;
      gold += randomInt(3, 8);
      currentDungeon[nextY][nextX] = FLOOR;
    }

    if (nextTile === CHEST_KEY) {
      hasChestKey = true;
      currentDungeon[nextY][nextX] = FLOOR;
    }

    if (nextTile === GRAND_CHEST) {
      if (hasChestKey) {
        score += 5;
        gold += randomInt(25, 50);
        hasChestKey = false;
        currentDungeon[nextY][nextX] = FLOOR;
      } else {
        return;
      }
    }

    if (nextTile === EXIT) {

      if (dungeonFloor % 5 === 0) {
        score += 10;
      } else {
        score += 5;
      }

      dungeonFloor += 1;
      regenerate();
      return;
    }

    player.x = nextX;
    player.y = nextY;
    checkEnemyCollision();
    renderDungeon(currentDungeon);
  }
}

function tryDash() {
  if (!currentDungeon) return;

  const now = Date.now();

  if (now - lastDashTime < dashCooldown) return;

  let dx = 0;
  let dy = 0;

  if (keysHeld.has("arrowup") || keysHeld.has("w")) dy = -1;
  else if (keysHeld.has("arrowdown") || keysHeld.has("s")) dy = 1;
  else if (keysHeld.has("arrowleft") || keysHeld.has("a")) dx = -1;
  else if (keysHeld.has("arrowright") || keysHeld.has("d")) dx = 1;

  if (dx === 0 && dy === 0) return;

  lastDashTime = now;
  isDashing = true;
  invulnerableUntil = Date.now() + 250;

  for (let i = 0; i < DASH_DISTANCE; i++) {
    const nextX = player.x + dx;
    const nextY = player.y + dy;
    const nextTile = currentDungeon[nextY]?.[nextX];

    if (!canMoveTo(currentDungeon, nextX, nextY)) break;

    if (nextTile === TREASURE) {
      score += 1;
      gold += randomInt(3, 8);
      currentDungeon[nextY][nextX] = FLOOR;
    }

    if (nextTile === CHEST_KEY) {
      hasChestKey = true;
      currentDungeon[nextY][nextX] = FLOOR;
    }

    if (nextTile === GRAND_CHEST) {
      if (hasChestKey) {
        score += 5;
        gold += randomInt(25, 50);
        hasChestKey = false;
        currentDungeon[nextY][nextX] = FLOOR;
      } else {
        return;
      }
    }

    if (nextTile === EXIT) {

      if (dungeonFloor % 5 === 0) {
        score += 10;
      } else {
        score += 5;
      }

      dungeonFloor += 1;
      regenerate();
      return;
    }

    player.x = nextX;
    player.y = nextY;
    checkEnemyCollision();
  }

  isDashing = false;
  renderDungeon(currentDungeon);
}

function checkEnemyCollision() {
  if (Date.now() < invulnerableUntil) return;
  const enemyIndex = enemies.findIndex(enemy =>
    enemy.x === player.x && enemy.y === player.y
  );

  if (enemyIndex === -1) return;

  const baseDamage = enemies[enemyIndex].damage;
  const damageReduction = armourLevel * 0.10;
  const finalDamage = Math.ceil(baseDamage * (1 - damageReduction));

  health -= finalDamage;
  score += enemies[enemyIndex].scoreValue;
  const enemy = enemies[enemyIndex];
  const enemyGold = randomInt(enemy.goldMin, enemy.goldMax);
  gold += enemyGold;

  invulnerableUntil = Date.now() + HIT_INVULNERABILITY_TIME;

  enemies.splice(enemyIndex, 1);

  if (health <= 0) {
    resetRun();
  }
}

// On death

function resetRun() {
  gold = 0;
  score = 0;

  maxHealth = 30;
  health = maxHealth;

  armourLevel = 0;
  armourCost = 25;

  dashCooldown = 15000;
  lastDashTime = 0;
  dashLevel = 0;
  dashUpgradeCost = 25;

  dungeonFloor = 1;
  hasChestKey = false;

  invulnerableUntil = 0;
  isDashing = false;

  regenerate();
}

// Enemy generation and movement code

function getAvailableEnemyTypes() {
  return Object.values(ENEMY_TYPES).filter(type =>
    dungeonFloor >= type.unlockFloor
  );
}

function getRandomEnemyType() {
  const availableTypes = getAvailableEnemyTypes();
  return availableTypes[randomInt(0, availableTypes.length - 1)];
}

// Dungeon generation code

function createGrid() {
  return Array.from({ length: GRID_HEIGHT }, () =>
    Array.from({ length: GRID_WIDTH }, () => EMPTY)
  );
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function roomsOverlap(a, b) {
  return (
    a.x - ROOM_PADDING < b.x + b.w &&
    a.x + a.w + ROOM_PADDING > b.x &&
    a.y - ROOM_PADDING < b.y + b.h &&
    a.y + a.h + ROOM_PADDING > b.y
  );
}

function carveRoom(grid, room) {
  for (let y = room.y; y < room.y + room.h; y++) {
    for (let x = room.x; x < room.x + room.w; x++) {
      grid[y][x] = FLOOR;
    }
  }
}

function getCenter(room) {
  return {
    x: Math.floor(room.x + room.w / 2),
    y: Math.floor(room.y + room.h / 2),
  };
}

function carveHorizontal(grid, x1, x2, y) {
  const start = Math.min(x1, x2);
  const end = Math.max(x1, x2);

  for (let x = start; x <= end; x++) {
    if (grid[y]?.[x] === EMPTY) {
      grid[y][x] = CORRIDOR;
    }
  }
}

function carveVertical(grid, y1, y2, x) {
  const start = Math.min(y1, y2);
  const end = Math.max(y1, y2);

  for (let y = start; y <= end; y++) {
    if (grid[y]?.[x] === EMPTY) {
      grid[y][x] = CORRIDOR;
    }
  }
}

function connectRooms(grid, roomA, roomB) {
  const a = getCenter(roomA);
  const b = getCenter(roomB);

  if (Math.random() < 0.5) {
    carveHorizontal(grid, a.x, b.x, a.y);
    carveVertical(grid, a.y, b.y, b.x);
  } else {
    carveVertical(grid, a.y, b.y, a.x);
    carveHorizontal(grid, a.x, b.x, b.y);
  }
}

function isWalkableTile(tile) {
  return (
    tile === FLOOR ||
    tile === CORRIDOR ||
    tile === START ||
    tile === EXIT ||
    tile === TREASURE ||
    tile === GRAND_CHEST ||
    tile === CHEST_KEY
  );
}

function addVisibleWalls(grid) {
  const nextGrid = grid.map(row => [...row]);

  for (let y = 0; y < GRID_HEIGHT; y++) {
    for (let x = 0; x < GRID_WIDTH; x++) {
      if (grid[y][x] !== EMPTY) continue;

      const touchesWalkable =
        isWalkableTile(grid[y - 1]?.[x]) ||
        isWalkableTile(grid[y + 1]?.[x]) ||
        isWalkableTile(grid[y]?.[x - 1]) ||
        isWalkableTile(grid[y]?.[x + 1]) ||
        isWalkableTile(grid[y - 1]?.[x - 1]) ||
        isWalkableTile(grid[y - 1]?.[x + 1]) ||
        isWalkableTile(grid[y + 1]?.[x - 1]) ||
        isWalkableTile(grid[y + 1]?.[x + 1]);

      if (touchesWalkable) {
        nextGrid[y][x] = VISIBLE_WALL;
      }
    }
  }

  return nextGrid;
}

function distance(aX, aY, bX, bY) {
  const dx = aX - bX;
  const dy = aY - bY;

  return Math.sqrt(dx * dx + dy * dy);
}

function placeGrandChest(grid, rooms) {
  if (dungeonFloor % 5 !== 0) return;
  if (rooms.length < 2) return;

  const room = rooms[rooms.length - 1];

  const x = randomInt(room.x + 1, room.x + room.w - 2);
  const y = randomInt(room.y + 1, room.y + room.h - 2);

  if (grid[y][x] === FLOOR) {
    grid[y][x] = GRAND_CHEST;
  }
}

function placeChestKey(grid, rooms) {
  if (dungeonFloor % 5 !== 0) return;
  if (rooms.length < 3) return;

  const possibleRooms = rooms.slice(1, -1);
  const room = possibleRooms[randomInt(0, possibleRooms.length - 1)];

  const x = randomInt(room.x + 1, room.x + room.w - 2);
  const y = randomInt(room.y + 1, room.y + room.h - 2);

  if (grid[y][x] === FLOOR) {
    grid[y][x] = CHEST_KEY;
  }
}

function placeObjects(grid, rooms) {
  for (const room of rooms.slice(1, -1)) {
    const roll = Math.random();

    const x = randomInt(room.x + 1, room.x + room.w - 2);
    const y = randomInt(room.y + 1, room.y + room.h - 2);

    if (grid[y][x] !== FLOOR) continue;

    if (roll < 0.25) {
      grid[y][x] = TREASURE;
    } else if (roll < 0.60) {
      const enemyType = getRandomEnemyType();

      enemies.push({
        x,
        y,
        spawnX: x,
        spawnY: y,
        type: enemyType.name,
        color: enemyType.color,
        aggroRange: enemyType.aggroRange,
        maxSpawnDistance: enemyType.maxSpawnDistance,
        scoreValue: enemyType.scoreValue,
        goldMin: enemyType.goldMin,
        goldMax: enemyType.goldMax,
        damage: enemyType.damage,
        aggro: false,
        aggroTimer: 0,
      });
    }
  }
}

function distanceBetweenRooms(roomA, roomB) {
  const a = getCenter(roomA);
  const b = getCenter(roomB);

  const dx = a.x - b.x;
  const dy = a.y - b.y;

  return Math.sqrt(dx * dx + dy * dy);
}

function getFurthestRoomFrom(startRoom, rooms) {
  let furthestRoom = startRoom;
  let furthestDistance = 0;

  for (const room of rooms) {
    const distance = distanceBetweenRooms(startRoom, room);

    if (distance > furthestDistance) {
      furthestDistance = distance;
      furthestRoom = room;
    }
  }

  return furthestRoom;
}

function generateDungeon() {
  hasChestKey = false;
  enemies = [];
  const grid = createGrid();
  const rooms = [];

  for (let i = 0; i < 80; i++) {
    const w = randomInt(4, 10);
    const h = randomInt(4, 8);

    const room = {
      x: randomInt(1, GRID_WIDTH - w - 2),
      y: randomInt(1, GRID_HEIGHT - h - 2),
      w,
      h,
    };

    const overlaps = rooms.some(existingRoom =>
      roomsOverlap(room, existingRoom)
    );

    if (!overlaps) {
      carveRoom(grid, room);

      if (rooms.length > 0) {
        connectRooms(grid, rooms[rooms.length - 1], room);
      }

      rooms.push(room);
    }
  }

  placeObjects(grid, rooms);
  placeGrandChest(grid, rooms);
  placeChestKey(grid, rooms);

  if (rooms.length > 1) {
    const startRoom = rooms[0];
    const exitRoom = getFurthestRoomFrom(startRoom, rooms);

    const start = getCenter(startRoom);
    const exit = getCenter(exitRoom);

    grid[start.y][start.x] = START;
    grid[exit.y][exit.x] = EXIT;
    player.x = start.x;
    player.y = start.y;
  }

  return addVisibleWalls(grid);
}

function renderDungeon(grid) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < GRID_HEIGHT; y++) {
    for (let x = 0; x < GRID_WIDTH; x++) {
      const tile = grid[y][x];

      if (tile === EMPTY) ctx.fillStyle = "#111827";
      if (tile === VISIBLE_WALL) ctx.fillStyle = "#374151";
      if (tile === FLOOR) ctx.fillStyle = "#d1d5db";
      if (tile === CORRIDOR) ctx.fillStyle = "#d1d5db";
      if (tile === START) ctx.fillStyle = "#22c55e";
      if (tile === EXIT) ctx.fillStyle = "#ef4444";
      if (tile === TREASURE) ctx.fillStyle = "#b9a040";
      if (tile === GRAND_CHEST) ctx.fillStyle = "#ffe100";
      if (tile === CHEST_KEY) ctx.fillStyle = "#ff7b00";
      if (tile === ENEMY) ctx.fillStyle = "#a855f7";

      ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }
  }
  for (const enemy of enemies) {
    ctx.fillStyle = enemy.color;
    ctx.fillRect(
      enemy.x * TILE_SIZE + 4,
      enemy.y * TILE_SIZE + 4,
      TILE_SIZE - 8,
      TILE_SIZE - 8
    );
  }
  ctx.fillStyle = "#38bdf8";
  const isInvulnerable = Date.now() < invulnerableUntil;

  ctx.fillStyle = isInvulnerable ? "#fef08a" : "#38bdf8";
  ctx.fillRect(
    player.x * TILE_SIZE + 3,
    player.y * TILE_SIZE + 3,
    TILE_SIZE - 6,
    TILE_SIZE - 6
  );
  ctx.fillStyle = "#ffffff";
  ctx.font = "18px system-ui";
  ctx.fillText(`Score: ${score}`, 12, 24);
  ctx.fillText(`Gold: ${gold}`, 12, 48);
  ctx.fillText(`Health: ${health}/${maxHealth}`, 12, 72);
  ctx.fillText(`Armour: ${armourLevel}/${MAX_ARMOUR_LEVEL}`, 12, 96);
  ctx.fillText(`Floor: ${dungeonFloor}`, 12, 120);
  ctx.fillText(`Key: ${hasChestKey ? "Yes" : "No"}`, 12, 144);
  const dashRemaining = Math.max(
    0,
    Math.ceil(
      (dashCooldown - (Date.now() - lastDashTime)) / 1000
    )
  );

  ctx.fillText(
    `Dash: ${dashRemaining <= 0 ? "Ready" : `${dashRemaining}s`}`,
    12,
    168
  );
  updateShopButtons();
}

function distanceFromSpawn(enemy, x, y) {
  const dx = x - enemy.spawnX;
  const dy = y - enemy.spawnY;
  return Math.sqrt(dx * dx + dy * dy);
}

function moveEnemies() {
  for (const enemy of enemies) {

    const playerDistance = distance(
      enemy.x,
      enemy.y,
      player.x,
      player.y
    );

    // Detect player
    if (playerDistance <= enemy.aggroRange) {
      enemy.aggro = true;
      enemy.aggroTimer = 12;
    }

    // Lose aggro over time
    if (enemy.aggroTimer > 0) {
      enemy.aggroTimer--;
    } else {
      enemy.aggro = false;
    }

    let nextX = enemy.x;
    let nextY = enemy.y;

    // Chase player
    if (enemy.aggro) {

      if (player.x > enemy.x) nextX++;
      else if (player.x < enemy.x) nextX--;

      if (player.y > enemy.y) nextY++;
      else if (player.y < enemy.y) nextY--;

    } else {

      // Wander
      const directions = [
        { dx: 0, dy: -1 },
        { dx: 0, dy: 1 },
        { dx: -1, dy: 0 },
        { dx: 1, dy: 0 },
        { dx: 0, dy: 0 },
      ];

      const choice =
        directions[randomInt(0, directions.length - 1)];

      nextX += choice.dx;
      nextY += choice.dy;
    }

    if (
      canMoveTo(currentDungeon, nextX, nextY) &&
      distanceFromSpawn(enemy, nextX, nextY) <= enemy.maxSpawnDistance
    ) {
      enemy.x = nextX;
      enemy.y = nextY;
    }

    checkEnemyCollision();
  }

  renderDungeon(currentDungeon);
}

function regenerate() {
  currentDungeon = generateDungeon();
  renderDungeon(currentDungeon);
}

setInterval(() => {
  if (!currentDungeon) return;
  moveEnemies();
}, 600);

setInterval(() => {
  handlePlayerMovement();
}, 16);

generateBtn.addEventListener("click", regenerate);

regenerate();