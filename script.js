const canvas = document.getElementById('scopeCanvas');
const ctx = canvas.getContext('2d');

let mode = 'all';
let currentStimulus = 50;

function setMode(newMode) {
    mode = newMode;
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('btn-' + newMode).classList.add('active');
    updateInfo();
    redraw();
}

function updateStimulus(val) {
    currentStimulus = parseInt(val);
    document.getElementById('stimValue').innerText = val + ' mA';
    const typeSpan = document.getElementById('stimType');
    
    if (currentStimulus < 20) {
        typeSpan.innerText = "Subthreshold / Threshold";
        typeSpan.style.color = "#8b949e";
    } else if (currentStimulus < 45) {
        typeSpan.innerText = "Submaximal (Ideal for H-reflex)";
        typeSpan.style.color = "#58a6ff";
    } else {
        typeSpan.innerText = "Supramaximal (Blocks H, activates F)";
        typeSpan.style.color = "#bc8cff";
    }
    updateInfo();
    redraw();
}

function updateInfo() {
    const box = document.getElementById('infoText');
    const alerts = document.getElementById('clinical-alert');
    
    if (mode === 'm') {
        box.innerHTML = `<strong>M Wave (Direct Motor Response):</strong><br>Direct depolarization of motor axons. High amplitude, shortest latency. Constant morphology across sweeps.`;
    } else if (mode === 'f') {
        box.innerHTML = `<strong>F Wave (Recurrent Backfire):</strong><br>Antidromic impulse ascends to anterior horn cells. 1-5% backfire. Requires <strong>supramaximal</strong> stimulus. High variability in latency and shape.`;
    } else if (mode === 'h') {
        box.innerHTML = `<strong>H Reflex (Monosynaptic Arc):</strong><br>Sensory afferents → anterior horn cell → motor axon. Appears at submaximal intensity; extinguished by antidromic collision at supramaximal levels.`;
    } else if (mode === 'a') {
        box.innerHTML = `<strong>A Wave (Axon Reflex / Sprout):</strong><br>Seen in chronic reinnervation. Impulse turns down another branch. Constant morphology and latency. Precedes F waves.`;
    } else {
        box.innerHTML = `<strong>Comparative Overview:</strong><br>Observe the H-reflex recruitment curve. At 25-35mA, H-reflex peaks. At >50mA, antidromic collision removes H, revealing variable F waves.`;
    }

    // Update alert banner
    if (currentStimulus > 45 && (mode === 'all' || mode === 'h')) {
        alerts.innerText = "⚠️ H-Reflex Extinguished: Antidromic Collision Block";
        alerts.style.display = "block";
    } else if (currentStimulus <= 45 && currentStimulus >= 20 && (mode === 'all' || mode === 'h')) {
        alerts.innerText = "✓ H-Reflex Active: Submaximal Recruitment";
        alerts.style.display = "block";
        alerts.style.color = "var(--accent-success)";
        alerts.style.borderColor = "rgba(63, 185, 80, 0.2)";
        alerts.style.background = "rgba(63, 185, 80, 0.1)";
    } else {
        alerts.style.display = "none";
    }
}

