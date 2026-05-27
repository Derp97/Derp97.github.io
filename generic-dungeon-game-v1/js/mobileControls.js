const MOBILE_DIRECTION_KEYS = ["arrowup", "arrowdown", "arrowleft", "arrowright"];

function holdKey(keyName) {
  keysHeld.add(keyName);
}

function releaseKey(keyName) {
  keysHeld.delete(keyName);
}

function releaseMobileDirections() {
  MOBILE_DIRECTION_KEYS.forEach(releaseKey);
  mobileDpad?.classList.remove("is-active");
  if (mobileJoystickKnob) {
    mobileJoystickKnob.style.transform = "translate(-50%, -50%)";
  }
}

function clampJoystickVector(x, y, maxDistance) {
  const distance = Math.hypot(x, y);

  if (distance <= maxDistance) {
    return { x, y, distance };
  }

  const scale = maxDistance / distance;
  return {
    x: x * scale,
    y: y * scale,
    distance: maxDistance,
  };
}

function setMobileDirectionFromJoystick(event) {
  if (!mobileDpad) return;

  const rect = mobileDpad.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const rawX = event.clientX - centerX;
  const rawY = event.clientY - centerY;
  const maxDistance = Math.min(rect.width, rect.height) * 0.32;
  const deadZone = Math.min(rect.width, rect.height) * 0.12;
  const vector = clampJoystickVector(rawX, rawY, maxDistance);

  MOBILE_DIRECTION_KEYS.forEach(releaseKey);
  mobileDpad.classList.add("is-active");

  if (mobileJoystickKnob) {
    mobileJoystickKnob.style.transform = `translate(calc(-50% + ${vector.x}px), calc(-50% + ${vector.y}px))`;
  }

  if (vector.distance < deadZone) return;

  if (vector.y < -deadZone) holdKey("arrowup");
  if (vector.y > deadZone) holdKey("arrowdown");
  if (vector.x < -deadZone) holdKey("arrowleft");
  if (vector.x > deadZone) holdKey("arrowright");
}

function bindVirtualJoystick() {
  if (!mobileDpad) return;

  const startJoystickInput = event => {
    event.preventDefault();
    mobileDpad.setPointerCapture?.(event.pointerId);
    setMobileDirectionFromJoystick(event);
  };

  const updateJoystickInput = event => {
    if (!mobileDpad.hasPointerCapture?.(event.pointerId)) return;
    event.preventDefault();
    setMobileDirectionFromJoystick(event);
  };

  const endJoystickInput = event => {
    event.preventDefault();
    releaseMobileDirections();
    mobileDpad.releasePointerCapture?.(event.pointerId);
  };

  mobileDpad.addEventListener("pointerdown", startJoystickInput);
  mobileDpad.addEventListener("pointermove", updateJoystickInput);
  mobileDpad.addEventListener("pointerup", endJoystickInput);
  mobileDpad.addEventListener("pointercancel", endJoystickInput);
  mobileDpad.addEventListener("lostpointercapture", releaseMobileDirections);
}

function bindHoldButton(button) {
  const keyName = button.dataset.holdKey;
  if (!keyName) return;

  const startHold = event => {
    event.preventDefault();
    button.setPointerCapture?.(event.pointerId);
    holdKey(keyName);
    button.classList.add("is-pressed");
  };

  const endHold = event => {
    event.preventDefault();
    releaseKey(keyName);
    button.classList.remove("is-pressed");
    button.releasePointerCapture?.(event.pointerId);
  };

  button.addEventListener("pointerdown", startHold);
  button.addEventListener("pointerup", endHold);
  button.addEventListener("pointercancel", endHold);
  button.addEventListener("lostpointercapture", () => {
    releaseKey(keyName);
    button.classList.remove("is-pressed");
  });
}

function bindMobileControls() {
  if (!mobileControls) return;

  bindVirtualJoystick();
  mobileControls.querySelectorAll("[data-hold-key]").forEach(bindHoldButton);

  mobileDashBtn?.addEventListener("pointerdown", event => {
    event.preventDefault();
    mobileDashBtn.setPointerCapture?.(event.pointerId);
    mobileDashBtn.classList.add("is-pressed");
    tryDash();
  });

  const releaseDashButton = event => {
    event?.preventDefault?.();
    mobileDashBtn?.classList.remove("is-pressed");
    if (event?.pointerId !== undefined) {
      mobileDashBtn?.releasePointerCapture?.(event.pointerId);
    }
  };

  mobileDashBtn?.addEventListener("pointerup", releaseDashButton);
  mobileDashBtn?.addEventListener("pointercancel", releaseDashButton);
  mobileDashBtn?.addEventListener("lostpointercapture", releaseDashButton);
}
