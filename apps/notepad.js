
const NotepadApp = {
  instance: null,

  init(container) {
    if (this.instance) {
      this.destroy();
    }
    this.instance = new Notepad(container);
  },

  destroy() {
    if (this.instance) {
      this.instance.cleanup();
      this.instance = null;
    }
  }
};

class Notepad {
  constructor(container) {
    this.container = container;
    this.state = {
      content: localStorage.getItem('notepad_content') || '',
      fontSize: 16,
      isPreview: false,
      typewriter: false,
      wordCount: 0,
      charCount: 0
    };
    this.audioCtx = null;
    this.clickBuffer = null;

    this.render();
    this.attachEvents();
    this.updateStatus();
  }

  render() {
    this.container.innerHTML = `
      <style>
        .notepad-app {
          display: flex;
          flex-direction: column;
          height: 100%;
          width: 100%;
          background: #000;
          color: #3f3;
          font-family: 'VT323', monospace;
          position: relative;
          overflow: hidden;
        }
        
        .notepad-toolbar {
          display: flex;
          gap: 10px;
          padding: 8px;
          border-bottom: 2px solid #3f3;
          background: #111;
          align-items: center;
          flex-wrap: wrap;
        }

        .notepad-btn {
          background: #000;
          color: #3f3;
          border: 1px solid #3f3;
          padding: 4px 8px;
          font-family: 'VT323', monospace;
          cursor: pointer;
          text-transform: uppercase;
          font-size: 14px;
          transition: all 0.1s;
        }

        .notepad-btn:hover {
          background: #3f3;
          color: #000;
        }

        .notepad-btn.active {
          background: #3f3;
          color: #000;
          box-shadow: 0 0 10px #3f3;
        }

        .notepad-select {
          background: #000;
          color: #3f3;
          border: 1px solid #3f3;
          padding: 4px;
          font-family: 'VT323', monospace;
        }

        .notepad-editor-container {
          flex: 1;
          position: relative;
          display: flex;
          overflow: hidden;
        }

        .notepad-textarea {
          flex: 1;
          background: #000;
          color: #3f3;
          border: none;
          resize: none;
          padding: 20px;
          font-family: 'VT323', monospace;
          font-size: 16px;
          outline: none;
          line-height: 1.5;
          width: 100%;
          height: 100%;
          box-sizing: border-box;
          z-index: 1;
        }

        /* CRT Scanline Effect */
        .notepad-app::after {
          content: " ";
          display: block;
          position: absolute;
          top: 0;
          left: 0;
          bottom: 0;
          right: 0;
          background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06));
          z-index: 2;
          background-size: 100% 2px, 3px 100%;
          pointer-events: none;
        }
        
        /* CRT Glow */
        .notepad-textarea {
          text-shadow: 0 0 2px #3f3;
        }

        .notepad-preview {
          flex: 1;
          background: #111;
          color: #2f2;
          padding: 20px;
          overflow-y: auto;
          display: none;
          font-family: 'VT323', monospace;
          border-left: 1px solid #3f3;
        }

        .notepad-preview h1 { font-size: 2em; border-bottom: 1px solid #3f3; }
        .notepad-preview h2 { font-size: 1.5em; }
        .notepad-preview code { background: #222; padding: 2px 4px; }
        .notepad-preview pre { background: #222; padding: 10px; border: 1px solid #3f3; }
        .notepad-preview blockquote { border-left: 3px solid #3f3; padding-left: 10px; margin-left: 0; }

        .notepad-status {
          padding: 4px 10px;
          background: #111;
          border-top: 2px solid #3f3;
          font-size: 14px;
          display: flex;
          justify-content: space-between;
        }
      </style>

      <div class="notepad-app">
        <div class="notepad-toolbar">
          <button class="notepad-btn" id="np-new">New</button>
          <button class="notepad-btn" id="np-save">Save</button>
          <button class="notepad-btn" id="np-load">Load</button>
          <select class="notepad-select" id="np-font-size">
            <option value="12">12px</option>
            <option value="14">14px</option>
            <option value="16" selected>16px</option>
            <option value="18">18px</option>
            <option value="20">20px</option>
            <option value="24">24px</option>
          </select>
          <button class="notepad-btn" id="np-preview-toggle">Markdown View</button>
          <button class="notepad-btn" id="np-typewriter-toggle">Typewriter: OFF</button>
        </div>
        
        <div class="notepad-editor-container">
          <textarea class="notepad-textarea" spellcheck="false" placeholder="INITIALIZING SYSTEM... READY."></textarea>
          <div class="notepad-preview"></div>
        </div>

        <div class="notepad-status">
          <span id="np-status-msg">READY</span>
          <span>W: <span id="np-word-count">0</span> | C: <span id="np-char-count">0</span></span>
        </div>
      </div>
    `;

    this.elements = {
      textarea: this.container.querySelector('.notepad-textarea'),
      preview: this.container.querySelector('.notepad-preview'),
      fontSizeSelect: this.container.querySelector('#np-font-size'),
      newBtn: this.container.querySelector('#np-new'),
      saveBtn: this.container.querySelector('#np-save'),
      loadBtn: this.container.querySelector('#np-load'),
      previewBtn: this.container.querySelector('#np-preview-toggle'),
      typewriterBtn: this.container.querySelector('#np-typewriter-toggle'),
      wordCount: this.container.querySelector('#np-word-count'),
      charCount: this.container.querySelector('#np-char-count'),
      statusMsg: this.container.querySelector('#np-status-msg')
    };

    // Initialize content
    if (this.state.content) {
      this.elements.textarea.value = this.state.content;
    }
  }

