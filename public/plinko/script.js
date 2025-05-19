// Import necessary modules from Matter.js
const { Engine, Render, World, Bodies, Body, Events, Composite } = Matter;

// DOM Elements
const gameContainer = document.getElementById('game-container');
const randomizeBtn = document.getElementById('randomizeBtn');
const announcementEl = document.getElementById('announcement');

// Calculate responsive dimensions
function getGameDimensions() {
  const maxWidth = window.innerWidth * 0.95;
  const maxHeight = window.innerHeight * 0.8;
  const aspectRatio = 4 / 3; // Standard game aspect ratio
  
  let gameWidth = maxWidth;
  let gameHeight = gameWidth / aspectRatio;
  
  if (gameHeight > maxHeight) {
    gameHeight = maxHeight;
    gameWidth = gameHeight * aspectRatio;
  }
  
  return { width: gameWidth, height: gameHeight };
}

// Initialize game with responsive dimensions
let { width, height } = getGameDimensions();

// Adjust height to account for aspect ratio
height = Math.min(height, width * 1.5); // Limit height to 1.5x width

// Set up the physics engine
const engine = Engine.create({
  gravity: { x: 0, y: 1, scale: 0.001 },
  enableSleeping: true
});

// Set up the renderer
const render = Render.create({
  element: gameContainer,
  engine: engine,
  options: {
    width: width,
    height: height,
    wireframes: false,
    background: 'hsl(225, 60%, 15%)',
    showAngleIndicator: false
  }
});

// Handle window resize
let resizeTimeout;
function handleResize() {
  // Debounce resize events
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    const newDimensions = getGameDimensions();
    width = newDimensions.width;
    height = Math.min(newDimensions.height, width * 1.5);
    
    // Update renderer dimensions
    render.options.width = width;
    render.options.height = height;
    render.canvas.width = width;
    render.canvas.height = height;
    
    // Update camera
    Render.lookAt(render, {
      min: { x: 0, y: 0 },
      max: { x: width, y: height }
    });
    
    // Reset the game with new dimensions
    initGame();
  }, 250);
}

// Add event listener for window resize
window.addEventListener('resize', handleResize);

// Game constants
// Calculate ball size based on screen size
const BALL_RADIUS = Math.max(8, Math.min(12, Math.min(window.innerWidth, window.innerHeight) * 0.015));
const BALL_DIAMETER = BALL_RADIUS * 2;

// Peg settings
const PEG_RADIUS = 4; // Fixed size for pegs
const MIN_PEG_SPACING = BALL_DIAMETER * 1.3 // Minimum space between pegs (110% of ball diameter)
const PEG_SPACING = Math.max(MIN_PEG_SPACING, PEG_RADIUS * 3); // Ensure minimum spacing

// Game layout
const BUCKET_HEIGHT = 20; // Height of the bucket area
const WALL_THICKNESS = 10; // Thickness of the walls
const PEG_ROW_SPACING = 2.5; // Vertical spacing between rows as a multiple of peg radius

// Sound handling
let audioContext = null;

// Create a simple click sound
function playClinkSound() {
  try {
    // Create audio context if it doesn't exist
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    // Create oscillator for a click sound
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    // Configure oscillator
    oscillator.type = 'sine';
    oscillator.frequency.value = 800; // High frequency for a click
    
    // Configure gain
    gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.03);
    
    // Connect nodes
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Start and stop the oscillator
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.03); // Very short sound (30ms)
    
    // Clean up
    oscillator.onended = () => {
      oscillator.disconnect();
      gainNode.disconnect();
    };
    
  } catch (error) {
    console.error('Error playing sound:', error);
  }
}

// Initialize audio on first user interaction
window.addEventListener('click', function initAudio() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  window.removeEventListener('click', initAudio);
}, { once: true });

// Initialize game elements (to be populated later)
let walls = [];
let pegs = [];
let buckets = [];

// Game state (will be initialized in initGame)
let gameState = null;

// Utility function returning a random integer between two values
const randomBetween = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;



// Handle when the ball lands in a bucket
function handleBucketCollision(ball, bucket) {
  if (!ball || !bucket) return;
  
  // Get the game name from the bucket's index
  const bucketIndex = bucket.bucketIndex;
  const gameName = gameState.selectedGames[bucketIndex] || 'No Game Selected';
  
  // Show announcement
  showAnnouncement(`Selected: ${gameName}`);
  
  // Reset the ball after a delay
  setTimeout(() => {
    resetBall();
  }, 2000);
}

