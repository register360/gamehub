document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const scoreElement = document.getElementById('score');
    const levelElement = document.getElementById('level');
    const livesElement = document.getElementById('lives');
    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const muteBtn = document.getElementById('muteBtn');
    const backgroundMusic = document.getElementById('backgroundMusic');
    const crashSound = document.getElementById('crashSound');
    const controlsContainer = document.querySelector('.controls-container'); // NEW

    // Game variables
    let score = 0;
    let level = 1;
    let lives = 3;
    let gameSpeed = 3;
    let gameRunning = false;
    let gamePaused = false;
    let muted = false;
    let animationId = null;
    let gameOverDiv = null;

    // Collision effect variables
    let shakeIntensity = 0;
    let shakeDuration = 0;
    let lastShakeTime = 0;
    let collisionFlashFrames = 0;

    // Device detection and sizing (NEW)
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const baseWidth = isMobile ? window.innerWidth * 0.9 : 400;
    const baseHeight = isMobile ? window.innerHeight * 0.7 : 800;
    
    // Set canvas size based on device
    canvas.width = baseWidth;
    canvas.height = baseHeight;
    const laneWidth = canvas.width / 3;

    // Car variables (adjusted for responsive sizing)
    const carWidth = isMobile ? baseWidth * 0.1 : 40;
    const carHeight = isMobile ? baseWidth * 0.175 : 70;
    let carX = canvas.width / 2 - carWidth / 2;
    const carY = canvas.height - carHeight - 20;
    let carSpeed = isMobile ? 8 : 5; // Slightly faster on mobile

    // Road variables
    let roadY = 0;
    const roadWidth = canvas.width;
    const roadHeight = canvas.height * 2;

    // Obstacle variables (adjusted for responsive sizing)
    const obstacleMinWidth = isMobile ? baseWidth * 0.125 : 50;
    const obstacleMaxWidth = isMobile ? baseWidth * 0.375 : 150;
    const obstacleMinHeight = isMobile ? baseWidth * 0.15 : 60;
    const obstacleMaxHeight = isMobile ? baseWidth * 0.3 : 120;
    let obstacleFrequency = 120;
    let framesSinceLastObstacle = 0;

    // Car image (top-down view)
    const carImg = new Image();
    carImg.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0MCA3MCI+PHBhdGggZmlsbD0iIzM0OThkYiIgZD0iTTUgMTVoMzB2NDBINXoiLz48cGF0aCBmaWxsPSIjZTY3ZWEyIiBkPSJNMTAgMjBoMjB2MzBIMTB6Ii8+PGNpcmNsZSBjeD0iMTAiIGN5PSI1NSIgcj0iOCIgZmlsbD0iIzI2MjYyNiIvPjxjaXJjbGUgY3g9IjMwIiBjeT0iNTUiIHI9IjgiIGZpbGw9IiMyNjI2MjYiLz48Y2lyY2xlIGN4PSIxMCIgY3k9IjU1IiByPSI0IiBmaWxsPSIjYmRjM2Q3Ii8+PGNpcmNsZSBjeD0iMzAiIGN5PSI1NSIgcj0iNCIgZmlsbD0iI2JkYzNkNyIvPjxwYXRoIGZpbGw9IiNlNzRmOGMiIGQ9Ik0xNSAxMGwxMCAxMCAxMC0xMHoiLz48L3N2Zz4=';

    // Touch control variables (NEW)
    let touchStartX = 0;
    let touchEndX = 0;
    let touchStartY = 0;
    let touchEndY = 0;
    const minSwipeDistance = 50;

    // Event listeners
    startBtn.addEventListener('click', startGame);
    pauseBtn.addEventListener('click', togglePause);
    muteBtn.addEventListener('click', toggleMute);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    // Touch event listeners (NEW)
    if (isMobile) {
        document.addEventListener('touchstart', handleTouchStart, { passive: false });
        document.addEventListener('touchend', handleTouchEnd, { passive: false });
        document.addEventListener('touchmove', handleTouchMove, { passive: false });
        
        // Show touch controls
        document.querySelector('.touch-controls').style.display = 'flex';
    }

    // Keyboard state
    const keys = {
        ArrowLeft: false,
        ArrowRight: false,
        ArrowUp: false,
        ArrowDown: false
    };

    // NEW: Touch control handlers
    function handleTouchStart(e) {
        e.preventDefault();
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
    }

    function handleTouchEnd(e) {
        e.preventDefault();
        touchEndX = e.changedTouches[0].screenX;
        touchEndY = e.changedTouches[0].screenY;
        handleSwipe();
    }

    function handleTouchMove(e) {
        e.preventDefault();
        // For continuous movement while touching
        const touchX = e.touches[0].clientX;
        const touchY = e.touches[0].clientY;
        
        // Convert touch position to car movement
        const canvasRect = canvas.getBoundingClientRect();
        const touchPosX = touchX - canvasRect.left;
        
        // Keep car within bounds
        carX = Math.max(laneWidth / 2, 
                       Math.min(canvas.width - carWidth - laneWidth / 2, 
                                touchPosX - carWidth / 2));
    }

    function handleSwipe() {
        const dx = touchEndX - touchStartX;
        const dy = touchEndY - touchStartY;
        
        // Horizontal swipe takes priority
        if (Math.abs(dx) > Math.abs(dy)) {
            if (Math.abs(dx) > minSwipeDistance) {
                if (dx > 0) {
                    // Swipe right
                    carX = Math.min(canvas.width - carWidth - laneWidth / 2, carX + laneWidth);
                } else {
                    // Swipe left
                    carX = Math.max(laneWidth / 2, carX - laneWidth);
                }
            }
        } else {
            if (Math.abs(dy) > minSwipeDistance) {
                if (dy > 0) {
                    // Swipe down - slow down
                    gameSpeed = Math.max(2, gameSpeed - 1);
                } else {
                    // Swipe up - speed up
                    gameSpeed = Math.min(10, gameSpeed + 1);
                }
            }
        }
    }

    function handleKeyDown(e) {
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
            keys[e.key] = true;
            e.preventDefault();
        }
    }

    function handleKeyUp(e) {
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
            keys[e.key] = false;
            e.preventDefault();
        }
    }

    function resetGame() {
        score = 0;
        level = 1;
        lives = 3;
        gameSpeed = isMobile ? 8 : 5;
        obstacles = [];
        carX = canvas.width / 2 - carWidth / 2;
        roadY = 0;
        framesSinceLastObstacle = 0;
        obstacleFrequency = 120;
        shakeDuration = 0;
        collisionFlashFrames = 0;
    }

    function startGame() {
        if (gameOverDiv) {
            gameOverDiv.remove();
            gameOverDiv = null;
        }
        
        resetGame();
        updateUI();
        gameRunning = true;
        gamePaused = false;
        startBtn.textContent = 'Restart Game';
        
        if (!muted) {
            backgroundMusic.currentTime = 0;
            backgroundMusic.play().catch(e => console.log("Audio play failed:", e));
        }
        
        if (animationId) {
            cancelAnimationFrame(animationId);
        }
        
        gameLoop();
    }

    function togglePause() {
        if (!gameRunning) return;
        
        gamePaused = !gamePaused;
        pauseBtn.textContent = gamePaused ? 'Resume' : 'Pause';
        
        if (gamePaused) {
            backgroundMusic.pause();
        } else {
            if (!muted) backgroundMusic.play();
            gameLoop();
        }
    }

    function toggleMute() {
        muted = !muted;
        muteBtn.textContent = muted ? 'Unmute' : 'Mute';
        
        if (muted) {
            backgroundMusic.pause();
        } else if (gameRunning && !gamePaused) {
            backgroundMusic.play();
        }
    }

    function gameLoop() {
        if (gamePaused) return;
        
        update();
        draw();
        
        animationId = requestAnimationFrame(gameLoop);
    }

    function checkCollision(x1, y1, w1, h1, x2, y2, w2, h2) {
        const colliding = x1 < x2 + w2 &&
                         x1 + w1 > x2 &&
                         y1 < y2 + h2 &&
                         y1 + h1 > y2;
        
        if (colliding) {
            // Vibration effect
            if (navigator.vibrate) {
                navigator.vibrate([100, 50, 100]);
            }
            
            // Sound effect
            if (!muted) {
                crashSound.currentTime = 0;
                crashSound.play().catch(e => console.log("Sound play failed:", e));
            }
            
            // Visual effects
            triggerScreenShake();
            collisionFlashFrames = 5;
        }
        
        return colliding;
    }

    function triggerScreenShake() {
        shakeIntensity = isMobile ? 5 : 10; // Less intense on mobile
        shakeDuration = 20;
        lastShakeTime = 0;
    }

    function update() {
        // Move car (keyboard controls)
        if (!isMobile) {
            if (keys.ArrowLeft && carX > laneWidth / 2) {
                carX -= carSpeed;
            }
            if (keys.ArrowRight && carX < canvas.width - carWidth - laneWidth / 2) {
                carX += carSpeed;
            }
            if (keys.ArrowUp && gameSpeed < 10) {
                gameSpeed += 0.05;
            }
            if (keys.ArrowDown && gameSpeed > 2) {
                gameSpeed -= 0.05;
            }
        }

        // Move road
        roadY += gameSpeed;
        if (roadY >= canvas.height) {
            roadY = 0;
        }

        // Generate obstacles
        framesSinceLastObstacle++;
        if (framesSinceLastObstacle > obstacleFrequency) {
            createObstacle();
            framesSinceLastObstacle = 0;
        }

        // Update obstacles
        for (let i = obstacles.length - 1; i >= 0; i--) {
            obstacles[i].y += gameSpeed;
            
            if (checkCollision(carX, carY, carWidth, carHeight, 
                              obstacles[i].x, obstacles[i].y, 
                              obstacles[i].width, obstacles[i].height)) {
                lives = Math.max(0, lives - 1);
                updateUI();
                obstacles.splice(i, 1);
                
                if (lives <= 0) {
                    gameOver();
                    return;
                }
            }
            else if (obstacles[i].y > canvas.height) {
                score += 10;
                updateUI();
                obstacles.splice(i, 1);
            }
        }

        // Update effects
        if (shakeDuration > 0) {
            lastShakeTime++;
            if (lastShakeTime >= shakeDuration) {
                shakeDuration = 0;
            }
        }
        
        if (collisionFlashFrames > 0) {
            collisionFlashFrames--;
        }

        // Level up
        if (score >= level * 100) {
            level++;
            gameSpeed += 0.5;
            obstacleFrequency = Math.max(30, obstacleFrequency - 10);
            updateUI();
        }
    }

    function createObstacle() {
        const lane = Math.floor(Math.random() * 3);
        const width = Math.random() * (obstacleMaxWidth - obstacleMinWidth) + obstacleMinWidth;
        const height = Math.random() * (obstacleMaxHeight - obstacleMinHeight) + obstacleMinHeight;
        
        const obstacle = {
            x: lane * laneWidth + (laneWidth - width) / 2,
            y: -height,
            width: width,
            height: height,
            color: getRandomColor()
        };
        
        obstacles.push(obstacle);
    }

    function getRandomColor() {
        const colors = ['#e74c3c', '#f39c12', '#2ecc71', '#9b59b6', '#1abc9c'];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    function draw() {
        // Calculate shake offset
        let shakeOffsetX = 0;
        let shakeOffsetY = 0;
        
        if (shakeDuration > 0) {
            const progress = lastShakeTime / shakeDuration;
            const currentIntensity = shakeIntensity * (1 - progress);
            
            shakeOffsetX = (Math.random() * 2 - 1) * currentIntensity;
            shakeOffsetY = (Math.random() * 2 - 1) * currentIntensity;
        }
        
        // Set transform for shake effect
        ctx.setTransform(1, 0, 0, 1, shakeOffsetX, shakeOffsetY);
        
        // Clear canvas
        ctx.clearRect(-shakeOffsetX, -shakeOffsetY, canvas.width, canvas.height);
        
        // Draw road
        ctx.fillStyle = '#34495e';
        ctx.fillRect(-shakeOffsetX, -shakeOffsetY, canvas.width, canvas.height);
        
        // Draw road markings
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = isMobile ? 2 : 3;
        ctx.setLineDash([20, 20]);
        for (let y = -50 + (roadY % 40); y < canvas.height; y += 40) {
            ctx.beginPath();
            ctx.moveTo(canvas.width / 2, y);
            ctx.lineTo(canvas.width / 2, y + 20);
            ctx.stroke();
        }
        
        // Draw lanes
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.83)';
        ctx.lineWidth = isMobile ? 1 : 2;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(laneWidth, 0);
        ctx.lineTo(laneWidth, canvas.height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(laneWidth * 2, 0);
        ctx.lineTo(laneWidth * 2, canvas.height);
        ctx.stroke();
        
        // Draw obstacles
        for (const obstacle of obstacles) {
            ctx.fillStyle = obstacle.color;
            ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
            ctx.fillRect(obstacle.x + 5, obstacle.y + 5, obstacle.width - 10, obstacle.height - 10);
        }
        
        // Draw car with collision flash
        if (collisionFlashFrames > 0) {
            ctx.filter = 'brightness(1.8)';
        }
        ctx.drawImage(carImg, carX, carY, carWidth, carHeight);
        ctx.filter = 'none';
        
        // Draw speedometer
        ctx.fillStyle = '#fff';
        ctx.font = isMobile ? '12px Arial' : '14px Arial';
        ctx.fillText(`Speed: ${Math.round(gameSpeed * 10)} km/h`, 10 + shakeOffsetX, 20 + shakeOffsetY);
        
        // Reset transform
        ctx.setTransform(1, 0, 0, 1, 0, 0);
    }

    function updateUI() {
        scoreElement.textContent = score;
        levelElement.textContent = level;
        livesElement.textContent = lives;
    }

    function gameOver() {
        gameRunning = false;
        cancelAnimationFrame(animationId);
        backgroundMusic.pause();
        
        gameOverDiv = document.createElement('div');
        gameOverDiv.className = 'game-over';
        gameOverDiv.innerHTML = `
            <h2>Game Over</h2>
            <p>Your final score: <strong>${score}</strong></p>
            <p>Level reached: <strong>${level}</strong></p>
            <button id="playAgainBtn">Play Again</button>
        `;
        
        document.querySelector('.game-container').appendChild(gameOverDiv);
        document.getElementById('playAgainBtn').addEventListener('click', startGame);
    }

    // Handle window resize (NEW)
    function handleResize() {
        if (!isMobile) return;
        
        const newWidth = window.innerWidth * 0.9;
        const newHeight = window.innerHeight * 0.7;
        
        if (Math.abs(canvas.width - newWidth) > 10 || Math.abs(canvas.height - newHeight) > 10) {
            canvas.width = newWidth;
            canvas.height = newHeight;
            
            // Adjust car position after resize
            carX = Math.min(Math.max(laneWidth / 2, carX), canvas.width - carWidth - laneWidth / 2);
        }
    }

    window.addEventListener('resize', handleResize);
});
