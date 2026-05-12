import { RRTStar } from './rrt_star.js';
import { distance } from '../math.js';

export class IRRTStar extends RRTStar {
    constructor(env, start, goal, config) {
        super(env, start, goal, config);
        this.type = 'irrt_star';
        this.algConfig = config.algorithms.informed_rrt_star;
        
        // cMin is the distance between start and goal
        this.cMin = distance(start, goal);
    }
    
    // Override sample function for informed sampling
    getRandomSample() {
        if (!this.firstSolutionFound) {
            return super.getRandomSample();
        }
        
        // Informed Sampling (Ellipsoid subset)
        const cBest = this.pathCost;
        if (cBest >= Infinity) return super.getRandomSample();
        
        let x, y;
        const center = {
            x: (this.start.x + this.goal.x) / 2,
            y: (this.start.y + this.goal.y) / 2
        };
        const theta = Math.atan2(this.goal.y - this.start.y, this.goal.x - this.start.x);
        
        const rx = cBest / 2;
        const ry = Math.sqrt(Math.max(0, cBest*cBest - this.cMin*this.cMin)) / 2;
        
        do {
            // Sample unit circle
            const r = this.prng.nextFloat();
            const th = this.prng.nextFloat() * 2 * Math.PI;
            const u = Math.sqrt(r) * Math.cos(th);
            const v = Math.sqrt(r) * Math.sin(th);
            
            // Scale by ellipsoid radii
            const sx = rx * u;
            const sy = ry * v;
            
            // Rotate and translate
            x = center.x + sx * Math.cos(theta) - sy * Math.sin(theta);
            y = center.y + sx * Math.sin(theta) + sy * Math.cos(theta);
            
        } while(!this.env.isPointValid({x, y}, this.config.simulation.robot_radius) || 
                x < 0 || x > this.env.width || y < 0 || y > this.env.height);
                
        return {x, y};
    }
}