// Initialize the game
async function initGame() {
  // Clear any existing game elements
  World.clear(engine.world, false);
  
  // Reset arrays
  pegs = [];
  buckets = [];
  walls = [];
  
  // Create boundaries
  createBoundaries();
  
  // Create pegs
  createPegs();
  
  // Create buckets
  createBuckets();
  
  // Initialize game state with default values
  gameState = {
    isBallDropped: false,
    gameNames: [
      'Pac-Man', 'Tetris', 'Super Mario Bros', 'The Legend of Zelda', 'Minecraft',
      'Fortnite', 'Among Us', 'Apex Legends', 'Valorant', 'League of Legends',
      'Dota 2', 'Counter-Strike', 'Overwatch', 'Rocket League', 'Fall Guys'
    ],
    selectedGames: [],
    currentBall: null,
    announcement: null,
    randomizeBtn: document.getElementById('randomizeBtn')
  };
  
  try {
    // Try to load games from gamelist.txt
    const response = await fetch('/gamelist.txt');
    if (response.ok) {
      const text = await response.text();
      const games = text.split(/[\r\n]+/)
        .map(line => line.trim())
        .filter(line => line.length > 0);
      
      if (games.length > 0) {
        gameState.gameNames = games;
      }
    }
  } catch (error) {
    console.error('Error loading game list, using default games:', error);
  }
  
  // Initialize with random games
  randomizeGames();
  
  // Start the engine and renderer if not already running
  if (!engine.enabled) {
    Engine.run(engine);
  }
  if (!render.enabled) {
    Render.run(render);
  }
  
  // Add event listeners
  setupEventListeners();
}

// Create game boundaries
function createBoundaries() {
  const boundaryOptions = {
    isStatic: true,
    render: {
      fillStyle: 'rgba(15, 15, 26, 0.8)',
      strokeStyle: '#e94560',
      lineWidth: 2
    },
    label: 'boundary',
    collisionFilter: {
      category: 0x0001
    }
  };
  
  // Clear existing walls
  walls.forEach(wall => World.remove(engine.world, wall));
  walls = [];
  
  // Left wall
  walls.push(Bodies.rectangle(0, height / 2, WALL_THICKNESS, height, boundaryOptions));
  
  // Right wall
  walls.push(Bodies.rectangle(width, height / 2, WALL_THICKNESS, height, boundaryOptions));
  
  // Top wall (invisible, just to keep balls from going off the top)
  walls.push(Bodies.rectangle(width / 2, -WALL_THICKNESS / 2, width, WALL_THICKNESS, {
    ...boundaryOptions,
    render: {
      ...boundaryOptions.render,
      fillStyle: 'transparent',
      strokeStyle: 'transparent'
    }
  }));
  
  // Add all walls to the world
  World.add(engine.world, walls);
}

// Create pegs in a grid pattern with hexagonal packing
function createPegs() {
  const pegDiameter = PEG_RADIUS * 2;
  
  // Calculate spacing based on ball size
  const horizontalSpacing = MIN_PEG_SPACING + (PEG_RADIUS * 2); // Center-to-center distance
  const verticalSpacing = horizontalSpacing * Math.sin(Math.PI / 3); // For hexagonal packing
  
  // Calculate how many pegs can fit with proper spacing
  const pegsPerRow = Math.max(5, Math.floor((width - pegDiameter) / horizontalSpacing));
  const rowCount = Math.max(8, Math.floor((height - BUCKET_HEIGHT - pegDiameter * 2) / (verticalSpacing * 0.8)));
  
  // Clear existing pegs
  pegs.forEach(peg => World.remove(engine.world, peg));
  pegs = [];
  
  // Calculate starting position to center the pegs
  const startX = (width - ((pegsPerRow - 1) * horizontalSpacing)) / 2;
  const startY = BALL_DIAMETER * 2; // Start below the drop zone
  
  for (let row = 0; row < rowCount; row++) {
    const isOffset = row % 2 === 0; // Offset every other row
    const rowPegs = isOffset ? pegsPerRow : pegsPerRow - 1;
    const y = startY + row * verticalSpacing * 0.8; // Slightly tighter vertical spacing
    
    for (let col = 0; col < rowPegs; col++) {
      const x = startX + (isOffset ? 0 : horizontalSpacing / 2) + col * horizontalSpacing;
      
      // Skip pegs too close to the walls
      if (x < pegDiameter || x > width - pegDiameter) continue;
      
      const peg = Bodies.circle(x, y, PEG_RADIUS, {
        isStatic: true,
        restitution: 0.7,
        friction: 0.05,
        render: {
          fillStyle: 'rgba(233, 69, 96, 0.8)',
          strokeStyle: '#fff',
          lineWidth: 1
        },
        label: 'peg',
        collisionFilter: {
          category: 0x0002
        }
      });
      
      // Add collision sound
      peg.onCollide = () => playClinkSound();
      
      pegs.push(peg);
    }
  }
  
  // Add pegs to the world
  World.add(engine.world, pegs);
}

