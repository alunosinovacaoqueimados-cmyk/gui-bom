
let courses = [];
let currentCourse = null;
let currentLesson = null;
let toastTimer;

const STORAGE = {
    users: "academia_users",
    session: "academia_session",
    progress: "academia_progress"
};

function getUsers() {
    return JSON.parse(localStorage.getItem(STORAGE.users) || "[]");
}

function getProgress() {
    return JSON.parse(localStorage.getItem(STORAGE.progress) || "{}");
}

function saveProgress(data) {
    localStorage.setItem(STORAGE.progress, JSON.stringify(data));
}

function getCurrentUser() {
    const email = localStorage.getItem(STORAGE.session);
    return getUsers().find(user => user.email === email) || null;
}

function getUserProgress() {
    const user = getCurrentUser();
    const all = getProgress();
    return user ? (all[user.email] || { xp: 0, courses: {}, certificates: [] }) : null;
}

function saveUserProgress(data) {
    const user = getCurrentUser();
    if (!user) return;

    const all = getProgress();
    all[user.email] = data;
    saveProgress(all);
}

// CARREGAR CURSOS

async function loadCourses() {
    try {
        const response = await fetch("data/dados.json");

        if (!response.ok) {
            throw new Error("Não foi possível carregar os cursos.");
        }

        const data = await response.json();
        courses = data.cursos;

        renderCourses();
        updateNavigation();
    } catch (error) {
        console.error(error);
        document.getElementById("coursesGrid").innerHTML =
            '<div class="empty-state">Não foi possível carregar os cursos. Verifique se o arquivo data/cursos.json está no lugar correto e se o site está sendo executado por um servidor.</div>';
    }
}

// EXIBIR CURSOS

function renderCourses() {
    const grid = document.getElementById("coursesGrid");
    const search = document.getElementById("courseSearch").value.toLowerCase();
    const category = document.getElementById("categoryFilter").value;

    const filtered = courses.filter(course => {
        const matchesSearch =
            course.titulo.toLowerCase().includes(search) ||
            course.descricao.toLowerCase().includes(search);

        const matchesCategory =
            category === "todos" || course.categoria === category;

        return matchesSearch && matchesCategory;
    });

    document.getElementById("courseCounter").textContent =
        `${filtered.length} ${filtered.length === 1 ? "curso" : "cursos"}`;

    if (!filtered.length) {
        grid.innerHTML = '<div class="empty-state">Nenhum curso encontrado. Tente outra pesquisa.</div>';
        return;
    }

    grid.innerHTML = filtered.map(course => {
        const total = getCourseLessons(course).length;
        const progress = getUserProgress();
        const done = progress?.courses[course.id]?.completedLessons?.length || 0;

        return `
        <article class="course-card">
            <div class="course-image">
                <img src="${escapeHTML(course.imagem)}"
                     alt="${escapeHTML(course.titulo)}"
                     loading="lazy"
                     onerror="this.style.display='none'">
                <span class="course-category">${escapeHTML(course.categoria)}</span>
            </div>

            <div class="course-body">
                <h3>${escapeHTML(course.titulo)}</h3>
                <p>${escapeHTML(course.descricao)}</p>

                <div class="course-meta">
                    <span><i class="fa-regular fa-clock"></i> ${escapeHTML(course.duracao)}</span>
                    <span><i class="fa-solid fa-signal"></i> ${escapeHTML(course.nivel)}</span>
                </div>

                <div class="course-footer">
                    <strong>${done}/${total} aulas</strong>
                    <button onclick="openCourse(${course.id})">
                        ${done ? "Continuar" : "Ver curso"} <i class="fa-solid fa-arrow-right"></i>
                    </button>
                </div>
            </div>
        </article>`;
    }).join("");
}

function getCourseLessons(course) {
    return course.modulos.flatMap((module, moduleIndex) =>
        module.aulas.map((lesson, lessonIndex) => ({
            ...lesson,
            moduleIndex,
            lessonIndex,
            moduleTitle: module.titulo
        }))
    );
}

