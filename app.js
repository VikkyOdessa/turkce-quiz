/* Türkçe Quiz — ЛОГІКА застосунку */
let LANG = null;
try { LANG = localStorage.getItem('tq_lang'); } catch (e) {}
/* Поки російська вимкнена — всіх переводимо на українську */
if (LANG === 'ru') LANG = 'uk';
const t = k => I18N[LANG || 'uk'][k];

function loadBest() {
  try { return JSON.parse(localStorage.getItem('tq_best') || '{}'); } catch (e) { return {}; }
}
function saveBest(id, sc) {
  try {
    const b = loadBest();
    if (!(id in b) || sc > b[id]) { b[id] = sc; localStorage.setItem('tq_best', JSON.stringify(b)); }
  } catch (e) {}
}
function topicTotal(tp) { return tp.type === 'vocab' ? tp.words.length : tp.questions.length; }

/* ------------------ озвучка ------------------ */
const ttsOk = 'speechSynthesis' in window;
if (!ttsOk) document.documentElement.classList.add('no-tts');
let lastSpeakBtn = null;
let trVoice = null;
function pickVoice() {
  if (!ttsOk) return;
  let all = [];
  try { all = window.speechSynthesis.getVoices() || []; } catch (e) { all = []; }
  const voices = all.filter(v => v.lang && v.lang.toLowerCase().startsWith('tr'));
  if (!voices.length) { trVoice = null; return; }
  // рейтинг: натуральні онлайн-голоси > Google > локальні > решта
  const rank = v => {
    const n = (v.name || '').toLowerCase();
    if (n.includes('natural')) return 4;
    if (n.includes('google')) return 3;
    if (n.includes('online')) return 2;
    return 1;
  };
  voices.sort((a, b) => rank(b) - rank(a));
  trVoice = voices[0];
}
if (ttsOk) { try { pickVoice(); window.speechSynthesis.onvoiceschanged = pickVoice; } catch (e) {} }
function speak(text, rate) {
  if (!ttsOk) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'tr-TR';
    if (trVoice) u.voice = trVoice;
    u.rate = rate;
    window.speechSynthesis.speak(u);
  } catch (e) {}
}

/* ------------------ аналітика ------------------ */
let NOTRACK = false;
try { NOTRACK = localStorage.getItem('tq_notrack') === '1'; } catch (e) {}
if (location.hash === '#notrack') {
  try { localStorage.setItem('tq_notrack', '1'); NOTRACK = true; } catch (e) {}
}
function track(path, isEvent) {
  if (NOTRACK) return;
  if (window.goatcounter && window.goatcounter.count) {
    window.goatcounter.count({ path: path, event: !!isEvent });
  }
}
// встановлення PWA і запуски як застосунку
window.addEventListener('appinstalled', () => track('pwa-install', true));
if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
  track('pwa-launch', true);
}

/* ------------------ навігація ------------------ */
const screens = {
  lang: document.getElementById('screen-lang'),
  home: document.getElementById('screen-home'),
  topics: document.getElementById('screen-topics'),
  dict: document.getElementById('screen-dict'),
  quiz: document.getElementById('screen-quiz')
};
let TRAIN_TOPIC = null;
const backBtn = document.getElementById('backBtn');
const nazarRow = document.getElementById('nazarRow');
let curLevel = 'a1';
let curTopic = null;

function route() {
  if (!LANG) return { s: 'lang' };
  const h = location.hash.slice(1);
  if (h === 'a1' || h === 'a2' || h === 'b1') return { s: 'topics', level: h };
  if (h === 'd-a1' || h === 'd-a2' || h === 'd-b1') return { s: 'dict', level: h.slice(2) };
  if (h === 'q-train' && TRAIN_TOPIC) return { s: 'quiz', topic: TRAIN_TOPIC };
  if (h.indexOf('q-') === 0) {
    const tp = TOPICS.find(x => x.id === h.slice(2));
    if (tp) return { s: 'quiz', topic: tp };
  }
  return { s: 'home' };
}

function countLabel(n) {
  if (LANG === 'ru') return n + ' ' + (n === 1 ? 'тема' : n < 5 ? 'темы' : 'тем');
  return n + ' ' + (n === 1 ? 'тема' : n < 5 ? 'теми' : 'тем');
}

function renderDict(level) {
  const info = levelKnown(level);
  document.getElementById('dictHead').innerHTML =
    '<h2><span class="ph-lv">' + level.toUpperCase() + '</span> · 📖 ' + t('dictTitle') + '</h2>' +
    '<p class="dict-know">' + t('knowLabel') + ' <b>' + info.know + '</b> ' + t('ofLabel') + ' ' + info.total + '</p>';

  const search = document.getElementById('dictSearch');
  search.placeholder = t('searchPh');
  search.value = '';

  const weak = DICT[level].filter(x => wordStatus(x.w) < 2);
  const btn = document.getElementById('trainBtn');
  if (weak.length) {
    btn.disabled = false;
    btn.textContent = t('trainWeak') + ' (' + weak.length + ')';
  } else {
    btn.disabled = true;
    btn.textContent = t('allKnown');
  }
  btn.onclick = () => {
    if (!weak.length) return;
    TRAIN_TOPIC = {
      id: 'train-' + level, level: level, type: 'vocab', dynamic: true,
      backTo: 'd-' + level,
      name: { uk: '🎯 Тренування слабких слів', ru: '🎯 Тренировка слабых слов' },
      words: shuffle(weak).slice(0, 10)
    };
    curTopic = null;
    location.hash = 'q-train';
  };

  const list = document.getElementById('dictList');
  function draw(filter) {
    const f = trLower(filter || '');
    list.innerHTML = '';
    DICT[level].forEach(item => {
      const hay = trLower(item.w + ' ' + item.tr.uk + ' ' + item.tr.ru);
      if (f && hay.indexOf(f) === -1) return;
      const st = wordStatus(item.w);
      const row = document.createElement('div');
      row.className = 'dict-row';
      row.innerHTML =
        '<span class="d-emoji">' + item.e + '</span>' +
        '<span class="d-main"><b>' + item.w + '</b><span class="d-tr">' + (item.tr[LANG] || item.tr.uk) + '</span></span>' +
        '<button class="speak" aria-label="🔊">🔊</button>' +
        '<span class="d-st st' + st + '">' + t(['stNew', 'stLearn', 'stKnow'][st]) + '</span>';
      row.querySelector('.speak').addEventListener('click', () => speak(item.w, 0.9));
      list.appendChild(row);
    });
  }
  draw('');
  search.oninput = () => draw(search.value);

  document.getElementById('dictExHead').innerHTML =
    '<h2>' + t('exTitle') + '</h2><p>' + t('exSub') + '</p>';
  const exGrid = document.getElementById('dictTopics');
  exGrid.innerHTML = '';
  TOPICS.filter(x => x.level === level).forEach((tp, i) => exGrid.appendChild(buildTopicCard(tp, i + 1)));

  /* словник — не глухий кут: далі наступний рівень або додому */
  const nextBox = document.getElementById('dictNext');
  const ni = LEVEL_ORDER.indexOf(level) + 1;
  const nextLv = LEVEL_ORDER[ni];
  nextBox.innerHTML = '';
  const nb = document.createElement('button');
  nb.className = 'btn-restart next-btn';
  if (nextLv) {
    nb.textContent = t('startLevel') + ' ' + nextLv.toUpperCase();
    nb.onclick = () => { location.hash = nextLv; };
  } else {
    nb.textContent = '🏠 ' + t('toLevels');
    nb.onclick = () => { location.hash = ''; };
  }
  nextBox.appendChild(nb);
}

const LEVEL_LABEL = {
  a1: { uk: 'Початковий', ru: 'Начальный' },
  a2: { uk: 'Середній',   ru: 'Средний' },
  b1: { uk: 'Просунутий', ru: 'Продвинутый' }
};

function renderTopics(level) {
  const grid = document.getElementById('topicGrid');
  grid.innerHTML = '';

  const list = TOPICS.filter(x => x.level === level);
  const bests = loadBest();
  let sumB = 0, sumT = 0, allDone = true;
  list.forEach(tp => {
    const tot = topicTotal(tp);
    const b = Math.min(bests[tp.id] || 0, tot);
    sumB += b; sumT += tot;
    if (b < tot) allDone = false;
  });
  const lpct = sumT ? Math.round(sumB / sumT * 100) : 0;

  /* верхня пігулка рівня — клікабельна, відкриває перемикач рівнів */
  const lvlName = (LEVEL_LABEL[level] || {})[LANG] || '';
  document.getElementById('topicsHead').innerHTML =
    '<button class="lvl-pill" id="lvlPickBtn">' +
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
        'stroke-width="2.2" stroke-linecap="round">' +
        '<line x1="8" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="20" y2="12"/>' +
        '<line x1="8" y1="18" x2="20" y2="18"/><circle cx="4" cy="6" r="1"/>' +
        '<circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>' +
      '</svg>' +
      '<span class="lp-text">' + lvlName + ' ' + level.toUpperCase() +
        ' <span class="lp-pct">· ' + lpct + '%</span></span>' +
      '<svg class="lp-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" ' +
        'stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">' +
        '<polyline points="9 6 15 12 9 18"/></svg>' +
    '</button>';
  document.getElementById('lvlPickBtn').addEventListener('click', () => openLevelPicker(level));
  /* нова сторінка: пігулка видима і з правильним відступом під шапку */
  const th = document.getElementById('topicsHead');
  th.classList.remove('pill-hidden');
  const tw = document.querySelector('.topbar-wrap');
  if (tw) th.style.top = tw.offsetHeight + 'px';

  const head = document.createElement('div');
  head.className = 'bp-head';
  head.innerHTML =
    '<h3>' + t('sub_topics') + (allDone ? ' <span class="bp-big-check">✓</span>' : '') +
      '<span class="bp-head-pct">' + lpct + '%</span></h3>' +
    '<div class="bp-bar"><div class="bp-fill" style="width:' + lpct + '%"></div></div>';
  grid.appendChild(head);

  list.forEach((tp, i) => grid.appendChild(buildTopicCard(tp, i + 1)));
  grid.appendChild(buildDictCard(level, list.length + 1));
}

