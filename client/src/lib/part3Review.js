// Part 3 Review Module - BongBong style
// Integrates with WEBCHECK AI analysis data
//
// Nguồn hiển thị duy nhất của ba-rem: criteriaCatalog.js (60 tiêu chí v2.0,
// sinh tự động từ bộ máy mốc 1 qua node scripts/sync-criteria.mjs).

import { CRITERIA_COUNTS_BY_PRIORITY, CRITERIA_GROUPS, CRITERIA_META } from './constants.js';

const PART3_CONFIG = {
  endpoint: '/api/ai-review',
  model: 'gpt-4o-mini',
  temperature: 0.2,
  maxTokens: 2600,
  timeoutMs: 90000,
  jsonMode: true,
  headers: null,
};

// Severity map for improvements
const SEVERITY_MAP = {
  critical: { key: 'critical', label: 'Nghiêm trọng', badge: 'bg-red-500', dot: 'bg-red-500', bar: 'from-red-500 to-rose-500' },
  high: { key: 'high', label: 'Cao', badge: 'bg-orange-500', dot: 'bg-orange-500', bar: 'from-orange-500 to-amber-500' },
  medium: { key: 'medium', label: 'Trung bình', badge: 'bg-amber-500', dot: 'bg-amber-500', bar: 'from-amber-500 to-yellow-500' },
  low: { key: 'low', label: 'Thấp', badge: 'bg-sky-500', dot: 'bg-sky-500', bar: 'from-sky-500 to-cyan-500' },
};

const SEVERITY_FROM_PRIORITY = { Cao: 'high', 'Trung bình': 'medium', Thấp: 'low' };

const CRITERIA_COUNT = CRITERIA_META.length; // 60
const GROUP_COUNT = CRITERIA_GROUPS.length; // 7

const CRITERIA_BY_ID = new Map(CRITERIA_META.map((criterion) => [criterion.id, criterion]));

/* Nhận id hoặc nhãn hiển thị, trả về nhãn của tiêu chí trong ba-rem v2.0. */
function criterionLabel(raw) {
  if (raw === null || raw === undefined || raw === '') return 'Tổng thể';
  const found = CRITERIA_BY_ID.get(String(raw));
  return found ? found.name : String(raw);
}

/* escape HTML — panel render bằng innerHTML nên mọi chuỗi có nguồn từ dữ liệu
 * website / AI (không đáng tin) phải được escape trước khi chèn. */
function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Initialize Part3Review class
function Part3Review(container, options = {}) {
  this.container = typeof container === 'string' 
    ? document.querySelector(container) 
    : container;
  this.options = Object.assign({}, PART3_CONFIG, options);
  this.result = null;
  this.payload = null;
  this.controller = null;
  this.statusTimer = null;
  this.mounted = false;
  this.root = null;
  this.bodyEl = null;
  
  if (this.container) {
    this.mounted = true;
    this.renderShell();
  }
}

// Configure options
Part3Review.prototype.configure = function(patch) {
  this.options = Object.assign({}, this.options, patch || {});
  return this;
};