function getVideoEmbedUrl(videoUrl) {
    if (!videoUrl) return "";

    const trimmed = videoUrl.trim();
    const match = trimmed.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/|youtube-nocookie\.com\/embed\/)([A-Za-z0-9_-]{11})/);

    if (match) {
        return `https://www.youtube.com/embed/${match[1]}`;
    }

    return trimmed;
}

// NAVEGAÇÃO

function hidePages() {
    ["homePage", "coursePage", "lessonPage", "dashboardPage"].forEach(id => {
        document.getElementById(id).classList.add("hidden");
    });
}

function showHome() {
    hidePages();
    document.getElementById("homePage").classList.remove("hidden");
    window.scrollTo(0, 0);
    renderCourses();
}

function showAbout() {
    showHome();
    document.getElementById("aboutSection").scrollIntoView({ behavior: "smooth" });
}

function scrollCourses() {
    showHome();
    setTimeout(() => {
        document.getElementById("cursos").scrollIntoView({ behavior: "smooth" });
    }, 100);
}

function toggleMenu() {
    const nav = document.querySelector(".nav-links");
    const visible = nav.style.display === "flex";

    nav.style.display = visible ? "none" : "flex";
    nav.style.flexDirection = "column";
    nav.style.position = "absolute";
    nav.style.top = "65px";
    nav.style.left = "0";
    nav.style.right = "0";
    nav.style.padding = "20px";
    nav.style.background = "white";
    nav.style.borderBottom = "1px solid #e6eaf1";
}

// PÁGINA DO CURSO

function openCourse(id) {
    const course = courses.find(item => item.id === id);
    if (!course) return;

    currentCourse = course;
    hidePages();

    document.getElementById("coursePage").classList.remove("hidden");

    const progress = getUserProgress();
    const courseProgress = progress?.courses[id] || { completedLessons: [] };
    const lessons = getCourseLessons(course);
    const completed = courseProgress.completedLessons.length;

    let modulesHTML = course.modulos.map((module, moduleIndex) => `
        <div class="module-card">
            <div class="module-heading">
                Módulo ${moduleIndex + 1} — ${escapeHTML(module.titulo)}
            </div>

            ${module.aulas.map((lesson, lessonIndex) => {
                const index = lessons.findIndex(item =>
                    item.moduleIndex === moduleIndex &&
                    item.lessonIndex === lessonIndex
                );

                const done = courseProgress.completedLessons.includes(index);

                return `
                    <div class="module-lesson">
                        <span>
                            <i class="fa-solid ${done ? "fa-circle-check" : "fa-play-circle"}"
                               style="color:${done ? "#16a36a" : "#246bce"}"></i>
                            ${escapeHTML(lesson.titulo)}
                            <small> · ${escapeHTML(lesson.duracao)}</small>
                        </span>
                        <button onclick="openLesson(${index})">
                            ${done ? "Revisar" : "Estudar"}
                        </button>
                    </div>
                `;
            }).join("")}
        </div>
    `).join("");

    document.getElementById("courseDetailContent").innerHTML = `
        <div class="course-banner">
            <div>
                <span class="eyebrow">${escapeHTML(course.categoria.toUpperCase())}</span>
                <h1>${escapeHTML(course.titulo)}</h1>
                <p>${escapeHTML(course.descricao)}</p>
                <div style="margin-top:22px">
                    <button class="btn btn-primary" onclick="openLesson(${firstPendingLesson(course, courseProgress)})">
                        ${completed ? "Continuar aprendendo" : "Começar curso"}
                        <i class="fa-solid fa-arrow-right"></i>
                    </button>
                </div>
            </div>

            <div class="banner-info">
                <div><span><i class="fa-regular fa-clock"></i> Duração</span><strong>${escapeHTML(course.duracao)}</strong></div>
                <div><span><i class="fa-solid fa-signal"></i> Nível</span><strong>${escapeHTML(course.nivel)}</strong></div>
                <div><span><i class="fa-solid fa-book"></i> Lições</span><strong>${lessons.length}</strong></div>
                <div><span><i class="fa-solid fa-check"></i> Concluídas</span><strong>${completed}/${lessons.length}</strong></div>
            </div>
        </div>

        <div style="margin-top:25px">
            <strong>Seu progresso: ${Math.round(completed / lessons.length * 100)}%</strong>
            <div class="progress-track" style="margin-top:10px">
                <span style="width:${completed / lessons.length * 100}%"></span>
            </div>
        </div>

        <div class="module-list">
            <h2>Conteúdo programático</h2>
            ${modulesHTML}
        </div>

        ${completed === lessons.length ? `
            <div class="module-card" style="padding:25px;margin-top:25px">
                <h3><i class="fa-solid fa-award" style="color:#d6a12b"></i> Curso concluído!</h3>
                <p style="font-size:13px;margin:10px 0">Você completou todas as lições deste curso.</p>
                <button class="btn btn-primary" onclick="finishCourse(${course.id})">
                    Emitir certificado
                </button>
            </div>
        ` : ""}
    `;

    window.scrollTo(0, 0);
}

