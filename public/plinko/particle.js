class Particle {
    /**
     * The constructor for a Particle object.
     * 
     * Zach Robinson and Gemini.
     * 
     * @param {number} x The x coordinate for where the object should be drawn.
     * @param {number} y The y coordinate for where the object should be drawn.
     * @param {number} r The radius of the particle object.
     * @param {function} seededRandom Optional seeded random function for deterministic color.
     */
    constructor(x, y, r, seededRandom = null) {

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

        // Use seeded random for color if provided
        const rand = seededRandom || Math.random;
        this.hue = Math.floor(rand() * 360);
        this.saturation = 80 + Math.floor(rand() * 20); // 80-100
        this.brightness = 80 + Math.floor(rand() * 20); // 80-100
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
        // Use stored HSB colors for the main particle body
        fill(this.hue, this.saturation, this.brightness);
        stroke(this.hue, this.saturation, this.brightness);
        push();
        // Use body position if it exists, otherwise use stored position
        var pos = this.body ? this.body.position : { x: this.x, y: this.y };
        translate(pos.x, pos.y);
        
        // Get the rotation angle from the physics body if it exists
        var angle = this.body ? this.body.angle : 0;
        rotate(angle);
        
        // Draw the main particle body
        ellipse(0, 0, this.r * 2);
        
        // Draw star with yellow fill and black stroke (using HSB colors)
        fill(60, 100, 100); // Yellow color for star in HSB (hue, saturation, brightness)
        stroke(0); // Black outline (brightness 0 in HSB, or just 0)
        strokeWeight(this.r * 0.1); // Thickness of outline proportional to particle size
        beginShape();
        for (let i = 0; i < 5; i++) {
            // Outer point
            let outerX = cos(i * TWO_PI / 5 - PI/2) * this.r * 0.8;
            let outerY = sin(i * TWO_PI / 5 - PI/2) * this.r * 0.8;
            vertex(outerX, outerY);
            // Inner point
            let innerX = cos((i + 0.5) * TWO_PI / 5 - PI/2) * this.r * 0.4;
            let innerY = sin((i + 0.5) * TWO_PI / 5 - PI/2) * this.r * 0.4;
            vertex(innerX, innerY);
        }
        endShape(CLOSE);
        
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