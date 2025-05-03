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

    // Car variables
    const carWidth = 40;
    const carHeight = 70;
    let carX = canvas.width / 2 - carWidth / 2;
    const carY = canvas.height - carHeight - 20;
    let carSpeed = 5;

    // Road variables
    let roadY = 0;
    const roadWidth = canvas.width;
    const roadHeight = canvas.height * 2;
    const laneWidth = roadWidth / 3;

    // Obstacle variables
    let obstacles = [];
    const obstacleMinWidth = 50;
    const obstacleMaxWidth = 150;
    const obstacleMinHeight = 60;
    const obstacleMaxHeight = 120;
    let obstacleFrequency = 120; // frames between obstacles
    let framesSinceLastObstacle = 0;

    // Car image (top-down view)
    const carImg = new Image();
    carImg.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0MCA3MCI+PHBhdGggZmlsbD0iIzM0OThkYiIgZD0iTTUgMTVoMzB2NDBINXoiLz48cGF0aCBmaWxsPSIjZTY3ZWEyIiBkPSJNMTAgMjBoMjB2MzBIMTB6Ii8+PGNpcmNsZSBjeD0iMTAiIGN5PSI1NSIgcj0iOCIgZmlsbD0iIzI2MjYyNiIvPjxjaXJjbGUgY3g9IjMwIiBjeT0iNTUiIHI9IjgiIGZpbGw9IiMyNjI2MjYiLz48Y2lyY2xlIGN4PSIxMCIgY3k9IjU1IiByPSI0IiBmaWxsPSIjYmRjM2Q3Ii8+PGNpcmNsZSBjeD0iMzAiIGN5PSI1NSIgcj0iNCIgZmlsbD0iI2JkYzNkNyIvPjxwYXRoIGZpbGw9IiNlNzRmOGMiIGQ9Ik0xNSAxMGwxMCAxMCAxMC0xMHoiLz48L3N2Zz4=';

    // Event listeners
    startBtn.addEventListener('click', startGame);
    pauseBtn.addEventListener('click', togglePause);
    muteBtn.addEventListener('click', toggleMute);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    // Keyboard state
    const keys = {
        ArrowLeft: false,
        ArrowRight: false,
        ArrowUp: false,
        ArrowDown: false
    };

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
        gameSpeed = 3;
        obstacles = [];
        carX = canvas.width / 2 - carWidth / 2;
        roadY = 0;
        framesSinceLastObstacle = 0;
        obstacleFrequency = 120;
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
        
        // Start music if not muted
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

    function update() {
        // Move car
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
            
            // Check collision
            if (checkCollision(carX, carY, carWidth, carHeight, 
                              obstacles[i].x, obstacles[i].y, 
                              obstacles[i].width, obstacles[i].height)) {
                lives = Math.max(0, lives - 1); // Ensure lives never go below 0
                updateUI();
                obstacles.splice(i, 1);
                
                // Play crash sound
                if (!muted) {
                    crashSound.currentTime = 0;
                    crashSound.play();
                }
                
                if (lives <= 0) {
                    gameOver();
                    return;
                }
            }
            
            // Remove obstacles that are off screen
            else if (obstacles[i].y > canvas.height) {
                score += 10;
                updateUI();
                obstacles.splice(i, 1);
            }
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

    function checkCollision(x1, y1, w1, h1, x2, y2, w2, h2) {
        return x1 < x2 + w2 &&
               x1 + w1 > x2 &&
               y1 < y2 + h2 &&
               y1 + h1 > y2;
    }

    function draw() {
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw road
        ctx.fillStyle = '#34495e';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw road markings (moving)
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.setLineDash([20, 20]);
        
        for (let y = -50 + (roadY % 40); y < canvas.height; y += 40) {
            ctx.beginPath();
            ctx.moveTo(canvas.width / 2, y);
            ctx.lineTo(canvas.width / 2, y + 20);
            ctx.stroke();
        }
        
        // Draw lanes
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 2;
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
            
            // Add some details to obstacles
            ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
            ctx.fillRect(obstacle.x + 5, obstacle.y + 5, obstacle.width - 10, obstacle.height - 10);
        }
        
        // Draw car (top-down view)
        ctx.drawImage(carImg, carX, carY, carWidth, carHeight);
        
        // Draw speedometer
        ctx.fillStyle = '#fff';
        ctx.font = '14px Arial';
        ctx.fillText(`Speed: ${Math.round(gameSpeed * 10)} km/h`, 10, 20);
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
        
        // Create game over overlay
        gameOverDiv = document.createElement('div');
        gameOverDiv.className = 'game-over';
        gameOverDiv.innerHTML = `
            <h2>Game Over</h2>
            <p>Your final score: <strong>${score}</strong></p>
            <p>Level reached: <strong>${level}</strong></p>
            <button id="playAgainBtn">Play Again</button>
        `;
        
        document.querySelector('.game-container').appendChild(gameOverDiv);
        
        // Add event listener to play again button
        document.getElementById('playAgainBtn').addEventListener('click', startGame);
    }
});