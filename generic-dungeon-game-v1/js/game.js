function regenerate() {
  currentDungeon = generateDungeon();
  renderDungeon(currentDungeon);
}

function releaseJoystickKeys() {
  ["arrowup", "arrowdown", "arrowleft", "arrowright"].forEach(key => keysHeld.delete(key));
  canvasUi.joystickVector = { x: 0, y: 0 };
}

function updateJoystickFromPoint(point) {
  const rawX = point.x - JOYSTICK_CENTER.x;
  const rawY = point.y - JOYSTICK_CENTER.y;
  const distance = Math.hypot(rawX, rawY);
  const maxDistance = JOYSTICK_RADIUS;
  const deadZone = 12;
  const scale = distance > maxDistance ? maxDistance / distance : 1;
  const x = rawX * scale;
  const y = rawY * scale;

  releaseJoystickKeys();

  canvasUi.joystickVector = {
    x: x / maxDistance,
    y: y / maxDistance,
  };

  if (distance < deadZone) return;

  if (y < -deadZone) keysHeld.add("arrowup");
  if (y > deadZone) keysHeld.add("arrowdown");
  if (x < -deadZone) keysHeld.add("arrowleft");
  if (x > deadZone) keysHeld.add("arrowright");
}

function getHitboxAt(point) {
  for (let i = canvasUi.hitboxes.length - 1; i >= 0; i--) {
    const box = canvasUi.hitboxes[i];
    if (box.circle && pointInCircle(point, box.circle)) return box;
    if (!box.circle && pointInBox(point, box)) return box;
  }
  return null;
}

function handleCanvasPointerDown(event) {
  const point = getCanvasPoint(event);
  const hitbox = getHitboxAt(point);

  event.preventDefault();
  canvas.focus?.();
  canvas.setPointerCapture?.(event.pointerId);
  canvasUi.activePointerId = event.pointerId;

  if (shouldShowMobileControls() && pointInCircle(point, { ...JOYSTICK_CENTER, radius: JOYSTICK_RADIUS + 26 })) {
    canvasUi.pointerMode = "joystick";
    updateJoystickFromPoint(point);
    renderDungeon(currentDungeon);
    return;
  }

  if (!hitbox || hitbox.disabled) return;

  if (hitbox.holdKey) {
    canvasUi.pointerMode = "holdKey";
    keysHeld.add(hitbox.holdKey);
    renderDungeon(currentDungeon);
    return;
  }

  hitbox.onClick?.();
}

function handleCanvasPointerMove(event) {
  if (canvasUi.activePointerId !== event.pointerId) return;
  if (canvasUi.pointerMode !== "joystick") return;

  event.preventDefault();
  updateJoystickFromPoint(getCanvasPoint(event));
  renderDungeon(currentDungeon);
}

function handleCanvasPointerUp(event) {
  if (canvasUi.activePointerId !== event.pointerId) return;

  event.preventDefault();

  if (canvasUi.pointerMode === "joystick") {
    releaseJoystickKeys();
  }

  if (canvasUi.pointerMode === "holdKey") {
    keysHeld.delete("shift");
  }

  canvasUi.pointerMode = null;
  canvasUi.activePointerId = null;
  canvas.releasePointerCapture?.(event.pointerId);
  renderDungeon(currentDungeon);
}

function bindControls() {
  canvas.addEventListener("pointerdown", handleCanvasPointerDown);
  canvas.addEventListener("pointermove", handleCanvasPointerMove);
  canvas.addEventListener("pointerup", handleCanvasPointerUp);
  canvas.addEventListener("pointercancel", handleCanvasPointerUp);

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

  window.addEventListener("resize", () => renderDungeon(currentDungeon));
}

function startGame() {
  loadCanvasUiSettings();
  bindControls();
  regenerate();

  setInterval(() => {
    if (!currentDungeon) return;
    moveEnemies();
  }, ENEMY_MOVE_INTERVAL);

  setInterval(() => {
    handlePlayerMovement();
  }, PLAYER_INPUT_INTERVAL);

  setInterval(() => {
    renderDungeon(currentDungeon);
  }, 500);
}

startGame();