/* прогрес рівня: скільки набрано / всього + % */
function levelProgress(lv) {
  const tps = TOPICS.filter(x => x.level === lv);
  const b = loadBest();
  let got = 0, tot = 0;
  tps.forEach(tp => { const n = topicTotal(tp); tot += n; got += Math.min(b[tp.id] || 0, n); });
  return { pct: tot ? Math.round(got / tot * 100) : 0, count: tps.length };
}

/* Модалка-перемикач рівнів: учень бачить прогрес кожного рівня й обирає */
function openLevelPicker(current) {
  const L = (uk, ru) => (LANG === 'ru' ? ru : uk);
  const back = document.createElement('div');
  back.className = 'modal-back';

  const rows = LEVEL_ORDER.map(lv => {
    const p = levelProgress(lv);
    const name = ((LEVEL_LABEL[lv] || {})[LANG] || '') + ' ' + lv.toUpperCase();
    const cls = 'lvl-item' + (lv === current ? ' current' : '') + (p.pct === 100 ? ' done-lv' : '');
    const here = lv === current ? '<span class="lvl-here">' + L('ви тут', 'вы здесь') + '</span>' : '';
    return (
      '<button class="' + cls + '" data-lv="' + lv + '">' +
        '<span class="lvl-ico" style="--lp:' + p.pct + '%">' + lv.toUpperCase() + '</span>' +
        '<span class="lvl-main">' +
          '<span class="lvl-name">' + name + '</span>' +
          '<span class="lvl-meta">' + countLabel(p.count) + ' · ' + p.pct + '%</span>' +
        '</span>' + here +
      '</button>'
    );
  }).join('');

  const cefr = L(
    'CEFR — міжнародна шкала володіння мовою від A1 (початківець) до C2 (вільно). A1–A2 — базове спілкування, B1 — впевнена побутова мова.',
    'CEFR — международная шкала владения языком от A1 (начинающий) до C2 (свободно). A1–A2 — базовое общение, B1 — уверенная бытовая речь.'
  );

  back.innerHTML =
    '<div class="lvl-modal">' +
      '<div class="lvl-modal-head">' +
        '<span class="lvl-flag">🧿</span>' +
        '<h3>' + L('Турецька: рівні курсу', 'Турецкий: уровни курса') + '</h3>' +
        '<button class="lvl-close" aria-label="' + L('Закрити', 'Закрыть') + '">×</button>' +
      '</div>' +
      '<button class="lvl-cefr">' +
        '<span class="lc-i">i</span>' + L('Що таке система рівнів CEFR', 'Что такое система уровней CEFR') +
        '<svg class="lc-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" ' +
          'stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">' +
          '<polyline points="9 6 15 12 9 18"/></svg>' +
      '</button>' +
      '<div class="lvl-cefr-body">' + cefr + '</div>' +
      '<div class="lvl-list">' + rows + '</div>' +
    '</div>';

  const close = () => back.remove();
  back.querySelector('.lvl-close').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });

  const cefrBtn = back.querySelector('.lvl-cefr');
  cefrBtn.addEventListener('click', () => {
    cefrBtn.classList.toggle('open');
    back.querySelector('.lvl-cefr-body').classList.toggle('show');
  });

  back.querySelectorAll('.lvl-item').forEach(it => {
    it.addEventListener('click', () => {
      const lv = it.dataset.lv;
      close();
      if (lv !== current) location.hash = lv;
    });
  });

  document.body.appendChild(back);
}

function buildDictCard(level, stepNo) {
  const info = levelKnown(level);
  const dpct = info.total ? Math.round(info.know / info.total * 100) : 0;
  const b = document.createElement('button');
  b.className = 'bp-row bp-dict' + (dpct === 100 ? ' done' : '');
  b.innerHTML =
    '<span class="bp-node"><span class="bp-emoji">📖</span><span class="bp-check">✓</span></span>' +
    '<span class="bp-main">' +
      '<span class="bp-title">' + t('dictTitle') + ' ' + level.toUpperCase() + '</span>' +
      '<span class="bp-desc">' + t('dictDesc') + '</span>' +
    '</span>' +
    '<span class="bp-score">' + info.know + '/' + info.total + '</span>';
  b.addEventListener('click', () => { location.hash = 'd-' + level; });
  return b;
}
function nextAfter(tp) {
  const list = TOPICS.filter(x => x.level === tp.level);
  const i = list.indexOf(tp);
  return i >= 0 ? list[i + 1] || null : null;
}

