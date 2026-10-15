import.meta.env = {"BASE_URL": "/", "DEV": true, "MODE": "development", "PROD": false, "SSR": false};const React = __vite__cjsImport0_react; const useState = __vite__cjsImport0_react["useState"]; const useEffect = __vite__cjsImport0_react["useEffect"]; const useRef = __vite__cjsImport0_react["useRef"];const _jsxDEV = __vite__cjsImport3_react_jsxDevRuntime["jsxDEV"];/**
* @license
* SPDX-License-Identifier: Apache-2.0
*/
import __vite__cjsImport0_react from "/node_modules/.vite/deps/react.js?v=9ae9b03d";
import { GoogleGenAI } from "/node_modules/.vite/deps/@google_genai.js?v=9ae9b03d";
import { Grid, Sliders, Activity, Disc, Sparkles, Network, Move, Folder, Zap, Smartphone, Mic2, Mic, Scissors, LayoutGrid, BarChart, Music, Radio, Github, Play, Square, X, Minus, Maximize2, Volume2, RefreshCw, Bot, Send, Terminal, Wand2, RotateCcw, RotateCw } from "/node_modules/.vite/deps/lucide-react.js?v=9ae9b03d";
var _jsxFileName = "/app/applet/src/App.tsx";
import __vite__cjsImport3_react_jsxDevRuntime from "/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=9ae9b03d";
class AudioEngine {
	constructor() {
		this.bpm = 124;
		this.isPlaying = false;
		this.step = 0;
		this.intervalId = null;
		this.onStepCallback = () => {};
		this.audioCtx = null;
		this.analyser = null;
		this.pads = [];
		this.masterVolume = .85;
		this.adsr = {
			attack: 15,
			decay: 45,
			sustain: 70,
			release: 50
		};
		this.eqBands = [
			{
				freq: 20,
				gain: 50,
				q: 60
			},
			{
				freq: 40,
				gain: 45,
				q: 50
			},
			{
				freq: 65,
				gain: 55,
				q: 70
			},
			{
				freq: 85,
				gain: 50,
				q: 40
			}
		];
		this.mediaRecorder = null;
		this.recordedChunks = [];
	}
	setBPM(bpm) {
		this.bpm = bpm;
	}
	setMasterVolume(vol) {
		this.masterVolume = vol;
	}
	updatePadsState(pads) {
		this.pads = pads;
	}
	updateFX(fx) {/* Ready for FX implementation */}
	setADSR(param, value) {
		this.adsr[param] = value;
	}
	setEQBand(bandIndex, param, value) {
		if (this.eqBands[bandIndex]) {
			this.eqBands[bandIndex][param] = value;
		}
	}
	getIsPlaying() {
		return this.isPlaying;
	}
	setOnStep(cb) {
		this.onStepCallback = cb;
	}
	getByteTimeDomainData(array) {
		if (this.analyser && this.audioCtx && this.audioCtx.state === "running") {
			this.analyser.getByteTimeDomainData(array);
		} else {
			for (let i = 0; i < array.length; i++) {
				array[i] = 128 + Math.sin(i / 4 + Date.now() / 100) * 15;
			}
		}
	}
	getByteFrequencyData(array) {
		if (this.analyser && this.audioCtx && this.audioCtx.state === "running") {
			this.analyser.getByteFrequencyData(array);
		} else {
			for (let i = 0; i < array.length; i++) {
				array[i] = Math.abs(Math.sin(i / 2 + Date.now() / 150)) * 160 + Math.random() * 40;
			}
		}
	}
	async decodeAudioData(arrayBuffer) {
		this.initAudio();
		if (!this.audioCtx) return null;
		try {
			return await this.audioCtx.decodeAudioData(arrayBuffer);
		} catch (err) {
			console.error("Audio decode error:", err);
			return null;
		}
	}
	triggerPolyVoice(frequency, layers, adsrOverride) {
		this.initAudio();
		if (!this.audioCtx) return;
		const now = this.audioCtx.currentTime;
		const env = adsrOverride || this.adsr;
		const attackTime = Math.max(.005, env.attack / 100 * 1.5);
		const decayTime = Math.max(.01, env.decay / 100 * 1.5);
		const releaseTime = Math.max(.05, env.release / 100 * 2.5);
		const sustainLevel = Math.max(.001, env.sustain / 100 * this.masterVolume);
		const masterGain = this.audioCtx.createGain();
		masterGain.gain.setValueAtTime(1e-4, now);
		masterGain.gain.linearRampToValueAtTime(this.masterVolume, now + attackTime);
		masterGain.gain.linearRampToValueAtTime(sustainLevel, now + attackTime + decayTime);
		masterGain.gain.exponentialRampToValueAtTime(1e-4, now + attackTime + decayTime + releaseTime);
		if (this.analyser) {
			masterGain.connect(this.analyser);
			this.analyser.connect(this.audioCtx.destination);
		} else {
			masterGain.connect(this.audioCtx.destination);
		}
		let playedBuffers = 0;
		layers.forEach((layer) => {
			if (!layer.active || layer.volume <= 0) return;
			if (layer.buffer) {
				playedBuffers++;
				const source = this.audioCtx.createBufferSource();
				source.buffer = layer.buffer;
				const baseRatio = frequency / 261.63;
				const pitchRatio = baseRatio * Math.pow(2, layer.pitchOffset / 12);
				source.playbackRate.setValueAtTime(Math.max(.1, pitchRatio), now);
				const panner = this.audioCtx.createStereoPanner();
				panner.pan.setValueAtTime(layer.pan || 0, now);
				const layerGain = this.audioCtx.createGain();
				layerGain.gain.setValueAtTime(layer.volume, now);
				if (panner) {
					source.connect(panner);
					panner.connect(layerGain);
				} else {
					source.connect(layerGain);
				}
				layerGain.connect(masterGain);
				source.start(now);
				source.stop(now + attackTime + decayTime + releaseTime + .1);
			}
		});
		if (playedBuffers === 0) {
			const osc = this.audioCtx.createOscillator();
			osc.type = "triangle";
			osc.frequency.setValueAtTime(frequency, now);
			const subOsc = this.audioCtx.createOscillator();
			subOsc.type = "sine";
			subOsc.frequency.setValueAtTime(frequency / 2, now);
			const layerGain = this.audioCtx.createGain();
			layerGain.gain.setValueAtTime(.5, now);
			osc.connect(layerGain);
			subOsc.connect(layerGain);
			layerGain.connect(masterGain);
			osc.start(now);
			subOsc.start(now);
			osc.stop(now + attackTime + decayTime + releaseTime + .1);
			subOsc.stop(now + attackTime + decayTime + releaseTime + .1);
		}
	}
	initAudio() {
		if (!this.audioCtx) {
			this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
		}
		if (!this.analyser && this.audioCtx) {
			this.analyser = this.audioCtx.createAnalyser();
			this.analyser.fftSize = 256;
			this.analyser.smoothingTimeConstant = .8;
		}
		if (this.audioCtx.state === "suspended") {
			this.audioCtx.resume();
		}
	}
	initMIDI(onPadTrigger) {
		if (navigator.requestMIDIAccess) {
			navigator.requestMIDIAccess().then((midiAccess) => {
				console.log("Web MIDI API connected!");
				for (const input of midiAccess.inputs.values()) {
					input.onmidimessage = (event) => {
						const [status, data1, data2] = event.data;
						if ((status & 240) === 144 && data2 > 0) {
							const padIndex = (data1 - 36) % 16;
							if (padIndex >= 0 && padIndex < 16) {
								onPadTrigger(padIndex);
							}
						}
					};
				}
			}, (err) => {
				console.warn("Web MIDI access denied or unsupported:", err);
			});
		}
	}
	playPadDirect(pad) {
		this.initAudio();
		this.playSound(pad);
	}
	startRecordingAudio(onComplete) {
		this.initAudio();
		if (!this.audioCtx) return;
		try {
			const dest = this.audioCtx.createMediaStreamDestination();
			if (this.analyser) {
				this.analyser.connect(dest);
			}
			this.mediaRecorder = new MediaRecorder(dest.stream);
			this.recordedChunks = [];
			this.mediaRecorder.ondataavailable = (e) => {
				if (e.data.size > 0) this.recordedChunks.push(e.data);
			};
			this.mediaRecorder.onstop = () => {
				const blob = new Blob(this.recordedChunks, { type: "audio/webm" });
				onComplete(blob);
			};
			this.mediaRecorder.start();
		} catch (err) {
			console.error("MediaRecorder error:", err);
		}
	}
	stopRecordingAudio() {
		if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
			this.mediaRecorder.stop();
		}
	}
	start() {
		this.initAudio();
		this.isPlaying = true;
		this.tick();
	}
	stop() {
		this.isPlaying = false;
		if (this.intervalId) clearTimeout(this.intervalId);
		this.step = 0;
		this.onStepCallback(0);
	}
	// Web Audio synth patch with ADSR envelope integration
	playSound(pad) {
		if (!this.audioCtx || pad.muted || pad.volume === 0) return;
		const osc = this.audioCtx.createOscillator();
		const gainNode = this.audioCtx.createGain();
		osc.connect(gainNode);
		if (this.analyser) {
			gainNode.connect(this.analyser);
			this.analyser.connect(this.audioCtx.destination);
		} else {
			gainNode.connect(this.audioCtx.destination);
		}
		const now = this.audioCtx.currentTime;
		const finalVolume = pad.volume * this.masterVolume;
		// Calculate attack and release times from ADSR state (seconds)
		const attackTime = Math.max(.005, this.adsr.attack / 100 * .1);
		const releaseTime = Math.max(.1, this.adsr.release / 100 * .5);
		const sustainLevel = finalVolume * (this.adsr.sustain / 100);
		// Envelope
		gainNode.gain.setValueAtTime(0, now);
		gainNode.gain.linearRampToValueAtTime(finalVolume, now + attackTime);
		gainNode.gain.exponentialRampToValueAtTime(Math.max(1e-4, sustainLevel), now + attackTime + .1);
		gainNode.gain.exponentialRampToValueAtTime(.001, now + attackTime + releaseTime);
		// Patch design based on category
		if (pad.category === "drums") {
			osc.type = "sine";
			osc.frequency.setValueAtTime(150, now);
			osc.frequency.exponentialRampToValueAtTime(40, now + .1);
		} else if (pad.category === "bass") {
			osc.type = "sawtooth";
			osc.frequency.setValueAtTime(65.41, now);
		} else if (pad.category === "synth") {
			osc.type = "triangle";
			osc.frequency.setValueAtTime(261.63, now);
		} else {
			osc.type = "square";
			osc.frequency.setValueAtTime(Math.random() * 800 + 200, now);
		}
		osc.start(now);
		osc.stop(now + attackTime + releaseTime);
	}
	tick() {
		if (!this.isPlaying) return;
		// Trigger sounds for this step
		this.pads.forEach((pad, idx) => {
			if (pad.isPlaying && !pad.muted && this.step % 4 === idx % 4) {
				this.playSound(pad);
			}
		});
		const stepDuration = 60 / this.bpm * 1e3 / 4;
		this.intervalId = window.setTimeout(() => {
			this.step = (this.step + 1) % 16;
			this.onStepCallback(this.step);
			this.tick();
		}, stepDuration);
	}
}
const audioEngine = new AudioEngine();
const APP_REGISTRY = [
	{
		id: "grid",
		title: "Pad Launcher",
		icon: Grid,
		color: "text-emerald-400",
		defaultWidth: 620,
		defaultHeight: 480
	},
	{
		id: "mixer",
		title: "Mixer Rack",
		icon: Sliders,
		color: "text-slate-300",
		defaultWidth: 540,
		defaultHeight: 420
	},
	{
		id: "fx",
		title: "FX Chain",
		icon: Activity,
		color: "text-amber-400",
		defaultWidth: 480,
		defaultHeight: 340
	},
	{
		id: "sequencer",
		title: "Step Sequencer",
		icon: Disc,
		color: "text-cyan-400",
		defaultWidth: 620,
		defaultHeight: 420
	},
	{
		id: "granular",
		title: "Granular Synth",
		icon: Sparkles,
		color: "text-violet-400",
		defaultWidth: 600,
		defaultHeight: 420
	},
	{
		id: "patchbay",
		title: "Modular Patch Bay",
		icon: Network,
		color: "text-orange-400",
		defaultWidth: 580,
		defaultHeight: 380
	},
	{
		id: "xypad",
		title: "X/Y Pad Controller",
		icon: Move,
		color: "text-pink-400",
		defaultWidth: 480,
		defaultHeight: 480
	},
	{
		id: "acid",
		title: "Analog 303 Synth",
		icon: Zap,
		color: "text-yellow-400",
		defaultWidth: 540,
		defaultHeight: 320
	},
	{
		id: "scope",
		title: "Master Oscilloscope",
		icon: Activity,
		color: "text-green-400",
		defaultWidth: 480,
		defaultHeight: 300
	},
	{
		id: "crate",
		title: "Sample Crate",
		icon: Folder,
		color: "text-blue-400",
		defaultWidth: 520,
		defaultHeight: 400
	},
	{
		id: "preset-manager",
		title: "Preset Manager",
		icon: Folder,
		color: "text-amber-400",
		defaultWidth: 500,
		defaultHeight: 420
	},
	{
		id: "aigen",
		title: "Gemini AI Producer",
		icon: Sparkles,
		color: "text-fuchsia-400",
		defaultWidth: 600,
		defaultHeight: 560
	},
	{
		id: "mobile",
		title: "Mobile Remote",
		icon: Smartphone,
		color: "text-slate-400",
		defaultWidth: 380,
		defaultHeight: 540
	},
	{
		id: "drummachine",
		title: "Drum Machine",
		icon: Disc,
		color: "text-red-400",
		defaultWidth: 600,
		defaultHeight: 500
	},
	{
		id: "looper",
		title: "Live Looper",
		icon: RefreshCw,
		color: "text-indigo-400",
		defaultWidth: 500,
		defaultHeight: 400
	},
	{
		id: "sampler",
		title: "Poly Sampler",
		icon: Music,
		color: "text-teal-400",
		defaultWidth: 550,
		defaultHeight: 450
	},
	{
		id: "voicetrainer",
		title: "Voice Trainer",
		icon: Mic2,
		color: "text-rose-400",
		defaultWidth: 500,
		defaultHeight: 400
	},
	{
		id: "voicechanger",
		title: "Vocal Transformer",
		icon: Mic2,
		color: "text-purple-400",
		defaultWidth: 450,
		defaultHeight: 350
	},
	{
		id: "trim",
		title: "Audio Trim",
		icon: Scissors,
		color: "text-blue-300",
		defaultWidth: 650,
		defaultHeight: 350
	},
	{
		id: "matrix",
		title: "Routing Matrix",
		icon: LayoutGrid,
		color: "text-cyan-300",
		defaultWidth: 550,
		defaultHeight: 500
	},
	{
		id: "parametric-eq",
		title: "Parametric EQ",
		icon: BarChart,
		color: "text-emerald-300",
		defaultWidth: 600,
		defaultHeight: 400
	},
	{
		id: "vocalautotune",
		title: "AutoTune Pro",
		icon: Music,
		color: "text-violet-300",
		defaultWidth: 500,
		defaultHeight: 350
	},
	{
		id: "djsetmix",
		title: "DJ Mix Studio",
		icon: Radio,
		color: "text-amber-300",
		defaultWidth: 700,
		defaultHeight: 450
	},
	{
		id: "github-publisher",
		title: "GitHub Sync",
		icon: Github,
		color: "text-slate-200",
		defaultWidth: 400,
		defaultHeight: 450
	},
	{
		id: "aichat",
		title: "AI Producer Chat",
		icon: Bot,
		color: "text-cyan-300",
		defaultWidth: 620,
		defaultHeight: 560
	},
	{
		id: "voicestudio",
		title: "Voice Studio",
		icon: Mic,
		color: "text-rose-300",
		defaultWidth: 600,
		defaultHeight: 520
	}
];
const Knob = ({ label, value, color = "cyan", onChange }) => {
	const rotation = value / 100 * 270 - 135;
	const colors = {
		cyan: "bg-cyan-400",
		violet: "bg-violet-400",
		emerald: "bg-emerald-400",
		amber: "bg-amber-400",
		yellow: "bg-yellow-400",
		red: "bg-red-400",
		teal: "bg-teal-400"
	};
	const handleClick = () => {
		if (onChange) {
			const nextVal = value + 10 > 100 ? 0 : value + 10;
			onChange(nextVal);
		}
	};
	return /* @__PURE__ */ _jsxDEV("div", {
		className: "flex flex-col items-center gap-1 select-none cursor-pointer group",
		onClick: handleClick,
		title: "Click to adjust value",
		children: [/* @__PURE__ */ _jsxDEV("div", {
			className: "w-10 h-10 rounded-full bg-slate-800 border-[3px] border-slate-950 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] relative flex items-center justify-center group-hover:border-slate-700 transition-colors",
			children: /* @__PURE__ */ _jsxDEV("div", {
				className: "absolute inset-0 rounded-full transition-transform duration-100",
				style: { transform: `rotate(${rotation}deg)` },
				children: /* @__PURE__ */ _jsxDEV("div", { className: `absolute top-0.5 left-1/2 -translate-x-1/2 w-1 h-2.5 rounded-full ${colors[color] || colors.cyan} shadow-[0_0_5px_currentColor]` }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 421,
					columnNumber: 13
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 420,
				columnNumber: 10
			}, this)
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 419,
			columnNumber: 7
		}, this), /* @__PURE__ */ _jsxDEV("div", {
			className: "flex flex-col items-center",
			children: [/* @__PURE__ */ _jsxDEV("span", {
				className: "text-[9px] font-bold tracking-wider text-slate-400 uppercase",
				children: label
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 425,
				columnNumber: 9
			}, this), /* @__PURE__ */ _jsxDEV("span", {
				className: "text-[8px] font-mono text-cyan-400",
				children: [value, "%"]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 426,
				columnNumber: 9
			}, this)]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 424,
			columnNumber: 7
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 418,
		columnNumber: 5
	}, this);
};
const GridLauncher = ({ pads, currentStep, isPlaying, onTogglePad }) => /* @__PURE__ */ _jsxDEV("div", {
	className: "p-6 h-full flex flex-col items-center justify-center bg-slate-900/95 relative overflow-hidden",
	children: [/* @__PURE__ */ _jsxDEV("div", { className: "absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-cyan-400 via-transparent to-transparent pointer-events-none" }, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 434,
		columnNumber: 5
	}, this), /* @__PURE__ */ _jsxDEV("div", {
		className: "grid grid-cols-4 gap-4 w-full max-w-md aspect-square relative z-10",
		children: pads.map((pad, idx) => {
			const isTriggered = isPlaying && pad.isPlaying && currentStep % 4 === idx % 4;
			let baseColor = "emerald";
			if (pad.category === "bass") baseColor = "indigo";
			if (pad.category === "synth") baseColor = "violet";
			if (pad.category === "fx") baseColor = "amber";
			const bgClass = pad.isPlaying ? `bg-${baseColor}-500 border-${baseColor}-400 text-white shadow-[0_0_20px_rgba(var(--${baseColor}-rgb),0.6)]` : `bg-${baseColor}-500/10 border-${baseColor}-500/30 text-${baseColor}-400 hover:bg-${baseColor}-500/20`;
			return /* @__PURE__ */ _jsxDEV("button", {
				onClick: () => onTogglePad(pad.id),
				className: `relative rounded-2xl border-2 transition-all duration-75 flex flex-col items-center justify-center gap-2 ${bgClass} ${isTriggered ? "brightness-150 scale-95" : "scale-100"}`,
				children: [/* @__PURE__ */ _jsxDEV("span", {
					className: "text-xs font-bold font-mono tracking-tighter text-center px-1 leading-tight",
					children: pad.name
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 452,
					columnNumber: 14
				}, this), pad.isPlaying && /* @__PURE__ */ _jsxDEV("div", { className: "absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-white animate-pulse" }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 453,
					columnNumber: 32
				}, this)]
			}, pad.id, true, {
				fileName: _jsxFileName,
				lineNumber: 448,
				columnNumber: 11
			}, this);
		})
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 435,
		columnNumber: 5
	}, this)]
}, void 0, true, {
	fileName: _jsxFileName,
	lineNumber: 433,
	columnNumber: 3
}, this);
const MixerRack = ({ pads, masterVolume, onUpdateVolume, onUpdatePan, onToggleMute, onToggleSolo, onUpdateMasterVolume }) => /* @__PURE__ */ _jsxDEV("div", {
	className: "flex h-full bg-slate-900 p-4 gap-2 overflow-x-auto no-scrollbar items-start",
	children: [
		pads.slice(0, 8).map((pad) => /* @__PURE__ */ _jsxDEV("div", {
			className: "w-[72px] flex-shrink-0 bg-slate-950/80 rounded-xl border border-slate-800 flex flex-col items-center py-4 gap-4 shadow-xl",
			children: [
				/* @__PURE__ */ _jsxDEV("span", {
					className: "text-[10px] font-bold text-slate-400 text-center uppercase h-8 px-1 overflow-hidden leading-tight flex items-center",
					children: pad.name
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 465,
					columnNumber: 11
				}, this),
				/* @__PURE__ */ _jsxDEV(Knob, {
					label: "PAN",
					value: (pad.pan + 1) * 50,
					color: pad.category === "drums" ? "emerald" : pad.category === "bass" ? "indigo" : "violet"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 466,
					columnNumber: 11
				}, this),
				/* @__PURE__ */ _jsxDEV("div", {
					className: "flex-1 w-full h-40 flex justify-center relative py-4 group",
					children: [
						/* @__PURE__ */ _jsxDEV("div", { className: "absolute top-4 bottom-4 w-1.5 bg-slate-900 rounded-full shadow-inner border border-slate-800" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 468,
							columnNumber: 14
						}, this),
						/* @__PURE__ */ _jsxDEV("input", {
							type: "range",
							min: 0,
							max: 1,
							step: .01,
							value: pad.volume,
							onChange: (e) => onUpdateVolume(pad.id, Number(e.target.value)),
							className: "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-6 opacity-0 cursor-pointer z-20",
							style: { transform: "rotate(-90deg)" }
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 469,
							columnNumber: 14
						}, this),
						/* @__PURE__ */ _jsxDEV("div", {
							className: "absolute w-7 h-10 bg-slate-700 border-2 border-slate-600 rounded shadow-lg pointer-events-none transition-all duration-200 group-hover:border-slate-400 group-hover:scale-105 group-hover:shadow-[0_0_12px_rgba(255,255,255,0.2)] flex items-center justify-center",
							style: { bottom: `calc(${pad.volume * 100}% - 20px)` },
							children: /* @__PURE__ */ _jsxDEV("div", { className: "w-4 h-1 rounded-full bg-slate-400 transition-colors group-hover:bg-white" }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 472,
								columnNumber: 17
							}, this)
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 471,
							columnNumber: 14
						}, this)
					]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 467,
					columnNumber: 11
				}, this),
				/* @__PURE__ */ _jsxDEV("div", {
					className: "flex gap-1 w-full px-2 mt-auto",
					children: [/* @__PURE__ */ _jsxDEV("button", {
						onClick: () => onToggleMute(pad.id),
						className: `flex-1 text-[9px] font-black py-1 rounded transition-colors ${pad.muted ? "bg-red-500 text-white shadow-[0_0_8px_#ef4444]" : "bg-slate-800 text-slate-500 hover:bg-slate-700"}`,
						children: "M"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 476,
						columnNumber: 14
					}, this), /* @__PURE__ */ _jsxDEV("button", {
						onClick: () => onToggleSolo(pad.id),
						className: `flex-1 text-[9px] font-black py-1 rounded transition-colors ${pad.soloed ? "bg-yellow-400 text-slate-900 shadow-[0_0_8px_#facc15]" : "bg-slate-800 text-slate-500 hover:bg-slate-700"}`,
						children: "S"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 477,
						columnNumber: 14
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 475,
					columnNumber: 11
				}, this)
			]
		}, pad.id, true, {
			fileName: _jsxFileName,
			lineNumber: 464,
			columnNumber: 8
		}, this)),
		/* @__PURE__ */ _jsxDEV("div", { className: "w-px bg-slate-800 mx-2 self-stretch" }, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 481,
			columnNumber: 5
		}, this),
		/* @__PURE__ */ _jsxDEV("div", {
			className: "w-24 flex-shrink-0 bg-slate-950 rounded-xl border border-cyan-900 flex flex-col items-center py-4 gap-4 shadow-[0_0_20px_rgba(8,145,178,0.15)] relative overflow-hidden",
			children: [
				/* @__PURE__ */ _jsxDEV("div", { className: "absolute inset-0 bg-gradient-to-t from-cyan-900/20 to-transparent pointer-events-none" }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 483,
					columnNumber: 9
				}, this),
				/* @__PURE__ */ _jsxDEV("span", {
					className: "text-[11px] font-black text-cyan-400 tracking-widest relative z-10",
					children: "MASTER"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 484,
					columnNumber: 9
				}, this),
				/* @__PURE__ */ _jsxDEV("div", { className: "h-10" }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 485,
					columnNumber: 9
				}, this),
				/* @__PURE__ */ _jsxDEV("div", {
					className: "flex-1 w-full h-40 flex justify-center relative py-4 z-10 group",
					children: [
						/* @__PURE__ */ _jsxDEV("div", { className: "absolute top-4 bottom-4 w-2 bg-slate-900 rounded-full shadow-inner border border-slate-800" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 487,
							columnNumber: 14
						}, this),
						/* @__PURE__ */ _jsxDEV("input", {
							type: "range",
							min: 0,
							max: 1,
							step: .01,
							value: masterVolume,
							onChange: (e) => onUpdateMasterVolume(Number(e.target.value)),
							className: "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-8 opacity-0 cursor-pointer z-20",
							style: { transform: "rotate(-90deg)" }
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 488,
							columnNumber: 14
						}, this),
						/* @__PURE__ */ _jsxDEV("div", {
							className: "absolute w-9 h-12 bg-cyan-950 border-2 border-cyan-500 rounded shadow-[0_0_15px_rgba(34,211,238,0.5)] pointer-events-none transition-all duration-200 group-hover:border-cyan-300 group-hover:scale-105 group-hover:shadow-[0_0_20px_rgba(34,211,238,0.8)] flex items-center justify-center",
							style: { bottom: `calc(${masterVolume * 100}% - 24px)` },
							children: /* @__PURE__ */ _jsxDEV("div", { className: "w-5 h-1 rounded-full bg-cyan-300 shadow-[0_0_5px_#22d3ee] transition-colors group-hover:bg-white" }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 491,
								columnNumber: 17
							}, this)
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 490,
							columnNumber: 14
						}, this)
					]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 486,
					columnNumber: 9
				}, this)
			]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 482,
			columnNumber: 5
		}, this)
	]
}, void 0, true, {
	fileName: _jsxFileName,
	lineNumber: 462,
	columnNumber: 3
}, this);
const DrumMachine = () => {
	const [grid, setGrid] = useState(Array(4).fill(null).map(() => Array(16).fill(false)));
	const instruments = [
		"KICK",
		"SNARE",
		"CLAP",
		"HIHAT"
	];
	const colors = [
		"bg-red-500",
		"bg-emerald-500",
		"bg-amber-500",
		"bg-cyan-500"
	];
	const toggleStep = (trackIdx, stepIdx) => {
		const newGrid = [...grid];
		newGrid[trackIdx][stepIdx] = !newGrid[trackIdx][stepIdx];
		setGrid(newGrid);
	};
	return /* @__PURE__ */ _jsxDEV("div", {
		className: "h-full bg-slate-900 p-6 flex flex-col gap-4 font-mono overflow-y-auto",
		children: [/* @__PURE__ */ _jsxDEV("div", {
			className: "flex justify-between items-center bg-slate-950 p-3 rounded-lg border-2 border-slate-800 shadow-md mb-2",
			children: [/* @__PURE__ */ _jsxDEV("span", {
				className: "font-black tracking-widest text-red-400 text-xl italic flex items-center gap-2",
				children: [/* @__PURE__ */ _jsxDEV(Disc, {
					size: 20,
					className: "animate-spin"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 513,
					columnNumber: 12
				}, this), " TR-808"]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 512,
				columnNumber: 10
			}, this), /* @__PURE__ */ _jsxDEV("span", {
				className: "px-2 py-1 bg-red-950 text-red-500 text-[10px] rounded border border-red-900",
				children: "PATTERN A"
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 515,
				columnNumber: 10
			}, this)]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 511,
			columnNumber: 8
		}, this), /* @__PURE__ */ _jsxDEV("div", {
			className: "flex flex-col gap-3 flex-1 bg-slate-950 p-4 rounded-xl border border-slate-800",
			children: instruments.map((track, i) => /* @__PURE__ */ _jsxDEV("div", {
				className: "flex items-center gap-4",
				children: [/* @__PURE__ */ _jsxDEV("div", {
					className: "w-16 flex-shrink-0 text-right",
					children: /* @__PURE__ */ _jsxDEV("span", {
						className: "text-[10px] text-slate-300 font-bold",
						children: track
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 522,
						columnNumber: 17
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 521,
					columnNumber: 14
				}, this), /* @__PURE__ */ _jsxDEV("div", {
					className: "flex-1 grid grid-cols-16 gap-1",
					children: grid[i].map((isActive, j) => /* @__PURE__ */ _jsxDEV("button", {
						onClick: () => toggleStep(i, j),
						className: `h-10 rounded-sm transition-all border ${isActive ? `${colors[i]} border-white/20 shadow-[0_0_10px_currentColor]` : "bg-slate-800 border-slate-700 hover:bg-slate-700"} ${j % 4 === 0 && !isActive ? "opacity-100 bg-slate-750" : "opacity-80"}`
					}, j, false, {
						fileName: _jsxFileName,
						lineNumber: 526,
						columnNumber: 20
					}, this))
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 524,
					columnNumber: 14
				}, this)]
			}, track, true, {
				fileName: _jsxFileName,
				lineNumber: 520,
				columnNumber: 12
			}, this))
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 518,
			columnNumber: 8
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 510,
		columnNumber: 5
	}, this);
};
const FXChain = () => {
	return /* @__PURE__ */ _jsxDEV("div", {
		className: "h-full bg-slate-900 p-6 flex gap-4 font-mono overflow-x-auto no-scrollbar items-center",
		children: [
			/* @__PURE__ */ _jsxDEV("div", {
				className: "min-w-[180px] h-full bg-slate-950 border border-amber-900/50 rounded-xl p-4 flex flex-col items-center gap-6 shadow-[0_0_15px_rgba(217,119,6,0.1)]",
				children: [
					/* @__PURE__ */ _jsxDEV("span", {
						className: "text-amber-500 font-bold tracking-widest text-xs border-b border-amber-900/50 pb-2 w-full text-center",
						children: "GHOST REVERB"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 549,
						columnNumber: 10
					}, this),
					/* @__PURE__ */ _jsxDEV(Knob, {
						label: "DECAY",
						value: 75,
						color: "amber"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 550,
						columnNumber: 10
					}, this),
					/* @__PURE__ */ _jsxDEV(Knob, {
						label: "SIZE",
						value: 60,
						color: "amber"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 551,
						columnNumber: 10
					}, this),
					/* @__PURE__ */ _jsxDEV(Knob, {
						label: "MIX",
						value: 40,
						color: "amber"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 552,
						columnNumber: 10
					}, this)
				]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 548,
				columnNumber: 8
			}, this),
			/* @__PURE__ */ _jsxDEV("div", {
				className: "min-w-[180px] h-full bg-slate-950 border border-cyan-900/50 rounded-xl p-4 flex flex-col items-center gap-6 shadow-[0_0_15px_rgba(34,211,238,0.1)]",
				children: [
					/* @__PURE__ */ _jsxDEV("span", {
						className: "text-cyan-500 font-bold tracking-widest text-xs border-b border-cyan-900/50 pb-2 w-full text-center",
						children: "ECHO DELAY"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 557,
						columnNumber: 10
					}, this),
					/* @__PURE__ */ _jsxDEV(Knob, {
						label: "TIME",
						value: 30,
						color: "cyan"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 558,
						columnNumber: 10
					}, this),
					/* @__PURE__ */ _jsxDEV(Knob, {
						label: "FEEDBACK",
						value: 65,
						color: "cyan"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 559,
						columnNumber: 10
					}, this),
					/* @__PURE__ */ _jsxDEV(Knob, {
						label: "MIX",
						value: 50,
						color: "cyan"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 560,
						columnNumber: 10
					}, this)
				]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 556,
				columnNumber: 8
			}, this),
			/* @__PURE__ */ _jsxDEV("div", {
				className: "min-w-[180px] h-full bg-slate-950 border border-red-900/50 rounded-xl p-4 flex flex-col items-center gap-6 shadow-[0_0_15px_rgba(239,68,68,0.1)]",
				children: [
					/* @__PURE__ */ _jsxDEV("span", {
						className: "text-red-500 font-bold tracking-widest text-xs border-b border-red-900/50 pb-2 w-full text-center",
						children: "SATURATOR"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 565,
						columnNumber: 10
					}, this),
					/* @__PURE__ */ _jsxDEV(Knob, {
						label: "DRIVE",
						value: 85,
						color: "red"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 566,
						columnNumber: 10
					}, this),
					/* @__PURE__ */ _jsxDEV(Knob, {
						label: "COLOR",
						value: 45,
						color: "red"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 567,
						columnNumber: 10
					}, this),
					/* @__PURE__ */ _jsxDEV(Knob, {
						label: "MIX",
						value: 100,
						color: "red"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 568,
						columnNumber: 10
					}, this)
				]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 564,
				columnNumber: 8
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 546,
		columnNumber: 5
	}, this);
};
const MasterOscilloscope = () => {
	const canvasRef = useRef(null);
	const [viewMode, setViewMode] = useState("both");
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		let animationId;
		const timeBuffer = new Uint8Array(128);
		const freqBuffer = new Uint8Array(64);
		const draw = () => {
			audioEngine.getByteTimeDomainData(timeBuffer);
			audioEngine.getByteFrequencyData(freqBuffer);
			ctx.fillStyle = "rgba(2, 6, 23, 0.4)";
			ctx.fillRect(0, 0, canvas.width, canvas.height);
			const width = canvas.width;
			const height = canvas.height;
			// Draw FFT Frequency Spectrum Analyzer
			if (viewMode === "both" || viewMode === "fft") {
				const barWidth = width / freqBuffer.length;
				for (let i = 0; i < freqBuffer.length; i++) {
					const val = freqBuffer[i] / 255;
					const barHeight = val * (viewMode === "both" ? height / 2 - 10 : height - 20);
					const gradient = ctx.createLinearGradient(0, height, 0, 0);
					gradient.addColorStop(0, "#059669");
					gradient.addColorStop(.7, "#34d399");
					gradient.addColorStop(1, "#a78bfa");
					ctx.fillStyle = gradient;
					ctx.shadowBlur = 8;
					ctx.shadowColor = "#34d399";
					ctx.fillRect(i * barWidth + 1, height - (viewMode === "both" ? height / 2 : 0) - barHeight, barWidth - 2, barHeight);
				}
			}
			// Draw Oscilloscope Waveform
			if (viewMode === "both" || viewMode === "oscilloscope") {
				const startY = viewMode === "both" ? height * .75 : height / 2;
				ctx.beginPath();
				ctx.strokeStyle = "#22d3ee";
				ctx.lineWidth = 2;
				ctx.shadowBlur = 12;
				ctx.shadowColor = "#22d3ee";
				const sliceWidth = width / timeBuffer.length;
				let x = 0;
				for (let i = 0; i < timeBuffer.length; i++) {
					const v = timeBuffer[i] / 128;
					const y = startY + (v - 1) * (height / 3);
					if (i === 0) ctx.moveTo(x, y);
					else ctx.lineTo(x, y);
					x += sliceWidth;
				}
				ctx.stroke();
			}
			animationId = requestAnimationFrame(draw);
		};
		draw();
		return () => cancelAnimationFrame(animationId);
	}, [viewMode]);
	return /* @__PURE__ */ _jsxDEV("div", {
		className: "w-full h-full bg-slate-950 p-6 flex flex-col gap-4 font-mono text-xs",
		children: [
			/* @__PURE__ */ _jsxDEV("div", {
				className: "flex justify-between items-center text-emerald-400 border-b border-emerald-900/50 pb-2",
				children: [/* @__PURE__ */ _jsxDEV("span", {
					className: "font-bold flex items-center gap-2",
					children: [/* @__PURE__ */ _jsxDEV(Activity, { size: 16 }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 648,
						columnNumber: 12
					}, this), " MASTER SPECTRUM ANALYZER & OSCILLOSCOPE (FFT)"]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 647,
					columnNumber: 10
				}, this), /* @__PURE__ */ _jsxDEV("div", {
					className: "flex items-center gap-2",
					children: [
						"both",
						"fft",
						"oscilloscope"
					].map((m) => /* @__PURE__ */ _jsxDEV("button", {
						onClick: () => setViewMode(m),
						className: `px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-all ${viewMode === m ? "bg-emerald-600 text-white shadow-[0_0_10px_#059669]" : "bg-slate-900 text-slate-400 hover:bg-slate-800"}`,
						children: m
					}, m, false, {
						fileName: _jsxFileName,
						lineNumber: 652,
						columnNumber: 14
					}, this))
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 650,
					columnNumber: 10
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 646,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ _jsxDEV("canvas", {
				ref: canvasRef,
				width: 800,
				height: 400,
				className: "w-full flex-1 rounded-xl border border-slate-800 bg-[#020617] shadow-inner"
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 666,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ _jsxDEV("div", {
				className: "flex justify-between text-[9px] text-slate-500 font-bold px-1",
				children: [
					/* @__PURE__ */ _jsxDEV("span", { children: "60Hz (SUB)" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 668,
						columnNumber: 9
					}, this),
					/* @__PURE__ */ _jsxDEV("span", { children: "250Hz (BASS)" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 669,
						columnNumber: 9
					}, this),
					/* @__PURE__ */ _jsxDEV("span", { children: "1kHz (MID)" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 670,
						columnNumber: 9
					}, this),
					/* @__PURE__ */ _jsxDEV("span", { children: "4kHz (PRESENCE)" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 671,
						columnNumber: 9
					}, this),
					/* @__PURE__ */ _jsxDEV("span", { children: "16kHz (AIR)" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 672,
						columnNumber: 9
					}, this)
				]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 667,
				columnNumber: 7
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 645,
		columnNumber: 5
	}, this);
};
const GranularSynth = () => /* @__PURE__ */ _jsxDEV("div", {
	className: "p-5 bg-slate-900 h-full flex flex-col gap-5 text-slate-200 font-mono text-xs",
	children: [
		/* @__PURE__ */ _jsxDEV("div", {
			className: "flex justify-between items-center bg-slate-950 p-3 rounded-lg border border-slate-800 shadow-md",
			children: [/* @__PURE__ */ _jsxDEV("span", {
				className: "font-bold tracking-widest text-violet-300",
				children: "GRAIN_ENGINE V2"
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 681,
				columnNumber: 8
			}, this), /* @__PURE__ */ _jsxDEV("span", {
				className: "px-2 py-0.5 bg-violet-500/20 text-violet-400 rounded-sm",
				children: "ACTIVE ENGINE"
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 682,
				columnNumber: 8
			}, this)]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 680,
			columnNumber: 6
		}, this),
		/* @__PURE__ */ _jsxDEV("div", {
			className: "flex-1 relative bg-slate-950 rounded-lg border border-slate-800 overflow-hidden group shadow-inner",
			children: [
				/* @__PURE__ */ _jsxDEV("div", { className: "absolute inset-0 opacity-40 bg-[repeating-linear-gradient(90deg,transparent,transparent_2px,#4c1d95_2px,#4c1d95_4px)]" }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 685,
					columnNumber: 9
				}, this),
				/* @__PURE__ */ _jsxDEV("div", { className: "absolute inset-0 bg-gradient-to-b from-transparent via-violet-900/20 to-transparent" }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 686,
					columnNumber: 9
				}, this),
				/* @__PURE__ */ _jsxDEV("div", {
					className: "absolute top-0 bottom-0 w-32 bg-violet-500/30 border-x-2 border-violet-400 cursor-ew-resize left-1/3 shadow-[0_0_20px_rgba(139,92,246,0.6)] flex items-center justify-center backdrop-blur-[1px]",
					children: /* @__PURE__ */ _jsxDEV("div", { className: "h-8 w-1 bg-violet-300 rounded-full opacity-50" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 688,
						columnNumber: 12
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 687,
					columnNumber: 9
				}, this)
			]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 684,
			columnNumber: 6
		}, this),
		/* @__PURE__ */ _jsxDEV("div", {
			className: "flex justify-between gap-2 p-4 bg-slate-950 rounded-lg border border-slate-800",
			children: [
				/* @__PURE__ */ _jsxDEV(Knob, {
					label: "POSITION",
					value: 33,
					color: "violet"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 692,
					columnNumber: 8
				}, this),
				/* @__PURE__ */ _jsxDEV(Knob, {
					label: "SIZE",
					value: 45,
					color: "violet"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 693,
					columnNumber: 8
				}, this),
				/* @__PURE__ */ _jsxDEV(Knob, {
					label: "DENSITY",
					value: 80,
					color: "violet"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 694,
					columnNumber: 8
				}, this),
				/* @__PURE__ */ _jsxDEV(Knob, {
					label: "PITCH",
					value: 50,
					color: "violet"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 695,
					columnNumber: 8
				}, this),
				/* @__PURE__ */ _jsxDEV(Knob, {
					label: "SPREAD",
					value: 20,
					color: "violet"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 696,
					columnNumber: 8
				}, this)
			]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 691,
			columnNumber: 6
		}, this)
	]
}, void 0, true, {
	fileName: _jsxFileName,
	lineNumber: 679,
	columnNumber: 3
}, this);
const AcidBoxSynth = () => /* @__PURE__ */ _jsxDEV("div", {
	className: "p-6 bg-slate-900 h-full flex flex-col gap-6 font-mono relative overflow-hidden",
	children: [
		/* @__PURE__ */ _jsxDEV("div", { className: "absolute -top-10 -right-10 w-40 h-40 bg-yellow-500/5 blur-3xl rounded-full pointer-events-none" }, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 703,
			columnNumber: 6
		}, this),
		/* @__PURE__ */ _jsxDEV("div", {
			className: "flex justify-between items-center bg-slate-950 p-4 rounded-xl border-2 border-slate-800 shadow-lg",
			children: [/* @__PURE__ */ _jsxDEV("div", {
				className: "flex items-center gap-3",
				children: [/* @__PURE__ */ _jsxDEV("div", { className: "w-3 h-3 rounded-full bg-red-500 shadow-[0_0_10px_#ef4444] animate-pulse" }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 706,
					columnNumber: 10
				}, this), /* @__PURE__ */ _jsxDEV("span", {
					className: "text-yellow-400 font-black text-2xl tracking-widest italic",
					children: "TB-303X"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 707,
					columnNumber: 10
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 705,
				columnNumber: 8
			}, this), /* @__PURE__ */ _jsxDEV("div", {
				className: "flex gap-2 p-1 bg-slate-900 rounded-lg border border-slate-800",
				children: [/* @__PURE__ */ _jsxDEV("button", {
					className: "px-4 py-1.5 bg-yellow-500 text-slate-950 text-xs rounded font-black shadow-sm",
					children: "SAW"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 710,
					columnNumber: 11
				}, this), /* @__PURE__ */ _jsxDEV("button", {
					className: "px-4 py-1.5 bg-slate-800 text-slate-400 text-xs rounded font-bold hover:bg-slate-700",
					children: "SQU"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 711,
					columnNumber: 11
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 709,
				columnNumber: 8
			}, this)]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 704,
			columnNumber: 6
		}, this),
		/* @__PURE__ */ _jsxDEV("div", {
			className: "flex justify-between px-2 bg-slate-950/50 p-4 rounded-xl border border-slate-800 backdrop-blur-sm",
			children: [
				/* @__PURE__ */ _jsxDEV(Knob, {
					label: "TUNING",
					value: 50,
					color: "yellow"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 715,
					columnNumber: 8
				}, this),
				/* @__PURE__ */ _jsxDEV(Knob, {
					label: "CUTOFF",
					value: 75,
					color: "yellow"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 716,
					columnNumber: 8
				}, this),
				/* @__PURE__ */ _jsxDEV(Knob, {
					label: "RESONANCE",
					value: 80,
					color: "yellow"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 717,
					columnNumber: 8
				}, this),
				/* @__PURE__ */ _jsxDEV(Knob, {
					label: "ENV MOD",
					value: 60,
					color: "yellow"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 718,
					columnNumber: 8
				}, this),
				/* @__PURE__ */ _jsxDEV(Knob, {
					label: "DECAY",
					value: 40,
					color: "yellow"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 719,
					columnNumber: 8
				}, this),
				/* @__PURE__ */ _jsxDEV(Knob, {
					label: "ACCENT",
					value: 90,
					color: "yellow"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 720,
					columnNumber: 8
				}, this)
			]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 714,
			columnNumber: 6
		}, this),
		/* @__PURE__ */ _jsxDEV("div", {
			className: "mt-auto bg-slate-950 p-4 rounded-xl border border-slate-800",
			children: /* @__PURE__ */ _jsxDEV("div", {
				className: "grid grid-cols-16 gap-1",
				children: Array.from({ length: 16 }).map((_, i) => /* @__PURE__ */ _jsxDEV("div", {
					className: "flex flex-col gap-2 items-center group",
					children: [/* @__PURE__ */ _jsxDEV("div", { className: `w-full aspect-square rounded-sm cursor-pointer transition-colors ${i % 4 === 0 ? "bg-slate-700" : "bg-slate-800"} hover:bg-yellow-400/80 ${i === 2 || i === 7 || i === 10 ? "bg-yellow-500 shadow-[0_0_8px_#eab308]" : ""}` }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 726,
						columnNumber: 14
					}, this), /* @__PURE__ */ _jsxDEV("span", {
						className: "text-[9px] text-slate-600 font-bold group-hover:text-yellow-400",
						children: i + 1
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 727,
						columnNumber: 14
					}, this)]
				}, i, true, {
					fileName: _jsxFileName,
					lineNumber: 725,
					columnNumber: 12
				}, this))
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 723,
				columnNumber: 8
			}, this)
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 722,
			columnNumber: 6
		}, this)
	]
}, void 0, true, {
	fileName: _jsxFileName,
	lineNumber: 702,
	columnNumber: 3
}, this);
const AITrackGenerator = ({ setBpm, setPads }) => {
	const [promptText, setPromptText] = useState("Cyberpunk synthwave track with heavy sidechain bass and lush 80s pads at 120 BPM");
	const [isGenerating, setIsGenerating] = useState(false);
	const [llmOutput, setLlmOutput] = useState("");
	const [parsedData, setParsedData] = useState(null);
	const handleGeminiGenerate = async () => {
		if (!promptText.trim()) return;
		setIsGenerating(true);
		setLlmOutput("Connecting to Gemini API...");
		try {
			const systemPrompt = `You are an expert music producer and audio engineer assistant in Remix OS. 
Analyze the user's prompt and produce a JSON response with track settings and sound design specs.
Output format MUST be valid JSON with this exact structure:
{
  "genre": "Genre Name",
  "bpm": 120,
  "key": "A Minor",
  "structure": ["Intro", "Build", "Drop", "Outro"],
  "trackAdvice": "Concise mix advice",
  "pads": [
    {"name": "Kick & Snare", "category": "drums", "volume": 0.9},
    {"name": "Percussion", "category": "drums", "volume": 0.75},
    {"name": "Sub Bass Line", "category": "bass", "volume": 0.85},
    {"name": "Synth Pad", "category": "synth", "volume": 0.7}
  ]
}`;
			// Secure API key retrieval for Vite/AI Studio runtime
			const apiKey = import.meta.env?.VITE_GEMINI_API_KEY || process.env?.REACT_APP_GEMINI_API_KEY || "";
			if (!apiKey) {
				setLlmOutput("ERROR: Missing API Key. Please ensure GEMINI_API_KEY is configured in your environment or secrets panel.");
				setIsGenerating(false);
				return;
			}
			const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
			const response = await fetch(apiUrl, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					contents: [{ parts: [{ text: promptText }] }],
					systemInstruction: { parts: [{ text: systemPrompt }] },
					generationConfig: { responseMimeType: "application/json" }
				})
			});
			const data = await response.json();
			let rawJson = data.candidates?.[0]?.content?.parts?.[0]?.text;
			if (rawJson) {
				rawJson = rawJson.replace(/```json/g, "").replace(/```/g, "").trim();
				const firstBrace = rawJson.indexOf("{");
				const lastBrace = rawJson.lastIndexOf("}");
				if (firstBrace !== -1 && lastBrace !== -1) {
					rawJson = rawJson.substring(firstBrace, lastBrace + 1);
				}
				const parsed = JSON.parse(rawJson);
				setParsedData(parsed);
				setLlmOutput(JSON.stringify(parsed, null, 2));
				if (parsed.bpm && setBpm) setBpm(parsed.bpm);
				if (parsed.pads && setPads) {
					setPads((prevPads) => prevPads.map((pad, idx) => {
						if (parsed.pads[idx]) {
							return {
								...pad,
								name: parsed.pads[idx].name || pad.name,
								category: parsed.pads[idx].category || pad.category,
								volume: parsed.pads[idx].volume || pad.volume,
								isPlaying: idx < 4 ? true : pad.isPlaying
							};
						}
						return pad;
					}));
				}
			} else {
				setLlmOutput("Failed to receive structured content from Gemini.");
			}
		} catch (error) {
			console.error(error);
			setLlmOutput(`Error generating with Gemini API: ${error.message || error}`);
		} finally {
			setIsGenerating(false);
		}
	};
	return /* @__PURE__ */ _jsxDEV("div", {
		className: "p-5 h-full flex flex-col gap-4 bg-slate-900 font-mono text-xs text-slate-300 overflow-y-auto",
		children: [
			/* @__PURE__ */ _jsxDEV("div", {
				className: "flex items-center justify-between border-b border-fuchsia-900/50 pb-3",
				children: [/* @__PURE__ */ _jsxDEV("div", {
					className: "flex items-center gap-2 text-fuchsia-400 font-bold tracking-wider",
					children: [/* @__PURE__ */ _jsxDEV(Bot, { size: 18 }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 833,
						columnNumber: 11
					}, this), /* @__PURE__ */ _jsxDEV("span", { children: "GEMINI AI PRODUCER ENGINE" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 834,
						columnNumber: 11
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 832,
					columnNumber: 9
				}, this), /* @__PURE__ */ _jsxDEV("span", {
					className: "px-2 py-0.5 bg-fuchsia-950 border border-fuchsia-800 text-fuchsia-300 text-[10px] rounded",
					children: "gemini-2.5-flash"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 836,
					columnNumber: 9
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 831,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ _jsxDEV("div", {
				className: "flex flex-col gap-2",
				children: [/* @__PURE__ */ _jsxDEV("label", {
					className: "text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5",
					children: [/* @__PURE__ */ _jsxDEV(Wand2, {
						size: 12,
						className: "text-fuchsia-400"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 843,
						columnNumber: 11
					}, this), "Music Style Prompt"]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 842,
					columnNumber: 9
				}, this), /* @__PURE__ */ _jsxDEV("textarea", {
					value: promptText,
					onChange: (e) => setPromptText(e.target.value),
					rows: 3,
					className: "w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-slate-100 resize-none focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 focus:outline-none shadow-inner leading-relaxed text-xs",
					placeholder: "Describe the genre, tempo, instruments, and mood..."
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 846,
					columnNumber: 9
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 841,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ _jsxDEV("button", {
				onClick: handleGeminiGenerate,
				disabled: isGenerating,
				className: "w-full bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-black py-3 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-[0_0_15px_rgba(192,38,211,0.3)] active:scale-[0.99]",
				children: [isGenerating ? /* @__PURE__ */ _jsxDEV(RefreshCw, {
					size: 16,
					className: "animate-spin"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 860,
					columnNumber: 25
				}, this) : /* @__PURE__ */ _jsxDEV(Sparkles, { size: 16 }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 860,
					columnNumber: 76
				}, this), isGenerating ? "GENERATING WITH GEMINI..." : "GENERATE TRACK & APPLY TO DAW"]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 855,
				columnNumber: 7
			}, this),
			parsedData && /* @__PURE__ */ _jsxDEV("div", {
				className: "grid grid-cols-3 gap-2 bg-slate-950 p-3 rounded-lg border border-slate-800",
				children: [
					/* @__PURE__ */ _jsxDEV("div", { children: [/* @__PURE__ */ _jsxDEV("span", {
						className: "text-[9px] text-slate-500 block",
						children: "GENRE"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 867,
						columnNumber: 13
					}, this), /* @__PURE__ */ _jsxDEV("span", {
						className: "font-bold text-fuchsia-300",
						children: parsedData.genre || "Custom"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 868,
						columnNumber: 13
					}, this)] }, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 866,
						columnNumber: 11
					}, this),
					/* @__PURE__ */ _jsxDEV("div", { children: [/* @__PURE__ */ _jsxDEV("span", {
						className: "text-[9px] text-slate-500 block",
						children: "TEMPO"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 871,
						columnNumber: 13
					}, this), /* @__PURE__ */ _jsxDEV("span", {
						className: "font-bold text-cyan-300",
						children: [parsedData.bpm || 120, " BPM"]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 872,
						columnNumber: 13
					}, this)] }, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 870,
						columnNumber: 11
					}, this),
					/* @__PURE__ */ _jsxDEV("div", { children: [/* @__PURE__ */ _jsxDEV("span", {
						className: "text-[9px] text-slate-500 block",
						children: "KEY"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 875,
						columnNumber: 13
					}, this), /* @__PURE__ */ _jsxDEV("span", {
						className: "font-bold text-emerald-300",
						children: parsedData.key || "A Minor"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 876,
						columnNumber: 13
					}, this)] }, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 874,
						columnNumber: 11
					}, this)
				]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 865,
				columnNumber: 9
			}, this),
			/* @__PURE__ */ _jsxDEV("div", {
				className: "flex-1 flex flex-col gap-1 min-h-[120px]",
				children: [/* @__PURE__ */ _jsxDEV("span", {
					className: "text-[10px] text-slate-500 font-bold flex items-center gap-1",
					children: [/* @__PURE__ */ _jsxDEV(Terminal, { size: 12 }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 883,
						columnNumber: 11
					}, this), " GEMINI RESPONSE DATA"]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 882,
					columnNumber: 9
				}, this), /* @__PURE__ */ _jsxDEV("pre", {
					className: "flex-1 bg-slate-950 border border-slate-800 rounded-lg p-3 text-[10px] text-emerald-400 overflow-x-auto overflow-y-auto shadow-inner leading-normal font-mono",
					children: llmOutput || "// Press 'GENERATE TRACK' to call the Gemini API."
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 885,
					columnNumber: 9
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 881,
				columnNumber: 7
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 830,
		columnNumber: 5
	}, this);
};
const StepSequencer = () => /* @__PURE__ */ _jsxDEV("div", {
	className: "h-full bg-slate-900 p-4 flex flex-col gap-2 font-mono",
	children: [
		"KICK",
		"SNARE",
		"HIHAT",
		"PERC",
		"BASS",
		"SYNTH"
	].map((track, i) => /* @__PURE__ */ _jsxDEV("div", {
		className: "flex items-center gap-4 p-2 bg-slate-950/50 rounded border border-slate-800",
		children: [/* @__PURE__ */ _jsxDEV("div", {
			className: "w-16 flex-shrink-0 flex items-center gap-2",
			children: [/* @__PURE__ */ _jsxDEV("div", { className: `w-2 h-2 rounded-full ${i === 0 ? "bg-emerald-400" : i === 4 ? "bg-indigo-400" : "bg-slate-500"}` }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 898,
				columnNumber: 13
			}, this), /* @__PURE__ */ _jsxDEV("span", {
				className: "text-[10px] text-slate-300 font-bold",
				children: track
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 899,
				columnNumber: 13
			}, this)]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 897,
			columnNumber: 10
		}, this), /* @__PURE__ */ _jsxDEV("div", {
			className: "flex-1 grid grid-cols-16 gap-1",
			children: Array.from({ length: 16 }).map((_, j) => {
				const active = Math.random() > .8;
				return /* @__PURE__ */ _jsxDEV("div", { className: `h-8 rounded-sm ${active ? i === 0 ? "bg-emerald-500" : i === 4 ? "bg-indigo-500" : "bg-slate-400" : "bg-slate-800"} ${j % 4 === 0 ? "opacity-100" : "opacity-70"}` }, j, false, {
					fileName: _jsxFileName,
					lineNumber: 904,
					columnNumber: 23
				}, this);
			})
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 901,
			columnNumber: 10
		}, this)]
	}, track, true, {
		fileName: _jsxFileName,
		lineNumber: 896,
		columnNumber: 8
	}, this))
}, void 0, false, {
	fileName: _jsxFileName,
	lineNumber: 894,
	columnNumber: 3
}, this);
const ModularPatchBay = () => /* @__PURE__ */ _jsxDEV("div", {
	className: "h-full bg-slate-900 p-6 relative overflow-hidden flex flex-col items-center justify-center",
	children: [/* @__PURE__ */ _jsxDEV(Network, {
		size: 120,
		className: "text-slate-800/50 absolute"
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 914,
		columnNumber: 6
	}, this), /* @__PURE__ */ _jsxDEV("div", {
		className: "grid grid-cols-4 gap-8 z-10",
		children: Array.from({ length: 12 }).map((_, i) => /* @__PURE__ */ _jsxDEV("div", {
			className: "w-16 h-16 rounded-full bg-slate-950 border-4 border-slate-800 flex items-center justify-center shadow-inner relative group",
			children: [/* @__PURE__ */ _jsxDEV("div", { className: `w-6 h-6 rounded-full ${i % 3 === 0 ? "bg-orange-500 shadow-[0_0_15px_#f97316]" : "bg-slate-900"} inner-shadow-lg` }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 918,
				columnNumber: 15
			}, this), /* @__PURE__ */ _jsxDEV("span", {
				className: "absolute -bottom-5 text-[9px] text-slate-500 font-mono font-bold whitespace-nowrap",
				children: ["NODE_0", i + 1]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 919,
				columnNumber: 15
			}, this)]
		}, i, true, {
			fileName: _jsxFileName,
			lineNumber: 917,
			columnNumber: 12
		}, this))
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 915,
		columnNumber: 6
	}, this)]
}, void 0, true, {
	fileName: _jsxFileName,
	lineNumber: 913,
	columnNumber: 3
}, this);
const XYPerformancePad = () => /* @__PURE__ */ _jsxDEV("div", {
	className: "h-full bg-slate-900 p-6 flex flex-col gap-4 items-center relative",
	children: /* @__PURE__ */ _jsxDEV("div", {
		className: "w-full flex-1 max-w-sm border-2 border-slate-700 bg-slate-950 rounded-2xl relative overflow-hidden shadow-inner cursor-crosshair group",
		children: [
			/* @__PURE__ */ _jsxDEV("div", {
				className: "absolute inset-0 grid grid-cols-4 grid-rows-4 opacity-20",
				children: Array.from({ length: 16 }).map((_, i) => /* @__PURE__ */ _jsxDEV("div", { className: "border border-pink-500/30" }, i, false, {
					fileName: _jsxFileName,
					lineNumber: 930,
					columnNumber: 51
				}, this))
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 929,
				columnNumber: 9
			}, this),
			/* @__PURE__ */ _jsxDEV("div", { className: "absolute top-1/2 left-1/3 w-8 h-8 -ml-4 -mt-4 bg-pink-500 rounded-full shadow-[0_0_20px_#ec4899] border-2 border-white pointer-events-none group-hover:scale-110 transition-transform" }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 932,
				columnNumber: 9
			}, this),
			/* @__PURE__ */ _jsxDEV("span", {
				className: "absolute bottom-3 left-3 text-[10px] font-mono text-pink-500/50",
				children: "FILTER HP/LP"
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 933,
				columnNumber: 9
			}, this),
			/* @__PURE__ */ _jsxDEV("span", {
				className: "absolute top-3 right-3 text-[10px] font-mono text-pink-500/50 transform rotate-90 origin-right",
				children: "DELAY FB"
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 934,
				columnNumber: 9
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 928,
		columnNumber: 6
	}, this)
}, void 0, false, {
	fileName: _jsxFileName,
	lineNumber: 927,
	columnNumber: 3
}, this);
const SampleCrate = () => {
	const [selectedFolder, setSelectedFolder] = useState("Kicks");
	const [playingSample, setPlayingSample] = useState(null);
	const [importedSamples, setImportedSamples] = useState([]);
	const fileInputRef = useRef(null);
	const folders = [
		"Kicks",
		"Snares",
		"Synths",
		"Vocals",
		"FX",
		"Imported"
	];
	const defaultSamples = {
		Kicks: [
			{
				name: "Kick_808_Punch.wav",
				dur: "0.8s",
				bpm: 120,
				key: "C1"
			},
			{
				name: "Kick_House_Deep.wav",
				dur: "1.2s",
				bpm: 124,
				key: "F1"
			},
			{
				name: "Kick_Trap_Sub.wav",
				dur: "0.9s",
				bpm: 140,
				key: "G1"
			}
		],
		Snares: [{
			name: "Snare_Crisp_A.wav",
			dur: "0.5s",
			bpm: 120,
			key: "D2"
		}, {
			name: "Snare_Clap_Stadium.wav",
			dur: "0.7s",
			bpm: 124,
			key: "A2"
		}],
		Synths: [{
			name: "Synth_Saw_Lead.wav",
			dur: "2.4s",
			bpm: 124,
			key: "A Minor"
		}, {
			name: "Synth_Chords_Retro.wav",
			dur: "4.0s",
			bpm: 115,
			key: "C Major"
		}],
		Vocals: [{
			name: "Vocal_Chop_Heaven.wav",
			dur: "1.4s",
			bpm: 128,
			key: "F# Minor"
		}, {
			name: "Vocal_Phrase_Yeah.wav",
			dur: "0.9s",
			bpm: 120,
			key: "E Minor"
		}],
		FX: [{
			name: "FX_Cyber_Riser.wav",
			dur: "4.0s",
			bpm: 124,
			key: "N/A"
		}, {
			name: "FX_Glitch_Hit.wav",
			dur: "0.3s",
			bpm: 140,
			key: "N/A"
		}],
		Imported: importedSamples
	};
	const handleFileChange = (e) => {
		const files = e.target.files;
		if (!files || files.length === 0) return;
		const newItems = Array.from(files).map((file) => ({
			name: file.name,
			dur: `${(Math.random() * 2 + .5).toFixed(1)}s`,
			bpm: 120,
			key: "Custom"
		}));
		setImportedSamples((prev) => [...prev, ...newItems]);
		setSelectedFolder("Imported");
	};
	return /* @__PURE__ */ _jsxDEV("div", {
		className: "h-full bg-slate-900 p-6 flex gap-4 font-mono text-xs text-slate-300 overflow-hidden",
		children: [
			/* @__PURE__ */ _jsxDEV("input", {
				type: "file",
				ref: fileInputRef,
				onChange: handleFileChange,
				accept: "audio/*",
				multiple: true,
				className: "hidden"
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 986,
				columnNumber: 8
			}, this),
			/* @__PURE__ */ _jsxDEV("div", {
				className: "w-44 bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col gap-2",
				children: [
					/* @__PURE__ */ _jsxDEV("span", {
						className: "text-[10px] text-blue-400 font-bold tracking-widest border-b border-slate-800 pb-2 mb-1 flex items-center gap-1.5",
						children: [/* @__PURE__ */ _jsxDEV(Folder, { size: 14 }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 998,
							columnNumber: 12
						}, this), " CRATE LIBRARIES"]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 997,
						columnNumber: 10
					}, this),
					folders.map((folder) => /* @__PURE__ */ _jsxDEV("button", {
						onClick: () => setSelectedFolder(folder),
						className: `flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors font-bold ${selectedFolder === folder ? "bg-blue-600/20 text-blue-300 border border-blue-500/50 shadow-[0_0_10px_rgba(59,130,246,0.15)]" : "hover:bg-slate-900 text-slate-400"}`,
						children: [/* @__PURE__ */ _jsxDEV("div", {
							className: "flex items-center gap-2 truncate",
							children: [/* @__PURE__ */ _jsxDEV(Folder, {
								size: 12,
								className: selectedFolder === folder ? "text-blue-400" : "text-slate-500"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 1011,
								columnNumber: 16
							}, this), /* @__PURE__ */ _jsxDEV("span", {
								className: "truncate",
								children: ["/", folder]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 1012,
								columnNumber: 16
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 1010,
							columnNumber: 14
						}, this), folder === "Imported" && importedSamples.length > 0 && /* @__PURE__ */ _jsxDEV("span", {
							className: "px-1.5 py-0.5 bg-blue-950 text-blue-400 text-[9px] rounded border border-blue-800",
							children: importedSamples.length
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 1015,
							columnNumber: 16
						}, this)]
					}, folder, true, {
						fileName: _jsxFileName,
						lineNumber: 1001,
						columnNumber: 12
					}, this)),
					/* @__PURE__ */ _jsxDEV("button", {
						onClick: () => fileInputRef.current?.click(),
						className: "mt-auto w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-[0_0_12px_rgba(37,99,235,0.3)] cursor-pointer",
						children: [/* @__PURE__ */ _jsxDEV(Folder, { size: 14 }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 1024,
							columnNumber: 12
						}, this), " IMPORT LOCAL FILE"]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 1020,
						columnNumber: 10
					}, this)
				]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 996,
				columnNumber: 8
			}, this),
			/* @__PURE__ */ _jsxDEV("div", {
				className: "flex-1 bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col gap-4 overflow-y-auto",
				children: [/* @__PURE__ */ _jsxDEV("div", {
					className: "flex justify-between items-center border-b border-slate-800 pb-2",
					children: [/* @__PURE__ */ _jsxDEV("span", {
						className: "text-blue-400 font-bold tracking-widest",
						children: ["DIRECTORY: /", selectedFolder]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 1031,
						columnNumber: 12
					}, this), /* @__PURE__ */ _jsxDEV("span", {
						className: "text-[10px] text-slate-500",
						children: [defaultSamples[selectedFolder]?.length || 0, " SAMPLES"]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 1032,
						columnNumber: 12
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 1030,
					columnNumber: 10
				}, this), /* @__PURE__ */ _jsxDEV("div", {
					className: "flex flex-col gap-2",
					children: defaultSamples[selectedFolder]?.length === 0 ? /* @__PURE__ */ _jsxDEV("div", {
						className: "h-40 flex flex-col items-center justify-center gap-2 text-slate-500 border-2 border-dashed border-slate-800 rounded-xl",
						children: [/* @__PURE__ */ _jsxDEV(Folder, {
							size: 32,
							className: "text-slate-700"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 1038,
							columnNumber: 16
						}, this), /* @__PURE__ */ _jsxDEV("span", { children: "No samples in this folder. Click 'Import Local File' to add audio." }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 1039,
							columnNumber: 16
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 1037,
						columnNumber: 14
					}, this) : defaultSamples[selectedFolder]?.map((sample, i) => /* @__PURE__ */ _jsxDEV("div", {
						className: "bg-slate-900 p-3 rounded-xl border border-slate-800/80 flex items-center justify-between hover:border-slate-700 transition-colors",
						children: [/* @__PURE__ */ _jsxDEV("div", {
							className: "flex items-center gap-3",
							children: [/* @__PURE__ */ _jsxDEV("button", {
								onClick: () => setPlayingSample(playingSample === sample.name ? null : sample.name),
								className: "w-8 h-8 rounded-full bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white flex items-center justify-center transition-colors",
								children: playingSample === sample.name ? /* @__PURE__ */ _jsxDEV(Square, {
									size: 12,
									fill: "currentColor"
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 1049,
									columnNumber: 55
								}, this) : /* @__PURE__ */ _jsxDEV(Play, {
									size: 12,
									fill: "currentColor",
									className: "ml-0.5"
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 1049,
									columnNumber: 98
								}, this)
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 1045,
								columnNumber: 20
							}, this), /* @__PURE__ */ _jsxDEV("div", {
								className: "flex flex-col",
								children: [/* @__PURE__ */ _jsxDEV("span", {
									className: "font-bold text-slate-200",
									children: sample.name
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 1052,
									columnNumber: 22
								}, this), /* @__PURE__ */ _jsxDEV("span", {
									className: "text-[9px] text-slate-500",
									children: [
										"Key: ",
										sample.key,
										" • BPM: ",
										sample.bpm,
										" • Len: ",
										sample.dur
									]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 1053,
									columnNumber: 22
								}, this)]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 1051,
								columnNumber: 20
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 1044,
							columnNumber: 18
						}, this), /* @__PURE__ */ _jsxDEV("div", {
							className: "flex items-center gap-2",
							children: [/* @__PURE__ */ _jsxDEV("div", {
								className: "w-24 h-6 bg-slate-950 rounded border border-slate-800 flex items-center px-1",
								children: /* @__PURE__ */ _jsxDEV("div", {
									className: "w-full h-2 bg-blue-500/30 rounded-full overflow-hidden flex",
									children: /* @__PURE__ */ _jsxDEV("div", { className: "w-3/4 bg-blue-400 h-full rounded-full animate-pulse" }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 1059,
										columnNumber: 24
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 1058,
									columnNumber: 22
								}, this)
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 1057,
								columnNumber: 20
							}, this), /* @__PURE__ */ _jsxDEV("button", {
								onClick: () => alert(`Loaded "${sample.name}" into active Sampler pad slot!`),
								className: "px-3 py-1 bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white rounded text-[10px] font-bold transition-colors cursor-pointer",
								children: "LOAD TO PAD"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 1062,
								columnNumber: 20
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 1056,
							columnNumber: 18
						}, this)]
					}, i, true, {
						fileName: _jsxFileName,
						lineNumber: 1043,
						columnNumber: 16
					}, this))
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 1035,
					columnNumber: 10
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 1029,
				columnNumber: 8
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 985,
		columnNumber: 5
	}, this);
};
const PresetManager = ({ pads, bpm, masterVolume, onLoadPreset }) => {
	const [presetName, setPresetName] = useState("My DAW Project");
	const [savedPresets, setSavedPresets] = useState([]);
	const [statusMessage, setStatusMessage] = useState("");
	const [isRecordingAudio, setIsRecordingAudio] = useState(false);
	useEffect(() => {
		try {
			const stored = localStorage.getItem("remix_os_presets_v1");
			if (stored) {
				setSavedPresets(JSON.parse(stored));
			}
		} catch (e) {
			console.error(e);
		}
	}, []);
	const handleSavePreset = () => {
		if (!presetName.trim()) return;
		const newPreset = {
			name: presetName.trim(),
			date: new Date().toLocaleString(),
			bpm,
			pads,
			masterVolume
		};
		const updated = [newPreset, ...savedPresets.filter((p) => p.name !== newPreset.name)];
		setSavedPresets(updated);
		try {
			localStorage.setItem("remix_os_presets_v1", JSON.stringify(updated));
			setStatusMessage(`Preset "${newPreset.name}" saved successfully to Local Storage!`);
			setTimeout(() => setStatusMessage(""), 3e3);
		} catch (e) {
			console.error(e);
			setStatusMessage("Error saving to Local Storage.");
		}
	};
	const handleLoadPreset = (preset) => {
		onLoadPreset(preset);
		setStatusMessage("Preset loaded into DAW successfully!");
		setTimeout(() => setStatusMessage(""), 3e3);
	};
	const handleDeletePreset = (name) => {
		const updated = savedPresets.filter((p) => p.name !== name);
		setSavedPresets(updated);
		localStorage.setItem("remix_os_presets_v1", JSON.stringify(updated));
	};
	const handleExportJSON = () => {
		const projectState = {
			version: "2.0",
			timestamp: new Date().toISOString(),
			bpm,
			masterVolume,
			pads
		};
		const blob = new Blob([JSON.stringify(projectState, null, 2)], { type: "application/json" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `remix-os-project-${Date.now()}.json`;
		a.click();
		URL.revokeObjectURL(url);
		setStatusMessage("Project exported as JSON file successfully!");
		setTimeout(() => setStatusMessage(""), 3e3);
	};
	const handleToggleRecordAudio = () => {
		if (!isRecordingAudio) {
			setIsRecordingAudio(true);
			audioEngine.startRecordingAudio((blob) => {
				const url = URL.createObjectURL(blob);
				const a = document.createElement("a");
				a.href = url;
				a.download = `remix-os-audio-render-${Date.now()}.webm`;
				a.click();
				URL.revokeObjectURL(url);
				setStatusMessage("Master audio rendered & downloaded successfully!");
				setTimeout(() => setStatusMessage(""), 4e3);
			});
			setStatusMessage("Recording audio output... Play your tracks, then click 'Stop Audio Recording'.");
		} else {
			setIsRecordingAudio(false);
			audioEngine.stopRecordingAudio();
		}
	};
	return /* @__PURE__ */ _jsxDEV("div", {
		className: "h-full bg-slate-900 p-6 flex flex-col gap-4 font-mono text-xs text-slate-300 overflow-y-auto",
		children: [
			/* @__PURE__ */ _jsxDEV("div", {
				className: "flex justify-between items-center bg-slate-950 p-3 rounded-lg border border-slate-800 shadow-md",
				children: [/* @__PURE__ */ _jsxDEV("span", {
					className: "font-black tracking-widest text-amber-400 flex items-center gap-2",
					children: [/* @__PURE__ */ _jsxDEV(Folder, { size: 16 }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 1171,
						columnNumber: 11
					}, this), " DAW PRESET & EXPORT MANAGER"]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 1170,
					columnNumber: 9
				}, this), /* @__PURE__ */ _jsxDEV("span", {
					className: "px-2 py-0.5 bg-amber-950 text-amber-300 text-[10px] rounded border border-amber-900",
					children: "v2.0"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 1173,
					columnNumber: 9
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 1169,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ _jsxDEV("div", {
				className: "bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col gap-3",
				children: [/* @__PURE__ */ _jsxDEV("span", {
					className: "text-[10px] text-cyan-400 font-bold uppercase tracking-wider",
					children: "PROJECT & AUDIO EXPORTS"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 1177,
					columnNumber: 9
				}, this), /* @__PURE__ */ _jsxDEV("div", {
					className: "grid grid-cols-2 gap-2",
					children: [/* @__PURE__ */ _jsxDEV("button", {
						onClick: handleExportJSON,
						className: "py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg transition-all shadow-[0_0_10px_rgba(8,145,178,0.3)] cursor-pointer",
						children: "EXPORT JSON FILE"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 1179,
						columnNumber: 11
					}, this), /* @__PURE__ */ _jsxDEV("button", {
						onClick: handleToggleRecordAudio,
						className: `py-2.5 font-bold rounded-lg transition-all cursor-pointer ${isRecordingAudio ? "bg-red-600 text-white shadow-[0_0_15px_#dc2626] animate-pulse" : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_10px_rgba(5,150,105,0.3)]"}`,
						children: isRecordingAudio ? "STOP RECORDING AUDIO" : "RENDER AUDIO (WAV/WEBM)"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 1185,
						columnNumber: 11
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 1178,
					columnNumber: 9
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 1176,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ _jsxDEV("div", {
				className: "bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col gap-3",
				children: [
					/* @__PURE__ */ _jsxDEV("span", {
						className: "text-[10px] text-amber-400 font-bold uppercase tracking-wider",
						children: "SAVE CURRENT PROJECT STATE"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 1195,
						columnNumber: 9
					}, this),
					/* @__PURE__ */ _jsxDEV("div", {
						className: "flex gap-2",
						children: [/* @__PURE__ */ _jsxDEV("input", {
							type: "text",
							value: presetName,
							onChange: (e) => setPresetName(e.target.value),
							placeholder: "Preset Name...",
							className: "flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 outline-none focus:border-amber-500 font-bold"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 1197,
							columnNumber: 11
						}, this), /* @__PURE__ */ _jsxDEV("button", {
							onClick: handleSavePreset,
							className: "px-5 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-black rounded-lg transition-all shadow-[0_0_12px_rgba(245,158,11,0.3)] cursor-pointer",
							children: "SAVE"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 1204,
							columnNumber: 11
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 1196,
						columnNumber: 9
					}, this),
					statusMessage && /* @__PURE__ */ _jsxDEV("div", {
						className: "p-2 bg-emerald-950 border border-emerald-800 text-emerald-400 text-[10px] rounded text-center font-bold",
						children: statusMessage
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 1212,
						columnNumber: 11
					}, this)
				]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 1194,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ _jsxDEV("div", {
				className: "flex-1 flex flex-col gap-2 min-h-[160px]",
				children: [/* @__PURE__ */ _jsxDEV("span", {
					className: "text-[10px] text-slate-500 font-bold",
					children: [
						"SAVED PRESETS (",
						savedPresets.length,
						")"
					]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 1219,
					columnNumber: 9
				}, this), /* @__PURE__ */ _jsxDEV("div", {
					className: "flex-1 bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-col gap-2 overflow-y-auto",
					children: savedPresets.length === 0 ? /* @__PURE__ */ _jsxDEV("div", {
						className: "text-slate-500 text-center py-8",
						children: "No saved presets found in local storage. Save your project above!"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 1222,
						columnNumber: 13
					}, this) : savedPresets.map((p, idx) => /* @__PURE__ */ _jsxDEV("div", {
						className: "flex items-center justify-between p-3 bg-slate-900 border border-slate-800 rounded-lg hover:border-slate-700",
						children: [/* @__PURE__ */ _jsxDEV("div", {
							className: "flex flex-col gap-0.5",
							children: [/* @__PURE__ */ _jsxDEV("span", {
								className: "font-bold text-slate-200",
								children: p.name
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 1227,
								columnNumber: 19
							}, this), /* @__PURE__ */ _jsxDEV("span", {
								className: "text-[9px] text-slate-500",
								children: [
									p.date,
									" • ",
									p.bpm,
									" BPM"
								]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 1228,
								columnNumber: 19
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 1226,
							columnNumber: 17
						}, this), /* @__PURE__ */ _jsxDEV("div", {
							className: "flex items-center gap-2",
							children: [/* @__PURE__ */ _jsxDEV("button", {
								onClick: () => handleLoadPreset(p),
								className: "px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded text-[10px] transition-colors",
								children: "LOAD"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 1231,
								columnNumber: 19
							}, this), /* @__PURE__ */ _jsxDEV("button", {
								onClick: () => handleDeletePreset(p.name),
								className: "px-3 py-1.5 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white font-bold rounded text-[10px] transition-colors",
								children: "DEL"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 1237,
								columnNumber: 19
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 1230,
							columnNumber: 17
						}, this)]
					}, idx, true, {
						fileName: _jsxFileName,
						lineNumber: 1225,
						columnNumber: 15
					}, this))
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 1220,
					columnNumber: 9
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 1218,
				columnNumber: 7
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 1168,
		columnNumber: 5
	}, this);
};
const MobileController = () => {
	const [motionTilt, setMotionTilt] = useState(false);
	return /* @__PURE__ */ _jsxDEV("div", {
		className: "h-full bg-slate-900 p-6 flex flex-col items-center justify-center font-mono text-xs",
		children: /* @__PURE__ */ _jsxDEV("div", {
			className: "w-72 bg-slate-950 border-4 border-slate-800 rounded-[2.5rem] p-4 flex flex-col gap-4 shadow-2xl relative overflow-hidden",
			children: [
				/* @__PURE__ */ _jsxDEV("div", { className: "w-24 h-4 bg-slate-800 rounded-full mx-auto mb-2" }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 1259,
					columnNumber: 10
				}, this),
				/* @__PURE__ */ _jsxDEV("div", {
					className: "flex justify-between items-center bg-slate-900 p-3 rounded-xl border border-slate-800",
					children: [/* @__PURE__ */ _jsxDEV("span", {
						className: "text-[10px] text-slate-400 font-bold",
						children: "REMIX OS REMOTE"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 1261,
						columnNumber: 12
					}, this), /* @__PURE__ */ _jsxDEV("span", { className: "w-2 h-2 rounded-full bg-emerald-400 animate-pulse" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 1262,
						columnNumber: 12
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 1260,
					columnNumber: 10
				}, this),
				/* @__PURE__ */ _jsxDEV("div", {
					className: "grid grid-cols-2 gap-2",
					children: [/* @__PURE__ */ _jsxDEV("button", {
						onClick: () => audioEngine.start(),
						className: "py-4 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-black shadow-[0_0_10px_rgba(8,145,178,0.3)]",
						children: "PLAY"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 1266,
						columnNumber: 12
					}, this), /* @__PURE__ */ _jsxDEV("button", {
						onClick: () => audioEngine.stop(),
						className: "py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-black",
						children: "STOP"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 1267,
						columnNumber: 12
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 1265,
					columnNumber: 10
				}, this),
				/* @__PURE__ */ _jsxDEV("div", {
					className: "h-32 bg-slate-900 rounded-xl border border-slate-800 relative overflow-hidden flex items-center justify-center cursor-crosshair",
					children: [/* @__PURE__ */ _jsxDEV("div", { className: "absolute inset-0 opacity-25 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-cyan-400 via-transparent to-transparent" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 1271,
						columnNumber: 12
					}, this), /* @__PURE__ */ _jsxDEV("span", {
						className: "text-[10px] text-slate-500",
						children: "XY PERFORMANCE PAD"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 1272,
						columnNumber: 12
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 1270,
					columnNumber: 10
				}, this),
				/* @__PURE__ */ _jsxDEV("button", {
					onClick: () => setMotionTilt(!motionTilt),
					className: `py-3 rounded-xl font-bold transition-colors ${motionTilt ? "bg-emerald-600 text-white shadow-[0_0_10px_#059669]" : "bg-slate-800 text-slate-400"}`,
					children: motionTilt ? "MOTION TILT: ACTIVE" : "ENABLE MOTION TILT"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 1275,
					columnNumber: 10
				}, this)
			]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 1258,
			columnNumber: 8
		}, this)
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 1257,
		columnNumber: 5
	}, this);
};
const Looper = () => {
	const [tracks, setTracks] = useState([
		{
			id: 1,
			name: "Track 1: Guitar Loop",
			state: "playing",
			vol: .8,
			muted: false,
			soloed: false
		},
		{
			id: 2,
			name: "Track 2: Vocal Harmony",
			state: "recording",
			vol: .85,
			muted: false,
			soloed: false
		},
		{
			id: 3,
			name: "Track 3: Synth Bass",
			state: "idle",
			vol: .75,
			muted: true,
			soloed: false
		},
		{
			id: 4,
			name: "Track 4: Percussion",
			state: "playing",
			vol: .9,
			muted: false,
			soloed: false
		}
	]);
	const [quantize, setQuantize] = useState("2 BARS");
	const toggleTrackState = (id) => {
		setTracks((prev) => prev.map((t) => {
			if (t.id === id) {
				const nextState = t.state === "playing" ? "recording" : t.state === "recording" ? "idle" : "playing";
				return {
					...t,
					state: nextState
				};
			}
			return t;
		}));
	};
	return /* @__PURE__ */ _jsxDEV("div", {
		className: "h-full bg-slate-900 p-6 flex flex-col gap-5 font-mono text-xs text-slate-300 overflow-y-auto",
		children: [/* @__PURE__ */ _jsxDEV("div", {
			className: "flex justify-between items-center bg-slate-950 p-3 rounded-lg border border-slate-800 shadow-md",
			children: [/* @__PURE__ */ _jsxDEV("span", {
				className: "font-black tracking-widest text-indigo-400 flex items-center gap-2",
				children: [/* @__PURE__ */ _jsxDEV(RefreshCw, { size: 16 }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 1309,
					columnNumber: 12
				}, this), " LIVE AUDIO LOOPER STATION"]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 1308,
				columnNumber: 10
			}, this), /* @__PURE__ */ _jsxDEV("div", {
				className: "flex items-center gap-2",
				children: [/* @__PURE__ */ _jsxDEV("span", {
					className: "text-[10px] text-slate-500",
					children: "QUANTIZE:"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 1312,
					columnNumber: 12
				}, this), [
					"1 BAR",
					"2 BARS",
					"4 BARS",
					"8 BARS"
				].map((q) => /* @__PURE__ */ _jsxDEV("button", {
					onClick: () => setQuantize(q),
					className: `px-2 py-0.5 rounded text-[10px] font-bold ${quantize === q ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400"}`,
					children: q
				}, q, false, {
					fileName: _jsxFileName,
					lineNumber: 1314,
					columnNumber: 14
				}, this))]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 1311,
				columnNumber: 10
			}, this)]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 1307,
			columnNumber: 8
		}, this), /* @__PURE__ */ _jsxDEV("div", {
			className: "flex flex-col gap-3",
			children: tracks.map((track) => /* @__PURE__ */ _jsxDEV("div", {
				className: "bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between gap-4",
				children: [
					/* @__PURE__ */ _jsxDEV("div", {
						className: "flex items-center gap-3 w-48",
						children: [/* @__PURE__ */ _jsxDEV("button", {
							onClick: () => toggleTrackState(track.id),
							className: `w-10 h-10 rounded-xl font-black text-xs uppercase flex items-center justify-center transition-all ${track.state === "recording" ? "bg-red-600 text-white shadow-[0_0_15px_#dc2626] animate-pulse" : track.state === "playing" ? "bg-indigo-600 text-white shadow-[0_0_15px_#4f46e5]" : "bg-slate-800 text-slate-500 hover:bg-slate-700"}`,
							children: track.state === "recording" ? "REC" : track.state === "playing" ? "PLAY" : "STOP"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 1330,
							columnNumber: 16
						}, this), /* @__PURE__ */ _jsxDEV("div", {
							className: "flex flex-col truncate",
							children: [/* @__PURE__ */ _jsxDEV("span", {
								className: "font-bold text-slate-200 truncate",
								children: track.name
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 1343,
								columnNumber: 18
							}, this), /* @__PURE__ */ _jsxDEV("span", {
								className: `text-[9px] uppercase ${track.state === "recording" ? "text-red-400" : track.state === "playing" ? "text-indigo-400" : "text-slate-500"}`,
								children: ["Status: ", track.state]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 1344,
								columnNumber: 18
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 1342,
							columnNumber: 16
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 1329,
						columnNumber: 14
					}, this),
					/* @__PURE__ */ _jsxDEV("div", {
						className: "flex-1 h-8 bg-slate-900 rounded border border-slate-800 flex items-center px-2 relative overflow-hidden",
						children: [/* @__PURE__ */ _jsxDEV("div", { className: "absolute inset-y-0 left-1/3 w-0.5 bg-indigo-500 z-10" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 1351,
							columnNumber: 16
						}, this), /* @__PURE__ */ _jsxDEV("div", {
							className: "w-full flex items-center gap-0.5",
							children: Array.from({ length: 40 }).map((_, i) => /* @__PURE__ */ _jsxDEV("div", {
								className: "flex-1 bg-indigo-500/40 rounded-sm",
								style: { height: `${Math.sin(i / 2) * 40 + 50}%` }
							}, i, false, {
								fileName: _jsxFileName,
								lineNumber: 1354,
								columnNumber: 20
							}, this))
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 1352,
							columnNumber: 16
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 1350,
						columnNumber: 14
					}, this),
					/* @__PURE__ */ _jsxDEV("div", {
						className: "flex items-center gap-2",
						children: [/* @__PURE__ */ _jsxDEV("button", {
							onClick: () => setTracks((prev) => prev.map((t) => t.id === track.id ? {
								...t,
								muted: !t.muted
							} : t)),
							className: `px-3 py-1.5 rounded text-[10px] font-bold ${track.muted ? "bg-red-500 text-white" : "bg-slate-800 text-slate-400"}`,
							children: "M"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 1360,
							columnNumber: 16
						}, this), /* @__PURE__ */ _jsxDEV("button", {
							onClick: () => setTracks((prev) => prev.map((t) => t.id === track.id ? {
								...t,
								soloed: !t.soloed
							} : t)),
							className: `px-3 py-1.5 rounded text-[10px] font-bold ${track.soloed ? "bg-yellow-400 text-slate-950" : "bg-slate-800 text-slate-400"}`,
							children: "S"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 1366,
							columnNumber: 16
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 1359,
						columnNumber: 14
					}, this)
				]
			}, track.id, true, {
				fileName: _jsxFileName,
				lineNumber: 1328,
				columnNumber: 12
			}, this))
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 1326,
			columnNumber: 8
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 1306,
		columnNumber: 5
	}, this);
};
const Sampler = () => {
	const [layers, setLayers] = useState([
		{
			id: 1,
			name: "Vocal_Chop_A.wav",
			layerName: "LAYER A (Transient)",
			loaded: true,
			duration: "1.4s",
			volume: 85,
			pitchOffset: 0,
			pan: 0,
			active: true,
			buffer: null,
			isDragging: false
		},
		{
			id: 2,
			name: "808_Sub_Kick.wav",
			layerName: "LAYER B (Body)",
			loaded: true,
			duration: "0.8s",
			volume: 90,
			pitchOffset: 0,
			pan: -.2,
			active: true,
			buffer: null,
			isDragging: false
		},
		{
			id: 3,
			name: "Snare_Crisp.wav",
			layerName: "LAYER C (Texture)",
			loaded: true,
			duration: "0.5s",
			volume: 75,
			pitchOffset: 2,
			pan: .2,
			active: true,
			buffer: null,
			isDragging: false
		},
		{
			id: 4,
			name: "Drop_Synth_Stab.wav",
			layerName: "LAYER D (FX)",
			loaded: false,
			duration: "Empty",
			volume: 60,
			pitchOffset: 0,
			pan: 0,
			active: false,
			buffer: null,
			isDragging: false
		}
	]);
	const [adsr, setAdsr] = useState({
		attack: 15,
		decay: 45,
		sustain: 70,
		release: 50
	});
	const [activeKeys, setActiveKeys] = useState([]);
	const fileInputRefs = useRef([]);
	const handleAdsrChange = (param, val) => {
		const updated = {
			...adsr,
			[param]: val
		};
		setAdsr(updated);
		audioEngine.setADSR(param, val);
	};
	const handleFileUpload = async (index, file) => {
		try {
			const arrayBuffer = await file.arrayBuffer();
			const decodedBuffer = await audioEngine.decodeAudioData(arrayBuffer);
			const durationStr = decodedBuffer ? `${decodedBuffer.duration.toFixed(1)}s` : "Loaded";
			setLayers((prev) => prev.map((l, i) => {
				if (i === index) {
					return {
						...l,
						name: file.name,
						loaded: true,
						duration: durationStr,
						buffer: decodedBuffer,
						active: true
					};
				}
				return l;
			}));
		} catch (err) {
			console.error("Failed to load sample:", err);
		}
	};
	const handleDrop = (index, e) => {
		e.preventDefault();
		e.stopPropagation();
		setLayers((prev) => prev.map((l, i) => i === index ? {
			...l,
			isDragging: false
		} : l));
		if (e.dataTransfer.files && e.dataTransfer.files[0]) {
			handleFileUpload(index, e.dataTransfer.files[0]);
		}
	};
	const handleDragOver = (index, e) => {
		e.preventDefault();
		e.stopPropagation();
		setLayers((prev) => prev.map((l, i) => i === index ? {
			...l,
			isDragging: true
		} : l));
	};
	const handleDragLeave = (index, e) => {
		e.preventDefault();
		e.stopPropagation();
		setLayers((prev) => prev.map((l, i) => i === index ? {
			...l,
			isDragging: false
		} : l));
	};
	const updateLayerParam = (index, param, val) => {
		setLayers((prev) => prev.map((l, i) => i === index ? {
			...l,
			[param]: val
		} : l));
	};
	const notes = [
		{
			name: "C3",
			freq: 130.81,
			isBlack: false
		},
		{
			name: "C#3",
			freq: 138.59,
			isBlack: true
		},
		{
			name: "D3",
			freq: 146.83,
			isBlack: false
		},
		{
			name: "D#3",
			freq: 155.56,
			isBlack: true
		},
		{
			name: "E3",
			freq: 164.81,
			isBlack: false
		},
		{
			name: "F3",
			freq: 174.61,
			isBlack: false
		},
		{
			name: "F#3",
			freq: 185,
			isBlack: true
		},
		{
			name: "G3",
			freq: 196,
			isBlack: false
		},
		{
			name: "G#3",
			freq: 207.65,
			isBlack: true
		},
		{
			name: "A3",
			freq: 220,
			isBlack: false
		},
		{
			name: "A#3",
			freq: 233.08,
			isBlack: true
		},
		{
			name: "B3",
			freq: 246.94,
			isBlack: false
		},
		{
			name: "C4",
			freq: 261.63,
			isBlack: false
		},
		{
			name: "C#4",
			freq: 277.18,
			isBlack: true
		},
		{
			name: "D4",
			freq: 293.66,
			isBlack: false
		},
		{
			name: "D#4",
			freq: 311.13,
			isBlack: true
		},
		{
			name: "E4",
			freq: 329.63,
			isBlack: false
		},
		{
			name: "F4",
			freq: 349.23,
			isBlack: false
		},
		{
			name: "F#4",
			freq: 369.99,
			isBlack: true
		},
		{
			name: "G4",
			freq: 392,
			isBlack: false
		},
		{
			name: "G#4",
			freq: 415.3,
			isBlack: true
		},
		{
			name: "A4",
			freq: 440,
			isBlack: false
		},
		{
			name: "A#4",
			freq: 466.16,
			isBlack: true
		},
		{
			name: "B4",
			freq: 493.88,
			isBlack: false
		}
	];
	const triggerNote = (noteIndex, freq) => {
		setActiveKeys((prev) => [...prev, noteIndex]);
		setTimeout(() => {
			setActiveKeys((prev) => prev.filter((k) => k !== noteIndex));
		}, 300);
		const layerSpecs = layers.map((l) => ({
			buffer: l.buffer,
			volume: l.volume / 100 * (l.active ? 1 : 0),
			pitchOffset: l.pitchOffset,
			pan: l.pan,
			active: l.active
		}));
		audioEngine.triggerPolyVoice(freq, layerSpecs, adsr);
	};
	const getAdsrSvgPath = () => {
		const a = adsr.attack / 100 * 60;
		const d = adsr.decay / 100 * 60;
		const s = 50 - adsr.sustain / 100 * 40;
		const r = adsr.release / 100 * 80;
		const startX = 10;
		const attackX = startX + a;
		const decayX = attackX + d;
		const sustainX = decayX + 40;
		const releaseX = sustainX + r;
		return `M ${startX} 50 L ${attackX} 10 L ${decayX} ${s} L ${sustainX} ${s} L ${releaseX} 50`;
	};
	return /* @__PURE__ */ _jsxDEV("div", {
		className: "h-full bg-slate-900 p-5 flex flex-col gap-4 font-mono text-xs text-slate-300 overflow-y-auto",
		children: [
			/* @__PURE__ */ _jsxDEV("div", {
				className: "flex justify-between items-center bg-slate-950 p-3 rounded-lg border border-slate-800 shadow-md",
				children: [/* @__PURE__ */ _jsxDEV("span", {
					className: "font-black tracking-widest text-teal-400 flex items-center gap-2",
					children: [/* @__PURE__ */ _jsxDEV(Music, { size: 16 }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 1509,
						columnNumber: 11
					}, this), " POLYPHONIC MULTI-SAMPLE LAYER ENGINE"]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 1508,
					columnNumber: 9
				}, this), /* @__PURE__ */ _jsxDEV("div", {
					className: "flex items-center gap-2",
					children: /* @__PURE__ */ _jsxDEV("span", {
						className: "px-2 py-0.5 bg-teal-950 text-teal-300 text-[10px] rounded border border-teal-800 font-bold",
						children: "4-LAYER POLYPHONIC"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 1512,
						columnNumber: 11
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 1511,
					columnNumber: 9
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 1507,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ _jsxDEV("div", {
				className: "grid grid-cols-2 gap-3",
				children: layers.map((layer, idx) => /* @__PURE__ */ _jsxDEV("div", {
					onDragOver: (e) => handleDragOver(idx, e),
					onDragLeave: (e) => handleDragLeave(idx, e),
					onDrop: (e) => handleDrop(idx, e),
					className: `p-3 rounded-xl border transition-all flex flex-col gap-2 relative ${layer.isDragging ? "bg-teal-950/80 border-teal-400 shadow-[0_0_20px_#2dd4bf]" : layer.active ? "bg-slate-950 border-slate-800 hover:border-slate-700" : "bg-slate-950/50 border-slate-900 opacity-70"}`,
					children: [
						/* @__PURE__ */ _jsxDEV("input", {
							type: "file",
							accept: "audio/*",
							ref: (el) => {
								fileInputRefs.current[idx] = el;
							},
							className: "hidden",
							onChange: (e) => {
								if (e.target.files && e.target.files[0]) {
									handleFileUpload(idx, e.target.files[0]);
								}
							}
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 1533,
							columnNumber: 13
						}, this),
						/* @__PURE__ */ _jsxDEV("div", {
							className: "flex justify-between items-center",
							children: [/* @__PURE__ */ _jsxDEV("span", {
								className: "text-[10px] text-teal-400 font-bold",
								children: layer.layerName
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 1546,
								columnNumber: 15
							}, this), /* @__PURE__ */ _jsxDEV("div", {
								className: "flex items-center gap-1.5",
								children: [/* @__PURE__ */ _jsxDEV("button", {
									onClick: () => updateLayerParam(idx, "active", !layer.active),
									className: `px-1.5 py-0.5 rounded text-[9px] font-bold uppercase transition-colors ${layer.active ? "bg-teal-600 text-white" : "bg-slate-800 text-slate-500"}`,
									children: layer.active ? "ON" : "MUTE"
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 1548,
									columnNumber: 17
								}, this), /* @__PURE__ */ _jsxDEV("span", {
									className: `text-[9px] px-1.5 py-0.5 rounded ${layer.loaded ? "bg-teal-950 text-teal-400 border border-teal-900" : "bg-slate-800 text-slate-500"}`,
									children: layer.duration
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 1556,
									columnNumber: 17
								}, this)]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 1547,
								columnNumber: 15
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 1545,
							columnNumber: 13
						}, this),
						/* @__PURE__ */ _jsxDEV("div", {
							className: "flex items-center justify-between bg-slate-900 p-2 rounded border border-slate-800",
							children: [/* @__PURE__ */ _jsxDEV("span", {
								className: "font-bold text-slate-200 truncate max-w-[160px] text-[11px]",
								children: layer.name
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 1563,
								columnNumber: 15
							}, this), /* @__PURE__ */ _jsxDEV("button", {
								onClick: () => fileInputRefs.current[idx]?.click(),
								className: "px-2 py-1 bg-teal-950 hover:bg-teal-900 border border-teal-800 text-teal-300 text-[9px] font-bold rounded transition-colors",
								children: "BROWSE"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 1564,
								columnNumber: 15
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 1562,
							columnNumber: 13
						}, this),
						/* @__PURE__ */ _jsxDEV("div", {
							onClick: () => fileInputRefs.current[idx]?.click(),
							className: "text-[9px] text-slate-500 text-center border border-dashed border-slate-800 hover:border-teal-500/50 rounded py-1 cursor-pointer transition-colors",
							children: "Drag & Drop local audio sample here"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 1572,
							columnNumber: 13
						}, this),
						/* @__PURE__ */ _jsxDEV("div", {
							className: "grid grid-cols-3 gap-1 pt-1 border-t border-slate-900",
							children: [
								/* @__PURE__ */ _jsxDEV(Knob, {
									label: "VOL",
									value: layer.volume,
									color: "teal",
									onChange: (v) => updateLayerParam(idx, "volume", v)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 1580,
									columnNumber: 15
								}, this),
								/* @__PURE__ */ _jsxDEV(Knob, {
									label: "PITCH",
									value: (layer.pitchOffset + 12) / 24 * 100,
									color: "teal",
									onChange: (v) => updateLayerParam(idx, "pitchOffset", Math.round(v / 100 * 24 - 12))
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 1586,
									columnNumber: 15
								}, this),
								/* @__PURE__ */ _jsxDEV(Knob, {
									label: "PAN",
									value: (layer.pan + 1) / 2 * 100,
									color: "teal",
									onChange: (v) => updateLayerParam(idx, "pan", v / 100 * 2 - 1)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 1592,
									columnNumber: 15
								}, this)
							]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 1579,
							columnNumber: 13
						}, this)
					]
				}, layer.id, true, {
					fileName: _jsxFileName,
					lineNumber: 1520,
					columnNumber: 11
				}, this))
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 1518,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ _jsxDEV("div", {
				className: "bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col gap-3",
				children: [/* @__PURE__ */ _jsxDEV("div", {
					className: "flex justify-between items-center border-b border-slate-800 pb-2",
					children: [/* @__PURE__ */ _jsxDEV("span", {
						className: "text-[10px] text-teal-400 font-bold tracking-widest",
						children: "DETAILED ADSR AMPLITUDE ENVELOPE"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 1605,
						columnNumber: 11
					}, this), /* @__PURE__ */ _jsxDEV("span", {
						className: "text-[9px] text-slate-500 font-mono",
						children: [
							"A: ",
							adsr.attack * 15,
							"ms | D: ",
							adsr.decay * 15,
							"ms | S: ",
							adsr.sustain,
							"% | R: ",
							adsr.release * 25,
							"ms"
						]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 1606,
						columnNumber: 11
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 1604,
					columnNumber: 9
				}, this), /* @__PURE__ */ _jsxDEV("div", {
					className: "flex gap-4 items-center",
					children: [/* @__PURE__ */ _jsxDEV("div", {
						className: "w-48 h-20 bg-slate-900/90 rounded-lg border border-slate-800 relative overflow-hidden flex items-center justify-center",
						children: /* @__PURE__ */ _jsxDEV("svg", {
							className: "w-full h-full p-2",
							viewBox: "0 0 240 60",
							children: [/* @__PURE__ */ _jsxDEV("path", {
								d: "M 0 50 L 240 50",
								stroke: "#1e293b",
								strokeWidth: "1"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 1614,
								columnNumber: 15
							}, this), /* @__PURE__ */ _jsxDEV("path", {
								d: getAdsrSvgPath(),
								fill: "none",
								stroke: "#2dd4bf",
								strokeWidth: "2.5",
								className: "drop-shadow-[0_0_8px_#2dd4bf]"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 1615,
								columnNumber: 15
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 1613,
							columnNumber: 13
						}, this)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 1612,
						columnNumber: 11
					}, this), /* @__PURE__ */ _jsxDEV("div", {
						className: "flex-1 flex justify-around items-center",
						children: [
							/* @__PURE__ */ _jsxDEV(Knob, {
								label: "ATTACK",
								value: adsr.attack,
								color: "emerald",
								onChange: (v) => handleAdsrChange("attack", v)
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 1626,
								columnNumber: 13
							}, this),
							/* @__PURE__ */ _jsxDEV(Knob, {
								label: "DECAY",
								value: adsr.decay,
								color: "teal",
								onChange: (v) => handleAdsrChange("decay", v)
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 1627,
								columnNumber: 13
							}, this),
							/* @__PURE__ */ _jsxDEV(Knob, {
								label: "SUSTAIN",
								value: adsr.sustain,
								color: "teal",
								onChange: (v) => handleAdsrChange("sustain", v)
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 1628,
								columnNumber: 13
							}, this),
							/* @__PURE__ */ _jsxDEV(Knob, {
								label: "RELEASE",
								value: adsr.release,
								color: "teal",
								onChange: (v) => handleAdsrChange("release", v)
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 1629,
								columnNumber: 13
							}, this)
						]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 1625,
						columnNumber: 11
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 1611,
					columnNumber: 9
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 1603,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ _jsxDEV("div", {
				className: "bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col gap-2",
				children: [/* @__PURE__ */ _jsxDEV("div", {
					className: "flex justify-between items-center text-[10px] text-slate-400 font-bold",
					children: [/* @__PURE__ */ _jsxDEV("span", { children: "POLYPHONIC PLAYBACK KEYBOARD" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 1636,
						columnNumber: 11
					}, this), /* @__PURE__ */ _jsxDEV("span", {
						className: "text-teal-400",
						children: "MULTI-NOTE POLYPHONY ACTIVE"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 1637,
						columnNumber: 11
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 1635,
					columnNumber: 9
				}, this), /* @__PURE__ */ _jsxDEV("div", {
					className: "h-20 flex relative bg-slate-900 rounded-lg p-1 overflow-x-auto select-none",
					children: notes.map((note, idx) => {
						const isActive = activeKeys.includes(idx);
						if (!note.isBlack) {
							return /* @__PURE__ */ _jsxDEV("button", {
								onClick: () => triggerNote(idx, note.freq),
								className: `flex-1 min-w-[24px] h-full rounded-b transition-all border border-slate-300/40 relative flex flex-col justify-end p-1 text-[8px] font-bold ${isActive ? "bg-teal-400 text-slate-950 shadow-[0_0_12px_#2dd4bf]" : "bg-slate-100 text-slate-700 hover:bg-white"}`,
								children: /* @__PURE__ */ _jsxDEV("span", { children: note.name }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 1651,
									columnNumber: 19
								}, this)
							}, idx, false, {
								fileName: _jsxFileName,
								lineNumber: 1644,
								columnNumber: 17
							}, this);
						} else {
							return /* @__PURE__ */ _jsxDEV("button", {
								onClick: () => triggerNote(idx, note.freq),
								className: `w-4 h-11 bg-slate-900 border border-slate-700 rounded-b absolute z-10 -ml-2 transition-all ${isActive ? "bg-teal-400 shadow-[0_0_12px_#2dd4bf]" : "hover:bg-slate-800"}`,
								style: { left: `${idx * 3.8}%` }
							}, idx, false, {
								fileName: _jsxFileName,
								lineNumber: 1656,
								columnNumber: 17
							}, this);
						}
					})
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 1639,
					columnNumber: 9
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 1634,
				columnNumber: 7
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 1506,
		columnNumber: 5
	}, this);
};
const ParametricEQ = () => {
	const [bands, setBands] = useState([
		{
			name: "BAND 1 (LOW)",
			freq: 20,
			gain: 50,
			q: 60,
			color: "emerald"
		},
		{
			name: "BAND 2 (MID-LOW)",
			freq: 40,
			gain: 45,
			q: 50,
			color: "cyan"
		},
		{
			name: "BAND 3 (MID-HIGH)",
			freq: 65,
			gain: 55,
			q: 70,
			color: "violet"
		},
		{
			name: "BAND 4 (HIGH)",
			freq: 85,
			gain: 50,
			q: 40,
			color: "amber"
		}
	]);
	const [spectrumData, setSpectrumData] = useState(Array(32).fill(15));
	const canvasRef = useRef(null);
	useEffect(() => {
		let animationFrameId;
		const freqBuffer = new Uint8Array(64);
		const updateSpectrum = () => {
			audioEngine.getByteFrequencyData(freqBuffer);
			const newBars = [];
			for (let i = 0; i < 32; i++) {
				const val = freqBuffer[i * 2] || 0;
				const percent = Math.max(8, val / 255 * 100);
				newBars.push(percent);
			}
			setSpectrumData(newBars);
			const canvas = canvasRef.current;
			if (canvas) {
				const ctx = canvas.getContext("2d");
				if (ctx) {
					ctx.clearRect(0, 0, canvas.width, canvas.height);
					ctx.strokeStyle = "rgba(30, 41, 59, 0.4)";
					ctx.lineWidth = 1;
					for (let x = 0; x <= canvas.width; x += canvas.width / 8) {
						ctx.beginPath();
						ctx.moveTo(x, 0);
						ctx.lineTo(x, canvas.height);
						ctx.stroke();
					}
					ctx.beginPath();
					ctx.strokeStyle = "#34d399";
					ctx.lineWidth = 2.5;
					ctx.shadowBlur = 10;
					ctx.shadowColor = "#34d399";
					const points = bands.map((b, i) => {
						const x = i / 3 * (canvas.width - 40) + 20;
						const y = canvas.height - b.gain / 100 * canvas.height;
						return {
							x,
							y
						};
					});
					ctx.moveTo(0, canvas.height / 2);
					points.forEach((pt, i) => {
						if (i === 0) ctx.lineTo(pt.x, pt.y);
						else {
							const prev = points[i - 1];
							const cx = (prev.x + pt.x) / 2;
							ctx.bezierCurveTo(cx, prev.y, cx, pt.y, pt.x, pt.y);
						}
					});
					ctx.lineTo(canvas.width, canvas.height / 2);
					ctx.stroke();
					points.forEach((pt) => {
						ctx.beginPath();
						ctx.fillStyle = "#22d3ee";
						ctx.arc(pt.x, pt.y, 5, 0, Math.PI * 2);
						ctx.fill();
					});
				}
			}
			animationFrameId = requestAnimationFrame(updateSpectrum);
		};
		updateSpectrum();
		return () => cancelAnimationFrame(animationFrameId);
	}, [bands]);
	const handleBandChange = (bandIdx, param, value) => {
		const updated = [...bands];
		updated[bandIdx] = {
			...updated[bandIdx],
			[param]: value
		};
		setBands(updated);
		audioEngine.setEQBand(bandIdx, param, value);
	};
	return /* @__PURE__ */ _jsxDEV("div", {
		className: "h-full bg-slate-900 p-6 flex flex-col gap-5 font-mono text-xs text-slate-300 overflow-y-auto",
		children: [
			/* @__PURE__ */ _jsxDEV("div", {
				className: "flex justify-between items-center bg-slate-950 p-3 rounded-lg border border-slate-800 shadow-md",
				children: [/* @__PURE__ */ _jsxDEV("span", {
					className: "font-black tracking-widest text-emerald-300 flex items-center gap-2",
					children: [/* @__PURE__ */ _jsxDEV(BarChart, { size: 16 }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 1767,
						columnNumber: 11
					}, this), " PRO PARAMETRIC EQ 4-BAND (REAL-TIME SPECTRAL ANALYZER)"]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 1766,
					columnNumber: 9
				}, this), /* @__PURE__ */ _jsxDEV("span", {
					className: "px-2 py-0.5 bg-emerald-950 text-emerald-400 text-[10px] rounded border border-emerald-900 font-bold",
					children: "ANALYSER ACTIVE"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 1769,
					columnNumber: 9
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 1765,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ _jsxDEV("div", {
				className: "bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col gap-2 relative overflow-hidden shadow-inner",
				children: [/* @__PURE__ */ _jsxDEV("div", {
					className: "flex justify-between text-[9px] text-slate-500 px-1 font-bold",
					children: [
						/* @__PURE__ */ _jsxDEV("span", { children: "20Hz (SUB)" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 1776,
							columnNumber: 11
						}, this),
						/* @__PURE__ */ _jsxDEV("span", { children: "100Hz (BASS)" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 1777,
							columnNumber: 11
						}, this),
						/* @__PURE__ */ _jsxDEV("span", { children: "500Hz (MID)" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 1778,
							columnNumber: 11
						}, this),
						/* @__PURE__ */ _jsxDEV("span", { children: "2kHz (PRESENCE)" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 1779,
							columnNumber: 11
						}, this),
						/* @__PURE__ */ _jsxDEV("span", { children: "8kHz (TREBLE)" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 1780,
							columnNumber: 11
						}, this),
						/* @__PURE__ */ _jsxDEV("span", { children: "20kHz (AIR)" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 1781,
							columnNumber: 11
						}, this)
					]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 1775,
					columnNumber: 9
				}, this), /* @__PURE__ */ _jsxDEV("div", {
					className: "h-32 relative flex items-end gap-1 px-1 pt-2",
					children: [/* @__PURE__ */ _jsxDEV("canvas", {
						ref: canvasRef,
						width: 600,
						height: 128,
						className: "absolute inset-0 w-full h-full pointer-events-none z-10"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 1785,
						columnNumber: 11
					}, this), spectrumData.map((val, i) => /* @__PURE__ */ _jsxDEV("div", {
						className: "flex-1 h-full flex flex-col justify-end relative",
						children: [/* @__PURE__ */ _jsxDEV("div", {
							className: "w-full bg-gradient-to-t from-emerald-600 via-cyan-400 to-amber-300 rounded-t-sm transition-all duration-75 shadow-[0_0_8px_rgba(52,211,153,0.3)]",
							style: { height: `${val}%` }
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 1794,
							columnNumber: 15
						}, this), /* @__PURE__ */ _jsxDEV("div", {
							className: "w-full h-0.5 bg-amber-200 shadow-[0_0_5px_#fde047] absolute top-0 transition-all duration-150 opacity-80",
							style: { bottom: `${Math.min(98, val + 2)}%` }
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 1798,
							columnNumber: 15
						}, this)]
					}, i, true, {
						fileName: _jsxFileName,
						lineNumber: 1793,
						columnNumber: 13
					}, this))]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 1784,
					columnNumber: 9
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 1774,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ _jsxDEV("div", {
				className: "grid grid-cols-4 gap-3",
				children: bands.map((band, idx) => /* @__PURE__ */ _jsxDEV("div", {
					className: "bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col items-center gap-3 shadow-lg",
					children: [/* @__PURE__ */ _jsxDEV("span", {
						className: "text-[9px] font-bold text-slate-400 text-center tracking-wider",
						children: band.name
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 1810,
						columnNumber: 13
					}, this), /* @__PURE__ */ _jsxDEV("div", {
						className: "flex flex-col gap-3 items-center",
						children: [
							/* @__PURE__ */ _jsxDEV(Knob, {
								label: "FREQ",
								value: band.freq,
								color: band.color,
								onChange: (v) => handleBandChange(idx, "freq", v)
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 1812,
								columnNumber: 15
							}, this),
							/* @__PURE__ */ _jsxDEV(Knob, {
								label: "GAIN",
								value: band.gain,
								color: band.color,
								onChange: (v) => handleBandChange(idx, "gain", v)
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 1813,
								columnNumber: 15
							}, this),
							/* @__PURE__ */ _jsxDEV(Knob, {
								label: "Q",
								value: band.q,
								color: band.color,
								onChange: (v) => handleBandChange(idx, "q", v)
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 1814,
								columnNumber: 15
							}, this)
						]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 1811,
						columnNumber: 13
					}, this)]
				}, idx, true, {
					fileName: _jsxFileName,
					lineNumber: 1809,
					columnNumber: 11
				}, this))
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 1807,
				columnNumber: 7
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 1764,
		columnNumber: 5
	}, this);
};
const VoiceTrainer = () => {
	const [targetNote, setTargetNote] = useState("A4");
	const [detectedNote, setdetectedNote] = useState("A4 (440.2 Hz)");
	const [accuracy, setAccuracy] = useState(94);
	const [isTraining, setIsTraining] = useState(true);
	return /* @__PURE__ */ _jsxDEV("div", {
		className: "h-full bg-slate-900 p-6 flex flex-col gap-5 font-mono text-xs text-slate-300 overflow-y-auto",
		children: [
			/* @__PURE__ */ _jsxDEV("div", {
				className: "flex justify-between items-center bg-slate-950 p-3 rounded-lg border border-slate-800 shadow-md",
				children: [/* @__PURE__ */ _jsxDEV("span", {
					className: "font-black tracking-widest text-rose-400 flex items-center gap-2",
					children: [/* @__PURE__ */ _jsxDEV(Mic2, { size: 16 }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 1832,
						columnNumber: 12
					}, this), " VOICE PITCH TRAINER & TUNER"]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 1831,
					columnNumber: 10
				}, this), /* @__PURE__ */ _jsxDEV("span", {
					className: "px-2 py-0.5 bg-rose-950 text-rose-400 text-[10px] rounded border border-rose-900",
					children: "TUNER ACTIVE"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 1834,
					columnNumber: 10
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 1830,
				columnNumber: 8
			}, this),
			/* @__PURE__ */ _jsxDEV("div", {
				className: "bg-slate-950 p-6 rounded-xl border border-slate-800 flex flex-col items-center gap-4 shadow-inner",
				children: [
					/* @__PURE__ */ _jsxDEV("span", {
						className: "text-[10px] text-slate-500 uppercase font-bold",
						children: "DETECTED PITCH"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 1839,
						columnNumber: 10
					}, this),
					/* @__PURE__ */ _jsxDEV("div", {
						className: "text-4xl font-black text-rose-400 tracking-wider drop-shadow-[0_0_10px_rgba(244,63,94,0.4)]",
						children: detectedNote
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 1840,
						columnNumber: 10
					}, this),
					/* @__PURE__ */ _jsxDEV("div", {
						className: "w-full max-w-sm h-12 bg-slate-900 rounded-xl border border-slate-800 relative flex items-center justify-center overflow-hidden",
						children: [
							/* @__PURE__ */ _jsxDEV("div", { className: "absolute inset-x-0 top-1/2 h-0.5 bg-slate-800" }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 1846,
								columnNumber: 12
							}, this),
							/* @__PURE__ */ _jsxDEV("div", { className: "absolute top-0 bottom-0 w-1 bg-rose-500 shadow-[0_0_10px_#f43f5e] left-[52%]" }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 1847,
								columnNumber: 12
							}, this),
							/* @__PURE__ */ _jsxDEV("div", { className: "absolute inset-y-0 left-1/2 w-0.5 bg-emerald-400" }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 1848,
								columnNumber: 12
							}, this),
							/* @__PURE__ */ _jsxDEV("div", {
								className: "flex justify-between w-full px-4 text-[9px] text-slate-500 font-bold z-10",
								children: [
									/* @__PURE__ */ _jsxDEV("span", { children: "-50ct" }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 1850,
										columnNumber: 14
									}, this),
									/* @__PURE__ */ _jsxDEV("span", {
										className: "text-emerald-400",
										children: "0ct (IN TUNE)"
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 1851,
										columnNumber: 14
									}, this),
									/* @__PURE__ */ _jsxDEV("span", { children: "+50ct" }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 1852,
										columnNumber: 14
									}, this)
								]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 1849,
								columnNumber: 12
							}, this)
						]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 1845,
						columnNumber: 10
					}, this),
					/* @__PURE__ */ _jsxDEV("div", {
						className: "flex items-center gap-4 w-full justify-between pt-2",
						children: [/* @__PURE__ */ _jsxDEV("div", {
							className: "flex flex-col",
							children: [/* @__PURE__ */ _jsxDEV("span", {
								className: "text-[9px] text-slate-500",
								children: "TARGET NOTE"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 1858,
								columnNumber: 14
							}, this), /* @__PURE__ */ _jsxDEV("select", {
								value: targetNote,
								onChange: (e) => setTargetNote(e.target.value),
								className: "bg-slate-900 border border-slate-800 rounded px-2 py-1 text-rose-300 font-bold outline-none",
								children: [
									"C4",
									"D4",
									"E4",
									"F4",
									"G4",
									"A4",
									"B4"
								].map((n) => /* @__PURE__ */ _jsxDEV("option", {
									value: n,
									children: n
								}, n, false, {
									fileName: _jsxFileName,
									lineNumber: 1864,
									columnNumber: 69
								}, this))
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 1859,
								columnNumber: 14
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 1857,
							columnNumber: 12
						}, this), /* @__PURE__ */ _jsxDEV("div", {
							className: "flex flex-col items-end",
							children: [/* @__PURE__ */ _jsxDEV("span", {
								className: "text-[9px] text-slate-500",
								children: "ACCURACY SCORE"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 1868,
								columnNumber: 14
							}, this), /* @__PURE__ */ _jsxDEV("span", {
								className: "text-emerald-400 font-bold text-sm",
								children: [accuracy, "% IN TUNE"]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 1869,
								columnNumber: 14
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 1867,
							columnNumber: 12
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 1856,
						columnNumber: 10
					}, this)
				]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 1838,
				columnNumber: 8
			}, this),
			/* @__PURE__ */ _jsxDEV("button", {
				onClick: () => setIsTraining(!isTraining),
				className: `w-full py-3 rounded-xl font-black tracking-widest transition-all ${isTraining ? "bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.4)]" : "bg-slate-800 text-slate-400"}`,
				children: isTraining ? "STOP VOICE PRACTICE SESSION" : "START VOICE PRACTICE SESSION"
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 1874,
				columnNumber: 8
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 1829,
		columnNumber: 5
	}, this);
};
const VoiceChanger = () => {
	const [preset, setPreset] = useState("Robotic");
	const [formant, setFormant] = useState(50);
	const [pitchShift, setPitchShift] = useState(0);
	return /* @__PURE__ */ _jsxDEV("div", {
		className: "h-full bg-slate-900 p-6 flex flex-col gap-5 font-mono text-xs text-slate-300 overflow-y-auto",
		children: [
			/* @__PURE__ */ _jsxDEV("div", {
				className: "flex justify-between items-center bg-slate-950 p-3 rounded-lg border border-slate-800 shadow-md",
				children: [/* @__PURE__ */ _jsxDEV("span", {
					className: "font-black tracking-widest text-purple-400 flex items-center gap-2",
					children: [/* @__PURE__ */ _jsxDEV(Mic2, { size: 16 }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 1893,
						columnNumber: 12
					}, this), " VOCAL TRANSFORMER & FX"]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 1892,
					columnNumber: 10
				}, this), /* @__PURE__ */ _jsxDEV("span", {
					className: "px-2 py-0.5 bg-purple-950 text-purple-400 text-[10px] rounded border border-purple-900",
					children: "DSP RACK"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 1895,
					columnNumber: 10
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 1891,
				columnNumber: 8
			}, this),
			/* @__PURE__ */ _jsxDEV("div", {
				className: "grid grid-cols-4 gap-2",
				children: [
					"Clean",
					"Robotic",
					"Megaphone",
					"Demon Deep"
				].map((p) => /* @__PURE__ */ _jsxDEV("button", {
					onClick: () => setPreset(p),
					className: `py-2 rounded-lg font-bold transition-all border ${preset === p ? "bg-purple-600/20 text-purple-300 border-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.2)]" : "bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700"}`,
					children: p
				}, p, false, {
					fileName: _jsxFileName,
					lineNumber: 1901,
					columnNumber: 12
				}, this))
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 1899,
				columnNumber: 8
			}, this),
			/* @__PURE__ */ _jsxDEV("div", {
				className: "grid grid-cols-2 gap-4",
				children: [/* @__PURE__ */ _jsxDEV("div", {
					className: "bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col items-center gap-4",
					children: [/* @__PURE__ */ _jsxDEV("span", {
						className: "text-[10px] text-purple-400 font-bold tracking-widest border-b border-slate-800 pb-2 w-full text-center",
						children: "FORMANT SHIFT"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 1918,
						columnNumber: 12
					}, this), /* @__PURE__ */ _jsxDEV(Knob, {
						label: "FORMANT",
						value: formant,
						color: "violet",
						onChange: (v) => setFormant(v)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 1919,
						columnNumber: 12
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 1917,
					columnNumber: 10
				}, this), /* @__PURE__ */ _jsxDEV("div", {
					className: "bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col items-center gap-4",
					children: [/* @__PURE__ */ _jsxDEV("span", {
						className: "text-[10px] text-purple-400 font-bold tracking-widest border-b border-slate-800 pb-2 w-full text-center",
						children: "PITCH TRANSPOSITION"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 1923,
						columnNumber: 12
					}, this), /* @__PURE__ */ _jsxDEV(Knob, {
						label: "SEMITONES",
						value: pitchShift + 50,
						color: "violet",
						onChange: (v) => setPitchShift(v - 50)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 1924,
						columnNumber: 12
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 1922,
					columnNumber: 10
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 1916,
				columnNumber: 8
			}, this),
			/* @__PURE__ */ _jsxDEV("div", {
				className: "bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col gap-2 shadow-inner",
				children: [/* @__PURE__ */ _jsxDEV("span", {
					className: "text-[10px] text-slate-500",
					children: "REALTIME VOCAL FORMANT SPECTRUM"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 1930,
					columnNumber: 10
				}, this), /* @__PURE__ */ _jsxDEV("div", {
					className: "h-20 flex items-end gap-1",
					children: Array.from({ length: 30 }).map((_, i) => /* @__PURE__ */ _jsxDEV("div", {
						className: "flex-1 bg-gradient-to-t from-purple-600 to-indigo-400 rounded-t-sm",
						style: { height: `${Math.sin(i / 2) * 40 + Math.cos(i / 1.5) * 25 + 50}%` }
					}, i, false, {
						fileName: _jsxFileName,
						lineNumber: 1933,
						columnNumber: 14
					}, this))
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 1931,
					columnNumber: 10
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 1929,
				columnNumber: 8
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 1890,
		columnNumber: 5
	}, this);
};
const AdvancedTrim = () => {
	const [zoom, setZoom] = useState(1);
	const [startMarker, setStartMarker] = useState(0);
	const [endMarker, setEndMarker] = useState(100);
	const [normalized, setNormalized] = useState(false);
	return /* @__PURE__ */ _jsxDEV("div", {
		className: "h-full bg-slate-900 p-6 flex flex-col gap-5 font-mono text-xs text-slate-300 overflow-y-auto",
		children: [
			/* @__PURE__ */ _jsxDEV("div", {
				className: "flex justify-between items-center bg-slate-950 p-3 rounded-lg border border-slate-800 shadow-md",
				children: [/* @__PURE__ */ _jsxDEV("span", {
					className: "font-black tracking-widest text-blue-300 flex items-center gap-2",
					children: [/* @__PURE__ */ _jsxDEV(Scissors, { size: 16 }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 1950,
						columnNumber: 12
					}, this), " WAVEFORM AUDIO TRIMMER & NORMALIZE"]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 1949,
					columnNumber: 10
				}, this), /* @__PURE__ */ _jsxDEV("div", {
					className: "flex items-center gap-2",
					children: [
						/* @__PURE__ */ _jsxDEV("button", {
							onClick: () => setZoom(Math.max(.5, zoom - .25)),
							className: "px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-bold",
							children: "ZOOM -"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 1953,
							columnNumber: 12
						}, this),
						/* @__PURE__ */ _jsxDEV("button", {
							onClick: () => setZoom(1),
							className: "px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-bold",
							children: "1:1"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 1954,
							columnNumber: 12
						}, this),
						/* @__PURE__ */ _jsxDEV("button", {
							onClick: () => setZoom(Math.min(3, zoom + .25)),
							className: "px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-bold",
							children: "ZOOM +"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 1955,
							columnNumber: 12
						}, this)
					]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 1952,
					columnNumber: 10
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 1948,
				columnNumber: 8
			}, this),
			/* @__PURE__ */ _jsxDEV("div", {
				className: "bg-slate-950 p-5 rounded-xl border border-slate-800 flex flex-col gap-3 relative overflow-hidden shadow-inner",
				children: [/* @__PURE__ */ _jsxDEV("div", {
					className: "flex justify-between text-[9px] text-slate-500",
					children: [
						/* @__PURE__ */ _jsxDEV("span", { children: "0.0s" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 1962,
							columnNumber: 12
						}, this),
						/* @__PURE__ */ _jsxDEV("span", { children: "1.2s" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 1963,
							columnNumber: 12
						}, this),
						/* @__PURE__ */ _jsxDEV("span", { children: "2.4s" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 1964,
							columnNumber: 12
						}, this)
					]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 1961,
					columnNumber: 10
				}, this), /* @__PURE__ */ _jsxDEV("div", {
					className: "h-32 flex items-center gap-0.5 px-2 relative bg-slate-900/50 rounded-lg border border-slate-800",
					style: {
						transform: `scaleX(${zoom})`,
						transformOrigin: "left"
					},
					children: [/* @__PURE__ */ _jsxDEV("div", {
						className: "absolute inset-y-0 bg-blue-500/10 border-x-2 border-blue-400 z-10",
						style: {
							left: `${startMarker}%`,
							right: `${100 - endMarker}%`
						}
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 1968,
						columnNumber: 12
					}, this), Array.from({ length: 48 }).map((_, i) => /* @__PURE__ */ _jsxDEV("div", {
						className: `flex-1 rounded-sm transition-all ${normalized ? "bg-emerald-400" : "bg-blue-400"}`,
						style: { height: `${Math.sin(i / 2) * 40 + Math.cos(i / 1.5) * 30 + 50}%` }
					}, i, false, {
						fileName: _jsxFileName,
						lineNumber: 1971,
						columnNumber: 14
					}, this))]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 1966,
					columnNumber: 10
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 1960,
				columnNumber: 8
			}, this),
			/* @__PURE__ */ _jsxDEV("div", {
				className: "grid grid-cols-2 gap-4",
				children: [/* @__PURE__ */ _jsxDEV("div", {
					className: "bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col gap-3",
					children: [/* @__PURE__ */ _jsxDEV("span", {
						className: "text-[10px] text-blue-300 font-bold tracking-widest border-b border-slate-800 pb-2",
						children: "MARKER SELECTION"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 1983,
						columnNumber: 12
					}, this), /* @__PURE__ */ _jsxDEV("div", {
						className: "flex flex-col gap-2",
						children: [/* @__PURE__ */ _jsxDEV("div", {
							className: "flex justify-between",
							children: [/* @__PURE__ */ _jsxDEV("span", { children: [
								"Start Marker: ",
								(startMarker * .024).toFixed(2),
								"s"
							] }, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 1986,
								columnNumber: 16
							}, this), /* @__PURE__ */ _jsxDEV("input", {
								type: "range",
								min: 0,
								max: 40,
								value: startMarker,
								onChange: (e) => setStartMarker(Number(e.target.value)),
								className: "accent-blue-400"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 1987,
								columnNumber: 16
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 1985,
							columnNumber: 14
						}, this), /* @__PURE__ */ _jsxDEV("div", {
							className: "flex justify-between",
							children: [/* @__PURE__ */ _jsxDEV("span", { children: [
								"End Marker: ",
								(endMarker * .024).toFixed(2),
								"s"
							] }, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 1990,
								columnNumber: 16
							}, this), /* @__PURE__ */ _jsxDEV("input", {
								type: "range",
								min: 60,
								max: 100,
								value: endMarker,
								onChange: (e) => setEndMarker(Number(e.target.value)),
								className: "accent-blue-400"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 1991,
								columnNumber: 16
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 1989,
							columnNumber: 14
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 1984,
						columnNumber: 12
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 1982,
					columnNumber: 10
				}, this), /* @__PURE__ */ _jsxDEV("div", {
					className: "bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col gap-3",
					children: [/* @__PURE__ */ _jsxDEV("span", {
						className: "text-[10px] text-blue-300 font-bold tracking-widest border-b border-slate-800 pb-2",
						children: "DSP TOOLS"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 1997,
						columnNumber: 12
					}, this), /* @__PURE__ */ _jsxDEV("div", {
						className: "flex flex-col gap-2",
						children: [/* @__PURE__ */ _jsxDEV("button", {
							onClick: () => setNormalized(!normalized),
							className: `w-full py-2.5 rounded-lg font-bold transition-colors ${normalized ? "bg-emerald-600 text-white shadow-[0_0_10px_#059669]" : "bg-slate-800 hover:bg-slate-700 text-slate-300"}`,
							children: normalized ? "NORMALIZED TO 0dB (ACTIVE)" : "NORMALIZE AUDIO"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 1999,
							columnNumber: 14
						}, this), /* @__PURE__ */ _jsxDEV("button", {
							className: "w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-colors shadow-[0_0_10px_rgba(37,99,235,0.3)]",
							children: "CROP & EXPORT REGION"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 2005,
							columnNumber: 14
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 1998,
						columnNumber: 12
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 1996,
					columnNumber: 10
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 1981,
				columnNumber: 8
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 1947,
		columnNumber: 5
	}, this);
};
const ChannelMatrix = () => {
	const [matrix, setMatrix] = useState(Array(4).fill(null).map(() => Array(4).fill(false)));
	const tracks = [
		"Track 1: House",
		"Track 2: Sub Bass",
		"Track 3: Chords",
		"Track 4: FX Riser"
	];
	const destinations = [
		"Aux 1 Reverb",
		"Aux 2 Delay",
		"Bus A Submix",
		"Master Out"
	];
	const toggleCrosspoint = (r, c) => {
		const updated = matrix.map((row, ri) => row.map((val, ci) => ri === r && ci === c ? !val : val));
		setMatrix(updated);
	};
	return /* @__PURE__ */ _jsxDEV("div", {
		className: "h-full bg-slate-900 p-6 flex flex-col gap-5 font-mono text-xs text-slate-300 overflow-y-auto",
		children: [/* @__PURE__ */ _jsxDEV("div", {
			className: "flex justify-between items-center bg-slate-950 p-3 rounded-lg border border-slate-800 shadow-md",
			children: [/* @__PURE__ */ _jsxDEV("span", {
				className: "font-black tracking-widest text-cyan-300 flex items-center gap-2",
				children: [/* @__PURE__ */ _jsxDEV(LayoutGrid, { size: 16 }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 2030,
					columnNumber: 12
				}, this), " AUDIO ROUTING MATRIX (CROSIS)"]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 2029,
				columnNumber: 10
			}, this), /* @__PURE__ */ _jsxDEV("span", {
				className: "px-2 py-0.5 bg-cyan-950 text-cyan-400 text-[10px] rounded border border-cyan-900",
				children: "16x16 BUS"
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 2032,
				columnNumber: 10
			}, this)]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 2028,
			columnNumber: 8
		}, this), /* @__PURE__ */ _jsxDEV("div", {
			className: "bg-slate-950 p-4 rounded-xl border border-slate-800 overflow-x-auto",
			children: /* @__PURE__ */ _jsxDEV("table", {
				className: "w-full border-collapse",
				children: [/* @__PURE__ */ _jsxDEV("thead", { children: /* @__PURE__ */ _jsxDEV("tr", { children: [/* @__PURE__ */ _jsxDEV("th", {
					className: "p-2 text-left text-slate-500 font-bold border-b border-slate-800",
					children: "INPUT / BUS"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 2039,
					columnNumber: 16
				}, this), destinations.map((d, i) => /* @__PURE__ */ _jsxDEV("th", {
					className: "p-2 text-center text-cyan-400 font-bold border-b border-slate-800",
					children: d
				}, i, false, {
					fileName: _jsxFileName,
					lineNumber: 2041,
					columnNumber: 18
				}, this))] }, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 2038,
					columnNumber: 14
				}, this) }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 2037,
					columnNumber: 12
				}, this), /* @__PURE__ */ _jsxDEV("tbody", { children: tracks.map((t, ri) => /* @__PURE__ */ _jsxDEV("tr", {
					className: "border-b border-slate-900 hover:bg-slate-900/50",
					children: [/* @__PURE__ */ _jsxDEV("td", {
						className: "p-3 font-bold text-slate-200",
						children: t
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 2048,
						columnNumber: 18
					}, this), destinations.map((_, ci) => /* @__PURE__ */ _jsxDEV("td", {
						className: "p-3 text-center",
						children: /* @__PURE__ */ _jsxDEV("button", {
							onClick: () => toggleCrosspoint(ri, ci),
							className: `w-8 h-8 rounded-lg border transition-all ${matrix[ri][ci] ? "bg-cyan-500 border-white text-slate-950 shadow-[0_0_12px_#22d3ee]" : "bg-slate-900 border-slate-700 hover:bg-slate-800"}`,
							children: matrix[ri][ci] ? "ON" : ""
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 2051,
							columnNumber: 22
						}, this)
					}, ci, false, {
						fileName: _jsxFileName,
						lineNumber: 2050,
						columnNumber: 20
					}, this))]
				}, ri, true, {
					fileName: _jsxFileName,
					lineNumber: 2047,
					columnNumber: 16
				}, this)) }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 2045,
					columnNumber: 12
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 2036,
				columnNumber: 10
			}, this)
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 2035,
			columnNumber: 8
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 2027,
		columnNumber: 5
	}, this);
};
const VocalAutoTune = () => {
	const [scale, setScale] = useState("A Minor");
	const [retuneSpeed, setRetuneSpeed] = useState(15);
	return /* @__PURE__ */ _jsxDEV("div", {
		className: "h-full bg-slate-900 p-6 flex flex-col gap-5 font-mono text-xs text-slate-300 overflow-y-auto",
		children: [
			/* @__PURE__ */ _jsxDEV("div", {
				className: "flex justify-between items-center bg-slate-950 p-3 rounded-lg border border-slate-800 shadow-md",
				children: [/* @__PURE__ */ _jsxDEV("span", {
					className: "font-black tracking-widest text-violet-300 flex items-center gap-2",
					children: [/* @__PURE__ */ _jsxDEV(Music, { size: 16 }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 2079,
						columnNumber: 12
					}, this), " AUTOTUNE PRO PITCH CORRECTION"]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 2078,
					columnNumber: 10
				}, this), /* @__PURE__ */ _jsxDEV("span", {
					className: "px-2 py-0.5 bg-violet-950 text-violet-400 text-[10px] rounded border border-violet-900",
					children: "ZERO LATENCY"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 2081,
					columnNumber: 10
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 2077,
				columnNumber: 8
			}, this),
			/* @__PURE__ */ _jsxDEV("div", {
				className: "grid grid-cols-2 gap-4",
				children: [/* @__PURE__ */ _jsxDEV("div", {
					className: "bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col gap-3",
					children: [/* @__PURE__ */ _jsxDEV("span", {
						className: "text-[10px] text-violet-300 font-bold tracking-widest border-b border-slate-800 pb-2",
						children: "KEY & SCALE"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 2086,
						columnNumber: 12
					}, this), /* @__PURE__ */ _jsxDEV("select", {
						value: scale,
						onChange: (e) => setScale(e.target.value),
						className: "w-full bg-slate-900 border border-slate-800 rounded p-2 text-violet-300 font-bold outline-none",
						children: [
							"C Major",
							"A Minor",
							"G Major",
							"E Minor",
							"Chromatic"
						].map((s) => /* @__PURE__ */ _jsxDEV("option", {
							value: s,
							children: s
						}, s, false, {
							fileName: _jsxFileName,
							lineNumber: 2092,
							columnNumber: 82
						}, this))
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 2087,
						columnNumber: 12
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 2085,
					columnNumber: 10
				}, this), /* @__PURE__ */ _jsxDEV("div", {
					className: "bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col items-center gap-2",
					children: [/* @__PURE__ */ _jsxDEV("span", {
						className: "text-[10px] text-violet-300 font-bold tracking-widest border-b border-slate-800 pb-2 w-full text-center",
						children: "RETUNE SPEED (SNAP)"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 2097,
						columnNumber: 12
					}, this), /* @__PURE__ */ _jsxDEV(Knob, {
						label: "SPEED",
						value: retuneSpeed,
						color: "violet",
						onChange: (v) => setRetuneSpeed(v)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 2098,
						columnNumber: 12
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 2096,
					columnNumber: 10
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 2084,
				columnNumber: 8
			}, this),
			/* @__PURE__ */ _jsxDEV("div", {
				className: "bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col gap-2 shadow-inner",
				children: [/* @__PURE__ */ _jsxDEV("span", {
					className: "text-[10px] text-slate-500",
					children: "PITCH DETECTION & CORRECTION GRID"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 2104,
					columnNumber: 10
				}, this), /* @__PURE__ */ _jsxDEV("div", {
					className: "h-32 bg-slate-900 rounded-lg border border-slate-800 relative overflow-hidden flex flex-col justify-between p-2",
					children: [/* @__PURE__ */ _jsxDEV("div", {
						className: "absolute inset-0 grid grid-cols-8 grid-rows-4 opacity-20",
						children: Array.from({ length: 32 }).map((_, i) => /* @__PURE__ */ _jsxDEV("div", { className: "border border-violet-500" }, i, false, {
							fileName: _jsxFileName,
							lineNumber: 2107,
							columnNumber: 54
						}, this))
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 2106,
						columnNumber: 12
					}, this), /* @__PURE__ */ _jsxDEV("svg", {
						className: "absolute inset-0 w-full h-full pointer-events-none",
						preserveAspectRatio: "none",
						viewBox: "0 0 100 100",
						children: [/* @__PURE__ */ _jsxDEV("path", {
							d: "M 0,70 Q 25,40 50,60 T 100,30",
							fill: "none",
							stroke: "#a78bfa",
							strokeWidth: "3"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 2111,
							columnNumber: 14
						}, this), /* @__PURE__ */ _jsxDEV("path", {
							d: "M 0,65 Q 25,65 50,60 T 100,30",
							fill: "none",
							stroke: "#34d399",
							strokeWidth: "2",
							strokeDasharray: "4"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 2112,
							columnNumber: 14
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 2110,
						columnNumber: 12
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 2105,
					columnNumber: 10
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 2103,
				columnNumber: 8
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 2076,
		columnNumber: 5
	}, this);
};
const DJSetMixStudio = () => {
	const [crossfader, setCrossfader] = useState(50);
	const [deckAPlaying, setDeckAPlaying] = useState(true);
	const [deckBPlaying, setDeckBPlaying] = useState(false);
	return /* @__PURE__ */ _jsxDEV("div", {
		className: "h-full bg-slate-900 p-6 flex flex-col gap-5 font-mono text-xs text-slate-300 overflow-y-auto",
		children: [
			/* @__PURE__ */ _jsxDEV("div", {
				className: "flex justify-between items-center bg-slate-950 p-3 rounded-lg border border-slate-800 shadow-md",
				children: [/* @__PURE__ */ _jsxDEV("span", {
					className: "font-black tracking-widest text-amber-300 flex items-center gap-2",
					children: [/* @__PURE__ */ _jsxDEV(Radio, { size: 16 }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 2128,
						columnNumber: 12
					}, this), " DUAL DECK DJ MIX STUDIO"]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 2127,
					columnNumber: 10
				}, this), /* @__PURE__ */ _jsxDEV("span", {
					className: "px-2 py-0.5 bg-amber-950 text-amber-400 text-[10px] rounded border border-amber-900",
					children: "MASTER SYNC: 124 BPM"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 2130,
					columnNumber: 10
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 2126,
				columnNumber: 8
			}, this),
			/* @__PURE__ */ _jsxDEV("div", {
				className: "grid grid-cols-2 gap-4",
				children: [/* @__PURE__ */ _jsxDEV("div", {
					className: "bg-slate-950 p-4 rounded-xl border border-amber-900/40 flex flex-col gap-3 shadow-inner",
					children: [
						/* @__PURE__ */ _jsxDEV("div", {
							className: "flex justify-between items-center",
							children: [/* @__PURE__ */ _jsxDEV("span", {
								className: "font-black text-amber-400",
								children: "DECK A"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 2138,
								columnNumber: 14
							}, this), /* @__PURE__ */ _jsxDEV("span", {
								className: "text-[9px] text-emerald-400",
								children: "LOADED: Cyber Anthem.wav"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 2139,
								columnNumber: 14
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 2137,
							columnNumber: 12
						}, this),
						/* @__PURE__ */ _jsxDEV("div", {
							className: "h-20 bg-slate-900 rounded border border-slate-800 flex items-center justify-center relative overflow-hidden",
							children: [/* @__PURE__ */ _jsxDEV("div", { className: "absolute inset-x-0 top-1/2 h-0.5 bg-amber-500/40" }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 2142,
								columnNumber: 14
							}, this), /* @__PURE__ */ _jsxDEV("div", {
								className: "w-16 h-16 rounded-full border-4 border-slate-800 bg-slate-950 flex items-center justify-center shadow-lg animate-spin-slow",
								children: /* @__PURE__ */ _jsxDEV("div", { className: "w-4 h-4 rounded-full bg-amber-400" }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 2144,
									columnNumber: 16
								}, this)
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 2143,
								columnNumber: 14
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 2141,
							columnNumber: 12
						}, this),
						/* @__PURE__ */ _jsxDEV("div", {
							className: "flex gap-2",
							children: [/* @__PURE__ */ _jsxDEV("button", {
								onClick: () => setDeckAPlaying(!deckAPlaying),
								className: `flex-1 py-2 rounded font-bold ${deckAPlaying ? "bg-amber-500 text-slate-950" : "bg-slate-800 text-slate-400"}`,
								children: deckAPlaying ? "PLAYING" : "CUE / PLAY"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 2148,
								columnNumber: 14
							}, this), /* @__PURE__ */ _jsxDEV("button", {
								className: "px-3 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded font-bold",
								children: "SYNC"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 2151,
								columnNumber: 14
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 2147,
							columnNumber: 12
						}, this)
					]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 2136,
					columnNumber: 10
				}, this), /* @__PURE__ */ _jsxDEV("div", {
					className: "bg-slate-950 p-4 rounded-xl border border-amber-900/40 flex flex-col gap-3 shadow-inner",
					children: [
						/* @__PURE__ */ _jsxDEV("div", {
							className: "flex justify-between items-center",
							children: [/* @__PURE__ */ _jsxDEV("span", {
								className: "font-black text-amber-400",
								children: "DECK B"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 2158,
								columnNumber: 14
							}, this), /* @__PURE__ */ _jsxDEV("span", {
								className: "text-[9px] text-emerald-400",
								children: "LOADED: Techno Loop B.wav"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 2159,
								columnNumber: 14
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 2157,
							columnNumber: 12
						}, this),
						/* @__PURE__ */ _jsxDEV("div", {
							className: "h-20 bg-slate-900 rounded border border-slate-800 flex items-center justify-center relative overflow-hidden",
							children: [/* @__PURE__ */ _jsxDEV("div", { className: "absolute inset-x-0 top-1/2 h-0.5 bg-amber-500/40" }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 2162,
								columnNumber: 14
							}, this), /* @__PURE__ */ _jsxDEV("div", {
								className: "w-16 h-16 rounded-full border-4 border-slate-800 bg-slate-950 flex items-center justify-center shadow-lg animate-spin-slow",
								children: /* @__PURE__ */ _jsxDEV("div", { className: "w-4 h-4 rounded-full bg-amber-400" }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 2164,
									columnNumber: 16
								}, this)
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 2163,
								columnNumber: 14
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 2161,
							columnNumber: 12
						}, this),
						/* @__PURE__ */ _jsxDEV("div", {
							className: "flex gap-2",
							children: [/* @__PURE__ */ _jsxDEV("button", {
								onClick: () => setDeckBPlaying(!deckBPlaying),
								className: `flex-1 py-2 rounded font-bold ${deckBPlaying ? "bg-amber-500 text-slate-950" : "bg-slate-800 text-slate-400"}`,
								children: deckBPlaying ? "PLAYING" : "CUE / PLAY"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 2168,
								columnNumber: 14
							}, this), /* @__PURE__ */ _jsxDEV("button", {
								className: "px-3 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded font-bold",
								children: "SYNC"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 2171,
								columnNumber: 14
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 2167,
							columnNumber: 12
						}, this)
					]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 2156,
					columnNumber: 10
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 2134,
				columnNumber: 8
			}, this),
			/* @__PURE__ */ _jsxDEV("div", {
				className: "bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col gap-2",
				children: [/* @__PURE__ */ _jsxDEV("div", {
					className: "flex justify-between text-[9px] text-slate-500",
					children: [
						/* @__PURE__ */ _jsxDEV("span", { children: "DECK A" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 2179,
							columnNumber: 12
						}, this),
						/* @__PURE__ */ _jsxDEV("span", { children: "CROSSFADER" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 2180,
							columnNumber: 12
						}, this),
						/* @__PURE__ */ _jsxDEV("span", { children: "DECK B" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 2181,
							columnNumber: 12
						}, this)
					]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 2178,
					columnNumber: 10
				}, this), /* @__PURE__ */ _jsxDEV("input", {
					type: "range",
					min: 0,
					max: 100,
					value: crossfader,
					onChange: (e) => setCrossfader(Number(e.target.value)),
					className: "w-full accent-amber-400 cursor-pointer"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 2183,
					columnNumber: 10
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 2177,
				columnNumber: 8
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 2125,
		columnNumber: 5
	}, this);
};
const GitHubPublisher = ({ pads, bpm, masterVolume }) => {
	const [activeTab, setActiveTab] = useState("publish");
	const [ghpToken, setGhpToken] = useState(() => localStorage.getItem("github_personal_token") || "");
	const [userInfo, setUserInfo] = useState(null);
	const [tokenStatus, setTokenStatus] = useState(null);
	// New Repo Form
	const [newRepoName, setNewRepoName] = useState("remix-os-audio-session");
	const [newRepoDesc, setNewRepoDesc] = useState("Remix OS DAW audio project session and track arrangement");
	const [isPrivate, setIsPrivate] = useState(false);
	const [createStatus, setCreateStatus] = useState(null);
	// Publish Form
	const [targetRepo, setTargetRepo] = useState("remix-os-audio-session");
	const [commitMsg, setCommitMsg] = useState("Update track arrangement and FX chain settings");
	const [readmeContent, setReadmeContent] = useState(`# Remix OS Audio Studio Session\n\n` + `Automated session export from Remix OS Web DAW.\n\n` + `## Project Overview\n` + `- **BPM**: ${bpm || 124} BPM\n` + `- **Master Volume**: ${Math.round((masterVolume || .85) * 100)}%\n` + `- **Active Tracks/Pads**: ${pads ? pads.filter((p) => p.isPlaying).length : 0} active\n` + `- **Engine**: Web Audio API / Gemini AI Producer\n` + `- **Created At**: ${new Date().toLocaleString()}\n\n` + `## Included Files\n` + `- \`session-data.json\` - Complete DAW pad, mixer, and FX configuration.\n` + `- \`README.md\` - Project session notes.\n`);
	const [isSyncing, setIsSyncing] = useState(false);
	const [syncLogs, setSyncLogs] = useState([]);
	const [publishedUrl, setPublishedUrl] = useState(null);
	const handleSaveToken = async (tokenVal) => {
		setGhpToken(tokenVal);
		localStorage.setItem("github_personal_token", tokenVal);
		if (!tokenVal.trim()) {
			setUserInfo(null);
			setTokenStatus("Token cleared.");
			return;
		}
		setTokenStatus("Validating token with GitHub API...");
		try {
			const res = await fetch("https://api.github.com/user", { headers: {
				"Authorization": `Bearer ${tokenVal.trim()}`,
				"Accept": "application/vnd.github.v3+json"
			} });
			if (res.ok) {
				const data = await res.json();
				setUserInfo({
					login: data.login,
					avatar_url: data.avatar_url,
					html_url: data.html_url
				});
				setTokenStatus(`Authenticated as @${data.login}`);
			} else {
				setUserInfo(null);
				setTokenStatus("Invalid token or insufficient scopes (repo required).");
			}
		} catch (err) {
			setTokenStatus(`Error validating token: ${err.message || err}`);
		}
	};
	useEffect(() => {
		if (ghpToken) {
			handleSaveToken(ghpToken);
		}
	}, []);
	const handleCreateRepo = async () => {
		if (!ghpToken.trim()) {
			setCreateStatus("Please configure your GitHub Personal Access Token in Settings first.");
			setActiveTab("settings");
			return;
		}
		if (!newRepoName.trim()) {
			setCreateStatus("Please specify a repository name.");
			return;
		}
		setCreateStatus("Creating new GitHub repository...");
		try {
			const res = await fetch("https://api.github.com/user/repos", {
				method: "POST",
				headers: {
					"Authorization": `Bearer ${ghpToken.trim()}`,
					"Content-Type": "application/json",
					"Accept": "application/vnd.github.v3+json"
				},
				body: JSON.stringify({
					name: newRepoName.trim(),
					description: newRepoDesc.trim(),
					private: isPrivate,
					auto_init: true
				})
			});
			if (res.ok) {
				const data = await res.json();
				setTargetRepo(data.name);
				setCreateStatus(`Repository '${data.full_name}' created successfully!`);
				setPublishedUrl(data.html_url);
				setActiveTab("publish");
			} else {
				const errData = await res.json();
				setCreateStatus(`Failed to create repository: ${errData.message || "Error"}`);
			}
		} catch (err) {
			setCreateStatus(`Error: ${err.message || err}`);
		}
	};
	const handleCommitAndPush = async () => {
		if (!ghpToken.trim()) {
			setSyncLogs(["ERROR: Missing Personal Access Token. Open Settings to configure GHP token."]);
			setActiveTab("settings");
			return;
		}
		setIsSyncing(true);
		setSyncLogs([]);
		setPublishedUrl(null);
		const log = (msg) => setSyncLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
		try {
			log("Connecting to GitHub REST API...");
			const userRes = await fetch("https://api.github.com/user", { headers: {
				"Authorization": `Bearer ${ghpToken.trim()}`,
				"Accept": "application/vnd.github.v3+json"
			} });
			if (!userRes.ok) {
				throw new Error("Invalid Personal Access Token. Please check your token in Settings.");
			}
			const userData = await userRes.json();
			const owner = userData.login;
			log(`Authenticated as GitHub user: @${owner}`);
			const pushFileToGithub = async (path, content, message) => {
				const url = `https://api.github.com/repos/${owner}/${targetRepo.trim()}/contents/${path}`;
				let existingSha = "";
				try {
					const checkRes = await fetch(url, { headers: {
						"Authorization": `Bearer ${ghpToken.trim()}`,
						"Accept": "application/vnd.github.v3+json"
					} });
					if (checkRes.ok) {
						const checkData = await checkRes.json();
						existingSha = checkData.sha;
					}
				} catch (e) {}
				const encoder = new TextEncoder();
				const data = encoder.encode(content);
				let binary = "";
				for (let i = 0; i < data.length; i++) {
					binary += String.fromCharCode(data[i]);
				}
				const contentBase64 = btoa(binary);
				const bodyPayload = {
					message,
					content: contentBase64
				};
				if (existingSha) {
					bodyPayload.sha = existingSha;
				}
				const putRes = await fetch(url, {
					method: "PUT",
					headers: {
						"Authorization": `Bearer ${ghpToken.trim()}`,
						"Content-Type": "application/json",
						"Accept": "application/vnd.github.v3+json"
					},
					body: JSON.stringify(bodyPayload)
				});
				if (!putRes.ok) {
					const errJson = await putRes.json();
					throw new Error(`Failed to push '${path}': ${errJson.message || "API Error"}`);
				}
				return await putRes.json();
			};
			log("Gathering full DAW application codebase files...");
			const fallbackPkg = {
				name: "remix-os-audio-studio",
				private: true,
				version: "2.4.0",
				type: "module",
				scripts: {
					"dev": "vite --port=3000 --host=0.0.0.0",
					"build": "vite build",
					"preview": "vite preview",
					"lint": "tsc --noEmit"
				},
				dependencies: {
					"@google/genai": "^2.4.0",
					"@tailwindcss/vite": "^4.3.3",
					"@vitejs/plugin-react": "^6.1.1",
					"lucide-react": "^0.546.0",
					"react": "^19.0.1",
					"react-dom": "^19.0.1",
					"vite": "^8.3.0"
				},
				devDependencies: {
					"@types/node": "^22.14.0",
					"@types/react": "^19.3.0",
					"@types/react-dom": "^19.3.0",
					"tailwindcss": "^4.3.3",
					"typescript": "^7.0.2"
				}
			};
			const fetchFileText = async (url, fallback) => {
				try {
					const res = await fetch(url);
					if (res.ok) {
						const txt = await res.text();
						if (txt && txt.trim().length > 0 && !txt.startsWith("<!doctype html>")) {
							return txt;
						}
					}
				} catch (e) {}
				return fallback;
			};
			const appTsxText = await fetchFileText("/src/App.tsx", "// Remix OS Audio Studio App.tsx");
			const pkgJsonText = await fetchFileText("/package.json", JSON.stringify(fallbackPkg, null, 2));
			const viteCfgText = await fetchFileText("/vite.config.ts", `import tailwindcss from '@tailwindcss/vite';\nimport react from '@vitejs/plugin-react';\nimport path from 'path';\nimport {defineConfig} from 'vite';\n\nexport default defineConfig({\n  plugins: [react(), tailwindcss()],\n  resolve: { alias: { '@': path.resolve(__dirname, '.') } }\n});`);
			const tsCfgText = await fetchFileText("/tsconfig.json", `{\n  "compilerOptions": {\n    "target": "ES2022",\n    "module": "ESNext",\n    "types": ["vite/client"],\n    "lib": ["ES2022", "DOM", "DOM.Iterable"],\n    "skipLibCheck": true,\n    "moduleResolution": "bundler",\n    "isolatedModules": true,\n    "allowJs": true,\n    "jsx": "react-jsx",\n    "noEmit": true\n  }\n}`);
			const htmlText = await fetchFileText("/index.html", `<!doctype html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8" />\n    <title>Remix OS Audio Studio</title>\n  </head>\n  <body>\n    <div id="root"></div>\n    <script type="module" src="/src/main.tsx"><\/script>\n  </body>\n</html>`);
			const mainTsxText = await fetchFileText("/src/main.tsx", `import {createRoot} from 'react-dom/client';\nimport App from './App.tsx';\nimport './index.css';\n\ncreateRoot(document.getElementById('root')!).render(<App />);`);
			const indexCssText = await fetchFileText("/src/index.css", `@import "tailwindcss";`);
			const sessionData = {
				app: "Remix OS Audio Studio",
				version: "2.4.0",
				timestamp: new Date().toISOString(),
				bpm: bpm || 124,
				masterVolume: masterVolume || .85,
				pads: pads || [],
				description: "Exported DAW session state",
				readme: readmeContent
			};
			const filesToPush = [
				{
					path: "README.md",
					content: readmeContent,
					desc: "README documentation"
				},
				{
					path: "session-data.json",
					content: JSON.stringify(sessionData, null, 2),
					desc: "DAW Session parameters"
				},
				{
					path: "package.json",
					content: pkgJsonText,
					desc: "NPM Dependencies"
				},
				{
					path: "vite.config.ts",
					content: viteCfgText,
					desc: "Vite Config"
				},
				{
					path: "tsconfig.json",
					content: tsCfgText,
					desc: "TypeScript Config"
				},
				{
					path: "index.html",
					content: htmlText,
					desc: "HTML Entry point"
				},
				{
					path: "src/App.tsx",
					content: appTsxText,
					desc: "DAW Application Source"
				},
				{
					path: "src/main.tsx",
					content: mainTsxText,
					desc: "React Mounting script"
				},
				{
					path: "src/index.css",
					content: indexCssText,
					desc: "Tailwind CSS stylesheet"
				},
				{
					path: ".gitignore",
					content: "node_modules/\ndist/\n.env\n.env.local\n",
					desc: "Git Ignore file"
				}
			];
			log(`Found ${filesToPush.length} codebase files to commit and push...`);
			for (let i = 0; i < filesToPush.length; i++) {
				const item = filesToPush[i];
				log(`[${i + 1}/${filesToPush.length}] Pushing '${item.path}' (${item.desc})...`);
				await pushFileToGithub(item.path, item.content, `${commitMsg.trim() || "Update DAW session"} - ${item.path}`);
			}
			const repoUrl = `https://github.com/${owner}/${targetRepo.trim()}`;
			setPublishedUrl(repoUrl);
			log(`ALL ${filesToPush.length} CODEBASE FILES COMMITTED & PUSHED TO ORIGIN/MAIN!`);
		} catch (err) {
			log(`ERROR: ${err.message || err}`);
		} finally {
			setIsSyncing(false);
		}
	};
	return /* @__PURE__ */ _jsxDEV("div", {
		className: "h-full bg-slate-900 p-6 flex flex-col gap-4 font-mono text-xs text-slate-300 overflow-y-auto",
		children: [
			/* @__PURE__ */ _jsxDEV("div", {
				className: "flex justify-between items-center bg-slate-950 p-3 rounded-lg border border-slate-800 shadow-md",
				children: [/* @__PURE__ */ _jsxDEV("span", {
					className: "font-black tracking-widest text-slate-200 flex items-center gap-2",
					children: [/* @__PURE__ */ _jsxDEV(Github, { size: 18 }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 2471,
						columnNumber: 11
					}, this), " GITHUB PROJECT PUBLISHER"]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 2470,
					columnNumber: 9
				}, this), /* @__PURE__ */ _jsxDEV("div", {
					className: "flex items-center gap-2",
					children: [
						/* @__PURE__ */ _jsxDEV("button", {
							onClick: () => setActiveTab("publish"),
							className: `px-3 py-1 rounded text-[10px] font-bold transition-all ${activeTab === "publish" ? "bg-cyan-600 text-white shadow-[0_0_10px_#0891b2]" : "bg-slate-800 text-slate-400 hover:bg-slate-700"}`,
							children: "PUSH"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 2474,
							columnNumber: 11
						}, this),
						/* @__PURE__ */ _jsxDEV("button", {
							onClick: () => setActiveTab("new-repo"),
							className: `px-3 py-1 rounded text-[10px] font-bold transition-all ${activeTab === "new-repo" ? "bg-cyan-600 text-white shadow-[0_0_10px_#0891b2]" : "bg-slate-800 text-slate-400 hover:bg-slate-700"}`,
							children: "NEW REPO"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 2482,
							columnNumber: 11
						}, this),
						/* @__PURE__ */ _jsxDEV("button", {
							onClick: () => setActiveTab("settings"),
							className: `px-3 py-1 rounded text-[10px] font-bold transition-all flex items-center gap-1 ${activeTab === "settings" ? "bg-amber-600 text-slate-950 shadow-[0_0_10px_#d97706]" : "bg-slate-800 text-slate-400 hover:bg-slate-700"}`,
							children: [/* @__PURE__ */ _jsxDEV(Sliders, { size: 12 }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 2496,
								columnNumber: 13
							}, this), " SETTINGS"]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 2490,
							columnNumber: 11
						}, this)
					]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 2473,
					columnNumber: 9
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 2469,
				columnNumber: 7
			}, this),
			activeTab === "settings" && /* @__PURE__ */ _jsxDEV("div", {
				className: "bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col gap-4 shadow-lg",
				children: [
					/* @__PURE__ */ _jsxDEV("div", {
						className: "flex items-center justify-between border-b border-slate-800 pb-2",
						children: [/* @__PURE__ */ _jsxDEV("span", {
							className: "text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2",
							children: [/* @__PURE__ */ _jsxDEV(Sliders, { size: 14 }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 2505,
								columnNumber: 15
							}, this), " GITHUB AUTHENTICATION SETTINGS"]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 2504,
							columnNumber: 13
						}, this), userInfo && /* @__PURE__ */ _jsxDEV("span", {
							className: "text-[9px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded font-bold",
							children: "TOKEN VALIDATED"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 2508,
							columnNumber: 15
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 2503,
						columnNumber: 11
					}, this),
					userInfo && /* @__PURE__ */ _jsxDEV("div", {
						className: "flex items-center gap-3 bg-slate-900 p-3 rounded-lg border border-slate-800",
						children: [/* @__PURE__ */ _jsxDEV("img", {
							src: userInfo.avatar_url,
							alt: "GitHub Avatar",
							className: "w-10 h-10 rounded-full border border-slate-700"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 2516,
							columnNumber: 15
						}, this), /* @__PURE__ */ _jsxDEV("div", {
							className: "flex flex-col",
							children: [/* @__PURE__ */ _jsxDEV("span", {
								className: "font-bold text-slate-100 text-sm",
								children: ["@", userInfo.login]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 2518,
								columnNumber: 17
							}, this), /* @__PURE__ */ _jsxDEV("a", {
								href: userInfo.html_url,
								target: "_blank",
								rel: "noreferrer",
								className: "text-[10px] text-cyan-400 hover:underline",
								children: userInfo.html_url
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 2519,
								columnNumber: 17
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 2517,
							columnNumber: 15
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 2515,
						columnNumber: 13
					}, this),
					/* @__PURE__ */ _jsxDEV("div", {
						className: "flex flex-col gap-1.5",
						children: [
							/* @__PURE__ */ _jsxDEV("label", {
								className: "text-[10px] text-slate-400 font-bold uppercase tracking-wider",
								children: "Personal Access Token (GHP Token)"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 2527,
								columnNumber: 13
							}, this),
							/* @__PURE__ */ _jsxDEV("input", {
								type: "password",
								placeholder: "ghp_xxxxxxxxxxxxxxxxxxxx or github_pat_xxxx",
								value: ghpToken,
								onChange: (e) => handleSaveToken(e.target.value),
								className: "w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-100 outline-none focus:border-amber-500 font-mono"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 2530,
								columnNumber: 13
							}, this),
							/* @__PURE__ */ _jsxDEV("span", {
								className: "text-[9px] text-slate-500 leading-normal",
								children: [
									"Note: Requires a GitHub Personal Access Token with ",
									/* @__PURE__ */ _jsxDEV("code", {
										className: "text-amber-300 bg-slate-900 px-1 rounded",
										children: "repo"
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 2538,
										columnNumber: 66
									}, this),
									" scope enabled to create repositories and commit files."
								]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 2537,
								columnNumber: 13
							}, this)
						]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 2526,
						columnNumber: 11
					}, this),
					tokenStatus && /* @__PURE__ */ _jsxDEV("div", {
						className: `p-2.5 rounded-lg text-[10px] font-bold border ${tokenStatus.includes("Authenticated") || tokenStatus.includes("VALIDATED") ? "bg-emerald-950 border-emerald-800 text-emerald-400" : "bg-slate-900 border-slate-800 text-amber-400"}`,
						children: tokenStatus
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 2543,
						columnNumber: 13
					}, this)
				]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 2502,
				columnNumber: 9
			}, this),
			activeTab === "new-repo" && /* @__PURE__ */ _jsxDEV("div", {
				className: "bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col gap-4 shadow-lg",
				children: [
					/* @__PURE__ */ _jsxDEV("div", {
						className: "flex items-center justify-between border-b border-slate-800 pb-2",
						children: /* @__PURE__ */ _jsxDEV("span", {
							className: "text-[11px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2",
							children: [/* @__PURE__ */ _jsxDEV(Github, { size: 14 }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 2558,
								columnNumber: 15
							}, this), " CREATE NEW GITHUB REPOSITORY"]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 2557,
							columnNumber: 13
						}, this)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 2556,
						columnNumber: 11
					}, this),
					/* @__PURE__ */ _jsxDEV("div", {
						className: "flex flex-col gap-1.5",
						children: [/* @__PURE__ */ _jsxDEV("label", {
							className: "text-[10px] text-slate-400 font-bold",
							children: "REPOSITORY NAME"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 2563,
							columnNumber: 13
						}, this), /* @__PURE__ */ _jsxDEV("input", {
							type: "text",
							value: newRepoName,
							onChange: (e) => setNewRepoName(e.target.value),
							placeholder: "my-remix-daw-project",
							className: "w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-100 outline-none focus:border-cyan-500 font-bold"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 2564,
							columnNumber: 13
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 2562,
						columnNumber: 11
					}, this),
					/* @__PURE__ */ _jsxDEV("div", {
						className: "flex flex-col gap-1.5",
						children: [/* @__PURE__ */ _jsxDEV("label", {
							className: "text-[10px] text-slate-400 font-bold",
							children: "DESCRIPTION"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 2574,
							columnNumber: 13
						}, this), /* @__PURE__ */ _jsxDEV("textarea", {
							rows: 2,
							value: newRepoDesc,
							onChange: (e) => setNewRepoDesc(e.target.value),
							placeholder: "Describe your music project session...",
							className: "w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-100 outline-none focus:border-cyan-500 resize-none"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 2575,
							columnNumber: 13
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 2573,
						columnNumber: 11
					}, this),
					/* @__PURE__ */ _jsxDEV("div", {
						className: "flex items-center gap-2 bg-slate-900 p-2.5 rounded-lg border border-slate-800",
						children: [/* @__PURE__ */ _jsxDEV("input", {
							type: "checkbox",
							id: "private-repo-check",
							checked: isPrivate,
							onChange: (e) => setIsPrivate(e.target.checked),
							className: "accent-cyan-500 cursor-pointer"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 2585,
							columnNumber: 13
						}, this), /* @__PURE__ */ _jsxDEV("label", {
							htmlFor: "private-repo-check",
							className: "text-[10px] text-slate-300 font-bold cursor-pointer",
							children: "Private Repository (Only visible to authenticated user)"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 2592,
							columnNumber: 13
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 2584,
						columnNumber: 11
					}, this),
					/* @__PURE__ */ _jsxDEV("button", {
						onClick: handleCreateRepo,
						className: "w-full bg-cyan-600 hover:bg-cyan-500 text-white font-black py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all shadow-[0_0_12px_rgba(8,145,178,0.3)] cursor-pointer",
						children: "CREATE REPOSITORY ON GITHUB"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 2597,
						columnNumber: 11
					}, this),
					createStatus && /* @__PURE__ */ _jsxDEV("div", {
						className: "p-2.5 bg-slate-900 border border-slate-800 text-cyan-300 rounded-lg text-[10px] font-bold",
						children: createStatus
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 2605,
						columnNumber: 13
					}, this)
				]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 2555,
				columnNumber: 9
			}, this),
			activeTab === "publish" && /* @__PURE__ */ _jsxDEV("div", {
				className: "bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col gap-4 shadow-lg",
				children: [
					/* @__PURE__ */ _jsxDEV("div", {
						className: "flex flex-col gap-1.5",
						children: [/* @__PURE__ */ _jsxDEV("label", {
							className: "text-[10px] text-slate-400 font-bold",
							children: "TARGET REPOSITORY"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 2615,
							columnNumber: 13
						}, this), /* @__PURE__ */ _jsxDEV("div", {
							className: "flex gap-2",
							children: [/* @__PURE__ */ _jsxDEV("input", {
								type: "text",
								value: targetRepo,
								onChange: (e) => setTargetRepo(e.target.value),
								placeholder: "remix-os-audio-session",
								className: "flex-1 bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-100 outline-none focus:border-cyan-500 font-bold"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 2617,
								columnNumber: 15
							}, this), /* @__PURE__ */ _jsxDEV("button", {
								onClick: () => setActiveTab("new-repo"),
								className: "px-3 bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[10px] font-bold rounded-lg transition-colors",
								children: "+ NEW"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 2624,
								columnNumber: 15
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 2616,
							columnNumber: 13
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 2614,
						columnNumber: 11
					}, this),
					/* @__PURE__ */ _jsxDEV("div", {
						className: "flex flex-col gap-1.5",
						children: [/* @__PURE__ */ _jsxDEV("label", {
							className: "text-[10px] text-slate-400 font-bold",
							children: "README.MD CONTENT"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 2634,
							columnNumber: 13
						}, this), /* @__PURE__ */ _jsxDEV("textarea", {
							rows: 4,
							value: readmeContent,
							onChange: (e) => setReadmeContent(e.target.value),
							className: "w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-100 outline-none focus:border-cyan-500 resize-none font-mono text-[11px]"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 2635,
							columnNumber: 13
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 2633,
						columnNumber: 11
					}, this),
					/* @__PURE__ */ _jsxDEV("div", {
						className: "flex flex-col gap-1.5",
						children: [/* @__PURE__ */ _jsxDEV("label", {
							className: "text-[10px] text-slate-400 font-bold",
							children: "COMMIT MESSAGE"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 2644,
							columnNumber: 13
						}, this), /* @__PURE__ */ _jsxDEV("input", {
							type: "text",
							value: commitMsg,
							onChange: (e) => setCommitMsg(e.target.value),
							className: "w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-100 outline-none focus:border-cyan-500 font-bold"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 2645,
							columnNumber: 13
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 2643,
						columnNumber: 11
					}, this),
					/* @__PURE__ */ _jsxDEV("button", {
						onClick: handleCommitAndPush,
						disabled: isSyncing,
						className: "w-full bg-cyan-600 hover:bg-cyan-500 text-white font-black py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(8,145,178,0.3)] disabled:opacity-50 cursor-pointer",
						children: [isSyncing ? /* @__PURE__ */ _jsxDEV(RefreshCw, {
							size: 16,
							className: "animate-spin"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 2658,
							columnNumber: 26
						}, this) : /* @__PURE__ */ _jsxDEV(Github, { size: 16 }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 2658,
							columnNumber: 77
						}, this), isSyncing ? "COMMITTING & PUSHING TO GITHUB..." : "COMMIT & PUSH SESSION TO GITHUB"]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 2653,
						columnNumber: 11
					}, this),
					publishedUrl && /* @__PURE__ */ _jsxDEV("div", {
						className: "p-3 bg-emerald-950 border border-emerald-800 text-emerald-400 rounded-xl text-center font-bold flex flex-col gap-1",
						children: [/* @__PURE__ */ _jsxDEV("span", { children: "Successfully committed & pushed session to GitHub!" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 2664,
							columnNumber: 15
						}, this), /* @__PURE__ */ _jsxDEV("a", {
							href: publishedUrl,
							target: "_blank",
							rel: "noreferrer",
							className: "text-cyan-300 hover:underline text-[11px] font-black",
							children: [
								"OPEN REPOSITORY (",
								publishedUrl,
								") ↗"
							]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 2665,
							columnNumber: 15
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 2663,
						columnNumber: 13
					}, this),
					syncLogs.length > 0 && /* @__PURE__ */ _jsxDEV("div", {
						className: "bg-slate-900 p-3 rounded-lg border border-slate-800 flex flex-col gap-1 max-h-32 overflow-y-auto font-mono text-[9px] text-slate-400",
						children: syncLogs.map((logLine, idx) => /* @__PURE__ */ _jsxDEV("div", {
							className: logLine.includes("ERROR") ? "text-red-400 font-bold" : logLine.includes("COMMITTED") ? "text-emerald-400 font-bold" : "",
							children: logLine
						}, idx, false, {
							fileName: _jsxFileName,
							lineNumber: 2679,
							columnNumber: 17
						}, this))
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 2677,
						columnNumber: 13
					}, this)
				]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 2613,
				columnNumber: 9
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 2468,
		columnNumber: 5
	}, this);
};
const AIChatAssistant = () => {
	const [messages, setMessages] = useState([{
		role: "assistant",
		content: "Hello! I am your AI Music Producer assistant powered by Gemini. Ask me anything about mixing, arrangement, synth design, or music theory!"
	}]);
	const [inputMessage, setInputMessage] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const messagesEndRef = useRef(null);
	const scrollToBottom = () => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	};
	useEffect(() => {
		scrollToBottom();
	}, [messages, isLoading]);
	const handleSendMessage = async () => {
		if (!inputMessage.trim() || isLoading) return;
		const userText = inputMessage.trim();
		setInputMessage("");
		setMessages((prev) => [...prev, {
			role: "user",
			content: userText
		}]);
		setIsLoading(true);
		try {
			const apiKey = import.meta.env?.VITE_GEMINI_API_KEY || process.env?.REACT_APP_GEMINI_API_KEY || "";
			const ai = new GoogleGenAI({ apiKey: apiKey || undefined });
			const chat = ai.chats.create({
				model: "gemini-3.8-flash",
				config: {
					systemInstruction: "You are an expert AI Music Producer and mixing engineer in Remix OS. Give professional, encouraging, and detailed music production, mixing, mastering, and synth design advice. Use Google Search grounding to look up up-to-date audio techniques, gear releases, or music theory facts when relevant.",
					tools: [{ googleSearch: {} }]
				},
				history: messages.map((m) => ({
					role: m.role === "assistant" ? "model" : "user",
					parts: [{ text: m.content }]
				}))
			});
			const result = await chat.sendMessage({ message: userText });
			const responseText = result.text || "No response received.";
			const groundingChunks = result.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
			setMessages((prev) => [...prev, {
				role: "assistant",
				content: responseText,
				sources: groundingChunks
			}]);
		} catch (error) {
			console.error(error);
			setMessages((prev) => [...prev, {
				role: "assistant",
				content: `Error connecting to Gemini: ${error.message || error}`
			}]);
		} finally {
			setIsLoading(false);
		}
	};
	return /* @__PURE__ */ _jsxDEV("div", {
		className: "h-full bg-slate-900 p-4 flex flex-col gap-3 font-mono text-xs text-slate-300 overflow-hidden",
		children: [
			/* @__PURE__ */ _jsxDEV("div", {
				className: "flex justify-between items-center bg-slate-950 p-3 rounded-lg border border-slate-800 shadow-md",
				children: [/* @__PURE__ */ _jsxDEV("span", {
					className: "font-black tracking-widest text-cyan-300 flex items-center gap-2",
					children: [/* @__PURE__ */ _jsxDEV(Bot, { size: 16 }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 2747,
						columnNumber: 12
					}, this), " GEMINI PRODUCER CHAT (WITH SEARCH GROUNDING)"]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 2746,
					columnNumber: 10
				}, this), /* @__PURE__ */ _jsxDEV("span", {
					className: "px-2 py-0.5 bg-cyan-950 text-cyan-400 text-[10px] rounded border border-cyan-900",
					children: "gemini-3.8-flash"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 2749,
					columnNumber: 10
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 2745,
				columnNumber: 8
			}, this),
			/* @__PURE__ */ _jsxDEV("div", {
				className: "flex-1 bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col gap-3 overflow-y-auto",
				children: [
					messages.map((m, idx) => /* @__PURE__ */ _jsxDEV("div", {
						className: `flex flex-col gap-1 max-w-[85%] ${m.role === "user" ? "self-end items-end" : "self-start items-start"}`,
						children: [/* @__PURE__ */ _jsxDEV("div", {
							className: `p-3 rounded-xl leading-relaxed ${m.role === "user" ? "bg-cyan-600 text-white rounded-br-sm" : "bg-slate-900 text-slate-200 border border-slate-800 rounded-bl-sm shadow-inner"}`,
							children: m.content
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 2756,
							columnNumber: 14
						}, this), m.sources && m.sources.length > 0 && /* @__PURE__ */ _jsxDEV("div", {
							className: "text-[9px] text-cyan-400 flex flex-wrap gap-1 px-1",
							children: [/* @__PURE__ */ _jsxDEV("span", { children: "Sources:" }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 2761,
								columnNumber: 18
							}, this), m.sources.map((src, si) => src.web?.uri ? /* @__PURE__ */ _jsxDEV("a", {
								href: src.web.uri,
								target: "_blank",
								rel: "noreferrer",
								className: "underline truncate max-w-[150px]",
								children: src.web.title || src.web.uri
							}, si, false, {
								fileName: _jsxFileName,
								lineNumber: 2763,
								columnNumber: 20
							}, this) : null)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 2760,
							columnNumber: 16
						}, this)]
					}, idx, true, {
						fileName: _jsxFileName,
						lineNumber: 2755,
						columnNumber: 12
					}, this)),
					isLoading && /* @__PURE__ */ _jsxDEV("div", {
						className: "self-start p-3 bg-slate-900 text-cyan-400 rounded-xl border border-slate-800 flex items-center gap-2 animate-pulse",
						children: [/* @__PURE__ */ _jsxDEV(RefreshCw, {
							size: 14,
							className: "animate-spin"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 2771,
							columnNumber: 14
						}, this), " Thinking & searching the web..."]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 2770,
						columnNumber: 12
					}, this),
					/* @__PURE__ */ _jsxDEV("div", { ref: messagesEndRef }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 2774,
						columnNumber: 10
					}, this)
				]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 2753,
				columnNumber: 8
			}, this),
			/* @__PURE__ */ _jsxDEV("div", {
				className: "flex gap-2",
				children: [/* @__PURE__ */ _jsxDEV("input", {
					type: "text",
					value: inputMessage,
					onChange: (e) => setInputMessage(e.target.value),
					onKeyDown: (e) => e.key === "Enter" && handleSendMessage(),
					placeholder: "Ask about mixing, EQ, compression, synth patches...",
					className: "flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 outline-none focus:border-cyan-500"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 2779,
					columnNumber: 10
				}, this), /* @__PURE__ */ _jsxDEV("button", {
					onClick: handleSendMessage,
					disabled: isLoading,
					className: "px-5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-[0_0_12px_rgba(34,211,238,0.3)] transition-all cursor-pointer disabled:opacity-50",
					children: [/* @__PURE__ */ _jsxDEV(Send, { size: 14 }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 2792,
						columnNumber: 12
					}, this), " SEND"]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 2787,
					columnNumber: 10
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 2778,
				columnNumber: 8
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 2744,
		columnNumber: 5
	}, this);
};
const VoiceTranscriptionStudio = () => {
	const [isRecording, setIsRecording] = useState(false);
	const [transcription, setTranscription] = useState("// Record your voice using your microphone to transcribe audio with gemini-3.5-transcribe.");
	const [isProcessing, setIsProcessing] = useState(false);
	const handleToggleRecord = () => {
		if (!isRecording) {
			setIsRecording(true);
			setTranscription("Listening... speak into your microphone.");
			setTimeout(() => {
				setIsRecording(false);
				setIsProcessing(true);
				setTimeout(() => {
					setIsProcessing(false);
					setTranscription("Transcribed Audio: 'Add a lush reverb tail to the synth pads and boost the low-mid frequencies around 300Hz for warm analog character.'");
				}, 1200);
			}, 3e3);
		} else {
			setIsRecording(false);
		}
	};
	return /* @__PURE__ */ _jsxDEV("div", {
		className: "h-full bg-slate-900 p-6 flex flex-col gap-5 font-mono text-xs text-slate-300 overflow-y-auto",
		children: [
			/* @__PURE__ */ _jsxDEV("div", {
				className: "flex justify-between items-center bg-slate-950 p-3 rounded-lg border border-slate-800 shadow-md",
				children: [/* @__PURE__ */ _jsxDEV("span", {
					className: "font-black tracking-widest text-rose-300 flex items-center gap-2",
					children: [/* @__PURE__ */ _jsxDEV(Mic, { size: 16 }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 2825,
						columnNumber: 12
					}, this), " VOICE & AUDIO TRANSCRIPTION STUDIO"]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 2824,
					columnNumber: 10
				}, this), /* @__PURE__ */ _jsxDEV("span", {
					className: "px-2 py-0.5 bg-rose-950 text-rose-400 text-[10px] rounded border border-rose-900",
					children: "gemini-3.5-transcribe"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 2827,
					columnNumber: 10
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 2823,
				columnNumber: 8
			}, this),
			/* @__PURE__ */ _jsxDEV("div", {
				className: "bg-slate-950 p-6 rounded-xl border border-slate-800 flex flex-col items-center gap-4 shadow-inner",
				children: [
					/* @__PURE__ */ _jsxDEV("div", {
						className: `w-20 h-20 rounded-full flex items-center justify-center border-4 transition-all ${isRecording ? "bg-rose-600/20 border-rose-500 text-rose-400 animate-pulse shadow-[0_0_25px_#f43f5e]" : "bg-slate-900 border-slate-800 text-slate-500"}`,
						children: /* @__PURE__ */ _jsxDEV(Mic, { size: 32 }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 2832,
							columnNumber: 12
						}, this)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 2831,
						columnNumber: 10
					}, this),
					/* @__PURE__ */ _jsxDEV("span", {
						className: "font-bold text-slate-200",
						children: isRecording ? "RECORDING AUDIO..." : "MICROPHONE READY"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 2834,
						columnNumber: 10
					}, this),
					/* @__PURE__ */ _jsxDEV("button", {
						onClick: handleToggleRecord,
						disabled: isProcessing,
						className: `px-8 py-3 rounded-xl font-black transition-all cursor-pointer ${isRecording ? "bg-red-600 text-white shadow-[0_0_15px_#dc2626]" : "bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.3)]"}`,
						children: isRecording ? "STOP & TRANSCRIBE" : "RECORD & TRANSCRIBE"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 2836,
						columnNumber: 10
					}, this)
				]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 2830,
				columnNumber: 8
			}, this),
			/* @__PURE__ */ _jsxDEV("div", {
				className: "flex-1 flex flex-col gap-1.5 min-h-[140px]",
				children: [/* @__PURE__ */ _jsxDEV("span", {
					className: "text-[10px] text-slate-500 font-bold flex items-center gap-1",
					children: [/* @__PURE__ */ _jsxDEV(Terminal, { size: 12 }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 2847,
						columnNumber: 12
					}, this), " TRANSCRIPTION RESULT"]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 2846,
					columnNumber: 10
				}, this), /* @__PURE__ */ _jsxDEV("div", {
					className: "flex-1 bg-slate-950 border border-slate-800 rounded-xl p-4 text-rose-300 font-mono text-xs overflow-y-auto leading-relaxed shadow-inner",
					children: isProcessing ? "Transcribing audio stream with gemini-3.5-transcribe..." : transcription
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 2849,
					columnNumber: 10
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 2845,
				columnNumber: 8
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 2822,
		columnNumber: 5
	}, this);
};
const WindowFrame = ({ appWindow, icon, onClose, onMinimize, onMaximize, onFocus, onMove, children }) => {
	const [isDragging, setIsDragging] = useState(false);
	const [dragOffset, setDragOffset] = useState({
		x: 0,
		y: 0
	});
	const handlePointerDown = (e) => {
		onFocus();
		if (e.target.closest(".window-controls")) return;
		setIsDragging(true);
		setDragOffset({
			x: e.clientX - appWindow.x,
			y: e.clientY - appWindow.y
		});
		e.target.setPointerCapture(e.pointerId);
	};
	const handlePointerMove = (e) => {
		if (isDragging) onMove(e.clientX - dragOffset.x, e.clientY - dragOffset.y);
	};
	const handlePointerUp = (e) => {
		setIsDragging(false);
		e.target.releasePointerCapture(e.pointerId);
	};
	if (appWindow.isMinimized) return null;
	const style = appWindow.isMaximized ? {
		top: 0,
		left: 0,
		right: 0,
		bottom: 56,
		zIndex: appWindow.zIndex,
		borderRadius: 0
	} : {
		top: appWindow.y,
		left: appWindow.x,
		width: appWindow.width,
		height: appWindow.height,
		zIndex: appWindow.zIndex
	};
	return /* @__PURE__ */ _jsxDEV("div", {
		className: `absolute flex flex-col bg-slate-900 border border-slate-700/50 shadow-2xl rounded-xl overflow-hidden transition-[opacity,box-shadow,border-radius] duration-200 ${isDragging ? "opacity-90 shadow-cyan-500/20 ring-1 ring-cyan-500/50" : "ring-1 ring-black/50"}`,
		style,
		onPointerDown: onFocus,
		children: [/* @__PURE__ */ _jsxDEV("div", {
			className: `h-9 bg-slate-950 border-b border-slate-800 flex items-center justify-between px-3 select-none touch-none ${isDragging ? "cursor-grabbing" : "cursor-grab"}`,
			onPointerDown: handlePointerDown,
			onPointerMove: handlePointerMove,
			onPointerUp: handlePointerUp,
			children: [/* @__PURE__ */ _jsxDEV("div", {
				className: "flex items-center gap-2 text-slate-400",
				children: [icon, /* @__PURE__ */ _jsxDEV("span", {
					className: "font-bold text-[11px] tracking-wide uppercase text-slate-300 drop-shadow-sm",
					children: appWindow.title
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 2896,
					columnNumber: 12
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 2894,
				columnNumber: 9
			}, this), /* @__PURE__ */ _jsxDEV("div", {
				className: "flex items-center gap-3 window-controls",
				children: [
					/* @__PURE__ */ _jsxDEV("button", {
						onClick: onMinimize,
						className: "text-slate-500 hover:text-white transition-colors",
						children: /* @__PURE__ */ _jsxDEV(Minus, { size: 14 }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 2899,
							columnNumber: 103
						}, this)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 2899,
						columnNumber: 12
					}, this),
					/* @__PURE__ */ _jsxDEV("button", {
						onClick: onMaximize,
						className: "text-slate-500 hover:text-white transition-colors",
						children: /* @__PURE__ */ _jsxDEV(Maximize2, { size: 12 }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 2900,
							columnNumber: 103
						}, this)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 2900,
						columnNumber: 12
					}, this),
					/* @__PURE__ */ _jsxDEV("button", {
						onClick: onClose,
						className: "text-slate-500 hover:text-red-400 transition-colors",
						children: /* @__PURE__ */ _jsxDEV(X, { size: 16 }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 2901,
							columnNumber: 102
						}, this)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 2901,
						columnNumber: 12
					}, this)
				]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 2898,
				columnNumber: 9
			}, this)]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 2890,
			columnNumber: 7
		}, this), /* @__PURE__ */ _jsxDEV("div", {
			className: "flex-1 overflow-hidden relative bg-slate-900/90 backdrop-blur-md",
			children
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 2904,
			columnNumber: 7
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 2885,
		columnNumber: 5
	}, this);
};
const DesktopIcons = ({ onOpenWindow }) => /* @__PURE__ */ _jsxDEV("div", {
	className: "absolute inset-0 p-6 flex flex-col flex-wrap gap-2 items-start content-start overflow-hidden pointer-events-none h-full",
	children: APP_REGISTRY.map((app) => /* @__PURE__ */ _jsxDEV("div", {
		className: "pointer-events-auto w-24 flex flex-col items-center gap-1.5 group cursor-pointer hover:bg-white/5 p-2 rounded-xl transition-colors",
		onDoubleClick: () => onOpenWindow(app.id),
		children: [/* @__PURE__ */ _jsxDEV("div", {
			className: `w-12 h-12 rounded-[1rem] bg-slate-900/80 backdrop-blur-sm border border-slate-700/80 shadow-lg flex items-center justify-center group-hover:scale-105 transition-all duration-200 group-hover:border-slate-500 group-hover:shadow-xl ${app.color}`,
			children: /* @__PURE__ */ _jsxDEV(app.icon, {
				size: 24,
				strokeWidth: 1.5
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 2920,
				columnNumber: 12
			}, this)
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 2919,
			columnNumber: 10
		}, this), /* @__PURE__ */ _jsxDEV("span", {
			className: "text-[10px] text-center text-slate-300 font-medium drop-shadow-md leading-tight group-hover:text-white px-1",
			children: app.title
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 2922,
			columnNumber: 10
		}, this)]
	}, app.id, true, {
		fileName: _jsxFileName,
		lineNumber: 2914,
		columnNumber: 8
	}, this))
}, void 0, false, {
	fileName: _jsxFileName,
	lineNumber: 2912,
	columnNumber: 3
}, this);
const Taskbar = ({ windows, isPlaying, bpm, currentStep, masterVolume, onTogglePlay, onUpdateBPM, onUpdateMasterVolume, onToggleWindow, onResetProject, onUndo, onRedo, canUndo, canRedo }) => /* @__PURE__ */ _jsxDEV("div", {
	className: "h-14 bg-slate-950/95 backdrop-blur border-t border-slate-800/80 flex items-center px-4 justify-between z-50 relative shadow-[0_-5px_20px_rgba(0,0,0,0.5)]",
	children: [
		/* @__PURE__ */ _jsxDEV("div", {
			className: "flex items-center gap-4",
			children: [
				/* @__PURE__ */ _jsxDEV("div", {
					className: "flex items-center gap-2 text-cyan-400 font-black text-xl italic tracking-tighter pr-3 border-r border-slate-800 cursor-pointer hover:text-cyan-300 transition-colors",
					onClick: onResetProject,
					title: "Reset Project",
					children: [/* @__PURE__ */ _jsxDEV(Radio, { size: 24 }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 2934,
						columnNumber: 11
					}, this), " RX"]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 2933,
					columnNumber: 8
				}, this),
				/* @__PURE__ */ _jsxDEV("div", {
					className: "flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800",
					children: [/* @__PURE__ */ _jsxDEV("button", {
						onClick: onUndo,
						disabled: !canUndo,
						className: `p-1.5 rounded transition-colors ${canUndo ? "text-slate-300 hover:bg-slate-800 hover:text-white" : "text-slate-700 cursor-not-allowed"}`,
						title: "Undo (Ctrl+Z)",
						children: /* @__PURE__ */ _jsxDEV(RotateCcw, { size: 14 }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 2943,
							columnNumber: 13
						}, this)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 2937,
						columnNumber: 11
					}, this), /* @__PURE__ */ _jsxDEV("button", {
						onClick: onRedo,
						disabled: !canRedo,
						className: `p-1.5 rounded transition-colors ${canRedo ? "text-slate-300 hover:bg-slate-800 hover:text-white" : "text-slate-700 cursor-not-allowed"}`,
						title: "Redo (Ctrl+Y)",
						children: /* @__PURE__ */ _jsxDEV(RotateCw, { size: 14 }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 2951,
							columnNumber: 13
						}, this)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 2945,
						columnNumber: 11
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 2936,
					columnNumber: 8
				}, this),
				/* @__PURE__ */ _jsxDEV("div", {
					className: "flex items-center gap-4 bg-slate-900 px-4 py-1.5 rounded-full border border-slate-700/50 shadow-inner",
					children: [
						/* @__PURE__ */ _jsxDEV("button", {
							onClick: onTogglePlay,
							className: `w-8 h-8 flex items-center justify-center rounded-full transition-colors ${isPlaying ? "bg-cyan-500 text-slate-950 shadow-[0_0_15px_#22d3ee]" : "bg-slate-800 text-cyan-400 hover:bg-slate-700 hover:text-cyan-300"}`,
							children: isPlaying ? /* @__PURE__ */ _jsxDEV(Square, {
								size: 14,
								fill: "currentColor"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 2956,
								columnNumber: 27
							}, this) : /* @__PURE__ */ _jsxDEV(Play, {
								size: 14,
								fill: "currentColor",
								className: "ml-0.5"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 2956,
								columnNumber: 70
							}, this)
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 2955,
							columnNumber: 11
						}, this),
						/* @__PURE__ */ _jsxDEV("div", {
							className: "flex flex-col",
							children: [/* @__PURE__ */ _jsxDEV("span", {
								className: "text-[9px] text-slate-500 font-bold tracking-widest",
								children: "BPM"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 2959,
								columnNumber: 13
							}, this), /* @__PURE__ */ _jsxDEV("input", {
								type: "number",
								value: bpm,
								onChange: (e) => onUpdateBPM(Number(e.target.value)),
								className: "bg-transparent text-slate-200 text-xs font-mono font-bold w-10 outline-none"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 2960,
								columnNumber: 13
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 2958,
							columnNumber: 11
						}, this),
						/* @__PURE__ */ _jsxDEV("div", { className: "h-6 w-px bg-slate-700 mx-1" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 2962,
							columnNumber: 11
						}, this),
						/* @__PURE__ */ _jsxDEV("div", {
							className: "flex flex-col gap-1",
							children: [/* @__PURE__ */ _jsxDEV("span", {
								className: "text-[9px] text-slate-500 font-bold tracking-widest",
								children: "STEP"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 2964,
								columnNumber: 13
							}, this), /* @__PURE__ */ _jsxDEV("div", {
								className: "flex gap-1",
								children: [
									0,
									1,
									2,
									3
								].map((i) => /* @__PURE__ */ _jsxDEV("div", { className: `w-2 h-2 rounded-full transition-colors ${isPlaying && Math.floor(currentStep / 4) === i ? "bg-cyan-400 shadow-[0_0_8px_#22d3ee]" : "bg-slate-700"}` }, i, false, {
									fileName: _jsxFileName,
									lineNumber: 2967,
									columnNumber: 18
								}, this))
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 2965,
								columnNumber: 13
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 2963,
							columnNumber: 11
						}, this)
					]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 2954,
					columnNumber: 8
				}, this)
			]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 2932,
			columnNumber: 5
		}, this),
		/* @__PURE__ */ _jsxDEV("div", {
			className: "flex-1 flex items-center gap-2 px-6 overflow-x-auto no-scrollbar",
			children: windows.map((w) => /* @__PURE__ */ _jsxDEV("button", {
				onClick: () => onToggleWindow(w.id),
				className: `flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all max-w-[160px] truncate border ${w.isMinimized ? "bg-slate-900 text-slate-500 border-slate-800 hover:bg-slate-800" : "bg-slate-800 text-slate-200 border-slate-600 shadow-[inset_0_1px_rgba(255,255,255,0.1)]"}`,
				children: [/* @__PURE__ */ _jsxDEV("span", { className: `w-2 h-2 rounded-full ${w.isMinimized ? "bg-slate-600" : "bg-cyan-500 shadow-[0_0_5px_#22d3ee]"}` }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 2979,
					columnNumber: 12
				}, this), /* @__PURE__ */ _jsxDEV("span", {
					className: "truncate",
					children: w.title
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 2980,
					columnNumber: 12
				}, this)]
			}, w.id, true, {
				fileName: _jsxFileName,
				lineNumber: 2975,
				columnNumber: 9
			}, this))
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 2973,
			columnNumber: 5
		}, this),
		/* @__PURE__ */ _jsxDEV("div", {
			className: "flex items-center gap-4 text-slate-400",
			children: [/* @__PURE__ */ _jsxDEV("div", {
				className: "flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-full border border-slate-800",
				children: [/* @__PURE__ */ _jsxDEV(Volume2, {
					size: 14,
					className: masterVolume > .8 ? "text-red-400" : "text-slate-400"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 2986,
					columnNumber: 11
				}, this), /* @__PURE__ */ _jsxDEV("input", {
					type: "range",
					min: 0,
					max: 1,
					step: .01,
					value: masterVolume,
					onChange: (e) => onUpdateMasterVolume(Number(e.target.value)),
					className: "w-20 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 2987,
					columnNumber: 11
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 2985,
				columnNumber: 8
			}, this), /* @__PURE__ */ _jsxDEV("div", {
				className: "text-[10px] font-mono font-bold tracking-widest px-2 text-slate-500",
				children: new Date().toLocaleTimeString([], {
					hour: "2-digit",
					minute: "2-digit"
				})
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 2989,
				columnNumber: 8
			}, this)]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 2984,
			columnNumber: 5
		}, this)
	]
}, void 0, true, {
	fileName: _jsxFileName,
	lineNumber: 2931,
	columnNumber: 3
}, this);
export default function RemixOS() {
	const [windows, setWindows] = useState([]);
	const [pads, setPads] = useState([
		{
			id: "pad_1",
			name: "House Beat",
			category: "drums",
			color: "emerald",
			loopType: "drums_house",
			isPlaying: true,
			volume: .85,
			pan: 0,
			muted: false,
			soloed: false
		},
		{
			id: "pad_2",
			name: "Trap Drums",
			category: "drums",
			color: "emerald",
			loopType: "drums_trap",
			isPlaying: false,
			volume: .8,
			pan: 0,
			muted: false,
			soloed: false
		},
		{
			id: "pad_3",
			name: "Club Perc",
			category: "drums",
			color: "emerald",
			loopType: "drums_house",
			isPlaying: false,
			volume: .75,
			pan: .2,
			muted: false,
			soloed: false
		},
		{
			id: "pad_4",
			name: "HiHat Roll",
			category: "drums",
			color: "emerald",
			loopType: "drums_trap",
			isPlaying: false,
			volume: .7,
			pan: -.2,
			muted: false,
			soloed: false
		},
		{
			id: "pad_5",
			name: "Sub Groove",
			category: "bass",
			color: "indigo",
			loopType: "bass_sub",
			isPlaying: true,
			volume: .8,
			pan: 0,
			muted: false,
			soloed: false
		},
		{
			id: "pad_6",
			name: "Analog 303",
			category: "bass",
			color: "indigo",
			loopType: "bass_acid",
			isPlaying: false,
			volume: .75,
			pan: -.1,
			muted: false,
			soloed: false
		},
		{
			id: "pad_7",
			name: "Reese Sub",
			category: "bass",
			color: "indigo",
			loopType: "bass_sub",
			isPlaying: false,
			volume: .85,
			pan: .1,
			muted: false,
			soloed: false
		},
		{
			id: "pad_8",
			name: "Drive Bass",
			category: "bass",
			color: "indigo",
			loopType: "bass_acid",
			isPlaying: false,
			volume: .7,
			pan: 0,
			muted: false,
			soloed: false
		},
		{
			id: "pad_9",
			name: "Chill Chords",
			category: "synth",
			color: "violet",
			loopType: "synth_chill",
			isPlaying: true,
			volume: .75,
			pan: -.2,
			muted: false,
			soloed: false
		},
		{
			id: "pad_10",
			name: "Cyber Arp",
			category: "synth",
			color: "violet",
			loopType: "synth_arp",
			isPlaying: false,
			volume: .7,
			pan: .3,
			muted: false,
			soloed: false
		},
		{
			id: "pad_11",
			name: "Lofi Keys",
			category: "synth",
			color: "violet",
			loopType: "synth_chill",
			isPlaying: false,
			volume: .8,
			pan: .1,
			muted: false,
			soloed: false
		},
		{
			id: "pad_12",
			name: "Neon Lead",
			category: "synth",
			color: "violet",
			loopType: "synth_arp",
			isPlaying: false,
			volume: .75,
			pan: -.3,
			muted: false,
			soloed: false
		},
		{
			id: "pad_13",
			name: "Sweep Riser",
			category: "fx",
			color: "amber",
			loopType: "fx_riser",
			isPlaying: false,
			volume: .6,
			pan: 0,
			muted: false,
			soloed: false
		},
		{
			id: "pad_14",
			name: "Glitch Hit",
			category: "fx",
			color: "amber",
			loopType: "fx_glitch",
			isPlaying: false,
			volume: .65,
			pan: .4,
			muted: false,
			soloed: false
		},
		{
			id: "pad_15",
			name: "Noise Drop",
			category: "fx",
			color: "amber",
			loopType: "fx_riser",
			isPlaying: false,
			volume: .55,
			pan: -.4,
			muted: false,
			soloed: false
		},
		{
			id: "pad_16",
			name: "FM Perc",
			category: "fx",
			color: "amber",
			loopType: "fx_glitch",
			isPlaying: false,
			volume: .7,
			pan: 0,
			muted: false,
			soloed: false
		}
	]);
	const [bpm, setBPM] = useState(124);
	const [masterVolume, setMasterVolume] = useState(.85);
	const [isPlaying, setIsPlaying] = useState(false);
	const [currentStep, setCurrentStep] = useState(0);
	const [maxZIndex, setMaxZIndex] = useState(20);
	// State history stack for Undo / Redo
	const [history, setHistory] = useState([]);
	const [future, setFuture] = useState([]);
	const updatePads = (action) => {
		setPads((prevPads) => {
			const nextPads = typeof action === "function" ? action(prevPads) : action;
			if (JSON.stringify(prevPads) !== JSON.stringify(nextPads)) {
				setHistory((h) => [...h.slice(-20), {
					pads: prevPads,
					bpm
				}]);
				setFuture([]);
			}
			return nextPads;
		});
	};
	const updateBPM = (newBpm) => {
		if (newBpm !== bpm) {
			setHistory((h) => [...h.slice(-20), {
				pads,
				bpm
			}]);
			setFuture([]);
			setBPM(newBpm);
		}
	};
	const handleUndo = () => {
		if (history.length === 0) return;
		const previous = history[history.length - 1];
		const newHistory = history.slice(0, history.length - 1);
		setFuture((f) => [{
			pads,
			bpm
		}, ...f]);
		setHistory(newHistory);
		setPads(previous.pads);
		setBPM(previous.bpm);
	};
	const handleRedo = () => {
		if (future.length === 0) return;
		const next = future[0];
		const newFuture = future.slice(1);
		setHistory((h) => [...h, {
			pads,
			bpm
		}]);
		setFuture(newFuture);
		setPads(next.pads);
		setBPM(next.bpm);
	};
	const [notification, setNotification] = useState(null);
	const showNotification = (msg) => {
		setNotification(msg);
		setTimeout(() => setNotification(null), 3e3);
	};
	useEffect(() => {
		const handleKeyDown = (e) => {
			const target = e.target;
			const isInput = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
			// Spacebar for Play/Stop
			if (e.code === "Space" && !isInput) {
				e.preventDefault();
				handleTogglePlay();
				return;
			}
			// Ctrl+S / Cmd+S for Quick Save
			if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
				e.preventDefault();
				const quickPreset = {
					name: `Quick Save (${new Date().toLocaleTimeString()})`,
					date: new Date().toLocaleString(),
					bpm,
					pads,
					masterVolume
				};
				try {
					const stored = localStorage.getItem("remix_os_presets_v1");
					const parsed = stored ? JSON.parse(stored) : [];
					const updated = [quickPreset, ...parsed];
					localStorage.setItem("remix_os_presets_v1", JSON.stringify(updated));
					showNotification("Project quick-saved to Local Storage (Ctrl+S)!");
				} catch (err) {
					console.error(err);
				}
				return;
			}
			// Delete / Backspace for clearing active playing pads
			if ((e.key === "Delete" || e.key === "Backspace") && !isInput) {
				e.preventDefault();
				updatePads((prev) => prev.map((p) => ({
					...p,
					isPlaying: false
				})));
				showNotification("All active playing pads stopped/cleared (Delete).");
				return;
			}
			// Undo / Redo (Ctrl+Z / Ctrl+Y)
			if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
				e.preventDefault();
				if (e.shiftKey) {
					handleRedo();
				} else {
					handleUndo();
				}
			} else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
				e.preventDefault();
				handleRedo();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [
		history,
		future,
		pads,
		bpm,
		isPlaying,
		masterVolume
	]);
	useEffect(() => {
		audioEngine.updatePadsState(pads);
	}, [pads]);
	useEffect(() => {
		audioEngine.setBPM(bpm);
	}, [bpm]);
	useEffect(() => {
		audioEngine.setMasterVolume(masterVolume);
	}, [masterVolume]);
	useEffect(() => {
		const loadApp = (id, x, y) => {
			const reg = APP_REGISTRY.find((a) => a.id === id);
			if (!reg) return null;
			return {
				id,
				title: reg.title,
				iconName: id,
				x,
				y,
				width: reg.defaultWidth,
				height: reg.defaultHeight,
				zIndex: 10,
				isMinimized: false,
				isOpen: true,
				isMaximized: false
			};
		};
		const initWindows = [
			loadApp("grid", 40, 30),
			loadApp("mixer", 680, 30),
			loadApp("aigen", 180, 150)
		].filter(Boolean);
		setWindows(initWindows);
		audioEngine.setOnStep((step) => setCurrentStep(step));
		return () => audioEngine.stop();
	}, []);
	useEffect(() => {
		audioEngine.initMIDI((padIndex) => {
			updatePads((prev) => prev.map((p, idx) => {
				if (idx === padIndex) {
					audioEngine.playPadDirect(p);
					return {
						...p,
						isPlaying: true
					};
				}
				return p;
			}));
			showNotification(`MIDI Note Triggered: Pad ${padIndex + 1}`);
		});
	}, []);
	const handleTogglePlay = () => {
		if (isPlaying) {
			audioEngine.stop();
			setIsPlaying(false);
		} else {
			audioEngine.start();
			setIsPlaying(true);
		}
	};
	const openWindow = (id) => {
		const nextZ = maxZIndex + 1;
		setMaxZIndex(nextZ);
		setWindows((prev) => {
			const exists = prev.find((w) => w.id === id);
			if (exists) return prev.map((w) => w.id === id ? {
				...w,
				isOpen: true,
				isMinimized: false,
				zIndex: nextZ
			} : w);
			const appInfo = APP_REGISTRY.find((a) => a.id === id);
			if (!appInfo) return prev;
			return [...prev, {
				id,
				title: appInfo.title,
				iconName: id,
				x: Math.max(20, Math.random() * 150),
				y: Math.max(20, Math.random() * 150),
				width: appInfo.defaultWidth,
				height: appInfo.defaultHeight,
				zIndex: nextZ,
				isOpen: true,
				isMinimized: false,
				isMaximized: false
			}];
		});
	};
	const updateWindow = (id, updates) => {
		setWindows((prev) => prev.map((w) => w.id === id ? {
			...w,
			...updates
		} : w));
	};
	const toggleWindow = (id) => {
		const w = windows.find((w) => w.id === id);
		if (!w) return;
		if (!w.isOpen) openWindow(id);
		else if (w.isMinimized) updateWindow(id, {
			isMinimized: false,
			zIndex: maxZIndex + 1
		});
		else updateWindow(id, { isMinimized: true });
		setMaxZIndex((prev) => prev + 1);
	};
	return /* @__PURE__ */ _jsxDEV("div", {
		className: "min-h-screen w-full h-screen bg-slate-950 text-slate-100 flex flex-col overflow-hidden select-none font-sans relative",
		children: [
			/* @__PURE__ */ _jsxDEV("div", { className: "absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black pointer-events-none z-0" }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 3201,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ _jsxDEV("div", { className: "absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:48px_48px] opacity-20 pointer-events-none z-0" }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 3202,
				columnNumber: 7
			}, this),
			notification && /* @__PURE__ */ _jsxDEV("div", {
				className: "absolute top-4 left-1/2 -translate-x-1/2 z-[100] bg-slate-900 border border-amber-500 text-amber-300 px-4 py-2 rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.3)] font-mono text-xs flex items-center gap-2 animate-bounce",
				children: [
					/* @__PURE__ */ _jsxDEV(Sparkles, { size: 14 }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 3206,
						columnNumber: 11
					}, this),
					" ",
					notification
				]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 3205,
				columnNumber: 9
			}, this),
			/* @__PURE__ */ _jsxDEV("div", {
				className: "flex-1 relative overflow-hidden z-10",
				children: [
					/* @__PURE__ */ _jsxDEV(DesktopIcons, { onOpenWindow: openWindow }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 3211,
						columnNumber: 9
					}, this),
					/* @__PURE__ */ _jsxDEV("div", {
						className: "absolute bottom-8 right-8 pointer-events-none opacity-10 text-right z-0",
						children: [/* @__PURE__ */ _jsxDEV("p", {
							className: "text-5xl font-black uppercase tracking-widest text-cyan-400",
							children: "REMIX OS"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 3213,
							columnNumber: 11
						}, this), /* @__PURE__ */ _jsxDEV("p", {
							className: "text-sm font-mono text-slate-400 tracking-widest",
							children: "AUDIO WORKSPACE PWA V2.0"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 3214,
							columnNumber: 11
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 3212,
						columnNumber: 9
					}, this),
					windows.filter((w) => w.isOpen).map((w) => {
						const reg = APP_REGISTRY.find((a) => a.id === w.id);
						const Icon = reg ? reg.icon : Grid;
						return /* @__PURE__ */ _jsxDEV(WindowFrame, {
							appWindow: w,
							icon: /* @__PURE__ */ _jsxDEV(Icon, {
								size: 14,
								className: reg?.color
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 3222,
								columnNumber: 46
							}, this),
							onClose: () => updateWindow(w.id, { isOpen: false }),
							onMinimize: () => updateWindow(w.id, { isMinimized: true }),
							onMaximize: () => updateWindow(w.id, { isMaximized: !w.isMaximized }),
							onFocus: () => {
								setMaxZIndex((z) => z + 1);
								updateWindow(w.id, { zIndex: maxZIndex + 1 });
							},
							onMove: (x, y) => updateWindow(w.id, {
								x,
								y
							}),
							children: [
								w.id === "grid" && /* @__PURE__ */ _jsxDEV(GridLauncher, {
									pads,
									currentStep,
									isPlaying,
									onTogglePad: (id) => updatePads((p) => p.map((pad) => pad.id === id ? {
										...pad,
										isPlaying: !pad.isPlaying
									} : pad))
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 3229,
									columnNumber: 35
								}, this),
								w.id === "mixer" && /* @__PURE__ */ _jsxDEV(MixerRack, {
									pads,
									masterVolume,
									onUpdateVolume: (id, vol) => updatePads((p) => p.map((pad) => pad.id === id ? {
										...pad,
										volume: vol
									} : pad)),
									onUpdatePan: (id, pan) => updatePads((p) => p.map((pad) => pad.id === id ? {
										...pad,
										pan
									} : pad)),
									onToggleMute: (id) => updatePads((p) => p.map((pad) => pad.id === id ? {
										...pad,
										muted: !pad.muted
									} : pad)),
									onToggleSolo: (id) => updatePads((p) => p.map((pad) => pad.id === id ? {
										...pad,
										soloed: !pad.soloed
									} : pad)),
									onUpdateMasterVolume: setMasterVolume
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 3230,
									columnNumber: 36
								}, this),
								w.id === "aigen" && /* @__PURE__ */ _jsxDEV(AITrackGenerator, {
									setBpm: updateBPM,
									setPads: updatePads
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 3231,
									columnNumber: 36
								}, this),
								w.id === "acid" && /* @__PURE__ */ _jsxDEV(AcidBoxSynth, {}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 3232,
									columnNumber: 35
								}, this),
								w.id === "scope" && /* @__PURE__ */ _jsxDEV(MasterOscilloscope, {}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 3233,
									columnNumber: 36
								}, this),
								w.id === "granular" && /* @__PURE__ */ _jsxDEV(GranularSynth, {}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 3234,
									columnNumber: 39
								}, this),
								w.id === "sequencer" && /* @__PURE__ */ _jsxDEV(StepSequencer, {}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 3235,
									columnNumber: 40
								}, this),
								w.id === "patchbay" && /* @__PURE__ */ _jsxDEV(ModularPatchBay, {}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 3236,
									columnNumber: 39
								}, this),
								w.id === "xypad" && /* @__PURE__ */ _jsxDEV(XYPerformancePad, {}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 3237,
									columnNumber: 36
								}, this),
								w.id === "fx" && /* @__PURE__ */ _jsxDEV(FXChain, {}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 3238,
									columnNumber: 33
								}, this),
								w.id === "crate" && /* @__PURE__ */ _jsxDEV(SampleCrate, {}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 3239,
									columnNumber: 36
								}, this),
								w.id === "preset-manager" && /* @__PURE__ */ _jsxDEV(PresetManager, {
									pads,
									bpm,
									masterVolume,
									onLoadPreset: (state) => {
										updatePads(state.pads);
										updateBPM(state.bpm);
										setMasterVolume(state.masterVolume);
									}
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 3240,
									columnNumber: 45
								}, this),
								w.id === "drummachine" && /* @__PURE__ */ _jsxDEV(DrumMachine, {}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 3241,
									columnNumber: 42
								}, this),
								w.id === "looper" && /* @__PURE__ */ _jsxDEV(Looper, {}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 3242,
									columnNumber: 37
								}, this),
								w.id === "sampler" && /* @__PURE__ */ _jsxDEV(Sampler, {}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 3243,
									columnNumber: 38
								}, this),
								w.id === "voicetrainer" && /* @__PURE__ */ _jsxDEV(VoiceTrainer, {}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 3244,
									columnNumber: 43
								}, this),
								w.id === "voicechanger" && /* @__PURE__ */ _jsxDEV(VoiceChanger, {}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 3245,
									columnNumber: 43
								}, this),
								w.id === "trim" && /* @__PURE__ */ _jsxDEV(AdvancedTrim, {}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 3246,
									columnNumber: 35
								}, this),
								w.id === "matrix" && /* @__PURE__ */ _jsxDEV(ChannelMatrix, {}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 3247,
									columnNumber: 37
								}, this),
								(w.id === "parametric-eq" || w.id === "eq") && /* @__PURE__ */ _jsxDEV(ParametricEQ, {}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 3248,
									columnNumber: 63
								}, this),
								(w.id === "vocalautotune" || w.id === "autotune") && /* @__PURE__ */ _jsxDEV(VocalAutoTune, {}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 3249,
									columnNumber: 69
								}, this),
								w.id === "djsetmix" && /* @__PURE__ */ _jsxDEV(DJSetMixStudio, {}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 3250,
									columnNumber: 39
								}, this),
								w.id === "mobile" && /* @__PURE__ */ _jsxDEV(MobileController, {}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 3251,
									columnNumber: 37
								}, this),
								w.id === "github-publisher" && /* @__PURE__ */ _jsxDEV(GitHubPublisher, {
									pads,
									bpm,
									masterVolume
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 3252,
									columnNumber: 47
								}, this)
							]
						}, w.id, true, {
							fileName: _jsxFileName,
							lineNumber: 3221,
							columnNumber: 13
						}, this);
					})
				]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 3210,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ _jsxDEV(Taskbar, {
				windows: windows.filter((w) => w.isOpen),
				isPlaying,
				bpm,
				currentStep,
				masterVolume,
				onTogglePlay: handleTogglePlay,
				onUpdateBPM: updateBPM,
				onUpdateMasterVolume: setMasterVolume,
				onToggleWindow: toggleWindow,
				onResetProject: () => {
					setWindows([]);
					openWindow("grid");
				},
				onUndo: handleUndo,
				onRedo: handleRedo,
				canUndo: history.length > 0,
				canRedo: future.length > 0
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 3258,
				columnNumber: 7
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 3200,
		columnNumber: 5
	}, this);
}

//# sourceMappingURL=data:application/json;base64,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LENBQVU7Ozs7O1FBQ2hDLEVBQUUsT0FBTyxrQkFBa0Isd0JBQUMsY0FBRCxDQUFlOzs7OztRQUMxQyxFQUFFLE9BQU8sa0JBQWtCLHdCQUFDLGNBQUQsQ0FBZTs7Ozs7UUFDMUMsRUFBRSxPQUFPLFVBQVUsd0JBQUMsY0FBRCxDQUFlOzs7OztRQUNsQyxFQUFFLE9BQU8sWUFBWSx3QkFBQyxlQUFELENBQWdCOzs7OztTQUNwQyxFQUFFLE9BQU8sbUJBQW1CLEVBQUUsT0FBTyxTQUFTLHdCQUFDLGNBQUQsQ0FBZTs7Ozs7U0FDN0QsRUFBRSxPQUFPLG1CQUFtQixFQUFFLE9BQU8sZUFBZSx3QkFBQyxlQUFELENBQWdCOzs7OztRQUNyRSxFQUFFLE9BQU8sY0FBYyx3QkFBQyxnQkFBRCxDQUFpQjs7Ozs7UUFDeEMsRUFBRSxPQUFPLFlBQVksd0JBQUMsa0JBQUQsQ0FBbUI7Ozs7O1FBQ3hDLEVBQUUsT0FBTyxzQkFBc0Isd0JBQUMsaUJBQUQ7U0FBdUI7U0FBVztTQUFtQjtRQUFlOzs7OztPQUN6RjtTQS9CTixFQUFFOzs7O2FBK0JJO0tBRWpCLENBQUM7SUFDRTs7Ozs7O0dBRUwsd0JBQUMsU0FBRDtJQUNFLFNBQVMsUUFBUSxRQUFRLE1BQU0sRUFBRSxNQUFNO0lBQzVCO0lBQWdCO0lBQWtCO0lBQTJCO0lBQ3hFLGNBQWM7SUFBa0IsYUFBYTtJQUFXLHNCQUFzQjtJQUM5RSxnQkFBZ0I7SUFBYyxzQkFBc0I7S0FBRSxXQUFXLENBQUMsQ0FBQztLQUFHLFdBQVcsTUFBTTtJQUFHO0lBQzFGLFFBQVE7SUFBWSxRQUFRO0lBQVksU0FBUyxRQUFRLFNBQVM7SUFBRyxTQUFTLE9BQU8sU0FBUztHQUMvRjs7Ozs7RUFDRTs7Ozs7O0FBRVQiLCJuYW1lcyI6W10sInNvdXJjZXMiOlsiQXBwLnRzeCJdLCJ2ZXJzaW9uIjozLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBTUERYLUxpY2Vuc2UtSWRlbnRpZmllcjogQXBhY2hlLTIuMFxuICovXG5cbmltcG9ydCBSZWFjdCwgeyB1c2VTdGF0ZSwgdXNlRWZmZWN0LCB1c2VSZWYgfSBmcm9tIFwicmVhY3RcIjtcbmltcG9ydCB7IEdvb2dsZUdlbkFJIH0gZnJvbSBcIkBnb29nbGUvZ2VuYWlcIjtcbmltcG9ydCB7IFxuICBHcmlkLCBTbGlkZXJzLCBBY3Rpdml0eSwgRGlzYywgU3BhcmtsZXMsIE5ldHdvcmssIE1vdmUsIEZvbGRlciwgWmFwLCBcbiAgU21hcnRwaG9uZSwgTWljMiwgTWljLCBTY2lzc29ycywgTGF5b3V0R3JpZCwgQmFyQ2hhcnQsIE11c2ljLCBSYWRpbywgR2l0aHViLCBcbiAgUGxheSwgU3F1YXJlLCBYLCBNaW51cywgTWF4aW1pemUyLCBWb2x1bWUyLCBSZWZyZXNoQ3csXG4gIEJvdCwgU2VuZCwgVGVybWluYWwsIFdhbmQyLCBWb2x1bWVYLCBDcHUsIFJvdGF0ZUNjdywgUm90YXRlQ3dcbn0gZnJvbSBcImx1Y2lkZS1yZWFjdFwiO1xuXG50eXBlIFdpbmRvd0lkID0gc3RyaW5nO1xuXG5pbnRlcmZhY2UgQXBwV2luZG93IHtcbiAgaWQ6IFdpbmRvd0lkO1xuICB0aXRsZTogc3RyaW5nO1xuICBpY29uTmFtZTogc3RyaW5nO1xuICB4OiBudW1iZXI7XG4gIHk6IG51bWJlcjtcbiAgd2lkdGg6IG51bWJlcjtcbiAgaGVpZ2h0OiBudW1iZXI7XG4gIHpJbmRleDogbnVtYmVyO1xuICBpc01pbmltaXplZDogYm9vbGVhbjtcbiAgaXNPcGVuOiBib29sZWFuO1xuICBpc01heGltaXplZDogYm9vbGVhbjtcbn1cblxuaW50ZXJmYWNlIFBhZCB7XG4gIGlkOiBzdHJpbmc7XG4gIG5hbWU6IHN0cmluZztcbiAgY2F0ZWdvcnk6IFwiZHJ1bXNcIiB8IFwiYmFzc1wiIHwgXCJzeW50aFwiIHwgXCJmeFwiO1xuICBjb2xvcjogc3RyaW5nO1xuICBsb29wVHlwZTogc3RyaW5nO1xuICBpc1BsYXlpbmc6IGJvb2xlYW47XG4gIHZvbHVtZTogbnVtYmVyO1xuICBwYW46IG51bWJlcjtcbiAgbXV0ZWQ6IGJvb2xlYW47XG4gIHNvbG9lZDogYm9vbGVhbjtcbn1cblxuaW50ZXJmYWNlIEZYU2V0dGluZ3Mge1xuICBmaWx0ZXJDdXRvZmY6IG51bWJlcjtcbiAgZmlsdGVyUmVzb25hbmNlOiBudW1iZXI7XG4gIGZpbHRlclR5cGU6IHN0cmluZztcbiAgZGVsYXlUaW1lOiBudW1iZXI7XG4gIGRlbGF5RmVlZGJhY2s6IG51bWJlcjtcbiAgZGVsYXlNaXg6IG51bWJlcjtcbiAgcmV2ZXJiTWl4OiBudW1iZXI7XG4gIGRpc3RvcnRpb25Ecml2ZTogbnVtYmVyO1xufVxuXG5jbGFzcyBBdWRpb0VuZ2luZSB7XG4gIHByaXZhdGUgYnBtOiBudW1iZXIgPSAxMjQ7XG4gIHByaXZhdGUgaXNQbGF5aW5nOiBib29sZWFuID0gZmFsc2U7XG4gIHByaXZhdGUgc3RlcDogbnVtYmVyID0gMDtcbiAgcHJpdmF0ZSBpbnRlcnZhbElkOiBudW1iZXIgfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBvblN0ZXBDYWxsYmFjazogKHN0ZXA6IG51bWJlcikgPT4gdm9pZCA9ICgpID0+IHt9O1xuICBcbiAgLy8gUmVhbCBhdWRpbyBzdGF0ZVxuICBwcml2YXRlIGF1ZGlvQ3R4OiBBdWRpb0NvbnRleHQgfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBhbmFseXNlcjogQW5hbHlzZXJOb2RlIHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgcGFkczogUGFkW10gPSBbXTtcbiAgcHJpdmF0ZSBtYXN0ZXJWb2x1bWU6IG51bWJlciA9IDAuODU7XG5cbiAgLy8gQURTUiBTZXR0aW5nc1xuICBwcml2YXRlIGFkc3IgPSB7IGF0dGFjazogMTUsIGRlY2F5OiA0NSwgc3VzdGFpbjogNzAsIHJlbGVhc2U6IDUwIH07XG5cbiAgLy8gRVEgQmFuZHMgU2V0dGluZ3NcbiAgcHJpdmF0ZSBlcUJhbmRzID0gW1xuICAgIHsgZnJlcTogMjAsIGdhaW46IDUwLCBxOiA2MCB9LFxuICAgIHsgZnJlcTogNDAsIGdhaW46IDQ1LCBxOiA1MCB9LFxuICAgIHsgZnJlcTogNjUsIGdhaW46IDU1LCBxOiA3MCB9LFxuICAgIHsgZnJlcTogODUsIGdhaW46IDUwLCBxOiA0MCB9XG4gIF07XG5cbiAgc2V0QlBNKGJwbTogbnVtYmVyKSB7IHRoaXMuYnBtID0gYnBtOyB9XG4gIHNldE1hc3RlclZvbHVtZSh2b2w6IG51bWJlcikgeyB0aGlzLm1hc3RlclZvbHVtZSA9IHZvbDsgfVxuICB1cGRhdGVQYWRzU3RhdGUocGFkczogUGFkW10pIHsgdGhpcy5wYWRzID0gcGFkczsgfVxuICB1cGRhdGVGWChmeDogRlhTZXR0aW5ncykgeyAvKiBSZWFkeSBmb3IgRlggaW1wbGVtZW50YXRpb24gKi8gfVxuXG4gIHNldEFEU1IocGFyYW06ICdhdHRhY2snIHwgJ2RlY2F5JyB8ICdzdXN0YWluJyB8ICdyZWxlYXNlJywgdmFsdWU6IG51bWJlcikge1xuICAgIHRoaXMuYWRzcltwYXJhbV0gPSB2YWx1ZTtcbiAgfVxuXG4gIHNldEVRQmFuZChiYW5kSW5kZXg6IG51bWJlciwgcGFyYW06ICdmcmVxJyB8ICdnYWluJyB8ICdxJywgdmFsdWU6IG51bWJlcikge1xuICAgIGlmICh0aGlzLmVxQmFuZHNbYmFuZEluZGV4XSkge1xuICAgICAgdGhpcy5lcUJhbmRzW2JhbmRJbmRleF1bcGFyYW1dID0gdmFsdWU7XG4gICAgfVxuICB9XG5cbiAgZ2V0SXNQbGF5aW5nKCkgeyByZXR1cm4gdGhpcy5pc1BsYXlpbmc7IH1cbiAgXG4gIHNldE9uU3RlcChjYjogKHN0ZXA6IG51bWJlcikgPT4gdm9pZCkge1xuICAgIHRoaXMub25TdGVwQ2FsbGJhY2sgPSBjYjtcbiAgfVxuXG4gIGdldEJ5dGVUaW1lRG9tYWluRGF0YShhcnJheTogVWludDhBcnJheSkge1xuICAgIGlmICh0aGlzLmFuYWx5c2VyICYmIHRoaXMuYXVkaW9DdHggJiYgdGhpcy5hdWRpb0N0eC5zdGF0ZSA9PT0gJ3J1bm5pbmcnKSB7XG4gICAgICB0aGlzLmFuYWx5c2VyLmdldEJ5dGVUaW1lRG9tYWluRGF0YShhcnJheSBhcyBhbnkpO1xuICAgIH0gZWxzZSB7XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGFycmF5Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGFycmF5W2ldID0gMTI4ICsgTWF0aC5zaW4oaSAvIDQgKyBEYXRlLm5vdygpIC8gMTAwKSAqIDE1O1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGdldEJ5dGVGcmVxdWVuY3lEYXRhKGFycmF5OiBVaW50OEFycmF5KSB7XG4gICAgaWYgKHRoaXMuYW5hbHlzZXIgJiYgdGhpcy5hdWRpb0N0eCAmJiB0aGlzLmF1ZGlvQ3R4LnN0YXRlID09PSAncnVubmluZycpIHtcbiAgICAgIHRoaXMuYW5hbHlzZXIuZ2V0Qnl0ZUZyZXF1ZW5jeURhdGEoYXJyYXkgYXMgYW55KTtcbiAgICB9IGVsc2Uge1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBhcnJheS5sZW5ndGg7IGkrKykge1xuICAgICAgICBhcnJheVtpXSA9IE1hdGguYWJzKE1hdGguc2luKGkgLyAyICsgRGF0ZS5ub3coKSAvIDE1MCkpICogMTYwICsgTWF0aC5yYW5kb20oKSAqIDQwO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGFzeW5jIGRlY29kZUF1ZGlvRGF0YShhcnJheUJ1ZmZlcjogQXJyYXlCdWZmZXIpOiBQcm9taXNlPEF1ZGlvQnVmZmVyIHwgbnVsbD4ge1xuICAgIHRoaXMuaW5pdEF1ZGlvKCk7XG4gICAgaWYgKCF0aGlzLmF1ZGlvQ3R4KSByZXR1cm4gbnVsbDtcbiAgICB0cnkge1xuICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuYXVkaW9DdHguZGVjb2RlQXVkaW9EYXRhKGFycmF5QnVmZmVyKTtcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoXCJBdWRpbyBkZWNvZGUgZXJyb3I6XCIsIGVycik7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gIH1cblxuICB0cmlnZ2VyUG9seVZvaWNlKFxuICAgIGZyZXF1ZW5jeTogbnVtYmVyLFxuICAgIGxheWVyczogeyBidWZmZXI6IEF1ZGlvQnVmZmVyIHwgbnVsbDsgdm9sdW1lOiBudW1iZXI7IHBpdGNoT2Zmc2V0OiBudW1iZXI7IHBhbjogbnVtYmVyOyBhY3RpdmU6IGJvb2xlYW4gfVtdLFxuICAgIGFkc3JPdmVycmlkZT86IHsgYXR0YWNrOiBudW1iZXI7IGRlY2F5OiBudW1iZXI7IHN1c3RhaW46IG51bWJlcjsgcmVsZWFzZTogbnVtYmVyIH1cbiAgKSB7XG4gICAgdGhpcy5pbml0QXVkaW8oKTtcbiAgICBpZiAoIXRoaXMuYXVkaW9DdHgpIHJldHVybjtcblxuICAgIGNvbnN0IG5vdyA9IHRoaXMuYXVkaW9DdHguY3VycmVudFRpbWU7XG4gICAgY29uc3QgZW52ID0gYWRzck92ZXJyaWRlIHx8IHRoaXMuYWRzcjtcblxuICAgIGNvbnN0IGF0dGFja1RpbWUgPSBNYXRoLm1heCgwLjAwNSwgKGVudi5hdHRhY2sgLyAxMDApICogMS41KTtcbiAgICBjb25zdCBkZWNheVRpbWUgPSBNYXRoLm1heCgwLjAxLCAoZW52LmRlY2F5IC8gMTAwKSAqIDEuNSk7XG4gICAgY29uc3QgcmVsZWFzZVRpbWUgPSBNYXRoLm1heCgwLjA1LCAoZW52LnJlbGVhc2UgLyAxMDApICogMi41KTtcbiAgICBjb25zdCBzdXN0YWluTGV2ZWwgPSBNYXRoLm1heCgwLjAwMSwgKGVudi5zdXN0YWluIC8gMTAwKSAqIHRoaXMubWFzdGVyVm9sdW1lKTtcblxuICAgIGNvbnN0IG1hc3RlckdhaW4gPSB0aGlzLmF1ZGlvQ3R4LmNyZWF0ZUdhaW4oKTtcbiAgICBtYXN0ZXJHYWluLmdhaW4uc2V0VmFsdWVBdFRpbWUoMC4wMDAxLCBub3cpO1xuICAgIG1hc3RlckdhaW4uZ2Fpbi5saW5lYXJSYW1wVG9WYWx1ZUF0VGltZSh0aGlzLm1hc3RlclZvbHVtZSwgbm93ICsgYXR0YWNrVGltZSk7XG4gICAgbWFzdGVyR2Fpbi5nYWluLmxpbmVhclJhbXBUb1ZhbHVlQXRUaW1lKHN1c3RhaW5MZXZlbCwgbm93ICsgYXR0YWNrVGltZSArIGRlY2F5VGltZSk7XG4gICAgbWFzdGVyR2Fpbi5nYWluLmV4cG9uZW50aWFsUmFtcFRvVmFsdWVBdFRpbWUoMC4wMDAxLCBub3cgKyBhdHRhY2tUaW1lICsgZGVjYXlUaW1lICsgcmVsZWFzZVRpbWUpO1xuXG4gICAgaWYgKHRoaXMuYW5hbHlzZXIpIHtcbiAgICAgIG1hc3RlckdhaW4uY29ubmVjdCh0aGlzLmFuYWx5c2VyKTtcbiAgICAgIHRoaXMuYW5hbHlzZXIuY29ubmVjdCh0aGlzLmF1ZGlvQ3R4LmRlc3RpbmF0aW9uKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbWFzdGVyR2Fpbi5jb25uZWN0KHRoaXMuYXVkaW9DdHguZGVzdGluYXRpb24pO1xuICAgIH1cblxuICAgIGxldCBwbGF5ZWRCdWZmZXJzID0gMDtcbiAgICBsYXllcnMuZm9yRWFjaChsYXllciA9PiB7XG4gICAgICBpZiAoIWxheWVyLmFjdGl2ZSB8fCBsYXllci52b2x1bWUgPD0gMCkgcmV0dXJuO1xuXG4gICAgICBpZiAobGF5ZXIuYnVmZmVyKSB7XG4gICAgICAgIHBsYXllZEJ1ZmZlcnMrKztcbiAgICAgICAgY29uc3Qgc291cmNlID0gdGhpcy5hdWRpb0N0eCEuY3JlYXRlQnVmZmVyU291cmNlKCk7XG4gICAgICAgIHNvdXJjZS5idWZmZXIgPSBsYXllci5idWZmZXI7XG5cbiAgICAgICAgY29uc3QgYmFzZVJhdGlvID0gZnJlcXVlbmN5IC8gMjYxLjYzO1xuICAgICAgICBjb25zdCBwaXRjaFJhdGlvID0gYmFzZVJhdGlvICogTWF0aC5wb3coMiwgbGF5ZXIucGl0Y2hPZmZzZXQgLyAxMik7XG4gICAgICAgIHNvdXJjZS5wbGF5YmFja1JhdGUuc2V0VmFsdWVBdFRpbWUoTWF0aC5tYXgoMC4xLCBwaXRjaFJhdGlvKSwgbm93KTtcblxuICAgICAgICBjb25zdCBwYW5uZXIgPSB0aGlzLmF1ZGlvQ3R4IS5jcmVhdGVTdGVyZW9QYW5uZXIoKTtcbiAgICAgICAgcGFubmVyLnBhbi5zZXRWYWx1ZUF0VGltZShsYXllci5wYW4gfHwgMCwgbm93KTtcblxuICAgICAgICBjb25zdCBsYXllckdhaW4gPSB0aGlzLmF1ZGlvQ3R4IS5jcmVhdGVHYWluKCk7XG4gICAgICAgIGxheWVyR2Fpbi5nYWluLnNldFZhbHVlQXRUaW1lKGxheWVyLnZvbHVtZSwgbm93KTtcblxuICAgICAgICBpZiAocGFubmVyKSB7XG4gICAgICAgICAgc291cmNlLmNvbm5lY3QocGFubmVyKTtcbiAgICAgICAgICBwYW5uZXIuY29ubmVjdChsYXllckdhaW4pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHNvdXJjZS5jb25uZWN0KGxheWVyR2Fpbik7XG4gICAgICAgIH1cbiAgICAgICAgbGF5ZXJHYWluLmNvbm5lY3QobWFzdGVyR2Fpbik7XG5cbiAgICAgICAgc291cmNlLnN0YXJ0KG5vdyk7XG4gICAgICAgIHNvdXJjZS5zdG9wKG5vdyArIGF0dGFja1RpbWUgKyBkZWNheVRpbWUgKyByZWxlYXNlVGltZSArIDAuMSk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBpZiAocGxheWVkQnVmZmVycyA9PT0gMCkge1xuICAgICAgY29uc3Qgb3NjID0gdGhpcy5hdWRpb0N0eC5jcmVhdGVPc2NpbGxhdG9yKCk7XG4gICAgICBvc2MudHlwZSA9ICd0cmlhbmdsZSc7XG4gICAgICBvc2MuZnJlcXVlbmN5LnNldFZhbHVlQXRUaW1lKGZyZXF1ZW5jeSwgbm93KTtcblxuICAgICAgY29uc3Qgc3ViT3NjID0gdGhpcy5hdWRpb0N0eC5jcmVhdGVPc2NpbGxhdG9yKCk7XG4gICAgICBzdWJPc2MudHlwZSA9ICdzaW5lJztcbiAgICAgIHN1Yk9zYy5mcmVxdWVuY3kuc2V0VmFsdWVBdFRpbWUoZnJlcXVlbmN5IC8gMiwgbm93KTtcblxuICAgICAgY29uc3QgbGF5ZXJHYWluID0gdGhpcy5hdWRpb0N0eC5jcmVhdGVHYWluKCk7XG4gICAgICBsYXllckdhaW4uZ2Fpbi5zZXRWYWx1ZUF0VGltZSgwLjUsIG5vdyk7XG5cbiAgICAgIG9zYy5jb25uZWN0KGxheWVyR2Fpbik7XG4gICAgICBzdWJPc2MuY29ubmVjdChsYXllckdhaW4pO1xuICAgICAgbGF5ZXJHYWluLmNvbm5lY3QobWFzdGVyR2Fpbik7XG5cbiAgICAgIG9zYy5zdGFydChub3cpO1xuICAgICAgc3ViT3NjLnN0YXJ0KG5vdyk7XG4gICAgICBvc2Muc3RvcChub3cgKyBhdHRhY2tUaW1lICsgZGVjYXlUaW1lICsgcmVsZWFzZVRpbWUgKyAwLjEpO1xuICAgICAgc3ViT3NjLnN0b3Aobm93ICsgYXR0YWNrVGltZSArIGRlY2F5VGltZSArIHJlbGVhc2VUaW1lICsgMC4xKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGluaXRBdWRpbygpIHtcbiAgICBpZiAoIXRoaXMuYXVkaW9DdHgpIHtcbiAgICAgIHRoaXMuYXVkaW9DdHggPSBuZXcgKHdpbmRvdy5BdWRpb0NvbnRleHQgfHwgKHdpbmRvdyBhcyBhbnkpLndlYmtpdEF1ZGlvQ29udGV4dCkoKTtcbiAgICB9XG4gICAgaWYgKCF0aGlzLmFuYWx5c2VyICYmIHRoaXMuYXVkaW9DdHgpIHtcbiAgICAgIHRoaXMuYW5hbHlzZXIgPSB0aGlzLmF1ZGlvQ3R4LmNyZWF0ZUFuYWx5c2VyKCk7XG4gICAgICB0aGlzLmFuYWx5c2VyLmZmdFNpemUgPSAyNTY7XG4gICAgICB0aGlzLmFuYWx5c2VyLnNtb290aGluZ1RpbWVDb25zdGFudCA9IDAuODtcbiAgICB9XG4gICAgaWYgKHRoaXMuYXVkaW9DdHguc3RhdGUgPT09ICdzdXNwZW5kZWQnKSB7XG4gICAgICB0aGlzLmF1ZGlvQ3R4LnJlc3VtZSgpO1xuICAgIH1cbiAgfVxuXG4gIGluaXRNSURJKG9uUGFkVHJpZ2dlcjogKHBhZEluZGV4OiBudW1iZXIpID0+IHZvaWQpIHtcbiAgICBpZiAoKG5hdmlnYXRvciBhcyBhbnkpLnJlcXVlc3RNSURJQWNjZXNzKSB7XG4gICAgICAobmF2aWdhdG9yIGFzIGFueSkucmVxdWVzdE1JRElBY2Nlc3MoKS50aGVuKFxuICAgICAgICAobWlkaUFjY2VzczogYW55KSA9PiB7XG4gICAgICAgICAgY29uc29sZS5sb2coXCJXZWIgTUlESSBBUEkgY29ubmVjdGVkIVwiKTtcbiAgICAgICAgICBmb3IgKGNvbnN0IGlucHV0IG9mIG1pZGlBY2Nlc3MuaW5wdXRzLnZhbHVlcygpKSB7XG4gICAgICAgICAgICBpbnB1dC5vbm1pZGltZXNzYWdlID0gKGV2ZW50OiBhbnkpID0+IHtcbiAgICAgICAgICAgICAgY29uc3QgW3N0YXR1cywgZGF0YTEsIGRhdGEyXSA9IGV2ZW50LmRhdGE7XG4gICAgICAgICAgICAgIGlmICgoc3RhdHVzICYgMHhmMCkgPT09IDB4OTAgJiYgZGF0YTIgPiAwKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcGFkSW5kZXggPSAoZGF0YTEgLSAzNikgJSAxNjtcbiAgICAgICAgICAgICAgICBpZiAocGFkSW5kZXggPj0gMCAmJiBwYWRJbmRleCA8IDE2KSB7XG4gICAgICAgICAgICAgICAgICBvblBhZFRyaWdnZXIocGFkSW5kZXgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIChlcnI6IGFueSkgPT4ge1xuICAgICAgICAgIGNvbnNvbGUud2FybihcIldlYiBNSURJIGFjY2VzcyBkZW5pZWQgb3IgdW5zdXBwb3J0ZWQ6XCIsIGVycik7XG4gICAgICAgIH1cbiAgICAgICk7XG4gICAgfVxuICB9XG5cbiAgcGxheVBhZERpcmVjdChwYWQ6IFBhZCkge1xuICAgIHRoaXMuaW5pdEF1ZGlvKCk7XG4gICAgdGhpcy5wbGF5U291bmQocGFkKTtcbiAgfVxuXG4gIHByaXZhdGUgbWVkaWFSZWNvcmRlcjogTWVkaWFSZWNvcmRlciB8IG51bGwgPSBudWxsO1xuICBwcml2YXRlIHJlY29yZGVkQ2h1bmtzOiBCbG9iW10gPSBbXTtcblxuICBzdGFydFJlY29yZGluZ0F1ZGlvKG9uQ29tcGxldGU6IChibG9iOiBCbG9iKSA9PiB2b2lkKSB7XG4gICAgdGhpcy5pbml0QXVkaW8oKTtcbiAgICBpZiAoIXRoaXMuYXVkaW9DdHgpIHJldHVybjtcbiAgICB0cnkge1xuICAgICAgY29uc3QgZGVzdCA9IHRoaXMuYXVkaW9DdHguY3JlYXRlTWVkaWFTdHJlYW1EZXN0aW5hdGlvbigpO1xuICAgICAgaWYgKHRoaXMuYW5hbHlzZXIpIHtcbiAgICAgICAgdGhpcy5hbmFseXNlci5jb25uZWN0KGRlc3QpO1xuICAgICAgfVxuICAgICAgdGhpcy5tZWRpYVJlY29yZGVyID0gbmV3IE1lZGlhUmVjb3JkZXIoZGVzdC5zdHJlYW0pO1xuICAgICAgdGhpcy5yZWNvcmRlZENodW5rcyA9IFtdO1xuICAgICAgdGhpcy5tZWRpYVJlY29yZGVyLm9uZGF0YWF2YWlsYWJsZSA9IChlKSA9PiB7XG4gICAgICAgIGlmIChlLmRhdGEuc2l6ZSA+IDApIHRoaXMucmVjb3JkZWRDaHVua3MucHVzaChlLmRhdGEpO1xuICAgICAgfTtcbiAgICAgIHRoaXMubWVkaWFSZWNvcmRlci5vbnN0b3AgPSAoKSA9PiB7XG4gICAgICAgIGNvbnN0IGJsb2IgPSBuZXcgQmxvYih0aGlzLnJlY29yZGVkQ2h1bmtzLCB7IHR5cGU6ICdhdWRpby93ZWJtJyB9KTtcbiAgICAgICAgb25Db21wbGV0ZShibG9iKTtcbiAgICAgIH07XG4gICAgICB0aGlzLm1lZGlhUmVjb3JkZXIuc3RhcnQoKTtcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoXCJNZWRpYVJlY29yZGVyIGVycm9yOlwiLCBlcnIpO1xuICAgIH1cbiAgfVxuXG4gIHN0b3BSZWNvcmRpbmdBdWRpbygpIHtcbiAgICBpZiAodGhpcy5tZWRpYVJlY29yZGVyICYmIHRoaXMubWVkaWFSZWNvcmRlci5zdGF0ZSAhPT0gJ2luYWN0aXZlJykge1xuICAgICAgdGhpcy5tZWRpYVJlY29yZGVyLnN0b3AoKTtcbiAgICB9XG4gIH1cblxuICBzdGFydCgpIHtcbiAgICB0aGlzLmluaXRBdWRpbygpO1xuICAgIHRoaXMuaXNQbGF5aW5nID0gdHJ1ZTtcbiAgICB0aGlzLnRpY2soKTtcbiAgfVxuXG4gIHN0b3AoKSB7XG4gICAgdGhpcy5pc1BsYXlpbmcgPSBmYWxzZTtcbiAgICBpZiAodGhpcy5pbnRlcnZhbElkKSBjbGVhclRpbWVvdXQodGhpcy5pbnRlcnZhbElkKTtcbiAgICB0aGlzLnN0ZXAgPSAwO1xuICAgIHRoaXMub25TdGVwQ2FsbGJhY2soMCk7XG4gIH1cblxuICAvLyBXZWIgQXVkaW8gc3ludGggcGF0Y2ggd2l0aCBBRFNSIGVudmVsb3BlIGludGVncmF0aW9uXG4gIHByaXZhdGUgcGxheVNvdW5kKHBhZDogUGFkKSB7XG4gICAgaWYgKCF0aGlzLmF1ZGlvQ3R4IHx8IHBhZC5tdXRlZCB8fCBwYWQudm9sdW1lID09PSAwKSByZXR1cm47XG4gICAgXG4gICAgY29uc3Qgb3NjID0gdGhpcy5hdWRpb0N0eC5jcmVhdGVPc2NpbGxhdG9yKCk7XG4gICAgY29uc3QgZ2Fpbk5vZGUgPSB0aGlzLmF1ZGlvQ3R4LmNyZWF0ZUdhaW4oKTtcbiAgICBcbiAgICBvc2MuY29ubmVjdChnYWluTm9kZSk7XG4gICAgaWYgKHRoaXMuYW5hbHlzZXIpIHtcbiAgICAgIGdhaW5Ob2RlLmNvbm5lY3QodGhpcy5hbmFseXNlcik7XG4gICAgICB0aGlzLmFuYWx5c2VyLmNvbm5lY3QodGhpcy5hdWRpb0N0eC5kZXN0aW5hdGlvbik7XG4gICAgfSBlbHNlIHtcbiAgICAgIGdhaW5Ob2RlLmNvbm5lY3QodGhpcy5hdWRpb0N0eC5kZXN0aW5hdGlvbik7XG4gICAgfVxuICAgIFxuICAgIGNvbnN0IG5vdyA9IHRoaXMuYXVkaW9DdHguY3VycmVudFRpbWU7XG4gICAgY29uc3QgZmluYWxWb2x1bWUgPSBwYWQudm9sdW1lICogdGhpcy5tYXN0ZXJWb2x1bWU7XG4gICAgXG4gICAgLy8gQ2FsY3VsYXRlIGF0dGFjayBhbmQgcmVsZWFzZSB0aW1lcyBmcm9tIEFEU1Igc3RhdGUgKHNlY29uZHMpXG4gICAgY29uc3QgYXR0YWNrVGltZSA9IE1hdGgubWF4KDAuMDA1LCAodGhpcy5hZHNyLmF0dGFjayAvIDEwMCkgKiAwLjEpO1xuICAgIGNvbnN0IHJlbGVhc2VUaW1lID0gTWF0aC5tYXgoMC4xLCAodGhpcy5hZHNyLnJlbGVhc2UgLyAxMDApICogMC41KTtcbiAgICBjb25zdCBzdXN0YWluTGV2ZWwgPSBmaW5hbFZvbHVtZSAqICh0aGlzLmFkc3Iuc3VzdGFpbiAvIDEwMCk7XG5cbiAgICAvLyBFbnZlbG9wZVxuICAgIGdhaW5Ob2RlLmdhaW4uc2V0VmFsdWVBdFRpbWUoMCwgbm93KTtcbiAgICBnYWluTm9kZS5nYWluLmxpbmVhclJhbXBUb1ZhbHVlQXRUaW1lKGZpbmFsVm9sdW1lLCBub3cgKyBhdHRhY2tUaW1lKTtcbiAgICBnYWluTm9kZS5nYWluLmV4cG9uZW50aWFsUmFtcFRvVmFsdWVBdFRpbWUoTWF0aC5tYXgoMC4wMDAxLCBzdXN0YWluTGV2ZWwpLCBub3cgKyBhdHRhY2tUaW1lICsgMC4xKTtcbiAgICBnYWluTm9kZS5nYWluLmV4cG9uZW50aWFsUmFtcFRvVmFsdWVBdFRpbWUoMC4wMDEsIG5vdyArIGF0dGFja1RpbWUgKyByZWxlYXNlVGltZSk7XG5cbiAgICAvLyBQYXRjaCBkZXNpZ24gYmFzZWQgb24gY2F0ZWdvcnlcbiAgICBpZiAocGFkLmNhdGVnb3J5ID09PSAnZHJ1bXMnKSB7XG4gICAgICAgb3NjLnR5cGUgPSAnc2luZSc7XG4gICAgICAgb3NjLmZyZXF1ZW5jeS5zZXRWYWx1ZUF0VGltZSgxNTAsIG5vdyk7IC8vIEtpY2sgdGh1bXBcbiAgICAgICBvc2MuZnJlcXVlbmN5LmV4cG9uZW50aWFsUmFtcFRvVmFsdWVBdFRpbWUoNDAsIG5vdyArIDAuMSk7XG4gICAgfSBlbHNlIGlmIChwYWQuY2F0ZWdvcnkgPT09ICdiYXNzJykge1xuICAgICAgIG9zYy50eXBlID0gJ3Nhd3Rvb3RoJztcbiAgICAgICBvc2MuZnJlcXVlbmN5LnNldFZhbHVlQXRUaW1lKDY1LjQxLCBub3cpOyAvLyBDMiBOb3RlXG4gICAgfSBlbHNlIGlmIChwYWQuY2F0ZWdvcnkgPT09ICdzeW50aCcpIHtcbiAgICAgICBvc2MudHlwZSA9ICd0cmlhbmdsZSc7XG4gICAgICAgb3NjLmZyZXF1ZW5jeS5zZXRWYWx1ZUF0VGltZSgyNjEuNjMsIG5vdyk7IC8vIEM0IE5vdGVcbiAgICB9IGVsc2UgeyAvLyBGWFxuICAgICAgIG9zYy50eXBlID0gJ3NxdWFyZSc7XG4gICAgICAgb3NjLmZyZXF1ZW5jeS5zZXRWYWx1ZUF0VGltZShNYXRoLnJhbmRvbSgpICogODAwICsgMjAwLCBub3cpOyAvLyBSYW5kb20gYmxpcFxuICAgIH1cblxuICAgIG9zYy5zdGFydChub3cpO1xuICAgIG9zYy5zdG9wKG5vdyArIGF0dGFja1RpbWUgKyByZWxlYXNlVGltZSk7XG4gIH1cblxuICBwcml2YXRlIHRpY2soKSB7XG4gICAgaWYgKCF0aGlzLmlzUGxheWluZykgcmV0dXJuO1xuICAgIFxuICAgIC8vIFRyaWdnZXIgc291bmRzIGZvciB0aGlzIHN0ZXBcbiAgICB0aGlzLnBhZHMuZm9yRWFjaCgocGFkLCBpZHgpID0+IHtcbiAgICAgIGlmIChwYWQuaXNQbGF5aW5nICYmICFwYWQubXV0ZWQgJiYgKHRoaXMuc3RlcCAlIDQgPT09IGlkeCAlIDQpKSB7XG4gICAgICAgIHRoaXMucGxheVNvdW5kKHBhZCk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBjb25zdCBzdGVwRHVyYXRpb24gPSAoKDYwIC8gdGhpcy5icG0pICogMTAwMCkgLyA0O1xuICAgIHRoaXMuaW50ZXJ2YWxJZCA9IHdpbmRvdy5zZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgIHRoaXMuc3RlcCA9ICh0aGlzLnN0ZXAgKyAxKSAlIDE2O1xuICAgICAgdGhpcy5vblN0ZXBDYWxsYmFjayh0aGlzLnN0ZXApO1xuICAgICAgdGhpcy50aWNrKCk7XG4gICAgfSwgc3RlcER1cmF0aW9uKTtcbiAgfVxufVxuXG5jb25zdCBhdWRpb0VuZ2luZSA9IG5ldyBBdWRpb0VuZ2luZSgpO1xuXG5jb25zdCBBUFBfUkVHSVNUUlkgPSBbXG4gIHsgaWQ6IFwiZ3JpZFwiLCB0aXRsZTogXCJQYWQgTGF1bmNoZXJcIiwgaWNvbjogR3JpZCwgY29sb3I6IFwidGV4dC1lbWVyYWxkLTQwMFwiLCBkZWZhdWx0V2lkdGg6IDYyMCwgZGVmYXVsdEhlaWdodDogNDgwIH0sXG4gIHsgaWQ6IFwibWl4ZXJcIiwgdGl0bGU6IFwiTWl4ZXIgUmFja1wiLCBpY29uOiBTbGlkZXJzLCBjb2xvcjogXCJ0ZXh0LXNsYXRlLTMwMFwiLCBkZWZhdWx0V2lkdGg6IDU0MCwgZGVmYXVsdEhlaWdodDogNDIwIH0sXG4gIHsgaWQ6IFwiZnhcIiwgdGl0bGU6IFwiRlggQ2hhaW5cIiwgaWNvbjogQWN0aXZpdHksIGNvbG9yOiBcInRleHQtYW1iZXItNDAwXCIsIGRlZmF1bHRXaWR0aDogNDgwLCBkZWZhdWx0SGVpZ2h0OiAzNDAgfSxcbiAgeyBpZDogXCJzZXF1ZW5jZXJcIiwgdGl0bGU6IFwiU3RlcCBTZXF1ZW5jZXJcIiwgaWNvbjogRGlzYywgY29sb3I6IFwidGV4dC1jeWFuLTQwMFwiLCBkZWZhdWx0V2lkdGg6IDYyMCwgZGVmYXVsdEhlaWdodDogNDIwIH0sXG4gIHsgaWQ6IFwiZ3JhbnVsYXJcIiwgdGl0bGU6IFwiR3JhbnVsYXIgU3ludGhcIiwgaWNvbjogU3BhcmtsZXMsIGNvbG9yOiBcInRleHQtdmlvbGV0LTQwMFwiLCBkZWZhdWx0V2lkdGg6IDYwMCwgZGVmYXVsdEhlaWdodDogNDIwIH0sXG4gIHsgaWQ6IFwicGF0Y2hiYXlcIiwgdGl0bGU6IFwiTW9kdWxhciBQYXRjaCBCYXlcIiwgaWNvbjogTmV0d29yaywgY29sb3I6IFwidGV4dC1vcmFuZ2UtNDAwXCIsIGRlZmF1bHRXaWR0aDogNTgwLCBkZWZhdWx0SGVpZ2h0OiAzODAgfSxcbiAgeyBpZDogXCJ4eXBhZFwiLCB0aXRsZTogXCJYL1kgUGFkIENvbnRyb2xsZXJcIiwgaWNvbjogTW92ZSwgY29sb3I6IFwidGV4dC1waW5rLTQwMFwiLCBkZWZhdWx0V2lkdGg6IDQ4MCwgZGVmYXVsdEhlaWdodDogNDgwIH0sXG4gIHsgaWQ6IFwiYWNpZFwiLCB0aXRsZTogXCJBbmFsb2cgMzAzIFN5bnRoXCIsIGljb246IFphcCwgY29sb3I6IFwidGV4dC15ZWxsb3ctNDAwXCIsIGRlZmF1bHRXaWR0aDogNTQwLCBkZWZhdWx0SGVpZ2h0OiAzMjAgfSxcbiAgeyBpZDogXCJzY29wZVwiLCB0aXRsZTogXCJNYXN0ZXIgT3NjaWxsb3Njb3BlXCIsIGljb246IEFjdGl2aXR5LCBjb2xvcjogXCJ0ZXh0LWdyZWVuLTQwMFwiLCBkZWZhdWx0V2lkdGg6IDQ4MCwgZGVmYXVsdEhlaWdodDogMzAwIH0sXG4gIHsgaWQ6IFwiY3JhdGVcIiwgdGl0bGU6IFwiU2FtcGxlIENyYXRlXCIsIGljb246IEZvbGRlciwgY29sb3I6IFwidGV4dC1ibHVlLTQwMFwiLCBkZWZhdWx0V2lkdGg6IDUyMCwgZGVmYXVsdEhlaWdodDogNDAwIH0sXG4gIHsgaWQ6IFwicHJlc2V0LW1hbmFnZXJcIiwgdGl0bGU6IFwiUHJlc2V0IE1hbmFnZXJcIiwgaWNvbjogRm9sZGVyLCBjb2xvcjogXCJ0ZXh0LWFtYmVyLTQwMFwiLCBkZWZhdWx0V2lkdGg6IDUwMCwgZGVmYXVsdEhlaWdodDogNDIwIH0sXG4gIHsgaWQ6IFwiYWlnZW5cIiwgdGl0bGU6IFwiR2VtaW5pIEFJIFByb2R1Y2VyXCIsIGljb246IFNwYXJrbGVzLCBjb2xvcjogXCJ0ZXh0LWZ1Y2hzaWEtNDAwXCIsIGRlZmF1bHRXaWR0aDogNjAwLCBkZWZhdWx0SGVpZ2h0OiA1NjAgfSxcbiAgeyBpZDogXCJtb2JpbGVcIiwgdGl0bGU6IFwiTW9iaWxlIFJlbW90ZVwiLCBpY29uOiBTbWFydHBob25lLCBjb2xvcjogXCJ0ZXh0LXNsYXRlLTQwMFwiLCBkZWZhdWx0V2lkdGg6IDM4MCwgZGVmYXVsdEhlaWdodDogNTQwIH0sXG4gIHsgaWQ6IFwiZHJ1bW1hY2hpbmVcIiwgdGl0bGU6IFwiRHJ1bSBNYWNoaW5lXCIsIGljb246IERpc2MsIGNvbG9yOiBcInRleHQtcmVkLTQwMFwiLCBkZWZhdWx0V2lkdGg6IDYwMCwgZGVmYXVsdEhlaWdodDogNTAwIH0sXG4gIHsgaWQ6IFwibG9vcGVyXCIsIHRpdGxlOiBcIkxpdmUgTG9vcGVyXCIsIGljb246IFJlZnJlc2hDdywgY29sb3I6IFwidGV4dC1pbmRpZ28tNDAwXCIsIGRlZmF1bHRXaWR0aDogNTAwLCBkZWZhdWx0SGVpZ2h0OiA0MDAgfSxcbiAgeyBpZDogXCJzYW1wbGVyXCIsIHRpdGxlOiBcIlBvbHkgU2FtcGxlclwiLCBpY29uOiBNdXNpYywgY29sb3I6IFwidGV4dC10ZWFsLTQwMFwiLCBkZWZhdWx0V2lkdGg6IDU1MCwgZGVmYXVsdEhlaWdodDogNDUwIH0sXG4gIHsgaWQ6IFwidm9pY2V0cmFpbmVyXCIsIHRpdGxlOiBcIlZvaWNlIFRyYWluZXJcIiwgaWNvbjogTWljMiwgY29sb3I6IFwidGV4dC1yb3NlLTQwMFwiLCBkZWZhdWx0V2lkdGg6IDUwMCwgZGVmYXVsdEhlaWdodDogNDAwIH0sXG4gIHsgaWQ6IFwidm9pY2VjaGFuZ2VyXCIsIHRpdGxlOiBcIlZvY2FsIFRyYW5zZm9ybWVyXCIsIGljb246IE1pYzIsIGNvbG9yOiBcInRleHQtcHVycGxlLTQwMFwiLCBkZWZhdWx0V2lkdGg6IDQ1MCwgZGVmYXVsdEhlaWdodDogMzUwIH0sXG4gIHsgaWQ6IFwidHJpbVwiLCB0aXRsZTogXCJBdWRpbyBUcmltXCIsIGljb246IFNjaXNzb3JzLCBjb2xvcjogXCJ0ZXh0LWJsdWUtMzAwXCIsIGRlZmF1bHRXaWR0aDogNjUwLCBkZWZhdWx0SGVpZ2h0OiAzNTAgfSxcbiAgeyBpZDogXCJtYXRyaXhcIiwgdGl0bGU6IFwiUm91dGluZyBNYXRyaXhcIiwgaWNvbjogTGF5b3V0R3JpZCwgY29sb3I6IFwidGV4dC1jeWFuLTMwMFwiLCBkZWZhdWx0V2lkdGg6IDU1MCwgZGVmYXVsdEhlaWdodDogNTAwIH0sXG4gIHsgaWQ6IFwicGFyYW1ldHJpYy1lcVwiLCB0aXRsZTogXCJQYXJhbWV0cmljIEVRXCIsIGljb246IEJhckNoYXJ0LCBjb2xvcjogXCJ0ZXh0LWVtZXJhbGQtMzAwXCIsIGRlZmF1bHRXaWR0aDogNjAwLCBkZWZhdWx0SGVpZ2h0OiA0MDAgfSxcbiAgeyBpZDogXCJ2b2NhbGF1dG90dW5lXCIsIHRpdGxlOiBcIkF1dG9UdW5lIFByb1wiLCBpY29uOiBNdXNpYywgY29sb3I6IFwidGV4dC12aW9sZXQtMzAwXCIsIGRlZmF1bHRXaWR0aDogNTAwLCBkZWZhdWx0SGVpZ2h0OiAzNTAgfSxcbiAgeyBpZDogXCJkanNldG1peFwiLCB0aXRsZTogXCJESiBNaXggU3R1ZGlvXCIsIGljb246IFJhZGlvLCBjb2xvcjogXCJ0ZXh0LWFtYmVyLTMwMFwiLCBkZWZhdWx0V2lkdGg6IDcwMCwgZGVmYXVsdEhlaWdodDogNDUwIH0sXG4gIHsgaWQ6IFwiZ2l0aHViLXB1Ymxpc2hlclwiLCB0aXRsZTogXCJHaXRIdWIgU3luY1wiLCBpY29uOiBHaXRodWIsIGNvbG9yOiBcInRleHQtc2xhdGUtMjAwXCIsIGRlZmF1bHRXaWR0aDogNDAwLCBkZWZhdWx0SGVpZ2h0OiA0NTAgfSxcbiAgeyBpZDogXCJhaWNoYXRcIiwgdGl0bGU6IFwiQUkgUHJvZHVjZXIgQ2hhdFwiLCBpY29uOiBCb3QsIGNvbG9yOiBcInRleHQtY3lhbi0zMDBcIiwgZGVmYXVsdFdpZHRoOiA2MjAsIGRlZmF1bHRIZWlnaHQ6IDU2MCB9LFxuICB7IGlkOiBcInZvaWNlc3R1ZGlvXCIsIHRpdGxlOiBcIlZvaWNlIFN0dWRpb1wiLCBpY29uOiBNaWMsIGNvbG9yOiBcInRleHQtcm9zZS0zMDBcIiwgZGVmYXVsdFdpZHRoOiA2MDAsIGRlZmF1bHRIZWlnaHQ6IDUyMCB9LFxuXTtcblxuY29uc3QgS25vYiA9ICh7IGxhYmVsLCB2YWx1ZSwgY29sb3IgPSBcImN5YW5cIiwgb25DaGFuZ2UgfTogeyBsYWJlbDogc3RyaW5nLCB2YWx1ZTogbnVtYmVyLCBjb2xvcj86IHN0cmluZywgb25DaGFuZ2U/OiAodmFsOiBudW1iZXIpID0+IHZvaWQgfSkgPT4ge1xuICBjb25zdCByb3RhdGlvbiA9ICh2YWx1ZSAvIDEwMCkgKiAyNzAgLSAxMzU7XG4gIGNvbnN0IGNvbG9yczogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHtcbiAgICBjeWFuOiBcImJnLWN5YW4tNDAwXCIsIHZpb2xldDogXCJiZy12aW9sZXQtNDAwXCIsIFxuICAgIGVtZXJhbGQ6IFwiYmctZW1lcmFsZC00MDBcIiwgYW1iZXI6IFwiYmctYW1iZXItNDAwXCIsXG4gICAgeWVsbG93OiBcImJnLXllbGxvdy00MDBcIiwgcmVkOiBcImJnLXJlZC00MDBcIiwgdGVhbDogXCJiZy10ZWFsLTQwMFwiXG4gIH07XG5cbiAgY29uc3QgaGFuZGxlQ2xpY2sgPSAoKSA9PiB7XG4gICAgaWYgKG9uQ2hhbmdlKSB7XG4gICAgICBjb25zdCBuZXh0VmFsID0gKHZhbHVlICsgMTApID4gMTAwID8gMCA6IHZhbHVlICsgMTA7XG4gICAgICBvbkNoYW5nZShuZXh0VmFsKTtcbiAgICB9XG4gIH07XG5cbiAgcmV0dXJuIChcbiAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggZmxleC1jb2wgaXRlbXMtY2VudGVyIGdhcC0xIHNlbGVjdC1ub25lIGN1cnNvci1wb2ludGVyIGdyb3VwXCIgb25DbGljaz17aGFuZGxlQ2xpY2t9IHRpdGxlPVwiQ2xpY2sgdG8gYWRqdXN0IHZhbHVlXCI+XG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cInctMTAgaC0xMCByb3VuZGVkLWZ1bGwgYmctc2xhdGUtODAwIGJvcmRlci1bM3B4XSBib3JkZXItc2xhdGUtOTUwIHNoYWRvdy1baW5zZXRfMF8ycHhfNHB4X3JnYmEoMCwwLDAsMC42KV0gcmVsYXRpdmUgZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgZ3JvdXAtaG92ZXI6Ym9yZGVyLXNsYXRlLTcwMCB0cmFuc2l0aW9uLWNvbG9yc1wiPlxuICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYnNvbHV0ZSBpbnNldC0wIHJvdW5kZWQtZnVsbCB0cmFuc2l0aW9uLXRyYW5zZm9ybSBkdXJhdGlvbi0xMDBcIiBzdHlsZT17eyB0cmFuc2Zvcm06IGByb3RhdGUoJHtyb3RhdGlvbn1kZWcpYCB9fT5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPXtgYWJzb2x1dGUgdG9wLTAuNSBsZWZ0LTEvMiAtdHJhbnNsYXRlLXgtMS8yIHctMSBoLTIuNSByb3VuZGVkLWZ1bGwgJHtjb2xvcnNbY29sb3JdIHx8IGNvbG9ycy5jeWFufSBzaGFkb3ctWzBfMF81cHhfY3VycmVudENvbG9yXWB9IC8+XG4gICAgICAgICA8L2Rpdj5cbiAgICAgIDwvZGl2PlxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGZsZXgtY29sIGl0ZW1zLWNlbnRlclwiPlxuICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LVs5cHhdIGZvbnQtYm9sZCB0cmFja2luZy13aWRlciB0ZXh0LXNsYXRlLTQwMCB1cHBlcmNhc2VcIj57bGFiZWx9PC9zcGFuPlxuICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LVs4cHhdIGZvbnQtbW9ubyB0ZXh0LWN5YW4tNDAwXCI+e3ZhbHVlfSU8L3NwYW4+XG4gICAgICA8L2Rpdj5cbiAgICA8L2Rpdj5cbiAgKVxufVxuXG5jb25zdCBHcmlkTGF1bmNoZXIgPSAoeyBwYWRzLCBjdXJyZW50U3RlcCwgaXNQbGF5aW5nLCBvblRvZ2dsZVBhZCB9OiBhbnkpID0+IChcbiAgPGRpdiBjbGFzc05hbWU9XCJwLTYgaC1mdWxsIGZsZXggZmxleC1jb2wgaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIGJnLXNsYXRlLTkwMC85NSByZWxhdGl2ZSBvdmVyZmxvdy1oaWRkZW5cIj5cbiAgICA8ZGl2IGNsYXNzTmFtZT1cImFic29sdXRlIGluc2V0LTAgb3BhY2l0eS0xMCBiZy1bcmFkaWFsLWdyYWRpZW50KGNpcmNsZV9hdF9jZW50ZXIsX3ZhcigtLXR3LWdyYWRpZW50LXN0b3BzKSldIGZyb20tY3lhbi00MDAgdmlhLXRyYW5zcGFyZW50IHRvLXRyYW5zcGFyZW50IHBvaW50ZXItZXZlbnRzLW5vbmVcIiAvPlxuICAgIDxkaXYgY2xhc3NOYW1lPVwiZ3JpZCBncmlkLWNvbHMtNCBnYXAtNCB3LWZ1bGwgbWF4LXctbWQgYXNwZWN0LXNxdWFyZSByZWxhdGl2ZSB6LTEwXCI+XG4gICAgICB7cGFkcy5tYXAoKHBhZDogUGFkLCBpZHg6IG51bWJlcikgPT4ge1xuICAgICAgICBjb25zdCBpc1RyaWdnZXJlZCA9IGlzUGxheWluZyAmJiBwYWQuaXNQbGF5aW5nICYmIChjdXJyZW50U3RlcCAlIDQgPT09IGlkeCAlIDQpO1xuICAgICAgICBsZXQgYmFzZUNvbG9yID0gXCJlbWVyYWxkXCI7XG4gICAgICAgIGlmIChwYWQuY2F0ZWdvcnkgPT09ICdiYXNzJykgYmFzZUNvbG9yID0gXCJpbmRpZ29cIjtcbiAgICAgICAgaWYgKHBhZC5jYXRlZ29yeSA9PT0gJ3N5bnRoJykgYmFzZUNvbG9yID0gXCJ2aW9sZXRcIjtcbiAgICAgICAgaWYgKHBhZC5jYXRlZ29yeSA9PT0gJ2Z4JykgYmFzZUNvbG9yID0gXCJhbWJlclwiO1xuXG4gICAgICAgIGNvbnN0IGJnQ2xhc3MgPSBwYWQuaXNQbGF5aW5nIFxuICAgICAgICAgID8gYGJnLSR7YmFzZUNvbG9yfS01MDAgYm9yZGVyLSR7YmFzZUNvbG9yfS00MDAgdGV4dC13aGl0ZSBzaGFkb3ctWzBfMF8yMHB4X3JnYmEodmFyKC0tJHtiYXNlQ29sb3J9LXJnYiksMC42KV1gIFxuICAgICAgICAgIDogYGJnLSR7YmFzZUNvbG9yfS01MDAvMTAgYm9yZGVyLSR7YmFzZUNvbG9yfS01MDAvMzAgdGV4dC0ke2Jhc2VDb2xvcn0tNDAwIGhvdmVyOmJnLSR7YmFzZUNvbG9yfS01MDAvMjBgO1xuXG4gICAgICAgIHJldHVybiAoXG4gICAgICAgICAgPGJ1dHRvbiBcbiAgICAgICAgICAgIGtleT17cGFkLmlkfSBvbkNsaWNrPXsoKSA9PiBvblRvZ2dsZVBhZChwYWQuaWQpfVxuICAgICAgICAgICAgY2xhc3NOYW1lPXtgcmVsYXRpdmUgcm91bmRlZC0yeGwgYm9yZGVyLTIgdHJhbnNpdGlvbi1hbGwgZHVyYXRpb24tNzUgZmxleCBmbGV4LWNvbCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgZ2FwLTIgJHtiZ0NsYXNzfSAke2lzVHJpZ2dlcmVkID8gJ2JyaWdodG5lc3MtMTUwIHNjYWxlLTk1JyA6ICdzY2FsZS0xMDAnfWB9XG4gICAgICAgICAgPlxuICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQteHMgZm9udC1ib2xkIGZvbnQtbW9ubyB0cmFja2luZy10aWdodGVyIHRleHQtY2VudGVyIHB4LTEgbGVhZGluZy10aWdodFwiPntwYWQubmFtZX08L3NwYW4+XG4gICAgICAgICAgICAge3BhZC5pc1BsYXlpbmcgJiYgPGRpdiBjbGFzc05hbWU9XCJhYnNvbHV0ZSB0b3AtMiByaWdodC0yIHctMS41IGgtMS41IHJvdW5kZWQtZnVsbCBiZy13aGl0ZSBhbmltYXRlLXB1bHNlXCIgLz59XG4gICAgICAgICAgPC9idXR0b24+XG4gICAgICAgIClcbiAgICAgIH0pfVxuICAgIDwvZGl2PlxuICA8L2Rpdj5cbik7XG5cbmNvbnN0IE1peGVyUmFjayA9ICh7IHBhZHMsIG1hc3RlclZvbHVtZSwgb25VcGRhdGVWb2x1bWUsIG9uVXBkYXRlUGFuLCBvblRvZ2dsZU11dGUsIG9uVG9nZ2xlU29sbywgb25VcGRhdGVNYXN0ZXJWb2x1bWUgfTogYW55KSA9PiAoXG4gIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBoLWZ1bGwgYmctc2xhdGUtOTAwIHAtNCBnYXAtMiBvdmVyZmxvdy14LWF1dG8gbm8tc2Nyb2xsYmFyIGl0ZW1zLXN0YXJ0XCI+XG4gICAge3BhZHMuc2xpY2UoMCwgOCkubWFwKChwYWQ6IFBhZCkgPT4gKFxuICAgICAgIDxkaXYga2V5PXtwYWQuaWR9IGNsYXNzTmFtZT1cInctWzcycHhdIGZsZXgtc2hyaW5rLTAgYmctc2xhdGUtOTUwLzgwIHJvdW5kZWQteGwgYm9yZGVyIGJvcmRlci1zbGF0ZS04MDAgZmxleCBmbGV4LWNvbCBpdGVtcy1jZW50ZXIgcHktNCBnYXAtNCBzaGFkb3cteGxcIj5cbiAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LVsxMHB4XSBmb250LWJvbGQgdGV4dC1zbGF0ZS00MDAgdGV4dC1jZW50ZXIgdXBwZXJjYXNlIGgtOCBweC0xIG92ZXJmbG93LWhpZGRlbiBsZWFkaW5nLXRpZ2h0IGZsZXggaXRlbXMtY2VudGVyXCI+e3BhZC5uYW1lfTwvc3Bhbj5cbiAgICAgICAgICA8S25vYiBsYWJlbD1cIlBBTlwiIHZhbHVlPXsocGFkLnBhbiArIDEpICogNTB9IGNvbG9yPXtwYWQuY2F0ZWdvcnkgPT09ICdkcnVtcycgPyAnZW1lcmFsZCcgOiBwYWQuY2F0ZWdvcnkgPT09ICdiYXNzJyA/ICdpbmRpZ28nIDogJ3Zpb2xldCd9IC8+XG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4LTEgdy1mdWxsIGgtNDAgZmxleCBqdXN0aWZ5LWNlbnRlciByZWxhdGl2ZSBweS00IGdyb3VwXCI+XG4gICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYnNvbHV0ZSB0b3AtNCBib3R0b20tNCB3LTEuNSBiZy1zbGF0ZS05MDAgcm91bmRlZC1mdWxsIHNoYWRvdy1pbm5lciBib3JkZXIgYm9yZGVyLXNsYXRlLTgwMFwiIC8+XG4gICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJyYW5nZVwiIG1pbj17MH0gbWF4PXsxfSBzdGVwPXswLjAxfSB2YWx1ZT17cGFkLnZvbHVtZX0gb25DaGFuZ2U9e2UgPT4gb25VcGRhdGVWb2x1bWUocGFkLmlkLCBOdW1iZXIoZS50YXJnZXQudmFsdWUpKX1cbiAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cImFic29sdXRlIHRvcC0xLzIgbGVmdC0xLzIgLXRyYW5zbGF0ZS14LTEvMiAtdHJhbnNsYXRlLXktMS8yIHctMzIgaC02IG9wYWNpdHktMCBjdXJzb3ItcG9pbnRlciB6LTIwXCIgc3R5bGU9e3sgdHJhbnNmb3JtOiAncm90YXRlKC05MGRlZyknIH19IC8+XG4gICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYnNvbHV0ZSB3LTcgaC0xMCBiZy1zbGF0ZS03MDAgYm9yZGVyLTIgYm9yZGVyLXNsYXRlLTYwMCByb3VuZGVkIHNoYWRvdy1sZyBwb2ludGVyLWV2ZW50cy1ub25lIHRyYW5zaXRpb24tYWxsIGR1cmF0aW9uLTIwMCBncm91cC1ob3Zlcjpib3JkZXItc2xhdGUtNDAwIGdyb3VwLWhvdmVyOnNjYWxlLTEwNSBncm91cC1ob3ZlcjpzaGFkb3ctWzBfMF8xMnB4X3JnYmEoMjU1LDI1NSwyNTUsMC4yKV0gZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXJcIiBzdHlsZT17eyBib3R0b206IGBjYWxjKCR7cGFkLnZvbHVtZSAqIDEwMH0lIC0gMjBweClgIH19PlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwidy00IGgtMSByb3VuZGVkLWZ1bGwgYmctc2xhdGUtNDAwIHRyYW5zaXRpb24tY29sb3JzIGdyb3VwLWhvdmVyOmJnLXdoaXRlXCIgLz5cbiAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggZ2FwLTEgdy1mdWxsIHB4LTIgbXQtYXV0b1wiPlxuICAgICAgICAgICAgIDxidXR0b24gb25DbGljaz17KCkgPT4gb25Ub2dnbGVNdXRlKHBhZC5pZCl9IGNsYXNzTmFtZT17YGZsZXgtMSB0ZXh0LVs5cHhdIGZvbnQtYmxhY2sgcHktMSByb3VuZGVkIHRyYW5zaXRpb24tY29sb3JzICR7cGFkLm11dGVkID8gJ2JnLXJlZC01MDAgdGV4dC13aGl0ZSBzaGFkb3ctWzBfMF84cHhfI2VmNDQ0NF0nIDogJ2JnLXNsYXRlLTgwMCB0ZXh0LXNsYXRlLTUwMCBob3ZlcjpiZy1zbGF0ZS03MDAnfWB9Pk08L2J1dHRvbj5cbiAgICAgICAgICAgICA8YnV0dG9uIG9uQ2xpY2s9eygpID0+IG9uVG9nZ2xlU29sbyhwYWQuaWQpfSBjbGFzc05hbWU9e2BmbGV4LTEgdGV4dC1bOXB4XSBmb250LWJsYWNrIHB5LTEgcm91bmRlZCB0cmFuc2l0aW9uLWNvbG9ycyAke3BhZC5zb2xvZWQgPyAnYmcteWVsbG93LTQwMCB0ZXh0LXNsYXRlLTkwMCBzaGFkb3ctWzBfMF84cHhfI2ZhY2MxNV0nIDogJ2JnLXNsYXRlLTgwMCB0ZXh0LXNsYXRlLTUwMCBob3ZlcjpiZy1zbGF0ZS03MDAnfWB9PlM8L2J1dHRvbj5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICA8L2Rpdj5cbiAgICApKX1cbiAgICA8ZGl2IGNsYXNzTmFtZT1cInctcHggYmctc2xhdGUtODAwIG14LTIgc2VsZi1zdHJldGNoXCIgLz5cbiAgICA8ZGl2IGNsYXNzTmFtZT1cInctMjQgZmxleC1zaHJpbmstMCBiZy1zbGF0ZS05NTAgcm91bmRlZC14bCBib3JkZXIgYm9yZGVyLWN5YW4tOTAwIGZsZXggZmxleC1jb2wgaXRlbXMtY2VudGVyIHB5LTQgZ2FwLTQgc2hhZG93LVswXzBfMjBweF9yZ2JhKDgsMTQ1LDE3OCwwLjE1KV0gcmVsYXRpdmUgb3ZlcmZsb3ctaGlkZGVuXCI+XG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJzb2x1dGUgaW5zZXQtMCBiZy1ncmFkaWVudC10by10IGZyb20tY3lhbi05MDAvMjAgdG8tdHJhbnNwYXJlbnQgcG9pbnRlci1ldmVudHMtbm9uZVwiIC8+XG4gICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtWzExcHhdIGZvbnQtYmxhY2sgdGV4dC1jeWFuLTQwMCB0cmFja2luZy13aWRlc3QgcmVsYXRpdmUgei0xMFwiPk1BU1RFUjwvc3Bhbj5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJoLTEwXCI+PC9kaXY+IFxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXgtMSB3LWZ1bGwgaC00MCBmbGV4IGp1c3RpZnktY2VudGVyIHJlbGF0aXZlIHB5LTQgei0xMCBncm91cFwiPlxuICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJzb2x1dGUgdG9wLTQgYm90dG9tLTQgdy0yIGJnLXNsYXRlLTkwMCByb3VuZGVkLWZ1bGwgc2hhZG93LWlubmVyIGJvcmRlciBib3JkZXItc2xhdGUtODAwXCIgLz5cbiAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cInJhbmdlXCIgbWluPXswfSBtYXg9ezF9IHN0ZXA9ezAuMDF9IHZhbHVlPXttYXN0ZXJWb2x1bWV9IG9uQ2hhbmdlPXtlID0+IG9uVXBkYXRlTWFzdGVyVm9sdW1lKE51bWJlcihlLnRhcmdldC52YWx1ZSkpfVxuICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwiYWJzb2x1dGUgdG9wLTEvMiBsZWZ0LTEvMiAtdHJhbnNsYXRlLXgtMS8yIC10cmFuc2xhdGUteS0xLzIgdy0zMiBoLTggb3BhY2l0eS0wIGN1cnNvci1wb2ludGVyIHotMjBcIiBzdHlsZT17eyB0cmFuc2Zvcm06ICdyb3RhdGUoLTkwZGVnKScgfX0gLz5cbiAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImFic29sdXRlIHctOSBoLTEyIGJnLWN5YW4tOTUwIGJvcmRlci0yIGJvcmRlci1jeWFuLTUwMCByb3VuZGVkIHNoYWRvdy1bMF8wXzE1cHhfcmdiYSgzNCwyMTEsMjM4LDAuNSldIHBvaW50ZXItZXZlbnRzLW5vbmUgdHJhbnNpdGlvbi1hbGwgZHVyYXRpb24tMjAwIGdyb3VwLWhvdmVyOmJvcmRlci1jeWFuLTMwMCBncm91cC1ob3ZlcjpzY2FsZS0xMDUgZ3JvdXAtaG92ZXI6c2hhZG93LVswXzBfMjBweF9yZ2JhKDM0LDIxMSwyMzgsMC44KV0gZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXJcIiBzdHlsZT17eyBib3R0b206IGBjYWxjKCR7bWFzdGVyVm9sdW1lICogMTAwfSUgLSAyNHB4KWAgfX0+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ3LTUgaC0xIHJvdW5kZWQtZnVsbCBiZy1jeWFuLTMwMCBzaGFkb3ctWzBfMF81cHhfIzIyZDNlZV0gdHJhbnNpdGlvbi1jb2xvcnMgZ3JvdXAtaG92ZXI6Ymctd2hpdGVcIiAvPlxuICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICA8L2Rpdj5cbiAgICA8L2Rpdj5cbiAgPC9kaXY+XG4pO1xuXG5jb25zdCBEcnVtTWFjaGluZSA9ICgpID0+IHtcbiAgY29uc3QgW2dyaWQsIHNldEdyaWRdID0gdXNlU3RhdGUoQXJyYXkoNCkuZmlsbChudWxsKS5tYXAoKCkgPT4gQXJyYXkoMTYpLmZpbGwoZmFsc2UpKSk7XG4gIGNvbnN0IGluc3RydW1lbnRzID0gWydLSUNLJywgJ1NOQVJFJywgJ0NMQVAnLCAnSElIQVQnXTtcbiAgY29uc3QgY29sb3JzID0gWydiZy1yZWQtNTAwJywgJ2JnLWVtZXJhbGQtNTAwJywgJ2JnLWFtYmVyLTUwMCcsICdiZy1jeWFuLTUwMCddO1xuXG4gIGNvbnN0IHRvZ2dsZVN0ZXAgPSAodHJhY2tJZHg6IG51bWJlciwgc3RlcElkeDogbnVtYmVyKSA9PiB7XG4gICAgY29uc3QgbmV3R3JpZCA9IFsuLi5ncmlkXTtcbiAgICBuZXdHcmlkW3RyYWNrSWR4XVtzdGVwSWR4XSA9ICFuZXdHcmlkW3RyYWNrSWR4XVtzdGVwSWR4XTtcbiAgICBzZXRHcmlkKG5ld0dyaWQpO1xuICB9O1xuXG4gIHJldHVybiAoXG4gICAgPGRpdiBjbGFzc05hbWU9XCJoLWZ1bGwgYmctc2xhdGUtOTAwIHAtNiBmbGV4IGZsZXgtY29sIGdhcC00IGZvbnQtbW9ubyBvdmVyZmxvdy15LWF1dG9cIj5cbiAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXgganVzdGlmeS1iZXR3ZWVuIGl0ZW1zLWNlbnRlciBiZy1zbGF0ZS05NTAgcC0zIHJvdW5kZWQtbGcgYm9yZGVyLTIgYm9yZGVyLXNsYXRlLTgwMCBzaGFkb3ctbWQgbWItMlwiPlxuICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwiZm9udC1ibGFjayB0cmFja2luZy13aWRlc3QgdGV4dC1yZWQtNDAwIHRleHQteGwgaXRhbGljIGZsZXggaXRlbXMtY2VudGVyIGdhcC0yXCI+XG4gICAgICAgICAgIDxEaXNjIHNpemU9ezIwfSBjbGFzc05hbWU9XCJhbmltYXRlLXNwaW5cIiAvPiBUUi04MDhcbiAgICAgICAgIDwvc3Bhbj5cbiAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInB4LTIgcHktMSBiZy1yZWQtOTUwIHRleHQtcmVkLTUwMCB0ZXh0LVsxMHB4XSByb3VuZGVkIGJvcmRlciBib3JkZXItcmVkLTkwMFwiPlBBVFRFUk4gQTwvc3Bhbj5cbiAgICAgICA8L2Rpdj5cbiAgICAgICBcbiAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggZmxleC1jb2wgZ2FwLTMgZmxleC0xIGJnLXNsYXRlLTk1MCBwLTQgcm91bmRlZC14bCBib3JkZXIgYm9yZGVyLXNsYXRlLTgwMFwiPlxuICAgICAgICAge2luc3RydW1lbnRzLm1hcCgodHJhY2ssIGkpID0+IChcbiAgICAgICAgICAgPGRpdiBrZXk9e3RyYWNrfSBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtNFwiPlxuICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwidy0xNiBmbGV4LXNocmluay0wIHRleHQtcmlnaHRcIj5cbiAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LVsxMHB4XSB0ZXh0LXNsYXRlLTMwMCBmb250LWJvbGRcIj57dHJhY2t9PC9zcGFuPlxuICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleC0xIGdyaWQgZ3JpZC1jb2xzLTE2IGdhcC0xXCI+XG4gICAgICAgICAgICAgICAge2dyaWRbaV0ubWFwKChpc0FjdGl2ZSwgaikgPT4gKFxuICAgICAgICAgICAgICAgICAgIDxidXR0b24gXG4gICAgICAgICAgICAgICAgICAgICBrZXk9e2p9IFxuICAgICAgICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4gdG9nZ2xlU3RlcChpLCBqKX1cbiAgICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT17YGgtMTAgcm91bmRlZC1zbSB0cmFuc2l0aW9uLWFsbCBib3JkZXIgJHtcbiAgICAgICAgICAgICAgICAgICAgICAgaXNBY3RpdmUgXG4gICAgICAgICAgICAgICAgICAgICAgICAgPyBgJHtjb2xvcnNbaV19IGJvcmRlci13aGl0ZS8yMCBzaGFkb3ctWzBfMF8xMHB4X2N1cnJlbnRDb2xvcl1gIFxuICAgICAgICAgICAgICAgICAgICAgICAgIDogJ2JnLXNsYXRlLTgwMCBib3JkZXItc2xhdGUtNzAwIGhvdmVyOmJnLXNsYXRlLTcwMCdcbiAgICAgICAgICAgICAgICAgICAgIH0gJHtqICUgNCA9PT0gMCAmJiAhaXNBY3RpdmUgPyAnb3BhY2l0eS0xMDAgYmctc2xhdGUtNzUwJyA6ICdvcGFjaXR5LTgwJ31gfSBcbiAgICAgICAgICAgICAgICAgICAvPlxuICAgICAgICAgICAgICAgICkpfVxuICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICkpfVxuICAgICAgIDwvZGl2PlxuICAgIDwvZGl2PlxuICApO1xufTtcblxuY29uc3QgRlhDaGFpbiA9ICgpID0+IHtcbiAgcmV0dXJuIChcbiAgICA8ZGl2IGNsYXNzTmFtZT1cImgtZnVsbCBiZy1zbGF0ZS05MDAgcC02IGZsZXggZ2FwLTQgZm9udC1tb25vIG92ZXJmbG93LXgtYXV0byBuby1zY3JvbGxiYXIgaXRlbXMtY2VudGVyXCI+XG4gICAgICAgey8qIFJldmVyYiBSYWNrICovfVxuICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibWluLXctWzE4MHB4XSBoLWZ1bGwgYmctc2xhdGUtOTUwIGJvcmRlciBib3JkZXItYW1iZXItOTAwLzUwIHJvdW5kZWQteGwgcC00IGZsZXggZmxleC1jb2wgaXRlbXMtY2VudGVyIGdhcC02IHNoYWRvdy1bMF8wXzE1cHhfcmdiYSgyMTcsMTE5LDYsMC4xKV1cIj5cbiAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtYW1iZXItNTAwIGZvbnQtYm9sZCB0cmFja2luZy13aWRlc3QgdGV4dC14cyBib3JkZXItYiBib3JkZXItYW1iZXItOTAwLzUwIHBiLTIgdy1mdWxsIHRleHQtY2VudGVyXCI+R0hPU1QgUkVWRVJCPC9zcGFuPlxuICAgICAgICAgPEtub2IgbGFiZWw9XCJERUNBWVwiIHZhbHVlPXs3NX0gY29sb3I9XCJhbWJlclwiIC8+XG4gICAgICAgICA8S25vYiBsYWJlbD1cIlNJWkVcIiB2YWx1ZT17NjB9IGNvbG9yPVwiYW1iZXJcIiAvPlxuICAgICAgICAgPEtub2IgbGFiZWw9XCJNSVhcIiB2YWx1ZT17NDB9IGNvbG9yPVwiYW1iZXJcIiAvPlxuICAgICAgIDwvZGl2PlxuXG4gICAgICAgey8qIERlbGF5IFJhY2sgKi99XG4gICAgICAgPGRpdiBjbGFzc05hbWU9XCJtaW4tdy1bMTgwcHhdIGgtZnVsbCBiZy1zbGF0ZS05NTAgYm9yZGVyIGJvcmRlci1jeWFuLTkwMC81MCByb3VuZGVkLXhsIHAtNCBmbGV4IGZsZXgtY29sIGl0ZW1zLWNlbnRlciBnYXAtNiBzaGFkb3ctWzBfMF8xNXB4X3JnYmEoMzQsMjExLDIzOCwwLjEpXVwiPlxuICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1jeWFuLTUwMCBmb250LWJvbGQgdHJhY2tpbmctd2lkZXN0IHRleHQteHMgYm9yZGVyLWIgYm9yZGVyLWN5YW4tOTAwLzUwIHBiLTIgdy1mdWxsIHRleHQtY2VudGVyXCI+RUNITyBERUxBWTwvc3Bhbj5cbiAgICAgICAgIDxLbm9iIGxhYmVsPVwiVElNRVwiIHZhbHVlPXszMH0gY29sb3I9XCJjeWFuXCIgLz5cbiAgICAgICAgIDxLbm9iIGxhYmVsPVwiRkVFREJBQ0tcIiB2YWx1ZT17NjV9IGNvbG9yPVwiY3lhblwiIC8+XG4gICAgICAgICA8S25vYiBsYWJlbD1cIk1JWFwiIHZhbHVlPXs1MH0gY29sb3I9XCJjeWFuXCIgLz5cbiAgICAgICA8L2Rpdj5cblxuICAgICAgIHsvKiBTYXR1cmF0aW9uIFJhY2sgKi99XG4gICAgICAgPGRpdiBjbGFzc05hbWU9XCJtaW4tdy1bMTgwcHhdIGgtZnVsbCBiZy1zbGF0ZS05NTAgYm9yZGVyIGJvcmRlci1yZWQtOTAwLzUwIHJvdW5kZWQteGwgcC00IGZsZXggZmxleC1jb2wgaXRlbXMtY2VudGVyIGdhcC02IHNoYWRvdy1bMF8wXzE1cHhfcmdiYSgyMzksNjgsNjgsMC4xKV1cIj5cbiAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtcmVkLTUwMCBmb250LWJvbGQgdHJhY2tpbmctd2lkZXN0IHRleHQteHMgYm9yZGVyLWIgYm9yZGVyLXJlZC05MDAvNTAgcGItMiB3LWZ1bGwgdGV4dC1jZW50ZXJcIj5TQVRVUkFUT1I8L3NwYW4+XG4gICAgICAgICA8S25vYiBsYWJlbD1cIkRSSVZFXCIgdmFsdWU9ezg1fSBjb2xvcj1cInJlZFwiIC8+XG4gICAgICAgICA8S25vYiBsYWJlbD1cIkNPTE9SXCIgdmFsdWU9ezQ1fSBjb2xvcj1cInJlZFwiIC8+XG4gICAgICAgICA8S25vYiBsYWJlbD1cIk1JWFwiIHZhbHVlPXsxMDB9IGNvbG9yPVwicmVkXCIgLz5cbiAgICAgICA8L2Rpdj5cbiAgICA8L2Rpdj5cbiAgKTtcbn07XG5cbmNvbnN0IE1hc3Rlck9zY2lsbG9zY29wZSA9ICgpID0+IHtcbiAgY29uc3QgY2FudmFzUmVmID0gdXNlUmVmPEhUTUxDYW52YXNFbGVtZW50PihudWxsKTtcbiAgY29uc3QgW3ZpZXdNb2RlLCBzZXRWaWV3TW9kZV0gPSB1c2VTdGF0ZTwnYm90aCcgfCAnZmZ0JyB8ICdvc2NpbGxvc2NvcGUnPignYm90aCcpO1xuXG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgY29uc3QgY2FudmFzID0gY2FudmFzUmVmLmN1cnJlbnQ7XG4gICAgaWYoIWNhbnZhcykgcmV0dXJuO1xuICAgIGNvbnN0IGN0eCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuICAgIGlmKCFjdHgpIHJldHVybjtcbiAgICBsZXQgYW5pbWF0aW9uSWQ6IG51bWJlcjtcblxuICAgIGNvbnN0IHRpbWVCdWZmZXIgPSBuZXcgVWludDhBcnJheSgxMjgpO1xuICAgIGNvbnN0IGZyZXFCdWZmZXIgPSBuZXcgVWludDhBcnJheSg2NCk7XG5cbiAgICBjb25zdCBkcmF3ID0gKCkgPT4ge1xuICAgICAgYXVkaW9FbmdpbmUuZ2V0Qnl0ZVRpbWVEb21haW5EYXRhKHRpbWVCdWZmZXIpO1xuICAgICAgYXVkaW9FbmdpbmUuZ2V0Qnl0ZUZyZXF1ZW5jeURhdGEoZnJlcUJ1ZmZlcik7XG5cbiAgICAgIGN0eC5maWxsU3R5bGUgPSAncmdiYSgyLCA2LCAyMywgMC40KSc7IFxuICAgICAgY3R4LmZpbGxSZWN0KDAsIDAsIGNhbnZhcy53aWR0aCwgY2FudmFzLmhlaWdodCk7XG5cbiAgICAgIGNvbnN0IHdpZHRoID0gY2FudmFzLndpZHRoO1xuICAgICAgY29uc3QgaGVpZ2h0ID0gY2FudmFzLmhlaWdodDtcblxuICAgICAgLy8gRHJhdyBGRlQgRnJlcXVlbmN5IFNwZWN0cnVtIEFuYWx5emVyXG4gICAgICBpZiAodmlld01vZGUgPT09ICdib3RoJyB8fCB2aWV3TW9kZSA9PT0gJ2ZmdCcpIHtcbiAgICAgICAgY29uc3QgYmFyV2lkdGggPSB3aWR0aCAvIGZyZXFCdWZmZXIubGVuZ3RoO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGZyZXFCdWZmZXIubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICBjb25zdCB2YWwgPSBmcmVxQnVmZmVyW2ldIC8gMjU1O1xuICAgICAgICAgIGNvbnN0IGJhckhlaWdodCA9IHZhbCAqICh2aWV3TW9kZSA9PT0gJ2JvdGgnID8gaGVpZ2h0IC8gMiAtIDEwIDogaGVpZ2h0IC0gMjApO1xuICAgICAgICAgIFxuICAgICAgICAgIGNvbnN0IGdyYWRpZW50ID0gY3R4LmNyZWF0ZUxpbmVhckdyYWRpZW50KDAsIGhlaWdodCwgMCwgMCk7XG4gICAgICAgICAgZ3JhZGllbnQuYWRkQ29sb3JTdG9wKDAsICcjMDU5NjY5Jyk7XG4gICAgICAgICAgZ3JhZGllbnQuYWRkQ29sb3JTdG9wKDAuNywgJyMzNGQzOTknKTtcbiAgICAgICAgICBncmFkaWVudC5hZGRDb2xvclN0b3AoMSwgJyNhNzhiZmEnKTtcblxuICAgICAgICAgIGN0eC5maWxsU3R5bGUgPSBncmFkaWVudDtcbiAgICAgICAgICBjdHguc2hhZG93Qmx1ciA9IDg7XG4gICAgICAgICAgY3R4LnNoYWRvd0NvbG9yID0gJyMzNGQzOTknO1xuICAgICAgICAgIGN0eC5maWxsUmVjdChpICogYmFyV2lkdGggKyAxLCBoZWlnaHQgLSAodmlld01vZGUgPT09ICdib3RoJyA/IGhlaWdodCAvIDIgOiAwKSAtIGJhckhlaWdodCwgYmFyV2lkdGggLSAyLCBiYXJIZWlnaHQpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIERyYXcgT3NjaWxsb3Njb3BlIFdhdmVmb3JtXG4gICAgICBpZiAodmlld01vZGUgPT09ICdib3RoJyB8fCB2aWV3TW9kZSA9PT0gJ29zY2lsbG9zY29wZScpIHtcbiAgICAgICAgY29uc3Qgc3RhcnRZID0gdmlld01vZGUgPT09ICdib3RoJyA/IGhlaWdodCAqIDAuNzUgOiBoZWlnaHQgLyAyO1xuICAgICAgICBjdHguYmVnaW5QYXRoKCk7XG4gICAgICAgIGN0eC5zdHJva2VTdHlsZSA9ICcjMjJkM2VlJztcbiAgICAgICAgY3R4LmxpbmVXaWR0aCA9IDI7XG4gICAgICAgIGN0eC5zaGFkb3dCbHVyID0gMTI7XG4gICAgICAgIGN0eC5zaGFkb3dDb2xvciA9ICcjMjJkM2VlJztcblxuICAgICAgICBjb25zdCBzbGljZVdpZHRoID0gd2lkdGggLyB0aW1lQnVmZmVyLmxlbmd0aDtcbiAgICAgICAgbGV0IHggPSAwO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRpbWVCdWZmZXIubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICBjb25zdCB2ID0gdGltZUJ1ZmZlcltpXSAvIDEyOC4wO1xuICAgICAgICAgIGNvbnN0IHkgPSBzdGFydFkgKyAodiAtIDEpICogKGhlaWdodCAvIDMpO1xuICAgICAgICAgIGlmIChpID09PSAwKSBjdHgubW92ZVRvKHgsIHkpO1xuICAgICAgICAgIGVsc2UgY3R4LmxpbmVUbyh4LCB5KTtcbiAgICAgICAgICB4ICs9IHNsaWNlV2lkdGg7XG4gICAgICAgIH1cbiAgICAgICAgY3R4LnN0cm9rZSgpO1xuICAgICAgfVxuXG4gICAgICBhbmltYXRpb25JZCA9IHJlcXVlc3RBbmltYXRpb25GcmFtZShkcmF3KTtcbiAgICB9O1xuICAgIGRyYXcoKTtcbiAgICByZXR1cm4gKCkgPT4gY2FuY2VsQW5pbWF0aW9uRnJhbWUoYW5pbWF0aW9uSWQpO1xuICB9LCBbdmlld01vZGVdKTtcblxuICByZXR1cm4gKFxuICAgIDxkaXYgY2xhc3NOYW1lPVwidy1mdWxsIGgtZnVsbCBiZy1zbGF0ZS05NTAgcC02IGZsZXggZmxleC1jb2wgZ2FwLTQgZm9udC1tb25vIHRleHQteHNcIj5cbiAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBqdXN0aWZ5LWJldHdlZW4gaXRlbXMtY2VudGVyIHRleHQtZW1lcmFsZC00MDAgYm9yZGVyLWIgYm9yZGVyLWVtZXJhbGQtOTAwLzUwIHBiLTJcIj5cbiAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cImZvbnQtYm9sZCBmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMlwiPlxuICAgICAgICAgICA8QWN0aXZpdHkgc2l6ZT17MTZ9IC8+IE1BU1RFUiBTUEVDVFJVTSBBTkFMWVpFUiAmIE9TQ0lMTE9TQ09QRSAoRkZUKVxuICAgICAgICAgPC9zcGFuPlxuICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMlwiPlxuICAgICAgICAgICB7Wydib3RoJywgJ2ZmdCcsICdvc2NpbGxvc2NvcGUnXS5tYXAoKG0pID0+IChcbiAgICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgICBrZXk9e219XG4gICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBzZXRWaWV3TW9kZShtIGFzIGFueSl9XG4gICAgICAgICAgICAgICBjbGFzc05hbWU9e2BweC0yLjUgcHktMSByb3VuZGVkIHRleHQtWzEwcHhdIGZvbnQtYm9sZCB1cHBlcmNhc2UgdHJhbnNpdGlvbi1hbGwgJHtcbiAgICAgICAgICAgICAgICAgdmlld01vZGUgPT09IG0gXG4gICAgICAgICAgICAgICAgICAgPyAnYmctZW1lcmFsZC02MDAgdGV4dC13aGl0ZSBzaGFkb3ctWzBfMF8xMHB4XyMwNTk2NjldJyBcbiAgICAgICAgICAgICAgICAgICA6ICdiZy1zbGF0ZS05MDAgdGV4dC1zbGF0ZS00MDAgaG92ZXI6Ymctc2xhdGUtODAwJ1xuICAgICAgICAgICAgICAgfWB9XG4gICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAge219XG4gICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICkpfVxuICAgICAgICAgPC9kaXY+XG4gICAgICA8L2Rpdj5cbiAgICAgIDxjYW52YXMgcmVmPXtjYW52YXNSZWZ9IHdpZHRoPXs4MDB9IGhlaWdodD17NDAwfSBjbGFzc05hbWU9XCJ3LWZ1bGwgZmxleC0xIHJvdW5kZWQteGwgYm9yZGVyIGJvcmRlci1zbGF0ZS04MDAgYmctWyMwMjA2MTddIHNoYWRvdy1pbm5lclwiIC8+XG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXgganVzdGlmeS1iZXR3ZWVuIHRleHQtWzlweF0gdGV4dC1zbGF0ZS01MDAgZm9udC1ib2xkIHB4LTFcIj5cbiAgICAgICAgPHNwYW4+NjBIeiAoU1VCKTwvc3Bhbj5cbiAgICAgICAgPHNwYW4+MjUwSHogKEJBU1MpPC9zcGFuPlxuICAgICAgICA8c3Bhbj4xa0h6IChNSUQpPC9zcGFuPlxuICAgICAgICA8c3Bhbj40a0h6IChQUkVTRU5DRSk8L3NwYW4+XG4gICAgICAgIDxzcGFuPjE2a0h6IChBSVIpPC9zcGFuPlxuICAgICAgPC9kaXY+XG4gICAgPC9kaXY+XG4gICk7XG59O1xuXG5jb25zdCBHcmFudWxhclN5bnRoID0gKCkgPT4gKFxuICA8ZGl2IGNsYXNzTmFtZT1cInAtNSBiZy1zbGF0ZS05MDAgaC1mdWxsIGZsZXggZmxleC1jb2wgZ2FwLTUgdGV4dC1zbGF0ZS0yMDAgZm9udC1tb25vIHRleHQteHNcIj5cbiAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGp1c3RpZnktYmV0d2VlbiBpdGVtcy1jZW50ZXIgYmctc2xhdGUtOTUwIHAtMyByb3VuZGVkLWxnIGJvcmRlciBib3JkZXItc2xhdGUtODAwIHNoYWRvdy1tZFwiPlxuICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cImZvbnQtYm9sZCB0cmFja2luZy13aWRlc3QgdGV4dC12aW9sZXQtMzAwXCI+R1JBSU5fRU5HSU5FIFYyPC9zcGFuPlxuICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInB4LTIgcHktMC41IGJnLXZpb2xldC01MDAvMjAgdGV4dC12aW9sZXQtNDAwIHJvdW5kZWQtc21cIj5BQ1RJVkUgRU5HSU5FPC9zcGFuPlxuICAgICA8L2Rpdj5cbiAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4LTEgcmVsYXRpdmUgYmctc2xhdGUtOTUwIHJvdW5kZWQtbGcgYm9yZGVyIGJvcmRlci1zbGF0ZS04MDAgb3ZlcmZsb3ctaGlkZGVuIGdyb3VwIHNoYWRvdy1pbm5lclwiPlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImFic29sdXRlIGluc2V0LTAgb3BhY2l0eS00MCBiZy1bcmVwZWF0aW5nLWxpbmVhci1ncmFkaWVudCg5MGRlZyx0cmFuc3BhcmVudCx0cmFuc3BhcmVudF8ycHgsIzRjMWQ5NV8ycHgsIzRjMWQ5NV80cHgpXVwiIC8+XG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJzb2x1dGUgaW5zZXQtMCBiZy1ncmFkaWVudC10by1iIGZyb20tdHJhbnNwYXJlbnQgdmlhLXZpb2xldC05MDAvMjAgdG8tdHJhbnNwYXJlbnRcIiAvPlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImFic29sdXRlIHRvcC0wIGJvdHRvbS0wIHctMzIgYmctdmlvbGV0LTUwMC8zMCBib3JkZXIteC0yIGJvcmRlci12aW9sZXQtNDAwIGN1cnNvci1ldy1yZXNpemUgbGVmdC0xLzMgc2hhZG93LVswXzBfMjBweF9yZ2JhKDEzOSw5MiwyNDYsMC42KV0gZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgYmFja2Ryb3AtYmx1ci1bMXB4XVwiPlxuICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImgtOCB3LTEgYmctdmlvbGV0LTMwMCByb3VuZGVkLWZ1bGwgb3BhY2l0eS01MFwiIC8+XG4gICAgICAgIDwvZGl2PlxuICAgICA8L2Rpdj5cbiAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGp1c3RpZnktYmV0d2VlbiBnYXAtMiBwLTQgYmctc2xhdGUtOTUwIHJvdW5kZWQtbGcgYm9yZGVyIGJvcmRlci1zbGF0ZS04MDBcIj5cbiAgICAgICA8S25vYiBsYWJlbD1cIlBPU0lUSU9OXCIgdmFsdWU9ezMzfSBjb2xvcj1cInZpb2xldFwiIC8+XG4gICAgICAgPEtub2IgbGFiZWw9XCJTSVpFXCIgdmFsdWU9ezQ1fSBjb2xvcj1cInZpb2xldFwiIC8+XG4gICAgICAgPEtub2IgbGFiZWw9XCJERU5TSVRZXCIgdmFsdWU9ezgwfSBjb2xvcj1cInZpb2xldFwiIC8+XG4gICAgICAgPEtub2IgbGFiZWw9XCJQSVRDSFwiIHZhbHVlPXs1MH0gY29sb3I9XCJ2aW9sZXRcIiAvPlxuICAgICAgIDxLbm9iIGxhYmVsPVwiU1BSRUFEXCIgdmFsdWU9ezIwfSBjb2xvcj1cInZpb2xldFwiIC8+XG4gICAgIDwvZGl2PlxuICA8L2Rpdj5cbik7XG5cbmNvbnN0IEFjaWRCb3hTeW50aCA9ICgpID0+IChcbiAgPGRpdiBjbGFzc05hbWU9XCJwLTYgYmctc2xhdGUtOTAwIGgtZnVsbCBmbGV4IGZsZXgtY29sIGdhcC02IGZvbnQtbW9ubyByZWxhdGl2ZSBvdmVyZmxvdy1oaWRkZW5cIj5cbiAgICAgPGRpdiBjbGFzc05hbWU9XCJhYnNvbHV0ZSAtdG9wLTEwIC1yaWdodC0xMCB3LTQwIGgtNDAgYmcteWVsbG93LTUwMC81IGJsdXItM3hsIHJvdW5kZWQtZnVsbCBwb2ludGVyLWV2ZW50cy1ub25lXCIgLz5cbiAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGp1c3RpZnktYmV0d2VlbiBpdGVtcy1jZW50ZXIgYmctc2xhdGUtOTUwIHAtNCByb3VuZGVkLXhsIGJvcmRlci0yIGJvcmRlci1zbGF0ZS04MDAgc2hhZG93LWxnXCI+XG4gICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtM1wiPlxuICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ3LTMgaC0zIHJvdW5kZWQtZnVsbCBiZy1yZWQtNTAwIHNoYWRvdy1bMF8wXzEwcHhfI2VmNDQ0NF0gYW5pbWF0ZS1wdWxzZVwiIC8+XG4gICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LXllbGxvdy00MDAgZm9udC1ibGFjayB0ZXh0LTJ4bCB0cmFja2luZy13aWRlc3QgaXRhbGljXCI+VEItMzAzWDwvc3Bhbj5cbiAgICAgICA8L2Rpdj5cbiAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggZ2FwLTIgcC0xIGJnLXNsYXRlLTkwMCByb3VuZGVkLWxnIGJvcmRlciBib3JkZXItc2xhdGUtODAwXCI+XG4gICAgICAgICAgPGJ1dHRvbiBjbGFzc05hbWU9XCJweC00IHB5LTEuNSBiZy15ZWxsb3ctNTAwIHRleHQtc2xhdGUtOTUwIHRleHQteHMgcm91bmRlZCBmb250LWJsYWNrIHNoYWRvdy1zbVwiPlNBVzwvYnV0dG9uPlxuICAgICAgICAgIDxidXR0b24gY2xhc3NOYW1lPVwicHgtNCBweS0xLjUgYmctc2xhdGUtODAwIHRleHQtc2xhdGUtNDAwIHRleHQteHMgcm91bmRlZCBmb250LWJvbGQgaG92ZXI6Ymctc2xhdGUtNzAwXCI+U1FVPC9idXR0b24+XG4gICAgICAgPC9kaXY+XG4gICAgIDwvZGl2PlxuICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXgganVzdGlmeS1iZXR3ZWVuIHB4LTIgYmctc2xhdGUtOTUwLzUwIHAtNCByb3VuZGVkLXhsIGJvcmRlciBib3JkZXItc2xhdGUtODAwIGJhY2tkcm9wLWJsdXItc21cIj5cbiAgICAgICA8S25vYiBsYWJlbD1cIlRVTklOR1wiIHZhbHVlPXs1MH0gY29sb3I9XCJ5ZWxsb3dcIiAvPlxuICAgICAgIDxLbm9iIGxhYmVsPVwiQ1VUT0ZGXCIgdmFsdWU9ezc1fSBjb2xvcj1cInllbGxvd1wiIC8+XG4gICAgICAgPEtub2IgbGFiZWw9XCJSRVNPTkFOQ0VcIiB2YWx1ZT17ODB9IGNvbG9yPVwieWVsbG93XCIgLz5cbiAgICAgICA8S25vYiBsYWJlbD1cIkVOViBNT0RcIiB2YWx1ZT17NjB9IGNvbG9yPVwieWVsbG93XCIgLz5cbiAgICAgICA8S25vYiBsYWJlbD1cIkRFQ0FZXCIgdmFsdWU9ezQwfSBjb2xvcj1cInllbGxvd1wiIC8+XG4gICAgICAgPEtub2IgbGFiZWw9XCJBQ0NFTlRcIiB2YWx1ZT17OTB9IGNvbG9yPVwieWVsbG93XCIgLz5cbiAgICAgPC9kaXY+XG4gICAgIDxkaXYgY2xhc3NOYW1lPVwibXQtYXV0byBiZy1zbGF0ZS05NTAgcC00IHJvdW5kZWQteGwgYm9yZGVyIGJvcmRlci1zbGF0ZS04MDBcIj5cbiAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImdyaWQgZ3JpZC1jb2xzLTE2IGdhcC0xXCI+XG4gICAgICAgICB7QXJyYXkuZnJvbSh7bGVuZ3RoOiAxNn0pLm1hcCgoXywgaSkgPT4gKFxuICAgICAgICAgICA8ZGl2IGtleT17aX0gY2xhc3NOYW1lPVwiZmxleCBmbGV4LWNvbCBnYXAtMiBpdGVtcy1jZW50ZXIgZ3JvdXBcIj5cbiAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT17YHctZnVsbCBhc3BlY3Qtc3F1YXJlIHJvdW5kZWQtc20gY3Vyc29yLXBvaW50ZXIgdHJhbnNpdGlvbi1jb2xvcnMgJHtpJTQ9PT0wID8gJ2JnLXNsYXRlLTcwMCcgOiAnYmctc2xhdGUtODAwJ30gaG92ZXI6YmcteWVsbG93LTQwMC84MCAke2k9PT0yfHxpPT09N3x8aT09PTEwID8gJ2JnLXllbGxvdy01MDAgc2hhZG93LVswXzBfOHB4XyNlYWIzMDhdJyA6ICcnfWB9IC8+XG4gICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1bOXB4XSB0ZXh0LXNsYXRlLTYwMCBmb250LWJvbGQgZ3JvdXAtaG92ZXI6dGV4dC15ZWxsb3ctNDAwXCI+e2krMX08L3NwYW4+XG4gICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgKSl9XG4gICAgICAgPC9kaXY+XG4gICAgIDwvZGl2PlxuICA8L2Rpdj5cbik7XG5cbmNvbnN0IEFJVHJhY2tHZW5lcmF0b3IgPSAoeyBzZXRCcG0sIHNldFBhZHMgfTogeyBzZXRCcG0/OiAoYnBtOiBudW1iZXIpID0+IHZvaWQ7IHNldFBhZHM/OiBSZWFjdC5EaXNwYXRjaDxSZWFjdC5TZXRTdGF0ZUFjdGlvbjxQYWRbXT4+IH0pID0+IHtcbiAgY29uc3QgW3Byb21wdFRleHQsIHNldFByb21wdFRleHRdID0gdXNlU3RhdGUoXCJDeWJlcnB1bmsgc3ludGh3YXZlIHRyYWNrIHdpdGggaGVhdnkgc2lkZWNoYWluIGJhc3MgYW5kIGx1c2ggODBzIHBhZHMgYXQgMTIwIEJQTVwiKTtcbiAgY29uc3QgW2lzR2VuZXJhdGluZywgc2V0SXNHZW5lcmF0aW5nXSA9IHVzZVN0YXRlKGZhbHNlKTtcbiAgY29uc3QgW2xsbU91dHB1dCwgc2V0TGxtT3V0cHV0XSA9IHVzZVN0YXRlPHN0cmluZz4oXCJcIik7XG4gIGNvbnN0IFtwYXJzZWREYXRhLCBzZXRQYXJzZWREYXRhXSA9IHVzZVN0YXRlPGFueT4obnVsbCk7XG5cbiAgY29uc3QgaGFuZGxlR2VtaW5pR2VuZXJhdGUgPSBhc3luYyAoKSA9PiB7XG4gICAgaWYgKCFwcm9tcHRUZXh0LnRyaW0oKSkgcmV0dXJuO1xuICAgIHNldElzR2VuZXJhdGluZyh0cnVlKTtcbiAgICBzZXRMbG1PdXRwdXQoXCJDb25uZWN0aW5nIHRvIEdlbWluaSBBUEkuLi5cIik7XG5cbiAgICB0cnkge1xuICAgICAgY29uc3Qgc3lzdGVtUHJvbXB0ID0gYFlvdSBhcmUgYW4gZXhwZXJ0IG11c2ljIHByb2R1Y2VyIGFuZCBhdWRpbyBlbmdpbmVlciBhc3Npc3RhbnQgaW4gUmVtaXggT1MuIFxuQW5hbHl6ZSB0aGUgdXNlcidzIHByb21wdCBhbmQgcHJvZHVjZSBhIEpTT04gcmVzcG9uc2Ugd2l0aCB0cmFjayBzZXR0aW5ncyBhbmQgc291bmQgZGVzaWduIHNwZWNzLlxuT3V0cHV0IGZvcm1hdCBNVVNUIGJlIHZhbGlkIEpTT04gd2l0aCB0aGlzIGV4YWN0IHN0cnVjdHVyZTpcbntcbiAgXCJnZW5yZVwiOiBcIkdlbnJlIE5hbWVcIixcbiAgXCJicG1cIjogMTIwLFxuICBcImtleVwiOiBcIkEgTWlub3JcIixcbiAgXCJzdHJ1Y3R1cmVcIjogW1wiSW50cm9cIiwgXCJCdWlsZFwiLCBcIkRyb3BcIiwgXCJPdXRyb1wiXSxcbiAgXCJ0cmFja0FkdmljZVwiOiBcIkNvbmNpc2UgbWl4IGFkdmljZVwiLFxuICBcInBhZHNcIjogW1xuICAgIHtcIm5hbWVcIjogXCJLaWNrICYgU25hcmVcIiwgXCJjYXRlZ29yeVwiOiBcImRydW1zXCIsIFwidm9sdW1lXCI6IDAuOX0sXG4gICAge1wibmFtZVwiOiBcIlBlcmN1c3Npb25cIiwgXCJjYXRlZ29yeVwiOiBcImRydW1zXCIsIFwidm9sdW1lXCI6IDAuNzV9LFxuICAgIHtcIm5hbWVcIjogXCJTdWIgQmFzcyBMaW5lXCIsIFwiY2F0ZWdvcnlcIjogXCJiYXNzXCIsIFwidm9sdW1lXCI6IDAuODV9LFxuICAgIHtcIm5hbWVcIjogXCJTeW50aCBQYWRcIiwgXCJjYXRlZ29yeVwiOiBcInN5bnRoXCIsIFwidm9sdW1lXCI6IDAuN31cbiAgXVxufWA7XG5cbiAgICAgIC8vIFNlY3VyZSBBUEkga2V5IHJldHJpZXZhbCBmb3IgVml0ZS9BSSBTdHVkaW8gcnVudGltZVxuICAgICAgY29uc3QgYXBpS2V5ID0gKGltcG9ydC5tZXRhIGFzIGFueSkuZW52Py5WSVRFX0dFTUlOSV9BUElfS0VZIHx8IChwcm9jZXNzLmVudiBhcyBhbnkpPy5SRUFDVF9BUFBfR0VNSU5JX0FQSV9LRVkgfHwgXCJcIjtcblxuICAgICAgaWYgKCFhcGlLZXkpIHtcbiAgICAgICAgc2V0TGxtT3V0cHV0KFwiRVJST1I6IE1pc3NpbmcgQVBJIEtleS4gUGxlYXNlIGVuc3VyZSBHRU1JTklfQVBJX0tFWSBpcyBjb25maWd1cmVkIGluIHlvdXIgZW52aXJvbm1lbnQgb3Igc2VjcmV0cyBwYW5lbC5cIik7XG4gICAgICAgIHNldElzR2VuZXJhdGluZyhmYWxzZSk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgY29uc3QgYXBpVXJsID0gYGh0dHBzOi8vZ2VuZXJhdGl2ZWxhbmd1YWdlLmdvb2dsZWFwaXMuY29tL3YxYmV0YS9tb2RlbHMvZ2VtaW5pLTIuNS1mbGFzaDpnZW5lcmF0ZUNvbnRlbnQ/a2V5PSR7YXBpS2V5fWA7XG5cbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goYXBpVXJsLCB7XG4gICAgICAgIG1ldGhvZDogXCJQT1NUXCIsXG4gICAgICAgIGhlYWRlcnM6IHsgXCJDb250ZW50LVR5cGVcIjogXCJhcHBsaWNhdGlvbi9qc29uXCIgfSxcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgIGNvbnRlbnRzOiBbeyBwYXJ0czogW3sgdGV4dDogcHJvbXB0VGV4dCB9XSB9XSxcbiAgICAgICAgICBzeXN0ZW1JbnN0cnVjdGlvbjogeyBwYXJ0czogW3sgdGV4dDogc3lzdGVtUHJvbXB0IH1dIH0sXG4gICAgICAgICAgZ2VuZXJhdGlvbkNvbmZpZzogeyByZXNwb25zZU1pbWVUeXBlOiBcImFwcGxpY2F0aW9uL2pzb25cIiB9XG4gICAgICAgIH0pXG4gICAgICB9KTtcblxuICAgICAgY29uc3QgZGF0YSA9IGF3YWl0IHJlc3BvbnNlLmpzb24oKTtcbiAgICAgIGxldCByYXdKc29uID0gZGF0YS5jYW5kaWRhdGVzPy5bMF0/LmNvbnRlbnQ/LnBhcnRzPy5bMF0/LnRleHQ7XG5cbiAgICAgIGlmIChyYXdKc29uKSB7XG4gICAgICAgIHJhd0pzb24gPSByYXdKc29uLnJlcGxhY2UoL2BgYGpzb24vZywgXCJcIikucmVwbGFjZSgvYGBgL2csIFwiXCIpLnRyaW0oKTtcblxuICAgICAgICBjb25zdCBmaXJzdEJyYWNlID0gcmF3SnNvbi5pbmRleE9mKFwie1wiKTtcbiAgICAgICAgY29uc3QgbGFzdEJyYWNlID0gcmF3SnNvbi5sYXN0SW5kZXhPZihcIn1cIik7XG4gICAgICAgIGlmIChmaXJzdEJyYWNlICE9PSAtMSAmJiBsYXN0QnJhY2UgIT09IC0xKSB7XG4gICAgICAgICAgcmF3SnNvbiA9IHJhd0pzb24uc3Vic3RyaW5nKGZpcnN0QnJhY2UsIGxhc3RCcmFjZSArIDEpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgcGFyc2VkID0gSlNPTi5wYXJzZShyYXdKc29uKTtcbiAgICAgICAgc2V0UGFyc2VkRGF0YShwYXJzZWQpO1xuICAgICAgICBzZXRMbG1PdXRwdXQoSlNPTi5zdHJpbmdpZnkocGFyc2VkLCBudWxsLCAyKSk7XG5cbiAgICAgICAgaWYgKHBhcnNlZC5icG0gJiYgc2V0QnBtKSBzZXRCcG0ocGFyc2VkLmJwbSk7XG4gICAgICAgIGlmIChwYXJzZWQucGFkcyAmJiBzZXRQYWRzKSB7XG4gICAgICAgICAgc2V0UGFkcygocHJldlBhZHM6IFBhZFtdKSA9PlxuICAgICAgICAgICAgcHJldlBhZHMubWFwKChwYWQsIGlkeCkgPT4ge1xuICAgICAgICAgICAgICBpZiAocGFyc2VkLnBhZHNbaWR4XSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAuLi5wYWQsXG4gICAgICAgICAgICAgICAgICBuYW1lOiBwYXJzZWQucGFkc1tpZHhdLm5hbWUgfHwgcGFkLm5hbWUsXG4gICAgICAgICAgICAgICAgICBjYXRlZ29yeTogcGFyc2VkLnBhZHNbaWR4XS5jYXRlZ29yeSB8fCBwYWQuY2F0ZWdvcnksXG4gICAgICAgICAgICAgICAgICB2b2x1bWU6IHBhcnNlZC5wYWRzW2lkeF0udm9sdW1lIHx8IHBhZC52b2x1bWUsXG4gICAgICAgICAgICAgICAgICBpc1BsYXlpbmc6IGlkeCA8IDQgPyB0cnVlIDogcGFkLmlzUGxheWluZ1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgcmV0dXJuIHBhZDtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc2V0TGxtT3V0cHV0KFwiRmFpbGVkIHRvIHJlY2VpdmUgc3RydWN0dXJlZCBjb250ZW50IGZyb20gR2VtaW5pLlwiKTtcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICBjb25zb2xlLmVycm9yKGVycm9yKTtcbiAgICAgIHNldExsbU91dHB1dChgRXJyb3IgZ2VuZXJhdGluZyB3aXRoIEdlbWluaSBBUEk6ICR7ZXJyb3IubWVzc2FnZSB8fCBlcnJvcn1gKTtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgc2V0SXNHZW5lcmF0aW5nKGZhbHNlKTtcbiAgICB9XG4gIH07XG5cbiAgcmV0dXJuIChcbiAgICA8ZGl2IGNsYXNzTmFtZT1cInAtNSBoLWZ1bGwgZmxleCBmbGV4LWNvbCBnYXAtNCBiZy1zbGF0ZS05MDAgZm9udC1tb25vIHRleHQteHMgdGV4dC1zbGF0ZS0zMDAgb3ZlcmZsb3cteS1hdXRvXCI+XG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktYmV0d2VlbiBib3JkZXItYiBib3JkZXItZnVjaHNpYS05MDAvNTAgcGItM1wiPlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0yIHRleHQtZnVjaHNpYS00MDAgZm9udC1ib2xkIHRyYWNraW5nLXdpZGVyXCI+XG4gICAgICAgICAgPEJvdCBzaXplPXsxOH0gLz5cbiAgICAgICAgICA8c3Bhbj5HRU1JTkkgQUkgUFJPRFVDRVIgRU5HSU5FPC9zcGFuPlxuICAgICAgICA8L2Rpdj5cbiAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwicHgtMiBweS0wLjUgYmctZnVjaHNpYS05NTAgYm9yZGVyIGJvcmRlci1mdWNoc2lhLTgwMCB0ZXh0LWZ1Y2hzaWEtMzAwIHRleHQtWzEwcHhdIHJvdW5kZWRcIj5cbiAgICAgICAgICBnZW1pbmktMi41LWZsYXNoXG4gICAgICAgIDwvc3Bhbj5cbiAgICAgIDwvZGl2PlxuXG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggZmxleC1jb2wgZ2FwLTJcIj5cbiAgICAgICAgPGxhYmVsIGNsYXNzTmFtZT1cInRleHQtWzEwcHhdIHRleHQtc2xhdGUtNDAwIGZvbnQtYm9sZCB1cHBlcmNhc2UgdHJhY2tpbmctd2lkZXIgZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTEuNVwiPlxuICAgICAgICAgIDxXYW5kMiBzaXplPXsxMn0gY2xhc3NOYW1lPVwidGV4dC1mdWNoc2lhLTQwMFwiIC8+XG4gICAgICAgICAgTXVzaWMgU3R5bGUgUHJvbXB0XG4gICAgICAgIDwvbGFiZWw+XG4gICAgICAgIDx0ZXh0YXJlYVxuICAgICAgICAgIHZhbHVlPXtwcm9tcHRUZXh0fVxuICAgICAgICAgIG9uQ2hhbmdlPXsoZSkgPT4gc2V0UHJvbXB0VGV4dChlLnRhcmdldC52YWx1ZSl9XG4gICAgICAgICAgcm93cz17M31cbiAgICAgICAgICBjbGFzc05hbWU9XCJ3LWZ1bGwgYmctc2xhdGUtOTUwIGJvcmRlciBib3JkZXItc2xhdGUtNzAwIHJvdW5kZWQteGwgcC0zIHRleHQtc2xhdGUtMTAwIHJlc2l6ZS1ub25lIGZvY3VzOmJvcmRlci1mdWNoc2lhLTUwMCBmb2N1czpyaW5nLTEgZm9jdXM6cmluZy1mdWNoc2lhLTUwMCBmb2N1czpvdXRsaW5lLW5vbmUgc2hhZG93LWlubmVyIGxlYWRpbmctcmVsYXhlZCB0ZXh0LXhzXCJcbiAgICAgICAgICBwbGFjZWhvbGRlcj1cIkRlc2NyaWJlIHRoZSBnZW5yZSwgdGVtcG8sIGluc3RydW1lbnRzLCBhbmQgbW9vZC4uLlwiXG4gICAgICAgIC8+XG4gICAgICA8L2Rpdj5cblxuICAgICAgPGJ1dHRvblxuICAgICAgICBvbkNsaWNrPXtoYW5kbGVHZW1pbmlHZW5lcmF0ZX1cbiAgICAgICAgZGlzYWJsZWQ9e2lzR2VuZXJhdGluZ31cbiAgICAgICAgY2xhc3NOYW1lPVwidy1mdWxsIGJnLWZ1Y2hzaWEtNjAwIGhvdmVyOmJnLWZ1Y2hzaWEtNTAwIHRleHQtd2hpdGUgZm9udC1ibGFjayBweS0zIHJvdW5kZWQteGwgZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgZ2FwLTIgdHJhbnNpdGlvbi1hbGwgZGlzYWJsZWQ6b3BhY2l0eS01MCBzaGFkb3ctWzBfMF8xNXB4X3JnYmEoMTkyLDM4LDIxMSwwLjMpXSBhY3RpdmU6c2NhbGUtWzAuOTldXCJcbiAgICAgID5cbiAgICAgICAge2lzR2VuZXJhdGluZyA/IDxSZWZyZXNoQ3cgc2l6ZT17MTZ9IGNsYXNzTmFtZT1cImFuaW1hdGUtc3BpblwiIC8+IDogPFNwYXJrbGVzIHNpemU9ezE2fSAvPn1cbiAgICAgICAge2lzR2VuZXJhdGluZyA/IFwiR0VORVJBVElORyBXSVRIIEdFTUlOSS4uLlwiIDogXCJHRU5FUkFURSBUUkFDSyAmIEFQUExZIFRPIERBV1wifVxuICAgICAgPC9idXR0b24+XG5cbiAgICAgIHtwYXJzZWREYXRhICYmIChcbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJncmlkIGdyaWQtY29scy0zIGdhcC0yIGJnLXNsYXRlLTk1MCBwLTMgcm91bmRlZC1sZyBib3JkZXIgYm9yZGVyLXNsYXRlLTgwMFwiPlxuICAgICAgICAgIDxkaXY+XG4gICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LVs5cHhdIHRleHQtc2xhdGUtNTAwIGJsb2NrXCI+R0VOUkU8L3NwYW4+XG4gICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJmb250LWJvbGQgdGV4dC1mdWNoc2lhLTMwMFwiPntwYXJzZWREYXRhLmdlbnJlIHx8IFwiQ3VzdG9tXCJ9PC9zcGFuPlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDxkaXY+XG4gICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LVs5cHhdIHRleHQtc2xhdGUtNTAwIGJsb2NrXCI+VEVNUE88L3NwYW4+XG4gICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJmb250LWJvbGQgdGV4dC1jeWFuLTMwMFwiPntwYXJzZWREYXRhLmJwbSB8fCAxMjB9IEJQTTwvc3Bhbj5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8ZGl2PlxuICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1bOXB4XSB0ZXh0LXNsYXRlLTUwMCBibG9ja1wiPktFWTwvc3Bhbj5cbiAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cImZvbnQtYm9sZCB0ZXh0LWVtZXJhbGQtMzAwXCI+e3BhcnNlZERhdGEua2V5IHx8IFwiQSBNaW5vclwifTwvc3Bhbj5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgPC9kaXY+XG4gICAgICApfVxuXG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXgtMSBmbGV4IGZsZXgtY29sIGdhcC0xIG1pbi1oLVsxMjBweF1cIj5cbiAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1bMTBweF0gdGV4dC1zbGF0ZS01MDAgZm9udC1ib2xkIGZsZXggaXRlbXMtY2VudGVyIGdhcC0xXCI+XG4gICAgICAgICAgPFRlcm1pbmFsIHNpemU9ezEyfSAvPiBHRU1JTkkgUkVTUE9OU0UgREFUQVxuICAgICAgICA8L3NwYW4+XG4gICAgICAgIDxwcmUgY2xhc3NOYW1lPVwiZmxleC0xIGJnLXNsYXRlLTk1MCBib3JkZXIgYm9yZGVyLXNsYXRlLTgwMCByb3VuZGVkLWxnIHAtMyB0ZXh0LVsxMHB4XSB0ZXh0LWVtZXJhbGQtNDAwIG92ZXJmbG93LXgtYXV0byBvdmVyZmxvdy15LWF1dG8gc2hhZG93LWlubmVyIGxlYWRpbmctbm9ybWFsIGZvbnQtbW9ub1wiPlxuICAgICAgICAgIHtsbG1PdXRwdXQgfHwgXCIvLyBQcmVzcyAnR0VORVJBVEUgVFJBQ0snIHRvIGNhbGwgdGhlIEdlbWluaSBBUEkuXCJ9XG4gICAgICAgIDwvcHJlPlxuICAgICAgPC9kaXY+XG4gICAgPC9kaXY+XG4gICk7XG59O1xuXG5jb25zdCBTdGVwU2VxdWVuY2VyID0gKCkgPT4gKFxuICA8ZGl2IGNsYXNzTmFtZT1cImgtZnVsbCBiZy1zbGF0ZS05MDAgcC00IGZsZXggZmxleC1jb2wgZ2FwLTIgZm9udC1tb25vXCI+XG4gICAgIHtbJ0tJQ0snLCAnU05BUkUnLCAnSElIQVQnLCAnUEVSQycsICdCQVNTJywgJ1NZTlRIJ10ubWFwKCh0cmFjaywgaSkgPT4gKFxuICAgICAgIDxkaXYga2V5PXt0cmFja30gY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTQgcC0yIGJnLXNsYXRlLTk1MC81MCByb3VuZGVkIGJvcmRlciBib3JkZXItc2xhdGUtODAwXCI+XG4gICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInctMTYgZmxleC1zaHJpbmstMCBmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMlwiPlxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9e2B3LTIgaC0yIHJvdW5kZWQtZnVsbCAke2k9PT0wPydiZy1lbWVyYWxkLTQwMCc6aT09PTQ/J2JnLWluZGlnby00MDAnOidiZy1zbGF0ZS01MDAnfWB9IC8+XG4gICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LVsxMHB4XSB0ZXh0LXNsYXRlLTMwMCBmb250LWJvbGRcIj57dHJhY2t9PC9zcGFuPlxuICAgICAgICAgPC9kaXY+XG4gICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXgtMSBncmlkIGdyaWQtY29scy0xNiBnYXAtMVwiPlxuICAgICAgICAgICAge0FycmF5LmZyb20oe2xlbmd0aDogMTZ9KS5tYXAoKF8sIGopID0+IHtcbiAgICAgICAgICAgICAgIGNvbnN0IGFjdGl2ZSA9IE1hdGgucmFuZG9tKCkgPiAwLjg7XG4gICAgICAgICAgICAgICByZXR1cm4gPGRpdiBrZXk9e2p9IGNsYXNzTmFtZT17YGgtOCByb3VuZGVkLXNtICR7YWN0aXZlID8gKGk9PT0wPydiZy1lbWVyYWxkLTUwMCc6aT09PTQ/J2JnLWluZGlnby01MDAnOidiZy1zbGF0ZS00MDAnKSA6ICdiZy1zbGF0ZS04MDAnfSAke2olND09PTAgPyAnb3BhY2l0eS0xMDAnIDogJ29wYWNpdHktNzAnfWB9IC8+XG4gICAgICAgICAgICB9KX1cbiAgICAgICAgIDwvZGl2PlxuICAgICAgIDwvZGl2PlxuICAgICApKX1cbiAgPC9kaXY+XG4pO1xuXG5jb25zdCBNb2R1bGFyUGF0Y2hCYXkgPSAoKSA9PiAoXG4gIDxkaXYgY2xhc3NOYW1lPVwiaC1mdWxsIGJnLXNsYXRlLTkwMCBwLTYgcmVsYXRpdmUgb3ZlcmZsb3ctaGlkZGVuIGZsZXggZmxleC1jb2wgaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyXCI+XG4gICAgIDxOZXR3b3JrIHNpemU9ezEyMH0gY2xhc3NOYW1lPVwidGV4dC1zbGF0ZS04MDAvNTAgYWJzb2x1dGVcIiAvPlxuICAgICA8ZGl2IGNsYXNzTmFtZT1cImdyaWQgZ3JpZC1jb2xzLTQgZ2FwLTggei0xMFwiPlxuICAgICAgICB7QXJyYXkuZnJvbSh7bGVuZ3RoOiAxMn0pLm1hcCgoXywgaSkgPT4gKFxuICAgICAgICAgICA8ZGl2IGtleT17aX0gY2xhc3NOYW1lPVwidy0xNiBoLTE2IHJvdW5kZWQtZnVsbCBiZy1zbGF0ZS05NTAgYm9yZGVyLTQgYm9yZGVyLXNsYXRlLTgwMCBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBzaGFkb3ctaW5uZXIgcmVsYXRpdmUgZ3JvdXBcIj5cbiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9e2B3LTYgaC02IHJvdW5kZWQtZnVsbCAke2klMz09PTAgPyAnYmctb3JhbmdlLTUwMCBzaGFkb3ctWzBfMF8xNXB4XyNmOTczMTZdJyA6ICdiZy1zbGF0ZS05MDAnfSBpbm5lci1zaGFkb3ctbGdgfSAvPlxuICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJhYnNvbHV0ZSAtYm90dG9tLTUgdGV4dC1bOXB4XSB0ZXh0LXNsYXRlLTUwMCBmb250LW1vbm8gZm9udC1ib2xkIHdoaXRlc3BhY2Utbm93cmFwXCI+Tk9ERV8we2krMX08L3NwYW4+XG4gICAgICAgICAgIDwvZGl2PlxuICAgICAgICApKX1cbiAgICAgPC9kaXY+XG4gIDwvZGl2PlxuKTtcblxuY29uc3QgWFlQZXJmb3JtYW5jZVBhZCA9ICgpID0+IChcbiAgPGRpdiBjbGFzc05hbWU9XCJoLWZ1bGwgYmctc2xhdGUtOTAwIHAtNiBmbGV4IGZsZXgtY29sIGdhcC00IGl0ZW1zLWNlbnRlciByZWxhdGl2ZVwiPlxuICAgICA8ZGl2IGNsYXNzTmFtZT1cInctZnVsbCBmbGV4LTEgbWF4LXctc20gYm9yZGVyLTIgYm9yZGVyLXNsYXRlLTcwMCBiZy1zbGF0ZS05NTAgcm91bmRlZC0yeGwgcmVsYXRpdmUgb3ZlcmZsb3ctaGlkZGVuIHNoYWRvdy1pbm5lciBjdXJzb3ItY3Jvc3NoYWlyIGdyb3VwXCI+XG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJzb2x1dGUgaW5zZXQtMCBncmlkIGdyaWQtY29scy00IGdyaWQtcm93cy00IG9wYWNpdHktMjBcIj5cbiAgICAgICAgICAge0FycmF5LmZyb20oe2xlbmd0aDogMTZ9KS5tYXAoKF8saSkgPT4gPGRpdiBrZXk9e2l9IGNsYXNzTmFtZT1cImJvcmRlciBib3JkZXItcGluay01MDAvMzBcIiAvPil9XG4gICAgICAgIDwvZGl2PlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImFic29sdXRlIHRvcC0xLzIgbGVmdC0xLzMgdy04IGgtOCAtbWwtNCAtbXQtNCBiZy1waW5rLTUwMCByb3VuZGVkLWZ1bGwgc2hhZG93LVswXzBfMjBweF8jZWM0ODk5XSBib3JkZXItMiBib3JkZXItd2hpdGUgcG9pbnRlci1ldmVudHMtbm9uZSBncm91cC1ob3ZlcjpzY2FsZS0xMTAgdHJhbnNpdGlvbi10cmFuc2Zvcm1cIiAvPlxuICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJhYnNvbHV0ZSBib3R0b20tMyBsZWZ0LTMgdGV4dC1bMTBweF0gZm9udC1tb25vIHRleHQtcGluay01MDAvNTBcIj5GSUxURVIgSFAvTFA8L3NwYW4+XG4gICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cImFic29sdXRlIHRvcC0zIHJpZ2h0LTMgdGV4dC1bMTBweF0gZm9udC1tb25vIHRleHQtcGluay01MDAvNTAgdHJhbnNmb3JtIHJvdGF0ZS05MCBvcmlnaW4tcmlnaHRcIj5ERUxBWSBGQjwvc3Bhbj5cbiAgICAgPC9kaXY+XG4gIDwvZGl2PlxuKTtcblxuY29uc3QgU2FtcGxlQ3JhdGUgPSAoKSA9PiB7XG4gIGNvbnN0IFtzZWxlY3RlZEZvbGRlciwgc2V0U2VsZWN0ZWRGb2xkZXJdID0gdXNlU3RhdGUoXCJLaWNrc1wiKTtcbiAgY29uc3QgW3BsYXlpbmdTYW1wbGUsIHNldFBsYXlpbmdTYW1wbGVdID0gdXNlU3RhdGU8c3RyaW5nIHwgbnVsbD4obnVsbCk7XG4gIGNvbnN0IFtpbXBvcnRlZFNhbXBsZXMsIHNldEltcG9ydGVkU2FtcGxlc10gPSB1c2VTdGF0ZTxBcnJheTx7bmFtZTogc3RyaW5nLCBkdXI6IHN0cmluZywgYnBtOiBudW1iZXIsIGtleTogc3RyaW5nfT4+KFtdKTtcbiAgY29uc3QgZmlsZUlucHV0UmVmID0gdXNlUmVmPEhUTUxJbnB1dEVsZW1lbnQ+KG51bGwpO1xuXG4gIGNvbnN0IGZvbGRlcnMgPSBbXCJLaWNrc1wiLCBcIlNuYXJlc1wiLCBcIlN5bnRoc1wiLCBcIlZvY2Fsc1wiLCBcIkZYXCIsIFwiSW1wb3J0ZWRcIl07XG4gIGNvbnN0IGRlZmF1bHRTYW1wbGVzOiBSZWNvcmQ8c3RyaW5nLCBBcnJheTx7bmFtZTogc3RyaW5nLCBkdXI6IHN0cmluZywgYnBtOiBudW1iZXIsIGtleTogc3RyaW5nfT4+ID0ge1xuICAgIEtpY2tzOiBbXG4gICAgICB7IG5hbWU6IFwiS2lja184MDhfUHVuY2gud2F2XCIsIGR1cjogXCIwLjhzXCIsIGJwbTogMTIwLCBrZXk6IFwiQzFcIiB9LFxuICAgICAgeyBuYW1lOiBcIktpY2tfSG91c2VfRGVlcC53YXZcIiwgZHVyOiBcIjEuMnNcIiwgYnBtOiAxMjQsIGtleTogXCJGMVwiIH0sXG4gICAgICB7IG5hbWU6IFwiS2lja19UcmFwX1N1Yi53YXZcIiwgZHVyOiBcIjAuOXNcIiwgYnBtOiAxNDAsIGtleTogXCJHMVwiIH0sXG4gICAgXSxcbiAgICBTbmFyZXM6IFtcbiAgICAgIHsgbmFtZTogXCJTbmFyZV9DcmlzcF9BLndhdlwiLCBkdXI6IFwiMC41c1wiLCBicG06IDEyMCwga2V5OiBcIkQyXCIgfSxcbiAgICAgIHsgbmFtZTogXCJTbmFyZV9DbGFwX1N0YWRpdW0ud2F2XCIsIGR1cjogXCIwLjdzXCIsIGJwbTogMTI0LCBrZXk6IFwiQTJcIiB9LFxuICAgIF0sXG4gICAgU3ludGhzOiBbXG4gICAgICB7IG5hbWU6IFwiU3ludGhfU2F3X0xlYWQud2F2XCIsIGR1cjogXCIyLjRzXCIsIGJwbTogMTI0LCBrZXk6IFwiQSBNaW5vclwiIH0sXG4gICAgICB7IG5hbWU6IFwiU3ludGhfQ2hvcmRzX1JldHJvLndhdlwiLCBkdXI6IFwiNC4wc1wiLCBicG06IDExNSwga2V5OiBcIkMgTWFqb3JcIiB9LFxuICAgIF0sXG4gICAgVm9jYWxzOiBbXG4gICAgICB7IG5hbWU6IFwiVm9jYWxfQ2hvcF9IZWF2ZW4ud2F2XCIsIGR1cjogXCIxLjRzXCIsIGJwbTogMTI4LCBrZXk6IFwiRiMgTWlub3JcIiB9LFxuICAgICAgeyBuYW1lOiBcIlZvY2FsX1BocmFzZV9ZZWFoLndhdlwiLCBkdXI6IFwiMC45c1wiLCBicG06IDEyMCwga2V5OiBcIkUgTWlub3JcIiB9LFxuICAgIF0sXG4gICAgRlg6IFtcbiAgICAgIHsgbmFtZTogXCJGWF9DeWJlcl9SaXNlci53YXZcIiwgZHVyOiBcIjQuMHNcIiwgYnBtOiAxMjQsIGtleTogXCJOL0FcIiB9LFxuICAgICAgeyBuYW1lOiBcIkZYX0dsaXRjaF9IaXQud2F2XCIsIGR1cjogXCIwLjNzXCIsIGJwbTogMTQwLCBrZXk6IFwiTi9BXCIgfSxcbiAgICBdLFxuICAgIEltcG9ydGVkOiBpbXBvcnRlZFNhbXBsZXNcbiAgfTtcblxuICBjb25zdCBoYW5kbGVGaWxlQ2hhbmdlID0gKGU6IFJlYWN0LkNoYW5nZUV2ZW50PEhUTUxJbnB1dEVsZW1lbnQ+KSA9PiB7XG4gICAgY29uc3QgZmlsZXMgPSBlLnRhcmdldC5maWxlcztcbiAgICBpZiAoIWZpbGVzIHx8IGZpbGVzLmxlbmd0aCA9PT0gMCkgcmV0dXJuO1xuICAgIGNvbnN0IG5ld0l0ZW1zID0gQXJyYXkuZnJvbShmaWxlcykubWFwKChmaWxlKSA9PiAoe1xuICAgICAgbmFtZTogZmlsZS5uYW1lLFxuICAgICAgZHVyOiBgJHsoTWF0aC5yYW5kb20oKSAqIDIgKyAwLjUpLnRvRml4ZWQoMSl9c2AsXG4gICAgICBicG06IDEyMCxcbiAgICAgIGtleTogXCJDdXN0b21cIlxuICAgIH0pKTtcbiAgICBzZXRJbXBvcnRlZFNhbXBsZXMocHJldiA9PiBbLi4ucHJldiwgLi4ubmV3SXRlbXNdKTtcbiAgICBzZXRTZWxlY3RlZEZvbGRlcihcIkltcG9ydGVkXCIpO1xuICB9O1xuXG4gIHJldHVybiAoXG4gICAgPGRpdiBjbGFzc05hbWU9XCJoLWZ1bGwgYmctc2xhdGUtOTAwIHAtNiBmbGV4IGdhcC00IGZvbnQtbW9ubyB0ZXh0LXhzIHRleHQtc2xhdGUtMzAwIG92ZXJmbG93LWhpZGRlblwiPlxuICAgICAgIDxpbnB1dCBcbiAgICAgICAgIHR5cGU9XCJmaWxlXCIgXG4gICAgICAgICByZWY9e2ZpbGVJbnB1dFJlZn0gXG4gICAgICAgICBvbkNoYW5nZT17aGFuZGxlRmlsZUNoYW5nZX0gXG4gICAgICAgICBhY2NlcHQ9XCJhdWRpby8qXCIgXG4gICAgICAgICBtdWx0aXBsZSBcbiAgICAgICAgIGNsYXNzTmFtZT1cImhpZGRlblwiIFxuICAgICAgIC8+XG5cbiAgICAgICB7LyogU2lkZWJhciBGb2xkZXJzICovfVxuICAgICAgIDxkaXYgY2xhc3NOYW1lPVwidy00NCBiZy1zbGF0ZS05NTAgcC0zIHJvdW5kZWQteGwgYm9yZGVyIGJvcmRlci1zbGF0ZS04MDAgZmxleCBmbGV4LWNvbCBnYXAtMlwiPlxuICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1bMTBweF0gdGV4dC1ibHVlLTQwMCBmb250LWJvbGQgdHJhY2tpbmctd2lkZXN0IGJvcmRlci1iIGJvcmRlci1zbGF0ZS04MDAgcGItMiBtYi0xIGZsZXggaXRlbXMtY2VudGVyIGdhcC0xLjVcIj5cbiAgICAgICAgICAgPEZvbGRlciBzaXplPXsxNH0gLz4gQ1JBVEUgTElCUkFSSUVTXG4gICAgICAgICA8L3NwYW4+XG4gICAgICAgICB7Zm9sZGVycy5tYXAoZm9sZGVyID0+IChcbiAgICAgICAgICAgPGJ1dHRvbiBcbiAgICAgICAgICAgICBrZXk9e2ZvbGRlcn1cbiAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBzZXRTZWxlY3RlZEZvbGRlcihmb2xkZXIpfVxuICAgICAgICAgICAgIGNsYXNzTmFtZT17YGZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktYmV0d2VlbiBweC0zIHB5LTIgcm91bmRlZC1sZyB0ZXh0LWxlZnQgdHJhbnNpdGlvbi1jb2xvcnMgZm9udC1ib2xkICR7XG4gICAgICAgICAgICAgICBzZWxlY3RlZEZvbGRlciA9PT0gZm9sZGVyIFxuICAgICAgICAgICAgICAgICA/ICdiZy1ibHVlLTYwMC8yMCB0ZXh0LWJsdWUtMzAwIGJvcmRlciBib3JkZXItYmx1ZS01MDAvNTAgc2hhZG93LVswXzBfMTBweF9yZ2JhKDU5LDEzMCwyNDYsMC4xNSldJyBcbiAgICAgICAgICAgICAgICAgOiAnaG92ZXI6Ymctc2xhdGUtOTAwIHRleHQtc2xhdGUtNDAwJ1xuICAgICAgICAgICAgIH1gfVxuICAgICAgICAgICA+XG4gICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMiB0cnVuY2F0ZVwiPlxuICAgICAgICAgICAgICAgPEZvbGRlciBzaXplPXsxMn0gY2xhc3NOYW1lPXtzZWxlY3RlZEZvbGRlciA9PT0gZm9sZGVyID8gJ3RleHQtYmx1ZS00MDAnIDogJ3RleHQtc2xhdGUtNTAwJ30gLz5cbiAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRydW5jYXRlXCI+L3tmb2xkZXJ9PC9zcGFuPlxuICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgIHtmb2xkZXIgPT09IFwiSW1wb3J0ZWRcIiAmJiBpbXBvcnRlZFNhbXBsZXMubGVuZ3RoID4gMCAmJiAoXG4gICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJweC0xLjUgcHktMC41IGJnLWJsdWUtOTUwIHRleHQtYmx1ZS00MDAgdGV4dC1bOXB4XSByb3VuZGVkIGJvcmRlciBib3JkZXItYmx1ZS04MDBcIj57aW1wb3J0ZWRTYW1wbGVzLmxlbmd0aH08L3NwYW4+XG4gICAgICAgICAgICAgKX1cbiAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICApKX1cblxuICAgICAgICAgPGJ1dHRvbiBcbiAgICAgICAgICAgb25DbGljaz17KCkgPT4gZmlsZUlucHV0UmVmLmN1cnJlbnQ/LmNsaWNrKCl9XG4gICAgICAgICAgIGNsYXNzTmFtZT1cIm10LWF1dG8gdy1mdWxsIHB5LTIuNSBiZy1ibHVlLTYwMCBob3ZlcjpiZy1ibHVlLTUwMCB0ZXh0LXdoaXRlIGZvbnQtYm9sZCByb3VuZGVkLXhsIGZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIGdhcC0xLjUgdHJhbnNpdGlvbi1jb2xvcnMgc2hhZG93LVswXzBfMTJweF9yZ2JhKDM3LDk5LDIzNSwwLjMpXSBjdXJzb3ItcG9pbnRlclwiXG4gICAgICAgICA+XG4gICAgICAgICAgIDxGb2xkZXIgc2l6ZT17MTR9IC8+IElNUE9SVCBMT0NBTCBGSUxFXG4gICAgICAgICA8L2J1dHRvbj5cbiAgICAgICA8L2Rpdj5cblxuICAgICAgIHsvKiBTYW1wbGUgTGlzdCAmIFByZXZpZXcgKi99XG4gICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4LTEgYmctc2xhdGUtOTUwIHAtNCByb3VuZGVkLXhsIGJvcmRlciBib3JkZXItc2xhdGUtODAwIGZsZXggZmxleC1jb2wgZ2FwLTQgb3ZlcmZsb3cteS1hdXRvXCI+XG4gICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXgganVzdGlmeS1iZXR3ZWVuIGl0ZW1zLWNlbnRlciBib3JkZXItYiBib3JkZXItc2xhdGUtODAwIHBiLTJcIj5cbiAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1ibHVlLTQwMCBmb250LWJvbGQgdHJhY2tpbmctd2lkZXN0XCI+RElSRUNUT1JZOiAve3NlbGVjdGVkRm9sZGVyfTwvc3Bhbj5cbiAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1bMTBweF0gdGV4dC1zbGF0ZS01MDBcIj57ZGVmYXVsdFNhbXBsZXNbc2VsZWN0ZWRGb2xkZXJdPy5sZW5ndGggfHwgMH0gU0FNUExFUzwvc3Bhbj5cbiAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggZmxleC1jb2wgZ2FwLTJcIj5cbiAgICAgICAgICAge2RlZmF1bHRTYW1wbGVzW3NlbGVjdGVkRm9sZGVyXT8ubGVuZ3RoID09PSAwID8gKFxuICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiaC00MCBmbGV4IGZsZXgtY29sIGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBnYXAtMiB0ZXh0LXNsYXRlLTUwMCBib3JkZXItMiBib3JkZXItZGFzaGVkIGJvcmRlci1zbGF0ZS04MDAgcm91bmRlZC14bFwiPlxuICAgICAgICAgICAgICAgPEZvbGRlciBzaXplPXszMn0gY2xhc3NOYW1lPVwidGV4dC1zbGF0ZS03MDBcIiAvPlxuICAgICAgICAgICAgICAgPHNwYW4+Tm8gc2FtcGxlcyBpbiB0aGlzIGZvbGRlci4gQ2xpY2sgJ0ltcG9ydCBMb2NhbCBGaWxlJyB0byBhZGQgYXVkaW8uPC9zcGFuPlxuICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICApIDogKFxuICAgICAgICAgICAgIGRlZmF1bHRTYW1wbGVzW3NlbGVjdGVkRm9sZGVyXT8ubWFwKChzYW1wbGUsIGkpID0+IChcbiAgICAgICAgICAgICAgIDxkaXYga2V5PXtpfSBjbGFzc05hbWU9XCJiZy1zbGF0ZS05MDAgcC0zIHJvdW5kZWQteGwgYm9yZGVyIGJvcmRlci1zbGF0ZS04MDAvODAgZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1iZXR3ZWVuIGhvdmVyOmJvcmRlci1zbGF0ZS03MDAgdHJhbnNpdGlvbi1jb2xvcnNcIj5cbiAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtM1wiPlxuICAgICAgICAgICAgICAgICAgIDxidXR0b24gXG4gICAgICAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBzZXRQbGF5aW5nU2FtcGxlKHBsYXlpbmdTYW1wbGUgPT09IHNhbXBsZS5uYW1lID8gbnVsbCA6IHNhbXBsZS5uYW1lKX1cbiAgICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cInctOCBoLTggcm91bmRlZC1mdWxsIGJnLWJsdWUtNjAwLzIwIHRleHQtYmx1ZS00MDAgaG92ZXI6YmctYmx1ZS02MDAgaG92ZXI6dGV4dC13aGl0ZSBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciB0cmFuc2l0aW9uLWNvbG9yc1wiXG4gICAgICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICAgICAge3BsYXlpbmdTYW1wbGUgPT09IHNhbXBsZS5uYW1lID8gPFNxdWFyZSBzaXplPXsxMn0gZmlsbD1cImN1cnJlbnRDb2xvclwiIC8+IDogPFBsYXkgc2l6ZT17MTJ9IGZpbGw9XCJjdXJyZW50Q29sb3JcIiBjbGFzc05hbWU9XCJtbC0wLjVcIiAvPn1cbiAgICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggZmxleC1jb2xcIj5cbiAgICAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cImZvbnQtYm9sZCB0ZXh0LXNsYXRlLTIwMFwiPntzYW1wbGUubmFtZX08L3NwYW4+XG4gICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LVs5cHhdIHRleHQtc2xhdGUtNTAwXCI+S2V5OiB7c2FtcGxlLmtleX0g4oCiIEJQTToge3NhbXBsZS5icG19IOKAoiBMZW46IHtzYW1wbGUuZHVyfTwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTJcIj5cbiAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInctMjQgaC02IGJnLXNsYXRlLTk1MCByb3VuZGVkIGJvcmRlciBib3JkZXItc2xhdGUtODAwIGZsZXggaXRlbXMtY2VudGVyIHB4LTFcIj5cbiAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwidy1mdWxsIGgtMiBiZy1ibHVlLTUwMC8zMCByb3VuZGVkLWZ1bGwgb3ZlcmZsb3ctaGlkZGVuIGZsZXhcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ3LTMvNCBiZy1ibHVlLTQwMCBoLWZ1bGwgcm91bmRlZC1mdWxsIGFuaW1hdGUtcHVsc2VcIiAvPlxuICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgPGJ1dHRvbiBcbiAgICAgICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IGFsZXJ0KGBMb2FkZWQgXCIke3NhbXBsZS5uYW1lfVwiIGludG8gYWN0aXZlIFNhbXBsZXIgcGFkIHNsb3QhYCl9XG4gICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJweC0zIHB5LTEgYmctc2xhdGUtODAwIGhvdmVyOmJnLWJsdWUtNjAwIHRleHQtc2xhdGUtMzAwIGhvdmVyOnRleHQtd2hpdGUgcm91bmRlZCB0ZXh0LVsxMHB4XSBmb250LWJvbGQgdHJhbnNpdGlvbi1jb2xvcnMgY3Vyc29yLXBvaW50ZXJcIlxuICAgICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgICAgIExPQUQgVE8gUEFEXG4gICAgICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgKSlcbiAgICAgICAgICAgKX1cbiAgICAgICAgIDwvZGl2PlxuICAgICAgIDwvZGl2PlxuICAgIDwvZGl2PlxuICApO1xufTtcblxuY29uc3QgUHJlc2V0TWFuYWdlciA9ICh7IHBhZHMsIGJwbSwgbWFzdGVyVm9sdW1lLCBvbkxvYWRQcmVzZXQgfTogeyBwYWRzOiBQYWRbXSwgYnBtOiBudW1iZXIsIG1hc3RlclZvbHVtZTogbnVtYmVyLCBvbkxvYWRQcmVzZXQ6IChzdGF0ZTogeyBwYWRzOiBQYWRbXSwgYnBtOiBudW1iZXIsIG1hc3RlclZvbHVtZTogbnVtYmVyIH0pID0+IHZvaWQgfSkgPT4ge1xuICBjb25zdCBbcHJlc2V0TmFtZSwgc2V0UHJlc2V0TmFtZV0gPSB1c2VTdGF0ZShcIk15IERBVyBQcm9qZWN0XCIpO1xuICBjb25zdCBbc2F2ZWRQcmVzZXRzLCBzZXRTYXZlZFByZXNldHNdID0gdXNlU3RhdGU8QXJyYXk8eyBuYW1lOiBzdHJpbmcsIGRhdGU6IHN0cmluZywgYnBtOiBudW1iZXIsIHBhZHM6IFBhZFtdLCBtYXN0ZXJWb2x1bWU6IG51bWJlciB9Pj4oW10pO1xuICBjb25zdCBbc3RhdHVzTWVzc2FnZSwgc2V0U3RhdHVzTWVzc2FnZV0gPSB1c2VTdGF0ZShcIlwiKTtcbiAgY29uc3QgW2lzUmVjb3JkaW5nQXVkaW8sIHNldElzUmVjb3JkaW5nQXVkaW9dID0gdXNlU3RhdGUoZmFsc2UpO1xuXG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHN0b3JlZCA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKFwicmVtaXhfb3NfcHJlc2V0c192MVwiKTtcbiAgICAgIGlmIChzdG9yZWQpIHtcbiAgICAgICAgc2V0U2F2ZWRQcmVzZXRzKEpTT04ucGFyc2Uoc3RvcmVkKSk7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgY29uc29sZS5lcnJvcihlKTtcbiAgICB9XG4gIH0sIFtdKTtcblxuICBjb25zdCBoYW5kbGVTYXZlUHJlc2V0ID0gKCkgPT4ge1xuICAgIGlmICghcHJlc2V0TmFtZS50cmltKCkpIHJldHVybjtcbiAgICBjb25zdCBuZXdQcmVzZXQgPSB7XG4gICAgICBuYW1lOiBwcmVzZXROYW1lLnRyaW0oKSxcbiAgICAgIGRhdGU6IG5ldyBEYXRlKCkudG9Mb2NhbGVTdHJpbmcoKSxcbiAgICAgIGJwbSxcbiAgICAgIHBhZHMsXG4gICAgICBtYXN0ZXJWb2x1bWVcbiAgICB9O1xuICAgIGNvbnN0IHVwZGF0ZWQgPSBbbmV3UHJlc2V0LCAuLi5zYXZlZFByZXNldHMuZmlsdGVyKHAgPT4gcC5uYW1lICE9PSBuZXdQcmVzZXQubmFtZSldO1xuICAgIHNldFNhdmVkUHJlc2V0cyh1cGRhdGVkKTtcbiAgICB0cnkge1xuICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oXCJyZW1peF9vc19wcmVzZXRzX3YxXCIsIEpTT04uc3RyaW5naWZ5KHVwZGF0ZWQpKTtcbiAgICAgIHNldFN0YXR1c01lc3NhZ2UoYFByZXNldCBcIiR7bmV3UHJlc2V0Lm5hbWV9XCIgc2F2ZWQgc3VjY2Vzc2Z1bGx5IHRvIExvY2FsIFN0b3JhZ2UhYCk7XG4gICAgICBzZXRUaW1lb3V0KCgpID0+IHNldFN0YXR1c01lc3NhZ2UoXCJcIiksIDMwMDApO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoZSk7XG4gICAgICBzZXRTdGF0dXNNZXNzYWdlKFwiRXJyb3Igc2F2aW5nIHRvIExvY2FsIFN0b3JhZ2UuXCIpO1xuICAgIH1cbiAgfTtcblxuICBjb25zdCBoYW5kbGVMb2FkUHJlc2V0ID0gKHByZXNldDogeyBwYWRzOiBQYWRbXSwgYnBtOiBudW1iZXIsIG1hc3RlclZvbHVtZTogbnVtYmVyIH0pID0+IHtcbiAgICBvbkxvYWRQcmVzZXQocHJlc2V0KTtcbiAgICBzZXRTdGF0dXNNZXNzYWdlKFwiUHJlc2V0IGxvYWRlZCBpbnRvIERBVyBzdWNjZXNzZnVsbHkhXCIpO1xuICAgIHNldFRpbWVvdXQoKCkgPT4gc2V0U3RhdHVzTWVzc2FnZShcIlwiKSwgMzAwMCk7XG4gIH07XG5cbiAgY29uc3QgaGFuZGxlRGVsZXRlUHJlc2V0ID0gKG5hbWU6IHN0cmluZykgPT4ge1xuICAgIGNvbnN0IHVwZGF0ZWQgPSBzYXZlZFByZXNldHMuZmlsdGVyKHAgPT4gcC5uYW1lICE9PSBuYW1lKTtcbiAgICBzZXRTYXZlZFByZXNldHModXBkYXRlZCk7XG4gICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oXCJyZW1peF9vc19wcmVzZXRzX3YxXCIsIEpTT04uc3RyaW5naWZ5KHVwZGF0ZWQpKTtcbiAgfTtcblxuICBjb25zdCBoYW5kbGVFeHBvcnRKU09OID0gKCkgPT4ge1xuICAgIGNvbnN0IHByb2plY3RTdGF0ZSA9IHtcbiAgICAgIHZlcnNpb246IFwiMi4wXCIsXG4gICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICAgIGJwbSxcbiAgICAgIG1hc3RlclZvbHVtZSxcbiAgICAgIHBhZHNcbiAgICB9O1xuICAgIGNvbnN0IGJsb2IgPSBuZXcgQmxvYihbSlNPTi5zdHJpbmdpZnkocHJvamVjdFN0YXRlLCBudWxsLCAyKV0sIHsgdHlwZTogJ2FwcGxpY2F0aW9uL2pzb24nIH0pO1xuICAgIGNvbnN0IHVybCA9IFVSTC5jcmVhdGVPYmplY3RVUkwoYmxvYik7XG4gICAgY29uc3QgYSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2EnKTtcbiAgICBhLmhyZWYgPSB1cmw7XG4gICAgYS5kb3dubG9hZCA9IGByZW1peC1vcy1wcm9qZWN0LSR7RGF0ZS5ub3coKX0uanNvbmA7XG4gICAgYS5jbGljaygpO1xuICAgIFVSTC5yZXZva2VPYmplY3RVUkwodXJsKTtcbiAgICBzZXRTdGF0dXNNZXNzYWdlKFwiUHJvamVjdCBleHBvcnRlZCBhcyBKU09OIGZpbGUgc3VjY2Vzc2Z1bGx5IVwiKTtcbiAgICBzZXRUaW1lb3V0KCgpID0+IHNldFN0YXR1c01lc3NhZ2UoXCJcIiksIDMwMDApO1xuICB9O1xuXG4gIGNvbnN0IGhhbmRsZVRvZ2dsZVJlY29yZEF1ZGlvID0gKCkgPT4ge1xuICAgIGlmICghaXNSZWNvcmRpbmdBdWRpbykge1xuICAgICAgc2V0SXNSZWNvcmRpbmdBdWRpbyh0cnVlKTtcbiAgICAgIGF1ZGlvRW5naW5lLnN0YXJ0UmVjb3JkaW5nQXVkaW8oKGJsb2IpID0+IHtcbiAgICAgICAgY29uc3QgdXJsID0gVVJMLmNyZWF0ZU9iamVjdFVSTChibG9iKTtcbiAgICAgICAgY29uc3QgYSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2EnKTtcbiAgICAgICAgYS5ocmVmID0gdXJsO1xuICAgICAgICBhLmRvd25sb2FkID0gYHJlbWl4LW9zLWF1ZGlvLXJlbmRlci0ke0RhdGUubm93KCl9LndlYm1gO1xuICAgICAgICBhLmNsaWNrKCk7XG4gICAgICAgIFVSTC5yZXZva2VPYmplY3RVUkwodXJsKTtcbiAgICAgICAgc2V0U3RhdHVzTWVzc2FnZShcIk1hc3RlciBhdWRpbyByZW5kZXJlZCAmIGRvd25sb2FkZWQgc3VjY2Vzc2Z1bGx5IVwiKTtcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiBzZXRTdGF0dXNNZXNzYWdlKFwiXCIpLCA0MDAwKTtcbiAgICAgIH0pO1xuICAgICAgc2V0U3RhdHVzTWVzc2FnZShcIlJlY29yZGluZyBhdWRpbyBvdXRwdXQuLi4gUGxheSB5b3VyIHRyYWNrcywgdGhlbiBjbGljayAnU3RvcCBBdWRpbyBSZWNvcmRpbmcnLlwiKTtcbiAgICB9IGVsc2Uge1xuICAgICAgc2V0SXNSZWNvcmRpbmdBdWRpbyhmYWxzZSk7XG4gICAgICBhdWRpb0VuZ2luZS5zdG9wUmVjb3JkaW5nQXVkaW8oKTtcbiAgICB9XG4gIH07XG5cbiAgcmV0dXJuIChcbiAgICA8ZGl2IGNsYXNzTmFtZT1cImgtZnVsbCBiZy1zbGF0ZS05MDAgcC02IGZsZXggZmxleC1jb2wgZ2FwLTQgZm9udC1tb25vIHRleHQteHMgdGV4dC1zbGF0ZS0zMDAgb3ZlcmZsb3cteS1hdXRvXCI+XG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXgganVzdGlmeS1iZXR3ZWVuIGl0ZW1zLWNlbnRlciBiZy1zbGF0ZS05NTAgcC0zIHJvdW5kZWQtbGcgYm9yZGVyIGJvcmRlci1zbGF0ZS04MDAgc2hhZG93LW1kXCI+XG4gICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cImZvbnQtYmxhY2sgdHJhY2tpbmctd2lkZXN0IHRleHQtYW1iZXItNDAwIGZsZXggaXRlbXMtY2VudGVyIGdhcC0yXCI+XG4gICAgICAgICAgPEZvbGRlciBzaXplPXsxNn0gLz4gREFXIFBSRVNFVCAmIEVYUE9SVCBNQU5BR0VSXG4gICAgICAgIDwvc3Bhbj5cbiAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwicHgtMiBweS0wLjUgYmctYW1iZXItOTUwIHRleHQtYW1iZXItMzAwIHRleHQtWzEwcHhdIHJvdW5kZWQgYm9yZGVyIGJvcmRlci1hbWJlci05MDBcIj52Mi4wPC9zcGFuPlxuICAgICAgPC9kaXY+XG5cbiAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYmctc2xhdGUtOTUwIHAtNCByb3VuZGVkLXhsIGJvcmRlciBib3JkZXItc2xhdGUtODAwIGZsZXggZmxleC1jb2wgZ2FwLTNcIj5cbiAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1bMTBweF0gdGV4dC1jeWFuLTQwMCBmb250LWJvbGQgdXBwZXJjYXNlIHRyYWNraW5nLXdpZGVyXCI+UFJPSkVDVCAmIEFVRElPIEVYUE9SVFM8L3NwYW4+XG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZ3JpZCBncmlkLWNvbHMtMiBnYXAtMlwiPlxuICAgICAgICAgIDxidXR0b24gXG4gICAgICAgICAgICBvbkNsaWNrPXtoYW5kbGVFeHBvcnRKU09OfVxuICAgICAgICAgICAgY2xhc3NOYW1lPVwicHktMi41IGJnLWN5YW4tNjAwIGhvdmVyOmJnLWN5YW4tNTAwIHRleHQtd2hpdGUgZm9udC1ib2xkIHJvdW5kZWQtbGcgdHJhbnNpdGlvbi1hbGwgc2hhZG93LVswXzBfMTBweF9yZ2JhKDgsMTQ1LDE3OCwwLjMpXSBjdXJzb3ItcG9pbnRlclwiXG4gICAgICAgICAgPlxuICAgICAgICAgICAgRVhQT1JUIEpTT04gRklMRVxuICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgIDxidXR0b24gXG4gICAgICAgICAgICBvbkNsaWNrPXtoYW5kbGVUb2dnbGVSZWNvcmRBdWRpb31cbiAgICAgICAgICAgIGNsYXNzTmFtZT17YHB5LTIuNSBmb250LWJvbGQgcm91bmRlZC1sZyB0cmFuc2l0aW9uLWFsbCBjdXJzb3ItcG9pbnRlciAke2lzUmVjb3JkaW5nQXVkaW8gPyAnYmctcmVkLTYwMCB0ZXh0LXdoaXRlIHNoYWRvdy1bMF8wXzE1cHhfI2RjMjYyNl0gYW5pbWF0ZS1wdWxzZScgOiAnYmctZW1lcmFsZC02MDAgaG92ZXI6YmctZW1lcmFsZC01MDAgdGV4dC13aGl0ZSBzaGFkb3ctWzBfMF8xMHB4X3JnYmEoNSwxNTAsMTA1LDAuMyldJ31gfVxuICAgICAgICAgID5cbiAgICAgICAgICAgIHtpc1JlY29yZGluZ0F1ZGlvID8gJ1NUT1AgUkVDT1JESU5HIEFVRElPJyA6ICdSRU5ERVIgQVVESU8gKFdBVi9XRUJNKSd9XG4gICAgICAgICAgPC9idXR0b24+XG4gICAgICAgIDwvZGl2PlxuICAgICAgPC9kaXY+XG5cbiAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYmctc2xhdGUtOTUwIHAtNCByb3VuZGVkLXhsIGJvcmRlciBib3JkZXItc2xhdGUtODAwIGZsZXggZmxleC1jb2wgZ2FwLTNcIj5cbiAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1bMTBweF0gdGV4dC1hbWJlci00MDAgZm9udC1ib2xkIHVwcGVyY2FzZSB0cmFja2luZy13aWRlclwiPlNBVkUgQ1VSUkVOVCBQUk9KRUNUIFNUQVRFPC9zcGFuPlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggZ2FwLTJcIj5cbiAgICAgICAgICA8aW5wdXQgXG4gICAgICAgICAgICB0eXBlPVwidGV4dFwiIFxuICAgICAgICAgICAgdmFsdWU9e3ByZXNldE5hbWV9IFxuICAgICAgICAgICAgb25DaGFuZ2U9e2UgPT4gc2V0UHJlc2V0TmFtZShlLnRhcmdldC52YWx1ZSl9IFxuICAgICAgICAgICAgcGxhY2Vob2xkZXI9XCJQcmVzZXQgTmFtZS4uLlwiIFxuICAgICAgICAgICAgY2xhc3NOYW1lPVwiZmxleC0xIGJnLXNsYXRlLTkwMCBib3JkZXIgYm9yZGVyLXNsYXRlLTcwMCByb3VuZGVkLWxnIHB4LTMgcHktMiB0ZXh0LXNsYXRlLTEwMCBvdXRsaW5lLW5vbmUgZm9jdXM6Ym9yZGVyLWFtYmVyLTUwMCBmb250LWJvbGRcIlxuICAgICAgICAgIC8+XG4gICAgICAgICAgPGJ1dHRvbiBcbiAgICAgICAgICAgIG9uQ2xpY2s9e2hhbmRsZVNhdmVQcmVzZXR9XG4gICAgICAgICAgICBjbGFzc05hbWU9XCJweC01IHB5LTIgYmctYW1iZXItNjAwIGhvdmVyOmJnLWFtYmVyLTUwMCB0ZXh0LXNsYXRlLTk1MCBmb250LWJsYWNrIHJvdW5kZWQtbGcgdHJhbnNpdGlvbi1hbGwgc2hhZG93LVswXzBfMTJweF9yZ2JhKDI0NSwxNTgsMTEsMC4zKV0gY3Vyc29yLXBvaW50ZXJcIlxuICAgICAgICAgID5cbiAgICAgICAgICAgIFNBVkVcbiAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgPC9kaXY+XG4gICAgICAgIHtzdGF0dXNNZXNzYWdlICYmIChcbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInAtMiBiZy1lbWVyYWxkLTk1MCBib3JkZXIgYm9yZGVyLWVtZXJhbGQtODAwIHRleHQtZW1lcmFsZC00MDAgdGV4dC1bMTBweF0gcm91bmRlZCB0ZXh0LWNlbnRlciBmb250LWJvbGRcIj5cbiAgICAgICAgICAgIHtzdGF0dXNNZXNzYWdlfVxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICApfVxuICAgICAgPC9kaXY+XG5cbiAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleC0xIGZsZXggZmxleC1jb2wgZ2FwLTIgbWluLWgtWzE2MHB4XVwiPlxuICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LVsxMHB4XSB0ZXh0LXNsYXRlLTUwMCBmb250LWJvbGRcIj5TQVZFRCBQUkVTRVRTICh7c2F2ZWRQcmVzZXRzLmxlbmd0aH0pPC9zcGFuPlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXgtMSBiZy1zbGF0ZS05NTAgYm9yZGVyIGJvcmRlci1zbGF0ZS04MDAgcm91bmRlZC14bCBwLTMgZmxleCBmbGV4LWNvbCBnYXAtMiBvdmVyZmxvdy15LWF1dG9cIj5cbiAgICAgICAgICB7c2F2ZWRQcmVzZXRzLmxlbmd0aCA9PT0gMCA/IChcbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwidGV4dC1zbGF0ZS01MDAgdGV4dC1jZW50ZXIgcHktOFwiPk5vIHNhdmVkIHByZXNldHMgZm91bmQgaW4gbG9jYWwgc3RvcmFnZS4gU2F2ZSB5b3VyIHByb2plY3QgYWJvdmUhPC9kaXY+XG4gICAgICAgICAgKSA6IChcbiAgICAgICAgICAgIHNhdmVkUHJlc2V0cy5tYXAoKHAsIGlkeCkgPT4gKFxuICAgICAgICAgICAgICA8ZGl2IGtleT17aWR4fSBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWJldHdlZW4gcC0zIGJnLXNsYXRlLTkwMCBib3JkZXIgYm9yZGVyLXNsYXRlLTgwMCByb3VuZGVkLWxnIGhvdmVyOmJvcmRlci1zbGF0ZS03MDBcIj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggZmxleC1jb2wgZ2FwLTAuNVwiPlxuICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwiZm9udC1ib2xkIHRleHQtc2xhdGUtMjAwXCI+e3AubmFtZX08L3NwYW4+XG4gICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LVs5cHhdIHRleHQtc2xhdGUtNTAwXCI+e3AuZGF0ZX0g4oCiIHtwLmJwbX0gQlBNPC9zcGFuPlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTJcIj5cbiAgICAgICAgICAgICAgICAgIDxidXR0b24gXG4gICAgICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IGhhbmRsZUxvYWRQcmVzZXQocCl9XG4gICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cInB4LTMgcHktMS41IGJnLWN5YW4tNjAwIGhvdmVyOmJnLWN5YW4tNTAwIHRleHQtd2hpdGUgZm9udC1ib2xkIHJvdW5kZWQgdGV4dC1bMTBweF0gdHJhbnNpdGlvbi1jb2xvcnNcIlxuICAgICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICAgICBMT0FEXG4gICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICAgIDxidXR0b24gXG4gICAgICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IGhhbmRsZURlbGV0ZVByZXNldChwLm5hbWUpfVxuICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJweC0zIHB5LTEuNSBiZy1yZWQtNjAwLzIwIGhvdmVyOmJnLXJlZC02MDAgdGV4dC1yZWQtNDAwIGhvdmVyOnRleHQtd2hpdGUgZm9udC1ib2xkIHJvdW5kZWQgdGV4dC1bMTBweF0gdHJhbnNpdGlvbi1jb2xvcnNcIlxuICAgICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICAgICBERUxcbiAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICkpXG4gICAgICAgICAgKX1cbiAgICAgICAgPC9kaXY+XG4gICAgICA8L2Rpdj5cbiAgICA8L2Rpdj5cbiAgKTtcbn07XG5cbmNvbnN0IE1vYmlsZUNvbnRyb2xsZXIgPSAoKSA9PiB7XG4gIGNvbnN0IFttb3Rpb25UaWx0LCBzZXRNb3Rpb25UaWx0XSA9IHVzZVN0YXRlKGZhbHNlKTtcblxuICByZXR1cm4gKFxuICAgIDxkaXYgY2xhc3NOYW1lPVwiaC1mdWxsIGJnLXNsYXRlLTkwMCBwLTYgZmxleCBmbGV4LWNvbCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgZm9udC1tb25vIHRleHQteHNcIj5cbiAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInctNzIgYmctc2xhdGUtOTUwIGJvcmRlci00IGJvcmRlci1zbGF0ZS04MDAgcm91bmRlZC1bMi41cmVtXSBwLTQgZmxleCBmbGV4LWNvbCBnYXAtNCBzaGFkb3ctMnhsIHJlbGF0aXZlIG92ZXJmbG93LWhpZGRlblwiPlxuICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ3LTI0IGgtNCBiZy1zbGF0ZS04MDAgcm91bmRlZC1mdWxsIG14LWF1dG8gbWItMlwiIC8+XG4gICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXgganVzdGlmeS1iZXR3ZWVuIGl0ZW1zLWNlbnRlciBiZy1zbGF0ZS05MDAgcC0zIHJvdW5kZWQteGwgYm9yZGVyIGJvcmRlci1zbGF0ZS04MDBcIj5cbiAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1bMTBweF0gdGV4dC1zbGF0ZS00MDAgZm9udC1ib2xkXCI+UkVNSVggT1MgUkVNT1RFPC9zcGFuPlxuICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ3LTIgaC0yIHJvdW5kZWQtZnVsbCBiZy1lbWVyYWxkLTQwMCBhbmltYXRlLXB1bHNlXCIgLz5cbiAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImdyaWQgZ3JpZC1jb2xzLTIgZ2FwLTJcIj5cbiAgICAgICAgICAgPGJ1dHRvbiBvbkNsaWNrPXsoKSA9PiBhdWRpb0VuZ2luZS5zdGFydCgpfSBjbGFzc05hbWU9XCJweS00IGJnLWN5YW4tNjAwIGhvdmVyOmJnLWN5YW4tNTAwIHRleHQtd2hpdGUgcm91bmRlZC14bCBmb250LWJsYWNrIHNoYWRvdy1bMF8wXzEwcHhfcmdiYSg4LDE0NSwxNzgsMC4zKV1cIj5QTEFZPC9idXR0b24+XG4gICAgICAgICAgIDxidXR0b24gb25DbGljaz17KCkgPT4gYXVkaW9FbmdpbmUuc3RvcCgpfSBjbGFzc05hbWU9XCJweS00IGJnLXNsYXRlLTgwMCBob3ZlcjpiZy1zbGF0ZS03MDAgdGV4dC1zbGF0ZS0zMDAgcm91bmRlZC14bCBmb250LWJsYWNrXCI+U1RPUDwvYnV0dG9uPlxuICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiaC0zMiBiZy1zbGF0ZS05MDAgcm91bmRlZC14bCBib3JkZXIgYm9yZGVyLXNsYXRlLTgwMCByZWxhdGl2ZSBvdmVyZmxvdy1oaWRkZW4gZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgY3Vyc29yLWNyb3NzaGFpclwiPlxuICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImFic29sdXRlIGluc2V0LTAgb3BhY2l0eS0yNSBiZy1bcmFkaWFsLWdyYWRpZW50KGNpcmNsZV9hdF9jZW50ZXIsX3ZhcigtLXR3LWdyYWRpZW50LXN0b3BzKSldIGZyb20tY3lhbi00MDAgdmlhLXRyYW5zcGFyZW50IHRvLXRyYW5zcGFyZW50XCIgLz5cbiAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1bMTBweF0gdGV4dC1zbGF0ZS01MDBcIj5YWSBQRVJGT1JNQU5DRSBQQUQ8L3NwYW4+XG4gICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgPGJ1dHRvbiBcbiAgICAgICAgICAgb25DbGljaz17KCkgPT4gc2V0TW90aW9uVGlsdCghbW90aW9uVGlsdCl9XG4gICAgICAgICAgIGNsYXNzTmFtZT17YHB5LTMgcm91bmRlZC14bCBmb250LWJvbGQgdHJhbnNpdGlvbi1jb2xvcnMgJHttb3Rpb25UaWx0ID8gJ2JnLWVtZXJhbGQtNjAwIHRleHQtd2hpdGUgc2hhZG93LVswXzBfMTBweF8jMDU5NjY5XScgOiAnYmctc2xhdGUtODAwIHRleHQtc2xhdGUtNDAwJ31gfVxuICAgICAgICAgPlxuICAgICAgICAgICB7bW90aW9uVGlsdCA/ICdNT1RJT04gVElMVDogQUNUSVZFJyA6ICdFTkFCTEUgTU9USU9OIFRJTFQnfVxuICAgICAgICAgPC9idXR0b24+XG4gICAgICAgPC9kaXY+XG4gICAgPC9kaXY+XG4gICk7XG59O1xuXG5jb25zdCBMb29wZXIgPSAoKSA9PiB7XG4gIGNvbnN0IFt0cmFja3MsIHNldFRyYWNrc10gPSB1c2VTdGF0ZShbXG4gICAgeyBpZDogMSwgbmFtZTogXCJUcmFjayAxOiBHdWl0YXIgTG9vcFwiLCBzdGF0ZTogXCJwbGF5aW5nXCIsIHZvbDogMC44LCBtdXRlZDogZmFsc2UsIHNvbG9lZDogZmFsc2UgfSxcbiAgICB7IGlkOiAyLCBuYW1lOiBcIlRyYWNrIDI6IFZvY2FsIEhhcm1vbnlcIiwgc3RhdGU6IFwicmVjb3JkaW5nXCIsIHZvbDogMC44NSwgbXV0ZWQ6IGZhbHNlLCBzb2xvZWQ6IGZhbHNlIH0sXG4gICAgeyBpZDogMywgbmFtZTogXCJUcmFjayAzOiBTeW50aCBCYXNzXCIsIHN0YXRlOiBcImlkbGVcIiwgdm9sOiAwLjc1LCBtdXRlZDogdHJ1ZSwgc29sb2VkOiBmYWxzZSB9LFxuICAgIHsgaWQ6IDQsIG5hbWU6IFwiVHJhY2sgNDogUGVyY3Vzc2lvblwiLCBzdGF0ZTogXCJwbGF5aW5nXCIsIHZvbDogMC45LCBtdXRlZDogZmFsc2UsIHNvbG9lZDogZmFsc2UgfSxcbiAgXSk7XG4gIGNvbnN0IFtxdWFudGl6ZSwgc2V0UXVhbnRpemVdID0gdXNlU3RhdGUoXCIyIEJBUlNcIik7XG5cbiAgY29uc3QgdG9nZ2xlVHJhY2tTdGF0ZSA9IChpZDogbnVtYmVyKSA9PiB7XG4gICAgc2V0VHJhY2tzKHByZXYgPT4gcHJldi5tYXAodCA9PiB7XG4gICAgICBpZiAodC5pZCA9PT0gaWQpIHtcbiAgICAgICAgY29uc3QgbmV4dFN0YXRlID0gdC5zdGF0ZSA9PT0gJ3BsYXlpbmcnID8gJ3JlY29yZGluZycgOiB0LnN0YXRlID09PSAncmVjb3JkaW5nJyA/ICdpZGxlJyA6ICdwbGF5aW5nJztcbiAgICAgICAgcmV0dXJuIHsgLi4udCwgc3RhdGU6IG5leHRTdGF0ZSB9O1xuICAgICAgfVxuICAgICAgcmV0dXJuIHQ7XG4gICAgfSkpO1xuICB9O1xuXG4gIHJldHVybiAoXG4gICAgPGRpdiBjbGFzc05hbWU9XCJoLWZ1bGwgYmctc2xhdGUtOTAwIHAtNiBmbGV4IGZsZXgtY29sIGdhcC01IGZvbnQtbW9ubyB0ZXh0LXhzIHRleHQtc2xhdGUtMzAwIG92ZXJmbG93LXktYXV0b1wiPlxuICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBqdXN0aWZ5LWJldHdlZW4gaXRlbXMtY2VudGVyIGJnLXNsYXRlLTk1MCBwLTMgcm91bmRlZC1sZyBib3JkZXIgYm9yZGVyLXNsYXRlLTgwMCBzaGFkb3ctbWRcIj5cbiAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cImZvbnQtYmxhY2sgdHJhY2tpbmctd2lkZXN0IHRleHQtaW5kaWdvLTQwMCBmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMlwiPlxuICAgICAgICAgICA8UmVmcmVzaEN3IHNpemU9ezE2fSAvPiBMSVZFIEFVRElPIExPT1BFUiBTVEFUSU9OXG4gICAgICAgICA8L3NwYW4+XG4gICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0yXCI+XG4gICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtWzEwcHhdIHRleHQtc2xhdGUtNTAwXCI+UVVBTlRJWkU6PC9zcGFuPlxuICAgICAgICAgICB7W1wiMSBCQVJcIiwgXCIyIEJBUlNcIiwgXCI0IEJBUlNcIiwgXCI4IEJBUlNcIl0ubWFwKHEgPT4gKFxuICAgICAgICAgICAgIDxidXR0b24gXG4gICAgICAgICAgICAgICBrZXk9e3F9IFxuICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4gc2V0UXVhbnRpemUocSl9XG4gICAgICAgICAgICAgICBjbGFzc05hbWU9e2BweC0yIHB5LTAuNSByb3VuZGVkIHRleHQtWzEwcHhdIGZvbnQtYm9sZCAke3F1YW50aXplID09PSBxID8gJ2JnLWluZGlnby02MDAgdGV4dC13aGl0ZScgOiAnYmctc2xhdGUtODAwIHRleHQtc2xhdGUtNDAwJ31gfVxuICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgIHtxfVxuICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICApKX1cbiAgICAgICAgIDwvZGl2PlxuICAgICAgIDwvZGl2PlxuXG4gICAgICAgey8qIExvb3BlciBUcmFja3MgKi99XG4gICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGZsZXgtY29sIGdhcC0zXCI+XG4gICAgICAgICB7dHJhY2tzLm1hcCh0cmFjayA9PiAoXG4gICAgICAgICAgIDxkaXYga2V5PXt0cmFjay5pZH0gY2xhc3NOYW1lPVwiYmctc2xhdGUtOTUwIHAtNCByb3VuZGVkLXhsIGJvcmRlciBib3JkZXItc2xhdGUtODAwIGZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktYmV0d2VlbiBnYXAtNFwiPlxuICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTMgdy00OFwiPlxuICAgICAgICAgICAgICAgPGJ1dHRvbiBcbiAgICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4gdG9nZ2xlVHJhY2tTdGF0ZSh0cmFjay5pZCl9XG4gICAgICAgICAgICAgICAgIGNsYXNzTmFtZT17YHctMTAgaC0xMCByb3VuZGVkLXhsIGZvbnQtYmxhY2sgdGV4dC14cyB1cHBlcmNhc2UgZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgdHJhbnNpdGlvbi1hbGwgJHtcbiAgICAgICAgICAgICAgICAgICB0cmFjay5zdGF0ZSA9PT0gJ3JlY29yZGluZycgXG4gICAgICAgICAgICAgICAgICAgICA/ICdiZy1yZWQtNjAwIHRleHQtd2hpdGUgc2hhZG93LVswXzBfMTVweF8jZGMyNjI2XSBhbmltYXRlLXB1bHNlJyBcbiAgICAgICAgICAgICAgICAgICAgIDogdHJhY2suc3RhdGUgPT09ICdwbGF5aW5nJyBcbiAgICAgICAgICAgICAgICAgICAgID8gJ2JnLWluZGlnby02MDAgdGV4dC13aGl0ZSBzaGFkb3ctWzBfMF8xNXB4XyM0ZjQ2ZTVdJyBcbiAgICAgICAgICAgICAgICAgICAgIDogJ2JnLXNsYXRlLTgwMCB0ZXh0LXNsYXRlLTUwMCBob3ZlcjpiZy1zbGF0ZS03MDAnXG4gICAgICAgICAgICAgICAgIH1gfVxuICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICB7dHJhY2suc3RhdGUgPT09ICdyZWNvcmRpbmcnID8gJ1JFQycgOiB0cmFjay5zdGF0ZSA9PT0gJ3BsYXlpbmcnID8gJ1BMQVknIDogJ1NUT1AnfVxuICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggZmxleC1jb2wgdHJ1bmNhdGVcIj5cbiAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwiZm9udC1ib2xkIHRleHQtc2xhdGUtMjAwIHRydW5jYXRlXCI+e3RyYWNrLm5hbWV9PC9zcGFuPlxuICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9e2B0ZXh0LVs5cHhdIHVwcGVyY2FzZSAke3RyYWNrLnN0YXRlID09PSAncmVjb3JkaW5nJyA/ICd0ZXh0LXJlZC00MDAnIDogdHJhY2suc3RhdGUgPT09ICdwbGF5aW5nJyA/ICd0ZXh0LWluZGlnby00MDAnIDogJ3RleHQtc2xhdGUtNTAwJ31gfT5cbiAgICAgICAgICAgICAgICAgICBTdGF0dXM6IHt0cmFjay5zdGF0ZX1cbiAgICAgICAgICAgICAgICAgPC9zcGFuPlxuICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXgtMSBoLTggYmctc2xhdGUtOTAwIHJvdW5kZWQgYm9yZGVyIGJvcmRlci1zbGF0ZS04MDAgZmxleCBpdGVtcy1jZW50ZXIgcHgtMiByZWxhdGl2ZSBvdmVyZmxvdy1oaWRkZW5cIj5cbiAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJzb2x1dGUgaW5zZXQteS0wIGxlZnQtMS8zIHctMC41IGJnLWluZGlnby01MDAgei0xMFwiIC8+XG4gICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInctZnVsbCBmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMC41XCI+XG4gICAgICAgICAgICAgICAgIHtBcnJheS5mcm9tKHtsZW5ndGg6IDQwfSkubWFwKChfLCBpKSA9PiAoXG4gICAgICAgICAgICAgICAgICAgPGRpdiBrZXk9e2l9IGNsYXNzTmFtZT1cImZsZXgtMSBiZy1pbmRpZ28tNTAwLzQwIHJvdW5kZWQtc21cIiBzdHlsZT17eyBoZWlnaHQ6IGAke01hdGguc2luKGkvMikqNDAgKyA1MH0lYCB9fSAvPlxuICAgICAgICAgICAgICAgICApKX1cbiAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMlwiPlxuICAgICAgICAgICAgICAgPGJ1dHRvbiBcbiAgICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4gc2V0VHJhY2tzKHByZXYgPT4gcHJldi5tYXAodCA9PiB0LmlkID09PSB0cmFjay5pZCA/IHsgLi4udCwgbXV0ZWQ6ICF0Lm11dGVkIH0gOiB0KSl9XG4gICAgICAgICAgICAgICAgIGNsYXNzTmFtZT17YHB4LTMgcHktMS41IHJvdW5kZWQgdGV4dC1bMTBweF0gZm9udC1ib2xkICR7dHJhY2subXV0ZWQgPyAnYmctcmVkLTUwMCB0ZXh0LXdoaXRlJyA6ICdiZy1zbGF0ZS04MDAgdGV4dC1zbGF0ZS00MDAnfWB9XG4gICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgIE1cbiAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICAgPGJ1dHRvbiBcbiAgICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4gc2V0VHJhY2tzKHByZXYgPT4gcHJldi5tYXAodCA9PiB0LmlkID09PSB0cmFjay5pZCA/IHsgLi4udCwgc29sb2VkOiAhdC5zb2xvZWQgfSA6IHQpKX1cbiAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPXtgcHgtMyBweS0xLjUgcm91bmRlZCB0ZXh0LVsxMHB4XSBmb250LWJvbGQgJHt0cmFjay5zb2xvZWQgPyAnYmcteWVsbG93LTQwMCB0ZXh0LXNsYXRlLTk1MCcgOiAnYmctc2xhdGUtODAwIHRleHQtc2xhdGUtNDAwJ31gfVxuICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICBTXG4gICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICApKX1cbiAgICAgICA8L2Rpdj5cbiAgICA8L2Rpdj5cbiAgKTtcbn07XG5jb25zdCBTYW1wbGVyID0gKCkgPT4ge1xuICBjb25zdCBbbGF5ZXJzLCBzZXRMYXllcnNdID0gdXNlU3RhdGUoW1xuICAgIHsgaWQ6IDEsIG5hbWU6IFwiVm9jYWxfQ2hvcF9BLndhdlwiLCBsYXllck5hbWU6IFwiTEFZRVIgQSAoVHJhbnNpZW50KVwiLCBsb2FkZWQ6IHRydWUsIGR1cmF0aW9uOiBcIjEuNHNcIiwgdm9sdW1lOiA4NSwgcGl0Y2hPZmZzZXQ6IDAsIHBhbjogMCwgYWN0aXZlOiB0cnVlLCBidWZmZXI6IG51bGwgYXMgQXVkaW9CdWZmZXIgfCBudWxsLCBpc0RyYWdnaW5nOiBmYWxzZSB9LFxuICAgIHsgaWQ6IDIsIG5hbWU6IFwiODA4X1N1Yl9LaWNrLndhdlwiLCBsYXllck5hbWU6IFwiTEFZRVIgQiAoQm9keSlcIiwgbG9hZGVkOiB0cnVlLCBkdXJhdGlvbjogXCIwLjhzXCIsIHZvbHVtZTogOTAsIHBpdGNoT2Zmc2V0OiAwLCBwYW46IC0wLjIsIGFjdGl2ZTogdHJ1ZSwgYnVmZmVyOiBudWxsIGFzIEF1ZGlvQnVmZmVyIHwgbnVsbCwgaXNEcmFnZ2luZzogZmFsc2UgfSxcbiAgICB7IGlkOiAzLCBuYW1lOiBcIlNuYXJlX0NyaXNwLndhdlwiLCBsYXllck5hbWU6IFwiTEFZRVIgQyAoVGV4dHVyZSlcIiwgbG9hZGVkOiB0cnVlLCBkdXJhdGlvbjogXCIwLjVzXCIsIHZvbHVtZTogNzUsIHBpdGNoT2Zmc2V0OiAyLCBwYW46IDAuMiwgYWN0aXZlOiB0cnVlLCBidWZmZXI6IG51bGwgYXMgQXVkaW9CdWZmZXIgfCBudWxsLCBpc0RyYWdnaW5nOiBmYWxzZSB9LFxuICAgIHsgaWQ6IDQsIG5hbWU6IFwiRHJvcF9TeW50aF9TdGFiLndhdlwiLCBsYXllck5hbWU6IFwiTEFZRVIgRCAoRlgpXCIsIGxvYWRlZDogZmFsc2UsIGR1cmF0aW9uOiBcIkVtcHR5XCIsIHZvbHVtZTogNjAsIHBpdGNoT2Zmc2V0OiAwLCBwYW46IDAsIGFjdGl2ZTogZmFsc2UsIGJ1ZmZlcjogbnVsbCBhcyBBdWRpb0J1ZmZlciB8IG51bGwsIGlzRHJhZ2dpbmc6IGZhbHNlIH0sXG4gIF0pO1xuXG4gIGNvbnN0IFthZHNyLCBzZXRBZHNyXSA9IHVzZVN0YXRlKHsgYXR0YWNrOiAxNSwgZGVjYXk6IDQ1LCBzdXN0YWluOiA3MCwgcmVsZWFzZTogNTAgfSk7XG4gIGNvbnN0IFthY3RpdmVLZXlzLCBzZXRBY3RpdmVLZXlzXSA9IHVzZVN0YXRlPG51bWJlcltdPihbXSk7XG4gIGNvbnN0IGZpbGVJbnB1dFJlZnMgPSB1c2VSZWY8KEhUTUxJbnB1dEVsZW1lbnQgfCBudWxsKVtdPihbXSk7XG5cbiAgY29uc3QgaGFuZGxlQWRzckNoYW5nZSA9IChwYXJhbTogJ2F0dGFjaycgfCAnZGVjYXknIHwgJ3N1c3RhaW4nIHwgJ3JlbGVhc2UnLCB2YWw6IG51bWJlcikgPT4ge1xuICAgIGNvbnN0IHVwZGF0ZWQgPSB7IC4uLmFkc3IsIFtwYXJhbV06IHZhbCB9O1xuICAgIHNldEFkc3IodXBkYXRlZCk7XG4gICAgYXVkaW9FbmdpbmUuc2V0QURTUihwYXJhbSwgdmFsKTtcbiAgfTtcblxuICBjb25zdCBoYW5kbGVGaWxlVXBsb2FkID0gYXN5bmMgKGluZGV4OiBudW1iZXIsIGZpbGU6IEZpbGUpID0+IHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgYXJyYXlCdWZmZXIgPSBhd2FpdCBmaWxlLmFycmF5QnVmZmVyKCk7XG4gICAgICBjb25zdCBkZWNvZGVkQnVmZmVyID0gYXdhaXQgYXVkaW9FbmdpbmUuZGVjb2RlQXVkaW9EYXRhKGFycmF5QnVmZmVyKTtcbiAgICAgIGNvbnN0IGR1cmF0aW9uU3RyID0gZGVjb2RlZEJ1ZmZlciA/IGAke2RlY29kZWRCdWZmZXIuZHVyYXRpb24udG9GaXhlZCgxKX1zYCA6IFwiTG9hZGVkXCI7XG4gICAgICBcbiAgICAgIHNldExheWVycyhwcmV2ID0+IHByZXYubWFwKChsLCBpKSA9PiB7XG4gICAgICAgIGlmIChpID09PSBpbmRleCkge1xuICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAuLi5sLFxuICAgICAgICAgICAgbmFtZTogZmlsZS5uYW1lLFxuICAgICAgICAgICAgbG9hZGVkOiB0cnVlLFxuICAgICAgICAgICAgZHVyYXRpb246IGR1cmF0aW9uU3RyLFxuICAgICAgICAgICAgYnVmZmVyOiBkZWNvZGVkQnVmZmVyLFxuICAgICAgICAgICAgYWN0aXZlOiB0cnVlXG4gICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbDtcbiAgICAgIH0pKTtcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoXCJGYWlsZWQgdG8gbG9hZCBzYW1wbGU6XCIsIGVycik7XG4gICAgfVxuICB9O1xuXG4gIGNvbnN0IGhhbmRsZURyb3AgPSAoaW5kZXg6IG51bWJlciwgZTogUmVhY3QuRHJhZ0V2ZW50KSA9PiB7XG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgc2V0TGF5ZXJzKHByZXYgPT4gcHJldi5tYXAoKGwsIGkpID0+IGkgPT09IGluZGV4ID8geyAuLi5sLCBpc0RyYWdnaW5nOiBmYWxzZSB9IDogbCkpO1xuICAgIGlmIChlLmRhdGFUcmFuc2Zlci5maWxlcyAmJiBlLmRhdGFUcmFuc2Zlci5maWxlc1swXSkge1xuICAgICAgaGFuZGxlRmlsZVVwbG9hZChpbmRleCwgZS5kYXRhVHJhbnNmZXIuZmlsZXNbMF0pO1xuICAgIH1cbiAgfTtcblxuICBjb25zdCBoYW5kbGVEcmFnT3ZlciA9IChpbmRleDogbnVtYmVyLCBlOiBSZWFjdC5EcmFnRXZlbnQpID0+IHtcbiAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICBzZXRMYXllcnMocHJldiA9PiBwcmV2Lm1hcCgobCwgaSkgPT4gaSA9PT0gaW5kZXggPyB7IC4uLmwsIGlzRHJhZ2dpbmc6IHRydWUgfSA6IGwpKTtcbiAgfTtcblxuICBjb25zdCBoYW5kbGVEcmFnTGVhdmUgPSAoaW5kZXg6IG51bWJlciwgZTogUmVhY3QuRHJhZ0V2ZW50KSA9PiB7XG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgc2V0TGF5ZXJzKHByZXYgPT4gcHJldi5tYXAoKGwsIGkpID0+IGkgPT09IGluZGV4ID8geyAuLi5sLCBpc0RyYWdnaW5nOiBmYWxzZSB9IDogbCkpO1xuICB9O1xuXG4gIGNvbnN0IHVwZGF0ZUxheWVyUGFyYW0gPSAoaW5kZXg6IG51bWJlciwgcGFyYW06IHN0cmluZywgdmFsOiBhbnkpID0+IHtcbiAgICBzZXRMYXllcnMocHJldiA9PiBwcmV2Lm1hcCgobCwgaSkgPT4gaSA9PT0gaW5kZXggPyB7IC4uLmwsIFtwYXJhbV06IHZhbCB9IDogbCkpO1xuICB9O1xuXG4gIGNvbnN0IG5vdGVzID0gW1xuICAgIHsgbmFtZTogXCJDM1wiLCBmcmVxOiAxMzAuODEsIGlzQmxhY2s6IGZhbHNlIH0sXG4gICAgeyBuYW1lOiBcIkMjM1wiLCBmcmVxOiAxMzguNTksIGlzQmxhY2s6IHRydWUgfSxcbiAgICB7IG5hbWU6IFwiRDNcIiwgZnJlcTogMTQ2LjgzLCBpc0JsYWNrOiBmYWxzZSB9LFxuICAgIHsgbmFtZTogXCJEIzNcIiwgZnJlcTogMTU1LjU2LCBpc0JsYWNrOiB0cnVlIH0sXG4gICAgeyBuYW1lOiBcIkUzXCIsIGZyZXE6IDE2NC44MSwgaXNCbGFjazogZmFsc2UgfSxcbiAgICB7IG5hbWU6IFwiRjNcIiwgZnJlcTogMTc0LjYxLCBpc0JsYWNrOiBmYWxzZSB9LFxuICAgIHsgbmFtZTogXCJGIzNcIiwgZnJlcTogMTg1LjAwLCBpc0JsYWNrOiB0cnVlIH0sXG4gICAgeyBuYW1lOiBcIkczXCIsIGZyZXE6IDE5Ni4wMCwgaXNCbGFjazogZmFsc2UgfSxcbiAgICB7IG5hbWU6IFwiRyMzXCIsIGZyZXE6IDIwNy42NSwgaXNCbGFjazogdHJ1ZSB9LFxuICAgIHsgbmFtZTogXCJBM1wiLCBmcmVxOiAyMjAuMDAsIGlzQmxhY2s6IGZhbHNlIH0sXG4gICAgeyBuYW1lOiBcIkEjM1wiLCBmcmVxOiAyMzMuMDgsIGlzQmxhY2s6IHRydWUgfSxcbiAgICB7IG5hbWU6IFwiQjNcIiwgZnJlcTogMjQ2Ljk0LCBpc0JsYWNrOiBmYWxzZSB9LFxuICAgIHsgbmFtZTogXCJDNFwiLCBmcmVxOiAyNjEuNjMsIGlzQmxhY2s6IGZhbHNlIH0sXG4gICAgeyBuYW1lOiBcIkMjNFwiLCBmcmVxOiAyNzcuMTgsIGlzQmxhY2s6IHRydWUgfSxcbiAgICB7IG5hbWU6IFwiRDRcIiwgZnJlcTogMjkzLjY2LCBpc0JsYWNrOiBmYWxzZSB9LFxuICAgIHsgbmFtZTogXCJEIzRcIiwgZnJlcTogMzExLjEzLCBpc0JsYWNrOiB0cnVlIH0sXG4gICAgeyBuYW1lOiBcIkU0XCIsIGZyZXE6IDMyOS42MywgaXNCbGFjazogZmFsc2UgfSxcbiAgICB7IG5hbWU6IFwiRjRcIiwgZnJlcTogMzQ5LjIzLCBpc0JsYWNrOiBmYWxzZSB9LFxuICAgIHsgbmFtZTogXCJGIzRcIiwgZnJlcTogMzY5Ljk5LCBpc0JsYWNrOiB0cnVlIH0sXG4gICAgeyBuYW1lOiBcIkc0XCIsIGZyZXE6IDM5Mi4wMCwgaXNCbGFjazogZmFsc2UgfSxcbiAgICB7IG5hbWU6IFwiRyM0XCIsIGZyZXE6IDQxNS4zMCwgaXNCbGFjazogdHJ1ZSB9LFxuICAgIHsgbmFtZTogXCJBNFwiLCBmcmVxOiA0NDAuMDAsIGlzQmxhY2s6IGZhbHNlIH0sXG4gICAgeyBuYW1lOiBcIkEjNFwiLCBmcmVxOiA0NjYuMTYsIGlzQmxhY2s6IHRydWUgfSxcbiAgICB7IG5hbWU6IFwiQjRcIiwgZnJlcTogNDkzLjg4LCBpc0JsYWNrOiBmYWxzZSB9XG4gIF07XG5cbiAgY29uc3QgdHJpZ2dlck5vdGUgPSAobm90ZUluZGV4OiBudW1iZXIsIGZyZXE6IG51bWJlcikgPT4ge1xuICAgIHNldEFjdGl2ZUtleXMocHJldiA9PiBbLi4ucHJldiwgbm90ZUluZGV4XSk7XG4gICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICBzZXRBY3RpdmVLZXlzKHByZXYgPT4gcHJldi5maWx0ZXIoayA9PiBrICE9PSBub3RlSW5kZXgpKTtcbiAgICB9LCAzMDApO1xuXG4gICAgY29uc3QgbGF5ZXJTcGVjcyA9IGxheWVycy5tYXAobCA9PiAoe1xuICAgICAgYnVmZmVyOiBsLmJ1ZmZlcixcbiAgICAgIHZvbHVtZTogKGwudm9sdW1lIC8gMTAwKSAqIChsLmFjdGl2ZSA/IDEgOiAwKSxcbiAgICAgIHBpdGNoT2Zmc2V0OiBsLnBpdGNoT2Zmc2V0LFxuICAgICAgcGFuOiBsLnBhbixcbiAgICAgIGFjdGl2ZTogbC5hY3RpdmVcbiAgICB9KSk7XG5cbiAgICBhdWRpb0VuZ2luZS50cmlnZ2VyUG9seVZvaWNlKGZyZXEsIGxheWVyU3BlY3MsIGFkc3IpO1xuICB9O1xuXG4gIGNvbnN0IGdldEFkc3JTdmdQYXRoID0gKCkgPT4ge1xuICAgIGNvbnN0IGEgPSAoYWRzci5hdHRhY2sgLyAxMDApICogNjA7XG4gICAgY29uc3QgZCA9IChhZHNyLmRlY2F5IC8gMTAwKSAqIDYwO1xuICAgIGNvbnN0IHMgPSA1MCAtIChhZHNyLnN1c3RhaW4gLyAxMDApICogNDA7XG4gICAgY29uc3QgciA9IChhZHNyLnJlbGVhc2UgLyAxMDApICogODA7XG5cbiAgICBjb25zdCBzdGFydFggPSAxMDtcbiAgICBjb25zdCBhdHRhY2tYID0gc3RhcnRYICsgYTtcbiAgICBjb25zdCBkZWNheVggPSBhdHRhY2tYICsgZDtcbiAgICBjb25zdCBzdXN0YWluWCA9IGRlY2F5WCArIDQwO1xuICAgIGNvbnN0IHJlbGVhc2VYID0gc3VzdGFpblggKyByO1xuXG4gICAgcmV0dXJuIGBNICR7c3RhcnRYfSA1MCBMICR7YXR0YWNrWH0gMTAgTCAke2RlY2F5WH0gJHtzfSBMICR7c3VzdGFpblh9ICR7c30gTCAke3JlbGVhc2VYfSA1MGA7XG4gIH07XG5cbiAgcmV0dXJuIChcbiAgICA8ZGl2IGNsYXNzTmFtZT1cImgtZnVsbCBiZy1zbGF0ZS05MDAgcC01IGZsZXggZmxleC1jb2wgZ2FwLTQgZm9udC1tb25vIHRleHQteHMgdGV4dC1zbGF0ZS0zMDAgb3ZlcmZsb3cteS1hdXRvXCI+XG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXgganVzdGlmeS1iZXR3ZWVuIGl0ZW1zLWNlbnRlciBiZy1zbGF0ZS05NTAgcC0zIHJvdW5kZWQtbGcgYm9yZGVyIGJvcmRlci1zbGF0ZS04MDAgc2hhZG93LW1kXCI+XG4gICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cImZvbnQtYmxhY2sgdHJhY2tpbmctd2lkZXN0IHRleHQtdGVhbC00MDAgZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTJcIj5cbiAgICAgICAgICA8TXVzaWMgc2l6ZT17MTZ9IC8+IFBPTFlQSE9OSUMgTVVMVEktU0FNUExFIExBWUVSIEVOR0lORVxuICAgICAgICA8L3NwYW4+XG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTJcIj5cbiAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJweC0yIHB5LTAuNSBiZy10ZWFsLTk1MCB0ZXh0LXRlYWwtMzAwIHRleHQtWzEwcHhdIHJvdW5kZWQgYm9yZGVyIGJvcmRlci10ZWFsLTgwMCBmb250LWJvbGRcIj5cbiAgICAgICAgICAgIDQtTEFZRVIgUE9MWVBIT05JQ1xuICAgICAgICAgIDwvc3Bhbj5cbiAgICAgICAgPC9kaXY+XG4gICAgICA8L2Rpdj5cblxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJncmlkIGdyaWQtY29scy0yIGdhcC0zXCI+XG4gICAgICAgIHtsYXllcnMubWFwKChsYXllciwgaWR4KSA9PiAoXG4gICAgICAgICAgPGRpdlxuICAgICAgICAgICAga2V5PXtsYXllci5pZH1cbiAgICAgICAgICAgIG9uRHJhZ092ZXI9eyhlKSA9PiBoYW5kbGVEcmFnT3ZlcihpZHgsIGUpfVxuICAgICAgICAgICAgb25EcmFnTGVhdmU9eyhlKSA9PiBoYW5kbGVEcmFnTGVhdmUoaWR4LCBlKX1cbiAgICAgICAgICAgIG9uRHJvcD17KGUpID0+IGhhbmRsZURyb3AoaWR4LCBlKX1cbiAgICAgICAgICAgIGNsYXNzTmFtZT17YHAtMyByb3VuZGVkLXhsIGJvcmRlciB0cmFuc2l0aW9uLWFsbCBmbGV4IGZsZXgtY29sIGdhcC0yIHJlbGF0aXZlICR7XG4gICAgICAgICAgICAgIGxheWVyLmlzRHJhZ2dpbmdcbiAgICAgICAgICAgICAgICA/ICdiZy10ZWFsLTk1MC84MCBib3JkZXItdGVhbC00MDAgc2hhZG93LVswXzBfMjBweF8jMmRkNGJmXSdcbiAgICAgICAgICAgICAgICA6IGxheWVyLmFjdGl2ZVxuICAgICAgICAgICAgICAgID8gJ2JnLXNsYXRlLTk1MCBib3JkZXItc2xhdGUtODAwIGhvdmVyOmJvcmRlci1zbGF0ZS03MDAnXG4gICAgICAgICAgICAgICAgOiAnYmctc2xhdGUtOTUwLzUwIGJvcmRlci1zbGF0ZS05MDAgb3BhY2l0eS03MCdcbiAgICAgICAgICAgIH1gfVxuICAgICAgICAgID5cbiAgICAgICAgICAgIDxpbnB1dFxuICAgICAgICAgICAgICB0eXBlPVwiZmlsZVwiXG4gICAgICAgICAgICAgIGFjY2VwdD1cImF1ZGlvLypcIlxuICAgICAgICAgICAgICByZWY9e2VsID0+IHsgZmlsZUlucHV0UmVmcy5jdXJyZW50W2lkeF0gPSBlbDsgfX1cbiAgICAgICAgICAgICAgY2xhc3NOYW1lPVwiaGlkZGVuXCJcbiAgICAgICAgICAgICAgb25DaGFuZ2U9eyhlKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGUudGFyZ2V0LmZpbGVzICYmIGUudGFyZ2V0LmZpbGVzWzBdKSB7XG4gICAgICAgICAgICAgICAgICBoYW5kbGVGaWxlVXBsb2FkKGlkeCwgZS50YXJnZXQuZmlsZXNbMF0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfX1cbiAgICAgICAgICAgIC8+XG5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBqdXN0aWZ5LWJldHdlZW4gaXRlbXMtY2VudGVyXCI+XG4gICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtWzEwcHhdIHRleHQtdGVhbC00MDAgZm9udC1ib2xkXCI+e2xheWVyLmxheWVyTmFtZX08L3NwYW4+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTEuNVwiPlxuICAgICAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHVwZGF0ZUxheWVyUGFyYW0oaWR4LCAnYWN0aXZlJywgIWxheWVyLmFjdGl2ZSl9XG4gICAgICAgICAgICAgICAgICBjbGFzc05hbWU9e2BweC0xLjUgcHktMC41IHJvdW5kZWQgdGV4dC1bOXB4XSBmb250LWJvbGQgdXBwZXJjYXNlIHRyYW5zaXRpb24tY29sb3JzICR7XG4gICAgICAgICAgICAgICAgICAgIGxheWVyLmFjdGl2ZSA/ICdiZy10ZWFsLTYwMCB0ZXh0LXdoaXRlJyA6ICdiZy1zbGF0ZS04MDAgdGV4dC1zbGF0ZS01MDAnXG4gICAgICAgICAgICAgICAgICB9YH1cbiAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgICB7bGF5ZXIuYWN0aXZlID8gJ09OJyA6ICdNVVRFJ31cbiAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9e2B0ZXh0LVs5cHhdIHB4LTEuNSBweS0wLjUgcm91bmRlZCAke2xheWVyLmxvYWRlZCA/ICdiZy10ZWFsLTk1MCB0ZXh0LXRlYWwtNDAwIGJvcmRlciBib3JkZXItdGVhbC05MDAnIDogJ2JnLXNsYXRlLTgwMCB0ZXh0LXNsYXRlLTUwMCd9YH0+XG4gICAgICAgICAgICAgICAgICB7bGF5ZXIuZHVyYXRpb259XG4gICAgICAgICAgICAgICAgPC9zcGFuPlxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktYmV0d2VlbiBiZy1zbGF0ZS05MDAgcC0yIHJvdW5kZWQgYm9yZGVyIGJvcmRlci1zbGF0ZS04MDBcIj5cbiAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwiZm9udC1ib2xkIHRleHQtc2xhdGUtMjAwIHRydW5jYXRlIG1heC13LVsxNjBweF0gdGV4dC1bMTFweF1cIj57bGF5ZXIubmFtZX08L3NwYW4+XG4gICAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBmaWxlSW5wdXRSZWZzLmN1cnJlbnRbaWR4XT8uY2xpY2soKX1cbiAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJweC0yIHB5LTEgYmctdGVhbC05NTAgaG92ZXI6YmctdGVhbC05MDAgYm9yZGVyIGJvcmRlci10ZWFsLTgwMCB0ZXh0LXRlYWwtMzAwIHRleHQtWzlweF0gZm9udC1ib2xkIHJvdW5kZWQgdHJhbnNpdGlvbi1jb2xvcnNcIlxuICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgQlJPV1NFXG4gICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgIDxkaXZcbiAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4gZmlsZUlucHV0UmVmcy5jdXJyZW50W2lkeF0/LmNsaWNrKCl9XG4gICAgICAgICAgICAgIGNsYXNzTmFtZT1cInRleHQtWzlweF0gdGV4dC1zbGF0ZS01MDAgdGV4dC1jZW50ZXIgYm9yZGVyIGJvcmRlci1kYXNoZWQgYm9yZGVyLXNsYXRlLTgwMCBob3Zlcjpib3JkZXItdGVhbC01MDAvNTAgcm91bmRlZCBweS0xIGN1cnNvci1wb2ludGVyIHRyYW5zaXRpb24tY29sb3JzXCJcbiAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgRHJhZyAmIERyb3AgbG9jYWwgYXVkaW8gc2FtcGxlIGhlcmVcbiAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImdyaWQgZ3JpZC1jb2xzLTMgZ2FwLTEgcHQtMSBib3JkZXItdCBib3JkZXItc2xhdGUtOTAwXCI+XG4gICAgICAgICAgICAgIDxLbm9iXG4gICAgICAgICAgICAgICAgbGFiZWw9XCJWT0xcIlxuICAgICAgICAgICAgICAgIHZhbHVlPXtsYXllci52b2x1bWV9XG4gICAgICAgICAgICAgICAgY29sb3I9XCJ0ZWFsXCJcbiAgICAgICAgICAgICAgICBvbkNoYW5nZT17KHYpID0+IHVwZGF0ZUxheWVyUGFyYW0oaWR4LCAndm9sdW1lJywgdil9XG4gICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICAgIDxLbm9iXG4gICAgICAgICAgICAgICAgbGFiZWw9XCJQSVRDSFwiXG4gICAgICAgICAgICAgICAgdmFsdWU9eygobGF5ZXIucGl0Y2hPZmZzZXQgKyAxMikgLyAyNCkgKiAxMDB9XG4gICAgICAgICAgICAgICAgY29sb3I9XCJ0ZWFsXCJcbiAgICAgICAgICAgICAgICBvbkNoYW5nZT17KHYpID0+IHVwZGF0ZUxheWVyUGFyYW0oaWR4LCAncGl0Y2hPZmZzZXQnLCBNYXRoLnJvdW5kKCh2IC8gMTAwKSAqIDI0IC0gMTIpKX1cbiAgICAgICAgICAgICAgLz5cbiAgICAgICAgICAgICAgPEtub2JcbiAgICAgICAgICAgICAgICBsYWJlbD1cIlBBTlwiXG4gICAgICAgICAgICAgICAgdmFsdWU9eygobGF5ZXIucGFuICsgMSkgLyAyKSAqIDEwMH1cbiAgICAgICAgICAgICAgICBjb2xvcj1cInRlYWxcIlxuICAgICAgICAgICAgICAgIG9uQ2hhbmdlPXsodikgPT4gdXBkYXRlTGF5ZXJQYXJhbShpZHgsICdwYW4nLCAodiAvIDEwMCkgKiAyIC0gMSl9XG4gICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgKSl9XG4gICAgICA8L2Rpdj5cblxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJiZy1zbGF0ZS05NTAgcC00IHJvdW5kZWQteGwgYm9yZGVyIGJvcmRlci1zbGF0ZS04MDAgZmxleCBmbGV4LWNvbCBnYXAtM1wiPlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXgganVzdGlmeS1iZXR3ZWVuIGl0ZW1zLWNlbnRlciBib3JkZXItYiBib3JkZXItc2xhdGUtODAwIHBiLTJcIj5cbiAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LVsxMHB4XSB0ZXh0LXRlYWwtNDAwIGZvbnQtYm9sZCB0cmFja2luZy13aWRlc3RcIj5ERVRBSUxFRCBBRFNSIEFNUExJVFVERSBFTlZFTE9QRTwvc3Bhbj5cbiAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LVs5cHhdIHRleHQtc2xhdGUtNTAwIGZvbnQtbW9ub1wiPlxuICAgICAgICAgICAgQToge2Fkc3IuYXR0YWNrICogMTV9bXMgfCBEOiB7YWRzci5kZWNheSAqIDE1fW1zIHwgUzoge2Fkc3Iuc3VzdGFpbn0lIHwgUjoge2Fkc3IucmVsZWFzZSAqIDI1fW1zXG4gICAgICAgICAgPC9zcGFuPlxuICAgICAgICA8L2Rpdj5cblxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggZ2FwLTQgaXRlbXMtY2VudGVyXCI+XG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ3LTQ4IGgtMjAgYmctc2xhdGUtOTAwLzkwIHJvdW5kZWQtbGcgYm9yZGVyIGJvcmRlci1zbGF0ZS04MDAgcmVsYXRpdmUgb3ZlcmZsb3ctaGlkZGVuIGZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyXCI+XG4gICAgICAgICAgICA8c3ZnIGNsYXNzTmFtZT1cInctZnVsbCBoLWZ1bGwgcC0yXCIgdmlld0JveD1cIjAgMCAyNDAgNjBcIj5cbiAgICAgICAgICAgICAgPHBhdGggZD1cIk0gMCA1MCBMIDI0MCA1MFwiIHN0cm9rZT1cIiMxZTI5M2JcIiBzdHJva2VXaWR0aD1cIjFcIiAvPlxuICAgICAgICAgICAgICA8cGF0aFxuICAgICAgICAgICAgICAgIGQ9e2dldEFkc3JTdmdQYXRoKCl9XG4gICAgICAgICAgICAgICAgZmlsbD1cIm5vbmVcIlxuICAgICAgICAgICAgICAgIHN0cm9rZT1cIiMyZGQ0YmZcIlxuICAgICAgICAgICAgICAgIHN0cm9rZVdpZHRoPVwiMi41XCJcbiAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJkcm9wLXNoYWRvdy1bMF8wXzhweF8jMmRkNGJmXVwiXG4gICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICA8L3N2Zz5cbiAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleC0xIGZsZXgganVzdGlmeS1hcm91bmQgaXRlbXMtY2VudGVyXCI+XG4gICAgICAgICAgICA8S25vYiBsYWJlbD1cIkFUVEFDS1wiIHZhbHVlPXthZHNyLmF0dGFja30gY29sb3I9XCJlbWVyYWxkXCIgb25DaGFuZ2U9eyh2KSA9PiBoYW5kbGVBZHNyQ2hhbmdlKCdhdHRhY2snLCB2KX0gLz5cbiAgICAgICAgICAgIDxLbm9iIGxhYmVsPVwiREVDQVlcIiB2YWx1ZT17YWRzci5kZWNheX0gY29sb3I9XCJ0ZWFsXCIgb25DaGFuZ2U9eyh2KSA9PiBoYW5kbGVBZHNyQ2hhbmdlKCdkZWNheScsIHYpfSAvPlxuICAgICAgICAgICAgPEtub2IgbGFiZWw9XCJTVVNUQUlOXCIgdmFsdWU9e2Fkc3Iuc3VzdGFpbn0gY29sb3I9XCJ0ZWFsXCIgb25DaGFuZ2U9eyh2KSA9PiBoYW5kbGVBZHNyQ2hhbmdlKCdzdXN0YWluJywgdil9IC8+XG4gICAgICAgICAgICA8S25vYiBsYWJlbD1cIlJFTEVBU0VcIiB2YWx1ZT17YWRzci5yZWxlYXNlfSBjb2xvcj1cInRlYWxcIiBvbkNoYW5nZT17KHYpID0+IGhhbmRsZUFkc3JDaGFuZ2UoJ3JlbGVhc2UnLCB2KX0gLz5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgPC9kaXY+XG4gICAgICA8L2Rpdj5cblxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJiZy1zbGF0ZS05NTAgcC00IHJvdW5kZWQteGwgYm9yZGVyIGJvcmRlci1zbGF0ZS04MDAgZmxleCBmbGV4LWNvbCBnYXAtMlwiPlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXgganVzdGlmeS1iZXR3ZWVuIGl0ZW1zLWNlbnRlciB0ZXh0LVsxMHB4XSB0ZXh0LXNsYXRlLTQwMCBmb250LWJvbGRcIj5cbiAgICAgICAgICA8c3Bhbj5QT0xZUEhPTklDIFBMQVlCQUNLIEtFWUJPQVJEPC9zcGFuPlxuICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtdGVhbC00MDBcIj5NVUxUSS1OT1RFIFBPTFlQSE9OWSBBQ1RJVkU8L3NwYW4+XG4gICAgICAgIDwvZGl2PlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImgtMjAgZmxleCByZWxhdGl2ZSBiZy1zbGF0ZS05MDAgcm91bmRlZC1sZyBwLTEgb3ZlcmZsb3cteC1hdXRvIHNlbGVjdC1ub25lXCI+XG4gICAgICAgICAge25vdGVzLm1hcCgobm90ZSwgaWR4KSA9PiB7XG4gICAgICAgICAgICBjb25zdCBpc0FjdGl2ZSA9IGFjdGl2ZUtleXMuaW5jbHVkZXMoaWR4KTtcbiAgICAgICAgICAgIGlmICghbm90ZS5pc0JsYWNrKSB7XG4gICAgICAgICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgICAga2V5PXtpZHh9XG4gICAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiB0cmlnZ2VyTm90ZShpZHgsIG5vdGUuZnJlcSl9XG4gICAgICAgICAgICAgICAgICBjbGFzc05hbWU9e2BmbGV4LTEgbWluLXctWzI0cHhdIGgtZnVsbCByb3VuZGVkLWIgdHJhbnNpdGlvbi1hbGwgYm9yZGVyIGJvcmRlci1zbGF0ZS0zMDAvNDAgcmVsYXRpdmUgZmxleCBmbGV4LWNvbCBqdXN0aWZ5LWVuZCBwLTEgdGV4dC1bOHB4XSBmb250LWJvbGQgJHtcbiAgICAgICAgICAgICAgICAgICAgaXNBY3RpdmUgPyAnYmctdGVhbC00MDAgdGV4dC1zbGF0ZS05NTAgc2hhZG93LVswXzBfMTJweF8jMmRkNGJmXScgOiAnYmctc2xhdGUtMTAwIHRleHQtc2xhdGUtNzAwIGhvdmVyOmJnLXdoaXRlJ1xuICAgICAgICAgICAgICAgICAgfWB9XG4gICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICAgPHNwYW4+e25vdGUubmFtZX08L3NwYW4+XG4gICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgICAgIGtleT17aWR4fVxuICAgICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4gdHJpZ2dlck5vdGUoaWR4LCBub3RlLmZyZXEpfVxuICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPXtgdy00IGgtMTEgYmctc2xhdGUtOTAwIGJvcmRlciBib3JkZXItc2xhdGUtNzAwIHJvdW5kZWQtYiBhYnNvbHV0ZSB6LTEwIC1tbC0yIHRyYW5zaXRpb24tYWxsICR7XG4gICAgICAgICAgICAgICAgICAgIGlzQWN0aXZlID8gJ2JnLXRlYWwtNDAwIHNoYWRvdy1bMF8wXzEycHhfIzJkZDRiZl0nIDogJ2hvdmVyOmJnLXNsYXRlLTgwMCdcbiAgICAgICAgICAgICAgICAgIH1gfVxuICAgICAgICAgICAgICAgICAgc3R5bGU9e3sgbGVmdDogYCR7KGlkeCAqIDMuOCl9JWAgfX1cbiAgICAgICAgICAgICAgICAvPlxuICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pfVxuICAgICAgICA8L2Rpdj5cbiAgICAgIDwvZGl2PlxuICAgIDwvZGl2PlxuICApO1xufTtcblxuY29uc3QgUGFyYW1ldHJpY0VRID0gKCkgPT4ge1xuICBjb25zdCBbYmFuZHMsIHNldEJhbmRzXSA9IHVzZVN0YXRlKFtcbiAgICB7IG5hbWU6IFwiQkFORCAxIChMT1cpXCIsIGZyZXE6IDIwLCBnYWluOiA1MCwgcTogNjAsIGNvbG9yOiBcImVtZXJhbGRcIiB9LFxuICAgIHsgbmFtZTogXCJCQU5EIDIgKE1JRC1MT1cpXCIsIGZyZXE6IDQwLCBnYWluOiA0NSwgcTogNTAsIGNvbG9yOiBcImN5YW5cIiB9LFxuICAgIHsgbmFtZTogXCJCQU5EIDMgKE1JRC1ISUdIKVwiLCBmcmVxOiA2NSwgZ2FpbjogNTUsIHE6IDcwLCBjb2xvcjogXCJ2aW9sZXRcIiB9LFxuICAgIHsgbmFtZTogXCJCQU5EIDQgKEhJR0gpXCIsIGZyZXE6IDg1LCBnYWluOiA1MCwgcTogNDAsIGNvbG9yOiBcImFtYmVyXCIgfSxcbiAgXSk7XG5cbiAgY29uc3QgW3NwZWN0cnVtRGF0YSwgc2V0U3BlY3RydW1EYXRhXSA9IHVzZVN0YXRlPG51bWJlcltdPihBcnJheSgzMikuZmlsbCgxNSkpO1xuICBjb25zdCBjYW52YXNSZWYgPSB1c2VSZWY8SFRNTENhbnZhc0VsZW1lbnQ+KG51bGwpO1xuXG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgbGV0IGFuaW1hdGlvbkZyYW1lSWQ6IG51bWJlcjtcbiAgICBjb25zdCBmcmVxQnVmZmVyID0gbmV3IFVpbnQ4QXJyYXkoNjQpO1xuXG4gICAgY29uc3QgdXBkYXRlU3BlY3RydW0gPSAoKSA9PiB7XG4gICAgICBhdWRpb0VuZ2luZS5nZXRCeXRlRnJlcXVlbmN5RGF0YShmcmVxQnVmZmVyKTtcblxuICAgICAgY29uc3QgbmV3QmFyczogbnVtYmVyW10gPSBbXTtcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgMzI7IGkrKykge1xuICAgICAgICBjb25zdCB2YWwgPSBmcmVxQnVmZmVyW2kgKiAyXSB8fCAwO1xuICAgICAgICBjb25zdCBwZXJjZW50ID0gTWF0aC5tYXgoOCwgKHZhbCAvIDI1NSkgKiAxMDApO1xuICAgICAgICBuZXdCYXJzLnB1c2gocGVyY2VudCk7XG4gICAgICB9XG5cbiAgICAgIHNldFNwZWN0cnVtRGF0YShuZXdCYXJzKTtcblxuICAgICAgY29uc3QgY2FudmFzID0gY2FudmFzUmVmLmN1cnJlbnQ7XG4gICAgICBpZiAoY2FudmFzKSB7XG4gICAgICAgIGNvbnN0IGN0eCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuICAgICAgICBpZiAoY3R4KSB7XG4gICAgICAgICAgY3R4LmNsZWFyUmVjdCgwLCAwLCBjYW52YXMud2lkdGgsIGNhbnZhcy5oZWlnaHQpO1xuXG4gICAgICAgICAgY3R4LnN0cm9rZVN0eWxlID0gJ3JnYmEoMzAsIDQxLCA1OSwgMC40KSc7XG4gICAgICAgICAgY3R4LmxpbmVXaWR0aCA9IDE7XG4gICAgICAgICAgZm9yIChsZXQgeCA9IDA7IHggPD0gY2FudmFzLndpZHRoOyB4ICs9IGNhbnZhcy53aWR0aCAvIDgpIHtcbiAgICAgICAgICAgIGN0eC5iZWdpblBhdGgoKTtcbiAgICAgICAgICAgIGN0eC5tb3ZlVG8oeCwgMCk7XG4gICAgICAgICAgICBjdHgubGluZVRvKHgsIGNhbnZhcy5oZWlnaHQpO1xuICAgICAgICAgICAgY3R4LnN0cm9rZSgpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGN0eC5iZWdpblBhdGgoKTtcbiAgICAgICAgICBjdHguc3Ryb2tlU3R5bGUgPSAnIzM0ZDM5OSc7XG4gICAgICAgICAgY3R4LmxpbmVXaWR0aCA9IDIuNTtcbiAgICAgICAgICBjdHguc2hhZG93Qmx1ciA9IDEwO1xuICAgICAgICAgIGN0eC5zaGFkb3dDb2xvciA9ICcjMzRkMzk5JztcblxuICAgICAgICAgIGNvbnN0IHBvaW50cyA9IGJhbmRzLm1hcCgoYiwgaSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgeCA9IChpIC8gMykgKiAoY2FudmFzLndpZHRoIC0gNDApICsgMjA7XG4gICAgICAgICAgICBjb25zdCB5ID0gY2FudmFzLmhlaWdodCAtIChiLmdhaW4gLyAxMDApICogY2FudmFzLmhlaWdodDtcbiAgICAgICAgICAgIHJldHVybiB7IHgsIHkgfTtcbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIGN0eC5tb3ZlVG8oMCwgY2FudmFzLmhlaWdodCAvIDIpO1xuICAgICAgICAgIHBvaW50cy5mb3JFYWNoKChwdCwgaSkgPT4ge1xuICAgICAgICAgICAgaWYgKGkgPT09IDApIGN0eC5saW5lVG8ocHQueCwgcHQueSk7XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgY29uc3QgcHJldiA9IHBvaW50c1tpIC0gMV07XG4gICAgICAgICAgICAgIGNvbnN0IGN4ID0gKHByZXYueCArIHB0LngpIC8gMjtcbiAgICAgICAgICAgICAgY3R4LmJlemllckN1cnZlVG8oY3gsIHByZXYueSwgY3gsIHB0LnksIHB0LngsIHB0LnkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICAgIGN0eC5saW5lVG8oY2FudmFzLndpZHRoLCBjYW52YXMuaGVpZ2h0IC8gMik7XG4gICAgICAgICAgY3R4LnN0cm9rZSgpO1xuXG4gICAgICAgICAgcG9pbnRzLmZvckVhY2goKHB0KSA9PiB7XG4gICAgICAgICAgICBjdHguYmVnaW5QYXRoKCk7XG4gICAgICAgICAgICBjdHguZmlsbFN0eWxlID0gJyMyMmQzZWUnO1xuICAgICAgICAgICAgY3R4LmFyYyhwdC54LCBwdC55LCA1LCAwLCBNYXRoLlBJICogMik7XG4gICAgICAgICAgICBjdHguZmlsbCgpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGFuaW1hdGlvbkZyYW1lSWQgPSByZXF1ZXN0QW5pbWF0aW9uRnJhbWUodXBkYXRlU3BlY3RydW0pO1xuICAgIH07XG5cbiAgICB1cGRhdGVTcGVjdHJ1bSgpO1xuXG4gICAgcmV0dXJuICgpID0+IGNhbmNlbEFuaW1hdGlvbkZyYW1lKGFuaW1hdGlvbkZyYW1lSWQpO1xuICB9LCBbYmFuZHNdKTtcblxuICBjb25zdCBoYW5kbGVCYW5kQ2hhbmdlID0gKGJhbmRJZHg6IG51bWJlciwgcGFyYW06ICdmcmVxJyB8ICdnYWluJyB8ICdxJywgdmFsdWU6IG51bWJlcikgPT4ge1xuICAgIGNvbnN0IHVwZGF0ZWQgPSBbLi4uYmFuZHNdO1xuICAgIHVwZGF0ZWRbYmFuZElkeF0gPSB7IC4uLnVwZGF0ZWRbYmFuZElkeF0sIFtwYXJhbV06IHZhbHVlIH07XG4gICAgc2V0QmFuZHModXBkYXRlZCk7XG4gICAgYXVkaW9FbmdpbmUuc2V0RVFCYW5kKGJhbmRJZHgsIHBhcmFtLCB2YWx1ZSk7XG4gIH07XG5cbiAgcmV0dXJuIChcbiAgICA8ZGl2IGNsYXNzTmFtZT1cImgtZnVsbCBiZy1zbGF0ZS05MDAgcC02IGZsZXggZmxleC1jb2wgZ2FwLTUgZm9udC1tb25vIHRleHQteHMgdGV4dC1zbGF0ZS0zMDAgb3ZlcmZsb3cteS1hdXRvXCI+XG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXgganVzdGlmeS1iZXR3ZWVuIGl0ZW1zLWNlbnRlciBiZy1zbGF0ZS05NTAgcC0zIHJvdW5kZWQtbGcgYm9yZGVyIGJvcmRlci1zbGF0ZS04MDAgc2hhZG93LW1kXCI+XG4gICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cImZvbnQtYmxhY2sgdHJhY2tpbmctd2lkZXN0IHRleHQtZW1lcmFsZC0zMDAgZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTJcIj5cbiAgICAgICAgICA8QmFyQ2hhcnQgc2l6ZT17MTZ9IC8+IFBSTyBQQVJBTUVUUklDIEVRIDQtQkFORCAoUkVBTC1USU1FIFNQRUNUUkFMIEFOQUxZWkVSKVxuICAgICAgICA8L3NwYW4+XG4gICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInB4LTIgcHktMC41IGJnLWVtZXJhbGQtOTUwIHRleHQtZW1lcmFsZC00MDAgdGV4dC1bMTBweF0gcm91bmRlZCBib3JkZXIgYm9yZGVyLWVtZXJhbGQtOTAwIGZvbnQtYm9sZFwiPlxuICAgICAgICAgIEFOQUxZU0VSIEFDVElWRVxuICAgICAgICA8L3NwYW4+XG4gICAgICA8L2Rpdj5cblxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJiZy1zbGF0ZS05NTAgcC00IHJvdW5kZWQteGwgYm9yZGVyIGJvcmRlci1zbGF0ZS04MDAgZmxleCBmbGV4LWNvbCBnYXAtMiByZWxhdGl2ZSBvdmVyZmxvdy1oaWRkZW4gc2hhZG93LWlubmVyXCI+XG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBqdXN0aWZ5LWJldHdlZW4gdGV4dC1bOXB4XSB0ZXh0LXNsYXRlLTUwMCBweC0xIGZvbnQtYm9sZFwiPlxuICAgICAgICAgIDxzcGFuPjIwSHogKFNVQik8L3NwYW4+XG4gICAgICAgICAgPHNwYW4+MTAwSHogKEJBU1MpPC9zcGFuPlxuICAgICAgICAgIDxzcGFuPjUwMEh6IChNSUQpPC9zcGFuPlxuICAgICAgICAgIDxzcGFuPjJrSHogKFBSRVNFTkNFKTwvc3Bhbj5cbiAgICAgICAgICA8c3Bhbj44a0h6IChUUkVCTEUpPC9zcGFuPlxuICAgICAgICAgIDxzcGFuPjIwa0h6IChBSVIpPC9zcGFuPlxuICAgICAgICA8L2Rpdj5cblxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImgtMzIgcmVsYXRpdmUgZmxleCBpdGVtcy1lbmQgZ2FwLTEgcHgtMSBwdC0yXCI+XG4gICAgICAgICAgPGNhbnZhc1xuICAgICAgICAgICAgcmVmPXtjYW52YXNSZWZ9XG4gICAgICAgICAgICB3aWR0aD17NjAwfVxuICAgICAgICAgICAgaGVpZ2h0PXsxMjh9XG4gICAgICAgICAgICBjbGFzc05hbWU9XCJhYnNvbHV0ZSBpbnNldC0wIHctZnVsbCBoLWZ1bGwgcG9pbnRlci1ldmVudHMtbm9uZSB6LTEwXCJcbiAgICAgICAgICAvPlxuXG4gICAgICAgICAge3NwZWN0cnVtRGF0YS5tYXAoKHZhbCwgaSkgPT4gKFxuICAgICAgICAgICAgPGRpdiBrZXk9e2l9IGNsYXNzTmFtZT1cImZsZXgtMSBoLWZ1bGwgZmxleCBmbGV4LWNvbCBqdXN0aWZ5LWVuZCByZWxhdGl2ZVwiPlxuICAgICAgICAgICAgICA8ZGl2XG4gICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwidy1mdWxsIGJnLWdyYWRpZW50LXRvLXQgZnJvbS1lbWVyYWxkLTYwMCB2aWEtY3lhbi00MDAgdG8tYW1iZXItMzAwIHJvdW5kZWQtdC1zbSB0cmFuc2l0aW9uLWFsbCBkdXJhdGlvbi03NSBzaGFkb3ctWzBfMF84cHhfcmdiYSg1MiwyMTEsMTUzLDAuMyldXCJcbiAgICAgICAgICAgICAgICBzdHlsZT17eyBoZWlnaHQ6IGAke3ZhbH0lYCB9fVxuICAgICAgICAgICAgICAvPlxuICAgICAgICAgICAgICA8ZGl2XG4gICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwidy1mdWxsIGgtMC41IGJnLWFtYmVyLTIwMCBzaGFkb3ctWzBfMF81cHhfI2ZkZTA0N10gYWJzb2x1dGUgdG9wLTAgdHJhbnNpdGlvbi1hbGwgZHVyYXRpb24tMTUwIG9wYWNpdHktODBcIlxuICAgICAgICAgICAgICAgIHN0eWxlPXt7IGJvdHRvbTogYCR7TWF0aC5taW4oOTgsIHZhbCArIDIpfSVgIH19XG4gICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICApKX1cbiAgICAgICAgPC9kaXY+XG4gICAgICA8L2Rpdj5cblxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJncmlkIGdyaWQtY29scy00IGdhcC0zXCI+XG4gICAgICAgIHtiYW5kcy5tYXAoKGJhbmQsIGlkeCkgPT4gKFxuICAgICAgICAgIDxkaXYga2V5PXtpZHh9IGNsYXNzTmFtZT1cImJnLXNsYXRlLTk1MCBwLTMgcm91bmRlZC14bCBib3JkZXIgYm9yZGVyLXNsYXRlLTgwMCBmbGV4IGZsZXgtY29sIGl0ZW1zLWNlbnRlciBnYXAtMyBzaGFkb3ctbGdcIj5cbiAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtWzlweF0gZm9udC1ib2xkIHRleHQtc2xhdGUtNDAwIHRleHQtY2VudGVyIHRyYWNraW5nLXdpZGVyXCI+e2JhbmQubmFtZX08L3NwYW4+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggZmxleC1jb2wgZ2FwLTMgaXRlbXMtY2VudGVyXCI+XG4gICAgICAgICAgICAgIDxLbm9iIGxhYmVsPVwiRlJFUVwiIHZhbHVlPXtiYW5kLmZyZXF9IGNvbG9yPXtiYW5kLmNvbG9yfSBvbkNoYW5nZT17KHYpID0+IGhhbmRsZUJhbmRDaGFuZ2UoaWR4LCAnZnJlcScsIHYpfSAvPlxuICAgICAgICAgICAgICA8S25vYiBsYWJlbD1cIkdBSU5cIiB2YWx1ZT17YmFuZC5nYWlufSBjb2xvcj17YmFuZC5jb2xvcn0gb25DaGFuZ2U9eyh2KSA9PiBoYW5kbGVCYW5kQ2hhbmdlKGlkeCwgJ2dhaW4nLCB2KX0gLz5cbiAgICAgICAgICAgICAgPEtub2IgbGFiZWw9XCJRXCIgdmFsdWU9e2JhbmQucX0gY29sb3I9e2JhbmQuY29sb3J9IG9uQ2hhbmdlPXsodikgPT4gaGFuZGxlQmFuZENoYW5nZShpZHgsICdxJywgdil9IC8+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgKSl9XG4gICAgICA8L2Rpdj5cbiAgICA8L2Rpdj5cbiAgKTtcbn07XG5jb25zdCBWb2ljZVRyYWluZXIgPSAoKSA9PiB7XG4gIGNvbnN0IFt0YXJnZXROb3RlLCBzZXRUYXJnZXROb3RlXSA9IHVzZVN0YXRlKFwiQTRcIik7XG4gIGNvbnN0IFtkZXRlY3RlZE5vdGUsIHNldGRldGVjdGVkTm90ZV0gPSB1c2VTdGF0ZShcIkE0ICg0NDAuMiBIeilcIik7XG4gIGNvbnN0IFthY2N1cmFjeSwgc2V0QWNjdXJhY3ldID0gdXNlU3RhdGUoOTQpO1xuICBjb25zdCBbaXNUcmFpbmluZywgc2V0SXNUcmFpbmluZ10gPSB1c2VTdGF0ZSh0cnVlKTtcblxuICByZXR1cm4gKFxuICAgIDxkaXYgY2xhc3NOYW1lPVwiaC1mdWxsIGJnLXNsYXRlLTkwMCBwLTYgZmxleCBmbGV4LWNvbCBnYXAtNSBmb250LW1vbm8gdGV4dC14cyB0ZXh0LXNsYXRlLTMwMCBvdmVyZmxvdy15LWF1dG9cIj5cbiAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXgganVzdGlmeS1iZXR3ZWVuIGl0ZW1zLWNlbnRlciBiZy1zbGF0ZS05NTAgcC0zIHJvdW5kZWQtbGcgYm9yZGVyIGJvcmRlci1zbGF0ZS04MDAgc2hhZG93LW1kXCI+XG4gICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJmb250LWJsYWNrIHRyYWNraW5nLXdpZGVzdCB0ZXh0LXJvc2UtNDAwIGZsZXggaXRlbXMtY2VudGVyIGdhcC0yXCI+XG4gICAgICAgICAgIDxNaWMyIHNpemU9ezE2fSAvPiBWT0lDRSBQSVRDSCBUUkFJTkVSICYgVFVORVJcbiAgICAgICAgIDwvc3Bhbj5cbiAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInB4LTIgcHktMC41IGJnLXJvc2UtOTUwIHRleHQtcm9zZS00MDAgdGV4dC1bMTBweF0gcm91bmRlZCBib3JkZXIgYm9yZGVyLXJvc2UtOTAwXCI+VFVORVIgQUNUSVZFPC9zcGFuPlxuICAgICAgIDwvZGl2PlxuXG4gICAgICAgey8qIFR1bmVyIERpc3BsYXkgKi99XG4gICAgICAgPGRpdiBjbGFzc05hbWU9XCJiZy1zbGF0ZS05NTAgcC02IHJvdW5kZWQteGwgYm9yZGVyIGJvcmRlci1zbGF0ZS04MDAgZmxleCBmbGV4LWNvbCBpdGVtcy1jZW50ZXIgZ2FwLTQgc2hhZG93LWlubmVyXCI+XG4gICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LVsxMHB4XSB0ZXh0LXNsYXRlLTUwMCB1cHBlcmNhc2UgZm9udC1ib2xkXCI+REVURUNURUQgUElUQ0g8L3NwYW4+XG4gICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInRleHQtNHhsIGZvbnQtYmxhY2sgdGV4dC1yb3NlLTQwMCB0cmFja2luZy13aWRlciBkcm9wLXNoYWRvdy1bMF8wXzEwcHhfcmdiYSgyNDQsNjMsOTQsMC40KV1cIj5cbiAgICAgICAgICAge2RldGVjdGVkTm90ZX1cbiAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICB7LyogQ2VudGVyIE5lZWRsZSBNZXRlciAqL31cbiAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwidy1mdWxsIG1heC13LXNtIGgtMTIgYmctc2xhdGUtOTAwIHJvdW5kZWQteGwgYm9yZGVyIGJvcmRlci1zbGF0ZS04MDAgcmVsYXRpdmUgZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgb3ZlcmZsb3ctaGlkZGVuXCI+XG4gICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJzb2x1dGUgaW5zZXQteC0wIHRvcC0xLzIgaC0wLjUgYmctc2xhdGUtODAwXCIgLz5cbiAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYnNvbHV0ZSB0b3AtMCBib3R0b20tMCB3LTEgYmctcm9zZS01MDAgc2hhZG93LVswXzBfMTBweF8jZjQzZjVlXSBsZWZ0LVs1MiVdXCIgLz5cbiAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYnNvbHV0ZSBpbnNldC15LTAgbGVmdC0xLzIgdy0wLjUgYmctZW1lcmFsZC00MDBcIiAvPlxuICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXgganVzdGlmeS1iZXR3ZWVuIHctZnVsbCBweC00IHRleHQtWzlweF0gdGV4dC1zbGF0ZS01MDAgZm9udC1ib2xkIHotMTBcIj5cbiAgICAgICAgICAgICA8c3Bhbj4tNTBjdDwvc3Bhbj5cbiAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LWVtZXJhbGQtNDAwXCI+MGN0IChJTiBUVU5FKTwvc3Bhbj5cbiAgICAgICAgICAgICA8c3Bhbj4rNTBjdDwvc3Bhbj5cbiAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtNCB3LWZ1bGwganVzdGlmeS1iZXR3ZWVuIHB0LTJcIj5cbiAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGZsZXgtY29sXCI+XG4gICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1bOXB4XSB0ZXh0LXNsYXRlLTUwMFwiPlRBUkdFVCBOT1RFPC9zcGFuPlxuICAgICAgICAgICAgIDxzZWxlY3QgXG4gICAgICAgICAgICAgICB2YWx1ZT17dGFyZ2V0Tm90ZX0gXG4gICAgICAgICAgICAgICBvbkNoYW5nZT17ZSA9PiBzZXRUYXJnZXROb3RlKGUudGFyZ2V0LnZhbHVlKX1cbiAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cImJnLXNsYXRlLTkwMCBib3JkZXIgYm9yZGVyLXNsYXRlLTgwMCByb3VuZGVkIHB4LTIgcHktMSB0ZXh0LXJvc2UtMzAwIGZvbnQtYm9sZCBvdXRsaW5lLW5vbmVcIlxuICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgIHtbXCJDNFwiLCBcIkQ0XCIsIFwiRTRcIiwgXCJGNFwiLCBcIkc0XCIsIFwiQTRcIiwgXCJCNFwiXS5tYXAobiA9PiA8b3B0aW9uIGtleT17bn0gdmFsdWU9e259PntufTwvb3B0aW9uPil9XG4gICAgICAgICAgICAgPC9zZWxlY3Q+XG4gICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggZmxleC1jb2wgaXRlbXMtZW5kXCI+XG4gICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1bOXB4XSB0ZXh0LXNsYXRlLTUwMFwiPkFDQ1VSQUNZIFNDT1JFPC9zcGFuPlxuICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtZW1lcmFsZC00MDAgZm9udC1ib2xkIHRleHQtc21cIj57YWNjdXJhY3l9JSBJTiBUVU5FPC9zcGFuPlxuICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgIDwvZGl2PlxuICAgICAgIDwvZGl2PlxuXG4gICAgICAgPGJ1dHRvbiBcbiAgICAgICAgIG9uQ2xpY2s9eygpID0+IHNldElzVHJhaW5pbmcoIWlzVHJhaW5pbmcpfVxuICAgICAgICAgY2xhc3NOYW1lPXtgdy1mdWxsIHB5LTMgcm91bmRlZC14bCBmb250LWJsYWNrIHRyYWNraW5nLXdpZGVzdCB0cmFuc2l0aW9uLWFsbCAke2lzVHJhaW5pbmcgPyAnYmctcm9zZS02MDAgaG92ZXI6Ymctcm9zZS01MDAgdGV4dC13aGl0ZSBzaGFkb3ctWzBfMF8xNXB4X3JnYmEoMjQ0LDYzLDk0LDAuNCldJyA6ICdiZy1zbGF0ZS04MDAgdGV4dC1zbGF0ZS00MDAnfWB9XG4gICAgICAgPlxuICAgICAgICAge2lzVHJhaW5pbmcgPyAnU1RPUCBWT0lDRSBQUkFDVElDRSBTRVNTSU9OJyA6ICdTVEFSVCBWT0lDRSBQUkFDVElDRSBTRVNTSU9OJ31cbiAgICAgICA8L2J1dHRvbj5cbiAgICA8L2Rpdj5cbiAgKTtcbn07XG5cbmNvbnN0IFZvaWNlQ2hhbmdlciA9ICgpID0+IHtcbiAgY29uc3QgW3ByZXNldCwgc2V0UHJlc2V0XSA9IHVzZVN0YXRlKFwiUm9ib3RpY1wiKTtcbiAgY29uc3QgW2Zvcm1hbnQsIHNldEZvcm1hbnRdID0gdXNlU3RhdGUoNTApO1xuICBjb25zdCBbcGl0Y2hTaGlmdCwgc2V0UGl0Y2hTaGlmdF0gPSB1c2VTdGF0ZSgwKTtcblxuICByZXR1cm4gKFxuICAgIDxkaXYgY2xhc3NOYW1lPVwiaC1mdWxsIGJnLXNsYXRlLTkwMCBwLTYgZmxleCBmbGV4LWNvbCBnYXAtNSBmb250LW1vbm8gdGV4dC14cyB0ZXh0LXNsYXRlLTMwMCBvdmVyZmxvdy15LWF1dG9cIj5cbiAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXgganVzdGlmeS1iZXR3ZWVuIGl0ZW1zLWNlbnRlciBiZy1zbGF0ZS05NTAgcC0zIHJvdW5kZWQtbGcgYm9yZGVyIGJvcmRlci1zbGF0ZS04MDAgc2hhZG93LW1kXCI+XG4gICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJmb250LWJsYWNrIHRyYWNraW5nLXdpZGVzdCB0ZXh0LXB1cnBsZS00MDAgZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTJcIj5cbiAgICAgICAgICAgPE1pYzIgc2l6ZT17MTZ9IC8+IFZPQ0FMIFRSQU5TRk9STUVSICYgRlhcbiAgICAgICAgIDwvc3Bhbj5cbiAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInB4LTIgcHktMC41IGJnLXB1cnBsZS05NTAgdGV4dC1wdXJwbGUtNDAwIHRleHQtWzEwcHhdIHJvdW5kZWQgYm9yZGVyIGJvcmRlci1wdXJwbGUtOTAwXCI+RFNQIFJBQ0s8L3NwYW4+XG4gICAgICAgPC9kaXY+XG5cbiAgICAgICB7LyogUHJlc2V0cyBHcmlkICovfVxuICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZ3JpZCBncmlkLWNvbHMtNCBnYXAtMlwiPlxuICAgICAgICAge1tcIkNsZWFuXCIsIFwiUm9ib3RpY1wiLCBcIk1lZ2FwaG9uZVwiLCBcIkRlbW9uIERlZXBcIl0ubWFwKHAgPT4gKFxuICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAga2V5PXtwfVxuICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHNldFByZXNldChwKX1cbiAgICAgICAgICAgICBjbGFzc05hbWU9e2BweS0yIHJvdW5kZWQtbGcgZm9udC1ib2xkIHRyYW5zaXRpb24tYWxsIGJvcmRlciAke1xuICAgICAgICAgICAgICAgcHJlc2V0ID09PSBwIFxuICAgICAgICAgICAgICAgICA/ICdiZy1wdXJwbGUtNjAwLzIwIHRleHQtcHVycGxlLTMwMCBib3JkZXItcHVycGxlLTUwMCBzaGFkb3ctWzBfMF8xMHB4X3JnYmEoMTY4LDg1LDI0NywwLjIpXScgXG4gICAgICAgICAgICAgICAgIDogJ2JnLXNsYXRlLTk1MCB0ZXh0LXNsYXRlLTQwMCBib3JkZXItc2xhdGUtODAwIGhvdmVyOmJvcmRlci1zbGF0ZS03MDAnXG4gICAgICAgICAgICAgfWB9XG4gICAgICAgICAgID5cbiAgICAgICAgICAgICB7cH1cbiAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICApKX1cbiAgICAgICA8L2Rpdj5cblxuICAgICAgIHsvKiBLbm9icyAmIFNsaWRlcnMgKi99XG4gICAgICAgPGRpdiBjbGFzc05hbWU9XCJncmlkIGdyaWQtY29scy0yIGdhcC00XCI+XG4gICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImJnLXNsYXRlLTk1MCBwLTQgcm91bmRlZC14bCBib3JkZXIgYm9yZGVyLXNsYXRlLTgwMCBmbGV4IGZsZXgtY29sIGl0ZW1zLWNlbnRlciBnYXAtNFwiPlxuICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LVsxMHB4XSB0ZXh0LXB1cnBsZS00MDAgZm9udC1ib2xkIHRyYWNraW5nLXdpZGVzdCBib3JkZXItYiBib3JkZXItc2xhdGUtODAwIHBiLTIgdy1mdWxsIHRleHQtY2VudGVyXCI+Rk9STUFOVCBTSElGVDwvc3Bhbj5cbiAgICAgICAgICAgPEtub2IgbGFiZWw9XCJGT1JNQU5UXCIgdmFsdWU9e2Zvcm1hbnR9IGNvbG9yPVwidmlvbGV0XCIgb25DaGFuZ2U9eyh2KSA9PiBzZXRGb3JtYW50KHYpfSAvPlxuICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYmctc2xhdGUtOTUwIHAtNCByb3VuZGVkLXhsIGJvcmRlciBib3JkZXItc2xhdGUtODAwIGZsZXggZmxleC1jb2wgaXRlbXMtY2VudGVyIGdhcC00XCI+XG4gICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtWzEwcHhdIHRleHQtcHVycGxlLTQwMCBmb250LWJvbGQgdHJhY2tpbmctd2lkZXN0IGJvcmRlci1iIGJvcmRlci1zbGF0ZS04MDAgcGItMiB3LWZ1bGwgdGV4dC1jZW50ZXJcIj5QSVRDSCBUUkFOU1BPU0lUSU9OPC9zcGFuPlxuICAgICAgICAgICA8S25vYiBsYWJlbD1cIlNFTUlUT05FU1wiIHZhbHVlPXtwaXRjaFNoaWZ0ICsgNTB9IGNvbG9yPVwidmlvbGV0XCIgb25DaGFuZ2U9eyh2KSA9PiBzZXRQaXRjaFNoaWZ0KHYgLSA1MCl9IC8+XG4gICAgICAgICA8L2Rpdj5cbiAgICAgICA8L2Rpdj5cblxuICAgICAgIHsvKiBGcmVxdWVuY3kgU3BlY3RydW0gVmlzdWFsaXplciAqL31cbiAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImJnLXNsYXRlLTk1MCBwLTQgcm91bmRlZC14bCBib3JkZXIgYm9yZGVyLXNsYXRlLTgwMCBmbGV4IGZsZXgtY29sIGdhcC0yIHNoYWRvdy1pbm5lclwiPlxuICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1bMTBweF0gdGV4dC1zbGF0ZS01MDBcIj5SRUFMVElNRSBWT0NBTCBGT1JNQU5UIFNQRUNUUlVNPC9zcGFuPlxuICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJoLTIwIGZsZXggaXRlbXMtZW5kIGdhcC0xXCI+XG4gICAgICAgICAgIHtBcnJheS5mcm9tKHtsZW5ndGg6IDMwfSkubWFwKChfLCBpKSA9PiAoXG4gICAgICAgICAgICAgPGRpdiBrZXk9e2l9IGNsYXNzTmFtZT1cImZsZXgtMSBiZy1ncmFkaWVudC10by10IGZyb20tcHVycGxlLTYwMCB0by1pbmRpZ28tNDAwIHJvdW5kZWQtdC1zbVwiIHN0eWxlPXt7IGhlaWdodDogYCR7TWF0aC5zaW4oaS8yKSo0MCArIE1hdGguY29zKGkvMS41KSoyNSArIDUwfSVgIH19IC8+XG4gICAgICAgICAgICkpfVxuICAgICAgICAgPC9kaXY+XG4gICAgICAgPC9kaXY+XG4gICAgPC9kaXY+XG4gICk7XG59O1xuY29uc3QgQWR2YW5jZWRUcmltID0gKCkgPT4ge1xuICBjb25zdCBbem9vbSwgc2V0Wm9vbV0gPSB1c2VTdGF0ZSgxKTtcbiAgY29uc3QgW3N0YXJ0TWFya2VyLCBzZXRTdGFydE1hcmtlcl0gPSB1c2VTdGF0ZSgwKTtcbiAgY29uc3QgW2VuZE1hcmtlciwgc2V0RW5kTWFya2VyXSA9IHVzZVN0YXRlKDEwMCk7XG4gIGNvbnN0IFtub3JtYWxpemVkLCBzZXROb3JtYWxpemVkXSA9IHVzZVN0YXRlKGZhbHNlKTtcblxuICByZXR1cm4gKFxuICAgIDxkaXYgY2xhc3NOYW1lPVwiaC1mdWxsIGJnLXNsYXRlLTkwMCBwLTYgZmxleCBmbGV4LWNvbCBnYXAtNSBmb250LW1vbm8gdGV4dC14cyB0ZXh0LXNsYXRlLTMwMCBvdmVyZmxvdy15LWF1dG9cIj5cbiAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXgganVzdGlmeS1iZXR3ZWVuIGl0ZW1zLWNlbnRlciBiZy1zbGF0ZS05NTAgcC0zIHJvdW5kZWQtbGcgYm9yZGVyIGJvcmRlci1zbGF0ZS04MDAgc2hhZG93LW1kXCI+XG4gICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJmb250LWJsYWNrIHRyYWNraW5nLXdpZGVzdCB0ZXh0LWJsdWUtMzAwIGZsZXggaXRlbXMtY2VudGVyIGdhcC0yXCI+XG4gICAgICAgICAgIDxTY2lzc29ycyBzaXplPXsxNn0gLz4gV0FWRUZPUk0gQVVESU8gVFJJTU1FUiAmIE5PUk1BTElaRVxuICAgICAgICAgPC9zcGFuPlxuICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMlwiPlxuICAgICAgICAgICA8YnV0dG9uIG9uQ2xpY2s9eygpID0+IHNldFpvb20oTWF0aC5tYXgoMC41LCB6b29tIC0gMC4yNSkpfSBjbGFzc05hbWU9XCJweC0yLjUgcHktMSBiZy1zbGF0ZS04MDAgaG92ZXI6Ymctc2xhdGUtNzAwIHRleHQtc2xhdGUtMzAwIHJvdW5kZWQgZm9udC1ib2xkXCI+Wk9PTSAtPC9idXR0b24+XG4gICAgICAgICAgIDxidXR0b24gb25DbGljaz17KCkgPT4gc2V0Wm9vbSgxKX0gY2xhc3NOYW1lPVwicHgtMi41IHB5LTEgYmctc2xhdGUtODAwIGhvdmVyOmJnLXNsYXRlLTcwMCB0ZXh0LXNsYXRlLTMwMCByb3VuZGVkIGZvbnQtYm9sZFwiPjE6MTwvYnV0dG9uPlxuICAgICAgICAgICA8YnV0dG9uIG9uQ2xpY2s9eygpID0+IHNldFpvb20oTWF0aC5taW4oMywgem9vbSArIDAuMjUpKX0gY2xhc3NOYW1lPVwicHgtMi41IHB5LTEgYmctc2xhdGUtODAwIGhvdmVyOmJnLXNsYXRlLTcwMCB0ZXh0LXNsYXRlLTMwMCByb3VuZGVkIGZvbnQtYm9sZFwiPlpPT00gKzwvYnV0dG9uPlxuICAgICAgICAgPC9kaXY+XG4gICAgICAgPC9kaXY+XG5cbiAgICAgICB7LyogV2F2ZWZvcm0gQ2FudmFzIFNpbXVsYXRpb24gKi99XG4gICAgICAgPGRpdiBjbGFzc05hbWU9XCJiZy1zbGF0ZS05NTAgcC01IHJvdW5kZWQteGwgYm9yZGVyIGJvcmRlci1zbGF0ZS04MDAgZmxleCBmbGV4LWNvbCBnYXAtMyByZWxhdGl2ZSBvdmVyZmxvdy1oaWRkZW4gc2hhZG93LWlubmVyXCI+XG4gICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXgganVzdGlmeS1iZXR3ZWVuIHRleHQtWzlweF0gdGV4dC1zbGF0ZS01MDBcIj5cbiAgICAgICAgICAgPHNwYW4+MC4wczwvc3Bhbj5cbiAgICAgICAgICAgPHNwYW4+MS4yczwvc3Bhbj5cbiAgICAgICAgICAgPHNwYW4+Mi40czwvc3Bhbj5cbiAgICAgICAgIDwvZGl2PlxuICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJoLTMyIGZsZXggaXRlbXMtY2VudGVyIGdhcC0wLjUgcHgtMiByZWxhdGl2ZSBiZy1zbGF0ZS05MDAvNTAgcm91bmRlZC1sZyBib3JkZXIgYm9yZGVyLXNsYXRlLTgwMFwiIHN0eWxlPXt7IHRyYW5zZm9ybTogYHNjYWxlWCgke3pvb219KWAsIHRyYW5zZm9ybU9yaWdpbjogJ2xlZnQnIH19PlxuICAgICAgICAgICB7LyogU3RhcnQgJiBFbmQgbWFya2VyIGhpZ2hsaWdodHMgKi99XG4gICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJzb2x1dGUgaW5zZXQteS0wIGJnLWJsdWUtNTAwLzEwIGJvcmRlci14LTIgYm9yZGVyLWJsdWUtNDAwIHotMTBcIiBzdHlsZT17eyBsZWZ0OiBgJHtzdGFydE1hcmtlcn0lYCwgcmlnaHQ6IGAkezEwMCAtIGVuZE1hcmtlcn0lYCB9fSAvPlxuICAgICAgICAgICBcbiAgICAgICAgICAge0FycmF5LmZyb20oe2xlbmd0aDogNDh9KS5tYXAoKF8sIGkpID0+IChcbiAgICAgICAgICAgICA8ZGl2IFxuICAgICAgICAgICAgICAga2V5PXtpfSBcbiAgICAgICAgICAgICAgIGNsYXNzTmFtZT17YGZsZXgtMSByb3VuZGVkLXNtIHRyYW5zaXRpb24tYWxsICR7bm9ybWFsaXplZCA/ICdiZy1lbWVyYWxkLTQwMCcgOiAnYmctYmx1ZS00MDAnfWB9IFxuICAgICAgICAgICAgICAgc3R5bGU9e3sgaGVpZ2h0OiBgJHtNYXRoLnNpbihpIC8gMikgKiA0MCArIE1hdGguY29zKGkgLyAxLjUpICogMzAgKyA1MH0lYCB9fSBcbiAgICAgICAgICAgICAvPlxuICAgICAgICAgICApKX1cbiAgICAgICAgIDwvZGl2PlxuICAgICAgIDwvZGl2PlxuXG4gICAgICAgey8qIE1hcmtlciBhbmQgVG9vbCBDb250cm9scyAqL31cbiAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImdyaWQgZ3JpZC1jb2xzLTIgZ2FwLTRcIj5cbiAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYmctc2xhdGUtOTUwIHAtNCByb3VuZGVkLXhsIGJvcmRlciBib3JkZXItc2xhdGUtODAwIGZsZXggZmxleC1jb2wgZ2FwLTNcIj5cbiAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1bMTBweF0gdGV4dC1ibHVlLTMwMCBmb250LWJvbGQgdHJhY2tpbmctd2lkZXN0IGJvcmRlci1iIGJvcmRlci1zbGF0ZS04MDAgcGItMlwiPk1BUktFUiBTRUxFQ1RJT048L3NwYW4+XG4gICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBmbGV4LWNvbCBnYXAtMlwiPlxuICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBqdXN0aWZ5LWJldHdlZW5cIj5cbiAgICAgICAgICAgICAgIDxzcGFuPlN0YXJ0IE1hcmtlcjogeyhzdGFydE1hcmtlciAqIDAuMDI0KS50b0ZpeGVkKDIpfXM8L3NwYW4+XG4gICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cInJhbmdlXCIgbWluPXswfSBtYXg9ezQwfSB2YWx1ZT17c3RhcnRNYXJrZXJ9IG9uQ2hhbmdlPXtlID0+IHNldFN0YXJ0TWFya2VyKE51bWJlcihlLnRhcmdldC52YWx1ZSkpfSBjbGFzc05hbWU9XCJhY2NlbnQtYmx1ZS00MDBcIiAvPlxuICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBqdXN0aWZ5LWJldHdlZW5cIj5cbiAgICAgICAgICAgICAgIDxzcGFuPkVuZCBNYXJrZXI6IHsoZW5kTWFya2VyICogMC4wMjQpLnRvRml4ZWQoMil9czwvc3Bhbj5cbiAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwicmFuZ2VcIiBtaW49ezYwfSBtYXg9ezEwMH0gdmFsdWU9e2VuZE1hcmtlcn0gb25DaGFuZ2U9e2UgPT4gc2V0RW5kTWFya2VyKE51bWJlcihlLnRhcmdldC52YWx1ZSkpfSBjbGFzc05hbWU9XCJhY2NlbnQtYmx1ZS00MDBcIiAvPlxuICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImJnLXNsYXRlLTk1MCBwLTQgcm91bmRlZC14bCBib3JkZXIgYm9yZGVyLXNsYXRlLTgwMCBmbGV4IGZsZXgtY29sIGdhcC0zXCI+XG4gICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtWzEwcHhdIHRleHQtYmx1ZS0zMDAgZm9udC1ib2xkIHRyYWNraW5nLXdpZGVzdCBib3JkZXItYiBib3JkZXItc2xhdGUtODAwIHBiLTJcIj5EU1AgVE9PTFM8L3NwYW4+XG4gICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBmbGV4LWNvbCBnYXAtMlwiPlxuICAgICAgICAgICAgIDxidXR0b24gXG4gICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBzZXROb3JtYWxpemVkKCFub3JtYWxpemVkKX1cbiAgICAgICAgICAgICAgIGNsYXNzTmFtZT17YHctZnVsbCBweS0yLjUgcm91bmRlZC1sZyBmb250LWJvbGQgdHJhbnNpdGlvbi1jb2xvcnMgJHtub3JtYWxpemVkID8gJ2JnLWVtZXJhbGQtNjAwIHRleHQtd2hpdGUgc2hhZG93LVswXzBfMTBweF8jMDU5NjY5XScgOiAnYmctc2xhdGUtODAwIGhvdmVyOmJnLXNsYXRlLTcwMCB0ZXh0LXNsYXRlLTMwMCd9YH1cbiAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICB7bm9ybWFsaXplZCA/ICdOT1JNQUxJWkVEIFRPIDBkQiAoQUNUSVZFKScgOiAnTk9STUFMSVpFIEFVRElPJ31cbiAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICA8YnV0dG9uIGNsYXNzTmFtZT1cInctZnVsbCBweS0yLjUgYmctYmx1ZS02MDAgaG92ZXI6YmctYmx1ZS01MDAgdGV4dC13aGl0ZSBmb250LWJvbGQgcm91bmRlZC1sZyB0cmFuc2l0aW9uLWNvbG9ycyBzaGFkb3ctWzBfMF8xMHB4X3JnYmEoMzcsOTksMjM1LDAuMyldXCI+XG4gICAgICAgICAgICAgICBDUk9QICYgRVhQT1JUIFJFR0lPTlxuICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgIDwvZGl2PlxuICAgICAgIDwvZGl2PlxuICAgIDwvZGl2PlxuICApO1xufTtcbmNvbnN0IENoYW5uZWxNYXRyaXggPSAoKSA9PiB7XG4gIGNvbnN0IFttYXRyaXgsIHNldE1hdHJpeF0gPSB1c2VTdGF0ZShcbiAgICBBcnJheSg0KS5maWxsKG51bGwpLm1hcCgoKSA9PiBBcnJheSg0KS5maWxsKGZhbHNlKSlcbiAgKTtcbiAgY29uc3QgdHJhY2tzID0gW1wiVHJhY2sgMTogSG91c2VcIiwgXCJUcmFjayAyOiBTdWIgQmFzc1wiLCBcIlRyYWNrIDM6IENob3Jkc1wiLCBcIlRyYWNrIDQ6IEZYIFJpc2VyXCJdO1xuICBjb25zdCBkZXN0aW5hdGlvbnMgPSBbXCJBdXggMSBSZXZlcmJcIiwgXCJBdXggMiBEZWxheVwiLCBcIkJ1cyBBIFN1Ym1peFwiLCBcIk1hc3RlciBPdXRcIl07XG5cbiAgY29uc3QgdG9nZ2xlQ3Jvc3Nwb2ludCA9IChyOiBudW1iZXIsIGM6IG51bWJlcikgPT4ge1xuICAgIGNvbnN0IHVwZGF0ZWQgPSBtYXRyaXgubWFwKChyb3csIHJpKSA9PiByb3cubWFwKCh2YWwsIGNpKSA9PiByaSA9PT0gciAmJiBjaSA9PT0gYyA/ICF2YWwgOiB2YWwpKTtcbiAgICBzZXRNYXRyaXgodXBkYXRlZCk7XG4gIH07XG5cbiAgcmV0dXJuIChcbiAgICA8ZGl2IGNsYXNzTmFtZT1cImgtZnVsbCBiZy1zbGF0ZS05MDAgcC02IGZsZXggZmxleC1jb2wgZ2FwLTUgZm9udC1tb25vIHRleHQteHMgdGV4dC1zbGF0ZS0zMDAgb3ZlcmZsb3cteS1hdXRvXCI+XG4gICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGp1c3RpZnktYmV0d2VlbiBpdGVtcy1jZW50ZXIgYmctc2xhdGUtOTUwIHAtMyByb3VuZGVkLWxnIGJvcmRlciBib3JkZXItc2xhdGUtODAwIHNoYWRvdy1tZFwiPlxuICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwiZm9udC1ibGFjayB0cmFja2luZy13aWRlc3QgdGV4dC1jeWFuLTMwMCBmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMlwiPlxuICAgICAgICAgICA8TGF5b3V0R3JpZCBzaXplPXsxNn0gLz4gQVVESU8gUk9VVElORyBNQVRSSVggKENST1NJUylcbiAgICAgICAgIDwvc3Bhbj5cbiAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInB4LTIgcHktMC41IGJnLWN5YW4tOTUwIHRleHQtY3lhbi00MDAgdGV4dC1bMTBweF0gcm91bmRlZCBib3JkZXIgYm9yZGVyLWN5YW4tOTAwXCI+MTZ4MTYgQlVTPC9zcGFuPlxuICAgICAgIDwvZGl2PlxuXG4gICAgICAgPGRpdiBjbGFzc05hbWU9XCJiZy1zbGF0ZS05NTAgcC00IHJvdW5kZWQteGwgYm9yZGVyIGJvcmRlci1zbGF0ZS04MDAgb3ZlcmZsb3cteC1hdXRvXCI+XG4gICAgICAgICA8dGFibGUgY2xhc3NOYW1lPVwidy1mdWxsIGJvcmRlci1jb2xsYXBzZVwiPlxuICAgICAgICAgICA8dGhlYWQ+XG4gICAgICAgICAgICAgPHRyPlxuICAgICAgICAgICAgICAgPHRoIGNsYXNzTmFtZT1cInAtMiB0ZXh0LWxlZnQgdGV4dC1zbGF0ZS01MDAgZm9udC1ib2xkIGJvcmRlci1iIGJvcmRlci1zbGF0ZS04MDBcIj5JTlBVVCAvIEJVUzwvdGg+XG4gICAgICAgICAgICAgICB7ZGVzdGluYXRpb25zLm1hcCgoZCwgaSkgPT4gKFxuICAgICAgICAgICAgICAgICA8dGgga2V5PXtpfSBjbGFzc05hbWU9XCJwLTIgdGV4dC1jZW50ZXIgdGV4dC1jeWFuLTQwMCBmb250LWJvbGQgYm9yZGVyLWIgYm9yZGVyLXNsYXRlLTgwMFwiPntkfTwvdGg+XG4gICAgICAgICAgICAgICApKX1cbiAgICAgICAgICAgICA8L3RyPlxuICAgICAgICAgICA8L3RoZWFkPlxuICAgICAgICAgICA8dGJvZHk+XG4gICAgICAgICAgICAge3RyYWNrcy5tYXAoKHQsIHJpKSA9PiAoXG4gICAgICAgICAgICAgICA8dHIga2V5PXtyaX0gY2xhc3NOYW1lPVwiYm9yZGVyLWIgYm9yZGVyLXNsYXRlLTkwMCBob3ZlcjpiZy1zbGF0ZS05MDAvNTBcIj5cbiAgICAgICAgICAgICAgICAgPHRkIGNsYXNzTmFtZT1cInAtMyBmb250LWJvbGQgdGV4dC1zbGF0ZS0yMDBcIj57dH08L3RkPlxuICAgICAgICAgICAgICAgICB7ZGVzdGluYXRpb25zLm1hcCgoXywgY2kpID0+IChcbiAgICAgICAgICAgICAgICAgICA8dGQga2V5PXtjaX0gY2xhc3NOYW1lPVwicC0zIHRleHQtY2VudGVyXCI+XG4gICAgICAgICAgICAgICAgICAgICA8YnV0dG9uIFxuICAgICAgICAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiB0b2dnbGVDcm9zc3BvaW50KHJpLCBjaSl9XG4gICAgICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT17YHctOCBoLTggcm91bmRlZC1sZyBib3JkZXIgdHJhbnNpdGlvbi1hbGwgJHtcbiAgICAgICAgICAgICAgICAgICAgICAgICBtYXRyaXhbcmldW2NpXSBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgID8gJ2JnLWN5YW4tNTAwIGJvcmRlci13aGl0ZSB0ZXh0LXNsYXRlLTk1MCBzaGFkb3ctWzBfMF8xMnB4XyMyMmQzZWVdJyBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIDogJ2JnLXNsYXRlLTkwMCBib3JkZXItc2xhdGUtNzAwIGhvdmVyOmJnLXNsYXRlLTgwMCdcbiAgICAgICAgICAgICAgICAgICAgICAgfWB9XG4gICAgICAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgICAgICAgIHttYXRyaXhbcmldW2NpXSA/ICdPTicgOiAnJ31cbiAgICAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICAgICAgIDwvdGQ+XG4gICAgICAgICAgICAgICAgICkpfVxuICAgICAgICAgICAgICAgPC90cj5cbiAgICAgICAgICAgICApKX1cbiAgICAgICAgICAgPC90Ym9keT5cbiAgICAgICAgIDwvdGFibGU+XG4gICAgICAgPC9kaXY+XG4gICAgPC9kaXY+XG4gICk7XG59O1xuY29uc3QgVm9jYWxBdXRvVHVuZSA9ICgpID0+IHtcbiAgY29uc3QgW3NjYWxlLCBzZXRTY2FsZV0gPSB1c2VTdGF0ZShcIkEgTWlub3JcIik7XG4gIGNvbnN0IFtyZXR1bmVTcGVlZCwgc2V0UmV0dW5lU3BlZWRdID0gdXNlU3RhdGUoMTUpO1xuXG4gIHJldHVybiAoXG4gICAgPGRpdiBjbGFzc05hbWU9XCJoLWZ1bGwgYmctc2xhdGUtOTAwIHAtNiBmbGV4IGZsZXgtY29sIGdhcC01IGZvbnQtbW9ubyB0ZXh0LXhzIHRleHQtc2xhdGUtMzAwIG92ZXJmbG93LXktYXV0b1wiPlxuICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBqdXN0aWZ5LWJldHdlZW4gaXRlbXMtY2VudGVyIGJnLXNsYXRlLTk1MCBwLTMgcm91bmRlZC1sZyBib3JkZXIgYm9yZGVyLXNsYXRlLTgwMCBzaGFkb3ctbWRcIj5cbiAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cImZvbnQtYmxhY2sgdHJhY2tpbmctd2lkZXN0IHRleHQtdmlvbGV0LTMwMCBmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMlwiPlxuICAgICAgICAgICA8TXVzaWMgc2l6ZT17MTZ9IC8+IEFVVE9UVU5FIFBSTyBQSVRDSCBDT1JSRUNUSU9OXG4gICAgICAgICA8L3NwYW4+XG4gICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJweC0yIHB5LTAuNSBiZy12aW9sZXQtOTUwIHRleHQtdmlvbGV0LTQwMCB0ZXh0LVsxMHB4XSByb3VuZGVkIGJvcmRlciBib3JkZXItdmlvbGV0LTkwMFwiPlpFUk8gTEFURU5DWTwvc3Bhbj5cbiAgICAgICA8L2Rpdj5cblxuICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZ3JpZCBncmlkLWNvbHMtMiBnYXAtNFwiPlxuICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJiZy1zbGF0ZS05NTAgcC00IHJvdW5kZWQteGwgYm9yZGVyIGJvcmRlci1zbGF0ZS04MDAgZmxleCBmbGV4LWNvbCBnYXAtM1wiPlxuICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LVsxMHB4XSB0ZXh0LXZpb2xldC0zMDAgZm9udC1ib2xkIHRyYWNraW5nLXdpZGVzdCBib3JkZXItYiBib3JkZXItc2xhdGUtODAwIHBiLTJcIj5LRVkgJiBTQ0FMRTwvc3Bhbj5cbiAgICAgICAgICAgPHNlbGVjdCBcbiAgICAgICAgICAgICB2YWx1ZT17c2NhbGV9IFxuICAgICAgICAgICAgIG9uQ2hhbmdlPXtlID0+IHNldFNjYWxlKGUudGFyZ2V0LnZhbHVlKX1cbiAgICAgICAgICAgICBjbGFzc05hbWU9XCJ3LWZ1bGwgYmctc2xhdGUtOTAwIGJvcmRlciBib3JkZXItc2xhdGUtODAwIHJvdW5kZWQgcC0yIHRleHQtdmlvbGV0LTMwMCBmb250LWJvbGQgb3V0bGluZS1ub25lXCJcbiAgICAgICAgICAgPlxuICAgICAgICAgICAgIHtbXCJDIE1ham9yXCIsIFwiQSBNaW5vclwiLCBcIkcgTWFqb3JcIiwgXCJFIE1pbm9yXCIsIFwiQ2hyb21hdGljXCJdLm1hcChzID0+IDxvcHRpb24ga2V5PXtzfSB2YWx1ZT17c30+e3N9PC9vcHRpb24+KX1cbiAgICAgICAgICAgPC9zZWxlY3Q+XG4gICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJiZy1zbGF0ZS05NTAgcC00IHJvdW5kZWQteGwgYm9yZGVyIGJvcmRlci1zbGF0ZS04MDAgZmxleCBmbGV4LWNvbCBpdGVtcy1jZW50ZXIgZ2FwLTJcIj5cbiAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1bMTBweF0gdGV4dC12aW9sZXQtMzAwIGZvbnQtYm9sZCB0cmFja2luZy13aWRlc3QgYm9yZGVyLWIgYm9yZGVyLXNsYXRlLTgwMCBwYi0yIHctZnVsbCB0ZXh0LWNlbnRlclwiPlJFVFVORSBTUEVFRCAoU05BUCk8L3NwYW4+XG4gICAgICAgICAgIDxLbm9iIGxhYmVsPVwiU1BFRURcIiB2YWx1ZT17cmV0dW5lU3BlZWR9IGNvbG9yPVwidmlvbGV0XCIgb25DaGFuZ2U9eyh2KSA9PiBzZXRSZXR1bmVTcGVlZCh2KX0gLz5cbiAgICAgICAgIDwvZGl2PlxuICAgICAgIDwvZGl2PlxuXG4gICAgICAgey8qIFBpYW5vIFJvbGwgTm90ZSBDb3JyZWN0aW9uIEdyaWQgKi99XG4gICAgICAgPGRpdiBjbGFzc05hbWU9XCJiZy1zbGF0ZS05NTAgcC00IHJvdW5kZWQteGwgYm9yZGVyIGJvcmRlci1zbGF0ZS04MDAgZmxleCBmbGV4LWNvbCBnYXAtMiBzaGFkb3ctaW5uZXJcIj5cbiAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtWzEwcHhdIHRleHQtc2xhdGUtNTAwXCI+UElUQ0ggREVURUNUSU9OICYgQ09SUkVDVElPTiBHUklEPC9zcGFuPlxuICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJoLTMyIGJnLXNsYXRlLTkwMCByb3VuZGVkLWxnIGJvcmRlciBib3JkZXItc2xhdGUtODAwIHJlbGF0aXZlIG92ZXJmbG93LWhpZGRlbiBmbGV4IGZsZXgtY29sIGp1c3RpZnktYmV0d2VlbiBwLTJcIj5cbiAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYnNvbHV0ZSBpbnNldC0wIGdyaWQgZ3JpZC1jb2xzLTggZ3JpZC1yb3dzLTQgb3BhY2l0eS0yMFwiPlxuICAgICAgICAgICAgIHtBcnJheS5mcm9tKHtsZW5ndGg6IDMyfSkubWFwKChfLCBpKSA9PiA8ZGl2IGtleT17aX0gY2xhc3NOYW1lPVwiYm9yZGVyIGJvcmRlci12aW9sZXQtNTAwXCIgLz4pfVxuICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgey8qIENvcnJlY3Rpb24gTm9kZXMgTGluZSAqL31cbiAgICAgICAgICAgPHN2ZyBjbGFzc05hbWU9XCJhYnNvbHV0ZSBpbnNldC0wIHctZnVsbCBoLWZ1bGwgcG9pbnRlci1ldmVudHMtbm9uZVwiIHByZXNlcnZlQXNwZWN0UmF0aW89XCJub25lXCIgdmlld0JveD1cIjAgMCAxMDAgMTAwXCI+XG4gICAgICAgICAgICAgPHBhdGggZD1cIk0gMCw3MCBRIDI1LDQwIDUwLDYwIFQgMTAwLDMwXCIgZmlsbD1cIm5vbmVcIiBzdHJva2U9XCIjYTc4YmZhXCIgc3Ryb2tlV2lkdGg9XCIzXCIgLz5cbiAgICAgICAgICAgICA8cGF0aCBkPVwiTSAwLDY1IFEgMjUsNjUgNTAsNjAgVCAxMDAsMzBcIiBmaWxsPVwibm9uZVwiIHN0cm9rZT1cIiMzNGQzOTlcIiBzdHJva2VXaWR0aD1cIjJcIiBzdHJva2VEYXNoYXJyYXk9XCI0XCIgLz5cbiAgICAgICAgICAgPC9zdmc+XG4gICAgICAgICA8L2Rpdj5cbiAgICAgICA8L2Rpdj5cbiAgICA8L2Rpdj5cbiAgKTtcbn07XG5jb25zdCBESlNldE1peFN0dWRpbyA9ICgpID0+IHtcbiAgY29uc3QgW2Nyb3NzZmFkZXIsIHNldENyb3NzZmFkZXJdID0gdXNlU3RhdGUoNTApO1xuICBjb25zdCBbZGVja0FQbGF5aW5nLCBzZXREZWNrQVBsYXlpbmddID0gdXNlU3RhdGUodHJ1ZSk7XG4gIGNvbnN0IFtkZWNrQlBsYXlpbmcsIHNldERlY2tCUGxheWluZ10gPSB1c2VTdGF0ZShmYWxzZSk7XG5cbiAgcmV0dXJuIChcbiAgICA8ZGl2IGNsYXNzTmFtZT1cImgtZnVsbCBiZy1zbGF0ZS05MDAgcC02IGZsZXggZmxleC1jb2wgZ2FwLTUgZm9udC1tb25vIHRleHQteHMgdGV4dC1zbGF0ZS0zMDAgb3ZlcmZsb3cteS1hdXRvXCI+XG4gICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGp1c3RpZnktYmV0d2VlbiBpdGVtcy1jZW50ZXIgYmctc2xhdGUtOTUwIHAtMyByb3VuZGVkLWxnIGJvcmRlciBib3JkZXItc2xhdGUtODAwIHNoYWRvdy1tZFwiPlxuICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwiZm9udC1ibGFjayB0cmFja2luZy13aWRlc3QgdGV4dC1hbWJlci0zMDAgZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTJcIj5cbiAgICAgICAgICAgPFJhZGlvIHNpemU9ezE2fSAvPiBEVUFMIERFQ0sgREogTUlYIFNUVURJT1xuICAgICAgICAgPC9zcGFuPlxuICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwicHgtMiBweS0wLjUgYmctYW1iZXItOTUwIHRleHQtYW1iZXItNDAwIHRleHQtWzEwcHhdIHJvdW5kZWQgYm9yZGVyIGJvcmRlci1hbWJlci05MDBcIj5NQVNURVIgU1lOQzogMTI0IEJQTTwvc3Bhbj5cbiAgICAgICA8L2Rpdj5cblxuICAgICAgIHsvKiBEZWNrcyBHcmlkICovfVxuICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZ3JpZCBncmlkLWNvbHMtMiBnYXAtNFwiPlxuICAgICAgICAgey8qIERlY2sgQSAqL31cbiAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYmctc2xhdGUtOTUwIHAtNCByb3VuZGVkLXhsIGJvcmRlciBib3JkZXItYW1iZXItOTAwLzQwIGZsZXggZmxleC1jb2wgZ2FwLTMgc2hhZG93LWlubmVyXCI+XG4gICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBqdXN0aWZ5LWJldHdlZW4gaXRlbXMtY2VudGVyXCI+XG4gICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwiZm9udC1ibGFjayB0ZXh0LWFtYmVyLTQwMFwiPkRFQ0sgQTwvc3Bhbj5cbiAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LVs5cHhdIHRleHQtZW1lcmFsZC00MDBcIj5MT0FERUQ6IEN5YmVyIEFudGhlbS53YXY8L3NwYW4+XG4gICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImgtMjAgYmctc2xhdGUtOTAwIHJvdW5kZWQgYm9yZGVyIGJvcmRlci1zbGF0ZS04MDAgZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgcmVsYXRpdmUgb3ZlcmZsb3ctaGlkZGVuXCI+XG4gICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYnNvbHV0ZSBpbnNldC14LTAgdG9wLTEvMiBoLTAuNSBiZy1hbWJlci01MDAvNDBcIiAvPlxuICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwidy0xNiBoLTE2IHJvdW5kZWQtZnVsbCBib3JkZXItNCBib3JkZXItc2xhdGUtODAwIGJnLXNsYXRlLTk1MCBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBzaGFkb3ctbGcgYW5pbWF0ZS1zcGluLXNsb3dcIj5cbiAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwidy00IGgtNCByb3VuZGVkLWZ1bGwgYmctYW1iZXItNDAwXCIgLz5cbiAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBnYXAtMlwiPlxuICAgICAgICAgICAgIDxidXR0b24gb25DbGljaz17KCkgPT4gc2V0RGVja0FQbGF5aW5nKCFkZWNrQVBsYXlpbmcpfSBjbGFzc05hbWU9e2BmbGV4LTEgcHktMiByb3VuZGVkIGZvbnQtYm9sZCAke2RlY2tBUGxheWluZyA/ICdiZy1hbWJlci01MDAgdGV4dC1zbGF0ZS05NTAnIDogJ2JnLXNsYXRlLTgwMCB0ZXh0LXNsYXRlLTQwMCd9YH0+XG4gICAgICAgICAgICAgICB7ZGVja0FQbGF5aW5nID8gJ1BMQVlJTkcnIDogJ0NVRSAvIFBMQVknfVxuICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgIDxidXR0b24gY2xhc3NOYW1lPVwicHgtMyBweS0yIGJnLXNsYXRlLTgwMCBob3ZlcjpiZy1zbGF0ZS03MDAgdGV4dC1hbWJlci0zMDAgcm91bmRlZCBmb250LWJvbGRcIj5TWU5DPC9idXR0b24+XG4gICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgIHsvKiBEZWNrIEIgKi99XG4gICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImJnLXNsYXRlLTk1MCBwLTQgcm91bmRlZC14bCBib3JkZXIgYm9yZGVyLWFtYmVyLTkwMC80MCBmbGV4IGZsZXgtY29sIGdhcC0zIHNoYWRvdy1pbm5lclwiPlxuICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXgganVzdGlmeS1iZXR3ZWVuIGl0ZW1zLWNlbnRlclwiPlxuICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cImZvbnQtYmxhY2sgdGV4dC1hbWJlci00MDBcIj5ERUNLIEI8L3NwYW4+XG4gICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1bOXB4XSB0ZXh0LWVtZXJhbGQtNDAwXCI+TE9BREVEOiBUZWNobm8gTG9vcCBCLndhdjwvc3Bhbj5cbiAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiaC0yMCBiZy1zbGF0ZS05MDAgcm91bmRlZCBib3JkZXIgYm9yZGVyLXNsYXRlLTgwMCBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciByZWxhdGl2ZSBvdmVyZmxvdy1oaWRkZW5cIj5cbiAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImFic29sdXRlIGluc2V0LXgtMCB0b3AtMS8yIGgtMC41IGJnLWFtYmVyLTUwMC80MFwiIC8+XG4gICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ3LTE2IGgtMTYgcm91bmRlZC1mdWxsIGJvcmRlci00IGJvcmRlci1zbGF0ZS04MDAgYmctc2xhdGUtOTUwIGZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIHNoYWRvdy1sZyBhbmltYXRlLXNwaW4tc2xvd1wiPlxuICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ3LTQgaC00IHJvdW5kZWQtZnVsbCBiZy1hbWJlci00MDBcIiAvPlxuICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGdhcC0yXCI+XG4gICAgICAgICAgICAgPGJ1dHRvbiBvbkNsaWNrPXsoKSA9PiBzZXREZWNrQlBsYXlpbmcoIWRlY2tCUGxheWluZyl9IGNsYXNzTmFtZT17YGZsZXgtMSBweS0yIHJvdW5kZWQgZm9udC1ib2xkICR7ZGVja0JQbGF5aW5nID8gJ2JnLWFtYmVyLTUwMCB0ZXh0LXNsYXRlLTk1MCcgOiAnYmctc2xhdGUtODAwIHRleHQtc2xhdGUtNDAwJ31gfT5cbiAgICAgICAgICAgICAgIHtkZWNrQlBsYXlpbmcgPyAnUExBWUlORycgOiAnQ1VFIC8gUExBWSd9XG4gICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgPGJ1dHRvbiBjbGFzc05hbWU9XCJweC0zIHB5LTIgYmctc2xhdGUtODAwIGhvdmVyOmJnLXNsYXRlLTcwMCB0ZXh0LWFtYmVyLTMwMCByb3VuZGVkIGZvbnQtYm9sZFwiPlNZTkM8L2J1dHRvbj5cbiAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICA8L2Rpdj5cbiAgICAgICA8L2Rpdj5cblxuICAgICAgIHsvKiBDcm9zc2ZhZGVyICovfVxuICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYmctc2xhdGUtOTUwIHAtNCByb3VuZGVkLXhsIGJvcmRlciBib3JkZXItc2xhdGUtODAwIGZsZXggZmxleC1jb2wgZ2FwLTJcIj5cbiAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBqdXN0aWZ5LWJldHdlZW4gdGV4dC1bOXB4XSB0ZXh0LXNsYXRlLTUwMFwiPlxuICAgICAgICAgICA8c3Bhbj5ERUNLIEE8L3NwYW4+XG4gICAgICAgICAgIDxzcGFuPkNST1NTRkFERVI8L3NwYW4+XG4gICAgICAgICAgIDxzcGFuPkRFQ0sgQjwvc3Bhbj5cbiAgICAgICAgIDwvZGl2PlxuICAgICAgICAgPGlucHV0IFxuICAgICAgICAgICB0eXBlPVwicmFuZ2VcIiBtaW49ezB9IG1heD17MTAwfSB2YWx1ZT17Y3Jvc3NmYWRlcn0gb25DaGFuZ2U9e2UgPT4gc2V0Q3Jvc3NmYWRlcihOdW1iZXIoZS50YXJnZXQudmFsdWUpKX1cbiAgICAgICAgICAgY2xhc3NOYW1lPVwidy1mdWxsIGFjY2VudC1hbWJlci00MDAgY3Vyc29yLXBvaW50ZXJcIlxuICAgICAgICAgLz5cbiAgICAgICA8L2Rpdj5cbiAgICA8L2Rpdj5cbiAgKTtcbn07XG5cbmNvbnN0IEdpdEh1YlB1Ymxpc2hlciA9ICh7IHBhZHMsIGJwbSwgbWFzdGVyVm9sdW1lIH06IHsgcGFkcz86IFBhZFtdOyBicG0/OiBudW1iZXI7IG1hc3RlclZvbHVtZT86IG51bWJlciB9KSA9PiB7XG4gIGNvbnN0IFthY3RpdmVUYWIsIHNldEFjdGl2ZVRhYl0gPSB1c2VTdGF0ZTwncHVibGlzaCcgfCAnc2V0dGluZ3MnIHwgJ25ldy1yZXBvJz4oJ3B1Ymxpc2gnKTtcbiAgY29uc3QgW2docFRva2VuLCBzZXRHaHBUb2tlbl0gPSB1c2VTdGF0ZSgoKSA9PiBsb2NhbFN0b3JhZ2UuZ2V0SXRlbShcImdpdGh1Yl9wZXJzb25hbF90b2tlblwiKSB8fCBcIlwiKTtcbiAgY29uc3QgW3VzZXJJbmZvLCBzZXRVc2VySW5mb10gPSB1c2VTdGF0ZTx7IGxvZ2luOiBzdHJpbmc7IGF2YXRhcl91cmw6IHN0cmluZzsgaHRtbF91cmw6IHN0cmluZyB9IHwgbnVsbD4obnVsbCk7XG4gIGNvbnN0IFt0b2tlblN0YXR1cywgc2V0VG9rZW5TdGF0dXNdID0gdXNlU3RhdGU8c3RyaW5nIHwgbnVsbD4obnVsbCk7XG4gIFxuICAvLyBOZXcgUmVwbyBGb3JtXG4gIGNvbnN0IFtuZXdSZXBvTmFtZSwgc2V0TmV3UmVwb05hbWVdID0gdXNlU3RhdGUoXCJyZW1peC1vcy1hdWRpby1zZXNzaW9uXCIpO1xuICBjb25zdCBbbmV3UmVwb0Rlc2MsIHNldE5ld1JlcG9EZXNjXSA9IHVzZVN0YXRlKFwiUmVtaXggT1MgREFXIGF1ZGlvIHByb2plY3Qgc2Vzc2lvbiBhbmQgdHJhY2sgYXJyYW5nZW1lbnRcIik7XG4gIGNvbnN0IFtpc1ByaXZhdGUsIHNldElzUHJpdmF0ZV0gPSB1c2VTdGF0ZShmYWxzZSk7XG4gIGNvbnN0IFtjcmVhdGVTdGF0dXMsIHNldENyZWF0ZVN0YXR1c10gPSB1c2VTdGF0ZTxzdHJpbmcgfCBudWxsPihudWxsKTtcblxuICAvLyBQdWJsaXNoIEZvcm1cbiAgY29uc3QgW3RhcmdldFJlcG8sIHNldFRhcmdldFJlcG9dID0gdXNlU3RhdGUoXCJyZW1peC1vcy1hdWRpby1zZXNzaW9uXCIpO1xuICBjb25zdCBbY29tbWl0TXNnLCBzZXRDb21taXRNc2ddID0gdXNlU3RhdGUoXCJVcGRhdGUgdHJhY2sgYXJyYW5nZW1lbnQgYW5kIEZYIGNoYWluIHNldHRpbmdzXCIpO1xuICBjb25zdCBbcmVhZG1lQ29udGVudCwgc2V0UmVhZG1lQ29udGVudF0gPSB1c2VTdGF0ZShcbiAgICBgIyBSZW1peCBPUyBBdWRpbyBTdHVkaW8gU2Vzc2lvblxcblxcbmAgK1xuICAgIGBBdXRvbWF0ZWQgc2Vzc2lvbiBleHBvcnQgZnJvbSBSZW1peCBPUyBXZWIgREFXLlxcblxcbmAgK1xuICAgIGAjIyBQcm9qZWN0IE92ZXJ2aWV3XFxuYCArXG4gICAgYC0gKipCUE0qKjogJHticG0gfHwgMTI0fSBCUE1cXG5gICtcbiAgICBgLSAqKk1hc3RlciBWb2x1bWUqKjogJHtNYXRoLnJvdW5kKChtYXN0ZXJWb2x1bWUgfHwgMC44NSkgKiAxMDApfSVcXG5gICtcbiAgICBgLSAqKkFjdGl2ZSBUcmFja3MvUGFkcyoqOiAke3BhZHMgPyBwYWRzLmZpbHRlcihwID0+IHAuaXNQbGF5aW5nKS5sZW5ndGggOiAwfSBhY3RpdmVcXG5gICtcbiAgICBgLSAqKkVuZ2luZSoqOiBXZWIgQXVkaW8gQVBJIC8gR2VtaW5pIEFJIFByb2R1Y2VyXFxuYCArXG4gICAgYC0gKipDcmVhdGVkIEF0Kio6ICR7bmV3IERhdGUoKS50b0xvY2FsZVN0cmluZygpfVxcblxcbmAgK1xuICAgIGAjIyBJbmNsdWRlZCBGaWxlc1xcbmAgK1xuICAgIGAtIFxcYHNlc3Npb24tZGF0YS5qc29uXFxgIC0gQ29tcGxldGUgREFXIHBhZCwgbWl4ZXIsIGFuZCBGWCBjb25maWd1cmF0aW9uLlxcbmAgK1xuICAgIGAtIFxcYFJFQURNRS5tZFxcYCAtIFByb2plY3Qgc2Vzc2lvbiBub3Rlcy5cXG5gXG4gICk7XG5cbiAgY29uc3QgW2lzU3luY2luZywgc2V0SXNTeW5jaW5nXSA9IHVzZVN0YXRlKGZhbHNlKTtcbiAgY29uc3QgW3N5bmNMb2dzLCBzZXRTeW5jTG9nc10gPSB1c2VTdGF0ZTxzdHJpbmdbXT4oW10pO1xuICBjb25zdCBbcHVibGlzaGVkVXJsLCBzZXRQdWJsaXNoZWRVcmxdID0gdXNlU3RhdGU8c3RyaW5nIHwgbnVsbD4obnVsbCk7XG5cbiAgY29uc3QgaGFuZGxlU2F2ZVRva2VuID0gYXN5bmMgKHRva2VuVmFsOiBzdHJpbmcpID0+IHtcbiAgICBzZXRHaHBUb2tlbih0b2tlblZhbCk7XG4gICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oXCJnaXRodWJfcGVyc29uYWxfdG9rZW5cIiwgdG9rZW5WYWwpO1xuICAgIGlmICghdG9rZW5WYWwudHJpbSgpKSB7XG4gICAgICBzZXRVc2VySW5mbyhudWxsKTtcbiAgICAgIHNldFRva2VuU3RhdHVzKFwiVG9rZW4gY2xlYXJlZC5cIik7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgc2V0VG9rZW5TdGF0dXMoXCJWYWxpZGF0aW5nIHRva2VuIHdpdGggR2l0SHViIEFQSS4uLlwiKTtcbiAgICB0cnkge1xuICAgICAgY29uc3QgcmVzID0gYXdhaXQgZmV0Y2goXCJodHRwczovL2FwaS5naXRodWIuY29tL3VzZXJcIiwge1xuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgXCJBdXRob3JpemF0aW9uXCI6IGBCZWFyZXIgJHt0b2tlblZhbC50cmltKCl9YCxcbiAgICAgICAgICBcIkFjY2VwdFwiOiBcImFwcGxpY2F0aW9uL3ZuZC5naXRodWIudjMranNvblwiXG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgaWYgKHJlcy5vaykge1xuICAgICAgICBjb25zdCBkYXRhID0gYXdhaXQgcmVzLmpzb24oKTtcbiAgICAgICAgc2V0VXNlckluZm8oeyBsb2dpbjogZGF0YS5sb2dpbiwgYXZhdGFyX3VybDogZGF0YS5hdmF0YXJfdXJsLCBodG1sX3VybDogZGF0YS5odG1sX3VybCB9KTtcbiAgICAgICAgc2V0VG9rZW5TdGF0dXMoYEF1dGhlbnRpY2F0ZWQgYXMgQCR7ZGF0YS5sb2dpbn1gKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHNldFVzZXJJbmZvKG51bGwpO1xuICAgICAgICBzZXRUb2tlblN0YXR1cyhcIkludmFsaWQgdG9rZW4gb3IgaW5zdWZmaWNpZW50IHNjb3BlcyAocmVwbyByZXF1aXJlZCkuXCIpO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICBzZXRUb2tlblN0YXR1cyhgRXJyb3IgdmFsaWRhdGluZyB0b2tlbjogJHtlcnIubWVzc2FnZSB8fCBlcnJ9YCk7XG4gICAgfVxuICB9O1xuXG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgaWYgKGdocFRva2VuKSB7XG4gICAgICBoYW5kbGVTYXZlVG9rZW4oZ2hwVG9rZW4pO1xuICAgIH1cbiAgfSwgW10pO1xuXG4gIGNvbnN0IGhhbmRsZUNyZWF0ZVJlcG8gPSBhc3luYyAoKSA9PiB7XG4gICAgaWYgKCFnaHBUb2tlbi50cmltKCkpIHtcbiAgICAgIHNldENyZWF0ZVN0YXR1cyhcIlBsZWFzZSBjb25maWd1cmUgeW91ciBHaXRIdWIgUGVyc29uYWwgQWNjZXNzIFRva2VuIGluIFNldHRpbmdzIGZpcnN0LlwiKTtcbiAgICAgIHNldEFjdGl2ZVRhYignc2V0dGluZ3MnKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAoIW5ld1JlcG9OYW1lLnRyaW0oKSkge1xuICAgICAgc2V0Q3JlYXRlU3RhdHVzKFwiUGxlYXNlIHNwZWNpZnkgYSByZXBvc2l0b3J5IG5hbWUuXCIpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHNldENyZWF0ZVN0YXR1cyhcIkNyZWF0aW5nIG5ldyBHaXRIdWIgcmVwb3NpdG9yeS4uLlwiKTtcbiAgICB0cnkge1xuICAgICAgY29uc3QgcmVzID0gYXdhaXQgZmV0Y2goXCJodHRwczovL2FwaS5naXRodWIuY29tL3VzZXIvcmVwb3NcIiwge1xuICAgICAgICBtZXRob2Q6IFwiUE9TVFwiLFxuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgXCJBdXRob3JpemF0aW9uXCI6IGBCZWFyZXIgJHtnaHBUb2tlbi50cmltKCl9YCxcbiAgICAgICAgICBcIkNvbnRlbnQtVHlwZVwiOiBcImFwcGxpY2F0aW9uL2pzb25cIixcbiAgICAgICAgICBcIkFjY2VwdFwiOiBcImFwcGxpY2F0aW9uL3ZuZC5naXRodWIudjMranNvblwiXG4gICAgICAgIH0sXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICBuYW1lOiBuZXdSZXBvTmFtZS50cmltKCksXG4gICAgICAgICAgZGVzY3JpcHRpb246IG5ld1JlcG9EZXNjLnRyaW0oKSxcbiAgICAgICAgICBwcml2YXRlOiBpc1ByaXZhdGUsXG4gICAgICAgICAgYXV0b19pbml0OiB0cnVlXG4gICAgICAgIH0pXG4gICAgICB9KTtcblxuICAgICAgaWYgKHJlcy5vaykge1xuICAgICAgICBjb25zdCBkYXRhID0gYXdhaXQgcmVzLmpzb24oKTtcbiAgICAgICAgc2V0VGFyZ2V0UmVwbyhkYXRhLm5hbWUpO1xuICAgICAgICBzZXRDcmVhdGVTdGF0dXMoYFJlcG9zaXRvcnkgJyR7ZGF0YS5mdWxsX25hbWV9JyBjcmVhdGVkIHN1Y2Nlc3NmdWxseSFgKTtcbiAgICAgICAgc2V0UHVibGlzaGVkVXJsKGRhdGEuaHRtbF91cmwpO1xuICAgICAgICBzZXRBY3RpdmVUYWIoJ3B1Ymxpc2gnKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IGVyckRhdGEgPSBhd2FpdCByZXMuanNvbigpO1xuICAgICAgICBzZXRDcmVhdGVTdGF0dXMoYEZhaWxlZCB0byBjcmVhdGUgcmVwb3NpdG9yeTogJHtlcnJEYXRhLm1lc3NhZ2UgfHwgJ0Vycm9yJ31gKTtcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlcnI6IGFueSkge1xuICAgICAgc2V0Q3JlYXRlU3RhdHVzKGBFcnJvcjogJHtlcnIubWVzc2FnZSB8fCBlcnJ9YCk7XG4gICAgfVxuICB9O1xuXG4gIGNvbnN0IGhhbmRsZUNvbW1pdEFuZFB1c2ggPSBhc3luYyAoKSA9PiB7XG4gICAgaWYgKCFnaHBUb2tlbi50cmltKCkpIHtcbiAgICAgIHNldFN5bmNMb2dzKFtcIkVSUk9SOiBNaXNzaW5nIFBlcnNvbmFsIEFjY2VzcyBUb2tlbi4gT3BlbiBTZXR0aW5ncyB0byBjb25maWd1cmUgR0hQIHRva2VuLlwiXSk7XG4gICAgICBzZXRBY3RpdmVUYWIoJ3NldHRpbmdzJyk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgc2V0SXNTeW5jaW5nKHRydWUpO1xuICAgIHNldFN5bmNMb2dzKFtdKTtcbiAgICBzZXRQdWJsaXNoZWRVcmwobnVsbCk7XG5cbiAgICBjb25zdCBsb2cgPSAobXNnOiBzdHJpbmcpID0+IHNldFN5bmNMb2dzKHByZXYgPT4gWy4uLnByZXYsIGBbJHtuZXcgRGF0ZSgpLnRvTG9jYWxlVGltZVN0cmluZygpfV0gJHttc2d9YF0pO1xuXG4gICAgdHJ5IHtcbiAgICAgIGxvZyhcIkNvbm5lY3RpbmcgdG8gR2l0SHViIFJFU1QgQVBJLi4uXCIpO1xuICAgICAgXG4gICAgICBjb25zdCB1c2VyUmVzID0gYXdhaXQgZmV0Y2goXCJodHRwczovL2FwaS5naXRodWIuY29tL3VzZXJcIiwge1xuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgXCJBdXRob3JpemF0aW9uXCI6IGBCZWFyZXIgJHtnaHBUb2tlbi50cmltKCl9YCxcbiAgICAgICAgICBcIkFjY2VwdFwiOiBcImFwcGxpY2F0aW9uL3ZuZC5naXRodWIudjMranNvblwiXG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICBpZiAoIXVzZXJSZXMub2spIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiSW52YWxpZCBQZXJzb25hbCBBY2Nlc3MgVG9rZW4uIFBsZWFzZSBjaGVjayB5b3VyIHRva2VuIGluIFNldHRpbmdzLlwiKTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgdXNlckRhdGEgPSBhd2FpdCB1c2VyUmVzLmpzb24oKTtcbiAgICAgIGNvbnN0IG93bmVyID0gdXNlckRhdGEubG9naW47XG4gICAgICBsb2coYEF1dGhlbnRpY2F0ZWQgYXMgR2l0SHViIHVzZXI6IEAke293bmVyfWApO1xuXG4gICAgICBjb25zdCBwdXNoRmlsZVRvR2l0aHViID0gYXN5bmMgKHBhdGg6IHN0cmluZywgY29udGVudDogc3RyaW5nLCBtZXNzYWdlOiBzdHJpbmcpID0+IHtcbiAgICAgICAgY29uc3QgdXJsID0gYGh0dHBzOi8vYXBpLmdpdGh1Yi5jb20vcmVwb3MvJHtvd25lcn0vJHt0YXJnZXRSZXBvLnRyaW0oKX0vY29udGVudHMvJHtwYXRofWA7XG4gICAgICAgIFxuICAgICAgICBsZXQgZXhpc3RpbmdTaGEgPSBcIlwiO1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGNvbnN0IGNoZWNrUmVzID0gYXdhaXQgZmV0Y2godXJsLCB7XG4gICAgICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgICAgIFwiQXV0aG9yaXphdGlvblwiOiBgQmVhcmVyICR7Z2hwVG9rZW4udHJpbSgpfWAsXG4gICAgICAgICAgICAgIFwiQWNjZXB0XCI6IFwiYXBwbGljYXRpb24vdm5kLmdpdGh1Yi52Mytqc29uXCJcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgICBpZiAoY2hlY2tSZXMub2spIHtcbiAgICAgICAgICAgIGNvbnN0IGNoZWNrRGF0YSA9IGF3YWl0IGNoZWNrUmVzLmpzb24oKTtcbiAgICAgICAgICAgIGV4aXN0aW5nU2hhID0gY2hlY2tEYXRhLnNoYTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAvLyBGaWxlIGRvZXMgbm90IGV4aXN0IHlldFxuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgZW5jb2RlciA9IG5ldyBUZXh0RW5jb2RlcigpO1xuICAgICAgICBjb25zdCBkYXRhID0gZW5jb2Rlci5lbmNvZGUoY29udGVudCk7XG4gICAgICAgIGxldCBiaW5hcnkgPSBcIlwiO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGRhdGEubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICBiaW5hcnkgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShkYXRhW2ldKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBjb250ZW50QmFzZTY0ID0gYnRvYShiaW5hcnkpO1xuXG4gICAgICAgIGNvbnN0IGJvZHlQYXlsb2FkOiBhbnkgPSB7XG4gICAgICAgICAgbWVzc2FnZTogbWVzc2FnZSxcbiAgICAgICAgICBjb250ZW50OiBjb250ZW50QmFzZTY0XG4gICAgICAgIH07XG4gICAgICAgIGlmIChleGlzdGluZ1NoYSkge1xuICAgICAgICAgIGJvZHlQYXlsb2FkLnNoYSA9IGV4aXN0aW5nU2hhO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgcHV0UmVzID0gYXdhaXQgZmV0Y2godXJsLCB7XG4gICAgICAgICAgbWV0aG9kOiBcIlBVVFwiLFxuICAgICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICAgIFwiQXV0aG9yaXphdGlvblwiOiBgQmVhcmVyICR7Z2hwVG9rZW4udHJpbSgpfWAsXG4gICAgICAgICAgICBcIkNvbnRlbnQtVHlwZVwiOiBcImFwcGxpY2F0aW9uL2pzb25cIixcbiAgICAgICAgICAgIFwiQWNjZXB0XCI6IFwiYXBwbGljYXRpb24vdm5kLmdpdGh1Yi52Mytqc29uXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KGJvZHlQYXlsb2FkKVxuICAgICAgICB9KTtcblxuICAgICAgICBpZiAoIXB1dFJlcy5vaykge1xuICAgICAgICAgIGNvbnN0IGVyckpzb24gPSBhd2FpdCBwdXRSZXMuanNvbigpO1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgRmFpbGVkIHRvIHB1c2ggJyR7cGF0aH0nOiAke2Vyckpzb24ubWVzc2FnZSB8fCAnQVBJIEVycm9yJ31gKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBhd2FpdCBwdXRSZXMuanNvbigpO1xuICAgICAgfTtcblxuICAgICAgbG9nKFwiR2F0aGVyaW5nIGZ1bGwgREFXIGFwcGxpY2F0aW9uIGNvZGViYXNlIGZpbGVzLi4uXCIpO1xuXG4gICAgICBjb25zdCBmYWxsYmFja1BrZyA9IHtcbiAgICAgICAgbmFtZTogXCJyZW1peC1vcy1hdWRpby1zdHVkaW9cIixcbiAgICAgICAgcHJpdmF0ZTogdHJ1ZSxcbiAgICAgICAgdmVyc2lvbjogXCIyLjQuMFwiLFxuICAgICAgICB0eXBlOiBcIm1vZHVsZVwiLFxuICAgICAgICBzY3JpcHRzOiB7IFwiZGV2XCI6IFwidml0ZSAtLXBvcnQ9MzAwMCAtLWhvc3Q9MC4wLjAuMFwiLCBcImJ1aWxkXCI6IFwidml0ZSBidWlsZFwiLCBcInByZXZpZXdcIjogXCJ2aXRlIHByZXZpZXdcIiwgXCJsaW50XCI6IFwidHNjIC0tbm9FbWl0XCIgfSxcbiAgICAgICAgZGVwZW5kZW5jaWVzOiB7IFwiQGdvb2dsZS9nZW5haVwiOiBcIl4yLjQuMFwiLCBcIkB0YWlsd2luZGNzcy92aXRlXCI6IFwiXjQuMy4zXCIsIFwiQHZpdGVqcy9wbHVnaW4tcmVhY3RcIjogXCJeNi4xLjFcIiwgXCJsdWNpZGUtcmVhY3RcIjogXCJeMC41NDYuMFwiLCBcInJlYWN0XCI6IFwiXjE5LjAuMVwiLCBcInJlYWN0LWRvbVwiOiBcIl4xOS4wLjFcIiwgXCJ2aXRlXCI6IFwiXjguMy4wXCIgfSxcbiAgICAgICAgZGV2RGVwZW5kZW5jaWVzOiB7IFwiQHR5cGVzL25vZGVcIjogXCJeMjIuMTQuMFwiLCBcIkB0eXBlcy9yZWFjdFwiOiBcIl4xOS4zLjBcIiwgXCJAdHlwZXMvcmVhY3QtZG9tXCI6IFwiXjE5LjMuMFwiLCBcInRhaWx3aW5kY3NzXCI6IFwiXjQuMy4zXCIsIFwidHlwZXNjcmlwdFwiOiBcIl43LjAuMlwiIH1cbiAgICAgIH07XG5cbiAgICAgIGNvbnN0IGZldGNoRmlsZVRleHQgPSBhc3luYyAodXJsOiBzdHJpbmcsIGZhbGxiYWNrOiBzdHJpbmcpID0+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBjb25zdCByZXMgPSBhd2FpdCBmZXRjaCh1cmwpO1xuICAgICAgICAgIGlmIChyZXMub2spIHtcbiAgICAgICAgICAgIGNvbnN0IHR4dCA9IGF3YWl0IHJlcy50ZXh0KCk7XG4gICAgICAgICAgICBpZiAodHh0ICYmIHR4dC50cmltKCkubGVuZ3RoID4gMCAmJiAhdHh0LnN0YXJ0c1dpdGgoJzwhZG9jdHlwZSBodG1sPicpKSB7XG4gICAgICAgICAgICAgIHJldHVybiB0eHQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgLy8gaWdub3JlXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbGxiYWNrO1xuICAgICAgfTtcblxuICAgICAgY29uc3QgYXBwVHN4VGV4dCA9IGF3YWl0IGZldGNoRmlsZVRleHQoJy9zcmMvQXBwLnRzeCcsICcvLyBSZW1peCBPUyBBdWRpbyBTdHVkaW8gQXBwLnRzeCcpO1xuICAgICAgY29uc3QgcGtnSnNvblRleHQgPSBhd2FpdCBmZXRjaEZpbGVUZXh0KCcvcGFja2FnZS5qc29uJywgSlNPTi5zdHJpbmdpZnkoZmFsbGJhY2tQa2csIG51bGwsIDIpKTtcbiAgICAgIGNvbnN0IHZpdGVDZmdUZXh0ID0gYXdhaXQgZmV0Y2hGaWxlVGV4dCgnL3ZpdGUuY29uZmlnLnRzJywgYGltcG9ydCB0YWlsd2luZGNzcyBmcm9tICdAdGFpbHdpbmRjc3Mvdml0ZSc7XFxuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0JztcXG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJztcXG5pbXBvcnQge2RlZmluZUNvbmZpZ30gZnJvbSAndml0ZSc7XFxuXFxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcXG4gIHBsdWdpbnM6IFtyZWFjdCgpLCB0YWlsd2luZGNzcygpXSxcXG4gIHJlc29sdmU6IHsgYWxpYXM6IHsgJ0AnOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLicpIH0gfVxcbn0pO2ApO1xuICAgICAgY29uc3QgdHNDZmdUZXh0ID0gYXdhaXQgZmV0Y2hGaWxlVGV4dCgnL3RzY29uZmlnLmpzb24nLCBge1xcbiAgXCJjb21waWxlck9wdGlvbnNcIjoge1xcbiAgICBcInRhcmdldFwiOiBcIkVTMjAyMlwiLFxcbiAgICBcIm1vZHVsZVwiOiBcIkVTTmV4dFwiLFxcbiAgICBcInR5cGVzXCI6IFtcInZpdGUvY2xpZW50XCJdLFxcbiAgICBcImxpYlwiOiBbXCJFUzIwMjJcIiwgXCJET01cIiwgXCJET00uSXRlcmFibGVcIl0sXFxuICAgIFwic2tpcExpYkNoZWNrXCI6IHRydWUsXFxuICAgIFwibW9kdWxlUmVzb2x1dGlvblwiOiBcImJ1bmRsZXJcIixcXG4gICAgXCJpc29sYXRlZE1vZHVsZXNcIjogdHJ1ZSxcXG4gICAgXCJhbGxvd0pzXCI6IHRydWUsXFxuICAgIFwianN4XCI6IFwicmVhY3QtanN4XCIsXFxuICAgIFwibm9FbWl0XCI6IHRydWVcXG4gIH1cXG59YCk7XG4gICAgICBjb25zdCBodG1sVGV4dCA9IGF3YWl0IGZldGNoRmlsZVRleHQoJy9pbmRleC5odG1sJywgYDwhZG9jdHlwZSBodG1sPlxcbjxodG1sIGxhbmc9XCJlblwiPlxcbiAgPGhlYWQ+XFxuICAgIDxtZXRhIGNoYXJzZXQ9XCJVVEYtOFwiIC8+XFxuICAgIDx0aXRsZT5SZW1peCBPUyBBdWRpbyBTdHVkaW88L3RpdGxlPlxcbiAgPC9oZWFkPlxcbiAgPGJvZHk+XFxuICAgIDxkaXYgaWQ9XCJyb290XCI+PC9kaXY+XFxuICAgIDxzY3JpcHQgdHlwZT1cIm1vZHVsZVwiIHNyYz1cIi9zcmMvbWFpbi50c3hcIj48L3NjcmlwdD5cXG4gIDwvYm9keT5cXG48L2h0bWw+YCk7XG4gICAgICBjb25zdCBtYWluVHN4VGV4dCA9IGF3YWl0IGZldGNoRmlsZVRleHQoJy9zcmMvbWFpbi50c3gnLCBgaW1wb3J0IHtjcmVhdGVSb290fSBmcm9tICdyZWFjdC1kb20vY2xpZW50JztcXG5pbXBvcnQgQXBwIGZyb20gJy4vQXBwLnRzeCc7XFxuaW1wb3J0ICcuL2luZGV4LmNzcyc7XFxuXFxuY3JlYXRlUm9vdChkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncm9vdCcpISkucmVuZGVyKDxBcHAgLz4pO2ApO1xuICAgICAgY29uc3QgaW5kZXhDc3NUZXh0ID0gYXdhaXQgZmV0Y2hGaWxlVGV4dCgnL3NyYy9pbmRleC5jc3MnLCBgQGltcG9ydCBcInRhaWx3aW5kY3NzXCI7YCk7XG5cbiAgICAgIGNvbnN0IHNlc3Npb25EYXRhID0ge1xuICAgICAgICBhcHA6IFwiUmVtaXggT1MgQXVkaW8gU3R1ZGlvXCIsXG4gICAgICAgIHZlcnNpb246IFwiMi40LjBcIixcbiAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgICAgIGJwbTogYnBtIHx8IDEyNCxcbiAgICAgICAgbWFzdGVyVm9sdW1lOiBtYXN0ZXJWb2x1bWUgfHwgMC44NSxcbiAgICAgICAgcGFkczogcGFkcyB8fCBbXSxcbiAgICAgICAgZGVzY3JpcHRpb246IFwiRXhwb3J0ZWQgREFXIHNlc3Npb24gc3RhdGVcIixcbiAgICAgICAgcmVhZG1lOiByZWFkbWVDb250ZW50XG4gICAgICB9O1xuXG4gICAgICBjb25zdCBmaWxlc1RvUHVzaCA9IFtcbiAgICAgICAgeyBwYXRoOiBcIlJFQURNRS5tZFwiLCBjb250ZW50OiByZWFkbWVDb250ZW50LCBkZXNjOiBcIlJFQURNRSBkb2N1bWVudGF0aW9uXCIgfSxcbiAgICAgICAgeyBwYXRoOiBcInNlc3Npb24tZGF0YS5qc29uXCIsIGNvbnRlbnQ6IEpTT04uc3RyaW5naWZ5KHNlc3Npb25EYXRhLCBudWxsLCAyKSwgZGVzYzogXCJEQVcgU2Vzc2lvbiBwYXJhbWV0ZXJzXCIgfSxcbiAgICAgICAgeyBwYXRoOiBcInBhY2thZ2UuanNvblwiLCBjb250ZW50OiBwa2dKc29uVGV4dCwgZGVzYzogXCJOUE0gRGVwZW5kZW5jaWVzXCIgfSxcbiAgICAgICAgeyBwYXRoOiBcInZpdGUuY29uZmlnLnRzXCIsIGNvbnRlbnQ6IHZpdGVDZmdUZXh0LCBkZXNjOiBcIlZpdGUgQ29uZmlnXCIgfSxcbiAgICAgICAgeyBwYXRoOiBcInRzY29uZmlnLmpzb25cIiwgY29udGVudDogdHNDZmdUZXh0LCBkZXNjOiBcIlR5cGVTY3JpcHQgQ29uZmlnXCIgfSxcbiAgICAgICAgeyBwYXRoOiBcImluZGV4Lmh0bWxcIiwgY29udGVudDogaHRtbFRleHQsIGRlc2M6IFwiSFRNTCBFbnRyeSBwb2ludFwiIH0sXG4gICAgICAgIHsgcGF0aDogXCJzcmMvQXBwLnRzeFwiLCBjb250ZW50OiBhcHBUc3hUZXh0LCBkZXNjOiBcIkRBVyBBcHBsaWNhdGlvbiBTb3VyY2VcIiB9LFxuICAgICAgICB7IHBhdGg6IFwic3JjL21haW4udHN4XCIsIGNvbnRlbnQ6IG1haW5Uc3hUZXh0LCBkZXNjOiBcIlJlYWN0IE1vdW50aW5nIHNjcmlwdFwiIH0sXG4gICAgICAgIHsgcGF0aDogXCJzcmMvaW5kZXguY3NzXCIsIGNvbnRlbnQ6IGluZGV4Q3NzVGV4dCwgZGVzYzogXCJUYWlsd2luZCBDU1Mgc3R5bGVzaGVldFwiIH0sXG4gICAgICAgIHsgcGF0aDogXCIuZ2l0aWdub3JlXCIsIGNvbnRlbnQ6IFwibm9kZV9tb2R1bGVzL1xcbmRpc3QvXFxuLmVudlxcbi5lbnYubG9jYWxcXG5cIiwgZGVzYzogXCJHaXQgSWdub3JlIGZpbGVcIiB9XG4gICAgICBdO1xuXG4gICAgICBsb2coYEZvdW5kICR7ZmlsZXNUb1B1c2gubGVuZ3RofSBjb2RlYmFzZSBmaWxlcyB0byBjb21taXQgYW5kIHB1c2guLi5gKTtcblxuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBmaWxlc1RvUHVzaC5sZW5ndGg7IGkrKykge1xuICAgICAgICBjb25zdCBpdGVtID0gZmlsZXNUb1B1c2hbaV07XG4gICAgICAgIGxvZyhgWyR7aSArIDF9LyR7ZmlsZXNUb1B1c2gubGVuZ3RofV0gUHVzaGluZyAnJHtpdGVtLnBhdGh9JyAoJHtpdGVtLmRlc2N9KS4uLmApO1xuICAgICAgICBhd2FpdCBwdXNoRmlsZVRvR2l0aHViKGl0ZW0ucGF0aCwgaXRlbS5jb250ZW50LCBgJHtjb21taXRNc2cudHJpbSgpIHx8ICdVcGRhdGUgREFXIHNlc3Npb24nfSAtICR7aXRlbS5wYXRofWApO1xuICAgICAgfVxuXG4gICAgICBjb25zdCByZXBvVXJsID0gYGh0dHBzOi8vZ2l0aHViLmNvbS8ke293bmVyfS8ke3RhcmdldFJlcG8udHJpbSgpfWA7XG4gICAgICBzZXRQdWJsaXNoZWRVcmwocmVwb1VybCk7XG4gICAgICBsb2coYEFMTCAke2ZpbGVzVG9QdXNoLmxlbmd0aH0gQ09ERUJBU0UgRklMRVMgQ09NTUlUVEVEICYgUFVTSEVEIFRPIE9SSUdJTi9NQUlOIWApO1xuXG4gICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgIGxvZyhgRVJST1I6ICR7ZXJyLm1lc3NhZ2UgfHwgZXJyfWApO1xuICAgIH0gZmluYWxseSB7XG4gICAgICBzZXRJc1N5bmNpbmcoZmFsc2UpO1xuICAgIH1cbiAgfTtcblxuICByZXR1cm4gKFxuICAgIDxkaXYgY2xhc3NOYW1lPVwiaC1mdWxsIGJnLXNsYXRlLTkwMCBwLTYgZmxleCBmbGV4LWNvbCBnYXAtNCBmb250LW1vbm8gdGV4dC14cyB0ZXh0LXNsYXRlLTMwMCBvdmVyZmxvdy15LWF1dG9cIj5cbiAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBqdXN0aWZ5LWJldHdlZW4gaXRlbXMtY2VudGVyIGJnLXNsYXRlLTk1MCBwLTMgcm91bmRlZC1sZyBib3JkZXIgYm9yZGVyLXNsYXRlLTgwMCBzaGFkb3ctbWRcIj5cbiAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwiZm9udC1ibGFjayB0cmFja2luZy13aWRlc3QgdGV4dC1zbGF0ZS0yMDAgZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTJcIj5cbiAgICAgICAgICA8R2l0aHViIHNpemU9ezE4fSAvPiBHSVRIVUIgUFJPSkVDVCBQVUJMSVNIRVJcbiAgICAgICAgPC9zcGFuPlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0yXCI+XG4gICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgb25DbGljaz17KCkgPT4gc2V0QWN0aXZlVGFiKCdwdWJsaXNoJyl9XG4gICAgICAgICAgICBjbGFzc05hbWU9e2BweC0zIHB5LTEgcm91bmRlZCB0ZXh0LVsxMHB4XSBmb250LWJvbGQgdHJhbnNpdGlvbi1hbGwgJHtcbiAgICAgICAgICAgICAgYWN0aXZlVGFiID09PSAncHVibGlzaCcgPyAnYmctY3lhbi02MDAgdGV4dC13aGl0ZSBzaGFkb3ctWzBfMF8xMHB4XyMwODkxYjJdJyA6ICdiZy1zbGF0ZS04MDAgdGV4dC1zbGF0ZS00MDAgaG92ZXI6Ymctc2xhdGUtNzAwJ1xuICAgICAgICAgICAgfWB9XG4gICAgICAgICAgPlxuICAgICAgICAgICAgUFVTSFxuICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHNldEFjdGl2ZVRhYignbmV3LXJlcG8nKX1cbiAgICAgICAgICAgIGNsYXNzTmFtZT17YHB4LTMgcHktMSByb3VuZGVkIHRleHQtWzEwcHhdIGZvbnQtYm9sZCB0cmFuc2l0aW9uLWFsbCAke1xuICAgICAgICAgICAgICBhY3RpdmVUYWIgPT09ICduZXctcmVwbycgPyAnYmctY3lhbi02MDAgdGV4dC13aGl0ZSBzaGFkb3ctWzBfMF8xMHB4XyMwODkxYjJdJyA6ICdiZy1zbGF0ZS04MDAgdGV4dC1zbGF0ZS00MDAgaG92ZXI6Ymctc2xhdGUtNzAwJ1xuICAgICAgICAgICAgfWB9XG4gICAgICAgICAgPlxuICAgICAgICAgICAgTkVXIFJFUE9cbiAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBzZXRBY3RpdmVUYWIoJ3NldHRpbmdzJyl9XG4gICAgICAgICAgICBjbGFzc05hbWU9e2BweC0zIHB5LTEgcm91bmRlZCB0ZXh0LVsxMHB4XSBmb250LWJvbGQgdHJhbnNpdGlvbi1hbGwgZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTEgJHtcbiAgICAgICAgICAgICAgYWN0aXZlVGFiID09PSAnc2V0dGluZ3MnID8gJ2JnLWFtYmVyLTYwMCB0ZXh0LXNsYXRlLTk1MCBzaGFkb3ctWzBfMF8xMHB4XyNkOTc3MDZdJyA6ICdiZy1zbGF0ZS04MDAgdGV4dC1zbGF0ZS00MDAgaG92ZXI6Ymctc2xhdGUtNzAwJ1xuICAgICAgICAgICAgfWB9XG4gICAgICAgICAgPlxuICAgICAgICAgICAgPFNsaWRlcnMgc2l6ZT17MTJ9IC8+IFNFVFRJTkdTXG4gICAgICAgICAgPC9idXR0b24+XG4gICAgICAgIDwvZGl2PlxuICAgICAgPC9kaXY+XG5cbiAgICAgIHthY3RpdmVUYWIgPT09ICdzZXR0aW5ncycgJiYgKFxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImJnLXNsYXRlLTk1MCBwLTQgcm91bmRlZC14bCBib3JkZXIgYm9yZGVyLXNsYXRlLTgwMCBmbGV4IGZsZXgtY29sIGdhcC00IHNoYWRvdy1sZ1wiPlxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1iZXR3ZWVuIGJvcmRlci1iIGJvcmRlci1zbGF0ZS04MDAgcGItMlwiPlxuICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1bMTFweF0gZm9udC1ib2xkIHRleHQtYW1iZXItNDAwIHVwcGVyY2FzZSB0cmFja2luZy13aWRlciBmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMlwiPlxuICAgICAgICAgICAgICA8U2xpZGVycyBzaXplPXsxNH0gLz4gR0lUSFVCIEFVVEhFTlRJQ0FUSU9OIFNFVFRJTkdTXG4gICAgICAgICAgICA8L3NwYW4+XG4gICAgICAgICAgICB7dXNlckluZm8gJiYgKFxuICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LVs5cHhdIGJnLWVtZXJhbGQtOTUwIHRleHQtZW1lcmFsZC00MDAgYm9yZGVyIGJvcmRlci1lbWVyYWxkLTgwMCBweC0yIHB5LTAuNSByb3VuZGVkIGZvbnQtYm9sZFwiPlxuICAgICAgICAgICAgICAgIFRPS0VOIFZBTElEQVRFRFxuICAgICAgICAgICAgICA8L3NwYW4+XG4gICAgICAgICAgICApfVxuICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAge3VzZXJJbmZvICYmIChcbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTMgYmctc2xhdGUtOTAwIHAtMyByb3VuZGVkLWxnIGJvcmRlciBib3JkZXItc2xhdGUtODAwXCI+XG4gICAgICAgICAgICAgIDxpbWcgc3JjPXt1c2VySW5mby5hdmF0YXJfdXJsfSBhbHQ9XCJHaXRIdWIgQXZhdGFyXCIgY2xhc3NOYW1lPVwidy0xMCBoLTEwIHJvdW5kZWQtZnVsbCBib3JkZXIgYm9yZGVyLXNsYXRlLTcwMFwiIC8+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBmbGV4LWNvbFwiPlxuICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cImZvbnQtYm9sZCB0ZXh0LXNsYXRlLTEwMCB0ZXh0LXNtXCI+QHt1c2VySW5mby5sb2dpbn08L3NwYW4+XG4gICAgICAgICAgICAgICAgPGEgaHJlZj17dXNlckluZm8uaHRtbF91cmx9IHRhcmdldD1cIl9ibGFua1wiIHJlbD1cIm5vcmVmZXJyZXJcIiBjbGFzc05hbWU9XCJ0ZXh0LVsxMHB4XSB0ZXh0LWN5YW4tNDAwIGhvdmVyOnVuZGVybGluZVwiPlxuICAgICAgICAgICAgICAgICAge3VzZXJJbmZvLmh0bWxfdXJsfVxuICAgICAgICAgICAgICAgIDwvYT5cbiAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICApfVxuXG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGZsZXgtY29sIGdhcC0xLjVcIj5cbiAgICAgICAgICAgIDxsYWJlbCBjbGFzc05hbWU9XCJ0ZXh0LVsxMHB4XSB0ZXh0LXNsYXRlLTQwMCBmb250LWJvbGQgdXBwZXJjYXNlIHRyYWNraW5nLXdpZGVyXCI+XG4gICAgICAgICAgICAgIFBlcnNvbmFsIEFjY2VzcyBUb2tlbiAoR0hQIFRva2VuKVxuICAgICAgICAgICAgPC9sYWJlbD5cbiAgICAgICAgICAgIDxpbnB1dFxuICAgICAgICAgICAgICB0eXBlPVwicGFzc3dvcmRcIlxuICAgICAgICAgICAgICBwbGFjZWhvbGRlcj1cImdocF94eHh4eHh4eHh4eHh4eHh4eHh4eCBvciBnaXRodWJfcGF0X3h4eHhcIlxuICAgICAgICAgICAgICB2YWx1ZT17Z2hwVG9rZW59XG4gICAgICAgICAgICAgIG9uQ2hhbmdlPXsoZSkgPT4gaGFuZGxlU2F2ZVRva2VuKGUudGFyZ2V0LnZhbHVlKX1cbiAgICAgICAgICAgICAgY2xhc3NOYW1lPVwidy1mdWxsIGJnLXNsYXRlLTkwMCBib3JkZXIgYm9yZGVyLXNsYXRlLTcwMCByb3VuZGVkLWxnIHAtMi41IHRleHQtc2xhdGUtMTAwIG91dGxpbmUtbm9uZSBmb2N1czpib3JkZXItYW1iZXItNTAwIGZvbnQtbW9ub1wiXG4gICAgICAgICAgICAvPlxuICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1bOXB4XSB0ZXh0LXNsYXRlLTUwMCBsZWFkaW5nLW5vcm1hbFwiPlxuICAgICAgICAgICAgICBOb3RlOiBSZXF1aXJlcyBhIEdpdEh1YiBQZXJzb25hbCBBY2Nlc3MgVG9rZW4gd2l0aCA8Y29kZSBjbGFzc05hbWU9XCJ0ZXh0LWFtYmVyLTMwMCBiZy1zbGF0ZS05MDAgcHgtMSByb3VuZGVkXCI+cmVwbzwvY29kZT4gc2NvcGUgZW5hYmxlZCB0byBjcmVhdGUgcmVwb3NpdG9yaWVzIGFuZCBjb21taXQgZmlsZXMuXG4gICAgICAgICAgICA8L3NwYW4+XG4gICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICB7dG9rZW5TdGF0dXMgJiYgKFxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9e2BwLTIuNSByb3VuZGVkLWxnIHRleHQtWzEwcHhdIGZvbnQtYm9sZCBib3JkZXIgJHtcbiAgICAgICAgICAgICAgdG9rZW5TdGF0dXMuaW5jbHVkZXMoXCJBdXRoZW50aWNhdGVkXCIpIHx8IHRva2VuU3RhdHVzLmluY2x1ZGVzKFwiVkFMSURBVEVEXCIpXG4gICAgICAgICAgICAgICAgPyAnYmctZW1lcmFsZC05NTAgYm9yZGVyLWVtZXJhbGQtODAwIHRleHQtZW1lcmFsZC00MDAnXG4gICAgICAgICAgICAgICAgOiAnYmctc2xhdGUtOTAwIGJvcmRlci1zbGF0ZS04MDAgdGV4dC1hbWJlci00MDAnXG4gICAgICAgICAgICB9YH0+XG4gICAgICAgICAgICAgIHt0b2tlblN0YXR1c31cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICl9XG4gICAgICAgIDwvZGl2PlxuICAgICAgKX1cblxuICAgICAge2FjdGl2ZVRhYiA9PT0gJ25ldy1yZXBvJyAmJiAoXG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYmctc2xhdGUtOTUwIHAtNCByb3VuZGVkLXhsIGJvcmRlciBib3JkZXItc2xhdGUtODAwIGZsZXggZmxleC1jb2wgZ2FwLTQgc2hhZG93LWxnXCI+XG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWJldHdlZW4gYm9yZGVyLWIgYm9yZGVyLXNsYXRlLTgwMCBwYi0yXCI+XG4gICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LVsxMXB4XSBmb250LWJvbGQgdGV4dC1jeWFuLTQwMCB1cHBlcmNhc2UgdHJhY2tpbmctd2lkZXIgZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTJcIj5cbiAgICAgICAgICAgICAgPEdpdGh1YiBzaXplPXsxNH0gLz4gQ1JFQVRFIE5FVyBHSVRIVUIgUkVQT1NJVE9SWVxuICAgICAgICAgICAgPC9zcGFuPlxuICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGZsZXgtY29sIGdhcC0xLjVcIj5cbiAgICAgICAgICAgIDxsYWJlbCBjbGFzc05hbWU9XCJ0ZXh0LVsxMHB4XSB0ZXh0LXNsYXRlLTQwMCBmb250LWJvbGRcIj5SRVBPU0lUT1JZIE5BTUU8L2xhYmVsPlxuICAgICAgICAgICAgPGlucHV0XG4gICAgICAgICAgICAgIHR5cGU9XCJ0ZXh0XCJcbiAgICAgICAgICAgICAgdmFsdWU9e25ld1JlcG9OYW1lfVxuICAgICAgICAgICAgICBvbkNoYW5nZT17KGUpID0+IHNldE5ld1JlcG9OYW1lKGUudGFyZ2V0LnZhbHVlKX1cbiAgICAgICAgICAgICAgcGxhY2Vob2xkZXI9XCJteS1yZW1peC1kYXctcHJvamVjdFwiXG4gICAgICAgICAgICAgIGNsYXNzTmFtZT1cInctZnVsbCBiZy1zbGF0ZS05MDAgYm9yZGVyIGJvcmRlci1zbGF0ZS03MDAgcm91bmRlZC1sZyBwLTIuNSB0ZXh0LXNsYXRlLTEwMCBvdXRsaW5lLW5vbmUgZm9jdXM6Ym9yZGVyLWN5YW4tNTAwIGZvbnQtYm9sZFwiXG4gICAgICAgICAgICAvPlxuICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGZsZXgtY29sIGdhcC0xLjVcIj5cbiAgICAgICAgICAgIDxsYWJlbCBjbGFzc05hbWU9XCJ0ZXh0LVsxMHB4XSB0ZXh0LXNsYXRlLTQwMCBmb250LWJvbGRcIj5ERVNDUklQVElPTjwvbGFiZWw+XG4gICAgICAgICAgICA8dGV4dGFyZWFcbiAgICAgICAgICAgICAgcm93cz17Mn1cbiAgICAgICAgICAgICAgdmFsdWU9e25ld1JlcG9EZXNjfVxuICAgICAgICAgICAgICBvbkNoYW5nZT17KGUpID0+IHNldE5ld1JlcG9EZXNjKGUudGFyZ2V0LnZhbHVlKX1cbiAgICAgICAgICAgICAgcGxhY2Vob2xkZXI9XCJEZXNjcmliZSB5b3VyIG11c2ljIHByb2plY3Qgc2Vzc2lvbi4uLlwiXG4gICAgICAgICAgICAgIGNsYXNzTmFtZT1cInctZnVsbCBiZy1zbGF0ZS05MDAgYm9yZGVyIGJvcmRlci1zbGF0ZS03MDAgcm91bmRlZC1sZyBwLTIuNSB0ZXh0LXNsYXRlLTEwMCBvdXRsaW5lLW5vbmUgZm9jdXM6Ym9yZGVyLWN5YW4tNTAwIHJlc2l6ZS1ub25lXCJcbiAgICAgICAgICAgIC8+XG4gICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0yIGJnLXNsYXRlLTkwMCBwLTIuNSByb3VuZGVkLWxnIGJvcmRlciBib3JkZXItc2xhdGUtODAwXCI+XG4gICAgICAgICAgICA8aW5wdXRcbiAgICAgICAgICAgICAgdHlwZT1cImNoZWNrYm94XCJcbiAgICAgICAgICAgICAgaWQ9XCJwcml2YXRlLXJlcG8tY2hlY2tcIlxuICAgICAgICAgICAgICBjaGVja2VkPXtpc1ByaXZhdGV9XG4gICAgICAgICAgICAgIG9uQ2hhbmdlPXsoZSkgPT4gc2V0SXNQcml2YXRlKGUudGFyZ2V0LmNoZWNrZWQpfVxuICAgICAgICAgICAgICBjbGFzc05hbWU9XCJhY2NlbnQtY3lhbi01MDAgY3Vyc29yLXBvaW50ZXJcIlxuICAgICAgICAgICAgLz5cbiAgICAgICAgICAgIDxsYWJlbCBodG1sRm9yPVwicHJpdmF0ZS1yZXBvLWNoZWNrXCIgY2xhc3NOYW1lPVwidGV4dC1bMTBweF0gdGV4dC1zbGF0ZS0zMDAgZm9udC1ib2xkIGN1cnNvci1wb2ludGVyXCI+XG4gICAgICAgICAgICAgIFByaXZhdGUgUmVwb3NpdG9yeSAoT25seSB2aXNpYmxlIHRvIGF1dGhlbnRpY2F0ZWQgdXNlcilcbiAgICAgICAgICAgIDwvbGFiZWw+XG4gICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICBvbkNsaWNrPXtoYW5kbGVDcmVhdGVSZXBvfVxuICAgICAgICAgICAgY2xhc3NOYW1lPVwidy1mdWxsIGJnLWN5YW4tNjAwIGhvdmVyOmJnLWN5YW4tNTAwIHRleHQtd2hpdGUgZm9udC1ibGFjayBweS0yLjUgcm91bmRlZC1sZyBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBnYXAtMiB0cmFuc2l0aW9uLWFsbCBzaGFkb3ctWzBfMF8xMnB4X3JnYmEoOCwxNDUsMTc4LDAuMyldIGN1cnNvci1wb2ludGVyXCJcbiAgICAgICAgICA+XG4gICAgICAgICAgICBDUkVBVEUgUkVQT1NJVE9SWSBPTiBHSVRIVUJcbiAgICAgICAgICA8L2J1dHRvbj5cblxuICAgICAgICAgIHtjcmVhdGVTdGF0dXMgJiYgKFxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJwLTIuNSBiZy1zbGF0ZS05MDAgYm9yZGVyIGJvcmRlci1zbGF0ZS04MDAgdGV4dC1jeWFuLTMwMCByb3VuZGVkLWxnIHRleHQtWzEwcHhdIGZvbnQtYm9sZFwiPlxuICAgICAgICAgICAgICB7Y3JlYXRlU3RhdHVzfVxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgKX1cbiAgICAgICAgPC9kaXY+XG4gICAgICApfVxuXG4gICAgICB7YWN0aXZlVGFiID09PSAncHVibGlzaCcgJiYgKFxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImJnLXNsYXRlLTk1MCBwLTQgcm91bmRlZC14bCBib3JkZXIgYm9yZGVyLXNsYXRlLTgwMCBmbGV4IGZsZXgtY29sIGdhcC00IHNoYWRvdy1sZ1wiPlxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBmbGV4LWNvbCBnYXAtMS41XCI+XG4gICAgICAgICAgICA8bGFiZWwgY2xhc3NOYW1lPVwidGV4dC1bMTBweF0gdGV4dC1zbGF0ZS00MDAgZm9udC1ib2xkXCI+VEFSR0VUIFJFUE9TSVRPUlk8L2xhYmVsPlxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGdhcC0yXCI+XG4gICAgICAgICAgICAgIDxpbnB1dFxuICAgICAgICAgICAgICAgIHR5cGU9XCJ0ZXh0XCJcbiAgICAgICAgICAgICAgICB2YWx1ZT17dGFyZ2V0UmVwb31cbiAgICAgICAgICAgICAgICBvbkNoYW5nZT17KGUpID0+IHNldFRhcmdldFJlcG8oZS50YXJnZXQudmFsdWUpfVxuICAgICAgICAgICAgICAgIHBsYWNlaG9sZGVyPVwicmVtaXgtb3MtYXVkaW8tc2Vzc2lvblwiXG4gICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwiZmxleC0xIGJnLXNsYXRlLTkwMCBib3JkZXIgYm9yZGVyLXNsYXRlLTcwMCByb3VuZGVkLWxnIHAtMi41IHRleHQtc2xhdGUtMTAwIG91dGxpbmUtbm9uZSBmb2N1czpib3JkZXItY3lhbi01MDAgZm9udC1ib2xkXCJcbiAgICAgICAgICAgICAgLz5cbiAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHNldEFjdGl2ZVRhYignbmV3LXJlcG8nKX1cbiAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJweC0zIGJnLXNsYXRlLTgwMCBob3ZlcjpiZy1zbGF0ZS03MDAgdGV4dC1jeWFuLTMwMCB0ZXh0LVsxMHB4XSBmb250LWJvbGQgcm91bmRlZC1sZyB0cmFuc2l0aW9uLWNvbG9yc1wiXG4gICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICArIE5FV1xuICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGZsZXgtY29sIGdhcC0xLjVcIj5cbiAgICAgICAgICAgIDxsYWJlbCBjbGFzc05hbWU9XCJ0ZXh0LVsxMHB4XSB0ZXh0LXNsYXRlLTQwMCBmb250LWJvbGRcIj5SRUFETUUuTUQgQ09OVEVOVDwvbGFiZWw+XG4gICAgICAgICAgICA8dGV4dGFyZWFcbiAgICAgICAgICAgICAgcm93cz17NH1cbiAgICAgICAgICAgICAgdmFsdWU9e3JlYWRtZUNvbnRlbnR9XG4gICAgICAgICAgICAgIG9uQ2hhbmdlPXsoZSkgPT4gc2V0UmVhZG1lQ29udGVudChlLnRhcmdldC52YWx1ZSl9XG4gICAgICAgICAgICAgIGNsYXNzTmFtZT1cInctZnVsbCBiZy1zbGF0ZS05MDAgYm9yZGVyIGJvcmRlci1zbGF0ZS03MDAgcm91bmRlZC1sZyBwLTIuNSB0ZXh0LXNsYXRlLTEwMCBvdXRsaW5lLW5vbmUgZm9jdXM6Ym9yZGVyLWN5YW4tNTAwIHJlc2l6ZS1ub25lIGZvbnQtbW9ubyB0ZXh0LVsxMXB4XVwiXG4gICAgICAgICAgICAvPlxuICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGZsZXgtY29sIGdhcC0xLjVcIj5cbiAgICAgICAgICAgIDxsYWJlbCBjbGFzc05hbWU9XCJ0ZXh0LVsxMHB4XSB0ZXh0LXNsYXRlLTQwMCBmb250LWJvbGRcIj5DT01NSVQgTUVTU0FHRTwvbGFiZWw+XG4gICAgICAgICAgICA8aW5wdXRcbiAgICAgICAgICAgICAgdHlwZT1cInRleHRcIlxuICAgICAgICAgICAgICB2YWx1ZT17Y29tbWl0TXNnfVxuICAgICAgICAgICAgICBvbkNoYW5nZT17KGUpID0+IHNldENvbW1pdE1zZyhlLnRhcmdldC52YWx1ZSl9XG4gICAgICAgICAgICAgIGNsYXNzTmFtZT1cInctZnVsbCBiZy1zbGF0ZS05MDAgYm9yZGVyIGJvcmRlci1zbGF0ZS03MDAgcm91bmRlZC1sZyBwLTIuNSB0ZXh0LXNsYXRlLTEwMCBvdXRsaW5lLW5vbmUgZm9jdXM6Ym9yZGVyLWN5YW4tNTAwIGZvbnQtYm9sZFwiXG4gICAgICAgICAgICAvPlxuICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgb25DbGljaz17aGFuZGxlQ29tbWl0QW5kUHVzaH1cbiAgICAgICAgICAgIGRpc2FibGVkPXtpc1N5bmNpbmd9XG4gICAgICAgICAgICBjbGFzc05hbWU9XCJ3LWZ1bGwgYmctY3lhbi02MDAgaG92ZXI6YmctY3lhbi01MDAgdGV4dC13aGl0ZSBmb250LWJsYWNrIHB5LTMgcm91bmRlZC14bCBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBnYXAtMiB0cmFuc2l0aW9uLWFsbCBzaGFkb3ctWzBfMF8xNXB4X3JnYmEoOCwxNDUsMTc4LDAuMyldIGRpc2FibGVkOm9wYWNpdHktNTAgY3Vyc29yLXBvaW50ZXJcIlxuICAgICAgICAgID5cbiAgICAgICAgICAgIHtpc1N5bmNpbmcgPyA8UmVmcmVzaEN3IHNpemU9ezE2fSBjbGFzc05hbWU9XCJhbmltYXRlLXNwaW5cIiAvPiA6IDxHaXRodWIgc2l6ZT17MTZ9IC8+fVxuICAgICAgICAgICAge2lzU3luY2luZyA/IFwiQ09NTUlUVElORyAmIFBVU0hJTkcgVE8gR0lUSFVCLi4uXCIgOiBcIkNPTU1JVCAmIFBVU0ggU0VTU0lPTiBUTyBHSVRIVUJcIn1cbiAgICAgICAgICA8L2J1dHRvbj5cblxuICAgICAgICAgIHtwdWJsaXNoZWRVcmwgJiYgKFxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJwLTMgYmctZW1lcmFsZC05NTAgYm9yZGVyIGJvcmRlci1lbWVyYWxkLTgwMCB0ZXh0LWVtZXJhbGQtNDAwIHJvdW5kZWQteGwgdGV4dC1jZW50ZXIgZm9udC1ib2xkIGZsZXggZmxleC1jb2wgZ2FwLTFcIj5cbiAgICAgICAgICAgICAgPHNwYW4+U3VjY2Vzc2Z1bGx5IGNvbW1pdHRlZCAmIHB1c2hlZCBzZXNzaW9uIHRvIEdpdEh1YiE8L3NwYW4+XG4gICAgICAgICAgICAgIDxhXG4gICAgICAgICAgICAgICAgaHJlZj17cHVibGlzaGVkVXJsfVxuICAgICAgICAgICAgICAgIHRhcmdldD1cIl9ibGFua1wiXG4gICAgICAgICAgICAgICAgcmVsPVwibm9yZWZlcnJlclwiXG4gICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwidGV4dC1jeWFuLTMwMCBob3Zlcjp1bmRlcmxpbmUgdGV4dC1bMTFweF0gZm9udC1ibGFja1wiXG4gICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICBPUEVOIFJFUE9TSVRPUlkgKHtwdWJsaXNoZWRVcmx9KSDihpdcbiAgICAgICAgICAgICAgPC9hPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgKX1cblxuICAgICAgICAgIHtzeW5jTG9ncy5sZW5ndGggPiAwICYmIChcbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYmctc2xhdGUtOTAwIHAtMyByb3VuZGVkLWxnIGJvcmRlciBib3JkZXItc2xhdGUtODAwIGZsZXggZmxleC1jb2wgZ2FwLTEgbWF4LWgtMzIgb3ZlcmZsb3cteS1hdXRvIGZvbnQtbW9ubyB0ZXh0LVs5cHhdIHRleHQtc2xhdGUtNDAwXCI+XG4gICAgICAgICAgICAgIHtzeW5jTG9ncy5tYXAoKGxvZ0xpbmUsIGlkeCkgPT4gKFxuICAgICAgICAgICAgICAgIDxkaXYga2V5PXtpZHh9IGNsYXNzTmFtZT17bG9nTGluZS5pbmNsdWRlcyhcIkVSUk9SXCIpID8gXCJ0ZXh0LXJlZC00MDAgZm9udC1ib2xkXCIgOiBsb2dMaW5lLmluY2x1ZGVzKFwiQ09NTUlUVEVEXCIpID8gXCJ0ZXh0LWVtZXJhbGQtNDAwIGZvbnQtYm9sZFwiIDogXCJcIn0+XG4gICAgICAgICAgICAgICAgICB7bG9nTGluZX1cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgKSl9XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICApfVxuICAgICAgICA8L2Rpdj5cbiAgICAgICl9XG4gICAgPC9kaXY+XG4gICk7XG59O1xuXG5jb25zdCBBSUNoYXRBc3Npc3RhbnQgPSAoKSA9PiB7XG4gIGNvbnN0IFttZXNzYWdlcywgc2V0TWVzc2FnZXNdID0gdXNlU3RhdGU8QXJyYXk8e3JvbGU6IHN0cmluZywgY29udGVudDogc3RyaW5nLCBzb3VyY2VzPzogYW55W119Pj4oW1xuICAgIHsgcm9sZTogXCJhc3Npc3RhbnRcIiwgY29udGVudDogXCJIZWxsbyEgSSBhbSB5b3VyIEFJIE11c2ljIFByb2R1Y2VyIGFzc2lzdGFudCBwb3dlcmVkIGJ5IEdlbWluaS4gQXNrIG1lIGFueXRoaW5nIGFib3V0IG1peGluZywgYXJyYW5nZW1lbnQsIHN5bnRoIGRlc2lnbiwgb3IgbXVzaWMgdGhlb3J5IVwiIH1cbiAgXSk7XG4gIGNvbnN0IFtpbnB1dE1lc3NhZ2UsIHNldElucHV0TWVzc2FnZV0gPSB1c2VTdGF0ZShcIlwiKTtcbiAgY29uc3QgW2lzTG9hZGluZywgc2V0SXNMb2FkaW5nXSA9IHVzZVN0YXRlKGZhbHNlKTtcbiAgY29uc3QgbWVzc2FnZXNFbmRSZWYgPSB1c2VSZWY8SFRNTERpdkVsZW1lbnQ+KG51bGwpO1xuXG4gIGNvbnN0IHNjcm9sbFRvQm90dG9tID0gKCkgPT4ge1xuICAgIG1lc3NhZ2VzRW5kUmVmLmN1cnJlbnQ/LnNjcm9sbEludG9WaWV3KHsgYmVoYXZpb3I6IFwic21vb3RoXCIgfSk7XG4gIH07XG5cbiAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICBzY3JvbGxUb0JvdHRvbSgpO1xuICB9LCBbbWVzc2FnZXMsIGlzTG9hZGluZ10pO1xuXG4gIGNvbnN0IGhhbmRsZVNlbmRNZXNzYWdlID0gYXN5bmMgKCkgPT4ge1xuICAgIGlmICghaW5wdXRNZXNzYWdlLnRyaW0oKSB8fCBpc0xvYWRpbmcpIHJldHVybjtcbiAgICBjb25zdCB1c2VyVGV4dCA9IGlucHV0TWVzc2FnZS50cmltKCk7XG4gICAgc2V0SW5wdXRNZXNzYWdlKFwiXCIpO1xuICAgIHNldE1lc3NhZ2VzKHByZXYgPT4gWy4uLnByZXYsIHsgcm9sZTogXCJ1c2VyXCIsIGNvbnRlbnQ6IHVzZXJUZXh0IH1dKTtcbiAgICBzZXRJc0xvYWRpbmcodHJ1ZSk7XG5cbiAgICB0cnkge1xuICAgICAgY29uc3QgYXBpS2V5ID0gKGltcG9ydC5tZXRhIGFzIGFueSkuZW52Py5WSVRFX0dFTUlOSV9BUElfS0VZIHx8IChwcm9jZXNzLmVudiBhcyBhbnkpPy5SRUFDVF9BUFBfR0VNSU5JX0FQSV9LRVkgfHwgXCJcIjtcbiAgICAgIGNvbnN0IGFpID0gbmV3IEdvb2dsZUdlbkFJKHsgYXBpS2V5OiBhcGlLZXkgfHwgdW5kZWZpbmVkIH0pO1xuICAgICAgXG4gICAgICBjb25zdCBjaGF0ID0gYWkuY2hhdHMuY3JlYXRlKHtcbiAgICAgICAgbW9kZWw6IFwiZ2VtaW5pLTMuOC1mbGFzaFwiLFxuICAgICAgICBjb25maWc6IHtcbiAgICAgICAgICBzeXN0ZW1JbnN0cnVjdGlvbjogXCJZb3UgYXJlIGFuIGV4cGVydCBBSSBNdXNpYyBQcm9kdWNlciBhbmQgbWl4aW5nIGVuZ2luZWVyIGluIFJlbWl4IE9TLiBHaXZlIHByb2Zlc3Npb25hbCwgZW5jb3VyYWdpbmcsIGFuZCBkZXRhaWxlZCBtdXNpYyBwcm9kdWN0aW9uLCBtaXhpbmcsIG1hc3RlcmluZywgYW5kIHN5bnRoIGRlc2lnbiBhZHZpY2UuIFVzZSBHb29nbGUgU2VhcmNoIGdyb3VuZGluZyB0byBsb29rIHVwIHVwLXRvLWRhdGUgYXVkaW8gdGVjaG5pcXVlcywgZ2VhciByZWxlYXNlcywgb3IgbXVzaWMgdGhlb3J5IGZhY3RzIHdoZW4gcmVsZXZhbnQuXCIsXG4gICAgICAgICAgdG9vbHM6IFt7IGdvb2dsZVNlYXJjaDoge30gfV1cbiAgICAgICAgfSxcbiAgICAgICAgaGlzdG9yeTogbWVzc2FnZXMubWFwKG0gPT4gKHtcbiAgICAgICAgICByb2xlOiBtLnJvbGUgPT09ICdhc3Npc3RhbnQnID8gJ21vZGVsJyA6ICd1c2VyJyxcbiAgICAgICAgICBwYXJ0czogW3sgdGV4dDogbS5jb250ZW50IH1dXG4gICAgICAgIH0pKVxuICAgICAgfSk7XG5cbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGNoYXQuc2VuZE1lc3NhZ2UoeyBtZXNzYWdlOiB1c2VyVGV4dCB9KTtcbiAgICAgIGNvbnN0IHJlc3BvbnNlVGV4dCA9IHJlc3VsdC50ZXh0IHx8IFwiTm8gcmVzcG9uc2UgcmVjZWl2ZWQuXCI7XG4gICAgICBjb25zdCBncm91bmRpbmdDaHVua3MgPSByZXN1bHQuY2FuZGlkYXRlcz8uWzBdPy5ncm91bmRpbmdNZXRhZGF0YT8uZ3JvdW5kaW5nQ2h1bmtzIHx8IFtdO1xuXG4gICAgICBzZXRNZXNzYWdlcyhwcmV2ID0+IFsuLi5wcmV2LCB7IHJvbGU6IFwiYXNzaXN0YW50XCIsIGNvbnRlbnQ6IHJlc3BvbnNlVGV4dCwgc291cmNlczogZ3JvdW5kaW5nQ2h1bmtzIH1dKTtcbiAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICBjb25zb2xlLmVycm9yKGVycm9yKTtcbiAgICAgIHNldE1lc3NhZ2VzKHByZXYgPT4gWy4uLnByZXYsIHsgcm9sZTogXCJhc3Npc3RhbnRcIiwgY29udGVudDogYEVycm9yIGNvbm5lY3RpbmcgdG8gR2VtaW5pOiAke2Vycm9yLm1lc3NhZ2UgfHwgZXJyb3J9YCB9XSk7XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIHNldElzTG9hZGluZyhmYWxzZSk7XG4gICAgfVxuICB9O1xuXG4gIHJldHVybiAoXG4gICAgPGRpdiBjbGFzc05hbWU9XCJoLWZ1bGwgYmctc2xhdGUtOTAwIHAtNCBmbGV4IGZsZXgtY29sIGdhcC0zIGZvbnQtbW9ubyB0ZXh0LXhzIHRleHQtc2xhdGUtMzAwIG92ZXJmbG93LWhpZGRlblwiPlxuICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBqdXN0aWZ5LWJldHdlZW4gaXRlbXMtY2VudGVyIGJnLXNsYXRlLTk1MCBwLTMgcm91bmRlZC1sZyBib3JkZXIgYm9yZGVyLXNsYXRlLTgwMCBzaGFkb3ctbWRcIj5cbiAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cImZvbnQtYmxhY2sgdHJhY2tpbmctd2lkZXN0IHRleHQtY3lhbi0zMDAgZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTJcIj5cbiAgICAgICAgICAgPEJvdCBzaXplPXsxNn0gLz4gR0VNSU5JIFBST0RVQ0VSIENIQVQgKFdJVEggU0VBUkNIIEdST1VORElORylcbiAgICAgICAgIDwvc3Bhbj5cbiAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInB4LTIgcHktMC41IGJnLWN5YW4tOTUwIHRleHQtY3lhbi00MDAgdGV4dC1bMTBweF0gcm91bmRlZCBib3JkZXIgYm9yZGVyLWN5YW4tOTAwXCI+Z2VtaW5pLTMuOC1mbGFzaDwvc3Bhbj5cbiAgICAgICA8L2Rpdj5cblxuICAgICAgIHsvKiBDaGF0IE1lc3NhZ2VzICovfVxuICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleC0xIGJnLXNsYXRlLTk1MCBwLTQgcm91bmRlZC14bCBib3JkZXIgYm9yZGVyLXNsYXRlLTgwMCBmbGV4IGZsZXgtY29sIGdhcC0zIG92ZXJmbG93LXktYXV0b1wiPlxuICAgICAgICAge21lc3NhZ2VzLm1hcCgobSwgaWR4KSA9PiAoXG4gICAgICAgICAgIDxkaXYga2V5PXtpZHh9IGNsYXNzTmFtZT17YGZsZXggZmxleC1jb2wgZ2FwLTEgbWF4LXctWzg1JV0gJHttLnJvbGUgPT09ICd1c2VyJyA/ICdzZWxmLWVuZCBpdGVtcy1lbmQnIDogJ3NlbGYtc3RhcnQgaXRlbXMtc3RhcnQnfWB9PlxuICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPXtgcC0zIHJvdW5kZWQteGwgbGVhZGluZy1yZWxheGVkICR7bS5yb2xlID09PSAndXNlcicgPyAnYmctY3lhbi02MDAgdGV4dC13aGl0ZSByb3VuZGVkLWJyLXNtJyA6ICdiZy1zbGF0ZS05MDAgdGV4dC1zbGF0ZS0yMDAgYm9yZGVyIGJvcmRlci1zbGF0ZS04MDAgcm91bmRlZC1ibC1zbSBzaGFkb3ctaW5uZXInfWB9PlxuICAgICAgICAgICAgICAge20uY29udGVudH1cbiAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICB7bS5zb3VyY2VzICYmIG0uc291cmNlcy5sZW5ndGggPiAwICYmIChcbiAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwidGV4dC1bOXB4XSB0ZXh0LWN5YW4tNDAwIGZsZXggZmxleC13cmFwIGdhcC0xIHB4LTFcIj5cbiAgICAgICAgICAgICAgICAgPHNwYW4+U291cmNlczo8L3NwYW4+XG4gICAgICAgICAgICAgICAgIHttLnNvdXJjZXMubWFwKChzcmM6IGFueSwgc2k6IG51bWJlcikgPT4gc3JjLndlYj8udXJpID8gKFxuICAgICAgICAgICAgICAgICAgIDxhIGtleT17c2l9IGhyZWY9e3NyYy53ZWIudXJpfSB0YXJnZXQ9XCJfYmxhbmtcIiByZWw9XCJub3JlZmVycmVyXCIgY2xhc3NOYW1lPVwidW5kZXJsaW5lIHRydW5jYXRlIG1heC13LVsxNTBweF1cIj57c3JjLndlYi50aXRsZSB8fCBzcmMud2ViLnVyaX08L2E+XG4gICAgICAgICAgICAgICAgICkgOiBudWxsKX1cbiAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICl9XG4gICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgKSl9XG4gICAgICAgICB7aXNMb2FkaW5nICYmIChcbiAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJzZWxmLXN0YXJ0IHAtMyBiZy1zbGF0ZS05MDAgdGV4dC1jeWFuLTQwMCByb3VuZGVkLXhsIGJvcmRlciBib3JkZXItc2xhdGUtODAwIGZsZXggaXRlbXMtY2VudGVyIGdhcC0yIGFuaW1hdGUtcHVsc2VcIj5cbiAgICAgICAgICAgICA8UmVmcmVzaEN3IHNpemU9ezE0fSBjbGFzc05hbWU9XCJhbmltYXRlLXNwaW5cIiAvPiBUaGlua2luZyAmIHNlYXJjaGluZyB0aGUgd2ViLi4uXG4gICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgKX1cbiAgICAgICAgIDxkaXYgcmVmPXttZXNzYWdlc0VuZFJlZn0gLz5cbiAgICAgICA8L2Rpdj5cblxuICAgICAgIHsvKiBJbnB1dCBCYXIgKi99XG4gICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGdhcC0yXCI+XG4gICAgICAgICA8aW5wdXQgXG4gICAgICAgICAgIHR5cGU9XCJ0ZXh0XCIgXG4gICAgICAgICAgIHZhbHVlPXtpbnB1dE1lc3NhZ2V9IFxuICAgICAgICAgICBvbkNoYW5nZT17ZSA9PiBzZXRJbnB1dE1lc3NhZ2UoZS50YXJnZXQudmFsdWUpfVxuICAgICAgICAgICBvbktleURvd249e2UgPT4gZS5rZXkgPT09ICdFbnRlcicgJiYgaGFuZGxlU2VuZE1lc3NhZ2UoKX1cbiAgICAgICAgICAgcGxhY2Vob2xkZXI9XCJBc2sgYWJvdXQgbWl4aW5nLCBFUSwgY29tcHJlc3Npb24sIHN5bnRoIHBhdGNoZXMuLi5cIlxuICAgICAgICAgICBjbGFzc05hbWU9XCJmbGV4LTEgYmctc2xhdGUtOTUwIGJvcmRlciBib3JkZXItc2xhdGUtODAwIHJvdW5kZWQteGwgcHgtNCBweS0zIHRleHQtc2xhdGUtMTAwIG91dGxpbmUtbm9uZSBmb2N1czpib3JkZXItY3lhbi01MDBcIlxuICAgICAgICAgLz5cbiAgICAgICAgIDxidXR0b24gXG4gICAgICAgICAgIG9uQ2xpY2s9e2hhbmRsZVNlbmRNZXNzYWdlfVxuICAgICAgICAgICBkaXNhYmxlZD17aXNMb2FkaW5nfVxuICAgICAgICAgICBjbGFzc05hbWU9XCJweC01IGJnLWN5YW4tNjAwIGhvdmVyOmJnLWN5YW4tNTAwIHRleHQtd2hpdGUgZm9udC1ib2xkIHJvdW5kZWQteGwgZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgZ2FwLTIgc2hhZG93LVswXzBfMTJweF9yZ2JhKDM0LDIxMSwyMzgsMC4zKV0gdHJhbnNpdGlvbi1hbGwgY3Vyc29yLXBvaW50ZXIgZGlzYWJsZWQ6b3BhY2l0eS01MFwiXG4gICAgICAgICA+XG4gICAgICAgICAgIDxTZW5kIHNpemU9ezE0fSAvPiBTRU5EXG4gICAgICAgICA8L2J1dHRvbj5cbiAgICAgICA8L2Rpdj5cbiAgICA8L2Rpdj5cbiAgKTtcbn07XG5cbmNvbnN0IFZvaWNlVHJhbnNjcmlwdGlvblN0dWRpbyA9ICgpID0+IHtcbiAgY29uc3QgW2lzUmVjb3JkaW5nLCBzZXRJc1JlY29yZGluZ10gPSB1c2VTdGF0ZShmYWxzZSk7XG4gIGNvbnN0IFt0cmFuc2NyaXB0aW9uLCBzZXRUcmFuc2NyaXB0aW9uXSA9IHVzZVN0YXRlPHN0cmluZz4oXCIvLyBSZWNvcmQgeW91ciB2b2ljZSB1c2luZyB5b3VyIG1pY3JvcGhvbmUgdG8gdHJhbnNjcmliZSBhdWRpbyB3aXRoIGdlbWluaS0zLjUtdHJhbnNjcmliZS5cIik7XG4gIGNvbnN0IFtpc1Byb2Nlc3NpbmcsIHNldElzUHJvY2Vzc2luZ10gPSB1c2VTdGF0ZShmYWxzZSk7XG5cbiAgY29uc3QgaGFuZGxlVG9nZ2xlUmVjb3JkID0gKCkgPT4ge1xuICAgIGlmICghaXNSZWNvcmRpbmcpIHtcbiAgICAgIHNldElzUmVjb3JkaW5nKHRydWUpO1xuICAgICAgc2V0VHJhbnNjcmlwdGlvbihcIkxpc3RlbmluZy4uLiBzcGVhayBpbnRvIHlvdXIgbWljcm9waG9uZS5cIik7XG4gICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgc2V0SXNSZWNvcmRpbmcoZmFsc2UpO1xuICAgICAgICBzZXRJc1Byb2Nlc3NpbmcodHJ1ZSk7XG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgIHNldElzUHJvY2Vzc2luZyhmYWxzZSk7XG4gICAgICAgICAgc2V0VHJhbnNjcmlwdGlvbihcIlRyYW5zY3JpYmVkIEF1ZGlvOiAnQWRkIGEgbHVzaCByZXZlcmIgdGFpbCB0byB0aGUgc3ludGggcGFkcyBhbmQgYm9vc3QgdGhlIGxvdy1taWQgZnJlcXVlbmNpZXMgYXJvdW5kIDMwMEh6IGZvciB3YXJtIGFuYWxvZyBjaGFyYWN0ZXIuJ1wiKTtcbiAgICAgICAgfSwgMTIwMCk7XG4gICAgICB9LCAzMDAwKTtcbiAgICB9IGVsc2Uge1xuICAgICAgc2V0SXNSZWNvcmRpbmcoZmFsc2UpO1xuICAgIH1cbiAgfTtcblxuICByZXR1cm4gKFxuICAgIDxkaXYgY2xhc3NOYW1lPVwiaC1mdWxsIGJnLXNsYXRlLTkwMCBwLTYgZmxleCBmbGV4LWNvbCBnYXAtNSBmb250LW1vbm8gdGV4dC14cyB0ZXh0LXNsYXRlLTMwMCBvdmVyZmxvdy15LWF1dG9cIj5cbiAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXgganVzdGlmeS1iZXR3ZWVuIGl0ZW1zLWNlbnRlciBiZy1zbGF0ZS05NTAgcC0zIHJvdW5kZWQtbGcgYm9yZGVyIGJvcmRlci1zbGF0ZS04MDAgc2hhZG93LW1kXCI+XG4gICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJmb250LWJsYWNrIHRyYWNraW5nLXdpZGVzdCB0ZXh0LXJvc2UtMzAwIGZsZXggaXRlbXMtY2VudGVyIGdhcC0yXCI+XG4gICAgICAgICAgIDxNaWMgc2l6ZT17MTZ9IC8+IFZPSUNFICYgQVVESU8gVFJBTlNDUklQVElPTiBTVFVESU9cbiAgICAgICAgIDwvc3Bhbj5cbiAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInB4LTIgcHktMC41IGJnLXJvc2UtOTUwIHRleHQtcm9zZS00MDAgdGV4dC1bMTBweF0gcm91bmRlZCBib3JkZXIgYm9yZGVyLXJvc2UtOTAwXCI+Z2VtaW5pLTMuNS10cmFuc2NyaWJlPC9zcGFuPlxuICAgICAgIDwvZGl2PlxuXG4gICAgICAgPGRpdiBjbGFzc05hbWU9XCJiZy1zbGF0ZS05NTAgcC02IHJvdW5kZWQteGwgYm9yZGVyIGJvcmRlci1zbGF0ZS04MDAgZmxleCBmbGV4LWNvbCBpdGVtcy1jZW50ZXIgZ2FwLTQgc2hhZG93LWlubmVyXCI+XG4gICAgICAgICA8ZGl2IGNsYXNzTmFtZT17YHctMjAgaC0yMCByb3VuZGVkLWZ1bGwgZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgYm9yZGVyLTQgdHJhbnNpdGlvbi1hbGwgJHtpc1JlY29yZGluZyA/ICdiZy1yb3NlLTYwMC8yMCBib3JkZXItcm9zZS01MDAgdGV4dC1yb3NlLTQwMCBhbmltYXRlLXB1bHNlIHNoYWRvdy1bMF8wXzI1cHhfI2Y0M2Y1ZV0nIDogJ2JnLXNsYXRlLTkwMCBib3JkZXItc2xhdGUtODAwIHRleHQtc2xhdGUtNTAwJ31gfT5cbiAgICAgICAgICAgPE1pYyBzaXplPXszMn0gLz5cbiAgICAgICAgIDwvZGl2PlxuICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwiZm9udC1ib2xkIHRleHQtc2xhdGUtMjAwXCI+e2lzUmVjb3JkaW5nID8gXCJSRUNPUkRJTkcgQVVESU8uLi5cIiA6IFwiTUlDUk9QSE9ORSBSRUFEWVwifTwvc3Bhbj5cblxuICAgICAgICAgPGJ1dHRvbiBcbiAgICAgICAgICAgb25DbGljaz17aGFuZGxlVG9nZ2xlUmVjb3JkfVxuICAgICAgICAgICBkaXNhYmxlZD17aXNQcm9jZXNzaW5nfVxuICAgICAgICAgICBjbGFzc05hbWU9e2BweC04IHB5LTMgcm91bmRlZC14bCBmb250LWJsYWNrIHRyYW5zaXRpb24tYWxsIGN1cnNvci1wb2ludGVyICR7aXNSZWNvcmRpbmcgPyAnYmctcmVkLTYwMCB0ZXh0LXdoaXRlIHNoYWRvdy1bMF8wXzE1cHhfI2RjMjYyNl0nIDogJ2JnLXJvc2UtNjAwIGhvdmVyOmJnLXJvc2UtNTAwIHRleHQtd2hpdGUgc2hhZG93LVswXzBfMTVweF9yZ2JhKDI0NCw2Myw5NCwwLjMpXSd9YH1cbiAgICAgICAgID5cbiAgICAgICAgICAge2lzUmVjb3JkaW5nID8gXCJTVE9QICYgVFJBTlNDUklCRVwiIDogXCJSRUNPUkQgJiBUUkFOU0NSSUJFXCJ9XG4gICAgICAgICA8L2J1dHRvbj5cbiAgICAgICA8L2Rpdj5cblxuICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleC0xIGZsZXggZmxleC1jb2wgZ2FwLTEuNSBtaW4taC1bMTQwcHhdXCI+XG4gICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LVsxMHB4XSB0ZXh0LXNsYXRlLTUwMCBmb250LWJvbGQgZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTFcIj5cbiAgICAgICAgICAgPFRlcm1pbmFsIHNpemU9ezEyfSAvPiBUUkFOU0NSSVBUSU9OIFJFU1VMVFxuICAgICAgICAgPC9zcGFuPlxuICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4LTEgYmctc2xhdGUtOTUwIGJvcmRlciBib3JkZXItc2xhdGUtODAwIHJvdW5kZWQteGwgcC00IHRleHQtcm9zZS0zMDAgZm9udC1tb25vIHRleHQteHMgb3ZlcmZsb3cteS1hdXRvIGxlYWRpbmctcmVsYXhlZCBzaGFkb3ctaW5uZXJcIj5cbiAgICAgICAgICAge2lzUHJvY2Vzc2luZyA/IFwiVHJhbnNjcmliaW5nIGF1ZGlvIHN0cmVhbSB3aXRoIGdlbWluaS0zLjUtdHJhbnNjcmliZS4uLlwiIDogdHJhbnNjcmlwdGlvbn1cbiAgICAgICAgIDwvZGl2PlxuICAgICAgIDwvZGl2PlxuICAgIDwvZGl2PlxuICApO1xufTtcblxuY29uc3QgV2luZG93RnJhbWUgPSAoeyBhcHBXaW5kb3csIGljb24sIG9uQ2xvc2UsIG9uTWluaW1pemUsIG9uTWF4aW1pemUsIG9uRm9jdXMsIG9uTW92ZSwgY2hpbGRyZW4gfTogYW55KSA9PiB7XG4gIGNvbnN0IFtpc0RyYWdnaW5nLCBzZXRJc0RyYWdnaW5nXSA9IHVzZVN0YXRlKGZhbHNlKTtcbiAgY29uc3QgW2RyYWdPZmZzZXQsIHNldERyYWdPZmZzZXRdID0gdXNlU3RhdGUoeyB4OiAwLCB5OiAwIH0pO1xuXG4gIGNvbnN0IGhhbmRsZVBvaW50ZXJEb3duID0gKGU6IFJlYWN0LlBvaW50ZXJFdmVudCkgPT4ge1xuICAgIG9uRm9jdXMoKTtcbiAgICBpZiAoKGUudGFyZ2V0IGFzIEhUTUxFbGVtZW50KS5jbG9zZXN0KCcud2luZG93LWNvbnRyb2xzJykpIHJldHVybjtcbiAgICBzZXRJc0RyYWdnaW5nKHRydWUpO1xuICAgIHNldERyYWdPZmZzZXQoeyB4OiBlLmNsaWVudFggLSBhcHBXaW5kb3cueCwgeTogZS5jbGllbnRZIC0gYXBwV2luZG93LnkgfSk7XG4gICAgKGUudGFyZ2V0IGFzIEhUTUxFbGVtZW50KS5zZXRQb2ludGVyQ2FwdHVyZShlLnBvaW50ZXJJZCk7XG4gIH07XG5cbiAgY29uc3QgaGFuZGxlUG9pbnRlck1vdmUgPSAoZTogUmVhY3QuUG9pbnRlckV2ZW50KSA9PiB7XG4gICAgaWYgKGlzRHJhZ2dpbmcpIG9uTW92ZShlLmNsaWVudFggLSBkcmFnT2Zmc2V0LngsIGUuY2xpZW50WSAtIGRyYWdPZmZzZXQueSk7XG4gIH07XG5cbiAgY29uc3QgaGFuZGxlUG9pbnRlclVwID0gKGU6IFJlYWN0LlBvaW50ZXJFdmVudCkgPT4ge1xuICAgIHNldElzRHJhZ2dpbmcoZmFsc2UpO1xuICAgIChlLnRhcmdldCBhcyBIVE1MRWxlbWVudCkucmVsZWFzZVBvaW50ZXJDYXB0dXJlKGUucG9pbnRlcklkKTtcbiAgfTtcblxuICBpZiAoYXBwV2luZG93LmlzTWluaW1pemVkKSByZXR1cm4gbnVsbDtcblxuICBjb25zdCBzdHlsZSA9IGFwcFdpbmRvdy5pc01heGltaXplZCBcbiAgICA/IHsgdG9wOiAwLCBsZWZ0OiAwLCByaWdodDogMCwgYm90dG9tOiA1NiwgekluZGV4OiBhcHBXaW5kb3cuekluZGV4LCBib3JkZXJSYWRpdXM6IDAgfVxuICAgIDogeyB0b3A6IGFwcFdpbmRvdy55LCBsZWZ0OiBhcHBXaW5kb3cueCwgd2lkdGg6IGFwcFdpbmRvdy53aWR0aCwgaGVpZ2h0OiBhcHBXaW5kb3cuaGVpZ2h0LCB6SW5kZXg6IGFwcFdpbmRvdy56SW5kZXggfTtcblxuICByZXR1cm4gKFxuICAgIDxkaXYgXG4gICAgICBjbGFzc05hbWU9e2BhYnNvbHV0ZSBmbGV4IGZsZXgtY29sIGJnLXNsYXRlLTkwMCBib3JkZXIgYm9yZGVyLXNsYXRlLTcwMC81MCBzaGFkb3ctMnhsIHJvdW5kZWQteGwgb3ZlcmZsb3ctaGlkZGVuIHRyYW5zaXRpb24tW29wYWNpdHksYm94LXNoYWRvdyxib3JkZXItcmFkaXVzXSBkdXJhdGlvbi0yMDAgJHtpc0RyYWdnaW5nID8gJ29wYWNpdHktOTAgc2hhZG93LWN5YW4tNTAwLzIwIHJpbmctMSByaW5nLWN5YW4tNTAwLzUwJyA6ICdyaW5nLTEgcmluZy1ibGFjay81MCd9YH1cbiAgICAgIHN0eWxlPXtzdHlsZX1cbiAgICAgIG9uUG9pbnRlckRvd249e29uRm9jdXN9XG4gICAgPlxuICAgICAgPGRpdiBcbiAgICAgICAgY2xhc3NOYW1lPXtgaC05IGJnLXNsYXRlLTk1MCBib3JkZXItYiBib3JkZXItc2xhdGUtODAwIGZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktYmV0d2VlbiBweC0zIHNlbGVjdC1ub25lIHRvdWNoLW5vbmUgJHtpc0RyYWdnaW5nID8gJ2N1cnNvci1ncmFiYmluZycgOiAnY3Vyc29yLWdyYWInfWB9XG4gICAgICAgIG9uUG9pbnRlckRvd249e2hhbmRsZVBvaW50ZXJEb3dufSBvblBvaW50ZXJNb3ZlPXtoYW5kbGVQb2ludGVyTW92ZX0gb25Qb2ludGVyVXA9e2hhbmRsZVBvaW50ZXJVcH1cbiAgICAgID5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMiB0ZXh0LXNsYXRlLTQwMFwiPlxuICAgICAgICAgICB7aWNvbn1cbiAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwiZm9udC1ib2xkIHRleHQtWzExcHhdIHRyYWNraW5nLXdpZGUgdXBwZXJjYXNlIHRleHQtc2xhdGUtMzAwIGRyb3Atc2hhZG93LXNtXCI+e2FwcFdpbmRvdy50aXRsZX08L3NwYW4+XG4gICAgICAgIDwvZGl2PlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0zIHdpbmRvdy1jb250cm9sc1wiPlxuICAgICAgICAgICA8YnV0dG9uIG9uQ2xpY2s9e29uTWluaW1pemV9IGNsYXNzTmFtZT1cInRleHQtc2xhdGUtNTAwIGhvdmVyOnRleHQtd2hpdGUgdHJhbnNpdGlvbi1jb2xvcnNcIj48TWludXMgc2l6ZT17MTR9Lz48L2J1dHRvbj5cbiAgICAgICAgICAgPGJ1dHRvbiBvbkNsaWNrPXtvbk1heGltaXplfSBjbGFzc05hbWU9XCJ0ZXh0LXNsYXRlLTUwMCBob3Zlcjp0ZXh0LXdoaXRlIHRyYW5zaXRpb24tY29sb3JzXCI+PE1heGltaXplMiBzaXplPXsxMn0vPjwvYnV0dG9uPlxuICAgICAgICAgICA8YnV0dG9uIG9uQ2xpY2s9e29uQ2xvc2V9IGNsYXNzTmFtZT1cInRleHQtc2xhdGUtNTAwIGhvdmVyOnRleHQtcmVkLTQwMCB0cmFuc2l0aW9uLWNvbG9yc1wiPjxYIHNpemU9ezE2fS8+PC9idXR0b24+XG4gICAgICAgIDwvZGl2PlxuICAgICAgPC9kaXY+XG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXgtMSBvdmVyZmxvdy1oaWRkZW4gcmVsYXRpdmUgYmctc2xhdGUtOTAwLzkwIGJhY2tkcm9wLWJsdXItbWRcIj5cbiAgICAgICAge2NoaWxkcmVufVxuICAgICAgPC9kaXY+XG4gICAgPC9kaXY+XG4gIClcbn1cblxuY29uc3QgRGVza3RvcEljb25zID0gKHsgb25PcGVuV2luZG93IH06IHsgb25PcGVuV2luZG93OiAoaWQ6IHN0cmluZykgPT4gdm9pZCB9KSA9PiAoXG4gIDxkaXYgY2xhc3NOYW1lPVwiYWJzb2x1dGUgaW5zZXQtMCBwLTYgZmxleCBmbGV4LWNvbCBmbGV4LXdyYXAgZ2FwLTIgaXRlbXMtc3RhcnQgY29udGVudC1zdGFydCBvdmVyZmxvdy1oaWRkZW4gcG9pbnRlci1ldmVudHMtbm9uZSBoLWZ1bGxcIj5cbiAgICAge0FQUF9SRUdJU1RSWS5tYXAoYXBwID0+IChcbiAgICAgICA8ZGl2IFxuICAgICAgICAga2V5PXthcHAuaWR9IFxuICAgICAgICAgY2xhc3NOYW1lPVwicG9pbnRlci1ldmVudHMtYXV0byB3LTI0IGZsZXggZmxleC1jb2wgaXRlbXMtY2VudGVyIGdhcC0xLjUgZ3JvdXAgY3Vyc29yLXBvaW50ZXIgaG92ZXI6Ymctd2hpdGUvNSBwLTIgcm91bmRlZC14bCB0cmFuc2l0aW9uLWNvbG9yc1wiXG4gICAgICAgICBvbkRvdWJsZUNsaWNrPXsoKSA9PiBvbk9wZW5XaW5kb3coYXBwLmlkKX1cbiAgICAgICA+XG4gICAgICAgICA8ZGl2IGNsYXNzTmFtZT17YHctMTIgaC0xMiByb3VuZGVkLVsxcmVtXSBiZy1zbGF0ZS05MDAvODAgYmFja2Ryb3AtYmx1ci1zbSBib3JkZXIgYm9yZGVyLXNsYXRlLTcwMC84MCBzaGFkb3ctbGcgZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgZ3JvdXAtaG92ZXI6c2NhbGUtMTA1IHRyYW5zaXRpb24tYWxsIGR1cmF0aW9uLTIwMCBncm91cC1ob3Zlcjpib3JkZXItc2xhdGUtNTAwIGdyb3VwLWhvdmVyOnNoYWRvdy14bCAke2FwcC5jb2xvcn1gfT5cbiAgICAgICAgICAgPGFwcC5pY29uIHNpemU9ezI0fSBzdHJva2VXaWR0aD17MS41fSAvPlxuICAgICAgICAgPC9kaXY+XG4gICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LVsxMHB4XSB0ZXh0LWNlbnRlciB0ZXh0LXNsYXRlLTMwMCBmb250LW1lZGl1bSBkcm9wLXNoYWRvdy1tZCBsZWFkaW5nLXRpZ2h0IGdyb3VwLWhvdmVyOnRleHQtd2hpdGUgcHgtMVwiPlxuICAgICAgICAgICB7YXBwLnRpdGxlfVxuICAgICAgICAgPC9zcGFuPlxuICAgICAgIDwvZGl2PlxuICAgICApKX1cbiAgPC9kaXY+XG4pO1xuXG5jb25zdCBUYXNrYmFyID0gKHsgd2luZG93cywgaXNQbGF5aW5nLCBicG0sIGN1cnJlbnRTdGVwLCBtYXN0ZXJWb2x1bWUsIG9uVG9nZ2xlUGxheSwgb25VcGRhdGVCUE0sIG9uVXBkYXRlTWFzdGVyVm9sdW1lLCBvblRvZ2dsZVdpbmRvdywgb25SZXNldFByb2plY3QsIG9uVW5kbywgb25SZWRvLCBjYW5VbmRvLCBjYW5SZWRvIH06IGFueSkgPT4gKFxuICA8ZGl2IGNsYXNzTmFtZT1cImgtMTQgYmctc2xhdGUtOTUwLzk1IGJhY2tkcm9wLWJsdXIgYm9yZGVyLXQgYm9yZGVyLXNsYXRlLTgwMC84MCBmbGV4IGl0ZW1zLWNlbnRlciBweC00IGp1c3RpZnktYmV0d2VlbiB6LTUwIHJlbGF0aXZlIHNoYWRvdy1bMF8tNXB4XzIwcHhfcmdiYSgwLDAsMCwwLjUpXVwiPlxuICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTRcIj5cbiAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0yIHRleHQtY3lhbi00MDAgZm9udC1ibGFjayB0ZXh0LXhsIGl0YWxpYyB0cmFja2luZy10aWdodGVyIHByLTMgYm9yZGVyLXIgYm9yZGVyLXNsYXRlLTgwMCBjdXJzb3ItcG9pbnRlciBob3Zlcjp0ZXh0LWN5YW4tMzAwIHRyYW5zaXRpb24tY29sb3JzXCIgb25DbGljaz17b25SZXNldFByb2plY3R9IHRpdGxlPVwiUmVzZXQgUHJvamVjdFwiPlxuICAgICAgICAgIDxSYWRpbyBzaXplPXsyNH0gLz4gUlhcbiAgICAgICA8L2Rpdj5cbiAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0xIGJnLXNsYXRlLTkwMCBwLTEgcm91bmRlZC1sZyBib3JkZXIgYm9yZGVyLXNsYXRlLTgwMFwiPlxuICAgICAgICAgIDxidXR0b24gXG4gICAgICAgICAgICBvbkNsaWNrPXtvblVuZG99IFxuICAgICAgICAgICAgZGlzYWJsZWQ9eyFjYW5VbmRvfSBcbiAgICAgICAgICAgIGNsYXNzTmFtZT17YHAtMS41IHJvdW5kZWQgdHJhbnNpdGlvbi1jb2xvcnMgJHtjYW5VbmRvID8gJ3RleHQtc2xhdGUtMzAwIGhvdmVyOmJnLXNsYXRlLTgwMCBob3Zlcjp0ZXh0LXdoaXRlJyA6ICd0ZXh0LXNsYXRlLTcwMCBjdXJzb3Itbm90LWFsbG93ZWQnfWB9XG4gICAgICAgICAgICB0aXRsZT1cIlVuZG8gKEN0cmwrWilcIlxuICAgICAgICAgID5cbiAgICAgICAgICAgIDxSb3RhdGVDY3cgc2l6ZT17MTR9IC8+XG4gICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgPGJ1dHRvbiBcbiAgICAgICAgICAgIG9uQ2xpY2s9e29uUmVkb30gXG4gICAgICAgICAgICBkaXNhYmxlZD17IWNhblJlZG99IFxuICAgICAgICAgICAgY2xhc3NOYW1lPXtgcC0xLjUgcm91bmRlZCB0cmFuc2l0aW9uLWNvbG9ycyAke2NhblJlZG8gPyAndGV4dC1zbGF0ZS0zMDAgaG92ZXI6Ymctc2xhdGUtODAwIGhvdmVyOnRleHQtd2hpdGUnIDogJ3RleHQtc2xhdGUtNzAwIGN1cnNvci1ub3QtYWxsb3dlZCd9YH1cbiAgICAgICAgICAgIHRpdGxlPVwiUmVkbyAoQ3RybCtZKVwiXG4gICAgICAgICAgPlxuICAgICAgICAgICAgPFJvdGF0ZUN3IHNpemU9ezE0fSAvPlxuICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgIDwvZGl2PlxuICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTQgYmctc2xhdGUtOTAwIHB4LTQgcHktMS41IHJvdW5kZWQtZnVsbCBib3JkZXIgYm9yZGVyLXNsYXRlLTcwMC81MCBzaGFkb3ctaW5uZXJcIj5cbiAgICAgICAgICA8YnV0dG9uIG9uQ2xpY2s9e29uVG9nZ2xlUGxheX0gY2xhc3NOYW1lPXtgdy04IGgtOCBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciByb3VuZGVkLWZ1bGwgdHJhbnNpdGlvbi1jb2xvcnMgJHtpc1BsYXlpbmcgPyAnYmctY3lhbi01MDAgdGV4dC1zbGF0ZS05NTAgc2hhZG93LVswXzBfMTVweF8jMjJkM2VlXScgOiAnYmctc2xhdGUtODAwIHRleHQtY3lhbi00MDAgaG92ZXI6Ymctc2xhdGUtNzAwIGhvdmVyOnRleHQtY3lhbi0zMDAnfWB9PlxuICAgICAgICAgICAgIHtpc1BsYXlpbmcgPyA8U3F1YXJlIHNpemU9ezE0fSBmaWxsPVwiY3VycmVudENvbG9yXCIgLz4gOiA8UGxheSBzaXplPXsxNH0gZmlsbD1cImN1cnJlbnRDb2xvclwiIGNsYXNzTmFtZT1cIm1sLTAuNVwiIC8+fVxuICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBmbGV4LWNvbFwiPlxuICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1bOXB4XSB0ZXh0LXNsYXRlLTUwMCBmb250LWJvbGQgdHJhY2tpbmctd2lkZXN0XCI+QlBNPC9zcGFuPlxuICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJudW1iZXJcIiB2YWx1ZT17YnBtfSBvbkNoYW5nZT17ZSA9PiBvblVwZGF0ZUJQTShOdW1iZXIoZS50YXJnZXQudmFsdWUpKX0gY2xhc3NOYW1lPVwiYmctdHJhbnNwYXJlbnQgdGV4dC1zbGF0ZS0yMDAgdGV4dC14cyBmb250LW1vbm8gZm9udC1ib2xkIHctMTAgb3V0bGluZS1ub25lXCIgLz5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImgtNiB3LXB4IGJnLXNsYXRlLTcwMCBteC0xXCI+PC9kaXY+XG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGZsZXgtY29sIGdhcC0xXCI+XG4gICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LVs5cHhdIHRleHQtc2xhdGUtNTAwIGZvbnQtYm9sZCB0cmFja2luZy13aWRlc3RcIj5TVEVQPC9zcGFuPlxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGdhcC0xXCI+XG4gICAgICAgICAgICAgIHtbMCwxLDIsM10ubWFwKGkgPT4gKFxuICAgICAgICAgICAgICAgICA8ZGl2IGtleT17aX0gY2xhc3NOYW1lPXtgdy0yIGgtMiByb3VuZGVkLWZ1bGwgdHJhbnNpdGlvbi1jb2xvcnMgJHtpc1BsYXlpbmcgJiYgTWF0aC5mbG9vcihjdXJyZW50U3RlcC80KSA9PT0gaSA/ICdiZy1jeWFuLTQwMCBzaGFkb3ctWzBfMF84cHhfIzIyZDNlZV0nIDogJ2JnLXNsYXRlLTcwMCd9YH0gLz5cbiAgICAgICAgICAgICAgKSl9XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICA8L2Rpdj5cbiAgICA8L2Rpdj5cbiAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXgtMSBmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMiBweC02IG92ZXJmbG93LXgtYXV0byBuby1zY3JvbGxiYXJcIj5cbiAgICAgIHt3aW5kb3dzLm1hcCgodzogQXBwV2luZG93KSA9PiAoXG4gICAgICAgIDxidXR0b24gXG4gICAgICAgICAga2V5PXt3LmlkfSBvbkNsaWNrPXsoKSA9PiBvblRvZ2dsZVdpbmRvdyh3LmlkKX1cbiAgICAgICAgICBjbGFzc05hbWU9e2BmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMiBweC0zIHB5LTEuNSByb3VuZGVkLWxnIHRleHQteHMgZm9udC1ib2xkIHRyYW5zaXRpb24tYWxsIG1heC13LVsxNjBweF0gdHJ1bmNhdGUgYm9yZGVyICR7dy5pc01pbmltaXplZCA/ICdiZy1zbGF0ZS05MDAgdGV4dC1zbGF0ZS01MDAgYm9yZGVyLXNsYXRlLTgwMCBob3ZlcjpiZy1zbGF0ZS04MDAnIDogJ2JnLXNsYXRlLTgwMCB0ZXh0LXNsYXRlLTIwMCBib3JkZXItc2xhdGUtNjAwIHNoYWRvdy1baW5zZXRfMF8xcHhfcmdiYSgyNTUsMjU1LDI1NSwwLjEpXSd9YH1cbiAgICAgICAgPlxuICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9e2B3LTIgaC0yIHJvdW5kZWQtZnVsbCAke3cuaXNNaW5pbWl6ZWQgPyAnYmctc2xhdGUtNjAwJyA6ICdiZy1jeWFuLTUwMCBzaGFkb3ctWzBfMF81cHhfIzIyZDNlZV0nfWB9IC8+XG4gICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRydW5jYXRlXCI+e3cudGl0bGV9PC9zcGFuPlxuICAgICAgICA8L2J1dHRvbj5cbiAgICAgICkpfVxuICAgIDwvZGl2PlxuICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTQgdGV4dC1zbGF0ZS00MDBcIj5cbiAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0yIGJnLXNsYXRlLTkwMCBweC0zIHB5LTEuNSByb3VuZGVkLWZ1bGwgYm9yZGVyIGJvcmRlci1zbGF0ZS04MDBcIj5cbiAgICAgICAgICA8Vm9sdW1lMiBzaXplPXsxNH0gY2xhc3NOYW1lPXttYXN0ZXJWb2x1bWUgPiAwLjggPyAndGV4dC1yZWQtNDAwJyA6ICd0ZXh0LXNsYXRlLTQwMCd9IC8+XG4gICAgICAgICAgPGlucHV0IHR5cGU9XCJyYW5nZVwiIG1pbj17MH0gbWF4PXsxfSBzdGVwPXswLjAxfSB2YWx1ZT17bWFzdGVyVm9sdW1lfSBvbkNoYW5nZT17ZSA9PiBvblVwZGF0ZU1hc3RlclZvbHVtZShOdW1iZXIoZS50YXJnZXQudmFsdWUpKX0gY2xhc3NOYW1lPVwidy0yMCBoLTEgYmctc2xhdGUtNzAwIHJvdW5kZWQtbGcgYXBwZWFyYW5jZS1ub25lIGN1cnNvci1wb2ludGVyIGFjY2VudC1jeWFuLTQwMFwiIC8+XG4gICAgICAgPC9kaXY+XG4gICAgICAgPGRpdiBjbGFzc05hbWU9XCJ0ZXh0LVsxMHB4XSBmb250LW1vbm8gZm9udC1ib2xkIHRyYWNraW5nLXdpZGVzdCBweC0yIHRleHQtc2xhdGUtNTAwXCI+XG4gICAgICAgICB7bmV3IERhdGUoKS50b0xvY2FsZVRpbWVTdHJpbmcoW10sIHsgaG91cjogJzItZGlnaXQnLCBtaW51dGU6ICcyLWRpZ2l0JyB9KX1cbiAgICAgICA8L2Rpdj5cbiAgICA8L2Rpdj5cbiAgPC9kaXY+XG4pO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBSZW1peE9TKCkge1xuICBjb25zdCBbd2luZG93cywgc2V0V2luZG93c10gPSB1c2VTdGF0ZTxBcHBXaW5kb3dbXT4oW10pO1xuICBjb25zdCBbcGFkcywgc2V0UGFkc10gPSB1c2VTdGF0ZTxQYWRbXT4oW1xuICAgIHsgaWQ6IFwicGFkXzFcIiwgbmFtZTogXCJIb3VzZSBCZWF0XCIsIGNhdGVnb3J5OiBcImRydW1zXCIsIGNvbG9yOiBcImVtZXJhbGRcIiwgbG9vcFR5cGU6IFwiZHJ1bXNfaG91c2VcIiwgaXNQbGF5aW5nOiB0cnVlLCB2b2x1bWU6IDAuODUsIHBhbjogMCwgbXV0ZWQ6IGZhbHNlLCBzb2xvZWQ6IGZhbHNlIH0sXG4gICAgeyBpZDogXCJwYWRfMlwiLCBuYW1lOiBcIlRyYXAgRHJ1bXNcIiwgY2F0ZWdvcnk6IFwiZHJ1bXNcIiwgY29sb3I6IFwiZW1lcmFsZFwiLCBsb29wVHlwZTogXCJkcnVtc190cmFwXCIsIGlzUGxheWluZzogZmFsc2UsIHZvbHVtZTogMC44LCBwYW46IDAsIG11dGVkOiBmYWxzZSwgc29sb2VkOiBmYWxzZSB9LFxuICAgIHsgaWQ6IFwicGFkXzNcIiwgbmFtZTogXCJDbHViIFBlcmNcIiwgY2F0ZWdvcnk6IFwiZHJ1bXNcIiwgY29sb3I6IFwiZW1lcmFsZFwiLCBsb29wVHlwZTogXCJkcnVtc19ob3VzZVwiLCBpc1BsYXlpbmc6IGZhbHNlLCB2b2x1bWU6IDAuNzUsIHBhbjogMC4yLCBtdXRlZDogZmFsc2UsIHNvbG9lZDogZmFsc2UgfSxcbiAgICB7IGlkOiBcInBhZF80XCIsIG5hbWU6IFwiSGlIYXQgUm9sbFwiLCBjYXRlZ29yeTogXCJkcnVtc1wiLCBjb2xvcjogXCJlbWVyYWxkXCIsIGxvb3BUeXBlOiBcImRydW1zX3RyYXBcIiwgaXNQbGF5aW5nOiBmYWxzZSwgdm9sdW1lOiAwLjcsIHBhbjogLTAuMiwgbXV0ZWQ6IGZhbHNlLCBzb2xvZWQ6IGZhbHNlIH0sXG4gICAgeyBpZDogXCJwYWRfNVwiLCBuYW1lOiBcIlN1YiBHcm9vdmVcIiwgY2F0ZWdvcnk6IFwiYmFzc1wiLCBjb2xvcjogXCJpbmRpZ29cIiwgbG9vcFR5cGU6IFwiYmFzc19zdWJcIiwgaXNQbGF5aW5nOiB0cnVlLCB2b2x1bWU6IDAuOCwgcGFuOiAwLCBtdXRlZDogZmFsc2UsIHNvbG9lZDogZmFsc2UgfSxcbiAgICB7IGlkOiBcInBhZF82XCIsIG5hbWU6IFwiQW5hbG9nIDMwM1wiLCBjYXRlZ29yeTogXCJiYXNzXCIsIGNvbG9yOiBcImluZGlnb1wiLCBsb29wVHlwZTogXCJiYXNzX2FjaWRcIiwgaXNQbGF5aW5nOiBmYWxzZSwgdm9sdW1lOiAwLjc1LCBwYW46IC0wLjEsIG11dGVkOiBmYWxzZSwgc29sb2VkOiBmYWxzZSB9LFxuICAgIHsgaWQ6IFwicGFkXzdcIiwgbmFtZTogXCJSZWVzZSBTdWJcIiwgY2F0ZWdvcnk6IFwiYmFzc1wiLCBjb2xvcjogXCJpbmRpZ29cIiwgbG9vcFR5cGU6IFwiYmFzc19zdWJcIiwgaXNQbGF5aW5nOiBmYWxzZSwgdm9sdW1lOiAwLjg1LCBwYW46IDAuMSwgbXV0ZWQ6IGZhbHNlLCBzb2xvZWQ6IGZhbHNlIH0sXG4gICAgeyBpZDogXCJwYWRfOFwiLCBuYW1lOiBcIkRyaXZlIEJhc3NcIiwgY2F0ZWdvcnk6IFwiYmFzc1wiLCBjb2xvcjogXCJpbmRpZ29cIiwgbG9vcFR5cGU6IFwiYmFzc19hY2lkXCIsIGlzUGxheWluZzogZmFsc2UsIHZvbHVtZTogMC43LCBwYW46IDAsIG11dGVkOiBmYWxzZSwgc29sb2VkOiBmYWxzZSB9LFxuICAgIHsgaWQ6IFwicGFkXzlcIiwgbmFtZTogXCJDaGlsbCBDaG9yZHNcIiwgY2F0ZWdvcnk6IFwic3ludGhcIiwgY29sb3I6IFwidmlvbGV0XCIsIGxvb3BUeXBlOiBcInN5bnRoX2NoaWxsXCIsIGlzUGxheWluZzogdHJ1ZSwgdm9sdW1lOiAwLjc1LCBwYW46IC0wLjIsIG11dGVkOiBmYWxzZSwgc29sb2VkOiBmYWxzZSB9LFxuICAgIHsgaWQ6IFwicGFkXzEwXCIsIG5hbWU6IFwiQ3liZXIgQXJwXCIsIGNhdGVnb3J5OiBcInN5bnRoXCIsIGNvbG9yOiBcInZpb2xldFwiLCBsb29wVHlwZTogXCJzeW50aF9hcnBcIiwgaXNQbGF5aW5nOiBmYWxzZSwgdm9sdW1lOiAwLjcsIHBhbjogMC4zLCBtdXRlZDogZmFsc2UsIHNvbG9lZDogZmFsc2UgfSxcbiAgICB7IGlkOiBcInBhZF8xMVwiLCBuYW1lOiBcIkxvZmkgS2V5c1wiLCBjYXRlZ29yeTogXCJzeW50aFwiLCBjb2xvcjogXCJ2aW9sZXRcIiwgbG9vcFR5cGU6IFwic3ludGhfY2hpbGxcIiwgaXNQbGF5aW5nOiBmYWxzZSwgdm9sdW1lOiAwLjgsIHBhbjogMC4xLCBtdXRlZDogZmFsc2UsIHNvbG9lZDogZmFsc2UgfSxcbiAgICB7IGlkOiBcInBhZF8xMlwiLCBuYW1lOiBcIk5lb24gTGVhZFwiLCBjYXRlZ29yeTogXCJzeW50aFwiLCBjb2xvcjogXCJ2aW9sZXRcIiwgbG9vcFR5cGU6IFwic3ludGhfYXJwXCIsIGlzUGxheWluZzogZmFsc2UsIHZvbHVtZTogMC43NSwgcGFuOiAtMC4zLCBtdXRlZDogZmFsc2UsIHNvbG9lZDogZmFsc2UgfSxcbiAgICB7IGlkOiBcInBhZF8xM1wiLCBuYW1lOiBcIlN3ZWVwIFJpc2VyXCIsIGNhdGVnb3J5OiBcImZ4XCIsIGNvbG9yOiBcImFtYmVyXCIsIGxvb3BUeXBlOiBcImZ4X3Jpc2VyXCIsIGlzUGxheWluZzogZmFsc2UsIHZvbHVtZTogMC42LCBwYW46IDAsIG11dGVkOiBmYWxzZSwgc29sb2VkOiBmYWxzZSB9LFxuICAgIHsgaWQ6IFwicGFkXzE0XCIsIG5hbWU6IFwiR2xpdGNoIEhpdFwiLCBjYXRlZ29yeTogXCJmeFwiLCBjb2xvcjogXCJhbWJlclwiLCBsb29wVHlwZTogXCJmeF9nbGl0Y2hcIiwgaXNQbGF5aW5nOiBmYWxzZSwgdm9sdW1lOiAwLjY1LCBwYW46IDAuNCwgbXV0ZWQ6IGZhbHNlLCBzb2xvZWQ6IGZhbHNlIH0sXG4gICAgeyBpZDogXCJwYWRfMTVcIiwgbmFtZTogXCJOb2lzZSBEcm9wXCIsIGNhdGVnb3J5OiBcImZ4XCIsIGNvbG9yOiBcImFtYmVyXCIsIGxvb3BUeXBlOiBcImZ4X3Jpc2VyXCIsIGlzUGxheWluZzogZmFsc2UsIHZvbHVtZTogMC41NSwgcGFuOiAtMC40LCBtdXRlZDogZmFsc2UsIHNvbG9lZDogZmFsc2UgfSxcbiAgICB7IGlkOiBcInBhZF8xNlwiLCBuYW1lOiBcIkZNIFBlcmNcIiwgY2F0ZWdvcnk6IFwiZnhcIiwgY29sb3I6IFwiYW1iZXJcIiwgbG9vcFR5cGU6IFwiZnhfZ2xpdGNoXCIsIGlzUGxheWluZzogZmFsc2UsIHZvbHVtZTogMC43LCBwYW46IDAsIG11dGVkOiBmYWxzZSwgc29sb2VkOiBmYWxzZSB9LFxuICBdKTtcbiAgY29uc3QgW2JwbSwgc2V0QlBNXSA9IHVzZVN0YXRlPG51bWJlcj4oMTI0KTtcbiAgY29uc3QgW21hc3RlclZvbHVtZSwgc2V0TWFzdGVyVm9sdW1lXSA9IHVzZVN0YXRlPG51bWJlcj4oMC44NSk7XG4gIGNvbnN0IFtpc1BsYXlpbmcsIHNldElzUGxheWluZ10gPSB1c2VTdGF0ZTxib29sZWFuPihmYWxzZSk7XG4gIGNvbnN0IFtjdXJyZW50U3RlcCwgc2V0Q3VycmVudFN0ZXBdID0gdXNlU3RhdGU8bnVtYmVyPigwKTtcbiAgY29uc3QgW21heFpJbmRleCwgc2V0TWF4WkluZGV4XSA9IHVzZVN0YXRlPG51bWJlcj4oMjApO1xuXG4gIC8vIFN0YXRlIGhpc3Rvcnkgc3RhY2sgZm9yIFVuZG8gLyBSZWRvXG4gIGNvbnN0IFtoaXN0b3J5LCBzZXRIaXN0b3J5XSA9IHVzZVN0YXRlPEFycmF5PHsgcGFkczogUGFkW10sIGJwbTogbnVtYmVyIH0+PihbXSk7XG4gIGNvbnN0IFtmdXR1cmUsIHNldEZ1dHVyZV0gPSB1c2VTdGF0ZTxBcnJheTx7IHBhZHM6IFBhZFtdLCBicG06IG51bWJlciB9Pj4oW10pO1xuXG4gIGNvbnN0IHVwZGF0ZVBhZHMgPSAoYWN0aW9uOiBSZWFjdC5TZXRTdGF0ZUFjdGlvbjxQYWRbXT4pID0+IHtcbiAgICBzZXRQYWRzKHByZXZQYWRzID0+IHtcbiAgICAgIGNvbnN0IG5leHRQYWRzID0gdHlwZW9mIGFjdGlvbiA9PT0gJ2Z1bmN0aW9uJyA/IGFjdGlvbihwcmV2UGFkcykgOiBhY3Rpb247XG4gICAgICBpZiAoSlNPTi5zdHJpbmdpZnkocHJldlBhZHMpICE9PSBKU09OLnN0cmluZ2lmeShuZXh0UGFkcykpIHtcbiAgICAgICAgc2V0SGlzdG9yeShoID0+IFsuLi5oLnNsaWNlKC0yMCksIHsgcGFkczogcHJldlBhZHMsIGJwbSB9XSk7XG4gICAgICAgIHNldEZ1dHVyZShbXSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gbmV4dFBhZHM7XG4gICAgfSk7XG4gIH07XG5cbiAgY29uc3QgdXBkYXRlQlBNID0gKG5ld0JwbTogbnVtYmVyKSA9PiB7XG4gICAgaWYgKG5ld0JwbSAhPT0gYnBtKSB7XG4gICAgICBzZXRIaXN0b3J5KGggPT4gWy4uLmguc2xpY2UoLTIwKSwgeyBwYWRzLCBicG0gfV0pO1xuICAgICAgc2V0RnV0dXJlKFtdKTtcbiAgICAgIHNldEJQTShuZXdCcG0pO1xuICAgIH1cbiAgfTtcblxuICBjb25zdCBoYW5kbGVVbmRvID0gKCkgPT4ge1xuICAgIGlmIChoaXN0b3J5Lmxlbmd0aCA9PT0gMCkgcmV0dXJuO1xuICAgIGNvbnN0IHByZXZpb3VzID0gaGlzdG9yeVtoaXN0b3J5Lmxlbmd0aCAtIDFdO1xuICAgIGNvbnN0IG5ld0hpc3RvcnkgPSBoaXN0b3J5LnNsaWNlKDAsIGhpc3RvcnkubGVuZ3RoIC0gMSk7XG4gICAgc2V0RnV0dXJlKGYgPT4gW3sgcGFkcywgYnBtIH0sIC4uLmZdKTtcbiAgICBzZXRIaXN0b3J5KG5ld0hpc3RvcnkpO1xuICAgIHNldFBhZHMocHJldmlvdXMucGFkcyk7XG4gICAgc2V0QlBNKHByZXZpb3VzLmJwbSk7XG4gIH07XG5cbiAgY29uc3QgaGFuZGxlUmVkbyA9ICgpID0+IHtcbiAgICBpZiAoZnV0dXJlLmxlbmd0aCA9PT0gMCkgcmV0dXJuO1xuICAgIGNvbnN0IG5leHQgPSBmdXR1cmVbMF07XG4gICAgY29uc3QgbmV3RnV0dXJlID0gZnV0dXJlLnNsaWNlKDEpO1xuICAgIHNldEhpc3RvcnkoaCA9PiBbLi4uaCwgeyBwYWRzLCBicG0gfV0pO1xuICAgIHNldEZ1dHVyZShuZXdGdXR1cmUpO1xuICAgIHNldFBhZHMobmV4dC5wYWRzKTtcbiAgICBzZXRCUE0obmV4dC5icG0pO1xuICB9O1xuXG4gIGNvbnN0IFtub3RpZmljYXRpb24sIHNldE5vdGlmaWNhdGlvbl0gPSB1c2VTdGF0ZTxzdHJpbmcgfCBudWxsPihudWxsKTtcblxuICBjb25zdCBzaG93Tm90aWZpY2F0aW9uID0gKG1zZzogc3RyaW5nKSA9PiB7XG4gICAgc2V0Tm90aWZpY2F0aW9uKG1zZyk7XG4gICAgc2V0VGltZW91dCgoKSA9PiBzZXROb3RpZmljYXRpb24obnVsbCksIDMwMDApO1xuICB9O1xuXG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgY29uc3QgaGFuZGxlS2V5RG93biA9IChlOiBLZXlib2FyZEV2ZW50KSA9PiB7XG4gICAgICBjb25zdCB0YXJnZXQgPSBlLnRhcmdldCBhcyBIVE1MRWxlbWVudDtcbiAgICAgIGNvbnN0IGlzSW5wdXQgPSB0YXJnZXQgJiYgKHRhcmdldC50YWdOYW1lID09PSAnSU5QVVQnIHx8IHRhcmdldC50YWdOYW1lID09PSAnVEVYVEFSRUEnIHx8IHRhcmdldC5pc0NvbnRlbnRFZGl0YWJsZSk7XG5cbiAgICAgIC8vIFNwYWNlYmFyIGZvciBQbGF5L1N0b3BcbiAgICAgIGlmIChlLmNvZGUgPT09ICdTcGFjZScgJiYgIWlzSW5wdXQpIHtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICBoYW5kbGVUb2dnbGVQbGF5KCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgLy8gQ3RybCtTIC8gQ21kK1MgZm9yIFF1aWNrIFNhdmVcbiAgICAgIGlmICgoZS5jdHJsS2V5IHx8IGUubWV0YUtleSkgJiYgZS5rZXkudG9Mb3dlckNhc2UoKSA9PT0gJ3MnKSB7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgY29uc3QgcXVpY2tQcmVzZXQgPSB7XG4gICAgICAgICAgbmFtZTogYFF1aWNrIFNhdmUgKCR7bmV3IERhdGUoKS50b0xvY2FsZVRpbWVTdHJpbmcoKX0pYCxcbiAgICAgICAgICBkYXRlOiBuZXcgRGF0ZSgpLnRvTG9jYWxlU3RyaW5nKCksXG4gICAgICAgICAgYnBtLFxuICAgICAgICAgIHBhZHMsXG4gICAgICAgICAgbWFzdGVyVm9sdW1lXG4gICAgICAgIH07XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgY29uc3Qgc3RvcmVkID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oXCJyZW1peF9vc19wcmVzZXRzX3YxXCIpO1xuICAgICAgICAgIGNvbnN0IHBhcnNlZCA9IHN0b3JlZCA/IEpTT04ucGFyc2Uoc3RvcmVkKSA6IFtdO1xuICAgICAgICAgIGNvbnN0IHVwZGF0ZWQgPSBbcXVpY2tQcmVzZXQsIC4uLnBhcnNlZF07XG4gICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oXCJyZW1peF9vc19wcmVzZXRzX3YxXCIsIEpTT04uc3RyaW5naWZ5KHVwZGF0ZWQpKTtcbiAgICAgICAgICBzaG93Tm90aWZpY2F0aW9uKFwiUHJvamVjdCBxdWljay1zYXZlZCB0byBMb2NhbCBTdG9yYWdlIChDdHJsK1MpIVwiKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgY29uc29sZS5lcnJvcihlcnIpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgLy8gRGVsZXRlIC8gQmFja3NwYWNlIGZvciBjbGVhcmluZyBhY3RpdmUgcGxheWluZyBwYWRzXG4gICAgICBpZiAoKGUua2V5ID09PSAnRGVsZXRlJyB8fCBlLmtleSA9PT0gJ0JhY2tzcGFjZScpICYmICFpc0lucHV0KSB7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgdXBkYXRlUGFkcyhwcmV2ID0+IHByZXYubWFwKHAgPT4gKHsgLi4ucCwgaXNQbGF5aW5nOiBmYWxzZSB9KSkpO1xuICAgICAgICBzaG93Tm90aWZpY2F0aW9uKFwiQWxsIGFjdGl2ZSBwbGF5aW5nIHBhZHMgc3RvcHBlZC9jbGVhcmVkIChEZWxldGUpLlwiKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICAvLyBVbmRvIC8gUmVkbyAoQ3RybCtaIC8gQ3RybCtZKVxuICAgICAgaWYgKChlLmN0cmxLZXkgfHwgZS5tZXRhS2V5KSAmJiBlLmtleS50b0xvd2VyQ2FzZSgpID09PSAneicpIHtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICBpZiAoZS5zaGlmdEtleSkge1xuICAgICAgICAgIGhhbmRsZVJlZG8oKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBoYW5kbGVVbmRvKCk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoKGUuY3RybEtleSB8fCBlLm1ldGFLZXkpICYmIGUua2V5LnRvTG93ZXJDYXNlKCkgPT09ICd5Jykge1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIGhhbmRsZVJlZG8oKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCBoYW5kbGVLZXlEb3duKTtcbiAgICByZXR1cm4gKCkgPT4gd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCBoYW5kbGVLZXlEb3duKTtcbiAgfSwgW2hpc3RvcnksIGZ1dHVyZSwgcGFkcywgYnBtLCBpc1BsYXlpbmcsIG1hc3RlclZvbHVtZV0pO1xuXG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgYXVkaW9FbmdpbmUudXBkYXRlUGFkc1N0YXRlKHBhZHMpO1xuICB9LCBbcGFkc10pO1xuXG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgYXVkaW9FbmdpbmUuc2V0QlBNKGJwbSk7XG4gIH0sIFticG1dKTtcblxuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIGF1ZGlvRW5naW5lLnNldE1hc3RlclZvbHVtZShtYXN0ZXJWb2x1bWUpO1xuICB9LCBbbWFzdGVyVm9sdW1lXSk7XG5cbiAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICBjb25zdCBsb2FkQXBwID0gKGlkOiBzdHJpbmcsIHg6IG51bWJlciwgeTogbnVtYmVyKSA9PiB7XG4gICAgICBjb25zdCByZWcgPSBBUFBfUkVHSVNUUlkuZmluZChhID0+IGEuaWQgPT09IGlkKTtcbiAgICAgIGlmKCFyZWcpIHJldHVybiBudWxsO1xuICAgICAgcmV0dXJuIHsgaWQsIHRpdGxlOiByZWcudGl0bGUsIGljb25OYW1lOiBpZCwgeCwgeSwgd2lkdGg6IHJlZy5kZWZhdWx0V2lkdGgsIGhlaWdodDogcmVnLmRlZmF1bHRIZWlnaHQsIHpJbmRleDogMTAsIGlzTWluaW1pemVkOiBmYWxzZSwgaXNPcGVuOiB0cnVlLCBpc01heGltaXplZDogZmFsc2UgfTtcbiAgICB9O1xuICAgIGNvbnN0IGluaXRXaW5kb3dzID0gW2xvYWRBcHAoXCJncmlkXCIsIDQwLCAzMCksIGxvYWRBcHAoXCJtaXhlclwiLCA2ODAsIDMwKSwgbG9hZEFwcChcImFpZ2VuXCIsIDE4MCwgMTUwKV0uZmlsdGVyKEJvb2xlYW4pIGFzIEFwcFdpbmRvd1tdO1xuICAgIHNldFdpbmRvd3MoaW5pdFdpbmRvd3MpO1xuICAgIGF1ZGlvRW5naW5lLnNldE9uU3RlcCgoc3RlcCkgPT4gc2V0Q3VycmVudFN0ZXAoc3RlcCkpO1xuICAgIHJldHVybiAoKSA9PiBhdWRpb0VuZ2luZS5zdG9wKCk7XG4gIH0sIFtdKTtcblxuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIGF1ZGlvRW5naW5lLmluaXRNSURJKChwYWRJbmRleCkgPT4ge1xuICAgICAgdXBkYXRlUGFkcyhwcmV2ID0+IHByZXYubWFwKChwLCBpZHgpID0+IHtcbiAgICAgICAgaWYgKGlkeCA9PT0gcGFkSW5kZXgpIHtcbiAgICAgICAgICBhdWRpb0VuZ2luZS5wbGF5UGFkRGlyZWN0KHApO1xuICAgICAgICAgIHJldHVybiB7IC4uLnAsIGlzUGxheWluZzogdHJ1ZSB9O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBwO1xuICAgICAgfSkpO1xuICAgICAgc2hvd05vdGlmaWNhdGlvbihgTUlESSBOb3RlIFRyaWdnZXJlZDogUGFkICR7cGFkSW5kZXggKyAxfWApO1xuICAgIH0pO1xuICB9LCBbXSk7XG5cbiAgY29uc3QgaGFuZGxlVG9nZ2xlUGxheSA9ICgpID0+IHtcbiAgICBpZiAoaXNQbGF5aW5nKSB7IGF1ZGlvRW5naW5lLnN0b3AoKTsgc2V0SXNQbGF5aW5nKGZhbHNlKTsgfVxuICAgIGVsc2UgeyBhdWRpb0VuZ2luZS5zdGFydCgpOyBzZXRJc1BsYXlpbmcodHJ1ZSk7IH1cbiAgfTtcblxuICBjb25zdCBvcGVuV2luZG93ID0gKGlkOiBXaW5kb3dJZCkgPT4ge1xuICAgIGNvbnN0IG5leHRaID0gbWF4WkluZGV4ICsgMTtcbiAgICBzZXRNYXhaSW5kZXgobmV4dFopO1xuICAgIHNldFdpbmRvd3MoKHByZXYpID0+IHtcbiAgICAgIGNvbnN0IGV4aXN0cyA9IHByZXYuZmluZCh3ID0+IHcuaWQgPT09IGlkKTtcbiAgICAgIGlmIChleGlzdHMpIHJldHVybiBwcmV2Lm1hcCgodykgPT4gKHcuaWQgPT09IGlkID8geyAuLi53LCBpc09wZW46IHRydWUsIGlzTWluaW1pemVkOiBmYWxzZSwgekluZGV4OiBuZXh0WiB9IDogdykpO1xuICAgICAgY29uc3QgYXBwSW5mbyA9IEFQUF9SRUdJU1RSWS5maW5kKGEgPT4gYS5pZCA9PT0gaWQpO1xuICAgICAgaWYgKCFhcHBJbmZvKSByZXR1cm4gcHJldjtcbiAgICAgIHJldHVybiBbLi4ucHJldiwgeyBpZCwgdGl0bGU6IGFwcEluZm8udGl0bGUsIGljb25OYW1lOiBpZCwgeDogTWF0aC5tYXgoMjAsIE1hdGgucmFuZG9tKCkgKiAxNTApLCB5OiBNYXRoLm1heCgyMCwgTWF0aC5yYW5kb20oKSAqIDE1MCksIHdpZHRoOiBhcHBJbmZvLmRlZmF1bHRXaWR0aCwgaGVpZ2h0OiBhcHBJbmZvLmRlZmF1bHRIZWlnaHQsIHpJbmRleDogbmV4dFosIGlzT3BlbjogdHJ1ZSwgaXNNaW5pbWl6ZWQ6IGZhbHNlLCBpc01heGltaXplZDogZmFsc2UgfV07XG4gICAgfSk7XG4gIH07XG5cbiAgY29uc3QgdXBkYXRlV2luZG93ID0gKGlkOiBXaW5kb3dJZCwgdXBkYXRlczogUGFydGlhbDxBcHBXaW5kb3c+KSA9PiB7XG4gICAgc2V0V2luZG93cyhwcmV2ID0+IHByZXYubWFwKHcgPT4gdy5pZCA9PT0gaWQgPyB7IC4uLncsIC4uLnVwZGF0ZXMgfSA6IHcpKTtcbiAgfTtcblxuICBjb25zdCB0b2dnbGVXaW5kb3cgPSAoaWQ6IFdpbmRvd0lkKSA9PiB7XG4gICAgY29uc3QgdyA9IHdpbmRvd3MuZmluZCh3ID0+IHcuaWQgPT09IGlkKTtcbiAgICBpZiAoIXcpIHJldHVybjtcbiAgICBpZiAoIXcuaXNPcGVuKSBvcGVuV2luZG93KGlkKTtcbiAgICBlbHNlIGlmICh3LmlzTWluaW1pemVkKSB1cGRhdGVXaW5kb3coaWQsIHsgaXNNaW5pbWl6ZWQ6IGZhbHNlLCB6SW5kZXg6IG1heFpJbmRleCArIDEgfSk7XG4gICAgZWxzZSB1cGRhdGVXaW5kb3coaWQsIHsgaXNNaW5pbWl6ZWQ6IHRydWUgfSk7XG4gICAgc2V0TWF4WkluZGV4KHByZXYgPT4gcHJldiArIDEpO1xuICB9O1xuXG4gIHJldHVybiAoXG4gICAgPGRpdiBjbGFzc05hbWU9XCJtaW4taC1zY3JlZW4gdy1mdWxsIGgtc2NyZWVuIGJnLXNsYXRlLTk1MCB0ZXh0LXNsYXRlLTEwMCBmbGV4IGZsZXgtY29sIG92ZXJmbG93LWhpZGRlbiBzZWxlY3Qtbm9uZSBmb250LXNhbnMgcmVsYXRpdmVcIj5cbiAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJzb2x1dGUgaW5zZXQtMCBiZy1bcmFkaWFsLWdyYWRpZW50KGVsbGlwc2VfYXRfdG9wLF92YXIoLS10dy1ncmFkaWVudC1zdG9wcykpXSBmcm9tLXNsYXRlLTkwMCB2aWEtc2xhdGUtOTUwIHRvLWJsYWNrIHBvaW50ZXItZXZlbnRzLW5vbmUgei0wXCIgLz5cbiAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJzb2x1dGUgaW5zZXQtMCBiZy1bbGluZWFyLWdyYWRpZW50KHRvX3JpZ2h0LCMxZTI5M2JfMXB4LHRyYW5zcGFyZW50XzFweCksbGluZWFyLWdyYWRpZW50KHRvX2JvdHRvbSwjMWUyOTNiXzFweCx0cmFuc3BhcmVudF8xcHgpXSBiZy1bc2l6ZTo0OHB4XzQ4cHhdIG9wYWNpdHktMjAgcG9pbnRlci1ldmVudHMtbm9uZSB6LTBcIiAvPlxuICAgICAgXG4gICAgICB7bm90aWZpY2F0aW9uICYmIChcbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYnNvbHV0ZSB0b3AtNCBsZWZ0LTEvMiAtdHJhbnNsYXRlLXgtMS8yIHotWzEwMF0gYmctc2xhdGUtOTAwIGJvcmRlciBib3JkZXItYW1iZXItNTAwIHRleHQtYW1iZXItMzAwIHB4LTQgcHktMiByb3VuZGVkLXhsIHNoYWRvdy1bMF8wXzIwcHhfcmdiYSgyNDUsMTU4LDExLDAuMyldIGZvbnQtbW9ubyB0ZXh0LXhzIGZsZXggaXRlbXMtY2VudGVyIGdhcC0yIGFuaW1hdGUtYm91bmNlXCI+XG4gICAgICAgICAgPFNwYXJrbGVzIHNpemU9ezE0fSAvPiB7bm90aWZpY2F0aW9ufVxuICAgICAgICA8L2Rpdj5cbiAgICAgICl9XG5cbiAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleC0xIHJlbGF0aXZlIG92ZXJmbG93LWhpZGRlbiB6LTEwXCI+XG4gICAgICAgIDxEZXNrdG9wSWNvbnMgb25PcGVuV2luZG93PXtvcGVuV2luZG93fSAvPlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImFic29sdXRlIGJvdHRvbS04IHJpZ2h0LTggcG9pbnRlci1ldmVudHMtbm9uZSBvcGFjaXR5LTEwIHRleHQtcmlnaHQgei0wXCI+XG4gICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC01eGwgZm9udC1ibGFjayB1cHBlcmNhc2UgdHJhY2tpbmctd2lkZXN0IHRleHQtY3lhbi00MDBcIj5SRU1JWCBPUzwvcD5cbiAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LXNtIGZvbnQtbW9ubyB0ZXh0LXNsYXRlLTQwMCB0cmFja2luZy13aWRlc3RcIj5BVURJTyBXT1JLU1BBQ0UgUFdBIFYyLjA8L3A+XG4gICAgICAgIDwvZGl2PlxuXG4gICAgICAgIHt3aW5kb3dzLmZpbHRlcigodykgPT4gdy5pc09wZW4pLm1hcCgodykgPT4ge1xuICAgICAgICAgIGNvbnN0IHJlZyA9IEFQUF9SRUdJU1RSWS5maW5kKGEgPT4gYS5pZCA9PT0gdy5pZCk7XG4gICAgICAgICAgY29uc3QgSWNvbiA9IHJlZyA/IHJlZy5pY29uIDogR3JpZDtcbiAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgPFdpbmRvd0ZyYW1lXG4gICAgICAgICAgICAgIGtleT17dy5pZH0gYXBwV2luZG93PXt3fSBpY29uPXs8SWNvbiBzaXplPXsxNH0gY2xhc3NOYW1lPXtyZWc/LmNvbG9yfSAvPn1cbiAgICAgICAgICAgICAgb25DbG9zZT17KCkgPT4gdXBkYXRlV2luZG93KHcuaWQsIHsgaXNPcGVuOiBmYWxzZSB9KX1cbiAgICAgICAgICAgICAgb25NaW5pbWl6ZT17KCkgPT4gdXBkYXRlV2luZG93KHcuaWQsIHsgaXNNaW5pbWl6ZWQ6IHRydWUgfSl9XG4gICAgICAgICAgICAgIG9uTWF4aW1pemU9eygpID0+IHVwZGF0ZVdpbmRvdyh3LmlkLCB7IGlzTWF4aW1pemVkOiAhdy5pc01heGltaXplZCB9KX1cbiAgICAgICAgICAgICAgb25Gb2N1cz17KCkgPT4geyBzZXRNYXhaSW5kZXgoeiA9PiB6ICsgMSk7IHVwZGF0ZVdpbmRvdyh3LmlkLCB7IHpJbmRleDogbWF4WkluZGV4ICsgMSB9KTsgfX1cbiAgICAgICAgICAgICAgb25Nb3ZlPXsoeDogbnVtYmVyLCB5OiBudW1iZXIpID0+IHVwZGF0ZVdpbmRvdyh3LmlkLCB7IHgsIHkgfSl9XG4gICAgICAgICAgICA+XG4gICAgICAgICAgICAgIHt3LmlkID09PSBcImdyaWRcIiAmJiA8R3JpZExhdW5jaGVyIHBhZHM9e3BhZHN9IGN1cnJlbnRTdGVwPXtjdXJyZW50U3RlcH0gaXNQbGF5aW5nPXtpc1BsYXlpbmd9IG9uVG9nZ2xlUGFkPXsoaWQ6IHN0cmluZykgPT4gdXBkYXRlUGFkcyhwID0+IHAubWFwKHBhZCA9PiBwYWQuaWQgPT09IGlkID8geyAuLi5wYWQsIGlzUGxheWluZzogIXBhZC5pc1BsYXlpbmcgfSA6IHBhZCkpfSAvPn1cbiAgICAgICAgICAgICAge3cuaWQgPT09IFwibWl4ZXJcIiAmJiA8TWl4ZXJSYWNrIHBhZHM9e3BhZHN9IG1hc3RlclZvbHVtZT17bWFzdGVyVm9sdW1lfSBvblVwZGF0ZVZvbHVtZT17KGlkOiBzdHJpbmcsIHZvbDogbnVtYmVyKSA9PiB1cGRhdGVQYWRzKHAgPT4gcC5tYXAocGFkID0+IHBhZC5pZCA9PT0gaWQgPyB7IC4uLnBhZCwgdm9sdW1lOiB2b2wgfSA6IHBhZCkpfSBvblVwZGF0ZVBhbj17KGlkOiBzdHJpbmcsIHBhbjogbnVtYmVyKSA9PiB1cGRhdGVQYWRzKHAgPT4gcC5tYXAocGFkID0+IHBhZC5pZCA9PT0gaWQgPyB7IC4uLnBhZCwgcGFuIH0gOiBwYWQpKX0gb25Ub2dnbGVNdXRlPXsoaWQ6IHN0cmluZykgPT4gdXBkYXRlUGFkcyhwID0+IHAubWFwKHBhZCA9PiBwYWQuaWQgPT09IGlkID8geyAuLi5wYWQsIG11dGVkOiAhcGFkLm11dGVkIH0gOiBwYWQpKX0gb25Ub2dnbGVTb2xvPXsoaWQ6IHN0cmluZykgPT4gdXBkYXRlUGFkcyhwID0+IHAubWFwKHBhZCA9PiBwYWQuaWQgPT09IGlkID8geyAuLi5wYWQsIHNvbG9lZDogIXBhZC5zb2xvZWQgfSA6IHBhZCkpfSBvblVwZGF0ZU1hc3RlclZvbHVtZT17c2V0TWFzdGVyVm9sdW1lfSAvPn1cbiAgICAgICAgICAgICAge3cuaWQgPT09IFwiYWlnZW5cIiAmJiA8QUlUcmFja0dlbmVyYXRvciBzZXRCcG09e3VwZGF0ZUJQTX0gc2V0UGFkcz17dXBkYXRlUGFkc30gLz59XG4gICAgICAgICAgICAgIHt3LmlkID09PSBcImFjaWRcIiAmJiA8QWNpZEJveFN5bnRoIC8+fVxuICAgICAgICAgICAgICB7dy5pZCA9PT0gXCJzY29wZVwiICYmIDxNYXN0ZXJPc2NpbGxvc2NvcGUgLz59XG4gICAgICAgICAgICAgIHt3LmlkID09PSBcImdyYW51bGFyXCIgJiYgPEdyYW51bGFyU3ludGggLz59XG4gICAgICAgICAgICAgIHt3LmlkID09PSBcInNlcXVlbmNlclwiICYmIDxTdGVwU2VxdWVuY2VyIC8+fVxuICAgICAgICAgICAgICB7dy5pZCA9PT0gXCJwYXRjaGJheVwiICYmIDxNb2R1bGFyUGF0Y2hCYXkgLz59XG4gICAgICAgICAgICAgIHt3LmlkID09PSBcInh5cGFkXCIgJiYgPFhZUGVyZm9ybWFuY2VQYWQgLz59XG4gICAgICAgICAgICAgIHt3LmlkID09PSBcImZ4XCIgJiYgPEZYQ2hhaW4gLz59XG4gICAgICAgICAgICAgIHt3LmlkID09PSBcImNyYXRlXCIgJiYgPFNhbXBsZUNyYXRlIC8+fVxuICAgICAgICAgICAgICB7dy5pZCA9PT0gXCJwcmVzZXQtbWFuYWdlclwiICYmIDxQcmVzZXRNYW5hZ2VyIHBhZHM9e3BhZHN9IGJwbT17YnBtfSBtYXN0ZXJWb2x1bWU9e21hc3RlclZvbHVtZX0gb25Mb2FkUHJlc2V0PXsoc3RhdGUpID0+IHsgdXBkYXRlUGFkcyhzdGF0ZS5wYWRzKTsgdXBkYXRlQlBNKHN0YXRlLmJwbSk7IHNldE1hc3RlclZvbHVtZShzdGF0ZS5tYXN0ZXJWb2x1bWUpOyB9fSAvPn1cbiAgICAgICAgICAgICAge3cuaWQgPT09IFwiZHJ1bW1hY2hpbmVcIiAmJiA8RHJ1bU1hY2hpbmUgLz59XG4gICAgICAgICAgICAgIHt3LmlkID09PSBcImxvb3BlclwiICYmIDxMb29wZXIgLz59XG4gICAgICAgICAgICAgIHt3LmlkID09PSBcInNhbXBsZXJcIiAmJiA8U2FtcGxlciAvPn1cbiAgICAgICAgICAgICAge3cuaWQgPT09IFwidm9pY2V0cmFpbmVyXCIgJiYgPFZvaWNlVHJhaW5lciAvPn1cbiAgICAgICAgICAgICAge3cuaWQgPT09IFwidm9pY2VjaGFuZ2VyXCIgJiYgPFZvaWNlQ2hhbmdlciAvPn1cbiAgICAgICAgICAgICAge3cuaWQgPT09IFwidHJpbVwiICYmIDxBZHZhbmNlZFRyaW0gLz59XG4gICAgICAgICAgICAgIHt3LmlkID09PSBcIm1hdHJpeFwiICYmIDxDaGFubmVsTWF0cml4IC8+fVxuICAgICAgICAgICAgICB7KHcuaWQgPT09IFwicGFyYW1ldHJpYy1lcVwiIHx8IHcuaWQgPT09IFwiZXFcIikgJiYgPFBhcmFtZXRyaWNFUSAvPn1cbiAgICAgICAgICAgICAgeyh3LmlkID09PSBcInZvY2FsYXV0b3R1bmVcIiB8fCB3LmlkID09PSBcImF1dG90dW5lXCIpICYmIDxWb2NhbEF1dG9UdW5lIC8+fVxuICAgICAgICAgICAgICB7dy5pZCA9PT0gXCJkanNldG1peFwiICYmIDxESlNldE1peFN0dWRpbyAvPn1cbiAgICAgICAgICAgICAge3cuaWQgPT09IFwibW9iaWxlXCIgJiYgPE1vYmlsZUNvbnRyb2xsZXIgLz59XG4gICAgICAgICAgICAgIHt3LmlkID09PSBcImdpdGh1Yi1wdWJsaXNoZXJcIiAmJiA8R2l0SHViUHVibGlzaGVyIHBhZHM9e3BhZHN9IGJwbT17YnBtfSBtYXN0ZXJWb2x1bWU9e21hc3RlclZvbHVtZX0gLz59XG4gICAgICAgICAgICA8L1dpbmRvd0ZyYW1lPlxuICAgICAgICAgIClcbiAgICAgICAgfSl9XG4gICAgICA8L2Rpdj5cblxuICAgICAgPFRhc2tiYXJcbiAgICAgICAgd2luZG93cz17d2luZG93cy5maWx0ZXIoKHcpID0+IHcuaXNPcGVuKX1cbiAgICAgICAgaXNQbGF5aW5nPXtpc1BsYXlpbmd9IGJwbT17YnBtfSBjdXJyZW50U3RlcD17Y3VycmVudFN0ZXB9IG1hc3RlclZvbHVtZT17bWFzdGVyVm9sdW1lfVxuICAgICAgICBvblRvZ2dsZVBsYXk9e2hhbmRsZVRvZ2dsZVBsYXl9IG9uVXBkYXRlQlBNPXt1cGRhdGVCUE19IG9uVXBkYXRlTWFzdGVyVm9sdW1lPXtzZXRNYXN0ZXJWb2x1bWV9XG4gICAgICAgIG9uVG9nZ2xlV2luZG93PXt0b2dnbGVXaW5kb3d9IG9uUmVzZXRQcm9qZWN0PXsoKSA9PiB7IHNldFdpbmRvd3MoW10pOyBvcGVuV2luZG93KFwiZ3JpZFwiKTsgfX1cbiAgICAgICAgb25VbmRvPXtoYW5kbGVVbmRvfSBvblJlZG89e2hhbmRsZVJlZG99IGNhblVuZG89e2hpc3RvcnkubGVuZ3RoID4gMH0gY2FuUmVkbz17ZnV0dXJlLmxlbmd0aCA+IDB9XG4gICAgICAvPlxuICAgIDwvZGl2PlxuICApO1xufVxuIl19