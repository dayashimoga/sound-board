'use strict';
(function(){
const $=s=>document.querySelector(s);
let ctx = null;

let eqBass, eqMid, eqTreble, convolver, convolverGain, dryGain;
let destNode; 
let mediaRecorder;
let recordedChunks = [];

function initAudio() {
    if(!ctx) {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        
        eqBass = ctx.createBiquadFilter();
        eqBass.type = 'lowshelf';
        eqBass.frequency.value = 250;
        
        eqMid = ctx.createBiquadFilter();
        eqMid.type = 'peaking';
        eqMid.frequency.value = 1000;
        eqMid.Q.value = 1;
        
        eqTreble = ctx.createBiquadFilter();
        eqTreble.type = 'highshelf';
        eqTreble.frequency.value = 4000;
        
        // Reverb (Convolver)
        convolver = ctx.createConvolver();
        const length = ctx.sampleRate * 2;
        const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
        for (let i = 0; i < 2; i++) {
            const channel = impulse.getChannelData(i);
            for (let j = 0; j < length; j++) {
                channel[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / length, 3);
            }
        }
        convolver.buffer = impulse;
        
        convolverGain = ctx.createGain();
        convolverGain.gain.value = 0;
        
        dryGain = ctx.createGain();
        dryGain.gain.value = 1;
        
        eqBass.connect(eqMid);
        eqMid.connect(eqTreble);
        
        eqTreble.connect(dryGain);
        eqTreble.connect(convolver);
        convolver.connect(convolverGain);
        
        dryGain.connect(ctx.destination);
        convolverGain.connect(ctx.destination);
        
        destNode = ctx.createMediaStreamDestination();
        dryGain.connect(destNode);
        convolverGain.connect(destNode);

        // Spectrum Analyser
        analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        dryGain.connect(analyser);
        convolverGain.connect(analyser);
        startSpectrumLoop();
    }
    if(ctx.state === 'suspended') ctx.resume();
}

let analyser = null;
let specAnimId = null;
function startSpectrumLoop() {
    const canvas = document.getElementById('spectrumCanvas');
    if (!canvas || !analyser) return;
    const specCtx = canvas.getContext('2d');
    const bufLen = analyser.frequencyBinCount;
    const dataArr = new Uint8Array(bufLen);

    function draw() {
        specAnimId = requestAnimationFrame(draw);
        analyser.getByteFrequencyData(dataArr);

        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        specCtx.scale(dpr, dpr);
        const w = rect.width, h = rect.height;

        specCtx.clearRect(0, 0, w, h);
        const barW = (w / bufLen) * 2.5;
        let x = 0;
        for (let i = 0; i < bufLen; i++) {
            const barH = (dataArr[i] / 255) * h;
            const hue = (i / bufLen) * 280 + 120;
            specCtx.fillStyle = `hsla(${hue}, 80%, 55%, 0.8)`;
            specCtx.fillRect(x, h - barH, barW - 1, barH);
            x += barW;
            if (x > w) break;
        }
    }
    draw();
}

let masterVol = 0.5;
let basePitch = 440;

$('#masterVol').addEventListener('input', e=>{ masterVol = parseInt(e.target.value)/100; $('#volVal').textContent=e.target.value; });
$('#masterPitch').addEventListener('input', e=>{ basePitch = parseInt(e.target.value); $('#pitchVal').textContent=e.target.value; });

function playSound(type) {
    initAudio();
    const t = ctx.currentTime;
    
    // Create master gain for this sound
    const gain = ctx.createGain();
    gain.connect(eqBass);
    // Envelope will apply masterVol


    if(type === 'kick') {
        const osc = ctx.createOscillator();
        osc.connect(gain);
        osc.frequency.setValueAtTime(150, t);
        osc.frequency.exponentialRampToValueAtTime(0.01, t + 0.5);
        gain.gain.setValueAtTime(masterVol, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);
        osc.start(t);
        osc.stop(t + 0.5);
    } 
    else if(type === 'snare') {
        // Noise buffer
        const bufferSize = ctx.sampleRate * 0.2;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const noiseFilter = ctx.createBiquadFilter();
        noiseFilter.type = 'highpass';
        noiseFilter.frequency.value = 1000;
        noise.connect(noiseFilter);
        noiseFilter.connect(gain);
        gain.gain.setValueAtTime(masterVol, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
        noise.start(t);
        
        // Tone
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.connect(gain);
        osc.frequency.setValueAtTime(100, t);
        osc.start(t);
        osc.stop(t + 0.2);
    }
    else if(type === 'hihat') {
        const bufferSize = ctx.sampleRate * 0.05;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const bandpass = ctx.createBiquadFilter();
        bandpass.type = 'bandpass';
        bandpass.frequency.value = 10000;
        noise.connect(bandpass);
        bandpass.connect(gain);
        gain.gain.setValueAtTime(masterVol * 0.5, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
        noise.start(t);
    }
    else if(type === 'laser') {
        const osc = ctx.createOscillator();
        osc.type = 'square';
        osc.connect(gain);
        osc.frequency.setValueAtTime(800, t);
        osc.frequency.exponentialRampToValueAtTime(10, t + 0.3);
        gain.gain.setValueAtTime(masterVol * 0.5, t);
        gain.gain.linearRampToValueAtTime(0, t + 0.3);
        osc.start(t);
        osc.stop(t + 0.3);
    }
    else if(type === 'jump') {
        const osc = ctx.createOscillator();
        osc.type = 'square';
        osc.connect(gain);
        osc.frequency.setValueAtTime(300, t);
        osc.frequency.linearRampToValueAtTime(600, t + 0.1);
        gain.gain.setValueAtTime(masterVol * 0.5, t);
        gain.gain.linearRampToValueAtTime(0, t + 0.15);
        osc.start(t);
        osc.stop(t + 0.15);
    }
    else if(type === 'coin') {
        const osc = ctx.createOscillator();
        osc.type = 'square';
        osc.connect(gain);
        osc.frequency.setValueAtTime(980, t);
        osc.frequency.setValueAtTime(1250, t + 0.1);
        gain.gain.setValueAtTime(masterVol * 0.5, t);
        gain.gain.linearRampToValueAtTime(0, t + 0.4);
        osc.start(t);
        osc.stop(t + 0.4);
    }
    else if(type === 'explosion') {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(100, t);
        osc.frequency.exponentialRampToValueAtTime(0.01, t + 1);
        const dist = ctx.createWaveShaper();
        const curve = new Float32Array(44100);
        for(let i=0; i<44100; i++) {
            const x = i * 2 / 44100 - 1;
            curve[i] = (3 + 20) * x * 20 * (Math.PI / 180) / (Math.PI + 20 * Math.abs(x));
        }
        dist.curve = curve;
        dist.oversample = '4x';
        osc.connect(dist);
        dist.connect(gain);
        gain.gain.setValueAtTime(masterVol, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 1);
        osc.start(t);
        osc.stop(t + 1);
    }
    else if(type === 'powerup') {
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.connect(gain);
        osc.frequency.setValueAtTime(300, t);
        for (let i = 0; i < 10; i++) {
            osc.frequency.setValueAtTime(300 + i*50, t + i*0.05);
        }
        gain.gain.setValueAtTime(masterVol * 0.3, t);
        gain.gain.linearRampToValueAtTime(0, t + 0.5);
        osc.start(t);
        osc.stop(t + 0.5);
    }
    else if(type === 'blip') {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.connect(gain);
        osc.frequency.setValueAtTime(basePitch, t);
        gain.gain.setValueAtTime(masterVol, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
        osc.start(t);
        osc.stop(t + 0.1);
    }
    else if(type === 'chord') {
        [0, 4, 7].forEach(semi => {
            const osc = ctx.createOscillator();
            osc.type = 'sawtooth';
            osc.connect(gain);
            osc.frequency.value = basePitch * Math.pow(2, semi/12);
            gain.gain.setValueAtTime(masterVol/3, t);
            gain.gain.linearRampToValueAtTime(0, t + 0.5);
            osc.start(t);
            osc.stop(t + 0.5);
        });
    }
    else if(type === 'sweep') {
        const osc = ctx.createOscillator();
        osc.connect(gain);
        osc.frequency.setValueAtTime(basePitch/2, t);
        osc.frequency.exponentialRampToValueAtTime(basePitch*2, t + 1);
        gain.gain.setValueAtTime(0.01, t);
        gain.gain.linearRampToValueAtTime(masterVol, t + 0.5);
        gain.gain.linearRampToValueAtTime(0.01, t + 1);
        osc.start(t);
        osc.stop(t + 1);
    }
    else if(type === 'wobble') {
        const osc = ctx.createOscillator();
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        osc.type = 'square';
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        
        lfo.frequency.value = 8; // 8Hz wobble
        lfo.connect(lfoGain);
        lfoGain.gain.value = 800; // filter sweep range
        lfoGain.connect(filter.frequency);
        filter.frequency.value = 400; // base filter freq
        
        osc.connect(filter);
        filter.connect(gain);
        
        osc.frequency.value = basePitch/4; // sub bass
        
        gain.gain.setValueAtTime(masterVol, t);
        gain.gain.linearRampToValueAtTime(0, t + 1.5);
        
        lfo.start(t);
        osc.start(t);
        lfo.stop(t + 1.5);
        osc.stop(t + 1.5);
    }
}

document.querySelectorAll('.pad').forEach(p => {
    // Both touch and mousedown for immediate response
    const trigger = e => { e.preventDefault(); if(e.type==='touchstart' || e.button===0) { playSound(p.dataset.type); p.classList.add('active'); setTimeout(()=>p.classList.remove('active'), 100); } };
    p.addEventListener('mousedown', trigger);
    p.addEventListener('touchstart', trigger, {passive: false});
});

// Keyboard mapping
const keyMap = { '1':'kick', '2':'snare', '3':'hihat', 'q':'laser', 'w':'jump', 'e':'coin', 'a':'explosion', 's':'powerup', 'd':'blip', 'z':'chord', 'x':'sweep', 'c':'wobble'};
window.addEventListener('keydown', e=>{
    if(e.repeat)return;
    const type = keyMap[e.key.toLowerCase()];
    if(type) {
        const el = document.querySelector(`.pad[data-type="${type}"]`);
        if(el) { playSound(type); el.classList.add('active'); setTimeout(()=>el.classList.remove('active'),100); }
    }
});

// --- EQ and Reverb Controls ---
$('#eqBass')?.addEventListener('input', e=>{ if(eqBass) eqBass.gain.value = parseInt(e.target.value); $('#bassVal').textContent=e.target.value; });
$('#eqMid')?.addEventListener('input', e=>{ if(eqMid) eqMid.gain.value = parseInt(e.target.value); $('#midVal').textContent=e.target.value; });
$('#eqTreble')?.addEventListener('input', e=>{ if(eqTreble) eqTreble.gain.value = parseInt(e.target.value); $('#trebleVal').textContent=e.target.value; });
$('#reverbMix')?.addEventListener('input', e=>{ 
    const mix = parseInt(e.target.value)/100; 
    if(convolverGain) convolverGain.gain.value = mix; 
    if(dryGain) dryGain.gain.value = 1 - mix*0.5;
    $('#reverbVal').textContent=e.target.value; 
});

// --- Live Recording ---
$('#btnRecord')?.addEventListener('click', () => {
    initAudio();
    recordedChunks = [];
    mediaRecorder = new MediaRecorder(destNode.stream);
    mediaRecorder.ondataavailable = e => { if (e.data.size > 0) recordedChunks.push(e.data); };
    mediaRecorder.start();
    $('#btnRecord').disabled = true;
    $('#btnRecord').classList.add('recording');
    $('#btnStopRec').disabled = false;
    $('#btnDownloadRec').disabled = true;
    $('#btnRecord').textContent = 'Recording...';
});

$('#btnStopRec')?.addEventListener('click', () => {
    if(mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        $('#btnRecord').disabled = false;
        $('#btnRecord').classList.remove('recording');
        $('#btnStopRec').disabled = true;
        $('#btnDownloadRec').disabled = false;
        $('#btnRecord').textContent = '🔴 Record';
    }
});

$('#btnDownloadRec')?.addEventListener('click', () => {
    if(recordedChunks.length === 0) return;
    const blob = new Blob(recordedChunks, { type: 'audio/webm' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'soundboard_recording.webm';
    a.click();
    URL.revokeObjectURL(url);
});

// --- Sequencer ---
const seqTracks = ['kick', 'snare', 'hihat', 'blip'];
let seqStep = 0;
let seqInterval = null;

function renderSequencer() {
    const grid = $('#sequencerGrid');
    if(!grid) return;
    let html = `<div></div>`;
    for(let i=0; i<16; i++) html += `<div style="text-align:center; color:#aaa; font-size:0.75rem;">${i+1}</div>`;
    
    seqTracks.forEach(t => {
        html += `<div class="seq-row-label">${t.toUpperCase()}</div>`;
        for(let i=0; i<16; i++) {
            html += `<div class="seq-cell" data-track="${t}" data-step="${i}"></div>`;
        }
    });
    grid.innerHTML = html;

    document.querySelectorAll('.seq-cell').forEach(cell => {
        cell.addEventListener('click', () => {
            cell.classList.toggle('active');
        });
    });
}
renderSequencer();

function stepSequencer() {
    document.querySelectorAll('.seq-cell.playing').forEach(e => e.classList.remove('playing'));
    
    seqTracks.forEach(t => {
        const cell = document.querySelector(`.seq-cell[data-track="${t}"][data-step="${seqStep}"]`);
        if(cell) {
            cell.classList.add('playing');
            if(cell.classList.contains('active')) {
                playSound(t);
            }
        }
    });
    seqStep = (seqStep + 1) % 16;
}

$('#btnSeqPlay')?.addEventListener('click', () => {
    if(seqInterval) clearInterval(seqInterval);
    const bpm = parseInt($('#seqBpm').value);
    const msPer16th = (60000 / bpm) / 4;
    seqStep = 0;
    seqInterval = setInterval(stepSequencer, msPer16th);
});

$('#btnSeqStop')?.addEventListener('click', () => {
    if(seqInterval) clearInterval(seqInterval);
    seqInterval = null;
    seqStep = 0;
});

$('#seqBpm')?.addEventListener('input', e => {
    $('#bpmVal').textContent = e.target.value;
    if(seqInterval) {
        $('#btnSeqPlay').click(); // restart
    }
});

if(typeof QU!=='undefined')QU.init({kofi:true,discover:true});
})();
