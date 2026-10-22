/* ==========================================================================
   UKM Kewirausahaan UNU Purwokerto — Landing Page Interactions
   Vanilla JS, no dependencies. Every module is independent and fails
   silently if its markup is absent, so sections can be edited freely.
   --------------------------------------------------------------------------
   1.  Utilities
   2.  Header scroll state
   3.  Mobile menu
   4.  Scroll spy (active nav link)
   5.  Reveal on scroll
   6.  Animated counters
   7.  Pengurus filter
   8.  FAQ accordion
   9.  Gallery lightbox
   10. Back-to-top button
   ========================================================================== */

(function () {
  "use strict";

  /* ---------- 1. Utilities ---------- */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  let reduceMotion = motionQuery.matches;
  motionQuery.addEventListener("change", (e) => {
    reduceMotion = e.matches;
  });

  const supportsIO = "IntersectionObserver" in window;

  /** Feature-detect WebP so we can mirror the browser's <picture> choice. */
  const supportsWebP = (() => {
    try {
      const c = document.createElement("canvas");
      c.width = c.height = 1;
      return c.toDataURL("image/webp").indexOf("data:image/webp") === 0;
    } catch (e) {
      return false;
    }
  })();

  /** Throttle to one call per animation frame. */
  function rafThrottle(fn) {
    let ticking = false;
    return function (...args) {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        fn.apply(this, args);
      });
    };
  }

  /* ---------- 2. Header scroll state ---------- */
  function initHeader() {
    const header = $("#header");
    if (!header) return;

    const onScroll = rafThrottle(() => {
      header.classList.toggle("scrolled", window.scrollY > 40);
    });

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ---------- 3. Mobile menu ---------- */
  function initMobileMenu() {
    const burger = $("#burger");
    const menu = $("#mobileMenu");
    if (!burger || !menu) return;

    const setOpen = (open) => {
      menu.classList.toggle("open", open);
      burger.setAttribute("aria-expanded", open ? "true" : "false");
      burger.setAttribute("aria-label", open ? "Tutup menu navigasi" : "Buka menu navigasi");
    };

    burger.addEventListener("click", (e) => {
      e.stopPropagation();
      setOpen(!menu.classList.contains("open"));
    });

    // Close after choosing a destination
    $$("a", menu).forEach((a) => {
      a.addEventListener("click", () => setOpen(false));
    });

    // Click outside
    document.addEventListener("click", (e) => {
      if (!menu.classList.contains("open")) return;
      if (menu.contains(e.target) || burger.contains(e.target)) return;
      setOpen(false);
    });

    // Escape key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && menu.classList.contains("open")) {
        setOpen(false);
        burger.focus();
      }
    });

    // Reset when resizing back to the desktop layout
    window.addEventListener("resize", () => {
      if (window.innerWidth > 820 && menu.classList.contains("open")) {
        setOpen(false);
      }
    });
  }

  /* ---------- 4b. Avatar photo fallback ----------
     If a member photo file is missing, remove the <img> so the initials
     underneath stay visible instead of a broken-image icon. */
  function initAvatarFallback() {
    document.addEventListener(
      "error",
      (ev) => {
        const el = ev.target;
        if (el && el.classList && el.classList.contains("ava-photo")) {
          el.remove();
        }
      },
      true // capture: the error event does not bubble
    );
  }

  /* ---------- 4. Scroll spy (active nav link) ---------- */
  function initScrollSpy() {
    const links = $$(".nav-links a[href^='#']");
    if (!links.length || !supportsIO) return;

    const map = new Map();
    const sections = [];

    links.forEach((link) => {
      const id = link.getAttribute("href").slice(1);
      if (!id) return;
      const section = document.getElementById(id);
      if (!section) return;
      if (!map.has(id)) map.set(id, []);
      map.get(id).push(link);
      sections.push(section);
    });

    if (!sections.length) return;

    const setActive = (id) => {
      links.forEach((l) => l.classList.remove("active"));
      (map.get(id) || []).forEach((l) => l.classList.add("active"));
    };

    // Track which section currently owns the upper third of the viewport.
    const visible = new Map();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          visible.set(entry.target.id, entry.isIntersecting ? entry.intersectionRatio : 0);
        });

        let bestId = null;
        let bestRatio = 0;
        visible.forEach((ratio, id) => {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestId = id;
          }
        });

        if (bestId) setActive(bestId);
      },
      { rootMargin: "-20% 0px -55% 0px", threshold: [0, 0.15, 0.4, 0.75, 1] }
    );

    sections.forEach((s) => observer.observe(s));
  }

  /* ---------- 5. Reveal on scroll ---------- */
  function initReveal() {
    const items = $$(".rv");
    if (!items.length) return;

    const showAll = () => items.forEach((el) => el.classList.add("in"));

    if (!supportsIO || reduceMotion) {
      showAll();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("in");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12 }
    );

    items.forEach((el) => observer.observe(el));

    // Safety net: never leave content permanently hidden.
    window.setTimeout(showAll, 2500);
  }

  /* ---------- 6. Animated counters ---------- */
  function initCounters() {
    const counters = $$("[data-count]");
    if (!counters.length) return;

    const formatID = (n) => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");

    const animate = (el) => {
      const target = parseInt(el.getAttribute("data-count"), 10);
      if (Number.isNaN(target)) return;

      if (reduceMotion) {
        el.textContent = formatID(target);
        return;
      }

      const duration = 1600;
      let start = null;

      const step = (ts) => {
        if (start === null) start = ts;
        const progress = Math.min((ts - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = formatID(Math.round(target * eased));
        if (progress < 1) requestAnimationFrame(step);
      };

      requestAnimationFrame(step);
    };

    if (!supportsIO) {
      counters.forEach(animate);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          animate(entry.target);
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.4 }
    );

    counters.forEach((el) => observer.observe(el));
  }

  /* ---------- 7. Pengurus filter ---------- */
  function initMemberFilter() {
    const chips = $$(".chip");
    // Each unit of the org chart carries a data-cat. Units are dimmed rather
    // than removed so the shape of the chart stays readable while filtering.
    const units = $$(".org-unit");
    if (!chips.length || !units.length) return;

    chips.forEach((chip) => {
      chip.addEventListener("click", () => {
        chips.forEach((c) => {
          c.classList.remove("active");
          c.setAttribute("aria-pressed", "false");
        });
        chip.classList.add("active");
        chip.setAttribute("aria-pressed", "true");

        const filter = chip.getAttribute("data-filter");
        units.forEach((u) => {
          const cat = u.getAttribute("data-cat");
          // Hendaknya pimpinan (Pembina + CEO) selalu terlihat agar konteks
          // bagan tetap utuh.
          const on = filter === "semua" || cat === filter || cat === "pimpinan";
          u.classList.toggle("is-dim", !on);
        });
      });
    });
  }

  /* ---------- 8. FAQ accordion ---------- */
  function initFaq() {
    const items = $$(".faq-item");
    if (!items.length) return;

    const close = (item) => {
      item.classList.remove("open");
      const answer = $(".faq-a", item);
      const q = $(".faq-q", item);
      if (answer) answer.style.maxHeight = "0px";
      if (q) q.setAttribute("aria-expanded", "false");
    };

    items.forEach((item) => {
      const q = $(".faq-q", item);
      const a = $(".faq-a", item);
      if (!q || !a) return;

      q.addEventListener("click", () => {
        const isOpen = item.classList.contains("open");

        // Only one panel stays open at a time
        items.forEach((other) => {
          if (other !== item) close(other);
        });

        if (isOpen) {
          close(item);
          return;
        }

        item.classList.add("open");
        q.setAttribute("aria-expanded", "true");
        a.style.maxHeight = a.scrollHeight + "px";
      });

      // Keep the panel correctly sized when the viewport is resized
      window.addEventListener("resize", () => {
        if (item.classList.contains("open")) {
          a.style.maxHeight = a.scrollHeight + "px";
        }
      });
    });
  }

  /* ---------- 9. Gallery lightbox ---------- */
  function initLightbox() {
    const lightbox = $("#lightbox");
    const lbImg = $("#lightboxImg");
    const lbCap = $("#lightboxCap");
    const lbClose = $("#lightboxClose");
    const lbPrev = $("#lightboxPrev");
    const lbNext = $("#lightboxNext");
    const lbCount = $("#lightboxCount");
    const figures = $$(".gal-item");

    if (!lightbox || !lbImg || !lbCap || !figures.length) return;

    let index = 0;
    let lastFocused = null;

    const captionOf = (fig) => fig.getAttribute("data-cap") || "";

    // Resolve the file the browser actually renders.
    //  1. currentSrc — what is on screen right now (a WebP variant when the
    //     browser supports it). Empty while a lazy <picture> is still deferred.
    //  2. the <source> candidates inside the <picture> wrapper.
    //  3. the src attribute — the plain fallback, always valid.
    const resolveSource = (img) => {
      if (img.currentSrc) return img.currentSrc;

      const picture = img.closest("picture");
      if (picture && supportsWebP) {
        for (const source of picture.querySelectorAll("source")) {
          const type = (source.getAttribute("type") || "").toLowerCase();
          if (type.indexOf("webp") < 0) continue;
          const first = (source.getAttribute("srcset") || "").split(",")[0];
          const url = first.trim().split(/\s+/)[0];
          if (url) return new URL(url, document.baseURI).href;
        }
      }

      return img.src;
    };

    const render = () => {
      const fig = figures[index];
      const img = $("img", fig);
      if (!img) return;

      lbImg.src = resolveSource(img);
      lbImg.alt = img.alt || "";
      lbCap.innerHTML = captionOf(fig);

      if (lbCount) {
        lbCount.textContent = `${index + 1} / ${figures.length}`;
      }

      const multiple = figures.length > 1;
      if (lbPrev) lbPrev.hidden = !multiple;
      if (lbNext) lbNext.hidden = !multiple;
    };

    const open = (i) => {
      index = i;
      lastFocused = document.activeElement;
      render();
      lightbox.classList.add("open");
      document.body.classList.add("is-locked");
      if (lbClose) lbClose.focus();
    };

    const close = () => {
      lightbox.classList.remove("open");
      document.body.classList.remove("is-locked");
      if (lastFocused && typeof lastFocused.focus === "function") {
        lastFocused.focus();
      }
    };

    const step = (dir) => {
      index = (index + dir + figures.length) % figures.length;
      render();
    };

    figures.forEach((fig, i) => {
      fig.addEventListener("click", () => open(i));
      fig.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          open(i);
        }
      });
    });

    if (lbClose) lbClose.addEventListener("click", close);
    if (lbPrev) lbPrev.addEventListener("click", (e) => { e.stopPropagation(); step(-1); });
    if (lbNext) lbNext.addEventListener("click", (e) => { e.stopPropagation(); step(1); });

    // Click on the backdrop closes the lightbox
    lightbox.addEventListener("click", (ev) => {
      if (ev.target === lightbox) close();
    });

    document.addEventListener("keydown", (ev) => {
      if (!lightbox.classList.contains("open")) return;

      if (ev.key === "Escape") {
        ev.preventDefault();
        close();
      } else if (ev.key === "ArrowLeft") {
        ev.preventDefault();
        step(-1);
      } else if (ev.key === "ArrowRight") {
        ev.preventDefault();
        step(1);
      } else if (ev.key === "Tab") {
        // Trap focus inside the dialog
        const focusables = $$("button, [href], [tabindex]:not([tabindex='-1'])", lightbox)
          .filter((el) => !el.hidden && el.offsetParent !== null);
        if (!focusables.length) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (ev.shiftKey && document.activeElement === first) {
          ev.preventDefault();
          last.focus();
        } else if (!ev.shiftKey && document.activeElement === last) {
          ev.preventDefault();
          first.focus();
        }
      }
    });
  }

  /* ---------- 10. Back-to-top button ---------- */
  function initBackToTop() {
    const btn = $("#toTop");
    if (!btn) return;

    const onScroll = rafThrottle(() => {
      btn.classList.toggle("show", window.scrollY > 600);
    });

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    btn.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    });
  }

  /* ---------- Boot ---------- */
  function init() {
    initHeader();
    initMobileMenu();
    initAvatarFallback();
    initScrollSpy();
    initReveal();
    initCounters();
    initMemberFilter();
    initFaq();
    initLightbox();
    initBackToTop();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
