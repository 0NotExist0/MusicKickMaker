/**
 * KickForge 303 - UI Manager
 * Gestione manopole rotanti intuitive, slider, tab categorie, notifiche toast
 * e Modale Informativo Flottante al passaggio del mouse con timer di 2 secondi
 */

import { CONTROL_TOOLTIPS } from "./tooltips-data.js";

export class UIManager {
  constructor(app) {
    this.app = app;
    this.knobElements = [];
    this.hoverTimer = null;
    this.currentHoverTarget = null;
    this.tooltipEl = null;
    this.lastMouseX = 0;
    this.lastMouseY = 0;

    this.createTooltipElement();
    this.initGlobalTooltipListeners();
  }

  createTooltipElement() {
    let el = document.getElementById("interactive-control-tooltip");
    if (!el) {
      el = document.createElement("div");
      el.id = "interactive-control-tooltip";
      el.className = "interactive-tooltip-modal";
      document.body.appendChild(el);
    }
    this.tooltipEl = el;
  }

  initGlobalTooltipListeners() {
    window.addEventListener("mousemove", (e) => {
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;

      // Se il modale è già aperto e il mouse si sposta lontano, aggiorna posizione o mantienilo stabile
      if (this.tooltipEl.classList.contains("visible")) {
        // Se si sposta significativamente dal target, chiudi
        if (this.currentHoverTarget) {
          const rect = this.currentHoverTarget.getBoundingClientRect();
          const margin = 30;
          if (
            e.clientX < rect.left - margin ||
            e.clientX > rect.right + margin ||
            e.clientY < rect.top - margin ||
            e.clientY > rect.bottom + margin
          ) {
            this.hideTooltip();
          }
        }
      }
    });

    window.addEventListener("mousedown", () => {
      this.hideTooltip();
    });

    window.addEventListener("scroll", () => {
      this.hideTooltip();
    }, true);
  }

  attachTooltipTrigger(element, paramKey) {
    const startHover = (e) => {
      this.clearHoverTimer();
      this.currentHoverTarget = element;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;

      // Timer di 2 secondi (2000ms) richiesto dall'utente
      this.hoverTimer = setTimeout(() => {
        this.showTooltip(paramKey, this.lastMouseX, this.lastMouseY);
      }, 2000);
    };

    const cancelHover = () => {
      this.clearHoverTimer();
      this.hideTooltip();
    };

    element.addEventListener("mouseenter", startHover);
    element.addEventListener("mouseleave", cancelHover);
  }

  clearHoverTimer() {
    if (this.hoverTimer) {
      clearTimeout(this.hoverTimer);
      this.hoverTimer = null;
    }
  }

  showTooltip(paramKey, mouseX, mouseY) {
    const data = CONTROL_TOOLTIPS[paramKey];
    if (!data || !this.tooltipEl) return;

    this.tooltipEl.innerHTML = `
      <div class="tooltip-inner-card">
        <div class="tooltip-header">
          <span class="tooltip-badge">GUIDA CONTROLLO</span>
          <h4 class="tooltip-title">${data.title}</h4>
        </div>
        <div class="tooltip-body">
          <div class="tooltip-row">
            <span class="row-icon">📖</span>
            <div class="row-content">
              <strong>A cosa serve:</strong>
              <p>${data.what}</p>
            </div>
          </div>
          <div class="tooltip-row row-high">
            <span class="row-icon">⬆️</span>
            <div class="row-content">
              <strong>Se alzi (verso destra / acuto):</strong>
              <p>${data.ifHigh}</p>
            </div>
          </div>
          <div class="tooltip-row row-low">
            <span class="row-icon">⬇️</span>
            <div class="row-content">
              <strong>Se abbassi (verso sinistra / grave):</strong>
              <p>${data.ifLow}</p>
            </div>
          </div>
          <div class="tooltip-footer-tip">
            ${data.tip}
          </div>
        </div>
      </div>
    `;

    // Calcolo posizione intelligente per non uscire dallo schermo
    const modalWidth = 320;
    const modalHeight = 240;
    const padding = 16;

    let left = mouseX + 18;
    let top = mouseY + 18;

    if (left + modalWidth > window.innerWidth - padding) {
      left = mouseX - modalWidth - 18;
    }
    if (left < padding) {
      left = padding;
    }

    if (top + modalHeight > window.innerHeight - padding) {
      top = mouseY - modalHeight - 18;
    }
    if (top < padding) {
      top = padding;
    }

    this.tooltipEl.style.left = `${left}px`;
    this.tooltipEl.style.top = `${top}px`;
    this.tooltipEl.classList.add("visible");
  }

  hideTooltip() {
    this.clearHoverTimer();
    this.currentHoverTarget = null;
    if (this.tooltipEl) {
      this.tooltipEl.classList.remove("visible");
    }
  }

