class Particle {
    /**
     * The constructor for a Particle object.
     * 
     * Zach Robinson and Gemini.
     * 
     * @param {number} x The x coordinate for where the object should be drawn.
     * @param {number} y The y coordinate for where the object should be drawn.
     * @param {number} r The radius of the particle object.
     */
    constructor(x, y, r) {

        var options = {
            restitution: .8,
            friction: 0
        };
        // Don't create the body or add to world here
        // this.body = Bodies.circle(x, y, r, options);
        // World.add(world, this.body);
        this.x = x; // Store initial x
        this.y = y; // Store initial y
        this.r = r;
        this.body = null; // Body is null initially
        this.options = options; // Store options for later body creation

        this.red = Math.max(Math.random() * 255, 20);
        this.green = Math.max(Math.random() * 255, 210);
        this.blue = Math.max(Math.random() * 255, 150);
        this.pointValue = 0;
    }

    /**
     * Determines if the object is off of the canvas. Used to justify
     * whether the object should be removed from engine and draw array.
     * 
     * Zach Robinson.
     */
    isOffScreen() {
        // Check position based on body if it exists, otherwise use stored position
        let currentX = this.body ? this.body.position.x : this.x;
        let currentY = this.body ? this.body.position.y : this.y;
        return currentX < -50 || currentX > width + 50 || currentY > height + 50; // Added check for falling off bottom
    }

    /**
     * Displays the Particle object at predetermined location and color
     * determined by the object's constructor.
     * 
     * Zach Robinson.
     */
    show() {
        fill(this.red, this.green, this.blue);
        stroke(this.red, this.green, this.blue);
        push();
        // Use body position if it exists, otherwise use stored position
        var pos = this.body ? this.body.position : { x: this.x, y: this.y };
        translate(pos.x, pos.y);
        
        // Get the rotation angle from the physics body if it exists
        var angle = this.body ? this.body.angle : 0;
        rotate(angle);
        
        // Draw the main particle body
        ellipse(0, 0, this.r * 2);
        
        // Draw eyes
        fill(255); // White color for eyes
        noStroke();
        // Left eye - increased size from r/2 to r*0.7
        ellipse(-this.r/2, -this.r/4, this.r * 0.7);
        // Right eye - increased size from r/2 to r*0.7
        ellipse(this.r/2, -this.r/4, this.r * 0.7);
        
        // Draw pupils
        fill(0); // Black color for pupils
        // Left pupil - increased size from r/4 to r*0.35
        ellipse(-this.r/2, -this.r/4, this.r * 0.35);
        // Right pupil - increased size from r/4 to r*0.35
        ellipse(this.r/2, -this.r/4, this.r * 0.35);
        
        // Draw smile
        noFill();
        stroke(0); // Black color for smile
        strokeWeight(this.r * 0.1); // Thickness of smile line
        arc(0, this.r/4, this.r, this.r, 0, PI); // Draw a half circle for the smile
        
        pop();
    }

    /**
     * Sets the point value of the object.
     * 
     * Zach Robinson.
     * 
     * @param {number} value The point value that the property should inherit.
     */
    setPointValue(value) {
        if (typeof value === 'number')
            this.pointValue = value;
    }

    /**
     * Creates the Matter.js body for the particle and adds it to the world.
     * 
     * Gemini.
     */
    addToWorld() {
        if (!this.body) {
            this.body = Bodies.circle(this.x, this.y, this.r, this.options);
            World.add(world, this.body);
        }
    }
}