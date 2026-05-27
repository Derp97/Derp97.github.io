function isWalkableTile(tile) {
  return (
    tile === FLOOR ||
    tile === CORRIDOR ||
    tile === START ||
    tile === EXIT ||
    tile === TREASURE ||
    tile === GRAND_CHEST ||
    tile === CHEST_KEY
  );
}

function canMoveTo(grid, x, y) {
  return isWalkableTile(grid[y]?.[x]);
}
