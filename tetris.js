"use strict";

const canvas = document.getElementById("tetris"), context = canvas.getContext("2d");
context.scale(20, 20);
const previewCanvas = document.getElementById("preview"), previewContext = previewCanvas.getContext("2d");
previewContext.scale(20, 20);
const holdCanvas = document.getElementById("hold"), holdContext = holdCanvas.getContext("2d");
holdContext.scale(20, 20);

const createMatrix = (w, h) => Array.from({ length: h }, () => Array(w).fill(0));
const arena = createMatrix(10, 20);

function createPiece(type) {
  switch (type) {
    case "I": return [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]];
    case "J": return [[2,0,0],[2,2,2],[0,0,0]];
    case "L": return [[0,0,3],[3,3,3],[0,0,0]];
    case "O": return [[4,4],[4,4]];
    case "S": return [[0,5,5],[5,5,0],[0,0,0]];
    case "T": return [[0,6,0],[6,6,6],[0,0,0]];
    case "Z": return [[7,7,0],[0,7,7],[0,0,0]];
    default: return [];
  }
}
const colors = [null, "#00f6ff", "#007cff", "#ff8300", "#ffe700", "#00ff7f", "#aa00ff", "#ff1a1a"];
const pieceColorIndex = { I:1, J:2, L:3, O:4, S:5, T:6, Z:7 };
const customOffsets = { I:{x:0,y:0.5}, J:{x:0.5,y:0}, L:{x:0.5,y:0}, O:{x:0,y:0}, S:{x:0.5,y:0}, T:{x:0.5,y:0}, Z:{x:0.5,y:0} };

let bag = [];
function refillBag() { bag = ["I","J","L","O","S","T","Z"].sort(() => Math.random() - 0.5); }
function getNextPieceType() { if (!bag.length) refillBag(); return bag.pop(); }
let nextPieceType = getNextPieceType();

const player = { pos: { x: 0, y: 0 }, matrix: null, type: null, lockDelayTimer: 0 };
let holdPiece = null, holdUsed = false;

function drawMatrix(ctx, matrix, offset) {
  matrix.forEach((row, y) => row.forEach((val, x) => {
    if (val) { ctx.fillStyle = colors[val]; ctx.fillRect(x + offset.x, y + offset.y, 1, 1); }
  }));
}
function drawGhost() {
  let ghostY = player.pos.y;
  while (!collide(arena, { matrix: player.matrix, pos: { x: player.pos.x, y: ghostY + 1 } })) ghostY++;
  context.save();
  context.globalAlpha = 0.3;
  drawMatrix(context, player.matrix, { x: player.pos.x, y: ghostY });
  context.restore();
}
function drawCentered(ctx, matrix, boxWidth, boxHeight, type) {
  const bounds = getMatrixBounds(matrix),
    compOffsetX = Math.floor((boxWidth - bounds.width) / 2 - bounds.minX),
    compOffsetY = Math.floor((boxHeight - bounds.height) / 2 - bounds.minY),
    offset = customOffsets[type] || { x: 0, y: 0 },
    finalOffsetX = compOffsetX + offset.x, finalOffsetY = compOffsetY + offset.y;
  matrix.forEach((row, y) => row.forEach((val, x) => {
    if (val) ctx.fillStyle = colors[val], ctx.fillRect(x + finalOffsetX, y + finalOffsetY, 1, 1);
  }));
}
function drawGlitch(ctx) {
  if (glitchTimer > 0 && clearedLines.length) {
    ctx.save();
    let phase = glitchTimer > 5 ? 1 : -1;
    let offsetX = phase * (Math.random() * 0.25 + 0.15);
    let offsetY = phase * (Math.random() * 0.25 + 0.15);
    ctx.save(); ctx.translate(offsetX, offsetY); drawMatrix(ctx, arena, { x: 0, y: 0 }); ctx.restore();
    ctx.save(); ctx.globalAlpha = 0.5 + Math.random() * 0.2; ctx.translate(offsetX, offsetY);
    arena.forEach((row, y) => row.forEach((val, x) => { if (val) { ctx.fillStyle = "#fff"; ctx.fillRect(x, y, 1, 1); } }));
    ctx.restore(); ctx.restore();
  } else drawMatrix(ctx, arena, { x: 0, y: 0 });
}
function draw() {
  context.clearRect(0, 0, canvas.width, canvas.height);
  drawGlitch(context);
  drawGhost();
  drawMatrix(context, player.matrix, player.pos);
}

