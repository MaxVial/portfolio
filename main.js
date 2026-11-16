/* Maxime Vial — Portfolio
   Vanilla JS, no dependencies.
   1. Hero "signal field" canvas
   2. Scroll progress bar
   3. Side-slide reveals, counters, project sheets
   4. Fire-test chart (data from the mycelium paper)
*/
(() => {
  "use strict";

  const root = document.documentElement;
  root.classList.add("js");
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  requestAnimationFrame(() => root.classList.add("is-ready"));

  /* ───────── 1. Hero signal field ─────────
     A grid of dots displaced by waves radiating from the pointer,
     like a radio source moving over the page. */
  const canvas = document.getElementById("field");
  if (canvas) {
    const ctx = canvas.getContext("2d");
    const hero = canvas.parentElement;
    let w = 0, h = 0, dpr = 1, cols = 0, rows = 0, gap = 26;
    const src = { x: 0.5, y: 0.45, tx: 0.5, ty: 0.45 };
    let visible = true;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = hero.clientWidth;
      h = hero.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      gap = w < 700 ? 20 : 26;
      cols = Math.ceil(w / gap) + 1;
      rows = Math.ceil(h / gap) + 1;
    };

    const draw = (t) => {
      ctx.clearRect(0, 0, w, h);
      src.x += (src.tx - src.x) * 0.05;
      src.y += (src.ty - src.y) * 0.05;
      const sx = src.x * w, sy = src.y * h;
      const time = t * 0.0022;

      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          const x = i * gap, y = j * gap;
          const dx = x - sx, dy = y - sy;
          const dist = Math.hypot(dx, dy) || 1;
          const wave = Math.sin(dist * 0.035 - time * 2.2);
          const fall = Math.max(0, 1 - dist / (Math.max(w, h) * 0.75));
          const push = wave * 7 * fall;
          const px = x + (dx / dist) * push;
          const py = y + (dy / dist) * push;
          const r = 0.7 + (wave + 1) * 1.1 * fall;
          const hot = wave > 0.86 && fall > 0.35;
          ctx.fillStyle = hot ? "rgba(226,64,28,0.9)" : `rgba(21,19,15,${0.1 + fall * 0.28})`;
          ctx.beginPath();
          ctx.arc(px, py, r, 0, 6.2832);
          ctx.fill();
        }
      }
    };

    const loop = (t) => {
      if (visible) draw(t);
      requestAnimationFrame(loop);
    };

    hero.addEventListener("pointermove", (e) => {
      const b = hero.getBoundingClientRect();
      src.tx = (e.clientX - b.left) / b.width;
      src.ty = (e.clientY - b.top) / b.height;
    });
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(hero);
    window.addEventListener("resize", resize);
    resize();
    if (reduceMotion) draw(0); else requestAnimationFrame(loop);
  }

  /* ───────── 2. Scroll progress bar ───────── */
  const bar = document.getElementById("progressBar");
  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (bar) bar.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`;
    });
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ───────── 3. Reveals, counters, project sheets ───────── */
  const countUp = (el) => {
    const target = parseFloat(el.dataset.count);
    const dec = parseInt(el.dataset.dec || "0", 10);
    if (reduceMotion) { el.textContent = target.toFixed(dec); return; }
    const t0 = performance.now(), dur = 1600;
    const step = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 4);
      el.textContent = (target * eased).toFixed(dec);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  const reveal = (el) => {
    el.classList.add("is-in");
    el.querySelectorAll("[data-count]").forEach(countUp);
  };

  // Page content slides in from its side as it scrolls into view.
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      reveal(entry.target);
      io.unobserve(entry.target);
    });
  }, { threshold: 0.18 });

  // Stagger siblings so each page reads top to bottom as it slides in.
  document.querySelectorAll(".page, .hero__foot").forEach((group) => {
    group.querySelectorAll("[data-slide]").forEach((el, i) => {
      el.style.setProperty("--d", `${Math.min(i, 5) * 0.09}s`);
    });
  });
  document.querySelectorAll("main [data-slide]").forEach((el) => io.observe(el));

  // Each project opens in a full-screen sheet; its content animates on open.
  let chartBuilt = false;
  document.querySelectorAll("[data-open]").forEach((trigger) => {
    trigger.addEventListener("click", () => {
      const sheet = document.getElementById(trigger.dataset.open);
      if (!sheet) return;
      sheet.showModal();
      sheet.scrollTop = 0;
      root.classList.add("is-locked");
      if (!chartBuilt && sheet.querySelector("#fireChart")) { buildChart(); chartBuilt = true; }
      setTimeout(() => sheet.querySelectorAll("[data-slide]").forEach(reveal), 60);
    });
  });
  document.querySelectorAll(".sheet").forEach((sheet) => {
    sheet.querySelector("[data-close]").addEventListener("click", () => sheet.close());
    sheet.addEventListener("close", () => {
      root.classList.remove("is-locked");
      sheet.querySelectorAll("[data-slide]").forEach((el) => el.classList.remove("is-in"));
    });
  });

  /* ───────── 4. Fire-test chart ─────────
     Temperature (°C) on the unexposed face, one reading every 3 s.
     60 s of blowtorch at 10 cm, then cooling. Source: paper, table 4.2. */
  const fire = {
    ba13: [20, 23, 25, 26, 27, 27.1, 28, 28.1, 29.1, 30.1, 33, 37, 41, 45, 48.2, 51.4, 55.8, 60.6, 64.5, 67.6, 71.4, 72.2, 73.7, 74.9, 75.8, 76.6, 76.5, 75.1, 73.5, 74.1, 74.1, 74.1, 73.3, 71.4, 71.2, 69.9, 67.4, 66.4, 66.5, 65.7, 64.8, 64.7, 62.8, 61.8, 61.4, 59.6, 58.5, 57.3, 57.4, 56.2, 56.6, 55.9, 55.3, 55.4, 54.1, 54.2, 56.1, 57, 56.5, 55, 55.3],
    wood: [21.8, 28.2, 29.8, 29.3, 26.3, 29.1, 30.4, 29.8, 31.8, 30.4, 29.6, 31.3, 30.2, 32.1, 33.4, 33, 33.5, 35.1, 34.9, 35.5, 36.2, 34.1, 33.2, 31.8, 35.7, 33.2, 36.1, 35.2, 36.4, 38.2, 38.1, 37.6, 38.6, 39.3, 40.1, 39.2, 39.5, 40.6, 41.2, 41.1, 42.1, 41.8, 42.4, 42.7, 43.1, 43.6, 43.7, 44],
    grain: [18.5, 19, 22, 22.7, 23, 23.2, 23.3, 24, 24.1, 25, 30, 33.6, 35, 39, 41.8, 41.9, 42.6, 47.2, 52, 56.1, 57, 54.4, 48.2, 33.9, 28, 26.2, 25.9, 25, 23.6, 22.8, 22.5],
  };

  function buildChart() {
    const svg = document.getElementById("fireChart");
    const NS = "http://www.w3.org/2000/svg";
    const W = 560, H = 320, m = { l: 34, r: 14, t: 16, b: 30 };
    const tMax = 180, yMin = 10, yMax = 80;
    const X = (t) => m.l + (t / tMax) * (W - m.l - m.r);
    const Y = (v) => H - m.b - ((v - yMin) / (yMax - yMin)) * (H - m.t - m.b);
    const add = (tag, attrs, text) => {
      const el = document.createElementNS(NS, tag);
      for (const k in attrs) el.setAttribute(k, attrs[k]);
      if (text != null) el.textContent = text;
      svg.appendChild(el);
      return el;
    };

    // flame-on zone
    add("rect", { class: "zone", x: X(0), y: m.t, width: X(60) - X(0), height: H - m.t - m.b });
    add("text", { x: X(2), y: m.t + 12 }, "FLAME ON · 60 s");

    for (let v = 20; v <= 80; v += 20) {
      add("line", { class: "axis", x1: m.l, x2: W - m.r, y1: Y(v), y2: Y(v) });
      add("text", { x: m.l - 6, y: Y(v) + 3, "text-anchor": "end" }, v);
    }
    for (let t = 0; t <= 180; t += 30) {
      add("text", { x: X(t), y: H - 10, "text-anchor": "middle" }, `${t}s`);
    }

    const series = [
      ["wood", "var(--moss)"],
      ["grain", "var(--accent)"],
      ["ba13", "var(--ink)"],
    ];
    series.forEach(([key, color]) => {
      const d = fire[key].map((v, i) => `${i ? "L" : "M"}${X(i * 3).toFixed(1)},${Y(v).toFixed(1)}`).join("");
      const path = add("path", { class: "line", d, stroke: color });
      path.style.setProperty("--len", Math.ceil(path.getTotalLength()));
    });

    // peak annotation for BA13 (76.6 °C at 75 s)
    add("circle", { cx: X(75), cy: Y(76.6), r: 3.5, fill: "var(--ink)" });
    add("text", { x: X(75) + 8, y: Y(76.6) - 4 }, "76.6° — 15 s after flame-off");
  }
})();
