var Engine = Matter.Engine,
    World = Matter.World,
    Bodies = Matter.Bodies;

var engine;
var world;
var particles = [];
var pegs = [];
var boundaries = [];
var particleFrequency = 60;
var columns = 11;
var rows = 20;
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
  gameList = data.map(line => {
    const commentIndex = line.indexOf('#');
    if (commentIndex !== -1) {
      return line.substring(0, commentIndex).trim();
    } else {
      return line.trim();
    }
  }).filter(line => line !== '');
  // Shuffle the game list initially
  shuffleArray(gameList);
}

/**
 * Shuffles an array in place (Fisher-Yates Algorithm).
 * 
 * Gemini.
 * 
 * @param {Array} array The array to shuffle.
 */
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
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
    engine = Engine.create();
    world = engine.world;
    world.gravity.y = 1;

    textFont(font);
    textSize(fontSize);
    textAlign(CENTER, CENTER);
    colorMode(HSB, 360, 100, 100); // Change color mode to HSB for rainbow colors
    
    initializeCanvas();

    // Add collision event listener
    Matter.Events.on(engine, 'collisionStart', handleCollision);

    // Smooth scroll to the top on load
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Get button references
    randomizeButton = document.getElementById('randomize-button');
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

        // Check if the collision involves a particle and another body (peg, wall, or floor)
        if (pair.bodyA.label === 'Circle Body' || pair.bodyB.label === 'Circle Body') {
            // Play the tick sound - uncomment the next line if you have loaded a sound file
            // if (tickSound && !tickSound.isPlaying()) {
            //     tickSound.play();
            // }
            playClinkSound(); // Play the generated click sound
            console.log('Collision detected!'); // Log to console for now
        }
    }
}

/**
 * Draws the canvas, calculates the spacing to be used when populating the initial static objects.
 * 
 * Zach Robinson and Gemini.
 */
function initializeCanvas() {
    var canvas = createCanvas(600, 1400);
    canvas.parent('game-container');
    var spacing = width / columns;
    populatePegs(spacing);
    populateCanvasBoundaries();
    populatePointZones(spacing);

}

/**
 * Populates the pegs using a nested for loop. Some manipulation for the spacing
 * of individual rows. Pushes all pegs to the object array designed to hold them.
 * 
 * Zach Robinson.
 */
function populatePegs(spacing) {
    let radius = 4;
    for (var row = 0; row < rows; row++){
        for (var col = 0; col < columns; col++){
            var x = col * spacing + 12;
            if (row % 2 == 1)
                x += spacing/2;
            var y = spacing + row * spacing;
            var p = new Peg(x, y, radius);
            pegs.push(p);
        }
    }
}

/**
 * Populates the point zones using a for loop. Pushes all boundary objects
 * to the object array designed to hold them.
 * 
 * Zach Robinson.
 */
