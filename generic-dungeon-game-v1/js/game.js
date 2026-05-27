function regenerate() {
  currentDungeon = generateDungeon();
  renderDungeon(currentDungeon);
}

function bindControls() {
  buyMaxHealthBtn.addEventListener("click", buyMaxHealth);
  healBtn.addEventListener("click", buyHeal);
  buyArmourBtn.addEventListener("click", buyArmour);
  buyDashBtn.addEventListener("click", buyDashUpgrade);
  generateBtn.addEventListener("click", regenerate);
  showCanvasHudToggle.addEventListener("change", () => renderDungeon(currentDungeon));

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
}

function startGame() {
  initUiLayoutSetting();
  bindControls();
  bindMobileControls();
  regenerate();

  setInterval(() => {
    if (!currentDungeon) return;
    moveEnemies();
  }, ENEMY_MOVE_INTERVAL);

  setInterval(() => {
    handlePlayerMovement();
  }, PLAYER_INPUT_INTERVAL);
}

startGame();
