function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function distance(aX, aY, bX, bY) {
  const dx = aX - bX;
  const dy = aY - bY;
  return Math.sqrt(dx * dx + dy * dy);
}
