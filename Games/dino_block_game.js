
(() => {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  canvas.width = 900;
  canvas.height = 300;

  document.body.style.margin = "0";
  document.body.style.background = "black";
  document.body.style.display = "flex";
  document.body.style.justifyContent = "center";
  document.body.style.alignItems = "center";
  document.body.style.height = "100vh";
  document.body.style.overflow = "hidden";

  document.body.appendChild(canvas);

  const groundY = 240;

  const player = {
    x: 260,
    y: groundY - 40,
    width: 40,
    height: 40,
    velocityY: 0,
    gravity: 0.8,
    jumpPower: -14,
    grounded: true
  };

  const difficulties = {
    Easy: {
      speed: 4,
      spawnRate: 125
    },
    Medium: {
      speed: 5,
      spawnRate: 100
    },
    Hard: {
      speed: 6,
      spawnRate: 85
    }
  };

  let currentDifficulty = null;

  const buttonWidth = 220;
  const buttonHeight = 45;
  const centerX = canvas.width / 2 - buttonWidth / 2;

  const buttons = [
    { text: "Easy", x: centerX, y: 120, w: buttonWidth, h: buttonHeight },
    { text: "Medium", x: centerX, y: 180, w: buttonWidth, h: buttonHeight },
    { text: "Hard", x: centerX, y: 240, w: buttonWidth, h: buttonHeight }
  ];

  const obstacles = [];
  let obstacleTimer = 0;

  let gameState = "menu";
  let gameOver = false;

  let startTime = Date.now();
  let survivedSeconds = 0;

  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  function playJumpSound() {
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = "square";
    oscillator.frequency.value = 450;

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.0001,
      audioCtx.currentTime + 0.15
    );

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.15);
  }

  function startGame(mode) {
    currentDifficulty = difficulties[mode];

    obstacles.length = 0;
    obstacleTimer = 0;

    player.y = groundY - player.height;
    player.velocityY = 0;
    player.grounded = true;

    startTime = Date.now();
    gameOver = false;
    gameState = "playing";
  }

  function jump() {
    if (player.grounded && !gameOver) {
      player.velocityY = player.jumpPower;
      player.grounded = false;
      playJumpSound();
    }
  }

  document.addEventListener("keydown", (e) => {
    if (e.code === "ArrowUp") {
      e.preventDefault();

      if (gameState === "playing") {
        if (gameOver) {
          gameState = "menu";
        } else {
          jump();
        }
      }
    }
  });

  canvas.addEventListener("click", (e) => {
    if (gameState !== "menu") return;

    const rect = canvas.getBoundingClientRect();

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    buttons.forEach((btn) => {
      if (
        mouseX >= btn.x &&
        mouseX <= btn.x + btn.w &&
        mouseY >= btn.y &&
        mouseY <= btn.y + btn.h
      ) {
        startGame(btn.text);
      }
    });
  });

  function createObstacle() {
    const height = 30 + Math.random() * 20;

    obstacles.push({
      x: canvas.width,
      y: groundY - height,
      width: 20,
      height: height,
      speed: currentDifficulty.speed
    });
  }

  function update() {
    if (gameState !== "playing" || gameOver) return;

    survivedSeconds = ((Date.now() - startTime) / 1000).toFixed(1);

    player.velocityY += player.gravity;
    player.y += player.velocityY;

    if (player.y >= groundY - player.height) {
      player.y = groundY - player.height;
      player.velocityY = 0;
      player.grounded = true;
    }

    obstacleTimer++;

    if (obstacleTimer > currentDifficulty.spawnRate) {
      createObstacle();
      obstacleTimer = Math.floor(Math.random() * 30);
    }

    for (let i = obstacles.length - 1; i >= 0; i--) {
      const obs = obstacles[i];

      obs.x -= obs.speed;

      if (
        player.x < obs.x + obs.width &&
        player.x + player.width > obs.x &&
        player.y < obs.y + obs.height &&
        player.y + player.height > obs.y
      ) {
        gameOver = true;
      }

      if (obs.x + obs.width < 0) {
        obstacles.splice(i, 1);
      }
    }
  }

  function drawCenteredText(text, y, size) {
    ctx.font = `${size}px Arial`;
    const width = ctx.measureText(text).width;
    ctx.fillText(text, canvas.width / 2 - width / 2, y);
  }

  function drawMenu() {
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "white";

    drawCenteredText("BLOCK RUNNER", 70, 52);
    drawCenteredText("Choose Difficulty", 105, 22);

    buttons.forEach((btn) => {
      ctx.fillStyle = "#222";
      ctx.fillRect(btn.x, btn.y, btn.w, btn.h);

      ctx.strokeStyle = "white";
      ctx.strokeRect(btn.x, btn.y, btn.w, btn.h);

      ctx.fillStyle = "white";
      drawCenteredText(btn.text, btn.y + 30, 24);
    });
  }

  function drawGame() {
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "gray";
    ctx.fillRect(0, groundY, canvas.width, 4);

    ctx.fillStyle = "white";
    ctx.fillRect(player.x, player.y, player.width, player.height);

    ctx.fillStyle = "red";

    obstacles.forEach((obs) => {
      ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
    });

    ctx.fillStyle = "white";
    ctx.font = "20px Arial";
    ctx.fillText(`Time: ${survivedSeconds}s`, 15, 30);

    if (gameOver) {
      drawCenteredText("GAME OVER", 120, 42);
      drawCenteredText("Press UP ARROW to return to menu", 165, 22);
    }
  }

  function gameLoop() {
    update();

    if (gameState === "menu") {
      drawMenu();
    } else {
      drawGame();
    }

    requestAnimationFrame(gameLoop);
  }

  gameLoop();
})();
