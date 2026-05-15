(function() {
    var style = document.createElement('style');
    style.textContent = 'body { margin: 0; overflow: hidden; background-color: #222; font-family: "Courier New", Courier, monospace; transition: background-color 0.3s; } canvas { display: block; }';
    document.head.appendChild(style);

    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    document.body.appendChild(canvas);

    var STATE = { MENU: 0, PLAYING: 1, GAMEOVER: 2 };
    var currentState = STATE.MENU;
    var difficulty = 'medium';
    var startTime = 0;
    var elapsedTime = 0;
    var isDarkMode = true;
    var isMuted = false;

    var audioCtx = null;

    function initAudio() {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }

    function playJumpSound() {
        if (isMuted) return;
        initAudio();
        var osc = audioCtx.createOscillator();
        var gain = audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(150, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(400, audioCtx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
    }

    function playGameOverSound() {
        if (isMuted) return;
        initAudio();
        var osc = audioCtx.createOscillator();
        var gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.5);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.5);
    }

    var DIFFICULTY_SETTINGS = {
        easy: { speed: 0.005, spacing: 0.6, gravity: 0.0008, jumpForce: -0.025 },
        medium: { speed: 0.007, spacing: 0.5, gravity: 0.0011, jumpForce: -0.030 },
        hard: { speed: 0.009, spacing: 0.45, gravity: 0.0015, jumpForce: -0.035 }
    };

    var player = {
        relX: 0.1,
        relY: 0,
        relW: 0.05,
        relH: 0.08,
        velocityY: 0,
        isJumping: false
    };

    var obstacles = [];

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    window.addEventListener('keydown', function(e) {
        if (e.key === 'ArrowUp') {
            if (currentState === STATE.PLAYING && !player.isJumping) {
                var settings = DIFFICULTY_SETTINGS[difficulty];
                player.velocityY = settings.jumpForce * canvas.height;
                player.isJumping = true;
                playJumpSound();
            } else if (currentState === STATE.GAMEOVER) {
                resetGame();
            }
        }
    });

    canvas.addEventListener('click', function(e) {
        var rect = canvas.getBoundingClientRect();
        var x = e.clientX - rect.left;
        var y = e.clientY - rect.top;

        if (currentState === STATE.MENU) {
            var btnW = canvas.width * 0.2;
            var btnH = canvas.height * 0.08;
            var startX = canvas.width * 0.4;
            
            for (var i = 0; i < 3; i++) {
                var btnY = canvas.height * (0.4 + i * 0.1);
                if (x > startX && x < startX + btnW && y > btnY && y < btnY + btnH) {
                    var modes = ['easy', 'medium', 'hard'];
                    startGame(modes[i]);
                    return;
                }
            }

            var dmW = canvas.width * 0.15;
            var dmH = canvas.height * 0.06;
            var dmX = canvas.width - dmW - 20;
            var dmY = canvas.height - dmH - 20;
            if (x > dmX && x < dmX + dmW && y > dmY && y < dmY + dmH) {
                isDarkMode = !isDarkMode;
                document.body.style.backgroundColor = isDarkMode ? '#222' : '#f7f7f7';
                return;
            }

            var muteX = dmX - dmW - 10;
            if (x > muteX && x < muteX + dmW && y > dmY && y < dmY + dmH) {
                isMuted = !isMuted;
                return;
            }
        } else if (currentState === STATE.GAMEOVER) {
            resetGame();
        }
    });

    function startGame(mode) {
        difficulty = mode;
        currentState = STATE.PLAYING;
        startTime = Date.now();
        obstacles = [];
        player.relY = 0;
        player.velocityY = 0;
        player.isJumping = false;
    }

    function resetGame() {
        currentState = STATE.MENU;
    }

    function update() {
        if (currentState === STATE.PLAYING) {
            elapsedTime = (Date.now() - startTime) / 1000;
            var groundY = canvas.height * 0.8;
            var settings = DIFFICULTY_SETTINGS[difficulty];
            
            player.relY += player.velocityY / canvas.height;
            player.velocityY += settings.gravity * canvas.height;

            if (player.relY >= 0) {
                player.relY = 0;
                player.velocityY = 0;
                player.isJumping = false;
            }

            var minSpacing = canvas.width * settings.spacing;
            if (obstacles.length === 0 || (canvas.width - obstacles[obstacles.length - 1].x) > minSpacing) {
                if (Math.random() < 0.02) {
                    obstacles.push({
                        x: canvas.width,
                        relW: 0.03,
                        relH: 0.05 + Math.random() * 0.05
                    });
                }
            }

            var speed = canvas.width * settings.speed;
            for (var i = obstacles.length - 1; i >= 0; i--) {
                obstacles[i].x -= speed;
                var pX = player.relX * canvas.width;
                var pY = groundY - (player.relH * canvas.height) + (player.relY * canvas.height);
                var pW = player.relW * canvas.width;
                var pH = player.relH * canvas.height;
                var oX = obstacles[i].x;
                var oW = obstacles[i].relW * canvas.width;
                var oH = obstacles[i].relH * canvas.height;
                var oY = groundY - oH;

                if (pX < oX + oW && pX + pW > oX && pY < oY + oH && pY + pH > oY) {
                    currentState = STATE.GAMEOVER;
                    playGameOverSound();
                }
                if (obstacles[i].x + oW < 0) {
                    obstacles.splice(i, 1);
                }
            }
        }
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        var groundY = canvas.height * 0.8;
        var mainColor = isDarkMode ? '#eee' : '#535353';
        
        ctx.strokeStyle = mainColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, groundY);
        ctx.lineTo(canvas.width, groundY);
        ctx.stroke();

        if (currentState === STATE.MENU) {
            drawMenu(mainColor);
        } else if (currentState === STATE.PLAYING || currentState === STATE.GAMEOVER) {
            drawPlayer(groundY, mainColor);
            drawObstacles(groundY);
            drawUI(mainColor);
            if (currentState === STATE.GAMEOVER) drawGameOver();
        }
        update();
        requestAnimationFrame(draw);
    }

    function drawPlayer(groundY, color) {
        ctx.fillStyle = color;
        var pW = player.relW * canvas.width;
        var pH = player.relH * canvas.height;
        var pX = player.relX * canvas.width;
        var pY = groundY - pH + (player.relY * canvas.height);
        ctx.fillRect(pX, pY, pW, pH);
    }

    function drawObstacles(groundY) {
        ctx.fillStyle = '#ff4d4d';
        for (var i = 0; i < obstacles.length; i++) {
            var obs = obstacles[i];
            var oW = obs.relW * canvas.width;
            var oH = obs.relH * canvas.height;
            ctx.fillRect(obs.x, groundY - oH, oW, oH);
        }
    }

    function drawUI(color) {
        ctx.fillStyle = color;
        ctx.font = Math.max(16, canvas.width * 0.02) + 'px Courier New';
        ctx.textAlign = 'left';
        ctx.fillText('Time: ' + elapsedTime.toFixed(1) + 's', 20, 40);
        ctx.textAlign = 'right';
        ctx.fillText('Mode: ' + difficulty.toUpperCase(), canvas.width - 20, 40);
    }

    function drawMenu(color) {
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.font = 'bold ' + (canvas.width * 0.05) + 'px Courier New';
        ctx.fillText('DINO RUNNER', canvas.width / 2, canvas.height * 0.25);
        
        var btnW = canvas.width * 0.2;
        var btnH = canvas.height * 0.08;
        var startX = canvas.width * 0.4;
        var labels = ['Easy', 'Medium', 'Hard'];
        for (var i = 0; i < labels.length; i++) {
            var y = canvas.height * (0.4 + i * 0.1);
            ctx.fillStyle = isDarkMode ? '#444' : '#e0e0e0';
            ctx.fillRect(startX, y, btnW, btnH);
            ctx.strokeStyle = color;
            ctx.strokeRect(startX, y, btnW, btnH);
            ctx.fillStyle = color;
            ctx.font = (canvas.width * 0.02) + 'px Courier New';
            ctx.fillText(labels[i], canvas.width / 2, y + btnH / 2 + 8);
        }

        var dmW = canvas.width * 0.15;
        var dmH = canvas.height * 0.06;
        var dmX = canvas.width - dmW - 20;
        var dmY = canvas.height - dmH - 20;
        
        ctx.fillStyle = isDarkMode ? '#444' : '#e0e0e0';
        ctx.fillRect(dmX, dmY, dmW, dmH);
        ctx.strokeStyle = color;
        ctx.strokeRect(dmX, dmY, dmW, dmH);
        ctx.fillStyle = color;
        ctx.font = (canvas.width * 0.015) + 'px Courier New';
        ctx.fillText(isDarkMode ? 'Light Mode' : 'Dark Mode', dmX + dmW / 2, dmY + dmH / 2 + 5);

        var muteX = dmX - dmW - 10;
        ctx.fillStyle = isDarkMode ? '#444' : '#e0e0e0';
        ctx.fillRect(muteX, dmY, dmW, dmH);
        ctx.strokeStyle = color;
        ctx.strokeRect(muteX, dmY, dmW, dmH);
        ctx.fillStyle = color;
        ctx.fillText(isMuted ? 'Unmute' : 'Mute', muteX + dmW / 2, dmY + dmH / 2 + 5);
    }

    function drawGameOver() {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.font = 'bold ' + (canvas.width * 0.05) + 'px Courier New';
        ctx.fillText('GAME OVER', canvas.width / 2, canvas.height * 0.45);
        ctx.font = (canvas.width * 0.02) + 'px Courier New';
        ctx.fillText('Final Time: ' + elapsedTime.toFixed(1) + 's', canvas.width / 2, canvas.height * 0.52);
        ctx.fillText('Press Up Arrow or Click to Restart', canvas.width / 2, canvas.height * 0.6);
    }

    draw();
})();