// Create buckets at the bottom
function createBuckets() {
  if (!gameState || !gameState.selectedGames || gameState.selectedGames.length === 0) return;
  
  const bucketCount = gameState.selectedGames.length;
  const bucketWidth = width / bucketCount;
  
  // Clear existing buckets and walls
  buckets.forEach(bucket => World.remove(engine.world, bucket));
  buckets = [];
  
  // Create vertical dividers between buckets
  for (let i = 1; i < bucketCount; i++) {
    const x = i * bucketWidth;
    const divider = Bodies.rectangle(x, height - BUCKET_HEIGHT / 2, 2, BUCKET_HEIGHT, {
      isStatic: true,
      render: {
        fillStyle: 'rgba(255, 255, 255, 0.2)',
        strokeStyle: 'transparent'
      },
      label: 'divider'
    });
    buckets.push(divider);
  }
  
  // Create the main bucket sensors
  for (let i = 0; i < bucketCount; i++) {
    const x = i * bucketWidth + bucketWidth / 2;
    const bucket = Bodies.rectangle(x, height - BUCKET_HEIGHT / 2, bucketWidth, BUCKET_HEIGHT, {
      isStatic: true,
      isSensor: true,
      render: {
        fillStyle: `hsla(${i * (360 / bucketCount)}, 70%, 50%, 0.1)`,
        strokeStyle: 'transparent'
      },
      label: 'bucket',
      bucketIndex: i,
      collisionFilter: {
        group: -1
      }
    });
    
    buckets.push(bucket);
  }
  
  // Add floor
  const floor = Bodies.rectangle(width / 2, height, width, 10, {
    isStatic: true,
    render: {
      fillStyle: '#e94560',
      strokeStyle: 'transparent'
    },
    label: 'floor'
  });
  buckets.push(floor);
  
  World.add(engine.world, buckets);
  updateGameLabels();
}

// Handle collision events
function handleCollision(event) {
  const pairs = event.pairs;
  
  for (let i = 0; i < pairs.length; i++) {
    const pair = pairs[i];
    
    // Check if the collision involves a ball
    if (pair.bodyA.label === 'ball' || pair.bodyB.label === 'ball') {
      const ball = pair.bodyA.label === 'ball' ? pair.bodyA : pair.bodyB;
      const other = pair.bodyA === ball ? pair.bodyB : pair.bodyA;
      
      // Check if ball hit a peg
      if (other.label === 'peg') {
        // Play clink sound with a small delay to prevent audio stacking
        playClinkSound();
      }
      
      // Check if ball hit a bucket
      if (other.label === 'bucket') {
        handleBucketCollision(ball, other);
      }
      
      // Check if ball hit a boundary
      if (other.label === 'boundary' || other.label === 'bottomBoundary') {
        // Remove the ball from the world after a short delay
        setTimeout(() => {
          World.remove(engine.world, ball);
        }, 1000);
      }
    }
  }
}

// Set up collision event listener
Events.on(engine, 'collisionStart', handleCollision);

// Drop a ball from the top at the specified x position
function dropBall(x) {
  if (gameState.isBallDropped) return;
  
  gameState.isBallDropped = true;
  if (randomizeBtn) randomizeBtn.disabled = true;
  
  // Create a new ball
  gameState.currentBall = Bodies.circle(x, 50, BALL_RADIUS, {
    restitution: 0.7,
    friction: 0.005,
    frictionAir: 0.02,
    density: 0.01,
    render: {
      fillStyle: `hsl(${randomBetween(0, 360)}, 90%, 60%)`,
    },
    label: 'ball',
    collisionFilter: {
      category: 0x0004,
      mask: 0xFFFFFFFF
    }
  });
  
  World.add(engine.world, gameState.currentBall);
  
  // Check when the ball comes to rest
  Events.on(engine, 'afterUpdate', checkBallPosition);
}

