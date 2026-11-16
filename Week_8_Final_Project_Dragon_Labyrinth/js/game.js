  
const bgMusic = document.getElementById("bg_chase.mp3");


if (bgMusic) {
    bgMusic.volume = 0.4; // Set volume between 0.0 (silent) and 1.0 (full blast)
}


function startBackgroundMusic() {
    if (bgMusic && bgMusic.paused) {
        bgMusic.play()
            .then(() => {
                console.log("Background music started successfully.");
                
                window.removeEventListener("click", startBackgroundMusic);
                window.removeEventListener("keydown", startBackgroundMusic);
            })
            .catch(error => {
                console.log("Playback engine waiting for deeper interaction:", error);
            });
    }
}

window.addEventListener("click", startBackgroundMusic);
window.addEventListener("keydown", startBackgroundMusic);

function stopBackgroundMusic() {
    if (bgMusic) {
        bgMusic.pause();
        bgMusic.currentTime = 0; // Rewinds the track to the very beginning
    }
}


//can't use undeclared variables
"use strict";

// Class for the parts of the game
class MazeGame {
  constructor() {
    // 16 x 16 matrix for the mazemap
    this.map = [
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,-1,-1,2,2,-1,-1,-1,-1,0,-1,-1,-1,-1,-1,1],
      [1,-1,-1,-1,-1,-1,3,3,-1,-1,-1,0,0,0,-1,1],
      [1,-1,-1,2,2,3,-1,-1,-1,0,0,-1,-1,-1,-1,1],
      [1,1,1,1,3,3,-1,1,1,-1,-1,-1,1,1,1,1],
      [-1,-1,-1,1,3,-1,-1,1,1,-1,-1,-1,1,-1,-1,-1],
      [-1,-1,-1,1,3,-1,-1,1,1,0,0,-1,1,-1,-1,-1],
      [-1,-1,-1,1,-1,-1,3,1,1,0,-1,-1,1,-1,-1,-1],
      [-1,-1,-1,1,-1,-1,3,1,1,-1,-1,-1,1,-1,-1,-1],
      [-1,-1,-1,1,-1,3,3,1,1,-1,0,0,1,-1,-1,-1],
     [-1,-1,-1,1,-1,-1,-1,1,1,-1,-1,0,1,-1,-1,-1],
      [1,1,1,1,3,-1,3,1,1,0,-1,-1,1,1,1,1],
      [1,-1,-1,3,3,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1],
      [1,3,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1],
      [1,3,3,-1,-1,3,-1,-1,0,0,0,-1,-1,-1,3,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    ]; 

    this.canvas = document.querySelector("#canvas");
    this.ctx = this.canvas.getContext("2d");
    this.mazemap = document.querySelector("#mazemap");
    this.mapCtx = this.mazemap.getContext("2d");
    this.screenshot = document.querySelector("#screenshot");
    this.shotCtx = this.screenshot.getContext("2d");

    this.player = {
      x: 14,
      y: 14,
      angle: -Math.PI / 2,
      image: new Image(),
      showPosition: function () {
        let hud = document.getElementById("hud-position");
        if (!hud) {
          hud = document.createElement("div");
          hud.id = "hud-position";
          hud.style.cssText =
            "position:absolute; top:10px; left:10px; color:#45e6d2; background:rgba(7,17,31,0.75); padding:6px 10px; font-family:monospace; font-size:13px; border-radius:6px; z-index:10; pointer-events:none;";
          const frame = document.querySelector(".canvas-frame");
          if (frame) frame.appendChild(hud);
        }
        hud.textContent = `X: ${this.x.toFixed(2)}  Y: ${this.y.toFixed(2)}`;
      }
    };
    this.player.image.src = "images/Warrior.png";
    this.dragon = { x: 2.5, y: 2.5, image: new Image() };
    this.dragon.image.src = "images/dragon.png";

    this.keys = new Set();
    this.showRays = true;
    this.hasSnapshot = false;
    this.dragonVisible = false;
    // winning exit: a loose circular area around this map position (only counts after the dragon snapshot)
    this.exit = { x: 1.40, y: 1.41, radius: 1.25 };
    this.playerStatus = "still searching"; // "still searching", "Dragon snapshot taken", or "YOU ESCAPED!"
    this.fov = Math.PI / 3;
    this.moveSpeed = 2.35;
    this.turnSpeed = 2.05;
    this.lastTime = performance.now();
    this.rayHits = [];

    this.wallColors = [
      [60, 86, 189],
      [43, 235, 14],
      [224, 4, 26],
      [99, 74, 24]
    ];

    this.bindControls();
    this.resizeForDisplay();
    window.addEventListener("resize", () => this.resizeForDisplay());
    requestAnimationFrame((time) => this.loop(time));
  } // end of the constructor

