function updateShopButtons() {
  buyMaxHealthBtn.disabled = gold < HEALTH_UPGRADE_COST;
  healBtn.disabled = gold < HEAL_COST || health >= maxHealth;
  buyArmourBtn.disabled = gold < armourCost || armourLevel >= MAX_ARMOUR_LEVEL;
  buyDashBtn.disabled = gold < dashUpgradeCost || dashLevel >= MAX_DASH_LEVEL;

  buyMaxHealthBtn.textContent = `Buy Max Health (${HEALTH_UPGRADE_COST}g)`;
  healBtn.textContent = `Heal (${HEAL_COST}g)`;

  buyArmourBtn.textContent =
    armourLevel >= MAX_ARMOUR_LEVEL
      ? "Armour Maxed"
      : `Buy Armour (${armourCost}g)`;

  buyDashBtn.textContent =
    dashLevel >= MAX_DASH_LEVEL
      ? "Dash Maxed"
      : `Upgrade Dash (${dashUpgradeCost}g)`;
}

function buyMaxHealth() {
  if (gold < HEALTH_UPGRADE_COST) return;

  gold -= HEALTH_UPGRADE_COST;
  maxHealth += 10;
  health += 10;

  renderDungeon(currentDungeon);
}

function buyHeal() {
  if (gold < HEAL_COST) return;

  gold -= HEAL_COST;
  health += 10;
  if (health > maxHealth) health = maxHealth;

  renderDungeon(currentDungeon);
}

function buyArmour() {
  if (gold < armourCost) return;
  if (armourLevel >= MAX_ARMOUR_LEVEL) return;

  gold -= armourCost;
  armourLevel += 1;
  armourCost += 25;

  renderDungeon(currentDungeon);
}

function buyDashUpgrade() {
  if (dashLevel >= MAX_DASH_LEVEL) return;
  if (gold < dashUpgradeCost) return;

  gold -= dashUpgradeCost;
  dashLevel += 1;

  dashCooldown = Math.max(
    MIN_DASH_COOLDOWN,
    STARTING_DASH_COOLDOWN - DASH_COOLDOWN_STEP * dashLevel
  );

  dashUpgradeCost += 25;

  renderDungeon(currentDungeon);
}
