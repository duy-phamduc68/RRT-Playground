import { RRT } from './algorithms/rrt.js';
// We would import RRTStar, IRRTStar, BITStar here

export class Renderer {
    constructor(containerId, env, config) {
        this.container = document.getElementById(containerId);
        this.env = env;
        this.config = config;
        
        // Setup Canvas
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.container.appendChild(this.canvas);
        
        // Dimensions
        this.width = env.width;
        this.height = env.height;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        
        this.colors = this.getThemeColors();
        
        this.isLocked = true;
        
        // D3 Zoom Setup
        this.transform = d3.zoomIdentity;
        this.zoom = d3.zoom()
            .scaleExtent([0.1, 10])
            .filter((e) => {
                if (this.isLocked) return false;
                if (e.type === 'wheel') return true;
                return !e.button; // Only allow left click drag
            })
            .on('zoom', (e) => {
                this.transform = e.transform;
                this.draw();
            });
            
        d3.select(this.canvas).call(this.zoom);
        
        // Setup Toolbar
        this.toolbar = document.createElement('div');
        this.toolbar.className = 'canvas-toolbar';
        
        const btnZoomIn = document.createElement('button');
        btnZoomIn.innerText = '+';
        btnZoomIn.title = 'Zoom In';
        btnZoomIn.onclick = () => d3.select(this.canvas).transition().duration(200).call(this.zoom.scaleBy, 1.3);
        
        const btnZoomOut = document.createElement('button');
        btnZoomOut.innerText = '-';
        btnZoomOut.title = 'Zoom Out';
        btnZoomOut.onclick = () => d3.select(this.canvas).transition().duration(200).call(this.zoom.scaleBy, 1 / 1.3);
        
        const btnResetView = document.createElement('button');
        btnResetView.innerText = '⟲';
        btnResetView.title = 'Reset View';
        btnResetView.onclick = () => this.fitView();
        
        const btnLock = document.createElement('button');
        btnLock.innerText = 'Unlock';
        btnLock.title = 'Toggle Pan/Zoom';
        btnLock.onclick = () => {
            this.isLocked = !this.isLocked;
            btnLock.innerText = this.isLocked ? 'Unlock' : 'Lock';
            if (!this.isLocked) {
                btnLock.style.backgroundColor = 'var(--accent)';
                btnLock.style.color = '#fff';
            } else {
                btnLock.style.backgroundColor = '';
                btnLock.style.color = '';
            }
        };
        
        this.toolbar.appendChild(btnZoomIn);
        this.toolbar.appendChild(btnZoomOut);
        this.toolbar.appendChild(btnResetView);
        this.toolbar.appendChild(btnLock);
        
        this.container.appendChild(this.toolbar);
        
        // Initial fit
        this.fitView();
        
        this.planner = null;
        this.startPos = null;
        this.goalPos = null;
        
        // Resize observer
        new ResizeObserver(() => this.resize()).observe(this.container);
    }
    
