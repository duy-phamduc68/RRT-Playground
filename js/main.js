import { State } from './state.js';
import { setupSidebar } from './sidebar.js';
import { Renderer } from './canvas.js';
import { Environment } from './env.js';
import { RRT } from './algorithms/rrt.js';
import { RRTStar } from './algorithms/rrt_star.js';
import { IRRTStar } from './algorithms/irrt_star.js';
import { BITStar } from './algorithms/bit_star.js';
import { log, updateStatus, updateRunningStat, clearRunningStat } from './stats.js';
import { Modal } from './modal.js';

const algoNames = {
    'rrt': 'RRT',
    'rrt_star': 'RRT*',
    'informed_rrt_star': 'Informed RRT*',
    'bit_star': 'BIT*'
};

let renderers = [];
let animationFrameId = null;
let isPaused = false;
let runStartTime = 0;

function init() {
    setupSidebar();
    
    State.log = log;
    State.updateStatus = updateStatus;
    
    document.addEventListener('configChanged', setupScenario);
    
    document.getElementById('btn-start').addEventListener('click', startSimulation);
    document.getElementById('btn-pause').addEventListener('click', togglePause);
    document.getElementById('btn-reset').addEventListener('click', resetScenario);
    document.getElementById('btn-restart').addEventListener('click', restartPlanners);
    
    document.getElementById('btn-info').addEventListener('click', () => {
        Modal.show({
            title: 'About RRT Playground',
            content: `
                <div style="margin-bottom: 15px;">
                    <p style="margin-bottom: 10px;">This project is an interactive path planning visualizer built to demonstrate the functionality of rapidly-exploring random trees (RRT) and its optimal variants (RRT*, Informed RRT*, BIT*).</p>
                    <p>It supports both single algorithm analysis and side-by-side performance comparisons under various procedurally generated environments.</p>
                </div>
                <div style="text-align: right; margin-top: 20px;">
                    <a href="https://github.com/duy-phamduc68/RRT-Playground" target="_blank" style="color: var(--accent); text-decoration: none; font-weight: bold;">View on GitHub</a>
                </div>
            `,
            buttons: [
                { text: 'Close', primary: true }
            ]
        });
    });
    
    // Sidebar toggle pauses app automatically
    document.getElementById('sidebar-toggle').addEventListener('click', () => {
        if (!isPaused && State.status === 'running') {
            togglePause();
        }
    });
    
    // Resizer logic
    const resizer = document.getElementById('resizer');
    const statsPanel = document.getElementById('stats-panel');
    let isResizing = false;

    resizer.addEventListener('mousedown', (e) => {
        isResizing = true;
        document.body.style.cursor = 'col-resize';
        // Prevent text selection while dragging
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        
        const isColumnLayout = window.matchMedia("(orientation: portrait)").matches;
        
        if (isColumnLayout) {
            // Calculate new height: window height - mouse Y position
            const newHeight = document.body.clientHeight - e.clientY;
            if (newHeight > 200 && newHeight < document.body.clientHeight - 200) {
                statsPanel.style.height = `${newHeight}px`;
                statsPanel.style.width = '100%';
                renderers.forEach(r => r.resize());
            }
        } else {
            // Calculate new width: window width - mouse X position
            const newWidth = document.body.clientWidth - e.clientX;
            if (newWidth > 200 && newWidth < 600) {
                statsPanel.style.width = `${newWidth}px`;
                statsPanel.style.height = '100%';
                renderers.forEach(r => r.resize());
            }
        }
    });

    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            document.body.style.cursor = 'default';
        }
    });
    
    setupScenario();
}

