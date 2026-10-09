(() => {
  "use strict";
  const DATA_URL = "./data/courses.json";
  const STORAGE_KEYS = { saved: "sls_saved_v1", completed: "sls_completed_v1" };
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
    if (typeof dialog.showModal === "function") dialog.showModal();
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
    } catch (error) {
      grid.innerHTML = '<div class="empty-state">课程资源暂时无法加载。请确认通过网站地址访问（不要直接用 file:// 打开），并检查 data/courses.json 是否存在。</div>';
      $("#results-note").textContent = "加载失败；原始 README.md 未被修改。";
      console.error(error);
    }
  }
  init();
})();