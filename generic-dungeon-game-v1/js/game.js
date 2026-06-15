function regenerate() {
  currentDungeon = generateDungeon();
  renderDungeon(currentDungeon);
}

function isGamePaused() {
  return Boolean(activeOverlay);
}

function setActiveOverlay(overlayName) {
  activeOverlay = overlayName;
  releaseAllCanvasPointers();
  releaseJoystickKeys();
  keysHeld.clear();
  canvasUi.activeMobileButtons.clear();
  renderDungeon(currentDungeon);
}

function closeOverlay() {
  setActiveOverlay(null);
}

function openHowToPlay(returnTarget = activeOverlay || null) {
  overlayReturnTarget = returnTarget || null;
  setActiveOverlay("howToPlay");
}

function closeHowToPlay() {
  setActiveOverlay(overlayReturnTarget);
}

function releaseJoystickKeys() {
  ["arrowup", "arrowdown", "arrowleft", "arrowright"].forEach(key => keysHeld.delete(key));
  canvasUi.joystickVector = { x: 0, y: 0 };
}

function releasePointer(pointerId) {
  const pointerState = canvasUi.activePointers.get(pointerId);
  if (!pointerState) return;

  if (pointerState.mode === "joystick") {
    releaseJoystickKeys();
    canvasUi.joystickPointerId = null;
  }

  if (pointerState.mode === "holdKey" && pointerState.holdKey) {
    keysHeld.delete(pointerState.holdKey);
    canvasUi.activeMobileButtons.delete(pointerState.id);
  }

  canvasUi.activePointers.delete(pointerId);
}

function releaseAllCanvasPointers() {
  for (const pointerId of canvasUi.activePointers.keys()) {
    releasePointer(pointerId);
  }
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

  if (activeOverlay) {
    if (!hitbox || hitbox.disabled) return;
    hitbox.onClick?.();
    renderDungeon(currentDungeon);
    return;
  }

  if (shouldShowMobileControls() && pointInCircle(point, { ...JOYSTICK_CENTER, radius: JOYSTICK_RADIUS + 26 })) {
    if (canvasUi.joystickPointerId !== null && canvasUi.joystickPointerId !== event.pointerId) {
      releasePointer(canvasUi.joystickPointerId);
    }

    canvasUi.joystickPointerId = event.pointerId;
    canvasUi.activePointers.set(event.pointerId, { mode: "joystick" });
    updateJoystickFromPoint(point);
    renderDungeon(currentDungeon);
    return;
  }

  if (!hitbox || hitbox.disabled) return;

  if (hitbox.holdKey) {
    canvasUi.activePointers.set(event.pointerId, {
      mode: "holdKey",
      holdKey: hitbox.holdKey,
      id: hitbox.id,
    });
    canvasUi.activeMobileButtons.add(hitbox.id);
    keysHeld.add(hitbox.holdKey);
    renderDungeon(currentDungeon);
    return;
  }

  canvasUi.activePointers.set(event.pointerId, {
    mode: "tapAction",
    id: hitbox.id,
  });
  canvasUi.activeMobileButtons.add(hitbox.id);
  hitbox.onClick?.();
  renderDungeon(currentDungeon);
}

function handleCanvasPointerMove(event) {
  const pointerState = canvasUi.activePointers.get(event.pointerId);
  if (!pointerState || pointerState.mode !== "joystick") return;

  event.preventDefault();
  updateJoystickFromPoint(getCanvasPoint(event));
  renderDungeon(currentDungeon);
}

function handleCanvasPointerUp(event) {
  if (!canvasUi.activePointers.has(event.pointerId)) return;

  event.preventDefault();
  const pointerState = canvasUi.activePointers.get(event.pointerId);
  if (pointerState?.id) canvasUi.activeMobileButtons.delete(pointerState.id);
  releasePointer(event.pointerId);
  canvas.releasePointerCapture?.(event.pointerId);
  renderDungeon(currentDungeon);
}

function bindControls() {
  canvas.addEventListener("pointerdown", handleCanvasPointerDown);
  canvas.addEventListener("pointermove", handleCanvasPointerMove);
  canvas.addEventListener("pointerup", handleCanvasPointerUp);
  canvas.addEventListener("pointercancel", handleCanvasPointerUp);
  canvas.addEventListener("lostpointercapture", handleCanvasPointerUp);

  window.addEventListener("blur", () => {
    releaseAllCanvasPointers();
    releaseJoystickKeys();
    keysHeld.delete("shift");
    canvasUi.activeMobileButtons.clear();
    renderDungeon(currentDungeon);
  });

  window.addEventListener("keydown", event => {
    const key = event.key.toLowerCase();

    if (activeOverlay) {
      if (event.key === "Escape" && activeOverlay === "howToPlay") closeHowToPlay();
      if (event.key === "Enter" && activeOverlay === "start") closeOverlay();
      if (event.key === "Enter" && activeOverlay === "death") resetRun();
      return;
    }

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
  document.addEventListener("fullscreenchange", () => renderDungeon(currentDungeon));
}


function startGame() {
  loadCanvasUiSettings();
  bindControls();
  regenerate();

  setInterval(() => {
    if (!currentDungeon || isGamePaused()) return;
    moveEnemies();
  }, ENEMY_MOVE_INTERVAL);

  setInterval(() => {
    if (!isGamePaused()) handlePlayerMovement();
  }, PLAYER_INPUT_INTERVAL);

  setInterval(() => {
    renderDungeon(currentDungeon);
  }, 500);
}

startGame();