  initKnobs(onChangeCallback) {
    const knobContainers = document.querySelectorAll(".rotary-knob");

    knobContainers.forEach(container => {
      const min = parseFloat(container.dataset.min ?? 0);
      const max = parseFloat(container.dataset.max ?? 100);
      const step = parseFloat(container.dataset.step ?? 1);
      const defVal = parseFloat(container.dataset.default ?? min);
      const unit = container.dataset.unit ?? "";
      const paramName = container.dataset.param;

      let currentVal = parseFloat(container.dataset.value ?? defVal);

      const dial = container.querySelector(".knob-dial");
      const valueDisplay = container.querySelector(".knob-value");
      const arc = container.querySelector(".knob-arc-fill");

      const updateUI = (val) => {
        const norm = (val - min) / (max - min);
        // Da -135deg a +135deg (270deg totali)
        const angle = -135 + norm * 270;
        if (dial) {
          dial.style.transform = `rotate(${angle}deg)`;
        }
        if (arc) {
          const dashoffset = 126 - norm * 126;
          arc.style.strokeDashoffset = dashoffset;
        }
        if (valueDisplay) {
          let formatted = val;
          if (step < 0.1) {
            formatted = val.toFixed(2);
          } else if (step < 1) {
            formatted = val.toFixed(1);
          } else {
            formatted = Math.round(val);
          }
          valueDisplay.textContent = `${formatted}${unit}`;
        }
        container.dataset.value = val;
      };

      updateUI(currentVal);

      // Collega il tooltip di 2 secondi
      if (paramName && CONTROL_TOOLTIPS[paramName]) {
        this.attachTooltipTrigger(container, paramName);
      }

      let startY = 0;
      let startVal = currentVal;
      let isDragging = false;

      const onMouseDown = (e) => {
        this.hideTooltip();
        isDragging = true;
        startY = e.clientY;
        startVal = parseFloat(container.dataset.value);
        document.body.style.cursor = "ns-resize";

        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);
      };

      const onMouseMove = (e) => {
        if (!isDragging) return;
        const deltaY = startY - e.clientY;
        const speed = e.shiftKey ? 0.2 : 1.0;
        const range = max - min;
        const deltaVal = (deltaY / 140) * range * speed;
        let newVal = Math.min(max, Math.max(min, startVal + deltaVal));

        if (step > 0) {
          newVal = Math.round((newVal - min) / step) * step + min;
        }

        updateUI(newVal);
        if (onChangeCallback && paramName) {
          onChangeCallback(paramName, newVal);
        }
      };

      const onMouseUp = () => {
        isDragging = false;
        document.body.style.cursor = "default";
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      };

      const onWheel = (e) => {
        e.preventDefault();
        this.hideTooltip();
        const delta = e.deltaY < 0 ? step : -step;
        let val = parseFloat(container.dataset.value) + delta * (e.shiftKey ? 0.2 : 1.0);
        val = Math.min(max, Math.max(min, val));
        updateUI(val);
        if (onChangeCallback && paramName) {
          onChangeCallback(paramName, val);
        }
      };

      const onDblClick = () => {
        this.hideTooltip();
        updateUI(defVal);
        if (onChangeCallback && paramName) {
          onChangeCallback(paramName, defVal);
        }
      };

      container.addEventListener("mousedown", onMouseDown);
      container.addEventListener("wheel", onWheel, { passive: false });
      container.addEventListener("dblclick", onDblClick);

      // Touch per smartphone e tablet
      let touchStartY = 0;
      container.addEventListener("touchstart", (e) => {
        this.hideTooltip();
        if (e.touches.length === 1) {
          touchStartY = e.touches[0].clientY;
          startVal = parseFloat(container.dataset.value);
        }
      }, { passive: true });

      container.addEventListener("touchmove", (e) => {
        if (e.touches.length === 1) {
          const deltaY = touchStartY - e.touches[0].clientY;
          const range = max - min;
          const deltaVal = (deltaY / 140) * range;
          let newVal = Math.min(max, Math.max(min, startVal + deltaVal));
          if (step > 0) newVal = Math.round((newVal - min) / step) * step + min;
          updateUI(newVal);
          if (onChangeCallback && paramName) onChangeCallback(paramName, newVal);
        }
      }, { passive: true });

      this.knobElements.push({
        container,
        paramName,
        updateUI
      });
    });

    // Collega i tooltip anche a Super Botta Slider e Extreme Mode
    const bottaWrap = document.querySelector(".botta-slider-wrap");
    if (bottaWrap) {
      this.attachTooltipTrigger(bottaWrap, "super_botta");
    }

    const extremeWrap = document.querySelector(".botta-toggle-wrap");
    if (extremeWrap) {
      this.attachTooltipTrigger(extremeWrap, "extreme_mode");
    }
  }

  setKnobValue(paramName, value) {
    const knob = this.knobElements.find(k => k.paramName === paramName);
    if (knob) {
      knob.updateUI(value);
    }
  }

  showToast(message, type = "info") {
    const existing = document.querySelector(".toast-notification");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.className = `toast-notification toast-${type}`;
    toast.innerHTML = `<span>${message}</span>`;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add("show");
    }, 10);

    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
}
