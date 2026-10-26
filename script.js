/**
 * script.js — Task List App
 *
 * Fitur:
 *  - CRUD: Create, Read, Update, Delete task
 *  - Toggle status: Active ↔ Completed
 *  - Filter: All / Active / Completed (tanpa refresh)
 *  - Persistent storage via localStorage
 *
 * Tidak menggunakan library eksternal apa pun.
 */

"use strict";

// ─────────────────────────────────────────────
//  CONSTANTS & STATE
// ─────────────────────────────────────────────

/** Key yang digunakan untuk menyimpan data ke localStorage */
const STORAGE_KEY = "tasklist_tasks";

/**
 * @typedef {{ id: string, text: string, completed: boolean }} Task
 */

/** @type {Task[]} Array utama berisi semua task */
let tasks = [];

/** Filter yang sedang aktif: 'all' | 'active' | 'completed' */
let currentFilter = "all";

/** ID task yang sedang diedit (null jika modal tertutup) */
let editingId = null;

// ─────────────────────────────────────────────
//  DOM REFERENCES
// ─────────────────────────────────────────────

const taskForm          = document.getElementById("task-form");
const taskInput         = document.getElementById("task-input");
const taskList          = document.getElementById("task-list");
const taskCounter       = document.getElementById("task-counter");
const clearCompletedBtn = document.getElementById("clear-completed-btn");
const filterBtns        = document.querySelectorAll(".filter-btn");

// Filter tab count badges
const countAll       = document.getElementById("count-all");
const countActive    = document.getElementById("count-active");
const countCompleted = document.getElementById("count-completed");

// Modal elements
const editModal    = document.getElementById("edit-modal");
const editInput    = document.getElementById("edit-input");
const modalCancel  = document.getElementById("modal-cancel");
const modalSave    = document.getElementById("modal-save");

// ─────────────────────────────────────────────
//  UTILITY HELPERS
// ─────────────────────────────────────────────

/**
 * Menghasilkan ID unik berdasarkan timestamp + random number.
 * @returns {string}
 */
