function getDashStatusText() {
  const dashRemaining = Math.max(
    0,
    Math.ceil((dashCooldown - (Date.now() - lastDashTime)) / 1000)
  );

  return dashRemaining <= 0 ? "Ready" : `${dashRemaining}s`;
}

function loadCanvasUiSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(UI_STORAGE_KEY));
    if (!saved) return;
    canvasUi.settings = { ...canvasUi.settings, ...saved };
  } catch (_) {
    canvasUi.settings = { showHud: true, controlsMode: "auto" };
  }
}

function saveCanvasUiSettings() {
  localStorage.setItem(UI_STORAGE_KEY, JSON.stringify(canvasUi.settings));
}

function isSmallScreen() {
  return Math.min(window.innerWidth, window.innerHeight) <= MOBILE_CONTROL_BREAKPOINT;
}

function shouldShowMobileControls() {
  if (canvasUi.settings.controlsMode === "show") return true;
  if (canvasUi.settings.controlsMode === "hide") return false;
  return isSmallScreen();
}

function getCanvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  const clientX = event.clientX ?? event.touches?.[0]?.clientX;
  const clientY = event.clientY ?? event.touches?.[0]?.clientY;

  return {
    x: ((clientX - rect.left) / rect.width) * canvas.width,
    y: ((clientY - rect.top) / rect.height) * canvas.height,
  };
}

function addHitbox(id, x, y, width, height, onClick, options = {}) {
  canvasUi.hitboxes.push({ id, x, y, width, height, onClick, ...options });
}

function pointInBox(point, box) {
  return (
    point.x >= box.x &&
    point.x <= box.x + box.width &&
    point.y >= box.y &&
    point.y <= box.y + box.height
  );
}

function pointInCircle(point, circle) {
  return Math.hypot(point.x - circle.x, point.y - circle.y) <= circle.radius;
}