function getTrace(timeMs, sweepIndex, stim, highGain) {
    let signal = 0;

    // Stimulus artifact
    if (timeMs >= 0 && timeMs <= 1.5) {
        signal += Math.sin((timeMs / 1.5) * Math.PI) * 1.5;
    }

    // M-WAVE (3 to 8 ms)
    if (mode === 'all' || mode === 'm') {
        const mMax = 12.0;
        const mAmp = mMax * Math.min(1.0, Math.max(0, (stim - 10) / 35));
        if (timeMs >= 3.0 && timeMs <= 8.5) {
            const tNorm = (timeMs - 3.0) / 5.5;
            const mWave = Math.sin(tNorm * Math.PI * 2) * mAmp;
            signal += highGain ? mWave * 0.12 : mWave;
        }
    }

    // A-WAVE (18 to 22 ms)
    const hasA = document.getElementById('aWaveActive').checked;
    if ((mode === 'all' || mode === 'a') && hasA && stim > 20) {
        const aAmp = 0.35 * (highGain ? 4.5 : 0.4);
        if (timeMs >= 18.0 && timeMs <= 22.0) {
            const tNorm = (timeMs - 18.0) / 4.0;
            signal += (Math.sin(tNorm * Math.PI * 2) - 0.2 * Math.sin(tNorm * Math.PI * 4)) * aAmp;
        }
    }

    // H-REFLEX (30 to 36 ms)
    const hasH = document.getElementById('hReflexActive').checked;
    if ((mode === 'all' || mode === 'h') && hasH) {
        let hAmp = 0;
        if (stim >= 15 && stim <= 45) {
            hAmp = 6.0 * Math.sin(((stim - 15) / 30) * Math.PI);
        } else if (stim > 45 && stim <= 60) {
            hAmp = 6.0 * (1 - (stim - 45) / 15);
        }
        if (timeMs >= 30.0 && timeMs <= 36.0) {
            const tNorm = (timeMs - 30.0) / 6.0;
            const hWave = Math.sin(tNorm * Math.PI * 2) * hAmp;
            signal += highGain ? hWave * 0.2 : hWave;
        }
    }

    // F-WAVE (38 to 52 ms)
    if ((mode === 'all' || mode === 'f') && stim >= 45) {
        const pseudoRand = Math.sin(sweepIndex * 12.9898 + 78.233);
        const varLatency = 38.0 + (pseudoRand * 3.5 + 3.5);
        const varAmp = (0.2 + 0.3 * Math.abs(pseudoRand)) * (highGain ? 4.5 : 0.4);
        const varPhase = (pseudoRand > 0 ? 1 : -1);

        if (timeMs >= varLatency && timeMs <= varLatency + 6.0) {
            const tNorm = (timeMs - varLatency) / 6.0;
            signal += Math.sin(tNorm * Math.PI * 2 * (1 + Math.abs(pseudoRand) * 0.5)) * varAmp * varPhase;
        }
    }

    return signal;
}

function redraw() {
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Background
    ctx.fillStyle = "#05080c";
    ctx.fillRect(0, 0, w, h);
    
    // Grid
    ctx.strokeStyle = "#16202c";
    ctx.lineWidth = 1;
    const xDivs = 12; 
    const yDivs = 8;
    for (let i = 0; i <= xDivs; i++) {
        const x = (w / xDivs) * i;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
    }
    for (let j = 0; j <= yDivs; j++) {
        const y = (h / yDivs) * j;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
    }

    // Time labels
    ctx.fillStyle = "#484f58";
    ctx.font = "12px monospace";
    for (let i = 0; i <= xDivs; i++) {
        const ms = i * 5;
        ctx.fillText(ms + " ms", (w / xDivs) * i + 4, h - 12);
    }

    const isRaster = document.getElementById('rasterToggle').checked;
    const highGain = document.getElementById('gainToggle').checked;
    const numSweeps = isRaster ? 10 : 1;

    for (let s = 0; s < numSweeps; s++) {
        const baselineY = isRaster ? 60 + s * ((h - 120) / (numSweeps - 1)) : h / 2;

        ctx.beginPath();
        ctx.lineWidth = isRaster ? 1.2 : 2.5;

        if (isRaster) {
            ctx.strokeStyle = `hsla(${200 + s * 15}, 70%, 60%, ${0.8 - s * 0.05})`;
        } else {
            ctx.strokeStyle = "#58a6ff";
        }

        const steps = 800;
        for (let i = 0; i <= steps; i++) {
            const timeMs = (i / steps) * 60.0;
            const x = (timeMs / 60.0) * w;
            const val = getTrace(timeMs, s, currentStimulus, highGain);
            const y = baselineY - val * (h / 24);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();

        if (isRaster) {
            ctx.fillStyle = "#484f58";
            ctx.font = "10px monospace";
            ctx.fillText(`Sweep ${s+1}`, 10, baselineY - 5);
        }
    }
}

// Initial setup
updateInfo();
redraw();
window.addEventListener('resize', redraw);
