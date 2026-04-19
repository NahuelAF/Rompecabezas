/* ══════════════════════════════════════════════════════
   PUZZLE ROMÁNTICO — script.js
   ──────────────────────────────────────────────────────
   Secciones:
   1.  Estado global
   2.  Navegación entre pantallas
   3.  Canvas de corazones flotantes
   4.  Audio
   5A. Formas de piezas: conectores + dibujo en canvas 2D
   5B. Generación del rompecabezas
   6.  Drag & Drop (mouse + touch, fix mobile)
   7.  Snap y validación
   8.  Efectos partículas
   9.  Final y carta
   10. Overlays
   11. Init
══════════════════════════════════════════════════════ */

'use strict';

/* ────────────────────────────────────────────────────
   1. ESTADO GLOBAL
──────────────────────────────────────────────────── */
// ── Pool de imágenes para el puzzle ──────────────────────
// Nombrá tus fotos 1.jpg, 2.jpg, 3.jpg, 4.jpg en /assets/img/
// Podés agregar o quitar entradas libremente.
const PUZZLE_IMAGES = [
  'assets/img/collage.jpg',
  'assets/img/collage2.jpg',
];

function pickRandomImage() {
  return PUZZLE_IMAGES[Math.floor(Math.random() * PUZZLE_IMAGES.length)];
}
// ─────────────────────────────────────────────────────────

const STATE = {
  gridSize:    4,
  totalPieces: 0,
  placedPieces:0,
  pieceSize:   0,
  imgSrc:      pickRandomImage(),
  muted:       false,
  pieces:      [],
  connectors:  null,
  dragData:    null,
  ghostEl:     null,
  img:         null,
};

/* ────────────────────────────────────────────────────
   2. NAVEGACIÓN
──────────────────────────────────────────────────── */
function showScreen(id) {
  const screens = document.querySelectorAll('.screen');
  screens.forEach(s => {
    if (s.id === id) {
      s.classList.remove('exit');
      s.classList.add('active');
    } else if (s.classList.contains('active')) {
      s.classList.add('exit');
      s.classList.remove('active');
      // Limpiar exit después de transición
      setTimeout(() => s.classList.remove('exit'), 650);
    }
  });
}

/* ────────────────────────────────────────────────────
   3. CORAZONES FLOTANTES
──────────────────────────────────────────────────── */
(function initFloatingHearts() {
  const canvas = document.getElementById('heartsCanvas');
  const ctx    = canvas.getContext('2d');
  const hearts = [];
  const DPR    = window.devicePixelRatio || 1;

  function resize() {
    canvas.width  = window.innerWidth  * DPR;
    canvas.height = window.innerHeight * DPR;
    canvas.style.width  = window.innerWidth  + 'px';
    canvas.style.height = window.innerHeight + 'px';
    ctx.scale(DPR, DPR);
  }

  function spawnHeart() {
    return {
      x: Math.random() * window.innerWidth,
      y: window.innerHeight + 20,
      size: Math.random() * 14 + 8,
      speed: Math.random() * 0.6 + 0.3,
      drift: (Math.random() - 0.5) * 0.5,
      alpha: Math.random() * 0.25 + 0.06,
      wobble: 0,
      wobbleSpeed: Math.random() * 0.03 + 0.01,
    };
  }

  function drawHeart(ctx, x, y, size, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#e05a6e';
    ctx.beginPath();
    const s = size * 0.5;
    ctx.moveTo(x, y + s * 0.4);
    ctx.bezierCurveTo(x, y, x - s, y, x - s, y + s * 0.4);
    ctx.bezierCurveTo(x - s, y + s * 0.9, x, y + s * 1.3, x, y + s * 1.6);
    ctx.bezierCurveTo(x, y + s * 1.3, x + s, y + s * 0.9, x + s, y + s * 0.4);
    ctx.bezierCurveTo(x + s, y, x, y, x, y + s * 0.4);
    ctx.fill();
    ctx.restore();
  }

  function tick() {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    if (Math.random() < 0.06) hearts.push(spawnHeart());
    for (let i = hearts.length - 1; i >= 0; i--) {
      const h = hearts[i];
      h.y -= h.speed;
      h.wobble += h.wobbleSpeed;
      h.x += Math.sin(h.wobble) * 0.4 + h.drift;
      drawHeart(ctx, h.x, h.y, h.size, h.alpha);
      if (h.y < -30) hearts.splice(i, 1);
    }
    requestAnimationFrame(tick);
  }

  window.addEventListener('resize', () => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    resize();
  });
  resize();

  for (let i = 0; i < 18; i++) {
    const h = spawnHeart();
    h.y = Math.random() * window.innerHeight;
    hearts.push(h);
  }
  tick();
})();

