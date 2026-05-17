(function() {
    // 1. Setup CSS
    const style = document.createElement('style');
    style.textContent = `
        body {
            margin: 0;
            overflow: hidden;
            background-color: #121212;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            user-select: none;
        }
        canvas {
            display: block;
        }
        #game-ui {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            text-align: center;
            color: white;
            z-index: 10;
            pointer-events: none;
        }
        .btn {
            padding: 15px 40px;
            font-size: 24px;
            background-color: #BB86FC;
            color: #121212;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-weight: bold;
            transition: background-color 0.2s;
            margin: 10px;
            pointer-events: auto;
        }
        .btn:hover {
            background-color: #9965f4;
        }
        .mute-btn {
            position: absolute;
            top: 20px;
            right: 20px;
            background: rgba(255, 255, 255, 0.1);
            color: white;
            border: 1px solid white;
            padding: 10px;
            border-radius: 50%;
            cursor: pointer;
            width: 45px;
            height: 45px;
            display: flex;
            align-items: center;
            justify-content: center;
            pointer-events: auto;
            z-index: 20;
        }
        .title {
            font-size: 48px;
            margin-bottom: 10px;
            color: #BB86FC;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
        }
        .countdown {
            font-size: 72px;
            font-weight: bold;
            color: #BB86FC;
        }
    `;
    document.head.appendChild(style);

    // 2. Create Canvas and UI
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    document.body.appendChild(canvas);

    const uiContainer = document.createElement('div');
    uiContainer.id = 'game-ui';
    document.body.appendChild(uiContainer);

    const muteBtn = document.createElement('button');
    muteBtn.className = 'mute-btn';
    muteBtn.innerHTML = '🔊';
    document.body.appendChild(muteBtn);

    // 3. Audio Setup
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    let isMuted = false;

    function playSound(freq, type, duration, volume = 0.1, slide = true) {
        if (isMuted) return;
        if (audioCtx.state === 'suspended') audioCtx.resume();
        
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        if (slide) {
            osc.frequency.exponentialRampToValueAtTime(freq / 2, audioCtx.currentTime + duration);
        }
        
        gain.gain.setValueAtTime(volume, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    }

    const sounds = {
        jump: () => playSound(400, 'sine', 0.2),
        countdown: () => playSound(300, 'square', 0.1, 0.05),
        go: () => playSound(600, 'square', 0.3, 0.05),
        score: () => playSound(800, 'sine', 0.1, 0.05, false),
        gameOver: () => {
            playSound(200, 'sawtooth', 0.5);
            setTimeout(() => playSound(150, 'sawtooth', 0.5), 100);
        }
    };

    muteBtn.onclick = () => {
        isMuted = !isMuted;
        muteBtn.innerHTML = isMuted ? '🔇' : '🔊';
    };

    // 4. Game Variables
    let width, height;
    let bird, pipes, score, gameState, frameCount, countdownValue;
    
    const GRAVITY = 0.12; 
    const JUMP = -3.5;
    const PIPE_SPEED_RATIO = 0.0025;
    const PIPE_WIDTH_RATIO = 0.15;
    const PIPE_GAP_RATIO = 0.45;
    const BIRD_SIZE_RATIO = 0.04;

    const STATES = {
        MENU: 'menu',
        COUNTDOWN: 'countdown',
        PLAYING: 'playing',
        GAMEOVER: 'gameover'
    };

    function init() {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;

        bird = {
            x: width * 0.2,
            y: height / 2,
            velocity: 0,
            radius: Math.min(width, height) * BIRD_SIZE_RATIO
        };

        pipes = [];
        score = 0;
        frameCount = 0;
        gameState = STATES.MENU;
        showMenu();
    }

    function showMenu() {
        muteBtn.style.display = 'flex';
        uiContainer.innerHTML = `
            <div class="title">FLAPPY DOT</div>
            <div style="margin-bottom: 20px;">Press Up Arrow to Fly</div>
            <button class="btn" id="play-btn">PLAY</button>
        `;
        document.getElementById('play-btn').onclick = startCountdown;
    }

    function startCountdown() {
        muteBtn.style.display = 'none';
        gameState = STATES.COUNTDOWN;
        countdownValue = 3;
        uiContainer.innerHTML = `<div class="countdown">${countdownValue}</div>`;
        
        bird.y = height / 2;
        bird.velocity = 0;
        pipes = [];
        score = 0;

        const timer = setInterval(() => {
            countdownValue--;
            if (countdownValue > 0) {
                sounds.countdown();
                uiContainer.innerHTML = `<div class="countdown">${countdownValue}</div>`;
            } else {
                clearInterval(timer);
                sounds.go();
                uiContainer.innerHTML = '';
                gameState = STATES.PLAYING;
            }
        }, 1000);
        sounds.countdown();
    }

    function showGameOver() {
        muteBtn.style.display = 'flex';
        sounds.gameOver();
        uiContainer.innerHTML = `
            <div class="title">GAME OVER</div>
            <div style="font-size: 24px; margin-bottom: 20px;">Score: ${score}</div>
            <button class="btn" id="retry-btn">RETRY</button>
        `;
        document.getElementById('retry-btn').onclick = startCountdown;
    }

    function spawnPipe() {
        const gapHeight = height * PIPE_GAP_RATIO;
        const minPipeHeight = height * 0.1;
        const maxPipeHeight = height - gapHeight - minPipeHeight;
        const topHeight = Math.random() * (maxPipeHeight - minPipeHeight) + minPipeHeight;

        pipes.push({
            x: width,
            top: topHeight,
            bottom: height - (topHeight + gapHeight),
            width: width * PIPE_WIDTH_RATIO,
            passed: false
        });
    }

    function update() {
        if (gameState !== STATES.PLAYING) return;

        bird.velocity += GRAVITY;
        bird.y += bird.velocity;

        if (bird.y + bird.radius > height || bird.y - bird.radius < 0) {
            gameState = STATES.GAMEOVER;
            showGameOver();
        }

        if (frameCount % 200 === 0) {
            spawnPipe();
        }

        for (let i = pipes.length - 1; i >= 0; i--) {
            const p = pipes[i];
            p.x -= width * PIPE_SPEED_RATIO;

            if (
                bird.x + bird.radius > p.x &&
                bird.x - bird.radius < p.x + p.width &&
                (bird.y - bird.radius < p.top || bird.y + bird.radius > height - p.bottom)
            ) {
                gameState = STATES.GAMEOVER;
                showGameOver();
            }

            if (!p.passed && bird.x > p.x + p.width) {
                score++;
                p.passed = true;
                sounds.score();
            }

            if (p.x + p.width < 0) {
                pipes.splice(i, 1);
            }
        }

        frameCount++;
    }

    function draw() {
        ctx.fillStyle = '#121212';
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = '#333333';
        pipes.forEach(p => {
            ctx.fillRect(p.x, 0, p.width, p.top);
            ctx.fillRect(p.x, height - p.bottom, p.width, p.bottom);
        });

        if (gameState !== STATES.MENU) {
            ctx.fillStyle = '#BB86FC';
            ctx.beginPath();
            ctx.arc(bird.x, bird.y, bird.radius, 0, Math.PI * 2);
            ctx.fill();
        }

        if (gameState === STATES.PLAYING) {
            ctx.fillStyle = '#FFFFFF';
            ctx.font = `bold ${Math.floor(height * 0.05)}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText(score, width / 2, height * 0.1);
        }
    }

    function loop() {
        update();
        draw();
        requestAnimationFrame(loop);
    }

    window.addEventListener('resize', () => {
        const oldHeight = height;
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;

        bird.x = width * 0.2;
        bird.y = (bird.y / oldHeight) * height;
        bird.radius = Math.min(width, height) * BIRD_SIZE_RATIO;
        
        if (gameState === STATES.PLAYING) {
            pipes = [];
        }
    });

    window.addEventListener('keydown', (e) => {
        if (e.code === 'ArrowUp') {
            if (e.repeat) return;
            
            if (gameState === STATES.PLAYING) {
                bird.velocity = JUMP;
                sounds.jump();
            } else if (gameState === STATES.MENU || gameState === STATES.GAMEOVER) {
                startCountdown();
            }
        }
    });

    init();
    loop();
})();