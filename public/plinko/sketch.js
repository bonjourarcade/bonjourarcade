var Engine = Matter.Engine,
    World = Matter.World,
    Bodies = Matter.Bodies;

var engine;
var world;
var particles = [];
var pegs = [];
var boundaries = [];
var particleFrequency = 60;
var columns = 11; // This will be calculated dynamically now
var rows = 20; // This will be calculated dynamically now
let font,
    fontSize = 40;
var totalScoreId = "score";
var gameList = [];
var selectedGames = [];
let tickSound; // Variable to hold the sound object
let audioContext = null; // Declare audio context
let previewParticle = null; // Variable to hold the particle being previewed
let particleDropped = false; // Flag to track if a particle has been dropped
let randomizeButton; // Variable to hold the randomize button element
let shouldScroll = false; // Flag to control scrolling
let currentSeed = null; // Variable to hold the current seed
let seededRandom = null; // Variable to hold the seeded random number generator
let countdownTimer = null; // Variable to hold the countdown timer
let countdownSeconds = 2; // Countdown duration in seconds
let countdownActive = false; // Flag to track if countdown is active

// --- Redirect seed=now or seed=next to seed=YYYYWW (current or next week) ---
(function() {
    const urlParams = new URLSearchParams(window.location.search);
    let redirectSeed = null;
    if (urlParams.get('seed') === 'now' || urlParams.get('seed') === 'next') {
        const now = new Date();
        // Get ISO week number
        function getISOWeek(date) {
            const target = new Date(date.valueOf());
            const dayNr = (date.getDay() + 6) % 7;
            target.setDate(target.getDate() - dayNr + 3);
            const firstThursday = target.valueOf();
            target.setMonth(0, 1);
            if (target.getDay() !== 4) {
                target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
            }
            const weekNumber = 1 + Math.ceil((firstThursday - target) / 604800000);
            return weekNumber;
        }
        let year, week;
        if (urlParams.get('seed') === 'now') {
            year = now.getFullYear();
            week = getISOWeek(now);
        } else if (urlParams.get('seed') === 'next') {
            // Add 7 days to get next week
            const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
            year = nextWeek.getFullYear();
            week = getISOWeek(nextWeek);
        }
        const weekStr = week.toString().padStart(2, '0');
        urlParams.set('seed', `${year}${weekStr}`);
        // Build new URL
        const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
        window.location.replace(newUrl);
    }
})();

// --- Global seedInURL flag ---
const urlParams = new URLSearchParams(window.location.search);
let seedInURL = !!urlParams.get('seed');

// Add these constants at the top (after Matter.js vars, before functions)
const FIXED_WIDTH = 768;
const FIXED_HEIGHT = 1610;

/**
 * Preloads the font and game list before drawing canvas.
 * 
 * Zach Robinson and Gemini.
 */
function preload() {
    font = loadFont('assets/OpenSans-Bold.ttf');
    loadStrings('gamelist.txt', loadGameList);
    // Load the tick sound - replace 'assets/tick.mp3' with the actual path to your sound file
    // tickSound = loadSound('assets/tick.mp3'); 
}

function loadGameList(data) {
  console.log('Data received by loadGameList:', data);
  if (!data || typeof data.filter !== 'function') {
      console.error('loadGameList did not receive an array of strings:', data);
      gameList = [];
      document.getElementById(totalScoreId).innerHTML = "Error loading game list.";
      return;
  }
  gameList = data.map(line => {
    const commentIndex = line.indexOf('#');
    if (commentIndex !== -1) {
      return line.substring(0, commentIndex).trim();
    } else {
      return line.trim();
    }
  }).filter(line => line !== '');
  // Removed: Shuffle the game list initially
}

/**
 * Simple seeded random number generator (Linear Congruential Generator).
 * 
 * @param {string} seed The seed string.
 * @returns {function} A seeded random function.
 */
function createSeededRandom(seed) {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        const char = seed.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    
    let state = Math.abs(hash);
    
    return function() {
        state = (state * 9301 + 49297) % 233280;
        return state / 233280;
    };
}