  attachEvents() {
    const els = this.elements;

    els.textarea.addEventListener('input', () => {
      this.state.content = els.textarea.value;
      this.updateStatus();
      if (this.state.isPreview) this.renderMarkdown();
    });

    els.textarea.addEventListener('keydown', (e) => {
      if (this.state.typewriter) {
        this.playTypewriterSound();
      }
    });

    els.newBtn.addEventListener('click', () => {
      if (confirm('Clear current buffer? Unsaved data will be lost.')) {
        this.state.content = '';
        els.textarea.value = '';
        this.updateStatus();
        this.setStatus('BUFFER CLEARED');
      }
    });

    els.saveBtn.addEventListener('click', () => {
      localStorage.setItem('notepad_content', this.state.content);
      this.setStatus('SAVED TO DISK');
      this.flashScreen();
    });

    els.loadBtn.addEventListener('click', () => {
      const saved = localStorage.getItem('notepad_content');
      if (saved !== null) {
        this.state.content = saved;
        els.textarea.value = saved;
        this.updateStatus();
        if (this.state.isPreview) this.renderMarkdown();
        this.setStatus('LOADED FROM DISK');
      } else {
        this.setStatus('NO SAVE FOUND');
      }
    });

    els.fontSizeSelect.addEventListener('change', (e) => {
      this.state.fontSize = e.target.value;
      els.textarea.style.fontSize = `${this.state.fontSize}px`;
      els.preview.style.fontSize = `${this.state.fontSize}px`;
    });

    els.previewBtn.addEventListener('click', () => {
      this.state.isPreview = !this.state.isPreview;
      if (this.state.isPreview) {
        els.textarea.style.display = 'none';
        els.preview.style.display = 'block';
        els.previewBtn.classList.add('active');
        this.renderMarkdown();
        this.setStatus('PREVIEW MODE');
      } else {
        els.textarea.style.display = 'block';
        els.preview.style.display = 'none';
        els.previewBtn.classList.remove('active');
        this.setStatus('EDIT MODE');
      }
    });

    els.typewriterBtn.addEventListener('click', () => {
      this.state.typewriter = !this.state.typewriter;
      els.typewriterBtn.innerText = `Typewriter: ${this.state.typewriter ? 'ON' : 'OFF'}`;
      if (this.state.typewriter) {
        els.typewriterBtn.classList.add('active');
        this.initAudio();
      } else {
        els.typewriterBtn.classList.remove('active');
      }
    });
  }

