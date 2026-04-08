'use strict';
(function(){
const $=s=>document.querySelector(s);
let ctx = null;

function initAudio() {
    if(!ctx) {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if(ctx.state === 'suspended') ctx.resume();
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
    gain.connect(ctx.destination);
    gain.gain.value = masterVol;

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

if(typeof QU!=='undefined')QU.init({kofi:true,discover:true});
})();