function populatePointZones(spacing) {
    for (var i = 0; i < columns; i++){
        var h = 100;
        var w = 5;
        var x = i * spacing - w / 2;
        var y = height - h / 2;
        var wall = new Boundary(x, y, w, h);
        boundaries.push(wall);
    }
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
    var bottomXCoord = width / 2;
    var bottomYCoord = height + bottomHeight / 2;

    var sideWidth = 50;
    var leftXCoord = -1 * sideWidth / 2;
    var rightXCoord = width + sideWidth / 2;
    var sideYCoord = height / 2;

    var left = new Boundary(leftXCoord, sideYCoord, sideWidth, height);
    var right = new Boundary(rightXCoord, sideYCoord, sideWidth, height);
    var bottom = new Boundary(bottomXCoord, bottomYCoord, width, bottomHeight);

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
    // This function is no longer directly used for dropping, particles are created on mouse movement
    // and added to world on mouse press.
    var p = new Particle(x, 0, 12); // Use the provided x, fixed y above pegs
    particles.push(p);
    return p; // Return the created particle
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
 * 
 * Zach Robinson and Gemini.
 */
function drawPointLabels() {
    var yCoord = height - 10; // Adjusted y to new height
    var zoneWidth = width/columns;
    var offset = zoneWidth / 2; // Center the text

    // Ensure selectedGames array is populated with unique games from the shuffled list
    if (selectedGames.length === 0 && gameList.length >= columns) {
        selectedGames = gameList.slice(0, columns); // Take the first 'columns' games after shuffling
    } else if (selectedGames.length === 0 && gameList.length < columns) {
         // Handle case where there are fewer games than columns
         selectedGames = gameList.slice(); // Use all available games
         while (selectedGames.length < columns) {
             // Optionally, repeat games or use a placeholder if not enough unique games
             // For now, we'll just have fewer labels.
             selectedGames.push('-- No Game --'); // Placeholder
         }
    }

    for(var i = 0; i < columns; i++){
        var xCoord = zoneWidth * i + offset;
        
        // Calculate rainbow color based on column index
        let hue = map(i, 0, columns - 1, 0, 360); // Map column index to hue value (0-360)
        fill(hue, 100, 100); // Set fill color with calculated hue, full saturation and brightness
        stroke(hue, 100, 100); // Set stroke color

        // Draw text vertically
        push();
        translate(xCoord, yCoord);
        rotate(PI / 2);
        textAlign(RIGHT, CENTER); // Changed alignment to RIGHT
        textSize(20); // Increased text size for better readability
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
    var threshold = height - 150;   // Adjusted vertical threshold based on new height
    var sum = 0;
    var zoneWidth = width/columns;
    
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
        var zoneWidth = width/columns;
        for(var i = 0; i < columns; i++){
            var previous = zoneWidth * i;
            var current = zoneWidth * (i + 1);
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
            var threshold = height - 150; // Adjusted vertical threshold based on new height
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

    // Scroll to follow the latest particle - only if a particle has been dropped and particles exist
    if (particleDropped && particles.length > 0) {
        let latestParticle = particles[particles.length - 1];
        let particleY = latestParticle.body.position.y;
        let canvasTop = document.getElementById('game-container').getBoundingClientRect().top + window.scrollY;
        let scrollTarget = canvasTop + particleY - (window.innerHeight / 2); // Center the particle in the viewport
        window.scrollTo({ top: scrollTarget, behavior: 'smooth' });
    }

    // Draw the preview particle if it exists and a particle hasn't been dropped
    if (previewParticle && !particleDropped) {
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
 * Randomizes the games displayed on the board.
 * 
 * Gemini.
 */
function randomizeBoard() {
    selectedGames = []; // Clear the selected games
    shuffleArray(gameList); // Reshuffle the main game list
    redraw(); // Redraw the canvas to update labels
}

/**
 * Handles mouse press events to drop a particle.
 * 
 * Gemini.
 */
function mousePressed() {
  // Check if the mouse click is within the canvas area and if a particle hasn't been dropped yet
  if (mouseX > 0 && mouseX < width && mouseY > 0 && mouseY < height && !particleDropped) {
    if (previewParticle) {
        previewParticle.addToWorld(); // Create and add the body to the physics world
        particles.push(previewParticle); // Add to our particles array for drawing/tracking
        previewParticle = null; // Clear the preview particle after dropping
        particleDropped = true; // Set the flag to true after dropping the first particle

        // Hide the randomize button after the first particle is dropped
        if (randomizeButton) {
            randomizeButton.style.display = 'none';
        }
    }
  }
}

/**
 * Handles mouse movement to update particle preview position.
 * 
 * Gemini.
 */
function mouseMoved() {
    // Only show preview if a particle hasn't been dropped yet and mouse is within canvas width
    if (!particleDropped && mouseX > 0 && mouseX < width) {
        if (!previewParticle) {
             // Create particle object for preview (no physics body yet)
            previewParticle = new Particle(mouseX, 12, 12); 
        } else {
            // Update the preview particle's stored position to follow the mouse (only x-coordinate)
            previewParticle.x = mouseX;
            // previewParticle.y = 12; // Y is fixed, no need to update constantly
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
    
    // Show the randomize button again for a new round
    if (randomizeButton) {
        randomizeButton.style.display = 'block';
    }

    redraw(); // Redraw the canvas
}