/* ────────────────────────────────────────────────────
   4. AUDIO
   ── Para cambiar el volumen editá los valores aquí ──
   BG_MUSIC_VOL : música de fondo  (0.0 = mute, 1.0 = máximo)
   POP_VOL      : sonido al poner una pieza
──────────────────────────────────────────────────── */
const BG_MUSIC_VOL = 0.090;   // ← cambiá este valor (0.0 – 1.0)
const POP_VOL      = 0.55;   // ← cambiá este valor (0.0 – 1.0)

const bgMusic  = document.getElementById('bg-music');
const popSound = document.getElementById('pop-sound');
bgMusic.volume  = BG_MUSIC_VOL;
popSound.volume = POP_VOL;

function startMusic() {
  if (!STATE.muted && bgMusic.paused) bgMusic.play().catch(() => {});
}

document.getElementById('btn-mute').addEventListener('click', () => {
  STATE.muted = !STATE.muted;
  bgMusic.muted = STATE.muted;
  popSound.muted = STATE.muted;
  document.getElementById('icon-sound-on').style.display  = STATE.muted ? 'none' : '';
  document.getElementById('icon-sound-off').style.display = STATE.muted ? '' : 'none';
});

function playPop() {
  if (STATE.muted) return;
  popSound.currentTime = 0;
  popSound.play().catch(() => {});
}

/* ════════════════════════════════════════════════════
   5A. FORMAS DE PIEZAS — CANVAS 2D con DPR
   ──────────────────────────────────────────────────
   Piezas dibujadas con beziers redondeados estilo
   puzzle clásico. Tab con cuello y cabeza circular.
   Canvas escalado por devicePixelRatio para mobile.
════════════════════════════════════════════════════ */

/**
 * Genera conectores coherentes para todo el grid.
 * -1 = entrante, 0 = plano (borde), +1 = saliente
 */
function generateConnectors(g) {
  const c = Array.from({ length: g }, () =>
    Array.from({ length: g }, () => ({ top: 0, right: 0, bottom: 0, left: 0 }))
  );
  for (let r = 0; r < g - 1; r++)
    for (let col = 0; col < g; col++) {
      const v = Math.random() < 0.5 ? 1 : -1;
      c[r][col].bottom = v;
      c[r + 1][col].top = -v;
    }
  for (let r = 0; r < g; r++)
    for (let col = 0; col < g - 1; col++) {
      const v = Math.random() < 0.5 ? 1 : -1;
      c[r][col].right = v;
      c[r][col + 1].left = -v;
    }
  return c;
}

/**
 * Traza un lado del puzzle con tab circular redondeado.
 * Versión mejorada: cuello más suave, cabeza circular.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x1, y1   punto inicio del lado
 * @param {number} x2, y2   punto fin del lado
 * @param {number} dir       +1 = saliente, -1 = entrante, 0 = plano
 * @param {string} side      'top'|'right'|'bottom'|'left'
 * @param {number} s         tamaño de la pieza
 * @param {number} bump      tamaño del tab en px
 */