    fitView() {
        const rect = this.container.getBoundingClientRect();
        const scale = Math.min(rect.width / this.width, rect.height / this.height) * 0.95;
        const tx = (rect.width - this.width * scale) / 2;
        const ty = (rect.height - this.height * scale) / 2;
        
        const svg = d3.select(this.canvas);
        svg.call(this.zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
    }
    
    resize() {
        // Adjust canvas visual size to container (high DPI support)
        const rect = this.container.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.ctx.scale(dpr, dpr);
        this.canvas.style.width = `${rect.width}px`;
        this.canvas.style.height = `${rect.height}px`;
        this.draw();
    }

    getThemeColors() {
        const styles = getComputedStyle(document.body);
        const getVar = (name, fallback) => styles.getPropertyValue(name).trim() || fallback;

        return {
            bg: getVar('--canvas-bg', '#1e1e1e'),
            grid: getVar('--canvas-grid', '#2d2d30'),
            obstacle: getVar('--canvas-obstacle', '#3f3f46'),
            obstacleBorder: getVar('--canvas-obstacle-border', '#555555'),
            robot: getVar('--accent', '#007acc'),
            start: getVar('--success', '#4caf50'),
            goal: getVar('--danger', '#f44336'),
            treeEdge: getVar('--canvas-tree-edge', 'rgba(200, 200, 200, 0.4)'),
            node: getVar('--canvas-node', '#007acc'),
            sample: getVar('--canvas-sample', 'rgba(255, 152, 0, 0.5)'),
            rejected: getVar('--canvas-rejected', 'rgba(244, 67, 54, 0.2)'),
            path: getVar('--canvas-path', '#ffeb3b'),
            text: getVar('--canvas-text', '#cccccc')
        };
    }

    updateTheme() {
        this.colors = this.getThemeColors();
        this.draw();
    }
    
    setPlanner(planner) {
        this.planner = planner;
    }
    
    draw() {
        const ctx = this.ctx;
        const rect = this.container.getBoundingClientRect();
        
        ctx.save();
        ctx.clearRect(0, 0, rect.width, rect.height);
        ctx.fillStyle = this.colors.bg;
        ctx.fillRect(0, 0, rect.width, rect.height);
        
        // Apply Transform
        ctx.translate(this.transform.x, this.transform.y);
        ctx.scale(this.transform.k, this.transform.k);
        
        this.drawEnvironment();
        
        if (this.planner) {
            this.drawPlanner();
        }
        
        this.drawStartGoal();
        
        ctx.restore();
    }
    
    drawEnvironment() {
        const ctx = this.ctx;
        const rConf = this.config.rendering;
        
        // Grid
        if (rConf.draw_grid) {
            ctx.strokeStyle = this.colors.grid;
            ctx.lineWidth = 1 / this.transform.k;
            ctx.beginPath();
            for (let x = 0; x <= this.width; x += 50) {
                ctx.moveTo(x, 0); ctx.lineTo(x, this.height);
            }
            for (let y = 0; y <= this.height; y += 50) {
                ctx.moveTo(0, y); ctx.lineTo(this.width, y);
            }
            ctx.stroke();
        }
        
        // Boundary
        ctx.strokeStyle = this.colors.obstacleBorder;
        ctx.lineWidth = 2 / this.transform.k;
        ctx.strokeRect(0, 0, this.width, this.height);
        
        // Obstacles
        ctx.fillStyle = this.colors.obstacle;
        for (const c of this.env.circles) {
            ctx.beginPath();
            ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }
        
        for (const r of this.env.rectangles) {
            ctx.fillRect(r.x, r.y, r.w, r.h);
            ctx.strokeRect(r.x, r.y, r.w, r.h);
        }
    }
    
    drawPlanner() {
        const ctx = this.ctx;
        const rConf = this.config.rendering;
        const p = this.planner;
        
        // Rejected edges
        if (rConf.draw_rejected_edges) {
            ctx.strokeStyle = this.colors.rejected;
            ctx.lineWidth = 1 / this.transform.k;
            ctx.beginPath();
            for (const e of p.rejectedEdges) {
                ctx.moveTo(e.from.x, e.from.y);
                ctx.lineTo(e.to.x, e.to.y);
            }
            ctx.stroke();
        }
        
        // Tree edges
        ctx.strokeStyle = this.colors.treeEdge;
        ctx.lineWidth = (rConf.tree_edge_width || 1) / this.transform.k;
        ctx.beginPath();
        for (const e of p.edges) {
            ctx.moveTo(e.from.x, e.from.y);
            ctx.lineTo(e.to.x, e.to.y);
        }
        ctx.stroke();
        
        // Nodes
        if (rConf.draw_nodes) {
            ctx.fillStyle = this.colors.node;
            for (const n of p.nodes) {
                ctx.beginPath();
                ctx.arc(n.x, n.y, (rConf.node_radius || 2) / this.transform.k, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        // Samples
        if (rConf.draw_samples && p.samples.length > 0) {
            ctx.fillStyle = this.colors.sample;
            // Draw last 50 samples
            const len = p.samples.length;
            const start = Math.max(0, len - 50);
            for (let i = start; i < len; i++) {
                const s = p.samples[i];
                ctx.beginPath();
                ctx.arc(s.x, s.y, (rConf.sample_radius || 3) / this.transform.k, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        // Final Path
        if (p.path.length > 0) {
            ctx.strokeStyle = this.colors.path;
            ctx.lineWidth = (rConf.final_path_width || 4) / this.transform.k;
            ctx.beginPath();
            ctx.moveTo(p.path[0].x, p.path[0].y);
            for (let i = 1; i < p.path.length; i++) {
                ctx.lineTo(p.path[i].x, p.path[i].y);
            }
            ctx.stroke();
        }
        
        // Informed Ellipsoid
        if ((p.type === 'irrt_star' || p.type === 'bit_star') && p.firstSolutionFound && p.pathCost < Infinity) {
            const center = {
                x: (p.start.x + p.goal.x) / 2,
                y: (p.start.y + p.goal.y) / 2
            };
            const theta = Math.atan2(p.goal.y - p.start.y, p.goal.x - p.start.x);
            const rx = p.pathCost / 2;
            const ry = Math.sqrt(Math.max(0, p.pathCost * p.pathCost - p.cMin * p.cMin)) / 2;

            ctx.save();
            ctx.translate(center.x, center.y);
            ctx.rotate(theta);
            ctx.beginPath();
            ctx.ellipse(0, 0, rx, ry, 0, 0, 2 * Math.PI);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.lineWidth = 1 / this.transform.k;
            ctx.setLineDash([5 / this.transform.k, 5 / this.transform.k]);
            ctx.stroke();
            ctx.restore();
        }
    }
    
    drawStartGoal() {
        const ctx = this.ctx;
        const radius = this.config.simulation.robot_radius;
        const gRadius = this.config.simulation.goal_radius;
        
        if (this.startPos) {
            ctx.fillStyle = this.colors.start;
            ctx.beginPath();
            ctx.arc(this.startPos.x, this.startPos.y, radius, 0, Math.PI * 2);
            ctx.fill();
        }
        
        if (this.goalPos) {
            ctx.fillStyle = 'rgba(244, 67, 54, 0.3)';
            ctx.beginPath();
            ctx.arc(this.goalPos.x, this.goalPos.y, gRadius, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = this.colors.goal;
            ctx.beginPath();
            ctx.arc(this.goalPos.x, this.goalPos.y, radius, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}