function generateId() {
  return `task_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

/**
 * Membersihkan dan mem-validasi teks input.
 * @param {string} raw
 * @returns {string|null} teks yang sudah di-trim, atau null jika kosong
 */
function sanitize(raw) {
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

// ─────────────────────────────────────────────
//  LOCALSTORAGE
// ─────────────────────────────────────────────

/**
 * Memuat task dari localStorage saat halaman pertama dibuka.
 */
function loadTasks() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    tasks = stored ? JSON.parse(stored) : [];
  } catch {
    // Jika data korup, mulai dari array kosong
    tasks = [];
  }
}

/**
 * Menyimpan state `tasks` saat ini ke localStorage.
 */
function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

// ─────────────────────────────────────────────
//  CRUD OPERATIONS
// ─────────────────────────────────────────────

/**
 * Membuat task baru dan menambahkannya ke array.
 * @param {string} text
 */
function createTask(text) {
  const newTask = {
    id:        generateId(),
    text:      text,
    completed: false,
  };
  tasks.unshift(newTask); // Tampilkan task baru di atas
  saveTasks();
}

/**
 * Mengubah teks sebuah task berdasarkan ID.
 * @param {string} id
 * @param {string} newText
 */
function updateTaskText(id, newText) {
  const task = tasks.find((t) => t.id === id);
  if (task) {
    task.text = newText;
    saveTasks();
  }
}

/**
 * Mengubah status completed sebuah task (toggle).
 * @param {string} id
 */
function toggleTaskStatus(id) {
  const task = tasks.find((t) => t.id === id);
  if (task) {
    task.completed = !task.completed;
    saveTasks();
  }
}

/**
 * Menghapus task berdasarkan ID.
 * @param {string} id
 */
function deleteTask(id) {
  tasks = tasks.filter((t) => t.id !== id);
  saveTasks();
}

/**
 * Menghapus semua task yang sudah selesai (completed).
 */
function clearCompleted() {
  tasks = tasks.filter((t) => !t.completed);
  saveTasks();
}

// ─────────────────────────────────────────────
//  FILTERING
// ─────────────────────────────────────────────

/**
 * Mengembalikan daftar task sesuai filter yang aktif.
 * @returns {Task[]}
 */
function getFilteredTasks() {
  switch (currentFilter) {
    case "active":    return tasks.filter((t) => !t.completed);
    case "completed": return tasks.filter((t) =>  t.completed);
    default:          return tasks; // 'all'
  }
}

// ─────────────────────────────────────────────
//  RENDER
// ─────────────────────────────────────────────

/**
 * Membuat elemen <li> untuk satu task.
 * @param {Task} task
 * @returns {HTMLLIElement}
 */
function createTaskElement(task) {
  const li = document.createElement("li");
  li.className = "task-item flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 hover:bg-white hover:shadow-sm transition";
  li.dataset.id = task.id;

  // ── Checkbox (toggle completed) ──
  const checkbox = document.createElement("input");
  checkbox.type      = "checkbox";
  checkbox.className = "task-checkbox flex-shrink-0";
  checkbox.checked   = task.completed;
  checkbox.setAttribute("aria-label", `Tandai "${task.text}" sebagai selesai`);
  checkbox.addEventListener("change", () => {
    toggleTaskStatus(task.id);
    render();
  });

  // ── Task text ──
  const span = document.createElement("span");
  span.className = `task-text flex-1 text-sm text-gray-700 break-words${task.completed ? " completed" : ""}`;
  span.textContent = task.text;

  // ── Edit button ──
  const editBtn = document.createElement("button");
  editBtn.className = "task-action-btn edit flex-shrink-0";
  editBtn.setAttribute("aria-label", `Edit task "${task.text}"`);
  editBtn.innerHTML = `
    <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2"
         viewBox="0 0 24 24" aria-hidden="true">
      <path stroke-linecap="round" stroke-linejoin="round"
            d="M15.232 5.232l3.536 3.536M9 13l6.414-6.414a2 2 0
               012.828 0l.172.172a2 2 0 010 2.828L12 16H9v-3z"/>
    </svg>`;
  editBtn.addEventListener("click", () => openEditModal(task.id, task.text));

  // ── Delete button ──
  const deleteBtn = document.createElement("button");
  deleteBtn.className = "task-action-btn delete flex-shrink-0";
  deleteBtn.setAttribute("aria-label", `Hapus task "${task.text}"`);
  deleteBtn.innerHTML = `
    <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2"
         viewBox="0 0 24 24" aria-hidden="true">
      <path stroke-linecap="round" stroke-linejoin="round"
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0
               01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M8 7V5a2 2 0
               012-2h4a2 2 0 012 2v2"/>
    </svg>`;
  deleteBtn.addEventListener("click", () => {
    deleteTask(task.id);
    render();
  });

  li.append(checkbox, span, editBtn, deleteBtn);
  return li;
}

/**
 * Render ulang seluruh daftar task dan komponen terkait.
 * Dipanggil setiap kali state berubah.
 */
function render() {
  const filtered = getFilteredTasks();

  // ── Render task list ──
  taskList.innerHTML = "";

  if (filtered.length === 0) {
    // Tampilkan pesan kosong yang ramah pengguna
    const empty = document.createElement("li");
    empty.className = "text-center text-sm text-gray-400 py-8 select-none";
    empty.textContent =
      currentFilter === "completed"
        ? "Belum ada task yang selesai."
        : currentFilter === "active"
        ? "Semua task sudah selesai! 🎉"
        : "Belum ada task. Yuk mulai tambahkan!";
    taskList.appendChild(empty);
  } else {
    filtered.forEach((task) => {
      taskList.appendChild(createTaskElement(task));
    });
  }

  // ── Hitung jumlah per kategori (pakai data yang sudah ada) ──
  const activeCount    = tasks.filter((t) => !t.completed).length;
  const completedCount = tasks.filter((t) =>  t.completed).length;

  // ── Update counter footer ──
  taskCounter.textContent = `${activeCount} task tersisa`;

  // ── Update badge jumlah pada setiap filter tab ──
  countAll.textContent       = tasks.length   > 0 ? `(${tasks.length})`    : "";
  countActive.textContent    = activeCount    > 0 ? `(${activeCount})`     : "";
  countCompleted.textContent = completedCount > 0 ? `(${completedCount})`  : "";

  // ── Toggle tombol "Hapus yang selesai" ──
  clearCompletedBtn.classList.toggle("hidden", completedCount === 0);

  // ── Update aria-selected pada filter buttons ──
  filterBtns.forEach((btn) => {
    const isActive = btn.dataset.filter === currentFilter;
    btn.setAttribute("aria-selected", isActive);
    btn.classList.toggle("active-filter", isActive);
  });
}

// ─────────────────────────────────────────────
//  MODAL (EDIT TASK)
// ─────────────────────────────────────────────

/**
 * Membuka modal edit dan mengisi input dengan teks task saat ini.
 * @param {string} id
 * @param {string} currentText
 */
function openEditModal(id, currentText) {
  editingId       = id;
  editInput.value = currentText;
  editModal.classList.remove("hidden");
  editInput.focus();
  editInput.select();
}

/** Menutup modal edit dan membersihkan state. */
function closeEditModal() {
  editingId = null;
  editModal.classList.add("hidden");
  editInput.value = "";
}

/**
 * Menyimpan perubahan dari modal edit.
 */
function saveEdit() {
  const newText = sanitize(editInput.value);
  if (!newText) {
    editInput.focus();
    return;
  }
  if (editingId) {
    updateTaskText(editingId, newText);
    render();
  }
  closeEditModal();
}

// ─────────────────────────────────────────────
//  EVENT LISTENERS
// ─────────────────────────────────────────────

// Form: tambah task baru
taskForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = sanitize(taskInput.value);
  if (!text) return;
  createTask(text);
  taskInput.value = "";
  render();
  taskInput.focus();
});

// Filter tabs
filterBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    currentFilter = btn.dataset.filter;
    render();
  });
});

// Hapus semua yang selesai
clearCompletedBtn.addEventListener("click", () => {
  clearCompleted();
  render();
});

// Modal: tombol Batal
modalCancel.addEventListener("click", closeEditModal);

// Modal: tombol Simpan
modalSave.addEventListener("click", saveEdit);

// Modal: simpan dengan Enter, tutup dengan Escape
editInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter")  saveEdit();
  if (e.key === "Escape") closeEditModal();
});

// Modal: klik di luar modal-box menutup modal
editModal.addEventListener("click", (e) => {
  if (e.target === editModal) closeEditModal();
});

// ─────────────────────────────────────────────
//  INITIALIZATION
// ─────────────────────────────────────────────

/** Inisialisasi aplikasi saat halaman selesai dimuat. */
function init() {
  loadTasks();
  render();
}

init();