function firstPendingLesson(course, progress) {
    const lessons = getCourseLessons(course);
    const next = lessons.findIndex((lesson, index) =>
        !progress.completedLessons.includes(index)
    );

    return next === -1 ? 0 : next;
}

// AULAS

function openLesson(index) {
    if (!getCurrentUser()) {
        showToast("Entre ou crie sua conta para acompanhar seu progresso.");
        openAuth("register");
        return;
    }

    const progress = getUserProgress();
    const completed = progress.courses[currentCourse.id]?.completedLessons || [];
    const lessons = getCourseLessons(currentCourse);

    if (index < 0 || index >= lessons.length) return;

    // Evita pular lições ainda não concluídas.
    if (index > 0 && !completed.includes(index - 1) && !completed.includes(index)) {
        showToast("Conclua a lição anterior para continuar.");
        return;
    }

    currentLesson = index;

    const lesson = lessons[index];

    hidePages();
    document.getElementById("lessonPage").classList.remove("hidden");

    const isDone = completed.includes(index);

    const optionsHTML = lesson.opcoes.map((option, optionIndex) => `
        <label class="quiz-option">
            <input type="radio" name="quizAnswer" value="${optionIndex}">
            ${escapeHTML(option)}
        </label>
    `).join("");

    const videoMarkup = lesson.video ? `
        <div class="lesson-video">
            <div class="video-frame">
                <iframe
                    src="${getVideoEmbedUrl(lesson.video)}"
                    title="${escapeHTML(lesson.titulo)}"
                    frameborder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowfullscreen>
                </iframe>
            </div>
        </div>
    ` : `
        <div class="lesson-video">
            <i class="fa-solid fa-circle-play"></i>
            <h2>${escapeHTML(lesson.titulo)}</h2>
            <small>${escapeHTML(lesson.duracao)} de aprendizagem</small>
            <p>Espaço para a videoaula desta lição.</p>
        </div>
    `;

    document.getElementById("lessonContent").innerHTML = `
        ${videoMarkup}

        <div class="lesson-article">
            <span class="eyebrow">MATERIAL DE ESTUDO</span>
            <h2>${escapeHTML(lesson.titulo)}</h2>
            ${lesson.texto.split(/\n\n+/).map(paragraph => `<p>${escapeHTML(paragraph)}</p>`).join("")}
        </div>

        <div class="lesson-quiz">
            <span class="eyebrow">TESTE SEU CONHECIMENTO</span>
            <h3>${escapeHTML(lesson.pergunta)}</h3>

            ${optionsHTML}

            <button class="btn btn-primary" onclick="checkAnswer()">
                Verificar resposta
            </button>

            <div id="quizFeedback"></div>
        </div>

        <div class="lesson-next">
            <button class="btn btn-outline" onclick="returnToCourse()">Voltar</button>
            ${isDone ? `
                <button class="btn btn-primary" onclick="nextLesson()">Próxima lição <i class="fa-solid fa-arrow-right"></i></button>
            ` : ""}
        </div>
    `;

    renderLessonSidebar();
    window.scrollTo(0, 0);
}