  // helper functions for game play
  bindControls() {
    const handled = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "KeyW", "KeyA", "KeyS", "KeyD"]);
    window.addEventListener("keydown", (event) => {
      if (handled.has(event.code)) event.preventDefault();
      if (event.code === "Space" && !event.repeat) this.takeSnapshot();
      this.keys.add(event.code);
    });
    window.addEventListener("keyup", (event) => this.keys.delete(event.code));
    window.addEventListener("blur", () => this.keys.clear());

    const controlMap = {
      forward: "ArrowUp",
      backward: "ArrowDown",
      left: "ArrowLeft",
      right: "ArrowRight"
    };

    document.querySelectorAll("[data-control]").forEach((button) => {
      const code = controlMap[button.dataset.control];
      const press = (event) => {
        event.preventDefault();
        this.keys.add(code);
        button.classList.add("is-active");
      };
      const release = (event) => {
        event.preventDefault();
        this.keys.delete(code);
        button.classList.remove("is-active");
      };
      button.addEventListener("pointerdown", press);
      button.addEventListener("pointerup", release);
      button.addEventListener("pointercancel", release);
      button.addEventListener("pointerleave", release);
    });

    document.querySelector("#cameraButton").addEventListener("click", () => this.takeSnapshot());
    document.querySelector("#resetButton").addEventListener("click", () => this.reset());
    
    document.querySelector("#filterButton").addEventListener("click", (event) => {
      if (!this.hasSnapshot) return;
      const active = this.screenshot.classList.toggle("vintage");
      event.currentTarget.textContent = active ? "Remove vintage filter" : "Apply vintage filter";
      event.currentTarget.setAttribute("aria-pressed", String(active));
    });
  }

  resizeForDisplay() {
    // Canvas drawing resolution stays fixed for predictable raycasting; CSS handles responsiveness.
    this.drawScene();
    this.drawMap();
  }

  reset() {
    this.player.x = 14;
    this.player.y = 14;
    this.player.angle = -Math.PI / 2;
    this.keys.clear();
    this.playerStatus = "still searching";
  }

  isWall(x, y) {
    const row = Math.floor(y);
    const column = Math.floor(x);
    if (!this.map[row] || this.map[row][column] === undefined) return true;
    return this.map[row][column] !== -1;
  }

  update(delta) {
    const turningLeft = this.keys.has("ArrowLeft") || this.keys.has("KeyA");
    const turningRight = this.keys.has("ArrowRight") || this.keys.has("KeyD");
    const movingForward = this.keys.has("ArrowUp") || this.keys.has("KeyW");
    const movingBackward = this.keys.has("ArrowDown") || this.keys.has("KeyS");

    if (turningLeft) this.player.angle -= this.turnSpeed * delta;
    if (turningRight) this.player.angle += this.turnSpeed * delta;

    let direction = 0;
    if (movingForward) direction += 1;
    if (movingBackward) direction -= 1;

    if (direction !== 0) {
      const step = this.moveSpeed * delta * direction;
      const nextX = this.player.x + Math.cos(this.player.angle) * step;
      const nextY = this.player.y + Math.sin(this.player.angle) * step;
      const padding = 0.18;

      if (!this.isWall(nextX + Math.sign(step) * Math.cos(this.player.angle) * padding, this.player.y)) {
        this.player.x = nextX;
      }
      if (!this.isWall(this.player.x, nextY + Math.sign(step) * Math.sin(this.player.angle) * padding)) {
        this.player.y = nextY;
      }
    }

    // stuff for HUD to be added here later
    this.player.showPosition();

    // once the dragon is photographed, reaching the exit means you escaped
    if (this.playerStatus === "Dragon snapshot taken" &&
        Math.hypot(this.player.x - this.exit.x, this.player.y - this.exit.y) <= this.exit.radius) {
      this.playerStatus = "YOU ESCAPED!";
    }
    this.showStatus();
  }

  //------------------------------------------
  //  STUFF FOR 3D VIEW
  //  ----------------------------------------
  
  // HUD for the player status
  showStatus() {
    let hud = document.getElementById("hud-status");
    if (!hud) {
      hud = document.createElement("div");
      hud.id = "hud-status";
      hud.style.cssText =
        "position:absolute; top:10px; right:10px; color:#45e6d2; background:rgba(7,17,31,0.75); padding:6px 10px; font-family:monospace; font-size:13px; border-radius:6px; z-index:10; pointer-events:none;";
      const frame = document.querySelector(".canvas-frame");
      if (frame) frame.appendChild(hud);
    }
    hud.textContent = `Status: ${this.playerStatus}`;
  }

  // ray tracing for the 3D view
  castRay(angle) {
    const sin = Math.sin(angle) || 0.000001;
    const cos = Math.cos(angle) || 0.000001;
    let distance = 0;
    const step = 0.018;
    const maxDistance = 24;
    let x = this.player.x;
    let y = this.player.y;

    while (distance < maxDistance) {
      distance += step;
      x = this.player.x + cos * distance;
      y = this.player.y + sin * distance;
      if (this.isWall(x, y)) {
        const cellX = Math.floor(x);
        const cellY = Math.floor(y);
        return { distance, x, y, wallType: this.map[cellY][cellX] };
      }
    }
    return { distance: maxDistance, x, y, wallType: 1 };
  }

  // Draw the 3D view
  drawScene() {
    const { width, height } = this.canvas;
    const horizon = height * 0.5;
    const sky = this.ctx.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, "#071426");
    sky.addColorStop(1, "#183b5d");
    this.ctx.fillStyle = sky;
    this.ctx.fillRect(0, 0, width, horizon);

    const floor = this.ctx.createLinearGradient(0, horizon, 0, height);
    floor.addColorStop(0, "#17202a");
    floor.addColorStop(1, "#05080d");
    this.ctx.fillStyle = floor;
    this.ctx.fillRect(0, horizon, width, height - horizon);

    this.ctx.strokeStyle = "rgba(94, 228, 211, 0.055)";
    this.ctx.lineWidth = 1;
    for (let y = horizon + 25; y < height; y += Math.max(10, (y - horizon) * 0.18)) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(width, y);
      this.ctx.stroke();
    }

    const rayCount = width;
    const stripWidth = width / rayCount;
    this.rayHits = [];

    for (let ray = 0; ray < rayCount; ray += 1) {
      const cameraPosition = ray / rayCount - 0.5;
      const angle = this.player.angle + cameraPosition * this.fov;
      const hit = this.castRay(angle);
      const correctedDistance = hit.distance * Math.cos(angle - this.player.angle);
      const wallHeight = Math.min(height * 1.8, height / Math.max(correctedDistance, 0.001));
      const top = horizon - wallHeight / 2;
      const base = this.wallColors[hit.wallType] || this.wallColors[1];
      const light = Math.max(0.16, 1 - correctedDistance / 18);
      const edgeShade = ((hit.x % 1) < 0.04 || (hit.y % 1) < 0.04) ? 0.78 : 1;
      const r = Math.round(base[0] * light * edgeShade);
      const g = Math.round(base[1] * light * edgeShade);
      const b = Math.round(base[2] * light * edgeShade);
      this.ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      this.ctx.fillRect(ray * stripWidth, top, Math.ceil(stripWidth + 0.5), wallHeight);
      if (ray % 10 === 0) this.rayHits.push(hit);
    }

    // put the dragon into the 3D rendering if it's supposed to be seen
    this.drawDragon();

    const vignette = this.ctx.createRadialGradient(width / 2, height / 2, height * 0.18, width / 2, height / 2, width * 0.7);
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(1, "rgba(0,0,0,0.48)");
    this.ctx.fillStyle = vignette;
    this.ctx.fillRect(0, 0, width, height);
  }

  drawDragon() {
    this.dragonVisible = false;
    const dx = this.dragon.x - this.player.x;
    const dy = this.dragon.y - this.player.y;
    const distance = Math.hypot(dx, dy);
    let relativeAngle = Math.atan2(dy, dx) - this.player.angle;
    relativeAngle = Math.atan2(Math.sin(relativeAngle), Math.cos(relativeAngle));
    if (Math.abs(relativeAngle) > this.fov * 0.58) return;

    const wallHit = this.castRay(this.player.angle + relativeAngle);
    if (wallHit.distance < distance) return;

    const size = Math.min(this.canvas.height * 0.85, (this.canvas.height / distance) * 0.82);
    const x = (0.5 + relativeAngle / this.fov) * this.canvas.width;
    const y = this.canvas.height * 0.5 + size * 0.18;
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.save();
    this.ctx.shadowColor = "rgba(255, 111, 171, 0.8)";
    this.ctx.shadowBlur = 24;
    this.dragonVisible = true;
    this.ctx.drawImage(this.dragon.image, x - size / 2, y - size / 2, size, size);
    this.ctx.restore();
    this.ctx.imageSmoothingEnabled = true;
  }

  //------------------------------------------
  //  STUFF FOR mazeMAP
  //  ----------------------------------------
  drawMap() {
    const width = this.mazemap.width;
    const height = this.mazemap.height;
    const cellW = width / this.map[0].length;
    const cellH = height / this.map.length;
    this.mapCtx.clearRect(0, 0, width, height);
    this.mapCtx.fillStyle = "#07101b";
    this.mapCtx.fillRect(0, 0, width, height);

    for (let y = 0; y < this.map.length; y += 1) {
      for (let x = 0; x < this.map[y].length; x += 1) {
        const cell = this.map[y][x];
        
        // if it's not the floor, put the correct-coloured block
        if (cell !== -1) {
          const color = this.wallColors[cell] || this.wallColors[1];
          this.mapCtx.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0.76)`;
          this.mapCtx.fillRect(x * cellW + 1, y * cellH + 1, cellW - 2, cellH - 2);
        } else {
          this.mapCtx.fillStyle = "rgba(255,255,255,0.025)";
          this.mapCtx.fillRect(x * cellW + 1, y * cellH + 1, cellW - 2, cellH - 2);
        }
      }
    }

    if (this.showRays) {
      this.mapCtx.strokeStyle = "rgba(69, 230, 210, 0.08)";
      this.mapCtx.lineWidth = 1;
      for (const hit of this.rayHits) {
        this.mapCtx.beginPath();
        this.mapCtx.moveTo(this.player.x * cellW, this.player.y * cellH);
        this.mapCtx.lineTo(hit.x * cellW, hit.y * cellH);
        this.mapCtx.stroke();
      }
    }

    this.mapCtx.fillStyle = "#ff6fab";
    this.mapCtx.shadowColor = "#ff6fab";
    this.mapCtx.shadowBlur = 12;
    this.mapCtx.fillRect((this.dragon.x - 0.25) * cellW, (this.dragon.y - 0.25) * cellH, cellW * 0.5, cellH * 0.5);
    this.mapCtx.shadowBlur = 0;

    const px = this.player.x * cellW;
    const py = this.player.y * cellH;
    // the player is the picture of the warrior
    const warriorH = cellH * 1.8;
    const warriorW = warriorH * ((this.player.image.naturalWidth / this.player.image.naturalHeight) || 0.82);
    this.mapCtx.drawImage(this.player.image, px - warriorW / 2, py - warriorH / 2, warriorW, warriorH);
    this.mapCtx.strokeStyle = "#dffffa";
    this.mapCtx.lineWidth = 3;
    this.mapCtx.beginPath();
    this.mapCtx.moveTo(px, py);
    this.mapCtx.lineTo(px + Math.cos(this.player.angle) * cellW * 0.8, py + Math.sin(this.player.angle) * cellH * 0.8);
    this.mapCtx.stroke();
  }

  //------------------------------------------
  //  STUFF FOR THE CAMERA
  //  ----------------------------------------
  takeSnapshot() {
    this.shotCtx.clearRect(0, 0, this.screenshot.width, this.screenshot.height);
    this.shotCtx.drawImage(this.canvas, 0, 0, this.screenshot.width, this.screenshot.height);
    this.hasSnapshot = true;
    if (this.dragonVisible && this.playerStatus === "still searching") {
      this.playerStatus = "Dragon snapshot taken";
    }
    document.querySelector("#emptySnapshot").hidden = true;
    this.screenshot.animate([{ opacity: 0.35 }, { opacity: 1 }], { duration: 260, easing: "ease-out" });
  }

   //------------------------------------------
  //  LET'S GET THE GAME RUNNING!
  //  ----------------------------------------
  loop(time) {
    const delta = Math.min((time - this.lastTime) / 1000, 0.04);
    this.lastTime = time;
    this.update(delta);
    this.drawScene();
    this.drawMap();
    requestAnimationFrame((nextTime) => this.loop(nextTime));
  }
}


window.addEventListener("DOMContentLoaded", () => new MazeGame());
