import { PRNG, distance, lineIntersectsCircle, lineIntersectsRect } from './math.js';

export class Environment {
    constructor(config) {
        this.config = config;
        this.width = config.environment.default_width;
        this.height = config.environment.default_height;
        this.type = config.environment.default_type;
        this.seed = config.simulation.env_seed;
        this.prng = new PRNG(this.seed);
        
        this.circles = [];
        this.rectangles = []; // {x, y, w, h}
        
        this.generate();
    }
    
    generate() {
        if (this.type === 'random_forest') {
            this.generateRandomForest();
        } else if (this.type === 'maze') {
            this.generateMaze();
        } else if (this.type === 'empty') {
            // No obstacles for the empty environment.
        }
    }
    
    generateRandomForest() {
        const rfConf = this.config.random_forest;
        const bm = rfConf.boundary_margin;
        
        for (let i = 0; i < rfConf.circle_count; i++) {
            const r = this.prng.nextInt(rfConf.circle_radius_min, rfConf.circle_radius_max);
            const x = this.prng.nextInt(bm + r, this.width - bm - r);
            const y = this.prng.nextInt(bm + r, this.height - bm - r);
            this.circles.push({x, y, r});
        }
        
        for (let i = 0; i < rfConf.rectangle_count; i++) {
            const w = this.prng.nextInt(rfConf.rectangle_size_min, rfConf.rectangle_size_max);
            const h = this.prng.nextInt(rfConf.rectangle_size_min, rfConf.rectangle_size_max);
            const x = this.prng.nextInt(bm, this.width - bm - w);
            const y = this.prng.nextInt(bm, this.height - bm - h);
            this.rectangles.push({x, y, w, h});
        }
    }
    
    generateMaze() {
        // Simplified recursive backtracking grid maze converted to continuous rects
        const mzConf = this.config.maze;
        const cols = mzConf.cols;
        const rows = mzConf.rows;
        const cellW = mzConf.corridor_size + mzConf.wall_thickness;
        const cellH = cellW;
        
        this.width = cols * cellW + mzConf.wall_thickness;
        this.height = rows * cellH + mzConf.wall_thickness;
        
        // Grid setup
        const grid = Array(rows).fill(0).map(() => Array(cols).fill({visited: false, top: true, right: true, bottom: true, left: true}));
        
        // Generate spanning tree
        const stack = [];
        let curr = {r: 0, c: 0};
        grid[0][0] = {...grid[0][0], visited: true};
        let visitedCount = 1;
        
        while (visitedCount < rows * cols) {
            const neighbors = [];
            const dirs = [
                {dr: -1, dc: 0, wall: 'top', opp: 'bottom'},
                {dr: 0, dc: 1, wall: 'right', opp: 'left'},
                {dr: 1, dc: 0, wall: 'bottom', opp: 'top'},
                {dr: 0, dc: -1, wall: 'left', opp: 'right'}
            ];
            
            for (const d of dirs) {
                const nr = curr.r + d.dr;
                const nc = curr.c + d.dc;
                if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !grid[nr][nc].visited) {
                    neighbors.push({nr, nc, d});
                }
            }
            
            if (neighbors.length > 0) {
                const choice = neighbors[this.prng.nextInt(0, neighbors.length - 1)];
                grid[curr.r][curr.c] = {...grid[curr.r][curr.c], [choice.d.wall]: false};
                grid[choice.nr][choice.nc] = {...grid[choice.nr][choice.nc], visited: true, [choice.d.opp]: false};
                stack.push(curr);
                curr = {r: choice.nr, c: choice.nc};
                visitedCount++;
            } else if (stack.length > 0) {
                curr = stack.pop();
            }
        }
        
        // Convert to rectangles
        const wt = mzConf.wall_thickness;
        // Outer boundaries
        this.rectangles.push({x: 0, y: 0, w: this.width, h: wt});
        this.rectangles.push({x: 0, y: this.height - wt, w: this.width, h: wt});
        this.rectangles.push({x: 0, y: 0, w: wt, h: this.height});
        this.rectangles.push({x: this.width - wt, y: 0, w: wt, h: this.height});
        
        // Inner walls
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const cell = grid[r][c];
                const x = c * cellW;
                const y = r * cellH;
                if (cell.right) {
                    this.rectangles.push({x: x + cellW, y: y, w: wt, h: cellH + wt});
                }
                if (cell.bottom) {
                    this.rectangles.push({x: x, y: y + cellH, w: cellW + wt, h: wt});
                }
            }
        }
    }
    
    isCollisionFree(p1, p2, robotRadius) {
        // Enforce boundary
        if (Math.min(p1.x, p2.x) - robotRadius < 0 || Math.max(p1.x, p2.x) + robotRadius > this.width) return false;
        if (Math.min(p1.y, p2.y) - robotRadius < 0 || Math.max(p1.y, p2.y) + robotRadius > this.height) return false;
        
        // Check circles
        for (const c of this.circles) {
            if (lineIntersectsCircle(p1, p2, c, c.r + robotRadius)) return false;
        }
        
        // Check rectangles
        for (const rect of this.rectangles) {
            // Expand rect by robotRadius for Minkowski sum approximation
            if (lineIntersectsRect(p1, p2, rect.x - robotRadius, rect.y - robotRadius, rect.w + 2*robotRadius, rect.h + 2*robotRadius)) {
                return false;
            }
        }
        
        return true;
    }
    
    isPointValid(p, robotRadius) {
        if (p.x - robotRadius < 0 || p.x + robotRadius > this.width || p.y - robotRadius < 0 || p.y + robotRadius > this.height) return false;
        for (const c of this.circles) {
            if (distance(p, c) < c.r + robotRadius) return false;
        }
        for (const rect of this.rectangles) {
            if (p.x >= rect.x - robotRadius && p.x <= rect.x + rect.w + robotRadius &&
                p.y >= rect.y - robotRadius && p.y <= rect.y + rect.h + robotRadius) return false;
        }
        return true;
    }
}
