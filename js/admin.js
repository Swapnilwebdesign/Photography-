// ============================================
// ADMIN.JS — Dashboard Logic
// ============================================

import { auth, db, storage } from './firebase-config.js';
import {
  onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import {
  collection, getDocs, addDoc, deleteDoc, updateDoc,
  doc, query, orderBy, serverTimestamp, getCountFromServer
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
import {
  ref, uploadBytesResumable, getDownloadURL, deleteObject
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-storage.js";

// ---- AUTH GUARD ----
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = 'login.html';
  } else {
    document.getElementById('adminEmail').textContent = user.email;
    initDashboard();
  }
});

// ---- THEME ----
const html = document.documentElement;
html.setAttribute('data-theme', localStorage.getItem('theme') || 'dark');
document.getElementById('themeToggle')?.addEventListener('click', () => {
  const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
});

// ---- LOGOUT ----
document.getElementById('logoutBtn')?.addEventListener('click', async () => {
  await signOut(auth);
  window.location.href = 'login.html';
});

// ---- NAVIGATION ----
const navItems = document.querySelectorAll('.admin-nav-item');
const panels = document.querySelectorAll('.admin-panel');

navItems.forEach(item => {
  item.addEventListener('click', () => {
    navItems.forEach(n => n.classList.remove('active'));
    panels.forEach(p => p.classList.remove('active'));
    item.classList.add('active');
    const panelId = `panel-${item.dataset.panel}`;
    document.getElementById(panelId)?.classList.add('active');

    // Load data for active panel
    if (item.dataset.panel === 'manage') loadPhotosGrid();
    if (item.dataset.panel === 'categories') loadCategories();
    if (item.dataset.panel === 'inquiries') loadInquiries();
  });
});

// ---- TOAST ----
function toast(msg, duration = 3000) {
  const el = document.getElementById('adminToast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), duration);
}

// ---- INIT DASHBOARD ----
async function initDashboard() {
  await loadStats();
  await loadRecentInquiries();
}

// ---- STATS ----
async function loadStats() {
  try {
    const photosSnap = await getCountFromServer(collection(db, 'photos'));
    const featuredSnap = await getDocs(query(collection(db, 'photos')));
    const catsSnap = await getCountFromServer(collection(db, 'categories'));
    const inquiriesSnap = await getCountFromServer(collection(db, 'inquiries'));

    let featured = 0;
    featuredSnap.forEach(d => { if (d.data().featured) featured++; });

    document.getElementById('statPhotos').textContent = photosSnap.data().count;
    document.getElementById('statFeatured').textContent = featured;
    document.getElementById('statCategories').textContent = catsSnap.data().count || 4;
    document.getElementById('statInquiries').textContent = inquiriesSnap.data().count;
  } catch (err) {
    console.warn('Stats load error (Firebase not configured?):', err);
    document.getElementById('statPhotos').textContent = '0';
    document.getElementById('statFeatured').textContent = '0';
    document.getElementById('statCategories').textContent = '4';
    document.getElementById('statInquiries').textContent = '0';
  }
}

// ---- RECENT INQUIRIES ----
async function loadRecentInquiries() {
  const container = document.getElementById('recentInquiries');
  try {
    const snap = await getDocs(query(collection(db, 'inquiries'), orderBy('createdAt', 'desc')));
    if (snap.empty) {
      container.innerHTML = '<p style="color:var(--text-muted);font-size:0.9rem">No inquiries yet.</p>';
      return;
    }
    let html = '';
    let count = 0;
    snap.forEach(d => {
      if (count++ > 4) return;
      const data = d.data();
      html += `
        <div style="padding:1rem;border:1px solid var(--border);display:flex;justify-content:space-between;align-items:flex-start;gap:1rem">
          <div>
            <strong style="font-size:0.9rem">${data.name || 'Unknown'}</strong>
            <span style="color:var(--text-muted);font-size:0.8rem;margin-left:1rem">${data.email || ''}</span>
            <p style="font-size:0.85rem;color:var(--text-muted);margin-top:0.3rem">${(data.message || '').substring(0, 100)}…</p>
          </div>
          <span style="font-size:0.7rem;color:var(--accent);white-space:nowrap;padding:0.3rem 0.8rem;border:1px solid var(--accent)">${data.service || 'General'}</span>
        </div>
      `;
    });
    container.innerHTML = html;
  } catch (err) {
    container.innerHTML = '<p style="color:var(--text-muted);font-size:0.9rem">Configure Firebase to view inquiries.</p>';
  }
}

// ---- UPLOAD PHOTO ----
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const uploadPreview = document.getElementById('uploadPreview');
let selectedFile = null;

uploadArea?.addEventListener('click', () => fileInput.click());

uploadArea?.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadArea.classList.add('dragover');
});

