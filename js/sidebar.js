import { State } from './state.js';
import { defaultConfig } from './config.js';
import { Modal } from './modal.js';

export function setupSidebar() {
    const toggleBtn = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('canvas-overlay');
    const btnRestore = document.getElementById('btn-restore-default');
    const btnConfirm = document.getElementById('btn-confirm-args');

    const setSidebarOpen = (isOpen, options = {}) => {
        sidebar.classList.toggle('open', isOpen);
        const arrow = document.getElementById('sidebar-arrow');
        arrow.style.transform = isOpen ? 'rotate(180deg)' : 'rotate(0deg)';
        overlay.classList.toggle('active', isOpen);

        if (isOpen && options.resetStaging) {
            State.resetStaging();
            renderForm();
        }
    };
    
    toggleBtn.addEventListener('click', () => {
        const shouldOpen = !sidebar.classList.contains('open');
        setSidebarOpen(shouldOpen, { resetStaging: true });
    });
    
    btnRestore.addEventListener('click', () => {
        Modal.show({
            title: 'Restore Default Settings',
            content: 'Are you sure you want to restore all settings to default? Unsaved changes will be lost.',
            buttons: [
                { text: 'Cancel' },
                { 
                    text: 'Restore', 
                    primary: true, 
                    onClick: () => {
                        State.restoreDefault();
                        renderForm();
                    }
                }
            ]
        });
    });
    
    btnConfirm.addEventListener('click', () => {
        State.commitStaging();
        setSidebarOpen(false);
        
        // Trigger re-layout if mode changed
        document.dispatchEvent(new CustomEvent('configChanged'));
    });
}