  updateStatus() {
    const text = this.state.content;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const chars = text.length;
    this.elements.wordCount.innerText = words;
    this.elements.charCount.innerText = chars;
  }

  setStatus(msg) {
    const el = this.elements.statusMsg;
    el.innerText = msg;
    setTimeout(() => {
      if (el.innerText === msg) el.innerText = 'READY';
    }, 2000);
  }

  flashScreen() {
    const flash = document.createElement('div');
    flash.style.position = 'absolute';
    flash.style.top = '0';
    flash.style.left = '0';
    flash.style.width = '100%';
    flash.style.height = '100%';
    flash.style.background = '#3f3';
    flash.style.opacity = '0.2';
    flash.style.pointerEvents = 'none';
    flash.style.zIndex = '10';
    this.container.querySelector('.notepad-app').appendChild(flash);
    setTimeout(() => flash.remove(), 100);
  }

  renderMarkdown() {
    let text = this.state.content;
    
    // Simple Markdown Parser
    // Headers
    text = text.replace(/^###### (.*$)/gim, '<h6>$1</h6>');
    text = text.replace(/^##### (.*$)/gim, '<h5>$1</h5>');
    text = text.replace(/^#### (.*$)/gim, '<h4>$1</h4>');
    text = text.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    text = text.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    text = text.replace(/^# (.*$)/gim, '<h1>$1</h1>');
    
    // Blockquotes
    text = text.replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>');
    
    // Bold / Italic
    text = text.replace(/\*\*(.*)\*\*/gim, '<b>$1</b>');
    text = text.replace(/\*(.*)\*/gim, '<i>$1</i>');
    text = text.replace(/__(.*)__/gim, '<b>$1</b>');
    text = text.replace(/_(.*)_/gim, '<i>$1</i>');
    
    // Code blocks
    text = text.replace(/```([\s\S]*?)```/gim, '<pre><code>$1</code></pre>');
    text = text.replace(/`([^`]+)`/gim, '<code>$1</code>');
    
    // Lists (unordered)
    text = text.replace(/^\s*[\-\*] (.*)/gim, '<ul><li>$1</li></ul>');
    // Fix list tags stacking (simple hack: remove adjacent </ul><ul>)
    text = text.replace(/<\/ul>\s*<ul>/gim, '');
    
    // Line breaks
    text = text.replace(/\n/gim, '<br />');
    
    this.elements.preview.innerHTML = text;
  }

  initAudio() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    // Resume if suspended (browser policy)
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  playTypewriterSound() {
    if (!this.audioCtx) return;
    
    const delay = Math.random() * 0.05; // 0-50ms random delay
    const ctx = this.audioCtx;
    
    // Simple noise burst
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    // Create a metallic "clack" sound
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100 + Math.random() * 50, t);
    osc.frequency.exponentialRampToValueAtTime(800, t + 0.05);
    
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2000, t);
    filter.Q.value = 1;

    gain.gain.setValueAtTime(0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
    gain.gain.linearRampToValueAtTime(0, t + 0.1);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.1);

    // Add a second lower "thud" component
    const thud = ctx.createOscillator();
    const thudGain = ctx.createGain();
    thud.type = 'square';
    thud.frequency.setValueAtTime(50, t);
    thudGain.gain.setValueAtTime(0.1, t);
    thudGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    thud.connect(thudGain);
    thudGain.connect(ctx.destination);
    thud.start(t);
    thud.stop(t + 0.05);
  }

  cleanup() {
    // Remove event listeners if needed (though replacing innerHTML clears them mostly for DOM nodes)
    // Close audio context
    if (this.audioCtx) {
      this.audioCtx.close();
    }
    this.container.innerHTML = '';
  }
}

export default NotepadApp;
