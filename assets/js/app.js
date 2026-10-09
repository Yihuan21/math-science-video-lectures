(() => {
  "use strict";
  const DATA_URL = "./data/courses.json";
  const STORAGE_KEYS = { saved: "sls_saved_v1", completed: "sls_completed_v1", tasks: "sls_tasks_v1", notes: "sls_notes_v1" };
  const state = { courses: [], category: "全部", level: "all", query: "", savedOnly: false };
  const $ = (selector) => document.querySelector(selector);
  const grid = $("#course-grid");
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[char]));
  const readSet = (key) => {
    try { const value = JSON.parse(localStorage.getItem(key) || "[]"); return new Set(Array.isArray(value) ? value : []); }
    catch { return new Set(); }
  };
  const saved = readSet(STORAGE_KEYS.saved);
  const completed = readSet(STORAGE_KEYS.completed);
  const completedTasks = readSet(STORAGE_KEYS.tasks);
  const readNotes = () => { try { const value = JSON.parse(localStorage.getItem(STORAGE_KEYS.notes) || "[]"); return Array.isArray(value) ? value.filter(n => n && typeof n.id === "string" && typeof n.courseId === "string" && typeof n.body === "string") : []; } catch { return []; } };
  let notes = readNotes();
  let editingNoteId = null;
  const TASKS = [
    { id:"python-setup", stage:"01 · 编程与工具", title:"运行并修改一个 Python 示例", detail:"运行官方教程中的一个示例，修改输入或逻辑，并用自己的话解释结果。", course:"python-tutorial" },
    { id:"tools-git", stage:"01 · 编程与工具", title:"完成一次命令行与 Git 练习", detail:"创建文件夹、查看文件、初始化或克隆仓库，并记录用到的命令。", course:"missing-semester" },
    { id:"python-project", stage:"01 · 编程与工具", title:"做一个小型自动化脚本", detail:"选择一个重复任务，用 Python 读取或整理文件；写下输入、输出和边界情况。", course:"automate-boring-stuff" },
    { id:"linear-algebra", stage:"02 · 数学基础", title:"手算矩阵与线性变换例子", detail:"选一个 2×2 矩阵，计算它对一个向量的作用，并画出变换前后的向量。", course:"mit-linear-algebra" },
    { id:"calculus", stage:"02 · 数学基础", title:"解释导数与积分的含义", detail:"分别用图像或生活例子解释导数的局部变化率与积分的累积意义。", course:"mit-calculus" },
    { id:"probability", stage:"02 · 数学基础", title:"完成一道条件概率题", detail:"先写清样本空间、条件事件与目标概率，再核对计算并解释结果。", course:"harvard-stat110" },
    { id:"cs50-algorithm", stage:"03 · 计算机科学", title:"用步骤描述一个算法", detail:"选一个简单问题，写出输入、输出、步骤，并尝试分析时间复杂度。", course:"cs50x" },
    { id:"computer-stack", stage:"03 · 计算机科学", title:"画出计算机抽象层", detail:"画出逻辑门、机器指令、虚拟机或高级语言之间的关系，解释每层的作用。", course:"nand2tetris" },
    { id:"ml-loss", stage:"04 · 机器学习与 AI", title:"解释损失函数和训练目标", detail:"选一个模型，说明输入、预测、损失函数、参数更新分别是什么。", course:"stanford-cs229" },
    { id:"pytorch-gradient", stage:"04 · 机器学习与 AI", title:"运行一个自动微分例子", detail:"在 PyTorch 中计算一个简单函数的梯度，检查梯度值是否符合手算结果。", course:"pytorch-tutorials" },
    { id:"llm-transformer", stage:"04 · 机器学习与 AI", title:"画出 Transformer 的信息流", detail:"用自己的话说明 token、注意力、模型输出的关系，并列出一个仍不清楚的问题。", course:"huggingface-llm-course" },
    { id:"vision-model", stage:"04 · 机器学习与 AI", title:"记录一次模型实验", detail:"记录数据、模型、评价指标和结果；提出一个可检验的改进假设。", course:"stanford-cs231n" }
  ];
  const persist = (key, set) => {
    try { localStorage.setItem(key, JSON.stringify([...set])); return true; }
    catch { showToast("浏览器未允许本地保存，请检查 Safari 网站数据设置。"); return false; }
  };
  let toastTimer;
  function showToast(message) {
    const toast = $("#toast");
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2300);
  }
  function updateStats() {
    $("#course-count").textContent = state.courses.length;
    $("#saved-count").textContent = saved.size;
    $("#completed-count").textContent = completed.size;
    const taskLabel = $("#task-progress-label");
    if (taskLabel) taskLabel.textContent = `${completedTasks.size} / ${TASKS.length}`;
    const notesLabel = $("#notes-count");
    if (notesLabel) notesLabel.textContent = `${notes.length} 条笔记`;
  }
  function matches(course) {
    const text = [course.title, course.description, course.category, course.provider, ...(course.topics || [])].join(" ").toLocaleLowerCase();
    return (!state.query || text.includes(state.query.toLocaleLowerCase()))
      && (state.category === "全部" || course.category === state.category)
      && (state.level === "all" || course.level === state.level)
      && (!state.savedOnly || saved.has(course.id));
  }
  function render() {
    const courses = state.courses.filter(matches);
    grid.innerHTML = courses.length ? courses.map((course) => {
      const isSaved = saved.has(course.id), isDone = completed.has(course.id);
      const palette = ({ "计算机科学":"blue", "人工智能":"mint", "数学基础":"peach", "编程基础":"" })[course.category] || "";
      return `<article class="course-card">
        <div class="card-top"><span class="course-icon ${palette}">${escapeHtml(course.icon || "▤")}</span>
          <button class="save-button ${isSaved ? "saved" : ""}" type="button" data-action="save" data-id="${escapeHtml(course.id)}" aria-label="${isSaved ? "取消收藏" : "收藏"}：${escapeHtml(course.title)}" aria-pressed="${isSaved}">${isSaved ? "♥" : "♡"}</button></div>
        <div class="course-tags"><span class="tag category">${escapeHtml(course.category)}</span><span class="tag">${escapeHtml(course.level)}</span><span class="tag">${escapeHtml(course.language || "语言以来源为准")}</span></div>
        <h3>${escapeHtml(course.title)}</h3><p class="course-description">${escapeHtml(course.description)}</p>
        <div class="course-meta"><span>${escapeHtml(course.provider)}</span><span>${escapeHtml(course.format || "在线资源")}</span></div>
        <div class="card-actions"><button class="text-link" type="button" data-action="details" data-id="${escapeHtml(course.id)}">课程详情 →</button><button class="done-button ${isDone ? "done" : ""}" type="button" data-action="complete" data-id="${escapeHtml(course.id)}" aria-pressed="${isDone}">${isDone ? "✓ 已完成" : "标记完成"}</button></div>
      </article>`;
    }).join("") : '<div class="empty-state">没有找到符合条件的课程。试试其他关键词或清除筛选条件。</div>';
    $("#results-note").textContent = `显示 ${courses.length} / ${state.courses.length} 门课程${state.savedOnly ? " · 仅显示收藏" : ""}`;
    updateStats();
    document.querySelectorAll("[data-category]").forEach((button) => {
      const active = button.dataset.category === state.category;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    $("#saved-toggle").setAttribute("aria-pressed", String(state.savedOnly));
    $("#saved-toggle").textContent = state.savedOnly ? "♥ 显示全部" : "♡ 只看收藏";
  }
  function showDetails(id) {
    const course = state.courses.find((item) => item.id === id);
    if (!course) return;
    const dialog = $("#course-dialog");
    const content = $("#dialog-content");
    content.innerHTML = `<div class="dialog-content">
      <span class="tag category">${escapeHtml(course.category)}</span><h2 id="dialog-title">${escapeHtml(course.title)}</h2>
      <p>${escapeHtml(course.description)}</p>
      <div class="dialog-info"><strong>学习信息</strong><br>难度：${escapeHtml(course.level)}<br>来源：${escapeHtml(course.provider)}<br>语言：${escapeHtml(course.language || "请查看来源页面")}<br>学习建议：${escapeHtml(course.recommendation || "先浏览课程大纲，再按章节学习并记录问题。")}<br>主题：${escapeHtml((course.topics || []).join("、") || "课程基础")}</div>
      <div class="dialog-actions"><a class="primary-button" href="${escapeHtml(course.url)}" target="_blank" rel="noopener noreferrer">打开原始课程 ↗</a><button class="secondary-button" type="button" data-action="save" data-id="${escapeHtml(course.id)}">${saved.has(course.id) ? "♥ 已收藏" : "♡ 收藏课程"}</button><button class="secondary-button" type="button" data-action="complete" data-id="${escapeHtml(course.id)}">${completed.has(course.id) ? "✓ 已完成" : "标记完成"}</button></div>
      <p class="results-note">课程链接指向原始提供方；课程内容、可用性及语言信息请以来源网站为准。</p>
    </div>`;
    if (typeof dialog.showModal === "function" && !dialog.open) dialog.showModal();
    else showToast("当前浏览器不支持课程弹窗，请更新 Safari。");
  }
  function toggleSet(set, key, id, positive, negative) {
    if (set.has(id)) { set.delete(id); showToast(negative); }
    else { set.add(id); showToast(positive); }
    persist(key, set);
    render();
    if ($("#course-dialog").open) showDetails(id);
  }
  grid.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const { action, id } = button.dataset;
    if (action === "save") toggleSet(saved, STORAGE_KEYS.saved, id, "已加入收藏", "已取消收藏");
    if (action === "complete") toggleSet(completed, STORAGE_KEYS.completed, id, "已标记为完成", "已取消完成标记");
    if (action === "details") showDetails(id);
  });
  $("#dialog-content").addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const { action, id } = button.dataset;
    if (action === "save") toggleSet(saved, STORAGE_KEYS.saved, id, "已加入收藏", "已取消收藏");
    if (action === "complete") toggleSet(completed, STORAGE_KEYS.completed, id, "已标记为完成", "已取消完成标记");
  });
  $("#search-input").addEventListener("input", (event) => { state.query = event.target.value.trim(); render(); });
  $("#level-filter").addEventListener("change", (event) => { state.level = event.target.value; render(); });
  $("#category-filters").addEventListener("click", (event) => {
    const button = event.target.closest("[data-category]");
    if (!button) return;
    state.category = button.dataset.category;
    render();
  });
  $("#saved-toggle").addEventListener("click", () => { state.savedOnly = !state.savedOnly; render(); });
  document.querySelectorAll("[data-path-filter]").forEach((link) => link.addEventListener("click", () => {
    state.category = link.dataset.pathFilter;
    render();
  }));
  document.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault(); $("#search-input").focus();
    }
  });
  function persistTasks() { persist(STORAGE_KEYS.tasks, completedTasks); }
  function persistNotes() {
    try { localStorage.setItem(STORAGE_KEYS.notes, JSON.stringify(notes)); return true; }
    catch { showToast("笔记保存失败：浏览器存储空间可能不足。"); return false; }
  }
  function renderTasks() {
    const container = $("#task-list");
    if (!container) return;
    const groups = [...new Set(TASKS.map(task => task.stage))];
    container.innerHTML = groups.map(stage => `<section class="task-group"><h4>${escapeHtml(stage)}</h4>${TASKS.filter(task => task.stage === stage).map(task => {
      const done = completedTasks.has(task.id);
      const course = state.courses.find(item => item.id === task.course);
      return `<label class="task-item ${done ? "task-done" : ""}"><input type="checkbox" data-task-id="${escapeHtml(task.id)}" ${done ? "checked" : ""}><span class="task-copy"><strong>${escapeHtml(task.title)}</strong><small>${escapeHtml(task.detail)}</small><em>${escapeHtml(course ? course.title : "完成相关课程后实践")}</em></span></label>`;
    }).join("")}</section>`).join("");
    const doneCount = TASKS.filter(task => completedTasks.has(task.id)).length;
    const percent = Math.round(doneCount / TASKS.length * 100);
    $("#task-progress-fill").style.width = percent + "%";
    $("#task-progress-bar").setAttribute("aria-valuenow", String(percent));
    $("#task-progress-label").textContent = `${doneCount} / ${TASKS.length}`;
  }
  function renderNotes() {
    const select = $("#note-course");
    if (!select) return;
    const previous = select.value;
    select.innerHTML = '<option value="">选择关联课程…</option>' + state.courses.map(course => `<option value="${escapeHtml(course.id)}">${escapeHtml(course.title)}</option>`).join("");
    if (state.courses.some(course => course.id === previous)) select.value = previous;
    const list = $("#notes-list");
    $("#notes-count").textContent = `${notes.length} 条笔记`;
    if (!notes.length) {
      list.innerHTML = '<p class="study-muted">还没有笔记，写下第一条学习记录吧。</p>';
      return;
    }
    list.innerHTML = [...notes].sort((a,b) => b.updatedAt.localeCompare(a.updatedAt)).map(note => {
      const course = state.courses.find(item => item.id === note.courseId);
      return `<article class="note-card"><div class="note-card-top"><div><strong>${escapeHtml(note.title || "未命名笔记")}</strong><small>${escapeHtml(course ? course.title : "课程已不存在")} · ${escapeHtml(new Date(note.updatedAt).toLocaleDateString())}</small></div><div class="note-card-actions"><button type="button" class="text-link" data-note-action="edit" data-note-id="${escapeHtml(note.id)}">编辑</button><button type="button" class="text-link note-delete" data-note-action="delete" data-note-id="${escapeHtml(note.id)}">删除</button></div></div><p>${escapeHtml(note.body).replace(/\n/g,"<br>")}</p></article>`;
    }).join("");
  }
  function clearNoteForm() {
    editingNoteId = null;
    $("#note-course").value = "";
    $("#note-title").value = "";
    $("#note-body").value = "";
    $("#save-note").textContent = "保存笔记";
  }
  function saveNote() {
    const courseId = $("#note-course").value;
    const body = $("#note-body").value.trim();
    const title = $("#note-title").value.trim();
    if (!courseId) { showToast("请先选择关联课程"); $("#note-course").focus(); return; }
    if (!body) { showToast("请先写下笔记内容"); $("#note-body").focus(); return; }
    const now = new Date().toISOString();
    if (editingNoteId) {
      const note = notes.find(item => item.id === editingNoteId);
      if (note) Object.assign(note, { courseId, title, body, updatedAt: now });
      showToast("笔记已更新");
    } else {
      notes.push({ id: "note-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2,8), courseId, title, body, createdAt: now, updatedAt: now });
      showToast("笔记已保存");
    }
    if (persistNotes()) { clearNoteForm(); renderNotes(); }
  }
  $("#task-list").addEventListener("change", event => {
    const input = event.target.closest("[data-task-id]");
    if (!input) return;
    if (input.checked) completedTasks.add(input.dataset.taskId); else completedTasks.delete(input.dataset.taskId);
    persistTasks(); renderTasks(); updateStats();
  });
  $("#reset-tasks").addEventListener("click", () => {
    if (!completedTasks.size) { showToast("目前没有已完成的任务"); return; }
    if (!window.confirm("确定清除全部任务完成状态？课程收藏、已完成课程和笔记不会受影响。")) return;
    completedTasks.clear(); persistTasks(); renderTasks(); updateStats(); showToast("任务状态已重置");
  });
  $("#save-note").addEventListener("click", saveNote);
  $("#clear-note-form").addEventListener("click", clearNoteForm);
  $("#notes-list").addEventListener("click", event => {
    const button = event.target.closest("[data-note-action]");
    if (!button) return;
    const note = notes.find(item => item.id === button.dataset.noteId);
    if (!note) return;
    if (button.dataset.noteAction === "edit") {
      editingNoteId = note.id;
      $("#note-course").value = note.courseId;
      $("#note-title").value = note.title;
      $("#note-body").value = note.body;
      $("#save-note").textContent = "更新笔记";
      $("#note-title").focus();
      $("#study-workspace").scrollIntoView({ behavior: "smooth", block: "start" });
    } else if (button.dataset.noteAction === "delete" && window.confirm("确定删除这条笔记？此操作不可撤销。")) {
      notes = notes.filter(item => item.id !== note.id);
      persistNotes();
      if (editingNoteId === note.id) clearNoteForm();
      renderNotes(); showToast("笔记已删除");
    }
  });
  function exportProgress() {
    const payload = {
      format: "science-learning-studio-progress",
      version: 2,
      exportedAt: new Date().toISOString(),
      saved: [...saved],
      completed: [...completed],
      completedTasks: [...completedTasks],
      notes: notes.map(note => ({ ...note }))
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "science-learning-progress.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showToast("学习记录备份已导出");
  }
  function importProgressFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const payload = JSON.parse(String(reader.result || ""));
        if (!payload || payload.format !== "science-learning-studio-progress" || ![1, 2].includes(payload.version) ||
            !Array.isArray(payload.saved) || !Array.isArray(payload.completed) || (payload.version === 2 && (!Array.isArray(payload.completedTasks) || !Array.isArray(payload.notes)))) {
          throw new Error("备份文件格式不正确");
        }
        const validIds = new Set(state.courses.map((course) => course.id));
        const importedSaved = [...new Set(payload.saved.filter((id) => typeof id === "string" && validIds.has(id)))];
        const importedCompleted = [...new Set(payload.completed.filter((id) => typeof id === "string" && validIds.has(id)))];
        if (!window.confirm("导入将替换本设备当前的收藏、课程完成状态、任务进度和笔记。建议先导出当前记录备份。是否继续？")) return;
        const importedTasks = payload.version === 2
          ? [...new Set(payload.completedTasks.filter(id => typeof id === "string" && TASKS.some(task => task.id === id)))]
          : [];
        const importedNotes = payload.version === 2
          ? payload.notes.filter(note => note && typeof note.id === "string" && typeof note.courseId === "string" && validIds.has(note.courseId) && typeof note.body === "string")
              .map(note => ({ id: note.id, courseId: note.courseId, title: String(note.title || "").slice(0, 100), body: String(note.body).slice(0, 12000), createdAt: typeof note.createdAt === "string" ? note.createdAt : new Date().toISOString(), updatedAt: typeof note.updatedAt === "string" ? note.updatedAt : new Date().toISOString() }))
          : [];
        saved.clear();
        completed.clear();
        completedTasks.clear();
        importedSaved.forEach((id) => saved.add(id));
        importedCompleted.forEach((id) => completed.add(id));
        importedTasks.forEach((id) => completedTasks.add(id));
        notes = importedNotes;
        persist(STORAGE_KEYS.saved, saved);
        persist(STORAGE_KEYS.completed, completed);
        persist(STORAGE_KEYS.tasks, completedTasks);
        if (!persistNotes()) return;
        render();
        renderTasks();
        renderNotes();
        showToast("学习记录已导入");
      } catch (error) {
        showToast(error instanceof SyntaxError ? "无法读取文件：请选取有效的 JSON 备份" : (error.message || "导入失败"));
      }
    };
    reader.onerror = () => showToast("读取文件失败，请重试");
    reader.readAsText(file);
  }
  const exportButton = $("#export-progress");
  const importButton = $("#import-progress");
  const progressFile = $("#progress-file");
  if (exportButton) exportButton.addEventListener("click", exportProgress);
  if (importButton && progressFile) {
    importButton.addEventListener("click", () => progressFile.click());
    progressFile.addEventListener("change", () => {
      importProgressFile(progressFile.files && progressFile.files[0]);
      progressFile.value = "";
    });
  }
  async function init() {
    try {
      const response = await fetch(DATA_URL, { headers: { "Accept": "application/json" } });
      if (!response.ok) throw new Error("课程数据加载失败：" + response.status);
      const courses = await response.json();
      if (!Array.isArray(courses) || courses.some((item) => !item.id || !item.title || !item.url || !/^https?:\/\//i.test(item.url))) {
        throw new Error("课程数据格式校验未通过");
      }
      state.courses = courses;
      render();
      renderTasks();
      renderNotes();
    } catch (error) {
      grid.innerHTML = '<div class="empty-state">课程资源暂时无法加载。请确认通过网站地址访问（不要直接用 file:// 打开），并检查 data/courses.json 是否存在。</div>';
      $("#results-note").textContent = "加载失败；原始 README.md 未被修改。";
      console.error(error);
    }
  }
  init();
})();