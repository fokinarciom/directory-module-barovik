const SUPABASE_URL = "https://eozyksspctizwgsryzzz.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_9BYHMmoEaf7snajQBdnJSw_DRJ1QvHV";

if (!window.supabase) {
  alert("Ошибка: библиотека Supabase не загружена. Проверьте соединение с CDN.");
  throw new Error("Supabase library not loaded");
}

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  alert("Ошибка: SUPABASE_URL или SUPABASE_ANON_KEY не заданы. Введите их в начале файла app.js");
  throw new Error("Supabase credentials missing");
}

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const state = {
  dict: "genres",
  rows: [],
  sortKey: null,
  sortDir: "asc",
  selectedId: null,
  editing: null,
  genres: []
};

const el = {
  dict: document.getElementById("dictionarySelect"),
  tableWrap: document.getElementById("tableWrap"),
  apiStatus: document.getElementById("apiStatus"),
  recordDialog: document.getElementById("recordDialog"),
  viewDialog: document.getElementById("viewDialog"),
  recordTitle: document.getElementById("recordTitle"),
  formFields: document.getElementById("formFields"),
  recordForm: document.getElementById("recordForm"),
  viewContent: document.getElementById("viewContent"),
  addBtn: document.getElementById("addBtn"),
  viewBtn: document.getElementById("viewBtn"),
  editBtn: document.getElementById("editBtn"),
  deleteBtn: document.getElementById("deleteBtn"),
  refreshBtn: document.getElementById("refreshBtn"),
  cancelBtn: document.getElementById("cancelBtn"),
  closeViewBtn: document.getElementById("closeViewBtn")
};

const columns = {
  genres: [
    { key: "genre_name", label: "Жанр", type: "text", required: true },
    { key: "first_movie", label: "Первый фильм", type: "date", required: false },
    { key: "age_limit", label: "Возраст", type: "number", required: false },
    { key: "origin_country", label: "Страна", type: "text", required: false },
    { key: "death_rate_per_film", label: "Смертей/фильм", type: "number", required: false },
    { key: "description", label: "Описание", type: "text", required: false }
  ],
  movies: [
    { key: "title", label: "Название", type: "text", required: true },
    { key: "genre_id", label: "Жанр", type: "ref", required: true },
    { key: "box_office", label: "Касса, млн", type: "number", required: false },
    { key: "duration", label: "Длительность, мин", type: "number", required: false },
    { key: "premiere_date", label: "Премьера", type: "date", required: false },
    { key: "notes", label: "Заметки", type: "text", required: false }
  ]
};

function fmtDate(v){
  if(!v) return "";
  const d = new Date(v);
  if(Number.isNaN(d.getTime())) return v;
  return d.toLocaleDateString("ru-RU");
}

function sortValue(value, type){
  if(value == null || value === "") return null;
  if(type === "number") return Number(value);
  if(type === "date") return new Date(value).getTime();
  return String(value).toLowerCase();
}

function sortedRows(){
  if(!state.sortKey) return [...state.rows];
  const col = columns[state.dict].find(c => c.key === state.sortKey);
  return [...state.rows].sort((a,b) => {
    const av = sortValue(a[state.sortKey], col?.type);
    const bv = sortValue(b[state.sortKey], col?.type);
    if(av == null && bv == null) return 0;
    if(av == null) return 1;
    if(bv == null) return -1;
    if(col?.type === "text"){
      return state.sortDir === "asc"
        ? av.localeCompare(bv, "ru")
        : bv.localeCompare(av, "ru");
    }
    return state.sortDir === "asc" ? av - bv : bv - av;
  });
}

function fieldWrap(label, control){
  return `<div class="field">${label}${control}</div>`;
}

function renderField(c, value){
  const requiredAttr = c.required ? "required" : "";
  
  if(c.key === "description" || c.key === "notes"){
    return fieldWrap(
      `<label for="${c.key}">${c.label}${c.required ? " *" : ""}</label>`,
      `<textarea id="${c.key}" name="${c.key}" ${requiredAttr}>${value ?? ""}</textarea>`
    );
  }

  if(c.key === "genre_id"){
    const options = state.genres.map(g => `
      <option value="${g.id}" ${String(g.id) === String(value) ? "selected" : ""}>
        ${g.genre_name}
      </option>`).join("");

    return fieldWrap(
      `<label for="${c.key}">${c.label} *</label>`,
      `<select id="${c.key}" name="${c.key}" required>
        <option value="">-- выберите жанр --</option>
        ${options}
      </select>`
    );
  }

  if(c.type === "date"){
    return fieldWrap(
      `<label for="${c.key}">${c.label}${c.required ? " *" : ""}</label>`,
      `<input id="${c.key}" type="date" name="${c.key}" value="${value ? String(value).slice(0,10) : ""}" ${requiredAttr} />`
    );
  }

  if(c.type === "number"){
    return fieldWrap(
      `<label for="${c.key}">${c.label}${c.required ? " *" : ""}</label>`,
      `<input id="${c.key}" type="number" step="any" name="${c.key}" value="${value ?? ""}" ${requiredAttr} />`
    );
  }

  return fieldWrap(
    `<label for="${c.key}">${c.label}${c.required ? " *" : ""}</label>`,
    `<input id="${c.key}" type="text" name="${c.key}" value="${value ?? ""}" ${requiredAttr} />`
  );
}

