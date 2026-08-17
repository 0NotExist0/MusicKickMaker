/**
 * KickForge 303 - UI Manager
 * Gestione manopole rotanti intuitive, slider, tab categorie e toast notifications
 */

export class UIManager {
  constructor(app) {
    this.app = app;
    this.knobElements = [];
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

      let startY = 0;
      let startVal = currentVal;
      let isDragging = false;

      const onMouseDown = (e) => {
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
        const delta = e.deltaY < 0 ? step : -step;
        let val = parseFloat(container.dataset.value) + delta * (e.shiftKey ? 0.2 : 1.0);
        val = Math.min(max, Math.max(min, val));
        updateUI(val);
        if (onChangeCallback && paramName) {
          onChangeCallback(paramName, val);
        }
      };

      const onDblClick = () => {
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
