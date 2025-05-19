/**
 * The constructor for a Boundary object.
 * 
 * Zach Robinson
 * 
 * @param {number} x The x coordinate for where the object should be drawn.
 * @param {number} y The y coordinate for where the object should be drawn.
 * @param {number} w The width of the object.
 * @param {number} h The height of the object.
 */
class Boundary {
    constructor(x, y, w, h) {
        var options = {
            isStatic: true
        };
        this.body = Bodies.rectangle(x, y, w, h, options);
        this.w = w;
        this.h = h;
        World.add(world, this.body);
        
        // Default colors (White in HSB: H=0, S=0, B=100)
        this.hue = 0;
        this.saturation = 0;
        this.brightness = 100;
    }

    /**
     * Displays the boundary object with predetermined fill at 
     * the coordinates determined by the object's constructor.
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
        rectMode(CENTER);
        rect(0, 0, this.w, this.h);
        pop();
    }

    /**
     * Sets the color of the boundary to match the given particle.
     * Assumes particle has HSB color properties (hue, saturation, brightness).
     * @param {Particle} particle The particle whose color to match
     */
    setColor(particle) {
        this.hue = particle.hue;
        this.saturation = particle.saturation;
        this.brightness = particle.brightness;
    }
}

