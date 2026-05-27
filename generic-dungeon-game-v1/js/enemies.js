function getAvailableEnemyTypes() {
  return Object.values(ENEMY_TYPES).filter(type =>
    dungeonFloor >= type.unlockFloor
  );
}

function getRandomEnemyType() {
  const availableTypes = getAvailableEnemyTypes();
  return availableTypes[randomInt(0, availableTypes.length - 1)];
}

function distanceFromSpawn(enemy, x, y) {
  return distance(x, y, enemy.spawnX, enemy.spawnY);
}

function moveEnemies() {
  for (const enemy of enemies) {
    const playerDistance = distance(enemy.x, enemy.y, player.x, player.y);

    if (playerDistance <= enemy.aggroRange) {
      enemy.aggro = true;
      enemy.aggroTimer = 12;
    }

    if (enemy.aggroTimer > 0) {
      enemy.aggroTimer--;
    } else {
      enemy.aggro = false;
    }

    let nextX = enemy.x;
    let nextY = enemy.y;

    if (enemy.aggro) {
      if (player.x > enemy.x) nextX++;
      else if (player.x < enemy.x) nextX--;

      if (player.y > enemy.y) nextY++;
      else if (player.y < enemy.y) nextY--;
    } else {
      const directions = [
        { dx: 0, dy: -1 },
        { dx: 0, dy: 1 },
        { dx: -1, dy: 0 },
        { dx: 1, dy: 0 },
        { dx: 0, dy: 0 },
      ];

      const choice = directions[randomInt(0, directions.length - 1)];
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
