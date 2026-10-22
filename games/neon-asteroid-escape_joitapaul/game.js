const canvas = document.getElementById("game-canvas");
const context = canvas.getContext("2d");
const scoreElement = document.getElementById("score");
const livesElement = document.getElementById("lives");
const bestScoreElement = document.getElementById("best-score");
const overlay = document.getElementById("game-overlay");
const overlayKicker = document.getElementById("overlay-kicker");
const overlayTitle = document.getElementById("overlay-title");
const overlayMessage = document.getElementById("overlay-message");
const startButton = document.getElementById("start-button");
const resetBestButton = document.getElementById("reset-best");

const width = canvas.width;
const height = canvas.height;
const directions = { up: false, down: false, left: false, right: false };
const keys = new Map([
  ["ArrowUp", "up"], ["w", "up"], ["W", "up"],
  ["ArrowDown", "down"], ["s", "down"], ["S", "down"],
  ["ArrowLeft", "left"], ["a", "left"], ["A", "left"],
  ["ArrowRight", "right"], ["d", "right"], ["D", "right"]
]);
const stars = Array.from({ length: 90 }, () => ({
  x: Math.random() * width,
  y: Math.random() * height,
  radius: Math.random() * 1.5 + 0.4,
  alpha: Math.random() * 0.7 + 0.2
}));
const player = { x: width / 2, y: height - 70, radius: 15, speed: 290 };

let asteroids = [];
let energyOrbs = [];
let score = 0;
let lives = 3;
let bestScore = readBestScore();
let elapsed = 0;
let asteroidTimer = 0;
let orbTimer = 0;
let lastFrame = 0;
let animationFrame = 0;
let gameState = "ready";
let invulnerableTime = 0;

bestScoreElement.textContent = String(bestScore);
drawScene();

function readBestScore() {
  try {
    return Number(localStorage.getItem("neon-asteroid-escape-best")) || 0;
  } catch (error) {
    console.warn("Could not read the saved best score.", error);
    return 0;
  }
}

function saveBestScore(value) {
  try {
    localStorage.setItem("neon-asteroid-escape-best", String(value));
  } catch (error) {
    console.warn("Could not save the best score.", error);
  }
}

function startGame() {
  cancelAnimationFrame(animationFrame);
  score = 0;
  lives = 3;
  elapsed = 0;
  asteroidTimer = 0;
  orbTimer = 0;
  invulnerableTime = 0;
  asteroids = [];
  energyOrbs = [];
  player.x = width / 2;
  player.y = height - 70;
  Object.keys(directions).forEach((direction) => {
    directions[direction] = false;
  });
  gameState = "running";
  updateHud();
  overlay.hidden = true;
  lastFrame = performance.now();
  animationFrame = requestAnimationFrame(gameLoop);
}

function gameLoop(timestamp) {
  if (gameState !== "running") return;

  const delta = Math.min((timestamp - lastFrame) / 1000, 0.04);
  lastFrame = timestamp;
  updateGame(delta);
  drawScene();
  animationFrame = requestAnimationFrame(gameLoop);
}

function updateGame(delta) {
  elapsed += delta;
  score += delta * 5;
  invulnerableTime = Math.max(0, invulnerableTime - delta);

  const horizontal = Number(directions.right) - Number(directions.left);
  const vertical = Number(directions.down) - Number(directions.up);
  const magnitude = Math.hypot(horizontal, vertical) || 1;
  player.x += (horizontal / magnitude) * player.speed * delta;
  player.y += (vertical / magnitude) * player.speed * delta;
  player.x = clamp(player.x, player.radius + 8, width - player.radius - 8);
  player.y = clamp(player.y, player.radius + 8, height - player.radius - 8);

  asteroidTimer += delta;
  const spawnInterval = Math.max(0.38, 1.05 - elapsed * 0.012);
  if (asteroidTimer >= spawnInterval) {
    asteroidTimer = 0;
    spawnAsteroid();
  }

  orbTimer += delta;
  if (orbTimer >= 3.4) {
    orbTimer = 0;
    spawnEnergyOrb();
  }

  asteroids.forEach((asteroid) => {
    asteroid.y += asteroid.speed * delta;
    asteroid.rotation += asteroid.spin * delta;
    if (invulnerableTime === 0 && distance(player, asteroid) < player.radius + asteroid.radius * 0.78) {
      asteroid.hit = true;
      lives -= 1;
      invulnerableTime = 1.25;
    }
  });

  energyOrbs.forEach((orb) => {
    orb.y += orb.speed * delta;
    orb.phase += delta * 5;
    if (distance(player, orb) < player.radius + orb.radius) {
      orb.collected = true;
      score += 50;
    }
  });

  asteroids = asteroids.filter((asteroid) => !asteroid.hit && asteroid.y < height + asteroid.radius);
  energyOrbs = energyOrbs.filter((orb) => !orb.collected && orb.y < height + orb.radius);
  updateHud();

  if (lives <= 0) endGame();
}

