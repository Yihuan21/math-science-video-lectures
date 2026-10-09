(() => {
  "use strict";
  const DATA_URL = "./data/courses.json";
  const STORAGE_KEYS = { saved: "sls_saved_v1", completed: "sls_completed_v1", tasks: "sls_tasks_v1", notes: "sls_notes_v1", goals: "sls_goals_v1", courseTasks: "sls_course_tasks_v1", studyLogs: "sls_study_logs_v1" };
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
  const readObject = key => { try { const value = JSON.parse(localStorage.getItem(key) || "{}"); return value && typeof value === "object" && !Array.isArray(value) ? value : {}; } catch { return {}; } };
  const readArray = key => { try { const value = JSON.parse(localStorage.getItem(key) || "[]"); return Array.isArray(value) ? value : []; } catch { return []; } };
  let courseGoals = readObject(STORAGE_KEYS.goals);
  let courseTasks = readObject(STORAGE_KEYS.courseTasks);
  let studyLogs = readArray(STORAGE_KEYS.studyLogs).filter(log => log && typeof log.id === "string" && typeof log.title === "string" && Number.isFinite(Number(log.minutes)));
  let editingNoteId = null;
  const COURSE_STAGE = {
    "python-tutorial":"python", "automate-boring-stuff":"python",
    "mit-linear-algebra":"math", "3b1b-linear-algebra":"math", "mit-calculus":"math", "harvard-stat110":"math",
    "stanford-cs229":"ml", "berkeley-cs188":"ml",
    "mit-6s191":"dl", "pytorch-tutorials":"dl", "fastai-practical-deep-learning":"dl", "huggingface-llm-course":"dl", "stanford-cs231n":"dl"
  };
  const LEARNING_STAGES = [
    { id:"python", title:"Python 编程基础", category:"编程基础", ids:["python-tutorial","automate-boring-stuff"], prerequisite:[], summary:"能够独立读写基础脚本、函数和文件。" },
    { id:"math", title:"数学基础", category:"数学基础", ids:["mit-linear-algebra","3b1b-linear-algebra","mit-calculus","harvard-stat110"], prerequisite:["python"], summary:"理解矩阵、导数/梯度、概率与期望。" },
    { id:"ml", title:"机器学习", category:"人工智能", ids:["stanford-cs229","berkeley-cs188"], prerequisite:["python","math"], summary:"理解训练/测试、损失函数、优化与泛化。" },
    { id:"dl", title:"深度学习", category:"人工智能", ids:["pytorch-tutorials","mit-6s191","fastai-practical-deep-learning","huggingface-llm-course","stanford-cs231n"], prerequisite:["python","math","ml"], summary:"能解释神经网络训练流程并完成至少一个模型实验。" }
  ];
  const saveObject = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { showToast("保存失败：Safari 本地存储空间可能不足。"); return false; } };

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
    updatePathwayProgress();
    updateDashboard();
  }
  function stageStats(stage) {
    const courses = state.courses.filter(course => COURSE_STAGE[course.id] === stage.id);
    const done = courses.filter(course => completed.has(course.id)).length;
    return { courses, done, percent: courses.length ? Math.round(done / courses.length * 100) : 0 };
  }
  function updatePathwayProgress() {
    document.querySelectorAll("[data-pathway-stage]").forEach(card => {
      const stage = LEARNING_STAGES.find(item => item.id === card.dataset.pathwayStage);
      if (!stage) return;
      const stats = stageStats(stage);
      const prereqsMet = stage.prerequisite.every(id => {
        const prerequisite = LEARNING_STAGES.find(item => item.id === id);
        return prerequisite && stageStats(prerequisite).courses.length > 0 && stageStats(prerequisite).done === stageStats(prerequisite).courses.length;
      });
      let progress = card.querySelector(".pathway-progress");
      if (!progress) { progress = document.createElement("div"); progress.className = "pathway-progress"; const link = card.querySelector("[data-path-filter]"); if (link) card.insertBefore(progress, link); }
      progress.innerHTML = `<span>${stats.done} / ${stats.courses.length} 门推荐课程已完成 · ${prereqsMet ? "先修条件已满足" : stage.prerequisite.length ? "先完成前置阶段" : "起点阶段"}</span><span class="pathway-progress-track"><span style="width:${stats.percent}%"></span></span>`;
      card.classList.toggle("stage-locked", !prereqsMet);
    });
  }
  function localDateKey(date) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`; }
  function updateDashboard() {
    populateAiCourseSelect();
    const completedCourseCount = state.courses.filter(course => completed.has(course.id)).length;
    const courseRate = state.courses.length ? Math.round(completedCourseCount / state.courses.length * 100) : 0;
    const builtInTaskDone = TASKS.filter(task => completedTasks.has(task.id)).length;
    const customTaskList = Object.values(courseTasks).flat().filter(task => task && typeof task === "object");
    const taskTotal = TASKS.length + customTaskList.length;
    const taskDone = builtInTaskDone + customTaskList.filter(task => task.done).length;
    $("#dash-course-rate").textContent = courseRate + "%";
    $("#dash-course-detail").textContent = `${completedCourseCount} / ${state.courses.length} 门课程`;
    $("#dash-task-rate").textContent = Math.round(taskTotal ? taskDone / taskTotal * 100 : 0) + "%";
    $("#dash-task-detail").textContent = `${taskDone} / ${taskTotal} 项任务（含自定义任务）`;
    const minutes = studyLogs.reduce((sum, log) => sum + Math.max(0, Number(log.minutes) || 0), 0);
    $("#dash-study-minutes").textContent = minutes >= 60 ? `${Math.floor(minutes/60)}小时${minutes%60 ? " " + minutes%60 + "分" : ""}` : `${minutes} 分钟`;
    const dates = [...new Set(studyLogs.filter(log => log.createdAt && !Number.isNaN(new Date(log.createdAt).getTime())).map(log => localDateKey(new Date(log.createdAt))))].sort().reverse();
    let streak = 0;
    const dateSet = new Set(dates);
    const cursor = new Date();
    const today = localDateKey(cursor);
    if (!dateSet.has(today)) cursor.setDate(cursor.getDate()-1);
    while (dateSet.has(localDateKey(cursor))) { streak++; cursor.setDate(cursor.getDate()-1); }
    $("#dash-streak").textContent = streak + " 天";
    $("#dash-last-study").textContent = dates.length ? "最近记录：" + dates[0] : "记录一次学习，开始积累";
    const path = $("#dashboard-path-progress");
    if (path) path.innerHTML = LEARNING_STAGES.map(stage => {
      const stats = stageStats(stage);
      const prereqsMet = stage.prerequisite.every(id => { const p=LEARNING_STAGES.find(item=>item.id===id); return p && stageStats(p).courses.length>0 && stageStats(p).done===stageStats(p).courses.length; });
      const next = stats.courses.find(course => !completed.has(course.id));
      const status = stats.courses.length && stats.done===stats.courses.length ? "本阶段已完成" : prereqsMet ? "可以开始" : "等待先修";
      return `<article class="dashboard-stage"><div class="dashboard-stage-top"><span class="stage-index">${String(LEARNING_STAGES.indexOf(stage)+1).padStart(2,"0")}</span><div><strong>${escapeHtml(stage.title)}</strong><small>${escapeHtml(status)} · ${stats.done}/${stats.courses.length} 门课程</small></div><span class="stage-percent">${stats.percent}%</span></div><div class="pathway-progress-track"><span style="width:${stats.percent}%"></span></div><p>${escapeHtml(stage.summary)}</p>${next ? `<button type="button" class="text-link dashboard-next-course" data-dashboard-course="${escapeHtml(next.id)}">${prereqsMet ? "下一步：" : "先修推荐："}${escapeHtml(next.title)} →</button>` : ""}</article>`;
    }).join("");
    const logCourse = $("#study-log-course");
    if (logCourse) {
      const previous = logCourse.value;
      logCourse.innerHTML = '<option value="">暂不关联课程</option>' + state.courses.map(course=>`<option value="${escapeHtml(course.id)}">${escapeHtml(course.title)}</option>`).join("");
      if (state.courses.some(course=>course.id===previous)) logCourse.value=previous;
    }
    const list=$("#recent-study-logs");
    if(list) {
      $("#study-log-count").textContent = studyLogs.length + " 条";
      list.innerHTML = [...studyLogs].sort((a,b)=>(b.createdAt||"").localeCompare(a.createdAt||"")).slice(0,5).map(log=>{
        const course=state.courses.find(item=>item.id===log.courseId);
        const when=log.createdAt ? new Date(log.createdAt).toLocaleString() : "时间未知";
        return `<article class="recent-log"><div><strong>${escapeHtml(log.title)}</strong><small>${escapeHtml(when)} · ${Math.max(0,Number(log.minutes)||0)} 分钟${course ? " · "+escapeHtml(course.title) : ""}</small></div>${log.reflection ? `<p>${escapeHtml(log.reflection)}</p>` : ""}</article>`;
      }).join("") || '<p class="study-muted">还没有学习记录。保存第一次学习后，这里会显示最近记录。</p>';
    }
  }
  function renderCourseTasks(courseId) {
    const tasks = Array.isArray(courseTasks[courseId]) ? courseTasks[courseId] : [];
    return tasks.length ? tasks.map(task=>`<div class="course-custom-task ${task.done ? "task-done" : ""}"><input type="checkbox" aria-label="完成任务：${escapeHtml(task.title)}" data-course-task-toggle="${escapeHtml(courseId)}" data-course-task-id="${escapeHtml(task.id)}" ${task.done ? "checked" : ""}><span>${escapeHtml(task.title)}</span><button type="button" class="note-delete" data-course-task-delete="${escapeHtml(courseId)}" data-course-task-id="${escapeHtml(task.id)}" aria-label="删除任务">删除</button></div>`).join("") : '<p class="study-muted">还没有自定义任务。可以添加习题、章节复盘或小项目。</p>';
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
      <section class="course-personal-plan">
        <h3>我的学习目标</h3><p class="study-muted">为这门课写下可检查的目标；只保存在当前浏览器。</p>
        <textarea id="course-goal-input" class="note-textarea" rows="3" maxlength="1500" placeholder="例如：完成线性代数前六讲，能手算矩阵乘法并解释特征值。">${escapeHtml(courseGoals[course.id] || "")}</textarea>
        <button type="button" class="secondary-button" data-goal-save="${escapeHtml(course.id)}">保存学习目标</button>
        <h3>我的实践任务</h3><form class="course-task-form" data-course-task-form="${escapeHtml(course.id)}"><input class="note-input" name="taskTitle" maxlength="160" placeholder="添加一个可执行的练习任务" required><button class="secondary-button" type="submit">添加任务</button></form>
        <div class="course-custom-tasks">${renderCourseTasks(course.id)}</div>
      </section>
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
    const personalButton = event.target.closest("[data-goal-save], [data-course-task-delete]");
    if (personalButton && personalButton.hasAttribute("data-goal-save")) {
      const id = personalButton.dataset.goalSave;
      courseGoals[id] = $("#course-goal-input").value.trim();
      if (saveObject(STORAGE_KEYS.goals, courseGoals)) showToast("课程学习目标已保存");
      return;
    }
    if (personalButton && personalButton.hasAttribute("data-course-task-delete")) {
      const id=personalButton.dataset.courseTaskDelete, taskId=personalButton.dataset.courseTaskId;
      courseTasks[id]=(courseTasks[id]||[]).filter(task=>task.id!==taskId);
      if(saveObject(STORAGE_KEYS.courseTasks,courseTasks)) showDetails(id);
      return;
    }
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const { action, id } = button.dataset;
    if (action === "save") toggleSet(saved, STORAGE_KEYS.saved, id, "已加入收藏", "已取消收藏");
    if (action === "complete") toggleSet(completed, STORAGE_KEYS.completed, id, "已标记为完成", "已取消完成标记");
  });
  $("#dialog-content").addEventListener("change", event => {
    const input=event.target.closest("[data-course-task-toggle]");
    if(!input) return;
    const courseId=input.dataset.courseTaskToggle, taskId=input.dataset.courseTaskId;
    const task=(courseTasks[courseId]||[]).find(item=>item.id===taskId);
    if(task) { task.done=input.checked; saveObject(STORAGE_KEYS.courseTasks,courseTasks); showDetails(courseId); }
  });
  $("#dialog-content").addEventListener("submit", event => {
    const form=event.target.closest("[data-course-task-form]");
    if(!form) return;
    event.preventDefault();
    const courseId=form.dataset.courseTaskForm, title=new FormData(form).get("taskTitle").toString().trim();
    if(!title) return;
    if(!Array.isArray(courseTasks[courseId])) courseTasks[courseId]=[];
    courseTasks[courseId].push({id:"ct-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,7),title,done:false});
    if(saveObject(STORAGE_KEYS.courseTasks,courseTasks)) { showDetails(courseId); showToast("课程任务已添加"); }
  });
  $("#dashboard-path-progress").addEventListener("click", event => {
    const button=event.target.closest("[data-dashboard-course]");
    if(button) showDetails(button.dataset.dashboardCourse);
  });
  $("#study-log-form").addEventListener("submit", event => {
    event.preventDefault();
    const title=$("#study-log-title").value.trim(), minutes=Number($("#study-log-minutes").value);
    if(!title || !Number.isInteger(minutes) || minutes<1 || minutes>1440) { showToast("请填写学习内容和 1–1440 分钟的有效时长"); return; }
    studyLogs.push({id:"log-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,7),title,minutes,courseId:$("#study-log-course").value,reflection:$("#study-log-reflection").value.trim(),createdAt:new Date().toISOString()});
    if(saveObject(STORAGE_KEYS.studyLogs,studyLogs)) { $("#study-log-title").value=""; $("#study-log-reflection").value=""; updateDashboard(); showToast("学习记录已保存"); }
  });
  const AI_ENDPOINT_KEY = "sls_ai_endpoint_v1";
  const AI_TOKEN_SESSION_KEY = "sls_ai_access_token_session";
  let aiConversation = [];
  let aiBusy = false;
  const endpointInput = $("#ai-api-endpoint");
  const tokenInput = $("#ai-access-token");
  const aiStatus = $("#ai-connection-status");
  const aiWorkspace = $("#ai-chat-workspace");
  const aiMessages = $("#ai-chat-messages");
  function normalizeAiEndpoint(value) { return String(value || "").trim().replace(/\/+$/, ""); }
  function getAiEndpoint() { return normalizeAiEndpoint(endpointInput.value || localStorage.getItem(AI_ENDPOINT_KEY) || ""); }
  function getAiToken() { return String(tokenInput.value || sessionStorage.getItem(AI_TOKEN_SESSION_KEY) || "").trim(); }
  function setAiStatus(message, connected=false) {
    aiStatus.textContent = message;
    aiStatus.classList.toggle("assistant-status-connected", connected);
  }
  function addAiMessage(role, content, meta="") {
    const empty = aiMessages.querySelector(".ai-chat-empty");
    if (empty) empty.remove();
    const article = document.createElement("article");
    article.className = "ai-message " + (role === "user" ? "ai-message-user" : role === "system" ? "ai-message-system" : "ai-message-assistant");
    const label = document.createElement("strong");
    label.className = "ai-message-label";
    label.textContent = role === "user" ? "你" : role === "system" ? "连接状态" : "学习助手";
    const body = document.createElement("p");
    body.className = "ai-message-body";
    body.textContent = content;
    article.append(label, body);
    if (meta) { const small=document.createElement("small"); small.textContent=meta; article.append(small); }
    aiMessages.append(article);
    aiMessages.scrollTop = aiMessages.scrollHeight;
    return article;
  }
  function renderAiConversation() {
    aiMessages.replaceChildren();
    if (!aiConversation.length) {
      const empty=document.createElement("p"); empty.className="ai-chat-empty";
      empty.textContent="你好！你可以让我解释一个概念、提示一道题的下一步，或根据学习目标安排复习。";
      aiMessages.append(empty); return;
    }
    aiConversation.forEach(message=>addAiMessage(message.role,message.content));
  }
  function populateAiCourseSelect() {
    const select=$("#ai-chat-course");
    if (!select) return;
    const previous=select.value;
    select.innerHTML='<option value="">不附加课程背景</option>'+state.courses.map(course=>`<option value="${escapeHtml(course.id)}">${escapeHtml(course.title)}</option>`).join("");
    if(state.courses.some(course=>course.id===previous)) select.value=previous;
  }
  function saveAiConnectionSettings(silent=false) {
    const endpoint=getAiEndpoint(), token=getAiToken();
    if (!/^https:\/\//i.test(endpoint) || !endpoint.endsWith("/api/chat")) {
      showToast("API 地址必须使用 HTTPS，并以 /api/chat 结尾"); endpointInput.focus(); return false;
    }
    if (!token || token.length < 20) { showToast("请填写 Worker 的访问令牌（至少 20 个字符）"); tokenInput.focus(); return false; }
    localStorage.setItem(AI_ENDPOINT_KEY,endpoint);
    sessionStorage.setItem(AI_TOKEN_SESSION_KEY,token);
    endpointInput.value=endpoint; tokenInput.value=token;
    if (!silent) { setAiStatus("连接设置已保存 · 尚未测试"); showToast("AI 连接设置已保存"); }
    return true;
  }
  async function testAiConnection() {
    if (!saveAiConnectionSettings()) return;
    const endpoint=getAiEndpoint().replace(/\/api\/chat$/, "/api/health");
    setAiStatus("正在测试连接…");
    $("#ai-test-connection").disabled=true;
    try {
      const response=await fetch(endpoint,{method:"GET",headers:{Authorization:"Bearer "+getAiToken(),Accept:"application/json"}});
      const data=await response.json().catch(()=>({}));
      if(!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
      setAiStatus("Worker 已连接 · API 配置正常",true);
      showToast("连接测试成功");
    } catch(error) {
      setAiStatus("连接失败 · "+String(error.message||"请检查地址、令牌和 Worker 配置"));
      showToast("连接测试失败：请检查 Worker 地址、访问令牌和部署配置");
    } finally { $("#ai-test-connection").disabled=false; }
  }
  $("#ai-api-endpoint").value=localStorage.getItem(AI_ENDPOINT_KEY)||"";
  $("#ai-access-token").value=sessionStorage.getItem(AI_TOKEN_SESSION_KEY)||"";
  $("#ai-assistant-toggle").addEventListener("change", event => {
    const enabled=event.target.checked;
    aiWorkspace.hidden=!enabled;
    $("#ai-connection-settings").hidden=!enabled;
    if(enabled) {
      populateAiCourseSelect();
      setAiStatus(getAiEndpoint()&&getAiToken()?"已填写连接信息 · 请先测试":"请配置 Worker 地址和访问令牌");
      if(!aiMessages.children.length) renderAiConversation();
    }
  });
  $("#ai-save-settings").addEventListener("click",saveAiConnectionSettings);
  $("#ai-test-connection").addEventListener("click",testAiConnection);
  $("#ai-clear-chat").addEventListener("click",()=>{
    if(aiBusy) return;
    aiConversation=[];
    renderAiConversation();
    showToast("本次对话已清空");
  });
  $("#ai-chat-form").addEventListener("submit",async event=>{
    event.preventDefault();
    if(aiBusy) return;
    const input=$("#ai-chat-input"), text=input.value.trim();
    if(!text) return;
    if(!getAiEndpoint()||!getAiToken()) {
      setAiStatus("尚未配置连接");
      showToast("请先填写 Worker 地址和访问令牌");
      $("#ai-connection-settings").scrollIntoView({behavior:"smooth",block:"center"});
      return;
    }
    if(!saveAiConnectionSettings(true)) return;
    const course=state.courses.find(item=>item.id===$("#ai-chat-course").value);
    const context=course?{
      title:course.title,
      description:String(course.description||"").slice(0,1200),
      topics:Array.isArray(course.topics)?course.topics.slice(0,12).map(x=>String(x).slice(0,100)):[],
      recommendation:String(course.recommendation||"").slice(0,800),
      goal:String(courseGoals[course.id]||"").slice(0,1000)
    }:{};
    if($("#ai-chat-mode").value==="plan" && $("#ai-include-progress").checked) {
      const recent=studyLogs.slice().sort((a,b)=>(b.createdAt||"").localeCompare(a.createdAt||"")).slice(0,5);
      context.learningProgress={
        completedCourses:state.courses.filter(item=>completed.has(item.id)).slice(0,20).map(item=>item.title),
        completedTasks:TASKS.filter(task=>completedTasks.has(task.id)).map(task=>task.title).slice(0,20).concat(Object.values(courseTasks).flat().filter(task=>task&&task.done).map(task=>task.title).slice(0,20)).slice(0,30),
        recentLogs:recent.map(log=>({title:String(log.title||"").slice(0,120),minutes:Math.max(0,Number(log.minutes)||0),reflection:String(log.reflection||"").slice(0,300),date:String(log.createdAt||"").slice(0,30)})),
        stageProgress:LEARNING_STAGES.map(stage=>{const stats=stageStats(stage);return {stage:stage.title,completed:stats.done,total:stats.courses.length};})
      };
    }
    aiConversation.push({role:"user",content:text});
    aiConversation=aiConversation.slice(-12);
    input.value="";
    renderAiConversation();
    const loading=addAiMessage("assistant","正在思考…");
    aiBusy=true;
    $("#ai-send-button").disabled=true;
    $("#ai-clear-chat").disabled=true;
    $("#ai-chat-hint").textContent="正在请求学习助手…";
    setAiStatus("正在请求 API…");
    try {
      const response=await fetch(getAiEndpoint(),{
        method:"POST",
        headers:{"Content-Type":"application/json",Authorization:"Bearer "+getAiToken(),Accept:"application/json"},
        body:JSON.stringify({mode:$("#ai-chat-mode").value,messages:aiConversation.slice(-12),context})
      });
      const data=await response.json().catch(()=>({}));
      if(!response.ok) throw new Error(data.error||`HTTP ${response.status}`);
      const reply=typeof data.reply==="string"?data.reply.trim():"";
      if(!reply) throw new Error("API 没有返回可显示的回答");
      loading.remove();
      aiConversation.push({role:"assistant",content:reply});
      aiConversation=aiConversation.slice(-12);
      renderAiConversation();
      setAiStatus("回答完成",true);
      $("#ai-chat-hint").textContent="对话仅保存在当前页面会话中；刷新后会清空。";
    } catch(error) {
      loading.remove();
      aiConversation=aiConversation.filter((message,index)=>!(message.role==="user"&&index===aiConversation.length-1));
      addAiMessage("assistant", "请求失败：" + String(error.message || "连接失败") + "\\n\\n请检查 Worker 地址、访问令牌、允许的网页来源和服务端模型配置后重试。");
      setAiStatus("请求失败 · 请检查配置");
      $("#ai-chat-hint").textContent="失败的问题未保存到对话历史，可以重新发送。";
    } finally {
      aiBusy=false;
      $("#ai-send-button").disabled=false;
      $("#ai-clear-chat").disabled=false;
      input.focus();
    }
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
      return `<div class="task-item ${done ? "task-done" : ""}"><input type="checkbox" data-task-id="${escapeHtml(task.id)}" aria-label="完成任务：${escapeHtml(task.title)}" ${done ? "checked" : ""}><span class="task-copy"><strong>${escapeHtml(task.title)}</strong><small>${escapeHtml(task.detail)}</small><em>${escapeHtml(course ? course.title : "完成相关课程后实践")}</em></span>${course ? `<button type="button" class="task-course-link" data-task-course="${escapeHtml(course.id)}">打开课程</button>` : ""}</div>`;
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
    const filter = $("#notes-course-filter");
    const previousFilter = filter.value;
    filter.innerHTML = '<option value="">全部课程</option>' + state.courses.map(course => `<option value="${escapeHtml(course.id)}">${escapeHtml(course.title)}</option>`).join("");
    if (state.courses.some(course => course.id === previousFilter)) filter.value = previousFilter;
    if (state.courses.some(course => course.id === previous)) select.value = previous;
    const list = $("#notes-list");
    $("#notes-count").textContent = `${notes.length} 条笔记`;
    const search = ($("#notes-search")?.value || "").trim().toLocaleLowerCase();
    const courseFilter = $("#notes-course-filter")?.value || "";
    const filteredNotes = [...notes].filter(note => {
      const haystack = `${note.title || ""} ${note.body}`.toLocaleLowerCase();
      return (!search || haystack.includes(search)) && (!courseFilter || note.courseId === courseFilter);
    });
    if (!filteredNotes.length) {
      list.innerHTML = notes.length ? '<p class="study-muted">没有符合条件的笔记。请调整搜索词或课程筛选。</p>' : '<p class="study-muted">还没有笔记，写下第一条学习记录吧。</p>';
      return;
    }
    list.innerHTML = filteredNotes.sort((a,b) => (b.updatedAt || "").localeCompare(a.updatedAt || "")).map(note => {
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
  $("#task-list").addEventListener("click", event => {
    const button = event.target.closest("[data-task-course]");
    if (!button) return;
    showDetails(button.dataset.taskCourse);
  });
  $("#notes-search").addEventListener("input", renderNotes);
  $("#notes-course-filter").addEventListener("change", renderNotes);
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
      version: 3,
      exportedAt: new Date().toISOString(),
      saved: [...saved],
      completed: [...completed],
      completedTasks: [...completedTasks],
      notes: notes.map(note => ({ ...note })),
      courseGoals: { ...courseGoals },
      courseTasks: JSON.parse(JSON.stringify(courseTasks)),
      studyLogs: studyLogs.map(log => ({ ...log }))
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
        if (!payload || payload.format !== "science-learning-studio-progress" || ![1, 2, 3].includes(payload.version) ||
            !Array.isArray(payload.saved) || !Array.isArray(payload.completed) || (payload.version >= 2 && (!Array.isArray(payload.completedTasks) || !Array.isArray(payload.notes))) || (payload.version >= 3 && (!payload.courseGoals || typeof payload.courseGoals !== "object" || !payload.courseTasks || typeof payload.courseTasks !== "object" || !Array.isArray(payload.studyLogs)) )) {
          throw new Error("备份文件格式不正确");
        }
        const validIds = new Set(state.courses.map((course) => course.id));
        const importedSaved = [...new Set(payload.saved.filter((id) => typeof id === "string" && validIds.has(id)))];
        const importedCompleted = [...new Set(payload.completed.filter((id) => typeof id === "string" && validIds.has(id)))];
        if (!window.confirm("导入将替换本设备当前的收藏、课程完成状态、任务进度、课程目标、自定义任务、学习记录和笔记。建议先导出当前记录备份。是否继续？")) return;
        const importedTasks = payload.version >= 2
          ? [...new Set(payload.completedTasks.filter(id => typeof id === "string" && TASKS.some(task => task.id === id)))]
          : [];
        const importedNotes = payload.version >= 2
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
        courseGoals = payload.version >= 3 && payload.courseGoals && typeof payload.courseGoals === "object" ? Object.fromEntries(Object.entries(payload.courseGoals).filter(([id,value])=>validIds.has(id)&&typeof value==="string").map(([id,value])=>[id,value.slice(0,1500)])) : {};
        courseTasks = payload.version >= 3 && payload.courseTasks && typeof payload.courseTasks === "object" ? Object.fromEntries(Object.entries(payload.courseTasks).filter(([id,list])=>validIds.has(id)&&Array.isArray(list)).map(([id,list])=>[id,list.filter(task=>task&&typeof task.id==="string"&&typeof task.title==="string").map(task=>({id:task.id,title:task.title.slice(0,160),done:Boolean(task.done)})).slice(0,200)])) : {};
        studyLogs = payload.version >= 3 && Array.isArray(payload.studyLogs) ? payload.studyLogs.filter(log=>log&&typeof log.id==="string"&&typeof log.title==="string"&&Number.isFinite(Number(log.minutes))).map(log=>({id:log.id,title:log.title.slice(0,120),minutes:Math.max(1,Math.min(1440,Math.round(Number(log.minutes)))),courseId:validIds.has(log.courseId)?log.courseId:"",reflection:String(log.reflection||"").slice(0,1500),createdAt:typeof log.createdAt==="string"?log.createdAt:new Date().toISOString()})).slice(-1000) : [];
        persist(STORAGE_KEYS.saved, saved);
        persist(STORAGE_KEYS.completed, completed);
        persist(STORAGE_KEYS.tasks, completedTasks);
        if (!persistNotes()) return;
        saveObject(STORAGE_KEYS.goals, courseGoals); saveObject(STORAGE_KEYS.courseTasks, courseTasks); saveObject(STORAGE_KEYS.studyLogs, studyLogs);
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