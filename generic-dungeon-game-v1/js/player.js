function collectTile(nextX, nextY, nextTile) {
  if (nextTile === TREASURE) {
    score += 1;
    gold += randomInt(3, 8);
    currentDungeon[nextY][nextX] = FLOOR;
    return true;
  }

  if (nextTile === CHEST_KEY) {
    hasChestKey = true;
    currentDungeon[nextY][nextX] = FLOOR;
    return true;
  }

  if (nextTile === GRAND_CHEST) {
    if (!hasChestKey) return false;

    score += 5;
    gold += randomInt(25, 50);
    hasChestKey = false;
    currentDungeon[nextY][nextX] = FLOOR;
    return true;
  }

  if (nextTile === EXIT) {
    score += dungeonFloor % 5 === 0 ? 10 : 5;
    dungeonFloor += 1;
    regenerate();
    return false;
  }

  return true;
}

function getMovementVector() {
  let dx = 0;
  let dy = 0;

  if (keysHeld.has("arrowup") || keysHeld.has("w")) dy -= 1;
  if (keysHeld.has("arrowdown") || keysHeld.has("s")) dy += 1;
  if (keysHeld.has("arrowleft") || keysHeld.has("a")) dx -= 1;
  if (keysHeld.has("arrowright") || keysHeld.has("d")) dx += 1;

  return { dx, dy };
}

function handlePlayerMovement() {
  if (!currentDungeon) return;

  const now = Date.now();
  isSprinting = keysHeld.has("shift");
  const currentCooldown = isSprinting ? sprintCooldown : moveCooldown;

  if (now - lastMoveTime < currentCooldown) return;

  const { dx, dy } = getMovementVector();

  if (dx === 0 && dy === 0) return;

  lastMoveTime = now;

  const nextX = player.x + dx;
  const nextY = player.y + dy;
  const nextTile = currentDungeon[nextY]?.[nextX];

  if (!canMoveTo(currentDungeon, nextX, nextY)) return;
  if (!collectTile(nextX, nextY, nextTile)) return;

  player.x = nextX;
  player.y = nextY;
  checkEnemyCollision();
  renderDungeon(currentDungeon);
}

function tryDash() {
  if (!currentDungeon) return;

  const now = Date.now();
  if (now - lastDashTime < dashCooldown) return;

  const { dx, dy } = getMovementVector();

  if (dx === 0 && dy === 0) return;

  lastDashTime = now;
  isDashing = true;
  invulnerableUntil = Date.now() + 250;

  for (let i = 0; i < DASH_DISTANCE; i++) {
    const nextX = player.x + dx;
    const nextY = player.y + dy;
    const nextTile = currentDungeon[nextY]?.[nextX];

    if (!canMoveTo(currentDungeon, nextX, nextY)) break;
    if (!collectTile(nextX, nextY, nextTile)) return;

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

  const enemy = enemies[enemyIndex];
  const damageReduction = armourLevel * 0.10;
  const finalDamage = Math.ceil(enemy.damage * (1 - damageReduction));

  health -= finalDamage;
  score += enemy.scoreValue;
  gold += randomInt(enemy.goldMin, enemy.goldMax);

  invulnerableUntil = Date.now() + HIT_INVULNERABILITY_TIME;
  enemies.splice(enemyIndex, 1);

  if (health <= 0) {
    resetRun();
  }
}

function resetRun() {
  gold = 0;
  score = 0;

  maxHealth = STARTING_MAX_HEALTH;
  health = maxHealth;

  armourLevel = 0;
  armourCost = STARTING_ARMOUR_COST;

  dashCooldown = STARTING_DASH_COOLDOWN;
  lastDashTime = 0;
  dashLevel = 0;
  dashUpgradeCost = STARTING_DASH_UPGRADE_COST;

  dungeonFloor = 1;
  hasChestKey = false;

  invulnerableUntil = 0;
  isDashing = false;

  regenerate();
}