// Render the shell structure
Part3Review.prototype.renderShell = function() {
  if (!this.container) return;
  
  this.container.innerHTML = `
    <section class="p3-root" data-p3-root>
      <div class="relative overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_80px_-40px_rgba(15,23,42,0.35)]">
        <div class="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-br from-indigo-600/10 via-sky-500/10 to-emerald-500/10"></div>
        <header class="relative p-6 md:p-8">
          <div class="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div class="flex items-start gap-4">
              <div class="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-indigo-600 to-sky-500 text-white shadow-lg shadow-indigo-500/25">
                <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 8V5"/><rect x="4" y="8" width="16" height="11" rx="3"/><path d="M9 13h.01M15 13h.01"/><path d="M9 16h6"/></svg>
              </div>
              <div>
                <div class="flex flex-wrap items-center gap-2">
                  <span class="rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-indigo-700 ring-1 ring-indigo-200">Phần 3</span>
                  <span class="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">AI Review Engine</span>
                  <span class="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700 ring-1 ring-emerald-200">Ba-rem ${CRITERIA_COUNT} tiêu chí</span>
                </div>
                <h2 class="mt-2 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">Đánh giá & nhận xét website</h2>
                <p class="mt-1 max-w-2xl text-sm leading-6 text-slate-500">AI đối chiếu điểm và nhận xét của bộ máy v2.0 với ba-rem trọng số P0–P3, chỉ kết luận dựa trên bằng chứng quan sát được.</p>
              </div>
            </div>
            <div class="flex flex-col items-start gap-3 md:items-start">
              <div data-p3-statusbar class="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/70 p-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
                <div class="flex items-center gap-2">
                  <span data-p3-statusdot class="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500"></span>
                  <div>
                    <p data-p3-statustitle class="text-sm font-semibold text-slate-800">AI đối chiếu Ba-rem chuyên sâu</p>
                    <p data-p3-statussub class="text-xs text-slate-500">Sẵn sàng đón kết quả chấm của bộ máy ${CRITERIA_COUNT} tiêu chí.</p>
                  </div>
                </div>
                <span data-p3-statusbadge class="inline-flex w-fit items-center rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-200">Sẵn sàng</span>
              </div>
              <div class="mt-2 flex flex-wrap gap-1.5">{this._renderCriteriaStrip()}</div>
            </div>
          </div>
        </header>
        <div data-p3-body class="relative border-t border-slate-100 p-6 md:p-8"></div>
        <footer class="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-6 py-4 text-[11px] text-slate-400 md:px-8">
          <p>Ba-rem ${CRITERIA_COUNT} tiêu chí · ${GROUP_COUNT} nhóm · Điểm chấm từ backend WEBCHECK AI</p>
          <p>Part 3 · AI Review Engine</p>
        </footer>
      </section>
    `;
    
    this.root = this.container.querySelector('[data-p3-root]');
    this.bodyEl = this.container.querySelector('[data-p3-body]');
};

// Render criteria strip — 7 nhóm tiêu chí với số mục mỗi nhóm
Part3Review.prototype._renderCriteriaStrip = function() {
  return CRITERIA_GROUPS.map((group, index) => {
    const count = CRITERIA_META.filter((criterion) => criterion.group === group).length;
    const dotColors = ['bg-indigo-400', 'bg-cyan-400', 'bg-emerald-400', 'bg-violet-400', 'bg-amber-400', 'bg-rose-400', 'bg-sky-400'];
    return `<span class="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200" title="Nhóm ${group} — ${count} tiêu chí"><span class="h-1.5 w-1.5 rounded-full ${dotColors[index % dotColors.length]}"></span>${group} · ${count}</span>`;
  }).join('');
};

