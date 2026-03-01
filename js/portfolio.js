// ============================================
// PORTFOLIO.JS — Gallery with filters
// ============================================

import { db } from './js/firebase-config.js';
import {
  collection, getDocs, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// Theme
const themeToggle = document.getElementById('themeToggle');
const html = document.documentElement;
html.setAttribute('data-theme', localStorage.getItem('theme') || 'dark');
themeToggle?.addEventListener('click', () => {
  const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
});

// Nav
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => nav?.classList.toggle('scrolled', window.scrollY > 20));

// Mobile menu
document.getElementById('navBurger')?.addEventListener('click', () => {
  document.getElementById('mobileMenu')?.classList.toggle('open');
});

// ---- LIGHTBOX ----
let lightboxImages = [];
let lightboxIndex = 0;
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightboxImg');
const lightboxCaption = document.getElementById('lightboxCaption');

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
  lightboxCaption.textContent = `${img.title || ''} — ${img.category || ''}`;
}

document.getElementById('lightboxClose')?.addEventListener('click', closeLightbox);
lightbox?.addEventListener('click', e => { if (e.target === lightbox) closeLightbox(); });
document.getElementById('lightboxPrev')?.addEventListener('click', () => {
  lightboxIndex = (lightboxIndex - 1 + lightboxImages.length) % lightboxImages.length;
  updateLightbox();
});
document.getElementById('lightboxNext')?.addEventListener('click', () => {
  lightboxIndex = (lightboxIndex + 1) % lightboxImages.length;
  updateLightbox();
});
document.addEventListener('keydown', e => {
  if (!lightbox?.classList.contains('open')) return;
  if (e.key === 'Escape') closeLightbox();
  if (e.key === 'ArrowLeft') lightboxIndex = (lightboxIndex - 1 + lightboxImages.length) % lightboxImages.length, updateLightbox();
  if (e.key === 'ArrowRight') lightboxIndex = (lightboxIndex + 1) % lightboxImages.length, updateLightbox();
});

// ---- GALLERY ----
let allPhotos = [];
const masonry = document.getElementById('masonryGallery');

function renderGallery(photos) {
  if (!masonry) return;

  if (photos.length === 0) {
    masonry.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:3rem;">No photos in this category yet.</p>';
    return;
  }

  masonry.innerHTML = photos.map((photo, i) => `
    <div class="masonry-item" data-category="${photo.category}" data-index="${i}">
      <img 
        data-src="${photo.url}" 
        src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'%3E%3C/svg%3E"
        alt="${photo.title || ''}"
        loading="lazy"
      />
    </div>
  `).join('');

  // Lazy load
  const imgs = masonry.querySelectorAll('img[data-src]');
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        const img = e.target;
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
        obs.unobserve(img);
      }
    });
  }, { rootMargin: '300px' });
  imgs.forEach(img => obs.observe(img));

  // Lightbox
  masonry.querySelectorAll('.masonry-item').forEach(item => {
    item.addEventListener('click', () => {
      const idx = +item.dataset.index;
      openLightbox(photos, idx);
    });
  });
}

// ---- FILTERS ----
const filterBtns = document.querySelectorAll('.filter-btn');
let activeFilter = 'All';

// Check URL param
const urlCat = new URLSearchParams(window.location.search).get('cat');
if (urlCat) activeFilter = urlCat;

filterBtns.forEach(btn => {
  if (btn.dataset.filter === activeFilter) btn.classList.add('active');
  btn.addEventListener('click', () => {
    activeFilter = btn.dataset.filter;
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const filtered = activeFilter === 'All'
      ? allPhotos
      : allPhotos.filter(p => p.category === activeFilter);

    renderGallery(filtered);
  });
});

// ---- LOAD FROM FIREBASE ----
async function loadPhotos() {
  try {
    const q = query(collection(db, 'photos'), orderBy('order'));
    const snap = await getDocs(q);

    if (snap.empty) {
      allPhotos = getSamplePhotos();
    } else {
      snap.forEach(doc => allPhotos.push({ id: doc.id, ...doc.data() }));
    }
  } catch (err) {
    console.warn('Firebase not configured. Using sample data.', err);
    allPhotos = getSamplePhotos();
  }

  const filtered = activeFilter === 'All'
    ? allPhotos
    : allPhotos.filter(p => p.category === activeFilter);

  renderGallery(filtered);
}

function getSamplePhotos() {
  const cats = ['Wedding', 'Wedding', 'Pre-Wedding', 'Events', 'Fashion', 'Wedding', 'Fashion', 'Pre-Wedding', 'Events', 'Wedding', 'Fashion', 'Events'];
  return cats.map((cat, i) => ({
    id: `sample-${i}`,
    url: `https://picsum.photos/seed/${cat}${i}/600/${300 + (i % 3) * 100}`,
    title: `${cat} Photo ${i+1}`,
    category: cat,
    order: i
  }));
}

loadPhotos();
