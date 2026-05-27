import { BasePlanner } from '../planner.js';
import { distance } from '../math.js';

export class BITStar extends BasePlanner {
    constructor(env, start, goal, config) {
        super(env, start, goal, config, 'bit_star');
        this.algConfig = config.algorithms.bit_star;
        this.cMin = distance(start, goal);
        
        this.V = [this.nodes[0]];
        this.nextId = 1;
        const goalNode = { id: this.nextId++, x: this.goal.x, y: this.goal.y, cost: Infinity, parent: null };
        this.X_unconn = [goalNode]; // explicitly add goal as a sample
        this.VQ = [];
        this.EQ = [];
        
        this.unexpanded = [this.nodes[0]];
        this.x_new = [];
        this.x_reuse = [];
        
        this.r = this.algConfig.rewire_radius;
        this.batchCount = 0;
        
        // Push start node
        this.VQ.push(this.nodes[0]);
    }
    
    // Heuristic value
    h(p) {
        return distance(p, this.goal);
    }
    
    // Cost to come heuristic
    gT(p) {
        return distance(this.start, p);
    }
    
    f(p) {
        return this.gT(p) + this.h(p);
    }
    
    sampleInEllipsoid(cBest) {
        let x, y;
        const center = { x: (this.start.x + this.goal.x) / 2, y: (this.start.y + this.goal.y) / 2 };
        const theta = Math.atan2(this.goal.y - this.start.y, this.goal.x - this.start.x);
        const rx = cBest / 2;
        const ry = Math.sqrt(Math.max(0, cBest * cBest - this.cMin * this.cMin)) / 2;
        
        do {
            const r = this.prng.nextFloat();
            const th = this.prng.nextFloat() * 2 * Math.PI;
            const u = Math.sqrt(r) * Math.cos(th);
            const v = Math.sqrt(r) * Math.sin(th);
            const sx = rx * u;
            const sy = ry * v;
            x = center.x + sx * Math.cos(theta) - sy * Math.sin(theta);
            y = center.y + sx * Math.sin(theta) + sy * Math.cos(theta);
        } while(!this.env.isPointValid({x, y}, this.config.simulation.robot_radius) || 
                x < 0 || x > this.env.width || y < 0 || y > this.env.height);
                
        return {x, y};
    }
    