// Set status display
Part3Review.prototype.setStatus = function(tone, title, sub, badge) {
  const toneStyles = {
    idle: { dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200', pulse: '' },
    loading: { dot: 'bg-indigo-500', badge: 'bg-indigo-50 text-indigo-700 ring-indigo-200', pulse: 'p3-pulse-dot' },
    success: { dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200', pulse: '' },
    error: { dot: 'bg-rose-500', badge: 'bg-rose-50 text-rose-700 ring-rose-200', pulse: '' }
  };
  
  const styles = toneStyles[tone] || toneStyles.idle;
  const dot = this.root?.querySelector('[data-p3-statusdot]');
  const titleEl = this.root?.querySelector('[data-p3-statustitle]');
  const subEl = this.root?.querySelector('[data-p3-statussub]');
  const badgeEl = this.root?.querySelector('[data-p3-statusbadge]');
  
  if (dot) dot.className = 'h-2.5 w-2.5 shrink-0 rounded-full ' + styles.dot + ' ' + styles.pulse;
  if (titleEl) titleEl.textContent = title;
  if (subEl) subEl.textContent = sub;
  if (badgeEl) {
    badgeEl.className = 'inline-flex w-fit items-center rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ' + styles.badge;
    badgeEl.textContent = badge;
  }
};

// Render idle state
Part3Review.prototype.renderIdle = function() {
  if (!this.bodyEl) return;
  this.result = null;
  this.setStatus('idle', 'AI đối chiếu Ba-rem chuyên sâu', 'Sẵn sàng đón kết quả chấm của bộ máy 60 tiêu chí.', 'Sẵn sàng');
  this.bodyEl.innerHTML = `
    <div class="space-y-4">
      <div class="p-4 rounded-xl border border-slate-200 bg-white text-center">
        <svg class="mx-auto mb-3 h-12 w-12 text-indigo-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V5"/><rect x="4" y="8" width="16" height="11" rx="3"/><path d="M9 13h.01M15 13h.01"/><path d="M9 16h6"/></svg>
        <h3 class="mt-4 text-lg font-bold text-slate-900">Chờ kết quả phân tích</h3>
        <p class="text-sm text-slate-500 max-w-xl mx-auto">Khi lần phân tích hoàn tất, điểm theo ba-rem và nhận xét ba-rem từ AI/bộ quy tắc sẽ hiển thị tại đây.</p>
      </div>
      <div class="p-4 rounded-xl border border-slate-200 bg-slate-50">
        <p class="text-sm text-slate-600">Ba-rem ${CRITERIA_COUNT} tiêu chí chia ${GROUP_COUNT} nhóm: ${CRITERIA_GROUPS.join(' · ')}</p>
        <p class="mt-2 text-[11px] text-slate-400">Nhận xét sẽ trả về: 3 điểm sáng + 3 điểm cần cải thiện, ưu tiên tiêu chí trọng số cao.</p>
      </div>
    </div>
  `;
};

// Set loading state
Part3Review.prototype.setLoading = function() {
  if (!this.bodyEl) return;
  this.setStatus('loading', 'AI đang đối chiếu Ba-rem chuyên sâu…', 'Đang tổng hợp nhận xét theo ba-rem…', 'Đang phân tích');
  this.bodyEl.innerHTML = `
    <div class="p-6 rounded-3xl border border-indigo-200 bg-indigo-50/30 text-center">
      <div class="relative grid h-16 w-16 place-items-center">
        <span class="absolute inset-0 rounded-full border-4 border-indigo-100"></span>
        <span class="p3-spin absolute inset-0 rounded-full border-4 border-transparent border-t-indigo-600"></span>
        <span class="text-indigo-600">🤖</span>
      </div>
      <div>
        <p class="text-lg font-bold text-slate-900 mt-4">AI đang đối chiếu Ba-rem chuyên sâu…</p>
        <p data-p3-loading-text class="mt-1 text-sm text-slate-500">Đang tổng hợp nhận xét theo ba-rem…</p>
      </div>
      <div class="mt-3 flex items-center gap-1.5">
        ${this._renderCriteriaStrip()}
      </div>
      <div class="mt-4">
        <button data-p3-action="cancel" class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-500 transition hover:bg-slate-50">
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>
          Huỷ phân tích
        </button>
      </div>
    </div>
  `;
  this.startStatusRotation();
};

// Start status rotation
Part3Review.prototype.startStatusRotation = function() {
  this.stopStatusRotation();
  const messages = [
    'Đang tổng hợp nhận xét theo ba-rem trọng số…',
    `Đang đối chiếu ${CRITERIA_COUNT} tiêu chí theo ${GROUP_COUNT} nhóm…`,
    'Đang kiểm chứng bằng chứng quan sát được…',
    'Đang tổng hợp 03 điểm sáng & 03 điểm cần cải thiện…'
  ];
  let index = 0;
  this.statusTimer = setInterval(() => {
    index = (index + 1) % messages.length;
    this.setStatus('loading', 'AI đang đối chiếu Ba-rem chuyên sâu...', messages[index], 'Đang phân tích');
  }, 2100);
};

// Stop status rotation
Part3Review.prototype.stopStatusRotation = function() {
  if (this.statusTimer) {
    clearInterval(this.statusTimer);
    this.statusTimer = null;
  }
};

// Render error state
Part3Review.prototype.renderError = function(message, kind) {
  this.stopStatusRotation();
  this.setStatus('error', 'Đối chiếu Ba-rem chưa hoàn tất', message, 'Có lỗi');
  this.bodyEl.innerHTML = `
    <div class="p-6 rounded-3xl border border-rose-200 bg-rose-50/60 text-center">
      <svg class="mx-auto mb-4 h-12 w-12 text-rose-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/><path d="M12 18v6l4-2"/><path d="M5 6l6 6"/><path d="M19 6l-6 6"/></svg>
      <h3 class="mt-4 text-lg font-bold text-slate-900">Chưa thể hoàn tất phân tích</h3>
      <p class="mt-2 max-w-xl mx-auto text-sm leading-6 text-slate-600">${esc(message)}</p>
      <div class="mt-4">
        <button data-p3-action="retry" class="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800">
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>
          Thử lại
        </button>
      </div>
    </div>
  `;
};

// Render success state with analysis results
Part3Review.prototype.renderSuccess = function(result) {
  this.stopStatusRotation();
  this.result = result;
  this.setStatus('success', 'AI đã hoàn tiếp đối chiếu Ba-rem', `${result.strengths.length} điểm sáng · ${result.improvements.length} điểm cải thiện · ${result.limitations.length} hạn chế dữ liệu`, 'Hoàn tất');
  
  // Build the display content
  const strengthsHtml = result.strengths.length
    ? `<ol class="mt-5 space-y-3">${result.strengths.map((s, i) => `
      <li class="p3-fade-up rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm" style="animation-delay:${i * 70}ms">
        <span class="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-emerald-400 to-teal-500"></span>
        <div class="flex items-start gap-4">
          <span class="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100"><svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg></span></div>
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <span class="text-[11px] font-bold tracking-widest text-emerald-500">#${String(i + 1).padStart(2, '0')}</span>
              ${result.strengths[i]?.criterion 
                ? `<span class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">${result.strengths[i].criterion}</span>`
                : ''}
            </div>
            <h4 class="mt-2 text-[13px] font-semibold leading-6 text-slate-900">${result.strengths[i]?.title || 'Chưa có tiêu đề'}</h4>
            ${result.strengths[i]?.evidence ? `<p class="mt-2 text-sm leading-5 text-slate-600"><strong>Bằng chứng:</strong> ${result.strengths[i]?.evidence}</p>` : ''}
            ${result.strengths[i]?.impact ? `<p class="mt-2 text-sm leading-5 text-slate-600"><strong>Ý nghĩa tích cực:</strong> ${result.strengths[i]?.impact}</p>` : ''}
          </div>
        </div>
      </li>`).join('')}`
    : `<p class="text-sm text-slate-600">Chưa có điểm sáng nào đủ bằng chứng từ dữ liệu quét.</p>`;
  
  const improvementsHtml = result.improvements.length
    ? `<ol class="mt-5 space-y-3">${result.improvements.map((imp, i) => `
      <li class="p3-fade-up rounded-2xl border border-amber-100 bg-white p-5 shadow-sm" style="animation-delay:${i * 70}ms">
        <span class="absolute inset-y-0 left-0 w-1 bg-gradient-to-b ${SEVERITY_MAP[imp.severity]?.bar || SEVERITY_MAP.high.bar}"></span>
        <div class="flex items-start gap-4">
          <span class="grid h-10 w-10 place-items-center rounded-xl bg-amber-50 text-amber-600 ring-1 ring-amber-100"><svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15Z"/></svg></span></div>
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <span class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ring-1 ${SEVERITY_MAP[imp.severity]?.badge || SEVERITY_MAP.high.badge}"><span class="h-1.5 w-1.5 rounded-full ${SEVERITY_MAP[imp.severity]?.dot || SEVERITY_MAP.high.dot}"></span>${SEVERITY_MAP[imp.severity]?.label || 'Cao'}</span>
              ${imp.criterion 
                ? `<span class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200">${imp.criterion}</span>`
                : ''}
              <span class="ml-auto text-[10px] font-bold tracking-widest text-amber-500">#${String(i + 1).padStart(2, '0')}</span>
            </div>
            <h4 class="mt-2 text-[13px] font-semibold leading-6 text-slate-900">${imp.title || 'Chưa có tiêu đề'}</h4>
            ${imp.evidence ? `<p class="mt-2 text-sm leading-5 text-slate-600"><strong>Bằng chứng:</strong> ${imp.evidence}</p>` : ''}
            ${imp.consequence ? `<div class="mt-2 rounded-xl bg-rose-50/70 p-3 ring-1 ring-rose-100"><p class="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-rose-700"><svg class="mt-0.5 h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.9 2.4 17.4A2 2 0 0 0 4.1 20.4h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg> Hệ quả nếu bỏ qua</p><p class="mt-1.5 text-sm leading-6 text-slate-700">${imp.consequence}</p></div>` : ''}
            ${imp.solution ? `<div class="mt-2 rounded-xl bg-white p-3 ring-1 ring-emerald-200"><p class="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700"><svg class="mt-0.5 h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18h6"/><path d="M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.4 1 1 1 1.7V16h5v-.4c0-.7.4-1.3 1-1.7A6 6 0 0 0 12 3Z"/></svg> Giải pháp thực thi</p><p class="mt-1.5 text-sm leading-6 text-slate-700">${imp.solution}</p></div>` : ''}
          </div>
        </div>
      </li>`).join('')}`
    : `<p class="text-sm text-slate-600">Chưa có điểm cần cải thiện nào đủ bằng chứng từ dữ liệu quét.</p>`;
  
  const limitationsHtml = result.limitations.length
    ? `<ul class="mt-4 space-y-2.5">${result.limitations.map(lim => `<li class="flex items-start gap-2.5 text-sm leading-6 text-slate-600"><span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400"></span><span>${lim}</span></li>`).join('')}</ul>`
    : `<div class="mt-4 flex items-start gap-2.5 rounded-xl bg-emerald-50 p-3 text-sm leading-6 text-emerald-700 ring-1 ring-emerald-100"><svg class="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.5 2.5 4.5-5"/></svg><span>Đủ dữ liệu để đánh giá toàn bộ ${GROUP_COUNT} nhóm tiêu chí trong lần phân tích này.</span></div>`;
  
  const adviceHtml = result.strategicAdvice ? `
    <div class="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p class="text-[10px] font-bold uppercase tracking-wide text-slate-400">Lời khuyên chiến lược</p>
      <p class="mt-2 whitespace-pre-line text-base leading-7 text-slate-200">${result.strategicAdvice}</p>
      <p class="text-[11px] text-slate-400">Thứ tự ưu tiên dựa trên tác động × chi phí thực thi.</p>
    </div>`
    : '';
  
  this.bodyEl.innerHTML = `
    <div class="rounded-3xl border border-emerald-200/80 bg-gradient-to-b from-emerald-50/90 to-white p-6">
      <div class="flex items-start justify-between gap-3">
        <div>
          <h3 class="text-xl font-bold text-slate-900">03 điểm sáng nổi bật</h3>
          <p class="text-xs text-slate-500">Bằng chứng quan sát trực tiếp từ dữ liệu quét</p>
        </div>
        <span class="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">${result.strengths.length}/3</span>
      </div>
      <ol class="mt-5 space-y-3">${strengthsHtml}</ol>
    </div>
    <div class="rounded-3xl border border-amber-200/80 bg-gradient-to-b from-amber-50/90 to-white p-6 mt-4">
      <div class="flex items-start justify-between gap-3">
        <div>
          <h3 class="text-xl font-bold text-slate-900">03 điểm cần cải thiện</h3>
          <p class="text-xs text-slate-500">Ưu tiên theo mức độ nghiêm trọng và tác động</p>
        </div>
        <span class="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700">${result.improvements.length}/3</span>
      </div>
      <ol class="mt-5 space-y-3">${improvementsHtml}</ol>
    </div>
    ${limitationsHtml}
    ${adviceHtml}
  `;
};

// Hiển thị trạng thái chờ khi đã có điểm nhưng nhận xét chưa xong
Part3Review.prototype.renderWaiting = function(message) {
  if (!this.bodyEl) return;
  this.stopStatusRotation();
  this.setStatus('loading', 'Bộ nhận xét đang hoàn tất', message || 'Đang tổng hợp nhận xét…', 'Đang xử lý');
  this.bodyEl.innerHTML = `
    <div class="p-6 rounded-3xl border border-indigo-200 bg-indigo-50/30 text-center">
      <div class="relative mx-auto grid h-14 w-14 place-items-center">
        <span class="absolute inset-0 rounded-full border-4 border-indigo-100"></span>
        <span class="p3-spin absolute inset-0 rounded-full border-4 border-transparent border-t-indigo-600"></span>
        <span class="text-indigo-600">🤖</span>
      </div>
      <p class="mt-3 text-base font-bold text-slate-900">Đã chấm xong ba-rem ${CRITERIA_COUNT} tiêu chí</p>
      <p class="mt-1 text-sm text-slate-500">${esc(message) || 'Đang tổng hợp nhận xét…'}</p>
      <div class="mt-3 flex flex-wrap justify-center gap-1.5">${this._renderCriteriaStrip()}</div>
    </div>
  `;
};

// Nguồn dữ liệu thật: kết quả chấm + nhận xét của backend (AI hoặc bộ quy tắc)
Part3Review.prototype.analyzeFromReport = function(input) {
  const analysis = input?.analysis && typeof input.analysis === 'object' ? input.analysis : null;
  const review = input?.review && typeof input.review === 'object' ? input.review : null;
  const url = input?.url || analysis?.finalUrl || analysis?.url || '';

  if (!analysis || !review) {
    const message = 'Chưa đủ dữ liệu phân tích để hiển thị. Hãy phân tích lại website.';
    this.renderError(message, 'data');
    this.container.dispatchEvent(new CustomEvent('part3:error', { detail: { message } }));
    return Promise.reject(new Error('Missing analysis review'));
  }

  const criterionNameById = new Map(
    (Array.isArray(analysis.criteria) ? analysis.criteria : []).map((criterion) => [criterion.id, criterion.name || criterion.id]),
  );

  const strengths = (review.strengths || []).slice(0, 3).map((item) => ({
    criterion: criterionNameById.get(item.criterionId) || item.criterionId || 'Tổng thể',
    title: item.title || 'Chưa có tiêu đề',
    evidence: item.why || 'Không có bằng chứng quan sát',
    impact: item.benefit || 'Chưa có đánh giá tác động',
  }));

  const improvements = (review.improvements || []).slice(0, 3).map((item) => {
    const severityKey = SEVERITY_FROM_PRIORITY[item.priority] || 'medium';
    return {
      criterion: criterionNameById.get(item.criterionId) || item.criterionId || 'Tổng thể',
      severity: severityKey,
      title: item.title || 'Chưa có tiêu đề',
      evidence: item.problem || 'Không có bằng chứng quan sát',
      consequence: item.impact || 'Chưa có hệ quả',
      solution: item.solution || 'Chưa có giải pháp',
    };
  });

  const limitations = [];
  if (review.notice) limitations.push(review.notice);
  if (review.dataNotes) limitations.push(review.dataNotes);

  const payload = {
    url,
    strengths,
    improvements,
    limitations: limitations.filter(Boolean).slice(0, 5),
    strategicAdvice: review.summary || '', // sẽ được esc() ở _normalizeResult
    meta: { demo: false, model: review.model || 'rule-based' },
  };

  const normalized = this._normalizeResult(payload, url);
  this.result = normalized;
  this.renderSuccess(normalized);
  this.container.dispatchEvent(new CustomEvent('part3:complete', { detail: { result: normalized } }));
  return Promise.resolve(normalized);
};

// Analyze function - main entry point
Part3Review.prototype.analyze = async function(input) {
  if (!this.mounted || !this.container) {
    console.error('Part3Review not mounted');
    return Promise.reject(new Error('Module not mounted'));
  }
  
  // Stop any existing analysis
  this.stopStatusRotation();
  this.controller?.abort();
  
  const config = this.config();
  const url = input?.url || '';
  const scanData = input?.scanData;
  
  // If no scan data provided, try to get from existing analysis
  if (!scanData) {
    // Try to get from window.__WEBCHECK_ANALYSIS__
    if (window.__WEBCHECK_ANALYSIS__?.criteria) {
      scanData = JSON.stringify(window.__WEBCHECK_ANALYSIS__);
    }
  }
  
  // Validate we have some data
  if (!url && !scanData) {
    this.renderError('Chưa có URL website và không có dữ liệu quét. Vui lòng cung cấp URL hoặc dữ liệu quét client-side.', 'data');
    return Promise.reject(new Error('Missing input data'));
  }
  
  // Set loading state
  this.setLoading();
  
  try {
    // Prepare messages for AI
    const dataText = scanData || '{}';
    const userPrompt = [
      'URL doanh nghiệp cần đánh giá: ' + url,
      '',
      'DỮ LIỆU QUÉT CLIENT-SIDE (chỉ được dùng dữ liệu trong khối này):',
      '<du_lieu_quet>',
      dataText,
      '</du_lieu_quet>',
      '',
      'Hãy phân tích và trả về DUY NHẤT một đối tượng JSON hợp lệ bao gồm:',
      '- strengths: mảng có 03 mục, mỗi mục có criterion (tên tiêu chí), title (tên điểm mạnh), evidence (bằng chứng), impact (ý nghĩa tích cực)',
      '- improvements: mảng có 03 mục, mỗi mục có criterion, severity (cao/trung bình/thấp), title (tiêu đề), evidence (bằng chứng), consequence (hệ quả), solution (giải pháp thực thi)',
      '- strategicAdvice: 3-5 câu lời khuyên chiến lược dựa trên tác động và chi phí',
      '- limitations: mảng các hạng mục chưa đủ dữ liệu để đánh giá',
      '- evaluatedCriteria: đánh dấu trạng thái evaluated hoặc limited cho từng nhóm tiêu chí',
      '',
      'QUAN TRỌNG: Chỉ phân tích dựa trên dữ liệu client-side nằm trong khối <du_lieu_quet>. Không truy cập internet, không tự suy đoán, không bịa đặt số liệu hay quan sát. Viết tiếng Việt.',
      '',
      'SCHEMA JSON (không thêm trường nào ngoài schema):',
      '{',
      '  "strengths": [',
      '    { "criterion": "seo|ui|content|branding|marketing|performance|responsive|security|trust", "title": "string", "evidence": "string", "impact": "string" }',
      '  ],',
      '  "improvements": [',
      '    { "criterion": "seo|ui|content|branding|marketing|performance|responsive|security|trust", "severity": "low|medium|high|critical", "title": "string", "evidence": "string", "consequence": "string", "solution": "string" }',
      '  ],',
      '  "limitations": ["string"]',
      '  "strategicAdvice": "string"',
      '  "evaluatedCriteria": [',
      '    { "key": "ui", "status": "evaluated|limited", "note": "string" }',
      '  ]',
      '}'
    ].join('\n');
    
    const messages = [
      { role: 'system', content: 'Bạn là chuyên gia đánh giá website Ba-rem. Phân tích dựa DỰ LIỆU CHỈ TRONG khối <du_lieu_quet>. Trả về đúng JSON theo schema. Viết tiếng Việt.' },
      { role: 'user', content: userPrompt }
    ];
    
    // Call AI API
    const controller = new AbortController();
    this.controller = controller;
    
    const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs);
    
    const endpoint = config.endpoint || PART3_CONFIG.endpoint;
    const headers = { 'Content-Type': 'application/json' };
    if (config.apiKey && !headers.authorization) headers.Authorization = 'Bearer ' + config.apiKey;
    
    const body = {
      model: config.model || PART3_CONFIG.model,
      messages: messages,
      temperature: config.temperature || PART3_CONFIG.temperature,
      max_tokens: config.maxTokens || PART3_CONFIG.maxTokens,
      response_format: { type: 'json_object' }
    };
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API lỗi ${response.status}: ${errorText.slice(0, 200)}`);
    }
    
    const responseText = await response.text();
    let parsed;
    
    // Try to parse JSON from response
    try {
      parsed = JSON.parse(responseText);
    } catch (e) {
      // Try to extract JSON from markdown
      const fenced = responseText.match(/```(?:json)?\s*([\s\S]*?)```/i);
      if (fenced && fenced[1]) {
        parsed = JSON.parse(fenced[1]);
      } else {
        throw new Error('AI không trả về JSON hợp lệ');
      }
    }
    
    // Normalize and validate result
    const normalized = this._normalizeResult(parsed, url);
    this.result = normalized;
    
    // Render success
    this.renderSuccess(normalized);
    
    // Dispatch event
    this.container.dispatchEvent(new CustomEvent('part3:complete', {
      detail: { result: normalized }
    }));
    
    return Promise.resolve(normalized);
    
  } catch (error) {
    this.stopStatusRotation();
    
    if (error.name === 'AbortError') {
      this.renderError('Phân tích bị hủy do thời gian chờ.', 'timeout');
    } else if (error.message?.includes('API không trả về JSON')) {
      this.renderError('AI không trả về dữ liệu phân tích hợp lệ. Có thể API key không đúng hoặc endpoint sai.', 'config');
    } else if (error.message?.includes('Missing input data')) {
      // already rendered
    } else {
      this.renderError(error.message || 'Phân tích thất bại. Vui lòng thử lại.', 'error');
    }
    
    this.container.dispatchEvent(new CustomEvent('part3:error', {
      detail: { message: error.message }
    }));
    
    return Promise.reject(error);
  }
};

// Normalize result from AI
Part3Review.prototype._normalizeResult = function(raw, fallbackUrl) {
  const source = raw && typeof raw === 'object' ? raw : {};
  
  // Extract strengths
  const strengths = (source.strengths || [])
    .slice(0, 3)
    .map(item => {
      const criterion = item?.criterion || 'overall';
      return {
        criterion: esc(criterionLabel(criterion)),
        title: esc(item?.title || 'Chưa có tiêu đề'),
        evidence: esc(item?.evidence || 'Không có bằng chứng quan sát'),
        impact: esc(item?.impact || 'Chưa có đánh giá tác động')
      };
    });
  
  // Extract improvements
  const improvements = (source.improvements || [])
    .slice(0, 3)
    .map(item => {
      const criterion = item?.criterion || 'overall';
      const severity = item?.severity || 'medium';
      return {
        criterion: esc(criterionLabel(criterion)),
        severity: SEVERITY_MAP[severity]?.label || SEVERITY_MAP.high.label,
        title: esc(item?.title || 'Chưa có tiêu đề'),
        evidence: esc(item?.evidence || 'Không có bằng chứng quan sát'),
        consequence: esc(item?.consequence || 'Chưa có hệ quả'),
        solution: esc(item?.solution || 'Chưa có giải pháp')
      };
    });
  
  // Limitations
  const limitations = (source.limitations || [])
    .filter(Boolean)
    .map(l => esc(l.trim()))
    .slice(0, 5);
  
  // Evaluated criteria (nhóm của ba-rem, dùng để ghi chú nhóm thiếu dữ liệu)
  const evaluatedCriteria = (source.evaluatedCriteria || [])
    .map(item => {
      const key = item?.key || 'overall';
      return {
        key,
        label: CRITERIA_BY_ID.get(String(key))?.name || key,
        status: item?.status === 'evaluated' ? 'evaluated' : 'limited',
        note: item?.note || ''
      };
    });
  
  // Strategic advice
  const strategicAdvice = esc(source?.strategicAdvice || source?.advice || source?.summary || '');
  
  // URL
  const url = source?.url || fallbackUrl || '';
  
  // Demo flag
  const isDemo = source?.meta?.demo === true;
  
  return {
    url,
    strengths,
    improvements,
    limitations,
    strategicAdvice,
    evaluatedCriteria,
    meta: { demo: isDemo, model: source?.meta?.model || 'gpt-4o-mini' }
  };
};

// Export for global use
if (typeof window !== 'undefined') {
  window.Part3Review = Part3Review;
  window.PART3_CONFIG = PART3_CONFIG;
}

// Export initialize function
function initPart3(container, options) {
  const review = new Part3Review(container, options);
  return review;
}

export { Part3Review, initPart3, PART3_CONFIG, SEVERITY_MAP };