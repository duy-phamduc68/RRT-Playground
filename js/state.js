import { defaultConfig } from './config.js';

export const State = {
    currentConfig: JSON.parse(JSON.stringify(defaultConfig)),
    stagedConfig: JSON.parse(JSON.stringify(defaultConfig)),
    
    // Scenario state: 'pending', 'ready', 'running', 'finished'
    status: 'pending',
    
    // In continuous coordinate space
    startPos: null,
    goalPos: null,
    
    // Mode: 'single' | 'compare'
    mode: defaultConfig.app.default_mode,
    
    // Array of active planners
    planners: [],
    
    // Current Environment
    env: null,
    
    // References to UI handlers
    log: null,
    updateStatus: null,
    
    resetStaging() {
        this.stagedConfig = JSON.parse(JSON.stringify(this.currentConfig));
    },
    
    commitStaging() {
        this.currentConfig = JSON.parse(JSON.stringify(this.stagedConfig));
        this.mode = this.currentConfig.app.default_mode;
    },
    
    restoreDefault() {
        this.stagedConfig = JSON.parse(JSON.stringify(defaultConfig));
    }
};
