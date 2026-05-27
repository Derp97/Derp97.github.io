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

  const isInvulnerable = Date.now() < invulnerableUntil;
  ctx.fillStyle = isInvulnerable ? "#fef08a" : "#38bdf8";
  ctx.fillRect(
    player.x * TILE_SIZE + 3,
    player.y * TILE_SIZE + 3,
    TILE_SIZE - 6,
    TILE_SIZE - 6
  );

  if (showCanvasHudToggle.checked) {
    const hudLines = [
      `Score: ${score}`,
      `Gold: ${gold}`,
      `Health: ${health}/${maxHealth}`,
      `Armour: ${armourLevel}/${MAX_ARMOUR_LEVEL}`,
      `Floor: ${dungeonFloor}`,
      `Key: ${hasChestKey ? "Yes" : "No"}`,
      `Dash: ${getDashStatusText()}`,
    ];

    const hudX = 10;
    const hudY = 10;
    const lineHeight = 24;
    const panelWidth = 210;
    const panelHeight = hudLines.length * lineHeight + CANVAS_HUD_PANEL_PADDING;

    ctx.save();
    ctx.globalAlpha = CANVAS_HUD_PANEL_OPACITY;
    ctx.fillStyle = "#000000";
    drawRoundedRect(ctx, hudX - 4, hudY - 2, panelWidth, panelHeight, CANVAS_HUD_PANEL_RADIUS);
    ctx.restore();

    ctx.fillStyle = "#ffffff";
    ctx.font = "18px system-ui";
    hudLines.forEach((line, index) => {
      ctx.fillText(line, hudX + 8, hudY + 16 + index * lineHeight);
    });
  }

  updateGameInfoPanel();
  updateShopButtons();
}

function drawRoundedRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
  context.fill();
}
