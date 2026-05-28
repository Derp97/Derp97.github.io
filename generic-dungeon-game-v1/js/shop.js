function canBuyMaxHealth() {
  return gold >= HEALTH_UPGRADE_COST;
}

function canBuyHeal() {
  return gold >= HEAL_COST && health < maxHealth;
}

function canBuyArmour() {
  return gold >= armourCost && armourLevel < MAX_ARMOUR_LEVEL;
}

function canBuyDashUpgrade() {
  return gold >= dashUpgradeCost && dashLevel < MAX_DASH_LEVEL;
}

function buyMaxHealth() {
  if (!canBuyMaxHealth()) return;

  gold -= HEALTH_UPGRADE_COST;
  maxHealth += 10;
  health += 10;

  renderDungeon(currentDungeon);
}

function buyHeal() {
  if (!canBuyHeal()) return;

  gold -= HEAL_COST;
  health += 10;
  if (health > maxHealth) health = maxHealth;

  renderDungeon(currentDungeon);
}

function buyArmour() {
  if (!canBuyArmour()) return;

  gold -= armourCost;
  armourLevel += 1;
  armourCost += 25;

  renderDungeon(currentDungeon);
}

function buyDashUpgrade() {
  if (!canBuyDashUpgrade()) return;

  gold -= dashUpgradeCost;
  dashLevel += 1;

  dashCooldown = Math.max(
    MIN_DASH_COOLDOWN,
    STARTING_DASH_COOLDOWN - DASH_COOLDOWN_STEP * dashLevel
  );

  dashUpgradeCost += 25;

  renderDungeon(currentDungeon);
}
