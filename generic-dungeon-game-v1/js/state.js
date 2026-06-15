let maxHealth = STARTING_MAX_HEALTH;
let health = maxHealth;

let armourLevel = 0;
let armourCost = STARTING_ARMOUR_COST;

let player = { x: 0, y: 0 };
let score = 0;
let gold = 0;

const keysHeld = new Set();
let moveCooldown = BASE_MOVE_COOLDOWN;
let sprintCooldown = SPRINT_MOVE_COOLDOWN;
let isSprinting = false;
let lastMoveTime = 0;

let invulnerableUntil = 0;
let isDashing = false;
let dashCooldown = STARTING_DASH_COOLDOWN;
let lastDashTime = 0;
let dashLevel = 0;
let dashUpgradeCost = STARTING_DASH_UPGRADE_COST;

let currentDungeon = null;
let dungeonFloor = 1;
let hasChestKey = false;
let enemies = [];

let activeOverlay = "start";
let overlayReturnTarget = "start";
let lastRunStats = null;

const canvasUi = {
  hitboxes: [],
  activePointers: new Map(),
  joystickPointerId: null,
  joystickVector: { x: 0, y: 0 },
  activeMobileButtons: new Set(),
  settingsPanelOpen: false,
  settings: {
    showHud: false,
    controlsMode: "auto", // auto, show, hide
  },
};
