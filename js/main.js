// ============================================
// MAIN.JS — Homepage Logic
// ============================================

import { db } from './firebase-config.js';
import {
  collection, getDocs, query, where, orderBy, limit
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// ---- THEME ----
const themeToggle = document.getElementById('themeToggle');
const html = document.documentElement;

const savedTheme = localStorage.getItem('theme') || 'dark';
html.setAttribute('data-theme', savedTheme);

themeToggle?.addEventListener('click', () => {
  const current = html.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
});

// ---- NAV SCROLL ----
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  nav?.classList.toggle('scrolled', window.scrollY > 20);
});

// ---- MOBILE MENU ----
const burger = document.getElementById('navBurger');
const mobileMenu = document.getElementById('mobileMenu');

burger?.addEventListener('click', () => {
  mobileMenu?.classList.toggle('open');
});

mobileMenu?.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => mobileMenu.classList.remove('open'));
});

// ---- REVEAL ON SCROLL ----
const reveals = document.querySelectorAll('.reveal');
const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      observer.unobserve(e.target);
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

reveals.forEach(el => observer.observe(el));

// ---- COUNTER ANIMATION ----
function animateCounter(el) {
  const target = +el.dataset.count;
  const duration = 2000;
  const step = target / (duration / 16);
  let current = 0;

  const timer = setInterval(() => {
    current += step;
    if (current >= target) {
      current = target;
      clearInterval(timer);
    }
    el.textContent = Math.floor(current).toLocaleString();
  }, 16);
}

const statsObs = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.querySelectorAll('.stat-num').forEach(animateCounter);
      statsObs.unobserve(e.target);
    }
  });
}, { threshold: 0.3 });

document.querySelector('.stats')?.let?.(el => statsObs.observe(el));
// Polyfill for .let
const statsEl = document.querySelector('.stats');
if (statsEl) statsObs.observe(statsEl);

// ---- LIGHTBOX ----
let lightboxImages = [];
let lightboxIndex = 0;

const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightboxImg');
const lightboxCaption = document.getElementById('lightboxCaption');
const lightboxClose = document.getElementById('lightboxClose');
const lightboxPrev = document.getElementById('lightboxPrev');
const lightboxNext = document.getElementById('lightboxNext');

function openLightbox(images, index) {
  lightboxImages = images;
  lightboxIndex = index;
  updateLightbox();
  lightbox.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  lightbox.classList.remove('open');
  document.body.style.overflow = '';
}

function updateLightbox() {
  const img = lightboxImages[lightboxIndex];
  if (!img) return;
  lightboxImg.src = img.url;
  lightboxImg.alt = img.title || '';
  lightboxCaption.textContent = `${img.title || ''} ${img.category ? '— ' + img.category : ''}`;
}

lightboxClose?.addEventListener('click', closeLightbox);
lightbox?.addEventListener('click', e => { if (e.target === lightbox) closeLightbox(); });

lightboxPrev?.addEventListener('click', () => {
  lightboxIndex = (lightboxIndex - 1 + lightboxImages.length) % lightboxImages.length;
  updateLightbox();
});

lightboxNext?.addEventListener('click', () => {
  lightboxIndex = (lightboxIndex + 1) % lightboxImages.length;
  updateLightbox();
});

document.addEventListener('keydown', e => {
  if (!lightbox?.classList.contains('open')) return;
  if (e.key === 'Escape') closeLightbox();
  if (e.key === 'ArrowLeft') lightboxPrev?.click();
  if (e.key === 'ArrowRight') lightboxNext?.click();
});

// ---- LAZY IMAGE LOADING ----
function lazyLoad() {
  const images = document.querySelectorAll('img[data-src]');
  const imgObs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        const img = e.target;
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
        imgObs.unobserve(img);
      }
    });
  }, { rootMargin: '200px' });

  images.forEach(img => imgObs.observe(img));
}

// ---- LOAD FEATURED PHOTOS ----
async function loadFeaturedPhotos() {
  const grid = document.getElementById('featuredGrid');
  if (!grid) return;

  try {
    const q = query(
      collection(db, 'photos'),
      where('featured', '==', true),
      orderBy('order'),
      limit(5)
    );
    const snap = await getDocs(q);

    if (snap.empty) {
      // Show placeholder cards
      grid.innerHTML = getPlaceholderCards();
      return;
    }

    const photos = [];
    snap.forEach(doc => photos.push({ id: doc.id, ...doc.data() }));

    grid.innerHTML = photos.map((photo, i) => `
      <div class="photo-card" data-index="${i}">
        <img data-src="${photo.url}" alt="${photo.title || ''}" loading="lazy" />
        <div class="photo-card-info">
          <span class="photo-card-cat">${photo.category || ''}</span>
          <div class="photo-card-title">${photo.title || 'Untitled'}</div>
        </div>
      </div>
    `).join('');

    // Attach lightbox to cards
    grid.querySelectorAll('.photo-card').forEach((card, i) => {
      card.addEventListener('click', () => openLightbox(photos, i));
    });

    lazyLoad();
  } catch (err) {
    console.warn('Firebase not configured yet. Showing placeholders.', err);
    grid.innerHTML = getPlaceholderCards();
  }
}

function getPlaceholderCards() {
  const cats = ['Wedding', 'Pre-Wedding', 'Events', 'Fashion', 'Wedding'];
  return cats.map((cat, i) => `
    <div class="photo-card">
      <div class="photo-card-placeholder" style="
        min-height:${i===0?'420px':'200px'};
        background:linear-gradient(135deg,var(--bg3),var(--bg2));
        display:flex;align-items:center;justify-content:center;
        aspect-ratio:${i===0?'4/5':'4/3'}
      ">
        <span style="font-size:0.75rem;color:var(--text-muted);letter-spacing:0.1em">${cat}</span>
      </div>
      <div class="photo-card-info" style="opacity:1;transform:none">
        <span class="photo-card-cat">${cat}</span>
        <div class="photo-card-title">Sample Photo ${i+1}</div>
      </div>
    </div>
  `).join('');
}

// Export openLightbox for other pages
window.openLightbox = openLightbox;

// ---- INIT ----
loadFeaturedPhotos();
