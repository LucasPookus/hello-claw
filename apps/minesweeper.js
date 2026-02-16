
const MinesweeperApp = {
  init(container) {
    this.container = container;
    this.rows = 16;
    this.cols = 16;
    this.totalMines = 40;
    this.grid = [];
    this.gameState = 'playing'; // 'playing', 'won', 'lost'
    this.flagsPlaced = 0;
    this.timeElapsed = 0;
    this.timerInterval = null;
    this.isFirstClick = true;

    // Bind methods to ensure 'this' context is correct
    this.handleCellClick = this.handleCellClick.bind(this);
    this.handleRightClick = this.handleRightClick.bind(this);
    this.restart = this.restart.bind(this);

    this.injectStyles();
    this.renderLayout();
    this.startNewGame();
  },

  destroy() {
    this.stopTimer();
    if (this.container) {
      this.container.innerHTML = '';
    }
  },

  injectStyles() {
    if (document.getElementById('minesweeper-styles')) return;
    const style = document.createElement('style');
    style.id = 'minesweeper-styles';
    style.textContent = `
      .ms-wrapper {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background-color: #000;
        color: #0f0;
        font-family: 'Courier New', Courier, monospace;
        padding: 20px;
        height: 100%;
        width: 100%;
        box-sizing: border-box;
        user-select: none;
      }
      .ms-header {
        display: flex;
        justify-content: space-between;
        width: 100%;
        max-width: 400px;
        margin-bottom: 15px;
        border: 2px solid #0f0;
        padding: 10px;
        background: #000;
        box-shadow: 0 0 5px #0f0;
      }
      .ms-lcd {
        font-size: 24px;
        color: #0f0;
        font-weight: bold;
        text-shadow: 0 0 2px #0f0;
      }
      .ms-btn {
        background-color: #000;
        color: #0f0;
        border: 2px solid #0f0;
        font-size: 20px;
        cursor: pointer;
        padding: 2px 10px;
        font-family: inherit;
        transition: all 0.1s;
      }
      .ms-btn:hover {
        background-color: #0f0;
        color: #000;
      }
      .ms-grid {
        display: grid;
        grid-template-columns: repeat(16, 25px);
        grid-template-rows: repeat(16, 25px);
        border: 2px solid #0f0;
        background-color: #000;
        gap: 1px;
        box-shadow: 0 0 10px #0f0;
      }
      .ms-cell {
        width: 25px;
        height: 25px;
        background-color: #000;
        border: 1px solid #004400;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        cursor: pointer;
        font-weight: bold;
      }
      .ms-cell:hover {
        border-color: #0f0;
      }
      .ms-cell.revealed {
        background-color: #050505;
        border: 1px solid #001100;
      }
      .ms-cell.mine {
        background-color: #f00;
        color: #000;
      }
      .ms-cell.flag {
        color: #f00;
      }
      /* CRT Text Colors */
      .c1 { color: #00ff00; }
      .c2 { color: #ccff00; }
      .c3 { color: #ffff00; }
      .c4 { color: #ffcc00; }
      .c5 { color: #ff9900; }
      .c6 { color: #ff6600; }
      .c7 { color: #ff3300; }
      .c8 { color: #ff0000; }
    `;
    this.container.appendChild(style);
  },

  renderLayout() {
    this.container.innerHTML = '';
    
    // Wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'ms-wrapper';

    // Header
    const header = document.createElement('div');
    header.className = 'ms-header';

    this.mineCounterEl = document.createElement('div');
    this.mineCounterEl.className = 'ms-lcd';
    this.mineCounterEl.textContent = '040';

    this.restartBtn = document.createElement('button');
    this.restartBtn.className = 'ms-btn';
    this.restartBtn.textContent = ':)';
    this.restartBtn.onclick = this.restart;

    this.timerEl = document.createElement('div');
    this.timerEl.className = 'ms-lcd';
    this.timerEl.textContent = '000';

    header.appendChild(this.mineCounterEl);
    header.appendChild(this.restartBtn);
    header.appendChild(this.timerEl);

    // Grid
    this.gridEl = document.createElement('div');
    this.gridEl.className = 'ms-grid';
    // Disable context menu on grid
    this.gridEl.oncontextmenu = (e) => e.preventDefault();

    wrapper.appendChild(header);
    wrapper.appendChild(this.gridEl);
    this.container.appendChild(wrapper);
  },

  startNewGame() {
    this.stopTimer();
    this.timeElapsed = 0;
    this.flagsPlaced = 0;
    this.gameState = 'playing';
    this.isFirstClick = true;
    this.updateTimerDisplay();
    this.restartBtn.textContent = ':)';
    this.mineCounterEl.textContent = this.totalMines.toString().padStart(3, '0');
    
    // Initialize empty grid data
    this.grid = Array(this.rows).fill().map(() => Array(this.cols).fill().map(() => ({
      isMine: false,
      revealed: false,
      flagged: false,
      neighborCount: 0
    })));

    this.renderGrid();
  },

  placeMines(safeRow, safeCol) {
    let minesPlaced = 0;
    while (minesPlaced < this.totalMines) {
      const r = Math.floor(Math.random() * this.rows);
      const c = Math.floor(Math.random() * this.cols);
      
      // Ensure not already a mine and not the first clicked cell or immediate neighbor
      if (!this.grid[r][c].isMine && (Math.abs(r - safeRow) > 1 || Math.abs(c - safeCol) > 1)) {
        this.grid[r][c].isMine = true;
        minesPlaced++;
      }
    }

    // Calculate neighbors
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (!this.grid[r][c].isMine) {
          let count = 0;
          for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
              if (i === 0 && j === 0) continue;
              const nr = r + i;
              const nc = c + j;
              if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols && this.grid[nr][nc].isMine) {
                count++;
              }
            }
          }
          this.grid[r][c].neighborCount = count;
        }
      }
    }
  },

  renderGrid() {
    this.gridEl.innerHTML = '';
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const cellData = this.grid[r][c];
        const cell = document.createElement('div');
        cell.className = 'ms-cell';
        
        if (cellData.revealed) {
          cell.classList.add('revealed');
          if (cellData.isMine) {
             cell.classList.add('mine');
             cell.textContent = '*';
          } else if (cellData.neighborCount > 0) {
            cell.textContent = cellData.neighborCount;
            cell.classList.add(`c${cellData.neighborCount}`);
          }
        } else if (cellData.flagged) {
          cell.classList.add('flag');
          cell.textContent = '!';
        }

        cell.onmousedown = (e) => {
          if (e.button === 0) this.handleCellClick(r, c);
          if (e.button === 2) this.handleRightClick(r, c);
        };

        this.gridEl.appendChild(cell);
      }
    }
  },

  handleCellClick(r, c) {
    if (this.gameState !== 'playing' || this.grid[r][c].flagged || this.grid[r][c].revealed) return;

    if (this.isFirstClick) {
      this.isFirstClick = false;
      this.placeMines(r, c);
      this.startTimer();
      // Re-calculate neighbors for the clicked cell after placement (technically it's 0 but good to be safe)
      // Actually placeMines handles the whole board calculation.
    }

    const cell = this.grid[r][c];
    
    if (cell.isMine) {
      this.gameOver(false);
    } else {
      this.revealCell(r, c);
      this.checkWin();
      this.renderGrid(); // Full re-render for simplicity
    }
  },

  handleRightClick(r, c) {
    if (this.gameState !== 'playing' || this.grid[r][c].revealed) return;

    const cell = this.grid[r][c];
    cell.flagged = !cell.flagged;
    this.flagsPlaced += cell.flagged ? 1 : -1;
    
    this.updateMineCounter();
    this.renderGrid();
  },

  revealCell(r, c) {
    if (r < 0 || r >= this.rows || c < 0 || c >= this.cols || this.grid[r][c].revealed || this.grid[r][c].flagged) return;

    const cell = this.grid[r][c];
    cell.revealed = true;

    if (cell.neighborCount === 0 && !cell.isMine) {
      for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
          this.revealCell(r + i, c + j);
        }
      }
    }
  },

  checkWin() {
    let unrevealedSafeCells = 0;
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (!this.grid[r][c].isMine && !this.grid[r][c].revealed) {
          unrevealedSafeCells++;
        }
      }
    }

    if (unrevealedSafeCells === 0) {
      this.gameOver(true);
    }
  },

  gameOver(won) {
    this.gameState = won ? 'won' : 'lost';
    this.stopTimer();
    this.restartBtn.textContent = won ? 'B)' : 'X(';
    
    // Reveal all mines
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.grid[r][c].isMine) {
          this.grid[r][c].revealed = true;
        }
      }
    }
    this.renderGrid();
  },

  startTimer() {
    this.stopTimer();
    this.timerInterval = setInterval(() => {
      this.timeElapsed++;
      this.updateTimerDisplay();
    }, 1000);
  },

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  },

  updateTimerDisplay() {
    this.timerEl.textContent = Math.min(999, this.timeElapsed).toString().padStart(3, '0');
  },

  updateMineCounter() {
    const remaining = this.totalMines - this.flagsPlaced;
    this.mineCounterEl.textContent = remaining.toString().padStart(3, '0');
  },

  restart() {
    this.startNewGame();
  }
};

export default MinesweeperApp;