    prune() {
        this.x_reuse = [];
        const newUnconn = [];
        for (const n of this.X_unconn) {
            const fHat = distance(this.start, n) + this.h(n);
            if (fHat < this.pathCost) {
                newUnconn.push(n);
            }
        }
        this.X_unconn = newUnconn;
        
        const newNodes = [];
        const newEdges = [];
        
        for (const v of this.nodes) {
            // Keep start node and current best path nodes
            if (v.id === this.nodes[0].id || (this.path && this.path.some(p => p.x === v.x && p.y === v.y))) {
                newNodes.push(v);
                continue;
            }
            
            const fHat = distance(this.start, v) + this.h(v);
            if (fHat <= this.pathCost && (v.cost + this.h(v)) <= this.pathCost) {
                newNodes.push(v);
            } else {
                if (fHat <= this.pathCost) {
                    v.parent = null;
                    v.cost = Infinity;
                    this.x_reuse.push(v);
                }
            }
        }
        
        this.nodes = newNodes;
        for (const e of this.edges) {
            if (newNodes.includes(e.from) && newNodes.includes(e.to)) {
                newEdges.push(e);
            }
        }
        this.edges = newEdges;
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
        
        if (this.firstSolutionFound && this.algConfig.target_cost > 0 && this.pathCost <= this.algConfig.target_cost) {
            this.finished = true;
            return;
        }
        
        if (!this.firstSolutionFound && this.iterations >= this.maxIterations) {
            this.finished = true;
            return;
        }
        
        this.iterations++;
        
        // 1. If both queues are empty, sample new batch
        if (this.VQ.length === 0 && this.EQ.length === 0) {
            this.batchCount++;
            
            if (this.firstSolutionFound) {
                this.prune();
            }
            
            this.x_new = [...this.x_reuse];
            // Add reused nodes back to unconnected pool
            for (const r of this.x_reuse) {
                this.X_unconn.push(r);
            }
            
            // Generate samples
            const samplesToGen = Number.isFinite(this.algConfig.batch_size)
                ? this.algConfig.batch_size
                : this.algConfig.samples_per_batch;
            for (let i = 0; i < samplesToGen; i++) {
                let q;
                if (this.pathCost < Infinity) {
                    q = this.sampleInEllipsoid(this.pathCost);
                } else {
                    q = this.getRandomSample();
                }
                const node = { id: this.nextId++, x: q.x, y: q.y, cost: Infinity, parent: null };
                this.x_new.push(node);
                this.X_unconn.push(node);
                this.samples.push(node);
            }
            
            // Rebuild VQ from all nodes in tree
            this.VQ = [...this.nodes];
            // Sort VQ by f(v)
            this.VQ.sort((a, b) => (a.cost + this.h(a)) - (b.cost + this.h(b)));
            
            this.unexpanded = [...this.nodes];
        }
        
        // Evaluate condition for expanding VQ vs EQ
        const vBest = this.VQ.length > 0 ? this.VQ[0] : null;
        const eBest = this.EQ.length > 0 ? this.EQ[0] : null;
        
        const vCost = vBest ? vBest.cost + this.h(vBest) : Infinity;
        const eCost = eBest ? eBest.from.cost + distance(eBest.from, eBest.to) + this.h(eBest.to) : Infinity;
        
        if (vCost <= eCost && vBest) {
            // Expand Vertex Queue
            const v = this.VQ.shift();
            
            // Find nearby unconnected samples
            let xNear = [];
            if (this.unexpanded.includes(v)) {
                xNear = this.X_unconn.filter(x => distance(v, x) <= this.r);
            } else {
                xNear = this.X_unconn.filter(x => this.x_new.includes(x) && distance(v, x) <= this.r);
            }
            
            for (const x of xNear) {
                const aHat = distance(this.start, v) + distance(v, x) + this.h(x);
                if (aHat < this.pathCost) {
                    this.EQ.push({from: v, to: x});
                }
            }
            
            if (this.unexpanded.includes(v)) {
                // Find nearby connected nodes to rewire
                for (const w of this.nodes) {
                    if (v.id !== w.id && distance(v, w) <= this.r) {
                        const aHat = distance(this.start, v) + distance(v, w) + this.h(w);
                        if (aHat < this.pathCost && (distance(this.start, v) + distance(v, w) < w.cost)) {
                            const edgeExists = this.edges.some(e => e.from.id === v.id && e.to.id === w.id);
                            if (!edgeExists) {
                                this.EQ.push({from: v, to: w});
                            }
                        }
                    }
                }
                
                // Remove v from unexpanded
                const unIdx = this.unexpanded.indexOf(v);
                if (unIdx !== -1) {
                    this.unexpanded.splice(unIdx, 1);
                }
            }
            
            // Sort Edge Queue by est cost
            this.EQ.sort((a, b) => {
                const cA = a.from.cost + distance(a.from, a.to) + this.h(a.to);
                const cB = b.from.cost + distance(b.from, b.to) + this.h(b.to);
                return cA - cB;
            });
            
        } else if (eBest) {
            // Expand Edge Queue
            const edge = this.EQ.shift();
            const v = edge.from;
            const x = edge.to;
            
            // Actual cost
            const trueCost = v.cost + distance(v, x) + this.h(x);
            if (trueCost < this.pathCost) {
                // To rewire or to connect new?
                const isUnconnected = this.X_unconn.includes(x);
                let w = x;
                
                if (v.cost + distance(v, x) < (isUnconnected ? Infinity : x.cost)) {
                    if (this.env.isCollisionFree(v, x, this.config.simulation.robot_radius)) {
                        if (isUnconnected) {
                            // Add to tree
                            const idx = this.X_unconn.indexOf(x);
                            this.X_unconn.splice(idx, 1);
                            
                            x.parent = v;
                            x.cost = v.cost + distance(v, x);
                            
                            this.nodes.push(x);
                            this.edges.push({from: v, to: x});
                            this.unexpanded.push(x);
                            this.VQ.push(x);
                            
                            // Re-sort VQ
                            this.VQ.sort((a, b) => (a.cost + this.h(a)) - (b.cost + this.h(b)));
                            
                            // Check goal
                            if (distance(x, this.goal) <= this.config.simulation.goal_radius) {
                                if (!this.firstSolutionFound) {
                                    this.firstSolutionFound = true;
                                    this.solutionFoundIteration = this.iterations;
                                }
                            }
                        } else {
                            // Rewire existing node x
                            const oldEdgeIdx = this.edges.findIndex(e => e.to.id === x.id);
                            if (oldEdgeIdx !== -1) {
                                this.edges.splice(oldEdgeIdx, 1);
                            }
                            x.parent = v;
                            x.cost = v.cost + distance(v, x);
                            this.edges.push({from: v, to: x});
                            
                            // Cascading cost update BFS
                            const queue = [x];
                            const visited = new Set([x.id]);
                            while(queue.length > 0) {
                                const curr = queue.shift();
                                for (const edge of this.edges) {
                                    if (edge.from.id === curr.id) {
                                        if (visited.has(edge.to.id)) continue;
                                        visited.add(edge.to.id);
                                        edge.to.cost = curr.cost + distance(curr, edge.to);
                                        queue.push(edge.to);
                                    }
                                }
                            }
                        }
                    } else {
                        this.rejectedEdges.push({from: v, to: x});
                    }
                }
            }
        }
        
        // Always evaluate best path to shrink ellipse
        if (this.firstSolutionFound) {
            let bestCost = Infinity;
            let bestNode = null;
            for (const n of this.nodes) {
                if (distance(n, this.goal) <= this.config.simulation.goal_radius && n.cost < bestCost) {
                    bestCost = n.cost;
                    bestNode = n;
                }
            }
            if (bestNode && bestCost < this.pathCost) {
                this.pathCost = bestCost;
                this.path = this.reconstructPath(bestNode);
            }
        }
    }
}