uploadArea?.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));

uploadArea?.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadArea.classList.remove('dragover');
  handleFileSelect(e.dataTransfer.files[0]);
});

fileInput?.addEventListener('change', () => handleFileSelect(fileInput.files[0]));

function handleFileSelect(file) {
  if (!file || !file.type.startsWith('image/')) return;
  selectedFile = file;
  const reader = new FileReader();
  reader.onload = (e) => {
    uploadPreview.src = e.target.result;
    uploadPreview.style.display = 'block';
  };
  reader.readAsDataURL(file);
}

document.getElementById('uploadForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!selectedFile) {
    toast('Please select an image first');
    return;
  }

  const category = document.getElementById('photoCategory').value;
  if (!category) {
    toast('Please select a category');
    return;
  }

  const btn = document.getElementById('uploadBtn');
  const progress = document.getElementById('uploadProgress');
  btn.disabled = true;
  btn.textContent = 'Uploading…';
  progress.textContent = '';

  try {
    // Upload to Firebase Storage
    const filename = `photos/${Date.now()}_${selectedFile.name.replace(/\s/g, '_')}`;
    const storageRef = ref(storage, filename);
    const uploadTask = uploadBytesResumable(storageRef, selectedFile);

    uploadTask.on('state_changed',
      (snap) => {
        const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
        progress.textContent = `Uploading: ${pct}%`;
      },
      (err) => {
        throw err;
      },
      async () => {
        const url = await getDownloadURL(uploadTask.snapshot.ref);

        // Save to Firestore
        await addDoc(collection(db, 'photos'), {
          url,
          storagePath: filename,
          title: document.getElementById('photoTitle').value || '',
          category,
          featured: document.getElementById('photoFeatured').checked,
          order: +document.getElementById('photoOrder').value || 0,
          createdAt: serverTimestamp()
        });

        toast('Photo uploaded successfully! ✓');
        e.target.reset();
        selectedFile = null;
        uploadPreview.style.display = 'none';
        progress.textContent = '';
        btn.disabled = false;
        btn.textContent = 'Upload Photo';
        await loadStats();
      }
    );
  } catch (err) {
    console.error(err);
    toast('Upload failed. Check Firebase configuration.');
    btn.disabled = false;
    btn.textContent = 'Upload Photo';
    progress.textContent = '';
  }
});

// ---- MANAGE PHOTOS ----
let allPhotos = [];
let deleteTarget = null;
let editTarget = null;

async function loadPhotosGrid() {
  const grid = document.getElementById('adminPhotoGrid');
  grid.innerHTML = '<p style="color:var(--text-muted);grid-column:1/-1">Loading…</p>';

  try {
    const snap = await getDocs(query(collection(db, 'photos'), orderBy('order')));
    allPhotos = [];
    snap.forEach(d => allPhotos.push({ id: d.id, ...d.data() }));
    renderPhotosGrid(allPhotos);
  } catch (err) {
    grid.innerHTML = '<p style="color:var(--text-muted);grid-column:1/-1">Configure Firebase to manage photos.</p>';
  }
}