function drawSide(ctx, x1, y1, x2, y2, dir, side, s, bump) {
  if (dir === 0) {
    ctx.lineTo(x2, y2);
    return;
  }

  // Vector del lado
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);

  // Normal perpendicular (hacia afuera si dir=+1)
  // Para top/bottom: perpendicular es en Y; para left/right: en X
  let nx, ny;
  if (side === 'top')    { nx = 0; ny = -1; }
  else if (side === 'bottom') { nx = 0; ny = 1; }
  else if (side === 'right')  { nx = 1; ny = 0; }
  else                         { nx = -1; ny = 0; }

  const tabDir = dir; // +1 saliente, -1 entrante

  // Proporciones del tab (estilo puzzle clásico)
  const neckW  = len * 0.18;  // ancho del cuello a cada lado del centro
  const headR  = bump * 0.38; // radio de la cabeza circular
  const neckH  = bump * 0.55; // altura del cuello antes de la cabeza
  const curl   = bump * 0.3;  // curvatura de los hombros

  // Punto central del lado
  const mx = x1 + dx * 0.5;
  const my = y1 + dy * 0.5;

  // Dirección a lo largo del lado (normalizada)
  const lx = dx / len;
  const ly = dy / len;

  // Puntos clave del tab
  // Hombro izquierdo y derecho del cuello
  const shL  = { x: mx - lx * neckW,            y: my - ly * neckW };
  const shR  = { x: mx + lx * neckW,            y: my + ly * neckW };
  // Base cuello
  const nkL  = { x: shL.x + nx * neckH * tabDir, y: shL.y + ny * neckH * tabDir };
  const nkR  = { x: shR.x + nx * neckH * tabDir, y: shR.y + ny * neckH * tabDir };
  // Centro de la cabeza
  const hcX  = mx + nx * (neckH + headR) * tabDir;
  const hcY  = my + ny * (neckH + headR) * tabDir;

  // Dibujo
  ctx.lineTo(shL.x, shL.y);

  // Hombro izquierdo → cuello izquierdo (curva suave)
  ctx.bezierCurveTo(
    shL.x + nx * curl * tabDir, shL.y + ny * curl * tabDir,
    nkL.x - lx * neckW * 0.3,  nkL.y - ly * neckW * 0.3,
    nkL.x,                      nkL.y
  );

  // Cuello izquierdo → arco de la cabeza → cuello derecho
  // Usamos arc para cabeza perfectamente circular
  const startAngle = Math.atan2(nkL.y - hcY, nkL.x - hcX);
  const endAngle   = Math.atan2(nkR.y - hcY, nkR.x - hcX);
  const ccw = tabDir > 0; // sentido antihorario si es saliente
  ctx.arc(hcX, hcY, headR, startAngle, endAngle, ccw);

  // Cuello derecho → hombro derecho
  ctx.bezierCurveTo(
    nkR.x + lx * neckW * 0.3,  nkR.y + ly * neckW * 0.3,
    shR.x + nx * curl * tabDir, shR.y + ny * curl * tabDir,
    shR.x,                      shR.y
  );

  ctx.lineTo(x2, y2);
}

/**
 * Traza el path completo de una pieza de puzzle.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} s    tamaño base de la celda en px lógicos
 * @param {number} pad  padding = bump
 * @param {object} con  { top, right, bottom, left }
 */
function tracePuzzlePath(ctx, s, pad, con) {
  const x0 = pad, y0 = pad;
  const x1 = pad + s, y1 = pad + s;

  ctx.beginPath();
  ctx.moveTo(x0, y0);

  // TOP: izq → der
  drawSide(ctx, x0, y0, x1, y0, con.top, 'top', s, pad);
  // RIGHT: arriba → abajo
  drawSide(ctx, x1, y0, x1, y1, con.right, 'right', s, pad);
  // BOTTOM: der → izq
  drawSide(ctx, x1, y1, x0, y1, con.bottom, 'bottom', s, pad);
  // LEFT: abajo → arriba
  drawSide(ctx, x0, y1, x0, y0, con.left, 'left', s, pad);

  ctx.closePath();
}

/**
 * Crea un <canvas> HiDPI con la pieza dibujada.
 * Escala por devicePixelRatio para verse nítido en mobile.
 *
 * @param {HTMLImageElement} img
 * @param {number} row, col
 * @param {number} s          tamaño lógico de la celda (CSS px)
 * @param {object} con
 * @param {number} gridSize
 * @returns {HTMLCanvasElement}
 */