function renderLessonSidebar() {
    const lessons = getCourseLessons(currentCourse);
    const progress = getUserProgress();
    const completed = progress.courses[currentCourse.id]?.completedLessons || [];

    document.getElementById("lessonList").innerHTML =
        lessons.map((lesson, index) => `
            <button class="${index === currentLesson ? "active" : ""}"
                    onclick="openLesson(${index})"
                    ${index > 0 && !completed.includes(index - 1) && !completed.includes(index) ? "disabled" : ""}>
                <i class="fa-solid ${completed.includes(index) ? "fa-circle-check" : "fa-play"}"></i>
                ${index + 1}. ${escapeHTML(lesson.titulo)}
            </button>
        `).join("");
}

// CORRIGIR RESPOSTAS

function checkAnswer() {
    const selected = document.querySelector('input[name="quizAnswer"]:checked');

    if (!selected) {
        showToast("Escolha uma alternativa primeiro.");
        return;
    }

    const lessons = getCourseLessons(currentCourse);
    const lesson = lessons[currentLesson];
    const answer = Number(selected.value);
    const feedback = document.getElementById("quizFeedback");

    if (answer === lesson.resposta) {
        const progress = getUserProgress();

        if (!progress.courses[currentCourse.id]) {
            progress.courses[currentCourse.id] = {
                completedLessons: []
            };
        }

        const completed = progress.courses[currentCourse.id].completedLessons;

        if (!completed.includes(currentLesson)) {
            completed.push(currentLesson);
            progress.xp += 20;
            saveUserProgress(progress);
        }

        feedback.className = "quiz-feedback";
        feedback.style.background = "#eaf8f0";
        feedback.style.color = "#16734d";

        feedback.innerHTML = `
            <strong><i class="fa-solid fa-check-circle"></i> Resposta correta!</strong>
            <p>${escapeHTML(lesson.explicacao)}</p>
            <p><strong>+20 XP</strong> por concluir a lição.</p>
            <button class="btn btn-primary" style="margin-top:12px" onclick="nextLesson()">
                Continuar <i class="fa-solid fa-arrow-right"></i>
            </button>
        `;

        renderLessonSidebar();
        updateNavigation();
    } else {
        feedback.className = "quiz-feedback";
        feedback.style.background = "#fff0f0";
        feedback.style.color = "#b93232";

        feedback.innerHTML = `
            <strong><i class="fa-solid fa-circle-exclamation"></i> Não foi dessa vez!</strong>
            <p>Tente novamente. Leia o material e escolha outra alternativa.</p>
        `;
    }
}

function nextLesson() {
    const progress = getUserProgress();
    const lessons = getCourseLessons(currentCourse);
    const completed = progress.courses[currentCourse.id]?.completedLessons || [];

    if (!completed.includes(currentLesson)) {
        showToast("Responda corretamente antes de avançar.");
        return;
    }

    if (currentLesson + 1 < lessons.length) {
        if (!completed.includes(currentLesson + 1)) {
            openLesson(currentLesson + 1);
        } else {
            openLesson(currentLesson + 1);
        }
    } else {
        returnToCourse();
        showToast("Parabéns! Você terminou todas as lições.");
    }
}

function returnToCourse() {
    if (currentCourse) openCourse(currentCourse.id);
}

// CERTIFICADOS

function finishCourse(id) {
    const user = getCurrentUser();

    if (!user) {
        openAuth("register");
        return;
    }

    const course = courses.find(item => item.id === id);
    const progress = getUserProgress();
    const lessons = getCourseLessons(course);
    const completed = progress.courses[id]?.completedLessons || [];

    if (completed.length !== lessons.length) {
        showToast("Você ainda precisa concluir todas as lições.");
        return;
    }

    if (!progress.certificates.includes(id)) {
        progress.certificates.push(id);
        saveUserProgress(progress);
    }

    createCertificate(course, user);
}