/* Повний перезапуск теми: чистить стрічку, рендерить заново, підіймає нагору */
function restartTopic(tp) {
  try { history.replaceState(null, '', '#q-' + tp.id); } catch (e) {}
  curTopic = tp;
  quizBuilt = true;
  renderQuiz(false, false, false);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function appendNextTopic(nx) {
  try { history.replaceState(null, '', '#q-' + nx.id); } catch (e) {}
  curTopic = nx;
  renderQuiz(false, false, true);
}

/* після завершення теми: граматичні теми продовжують стрічку самі,
   словникові пропонуються кнопкою, а кінець рівня — велике свято */
function afterTopicDone(container) {
  if (curTopic.dynamic) return;
  const nx = nextAfter(curTopic);
  if (!nx) { levelFinale(); return; }
  if (nx.type !== 'vocab') {
    appendNextTopic(nx);
  } else {
    container.appendChild(buildNextBtn(curTopic));
  }
}

/* Рівень пройдено: вітання, подвійне свято і двері в наступний рівень */
const LEVEL_ORDER = ['a1', 'a2', 'b1'];
function levelFinale() {
  const lv = curTopic.level;
  /* фінал рівня — лише в одному екземплярі (прибираємо попередні дублі) */
  quizMount.querySelectorAll('.level-done').forEach(el => el.remove());
  celebrate(280);
  ayYildiz();

  const card = document.createElement('div');
  card.className = 'card level-done';
  let inner =
    '<div class="ld-emoji">🎆🧿🎆</div>' +
    '<h3>' + t('lvDoneTitle').replace('{lv}', lv.toUpperCase()) + '</h3>' +
    '<p class="ld-text">' + t('lvDoneText') + '</p>';

  const ni = LEVEL_ORDER.indexOf(lv) + 1;
  const nextLv = LEVEL_ORDER[ni];
  if (nextLv) {
    const firstTp = TOPICS.filter(x => x.level === nextLv)[0];
    inner += '<button class="btn-restart ld-next">' + t('startLevel') + ' ' + nextLv.toUpperCase() + '</button>';
    card.innerHTML = inner +
      '<a class="dict-mini" href="#d-' + lv + '">📖 ' + t('dictTitle') + ' ' + lv.toUpperCase() + '</a>';
    card.querySelector('.ld-next').addEventListener('click', () => { location.hash = 'q-' + firstTp.id; });
  } else {
    inner += '<p class="ld-text"><b>' + t('courseDone') + '</b></p>';
    card.innerHTML = inner +
      '<a class="dict-mini" href="#d-' + lv + '">📖 ' + t('dictTitle') + ' ' + lv.toUpperCase() + '</a>';
  }
  quizMount.appendChild(card);
}

function buildNextBtn(tp) {
  const box = document.createElement('div');
  box.className = 'next-box';
  const nx = nextAfter(tp);
  const b = document.createElement('button');
  b.className = 'btn-restart next-btn';
  if (nx) {
    b.innerHTML = '▶ ' + t('nextTopic') + ': ' + (nx.icon || '📘') + ' ' + nx.name[LANG];
    b.addEventListener('click', () => { location.hash = 'q-' + nx.id; });
  } else {
    b.innerHTML = '📖 ' + t('nextDict');
    b.addEventListener('click', () => { location.hash = 'd-' + tp.level; });
  }
  box.appendChild(b);
  return box;
}

function buildTopicCard(tp, stepNo) {
  const bests = loadBest();
  const tot = topicTotal(tp);
  const best = Math.min(bests[tp.id] || 0, tot);
  const pct = Math.round(best / tot * 100);
  const b = document.createElement('button');
  b.className = 'bp-row' + (pct === 100 ? ' done' : '');
  const badge = tp.type === 'vocab'
    ? '<span class="bp-badge">✦ ' + (LANG === 'ru' ? 'Практика слов' : 'Практика слів') + '</span>'
    : '';
  b.innerHTML =
    '<span class="bp-node"><span class="bp-emoji">' + (tp.icon || '📘') + '</span><span class="bp-check">✓</span></span>' +
    '<span class="bp-main">' +
      badge +
      '<span class="bp-title">' + tp.name[LANG] + '</span>' +
      '<span class="bp-desc">' + tp.desc[LANG] + '</span>' +
    '</span>' +
    (pct > 0 && pct < 100 ? '<span class="bp-score">' + best + '/' + tot + '</span>' : '');
  b.addEventListener('click', () => { location.hash = 'q-' + tp.id; });
  return b;
}
function setQuizPill(topic) {
  const pill = document.getElementById('quizPill');
  if (!pill) return;
  const name = topic.name ? (topic.name[LANG] || topic.name.uk) : '';
  pill.innerHTML =
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="2.2" stroke-linecap="round">' +
      '<line x1="8" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="20" y2="12"/>' +
      '<line x1="8" y1="18" x2="20" y2="18"/><circle cx="4" cy="6" r="1"/>' +
      '<circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/></svg>' +
    '<span class="lp-text">' + topic.level.toUpperCase() +
      ' <span class="qp-topic">· ' + name + '</span></span>' +
    '<svg class="lp-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" ' +
      'stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">' +
      '<polyline points="15 6 9 12 15 18"/></svg>';
  pill.onclick = () => backBtn.click();
  pill.classList.remove('pill-hidden');
  const tw = document.querySelector('.topbar-wrap');
  if (tw) pill.style.top = tw.offsetHeight + 'px';
}

function show(r) {
  track(r.s === 'quiz' ? 'quiz/' + r.topic.id : r.s === 'topics' ? 'level/' + r.level : r.s);
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[r.s].classList.add('active');
  backBtn.classList.toggle('show', r.s === 'topics' || r.s === 'quiz');
  nazarRow.classList.toggle('show', r.s === 'quiz');

  if (r.s === 'topics') { curLevel = r.level; renderTopics(r.level); }
  if (r.s === 'dict') { curLevel = r.level; renderDict(r.level); }
  window.scrollTo(0, 0); /* нова сторінка — з початку */
  document.querySelector('#screen-quiz .shuffle-bar').style.display = (r.s === 'quiz' && r.topic.type === 'vocab') ? 'none' : '';
  if (r.s === 'quiz') {
    curLevel = r.topic.level;
    if (curTopic !== r.topic || !quizBuilt) { curTopic = r.topic; renderQuiz(false); }
    setQuizPill(r.topic);
  }

  if (r.s !== 'quiz') clearTimer();
  const hero = document.getElementById('hero');
  const bar = document.getElementById('barTitle');
  const brandHTML = 'Türkçe Quiz<span class="tr">.</span>';
  bar.innerHTML = brandHTML;
  const heroScreens = { lang: 1, home: 1, topics: 1, dict: 1 };
  if (heroScreens[r.s]) {
    hero.style.display = '';
    const sub = document.getElementById('hSub');
    if (r.s === 'lang') sub.textContent = t('sub_lang');
    else if (r.s === 'home') sub.textContent = t('sub_home');
    else sub.textContent = '';
  } else {
    hero.style.display = 'none';
  }

  applyI18n();
}

function applyI18n() {
  document.querySelectorAll('[data-i]').forEach(el => { el.textContent = t(el.dataset.i); });
  ['a1', 'a2', 'b1'].forEach(lv => {
    const tps = TOPICS.filter(x => x.level === lv);
    const b = loadBest();
    let got = 0, tot = 0;
    tps.forEach(tp => { const n = topicTotal(tp); tot += n; got += Math.min(b[tp.id] || 0, n); });
    const pct = tot ? Math.round(got / tot * 100) : 0;
    const el = document.getElementById(lv + 'prog');
    if (el) el.innerHTML = '<span class="pbar"><span class="pfill" style="width:' + pct + '%"></span></span><span class="plabel">' + pct + '%</span>';
  });
  document.getElementById('a1badge').textContent = countLabel(TOPICS.filter(x => x.level === 'a1').length);
  document.getElementById('a2badge').textContent = countLabel(TOPICS.filter(x => x.level === 'a2').length);
  document.getElementById('b1badge').textContent = countLabel(TOPICS.filter(x => x.level === 'b1').length);
  document.getElementById('restart').textContent = t('restart');
  document.getElementById('finishMix').textContent = t('mixBtn');
  document.getElementById('globalMix').textContent = t('globalMix');
  document.getElementById('timedBtn').textContent = t('timerBtn');
  document.getElementById('finishShare').textContent = t('shareBtn');
  document.querySelectorAll('#langBar button').forEach(b => b.classList.toggle('on', b.dataset.lang === LANG));
}

window.addEventListener('hashchange', () => { show(route()); });
function quizInProgress() {
  if (!curTopic) return false;
  if (curTopic.type === 'vocab') {
    return vState && vState.started && vState.stage !== 'done';
  }
  if (!sections.length) return false;
  const any = sections.some(s => s.answered > 0);
  const all = sections.every(s => s.answered === (s.cur ? s.cur.length : s.base.length));
  return any && !all;
}

function showLeaveModal(onLeave) {
  const back = document.createElement('div');
  back.className = 'modal-back';
  back.innerHTML =
    '<div class="modal">' +
      '<div class="m-title">' + t('leaveTitle') + '</div>' +
      '<p class="m-text">' + t('leaveText') + '</p>' +
      '<div class="m-btns">' +
        '<button class="btn-restart m-stay">' + t('leaveStay') + '</button>' +
        '<button class="btn-shuffle m-go">' + t('leaveGo') + '</button>' +
      '</div>' +
    '</div>';
  back.querySelector('.m-stay').addEventListener('click', () => back.remove());
  back.querySelector('.m-go').addEventListener('click', () => { back.remove(); onLeave(); });
  back.addEventListener('click', e => { if (e.target === back) back.remove(); });
  document.body.appendChild(back);
}

backBtn.addEventListener('click', () => {
  const r = route();
  if (r.s === 'quiz') {
    const dest = curTopic && curTopic.backTo ? curTopic.backTo : curLevel;
    if (quizInProgress()) {
      showLeaveModal(() => { quizBuilt = false; location.hash = dest; });
      return;
    }
    location.hash = dest;
  } else if (r.s === 'dict') {
    location.hash = curLevel;
  } else {
    location.hash = '';
  }
});

document.querySelectorAll('[data-pick]').forEach(b => b.addEventListener('click', () => {
  LANG = b.dataset.pick;
  try { localStorage.setItem('tq_lang', LANG); } catch (e) {}
  quizBuilt = false;
  location.hash = '';
  show(route());
}));
document.querySelectorAll('[data-level]').forEach(b => b.addEventListener('click', () => {
  location.hash = b.dataset.level;
}));
document.querySelectorAll('#langBar button').forEach(b => b.addEventListener('click', () => {
  if (b.dataset.lang === LANG) return;
  LANG = b.dataset.lang;
  try { localStorage.setItem('tq_lang', LANG); } catch (e) {}
  quizBuilt = false;
  show(route());
}));

/* ------------------ квіз ------------------ */
/* ШТОРКА НАВІГАЦІЇ: мапа всього курсу з будь-якого екрана */
function openNavDrawer() {
  const r = route();
  const curId = r.s === 'quiz' && curTopic ? curTopic.id : null;
  const curDict = r.s === 'dict' ? r.level : null;
  const bests = loadBest();

  const back = document.createElement('div');
  back.className = 'modal-back show';
  let inner = '<div class="modal nav-drawer"><h3>' + t('navTitle') + '</h3>';

  LEVEL_ORDER.forEach(lv => {
    const tps = TOPICS.filter(x => x.level === lv);
    let done = 0;
    tps.forEach(tp => {
      const tot = topicTotal(tp);
      if (Math.min(bests[tp.id] || 0, tot) === tot) done++;
    });
    inner += '<div class="nd-level">' +
      '<button class="nd-lv" data-h="' + lv + '">' + lv.toUpperCase() +
      '<span class="nd-count">' + done + ' / ' + tps.length + '</span></button>';
    tps.forEach((tp, i) => {
      const tot = topicTotal(tp);
      const ok = Math.min(bests[tp.id] || 0, tot) === tot;
      const cur = curId === tp.id ? ' nd-cur' : '';
      inner += '<button class="nd-item' + cur + '" data-h="q-' + tp.id + '">' +
        '<span class="nd-dot' + (ok ? ' ok' : '') + '">' + (ok ? '✓' : i + 1) + '</span>' +
        '<span class="nd-name">' + tp.name[LANG] + '</span></button>';
    });
    const dinfo = levelKnown(lv);
    inner += '<button class="nd-item' + (curDict === lv ? ' nd-cur' : '') + '" data-h="d-' + lv + '">' +
      '<span class="nd-dot nd-dict">📖</span>' +
      '<span class="nd-name">' + t('dictTitle') + ' · ' + t('knowLabel').toLowerCase() + ' ' + dinfo.know + '/' + dinfo.total + '</span></button>';
    inner += '</div>';
  });
  inner += '<button class="m-no share-close">✕</button></div>';
  back.innerHTML = inner;

  const navTo = h => {
    back.remove();
    if ('#' + h === location.hash) return;
    const rr = route();
    if (rr.s === 'quiz' && quizInProgress()) {
      showLeaveModal(() => { quizBuilt = false; location.hash = h; });
      return;
    }
    location.hash = h;
  };
  back.querySelectorAll('[data-h]').forEach(el =>
    el.addEventListener('click', () => navTo(el.dataset.h)));
  back.querySelector('.share-close').addEventListener('click', () => back.remove());
  back.addEventListener('click', e => { if (e.target === back) back.remove(); });
  document.body.appendChild(back);
}
document.getElementById('navBtn').addEventListener('click', openNavDrawer);

/* Плаваюча кнопка «вгору» на довгих сторінках */
const toTopBtn = document.createElement('button');
toTopBtn.id = 'toTop';
toTopBtn.setAttribute('aria-label', 'Вгору');
toTopBtn.textContent = '↑';
toTopBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
document.body.appendChild(toTopBtn);
window.addEventListener('scroll', () => {
  toTopBtn.classList.toggle('show', window.scrollY > 500);
}, { passive: true });

const quizEl = document.getElementById('quiz');
let quizMount = quizEl;

/* НОМЕР ВЕРСІЇ — міняється з кожним оновленням файла.
   Якщо на сайті інший номер, ніж я назвала в чаті — вас тримає старий кеш */
const APP_VERSION = 'v9.3 · 20.07 22:45';
document.getElementById('verTag').textContent = APP_VERSION;
console.log('Türkçe Quiz', APP_VERSION); /* куди зараз рендеримо: сама сторінка або стрічка продовження */
const finishEl = document.getElementById('finish');
let sections = [], total = 0, quizBuilt = false, streak = 0;
let cardFinishers = [];
let timerInt = null, timeLeft = 0;

const CONF_COLORS = ['#22418F', '#17A398', '#D64545', '#F2B705', '#7FD9D0'];
/* кольори салютів — турецький прапор: червоний + білий (+ золото для тепла) */
const FW_COLORS = ['#E30A17', '#FFFFFF', '#E30A17', '#FFFFFF', '#F2B705'];
function celebrate(n) {
  if (!n) return;
  const box = document.createElement('div');
  box.className = 'confetti-box';
  for (let i = 0; i < n; i++) {
    const p = document.createElement('span');
    p.className = 'confetti-piece';
    p.style.left = (Math.random() * 100) + 'vw';
    p.style.background = CONF_COLORS[i % CONF_COLORS.length];
    p.style.animationDuration = (1.6 + Math.random() * 1.4) + 's';
    p.style.animationDelay = (Math.random() * 0.6) + 's';
    p.style.width = (7 + Math.random() * 7) + 'px';
    p.style.height = (10 + Math.random() * 8) + 'px';
    box.appendChild(p);
  }
  // салюти: кілька вибухів іскор у верхній частині екрана
  const bursts = n >= 240 ? 20 : n >= 160 ? 12 : 8;
  for (let f = 0; f < bursts; f++) {
    const cx = 12 + Math.random() * 76;
    const cy = 12 + Math.random() * 30;
    const color = FW_COLORS[Math.floor(Math.random() * FW_COLORS.length)];
    for (let s = 0; s < 16; s++) {
      const sp = document.createElement('span');
      sp.className = 'fw-spark';
      sp.style.left = cx + 'vw';
      sp.style.top = cy + 'vh';
      sp.style.background = color;
      const ang = (Math.PI * 2 * s) / 16 + Math.random() * 0.4;
      const dist = 55 + Math.random() * 75;
      sp.style.setProperty('--dx', Math.cos(ang) * dist + 'px');
      sp.style.setProperty('--dy', Math.sin(ang) * dist + 'px');
      sp.style.animationDelay = (0.25 + f * 0.45) + 's';
      box.appendChild(sp);
    }
  }
  document.body.appendChild(box);
  setTimeout(() => box.remove(), 4200);
}

/* Шеринг результату: летить ПОСИЛАННЯ на сайт (розгорнеться карткою через OG-теги) */
const SITE_URL = 'https://vikkyodessa.github.io/turkce-quiz/';

/* Копіювання, що працює скрізь: сучасний API + фолбек через textarea */
/* Вікно шерингу: прямі лінки — браузер сам підхопить сесії користувача */
function openShareModal(text) {
  const full = text + ' ' + SITE_URL;
  const eT = encodeURIComponent(text);
  const eU = encodeURIComponent(SITE_URL);
  const eF = encodeURIComponent(full);
  const back = document.createElement('div');
  back.className = 'modal-back show';
  back.innerHTML =
    '<div class="modal share-modal">' +
      '<h3>' + t('shareTitle') + '</h3>' +
      '<div class="share-grid">' +
        '<a class="share-item" target="_blank" rel="noopener" href="https://t.me/share/url?url=' + eU + '&text=' + eT + '">💙 Telegram</a>' +
        '<a class="share-item" target="_blank" rel="noopener" href="https://wa.me/?text=' + eF + '">💬 WhatsApp</a>' +
        '<a class="share-item" target="_blank" rel="noopener" href="https://www.facebook.com/sharer/sharer.php?u=' + eU + '&quote=' + eT + '">📘 Facebook</a>' +
        '<a class="share-item share-ig" target="_blank" rel="noopener" href="https://www.instagram.com/direct/inbox/">📸 Instagram</a>' +
      '</div>' +
      '<button class="btn-shuffle share-copy">' + t('copyBtn') + '</button>' +
      '<button class="m-no share-close">✕</button>' +
    '</div>';
  back.addEventListener('click', e => { if (e.target === back) back.remove(); });
  back.querySelector('.share-close').addEventListener('click', () => back.remove());
  back.querySelector('.share-ig').addEventListener('click', () => {
    /* в Instagram нема прямого share-лінка: копіюємо текст і відкриваємо Direct */
    copyToClipboard(full);
    showToast(t('shareCopied'));
  });
  back.querySelector('.share-copy').addEventListener('click', () => {
    copyToClipboard(full);
    showToast(t('shareCopied'));
    back.remove();
  });
  document.body.appendChild(back);
}

function copyToClipboard(txt) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(txt).catch(() => copyFallback(txt));
  } else {
    copyFallback(txt);
  }
}
function copyFallback(txt) {
  const ta = document.createElement('textarea');
  ta.value = txt;
  ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); } catch (e) {}
  ta.remove();
}
function showToast(msg) {
  const old = document.querySelector('.toast');
  if (old) old.remove();
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.classList.add('show'), 20);
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 400); }, 2600);
}
function shareResult(score, total, topicName) {
  const text = '🧿 Türkçe Quiz · ' + topicName + ': ' + score + ' / ' + total +
    (score === total ? '! Mükemmel! 🌙⭐ ' : '! ') + 'Спробуй і ти:';
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (isMobile && navigator.share) {
    navigator.share({ title: 'Türkçe Quiz', text: text, url: SITE_URL }).catch(() => {});
  } else {
    openShareModal(text);
  }
  track('share', true);
}

