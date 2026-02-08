
const StocksApp = {
    state: {
        stocks: [
            { symbol: 'LBSTR', name: 'Lobster Corp', price: 150.00, volatility: 0.02, history: [] },
            { symbol: 'CLAW', name: 'ClawOS Inc', price: 320.50, volatility: 0.03, history: [] },
            { symbol: 'BYTE', name: 'ByteMe Technologies', price: 45.20, volatility: 0.05, history: [] },
            { symbol: 'NULL', name: '/dev/null Holdings', price: 12.00, volatility: 0.08, history: [] },
            { symbol: 'YOLO', name: 'YOLO Capital', price: 420.69, volatility: 0.15, history: [] },
            { symbol: 'SUDO', name: 'Root Access Ltd', price: 1024.00, volatility: 0.01, history: [] },
            { symbol: 'GIT', name: 'Version Control Ventures', price: 88.88, volatility: 0.04, history: [] },
            { symbol: 'PING', name: 'Ping Pong Networks', price: 256.00, volatility: 0.02, history: [] }
        ],
        cash: 10000.00,
        holdings: {},
        selectedStockIndex: 0, // Index of currently viewed stock
        lastTick: 0,
        running: false,
        chartDataLimit: 100
    },
    audioCtx: null,
    container: null,
    rafId: null,


    init(container) {
        this.container = container;
        this.state.running = true;
        this.state.holdings = {}; // Reset holdings
        this.state.stocks.forEach(s => {
            // Fill initial history
            s.history = new Array(this.state.chartDataLimit).fill(s.price);
            this.state.holdings[s.symbol] = 0;
        });
        
        // Initialize Audio Context (must be resumed on interaction usually, but we'll init it)
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioCtx = new AudioContext();
        } catch (e) {
            console.warn('Web Audio API not supported');
        }

        this.createDOM();
        this.updateUI(); // Initial render of content
        this.startLoop();
    },

    destroy() {
        this.state.running = false;
        if (this.rafId) cancelAnimationFrame(this.rafId);
        if (this.audioCtx) this.audioCtx.close();
        if (this.container) this.container.innerHTML = '';
    },

    createDOM() {
        // Styles
        const style = document.createElement('style');
        style.textContent = `
            .stock-app {
                font-family: 'VT323', 'Courier New', monospace;
                background-color: #050505;
                color: #33ff33;
                width: 100%;
                height: 100%;
                display: flex;
                flex-direction: column;
                overflow: hidden;
                border: 2px solid #33ff33;
                box-shadow: 0 0 20px rgba(51, 255, 51, 0.2);
                position: relative;
            }
            .stock-app * {
                box-sizing: border-box;
            }
            .stock-app::before {
                content: " ";
                display: block;
                position: absolute;
                top: 0; left: 0; bottom: 0; right: 0;
                background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06));
                background-size: 100% 2px, 3px 100%;
                pointer-events: none;
                z-index: 10;
            }
            .ticker-bar {
                background: #001100;
                border-bottom: 1px solid #33ff33;
                padding: 5px;
                white-space: nowrap;
                overflow: hidden;
                font-size: 1.2rem;
            }
            .ticker-content {
                display: inline-block;
                animation: ticker 20s linear infinite;
            }
            @keyframes ticker {
                0% { transform: translateX(100%); }
                100% { transform: translateX(-100%); }
            }
            .main-area {
                display: flex;
                flex: 1;
                min-height: 0;
            }
            .chart-section {
                flex: 2;
                border-right: 1px solid #33ff33;
                display: flex;
                flex-direction: column;
                padding: 10px;
            }
            .controls-section {
                flex: 1;
                display: flex;
                flex-direction: column;
                padding: 10px;
                background: #000800;
                overflow-y: auto;
            }
            canvas {
                width: 100%;
                height: 100%;
                border: 1px solid #115511;
                background: #000;
            }
            .btn {
                background: #000;
                color: #33ff33;
                border: 1px solid #33ff33;
                padding: 8px;
                margin: 5px 0;
                cursor: pointer;
                font-family: inherit;
                font-size: 1rem;
                text-transform: uppercase;
                transition: all 0.1s;
            }
            .btn:hover {
                background: #33ff33;
                color: #000;
            }
            .btn:active {
                transform: translateY(2px);
            }
            .price-up { color: #33ff33; }
            .price-down { color: #ff3333; }
            
            .stock-list-item {
                cursor: pointer;
                padding: 5px;
                border-bottom: 1px dashed #115511;
            }
            .stock-list-item:hover, .stock-list-item.active {
                background: #002200;
            }
            .stock-list-item.active {
                background: #003300;
                border-left: 4px solid #33ff33;
            }
            .portfolio-summary {
                border-bottom: 2px solid #33ff33;
                margin-bottom: 10px;
                padding-bottom: 10px;
            }
            h2, h3 { margin: 0 0 10px 0; font-weight: normal; text-transform: uppercase; border-bottom: 1px solid #33ff33; display: inline-block; }
        `;

        const appDiv = document.createElement('div');
        appDiv.className = 'stock-app';
        
        // Ticker
        const tickerBar = document.createElement('div');
        tickerBar.className = 'ticker-bar';
        this.tickerContent = document.createElement('div');
        this.tickerContent.className = 'ticker-content';
        tickerBar.appendChild(this.tickerContent);

        // Main Area
        const mainArea = document.createElement('div');
        mainArea.className = 'main-area';

        // Chart Section
        const chartSection = document.createElement('div');
        chartSection.className = 'chart-section';
        this.chartHeader = document.createElement('div');
        this.chartCanvas = document.createElement('canvas');
        chartSection.appendChild(this.chartHeader);
        chartSection.appendChild(this.chartCanvas);

        // Controls/Portfolio Section
        const controlsSection = document.createElement('div');
        controlsSection.className = 'controls-section';
        
        this.portfolioDiv = document.createElement('div');
        this.portfolioDiv.className = 'portfolio-summary';
        
        this.actionsDiv = document.createElement('div');
        
        const stockListHeader = document.createElement('h3');
        stockListHeader.textContent = "MARKET";
        this.stockListDiv = document.createElement('div');

        controlsSection.appendChild(this.portfolioDiv);
        controlsSection.appendChild(this.actionsDiv);
        controlsSection.appendChild(stockListHeader);
        controlsSection.appendChild(this.stockListDiv);

        mainArea.appendChild(chartSection);
        mainArea.appendChild(controlsSection);

        appDiv.appendChild(style);
        appDiv.appendChild(tickerBar);
        appDiv.appendChild(mainArea);

        this.container.appendChild(appDiv);
        
        // Resize canvas
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    },

    destroy() {
        this.state.running = false;
        if (this.rafId) cancelAnimationFrame(this.rafId);
        if (this.audioCtx) this.audioCtx.close();
        if (this.container) this.container.innerHTML = '';
    },

    renderDOM() {
        // Styles
        const style = document.createElement('style');
        style.textContent = `
            .stock-app {
                font-family: 'VT323', 'Courier New', monospace;
                background-color: #050505;
                color: #33ff33;
                width: 100%;
                height: 100%;
                display: flex;
                flex-direction: column;
                overflow: hidden;
                border: 2px solid #33ff33;
                box-shadow: 0 0 20px rgba(51, 255, 51, 0.2);
                position: relative;
            }
            .stock-app * {
                box-sizing: border-box;
            }
            .stock-app::before {
                content: " ";
                display: block;
                position: absolute;
                top: 0; left: 0; bottom: 0; right: 0;
                background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06));
                background-size: 100% 2px, 3px 100%;
                pointer-events: none;
                z-index: 10;
            }
            .ticker-bar {
                background: #001100;
                border-bottom: 1px solid #33ff33;
                padding: 5px;
                white-space: nowrap;
                overflow: hidden;
                font-size: 1.2rem;
            }
            .ticker-content {
                display: inline-block;
                animation: ticker 20s linear infinite;
            }
            @keyframes ticker {
                0% { transform: translateX(100%); }
                100% { transform: translateX(-100%); }
            }
            .main-area {
                display: flex;
                flex: 1;
                min-height: 0;
            }
            .chart-section {
                flex: 2;
                border-right: 1px solid #33ff33;
                display: flex;
                flex-direction: column;
                padding: 10px;
            }
            .controls-section {
                flex: 1;
                display: flex;
                flex-direction: column;
                padding: 10px;
                background: #000800;
                overflow-y: auto;
            }
            canvas {
                width: 100%;
                height: 100%;
                border: 1px solid #115511;
                background: #000;
            }
            .btn {
                background: #000;
                color: #33ff33;
                border: 1px solid #33ff33;
                padding: 8px;
                margin: 5px 0;
                cursor: pointer;
                font-family: inherit;
                font-size: 1rem;
                text-transform: uppercase;
                transition: all 0.1s;
            }
            .btn:hover {
                background: #33ff33;
                color: #000;
            }
            .btn:active {
                transform: translateY(2px);
            }
            .price-up { color: #33ff33; }
            .price-down { color: #ff3333; }
            
            .stock-list-item {
                cursor: pointer;
                padding: 5px;
                border-bottom: 1px dashed #115511;
            }
            .stock-list-item:hover, .stock-list-item.active {
                background: #002200;
            }
            .portfolio-summary {
                border-bottom: 2px solid #33ff33;
                margin-bottom: 10px;
                padding-bottom: 10px;
            }
            h2, h3 { margin: 0 0 10px 0; font-weight: normal; text-transform: uppercase; border-bottom: 1px solid #33ff33; display: inline-block; }
        `;

        const appDiv = document.createElement('div');
        appDiv.className = 'stock-app';
        
        // Ticker
        const tickerBar = document.createElement('div');
        tickerBar.className = 'ticker-bar';
        this.tickerContent = document.createElement('div');
        this.tickerContent.className = 'ticker-content';
        tickerBar.appendChild(this.tickerContent);

        // Main Area
        const mainArea = document.createElement('div');
        mainArea.className = 'main-area';

        // Chart Section
        const chartSection = document.createElement('div');
        chartSection.className = 'chart-section';
        this.chartHeader = document.createElement('div');
        this.chartCanvas = document.createElement('canvas');
        chartSection.appendChild(this.chartHeader);
        chartSection.appendChild(this.chartCanvas);

        // Controls/Portfolio Section
        const controlsSection = document.createElement('div');
        controlsSection.className = 'controls-section';
        
        this.portfolioDiv = document.createElement('div');
        this.portfolioDiv.className = 'portfolio-summary';
        
        this.actionsDiv = document.createElement('div');
        
        const stockListHeader = document.createElement('h3');
        stockListHeader.textContent = "MARKET";
        this.stockListDiv = document.createElement('div');

        controlsSection.appendChild(this.portfolioDiv);
        controlsSection.appendChild(this.actionsDiv);
        controlsSection.appendChild(stockListHeader);
        controlsSection.appendChild(this.stockListDiv);

        mainArea.appendChild(chartSection);
        mainArea.appendChild(controlsSection);

        appDiv.appendChild(style);
        appDiv.appendChild(tickerBar);
        appDiv.appendChild(mainArea);

        this.container.appendChild(appDiv);
        
        // Resize canvas
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    },

    resizeCanvas() {
        if (!this.chartCanvas) return;
        const rect = this.chartCanvas.parentElement.getBoundingClientRect();
        this.chartCanvas.width = rect.width - 20; // subtract padding
        this.chartCanvas.height = rect.height - 40; // subtract header
    },

    playSound(type) {
        if (!this.audioCtx) return;
        if (this.audioCtx.state === 'suspended') this.audioCtx.resume();

        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        const now = this.audioCtx.currentTime;

        if (type === 'buy') {
            // Cha-ching: Arpeggio up
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, now);
            osc.frequency.setValueAtTime(1200, now + 0.1);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
            osc.start(now);
            osc.stop(now + 0.3);
        } else if (type === 'sell-loss') {
            // Sad Trombone: Descending saw
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(300, now);
            osc.frequency.linearRampToValueAtTime(150, now + 1.0);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 1.0);
            osc.start(now);
            osc.stop(now + 1.0);
        } else if (type === 'sell-gain') {
             // Coin sound
            osc.type = 'square';
            osc.frequency.setValueAtTime(900, now);
            osc.frequency.setValueAtTime(1800, now + 0.05);
            gain.gain.setValueAtTime(0.05, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            osc.start(now);
            osc.stop(now + 0.1);
        }
    },

    buyStock(index) {
        const stock = this.state.stocks[index];
        if (this.state.cash >= stock.price) {
            this.state.cash -= stock.price;
            this.state.holdings[stock.symbol]++;
            this.playSound('buy');
        }
    },

    sellStock(index) {
        const stock = this.state.stocks[index];
        if (this.state.holdings[stock.symbol] > 0) {
            // Check if selling at loss/gain? For simplicity, just check relative to... well, we don't track buy price per share easily without complex logic.
            // Let's just make a sound based on if price is down today or up today
            const isDown = stock.price < stock.history[stock.history.length - 2]; 
            this.state.cash += stock.price;
            this.state.holdings[stock.symbol]--;
            this.playSound(isDown ? 'sell-loss' : 'sell-gain');
        }
    },

    updatePrices() {
        this.state.stocks.forEach(stock => {
            const change = (Math.random() - 0.5) * stock.volatility * stock.price * 0.1;
            stock.price += change;
            if (stock.price < 0.01) stock.price = 0.01; // No bankruptcies today
            stock.history.push(stock.price);
            if (stock.history.length > this.state.chartDataLimit) {
                stock.history.shift();
            }
        });
    },

    drawChart() {
        const ctx = this.chartCanvas.getContext('2d');
        const w = this.chartCanvas.width;
        const h = this.chartCanvas.height;
        const stock = this.state.stocks[this.state.selectedStockIndex];
        
        // Clear
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, w, h);

        // Grid
        ctx.strokeStyle = '#003300';
        ctx.beginPath();
        for (let i = 0; i < w; i += 40) { ctx.moveTo(i, 0); ctx.lineTo(i, h); }
        for (let i = 0; i < h; i += 40) { ctx.moveTo(0, i); ctx.lineTo(w, i); }
        ctx.stroke();

        // Data
        const minPrice = Math.min(...stock.history) * 0.95;
        const maxPrice = Math.max(...stock.history) * 1.05;
        const range = maxPrice - minPrice;

        ctx.strokeStyle = '#33ff33';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        stock.history.forEach((price, i) => {
            const x = (i / (this.state.chartDataLimit - 1)) * w;
            const y = h - ((price - minPrice) / range) * h;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // Labels
        ctx.fillStyle = '#33ff33';
        ctx.font = '12px monospace';
        ctx.fillText(maxPrice.toFixed(2), 5, 15);
        ctx.fillText(minPrice.toFixed(2), 5, h - 5);
        ctx.fillText(stock.symbol + " LIVE", w - 80, 15);
    },

    updateUI() {
        // Update Ticker
        const tickerText = this.state.stocks.map(s => {
            const last = s.history[s.history.length - 2] || s.price;
            const diff = s.price - last;
            const symbol = diff >= 0 ? '▲' : '▼';
            return `${s.symbol}: ${s.price.toFixed(2)} (${symbol} ${Math.abs(diff).toFixed(2)})`;
        }).join('   +++   ');
        
        // Only update text content if it changed significantly to avoid jitter, 
        // but here we just replace it. Animation handles scrolling.
        if (this.tickerContent.textContent !== tickerText) {
             // For smooth scrolling text, usually we duplicate content. 
             // To keep it simple, just update text. 
             this.tickerContent.textContent = tickerText + '   +++   ' + tickerText; 
        }

        // Update Chart Header
        const selStock = this.state.stocks[this.state.selectedStockIndex];
        this.chartHeader.innerHTML = `
            <h2>${selStock.name} (${selStock.symbol})</h2>
            <div style="font-size: 2rem">\$${selStock.price.toFixed(2)}</div>
        `;

        // Update Portfolio
        const holdingsVal = this.state.stocks.reduce((acc, s) => {
            return acc + (s.price * (this.state.holdings[s.symbol] || 0));
        }, 0);
        const totalVal = this.state.cash + holdingsVal;
        const diff = totalVal - 10000;
        const diffClass = diff >= 0 ? 'price-up' : 'price-down';

        this.portfolioDiv.innerHTML = `
            <h3>PORTFOLIO</h3>
            <div>CASH: <span class="price-up">\$${this.state.cash.toFixed(2)}</span></div>
            <div>HOLDINGS: \$${holdingsVal.toFixed(2)}</div>
            <div style="border-top: 1px solid #33ff33; margin-top: 5px; padding-top: 5px;">
                TOTAL: <span class="${diffClass}">\$${totalVal.toFixed(2)}</span>
            </div>
            <div>P/L: <span class="${diffClass}">${diff >= 0 ? '+' : ''}${diff.toFixed(2)}</span></div>
        `;

        // Update Actions
        const canBuy = this.state.cash >= selStock.price;
        const canSell = this.state.holdings[selStock.symbol] > 0;
        
        this.actionsDiv.innerHTML = '';
        const buyBtn = document.createElement('button');
        buyBtn.className = 'btn';
        buyBtn.style.width = '100%';
        buyBtn.textContent = `BUY ${selStock.symbol} (\$${selStock.price.toFixed(2)})`;
        buyBtn.disabled = !canBuy;
        if (!canBuy) buyBtn.style.opacity = '0.5';
        buyBtn.onclick = () => this.buyStock(this.state.selectedStockIndex);

        const sellBtn = document.createElement('button');
        sellBtn.className = 'btn';
        sellBtn.style.width = '100%';
        sellBtn.textContent = `SELL ${selStock.symbol} (Own: ${this.state.holdings[selStock.symbol]})`;
        sellBtn.disabled = !canSell;
        if (!canSell) sellBtn.style.opacity = '0.5';
        sellBtn.onclick = () => this.sellStock(this.state.selectedStockIndex);

        this.actionsDiv.appendChild(buyBtn);
        this.actionsDiv.appendChild(sellBtn);

        // Update Stock List
        this.stockListDiv.innerHTML = '';
        this.state.stocks.forEach((s, idx) => {
            const item = document.createElement('div');
            item.className = `stock-list-item ${idx === this.state.selectedStockIndex ? 'active' : ''}`;
            const last = s.history[s.history.length - 2] || s.price;
            const change = s.price - last;
            const changeClass = change >= 0 ? 'price-up' : 'price-down';
            
            item.innerHTML = `
                <div style="display:flex; justify-content:space-between;">
                    <span>${s.symbol}</span>
                    <span>${s.price.toFixed(2)}</span>
                </div>
                <div style="font-size: 0.8em; text-align: right;" class="${changeClass}">
                    ${change >= 0 ? '+' : ''}${change.toFixed(2)}
                </div>
            `;
            item.onclick = () => {
                this.state.selectedStockIndex = idx;
                this.updateUI(); // Re-render to update selection highlights
            };
            this.stockListDiv.appendChild(item);
        });

        this.drawChart();
    },

    startLoop() {
        let lastTime = 0;
        const loop = (timestamp) => {
            if (!this.state.running) return;

            // Throttle price updates to make it readable/retro, e.g., every 500ms
            if (timestamp - lastTime > 1000) {
                this.updatePrices();
                this.updateUI();
                lastTime = timestamp;
            } else {
                // Animation frame for smoother chart or UI if needed? 
                // For now, just tie UI update to price tick to save battery/cpu on a "fake" app
            }
            
            this.rafId = requestAnimationFrame(loop);
        };
        this.rafId = requestAnimationFrame(loop);
    }
};

export default StocksApp;