function createCertificate(course, user) {
    const date = new Date().toLocaleDateString("pt-BR");
    const code = `AD-${course.id}-${Date.now().toString(36).toUpperCase()}`;

    const certificate = window.open("", "_blank");

    if (!certificate) {
        showToast("Permita a abertura de janelas para imprimir seu certificado.");
        return;
    }

    certificate.document.write(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <title>Certificado - ${escapeHTML(course.titulo)}</title>
        <style>
            * { box-sizing: border-box; }
            body {
                font-family: Georgia, serif;
                padding: 30px;
                background: #f2f4f8;
                color: #172541;
            }
            .certificate {
                background: white;
                border: 12px double #246bce;
                outline: 2px solid #d2a54a;
                outline-offset: -22px;
                padding: 65px 45px;
                max-width: 1000px;
                min-height: 620px;
                margin: auto;
                text-align: center;
            }
            h1 { font-size: 42px; color: #172541; margin: 20px; }
            .brand { color: #246bce; font-weight: bold; letter-spacing: 4px; }
            .subtitle { letter-spacing: 3px; color: #9c7a32; }
            .student { font-size: 34px; border-bottom: 1px solid #aaa; padding: 15px; margin: 25px auto; max-width: 650px; }
            .course { color: #246bce; font-size: 26px; font-weight: bold; }
            .details { margin-top: 40px; font-size: 13px; color: #68758b; }
            button { padding: 12px 25px; background: #246bce; color: white; border: 0; cursor: pointer; border-radius: 6px; margin-top: 25px; }
            @media print { body { background: white; padding: 0; } button { display: none; } }
        </style>
    </head>
    <body>
        <div class="certificate">
            <div class="brand">ACADEMIA DIGITAL</div>
            <h1>CERTIFICADO</h1>
            <div class="subtitle">DE CONCLUSÃO DE CURSO</div>
            <p>Certificamos que</p>
            <div class="student">${escapeHTML(user.name)}</div>
            <p>concluiu com aproveitamento o curso de</p>
            <div class="course">${escapeHTML(course.titulo)}</div>
            <p>com carga horária declarada de ${escapeHTML(course.duracao)}.</p>
            <div class="details">
                Data de conclusão: ${date}<br>
                Código de validação: ${code}
            </div>
            <p style="margin-top:40px">Academia Digital</p>
            <button onclick="window.print()">Imprimir / Salvar em PDF</button>
        </div>
    </body>
    </html>
    `);

    certificate.document.close();
}

// CADASTRO E LOGIN

function openAuth(type) {
    document.getElementById("authModal").classList.remove("hidden");
    switchAuth(type);
}

function closeAuth() {
    document.getElementById("authModal").classList.add("hidden");
}

function switchAuth(type) {
    document.getElementById("loginForm").classList.toggle("hidden", type !== "login");
    document.getElementById("registerForm").classList.toggle("hidden", type !== "register");
}

function register(event) {
    event.preventDefault();

    const name = document.getElementById("registerName").value.trim();
    const email = document.getElementById("registerEmail").value.trim().toLowerCase();
    const password = document.getElementById("registerPassword").value;

    if (name.length < 3 || password.length < 6) {
        showToast("Confira os dados informados.");
        return;
    }

    const users = getUsers();

    if (users.some(user => user.email === email)) {
        showToast("Este e-mail já possui cadastro.");
        return;
    }

    users.push({ name, email, password });
    localStorage.setItem(STORAGE.users, JSON.stringify(users));
    localStorage.setItem(STORAGE.session, email);

    const all = getProgress();
    all[email] = { xp: 0, courses: {}, certificates: [] };
    saveProgress(all);

    closeAuth();
    updateNavigation();
    showToast("Conta criada com sucesso!");
    showDashboard();
}

function login(event) {
    event.preventDefault();

    const email = document.getElementById("loginEmail").value.trim().toLowerCase();
    const password = document.getElementById("loginPassword").value;

    const user = getUsers().find(item =>
        item.email === email && item.password === password
    );

    if (!user) {
        showToast("E-mail ou senha incorretos.");
        return;
    }

    localStorage.setItem(STORAGE.session, email);

    closeAuth();
    updateNavigation();
    showToast("Login realizado com sucesso!");
    showDashboard();
}

function logout() {
    localStorage.removeItem(STORAGE.session);
    updateNavigation();
    showHome();
    showToast("Você saiu da sua conta.");
}

// PAINEL DO ALUNO

function showDashboard() {
    const user = getCurrentUser();

    if (!user) {
        openAuth("login");
        return;
    }

    hidePages();
    document.getElementById("dashboardPage").classList.remove("hidden");

    const progress = getUserProgress();
    const courseIds = Object.keys(progress.courses);

    document.getElementById("studentName").textContent = user.name.split(" ")[0];
    document.getElementById("statCourses").textContent = courseIds.length;
    document.getElementById("statXP").textContent = progress.xp;
    document.getElementById("statCertificates").textContent = progress.certificates.length;

    const myCourses = document.getElementById("myCourses");

    if (!courseIds.length) {
        myCourses.innerHTML = '<p class="empty-state">Você ainda não começou nenhum curso. Explore o catálogo e escolha seu primeiro curso!</p>';
    } else {
        myCourses.innerHTML = courseIds.map(id => {
            const course = courses.find(item => item.id === Number(id));
            if (!course) return "";

            const total = getCourseLessons(course).length;
            const done = progress.courses[id].completedLessons.length;
            const percent = Math.round(done / total * 100);

            return `
                <div class="my-course">
                    <h3>${escapeHTML(course.titulo)}</h3>
                    <p>${done} de ${total} lições concluídas</p>
                    <div class="progress-track">
                        <span style="width:${percent}%"></span>
                    </div>
                    <small>${percent}% concluído</small>
                    <br>
                    <button onclick="openCourse(${course.id})">Acessar curso</button>
                </div>
            `;
        }).join("");
    }

    const certificates = document.getElementById("myCertificates");

    if (!progress.certificates.length) {
        certificates.innerHTML = '<p class="empty-state">Seus certificados aparecerão aqui após a conclusão dos cursos.</p>';
    } else {
        certificates.innerHTML = progress.certificates.map(id => {
            const course = courses.find(item => item.id === id);
            return `
                <div class="certificate-item">
                    <strong>${escapeHTML(course?.titulo || "Curso")}</strong>
                    <p style="font-size:11px;color:#778197">Curso concluído</p>
                    <button onclick="createCertificate(${JSON.stringify(course)},getCurrentUser())">
                        <i class="fa-solid fa-download"></i> Gerar certificado
                    </button>
                </div>
            `;
        }).join("");
    }

    window.scrollTo(0, 0);
}

// ATUALIZAR CABEÇALHO

function updateNavigation() {
    const user = getCurrentUser();
    const nav = document.getElementById("navActions");

    if (!user) {
        nav.innerHTML = `
            <button class="btn btn-outline" onclick="openAuth('login')">Entrar</button>
            <button class="btn btn-primary" onclick="openAuth('register')">Criar conta</button>
        `;
    } else {
        nav.innerHTML = `
            <button class="btn btn-outline" onclick="showDashboard()">
                <i class="fa-solid fa-user"></i> Minha área
            </button>
        `;
    }
}

// UTILITÁRIOS

function showToast(message) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 3000);
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[character]);
}

// EVENTOS

document.getElementById("courseSearch").addEventListener("input", renderCourses);
document.getElementById("categoryFilter").addEventListener("change", renderCourses);

document.getElementById("authModal").addEventListener("click", event => {
    if (event.target.id === "authModal") closeAuth();
});

document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeAuth();
});

// INICIALIZAÇÃO

loadCourses();
updateNavigation();
function createCertificateById(id) {
    const course = courses.find(item => item.id === Number(id));
    const user = getCurrentUser();

    if (course && user) {
        createCertificate(course, user);
    }
}