/**
 * Gets the seed from URL parameters or generates a default one.
 * 
 * @returns {string} The seed string.
 */
function getSeedFromURL() {
    let seed = urlParams.get('seed');
    
    if (!seed) {
        // Generate seed based on current year and week
        const now = new Date();
        const year = now.getFullYear();
        const week = getISOWeek(now);
        seed = `${year}${week.toString().padStart(2, '0')}`;
    }
    
    return seed;
}

/**
 * Helper function to get ISO week number.
 * 
 * @param {Date} date The date to get the week number for.
 * @returns {number} The ISO week number.
 */
function getISOWeek(date) {
    const d = new Date(date.getTime());
    d.setHours(0, 0, 0, 0);
    // Thursday in current week decides the year.
    d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
    // January 4 is always in week 1.
    const week1 = new Date(d.getFullYear(), 0, 4);
    // Adjust to Thursday in week 1 and count number of weeks from date to week1.
    return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}

/**
 * Shuffles an array in place (Fisher-Yates Algorithm).
 * 
 * Gemini.
 * 
 * @param {Array} array The array to shuffle.
 * @param {function} randomFn Optional seeded random function.
 */
function shuffleArray(array, randomFn = Math.random) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(randomFn() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]]; // Swap elements
    }
}

/**
 * Sets up the engine, world, gravity, and font properties. Initializes canvas to beginning state.
 * Adds collision event listener.
 * Gets button references.
 * 
 * Zach Robinson and Gemini.
 */
function setup() {
    pixelDensity(1);
    engine = Engine.create();
    world = engine.world;
    world.gravity.y = 1;

    textFont(font);
    textSize(fontSize);
    textAlign(CENTER, CENTER);
    colorMode(HSB, 360, 100, 100); // Keep HSB color mode
    
    // Initialize seed and seeded random
    currentSeed = getSeedFromURL();
    seededRandom = createSeededRandom(currentSeed);
    
    // Display the seed information
    displaySeedInfo();
    
    initializeCanvas();

    // Add collision event listener
    Matter.Events.on(engine, 'collisionStart', handleCollision);

    // Smooth scroll to the top on load
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Get button references
    randomizeButton = document.getElementById('randomize-button');
    if (seedInURL && randomizeButton) {
        randomizeButton.style.display = 'none';
    }
    // Start countdown if seed is provided in URL
    if (seedInURL) {
        startCountdown();
    }
    // Set the game names as soon as the page loads
    randomizeBoard();
}

/**
 * Displays seed information on the page.
 */
function displaySeedInfo() {
    const urlParams = new URLSearchParams(window.location.search);
    let seed = urlParams.get('seed');
    let seedInfo = document.getElementById('seed-info');
    if (seed) {
        if (!seedInfo) {
            seedInfo = document.createElement('div');
            seedInfo.id = 'seed-info';
            seedInfo.style.cssText = `
                position: fixed;
                top: 10px;
                left: 10px;
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 8px 12px;
                border-radius: 5px;
                font-family: sans-serif;
                font-size: 14px;
                font-weight: bold;
                z-index: 1000;
            `;
            document.body.appendChild(seedInfo);
        }
        seedInfo.textContent = seed;
    } else if (seedInfo) {
        seedInfo.remove();
    }
}