function confettiFor(sc, n) { return sc === n ? 280 : sc >= n * 0.9 ? 180 : sc >= n * 0.6 ? 80 : 0; }

/* Свято за 100% — три вистави по колу, кожна з конфеті:
   1) червоний бончук  2) назар → золотий півмісяць  3) червоний браслет (контурний серп).
   Черга живе в localStorage — переживає перезавантаження */
function ayYildiz() {
  let ayTurn = 0;
  try { ayTurn = parseInt(localStorage.getItem('tq_ay') || '0', 10) || 0; } catch (e) {}
  const mode = ayTurn % 3;
  try { localStorage.setItem('tq_ay', String(ayTurn + 1)); } catch (e) {}

  const box = document.createElement('div');
  box.className = 'confetti-box';
  const pts = []; /* [x, y, колір, затримка] */

  const disc = (cx, cy, R, step, col, dl) => {
    for (let gy = -R; gy <= R; gy += step)
      for (let gx = -R; gx <= R; gx += step)
        if (gx * gx + gy * gy <= R * R) pts.push([cx + gx * 0.62, cy + gy, col, dl]);
  };
  const crescentFill = (cx, cy, R, col, dl) => {
    const ox = R * 0.32, ir = R * 0.815;
    for (let gy = -R; gy <= R; gy += 1.3)
      for (let gx = -R; gx <= R; gx += 1.3) {
        const out = gx * gx + gy * gy <= R * R;
        const dx = gx - ox;
        if (out && !(dx * dx + gy * gy <= ir * ir)) pts.push([cx + gx * 0.62, cy + gy, col, dl]);
      }
  };
  /* контурний серп + контурна зірка — той самий «браслет» першої версії */
  const braceletCrescent = (cx, cy, col, dl) => {
    const R = 13;
    for (let a = 0; a < Math.PI * 2; a += 0.16) {
      const x = cx + Math.cos(a) * R * 0.62, y = cy + Math.sin(a) * R;
      const dx = (x - (cx + 3.6)) / 0.62, dyy = y - cy;
      if (Math.sqrt(dx * dx + dyy * dyy) > 10.4) pts.push([x, y, col, dl]);
    }
    for (let a = -1.25; a <= 1.25; a += 0.14) {
      pts.push([cx + 3.6 + Math.cos(a) * 10.4 * 0.62, cy + Math.sin(a) * 10.4, col, dl]);
    }
    const sx = cx + 11.5, sy = cy;
    for (let i = 0; i < 10; i++) {
      const ang = -Math.PI / 2 + i * Math.PI / 5;
      const r = i % 2 === 0 ? 3.4 : 1.4;
      pts.push([sx + Math.cos(ang) * r * 0.62, sy + Math.sin(ang) * r, col, dl]);
    }
  };

  if (mode === 0) {
    /* бончук + конфеті */
    disc(50, 33, 9, 1.25, '#E30A17', 0.4);
    for (let i = 0; i < 8; i++) {
      const ang = Math.PI * (1.05 + i * 0.09);
      pts.push([50 + Math.cos(ang) * 4.6 * 0.62, 33 + Math.sin(ang) * 4.6, '#FFFFFF', 0.55]);
    }
    setTimeout(() => celebrate(80), 350);
  } else if (mode === 1) {
    /* вистава: назар → суцільна зірка → півмісяць, конфеті на кожен акт */
    disc(27, 21, 6.2, 1.1, '#1D4FA1', 0.4);
    disc(27, 21, 4.3, 1.0, '#FFFFFF', 0.55);
    disc(27, 21, 2.9, 0.95, '#4FC3F7', 0.7);
    disc(27, 21, 1.4, 0.8, '#12224E', 0.85);
    crescentFill(68, 34, 11, '#F2B705', 2.0);
    [350, 1950].forEach(tt => setTimeout(() => celebrate(80), tt));
  } else {
    /* браслет: контурний червоний серп із зіркою + конфеті */
    braceletCrescent(50, 34, '#E30A17', 0.5);
    setTimeout(() => celebrate(80), 400);
  }

  pts.forEach(([x, y, col, dl]) => {
    const p = document.createElement('span');
    p.className = 'ay-dot';
    p.style.background = col;
    p.style.boxShadow = '0 0 7px ' + (col === '#FFFFFF' ? 'rgba(255,255,255,.9)' : col + 'CC');
    p.style.left = x + 'vw';
    p.style.top = y + 'vh';
    p.style.animationDelay = (dl + Math.random() * 0.3) + 's';
    p.style.setProperty('--sx', (Math.random() * 100 - 50) + 'vw');
    p.style.setProperty('--sy', (40 + Math.random() * 60) + 'vh');
    box.appendChild(p);
  });
  document.body.appendChild(box);
  /* тривалість вистави: трійці треба час на три акти, браслет — короткий уклін */
  const life = mode === 1 ? 6500 : mode === 2 ? 4200 : 5200;
  setTimeout(() => box.remove(), life);
}

