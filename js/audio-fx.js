// ========================================================
// js/audio-fx.js — ЗВУКОВОЙ ДВИЖОК И HAPTIC-ОТКЛИК (v1.0.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// ========================================================

const AudioFx = {
    ctx: null,

    init() {
        try {
            const ACtx = window.AudioContext || window.webkitAudioContext;
            if (!this.ctx && ACtx) {
                this.ctx = new ACtx();
            }
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
        } catch (e) {
            console.warn("[AudioFx] Ошибка инициализации Web Audio API:", e);
        }
    },

    haptic(type = 'light') {
        try {
            if (window.Telegram?.WebApp?.HapticFeedback) {
                const isNotif = ['success', 'warning', 'error'].includes(type);
                if (isNotif) {
                    window.Telegram.WebApp.HapticFeedback.notificationOccurred(type);
                } else {
                    window.Telegram.WebApp.HapticFeedback.impactOccurred(type);
                }
            }
        } catch (e) {}
    },

    play(type) {
        try {
            this.init();
            if (!this.ctx) return;

            const profile = window.state?.player?.soundProfile || 'cyber';
            if (profile === 'silent') return;

            const now = this.ctx.currentTime;

            if (type === 'tick') {
                const osc = this.ctx.createOscillator();
                const g = this.ctx.createGain();
                osc.connect(g);
                g.connect(this.ctx.destination);

                if (profile === 'relay') {
                    osc.type = 'square';
                    osc.frequency.setValueAtTime(320, now);
                    g.gain.setValueAtTime(0.04, now);
                    g.linearRampToValueAtTime(0, now + 0.015);
                    osc.start(now);
                    osc.stop(now + 0.015);
                } else if (profile === 'retro') {
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(580, now);
                    osc.linearRampToValueAtTime(320, now + 0.025);
                    g.gain.setValueAtTime(0.06, now);
                    g.linearRampToValueAtTime(0, now + 0.025);
                    osc.start(now);
                    osc.stop(now + 0.025);
                } else {
                    // Cyber
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(800, now);
                    g.gain.setValueAtTime(0.05, now);
                    g.linearRampToValueAtTime(0, now + 0.03);
                    osc.start(now);
                    osc.stop(now + 0.03);
                }
            } else if (type === 'win') {
                const osc = this.ctx.createOscillator();
                const g = this.ctx.createGain();
                osc.connect(g);
                g.connect(this.ctx.destination);

                if (profile === 'retro') {
                    osc.type = 'square';
                    osc.frequency.setValueAtTime(300, now);
                    osc.setValueAtTime(450, now + 0.08);
                    osc.setValueAtTime(600, now + 0.16);
                    g.gain.setValueAtTime(0.12, now);
                    g.linearRampToValueAtTime(0, now + 0.28);
                    osc.start(now);
                    osc.stop(now + 0.28);
                } else {
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(440, now);
                    osc.exponentialRampToValueAtTime(880, now + 0.2);
                    g.gain.setValueAtTime(0.2, now);
                    g.linearRampToValueAtTime(0, now + 0.25);
                    osc.start(now);
                    osc.stop(now + 0.25);
                }
            } else if (type === 'error') {
                const osc = this.ctx.createOscillator();
                const g = this.ctx.createGain();
                osc.connect(g);
                g.connect(this.ctx.destination);

                osc.type = profile === 'retro' ? 'sawtooth' : 'square';
                osc.frequency.setValueAtTime(160, now);
                osc.exponentialRampToValueAtTime(50, now + 0.3);
                g.gain.setValueAtTime(0.15, now);
                g.linearRampToValueAtTime(0, now + 0.3);
                osc.start(now);
                osc.stop(now + 0.3);
            }
        } catch (e) {}
    },

    playEngine() {
        try {
            this.init();
            if (!this.ctx) return;
            const profile = window.state?.player?.soundProfile || 'cyber';
            if (profile === 'silent') return;

            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const g = this.ctx.createGain();

            osc.type = 'sawtooth';
            osc.connect(g);
            g.connect(this.ctx.destination);

            osc.frequency.setValueAtTime(110, now);
            osc.exponentialRampToValueAtTime(520, now + 0.45);
            osc.exponentialRampToValueAtTime(140, now + 0.9);

            g.gain.setValueAtTime(0.25, now);
            g.linearRampToValueAtTime(0, now + 0.95);

            osc.start(now);
            osc.stop(now + 0.95);
            this.haptic('medium');
        } catch (e) {}
    }
};

window.AudioFx = AudioFx;
window.initAudio = () => AudioFx.init();
window.playSound = (type) => AudioFx.play(type);
window.playEngineSound = () => AudioFx.playEngine();
window.tgHaptic = (type) => AudioFx.haptic(type);