function makePieceCanvas(img, row, col, s, con, gridSize) {
  const DPR    = window.devicePixelRatio || 1;
  const bump   = Math.round(s * 0.28);
  const total  = s + bump * 2;

  const canvas = document.createElement('canvas');
  // Tamaño físico en pixels reales
  canvas.width  = total * DPR;
  canvas.height = total * DPR;
  // Tamaño visual en CSS px
  canvas.style.width  = total + 'px';
  canvas.style.height = total + 'px';

  const ctx = canvas.getContext('2d');
  ctx.scale(DPR, DPR);

  // Suavizado
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // 1. Trazar forma
  tracePuzzlePath(ctx, s, bump, con);

  // 2. Sombra suave antes del clip
  ctx.shadowColor   = 'rgba(192, 57, 75, 0.22)';
  ctx.shadowBlur    = 8;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 2;

  // 3. Clip
  ctx.save();
  ctx.clip();
  ctx.shadowColor = 'transparent';

  // 4. Dibujar imagen
  const imgW = s * gridSize;
  const imgH = s * gridSize;
  ctx.drawImage(img, -col * s + bump, -row * s + bump, imgW, imgH);

  ctx.restore();

  // 5. Borde interior blanco suave
  tracePuzzlePath(ctx, s, bump, con);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.lineWidth   = 1.2;
  ctx.stroke();

  return canvas;
}

/* ════════════════════════════════════════════════════
   5B. GENERACIÓN DEL ROMPECABEZAS
════════════════════════════════════════════════════ */
function calcPieceSize() {
  const isDesktop = window.innerWidth >= 680;
  const maxBoard  = isDesktop
    ? Math.min(window.innerWidth * 0.54, window.innerHeight * 0.80 - 80)
    : Math.min(window.innerWidth * 0.88, window.innerHeight * 0.50);
  return Math.floor(maxBoard / STATE.gridSize);
}

function buildPuzzle() {
  // Nueva imagen random en cada partida
  STATE.imgSrc     = pickRandomImage();
  STATE.img        = null;   // forzar recarga de la nueva imagen

  STATE.totalPieces  = STATE.gridSize * STATE.gridSize;
  STATE.placedPieces = 0;
  STATE.pieces       = [];
  STATE.pieceSize    = calcPieceSize();
  STATE.connectors   = generateConnectors(STATE.gridSize);

  const s     = STATE.pieceSize;
  const board = document.getElementById('puzzle-board');
  board.innerHTML = '';
  board.style.gridTemplateColumns = `repeat(${STATE.gridSize}, ${s}px)`;
  board.style.gridTemplateRows    = `repeat(${STATE.gridSize}, ${s}px)`;
  board.style.width  = `${s * STATE.gridSize}px`;
  board.style.height = `${s * STATE.gridSize}px`;

  const tray = document.getElementById('pieces-tray');
  tray.innerHTML = '';

  // Crear slots del tablero con canvas guía en forma de puzzle
  // Los slots se crean primero vacíos; los canvas guía se añaden
  // tras cargar la imagen (en buildTrayPieces → addSlotGuides)
  for (let row = 0; row < STATE.gridSize; row++) {
    for (let col = 0; col < STATE.gridSize; col++) {
      const slot = document.createElement('div');
      slot.className      = 'board-slot';
      slot.dataset.row    = row;
      slot.dataset.col    = col;
      slot.style.width    = `${s}px`;
      slot.style.height   = `${s}px`;
      slot.style.position = 'relative';
      slot.style.overflow = 'visible';
      board.appendChild(slot);
    }
  }

  // Precargar imagen
  if (STATE.img && STATE.img.complete && STATE.img.naturalWidth > 0) {
    addSlotGuides();
    buildTrayPieces(tray);
  } else {
    const img   = new Image();
    img.crossOrigin = 'anonymous';
    img.onload  = () => { STATE.img = img; addSlotGuides(); buildTrayPieces(tray); };
    img.onerror = () => {
      // Placeholder si no hay imagen
      const off = document.createElement('canvas');
      off.width = off.height = 600;
      const oc = off.getContext('2d');
      const gr = oc.createLinearGradient(0, 0, 600, 600);
      gr.addColorStop(0, '#f5a3b0');
      gr.addColorStop(1, '#e05a6e');
      oc.fillStyle = gr;
      oc.fillRect(0, 0, 600, 600);
      // Patrón de corazones
      oc.fillStyle = 'rgba(255,255,255,0.15)';
      for (let i = 0; i < 8; i++)
        for (let j = 0; j < 8; j++) {
          oc.font = '48px serif';
          oc.textAlign = 'center';
          oc.fillText('❤️', i * 80 + 40, j * 80 + 60);
        }
      const ph = new Image();
      ph.onload = () => { STATE.img = ph; addSlotGuides(); buildTrayPieces(tray); };
      ph.src = off.toDataURL();
    };
    img.src = STATE.imgSrc;
  }

  updateCounter();
}

