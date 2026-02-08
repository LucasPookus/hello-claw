
const CalculatorApp = {
  container: null,
  state: {
    currentValue: '0',
    previousValue: null,
    operator: null,
    history: [],
    waitingForNewInput: false,
    powered: true
  },
  
  // Configuration
  maxHistory: 5,
  easterEggs: {
    '1337': 'H4CK3R',
    '42': 'The Answer',
    '69': 'Nice.',
    '80085': 'Really?'
  },

  init(container) {
    this.container = container;
    this.render();
    this.attachEvents();
  },

  destroy() {
    this.detachEvents();
    if (this.container) {
      this.container.innerHTML = '';
    }
    this.container = null;
  },

  render() {
    if (!this.container) return;

    // Styles
    const colors = {
      bg: '#0a0a0a',
      screenBg: '#0f1f0f',
      text: '#33ff33',
      textDim: '#1a801a',
      border: '#33ff33',
      glow: '0 0 5px #33ff33, 0 0 10px #33ff33'
    };

    const style = `
      font-family: 'VT323', monospace;
      background-color: ${colors.bg};
      color: ${colors.text};
      border: 2px solid ${colors.border};
      border-radius: 10px;
      padding: 20px;
      width: 100%;
      height: 100%;
      max-width: 400px; /* Sensible default constraint */
      box-shadow: 0 0 15px rgba(51, 255, 51, 0.2);
      display: flex;
      flex-direction: column;
      gap: 15px;
      user-select: none;
      box-sizing: border-box;
    `;

    const displayStyle = `
      background-color: ${colors.screenBg};
      border: 1px solid ${colors.textDim};
      padding: 10px;
      border-radius: 4px;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      justify-content: space-between;
      height: 100px;
      box-shadow: inset 0 0 10px rgba(0,0,0,0.5);
      position: relative;
      overflow: hidden;
    `;

    // Scanline effect
    const scanlineStyle = `
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06));
      background-size: 100% 2px, 3px 100%;
      pointer-events: none;
      z-index: 2;
    `;

    const historyStyle = `
      font-size: 0.8rem;
      color: ${colors.textDim};
      list-style: none;
      padding: 0;
      margin: 0;
      text-align: right;
      overflow-y: auto;
      width: 100%;
      line-height: 1.2;
    `;

    const mainDisplayStyle = `
      font-size: 2.5rem;
      text-shadow: ${colors.glow};
      margin: 0;
      white-space: nowrap;
      overflow: hidden;
      width: 100%;
      text-align: right;
      z-index: 1;
    `;

    const gridStyle = `
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      flex-grow: 1;
    `;

    const btnStyle = `
      background: transparent;
      border: 1px solid ${colors.textDim};
      color: ${colors.text};
      font-family: inherit;
      font-size: 1.5rem;
      cursor: pointer;
      border-radius: 4px;
      transition: all 0.1s;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 10px 0;
    `;

    // Inner HTML structure
    this.container.style.cssText = style;
    
    this.container.innerHTML = `
      <div class="calc-display" style="${displayStyle}">
        <div style="${scanlineStyle}"></div>
        <ul class="calc-history" style="${historyStyle}"></ul>
        <div class="calc-current" style="${mainDisplayStyle}">0</div>
      </div>
      <div class="calc-keypad" style="${gridStyle}">
        ${this.renderButtons(btnStyle, colors)}
      </div>
    `;

    this.updateDisplay();
  },

  renderButtons(baseStyle, colors) {
    const buttons = [
      { label: 'C', op: 'clear', style: `border-color: #ff3333; color: #ff3333;` },
      { label: '%', op: 'percent' },
      { label: '/', op: 'operator', val: '/' },
      { label: '*', op: 'operator', val: '*' },
      { label: '7', op: 'number' },
      { label: '8', op: 'number' },
      { label: '9', op: 'number' },
      { label: '-', op: 'operator', val: '-' },
      { label: '4', op: 'number' },
      { label: '5', op: 'number' },
      { label: '6', op: 'number' },
      { label: '+', op: 'operator', val: '+' },
      { label: '1', op: 'number' },
      { label: '2', op: 'number' },
      { label: '3', op: 'number' },
      { label: '=', op: 'equals', style: `grid-row: span 2; background: ${colors.textDim}; color: black;` }, // Tall = button? Or maybe just normal. Let's do normal for grid consistency or custom grid.
      // Actually, let's keep it simple grid first. 
      // Standard layout often has 0 spanning two cols or = spanning two rows.
      // Let's do 0 span 2 cols.
      { label: '0', op: 'number', style: 'grid-column: span 2;' },
      { label: '.', op: 'dot' },
      // equals moved to end to fit 4x5 grid if needed, but 4x4 + 1 row is 4x5.
      // Layout above:
      // C % / *
      // 7 8 9 -
      // 4 5 6 +
      // 1 2 3 =
      // 0 .
      // Wait, that's messy.
      // Let's do:
      // C % / *
      // 7 8 9 -
      // 4 5 6 +
      // 1 2 3 =  <-- = usually spans, or is in 4th col.
      // 0 .      <-- 0 spans 2.
    ];
    
    // Adjusted layout logic for mapping
    // Row 1: C, %, /, *
    // Row 2: 7, 8, 9, -
    // Row 3: 4, 5, 6, +
    // Row 4: 1, 2, 3, = (Equal usually bottom right, sometimes tall)
    // Row 5: 0 (span 2), ., = (if tall)
    
    // Let's try a standard simple grid without complex spans first for robustness, 
    // or use specific styles for the 0.
    
    const layout = [
      ['C', 'clear'], ['%', 'percent'], ['/', 'operator'], ['*', 'operator'],
      ['7', 'number'], ['8', 'number'], ['9', 'number'], ['-', 'operator'],
      ['4', 'number'], ['5', 'number'], ['6', 'number'], ['+', 'operator'],
      ['1', 'number'], ['2', 'number'], ['3', 'number'], ['=', 'equals'], // = here
      ['0', 'number'], ['.', 'dot'] // 0 needs span 2, = moved?
    ];

    // Let's stick to the user list order roughly but make it nice.
    // C  %  /  *
    // 7  8  9  -
    // 4  5  6  +
    // 1  2  3  =
    // 0  .     
    
    // To fill the grid (4 columns), the last row needs handling.
    // If I make = span 2 rows (at index 15 and 19), that's tricky in simple loop.
    // Let's just make 0 span 2 columns, . is 1, and = is effectively next to it?
    // Actually simpler:
    // C % / *
    // 7 8 9 -
    // 4 5 6 +
    // 1 2 3 =
    // 0   .  (Empty slot?)
    
    // Let's do: 0 spans 2, . is 1, and maybe an "Enter" or just empty? 
    // Or make = span 2 rows (CSS grid-row: span 2).
    
    let html = '';
    
    // Row 1
    html += this.makeBtn('C', 'clear', baseStyle + 'color: #ff5555; border-color: #ff5555;');
    html += this.makeBtn('%', 'percent', baseStyle);
    html += this.makeBtn('/', 'operator', baseStyle);
    html += this.makeBtn('*', 'operator', baseStyle);
    
    // Row 2
    html += this.makeBtn('7', 'number', baseStyle);
    html += this.makeBtn('8', 'number', baseStyle);
    html += this.makeBtn('9', 'number', baseStyle);
    html += this.makeBtn('-', 'operator', baseStyle);
    
    // Row 3
    html += this.makeBtn('4', 'number', baseStyle);
    html += this.makeBtn('5', 'number', baseStyle);
    html += this.makeBtn('6', 'number', baseStyle);
    html += this.makeBtn('+', 'operator', baseStyle);
    
    // Row 4
    html += this.makeBtn('1', 'number', baseStyle);
    html += this.makeBtn('2', 'number', baseStyle);
    html += this.makeBtn('3', 'number', baseStyle);
    // Equals spans 2 rows vertically
    html += this.makeBtn('=', 'equals', baseStyle + `grid-row: span 2; background: ${colors.textDim}; color: #000;`);
    
    // Row 5
    html += this.makeBtn('0', 'number', baseStyle + 'grid-column: span 2;');
    html += this.makeBtn('.', 'dot', baseStyle);
    
    return html;
  },
  
  makeBtn(label, type, style) {
    const dataset = `data-type="${type}" data-val="${label}"`;
    return `<button style="${style}" ${dataset}>${label}</button>`;
  },

  attachEvents() {
    this.handleInput = this.handleInput.bind(this);
    this.handleKeyboard = this.handleKeyboard.bind(this);

    this.container.addEventListener('click', this.handleInput);
    document.addEventListener('keydown', this.handleKeyboard);
  },

  detachEvents() {
    if (this.container) {
      this.container.removeEventListener('click', this.handleInput);
    }
    document.removeEventListener('keydown', this.handleKeyboard);
  },

  handleKeyboard(e) {
    const key = e.key;
    
    if (/[0-9]/.test(key)) this.processInput('number', key);
    if (['+', '-', '*', '/'].includes(key)) this.processInput('operator', key);
    if (key === '.') this.processInput('dot', '.');
    if (key === 'Enter' || key === '=') {
        e.preventDefault(); 
        this.processInput('equals', '=');
    }
    if (key === 'Escape' || key === 'Delete') this.processInput('clear', 'C');
    if (key === 'Backspace') this.processInput('backspace', '<');
    if (key === '%') this.processInput('percent', '%');
  },

  handleInput(e) {
    if (e.target.tagName !== 'BUTTON') return;
    
    // Add visual ripple/press effect
    const btn = e.target;
    const originalTransform = btn.style.transform;
    btn.style.transform = 'scale(0.95)';
    setTimeout(() => {
        if(btn) btn.style.transform = originalTransform || '';
    }, 100);

    const type = btn.dataset.type;
    const val = btn.dataset.val;
    this.processInput(type, val);
  },

  processInput(type, val) {
    const s = this.state;
    
    // Reset if showing easter egg text
    if (this.isShowingMessage()) {
        s.currentValue = '0';
    }

    switch (type) {
      case 'number':
        if (s.waitingForNewInput) {
          s.currentValue = val;
          s.waitingForNewInput = false;
        } else {
          s.currentValue = s.currentValue === '0' ? val : s.currentValue + val;
        }
        break;

      case 'dot':
        if (s.waitingForNewInput) {
          s.currentValue = '0.';
          s.waitingForNewInput = false;
        } else if (!s.currentValue.includes('.')) {
          s.currentValue += '.';
        }
        break;

      case 'operator':
        if (s.operator && !s.waitingForNewInput) {
          this.calculate();
        }
        s.previousValue = s.currentValue;
        s.operator = val;
        s.waitingForNewInput = true;
        break;

      case 'equals':
        if (s.operator && s.previousValue !== null) {
          this.calculate();
          s.operator = null;
          s.previousValue = null;
          s.waitingForNewInput = true;
        }
        break;

      case 'clear':
        s.currentValue = '0';
        s.previousValue = null;
        s.operator = null;
        s.waitingForNewInput = false;
        break;
        
      case 'backspace':
        if (s.currentValue.length > 1) {
            s.currentValue = s.currentValue.slice(0, -1);
        } else {
            s.currentValue = '0';
        }
        break;

      case 'percent':
        s.currentValue = String(parseFloat(s.currentValue) / 100);
        break;
    }
    
    // Check Easter Eggs immediately on state update
    this.checkEasterEggs();
    this.updateDisplay();
  },

  calculate() {
    const s = this.state;
    const prev = parseFloat(s.previousValue);
    const current = parseFloat(s.currentValue);
    
    if (isNaN(prev) || isNaN(current)) return;

    let result = 0;
    let operationStr = `${prev} ${s.operator} ${current}`;

    switch (s.operator) {
      case '+': result = prev + current; break;
      case '-': result = prev - current; break;
      case '*': result = prev * current; break;
      case '/': 
        if (current === 0) {
            result = 'Err';
            break;
        }
        result = prev / current; 
        break;
    }
    
    // Formatting
    if (result !== 'Err') {
        // Handle floating point errors roughly
        result = Math.round(result * 10000000000) / 10000000000;
        s.currentValue = String(result);
        this.addToHistory(`${operationStr} = ${result}`);
    } else {
        s.currentValue = 'Error';
        this.addToHistory(`${operationStr} = Err`);
    }
  },

  addToHistory(entry) {
    this.state.history.unshift(entry);
    if (this.state.history.length > this.maxHistory) {
      this.state.history.pop();
    }
  },

  checkEasterEggs() {
    // Exact string matching for easter eggs
    const val = this.state.currentValue;
    if (this.easterEggs[val]) {
        this.state.currentValue = this.easterEggs[val];
        this.addToHistory(`EASTER EGG UNLOCKED`);
    }
  },
  
  isShowingMessage() {
     // If current value is non-numeric and not a basic error/loading state
     const val = this.state.currentValue;
     return isNaN(parseFloat(val)) && val !== 'Error' && val !== '-'; // 'Error' is handled, '-' is partial input
  },

  updateDisplay() {
    if (!this.container) return;
    
    const displayEl = this.container.querySelector('.calc-current');
    const historyEl = this.container.querySelector('.calc-history');
    
    if (displayEl) {
        displayEl.textContent = this.state.currentValue;
        // Adjust font size for length? 
        if (this.state.currentValue.length > 10) {
            displayEl.style.fontSize = '1.5rem';
        } else {
            displayEl.style.fontSize = '2.5rem';
        }
    }
    
    if (historyEl) {
        historyEl.innerHTML = this.state.history
            .map(item => `<li>${item}</li>`)
            .join('');
    }
  }
};

export default CalculatorApp;