function clearCanvasUiHitboxes() {
  canvasUi.hitboxes = [];
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

function drawPanel(x, y, width, height, title) {
  ctx.save();
  ctx.fillStyle = "rgba(15, 23, 42, 0.88)";
  drawRoundedRect(ctx, x, y, width, height, 16);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "#c4b5fd";
  ctx.font = "700 20px system-ui";
  ctx.fillText(title, x + 16, y + 32);
  ctx.restore();
}

function drawLabelValue(label, value, x, y) {
  ctx.fillStyle = "#9ca3af";
  ctx.font = "14px system-ui";
  ctx.fillText(label, x, y);
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 18px system-ui";
  ctx.fillText(String(value), x, y + 24);
}

function drawButton(id, label, x, y, width, height, onClick, disabled = false) {
  addHitbox(id, x, y, width, height, onClick, { disabled });

  ctx.save();
  ctx.globalAlpha = disabled ? 0.45 : 1;
  ctx.fillStyle = disabled ? "#374151" : "#2563eb";
  drawRoundedRect(ctx, x, y, width, height, 12);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "700 15px system-ui";
  ctx.fillText(label, x + width / 2, y + height / 2);
  ctx.restore();
}

function drawToggleButton(id, label, valueText, x, y, width, height, onClick) {
  addHitbox(id, x, y, width, height, onClick);

  ctx.save();
  ctx.fillStyle = "#1f2937";
  drawRoundedRect(ctx, x, y, width, height, 12);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "#d1d5db";
  ctx.font = "13px system-ui";
  ctx.fillText(label, x + 14, y + 21);
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 15px system-ui";
  ctx.fillText(valueText, x + 14, y + 44);
  ctx.restore();
}

function drawTitleBar() {
  ctx.fillStyle = "#f8fafc";
  ctx.font = "800 30px system-ui";
  ctx.fillText("Dungeon Generator Game V1.1.6", 20, 48);

  ctx.fillStyle = "#94a3b8";
  ctx.font = "15px system-ui";
}

function drawLeftInfoPanel() {
  drawPanel(LEFT_PANEL.x, LEFT_PANEL.y, LEFT_PANEL.width, LEFT_PANEL.height, "Run Info");

  const x = LEFT_PANEL.x + 18;
  let y = LEFT_PANEL.y + 72;
  drawLabelValue("Floor", dungeonFloor, x, y); y += 62;
  drawLabelValue("Score", score, x, y); y += 62;
  drawLabelValue("Gold", `${gold}g`, x, y); y += 62;
  drawLabelValue("Health", `${health}/${maxHealth}`, x, y); y += 62;
  drawLabelValue("Armour", `${armourLevel}/${MAX_ARMOUR_LEVEL}`, x, y); y += 62;
  drawLabelValue("Chest Key", hasChestKey ? "Yes" : "No", x, y); y += 62;
  drawLabelValue("Dash", getDashStatusText(), x, y);
}

function getControlsModeLabel() {
  if (canvasUi.settings.controlsMode === "show") return "Always show";
  if (canvasUi.settings.controlsMode === "hide") return "Hidden";
  return "Auto mobile";
}

function cycleControlsMode() {
  const modes = ["auto", "show", "hide"];
  const currentIndex = modes.indexOf(canvasUi.settings.controlsMode);
  canvasUi.settings.controlsMode = modes[(currentIndex + 1) % modes.length];
  saveCanvasUiSettings();
  renderDungeon(currentDungeon);
}

function toggleCanvasHud() {
  canvasUi.settings.showHud = !canvasUi.settings.showHud;
  saveCanvasUiSettings();
  renderDungeon(currentDungeon);
}

function toggleSettingsPanel() {
  canvasUi.settingsPanelOpen = !canvasUi.settingsPanelOpen;
  renderDungeon(currentDungeon);
}

function isFullscreenActive() {
  return Boolean(document.fullscreenElement);
}

function toggleFullscreenMode() {
  if (!document.fullscreenEnabled) return;

  if (isFullscreenActive()) {
    document.exitFullscreen?.();
    return;
  }

  (gameShell || document.documentElement).requestFullscreen?.();
}

function drawRightControlPanel() {
  const panel = FULL_RIGHT_PANEL;
  drawPanel(panel.x, panel.y, panel.width, panel.height, "Controls");

  const x = panel.x + 18;
  let y = panel.y + 56;
  const width = panel.width - 36;
  const height = 42;
  const gap = 12;

  drawButton(
    "settingsToggle",
    canvasUi.settingsPanelOpen ? "Close Settings" : "Settings",
    x,
    y,
    width,
    height,
    toggleSettingsPanel
  );
  y += height + gap;

  if (canvasUi.settingsPanelOpen) {
    ctx.fillStyle = "#c4b5fd";
    ctx.font = "700 18px system-ui";
    ctx.fillText("Settings", x, y + 18); y += 32;

    drawToggleButton(
      "fullscreenToggle",
      "Fullscreen Mode",
      document.fullscreenEnabled ? (isFullscreenActive() ? "Exit fullscreen" : "Enter fullscreen") : "Unavailable",
      x,
      y,
      width,
      58,
      toggleFullscreenMode
    ); y += 70;

    drawToggleButton("controlsMode", "Touch Controls", getControlsModeLabel(), x, y, width, 58, cycleControlsMode); y += 70;
    drawToggleButton("hudToggle", "Canvas HUD", canvasUi.settings.showHud ? "Shown" : "Hidden", x, y, width, 58, toggleCanvasHud); y += 82;

    ctx.fillStyle = "#94a3b8";
    ctx.font = "13px system-ui";
    ctx.fillText("More options can be added here.", x, y);
    return;
  }

  drawButton("generate", "Reset Dungeon", x, y, width, height, () => {
    setActiveOverlay("confirmReset");
  }); y += height + gap;
  
  drawButton("openHowToPlay", "How To Play", x, y, width, height, () => openHowToPlay(null)); y += height + gap + 8;

  ctx.fillStyle = "#c4b5fd";
  ctx.font = "700 18px system-ui";
  ctx.fillText("Shop", x, y + 18); y += 34;

  drawButton("buyHealth", `Max Health (${HEALTH_UPGRADE_COST}g)`, x, y, width, height, buyMaxHealth, !canBuyMaxHealth()); y += height + gap;
  drawButton("heal", `Heal (${HEAL_COST}g)`, x, y, width, height, buyHeal, !canBuyHeal()); y += height + gap;
  drawButton("armour", armourLevel >= MAX_ARMOUR_LEVEL ? "Armour Maxed" : `Armour (${armourCost}g)`, x, y, width, height, buyArmour, !canBuyArmour()); y += height + gap;
  drawButton("dashUpgrade", dashLevel >= MAX_DASH_LEVEL ? "Dash Maxed" : `Dash Upgrade (${dashUpgradeCost}g)`, x, y, width, height, buyDashUpgrade, !canBuyDashUpgrade());
}
function drawInternalHud() {
  if (!canvasUi.settings.showHud) return;

  const hudLines = [
    `Score: ${score}`,
    `Gold: ${gold}`,
    `Health: ${health}/${maxHealth}`,
    `Floor: ${dungeonFloor}`,
    `Dash: ${getDashStatusText()}`,
  ];

  const hudX = BOARD_X + 12;
  const hudY = BOARD_Y + 12;
  const lineHeight = 23;
  const panelWidth = 190;
  const panelHeight = hudLines.length * lineHeight + 16;

  ctx.save();
  ctx.fillStyle = `rgba(0, 0, 0, ${CANVAS_HUD_PANEL_OPACITY})`;
  drawRoundedRect(ctx, hudX, hudY, panelWidth, panelHeight, CANVAS_HUD_PANEL_RADIUS);
  ctx.fillStyle = "#ffffff";
  ctx.font = "16px system-ui";
  hudLines.forEach((line, index) => {
    ctx.fillText(line, hudX + 12, hudY + 24 + index * lineHeight);
  });
  ctx.restore();
}

function drawMobileControls() {
  if (!shouldShowMobileControls()) return;

  const base = JOYSTICK_CENTER;
  const vector = canvasUi.joystickVector;
  const knobX = base.x + vector.x * JOYSTICK_RADIUS;
  const knobY = base.y + vector.y * JOYSTICK_RADIUS;

  ctx.save();
  ctx.fillStyle = "rgba(15, 23, 42, 0.72)";
  ctx.beginPath();
  ctx.arc(base.x, base.y, JOYSTICK_RADIUS, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.28)";
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = "rgba(148, 163, 184, 0.88)";
  ctx.beginPath();
  ctx.arc(knobX, knobY, JOYSTICK_KNOB_RADIUS, 0, Math.PI * 2);
  ctx.fill();

  drawRoundActionButton("sprint", "Sprint", 1020, 650, 40, true);
  drawRoundActionButton("dash", "Dash", 1110, 650, 40, false);
  ctx.restore();
}

function drawRoundActionButton(id, label, x, y, radius, holdKeyMode) {
  addHitbox(id, x - radius, y - radius, radius * 2, radius * 2, () => {
    if (!holdKeyMode) tryDash();
  }, { circle: { x, y, radius }, holdKey: holdKeyMode ? "shift" : null });

  const isActive = canvasUi.activeMobileButtons.has(id);

  ctx.save();
  ctx.fillStyle = id === "dash" ? "rgba(220, 38, 38, 0.82)" : "rgba(37, 99, 235, 0.82)";
  if (isActive) ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = isActive ? "rgba(255,255,255,0.78)" : "rgba(255,255,255,0.28)";
  ctx.lineWidth = isActive ? 5 : 3;
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "700 15px system-ui";
  ctx.fillText(label, x, y);
  ctx.restore();
}

function drawGameUi() {
  clearCanvasUiHitboxes();
  drawTitleBar();
  drawLeftInfoPanel();
  drawRightControlPanel();
  drawInternalHud();
  drawMobileControls();
}

function drawOverlayButton(id, label, x, y, width, height, onClick, disabled = false) {
  drawButton(id, label, x, y, width, height, onClick, disabled);
}

function drawOverlayCard(title, subtitle, height = 430) {
  const width = 560;
  const x = (canvas.width - width) / 2;
  const y = (canvas.height - height) / 2;

  ctx.save();
  ctx.fillStyle = "rgba(2, 6, 23, 0.68)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "rgba(15, 23, 42, 0.96)";
  drawRoundedRect(ctx, x, y, width, height, 24);
  ctx.strokeStyle = "rgba(196, 181, 253, 0.42)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.fillStyle = "#f8fafc";
  ctx.font = "900 42px system-ui";
  ctx.fillText(title, x + width / 2, y + 70);

  if (subtitle) {
    ctx.fillStyle = "#c4b5fd";
    ctx.font = "600 18px system-ui";
    ctx.fillText(subtitle, x + width / 2, y + 104);
  }

  ctx.restore();
  return { x, y, width, height };
}

function drawStartOverlay() {
  const card = drawOverlayCard("Dungeon Crawler", "Collect treasure, find keys, survive deeper floors.", 450);
  const buttonX = card.x + 150;
  let y = card.y + 155;

  drawOverlayButton("startGame", "Start Game", buttonX, y, 260, 50, closeOverlay); y += 66;
  drawOverlayButton("startHowToPlay", "How To Play", buttonX, y, 260, 50, () => openHowToPlay("start")); y += 66;
  drawOverlayButton("startFullscreen", isFullscreenActive() ? "Exit Fullscreen" : "Fullscreen", buttonX, y, 260, 50, toggleFullscreenMode); y += 72;

  ctx.save();
  ctx.textAlign = "center";
  ctx.fillStyle = "#94a3b8";
  ctx.font = "14px system-ui";
  ctx.fillText("Enter starts · Works with keyboard, mouse, touch, and mobile controls", card.x + card.width / 2, y);
  ctx.restore();
}

function drawHowToPlayOverlay() {
  const card = drawOverlayCard("How To Play", "The game is paused while this screen is open.", 560);
  const x = card.x + 58;
  let y = card.y + 150;
  const lines = [
    "Move: WASD / Arrow keys, or the joystick.",
    "Sprint: hold Shift, or the Sprint button.",
    "Dash: press Space, or tap the Dash button.",
    "Treasure gives score and gold. Spend gold in the shop.",
    "Orange keys open grand chests (Bright Yellow).",
    "Red exits move to the next floor.",
    "Enemies hurt you on contact, but drop gold.",
    "Armour reduces damage.",
    "Dash gives brief invulnerability.",
  ];

  ctx.save();
  ctx.textAlign = "left";
  ctx.fillStyle = "#e5e7eb";
  ctx.font = "16px system-ui";
  for (const line of lines) {
    ctx.fillText(line, x, y);
    y += 32;
  }
  ctx.restore();

  y = card.y + card.height - 86;
  drawOverlayButton("howToBack", "Back", card.x + 70, y, 190, 48, closeHowToPlay);
  drawOverlayButton("howToResume", "Resume", card.x + 300, y, 190, 48, closeOverlay);
}

function drawDeathOverlay() {
  const card = drawOverlayCard("You Died", "The dungeon claims another run.", 470);
  const stats = lastRunStats || { floor: dungeonFloor, score, gold };

  ctx.save();
  ctx.textAlign = "center";
  ctx.fillStyle = "#e5e7eb";
  ctx.font = "700 22px system-ui";
  ctx.fillText(`Floor Reached: ${stats.floor}`, card.x + card.width / 2, card.y + 155);
  ctx.fillText(`Score: ${stats.score}`, card.x + card.width / 2, card.y + 190);
  ctx.fillText(`Gold Collected: ${stats.gold}g`, card.x + card.width / 2, card.y + 225);

  ctx.fillStyle = "#94a3b8";
  ctx.font = "15px system-ui";
  ctx.fillText("Press Enter or tap New Run to try again.", card.x + card.width / 2, card.y + 270);
  ctx.restore();

  drawOverlayButton("deathRestart", "New Run", card.x + 150, card.y + 315, 260, 50, resetRun);
}

function drawOverlayScreen() {
  if (!activeOverlay) return;

  if (activeOverlay === "start") drawStartOverlay();
  if (activeOverlay === "howToPlay") drawHowToPlayOverlay();
  if (activeOverlay === "death") drawDeathOverlay();
  if (activeOverlay === "confirmReset") drawConfirmResetOverlay();
}

function drawConfirmResetOverlay() {
  const card = drawOverlayCard("Generate New Dungeon", "This will reset your current run.", 400);
  const buttonX = card.x + 150;
  let y = card.y + 155;
  
  drawOverlayButton("confirmReset", "Confirm", buttonX, y, 260, 50, confirmGenerateDungeon); y += 66;
  drawOverlayButton("cancelReset", "Cancel", buttonX, y, 260, 50, closeOverlay);
}


function confirmGenerateDungeon() {
  closeOverlay();
  resetRun();
  regenerate();
}