function renderDungeon(grid) {
  if (!grid) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.fillStyle = "#020617";
  drawRoundedRect(ctx, BOARD_X - 10, BOARD_Y - 10, BOARD_WIDTH + 20, BOARD_HEIGHT + 20, 16);
  ctx.restore();

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

      ctx.fillRect(
        BOARD_X + x * TILE_SIZE,
        BOARD_Y + y * TILE_SIZE,
        TILE_SIZE,
        TILE_SIZE
      );
    }
  }

  for (const enemy of enemies) {
    ctx.fillStyle = enemy.color;
    ctx.fillRect(
      BOARD_X + enemy.x * TILE_SIZE + 4,
      BOARD_Y + enemy.y * TILE_SIZE + 4,
      TILE_SIZE - 8,
      TILE_SIZE - 8
    );
  }

  const isInvulnerable = Date.now() < invulnerableUntil;
  ctx.fillStyle = isInvulnerable ? "#fef08a" : "#38bdf8";
  ctx.fillRect(
    BOARD_X + player.x * TILE_SIZE + 3,
    BOARD_Y + player.y * TILE_SIZE + 3,
    TILE_SIZE - 6,
    TILE_SIZE - 6
  );

  drawGameUi();
  drawOverlayScreen();
}
