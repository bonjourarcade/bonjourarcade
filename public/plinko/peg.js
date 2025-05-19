class Peg {
    /**
     * The constructor for a Peg object.
     * 
     * Zach Robinson.
     * 
     * @param {number} x The x coordinate for where the object should be drawn.
     * @param {number} y The y coordinate for where the object should be drawn.
     * @param {number} r The radius of the peg object.
     */
    constructor(x, y, r) {
        var options = {
            isStatic: true,
        };
        this.body = Bodies.circle(x, y, r, options);
        this.r = r;
        World.add(world, this.body);
        
        // Default colors (White in HSB: H=0, S=0, B=100)
        this.hue = 0;
        this.saturation = 0;
        this.brightness = 100;
    }

    /**
     * Displays the Peg object at predetermined location
     * determined by the object's constructor.
     * 
     * Zach Robinson.
     */
    show() {
        // Use stored HSB colors
        fill(this.hue, this.saturation, this.brightness);
        stroke(this.hue, this.saturation, this.brightness);
        push();
        var pos = this.body.position;
        translate(pos.x, pos.y);
        ellipse(0, 0, this.r * 2);
        pop();
    }

    /**
     * Sets the color of the peg to match the given particle.
     * Assumes particle has HSB color properties (hue, saturation, brightness).
     * @param {Particle} particle The particle whose color to match
     */
    setColor(particle) {
        this.hue = particle.hue;
        this.saturation = particle.saturation;
        this.brightness = particle.brightness;
    }
}