function setupScenario(e) {
    const isReset = (e === true);
    
    const wrapper = document.getElementById('canvas-wrapper');
    wrapper.innerHTML = '';
    renderers = [];
    
    // Randomize seeds if checked, but ONLY on explicit reset or first load
    if (isReset || State.env === null) {
        if (State.stagedConfig.app.randomize_env_seed) {
            const newSeed = Math.floor(Math.random() * 1000000);
            State.currentConfig.simulation.env_seed = newSeed;
            State.stagedConfig.simulation.env_seed = newSeed;
        }
        if (State.stagedConfig.app.randomize_smp_seed) {
            const newSeed = Math.floor(Math.random() * 1000000);
            State.currentConfig.simulation.smp_seed = newSeed;
            State.stagedConfig.simulation.smp_seed = newSeed;
        }
    }
    
    let oldStart = State.startPos;
    let oldGoal = State.goalPos;
    
    if (isReset) {
        oldStart = null;
        oldGoal = null;
    }
    
    // Create Environment
    State.env = new Environment(State.currentConfig);
    State.planners = [];
    clearRunningStat();
    
    if (State.mode === 'single') {
        wrapper.className = 'canvas-wrapper'; // Reset class for single mode
        const cId = 'canvas-single';
        const div = document.createElement('div');
        div.id = cId;
        div.className = 'canvas-cell';
        div.style.width = '100%';
        div.style.height = '100%';
        
        const lbl = document.createElement('div');
        lbl.className = 'canvas-algo-label';
        lbl.innerText = algoNames[State.currentConfig.app.algorithm] || 'RRT';
        div.appendChild(lbl);
        
        wrapper.appendChild(div);
        
        const renderer = new Renderer(cId, State.env, State.currentConfig);
        renderer.labelElement = lbl;
        renderers.push(renderer);
        
        setupCanvasInteractions(renderer, 0);
        
    } else {
        wrapper.className = 'canvas-wrapper compare-grid';
        // 2x2 grid for 4 algorithms
        const algos = ['RRT', 'RRT*', 'IRRT*', 'BIT*']; // Placeholders
        for (let i = 0; i < 4; i++) {
            const cId = `canvas-comp-${i}`;
            const div = document.createElement('div');
            div.id = cId;
            div.className = 'canvas-cell';
            
            // Add label
            const lbl = document.createElement('div');
            lbl.className = 'canvas-algo-label';
            lbl.innerText = algos[i];
            div.appendChild(lbl);
            
            wrapper.appendChild(div);
            
            const renderer = new Renderer(cId, State.env, State.currentConfig);
            renderer.labelElement = lbl;
            renderers.push(renderer);
            
            setupCanvasInteractions(renderer, i);
        }
    }
    
    // Validate and keep start/goal if possible
    let isValid = true;
    const r = State.currentConfig.simulation.robot_radius;
    if (oldStart && !State.env.isPointValid(oldStart, r)) isValid = false;
    if (oldGoal && !State.env.isPointValid(oldGoal, r)) isValid = false;
    
    if (isValid && oldStart && oldGoal) {
        State.startPos = oldStart;
        State.goalPos = oldGoal;
        State.status = 'ready';
        updateStatus('ready');
        renderers.forEach(ren => { ren.startPos = oldStart; ren.goalPos = oldGoal; ren.draw(); });
        log('Scenario updated. Planners ready.');
    } else if (isValid && oldStart) {
        State.startPos = oldStart;
        State.goalPos = null;
        State.status = 'pending';
        updateStatus('pending');
        renderers.forEach(ren => { ren.startPos = oldStart; ren.draw(); });
        log('Scenario generated. Place Goal point on the canvas.');
    } else {
        State.startPos = null;
        State.goalPos = null;
        State.status = 'pending';
        updateStatus('pending');
        log('Scenario generated. Place Start and Goal points on the canvas.');
    }
}

function setupCanvasInteractions(renderer, idx) {
    const canvas = renderer.canvas;
    
    // We only process clicks if pending
    canvas.addEventListener('click', (e) => {
        // Prevent action if middle/right click
        if (e.button !== 0) return;
        
        // If unlocked, clicks are caught by d3-zoom for panning, but we double check here
        if (!renderer.isLocked) return;
        
        if (State.status === 'running') return;
        
        const rect = canvas.getBoundingClientRect();
        const rawX = e.clientX - rect.left;
        const rawY = e.clientY - rect.top;
        
        // Inverse transform to get world coords
        const tx = (rawX - renderer.transform.x) / renderer.transform.k;
        const ty = (rawY - renderer.transform.y) / renderer.transform.k;
        
        const p = {x: tx, y: ty};
        
        if (!State.env.isPointValid(p, State.currentConfig.simulation.robot_radius)) {
            log('Invalid placement (collision detected).', 'error');
            return;
        }
        
        if (State.status === 'ready' || State.status === 'finished') {
            State.startPos = p;
            State.goalPos = null;
            State.planners = [];
            clearRunningStat();
            renderers.forEach(r => { r.setPlanner(null); r.startPos = p; r.goalPos = null; r.draw(); });
            State.status = 'pending';
            updateStatus('pending');
            log(`Start replaced at (${Math.round(tx)}, ${Math.round(ty)}). Place new Goal.`);
            return;
        }
        
        if (!State.startPos) {
            State.startPos = p;
            log(`Start placed at (${Math.round(tx)}, ${Math.round(ty)})`);
            renderers.forEach(r => { r.startPos = p; r.draw(); });
        } else if (!State.goalPos) {
            State.goalPos = p;
            log(`Goal placed at (${Math.round(tx)}, ${Math.round(ty)})`);
            renderers.forEach(r => { r.goalPos = p; r.draw(); });
            
            State.status = 'ready';
            updateStatus('ready');
            log('Ready to Start.', 'success');
        } else {
            // Reset and place start again
            State.startPos = p;
            State.goalPos = null;
            log(`Start placed at (${Math.round(tx)}, ${Math.round(ty)})`);
            renderers.forEach(r => { r.startPos = p; r.goalPos = null; r.draw(); });
            
            State.status = 'pending';
            updateStatus('pending');
        }
    });
}

