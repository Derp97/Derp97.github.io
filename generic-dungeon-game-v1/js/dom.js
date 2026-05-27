const canvas = document.getElementById("dungeonCanvas");
const ctx = canvas.getContext("2d");

const generateBtn = document.getElementById("generateBtn");
const buyMaxHealthBtn = document.getElementById("buyMaxHealthBtn");
const healBtn = document.getElementById("healBtn");
const buyArmourBtn = document.getElementById("buyArmourBtn");
const buyDashBtn = document.getElementById("buyDashBtn");

const floorValue = document.getElementById("floorValue");
const scoreValue = document.getElementById("scoreValue");
const goldValue = document.getElementById("goldValue");
const healthValue = document.getElementById("healthValue");
const armourValue = document.getElementById("armourValue");
const keyValue = document.getElementById("keyValue");
const dashValue = document.getElementById("dashValue");
const showCanvasHudToggle = document.getElementById("showCanvasHudToggle");
const uiLayoutSelect = document.getElementById("uiLayoutSelect");

const mobileControls = document.getElementById("mobileControls");
const mobileDpad = document.getElementById("mobileDpad");
const mobileDashBtn = document.getElementById("mobileDashBtn");
const mobileJoystickKnob = document.getElementById("mobileJoystickKnob");
