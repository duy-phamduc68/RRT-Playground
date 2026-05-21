export function log(msg, type='info') {
    const term = document.getElementById('terminal-output');
    const line = document.createElement('div');
    line.className = `log-line ${type}`;
    
    const timestamp = new Date().toLocaleTimeString();
    line.innerText = `[${timestamp}] ${msg}`;
    
    term.appendChild(line);
    term.scrollTop = term.scrollHeight;
}

let runningStatLine = null;

export function updateRunningStat(msg) {
    const term = document.getElementById('terminal-output');
    if (!runningStatLine) {
        runningStatLine = document.createElement('div');
        runningStatLine.className = 'log-line warning'; // Different color for running stat
        term.appendChild(runningStatLine);
    }
    const timestamp = new Date().toLocaleTimeString();
    runningStatLine.innerText = `[${timestamp}] RUNNING: ${msg}`;
    term.scrollTop = term.scrollHeight;
}

export function clearRunningStat() {
    runningStatLine = null;
}

export function updateStatus(status) {
    const badge = document.getElementById('scenario-status');
    badge.className = `status-badge ${status}`;
    badge.innerText = status.charAt(0).toUpperCase() + status.slice(1);
    
    const btnReset = document.getElementById('btn-reset');
    const btnPause = document.getElementById('btn-pause');
    const btnStart = document.getElementById('btn-start');
    const btnRestart = document.getElementById('btn-restart');
    
    btnReset.disabled = false;
    btnPause.disabled = true;
    btnStart.disabled = true;
    btnRestart.classList.add('hidden');
    
    if (status === 'ready') {
        btnStart.disabled = false;
    } else if (status === 'running') {
        btnPause.disabled = false;
        btnRestart.classList.remove('hidden');
    } else if (status === 'finished') {
        btnRestart.classList.remove('hidden');
    }
}