/**
 * Añade un canvas "guía" semitransparente con forma de puzzle a cada slot vacío.
 * Muestra el contorno donde debe ir la pieza.
 */
function addSlotGuides() {
  const s    = STATE.pieceSize;
  const bump = Math.round(s * 0.28);

  document.querySelectorAll('.board-slot').forEach(slot => {
    const row = parseInt(slot.dataset.row);
    const col = parseInt(slot.dataset.col);
    const con = STATE.connectors[row][col];

    const DPR   = window.devicePixelRatio || 1;
    const total = s + bump * 2;
    const cv    = document.createElement('canvas');
    cv.width  = total * DPR;
    cv.height = total * DPR;
    cv.style.width  = total + 'px';
    cv.style.height = total + 'px';
    cv.style.position = 'absolute';
    cv.style.left     = `${-bump}px`;
    cv.style.top      = `${-bump}px`;
    cv.style.pointerEvents = 'none';
    cv.className = 'slot-guide';

    const ctx = cv.getContext('2d');
    ctx.scale(DPR, DPR);

    // Relleno: imagen recortada muy tenue (20% opacidad) como referencia
    tracePuzzlePath(ctx, s, bump, con);
    ctx.save();
    ctx.clip();
    ctx.globalAlpha = 0.13;
    ctx.drawImage(STATE.img, -col * s + bump, -row * s + bump, s * STATE.gridSize, s * STATE.gridSize);
    ctx.restore();

    // Fondo blanco semitransparente dentro de la forma
    tracePuzzlePath(ctx, s, bump, con);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.fill();

    // Borde punteado con la forma de puzzle
    tracePuzzlePath(ctx, s, bump, con);
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = 'rgba(192, 57, 75, 0.35)';
    ctx.lineWidth   = 1.5;
    ctx.stroke();
    ctx.setLineDash([]);

    slot.appendChild(cv);
  });
}

function buildTrayPieces(tray) {
  const s        = STATE.pieceSize;
  const isDesktop = window.innerWidth >= 680;
  // En mobile, las piezas de la bandeja son un poco más pequeñas
  const traySize = isDesktop
    ? Math.max(54, Math.min(s, 82))
    : Math.max(48, Math.min(s * 0.82, 70));
  const bump     = Math.round(traySize * 0.28);
  const indices  = shuffleArray(Array.from({ length: STATE.totalPieces }, (_, i) => i));

  // Hint
  const hint = document.createElement('p');
  hint.className   = 'tray-hint';
  hint.textContent = 'Arrastrá las piezas al tablero';
  tray.appendChild(hint);

  indices.forEach(idx => {
    const row = Math.floor(idx / STATE.gridSize);
    const col = idx % STATE.gridSize;
    const con = STATE.connectors[row][col];

    STATE.pieces.push({ idx, row, col, placed: false });

    const total = traySize + bump * 2;

    const wrap = document.createElement('div');
    wrap.className          = 'tray-piece-wrap';
    wrap.dataset.pieceIdx   = idx;
    wrap.style.width        = `${traySize}px`;
    wrap.style.height       = `${traySize}px`;
    wrap.style.position     = 'relative';
    wrap.style.overflow     = 'visible';
    wrap.style.flexShrink   = '0';

    const cv = makePieceCanvas(STATE.img, row, col, traySize, con, STATE.gridSize);
    cv.style.position    = 'absolute';
    cv.style.left        = `${-bump}px`;
    cv.style.top         = `${-bump}px`;
    cv.style.cursor      = 'grab';
    cv.dataset.pieceIdx  = idx;

    wrap.appendChild(cv);
    tray.appendChild(wrap);

    wrap.addEventListener('mousedown',  onDragStart, { passive: false });
    wrap.addEventListener('touchstart', onDragStart, { passive: false });
  });

  // Ocultar hint
  const h = tray.querySelector('.tray-hint');
  if (h) h.style.display = indices.length ? 'none' : '';
}

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function updateCounter() {
  document.getElementById('pieces-counter').textContent =
    `${STATE.placedPieces} / ${STATE.totalPieces}`;
}