function spawnAsteroid() {
  const radius = Math.random() * 17 + 18;
  const sides = Math.floor(Math.random() * 4) + 7;
  const points = Array.from({ length: sides }, () => 0.72 + Math.random() * 0.5);
  asteroids.push({
    x: Math.random() * (width - radius * 2) + radius,
    y: -radius,
    radius,
    speed: 105 + Math.random() * 80 + Math.min(elapsed * 2, 120),
    rotation: Math.random() * Math.PI * 2,
    spin: (Math.random() - 0.5) * 1.4,
    points,
    hit: false
  });
}

function spawnEnergyOrb() {
  energyOrbs.push({
    x: Math.random() * (width - 50) + 25,
    y: -18,
    radius: 11,
    speed: 95 + Math.min(elapsed, 70),
    phase: 0,
    collected: false
  });
}

function drawScene() {
  context.clearRect(0, 0, width, height);
  context.fillStyle = "#080d1c";
  context.fillRect(0, 0, width, height);
  drawStars();
  energyOrbs.forEach(drawEnergyOrb);
  asteroids.forEach(drawAsteroid);
  drawPlayer();
}

function drawStars() {
  stars.forEach((star) => {
    context.globalAlpha = star.alpha;
    context.fillStyle = "#b9dcff";
    context.beginPath();
    context.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
    context.fill();
  });
  context.globalAlpha = 1;
}

function drawPlayer() {
  if (invulnerableTime > 0 && Math.floor(invulnerableTime * 12) % 2 === 0) return;

  context.save();
  context.translate(player.x, player.y);
  context.shadowColor = "#59e6ff";
  context.shadowBlur = 20;
  context.fillStyle = "#7af1ff";
  context.strokeStyle = "#dcfbff";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(0, -player.radius - 5);
  context.lineTo(player.radius * 0.85, player.radius);
  context.lineTo(0, player.radius * 0.55);
  context.lineTo(-player.radius * 0.85, player.radius);
  context.closePath();
  context.fill();
  context.stroke();
  context.restore();
}

function drawAsteroid(asteroid) {
  context.save();
  context.translate(asteroid.x, asteroid.y);
  context.rotate(asteroid.rotation);
  context.shadowColor = "#ff6b88";
  context.shadowBlur = 13;
  context.fillStyle = "#53354d";
  context.strokeStyle = "#ff8ca1";
  context.lineWidth = 2;
  context.beginPath();
  asteroid.points.forEach((point, index) => {
    const angle = (index / asteroid.points.length) * Math.PI * 2;
    const x = Math.cos(angle) * asteroid.radius * point;
    const y = Math.sin(angle) * asteroid.radius * point;
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  context.closePath();
  context.fill();
  context.stroke();
  context.restore();
}

function drawEnergyOrb(orb) {
  const pulse = 1 + Math.sin(orb.phase) * 0.13;
  context.save();
  context.translate(orb.x, orb.y);
  context.scale(pulse, pulse);
  context.shadowColor = "#5affbe";
  context.shadowBlur = 20;
  context.fillStyle = "#5affbe";
  context.beginPath();
  context.arc(0, 0, orb.radius, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#e9fff7";
  context.beginPath();
  context.arc(0, 0, orb.radius * 0.42, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function updateHud() {
  scoreElement.textContent = String(Math.floor(score));
  livesElement.textContent = `${"♥ ".repeat(Math.max(0, lives)).trim()}${lives < 3 ? " ·".repeat(3 - lives) : ""}`;
  livesElement.setAttribute("aria-label", `${lives} ${lives === 1 ? "life" : "lives"} remaining`);
  if (score > bestScore) {
    bestScore = Math.floor(score);
    bestScoreElement.textContent = String(bestScore);
    saveBestScore(bestScore);
  }
}

function endGame() {
  gameState = "over";
  cancelAnimationFrame(animationFrame);
  overlayKicker.textContent = "FLIGHT COMPLETE";
  overlayTitle.textContent = "The asteroid field caught up";
  overlayMessage.textContent = `You scored ${Math.floor(score)} points. Ready to take another run?`;
  startButton.textContent = "Play again";
  overlay.hidden = false;
}

function distance(first, second) {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

startButton.addEventListener("click", () => {
  overlayKicker.textContent = "READY FOR LAUNCH?";
  overlayTitle.textContent = "Escape the asteroid field";
  overlayMessage.textContent = "Use arrow keys or WASD to fly. Collect glowing energy orbs and avoid the asteroids.";
  startButton.textContent = "Start game";
  startGame();
});

resetBestButton.addEventListener("click", () => {
  bestScore = 0;
  bestScoreElement.textContent = "0";
  try {
    localStorage.removeItem("neon-asteroid-escape-best");
  } catch (error) {
    console.warn("Could not reset the saved best score.", error);
  }
});

document.addEventListener("keydown", (event) => {
  const direction = keys.get(event.key);
  if (direction && gameState === "running") {
    event.preventDefault();
    directions[direction] = true;
  }
});

document.addEventListener("keyup", (event) => {
  const direction = keys.get(event.key);
  if (direction) directions[direction] = false;
});

window.addEventListener("blur", () => {
  Object.keys(directions).forEach((direction) => {
    directions[direction] = false;
  });
});

document.querySelectorAll("[data-direction]").forEach((button) => {
  const direction = button.dataset.direction;
  const release = () => {
    directions[direction] = false;
  };

  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    directions[direction] = true;
  });
  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("lostpointercapture", release);
});