function renderPhotosGrid(photos) {
  const grid = document.getElementById('adminPhotoGrid');
  if (photos.length === 0) {
    grid.innerHTML = '<p style="color:var(--text-muted);grid-column:1/-1">No photos found.</p>';
    return;
  }

  grid.innerHTML = photos.map(photo => `
    <div class="admin-photo-item">
      <img src="${photo.url}" alt="${photo.title || ''}" loading="lazy" />
      <div class="admin-photo-actions">
        <button class="admin-photo-btn edit" data-id="${photo.id}" title="Edit">✎</button>
        <button class="admin-photo-btn delete" data-id="${photo.id}" data-path="${photo.storagePath || ''}" title="Delete">✕</button>
      </div>
      <div class="admin-photo-cat">${photo.category || ''}${photo.featured ? ' ★' : ''}</div>
    </div>
  `).join('');

  // Edit buttons
  grid.querySelectorAll('.admin-photo-btn.edit').forEach(btn => {
    btn.addEventListener('click', () => {
      const photo = allPhotos.find(p => p.id === btn.dataset.id);
      if (!photo) return;
      editTarget = photo;
      document.getElementById('editCategory').value = photo.category || 'Wedding';
      document.getElementById('editTitle').value = photo.title || '';
      document.getElementById('editFeatured').checked = photo.featured || false;
      document.getElementById('editModal').classList.add('open');
    });
  });

  // Delete buttons
  grid.querySelectorAll('.admin-photo-btn.delete').forEach(btn => {
    btn.addEventListener('click', () => {
      deleteTarget = { id: btn.dataset.id, path: btn.dataset.path };
      document.getElementById('deleteModal').classList.add('open');
    });
  });
}

// Delete modal
document.getElementById('cancelDelete')?.addEventListener('click', () => {
  document.getElementById('deleteModal').classList.remove('open');
  deleteTarget = null;
});

document.getElementById('confirmDelete')?.addEventListener('click', async () => {
  if (!deleteTarget) return;
  try {
    await deleteDoc(doc(db, 'photos', deleteTarget.id));
    if (deleteTarget.path) {
      try { await deleteObject(ref(storage, deleteTarget.path)); } catch (e) {}
    }
    toast('Photo deleted');
    document.getElementById('deleteModal').classList.remove('open');
    deleteTarget = null;
    await loadPhotosGrid();
    await loadStats();
  } catch (err) {
    toast('Delete failed. Check permissions.');
  }
});

// Edit modal
document.getElementById('cancelEdit')?.addEventListener('click', () => {
  document.getElementById('editModal').classList.remove('open');
  editTarget = null;
});

document.getElementById('confirmEdit')?.addEventListener('click', async () => {
  if (!editTarget) return;
  try {
    await updateDoc(doc(db, 'photos', editTarget.id), {
      category: document.getElementById('editCategory').value,
      title: document.getElementById('editTitle').value,
      featured: document.getElementById('editFeatured').checked
    });
    toast('Photo updated ✓');
    document.getElementById('editModal').classList.remove('open');
    editTarget = null;
    await loadPhotosGrid();
  } catch (err) {
    toast('Update failed.');
  }
});

// Filter
document.getElementById('manageFilter')?.addEventListener('change', (e) => {
  const val = e.target.value;
  const filtered = val === 'All' ? allPhotos : allPhotos.filter(p => p.category === val);
  renderPhotosGrid(filtered);
});

// ---- CATEGORIES ----
const defaultCategories = ['Wedding', 'Pre-Wedding', 'Events', 'Fashion'];

