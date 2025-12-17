"use strict";

var obsidian = require("obsidian");

const DEFAULT_SETTINGS = {
  showLabels: true,
  showTitle: true,
  expiredBehavior: "countup",
  dateFormat: "YYYY-MM-DD"
};

class CountdownTimerPlugin extends obsidian.Plugin {
  async onload() {
    console.log("Countdown Timer plugin loaded!");
    
    await this.loadSettings();
    this.addSettingTab(new CountdownSettingTab(this.app, this));
    
    this.registerMarkdownCodeBlockProcessor("countdown", (source, el, ctx) => {
      const lines = source.trim().split("\n");
      let title = "Countdown";
      let dateStr = "2026-01-21";
      let time = "00:00:00";

      for (const line of lines) {
        const [key, ...valueParts] = line.split(":");
        const value = valueParts.join(":").trim();

        if (key.trim().toLowerCase() === "title") {
          title = value;
        } else if (key.trim().toLowerCase() === "date") {
          dateStr = value;
        } else if (key.trim().toLowerCase() === "time") {
          time = value;
        }
      }

      const date = this.parseDate(dateStr);
      this.renderCountdown(el, title, date, time);
    });
  }

  parseDate(dateStr) {
    const format = this.settings.dateFormat;
    let year, month, day;

    if (format === "MM/DD/YYYY") {
      const parts = dateStr.split("/");
      if (parts.length === 3) {
        month = parts[0].padStart(2, "0");
        day = parts[1].padStart(2, "0");
        year = parts[2];
      }
    } else if (format === "DD/MM/YYYY") {
      const parts = dateStr.split("/");
      if (parts.length === 3) {
        day = parts[0].padStart(2, "0");
        month = parts[1].padStart(2, "0");
        year = parts[2];
      }
    } else {
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        year = parts[0];
        month = parts[1].padStart(2, "0");
        day = parts[2].padStart(2, "0");
      }
    }

    if (year && month && day) {
      return `${year}-${month}-${day}`;
    }
    return dateStr;
  }

  renderCountdown(el, title, date, time) {
    const container = document.createElement("div");
    container.className = "countdown-local";
    container.style.cssText = `
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      text-align: center;
      padding: 8px 12px;
      background: var(--background-secondary);
      border-radius: 6px;
      min-width: 140px;
      display: inline-block;
      margin: 0 10px 10px 0;
      vertical-align: top;
    `;

    if (this.settings.showTitle) {
      const titleEl = document.createElement("div");
      titleEl.className = "countdown-title";
      titleEl.textContent = title;
      titleEl.style.cssText = `
        font-weight: 600;
        font-size: 12px;
        margin-bottom: 4px;
        color: var(--text-normal);
      `;
      container.appendChild(titleEl);
    }

    const timerEl = document.createElement("div");
    timerEl.className = "countdown-timer";
    timerEl.style.cssText = `
      font-size: 16px;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      color: var(--text-normal);
    `;
    container.appendChild(timerEl);

    const labelsEl = document.createElement("div");
    labelsEl.className = "countdown-labels";
    labelsEl.style.cssText = `
      font-size: 9px;
      color: var(--text-muted);
      margin-top: 2px;
    `;
    container.appendChild(labelsEl);

    el.appendChild(container);

    const targetDate = new Date(`${date}T${time}`);

    const updateCountdown = () => {
      const now = new Date();
      let diff = targetDate - now;
      const isPast = diff <= 0;

      if (isPast) {
        if (this.settings.expiredBehavior === "complete") {
          timerEl.textContent = "Complete!";
          timerEl.style.color = "var(--text-muted)";
          labelsEl.textContent = "";
          labelsEl.style.display = "none";
          return;
        } else {
          diff = now - targetDate;
          timerEl.style.color = "var(--text-muted)";
        }
      } else {
        timerEl.style.color = "var(--text-normal)";
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      timerEl.textContent = `${days.toString().padStart(2, '0')} : ${hours.toString().padStart(2, '0')} : ${minutes.toString().padStart(2, '0')} : ${seconds.toString().padStart(2, '0')}`;

      if (this.settings.showLabels) {
        labelsEl.style.display = "block";
        if (isPast && this.settings.expiredBehavior === "countup") {
          labelsEl.textContent = "Days  Hrs  Mins  Secs  ago";
        } else {
          labelsEl.textContent = "Days  Hrs  Mins  Secs";
        }
      } else {
        labelsEl.style.display = "none";
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    const observer = new MutationObserver((mutations) => {
      if (!document.contains(container)) {
        clearInterval(interval);
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  onunload() {
    console.log("Countdown Timer plugin unloaded");
  }
}

class CountdownSettingTab extends obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "Countdown Timer Settings" });

    new obsidian.Setting(containerEl)
      .setName("Date format")
      .setDesc("Format for entering dates in countdown blocks")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("YYYY-MM-DD", "YYYY-MM-DD (2026-01-21)")
          .addOption("MM/DD/YYYY", "MM/DD/YYYY (01/21/2026)")
          .addOption("DD/MM/YYYY", "DD/MM/YYYY (21/01/2026)")
          .setValue(this.plugin.settings.dateFormat)
          .onChange(async (value) => {
            this.plugin.settings.dateFormat = value;
            await this.plugin.saveSettings();
          })
      );

    new obsidian.Setting(containerEl)
      .setName("Show title")
      .setDesc("Display the title above the countdown timer")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.showTitle)
          .onChange(async (value) => {
            this.plugin.settings.showTitle = value;
            await this.plugin.saveSettings();
          })
      );

    new obsidian.Setting(containerEl)
      .setName("Show labels")
      .setDesc("Display 'Days Hrs Mins Secs' below the countdown")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.showLabels)
          .onChange(async (value) => {
            this.plugin.settings.showLabels = value;
            await this.plugin.saveSettings();
          })
      );

    new obsidian.Setting(containerEl)
      .setName("When countdown expires")
      .setDesc("What to show when the target date has passed")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("countup", "Count up (time since event)")
          .addOption("complete", "Show 'Complete!'")
          .setValue(this.plugin.settings.expiredBehavior)
          .onChange(async (value) => {
            this.plugin.settings.expiredBehavior = value;
            await this.plugin.saveSettings();
          })
      );
  }
}

module.exports = CountdownTimerPlugin;
