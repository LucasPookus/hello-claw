
const WeatherApp = {
  container: null,
  intervalId: null,
  styleElement: null,
  
  state: {
    location: '',
    temp: 0,
    condition: '',
    forecast: [],
    frame: 0
  },

  constants: {
    locations: [
      'The Internet', 'Localhost', '/dev/null', 'Cloud 9', 'Port 443', 
      '127.0.0.1', 'The Matrix', 'Stack Overflow', 'Mainframe', 'Cyber Space'
    ],
    conditions: [
      { name: 'Scattered Packets', type: 'rain' },
      { name: 'Heavy Bandwidth', type: 'storm' },
      { name: 'Partly Encrypted', type: 'cloudy' },
      { name: 'SQL Storms', type: 'storm' },
      { name: '404 Not Found', type: 'fog' },
      { name: 'Sunny with a chance of Glitch', type: 'sun' },
      { name: 'Binary Blizzard', type: 'snow' },
      { name: 'Data Leak', type: 'rain' },
      { name: 'Firewall Heat', type: 'sun' }
    ]
  },

  init(container) {
    this.container = container;
    this.injectStyles();
    this.generateNewLocation();
    this.render();
    this.startSimulation();
  },

  destroy() {
    if (this.intervalId) clearInterval(this.intervalId);
    if (this.styleElement) this.styleElement.remove();
    if (this.container) this.container.innerHTML = '';
    this.container = null;
  },

  injectStyles() {
    const css = \`
      .weather-app-container {
        font-family: 'VT323', monospace;
        background-color: #000;
        color: #0f0;
        height: 100%;
        display: flex;
        flex-direction: column;
        padding: 20px;
        box-sizing: border-box;
        overflow: hidden;
        position: relative;
        text-shadow: 0 0 5px #0f0;
      }

      .weather-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 2px solid #0f0;
        padding-bottom: 10px;
        margin-bottom: 20px;
      }

      .location-title {
        font-size: 24px;
        text-transform: uppercase;
      }

      .btn-scan {
        background: #000;
        color: #0f0;
        border: 2px solid #0f0;
        padding: 5px 10px;
        cursor: pointer;
        font-family: inherit;
        font-size: 16px;
        text-transform: uppercase;
        transition: all 0.2s;
      }

      .btn-scan:hover {
        background: #0f0;
        color: #000;
      }

      .main-display {
        flex: 1;
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-around;
      }

      .ascii-art {
        font-size: 12px;
        white-space: pre;
        line-height: 1.2;
        min-width: 200px;
        min-height: 150px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .weather-info {
        text-align: right;
      }

      .temp-display {
        font-size: 64px;
        font-weight: bold;
      }

      .condition-text {
        font-size: 24px;
        margin-top: 10px;
      }

      .forecast-strip {
        display: flex;
        justify-content: space-between;
        border-top: 2px solid #0f0;
        padding-top: 15px;
        margin-top: auto;
      }

      .forecast-day {
        text-align: center;
        flex: 1;
        border-right: 1px dashed #004400;
      }

      .forecast-day:last-child {
        border-right: none;
      }

      .forecast-day .day-name {
        font-weight: bold;
        margin-bottom: 5px;
      }

      /* Animations */
      @keyframes blink {
        0% { opacity: 1; }
        50% { opacity: 0; }
        100% { opacity: 1; }
      }
      
      .cursor {
        animation: blink 1s infinite;
      }

      @keyframes flicker {
        0% { opacity: 0.9; }
        5% { opacity: 0.8; }
        10% { opacity: 0.95; }
        15% { opacity: 0.6; }
        20% { opacity: 0.9; }
        50% { opacity: 0.95; }
        80% { opacity: 0.8; }
        90% { opacity: 0.9; }
        100% { opacity: 0.9; }
      }

      .crt-flicker {
        animation: flicker 4s infinite;
        pointer-events: none;
        position: absolute;
        top: 0; left: 0; right: 0; bottom: 0;
        background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06));
        background-size: 100% 2px, 3px 100%;
        z-index: 10;
      }
    \`;
    
    this.styleElement = document.createElement('style');
    this.styleElement.textContent = css;
    document.head.appendChild(this.styleElement);
  },

  getRandomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  },

  generateNewLocation() {
    const loc = this.getRandomItem(this.constants.locations);
    const cond = this.getRandomItem(this.constants.conditions);
    // Tech-themed temps: 404, 503, 200, 8080, 255
    let baseTemp = Math.floor(Math.random() * 100); 
    if (Math.random() > 0.8) baseTemp = [404, 500, 200, 255][Math.floor(Math.random() * 4)];
    
    this.state = {
      location: loc,
      temp: baseTemp,
      targetTemp: baseTemp,
      condition: cond,
      forecast: this.generateForecast(),
      frame: 0
    };
  },

  generateForecast() {
    const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
    const forecast = [];
    const today = new Date().getDay(); // 0-6
    
    for (let i = 1; i <= 5; i++) {
      const dayIndex = (today + i) % 7;
      const cond = this.getRandomItem(this.constants.conditions);
      const temp = Math.floor(Math.random() * 99);
      forecast.push({
        day: days[dayIndex === 0 ? 6 : dayIndex - 1],
        temp: temp,
        icon: this.getMiniIcon(cond.type)
      });
    }
    return forecast;
  },

  getAsciiArt(type, frame) {
    // Simple 2-frame animations for ASCII art
    const f = frame % 2;
    
    if (type === 'sun') {
      if (f === 0) {
        return \`
      \\   |   /
       \\  |  /
    -- ( o ) --
       /  |  \\
      /   |   \\
        \`;
      } else {
        return \`
       \\  |  /
        \\ | /
    --- ( O ) ---
        / | \\
       /  |  \\
        \`;
      }
    } else if (type === 'rain') {
      if (f === 0) {
        return \`
      .-~~-.
     /      \\
    (        )
     \\-.__.-/
      '  '  '
      '  '  '
        \`;
      } else {
        return \`
      .-~~-.
     /      \\
    (        )
     \\-.__.-/
      '  '  '
        '  '  '
        \`;
      }
    } else if (type === 'snow') {
      if (f === 0) {
        return \`
      .-~~-.
     /      \\
    (        )
     \\-.__.-/
      *  .  *
      .  *  .
        \`;
      } else {
        return \`
      .-~~-.
     /      \\
    (        )
     \\-.__.-/
      .  *  .
      *  .  *
        \`;
      }
    } else if (type === 'storm') {
       if (f === 0) {
        return \`
      .-~~-.
     /      \\
    (        )
     \\-.__.-/
      /  /  /
       /  /
        \`;
      } else {
        return \`
      .-~~-.
     /      \\
    (        )
     \\-.__.-/
         ⚡
       /  /
        \`;
      }   
    } else if (type === 'fog') {
      return \`
    
    ( ( ( ( ) ) ) )
     ( ( ( ( ) ) )
    ( ( ( ( ) ) ) )
      \`;
    }
    
    // Cloud default
    return \`
       .--.
    .-(    ).
   (___.__)__)
    \`;
  },

  getMiniIcon(type) {
    if (type === 'sun') return '☀';
    if (type === 'rain') return '☂';
    if (type === 'snow') return '❄';
    if (type === 'storm') return '⚡';
    if (type === 'cloudy') return '☁';
    if (type === 'fog') return '≡';
    return '?';
  },

  startSimulation() {
    this.intervalId = setInterval(() => {
      // Fluctuate temp
      if (Math.random() > 0.7) {
        const change = Math.floor(Math.random() * 3) - 1; // -1, 0, 1
        this.state.temp += change;
      }

      // Update frame for animation
      this.state.frame++;
      
      this.updateDOM();
    }, 1000); // Update every second
  },

  updateDOM() {
    const artContainer = this.container.querySelector('.ascii-art');
    const tempEl = this.container.querySelector('.temp-display');
    
    if (artContainer) {
      artContainer.textContent = this.getAsciiArt(this.state.condition.type, this.state.frame);
    }
    
    if (tempEl) {
      tempEl.textContent = \`\${this.state.temp}°F\`;
    }
  },

  render() {
    if (!this.container) return;
    
    const { location, temp, condition, forecast } = this.state;
    
    this.container.innerHTML = \`
      <div class="weather-app-container">
        <div class="crt-flicker"></div>
        
        <header class="weather-header">
          <div class="location-title">
            LOCATION: \${location}<span class="cursor">_</span>
          </div>
          <button class="btn-scan" id="weather-scan-btn">SCAN NETWORK</button>
        </header>

        <div class="main-display">
          <div class="ascii-art">
            \${this.getAsciiArt(condition.type, 0)}
          </div>
          
          <div class="weather-info">
            <div class="temp-display">\${temp}°F</div>
            <div class="condition-text">\${condition.name}</div>
            <div style="font-size: 14px; margin-top: 5px; opacity: 0.7;">
              HUMIDITY: \${Math.floor(Math.random() * 100)}%<br>
              PING: \${Math.floor(Math.random() * 200)}ms
            </div>
          </div>
        </div>

        <div class="forecast-strip">
          \${forecast.map(day => \`
            <div class="forecast-day">
              <div class="day-name">\${day.day}</div>
              <div class="day-icon" style="font-size: 20px;">\${day.icon}</div>
              <div class="day-temp">\${day.temp}°</div>
            </div>
          \`).join('')}
        </div>
      </div>
    \`;

    // Bind event
    const btn = this.container.querySelector('#weather-scan-btn');
    if (btn) {
      btn.addEventListener('click', () => {
        this.container.querySelector('.location-title').innerHTML = 'SCANNING...';
        setTimeout(() => {
            this.generateNewLocation();
            this.render();
        }, 500);
      });
    }
  }
};

export default WeatherApp;