function renderForm() {
    const container = document.getElementById('config-form');
    container.innerHTML = '';
    
    const config = State.stagedConfig;
    const current = State.currentConfig;
    
    // Helper to detect change
    const isStaged = (path) => {
        const val1 = path.split('.').reduce((o, i) => o[i], config);
        const val2 = path.split('.').reduce((o, i) => o[i], current);
        return val1 !== val2;
    };
    
    const isModified = (path) => {
        const val1 = path.split('.').reduce((o, i) => o[i], config);
        const val2 = path.split('.').reduce((o, i) => o[i], defaultConfig);
        return val1 !== val2;
    };
    
    const setVal = (path, val) => {
        const parts = path.split('.');
        let obj = config;
        for (let i = 0; i < parts.length - 1; i++) obj = obj[parts[i]];
        obj[parts[parts.length - 1]] = val;
        renderForm(); // Re-render to update italics
    };
    
    const createGroup = (title) => {
        const div = document.createElement('div');
        div.className = 'config-group';
        const h = document.createElement('h3');
        h.innerText = title;
        div.appendChild(h);
        container.appendChild(div);
        return div;
    };
    
    const createInput = (parent, label, path, type, min, max, step = null) => {
        const div = document.createElement('div');
        
        let itemClass = 'config-item';
        if (type !== 'select' && type !== 'checkbox') {
            if (isStaged(path)) itemClass += ' staged';
            else if (isModified(path)) itemClass += ' modified';
        }
        div.className = itemClass;
        
        const lbl = document.createElement('label');
        lbl.innerText = label;
        div.appendChild(lbl);
        
        const val = path.split('.').reduce((o, i) => o[i], config);
        
        if (type === 'select') {
            const sel = document.createElement('select');
            sel.className = 'config-input';
            for (const opt of min) { // min acts as options array here
                const o = document.createElement('option');
                o.value = opt.value;
                o.innerText = opt.label;
                if (val === opt.value) o.selected = true;
                sel.appendChild(o);
            }
            sel.addEventListener('change', (e) => setVal(path, isNaN(e.target.value) && e.target.value !== 'true' && e.target.value !== 'false' ? e.target.value : (e.target.value === 'true' ? true : (e.target.value === 'false' ? false : Number(e.target.value)))));
            div.appendChild(sel);
        } else if (type === 'range') {
            const wrap = document.createElement('div');
            wrap.className = 'slider-group';
            
            const autoStep = max <= 1 ? 0.01 : 1;
            const finalStep = step !== null ? step : autoStep;

            const r = document.createElement('input');
            r.type = 'range'; 
            r.step = finalStep;
            r.min = min; 
            r.max = max; 
            r.value = val;
            r.tabIndex = -1;
            
            const n = document.createElement('input');
            n.type = 'number'; 
            n.step = finalStep;
            n.min = min; 
            n.max = max; 
            n.value = val;
            n.className = 'config-input';
            
            r.addEventListener('input', (e) => { n.value = e.target.value; });
            r.addEventListener('change', (e) => { setVal(path, Number(e.target.value)); });
            n.addEventListener('change', (e) => { r.value = e.target.value; setVal(path, Number(e.target.value)); });
            
            wrap.appendChild(r); wrap.appendChild(n);
            div.appendChild(wrap);
        } else if (type === 'checkbox') {
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.checked = val;
            cb.style.cursor = 'pointer';
            cb.addEventListener('change', (e) => setVal(path, e.target.checked));
            
            // Insert checkbox before label
            div.insertBefore(cb, lbl);
            
            lbl.style.display = 'inline-block';
            lbl.style.marginLeft = '8px';
            lbl.style.marginBottom = '0';
            lbl.style.cursor = 'pointer';
            
            // Make label clicks toggle the checkbox
            lbl.addEventListener('click', () => {
                cb.checked = !cb.checked;
                setVal(path, cb.checked);
            });
        } else {
            const inp = document.createElement('input');
            inp.type = type;
            inp.className = 'config-input';
            inp.value = val;
            inp.addEventListener('change', (e) => setVal(path, type==='number' ? Number(e.target.value) : e.target.value));
            div.appendChild(inp);
        }
        
        parent.appendChild(div);
    };
    
    // --- APP ---
    const gApp = createGroup('Application');
    createInput(gApp, 'App Mode', 'app.default_mode', 'select', [{value:'single', label:'Single'}, {value:'compare', label:'Compare'}]);
    
    // --- SIMULATION ---
    const gSim = createGroup('Simulation');
    createInput(gSim, 'Randomize Env Seed', 'app.randomize_env_seed', 'checkbox');
    if (!config.app.randomize_env_seed) {
        createInput(gSim, 'Env Seed', 'simulation.env_seed', 'number');
    }
    createInput(gSim, 'Randomize SMP Seed', 'app.randomize_smp_seed', 'checkbox');
    if (!config.app.randomize_smp_seed) {
        createInput(gSim, 'SMP Seed', 'simulation.smp_seed', 'number');
    }
    createInput(gSim, 'Max Iterations', 'simulation.max_iterations', 'range', 100, 50000);
    createInput(gSim, 'Iters per frame', 'simulation.iterations_per_frame', 'range', 1, 100);
    createInput(gSim, 'Robot Radius', 'simulation.robot_radius', 'range', 1, 20);
    createInput(gSim, 'Goal Radius', 'simulation.goal_radius', 'range', 5, 50);
    
    // --- ENVIRONMENT ---
    const gEnv = createGroup('Environment');
    createInput(gEnv, 'Type', 'environment.default_type', 'select', [{value:'random_forest', label:'Random Forest'}, {value:'maze', label:'Maze'}]);
    
    if (config.environment.default_type === 'random_forest') {
        const gRF = createGroup('Random Forest Settings');
        createInput(gRF, 'Map Width', 'environment.default_width', 'range', 300, 3000, 10);
        createInput(gRF, 'Map Height', 'environment.default_height', 'range', 300, 3000, 10);
        createInput(gRF, 'Circle Count', 'random_forest.circle_count', 'range', 0, 200);
        createInput(gRF, 'Circle Radius Min', 'random_forest.circle_radius_min', 'range', 5, 50);
        createInput(gRF, 'Circle Radius Max', 'random_forest.circle_radius_max', 'range', 5, 100);
        createInput(gRF, 'Rectangle Count', 'random_forest.rectangle_count', 'range', 0, 200);
        createInput(gRF, 'Rectangle Size Min', 'random_forest.rectangle_size_min', 'range', 10, 100);
        createInput(gRF, 'Rectangle Size Max', 'random_forest.rectangle_size_max', 'range', 10, 200);
    } else {
        const gMz = createGroup('Maze Settings');
        createInput(gMz, 'Rows', 'maze.rows', 'range', 5, 50);
        createInput(gMz, 'Cols', 'maze.cols', 'range', 5, 50);
        createInput(gMz, 'Corridor Size', 'maze.corridor_size', 'range', 10, 100);
    }
    
    // --- ALGORITHM ---
    const renderAlgoParams = (group, key, prefix) => {
        const wrapper = document.createElement('div');
        wrapper.style.padding = '10px';
        wrapper.style.marginBottom = '12px';
        wrapper.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
        wrapper.style.borderLeft = '3px solid var(--accent)';
        
        const title = document.createElement('div');
        title.innerText = prefix;
        title.style.fontWeight = 'bold';
        title.style.marginBottom = '10px';
        title.style.color = 'var(--text-primary)';
        wrapper.appendChild(title);

        const algConf = config.algorithms[key];
        if ('step_size' in algConf) createInput(wrapper, `Step Size`, `algorithms.${key}.step_size`, 'range', 5, 100);
        if ('goal_bias' in algConf) createInput(wrapper, `Goal Bias`, `algorithms.${key}.goal_bias`, 'range', 0, 1);
        if ('rewire_radius' in algConf) createInput(wrapper, `Rewire Radius`, `algorithms.${key}.rewire_radius`, 'range', 10, 200);
        if ('batch_size' in algConf) createInput(wrapper, `Batch Size`, `algorithms.${key}.batch_size`, 'range', 10, 500);
        if ('target_cost' in algConf) createInput(wrapper, `Target Cost (0=off)`, `algorithms.${key}.target_cost`, 'range', 0, 5000);
        if ('optimization_iterations' in algConf) createInput(wrapper, `Max Opt Iters`, `algorithms.${key}.optimization_iterations`, 'range', 0, 10000, 100);
        
        group.appendChild(wrapper);
    };

    if (config.app.default_mode === 'single') {
        const gAlg = createGroup('Algorithm (Single Mode)');
        createInput(gAlg, 'Algorithm', 'app.algorithm', 'select', [
            {value:'rrt', label:'RRT'},
            {value:'rrt_star', label:'RRT*'},
            {value:'informed_rrt_star', label:'Informed RRT*'},
            {value:'bit_star', label:'BIT*'}
        ]);
        renderAlgoParams(gAlg, config.app.algorithm, 'Parameters');
    } else {
        const gAlg = createGroup('Algorithms (Compare Mode)');
        renderAlgoParams(gAlg, 'rrt', 'RRT');
        renderAlgoParams(gAlg, 'rrt_star', 'RRT*');
        renderAlgoParams(gAlg, 'informed_rrt_star', 'IRRT*');
        renderAlgoParams(gAlg, 'bit_star', 'BIT*');
    }
    
    // --- RENDERING ---
    const gRen = createGroup('Rendering');
    createInput(gRen, 'Draw Grid', 'rendering.draw_grid', 'checkbox');
    createInput(gRen, 'Draw Samples', 'rendering.draw_samples', 'checkbox');
    createInput(gRen, 'Draw Nodes', 'rendering.draw_nodes', 'checkbox');
    createInput(gRen, 'Draw Rejected Edges', 'rendering.draw_rejected_edges', 'checkbox');
}
