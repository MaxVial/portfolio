/* Maxime Vial — Portfolio
   Vanilla JS, no dependencies.
   1. Hero canvas: mycelium network x radio waves
   2. Scroll progress bar
   3. Side-slide reveals, counters, project sheets
   4. Fire-test chart (data from the mycelium paper)
   5. Process animations in the project sheets
   6. Experiences timeline
*/
(() => {
  "use strict";

  const root = document.documentElement;
  root.classList.add("js");
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const anims = {}; // sheet id -> process animation, filled in section 5

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
      if (visible && !hero.classList.contains("is-covered")) {
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

  /* ───────── 2b. Stacked sections ─────────
     A section pins as soon as its bottom reaches the bottom of the screen
     (sticky top = screen height − section height), so the next section
     slides over it. --cover (0 → 1) tracks how much of it is covered. */
  const stack = [...document.querySelectorAll("[data-stack]")];
  const pinStack = () => {
    stack.forEach((s) => { s.style.top = `${Math.min(0, window.innerHeight - s.offsetHeight)}px`; });
  };
  const coverStack = () => {
    const vh = window.innerHeight;
    stack.forEach((s) => {
      const next = s.nextElementSibling;
      if (!next) return;
      const top = next.getBoundingClientRect().top;
      const c = Math.max(0, Math.min(1, 1 - top / vh));
      s.style.setProperty("--cover", c.toFixed(3));
      s.classList.toggle("is-covered", c > 0.98);
    });
  };
  pinStack(); coverStack();
  window.addEventListener("scroll", coverStack, { passive: true });
  window.addEventListener("resize", () => { pinStack(); coverStack(); });
  window.addEventListener("load", () => { pinStack(); coverStack(); });
  if ("ResizeObserver" in window) new ResizeObserver(() => { pinStack(); coverStack(); }).observe(document.querySelector("main"));

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
      if (anims[sheet.id]) anims[sheet.id].start();
    });
  });
  document.querySelectorAll(".sheet").forEach((sheet) => {
    sheet.querySelector("[data-close]").addEventListener("click", () => sheet.close());
    sheet.addEventListener("close", () => {
      root.classList.remove("is-locked");
      if (anims[sheet.id]) anims[sheet.id].stop();
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

  /* ───────── 5. Process animations inside the project sheets ─────────
     Each one explains a step of the work that the photos cannot show.
     They only run while their sheet is open. */
  const NS = "http://www.w3.org/2000/svg";
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const ease = (v) => 1 - Math.pow(1 - clamp01(v), 3);
  const lerp = (a, b, t) => a + (b - a) * t;
  const seeded = (s) => () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };

  // Step buttons + caption, shared by the animations that have stages.
  const stepper = (box, durations, captions, captionEl, onStep) => {
    const btns = [...box.querySelectorAll("button")];
    let step = 0, t0 = performance.now();
    const set = (i, now) => {
      step = i; t0 = now;
      btns.forEach((b, k) => {
        b.classList.toggle("is-active", k === i);
        b.setAttribute("aria-current", k === i ? "step" : "false");
        b.style.setProperty("--p", k < i ? 1 : 0);
      });
      captionEl.textContent = typeof captions === "function" ? captions(i) : captions[i];
      if (onStep) onStep(i);
    };
    btns.forEach((b, i) => b.addEventListener("click", () => set(i, performance.now())));
    set(0, t0);
    return {
      get step() { return step; },
      set,
      // Seconds spent in the current step; moves to the next step when done.
      tick(now) {
        const dur = durations[step];
        const p = reduceMotion ? 1 : clamp01((now - t0) / dur);
        btns[step].style.setProperty("--p", p);
        if (p >= 1 && !reduceMotion) set((step + 1) % durations.length, now);
        return reduceMotion ? dur / 1000 : (now - t0) / 1000;
      },
    };
  };

  /* 5a. Mycelium: hyphae growing through substrate, in 3D */
  anims["sheet-1"] = (() => {
    const canvas = document.getElementById("mycAnim");
    if (!canvas) return null;
    const stage = canvas.parentElement;
    const ctx = canvas.getContext("2d");
    const caption = document.getElementById("mycCaption");
    let W = 0, H = 0, raf = 0, running = false;
    let yaw = 0.7, pitch = 0.42, drag = null;
    let substrate = "wood";
    let P = [], E = [], SK = [];

    const names = { wood: "oyster mushroom on wood chips", grain: "reishi on grain" };
    const captions = (i) => [
      `Colonised substrate (${names[substrate]}) is crumbled into fragments, which wakes the fungus up and spreads it evenly.`,
      "The fragments are packed into a 3D-printed mould. For about a week, hyphae grow between them and knit them into one block.",
      "Out of the mould, the block keeps growing in the open air and covers itself with a white fungal skin.",
      "Dried for 6 h at 60 °C: the fungus is killed, growth stops and the panel keeps its shape.",
    ][i];
    const steps = stepper(document.querySelector('[data-steps="myc"]'), [3400, 7000, 4600, 4400], captions, caption);

    const norm = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
    const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

    const build = () => {
      const rnd = seeded(substrate === "wood" ? 11 : 29);
      const N = substrate === "wood" ? 62 : 118;
      P = [];
      for (let i = 0; i < N; i++) {
        const home = [(rnd() * 2 - 1) * 0.84, (rnd() * 2 - 1) * 0.84, (rnd() * 2 - 1) * 0.84];
        const out = norm([home[0] + (rnd() - 0.5) * 0.6, home[1] + (rnd() - 0.5) * 0.6, home[2] + (rnd() - 0.5) * 0.6]);
        const spread = 0.45 + rnd() * 0.5;
        const scatter = [home[0] * 1.35 + out[0] * spread, home[1] * 0.55 - 0.55 + out[1] * spread * 0.4, home[2] * 1.35 + out[2] * spread];
        const u = norm([rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1]);
        const v = norm(cross(u, norm([rnd() - 0.5, rnd() - 0.5, rnd() - 0.5])));
        const wood = substrate === "wood";
        P.push({
          home, scatter, u, v,
          len: wood ? 0.13 + rnd() * 0.1 : 0.075 + rnd() * 0.02,
          wid: wood ? 0.035 + rnd() * 0.03 : 0.045 + rnd() * 0.012,
          col: wood ? [140 + rnd() * 40, 96 + rnd() * 30, 56 + rnd() * 20] : [205 + rnd() * 25, 160 + rnd() * 30, 82 + rnd() * 30],
          ph: rnd() * 6.28, hop: 99,
          fuzz: Array.from({ length: 5 }, () => norm([rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1])),
          pos: [0, 0, 0],
        });
      }
      // Hyphae: each fragment reaches for its nearest neighbours.
      const seen = new Set(); E = [];
      const k = substrate === "wood" ? 3 : 3;
      P.forEach((a, i) => {
        const near = P.map((b, j) => [j, (a.home[0] - b.home[0]) ** 2 + (a.home[1] - b.home[1]) ** 2 + (a.home[2] - b.home[2]) ** 2])
          .filter(([j]) => j !== i).sort((x, y) => x[1] - y[1]).slice(0, k);
        near.forEach(([j]) => {
          const key = i < j ? `${i}-${j}` : `${j}-${i}`;
          if (seen.has(key)) return;
          seen.add(key);
          const b = P[j];
          const bend = [(rnd() - 0.5) * 0.22, (rnd() - 0.5) * 0.22, (rnd() - 0.5) * 0.22];
          E.push({ a: i, b: j, bend, start: 0 });
        });
      });
      // Growth spreads outward from three inoculation points.
      const q = [0, Math.floor(N / 3), Math.floor((2 * N) / 3)];
      q.forEach((i) => { P[i].hop = 0; });
      const adj = P.map(() => []);
      E.forEach((e) => { adj[e.a].push(e.b); adj[e.b].push(e.a); });
      for (let h = 0; h < q.length; h++) {
        const i = q[h];
        adj[i].forEach((j) => { if (P[j].hop > P[i].hop + 1) { P[j].hop = P[i].hop + 1; q.push(j); } });
      }
      E.forEach((e) => { e.start = Math.min(P[e.a].hop, P[e.b].hop) * 0.55 + rnd() * 0.35; });
      P.forEach((p) => { if (p.hop === 99) p.hop = 6; });
      // Skin: short strands lying on the faces of the block.
      SK = [];
      for (let i = 0; i < 260; i++) {
        const ax = Math.floor(rnd() * 3), sg = rnd() < 0.5 ? -1 : 1;
        let pt = [(rnd() * 2 - 1) * 0.93, (rnd() * 2 - 1) * 0.93, (rnd() * 2 - 1) * 0.93];
        pt[ax] = sg * 0.955;
        const pts = [pt.slice()];
        for (let s = 0; s < 4; s++) {
          pt = pt.slice();
          for (let d = 0; d < 3; d++) if (d !== ax) pt[d] = Math.max(-0.95, Math.min(0.95, pt[d] + (rnd() - 0.5) * 0.16));
          pts.push(pt);
        }
        SK.push({ ax, sg, pts });
      }
    };

    let S = 1, cxs = 0, cys = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = stage.clientWidth; H = stage.clientHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      S = Math.min(W, H) * 0.235; cxs = W / 2; cys = H * 0.53;
    };
    const rot = (p) => {
      const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
      const x = p[0] * cy - p[2] * sy, z = p[0] * sy + p[2] * cy;
      return [x, p[1] * cp - z * sp, p[1] * sp + z * cp];
    };
    const proj = (p) => {
      const r = rot(p);
      const f = 3.4 / (3.4 + r[2]);
      return [cxs + r[0] * f * S, cys - r[1] * f * S, r[2], f];
    };
    const bez = (a, c, b, t) => [
      (1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * c[0] + t * t * b[0],
      (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * c[1] + t * t * b[1],
      (1 - t) * (1 - t) * a[2] + 2 * (1 - t) * t * c[2] + t * t * b[2],
    ];
    const CORN = [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]];
    const EDGES = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
    const FACES = [[[0, 3, 7, 4], [-1, 0, 0]], [[1, 2, 6, 5], [1, 0, 0]], [[0, 1, 5, 4], [0, -1, 0]], [[3, 2, 6, 7], [0, 1, 0]], [[0, 1, 2, 3], [0, 0, -1]], [[4, 5, 6, 7], [0, 0, 1]]];

    const frame = (now) => {
      const step = steps.step;
      const e = steps.tick(now);
      const t = now / 1000;
      if (!drag && !reduceMotion) yaw += 0.0032;

      const pack = step === 0 ? 0 : step === 1 ? ease(e / 1.3) : 1;
      const growT = step === 0 ? -1 : step === 1 ? e - 1.3 : 99;
      const mouldA = step === 0 ? 0.35 : step === 1 ? 1 : step === 2 ? 1 - ease(e / 1.6) : 0;
      const mouldLift = step === 2 ? ease(e / 1.6) * 1.4 : 0;
      const skin = step === 2 ? ease((e - 0.9) / 2.6) : step === 3 ? 1 : 0;
      const dry = step === 3 ? ease(e / 2.4) : 0;
      const hy = [lerp(244, 226, dry), lerp(242, 205, dry), lerp(232, 160, dry)];

      ctx.clearRect(0, 0, W, H);

      // positions
      P.forEach((p, i) => {
        const wob = step === 0 && !reduceMotion ? 0.03 : 0;
        for (let d = 0; d < 3; d++) p.pos[d] = lerp(p.scatter[d], p.home[d], pack) + Math.sin(t * 1.3 + p.ph + d) * wob;
      });

      const items = [];
      // fragments
      P.forEach((p) => {
        const c = proj(p.pos);
        items.push({ z: c[2], draw: () => {
          const shade = 0.6 + 0.4 * (1 - (c[2] + 1.4) / 2.8);
          const dryTint = 1 + dry * 0.12;
          const col = `rgb(${Math.min(255, p.col[0] * shade * dryTint) | 0},${Math.min(255, p.col[1] * shade * dryTint) | 0},${Math.min(255, p.col[2] * shade) | 0})`;
          if (substrate === "wood") {
            const q = [[1, 1], [1, -1], [-1, -1], [-1, 1]].map(([a, b]) => proj([
              p.pos[0] + p.u[0] * p.len * a + p.v[0] * p.wid * b,
              p.pos[1] + p.u[1] * p.len * a + p.v[1] * p.wid * b,
              p.pos[2] + p.u[2] * p.len * a + p.v[2] * p.wid * b]));
            ctx.beginPath(); ctx.moveTo(q[0][0], q[0][1]); q.slice(1).forEach((r) => ctx.lineTo(r[0], r[1])); ctx.closePath();
            ctx.fillStyle = col; ctx.fill();
            ctx.strokeStyle = "rgba(40,22,10,0.45)"; ctx.lineWidth = 0.8; ctx.stroke();
          } else {
            const a = proj([p.pos[0] + p.u[0] * p.len, p.pos[1] + p.u[1] * p.len, p.pos[2] + p.u[2] * p.len]);
            const rx = Math.hypot(a[0] - c[0], a[1] - c[1]) + 1.5;
            ctx.beginPath();
            ctx.ellipse(c[0], c[1], rx, p.wid * S * c[3], Math.atan2(a[1] - c[1], a[0] - c[0]), 0, 6.283);
            ctx.fillStyle = col; ctx.fill();
            ctx.fillStyle = "rgba(255,240,200,0.35)";
            ctx.beginPath(); ctx.arc(c[0] - rx * 0.25, c[1] - 1.5, Math.max(1, rx * 0.25), 0, 6.283); ctx.fill();
          }
          // white fuzz: leftover colonisation when crumbled, fresh growth later
          const fz = step === 0 ? 0.45 : clamp01((growT - p.hop * 0.55) / 0.9);
          if (fz > 0) {
            ctx.strokeStyle = `rgba(${hy[0] | 0},${hy[1] | 0},${hy[2] | 0},${0.55 * fz})`;
            ctx.lineWidth = 0.7;
            p.fuzz.forEach((d) => {
              const tip = proj([p.pos[0] + d[0] * 0.11 * fz, p.pos[1] + d[1] * 0.11 * fz, p.pos[2] + d[2] * 0.11 * fz]);
              ctx.beginPath(); ctx.moveTo(c[0], c[1]); ctx.lineTo(tip[0], tip[1]); ctx.stroke();
            });
          }
        } });
      });
      // hyphae between fragments
      if (growT > 0) {
        E.forEach((ed) => {
          const g = clamp01((growT - ed.start) / 0.9);
          if (g <= 0) return;
          const a = P[ed.a].pos, b = P[ed.b].pos;
          const c = [(a[0] + b[0]) / 2 + ed.bend[0], (a[1] + b[1]) / 2 + ed.bend[1], (a[2] + b[2]) / 2 + ed.bend[2]];
          const pts = [];
          for (let s = 0; s <= 8; s++) pts.push(proj(bez(a, c, b, (s / 8) * g)));
          const zm = pts[Math.floor(pts.length / 2)][2];
          items.push({ z: zm, draw: () => {
            const al = 0.35 + 0.6 * (1 - (zm + 1.4) / 2.8);
            ctx.strokeStyle = `rgba(${hy[0] | 0},${hy[1] | 0},${hy[2] | 0},${al})`;
            ctx.lineWidth = 1.1 * pts[0][3];
            ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
            pts.slice(1).forEach((r) => ctx.lineTo(r[0], r[1]));
            ctx.stroke();
          } });
        });
      }

      // block faces (the skin), split into back and front of the content
      const faceCol = [lerp(246, 228, dry), lerp(243, 206, dry), lerp(234, 158, dry)];
      const drawFaces = (front) => {
        if (skin <= 0) return;
        FACES.forEach(([idx, n]) => {
          const isFront = rot(n)[2] < 0;
          if (isFront !== front) return;
          const q = idx.map((i) => proj(CORN[i].map((v) => v * 0.96)));
          ctx.beginPath(); ctx.moveTo(q[0][0], q[0][1]); q.slice(1).forEach((r) => ctx.lineTo(r[0], r[1])); ctx.closePath();
          ctx.fillStyle = `rgba(${faceCol[0] | 0},${faceCol[1] | 0},${faceCol[2] | 0},${skin * (front ? 0.72 : 0.3)})`;
          ctx.fill();
        });
        if (front) {
          ctx.lineWidth = 0.8;
          SK.forEach((s) => {
            const n = [0, 0, 0]; n[s.ax] = s.sg;
            if (rot(n)[2] >= 0) return;
            ctx.strokeStyle = `rgba(${hy[0] | 0},${hy[1] | 0},${hy[2] | 0},${0.75 * skin})`;
            const q = s.pts.map(proj);
            ctx.beginPath(); ctx.moveTo(q[0][0], q[0][1]); q.slice(1).forEach((r) => ctx.lineTo(r[0], r[1])); ctx.stroke();
          });
        }
      };

      drawFaces(false);
      items.sort((a, b) => b.z - a.z).forEach((it) => it.draw());
      drawFaces(true);

      // the 3D-printed mould
      if (mouldA > 0) {
        ctx.strokeStyle = `rgba(198,238,108,${0.85 * mouldA})`;
        ctx.lineWidth = 2;
        EDGES.forEach(([i, j]) => {
          const a = proj(CORN[i].map((v, d) => v * 1.03 + (d === 1 ? mouldLift : 0)));
          const b = proj(CORN[j].map((v, d) => v * 1.03 + (d === 1 ? mouldLift : 0)));
          ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
        });
        const lab = proj([1.05, 1.05 + mouldLift, -1.05]);
        ctx.fillStyle = `rgba(198,238,108,${mouldA})`;
        ctx.font = "500 11px 'IBM Plex Mono', monospace";
        ctx.fillText("3D-PRINTED MOULD", lab[0] + 8, lab[1] - 6);
      }

      // drying: warm air rising
      if (dry > 0) {
        ctx.lineWidth = 1.5;
        for (let k = 0; k < 6; k++) {
          const x0 = W * (0.2 + k * 0.12);
          ctx.strokeStyle = `rgba(242,150,70,${0.5 * dry})`;
          ctx.beginPath();
          for (let y = H; y > H * 0.62; y -= 6) {
            const x = x0 + Math.sin(y * 0.06 + t * 3 + k) * 5;
            if (y === H) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
        ctx.fillStyle = `rgba(246,201,131,${dry})`;
        ctx.font = "italic 30px 'Instrument Serif', serif";
        ctx.fillText("60 °C · 6 h", 18, H - 20);
      }

      if (running) raf = requestAnimationFrame(frame);
    };

    stage.addEventListener("pointerdown", (ev) => {
      if (ev.target.closest("button")) return;
      drag = { x: ev.clientX, y: ev.clientY, yaw, pitch };
      stage.classList.add("is-dragging");
      stage.setPointerCapture(ev.pointerId);
    });
    stage.addEventListener("pointermove", (ev) => {
      if (!drag) return;
      yaw = drag.yaw + (ev.clientX - drag.x) * 0.01;
      pitch = Math.max(-0.2, Math.min(1.2, drag.pitch + (ev.clientY - drag.y) * 0.006));
      if (reduceMotion) frame(performance.now());
    });
    const endDrag = () => { drag = null; stage.classList.remove("is-dragging"); };
    stage.addEventListener("pointerup", endDrag);
    stage.addEventListener("pointercancel", endDrag);

    stage.querySelectorAll("[data-substrate]").forEach((b) => b.addEventListener("click", () => {
      substrate = b.dataset.substrate;
      stage.querySelectorAll("[data-substrate]").forEach((o) => o.setAttribute("aria-pressed", String(o === b)));
      build();
      steps.set(0, performance.now());
      if (reduceMotion) frame(performance.now());
    }));
    document.querySelector('[data-steps="myc"]').addEventListener("click", () => { if (reduceMotion) requestAnimationFrame(frame); });

    build();
    window.addEventListener("resize", () => { if (running) resize(); });
    return {
      start() { resize(); steps.set(0, performance.now()); running = true; cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); },
      stop() { running = false; cancelAnimationFrame(raf); },
    };
  })();

  /* 5b. Weather station: one radio frame, two listeners */
  anims["sheet-2"] = (() => {
    const svg = document.getElementById("radioAnim");
    if (!svg) return null;
    svg.innerHTML = `
      <defs>
        <clipPath id="rClip"><rect width="600" height="400"/></clipPath>
        <clipPath id="bitClip"><rect id="bitMask" x="356" y="246" width="0" height="14"/></clipPath>
      </defs>
      <g clip-path="url(#rClip)">
        <g id="rings" fill="none" stroke="#f2a84c"></g>
        <!-- sensor array on its mast -->
        <g stroke="#eef0e6" stroke-width="2" fill="none" stroke-linecap="round">
          <path d="M100 236V372M76 372h48"/>
          <rect x="70" y="170" width="60" height="18" rx="4" fill="#1c4a57"/>
          <path d="M80 170c4-22 36-22 40 0"/>
          <rect x="74" y="190" width="52" height="40" rx="8" fill="#163d48"/>
          <path d="M84 230v6M116 230v6"/>
        </g>
        <circle id="sensorGlow" cx="100" cy="206" r="10" fill="#f2a84c" opacity="0"/>
        <text x="100" y="392" text-anchor="middle" class="t-lab">WS90 sensor array</text>

        <!-- gateway -->
        <g stroke="#eef0e6" stroke-width="2">
          <rect x="350" y="78" width="96" height="44" rx="10" fill="#163d48"/>
        </g>
        <circle id="gwLed" cx="368" cy="100" r="5" fill="#9dbdc1"/>
        <text x="398" y="104" class="t-mono">GW1100</text>
        <text x="398" y="146" text-anchor="middle" class="t-lab">gateway</text>
        <text x="398" y="64" text-anchor="middle" class="t-tag">intended receiver</text>

        <!-- Wi-Fi hop to the app -->
        <path id="wifiPath" d="M446 100 C 480 70, 500 70, 520 92" fill="none" stroke="#9dbdc1" stroke-width="1.5" stroke-dasharray="4 6"/>
        <circle id="packet" r="5" fill="#eef0e6" opacity="0"/>
        <g stroke="#eef0e6" stroke-width="2"><rect x="520" y="62" width="50" height="86" rx="9" fill="#0c2229"/></g>
        <text id="appVal" x="545" y="106" text-anchor="middle" class="t-app">33.7°</text>
        <text x="545" y="168" text-anchor="middle" class="t-lab">app</text>

        <!-- SDR dongle + laptop -->
        <g stroke="#eef0e6" stroke-width="2" fill="none" stroke-linecap="round">
          <path d="M330 300V238"/>
          <rect x="320" y="300" width="24" height="12" rx="3" fill="#163d48"/>
          <rect x="344" y="218" width="190" height="120" rx="8" fill="#0c2229"/>
          <path d="M326 352h236l-14-14H340z" fill="#163d48"/>
        </g>
        <circle id="sdrLed" cx="338" cy="306" r="3" fill="#9dbdc1"/>
        <g id="bars"></g>
        <g clip-path="url(#bitClip)"><text x="356" y="257" class="t-bits">1010 0110 1101 0010 0111 0001 1011 0100</text></g>
        <text class="t-field" x="356" y="282" id="f1" opacity="0">temp ··· 33.7 °C</text>
        <text class="t-field" x="356" y="302" id="f2" opacity="0">humidity ··· 21 %</text>
        <text class="t-field" x="356" y="322" id="f3" opacity="0">wind ··· 4.3 km/h</text>
        <text x="444" y="374" text-anchor="middle" class="t-lab">RTL-SDR + laptop</text>
        <text x="444" y="206" text-anchor="middle" class="t-tag">anyone nearby</text>
      </g>`;
    const style = document.createElementNS(NS, "style");
    style.textContent = `
      .t-lab{font:500 11px 'IBM Plex Mono',monospace;letter-spacing:.06em;text-transform:uppercase;fill:#9dbdc1}
      .t-tag{font:italic 17px 'Instrument Serif',serif;fill:#f2a84c}
      .t-mono{font:500 12px 'IBM Plex Mono',monospace;fill:#eef0e6}
      .t-app{font:22px 'Instrument Serif',serif;fill:#eef0e6}
      .t-bits{font:10px 'IBM Plex Mono',monospace;fill:#f2a84c}
      .t-field{font:12px 'IBM Plex Mono',monospace;fill:#eef0e6}`;
    svg.prepend(style);
    const $ = (id) => svg.getElementById(id);
    const rings = $("rings"), bars = $("bars"), wifi = $("wifiPath");
    const ringEls = [0, 1, 2].map(() => { const c = document.createElementNS(NS, "circle"); c.setAttribute("cx", 100); c.setAttribute("cy", 206); rings.appendChild(c); return c; });
    const barEls = Array.from({ length: 14 }, (_, i) => {
      const r = document.createElementNS(NS, "rect");
      r.setAttribute("x", 358 + i * 12); r.setAttribute("width", 7); r.setAttribute("rx", 2); r.setAttribute("fill", "#f2a84c");
      bars.appendChild(r); return r;
    });
    const wifiLen = wifi.getTotalLength();
    const PERIOD = 6, SPEED = 190;
    let raf = 0, running = false, t0 = 0;
    const frame = (now) => {
      const t = reduceMotion ? 3.6 : ((now - t0) / 1000) % PERIOD;
      ringEls.forEach((c, i) => {
        const r = (t - i * 0.2) * SPEED;
        const on = r > 0 && r < 520;
        c.setAttribute("r", Math.max(0, r));
        c.setAttribute("stroke-width", 2.2 - i * 0.5);
        c.setAttribute("opacity", on ? Math.max(0, 0.9 - r / 560) : 0);
      });
      $("sensorGlow").setAttribute("opacity", Math.max(0, 1 - t / 0.5) * 0.9);
      const gw = t > 1.65 && t < 2.2, sdr = t > 1.25 && t < 1.7;
      $("gwLed").setAttribute("fill", gw ? "#f2a84c" : "#9dbdc1");
      $("sdrLed").setAttribute("fill", sdr ? "#f2a84c" : "#9dbdc1");
      const pk = clamp01((t - 2.05) / 0.8);
      const pt = wifi.getPointAtLength(wifiLen * pk);
      $("packet").setAttribute("cx", pt.x); $("packet").setAttribute("cy", pt.y);
      $("packet").setAttribute("opacity", pk > 0 && pk < 1 ? 1 : 0);
      $("appVal").setAttribute("fill", t > 2.85 && t < 3.6 ? "#f2a84c" : "#eef0e6");
      const burst = clamp01(1 - Math.abs(t - 1.75) / 0.55);
      barEls.forEach((r, i) => {
        const h = 4 + burst * (10 + 22 * Math.abs(Math.sin(i * 1.7 + t * 9)));
        r.setAttribute("y", 244 - h); r.setAttribute("height", h);
        r.setAttribute("opacity", 0.35 + burst * 0.65);
      });
      const fade = t > 5.4 ? 1 - (t - 5.4) / 0.6 : 1;
      $("bitMask").setAttribute("width", 176 * clamp01((t - 1.6) / 1));
      svg.querySelector('[clip-path="url(#bitClip)"]').setAttribute("opacity", fade);
      ["f1", "f2", "f3"].forEach((id, i) => $(id).setAttribute("opacity", clamp01((t - 2.6 - i * 0.4) / 0.3) * fade));
      if (running) raf = requestAnimationFrame(frame);
    };
    return {
      start() { t0 = performance.now(); running = true; cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); },
      stop() { running = false; cancelAnimationFrame(raf); },
    };
  })();

  /* 5c. CloudCaps: from acetate sheet to opener */
  anims["sheet-3"] = (() => {
    const svg = document.getElementById("cncAnim");
    if (!svg) return null;
    const rnd = seeded(5);
    const C = [300, 205];
    // Cloud outline: points on an ellipse joined by outward arcs.
    const lobes = 7, rx = 150, ry = 100;
    const pts = Array.from({ length: lobes }, (_, i) => {
      const a = -Math.PI / 2 + (i / lobes) * Math.PI * 2 + 0.2;
      return [C[0] + Math.cos(a) * rx, C[1] + Math.sin(a) * ry];
    });
    let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
    pts.forEach((p, i) => {
      const q = pts[(i + 1) % lobes];
      const r = Math.hypot(q[0] - p[0], q[1] - p[1]) * (0.56 + rnd() * 0.12);
      d += ` A${r.toFixed(1)} ${r.toFixed(1)} 0 0 1 ${q[0].toFixed(1)} ${q[1].toFixed(1)}`;
    });
    d += "Z";
    const hole = `M${C[0] + 56} ${C[1]} A56 56 0 1 1 ${C[0] - 56} ${C[1]} A56 56 0 1 1 ${C[0] + 56} ${C[1]}`;
    const palette = ["#6b3b24", "#a8693c", "#d9a66a", "#f0e3cc", "#3d5f95", "#8fb3e2", "#2b1a12", "#c7895a"];
    let blobs = "";
    for (let i = 0; i < 230; i++) {
      const x = 80 + rnd() * 440, y = 40 + rnd() * 320, r = 4 + rnd() * 14;
      blobs += `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${r.toFixed(1)}" ry="${(r * (0.5 + rnd() * 0.6)).toFixed(1)}" transform="rotate(${(rnd() * 180) | 0} ${x.toFixed(1)} ${y.toFixed(1)})" fill="${palette[(rnd() * palette.length) | 0]}" opacity="${(0.55 + rnd() * 0.45).toFixed(2)}"/>`;
    }
    svg.innerHTML = `
      <defs>
        <g id="acetate"><rect x="90" y="50" width="420" height="310" fill="#e8d6bb"/>${blobs}</g>
        <clipPath id="sheetClip"><rect x="90" y="50" width="420" height="310" rx="10"/></clipPath>
        <mask id="pieceMask"><path d="${d}" fill="#fff"/><path d="${hole}" fill="#000"/></mask>
        <radialGradient id="steel" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#f4f4f2"/><stop offset=".6" stop-color="#b9bcbf"/><stop offset="1" stop-color="#7c8085"/></radialGradient>
        <filter id="lift" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="14" stdDeviation="10" flood-color="#000" flood-opacity=".55"/></filter>
      </defs>
      <g id="sheet"><use href="#acetate" clip-path="url(#sheetClip)"/><rect x="90" y="50" width="420" height="310" rx="10" fill="none" stroke="rgba(0,0,0,.25)"/></g>
      <path id="cutHole" d="${hole}" fill="none" stroke="#1d110a" stroke-width="4" stroke-linecap="round"/>
      <path id="cutOut" d="${d}" fill="none" stroke="#1d110a" stroke-width="4" stroke-linecap="round"/>
      <path id="guide" d="${d}" fill="none" stroke="#93b8ea" stroke-width="1.5" stroke-dasharray="5 6" opacity="0"/>
      <g id="piece" opacity="0" filter="url(#lift)"><use href="#acetate" mask="url(#pieceMask)"/></g>
      <g id="insert" opacity="0">
        <circle cx="${C[0]}" cy="${C[1]}" r="58" fill="url(#steel)" stroke="#5d6166" stroke-width="1.5"/>
        <rect x="${C[0] - 30}" y="${C[1] - 18}" width="60" height="36" rx="10" fill="#2a2d31"/>
        <path d="M${C[0] - 20} ${C[1] - 18}h40v-6a6 6 0 0 0-6-6h-28a6 6 0 0 0-6 6z" fill="#8a8e93"/>
        <g id="screw1"><circle cx="${C[0]}" cy="${C[1] - 42}" r="7" fill="#d9dbdd" stroke="#6b6f74"/><path d="M${C[0] - 4} ${C[1] - 42}h8M${C[0]} ${C[1] - 46}v8" stroke="#55595e" stroke-width="1.6"/></g>
        <g id="screw2"><circle cx="${C[0]}" cy="${C[1] + 42}" r="7" fill="#d9dbdd" stroke="#6b6f74"/><path d="M${C[0] - 4} ${C[1] + 42}h8M${C[0]} ${C[1] + 38}v8" stroke="#55595e" stroke-width="1.6"/></g>
      </g>
      <g id="tool" opacity="0">
        <circle r="16" fill="rgba(147,184,234,.15)" stroke="#93b8ea" stroke-width="1.2"/>
        <circle r="7" fill="url(#steel)" stroke="#3a3d41"/>
        <path d="M-24 0h-8M24 0h8M0 -24v-8M0 24v8" stroke="#93b8ea" stroke-width="1.5"/>
      </g>
      <g id="chips"></g>`;
    const $ = (id) => svg.getElementById(id);
    const cutHole = $("cutHole"), cutOut = $("cutOut"), tool = $("tool"), chips = $("chips");
    const lh = cutHole.getTotalLength(), lo = cutOut.getTotalLength();
    [[cutHole, lh], [cutOut, lo]].forEach(([p, l]) => { p.style.strokeDasharray = `${l} ${l}`; });
    const chipEls = Array.from({ length: 12 }, () => {
      const c = document.createElementNS(NS, "circle");
      c.setAttribute("r", 1.8); c.setAttribute("fill", "#f0e3cc"); chips.appendChild(c);
      return { el: c, a: 0, life: 0, x: 0, y: 0 };
    });
    const caption = document.getElementById("cncCaption");
    const steps = stepper(document.querySelector('[data-steps="cnc"]'), [2600, 6000, 4200], [
      "Unsold eyewear acetate sheets: every sheet has its own pattern, so every opener does too.",
      "The CNC router cuts the hole for the insert, then follows the cloud outline drawn in SolidWorks.",
      "The piece comes out of the sheet and the metal opener insert is screwed in.",
    ], caption);
    let raf = 0, running = false;
    const frame = (now) => {
      const step = steps.step;
      const e = steps.tick(now);
      const sheetIn = step === 0 ? ease(e / 1.2) : 1;
      $("sheet").setAttribute("transform", `translate(${(1 - sheetIn) * -60} 0)`);
      $("sheet").setAttribute("opacity", step === 2 ? 1 - 0.65 * ease(e / 0.8) : sheetIn);
      $("guide").setAttribute("opacity", step === 0 ? clamp01((e - 1.2) / 0.6) * 0.9 : 0);

      const ph = step === 1 ? clamp01(e / 1.5) : step === 2 ? 1 : 0;
      const po = step === 1 ? clamp01((e - 1.7) / 3.9) : step === 2 ? 1 : 0;
      cutHole.style.strokeDashoffset = lh * (1 - ph);
      cutOut.style.strokeDashoffset = lo * (1 - po);
      const showCuts = step === 1 || (step === 2 && e < 0.8);
      cutHole.setAttribute("opacity", showCuts ? 1 : 0);
      cutOut.setAttribute("opacity", showCuts ? 1 : 0);

      let toolOn = false, tp = null;
      if (step === 1 && e < 1.5) { tp = cutHole.getPointAtLength(lh * ph); toolOn = true; }
      else if (step === 1 && e > 1.7 && po < 1) { tp = cutOut.getPointAtLength(lo * po); toolOn = true; }
      tool.setAttribute("opacity", toolOn ? 1 : 0);
      if (tp) tool.setAttribute("transform", `translate(${tp.x} ${tp.y})`);
      chipEls.forEach((c) => {
        if (toolOn && c.life <= 0 && Math.random() < 0.25) { c.life = 1; c.x = tp.x; c.y = tp.y; c.a = Math.random() * 6.28; }
        if (c.life > 0) { c.life -= 0.05; c.x += Math.cos(c.a) * 2.2; c.y += Math.sin(c.a) * 2.2; }
        c.el.setAttribute("cx", c.x); c.el.setAttribute("cy", c.y); c.el.setAttribute("opacity", Math.max(0, c.life));
      });

      const lift = step === 2 ? ease(e / 0.9) : 0;
      $("piece").setAttribute("opacity", step === 2 ? 1 : 0);
      $("piece").setAttribute("transform", `translate(${C[0]} ${C[1] - lift * 10}) scale(${1 + lift * 0.05}) translate(${-C[0]} ${-C[1]})`);
      const drop = step === 2 ? ease((e - 0.9) / 0.8) : 0;
      $("insert").setAttribute("opacity", step === 2 ? clamp01((e - 0.9) / 0.3) : 0);
      $("insert").setAttribute("transform", `translate(0 ${(1 - drop) * -150 - lift * 10})`);
      const sc = step === 2 ? clamp01((e - 1.8) / 1.2) : 0;
      $("screw1").setAttribute("transform", `rotate(${sc * 540} ${C[0]} ${C[1] - 42})`);
      $("screw2").setAttribute("transform", `rotate(${sc * 540} ${C[0]} ${C[1] + 42})`);
      $("screw1").setAttribute("opacity", sc > 0 ? 1 : 0);
      $("screw2").setAttribute("opacity", sc > 0 ? 1 : 0);
      if (running) raf = requestAnimationFrame(frame);
    };
    document.querySelector('[data-steps="cnc"]').addEventListener("click", () => { if (reduceMotion) requestAnimationFrame(frame); });
    return {
      start() { steps.set(0, performance.now()); running = true; cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); },
      stop() { running = false; cancelAnimationFrame(raf); },
    };
  })();

  /* ───────── 6. Experiences timeline: drag, buttons, progress ───────── */
  const tl = document.getElementById("timeline");
  if (tl) {
    const bar = document.getElementById("tlBar");
    const items = [...tl.querySelectorAll(".tl__item")];
    items.forEach((it, i) => it.style.setProperty("--i", i));
    const update = () => {
      const max = tl.scrollWidth - tl.clientWidth;
      const vis = tl.clientWidth / tl.scrollWidth;
      const p = max > 0 ? tl.scrollLeft / max : 1;
      if (bar) bar.style.transform = `scaleX(${Math.min(1, vis + (1 - vis) * p)})`;
    };
    tl.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();

    let drag = null, moved = false;
    tl.addEventListener("pointerdown", (e) => {
      if (e.pointerType !== "mouse" || e.target.closest("a, button")) return;
      drag = { x: e.clientX, left: tl.scrollLeft }; moved = false;
    });
    window.addEventListener("pointermove", (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x;
      if (Math.abs(dx) > 4) { moved = true; tl.classList.add("is-dragging"); }
      tl.scrollLeft = drag.left - dx;
    });
    window.addEventListener("pointerup", () => { drag = null; tl.classList.remove("is-dragging"); });
    tl.addEventListener("click", (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);

    document.querySelectorAll(".xp__btn").forEach((b) => b.addEventListener("click", () => {
      const step = items[0].getBoundingClientRect().width * 0.7;
      tl.scrollBy({ left: Number(b.dataset.dir) * step, behavior: reduceMotion ? "auto" : "smooth" });
    }));

    new IntersectionObserver(([e], obs) => {
      if (!e.isIntersecting) return;
      tl.classList.add("is-in"); obs.disconnect();
    }, { threshold: 0.2 }).observe(tl);
  }

})();