function collide(arena, p) {
  const m = p.matrix, o = p.pos;
  for (let y = 0; y < m.length; y++)
    for (let x = 0; x < m[y].length; x++)
      if (m[y][x] && (arena[y + o.y] && arena[y + o.y][x + o.x]) !== 0) return true;
  return false;
}
function merge(arena, p) {
  p.matrix.forEach((row, y) => row.forEach((val, x) => { if (val) arena[y + p.pos.y][x + p.pos.x] = val; }));
}
function rotateMatrix(matrix, dir) {
  for (let y = 0; y < matrix.length; y++)
    for (let x = 0; x < y; x++)
      [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
  dir > 0 ? matrix.forEach(r => r.reverse()) : matrix.reverse();
}
function getMatrixBounds(matrix) {
  let minX = matrix[0].length, maxX = 0, minY = matrix.length, maxY = 0;
  for (let y = 0; y < matrix.length; y++)
    for (let x = 0; x < matrix[y].length; x++)
      if (matrix[y][x]) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
  return { minX, minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}
function isGrounded() {
  return collide(arena, { matrix: player.matrix, pos: { x: player.pos.x, y: player.pos.y + 1 } });
}

function updatePreview() {
  previewContext.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
  const m = createPiece(nextPieceType), boxW = previewCanvas.width / 20, boxH = previewCanvas.height / 20;
  drawCentered(previewContext, m, boxW, boxH, nextPieceType);
}
function updateHold() {
  holdContext.clearRect(0, 0, holdCanvas.width, holdCanvas.height);
  if (!holdPiece) return;
  const m = createPiece(holdPiece), boxW = holdCanvas.width / 20, boxH = holdCanvas.height / 20;
  drawCentered(holdContext, m, boxW, boxH, holdPiece);
}

const DAS = 167, ARR = 33, softDropFactor = 30, LOCK_DELAY = 500, HARD_DROP_LOCK_DURATION = 100;
const inputState = {
  left: { pressed: false, startTime: 0, lastTime: 0 },
  right: { pressed: false, startTime: 0, lastTime: 0 },
  down: { pressed: false, startTime: 0, lastTime: 0 }
};
let hardDropLock = 0;

document.addEventListener("keydown", e => {
  if (gamePaused) return;
  switch (e.keyCode) {
    case 37: if (!inputState.left.pressed) { inputState.left.pressed = true; inputState.left.startTime = inputState.left.lastTime = performance.now(); playerMove(-1); } break;
    case 39: if (!inputState.right.pressed) { inputState.right.pressed = true; inputState.right.startTime = inputState.right.lastTime = performance.now(); playerMove(1); } break;
    case 40: if (!inputState.down.pressed) { inputState.down.pressed = true; inputState.down.startTime = inputState.down.lastTime = performance.now(); } break;
    case 32: if (performance.now() >= hardDropLock) playerHardDrop(); break;
    case 90: playerRotate(-1); break;
    case 88: playerRotate(1); break;
    case 67: playerHold(); break;
  }
});
document.addEventListener("keyup", e => {
  if (gamePaused) return;
  switch (e.keyCode) {
    case 37: inputState.left.pressed = false; break;
    case 39: inputState.right.pressed = false; break;
    case 40: inputState.down.pressed = false; break;
  }
});
function processInput() {
  const now = performance.now();
  if (inputState.left.pressed && now - inputState.left.startTime >= DAS && now - inputState.left.lastTime >= ARR) {
    playerMove(-1); inputState.left.lastTime = now;
  }
  if (inputState.right.pressed && now - inputState.right.startTime >= DAS && now - inputState.right.lastTime >= ARR) {
    playerMove(1); inputState.right.lastTime = now;
  }
}
function playerMove(offset) {
  player.pos.x += offset;
  if (collide(arena, player)) player.pos.x -= offset;
  else player.lockDelayTimer = 0;
}
function playerRotate(dir) {
  const startX = player.pos.x; let offset = 1;
  rotateMatrix(player.matrix, dir);
  while (collide(arena, player)) {
    player.pos.x += offset;
    offset = -(offset + (offset > 0 ? 1 : -1));
    if (Math.abs(offset) > player.matrix[0].length) { rotateMatrix(player.matrix, -dir); player.pos.x = startX; return; }
  }
  player.lockDelayTimer = 0;
}
function playerDrop() { player.pos.y++; if (collide(arena, player)) player.pos.y--; dropCounter = 0; }
function playerHardDrop() {
  while (!collide(arena, { matrix: player.matrix, pos: { x: player.pos.x, y: player.pos.y + 1 } })) player.pos.y++;
  merge(arena, player);
  playLockSound();
  playerReset(); holdUsed = false;
  arenaSweep(); dropCounter = 0;
  hardDropLock = performance.now() + HARD_DROP_LOCK_DURATION;
}
function playerHold() {
  if (holdUsed) return; holdUsed = true;
  if (!holdPiece) { holdPiece = player.type; playerReset(); }
  else {
    const temp = player.type; player.type = holdPiece; holdPiece = temp;
    player.matrix = createPiece(player.type); player.pos.y = 0;
    player.pos.x = ((arena[0].length / 2) | 0) - ((player.matrix[0].length / 2) | 0);
  }
  updateHold();
}
function playerReset() {
  hardDropLock = performance.now() + HARD_DROP_LOCK_DURATION;
  player.type = nextPieceType; player.matrix = createPiece(player.type);
  player.pos.y = 0;
  player.pos.x = ((arena[0].length / 2) | 0) - ((player.matrix[0].length / 2) | 0);
  nextPieceType = getNextPieceType(); updatePreview();
  if (collide(arena, player)) {
    arena.forEach(row => row.fill(0));
    holdPiece = null;
    updateHold();
  }
}

let clearedLines = [], glitchTimer = 0;
function arenaSweep() {
  clearedLines = [];
  outer: for (let y = arena.length - 1; y >= 0; y--) {
    for (let x = 0; x < arena[y].length; x++) if (arena[y][x] === 0) continue outer;
    clearedLines.push(y);
    const row = arena.splice(y, 1)[0].fill(0);
    arena.unshift(row); y++;
  }
  if (clearedLines.length) {
    glitchTimer = 10;
    playLineClearSounds();
  }
}

const lineClearAudio = new Audio("assets/line-clear.mp3");
const lockAudio = new Audio("assets/lock.mp3");

function primeAudio() {
  [lineClearAudio, lockAudio].forEach(audio => {
    audio.volume = 0;
    audio.play().then(() => {
      audio.pause();
      audio.currentTime = 0;
      audio.volume = 1;
    }).catch(() => {});
  });
  window.removeEventListener('keydown', primeAudio);
  window.removeEventListener('mousedown', primeAudio);
}
window.addEventListener('keydown', primeAudio);
window.addEventListener('mousedown', primeAudio);

function playLineClearSounds() {
  lineClearAudio.currentTime = 0;
  lineClearAudio.play();
}
function playLockSound() {
  lockAudio.currentTime = 0;
  lockAudio.play();
}

let dropCounter = 0, dropInterval = 1000, lastTime = 0;
let animationFrameId = null;
let gameStarted = false;
let gamePaused = true;

function startGame() {
  if (!gameStarted) {
    refillBag();
    nextPieceType = getNextPieceType();
    playerReset();
    gameStarted = true;
  }
  gamePaused = false;
  lastTime = performance.now();
  update();
}
function pauseGame() {
  gamePaused = true;
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
}
function update(time = 0) {
  if (gamePaused) return;
  processInput();
  const deltaTime = time - lastTime;
  lastTime = time; dropCounter += deltaTime;
  const curDropInterval = inputState.down.pressed ? dropInterval / softDropFactor : dropInterval;
  if (dropCounter > curDropInterval) playerDrop();
  if (isGrounded()) {
    player.lockDelayTimer += deltaTime;
    if (player.lockDelayTimer >= LOCK_DELAY) {
      merge(arena, player);
      playLockSound();
      playerReset(); holdUsed = false;
      arenaSweep();
      dropCounter = 0; player.lockDelayTimer = 0;
      hardDropLock = performance.now() + HARD_DROP_LOCK_DURATION;
    }
  } else player.lockDelayTimer = 0;
  if (glitchTimer > 0) glitchTimer--;
  draw();
  animationFrameId = requestAnimationFrame(update);
}

const tetrisContainer = document.querySelector('.tetris-container');
const tetrisHandle = document.getElementById('tetris-handle');
tetrisContainer.classList.add('closed');
pauseGame();

tetrisHandle.addEventListener('click', e => {
  if (e.detail === 0) return;
  const wasClosed = tetrisContainer.classList.contains('closed');
  tetrisContainer.classList.toggle('closed');
  if (wasClosed) startGame();
  else pauseGame();
});