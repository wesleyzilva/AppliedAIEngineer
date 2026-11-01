class Logger {
  constructor() {
    this.lines = [];
    this.maxLines = 120;
  }

  log(threadTag, message, data = null) {
    const now = new Date();
    const time = now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0');
    const formatted = `[${time}] [${threadTag}] ${message}`;

    if (threadTag.includes('AQUECIMENTO')) {
      console.log(`%c${formatted}`, 'color: #f97316; font-weight: bold; background: #1e1b4b; padding: 2px 4px;');
    } else if (threadTag.includes('PRE-PROC')) {
      console.log(`%c${formatted}`, 'color: #facc15; font-weight: bold;');
    } else if (threadTag.includes('MEMORIA')) {
      console.log(`%c${formatted}`, 'color: #a855f7; font-weight: bold;');
    } else if (threadTag.includes('VALIDACAO')) {
      console.log(`%c${formatted}`, 'color: #00ffcc; font-weight: bold; background: #0f172a; padding: 2px 4px;');
    } else if (threadTag.includes('YOLO')) {
      console.log(`%c${formatted}`, 'color: #38bdf8; font-weight: bold;');
    } else if (threadTag.includes('COMBATE')) {
      console.log(`%c${formatted}`, 'color: #f87171; font-weight: bold;');
    } else {
      console.log(`%c${formatted}`, 'color: #4ade80;');
    }

    if (data) {
      console.dir(data);
    }

    this.lines.push(formatted);
    if (this.lines.length > this.maxLines) {
      this.lines.shift();
    }

    const el = document.getElementById('console-log');
    if (el) {
      el.textContent = this.lines.join('\n');
      el.scrollTop = el.scrollHeight;
    }
  }

  setStep(stepIndex) {
    for (let i = 1; i <= 5; i++) {
      const badge = document.getElementById(`st-${i}`);
      if (badge) {
        badge.classList.toggle('active', i === stepIndex);
      }
    }
  }
}

export const logger = new Logger();
