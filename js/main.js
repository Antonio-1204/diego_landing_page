(() => {
  'use strict';

  const BOOKING_ENDPOINT = '';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
  const prefersReducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const header = $('#site-header');
  const hero = $('#top');
  let lastFocused = null;

  function openLayer(layer) {
    lastFocused = document.activeElement;
    layer.hidden = false;
    document.documentElement.style.overflow = 'hidden';
    requestAnimationFrame(() => requestAnimationFrame(() => layer.classList.add('is-open')));
  }

  function closeLayer(layer) {
    layer.classList.remove('is-open');
    document.documentElement.style.overflow = '';
    setTimeout(() => {
      if (!layer.classList.contains('is-open')) layer.hidden = true;
    }, 450);
    if (lastFocused && lastFocused.focus) lastFocused.focus({ preventScroll: true });
  }

  function focusSoon(element) {
    setTimeout(() => element.focus({ preventScroll: true }), 50);
  }

  function updateHeader() {
    const threshold = hero.classList.contains('is-static') ? 60 : Math.max(60, window.innerHeight * 0.5);
    header.classList.toggle('is-solid', window.scrollY > threshold);
  }

  function initNavigation() {
    const toggle = $('#nav-toggle');
    const links = $$('#nav-menu a[href^="#"]:not(.btn)');
    const spy = { rootMargin: '-45% 0px -50% 0px' };

    function setMenu(open) {
      header.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      document.documentElement.style.overflow = open ? 'hidden' : '';
    }

    toggle.addEventListener('click', () => setMenu(!header.classList.contains('is-open')));
    $$('#nav-menu a').forEach((link) => link.addEventListener('click', () => setMenu(false)));
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && header.classList.contains('is-open')) setMenu(false);
    });

    const sections = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((link) => {
          link.classList.toggle('is-active', link.getAttribute('href') === `#${entry.target.id}`);
        });
      });
    }, spy);
    links.forEach((link) => {
      const section = $(link.getAttribute('href'));
      if (section) sections.observe(section);
    });

    new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) links.forEach((link) => link.classList.remove('is-active'));
    }, spy).observe(hero);
  }

  function initHero() {
    const video = $('#hero-video');
    const slides = $$('.hero-slide');
    const scrollHint = $('#hero-scroll-hint');
    const progressBar = $('#hero-progress-bar');
    const finePointer = matchMedia('(min-width: 768px) and (hover: hover) and (pointer: fine)').matches;
    const scrubWithScroll = finePointer && !prefersReducedMotion;
    let currentSlide = 0;

    function showSlide(index) {
      if (index === currentSlide) return;
      currentSlide = index;
      slides.forEach((slide, i) => {
        slide.dataset.hidden = String(i !== index);
      });
    }

    function playWhenReady() {
      video.addEventListener(
        'loadeddata',
        () => {
          video.classList.add('is-ready');
          video.play().catch(() => {});
        },
        { once: true },
      );
    }

    if (!scrubWithScroll) {
      hero.classList.add('is-static');
      scrollHint.dataset.hidden = 'false';
      if (prefersReducedMotion) return false;

      video.src = window.innerWidth < 768 ? video.dataset.srcMobile : video.dataset.srcDesktop;
      video.autoplay = true;
      playWhenReady();
      video.play().catch(() => {});
      setInterval(() => {
        if (!document.hidden && window.scrollY < window.innerHeight) {
          showSlide((currentSlide + 1) % slides.length);
        }
      }, 5200);
      return false;
    }

    video.src = video.dataset.srcDesktop;
    playWhenReady();

    const wrap = (time, duration) => ((time % duration) + duration) % duration;
    let current = 0;
    let target = 0;
    let lastProgress = null;
    let lastScrollAt = 0;
    let scrubbing = false;
    let wasInView = true;

    function frame(now) {
      const rect = hero.getBoundingClientRect();
      const distance = hero.offsetHeight - window.innerHeight;
      const progress = clamp(-rect.top / distance);
      const inView = rect.bottom > 0;
      const duration = video.duration;

      progressBar.style.setProperty('--progress', progress.toFixed(4));
      scrollHint.dataset.hidden = String(progress > 0.04);
      showSlide(progress < 0.34 ? 0 : progress < 0.7 ? 1 : 2);

      if (duration && video.readyState >= 2) {
        const delta = lastProgress === null ? 0 : progress - lastProgress;
        lastProgress = progress;

        if (Math.abs(delta) > 0.0002) {
          if (!scrubbing) {
            scrubbing = true;
            video.pause();
            current = target = video.currentTime;
          }
          target += delta * duration;
          lastScrollAt = now;
        }

        if (scrubbing) {
          current += (target - current) * 0.25;
          const time = wrap(current, duration - 0.04);
          if (!video.seeking && Math.abs(video.currentTime - time) > 0.01) video.currentTime = time;
          if (now - lastScrollAt > 220 && Math.abs(target - current) < 0.02) {
            scrubbing = false;
            if (inView) video.play().catch(() => {});
          }
        } else if (inView !== wasInView) {
          if (inView) video.play().catch(() => {});
          else video.pause();
        }
        wasInView = inView;
      }
      requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
    return true;
  }

  function initReveals() {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
    );
    $$('.reveal, .reveal-clip').forEach((element) => observer.observe(element));
  }

  function initCounters() {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          observer.unobserve(entry.target);

          const element = entry.target;
          const end = Number(element.dataset.count);
          const suffix = element.dataset.suffix || '';
          const duration = prefersReducedMotion ? 1 : 1600;
          const start = performance.now();

          const tick = (now) => {
            const elapsed = clamp((now - start) / duration);
            element.textContent = Math.round(end * (1 - Math.pow(1 - elapsed, 3))) + suffix;
            if (elapsed < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        });
      },
      { threshold: 0.6 },
    );
    $$('[data-count]').forEach((element) => observer.observe(element));
  }

  function initGallery() {
    const items = $$('#gallery-grid .gallery-item');
    const filters = $$('.filter');
    const lightbox = $('#lightbox');
    const stage = $('#lightbox-stage');
    const image = document.createElement('img');
    const caption = $('#lightbox-caption');
    const closeButton = $('#lightbox-close');
    let visibleItems = [];
    let index = 0;

    image.className = 'lightbox-image';
    image.alt = '';
    $('.lightbox-hint', stage).after(image);

    filters.forEach((button) => {
      const filter = button.dataset.filter;
      const matches = (item) => filter === 'all' || item.dataset.category === filter;
      $('sup', button).textContent = items.filter(matches).length;

      button.addEventListener('click', () => {
        filters.forEach((other) => other.setAttribute('aria-pressed', String(other === button)));
        items.forEach((item, i) => {
          const show = matches(item);
          item.classList.toggle('is-hidden', !show);
          item.classList.remove('is-entering');
          if (!show) return;
          item.classList.add('is-visible');
          void item.offsetWidth;
          item.style.animationDelay = `${(i % 9) * 40}ms`;
          item.classList.add('is-entering');
        });
      });
    });

    function render(direction = 0) {
      const item = visibleItems[index];
      const thumbnail = $('img', item);
      const count = document.createElement('span');
      const preload = new Image();

      image.style.transition = 'none';
      image.style.opacity = '0';
      image.style.transform = `translateX(${direction * 40}px)`;

      preload.onload = preload.onerror = () => {
        image.src = item.href;
        image.alt = thumbnail.alt;
        requestAnimationFrame(() => {
          image.style.transition = '';
          image.style.opacity = '1';
          image.style.transform = 'none';
        });
      };
      preload.src = item.href;

      count.className = 'lightbox-count';
      count.textContent = `${index + 1} / ${visibleItems.length}`;
      caption.replaceChildren(
        count,
        `${$('.gallery-item-label', item).textContent} · Photo: ${item.dataset.credit} / Unsplash`,
      );

      [index + 1, index - 1].forEach((i) => {
        const neighbour = visibleItems[(i + visibleItems.length) % visibleItems.length];
        if (neighbour) new Image().src = neighbour.href;
      });
    }

    function step(direction) {
      index = (index + direction + visibleItems.length) % visibleItems.length;
      render(direction);
    }

    function open(item) {
      visibleItems = items.filter((candidate) => !candidate.classList.contains('is-hidden'));
      index = Math.max(0, visibleItems.indexOf(item));
      openLayer(lightbox);
      render();
      focusSoon(closeButton);
    }

    const close = () => closeLayer(lightbox);

    items.forEach((item) => {
      item.addEventListener('click', (event) => {
        event.preventDefault();
        open(item);
      });
    });
    $('#lightbox-prev').addEventListener('click', () => step(-1));
    $('#lightbox-next').addEventListener('click', () => step(1));
    closeButton.addEventListener('click', close);
    stage.addEventListener('click', (event) => {
      if (event.target === stage) close();
    });

    let startX = null;
    let startY = 0;
    let deltaX = 0;

    stage.addEventListener('pointerdown', (event) => {
      if (event.target.closest('.lightbox-btn')) return;
      startX = event.clientX;
      startY = event.clientY;
      deltaX = 0;
      image.style.transition = 'none';
    });
    stage.addEventListener('pointermove', (event) => {
      if (startX === null) return;
      deltaX = event.clientX - startX;
      if (Math.abs(deltaX) > Math.abs(event.clientY - startY)) {
        image.style.transform = `translateX(${deltaX}px) rotate(${deltaX / 60}deg)`;
      }
    });

    function release() {
      if (startX === null) return;
      startX = null;
      image.style.transition = '';
      if (Math.abs(deltaX) > 60) step(deltaX < 0 ? 1 : -1);
      else image.style.transform = 'none';
    }
    ['pointerup', 'pointercancel', 'pointerleave'].forEach((type) => stage.addEventListener(type, release));

    document.addEventListener('keydown', (event) => {
      if (!lightbox.classList.contains('is-open')) return;
      if (event.key === 'Escape') close();
      if (event.key === 'ArrowRight') step(1);
      if (event.key === 'ArrowLeft') step(-1);
    });
  }

  function initFilms() {
    const modal = $('#video-modal');
    const player = $('#video-modal-player');
    const title = $('#video-modal-title');
    const closeButton = $('#video-modal-close');

    function close() {
      player.pause();
      closeLayer(modal);
      setTimeout(() => {
        player.removeAttribute('src');
        player.load();
      }, 420);
    }

    $$('.film-card').forEach((card) => {
      card.addEventListener('click', () => {
        const location = document.createElement('span');
        location.textContent = card.dataset.location;
        title.replaceChildren(card.dataset.title, location);

        player.src = card.dataset.src;
        player.poster = $('img', card).src;
        openLayer(modal);
        player.play().catch(() => {});
        focusSoon(closeButton);
      });
    });

    closeButton.addEventListener('click', close);
    modal.addEventListener('click', (event) => {
      if (event.target === modal) close();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && modal.classList.contains('is-open')) close();
    });
  }

  function initFaq() {
    if (prefersReducedMotion) return;

    $$('.faq-item').forEach((item) => {
      const summary = $('summary', item);
      const answer = $('.faq-answer', item);

      summary.addEventListener('click', (event) => {
        event.preventDefault();

        if (item.open) {
          answer.style.height = `${answer.scrollHeight}px`;
          requestAnimationFrame(() => {
            answer.style.height = '0px';
          });
          answer.addEventListener(
            'transitionend',
            () => {
              item.open = false;
              answer.style.height = '';
            },
            { once: true },
          );
          return;
        }

        $$('.faq-item[open]').forEach((other) => {
          if (other !== item) $('summary', other).click();
        });
        item.open = true;
        const height = answer.scrollHeight;
        answer.style.height = '0px';
        requestAnimationFrame(() => {
          answer.style.height = `${height}px`;
        });
        answer.addEventListener(
          'transitionend',
          () => {
            answer.style.height = '';
          },
          { once: true },
        );
      });
    });
  }

  async function submitBooking(booking) {
    if (!BOOKING_ENDPOINT) {
      return new Promise((resolve) => setTimeout(resolve, 900));
    }
    const response = await fetch(BOOKING_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(booking),
    });
    if (!response.ok) throw new Error(`Booking request failed with status ${response.status}`);
  }

  function initBooking() {
    const form = $('#booking-form');
    const fields = $$('.field input, .field select, .field textarea', form);
    const dateInput = $('#wedding-date');
    const serviceSelect = $('#service');
    const submitButton = $('#submit-btn');
    const submitLabel = $('.btn-label', submitButton);
    const formError = $('#form-error');
    const confirm = $('#confirm');
    const confirmClose = $('#confirm-close');

    const toIsoDate = (date) =>
      [date.getFullYear(), date.getMonth() + 1, date.getDate()].map((part) => String(part).padStart(2, '0')).join('-');
    const tomorrow = new Date();
    const latest = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    latest.setFullYear(latest.getFullYear() + 4);
    dateInput.min = toIsoDate(tomorrow);
    dateInput.max = toIsoDate(latest);

    function validate(input) {
      const field = input.closest('.field');
      const error = $('.field-error', field);
      let valid = input.checkValidity();
      if (valid && input.required && input.type === 'text') valid = input.value.trim().length >= 2;

      field.classList.toggle('is-invalid', !valid);
      input.setAttribute('aria-invalid', String(!valid));
      if (error) input.setAttribute('aria-describedby', error.id);
      return valid;
    }

    fields.forEach((input) => {
      input.addEventListener('blur', () => {
        if (input.value || input.dataset.touched) validate(input);
        input.dataset.touched = 'true';
      });
      input.addEventListener('input', () => {
        if (input.closest('.field').classList.contains('is-invalid')) validate(input);
      });
      input.addEventListener('change', () => {
        if (input.dataset.touched) validate(input);
      });
    });

    $$('[data-service]').forEach((link) => {
      link.addEventListener('click', () => {
        serviceSelect.value = link.dataset.service;
        validate(serviceSelect);
      });
    });

    function resetForm() {
      form.reset();
      fields.forEach((input) => {
        delete input.dataset.touched;
        input.removeAttribute('aria-invalid');
        input.closest('.field').classList.remove('is-invalid');
      });
    }

    function launchConfetti() {
      const layer = document.createElement('div');
      layer.className = 'confetti';
      for (let i = 0; i < 70; i += 1) {
        const piece = document.createElement('span');
        piece.className = 'confetti-piece';
        piece.style.left = `${Math.random() * 100}vw`;
        piece.style.setProperty('--drift', `${Math.random() * 200 - 100}px`);
        piece.style.setProperty('--spin', `${Math.random() * 720 - 360}deg`);
        piece.style.animationDuration = `${2.4 + Math.random() * 2.2}s`;
        piece.style.animationDelay = `${Math.random() * 0.6}s`;
        if (Math.random() > 0.6) {
          piece.style.borderRadius = '50%';
          piece.style.width = piece.style.height = '8px';
        }
        layer.append(piece);
      }
      document.body.append(layer);
      setTimeout(() => layer.remove(), 5600);
    }

    function showConfirmation(booking) {
      const [year, month, day] = booking['wedding-date'].split('-').map(Number);
      const date = new Date(year, month - 1, day).toLocaleDateString('en-US', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
      const rows = [
        ['Date', date],
        ['Venue', booking.venue],
        ['Service', booking.service],
        ['Guests', `about ${booking.guests}`],
        ['Contact', `${booking.email} · ${booking.phone}`],
      ];

      $('#confirm-names').textContent = `${booking.name} & ${booking['partner-name']}`;
      $('#confirm-summary').replaceChildren(
        ...rows.flatMap(([term, value]) => {
          const dt = document.createElement('dt');
          const dd = document.createElement('dd');
          dt.textContent = term;
          dd.textContent = value;
          return [dt, dd];
        }),
      );

      openLayer(confirm);
      focusSoon(confirmClose);
      if (!prefersReducedMotion) launchConfetti();
    }

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      formError.hidden = true;

      const invalid = fields.filter((input) => !validate(input));
      if (invalid.length) {
        invalid[0].focus();
        return;
      }

      const booking = Object.fromEntries([...new FormData(form)].map(([key, value]) => [key, String(value).trim()]));
      if (booking.company) {
        form.reset();
        return;
      }
      delete booking.company;
      booking.submittedAt = new Date().toISOString();

      submitButton.disabled = true;
      submitButton.classList.add('is-loading');
      submitLabel.textContent = 'Sending…';
      try {
        await submitBooking(booking);
        showConfirmation(booking);
        resetForm();
      } catch (error) {
        formError.hidden = false;
      } finally {
        submitButton.disabled = false;
        submitButton.classList.remove('is-loading');
        submitLabel.textContent = 'Book my date';
      }
    });

    const closeConfirmation = () => closeLayer(confirm);
    confirmClose.addEventListener('click', closeConfirmation);
    confirm.addEventListener('click', (event) => {
      if (event.target === confirm) closeConfirmation();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && confirm.classList.contains('is-open')) closeConfirmation();
    });
  }

  function initTextUs(alwaysVisible) {
    const button = $('#text-us');
    const update = () => {
      updateHeader();
      button.classList.toggle('is-visible', alwaysVisible || window.scrollY > 280);
    };
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', updateHeader);
    update();
    setTimeout(() => button.classList.add('is-visible'), 2500);
  }

  initNavigation();
  const heroScrubs = initHero();
  initReveals();
  initCounters();
  initGallery();
  initFilms();
  initFaq();
  initBooking();
  initTextUs(!heroScrubs);
  $('#year').textContent = new Date().getFullYear();
})();
