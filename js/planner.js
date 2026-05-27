import { PRNG, distance } from './math.js';

export class BasePlanner {
    constructor(env, start, goal, config, type) {
        this.env = env;
        this.start = start;
        this.goal = goal;
        this.config = config;
        this.type = type;
        this.prng = new PRNG(config.simulation.smp_seed);
        
        this.nodes = [];
        this.edges = [];
        this.rejectedEdges = [];
        this.samples = [];
        
        this.path = [];
        this.pathCost = Infinity;
        
        this.iterations = 0;
        this.maxIterations = config.simulation.max_iterations;
        this.collisionChecks = 0;
        
        this.finished = false;
        this.firstSolutionFound = false;
        
        // Initialize with start node
        this.nodes.push({ id: 0, x: start.x, y: start.y, parent: null, cost: 0 });
    }
    
    // Abstract step method
    step() {
        throw new Error('step() must be implemented');
    }
    
    getRandomSample() {
        let x, y;
        do {
            x = this.prng.nextFloat() * this.env.width;
            y = this.prng.nextFloat() * this.env.height;
        } while(!this.env.isPointValid({x, y}, this.config.simulation.robot_radius));
        return {x, y};
    }
    
    getNearestNode(q) {
        // Naive nearest neighbor for simplicity, O(N)
        let nearest = null;
        let minD = Infinity;
        for (const n of this.nodes) {
            const d = distance(n, q);
            if (d < minD) {
                minD = d;
                nearest = n;
            }
        }
        return nearest;
    }
    
    steer(from, to, stepSize) {
        const d = distance(from, to);
        if (d < stepSize) return to;
        const theta = Math.atan2(to.y - from.y, to.x - from.x);
        return {
            x: from.x + stepSize * Math.cos(theta),
            y: from.y + stepSize * Math.sin(theta)
        };
    }
    
    isGoalReached(node) {
        return distance(node, this.goal) <= this.config.simulation.goal_radius;
    }
    
    reconstructPath(node) {
        const path = [];
        let curr = node;
        while (curr !== null) {
            path.push(curr);
            curr = curr.parent;
        }
        return path.reverse();
    }

    isCollisionFree(p1, p2) {
        this.collisionChecks++;
        return this.env.isCollisionFree(p1, p2, this.config.simulation.robot_radius);
    }
}
