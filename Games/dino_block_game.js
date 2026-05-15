
(() => {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  canvas.width = 900;
  canvas.height = 300;

  document.body.style.margin = "0";
  document.body.style.background = "black";
  document.body.style.overflow = "hidden";
  document.body.appendChild(canvas);

  const groundY = 240;

  const player = {
    x: 80,
    y: groundY - 40,
    width: 40,
    height: 40,
    velocityY: 0,
    gravity: 0.8,
    jumpPower: -14,
    grounded: true
  };

  const obstacles = [];
  let obstacleTimer = 0;

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

      if (gameOver) {
        restartGame();
      } else {
        jump();
      }
    }
  });

  function createObstacle() {
    const height = 30 + Math.random() * 20;

    obstacles.push({
      x: canvas.width,
      y: groundY - height,
      width: 20,
      height: height,
      speed: 6
    });
  }

  function restartGame() {
    obstacles.length = 0;
    player.y = groundY - 40;
    player.velocityY = 0;
    player.grounded = true;

    gameOver = false;
    startTime = Date.now();
  }

  function update() {
    if (gameOver) return;

    survivedSeconds = ((Date.now() - startTime) / 1000).toFixed(1);

    player.velocityY += player.gravity;
    player.y += player.velocityY;

    if (player.y >= groundY - player.height) {
      player.y = groundY - player.height;
      player.velocityY = 0;
      player.grounded = true;
    }

    obstacleTimer++;

    if (obstacleTimer > 85) {
      createObstacle();
      obstacleTimer = Math.floor(Math.random() * 35);
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

  function draw() {
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
      ctx.font = "40px Arial";
      ctx.fillText("GAME OVER", canvas.width / 2 - 140, 120);

      ctx.font = "22px Arial";
      ctx.fillText(
        "Press UP ARROW to restart",
        canvas.width / 2 - 145,
        165
      );
    }
  }

  function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
  }

  gameLoop();
})();
