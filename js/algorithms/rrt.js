import { BasePlanner } from '../planner.js';
import { distance } from '../math.js';

export class RRT extends BasePlanner {
    constructor(env, start, goal, config) {
        super(env, start, goal, config, 'rrt');
        this.algConfig = config.algorithms.rrt;
    }
    
    step() {
        if (this.finished || this.iterations >= this.maxIterations) {
            this.finished = true;
            return;
        }
        
        this.iterations++;
        
        // 1. Random Sample
        let q_rand;
        if (this.prng.nextFloat() < this.algConfig.goal_bias) {
            q_rand = { ...this.goal };
        } else {
            q_rand = this.getRandomSample();
        }
        this.samples.push(q_rand);
        
        // 2. Nearest
        const q_near = this.getNearestNode(q_rand);
        
        // 3. Steer
        const q_new_pos = this.steer(q_near, q_rand, this.algConfig.step_size);
        
        // 4. Collision Check
        if (this.isCollisionFree(q_near, q_new_pos)) {
            const q_new = {
                id: this.nodes.length,
                x: q_new_pos.x,
                y: q_new_pos.y,
                parent: q_near,
                cost: q_near.cost + distance(q_near, q_new_pos)
            };
            this.nodes.push(q_new);
            this.edges.push({from: q_near, to: q_new});
            
            // 5. Check Goal
            if (this.isGoalReached(q_new)) {
                this.firstSolutionFound = true;
                if (q_new.cost < this.pathCost) {
                    this.pathCost = q_new.cost;
                    this.path = this.reconstructPath(q_new);
                }
                
                if (this.algConfig.terminate_on_first_solution) {
                    this.finished = true;
                }
            }
        } else {
            this.rejectedEdges.push({from: q_near, to: q_new_pos});
        }
    }
}
