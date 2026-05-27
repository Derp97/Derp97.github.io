const HEALTH_UPGRADE_COST = 50;
const HEAL_COST = 10;
const MAX_ARMOUR_LEVEL = 5;
const STARTING_ARMOUR_COST = 25;

const TILE_SIZE = 16;
const GRID_WIDTH = 60;
const GRID_HEIGHT = 35;
const ROOM_PADDING = 2;

const EMPTY = 0;
const FLOOR = 1;
const START = 2;
const EXIT = 3;
const TREASURE = 4;
const ENEMY = 5;
const CORRIDOR = 6;
const VISIBLE_WALL = 7;
const GRAND_CHEST = 8;
const CHEST_KEY = 9;

const HIT_INVULNERABILITY_TIME = 1000;
const DASH_DISTANCE = 3;
const MAX_DASH_LEVEL = 5;
const DASH_COOLDOWN_STEP = 2400;
const STARTING_DASH_COOLDOWN = 15000;
const MIN_DASH_COOLDOWN = 3000;
const STARTING_DASH_UPGRADE_COST = 25;

const STARTING_MAX_HEALTH = 30;
const BASE_MOVE_COOLDOWN = 140;
const SPRINT_MOVE_COOLDOWN = 70;

const ENEMY_MOVE_INTERVAL = 600;
const PLAYER_INPUT_INTERVAL = 16;

const CANVAS_HUD_PANEL_OPACITY = 0.68;
const CANVAS_HUD_PANEL_PADDING = 10;
const CANVAS_HUD_PANEL_RADIUS = 10;

const ENEMY_TYPES = {
  NORMAL: {
    name: "normal",
    color: "#a855f7",
    unlockFloor: 1,
    aggroRange: 6,
    maxSpawnDistance: 8,
    goldMin: 1,
    goldMax: 5,
    damage: 10,
    scoreValue: 1,
  },
  HUNTER: {
    name: "hunter",
    color: "#ef4444",
    unlockFloor: 5,
    aggroRange: 9,
    maxSpawnDistance: 12,
    goldMin: 3,
    goldMax: 8,
    damage: 12,
    scoreValue: 2,
  },
  BRUTE: {
    name: "brute",
    color: "#22c55e",
    unlockFloor: 10,
    aggroRange: 5,
    maxSpawnDistance: 6,
    goldMin: 5,
    goldMax: 12,
    damage: 18,
    scoreValue: 3,
  },
};