async function loadGenres(){
  const { data, error } = await supabaseClient.from("movie_genres").select("*").order("genre_name");
  if(error) throw error;
  state.genres = data || [];
}

async function loadRows(){
  const table = state.dict === "genres" ? "movie_genres" : "movies";
  const { data, error } = await supabaseClient.from(table).select("*");
  if(error) throw error;
  state.rows = data || [];
  renderTable();
}

function renderTable(){
  const rows = sortedRows();
  const cols = columns[state.dict];
  
  if(!rows.length){
    el.tableWrap.innerHTML = `<div class="empty-state">Нет данных. Нажмите "Добавить" для создания записи.</div>`;
    return;
  }

  const header = `<table>${cols.map(c => `<th data-key="${c.key}">${c.label}</th>`).join("")}</tr>`;
  
  const body = rows.map(row => {
    const cells = cols.map(c => {
      let val = row[c.key];
      
      if(c.type === "date" && val) {
        val = fmtDate(val);
      }
      else if(c.key === "genre_id" && val) {
        const genre = state.genres.find(g => String(g.id) === String(val));
        val = genre ? genre.genre_name : "Не указан";
      }
      else if(val === null || val === undefined || val === "") {
        val = "—";
      }
      
      return `<td>${escapeHtml(String(val))}</td>`;
    }).join("");
    
    const selectedClass = String(row.id) === String(state.selectedId) ? "selected" : "";
    return `<tr data-id="${row.id}" class="${selectedClass}">${cells}</tr>`;
  }).join("");

  el.tableWrap.innerHTML = `
    <div style="overflow-x: auto;">
      <table class="data-table">
        <thead>${header}</thead>
        <tbody>${body}</tbody>
      </div>
    </div>
  `;

  el.tableWrap.querySelectorAll("th").forEach(th => {
    th.addEventListener("click", () => {
      const key = th.dataset.key;
      if(state.sortKey === key) {
        state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
      } else { 
        state.sortKey = key; 
        state.sortDir = "asc"; 
      }
      renderTable();
    });
  });

  el.tableWrap.querySelectorAll("tr[data-id]").forEach(tr => {
    tr.addEventListener("click", (e) => {
      if(e.target.closest('.row-action')) return;
      state.selectedId = tr.dataset.id;
      renderTable();
    });
  });
}