/* ════════════════════════════════════════════════════
   6. DRAG & DROP — MOUSE + TOUCH (FIX MOBILE)
════════════════════════════════════════════════════ */
function getEventXY(e) {
  if (e.changedTouches && e.changedTouches.length)
    return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
  if (e.touches && e.touches.length)
    return { x: e.touches[0].clientX, y: e.touches[0].clientY };
  return { x: e.clientX, y: e.clientY };
}

function onDragStart(e) {
  const wrap = e.currentTarget;
  if (!wrap.parentElement || wrap.parentElement.id !== 'pieces-tray') return;
  e.preventDefault();

  const { x, y }  = getEventXY(e);
  const pieceIdx   = parseInt(wrap.dataset.pieceIdx, 10);
  const traySize   = wrap.offsetWidth;
  const pieceData  = STATE.pieces.find(p => p.idx === pieceIdx);
  if (!pieceData) return;
  const con  = STATE.connectors[pieceData.row][pieceData.col];
  const bump = Math.round(traySize * 0.28);

  const ghostCanvas = makePieceCanvas(
    STATE.img, pieceData.row, pieceData.col, traySize, con, STATE.gridSize
  );

  const ghost = document.createElement('div');
  ghost.style.cssText = `
    position:fixed;
    z-index:9999;
    pointer-events:none;
    overflow:visible;
    left:${x - traySize / 2 - bump}px;
    top:${y - traySize / 2 - bump}px;
    opacity:0.92;
    filter:drop-shadow(0 12px 28px rgba(192,57,75,0.48));
    transform:scale(1.08);
    transform-origin: ${traySize / 2 + bump}px ${traySize / 2 + bump}px;
    transition: transform 0.12s ease;
  `;
  ghost.appendChild(ghostCanvas);
  document.body.appendChild(ghost);

  wrap.style.opacity = '0.25';

  STATE.dragData = { pieceIdx, wrap, ghost, traySize, bump };
  STATE.ghostEl  = ghost;

  window.addEventListener('mousemove',   onDragMove,  { passive: false });
  window.addEventListener('touchmove',   onDragMove,  { passive: false });
  window.addEventListener('mouseup',     onDragEnd,   { passive: false });
  window.addEventListener('touchend',    onDragEnd,   { passive: false });
  window.addEventListener('touchcancel', onDragEnd,   { passive: false });
}

function onDragMove(e) {
  if (!STATE.dragData) return;
  e.preventDefault();
  const { x, y } = getEventXY(e);
  const { ghost, traySize, bump } = STATE.dragData;
  ghost.style.left = `${x - traySize / 2 - bump}px`;
  ghost.style.top  = `${y - traySize / 2 - bump}px`;
  highlightNearestSlot(x, y);
}

function onDragEnd(e) {
  if (!STATE.dragData) return;
  const { x, y }                  = getEventXY(e);
  const { wrap, ghost, pieceIdx } = STATE.dragData;

  ghost.remove();
  window.removeEventListener('mousemove',   onDragMove);
  window.removeEventListener('touchmove',   onDragMove);
  window.removeEventListener('mouseup',     onDragEnd);
  window.removeEventListener('touchend',    onDragEnd);
  window.removeEventListener('touchcancel', onDragEnd);
  clearSlotHighlights();

  const dropped = trySnapToSlot(x, y, pieceIdx);
  if (!dropped) {
    wrap.style.opacity = '1';
    wrap.style.transform = 'translateX(-6px)';
    setTimeout(() => { wrap.style.transform = ''; }, 200);
  }

  STATE.dragData = null;
  STATE.ghostEl  = null;
}

function highlightNearestSlot(x, y) {
  clearSlotHighlights();
  const slot = findNearestSlot(x, y);
  if (slot) slot.classList.add('drag-over');
}

