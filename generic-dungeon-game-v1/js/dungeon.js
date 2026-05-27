function createGrid() {
  return Array.from({ length: GRID_HEIGHT }, () =>
    Array.from({ length: GRID_WIDTH }, () => EMPTY)
  );
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
  return distance(a.x, a.y, b.x, b.y);
}

function getFurthestRoomFrom(startRoom, rooms) {
  let furthestRoom = startRoom;
  let furthestDistance = 0;

  for (const room of rooms) {
    const roomDistance = distanceBetweenRooms(startRoom, room);

    if (roomDistance > furthestDistance) {
      furthestDistance = roomDistance;
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

    const overlaps = rooms.some(existingRoom => roomsOverlap(room, existingRoom));

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