function escapeHtml(str) {
  if (str === null || str === undefined) return "—";
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function openRecordDialog(mode){
  const cols = columns[state.dict];
  const record = state.editing || {};
  el.recordTitle.textContent = mode === "add" ? "Добавить запись" : "Редактировать запись";
  el.formFields.innerHTML = cols.map(c => renderField(c, record[c.key])).join("");
  el.recordDialog.showModal();
}

function getFormData(){
  const form = new FormData(el.recordForm);
  const data = {};
  for(const [k,v] of form.entries()) {
    if(v !== "") data[k] = v;
  }
  return data;
}

async function saveRecord(){
  const data = getFormData();

  if(state.dict === "genres"){
    if(!data.genre_name || data.genre_name.trim() === "") {
      return alert("Поле 'Жанр' обязательно для заполнения.");
    }
    
    const payload = {
      genre_name: data.genre_name.trim(),
      first_movie: data.first_movie || null,
      age_limit: data.age_limit ? Number(data.age_limit) : null,
      origin_country: data.origin_country || null,
      death_rate_per_film: data.death_rate_per_film ? Number(data.death_rate_per_film) : null,
      description: data.description || null
    };

    const table = "movie_genres";
    const q = state.editing?.id
      ? supabaseClient.from(table).update(payload).eq("id", state.editing.id)
      : supabaseClient.from(table).insert(payload);

    const { error } = await q;
    if(error) {
      console.error("Supabase error:", error);
      return alert("Ошибка: " + error.message);
    }
  } else {
    if(!data.title || data.title.trim() === "") {
      return alert("Поле 'Название' обязательно для заполнения.");
    }
    
    if(!data.genre_id || data.genre_id === "") {
      return alert("Выберите жанр из списка.");
    }
    
    const payload = {
      title: data.title.trim(),
      genre_id: data.genre_id,
      box_office: data.box_office && data.box_office !== "" ? parseFloat(data.box_office) : null,
      duration: data.duration && data.duration !== "" ? parseInt(data.duration) : null,
      premiere_date: data.premiere_date || null,
      notes: data.notes || null
    };

    console.log("Отправляемые данные:", payload);

    const table = "movies";
    const q = state.editing?.id
      ? supabaseClient.from(table).update(payload).eq("id", state.editing.id)
      : supabaseClient.from(table).insert(payload);

    const { data: result, error } = await q;
    if(error) {
      console.error("Ошибка Supabase:", error);
      return alert("Ошибка: " + error.message);
    }
    console.log("Успешно сохранено:", result);
  }

  state.editing = null;
  el.recordDialog.close();
  await refreshAll();
}
function showView(){
  if(!state.selectedId) return alert("Выберите строку в таблице.");
  const row = state.rows.find(r => String(r.id) === String(state.selectedId));
  if(!row) return;

  const cols = columns[state.dict];
  const items = cols.map(c => {
    let val = row[c.key];
    if(c.type === "date") val = fmtDate(val);
    if(c.key === "genre_id") {
      const g = state.genres.find(x => String(x.id) === String(row.genre_id));
      val = g ? g.genre_name : "";
    }
    if(val === null || val === undefined || val === "") val = "—";
    return `<li><strong>${c.label}:</strong> <span>${escapeHtml(String(val))}</span></li>`;
  }).join("");

  el.viewContent.innerHTML = `<ul class="view-list">${items}</ul>`;
  el.viewDialog.showModal();
}

async function deleteRecord(){
  if(!state.selectedId) return alert("Выберите строку в таблице.");
  if(!confirm("Удалить выбранную запись?")) return;

  const table = state.dict === "genres" ? "movie_genres" : "movies";
  const { error } = await supabaseClient.from(table).delete().eq("id", state.selectedId);
  if(error) return alert(error.message);

  state.selectedId = null;
  await refreshAll();
}

async function refreshAll(){
  await loadGenres();
  await loadRows();
}

function bindEvents(){
  el.dict.addEventListener("change", async () => {
    state.dict = el.dict.value;
    state.selectedId = null;
    state.sortKey = null;
    state.sortDir = "asc";
    await loadRows();
  });

  el.addBtn.addEventListener("click", () => {
    state.editing = null;
    openRecordDialog("add");
  });

  el.editBtn.addEventListener("click", () => {
    if(!state.selectedId) return alert("Выберите строку в таблице.");
    state.editing = state.rows.find(r => String(r.id) === String(state.selectedId));
    openRecordDialog("edit");
  });

  el.viewBtn.addEventListener("click", showView);
  el.deleteBtn.addEventListener("click", deleteRecord);
  el.refreshBtn.addEventListener("click", refreshAll);
  el.cancelBtn.addEventListener("click", () => el.recordDialog.close());
  el.closeViewBtn.addEventListener("click", () => el.viewDialog.close());

  el.recordForm.addEventListener("submit", e => {
    e.preventDefault();
    saveRecord();
  });
}

async function init(){
  const badge = el.apiStatus;
  
  try{
    bindEvents();
    await refreshAll();
    badge.classList.add("hidden");
  }catch(err){
    console.error(err);
    badge.textContent = "✗ Ошибка подключения";
    badge.classList.remove("hidden");
    badge.classList.remove("success");
    alert("Ошибка загрузки. Проверьте URL, ключ, таблицы и политики RLS.\n\n" + err.message);
  }
}
async function handleSupabaseError(error, customMessage) {
  console.error(error);
  const badge = el.apiStatus;
  badge.textContent = "⚠️ Потеря связи с БД";
  badge.classList.remove("hidden");
  badge.classList.remove("success");
  alert(customMessage || "Ошибка подключения к базе данных. Проверьте соединение.");
}

async function loadGenres(){
  try {
    const { data, error } = await supabaseClient.from("movie_genres").select("*").order("genre_name");
    if(error) throw error;
    state.genres = data || [];
    const badge = el.apiStatus;
    if (!badge.classList.contains("hidden")) {
      badge.classList.add("hidden");
    }
  } catch(error) {
    await handleSupabaseError(error, "Не удалось загрузить жанры");
    throw error;
  }
}

async function loadRows(){
  try {
    const table = state.dict === "genres" ? "movie_genres" : "movies";
    const { data, error } = await supabaseClient.from(table).select("*");
    if(error) throw error;
    state.rows = data || [];
    renderTable();
    const badge = el.apiStatus;
    if (!badge.classList.contains("hidden")) {
      badge.classList.add("hidden");
    }
  } catch(error) {
    await handleSupabaseError(error, "Не удалось загрузить данные");
    throw error;
  }
}
init();