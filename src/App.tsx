import.meta.env = {"BASE_URL": "/", "DEV": true, "MODE": "development", "PROD": false, "SSR": false};const React = __vite__cjsImport0_react; const useState = __vite__cjsImport0_react["useState"]; const useEffect = __vite__cjsImport0_react["useEffect"]; const useRef = __vite__cjsImport0_react["useRef"];const _jsxDEV = __vite__cjsImport3_react_jsxDevRuntime["jsxDEV"];/**
* @license
* SPDX-License-Identifier: Apache-2.0
*/
import __vite__cjsImport0_react from "/node_modules/.vite/deps/react.js?v=960caa02";
import { GoogleGenAI } from "/node_modules/.vite/deps/@google_genai.js?v=fc6d6689";
import { Grid, Sliders, Activity, Disc, Sparkles, Network, Move, Folder, Zap, Smartphone, Mic2, Mic, Scissors, LayoutGrid, BarChart, Music, Radio, Github, Play, Square, X, Minus, Maximize2, Volume2, RefreshCw, Bot, Send, Terminal, Wand2, RotateCcw, RotateCw } from "/node_modules/.vite/deps/lucide-react.js?v=267a4b92";
var _jsxFileName = "/app/applet/src/App.tsx";
import __vite__cjsImport3_react_jsxDevRuntime from "/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=960caa02";
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
	const [activeTab, setActiveTab] = useState("presets");
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
	const templates = [
		{
			name: "Techno Starter",
			bpm: 130,
			description: "Driving 4/4 rhythm with heavy sub bass and hypnotic synth leads.",
			genre: "Electronic / Techno",
			masterVolume: .9,
			modifier: (p, idx) => ({
				...p,
				active: idx % 4 === 0,
				volume: idx % 4 === 0 ? 90 : 40
			})
		},
		{
			name: "Lo-Fi Chill",
			bpm: 85,
			description: "Mellow chords, vinyl dust texture, and relaxed acoustic groove.",
			genre: "Hip-Hop / Lo-Fi",
			masterVolume: .8,
			modifier: (p, idx) => ({
				...p,
				active: idx % 2 === 0,
				volume: 70
			})
		},
		{
			name: "Trap Beat",
			bpm: 140,
			description: "Rapid hi-hat rolls, deep 808 sub bass, and crisp snare hits.",
			genre: "Hip-Hop / Trap",
			masterVolume: .85,
			modifier: (p, idx) => ({
				...p,
				active: idx < 8,
				volume: 85
			})
		}
	];
	const handleLoadTemplate = (tpl) => {
		const updatedPads = pads.map((p, idx) => tpl.modifier(p, idx));
		onLoadPreset({
			pads: updatedPads,
			bpm: tpl.bpm,
			masterVolume: tpl.masterVolume
		});
		setStatusMessage(`Template "${tpl.name}" loaded successfully!`);
		setTimeout(() => setStatusMessage(""), 3e3);
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
						lineNumber: 1206,
						columnNumber: 11
					}, this), " DAW PRESET & EXPORT MANAGER"]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 1205,
					columnNumber: 9
				}, this), /* @__PURE__ */ _jsxDEV("span", {
					className: "px-2 py-0.5 bg-amber-950 text-amber-300 text-[10px] rounded border border-amber-900",
					children: "v2.0"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 1208,
					columnNumber: 9
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 1204,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ _jsxDEV("div", {
				className: "bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col gap-3",
				children: [/* @__PURE__ */ _jsxDEV("span", {
					className: "text-[10px] text-cyan-400 font-bold uppercase tracking-wider",
					children: "PROJECT & AUDIO EXPORTS"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 1212,
					columnNumber: 9
				}, this), /* @__PURE__ */ _jsxDEV("div", {
					className: "grid grid-cols-2 gap-2",
					children: [/* @__PURE__ */ _jsxDEV("button", {
						onClick: handleExportJSON,
						className: "py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg transition-all shadow-[0_0_10px_rgba(8,145,178,0.3)] cursor-pointer",
						children: "EXPORT JSON FILE"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 1214,
						columnNumber: 11
					}, this), /* @__PURE__ */ _jsxDEV("button", {
						onClick: handleToggleRecordAudio,
						className: `py-2.5 font-bold rounded-lg transition-all cursor-pointer ${isRecordingAudio ? "bg-red-600 text-white shadow-[0_0_15px_#dc2626] animate-pulse" : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_10px_rgba(5,150,105,0.3)]"}`,
						children: isRecordingAudio ? "STOP RECORDING AUDIO" : "RENDER AUDIO (WAV/WEBM)"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 1220,
						columnNumber: 11
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 1213,
					columnNumber: 9
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 1211,
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
						lineNumber: 1230,
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
							lineNumber: 1232,
							columnNumber: 11
						}, this), /* @__PURE__ */ _jsxDEV("button", {
							onClick: handleSavePreset,
							className: "px-5 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-black rounded-lg transition-all shadow-[0_0_12px_rgba(245,158,11,0.3)] cursor-pointer",
							children: "SAVE"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 1239,
							columnNumber: 11
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 1231,
						columnNumber: 9
					}, this),
					statusMessage && /* @__PURE__ */ _jsxDEV("div", {
						className: "p-2 bg-emerald-950 border border-emerald-800 text-emerald-400 text-[10px] rounded text-center font-bold",
						children: statusMessage
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 1247,
						columnNumber: 11
					}, this)
				]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 1229,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ _jsxDEV("div", {
				className: "flex gap-2 border-b border-slate-800 pb-2",
				children: [/* @__PURE__ */ _jsxDEV("button", {
					onClick: () => setActiveTab("presets"),
					className: `px-4 py-2 font-bold rounded-lg text-xs transition-colors cursor-pointer ${activeTab === "presets" ? "bg-amber-600 text-slate-950 shadow-[0_0_10px_rgba(245,158,11,0.3)]" : "bg-slate-950 text-slate-400 hover:bg-slate-800"}`,
					children: [
						"SAVED PRESETS (",
						savedPresets.length,
						")"
					]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 1255,
					columnNumber: 9
				}, this), /* @__PURE__ */ _jsxDEV("button", {
					onClick: () => setActiveTab("templates"),
					className: `px-4 py-2 font-bold rounded-lg text-xs transition-colors cursor-pointer ${activeTab === "templates" ? "bg-amber-600 text-slate-950 shadow-[0_0_10px_rgba(245,158,11,0.3)]" : "bg-slate-950 text-slate-400 hover:bg-slate-800"}`,
					children: [
						"TEMPLATES (",
						templates.length,
						")"
					]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 1261,
					columnNumber: 9
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 1254,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ _jsxDEV("div", {
				className: "flex-1 flex flex-col gap-2 min-h-[160px]",
				children: activeTab === "presets" ? /* @__PURE__ */ _jsxDEV("div", {
					className: "flex-1 bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-col gap-2 overflow-y-auto",
					children: savedPresets.length === 0 ? /* @__PURE__ */ _jsxDEV("div", {
						className: "text-slate-500 text-center py-8",
						children: "No saved presets found in local storage. Save your project above!"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 1273,
						columnNumber: 15
					}, this) : savedPresets.map((p, idx) => /* @__PURE__ */ _jsxDEV("div", {
						className: "flex items-center justify-between p-3 bg-slate-900 border border-slate-800 rounded-lg hover:border-slate-700",
						children: [/* @__PURE__ */ _jsxDEV("div", {
							className: "flex flex-col gap-0.5",
							children: [/* @__PURE__ */ _jsxDEV("span", {
								className: "font-bold text-slate-200",
								children: p.name
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 1278,
								columnNumber: 21
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
								lineNumber: 1279,
								columnNumber: 21
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 1277,
							columnNumber: 19
						}, this), /* @__PURE__ */ _jsxDEV("div", {
							className: "flex items-center gap-2",
							children: [/* @__PURE__ */ _jsxDEV("button", {
								onClick: () => handleLoadPreset(p),
								className: "px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded text-[10px] transition-colors cursor-pointer",
								children: "LOAD"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 1282,
								columnNumber: 21
							}, this), /* @__PURE__ */ _jsxDEV("button", {
								onClick: () => handleDeletePreset(p.name),
								className: "px-3 py-1.5 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white font-bold rounded text-[10px] transition-colors cursor-pointer",
								children: "DEL"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 1288,
								columnNumber: 21
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 1281,
							columnNumber: 19
						}, this)]
					}, idx, true, {
						fileName: _jsxFileName,
						lineNumber: 1276,
						columnNumber: 17
					}, this))
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 1271,
					columnNumber: 11
				}, this) : /* @__PURE__ */ _jsxDEV("div", {
					className: "flex-1 bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-col gap-2 overflow-y-auto",
					children: templates.map((tpl, idx) => /* @__PURE__ */ _jsxDEV("div", {
						className: "flex items-center justify-between p-3 bg-slate-900 border border-slate-800 rounded-lg hover:border-slate-700",
						children: [/* @__PURE__ */ _jsxDEV("div", {
							className: "flex flex-col gap-1 max-w-[70%]",
							children: [
								/* @__PURE__ */ _jsxDEV("div", {
									className: "flex items-center gap-2",
									children: [/* @__PURE__ */ _jsxDEV("span", {
										className: "font-bold text-amber-400",
										children: tpl.name
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 1305,
										columnNumber: 21
									}, this), /* @__PURE__ */ _jsxDEV("span", {
										className: "px-1.5 py-0.5 bg-slate-800 text-slate-300 text-[9px] rounded",
										children: tpl.genre
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 1306,
										columnNumber: 21
									}, this)]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 1304,
									columnNumber: 19
								}, this),
								/* @__PURE__ */ _jsxDEV("span", {
									className: "text-[10px] text-slate-400",
									children: tpl.description
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 1308,
									columnNumber: 19
								}, this),
								/* @__PURE__ */ _jsxDEV("span", {
									className: "text-[9px] text-cyan-400",
									children: [
										"Default Tempo: ",
										tpl.bpm,
										" BPM"
									]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 1309,
									columnNumber: 19
								}, this)
							]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 1303,
							columnNumber: 17
						}, this), /* @__PURE__ */ _jsxDEV("button", {
							onClick: () => handleLoadTemplate(tpl),
							className: "px-4 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-black rounded text-xs transition-all shadow-[0_0_10px_rgba(245,158,11,0.2)] cursor-pointer",
							children: "LOAD TEMPLATE"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 1311,
							columnNumber: 17
						}, this)]
					}, idx, true, {
						fileName: _jsxFileName,
						lineNumber: 1302,
						columnNumber: 15
					}, this))
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 1300,
					columnNumber: 11
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 1269,
				columnNumber: 7
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 1203,
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
					lineNumber: 1332,
					columnNumber: 10
				}, this),
				/* @__PURE__ */ _jsxDEV("div", {
					className: "flex justify-between items-center bg-slate-900 p-3 rounded-xl border border-slate-800",
					children: [/* @__PURE__ */ _jsxDEV("span", {
						className: "text-[10px] text-slate-400 font-bold",
						children: "REMIX OS REMOTE"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 1334,
						columnNumber: 12
					}, this), /* @__PURE__ */ _jsxDEV("span", { className: "w-2 h-2 rounded-full bg-emerald-400 animate-pulse" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 1335,
						columnNumber: 12
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 1333,
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
						lineNumber: 1339,
						columnNumber: 12
					}, this), /* @__PURE__ */ _jsxDEV("button", {
						onClick: () => audioEngine.stop(),
						className: "py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-black",
						children: "STOP"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 1340,
						columnNumber: 12
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 1338,
					columnNumber: 10
				}, this),
				/* @__PURE__ */ _jsxDEV("div", {
					className: "h-32 bg-slate-900 rounded-xl border border-slate-800 relative overflow-hidden flex items-center justify-center cursor-crosshair",
					children: [/* @__PURE__ */ _jsxDEV("div", { className: "absolute inset-0 opacity-25 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-cyan-400 via-transparent to-transparent" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 1344,
						columnNumber: 12
					}, this), /* @__PURE__ */ _jsxDEV("span", {
						className: "text-[10px] text-slate-500",
						children: "XY PERFORMANCE PAD"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 1345,
						columnNumber: 12
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 1343,
					columnNumber: 10
				}, this),
				/* @__PURE__ */ _jsxDEV("button", {
					onClick: () => setMotionTilt(!motionTilt),
					className: `py-3 rounded-xl font-bold transition-colors ${motionTilt ? "bg-emerald-600 text-white shadow-[0_0_10px_#059669]" : "bg-slate-800 text-slate-400"}`,
					children: motionTilt ? "MOTION TILT: ACTIVE" : "ENABLE MOTION TILT"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 1348,
					columnNumber: 10
				}, this)
			]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 1331,
			columnNumber: 8
		}, this)
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 1330,
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
					lineNumber: 1382,
					columnNumber: 12
				}, this), " LIVE AUDIO LOOPER STATION"]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 1381,
				columnNumber: 10
			}, this), /* @__PURE__ */ _jsxDEV("div", {
				className: "flex items-center gap-2",
				children: [/* @__PURE__ */ _jsxDEV("span", {
					className: "text-[10px] text-slate-500",
					children: "QUANTIZE:"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 1385,
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
					lineNumber: 1387,
					columnNumber: 14
				}, this))]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 1384,
				columnNumber: 10
			}, this)]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 1380,
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
							lineNumber: 1403,
							columnNumber: 16
						}, this), /* @__PURE__ */ _jsxDEV("div", {
							className: "flex flex-col truncate",
							children: [/* @__PURE__ */ _jsxDEV("span", {
								className: "font-bold text-slate-200 truncate",
								children: track.name
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 1416,
								columnNumber: 18
							}, this), /* @__PURE__ */ _jsxDEV("span", {
								className: `text-[9px] uppercase ${track.state === "recording" ? "text-red-400" : track.state === "playing" ? "text-indigo-400" : "text-slate-500"}`,
								children: ["Status: ", track.state]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 1417,
								columnNumber: 18
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 1415,
							columnNumber: 16
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 1402,
						columnNumber: 14
					}, this),
					/* @__PURE__ */ _jsxDEV("div", {
						className: "flex-1 h-8 bg-slate-900 rounded border border-slate-800 flex items-center px-2 relative overflow-hidden",
						children: [/* @__PURE__ */ _jsxDEV("div", { className: "absolute inset-y-0 left-1/3 w-0.5 bg-indigo-500 z-10" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 1424,
							columnNumber: 16
						}, this), /* @__PURE__ */ _jsxDEV("div", {
							className: "w-full flex items-center gap-0.5",
							children: Array.from({ length: 40 }).map((_, i) => /* @__PURE__ */ _jsxDEV("div", {
								className: "flex-1 bg-indigo-500/40 rounded-sm",
								style: { height: `${Math.sin(i / 2) * 40 + 50}%` }
							}, i, false, {
								fileName: _jsxFileName,
								lineNumber: 1427,
								columnNumber: 20
							}, this))
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 1425,
							columnNumber: 16
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 1423,
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
							lineNumber: 1433,
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
							lineNumber: 1439,
							columnNumber: 16
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 1432,
						columnNumber: 14
					}, this)
				]
			}, track.id, true, {
				fileName: _jsxFileName,
				lineNumber: 1401,
				columnNumber: 12
			}, this))
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 1399,
			columnNumber: 8
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 1379,
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
						lineNumber: 1582,
						columnNumber: 11
					}, this), " POLYPHONIC MULTI-SAMPLE LAYER ENGINE"]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 1581,
					columnNumber: 9
				}, this), /* @__PURE__ */ _jsxDEV("div", {
					className: "flex items-center gap-2",
					children: /* @__PURE__ */ _jsxDEV("span", {
						className: "px-2 py-0.5 bg-teal-950 text-teal-300 text-[10px] rounded border border-teal-800 font-bold",
						children: "4-LAYER POLYPHONIC"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 1585,
						columnNumber: 11
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 1584,
					columnNumber: 9
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 1580,
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
							lineNumber: 1606,
							columnNumber: 13
						}, this),
						/* @__PURE__ */ _jsxDEV("div", {
							className: "flex justify-between items-center",
							children: [/* @__PURE__ */ _jsxDEV("span", {
								className: "text-[10px] text-teal-400 font-bold",
								children: layer.layerName
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 1619,
								columnNumber: 15
							}, this), /* @__PURE__ */ _jsxDEV("div", {
								className: "flex items-center gap-1.5",
								children: [/* @__PURE__ */ _jsxDEV("button", {
									onClick: () => updateLayerParam(idx, "active", !layer.active),
									className: `px-1.5 py-0.5 rounded text-[9px] font-bold uppercase transition-colors ${layer.active ? "bg-teal-600 text-white" : "bg-slate-800 text-slate-500"}`,
									children: layer.active ? "ON" : "MUTE"
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 1621,
									columnNumber: 17
								}, this), /* @__PURE__ */ _jsxDEV("span", {
									className: `text-[9px] px-1.5 py-0.5 rounded ${layer.loaded ? "bg-teal-950 text-teal-400 border border-teal-900" : "bg-slate-800 text-slate-500"}`,
									children: layer.duration
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 1629,
									columnNumber: 17
								}, this)]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 1620,
								columnNumber: 15
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 1618,
							columnNumber: 13
						}, this),
						/* @__PURE__ */ _jsxDEV("div", {
							className: "flex items-center justify-between bg-slate-900 p-2 rounded border border-slate-800",
							children: [/* @__PURE__ */ _jsxDEV("span", {
								className: "font-bold text-slate-200 truncate max-w-[160px] text-[11px]",
								children: layer.name
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 1636,
								columnNumber: 15
							}, this), /* @__PURE__ */ _jsxDEV("button", {
								onClick: () => fileInputRefs.current[idx]?.click(),
								className: "px-2 py-1 bg-teal-950 hover:bg-teal-900 border border-teal-800 text-teal-300 text-[9px] font-bold rounded transition-colors",
								children: "BROWSE"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 1637,
								columnNumber: 15
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 1635,
							columnNumber: 13
						}, this),
						/* @__PURE__ */ _jsxDEV("div", {
							onClick: () => fileInputRefs.current[idx]?.click(),
							className: "text-[9px] text-slate-500 text-center border border-dashed border-slate-800 hover:border-teal-500/50 rounded py-1 cursor-pointer transition-colors",
							children: "Drag & Drop local audio sample here"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 1645,
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
									lineNumber: 1653,
									columnNumber: 15
								}, this),
								/* @__PURE__ */ _jsxDEV(Knob, {
									label: "PITCH",
									value: (layer.pitchOffset + 12) / 24 * 100,
									color: "teal",
									onChange: (v) => updateLayerParam(idx, "pitchOffset", Math.round(v / 100 * 24 - 12))
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 1659,
									columnNumber: 15
								}, this),
								/* @__PURE__ */ _jsxDEV(Knob, {
									label: "PAN",
									value: (layer.pan + 1) / 2 * 100,
									color: "teal",
									onChange: (v) => updateLayerParam(idx, "pan", v / 100 * 2 - 1)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 1665,
									columnNumber: 15
								}, this)
							]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 1652,
							columnNumber: 13
						}, this)
					]
				}, layer.id, true, {
					fileName: _jsxFileName,
					lineNumber: 1593,
					columnNumber: 11
				}, this))
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 1591,
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
						lineNumber: 1678,
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
						lineNumber: 1679,
						columnNumber: 11
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 1677,
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
								lineNumber: 1687,
								columnNumber: 15
							}, this), /* @__PURE__ */ _jsxDEV("path", {
								d: getAdsrSvgPath(),
								fill: "none",
								stroke: "#2dd4bf",
								strokeWidth: "2.5",
								className: "drop-shadow-[0_0_8px_#2dd4bf]"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 1688,
								columnNumber: 15
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 1686,
							columnNumber: 13
						}, this)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 1685,
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
								lineNumber: 1699,
								columnNumber: 13
							}, this),
							/* @__PURE__ */ _jsxDEV(Knob, {
								label: "DECAY",
								value: adsr.decay,
								color: "teal",
								onChange: (v) => handleAdsrChange("decay", v)
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 1700,
								columnNumber: 13
							}, this),
							/* @__PURE__ */ _jsxDEV(Knob, {
								label: "SUSTAIN",
								value: adsr.sustain,
								color: "teal",
								onChange: (v) => handleAdsrChange("sustain", v)
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 1701,
								columnNumber: 13
							}, this),
							/* @__PURE__ */ _jsxDEV(Knob, {
								label: "RELEASE",
								value: adsr.release,
								color: "teal",
								onChange: (v) => handleAdsrChange("release", v)
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 1702,
								columnNumber: 13
							}, this)
						]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 1698,
						columnNumber: 11
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 1684,
					columnNumber: 9
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 1676,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ _jsxDEV("div", {
				className: "bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col gap-2",
				children: [/* @__PURE__ */ _jsxDEV("div", {
					className: "flex justify-between items-center text-[10px] text-slate-400 font-bold",
					children: [/* @__PURE__ */ _jsxDEV("span", { children: "POLYPHONIC PLAYBACK KEYBOARD" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 1709,
						columnNumber: 11
					}, this), /* @__PURE__ */ _jsxDEV("span", {
						className: "text-teal-400",
						children: "MULTI-NOTE POLYPHONY ACTIVE"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 1710,
						columnNumber: 11
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 1708,
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
									lineNumber: 1724,
									columnNumber: 19
								}, this)
							}, idx, false, {
								fileName: _jsxFileName,
								lineNumber: 1717,
								columnNumber: 17
							}, this);
						} else {
							return /* @__PURE__ */ _jsxDEV("button", {
								onClick: () => triggerNote(idx, note.freq),
								className: `w-4 h-11 bg-slate-900 border border-slate-700 rounded-b absolute z-10 -ml-2 transition-all ${isActive ? "bg-teal-400 shadow-[0_0_12px_#2dd4bf]" : "hover:bg-slate-800"}`,
								style: { left: `${idx * 3.8}%` }
							}, idx, false, {
								fileName: _jsxFileName,
								lineNumber: 1729,
								columnNumber: 17
							}, this);
						}
					})
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 1712,
					columnNumber: 9
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 1707,
				columnNumber: 7
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 1579,
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
						lineNumber: 1840,
						columnNumber: 11
					}, this), " PRO PARAMETRIC EQ 4-BAND (REAL-TIME SPECTRAL ANALYZER)"]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 1839,
					columnNumber: 9
				}, this), /* @__PURE__ */ _jsxDEV("span", {
					className: "px-2 py-0.5 bg-emerald-950 text-emerald-400 text-[10px] rounded border border-emerald-900 font-bold",
					children: "ANALYSER ACTIVE"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 1842,
					columnNumber: 9
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 1838,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ _jsxDEV("div", {
				className: "bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col gap-2 relative overflow-hidden shadow-inner",
				children: [/* @__PURE__ */ _jsxDEV("div", {
					className: "flex justify-between text-[9px] text-slate-500 px-1 font-bold",
					children: [
						/* @__PURE__ */ _jsxDEV("span", { children: "20Hz (SUB)" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 1849,
							columnNumber: 11
						}, this),
						/* @__PURE__ */ _jsxDEV("span", { children: "100Hz (BASS)" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 1850,
							columnNumber: 11
						}, this),
						/* @__PURE__ */ _jsxDEV("span", { children: "500Hz (MID)" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 1851,
							columnNumber: 11
						}, this),
						/* @__PURE__ */ _jsxDEV("span", { children: "2kHz (PRESENCE)" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 1852,
							columnNumber: 11
						}, this),
						/* @__PURE__ */ _jsxDEV("span", { children: "8kHz (TREBLE)" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 1853,
							columnNumber: 11
						}, this),
						/* @__PURE__ */ _jsxDEV("span", { children: "20kHz (AIR)" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 1854,
							columnNumber: 11
						}, this)
					]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 1848,
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
						lineNumber: 1858,
						columnNumber: 11
					}, this), spectrumData.map((val, i) => /* @__PURE__ */ _jsxDEV("div", {
						className: "flex-1 h-full flex flex-col justify-end relative",
						children: [/* @__PURE__ */ _jsxDEV("div", {
							className: "w-full bg-gradient-to-t from-emerald-600 via-cyan-400 to-amber-300 rounded-t-sm transition-all duration-75 shadow-[0_0_8px_rgba(52,211,153,0.3)]",
							style: { height: `${val}%` }
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 1867,
							columnNumber: 15
						}, this), /* @__PURE__ */ _jsxDEV("div", {
							className: "w-full h-0.5 bg-amber-200 shadow-[0_0_5px_#fde047] absolute top-0 transition-all duration-150 opacity-80",
							style: { bottom: `${Math.min(98, val + 2)}%` }
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 1871,
							columnNumber: 15
						}, this)]
					}, i, true, {
						fileName: _jsxFileName,
						lineNumber: 1866,
						columnNumber: 13
					}, this))]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 1857,
					columnNumber: 9
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 1847,
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
						lineNumber: 1883,
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
								lineNumber: 1885,
								columnNumber: 15
							}, this),
							/* @__PURE__ */ _jsxDEV(Knob, {
								label: "GAIN",
								value: band.gain,
								color: band.color,
								onChange: (v) => handleBandChange(idx, "gain", v)
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 1886,
								columnNumber: 15
							}, this),
							/* @__PURE__ */ _jsxDEV(Knob, {
								label: "Q",
								value: band.q,
								color: band.color,
								onChange: (v) => handleBandChange(idx, "q", v)
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 1887,
								columnNumber: 15
							}, this)
						]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 1884,
						columnNumber: 13
					}, this)]
				}, idx, true, {
					fileName: _jsxFileName,
					lineNumber: 1882,
					columnNumber: 11
				}, this))
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 1880,
				columnNumber: 7
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 1837,
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
						lineNumber: 1905,
						columnNumber: 12
					}, this), " VOICE PITCH TRAINER & TUNER"]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 1904,
					columnNumber: 10
				}, this), /* @__PURE__ */ _jsxDEV("span", {
					className: "px-2 py-0.5 bg-rose-950 text-rose-400 text-[10px] rounded border border-rose-900",
					children: "TUNER ACTIVE"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 1907,
					columnNumber: 10
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 1903,
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
						lineNumber: 1912,
						columnNumber: 10
					}, this),
					/* @__PURE__ */ _jsxDEV("div", {
						className: "text-4xl font-black text-rose-400 tracking-wider drop-shadow-[0_0_10px_rgba(244,63,94,0.4)]",
						children: detectedNote
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 1913,
						columnNumber: 10
					}, this),
					/* @__PURE__ */ _jsxDEV("div", {
						className: "w-full max-w-sm h-12 bg-slate-900 rounded-xl border border-slate-800 relative flex items-center justify-center overflow-hidden",
						children: [
							/* @__PURE__ */ _jsxDEV("div", { className: "absolute inset-x-0 top-1/2 h-0.5 bg-slate-800" }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 1919,
								columnNumber: 12
							}, this),
							/* @__PURE__ */ _jsxDEV("div", { className: "absolute top-0 bottom-0 w-1 bg-rose-500 shadow-[0_0_10px_#f43f5e] left-[52%]" }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 1920,
								columnNumber: 12
							}, this),
							/* @__PURE__ */ _jsxDEV("div", { className: "absolute inset-y-0 left-1/2 w-0.5 bg-emerald-400" }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 1921,
								columnNumber: 12
							}, this),
							/* @__PURE__ */ _jsxDEV("div", {
								className: "flex justify-between w-full px-4 text-[9px] text-slate-500 font-bold z-10",
								children: [
									/* @__PURE__ */ _jsxDEV("span", { children: "-50ct" }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 1923,
										columnNumber: 14
									}, this),
									/* @__PURE__ */ _jsxDEV("span", {
										className: "text-emerald-400",
										children: "0ct (IN TUNE)"
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 1924,
										columnNumber: 14
									}, this),
									/* @__PURE__ */ _jsxDEV("span", { children: "+50ct" }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 1925,
										columnNumber: 14
									}, this)
								]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 1922,
								columnNumber: 12
							}, this)
						]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 1918,
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
								lineNumber: 1931,
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
									lineNumber: 1937,
									columnNumber: 69
								}, this))
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 1932,
								columnNumber: 14
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 1930,
							columnNumber: 12
						}, this), /* @__PURE__ */ _jsxDEV("div", {
							className: "flex flex-col items-end",
							children: [/* @__PURE__ */ _jsxDEV("span", {
								className: "text-[9px] text-slate-500",
								children: "ACCURACY SCORE"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 1941,
								columnNumber: 14
							}, this), /* @__PURE__ */ _jsxDEV("span", {
								className: "text-emerald-400 font-bold text-sm",
								children: [accuracy, "% IN TUNE"]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 1942,
								columnNumber: 14
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 1940,
							columnNumber: 12
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 1929,
						columnNumber: 10
					}, this)
				]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 1911,
				columnNumber: 8
			}, this),
			/* @__PURE__ */ _jsxDEV("button", {
				onClick: () => setIsTraining(!isTraining),
				className: `w-full py-3 rounded-xl font-black tracking-widest transition-all ${isTraining ? "bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.4)]" : "bg-slate-800 text-slate-400"}`,
				children: isTraining ? "STOP VOICE PRACTICE SESSION" : "START VOICE PRACTICE SESSION"
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 1947,
				columnNumber: 8
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 1902,
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
						lineNumber: 1966,
						columnNumber: 12
					}, this), " VOCAL TRANSFORMER & FX"]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 1965,
					columnNumber: 10
				}, this), /* @__PURE__ */ _jsxDEV("span", {
					className: "px-2 py-0.5 bg-purple-950 text-purple-400 text-[10px] rounded border border-purple-900",
					children: "DSP RACK"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 1968,
					columnNumber: 10
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 1964,
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
					lineNumber: 1974,
					columnNumber: 12
				}, this))
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 1972,
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
						lineNumber: 1991,
						columnNumber: 12
					}, this), /* @__PURE__ */ _jsxDEV(Knob, {
						label: "FORMANT",
						value: formant,
						color: "violet",
						onChange: (v) => setFormant(v)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 1992,
						columnNumber: 12
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 1990,
					columnNumber: 10
				}, this), /* @__PURE__ */ _jsxDEV("div", {
					className: "bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col items-center gap-4",
					children: [/* @__PURE__ */ _jsxDEV("span", {
						className: "text-[10px] text-purple-400 font-bold tracking-widest border-b border-slate-800 pb-2 w-full text-center",
						children: "PITCH TRANSPOSITION"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 1996,
						columnNumber: 12
					}, this), /* @__PURE__ */ _jsxDEV(Knob, {
						label: "SEMITONES",
						value: pitchShift + 50,
						color: "violet",
						onChange: (v) => setPitchShift(v - 50)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 1997,
						columnNumber: 12
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 1995,
					columnNumber: 10
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 1989,
				columnNumber: 8
			}, this),
			/* @__PURE__ */ _jsxDEV("div", {
				className: "bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col gap-2 shadow-inner",
				children: [/* @__PURE__ */ _jsxDEV("span", {
					className: "text-[10px] text-slate-500",
					children: "REALTIME VOCAL FORMANT SPECTRUM"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 2003,
					columnNumber: 10
				}, this), /* @__PURE__ */ _jsxDEV("div", {
					className: "h-20 flex items-end gap-1",
					children: Array.from({ length: 30 }).map((_, i) => /* @__PURE__ */ _jsxDEV("div", {
						className: "flex-1 bg-gradient-to-t from-purple-600 to-indigo-400 rounded-t-sm",
						style: { height: `${Math.sin(i / 2) * 40 + Math.cos(i / 1.5) * 25 + 50}%` }
					}, i, false, {
						fileName: _jsxFileName,
						lineNumber: 2006,
						columnNumber: 14
					}, this))
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 2004,
					columnNumber: 10
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 2002,
				columnNumber: 8
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 1963,
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
						lineNumber: 2023,
						columnNumber: 12
					}, this), " WAVEFORM AUDIO TRIMMER & NORMALIZE"]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 2022,
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
							lineNumber: 2026,
							columnNumber: 12
						}, this),
						/* @__PURE__ */ _jsxDEV("button", {
							onClick: () => setZoom(1),
							className: "px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-bold",
							children: "1:1"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 2027,
							columnNumber: 12
						}, this),
						/* @__PURE__ */ _jsxDEV("button", {
							onClick: () => setZoom(Math.min(3, zoom + .25)),
							className: "px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-bold",
							children: "ZOOM +"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 2028,
							columnNumber: 12
						}, this)
					]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 2025,
					columnNumber: 10
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 2021,
				columnNumber: 8
			}, this),
			/* @__PURE__ */ _jsxDEV("div", {
				className: "bg-slate-950 p-5 rounded-xl border border-slate-800 flex flex-col gap-3 relative overflow-hidden shadow-inner",
				children: [/* @__PURE__ */ _jsxDEV("div", {
					className: "flex justify-between text-[9px] text-slate-500",
					children: [
						/* @__PURE__ */ _jsxDEV("span", { children: "0.0s" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 2035,
							columnNumber: 12
						}, this),
						/* @__PURE__ */ _jsxDEV("span", { children: "1.2s" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 2036,
							columnNumber: 12
						}, this),
						/* @__PURE__ */ _jsxDEV("span", { children: "2.4s" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 2037,
							columnNumber: 12
						}, this)
					]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 2034,
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
						lineNumber: 2041,
						columnNumber: 12
					}, this), Array.from({ length: 48 }).map((_, i) => /* @__PURE__ */ _jsxDEV("div", {
						className: `flex-1 rounded-sm transition-all ${normalized ? "bg-emerald-400" : "bg-blue-400"}`,
						style: { height: `${Math.sin(i / 2) * 40 + Math.cos(i / 1.5) * 30 + 50}%` }
					}, i, false, {
						fileName: _jsxFileName,
						lineNumber: 2044,
						columnNumber: 14
					}, this))]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 2039,
					columnNumber: 10
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 2033,
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
						lineNumber: 2056,
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
								lineNumber: 2059,
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
								lineNumber: 2060,
								columnNumber: 16
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 2058,
							columnNumber: 14
						}, this), /* @__PURE__ */ _jsxDEV("div", {
							className: "flex justify-between",
							children: [/* @__PURE__ */ _jsxDEV("span", { children: [
								"End Marker: ",
								(endMarker * .024).toFixed(2),
								"s"
							] }, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 2063,
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
								lineNumber: 2064,
								columnNumber: 16
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 2062,
							columnNumber: 14
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 2057,
						columnNumber: 12
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 2055,
					columnNumber: 10
				}, this), /* @__PURE__ */ _jsxDEV("div", {
					className: "bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col gap-3",
					children: [/* @__PURE__ */ _jsxDEV("span", {
						className: "text-[10px] text-blue-300 font-bold tracking-widest border-b border-slate-800 pb-2",
						children: "DSP TOOLS"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 2070,
						columnNumber: 12
					}, this), /* @__PURE__ */ _jsxDEV("div", {
						className: "flex flex-col gap-2",
						children: [/* @__PURE__ */ _jsxDEV("button", {
							onClick: () => setNormalized(!normalized),
							className: `w-full py-2.5 rounded-lg font-bold transition-colors ${normalized ? "bg-emerald-600 text-white shadow-[0_0_10px_#059669]" : "bg-slate-800 hover:bg-slate-700 text-slate-300"}`,
							children: normalized ? "NORMALIZED TO 0dB (ACTIVE)" : "NORMALIZE AUDIO"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 2072,
							columnNumber: 14
						}, this), /* @__PURE__ */ _jsxDEV("button", {
							className: "w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-colors shadow-[0_0_10px_rgba(37,99,235,0.3)]",
							children: "CROP & EXPORT REGION"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 2078,
							columnNumber: 14
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 2071,
						columnNumber: 12
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 2069,
					columnNumber: 10
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 2054,
				columnNumber: 8
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 2020,
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
					lineNumber: 2103,
					columnNumber: 12
				}, this), " AUDIO ROUTING MATRIX (CROSIS)"]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 2102,
				columnNumber: 10
			}, this), /* @__PURE__ */ _jsxDEV("span", {
				className: "px-2 py-0.5 bg-cyan-950 text-cyan-400 text-[10px] rounded border border-cyan-900",
				children: "16x16 BUS"
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 2105,
				columnNumber: 10
			}, this)]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 2101,
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
					lineNumber: 2112,
					columnNumber: 16
				}, this), destinations.map((d, i) => /* @__PURE__ */ _jsxDEV("th", {
					className: "p-2 text-center text-cyan-400 font-bold border-b border-slate-800",
					children: d
				}, i, false, {
					fileName: _jsxFileName,
					lineNumber: 2114,
					columnNumber: 18
				}, this))] }, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 2111,
					columnNumber: 14
				}, this) }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 2110,
					columnNumber: 12
				}, this), /* @__PURE__ */ _jsxDEV("tbody", { children: tracks.map((t, ri) => /* @__PURE__ */ _jsxDEV("tr", {
					className: "border-b border-slate-900 hover:bg-slate-900/50",
					children: [/* @__PURE__ */ _jsxDEV("td", {
						className: "p-3 font-bold text-slate-200",
						children: t
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 2121,
						columnNumber: 18
					}, this), destinations.map((_, ci) => /* @__PURE__ */ _jsxDEV("td", {
						className: "p-3 text-center",
						children: /* @__PURE__ */ _jsxDEV("button", {
							onClick: () => toggleCrosspoint(ri, ci),
							className: `w-8 h-8 rounded-lg border transition-all ${matrix[ri][ci] ? "bg-cyan-500 border-white text-slate-950 shadow-[0_0_12px_#22d3ee]" : "bg-slate-900 border-slate-700 hover:bg-slate-800"}`,
							children: matrix[ri][ci] ? "ON" : ""
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 2124,
							columnNumber: 22
						}, this)
					}, ci, false, {
						fileName: _jsxFileName,
						lineNumber: 2123,
						columnNumber: 20
					}, this))]
				}, ri, true, {
					fileName: _jsxFileName,
					lineNumber: 2120,
					columnNumber: 16
				}, this)) }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 2118,
					columnNumber: 12
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 2109,
				columnNumber: 10
			}, this)
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 2108,
			columnNumber: 8
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 2100,
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
						lineNumber: 2152,
						columnNumber: 12
					}, this), " AUTOTUNE PRO PITCH CORRECTION"]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 2151,
					columnNumber: 10
				}, this), /* @__PURE__ */ _jsxDEV("span", {
					className: "px-2 py-0.5 bg-violet-950 text-violet-400 text-[10px] rounded border border-violet-900",
					children: "ZERO LATENCY"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 2154,
					columnNumber: 10
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 2150,
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
						lineNumber: 2159,
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
							lineNumber: 2165,
							columnNumber: 82
						}, this))
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 2160,
						columnNumber: 12
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 2158,
					columnNumber: 10
				}, this), /* @__PURE__ */ _jsxDEV("div", {
					className: "bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col items-center gap-2",
					children: [/* @__PURE__ */ _jsxDEV("span", {
						className: "text-[10px] text-violet-300 font-bold tracking-widest border-b border-slate-800 pb-2 w-full text-center",
						children: "RETUNE SPEED (SNAP)"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 2170,
						columnNumber: 12
					}, this), /* @__PURE__ */ _jsxDEV(Knob, {
						label: "SPEED",
						value: retuneSpeed,
						color: "violet",
						onChange: (v) => setRetuneSpeed(v)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 2171,
						columnNumber: 12
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 2169,
					columnNumber: 10
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 2157,
				columnNumber: 8
			}, this),
			/* @__PURE__ */ _jsxDEV("div", {
				className: "bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col gap-2 shadow-inner",
				children: [/* @__PURE__ */ _jsxDEV("span", {
					className: "text-[10px] text-slate-500",
					children: "PITCH DETECTION & CORRECTION GRID"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 2177,
					columnNumber: 10
				}, this), /* @__PURE__ */ _jsxDEV("div", {
					className: "h-32 bg-slate-900 rounded-lg border border-slate-800 relative overflow-hidden flex flex-col justify-between p-2",
					children: [/* @__PURE__ */ _jsxDEV("div", {
						className: "absolute inset-0 grid grid-cols-8 grid-rows-4 opacity-20",
						children: Array.from({ length: 32 }).map((_, i) => /* @__PURE__ */ _jsxDEV("div", { className: "border border-violet-500" }, i, false, {
							fileName: _jsxFileName,
							lineNumber: 2180,
							columnNumber: 54
						}, this))
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 2179,
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
							lineNumber: 2184,
							columnNumber: 14
						}, this), /* @__PURE__ */ _jsxDEV("path", {
							d: "M 0,65 Q 25,65 50,60 T 100,30",
							fill: "none",
							stroke: "#34d399",
							strokeWidth: "2",
							strokeDasharray: "4"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 2185,
							columnNumber: 14
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 2183,
						columnNumber: 12
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 2178,
					columnNumber: 10
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 2176,
				columnNumber: 8
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 2149,
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
						lineNumber: 2201,
						columnNumber: 12
					}, this), " DUAL DECK DJ MIX STUDIO"]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 2200,
					columnNumber: 10
				}, this), /* @__PURE__ */ _jsxDEV("span", {
					className: "px-2 py-0.5 bg-amber-950 text-amber-400 text-[10px] rounded border border-amber-900",
					children: "MASTER SYNC: 124 BPM"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 2203,
					columnNumber: 10
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 2199,
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
								lineNumber: 2211,
								columnNumber: 14
							}, this), /* @__PURE__ */ _jsxDEV("span", {
								className: "text-[9px] text-emerald-400",
								children: "LOADED: Cyber Anthem.wav"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 2212,
								columnNumber: 14
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 2210,
							columnNumber: 12
						}, this),
						/* @__PURE__ */ _jsxDEV("div", {
							className: "h-20 bg-slate-900 rounded border border-slate-800 flex items-center justify-center relative overflow-hidden",
							children: [/* @__PURE__ */ _jsxDEV("div", { className: "absolute inset-x-0 top-1/2 h-0.5 bg-amber-500/40" }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 2215,
								columnNumber: 14
							}, this), /* @__PURE__ */ _jsxDEV("div", {
								className: "w-16 h-16 rounded-full border-4 border-slate-800 bg-slate-950 flex items-center justify-center shadow-lg animate-spin-slow",
								children: /* @__PURE__ */ _jsxDEV("div", { className: "w-4 h-4 rounded-full bg-amber-400" }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 2217,
									columnNumber: 16
								}, this)
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 2216,
								columnNumber: 14
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 2214,
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
								lineNumber: 2221,
								columnNumber: 14
							}, this), /* @__PURE__ */ _jsxDEV("button", {
								className: "px-3 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded font-bold",
								children: "SYNC"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 2224,
								columnNumber: 14
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 2220,
							columnNumber: 12
						}, this)
					]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 2209,
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
								lineNumber: 2231,
								columnNumber: 14
							}, this), /* @__PURE__ */ _jsxDEV("span", {
								className: "text-[9px] text-emerald-400",
								children: "LOADED: Techno Loop B.wav"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 2232,
								columnNumber: 14
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 2230,
							columnNumber: 12
						}, this),
						/* @__PURE__ */ _jsxDEV("div", {
							className: "h-20 bg-slate-900 rounded border border-slate-800 flex items-center justify-center relative overflow-hidden",
							children: [/* @__PURE__ */ _jsxDEV("div", { className: "absolute inset-x-0 top-1/2 h-0.5 bg-amber-500/40" }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 2235,
								columnNumber: 14
							}, this), /* @__PURE__ */ _jsxDEV("div", {
								className: "w-16 h-16 rounded-full border-4 border-slate-800 bg-slate-950 flex items-center justify-center shadow-lg animate-spin-slow",
								children: /* @__PURE__ */ _jsxDEV("div", { className: "w-4 h-4 rounded-full bg-amber-400" }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 2237,
									columnNumber: 16
								}, this)
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 2236,
								columnNumber: 14
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 2234,
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
								lineNumber: 2241,
								columnNumber: 14
							}, this), /* @__PURE__ */ _jsxDEV("button", {
								className: "px-3 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded font-bold",
								children: "SYNC"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 2244,
								columnNumber: 14
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 2240,
							columnNumber: 12
						}, this)
					]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 2229,
					columnNumber: 10
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 2207,
				columnNumber: 8
			}, this),
			/* @__PURE__ */ _jsxDEV("div", {
				className: "bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col gap-2",
				children: [/* @__PURE__ */ _jsxDEV("div", {
					className: "flex justify-between text-[9px] text-slate-500",
					children: [
						/* @__PURE__ */ _jsxDEV("span", { children: "DECK A" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 2252,
							columnNumber: 12
						}, this),
						/* @__PURE__ */ _jsxDEV("span", { children: "CROSSFADER" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 2253,
							columnNumber: 12
						}, this),
						/* @__PURE__ */ _jsxDEV("span", { children: "DECK B" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 2254,
							columnNumber: 12
						}, this)
					]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 2251,
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
					lineNumber: 2256,
					columnNumber: 10
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 2250,
				columnNumber: 8
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 2198,
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
						lineNumber: 2544,
						columnNumber: 11
					}, this), " GITHUB PROJECT PUBLISHER"]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 2543,
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
							lineNumber: 2547,
							columnNumber: 11
						}, this),
						/* @__PURE__ */ _jsxDEV("button", {
							onClick: () => setActiveTab("new-repo"),
							className: `px-3 py-1 rounded text-[10px] font-bold transition-all ${activeTab === "new-repo" ? "bg-cyan-600 text-white shadow-[0_0_10px_#0891b2]" : "bg-slate-800 text-slate-400 hover:bg-slate-700"}`,
							children: "NEW REPO"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 2555,
							columnNumber: 11
						}, this),
						/* @__PURE__ */ _jsxDEV("button", {
							onClick: () => setActiveTab("settings"),
							className: `px-3 py-1 rounded text-[10px] font-bold transition-all flex items-center gap-1 ${activeTab === "settings" ? "bg-amber-600 text-slate-950 shadow-[0_0_10px_#d97706]" : "bg-slate-800 text-slate-400 hover:bg-slate-700"}`,
							children: [/* @__PURE__ */ _jsxDEV(Sliders, { size: 12 }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 2569,
								columnNumber: 13
							}, this), " SETTINGS"]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 2563,
							columnNumber: 11
						}, this)
					]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 2546,
					columnNumber: 9
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 2542,
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
								lineNumber: 2578,
								columnNumber: 15
							}, this), " GITHUB AUTHENTICATION SETTINGS"]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 2577,
							columnNumber: 13
						}, this), userInfo && /* @__PURE__ */ _jsxDEV("span", {
							className: "text-[9px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded font-bold",
							children: "TOKEN VALIDATED"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 2581,
							columnNumber: 15
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 2576,
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
							lineNumber: 2589,
							columnNumber: 15
						}, this), /* @__PURE__ */ _jsxDEV("div", {
							className: "flex flex-col",
							children: [/* @__PURE__ */ _jsxDEV("span", {
								className: "font-bold text-slate-100 text-sm",
								children: ["@", userInfo.login]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 2591,
								columnNumber: 17
							}, this), /* @__PURE__ */ _jsxDEV("a", {
								href: userInfo.html_url,
								target: "_blank",
								rel: "noreferrer",
								className: "text-[10px] text-cyan-400 hover:underline",
								children: userInfo.html_url
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 2592,
								columnNumber: 17
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 2590,
							columnNumber: 15
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 2588,
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
								lineNumber: 2600,
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
								lineNumber: 2603,
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
										lineNumber: 2611,
										columnNumber: 66
									}, this),
									" scope enabled to create repositories and commit files."
								]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 2610,
								columnNumber: 13
							}, this)
						]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 2599,
						columnNumber: 11
					}, this),
					tokenStatus && /* @__PURE__ */ _jsxDEV("div", {
						className: `p-2.5 rounded-lg text-[10px] font-bold border ${tokenStatus.includes("Authenticated") || tokenStatus.includes("VALIDATED") ? "bg-emerald-950 border-emerald-800 text-emerald-400" : "bg-slate-900 border-slate-800 text-amber-400"}`,
						children: tokenStatus
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 2616,
						columnNumber: 13
					}, this)
				]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 2575,
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
								lineNumber: 2631,
								columnNumber: 15
							}, this), " CREATE NEW GITHUB REPOSITORY"]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 2630,
							columnNumber: 13
						}, this)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 2629,
						columnNumber: 11
					}, this),
					/* @__PURE__ */ _jsxDEV("div", {
						className: "flex flex-col gap-1.5",
						children: [/* @__PURE__ */ _jsxDEV("label", {
							className: "text-[10px] text-slate-400 font-bold",
							children: "REPOSITORY NAME"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 2636,
							columnNumber: 13
						}, this), /* @__PURE__ */ _jsxDEV("input", {
							type: "text",
							value: newRepoName,
							onChange: (e) => setNewRepoName(e.target.value),
							placeholder: "my-remix-daw-project",
							className: "w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-100 outline-none focus:border-cyan-500 font-bold"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 2637,
							columnNumber: 13
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 2635,
						columnNumber: 11
					}, this),
					/* @__PURE__ */ _jsxDEV("div", {
						className: "flex flex-col gap-1.5",
						children: [/* @__PURE__ */ _jsxDEV("label", {
							className: "text-[10px] text-slate-400 font-bold",
							children: "DESCRIPTION"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 2647,
							columnNumber: 13
						}, this), /* @__PURE__ */ _jsxDEV("textarea", {
							rows: 2,
							value: newRepoDesc,
							onChange: (e) => setNewRepoDesc(e.target.value),
							placeholder: "Describe your music project session...",
							className: "w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-100 outline-none focus:border-cyan-500 resize-none"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 2648,
							columnNumber: 13
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 2646,
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
							lineNumber: 2658,
							columnNumber: 13
						}, this), /* @__PURE__ */ _jsxDEV("label", {
							htmlFor: "private-repo-check",
							className: "text-[10px] text-slate-300 font-bold cursor-pointer",
							children: "Private Repository (Only visible to authenticated user)"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 2665,
							columnNumber: 13
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 2657,
						columnNumber: 11
					}, this),
					/* @__PURE__ */ _jsxDEV("button", {
						onClick: handleCreateRepo,
						className: "w-full bg-cyan-600 hover:bg-cyan-500 text-white font-black py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all shadow-[0_0_12px_rgba(8,145,178,0.3)] cursor-pointer",
						children: "CREATE REPOSITORY ON GITHUB"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 2670,
						columnNumber: 11
					}, this),
					createStatus && /* @__PURE__ */ _jsxDEV("div", {
						className: "p-2.5 bg-slate-900 border border-slate-800 text-cyan-300 rounded-lg text-[10px] font-bold",
						children: createStatus
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 2678,
						columnNumber: 13
					}, this)
				]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 2628,
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
							lineNumber: 2688,
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
								lineNumber: 2690,
								columnNumber: 15
							}, this), /* @__PURE__ */ _jsxDEV("button", {
								onClick: () => setActiveTab("new-repo"),
								className: "px-3 bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[10px] font-bold rounded-lg transition-colors",
								children: "+ NEW"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 2697,
								columnNumber: 15
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 2689,
							columnNumber: 13
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 2687,
						columnNumber: 11
					}, this),
					/* @__PURE__ */ _jsxDEV("div", {
						className: "flex flex-col gap-1.5",
						children: [/* @__PURE__ */ _jsxDEV("label", {
							className: "text-[10px] text-slate-400 font-bold",
							children: "README.MD CONTENT"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 2707,
							columnNumber: 13
						}, this), /* @__PURE__ */ _jsxDEV("textarea", {
							rows: 4,
							value: readmeContent,
							onChange: (e) => setReadmeContent(e.target.value),
							className: "w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-100 outline-none focus:border-cyan-500 resize-none font-mono text-[11px]"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 2708,
							columnNumber: 13
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 2706,
						columnNumber: 11
					}, this),
					/* @__PURE__ */ _jsxDEV("div", {
						className: "flex flex-col gap-1.5",
						children: [/* @__PURE__ */ _jsxDEV("label", {
							className: "text-[10px] text-slate-400 font-bold",
							children: "COMMIT MESSAGE"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 2717,
							columnNumber: 13
						}, this), /* @__PURE__ */ _jsxDEV("input", {
							type: "text",
							value: commitMsg,
							onChange: (e) => setCommitMsg(e.target.value),
							className: "w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-100 outline-none focus:border-cyan-500 font-bold"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 2718,
							columnNumber: 13
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 2716,
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
							lineNumber: 2731,
							columnNumber: 26
						}, this) : /* @__PURE__ */ _jsxDEV(Github, { size: 16 }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 2731,
							columnNumber: 77
						}, this), isSyncing ? "COMMITTING & PUSHING TO GITHUB..." : "COMMIT & PUSH SESSION TO GITHUB"]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 2726,
						columnNumber: 11
					}, this),
					publishedUrl && /* @__PURE__ */ _jsxDEV("div", {
						className: "p-3 bg-emerald-950 border border-emerald-800 text-emerald-400 rounded-xl text-center font-bold flex flex-col gap-1",
						children: [/* @__PURE__ */ _jsxDEV("span", { children: "Successfully committed & pushed session to GitHub!" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 2737,
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
							lineNumber: 2738,
							columnNumber: 15
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 2736,
						columnNumber: 13
					}, this),
					syncLogs.length > 0 && /* @__PURE__ */ _jsxDEV("div", {
						className: "bg-slate-900 p-3 rounded-lg border border-slate-800 flex flex-col gap-1 max-h-32 overflow-y-auto font-mono text-[9px] text-slate-400",
						children: syncLogs.map((logLine, idx) => /* @__PURE__ */ _jsxDEV("div", {
							className: logLine.includes("ERROR") ? "text-red-400 font-bold" : logLine.includes("COMMITTED") ? "text-emerald-400 font-bold" : "",
							children: logLine
						}, idx, false, {
							fileName: _jsxFileName,
							lineNumber: 2752,
							columnNumber: 17
						}, this))
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 2750,
						columnNumber: 13
					}, this)
				]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 2686,
				columnNumber: 9
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 2541,
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
						lineNumber: 2820,
						columnNumber: 12
					}, this), " GEMINI PRODUCER CHAT (WITH SEARCH GROUNDING)"]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 2819,
					columnNumber: 10
				}, this), /* @__PURE__ */ _jsxDEV("span", {
					className: "px-2 py-0.5 bg-cyan-950 text-cyan-400 text-[10px] rounded border border-cyan-900",
					children: "gemini-3.8-flash"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 2822,
					columnNumber: 10
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 2818,
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
							lineNumber: 2829,
							columnNumber: 14
						}, this), m.sources && m.sources.length > 0 && /* @__PURE__ */ _jsxDEV("div", {
							className: "text-[9px] text-cyan-400 flex flex-wrap gap-1 px-1",
							children: [/* @__PURE__ */ _jsxDEV("span", { children: "Sources:" }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 2834,
								columnNumber: 18
							}, this), m.sources.map((src, si) => src.web?.uri ? /* @__PURE__ */ _jsxDEV("a", {
								href: src.web.uri,
								target: "_blank",
								rel: "noreferrer",
								className: "underline truncate max-w-[150px]",
								children: src.web.title || src.web.uri
							}, si, false, {
								fileName: _jsxFileName,
								lineNumber: 2836,
								columnNumber: 20
							}, this) : null)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 2833,
							columnNumber: 16
						}, this)]
					}, idx, true, {
						fileName: _jsxFileName,
						lineNumber: 2828,
						columnNumber: 12
					}, this)),
					isLoading && /* @__PURE__ */ _jsxDEV("div", {
						className: "self-start p-3 bg-slate-900 text-cyan-400 rounded-xl border border-slate-800 flex items-center gap-2 animate-pulse",
						children: [/* @__PURE__ */ _jsxDEV(RefreshCw, {
							size: 14,
							className: "animate-spin"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 2844,
							columnNumber: 14
						}, this), " Thinking & searching the web..."]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 2843,
						columnNumber: 12
					}, this),
					/* @__PURE__ */ _jsxDEV("div", { ref: messagesEndRef }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 2847,
						columnNumber: 10
					}, this)
				]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 2826,
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
					lineNumber: 2852,
					columnNumber: 10
				}, this), /* @__PURE__ */ _jsxDEV("button", {
					onClick: handleSendMessage,
					disabled: isLoading,
					className: "px-5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-[0_0_12px_rgba(34,211,238,0.3)] transition-all cursor-pointer disabled:opacity-50",
					children: [/* @__PURE__ */ _jsxDEV(Send, { size: 14 }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 2865,
						columnNumber: 12
					}, this), " SEND"]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 2860,
					columnNumber: 10
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 2851,
				columnNumber: 8
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 2817,
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
						lineNumber: 2898,
						columnNumber: 12
					}, this), " VOICE & AUDIO TRANSCRIPTION STUDIO"]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 2897,
					columnNumber: 10
				}, this), /* @__PURE__ */ _jsxDEV("span", {
					className: "px-2 py-0.5 bg-rose-950 text-rose-400 text-[10px] rounded border border-rose-900",
					children: "gemini-3.5-transcribe"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 2900,
					columnNumber: 10
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 2896,
				columnNumber: 8
			}, this),
			/* @__PURE__ */ _jsxDEV("div", {
				className: "bg-slate-950 p-6 rounded-xl border border-slate-800 flex flex-col items-center gap-4 shadow-inner",
				children: [
					/* @__PURE__ */ _jsxDEV("div", {
						className: `w-20 h-20 rounded-full flex items-center justify-center border-4 transition-all ${isRecording ? "bg-rose-600/20 border-rose-500 text-rose-400 animate-pulse shadow-[0_0_25px_#f43f5e]" : "bg-slate-900 border-slate-800 text-slate-500"}`,
						children: /* @__PURE__ */ _jsxDEV(Mic, { size: 32 }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 2905,
							columnNumber: 12
						}, this)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 2904,
						columnNumber: 10
					}, this),
					/* @__PURE__ */ _jsxDEV("span", {
						className: "font-bold text-slate-200",
						children: isRecording ? "RECORDING AUDIO..." : "MICROPHONE READY"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 2907,
						columnNumber: 10
					}, this),
					/* @__PURE__ */ _jsxDEV("button", {
						onClick: handleToggleRecord,
						disabled: isProcessing,
						className: `px-8 py-3 rounded-xl font-black transition-all cursor-pointer ${isRecording ? "bg-red-600 text-white shadow-[0_0_15px_#dc2626]" : "bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.3)]"}`,
						children: isRecording ? "STOP & TRANSCRIBE" : "RECORD & TRANSCRIBE"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 2909,
						columnNumber: 10
					}, this)
				]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 2903,
				columnNumber: 8
			}, this),
			/* @__PURE__ */ _jsxDEV("div", {
				className: "flex-1 flex flex-col gap-1.5 min-h-[140px]",
				children: [/* @__PURE__ */ _jsxDEV("span", {
					className: "text-[10px] text-slate-500 font-bold flex items-center gap-1",
					children: [/* @__PURE__ */ _jsxDEV(Terminal, { size: 12 }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 2920,
						columnNumber: 12
					}, this), " TRANSCRIPTION RESULT"]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 2919,
					columnNumber: 10
				}, this), /* @__PURE__ */ _jsxDEV("div", {
					className: "flex-1 bg-slate-950 border border-slate-800 rounded-xl p-4 text-rose-300 font-mono text-xs overflow-y-auto leading-relaxed shadow-inner",
					children: isProcessing ? "Transcribing audio stream with gemini-3.5-transcribe..." : transcription
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 2922,
					columnNumber: 10
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 2918,
				columnNumber: 8
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 2895,
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
					lineNumber: 2969,
					columnNumber: 12
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 2967,
				columnNumber: 9
			}, this), /* @__PURE__ */ _jsxDEV("div", {
				className: "flex items-center gap-3 window-controls",
				children: [
					/* @__PURE__ */ _jsxDEV("button", {
						onClick: onMinimize,
						className: "text-slate-500 hover:text-white transition-colors",
						children: /* @__PURE__ */ _jsxDEV(Minus, { size: 14 }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 2972,
							columnNumber: 103
						}, this)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 2972,
						columnNumber: 12
					}, this),
					/* @__PURE__ */ _jsxDEV("button", {
						onClick: onMaximize,
						className: "text-slate-500 hover:text-white transition-colors",
						children: /* @__PURE__ */ _jsxDEV(Maximize2, { size: 12 }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 2973,
							columnNumber: 103
						}, this)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 2973,
						columnNumber: 12
					}, this),
					/* @__PURE__ */ _jsxDEV("button", {
						onClick: onClose,
						className: "text-slate-500 hover:text-red-400 transition-colors",
						children: /* @__PURE__ */ _jsxDEV(X, { size: 16 }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 2974,
							columnNumber: 102
						}, this)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 2974,
						columnNumber: 12
					}, this)
				]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 2971,
				columnNumber: 9
			}, this)]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 2963,
			columnNumber: 7
		}, this), /* @__PURE__ */ _jsxDEV("div", {
			className: "flex-1 overflow-hidden relative bg-slate-900/90 backdrop-blur-md",
			children
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 2977,
			columnNumber: 7
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 2958,
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
				lineNumber: 2993,
				columnNumber: 12
			}, this)
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 2992,
			columnNumber: 10
		}, this), /* @__PURE__ */ _jsxDEV("span", {
			className: "text-[10px] text-center text-slate-300 font-medium drop-shadow-md leading-tight group-hover:text-white px-1",
			children: app.title
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 2995,
			columnNumber: 10
		}, this)]
	}, app.id, true, {
		fileName: _jsxFileName,
		lineNumber: 2987,
		columnNumber: 8
	}, this))
}, void 0, false, {
	fileName: _jsxFileName,
	lineNumber: 2985,
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
						lineNumber: 3007,
						columnNumber: 11
					}, this), " RX"]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 3006,
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
							lineNumber: 3016,
							columnNumber: 13
						}, this)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 3010,
						columnNumber: 11
					}, this), /* @__PURE__ */ _jsxDEV("button", {
						onClick: onRedo,
						disabled: !canRedo,
						className: `p-1.5 rounded transition-colors ${canRedo ? "text-slate-300 hover:bg-slate-800 hover:text-white" : "text-slate-700 cursor-not-allowed"}`,
						title: "Redo (Ctrl+Y)",
						children: /* @__PURE__ */ _jsxDEV(RotateCw, { size: 14 }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 3024,
							columnNumber: 13
						}, this)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 3018,
						columnNumber: 11
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 3009,
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
								lineNumber: 3029,
								columnNumber: 27
							}, this) : /* @__PURE__ */ _jsxDEV(Play, {
								size: 14,
								fill: "currentColor",
								className: "ml-0.5"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 3029,
								columnNumber: 70
							}, this)
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 3028,
							columnNumber: 11
						}, this),
						/* @__PURE__ */ _jsxDEV("div", {
							className: "flex flex-col",
							children: [/* @__PURE__ */ _jsxDEV("span", {
								className: "text-[9px] text-slate-500 font-bold tracking-widest",
								children: "BPM"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 3032,
								columnNumber: 13
							}, this), /* @__PURE__ */ _jsxDEV("input", {
								type: "number",
								value: bpm,
								onChange: (e) => onUpdateBPM(Number(e.target.value)),
								className: "bg-transparent text-slate-200 text-xs font-mono font-bold w-10 outline-none"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 3033,
								columnNumber: 13
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 3031,
							columnNumber: 11
						}, this),
						/* @__PURE__ */ _jsxDEV("div", { className: "h-6 w-px bg-slate-700 mx-1" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 3035,
							columnNumber: 11
						}, this),
						/* @__PURE__ */ _jsxDEV("div", {
							className: "flex flex-col gap-1",
							children: [/* @__PURE__ */ _jsxDEV("span", {
								className: "text-[9px] text-slate-500 font-bold tracking-widest",
								children: "STEP"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 3037,
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
									lineNumber: 3040,
									columnNumber: 18
								}, this))
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 3038,
								columnNumber: 13
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 3036,
							columnNumber: 11
						}, this)
					]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 3027,
					columnNumber: 8
				}, this)
			]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 3005,
			columnNumber: 5
		}, this),
		/* @__PURE__ */ _jsxDEV("div", {
			className: "flex-1 flex items-center gap-2 px-6 overflow-x-auto no-scrollbar",
			children: windows.map((w) => /* @__PURE__ */ _jsxDEV("button", {
				onClick: () => onToggleWindow(w.id),
				className: `flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all max-w-[160px] truncate border ${w.isMinimized ? "bg-slate-900 text-slate-500 border-slate-800 hover:bg-slate-800" : "bg-slate-800 text-slate-200 border-slate-600 shadow-[inset_0_1px_rgba(255,255,255,0.1)]"}`,
				children: [/* @__PURE__ */ _jsxDEV("span", { className: `w-2 h-2 rounded-full ${w.isMinimized ? "bg-slate-600" : "bg-cyan-500 shadow-[0_0_5px_#22d3ee]"}` }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 3052,
					columnNumber: 12
				}, this), /* @__PURE__ */ _jsxDEV("span", {
					className: "truncate",
					children: w.title
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 3053,
					columnNumber: 12
				}, this)]
			}, w.id, true, {
				fileName: _jsxFileName,
				lineNumber: 3048,
				columnNumber: 9
			}, this))
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 3046,
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
					lineNumber: 3059,
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
					lineNumber: 3060,
					columnNumber: 11
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 3058,
				columnNumber: 8
			}, this), /* @__PURE__ */ _jsxDEV("div", {
				className: "text-[10px] font-mono font-bold tracking-widest px-2 text-slate-500",
				children: new Date().toLocaleTimeString([], {
					hour: "2-digit",
					minute: "2-digit"
				})
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 3062,
				columnNumber: 8
			}, this)]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 3057,
			columnNumber: 5
		}, this)
	]
}, void 0, true, {
	fileName: _jsxFileName,
	lineNumber: 3004,
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
				lineNumber: 3274,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ _jsxDEV("div", { className: "absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:48px_48px] opacity-20 pointer-events-none z-0" }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 3275,
				columnNumber: 7
			}, this),
			notification && /* @__PURE__ */ _jsxDEV("div", {
				className: "absolute top-4 left-1/2 -translate-x-1/2 z-[100] bg-slate-900 border border-amber-500 text-amber-300 px-4 py-2 rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.3)] font-mono text-xs flex items-center gap-2 animate-bounce",
				children: [
					/* @__PURE__ */ _jsxDEV(Sparkles, { size: 14 }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 3279,
						columnNumber: 11
					}, this),
					" ",
					notification
				]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 3278,
				columnNumber: 9
			}, this),
			/* @__PURE__ */ _jsxDEV("div", {
				className: "flex-1 relative overflow-hidden z-10",
				children: [
					/* @__PURE__ */ _jsxDEV(DesktopIcons, { onOpenWindow: openWindow }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 3284,
						columnNumber: 9
					}, this),
					/* @__PURE__ */ _jsxDEV("div", {
						className: "absolute bottom-8 right-8 pointer-events-none opacity-10 text-right z-0",
						children: [/* @__PURE__ */ _jsxDEV("p", {
							className: "text-5xl font-black uppercase tracking-widest text-cyan-400",
							children: "REMIX OS"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 3286,
							columnNumber: 11
						}, this), /* @__PURE__ */ _jsxDEV("p", {
							className: "text-sm font-mono text-slate-400 tracking-widest",
							children: "AUDIO WORKSPACE PWA V2.0"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 3287,
							columnNumber: 11
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 3285,
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
								lineNumber: 3295,
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
									lineNumber: 3302,
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
									lineNumber: 3303,
									columnNumber: 36
								}, this),
								w.id === "aigen" && /* @__PURE__ */ _jsxDEV(AITrackGenerator, {
									setBpm: updateBPM,
									setPads: updatePads
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 3304,
									columnNumber: 36
								}, this),
								w.id === "acid" && /* @__PURE__ */ _jsxDEV(AcidBoxSynth, {}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 3305,
									columnNumber: 35
								}, this),
								w.id === "scope" && /* @__PURE__ */ _jsxDEV(MasterOscilloscope, {}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 3306,
									columnNumber: 36
								}, this),
								w.id === "granular" && /* @__PURE__ */ _jsxDEV(GranularSynth, {}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 3307,
									columnNumber: 39
								}, this),
								w.id === "sequencer" && /* @__PURE__ */ _jsxDEV(StepSequencer, {}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 3308,
									columnNumber: 40
								}, this),
								w.id === "patchbay" && /* @__PURE__ */ _jsxDEV(ModularPatchBay, {}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 3309,
									columnNumber: 39
								}, this),
								w.id === "xypad" && /* @__PURE__ */ _jsxDEV(XYPerformancePad, {}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 3310,
									columnNumber: 36
								}, this),
								w.id === "fx" && /* @__PURE__ */ _jsxDEV(FXChain, {}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 3311,
									columnNumber: 33
								}, this),
								w.id === "crate" && /* @__PURE__ */ _jsxDEV(SampleCrate, {}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 3312,
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
									lineNumber: 3313,
									columnNumber: 45
								}, this),
								w.id === "drummachine" && /* @__PURE__ */ _jsxDEV(DrumMachine, {}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 3314,
									columnNumber: 42
								}, this),
								w.id === "looper" && /* @__PURE__ */ _jsxDEV(Looper, {}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 3315,
									columnNumber: 37
								}, this),
								w.id === "sampler" && /* @__PURE__ */ _jsxDEV(Sampler, {}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 3316,
									columnNumber: 38
								}, this),
								w.id === "voicetrainer" && /* @__PURE__ */ _jsxDEV(VoiceTrainer, {}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 3317,
									columnNumber: 43
								}, this),
								w.id === "voicechanger" && /* @__PURE__ */ _jsxDEV(VoiceChanger, {}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 3318,
									columnNumber: 43
								}, this),
								w.id === "trim" && /* @__PURE__ */ _jsxDEV(AdvancedTrim, {}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 3319,
									columnNumber: 35
								}, this),
								w.id === "matrix" && /* @__PURE__ */ _jsxDEV(ChannelMatrix, {}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 3320,
									columnNumber: 37
								}, this),
								(w.id === "parametric-eq" || w.id === "eq") && /* @__PURE__ */ _jsxDEV(ParametricEQ, {}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 3321,
									columnNumber: 63
								}, this),
								(w.id === "vocalautotune" || w.id === "autotune") && /* @__PURE__ */ _jsxDEV(VocalAutoTune, {}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 3322,
									columnNumber: 69
								}, this),
								w.id === "djsetmix" && /* @__PURE__ */ _jsxDEV(DJSetMixStudio, {}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 3323,
									columnNumber: 39
								}, this),
								w.id === "mobile" && /* @__PURE__ */ _jsxDEV(MobileController, {}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 3324,
									columnNumber: 37
								}, this),
								w.id === "github-publisher" && /* @__PURE__ */ _jsxDEV(GitHubPublisher, {
									pads,
									bpm,
									masterVolume
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 3325,
									columnNumber: 47
								}, this)
							]
						}, w.id, true, {
							fileName: _jsxFileName,
							lineNumber: 3294,
							columnNumber: 13
						}, this);
					})
				]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 3283,
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
				lineNumber: 3331,
				columnNumber: 7
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 3273,
		columnNumber: 5
	}, this);
}

//# sourceMappingURL=data:application/json;base64,eyJtYXBwaW5ncyI6Ijs7OztBQUtBLE9BQU8sU0FBUyxVQUFVLFdBQVcsY0FBYztBQUNuRCxTQUFTLG1CQUFtQjtBQUM1QixTQUNFLE1BQU0sU0FBUyxVQUFVLE1BQU0sVUFBVSxTQUFTLE1BQU0sUUFBUSxLQUNoRSxZQUFZLE1BQU0sS0FBSyxVQUFVLFlBQVksVUFBVSxPQUFPLE9BQU8sUUFDckUsTUFBTSxRQUFRLEdBQUcsT0FBTyxXQUFXLFNBQVMsV0FDNUMsS0FBSyxNQUFNLFVBQVUsT0FBcUIsV0FBVyxnQkFDaEQ7OztBQTBDUCxNQUFNLFlBQVk7O2FBQ007bUJBQ087Y0FDTjtvQkFDYTs4QkFDbUIsQ0FBQztrQkFHaEI7a0JBQ0E7Y0FDbEIsQ0FBQztzQkFDUTtjQUdoQjtHQUFFLFFBQVE7R0FBSSxPQUFPO0dBQUksU0FBUztHQUFJLFNBQVM7RUFBRztpQkFHL0M7R0FDaEI7SUFBRSxNQUFNO0lBQUksTUFBTTtJQUFJLEdBQUc7R0FBRztHQUM1QjtJQUFFLE1BQU07SUFBSSxNQUFNO0lBQUksR0FBRztHQUFHO0dBQzVCO0lBQUUsTUFBTTtJQUFJLE1BQU07SUFBSSxHQUFHO0dBQUc7R0FDNUI7SUFBRSxNQUFNO0lBQUksTUFBTTtJQUFJLEdBQUc7R0FBRztFQUM5Qjt1QkFxTDhDO3dCQUNiLENBQUM7O0NBcExsQyxPQUFPLEtBQWE7RUFBRSxLQUFLLE1BQU07Q0FBSztDQUN0QyxnQkFBZ0IsS0FBYTtFQUFFLEtBQUssZUFBZTtDQUFLO0NBQ3hELGdCQUFnQixNQUFhO0VBQUUsS0FBSyxPQUFPO0NBQU07Q0FDakQsU0FBUyxJQUFnQixrQ0FBb0M7Q0FFN0QsUUFBUSxPQUFtRCxPQUFlO0VBQ3hFLEtBQUssS0FBSyxTQUFTO0NBQ3JCO0NBRUEsVUFBVSxXQUFtQixPQUE4QixPQUFlO0VBQ3hFLElBQUksS0FBSyxRQUFRLFlBQVk7R0FDM0IsS0FBSyxRQUFRLFVBQVUsQ0FBQyxTQUFTO0VBQ25DO0NBQ0Y7Q0FFQSxlQUFlO0VBQUUsT0FBTyxLQUFLO0NBQVc7Q0FFeEMsVUFBVSxJQUE0QjtFQUNwQyxLQUFLLGlCQUFpQjtDQUN4QjtDQUVBLHNCQUFzQixPQUFtQjtFQUN2QyxJQUFJLEtBQUssWUFBWSxLQUFLLFlBQVksS0FBSyxTQUFTLFVBQVUsV0FBVztHQUN2RSxLQUFLLFNBQVMsc0JBQXNCLEtBQVk7RUFDbEQsT0FBTztHQUNMLEtBQUssSUFBSSxJQUFJLEdBQUcsSUFBSSxNQUFNLFFBQVEsS0FBSztJQUNyQyxNQUFNLEtBQUssTUFBTSxLQUFLLElBQUksSUFBSSxJQUFJLEtBQUssSUFBSSxJQUFJLEdBQUcsSUFBSTtHQUN4RDtFQUNGO0NBQ0Y7Q0FFQSxxQkFBcUIsT0FBbUI7RUFDdEMsSUFBSSxLQUFLLFlBQVksS0FBSyxZQUFZLEtBQUssU0FBUyxVQUFVLFdBQVc7R0FDdkUsS0FBSyxTQUFTLHFCQUFxQixLQUFZO0VBQ2pELE9BQU87R0FDTCxLQUFLLElBQUksSUFBSSxHQUFHLElBQUksTUFBTSxRQUFRLEtBQUs7SUFDckMsTUFBTSxLQUFLLEtBQUssSUFBSSxLQUFLLElBQUksSUFBSSxJQUFJLEtBQUssSUFBSSxJQUFJLEdBQUcsQ0FBQyxJQUFJLE1BQU0sS0FBSyxPQUFPLElBQUk7R0FDbEY7RUFDRjtDQUNGO0NBRUEsTUFBTSxnQkFBZ0IsYUFBdUQ7RUFDM0UsS0FBSyxVQUFVO0VBQ2YsSUFBSSxDQUFDLEtBQUssVUFBVSxPQUFPO0VBQzNCLElBQUk7R0FDRixPQUFPLE1BQU0sS0FBSyxTQUFTLGdCQUFnQixXQUFXO0VBQ3hELFNBQVMsS0FBSztHQUNaLFFBQVEsTUFBTSx1QkFBdUIsR0FBRztHQUN4QyxPQUFPO0VBQ1Q7Q0FDRjtDQUVBLGlCQUNFLFdBQ0EsUUFDQSxjQUNBO0VBQ0EsS0FBSyxVQUFVO0VBQ2YsSUFBSSxDQUFDLEtBQUssVUFBVTtFQUVwQixNQUFNLE1BQU0sS0FBSyxTQUFTO0VBQzFCLE1BQU0sTUFBTSxnQkFBZ0IsS0FBSztFQUVqQyxNQUFNLGFBQWEsS0FBSyxJQUFJLE1BQVEsSUFBSSxTQUFTLE1BQU8sR0FBRztFQUMzRCxNQUFNLFlBQVksS0FBSyxJQUFJLEtBQU8sSUFBSSxRQUFRLE1BQU8sR0FBRztFQUN4RCxNQUFNLGNBQWMsS0FBSyxJQUFJLEtBQU8sSUFBSSxVQUFVLE1BQU8sR0FBRztFQUM1RCxNQUFNLGVBQWUsS0FBSyxJQUFJLE1BQVEsSUFBSSxVQUFVLE1BQU8sS0FBSyxZQUFZO0VBRTVFLE1BQU0sYUFBYSxLQUFLLFNBQVMsV0FBVztFQUM1QyxXQUFXLEtBQUssZUFBZSxNQUFRLEdBQUc7RUFDMUMsV0FBVyxLQUFLLHdCQUF3QixLQUFLLGNBQWMsTUFBTSxVQUFVO0VBQzNFLFdBQVcsS0FBSyx3QkFBd0IsY0FBYyxNQUFNLGFBQWEsU0FBUztFQUNsRixXQUFXLEtBQUssNkJBQTZCLE1BQVEsTUFBTSxhQUFhLFlBQVksV0FBVztFQUUvRixJQUFJLEtBQUssVUFBVTtHQUNqQixXQUFXLFFBQVEsS0FBSyxRQUFRO0dBQ2hDLEtBQUssU0FBUyxRQUFRLEtBQUssU0FBUyxXQUFXO0VBQ2pELE9BQU87R0FDTCxXQUFXLFFBQVEsS0FBSyxTQUFTLFdBQVc7RUFDOUM7RUFFQSxJQUFJLGdCQUFnQjtFQUNwQixPQUFPLFNBQVEsVUFBUztHQUN0QixJQUFJLENBQUMsTUFBTSxVQUFVLE1BQU0sVUFBVSxHQUFHO0dBRXhDLElBQUksTUFBTSxRQUFRO0lBQ2hCO0lBQ0EsTUFBTSxTQUFTLEtBQUssU0FBVSxtQkFBbUI7SUFDakQsT0FBTyxTQUFTLE1BQU07SUFFdEIsTUFBTSxZQUFZLFlBQVk7SUFDOUIsTUFBTSxhQUFhLFlBQVksS0FBSyxJQUFJLEdBQUcsTUFBTSxjQUFjLEVBQUU7SUFDakUsT0FBTyxhQUFhLGVBQWUsS0FBSyxJQUFJLElBQUssVUFBVSxHQUFHLEdBQUc7SUFFakUsTUFBTSxTQUFTLEtBQUssU0FBVSxtQkFBbUI7SUFDakQsT0FBTyxJQUFJLGVBQWUsTUFBTSxPQUFPLEdBQUcsR0FBRztJQUU3QyxNQUFNLFlBQVksS0FBSyxTQUFVLFdBQVc7SUFDNUMsVUFBVSxLQUFLLGVBQWUsTUFBTSxRQUFRLEdBQUc7SUFFL0MsSUFBSSxRQUFRO0tBQ1YsT0FBTyxRQUFRLE1BQU07S0FDckIsT0FBTyxRQUFRLFNBQVM7SUFDMUIsT0FBTztLQUNMLE9BQU8sUUFBUSxTQUFTO0lBQzFCO0lBQ0EsVUFBVSxRQUFRLFVBQVU7SUFFNUIsT0FBTyxNQUFNLEdBQUc7SUFDaEIsT0FBTyxLQUFLLE1BQU0sYUFBYSxZQUFZLGNBQWMsRUFBRztHQUM5RDtFQUNGLENBQUM7RUFFRCxJQUFJLGtCQUFrQixHQUFHO0dBQ3ZCLE1BQU0sTUFBTSxLQUFLLFNBQVMsaUJBQWlCO0dBQzNDLElBQUksT0FBTztHQUNYLElBQUksVUFBVSxlQUFlLFdBQVcsR0FBRztHQUUzQyxNQUFNLFNBQVMsS0FBSyxTQUFTLGlCQUFpQjtHQUM5QyxPQUFPLE9BQU87R0FDZCxPQUFPLFVBQVUsZUFBZSxZQUFZLEdBQUcsR0FBRztHQUVsRCxNQUFNLFlBQVksS0FBSyxTQUFTLFdBQVc7R0FDM0MsVUFBVSxLQUFLLGVBQWUsSUFBSyxHQUFHO0dBRXRDLElBQUksUUFBUSxTQUFTO0dBQ3JCLE9BQU8sUUFBUSxTQUFTO0dBQ3hCLFVBQVUsUUFBUSxVQUFVO0dBRTVCLElBQUksTUFBTSxHQUFHO0dBQ2IsT0FBTyxNQUFNLEdBQUc7R0FDaEIsSUFBSSxLQUFLLE1BQU0sYUFBYSxZQUFZLGNBQWMsRUFBRztHQUN6RCxPQUFPLEtBQUssTUFBTSxhQUFhLFlBQVksY0FBYyxFQUFHO0VBQzlEO0NBQ0Y7Q0FFQSxBQUFRLFlBQVk7RUFDbEIsSUFBSSxDQUFDLEtBQUssVUFBVTtHQUNsQixLQUFLLFdBQVcsS0FBSyxPQUFPLGdCQUFpQixPQUFlLG9CQUFvQjtFQUNsRjtFQUNBLElBQUksQ0FBQyxLQUFLLFlBQVksS0FBSyxVQUFVO0dBQ25DLEtBQUssV0FBVyxLQUFLLFNBQVMsZUFBZTtHQUM3QyxLQUFLLFNBQVMsVUFBVTtHQUN4QixLQUFLLFNBQVMsd0JBQXdCO0VBQ3hDO0VBQ0EsSUFBSSxLQUFLLFNBQVMsVUFBVSxhQUFhO0dBQ3ZDLEtBQUssU0FBUyxPQUFPO0VBQ3ZCO0NBQ0Y7Q0FFQSxTQUFTLGNBQTBDO0VBQ2pELElBQUssVUFBa0IsbUJBQW1CO0dBQ3hDLEFBQUMsVUFBa0Isa0JBQWtCLENBQUMsQ0FBQyxNQUNwQyxlQUFvQjtJQUNuQixRQUFRLElBQUkseUJBQXlCO0lBQ3JDLEtBQUssTUFBTSxTQUFTLFdBQVcsT0FBTyxPQUFPLEdBQUc7S0FDOUMsTUFBTSxpQkFBaUIsVUFBZTtNQUNwQyxNQUFNLENBQUMsUUFBUSxPQUFPLFNBQVMsTUFBTTtNQUNyQyxLQUFLLFNBQVMsU0FBVSxPQUFRLFFBQVEsR0FBRztPQUN6QyxNQUFNLFlBQVksUUFBUSxNQUFNO09BQ2hDLElBQUksWUFBWSxLQUFLLFdBQVcsSUFBSTtRQUNsQyxhQUFhLFFBQVE7T0FDdkI7TUFDRjtLQUNGO0lBQ0Y7R0FDRixJQUNDLFFBQWE7SUFDWixRQUFRLEtBQUssMENBQTBDLEdBQUc7R0FDNUQsQ0FDRjtFQUNGO0NBQ0Y7Q0FFQSxjQUFjLEtBQVU7RUFDdEIsS0FBSyxVQUFVO0VBQ2YsS0FBSyxVQUFVLEdBQUc7Q0FDcEI7Q0FLQSxvQkFBb0IsWUFBa0M7RUFDcEQsS0FBSyxVQUFVO0VBQ2YsSUFBSSxDQUFDLEtBQUssVUFBVTtFQUNwQixJQUFJO0dBQ0YsTUFBTSxPQUFPLEtBQUssU0FBUyw2QkFBNkI7R0FDeEQsSUFBSSxLQUFLLFVBQVU7SUFDakIsS0FBSyxTQUFTLFFBQVEsSUFBSTtHQUM1QjtHQUNBLEtBQUssZ0JBQWdCLElBQUksY0FBYyxLQUFLLE1BQU07R0FDbEQsS0FBSyxpQkFBaUIsQ0FBQztHQUN2QixLQUFLLGNBQWMsbUJBQW1CLE1BQU07SUFDMUMsSUFBSSxFQUFFLEtBQUssT0FBTyxHQUFHLEtBQUssZUFBZSxLQUFLLEVBQUUsSUFBSTtHQUN0RDtHQUNBLEtBQUssY0FBYyxlQUFlO0lBQ2hDLE1BQU0sT0FBTyxJQUFJLEtBQUssS0FBSyxnQkFBZ0IsRUFBRSxNQUFNLGFBQWEsQ0FBQztJQUNqRSxXQUFXLElBQUk7R0FDakI7R0FDQSxLQUFLLGNBQWMsTUFBTTtFQUMzQixTQUFTLEtBQUs7R0FDWixRQUFRLE1BQU0sd0JBQXdCLEdBQUc7RUFDM0M7Q0FDRjtDQUVBLHFCQUFxQjtFQUNuQixJQUFJLEtBQUssaUJBQWlCLEtBQUssY0FBYyxVQUFVLFlBQVk7R0FDakUsS0FBSyxjQUFjLEtBQUs7RUFDMUI7Q0FDRjtDQUVBLFFBQVE7RUFDTixLQUFLLFVBQVU7RUFDZixLQUFLLFlBQVk7RUFDakIsS0FBSyxLQUFLO0NBQ1o7Q0FFQSxPQUFPO0VBQ0wsS0FBSyxZQUFZO0VBQ2pCLElBQUksS0FBSyxZQUFZLGFBQWEsS0FBSyxVQUFVO0VBQ2pELEtBQUssT0FBTztFQUNaLEtBQUssZUFBZSxDQUFDO0NBQ3ZCOztDQUdBLEFBQVEsVUFBVSxLQUFVO0VBQzFCLElBQUksQ0FBQyxLQUFLLFlBQVksSUFBSSxTQUFTLElBQUksV0FBVyxHQUFHO0VBRXJELE1BQU0sTUFBTSxLQUFLLFNBQVMsaUJBQWlCO0VBQzNDLE1BQU0sV0FBVyxLQUFLLFNBQVMsV0FBVztFQUUxQyxJQUFJLFFBQVEsUUFBUTtFQUNwQixJQUFJLEtBQUssVUFBVTtHQUNqQixTQUFTLFFBQVEsS0FBSyxRQUFRO0dBQzlCLEtBQUssU0FBUyxRQUFRLEtBQUssU0FBUyxXQUFXO0VBQ2pELE9BQU87R0FDTCxTQUFTLFFBQVEsS0FBSyxTQUFTLFdBQVc7RUFDNUM7RUFFQSxNQUFNLE1BQU0sS0FBSyxTQUFTO0VBQzFCLE1BQU0sY0FBYyxJQUFJLFNBQVMsS0FBSzs7RUFHdEMsTUFBTSxhQUFhLEtBQUssSUFBSSxNQUFRLEtBQUssS0FBSyxTQUFTLE1BQU8sRUFBRztFQUNqRSxNQUFNLGNBQWMsS0FBSyxJQUFJLElBQU0sS0FBSyxLQUFLLFVBQVUsTUFBTyxFQUFHO0VBQ2pFLE1BQU0sZUFBZSxlQUFlLEtBQUssS0FBSyxVQUFVOztFQUd4RCxTQUFTLEtBQUssZUFBZSxHQUFHLEdBQUc7RUFDbkMsU0FBUyxLQUFLLHdCQUF3QixhQUFhLE1BQU0sVUFBVTtFQUNuRSxTQUFTLEtBQUssNkJBQTZCLEtBQUssSUFBSSxNQUFRLFlBQVksR0FBRyxNQUFNLGFBQWEsRUFBRztFQUNqRyxTQUFTLEtBQUssNkJBQTZCLE1BQU8sTUFBTSxhQUFhLFdBQVc7O0VBR2hGLElBQUksSUFBSSxhQUFhLFNBQVM7R0FDM0IsSUFBSSxPQUFPO0dBQ1gsSUFBSSxVQUFVLGVBQWUsS0FBSyxHQUFHO0dBQ3JDLElBQUksVUFBVSw2QkFBNkIsSUFBSSxNQUFNLEVBQUc7RUFDM0QsT0FBTyxJQUFJLElBQUksYUFBYSxRQUFRO0dBQ2pDLElBQUksT0FBTztHQUNYLElBQUksVUFBVSxlQUFlLE9BQU8sR0FBRztFQUMxQyxPQUFPLElBQUksSUFBSSxhQUFhLFNBQVM7R0FDbEMsSUFBSSxPQUFPO0dBQ1gsSUFBSSxVQUFVLGVBQWUsUUFBUSxHQUFHO0VBQzNDLE9BQU87R0FDSixJQUFJLE9BQU87R0FDWCxJQUFJLFVBQVUsZUFBZSxLQUFLLE9BQU8sSUFBSSxNQUFNLEtBQUssR0FBRztFQUM5RDtFQUVBLElBQUksTUFBTSxHQUFHO0VBQ2IsSUFBSSxLQUFLLE1BQU0sYUFBYSxXQUFXO0NBQ3pDO0NBRUEsQUFBUSxPQUFPO0VBQ2IsSUFBSSxDQUFDLEtBQUssV0FBVzs7RUFHckIsS0FBSyxLQUFLLFNBQVMsS0FBSyxRQUFRO0dBQzlCLElBQUksSUFBSSxhQUFhLENBQUMsSUFBSSxTQUFVLEtBQUssT0FBTyxNQUFNLE1BQU0sR0FBSTtJQUM5RCxLQUFLLFVBQVUsR0FBRztHQUNwQjtFQUNGLENBQUM7RUFFRCxNQUFNLGVBQWlCLEtBQUssS0FBSyxNQUFPLE1BQVE7RUFDaEQsS0FBSyxhQUFhLE9BQU8saUJBQWlCO0dBQ3hDLEtBQUssUUFBUSxLQUFLLE9BQU8sS0FBSztHQUM5QixLQUFLLGVBQWUsS0FBSyxJQUFJO0dBQzdCLEtBQUssS0FBSztFQUNaLEdBQUcsWUFBWTtDQUNqQjtBQUNGO0FBRUEsTUFBTSxjQUFjLElBQUksWUFBWTtBQUVwQyxNQUFNLGVBQWU7Q0FDbkI7RUFBRSxJQUFJO0VBQVEsT0FBTztFQUFnQixNQUFNO0VBQU0sT0FBTztFQUFvQixjQUFjO0VBQUssZUFBZTtDQUFJO0NBQ2xIO0VBQUUsSUFBSTtFQUFTLE9BQU87RUFBYyxNQUFNO0VBQVMsT0FBTztFQUFrQixjQUFjO0VBQUssZUFBZTtDQUFJO0NBQ2xIO0VBQUUsSUFBSTtFQUFNLE9BQU87RUFBWSxNQUFNO0VBQVUsT0FBTztFQUFrQixjQUFjO0VBQUssZUFBZTtDQUFJO0NBQzlHO0VBQUUsSUFBSTtFQUFhLE9BQU87RUFBa0IsTUFBTTtFQUFNLE9BQU87RUFBaUIsY0FBYztFQUFLLGVBQWU7Q0FBSTtDQUN0SDtFQUFFLElBQUk7RUFBWSxPQUFPO0VBQWtCLE1BQU07RUFBVSxPQUFPO0VBQW1CLGNBQWM7RUFBSyxlQUFlO0NBQUk7Q0FDM0g7RUFBRSxJQUFJO0VBQVksT0FBTztFQUFxQixNQUFNO0VBQVMsT0FBTztFQUFtQixjQUFjO0VBQUssZUFBZTtDQUFJO0NBQzdIO0VBQUUsSUFBSTtFQUFTLE9BQU87RUFBc0IsTUFBTTtFQUFNLE9BQU87RUFBaUIsY0FBYztFQUFLLGVBQWU7Q0FBSTtDQUN0SDtFQUFFLElBQUk7RUFBUSxPQUFPO0VBQW9CLE1BQU07RUFBSyxPQUFPO0VBQW1CLGNBQWM7RUFBSyxlQUFlO0NBQUk7Q0FDcEg7RUFBRSxJQUFJO0VBQVMsT0FBTztFQUF1QixNQUFNO0VBQVUsT0FBTztFQUFrQixjQUFjO0VBQUssZUFBZTtDQUFJO0NBQzVIO0VBQUUsSUFBSTtFQUFTLE9BQU87RUFBZ0IsTUFBTTtFQUFRLE9BQU87RUFBaUIsY0FBYztFQUFLLGVBQWU7Q0FBSTtDQUNsSDtFQUFFLElBQUk7RUFBa0IsT0FBTztFQUFrQixNQUFNO0VBQVEsT0FBTztFQUFrQixjQUFjO0VBQUssZUFBZTtDQUFJO0NBQzlIO0VBQUUsSUFBSTtFQUFTLE9BQU87RUFBc0IsTUFBTTtFQUFVLE9BQU87RUFBb0IsY0FBYztFQUFLLGVBQWU7Q0FBSTtDQUM3SDtFQUFFLElBQUk7RUFBVSxPQUFPO0VBQWlCLE1BQU07RUFBWSxPQUFPO0VBQWtCLGNBQWM7RUFBSyxlQUFlO0NBQUk7Q0FDekg7RUFBRSxJQUFJO0VBQWUsT0FBTztFQUFnQixNQUFNO0VBQU0sT0FBTztFQUFnQixjQUFjO0VBQUssZUFBZTtDQUFJO0NBQ3JIO0VBQUUsSUFBSTtFQUFVLE9BQU87RUFBZSxNQUFNO0VBQVcsT0FBTztFQUFtQixjQUFjO0VBQUssZUFBZTtDQUFJO0NBQ3ZIO0VBQUUsSUFBSTtFQUFXLE9BQU87RUFBZ0IsTUFBTTtFQUFPLE9BQU87RUFBaUIsY0FBYztFQUFLLGVBQWU7Q0FBSTtDQUNuSDtFQUFFLElBQUk7RUFBZ0IsT0FBTztFQUFpQixNQUFNO0VBQU0sT0FBTztFQUFpQixjQUFjO0VBQUssZUFBZTtDQUFJO0NBQ3hIO0VBQUUsSUFBSTtFQUFnQixPQUFPO0VBQXFCLE1BQU07RUFBTSxPQUFPO0VBQW1CLGNBQWM7RUFBSyxlQUFlO0NBQUk7Q0FDOUg7RUFBRSxJQUFJO0VBQVEsT0FBTztFQUFjLE1BQU07RUFBVSxPQUFPO0VBQWlCLGNBQWM7RUFBSyxlQUFlO0NBQUk7Q0FDakg7RUFBRSxJQUFJO0VBQVUsT0FBTztFQUFrQixNQUFNO0VBQVksT0FBTztFQUFpQixjQUFjO0VBQUssZUFBZTtDQUFJO0NBQ3pIO0VBQUUsSUFBSTtFQUFpQixPQUFPO0VBQWlCLE1BQU07RUFBVSxPQUFPO0VBQW9CLGNBQWM7RUFBSyxlQUFlO0NBQUk7Q0FDaEk7RUFBRSxJQUFJO0VBQWlCLE9BQU87RUFBZ0IsTUFBTTtFQUFPLE9BQU87RUFBbUIsY0FBYztFQUFLLGVBQWU7Q0FBSTtDQUMzSDtFQUFFLElBQUk7RUFBWSxPQUFPO0VBQWlCLE1BQU07RUFBTyxPQUFPO0VBQWtCLGNBQWM7RUFBSyxlQUFlO0NBQUk7Q0FDdEg7RUFBRSxJQUFJO0VBQW9CLE9BQU87RUFBZSxNQUFNO0VBQVEsT0FBTztFQUFrQixjQUFjO0VBQUssZUFBZTtDQUFJO0NBQzdIO0VBQUUsSUFBSTtFQUFVLE9BQU87RUFBb0IsTUFBTTtFQUFLLE9BQU87RUFBaUIsY0FBYztFQUFLLGVBQWU7Q0FBSTtDQUNwSDtFQUFFLElBQUk7RUFBZSxPQUFPO0VBQWdCLE1BQU07RUFBSyxPQUFPO0VBQWlCLGNBQWM7RUFBSyxlQUFlO0NBQUk7QUFDdkg7QUFFQSxNQUFNLFFBQVEsRUFBRSxPQUFPLE9BQU8sUUFBUSxRQUFRLGVBQW1HO0NBQy9JLE1BQU0sV0FBWSxRQUFRLE1BQU8sTUFBTTtDQUN2QyxNQUFNLFNBQWlDO0VBQ3JDLE1BQU07RUFBZSxRQUFRO0VBQzdCLFNBQVM7RUFBa0IsT0FBTztFQUNsQyxRQUFRO0VBQWlCLEtBQUs7RUFBYyxNQUFNO0NBQ3BEO0NBRUEsTUFBTSxvQkFBb0I7RUFDeEIsSUFBSSxVQUFVO0dBQ1osTUFBTSxVQUFXLFFBQVEsS0FBTSxNQUFNLElBQUksUUFBUTtHQUNqRCxTQUFTLE9BQU87RUFDbEI7Q0FDRjtDQUVBLE9BQ0Usd0JBQUMsT0FBRDtFQUFLLFdBQVU7RUFBb0UsU0FBUztFQUFhLE9BQU07WUFBL0csQ0FDRSx3QkFBQyxPQUFEO0dBQUssV0FBVTthQUNaLHdCQUFDLE9BQUQ7SUFBSyxXQUFVO0lBQWtFLE9BQU8sRUFBRSxXQUFXLFVBQVUsU0FBUyxNQUFNO2NBQzNILHdCQUFDLE9BQUQsRUFBSyxXQUFXLHFFQUFxRSxPQUFPLFVBQVUsT0FBTyxLQUFLLGdDQUFrQzs7Ozs7R0FDbEo7Ozs7O0VBQ0g7Ozs7WUFDTCx3QkFBQyxPQUFEO0dBQUssV0FBVTthQUFmLENBQ0Usd0JBQUMsUUFBRDtJQUFNLFdBQVU7Y0FBZ0U7R0FBWTs7OzthQUM1Rix3QkFBQyxRQUFEO0lBQU0sV0FBVTtjQUFoQixDQUFzRCxPQUFNLEdBQU87Ozs7O1dBQ2hFOzs7OztVQUNGOzs7Ozs7QUFFVDtBQUVBLE1BQU0sZ0JBQWdCLEVBQUUsTUFBTSxhQUFhLFdBQVcsa0JBQ3BELHdCQUFDLE9BQUQ7Q0FBSyxXQUFVO1dBQWYsQ0FDRSx3QkFBQyxPQUFELEVBQUssV0FBVSxnS0FBaUs7Ozs7V0FDaEwsd0JBQUMsT0FBRDtFQUFLLFdBQVU7WUFDWixLQUFLLEtBQUssS0FBVSxRQUFnQjtHQUNuQyxNQUFNLGNBQWMsYUFBYSxJQUFJLGFBQWMsY0FBYyxNQUFNLE1BQU07R0FDN0UsSUFBSSxZQUFZO0dBQ2hCLElBQUksSUFBSSxhQUFhLFFBQVEsWUFBWTtHQUN6QyxJQUFJLElBQUksYUFBYSxTQUFTLFlBQVk7R0FDMUMsSUFBSSxJQUFJLGFBQWEsTUFBTSxZQUFZO0dBRXZDLE1BQU0sVUFBVSxJQUFJLFlBQ2hCLE1BQU0sVUFBVSxjQUFjLFVBQVUsOENBQThDLFVBQVUsZUFDaEcsTUFBTSxVQUFVLGlCQUFpQixVQUFVLGVBQWUsVUFBVSxnQkFBZ0IsVUFBVTtHQUVsRyxPQUNFLHdCQUFDLFVBQUQ7SUFDZSxlQUFlLFlBQVksSUFBSSxFQUFFO0lBQzlDLFdBQVcsNEdBQTRHLFFBQVEsR0FBRyxjQUFjLDRCQUE0QjtjQUY5SyxDQUlHLHdCQUFDLFFBQUQ7S0FBTSxXQUFVO2VBQStFLElBQUk7SUFBVzs7OztjQUM3RyxJQUFJLGFBQWEsd0JBQUMsT0FBRCxFQUFLLFdBQVUseUVBQTBFOzs7O1lBQ3RHO01BTEQsSUFBSTs7OztVQUtIO0VBRVosQ0FBQztDQUNFOzs7O1NBQ0Y7Ozs7OztBQUdQLE1BQU0sYUFBYSxFQUFFLE1BQU0sY0FBYyxnQkFBZ0IsYUFBYSxjQUFjLGNBQWMsMkJBQ2hHLHdCQUFDLE9BQUQ7Q0FBSyxXQUFVO1dBQWY7RUFDRyxLQUFLLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLFFBQ3BCLHdCQUFDLE9BQUQ7R0FBa0IsV0FBVTthQUE1QjtJQUNHLHdCQUFDLFFBQUQ7S0FBTSxXQUFVO2VBQXVILElBQUk7SUFBVzs7Ozs7SUFDdEosd0JBQUMsTUFBRDtLQUFNLE9BQU07S0FBTSxRQUFRLElBQUksTUFBTSxLQUFLO0tBQUksT0FBTyxJQUFJLGFBQWEsVUFBVSxZQUFZLElBQUksYUFBYSxTQUFTLFdBQVc7SUFBVzs7Ozs7SUFDM0ksd0JBQUMsT0FBRDtLQUFLLFdBQVU7ZUFBZjtNQUNHLHdCQUFDLE9BQUQsRUFBSyxXQUFVLCtGQUFnRzs7Ozs7TUFDL0csd0JBQUMsU0FBRDtPQUFPLE1BQUs7T0FBUSxLQUFLO09BQUcsS0FBSztPQUFHLE1BQU07T0FBTSxPQUFPLElBQUk7T0FBUSxXQUFVLE1BQUssZUFBZSxJQUFJLElBQUksT0FBTyxFQUFFLE9BQU8sS0FBSyxDQUFDO09BQzdILFdBQVU7T0FBcUcsT0FBTyxFQUFFLFdBQVcsaUJBQWlCO01BQUk7Ozs7O01BQzFKLHdCQUFDLE9BQUQ7T0FBSyxXQUFVO09BQXFRLE9BQU8sRUFBRSxRQUFRLFFBQVEsSUFBSSxTQUFTLElBQUksV0FBVztpQkFDdFUsd0JBQUMsT0FBRCxFQUFLLFdBQVUsMkVBQTRFOzs7OztNQUN6Rjs7Ozs7S0FDSDs7Ozs7O0lBQ0wsd0JBQUMsT0FBRDtLQUFLLFdBQVU7ZUFBZixDQUNHLHdCQUFDLFVBQUQ7TUFBUSxlQUFlLGFBQWEsSUFBSSxFQUFFO01BQUcsV0FBVywrREFBK0QsSUFBSSxRQUFRLG1EQUFtRDtnQkFBb0Q7S0FBUzs7OztlQUNuUCx3QkFBQyxVQUFEO01BQVEsZUFBZSxhQUFhLElBQUksRUFBRTtNQUFHLFdBQVcsK0RBQStELElBQUksU0FBUywwREFBMEQ7Z0JBQW9EO0tBQVM7Ozs7YUFDelA7Ozs7OztHQUNIO0tBZkssSUFBSTs7OztTQWVULENBQ1A7RUFDRCx3QkFBQyxPQUFELEVBQUssV0FBVSxzQ0FBdUM7Ozs7O0VBQ3RELHdCQUFDLE9BQUQ7R0FBSyxXQUFVO2FBQWY7SUFDSSx3QkFBQyxPQUFELEVBQUssV0FBVSx3RkFBeUY7Ozs7O0lBQ3hHLHdCQUFDLFFBQUQ7S0FBTSxXQUFVO2VBQXFFO0lBQVk7Ozs7O0lBQ2pHLHdCQUFDLE9BQUQsRUFBSyxXQUFVLE9BQVk7Ozs7O0lBQzNCLHdCQUFDLE9BQUQ7S0FBSyxXQUFVO2VBQWY7TUFDSyx3QkFBQyxPQUFELEVBQUssV0FBVSw2RkFBOEY7Ozs7O01BQzdHLHdCQUFDLFNBQUQ7T0FBTyxNQUFLO09BQVEsS0FBSztPQUFHLEtBQUs7T0FBRyxNQUFNO09BQU0sT0FBTztPQUFjLFdBQVUsTUFBSyxxQkFBcUIsT0FBTyxFQUFFLE9BQU8sS0FBSyxDQUFDO09BQzdILFdBQVU7T0FBcUcsT0FBTyxFQUFFLFdBQVcsaUJBQWlCO01BQUk7Ozs7O01BQzFKLHdCQUFDLE9BQUQ7T0FBSyxXQUFVO09BQThSLE9BQU8sRUFBRSxRQUFRLFFBQVEsZUFBZSxJQUFJLFdBQVc7aUJBQ2pXLHdCQUFDLE9BQUQsRUFBSyxXQUFVLG1HQUFvRzs7Ozs7TUFDakg7Ozs7O0tBQ0w7Ozs7OztHQUNKOzs7Ozs7Q0FDRjs7Ozs7O0FBR1AsTUFBTSxvQkFBb0I7Q0FDeEIsTUFBTSxDQUFDLE1BQU0sV0FBVyxTQUFTLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxJQUFJLENBQUMsQ0FBQyxVQUFVLE1BQU0sRUFBRSxDQUFDLENBQUMsS0FBSyxLQUFLLENBQUMsQ0FBQztDQUNyRixNQUFNLGNBQWM7RUFBQztFQUFRO0VBQVM7RUFBUTtDQUFPO0NBQ3JELE1BQU0sU0FBUztFQUFDO0VBQWM7RUFBa0I7RUFBZ0I7Q0FBYTtDQUU3RSxNQUFNLGNBQWMsVUFBa0IsWUFBb0I7RUFDeEQsTUFBTSxVQUFVLENBQUMsR0FBRyxJQUFJO0VBQ3hCLFFBQVEsU0FBUyxDQUFDLFdBQVcsQ0FBQyxRQUFRLFNBQVMsQ0FBQztFQUNoRCxRQUFRLE9BQU87Q0FDakI7Q0FFQSxPQUNFLHdCQUFDLE9BQUQ7RUFBSyxXQUFVO1lBQWYsQ0FDRyx3QkFBQyxPQUFEO0dBQUssV0FBVTthQUFmLENBQ0Usd0JBQUMsUUFBRDtJQUFNLFdBQVU7Y0FBaEIsQ0FDRSx3QkFBQyxNQUFEO0tBQU0sTUFBTTtLQUFJLFdBQVU7SUFBZ0I7Ozs7Y0FBQyxTQUN2Qzs7Ozs7YUFDTix3QkFBQyxRQUFEO0lBQU0sV0FBVTtjQUE4RTtHQUFlOzs7O1dBQzFHOzs7OztZQUVMLHdCQUFDLE9BQUQ7R0FBSyxXQUFVO2FBQ1osWUFBWSxLQUFLLE9BQU8sTUFDdkIsd0JBQUMsT0FBRDtJQUFpQixXQUFVO2NBQTNCLENBQ0Usd0JBQUMsT0FBRDtLQUFLLFdBQVU7ZUFDWix3QkFBQyxRQUFEO01BQU0sV0FBVTtnQkFBd0M7S0FBWTs7Ozs7SUFDbEU7Ozs7Y0FDTCx3QkFBQyxPQUFEO0tBQUssV0FBVTtlQUNYLEtBQUssRUFBRSxDQUFDLEtBQUssVUFBVSxNQUNyQix3QkFBQyxVQUFEO01BRUUsZUFBZSxXQUFXLEdBQUcsQ0FBQztNQUM5QixXQUFXLHlDQUNULFdBQ0ksR0FBRyxPQUFPLEdBQUcsbURBQ2IsbURBQ0wsR0FBRyxJQUFJLE1BQU0sS0FBSyxDQUFDLFdBQVcsNkJBQTZCO0tBQzdELEdBUE07Ozs7WUFPTixDQUNIO0lBQ0M7Ozs7WUFDRjtNQWpCSzs7OztVQWlCTCxDQUNOO0VBQ0U7Ozs7VUFDSDs7Ozs7O0FBRVQ7QUFFQSxNQUFNLGdCQUFnQjtDQUNwQixPQUNFLHdCQUFDLE9BQUQ7RUFBSyxXQUFVO1lBQWY7R0FFRyx3QkFBQyxPQUFEO0lBQUssV0FBVTtjQUFmO0tBQ0Usd0JBQUMsUUFBRDtNQUFNLFdBQVU7Z0JBQXdHO0tBQWtCOzs7OztLQUMxSSx3QkFBQyxNQUFEO01BQU0sT0FBTTtNQUFRLE9BQU87TUFBSSxPQUFNO0tBQVM7Ozs7O0tBQzlDLHdCQUFDLE1BQUQ7TUFBTSxPQUFNO01BQU8sT0FBTztNQUFJLE9BQU07S0FBUzs7Ozs7S0FDN0Msd0JBQUMsTUFBRDtNQUFNLE9BQU07TUFBTSxPQUFPO01BQUksT0FBTTtLQUFTOzs7OztJQUN6Qzs7Ozs7O0dBR0wsd0JBQUMsT0FBRDtJQUFLLFdBQVU7Y0FBZjtLQUNFLHdCQUFDLFFBQUQ7TUFBTSxXQUFVO2dCQUFzRztLQUFnQjs7Ozs7S0FDdEksd0JBQUMsTUFBRDtNQUFNLE9BQU07TUFBTyxPQUFPO01BQUksT0FBTTtLQUFROzs7OztLQUM1Qyx3QkFBQyxNQUFEO01BQU0sT0FBTTtNQUFXLE9BQU87TUFBSSxPQUFNO0tBQVE7Ozs7O0tBQ2hELHdCQUFDLE1BQUQ7TUFBTSxPQUFNO01BQU0sT0FBTztNQUFJLE9BQU07S0FBUTs7Ozs7SUFDeEM7Ozs7OztHQUdMLHdCQUFDLE9BQUQ7SUFBSyxXQUFVO2NBQWY7S0FDRSx3QkFBQyxRQUFEO01BQU0sV0FBVTtnQkFBb0c7S0FBZTs7Ozs7S0FDbkksd0JBQUMsTUFBRDtNQUFNLE9BQU07TUFBUSxPQUFPO01BQUksT0FBTTtLQUFPOzs7OztLQUM1Qyx3QkFBQyxNQUFEO01BQU0sT0FBTTtNQUFRLE9BQU87TUFBSSxPQUFNO0tBQU87Ozs7O0tBQzVDLHdCQUFDLE1BQUQ7TUFBTSxPQUFNO01BQU0sT0FBTztNQUFLLE9BQU07S0FBTzs7Ozs7SUFDeEM7Ozs7OztFQUNIOzs7Ozs7QUFFVDtBQUVBLE1BQU0sMkJBQTJCO0NBQy9CLE1BQU0sWUFBWSxPQUEwQixJQUFJO0NBQ2hELE1BQU0sQ0FBQyxVQUFVLGVBQWUsU0FBMEMsTUFBTTtDQUVoRixnQkFBZ0I7RUFDZCxNQUFNLFNBQVMsVUFBVTtFQUN6QixJQUFHLENBQUMsUUFBUTtFQUNaLE1BQU0sTUFBTSxPQUFPLFdBQVcsSUFBSTtFQUNsQyxJQUFHLENBQUMsS0FBSztFQUNULElBQUk7RUFFSixNQUFNLGFBQWEsSUFBSSxXQUFXLEdBQUc7RUFDckMsTUFBTSxhQUFhLElBQUksV0FBVyxFQUFFO0VBRXBDLE1BQU0sYUFBYTtHQUNqQixZQUFZLHNCQUFzQixVQUFVO0dBQzVDLFlBQVkscUJBQXFCLFVBQVU7R0FFM0MsSUFBSSxZQUFZO0dBQ2hCLElBQUksU0FBUyxHQUFHLEdBQUcsT0FBTyxPQUFPLE9BQU8sTUFBTTtHQUU5QyxNQUFNLFFBQVEsT0FBTztHQUNyQixNQUFNLFNBQVMsT0FBTzs7R0FHdEIsSUFBSSxhQUFhLFVBQVUsYUFBYSxPQUFPO0lBQzdDLE1BQU0sV0FBVyxRQUFRLFdBQVc7SUFDcEMsS0FBSyxJQUFJLElBQUksR0FBRyxJQUFJLFdBQVcsUUFBUSxLQUFLO0tBQzFDLE1BQU0sTUFBTSxXQUFXLEtBQUs7S0FDNUIsTUFBTSxZQUFZLE9BQU8sYUFBYSxTQUFTLFNBQVMsSUFBSSxLQUFLLFNBQVM7S0FFMUUsTUFBTSxXQUFXLElBQUkscUJBQXFCLEdBQUcsUUFBUSxHQUFHLENBQUM7S0FDekQsU0FBUyxhQUFhLEdBQUcsU0FBUztLQUNsQyxTQUFTLGFBQWEsSUFBSyxTQUFTO0tBQ3BDLFNBQVMsYUFBYSxHQUFHLFNBQVM7S0FFbEMsSUFBSSxZQUFZO0tBQ2hCLElBQUksYUFBYTtLQUNqQixJQUFJLGNBQWM7S0FDbEIsSUFBSSxTQUFTLElBQUksV0FBVyxHQUFHLFVBQVUsYUFBYSxTQUFTLFNBQVMsSUFBSSxLQUFLLFdBQVcsV0FBVyxHQUFHLFNBQVM7SUFDckg7R0FDRjs7R0FHQSxJQUFJLGFBQWEsVUFBVSxhQUFhLGdCQUFnQjtJQUN0RCxNQUFNLFNBQVMsYUFBYSxTQUFTLFNBQVMsTUFBTyxTQUFTO0lBQzlELElBQUksVUFBVTtJQUNkLElBQUksY0FBYztJQUNsQixJQUFJLFlBQVk7SUFDaEIsSUFBSSxhQUFhO0lBQ2pCLElBQUksY0FBYztJQUVsQixNQUFNLGFBQWEsUUFBUSxXQUFXO0lBQ3RDLElBQUksSUFBSTtJQUNSLEtBQUssSUFBSSxJQUFJLEdBQUcsSUFBSSxXQUFXLFFBQVEsS0FBSztLQUMxQyxNQUFNLElBQUksV0FBVyxLQUFLO0tBQzFCLE1BQU0sSUFBSSxVQUFVLElBQUksTUFBTSxTQUFTO0tBQ3ZDLElBQUksTUFBTSxHQUFHLElBQUksT0FBTyxHQUFHLENBQUM7VUFDdkIsSUFBSSxPQUFPLEdBQUcsQ0FBQztLQUNwQixLQUFLO0lBQ1A7SUFDQSxJQUFJLE9BQU87R0FDYjtHQUVBLGNBQWMsc0JBQXNCLElBQUk7RUFDMUM7RUFDQSxLQUFLO0VBQ0wsYUFBYSxxQkFBcUIsV0FBVztDQUMvQyxHQUFHLENBQUMsUUFBUSxDQUFDO0NBRWIsT0FDRSx3QkFBQyxPQUFEO0VBQUssV0FBVTtZQUFmO0dBQ0Usd0JBQUMsT0FBRDtJQUFLLFdBQVU7Y0FBZixDQUNHLHdCQUFDLFFBQUQ7S0FBTSxXQUFVO2VBQWhCLENBQ0Usd0JBQUMsVUFBRCxFQUFVLE1BQU0sR0FBSzs7OztlQUFDLGdEQUNsQjs7Ozs7Y0FDTix3QkFBQyxPQUFEO0tBQUssV0FBVTtlQUNaO01BQUM7TUFBUTtNQUFPO0tBQWMsQ0FBQyxDQUFDLEtBQUssTUFDcEMsd0JBQUMsVUFBRDtNQUVFLGVBQWUsWUFBWSxDQUFRO01BQ25DLFdBQVcsc0VBQ1QsYUFBYSxJQUNULHdEQUNBO2dCQUdMO0tBQ0ssR0FURDs7OztZQVNDLENBQ1Q7SUFDRTs7OztZQUNIOzs7Ozs7R0FDTCx3QkFBQyxVQUFEO0lBQVEsS0FBSztJQUFXLE9BQU87SUFBSyxRQUFRO0lBQUssV0FBVTtHQUE4RTs7Ozs7R0FDekksd0JBQUMsT0FBRDtJQUFLLFdBQVU7Y0FBZjtLQUNFLHdCQUFDLFFBQUQsWUFBTSxhQUFnQjs7Ozs7S0FDdEIsd0JBQUMsUUFBRCxZQUFNLGVBQWtCOzs7OztLQUN4Qix3QkFBQyxRQUFELFlBQU0sYUFBZ0I7Ozs7O0tBQ3RCLHdCQUFDLFFBQUQsWUFBTSxrQkFBcUI7Ozs7O0tBQzNCLHdCQUFDLFFBQUQsWUFBTSxjQUFpQjs7Ozs7SUFDcEI7Ozs7OztFQUNGOzs7Ozs7QUFFVDtBQUVBLE1BQU0sc0JBQ0osd0JBQUMsT0FBRDtDQUFLLFdBQVU7V0FBZjtFQUNHLHdCQUFDLE9BQUQ7R0FBSyxXQUFVO2FBQWYsQ0FDRSx3QkFBQyxRQUFEO0lBQU0sV0FBVTtjQUE0QztHQUFxQjs7OzthQUNqRix3QkFBQyxRQUFEO0lBQU0sV0FBVTtjQUEwRDtHQUFtQjs7OztXQUMxRjs7Ozs7O0VBQ0wsd0JBQUMsT0FBRDtHQUFLLFdBQVU7YUFBZjtJQUNHLHdCQUFDLE9BQUQsRUFBSyxXQUFVLHdIQUF5SDs7Ozs7SUFDeEksd0JBQUMsT0FBRCxFQUFLLFdBQVUsc0ZBQXVGOzs7OztJQUN0Ryx3QkFBQyxPQUFEO0tBQUssV0FBVTtlQUNaLHdCQUFDLE9BQUQsRUFBSyxXQUFVLGdEQUFpRDs7Ozs7SUFDOUQ7Ozs7O0dBQ0g7Ozs7OztFQUNMLHdCQUFDLE9BQUQ7R0FBSyxXQUFVO2FBQWY7SUFDRSx3QkFBQyxNQUFEO0tBQU0sT0FBTTtLQUFXLE9BQU87S0FBSSxPQUFNO0lBQVU7Ozs7O0lBQ2xELHdCQUFDLE1BQUQ7S0FBTSxPQUFNO0tBQU8sT0FBTztLQUFJLE9BQU07SUFBVTs7Ozs7SUFDOUMsd0JBQUMsTUFBRDtLQUFNLE9BQU07S0FBVSxPQUFPO0tBQUksT0FBTTtJQUFVOzs7OztJQUNqRCx3QkFBQyxNQUFEO0tBQU0sT0FBTTtLQUFRLE9BQU87S0FBSSxPQUFNO0lBQVU7Ozs7O0lBQy9DLHdCQUFDLE1BQUQ7S0FBTSxPQUFNO0tBQVMsT0FBTztLQUFJLE9BQU07SUFBVTs7Ozs7R0FDN0M7Ozs7OztDQUNIOzs7Ozs7QUFHUCxNQUFNLHFCQUNKLHdCQUFDLE9BQUQ7Q0FBSyxXQUFVO1dBQWY7RUFDRyx3QkFBQyxPQUFELEVBQUssV0FBVSxpR0FBa0c7Ozs7O0VBQ2pILHdCQUFDLE9BQUQ7R0FBSyxXQUFVO2FBQWYsQ0FDRSx3QkFBQyxPQUFEO0lBQUssV0FBVTtjQUFmLENBQ0Usd0JBQUMsT0FBRCxFQUFLLFdBQVUsMEVBQTJFOzs7O2NBQzFGLHdCQUFDLFFBQUQ7S0FBTSxXQUFVO2VBQTZEO0lBQWE7Ozs7WUFDdkY7Ozs7O2FBQ0wsd0JBQUMsT0FBRDtJQUFLLFdBQVU7Y0FBZixDQUNHLHdCQUFDLFVBQUQ7S0FBUSxXQUFVO2VBQWdGO0lBQVc7Ozs7Y0FDN0csd0JBQUMsVUFBRDtLQUFRLFdBQVU7ZUFBdUY7SUFBVzs7OztZQUNsSDs7Ozs7V0FDRjs7Ozs7O0VBQ0wsd0JBQUMsT0FBRDtHQUFLLFdBQVU7YUFBZjtJQUNFLHdCQUFDLE1BQUQ7S0FBTSxPQUFNO0tBQVMsT0FBTztLQUFJLE9BQU07SUFBVTs7Ozs7SUFDaEQsd0JBQUMsTUFBRDtLQUFNLE9BQU07S0FBUyxPQUFPO0tBQUksT0FBTTtJQUFVOzs7OztJQUNoRCx3QkFBQyxNQUFEO0tBQU0sT0FBTTtLQUFZLE9BQU87S0FBSSxPQUFNO0lBQVU7Ozs7O0lBQ25ELHdCQUFDLE1BQUQ7S0FBTSxPQUFNO0tBQVUsT0FBTztLQUFJLE9BQU07SUFBVTs7Ozs7SUFDakQsd0JBQUMsTUFBRDtLQUFNLE9BQU07S0FBUSxPQUFPO0tBQUksT0FBTTtJQUFVOzs7OztJQUMvQyx3QkFBQyxNQUFEO0tBQU0sT0FBTTtLQUFTLE9BQU87S0FBSSxPQUFNO0lBQVU7Ozs7O0dBQzdDOzs7Ozs7RUFDTCx3QkFBQyxPQUFEO0dBQUssV0FBVTthQUNiLHdCQUFDLE9BQUQ7SUFBSyxXQUFVO2NBQ1osTUFBTSxLQUFLLEVBQUMsUUFBUSxHQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxNQUNoQyx3QkFBQyxPQUFEO0tBQWEsV0FBVTtlQUF2QixDQUNFLHdCQUFDLE9BQUQsRUFBSyxXQUFXLG9FQUFvRSxJQUFFLE1BQUksSUFBSSxpQkFBaUIsZUFBZSwwQkFBMEIsTUFBSSxLQUFHLE1BQUksS0FBRyxNQUFJLEtBQUssMkNBQTJDLEtBQU87Ozs7ZUFDak8sd0JBQUMsUUFBRDtNQUFNLFdBQVU7Z0JBQW1FLElBQUU7S0FBUTs7OzthQUMxRjtPQUhLOzs7O1dBR0wsQ0FDTjtHQUNFOzs7OztFQUNGOzs7OztDQUNIOzs7Ozs7QUFHUCxNQUFNLG9CQUFvQixFQUFFLFFBQVEsY0FBeUc7Q0FDM0ksTUFBTSxDQUFDLFlBQVksaUJBQWlCLFNBQVMsa0ZBQWtGO0NBQy9ILE1BQU0sQ0FBQyxjQUFjLG1CQUFtQixTQUFTLEtBQUs7Q0FDdEQsTUFBTSxDQUFDLFdBQVcsZ0JBQWdCLFNBQWlCLEVBQUU7Q0FDckQsTUFBTSxDQUFDLFlBQVksaUJBQWlCLFNBQWMsSUFBSTtDQUV0RCxNQUFNLHVCQUF1QixZQUFZO0VBQ3ZDLElBQUksQ0FBQyxXQUFXLEtBQUssR0FBRztFQUN4QixnQkFBZ0IsSUFBSTtFQUNwQixhQUFhLDZCQUE2QjtFQUUxQyxJQUFJO0dBQ0YsTUFBTSxlQUFlOzs7Ozs7Ozs7Ozs7Ozs7OztHQWtCckIsTUFBTSxTQUFVLFlBQW9CLEtBQUssdUJBQXdCLFFBQVEsS0FBYSw0QkFBNEI7R0FFbEgsSUFBSSxDQUFDLFFBQVE7SUFDWCxhQUFhLDBHQUEwRztJQUN2SCxnQkFBZ0IsS0FBSztJQUNyQjtHQUNGO0dBRUEsTUFBTSxTQUFTLGdHQUFnRztHQUUvRyxNQUFNLFdBQVcsTUFBTSxNQUFNLFFBQVE7SUFDbkMsUUFBUTtJQUNSLFNBQVMsRUFBRSxnQkFBZ0IsbUJBQW1CO0lBQzlDLE1BQU0sS0FBSyxVQUFVO0tBQ25CLFVBQVUsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxFQUFFLE1BQU0sV0FBVyxDQUFDLEVBQUUsQ0FBQztLQUM1QyxtQkFBbUIsRUFBRSxPQUFPLENBQUMsRUFBRSxNQUFNLGFBQWEsQ0FBQyxFQUFFO0tBQ3JELGtCQUFrQixFQUFFLGtCQUFrQixtQkFBbUI7SUFDM0QsQ0FBQztHQUNILENBQUM7R0FFRCxNQUFNLE9BQU8sTUFBTSxTQUFTLEtBQUs7R0FDakMsSUFBSSxVQUFVLEtBQUssYUFBYSxFQUFFLEVBQUUsU0FBUyxRQUFRLEVBQUUsRUFBRTtHQUV6RCxJQUFJLFNBQVM7SUFDWCxVQUFVLFFBQVEsUUFBUSxZQUFZLEVBQUUsQ0FBQyxDQUFDLFFBQVEsUUFBUSxFQUFFLENBQUMsQ0FBQyxLQUFLO0lBRW5FLE1BQU0sYUFBYSxRQUFRLFFBQVEsR0FBRztJQUN0QyxNQUFNLFlBQVksUUFBUSxZQUFZLEdBQUc7SUFDekMsSUFBSSxlQUFlLENBQUMsS0FBSyxjQUFjLENBQUMsR0FBRztLQUN6QyxVQUFVLFFBQVEsVUFBVSxZQUFZLFlBQVksQ0FBQztJQUN2RDtJQUVBLE1BQU0sU0FBUyxLQUFLLE1BQU0sT0FBTztJQUNqQyxjQUFjLE1BQU07SUFDcEIsYUFBYSxLQUFLLFVBQVUsUUFBUSxNQUFNLENBQUMsQ0FBQztJQUU1QyxJQUFJLE9BQU8sT0FBTyxRQUFRLE9BQU8sT0FBTyxHQUFHO0lBQzNDLElBQUksT0FBTyxRQUFRLFNBQVM7S0FDMUIsU0FBUyxhQUNQLFNBQVMsS0FBSyxLQUFLLFFBQVE7TUFDekIsSUFBSSxPQUFPLEtBQUssTUFBTTtPQUNwQixPQUFPO1FBQ0wsR0FBRztRQUNILE1BQU0sT0FBTyxLQUFLLElBQUksQ0FBQyxRQUFRLElBQUk7UUFDbkMsVUFBVSxPQUFPLEtBQUssSUFBSSxDQUFDLFlBQVksSUFBSTtRQUMzQyxRQUFRLE9BQU8sS0FBSyxJQUFJLENBQUMsVUFBVSxJQUFJO1FBQ3ZDLFdBQVcsTUFBTSxJQUFJLE9BQU8sSUFBSTtPQUNsQztNQUNGO01BQ0EsT0FBTztLQUNULENBQUMsQ0FDSDtJQUNGO0dBQ0YsT0FBTztJQUNMLGFBQWEsbURBQW1EO0dBQ2xFO0VBQ0YsU0FBUyxPQUFZO0dBQ25CLFFBQVEsTUFBTSxLQUFLO0dBQ25CLGFBQWEscUNBQXFDLE1BQU0sV0FBVyxPQUFPO0VBQzVFLFVBQVU7R0FDUixnQkFBZ0IsS0FBSztFQUN2QjtDQUNGO0NBRUEsT0FDRSx3QkFBQyxPQUFEO0VBQUssV0FBVTtZQUFmO0dBQ0Usd0JBQUMsT0FBRDtJQUFLLFdBQVU7Y0FBZixDQUNFLHdCQUFDLE9BQUQ7S0FBSyxXQUFVO2VBQWYsQ0FDRSx3QkFBQyxLQUFELEVBQUssTUFBTSxHQUFLOzs7O2VBQ2hCLHdCQUFDLFFBQUQsWUFBTSw0QkFBK0I7Ozs7YUFDbEM7Ozs7O2NBQ0wsd0JBQUMsUUFBRDtLQUFNLFdBQVU7ZUFBNEY7SUFFdEc7Ozs7WUFDSDs7Ozs7O0dBRUwsd0JBQUMsT0FBRDtJQUFLLFdBQVU7Y0FBZixDQUNFLHdCQUFDLFNBQUQ7S0FBTyxXQUFVO2VBQWpCLENBQ0Usd0JBQUMsT0FBRDtNQUFPLE1BQU07TUFBSSxXQUFVO0tBQW9COzs7O2VBQUMsb0JBRTNDOzs7OztjQUNQLHdCQUFDLFlBQUQ7S0FDRSxPQUFPO0tBQ1AsV0FBVyxNQUFNLGNBQWMsRUFBRSxPQUFPLEtBQUs7S0FDN0MsTUFBTTtLQUNOLFdBQVU7S0FDVixhQUFZO0lBQ2I7Ozs7WUFDRTs7Ozs7O0dBRUwsd0JBQUMsVUFBRDtJQUNFLFNBQVM7SUFDVCxVQUFVO0lBQ1YsV0FBVTtjQUhaLENBS0csZUFBZSx3QkFBQyxXQUFEO0tBQVcsTUFBTTtLQUFJLFdBQVU7SUFBZ0I7Ozs7ZUFBSSx3QkFBQyxVQUFELEVBQVUsTUFBTSxHQUFLOzs7O2NBQ3ZGLGVBQWUsOEJBQThCLCtCQUN4Qzs7Ozs7O0dBRVAsY0FDQyx3QkFBQyxPQUFEO0lBQUssV0FBVTtjQUFmO0tBQ0Usd0JBQUMsT0FBRCxhQUNFLHdCQUFDLFFBQUQ7TUFBTSxXQUFVO2dCQUFrQztLQUFXOzs7O2VBQzdELHdCQUFDLFFBQUQ7TUFBTSxXQUFVO2dCQUE4QixXQUFXLFNBQVM7S0FBZTs7OzthQUM5RTs7Ozs7S0FDTCx3QkFBQyxPQUFELGFBQ0Usd0JBQUMsUUFBRDtNQUFNLFdBQVU7Z0JBQWtDO0tBQVc7Ozs7ZUFDN0Qsd0JBQUMsUUFBRDtNQUFNLFdBQVU7Z0JBQWhCLENBQTJDLFdBQVcsT0FBTyxLQUFJLE1BQVU7Ozs7O2FBQ3hFOzs7OztLQUNMLHdCQUFDLE9BQUQsYUFDRSx3QkFBQyxRQUFEO01BQU0sV0FBVTtnQkFBa0M7S0FBUzs7OztlQUMzRCx3QkFBQyxRQUFEO01BQU0sV0FBVTtnQkFBOEIsV0FBVyxPQUFPO0tBQWdCOzs7O2FBQzdFOzs7OztJQUNGOzs7Ozs7R0FHUCx3QkFBQyxPQUFEO0lBQUssV0FBVTtjQUFmLENBQ0Usd0JBQUMsUUFBRDtLQUFNLFdBQVU7ZUFBaEIsQ0FDRSx3QkFBQyxVQUFELEVBQVUsTUFBTSxHQUFLOzs7O2VBQUMsdUJBQ2xCOzs7OztjQUNOLHdCQUFDLE9BQUQ7S0FBSyxXQUFVO2VBQ1osYUFBYTtJQUNYOzs7O1lBQ0Y7Ozs7OztFQUNGOzs7Ozs7QUFFVDtBQUVBLE1BQU0sc0JBQ0osd0JBQUMsT0FBRDtDQUFLLFdBQVU7V0FDWDtFQUFDO0VBQVE7RUFBUztFQUFTO0VBQVE7RUFBUTtDQUFPLENBQUMsQ0FBQyxLQUFLLE9BQU8sTUFDL0Qsd0JBQUMsT0FBRDtFQUFpQixXQUFVO1lBQTNCLENBQ0Usd0JBQUMsT0FBRDtHQUFLLFdBQVU7YUFBZixDQUNHLHdCQUFDLE9BQUQsRUFBSyxXQUFXLHdCQUF3QixNQUFJLElBQUUsbUJBQWlCLE1BQUksSUFBRSxrQkFBZ0IsaUJBQW1COzs7O2FBQ3hHLHdCQUFDLFFBQUQ7SUFBTSxXQUFVO2NBQXdDO0dBQVk7Ozs7V0FDbEU7Ozs7O1lBQ0wsd0JBQUMsT0FBRDtHQUFLLFdBQVU7YUFDWCxNQUFNLEtBQUssRUFBQyxRQUFRLEdBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLE1BQU07SUFDckMsTUFBTSxTQUFTLEtBQUssT0FBTyxJQUFJO0lBQy9CLE9BQU8sd0JBQUMsT0FBRCxFQUFhLFdBQVcsa0JBQWtCLFNBQVUsTUFBSSxJQUFFLG1CQUFpQixNQUFJLElBQUUsa0JBQWdCLGlCQUFrQixlQUFlLEdBQUcsSUFBRSxNQUFJLElBQUksZ0JBQWdCLGVBQWlCLEdBQXRLOzs7O1dBQXNLO0dBQzFMLENBQUM7RUFDQzs7OztVQUNGO0lBWEs7Ozs7UUFXTCxDQUNOO0FBQ0M7Ozs7O0FBR1AsTUFBTSx3QkFDSix3QkFBQyxPQUFEO0NBQUssV0FBVTtXQUFmLENBQ0csd0JBQUMsU0FBRDtFQUFTLE1BQU07RUFBSyxXQUFVO0NBQThCOzs7O1dBQzVELHdCQUFDLE9BQUQ7RUFBSyxXQUFVO1lBQ1gsTUFBTSxLQUFLLEVBQUMsUUFBUSxHQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxNQUMvQix3QkFBQyxPQUFEO0dBQWEsV0FBVTthQUF2QixDQUNHLHdCQUFDLE9BQUQsRUFBSyxXQUFXLHdCQUF3QixJQUFFLE1BQUksSUFBSSw0Q0FBNEMsZUFBZSxrQkFBb0I7Ozs7YUFDakksd0JBQUMsUUFBRDtJQUFNLFdBQVU7Y0FBaEIsQ0FBcUcsVUFBTyxJQUFFLENBQVE7Ozs7O1dBQ3BIO0tBSEs7Ozs7U0FHTCxDQUNQO0NBQ0M7Ozs7U0FDSDs7Ozs7O0FBR1AsTUFBTSx5QkFDSix3QkFBQyxPQUFEO0NBQUssV0FBVTtXQUNaLHdCQUFDLE9BQUQ7RUFBSyxXQUFVO1lBQWY7R0FDRyx3QkFBQyxPQUFEO0lBQUssV0FBVTtjQUNYLE1BQU0sS0FBSyxFQUFDLFFBQVEsR0FBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUUsTUFBTSx3QkFBQyxPQUFELEVBQWEsV0FBVSw0QkFBNkIsR0FBMUM7Ozs7V0FBMEMsQ0FBQztHQUMxRjs7Ozs7R0FDTCx3QkFBQyxPQUFELEVBQUssV0FBVSx3TEFBeUw7Ozs7O0dBQ3hNLHdCQUFDLFFBQUQ7SUFBTSxXQUFVO2NBQWtFO0dBQWtCOzs7OztHQUNwRyx3QkFBQyxRQUFEO0lBQU0sV0FBVTtjQUFpRztHQUFjOzs7OztFQUM3SDs7Ozs7O0FBQ0g7Ozs7O0FBR1AsTUFBTSxvQkFBb0I7Q0FDeEIsTUFBTSxDQUFDLGdCQUFnQixxQkFBcUIsU0FBUyxPQUFPO0NBQzVELE1BQU0sQ0FBQyxlQUFlLG9CQUFvQixTQUF3QixJQUFJO0NBQ3RFLE1BQU0sQ0FBQyxpQkFBaUIsc0JBQXNCLFNBQXVFLENBQUMsQ0FBQztDQUN2SCxNQUFNLGVBQWUsT0FBeUIsSUFBSTtDQUVsRCxNQUFNLFVBQVU7RUFBQztFQUFTO0VBQVU7RUFBVTtFQUFVO0VBQU07Q0FBVTtDQUN4RSxNQUFNLGlCQUErRjtFQUNuRyxPQUFPO0dBQ0w7SUFBRSxNQUFNO0lBQXNCLEtBQUs7SUFBUSxLQUFLO0lBQUssS0FBSztHQUFLO0dBQy9EO0lBQUUsTUFBTTtJQUF1QixLQUFLO0lBQVEsS0FBSztJQUFLLEtBQUs7R0FBSztHQUNoRTtJQUFFLE1BQU07SUFBcUIsS0FBSztJQUFRLEtBQUs7SUFBSyxLQUFLO0dBQUs7RUFDaEU7RUFDQSxRQUFRLENBQ047R0FBRSxNQUFNO0dBQXFCLEtBQUs7R0FBUSxLQUFLO0dBQUssS0FBSztFQUFLLEdBQzlEO0dBQUUsTUFBTTtHQUEwQixLQUFLO0dBQVEsS0FBSztHQUFLLEtBQUs7RUFBSyxDQUNyRTtFQUNBLFFBQVEsQ0FDTjtHQUFFLE1BQU07R0FBc0IsS0FBSztHQUFRLEtBQUs7R0FBSyxLQUFLO0VBQVUsR0FDcEU7R0FBRSxNQUFNO0dBQTBCLEtBQUs7R0FBUSxLQUFLO0dBQUssS0FBSztFQUFVLENBQzFFO0VBQ0EsUUFBUSxDQUNOO0dBQUUsTUFBTTtHQUF5QixLQUFLO0dBQVEsS0FBSztHQUFLLEtBQUs7RUFBVyxHQUN4RTtHQUFFLE1BQU07R0FBeUIsS0FBSztHQUFRLEtBQUs7R0FBSyxLQUFLO0VBQVUsQ0FDekU7RUFDQSxJQUFJLENBQ0Y7R0FBRSxNQUFNO0dBQXNCLEtBQUs7R0FBUSxLQUFLO0dBQUssS0FBSztFQUFNLEdBQ2hFO0dBQUUsTUFBTTtHQUFxQixLQUFLO0dBQVEsS0FBSztHQUFLLEtBQUs7RUFBTSxDQUNqRTtFQUNBLFVBQVU7Q0FDWjtDQUVBLE1BQU0sb0JBQW9CLE1BQTJDO0VBQ25FLE1BQU0sUUFBUSxFQUFFLE9BQU87RUFDdkIsSUFBSSxDQUFDLFNBQVMsTUFBTSxXQUFXLEdBQUc7RUFDbEMsTUFBTSxXQUFXLE1BQU0sS0FBSyxLQUFLLENBQUMsQ0FBQyxLQUFLLFVBQVU7R0FDaEQsTUFBTSxLQUFLO0dBQ1gsS0FBSyxJQUFJLEtBQUssT0FBTyxJQUFJLElBQUksR0FBRyxDQUFFLFFBQVEsQ0FBQyxFQUFFO0dBQzdDLEtBQUs7R0FDTCxLQUFLO0VBQ1AsRUFBRTtFQUNGLG9CQUFtQixTQUFRLENBQUMsR0FBRyxNQUFNLEdBQUcsUUFBUSxDQUFDO0VBQ2pELGtCQUFrQixVQUFVO0NBQzlCO0NBRUEsT0FDRSx3QkFBQyxPQUFEO0VBQUssV0FBVTtZQUFmO0dBQ0csd0JBQUMsU0FBRDtJQUNFLE1BQUs7SUFDTCxLQUFLO0lBQ0wsVUFBVTtJQUNWLFFBQU87SUFDUDtJQUNBLFdBQVU7R0FDWDs7Ozs7R0FHRCx3QkFBQyxPQUFEO0lBQUssV0FBVTtjQUFmO0tBQ0Usd0JBQUMsUUFBRDtNQUFNLFdBQVU7Z0JBQWhCLENBQ0Usd0JBQUMsUUFBRCxFQUFRLE1BQU0sR0FBSzs7OztnQkFBQyxrQkFDaEI7Ozs7OztLQUNMLFFBQVEsS0FBSSxXQUNYLHdCQUFDLFVBQUQ7TUFFRSxlQUFlLGtCQUFrQixNQUFNO01BQ3ZDLFdBQVcsZ0dBQ1QsbUJBQW1CLFNBQ2YsbUdBQ0E7Z0JBTlIsQ0FTRSx3QkFBQyxPQUFEO09BQUssV0FBVTtpQkFBZixDQUNFLHdCQUFDLFFBQUQ7UUFBUSxNQUFNO1FBQUksV0FBVyxtQkFBbUIsU0FBUyxrQkFBa0I7T0FBbUI7Ozs7aUJBQzlGLHdCQUFDLFFBQUQ7UUFBTSxXQUFVO2tCQUFoQixDQUEyQixLQUFFLE1BQWE7Ozs7O2VBQ3ZDOzs7OztnQkFDSixXQUFXLGNBQWMsZ0JBQWdCLFNBQVMsS0FDakQsd0JBQUMsUUFBRDtPQUFNLFdBQVU7aUJBQXFGLGdCQUFnQjtNQUFhOzs7O2NBRTlIO1FBZkQ7Ozs7WUFlQyxDQUNUO0tBRUQsd0JBQUMsVUFBRDtNQUNFLGVBQWUsYUFBYSxTQUFTLE1BQU07TUFDM0MsV0FBVTtnQkFGWixDQUlFLHdCQUFDLFFBQUQsRUFBUSxNQUFNLEdBQUs7Ozs7Z0JBQUMsb0JBQ2Q7Ozs7OztJQUNMOzs7Ozs7R0FHTCx3QkFBQyxPQUFEO0lBQUssV0FBVTtjQUFmLENBQ0Usd0JBQUMsT0FBRDtLQUFLLFdBQVU7ZUFBZixDQUNFLHdCQUFDLFFBQUQ7TUFBTSxXQUFVO2dCQUFoQixDQUEwRCxnQkFBYSxjQUFxQjs7Ozs7ZUFDNUYsd0JBQUMsUUFBRDtNQUFNLFdBQVU7Z0JBQWhCLENBQThDLGVBQWUsZUFBZSxFQUFFLFVBQVUsR0FBRSxVQUFjOzs7OzthQUNyRzs7Ozs7Y0FFTCx3QkFBQyxPQUFEO0tBQUssV0FBVTtlQUNaLGVBQWUsZUFBZSxFQUFFLFdBQVcsSUFDMUMsd0JBQUMsT0FBRDtNQUFLLFdBQVU7Z0JBQWYsQ0FDRSx3QkFBQyxRQUFEO09BQVEsTUFBTTtPQUFJLFdBQVU7TUFBa0I7Ozs7Z0JBQzlDLHdCQUFDLFFBQUQsWUFBTSxxRUFBd0U7Ozs7Y0FDM0U7Ozs7O2dCQUVMLGVBQWUsZUFBZSxFQUFFLEtBQUssUUFBUSxNQUMzQyx3QkFBQyxPQUFEO01BQWEsV0FBVTtnQkFBdkIsQ0FDRSx3QkFBQyxPQUFEO09BQUssV0FBVTtpQkFBZixDQUNFLHdCQUFDLFVBQUQ7UUFDRSxlQUFlLGlCQUFpQixrQkFBa0IsT0FBTyxPQUFPLE9BQU8sT0FBTyxJQUFJO1FBQ2xGLFdBQVU7a0JBRVQsa0JBQWtCLE9BQU8sT0FBTyx3QkFBQyxRQUFEO1NBQVEsTUFBTTtTQUFJLE1BQUs7UUFBZ0I7Ozs7bUJBQUksd0JBQUMsTUFBRDtTQUFNLE1BQU07U0FBSSxNQUFLO1NBQWUsV0FBVTtRQUFVOzs7OztPQUM5SDs7OztpQkFDUix3QkFBQyxPQUFEO1FBQUssV0FBVTtrQkFBZixDQUNFLHdCQUFDLFFBQUQ7U0FBTSxXQUFVO21CQUE0QixPQUFPO1FBQVc7Ozs7a0JBQzlELHdCQUFDLFFBQUQ7U0FBTSxXQUFVO21CQUFoQjtVQUE0QztVQUFNLE9BQU87VUFBSTtVQUFTLE9BQU87VUFBSTtVQUFTLE9BQU87U0FBVTs7Ozs7Z0JBQ3hHOzs7OztlQUNGOzs7OztnQkFDTCx3QkFBQyxPQUFEO09BQUssV0FBVTtpQkFBZixDQUNFLHdCQUFDLE9BQUQ7UUFBSyxXQUFVO2tCQUNiLHdCQUFDLE9BQUQ7U0FBSyxXQUFVO21CQUNiLHdCQUFDLE9BQUQsRUFBSyxXQUFVLHNEQUF1RDs7Ozs7UUFDbkU7Ozs7O09BQ0Y7Ozs7aUJBQ0wsd0JBQUMsVUFBRDtRQUNFLGVBQWUsTUFBTSxXQUFXLE9BQU8sS0FBSyxnQ0FBZ0M7UUFDNUUsV0FBVTtrQkFDWDtPQUVPOzs7O2VBQ0w7Ozs7O2NBQ0Y7UUExQks7Ozs7WUEwQkwsQ0FDTjtJQUVBOzs7O1lBQ0Y7Ozs7OztFQUNIOzs7Ozs7QUFFVDtBQUVBLE1BQU0saUJBQWlCLEVBQUUsTUFBTSxLQUFLLGNBQWMsbUJBQTBKO0NBQzFNLE1BQU0sQ0FBQyxZQUFZLGlCQUFpQixTQUFTLGdCQUFnQjtDQUM3RCxNQUFNLENBQUMsY0FBYyxtQkFBbUIsU0FBZ0csQ0FBQyxDQUFDO0NBQzFJLE1BQU0sQ0FBQyxlQUFlLG9CQUFvQixTQUFTLEVBQUU7Q0FDckQsTUFBTSxDQUFDLGtCQUFrQix1QkFBdUIsU0FBUyxLQUFLO0NBQzlELE1BQU0sQ0FBQyxXQUFXLGdCQUFnQixTQUFrQyxTQUFTO0NBRTdFLGdCQUFnQjtFQUNkLElBQUk7R0FDRixNQUFNLFNBQVMsYUFBYSxRQUFRLHFCQUFxQjtHQUN6RCxJQUFJLFFBQVE7SUFDVixnQkFBZ0IsS0FBSyxNQUFNLE1BQU0sQ0FBQztHQUNwQztFQUNGLFNBQVMsR0FBRztHQUNWLFFBQVEsTUFBTSxDQUFDO0VBQ2pCO0NBQ0YsR0FBRyxDQUFDLENBQUM7Q0FFTCxNQUFNLHlCQUF5QjtFQUM3QixJQUFJLENBQUMsV0FBVyxLQUFLLEdBQUc7RUFDeEIsTUFBTSxZQUFZO0dBQ2hCLE1BQU0sV0FBVyxLQUFLO0dBQ3RCLE1BQU0sSUFBSSxLQUFLLENBQUMsQ0FBQyxlQUFlO0dBQ2hDO0dBQ0E7R0FDQTtFQUNGO0VBQ0EsTUFBTSxVQUFVLENBQUMsV0FBVyxHQUFHLGFBQWEsUUFBTyxNQUFLLEVBQUUsU0FBUyxVQUFVLElBQUksQ0FBQztFQUNsRixnQkFBZ0IsT0FBTztFQUN2QixJQUFJO0dBQ0YsYUFBYSxRQUFRLHVCQUF1QixLQUFLLFVBQVUsT0FBTyxDQUFDO0dBQ25FLGlCQUFpQixXQUFXLFVBQVUsS0FBSyx1Q0FBdUM7R0FDbEYsaUJBQWlCLGlCQUFpQixFQUFFLEdBQUcsR0FBSTtFQUM3QyxTQUFTLEdBQUc7R0FDVixRQUFRLE1BQU0sQ0FBQztHQUNmLGlCQUFpQixnQ0FBZ0M7RUFDbkQ7Q0FDRjtDQUVBLE1BQU0sb0JBQW9CLFdBQStEO0VBQ3ZGLGFBQWEsTUFBTTtFQUNuQixpQkFBaUIsc0NBQXNDO0VBQ3ZELGlCQUFpQixpQkFBaUIsRUFBRSxHQUFHLEdBQUk7Q0FDN0M7Q0FFQSxNQUFNLHNCQUFzQixTQUFpQjtFQUMzQyxNQUFNLFVBQVUsYUFBYSxRQUFPLE1BQUssRUFBRSxTQUFTLElBQUk7RUFDeEQsZ0JBQWdCLE9BQU87RUFDdkIsYUFBYSxRQUFRLHVCQUF1QixLQUFLLFVBQVUsT0FBTyxDQUFDO0NBQ3JFO0NBRUEsTUFBTSx5QkFBeUI7RUFDN0IsTUFBTSxlQUFlO0dBQ25CLFNBQVM7R0FDVCxXQUFXLElBQUksS0FBSyxDQUFDLENBQUMsWUFBWTtHQUNsQztHQUNBO0dBQ0E7RUFDRjtFQUNBLE1BQU0sT0FBTyxJQUFJLEtBQUssQ0FBQyxLQUFLLFVBQVUsY0FBYyxNQUFNLENBQUMsQ0FBQyxHQUFHLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztFQUMzRixNQUFNLE1BQU0sSUFBSSxnQkFBZ0IsSUFBSTtFQUNwQyxNQUFNLElBQUksU0FBUyxjQUFjLEdBQUc7RUFDcEMsRUFBRSxPQUFPO0VBQ1QsRUFBRSxXQUFXLG9CQUFvQixLQUFLLElBQUksRUFBRTtFQUM1QyxFQUFFLE1BQU07RUFDUixJQUFJLGdCQUFnQixHQUFHO0VBQ3ZCLGlCQUFpQiw2Q0FBNkM7RUFDOUQsaUJBQWlCLGlCQUFpQixFQUFFLEdBQUcsR0FBSTtDQUM3QztDQUVBLE1BQU0sZ0NBQWdDO0VBQ3BDLElBQUksQ0FBQyxrQkFBa0I7R0FDckIsb0JBQW9CLElBQUk7R0FDeEIsWUFBWSxxQkFBcUIsU0FBUztJQUN4QyxNQUFNLE1BQU0sSUFBSSxnQkFBZ0IsSUFBSTtJQUNwQyxNQUFNLElBQUksU0FBUyxjQUFjLEdBQUc7SUFDcEMsRUFBRSxPQUFPO0lBQ1QsRUFBRSxXQUFXLHlCQUF5QixLQUFLLElBQUksRUFBRTtJQUNqRCxFQUFFLE1BQU07SUFDUixJQUFJLGdCQUFnQixHQUFHO0lBQ3ZCLGlCQUFpQixrREFBa0Q7SUFDbkUsaUJBQWlCLGlCQUFpQixFQUFFLEdBQUcsR0FBSTtHQUM3QyxDQUFDO0dBQ0QsaUJBQWlCLGdGQUFnRjtFQUNuRyxPQUFPO0dBQ0wsb0JBQW9CLEtBQUs7R0FDekIsWUFBWSxtQkFBbUI7RUFDakM7Q0FDRjtDQUVBLE1BQU0sWUFBWTtFQUNoQjtHQUNFLE1BQU07R0FDTixLQUFLO0dBQ0wsYUFBYTtHQUNiLE9BQU87R0FDUCxjQUFjO0dBQ2QsV0FBVyxHQUFRLFNBQWlCO0lBQUUsR0FBRztJQUFHLFFBQVEsTUFBTSxNQUFNO0lBQUcsUUFBUSxNQUFNLE1BQU0sSUFBSSxLQUFLO0dBQUc7RUFDckc7RUFDQTtHQUNFLE1BQU07R0FDTixLQUFLO0dBQ0wsYUFBYTtHQUNiLE9BQU87R0FDUCxjQUFjO0dBQ2QsV0FBVyxHQUFRLFNBQWlCO0lBQUUsR0FBRztJQUFHLFFBQVEsTUFBTSxNQUFNO0lBQUcsUUFBUTtHQUFHO0VBQ2hGO0VBQ0E7R0FDRSxNQUFNO0dBQ04sS0FBSztHQUNMLGFBQWE7R0FDYixPQUFPO0dBQ1AsY0FBYztHQUNkLFdBQVcsR0FBUSxTQUFpQjtJQUFFLEdBQUc7SUFBRyxRQUFRLE1BQU07SUFBRyxRQUFRO0dBQUc7RUFDMUU7Q0FDRjtDQUVBLE1BQU0sc0JBQXNCLFFBQTZCO0VBQ3ZELE1BQU0sY0FBYyxLQUFLLEtBQUssR0FBRyxRQUFRLElBQUksU0FBUyxHQUFHLEdBQUcsQ0FBQztFQUM3RCxhQUFhO0dBQUUsTUFBTTtHQUFhLEtBQUssSUFBSTtHQUFLLGNBQWMsSUFBSTtFQUFhLENBQUM7RUFDaEYsaUJBQWlCLGFBQWEsSUFBSSxLQUFLLHVCQUF1QjtFQUM5RCxpQkFBaUIsaUJBQWlCLEVBQUUsR0FBRyxHQUFJO0NBQzdDO0NBRUEsT0FDRSx3QkFBQyxPQUFEO0VBQUssV0FBVTtZQUFmO0dBQ0Usd0JBQUMsT0FBRDtJQUFLLFdBQVU7Y0FBZixDQUNFLHdCQUFDLFFBQUQ7S0FBTSxXQUFVO2VBQWhCLENBQ0Usd0JBQUMsUUFBRCxFQUFRLE1BQU0sR0FBSzs7OztlQUFDLDhCQUNoQjs7Ozs7Y0FDTix3QkFBQyxRQUFEO0tBQU0sV0FBVTtlQUFzRjtJQUFVOzs7O1lBQzdHOzs7Ozs7R0FFTCx3QkFBQyxPQUFEO0lBQUssV0FBVTtjQUFmLENBQ0Usd0JBQUMsUUFBRDtLQUFNLFdBQVU7ZUFBK0Q7SUFBNkI7Ozs7Y0FDNUcsd0JBQUMsT0FBRDtLQUFLLFdBQVU7ZUFBZixDQUNFLHdCQUFDLFVBQUQ7TUFDRSxTQUFTO01BQ1QsV0FBVTtnQkFDWDtLQUVPOzs7O2VBQ1Isd0JBQUMsVUFBRDtNQUNFLFNBQVM7TUFDVCxXQUFXLDZEQUE2RCxtQkFBbUIsa0VBQWtFO2dCQUU1SixtQkFBbUIseUJBQXlCO0tBQ3ZDOzs7O2FBQ0w7Ozs7O1lBQ0Y7Ozs7OztHQUVMLHdCQUFDLE9BQUQ7SUFBSyxXQUFVO2NBQWY7S0FDRSx3QkFBQyxRQUFEO01BQU0sV0FBVTtnQkFBZ0U7S0FBZ0M7Ozs7O0tBQ2hILHdCQUFDLE9BQUQ7TUFBSyxXQUFVO2dCQUFmLENBQ0Usd0JBQUMsU0FBRDtPQUNFLE1BQUs7T0FDTCxPQUFPO09BQ1AsV0FBVSxNQUFLLGNBQWMsRUFBRSxPQUFPLEtBQUs7T0FDM0MsYUFBWTtPQUNaLFdBQVU7TUFDWDs7OztnQkFDRCx3QkFBQyxVQUFEO09BQ0UsU0FBUztPQUNULFdBQVU7aUJBQ1g7TUFFTzs7OztjQUNMOzs7Ozs7S0FDSixpQkFDQyx3QkFBQyxPQUFEO01BQUssV0FBVTtnQkFDWjtLQUNFOzs7OztJQUVKOzs7Ozs7R0FHTCx3QkFBQyxPQUFEO0lBQUssV0FBVTtjQUFmLENBQ0Usd0JBQUMsVUFBRDtLQUNFLGVBQWUsYUFBYSxTQUFTO0tBQ3JDLFdBQVcsMkVBQTJFLGNBQWMsWUFBWSx1RUFBdUU7ZUFGekw7TUFHQztNQUNpQixhQUFhO01BQU87S0FDOUI7Ozs7O2NBQ1Isd0JBQUMsVUFBRDtLQUNFLGVBQWUsYUFBYSxXQUFXO0tBQ3ZDLFdBQVcsMkVBQTJFLGNBQWMsY0FBYyx1RUFBdUU7ZUFGM0w7TUFHQztNQUNhLFVBQVU7TUFBTztLQUN2Qjs7Ozs7WUFDTDs7Ozs7O0dBRUwsd0JBQUMsT0FBRDtJQUFLLFdBQVU7Y0FDWixjQUFjLFlBQ2Isd0JBQUMsT0FBRDtLQUFLLFdBQVU7ZUFDWixhQUFhLFdBQVcsSUFDdkIsd0JBQUMsT0FBRDtNQUFLLFdBQVU7Z0JBQWtDO0tBQXNFOzs7O2dCQUV2SCxhQUFhLEtBQUssR0FBRyxRQUNuQix3QkFBQyxPQUFEO01BQWUsV0FBVTtnQkFBekIsQ0FDRSx3QkFBQyxPQUFEO09BQUssV0FBVTtpQkFBZixDQUNFLHdCQUFDLFFBQUQ7UUFBTSxXQUFVO2tCQUE0QixFQUFFO09BQVc7Ozs7aUJBQ3pELHdCQUFDLFFBQUQ7UUFBTSxXQUFVO2tCQUFoQjtTQUE2QyxFQUFFO1NBQUs7U0FBSSxFQUFFO1NBQUk7UUFBVTs7Ozs7ZUFDckU7Ozs7O2dCQUNMLHdCQUFDLE9BQUQ7T0FBSyxXQUFVO2lCQUFmLENBQ0Usd0JBQUMsVUFBRDtRQUNFLGVBQWUsaUJBQWlCLENBQUM7UUFDakMsV0FBVTtrQkFDWDtPQUVPOzs7O2lCQUNSLHdCQUFDLFVBQUQ7UUFDRSxlQUFlLG1CQUFtQixFQUFFLElBQUk7UUFDeEMsV0FBVTtrQkFDWDtPQUVPOzs7O2VBQ0w7Ozs7O2NBQ0Y7UUFuQks7Ozs7WUFtQkwsQ0FDTjtJQUVBOzs7O2VBRUwsd0JBQUMsT0FBRDtLQUFLLFdBQVU7ZUFDWixVQUFVLEtBQUssS0FBSyxRQUNuQix3QkFBQyxPQUFEO01BQWUsV0FBVTtnQkFBekIsQ0FDRSx3QkFBQyxPQUFEO09BQUssV0FBVTtpQkFBZjtRQUNFLHdCQUFDLE9BQUQ7U0FBSyxXQUFVO21CQUFmLENBQ0Usd0JBQUMsUUFBRDtVQUFNLFdBQVU7b0JBQTRCLElBQUk7U0FBVzs7OzttQkFDM0Qsd0JBQUMsUUFBRDtVQUFNLFdBQVU7b0JBQWdFLElBQUk7U0FBWTs7OztpQkFDN0Y7Ozs7OztRQUNMLHdCQUFDLFFBQUQ7U0FBTSxXQUFVO21CQUE4QixJQUFJO1FBQWtCOzs7OztRQUNwRSx3QkFBQyxRQUFEO1NBQU0sV0FBVTttQkFBaEI7VUFBMkM7VUFBZ0IsSUFBSTtVQUFJO1NBQVU7Ozs7OztPQUMxRTs7Ozs7Z0JBQ0wsd0JBQUMsVUFBRDtPQUNFLGVBQWUsbUJBQW1CLEdBQUc7T0FDckMsV0FBVTtpQkFDWDtNQUVPOzs7O2NBQ0w7UUFmSzs7OztZQWVMLENBQ047SUFDRTs7Ozs7R0FFSjs7Ozs7RUFDRjs7Ozs7O0FBRVQ7QUFFQSxNQUFNLHlCQUF5QjtDQUM3QixNQUFNLENBQUMsWUFBWSxpQkFBaUIsU0FBUyxLQUFLO0NBRWxELE9BQ0Usd0JBQUMsT0FBRDtFQUFLLFdBQVU7WUFDWix3QkFBQyxPQUFEO0dBQUssV0FBVTthQUFmO0lBQ0Usd0JBQUMsT0FBRCxFQUFLLFdBQVUsa0RBQW1EOzs7OztJQUNsRSx3QkFBQyxPQUFEO0tBQUssV0FBVTtlQUFmLENBQ0Usd0JBQUMsUUFBRDtNQUFNLFdBQVU7Z0JBQXVDO0tBQXFCOzs7O2VBQzVFLHdCQUFDLFFBQUQsRUFBTSxXQUFVLG9EQUFxRDs7OzthQUNsRTs7Ozs7O0lBRUwsd0JBQUMsT0FBRDtLQUFLLFdBQVU7ZUFBZixDQUNFLHdCQUFDLFVBQUQ7TUFBUSxlQUFlLFlBQVksTUFBTTtNQUFHLFdBQVU7Z0JBQTRHO0tBQVk7Ozs7ZUFDOUssd0JBQUMsVUFBRDtNQUFRLGVBQWUsWUFBWSxLQUFLO01BQUcsV0FBVTtnQkFBNEU7S0FBWTs7OzthQUMxSTs7Ozs7O0lBRUwsd0JBQUMsT0FBRDtLQUFLLFdBQVU7ZUFBZixDQUNFLHdCQUFDLE9BQUQsRUFBSyxXQUFVLDRJQUE2STs7OztlQUM1Six3QkFBQyxRQUFEO01BQU0sV0FBVTtnQkFBNkI7S0FBd0I7Ozs7YUFDbEU7Ozs7OztJQUVMLHdCQUFDLFVBQUQ7S0FDRSxlQUFlLGNBQWMsQ0FBQyxVQUFVO0tBQ3hDLFdBQVcsK0NBQStDLGFBQWEsd0RBQXdEO2VBRTlILGFBQWEsd0JBQXdCO0lBQ2hDOzs7OztHQUNMOzs7Ozs7Q0FDSDs7Ozs7QUFFVDtBQUVBLE1BQU0sZUFBZTtDQUNuQixNQUFNLENBQUMsUUFBUSxhQUFhLFNBQVM7RUFDbkM7R0FBRSxJQUFJO0dBQUcsTUFBTTtHQUF3QixPQUFPO0dBQVcsS0FBSztHQUFLLE9BQU87R0FBTyxRQUFRO0VBQU07RUFDL0Y7R0FBRSxJQUFJO0dBQUcsTUFBTTtHQUEwQixPQUFPO0dBQWEsS0FBSztHQUFNLE9BQU87R0FBTyxRQUFRO0VBQU07RUFDcEc7R0FBRSxJQUFJO0dBQUcsTUFBTTtHQUF1QixPQUFPO0dBQVEsS0FBSztHQUFNLE9BQU87R0FBTSxRQUFRO0VBQU07RUFDM0Y7R0FBRSxJQUFJO0dBQUcsTUFBTTtHQUF1QixPQUFPO0dBQVcsS0FBSztHQUFLLE9BQU87R0FBTyxRQUFRO0VBQU07Q0FDaEcsQ0FBQztDQUNELE1BQU0sQ0FBQyxVQUFVLGVBQWUsU0FBUyxRQUFRO0NBRWpELE1BQU0sb0JBQW9CLE9BQWU7RUFDdkMsV0FBVSxTQUFRLEtBQUssS0FBSSxNQUFLO0dBQzlCLElBQUksRUFBRSxPQUFPLElBQUk7SUFDZixNQUFNLFlBQVksRUFBRSxVQUFVLFlBQVksY0FBYyxFQUFFLFVBQVUsY0FBYyxTQUFTO0lBQzNGLE9BQU87S0FBRSxHQUFHO0tBQUcsT0FBTztJQUFVO0dBQ2xDO0dBQ0EsT0FBTztFQUNULENBQUMsQ0FBQztDQUNKO0NBRUEsT0FDRSx3QkFBQyxPQUFEO0VBQUssV0FBVTtZQUFmLENBQ0csd0JBQUMsT0FBRDtHQUFLLFdBQVU7YUFBZixDQUNFLHdCQUFDLFFBQUQ7SUFBTSxXQUFVO2NBQWhCLENBQ0Usd0JBQUMsV0FBRCxFQUFXLE1BQU0sR0FBSzs7OztjQUFDLDRCQUNuQjs7Ozs7YUFDTix3QkFBQyxPQUFEO0lBQUssV0FBVTtjQUFmLENBQ0Usd0JBQUMsUUFBRDtLQUFNLFdBQVU7ZUFBNkI7SUFBZTs7OztjQUMzRDtLQUFDO0tBQVM7S0FBVTtLQUFVO0lBQVEsQ0FBQyxDQUFDLEtBQUksTUFDM0Msd0JBQUMsVUFBRDtLQUVFLGVBQWUsWUFBWSxDQUFDO0tBQzVCLFdBQVcsNkNBQTZDLGFBQWEsSUFBSSw2QkFBNkI7ZUFFckc7SUFDSyxHQUxEOzs7O1dBS0MsQ0FDVCxDQUNFOzs7OztXQUNGOzs7OztZQUdMLHdCQUFDLE9BQUQ7R0FBSyxXQUFVO2FBQ1osT0FBTyxLQUFJLFVBQ1Ysd0JBQUMsT0FBRDtJQUFvQixXQUFVO2NBQTlCO0tBQ0Usd0JBQUMsT0FBRDtNQUFLLFdBQVU7Z0JBQWYsQ0FDRSx3QkFBQyxVQUFEO09BQ0UsZUFBZSxpQkFBaUIsTUFBTSxFQUFFO09BQ3hDLFdBQVcscUdBQ1QsTUFBTSxVQUFVLGNBQ1osa0VBQ0EsTUFBTSxVQUFVLFlBQ2hCLHVEQUNBO2lCQUdMLE1BQU0sVUFBVSxjQUFjLFFBQVEsTUFBTSxVQUFVLFlBQVksU0FBUztNQUN0RTs7OztnQkFDUix3QkFBQyxPQUFEO09BQUssV0FBVTtpQkFBZixDQUNFLHdCQUFDLFFBQUQ7UUFBTSxXQUFVO2tCQUFxQyxNQUFNO09BQVc7Ozs7aUJBQ3RFLHdCQUFDLFFBQUQ7UUFBTSxXQUFXLHdCQUF3QixNQUFNLFVBQVUsY0FBYyxpQkFBaUIsTUFBTSxVQUFVLFlBQVksb0JBQW9CO2tCQUF4SSxDQUE0SixZQUNqSixNQUFNLEtBQ1g7Ozs7O2VBQ0g7Ozs7O2NBQ0Y7Ozs7OztLQUVMLHdCQUFDLE9BQUQ7TUFBSyxXQUFVO2dCQUFmLENBQ0Usd0JBQUMsT0FBRCxFQUFLLFdBQVUsdURBQXdEOzs7O2dCQUN2RSx3QkFBQyxPQUFEO09BQUssV0FBVTtpQkFDWixNQUFNLEtBQUssRUFBQyxRQUFRLEdBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLE1BQ2hDLHdCQUFDLE9BQUQ7UUFBYSxXQUFVO1FBQXFDLE9BQU8sRUFBRSxRQUFRLEdBQUcsS0FBSyxJQUFJLElBQUUsQ0FBQyxJQUFFLEtBQUssR0FBRyxHQUFHO09BQUksR0FBbkc7Ozs7Y0FBbUcsQ0FDOUc7TUFDRTs7OztjQUNGOzs7Ozs7S0FFTCx3QkFBQyxPQUFEO01BQUssV0FBVTtnQkFBZixDQUNFLHdCQUFDLFVBQUQ7T0FDRSxlQUFlLFdBQVUsU0FBUSxLQUFLLEtBQUksTUFBSyxFQUFFLE9BQU8sTUFBTSxLQUFLO1FBQUUsR0FBRztRQUFHLE9BQU8sQ0FBQyxFQUFFO09BQU0sSUFBSSxDQUFDLENBQUM7T0FDakcsV0FBVyw2Q0FBNkMsTUFBTSxRQUFRLDBCQUEwQjtpQkFDakc7TUFFTzs7OztnQkFDUix3QkFBQyxVQUFEO09BQ0UsZUFBZSxXQUFVLFNBQVEsS0FBSyxLQUFJLE1BQUssRUFBRSxPQUFPLE1BQU0sS0FBSztRQUFFLEdBQUc7UUFBRyxRQUFRLENBQUMsRUFBRTtPQUFPLElBQUksQ0FBQyxDQUFDO09BQ25HLFdBQVcsNkNBQTZDLE1BQU0sU0FBUyxpQ0FBaUM7aUJBQ3pHO01BRU87Ozs7Y0FDTDs7Ozs7O0lBQ0Y7TUE3Q0ssTUFBTTs7OztVQTZDWCxDQUNOO0VBQ0U7Ozs7VUFDSDs7Ozs7O0FBRVQ7QUFDQSxNQUFNLGdCQUFnQjtDQUNwQixNQUFNLENBQUMsUUFBUSxhQUFhLFNBQVM7RUFDbkM7R0FBRSxJQUFJO0dBQUcsTUFBTTtHQUFvQixXQUFXO0dBQXVCLFFBQVE7R0FBTSxVQUFVO0dBQVEsUUFBUTtHQUFJLGFBQWE7R0FBRyxLQUFLO0dBQUcsUUFBUTtHQUFNLFFBQVE7R0FBNEIsWUFBWTtFQUFNO0VBQzdNO0dBQUUsSUFBSTtHQUFHLE1BQU07R0FBb0IsV0FBVztHQUFrQixRQUFRO0dBQU0sVUFBVTtHQUFRLFFBQVE7R0FBSSxhQUFhO0dBQUcsS0FBSyxDQUFDO0dBQUssUUFBUTtHQUFNLFFBQVE7R0FBNEIsWUFBWTtFQUFNO0VBQzNNO0dBQUUsSUFBSTtHQUFHLE1BQU07R0FBbUIsV0FBVztHQUFxQixRQUFRO0dBQU0sVUFBVTtHQUFRLFFBQVE7R0FBSSxhQUFhO0dBQUcsS0FBSztHQUFLLFFBQVE7R0FBTSxRQUFRO0dBQTRCLFlBQVk7RUFBTTtFQUM1TTtHQUFFLElBQUk7R0FBRyxNQUFNO0dBQXVCLFdBQVc7R0FBZ0IsUUFBUTtHQUFPLFVBQVU7R0FBUyxRQUFRO0dBQUksYUFBYTtHQUFHLEtBQUs7R0FBRyxRQUFRO0dBQU8sUUFBUTtHQUE0QixZQUFZO0VBQU07Q0FDOU0sQ0FBQztDQUVELE1BQU0sQ0FBQyxNQUFNLFdBQVcsU0FBUztFQUFFLFFBQVE7RUFBSSxPQUFPO0VBQUksU0FBUztFQUFJLFNBQVM7Q0FBRyxDQUFDO0NBQ3BGLE1BQU0sQ0FBQyxZQUFZLGlCQUFpQixTQUFtQixDQUFDLENBQUM7Q0FDekQsTUFBTSxnQkFBZ0IsT0FBb0MsQ0FBQyxDQUFDO0NBRTVELE1BQU0sb0JBQW9CLE9BQW1ELFFBQWdCO0VBQzNGLE1BQU0sVUFBVTtHQUFFLEdBQUc7SUFBTyxRQUFRO0VBQUk7RUFDeEMsUUFBUSxPQUFPO0VBQ2YsWUFBWSxRQUFRLE9BQU8sR0FBRztDQUNoQztDQUVBLE1BQU0sbUJBQW1CLE9BQU8sT0FBZSxTQUFlO0VBQzVELElBQUk7R0FDRixNQUFNLGNBQWMsTUFBTSxLQUFLLFlBQVk7R0FDM0MsTUFBTSxnQkFBZ0IsTUFBTSxZQUFZLGdCQUFnQixXQUFXO0dBQ25FLE1BQU0sY0FBYyxnQkFBZ0IsR0FBRyxjQUFjLFNBQVMsUUFBUSxDQUFDLEVBQUUsS0FBSztHQUU5RSxXQUFVLFNBQVEsS0FBSyxLQUFLLEdBQUcsTUFBTTtJQUNuQyxJQUFJLE1BQU0sT0FBTztLQUNmLE9BQU87TUFDTCxHQUFHO01BQ0gsTUFBTSxLQUFLO01BQ1gsUUFBUTtNQUNSLFVBQVU7TUFDVixRQUFRO01BQ1IsUUFBUTtLQUNWO0lBQ0Y7SUFDQSxPQUFPO0dBQ1QsQ0FBQyxDQUFDO0VBQ0osU0FBUyxLQUFLO0dBQ1osUUFBUSxNQUFNLDBCQUEwQixHQUFHO0VBQzdDO0NBQ0Y7Q0FFQSxNQUFNLGNBQWMsT0FBZSxNQUF1QjtFQUN4RCxFQUFFLGVBQWU7RUFDakIsRUFBRSxnQkFBZ0I7RUFDbEIsV0FBVSxTQUFRLEtBQUssS0FBSyxHQUFHLE1BQU0sTUFBTSxRQUFRO0dBQUUsR0FBRztHQUFHLFlBQVk7RUFBTSxJQUFJLENBQUMsQ0FBQztFQUNuRixJQUFJLEVBQUUsYUFBYSxTQUFTLEVBQUUsYUFBYSxNQUFNLElBQUk7R0FDbkQsaUJBQWlCLE9BQU8sRUFBRSxhQUFhLE1BQU0sRUFBRTtFQUNqRDtDQUNGO0NBRUEsTUFBTSxrQkFBa0IsT0FBZSxNQUF1QjtFQUM1RCxFQUFFLGVBQWU7RUFDakIsRUFBRSxnQkFBZ0I7RUFDbEIsV0FBVSxTQUFRLEtBQUssS0FBSyxHQUFHLE1BQU0sTUFBTSxRQUFRO0dBQUUsR0FBRztHQUFHLFlBQVk7RUFBSyxJQUFJLENBQUMsQ0FBQztDQUNwRjtDQUVBLE1BQU0sbUJBQW1CLE9BQWUsTUFBdUI7RUFDN0QsRUFBRSxlQUFlO0VBQ2pCLEVBQUUsZ0JBQWdCO0VBQ2xCLFdBQVUsU0FBUSxLQUFLLEtBQUssR0FBRyxNQUFNLE1BQU0sUUFBUTtHQUFFLEdBQUc7R0FBRyxZQUFZO0VBQU0sSUFBSSxDQUFDLENBQUM7Q0FDckY7Q0FFQSxNQUFNLG9CQUFvQixPQUFlLE9BQWUsUUFBYTtFQUNuRSxXQUFVLFNBQVEsS0FBSyxLQUFLLEdBQUcsTUFBTSxNQUFNLFFBQVE7R0FBRSxHQUFHO0lBQUksUUFBUTtFQUFJLElBQUksQ0FBQyxDQUFDO0NBQ2hGO0NBRUEsTUFBTSxRQUFRO0VBQ1o7R0FBRSxNQUFNO0dBQU0sTUFBTTtHQUFRLFNBQVM7RUFBTTtFQUMzQztHQUFFLE1BQU07R0FBTyxNQUFNO0dBQVEsU0FBUztFQUFLO0VBQzNDO0dBQUUsTUFBTTtHQUFNLE1BQU07R0FBUSxTQUFTO0VBQU07RUFDM0M7R0FBRSxNQUFNO0dBQU8sTUFBTTtHQUFRLFNBQVM7RUFBSztFQUMzQztHQUFFLE1BQU07R0FBTSxNQUFNO0dBQVEsU0FBUztFQUFNO0VBQzNDO0dBQUUsTUFBTTtHQUFNLE1BQU07R0FBUSxTQUFTO0VBQU07RUFDM0M7R0FBRSxNQUFNO0dBQU8sTUFBTTtHQUFRLFNBQVM7RUFBSztFQUMzQztHQUFFLE1BQU07R0FBTSxNQUFNO0dBQVEsU0FBUztFQUFNO0VBQzNDO0dBQUUsTUFBTTtHQUFPLE1BQU07R0FBUSxTQUFTO0VBQUs7RUFDM0M7R0FBRSxNQUFNO0dBQU0sTUFBTTtHQUFRLFNBQVM7RUFBTTtFQUMzQztHQUFFLE1BQU07R0FBTyxNQUFNO0dBQVEsU0FBUztFQUFLO0VBQzNDO0dBQUUsTUFBTTtHQUFNLE1BQU07R0FBUSxTQUFTO0VBQU07RUFDM0M7R0FBRSxNQUFNO0dBQU0sTUFBTTtHQUFRLFNBQVM7RUFBTTtFQUMzQztHQUFFLE1BQU07R0FBTyxNQUFNO0dBQVEsU0FBUztFQUFLO0VBQzNDO0dBQUUsTUFBTTtHQUFNLE1BQU07R0FBUSxTQUFTO0VBQU07RUFDM0M7R0FBRSxNQUFNO0dBQU8sTUFBTTtHQUFRLFNBQVM7RUFBSztFQUMzQztHQUFFLE1BQU07R0FBTSxNQUFNO0dBQVEsU0FBUztFQUFNO0VBQzNDO0dBQUUsTUFBTTtHQUFNLE1BQU07R0FBUSxTQUFTO0VBQU07RUFDM0M7R0FBRSxNQUFNO0dBQU8sTUFBTTtHQUFRLFNBQVM7RUFBSztFQUMzQztHQUFFLE1BQU07R0FBTSxNQUFNO0dBQVEsU0FBUztFQUFNO0VBQzNDO0dBQUUsTUFBTTtHQUFPLE1BQU07R0FBUSxTQUFTO0VBQUs7RUFDM0M7R0FBRSxNQUFNO0dBQU0sTUFBTTtHQUFRLFNBQVM7RUFBTTtFQUMzQztHQUFFLE1BQU07R0FBTyxNQUFNO0dBQVEsU0FBUztFQUFLO0VBQzNDO0dBQUUsTUFBTTtHQUFNLE1BQU07R0FBUSxTQUFTO0VBQU07Q0FDN0M7Q0FFQSxNQUFNLGVBQWUsV0FBbUIsU0FBaUI7RUFDdkQsZUFBYyxTQUFRLENBQUMsR0FBRyxNQUFNLFNBQVMsQ0FBQztFQUMxQyxpQkFBaUI7R0FDZixlQUFjLFNBQVEsS0FBSyxRQUFPLE1BQUssTUFBTSxTQUFTLENBQUM7RUFDekQsR0FBRyxHQUFHO0VB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QUU7Ozs7YUErQkk7S0FFakIsQ0FBQztJQUNFOzs7Ozs7R0FFTCx3QkFBQyxTQUFEO0lBQ0UsU0FBUyxRQUFRLFFBQVEsTUFBTSxFQUFFLE1BQU07SUFDNUI7SUFBZ0I7SUFBa0I7SUFBMkI7SUFDeEUsY0FBYztJQUFrQixhQUFhO0lBQVcsc0JBQXNCO0lBQzlFLGdCQUFnQjtJQUFjLHNCQUFzQjtLQUFFLFdBQVcsQ0FBQyxDQUFDO0tBQUcsV0FBVyxNQUFNO0lBQUc7SUFDMUYsUUFBUTtJQUFZLFFBQVE7SUFBWSxTQUFTLFFBQVEsU0FBUztJQUFHLFNBQVMsT0FBTyxTQUFTO0dBQy9GOzs7OztFQUNFOzs7Ozs7QUFFVCIsIm5hbWVzIjpbXSwic291cmNlcyI6WyJBcHAudHN4Il0sInZlcnNpb24iOjMsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIFNQRFgtTGljZW5zZS1JZGVudGlmaWVyOiBBcGFjaGUtMi4wXG4gKi9cblxuaW1wb3J0IFJlYWN0LCB7IHVzZVN0YXRlLCB1c2VFZmZlY3QsIHVzZVJlZiB9IGZyb20gXCJyZWFjdFwiO1xuaW1wb3J0IHsgR29vZ2xlR2VuQUkgfSBmcm9tIFwiQGdvb2dsZS9nZW5haVwiO1xuaW1wb3J0IHsgXG4gIEdyaWQsIFNsaWRlcnMsIEFjdGl2aXR5LCBEaXNjLCBTcGFya2xlcywgTmV0d29yaywgTW92ZSwgRm9sZGVyLCBaYXAsIFxuICBTbWFydHBob25lLCBNaWMyLCBNaWMsIFNjaXNzb3JzLCBMYXlvdXRHcmlkLCBCYXJDaGFydCwgTXVzaWMsIFJhZGlvLCBHaXRodWIsIFxuICBQbGF5LCBTcXVhcmUsIFgsIE1pbnVzLCBNYXhpbWl6ZTIsIFZvbHVtZTIsIFJlZnJlc2hDdyxcbiAgQm90LCBTZW5kLCBUZXJtaW5hbCwgV2FuZDIsIFZvbHVtZVgsIENwdSwgUm90YXRlQ2N3LCBSb3RhdGVDd1xufSBmcm9tIFwibHVjaWRlLXJlYWN0XCI7XG5cbnR5cGUgV2luZG93SWQgPSBzdHJpbmc7XG5cbmludGVyZmFjZSBBcHBXaW5kb3cge1xuICBpZDogV2luZG93SWQ7XG4gIHRpdGxlOiBzdHJpbmc7XG4gIGljb25OYW1lOiBzdHJpbmc7XG4gIHg6IG51bWJlcjtcbiAgeTogbnVtYmVyO1xuICB3aWR0aDogbnVtYmVyO1xuICBoZWlnaHQ6IG51bWJlcjtcbiAgekluZGV4OiBudW1iZXI7XG4gIGlzTWluaW1pemVkOiBib29sZWFuO1xuICBpc09wZW46IGJvb2xlYW47XG4gIGlzTWF4aW1pemVkOiBib29sZWFuO1xufVxuXG5pbnRlcmZhY2UgUGFkIHtcbiAgaWQ6IHN0cmluZztcbiAgbmFtZTogc3RyaW5nO1xuICBjYXRlZ29yeTogXCJkcnVtc1wiIHwgXCJiYXNzXCIgfCBcInN5bnRoXCIgfCBcImZ4XCI7XG4gIGNvbG9yOiBzdHJpbmc7XG4gIGxvb3BUeXBlOiBzdHJpbmc7XG4gIGlzUGxheWluZzogYm9vbGVhbjtcbiAgdm9sdW1lOiBudW1iZXI7XG4gIHBhbjogbnVtYmVyO1xuICBtdXRlZDogYm9vbGVhbjtcbiAgc29sb2VkOiBib29sZWFuO1xufVxuXG5pbnRlcmZhY2UgRlhTZXR0aW5ncyB7XG4gIGZpbHRlckN1dG9mZjogbnVtYmVyO1xuICBmaWx0ZXJSZXNvbmFuY2U6IG51bWJlcjtcbiAgZmlsdGVyVHlwZTogc3RyaW5nO1xuICBkZWxheVRpbWU6IG51bWJlcjtcbiAgZGVsYXlGZWVkYmFjazogbnVtYmVyO1xuICBkZWxheU1peDogbnVtYmVyO1xuICByZXZlcmJNaXg6IG51bWJlcjtcbiAgZGlzdG9ydGlvbkRyaXZlOiBudW1iZXI7XG59XG5cbmNsYXNzIEF1ZGlvRW5naW5lIHtcbiAgcHJpdmF0ZSBicG06IG51bWJlciA9IDEyNDtcbiAgcHJpdmF0ZSBpc1BsYXlpbmc6IGJvb2xlYW4gPSBmYWxzZTtcbiAgcHJpdmF0ZSBzdGVwOiBudW1iZXIgPSAwO1xuICBwcml2YXRlIGludGVydmFsSWQ6IG51bWJlciB8IG51bGwgPSBudWxsO1xuICBwcml2YXRlIG9uU3RlcENhbGxiYWNrOiAoc3RlcDogbnVtYmVyKSA9PiB2b2lkID0gKCkgPT4ge307XG4gIFxuICAvLyBSZWFsIGF1ZGlvIHN0YXRlXG4gIHByaXZhdGUgYXVkaW9DdHg6IEF1ZGlvQ29udGV4dCB8IG51bGwgPSBudWxsO1xuICBwcml2YXRlIGFuYWx5c2VyOiBBbmFseXNlck5vZGUgfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBwYWRzOiBQYWRbXSA9IFtdO1xuICBwcml2YXRlIG1hc3RlclZvbHVtZTogbnVtYmVyID0gMC44NTtcblxuICAvLyBBRFNSIFNldHRpbmdzXG4gIHByaXZhdGUgYWRzciA9IHsgYXR0YWNrOiAxNSwgZGVjYXk6IDQ1LCBzdXN0YWluOiA3MCwgcmVsZWFzZTogNTAgfTtcblxuICAvLyBFUSBCYW5kcyBTZXR0aW5nc1xuICBwcml2YXRlIGVxQmFuZHMgPSBbXG4gICAgeyBmcmVxOiAyMCwgZ2FpbjogNTAsIHE6IDYwIH0sXG4gICAgeyBmcmVxOiA0MCwgZ2FpbjogNDUsIHE6IDUwIH0sXG4gICAgeyBmcmVxOiA2NSwgZ2FpbjogNTUsIHE6IDcwIH0sXG4gICAgeyBmcmVxOiA4NSwgZ2FpbjogNTAsIHE6IDQwIH1cbiAgXTtcblxuICBzZXRCUE0oYnBtOiBudW1iZXIpIHsgdGhpcy5icG0gPSBicG07IH1cbiAgc2V0TWFzdGVyVm9sdW1lKHZvbDogbnVtYmVyKSB7IHRoaXMubWFzdGVyVm9sdW1lID0gdm9sOyB9XG4gIHVwZGF0ZVBhZHNTdGF0ZShwYWRzOiBQYWRbXSkgeyB0aGlzLnBhZHMgPSBwYWRzOyB9XG4gIHVwZGF0ZUZYKGZ4OiBGWFNldHRpbmdzKSB7IC8qIFJlYWR5IGZvciBGWCBpbXBsZW1lbnRhdGlvbiAqLyB9XG5cbiAgc2V0QURTUihwYXJhbTogJ2F0dGFjaycgfCAnZGVjYXknIHwgJ3N1c3RhaW4nIHwgJ3JlbGVhc2UnLCB2YWx1ZTogbnVtYmVyKSB7XG4gICAgdGhpcy5hZHNyW3BhcmFtXSA9IHZhbHVlO1xuICB9XG5cbiAgc2V0RVFCYW5kKGJhbmRJbmRleDogbnVtYmVyLCBwYXJhbTogJ2ZyZXEnIHwgJ2dhaW4nIHwgJ3EnLCB2YWx1ZTogbnVtYmVyKSB7XG4gICAgaWYgKHRoaXMuZXFCYW5kc1tiYW5kSW5kZXhdKSB7XG4gICAgICB0aGlzLmVxQmFuZHNbYmFuZEluZGV4XVtwYXJhbV0gPSB2YWx1ZTtcbiAgICB9XG4gIH1cblxuICBnZXRJc1BsYXlpbmcoKSB7IHJldHVybiB0aGlzLmlzUGxheWluZzsgfVxuICBcbiAgc2V0T25TdGVwKGNiOiAoc3RlcDogbnVtYmVyKSA9PiB2b2lkKSB7XG4gICAgdGhpcy5vblN0ZXBDYWxsYmFjayA9IGNiO1xuICB9XG5cbiAgZ2V0Qnl0ZVRpbWVEb21haW5EYXRhKGFycmF5OiBVaW50OEFycmF5KSB7XG4gICAgaWYgKHRoaXMuYW5hbHlzZXIgJiYgdGhpcy5hdWRpb0N0eCAmJiB0aGlzLmF1ZGlvQ3R4LnN0YXRlID09PSAncnVubmluZycpIHtcbiAgICAgIHRoaXMuYW5hbHlzZXIuZ2V0Qnl0ZVRpbWVEb21haW5EYXRhKGFycmF5IGFzIGFueSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYXJyYXkubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgYXJyYXlbaV0gPSAxMjggKyBNYXRoLnNpbihpIC8gNCArIERhdGUubm93KCkgLyAxMDApICogMTU7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZ2V0Qnl0ZUZyZXF1ZW5jeURhdGEoYXJyYXk6IFVpbnQ4QXJyYXkpIHtcbiAgICBpZiAodGhpcy5hbmFseXNlciAmJiB0aGlzLmF1ZGlvQ3R4ICYmIHRoaXMuYXVkaW9DdHguc3RhdGUgPT09ICdydW5uaW5nJykge1xuICAgICAgdGhpcy5hbmFseXNlci5nZXRCeXRlRnJlcXVlbmN5RGF0YShhcnJheSBhcyBhbnkpO1xuICAgIH0gZWxzZSB7XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGFycmF5Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGFycmF5W2ldID0gTWF0aC5hYnMoTWF0aC5zaW4oaSAvIDIgKyBEYXRlLm5vdygpIC8gMTUwKSkgKiAxNjAgKyBNYXRoLnJhbmRvbSgpICogNDA7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgZGVjb2RlQXVkaW9EYXRhKGFycmF5QnVmZmVyOiBBcnJheUJ1ZmZlcik6IFByb21pc2U8QXVkaW9CdWZmZXIgfCBudWxsPiB7XG4gICAgdGhpcy5pbml0QXVkaW8oKTtcbiAgICBpZiAoIXRoaXMuYXVkaW9DdHgpIHJldHVybiBudWxsO1xuICAgIHRyeSB7XG4gICAgICByZXR1cm4gYXdhaXQgdGhpcy5hdWRpb0N0eC5kZWNvZGVBdWRpb0RhdGEoYXJyYXlCdWZmZXIpO1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgY29uc29sZS5lcnJvcihcIkF1ZGlvIGRlY29kZSBlcnJvcjpcIiwgZXJyKTtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgfVxuXG4gIHRyaWdnZXJQb2x5Vm9pY2UoXG4gICAgZnJlcXVlbmN5OiBudW1iZXIsXG4gICAgbGF5ZXJzOiB7IGJ1ZmZlcjogQXVkaW9CdWZmZXIgfCBudWxsOyB2b2x1bWU6IG51bWJlcjsgcGl0Y2hPZmZzZXQ6IG51bWJlcjsgcGFuOiBudW1iZXI7IGFjdGl2ZTogYm9vbGVhbiB9W10sXG4gICAgYWRzck92ZXJyaWRlPzogeyBhdHRhY2s6IG51bWJlcjsgZGVjYXk6IG51bWJlcjsgc3VzdGFpbjogbnVtYmVyOyByZWxlYXNlOiBudW1iZXIgfVxuICApIHtcbiAgICB0aGlzLmluaXRBdWRpbygpO1xuICAgIGlmICghdGhpcy5hdWRpb0N0eCkgcmV0dXJuO1xuXG4gICAgY29uc3Qgbm93ID0gdGhpcy5hdWRpb0N0eC5jdXJyZW50VGltZTtcbiAgICBjb25zdCBlbnYgPSBhZHNyT3ZlcnJpZGUgfHwgdGhpcy5hZHNyO1xuXG4gICAgY29uc3QgYXR0YWNrVGltZSA9IE1hdGgubWF4KDAuMDA1LCAoZW52LmF0dGFjayAvIDEwMCkgKiAxLjUpO1xuICAgIGNvbnN0IGRlY2F5VGltZSA9IE1hdGgubWF4KDAuMDEsIChlbnYuZGVjYXkgLyAxMDApICogMS41KTtcbiAgICBjb25zdCByZWxlYXNlVGltZSA9IE1hdGgubWF4KDAuMDUsIChlbnYucmVsZWFzZSAvIDEwMCkgKiAyLjUpO1xuICAgIGNvbnN0IHN1c3RhaW5MZXZlbCA9IE1hdGgubWF4KDAuMDAxLCAoZW52LnN1c3RhaW4gLyAxMDApICogdGhpcy5tYXN0ZXJWb2x1bWUpO1xuXG4gICAgY29uc3QgbWFzdGVyR2FpbiA9IHRoaXMuYXVkaW9DdHguY3JlYXRlR2FpbigpO1xuICAgIG1hc3RlckdhaW4uZ2Fpbi5zZXRWYWx1ZUF0VGltZSgwLjAwMDEsIG5vdyk7XG4gICAgbWFzdGVyR2Fpbi5nYWluLmxpbmVhclJhbXBUb1ZhbHVlQXRUaW1lKHRoaXMubWFzdGVyVm9sdW1lLCBub3cgKyBhdHRhY2tUaW1lKTtcbiAgICBtYXN0ZXJHYWluLmdhaW4ubGluZWFyUmFtcFRvVmFsdWVBdFRpbWUoc3VzdGFpbkxldmVsLCBub3cgKyBhdHRhY2tUaW1lICsgZGVjYXlUaW1lKTtcbiAgICBtYXN0ZXJHYWluLmdhaW4uZXhwb25lbnRpYWxSYW1wVG9WYWx1ZUF0VGltZSgwLjAwMDEsIG5vdyArIGF0dGFja1RpbWUgKyBkZWNheVRpbWUgKyByZWxlYXNlVGltZSk7XG5cbiAgICBpZiAodGhpcy5hbmFseXNlcikge1xuICAgICAgbWFzdGVyR2Fpbi5jb25uZWN0KHRoaXMuYW5hbHlzZXIpO1xuICAgICAgdGhpcy5hbmFseXNlci5jb25uZWN0KHRoaXMuYXVkaW9DdHguZGVzdGluYXRpb24pO1xuICAgIH0gZWxzZSB7XG4gICAgICBtYXN0ZXJHYWluLmNvbm5lY3QodGhpcy5hdWRpb0N0eC5kZXN0aW5hdGlvbik7XG4gICAgfVxuXG4gICAgbGV0IHBsYXllZEJ1ZmZlcnMgPSAwO1xuICAgIGxheWVycy5mb3JFYWNoKGxheWVyID0+IHtcbiAgICAgIGlmICghbGF5ZXIuYWN0aXZlIHx8IGxheWVyLnZvbHVtZSA8PSAwKSByZXR1cm47XG5cbiAgICAgIGlmIChsYXllci5idWZmZXIpIHtcbiAgICAgICAgcGxheWVkQnVmZmVycysrO1xuICAgICAgICBjb25zdCBzb3VyY2UgPSB0aGlzLmF1ZGlvQ3R4IS5jcmVhdGVCdWZmZXJTb3VyY2UoKTtcbiAgICAgICAgc291cmNlLmJ1ZmZlciA9IGxheWVyLmJ1ZmZlcjtcblxuICAgICAgICBjb25zdCBiYXNlUmF0aW8gPSBmcmVxdWVuY3kgLyAyNjEuNjM7XG4gICAgICAgIGNvbnN0IHBpdGNoUmF0aW8gPSBiYXNlUmF0aW8gKiBNYXRoLnBvdygyLCBsYXllci5waXRjaE9mZnNldCAvIDEyKTtcbiAgICAgICAgc291cmNlLnBsYXliYWNrUmF0ZS5zZXRWYWx1ZUF0VGltZShNYXRoLm1heCgwLjEsIHBpdGNoUmF0aW8pLCBub3cpO1xuXG4gICAgICAgIGNvbnN0IHBhbm5lciA9IHRoaXMuYXVkaW9DdHghLmNyZWF0ZVN0ZXJlb1Bhbm5lcigpO1xuICAgICAgICBwYW5uZXIucGFuLnNldFZhbHVlQXRUaW1lKGxheWVyLnBhbiB8fCAwLCBub3cpO1xuXG4gICAgICAgIGNvbnN0IGxheWVyR2FpbiA9IHRoaXMuYXVkaW9DdHghLmNyZWF0ZUdhaW4oKTtcbiAgICAgICAgbGF5ZXJHYWluLmdhaW4uc2V0VmFsdWVBdFRpbWUobGF5ZXIudm9sdW1lLCBub3cpO1xuXG4gICAgICAgIGlmIChwYW5uZXIpIHtcbiAgICAgICAgICBzb3VyY2UuY29ubmVjdChwYW5uZXIpO1xuICAgICAgICAgIHBhbm5lci5jb25uZWN0KGxheWVyR2Fpbik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgc291cmNlLmNvbm5lY3QobGF5ZXJHYWluKTtcbiAgICAgICAgfVxuICAgICAgICBsYXllckdhaW4uY29ubmVjdChtYXN0ZXJHYWluKTtcblxuICAgICAgICBzb3VyY2Uuc3RhcnQobm93KTtcbiAgICAgICAgc291cmNlLnN0b3Aobm93ICsgYXR0YWNrVGltZSArIGRlY2F5VGltZSArIHJlbGVhc2VUaW1lICsgMC4xKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGlmIChwbGF5ZWRCdWZmZXJzID09PSAwKSB7XG4gICAgICBjb25zdCBvc2MgPSB0aGlzLmF1ZGlvQ3R4LmNyZWF0ZU9zY2lsbGF0b3IoKTtcbiAgICAgIG9zYy50eXBlID0gJ3RyaWFuZ2xlJztcbiAgICAgIG9zYy5mcmVxdWVuY3kuc2V0VmFsdWVBdFRpbWUoZnJlcXVlbmN5LCBub3cpO1xuXG4gICAgICBjb25zdCBzdWJPc2MgPSB0aGlzLmF1ZGlvQ3R4LmNyZWF0ZU9zY2lsbGF0b3IoKTtcbiAgICAgIHN1Yk9zYy50eXBlID0gJ3NpbmUnO1xuICAgICAgc3ViT3NjLmZyZXF1ZW5jeS5zZXRWYWx1ZUF0VGltZShmcmVxdWVuY3kgLyAyLCBub3cpO1xuXG4gICAgICBjb25zdCBsYXllckdhaW4gPSB0aGlzLmF1ZGlvQ3R4LmNyZWF0ZUdhaW4oKTtcbiAgICAgIGxheWVyR2Fpbi5nYWluLnNldFZhbHVlQXRUaW1lKDAuNSwgbm93KTtcblxuICAgICAgb3NjLmNvbm5lY3QobGF5ZXJHYWluKTtcbiAgICAgIHN1Yk9zYy5jb25uZWN0KGxheWVyR2Fpbik7XG4gICAgICBsYXllckdhaW4uY29ubmVjdChtYXN0ZXJHYWluKTtcblxuICAgICAgb3NjLnN0YXJ0KG5vdyk7XG4gICAgICBzdWJPc2Muc3RhcnQobm93KTtcbiAgICAgIG9zYy5zdG9wKG5vdyArIGF0dGFja1RpbWUgKyBkZWNheVRpbWUgKyByZWxlYXNlVGltZSArIDAuMSk7XG4gICAgICBzdWJPc2Muc3RvcChub3cgKyBhdHRhY2tUaW1lICsgZGVjYXlUaW1lICsgcmVsZWFzZVRpbWUgKyAwLjEpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgaW5pdEF1ZGlvKCkge1xuICAgIGlmICghdGhpcy5hdWRpb0N0eCkge1xuICAgICAgdGhpcy5hdWRpb0N0eCA9IG5ldyAod2luZG93LkF1ZGlvQ29udGV4dCB8fCAod2luZG93IGFzIGFueSkud2Via2l0QXVkaW9Db250ZXh0KSgpO1xuICAgIH1cbiAgICBpZiAoIXRoaXMuYW5hbHlzZXIgJiYgdGhpcy5hdWRpb0N0eCkge1xuICAgICAgdGhpcy5hbmFseXNlciA9IHRoaXMuYXVkaW9DdHguY3JlYXRlQW5hbHlzZXIoKTtcbiAgICAgIHRoaXMuYW5hbHlzZXIuZmZ0U2l6ZSA9IDI1NjtcbiAgICAgIHRoaXMuYW5hbHlzZXIuc21vb3RoaW5nVGltZUNvbnN0YW50ID0gMC44O1xuICAgIH1cbiAgICBpZiAodGhpcy5hdWRpb0N0eC5zdGF0ZSA9PT0gJ3N1c3BlbmRlZCcpIHtcbiAgICAgIHRoaXMuYXVkaW9DdHgucmVzdW1lKCk7XG4gICAgfVxuICB9XG5cbiAgaW5pdE1JREkob25QYWRUcmlnZ2VyOiAocGFkSW5kZXg6IG51bWJlcikgPT4gdm9pZCkge1xuICAgIGlmICgobmF2aWdhdG9yIGFzIGFueSkucmVxdWVzdE1JRElBY2Nlc3MpIHtcbiAgICAgIChuYXZpZ2F0b3IgYXMgYW55KS5yZXF1ZXN0TUlESUFjY2VzcygpLnRoZW4oXG4gICAgICAgIChtaWRpQWNjZXNzOiBhbnkpID0+IHtcbiAgICAgICAgICBjb25zb2xlLmxvZyhcIldlYiBNSURJIEFQSSBjb25uZWN0ZWQhXCIpO1xuICAgICAgICAgIGZvciAoY29uc3QgaW5wdXQgb2YgbWlkaUFjY2Vzcy5pbnB1dHMudmFsdWVzKCkpIHtcbiAgICAgICAgICAgIGlucHV0Lm9ubWlkaW1lc3NhZ2UgPSAoZXZlbnQ6IGFueSkgPT4ge1xuICAgICAgICAgICAgICBjb25zdCBbc3RhdHVzLCBkYXRhMSwgZGF0YTJdID0gZXZlbnQuZGF0YTtcbiAgICAgICAgICAgICAgaWYgKChzdGF0dXMgJiAweGYwKSA9PT0gMHg5MCAmJiBkYXRhMiA+IDApIHtcbiAgICAgICAgICAgICAgICBjb25zdCBwYWRJbmRleCA9IChkYXRhMSAtIDM2KSAlIDE2O1xuICAgICAgICAgICAgICAgIGlmIChwYWRJbmRleCA+PSAwICYmIHBhZEluZGV4IDwgMTYpIHtcbiAgICAgICAgICAgICAgICAgIG9uUGFkVHJpZ2dlcihwYWRJbmRleCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgKGVycjogYW55KSA9PiB7XG4gICAgICAgICAgY29uc29sZS53YXJuKFwiV2ViIE1JREkgYWNjZXNzIGRlbmllZCBvciB1bnN1cHBvcnRlZDpcIiwgZXJyKTtcbiAgICAgICAgfVxuICAgICAgKTtcbiAgICB9XG4gIH1cblxuICBwbGF5UGFkRGlyZWN0KHBhZDogUGFkKSB7XG4gICAgdGhpcy5pbml0QXVkaW8oKTtcbiAgICB0aGlzLnBsYXlTb3VuZChwYWQpO1xuICB9XG5cbiAgcHJpdmF0ZSBtZWRpYVJlY29yZGVyOiBNZWRpYVJlY29yZGVyIHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgcmVjb3JkZWRDaHVua3M6IEJsb2JbXSA9IFtdO1xuXG4gIHN0YXJ0UmVjb3JkaW5nQXVkaW8ob25Db21wbGV0ZTogKGJsb2I6IEJsb2IpID0+IHZvaWQpIHtcbiAgICB0aGlzLmluaXRBdWRpbygpO1xuICAgIGlmICghdGhpcy5hdWRpb0N0eCkgcmV0dXJuO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBkZXN0ID0gdGhpcy5hdWRpb0N0eC5jcmVhdGVNZWRpYVN0cmVhbURlc3RpbmF0aW9uKCk7XG4gICAgICBpZiAodGhpcy5hbmFseXNlcikge1xuICAgICAgICB0aGlzLmFuYWx5c2VyLmNvbm5lY3QoZGVzdCk7XG4gICAgICB9XG4gICAgICB0aGlzLm1lZGlhUmVjb3JkZXIgPSBuZXcgTWVkaWFSZWNvcmRlcihkZXN0LnN0cmVhbSk7XG4gICAgICB0aGlzLnJlY29yZGVkQ2h1bmtzID0gW107XG4gICAgICB0aGlzLm1lZGlhUmVjb3JkZXIub25kYXRhYXZhaWxhYmxlID0gKGUpID0+IHtcbiAgICAgICAgaWYgKGUuZGF0YS5zaXplID4gMCkgdGhpcy5yZWNvcmRlZENodW5rcy5wdXNoKGUuZGF0YSk7XG4gICAgICB9O1xuICAgICAgdGhpcy5tZWRpYVJlY29yZGVyLm9uc3RvcCA9ICgpID0+IHtcbiAgICAgICAgY29uc3QgYmxvYiA9IG5ldyBCbG9iKHRoaXMucmVjb3JkZWRDaHVua3MsIHsgdHlwZTogJ2F1ZGlvL3dlYm0nIH0pO1xuICAgICAgICBvbkNvbXBsZXRlKGJsb2IpO1xuICAgICAgfTtcbiAgICAgIHRoaXMubWVkaWFSZWNvcmRlci5zdGFydCgpO1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgY29uc29sZS5lcnJvcihcIk1lZGlhUmVjb3JkZXIgZXJyb3I6XCIsIGVycik7XG4gICAgfVxuICB9XG5cbiAgc3RvcFJlY29yZGluZ0F1ZGlvKCkge1xuICAgIGlmICh0aGlzLm1lZGlhUmVjb3JkZXIgJiYgdGhpcy5tZWRpYVJlY29yZGVyLnN0YXRlICE9PSAnaW5hY3RpdmUnKSB7XG4gICAgICB0aGlzLm1lZGlhUmVjb3JkZXIuc3RvcCgpO1xuICAgIH1cbiAgfVxuXG4gIHN0YXJ0KCkge1xuICAgIHRoaXMuaW5pdEF1ZGlvKCk7XG4gICAgdGhpcy5pc1BsYXlpbmcgPSB0cnVlO1xuICAgIHRoaXMudGljaygpO1xuICB9XG5cbiAgc3RvcCgpIHtcbiAgICB0aGlzLmlzUGxheWluZyA9IGZhbHNlO1xuICAgIGlmICh0aGlzLmludGVydmFsSWQpIGNsZWFyVGltZW91dCh0aGlzLmludGVydmFsSWQpO1xuICAgIHRoaXMuc3RlcCA9IDA7XG4gICAgdGhpcy5vblN0ZXBDYWxsYmFjaygwKTtcbiAgfVxuXG4gIC8vIFdlYiBBdWRpbyBzeW50aCBwYXRjaCB3aXRoIEFEU1IgZW52ZWxvcGUgaW50ZWdyYXRpb25cbiAgcHJpdmF0ZSBwbGF5U291bmQocGFkOiBQYWQpIHtcbiAgICBpZiAoIXRoaXMuYXVkaW9DdHggfHwgcGFkLm11dGVkIHx8IHBhZC52b2x1bWUgPT09IDApIHJldHVybjtcbiAgICBcbiAgICBjb25zdCBvc2MgPSB0aGlzLmF1ZGlvQ3R4LmNyZWF0ZU9zY2lsbGF0b3IoKTtcbiAgICBjb25zdCBnYWluTm9kZSA9IHRoaXMuYXVkaW9DdHguY3JlYXRlR2FpbigpO1xuICAgIFxuICAgIG9zYy5jb25uZWN0KGdhaW5Ob2RlKTtcbiAgICBpZiAodGhpcy5hbmFseXNlcikge1xuICAgICAgZ2Fpbk5vZGUuY29ubmVjdCh0aGlzLmFuYWx5c2VyKTtcbiAgICAgIHRoaXMuYW5hbHlzZXIuY29ubmVjdCh0aGlzLmF1ZGlvQ3R4LmRlc3RpbmF0aW9uKTtcbiAgICB9IGVsc2Uge1xuICAgICAgZ2Fpbk5vZGUuY29ubmVjdCh0aGlzLmF1ZGlvQ3R4LmRlc3RpbmF0aW9uKTtcbiAgICB9XG4gICAgXG4gICAgY29uc3Qgbm93ID0gdGhpcy5hdWRpb0N0eC5jdXJyZW50VGltZTtcbiAgICBjb25zdCBmaW5hbFZvbHVtZSA9IHBhZC52b2x1bWUgKiB0aGlzLm1hc3RlclZvbHVtZTtcbiAgICBcbiAgICAvLyBDYWxjdWxhdGUgYXR0YWNrIGFuZCByZWxlYXNlIHRpbWVzIGZyb20gQURTUiBzdGF0ZSAoc2Vjb25kcylcbiAgICBjb25zdCBhdHRhY2tUaW1lID0gTWF0aC5tYXgoMC4wMDUsICh0aGlzLmFkc3IuYXR0YWNrIC8gMTAwKSAqIDAuMSk7XG4gICAgY29uc3QgcmVsZWFzZVRpbWUgPSBNYXRoLm1heCgwLjEsICh0aGlzLmFkc3IucmVsZWFzZSAvIDEwMCkgKiAwLjUpO1xuICAgIGNvbnN0IHN1c3RhaW5MZXZlbCA9IGZpbmFsVm9sdW1lICogKHRoaXMuYWRzci5zdXN0YWluIC8gMTAwKTtcblxuICAgIC8vIEVudmVsb3BlXG4gICAgZ2Fpbk5vZGUuZ2Fpbi5zZXRWYWx1ZUF0VGltZSgwLCBub3cpO1xuICAgIGdhaW5Ob2RlLmdhaW4ubGluZWFyUmFtcFRvVmFsdWVBdFRpbWUoZmluYWxWb2x1bWUsIG5vdyArIGF0dGFja1RpbWUpO1xuICAgIGdhaW5Ob2RlLmdhaW4uZXhwb25lbnRpYWxSYW1wVG9WYWx1ZUF0VGltZShNYXRoLm1heCgwLjAwMDEsIHN1c3RhaW5MZXZlbCksIG5vdyArIGF0dGFja1RpbWUgKyAwLjEpO1xuICAgIGdhaW5Ob2RlLmdhaW4uZXhwb25lbnRpYWxSYW1wVG9WYWx1ZUF0VGltZSgwLjAwMSwgbm93ICsgYXR0YWNrVGltZSArIHJlbGVhc2VUaW1lKTtcblxuICAgIC8vIFBhdGNoIGRlc2lnbiBiYXNlZCBvbiBjYXRlZ29yeVxuICAgIGlmIChwYWQuY2F0ZWdvcnkgPT09ICdkcnVtcycpIHtcbiAgICAgICBvc2MudHlwZSA9ICdzaW5lJztcbiAgICAgICBvc2MuZnJlcXVlbmN5LnNldFZhbHVlQXRUaW1lKDE1MCwgbm93KTsgLy8gS2ljayB0aHVtcFxuICAgICAgIG9zYy5mcmVxdWVuY3kuZXhwb25lbnRpYWxSYW1wVG9WYWx1ZUF0VGltZSg0MCwgbm93ICsgMC4xKTtcbiAgICB9IGVsc2UgaWYgKHBhZC5jYXRlZ29yeSA9PT0gJ2Jhc3MnKSB7XG4gICAgICAgb3NjLnR5cGUgPSAnc2F3dG9vdGgnO1xuICAgICAgIG9zYy5mcmVxdWVuY3kuc2V0VmFsdWVBdFRpbWUoNjUuNDEsIG5vdyk7IC8vIEMyIE5vdGVcbiAgICB9IGVsc2UgaWYgKHBhZC5jYXRlZ29yeSA9PT0gJ3N5bnRoJykge1xuICAgICAgIG9zYy50eXBlID0gJ3RyaWFuZ2xlJztcbiAgICAgICBvc2MuZnJlcXVlbmN5LnNldFZhbHVlQXRUaW1lKDI2MS42Mywgbm93KTsgLy8gQzQgTm90ZVxuICAgIH0gZWxzZSB7IC8vIEZYXG4gICAgICAgb3NjLnR5cGUgPSAnc3F1YXJlJztcbiAgICAgICBvc2MuZnJlcXVlbmN5LnNldFZhbHVlQXRUaW1lKE1hdGgucmFuZG9tKCkgKiA4MDAgKyAyMDAsIG5vdyk7IC8vIFJhbmRvbSBibGlwXG4gICAgfVxuXG4gICAgb3NjLnN0YXJ0KG5vdyk7XG4gICAgb3NjLnN0b3Aobm93ICsgYXR0YWNrVGltZSArIHJlbGVhc2VUaW1lKTtcbiAgfVxuXG4gIHByaXZhdGUgdGljaygpIHtcbiAgICBpZiAoIXRoaXMuaXNQbGF5aW5nKSByZXR1cm47XG4gICAgXG4gICAgLy8gVHJpZ2dlciBzb3VuZHMgZm9yIHRoaXMgc3RlcFxuICAgIHRoaXMucGFkcy5mb3JFYWNoKChwYWQsIGlkeCkgPT4ge1xuICAgICAgaWYgKHBhZC5pc1BsYXlpbmcgJiYgIXBhZC5tdXRlZCAmJiAodGhpcy5zdGVwICUgNCA9PT0gaWR4ICUgNCkpIHtcbiAgICAgICAgdGhpcy5wbGF5U291bmQocGFkKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGNvbnN0IHN0ZXBEdXJhdGlvbiA9ICgoNjAgLyB0aGlzLmJwbSkgKiAxMDAwKSAvIDQ7XG4gICAgdGhpcy5pbnRlcnZhbElkID0gd2luZG93LnNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgdGhpcy5zdGVwID0gKHRoaXMuc3RlcCArIDEpICUgMTY7XG4gICAgICB0aGlzLm9uU3RlcENhbGxiYWNrKHRoaXMuc3RlcCk7XG4gICAgICB0aGlzLnRpY2soKTtcbiAgICB9LCBzdGVwRHVyYXRpb24pO1xuICB9XG59XG5cbmNvbnN0IGF1ZGlvRW5naW5lID0gbmV3IEF1ZGlvRW5naW5lKCk7XG5cbmNvbnN0IEFQUF9SRUdJU1RSWSA9IFtcbiAgeyBpZDogXCJncmlkXCIsIHRpdGxlOiBcIlBhZCBMYXVuY2hlclwiLCBpY29uOiBHcmlkLCBjb2xvcjogXCJ0ZXh0LWVtZXJhbGQtNDAwXCIsIGRlZmF1bHRXaWR0aDogNjIwLCBkZWZhdWx0SGVpZ2h0OiA0ODAgfSxcbiAgeyBpZDogXCJtaXhlclwiLCB0aXRsZTogXCJNaXhlciBSYWNrXCIsIGljb246IFNsaWRlcnMsIGNvbG9yOiBcInRleHQtc2xhdGUtMzAwXCIsIGRlZmF1bHRXaWR0aDogNTQwLCBkZWZhdWx0SGVpZ2h0OiA0MjAgfSxcbiAgeyBpZDogXCJmeFwiLCB0aXRsZTogXCJGWCBDaGFpblwiLCBpY29uOiBBY3Rpdml0eSwgY29sb3I6IFwidGV4dC1hbWJlci00MDBcIiwgZGVmYXVsdFdpZHRoOiA0ODAsIGRlZmF1bHRIZWlnaHQ6IDM0MCB9LFxuICB7IGlkOiBcInNlcXVlbmNlclwiLCB0aXRsZTogXCJTdGVwIFNlcXVlbmNlclwiLCBpY29uOiBEaXNjLCBjb2xvcjogXCJ0ZXh0LWN5YW4tNDAwXCIsIGRlZmF1bHRXaWR0aDogNjIwLCBkZWZhdWx0SGVpZ2h0OiA0MjAgfSxcbiAgeyBpZDogXCJncmFudWxhclwiLCB0aXRsZTogXCJHcmFudWxhciBTeW50aFwiLCBpY29uOiBTcGFya2xlcywgY29sb3I6IFwidGV4dC12aW9sZXQtNDAwXCIsIGRlZmF1bHRXaWR0aDogNjAwLCBkZWZhdWx0SGVpZ2h0OiA0MjAgfSxcbiAgeyBpZDogXCJwYXRjaGJheVwiLCB0aXRsZTogXCJNb2R1bGFyIFBhdGNoIEJheVwiLCBpY29uOiBOZXR3b3JrLCBjb2xvcjogXCJ0ZXh0LW9yYW5nZS00MDBcIiwgZGVmYXVsdFdpZHRoOiA1ODAsIGRlZmF1bHRIZWlnaHQ6IDM4MCB9LFxuICB7IGlkOiBcInh5cGFkXCIsIHRpdGxlOiBcIlgvWSBQYWQgQ29udHJvbGxlclwiLCBpY29uOiBNb3ZlLCBjb2xvcjogXCJ0ZXh0LXBpbmstNDAwXCIsIGRlZmF1bHRXaWR0aDogNDgwLCBkZWZhdWx0SGVpZ2h0OiA0ODAgfSxcbiAgeyBpZDogXCJhY2lkXCIsIHRpdGxlOiBcIkFuYWxvZyAzMDMgU3ludGhcIiwgaWNvbjogWmFwLCBjb2xvcjogXCJ0ZXh0LXllbGxvdy00MDBcIiwgZGVmYXVsdFdpZHRoOiA1NDAsIGRlZmF1bHRIZWlnaHQ6IDMyMCB9LFxuICB7IGlkOiBcInNjb3BlXCIsIHRpdGxlOiBcIk1hc3RlciBPc2NpbGxvc2NvcGVcIiwgaWNvbjogQWN0aXZpdHksIGNvbG9yOiBcInRleHQtZ3JlZW4tNDAwXCIsIGRlZmF1bHRXaWR0aDogNDgwLCBkZWZhdWx0SGVpZ2h0OiAzMDAgfSxcbiAgeyBpZDogXCJjcmF0ZVwiLCB0aXRsZTogXCJTYW1wbGUgQ3JhdGVcIiwgaWNvbjogRm9sZGVyLCBjb2xvcjogXCJ0ZXh0LWJsdWUtNDAwXCIsIGRlZmF1bHRXaWR0aDogNTIwLCBkZWZhdWx0SGVpZ2h0OiA0MDAgfSxcbiAgeyBpZDogXCJwcmVzZXQtbWFuYWdlclwiLCB0aXRsZTogXCJQcmVzZXQgTWFuYWdlclwiLCBpY29uOiBGb2xkZXIsIGNvbG9yOiBcInRleHQtYW1iZXItNDAwXCIsIGRlZmF1bHRXaWR0aDogNTAwLCBkZWZhdWx0SGVpZ2h0OiA0MjAgfSxcbiAgeyBpZDogXCJhaWdlblwiLCB0aXRsZTogXCJHZW1pbmkgQUkgUHJvZHVjZXJcIiwgaWNvbjogU3BhcmtsZXMsIGNvbG9yOiBcInRleHQtZnVjaHNpYS00MDBcIiwgZGVmYXVsdFdpZHRoOiA2MDAsIGRlZmF1bHRIZWlnaHQ6IDU2MCB9LFxuICB7IGlkOiBcIm1vYmlsZVwiLCB0aXRsZTogXCJNb2JpbGUgUmVtb3RlXCIsIGljb246IFNtYXJ0cGhvbmUsIGNvbG9yOiBcInRleHQtc2xhdGUtNDAwXCIsIGRlZmF1bHRXaWR0aDogMzgwLCBkZWZhdWx0SGVpZ2h0OiA1NDAgfSxcbiAgeyBpZDogXCJkcnVtbWFjaGluZVwiLCB0aXRsZTogXCJEcnVtIE1hY2hpbmVcIiwgaWNvbjogRGlzYywgY29sb3I6IFwidGV4dC1yZWQtNDAwXCIsIGRlZmF1bHRXaWR0aDogNjAwLCBkZWZhdWx0SGVpZ2h0OiA1MDAgfSxcbiAgeyBpZDogXCJsb29wZXJcIiwgdGl0bGU6IFwiTGl2ZSBMb29wZXJcIiwgaWNvbjogUmVmcmVzaEN3LCBjb2xvcjogXCJ0ZXh0LWluZGlnby00MDBcIiwgZGVmYXVsdFdpZHRoOiA1MDAsIGRlZmF1bHRIZWlnaHQ6IDQwMCB9LFxuICB7IGlkOiBcInNhbXBsZXJcIiwgdGl0bGU6IFwiUG9seSBTYW1wbGVyXCIsIGljb246IE11c2ljLCBjb2xvcjogXCJ0ZXh0LXRlYWwtNDAwXCIsIGRlZmF1bHRXaWR0aDogNTUwLCBkZWZhdWx0SGVpZ2h0OiA0NTAgfSxcbiAgeyBpZDogXCJ2b2ljZXRyYWluZXJcIiwgdGl0bGU6IFwiVm9pY2UgVHJhaW5lclwiLCBpY29uOiBNaWMyLCBjb2xvcjogXCJ0ZXh0LXJvc2UtNDAwXCIsIGRlZmF1bHRXaWR0aDogNTAwLCBkZWZhdWx0SGVpZ2h0OiA0MDAgfSxcbiAgeyBpZDogXCJ2b2ljZWNoYW5nZXJcIiwgdGl0bGU6IFwiVm9jYWwgVHJhbnNmb3JtZXJcIiwgaWNvbjogTWljMiwgY29sb3I6IFwidGV4dC1wdXJwbGUtNDAwXCIsIGRlZmF1bHRXaWR0aDogNDUwLCBkZWZhdWx0SGVpZ2h0OiAzNTAgfSxcbiAgeyBpZDogXCJ0cmltXCIsIHRpdGxlOiBcIkF1ZGlvIFRyaW1cIiwgaWNvbjogU2Npc3NvcnMsIGNvbG9yOiBcInRleHQtYmx1ZS0zMDBcIiwgZGVmYXVsdFdpZHRoOiA2NTAsIGRlZmF1bHRIZWlnaHQ6IDM1MCB9LFxuICB7IGlkOiBcIm1hdHJpeFwiLCB0aXRsZTogXCJSb3V0aW5nIE1hdHJpeFwiLCBpY29uOiBMYXlvdXRHcmlkLCBjb2xvcjogXCJ0ZXh0LWN5YW4tMzAwXCIsIGRlZmF1bHRXaWR0aDogNTUwLCBkZWZhdWx0SGVpZ2h0OiA1MDAgfSxcbiAgeyBpZDogXCJwYXJhbWV0cmljLWVxXCIsIHRpdGxlOiBcIlBhcmFtZXRyaWMgRVFcIiwgaWNvbjogQmFyQ2hhcnQsIGNvbG9yOiBcInRleHQtZW1lcmFsZC0zMDBcIiwgZGVmYXVsdFdpZHRoOiA2MDAsIGRlZmF1bHRIZWlnaHQ6IDQwMCB9LFxuICB7IGlkOiBcInZvY2FsYXV0b3R1bmVcIiwgdGl0bGU6IFwiQXV0b1R1bmUgUHJvXCIsIGljb246IE11c2ljLCBjb2xvcjogXCJ0ZXh0LXZpb2xldC0zMDBcIiwgZGVmYXVsdFdpZHRoOiA1MDAsIGRlZmF1bHRIZWlnaHQ6IDM1MCB9LFxuICB7IGlkOiBcImRqc2V0bWl4XCIsIHRpdGxlOiBcIkRKIE1peCBTdHVkaW9cIiwgaWNvbjogUmFkaW8sIGNvbG9yOiBcInRleHQtYW1iZXItMzAwXCIsIGRlZmF1bHRXaWR0aDogNzAwLCBkZWZhdWx0SGVpZ2h0OiA0NTAgfSxcbiAgeyBpZDogXCJnaXRodWItcHVibGlzaGVyXCIsIHRpdGxlOiBcIkdpdEh1YiBTeW5jXCIsIGljb246IEdpdGh1YiwgY29sb3I6IFwidGV4dC1zbGF0ZS0yMDBcIiwgZGVmYXVsdFdpZHRoOiA0MDAsIGRlZmF1bHRIZWlnaHQ6IDQ1MCB9LFxuICB7IGlkOiBcImFpY2hhdFwiLCB0aXRsZTogXCJBSSBQcm9kdWNlciBDaGF0XCIsIGljb246IEJvdCwgY29sb3I6IFwidGV4dC1jeWFuLTMwMFwiLCBkZWZhdWx0V2lkdGg6IDYyMCwgZGVmYXVsdEhlaWdodDogNTYwIH0sXG4gIHsgaWQ6IFwidm9pY2VzdHVkaW9cIiwgdGl0bGU6IFwiVm9pY2UgU3R1ZGlvXCIsIGljb246IE1pYywgY29sb3I6IFwidGV4dC1yb3NlLTMwMFwiLCBkZWZhdWx0V2lkdGg6IDYwMCwgZGVmYXVsdEhlaWdodDogNTIwIH0sXG5dO1xuXG5jb25zdCBLbm9iID0gKHsgbGFiZWwsIHZhbHVlLCBjb2xvciA9IFwiY3lhblwiLCBvbkNoYW5nZSB9OiB7IGxhYmVsOiBzdHJpbmcsIHZhbHVlOiBudW1iZXIsIGNvbG9yPzogc3RyaW5nLCBvbkNoYW5nZT86ICh2YWw6IG51bWJlcikgPT4gdm9pZCB9KSA9PiB7XG4gIGNvbnN0IHJvdGF0aW9uID0gKHZhbHVlIC8gMTAwKSAqIDI3MCAtIDEzNTtcbiAgY29uc3QgY29sb3JzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge1xuICAgIGN5YW46IFwiYmctY3lhbi00MDBcIiwgdmlvbGV0OiBcImJnLXZpb2xldC00MDBcIiwgXG4gICAgZW1lcmFsZDogXCJiZy1lbWVyYWxkLTQwMFwiLCBhbWJlcjogXCJiZy1hbWJlci00MDBcIixcbiAgICB5ZWxsb3c6IFwiYmcteWVsbG93LTQwMFwiLCByZWQ6IFwiYmctcmVkLTQwMFwiLCB0ZWFsOiBcImJnLXRlYWwtNDAwXCJcbiAgfTtcblxuICBjb25zdCBoYW5kbGVDbGljayA9ICgpID0+IHtcbiAgICBpZiAob25DaGFuZ2UpIHtcbiAgICAgIGNvbnN0IG5leHRWYWwgPSAodmFsdWUgKyAxMCkgPiAxMDAgPyAwIDogdmFsdWUgKyAxMDtcbiAgICAgIG9uQ2hhbmdlKG5leHRWYWwpO1xuICAgIH1cbiAgfTtcblxuICByZXR1cm4gKFxuICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBmbGV4LWNvbCBpdGVtcy1jZW50ZXIgZ2FwLTEgc2VsZWN0LW5vbmUgY3Vyc29yLXBvaW50ZXIgZ3JvdXBcIiBvbkNsaWNrPXtoYW5kbGVDbGlja30gdGl0bGU9XCJDbGljayB0byBhZGp1c3QgdmFsdWVcIj5cbiAgICAgIDxkaXYgY2xhc3NOYW1lPVwidy0xMCBoLTEwIHJvdW5kZWQtZnVsbCBiZy1zbGF0ZS04MDAgYm9yZGVyLVszcHhdIGJvcmRlci1zbGF0ZS05NTAgc2hhZG93LVtpbnNldF8wXzJweF80cHhfcmdiYSgwLDAsMCwwLjYpXSByZWxhdGl2ZSBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBncm91cC1ob3Zlcjpib3JkZXItc2xhdGUtNzAwIHRyYW5zaXRpb24tY29sb3JzXCI+XG4gICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImFic29sdXRlIGluc2V0LTAgcm91bmRlZC1mdWxsIHRyYW5zaXRpb24tdHJhbnNmb3JtIGR1cmF0aW9uLTEwMFwiIHN0eWxlPXt7IHRyYW5zZm9ybTogYHJvdGF0ZSgke3JvdGF0aW9ufWRlZylgIH19PlxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9e2BhYnNvbHV0ZSB0b3AtMC41IGxlZnQtMS8yIC10cmFuc2xhdGUteC0xLzIgdy0xIGgtMi41IHJvdW5kZWQtZnVsbCAke2NvbG9yc1tjb2xvcl0gfHwgY29sb3JzLmN5YW59IHNoYWRvdy1bMF8wXzVweF9jdXJyZW50Q29sb3JdYH0gLz5cbiAgICAgICAgIDwvZGl2PlxuICAgICAgPC9kaXY+XG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggZmxleC1jb2wgaXRlbXMtY2VudGVyXCI+XG4gICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtWzlweF0gZm9udC1ib2xkIHRyYWNraW5nLXdpZGVyIHRleHQtc2xhdGUtNDAwIHVwcGVyY2FzZVwiPntsYWJlbH08L3NwYW4+XG4gICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtWzhweF0gZm9udC1tb25vIHRleHQtY3lhbi00MDBcIj57dmFsdWV9JTwvc3Bhbj5cbiAgICAgIDwvZGl2PlxuICAgIDwvZGl2PlxuICApXG59XG5cbmNvbnN0IEdyaWRMYXVuY2hlciA9ICh7IHBhZHMsIGN1cnJlbnRTdGVwLCBpc1BsYXlpbmcsIG9uVG9nZ2xlUGFkIH06IGFueSkgPT4gKFxuICA8ZGl2IGNsYXNzTmFtZT1cInAtNiBoLWZ1bGwgZmxleCBmbGV4LWNvbCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgYmctc2xhdGUtOTAwLzk1IHJlbGF0aXZlIG92ZXJmbG93LWhpZGRlblwiPlxuICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJzb2x1dGUgaW5zZXQtMCBvcGFjaXR5LTEwIGJnLVtyYWRpYWwtZ3JhZGllbnQoY2lyY2xlX2F0X2NlbnRlcixfdmFyKC0tdHctZ3JhZGllbnQtc3RvcHMpKV0gZnJvbS1jeWFuLTQwMCB2aWEtdHJhbnNwYXJlbnQgdG8tdHJhbnNwYXJlbnQgcG9pbnRlci1ldmVudHMtbm9uZVwiIC8+XG4gICAgPGRpdiBjbGFzc05hbWU9XCJncmlkIGdyaWQtY29scy00IGdhcC00IHctZnVsbCBtYXgtdy1tZCBhc3BlY3Qtc3F1YXJlIHJlbGF0aXZlIHotMTBcIj5cbiAgICAgIHtwYWRzLm1hcCgocGFkOiBQYWQsIGlkeDogbnVtYmVyKSA9PiB7XG4gICAgICAgIGNvbnN0IGlzVHJpZ2dlcmVkID0gaXNQbGF5aW5nICYmIHBhZC5pc1BsYXlpbmcgJiYgKGN1cnJlbnRTdGVwICUgNCA9PT0gaWR4ICUgNCk7XG4gICAgICAgIGxldCBiYXNlQ29sb3IgPSBcImVtZXJhbGRcIjtcbiAgICAgICAgaWYgKHBhZC5jYXRlZ29yeSA9PT0gJ2Jhc3MnKSBiYXNlQ29sb3IgPSBcImluZGlnb1wiO1xuICAgICAgICBpZiAocGFkLmNhdGVnb3J5ID09PSAnc3ludGgnKSBiYXNlQ29sb3IgPSBcInZpb2xldFwiO1xuICAgICAgICBpZiAocGFkLmNhdGVnb3J5ID09PSAnZngnKSBiYXNlQ29sb3IgPSBcImFtYmVyXCI7XG5cbiAgICAgICAgY29uc3QgYmdDbGFzcyA9IHBhZC5pc1BsYXlpbmcgXG4gICAgICAgICAgPyBgYmctJHtiYXNlQ29sb3J9LTUwMCBib3JkZXItJHtiYXNlQ29sb3J9LTQwMCB0ZXh0LXdoaXRlIHNoYWRvdy1bMF8wXzIwcHhfcmdiYSh2YXIoLS0ke2Jhc2VDb2xvcn0tcmdiKSwwLjYpXWAgXG4gICAgICAgICAgOiBgYmctJHtiYXNlQ29sb3J9LTUwMC8xMCBib3JkZXItJHtiYXNlQ29sb3J9LTUwMC8zMCB0ZXh0LSR7YmFzZUNvbG9yfS00MDAgaG92ZXI6YmctJHtiYXNlQ29sb3J9LTUwMC8yMGA7XG5cbiAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICA8YnV0dG9uIFxuICAgICAgICAgICAga2V5PXtwYWQuaWR9IG9uQ2xpY2s9eygpID0+IG9uVG9nZ2xlUGFkKHBhZC5pZCl9XG4gICAgICAgICAgICBjbGFzc05hbWU9e2ByZWxhdGl2ZSByb3VuZGVkLTJ4bCBib3JkZXItMiB0cmFuc2l0aW9uLWFsbCBkdXJhdGlvbi03NSBmbGV4IGZsZXgtY29sIGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBnYXAtMiAke2JnQ2xhc3N9ICR7aXNUcmlnZ2VyZWQgPyAnYnJpZ2h0bmVzcy0xNTAgc2NhbGUtOTUnIDogJ3NjYWxlLTEwMCd9YH1cbiAgICAgICAgICA+XG4gICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC14cyBmb250LWJvbGQgZm9udC1tb25vIHRyYWNraW5nLXRpZ2h0ZXIgdGV4dC1jZW50ZXIgcHgtMSBsZWFkaW5nLXRpZ2h0XCI+e3BhZC5uYW1lfTwvc3Bhbj5cbiAgICAgICAgICAgICB7cGFkLmlzUGxheWluZyAmJiA8ZGl2IGNsYXNzTmFtZT1cImFic29sdXRlIHRvcC0yIHJpZ2h0LTIgdy0xLjUgaC0xLjUgcm91bmRlZC1mdWxsIGJnLXdoaXRlIGFuaW1hdGUtcHVsc2VcIiAvPn1cbiAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgKVxuICAgICAgfSl9XG4gICAgPC9kaXY+XG4gIDwvZGl2PlxuKTtcblxuY29uc3QgTWl4ZXJSYWNrID0gKHsgcGFkcywgbWFzdGVyVm9sdW1lLCBvblVwZGF0ZVZvbHVtZSwgb25VcGRhdGVQYW4sIG9uVG9nZ2xlTXV0ZSwgb25Ub2dnbGVTb2xvLCBvblVwZGF0ZU1hc3RlclZvbHVtZSB9OiBhbnkpID0+IChcbiAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGgtZnVsbCBiZy1zbGF0ZS05MDAgcC00IGdhcC0yIG92ZXJmbG93LXgtYXV0byBuby1zY3JvbGxiYXIgaXRlbXMtc3RhcnRcIj5cbiAgICB7cGFkcy5zbGljZSgwLCA4KS5tYXAoKHBhZDogUGFkKSA9PiAoXG4gICAgICAgPGRpdiBrZXk9e3BhZC5pZH0gY2xhc3NOYW1lPVwidy1bNzJweF0gZmxleC1zaHJpbmstMCBiZy1zbGF0ZS05NTAvODAgcm91bmRlZC14bCBib3JkZXIgYm9yZGVyLXNsYXRlLTgwMCBmbGV4IGZsZXgtY29sIGl0ZW1zLWNlbnRlciBweS00IGdhcC00IHNoYWRvdy14bFwiPlxuICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtWzEwcHhdIGZvbnQtYm9sZCB0ZXh0LXNsYXRlLTQwMCB0ZXh0LWNlbnRlciB1cHBlcmNhc2UgaC04IHB4LTEgb3ZlcmZsb3ctaGlkZGVuIGxlYWRpbmctdGlnaHQgZmxleCBpdGVtcy1jZW50ZXJcIj57cGFkLm5hbWV9PC9zcGFuPlxuICAgICAgICAgIDxLbm9iIGxhYmVsPVwiUEFOXCIgdmFsdWU9eyhwYWQucGFuICsgMSkgKiA1MH0gY29sb3I9e3BhZC5jYXRlZ29yeSA9PT0gJ2RydW1zJyA/ICdlbWVyYWxkJyA6IHBhZC5jYXRlZ29yeSA9PT0gJ2Jhc3MnID8gJ2luZGlnbycgOiAndmlvbGV0J30gLz5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXgtMSB3LWZ1bGwgaC00MCBmbGV4IGp1c3RpZnktY2VudGVyIHJlbGF0aXZlIHB5LTQgZ3JvdXBcIj5cbiAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImFic29sdXRlIHRvcC00IGJvdHRvbS00IHctMS41IGJnLXNsYXRlLTkwMCByb3VuZGVkLWZ1bGwgc2hhZG93LWlubmVyIGJvcmRlciBib3JkZXItc2xhdGUtODAwXCIgLz5cbiAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cInJhbmdlXCIgbWluPXswfSBtYXg9ezF9IHN0ZXA9ezAuMDF9IHZhbHVlPXtwYWQudm9sdW1lfSBvbkNoYW5nZT17ZSA9PiBvblVwZGF0ZVZvbHVtZShwYWQuaWQsIE51bWJlcihlLnRhcmdldC52YWx1ZSkpfVxuICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwiYWJzb2x1dGUgdG9wLTEvMiBsZWZ0LTEvMiAtdHJhbnNsYXRlLXgtMS8yIC10cmFuc2xhdGUteS0xLzIgdy0zMiBoLTYgb3BhY2l0eS0wIGN1cnNvci1wb2ludGVyIHotMjBcIiBzdHlsZT17eyB0cmFuc2Zvcm06ICdyb3RhdGUoLTkwZGVnKScgfX0gLz5cbiAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImFic29sdXRlIHctNyBoLTEwIGJnLXNsYXRlLTcwMCBib3JkZXItMiBib3JkZXItc2xhdGUtNjAwIHJvdW5kZWQgc2hhZG93LWxnIHBvaW50ZXItZXZlbnRzLW5vbmUgdHJhbnNpdGlvbi1hbGwgZHVyYXRpb24tMjAwIGdyb3VwLWhvdmVyOmJvcmRlci1zbGF0ZS00MDAgZ3JvdXAtaG92ZXI6c2NhbGUtMTA1IGdyb3VwLWhvdmVyOnNoYWRvdy1bMF8wXzEycHhfcmdiYSgyNTUsMjU1LDI1NSwwLjIpXSBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlclwiIHN0eWxlPXt7IGJvdHRvbTogYGNhbGMoJHtwYWQudm9sdW1lICogMTAwfSUgLSAyMHB4KWAgfX0+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ3LTQgaC0xIHJvdW5kZWQtZnVsbCBiZy1zbGF0ZS00MDAgdHJhbnNpdGlvbi1jb2xvcnMgZ3JvdXAtaG92ZXI6Ymctd2hpdGVcIiAvPlxuICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBnYXAtMSB3LWZ1bGwgcHgtMiBtdC1hdXRvXCI+XG4gICAgICAgICAgICAgPGJ1dHRvbiBvbkNsaWNrPXsoKSA9PiBvblRvZ2dsZU11dGUocGFkLmlkKX0gY2xhc3NOYW1lPXtgZmxleC0xIHRleHQtWzlweF0gZm9udC1ibGFjayBweS0xIHJvdW5kZWQgdHJhbnNpdGlvbi1jb2xvcnMgJHtwYWQubXV0ZWQgPyAnYmctcmVkLTUwMCB0ZXh0LXdoaXRlIHNoYWRvdy1bMF8wXzhweF8jZWY0NDQ0XScgOiAnYmctc2xhdGUtODAwIHRleHQtc2xhdGUtNTAwIGhvdmVyOmJnLXNsYXRlLTcwMCd9YH0+TTwvYnV0dG9uPlxuICAgICAgICAgICAgIDxidXR0b24gb25DbGljaz17KCkgPT4gb25Ub2dnbGVTb2xvKHBhZC5pZCl9IGNsYXNzTmFtZT17YGZsZXgtMSB0ZXh0LVs5cHhdIGZvbnQtYmxhY2sgcHktMSByb3VuZGVkIHRyYW5zaXRpb24tY29sb3JzICR7cGFkLnNvbG9lZCA/ICdiZy15ZWxsb3ctNDAwIHRleHQtc2xhdGUtOTAwIHNoYWRvdy1bMF8wXzhweF8jZmFjYzE1XScgOiAnYmctc2xhdGUtODAwIHRleHQtc2xhdGUtNTAwIGhvdmVyOmJnLXNsYXRlLTcwMCd9YH0+UzwvYnV0dG9uPlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgIDwvZGl2PlxuICAgICkpfVxuICAgIDxkaXYgY2xhc3NOYW1lPVwidy1weCBiZy1zbGF0ZS04MDAgbXgtMiBzZWxmLXN0cmV0Y2hcIiAvPlxuICAgIDxkaXYgY2xhc3NOYW1lPVwidy0yNCBmbGV4LXNocmluay0wIGJnLXNsYXRlLTk1MCByb3VuZGVkLXhsIGJvcmRlciBib3JkZXItY3lhbi05MDAgZmxleCBmbGV4LWNvbCBpdGVtcy1jZW50ZXIgcHktNCBnYXAtNCBzaGFkb3ctWzBfMF8yMHB4X3JnYmEoOCwxNDUsMTc4LDAuMTUpXSByZWxhdGl2ZSBvdmVyZmxvdy1oaWRkZW5cIj5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYnNvbHV0ZSBpbnNldC0wIGJnLWdyYWRpZW50LXRvLXQgZnJvbS1jeWFuLTkwMC8yMCB0by10cmFuc3BhcmVudCBwb2ludGVyLWV2ZW50cy1ub25lXCIgLz5cbiAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1bMTFweF0gZm9udC1ibGFjayB0ZXh0LWN5YW4tNDAwIHRyYWNraW5nLXdpZGVzdCByZWxhdGl2ZSB6LTEwXCI+TUFTVEVSPC9zcGFuPlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImgtMTBcIj48L2Rpdj4gXG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleC0xIHctZnVsbCBoLTQwIGZsZXgganVzdGlmeS1jZW50ZXIgcmVsYXRpdmUgcHktNCB6LTEwIGdyb3VwXCI+XG4gICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYnNvbHV0ZSB0b3AtNCBib3R0b20tNCB3LTIgYmctc2xhdGUtOTAwIHJvdW5kZWQtZnVsbCBzaGFkb3ctaW5uZXIgYm9yZGVyIGJvcmRlci1zbGF0ZS04MDBcIiAvPlxuICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwicmFuZ2VcIiBtaW49ezB9IG1heD17MX0gc3RlcD17MC4wMX0gdmFsdWU9e21hc3RlclZvbHVtZX0gb25DaGFuZ2U9e2UgPT4gb25VcGRhdGVNYXN0ZXJWb2x1bWUoTnVtYmVyKGUudGFyZ2V0LnZhbHVlKSl9XG4gICAgICAgICAgICAgICBjbGFzc05hbWU9XCJhYnNvbHV0ZSB0b3AtMS8yIGxlZnQtMS8yIC10cmFuc2xhdGUteC0xLzIgLXRyYW5zbGF0ZS15LTEvMiB3LTMyIGgtOCBvcGFjaXR5LTAgY3Vyc29yLXBvaW50ZXIgei0yMFwiIHN0eWxlPXt7IHRyYW5zZm9ybTogJ3JvdGF0ZSgtOTBkZWcpJyB9fSAvPlxuICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJzb2x1dGUgdy05IGgtMTIgYmctY3lhbi05NTAgYm9yZGVyLTIgYm9yZGVyLWN5YW4tNTAwIHJvdW5kZWQgc2hhZG93LVswXzBfMTVweF9yZ2JhKDM0LDIxMSwyMzgsMC41KV0gcG9pbnRlci1ldmVudHMtbm9uZSB0cmFuc2l0aW9uLWFsbCBkdXJhdGlvbi0yMDAgZ3JvdXAtaG92ZXI6Ym9yZGVyLWN5YW4tMzAwIGdyb3VwLWhvdmVyOnNjYWxlLTEwNSBncm91cC1ob3ZlcjpzaGFkb3ctWzBfMF8yMHB4X3JnYmEoMzQsMjExLDIzOCwwLjgpXSBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlclwiIHN0eWxlPXt7IGJvdHRvbTogYGNhbGMoJHttYXN0ZXJWb2x1bWUgKiAxMDB9JSAtIDI0cHgpYCB9fT5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInctNSBoLTEgcm91bmRlZC1mdWxsIGJnLWN5YW4tMzAwIHNoYWRvdy1bMF8wXzVweF8jMjJkM2VlXSB0cmFuc2l0aW9uLWNvbG9ycyBncm91cC1ob3ZlcjpiZy13aGl0ZVwiIC8+XG4gICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgIDwvZGl2PlxuICAgIDwvZGl2PlxuICA8L2Rpdj5cbik7XG5cbmNvbnN0IERydW1NYWNoaW5lID0gKCkgPT4ge1xuICBjb25zdCBbZ3JpZCwgc2V0R3JpZF0gPSB1c2VTdGF0ZShBcnJheSg0KS5maWxsKG51bGwpLm1hcCgoKSA9PiBBcnJheSgxNikuZmlsbChmYWxzZSkpKTtcbiAgY29uc3QgaW5zdHJ1bWVudHMgPSBbJ0tJQ0snLCAnU05BUkUnLCAnQ0xBUCcsICdISUhBVCddO1xuICBjb25zdCBjb2xvcnMgPSBbJ2JnLXJlZC01MDAnLCAnYmctZW1lcmFsZC01MDAnLCAnYmctYW1iZXItNTAwJywgJ2JnLWN5YW4tNTAwJ107XG5cbiAgY29uc3QgdG9nZ2xlU3RlcCA9ICh0cmFja0lkeDogbnVtYmVyLCBzdGVwSWR4OiBudW1iZXIpID0+IHtcbiAgICBjb25zdCBuZXdHcmlkID0gWy4uLmdyaWRdO1xuICAgIG5ld0dyaWRbdHJhY2tJZHhdW3N0ZXBJZHhdID0gIW5ld0dyaWRbdHJhY2tJZHhdW3N0ZXBJZHhdO1xuICAgIHNldEdyaWQobmV3R3JpZCk7XG4gIH07XG5cbiAgcmV0dXJuIChcbiAgICA8ZGl2IGNsYXNzTmFtZT1cImgtZnVsbCBiZy1zbGF0ZS05MDAgcC02IGZsZXggZmxleC1jb2wgZ2FwLTQgZm9udC1tb25vIG92ZXJmbG93LXktYXV0b1wiPlxuICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBqdXN0aWZ5LWJldHdlZW4gaXRlbXMtY2VudGVyIGJnLXNsYXRlLTk1MCBwLTMgcm91bmRlZC1sZyBib3JkZXItMiBib3JkZXItc2xhdGUtODAwIHNoYWRvdy1tZCBtYi0yXCI+XG4gICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJmb250LWJsYWNrIHRyYWNraW5nLXdpZGVzdCB0ZXh0LXJlZC00MDAgdGV4dC14bCBpdGFsaWMgZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTJcIj5cbiAgICAgICAgICAgPERpc2Mgc2l6ZT17MjB9IGNsYXNzTmFtZT1cImFuaW1hdGUtc3BpblwiIC8+IFRSLTgwOFxuICAgICAgICAgPC9zcGFuPlxuICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwicHgtMiBweS0xIGJnLXJlZC05NTAgdGV4dC1yZWQtNTAwIHRleHQtWzEwcHhdIHJvdW5kZWQgYm9yZGVyIGJvcmRlci1yZWQtOTAwXCI+UEFUVEVSTiBBPC9zcGFuPlxuICAgICAgIDwvZGl2PlxuICAgICAgIFxuICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBmbGV4LWNvbCBnYXAtMyBmbGV4LTEgYmctc2xhdGUtOTUwIHAtNCByb3VuZGVkLXhsIGJvcmRlciBib3JkZXItc2xhdGUtODAwXCI+XG4gICAgICAgICB7aW5zdHJ1bWVudHMubWFwKCh0cmFjaywgaSkgPT4gKFxuICAgICAgICAgICA8ZGl2IGtleT17dHJhY2t9IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC00XCI+XG4gICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ3LTE2IGZsZXgtc2hyaW5rLTAgdGV4dC1yaWdodFwiPlxuICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtWzEwcHhdIHRleHQtc2xhdGUtMzAwIGZvbnQtYm9sZFwiPnt0cmFja308L3NwYW4+XG4gICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4LTEgZ3JpZCBncmlkLWNvbHMtMTYgZ2FwLTFcIj5cbiAgICAgICAgICAgICAgICB7Z3JpZFtpXS5tYXAoKGlzQWN0aXZlLCBqKSA9PiAoXG4gICAgICAgICAgICAgICAgICAgPGJ1dHRvbiBcbiAgICAgICAgICAgICAgICAgICAgIGtleT17an0gXG4gICAgICAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiB0b2dnbGVTdGVwKGksIGopfVxuICAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPXtgaC0xMCByb3VuZGVkLXNtIHRyYW5zaXRpb24tYWxsIGJvcmRlciAke1xuICAgICAgICAgICAgICAgICAgICAgICBpc0FjdGl2ZSBcbiAgICAgICAgICAgICAgICAgICAgICAgICA/IGAke2NvbG9yc1tpXX0gYm9yZGVyLXdoaXRlLzIwIHNoYWRvdy1bMF8wXzEwcHhfY3VycmVudENvbG9yXWAgXG4gICAgICAgICAgICAgICAgICAgICAgICAgOiAnYmctc2xhdGUtODAwIGJvcmRlci1zbGF0ZS03MDAgaG92ZXI6Ymctc2xhdGUtNzAwJ1xuICAgICAgICAgICAgICAgICAgICAgfSAke2ogJSA0ID09PSAwICYmICFpc0FjdGl2ZSA/ICdvcGFjaXR5LTEwMCBiZy1zbGF0ZS03NTAnIDogJ29wYWNpdHktODAnfWB9IFxuICAgICAgICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICAgICAgKSl9XG4gICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgKSl9XG4gICAgICAgPC9kaXY+XG4gICAgPC9kaXY+XG4gICk7XG59O1xuXG5jb25zdCBGWENoYWluID0gKCkgPT4ge1xuICByZXR1cm4gKFxuICAgIDxkaXYgY2xhc3NOYW1lPVwiaC1mdWxsIGJnLXNsYXRlLTkwMCBwLTYgZmxleCBnYXAtNCBmb250LW1vbm8gb3ZlcmZsb3cteC1hdXRvIG5vLXNjcm9sbGJhciBpdGVtcy1jZW50ZXJcIj5cbiAgICAgICB7LyogUmV2ZXJiIFJhY2sgKi99XG4gICAgICAgPGRpdiBjbGFzc05hbWU9XCJtaW4tdy1bMTgwcHhdIGgtZnVsbCBiZy1zbGF0ZS05NTAgYm9yZGVyIGJvcmRlci1hbWJlci05MDAvNTAgcm91bmRlZC14bCBwLTQgZmxleCBmbGV4LWNvbCBpdGVtcy1jZW50ZXIgZ2FwLTYgc2hhZG93LVswXzBfMTVweF9yZ2JhKDIxNywxMTksNiwwLjEpXVwiPlxuICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1hbWJlci01MDAgZm9udC1ib2xkIHRyYWNraW5nLXdpZGVzdCB0ZXh0LXhzIGJvcmRlci1iIGJvcmRlci1hbWJlci05MDAvNTAgcGItMiB3LWZ1bGwgdGV4dC1jZW50ZXJcIj5HSE9TVCBSRVZFUkI8L3NwYW4+XG4gICAgICAgICA8S25vYiBsYWJlbD1cIkRFQ0FZXCIgdmFsdWU9ezc1fSBjb2xvcj1cImFtYmVyXCIgLz5cbiAgICAgICAgIDxLbm9iIGxhYmVsPVwiU0laRVwiIHZhbHVlPXs2MH0gY29sb3I9XCJhbWJlclwiIC8+XG4gICAgICAgICA8S25vYiBsYWJlbD1cIk1JWFwiIHZhbHVlPXs0MH0gY29sb3I9XCJhbWJlclwiIC8+XG4gICAgICAgPC9kaXY+XG5cbiAgICAgICB7LyogRGVsYXkgUmFjayAqL31cbiAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm1pbi13LVsxODBweF0gaC1mdWxsIGJnLXNsYXRlLTk1MCBib3JkZXIgYm9yZGVyLWN5YW4tOTAwLzUwIHJvdW5kZWQteGwgcC00IGZsZXggZmxleC1jb2wgaXRlbXMtY2VudGVyIGdhcC02IHNoYWRvdy1bMF8wXzE1cHhfcmdiYSgzNCwyMTEsMjM4LDAuMSldXCI+XG4gICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LWN5YW4tNTAwIGZvbnQtYm9sZCB0cmFja2luZy13aWRlc3QgdGV4dC14cyBib3JkZXItYiBib3JkZXItY3lhbi05MDAvNTAgcGItMiB3LWZ1bGwgdGV4dC1jZW50ZXJcIj5FQ0hPIERFTEFZPC9zcGFuPlxuICAgICAgICAgPEtub2IgbGFiZWw9XCJUSU1FXCIgdmFsdWU9ezMwfSBjb2xvcj1cImN5YW5cIiAvPlxuICAgICAgICAgPEtub2IgbGFiZWw9XCJGRUVEQkFDS1wiIHZhbHVlPXs2NX0gY29sb3I9XCJjeWFuXCIgLz5cbiAgICAgICAgIDxLbm9iIGxhYmVsPVwiTUlYXCIgdmFsdWU9ezUwfSBjb2xvcj1cImN5YW5cIiAvPlxuICAgICAgIDwvZGl2PlxuXG4gICAgICAgey8qIFNhdHVyYXRpb24gUmFjayAqL31cbiAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm1pbi13LVsxODBweF0gaC1mdWxsIGJnLXNsYXRlLTk1MCBib3JkZXIgYm9yZGVyLXJlZC05MDAvNTAgcm91bmRlZC14bCBwLTQgZmxleCBmbGV4LWNvbCBpdGVtcy1jZW50ZXIgZ2FwLTYgc2hhZG93LVswXzBfMTVweF9yZ2JhKDIzOSw2OCw2OCwwLjEpXVwiPlxuICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1yZWQtNTAwIGZvbnQtYm9sZCB0cmFja2luZy13aWRlc3QgdGV4dC14cyBib3JkZXItYiBib3JkZXItcmVkLTkwMC81MCBwYi0yIHctZnVsbCB0ZXh0LWNlbnRlclwiPlNBVFVSQVRPUjwvc3Bhbj5cbiAgICAgICAgIDxLbm9iIGxhYmVsPVwiRFJJVkVcIiB2YWx1ZT17ODV9IGNvbG9yPVwicmVkXCIgLz5cbiAgICAgICAgIDxLbm9iIGxhYmVsPVwiQ09MT1JcIiB2YWx1ZT17NDV9IGNvbG9yPVwicmVkXCIgLz5cbiAgICAgICAgIDxLbm9iIGxhYmVsPVwiTUlYXCIgdmFsdWU9ezEwMH0gY29sb3I9XCJyZWRcIiAvPlxuICAgICAgIDwvZGl2PlxuICAgIDwvZGl2PlxuICApO1xufTtcblxuY29uc3QgTWFzdGVyT3NjaWxsb3Njb3BlID0gKCkgPT4ge1xuICBjb25zdCBjYW52YXNSZWYgPSB1c2VSZWY8SFRNTENhbnZhc0VsZW1lbnQ+KG51bGwpO1xuICBjb25zdCBbdmlld01vZGUsIHNldFZpZXdNb2RlXSA9IHVzZVN0YXRlPCdib3RoJyB8ICdmZnQnIHwgJ29zY2lsbG9zY29wZSc+KCdib3RoJyk7XG5cbiAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICBjb25zdCBjYW52YXMgPSBjYW52YXNSZWYuY3VycmVudDtcbiAgICBpZighY2FudmFzKSByZXR1cm47XG4gICAgY29uc3QgY3R4ID0gY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG4gICAgaWYoIWN0eCkgcmV0dXJuO1xuICAgIGxldCBhbmltYXRpb25JZDogbnVtYmVyO1xuXG4gICAgY29uc3QgdGltZUJ1ZmZlciA9IG5ldyBVaW50OEFycmF5KDEyOCk7XG4gICAgY29uc3QgZnJlcUJ1ZmZlciA9IG5ldyBVaW50OEFycmF5KDY0KTtcblxuICAgIGNvbnN0IGRyYXcgPSAoKSA9PiB7XG4gICAgICBhdWRpb0VuZ2luZS5nZXRCeXRlVGltZURvbWFpbkRhdGEodGltZUJ1ZmZlcik7XG4gICAgICBhdWRpb0VuZ2luZS5nZXRCeXRlRnJlcXVlbmN5RGF0YShmcmVxQnVmZmVyKTtcblxuICAgICAgY3R4LmZpbGxTdHlsZSA9ICdyZ2JhKDIsIDYsIDIzLCAwLjQpJzsgXG4gICAgICBjdHguZmlsbFJlY3QoMCwgMCwgY2FudmFzLndpZHRoLCBjYW52YXMuaGVpZ2h0KTtcblxuICAgICAgY29uc3Qgd2lkdGggPSBjYW52YXMud2lkdGg7XG4gICAgICBjb25zdCBoZWlnaHQgPSBjYW52YXMuaGVpZ2h0O1xuXG4gICAgICAvLyBEcmF3IEZGVCBGcmVxdWVuY3kgU3BlY3RydW0gQW5hbHl6ZXJcbiAgICAgIGlmICh2aWV3TW9kZSA9PT0gJ2JvdGgnIHx8IHZpZXdNb2RlID09PSAnZmZ0Jykge1xuICAgICAgICBjb25zdCBiYXJXaWR0aCA9IHdpZHRoIC8gZnJlcUJ1ZmZlci5sZW5ndGg7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZnJlcUJ1ZmZlci5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIGNvbnN0IHZhbCA9IGZyZXFCdWZmZXJbaV0gLyAyNTU7XG4gICAgICAgICAgY29uc3QgYmFySGVpZ2h0ID0gdmFsICogKHZpZXdNb2RlID09PSAnYm90aCcgPyBoZWlnaHQgLyAyIC0gMTAgOiBoZWlnaHQgLSAyMCk7XG4gICAgICAgICAgXG4gICAgICAgICAgY29uc3QgZ3JhZGllbnQgPSBjdHguY3JlYXRlTGluZWFyR3JhZGllbnQoMCwgaGVpZ2h0LCAwLCAwKTtcbiAgICAgICAgICBncmFkaWVudC5hZGRDb2xvclN0b3AoMCwgJyMwNTk2NjknKTtcbiAgICAgICAgICBncmFkaWVudC5hZGRDb2xvclN0b3AoMC43LCAnIzM0ZDM5OScpO1xuICAgICAgICAgIGdyYWRpZW50LmFkZENvbG9yU3RvcCgxLCAnI2E3OGJmYScpO1xuXG4gICAgICAgICAgY3R4LmZpbGxTdHlsZSA9IGdyYWRpZW50O1xuICAgICAgICAgIGN0eC5zaGFkb3dCbHVyID0gODtcbiAgICAgICAgICBjdHguc2hhZG93Q29sb3IgPSAnIzM0ZDM5OSc7XG4gICAgICAgICAgY3R4LmZpbGxSZWN0KGkgKiBiYXJXaWR0aCArIDEsIGhlaWdodCAtICh2aWV3TW9kZSA9PT0gJ2JvdGgnID8gaGVpZ2h0IC8gMiA6IDApIC0gYmFySGVpZ2h0LCBiYXJXaWR0aCAtIDIsIGJhckhlaWdodCk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gRHJhdyBPc2NpbGxvc2NvcGUgV2F2ZWZvcm1cbiAgICAgIGlmICh2aWV3TW9kZSA9PT0gJ2JvdGgnIHx8IHZpZXdNb2RlID09PSAnb3NjaWxsb3Njb3BlJykge1xuICAgICAgICBjb25zdCBzdGFydFkgPSB2aWV3TW9kZSA9PT0gJ2JvdGgnID8gaGVpZ2h0ICogMC43NSA6IGhlaWdodCAvIDI7XG4gICAgICAgIGN0eC5iZWdpblBhdGgoKTtcbiAgICAgICAgY3R4LnN0cm9rZVN0eWxlID0gJyMyMmQzZWUnO1xuICAgICAgICBjdHgubGluZVdpZHRoID0gMjtcbiAgICAgICAgY3R4LnNoYWRvd0JsdXIgPSAxMjtcbiAgICAgICAgY3R4LnNoYWRvd0NvbG9yID0gJyMyMmQzZWUnO1xuXG4gICAgICAgIGNvbnN0IHNsaWNlV2lkdGggPSB3aWR0aCAvIHRpbWVCdWZmZXIubGVuZ3RoO1xuICAgICAgICBsZXQgeCA9IDA7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGltZUJ1ZmZlci5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIGNvbnN0IHYgPSB0aW1lQnVmZmVyW2ldIC8gMTI4LjA7XG4gICAgICAgICAgY29uc3QgeSA9IHN0YXJ0WSArICh2IC0gMSkgKiAoaGVpZ2h0IC8gMyk7XG4gICAgICAgICAgaWYgKGkgPT09IDApIGN0eC5tb3ZlVG8oeCwgeSk7XG4gICAgICAgICAgZWxzZSBjdHgubGluZVRvKHgsIHkpO1xuICAgICAgICAgIHggKz0gc2xpY2VXaWR0aDtcbiAgICAgICAgfVxuICAgICAgICBjdHguc3Ryb2tlKCk7XG4gICAgICB9XG5cbiAgICAgIGFuaW1hdGlvbklkID0gcmVxdWVzdEFuaW1hdGlvbkZyYW1lKGRyYXcpO1xuICAgIH07XG4gICAgZHJhdygpO1xuICAgIHJldHVybiAoKSA9PiBjYW5jZWxBbmltYXRpb25GcmFtZShhbmltYXRpb25JZCk7XG4gIH0sIFt2aWV3TW9kZV0pO1xuXG4gIHJldHVybiAoXG4gICAgPGRpdiBjbGFzc05hbWU9XCJ3LWZ1bGwgaC1mdWxsIGJnLXNsYXRlLTk1MCBwLTYgZmxleCBmbGV4LWNvbCBnYXAtNCBmb250LW1vbm8gdGV4dC14c1wiPlxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGp1c3RpZnktYmV0d2VlbiBpdGVtcy1jZW50ZXIgdGV4dC1lbWVyYWxkLTQwMCBib3JkZXItYiBib3JkZXItZW1lcmFsZC05MDAvNTAgcGItMlwiPlxuICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwiZm9udC1ib2xkIGZsZXggaXRlbXMtY2VudGVyIGdhcC0yXCI+XG4gICAgICAgICAgIDxBY3Rpdml0eSBzaXplPXsxNn0gLz4gTUFTVEVSIFNQRUNUUlVNIEFOQUxZWkVSICYgT1NDSUxMT1NDT1BFIChGRlQpXG4gICAgICAgICA8L3NwYW4+XG4gICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0yXCI+XG4gICAgICAgICAgIHtbJ2JvdGgnLCAnZmZ0JywgJ29zY2lsbG9zY29wZSddLm1hcCgobSkgPT4gKFxuICAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgIGtleT17bX1cbiAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHNldFZpZXdNb2RlKG0gYXMgYW55KX1cbiAgICAgICAgICAgICAgIGNsYXNzTmFtZT17YHB4LTIuNSBweS0xIHJvdW5kZWQgdGV4dC1bMTBweF0gZm9udC1ib2xkIHVwcGVyY2FzZSB0cmFuc2l0aW9uLWFsbCAke1xuICAgICAgICAgICAgICAgICB2aWV3TW9kZSA9PT0gbSBcbiAgICAgICAgICAgICAgICAgICA/ICdiZy1lbWVyYWxkLTYwMCB0ZXh0LXdoaXRlIHNoYWRvdy1bMF8wXzEwcHhfIzA1OTY2OV0nIFxuICAgICAgICAgICAgICAgICAgIDogJ2JnLXNsYXRlLTkwMCB0ZXh0LXNsYXRlLTQwMCBob3ZlcjpiZy1zbGF0ZS04MDAnXG4gICAgICAgICAgICAgICB9YH1cbiAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICB7bX1cbiAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgKSl9XG4gICAgICAgICA8L2Rpdj5cbiAgICAgIDwvZGl2PlxuICAgICAgPGNhbnZhcyByZWY9e2NhbnZhc1JlZn0gd2lkdGg9ezgwMH0gaGVpZ2h0PXs0MDB9IGNsYXNzTmFtZT1cInctZnVsbCBmbGV4LTEgcm91bmRlZC14bCBib3JkZXIgYm9yZGVyLXNsYXRlLTgwMCBiZy1bIzAyMDYxN10gc2hhZG93LWlubmVyXCIgLz5cbiAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBqdXN0aWZ5LWJldHdlZW4gdGV4dC1bOXB4XSB0ZXh0LXNsYXRlLTUwMCBmb250LWJvbGQgcHgtMVwiPlxuICAgICAgICA8c3Bhbj42MEh6IChTVUIpPC9zcGFuPlxuICAgICAgICA8c3Bhbj4yNTBIeiAoQkFTUyk8L3NwYW4+XG4gICAgICAgIDxzcGFuPjFrSHogKE1JRCk8L3NwYW4+XG4gICAgICAgIDxzcGFuPjRrSHogKFBSRVNFTkNFKTwvc3Bhbj5cbiAgICAgICAgPHNwYW4+MTZrSHogKEFJUik8L3NwYW4+XG4gICAgICA8L2Rpdj5cbiAgICA8L2Rpdj5cbiAgKTtcbn07XG5cbmNvbnN0IEdyYW51bGFyU3ludGggPSAoKSA9PiAoXG4gIDxkaXYgY2xhc3NOYW1lPVwicC01IGJnLXNsYXRlLTkwMCBoLWZ1bGwgZmxleCBmbGV4LWNvbCBnYXAtNSB0ZXh0LXNsYXRlLTIwMCBmb250LW1vbm8gdGV4dC14c1wiPlxuICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXgganVzdGlmeS1iZXR3ZWVuIGl0ZW1zLWNlbnRlciBiZy1zbGF0ZS05NTAgcC0zIHJvdW5kZWQtbGcgYm9yZGVyIGJvcmRlci1zbGF0ZS04MDAgc2hhZG93LW1kXCI+XG4gICAgICAgPHNwYW4gY2xhc3NOYW1lPVwiZm9udC1ib2xkIHRyYWNraW5nLXdpZGVzdCB0ZXh0LXZpb2xldC0zMDBcIj5HUkFJTl9FTkdJTkUgVjI8L3NwYW4+XG4gICAgICAgPHNwYW4gY2xhc3NOYW1lPVwicHgtMiBweS0wLjUgYmctdmlvbGV0LTUwMC8yMCB0ZXh0LXZpb2xldC00MDAgcm91bmRlZC1zbVwiPkFDVElWRSBFTkdJTkU8L3NwYW4+XG4gICAgIDwvZGl2PlxuICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXgtMSByZWxhdGl2ZSBiZy1zbGF0ZS05NTAgcm91bmRlZC1sZyBib3JkZXIgYm9yZGVyLXNsYXRlLTgwMCBvdmVyZmxvdy1oaWRkZW4gZ3JvdXAgc2hhZG93LWlubmVyXCI+XG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJzb2x1dGUgaW5zZXQtMCBvcGFjaXR5LTQwIGJnLVtyZXBlYXRpbmctbGluZWFyLWdyYWRpZW50KDkwZGVnLHRyYW5zcGFyZW50LHRyYW5zcGFyZW50XzJweCwjNGMxZDk1XzJweCwjNGMxZDk1XzRweCldXCIgLz5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYnNvbHV0ZSBpbnNldC0wIGJnLWdyYWRpZW50LXRvLWIgZnJvbS10cmFuc3BhcmVudCB2aWEtdmlvbGV0LTkwMC8yMCB0by10cmFuc3BhcmVudFwiIC8+XG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJzb2x1dGUgdG9wLTAgYm90dG9tLTAgdy0zMiBiZy12aW9sZXQtNTAwLzMwIGJvcmRlci14LTIgYm9yZGVyLXZpb2xldC00MDAgY3Vyc29yLWV3LXJlc2l6ZSBsZWZ0LTEvMyBzaGFkb3ctWzBfMF8yMHB4X3JnYmEoMTM5LDkyLDI0NiwwLjYpXSBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBiYWNrZHJvcC1ibHVyLVsxcHhdXCI+XG4gICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiaC04IHctMSBiZy12aW9sZXQtMzAwIHJvdW5kZWQtZnVsbCBvcGFjaXR5LTUwXCIgLz5cbiAgICAgICAgPC9kaXY+XG4gICAgIDwvZGl2PlxuICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXgganVzdGlmeS1iZXR3ZWVuIGdhcC0yIHAtNCBiZy1zbGF0ZS05NTAgcm91bmRlZC1sZyBib3JkZXIgYm9yZGVyLXNsYXRlLTgwMFwiPlxuICAgICAgIDxLbm9iIGxhYmVsPVwiUE9TSVRJT05cIiB2YWx1ZT17MzN9IGNvbG9yPVwidmlvbGV0XCIgLz5cbiAgICAgICA8S25vYiBsYWJlbD1cIlNJWkVcIiB2YWx1ZT17NDV9IGNvbG9yPVwidmlvbGV0XCIgLz5cbiAgICAgICA8S25vYiBsYWJlbD1cIkRFTlNJVFlcIiB2YWx1ZT17ODB9IGNvbG9yPVwidmlvbGV0XCIgLz5cbiAgICAgICA8S25vYiBsYWJlbD1cIlBJVENIXCIgdmFsdWU9ezUwfSBjb2xvcj1cInZpb2xldFwiIC8+XG4gICAgICAgPEtub2IgbGFiZWw9XCJTUFJFQURcIiB2YWx1ZT17MjB9IGNvbG9yPVwidmlvbGV0XCIgLz5cbiAgICAgPC9kaXY+XG4gIDwvZGl2PlxuKTtcblxuY29uc3QgQWNpZEJveFN5bnRoID0gKCkgPT4gKFxuICA8ZGl2IGNsYXNzTmFtZT1cInAtNiBiZy1zbGF0ZS05MDAgaC1mdWxsIGZsZXggZmxleC1jb2wgZ2FwLTYgZm9udC1tb25vIHJlbGF0aXZlIG92ZXJmbG93LWhpZGRlblwiPlxuICAgICA8ZGl2IGNsYXNzTmFtZT1cImFic29sdXRlIC10b3AtMTAgLXJpZ2h0LTEwIHctNDAgaC00MCBiZy15ZWxsb3ctNTAwLzUgYmx1ci0zeGwgcm91bmRlZC1mdWxsIHBvaW50ZXItZXZlbnRzLW5vbmVcIiAvPlxuICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXgganVzdGlmeS1iZXR3ZWVuIGl0ZW1zLWNlbnRlciBiZy1zbGF0ZS05NTAgcC00IHJvdW5kZWQteGwgYm9yZGVyLTIgYm9yZGVyLXNsYXRlLTgwMCBzaGFkb3ctbGdcIj5cbiAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0zXCI+XG4gICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInctMyBoLTMgcm91bmRlZC1mdWxsIGJnLXJlZC01MDAgc2hhZG93LVswXzBfMTBweF8jZWY0NDQ0XSBhbmltYXRlLXB1bHNlXCIgLz5cbiAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQteWVsbG93LTQwMCBmb250LWJsYWNrIHRleHQtMnhsIHRyYWNraW5nLXdpZGVzdCBpdGFsaWNcIj5UQi0zMDNYPC9zcGFuPlxuICAgICAgIDwvZGl2PlxuICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBnYXAtMiBwLTEgYmctc2xhdGUtOTAwIHJvdW5kZWQtbGcgYm9yZGVyIGJvcmRlci1zbGF0ZS04MDBcIj5cbiAgICAgICAgICA8YnV0dG9uIGNsYXNzTmFtZT1cInB4LTQgcHktMS41IGJnLXllbGxvdy01MDAgdGV4dC1zbGF0ZS05NTAgdGV4dC14cyByb3VuZGVkIGZvbnQtYmxhY2sgc2hhZG93LXNtXCI+U0FXPC9idXR0b24+XG4gICAgICAgICAgPGJ1dHRvbiBjbGFzc05hbWU9XCJweC00IHB5LTEuNSBiZy1zbGF0ZS04MDAgdGV4dC1zbGF0ZS00MDAgdGV4dC14cyByb3VuZGVkIGZvbnQtYm9sZCBob3ZlcjpiZy1zbGF0ZS03MDBcIj5TUVU8L2J1dHRvbj5cbiAgICAgICA8L2Rpdj5cbiAgICAgPC9kaXY+XG4gICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBqdXN0aWZ5LWJldHdlZW4gcHgtMiBiZy1zbGF0ZS05NTAvNTAgcC00IHJvdW5kZWQteGwgYm9yZGVyIGJvcmRlci1zbGF0ZS04MDAgYmFja2Ryb3AtYmx1ci1zbVwiPlxuICAgICAgIDxLbm9iIGxhYmVsPVwiVFVOSU5HXCIgdmFsdWU9ezUwfSBjb2xvcj1cInllbGxvd1wiIC8+XG4gICAgICAgPEtub2IgbGFiZWw9XCJDVVRPRkZcIiB2YWx1ZT17NzV9IGNvbG9yPVwieWVsbG93XCIgLz5cbiAgICAgICA8S25vYiBsYWJlbD1cIlJFU09OQU5DRVwiIHZhbHVlPXs4MH0gY29sb3I9XCJ5ZWxsb3dcIiAvPlxuICAgICAgIDxLbm9iIGxhYmVsPVwiRU5WIE1PRFwiIHZhbHVlPXs2MH0gY29sb3I9XCJ5ZWxsb3dcIiAvPlxuICAgICAgIDxLbm9iIGxhYmVsPVwiREVDQVlcIiB2YWx1ZT17NDB9IGNvbG9yPVwieWVsbG93XCIgLz5cbiAgICAgICA8S25vYiBsYWJlbD1cIkFDQ0VOVFwiIHZhbHVlPXs5MH0gY29sb3I9XCJ5ZWxsb3dcIiAvPlxuICAgICA8L2Rpdj5cbiAgICAgPGRpdiBjbGFzc05hbWU9XCJtdC1hdXRvIGJnLXNsYXRlLTk1MCBwLTQgcm91bmRlZC14bCBib3JkZXIgYm9yZGVyLXNsYXRlLTgwMFwiPlxuICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZ3JpZCBncmlkLWNvbHMtMTYgZ2FwLTFcIj5cbiAgICAgICAgIHtBcnJheS5mcm9tKHtsZW5ndGg6IDE2fSkubWFwKChfLCBpKSA9PiAoXG4gICAgICAgICAgIDxkaXYga2V5PXtpfSBjbGFzc05hbWU9XCJmbGV4IGZsZXgtY29sIGdhcC0yIGl0ZW1zLWNlbnRlciBncm91cFwiPlxuICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPXtgdy1mdWxsIGFzcGVjdC1zcXVhcmUgcm91bmRlZC1zbSBjdXJzb3ItcG9pbnRlciB0cmFuc2l0aW9uLWNvbG9ycyAke2klND09PTAgPyAnYmctc2xhdGUtNzAwJyA6ICdiZy1zbGF0ZS04MDAnfSBob3ZlcjpiZy15ZWxsb3ctNDAwLzgwICR7aT09PTJ8fGk9PT03fHxpPT09MTAgPyAnYmcteWVsbG93LTUwMCBzaGFkb3ctWzBfMF84cHhfI2VhYjMwOF0nIDogJyd9YH0gLz5cbiAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LVs5cHhdIHRleHQtc2xhdGUtNjAwIGZvbnQtYm9sZCBncm91cC1ob3Zlcjp0ZXh0LXllbGxvdy00MDBcIj57aSsxfTwvc3Bhbj5cbiAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICApKX1cbiAgICAgICA8L2Rpdj5cbiAgICAgPC9kaXY+XG4gIDwvZGl2PlxuKTtcblxuY29uc3QgQUlUcmFja0dlbmVyYXRvciA9ICh7IHNldEJwbSwgc2V0UGFkcyB9OiB7IHNldEJwbT86IChicG06IG51bWJlcikgPT4gdm9pZDsgc2V0UGFkcz86IFJlYWN0LkRpc3BhdGNoPFJlYWN0LlNldFN0YXRlQWN0aW9uPFBhZFtdPj4gfSkgPT4ge1xuICBjb25zdCBbcHJvbXB0VGV4dCwgc2V0UHJvbXB0VGV4dF0gPSB1c2VTdGF0ZShcIkN5YmVycHVuayBzeW50aHdhdmUgdHJhY2sgd2l0aCBoZWF2eSBzaWRlY2hhaW4gYmFzcyBhbmQgbHVzaCA4MHMgcGFkcyBhdCAxMjAgQlBNXCIpO1xuICBjb25zdCBbaXNHZW5lcmF0aW5nLCBzZXRJc0dlbmVyYXRpbmddID0gdXNlU3RhdGUoZmFsc2UpO1xuICBjb25zdCBbbGxtT3V0cHV0LCBzZXRMbG1PdXRwdXRdID0gdXNlU3RhdGU8c3RyaW5nPihcIlwiKTtcbiAgY29uc3QgW3BhcnNlZERhdGEsIHNldFBhcnNlZERhdGFdID0gdXNlU3RhdGU8YW55PihudWxsKTtcblxuICBjb25zdCBoYW5kbGVHZW1pbmlHZW5lcmF0ZSA9IGFzeW5jICgpID0+IHtcbiAgICBpZiAoIXByb21wdFRleHQudHJpbSgpKSByZXR1cm47XG4gICAgc2V0SXNHZW5lcmF0aW5nKHRydWUpO1xuICAgIHNldExsbU91dHB1dChcIkNvbm5lY3RpbmcgdG8gR2VtaW5pIEFQSS4uLlwiKTtcblxuICAgIHRyeSB7XG4gICAgICBjb25zdCBzeXN0ZW1Qcm9tcHQgPSBgWW91IGFyZSBhbiBleHBlcnQgbXVzaWMgcHJvZHVjZXIgYW5kIGF1ZGlvIGVuZ2luZWVyIGFzc2lzdGFudCBpbiBSZW1peCBPUy4gXG5BbmFseXplIHRoZSB1c2VyJ3MgcHJvbXB0IGFuZCBwcm9kdWNlIGEgSlNPTiByZXNwb25zZSB3aXRoIHRyYWNrIHNldHRpbmdzIGFuZCBzb3VuZCBkZXNpZ24gc3BlY3MuXG5PdXRwdXQgZm9ybWF0IE1VU1QgYmUgdmFsaWQgSlNPTiB3aXRoIHRoaXMgZXhhY3Qgc3RydWN0dXJlOlxue1xuICBcImdlbnJlXCI6IFwiR2VucmUgTmFtZVwiLFxuICBcImJwbVwiOiAxMjAsXG4gIFwia2V5XCI6IFwiQSBNaW5vclwiLFxuICBcInN0cnVjdHVyZVwiOiBbXCJJbnRyb1wiLCBcIkJ1aWxkXCIsIFwiRHJvcFwiLCBcIk91dHJvXCJdLFxuICBcInRyYWNrQWR2aWNlXCI6IFwiQ29uY2lzZSBtaXggYWR2aWNlXCIsXG4gIFwicGFkc1wiOiBbXG4gICAge1wibmFtZVwiOiBcIktpY2sgJiBTbmFyZVwiLCBcImNhdGVnb3J5XCI6IFwiZHJ1bXNcIiwgXCJ2b2x1bWVcIjogMC45fSxcbiAgICB7XCJuYW1lXCI6IFwiUGVyY3Vzc2lvblwiLCBcImNhdGVnb3J5XCI6IFwiZHJ1bXNcIiwgXCJ2b2x1bWVcIjogMC43NX0sXG4gICAge1wibmFtZVwiOiBcIlN1YiBCYXNzIExpbmVcIiwgXCJjYXRlZ29yeVwiOiBcImJhc3NcIiwgXCJ2b2x1bWVcIjogMC44NX0sXG4gICAge1wibmFtZVwiOiBcIlN5bnRoIFBhZFwiLCBcImNhdGVnb3J5XCI6IFwic3ludGhcIiwgXCJ2b2x1bWVcIjogMC43fVxuICBdXG59YDtcblxuICAgICAgLy8gU2VjdXJlIEFQSSBrZXkgcmV0cmlldmFsIGZvciBWaXRlL0FJIFN0dWRpbyBydW50aW1lXG4gICAgICBjb25zdCBhcGlLZXkgPSAoaW1wb3J0Lm1ldGEgYXMgYW55KS5lbnY/LlZJVEVfR0VNSU5JX0FQSV9LRVkgfHwgKHByb2Nlc3MuZW52IGFzIGFueSk/LlJFQUNUX0FQUF9HRU1JTklfQVBJX0tFWSB8fCBcIlwiO1xuXG4gICAgICBpZiAoIWFwaUtleSkge1xuICAgICAgICBzZXRMbG1PdXRwdXQoXCJFUlJPUjogTWlzc2luZyBBUEkgS2V5LiBQbGVhc2UgZW5zdXJlIEdFTUlOSV9BUElfS0VZIGlzIGNvbmZpZ3VyZWQgaW4geW91ciBlbnZpcm9ubWVudCBvciBzZWNyZXRzIHBhbmVsLlwiKTtcbiAgICAgICAgc2V0SXNHZW5lcmF0aW5nKGZhbHNlKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBhcGlVcmwgPSBgaHR0cHM6Ly9nZW5lcmF0aXZlbGFuZ3VhZ2UuZ29vZ2xlYXBpcy5jb20vdjFiZXRhL21vZGVscy9nZW1pbmktMi41LWZsYXNoOmdlbmVyYXRlQ29udGVudD9rZXk9JHthcGlLZXl9YDtcblxuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaChhcGlVcmwsIHtcbiAgICAgICAgbWV0aG9kOiBcIlBPU1RcIixcbiAgICAgICAgaGVhZGVyczogeyBcIkNvbnRlbnQtVHlwZVwiOiBcImFwcGxpY2F0aW9uL2pzb25cIiB9LFxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgY29udGVudHM6IFt7IHBhcnRzOiBbeyB0ZXh0OiBwcm9tcHRUZXh0IH1dIH1dLFxuICAgICAgICAgIHN5c3RlbUluc3RydWN0aW9uOiB7IHBhcnRzOiBbeyB0ZXh0OiBzeXN0ZW1Qcm9tcHQgfV0gfSxcbiAgICAgICAgICBnZW5lcmF0aW9uQ29uZmlnOiB7IHJlc3BvbnNlTWltZVR5cGU6IFwiYXBwbGljYXRpb24vanNvblwiIH1cbiAgICAgICAgfSlcbiAgICAgIH0pO1xuXG4gICAgICBjb25zdCBkYXRhID0gYXdhaXQgcmVzcG9uc2UuanNvbigpO1xuICAgICAgbGV0IHJhd0pzb24gPSBkYXRhLmNhbmRpZGF0ZXM/LlswXT8uY29udGVudD8ucGFydHM/LlswXT8udGV4dDtcblxuICAgICAgaWYgKHJhd0pzb24pIHtcbiAgICAgICAgcmF3SnNvbiA9IHJhd0pzb24ucmVwbGFjZSgvYGBganNvbi9nLCBcIlwiKS5yZXBsYWNlKC9gYGAvZywgXCJcIikudHJpbSgpO1xuXG4gICAgICAgIGNvbnN0IGZpcnN0QnJhY2UgPSByYXdKc29uLmluZGV4T2YoXCJ7XCIpO1xuICAgICAgICBjb25zdCBsYXN0QnJhY2UgPSByYXdKc29uLmxhc3RJbmRleE9mKFwifVwiKTtcbiAgICAgICAgaWYgKGZpcnN0QnJhY2UgIT09IC0xICYmIGxhc3RCcmFjZSAhPT0gLTEpIHtcbiAgICAgICAgICByYXdKc29uID0gcmF3SnNvbi5zdWJzdHJpbmcoZmlyc3RCcmFjZSwgbGFzdEJyYWNlICsgMSk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBwYXJzZWQgPSBKU09OLnBhcnNlKHJhd0pzb24pO1xuICAgICAgICBzZXRQYXJzZWREYXRhKHBhcnNlZCk7XG4gICAgICAgIHNldExsbU91dHB1dChKU09OLnN0cmluZ2lmeShwYXJzZWQsIG51bGwsIDIpKTtcblxuICAgICAgICBpZiAocGFyc2VkLmJwbSAmJiBzZXRCcG0pIHNldEJwbShwYXJzZWQuYnBtKTtcbiAgICAgICAgaWYgKHBhcnNlZC5wYWRzICYmIHNldFBhZHMpIHtcbiAgICAgICAgICBzZXRQYWRzKChwcmV2UGFkczogUGFkW10pID0+XG4gICAgICAgICAgICBwcmV2UGFkcy5tYXAoKHBhZCwgaWR4KSA9PiB7XG4gICAgICAgICAgICAgIGlmIChwYXJzZWQucGFkc1tpZHhdKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgIC4uLnBhZCxcbiAgICAgICAgICAgICAgICAgIG5hbWU6IHBhcnNlZC5wYWRzW2lkeF0ubmFtZSB8fCBwYWQubmFtZSxcbiAgICAgICAgICAgICAgICAgIGNhdGVnb3J5OiBwYXJzZWQucGFkc1tpZHhdLmNhdGVnb3J5IHx8IHBhZC5jYXRlZ29yeSxcbiAgICAgICAgICAgICAgICAgIHZvbHVtZTogcGFyc2VkLnBhZHNbaWR4XS52b2x1bWUgfHwgcGFkLnZvbHVtZSxcbiAgICAgICAgICAgICAgICAgIGlzUGxheWluZzogaWR4IDwgNCA/IHRydWUgOiBwYWQuaXNQbGF5aW5nXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICByZXR1cm4gcGFkO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzZXRMbG1PdXRwdXQoXCJGYWlsZWQgdG8gcmVjZWl2ZSBzdHJ1Y3R1cmVkIGNvbnRlbnQgZnJvbSBHZW1pbmkuXCIpO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoZXJyb3IpO1xuICAgICAgc2V0TGxtT3V0cHV0KGBFcnJvciBnZW5lcmF0aW5nIHdpdGggR2VtaW5pIEFQSTogJHtlcnJvci5tZXNzYWdlIHx8IGVycm9yfWApO1xuICAgIH0gZmluYWxseSB7XG4gICAgICBzZXRJc0dlbmVyYXRpbmcoZmFsc2UpO1xuICAgIH1cbiAgfTtcblxuICByZXR1cm4gKFxuICAgIDxkaXYgY2xhc3NOYW1lPVwicC01IGgtZnVsbCBmbGV4IGZsZXgtY29sIGdhcC00IGJnLXNsYXRlLTkwMCBmb250LW1vbm8gdGV4dC14cyB0ZXh0LXNsYXRlLTMwMCBvdmVyZmxvdy15LWF1dG9cIj5cbiAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1iZXR3ZWVuIGJvcmRlci1iIGJvcmRlci1mdWNoc2lhLTkwMC81MCBwYi0zXCI+XG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTIgdGV4dC1mdWNoc2lhLTQwMCBmb250LWJvbGQgdHJhY2tpbmctd2lkZXJcIj5cbiAgICAgICAgICA8Qm90IHNpemU9ezE4fSAvPlxuICAgICAgICAgIDxzcGFuPkdFTUlOSSBBSSBQUk9EVUNFUiBFTkdJTkU8L3NwYW4+XG4gICAgICAgIDwvZGl2PlxuICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJweC0yIHB5LTAuNSBiZy1mdWNoc2lhLTk1MCBib3JkZXIgYm9yZGVyLWZ1Y2hzaWEtODAwIHRleHQtZnVjaHNpYS0zMDAgdGV4dC1bMTBweF0gcm91bmRlZFwiPlxuICAgICAgICAgIGdlbWluaS0yLjUtZmxhc2hcbiAgICAgICAgPC9zcGFuPlxuICAgICAgPC9kaXY+XG5cbiAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBmbGV4LWNvbCBnYXAtMlwiPlxuICAgICAgICA8bGFiZWwgY2xhc3NOYW1lPVwidGV4dC1bMTBweF0gdGV4dC1zbGF0ZS00MDAgZm9udC1ib2xkIHVwcGVyY2FzZSB0cmFja2luZy13aWRlciBmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMS41XCI+XG4gICAgICAgICAgPFdhbmQyIHNpemU9ezEyfSBjbGFzc05hbWU9XCJ0ZXh0LWZ1Y2hzaWEtNDAwXCIgLz5cbiAgICAgICAgICBNdXNpYyBTdHlsZSBQcm9tcHRcbiAgICAgICAgPC9sYWJlbD5cbiAgICAgICAgPHRleHRhcmVhXG4gICAgICAgICAgdmFsdWU9e3Byb21wdFRleHR9XG4gICAgICAgICAgb25DaGFuZ2U9eyhlKSA9PiBzZXRQcm9tcHRUZXh0KGUudGFyZ2V0LnZhbHVlKX1cbiAgICAgICAgICByb3dzPXszfVxuICAgICAgICAgIGNsYXNzTmFtZT1cInctZnVsbCBiZy1zbGF0ZS05NTAgYm9yZGVyIGJvcmRlci1zbGF0ZS03MDAgcm91bmRlZC14bCBwLTMgdGV4dC1zbGF0ZS0xMDAgcmVzaXplLW5vbmUgZm9jdXM6Ym9yZGVyLWZ1Y2hzaWEtNTAwIGZvY3VzOnJpbmctMSBmb2N1czpyaW5nLWZ1Y2hzaWEtNTAwIGZvY3VzOm91dGxpbmUtbm9uZSBzaGFkb3ctaW5uZXIgbGVhZGluZy1yZWxheGVkIHRleHQteHNcIlxuICAgICAgICAgIHBsYWNlaG9sZGVyPVwiRGVzY3JpYmUgdGhlIGdlbnJlLCB0ZW1wbywgaW5zdHJ1bWVudHMsIGFuZCBtb29kLi4uXCJcbiAgICAgICAgLz5cbiAgICAgIDwvZGl2PlxuXG4gICAgICA8YnV0dG9uXG4gICAgICAgIG9uQ2xpY2s9e2hhbmRsZUdlbWluaUdlbmVyYXRlfVxuICAgICAgICBkaXNhYmxlZD17aXNHZW5lcmF0aW5nfVxuICAgICAgICBjbGFzc05hbWU9XCJ3LWZ1bGwgYmctZnVjaHNpYS02MDAgaG92ZXI6YmctZnVjaHNpYS01MDAgdGV4dC13aGl0ZSBmb250LWJsYWNrIHB5LTMgcm91bmRlZC14bCBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBnYXAtMiB0cmFuc2l0aW9uLWFsbCBkaXNhYmxlZDpvcGFjaXR5LTUwIHNoYWRvdy1bMF8wXzE1cHhfcmdiYSgxOTIsMzgsMjExLDAuMyldIGFjdGl2ZTpzY2FsZS1bMC45OV1cIlxuICAgICAgPlxuICAgICAgICB7aXNHZW5lcmF0aW5nID8gPFJlZnJlc2hDdyBzaXplPXsxNn0gY2xhc3NOYW1lPVwiYW5pbWF0ZS1zcGluXCIgLz4gOiA8U3BhcmtsZXMgc2l6ZT17MTZ9IC8+fVxuICAgICAgICB7aXNHZW5lcmF0aW5nID8gXCJHRU5FUkFUSU5HIFdJVEggR0VNSU5JLi4uXCIgOiBcIkdFTkVSQVRFIFRSQUNLICYgQVBQTFkgVE8gREFXXCJ9XG4gICAgICA8L2J1dHRvbj5cblxuICAgICAge3BhcnNlZERhdGEgJiYgKFxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImdyaWQgZ3JpZC1jb2xzLTMgZ2FwLTIgYmctc2xhdGUtOTUwIHAtMyByb3VuZGVkLWxnIGJvcmRlciBib3JkZXItc2xhdGUtODAwXCI+XG4gICAgICAgICAgPGRpdj5cbiAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtWzlweF0gdGV4dC1zbGF0ZS01MDAgYmxvY2tcIj5HRU5SRTwvc3Bhbj5cbiAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cImZvbnQtYm9sZCB0ZXh0LWZ1Y2hzaWEtMzAwXCI+e3BhcnNlZERhdGEuZ2VucmUgfHwgXCJDdXN0b21cIn08L3NwYW4+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPGRpdj5cbiAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtWzlweF0gdGV4dC1zbGF0ZS01MDAgYmxvY2tcIj5URU1QTzwvc3Bhbj5cbiAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cImZvbnQtYm9sZCB0ZXh0LWN5YW4tMzAwXCI+e3BhcnNlZERhdGEuYnBtIHx8IDEyMH0gQlBNPC9zcGFuPlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDxkaXY+XG4gICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LVs5cHhdIHRleHQtc2xhdGUtNTAwIGJsb2NrXCI+S0VZPC9zcGFuPlxuICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwiZm9udC1ib2xkIHRleHQtZW1lcmFsZC0zMDBcIj57cGFyc2VkRGF0YS5rZXkgfHwgXCJBIE1pbm9yXCJ9PC9zcGFuPlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICA8L2Rpdj5cbiAgICAgICl9XG5cbiAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleC0xIGZsZXggZmxleC1jb2wgZ2FwLTEgbWluLWgtWzEyMHB4XVwiPlxuICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LVsxMHB4XSB0ZXh0LXNsYXRlLTUwMCBmb250LWJvbGQgZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTFcIj5cbiAgICAgICAgICA8VGVybWluYWwgc2l6ZT17MTJ9IC8+IEdFTUlOSSBSRVNQT05TRSBEQVRBXG4gICAgICAgIDwvc3Bhbj5cbiAgICAgICAgPHByZSBjbGFzc05hbWU9XCJmbGV4LTEgYmctc2xhdGUtOTUwIGJvcmRlciBib3JkZXItc2xhdGUtODAwIHJvdW5kZWQtbGcgcC0zIHRleHQtWzEwcHhdIHRleHQtZW1lcmFsZC00MDAgb3ZlcmZsb3cteC1hdXRvIG92ZXJmbG93LXktYXV0byBzaGFkb3ctaW5uZXIgbGVhZGluZy1ub3JtYWwgZm9udC1tb25vXCI+XG4gICAgICAgICAge2xsbU91dHB1dCB8fCBcIi8vIFByZXNzICdHRU5FUkFURSBUUkFDSycgdG8gY2FsbCB0aGUgR2VtaW5pIEFQSS5cIn1cbiAgICAgICAgPC9wcmU+XG4gICAgICA8L2Rpdj5cbiAgICA8L2Rpdj5cbiAgKTtcbn07XG5cbmNvbnN0IFN0ZXBTZXF1ZW5jZXIgPSAoKSA9PiAoXG4gIDxkaXYgY2xhc3NOYW1lPVwiaC1mdWxsIGJnLXNsYXRlLTkwMCBwLTQgZmxleCBmbGV4LWNvbCBnYXAtMiBmb250LW1vbm9cIj5cbiAgICAge1snS0lDSycsICdTTkFSRScsICdISUhBVCcsICdQRVJDJywgJ0JBU1MnLCAnU1lOVEgnXS5tYXAoKHRyYWNrLCBpKSA9PiAoXG4gICAgICAgPGRpdiBrZXk9e3RyYWNrfSBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtNCBwLTIgYmctc2xhdGUtOTUwLzUwIHJvdW5kZWQgYm9yZGVyIGJvcmRlci1zbGF0ZS04MDBcIj5cbiAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwidy0xNiBmbGV4LXNocmluay0wIGZsZXggaXRlbXMtY2VudGVyIGdhcC0yXCI+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT17YHctMiBoLTIgcm91bmRlZC1mdWxsICR7aT09PTA/J2JnLWVtZXJhbGQtNDAwJzppPT09ND8nYmctaW5kaWdvLTQwMCc6J2JnLXNsYXRlLTUwMCd9YH0gLz5cbiAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtWzEwcHhdIHRleHQtc2xhdGUtMzAwIGZvbnQtYm9sZFwiPnt0cmFja308L3NwYW4+XG4gICAgICAgICA8L2Rpdj5cbiAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleC0xIGdyaWQgZ3JpZC1jb2xzLTE2IGdhcC0xXCI+XG4gICAgICAgICAgICB7QXJyYXkuZnJvbSh7bGVuZ3RoOiAxNn0pLm1hcCgoXywgaikgPT4ge1xuICAgICAgICAgICAgICAgY29uc3QgYWN0aXZlID0gTWF0aC5yYW5kb20oKSA+IDAuODtcbiAgICAgICAgICAgICAgIHJldHVybiA8ZGl2IGtleT17an0gY2xhc3NOYW1lPXtgaC04IHJvdW5kZWQtc20gJHthY3RpdmUgPyAoaT09PTA/J2JnLWVtZXJhbGQtNTAwJzppPT09ND8nYmctaW5kaWdvLTUwMCc6J2JnLXNsYXRlLTQwMCcpIDogJ2JnLXNsYXRlLTgwMCd9ICR7aiU0PT09MCA/ICdvcGFjaXR5LTEwMCcgOiAnb3BhY2l0eS03MCd9YH0gLz5cbiAgICAgICAgICAgIH0pfVxuICAgICAgICAgPC9kaXY+XG4gICAgICAgPC9kaXY+XG4gICAgICkpfVxuICA8L2Rpdj5cbik7XG5cbmNvbnN0IE1vZHVsYXJQYXRjaEJheSA9ICgpID0+IChcbiAgPGRpdiBjbGFzc05hbWU9XCJoLWZ1bGwgYmctc2xhdGUtOTAwIHAtNiByZWxhdGl2ZSBvdmVyZmxvdy1oaWRkZW4gZmxleCBmbGV4LWNvbCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXJcIj5cbiAgICAgPE5ldHdvcmsgc2l6ZT17MTIwfSBjbGFzc05hbWU9XCJ0ZXh0LXNsYXRlLTgwMC81MCBhYnNvbHV0ZVwiIC8+XG4gICAgIDxkaXYgY2xhc3NOYW1lPVwiZ3JpZCBncmlkLWNvbHMtNCBnYXAtOCB6LTEwXCI+XG4gICAgICAgIHtBcnJheS5mcm9tKHtsZW5ndGg6IDEyfSkubWFwKChfLCBpKSA9PiAoXG4gICAgICAgICAgIDxkaXYga2V5PXtpfSBjbGFzc05hbWU9XCJ3LTE2IGgtMTYgcm91bmRlZC1mdWxsIGJnLXNsYXRlLTk1MCBib3JkZXItNCBib3JkZXItc2xhdGUtODAwIGZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIHNoYWRvdy1pbm5lciByZWxhdGl2ZSBncm91cFwiPlxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT17YHctNiBoLTYgcm91bmRlZC1mdWxsICR7aSUzPT09MCA/ICdiZy1vcmFuZ2UtNTAwIHNoYWRvdy1bMF8wXzE1cHhfI2Y5NzMxNl0nIDogJ2JnLXNsYXRlLTkwMCd9IGlubmVyLXNoYWRvdy1sZ2B9IC8+XG4gICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cImFic29sdXRlIC1ib3R0b20tNSB0ZXh0LVs5cHhdIHRleHQtc2xhdGUtNTAwIGZvbnQtbW9ubyBmb250LWJvbGQgd2hpdGVzcGFjZS1ub3dyYXBcIj5OT0RFXzB7aSsxfTwvc3Bhbj5cbiAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICkpfVxuICAgICA8L2Rpdj5cbiAgPC9kaXY+XG4pO1xuXG5jb25zdCBYWVBlcmZvcm1hbmNlUGFkID0gKCkgPT4gKFxuICA8ZGl2IGNsYXNzTmFtZT1cImgtZnVsbCBiZy1zbGF0ZS05MDAgcC02IGZsZXggZmxleC1jb2wgZ2FwLTQgaXRlbXMtY2VudGVyIHJlbGF0aXZlXCI+XG4gICAgIDxkaXYgY2xhc3NOYW1lPVwidy1mdWxsIGZsZXgtMSBtYXgtdy1zbSBib3JkZXItMiBib3JkZXItc2xhdGUtNzAwIGJnLXNsYXRlLTk1MCByb3VuZGVkLTJ4bCByZWxhdGl2ZSBvdmVyZmxvdy1oaWRkZW4gc2hhZG93LWlubmVyIGN1cnNvci1jcm9zc2hhaXIgZ3JvdXBcIj5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYnNvbHV0ZSBpbnNldC0wIGdyaWQgZ3JpZC1jb2xzLTQgZ3JpZC1yb3dzLTQgb3BhY2l0eS0yMFwiPlxuICAgICAgICAgICB7QXJyYXkuZnJvbSh7bGVuZ3RoOiAxNn0pLm1hcCgoXyxpKSA9PiA8ZGl2IGtleT17aX0gY2xhc3NOYW1lPVwiYm9yZGVyIGJvcmRlci1waW5rLTUwMC8zMFwiIC8+KX1cbiAgICAgICAgPC9kaXY+XG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJzb2x1dGUgdG9wLTEvMiBsZWZ0LTEvMyB3LTggaC04IC1tbC00IC1tdC00IGJnLXBpbmstNTAwIHJvdW5kZWQtZnVsbCBzaGFkb3ctWzBfMF8yMHB4XyNlYzQ4OTldIGJvcmRlci0yIGJvcmRlci13aGl0ZSBwb2ludGVyLWV2ZW50cy1ub25lIGdyb3VwLWhvdmVyOnNjYWxlLTExMCB0cmFuc2l0aW9uLXRyYW5zZm9ybVwiIC8+XG4gICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cImFic29sdXRlIGJvdHRvbS0zIGxlZnQtMyB0ZXh0LVsxMHB4XSBmb250LW1vbm8gdGV4dC1waW5rLTUwMC81MFwiPkZJTFRFUiBIUC9MUDwvc3Bhbj5cbiAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwiYWJzb2x1dGUgdG9wLTMgcmlnaHQtMyB0ZXh0LVsxMHB4XSBmb250LW1vbm8gdGV4dC1waW5rLTUwMC81MCB0cmFuc2Zvcm0gcm90YXRlLTkwIG9yaWdpbi1yaWdodFwiPkRFTEFZIEZCPC9zcGFuPlxuICAgICA8L2Rpdj5cbiAgPC9kaXY+XG4pO1xuXG5jb25zdCBTYW1wbGVDcmF0ZSA9ICgpID0+IHtcbiAgY29uc3QgW3NlbGVjdGVkRm9sZGVyLCBzZXRTZWxlY3RlZEZvbGRlcl0gPSB1c2VTdGF0ZShcIktpY2tzXCIpO1xuICBjb25zdCBbcGxheWluZ1NhbXBsZSwgc2V0UGxheWluZ1NhbXBsZV0gPSB1c2VTdGF0ZTxzdHJpbmcgfCBudWxsPihudWxsKTtcbiAgY29uc3QgW2ltcG9ydGVkU2FtcGxlcywgc2V0SW1wb3J0ZWRTYW1wbGVzXSA9IHVzZVN0YXRlPEFycmF5PHtuYW1lOiBzdHJpbmcsIGR1cjogc3RyaW5nLCBicG06IG51bWJlciwga2V5OiBzdHJpbmd9Pj4oW10pO1xuICBjb25zdCBmaWxlSW5wdXRSZWYgPSB1c2VSZWY8SFRNTElucHV0RWxlbWVudD4obnVsbCk7XG5cbiAgY29uc3QgZm9sZGVycyA9IFtcIktpY2tzXCIsIFwiU25hcmVzXCIsIFwiU3ludGhzXCIsIFwiVm9jYWxzXCIsIFwiRlhcIiwgXCJJbXBvcnRlZFwiXTtcbiAgY29uc3QgZGVmYXVsdFNhbXBsZXM6IFJlY29yZDxzdHJpbmcsIEFycmF5PHtuYW1lOiBzdHJpbmcsIGR1cjogc3RyaW5nLCBicG06IG51bWJlciwga2V5OiBzdHJpbmd9Pj4gPSB7XG4gICAgS2lja3M6IFtcbiAgICAgIHsgbmFtZTogXCJLaWNrXzgwOF9QdW5jaC53YXZcIiwgZHVyOiBcIjAuOHNcIiwgYnBtOiAxMjAsIGtleTogXCJDMVwiIH0sXG4gICAgICB7IG5hbWU6IFwiS2lja19Ib3VzZV9EZWVwLndhdlwiLCBkdXI6IFwiMS4yc1wiLCBicG06IDEyNCwga2V5OiBcIkYxXCIgfSxcbiAgICAgIHsgbmFtZTogXCJLaWNrX1RyYXBfU3ViLndhdlwiLCBkdXI6IFwiMC45c1wiLCBicG06IDE0MCwga2V5OiBcIkcxXCIgfSxcbiAgICBdLFxuICAgIFNuYXJlczogW1xuICAgICAgeyBuYW1lOiBcIlNuYXJlX0NyaXNwX0Eud2F2XCIsIGR1cjogXCIwLjVzXCIsIGJwbTogMTIwLCBrZXk6IFwiRDJcIiB9LFxuICAgICAgeyBuYW1lOiBcIlNuYXJlX0NsYXBfU3RhZGl1bS53YXZcIiwgZHVyOiBcIjAuN3NcIiwgYnBtOiAxMjQsIGtleTogXCJBMlwiIH0sXG4gICAgXSxcbiAgICBTeW50aHM6IFtcbiAgICAgIHsgbmFtZTogXCJTeW50aF9TYXdfTGVhZC53YXZcIiwgZHVyOiBcIjIuNHNcIiwgYnBtOiAxMjQsIGtleTogXCJBIE1pbm9yXCIgfSxcbiAgICAgIHsgbmFtZTogXCJTeW50aF9DaG9yZHNfUmV0cm8ud2F2XCIsIGR1cjogXCI0LjBzXCIsIGJwbTogMTE1LCBrZXk6IFwiQyBNYWpvclwiIH0sXG4gICAgXSxcbiAgICBWb2NhbHM6IFtcbiAgICAgIHsgbmFtZTogXCJWb2NhbF9DaG9wX0hlYXZlbi53YXZcIiwgZHVyOiBcIjEuNHNcIiwgYnBtOiAxMjgsIGtleTogXCJGIyBNaW5vclwiIH0sXG4gICAgICB7IG5hbWU6IFwiVm9jYWxfUGhyYXNlX1llYWgud2F2XCIsIGR1cjogXCIwLjlzXCIsIGJwbTogMTIwLCBrZXk6IFwiRSBNaW5vclwiIH0sXG4gICAgXSxcbiAgICBGWDogW1xuICAgICAgeyBuYW1lOiBcIkZYX0N5YmVyX1Jpc2VyLndhdlwiLCBkdXI6IFwiNC4wc1wiLCBicG06IDEyNCwga2V5OiBcIk4vQVwiIH0sXG4gICAgICB7IG5hbWU6IFwiRlhfR2xpdGNoX0hpdC53YXZcIiwgZHVyOiBcIjAuM3NcIiwgYnBtOiAxNDAsIGtleTogXCJOL0FcIiB9LFxuICAgIF0sXG4gICAgSW1wb3J0ZWQ6IGltcG9ydGVkU2FtcGxlc1xuICB9O1xuXG4gIGNvbnN0IGhhbmRsZUZpbGVDaGFuZ2UgPSAoZTogUmVhY3QuQ2hhbmdlRXZlbnQ8SFRNTElucHV0RWxlbWVudD4pID0+IHtcbiAgICBjb25zdCBmaWxlcyA9IGUudGFyZ2V0LmZpbGVzO1xuICAgIGlmICghZmlsZXMgfHwgZmlsZXMubGVuZ3RoID09PSAwKSByZXR1cm47XG4gICAgY29uc3QgbmV3SXRlbXMgPSBBcnJheS5mcm9tKGZpbGVzKS5tYXAoKGZpbGUpID0+ICh7XG4gICAgICBuYW1lOiBmaWxlLm5hbWUsXG4gICAgICBkdXI6IGAkeyhNYXRoLnJhbmRvbSgpICogMiArIDAuNSkudG9GaXhlZCgxKX1zYCxcbiAgICAgIGJwbTogMTIwLFxuICAgICAga2V5OiBcIkN1c3RvbVwiXG4gICAgfSkpO1xuICAgIHNldEltcG9ydGVkU2FtcGxlcyhwcmV2ID0+IFsuLi5wcmV2LCAuLi5uZXdJdGVtc10pO1xuICAgIHNldFNlbGVjdGVkRm9sZGVyKFwiSW1wb3J0ZWRcIik7XG4gIH07XG5cbiAgcmV0dXJuIChcbiAgICA8ZGl2IGNsYXNzTmFtZT1cImgtZnVsbCBiZy1zbGF0ZS05MDAgcC02IGZsZXggZ2FwLTQgZm9udC1tb25vIHRleHQteHMgdGV4dC1zbGF0ZS0zMDAgb3ZlcmZsb3ctaGlkZGVuXCI+XG4gICAgICAgPGlucHV0IFxuICAgICAgICAgdHlwZT1cImZpbGVcIiBcbiAgICAgICAgIHJlZj17ZmlsZUlucHV0UmVmfSBcbiAgICAgICAgIG9uQ2hhbmdlPXtoYW5kbGVGaWxlQ2hhbmdlfSBcbiAgICAgICAgIGFjY2VwdD1cImF1ZGlvLypcIiBcbiAgICAgICAgIG11bHRpcGxlIFxuICAgICAgICAgY2xhc3NOYW1lPVwiaGlkZGVuXCIgXG4gICAgICAgLz5cblxuICAgICAgIHsvKiBTaWRlYmFyIEZvbGRlcnMgKi99XG4gICAgICAgPGRpdiBjbGFzc05hbWU9XCJ3LTQ0IGJnLXNsYXRlLTk1MCBwLTMgcm91bmRlZC14bCBib3JkZXIgYm9yZGVyLXNsYXRlLTgwMCBmbGV4IGZsZXgtY29sIGdhcC0yXCI+XG4gICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LVsxMHB4XSB0ZXh0LWJsdWUtNDAwIGZvbnQtYm9sZCB0cmFja2luZy13aWRlc3QgYm9yZGVyLWIgYm9yZGVyLXNsYXRlLTgwMCBwYi0yIG1iLTEgZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTEuNVwiPlxuICAgICAgICAgICA8Rm9sZGVyIHNpemU9ezE0fSAvPiBDUkFURSBMSUJSQVJJRVNcbiAgICAgICAgIDwvc3Bhbj5cbiAgICAgICAgIHtmb2xkZXJzLm1hcChmb2xkZXIgPT4gKFxuICAgICAgICAgICA8YnV0dG9uIFxuICAgICAgICAgICAgIGtleT17Zm9sZGVyfVxuICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHNldFNlbGVjdGVkRm9sZGVyKGZvbGRlcil9XG4gICAgICAgICAgICAgY2xhc3NOYW1lPXtgZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1iZXR3ZWVuIHB4LTMgcHktMiByb3VuZGVkLWxnIHRleHQtbGVmdCB0cmFuc2l0aW9uLWNvbG9ycyBmb250LWJvbGQgJHtcbiAgICAgICAgICAgICAgIHNlbGVjdGVkRm9sZGVyID09PSBmb2xkZXIgXG4gICAgICAgICAgICAgICAgID8gJ2JnLWJsdWUtNjAwLzIwIHRleHQtYmx1ZS0zMDAgYm9yZGVyIGJvcmRlci1ibHVlLTUwMC81MCBzaGFkb3ctWzBfMF8xMHB4X3JnYmEoNTksMTMwLDI0NiwwLjE1KV0nIFxuICAgICAgICAgICAgICAgICA6ICdob3ZlcjpiZy1zbGF0ZS05MDAgdGV4dC1zbGF0ZS00MDAnXG4gICAgICAgICAgICAgfWB9XG4gICAgICAgICAgID5cbiAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0yIHRydW5jYXRlXCI+XG4gICAgICAgICAgICAgICA8Rm9sZGVyIHNpemU9ezEyfSBjbGFzc05hbWU9e3NlbGVjdGVkRm9sZGVyID09PSBmb2xkZXIgPyAndGV4dC1ibHVlLTQwMCcgOiAndGV4dC1zbGF0ZS01MDAnfSAvPlxuICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidHJ1bmNhdGVcIj4ve2ZvbGRlcn08L3NwYW4+XG4gICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAge2ZvbGRlciA9PT0gXCJJbXBvcnRlZFwiICYmIGltcG9ydGVkU2FtcGxlcy5sZW5ndGggPiAwICYmIChcbiAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInB4LTEuNSBweS0wLjUgYmctYmx1ZS05NTAgdGV4dC1ibHVlLTQwMCB0ZXh0LVs5cHhdIHJvdW5kZWQgYm9yZGVyIGJvcmRlci1ibHVlLTgwMFwiPntpbXBvcnRlZFNhbXBsZXMubGVuZ3RofTwvc3Bhbj5cbiAgICAgICAgICAgICApfVxuICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICkpfVxuXG4gICAgICAgICA8YnV0dG9uIFxuICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBmaWxlSW5wdXRSZWYuY3VycmVudD8uY2xpY2soKX1cbiAgICAgICAgICAgY2xhc3NOYW1lPVwibXQtYXV0byB3LWZ1bGwgcHktMi41IGJnLWJsdWUtNjAwIGhvdmVyOmJnLWJsdWUtNTAwIHRleHQtd2hpdGUgZm9udC1ib2xkIHJvdW5kZWQteGwgZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgZ2FwLTEuNSB0cmFuc2l0aW9uLWNvbG9ycyBzaGFkb3ctWzBfMF8xMnB4X3JnYmEoMzcsOTksMjM1LDAuMyldIGN1cnNvci1wb2ludGVyXCJcbiAgICAgICAgID5cbiAgICAgICAgICAgPEZvbGRlciBzaXplPXsxNH0gLz4gSU1QT1JUIExPQ0FMIEZJTEVcbiAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgIDwvZGl2PlxuXG4gICAgICAgey8qIFNhbXBsZSBMaXN0ICYgUHJldmlldyAqL31cbiAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXgtMSBiZy1zbGF0ZS05NTAgcC00IHJvdW5kZWQteGwgYm9yZGVyIGJvcmRlci1zbGF0ZS04MDAgZmxleCBmbGV4LWNvbCBnYXAtNCBvdmVyZmxvdy15LWF1dG9cIj5cbiAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBqdXN0aWZ5LWJldHdlZW4gaXRlbXMtY2VudGVyIGJvcmRlci1iIGJvcmRlci1zbGF0ZS04MDAgcGItMlwiPlxuICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LWJsdWUtNDAwIGZvbnQtYm9sZCB0cmFja2luZy13aWRlc3RcIj5ESVJFQ1RPUlk6IC97c2VsZWN0ZWRGb2xkZXJ9PC9zcGFuPlxuICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LVsxMHB4XSB0ZXh0LXNsYXRlLTUwMFwiPntkZWZhdWx0U2FtcGxlc1tzZWxlY3RlZEZvbGRlcl0/Lmxlbmd0aCB8fCAwfSBTQU1QTEVTPC9zcGFuPlxuICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBmbGV4LWNvbCBnYXAtMlwiPlxuICAgICAgICAgICB7ZGVmYXVsdFNhbXBsZXNbc2VsZWN0ZWRGb2xkZXJdPy5sZW5ndGggPT09IDAgPyAoXG4gICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJoLTQwIGZsZXggZmxleC1jb2wgaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIGdhcC0yIHRleHQtc2xhdGUtNTAwIGJvcmRlci0yIGJvcmRlci1kYXNoZWQgYm9yZGVyLXNsYXRlLTgwMCByb3VuZGVkLXhsXCI+XG4gICAgICAgICAgICAgICA8Rm9sZGVyIHNpemU9ezMyfSBjbGFzc05hbWU9XCJ0ZXh0LXNsYXRlLTcwMFwiIC8+XG4gICAgICAgICAgICAgICA8c3Bhbj5ObyBzYW1wbGVzIGluIHRoaXMgZm9sZGVyLiBDbGljayAnSW1wb3J0IExvY2FsIEZpbGUnIHRvIGFkZCBhdWRpby48L3NwYW4+XG4gICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICkgOiAoXG4gICAgICAgICAgICAgZGVmYXVsdFNhbXBsZXNbc2VsZWN0ZWRGb2xkZXJdPy5tYXAoKHNhbXBsZSwgaSkgPT4gKFxuICAgICAgICAgICAgICAgPGRpdiBrZXk9e2l9IGNsYXNzTmFtZT1cImJnLXNsYXRlLTkwMCBwLTMgcm91bmRlZC14bCBib3JkZXIgYm9yZGVyLXNsYXRlLTgwMC84MCBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWJldHdlZW4gaG92ZXI6Ym9yZGVyLXNsYXRlLTcwMCB0cmFuc2l0aW9uLWNvbG9yc1wiPlxuICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0zXCI+XG4gICAgICAgICAgICAgICAgICAgPGJ1dHRvbiBcbiAgICAgICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHNldFBsYXlpbmdTYW1wbGUocGxheWluZ1NhbXBsZSA9PT0gc2FtcGxlLm5hbWUgPyBudWxsIDogc2FtcGxlLm5hbWUpfVxuICAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwidy04IGgtOCByb3VuZGVkLWZ1bGwgYmctYmx1ZS02MDAvMjAgdGV4dC1ibHVlLTQwMCBob3ZlcjpiZy1ibHVlLTYwMCBob3Zlcjp0ZXh0LXdoaXRlIGZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIHRyYW5zaXRpb24tY29sb3JzXCJcbiAgICAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgICAgICB7cGxheWluZ1NhbXBsZSA9PT0gc2FtcGxlLm5hbWUgPyA8U3F1YXJlIHNpemU9ezEyfSBmaWxsPVwiY3VycmVudENvbG9yXCIgLz4gOiA8UGxheSBzaXplPXsxMn0gZmlsbD1cImN1cnJlbnRDb2xvclwiIGNsYXNzTmFtZT1cIm1sLTAuNVwiIC8+fVxuICAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBmbGV4LWNvbFwiPlxuICAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwiZm9udC1ib2xkIHRleHQtc2xhdGUtMjAwXCI+e3NhbXBsZS5uYW1lfTwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtWzlweF0gdGV4dC1zbGF0ZS01MDBcIj5LZXk6IHtzYW1wbGUua2V5fSDigKIgQlBNOiB7c2FtcGxlLmJwbX0g4oCiIExlbjoge3NhbXBsZS5kdXJ9PC9zcGFuPlxuICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMlwiPlxuICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwidy0yNCBoLTYgYmctc2xhdGUtOTUwIHJvdW5kZWQgYm9yZGVyIGJvcmRlci1zbGF0ZS04MDAgZmxleCBpdGVtcy1jZW50ZXIgcHgtMVwiPlxuICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ3LWZ1bGwgaC0yIGJnLWJsdWUtNTAwLzMwIHJvdW5kZWQtZnVsbCBvdmVyZmxvdy1oaWRkZW4gZmxleFwiPlxuICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInctMy80IGJnLWJsdWUtNDAwIGgtZnVsbCByb3VuZGVkLWZ1bGwgYW5pbWF0ZS1wdWxzZVwiIC8+XG4gICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICA8YnV0dG9uIFxuICAgICAgICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4gYWxlcnQoYExvYWRlZCBcIiR7c2FtcGxlLm5hbWV9XCIgaW50byBhY3RpdmUgU2FtcGxlciBwYWQgc2xvdCFgKX1cbiAgICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cInB4LTMgcHktMSBiZy1zbGF0ZS04MDAgaG92ZXI6YmctYmx1ZS02MDAgdGV4dC1zbGF0ZS0zMDAgaG92ZXI6dGV4dC13aGl0ZSByb3VuZGVkIHRleHQtWzEwcHhdIGZvbnQtYm9sZCB0cmFuc2l0aW9uLWNvbG9ycyBjdXJzb3ItcG9pbnRlclwiXG4gICAgICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICAgICAgTE9BRCBUTyBQQURcbiAgICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICApKVxuICAgICAgICAgICApfVxuICAgICAgICAgPC9kaXY+XG4gICAgICAgPC9kaXY+XG4gICAgPC9kaXY+XG4gICk7XG59O1xuXG5jb25zdCBQcmVzZXRNYW5hZ2VyID0gKHsgcGFkcywgYnBtLCBtYXN0ZXJWb2x1bWUsIG9uTG9hZFByZXNldCB9OiB7IHBhZHM6IFBhZFtdLCBicG06IG51bWJlciwgbWFzdGVyVm9sdW1lOiBudW1iZXIsIG9uTG9hZFByZXNldDogKHN0YXRlOiB7IHBhZHM6IFBhZFtdLCBicG06IG51bWJlciwgbWFzdGVyVm9sdW1lOiBudW1iZXIgfSkgPT4gdm9pZCB9KSA9PiB7XG4gIGNvbnN0IFtwcmVzZXROYW1lLCBzZXRQcmVzZXROYW1lXSA9IHVzZVN0YXRlKFwiTXkgREFXIFByb2plY3RcIik7XG4gIGNvbnN0IFtzYXZlZFByZXNldHMsIHNldFNhdmVkUHJlc2V0c10gPSB1c2VTdGF0ZTxBcnJheTx7IG5hbWU6IHN0cmluZywgZGF0ZTogc3RyaW5nLCBicG06IG51bWJlciwgcGFkczogUGFkW10sIG1hc3RlclZvbHVtZTogbnVtYmVyIH0+PihbXSk7XG4gIGNvbnN0IFtzdGF0dXNNZXNzYWdlLCBzZXRTdGF0dXNNZXNzYWdlXSA9IHVzZVN0YXRlKFwiXCIpO1xuICBjb25zdCBbaXNSZWNvcmRpbmdBdWRpbywgc2V0SXNSZWNvcmRpbmdBdWRpb10gPSB1c2VTdGF0ZShmYWxzZSk7XG4gIGNvbnN0IFthY3RpdmVUYWIsIHNldEFjdGl2ZVRhYl0gPSB1c2VTdGF0ZTwncHJlc2V0cycgfCAndGVtcGxhdGVzJz4oJ3ByZXNldHMnKTtcblxuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBzdG9yZWQgPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbShcInJlbWl4X29zX3ByZXNldHNfdjFcIik7XG4gICAgICBpZiAoc3RvcmVkKSB7XG4gICAgICAgIHNldFNhdmVkUHJlc2V0cyhKU09OLnBhcnNlKHN0b3JlZCkpO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoZSk7XG4gICAgfVxuICB9LCBbXSk7XG5cbiAgY29uc3QgaGFuZGxlU2F2ZVByZXNldCA9ICgpID0+IHtcbiAgICBpZiAoIXByZXNldE5hbWUudHJpbSgpKSByZXR1cm47XG4gICAgY29uc3QgbmV3UHJlc2V0ID0ge1xuICAgICAgbmFtZTogcHJlc2V0TmFtZS50cmltKCksXG4gICAgICBkYXRlOiBuZXcgRGF0ZSgpLnRvTG9jYWxlU3RyaW5nKCksXG4gICAgICBicG0sXG4gICAgICBwYWRzLFxuICAgICAgbWFzdGVyVm9sdW1lXG4gICAgfTtcbiAgICBjb25zdCB1cGRhdGVkID0gW25ld1ByZXNldCwgLi4uc2F2ZWRQcmVzZXRzLmZpbHRlcihwID0+IHAubmFtZSAhPT0gbmV3UHJlc2V0Lm5hbWUpXTtcbiAgICBzZXRTYXZlZFByZXNldHModXBkYXRlZCk7XG4gICAgdHJ5IHtcbiAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKFwicmVtaXhfb3NfcHJlc2V0c192MVwiLCBKU09OLnN0cmluZ2lmeSh1cGRhdGVkKSk7XG4gICAgICBzZXRTdGF0dXNNZXNzYWdlKGBQcmVzZXQgXCIke25ld1ByZXNldC5uYW1lfVwiIHNhdmVkIHN1Y2Nlc3NmdWxseSB0byBMb2NhbCBTdG9yYWdlIWApO1xuICAgICAgc2V0VGltZW91dCgoKSA9PiBzZXRTdGF0dXNNZXNzYWdlKFwiXCIpLCAzMDAwKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBjb25zb2xlLmVycm9yKGUpO1xuICAgICAgc2V0U3RhdHVzTWVzc2FnZShcIkVycm9yIHNhdmluZyB0byBMb2NhbCBTdG9yYWdlLlwiKTtcbiAgICB9XG4gIH07XG5cbiAgY29uc3QgaGFuZGxlTG9hZFByZXNldCA9IChwcmVzZXQ6IHsgcGFkczogUGFkW10sIGJwbTogbnVtYmVyLCBtYXN0ZXJWb2x1bWU6IG51bWJlciB9KSA9PiB7XG4gICAgb25Mb2FkUHJlc2V0KHByZXNldCk7XG4gICAgc2V0U3RhdHVzTWVzc2FnZShcIlByZXNldCBsb2FkZWQgaW50byBEQVcgc3VjY2Vzc2Z1bGx5IVwiKTtcbiAgICBzZXRUaW1lb3V0KCgpID0+IHNldFN0YXR1c01lc3NhZ2UoXCJcIiksIDMwMDApO1xuICB9O1xuXG4gIGNvbnN0IGhhbmRsZURlbGV0ZVByZXNldCA9IChuYW1lOiBzdHJpbmcpID0+IHtcbiAgICBjb25zdCB1cGRhdGVkID0gc2F2ZWRQcmVzZXRzLmZpbHRlcihwID0+IHAubmFtZSAhPT0gbmFtZSk7XG4gICAgc2V0U2F2ZWRQcmVzZXRzKHVwZGF0ZWQpO1xuICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKFwicmVtaXhfb3NfcHJlc2V0c192MVwiLCBKU09OLnN0cmluZ2lmeSh1cGRhdGVkKSk7XG4gIH07XG5cbiAgY29uc3QgaGFuZGxlRXhwb3J0SlNPTiA9ICgpID0+IHtcbiAgICBjb25zdCBwcm9qZWN0U3RhdGUgPSB7XG4gICAgICB2ZXJzaW9uOiBcIjIuMFwiLFxuICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgICBicG0sXG4gICAgICBtYXN0ZXJWb2x1bWUsXG4gICAgICBwYWRzXG4gICAgfTtcbiAgICBjb25zdCBibG9iID0gbmV3IEJsb2IoW0pTT04uc3RyaW5naWZ5KHByb2plY3RTdGF0ZSwgbnVsbCwgMildLCB7IHR5cGU6ICdhcHBsaWNhdGlvbi9qc29uJyB9KTtcbiAgICBjb25zdCB1cmwgPSBVUkwuY3JlYXRlT2JqZWN0VVJMKGJsb2IpO1xuICAgIGNvbnN0IGEgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdhJyk7XG4gICAgYS5ocmVmID0gdXJsO1xuICAgIGEuZG93bmxvYWQgPSBgcmVtaXgtb3MtcHJvamVjdC0ke0RhdGUubm93KCl9Lmpzb25gO1xuICAgIGEuY2xpY2soKTtcbiAgICBVUkwucmV2b2tlT2JqZWN0VVJMKHVybCk7XG4gICAgc2V0U3RhdHVzTWVzc2FnZShcIlByb2plY3QgZXhwb3J0ZWQgYXMgSlNPTiBmaWxlIHN1Y2Nlc3NmdWxseSFcIik7XG4gICAgc2V0VGltZW91dCgoKSA9PiBzZXRTdGF0dXNNZXNzYWdlKFwiXCIpLCAzMDAwKTtcbiAgfTtcblxuICBjb25zdCBoYW5kbGVUb2dnbGVSZWNvcmRBdWRpbyA9ICgpID0+IHtcbiAgICBpZiAoIWlzUmVjb3JkaW5nQXVkaW8pIHtcbiAgICAgIHNldElzUmVjb3JkaW5nQXVkaW8odHJ1ZSk7XG4gICAgICBhdWRpb0VuZ2luZS5zdGFydFJlY29yZGluZ0F1ZGlvKChibG9iKSA9PiB7XG4gICAgICAgIGNvbnN0IHVybCA9IFVSTC5jcmVhdGVPYmplY3RVUkwoYmxvYik7XG4gICAgICAgIGNvbnN0IGEgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdhJyk7XG4gICAgICAgIGEuaHJlZiA9IHVybDtcbiAgICAgICAgYS5kb3dubG9hZCA9IGByZW1peC1vcy1hdWRpby1yZW5kZXItJHtEYXRlLm5vdygpfS53ZWJtYDtcbiAgICAgICAgYS5jbGljaygpO1xuICAgICAgICBVUkwucmV2b2tlT2JqZWN0VVJMKHVybCk7XG4gICAgICAgIHNldFN0YXR1c01lc3NhZ2UoXCJNYXN0ZXIgYXVkaW8gcmVuZGVyZWQgJiBkb3dubG9hZGVkIHN1Y2Nlc3NmdWxseSFcIik7XG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4gc2V0U3RhdHVzTWVzc2FnZShcIlwiKSwgNDAwMCk7XG4gICAgICB9KTtcbiAgICAgIHNldFN0YXR1c01lc3NhZ2UoXCJSZWNvcmRpbmcgYXVkaW8gb3V0cHV0Li4uIFBsYXkgeW91ciB0cmFja3MsIHRoZW4gY2xpY2sgJ1N0b3AgQXVkaW8gUmVjb3JkaW5nJy5cIik7XG4gICAgfSBlbHNlIHtcbiAgICAgIHNldElzUmVjb3JkaW5nQXVkaW8oZmFsc2UpO1xuICAgICAgYXVkaW9FbmdpbmUuc3RvcFJlY29yZGluZ0F1ZGlvKCk7XG4gICAgfVxuICB9O1xuXG4gIGNvbnN0IHRlbXBsYXRlcyA9IFtcbiAgICB7XG4gICAgICBuYW1lOiBcIlRlY2hubyBTdGFydGVyXCIsXG4gICAgICBicG06IDEzMCxcbiAgICAgIGRlc2NyaXB0aW9uOiBcIkRyaXZpbmcgNC80IHJoeXRobSB3aXRoIGhlYXZ5IHN1YiBiYXNzIGFuZCBoeXBub3RpYyBzeW50aCBsZWFkcy5cIixcbiAgICAgIGdlbnJlOiBcIkVsZWN0cm9uaWMgLyBUZWNobm9cIixcbiAgICAgIG1hc3RlclZvbHVtZTogMC45LFxuICAgICAgbW9kaWZpZXI6IChwOiBQYWQsIGlkeDogbnVtYmVyKSA9PiAoeyAuLi5wLCBhY3RpdmU6IGlkeCAlIDQgPT09IDAsIHZvbHVtZTogaWR4ICUgNCA9PT0gMCA/IDkwIDogNDAgfSlcbiAgICB9LFxuICAgIHtcbiAgICAgIG5hbWU6IFwiTG8tRmkgQ2hpbGxcIixcbiAgICAgIGJwbTogODUsXG4gICAgICBkZXNjcmlwdGlvbjogXCJNZWxsb3cgY2hvcmRzLCB2aW55bCBkdXN0IHRleHR1cmUsIGFuZCByZWxheGVkIGFjb3VzdGljIGdyb292ZS5cIixcbiAgICAgIGdlbnJlOiBcIkhpcC1Ib3AgLyBMby1GaVwiLFxuICAgICAgbWFzdGVyVm9sdW1lOiAwLjgsXG4gICAgICBtb2RpZmllcjogKHA6IFBhZCwgaWR4OiBudW1iZXIpID0+ICh7IC4uLnAsIGFjdGl2ZTogaWR4ICUgMiA9PT0gMCwgdm9sdW1lOiA3MCB9KVxuICAgIH0sXG4gICAge1xuICAgICAgbmFtZTogXCJUcmFwIEJlYXRcIixcbiAgICAgIGJwbTogMTQwLFxuICAgICAgZGVzY3JpcHRpb246IFwiUmFwaWQgaGktaGF0IHJvbGxzLCBkZWVwIDgwOCBzdWIgYmFzcywgYW5kIGNyaXNwIHNuYXJlIGhpdHMuXCIsXG4gICAgICBnZW5yZTogXCJIaXAtSG9wIC8gVHJhcFwiLFxuICAgICAgbWFzdGVyVm9sdW1lOiAwLjg1LFxuICAgICAgbW9kaWZpZXI6IChwOiBQYWQsIGlkeDogbnVtYmVyKSA9PiAoeyAuLi5wLCBhY3RpdmU6IGlkeCA8IDgsIHZvbHVtZTogODUgfSlcbiAgICB9XG4gIF07XG5cbiAgY29uc3QgaGFuZGxlTG9hZFRlbXBsYXRlID0gKHRwbDogdHlwZW9mIHRlbXBsYXRlc1swXSkgPT4ge1xuICAgIGNvbnN0IHVwZGF0ZWRQYWRzID0gcGFkcy5tYXAoKHAsIGlkeCkgPT4gdHBsLm1vZGlmaWVyKHAsIGlkeCkpO1xuICAgIG9uTG9hZFByZXNldCh7IHBhZHM6IHVwZGF0ZWRQYWRzLCBicG06IHRwbC5icG0sIG1hc3RlclZvbHVtZTogdHBsLm1hc3RlclZvbHVtZSB9KTtcbiAgICBzZXRTdGF0dXNNZXNzYWdlKGBUZW1wbGF0ZSBcIiR7dHBsLm5hbWV9XCIgbG9hZGVkIHN1Y2Nlc3NmdWxseSFgKTtcbiAgICBzZXRUaW1lb3V0KCgpID0+IHNldFN0YXR1c01lc3NhZ2UoXCJcIiksIDMwMDApO1xuICB9O1xuXG4gIHJldHVybiAoXG4gICAgPGRpdiBjbGFzc05hbWU9XCJoLWZ1bGwgYmctc2xhdGUtOTAwIHAtNiBmbGV4IGZsZXgtY29sIGdhcC00IGZvbnQtbW9ubyB0ZXh0LXhzIHRleHQtc2xhdGUtMzAwIG92ZXJmbG93LXktYXV0b1wiPlxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGp1c3RpZnktYmV0d2VlbiBpdGVtcy1jZW50ZXIgYmctc2xhdGUtOTUwIHAtMyByb3VuZGVkLWxnIGJvcmRlciBib3JkZXItc2xhdGUtODAwIHNoYWRvdy1tZFwiPlxuICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJmb250LWJsYWNrIHRyYWNraW5nLXdpZGVzdCB0ZXh0LWFtYmVyLTQwMCBmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMlwiPlxuICAgICAgICAgIDxGb2xkZXIgc2l6ZT17MTZ9IC8+IERBVyBQUkVTRVQgJiBFWFBPUlQgTUFOQUdFUlxuICAgICAgICA8L3NwYW4+XG4gICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInB4LTIgcHktMC41IGJnLWFtYmVyLTk1MCB0ZXh0LWFtYmVyLTMwMCB0ZXh0LVsxMHB4XSByb3VuZGVkIGJvcmRlciBib3JkZXItYW1iZXItOTAwXCI+djIuMDwvc3Bhbj5cbiAgICAgIDwvZGl2PlxuXG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cImJnLXNsYXRlLTk1MCBwLTQgcm91bmRlZC14bCBib3JkZXIgYm9yZGVyLXNsYXRlLTgwMCBmbGV4IGZsZXgtY29sIGdhcC0zXCI+XG4gICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtWzEwcHhdIHRleHQtY3lhbi00MDAgZm9udC1ib2xkIHVwcGVyY2FzZSB0cmFja2luZy13aWRlclwiPlBST0pFQ1QgJiBBVURJTyBFWFBPUlRTPC9zcGFuPlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImdyaWQgZ3JpZC1jb2xzLTIgZ2FwLTJcIj5cbiAgICAgICAgICA8YnV0dG9uIFxuICAgICAgICAgICAgb25DbGljaz17aGFuZGxlRXhwb3J0SlNPTn1cbiAgICAgICAgICAgIGNsYXNzTmFtZT1cInB5LTIuNSBiZy1jeWFuLTYwMCBob3ZlcjpiZy1jeWFuLTUwMCB0ZXh0LXdoaXRlIGZvbnQtYm9sZCByb3VuZGVkLWxnIHRyYW5zaXRpb24tYWxsIHNoYWRvdy1bMF8wXzEwcHhfcmdiYSg4LDE0NSwxNzgsMC4zKV0gY3Vyc29yLXBvaW50ZXJcIlxuICAgICAgICAgID5cbiAgICAgICAgICAgIEVYUE9SVCBKU09OIEZJTEVcbiAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICA8YnV0dG9uIFxuICAgICAgICAgICAgb25DbGljaz17aGFuZGxlVG9nZ2xlUmVjb3JkQXVkaW99XG4gICAgICAgICAgICBjbGFzc05hbWU9e2BweS0yLjUgZm9udC1ib2xkIHJvdW5kZWQtbGcgdHJhbnNpdGlvbi1hbGwgY3Vyc29yLXBvaW50ZXIgJHtpc1JlY29yZGluZ0F1ZGlvID8gJ2JnLXJlZC02MDAgdGV4dC13aGl0ZSBzaGFkb3ctWzBfMF8xNXB4XyNkYzI2MjZdIGFuaW1hdGUtcHVsc2UnIDogJ2JnLWVtZXJhbGQtNjAwIGhvdmVyOmJnLWVtZXJhbGQtNTAwIHRleHQtd2hpdGUgc2hhZG93LVswXzBfMTBweF9yZ2JhKDUsMTUwLDEwNSwwLjMpXSd9YH1cbiAgICAgICAgICA+XG4gICAgICAgICAgICB7aXNSZWNvcmRpbmdBdWRpbyA/ICdTVE9QIFJFQ09SRElORyBBVURJTycgOiAnUkVOREVSIEFVRElPIChXQVYvV0VCTSknfVxuICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICA8L2Rpdj5cbiAgICAgIDwvZGl2PlxuXG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cImJnLXNsYXRlLTk1MCBwLTQgcm91bmRlZC14bCBib3JkZXIgYm9yZGVyLXNsYXRlLTgwMCBmbGV4IGZsZXgtY29sIGdhcC0zXCI+XG4gICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtWzEwcHhdIHRleHQtYW1iZXItNDAwIGZvbnQtYm9sZCB1cHBlcmNhc2UgdHJhY2tpbmctd2lkZXJcIj5TQVZFIENVUlJFTlQgUFJPSkVDVCBTVEFURTwvc3Bhbj5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGdhcC0yXCI+XG4gICAgICAgICAgPGlucHV0IFxuICAgICAgICAgICAgdHlwZT1cInRleHRcIiBcbiAgICAgICAgICAgIHZhbHVlPXtwcmVzZXROYW1lfSBcbiAgICAgICAgICAgIG9uQ2hhbmdlPXtlID0+IHNldFByZXNldE5hbWUoZS50YXJnZXQudmFsdWUpfSBcbiAgICAgICAgICAgIHBsYWNlaG9sZGVyPVwiUHJlc2V0IE5hbWUuLi5cIiBcbiAgICAgICAgICAgIGNsYXNzTmFtZT1cImZsZXgtMSBiZy1zbGF0ZS05MDAgYm9yZGVyIGJvcmRlci1zbGF0ZS03MDAgcm91bmRlZC1sZyBweC0zIHB5LTIgdGV4dC1zbGF0ZS0xMDAgb3V0bGluZS1ub25lIGZvY3VzOmJvcmRlci1hbWJlci01MDAgZm9udC1ib2xkXCJcbiAgICAgICAgICAvPlxuICAgICAgICAgIDxidXR0b24gXG4gICAgICAgICAgICBvbkNsaWNrPXtoYW5kbGVTYXZlUHJlc2V0fVxuICAgICAgICAgICAgY2xhc3NOYW1lPVwicHgtNSBweS0yIGJnLWFtYmVyLTYwMCBob3ZlcjpiZy1hbWJlci01MDAgdGV4dC1zbGF0ZS05NTAgZm9udC1ibGFjayByb3VuZGVkLWxnIHRyYW5zaXRpb24tYWxsIHNoYWRvdy1bMF8wXzEycHhfcmdiYSgyNDUsMTU4LDExLDAuMyldIGN1cnNvci1wb2ludGVyXCJcbiAgICAgICAgICA+XG4gICAgICAgICAgICBTQVZFXG4gICAgICAgICAgPC9idXR0b24+XG4gICAgICAgIDwvZGl2PlxuICAgICAgICB7c3RhdHVzTWVzc2FnZSAmJiAoXG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJwLTIgYmctZW1lcmFsZC05NTAgYm9yZGVyIGJvcmRlci1lbWVyYWxkLTgwMCB0ZXh0LWVtZXJhbGQtNDAwIHRleHQtWzEwcHhdIHJvdW5kZWQgdGV4dC1jZW50ZXIgZm9udC1ib2xkXCI+XG4gICAgICAgICAgICB7c3RhdHVzTWVzc2FnZX1cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgKX1cbiAgICAgIDwvZGl2PlxuXG4gICAgICB7LyogVGFicyAqL31cbiAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBnYXAtMiBib3JkZXItYiBib3JkZXItc2xhdGUtODAwIHBiLTJcIj5cbiAgICAgICAgPGJ1dHRvblxuICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHNldEFjdGl2ZVRhYigncHJlc2V0cycpfVxuICAgICAgICAgIGNsYXNzTmFtZT17YHB4LTQgcHktMiBmb250LWJvbGQgcm91bmRlZC1sZyB0ZXh0LXhzIHRyYW5zaXRpb24tY29sb3JzIGN1cnNvci1wb2ludGVyICR7YWN0aXZlVGFiID09PSAncHJlc2V0cycgPyAnYmctYW1iZXItNjAwIHRleHQtc2xhdGUtOTUwIHNoYWRvdy1bMF8wXzEwcHhfcmdiYSgyNDUsMTU4LDExLDAuMyldJyA6ICdiZy1zbGF0ZS05NTAgdGV4dC1zbGF0ZS00MDAgaG92ZXI6Ymctc2xhdGUtODAwJ31gfVxuICAgICAgICA+XG4gICAgICAgICAgU0FWRUQgUFJFU0VUUyAoe3NhdmVkUHJlc2V0cy5sZW5ndGh9KVxuICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgPGJ1dHRvblxuICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHNldEFjdGl2ZVRhYigndGVtcGxhdGVzJyl9XG4gICAgICAgICAgY2xhc3NOYW1lPXtgcHgtNCBweS0yIGZvbnQtYm9sZCByb3VuZGVkLWxnIHRleHQteHMgdHJhbnNpdGlvbi1jb2xvcnMgY3Vyc29yLXBvaW50ZXIgJHthY3RpdmVUYWIgPT09ICd0ZW1wbGF0ZXMnID8gJ2JnLWFtYmVyLTYwMCB0ZXh0LXNsYXRlLTk1MCBzaGFkb3ctWzBfMF8xMHB4X3JnYmEoMjQ1LDE1OCwxMSwwLjMpXScgOiAnYmctc2xhdGUtOTUwIHRleHQtc2xhdGUtNDAwIGhvdmVyOmJnLXNsYXRlLTgwMCd9YH1cbiAgICAgICAgPlxuICAgICAgICAgIFRFTVBMQVRFUyAoe3RlbXBsYXRlcy5sZW5ndGh9KVxuICAgICAgICA8L2J1dHRvbj5cbiAgICAgIDwvZGl2PlxuXG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXgtMSBmbGV4IGZsZXgtY29sIGdhcC0yIG1pbi1oLVsxNjBweF1cIj5cbiAgICAgICAge2FjdGl2ZVRhYiA9PT0gJ3ByZXNldHMnID8gKFxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleC0xIGJnLXNsYXRlLTk1MCBib3JkZXIgYm9yZGVyLXNsYXRlLTgwMCByb3VuZGVkLXhsIHAtMyBmbGV4IGZsZXgtY29sIGdhcC0yIG92ZXJmbG93LXktYXV0b1wiPlxuICAgICAgICAgICAge3NhdmVkUHJlc2V0cy5sZW5ndGggPT09IDAgPyAoXG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwidGV4dC1zbGF0ZS01MDAgdGV4dC1jZW50ZXIgcHktOFwiPk5vIHNhdmVkIHByZXNldHMgZm91bmQgaW4gbG9jYWwgc3RvcmFnZS4gU2F2ZSB5b3VyIHByb2plY3QgYWJvdmUhPC9kaXY+XG4gICAgICAgICAgICApIDogKFxuICAgICAgICAgICAgICBzYXZlZFByZXNldHMubWFwKChwLCBpZHgpID0+IChcbiAgICAgICAgICAgICAgICA8ZGl2IGtleT17aWR4fSBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWJldHdlZW4gcC0zIGJnLXNsYXRlLTkwMCBib3JkZXIgYm9yZGVyLXNsYXRlLTgwMCByb3VuZGVkLWxnIGhvdmVyOmJvcmRlci1zbGF0ZS03MDBcIj5cbiAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBmbGV4LWNvbCBnYXAtMC41XCI+XG4gICAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cImZvbnQtYm9sZCB0ZXh0LXNsYXRlLTIwMFwiPntwLm5hbWV9PC9zcGFuPlxuICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LVs5cHhdIHRleHQtc2xhdGUtNTAwXCI+e3AuZGF0ZX0g4oCiIHtwLmJwbX0gQlBNPC9zcGFuPlxuICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0yXCI+XG4gICAgICAgICAgICAgICAgICAgIDxidXR0b24gXG4gICAgICAgICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4gaGFuZGxlTG9hZFByZXNldChwKX1cbiAgICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJweC0zIHB5LTEuNSBiZy1jeWFuLTYwMCBob3ZlcjpiZy1jeWFuLTUwMCB0ZXh0LXdoaXRlIGZvbnQtYm9sZCByb3VuZGVkIHRleHQtWzEwcHhdIHRyYW5zaXRpb24tY29sb3JzIGN1cnNvci1wb2ludGVyXCJcbiAgICAgICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICAgICAgIExPQURcbiAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgICAgIDxidXR0b24gXG4gICAgICAgICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4gaGFuZGxlRGVsZXRlUHJlc2V0KHAubmFtZSl9XG4gICAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwicHgtMyBweS0xLjUgYmctcmVkLTYwMC8yMCBob3ZlcjpiZy1yZWQtNjAwIHRleHQtcmVkLTQwMCBob3Zlcjp0ZXh0LXdoaXRlIGZvbnQtYm9sZCByb3VuZGVkIHRleHQtWzEwcHhdIHRyYW5zaXRpb24tY29sb3JzIGN1cnNvci1wb2ludGVyXCJcbiAgICAgICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICAgICAgIERFTFxuICAgICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICApKVxuICAgICAgICAgICAgKX1cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgKSA6IChcbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXgtMSBiZy1zbGF0ZS05NTAgYm9yZGVyIGJvcmRlci1zbGF0ZS04MDAgcm91bmRlZC14bCBwLTMgZmxleCBmbGV4LWNvbCBnYXAtMiBvdmVyZmxvdy15LWF1dG9cIj5cbiAgICAgICAgICAgIHt0ZW1wbGF0ZXMubWFwKCh0cGwsIGlkeCkgPT4gKFxuICAgICAgICAgICAgICA8ZGl2IGtleT17aWR4fSBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWJldHdlZW4gcC0zIGJnLXNsYXRlLTkwMCBib3JkZXIgYm9yZGVyLXNsYXRlLTgwMCByb3VuZGVkLWxnIGhvdmVyOmJvcmRlci1zbGF0ZS03MDBcIj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggZmxleC1jb2wgZ2FwLTEgbWF4LXctWzcwJV1cIj5cbiAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTJcIj5cbiAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwiZm9udC1ib2xkIHRleHQtYW1iZXItNDAwXCI+e3RwbC5uYW1lfTwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwicHgtMS41IHB5LTAuNSBiZy1zbGF0ZS04MDAgdGV4dC1zbGF0ZS0zMDAgdGV4dC1bOXB4XSByb3VuZGVkXCI+e3RwbC5nZW5yZX08L3NwYW4+XG4gICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtWzEwcHhdIHRleHQtc2xhdGUtNDAwXCI+e3RwbC5kZXNjcmlwdGlvbn08L3NwYW4+XG4gICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LVs5cHhdIHRleHQtY3lhbi00MDBcIj5EZWZhdWx0IFRlbXBvOiB7dHBsLmJwbX0gQlBNPC9zcGFuPlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDxidXR0b24gXG4gICAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBoYW5kbGVMb2FkVGVtcGxhdGUodHBsKX1cbiAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cInB4LTQgcHktMiBiZy1hbWJlci02MDAgaG92ZXI6YmctYW1iZXItNTAwIHRleHQtc2xhdGUtOTUwIGZvbnQtYmxhY2sgcm91bmRlZCB0ZXh0LXhzIHRyYW5zaXRpb24tYWxsIHNoYWRvdy1bMF8wXzEwcHhfcmdiYSgyNDUsMTU4LDExLDAuMildIGN1cnNvci1wb2ludGVyXCJcbiAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgICBMT0FEIFRFTVBMQVRFXG4gICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgKSl9XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgICl9XG4gICAgICA8L2Rpdj5cbiAgICA8L2Rpdj5cbiAgKTtcbn07XG5cbmNvbnN0IE1vYmlsZUNvbnRyb2xsZXIgPSAoKSA9PiB7XG4gIGNvbnN0IFttb3Rpb25UaWx0LCBzZXRNb3Rpb25UaWx0XSA9IHVzZVN0YXRlKGZhbHNlKTtcblxuICByZXR1cm4gKFxuICAgIDxkaXYgY2xhc3NOYW1lPVwiaC1mdWxsIGJnLXNsYXRlLTkwMCBwLTYgZmxleCBmbGV4LWNvbCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgZm9udC1tb25vIHRleHQteHNcIj5cbiAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInctNzIgYmctc2xhdGUtOTUwIGJvcmRlci00IGJvcmRlci1zbGF0ZS04MDAgcm91bmRlZC1bMi41cmVtXSBwLTQgZmxleCBmbGV4LWNvbCBnYXAtNCBzaGFkb3ctMnhsIHJlbGF0aXZlIG92ZXJmbG93LWhpZGRlblwiPlxuICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ3LTI0IGgtNCBiZy1zbGF0ZS04MDAgcm91bmRlZC1mdWxsIG14LWF1dG8gbWItMlwiIC8+XG4gICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXgganVzdGlmeS1iZXR3ZWVuIGl0ZW1zLWNlbnRlciBiZy1zbGF0ZS05MDAgcC0zIHJvdW5kZWQteGwgYm9yZGVyIGJvcmRlci1zbGF0ZS04MDBcIj5cbiAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1bMTBweF0gdGV4dC1zbGF0ZS00MDAgZm9udC1ib2xkXCI+UkVNSVggT1MgUkVNT1RFPC9zcGFuPlxuICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ3LTIgaC0yIHJvdW5kZWQtZnVsbCBiZy1lbWVyYWxkLTQwMCBhbmltYXRlLXB1bHNlXCIgLz5cbiAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImdyaWQgZ3JpZC1jb2xzLTIgZ2FwLTJcIj5cbiAgICAgICAgICAgPGJ1dHRvbiBvbkNsaWNrPXsoKSA9PiBhdWRpb0VuZ2luZS5zdGFydCgpfSBjbGFzc05hbWU9XCJweS00IGJnLWN5YW4tNjAwIGhvdmVyOmJnLWN5YW4tNTAwIHRleHQtd2hpdGUgcm91bmRlZC14bCBmb250LWJsYWNrIHNoYWRvdy1bMF8wXzEwcHhfcmdiYSg4LDE0NSwxNzgsMC4zKV1cIj5QTEFZPC9idXR0b24+XG4gICAgICAgICAgIDxidXR0b24gb25DbGljaz17KCkgPT4gYXVkaW9FbmdpbmUuc3RvcCgpfSBjbGFzc05hbWU9XCJweS00IGJnLXNsYXRlLTgwMCBob3ZlcjpiZy1zbGF0ZS03MDAgdGV4dC1zbGF0ZS0zMDAgcm91bmRlZC14bCBmb250LWJsYWNrXCI+U1RPUDwvYnV0dG9uPlxuICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiaC0zMiBiZy1zbGF0ZS05MDAgcm91bmRlZC14bCBib3JkZXIgYm9yZGVyLXNsYXRlLTgwMCByZWxhdGl2ZSBvdmVyZmxvdy1oaWRkZW4gZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgY3Vyc29yLWNyb3NzaGFpclwiPlxuICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImFic29sdXRlIGluc2V0LTAgb3BhY2l0eS0yNSBiZy1bcmFkaWFsLWdyYWRpZW50KGNpcmNsZV9hdF9jZW50ZXIsX3ZhcigtLXR3LWdyYWRpZW50LXN0b3BzKSldIGZyb20tY3lhbi00MDAgdmlhLXRyYW5zcGFyZW50IHRvLXRyYW5zcGFyZW50XCIgLz5cbiAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1bMTBweF0gdGV4dC1zbGF0ZS01MDBcIj5YWSBQRVJGT1JNQU5DRSBQQUQ8L3NwYW4+XG4gICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgPGJ1dHRvbiBcbiAgICAgICAgICAgb25DbGljaz17KCkgPT4gc2V0TW90aW9uVGlsdCghbW90aW9uVGlsdCl9XG4gICAgICAgICAgIGNsYXNzTmFtZT17YHB5LTMgcm91bmRlZC14bCBmb250LWJvbGQgdHJhbnNpdGlvbi1jb2xvcnMgJHttb3Rpb25UaWx0ID8gJ2JnLWVtZXJhbGQtNjAwIHRleHQtd2hpdGUgc2hhZG93LVswXzBfMTBweF8jMDU5NjY5XScgOiAnYmctc2xhdGUtODAwIHRleHQtc2xhdGUtNDAwJ31gfVxuICAgICAgICAgPlxuICAgICAgICAgICB7bW90aW9uVGlsdCA/ICdNT1RJT04gVElMVDogQUNUSVZFJyA6ICdFTkFCTEUgTU9USU9OIFRJTFQnfVxuICAgICAgICAgPC9idXR0b24+XG4gICAgICAgPC9kaXY+XG4gICAgPC9kaXY+XG4gICk7XG59O1xuXG5jb25zdCBMb29wZXIgPSAoKSA9PiB7XG4gIGNvbnN0IFt0cmFja3MsIHNldFRyYWNrc10gPSB1c2VTdGF0ZShbXG4gICAgeyBpZDogMSwgbmFtZTogXCJUcmFjayAxOiBHdWl0YXIgTG9vcFwiLCBzdGF0ZTogXCJwbGF5aW5nXCIsIHZvbDogMC44LCBtdXRlZDogZmFsc2UsIHNvbG9lZDogZmFsc2UgfSxcbiAgICB7IGlkOiAyLCBuYW1lOiBcIlRyYWNrIDI6IFZvY2FsIEhhcm1vbnlcIiwgc3RhdGU6IFwicmVjb3JkaW5nXCIsIHZvbDogMC44NSwgbXV0ZWQ6IGZhbHNlLCBzb2xvZWQ6IGZhbHNlIH0sXG4gICAgeyBpZDogMywgbmFtZTogXCJUcmFjayAzOiBTeW50aCBCYXNzXCIsIHN0YXRlOiBcImlkbGVcIiwgdm9sOiAwLjc1LCBtdXRlZDogdHJ1ZSwgc29sb2VkOiBmYWxzZSB9LFxuICAgIHsgaWQ6IDQsIG5hbWU6IFwiVHJhY2sgNDogUGVyY3Vzc2lvblwiLCBzdGF0ZTogXCJwbGF5aW5nXCIsIHZvbDogMC45LCBtdXRlZDogZmFsc2UsIHNvbG9lZDogZmFsc2UgfSxcbiAgXSk7XG4gIGNvbnN0IFtxdWFudGl6ZSwgc2V0UXVhbnRpemVdID0gdXNlU3RhdGUoXCIyIEJBUlNcIik7XG5cbiAgY29uc3QgdG9nZ2xlVHJhY2tTdGF0ZSA9IChpZDogbnVtYmVyKSA9PiB7XG4gICAgc2V0VHJhY2tzKHByZXYgPT4gcHJldi5tYXAodCA9PiB7XG4gICAgICBpZiAodC5pZCA9PT0gaWQpIHtcbiAgICAgICAgY29uc3QgbmV4dFN0YXRlID0gdC5zdGF0ZSA9PT0gJ3BsYXlpbmcnID8gJ3JlY29yZGluZycgOiB0LnN0YXRlID09PSAncmVjb3JkaW5nJyA/ICdpZGxlJyA6ICdwbGF5aW5nJztcbiAgICAgICAgcmV0dXJuIHsgLi4udCwgc3RhdGU6IG5leHRTdGF0ZSB9O1xuICAgICAgfVxuICAgICAgcmV0dXJuIHQ7XG4gICAgfSkpO1xuICB9O1xuXG4gIHJldHVybiAoXG4gICAgPGRpdiBjbGFzc05hbWU9XCJoLWZ1bGwgYmctc2xhdGUtOTAwIHAtNiBmbGV4IGZsZXgtY29sIGdhcC01IGZvbnQtbW9ubyB0ZXh0LXhzIHRleHQtc2xhdGUtMzAwIG92ZXJmbG93LXktYXV0b1wiPlxuICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBqdXN0aWZ5LWJldHdlZW4gaXRlbXMtY2VudGVyIGJnLXNsYXRlLTk1MCBwLTMgcm91bmRlZC1sZyBib3JkZXIgYm9yZGVyLXNsYXRlLTgwMCBzaGFkb3ctbWRcIj5cbiAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cImZvbnQtYmxhY2sgdHJhY2tpbmctd2lkZXN0IHRleHQtaW5kaWdvLTQwMCBmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMlwiPlxuICAgICAgICAgICA8UmVmcmVzaEN3IHNpemU9ezE2fSAvPiBMSVZFIEFVRElPIExPT1BFUiBTVEFUSU9OXG4gICAgICAgICA8L3NwYW4+XG4gICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0yXCI+XG4gICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtWzEwcHhdIHRleHQtc2xhdGUtNTAwXCI+UVVBTlRJWkU6PC9zcGFuPlxuICAgICAgICAgICB7W1wiMSBCQVJcIiwgXCIyIEJBUlNcIiwgXCI0IEJBUlNcIiwgXCI4IEJBUlNcIl0ubWFwKHEgPT4gKFxuICAgICAgICAgICAgIDxidXR0b24gXG4gICAgICAgICAgICAgICBrZXk9e3F9IFxuICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4gc2V0UXVhbnRpemUocSl9XG4gICAgICAgICAgICAgICBjbGFzc05hbWU9e2BweC0yIHB5LTAuNSByb3VuZGVkIHRleHQtWzEwcHhdIGZvbnQtYm9sZCAke3F1YW50aXplID09PSBxID8gJ2JnLWluZGlnby02MDAgdGV4dC13aGl0ZScgOiAnYmctc2xhdGUtODAwIHRleHQtc2xhdGUtNDAwJ31gfVxuICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgIHtxfVxuICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICApKX1cbiAgICAgICAgIDwvZGl2PlxuICAgICAgIDwvZGl2PlxuXG4gICAgICAgey8qIExvb3BlciBUcmFja3MgKi99XG4gICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGZsZXgtY29sIGdhcC0zXCI+XG4gICAgICAgICB7dHJhY2tzLm1hcCh0cmFjayA9PiAoXG4gICAgICAgICAgIDxkaXYga2V5PXt0cmFjay5pZH0gY2xhc3NOYW1lPVwiYmctc2xhdGUtOTUwIHAtNCByb3VuZGVkLXhsIGJvcmRlciBib3JkZXItc2xhdGUtODAwIGZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktYmV0d2VlbiBnYXAtNFwiPlxuICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTMgdy00OFwiPlxuICAgICAgICAgICAgICAgPGJ1dHRvbiBcbiAgICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4gdG9nZ2xlVHJhY2tTdGF0ZSh0cmFjay5pZCl9XG4gICAgICAgICAgICAgICAgIGNsYXNzTmFtZT17YHctMTAgaC0xMCByb3VuZGVkLXhsIGZvbnQtYmxhY2sgdGV4dC14cyB1cHBlcmNhc2UgZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgdHJhbnNpdGlvbi1hbGwgJHtcbiAgICAgICAgICAgICAgICAgICB0cmFjay5zdGF0ZSA9PT0gJ3JlY29yZGluZycgXG4gICAgICAgICAgICAgICAgICAgICA/ICdiZy1yZWQtNjAwIHRleHQtd2hpdGUgc2hhZG93LVswXzBfMTVweF8jZGMyNjI2XSBhbmltYXRlLXB1bHNlJyBcbiAgICAgICAgICAgICAgICAgICAgIDogdHJhY2suc3RhdGUgPT09ICdwbGF5aW5nJyBcbiAgICAgICAgICAgICAgICAgICAgID8gJ2JnLWluZGlnby02MDAgdGV4dC13aGl0ZSBzaGFkb3ctWzBfMF8xNXB4XyM0ZjQ2ZTVdJyBcbiAgICAgICAgICAgICAgICAgICAgIDogJ2JnLXNsYXRlLTgwMCB0ZXh0LXNsYXRlLTUwMCBob3ZlcjpiZy1zbGF0ZS03MDAnXG4gICAgICAgICAgICAgICAgIH1gfVxuICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICB7dHJhY2suc3RhdGUgPT09ICdyZWNvcmRpbmcnID8gJ1JFQycgOiB0cmFjay5zdGF0ZSA9PT0gJ3BsYXlpbmcnID8gJ1BMQVknIDogJ1NUT1AnfVxuICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggZmxleC1jb2wgdHJ1bmNhdGVcIj5cbiAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwiZm9udC1ib2xkIHRleHQtc2xhdGUtMjAwIHRydW5jYXRlXCI+e3RyYWNrLm5hbWV9PC9zcGFuPlxuICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9e2B0ZXh0LVs5cHhdIHVwcGVyY2FzZSAke3RyYWNrLnN0YXRlID09PSAncmVjb3JkaW5nJyA/ICd0ZXh0LXJlZC00MDAnIDogdHJhY2suc3RhdGUgPT09ICdwbGF5aW5nJyA/ICd0ZXh0LWluZGlnby00MDAnIDogJ3RleHQtc2xhdGUtNTAwJ31gfT5cbiAgICAgICAgICAgICAgICAgICBTdGF0dXM6IHt0cmFjay5zdGF0ZX1cbiAgICAgICAgICAgICAgICAgPC9zcGFuPlxuICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXgtMSBoLTggYmctc2xhdGUtOTAwIHJvdW5kZWQgYm9yZGVyIGJvcmRlci1zbGF0ZS04MDAgZmxleCBpdGVtcy1jZW50ZXIgcHgtMiByZWxhdGl2ZSBvdmVyZmxvdy1oaWRkZW5cIj5cbiAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJzb2x1dGUgaW5zZXQteS0wIGxlZnQtMS8zIHctMC41IGJnLWluZGlnby01MDAgei0xMFwiIC8+XG4gICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInctZnVsbCBmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMC41XCI+XG4gICAgICAgICAgICAgICAgIHtBcnJheS5mcm9tKHtsZW5ndGg6IDQwfSkubWFwKChfLCBpKSA9PiAoXG4gICAgICAgICAgICAgICAgICAgPGRpdiBrZXk9e2l9IGNsYXNzTmFtZT1cImZsZXgtMSBiZy1pbmRpZ28tNTAwLzQwIHJvdW5kZWQtc21cIiBzdHlsZT17eyBoZWlnaHQ6IGAke01hdGguc2luKGkvMikqNDAgKyA1MH0lYCB9fSAvPlxuICAgICAgICAgICAgICAgICApKX1cbiAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMlwiPlxuICAgICAgICAgICAgICAgPGJ1dHRvbiBcbiAgICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4gc2V0VHJhY2tzKHByZXYgPT4gcHJldi5tYXAodCA9PiB0LmlkID09PSB0cmFjay5pZCA/IHsgLi4udCwgbXV0ZWQ6ICF0Lm11dGVkIH0gOiB0KSl9XG4gICAgICAgICAgICAgICAgIGNsYXNzTmFtZT17YHB4LTMgcHktMS41IHJvdW5kZWQgdGV4dC1bMTBweF0gZm9udC1ib2xkICR7dHJhY2subXV0ZWQgPyAnYmctcmVkLTUwMCB0ZXh0LXdoaXRlJyA6ICdiZy1zbGF0ZS04MDAgdGV4dC1zbGF0ZS00MDAnfWB9XG4gICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgIE1cbiAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICAgPGJ1dHRvbiBcbiAgICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4gc2V0VHJhY2tzKHByZXYgPT4gcHJldi5tYXAodCA9PiB0LmlkID09PSB0cmFjay5pZCA/IHsgLi4udCwgc29sb2VkOiAhdC5zb2xvZWQgfSA6IHQpKX1cbiAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPXtgcHgtMyBweS0xLjUgcm91bmRlZCB0ZXh0LVsxMHB4XSBmb250LWJvbGQgJHt0cmFjay5zb2xvZWQgPyAnYmcteWVsbG93LTQwMCB0ZXh0LXNsYXRlLTk1MCcgOiAnYmctc2xhdGUtODAwIHRleHQtc2xhdGUtNDAwJ31gfVxuICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICBTXG4gICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICApKX1cbiAgICAgICA8L2Rpdj5cbiAgICA8L2Rpdj5cbiAgKTtcbn07XG5jb25zdCBTYW1wbGVyID0gKCkgPT4ge1xuICBjb25zdCBbbGF5ZXJzLCBzZXRMYXllcnNdID0gdXNlU3RhdGUoW1xuICAgIHsgaWQ6IDEsIG5hbWU6IFwiVm9jYWxfQ2hvcF9BLndhdlwiLCBsYXllck5hbWU6IFwiTEFZRVIgQSAoVHJhbnNpZW50KVwiLCBsb2FkZWQ6IHRydWUsIGR1cmF0aW9uOiBcIjEuNHNcIiwgdm9sdW1lOiA4NSwgcGl0Y2hPZmZzZXQ6IDAsIHBhbjogMCwgYWN0aXZlOiB0cnVlLCBidWZmZXI6IG51bGwgYXMgQXVkaW9CdWZmZXIgfCBudWxsLCBpc0RyYWdnaW5nOiBmYWxzZSB9LFxuICAgIHsgaWQ6IDIsIG5hbWU6IFwiODA4X1N1Yl9LaWNrLndhdlwiLCBsYXllck5hbWU6IFwiTEFZRVIgQiAoQm9keSlcIiwgbG9hZGVkOiB0cnVlLCBkdXJhdGlvbjogXCIwLjhzXCIsIHZvbHVtZTogOTAsIHBpdGNoT2Zmc2V0OiAwLCBwYW46IC0wLjIsIGFjdGl2ZTogdHJ1ZSwgYnVmZmVyOiBudWxsIGFzIEF1ZGlvQnVmZmVyIHwgbnVsbCwgaXNEcmFnZ2luZzogZmFsc2UgfSxcbiAgICB7IGlkOiAzLCBuYW1lOiBcIlNuYXJlX0NyaXNwLndhdlwiLCBsYXllck5hbWU6IFwiTEFZRVIgQyAoVGV4dHVyZSlcIiwgbG9hZGVkOiB0cnVlLCBkdXJhdGlvbjogXCIwLjVzXCIsIHZvbHVtZTogNzUsIHBpdGNoT2Zmc2V0OiAyLCBwYW46IDAuMiwgYWN0aXZlOiB0cnVlLCBidWZmZXI6IG51bGwgYXMgQXVkaW9CdWZmZXIgfCBudWxsLCBpc0RyYWdnaW5nOiBmYWxzZSB9LFxuICAgIHsgaWQ6IDQsIG5hbWU6IFwiRHJvcF9TeW50aF9TdGFiLndhdlwiLCBsYXllck5hbWU6IFwiTEFZRVIgRCAoRlgpXCIsIGxvYWRlZDogZmFsc2UsIGR1cmF0aW9uOiBcIkVtcHR5XCIsIHZvbHVtZTogNjAsIHBpdGNoT2Zmc2V0OiAwLCBwYW46IDAsIGFjdGl2ZTogZmFsc2UsIGJ1ZmZlcjogbnVsbCBhcyBBdWRpb0J1ZmZlciB8IG51bGwsIGlzRHJhZ2dpbmc6IGZhbHNlIH0sXG4gIF0pO1xuXG4gIGNvbnN0IFthZHNyLCBzZXRBZHNyXSA9IHVzZVN0YXRlKHsgYXR0YWNrOiAxNSwgZGVjYXk6IDQ1LCBzdXN0YWluOiA3MCwgcmVsZWFzZTogNTAgfSk7XG4gIGNvbnN0IFthY3RpdmVLZXlzLCBzZXRBY3RpdmVLZXlzXSA9IHVzZVN0YXRlPG51bWJlcltdPihbXSk7XG4gIGNvbnN0IGZpbGVJbnB1dFJlZnMgPSB1c2VSZWY8KEhUTUxJbnB1dEVsZW1lbnQgfCBudWxsKVtdPihbXSk7XG5cbiAgY29uc3QgaGFuZGxlQWRzckNoYW5nZSA9IChwYXJhbTogJ2F0dGFjaycgfCAnZGVjYXknIHwgJ3N1c3RhaW4nIHwgJ3JlbGVhc2UnLCB2YWw6IG51bWJlcikgPT4ge1xuICAgIGNvbnN0IHVwZGF0ZWQgPSB7IC4uLmFkc3IsIFtwYXJhbV06IHZhbCB9O1xuICAgIHNldEFkc3IodXBkYXRlZCk7XG4gICAgYXVkaW9FbmdpbmUuc2V0QURTUihwYXJhbSwgdmFsKTtcbiAgfTtcblxuICBjb25zdCBoYW5kbGVGaWxlVXBsb2FkID0gYXN5bmMgKGluZGV4OiBudW1iZXIsIGZpbGU6IEZpbGUpID0+IHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgYXJyYXlCdWZmZXIgPSBhd2FpdCBmaWxlLmFycmF5QnVmZmVyKCk7XG4gICAgICBjb25zdCBkZWNvZGVkQnVmZmVyID0gYXdhaXQgYXVkaW9FbmdpbmUuZGVjb2RlQXVkaW9EYXRhKGFycmF5QnVmZmVyKTtcbiAgICAgIGNvbnN0IGR1cmF0aW9uU3RyID0gZGVjb2RlZEJ1ZmZlciA/IGAke2RlY29kZWRCdWZmZXIuZHVyYXRpb24udG9GaXhlZCgxKX1zYCA6IFwiTG9hZGVkXCI7XG4gICAgICBcbiAgICAgIHNldExheWVycyhwcmV2ID0+IHByZXYubWFwKChsLCBpKSA9PiB7XG4gICAgICAgIGlmIChpID09PSBpbmRleCkge1xuICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAuLi5sLFxuICAgICAgICAgICAgbmFtZTogZmlsZS5uYW1lLFxuICAgICAgICAgICAgbG9hZGVkOiB0cnVlLFxuICAgICAgICAgICAgZHVyYXRpb246IGR1cmF0aW9uU3RyLFxuICAgICAgICAgICAgYnVmZmVyOiBkZWNvZGVkQnVmZmVyLFxuICAgICAgICAgICAgYWN0aXZlOiB0cnVlXG4gICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbDtcbiAgICAgIH0pKTtcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoXCJGYWlsZWQgdG8gbG9hZCBzYW1wbGU6XCIsIGVycik7XG4gICAgfVxuICB9O1xuXG4gIGNvbnN0IGhhbmRsZURyb3AgPSAoaW5kZXg6IG51bWJlciwgZTogUmVhY3QuRHJhZ0V2ZW50KSA9PiB7XG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgc2V0TGF5ZXJzKHByZXYgPT4gcHJldi5tYXAoKGwsIGkpID0+IGkgPT09IGluZGV4ID8geyAuLi5sLCBpc0RyYWdnaW5nOiBmYWxzZSB9IDogbCkpO1xuICAgIGlmIChlLmRhdGFUcmFuc2Zlci5maWxlcyAmJiBlLmRhdGFUcmFuc2Zlci5maWxlc1swXSkge1xuICAgICAgaGFuZGxlRmlsZVVwbG9hZChpbmRleCwgZS5kYXRhVHJhbnNmZXIuZmlsZXNbMF0pO1xuICAgIH1cbiAgfTtcblxuICBjb25zdCBoYW5kbGVEcmFnT3ZlciA9IChpbmRleDogbnVtYmVyLCBlOiBSZWFjdC5EcmFnRXZlbnQpID0+IHtcbiAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICBzZXRMYXllcnMocHJldiA9PiBwcmV2Lm1hcCgobCwgaSkgPT4gaSA9PT0gaW5kZXggPyB7IC4uLmwsIGlzRHJhZ2dpbmc6IHRydWUgfSA6IGwpKTtcbiAgfTtcblxuICBjb25zdCBoYW5kbGVEcmFnTGVhdmUgPSAoaW5kZXg6IG51bWJlciwgZTogUmVhY3QuRHJhZ0V2ZW50KSA9PiB7XG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgc2V0TGF5ZXJzKHByZXYgPT4gcHJldi5tYXAoKGwsIGkpID0+IGkgPT09IGluZGV4ID8geyAuLi5sLCBpc0RyYWdnaW5nOiBmYWxzZSB9IDogbCkpO1xuICB9O1xuXG4gIGNvbnN0IHVwZGF0ZUxheWVyUGFyYW0gPSAoaW5kZXg6IG51bWJlciwgcGFyYW06IHN0cmluZywgdmFsOiBhbnkpID0+IHtcbiAgICBzZXRMYXllcnMocHJldiA9PiBwcmV2Lm1hcCgobCwgaSkgPT4gaSA9PT0gaW5kZXggPyB7IC4uLmwsIFtwYXJhbV06IHZhbCB9IDogbCkpO1xuICB9O1xuXG4gIGNvbnN0IG5vdGVzID0gW1xuICAgIHsgbmFtZTogXCJDM1wiLCBmcmVxOiAxMzAuODEsIGlzQmxhY2s6IGZhbHNlIH0sXG4gICAgeyBuYW1lOiBcIkMjM1wiLCBmcmVxOiAxMzguNTksIGlzQmxhY2s6IHRydWUgfSxcbiAgICB7IG5hbWU6IFwiRDNcIiwgZnJlcTogMTQ2LjgzLCBpc0JsYWNrOiBmYWxzZSB9LFxuICAgIHsgbmFtZTogXCJEIzNcIiwgZnJlcTogMTU1LjU2LCBpc0JsYWNrOiB0cnVlIH0sXG4gICAgeyBuYW1lOiBcIkUzXCIsIGZyZXE6IDE2NC44MSwgaXNCbGFjazogZmFsc2UgfSxcbiAgICB7IG5hbWU6IFwiRjNcIiwgZnJlcTogMTc0LjYxLCBpc0JsYWNrOiBmYWxzZSB9LFxuICAgIHsgbmFtZTogXCJGIzNcIiwgZnJlcTogMTg1LjAwLCBpc0JsYWNrOiB0cnVlIH0sXG4gICAgeyBuYW1lOiBcIkczXCIsIGZyZXE6IDE5Ni4wMCwgaXNCbGFjazogZmFsc2UgfSxcbiAgICB7IG5hbWU6IFwiRyMzXCIsIGZyZXE6IDIwNy42NSwgaXNCbGFjazogdHJ1ZSB9LFxuICAgIHsgbmFtZTogXCJBM1wiLCBmcmVxOiAyMjAuMDAsIGlzQmxhY2s6IGZhbHNlIH0sXG4gICAgeyBuYW1lOiBcIkEjM1wiLCBmcmVxOiAyMzMuMDgsIGlzQmxhY2s6IHRydWUgfSxcbiAgICB7IG5hbWU6IFwiQjNcIiwgZnJlcTogMjQ2Ljk0LCBpc0JsYWNrOiBmYWxzZSB9LFxuICAgIHsgbmFtZTogXCJDNFwiLCBmcmVxOiAyNjEuNjMsIGlzQmxhY2s6IGZhbHNlIH0sXG4gICAgeyBuYW1lOiBcIkMjNFwiLCBmcmVxOiAyNzcuMTgsIGlzQmxhY2s6IHRydWUgfSxcbiAgICB7IG5hbWU6IFwiRDRcIiwgZnJlcTogMjkzLjY2LCBpc0JsYWNrOiBmYWxzZSB9LFxuICAgIHsgbmFtZTogXCJEIzRcIiwgZnJlcTogMzExLjEzLCBpc0JsYWNrOiB0cnVlIH0sXG4gICAgeyBuYW1lOiBcIkU0XCIsIGZyZXE6IDMyOS42MywgaXNCbGFjazogZmFsc2UgfSxcbiAgICB7IG5hbWU6IFwiRjRcIiwgZnJlcTogMzQ5LjIzLCBpc0JsYWNrOiBmYWxzZSB9LFxuICAgIHsgbmFtZTogXCJGIzRcIiwgZnJlcTogMzY5Ljk5LCBpc0JsYWNrOiB0cnVlIH0sXG4gICAgeyBuYW1lOiBcIkc0XCIsIGZyZXE6IDM5Mi4wMCwgaXNCbGFjazogZmFsc2UgfSxcbiAgICB7IG5hbWU6IFwiRyM0XCIsIGZyZXE6IDQxNS4zMCwgaXNCbGFjazogdHJ1ZSB9LFxuICAgIHsgbmFtZTogXCJBNFwiLCBmcmVxOiA0NDAuMDAsIGlzQmxhY2s6IGZhbHNlIH0sXG4gICAgeyBuYW1lOiBcIkEjNFwiLCBmcmVxOiA0NjYuMTYsIGlzQmxhY2s6IHRydWUgfSxcbiAgICB7IG5hbWU6IFwiQjRcIiwgZnJlcTogNDkzLjg4LCBpc0JsYWNrOiBmYWxzZSB9XG4gIF07XG5cbiAgY29uc3QgdHJpZ2dlck5vdGUgPSAobm90ZUluZGV4OiBudW1iZXIsIGZyZXE6IG51bWJlcikgPT4ge1xuICAgIHNldEFjdGl2ZUtleXMocHJldiA9PiBbLi4ucHJldiwgbm90ZUluZGV4XSk7XG4gICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICBzZXRBY3RpdmVLZXlzKHByZXYgPT4gcHJldi5maWx0ZXIoayA9PiBrICE9PSBub3RlSW5kZXgpKTtcbiAgICB9LCAzMDApO1xuXG4gICAgY29uc3QgbGF5ZXJTcGVjcyA9IGxheWVycy5tYXAobCA9PiAoe1xuICAgICAgYnVmZmVyOiBsLmJ1ZmZlcixcbiAgICAgIHZvbHVtZTogKGwudm9sdW1lIC8gMTAwKSAqIChsLmFjdGl2ZSA/IDEgOiAwKSxcbiAgICAgIHBpdGNoT2Zmc2V0OiBsLnBpdGNoT2Zmc2V0LFxuICAgICAgcGFuOiBsLnBhbixcbiAgICAgIGFjdGl2ZTogbC5hY3RpdmVcbiAgICB9KSk7XG5cbiAgICBhdWRpb0VuZ2luZS50cmlnZ2VyUG9seVZvaWNlKGZyZXEsIGxheWVyU3BlY3MsIGFkc3IpO1xuICB9O1xuXG4gIGNvbnN0IGdldEFkc3JTdmdQYXRoID0gKCkgPT4ge1xuICAgIGNvbnN0IGEgPSAoYWRzci5hdHRhY2sgLyAxMDApICogNjA7XG4gICAgY29uc3QgZCA9IChhZHNyLmRlY2F5IC8gMTAwKSAqIDYwO1xuICAgIGNvbnN0IHMgPSA1MCAtIChhZHNyLnN1c3RhaW4gLyAxMDApICogNDA7XG4gICAgY29uc3QgciA9IChhZHNyLnJlbGVhc2UgLyAxMDApICogODA7XG5cbiAgICBjb25zdCBzdGFydFggPSAxMDtcbiAgICBjb25zdCBhdHRhY2tYID0gc3RhcnRYICsgYTtcbiAgICBjb25zdCBkZWNheVggPSBhdHRhY2tYICsgZDtcbiAgICBjb25zdCBzdXN0YWluWCA9IGRlY2F5WCArIDQwO1xuICAgIGNvbnN0IHJlbGVhc2VYID0gc3VzdGFpblggKyByO1xuXG4gICAgcmV0dXJuIGBNICR7c3RhcnRYfSA1MCBMICR7YXR0YWNrWH0gMTAgTCAke2RlY2F5WH0gJHtzfSBMICR7c3VzdGFpblh9ICR7c30gTCAke3JlbGVhc2VYfSA1MGA7XG4gIH07XG5cbiAgcmV0dXJuIChcbiAgICA8ZGl2IGNsYXNzTmFtZT1cImgtZnVsbCBiZy1zbGF0ZS05MDAgcC01IGZsZXggZmxleC1jb2wgZ2FwLTQgZm9udC1tb25vIHRleHQteHMgdGV4dC1zbGF0ZS0zMDAgb3ZlcmZsb3cteS1hdXRvXCI+XG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXgganVzdGlmeS1iZXR3ZWVuIGl0ZW1zLWNlbnRlciBiZy1zbGF0ZS05NTAgcC0zIHJvdW5kZWQtbGcgYm9yZGVyIGJvcmRlci1zbGF0ZS04MDAgc2hhZG93LW1kXCI+XG4gICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cImZvbnQtYmxhY2sgdHJhY2tpbmctd2lkZXN0IHRleHQtdGVhbC00MDAgZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTJcIj5cbiAgICAgICAgICA8TXVzaWMgc2l6ZT17MTZ9IC8+IFBPTFlQSE9OSUMgTVVMVEktU0FNUExFIExBWUVSIEVOR0lORVxuICAgICAgICA8L3NwYW4+XG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTJcIj5cbiAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJweC0yIHB5LTAuNSBiZy10ZWFsLTk1MCB0ZXh0LXRlYWwtMzAwIHRleHQtWzEwcHhdIHJvdW5kZWQgYm9yZGVyIGJvcmRlci10ZWFsLTgwMCBmb250LWJvbGRcIj5cbiAgICAgICAgICAgIDQtTEFZRVIgUE9MWVBIT05JQ1xuICAgICAgICAgIDwvc3Bhbj5cbiAgICAgICAgPC9kaXY+XG4gICAgICA8L2Rpdj5cblxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJncmlkIGdyaWQtY29scy0yIGdhcC0zXCI+XG4gICAgICAgIHtsYXllcnMubWFwKChsYXllciwgaWR4KSA9PiAoXG4gICAgICAgICAgPGRpdlxuICAgICAgICAgICAga2V5PXtsYXllci5pZH1cbiAgICAgICAgICAgIG9uRHJhZ092ZXI9eyhlKSA9PiBoYW5kbGVEcmFnT3ZlcihpZHgsIGUpfVxuICAgICAgICAgICAgb25EcmFnTGVhdmU9eyhlKSA9PiBoYW5kbGVEcmFnTGVhdmUoaWR4LCBlKX1cbiAgICAgICAgICAgIG9uRHJvcD17KGUpID0+IGhhbmRsZURyb3AoaWR4LCBlKX1cbiAgICAgICAgICAgIGNsYXNzTmFtZT17YHAtMyByb3VuZGVkLXhsIGJvcmRlciB0cmFuc2l0aW9uLWFsbCBmbGV4IGZsZXgtY29sIGdhcC0yIHJlbGF0aXZlICR7XG4gICAgICAgICAgICAgIGxheWVyLmlzRHJhZ2dpbmdcbiAgICAgICAgICAgICAgICA/ICdiZy10ZWFsLTk1MC84MCBib3JkZXItdGVhbC00MDAgc2hhZG93LVswXzBfMjBweF8jMmRkNGJmXSdcbiAgICAgICAgICAgICAgICA6IGxheWVyLmFjdGl2ZVxuICAgICAgICAgICAgICAgID8gJ2JnLXNsYXRlLTk1MCBib3JkZXItc2xhdGUtODAwIGhvdmVyOmJvcmRlci1zbGF0ZS03MDAnXG4gICAgICAgICAgICAgICAgOiAnYmctc2xhdGUtOTUwLzUwIGJvcmRlci1zbGF0ZS05MDAgb3BhY2l0eS03MCdcbiAgICAgICAgICAgIH1gfVxuICAgICAgICAgID5cbiAgICAgICAgICAgIDxpbnB1dFxuICAgICAgICAgICAgICB0eXBlPVwiZmlsZVwiXG4gICAgICAgICAgICAgIGFjY2VwdD1cImF1ZGlvLypcIlxuICAgICAgICAgICAgICByZWY9e2VsID0+IHsgZmlsZUlucHV0UmVmcy5jdXJyZW50W2lkeF0gPSBlbDsgfX1cbiAgICAgICAgICAgICAgY2xhc3NOYW1lPVwiaGlkZGVuXCJcbiAgICAgICAgICAgICAgb25DaGFuZ2U9eyhlKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGUudGFyZ2V0LmZpbGVzICYmIGUudGFyZ2V0LmZpbGVzWzBdKSB7XG4gICAgICAgICAgICAgICAgICBoYW5kbGVGaWxlVXBsb2FkKGlkeCwgZS50YXJnZXQuZmlsZXNbMF0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfX1cbiAgICAgICAgICAgIC8+XG5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBqdXN0aWZ5LWJldHdlZW4gaXRlbXMtY2VudGVyXCI+XG4gICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtWzEwcHhdIHRleHQtdGVhbC00MDAgZm9udC1ib2xkXCI+e2xheWVyLmxheWVyTmFtZX08L3NwYW4+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTEuNVwiPlxuICAgICAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHVwZGF0ZUxheWVyUGFyYW0oaWR4LCAnYWN0aXZlJywgIWxheWVyLmFjdGl2ZSl9XG4gICAgICAgICAgICAgICAgICBjbGFzc05hbWU9e2BweC0xLjUgcHktMC41IHJvdW5kZWQgdGV4dC1bOXB4XSBmb250LWJvbGQgdXBwZXJjYXNlIHRyYW5zaXRpb24tY29sb3JzICR7XG4gICAgICAgICAgICAgICAgICAgIGxheWVyLmFjdGl2ZSA/ICdiZy10ZWFsLTYwMCB0ZXh0LXdoaXRlJyA6ICdiZy1zbGF0ZS04MDAgdGV4dC1zbGF0ZS01MDAnXG4gICAgICAgICAgICAgICAgICB9YH1cbiAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgICB7bGF5ZXIuYWN0aXZlID8gJ09OJyA6ICdNVVRFJ31cbiAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9e2B0ZXh0LVs5cHhdIHB4LTEuNSBweS0wLjUgcm91bmRlZCAke2xheWVyLmxvYWRlZCA/ICdiZy10ZWFsLTk1MCB0ZXh0LXRlYWwtNDAwIGJvcmRlciBib3JkZXItdGVhbC05MDAnIDogJ2JnLXNsYXRlLTgwMCB0ZXh0LXNsYXRlLTUwMCd9YH0+XG4gICAgICAgICAgICAgICAgICB7bGF5ZXIuZHVyYXRpb259XG4gICAgICAgICAgICAgICAgPC9zcGFuPlxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktYmV0d2VlbiBiZy1zbGF0ZS05MDAgcC0yIHJvdW5kZWQgYm9yZGVyIGJvcmRlci1zbGF0ZS04MDBcIj5cbiAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwiZm9udC1ib2xkIHRleHQtc2xhdGUtMjAwIHRydW5jYXRlIG1heC13LVsxNjBweF0gdGV4dC1bMTFweF1cIj57bGF5ZXIubmFtZX08L3NwYW4+XG4gICAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBmaWxlSW5wdXRSZWZzLmN1cnJlbnRbaWR4XT8uY2xpY2soKX1cbiAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJweC0yIHB5LTEgYmctdGVhbC05NTAgaG92ZXI6YmctdGVhbC05MDAgYm9yZGVyIGJvcmRlci10ZWFsLTgwMCB0ZXh0LXRlYWwtMzAwIHRleHQtWzlweF0gZm9udC1ib2xkIHJvdW5kZWQgdHJhbnNpdGlvbi1jb2xvcnNcIlxuICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgQlJPV1NFXG4gICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgIDxkaXZcbiAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4gZmlsZUlucHV0UmVmcy5jdXJyZW50W2lkeF0/LmNsaWNrKCl9XG4gICAgICAgICAgICAgIGNsYXNzTmFtZT1cInRleHQtWzlweF0gdGV4dC1zbGF0ZS01MDAgdGV4dC1jZW50ZXIgYm9yZGVyIGJvcmRlci1kYXNoZWQgYm9yZGVyLXNsYXRlLTgwMCBob3Zlcjpib3JkZXItdGVhbC01MDAvNTAgcm91bmRlZCBweS0xIGN1cnNvci1wb2ludGVyIHRyYW5zaXRpb24tY29sb3JzXCJcbiAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgRHJhZyAmIERyb3AgbG9jYWwgYXVkaW8gc2FtcGxlIGhlcmVcbiAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImdyaWQgZ3JpZC1jb2xzLTMgZ2FwLTEgcHQtMSBib3JkZXItdCBib3JkZXItc2xhdGUtOTAwXCI+XG4gICAgICAgICAgICAgIDxLbm9iXG4gICAgICAgICAgICAgICAgbGFiZWw9XCJWT0xcIlxuICAgICAgICAgICAgICAgIHZhbHVlPXtsYXllci52b2x1bWV9XG4gICAgICAgICAgICAgICAgY29sb3I9XCJ0ZWFsXCJcbiAgICAgICAgICAgICAgICBvbkNoYW5nZT17KHYpID0+IHVwZGF0ZUxheWVyUGFyYW0oaWR4LCAndm9sdW1lJywgdil9XG4gICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICAgIDxLbm9iXG4gICAgICAgICAgICAgICAgbGFiZWw9XCJQSVRDSFwiXG4gICAgICAgICAgICAgICAgdmFsdWU9eygobGF5ZXIucGl0Y2hPZmZzZXQgKyAxMikgLyAyNCkgKiAxMDB9XG4gICAgICAgICAgICAgICAgY29sb3I9XCJ0ZWFsXCJcbiAgICAgICAgICAgICAgICBvbkNoYW5nZT17KHYpID0+IHVwZGF0ZUxheWVyUGFyYW0oaWR4LCAncGl0Y2hPZmZzZXQnLCBNYXRoLnJvdW5kKCh2IC8gMTAwKSAqIDI0IC0gMTIpKX1cbiAgICAgICAgICAgICAgLz5cbiAgICAgICAgICAgICAgPEtub2JcbiAgICAgICAgICAgICAgICBsYWJlbD1cIlBBTlwiXG4gICAgICAgICAgICAgICAgdmFsdWU9eygobGF5ZXIucGFuICsgMSkgLyAyKSAqIDEwMH1cbiAgICAgICAgICAgICAgICBjb2xvcj1cInRlYWxcIlxuICAgICAgICAgICAgICAgIG9uQ2hhbmdlPXsodikgPT4gdXBkYXRlTGF5ZXJQYXJhbShpZHgsICdwYW4nLCAodiAvIDEwMCkgKiAyIC0gMSl9XG4gICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgKSl9XG4gICAgICA8L2Rpdj5cblxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJiZy1zbGF0ZS05NTAgcC00IHJvdW5kZWQteGwgYm9yZGVyIGJvcmRlci1zbGF0ZS04MDAgZmxleCBmbGV4LWNvbCBnYXAtM1wiPlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXgganVzdGlmeS1iZXR3ZWVuIGl0ZW1zLWNlbnRlciBib3JkZXItYiBib3JkZXItc2xhdGUtODAwIHBiLTJcIj5cbiAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LVsxMHB4XSB0ZXh0LXRlYWwtNDAwIGZvbnQtYm9sZCB0cmFja2luZy13aWRlc3RcIj5ERVRBSUxFRCBBRFNSIEFNUExJVFVERSBFTlZFTE9QRTwvc3Bhbj5cbiAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LVs5cHhdIHRleHQtc2xhdGUtNTAwIGZvbnQtbW9ub1wiPlxuICAgICAgICAgICAgQToge2Fkc3IuYXR0YWNrICogMTV9bXMgfCBEOiB7YWRzci5kZWNheSAqIDE1fW1zIHwgUzoge2Fkc3Iuc3VzdGFpbn0lIHwgUjoge2Fkc3IucmVsZWFzZSAqIDI1fW1zXG4gICAgICAgICAgPC9zcGFuPlxuICAgICAgICA8L2Rpdj5cblxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggZ2FwLTQgaXRlbXMtY2VudGVyXCI+XG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ3LTQ4IGgtMjAgYmctc2xhdGUtOTAwLzkwIHJvdW5kZWQtbGcgYm9yZGVyIGJvcmRlci1zbGF0ZS04MDAgcmVsYXRpdmUgb3ZlcmZsb3ctaGlkZGVuIGZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyXCI+XG4gICAgICAgICAgICA8c3ZnIGNsYXNzTmFtZT1cInctZnVsbCBoLWZ1bGwgcC0yXCIgdmlld0JveD1cIjAgMCAyNDAgNjBcIj5cbiAgICAgICAgICAgICAgPHBhdGggZD1cIk0gMCA1MCBMIDI0MCA1MFwiIHN0cm9rZT1cIiMxZTI5M2JcIiBzdHJva2VXaWR0aD1cIjFcIiAvPlxuICAgICAgICAgICAgICA8cGF0aFxuICAgICAgICAgICAgICAgIGQ9e2dldEFkc3JTdmdQYXRoKCl9XG4gICAgICAgICAgICAgICAgZmlsbD1cIm5vbmVcIlxuICAgICAgICAgICAgICAgIHN0cm9rZT1cIiMyZGQ0YmZcIlxuICAgICAgICAgICAgICAgIHN0cm9rZVdpZHRoPVwiMi41XCJcbiAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJkcm9wLXNoYWRvdy1bMF8wXzhweF8jMmRkNGJmXVwiXG4gICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICA8L3N2Zz5cbiAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleC0xIGZsZXgganVzdGlmeS1hcm91bmQgaXRlbXMtY2VudGVyXCI+XG4gICAgICAgICAgICA8S25vYiBsYWJlbD1cIkFUVEFDS1wiIHZhbHVlPXthZHNyLmF0dGFja30gY29sb3I9XCJlbWVyYWxkXCIgb25DaGFuZ2U9eyh2KSA9PiBoYW5kbGVBZHNyQ2hhbmdlKCdhdHRhY2snLCB2KX0gLz5cbiAgICAgICAgICAgIDxLbm9iIGxhYmVsPVwiREVDQVlcIiB2YWx1ZT17YWRzci5kZWNheX0gY29sb3I9XCJ0ZWFsXCIgb25DaGFuZ2U9eyh2KSA9PiBoYW5kbGVBZHNyQ2hhbmdlKCdkZWNheScsIHYpfSAvPlxuICAgICAgICAgICAgPEtub2IgbGFiZWw9XCJTVVNUQUlOXCIgdmFsdWU9e2Fkc3Iuc3VzdGFpbn0gY29sb3I9XCJ0ZWFsXCIgb25DaGFuZ2U9eyh2KSA9PiBoYW5kbGVBZHNyQ2hhbmdlKCdzdXN0YWluJywgdil9IC8+XG4gICAgICAgICAgICA8S25vYiBsYWJlbD1cIlJFTEVBU0VcIiB2YWx1ZT17YWRzci5yZWxlYXNlfSBjb2xvcj1cInRlYWxcIiBvbkNoYW5nZT17KHYpID0+IGhhbmRsZUFkc3JDaGFuZ2UoJ3JlbGVhc2UnLCB2KX0gLz5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgPC9kaXY+XG4gICAgICA8L2Rpdj5cblxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJiZy1zbGF0ZS05NTAgcC00IHJvdW5kZWQteGwgYm9yZGVyIGJvcmRlci1zbGF0ZS04MDAgZmxleCBmbGV4LWNvbCBnYXAtMlwiPlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXgganVzdGlmeS1iZXR3ZWVuIGl0ZW1zLWNlbnRlciB0ZXh0LVsxMHB4XSB0ZXh0LXNsYXRlLTQwMCBmb250LWJvbGRcIj5cbiAgICAgICAgICA8c3Bhbj5QT0xZUEhPTklDIFBMQVlCQUNLIEtFWUJPQVJEPC9zcGFuPlxuICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtdGVhbC00MDBcIj5NVUxUSS1OT1RFIFBPTFlQSE9OWSBBQ1RJVkU8L3NwYW4+XG4gICAgICAgIDwvZGl2PlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImgtMjAgZmxleCByZWxhdGl2ZSBiZy1zbGF0ZS05MDAgcm91bmRlZC1sZyBwLTEgb3ZlcmZsb3cteC1hdXRvIHNlbGVjdC1ub25lXCI+XG4gICAgICAgICAge25vdGVzLm1hcCgobm90ZSwgaWR4KSA9PiB7XG4gICAgICAgICAgICBjb25zdCBpc0FjdGl2ZSA9IGFjdGl2ZUtleXMuaW5jbHVkZXMoaWR4KTtcbiAgICAgICAgICAgIGlmICghbm90ZS5pc0JsYWNrKSB7XG4gICAgICAgICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgICAga2V5PXtpZHh9XG4gICAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiB0cmlnZ2VyTm90ZShpZHgsIG5vdGUuZnJlcSl9XG4gICAgICAgICAgICAgICAgICBjbGFzc05hbWU9e2BmbGV4LTEgbWluLXctWzI0cHhdIGgtZnVsbCByb3VuZGVkLWIgdHJhbnNpdGlvbi1hbGwgYm9yZGVyIGJvcmRlci1zbGF0ZS0zMDAvNDAgcmVsYXRpdmUgZmxleCBmbGV4LWNvbCBqdXN0aWZ5LWVuZCBwLTEgdGV4dC1bOHB4XSBmb250LWJvbGQgJHtcbiAgICAgICAgICAgICAgICAgICAgaXNBY3RpdmUgPyAnYmctdGVhbC00MDAgdGV4dC1zbGF0ZS05NTAgc2hhZG93LVswXzBfMTJweF8jMmRkNGJmXScgOiAnYmctc2xhdGUtMTAwIHRleHQtc2xhdGUtNzAwIGhvdmVyOmJnLXdoaXRlJ1xuICAgICAgICAgICAgICAgICAgfWB9XG4gICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICAgPHNwYW4+e25vdGUubmFtZX08L3NwYW4+XG4gICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgICAgIGtleT17aWR4fVxuICAgICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4gdHJpZ2dlck5vdGUoaWR4LCBub3RlLmZyZXEpfVxuICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPXtgdy00IGgtMTEgYmctc2xhdGUtOTAwIGJvcmRlciBib3JkZXItc2xhdGUtNzAwIHJvdW5kZWQtYiBhYnNvbHV0ZSB6LTEwIC1tbC0yIHRyYW5zaXRpb24tYWxsICR7XG4gICAgICAgICAgICAgICAgICAgIGlzQWN0aXZlID8gJ2JnLXRlYWwtNDAwIHNoYWRvdy1bMF8wXzEycHhfIzJkZDRiZl0nIDogJ2hvdmVyOmJnLXNsYXRlLTgwMCdcbiAgICAgICAgICAgICAgICAgIH1gfVxuICAgICAgICAgICAgICAgICAgc3R5bGU9e3sgbGVmdDogYCR7KGlkeCAqIDMuOCl9JWAgfX1cbiAgICAgICAgICAgICAgICAvPlxuICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pfVxuICAgICAgICA8L2Rpdj5cbiAgICAgIDwvZGl2PlxuICAgIDwvZGl2PlxuICApO1xufTtcblxuY29uc3QgUGFyYW1ldHJpY0VRID0gKCkgPT4ge1xuICBjb25zdCBbYmFuZHMsIHNldEJhbmRzXSA9IHVzZVN0YXRlKFtcbiAgICB7IG5hbWU6IFwiQkFORCAxIChMT1cpXCIsIGZyZXE6IDIwLCBnYWluOiA1MCwgcTogNjAsIGNvbG9yOiBcImVtZXJhbGRcIiB9LFxuICAgIHsgbmFtZTogXCJCQU5EIDIgKE1JRC1MT1cpXCIsIGZyZXE6IDQwLCBnYWluOiA0NSwgcTogNTAsIGNvbG9yOiBcImN5YW5cIiB9LFxuICAgIHsgbmFtZTogXCJCQU5EIDMgKE1JRC1ISUdIKVwiLCBmcmVxOiA2NSwgZ2FpbjogNTUsIHE6IDcwLCBjb2xvcjogXCJ2aW9sZXRcIiB9LFxuICAgIHsgbmFtZTogXCJCQU5EIDQgKEhJR0gpXCIsIGZyZXE6IDg1LCBnYWluOiA1MCwgcTogNDAsIGNvbG9yOiBcImFtYmVyXCIgfSxcbiAgXSk7XG5cbiAgY29uc3QgW3NwZWN0cnVtRGF0YSwgc2V0U3BlY3RydW1EYXRhXSA9IHVzZVN0YXRlPG51bWJlcltdPihBcnJheSgzMikuZmlsbCgxNSkpO1xuICBjb25zdCBjYW52YXNSZWYgPSB1c2VSZWY8SFRNTENhbnZhc0VsZW1lbnQ+KG51bGwpO1xuXG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgbGV0IGFuaW1hdGlvbkZyYW1lSWQ6IG51bWJlcjtcbiAgICBjb25zdCBmcmVxQnVmZmVyID0gbmV3IFVpbnQ4QXJyYXkoNjQpO1xuXG4gICAgY29uc3QgdXBkYXRlU3BlY3RydW0gPSAoKSA9PiB7XG4gICAgICBhdWRpb0VuZ2luZS5nZXRCeXRlRnJlcXVlbmN5RGF0YShmcmVxQnVmZmVyKTtcblxuICAgICAgY29uc3QgbmV3QmFyczogbnVtYmVyW10gPSBbXTtcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgMzI7IGkrKykge1xuICAgICAgICBjb25zdCB2YWwgPSBmcmVxQnVmZmVyW2kgKiAyXSB8fCAwO1xuICAgICAgICBjb25zdCBwZXJjZW50ID0gTWF0aC5tYXgoOCwgKHZhbCAvIDI1NSkgKiAxMDApO1xuICAgICAgICBuZXdCYXJzLnB1c2gocGVyY2VudCk7XG4gICAgICB9XG5cbiAgICAgIHNldFNwZWN0cnVtRGF0YShuZXdCYXJzKTtcblxuICAgICAgY29uc3QgY2FudmFzID0gY2FudmFzUmVmLmN1cnJlbnQ7XG4gICAgICBpZiAoY2FudmFzKSB7XG4gICAgICAgIGNvbnN0IGN0eCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuICAgICAgICBpZiAoY3R4KSB7XG4gICAgICAgICAgY3R4LmNsZWFyUmVjdCgwLCAwLCBjYW52YXMud2lkdGgsIGNhbnZhcy5oZWlnaHQpO1xuXG4gICAgICAgICAgY3R4LnN0cm9rZVN0eWxlID0gJ3JnYmEoMzAsIDQxLCA1OSwgMC40KSc7XG4gICAgICAgICAgY3R4LmxpbmVXaWR0aCA9IDE7XG4gICAgICAgICAgZm9yIChsZXQgeCA9IDA7IHggPD0gY2FudmFzLndpZHRoOyB4ICs9IGNhbnZhcy53aWR0aCAvIDgpIHtcbiAgICAgICAgICAgIGN0eC5iZWdpblBhdGgoKTtcbiAgICAgICAgICAgIGN0eC5tb3ZlVG8oeCwgMCk7XG4gICAgICAgICAgICBjdHgubGluZVRvKHgsIGNhbnZhcy5oZWlnaHQpO1xuICAgICAgICAgICAgY3R4LnN0cm9rZSgpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGN0eC5iZWdpblBhdGgoKTtcbiAgICAgICAgICBjdHguc3Ryb2tlU3R5bGUgPSAnIzM0ZDM5OSc7XG4gICAgICAgICAgY3R4LmxpbmVXaWR0aCA9IDIuNTtcbiAgICAgICAgICBjdHguc2hhZG93Qmx1ciA9IDEwO1xuICAgICAgICAgIGN0eC5zaGFkb3dDb2xvciA9ICcjMzRkMzk5JztcblxuICAgICAgICAgIGNvbnN0IHBvaW50cyA9IGJhbmRzLm1hcCgoYiwgaSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgeCA9IChpIC8gMykgKiAoY2FudmFzLndpZHRoIC0gNDApICsgMjA7XG4gICAgICAgICAgICBjb25zdCB5ID0gY2FudmFzLmhlaWdodCAtIChiLmdhaW4gLyAxMDApICogY2FudmFzLmhlaWdodDtcbiAgICAgICAgICAgIHJldHVybiB7IHgsIHkgfTtcbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIGN0eC5tb3ZlVG8oMCwgY2FudmFzLmhlaWdodCAvIDIpO1xuICAgICAgICAgIHBvaW50cy5mb3JFYWNoKChwdCwgaSkgPT4ge1xuICAgICAgICAgICAgaWYgKGkgPT09IDApIGN0eC5saW5lVG8ocHQueCwgcHQueSk7XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgY29uc3QgcHJldiA9IHBvaW50c1tpIC0gMV07XG4gICAgICAgICAgICAgIGNvbnN0IGN4ID0gKHByZXYueCArIHB0LngpIC8gMjtcbiAgICAgICAgICAgICAgY3R4LmJlemllckN1cnZlVG8oY3gsIHByZXYueSwgY3gsIHB0LnksIHB0LngsIHB0LnkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICAgIGN0eC5saW5lVG8oY2FudmFzLndpZHRoLCBjYW52YXMuaGVpZ2h0IC8gMik7XG4gICAgICAgICAgY3R4LnN0cm9rZSgpO1xuXG4gICAgICAgICAgcG9pbnRzLmZvckVhY2goKHB0KSA9PiB7XG4gICAgICAgICAgICBjdHguYmVnaW5QYXRoKCk7XG4gICAgICAgICAgICBjdHguZmlsbFN0eWxlID0gJyMyMmQzZWUnO1xuICAgICAgICAgICAgY3R4LmFyYyhwdC54LCBwdC55LCA1LCAwLCBNYXRoLlBJICogMik7XG4gICAgICAgICAgICBjdHguZmlsbCgpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGFuaW1hdGlvbkZyYW1lSWQgPSByZXF1ZXN0QW5pbWF0aW9uRnJhbWUodXBkYXRlU3BlY3RydW0pO1xuICAgIH07XG5cbiAgICB1cGRhdGVTcGVjdHJ1bSgpO1xuXG4gICAgcmV0dXJuICgpID0+IGNhbmNlbEFuaW1hdGlvbkZyYW1lKGFuaW1hdGlvbkZyYW1lSWQpO1xuICB9LCBbYmFuZHNdKTtcblxuICBjb25zdCBoYW5kbGVCYW5kQ2hhbmdlID0gKGJhbmRJZHg6IG51bWJlciwgcGFyYW06ICdmcmVxJyB8ICdnYWluJyB8ICdxJywgdmFsdWU6IG51bWJlcikgPT4ge1xuICAgIGNvbnN0IHVwZGF0ZWQgPSBbLi4uYmFuZHNdO1xuICAgIHVwZGF0ZWRbYmFuZElkeF0gPSB7IC4uLnVwZGF0ZWRbYmFuZElkeF0sIFtwYXJhbV06IHZhbHVlIH07XG4gICAgc2V0QmFuZHModXBkYXRlZCk7XG4gICAgYXVkaW9FbmdpbmUuc2V0RVFCYW5kKGJhbmRJZHgsIHBhcmFtLCB2YWx1ZSk7XG4gIH07XG5cbiAgcmV0dXJuIChcbiAgICA8ZGl2IGNsYXNzTmFtZT1cImgtZnVsbCBiZy1zbGF0ZS05MDAgcC02IGZsZXggZmxleC1jb2wgZ2FwLTUgZm9udC1tb25vIHRleHQteHMgdGV4dC1zbGF0ZS0zMDAgb3ZlcmZsb3cteS1hdXRvXCI+XG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXgganVzdGlmeS1iZXR3ZWVuIGl0ZW1zLWNlbnRlciBiZy1zbGF0ZS05NTAgcC0zIHJvdW5kZWQtbGcgYm9yZGVyIGJvcmRlci1zbGF0ZS04MDAgc2hhZG93LW1kXCI+XG4gICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cImZvbnQtYmxhY2sgdHJhY2tpbmctd2lkZXN0IHRleHQtZW1lcmFsZC0zMDAgZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTJcIj5cbiAgICAgICAgICA8QmFyQ2hhcnQgc2l6ZT17MTZ9IC8+IFBSTyBQQVJBTUVUUklDIEVRIDQtQkFORCAoUkVBTC1USU1FIFNQRUNUUkFMIEFOQUxZWkVSKVxuICAgICAgICA8L3NwYW4+XG4gICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInB4LTIgcHktMC41IGJnLWVtZXJhbGQtOTUwIHRleHQtZW1lcmFsZC00MDAgdGV4dC1bMTBweF0gcm91bmRlZCBib3JkZXIgYm9yZGVyLWVtZXJhbGQtOTAwIGZvbnQtYm9sZFwiPlxuICAgICAgICAgIEFOQUxZU0VSIEFDVElWRVxuICAgICAgICA8L3NwYW4+XG4gICAgICA8L2Rpdj5cblxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJiZy1zbGF0ZS05NTAgcC00IHJvdW5kZWQteGwgYm9yZGVyIGJvcmRlci1zbGF0ZS04MDAgZmxleCBmbGV4LWNvbCBnYXAtMiByZWxhdGl2ZSBvdmVyZmxvdy1oaWRkZW4gc2hhZG93LWlubmVyXCI+XG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBqdXN0aWZ5LWJldHdlZW4gdGV4dC1bOXB4XSB0ZXh0LXNsYXRlLTUwMCBweC0xIGZvbnQtYm9sZFwiPlxuICAgICAgICAgIDxzcGFuPjIwSHogKFNVQik8L3NwYW4+XG4gICAgICAgICAgPHNwYW4+MTAwSHogKEJBU1MpPC9zcGFuPlxuICAgICAgICAgIDxzcGFuPjUwMEh6IChNSUQpPC9zcGFuPlxuICAgICAgICAgIDxzcGFuPjJrSHogKFBSRVNFTkNFKTwvc3Bhbj5cbiAgICAgICAgICA8c3Bhbj44a0h6IChUUkVCTEUpPC9zcGFuPlxuICAgICAgICAgIDxzcGFuPjIwa0h6IChBSVIpPC9zcGFuPlxuICAgICAgICA8L2Rpdj5cblxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImgtMzIgcmVsYXRpdmUgZmxleCBpdGVtcy1lbmQgZ2FwLTEgcHgtMSBwdC0yXCI+XG4gICAgICAgICAgPGNhbnZhc1xuICAgICAgICAgICAgcmVmPXtjYW52YXNSZWZ9XG4gICAgICAgICAgICB3aWR0aD17NjAwfVxuICAgICAgICAgICAgaGVpZ2h0PXsxMjh9XG4gICAgICAgICAgICBjbGFzc05hbWU9XCJhYnNvbHV0ZSBpbnNldC0wIHctZnVsbCBoLWZ1bGwgcG9pbnRlci1ldmVudHMtbm9uZSB6LTEwXCJcbiAgICAgICAgICAvPlxuXG4gICAgICAgICAge3NwZWN0cnVtRGF0YS5tYXAoKHZhbCwgaSkgPT4gKFxuICAgICAgICAgICAgPGRpdiBrZXk9e2l9IGNsYXNzTmFtZT1cImZsZXgtMSBoLWZ1bGwgZmxleCBmbGV4LWNvbCBqdXN0aWZ5LWVuZCByZWxhdGl2ZVwiPlxuICAgICAgICAgICAgICA8ZGl2XG4gICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwidy1mdWxsIGJnLWdyYWRpZW50LXRvLXQgZnJvbS1lbWVyYWxkLTYwMCB2aWEtY3lhbi00MDAgdG8tYW1iZXItMzAwIHJvdW5kZWQtdC1zbSB0cmFuc2l0aW9uLWFsbCBkdXJhdGlvbi03NSBzaGFkb3ctWzBfMF84cHhfcmdiYSg1MiwyMTEsMTUzLDAuMyldXCJcbiAgICAgICAgICAgICAgICBzdHlsZT17eyBoZWlnaHQ6IGAke3ZhbH0lYCB9fVxuICAgICAgICAgICAgICAvPlxuICAgICAgICAgICAgICA8ZGl2XG4gICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwidy1mdWxsIGgtMC41IGJnLWFtYmVyLTIwMCBzaGFkb3ctWzBfMF81cHhfI2ZkZTA0N10gYWJzb2x1dGUgdG9wLTAgdHJhbnNpdGlvbi1hbGwgZHVyYXRpb24tMTUwIG9wYWNpdHktODBcIlxuICAgICAgICAgICAgICAgIHN0eWxlPXt7IGJvdHRvbTogYCR7TWF0aC5taW4oOTgsIHZhbCArIDIpfSVgIH19XG4gICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICApKX1cbiAgICAgICAgPC9kaXY+XG4gICAgICA8L2Rpdj5cblxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJncmlkIGdyaWQtY29scy00IGdhcC0zXCI+XG4gICAgICAgIHtiYW5kcy5tYXAoKGJhbmQsIGlkeCkgPT4gKFxuICAgICAgICAgIDxkaXYga2V5PXtpZHh9IGNsYXNzTmFtZT1cImJnLXNsYXRlLTk1MCBwLTMgcm91bmRlZC14bCBib3JkZXIgYm9yZGVyLXNsYXRlLTgwMCBmbGV4IGZsZXgtY29sIGl0ZW1zLWNlbnRlciBnYXAtMyBzaGFkb3ctbGdcIj5cbiAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtWzlweF0gZm9udC1ib2xkIHRleHQtc2xhdGUtNDAwIHRleHQtY2VudGVyIHRyYWNraW5nLXdpZGVyXCI+e2JhbmQubmFtZX08L3NwYW4+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggZmxleC1jb2wgZ2FwLTMgaXRlbXMtY2VudGVyXCI+XG4gICAgICAgICAgICAgIDxLbm9iIGxhYmVsPVwiRlJFUVwiIHZhbHVlPXtiYW5kLmZyZXF9IGNvbG9yPXtiYW5kLmNvbG9yfSBvbkNoYW5nZT17KHYpID0+IGhhbmRsZUJhbmRDaGFuZ2UoaWR4LCAnZnJlcScsIHYpfSAvPlxuICAgICAgICAgICAgICA8S25vYiBsYWJlbD1cIkdBSU5cIiB2YWx1ZT17YmFuZC5nYWlufSBjb2xvcj17YmFuZC5jb2xvcn0gb25DaGFuZ2U9eyh2KSA9PiBoYW5kbGVCYW5kQ2hhbmdlKGlkeCwgJ2dhaW4nLCB2KX0gLz5cbiAgICAgICAgICAgICAgPEtub2IgbGFiZWw9XCJRXCIgdmFsdWU9e2JhbmQucX0gY29sb3I9e2JhbmQuY29sb3J9IG9uQ2hhbmdlPXsodikgPT4gaGFuZGxlQmFuZENoYW5nZShpZHgsICdxJywgdil9IC8+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgKSl9XG4gICAgICA8L2Rpdj5cbiAgICA8L2Rpdj5cbiAgKTtcbn07XG5jb25zdCBWb2ljZVRyYWluZXIgPSAoKSA9PiB7XG4gIGNvbnN0IFt0YXJnZXROb3RlLCBzZXRUYXJnZXROb3RlXSA9IHVzZVN0YXRlKFwiQTRcIik7XG4gIGNvbnN0IFtkZXRlY3RlZE5vdGUsIHNldGRldGVjdGVkTm90ZV0gPSB1c2VTdGF0ZShcIkE0ICg0NDAuMiBIeilcIik7XG4gIGNvbnN0IFthY2N1cmFjeSwgc2V0QWNjdXJhY3ldID0gdXNlU3RhdGUoOTQpO1xuICBjb25zdCBbaXNUcmFpbmluZywgc2V0SXNUcmFpbmluZ10gPSB1c2VTdGF0ZSh0cnVlKTtcblxuICByZXR1cm4gKFxuICAgIDxkaXYgY2xhc3NOYW1lPVwiaC1mdWxsIGJnLXNsYXRlLTkwMCBwLTYgZmxleCBmbGV4LWNvbCBnYXAtNSBmb250LW1vbm8gdGV4dC14cyB0ZXh0LXNsYXRlLTMwMCBvdmVyZmxvdy15LWF1dG9cIj5cbiAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXgganVzdGlmeS1iZXR3ZWVuIGl0ZW1zLWNlbnRlciBiZy1zbGF0ZS05NTAgcC0zIHJvdW5kZWQtbGcgYm9yZGVyIGJvcmRlci1zbGF0ZS04MDAgc2hhZG93LW1kXCI+XG4gICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJmb250LWJsYWNrIHRyYWNraW5nLXdpZGVzdCB0ZXh0LXJvc2UtNDAwIGZsZXggaXRlbXMtY2VudGVyIGdhcC0yXCI+XG4gICAgICAgICAgIDxNaWMyIHNpemU9ezE2fSAvPiBWT0lDRSBQSVRDSCBUUkFJTkVSICYgVFVORVJcbiAgICAgICAgIDwvc3Bhbj5cbiAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInB4LTIgcHktMC41IGJnLXJvc2UtOTUwIHRleHQtcm9zZS00MDAgdGV4dC1bMTBweF0gcm91bmRlZCBib3JkZXIgYm9yZGVyLXJvc2UtOTAwXCI+VFVORVIgQUNUSVZFPC9zcGFuPlxuICAgICAgIDwvZGl2PlxuXG4gICAgICAgey8qIFR1bmVyIERpc3BsYXkgKi99XG4gICAgICAgPGRpdiBjbGFzc05hbWU9XCJiZy1zbGF0ZS05NTAgcC02IHJvdW5kZWQteGwgYm9yZGVyIGJvcmRlci1zbGF0ZS04MDAgZmxleCBmbGV4LWNvbCBpdGVtcy1jZW50ZXIgZ2FwLTQgc2hhZG93LWlubmVyXCI+XG4gICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LVsxMHB4XSB0ZXh0LXNsYXRlLTUwMCB1cHBlcmNhc2UgZm9udC1ib2xkXCI+REVURUNURUQgUElUQ0g8L3NwYW4+XG4gICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInRleHQtNHhsIGZvbnQtYmxhY2sgdGV4dC1yb3NlLTQwMCB0cmFja2luZy13aWRlciBkcm9wLXNoYWRvdy1bMF8wXzEwcHhfcmdiYSgyNDQsNjMsOTQsMC40KV1cIj5cbiAgICAgICAgICAge2RldGVjdGVkTm90ZX1cbiAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICB7LyogQ2VudGVyIE5lZWRsZSBNZXRlciAqL31cbiAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwidy1mdWxsIG1heC13LXNtIGgtMTIgYmctc2xhdGUtOTAwIHJvdW5kZWQteGwgYm9yZGVyIGJvcmRlci1zbGF0ZS04MDAgcmVsYXRpdmUgZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgb3ZlcmZsb3ctaGlkZGVuXCI+XG4gICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJzb2x1dGUgaW5zZXQteC0wIHRvcC0xLzIgaC0wLjUgYmctc2xhdGUtODAwXCIgLz5cbiAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYnNvbHV0ZSB0b3AtMCBib3R0b20tMCB3LTEgYmctcm9zZS01MDAgc2hhZG93LVswXzBfMTBweF8jZjQzZjVlXSBsZWZ0LVs1MiVdXCIgLz5cbiAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYnNvbHV0ZSBpbnNldC15LTAgbGVmdC0xLzIgdy0wLjUgYmctZW1lcmFsZC00MDBcIiAvPlxuICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXgganVzdGlmeS1iZXR3ZWVuIHctZnVsbCBweC00IHRleHQtWzlweF0gdGV4dC1zbGF0ZS01MDAgZm9udC1ib2xkIHotMTBcIj5cbiAgICAgICAgICAgICA8c3Bhbj4tNTBjdDwvc3Bhbj5cbiAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LWVtZXJhbGQtNDAwXCI+MGN0IChJTiBUVU5FKTwvc3Bhbj5cbiAgICAgICAgICAgICA8c3Bhbj4rNTBjdDwvc3Bhbj5cbiAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtNCB3LWZ1bGwganVzdGlmeS1iZXR3ZWVuIHB0LTJcIj5cbiAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGZsZXgtY29sXCI+XG4gICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1bOXB4XSB0ZXh0LXNsYXRlLTUwMFwiPlRBUkdFVCBOT1RFPC9zcGFuPlxuICAgICAgICAgICAgIDxzZWxlY3QgXG4gICAgICAgICAgICAgICB2YWx1ZT17dGFyZ2V0Tm90ZX0gXG4gICAgICAgICAgICAgICBvbkNoYW5nZT17ZSA9PiBzZXRUYXJnZXROb3RlKGUudGFyZ2V0LnZhbHVlKX1cbiAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cImJnLXNsYXRlLTkwMCBib3JkZXIgYm9yZGVyLXNsYXRlLTgwMCByb3VuZGVkIHB4LTIgcHktMSB0ZXh0LXJvc2UtMzAwIGZvbnQtYm9sZCBvdXRsaW5lLW5vbmVcIlxuICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgIHtbXCJDNFwiLCBcIkQ0XCIsIFwiRTRcIiwgXCJGNFwiLCBcIkc0XCIsIFwiQTRcIiwgXCJCNFwiXS5tYXAobiA9PiA8b3B0aW9uIGtleT17bn0gdmFsdWU9e259PntufTwvb3B0aW9uPil9XG4gICAgICAgICAgICAgPC9zZWxlY3Q+XG4gICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggZmxleC1jb2wgaXRlbXMtZW5kXCI+XG4gICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1bOXB4XSB0ZXh0LXNsYXRlLTUwMFwiPkFDQ1VSQUNZIFNDT1JFPC9zcGFuPlxuICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtZW1lcmFsZC00MDAgZm9udC1ib2xkIHRleHQtc21cIj57YWNjdXJhY3l9JSBJTiBUVU5FPC9zcGFuPlxuICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgIDwvZGl2PlxuICAgICAgIDwvZGl2PlxuXG4gICAgICAgPGJ1dHRvbiBcbiAgICAgICAgIG9uQ2xpY2s9eygpID0+IHNldElzVHJhaW5pbmcoIWlzVHJhaW5pbmcpfVxuICAgICAgICAgY2xhc3NOYW1lPXtgdy1mdWxsIHB5LTMgcm91bmRlZC14bCBmb250LWJsYWNrIHRyYWNraW5nLXdpZGVzdCB0cmFuc2l0aW9uLWFsbCAke2lzVHJhaW5pbmcgPyAnYmctcm9zZS02MDAgaG92ZXI6Ymctcm9zZS01MDAgdGV4dC13aGl0ZSBzaGFkb3ctWzBfMF8xNXB4X3JnYmEoMjQ0LDYzLDk0LDAuNCldJyA6ICdiZy1zbGF0ZS04MDAgdGV4dC1zbGF0ZS00MDAnfWB9XG4gICAgICAgPlxuICAgICAgICAge2lzVHJhaW5pbmcgPyAnU1RPUCBWT0lDRSBQUkFDVElDRSBTRVNTSU9OJyA6ICdTVEFSVCBWT0lDRSBQUkFDVElDRSBTRVNTSU9OJ31cbiAgICAgICA8L2J1dHRvbj5cbiAgICA8L2Rpdj5cbiAgKTtcbn07XG5cbmNvbnN0IFZvaWNlQ2hhbmdlciA9ICgpID0+IHtcbiAgY29uc3QgW3ByZXNldCwgc2V0UHJlc2V0XSA9IHVzZVN0YXRlKFwiUm9ib3RpY1wiKTtcbiAgY29uc3QgW2Zvcm1hbnQsIHNldEZvcm1hbnRdID0gdXNlU3RhdGUoNTApO1xuICBjb25zdCBbcGl0Y2hTaGlmdCwgc2V0UGl0Y2hTaGlmdF0gPSB1c2VTdGF0ZSgwKTtcblxuICByZXR1cm4gKFxuICAgIDxkaXYgY2xhc3NOYW1lPVwiaC1mdWxsIGJnLXNsYXRlLTkwMCBwLTYgZmxleCBmbGV4LWNvbCBnYXAtNSBmb250LW1vbm8gdGV4dC14cyB0ZXh0LXNsYXRlLTMwMCBvdmVyZmxvdy15LWF1dG9cIj5cbiAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXgganVzdGlmeS1iZXR3ZWVuIGl0ZW1zLWNlbnRlciBiZy1zbGF0ZS05NTAgcC0zIHJvdW5kZWQtbGcgYm9yZGVyIGJvcmRlci1zbGF0ZS04MDAgc2hhZG93LW1kXCI+XG4gICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJmb250LWJsYWNrIHRyYWNraW5nLXdpZGVzdCB0ZXh0LXB1cnBsZS00MDAgZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTJcIj5cbiAgICAgICAgICAgPE1pYzIgc2l6ZT17MTZ9IC8+IFZPQ0FMIFRSQU5TRk9STUVSICYgRlhcbiAgICAgICAgIDwvc3Bhbj5cbiAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInB4LTIgcHktMC41IGJnLXB1cnBsZS05NTAgdGV4dC1wdXJwbGUtNDAwIHRleHQtWzEwcHhdIHJvdW5kZWQgYm9yZGVyIGJvcmRlci1wdXJwbGUtOTAwXCI+RFNQIFJBQ0s8L3NwYW4+XG4gICAgICAgPC9kaXY+XG5cbiAgICAgICB7LyogUHJlc2V0cyBHcmlkICovfVxuICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZ3JpZCBncmlkLWNvbHMtNCBnYXAtMlwiPlxuICAgICAgICAge1tcIkNsZWFuXCIsIFwiUm9ib3RpY1wiLCBcIk1lZ2FwaG9uZVwiLCBcIkRlbW9uIERlZXBcIl0ubWFwKHAgPT4gKFxuICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAga2V5PXtwfVxuICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHNldFByZXNldChwKX1cbiAgICAgICAgICAgICBjbGFzc05hbWU9e2BweS0yIHJvdW5kZWQtbGcgZm9udC1ib2xkIHRyYW5zaXRpb24tYWxsIGJvcmRlciAke1xuICAgICAgICAgICAgICAgcHJlc2V0ID09PSBwIFxuICAgICAgICAgICAgICAgICA/ICdiZy1wdXJwbGUtNjAwLzIwIHRleHQtcHVycGxlLTMwMCBib3JkZXItcHVycGxlLTUwMCBzaGFkb3ctWzBfMF8xMHB4X3JnYmEoMTY4LDg1LDI0NywwLjIpXScgXG4gICAgICAgICAgICAgICAgIDogJ2JnLXNsYXRlLTk1MCB0ZXh0LXNsYXRlLTQwMCBib3JkZXItc2xhdGUtODAwIGhvdmVyOmJvcmRlci1zbGF0ZS03MDAnXG4gICAgICAgICAgICAgfWB9XG4gICAgICAgICAgID5cbiAgICAgICAgICAgICB7cH1cbiAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICApKX1cbiAgICAgICA8L2Rpdj5cblxuICAgICAgIHsvKiBLbm9icyAmIFNsaWRlcnMgKi99XG4gICAgICAgPGRpdiBjbGFzc05hbWU9XCJncmlkIGdyaWQtY29scy0yIGdhcC00XCI+XG4gICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImJnLXNsYXRlLTk1MCBwLTQgcm91bmRlZC14bCBib3JkZXIgYm9yZGVyLXNsYXRlLTgwMCBmbGV4IGZsZXgtY29sIGl0ZW1zLWNlbnRlciBnYXAtNFwiPlxuICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LVsxMHB4XSB0ZXh0LXB1cnBsZS00MDAgZm9udC1ib2xkIHRyYWNraW5nLXdpZGVzdCBib3JkZXItYiBib3JkZXItc2xhdGUtODAwIHBiLTIgdy1mdWxsIHRleHQtY2VudGVyXCI+Rk9STUFOVCBTSElGVDwvc3Bhbj5cbiAgICAgICAgICAgPEtub2IgbGFiZWw9XCJGT1JNQU5UXCIgdmFsdWU9e2Zvcm1hbnR9IGNvbG9yPVwidmlvbGV0XCIgb25DaGFuZ2U9eyh2KSA9PiBzZXRGb3JtYW50KHYpfSAvPlxuICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYmctc2xhdGUtOTUwIHAtNCByb3VuZGVkLXhsIGJvcmRlciBib3JkZXItc2xhdGUtODAwIGZsZXggZmxleC1jb2wgaXRlbXMtY2VudGVyIGdhcC00XCI+XG4gICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtWzEwcHhdIHRleHQtcHVycGxlLTQwMCBmb250LWJvbGQgdHJhY2tpbmctd2lkZXN0IGJvcmRlci1iIGJvcmRlci1zbGF0ZS04MDAgcGItMiB3LWZ1bGwgdGV4dC1jZW50ZXJcIj5QSVRDSCBUUkFOU1BPU0lUSU9OPC9zcGFuPlxuICAgICAgICAgICA8S25vYiBsYWJlbD1cIlNFTUlUT05FU1wiIHZhbHVlPXtwaXRjaFNoaWZ0ICsgNTB9IGNvbG9yPVwidmlvbGV0XCIgb25DaGFuZ2U9eyh2KSA9PiBzZXRQaXRjaFNoaWZ0KHYgLSA1MCl9IC8+XG4gICAgICAgICA8L2Rpdj5cbiAgICAgICA8L2Rpdj5cblxuICAgICAgIHsvKiBGcmVxdWVuY3kgU3BlY3RydW0gVmlzdWFsaXplciAqL31cbiAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImJnLXNsYXRlLTk1MCBwLTQgcm91bmRlZC14bCBib3JkZXIgYm9yZGVyLXNsYXRlLTgwMCBmbGV4IGZsZXgtY29sIGdhcC0yIHNoYWRvdy1pbm5lclwiPlxuICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1bMTBweF0gdGV4dC1zbGF0ZS01MDBcIj5SRUFMVElNRSBWT0NBTCBGT1JNQU5UIFNQRUNUUlVNPC9zcGFuPlxuICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJoLTIwIGZsZXggaXRlbXMtZW5kIGdhcC0xXCI+XG4gICAgICAgICAgIHtBcnJheS5mcm9tKHtsZW5ndGg6IDMwfSkubWFwKChfLCBpKSA9PiAoXG4gICAgICAgICAgICAgPGRpdiBrZXk9e2l9IGNsYXNzTmFtZT1cImZsZXgtMSBiZy1ncmFkaWVudC10by10IGZyb20tcHVycGxlLTYwMCB0by1pbmRpZ28tNDAwIHJvdW5kZWQtdC1zbVwiIHN0eWxlPXt7IGhlaWdodDogYCR7TWF0aC5zaW4oaS8yKSo0MCArIE1hdGguY29zKGkvMS41KSoyNSArIDUwfSVgIH19IC8+XG4gICAgICAgICAgICkpfVxuICAgICAgICAgPC9kaXY+XG4gICAgICAgPC9kaXY+XG4gICAgPC9kaXY+XG4gICk7XG59O1xuY29uc3QgQWR2YW5jZWRUcmltID0gKCkgPT4ge1xuICBjb25zdCBbem9vbSwgc2V0Wm9vbV0gPSB1c2VTdGF0ZSgxKTtcbiAgY29uc3QgW3N0YXJ0TWFya2VyLCBzZXRTdGFydE1hcmtlcl0gPSB1c2VTdGF0ZSgwKTtcbiAgY29uc3QgW2VuZE1hcmtlciwgc2V0RW5kTWFya2VyXSA9IHVzZVN0YXRlKDEwMCk7XG4gIGNvbnN0IFtub3JtYWxpemVkLCBzZXROb3JtYWxpemVkXSA9IHVzZVN0YXRlKGZhbHNlKTtcblxuICByZXR1cm4gKFxuICAgIDxkaXYgY2xhc3NOYW1lPVwiaC1mdWxsIGJnLXNsYXRlLTkwMCBwLTYgZmxleCBmbGV4LWNvbCBnYXAtNSBmb250LW1vbm8gdGV4dC14cyB0ZXh0LXNsYXRlLTMwMCBvdmVyZmxvdy15LWF1dG9cIj5cbiAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXgganVzdGlmeS1iZXR3ZWVuIGl0ZW1zLWNlbnRlciBiZy1zbGF0ZS05NTAgcC0zIHJvdW5kZWQtbGcgYm9yZGVyIGJvcmRlci1zbGF0ZS04MDAgc2hhZG93LW1kXCI+XG4gICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJmb250LWJsYWNrIHRyYWNraW5nLXdpZGVzdCB0ZXh0LWJsdWUtMzAwIGZsZXggaXRlbXMtY2VudGVyIGdhcC0yXCI+XG4gICAgICAgICAgIDxTY2lzc29ycyBzaXplPXsxNn0gLz4gV0FWRUZPUk0gQVVESU8gVFJJTU1FUiAmIE5PUk1BTElaRVxuICAgICAgICAgPC9zcGFuPlxuICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMlwiPlxuICAgICAgICAgICA8YnV0dG9uIG9uQ2xpY2s9eygpID0+IHNldFpvb20oTWF0aC5tYXgoMC41LCB6b29tIC0gMC4yNSkpfSBjbGFzc05hbWU9XCJweC0yLjUgcHktMSBiZy1zbGF0ZS04MDAgaG92ZXI6Ymctc2xhdGUtNzAwIHRleHQtc2xhdGUtMzAwIHJvdW5kZWQgZm9udC1ib2xkXCI+Wk9PTSAtPC9idXR0b24+XG4gICAgICAgICAgIDxidXR0b24gb25DbGljaz17KCkgPT4gc2V0Wm9vbSgxKX0gY2xhc3NOYW1lPVwicHgtMi41IHB5LTEgYmctc2xhdGUtODAwIGhvdmVyOmJnLXNsYXRlLTcwMCB0ZXh0LXNsYXRlLTMwMCByb3VuZGVkIGZvbnQtYm9sZFwiPjE6MTwvYnV0dG9uPlxuICAgICAgICAgICA8YnV0dG9uIG9uQ2xpY2s9eygpID0+IHNldFpvb20oTWF0aC5taW4oMywgem9vbSArIDAuMjUpKX0gY2xhc3NOYW1lPVwicHgtMi41IHB5LTEgYmctc2xhdGUtODAwIGhvdmVyOmJnLXNsYXRlLTcwMCB0ZXh0LXNsYXRlLTMwMCByb3VuZGVkIGZvbnQtYm9sZFwiPlpPT00gKzwvYnV0dG9uPlxuICAgICAgICAgPC9kaXY+XG4gICAgICAgPC9kaXY+XG5cbiAgICAgICB7LyogV2F2ZWZvcm0gQ2FudmFzIFNpbXVsYXRpb24gKi99XG4gICAgICAgPGRpdiBjbGFzc05hbWU9XCJiZy1zbGF0ZS05NTAgcC01IHJvdW5kZWQteGwgYm9yZGVyIGJvcmRlci1zbGF0ZS04MDAgZmxleCBmbGV4LWNvbCBnYXAtMyByZWxhdGl2ZSBvdmVyZmxvdy1oaWRkZW4gc2hhZG93LWlubmVyXCI+XG4gICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXgganVzdGlmeS1iZXR3ZWVuIHRleHQtWzlweF0gdGV4dC1zbGF0ZS01MDBcIj5cbiAgICAgICAgICAgPHNwYW4+MC4wczwvc3Bhbj5cbiAgICAgICAgICAgPHNwYW4+MS4yczwvc3Bhbj5cbiAgICAgICAgICAgPHNwYW4+Mi40czwvc3Bhbj5cbiAgICAgICAgIDwvZGl2PlxuICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJoLTMyIGZsZXggaXRlbXMtY2VudGVyIGdhcC0wLjUgcHgtMiByZWxhdGl2ZSBiZy1zbGF0ZS05MDAvNTAgcm91bmRlZC1sZyBib3JkZXIgYm9yZGVyLXNsYXRlLTgwMFwiIHN0eWxlPXt7IHRyYW5zZm9ybTogYHNjYWxlWCgke3pvb219KWAsIHRyYW5zZm9ybU9yaWdpbjogJ2xlZnQnIH19PlxuICAgICAgICAgICB7LyogU3RhcnQgJiBFbmQgbWFya2VyIGhpZ2hsaWdodHMgKi99XG4gICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJzb2x1dGUgaW5zZXQteS0wIGJnLWJsdWUtNTAwLzEwIGJvcmRlci14LTIgYm9yZGVyLWJsdWUtNDAwIHotMTBcIiBzdHlsZT17eyBsZWZ0OiBgJHtzdGFydE1hcmtlcn0lYCwgcmlnaHQ6IGAkezEwMCAtIGVuZE1hcmtlcn0lYCB9fSAvPlxuICAgICAgICAgICBcbiAgICAgICAgICAge0FycmF5LmZyb20oe2xlbmd0aDogNDh9KS5tYXAoKF8sIGkpID0+IChcbiAgICAgICAgICAgICA8ZGl2IFxuICAgICAgICAgICAgICAga2V5PXtpfSBcbiAgICAgICAgICAgICAgIGNsYXNzTmFtZT17YGZsZXgtMSByb3VuZGVkLXNtIHRyYW5zaXRpb24tYWxsICR7bm9ybWFsaXplZCA/ICdiZy1lbWVyYWxkLTQwMCcgOiAnYmctYmx1ZS00MDAnfWB9IFxuICAgICAgICAgICAgICAgc3R5bGU9e3sgaGVpZ2h0OiBgJHtNYXRoLnNpbihpIC8gMikgKiA0MCArIE1hdGguY29zKGkgLyAxLjUpICogMzAgKyA1MH0lYCB9fSBcbiAgICAgICAgICAgICAvPlxuICAgICAgICAgICApKX1cbiAgICAgICAgIDwvZGl2PlxuICAgICAgIDwvZGl2PlxuXG4gICAgICAgey8qIE1hcmtlciBhbmQgVG9vbCBDb250cm9scyAqL31cbiAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImdyaWQgZ3JpZC1jb2xzLTIgZ2FwLTRcIj5cbiAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYmctc2xhdGUtOTUwIHAtNCByb3VuZGVkLXhsIGJvcmRlciBib3JkZXItc2xhdGUtODAwIGZsZXggZmxleC1jb2wgZ2FwLTNcIj5cbiAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1bMTBweF0gdGV4dC1ibHVlLTMwMCBmb250LWJvbGQgdHJhY2tpbmctd2lkZXN0IGJvcmRlci1iIGJvcmRlci1zbGF0ZS04MDAgcGItMlwiPk1BUktFUiBTRUxFQ1RJT048L3NwYW4+XG4gICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBmbGV4LWNvbCBnYXAtMlwiPlxuICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBqdXN0aWZ5LWJldHdlZW5cIj5cbiAgICAgICAgICAgICAgIDxzcGFuPlN0YXJ0IE1hcmtlcjogeyhzdGFydE1hcmtlciAqIDAuMDI0KS50b0ZpeGVkKDIpfXM8L3NwYW4+XG4gICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cInJhbmdlXCIgbWluPXswfSBtYXg9ezQwfSB2YWx1ZT17c3RhcnRNYXJrZXJ9IG9uQ2hhbmdlPXtlID0+IHNldFN0YXJ0TWFya2VyKE51bWJlcihlLnRhcmdldC52YWx1ZSkpfSBjbGFzc05hbWU9XCJhY2NlbnQtYmx1ZS00MDBcIiAvPlxuICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBqdXN0aWZ5LWJldHdlZW5cIj5cbiAgICAgICAgICAgICAgIDxzcGFuPkVuZCBNYXJrZXI6IHsoZW5kTWFya2VyICogMC4wMjQpLnRvRml4ZWQoMil9czwvc3Bhbj5cbiAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwicmFuZ2VcIiBtaW49ezYwfSBtYXg9ezEwMH0gdmFsdWU9e2VuZE1hcmtlcn0gb25DaGFuZ2U9e2UgPT4gc2V0RW5kTWFya2VyKE51bWJlcihlLnRhcmdldC52YWx1ZSkpfSBjbGFzc05hbWU9XCJhY2NlbnQtYmx1ZS00MDBcIiAvPlxuICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImJnLXNsYXRlLTk1MCBwLTQgcm91bmRlZC14bCBib3JkZXIgYm9yZGVyLXNsYXRlLTgwMCBmbGV4IGZsZXgtY29sIGdhcC0zXCI+XG4gICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtWzEwcHhdIHRleHQtYmx1ZS0zMDAgZm9udC1ib2xkIHRyYWNraW5nLXdpZGVzdCBib3JkZXItYiBib3JkZXItc2xhdGUtODAwIHBiLTJcIj5EU1AgVE9PTFM8L3NwYW4+XG4gICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBmbGV4LWNvbCBnYXAtMlwiPlxuICAgICAgICAgICAgIDxidXR0b24gXG4gICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBzZXROb3JtYWxpemVkKCFub3JtYWxpemVkKX1cbiAgICAgICAgICAgICAgIGNsYXNzTmFtZT17YHctZnVsbCBweS0yLjUgcm91bmRlZC1sZyBmb250LWJvbGQgdHJhbnNpdGlvbi1jb2xvcnMgJHtub3JtYWxpemVkID8gJ2JnLWVtZXJhbGQtNjAwIHRleHQtd2hpdGUgc2hhZG93LVswXzBfMTBweF8jMDU5NjY5XScgOiAnYmctc2xhdGUtODAwIGhvdmVyOmJnLXNsYXRlLTcwMCB0ZXh0LXNsYXRlLTMwMCd9YH1cbiAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICB7bm9ybWFsaXplZCA/ICdOT1JNQUxJWkVEIFRPIDBkQiAoQUNUSVZFKScgOiAnTk9STUFMSVpFIEFVRElPJ31cbiAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICA8YnV0dG9uIGNsYXNzTmFtZT1cInctZnVsbCBweS0yLjUgYmctYmx1ZS02MDAgaG92ZXI6YmctYmx1ZS01MDAgdGV4dC13aGl0ZSBmb250LWJvbGQgcm91bmRlZC1sZyB0cmFuc2l0aW9uLWNvbG9ycyBzaGFkb3ctWzBfMF8xMHB4X3JnYmEoMzcsOTksMjM1LDAuMyldXCI+XG4gICAgICAgICAgICAgICBDUk9QICYgRVhQT1JUIFJFR0lPTlxuICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgIDwvZGl2PlxuICAgICAgIDwvZGl2PlxuICAgIDwvZGl2PlxuICApO1xufTtcbmNvbnN0IENoYW5uZWxNYXRyaXggPSAoKSA9PiB7XG4gIGNvbnN0IFttYXRyaXgsIHNldE1hdHJpeF0gPSB1c2VTdGF0ZShcbiAgICBBcnJheSg0KS5maWxsKG51bGwpLm1hcCgoKSA9PiBBcnJheSg0KS5maWxsKGZhbHNlKSlcbiAgKTtcbiAgY29uc3QgdHJhY2tzID0gW1wiVHJhY2sgMTogSG91c2VcIiwgXCJUcmFjayAyOiBTdWIgQmFzc1wiLCBcIlRyYWNrIDM6IENob3Jkc1wiLCBcIlRyYWNrIDQ6IEZYIFJpc2VyXCJdO1xuICBjb25zdCBkZXN0aW5hdGlvbnMgPSBbXCJBdXggMSBSZXZlcmJcIiwgXCJBdXggMiBEZWxheVwiLCBcIkJ1cyBBIFN1Ym1peFwiLCBcIk1hc3RlciBPdXRcIl07XG5cbiAgY29uc3QgdG9nZ2xlQ3Jvc3Nwb2ludCA9IChyOiBudW1iZXIsIGM6IG51bWJlcikgPT4ge1xuICAgIGNvbnN0IHVwZGF0ZWQgPSBtYXRyaXgubWFwKChyb3csIHJpKSA9PiByb3cubWFwKCh2YWwsIGNpKSA9PiByaSA9PT0gciAmJiBjaSA9PT0gYyA/ICF2YWwgOiB2YWwpKTtcbiAgICBzZXRNYXRyaXgodXBkYXRlZCk7XG4gIH07XG5cbiAgcmV0dXJuIChcbiAgICA8ZGl2IGNsYXNzTmFtZT1cImgtZnVsbCBiZy1zbGF0ZS05MDAgcC02IGZsZXggZmxleC1jb2wgZ2FwLTUgZm9udC1tb25vIHRleHQteHMgdGV4dC1zbGF0ZS0zMDAgb3ZlcmZsb3cteS1hdXRvXCI+XG4gICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGp1c3RpZnktYmV0d2VlbiBpdGVtcy1jZW50ZXIgYmctc2xhdGUtOTUwIHAtMyByb3VuZGVkLWxnIGJvcmRlciBib3JkZXItc2xhdGUtODAwIHNoYWRvdy1tZFwiPlxuICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwiZm9udC1ibGFjayB0cmFja2luZy13aWRlc3QgdGV4dC1jeWFuLTMwMCBmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMlwiPlxuICAgICAgICAgICA8TGF5b3V0R3JpZCBzaXplPXsxNn0gLz4gQVVESU8gUk9VVElORyBNQVRSSVggKENST1NJUylcbiAgICAgICAgIDwvc3Bhbj5cbiAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInB4LTIgcHktMC41IGJnLWN5YW4tOTUwIHRleHQtY3lhbi00MDAgdGV4dC1bMTBweF0gcm91bmRlZCBib3JkZXIgYm9yZGVyLWN5YW4tOTAwXCI+MTZ4MTYgQlVTPC9zcGFuPlxuICAgICAgIDwvZGl2PlxuXG4gICAgICAgPGRpdiBjbGFzc05hbWU9XCJiZy1zbGF0ZS05NTAgcC00IHJvdW5kZWQteGwgYm9yZGVyIGJvcmRlci1zbGF0ZS04MDAgb3ZlcmZsb3cteC1hdXRvXCI+XG4gICAgICAgICA8dGFibGUgY2xhc3NOYW1lPVwidy1mdWxsIGJvcmRlci1jb2xsYXBzZVwiPlxuICAgICAgICAgICA8dGhlYWQ+XG4gICAgICAgICAgICAgPHRyPlxuICAgICAgICAgICAgICAgPHRoIGNsYXNzTmFtZT1cInAtMiB0ZXh0LWxlZnQgdGV4dC1zbGF0ZS01MDAgZm9udC1ib2xkIGJvcmRlci1iIGJvcmRlci1zbGF0ZS04MDBcIj5JTlBVVCAvIEJVUzwvdGg+XG4gICAgICAgICAgICAgICB7ZGVzdGluYXRpb25zLm1hcCgoZCwgaSkgPT4gKFxuICAgICAgICAgICAgICAgICA8dGgga2V5PXtpfSBjbGFzc05hbWU9XCJwLTIgdGV4dC1jZW50ZXIgdGV4dC1jeWFuLTQwMCBmb250LWJvbGQgYm9yZGVyLWIgYm9yZGVyLXNsYXRlLTgwMFwiPntkfTwvdGg+XG4gICAgICAgICAgICAgICApKX1cbiAgICAgICAgICAgICA8L3RyPlxuICAgICAgICAgICA8L3RoZWFkPlxuICAgICAgICAgICA8dGJvZHk+XG4gICAgICAgICAgICAge3RyYWNrcy5tYXAoKHQsIHJpKSA9PiAoXG4gICAgICAgICAgICAgICA8dHIga2V5PXtyaX0gY2xhc3NOYW1lPVwiYm9yZGVyLWIgYm9yZGVyLXNsYXRlLTkwMCBob3ZlcjpiZy1zbGF0ZS05MDAvNTBcIj5cbiAgICAgICAgICAgICAgICAgPHRkIGNsYXNzTmFtZT1cInAtMyBmb250LWJvbGQgdGV4dC1zbGF0ZS0yMDBcIj57dH08L3RkPlxuICAgICAgICAgICAgICAgICB7ZGVzdGluYXRpb25zLm1hcCgoXywgY2kpID0+IChcbiAgICAgICAgICAgICAgICAgICA8dGQga2V5PXtjaX0gY2xhc3NOYW1lPVwicC0zIHRleHQtY2VudGVyXCI+XG4gICAgICAgICAgICAgICAgICAgICA8YnV0dG9uIFxuICAgICAgICAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiB0b2dnbGVDcm9zc3BvaW50KHJpLCBjaSl9XG4gICAgICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT17YHctOCBoLTggcm91bmRlZC1sZyBib3JkZXIgdHJhbnNpdGlvbi1hbGwgJHtcbiAgICAgICAgICAgICAgICAgICAgICAgICBtYXRyaXhbcmldW2NpXSBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgID8gJ2JnLWN5YW4tNTAwIGJvcmRlci13aGl0ZSB0ZXh0LXNsYXRlLTk1MCBzaGFkb3ctWzBfMF8xMnB4XyMyMmQzZWVdJyBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIDogJ2JnLXNsYXRlLTkwMCBib3JkZXItc2xhdGUtNzAwIGhvdmVyOmJnLXNsYXRlLTgwMCdcbiAgICAgICAgICAgICAgICAgICAgICAgfWB9XG4gICAgICAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgICAgICAgIHttYXRyaXhbcmldW2NpXSA/ICdPTicgOiAnJ31cbiAgICAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICAgICAgIDwvdGQ+XG4gICAgICAgICAgICAgICAgICkpfVxuICAgICAgICAgICAgICAgPC90cj5cbiAgICAgICAgICAgICApKX1cbiAgICAgICAgICAgPC90Ym9keT5cbiAgICAgICAgIDwvdGFibGU+XG4gICAgICAgPC9kaXY+XG4gICAgPC9kaXY+XG4gICk7XG59O1xuY29uc3QgVm9jYWxBdXRvVHVuZSA9ICgpID0+IHtcbiAgY29uc3QgW3NjYWxlLCBzZXRTY2FsZV0gPSB1c2VTdGF0ZShcIkEgTWlub3JcIik7XG4gIGNvbnN0IFtyZXR1bmVTcGVlZCwgc2V0UmV0dW5lU3BlZWRdID0gdXNlU3RhdGUoMTUpO1xuXG4gIHJldHVybiAoXG4gICAgPGRpdiBjbGFzc05hbWU9XCJoLWZ1bGwgYmctc2xhdGUtOTAwIHAtNiBmbGV4IGZsZXgtY29sIGdhcC01IGZvbnQtbW9ubyB0ZXh0LXhzIHRleHQtc2xhdGUtMzAwIG92ZXJmbG93LXktYXV0b1wiPlxuICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBqdXN0aWZ5LWJldHdlZW4gaXRlbXMtY2VudGVyIGJnLXNsYXRlLTk1MCBwLTMgcm91bmRlZC1sZyBib3JkZXIgYm9yZGVyLXNsYXRlLTgwMCBzaGFkb3ctbWRcIj5cbiAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cImZvbnQtYmxhY2sgdHJhY2tpbmctd2lkZXN0IHRleHQtdmlvbGV0LTMwMCBmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMlwiPlxuICAgICAgICAgICA8TXVzaWMgc2l6ZT17MTZ9IC8+IEFVVE9UVU5FIFBSTyBQSVRDSCBDT1JSRUNUSU9OXG4gICAgICAgICA8L3NwYW4+XG4gICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJweC0yIHB5LTAuNSBiZy12aW9sZXQtOTUwIHRleHQtdmlvbGV0LTQwMCB0ZXh0LVsxMHB4XSByb3VuZGVkIGJvcmRlciBib3JkZXItdmlvbGV0LTkwMFwiPlpFUk8gTEFURU5DWTwvc3Bhbj5cbiAgICAgICA8L2Rpdj5cblxuICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZ3JpZCBncmlkLWNvbHMtMiBnYXAtNFwiPlxuICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJiZy1zbGF0ZS05NTAgcC00IHJvdW5kZWQteGwgYm9yZGVyIGJvcmRlci1zbGF0ZS04MDAgZmxleCBmbGV4LWNvbCBnYXAtM1wiPlxuICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LVsxMHB4XSB0ZXh0LXZpb2xldC0zMDAgZm9udC1ib2xkIHRyYWNraW5nLXdpZGVzdCBib3JkZXItYiBib3JkZXItc2xhdGUtODAwIHBiLTJcIj5LRVkgJiBTQ0FMRTwvc3Bhbj5cbiAgICAgICAgICAgPHNlbGVjdCBcbiAgICAgICAgICAgICB2YWx1ZT17c2NhbGV9IFxuICAgICAgICAgICAgIG9uQ2hhbmdlPXtlID0+IHNldFNjYWxlKGUudGFyZ2V0LnZhbHVlKX1cbiAgICAgICAgICAgICBjbGFzc05hbWU9XCJ3LWZ1bGwgYmctc2xhdGUtOTAwIGJvcmRlciBib3JkZXItc2xhdGUtODAwIHJvdW5kZWQgcC0yIHRleHQtdmlvbGV0LTMwMCBmb250LWJvbGQgb3V0bGluZS1ub25lXCJcbiAgICAgICAgICAgPlxuICAgICAgICAgICAgIHtbXCJDIE1ham9yXCIsIFwiQSBNaW5vclwiLCBcIkcgTWFqb3JcIiwgXCJFIE1pbm9yXCIsIFwiQ2hyb21hdGljXCJdLm1hcChzID0+IDxvcHRpb24ga2V5PXtzfSB2YWx1ZT17c30+e3N9PC9vcHRpb24+KX1cbiAgICAgICAgICAgPC9zZWxlY3Q+XG4gICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJiZy1zbGF0ZS05NTAgcC00IHJvdW5kZWQteGwgYm9yZGVyIGJvcmRlci1zbGF0ZS04MDAgZmxleCBmbGV4LWNvbCBpdGVtcy1jZW50ZXIgZ2FwLTJcIj5cbiAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1bMTBweF0gdGV4dC12aW9sZXQtMzAwIGZvbnQtYm9sZCB0cmFja2luZy13aWRlc3QgYm9yZGVyLWIgYm9yZGVyLXNsYXRlLTgwMCBwYi0yIHctZnVsbCB0ZXh0LWNlbnRlclwiPlJFVFVORSBTUEVFRCAoU05BUCk8L3NwYW4+XG4gICAgICAgICAgIDxLbm9iIGxhYmVsPVwiU1BFRURcIiB2YWx1ZT17cmV0dW5lU3BlZWR9IGNvbG9yPVwidmlvbGV0XCIgb25DaGFuZ2U9eyh2KSA9PiBzZXRSZXR1bmVTcGVlZCh2KX0gLz5cbiAgICAgICAgIDwvZGl2PlxuICAgICAgIDwvZGl2PlxuXG4gICAgICAgey8qIFBpYW5vIFJvbGwgTm90ZSBDb3JyZWN0aW9uIEdyaWQgKi99XG4gICAgICAgPGRpdiBjbGFzc05hbWU9XCJiZy1zbGF0ZS05NTAgcC00IHJvdW5kZWQteGwgYm9yZGVyIGJvcmRlci1zbGF0ZS04MDAgZmxleCBmbGV4LWNvbCBnYXAtMiBzaGFkb3ctaW5uZXJcIj5cbiAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtWzEwcHhdIHRleHQtc2xhdGUtNTAwXCI+UElUQ0ggREVURUNUSU9OICYgQ09SUkVDVElPTiBHUklEPC9zcGFuPlxuICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJoLTMyIGJnLXNsYXRlLTkwMCByb3VuZGVkLWxnIGJvcmRlciBib3JkZXItc2xhdGUtODAwIHJlbGF0aXZlIG92ZXJmbG93LWhpZGRlbiBmbGV4IGZsZXgtY29sIGp1c3RpZnktYmV0d2VlbiBwLTJcIj5cbiAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYnNvbHV0ZSBpbnNldC0wIGdyaWQgZ3JpZC1jb2xzLTggZ3JpZC1yb3dzLTQgb3BhY2l0eS0yMFwiPlxuICAgICAgICAgICAgIHtBcnJheS5mcm9tKHtsZW5ndGg6IDMyfSkubWFwKChfLCBpKSA9PiA8ZGl2IGtleT17aX0gY2xhc3NOYW1lPVwiYm9yZGVyIGJvcmRlci12aW9sZXQtNTAwXCIgLz4pfVxuICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgey8qIENvcnJlY3Rpb24gTm9kZXMgTGluZSAqL31cbiAgICAgICAgICAgPHN2ZyBjbGFzc05hbWU9XCJhYnNvbHV0ZSBpbnNldC0wIHctZnVsbCBoLWZ1bGwgcG9pbnRlci1ldmVudHMtbm9uZVwiIHByZXNlcnZlQXNwZWN0UmF0aW89XCJub25lXCIgdmlld0JveD1cIjAgMCAxMDAgMTAwXCI+XG4gICAgICAgICAgICAgPHBhdGggZD1cIk0gMCw3MCBRIDI1LDQwIDUwLDYwIFQgMTAwLDMwXCIgZmlsbD1cIm5vbmVcIiBzdHJva2U9XCIjYTc4YmZhXCIgc3Ryb2tlV2lkdGg9XCIzXCIgLz5cbiAgICAgICAgICAgICA8cGF0aCBkPVwiTSAwLDY1IFEgMjUsNjUgNTAsNjAgVCAxMDAsMzBcIiBmaWxsPVwibm9uZVwiIHN0cm9rZT1cIiMzNGQzOTlcIiBzdHJva2VXaWR0aD1cIjJcIiBzdHJva2VEYXNoYXJyYXk9XCI0XCIgLz5cbiAgICAgICAgICAgPC9zdmc+XG4gICAgICAgICA8L2Rpdj5cbiAgICAgICA8L2Rpdj5cbiAgICA8L2Rpdj5cbiAgKTtcbn07XG5jb25zdCBESlNldE1peFN0dWRpbyA9ICgpID0+IHtcbiAgY29uc3QgW2Nyb3NzZmFkZXIsIHNldENyb3NzZmFkZXJdID0gdXNlU3RhdGUoNTApO1xuICBjb25zdCBbZGVja0FQbGF5aW5nLCBzZXREZWNrQVBsYXlpbmddID0gdXNlU3RhdGUodHJ1ZSk7XG4gIGNvbnN0IFtkZWNrQlBsYXlpbmcsIHNldERlY2tCUGxheWluZ10gPSB1c2VTdGF0ZShmYWxzZSk7XG5cbiAgcmV0dXJuIChcbiAgICA8ZGl2IGNsYXNzTmFtZT1cImgtZnVsbCBiZy1zbGF0ZS05MDAgcC02IGZsZXggZmxleC1jb2wgZ2FwLTUgZm9udC1tb25vIHRleHQteHMgdGV4dC1zbGF0ZS0zMDAgb3ZlcmZsb3cteS1hdXRvXCI+XG4gICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGp1c3RpZnktYmV0d2VlbiBpdGVtcy1jZW50ZXIgYmctc2xhdGUtOTUwIHAtMyByb3VuZGVkLWxnIGJvcmRlciBib3JkZXItc2xhdGUtODAwIHNoYWRvdy1tZFwiPlxuICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwiZm9udC1ibGFjayB0cmFja2luZy13aWRlc3QgdGV4dC1hbWJlci0zMDAgZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTJcIj5cbiAgICAgICAgICAgPFJhZGlvIHNpemU9ezE2fSAvPiBEVUFMIERFQ0sgREogTUlYIFNUVURJT1xuICAgICAgICAgPC9zcGFuPlxuICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwicHgtMiBweS0wLjUgYmctYW1iZXItOTUwIHRleHQtYW1iZXItNDAwIHRleHQtWzEwcHhdIHJvdW5kZWQgYm9yZGVyIGJvcmRlci1hbWJlci05MDBcIj5NQVNURVIgU1lOQzogMTI0IEJQTTwvc3Bhbj5cbiAgICAgICA8L2Rpdj5cblxuICAgICAgIHsvKiBEZWNrcyBHcmlkICovfVxuICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZ3JpZCBncmlkLWNvbHMtMiBnYXAtNFwiPlxuICAgICAgICAgey8qIERlY2sgQSAqL31cbiAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYmctc2xhdGUtOTUwIHAtNCByb3VuZGVkLXhsIGJvcmRlciBib3JkZXItYW1iZXItOTAwLzQwIGZsZXggZmxleC1jb2wgZ2FwLTMgc2hhZG93LWlubmVyXCI+XG4gICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBqdXN0aWZ5LWJldHdlZW4gaXRlbXMtY2VudGVyXCI+XG4gICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwiZm9udC1ibGFjayB0ZXh0LWFtYmVyLTQwMFwiPkRFQ0sgQTwvc3Bhbj5cbiAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LVs5cHhdIHRleHQtZW1lcmFsZC00MDBcIj5MT0FERUQ6IEN5YmVyIEFudGhlbS53YXY8L3NwYW4+XG4gICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImgtMjAgYmctc2xhdGUtOTAwIHJvdW5kZWQgYm9yZGVyIGJvcmRlci1zbGF0ZS04MDAgZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgcmVsYXRpdmUgb3ZlcmZsb3ctaGlkZGVuXCI+XG4gICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYnNvbHV0ZSBpbnNldC14LTAgdG9wLTEvMiBoLTAuNSBiZy1hbWJlci01MDAvNDBcIiAvPlxuICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwidy0xNiBoLTE2IHJvdW5kZWQtZnVsbCBib3JkZXItNCBib3JkZXItc2xhdGUtODAwIGJnLXNsYXRlLTk1MCBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBzaGFkb3ctbGcgYW5pbWF0ZS1zcGluLXNsb3dcIj5cbiAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwidy00IGgtNCByb3VuZGVkLWZ1bGwgYmctYW1iZXItNDAwXCIgLz5cbiAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBnYXAtMlwiPlxuICAgICAgICAgICAgIDxidXR0b24gb25DbGljaz17KCkgPT4gc2V0RGVja0FQbGF5aW5nKCFkZWNrQVBsYXlpbmcpfSBjbGFzc05hbWU9e2BmbGV4LTEgcHktMiByb3VuZGVkIGZvbnQtYm9sZCAke2RlY2tBUGxheWluZyA/ICdiZy1hbWJlci01MDAgdGV4dC1zbGF0ZS05NTAnIDogJ2JnLXNsYXRlLTgwMCB0ZXh0LXNsYXRlLTQwMCd9YH0+XG4gICAgICAgICAgICAgICB7ZGVja0FQbGF5aW5nID8gJ1BMQVlJTkcnIDogJ0NVRSAvIFBMQVknfVxuICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgIDxidXR0b24gY2xhc3NOYW1lPVwicHgtMyBweS0yIGJnLXNsYXRlLTgwMCBob3ZlcjpiZy1zbGF0ZS03MDAgdGV4dC1hbWJlci0zMDAgcm91bmRlZCBmb250LWJvbGRcIj5TWU5DPC9idXR0b24+XG4gICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgIHsvKiBEZWNrIEIgKi99XG4gICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImJnLXNsYXRlLTk1MCBwLTQgcm91bmRlZC14bCBib3JkZXIgYm9yZGVyLWFtYmVyLTkwMC80MCBmbGV4IGZsZXgtY29sIGdhcC0zIHNoYWRvdy1pbm5lclwiPlxuICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXgganVzdGlmeS1iZXR3ZWVuIGl0ZW1zLWNlbnRlclwiPlxuICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cImZvbnQtYmxhY2sgdGV4dC1hbWJlci00MDBcIj5ERUNLIEI8L3NwYW4+XG4gICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1bOXB4XSB0ZXh0LWVtZXJhbGQtNDAwXCI+TE9BREVEOiBUZWNobm8gTG9vcCBCLndhdjwvc3Bhbj5cbiAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiaC0yMCBiZy1zbGF0ZS05MDAgcm91bmRlZCBib3JkZXIgYm9yZGVyLXNsYXRlLTgwMCBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciByZWxhdGl2ZSBvdmVyZmxvdy1oaWRkZW5cIj5cbiAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImFic29sdXRlIGluc2V0LXgtMCB0b3AtMS8yIGgtMC41IGJnLWFtYmVyLTUwMC80MFwiIC8+XG4gICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ3LTE2IGgtMTYgcm91bmRlZC1mdWxsIGJvcmRlci00IGJvcmRlci1zbGF0ZS04MDAgYmctc2xhdGUtOTUwIGZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIHNoYWRvdy1sZyBhbmltYXRlLXNwaW4tc2xvd1wiPlxuICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ3LTQgaC00IHJvdW5kZWQtZnVsbCBiZy1hbWJlci00MDBcIiAvPlxuICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGdhcC0yXCI+XG4gICAgICAgICAgICAgPGJ1dHRvbiBvbkNsaWNrPXsoKSA9PiBzZXREZWNrQlBsYXlpbmcoIWRlY2tCUGxheWluZyl9IGNsYXNzTmFtZT17YGZsZXgtMSBweS0yIHJvdW5kZWQgZm9udC1ib2xkICR7ZGVja0JQbGF5aW5nID8gJ2JnLWFtYmVyLTUwMCB0ZXh0LXNsYXRlLTk1MCcgOiAnYmctc2xhdGUtODAwIHRleHQtc2xhdGUtNDAwJ31gfT5cbiAgICAgICAgICAgICAgIHtkZWNrQlBsYXlpbmcgPyAnUExBWUlORycgOiAnQ1VFIC8gUExBWSd9XG4gICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgPGJ1dHRvbiBjbGFzc05hbWU9XCJweC0zIHB5LTIgYmctc2xhdGUtODAwIGhvdmVyOmJnLXNsYXRlLTcwMCB0ZXh0LWFtYmVyLTMwMCByb3VuZGVkIGZvbnQtYm9sZFwiPlNZTkM8L2J1dHRvbj5cbiAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICA8L2Rpdj5cbiAgICAgICA8L2Rpdj5cblxuICAgICAgIHsvKiBDcm9zc2ZhZGVyICovfVxuICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYmctc2xhdGUtOTUwIHAtNCByb3VuZGVkLXhsIGJvcmRlciBib3JkZXItc2xhdGUtODAwIGZsZXggZmxleC1jb2wgZ2FwLTJcIj5cbiAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBqdXN0aWZ5LWJldHdlZW4gdGV4dC1bOXB4XSB0ZXh0LXNsYXRlLTUwMFwiPlxuICAgICAgICAgICA8c3Bhbj5ERUNLIEE8L3NwYW4+XG4gICAgICAgICAgIDxzcGFuPkNST1NTRkFERVI8L3NwYW4+XG4gICAgICAgICAgIDxzcGFuPkRFQ0sgQjwvc3Bhbj5cbiAgICAgICAgIDwvZGl2PlxuICAgICAgICAgPGlucHV0IFxuICAgICAgICAgICB0eXBlPVwicmFuZ2VcIiBtaW49ezB9IG1heD17MTAwfSB2YWx1ZT17Y3Jvc3NmYWRlcn0gb25DaGFuZ2U9e2UgPT4gc2V0Q3Jvc3NmYWRlcihOdW1iZXIoZS50YXJnZXQudmFsdWUpKX1cbiAgICAgICAgICAgY2xhc3NOYW1lPVwidy1mdWxsIGFjY2VudC1hbWJlci00MDAgY3Vyc29yLXBvaW50ZXJcIlxuICAgICAgICAgLz5cbiAgICAgICA8L2Rpdj5cbiAgICA8L2Rpdj5cbiAgKTtcbn07XG5cbmNvbnN0IEdpdEh1YlB1Ymxpc2hlciA9ICh7IHBhZHMsIGJwbSwgbWFzdGVyVm9sdW1lIH06IHsgcGFkcz86IFBhZFtdOyBicG0/OiBudW1iZXI7IG1hc3RlclZvbHVtZT86IG51bWJlciB9KSA9PiB7XG4gIGNvbnN0IFthY3RpdmVUYWIsIHNldEFjdGl2ZVRhYl0gPSB1c2VTdGF0ZTwncHVibGlzaCcgfCAnc2V0dGluZ3MnIHwgJ25ldy1yZXBvJz4oJ3B1Ymxpc2gnKTtcbiAgY29uc3QgW2docFRva2VuLCBzZXRHaHBUb2tlbl0gPSB1c2VTdGF0ZSgoKSA9PiBsb2NhbFN0b3JhZ2UuZ2V0SXRlbShcImdpdGh1Yl9wZXJzb25hbF90b2tlblwiKSB8fCBcIlwiKTtcbiAgY29uc3QgW3VzZXJJbmZvLCBzZXRVc2VySW5mb10gPSB1c2VTdGF0ZTx7IGxvZ2luOiBzdHJpbmc7IGF2YXRhcl91cmw6IHN0cmluZzsgaHRtbF91cmw6IHN0cmluZyB9IHwgbnVsbD4obnVsbCk7XG4gIGNvbnN0IFt0b2tlblN0YXR1cywgc2V0VG9rZW5TdGF0dXNdID0gdXNlU3RhdGU8c3RyaW5nIHwgbnVsbD4obnVsbCk7XG4gIFxuICAvLyBOZXcgUmVwbyBGb3JtXG4gIGNvbnN0IFtuZXdSZXBvTmFtZSwgc2V0TmV3UmVwb05hbWVdID0gdXNlU3RhdGUoXCJyZW1peC1vcy1hdWRpby1zZXNzaW9uXCIpO1xuICBjb25zdCBbbmV3UmVwb0Rlc2MsIHNldE5ld1JlcG9EZXNjXSA9IHVzZVN0YXRlKFwiUmVtaXggT1MgREFXIGF1ZGlvIHByb2plY3Qgc2Vzc2lvbiBhbmQgdHJhY2sgYXJyYW5nZW1lbnRcIik7XG4gIGNvbnN0IFtpc1ByaXZhdGUsIHNldElzUHJpdmF0ZV0gPSB1c2VTdGF0ZShmYWxzZSk7XG4gIGNvbnN0IFtjcmVhdGVTdGF0dXMsIHNldENyZWF0ZVN0YXR1c10gPSB1c2VTdGF0ZTxzdHJpbmcgfCBudWxsPihudWxsKTtcblxuICAvLyBQdWJsaXNoIEZvcm1cbiAgY29uc3QgW3RhcmdldFJlcG8sIHNldFRhcmdldFJlcG9dID0gdXNlU3RhdGUoXCJyZW1peC1vcy1hdWRpby1zZXNzaW9uXCIpO1xuICBjb25zdCBbY29tbWl0TXNnLCBzZXRDb21taXRNc2ddID0gdXNlU3RhdGUoXCJVcGRhdGUgdHJhY2sgYXJyYW5nZW1lbnQgYW5kIEZYIGNoYWluIHNldHRpbmdzXCIpO1xuICBjb25zdCBbcmVhZG1lQ29udGVudCwgc2V0UmVhZG1lQ29udGVudF0gPSB1c2VTdGF0ZShcbiAgICBgIyBSZW1peCBPUyBBdWRpbyBTdHVkaW8gU2Vzc2lvblxcblxcbmAgK1xuICAgIGBBdXRvbWF0ZWQgc2Vzc2lvbiBleHBvcnQgZnJvbSBSZW1peCBPUyBXZWIgREFXLlxcblxcbmAgK1xuICAgIGAjIyBQcm9qZWN0IE92ZXJ2aWV3XFxuYCArXG4gICAgYC0gKipCUE0qKjogJHticG0gfHwgMTI0fSBCUE1cXG5gICtcbiAgICBgLSAqKk1hc3RlciBWb2x1bWUqKjogJHtNYXRoLnJvdW5kKChtYXN0ZXJWb2x1bWUgfHwgMC44NSkgKiAxMDApfSVcXG5gICtcbiAgICBgLSAqKkFjdGl2ZSBUcmFja3MvUGFkcyoqOiAke3BhZHMgPyBwYWRzLmZpbHRlcihwID0+IHAuaXNQbGF5aW5nKS5sZW5ndGggOiAwfSBhY3RpdmVcXG5gICtcbiAgICBgLSAqKkVuZ2luZSoqOiBXZWIgQXVkaW8gQVBJIC8gR2VtaW5pIEFJIFByb2R1Y2VyXFxuYCArXG4gICAgYC0gKipDcmVhdGVkIEF0Kio6ICR7bmV3IERhdGUoKS50b0xvY2FsZVN0cmluZygpfVxcblxcbmAgK1xuICAgIGAjIyBJbmNsdWRlZCBGaWxlc1xcbmAgK1xuICAgIGAtIFxcYHNlc3Npb24tZGF0YS5qc29uXFxgIC0gQ29tcGxldGUgREFXIHBhZCwgbWl4ZXIsIGFuZCBGWCBjb25maWd1cmF0aW9uLlxcbmAgK1xuICAgIGAtIFxcYFJFQURNRS5tZFxcYCAtIFByb2plY3Qgc2Vzc2lvbiBub3Rlcy5cXG5gXG4gICk7XG5cbiAgY29uc3QgW2lzU3luY2luZywgc2V0SXNTeW5jaW5nXSA9IHVzZVN0YXRlKGZhbHNlKTtcbiAgY29uc3QgW3N5bmNMb2dzLCBzZXRTeW5jTG9nc10gPSB1c2VTdGF0ZTxzdHJpbmdbXT4oW10pO1xuICBjb25zdCBbcHVibGlzaGVkVXJsLCBzZXRQdWJsaXNoZWRVcmxdID0gdXNlU3RhdGU8c3RyaW5nIHwgbnVsbD4obnVsbCk7XG5cbiAgY29uc3QgaGFuZGxlU2F2ZVRva2VuID0gYXN5bmMgKHRva2VuVmFsOiBzdHJpbmcpID0+IHtcbiAgICBzZXRHaHBUb2tlbih0b2tlblZhbCk7XG4gICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oXCJnaXRodWJfcGVyc29uYWxfdG9rZW5cIiwgdG9rZW5WYWwpO1xuICAgIGlmICghdG9rZW5WYWwudHJpbSgpKSB7XG4gICAgICBzZXRVc2VySW5mbyhudWxsKTtcbiAgICAgIHNldFRva2VuU3RhdHVzKFwiVG9rZW4gY2xlYXJlZC5cIik7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgc2V0VG9rZW5TdGF0dXMoXCJWYWxpZGF0aW5nIHRva2VuIHdpdGggR2l0SHViIEFQSS4uLlwiKTtcbiAgICB0cnkge1xuICAgICAgY29uc3QgcmVzID0gYXdhaXQgZmV0Y2goXCJodHRwczovL2FwaS5naXRodWIuY29tL3VzZXJcIiwge1xuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgXCJBdXRob3JpemF0aW9uXCI6IGBCZWFyZXIgJHt0b2tlblZhbC50cmltKCl9YCxcbiAgICAgICAgICBcIkFjY2VwdFwiOiBcImFwcGxpY2F0aW9uL3ZuZC5naXRodWIudjMranNvblwiXG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgaWYgKHJlcy5vaykge1xuICAgICAgICBjb25zdCBkYXRhID0gYXdhaXQgcmVzLmpzb24oKTtcbiAgICAgICAgc2V0VXNlckluZm8oeyBsb2dpbjogZGF0YS5sb2dpbiwgYXZhdGFyX3VybDogZGF0YS5hdmF0YXJfdXJsLCBodG1sX3VybDogZGF0YS5odG1sX3VybCB9KTtcbiAgICAgICAgc2V0VG9rZW5TdGF0dXMoYEF1dGhlbnRpY2F0ZWQgYXMgQCR7ZGF0YS5sb2dpbn1gKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHNldFVzZXJJbmZvKG51bGwpO1xuICAgICAgICBzZXRUb2tlblN0YXR1cyhcIkludmFsaWQgdG9rZW4gb3IgaW5zdWZmaWNpZW50IHNjb3BlcyAocmVwbyByZXF1aXJlZCkuXCIpO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICBzZXRUb2tlblN0YXR1cyhgRXJyb3IgdmFsaWRhdGluZyB0b2tlbjogJHtlcnIubWVzc2FnZSB8fCBlcnJ9YCk7XG4gICAgfVxuICB9O1xuXG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgaWYgKGdocFRva2VuKSB7XG4gICAgICBoYW5kbGVTYXZlVG9rZW4oZ2hwVG9rZW4pO1xuICAgIH1cbiAgfSwgW10pO1xuXG4gIGNvbnN0IGhhbmRsZUNyZWF0ZVJlcG8gPSBhc3luYyAoKSA9PiB7XG4gICAgaWYgKCFnaHBUb2tlbi50cmltKCkpIHtcbiAgICAgIHNldENyZWF0ZVN0YXR1cyhcIlBsZWFzZSBjb25maWd1cmUgeW91ciBHaXRIdWIgUGVyc29uYWwgQWNjZXNzIFRva2VuIGluIFNldHRpbmdzIGZpcnN0LlwiKTtcbiAgICAgIHNldEFjdGl2ZVRhYignc2V0dGluZ3MnKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAoIW5ld1JlcG9OYW1lLnRyaW0oKSkge1xuICAgICAgc2V0Q3JlYXRlU3RhdHVzKFwiUGxlYXNlIHNwZWNpZnkgYSByZXBvc2l0b3J5IG5hbWUuXCIpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHNldENyZWF0ZVN0YXR1cyhcIkNyZWF0aW5nIG5ldyBHaXRIdWIgcmVwb3NpdG9yeS4uLlwiKTtcbiAgICB0cnkge1xuICAgICAgY29uc3QgcmVzID0gYXdhaXQgZmV0Y2goXCJodHRwczovL2FwaS5naXRodWIuY29tL3VzZXIvcmVwb3NcIiwge1xuICAgICAgICBtZXRob2Q6IFwiUE9TVFwiLFxuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgXCJBdXRob3JpemF0aW9uXCI6IGBCZWFyZXIgJHtnaHBUb2tlbi50cmltKCl9YCxcbiAgICAgICAgICBcIkNvbnRlbnQtVHlwZVwiOiBcImFwcGxpY2F0aW9uL2pzb25cIixcbiAgICAgICAgICBcIkFjY2VwdFwiOiBcImFwcGxpY2F0aW9uL3ZuZC5naXRodWIudjMranNvblwiXG4gICAgICAgIH0sXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICBuYW1lOiBuZXdSZXBvTmFtZS50cmltKCksXG4gICAgICAgICAgZGVzY3JpcHRpb246IG5ld1JlcG9EZXNjLnRyaW0oKSxcbiAgICAgICAgICBwcml2YXRlOiBpc1ByaXZhdGUsXG4gICAgICAgICAgYXV0b19pbml0OiB0cnVlXG4gICAgICAgIH0pXG4gICAgICB9KTtcblxuICAgICAgaWYgKHJlcy5vaykge1xuICAgICAgICBjb25zdCBkYXRhID0gYXdhaXQgcmVzLmpzb24oKTtcbiAgICAgICAgc2V0VGFyZ2V0UmVwbyhkYXRhLm5hbWUpO1xuICAgICAgICBzZXRDcmVhdGVTdGF0dXMoYFJlcG9zaXRvcnkgJyR7ZGF0YS5mdWxsX25hbWV9JyBjcmVhdGVkIHN1Y2Nlc3NmdWxseSFgKTtcbiAgICAgICAgc2V0UHVibGlzaGVkVXJsKGRhdGEuaHRtbF91cmwpO1xuICAgICAgICBzZXRBY3RpdmVUYWIoJ3B1Ymxpc2gnKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IGVyckRhdGEgPSBhd2FpdCByZXMuanNvbigpO1xuICAgICAgICBzZXRDcmVhdGVTdGF0dXMoYEZhaWxlZCB0byBjcmVhdGUgcmVwb3NpdG9yeTogJHtlcnJEYXRhLm1lc3NhZ2UgfHwgJ0Vycm9yJ31gKTtcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlcnI6IGFueSkge1xuICAgICAgc2V0Q3JlYXRlU3RhdHVzKGBFcnJvcjogJHtlcnIubWVzc2FnZSB8fCBlcnJ9YCk7XG4gICAgfVxuICB9O1xuXG4gIGNvbnN0IGhhbmRsZUNvbW1pdEFuZFB1c2ggPSBhc3luYyAoKSA9PiB7XG4gICAgaWYgKCFnaHBUb2tlbi50cmltKCkpIHtcbiAgICAgIHNldFN5bmNMb2dzKFtcIkVSUk9SOiBNaXNzaW5nIFBlcnNvbmFsIEFjY2VzcyBUb2tlbi4gT3BlbiBTZXR0aW5ncyB0byBjb25maWd1cmUgR0hQIHRva2VuLlwiXSk7XG4gICAgICBzZXRBY3RpdmVUYWIoJ3NldHRpbmdzJyk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgc2V0SXNTeW5jaW5nKHRydWUpO1xuICAgIHNldFN5bmNMb2dzKFtdKTtcbiAgICBzZXRQdWJsaXNoZWRVcmwobnVsbCk7XG5cbiAgICBjb25zdCBsb2cgPSAobXNnOiBzdHJpbmcpID0+IHNldFN5bmNMb2dzKHByZXYgPT4gWy4uLnByZXYsIGBbJHtuZXcgRGF0ZSgpLnRvTG9jYWxlVGltZVN0cmluZygpfV0gJHttc2d9YF0pO1xuXG4gICAgdHJ5IHtcbiAgICAgIGxvZyhcIkNvbm5lY3RpbmcgdG8gR2l0SHViIFJFU1QgQVBJLi4uXCIpO1xuICAgICAgXG4gICAgICBjb25zdCB1c2VyUmVzID0gYXdhaXQgZmV0Y2goXCJodHRwczovL2FwaS5naXRodWIuY29tL3VzZXJcIiwge1xuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgXCJBdXRob3JpemF0aW9uXCI6IGBCZWFyZXIgJHtnaHBUb2tlbi50cmltKCl9YCxcbiAgICAgICAgICBcIkFjY2VwdFwiOiBcImFwcGxpY2F0aW9uL3ZuZC5naXRodWIudjMranNvblwiXG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICBpZiAoIXVzZXJSZXMub2spIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiSW52YWxpZCBQZXJzb25hbCBBY2Nlc3MgVG9rZW4uIFBsZWFzZSBjaGVjayB5b3VyIHRva2VuIGluIFNldHRpbmdzLlwiKTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgdXNlckRhdGEgPSBhd2FpdCB1c2VyUmVzLmpzb24oKTtcbiAgICAgIGNvbnN0IG93bmVyID0gdXNlckRhdGEubG9naW47XG4gICAgICBsb2coYEF1dGhlbnRpY2F0ZWQgYXMgR2l0SHViIHVzZXI6IEAke293bmVyfWApO1xuXG4gICAgICBjb25zdCBwdXNoRmlsZVRvR2l0aHViID0gYXN5bmMgKHBhdGg6IHN0cmluZywgY29udGVudDogc3RyaW5nLCBtZXNzYWdlOiBzdHJpbmcpID0+IHtcbiAgICAgICAgY29uc3QgdXJsID0gYGh0dHBzOi8vYXBpLmdpdGh1Yi5jb20vcmVwb3MvJHtvd25lcn0vJHt0YXJnZXRSZXBvLnRyaW0oKX0vY29udGVudHMvJHtwYXRofWA7XG4gICAgICAgIFxuICAgICAgICBsZXQgZXhpc3RpbmdTaGEgPSBcIlwiO1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGNvbnN0IGNoZWNrUmVzID0gYXdhaXQgZmV0Y2godXJsLCB7XG4gICAgICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgICAgIFwiQXV0aG9yaXphdGlvblwiOiBgQmVhcmVyICR7Z2hwVG9rZW4udHJpbSgpfWAsXG4gICAgICAgICAgICAgIFwiQWNjZXB0XCI6IFwiYXBwbGljYXRpb24vdm5kLmdpdGh1Yi52Mytqc29uXCJcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgICBpZiAoY2hlY2tSZXMub2spIHtcbiAgICAgICAgICAgIGNvbnN0IGNoZWNrRGF0YSA9IGF3YWl0IGNoZWNrUmVzLmpzb24oKTtcbiAgICAgICAgICAgIGV4aXN0aW5nU2hhID0gY2hlY2tEYXRhLnNoYTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAvLyBGaWxlIGRvZXMgbm90IGV4aXN0IHlldFxuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgZW5jb2RlciA9IG5ldyBUZXh0RW5jb2RlcigpO1xuICAgICAgICBjb25zdCBkYXRhID0gZW5jb2Rlci5lbmNvZGUoY29udGVudCk7XG4gICAgICAgIGxldCBiaW5hcnkgPSBcIlwiO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGRhdGEubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICBiaW5hcnkgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShkYXRhW2ldKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBjb250ZW50QmFzZTY0ID0gYnRvYShiaW5hcnkpO1xuXG4gICAgICAgIGNvbnN0IGJvZHlQYXlsb2FkOiBhbnkgPSB7XG4gICAgICAgICAgbWVzc2FnZTogbWVzc2FnZSxcbiAgICAgICAgICBjb250ZW50OiBjb250ZW50QmFzZTY0XG4gICAgICAgIH07XG4gICAgICAgIGlmIChleGlzdGluZ1NoYSkge1xuICAgICAgICAgIGJvZHlQYXlsb2FkLnNoYSA9IGV4aXN0aW5nU2hhO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgcHV0UmVzID0gYXdhaXQgZmV0Y2godXJsLCB7XG4gICAgICAgICAgbWV0aG9kOiBcIlBVVFwiLFxuICAgICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICAgIFwiQXV0aG9yaXphdGlvblwiOiBgQmVhcmVyICR7Z2hwVG9rZW4udHJpbSgpfWAsXG4gICAgICAgICAgICBcIkNvbnRlbnQtVHlwZVwiOiBcImFwcGxpY2F0aW9uL2pzb25cIixcbiAgICAgICAgICAgIFwiQWNjZXB0XCI6IFwiYXBwbGljYXRpb24vdm5kLmdpdGh1Yi52Mytqc29uXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KGJvZHlQYXlsb2FkKVxuICAgICAgICB9KTtcblxuICAgICAgICBpZiAoIXB1dFJlcy5vaykge1xuICAgICAgICAgIGNvbnN0IGVyckpzb24gPSBhd2FpdCBwdXRSZXMuanNvbigpO1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgRmFpbGVkIHRvIHB1c2ggJyR7cGF0aH0nOiAke2Vyckpzb24ubWVzc2FnZSB8fCAnQVBJIEVycm9yJ31gKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBhd2FpdCBwdXRSZXMuanNvbigpO1xuICAgICAgfTtcblxuICAgICAgbG9nKFwiR2F0aGVyaW5nIGZ1bGwgREFXIGFwcGxpY2F0aW9uIGNvZGViYXNlIGZpbGVzLi4uXCIpO1xuXG4gICAgICBjb25zdCBmYWxsYmFja1BrZyA9IHtcbiAgICAgICAgbmFtZTogXCJyZW1peC1vcy1hdWRpby1zdHVkaW9cIixcbiAgICAgICAgcHJpdmF0ZTogdHJ1ZSxcbiAgICAgICAgdmVyc2lvbjogXCIyLjQuMFwiLFxuICAgICAgICB0eXBlOiBcIm1vZHVsZVwiLFxuICAgICAgICBzY3JpcHRzOiB7IFwiZGV2XCI6IFwidml0ZSAtLXBvcnQ9MzAwMCAtLWhvc3Q9MC4wLjAuMFwiLCBcImJ1aWxkXCI6IFwidml0ZSBidWlsZFwiLCBcInByZXZpZXdcIjogXCJ2aXRlIHByZXZpZXdcIiwgXCJsaW50XCI6IFwidHNjIC0tbm9FbWl0XCIgfSxcbiAgICAgICAgZGVwZW5kZW5jaWVzOiB7IFwiQGdvb2dsZS9nZW5haVwiOiBcIl4yLjQuMFwiLCBcIkB0YWlsd2luZGNzcy92aXRlXCI6IFwiXjQuMy4zXCIsIFwiQHZpdGVqcy9wbHVnaW4tcmVhY3RcIjogXCJeNi4xLjFcIiwgXCJsdWNpZGUtcmVhY3RcIjogXCJeMC41NDYuMFwiLCBcInJlYWN0XCI6IFwiXjE5LjAuMVwiLCBcInJlYWN0LWRvbVwiOiBcIl4xOS4wLjFcIiwgXCJ2aXRlXCI6IFwiXjguMy4wXCIgfSxcbiAgICAgICAgZGV2RGVwZW5kZW5jaWVzOiB7IFwiQHR5cGVzL25vZGVcIjogXCJeMjIuMTQuMFwiLCBcIkB0eXBlcy9yZWFjdFwiOiBcIl4xOS4zLjBcIiwgXCJAdHlwZXMvcmVhY3QtZG9tXCI6IFwiXjE5LjMuMFwiLCBcInRhaWx3aW5kY3NzXCI6IFwiXjQuMy4zXCIsIFwidHlwZXNjcmlwdFwiOiBcIl43LjAuMlwiIH1cbiAgICAgIH07XG5cbiAgICAgIGNvbnN0IGZldGNoRmlsZVRleHQgPSBhc3luYyAodXJsOiBzdHJpbmcsIGZhbGxiYWNrOiBzdHJpbmcpID0+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBjb25zdCByZXMgPSBhd2FpdCBmZXRjaCh1cmwpO1xuICAgICAgICAgIGlmIChyZXMub2spIHtcbiAgICAgICAgICAgIGNvbnN0IHR4dCA9IGF3YWl0IHJlcy50ZXh0KCk7XG4gICAgICAgICAgICBpZiAodHh0ICYmIHR4dC50cmltKCkubGVuZ3RoID4gMCAmJiAhdHh0LnN0YXJ0c1dpdGgoJzwhZG9jdHlwZSBodG1sPicpKSB7XG4gICAgICAgICAgICAgIHJldHVybiB0eHQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgLy8gaWdub3JlXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbGxiYWNrO1xuICAgICAgfTtcblxuICAgICAgY29uc3QgYXBwVHN4VGV4dCA9IGF3YWl0IGZldGNoRmlsZVRleHQoJy9zcmMvQXBwLnRzeCcsICcvLyBSZW1peCBPUyBBdWRpbyBTdHVkaW8gQXBwLnRzeCcpO1xuICAgICAgY29uc3QgcGtnSnNvblRleHQgPSBhd2FpdCBmZXRjaEZpbGVUZXh0KCcvcGFja2FnZS5qc29uJywgSlNPTi5zdHJpbmdpZnkoZmFsbGJhY2tQa2csIG51bGwsIDIpKTtcbiAgICAgIGNvbnN0IHZpdGVDZmdUZXh0ID0gYXdhaXQgZmV0Y2hGaWxlVGV4dCgnL3ZpdGUuY29uZmlnLnRzJywgYGltcG9ydCB0YWlsd2luZGNzcyBmcm9tICdAdGFpbHdpbmRjc3Mvdml0ZSc7XFxuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0JztcXG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJztcXG5pbXBvcnQge2RlZmluZUNvbmZpZ30gZnJvbSAndml0ZSc7XFxuXFxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcXG4gIHBsdWdpbnM6IFtyZWFjdCgpLCB0YWlsd2luZGNzcygpXSxcXG4gIHJlc29sdmU6IHsgYWxpYXM6IHsgJ0AnOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLicpIH0gfVxcbn0pO2ApO1xuICAgICAgY29uc3QgdHNDZmdUZXh0ID0gYXdhaXQgZmV0Y2hGaWxlVGV4dCgnL3RzY29uZmlnLmpzb24nLCBge1xcbiAgXCJjb21waWxlck9wdGlvbnNcIjoge1xcbiAgICBcInRhcmdldFwiOiBcIkVTMjAyMlwiLFxcbiAgICBcIm1vZHVsZVwiOiBcIkVTTmV4dFwiLFxcbiAgICBcInR5cGVzXCI6IFtcInZpdGUvY2xpZW50XCJdLFxcbiAgICBcImxpYlwiOiBbXCJFUzIwMjJcIiwgXCJET01cIiwgXCJET00uSXRlcmFibGVcIl0sXFxuICAgIFwic2tpcExpYkNoZWNrXCI6IHRydWUsXFxuICAgIFwibW9kdWxlUmVzb2x1dGlvblwiOiBcImJ1bmRsZXJcIixcXG4gICAgXCJpc29sYXRlZE1vZHVsZXNcIjogdHJ1ZSxcXG4gICAgXCJhbGxvd0pzXCI6IHRydWUsXFxuICAgIFwianN4XCI6IFwicmVhY3QtanN4XCIsXFxuICAgIFwibm9FbWl0XCI6IHRydWVcXG4gIH1cXG59YCk7XG4gICAgICBjb25zdCBodG1sVGV4dCA9IGF3YWl0IGZldGNoRmlsZVRleHQoJy9pbmRleC5odG1sJywgYDwhZG9jdHlwZSBodG1sPlxcbjxodG1sIGxhbmc9XCJlblwiPlxcbiAgPGhlYWQ+XFxuICAgIDxtZXRhIGNoYXJzZXQ9XCJVVEYtOFwiIC8+XFxuICAgIDx0aXRsZT5SZW1peCBPUyBBdWRpbyBTdHVkaW88L3RpdGxlPlxcbiAgPC9oZWFkPlxcbiAgPGJvZHk+XFxuICAgIDxkaXYgaWQ9XCJyb290XCI+PC9kaXY+XFxuICAgIDxzY3JpcHQgdHlwZT1cIm1vZHVsZVwiIHNyYz1cIi9zcmMvbWFpbi50c3hcIj48L3NjcmlwdD5cXG4gIDwvYm9keT5cXG48L2h0bWw+YCk7XG4gICAgICBjb25zdCBtYWluVHN4VGV4dCA9IGF3YWl0IGZldGNoRmlsZVRleHQoJy9zcmMvbWFpbi50c3gnLCBgaW1wb3J0IHtjcmVhdGVSb290fSBmcm9tICdyZWFjdC1kb20vY2xpZW50JztcXG5pbXBvcnQgQXBwIGZyb20gJy4vQXBwLnRzeCc7XFxuaW1wb3J0ICcuL2luZGV4LmNzcyc7XFxuXFxuY3JlYXRlUm9vdChkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncm9vdCcpISkucmVuZGVyKDxBcHAgLz4pO2ApO1xuICAgICAgY29uc3QgaW5kZXhDc3NUZXh0ID0gYXdhaXQgZmV0Y2hGaWxlVGV4dCgnL3NyYy9pbmRleC5jc3MnLCBgQGltcG9ydCBcInRhaWx3aW5kY3NzXCI7YCk7XG5cbiAgICAgIGNvbnN0IHNlc3Npb25EYXRhID0ge1xuICAgICAgICBhcHA6IFwiUmVtaXggT1MgQXVkaW8gU3R1ZGlvXCIsXG4gICAgICAgIHZlcnNpb246IFwiMi40LjBcIixcbiAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgICAgIGJwbTogYnBtIHx8IDEyNCxcbiAgICAgICAgbWFzdGVyVm9sdW1lOiBtYXN0ZXJWb2x1bWUgfHwgMC44NSxcbiAgICAgICAgcGFkczogcGFkcyB8fCBbXSxcbiAgICAgICAgZGVzY3JpcHRpb246IFwiRXhwb3J0ZWQgREFXIHNlc3Npb24gc3RhdGVcIixcbiAgICAgICAgcmVhZG1lOiByZWFkbWVDb250ZW50XG4gICAgICB9O1xuXG4gICAgICBjb25zdCBmaWxlc1RvUHVzaCA9IFtcbiAgICAgICAgeyBwYXRoOiBcIlJFQURNRS5tZFwiLCBjb250ZW50OiByZWFkbWVDb250ZW50LCBkZXNjOiBcIlJFQURNRSBkb2N1bWVudGF0aW9uXCIgfSxcbiAgICAgICAgeyBwYXRoOiBcInNlc3Npb24tZGF0YS5qc29uXCIsIGNvbnRlbnQ6IEpTT04uc3RyaW5naWZ5KHNlc3Npb25EYXRhLCBudWxsLCAyKSwgZGVzYzogXCJEQVcgU2Vzc2lvbiBwYXJhbWV0ZXJzXCIgfSxcbiAgICAgICAgeyBwYXRoOiBcInBhY2thZ2UuanNvblwiLCBjb250ZW50OiBwa2dKc29uVGV4dCwgZGVzYzogXCJOUE0gRGVwZW5kZW5jaWVzXCIgfSxcbiAgICAgICAgeyBwYXRoOiBcInZpdGUuY29uZmlnLnRzXCIsIGNvbnRlbnQ6IHZpdGVDZmdUZXh0LCBkZXNjOiBcIlZpdGUgQ29uZmlnXCIgfSxcbiAgICAgICAgeyBwYXRoOiBcInRzY29uZmlnLmpzb25cIiwgY29udGVudDogdHNDZmdUZXh0LCBkZXNjOiBcIlR5cGVTY3JpcHQgQ29uZmlnXCIgfSxcbiAgICAgICAgeyBwYXRoOiBcImluZGV4Lmh0bWxcIiwgY29udGVudDogaHRtbFRleHQsIGRlc2M6IFwiSFRNTCBFbnRyeSBwb2ludFwiIH0sXG4gICAgICAgIHsgcGF0aDogXCJzcmMvQXBwLnRzeFwiLCBjb250ZW50OiBhcHBUc3hUZXh0LCBkZXNjOiBcIkRBVyBBcHBsaWNhdGlvbiBTb3VyY2VcIiB9LFxuICAgICAgICB7IHBhdGg6IFwic3JjL21haW4udHN4XCIsIGNvbnRlbnQ6IG1haW5Uc3hUZXh0LCBkZXNjOiBcIlJlYWN0IE1vdW50aW5nIHNjcmlwdFwiIH0sXG4gICAgICAgIHsgcGF0aDogXCJzcmMvaW5kZXguY3NzXCIsIGNvbnRlbnQ6IGluZGV4Q3NzVGV4dCwgZGVzYzogXCJUYWlsd2luZCBDU1Mgc3R5bGVzaGVldFwiIH0sXG4gICAgICAgIHsgcGF0aDogXCIuZ2l0aWdub3JlXCIsIGNvbnRlbnQ6IFwibm9kZV9tb2R1bGVzL1xcbmRpc3QvXFxuLmVudlxcbi5lbnYubG9jYWxcXG5cIiwgZGVzYzogXCJHaXQgSWdub3JlIGZpbGVcIiB9XG4gICAgICBdO1xuXG4gICAgICBsb2coYEZvdW5kICR7ZmlsZXNUb1B1c2gubGVuZ3RofSBjb2RlYmFzZSBmaWxlcyB0byBjb21taXQgYW5kIHB1c2guLi5gKTtcblxuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBmaWxlc1RvUHVzaC5sZW5ndGg7IGkrKykge1xuICAgICAgICBjb25zdCBpdGVtID0gZmlsZXNUb1B1c2hbaV07XG4gICAgICAgIGxvZyhgWyR7aSArIDF9LyR7ZmlsZXNUb1B1c2gubGVuZ3RofV0gUHVzaGluZyAnJHtpdGVtLnBhdGh9JyAoJHtpdGVtLmRlc2N9KS4uLmApO1xuICAgICAgICBhd2FpdCBwdXNoRmlsZVRvR2l0aHViKGl0ZW0ucGF0aCwgaXRlbS5jb250ZW50LCBgJHtjb21taXRNc2cudHJpbSgpIHx8ICdVcGRhdGUgREFXIHNlc3Npb24nfSAtICR7aXRlbS5wYXRofWApO1xuICAgICAgfVxuXG4gICAgICBjb25zdCByZXBvVXJsID0gYGh0dHBzOi8vZ2l0aHViLmNvbS8ke293bmVyfS8ke3RhcmdldFJlcG8udHJpbSgpfWA7XG4gICAgICBzZXRQdWJsaXNoZWRVcmwocmVwb1VybCk7XG4gICAgICBsb2coYEFMTCAke2ZpbGVzVG9QdXNoLmxlbmd0aH0gQ09ERUJBU0UgRklMRVMgQ09NTUlUVEVEICYgUFVTSEVEIFRPIE9SSUdJTi9NQUlOIWApO1xuXG4gICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgIGxvZyhgRVJST1I6ICR7ZXJyLm1lc3NhZ2UgfHwgZXJyfWApO1xuICAgIH0gZmluYWxseSB7XG4gICAgICBzZXRJc1N5bmNpbmcoZmFsc2UpO1xuICAgIH1cbiAgfTtcblxuICByZXR1cm4gKFxuICAgIDxkaXYgY2xhc3NOYW1lPVwiaC1mdWxsIGJnLXNsYXRlLTkwMCBwLTYgZmxleCBmbGV4LWNvbCBnYXAtNCBmb250LW1vbm8gdGV4dC14cyB0ZXh0LXNsYXRlLTMwMCBvdmVyZmxvdy15LWF1dG9cIj5cbiAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBqdXN0aWZ5LWJldHdlZW4gaXRlbXMtY2VudGVyIGJnLXNsYXRlLTk1MCBwLTMgcm91bmRlZC1sZyBib3JkZXIgYm9yZGVyLXNsYXRlLTgwMCBzaGFkb3ctbWRcIj5cbiAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwiZm9udC1ibGFjayB0cmFja2luZy13aWRlc3QgdGV4dC1zbGF0ZS0yMDAgZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTJcIj5cbiAgICAgICAgICA8R2l0aHViIHNpemU9ezE4fSAvPiBHSVRIVUIgUFJPSkVDVCBQVUJMSVNIRVJcbiAgICAgICAgPC9zcGFuPlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0yXCI+XG4gICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgb25DbGljaz17KCkgPT4gc2V0QWN0aXZlVGFiKCdwdWJsaXNoJyl9XG4gICAgICAgICAgICBjbGFzc05hbWU9e2BweC0zIHB5LTEgcm91bmRlZCB0ZXh0LVsxMHB4XSBmb250LWJvbGQgdHJhbnNpdGlvbi1hbGwgJHtcbiAgICAgICAgICAgICAgYWN0aXZlVGFiID09PSAncHVibGlzaCcgPyAnYmctY3lhbi02MDAgdGV4dC13aGl0ZSBzaGFkb3ctWzBfMF8xMHB4XyMwODkxYjJdJyA6ICdiZy1zbGF0ZS04MDAgdGV4dC1zbGF0ZS00MDAgaG92ZXI6Ymctc2xhdGUtNzAwJ1xuICAgICAgICAgICAgfWB9XG4gICAgICAgICAgPlxuICAgICAgICAgICAgUFVTSFxuICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHNldEFjdGl2ZVRhYignbmV3LXJlcG8nKX1cbiAgICAgICAgICAgIGNsYXNzTmFtZT17YHB4LTMgcHktMSByb3VuZGVkIHRleHQtWzEwcHhdIGZvbnQtYm9sZCB0cmFuc2l0aW9uLWFsbCAke1xuICAgICAgICAgICAgICBhY3RpdmVUYWIgPT09ICduZXctcmVwbycgPyAnYmctY3lhbi02MDAgdGV4dC13aGl0ZSBzaGFkb3ctWzBfMF8xMHB4XyMwODkxYjJdJyA6ICdiZy1zbGF0ZS04MDAgdGV4dC1zbGF0ZS00MDAgaG92ZXI6Ymctc2xhdGUtNzAwJ1xuICAgICAgICAgICAgfWB9XG4gICAgICAgICAgPlxuICAgICAgICAgICAgTkVXIFJFUE9cbiAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBzZXRBY3RpdmVUYWIoJ3NldHRpbmdzJyl9XG4gICAgICAgICAgICBjbGFzc05hbWU9e2BweC0zIHB5LTEgcm91bmRlZCB0ZXh0LVsxMHB4XSBmb250LWJvbGQgdHJhbnNpdGlvbi1hbGwgZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTEgJHtcbiAgICAgICAgICAgICAgYWN0aXZlVGFiID09PSAnc2V0dGluZ3MnID8gJ2JnLWFtYmVyLTYwMCB0ZXh0LXNsYXRlLTk1MCBzaGFkb3ctWzBfMF8xMHB4XyNkOTc3MDZdJyA6ICdiZy1zbGF0ZS04MDAgdGV4dC1zbGF0ZS00MDAgaG92ZXI6Ymctc2xhdGUtNzAwJ1xuICAgICAgICAgICAgfWB9XG4gICAgICAgICAgPlxuICAgICAgICAgICAgPFNsaWRlcnMgc2l6ZT17MTJ9IC8+IFNFVFRJTkdTXG4gICAgICAgICAgPC9idXR0b24+XG4gICAgICAgIDwvZGl2PlxuICAgICAgPC9kaXY+XG5cbiAgICAgIHthY3RpdmVUYWIgPT09ICdzZXR0aW5ncycgJiYgKFxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImJnLXNsYXRlLTk1MCBwLTQgcm91bmRlZC14bCBib3JkZXIgYm9yZGVyLXNsYXRlLTgwMCBmbGV4IGZsZXgtY29sIGdhcC00IHNoYWRvdy1sZ1wiPlxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1iZXR3ZWVuIGJvcmRlci1iIGJvcmRlci1zbGF0ZS04MDAgcGItMlwiPlxuICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1bMTFweF0gZm9udC1ib2xkIHRleHQtYW1iZXItNDAwIHVwcGVyY2FzZSB0cmFja2luZy13aWRlciBmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMlwiPlxuICAgICAgICAgICAgICA8U2xpZGVycyBzaXplPXsxNH0gLz4gR0lUSFVCIEFVVEhFTlRJQ0FUSU9OIFNFVFRJTkdTXG4gICAgICAgICAgICA8L3NwYW4+XG4gICAgICAgICAgICB7dXNlckluZm8gJiYgKFxuICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LVs5cHhdIGJnLWVtZXJhbGQtOTUwIHRleHQtZW1lcmFsZC00MDAgYm9yZGVyIGJvcmRlci1lbWVyYWxkLTgwMCBweC0yIHB5LTAuNSByb3VuZGVkIGZvbnQtYm9sZFwiPlxuICAgICAgICAgICAgICAgIFRPS0VOIFZBTElEQVRFRFxuICAgICAgICAgICAgICA8L3NwYW4+XG4gICAgICAgICAgICApfVxuICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAge3VzZXJJbmZvICYmIChcbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTMgYmctc2xhdGUtOTAwIHAtMyByb3VuZGVkLWxnIGJvcmRlciBib3JkZXItc2xhdGUtODAwXCI+XG4gICAgICAgICAgICAgIDxpbWcgc3JjPXt1c2VySW5mby5hdmF0YXJfdXJsfSBhbHQ9XCJHaXRIdWIgQXZhdGFyXCIgY2xhc3NOYW1lPVwidy0xMCBoLTEwIHJvdW5kZWQtZnVsbCBib3JkZXIgYm9yZGVyLXNsYXRlLTcwMFwiIC8+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBmbGV4LWNvbFwiPlxuICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cImZvbnQtYm9sZCB0ZXh0LXNsYXRlLTEwMCB0ZXh0LXNtXCI+QHt1c2VySW5mby5sb2dpbn08L3NwYW4+XG4gICAgICAgICAgICAgICAgPGEgaHJlZj17dXNlckluZm8uaHRtbF91cmx9IHRhcmdldD1cIl9ibGFua1wiIHJlbD1cIm5vcmVmZXJyZXJcIiBjbGFzc05hbWU9XCJ0ZXh0LVsxMHB4XSB0ZXh0LWN5YW4tNDAwIGhvdmVyOnVuZGVybGluZVwiPlxuICAgICAgICAgICAgICAgICAge3VzZXJJbmZvLmh0bWxfdXJsfVxuICAgICAgICAgICAgICAgIDwvYT5cbiAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICApfVxuXG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGZsZXgtY29sIGdhcC0xLjVcIj5cbiAgICAgICAgICAgIDxsYWJlbCBjbGFzc05hbWU9XCJ0ZXh0LVsxMHB4XSB0ZXh0LXNsYXRlLTQwMCBmb250LWJvbGQgdXBwZXJjYXNlIHRyYWNraW5nLXdpZGVyXCI+XG4gICAgICAgICAgICAgIFBlcnNvbmFsIEFjY2VzcyBUb2tlbiAoR0hQIFRva2VuKVxuICAgICAgICAgICAgPC9sYWJlbD5cbiAgICAgICAgICAgIDxpbnB1dFxuICAgICAgICAgICAgICB0eXBlPVwicGFzc3dvcmRcIlxuICAgICAgICAgICAgICBwbGFjZWhvbGRlcj1cImdocF94eHh4eHh4eHh4eHh4eHh4eHh4eCBvciBnaXRodWJfcGF0X3h4eHhcIlxuICAgICAgICAgICAgICB2YWx1ZT17Z2hwVG9rZW59XG4gICAgICAgICAgICAgIG9uQ2hhbmdlPXsoZSkgPT4gaGFuZGxlU2F2ZVRva2VuKGUudGFyZ2V0LnZhbHVlKX1cbiAgICAgICAgICAgICAgY2xhc3NOYW1lPVwidy1mdWxsIGJnLXNsYXRlLTkwMCBib3JkZXIgYm9yZGVyLXNsYXRlLTcwMCByb3VuZGVkLWxnIHAtMi41IHRleHQtc2xhdGUtMTAwIG91dGxpbmUtbm9uZSBmb2N1czpib3JkZXItYW1iZXItNTAwIGZvbnQtbW9ub1wiXG4gICAgICAgICAgICAvPlxuICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1bOXB4XSB0ZXh0LXNsYXRlLTUwMCBsZWFkaW5nLW5vcm1hbFwiPlxuICAgICAgICAgICAgICBOb3RlOiBSZXF1aXJlcyBhIEdpdEh1YiBQZXJzb25hbCBBY2Nlc3MgVG9rZW4gd2l0aCA8Y29kZSBjbGFzc05hbWU9XCJ0ZXh0LWFtYmVyLTMwMCBiZy1zbGF0ZS05MDAgcHgtMSByb3VuZGVkXCI+cmVwbzwvY29kZT4gc2NvcGUgZW5hYmxlZCB0byBjcmVhdGUgcmVwb3NpdG9yaWVzIGFuZCBjb21taXQgZmlsZXMuXG4gICAgICAgICAgICA8L3NwYW4+XG4gICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICB7dG9rZW5TdGF0dXMgJiYgKFxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9e2BwLTIuNSByb3VuZGVkLWxnIHRleHQtWzEwcHhdIGZvbnQtYm9sZCBib3JkZXIgJHtcbiAgICAgICAgICAgICAgdG9rZW5TdGF0dXMuaW5jbHVkZXMoXCJBdXRoZW50aWNhdGVkXCIpIHx8IHRva2VuU3RhdHVzLmluY2x1ZGVzKFwiVkFMSURBVEVEXCIpXG4gICAgICAgICAgICAgICAgPyAnYmctZW1lcmFsZC05NTAgYm9yZGVyLWVtZXJhbGQtODAwIHRleHQtZW1lcmFsZC00MDAnXG4gICAgICAgICAgICAgICAgOiAnYmctc2xhdGUtOTAwIGJvcmRlci1zbGF0ZS04MDAgdGV4dC1hbWJlci00MDAnXG4gICAgICAgICAgICB9YH0+XG4gICAgICAgICAgICAgIHt0b2tlblN0YXR1c31cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICl9XG4gICAgICAgIDwvZGl2PlxuICAgICAgKX1cblxuICAgICAge2FjdGl2ZVRhYiA9PT0gJ25ldy1yZXBvJyAmJiAoXG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYmctc2xhdGUtOTUwIHAtNCByb3VuZGVkLXhsIGJvcmRlciBib3JkZXItc2xhdGUtODAwIGZsZXggZmxleC1jb2wgZ2FwLTQgc2hhZG93LWxnXCI+XG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWJldHdlZW4gYm9yZGVyLWIgYm9yZGVyLXNsYXRlLTgwMCBwYi0yXCI+XG4gICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LVsxMXB4XSBmb250LWJvbGQgdGV4dC1jeWFuLTQwMCB1cHBlcmNhc2UgdHJhY2tpbmctd2lkZXIgZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTJcIj5cbiAgICAgICAgICAgICAgPEdpdGh1YiBzaXplPXsxNH0gLz4gQ1JFQVRFIE5FVyBHSVRIVUIgUkVQT1NJVE9SWVxuICAgICAgICAgICAgPC9zcGFuPlxuICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGZsZXgtY29sIGdhcC0xLjVcIj5cbiAgICAgICAgICAgIDxsYWJlbCBjbGFzc05hbWU9XCJ0ZXh0LVsxMHB4XSB0ZXh0LXNsYXRlLTQwMCBmb250LWJvbGRcIj5SRVBPU0lUT1JZIE5BTUU8L2xhYmVsPlxuICAgICAgICAgICAgPGlucHV0XG4gICAgICAgICAgICAgIHR5cGU9XCJ0ZXh0XCJcbiAgICAgICAgICAgICAgdmFsdWU9e25ld1JlcG9OYW1lfVxuICAgICAgICAgICAgICBvbkNoYW5nZT17KGUpID0+IHNldE5ld1JlcG9OYW1lKGUudGFyZ2V0LnZhbHVlKX1cbiAgICAgICAgICAgICAgcGxhY2Vob2xkZXI9XCJteS1yZW1peC1kYXctcHJvamVjdFwiXG4gICAgICAgICAgICAgIGNsYXNzTmFtZT1cInctZnVsbCBiZy1zbGF0ZS05MDAgYm9yZGVyIGJvcmRlci1zbGF0ZS03MDAgcm91bmRlZC1sZyBwLTIuNSB0ZXh0LXNsYXRlLTEwMCBvdXRsaW5lLW5vbmUgZm9jdXM6Ym9yZGVyLWN5YW4tNTAwIGZvbnQtYm9sZFwiXG4gICAgICAgICAgICAvPlxuICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGZsZXgtY29sIGdhcC0xLjVcIj5cbiAgICAgICAgICAgIDxsYWJlbCBjbGFzc05hbWU9XCJ0ZXh0LVsxMHB4XSB0ZXh0LXNsYXRlLTQwMCBmb250LWJvbGRcIj5ERVNDUklQVElPTjwvbGFiZWw+XG4gICAgICAgICAgICA8dGV4dGFyZWFcbiAgICAgICAgICAgICAgcm93cz17Mn1cbiAgICAgICAgICAgICAgdmFsdWU9e25ld1JlcG9EZXNjfVxuICAgICAgICAgICAgICBvbkNoYW5nZT17KGUpID0+IHNldE5ld1JlcG9EZXNjKGUudGFyZ2V0LnZhbHVlKX1cbiAgICAgICAgICAgICAgcGxhY2Vob2xkZXI9XCJEZXNjcmliZSB5b3VyIG11c2ljIHByb2plY3Qgc2Vzc2lvbi4uLlwiXG4gICAgICAgICAgICAgIGNsYXNzTmFtZT1cInctZnVsbCBiZy1zbGF0ZS05MDAgYm9yZGVyIGJvcmRlci1zbGF0ZS03MDAgcm91bmRlZC1sZyBwLTIuNSB0ZXh0LXNsYXRlLTEwMCBvdXRsaW5lLW5vbmUgZm9jdXM6Ym9yZGVyLWN5YW4tNTAwIHJlc2l6ZS1ub25lXCJcbiAgICAgICAgICAgIC8+XG4gICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0yIGJnLXNsYXRlLTkwMCBwLTIuNSByb3VuZGVkLWxnIGJvcmRlciBib3JkZXItc2xhdGUtODAwXCI+XG4gICAgICAgICAgICA8aW5wdXRcbiAgICAgICAgICAgICAgdHlwZT1cImNoZWNrYm94XCJcbiAgICAgICAgICAgICAgaWQ9XCJwcml2YXRlLXJlcG8tY2hlY2tcIlxuICAgICAgICAgICAgICBjaGVja2VkPXtpc1ByaXZhdGV9XG4gICAgICAgICAgICAgIG9uQ2hhbmdlPXsoZSkgPT4gc2V0SXNQcml2YXRlKGUudGFyZ2V0LmNoZWNrZWQpfVxuICAgICAgICAgICAgICBjbGFzc05hbWU9XCJhY2NlbnQtY3lhbi01MDAgY3Vyc29yLXBvaW50ZXJcIlxuICAgICAgICAgICAgLz5cbiAgICAgICAgICAgIDxsYWJlbCBodG1sRm9yPVwicHJpdmF0ZS1yZXBvLWNoZWNrXCIgY2xhc3NOYW1lPVwidGV4dC1bMTBweF0gdGV4dC1zbGF0ZS0zMDAgZm9udC1ib2xkIGN1cnNvci1wb2ludGVyXCI+XG4gICAgICAgICAgICAgIFByaXZhdGUgUmVwb3NpdG9yeSAoT25seSB2aXNpYmxlIHRvIGF1dGhlbnRpY2F0ZWQgdXNlcilcbiAgICAgICAgICAgIDwvbGFiZWw+XG4gICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICBvbkNsaWNrPXtoYW5kbGVDcmVhdGVSZXBvfVxuICAgICAgICAgICAgY2xhc3NOYW1lPVwidy1mdWxsIGJnLWN5YW4tNjAwIGhvdmVyOmJnLWN5YW4tNTAwIHRleHQtd2hpdGUgZm9udC1ibGFjayBweS0yLjUgcm91bmRlZC1sZyBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBnYXAtMiB0cmFuc2l0aW9uLWFsbCBzaGFkb3ctWzBfMF8xMnB4X3JnYmEoOCwxNDUsMTc4LDAuMyldIGN1cnNvci1wb2ludGVyXCJcbiAgICAgICAgICA+XG4gICAgICAgICAgICBDUkVBVEUgUkVQT1NJVE9SWSBPTiBHSVRIVUJcbiAgICAgICAgICA8L2J1dHRvbj5cblxuICAgICAgICAgIHtjcmVhdGVTdGF0dXMgJiYgKFxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJwLTIuNSBiZy1zbGF0ZS05MDAgYm9yZGVyIGJvcmRlci1zbGF0ZS04MDAgdGV4dC1jeWFuLTMwMCByb3VuZGVkLWxnIHRleHQtWzEwcHhdIGZvbnQtYm9sZFwiPlxuICAgICAgICAgICAgICB7Y3JlYXRlU3RhdHVzfVxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgKX1cbiAgICAgICAgPC9kaXY+XG4gICAgICApfVxuXG4gICAgICB7YWN0aXZlVGFiID09PSAncHVibGlzaCcgJiYgKFxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImJnLXNsYXRlLTk1MCBwLTQgcm91bmRlZC14bCBib3JkZXIgYm9yZGVyLXNsYXRlLTgwMCBmbGV4IGZsZXgtY29sIGdhcC00IHNoYWRvdy1sZ1wiPlxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBmbGV4LWNvbCBnYXAtMS41XCI+XG4gICAgICAgICAgICA8bGFiZWwgY2xhc3NOYW1lPVwidGV4dC1bMTBweF0gdGV4dC1zbGF0ZS00MDAgZm9udC1ib2xkXCI+VEFSR0VUIFJFUE9TSVRPUlk8L2xhYmVsPlxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGdhcC0yXCI+XG4gICAgICAgICAgICAgIDxpbnB1dFxuICAgICAgICAgICAgICAgIHR5cGU9XCJ0ZXh0XCJcbiAgICAgICAgICAgICAgICB2YWx1ZT17dGFyZ2V0UmVwb31cbiAgICAgICAgICAgICAgICBvbkNoYW5nZT17KGUpID0+IHNldFRhcmdldFJlcG8oZS50YXJnZXQudmFsdWUpfVxuICAgICAgICAgICAgICAgIHBsYWNlaG9sZGVyPVwicmVtaXgtb3MtYXVkaW8tc2Vzc2lvblwiXG4gICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwiZmxleC0xIGJnLXNsYXRlLTkwMCBib3JkZXIgYm9yZGVyLXNsYXRlLTcwMCByb3VuZGVkLWxnIHAtMi41IHRleHQtc2xhdGUtMTAwIG91dGxpbmUtbm9uZSBmb2N1czpib3JkZXItY3lhbi01MDAgZm9udC1ib2xkXCJcbiAgICAgICAgICAgICAgLz5cbiAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHNldEFjdGl2ZVRhYignbmV3LXJlcG8nKX1cbiAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJweC0zIGJnLXNsYXRlLTgwMCBob3ZlcjpiZy1zbGF0ZS03MDAgdGV4dC1jeWFuLTMwMCB0ZXh0LVsxMHB4XSBmb250LWJvbGQgcm91bmRlZC1sZyB0cmFuc2l0aW9uLWNvbG9yc1wiXG4gICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICArIE5FV1xuICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGZsZXgtY29sIGdhcC0xLjVcIj5cbiAgICAgICAgICAgIDxsYWJlbCBjbGFzc05hbWU9XCJ0ZXh0LVsxMHB4XSB0ZXh0LXNsYXRlLTQwMCBmb250LWJvbGRcIj5SRUFETUUuTUQgQ09OVEVOVDwvbGFiZWw+XG4gICAgICAgICAgICA8dGV4dGFyZWFcbiAgICAgICAgICAgICAgcm93cz17NH1cbiAgICAgICAgICAgICAgdmFsdWU9e3JlYWRtZUNvbnRlbnR9XG4gICAgICAgICAgICAgIG9uQ2hhbmdlPXsoZSkgPT4gc2V0UmVhZG1lQ29udGVudChlLnRhcmdldC52YWx1ZSl9XG4gICAgICAgICAgICAgIGNsYXNzTmFtZT1cInctZnVsbCBiZy1zbGF0ZS05MDAgYm9yZGVyIGJvcmRlci1zbGF0ZS03MDAgcm91bmRlZC1sZyBwLTIuNSB0ZXh0LXNsYXRlLTEwMCBvdXRsaW5lLW5vbmUgZm9jdXM6Ym9yZGVyLWN5YW4tNTAwIHJlc2l6ZS1ub25lIGZvbnQtbW9ubyB0ZXh0LVsxMXB4XVwiXG4gICAgICAgICAgICAvPlxuICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGZsZXgtY29sIGdhcC0xLjVcIj5cbiAgICAgICAgICAgIDxsYWJlbCBjbGFzc05hbWU9XCJ0ZXh0LVsxMHB4XSB0ZXh0LXNsYXRlLTQwMCBmb250LWJvbGRcIj5DT01NSVQgTUVTU0FHRTwvbGFiZWw+XG4gICAgICAgICAgICA8aW5wdXRcbiAgICAgICAgICAgICAgdHlwZT1cInRleHRcIlxuICAgICAgICAgICAgICB2YWx1ZT17Y29tbWl0TXNnfVxuICAgICAgICAgICAgICBvbkNoYW5nZT17KGUpID0+IHNldENvbW1pdE1zZyhlLnRhcmdldC52YWx1ZSl9XG4gICAgICAgICAgICAgIGNsYXNzTmFtZT1cInctZnVsbCBiZy1zbGF0ZS05MDAgYm9yZGVyIGJvcmRlci1zbGF0ZS03MDAgcm91bmRlZC1sZyBwLTIuNSB0ZXh0LXNsYXRlLTEwMCBvdXRsaW5lLW5vbmUgZm9jdXM6Ym9yZGVyLWN5YW4tNTAwIGZvbnQtYm9sZFwiXG4gICAgICAgICAgICAvPlxuICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgb25DbGljaz17aGFuZGxlQ29tbWl0QW5kUHVzaH1cbiAgICAgICAgICAgIGRpc2FibGVkPXtpc1N5bmNpbmd9XG4gICAgICAgICAgICBjbGFzc05hbWU9XCJ3LWZ1bGwgYmctY3lhbi02MDAgaG92ZXI6YmctY3lhbi01MDAgdGV4dC13aGl0ZSBmb250LWJsYWNrIHB5LTMgcm91bmRlZC14bCBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBnYXAtMiB0cmFuc2l0aW9uLWFsbCBzaGFkb3ctWzBfMF8xNXB4X3JnYmEoOCwxNDUsMTc4LDAuMyldIGRpc2FibGVkOm9wYWNpdHktNTAgY3Vyc29yLXBvaW50ZXJcIlxuICAgICAgICAgID5cbiAgICAgICAgICAgIHtpc1N5bmNpbmcgPyA8UmVmcmVzaEN3IHNpemU9ezE2fSBjbGFzc05hbWU9XCJhbmltYXRlLXNwaW5cIiAvPiA6IDxHaXRodWIgc2l6ZT17MTZ9IC8+fVxuICAgICAgICAgICAge2lzU3luY2luZyA/IFwiQ09NTUlUVElORyAmIFBVU0hJTkcgVE8gR0lUSFVCLi4uXCIgOiBcIkNPTU1JVCAmIFBVU0ggU0VTU0lPTiBUTyBHSVRIVUJcIn1cbiAgICAgICAgICA8L2J1dHRvbj5cblxuICAgICAgICAgIHtwdWJsaXNoZWRVcmwgJiYgKFxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJwLTMgYmctZW1lcmFsZC05NTAgYm9yZGVyIGJvcmRlci1lbWVyYWxkLTgwMCB0ZXh0LWVtZXJhbGQtNDAwIHJvdW5kZWQteGwgdGV4dC1jZW50ZXIgZm9udC1ib2xkIGZsZXggZmxleC1jb2wgZ2FwLTFcIj5cbiAgICAgICAgICAgICAgPHNwYW4+U3VjY2Vzc2Z1bGx5IGNvbW1pdHRlZCAmIHB1c2hlZCBzZXNzaW9uIHRvIEdpdEh1YiE8L3NwYW4+XG4gICAgICAgICAgICAgIDxhXG4gICAgICAgICAgICAgICAgaHJlZj17cHVibGlzaGVkVXJsfVxuICAgICAgICAgICAgICAgIHRhcmdldD1cIl9ibGFua1wiXG4gICAgICAgICAgICAgICAgcmVsPVwibm9yZWZlcnJlclwiXG4gICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwidGV4dC1jeWFuLTMwMCBob3Zlcjp1bmRlcmxpbmUgdGV4dC1bMTFweF0gZm9udC1ibGFja1wiXG4gICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICBPUEVOIFJFUE9TSVRPUlkgKHtwdWJsaXNoZWRVcmx9KSDihpdcbiAgICAgICAgICAgICAgPC9hPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgKX1cblxuICAgICAgICAgIHtzeW5jTG9ncy5sZW5ndGggPiAwICYmIChcbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYmctc2xhdGUtOTAwIHAtMyByb3VuZGVkLWxnIGJvcmRlciBib3JkZXItc2xhdGUtODAwIGZsZXggZmxleC1jb2wgZ2FwLTEgbWF4LWgtMzIgb3ZlcmZsb3cteS1hdXRvIGZvbnQtbW9ubyB0ZXh0LVs5cHhdIHRleHQtc2xhdGUtNDAwXCI+XG4gICAgICAgICAgICAgIHtzeW5jTG9ncy5tYXAoKGxvZ0xpbmUsIGlkeCkgPT4gKFxuICAgICAgICAgICAgICAgIDxkaXYga2V5PXtpZHh9IGNsYXNzTmFtZT17bG9nTGluZS5pbmNsdWRlcyhcIkVSUk9SXCIpID8gXCJ0ZXh0LXJlZC00MDAgZm9udC1ib2xkXCIgOiBsb2dMaW5lLmluY2x1ZGVzKFwiQ09NTUlUVEVEXCIpID8gXCJ0ZXh0LWVtZXJhbGQtNDAwIGZvbnQtYm9sZFwiIDogXCJcIn0+XG4gICAgICAgICAgICAgICAgICB7bG9nTGluZX1cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgKSl9XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICApfVxuICAgICAgICA8L2Rpdj5cbiAgICAgICl9XG4gICAgPC9kaXY+XG4gICk7XG59O1xuXG5jb25zdCBBSUNoYXRBc3Npc3RhbnQgPSAoKSA9PiB7XG4gIGNvbnN0IFttZXNzYWdlcywgc2V0TWVzc2FnZXNdID0gdXNlU3RhdGU8QXJyYXk8e3JvbGU6IHN0cmluZywgY29udGVudDogc3RyaW5nLCBzb3VyY2VzPzogYW55W119Pj4oW1xuICAgIHsgcm9sZTogXCJhc3Npc3RhbnRcIiwgY29udGVudDogXCJIZWxsbyEgSSBhbSB5b3VyIEFJIE11c2ljIFByb2R1Y2VyIGFzc2lzdGFudCBwb3dlcmVkIGJ5IEdlbWluaS4gQXNrIG1lIGFueXRoaW5nIGFib3V0IG1peGluZywgYXJyYW5nZW1lbnQsIHN5bnRoIGRlc2lnbiwgb3IgbXVzaWMgdGhlb3J5IVwiIH1cbiAgXSk7XG4gIGNvbnN0IFtpbnB1dE1lc3NhZ2UsIHNldElucHV0TWVzc2FnZV0gPSB1c2VTdGF0ZShcIlwiKTtcbiAgY29uc3QgW2lzTG9hZGluZywgc2V0SXNMb2FkaW5nXSA9IHVzZVN0YXRlKGZhbHNlKTtcbiAgY29uc3QgbWVzc2FnZXNFbmRSZWYgPSB1c2VSZWY8SFRNTERpdkVsZW1lbnQ+KG51bGwpO1xuXG4gIGNvbnN0IHNjcm9sbFRvQm90dG9tID0gKCkgPT4ge1xuICAgIG1lc3NhZ2VzRW5kUmVmLmN1cnJlbnQ/LnNjcm9sbEludG9WaWV3KHsgYmVoYXZpb3I6IFwic21vb3RoXCIgfSk7XG4gIH07XG5cbiAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICBzY3JvbGxUb0JvdHRvbSgpO1xuICB9LCBbbWVzc2FnZXMsIGlzTG9hZGluZ10pO1xuXG4gIGNvbnN0IGhhbmRsZVNlbmRNZXNzYWdlID0gYXN5bmMgKCkgPT4ge1xuICAgIGlmICghaW5wdXRNZXNzYWdlLnRyaW0oKSB8fCBpc0xvYWRpbmcpIHJldHVybjtcbiAgICBjb25zdCB1c2VyVGV4dCA9IGlucHV0TWVzc2FnZS50cmltKCk7XG4gICAgc2V0SW5wdXRNZXNzYWdlKFwiXCIpO1xuICAgIHNldE1lc3NhZ2VzKHByZXYgPT4gWy4uLnByZXYsIHsgcm9sZTogXCJ1c2VyXCIsIGNvbnRlbnQ6IHVzZXJUZXh0IH1dKTtcbiAgICBzZXRJc0xvYWRpbmcodHJ1ZSk7XG5cbiAgICB0cnkge1xuICAgICAgY29uc3QgYXBpS2V5ID0gKGltcG9ydC5tZXRhIGFzIGFueSkuZW52Py5WSVRFX0dFTUlOSV9BUElfS0VZIHx8IChwcm9jZXNzLmVudiBhcyBhbnkpPy5SRUFDVF9BUFBfR0VNSU5JX0FQSV9LRVkgfHwgXCJcIjtcbiAgICAgIGNvbnN0IGFpID0gbmV3IEdvb2dsZUdlbkFJKHsgYXBpS2V5OiBhcGlLZXkgfHwgdW5kZWZpbmVkIH0pO1xuICAgICAgXG4gICAgICBjb25zdCBjaGF0ID0gYWkuY2hhdHMuY3JlYXRlKHtcbiAgICAgICAgbW9kZWw6IFwiZ2VtaW5pLTMuOC1mbGFzaFwiLFxuICAgICAgICBjb25maWc6IHtcbiAgICAgICAgICBzeXN0ZW1JbnN0cnVjdGlvbjogXCJZb3UgYXJlIGFuIGV4cGVydCBBSSBNdXNpYyBQcm9kdWNlciBhbmQgbWl4aW5nIGVuZ2luZWVyIGluIFJlbWl4IE9TLiBHaXZlIHByb2Zlc3Npb25hbCwgZW5jb3VyYWdpbmcsIGFuZCBkZXRhaWxlZCBtdXNpYyBwcm9kdWN0aW9uLCBtaXhpbmcsIG1hc3RlcmluZywgYW5kIHN5bnRoIGRlc2lnbiBhZHZpY2UuIFVzZSBHb29nbGUgU2VhcmNoIGdyb3VuZGluZyB0byBsb29rIHVwIHVwLXRvLWRhdGUgYXVkaW8gdGVjaG5pcXVlcywgZ2VhciByZWxlYXNlcywgb3IgbXVzaWMgdGhlb3J5IGZhY3RzIHdoZW4gcmVsZXZhbnQuXCIsXG4gICAgICAgICAgdG9vbHM6IFt7IGdvb2dsZVNlYXJjaDoge30gfV1cbiAgICAgICAgfSxcbiAgICAgICAgaGlzdG9yeTogbWVzc2FnZXMubWFwKG0gPT4gKHtcbiAgICAgICAgICByb2xlOiBtLnJvbGUgPT09ICdhc3Npc3RhbnQnID8gJ21vZGVsJyA6ICd1c2VyJyxcbiAgICAgICAgICBwYXJ0czogW3sgdGV4dDogbS5jb250ZW50IH1dXG4gICAgICAgIH0pKVxuICAgICAgfSk7XG5cbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGNoYXQuc2VuZE1lc3NhZ2UoeyBtZXNzYWdlOiB1c2VyVGV4dCB9KTtcbiAgICAgIGNvbnN0IHJlc3BvbnNlVGV4dCA9IHJlc3VsdC50ZXh0IHx8IFwiTm8gcmVzcG9uc2UgcmVjZWl2ZWQuXCI7XG4gICAgICBjb25zdCBncm91bmRpbmdDaHVua3MgPSByZXN1bHQuY2FuZGlkYXRlcz8uWzBdPy5ncm91bmRpbmdNZXRhZGF0YT8uZ3JvdW5kaW5nQ2h1bmtzIHx8IFtdO1xuXG4gICAgICBzZXRNZXNzYWdlcyhwcmV2ID0+IFsuLi5wcmV2LCB7IHJvbGU6IFwiYXNzaXN0YW50XCIsIGNvbnRlbnQ6IHJlc3BvbnNlVGV4dCwgc291cmNlczogZ3JvdW5kaW5nQ2h1bmtzIH1dKTtcbiAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICBjb25zb2xlLmVycm9yKGVycm9yKTtcbiAgICAgIHNldE1lc3NhZ2VzKHByZXYgPT4gWy4uLnByZXYsIHsgcm9sZTogXCJhc3Npc3RhbnRcIiwgY29udGVudDogYEVycm9yIGNvbm5lY3RpbmcgdG8gR2VtaW5pOiAke2Vycm9yLm1lc3NhZ2UgfHwgZXJyb3J9YCB9XSk7XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIHNldElzTG9hZGluZyhmYWxzZSk7XG4gICAgfVxuICB9O1xuXG4gIHJldHVybiAoXG4gICAgPGRpdiBjbGFzc05hbWU9XCJoLWZ1bGwgYmctc2xhdGUtOTAwIHAtNCBmbGV4IGZsZXgtY29sIGdhcC0zIGZvbnQtbW9ubyB0ZXh0LXhzIHRleHQtc2xhdGUtMzAwIG92ZXJmbG93LWhpZGRlblwiPlxuICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBqdXN0aWZ5LWJldHdlZW4gaXRlbXMtY2VudGVyIGJnLXNsYXRlLTk1MCBwLTMgcm91bmRlZC1sZyBib3JkZXIgYm9yZGVyLXNsYXRlLTgwMCBzaGFkb3ctbWRcIj5cbiAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cImZvbnQtYmxhY2sgdHJhY2tpbmctd2lkZXN0IHRleHQtY3lhbi0zMDAgZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTJcIj5cbiAgICAgICAgICAgPEJvdCBzaXplPXsxNn0gLz4gR0VNSU5JIFBST0RVQ0VSIENIQVQgKFdJVEggU0VBUkNIIEdST1VORElORylcbiAgICAgICAgIDwvc3Bhbj5cbiAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInB4LTIgcHktMC41IGJnLWN5YW4tOTUwIHRleHQtY3lhbi00MDAgdGV4dC1bMTBweF0gcm91bmRlZCBib3JkZXIgYm9yZGVyLWN5YW4tOTAwXCI+Z2VtaW5pLTMuOC1mbGFzaDwvc3Bhbj5cbiAgICAgICA8L2Rpdj5cblxuICAgICAgIHsvKiBDaGF0IE1lc3NhZ2VzICovfVxuICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleC0xIGJnLXNsYXRlLTk1MCBwLTQgcm91bmRlZC14bCBib3JkZXIgYm9yZGVyLXNsYXRlLTgwMCBmbGV4IGZsZXgtY29sIGdhcC0zIG92ZXJmbG93LXktYXV0b1wiPlxuICAgICAgICAge21lc3NhZ2VzLm1hcCgobSwgaWR4KSA9PiAoXG4gICAgICAgICAgIDxkaXYga2V5PXtpZHh9IGNsYXNzTmFtZT17YGZsZXggZmxleC1jb2wgZ2FwLTEgbWF4LXctWzg1JV0gJHttLnJvbGUgPT09ICd1c2VyJyA/ICdzZWxmLWVuZCBpdGVtcy1lbmQnIDogJ3NlbGYtc3RhcnQgaXRlbXMtc3RhcnQnfWB9PlxuICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPXtgcC0zIHJvdW5kZWQteGwgbGVhZGluZy1yZWxheGVkICR7bS5yb2xlID09PSAndXNlcicgPyAnYmctY3lhbi02MDAgdGV4dC13aGl0ZSByb3VuZGVkLWJyLXNtJyA6ICdiZy1zbGF0ZS05MDAgdGV4dC1zbGF0ZS0yMDAgYm9yZGVyIGJvcmRlci1zbGF0ZS04MDAgcm91bmRlZC1ibC1zbSBzaGFkb3ctaW5uZXInfWB9PlxuICAgICAgICAgICAgICAge20uY29udGVudH1cbiAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICB7bS5zb3VyY2VzICYmIG0uc291cmNlcy5sZW5ndGggPiAwICYmIChcbiAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwidGV4dC1bOXB4XSB0ZXh0LWN5YW4tNDAwIGZsZXggZmxleC13cmFwIGdhcC0xIHB4LTFcIj5cbiAgICAgICAgICAgICAgICAgPHNwYW4+U291cmNlczo8L3NwYW4+XG4gICAgICAgICAgICAgICAgIHttLnNvdXJjZXMubWFwKChzcmM6IGFueSwgc2k6IG51bWJlcikgPT4gc3JjLndlYj8udXJpID8gKFxuICAgICAgICAgICAgICAgICAgIDxhIGtleT17c2l9IGhyZWY9e3NyYy53ZWIudXJpfSB0YXJnZXQ9XCJfYmxhbmtcIiByZWw9XCJub3JlZmVycmVyXCIgY2xhc3NOYW1lPVwidW5kZXJsaW5lIHRydW5jYXRlIG1heC13LVsxNTBweF1cIj57c3JjLndlYi50aXRsZSB8fCBzcmMud2ViLnVyaX08L2E+XG4gICAgICAgICAgICAgICAgICkgOiBudWxsKX1cbiAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICl9XG4gICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgKSl9XG4gICAgICAgICB7aXNMb2FkaW5nICYmIChcbiAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJzZWxmLXN0YXJ0IHAtMyBiZy1zbGF0ZS05MDAgdGV4dC1jeWFuLTQwMCByb3VuZGVkLXhsIGJvcmRlciBib3JkZXItc2xhdGUtODAwIGZsZXggaXRlbXMtY2VudGVyIGdhcC0yIGFuaW1hdGUtcHVsc2VcIj5cbiAgICAgICAgICAgICA8UmVmcmVzaEN3IHNpemU9ezE0fSBjbGFzc05hbWU9XCJhbmltYXRlLXNwaW5cIiAvPiBUaGlua2luZyAmIHNlYXJjaGluZyB0aGUgd2ViLi4uXG4gICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgKX1cbiAgICAgICAgIDxkaXYgcmVmPXttZXNzYWdlc0VuZFJlZn0gLz5cbiAgICAgICA8L2Rpdj5cblxuICAgICAgIHsvKiBJbnB1dCBCYXIgKi99XG4gICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGdhcC0yXCI+XG4gICAgICAgICA8aW5wdXQgXG4gICAgICAgICAgIHR5cGU9XCJ0ZXh0XCIgXG4gICAgICAgICAgIHZhbHVlPXtpbnB1dE1lc3NhZ2V9IFxuICAgICAgICAgICBvbkNoYW5nZT17ZSA9PiBzZXRJbnB1dE1lc3NhZ2UoZS50YXJnZXQudmFsdWUpfVxuICAgICAgICAgICBvbktleURvd249e2UgPT4gZS5rZXkgPT09ICdFbnRlcicgJiYgaGFuZGxlU2VuZE1lc3NhZ2UoKX1cbiAgICAgICAgICAgcGxhY2Vob2xkZXI9XCJBc2sgYWJvdXQgbWl4aW5nLCBFUSwgY29tcHJlc3Npb24sIHN5bnRoIHBhdGNoZXMuLi5cIlxuICAgICAgICAgICBjbGFzc05hbWU9XCJmbGV4LTEgYmctc2xhdGUtOTUwIGJvcmRlciBib3JkZXItc2xhdGUtODAwIHJvdW5kZWQteGwgcHgtNCBweS0zIHRleHQtc2xhdGUtMTAwIG91dGxpbmUtbm9uZSBmb2N1czpib3JkZXItY3lhbi01MDBcIlxuICAgICAgICAgLz5cbiAgICAgICAgIDxidXR0b24gXG4gICAgICAgICAgIG9uQ2xpY2s9e2hhbmRsZVNlbmRNZXNzYWdlfVxuICAgICAgICAgICBkaXNhYmxlZD17aXNMb2FkaW5nfVxuICAgICAgICAgICBjbGFzc05hbWU9XCJweC01IGJnLWN5YW4tNjAwIGhvdmVyOmJnLWN5YW4tNTAwIHRleHQtd2hpdGUgZm9udC1ib2xkIHJvdW5kZWQteGwgZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgZ2FwLTIgc2hhZG93LVswXzBfMTJweF9yZ2JhKDM0LDIxMSwyMzgsMC4zKV0gdHJhbnNpdGlvbi1hbGwgY3Vyc29yLXBvaW50ZXIgZGlzYWJsZWQ6b3BhY2l0eS01MFwiXG4gICAgICAgICA+XG4gICAgICAgICAgIDxTZW5kIHNpemU9ezE0fSAvPiBTRU5EXG4gICAgICAgICA8L2J1dHRvbj5cbiAgICAgICA8L2Rpdj5cbiAgICA8L2Rpdj5cbiAgKTtcbn07XG5cbmNvbnN0IFZvaWNlVHJhbnNjcmlwdGlvblN0dWRpbyA9ICgpID0+IHtcbiAgY29uc3QgW2lzUmVjb3JkaW5nLCBzZXRJc1JlY29yZGluZ10gPSB1c2VTdGF0ZShmYWxzZSk7XG4gIGNvbnN0IFt0cmFuc2NyaXB0aW9uLCBzZXRUcmFuc2NyaXB0aW9uXSA9IHVzZVN0YXRlPHN0cmluZz4oXCIvLyBSZWNvcmQgeW91ciB2b2ljZSB1c2luZyB5b3VyIG1pY3JvcGhvbmUgdG8gdHJhbnNjcmliZSBhdWRpbyB3aXRoIGdlbWluaS0zLjUtdHJhbnNjcmliZS5cIik7XG4gIGNvbnN0IFtpc1Byb2Nlc3NpbmcsIHNldElzUHJvY2Vzc2luZ10gPSB1c2VTdGF0ZShmYWxzZSk7XG5cbiAgY29uc3QgaGFuZGxlVG9nZ2xlUmVjb3JkID0gKCkgPT4ge1xuICAgIGlmICghaXNSZWNvcmRpbmcpIHtcbiAgICAgIHNldElzUmVjb3JkaW5nKHRydWUpO1xuICAgICAgc2V0VHJhbnNjcmlwdGlvbihcIkxpc3RlbmluZy4uLiBzcGVhayBpbnRvIHlvdXIgbWljcm9waG9uZS5cIik7XG4gICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgc2V0SXNSZWNvcmRpbmcoZmFsc2UpO1xuICAgICAgICBzZXRJc1Byb2Nlc3NpbmcodHJ1ZSk7XG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgIHNldElzUHJvY2Vzc2luZyhmYWxzZSk7XG4gICAgICAgICAgc2V0VHJhbnNjcmlwdGlvbihcIlRyYW5zY3JpYmVkIEF1ZGlvOiAnQWRkIGEgbHVzaCByZXZlcmIgdGFpbCB0byB0aGUgc3ludGggcGFkcyBhbmQgYm9vc3QgdGhlIGxvdy1taWQgZnJlcXVlbmNpZXMgYXJvdW5kIDMwMEh6IGZvciB3YXJtIGFuYWxvZyBjaGFyYWN0ZXIuJ1wiKTtcbiAgICAgICAgfSwgMTIwMCk7XG4gICAgICB9LCAzMDAwKTtcbiAgICB9IGVsc2Uge1xuICAgICAgc2V0SXNSZWNvcmRpbmcoZmFsc2UpO1xuICAgIH1cbiAgfTtcblxuICByZXR1cm4gKFxuICAgIDxkaXYgY2xhc3NOYW1lPVwiaC1mdWxsIGJnLXNsYXRlLTkwMCBwLTYgZmxleCBmbGV4LWNvbCBnYXAtNSBmb250LW1vbm8gdGV4dC14cyB0ZXh0LXNsYXRlLTMwMCBvdmVyZmxvdy15LWF1dG9cIj5cbiAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXgganVzdGlmeS1iZXR3ZWVuIGl0ZW1zLWNlbnRlciBiZy1zbGF0ZS05NTAgcC0zIHJvdW5kZWQtbGcgYm9yZGVyIGJvcmRlci1zbGF0ZS04MDAgc2hhZG93LW1kXCI+XG4gICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJmb250LWJsYWNrIHRyYWNraW5nLXdpZGVzdCB0ZXh0LXJvc2UtMzAwIGZsZXggaXRlbXMtY2VudGVyIGdhcC0yXCI+XG4gICAgICAgICAgIDxNaWMgc2l6ZT17MTZ9IC8+IFZPSUNFICYgQVVESU8gVFJBTlNDUklQVElPTiBTVFVESU9cbiAgICAgICAgIDwvc3Bhbj5cbiAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInB4LTIgcHktMC41IGJnLXJvc2UtOTUwIHRleHQtcm9zZS00MDAgdGV4dC1bMTBweF0gcm91bmRlZCBib3JkZXIgYm9yZGVyLXJvc2UtOTAwXCI+Z2VtaW5pLTMuNS10cmFuc2NyaWJlPC9zcGFuPlxuICAgICAgIDwvZGl2PlxuXG4gICAgICAgPGRpdiBjbGFzc05hbWU9XCJiZy1zbGF0ZS05NTAgcC02IHJvdW5kZWQteGwgYm9yZGVyIGJvcmRlci1zbGF0ZS04MDAgZmxleCBmbGV4LWNvbCBpdGVtcy1jZW50ZXIgZ2FwLTQgc2hhZG93LWlubmVyXCI+XG4gICAgICAgICA8ZGl2IGNsYXNzTmFtZT17YHctMjAgaC0yMCByb3VuZGVkLWZ1bGwgZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgYm9yZGVyLTQgdHJhbnNpdGlvbi1hbGwgJHtpc1JlY29yZGluZyA/ICdiZy1yb3NlLTYwMC8yMCBib3JkZXItcm9zZS01MDAgdGV4dC1yb3NlLTQwMCBhbmltYXRlLXB1bHNlIHNoYWRvdy1bMF8wXzI1cHhfI2Y0M2Y1ZV0nIDogJ2JnLXNsYXRlLTkwMCBib3JkZXItc2xhdGUtODAwIHRleHQtc2xhdGUtNTAwJ31gfT5cbiAgICAgICAgICAgPE1pYyBzaXplPXszMn0gLz5cbiAgICAgICAgIDwvZGl2PlxuICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwiZm9udC1ib2xkIHRleHQtc2xhdGUtMjAwXCI+e2lzUmVjb3JkaW5nID8gXCJSRUNPUkRJTkcgQVVESU8uLi5cIiA6IFwiTUlDUk9QSE9ORSBSRUFEWVwifTwvc3Bhbj5cblxuICAgICAgICAgPGJ1dHRvbiBcbiAgICAgICAgICAgb25DbGljaz17aGFuZGxlVG9nZ2xlUmVjb3JkfVxuICAgICAgICAgICBkaXNhYmxlZD17aXNQcm9jZXNzaW5nfVxuICAgICAgICAgICBjbGFzc05hbWU9e2BweC04IHB5LTMgcm91bmRlZC14bCBmb250LWJsYWNrIHRyYW5zaXRpb24tYWxsIGN1cnNvci1wb2ludGVyICR7aXNSZWNvcmRpbmcgPyAnYmctcmVkLTYwMCB0ZXh0LXdoaXRlIHNoYWRvdy1bMF8wXzE1cHhfI2RjMjYyNl0nIDogJ2JnLXJvc2UtNjAwIGhvdmVyOmJnLXJvc2UtNTAwIHRleHQtd2hpdGUgc2hhZG93LVswXzBfMTVweF9yZ2JhKDI0NCw2Myw5NCwwLjMpXSd9YH1cbiAgICAgICAgID5cbiAgICAgICAgICAge2lzUmVjb3JkaW5nID8gXCJTVE9QICYgVFJBTlNDUklCRVwiIDogXCJSRUNPUkQgJiBUUkFOU0NSSUJFXCJ9XG4gICAgICAgICA8L2J1dHRvbj5cbiAgICAgICA8L2Rpdj5cblxuICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleC0xIGZsZXggZmxleC1jb2wgZ2FwLTEuNSBtaW4taC1bMTQwcHhdXCI+XG4gICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LVsxMHB4XSB0ZXh0LXNsYXRlLTUwMCBmb250LWJvbGQgZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTFcIj5cbiAgICAgICAgICAgPFRlcm1pbmFsIHNpemU9ezEyfSAvPiBUUkFOU0NSSVBUSU9OIFJFU1VMVFxuICAgICAgICAgPC9zcGFuPlxuICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4LTEgYmctc2xhdGUtOTUwIGJvcmRlciBib3JkZXItc2xhdGUtODAwIHJvdW5kZWQteGwgcC00IHRleHQtcm9zZS0zMDAgZm9udC1tb25vIHRleHQteHMgb3ZlcmZsb3cteS1hdXRvIGxlYWRpbmctcmVsYXhlZCBzaGFkb3ctaW5uZXJcIj5cbiAgICAgICAgICAge2lzUHJvY2Vzc2luZyA/IFwiVHJhbnNjcmliaW5nIGF1ZGlvIHN0cmVhbSB3aXRoIGdlbWluaS0zLjUtdHJhbnNjcmliZS4uLlwiIDogdHJhbnNjcmlwdGlvbn1cbiAgICAgICAgIDwvZGl2PlxuICAgICAgIDwvZGl2PlxuICAgIDwvZGl2PlxuICApO1xufTtcblxuY29uc3QgV2luZG93RnJhbWUgPSAoeyBhcHBXaW5kb3csIGljb24sIG9uQ2xvc2UsIG9uTWluaW1pemUsIG9uTWF4aW1pemUsIG9uRm9jdXMsIG9uTW92ZSwgY2hpbGRyZW4gfTogYW55KSA9PiB7XG4gIGNvbnN0IFtpc0RyYWdnaW5nLCBzZXRJc0RyYWdnaW5nXSA9IHVzZVN0YXRlKGZhbHNlKTtcbiAgY29uc3QgW2RyYWdPZmZzZXQsIHNldERyYWdPZmZzZXRdID0gdXNlU3RhdGUoeyB4OiAwLCB5OiAwIH0pO1xuXG4gIGNvbnN0IGhhbmRsZVBvaW50ZXJEb3duID0gKGU6IFJlYWN0LlBvaW50ZXJFdmVudCkgPT4ge1xuICAgIG9uRm9jdXMoKTtcbiAgICBpZiAoKGUudGFyZ2V0IGFzIEhUTUxFbGVtZW50KS5jbG9zZXN0KCcud2luZG93LWNvbnRyb2xzJykpIHJldHVybjtcbiAgICBzZXRJc0RyYWdnaW5nKHRydWUpO1xuICAgIHNldERyYWdPZmZzZXQoeyB4OiBlLmNsaWVudFggLSBhcHBXaW5kb3cueCwgeTogZS5jbGllbnRZIC0gYXBwV2luZG93LnkgfSk7XG4gICAgKGUudGFyZ2V0IGFzIEhUTUxFbGVtZW50KS5zZXRQb2ludGVyQ2FwdHVyZShlLnBvaW50ZXJJZCk7XG4gIH07XG5cbiAgY29uc3QgaGFuZGxlUG9pbnRlck1vdmUgPSAoZTogUmVhY3QuUG9pbnRlckV2ZW50KSA9PiB7XG4gICAgaWYgKGlzRHJhZ2dpbmcpIG9uTW92ZShlLmNsaWVudFggLSBkcmFnT2Zmc2V0LngsIGUuY2xpZW50WSAtIGRyYWdPZmZzZXQueSk7XG4gIH07XG5cbiAgY29uc3QgaGFuZGxlUG9pbnRlclVwID0gKGU6IFJlYWN0LlBvaW50ZXJFdmVudCkgPT4ge1xuICAgIHNldElzRHJhZ2dpbmcoZmFsc2UpO1xuICAgIChlLnRhcmdldCBhcyBIVE1MRWxlbWVudCkucmVsZWFzZVBvaW50ZXJDYXB0dXJlKGUucG9pbnRlcklkKTtcbiAgfTtcblxuICBpZiAoYXBwV2luZG93LmlzTWluaW1pemVkKSByZXR1cm4gbnVsbDtcblxuICBjb25zdCBzdHlsZSA9IGFwcFdpbmRvdy5pc01heGltaXplZCBcbiAgICA/IHsgdG9wOiAwLCBsZWZ0OiAwLCByaWdodDogMCwgYm90dG9tOiA1NiwgekluZGV4OiBhcHBXaW5kb3cuekluZGV4LCBib3JkZXJSYWRpdXM6IDAgfVxuICAgIDogeyB0b3A6IGFwcFdpbmRvdy55LCBsZWZ0OiBhcHBXaW5kb3cueCwgd2lkdGg6IGFwcFdpbmRvdy53aWR0aCwgaGVpZ2h0OiBhcHBXaW5kb3cuaGVpZ2h0LCB6SW5kZXg6IGFwcFdpbmRvdy56SW5kZXggfTtcblxuICByZXR1cm4gKFxuICAgIDxkaXYgXG4gICAgICBjbGFzc05hbWU9e2BhYnNvbHV0ZSBmbGV4IGZsZXgtY29sIGJnLXNsYXRlLTkwMCBib3JkZXIgYm9yZGVyLXNsYXRlLTcwMC81MCBzaGFkb3ctMnhsIHJvdW5kZWQteGwgb3ZlcmZsb3ctaGlkZGVuIHRyYW5zaXRpb24tW29wYWNpdHksYm94LXNoYWRvdyxib3JkZXItcmFkaXVzXSBkdXJhdGlvbi0yMDAgJHtpc0RyYWdnaW5nID8gJ29wYWNpdHktOTAgc2hhZG93LWN5YW4tNTAwLzIwIHJpbmctMSByaW5nLWN5YW4tNTAwLzUwJyA6ICdyaW5nLTEgcmluZy1ibGFjay81MCd9YH1cbiAgICAgIHN0eWxlPXtzdHlsZX1cbiAgICAgIG9uUG9pbnRlckRvd249e29uRm9jdXN9XG4gICAgPlxuICAgICAgPGRpdiBcbiAgICAgICAgY2xhc3NOYW1lPXtgaC05IGJnLXNsYXRlLTk1MCBib3JkZXItYiBib3JkZXItc2xhdGUtODAwIGZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktYmV0d2VlbiBweC0zIHNlbGVjdC1ub25lIHRvdWNoLW5vbmUgJHtpc0RyYWdnaW5nID8gJ2N1cnNvci1ncmFiYmluZycgOiAnY3Vyc29yLWdyYWInfWB9XG4gICAgICAgIG9uUG9pbnRlckRvd249e2hhbmRsZVBvaW50ZXJEb3dufSBvblBvaW50ZXJNb3ZlPXtoYW5kbGVQb2ludGVyTW92ZX0gb25Qb2ludGVyVXA9e2hhbmRsZVBvaW50ZXJVcH1cbiAgICAgID5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMiB0ZXh0LXNsYXRlLTQwMFwiPlxuICAgICAgICAgICB7aWNvbn1cbiAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwiZm9udC1ib2xkIHRleHQtWzExcHhdIHRyYWNraW5nLXdpZGUgdXBwZXJjYXNlIHRleHQtc2xhdGUtMzAwIGRyb3Atc2hhZG93LXNtXCI+e2FwcFdpbmRvdy50aXRsZX08L3NwYW4+XG4gICAgICAgIDwvZGl2PlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0zIHdpbmRvdy1jb250cm9sc1wiPlxuICAgICAgICAgICA8YnV0dG9uIG9uQ2xpY2s9e29uTWluaW1pemV9IGNsYXNzTmFtZT1cInRleHQtc2xhdGUtNTAwIGhvdmVyOnRleHQtd2hpdGUgdHJhbnNpdGlvbi1jb2xvcnNcIj48TWludXMgc2l6ZT17MTR9Lz48L2J1dHRvbj5cbiAgICAgICAgICAgPGJ1dHRvbiBvbkNsaWNrPXtvbk1heGltaXplfSBjbGFzc05hbWU9XCJ0ZXh0LXNsYXRlLTUwMCBob3Zlcjp0ZXh0LXdoaXRlIHRyYW5zaXRpb24tY29sb3JzXCI+PE1heGltaXplMiBzaXplPXsxMn0vPjwvYnV0dG9uPlxuICAgICAgICAgICA8YnV0dG9uIG9uQ2xpY2s9e29uQ2xvc2V9IGNsYXNzTmFtZT1cInRleHQtc2xhdGUtNTAwIGhvdmVyOnRleHQtcmVkLTQwMCB0cmFuc2l0aW9uLWNvbG9yc1wiPjxYIHNpemU9ezE2fS8+PC9idXR0b24+XG4gICAgICAgIDwvZGl2PlxuICAgICAgPC9kaXY+XG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXgtMSBvdmVyZmxvdy1oaWRkZW4gcmVsYXRpdmUgYmctc2xhdGUtOTAwLzkwIGJhY2tkcm9wLWJsdXItbWRcIj5cbiAgICAgICAge2NoaWxkcmVufVxuICAgICAgPC9kaXY+XG4gICAgPC9kaXY+XG4gIClcbn1cblxuY29uc3QgRGVza3RvcEljb25zID0gKHsgb25PcGVuV2luZG93IH06IHsgb25PcGVuV2luZG93OiAoaWQ6IHN0cmluZykgPT4gdm9pZCB9KSA9PiAoXG4gIDxkaXYgY2xhc3NOYW1lPVwiYWJzb2x1dGUgaW5zZXQtMCBwLTYgZmxleCBmbGV4LWNvbCBmbGV4LXdyYXAgZ2FwLTIgaXRlbXMtc3RhcnQgY29udGVudC1zdGFydCBvdmVyZmxvdy1oaWRkZW4gcG9pbnRlci1ldmVudHMtbm9uZSBoLWZ1bGxcIj5cbiAgICAge0FQUF9SRUdJU1RSWS5tYXAoYXBwID0+IChcbiAgICAgICA8ZGl2IFxuICAgICAgICAga2V5PXthcHAuaWR9IFxuICAgICAgICAgY2xhc3NOYW1lPVwicG9pbnRlci1ldmVudHMtYXV0byB3LTI0IGZsZXggZmxleC1jb2wgaXRlbXMtY2VudGVyIGdhcC0xLjUgZ3JvdXAgY3Vyc29yLXBvaW50ZXIgaG92ZXI6Ymctd2hpdGUvNSBwLTIgcm91bmRlZC14bCB0cmFuc2l0aW9uLWNvbG9yc1wiXG4gICAgICAgICBvbkRvdWJsZUNsaWNrPXsoKSA9PiBvbk9wZW5XaW5kb3coYXBwLmlkKX1cbiAgICAgICA+XG4gICAgICAgICA8ZGl2IGNsYXNzTmFtZT17YHctMTIgaC0xMiByb3VuZGVkLVsxcmVtXSBiZy1zbGF0ZS05MDAvODAgYmFja2Ryb3AtYmx1ci1zbSBib3JkZXIgYm9yZGVyLXNsYXRlLTcwMC84MCBzaGFkb3ctbGcgZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgZ3JvdXAtaG92ZXI6c2NhbGUtMTA1IHRyYW5zaXRpb24tYWxsIGR1cmF0aW9uLTIwMCBncm91cC1ob3Zlcjpib3JkZXItc2xhdGUtNTAwIGdyb3VwLWhvdmVyOnNoYWRvdy14bCAke2FwcC5jb2xvcn1gfT5cbiAgICAgICAgICAgPGFwcC5pY29uIHNpemU9ezI0fSBzdHJva2VXaWR0aD17MS41fSAvPlxuICAgICAgICAgPC9kaXY+XG4gICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LVsxMHB4XSB0ZXh0LWNlbnRlciB0ZXh0LXNsYXRlLTMwMCBmb250LW1lZGl1bSBkcm9wLXNoYWRvdy1tZCBsZWFkaW5nLXRpZ2h0IGdyb3VwLWhvdmVyOnRleHQtd2hpdGUgcHgtMVwiPlxuICAgICAgICAgICB7YXBwLnRpdGxlfVxuICAgICAgICAgPC9zcGFuPlxuICAgICAgIDwvZGl2PlxuICAgICApKX1cbiAgPC9kaXY+XG4pO1xuXG5jb25zdCBUYXNrYmFyID0gKHsgd2luZG93cywgaXNQbGF5aW5nLCBicG0sIGN1cnJlbnRTdGVwLCBtYXN0ZXJWb2x1bWUsIG9uVG9nZ2xlUGxheSwgb25VcGRhdGVCUE0sIG9uVXBkYXRlTWFzdGVyVm9sdW1lLCBvblRvZ2dsZVdpbmRvdywgb25SZXNldFByb2plY3QsIG9uVW5kbywgb25SZWRvLCBjYW5VbmRvLCBjYW5SZWRvIH06IGFueSkgPT4gKFxuICA8ZGl2IGNsYXNzTmFtZT1cImgtMTQgYmctc2xhdGUtOTUwLzk1IGJhY2tkcm9wLWJsdXIgYm9yZGVyLXQgYm9yZGVyLXNsYXRlLTgwMC84MCBmbGV4IGl0ZW1zLWNlbnRlciBweC00IGp1c3RpZnktYmV0d2VlbiB6LTUwIHJlbGF0aXZlIHNoYWRvdy1bMF8tNXB4XzIwcHhfcmdiYSgwLDAsMCwwLjUpXVwiPlxuICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTRcIj5cbiAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0yIHRleHQtY3lhbi00MDAgZm9udC1ibGFjayB0ZXh0LXhsIGl0YWxpYyB0cmFja2luZy10aWdodGVyIHByLTMgYm9yZGVyLXIgYm9yZGVyLXNsYXRlLTgwMCBjdXJzb3ItcG9pbnRlciBob3Zlcjp0ZXh0LWN5YW4tMzAwIHRyYW5zaXRpb24tY29sb3JzXCIgb25DbGljaz17b25SZXNldFByb2plY3R9IHRpdGxlPVwiUmVzZXQgUHJvamVjdFwiPlxuICAgICAgICAgIDxSYWRpbyBzaXplPXsyNH0gLz4gUlhcbiAgICAgICA8L2Rpdj5cbiAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0xIGJnLXNsYXRlLTkwMCBwLTEgcm91bmRlZC1sZyBib3JkZXIgYm9yZGVyLXNsYXRlLTgwMFwiPlxuICAgICAgICAgIDxidXR0b24gXG4gICAgICAgICAgICBvbkNsaWNrPXtvblVuZG99IFxuICAgICAgICAgICAgZGlzYWJsZWQ9eyFjYW5VbmRvfSBcbiAgICAgICAgICAgIGNsYXNzTmFtZT17YHAtMS41IHJvdW5kZWQgdHJhbnNpdGlvbi1jb2xvcnMgJHtjYW5VbmRvID8gJ3RleHQtc2xhdGUtMzAwIGhvdmVyOmJnLXNsYXRlLTgwMCBob3Zlcjp0ZXh0LXdoaXRlJyA6ICd0ZXh0LXNsYXRlLTcwMCBjdXJzb3Itbm90LWFsbG93ZWQnfWB9XG4gICAgICAgICAgICB0aXRsZT1cIlVuZG8gKEN0cmwrWilcIlxuICAgICAgICAgID5cbiAgICAgICAgICAgIDxSb3RhdGVDY3cgc2l6ZT17MTR9IC8+XG4gICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgPGJ1dHRvbiBcbiAgICAgICAgICAgIG9uQ2xpY2s9e29uUmVkb30gXG4gICAgICAgICAgICBkaXNhYmxlZD17IWNhblJlZG99IFxuICAgICAgICAgICAgY2xhc3NOYW1lPXtgcC0xLjUgcm91bmRlZCB0cmFuc2l0aW9uLWNvbG9ycyAke2NhblJlZG8gPyAndGV4dC1zbGF0ZS0zMDAgaG92ZXI6Ymctc2xhdGUtODAwIGhvdmVyOnRleHQtd2hpdGUnIDogJ3RleHQtc2xhdGUtNzAwIGN1cnNvci1ub3QtYWxsb3dlZCd9YH1cbiAgICAgICAgICAgIHRpdGxlPVwiUmVkbyAoQ3RybCtZKVwiXG4gICAgICAgICAgPlxuICAgICAgICAgICAgPFJvdGF0ZUN3IHNpemU9ezE0fSAvPlxuICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgIDwvZGl2PlxuICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTQgYmctc2xhdGUtOTAwIHB4LTQgcHktMS41IHJvdW5kZWQtZnVsbCBib3JkZXIgYm9yZGVyLXNsYXRlLTcwMC81MCBzaGFkb3ctaW5uZXJcIj5cbiAgICAgICAgICA8YnV0dG9uIG9uQ2xpY2s9e29uVG9nZ2xlUGxheX0gY2xhc3NOYW1lPXtgdy04IGgtOCBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciByb3VuZGVkLWZ1bGwgdHJhbnNpdGlvbi1jb2xvcnMgJHtpc1BsYXlpbmcgPyAnYmctY3lhbi01MDAgdGV4dC1zbGF0ZS05NTAgc2hhZG93LVswXzBfMTVweF8jMjJkM2VlXScgOiAnYmctc2xhdGUtODAwIHRleHQtY3lhbi00MDAgaG92ZXI6Ymctc2xhdGUtNzAwIGhvdmVyOnRleHQtY3lhbi0zMDAnfWB9PlxuICAgICAgICAgICAgIHtpc1BsYXlpbmcgPyA8U3F1YXJlIHNpemU9ezE0fSBmaWxsPVwiY3VycmVudENvbG9yXCIgLz4gOiA8UGxheSBzaXplPXsxNH0gZmlsbD1cImN1cnJlbnRDb2xvclwiIGNsYXNzTmFtZT1cIm1sLTAuNVwiIC8+fVxuICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBmbGV4LWNvbFwiPlxuICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1bOXB4XSB0ZXh0LXNsYXRlLTUwMCBmb250LWJvbGQgdHJhY2tpbmctd2lkZXN0XCI+QlBNPC9zcGFuPlxuICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJudW1iZXJcIiB2YWx1ZT17YnBtfSBvbkNoYW5nZT17ZSA9PiBvblVwZGF0ZUJQTShOdW1iZXIoZS50YXJnZXQudmFsdWUpKX0gY2xhc3NOYW1lPVwiYmctdHJhbnNwYXJlbnQgdGV4dC1zbGF0ZS0yMDAgdGV4dC14cyBmb250LW1vbm8gZm9udC1ib2xkIHctMTAgb3V0bGluZS1ub25lXCIgLz5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImgtNiB3LXB4IGJnLXNsYXRlLTcwMCBteC0xXCI+PC9kaXY+XG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGZsZXgtY29sIGdhcC0xXCI+XG4gICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LVs5cHhdIHRleHQtc2xhdGUtNTAwIGZvbnQtYm9sZCB0cmFja2luZy13aWRlc3RcIj5TVEVQPC9zcGFuPlxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGdhcC0xXCI+XG4gICAgICAgICAgICAgIHtbMCwxLDIsM10ubWFwKGkgPT4gKFxuICAgICAgICAgICAgICAgICA8ZGl2IGtleT17aX0gY2xhc3NOYW1lPXtgdy0yIGgtMiByb3VuZGVkLWZ1bGwgdHJhbnNpdGlvbi1jb2xvcnMgJHtpc1BsYXlpbmcgJiYgTWF0aC5mbG9vcihjdXJyZW50U3RlcC80KSA9PT0gaSA/ICdiZy1jeWFuLTQwMCBzaGFkb3ctWzBfMF84cHhfIzIyZDNlZV0nIDogJ2JnLXNsYXRlLTcwMCd9YH0gLz5cbiAgICAgICAgICAgICAgKSl9XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICA8L2Rpdj5cbiAgICA8L2Rpdj5cbiAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXgtMSBmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMiBweC02IG92ZXJmbG93LXgtYXV0byBuby1zY3JvbGxiYXJcIj5cbiAgICAgIHt3aW5kb3dzLm1hcCgodzogQXBwV2luZG93KSA9PiAoXG4gICAgICAgIDxidXR0b24gXG4gICAgICAgICAga2V5PXt3LmlkfSBvbkNsaWNrPXsoKSA9PiBvblRvZ2dsZVdpbmRvdyh3LmlkKX1cbiAgICAgICAgICBjbGFzc05hbWU9e2BmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMiBweC0zIHB5LTEuNSByb3VuZGVkLWxnIHRleHQteHMgZm9udC1ib2xkIHRyYW5zaXRpb24tYWxsIG1heC13LVsxNjBweF0gdHJ1bmNhdGUgYm9yZGVyICR7dy5pc01pbmltaXplZCA/ICdiZy1zbGF0ZS05MDAgdGV4dC1zbGF0ZS01MDAgYm9yZGVyLXNsYXRlLTgwMCBob3ZlcjpiZy1zbGF0ZS04MDAnIDogJ2JnLXNsYXRlLTgwMCB0ZXh0LXNsYXRlLTIwMCBib3JkZXItc2xhdGUtNjAwIHNoYWRvdy1baW5zZXRfMF8xcHhfcmdiYSgyNTUsMjU1LDI1NSwwLjEpXSd9YH1cbiAgICAgICAgPlxuICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9e2B3LTIgaC0yIHJvdW5kZWQtZnVsbCAke3cuaXNNaW5pbWl6ZWQgPyAnYmctc2xhdGUtNjAwJyA6ICdiZy1jeWFuLTUwMCBzaGFkb3ctWzBfMF81cHhfIzIyZDNlZV0nfWB9IC8+XG4gICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRydW5jYXRlXCI+e3cudGl0bGV9PC9zcGFuPlxuICAgICAgICA8L2J1dHRvbj5cbiAgICAgICkpfVxuICAgIDwvZGl2PlxuICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTQgdGV4dC1zbGF0ZS00MDBcIj5cbiAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0yIGJnLXNsYXRlLTkwMCBweC0zIHB5LTEuNSByb3VuZGVkLWZ1bGwgYm9yZGVyIGJvcmRlci1zbGF0ZS04MDBcIj5cbiAgICAgICAgICA8Vm9sdW1lMiBzaXplPXsxNH0gY2xhc3NOYW1lPXttYXN0ZXJWb2x1bWUgPiAwLjggPyAndGV4dC1yZWQtNDAwJyA6ICd0ZXh0LXNsYXRlLTQwMCd9IC8+XG4gICAgICAgICAgPGlucHV0IHR5cGU9XCJyYW5nZVwiIG1pbj17MH0gbWF4PXsxfSBzdGVwPXswLjAxfSB2YWx1ZT17bWFzdGVyVm9sdW1lfSBvbkNoYW5nZT17ZSA9PiBvblVwZGF0ZU1hc3RlclZvbHVtZShOdW1iZXIoZS50YXJnZXQudmFsdWUpKX0gY2xhc3NOYW1lPVwidy0yMCBoLTEgYmctc2xhdGUtNzAwIHJvdW5kZWQtbGcgYXBwZWFyYW5jZS1ub25lIGN1cnNvci1wb2ludGVyIGFjY2VudC1jeWFuLTQwMFwiIC8+XG4gICAgICAgPC9kaXY+XG4gICAgICAgPGRpdiBjbGFzc05hbWU9XCJ0ZXh0LVsxMHB4XSBmb250LW1vbm8gZm9udC1ib2xkIHRyYWNraW5nLXdpZGVzdCBweC0yIHRleHQtc2xhdGUtNTAwXCI+XG4gICAgICAgICB7bmV3IERhdGUoKS50b0xvY2FsZVRpbWVTdHJpbmcoW10sIHsgaG91cjogJzItZGlnaXQnLCBtaW51dGU6ICcyLWRpZ2l0JyB9KX1cbiAgICAgICA8L2Rpdj5cbiAgICA8L2Rpdj5cbiAgPC9kaXY+XG4pO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBSZW1peE9TKCkge1xuICBjb25zdCBbd2luZG93cywgc2V0V2luZG93c10gPSB1c2VTdGF0ZTxBcHBXaW5kb3dbXT4oW10pO1xuICBjb25zdCBbcGFkcywgc2V0UGFkc10gPSB1c2VTdGF0ZTxQYWRbXT4oW1xuICAgIHsgaWQ6IFwicGFkXzFcIiwgbmFtZTogXCJIb3VzZSBCZWF0XCIsIGNhdGVnb3J5OiBcImRydW1zXCIsIGNvbG9yOiBcImVtZXJhbGRcIiwgbG9vcFR5cGU6IFwiZHJ1bXNfaG91c2VcIiwgaXNQbGF5aW5nOiB0cnVlLCB2b2x1bWU6IDAuODUsIHBhbjogMCwgbXV0ZWQ6IGZhbHNlLCBzb2xvZWQ6IGZhbHNlIH0sXG4gICAgeyBpZDogXCJwYWRfMlwiLCBuYW1lOiBcIlRyYXAgRHJ1bXNcIiwgY2F0ZWdvcnk6IFwiZHJ1bXNcIiwgY29sb3I6IFwiZW1lcmFsZFwiLCBsb29wVHlwZTogXCJkcnVtc190cmFwXCIsIGlzUGxheWluZzogZmFsc2UsIHZvbHVtZTogMC44LCBwYW46IDAsIG11dGVkOiBmYWxzZSwgc29sb2VkOiBmYWxzZSB9LFxuICAgIHsgaWQ6IFwicGFkXzNcIiwgbmFtZTogXCJDbHViIFBlcmNcIiwgY2F0ZWdvcnk6IFwiZHJ1bXNcIiwgY29sb3I6IFwiZW1lcmFsZFwiLCBsb29wVHlwZTogXCJkcnVtc19ob3VzZVwiLCBpc1BsYXlpbmc6IGZhbHNlLCB2b2x1bWU6IDAuNzUsIHBhbjogMC4yLCBtdXRlZDogZmFsc2UsIHNvbG9lZDogZmFsc2UgfSxcbiAgICB7IGlkOiBcInBhZF80XCIsIG5hbWU6IFwiSGlIYXQgUm9sbFwiLCBjYXRlZ29yeTogXCJkcnVtc1wiLCBjb2xvcjogXCJlbWVyYWxkXCIsIGxvb3BUeXBlOiBcImRydW1zX3RyYXBcIiwgaXNQbGF5aW5nOiBmYWxzZSwgdm9sdW1lOiAwLjcsIHBhbjogLTAuMiwgbXV0ZWQ6IGZhbHNlLCBzb2xvZWQ6IGZhbHNlIH0sXG4gICAgeyBpZDogXCJwYWRfNVwiLCBuYW1lOiBcIlN1YiBHcm9vdmVcIiwgY2F0ZWdvcnk6IFwiYmFzc1wiLCBjb2xvcjogXCJpbmRpZ29cIiwgbG9vcFR5cGU6IFwiYmFzc19zdWJcIiwgaXNQbGF5aW5nOiB0cnVlLCB2b2x1bWU6IDAuOCwgcGFuOiAwLCBtdXRlZDogZmFsc2UsIHNvbG9lZDogZmFsc2UgfSxcbiAgICB7IGlkOiBcInBhZF82XCIsIG5hbWU6IFwiQW5hbG9nIDMwM1wiLCBjYXRlZ29yeTogXCJiYXNzXCIsIGNvbG9yOiBcImluZGlnb1wiLCBsb29wVHlwZTogXCJiYXNzX2FjaWRcIiwgaXNQbGF5aW5nOiBmYWxzZSwgdm9sdW1lOiAwLjc1LCBwYW46IC0wLjEsIG11dGVkOiBmYWxzZSwgc29sb2VkOiBmYWxzZSB9LFxuICAgIHsgaWQ6IFwicGFkXzdcIiwgbmFtZTogXCJSZWVzZSBTdWJcIiwgY2F0ZWdvcnk6IFwiYmFzc1wiLCBjb2xvcjogXCJpbmRpZ29cIiwgbG9vcFR5cGU6IFwiYmFzc19zdWJcIiwgaXNQbGF5aW5nOiBmYWxzZSwgdm9sdW1lOiAwLjg1LCBwYW46IDAuMSwgbXV0ZWQ6IGZhbHNlLCBzb2xvZWQ6IGZhbHNlIH0sXG4gICAgeyBpZDogXCJwYWRfOFwiLCBuYW1lOiBcIkRyaXZlIEJhc3NcIiwgY2F0ZWdvcnk6IFwiYmFzc1wiLCBjb2xvcjogXCJpbmRpZ29cIiwgbG9vcFR5cGU6IFwiYmFzc19hY2lkXCIsIGlzUGxheWluZzogZmFsc2UsIHZvbHVtZTogMC43LCBwYW46IDAsIG11dGVkOiBmYWxzZSwgc29sb2VkOiBmYWxzZSB9LFxuICAgIHsgaWQ6IFwicGFkXzlcIiwgbmFtZTogXCJDaGlsbCBDaG9yZHNcIiwgY2F0ZWdvcnk6IFwic3ludGhcIiwgY29sb3I6IFwidmlvbGV0XCIsIGxvb3BUeXBlOiBcInN5bnRoX2NoaWxsXCIsIGlzUGxheWluZzogdHJ1ZSwgdm9sdW1lOiAwLjc1LCBwYW46IC0wLjIsIG11dGVkOiBmYWxzZSwgc29sb2VkOiBmYWxzZSB9LFxuICAgIHsgaWQ6IFwicGFkXzEwXCIsIG5hbWU6IFwiQ3liZXIgQXJwXCIsIGNhdGVnb3J5OiBcInN5bnRoXCIsIGNvbG9yOiBcInZpb2xldFwiLCBsb29wVHlwZTogXCJzeW50aF9hcnBcIiwgaXNQbGF5aW5nOiBmYWxzZSwgdm9sdW1lOiAwLjcsIHBhbjogMC4zLCBtdXRlZDogZmFsc2UsIHNvbG9lZDogZmFsc2UgfSxcbiAgICB7IGlkOiBcInBhZF8xMVwiLCBuYW1lOiBcIkxvZmkgS2V5c1wiLCBjYXRlZ29yeTogXCJzeW50aFwiLCBjb2xvcjogXCJ2aW9sZXRcIiwgbG9vcFR5cGU6IFwic3ludGhfY2hpbGxcIiwgaXNQbGF5aW5nOiBmYWxzZSwgdm9sdW1lOiAwLjgsIHBhbjogMC4xLCBtdXRlZDogZmFsc2UsIHNvbG9lZDogZmFsc2UgfSxcbiAgICB7IGlkOiBcInBhZF8xMlwiLCBuYW1lOiBcIk5lb24gTGVhZFwiLCBjYXRlZ29yeTogXCJzeW50aFwiLCBjb2xvcjogXCJ2aW9sZXRcIiwgbG9vcFR5cGU6IFwic3ludGhfYXJwXCIsIGlzUGxheWluZzogZmFsc2UsIHZvbHVtZTogMC43NSwgcGFuOiAtMC4zLCBtdXRlZDogZmFsc2UsIHNvbG9lZDogZmFsc2UgfSxcbiAgICB7IGlkOiBcInBhZF8xM1wiLCBuYW1lOiBcIlN3ZWVwIFJpc2VyXCIsIGNhdGVnb3J5OiBcImZ4XCIsIGNvbG9yOiBcImFtYmVyXCIsIGxvb3BUeXBlOiBcImZ4X3Jpc2VyXCIsIGlzUGxheWluZzogZmFsc2UsIHZvbHVtZTogMC42LCBwYW46IDAsIG11dGVkOiBmYWxzZSwgc29sb2VkOiBmYWxzZSB9LFxuICAgIHsgaWQ6IFwicGFkXzE0XCIsIG5hbWU6IFwiR2xpdGNoIEhpdFwiLCBjYXRlZ29yeTogXCJmeFwiLCBjb2xvcjogXCJhbWJlclwiLCBsb29wVHlwZTogXCJmeF9nbGl0Y2hcIiwgaXNQbGF5aW5nOiBmYWxzZSwgdm9sdW1lOiAwLjY1LCBwYW46IDAuNCwgbXV0ZWQ6IGZhbHNlLCBzb2xvZWQ6IGZhbHNlIH0sXG4gICAgeyBpZDogXCJwYWRfMTVcIiwgbmFtZTogXCJOb2lzZSBEcm9wXCIsIGNhdGVnb3J5OiBcImZ4XCIsIGNvbG9yOiBcImFtYmVyXCIsIGxvb3BUeXBlOiBcImZ4X3Jpc2VyXCIsIGlzUGxheWluZzogZmFsc2UsIHZvbHVtZTogMC41NSwgcGFuOiAtMC40LCBtdXRlZDogZmFsc2UsIHNvbG9lZDogZmFsc2UgfSxcbiAgICB7IGlkOiBcInBhZF8xNlwiLCBuYW1lOiBcIkZNIFBlcmNcIiwgY2F0ZWdvcnk6IFwiZnhcIiwgY29sb3I6IFwiYW1iZXJcIiwgbG9vcFR5cGU6IFwiZnhfZ2xpdGNoXCIsIGlzUGxheWluZzogZmFsc2UsIHZvbHVtZTogMC43LCBwYW46IDAsIG11dGVkOiBmYWxzZSwgc29sb2VkOiBmYWxzZSB9LFxuICBdKTtcbiAgY29uc3QgW2JwbSwgc2V0QlBNXSA9IHVzZVN0YXRlPG51bWJlcj4oMTI0KTtcbiAgY29uc3QgW21hc3RlclZvbHVtZSwgc2V0TWFzdGVyVm9sdW1lXSA9IHVzZVN0YXRlPG51bWJlcj4oMC44NSk7XG4gIGNvbnN0IFtpc1BsYXlpbmcsIHNldElzUGxheWluZ10gPSB1c2VTdGF0ZTxib29sZWFuPihmYWxzZSk7XG4gIGNvbnN0IFtjdXJyZW50U3RlcCwgc2V0Q3VycmVudFN0ZXBdID0gdXNlU3RhdGU8bnVtYmVyPigwKTtcbiAgY29uc3QgW21heFpJbmRleCwgc2V0TWF4WkluZGV4XSA9IHVzZVN0YXRlPG51bWJlcj4oMjApO1xuXG4gIC8vIFN0YXRlIGhpc3Rvcnkgc3RhY2sgZm9yIFVuZG8gLyBSZWRvXG4gIGNvbnN0IFtoaXN0b3J5LCBzZXRIaXN0b3J5XSA9IHVzZVN0YXRlPEFycmF5PHsgcGFkczogUGFkW10sIGJwbTogbnVtYmVyIH0+PihbXSk7XG4gIGNvbnN0IFtmdXR1cmUsIHNldEZ1dHVyZV0gPSB1c2VTdGF0ZTxBcnJheTx7IHBhZHM6IFBhZFtdLCBicG06IG51bWJlciB9Pj4oW10pO1xuXG4gIGNvbnN0IHVwZGF0ZVBhZHMgPSAoYWN0aW9uOiBSZWFjdC5TZXRTdGF0ZUFjdGlvbjxQYWRbXT4pID0+IHtcbiAgICBzZXRQYWRzKHByZXZQYWRzID0+IHtcbiAgICAgIGNvbnN0IG5leHRQYWRzID0gdHlwZW9mIGFjdGlvbiA9PT0gJ2Z1bmN0aW9uJyA/IGFjdGlvbihwcmV2UGFkcykgOiBhY3Rpb247XG4gICAgICBpZiAoSlNPTi5zdHJpbmdpZnkocHJldlBhZHMpICE9PSBKU09OLnN0cmluZ2lmeShuZXh0UGFkcykpIHtcbiAgICAgICAgc2V0SGlzdG9yeShoID0+IFsuLi5oLnNsaWNlKC0yMCksIHsgcGFkczogcHJldlBhZHMsIGJwbSB9XSk7XG4gICAgICAgIHNldEZ1dHVyZShbXSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gbmV4dFBhZHM7XG4gICAgfSk7XG4gIH07XG5cbiAgY29uc3QgdXBkYXRlQlBNID0gKG5ld0JwbTogbnVtYmVyKSA9PiB7XG4gICAgaWYgKG5ld0JwbSAhPT0gYnBtKSB7XG4gICAgICBzZXRIaXN0b3J5KGggPT4gWy4uLmguc2xpY2UoLTIwKSwgeyBwYWRzLCBicG0gfV0pO1xuICAgICAgc2V0RnV0dXJlKFtdKTtcbiAgICAgIHNldEJQTShuZXdCcG0pO1xuICAgIH1cbiAgfTtcblxuICBjb25zdCBoYW5kbGVVbmRvID0gKCkgPT4ge1xuICAgIGlmIChoaXN0b3J5Lmxlbmd0aCA9PT0gMCkgcmV0dXJuO1xuICAgIGNvbnN0IHByZXZpb3VzID0gaGlzdG9yeVtoaXN0b3J5Lmxlbmd0aCAtIDFdO1xuICAgIGNvbnN0IG5ld0hpc3RvcnkgPSBoaXN0b3J5LnNsaWNlKDAsIGhpc3RvcnkubGVuZ3RoIC0gMSk7XG4gICAgc2V0RnV0dXJlKGYgPT4gW3sgcGFkcywgYnBtIH0sIC4uLmZdKTtcbiAgICBzZXRIaXN0b3J5KG5ld0hpc3RvcnkpO1xuICAgIHNldFBhZHMocHJldmlvdXMucGFkcyk7XG4gICAgc2V0QlBNKHByZXZpb3VzLmJwbSk7XG4gIH07XG5cbiAgY29uc3QgaGFuZGxlUmVkbyA9ICgpID0+IHtcbiAgICBpZiAoZnV0dXJlLmxlbmd0aCA9PT0gMCkgcmV0dXJuO1xuICAgIGNvbnN0IG5leHQgPSBmdXR1cmVbMF07XG4gICAgY29uc3QgbmV3RnV0dXJlID0gZnV0dXJlLnNsaWNlKDEpO1xuICAgIHNldEhpc3RvcnkoaCA9PiBbLi4uaCwgeyBwYWRzLCBicG0gfV0pO1xuICAgIHNldEZ1dHVyZShuZXdGdXR1cmUpO1xuICAgIHNldFBhZHMobmV4dC5wYWRzKTtcbiAgICBzZXRCUE0obmV4dC5icG0pO1xuICB9O1xuXG4gIGNvbnN0IFtub3RpZmljYXRpb24sIHNldE5vdGlmaWNhdGlvbl0gPSB1c2VTdGF0ZTxzdHJpbmcgfCBudWxsPihudWxsKTtcblxuICBjb25zdCBzaG93Tm90aWZpY2F0aW9uID0gKG1zZzogc3RyaW5nKSA9PiB7XG4gICAgc2V0Tm90aWZpY2F0aW9uKG1zZyk7XG4gICAgc2V0VGltZW91dCgoKSA9PiBzZXROb3RpZmljYXRpb24obnVsbCksIDMwMDApO1xuICB9O1xuXG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgY29uc3QgaGFuZGxlS2V5RG93biA9IChlOiBLZXlib2FyZEV2ZW50KSA9PiB7XG4gICAgICBjb25zdCB0YXJnZXQgPSBlLnRhcmdldCBhcyBIVE1MRWxlbWVudDtcbiAgICAgIGNvbnN0IGlzSW5wdXQgPSB0YXJnZXQgJiYgKHRhcmdldC50YWdOYW1lID09PSAnSU5QVVQnIHx8IHRhcmdldC50YWdOYW1lID09PSAnVEVYVEFSRUEnIHx8IHRhcmdldC5pc0NvbnRlbnRFZGl0YWJsZSk7XG5cbiAgICAgIC8vIFNwYWNlYmFyIGZvciBQbGF5L1N0b3BcbiAgICAgIGlmIChlLmNvZGUgPT09ICdTcGFjZScgJiYgIWlzSW5wdXQpIHtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICBoYW5kbGVUb2dnbGVQbGF5KCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgLy8gQ3RybCtTIC8gQ21kK1MgZm9yIFF1aWNrIFNhdmVcbiAgICAgIGlmICgoZS5jdHJsS2V5IHx8IGUubWV0YUtleSkgJiYgZS5rZXkudG9Mb3dlckNhc2UoKSA9PT0gJ3MnKSB7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgY29uc3QgcXVpY2tQcmVzZXQgPSB7XG4gICAgICAgICAgbmFtZTogYFF1aWNrIFNhdmUgKCR7bmV3IERhdGUoKS50b0xvY2FsZVRpbWVTdHJpbmcoKX0pYCxcbiAgICAgICAgICBkYXRlOiBuZXcgRGF0ZSgpLnRvTG9jYWxlU3RyaW5nKCksXG4gICAgICAgICAgYnBtLFxuICAgICAgICAgIHBhZHMsXG4gICAgICAgICAgbWFzdGVyVm9sdW1lXG4gICAgICAgIH07XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgY29uc3Qgc3RvcmVkID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oXCJyZW1peF9vc19wcmVzZXRzX3YxXCIpO1xuICAgICAgICAgIGNvbnN0IHBhcnNlZCA9IHN0b3JlZCA/IEpTT04ucGFyc2Uoc3RvcmVkKSA6IFtdO1xuICAgICAgICAgIGNvbnN0IHVwZGF0ZWQgPSBbcXVpY2tQcmVzZXQsIC4uLnBhcnNlZF07XG4gICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oXCJyZW1peF9vc19wcmVzZXRzX3YxXCIsIEpTT04uc3RyaW5naWZ5KHVwZGF0ZWQpKTtcbiAgICAgICAgICBzaG93Tm90aWZpY2F0aW9uKFwiUHJvamVjdCBxdWljay1zYXZlZCB0byBMb2NhbCBTdG9yYWdlIChDdHJsK1MpIVwiKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgY29uc29sZS5lcnJvcihlcnIpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgLy8gRGVsZXRlIC8gQmFja3NwYWNlIGZvciBjbGVhcmluZyBhY3RpdmUgcGxheWluZyBwYWRzXG4gICAgICBpZiAoKGUua2V5ID09PSAnRGVsZXRlJyB8fCBlLmtleSA9PT0gJ0JhY2tzcGFjZScpICYmICFpc0lucHV0KSB7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgdXBkYXRlUGFkcyhwcmV2ID0+IHByZXYubWFwKHAgPT4gKHsgLi4ucCwgaXNQbGF5aW5nOiBmYWxzZSB9KSkpO1xuICAgICAgICBzaG93Tm90aWZpY2F0aW9uKFwiQWxsIGFjdGl2ZSBwbGF5aW5nIHBhZHMgc3RvcHBlZC9jbGVhcmVkIChEZWxldGUpLlwiKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICAvLyBVbmRvIC8gUmVkbyAoQ3RybCtaIC8gQ3RybCtZKVxuICAgICAgaWYgKChlLmN0cmxLZXkgfHwgZS5tZXRhS2V5KSAmJiBlLmtleS50b0xvd2VyQ2FzZSgpID09PSAneicpIHtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICBpZiAoZS5zaGlmdEtleSkge1xuICAgICAgICAgIGhhbmRsZVJlZG8oKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBoYW5kbGVVbmRvKCk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoKGUuY3RybEtleSB8fCBlLm1ldGFLZXkpICYmIGUua2V5LnRvTG93ZXJDYXNlKCkgPT09ICd5Jykge1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIGhhbmRsZVJlZG8oKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCBoYW5kbGVLZXlEb3duKTtcbiAgICByZXR1cm4gKCkgPT4gd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCBoYW5kbGVLZXlEb3duKTtcbiAgfSwgW2hpc3RvcnksIGZ1dHVyZSwgcGFkcywgYnBtLCBpc1BsYXlpbmcsIG1hc3RlclZvbHVtZV0pO1xuXG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgYXVkaW9FbmdpbmUudXBkYXRlUGFkc1N0YXRlKHBhZHMpO1xuICB9LCBbcGFkc10pO1xuXG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgYXVkaW9FbmdpbmUuc2V0QlBNKGJwbSk7XG4gIH0sIFticG1dKTtcblxuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIGF1ZGlvRW5naW5lLnNldE1hc3RlclZvbHVtZShtYXN0ZXJWb2x1bWUpO1xuICB9LCBbbWFzdGVyVm9sdW1lXSk7XG5cbiAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICBjb25zdCBsb2FkQXBwID0gKGlkOiBzdHJpbmcsIHg6IG51bWJlciwgeTogbnVtYmVyKSA9PiB7XG4gICAgICBjb25zdCByZWcgPSBBUFBfUkVHSVNUUlkuZmluZChhID0+IGEuaWQgPT09IGlkKTtcbiAgICAgIGlmKCFyZWcpIHJldHVybiBudWxsO1xuICAgICAgcmV0dXJuIHsgaWQsIHRpdGxlOiByZWcudGl0bGUsIGljb25OYW1lOiBpZCwgeCwgeSwgd2lkdGg6IHJlZy5kZWZhdWx0V2lkdGgsIGhlaWdodDogcmVnLmRlZmF1bHRIZWlnaHQsIHpJbmRleDogMTAsIGlzTWluaW1pemVkOiBmYWxzZSwgaXNPcGVuOiB0cnVlLCBpc01heGltaXplZDogZmFsc2UgfTtcbiAgICB9O1xuICAgIGNvbnN0IGluaXRXaW5kb3dzID0gW2xvYWRBcHAoXCJncmlkXCIsIDQwLCAzMCksIGxvYWRBcHAoXCJtaXhlclwiLCA2ODAsIDMwKSwgbG9hZEFwcChcImFpZ2VuXCIsIDE4MCwgMTUwKV0uZmlsdGVyKEJvb2xlYW4pIGFzIEFwcFdpbmRvd1tdO1xuICAgIHNldFdpbmRvd3MoaW5pdFdpbmRvd3MpO1xuICAgIGF1ZGlvRW5naW5lLnNldE9uU3RlcCgoc3RlcCkgPT4gc2V0Q3VycmVudFN0ZXAoc3RlcCkpO1xuICAgIHJldHVybiAoKSA9PiBhdWRpb0VuZ2luZS5zdG9wKCk7XG4gIH0sIFtdKTtcblxuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIGF1ZGlvRW5naW5lLmluaXRNSURJKChwYWRJbmRleCkgPT4ge1xuICAgICAgdXBkYXRlUGFkcyhwcmV2ID0+IHByZXYubWFwKChwLCBpZHgpID0+IHtcbiAgICAgICAgaWYgKGlkeCA9PT0gcGFkSW5kZXgpIHtcbiAgICAgICAgICBhdWRpb0VuZ2luZS5wbGF5UGFkRGlyZWN0KHApO1xuICAgICAgICAgIHJldHVybiB7IC4uLnAsIGlzUGxheWluZzogdHJ1ZSB9O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBwO1xuICAgICAgfSkpO1xuICAgICAgc2hvd05vdGlmaWNhdGlvbihgTUlESSBOb3RlIFRyaWdnZXJlZDogUGFkICR7cGFkSW5kZXggKyAxfWApO1xuICAgIH0pO1xuICB9LCBbXSk7XG5cbiAgY29uc3QgaGFuZGxlVG9nZ2xlUGxheSA9ICgpID0+IHtcbiAgICBpZiAoaXNQbGF5aW5nKSB7IGF1ZGlvRW5naW5lLnN0b3AoKTsgc2V0SXNQbGF5aW5nKGZhbHNlKTsgfVxuICAgIGVsc2UgeyBhdWRpb0VuZ2luZS5zdGFydCgpOyBzZXRJc1BsYXlpbmcodHJ1ZSk7IH1cbiAgfTtcblxuICBjb25zdCBvcGVuV2luZG93ID0gKGlkOiBXaW5kb3dJZCkgPT4ge1xuICAgIGNvbnN0IG5leHRaID0gbWF4WkluZGV4ICsgMTtcbiAgICBzZXRNYXhaSW5kZXgobmV4dFopO1xuICAgIHNldFdpbmRvd3MoKHByZXYpID0+IHtcbiAgICAgIGNvbnN0IGV4aXN0cyA9IHByZXYuZmluZCh3ID0+IHcuaWQgPT09IGlkKTtcbiAgICAgIGlmIChleGlzdHMpIHJldHVybiBwcmV2Lm1hcCgodykgPT4gKHcuaWQgPT09IGlkID8geyAuLi53LCBpc09wZW46IHRydWUsIGlzTWluaW1pemVkOiBmYWxzZSwgekluZGV4OiBuZXh0WiB9IDogdykpO1xuICAgICAgY29uc3QgYXBwSW5mbyA9IEFQUF9SRUdJU1RSWS5maW5kKGEgPT4gYS5pZCA9PT0gaWQpO1xuICAgICAgaWYgKCFhcHBJbmZvKSByZXR1cm4gcHJldjtcbiAgICAgIHJldHVybiBbLi4ucHJldiwgeyBpZCwgdGl0bGU6IGFwcEluZm8udGl0bGUsIGljb25OYW1lOiBpZCwgeDogTWF0aC5tYXgoMjAsIE1hdGgucmFuZG9tKCkgKiAxNTApLCB5OiBNYXRoLm1heCgyMCwgTWF0aC5yYW5kb20oKSAqIDE1MCksIHdpZHRoOiBhcHBJbmZvLmRlZmF1bHRXaWR0aCwgaGVpZ2h0OiBhcHBJbmZvLmRlZmF1bHRIZWlnaHQsIHpJbmRleDogbmV4dFosIGlzT3BlbjogdHJ1ZSwgaXNNaW5pbWl6ZWQ6IGZhbHNlLCBpc01heGltaXplZDogZmFsc2UgfV07XG4gICAgfSk7XG4gIH07XG5cbiAgY29uc3QgdXBkYXRlV2luZG93ID0gKGlkOiBXaW5kb3dJZCwgdXBkYXRlczogUGFydGlhbDxBcHBXaW5kb3c+KSA9PiB7XG4gICAgc2V0V2luZG93cyhwcmV2ID0+IHByZXYubWFwKHcgPT4gdy5pZCA9PT0gaWQgPyB7IC4uLncsIC4uLnVwZGF0ZXMgfSA6IHcpKTtcbiAgfTtcblxuICBjb25zdCB0b2dnbGVXaW5kb3cgPSAoaWQ6IFdpbmRvd0lkKSA9PiB7XG4gICAgY29uc3QgdyA9IHdpbmRvd3MuZmluZCh3ID0+IHcuaWQgPT09IGlkKTtcbiAgICBpZiAoIXcpIHJldHVybjtcbiAgICBpZiAoIXcuaXNPcGVuKSBvcGVuV2luZG93KGlkKTtcbiAgICBlbHNlIGlmICh3LmlzTWluaW1pemVkKSB1cGRhdGVXaW5kb3coaWQsIHsgaXNNaW5pbWl6ZWQ6IGZhbHNlLCB6SW5kZXg6IG1heFpJbmRleCArIDEgfSk7XG4gICAgZWxzZSB1cGRhdGVXaW5kb3coaWQsIHsgaXNNaW5pbWl6ZWQ6IHRydWUgfSk7XG4gICAgc2V0TWF4WkluZGV4KHByZXYgPT4gcHJldiArIDEpO1xuICB9O1xuXG4gIHJldHVybiAoXG4gICAgPGRpdiBjbGFzc05hbWU9XCJtaW4taC1zY3JlZW4gdy1mdWxsIGgtc2NyZWVuIGJnLXNsYXRlLTk1MCB0ZXh0LXNsYXRlLTEwMCBmbGV4IGZsZXgtY29sIG92ZXJmbG93LWhpZGRlbiBzZWxlY3Qtbm9uZSBmb250LXNhbnMgcmVsYXRpdmVcIj5cbiAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJzb2x1dGUgaW5zZXQtMCBiZy1bcmFkaWFsLWdyYWRpZW50KGVsbGlwc2VfYXRfdG9wLF92YXIoLS10dy1ncmFkaWVudC1zdG9wcykpXSBmcm9tLXNsYXRlLTkwMCB2aWEtc2xhdGUtOTUwIHRvLWJsYWNrIHBvaW50ZXItZXZlbnRzLW5vbmUgei0wXCIgLz5cbiAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJzb2x1dGUgaW5zZXQtMCBiZy1bbGluZWFyLWdyYWRpZW50KHRvX3JpZ2h0LCMxZTI5M2JfMXB4LHRyYW5zcGFyZW50XzFweCksbGluZWFyLWdyYWRpZW50KHRvX2JvdHRvbSwjMWUyOTNiXzFweCx0cmFuc3BhcmVudF8xcHgpXSBiZy1bc2l6ZTo0OHB4XzQ4cHhdIG9wYWNpdHktMjAgcG9pbnRlci1ldmVudHMtbm9uZSB6LTBcIiAvPlxuICAgICAgXG4gICAgICB7bm90aWZpY2F0aW9uICYmIChcbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYnNvbHV0ZSB0b3AtNCBsZWZ0LTEvMiAtdHJhbnNsYXRlLXgtMS8yIHotWzEwMF0gYmctc2xhdGUtOTAwIGJvcmRlciBib3JkZXItYW1iZXItNTAwIHRleHQtYW1iZXItMzAwIHB4LTQgcHktMiByb3VuZGVkLXhsIHNoYWRvdy1bMF8wXzIwcHhfcmdiYSgyNDUsMTU4LDExLDAuMyldIGZvbnQtbW9ubyB0ZXh0LXhzIGZsZXggaXRlbXMtY2VudGVyIGdhcC0yIGFuaW1hdGUtYm91bmNlXCI+XG4gICAgICAgICAgPFNwYXJrbGVzIHNpemU9ezE0fSAvPiB7bm90aWZpY2F0aW9ufVxuICAgICAgICA8L2Rpdj5cbiAgICAgICl9XG5cbiAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleC0xIHJlbGF0aXZlIG92ZXJmbG93LWhpZGRlbiB6LTEwXCI+XG4gICAgICAgIDxEZXNrdG9wSWNvbnMgb25PcGVuV2luZG93PXtvcGVuV2luZG93fSAvPlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImFic29sdXRlIGJvdHRvbS04IHJpZ2h0LTggcG9pbnRlci1ldmVudHMtbm9uZSBvcGFjaXR5LTEwIHRleHQtcmlnaHQgei0wXCI+XG4gICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC01eGwgZm9udC1ibGFjayB1cHBlcmNhc2UgdHJhY2tpbmctd2lkZXN0IHRleHQtY3lhbi00MDBcIj5SRU1JWCBPUzwvcD5cbiAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LXNtIGZvbnQtbW9ubyB0ZXh0LXNsYXRlLTQwMCB0cmFja2luZy13aWRlc3RcIj5BVURJTyBXT1JLU1BBQ0UgUFdBIFYyLjA8L3A+XG4gICAgICAgIDwvZGl2PlxuXG4gICAgICAgIHt3aW5kb3dzLmZpbHRlcigodykgPT4gdy5pc09wZW4pLm1hcCgodykgPT4ge1xuICAgICAgICAgIGNvbnN0IHJlZyA9IEFQUF9SRUdJU1RSWS5maW5kKGEgPT4gYS5pZCA9PT0gdy5pZCk7XG4gICAgICAgICAgY29uc3QgSWNvbiA9IHJlZyA/IHJlZy5pY29uIDogR3JpZDtcbiAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgPFdpbmRvd0ZyYW1lXG4gICAgICAgICAgICAgIGtleT17dy5pZH0gYXBwV2luZG93PXt3fSBpY29uPXs8SWNvbiBzaXplPXsxNH0gY2xhc3NOYW1lPXtyZWc/LmNvbG9yfSAvPn1cbiAgICAgICAgICAgICAgb25DbG9zZT17KCkgPT4gdXBkYXRlV2luZG93KHcuaWQsIHsgaXNPcGVuOiBmYWxzZSB9KX1cbiAgICAgICAgICAgICAgb25NaW5pbWl6ZT17KCkgPT4gdXBkYXRlV2luZG93KHcuaWQsIHsgaXNNaW5pbWl6ZWQ6IHRydWUgfSl9XG4gICAgICAgICAgICAgIG9uTWF4aW1pemU9eygpID0+IHVwZGF0ZVdpbmRvdyh3LmlkLCB7IGlzTWF4aW1pemVkOiAhdy5pc01heGltaXplZCB9KX1cbiAgICAgICAgICAgICAgb25Gb2N1cz17KCkgPT4geyBzZXRNYXhaSW5kZXgoeiA9PiB6ICsgMSk7IHVwZGF0ZVdpbmRvdyh3LmlkLCB7IHpJbmRleDogbWF4WkluZGV4ICsgMSB9KTsgfX1cbiAgICAgICAgICAgICAgb25Nb3ZlPXsoeDogbnVtYmVyLCB5OiBudW1iZXIpID0+IHVwZGF0ZVdpbmRvdyh3LmlkLCB7IHgsIHkgfSl9XG4gICAgICAgICAgICA+XG4gICAgICAgICAgICAgIHt3LmlkID09PSBcImdyaWRcIiAmJiA8R3JpZExhdW5jaGVyIHBhZHM9e3BhZHN9IGN1cnJlbnRTdGVwPXtjdXJyZW50U3RlcH0gaXNQbGF5aW5nPXtpc1BsYXlpbmd9IG9uVG9nZ2xlUGFkPXsoaWQ6IHN0cmluZykgPT4gdXBkYXRlUGFkcyhwID0+IHAubWFwKHBhZCA9PiBwYWQuaWQgPT09IGlkID8geyAuLi5wYWQsIGlzUGxheWluZzogIXBhZC5pc1BsYXlpbmcgfSA6IHBhZCkpfSAvPn1cbiAgICAgICAgICAgICAge3cuaWQgPT09IFwibWl4ZXJcIiAmJiA8TWl4ZXJSYWNrIHBhZHM9e3BhZHN9IG1hc3RlclZvbHVtZT17bWFzdGVyVm9sdW1lfSBvblVwZGF0ZVZvbHVtZT17KGlkOiBzdHJpbmcsIHZvbDogbnVtYmVyKSA9PiB1cGRhdGVQYWRzKHAgPT4gcC5tYXAocGFkID0+IHBhZC5pZCA9PT0gaWQgPyB7IC4uLnBhZCwgdm9sdW1lOiB2b2wgfSA6IHBhZCkpfSBvblVwZGF0ZVBhbj17KGlkOiBzdHJpbmcsIHBhbjogbnVtYmVyKSA9PiB1cGRhdGVQYWRzKHAgPT4gcC5tYXAocGFkID0+IHBhZC5pZCA9PT0gaWQgPyB7IC4uLnBhZCwgcGFuIH0gOiBwYWQpKX0gb25Ub2dnbGVNdXRlPXsoaWQ6IHN0cmluZykgPT4gdXBkYXRlUGFkcyhwID0+IHAubWFwKHBhZCA9PiBwYWQuaWQgPT09IGlkID8geyAuLi5wYWQsIG11dGVkOiAhcGFkLm11dGVkIH0gOiBwYWQpKX0gb25Ub2dnbGVTb2xvPXsoaWQ6IHN0cmluZykgPT4gdXBkYXRlUGFkcyhwID0+IHAubWFwKHBhZCA9PiBwYWQuaWQgPT09IGlkID8geyAuLi5wYWQsIHNvbG9lZDogIXBhZC5zb2xvZWQgfSA6IHBhZCkpfSBvblVwZGF0ZU1hc3RlclZvbHVtZT17c2V0TWFzdGVyVm9sdW1lfSAvPn1cbiAgICAgICAgICAgICAge3cuaWQgPT09IFwiYWlnZW5cIiAmJiA8QUlUcmFja0dlbmVyYXRvciBzZXRCcG09e3VwZGF0ZUJQTX0gc2V0UGFkcz17dXBkYXRlUGFkc30gLz59XG4gICAgICAgICAgICAgIHt3LmlkID09PSBcImFjaWRcIiAmJiA8QWNpZEJveFN5bnRoIC8+fVxuICAgICAgICAgICAgICB7dy5pZCA9PT0gXCJzY29wZVwiICYmIDxNYXN0ZXJPc2NpbGxvc2NvcGUgLz59XG4gICAgICAgICAgICAgIHt3LmlkID09PSBcImdyYW51bGFyXCIgJiYgPEdyYW51bGFyU3ludGggLz59XG4gICAgICAgICAgICAgIHt3LmlkID09PSBcInNlcXVlbmNlclwiICYmIDxTdGVwU2VxdWVuY2VyIC8+fVxuICAgICAgICAgICAgICB7dy5pZCA9PT0gXCJwYXRjaGJheVwiICYmIDxNb2R1bGFyUGF0Y2hCYXkgLz59XG4gICAgICAgICAgICAgIHt3LmlkID09PSBcInh5cGFkXCIgJiYgPFhZUGVyZm9ybWFuY2VQYWQgLz59XG4gICAgICAgICAgICAgIHt3LmlkID09PSBcImZ4XCIgJiYgPEZYQ2hhaW4gLz59XG4gICAgICAgICAgICAgIHt3LmlkID09PSBcImNyYXRlXCIgJiYgPFNhbXBsZUNyYXRlIC8+fVxuICAgICAgICAgICAgICB7dy5pZCA9PT0gXCJwcmVzZXQtbWFuYWdlclwiICYmIDxQcmVzZXRNYW5hZ2VyIHBhZHM9e3BhZHN9IGJwbT17YnBtfSBtYXN0ZXJWb2x1bWU9e21hc3RlclZvbHVtZX0gb25Mb2FkUHJlc2V0PXsoc3RhdGUpID0+IHsgdXBkYXRlUGFkcyhzdGF0ZS5wYWRzKTsgdXBkYXRlQlBNKHN0YXRlLmJwbSk7IHNldE1hc3RlclZvbHVtZShzdGF0ZS5tYXN0ZXJWb2x1bWUpOyB9fSAvPn1cbiAgICAgICAgICAgICAge3cuaWQgPT09IFwiZHJ1bW1hY2hpbmVcIiAmJiA8RHJ1bU1hY2hpbmUgLz59XG4gICAgICAgICAgICAgIHt3LmlkID09PSBcImxvb3BlclwiICYmIDxMb29wZXIgLz59XG4gICAgICAgICAgICAgIHt3LmlkID09PSBcInNhbXBsZXJcIiAmJiA8U2FtcGxlciAvPn1cbiAgICAgICAgICAgICAge3cuaWQgPT09IFwidm9pY2V0cmFpbmVyXCIgJiYgPFZvaWNlVHJhaW5lciAvPn1cbiAgICAgICAgICAgICAge3cuaWQgPT09IFwidm9pY2VjaGFuZ2VyXCIgJiYgPFZvaWNlQ2hhbmdlciAvPn1cbiAgICAgICAgICAgICAge3cuaWQgPT09IFwidHJpbVwiICYmIDxBZHZhbmNlZFRyaW0gLz59XG4gICAgICAgICAgICAgIHt3LmlkID09PSBcIm1hdHJpeFwiICYmIDxDaGFubmVsTWF0cml4IC8+fVxuICAgICAgICAgICAgICB7KHcuaWQgPT09IFwicGFyYW1ldHJpYy1lcVwiIHx8IHcuaWQgPT09IFwiZXFcIikgJiYgPFBhcmFtZXRyaWNFUSAvPn1cbiAgICAgICAgICAgICAgeyh3LmlkID09PSBcInZvY2FsYXV0b3R1bmVcIiB8fCB3LmlkID09PSBcImF1dG90dW5lXCIpICYmIDxWb2NhbEF1dG9UdW5lIC8+fVxuICAgICAgICAgICAgICB7dy5pZCA9PT0gXCJkanNldG1peFwiICYmIDxESlNldE1peFN0dWRpbyAvPn1cbiAgICAgICAgICAgICAge3cuaWQgPT09IFwibW9iaWxlXCIgJiYgPE1vYmlsZUNvbnRyb2xsZXIgLz59XG4gICAgICAgICAgICAgIHt3LmlkID09PSBcImdpdGh1Yi1wdWJsaXNoZXJcIiAmJiA8R2l0SHViUHVibGlzaGVyIHBhZHM9e3BhZHN9IGJwbT17YnBtfSBtYXN0ZXJWb2x1bWU9e21hc3RlclZvbHVtZX0gLz59XG4gICAgICAgICAgICA8L1dpbmRvd0ZyYW1lPlxuICAgICAgICAgIClcbiAgICAgICAgfSl9XG4gICAgICA8L2Rpdj5cblxuICAgICAgPFRhc2tiYXJcbiAgICAgICAgd2luZG93cz17d2luZG93cy5maWx0ZXIoKHcpID0+IHcuaXNPcGVuKX1cbiAgICAgICAgaXNQbGF5aW5nPXtpc1BsYXlpbmd9IGJwbT17YnBtfSBjdXJyZW50U3RlcD17Y3VycmVudFN0ZXB9IG1hc3RlclZvbHVtZT17bWFzdGVyVm9sdW1lfVxuICAgICAgICBvblRvZ2dsZVBsYXk9e2hhbmRsZVRvZ2dsZVBsYXl9IG9uVXBkYXRlQlBNPXt1cGRhdGVCUE19IG9uVXBkYXRlTWFzdGVyVm9sdW1lPXtzZXRNYXN0ZXJWb2x1bWV9XG4gICAgICAgIG9uVG9nZ2xlV2luZG93PXt0b2dnbGVXaW5kb3d9IG9uUmVzZXRQcm9qZWN0PXsoKSA9PiB7IHNldFdpbmRvd3MoW10pOyBvcGVuV2luZG93KFwiZ3JpZFwiKTsgfX1cbiAgICAgICAgb25VbmRvPXtoYW5kbGVVbmRvfSBvblJlZG89e2hhbmRsZVJlZG99IGNhblVuZG89e2hpc3RvcnkubGVuZ3RoID4gMH0gY2FuUmVkbz17ZnV0dXJlLmxlbmd0aCA+IDB9XG4gICAgICAvPlxuICAgIDwvZGl2PlxuICApO1xufVxuIl19