const PERFECT = {
  uk: [
    "Стоп-стоп… Скажіть чесно: ви робот? 🤖 Бо жива людина ТАК ідеально не відповідає!",
    "10 з 10?! Скажіть чесно: ви ж турок, і це ваша рідна мова? 🧿 Бо ТАК відповідають тільки носії!",
    "Так ідеально, що навіть Google Перекладач попросився до вас на урок 😄",
    "Нуль помилок. НУЛЬ. Öğretmen у шоці, підручник плаче від гордості 😭👏",
    "Ви щойно склали цей квіз краще, ніж він сам себе знає. Helal olsun! 💪",
    "Mükemmel! Хоч зараз у Стамбул — приймуть за свого 🧿",
    "10 з 10! Суфікси тремтять, коли бачать вас 😄",
    "Aferin, aferin! Öğretmen аплодує стоячи 👏🌙",
    "10/10! Навіть словник зазирнув подивитись, хто це такий розумний 📖👀",
    "Ідеально! Ататюрк би потиснув вам руку 🤝🌙",
    "Ви відповідали так упевнено, що питання почали сумніватися в собі 😅",
    "Mükemmel! Чайка над Босфором кричить ваше ім'я 🕊️",
    "Це не результат, це sanat — мистецтво! 🎨🧿"
  ],
  ru: [
    "Стоп-стоп… Признавайтесь честно: вы робот? 🤖 Живой человек ТАК идеально не отвечает!",
    "10 из 10?! Скажите честно: вы же турок, и это ваш родной язык? 🧿 Потому что ТАК отвечают только носители!",
    "Так идеально, что даже Google Переводчик попросился к вам на урок 😄",
    "Ноль ошибок. НОЛЬ. Öğretmen в шоке, учебник плачет от гордости 😭👏",
    "Вы только что прошли этот квиз лучше, чем он сам себя знает. Helal olsun! 💪"
  ]
};
/* пам'ять останніх фраз, щоб та сама не випадала двічі поспіль */
const lastPick = {};
function pickFrom(list, key) {
  let i = Math.floor(Math.random() * list.length);
  if (list.length > 1 && i === lastPick[key]) i = (i + 1) % list.length;
  lastPick[key] = i;
  return list[i];
}
function perfectPraise() {
  return pickFrom(PERFECT[LANG] || PERFECT.uk, 'perfect');
}

const PHRASES = {
  harika: {
    uk: [
      "Harika! Ще трошки — і досконалість 🌟",
      "Майже ідеально! Помилки вас бояться 💪",
      "Süper! Одна дрібничка — і було б 10 з 10.",
      "Чудовий результат! Турецька вам явно пасує 🧿",
      "Neredeyse mükemmel! Ще крок — і легенда 🌙",
      "Дуже сильно! Помилки вже пакують валізи 🧳"
    ],
    ru: [
      "Harika! Ещё чуть-чуть — и совершенство 🌟",
      "Почти идеально! Ошибки вас боятся 💪",
      "Süper! Одна мелочь — и было бы 10 из 10.",
      "Отличный результат! Турецкий вам явно к лицу 🧿"
    ]
  },
  iyi: {
    uk: [
      "İyi! Гарна робота — глянь пояснення до помилок, і буде ще краще.",
      "Непогано! Ще один прохід — і результат злетить 🚀",
      "Fena değil! Помилки — це просто майбутні правильні відповіді.",
      "Хороший темп! Помилки вище — найцікавіша частина уроку 😉",
      "Солідно! Наступний прохід буде зірковим ⭐",
      "İdare eder → iyi → harika: ви на правильному шляху 🚶"
    ],
    ru: [
      "İyi! Хорошая работа — взгляни на объяснения к ошибкам, и будет ещё лучше.",
      "Неплохо! Ещё один заход — и результат взлетит 🚀",
      "Fena değil! Ошибки — это просто будущие правильные ответы.",
      "Хороший темп! Ошибки выше — самая интересная часть урока 😉"
    ]
  },
  train: {
    uk: [
      "Складна тема? Нічого, розкусимо її разом 💪",
      "Yavaş yavaş! Повільно — значить надійно. Ще одне коло?",
      "Перший млинець — не страшно. Пояснення вище вже чекають!",
      "Кожна помилка тут — маленький урок. Спробуй ще раз 🧿",
      "Рим не за день будувався, і Türkçe теж 🏗️",
      "Це був розігрів! Справжня спроба — наступна 💪"
    ],
    ru: [
      "Сложная тема? Ничего, раскусим её вместе 💪",
      "Yavaş yavaş! Медленно — значит надёжно. Ещё один круг?",
      "Первый блин — не страшно. Объяснения выше уже ждут!",
      "Каждая ошибка здесь — маленький урок. Попробуй ещё раз 🧿"
    ]
  }
};
function tierPhrase(tier) {
  return pickFrom(PHRASES[tier][LANG] || PHRASES[tier].uk, tier);
}

