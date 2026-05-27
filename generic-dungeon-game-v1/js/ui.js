function getDashStatusText() {
  const dashRemaining = Math.max(
    0,
    Math.ceil((dashCooldown - (Date.now() - lastDashTime)) / 1000)
  );

  return dashRemaining <= 0 ? "Ready" : `${dashRemaining}s`;
}

function updateGameInfoPanel() {
  floorValue.textContent = dungeonFloor;
  scoreValue.textContent = score;
  goldValue.textContent = gold;
  healthValue.textContent = `${health}/${maxHealth}`;
  armourValue.textContent = `${armourLevel}/${MAX_ARMOUR_LEVEL}`;
  keyValue.textContent = hasChestKey ? "Yes" : "No";
  dashValue.textContent = getDashStatusText();
}


const UI_LAYOUT_STORAGE_KEY = "dungeonUiLayout";

function applyUiLayout(layoutMode) {
  document.body.classList.remove("ui-layout-desktop", "ui-layout-mobile");

  if (layoutMode === "desktop") {
    document.body.classList.add("ui-layout-desktop");
  }

  if (layoutMode === "mobile") {
    document.body.classList.add("ui-layout-mobile");
  }
}

function initUiLayoutSetting() {
  const savedLayout = localStorage.getItem(UI_LAYOUT_STORAGE_KEY) || "auto";
  uiLayoutSelect.value = savedLayout;
  applyUiLayout(savedLayout);

  uiLayoutSelect.addEventListener("change", () => {
    const selectedLayout = uiLayoutSelect.value;
    localStorage.setItem(UI_LAYOUT_STORAGE_KEY, selectedLayout);
    applyUiLayout(selectedLayout);
  });
}
