import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Music, CloudRain, Flame, HelpCircle } from 'lucide-react';

export default function AudioAmbience() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [droneVolume, setDroneVolume] = useState(0.4);
  const [rainVolume, setRainVolume] = useState(0.05);
  const [crackleVolume, setCrackleVolume] = useState(0.0);
  const [activePreset, setActivePreset] = useState<'none' | 'void' | 'rainy' | 'fireplace'>('none');

  // Web Audio Context refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  
  // Drone Synth Nodes
  const droneGainsRef = useRef<GainNode[]>([]);
  const droneOscsRef = useRef<OscillatorNode[]>([]);
  const droneMasterGainRef = useRef<GainNode | null>(null);

  // Rain Synth Nodes
  const rainNoiseNodeRef = useRef<AudioWorkletNode | ScriptProcessorNode | null>(null);
  const rainGainRef = useRef<GainNode | null>(null);
  
  // Crackle Synth Nodes
  const crackleNoiseNodeRef = useRef<AudioWorkletNode | ScriptProcessorNode | null>(null);
  const crackleGainRef = useRef<GainNode | null>(null);

  // Initialize Audio Context on user gesture
  const initAudio = () => {
    if (!audioCtxRef.current) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      audioCtxRef.current = new AudioContextClass();
    }
    
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  };

  // 1. Build Drone Synthesizer (The Muted Void Pad)
  // Plays a beautiful, lush, low-frequency minor chord progression
  const startDrone = (ctx: AudioContext) => {
    stopDrone();

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(droneVolume * 0.3, ctx.currentTime);
    
    // Low pass filter to make it "muted" and warm
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(320, ctx.currentTime);
    filter.Q.setValueAtTime(1.5, ctx.currentTime);

    // Minor Chord Frequencies (C2, G2, C3, Eb3, Bb3)
    const freqs = [65.41, 98.00, 130.81, 155.56, 233.08];
    const oscs: OscillatorNode[] = [];
    const gains: GainNode[] = [];

    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      // Mix triangle and sine waves for a warm brassy/woodwind ambient pad
      osc.type = idx % 2 === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      // Micro-detune to create lush chorusing effect
      osc.detune.setValueAtTime((Math.random() - 0.5) * 15, ctx.currentTime);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.15, ctx.currentTime);

      // Slow LFO to modulate volume of individual notes (creates movement)
      const lfo = ctx.createOscillator();
      lfo.frequency.setValueAtTime(0.05 + idx * 0.02, ctx.currentTime);
      const lfoGain = ctx.createGain();
      lfoGain.gain.setValueAtTime(0.08, ctx.currentTime);

      lfo.connect(lfoGain);
      lfoGain.connect(gain.gain);
      lfo.start();

      // Connect nodes
      osc.connect(gain);
      gain.connect(filter);

      oscs.push(osc);
      gains.push(gain);
      
      osc.start();
    });

    filter.connect(masterGain);
    masterGain.connect(ctx.destination);

    droneOscsRef.current = oscs;
    droneGainsRef.current = gains;
    droneMasterGainRef.current = masterGain;
  };

  const stopDrone = () => {
    droneOscsRef.current.forEach(o => { try { o.stop(); } catch(e){} });
    droneOscsRef.current = [];
    droneGainsRef.current = [];
    droneMasterGainRef.current = null;
  };

  // 2. Build Rain Noise Generator (Procedural synthesis)
  const startRain = (ctx: AudioContext) => {
    stopRain();

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(rainVolume * 0.5, ctx.currentTime);

    // Bandpass filter to sculpt rain sound
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1000, ctx.currentTime);
    filter.Q.setValueAtTime(1.0, ctx.currentTime);

    const bufferSize = 2 * ctx.sampleRate;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    // Pink/Brown noise approximation for deep rain rumble
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = output[i];
      output[i] *= 3.5; // Amplify pink noise
    }

    const rainSource = ctx.createBufferSource();
    rainSource.buffer = noiseBuffer;
    rainSource.loop = true;

    // Connect rain
    rainSource.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    rainSource.start();
    
    // Store reference (hijack ScriptProcessor ref for simpler Source cleanup)
    rainNoiseNodeRef.current = rainSource as any;
    rainGainRef.current = gainNode;
  };

  const stopRain = () => {
    if (rainNoiseNodeRef.current) {
      try { (rainNoiseNodeRef.current as any).stop(); } catch(e){}
      rainNoiseNodeRef.current = null;
    }
    rainGainRef.current = null;
  };

  // 3. Build Fireplace Crackle Synthesizer
  const startCrackle = (ctx: AudioContext) => {
    stopCrackle();

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(crackleVolume * 0.4, ctx.currentTime);

    // Fireplace consists of low-frequency rumble (brownian noise) and sporadic sharp pops
    const bufferSize = ctx.sampleRate * 2;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      const rand = Math.random();
      // Generate very short, high-frequency impulses randomly (pops)
      if (rand > 0.9997) {
        output[i] = (Math.random() * 2 - 1) * 0.8;
      } else {
        output[i] = (Math.random() * 2 - 1) * 0.01; // subtle background hiss
      }
    }

    const crackleSource = ctx.createBufferSource();
    crackleSource.buffer = noiseBuffer;
    crackleSource.loop = true;

    // Filter to make pops sound like cracking timber
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(800, ctx.currentTime);

    crackleSource.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    crackleSource.start();

    crackleNoiseNodeRef.current = crackleSource as any;
    crackleGainRef.current = gainNode;
  };

  const stopCrackle = () => {
    if (crackleNoiseNodeRef.current) {
      try { (crackleNoiseNodeRef.current as any).stop(); } catch(e){}
      crackleNoiseNodeRef.current = null;
    }
    crackleGainRef.current = null;
  };

  // Handle Play/Stop state changes
  useEffect(() => {
    if (isPlaying && audioCtxRef.current) {
      const ctx = audioCtxRef.current;
      startDrone(ctx);
      startRain(ctx);
      startCrackle(ctx);
    } else {
      stopDrone();
      stopRain();
      stopCrackle();
    }

    return () => {
      stopDrone();
      stopRain();
      stopCrackle();
    };
  }, [isPlaying]);

  // Handle volume sliders change
  useEffect(() => {
    if (droneMasterGainRef.current && audioCtxRef.current) {
      droneMasterGainRef.current.gain.setValueAtTime(droneVolume * 0.3, audioCtxRef.current.currentTime);
    }
  }, [droneVolume]);

  useEffect(() => {
    if (rainGainRef.current && audioCtxRef.current) {
      rainGainRef.current.gain.setValueAtTime(rainVolume * 0.5, audioCtxRef.current.currentTime);
    }
  }, [rainVolume]);

  useEffect(() => {
    if (crackleGainRef.current && audioCtxRef.current) {
      crackleGainRef.current.gain.setValueAtTime(crackleVolume * 0.4, audioCtxRef.current.currentTime);
    }
  }, [crackleVolume]);

  const togglePlayback = () => {
    initAudio();
    if (isPlaying) {
      setIsPlaying(false);
      setActivePreset('none');
    } else {
      setIsPlaying(true);
      applyPreset('void');
    }
  };

  const applyPreset = (preset: 'void' | 'rainy' | 'fireplace') => {
    initAudio();
    setIsPlaying(true);
    setActivePreset(preset);

    if (preset === 'void') {
      setDroneVolume(0.5);
      setRainVolume(0.0);
      setCrackleVolume(0.0);
    } else if (preset === 'rainy') {
      setDroneVolume(0.3);
      setRainVolume(0.45);
      setCrackleVolume(0.0);
    } else if (preset === 'fireplace') {
      setDroneVolume(0.2);
      setRainVolume(0.0);
      setCrackleVolume(0.5);
    }
  };

  return (
    <div id="audio-ambience-panel" className="bg-[#181615] border border-[#2b2522] rounded-xl p-4 text-stone-300 shadow-xl max-w-sm mx-auto">
      <div className="flex items-center justify-between mb-3 border-b border-[#2b2522] pb-2">
        <div className="flex items-center gap-2">
          <Music className={`w-4 h-4 text-[#bf9b30] ${isPlaying ? 'animate-spin' : ''}`} style={{ animationDuration: '6s' }} />
          <span className="font-serif text-sm font-medium tracking-wide text-stone-200">The Muted Void Ambiance</span>
        </div>
        <button
          id="btn-toggle-ambience"
          onClick={togglePlayback}
          className={`px-3 py-1 text-xs font-mono rounded-full border transition-all flex items-center gap-1.5 ${
            isPlaying 
              ? 'bg-[#bf9b30] text-black border-[#bf9b30] shadow-md shadow-[#bf9b30]/10 hover:bg-[#a68423]' 
              : 'border-stone-700 text-stone-400 hover:text-stone-200 hover:border-stone-500'
          }`}
        >
          {isPlaying ? (
            <>
              <Volume2 className="w-3.5 h-3.5" />
              <span>Playing</span>
            </>
          ) : (
            <>
              <VolumeX className="w-3.5 h-3.5" />
              <span>Muted</span>
            </>
          )}
        </button>
      </div>

      <p className="text-[11px] font-sans text-stone-500 mb-3 leading-relaxed">
        Let synthesized micro-dones and acoustic rain envelop you as you delve into literature.
      </p>

      {/* Preset Fast Actions */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <button
          id="preset-void"
          onClick={() => applyPreset('void')}
          className={`py-1 px-2 rounded text-[11px] font-serif border flex flex-col items-center gap-1 transition-all ${
            activePreset === 'void' && isPlaying
              ? 'bg-[#bf9b30]/15 text-[#bf9b30] border-[#bf9b30]'
              : 'border-stone-800 bg-[#1e1a18] hover:border-stone-700 text-stone-400 hover:text-stone-300'
          }`}
        >
          <Music className="w-3.5 h-3.5" />
          <span>The Void</span>
        </button>
        <button
          id="preset-rainy"
          onClick={() => applyPreset('rainy')}
          className={`py-1 px-2 rounded text-[11px] font-serif border flex flex-col items-center gap-1 transition-all ${
            activePreset === 'rainy' && isPlaying
              ? 'bg-[#bf9b30]/15 text-[#bf9b30] border-[#bf9b30]'
              : 'border-stone-800 bg-[#1e1a18] hover:border-stone-700 text-stone-400 hover:text-stone-300'
          }`}
        >
          <CloudRain className="w-3.5 h-3.5" />
          <span>Rainy Adab</span>
        </button>
        <button
          id="preset-fireplace"
          onClick={() => applyPreset('fireplace')}
          className={`py-1 px-2 rounded text-[11px] font-serif border flex flex-col items-center gap-1 transition-all ${
            activePreset === 'fireplace' && isPlaying
              ? 'bg-[#bf9b30]/15 text-[#bf9b30] border-[#bf9b30]'
              : 'border-stone-800 bg-[#1e1a18] hover:border-stone-700 text-stone-400 hover:text-stone-300'
          }`}
        >
          <Flame className="w-3.5 h-3.5" />
          <span>Heer/Fire</span>
        </button>
      </div>

      {/* Manual Sliders */}
      <div className="space-y-3">
        {/* Drone Slider */}
        <div>
          <div className="flex justify-between text-[10px] font-mono text-stone-400 mb-1">
            <span>Cosmic Drone (Warm Pad)</span>
            <span>{Math.round(droneVolume * 100)}%</span>
          </div>
          <input
            id="slider-drone"
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={droneVolume}
            onChange={(e) => {
              setDroneVolume(parseFloat(e.target.value));
              if(!isPlaying) togglePlayback();
            }}
            className="w-full h-1 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-[#bf9b30]"
          />
        </div>

        {/* Rain Slider */}
        <div>
          <div className="flex justify-between text-[10px] font-mono text-stone-400 mb-1">
            <span>Synthesized Rainfall</span>
            <span>{Math.round(rainVolume * 100)}%</span>
          </div>
          <input
            id="slider-rain"
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={rainVolume}
            onChange={(e) => {
              setRainVolume(parseFloat(e.target.value));
              if(!isPlaying) togglePlayback();
            }}
            className="w-full h-1 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-[#bf9b30]"
          />
        </div>

        {/* Timber Crackle Slider */}
        <div>
          <div className="flex justify-between text-[10px] font-mono text-stone-400 mb-1">
            <span>Fire Crackle (Hearth)</span>
            <span>{Math.round(crackleVolume * 100)}%</span>
          </div>
          <input
            id="slider-crackle"
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={crackleVolume}
            onChange={(e) => {
              setCrackleVolume(parseFloat(e.target.value));
              if(!isPlaying) togglePlayback();
            }}
            className="w-full h-1 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-[#bf9b30]"
          />
        </div>
      </div>
    </div>
  );
}
