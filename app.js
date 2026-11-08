(() => {
  'use strict';
  const D = window.STUDY_DATA, C = window.StudyCore;
  const main = document.getElementById('main');
  const byId = new Map(D.questions.map(q => [q.id, q]));
  const KEY = 'su-dang-study-v1';
  let storageAvailable = true;
  let saved;
  try { saved = JSON.parse(localStorage.getItem(KEY) || '{}'); }
  catch { saved = {}; storageAvailable = false; }
  if (!saved || typeof saved !== 'object' || Array.isArray(saved)) saved = {};
  const state = {
    progress: saved.progress && typeof saved.progress === 'object' ? saved.progress : {},
    history: Array.isArray(saved.history) ? saved.history.slice(-30) : [],
    active: saved.active || null, route: 'home', scope: 'all', section: 'all', status: 'all', query: '', page: 1,
    flash: null, quiz: null, result: null, reviewFilter: 'wrong', setupMode: 'practice',
    count: '20', mixQuestions: true, mixAnswers: true, minutes: '20'
  };
  let timerId, toastTimer;
  const paths = {
    arrow: 'M5 12h14m-5-5 5 5-5 5', left: 'M19 12H5m5-5-5 5 5 5',
    book: 'M3 5c4-1 7-1 9 1 2-2 5-2 9-1v14c-4-1-7-1-9 1-2-2-5-2-9-1V5zm9 1v14',
    cards: 'M8 3h12v15M4 7h12v14H4zM8 12h5M8 16h3',
    check: 'm5 12 4 4L19 6', cross: 'm6 6 12 12M18 6 6 18',
    shuffle: 'm3 5 3 0 12 14h3m-4-4 4 4-4 4M3 19h3l4-5m4-4 4-5h3m-4-4 4 4-4 4',
    search: 'M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm6-2 6 6',
    leaf: 'M5 20C0 9 7 3 21 3c0 14-6 21-16 17zM5 20 16 9',
    flag: 'M5 22V3m0 1c5-4 10 5 15 0v11c-5 5-10-4-15 0',
    sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2',
    clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 4v6l4 2',
    bulb: 'M8 17c0-3-3-4-3-8a7 7 0 0 1 14 0c0 4-3 5-3 8H8zm1 4h6M12 6v5',
    refresh: 'M20 8a9 9 0 0 0-16-1L1 10m0-6v6h6m-3 6a9 9 0 0 0 16 1l3-3m0 6v-6h-6',
    trophy: 'M7 3h10v7a5 5 0 0 1-10 0V3zm10 2h4v3a4 4 0 0 1-4 4M7 5H3v3a4 4 0 0 0 4 4m5 3v6m-5 0h10',
    download: 'M12 2v13m-5-5 5 5 5-5M4 17v5h16v-5',
    flip: 'M5 7h14m-4-4 4 4-4 4M19 17H5m4-4-4 4 4 4',
    chart: 'M4 21V11h4v10m3 0V3h4v18m3 0v-7h4v7',
    layers: 'm12 2 10 6-10 6L2 8l10-6zm-10 11 10 6 10-6M2 18l10 6 10-6'
  };
  const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name] || paths.book}"/></svg>`;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const rec = id => state.progress[id] || {};
  const mastered = id => rec(id).mastered === true;
  const wrong = id => rec(id).needsReview === true || rec(id).lastCorrect === false && !mastered(id);
  const chapterFor = q => D.chapters.find(ch => ch.sections.includes(q.section));
  const inScope = q => state.scope === 'all' || D.chapters.find(ch => ch.id === state.scope)?.sections.includes(q.section);
  const scoped = () => D.questions.filter(inScope);
  const selected = (a, b) => a === b ? ' selected' : '';
  const button = (action, text, cls = '', extra = '') => `<button class="btn ${cls}" data-action="${action}" ${extra}>${text}</button>`;
  const starButton = (id, extra = '') => `<button class="star-btn${rec(id).star ? ' active' : ''}" data-star="${id}" aria-label="${rec(id).star ? 'Bỏ lưu' : 'Lưu'} câu ${id}" aria-pressed="${!!rec(id).star}" ${extra}>${rec(id).star ? '★' : '☆'}</button>`;
  function toast(message) {
    const el = document.getElementById('toast'); el.textContent = message; el.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 3300);
  }
  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify({ progress: state.progress, history: state.history.slice(-30), active: state.active })); }
    catch { if (storageAvailable) toast('Trình duyệt chưa lưu được tiến độ. Bạn vẫn có thể tiếp tục học.'); storageAvailable = false; }
    document.getElementById('saved-count').textContent = D.questions.filter(q => rec(q.id).star).length;
  }
  function updateRecord(id, fields) { state.progress[id] = { ...rec(id), ...fields }; persist(); }
  function pageHeading(label, title, desc, action = '') {
    return `<div class="page-heading"><div><div class="eyebrow">${label}</div><h1>${title}</h1><p>${desc}</p></div>${action}</div>`;
  }
  function scopeSelect() {
    return `<select id="scope-filter" aria-label="Chọn chương"><option value="all">Tất cả các chương</option>${D.chapters.map(ch => `<option value="${ch.id}"${selected(state.scope, ch.id)}>${ch.name} · ${D.questions.filter(q => ch.sections.includes(q.section)).length} câu</option>`).join('')}</select>`;
  }
  function statusSelect() {
    return `<select id="status-filter" aria-label="Lọc tình trạng"><option value="all"${selected(state.status, 'all')}>Tất cả câu hỏi</option><option value="new"${selected(state.status, 'new')}>Chưa học</option><option value="mastered"${selected(state.status, 'mastered')}>Đã nhớ</option><option value="wrong"${selected(state.status, 'wrong')}>Cần ôn lại</option><option value="saved"${selected(state.status, 'saved')}>Đã lưu</option></select>`;
  }
  function filtered() {
    return scoped().filter(q => (state.section === 'all' || q.section === state.section) &&
      (state.status === 'all' || state.status === 'new' && !mastered(q.id) && !rec(q.id).attempts ||
       state.status === 'mastered' && mastered(q.id) || state.status === 'wrong' && wrong(q.id) ||
       state.status === 'saved' && rec(q.id).star) && C.matches(q, state.query));
  }
  function navigate(route, chapter = 'all', status = 'all') {
    const params = new URLSearchParams();
    if (chapter !== 'all') params.set('chapter', chapter);
    if (status !== 'all') params.set('status', status);
    const hash = `#${route}${params.size ? '?' + params : ''}`;
    if (location.hash === hash) readRoute(); else location.hash = hash;
  }
  function renderHome() {
    const learned = D.questions.filter(q => mastered(q.id)).length;
    const wrongCount = D.questions.filter(q => wrong(q.id)).length;
    main.innerHTML = `<section class="hero fade-in"><div><div class="eyebrow">Mỗi ngày một chút, hiểu sử hơn một chút</div><h1>Nhớ lịch sử.<br><em>Hiểu hành trình.</em></h1><p class="hero-copy">Một góc nhỏ để học Lịch sử Đảng theo cách của bạn.<br>Lật thẻ, luyện câu hỏi và tự tin hơn qua từng lần ôn.</p><div class="hero-actions"><a class="btn primary" href="#cards">${icon('cards')}Bắt đầu học${icon('arrow')}</a><a class="btn ghost" href="#practice">Luyện trắc nghiệm</a></div></div><div class="hero-art">${heroArt()}<div class="art-note"><span></span>Học để hiểu, nhớ để kết nối.</div></div></section>
      <section class="overview-stats" aria-label="Tổng quan bộ câu hỏi"><div class="overview-stat"><span class="stat-icon">${icon('cards')}</span><div><b>793</b><small>Câu hỏi có giải thích</small></div></div><div class="overview-stat"><span class="stat-icon">${icon('book')}</span><div><b>04</b><small>Chương, từ nền tảng đến Đổi mới</small></div></div><div class="overview-stat"><span class="stat-icon">${icon('leaf')}</span><div><b>${learned}<span style="font-size:12px;font-weight:400;color:#9ca18e"> / 793</span></b><small>Câu bạn đã ghi nhớ</small></div></div></section>
      <div class="home-layout"><section><div class="section-heading"><div><h2>Bộ thẻ của bạn</h2><p>Chọn một chương, bắt đầu một hành trình.</p></div><a class="link-btn" href="#library">Xem tất cả ${icon('arrow')}</a></div><div class="chapter-grid">${D.chapters.map(ch => chapterCard(ch)).join('')}</div><div class="collection-bar"><button data-action="wrong-library">↻ Câu cần ôn lại <span>${wrongCount}</span></button><button data-action="saved-library">☆ Câu đã lưu <span>${D.questions.filter(q => rec(q.id).star).length}</span></button></div></section>
      <aside class="home-aside"><div class="aside-card"><div class="eyebrow">Một chút mỗi ngày</div><div class="aside-art">${smallArt()}</div><h3>10 câu thôi,<br>tiến thêm một bước.</h3><p>Không cần học hết trong một lần. Dành vài phút để giữ nhịp ôn tập của bạn.</p>${button('quick-practice', `Ôn nhanh 10 câu ${icon('arrow')}`)}</div><div class="hint-card"><h4>${icon('bulb')}Một mẹo nhỏ để nhớ lâu</h4><p>Thử tự trả lời trước khi lật thẻ. Đọc phần giải thích để kết nối sự kiện với bối cảnh lịch sử.</p></div></aside></div>
      <section class="study-modes"><div class="section-heading"><h2>Học theo cách của bạn</h2></div><div class="mode-grid"><a class="mode-card" href="#cards"><span class="mode-icon">${icon('cards')}</span><div><b>Lật thẻ để nhớ</b><small>Câu hỏi ở trước, lời giải ở sau.</small></div>${icon('arrow')}</a><a class="mode-card" href="#practice"><span class="mode-icon">${icon('check')}</span><div><b>Chọn đáp án để hiểu</b><small>Đảo lựa chọn, giải thích từng câu.</small></div>${icon('arrow')}</a><a class="mode-card" href="#exam"><span class="mode-icon">${icon('clock')}</span><div><b>Thử sức một đề</b><small>Tự kiểm tra và xem lại câu sai.</small></div>${icon('arrow')}</a></div></section>`;
  }
  function chapterCard(ch) {
    const pool = D.questions.filter(q => ch.sections.includes(q.section));
    const known = pool.filter(q => mastered(q.id)).length, percent = Math.round(known * 100 / pool.length);
    return `<article class="chapter"><div class="chapter-top"><div class="chapter-icon ${ch.color}">${icon(['book', 'flag', 'sun', 'leaf'][D.chapters.indexOf(ch)])}</div><span class="chapter-tag">${ch.range}</span></div><div class="chapter-kicker">${ch.name}</div><h3>${ch.title}</h3><div class="chapter-count">${pool.length} câu hỏi <span style="margin:0 5px;color:#b7bbaa">·</span> Có đáp án & giải thích</div><div class="chapter-bottom"><div class="tiny-progress">${known ? known + ' / ' + pool.length + ' đã nhớ' : 'Chưa bắt đầu'}<i><span style="width:${percent}%"></span></i></div><a class="chapter-cta" href="#cards?chapter=${ch.id}">Học bộ này ${icon('arrow')}</a></div></article>`;
  }
  function heroArt() {
    return `<svg viewBox="0 0 500 370" fill="none" role="img" aria-label="Những thẻ ghi nhớ kết nối các mốc lịch sử 1930, 1945 và 1986"><ellipse cx="267" cy="192" rx="169" ry="149" fill="#eeeee3"/><path d="M42 264c48 68 138 51 213 38 110-19 172-35 194-117" stroke="#c8cbb7" stroke-dasharray="4 6"/><path d="M105 100c5-39 44-67 81-57" stroke="#b9bfa7" stroke-dasharray="3 6"/><g transform="translate(265 66) rotate(14)"><rect width="150" height="213" rx="14" fill="#dfe6d3" stroke="#c1cdb1"/><rect x="16" y="18" width="39" height="5" rx="2.5" fill="#a3b18f"/><path d="M17 171h112m-112 10h74m-74 10h97" stroke="#b9c6a7" stroke-width="4" stroke-linecap="round"/></g><g transform="translate(119 74) rotate(-10)"><rect x="0" y="7" width="188" height="235" rx="15" fill="#d3d3be" opacity=".24"/><rect width="188" height="235" rx="15" fill="#fffef7" stroke="#dedfcd"/><text x="21" y="29" font-size="8" letter-spacing="2" fill="#9b9d8b" font-family="sans-serif">MỘT MỐC LỊCH SỬ</text><path d="M21 43h146" stroke="#e3e3d7"/><text x="23" y="109" font-size="46" fill="#88483f" font-family="Georgia,serif">1930</text><text x="23" y="139" font-size="10" fill="#68715e" font-family="sans-serif">Khởi đầu một hành trình.</text><path d="M23 169h120m-120 12h94" stroke="#e3e5d8" stroke-width="4" stroke-linecap="round"/><rect x="22" y="201" width="68" height="17" rx="8.5" fill="#edf0e3"/><text x="31" y="212" font-size="7" fill="#8b9975" font-family="sans-serif">LỊCH SỬ ĐẢNG</text></g><g transform="translate(302 221) rotate(7)"><rect width="130" height="60" rx="12" fill="#f7efe3" stroke="#e7d8c3"/><circle cx="25" cy="29" r="13" fill="#e8ddc8"/><path d="m19 29 4 4 8-9" stroke="#9a8d63" stroke-width="1.8" stroke-linecap="round"/><text x="48" y="25" font-size="9" fill="#858169" font-family="sans-serif">Lật một thẻ.</text><text x="48" y="41" font-size="9" fill="#858169" font-family="sans-serif">Nhớ một điều.</text></g><circle cx="102" cy="275" r="22" fill="#e2e8d7"/><path d="M92 284c-4-13 3-21 17-19-1 14-7 21-17 19zm0 0 11-13" stroke="#8d9e76" stroke-width="1.5"/><path d="m394 83 0 17m-8-8h17M75 166v12m-6-6h12" stroke="#b1ae92" stroke-width="1.5" stroke-linecap="round"/><circle cx="374" cy="307" r="4" fill="#cab79b"/><circle cx="88" cy="73" r="3" fill="#c9cfbb"/><text x="329" y="48" font-size="13" fill="#aab397" font-family="Georgia,serif" font-style="italic" transform="rotate(10 329 48)">1945</text><text x="214" y="344" font-size="13" fill="#b8a78d" font-family="Georgia,serif" font-style="italic" transform="rotate(-6 214 344)">1986</text></svg>`;
  }
  function smallArt() {
    return `<svg viewBox="0 0 160 110" fill="none" aria-hidden="true"><path d="m106 83 16-47m-11 32c-3-15 7-20 12-24 4 14 0 20-12 24zm-4 13c-15-3-15-12-15-18 14 3 18 6 15 18z" stroke="#a4ad8a" stroke-width="1.5"/><g transform="translate(34 14) rotate(-9)"><rect x="7" y="7" width="67" height="80" rx="8" fill="#dce2ca" stroke="#bac5a2"/><rect width="67" height="80" rx="8" fill="#fffdf0" stroke="#cfd5bb"/><path d="M17 20h30M17 27h22M18 59h27" stroke="#c4cbb0" stroke-width="3" stroke-linecap="round"/><path d="m25 43 5 5 10-12" stroke="#9aa981" stroke-width="2" stroke-linecap="round"/></g><path d="M24 101h113" stroke="#cfd5bb" stroke-width="1.5" stroke-linecap="round"/></svg>`;
  }
  function makeFlash() {
    const pool = filtered();
    state.flash = { deck: C.shuffle(pool), index: 0, flipped: false, known: 0, reviewed: 0 };
  }
  function renderCards() {
    if (!state.flash) makeFlash();
    const f = state.flash, q = f.deck[f.index];
    main.innerHTML = `${pageHeading('Học một chút, nhớ thêm nhiều', 'Lật thẻ, nhớ lâu hơn.', 'Đọc câu hỏi, thử tự trả lời rồi lật thẻ để đối chiếu. Mỗi câu đều có lời giải từ bộ đề gốc.')}
      <div class="filter-bar">${scopeSelect()}${statusSelect()}<span class="filter-note">${f.deck.length} thẻ trong bộ này</span></div>
      <div class="study-shell">${!f.deck.length ? emptyState('Chưa có thẻ trong bộ này', 'Thử chọn chương hoặc tình trạng khác để tiếp tục học.') : f.index >= f.deck.length ? `<div class="flash-complete">${icon('leaf')}<h2>Thêm một vòng ôn, thêm điều đã nhớ.</h2><p>Bạn đã xem ${f.reviewed} thẻ và đánh dấu nhớ ${f.known} thẻ trong lượt này.</p>${button('restart-flash', `Học lại bộ thẻ ${icon('refresh')}`, 'primary')}</div>` : `
      <div class="study-topline"><span><strong>${D.sections[q.section]}</strong> <span style="margin:0 7px;color:#c3c7b6">/</span> Thẻ ${f.index + 1} trên ${f.deck.length}</span>${button('shuffle-flash', `${icon('shuffle')} Xáo thẻ`, 'small ghost')}</div>
      <div class="progress-track"><span style="width:${(f.index + 1) * 100 / f.deck.length}%"></span></div>
      <div class="flashcard ${f.flipped ? 'back' : ''}" id="flashcard" role="button" tabindex="0" aria-label="${f.flipped ? 'Đáp án. Nhấn để xem câu hỏi' : 'Câu hỏi. Nhấn để lật xem đáp án'}" aria-pressed="${f.flipped}"><span class="flash-label">${f.flipped ? 'Đáp án & giải thích' : 'Thử trả lời trước khi lật'}</span>${starButton(q.id)}<h2>${esc(f.flipped ? q.options[q.answer] : q.q)}</h2>${f.flipped ? `<p>${esc(q.explain)}</p>` : ''}<span class="flip-hint">${icon('flip')} Chạm để lật thẻ</span></div>
      <div class="flash-controls">${button('prev-flash', icon('left'), 'icon ghost', `aria-label="Thẻ trước" ${f.index === 0 ? 'disabled' : ''}`)}${button('flip', `${icon('flip')} Lật thẻ`, 'ghost')}${button('next-flash', icon('arrow'), 'icon ghost', 'aria-label="Thẻ tiếp theo"')}</div>
      <div class="flash-rating">${button('flash-again', `↻ Cần ôn lại`, 'ghost')}${button('flash-known', `${icon('check')} Đã nhớ rồi`, 'green')}</div><p class="keyboard-help"><kbd>Space</kbd> Lật thẻ <span style="margin:0 8px">·</span><kbd>←</kbd><kbd>→</kbd> Chuyển thẻ</p>`}</div>`;
  }
  function emptyState(title, desc) {
    return `<div class="empty-state">${icon('leaf')}<h2>${title}</h2><p>${desc}</p>${button('clear-filters', 'Xem toàn bộ câu hỏi', 'ghost')}</div>`;
  }
  function renderSetup() {
    const pool = filtered();
    main.innerHTML = `${pageHeading('Học chắc, hiểu sâu', 'Một lượt luyện, một bước tiến.', 'Đáp án được xáo trộn mặc định. Chọn phạm vi và số câu để bắt đầu một lượt ôn vừa sức.')}
      ${state.active ? `<div class="resume-banner"><p><strong>Bạn có một bài đang làm.</strong><br>Tiếp tục từ câu ${Number(state.active.index) + 1} / ${state.active.items?.length || 0}. ${state.active.mode === 'exam' ? 'Đồng hồ thi vẫn tính từ lúc bắt đầu.' : 'Các câu đã chọn được giữ lại.'}</p><div>${button('resume', 'Tiếp tục bài', 'small primary')}${button('discard-session', 'Bỏ bài cũ', 'small ghost')}</div></div>` : ''}
      <div class="setup-layout"><section class="setup-card"><div class="setup-tabs" role="group" aria-label="Chọn chế độ"><button data-action="mode-practice" class="${state.setupMode === 'practice' ? 'active' : ''}" aria-pressed="${state.setupMode === 'practice'}">Luyện tập có lời giải</button><button data-action="mode-exam" class="${state.setupMode === 'exam' ? 'active' : ''}" aria-pressed="${state.setupMode === 'exam'}">Thi thử</button></div>
      <div class="setup-fields"><label class="field"><span>Phạm vi ôn tập</span>${scopeSelect()}</label><label class="field"><span>Nhóm câu hỏi</span>${statusSelect()}</label><label class="field"><span>Số câu trong lượt</span><select id="count-setting">${['10', '20', '40', 'all'].map(v => `<option value="${v}"${selected(state.count, v)}>${v === 'all' ? 'Tất cả ' + pool.length + ' câu' : v + ' câu'}</option>`).join('')}</select></label><label class="field"><span>${state.setupMode === 'exam' ? 'Thời gian làm bài' : 'Phản hồi'}</span>${state.setupMode === 'exam' ? `<select id="minutes-setting">${['10', '20', '30', '60'].map(v => `<option value="${v}"${selected(state.minutes, v)}>${v} phút</option>`).join('')}</select>` : `<select disabled aria-label="Xem giải thích ngay sau mỗi câu"><option>Giải thích sau mỗi câu</option></select>`}</label></div>
      <div class="setup-options"><label class="toggle-label"><span>Đảo thứ tự câu hỏi<small>Mỗi lượt học là một thứ tự mới.</small></span><input type="checkbox" id="mix-questions" ${state.mixQuestions ? 'checked' : ''}></label><label class="toggle-label"><span>Đảo vị trí các đáp án<small>Nhớ kiến thức thay vì nhớ vị trí A, B, C, D.</small></span><input type="checkbox" id="mix-answers" ${state.mixAnswers ? 'checked' : ''}></label></div>
      <div class="setup-start"><span>${pool.length} câu phù hợp bộ lọc.<br>${state.setupMode === 'exam' ? 'Chấm điểm sau khi nộp bài.' : 'Chọn đáp án để đọc giải thích ngay.'}</span>${button('start-quiz', `Bắt đầu ${state.setupMode === 'exam' ? 'thi thử' : 'luyện tập'} ${icon('arrow')}`, 'primary', pool.length ? '' : 'disabled')}</div></section>
      <aside class="setup-side"><div class="aside-art">${smallArt()}</div><h3>Không chỉ chọn đúng.<br>Hãy hiểu vì sao.</h3><ul><li>${icon('shuffle')}<span>Vị trí đáp án đổi, đáp án đúng luôn được giữ chính xác.</span></li><li>${icon('book')}<span>Đầy đủ giải thích gốc cho cả 793 câu hỏi.</span></li><li>${icon('refresh')}<span>Cuối bài, ôn riêng những câu bạn chọn sai hoặc bỏ trống.</span></li><li>${icon('leaf')}<span>Tiến độ tự lưu trên trình duyệt. Không cần tạo tài khoản.</span></li></ul></aside></div>`;
  }
  function startQuiz(pool = filtered(), forceCount, mode = state.setupMode) {
    if (!pool.length) { toast('Bộ lọc này chưa có câu hỏi.'); return; }
    let questions = state.mixQuestions ? C.shuffle(pool) : pool.slice();
    const count = forceCount ?? (state.count === 'all' ? questions.length : Number(state.count));
    questions = questions.slice(0, count);
    state.quiz = { mode, items: questions.map(q => ({ question: C.prepareQuestion(q, state.mixAnswers), selected: null })),
      index: 0, startedAt: Date.now(), deadline: mode === 'exam' ? Date.now() + Number(state.minutes) * 60000 : null,
      finished: false, mixedAnswers: state.mixAnswers };
    state.result = null; snapshotQuiz();
    if (state.route !== 'practice') { location.hash = '#practice'; } else renderQuiz();
    startTimer(); window.scrollTo(0, 0);
  }
  function snapshotQuiz() {
    const q = state.quiz;
    if (!q || q.finished) return;
    state.active = { mode: q.mode, index: q.index, startedAt: q.startedAt, deadline: q.deadline, mixedAnswers: q.mixedAnswers,
      items: q.items.map(item => ({ id: item.question.id, order: item.question.options.map(o => o.id), selected: item.selected })) };
    persist();
  }
  function resumeQuiz() {
    try {
      const a = state.active;
      if (!a || !['exam', 'practice'].includes(a.mode) || !Array.isArray(a.items) || !a.items.length || a.items.length > D.questions.length) throw Error('Invalid session');
      if (!Number.isFinite(a.startedAt) || (a.mode === 'exam' && !Number.isFinite(a.deadline))) throw Error('Invalid time');
      const unique = new Set();
      const items = a.items.map(item => {
        const q = byId.get(item.id);
        if (!q || unique.has(q.id) || !Array.isArray(item.order) || item.order.length !== q.options.length || new Set(item.order).size !== q.options.length || item.order.some(id => !Number.isInteger(id) || id < 0 || id >= q.options.length)) throw Error('Invalid question');
        unique.add(q.id);
        return { question: { ...q, options: item.order.map(id => ({ id, text: q.options[id] })) }, selected: Number.isInteger(item.selected) && item.selected >= 0 && item.selected < q.options.length ? item.selected : null };
      });
      state.quiz = { ...a, items, index: Math.max(0, Math.min(Number.isInteger(a.index) ? a.index : 0, items.length - 1)), finished: false };
      state.result = null;
      if (a.mode === 'exam' && a.deadline <= Date.now()) { finishQuiz(true); return; }
      renderQuiz(); startTimer();
    } catch { state.active = null; persist(); toast('Bài lưu cũ không còn phù hợp. Hãy bắt đầu một lượt mới.'); renderSetup(); }
  }
  function timerText() {
    const seconds = Math.max(0, Math.ceil((state.quiz.deadline - Date.now()) / 1000));
    return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  }
  function startTimer() {
    clearInterval(timerId);
    if (!state.quiz || state.quiz.mode !== 'exam' || state.quiz.finished) return;
    timerId = setInterval(() => {
      if (state.quiz.deadline <= Date.now()) { finishQuiz(true); return; }
      const el = document.getElementById('exam-timer');
      if (el) { el.textContent = timerText(); el.classList.toggle('urgent', state.quiz.deadline - Date.now() < 60000); }
    }, 1000);
  }
  function renderQuiz() {
    const s = state.quiz;
    if (!s || s.finished) { state.result ? renderResults() : renderSetup(); return; }
    const item = s.items[s.index], q = item.question, answered = item.selected !== null;
    const feedback = s.mode === 'practice' && answered, correct = C.isCorrect(q, item.selected);
    const answeredCount = s.items.filter(i => i.selected !== null).length;
    main.innerHTML = `${pageHeading(s.mode === 'exam' ? 'Thi thử · tự kiểm tra kiến thức' : 'Luyện tập · hiểu qua từng câu', s.mode === 'exam' ? 'Tập trung một chút, bạn làm được.' : 'Chậm một chút, nhớ chắc hơn.', `${s.mixedAnswers ? 'Đáp án đã được đảo vị trí.' : 'Đang dùng thứ tự đáp án gốc.'} ${s.mode === 'exam' ? 'Kết quả và lời giải sẽ hiện sau khi nộp bài.' : 'Sau mỗi lựa chọn, đọc giải thích để hiểu thêm.'}`, button('pause-quiz', 'Lưu & tạm dừng', 'ghost small'))}
      <div class="quiz-layout"><div class="quiz-main"><div class="study-topline"><strong>Câu ${s.index + 1} / ${s.items.length}</strong><span>Đã trả lời ${answeredCount} câu</span></div><div class="progress-track" style="margin-bottom:20px"><span style="width:${answeredCount * 100 / s.items.length}%"></span></div><section class="question-card"><div class="question-meta"><span>${D.sections[q.section]} <span style="margin:0 5px">·</span> Mã gốc #${q.id}</span>${starButton(q.id)}</div><h2>${esc(q.q)}</h2><div class="answers" role="group" aria-label="Các phương án trả lời">${q.options.map((o, idx) => {
        const cls = feedback ? o.id === q.answer ? 'correct' : item.selected === o.id ? 'incorrect' : '' : item.selected === o.id ? 'selected' : '';
        return `<button class="answer-option ${cls}" data-answer="${o.id}" ${feedback ? 'disabled' : ''} aria-pressed="${item.selected === o.id}"><span class="option-letter">${String.fromCharCode(65 + idx)}</span><span>${esc(o.text)}</span>${feedback && o.id === q.answer ? '<span class="answer-mark" aria-label="Đáp án đúng">✓</span>' : feedback && o.id === item.selected ? '<span class="answer-mark" aria-label="Đã chọn sai">×</span>' : ''}</button>`;
      }).join('')}</div>${feedback ? `<div class="explanation ${correct ? '' : 'wrong'}" role="status"><strong>${correct ? '✓ Chính xác! Cùng ghi nhớ điều này.' : 'Chưa đúng rồi. Xem đáp án màu xanh nhé.'}</strong><p>${esc(q.explain)}</p></div>` : ''}<div class="quiz-actions">${button('prev-question', `${icon('left')} Câu trước`, 'ghost', s.index === 0 ? 'disabled' : '')}${button(s.index === s.items.length - 1 ? 'finish-quiz' : 'next-question', `${s.index === s.items.length - 1 ? s.mode === 'exam' ? 'Nộp bài' : 'Xem kết quả' : 'Câu tiếp theo'} ${icon('arrow')}`, 'primary')}</div></section><p class="keyboard-help"><kbd>1</kbd>–<kbd>4</kbd> Chọn đáp án <span style="margin:0 7px">·</span><kbd>Enter</kbd> Tiếp tục</p></div>
      <aside class="question-nav">${s.mode === 'exam' ? `<span style="font-size:9px;color:var(--muted)">THỜI GIAN CÒN LẠI</span><strong class="timer" id="exam-timer" aria-label="Thời gian còn lại">${timerText()}</strong>` : ''}<h3>Hành trình lượt này</h3><div class="question-numbers">${s.items.map((it, idx) => `<button data-goto="${idx}" class="${idx === s.index ? 'current ' : ''}${it.selected !== null ? s.mode === 'practice' && !C.isCorrect(it.question, it.selected) ? 'wrong' : 'done' : ''}" aria-label="Câu ${idx + 1}, ${it.selected === null ? 'chưa trả lời' : 'đã trả lời'}" ${idx === s.index ? 'aria-current="step"' : ''}>${idx + 1}</button>`).join('')}</div><p class="nav-legend">Ô có màu: đã trả lời.<br>Chọn số để chuyển tới câu bất kỳ.</p>${button('finish-quiz', s.mode === 'exam' ? 'Nộp bài & chấm điểm' : 'Kết thúc lượt luyện', 'small ghost', 'style="width:100%"')}<p class="quiz-side-note">Câu bỏ trống vẫn tính trong tổng điểm. Bạn có thể quay lại các câu trước khi kết thúc.</p></aside></div>`;
  }
  function chooseAnswer(id) {
    const s = state.quiz;
    if (!s || s.finished) return;
    if (s.mode === 'exam' && s.deadline <= Date.now()) { finishQuiz(true); return; }
    const item = s.items[s.index];
    if (s.mode === 'practice' && item.selected !== null) return;
    if (!item.question.options.some(o => o.id === id)) return;
    item.selected = id; snapshotQuiz(); renderQuiz();
  }
  function finishQuiz(expired = false) {
    const s = state.quiz;
    if (!s || s.finished) return;
    s.finished = true; clearInterval(timerId);
    const score = C.score(s.items);
    s.items.forEach(item => {
      if (item.selected === null) { state.progress[item.question.id] = { ...rec(item.question.id), needsReview: true }; return; }
      const q = item.question, r = rec(q.id), right = C.isCorrect(q, item.selected);
      const streak = right ? (r.streak || 0) + 1 : 0;
      state.progress[q.id] = { ...r, attempts: (r.attempts || 0) + 1, correct: (r.correct || 0) + (right ? 1 : 0), lastCorrect: right, needsReview: !right, streak, mastered: right ? streak >= 2 || r.mastered === true : false };
    });
    state.result = { ...score, items: s.items, mode: s.mode, expired, elapsed: Math.max(0, Math.round((Date.now() - s.startedAt) / 1000)) };
    state.history.push({ at: Date.now(), ...score, mode: s.mode });
    state.active = null; state.reviewFilter = score.correct === score.total ? 'all' : 'wrong'; persist();
    if (state.route !== 'practice') {
      state.route = 'practice'; history.replaceState(null, '', '#practice');
      document.querySelectorAll('[data-nav]').forEach(el => { const active = el.dataset.nav === 'practice'; el.classList.toggle('active', active); active ? el.setAttribute('aria-current', 'page') : el.removeAttribute('aria-current'); });
      document.title = 'Kết quả lượt học · Sử Đảng';
    }
    renderResults(); window.scrollTo(0, 0);
  }
  function renderResults() {
    const r = state.result;
    if (!r) { renderSetup(); return; }
    const review = r.items.filter(item => state.reviewFilter === 'all' || !C.isCorrect(item.question, item.selected));
    main.innerHTML = `${pageHeading('Mỗi lượt ôn đều có giá trị', 'Bạn vừa tiến thêm một bước.', r.expired ? 'Đã hết thời gian. Bài được tự động nộp và lưu kết quả.' : 'Xem lại những câu còn vướng, rồi thử thêm một lượt để nhớ chắc hơn.')}
      <section class="results-hero"><div class="score-ring" style="--score:${r.percent}%"><span>${r.percent}%<small>TRẢ LỜI ĐÚNG</small></span></div><div><h2>${r.percent >= 80 ? 'Một lượt ôn rất vững vàng.' : r.percent >= 50 ? 'Bạn đang đi đúng hướng.' : 'Mình cùng ôn lại một chút nhé.'}</h2><p>${r.correct} / ${r.total} câu đúng <span style="margin:0 5px">·</span> Điểm ${(r.correct * 10 / r.total).toFixed(2)} / 10 <span style="margin:0 5px">·</span> ${Math.floor(r.elapsed / 60)} phút ${r.elapsed % 60} giây</p><div class="result-stats"><div><b>${r.correct}</b><span>Chính xác</span></div><div><b>${r.wrong}</b><span>Cần ôn lại</span></div><div><b>${r.skipped}</b><span>Bỏ trống</span></div></div></div></section>
      <div class="result-actions">${button('retry-wrong', `${icon('refresh')} Ôn câu sai & bỏ trống`, 'primary', r.correct === r.total ? 'disabled' : '')}${button('retry-all', `${icon('shuffle')} Làm lại, đảo đáp án`, 'ghost')}${button('new-quiz', 'Chọn lượt học mới', 'ghost')}</div>
      <div class="section-heading"><h2>Đọc lại để nhớ chắc</h2><select id="review-filter" aria-label="Lọc kết quả" style="padding:10px;border:1px solid var(--line);background:white;border-radius:8px;font-size:10px"><option value="wrong"${selected(state.reviewFilter, 'wrong')}>Sai & bỏ trống</option><option value="all"${selected(state.reviewFilter, 'all')}>Tất cả câu hỏi</option></select></div><div class="review-list">${review.map(item => {
        const q = item.question, original = byId.get(q.id), correct = C.isCorrect(q, item.selected);
        return `<article class="review-card"><div style="display:flex;justify-content:space-between;gap:15px"><h3>${r.items.indexOf(item) + 1}. ${esc(q.q)}</h3><span class="status-pill ${correct ? 'good' : 'bad'}" style="align-self:flex-start">${correct ? 'Đúng' : item.selected === null ? 'Bỏ trống' : 'Chưa đúng'}</span></div>${!correct && item.selected !== null ? `<div class="review-line bad">Bạn chọn: ${esc(original.options[item.selected])}</div>` : ''}<div class="review-line">✓ Đáp án đúng: <strong>${esc(original.options[q.answer])}</strong></div><p>${esc(q.explain)}</p></article>`;
      }).join('') || '<div class="empty-state"><p>Không có câu sai hoặc bỏ trống trong lượt này.</p></div>'}</div>`;
  }
  const libraryOrder = new Map(D.questions.map(q => [q.id, C.prepareQuestion(q)]));
  function renderLibrary() {
    const sections = Object.entries(D.sections).filter(([id]) => state.scope === 'all' || D.chapters.find(c => c.id === state.scope)?.sections.includes(id));
    main.innerHTML = `${pageHeading('Ngân hàng câu hỏi', 'Tất cả kiến thức, trong một góc nhỏ.', 'Tra cứu 793 câu gốc, xem đáp án và lời giải. Gõ có dấu hoặc không dấu đều tìm được.', button('download-json', `${icon('download')} Tải bộ câu hỏi`, 'ghost small'))}
      <div class="filter-bar"><div class="search-wrap">${icon('search')}<input class="search-input" id="library-search" type="search" placeholder="Tìm sự kiện, nhân vật, mốc thời gian…" value="${esc(state.query)}" aria-label="Tìm câu hỏi, đáp án hoặc giải thích"></div>${scopeSelect()}<select id="section-filter" aria-label="Chọn phần"><option value="all">Tất cả các phần</option>${sections.map(([id, name]) => `<option value="${id}"${selected(state.section, id)}>${name}</option>`).join('')}</select>${statusSelect()}</div><div id="library-results"></div>`;
    renderLibraryResults();
  }
  function renderLibraryResults() {
    const pool = filtered(), pages = Math.max(1, Math.ceil(pool.length / 20));
    state.page = Math.max(1, Math.min(state.page, pages));
    const list = pool.slice((state.page - 1) * 20, state.page * 20);
    document.getElementById('library-results').innerHTML = `<div class="library-toolbar"><span><strong>${pool.length}</strong> câu hỏi${pool.length ? ` · Hiển thị ${(state.page - 1) * 20 + 1}–${Math.min(state.page * 20, pool.length)}` : ''}</span>${button('learn-filtered', `${icon('cards')} Học bộ đang lọc`, 'small ghost', pool.length ? '' : 'disabled')}</div><div class="library-list">${list.map(q => `<article class="library-item"><div class="library-summary"><span class="num">#${q.id}</span><div><h3>${esc(q.q)}</h3><div class="sub"><span>${D.sections[q.section]}</span>${mastered(q.id) ? '<span class="status-pill good">Đã nhớ</span>' : wrong(q.id) ? '<span class="status-pill bad">Cần ôn lại</span>' : ''}</div></div>${starButton(q.id)}</div><details><summary>Xem đáp án & giải thích</summary><div class="library-answers">${libraryOrder.get(q.id).options.map((o, idx) => `<div class="library-answer ${o.id === q.answer ? 'correct' : ''}">${String.fromCharCode(65 + idx)}. ${esc(o.text)} ${o.id === q.answer ? ' ✓' : ''}</div>`).join('')}</div><p class="library-explanation">${esc(q.explain)}</p></details></article>`).join('') || emptyState('Chưa tìm thấy câu phù hợp', 'Thử từ khóa ngắn hơn hoặc thay đổi bộ lọc.')}</div>${pages > 1 ? `<div class="pagination">${button('library-prev', icon('left'), 'icon ghost', `aria-label="Trang trước" ${state.page === 1 ? 'disabled' : ''}`)}<span>Trang ${state.page} / ${pages}</span>${button('library-next', icon('arrow'), 'icon ghost', `aria-label="Trang tiếp" ${state.page === pages ? 'disabled' : ''}`)}</div>` : ''}`;
  }
  function downloadQuestions() {
    const blob = new Blob([JSON.stringify(D, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = 'lich-su-dang-793-cau.json'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000); toast('Đã tải bộ câu hỏi, đáp án và giải thích gốc.');
  }
  function readRoute() {
    const [name, raw = ''] = location.hash.replace(/^#/, '').split('?');
    const params = new URLSearchParams(raw);
    const route = ['home', 'cards', 'practice', 'library', 'saved', 'exam'].includes(name) ? name : 'home';
    state.route = route === 'saved' ? 'library' : route === 'exam' ? 'practice' : route;
    state.scope = D.chapters.some(c => c.id === params.get('chapter')) ? params.get('chapter') : 'all';
    state.status = route === 'saved' ? 'saved' : ['new', 'mastered', 'wrong', 'saved'].includes(params.get('status')) ? params.get('status') : 'all';
    state.section = 'all'; state.query = ''; state.page = 1; state.flash = null;
    if (route === 'exam') { snapshotQuiz(); state.quiz = null; state.result = null; clearInterval(timerId); state.setupMode = 'exam'; }
    document.querySelectorAll('[data-nav]').forEach(el => {
      const active = el.dataset.nav === state.route; el.classList.toggle('active', active);
      active ? el.setAttribute('aria-current', 'page') : el.removeAttribute('aria-current');
    });
    renderCurrent(); window.scrollTo(0, 0);
    document.title = `${{ home: 'Góc ôn tập của bạn', cards: 'Thẻ ghi nhớ', practice: 'Luyện tập', library: 'Thư viện câu hỏi' }[state.route]} · Sử Đảng`;
  }
  function renderCurrent() {
    if (state.route === 'home') renderHome();
    else if (state.route === 'cards') renderCards();
    else if (state.route === 'library') renderLibrary();
    else if (state.result) renderResults();
    else if (state.quiz && !state.quiz.finished) renderQuiz();
    else renderSetup();
  }
  function filterChanged() {
    state.page = 1; state.flash = null;
    const params = new URLSearchParams();
    if (state.scope !== 'all') params.set('chapter', state.scope);
    if (state.status !== 'all') params.set('status', state.status);
    history.replaceState(null, '', `#${state.route}${params.size ? '?' + params : ''}`);
    renderCurrent();
  }
  main.addEventListener('change', e => {
    const { id, value } = e.target;
    if (id === 'scope-filter') { state.scope = value; state.section = 'all'; filterChanged(); }
    else if (id === 'status-filter') { state.status = value; filterChanged(); }
    else if (id === 'section-filter') { state.section = value; state.page = 1; renderLibraryResults(); }
    else if (id === 'count-setting') state.count = value;
    else if (id === 'minutes-setting') state.minutes = value;
    else if (id === 'mix-questions') state.mixQuestions = e.target.checked;
    else if (id === 'mix-answers') state.mixAnswers = e.target.checked;
    else if (id === 'review-filter') { state.reviewFilter = value; renderResults(); }
  });
  main.addEventListener('input', e => {
    if (e.target.id === 'library-search') { state.query = e.target.value; state.page = 1; renderLibraryResults(); }
  });
  main.addEventListener('click', e => {
    const star = e.target.closest('[data-star]');
    if (star) {
      const id = Number(star.dataset.star), isStarred = !rec(id).star;
      updateRecord(id, { star: isStarred }); star.classList.toggle('active', isStarred); star.textContent = isStarred ? '★' : '☆'; star.setAttribute('aria-pressed', String(isStarred)); star.setAttribute('aria-label', `${isStarred ? 'Bỏ lưu' : 'Lưu'} câu ${id}`);
      if (state.route === 'library' && state.status === 'saved') renderLibraryResults();
      return;
    }
    const answer = e.target.closest('[data-answer]');
    if (answer) { chooseAnswer(Number(answer.dataset.answer)); return; }
    const go = e.target.closest('[data-goto]');
    if (go) { state.quiz.index = Number(go.dataset.goto); snapshotQuiz(); renderQuiz(); return; }
    const action = e.target.closest('[data-action]')?.dataset.action;
    if (action) doAction(action);
    else if (e.target.closest('#flashcard')) doAction('flip');
  });
  function doAction(action) {
    const f = state.flash, s = state.quiz;
    switch (action) {
      case 'wrong-library': navigate('library', 'all', 'wrong'); break;
      case 'saved-library': navigate('saved'); break;
      case 'quick-practice': state.scope = 'all'; state.status = 'all'; state.section = 'all'; state.query = ''; state.mixAnswers = true; startQuiz(D.questions, 10, 'practice'); break;
      case 'flip': if (f && f.deck[f.index]) { f.flipped = !f.flipped; renderCards(); } break;
      case 'next-flash': if (f && f.index < f.deck.length) { f.index++; f.flipped = false; f.reviewed = Math.max(f.reviewed, f.index); renderCards(); } break;
      case 'prev-flash': if (f && f.index > 0) { f.index--; f.flipped = false; renderCards(); } break;
      case 'shuffle-flash': case 'restart-flash': makeFlash(); renderCards(); toast('Đã xáo lại thứ tự thẻ.'); break;
      case 'flash-again': case 'flash-known': if (f && f.deck[f.index]) { const id = f.deck[f.index].id; updateRecord(id, { mastered: action === 'flash-known', needsReview: action !== 'flash-known', lastReviewed: Date.now() }); if (action === 'flash-known') f.known++; f.index++; f.reviewed = Math.max(f.reviewed, f.index); f.flipped = false; renderCards(); } break;
      case 'clear-filters': state.scope = 'all'; state.section = 'all'; state.status = 'all'; state.query = ''; filterChanged(); break;
      case 'mode-practice': state.setupMode = 'practice'; renderSetup(); break;
      case 'mode-exam': state.setupMode = 'exam'; renderSetup(); break;
      case 'start-quiz': startQuiz(); break;
      case 'resume': resumeQuiz(); break;
      case 'discard-session': state.active = null; state.quiz = null; persist(); renderSetup(); break;
      case 'pause-quiz': snapshotQuiz(); state.quiz = null; clearInterval(timerId); renderSetup(); toast('Đã lưu bài để bạn tiếp tục lần sau.'); break;
      case 'next-question': if (s && s.index < s.items.length - 1) { s.index++; snapshotQuiz(); renderQuiz(); } break;
      case 'prev-question': if (s && s.index > 0) { s.index--; snapshotQuiz(); renderQuiz(); } break;
      case 'finish-quiz': finishQuiz(); break;
      case 'retry-wrong': { const pool = state.result.items.filter(it => !C.isCorrect(it.question, it.selected)).map(it => byId.get(it.question.id)); state.mixAnswers = true; startQuiz(pool, pool.length, 'practice'); break; }
      case 'retry-all': { const pool = state.result.items.map(it => byId.get(it.question.id)); state.mixAnswers = true; startQuiz(pool, pool.length, state.result.mode); break; }
      case 'new-quiz': state.result = null; state.quiz = null; renderSetup(); break;
      case 'download-json': downloadQuestions(); break;
      case 'learn-filtered': state.flash = { deck: C.shuffle(filtered()), index: 0, flipped: false, known: 0, reviewed: 0 }; state.route = 'cards'; history.pushState(null, '', '#cards'); document.querySelectorAll('[data-nav]').forEach(el => el.classList.toggle('active', el.dataset.nav === 'cards')); renderCards(); window.scrollTo(0, 0); break;
      case 'library-prev': state.page--; renderLibraryResults(); main.scrollIntoView({ block: 'start' }); break;
      case 'library-next': state.page++; renderLibraryResults(); main.scrollIntoView({ block: 'start' }); break;
    }
  }
  document.addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey || ['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
    if (state.route === 'cards' && state.flash && state.flash.deck[state.flash.index]) {
      if (e.code === 'Space' && !document.activeElement?.closest('button,a')) { e.preventDefault(); doAction('flip'); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); doAction('next-flash'); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); doAction('prev-flash'); }
      else if (e.key === 'Enter' && document.activeElement?.id === 'flashcard') { e.preventDefault(); doAction('flip'); }
    }
    if (state.route === 'practice' && state.quiz && !state.quiz.finished && !state.result) {
      if (/^[1-4]$/.test(e.key)) { e.preventDefault(); chooseAnswer(state.quiz.items[state.quiz.index].question.options[Number(e.key) - 1].id); }
      else if (e.key === 'Enter' && document.activeElement?.tagName !== 'BUTTON') { e.preventDefault(); doAction(state.quiz.index === state.quiz.items.length - 1 ? 'finish-quiz' : 'next-question'); }
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && state.quiz?.mode === 'exam' && !state.quiz.finished && state.quiz.deadline <= Date.now()) finishQuiz(true);
  });
  document.querySelector('.skip').addEventListener('click', e => { e.preventDefault(); main.focus(); main.scrollIntoView({ block: 'start' }); });
  window.addEventListener('hashchange', readRoute);
  window.addEventListener('beforeunload', () => { if (state.quiz && !state.quiz.finished) snapshotQuiz(); });
  persist(); readRoute();
})();