// Check the ball's position and handle when it comes to rest
function checkBallPosition() {
  if (!gameState.currentBall) return;
  
  const ball = gameState.currentBall;
  
  // If ball is below the screen, remove it
  if (ball.position.y > height + 100) {
    resetBall();
    return;
  }
  
  // Check if ball has come to rest
  if (ball.speed < 0.1 && ball.position.y > height - MARGIN_BOTTOM) {
    // Determine which bucket the ball is in
    if (gameState.selectedGames && gameState.selectedGames.length > 0) {
      const bucketWidth = width / gameState.selectedGames.length;
      const bucketIndex = Math.min(
        gameState.selectedGames.length - 1, 
        Math.max(0, Math.floor(ball.position.x / bucketWidth))
      );
      const selectedGame = gameState.selectedGames[bucketIndex];
      showAnnouncement(selectedGame);
    }
    
    // Reset after a delay
    setTimeout(() => {
      resetBall();
    }, 2000);
  }
}

// Reset the ball and game state
function resetBall() {
  if (gameState.currentBall) {
    World.remove(engine.world, gameState.currentBall);
    gameState.currentBall = null;
  }
  
  Events.off(engine, 'afterUpdate', checkBallPosition);
  gameState.isBallDropped = false;
  if (randomizeBtn) randomizeBtn.disabled = false;
}

// Show an announcement message
function showAnnouncement(message) {
  if (!announcementEl) return;
  
  announcementEl.textContent = message;
  announcementEl.classList.remove('hidden');
  announcementEl.classList.add('visible');
  
  // Hide after delay
  setTimeout(() => {
    announcementEl.classList.remove('visible');
    setTimeout(() => {
      announcementEl.classList.add('hidden');
    }, 500);
  }, 2000);
}

// Load game names from the server
async function loadGameNames() {
  try {
    const response = await fetch('gamelist.txt');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const text = await response.text();
    
    // Split by newlines and filter out empty lines
    let games = text.split(/[\r\n]+/)
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    if (games.length === 0) throw new Error('Empty game list');
    
    // If we don't have enough games, duplicate some
  const targetCount = 8; // Target number of buckets
  if (games.length < targetCount) {
    const needed = Math.ceil(targetCount / games.length);
    games = Array(needed).fill(games).flat().slice(0, targetCount);
  }
  
  // Make sure we have exactly targetCount games
  return games.slice(0, targetCount);
  } catch (error) {
    console.error('Error loading game list:', error);
    // Fallback games
    return [
      'Pac-Man', 'Tetris', 'Super Mario Bros', 'The Legend of Zelda', 'Minecraft',
      'Fortnite', 'Among Us', 'Apex Legends', 'Valorant', 'League of Legends',
      'Dota 2', 'Counter-Strike', 'Overwatch', 'Rocket League', 'Fall Guys'
    ].slice(0, 8); // Default to 8 games
  }
}

// Randomize the games shown at the bottom
function randomizeGames() {
  if (!gameState.gameNames || gameState.gameNames.length === 0) {
    loadGameNames().then(randomizeGames);
    return;
  }
    // Take a random selection of games (between 6-10)
    const shuffled = [...gameState.gameNames].sort(() => Math.random() - 0.5);
    const targetCount = 6 + Math.floor(Math.random() * 5); // Random between 6-10
    gameState.selectedGames = shuffled.slice(0, targetCount);
  
  // Update the game labels
  updateGameLabels();
}

// Update the game name labels at the bottom
function updateGameLabels() {
  if (!gameState || !gameState.selectedGames || gameState.selectedGames.length === 0) return;
  
  const gameNamesContainer = document.getElementById('game-names');
  if (!gameNamesContainer) return;
  
  // Clear existing labels
  gameNamesContainer.innerHTML = '';
  
  // Create new labels with vertical text
  gameState.selectedGames.forEach((gameName, index) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'game-name-wrapper';
    
    const gameElement = document.createElement('div');
    gameElement.className = 'game-name';
    gameElement.textContent = gameName;
    gameElement.title = gameName; // Show full name on hover
    
    wrapper.appendChild(gameElement);
    gameNamesContainer.appendChild(wrapper);
  });
}

// Set up event listeners
function setupEventListeners() {
  // Handle window resize
  window.addEventListener('resize', handleResize);
  
  // Handle canvas click to drop ball
  render.canvas.addEventListener('click', (e) => {
    if (gameState.isBallDropped) return;
    
    const rect = render.canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (width / rect.width);
    dropBall(x);
  });
  
  // Handle randomize button click
  if (randomizeBtn) {
    randomizeBtn.addEventListener('click', () => {
      if (!gameState.isBallDropped) {
        randomizeGames();
      }
    });
  }
  
  // Add keyboard shortcut (space) to drop a ball in the middle
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !gameState.isBallDropped) {
      e.preventDefault();
      dropBall(width / 2);
    }
  });
}

// Initialize the game when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', async () => {
  // Initialize game
  await initGame();
});