function startSimulation() {
    if (State.status !== 'ready' && State.status !== 'running') return;
    
    if (State.status === 'ready') {
        restartPlanners();
    }
    
    State.status = 'running';
    updateStatus('running');
    isPaused = false;
    document.getElementById('btn-pause').innerText = 'Pause';
    log('Simulation started.');
    
    // Reset start time if resuming from ready
    if (State.planners.every(p => p.iterations === 0)) {
        runStartTime = performance.now();
    }
    
    runLoop();
}

function restartPlanners() {
    cancelAnimationFrame(animationFrameId);
    clearRunningStat();
    State.planners = [];
    
    const algMap = {
        'rrt': RRT,
        'rrt_star': RRTStar,
        'informed_rrt_star': IRRTStar,
        'bit_star': BITStar
    };
    
    // Instantiating planners
    if (State.mode === 'single') {
        const AlgClass = algMap[State.currentConfig.app.algorithm] || RRT;
        const p = new AlgClass(State.env, State.startPos, State.goalPos, State.currentConfig);
        State.planners.push(p);
        renderers[0].setPlanner(p);
    } else {
        // Compare mode - instantiate all 4 algorithms
        const PlannerClasses = [RRT, RRTStar, IRRTStar, BITStar];
        for (let i = 0; i < 4; i++) {
            const p = new PlannerClasses[i](State.env, State.startPos, State.goalPos, State.currentConfig);
            State.planners.push(p);
            renderers[i].setPlanner(p);
        }
    }
    
    renderers.forEach(r => {
        r.draw();
        if (r.labelElement) r.labelElement.style.color = '#fff';
    });
    State.status = 'ready';
    updateStatus('ready');
    log('Planners reset.');
}

function resetScenario() {
    cancelAnimationFrame(animationFrameId);
    setupScenario(true);
}

function togglePause() {
    isPaused = !isPaused;
    const btn = document.getElementById('btn-pause');
    btn.innerText = isPaused ? 'Resume' : 'Pause';
    log(isPaused ? 'Simulation paused.' : 'Simulation resumed.');
    if (!isPaused) {
        runLoop();
    }
}

function runLoop() {
    if (isPaused || State.status !== 'running') return;
    
    const itersPerFrame = State.currentConfig.simulation.iterations_per_frame;
    let allFinished = true;
    
    for (const p of State.planners) {
        if (!p.finished) {
            allFinished = false;
            for (let i = 0; i < itersPerFrame; i++) {
                const wasFound = p.firstSolutionFound;
                p.step();
                
                if (!wasFound && p.firstSolutionFound) {
                    if (p.algConfig && p.algConfig.optimize_after_first_solution) {
                        const vCount = p.nodes.length;
                        const eCount = p.edges ? p.edges.length : Math.max(0, vCount - 1);
                        log(`[${p.type.toUpperCase()}] Initial path found at iteration ${p.iterations} (Cost: ${p.pathCost.toFixed(2)}, V: ${vCount}, E: ${eCount}). Optimizing...`, 'info-blue');
                        const r = renderers.find(ren => ren.planner === p);
                        if (r && r.labelElement) r.labelElement.style.color = 'var(--accent)';
                    }
                }
                
                if (p.finished) {
                    const elapsedSecs = ((performance.now() - runStartTime) / 1000).toFixed(3);
                    const vCount = p.nodes.length;
                    const eCount = p.edges ? p.edges.length : Math.max(0, vCount - 1);
                    if (p.firstSolutionFound) {
                        log(`[${p.type.toUpperCase()}] Finished! Final Cost: ${p.pathCost.toFixed(2)} in ${p.iterations} iters, Time: ${elapsedSecs}s (V: ${vCount}, E: ${eCount})`, 'success');
                        const r = renderers.find(ren => ren.planner === p);
                        if (r && r.labelElement) r.labelElement.style.color = 'var(--success)';
                    } else {
                        log(`[${p.type.toUpperCase()}] Finished without solution. Time: ${elapsedSecs}s (V: ${vCount}, E: ${eCount})`, 'error');
                        const r = renderers.find(ren => ren.planner === p);
                        if (r && r.labelElement) r.labelElement.style.color = 'var(--danger)';
                    }
                    break;
                }
            }
        }
    }
    
    renderers.forEach(r => r.draw());
    
    if (!allFinished) {
        const elapsedSecs = ((performance.now() - runStartTime) / 1000).toFixed(3);
        const statsStr = State.planners.map(p => `${p.type.toUpperCase()}: ${p.iterations} iters`).join(' | ');
        updateRunningStat(`T=${elapsedSecs}s | ${statsStr}`);
        animationFrameId = requestAnimationFrame(runLoop);
    } else {
        clearRunningStat();
        State.status = 'finished';
        updateStatus('finished');
        log('All planners finished.');
    }
}

// Start
document.addEventListener('DOMContentLoaded', init);