function clearSlotHighlights() {
  document.querySelectorAll('.board-slot.drag-over')
    .forEach(s => s.classList.remove('drag-over'));
}

function findNearestSlot(x, y) {
  const slots    = document.querySelectorAll('.board-slot:not(.filled)');
  const isMobile = window.innerWidth < 680;
  const SNAP     = STATE.pieceSize * (isMobile ? 0.75 : 0.6);
  let best = null, bestDist = Infinity;
  slots.forEach(slot => {
    const r  = slot.getBoundingClientRect();
    const cx = r.left + r.width  / 2;
    const cy = r.top  + r.height / 2;
    const d  = Math.hypot(x - cx, y - cy);
    if (d < SNAP && d < bestDist) { bestDist = d; best = slot; }
  });
  return best;
}

/* ────────────────────────────────────────────────────
   7. SNAP Y VALIDACIÓN
──────────────────────────────────────────────────── */
function trySnapToSlot(dropX, dropY, pieceIdx) {
  const pieceData = STATE.pieces.find(p => p.idx === pieceIdx);
  if (!pieceData || pieceData.placed) return false;
  const slot = findNearestSlot(dropX, dropY);
  if (!slot) return false;

  const isCorrect =
    parseInt(slot.dataset.row) === pieceData.row &&
    parseInt(slot.dataset.col) === pieceData.col;

  if (isCorrect) {
    placePieceInSlot(slot, pieceData);
    return true;
  } else {
    const wrap = STATE.dragData?.wrap;
    if (wrap) {
      wrap.style.opacity   = '1';
      wrap.style.transform = 'translateX(-6px)';
      setTimeout(() => { wrap.style.transform = ''; }, 200);
    }
    return false;
  }
}

function placePieceInSlot(slot, pieceData) {
  pieceData.placed = true;
  slot.classList.add('filled');
  slot.style.overflow = 'visible';

  // Eliminar canvas guía del slot
  const guide = slot.querySelector('.slot-guide');
  if (guide) guide.remove();

  const s    = STATE.pieceSize;
  const con  = STATE.connectors[pieceData.row][pieceData.col];
  const bump = Math.round(s * 0.28);

  const cv = makePieceCanvas(STATE.img, pieceData.row, pieceData.col, s, con, STATE.gridSize);
  cv.style.position      = 'absolute';
  cv.style.left          = `${-bump}px`;
  cv.style.top           = `${-bump}px`;
  cv.style.pointerEvents = 'none';
  cv.style.animation     = 'correctFlash 0.55s ease forwards';
  cv.style.zIndex        = '2';
  slot.appendChild(cv);

  // Quitar de la bandeja
  const wrap = document.querySelector(`.tray-piece-wrap[data-piece-idx="${pieceData.idx}"]`);
  if (wrap) wrap.remove();

  playPop();
  burstHearts(slot);
  STATE.placedPieces++;
  updateCounter();

  if (STATE.placedPieces === STATE.totalPieces)
    setTimeout(onPuzzleComplete, 700);
}

/* ────────────────────────────────────────────────────
   8. EFECTOS PARTÍCULAS
──────────────────────────────────────────────────── */
function burstHearts(slotEl) {
  const r  = slotEl.getBoundingClientRect();
  const cx = r.left + r.width / 2;
  const cy = r.top  + r.height / 2;
  ['❤️', '🌸', '💕', '✨', '💖'].forEach((em, i) => {
    const el    = document.createElement('span');
    el.className    = 'heart-particle';
    el.textContent  = em;
    const angle = (360 / 5) * i + Math.random() * 30;
    const dist  = 55 + Math.random() * 45;
    const rad   = angle * Math.PI / 180;
    el.style.left = `${cx - 10}px`;
    el.style.top  = `${cy - 10}px`;
    el.style.setProperty('--tx', `${Math.cos(rad) * dist}px`);
    el.style.setProperty('--ty', `${Math.sin(rad) * dist - 20}px`);
    el.style.animationDelay = `${Math.random() * 0.12}s`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1400);
  });
}