// --- Countdown: 3-2-1-PLINKO! ---
function startCountdown() {
    if (countdownActive) return; // Prevent multiple countdowns
    countdownActive = true;
    let countdownValues = ['3', '2', '1', 'PLINKO!'];
    let index = 0;
    let countdownDisplay = document.getElementById('countdown-display');
    if (!countdownDisplay) {
        countdownDisplay = document.createElement('div');
        countdownDisplay.id = 'countdown-display';
        countdownDisplay.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 20px;
            border-radius: 10px;
            font-family: sans-serif;
            font-size: 48px;
            font-weight: bold;
            z-index: 2000;
            text-align: center;
        `;
        document.body.appendChild(countdownDisplay);
    }
    function updateCountdown() {
        if (index < countdownValues.length) {
            countdownDisplay.textContent = countdownValues[index];
            index++;
            countdownTimer = setTimeout(updateCountdown, 800);
        } else {
            // Shuffle and set selectedGames right before dropping the ball
            // randomizeBoard(); // This line is removed
            setTimeout(() => {
                countdownDisplay.remove();
                dropBallFromSeed();
            }, 500);
        }
    }
    updateCountdown();
}

// --- Drop ball from seed-based location ---
// --- Always shuffle selectedGames with seededRandom, but do not mutate gameList in place ---
function randomizeBoard() {
    if (!seededRandom) {
        throw new Error('seededRandom is not set! Game order will not be deterministic. Make sure seededRandom is initialized before calling randomizeBoard().');
    }
    selectedGames = [];
    const randomFn = seededRandom;
    let gameListCopy = gameList.slice(); // Make a copy so original order is preserved
    if (gameListCopy.length > 0 && gameListCopy.length >= columns) {
        shuffleArray(gameListCopy, randomFn);
        selectedGames = gameListCopy.slice(0, columns);
    } else if (gameListCopy.length > 0 && gameListCopy.length < columns) {
        shuffleArray(gameListCopy, randomFn);
        selectedGames = gameListCopy.slice();
        while (selectedGames.length < columns) {
            selectedGames.push('-- No Game --');
        }
    } else {
        selectedGames = [];
        while (selectedGames.length < columns) {
            selectedGames.push('-- Loading Error --');
        }
    }
    redraw();
}

// --- Pass seededRandom to Particle for seed-based color ---
function dropBallFromSeed() {
    if (particleDropped) return;
    let xFrac = seededRandom ? seededRandom() : 0.5;
    let minFrac = 0.1, maxFrac = 0.9;
    let x = FIXED_WIDTH * (minFrac + (maxFrac - minFrac) * xFrac);
    const particleRadius = 18;
    previewParticle = new Particle(x, 12, particleRadius, seededRandom);
    dropParticle(x, seededRandom);
}

/**
 * Creates a simple click sound using the Web Audio API.
 * 
 * User provided and Gemini integrated.
 */
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

/**
 * Handles collision events.
 * 
 * Gemini.
 */
function handleCollision(event) {
    var pairs = event.pairs;

    for (var i = 0; i < pairs.length; i++) {
        var pair = pairs[i];
        var bodyA = pair.bodyA;
        var bodyB = pair.bodyB;

        // Find the particle involved in the collision
        let particle = null;
        let otherBody = null;

        // Check if bodyA is a particle
        for (let p of particles) {
            if (p.body === bodyA) {
                particle = p;
                otherBody = bodyB;
                break;
            }
        }

        // If bodyA wasn't a particle, check if bodyB is
        if (!particle) {
            for (let p of particles) {
                if (p.body === bodyB) {
                    particle = p;
                    otherBody = bodyA;
                    break;
                }
            }
        }

        // If we found a particle collision
        if (particle) {
            // Play the tick sound
            playClinkSound();
            
            // Check if the other body is a peg
            for (let peg of pegs) {
                if (peg.body === otherBody) {
                    peg.setColor(particle);
                    break;
                }
            }

            // Check if the other body is a boundary
            for (let boundary of boundaries) {
                if (boundary.body === otherBody) {
                    boundary.setColor(particle);
                    break;
                }
            }
        }
    }
}

/**
 * Draws the canvas, calculates the spacing to be used when populating the initial static objects.
 * Sets canvas size based on window size and adjusts complexity for mobile.
 * 
 * Zach Robinson and Gemini.
 */
function initializeCanvas() {
    console.log('initializeCanvas called.');
    // Always use fixed size for all devices
    var newWidth = FIXED_WIDTH;
    var newHeight = FIXED_HEIGHT;
    // PC layout: board height and width are fixed
    const originalWellWidth = 600 / 11;
    columns = Math.floor(newWidth / originalWellWidth);
    if (columns < 11) {
        columns = 11;
    }
    var spacing = newWidth / columns;
    rows = Math.floor((newHeight - spacing) / spacing);
    if (rows < 20) {
        rows = 20;
    }
    console.log(`Fixed layout - Board size: ${newWidth}x${newHeight}, columns: ${columns}, rows: ${rows}`);

    var canvas = createCanvas(newWidth, newHeight);
    canvas.parent('game-container');
    pegs = [];
    boundaries = [];
    populatePegs(spacing);
    populateCanvasBoundaries();
    populatePointZones(spacing);
}

/**
 * Populates the pegs using a nested for loop. Some manipulation for the spacing
 * of individual rows. Pushes all pegs to the object array designed to hold them.
 * Uses the dynamically calculated number of columns and rows.
 * 
 * Zach Robinson and Gemini.
 */
function populatePegs(spacing) {
    // Always use desktop peg radius and row logic
    let pegRadius = 4;
    let rowsToDraw = rows > 3 ? rows - 3 : 0;
    for (var row = 0; row < rowsToDraw; row++){
        for (var col = 0; col < columns; col++){
            var x = col * spacing + spacing/4;
            if (row % 2 == 1)
                x += spacing/2;
            var y = spacing + row * spacing;
            var p = new Peg(x, y, pegRadius);
            pegs.push(p);
        }
    }
}

/**
 * Populates the point zones using a for loop. Pushes all boundary objects
 * to the object array designed to hold them.
 * Uses the dynamically calculated number of columns.
 * 
 * Zach Robinson and Gemini.
 */
function populatePointZones(spacing) {
    for (var i = 0; i < columns; i++){
        var h = 100; 
        var w = 5;
        var x = i * spacing; // Align boundaries to the left of the well
        var y = FIXED_HEIGHT - h / 2;
        var wall = new Boundary(x, y, w, h);
        boundaries.push(wall);
    }
     // Add the rightmost boundary wall
     var h = 100; 
     var w = 5;
     var x = columns * spacing; // Position at the right edge of the last well
     var y = FIXED_HEIGHT - h / 2;
     var wall = new Boundary(x, y, w, h);
     boundaries.push(wall);
}

/**
 * Populates the canvas boundaries for the canvas. These will prevent the particles
 * from falling off the edges or out from the bottom. Pushes all boundary objects
 * to the array designed to hold them.
 * 
 * Zach Robinson and Thomas Schwartz.
 */
function populateCanvasBoundaries() {
    var bottomHeight = 100;
    var bottomXCoord = FIXED_WIDTH / 2;
    var bottomYCoord = FIXED_HEIGHT + bottomHeight / 2;

    var sideWidth = 50;
    var leftXCoord = -1 * sideWidth / 2;
    var rightXCoord = FIXED_WIDTH + sideWidth / 2;
    var sideYCoord = FIXED_HEIGHT / 2;

    var left = new Boundary(leftXCoord, sideYCoord, sideWidth, FIXED_HEIGHT);
    var right = new Boundary(rightXCoord, sideYCoord, sideWidth, FIXED_HEIGHT);
    var bottom = new Boundary(bottomXCoord, bottomYCoord, FIXED_WIDTH, bottomHeight);

    boundaries.push(bottom, left, right);
}

/**
 * Creates a new particle with default settings and pushes it
 * to the object array designed to hold it.
 * 
 * Zach Robinson.
 * 
 * @param {number} x The x coordinate for where the object should be created.
 */
function createNewParticle(x) {
    // Always use desktop particle radius
    let particleRadius = 18;
    var p = new Particle(x, 12, particleRadius);
    particles.push(p);
    return p;
}

/**
 * Removes a single particle at a particular count.
 * Used in case a particle falls through the canvas boundaries.
 * 
 * Zach Robinson.
 */
function removeParticle(counter) {
    World.remove(world, particles[counter].body);
    particles.splice(counter, 1);
}

/**
 * Draws and displays all particles in the object array. Includes a 
 * validation check for if particle is off screen.
 * 
 * Zach Robinson.
 */
function drawParticles() {
    for(var i = 0; i < particles.length; i++) {
        particles[i].show();
        if (particles[i].isOffScreen())
            removeParticle(i--);
    }
}

/**
 * Draws all pegs in the object array.
 * 
 * Zach Robinson.
 */
function drawPegs() {
    for(var i = 0; i < pegs.length; i++) {
        pegs[i].show();
    }
}

/**
 * Draws all boundary objects in the object array.
 * 
 * Zach Robinson.
 */
function drawBoundaries() {
    for(var i = 0; i < boundaries.length; i++) {
        boundaries[i].show();
    }
}

/**
 * Draws the labels for any particular point zone on the canvas.
 * Uses the loaded game list to display random game titles vertically.
 * Sets text size based on device type.
 * 
 * Zach Robinson and Gemini.
 */
function drawPointLabels() {
    var yCoord = FIXED_HEIGHT - 10;
    var zoneWidth = FIXED_WIDTH/columns;
    var offset = zoneWidth / 2;
    if (selectedGames.length === 0 && gameList.length >= columns) {
        selectedGames = gameList.slice(0, columns);
    } else if (selectedGames.length === 0 && gameList.length < columns) {
         selectedGames = gameList.slice();
         while (selectedGames.length < columns) {
             selectedGames.push('-- No Game --');
         }
    }
    let startColor = color(0, 100, 100);
    let endColor = color(300, 100, 100);
    for(var i = 0; i < columns; i++){
        var xCoord = zoneWidth * i + offset;
        let inter = map(i, 0, columns - 1, 0, 1);
        let interpolatedColor = lerpColor(startColor, endColor, inter);
        let h = hue(interpolatedColor);
        let s = saturation(interpolatedColor) * 0.5;
        let b = brightness(interpolatedColor) * 1.2;
        s = constrain(s, 0, 100);
        b = constrain(b, 0, 100);
        let textColor = color(h, s, b);
        push();
        translate(xCoord, yCoord);
        rotate(PI / 2);
        textAlign(RIGHT, CENTER);
        fill(textColor);
        stroke(0);
        strokeWeight(2);
        // Always use desktop text size
        textSize(20);
        text(selectedGames[i], 0, 0);
        pop();
    }
}

/**
 * Assigns a point value to the pointValue property of all particle
 * objects in the particles array if it has fallen past the stated threshold.
 * Calculates and displays the sum after assigning values.
 * 
 * Zach Robinson and Gemini.
 */
function assignPointValuesAndDisplay() {
    var threshold = FIXED_HEIGHT - 150;   // Adjusted vertical threshold based on new height
    var sum = 0;
    var zoneWidth = FIXED_WIDTH/columns;
    
    particles.forEach(setParticlePointValue)
    displaySum();

    /**
     * Sets the point value of a given Particle object to 
     * a particular value.
     * 
     * Zach Robinson.
     * 
     * @param {Object} particle - The particle whose pointValue property will be mutated.
     * @param {number} particle.pointValue - The point value that this particle has earned.
     */
    function setParticlePointValue(particle){
        var yCoord = particle.body.position.y;
        if(yCoord >= threshold){
            var xCoord = particle.body.position.x;
            particle.setPointValue(pointZones(xCoord));
            shouldScroll = false; // Disable scrolling when particle reaches scoring threshold
        }
    }

    /**
     * Calculates and returns the game associated with the latest
     * Particle that has scored.
     * 
     * Zach Robinson and Gemini.
     * 
     * @param {number} xCoord Will be used to calculate the appropriate score.
     */
    function pointZones(xCoord) {
        var zoneWidth = FIXED_WIDTH/columns;
        for(var i = 0; i < columns; i++){
            var previous = i * zoneWidth;
            var current = (i + 1) * zoneWidth;
            if(xCoord > previous && xCoord < current){
                return selectedGames[i];
            }
        }
        return ""; // Return empty string if it doesn't land in a zone
    }

    /**
     * Displays the selected game at the top of the page.
     * 
     * Zach Robinson and Gemini.
     */
    function displaySum() {
        // Find the game for the particle that just landed
        let landedParticleGame = "";
        for (let i = 0; i < particles.length; i++) {
            var yCoord = particles[i].body.position.y;
            var threshold = FIXED_HEIGHT - 150; // Adjusted vertical threshold based on new height
             if(yCoord >= threshold){
                var xCoord = particles[i].body.position.x;
                 landedParticleGame = pointZones(xCoord);
                 // Assuming only one particle lands at a time or we only care about the latest
                 break;
             }
        }

        if (landedParticleGame !== "") {
             document.getElementById(totalScoreId).innerHTML = "Selected Game: " + landedParticleGame;
        }

    }
}

/**
 * Runs on every frame. Draws all point labels, pegs, particles, and boundary objects.
 * Finally, iterates through all particles to determine current score and displays that
 * score on the web page.
 * Includes drawing the particle spawn preview.
 * 
 * Zach Robinson and Gemini.
 */
function draw() {
    background(50);
    // Only update engine if a particle has been dropped
    if (particleDropped) {
        Engine.update(engine);
    }

    //spawnParticles(); // This function is no longer needed

    drawPointLabels();
    drawPegs();
    
    // Draw particles that are in the physics world
    for(var i = 0; i < particles.length; i++) {
        particles[i].show();
        // Remove particles that are off screen
        if (particles[i].isOffScreen()){
             // Remove from Matter.js world
            World.remove(world, particles[i].body);
            // Remove from our particles array
            particles.splice(i, 1);
            i--; // Decrement i because we removed an element
        }
    }

    drawBoundaries();

    // Only assign point values and display sum if a particle has been dropped
    if (particleDropped) {
        assignPointValuesAndDisplay();
    }

    // Scroll to follow the latest particle - only if a particle has been dropped, particles exist, and shouldScroll is true
    if (particleDropped && particles.length > 0 && shouldScroll) {
        let latestParticle = particles[particles.length - 1];
        let particleY = latestParticle.body.position.y;
        let canvasTop = document.getElementById('game-container').getBoundingClientRect().top + window.scrollY;
        // Adjust scroll target calculation for the new height
        let scrollTarget = canvasTop + particleY - (window.innerHeight / 2); // Center the particle in the viewport
        window.scrollTo(0, scrollTarget);
    }

    // Draw the preview particle if it exists and a particle hasn't been dropped
    if (!seedInURL && previewParticle && !particleDropped) {
        previewParticle.show(); // Draw the preview particle using its stored position
    }
}

/**
 * Spawns particles per frame count rather than on button spawn.
 * Used for testing.
 * 
 * Zach Robinson.
 */
function spawnParticles() {
    // This function is no longer needed as particles are spawned on mouse press
    // if (frameCount % particleFrequency == 0) {
    //     createNewParticle();
    // }
}

/**
 * Handles mouse press events to drop a particle.
 * 
 * Gemini.
 */
function mousePressed() {
  // Skip countdown if it's active
  if (countdownActive) {
    if (countdownTimer) {
      clearTimeout(countdownTimer);
      countdownTimer = null;
    }
    countdownActive = false;
    const countdownDisplay = document.getElementById('countdown-display');
    if (countdownDisplay) {
      countdownDisplay.remove();
    }
    dropBallFromSeed();
    return;
  }
  
  // Check if the mouse click is within the canvas area and if a particle hasn't been dropped yet
  if (mouseX > 0 && mouseX < FIXED_WIDTH && mouseY > 0 && mouseY < FIXED_HEIGHT && !particleDropped) {
    dropParticle();
  }
}

/**
 * Drops the current preview particle.
 * 
 * @param {number} x Optional x position to override preview particle position.
 */
function dropParticle(x = null, seededRandomOverride = null) {
  if (particleDropped || !previewParticle) return;
  
  // Override position if provided
  if (x !== null) {
    previewParticle.x = x;
  }
  
  previewParticle.addToWorld(); // Create and add the body to the physics world
  particles.push(previewParticle); // Add to our particles array for drawing/tracking
  previewParticle = null; // Clear the preview particle after dropping
  particleDropped = true; // Set the flag to true after dropping the first particle
  shouldScroll = true; // Enable scrolling when the particle is dropped

  // Hide the randomize button after the first particle is dropped
  if (randomizeButton) {
      randomizeButton.style.display = 'none';
  }
}

/**
 * Handles mouse movement to update particle preview position.
 * 
 * Gemini.
 */
function mouseMoved() {
    // Only show preview if a particle hasn't been dropped yet and mouse is within canvas width
    if (seedInURL) return; // Skip if seed is in URL
    if (!particleDropped && mouseX > 0 && mouseX < FIXED_WIDTH) {
        // Determine particle radius based on device type for preview
        const mobileBreakpoint = 1000; // Use the same breakpoint
        let particleRadius = 18; // Default PC size
        if (windowWidth < mobileBreakpoint) {
            particleRadius = 36; // Doubled size for mobile
        }

        if (!previewParticle) {
             // Create particle object for preview (no physics body yet)
            previewParticle = new Particle(mouseX, 12, particleRadius); // Use determined radius
        } else {
            // Update the preview particle's stored position and radius
            previewParticle.x = mouseX;
            previewParticle.y = 12; // Keep y fixed
            previewParticle.r = particleRadius; // Update radius as well
        }
    } else if (particleDropped && previewParticle) {
        // If a particle has been dropped, remove the preview particle
        previewParticle = null;
    }
}

/**
 * Handles mouse leaving canvas to remove preview particle.
 * 
 * Gemini.
 */
function mouseOut() {
    // Remove the preview particle when the mouse leaves the canvas, only if a particle hasn't been dropped
    if (seedInURL) return; // Skip if seed is in URL
    if (!particleDropped && previewParticle) {
        previewParticle = null; // Clear the preview particle
    }
}

/**
 * Resets the game to its initial state for a new round.
 * 
 * Gemini.
 */
function resetGame() {
    // removeAllParticles(); // Remove existing particles (commented out as function is removed)
    // Manually remove particles from world and array
    for(var i = particles.length - 1; i >= 0; i--) {
        World.remove(world, particles[i].body);
        particles.splice(i, 1);
    }

    selectedGames = []; // Clear selected games to get new ones next draw
    particleDropped = false; // Reset dropped flag
    previewParticle = null; // Ensure no preview particle exists
    document.getElementById(totalScoreId).innerHTML = "&nbsp;"; // Clear the score display
    
    // Reset countdown state
    countdownActive = false;
    if (countdownTimer) {
        clearTimeout(countdownTimer);
        countdownTimer = null;
    }
    
    // Remove countdown display if it exists
    const countdownDisplay = document.getElementById('countdown-display');
    if (countdownDisplay) {
        countdownDisplay.remove();
    }
    
    // Show the randomize button again for a new round
    if (randomizeButton) {
        randomizeButton.style.display = 'block';
    }

    redraw(); // Redraw the canvas
}

// Add a resize event listener to reinitialize the canvas and game elements
function windowResized() {
    console.log('windowResized called.');
    // Check if dimensions have actually changed before reinitializing to avoid unnecessary resets
    if (width !== FIXED_WIDTH || height !== FIXED_HEIGHT) {
         initializeCanvas();
         // Reset game state on resize
        particleDropped = false; // Reset dropped flag on resize
        previewParticle = null; // Clear preview particle on resize
        document.getElementById(totalScoreId).innerHTML = "&nbsp;"; // Clear the score display
         if (randomizeButton) {
            randomizeButton.style.display = 'block'; // Show randomize button on resize
        }
    }
}
