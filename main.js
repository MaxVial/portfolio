/* Maxime Vial — Portfolio
   Vanilla JS, no dependencies.
   1. Hero canvas: mycelium network x radio waves
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

  /* ───────── 1. Hero: mycelium × radio ─────────
     A network of hyphae grows across the hero and leans toward the pointer.
     The pointer is also a transmitter: it emits rings that light up the
     nodes they cross, and it shapes a waveform running behind the name.
     Move to attract growth, click to plant a spore. */
  const canvas = document.getElementById("field");
  if (canvas) {
    const ctx = canvas.getContext("2d");
    const hero = canvas.parentElement;
    const net = document.createElement("canvas"); // hyphae are painted once, then kept
    const nctx = net.getContext("2d");
    const MAX_TIPS = 170, MAX_NODES = 420;
    const rand = Math.random;
    let w = 0, h = 0, dpr = 1, frame = 0, visible = true;
    let tips = [], nodes = [], rings = [];
    const ptr = { x: 0, y: 0, sx: 0, active: false, lastSpawn: 0, lastRing: 0, boost: 0 };

    const addTip = (x, y, a, life, wd, gen) => {
      if (tips.length < MAX_TIPS) tips.push({ x, y, a, life, wd, gen });
    };
    const addNode = (x, y) => {
      nodes.push({ x, y, r: 0.9 + rand() * 1.5, ph: rand() * 6.28, hit: 0, age: 0 });
      if (nodes.length > MAX_NODES) nodes.shift();
    };
    const spore = (x, y, n) => {
      for (let i = 0; i < n; i++) addTip(x, y, (i / n) * 6.28 + rand() * 0.6, 150 + rand() * 200, 1.7, 0);
    };
    const edgeSeed = () => {
      const side = Math.floor(rand() * 4);
      const x = side === 1 ? w + 5 : side === 3 ? -5 : rand() * w;
      const y = side === 0 ? -5 : side === 2 ? h + 5 : rand() * h;
      const a = Math.atan2(h / 2 - y, w / 2 - x) + (rand() - 0.5) * 1.2;
      addTip(x, y, a, 260 + rand() * 240, 1.9, 0);
    };

    const grow = () => {
      nctx.lineCap = "round";
      for (let i = tips.length - 1; i >= 0; i--) {
        const t = tips[i];
        const px = t.x, py = t.y;
        t.a += (rand() - 0.5) * 0.46;
        if (ptr.active) { // tropism: bend gently toward the transmitter
          const dx = ptr.x - t.x, dy = ptr.y - t.y;
          if (dx * dx + dy * dy < 90000) {
            let d = Math.atan2(dy, dx) - t.a;
            d = Math.atan2(Math.sin(d), Math.cos(d));
            t.a += d * 0.03;
          }
        }
        t.x += Math.cos(t.a) * 1.5;
        t.y += Math.sin(t.a) * 1.5;
        t.life--;
        nctx.strokeStyle = `rgba(160,200,150,${0.2 + t.wd * 0.16})`;
        nctx.lineWidth = t.wd;
        nctx.beginPath(); nctx.moveTo(px, py); nctx.lineTo(t.x, t.y); nctx.stroke();

        if (rand() < 0.02 && t.gen < 5) {
          const turn = (0.45 + rand() * 0.7) * (rand() < 0.5 ? -1 : 1);
          addTip(t.x, t.y, t.a + turn, t.life * 0.8, Math.max(0.5, t.wd * 0.72), t.gen + 1);
          if (rand() < 0.55) addNode(t.x, t.y);
        }
        const out = t.x < -30 || t.x > w + 30 || t.y < -30 || t.y > h + 30;
        if (t.life <= 0 || out) {
          if (!out && rand() < 0.6) addNode(t.x, t.y);
          tips.splice(i, 1);
        }
      }
      if (tips.length < 16) edgeSeed();
      // Let old growth sink back into the soil, a little at a time.
      if (frame % 150 === 0) {
        nctx.save();
        nctx.setTransform(1, 0, 0, 1, 0, 0);
        nctx.globalCompositeOperation = "destination-out";
        nctx.fillStyle = "rgba(0,0,0,0.09)";
        nctx.fillRect(0, 0, net.width, net.height);
        nctx.restore();
      }
    };

    const emit = (x, y, strong) => rings.push({ x, y, r: 4, max: strong ? Math.max(w, h) * 0.7 : 260, strong });

    const draw = (time) => {
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(net, 0, 0, w, h);

      // Waveform behind the name; its envelope follows the pointer.
      const yc = h * 0.5;
      ptr.sx += ((ptr.active ? ptr.x : w / 2) - ptr.sx) * 0.06;
      ptr.boost *= 0.96;
      ctx.lineWidth = 1;
      for (let k = 0; k < 5; k++) {
        const amp = (h * 0.13 + ptr.boost * 70) * (1 - k * 0.14);
        ctx.strokeStyle = `rgba(214,158,96,${0.42 - k * 0.05})`;
        ctx.beginPath();
        for (let x = 0; x <= w; x += 6) {
          const e = (x - ptr.sx) / (w * 0.24);
          const env = 0.12 + 0.88 * Math.exp(-e * e);
          const y = yc + Math.sin(x * 0.018 * (1 + k * 0.3) + time * (1.3 + k * 0.35) + k)
            * Math.cos(x * 0.004 - time * 0.45) * amp * env;
          if (x) ctx.lineTo(x, y); else ctx.moveTo(x, y);
        }
        ctx.stroke();
      }

      // Rings travelling outward from the transmitter.
      for (let i = rings.length - 1; i >= 0; i--) {
        const g = rings[i];
        g.r += g.strong ? 4.2 : 2.4;
        const f = 1 - g.r / g.max;
        if (f <= 0) { rings.splice(i, 1); continue; }
        ctx.strokeStyle = `rgba(214,158,96,${(g.strong ? 0.6 : 0.34) * f})`;
        ctx.lineWidth = g.strong ? 1.6 : 1;
        ctx.beginPath(); ctx.arc(g.x, g.y, g.r, 0, 6.2832); ctx.stroke();
        for (const n of nodes) {
          if (Math.abs(Math.hypot(n.x - g.x, n.y - g.y) - g.r) < 6) n.hit = 1;
        }
      }

      // Glowing nodes: they breathe, and flare when a ring crosses them.
      for (let i = nodes.length - 1; i >= 0; i--) {
        const n = nodes[i];
        n.age++;
        if (n.age > 2400) { nodes.splice(i, 1); continue; }
        n.hit *= 0.955;
        const fade = Math.min(1, n.age / 40) * Math.min(1, (2400 - n.age) / 500);
        const pulse = 0.5 + 0.5 * Math.sin(time * 1.8 + n.ph);
        const a = fade * (0.35 + 0.4 * pulse + 0.5 * n.hit);
        ctx.fillStyle = `rgba(198,238,108,${Math.min(0.22, a * 0.14 + n.hit * 0.1)})`;
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r * (4 + n.hit * 3.5), 0, 6.2832); ctx.fill();
        ctx.fillStyle = `rgba(214,246,140,${Math.min(1, a)})`;
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r * (1 + n.hit * 0.9), 0, 6.2832); ctx.fill();
      }
    };

    const reset = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = hero.clientWidth; h = hero.clientHeight;
      for (const c of [canvas, net]) { c.width = w * dpr; c.height = h * dpr; }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      nctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      tips = []; nodes = []; rings = [];
      ptr.sx = w / 2;
      const seeds = w < 700 ? 5 : 9;
      for (let i = 0; i < seeds; i++) edgeSeed();
      spore(w * 0.5, h * 0.5, 5);
      for (let i = 0; i < (reduceMotion ? 520 : 150); i++) { frame++; grow(); } // start already alive
    };

    const loop = (t) => {
      if (visible) {
        frame++;
        grow();
        if (t - ptr.lastRing > (ptr.active ? 1500 : 3200)) {
          ptr.lastRing = t;
          if (ptr.active) emit(ptr.x, ptr.y, false);
          else emit(w * (0.2 + rand() * 0.6), h * (0.25 + rand() * 0.5), false);
        }
        draw(t * 0.001);
      }
      requestAnimationFrame(loop);
    };

    const place = (e) => {
      const b = hero.getBoundingClientRect();
      ptr.x = e.clientX - b.left; ptr.y = e.clientY - b.top; ptr.active = true;
    };
    hero.addEventListener("pointermove", (e) => {
      place(e);
      const now = performance.now();
      if (now - ptr.lastSpawn > 240) { // growth follows the hand
        ptr.lastSpawn = now;
        addTip(ptr.x, ptr.y, rand() * 6.28, 90 + rand() * 120, 1.3, 1);
      }
    });
    hero.addEventListener("pointerdown", (e) => {
      place(e);
      spore(ptr.x, ptr.y, 8);
      addNode(ptr.x, ptr.y);
      emit(ptr.x, ptr.y, true);
      ptr.boost = 1;
    });
    hero.addEventListener("pointerleave", () => { ptr.active = false; });
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(hero);
    let rz;
    window.addEventListener("resize", () => {
      clearTimeout(rz);
      rz = setTimeout(() => {
        if (hero.clientWidth !== w || Math.abs(hero.clientHeight - h) > 80) { reset(); if (reduceMotion) draw(0); }
      }, 200);
    });
    reset();
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