function heartRain() {
  let launched = 0;
  const iv = setInterval(() => {
    if (launched++ >= 60) { clearInterval(iv); return; }
    const el      = document.createElement('span');
    el.className  = 'heart-particle';
    el.textContent = ['❤️', '💖', '💕', '🌹', '✨'][Math.floor(Math.random() * 5)];
    el.style.left  = `${Math.random() * 100}vw`;
    el.style.top   = '-20px';
    el.style.setProperty('--tx', `${(Math.random() - 0.5) * 60}px`);
    el.style.setProperty('--ty', `${80 + Math.random() * 120}px`);
    el.style.animationDuration = `${0.9 + Math.random() * 0.8}s`;
    el.style.fontSize = `${1 + Math.random() * 1.4}rem`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2000);
  }, 60);
}

/* ────────────────────────────────────────────────────
   9. FINAL Y CARTA
──────────────────────────────────────────────────── */
function onPuzzleComplete() {
  heartRain();
  // Actualizar imagen final con la que se jugó
  document.getElementById('final-image').src = STATE.imgSrc;
  setTimeout(() => showScreen('screen-final'), 900);
}

const LETTER_TEXT = `Quería hacerte algo especial.
Algo que, como vos, se construye con paciencia, constancia y sentido.

Cada pieza de este rompecabezas guarda un momento,
un aprendizaje, una de esas cosas que dejan huella.

Mientras lo armás, pensé en todo lo que me enseñaste:
que siempre se puede un poco más, incluso cuando cuesta.

Gracias por eso.
Por lo que sos y por lo que hacés sin darte cuenta.

Te quiero más de lo que sabés.`;

function typeLetter() {
  const container = document.getElementById('letter-text');
  container.textContent = '';
  let i = 0;
  const iv = setInterval(() => {
    if (i >= LETTER_TEXT.length) { clearInterval(iv); return; }
    container.textContent += LETTER_TEXT[i++];
  }, 44);
}

/* ────────────────────────────────────────────────────
   10. OVERLAYS
──────────────────────────────────────────────────── */
const openOverlay  = id => document.getElementById(id).setAttribute('aria-hidden', 'false');
const closeOverlay = id => document.getElementById(id).setAttribute('aria-hidden', 'true');

document.getElementById('btn-preview').addEventListener('click', () => {
  // Mostrar la imagen del puzzle actual en el preview
  document.getElementById('preview-image').src = STATE.imgSrc;
  openOverlay('overlay-preview');
});
document.getElementById('btn-close-preview').addEventListener('click', () => closeOverlay('overlay-preview'));
document.getElementById('overlay-preview').addEventListener('click', function (e) {
  if (e.target === this) closeOverlay('overlay-preview');
});

document.getElementById('btn-letter').addEventListener('click', () => {
  openOverlay('overlay-letter');
  typeLetter();
});
document.getElementById('btn-close-letter').addEventListener('click', () => closeOverlay('overlay-letter'));
document.getElementById('overlay-letter').addEventListener('click', function (e) {
  if (e.target === this) closeOverlay('overlay-letter');
});

document.getElementById('btn-restart').addEventListener('click', () => openOverlay('overlay-confirm'));
document.getElementById('btn-confirm-no').addEventListener('click', () => closeOverlay('overlay-confirm'));
document.getElementById('btn-confirm-yes').addEventListener('click', () => {
  closeOverlay('overlay-confirm');
  buildPuzzle();
});
document.getElementById('overlay-confirm').addEventListener('click', function (e) {
  if (e.target === this) closeOverlay('overlay-confirm');
});

/* ────────────────────────────────────────────────────
   11. INIT
──────────────────────────────────────────────────── */
document.getElementById('btn-start').addEventListener('click', () => {
  startMusic();
  showScreen('screen-difficulty');
});

document.querySelectorAll('.diff-card').forEach(card => {
  card.addEventListener('click', () => {
    STATE.gridSize = parseInt(card.dataset.grid, 10);
    showScreen('screen-game');
    setTimeout(() => buildPuzzle(), 450);
  });
});

let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    const gs = document.getElementById('screen-game');
    if (gs.classList.contains('active') && STATE.placedPieces < STATE.totalPieces) {
      STATE.pieceSize = calcPieceSize();
    }
  }, 300);
});