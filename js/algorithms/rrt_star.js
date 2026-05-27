import { BasePlanner } from '../planner.js';
import { distance } from '../math.js';

export class RRTStar extends BasePlanner {
    constructor(env, start, goal, config) {
        super(env, start, goal, config, 'rrt_star');
        this.algConfig = config.algorithms.rrt_star;
    }
    
    getNearNodes(q, radius) {
        return this.nodes.filter(n => distance(n, q) <= radius);
    }
    
    step() {
        if (this.finished) return;
        
        if (this.firstSolutionFound && !this.algConfig.optimize_after_first_solution) {
            this.finished = true;
            return;
        }
        
        if (this.firstSolutionFound && this.solutionFoundIteration !== undefined) {
            if ((this.iterations - this.solutionFoundIteration) >= this.algConfig.optimization_iterations) {
                this.finished = true;
                return;
            }
        }
        
        if (!this.firstSolutionFound && this.iterations >= this.maxIterations) {
            this.finished = true;
            return;
        }
        
        if (this.firstSolutionFound && this.algConfig.target_cost > 0 && this.pathCost <= this.algConfig.target_cost) {
            this.finished = true;
            return;
        }
        
        this.iterations++;
        
        // 1. Random Sample
        let q_rand;
        if (!this.firstSolutionFound && this.prng.nextFloat() < this.algConfig.goal_bias) {
            q_rand = { ...this.goal };
        } else {
            q_rand = this.getRandomSample();
        }
        this.samples.push(q_rand);
        
        // 2. Nearest
        const q_near = this.getNearestNode(q_rand);
        
        // 3. Steer
        const q_new_pos = this.steer(q_near, q_rand, this.algConfig.step_size);
        
        if (this.isCollisionFree(q_near, q_new_pos)) {
            // RRT* Extensions
            
            // 4. Find Near Neighbors
            // Adaptive radius: gamma * (log(n)/n)^(1/d) is optimal, but we'll use fixed radius or scaled down
            const nNodes = this.nodes.length;
            const gamma = this.algConfig.rewire_radius * 2;
            const d = 2; // dimension
            const rad = Math.min(this.algConfig.rewire_radius, gamma * Math.pow(Math.log(nNodes + 1) / (nNodes + 1), 1/d));
            
            const q_near_nodes = this.getNearNodes(q_new_pos, Math.max(rad, this.algConfig.step_size));
            
            let q_min = q_near;
            let c_min = q_near.cost + distance(q_near, q_new_pos);
            
            // 5. Choose Parent
            for (const q_n of q_near_nodes) {
                const c_test = q_n.cost + distance(q_n, q_new_pos);
                if (c_test < c_min && this.isCollisionFree(q_n, q_new_pos)) {
                    q_min = q_n;
                    c_min = c_test;
                }
            }
            
            const q_new = {
                id: this.nodes.length,
                x: q_new_pos.x,
                y: q_new_pos.y,
                parent: q_min,
                cost: c_min
            };
            this.nodes.push(q_new);
            this.edges.push({from: q_min, to: q_new});
            
            // 6. Rewire
            let rewired = false;
            for (const q_n of q_near_nodes) {
                if (q_n.id === q_min.id || q_n.id === 0) continue; // skip start and parent
                
                const c_test = q_new.cost + distance(q_new, q_n);
                if (c_test < q_n.cost && this.isCollisionFree(q_new, q_n)) {
                    // Rewire q_n to q_new
                    const oldEdgeIdx = this.edges.findIndex(e => e.to.id === q_n.id);
                    if (oldEdgeIdx !== -1) {
                        this.edges.splice(oldEdgeIdx, 1);
                    }
                    q_n.parent = q_new;
                    q_n.cost = c_test;
                    this.edges.push({from: q_new, to: q_n});
                    rewired = true;
                }
            }
            
            if (rewired) {
                // Cascading cost update BFS
                const queue = [q_new];
                while(queue.length > 0) {
                    const curr = queue.shift();
                    for (const edge of this.edges) {
                        if (edge.from.id === curr.id) {
                            edge.to.cost = curr.cost + distance(curr, edge.to);
                            queue.push(edge.to);
                        }
                    }
                }
            }
            
            // Check Goal and update best path
            if (this.firstSolutionFound) {
                let bestCost = Infinity;
                let bestNode = null;
                for (const n of this.nodes) {
                    if (this.isGoalReached(n) && n.cost < bestCost) {
                        bestCost = n.cost;
                        bestNode = n;
                    }
                }
                if (bestNode && bestCost < this.pathCost) {
                    this.pathCost = bestCost;
                    this.path = this.reconstructPath(bestNode);
                }
            } else if (this.isGoalReached(q_new)) {
                this.firstSolutionFound = true;
                this.solutionFoundIteration = this.iterations;
                this.pathCost = q_new.cost;
                this.path = this.reconstructPath(q_new);
            }
        } else {
            this.rejectedEdges.push({from: q_near, to: q_new_pos});
        }
    }
}