async function loadCategories() {
  const list = document.getElementById('categoriesList');
  let cats = [...defaultCategories];

  try {
    const snap = await getDocs(collection(db, 'categories'));
    if (!snap.empty) {
      cats = [];
      snap.forEach(d => cats.push(d.data().name));
    }
  } catch (err) {}

  // Update category selects
  const selects = document.querySelectorAll('#photoCategory, #editCategory');
  selects.forEach(sel => {
    const current = sel.value;
    sel.innerHTML = '<option value="">Select category</option>' +
      cats.map(c => `<option${c === current ? ' selected' : ''}>${c}</option>`).join('');
  });

  list.innerHTML = cats.map(cat => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:0.7rem 1rem;border:1px solid var(--border)">
      <span style="font-size:0.9rem">${cat}</span>
      ${!defaultCategories.includes(cat) ? `<button onclick="deleteCategory('${cat}')" style="color:#e53e3e;font-size:0.75rem;background:none;border:none;cursor:pointer">Remove</button>` : '<span style="font-size:0.7rem;color:var(--text-muted)">default</span>'}
    </div>
  `).join('');
}

document.getElementById('addCatBtn')?.addEventListener('click', async () => {
  const nameInput = document.getElementById('newCatName');
  const name = nameInput.value.trim();
  if (!name) return;

  try {
    await addDoc(collection(db, 'categories'), { name, slug: name.toLowerCase().replace(/\s+/g, '-') });
    toast(`Category "${name}" added ✓`);
    nameInput.value = '';
    loadCategories();
  } catch (err) {
    toast('Failed to add category.');
  }
});

window.deleteCategory = async function(name) {
  try {
    const snap = await getDocs(query(collection(db, 'categories')));
    for (const d of snap.docs) {
      if (d.data().name === name) {
        await deleteDoc(doc(db, 'categories', d.id));
        break;
      }
    }
    toast(`Category removed`);
    loadCategories();
  } catch (err) {
    toast('Failed to remove category.');
  }
};

// ---- INQUIRIES ----
async function loadInquiries() {
  const list = document.getElementById('inquiriesList');
  try {
    const snap = await getDocs(query(collection(db, 'inquiries'), orderBy('createdAt', 'desc')));
    if (snap.empty) {
      list.innerHTML = '<p style="color:var(--text-muted)">No inquiries yet.</p>';
      return;
    }
    let html = '';
    snap.forEach(d => {
      const data = d.data();
      const date = data.createdAt?.toDate().toLocaleDateString('en-IN') || 'N/A';
      html += `
        <div style="padding:1.5rem;border:1px solid var(--border)">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:1rem;margin-bottom:0.8rem">
            <div>
              <strong>${data.name || 'Unknown'}</strong>
              <span style="color:var(--text-muted);font-size:0.85rem;margin-left:1rem">${data.email || ''}</span>
              ${data.phone ? `<span style="color:var(--text-muted);font-size:0.85rem;margin-left:1rem">📞 ${data.phone}</span>` : ''}
            </div>
            <div style="display:flex;gap:0.5rem;align-items:center">
              <span style="font-size:0.7rem;letter-spacing:0.1em;text-transform:uppercase;padding:0.3rem 0.8rem;border:1px solid var(--accent);color:var(--accent)">${data.service || 'General'}</span>
              <span style="font-size:0.75rem;color:var(--text-muted)">${date}</span>
            </div>
          </div>
          ${data.date ? `<p style="font-size:0.8rem;color:var(--text-muted);margin-bottom:0.5rem">📅 Event Date: ${data.date}</p>` : ''}
          ${data.budget ? `<p style="font-size:0.8rem;color:var(--text-muted);margin-bottom:0.5rem">💰 Budget: ${data.budget}</p>` : ''}
          <p style="font-size:0.9rem;color:var(--text-muted);line-height:1.6;margin-top:0.5rem">${data.message || ''}</p>
          <div style="margin-top:1rem">
            <a href="mailto:${data.email}" class="btn-outline" style="font-size:0.75rem;padding:0.5rem 1rem">Reply via Email →</a>
          </div>
        </div>
      `;
    });
    list.innerHTML = html;
  } catch (err) {
    list.innerHTML = '<p style="color:var(--text-muted)">Configure Firebase to view inquiries.</p>';
  }
}

// Close modals on backdrop click
document.querySelectorAll('.modal').forEach(modal => {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('open');
  });
});