function shuffle(arr) {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildGramCard(gr) {
  const g = document.createElement('div');
  g.className = 'card gram';
  let inner = '<div class="gram-head">📖 ' + t('gramTitle') + '</div>';
  if (gr.html) {
    inner += gr.html[LANG] || gr.html.uk;
    g.innerHTML = inner;
    return g;
  }
  if (gr.intro) inner += '<p class="gram-text">' + (gr.intro[LANG] || gr.intro.uk) + '</p>';
  if (gr.formula) inner += '<span class="g-formula">' + (gr.formula[LANG] || gr.formula.uk || gr.formula) + '</span>';
  if (gr.sent) gr.sent.forEach(sx => {
    inner += '<p class="g-sent"><b>' + sx.t + '</b> — ' + (sx[LANG] || sx.uk) + '</p>';
  });
  if (gr.table) {
    const cell = c => typeof c === 'string' ? c : c[LANG];
    inner += '<div class="gram-scroll"><table class="gram-table">' +
      '<tr>' + gr.table.head[LANG].map(h => '<th>' + h + '</th>').join('') + '</tr>' +
      gr.table.rows.map(row => '<tr>' + row.map((c, i) =>
        '<td class="' + (i === 0 ? 'gt-name' : i === row.length - 1 ? 'gt-ex' : '') + '">' + cell(c) + '</td>'
      ).join('') + '</tr>').join('') +
    '</table></div>';
    inner += '<p class="gram-text gram-note">' + gr[LANG] + '</p>';
  } else {
    inner += '<p class="gram-text">' + gr[LANG] + '</p>' +
      '<ul class="gram-ex">' +
      gr.ex.map(e => '<li><b>' + e.t + '</b> — ' + e[LANG === 'ru' ? 'ru' : 'uk'] + '</li>').join('') +
      '</ul>';
  }
  g.innerHTML = inner;
  return g;
}

function buildSections(mixed) {
  const qs = curTopic.questions;
  if (mixed) return [{ title: t('mixTitle'), sub: t('mixSub'), base: shuffle(qs) }];
  if (!curTopic.multi) {
    return [{ title: curTopic.secTitle[LANG], sub: curTopic.secSub[LANG], base: qs.slice() }];
  }
  const secs = [];
  qs.forEach(q => {
    if (q.sec === "warmup") secs.push({ title: t('warmupTitle'), sub: t('warmupSub'), base: [] });
    if (q.sec === "vasita") secs.push({ title: t('vasitaTitle'), sub: t('vasitaSub'), gram: VASITA_GRAM, base: [] });
    if (q.sec === "main") secs.push({ title: t('mainTitle'), sub: t('mainSub'), base: [] });
    secs[secs.length - 1].base.push(q);
  });
  return secs;
}

function globalScore() { return sections.reduce((s, x) => s + x.correct, 0); }

function clearTimer() {
  if (timerInt) { clearInterval(timerInt); timerInt = null; }
  const chip = document.getElementById('timerChip');
  if (chip) chip.remove();
}
function fmtTime(s) {
  const m = Math.floor(s / 60), ss = s % 60;
  return m + ':' + (ss < 10 ? '0' : '') + ss;
}
function startTimer(seconds) {
  clearTimer();
  timeLeft = seconds;
  const chip = document.createElement('div');
  chip.className = 'timer-chip';
  chip.id = 'timerChip';
  chip.textContent = '⏱️ ' + fmtTime(timeLeft);
  document.body.appendChild(chip);
  timerInt = setInterval(() => {
    timeLeft--;
    if (timeLeft <= 0) {
      chip.textContent = '⏱️ 0:00';
      clearInterval(timerInt); timerInt = null;
      timeOut();
      setTimeout(() => { const c = document.getElementById('timerChip'); if (c) c.remove(); }, 1600);
      return;
    }
    chip.textContent = '⏱️ ' + fmtTime(timeLeft);
    chip.classList.toggle('low', timeLeft <= 10);
  }, 1000);
}
function timeOut() {
  cardFinishers.forEach(f => f());
  sections.forEach(s => {
    if (s.answered === s.cur.length && s.showResult) s.showResult();
  });
  updatePill();
  checkAllDone();
}

function runTotal() {
  return sections.reduce((a, x) => a + (x.cur ? x.cur.length : x.base.length), 0);
}
function updatePill() {
  const pill = document.getElementById('scorePill');
  if (pill) pill.textContent = globalScore() + ' / ' + runTotal() + (streak >= 3 ? ' · 🔥' + streak : '');
  const fill = document.getElementById('quizFill');
  if (fill) {
    const answered = sections.reduce((a, s) => a + (s.answered || 0), 0);
    fill.style.width = Math.round(answered / runTotal() * 100) + '%';
  }
}
function checkAllDone() {
  const allDone = sections.every(s => s.answered === (s.cur ? s.cur.length : s.base.length));
  if (allDone) {
    if (timerInt) {
      const spare = timeLeft;
      clearTimer();
      const doneChip = document.createElement('div');
      doneChip.className = 'timer-chip';
      doneChip.id = 'timerChip';
      doneChip.textContent = '🏁 +' + fmtTime(spare);
      document.body.appendChild(doneChip);
      setTimeout(() => { const c = document.getElementById('timerChip'); if (c) c.remove(); }, 3500);
    }
    const n = runTotal(), sc = globalScore();
    const fullRun = sections.every(s => !s.cur || s.cur.length === s.base.length);
    if (fullRun) saveBest(curTopic.id, sc);
    if (sections.length < 2) { finishEl.classList.remove('show'); return; }
    document.getElementById('finalScore').textContent = sc + ' / ' + n;
    const base = sc === n ? perfectPraise() : sc >= n * 0.9 ? tierPhrase('harika') : sc >= n * 0.6 ? tierPhrase('iyi') : tierPhrase('train');
    document.getElementById('finalText').textContent =
      curTopic.finishMsg ? curTopic.finishMsg[LANG] + ' ' + (sc === n ? base : '') : base;
    celebrate(curTopic.finishMsg ? Math.max(confettiFor(sc, n), 160) : confettiFor(sc, n));
    if (sc === n) ayYildiz();
    quizMount.appendChild(finishEl); /* фінал стає під своєю темою навіть у стрічці */
    const fsBtn = document.getElementById('finishShare');
    fsBtn.onclick = () => shareResult(sc, n, curTopic.name[LANG]);
    const fn = document.getElementById('finishNext');
    fn.innerHTML = '';
    afterTopicDone(fn);
    finishEl.classList.add('show');
  } else {
    finishEl.classList.remove('show');
  }
}
function sectionVerdict(sc, n) {
  if (sc === n) return perfectPraise();
  return sc >= n * 0.9 ? tierPhrase('harika') : sc >= n * 0.6 ? tierPhrase('iyi') : tierPhrase('train');
}

/* ── Drag & Drop картка (вмикається прапорцем dnd:true на темі) ── */
function dndSlotVal(affix) { return affix === '—' ? '∅' : affix.replace('-', ''); }

function buildDndCard(s, q, k, box) {
  let selected = null;
  const card = document.createElement('div');
  card.className = 'card';
  const optIdx = shuffle(q.opts.map((_, i) => i));
  card.innerHTML =
    '<p class="tag"></p>' +
    '<p class="sentence"><span class="num">' + (k + 1) + '.</span> ' + q.pre +
      '<span class="dnd-slot"></span>' + q.post +
      ' <button class="speak" aria-label="🔊" title="' + t('speakTitle') + '">🔊</button></p>' +
    '<p class="dnd-hint">' + (curTopic.dndHint ? curTopic.dndHint[LANG] : '') + '</p>' +
    '<div class="dnd-bank">' +
      optIdx.map(oi => '<div class="dnd-tile" draggable="true" data-o="' + oi + '">' + q.opts[oi] + '</div>').join('') +
    '</div>' +
    '<p class="fb"></p>' +
    '<p class="tr-line">→ ' + q.tr[LANG] + '</p>';
  box.appendChild(card);

  const slot = card.querySelector('.dnd-slot');
  const bank = card.querySelector('.dnd-bank');
  const fb = card.querySelector('.fb');
  const trl = card.querySelector('.tr-line');
  const tiles = [...bank.querySelectorAll('.dnd-tile')];

  const speakBtn = card.querySelector('.speak');
  speakBtn.addEventListener('click', () => {
    if (!ttsOk) return;
    const done = card.dataset.done;
    const joined = q.opts[q.a] === '—' ? '' : q.opts[q.a].replace('-', '');
    const text = done ? q.pre + joined + q.post : q.pre + ', ' + q.post.trim();
    const slow = window.speechSynthesis.speaking && lastSpeakBtn === speakBtn;
    lastSpeakBtn = speakBtn;
    speak(text, slow ? 0.6 : 0.95);
  });

  function finish(correctFill) {
    tiles.forEach(x => { x.classList.remove('sel'); x.classList.add('used'); });
    slot.textContent = dndSlotVal(q.opts[q.a]);
    const tag = card.querySelector('.tag');
    tag.textContent = q.cs ? CASE[q.cs][LANG] : curTopic.tag[LANG];
    tag.classList.add('show');
    trl.classList.add('show');
  }

  function applyAnswer(oi) {
    if (card.dataset.done) return;
    card.dataset.done = "1";
    s.answered++;
    const isOk = oi === q.a;
    if (isOk) { s.correct++; streak++; } else { streak = 0; s.wrong.push(q); }
    bumpWordsIn(q.pre + ' ' + q.post, isOk);

    slot.textContent = dndSlotVal(q.opts[oi]);
    slot.classList.remove('over');
    slot.classList.add(isOk ? 'ok' : 'bad');
    finish();
    fb.textContent = (isOk ? 'Doğru! ' : 'Maalesef. ') + q.ok[LANG];
    fb.classList.add('show', isOk ? 'good' : 'wrong');

    updatePill();
    if (s.answered === s.cur.length) s.showResult();
  }

  /* drag & drop (десктоп) */
  tiles.forEach(tile => {
    tile.addEventListener('dragstart', e => {
      if (tile.classList.contains('used')) return;
      e.dataTransfer.setData('text/plain', tile.dataset.o);
      tile.classList.add('dragging');
    });
    tile.addEventListener('dragend', () => tile.classList.remove('dragging'));
    /* тап (мобільний): тап-плитка ставить одразу */
    tile.addEventListener('click', () => {
      if (tile.classList.contains('used') || card.dataset.done) return;
      applyAnswer(+tile.dataset.o);
    });
  });
  slot.addEventListener('dragover', e => { e.preventDefault(); slot.classList.add('over'); });
  slot.addEventListener('dragleave', () => slot.classList.remove('over'));
  slot.addEventListener('drop', e => {
    e.preventDefault();
    const oi = e.dataTransfer.getData('text/plain');
    if (oi !== '') applyAnswer(+oi);
  });

  cardFinishers.push(() => {
    if (card.dataset.done) return;
    card.dataset.done = "1";
    s.answered++;
    streak = 0;
    s.wrong.push(q);
    bumpWordsIn(q.pre + ' ' + q.post, false);
    slot.classList.add('bad');
    finish();
    fb.textContent = t('timeUp') + ' ⏱️ ' + q.ok[LANG];
    fb.classList.add('show', 'wrong');
  });
}

function renderSection(s, items) {
  const topicRef = curTopic; /* тема, якій належить ця вправа */
  s.correct = 0; s.answered = 0;
  s.cur = items;
  s.wrong = [];
  updatePill();
  checkAllDone();

  const box = document.createElement('div');
  if (s.el) s.el.replaceWith(box); else quizMount.appendChild(box);
  s.el = box;

  const head = document.createElement('div');
  head.className = 'section-head';
  head.innerHTML = '<h2>' + s.title + '</h2><p>' + s.sub + '</p>';
  box.appendChild(head);

  if (s.gram) box.appendChild(buildGramCard(s.gram));

  items.forEach((q, k) => {
    if (curTopic.dnd) { buildDndCard(s, q, k, box); return; }
    const qi = s.start + k;
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML =
      '<p class="tag"></p>' +
      '<p class="sentence"><span class="num">' + (k + 1) + '.</span> ' + q.pre + '<b>___</b>' + q.post +
        ' <button class="speak" aria-label="🔊" title="' + t('speakTitle') + '">🔊</button></p>' +
      '<div class="opts">' + shuffle(q.opts.map((_, i) => i)).map(oi => '<button data-o="' + oi + '">' + q.opts[oi] + '</button>').join('') + '</div>' +
      '<p class="fb"></p>' +
      '<p class="tr-line">→ ' + q.tr[LANG] + '</p>';
    box.appendChild(card);

    const fb = card.querySelector('.fb');
    const trl = card.querySelector('.tr-line');
    const buttons = card.querySelectorAll('.opts button');

    const speakBtn = card.querySelector('.speak');
    speakBtn.addEventListener('click', () => {
      if (!ttsOk) return;
      const done = card.dataset.done;
      const text = done ? q.pre + q.opts[q.a].replace('-', '') + q.post : q.pre + ', ' + q.post.trim();
      const slow = window.speechSynthesis.speaking && lastSpeakBtn === speakBtn;
      lastSpeakBtn = speakBtn;
      speak(text, slow ? 0.6 : 0.95);
    });

    cardFinishers.push(() => {
      if (card.dataset.done) return;
      card.dataset.done = "1";
      s.answered++;
      streak = 0;
      s.wrong.push(q);
      bumpWordsIn(q.pre + ' ' + q.post, false);
      buttons.forEach(b => {
        b.disabled = true;
        if (+b.dataset.o === q.a) b.classList.add('ok');
      });
      const tg = card.querySelector('.tag');
      tg.textContent = q.cs ? CASE[q.cs][LANG] : curTopic.tag[LANG];
      tg.classList.add('show');
      const bl = card.querySelector('.sentence b');
      bl.textContent = q.opts[q.a].replace('-', '');
      bl.classList.add('filled');
      fb.textContent = t('timeUp') + ' ⏱️ ' + q.ok[LANG];
      fb.classList.add('show', 'wrong');
      trl.classList.add('show');
    });

    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        if (card.dataset.done) return;
        card.dataset.done = "1";
        s.answered++;
        const isOk = +btn.dataset.o === q.a;
        if (isOk) { s.correct++; streak++; } else { streak = 0; s.wrong.push(q); }
        bumpWordsIn(q.pre + ' ' + q.post, isOk);

        buttons.forEach(b => {
          b.disabled = true;
          if (+b.dataset.o === q.a) b.classList.add('ok');
          else if (b === btn) b.classList.add('bad');
        });

        const tag = card.querySelector('.tag');
        tag.textContent = q.cs ? CASE[q.cs][LANG] : curTopic.tag[LANG];
        tag.classList.add('show');

        const blank = card.querySelector('.sentence b');
        blank.textContent = q.opts[q.a].replace('-', '');
        blank.classList.add('filled');

        fb.textContent = (isOk ? 'Doğru! ' : 'Maalesef. ') + q.ok[LANG];
        fb.classList.add('show', isOk ? 'good' : 'wrong');
        trl.classList.add('show');

        updatePill();

        if (s.answered === s.cur.length) s.showResult();
      });
    });
  });

  const result = document.createElement('div');
  result.className = 'sec-result';
  result.innerHTML =
    '<div class="sec-score"></div>' +
    '<p class="sec-text"></p>' +
    '<div class="sec-btns">' +
      '<button class="btn-restart sec-again">' + t('again') + '</button>' +
      '<button class="btn-shuffle sec-mist" style="display:none"></button>' +
      '<button class="btn-shuffle sec-share">' + t('shareBtn') + '</button>' +
      '<a class="dict-mini" href="#d-' + topicRef.level + '">📖 ' + t('dictTitle') + ' ' + topicRef.level.toUpperCase() + '</a>' +
    '</div>';
  box.appendChild(result);

  result.querySelector('.sec-again').addEventListener('click', () => {
    if (curTopic !== topicRef) { restartTopic(topicRef); return; } /* стрічка поїхала далі — вертаємось до теми з нуля */
    clearTimer();
    renderSection(s, s.base);
    if (s.el.scrollIntoView) s.el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  result.querySelector('.sec-share').addEventListener('click', () => {
    shareResult(s.correct, s.cur.length, curTopic.name[LANG]);
  });
  result.querySelector('.sec-mist').addEventListener('click', () => {
    if (curTopic !== topicRef) {
      const wrongQs = s.wrong.slice();
      const idx = s.idx || 0;
      restartTopic(topicRef);
      const ns = sections[idx];
      renderSection(ns, wrongQs);
      if (ns.el.scrollIntoView) ns.el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    clearTimer();
    renderSection(s, s.wrong.slice());
    if (s.el.scrollIntoView) s.el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });




  s.showResult = function () {
    if (result.classList.contains('show')) return;
    result.querySelector('.sec-score').textContent = s.title + ': ' + s.correct + ' / ' + s.cur.length;
    result.querySelector('.sec-text').textContent = sectionVerdict(s.correct, s.cur.length);
    const mBtn = result.querySelector('.sec-mist');
    if (s.wrong.length) {
      mBtn.style.display = 'inline-block';
      mBtn.textContent = t('mistakesBtn') + ' (' + s.wrong.length + ')';
    } else {
      mBtn.style.display = 'none';
    }
    result.classList.add('show');
    track('complete/' + curTopic.id, true);
    celebrate(confettiFor(s.correct, s.cur.length));
    if (s.correct === s.cur.length) ayYildiz();
    checkAllDone();
    if (sections.length < 2) afterTopicDone(result);
  };
}

function vocabMedia(item) {
  const box = document.createElement('div');
  box.className = 'vmedia';
  const img = document.createElement('img');
  img.alt = item.w;
  img.src = 'img/' + item.w.toLowerCase().replace('ç','c').replace('ö','o').replace('ü','u').replace('ğ','g').replace('ş','s').replace('ı','i') + '.jpg';
  img.addEventListener('error', () => {
    const em = document.createElement('div');
    em.className = 'vemoji';
    em.textContent = item.e;
    img.replaceWith(em);
  });
  box.appendChild(img);
  return box;
}

let vState = null;

function renderVocab() {
  document.getElementById('quizHead').innerHTML =
    '<p class="page-eyebrow">' + curTopic.level.toUpperCase() + '</p>' +
    '<h2>' + curTopic.name[LANG] + '</h2>';
  vState = { stage: 'learn', started: false };
  quizBuilt = true;
  streak = 0;
  clearTimer();
  cardFinishers = [];
  quizMount = quizEl;
  document.getElementById('quizMore').innerHTML = '';
  quizEl.innerHTML = '';
  finishEl.classList.remove('show');
  sections = [];
  const words = curTopic.words;
  total = words.length;

  nazarRow.innerHTML =
    '<span class="pbar quiz-pbar"><span class="pfill" id="quizFill" style="width:0%"></span></span>'
    + '<button class="mini-restart" id="quizRestart" title="' + t('restartHint') + '">↺</button>'
    + '<span class="score-pill" id="scorePill">0 / ' + total + '</span>';

  let idx = 0;
  const seen = new Set();

  function learnCard() {
    if (idx > 0) vState.started = true;
    seen.add(idx);
    quizEl.innerHTML = '';
    const head = document.createElement('div');
    head.className = 'section-head';
    head.innerHTML = '<h2>' + t('vLearnTitle') + '</h2><p>' + t('vLearnSub') + '</p>';
    quizEl.appendChild(head);

    const item = words[idx];
    const card = document.createElement('div');
    card.className = 'card vcard';

    const nav = document.createElement('div');
    nav.className = 'vnav';
    words.forEach((_, k) => {
      const b = document.createElement('button');
      b.textContent = k + 1;
      if (seen.has(k)) b.classList.add('seen');
      if (k === idx) b.classList.add('cur');
      b.addEventListener('click', () => { idx = k; learnCard(); });
      nav.appendChild(b);
    });
    card.appendChild(nav);
    card.appendChild(vocabMedia(item));
    const w = document.createElement('div');
    w.className = 'vword';
    w.innerHTML = item.w + ' <button class="speak" aria-label="🔊" title="' + t('speakTitle') + '">🔊</button>';
    card.appendChild(w);
    const trn = document.createElement('p');
    trn.className = 'vtrans';
    trn.textContent = (item.tr[LANG] || item.tr.uk);
    card.appendChild(trn);
    const next = document.createElement('button');
    next.className = 'btn-restart';
    next.textContent = idx === total - 1 ? t('vStart') : t('vNext');
    card.appendChild(next);
    quizEl.appendChild(card);

    w.querySelector('.speak').addEventListener('click', () => {
      const slow = ttsOk && window.speechSynthesis.speaking;
      speak(item.w, slow ? 0.6 : 0.9);
    });
    if (ttsOk) speak(item.w, 0.9);

    next.addEventListener('click', () => {
      idx++;
      if (idx < total) learnCard(); else startTest();
    });
  }

  let order = [], ti = 0, correct = 0;

  let wrongWords = [];
  function startTest(list) {
    vState.stage = 'test'; vState.started = true;
    order = shuffle(list || words);
    wrongWords = [];
    ti = 0; correct = 0;
    updateVPill();
    testCard();
  }
  function updateVPill() {
    const pill = document.getElementById('scorePill');
    if (pill) pill.textContent = correct + ' / ' + order.length + (streak >= 3 ? ' · 🔥' + streak : '');
    const fill = document.getElementById('quizFill');
    if (fill) {
      const answered = correct + wrongWords.length;
      fill.style.width = Math.round(answered / order.length * 100) + '%';
    }
  }

  function testCard() {
    quizEl.innerHTML = '';
    const head = document.createElement('div');
    head.className = 'section-head';
    head.innerHTML = '<h2>' + t('vTestTitle') + '</h2><p>' + t('vTestSub') + '</p>';
    quizEl.appendChild(head);

    const item = order[ti];
    const card = document.createElement('div');
    card.className = 'card vcard';
    card.innerHTML = '<p class="vcount">' + (ti + 1) + ' / ' + total + '</p>';
    card.appendChild(vocabMedia(item));
    const hint = document.createElement('p');
    hint.className = 'vtrans vhint';
    hint.textContent = (item.tr[LANG] || item.tr.uk);
    card.appendChild(hint);

    const pool = (DICT[curTopic.level] && DICT[curTopic.level].length >= 4)
      ? DICT[curTopic.level] : words;
    const distractors = shuffle(pool.filter(x => x.w !== item.w)).slice(0, 3);
    const opts = shuffle([item].concat(distractors));
    const grid = document.createElement('div');
    grid.className = 'opts vopts';
    opts.forEach(o => {
      const b = document.createElement('button');
      b.textContent = o.w;
      b.addEventListener('click', () => {
        if (card.dataset.done) return;
        card.dataset.done = "1";
        const isOk = o.w === item.w;
        if (isOk) { correct++; streak++; } else { streak = 0; wrongWords.push(item); }
        bumpWord(item.w, isOk);
        grid.querySelectorAll('button').forEach(x => {
          x.disabled = true;
          if (x.textContent === item.w) x.classList.add('ok');
          else if (x === b) x.classList.add('bad');
        });
        fb.textContent = (isOk ? 'Doğru! ' : 'Maalesef. ') + item.w + ' — ' + (item.tr[LANG] || item.tr.uk);
        fb.classList.add('show', isOk ? 'good' : 'wrong');
        updateVPill();
        if (ttsOk) speak(item.w, 0.9);
        next.style.display = 'inline-block';
      });
      grid.appendChild(b);
    });
    card.appendChild(grid);

    const fb = document.createElement('p');
    fb.className = 'fb';
    card.appendChild(fb);

    const next = document.createElement('button');
    next.className = 'btn-restart';
    next.style.display = 'none';
    next.style.marginTop = '16px';
    next.textContent = t('vNext');
    next.addEventListener('click', () => {
      ti++;
      if (ti < total) testCard(); else vocabResult();
    });
    card.appendChild(next);
    quizEl.appendChild(card);
  }

  function vocabResult() {
    vState.stage = 'done';
    if (order.length === words.length && !curTopic.dynamic) saveBest(curTopic.id, correct);
    quizEl.innerHTML = '';
    const res = document.createElement('div');
    res.className = 'sec-result show';
    const mist = wrongWords.length
      ? '<button class="btn-shuffle v-mist">' + t('mistakesBtn') + ' (' + wrongWords.length + ')</button>' : '';
    const backHash = curTopic.backTo || curTopic.level;
    const backLabel = backHash.indexOf('d-') === 0 ? t('toDict') : t('toTopics');
    /* якщо кнопка «Назад» уже веде в словник — не дублюємо посиланням */
    const dictLink = backHash.indexOf('d-') === 0 ? '' :
      '<a class="dict-mini" href="#d-' + curTopic.level + '">📖 ' + t('dictTitle') + ' ' + curTopic.level.toUpperCase() + '</a>';
    res.innerHTML =
      '<div class="sec-score">' + t('vResult') + ': ' + correct + ' / ' + order.length + '</div>' +
      '<p class="sec-text">' + sectionVerdict(correct, order.length) + '</p>' +
      '<div class="sec-btns"><button class="btn-restart v-again">' + t('again') + '</button>' + mist +
      '<button class="btn-shuffle v-share">' + t('shareBtn') + '</button>' +
      '<button class="btn-shuffle v-back">' + backLabel + '</button></div>' +
      dictLink;
    res.querySelector('.v-share').addEventListener('click', () => {
      shareResult(correct, order.length, curTopic.name[LANG]);
    });
    res.querySelector('.v-back').addEventListener('click', () => { location.hash = backHash; });
    const topicRef = curTopic;
    res.querySelector('.v-again').addEventListener('click', () => {
      if (curTopic !== topicRef) { restartTopic(topicRef); return; }
      renderVocab();
    });
    afterTopicDone(res);
    if (wrongWords.length) {
      res.querySelector('.v-mist').addEventListener('click', () => {
        if (curTopic !== topicRef) { restartTopic(topicRef); return; }
        startTest(wrongWords.slice());
      });
    }
    quizEl.appendChild(res);
    track('complete/' + curTopic.id, true);
    celebrate(confettiFor(correct, order.length));
    if (correct === order.length) ayYildiz();
  }

  learnCard();
}

let lastMode = { mixed: false, timed: false };

function renderQuiz(mixed, timed, append) {
  if (curTopic.type === 'vocab') { renderVocab(); return; }
  lastMode = { mixed: !!mixed, timed: !!timed };
  document.getElementById('quizHead').innerHTML =
    '<p class="page-eyebrow">' + curTopic.level.toUpperCase() + '</p>' +
    '<h2>' + curTopic.name[LANG] + '</h2>';
  quizBuilt = true;
  streak = 0;
  clearTimer();
  cardFinishers = [];

  const more = document.getElementById('quizMore');
  if (append) {
    /* режим стрічки: старий контент лишається, нова тема виростає знизу */
    quizMount = more;
    const dv = document.createElement('div');
    dv.className = 'topic-divider';
    dv.innerHTML = '<p class="page-eyebrow">▶ ' + t('nextTopic') + '</p>' +
      '<h2>' + (curTopic.icon || '📘') + ' ' + curTopic.name[LANG] + '</h2>';
    more.appendChild(dv);
  } else {
    quizMount = quizEl;
    quizEl.innerHTML = '';
    more.innerHTML = '';
  }
  finishEl.classList.remove('show');

  sections = buildSections(mixed);
  let gi = 0;
  sections.forEach(s => { s.start = gi; gi += s.base.length; s.el = null; });
  total = gi;

  nazarRow.innerHTML =
    '<span class="pbar quiz-pbar"><span class="pfill" id="quizFill" style="width:0%"></span></span>'
    + '<button class="mini-restart" id="quizRestart" title="' + t('restartHint') + '">↺</button>'
    + '<span class="score-pill" id="scorePill">0 / ' + total + '</span>';

  if (curTopic.grammar && !timed) {
    quizMount.appendChild(buildGramCard(curTopic.grammar));
  }

  sections.forEach((s, i) => { s.idx = i; });
  sections.forEach(s => renderSection(s, s.base));

  if (timed) {
    startTimer(runTotal() * 12);
    track('timed/' + curTopic.id, true);
  }
}

function askConfirm(title, text, yesTxt, noTxt, onYes) {
  const back = document.createElement('div');
  back.className = 'modal-back';
  back.innerHTML =
    '<div class="modal">' +
      '<div class="m-title">' + title + '</div>' +
      '<p class="m-text">' + text + '</p>' +
      '<div class="m-btns">' +
        '<button class="btn-restart m-yes">' + yesTxt + '</button>' +
        '<button class="btn-shuffle m-no">' + noTxt + '</button>' +
      '</div>' +
    '</div>';
  back.querySelector('.m-no').addEventListener('click', () => back.remove());
  back.querySelector('.m-yes').addEventListener('click', () => { back.remove(); onYes(); });
  back.addEventListener('click', e => { if (e.target === back) back.remove(); });
  document.body.appendChild(back);
}

function doQuizRestart() {
  if (curTopic.type === 'vocab') renderVocab();
  else renderQuiz(lastMode.mixed, lastMode.timed);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

nazarRow.addEventListener('click', e => {
  if (e.target.id !== 'quizRestart') return;
  if (quizInProgress()) {
    askConfirm(t('restartAskTitle'), t('restartAskText'), t('restartYes'), t('restartNo'), doQuizRestart);
  } else {
    doQuizRestart();
  }
});

document.getElementById('restart').addEventListener('click', () => {
  renderQuiz(false);
  window.scrollTo({ top: 0, behavior: 'smooth' });
});
document.getElementById('finishMix').addEventListener('click', () => {
  renderQuiz(true);
  window.scrollTo({ top: 0, behavior: 'smooth' });
});
document.getElementById('globalMix').addEventListener('click', () => {
  renderQuiz(true);
  window.scrollTo({ top: 0, behavior: 'smooth' });
});
document.getElementById('timedBtn').addEventListener('click', () => {
  renderQuiz(true, true);
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

/* ------------------ PWA ------------------ */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}

document.querySelectorAll('.side img, .mobile-strip img').forEach(im => {
  im.addEventListener('error', () => im.classList.add('off'));
});

let lastY = 0;
const topbarWrap = document.querySelector('.topbar-wrap');
const topicsHead = document.getElementById('topicsHead');
window.addEventListener('scroll', () => {
  const y = window.scrollY || 0;
  const dir = y > lastY + 8 ? 'down' : (y < lastY - 8 ? 'up' : null);
  const inQuiz = screens.quiz.classList.contains('active');

  /* шапка: під час вправи не згортаємо; на меню — ховаємо смугу при скролі вниз */
  if (inQuiz) topbarWrap.classList.remove('slim');
  else if (dir === 'down' && y > 70) topbarWrap.classList.add('slim');
  else if (dir === 'up' || y <= 70) topbarWrap.classList.remove('slim');

  /* пігулка рівня (екран тем): ховається вниз, з'являється вгору — як у Busuu */
  if (screens.topics.classList.contains('active')) {
    topicsHead.style.top = topbarWrap.offsetHeight + 'px';
    if (dir === 'down' && y > 110) topicsHead.classList.add('pill-hidden');
    else if (dir === 'up' || y <= 110) topicsHead.classList.remove('pill-hidden');
  }

  /* пігулка контексту на екрані вправи: та сама поведінка */
  if (inQuiz) {
    const qp = document.getElementById('quizPill');
    if (qp) {
      qp.style.top = topbarWrap.offsetHeight + 'px';
      if (dir === 'down' && y > 110) qp.classList.add('pill-hidden');
      else if (dir === 'up' || y <= 110) qp.classList.remove('pill-hidden');
    }
  }

  lastY = y;
}, { passive: true });

/* Фолбек hero-фото: спрацьовує, лише якщо блок розкоментовано вище */
const heroImg = document.getElementById('heroImg');
if (heroImg) heroImg.addEventListener('error', () => {
  document.getElementById('heroMedia').classList.add('off');
});

/* ------------------ старт ------------------ */
show(route());
