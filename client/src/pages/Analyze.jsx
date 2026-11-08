import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  Bot,
  CheckCircle2,
  History,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Target,
  Timer,
  TrendingUp,
} from 'lucide-react';
import { UrlForm } from '../components/UrlForm.jsx';
import { ProgressSteps } from '../components/ProgressSteps.jsx';
import { AnalysisReport } from '../components/AnalysisReport.jsx';
import { useAnalyze } from '../hooks/useAnalyze.js';
import { useHistory } from '../context/HistoryContext.jsx';
import { buildComparison } from '../lib/comparison.js';
import { initPart3, Part3Review } from '../lib/part3Review.js';
import { WEBCHECK } from '../lib/webcheckClient.js';

const DELIVERABLES = [
  { icon: TrendingUp, title: 'Điểm tổng kết trên thang 100', description: 'Chuẩn hóa sau khi loại tiêu chí Không xác định hoặc Không áp dụng.' },
  { icon: Target, title: '60 tiêu chí kèm bằng chứng', description: 'Mỗi tiêu chí có trọng số theo mức ưu tiên, giá trị ghi nhận, nhận định và đề xuất cụ thể.' },
  { icon: Bot, title: 'Nhận xét AI bằng tiếng Việt', description: 'Tối đa 3 điểm mạnh và 3 việc cần cải thiện, ưu tiên theo trọng số P0–P3.' },
  { icon: History, title: 'Tự động lưu vào lịch sử', description: 'So sánh điểm giữa các lần kiểm tra và xem lại báo cáo bất cứ lúc nào.' },
];

export function Analyze() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialUrl = searchParams.get('url') || '';
  const { records, addRecord } = useHistory();
  const {
    status,
    analysis,
    review,
    aiError,
    aiSkipped,
    error,
    progress,
    run,
    retryAi,
    cancel,
    reset,
  } = useAnalyze();

  const [lastUrl, setLastUrl] = useState(initialUrl);
  const autoRunRef = useRef(false);

  useEffect(() => {
    if (autoRunRef.current || !initialUrl) return;
    autoRunRef.current = true;
    setLastUrl(initialUrl);
    run(initialUrl);
    navigate('/analyze', { replace: true });
  }, [initialUrl, run, navigate]);

  useEffect(() => {
    if (!analysis) return;
    addRecord(analysis, review);
  }, [analysis, review, addRecord]);

  const comparison = useMemo(
    () => (analysis ? buildComparison(analysis, records) : null),
    [analysis, records],
  );

  const saved = Boolean(
    analysis &&
      records.some((record) => record.id === (analysis.analysisId || analysis.id)),
  );

  let aiStatus = 'idle';
  if (status === 'ai-pending') aiStatus = 'pending';
  else if (aiError) aiStatus = 'error';
  else if (review) aiStatus = 'done';
  else if (aiSkipped) aiStatus = 'skipped';

  const handleSubmit = (url) => {
    setLastUrl(url);
    run(url);
  };

  const handleReset = () => {
    reset();
    setLastUrl('');
  };

  const handleReanalyze = () => {
    const target = analysis?.requestedUrl || analysis?.finalUrl || lastUrl;
    if (!target) return;
    setLastUrl(target);
    run(target);
  };

  // Initialize Part 3 Review
  useEffect(() => {
    const container = document.querySelector('#part3-review-container');
    if (!container) return undefined;
    const part3 = initPart3(container, {
      endpoint: '/api/ai-review',
      model: 'gpt-4o-mini',
    });

    if (analysis && review) {
      // Nhận xét đã có từ backend (AI hoặc bộ quy tắc) → hiển thị trực tiếp
      // trên panel Phần 3, không gọi lại API để tránh tạo thêm lượt AI.
      part3.analyzeFromReport({
        url: analysis.requestedUrl || analysis.url || analysis.finalUrl,
        analysis,
        review,
      });
    } else if (analysis) {
      part3.renderWaiting('Điểm đã hoàn tất — nhận xét đang được tổng hợp…');
    } else {
      part3.renderIdle();
    }

    const onComplete = (e) => console.debug('Part 3 analysis complete', e.detail);
    const onError = (e) => console.debug('Part 3 analysis error', e.detail);
    container.addEventListener('part3:complete', onComplete);
    container.addEventListener('part3:error', onError);
    return () => {
      container.removeEventListener('part3:complete', onComplete);
      container.removeEventListener('part3:error', onError);
      part3.stopStatusRotation?.();
    };
  }, [analysis, review]);

  // Initialize WebCheck client-side checking
  useEffect(() => {
    const webcheckContainer = document.querySelector('#webcheck-checklist-container');
    if (!webcheckContainer || !initialUrl) return;
    
    // Normalize URL
    let normalizedUrl = initialUrl;
    try {
      if (!/^https?:\/\//i.test(normalizedUrl)) normalizedUrl = 'https://' + normalizedUrl;
    } catch {
      // Invalid URL, skip WebCheck
      return;
    }
    
    // Set busy state
    const button = document.querySelector('button[type="submit"]');
    if (button) button.disabled = true;
    
    fetch('/api/fetch?url=' + encodeURIComponent(normalizedUrl) + '&soft=1', {
      headers: { Accept: 'application/json' },
    })
    .then((res) => {
      if (!res.ok) throw new Error('Network response was not ok');
      return res.json();
    })
    .then((data) => {
      // Run WebCheck client-side analysis
      const result = WEBCHECK.runChecks(data.html, {
        inputUrl: normalizedUrl,
        finalUrl: data.finalUrl || normalizedUrl,
        statusCode: data.statusCode,
        elapsedMs: data.elapsedMs,
      });
      
      // Render checklist
      WEBCHECK.renderChecklist(result, '#webcheck-checklist-container');
      
      // Show summary
      const summary = WEBCHECK.getSummary(result);
      const summaryEl = document.querySelector('#webcheck-summary');
      if (summaryEl) {
        summaryEl.innerHTML = `
          <div class="p-3 rounded-xl border border-emerald-200 bg-emerald-50/30 text-sm text-emerald-700">
            <strong>Tổng kết WebCheck:</strong> ${summary.passed}/${summary.total} đạt,
            ${summary.warns}/${summary.total} cảnh báo, ${summary.fails}/${summary.total} chưa đạt
          </div>
        `;
      }
      
      // Re-enable button
      if (button) button.disabled = false;
    })
    .catch((err) => {
      console.error('WebCheck analysis error:', err);
      if (button) button.disabled = false;
    });
  }, [initialUrl]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Phân tích trực tiếp</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">
            Phân tích website
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-ink-500">
            Nhập URL công khai để backend tải HTML thật, chấm đủ 60 tiêu chí theo trọng số và tạo
            nhận xét tiếng Việt. Kết quả được lưu tự động vào lịch sử trình duyệt.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-ink-500">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 ring-1 ring-inset ring-ink-200">
            <ShieldCheck className="h-3.5 w-3.5 text-brand-500" />
            Chặn SSRF nội bộ
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 ring-1 ring-inset ring-ink-200">
            <Timer className="h-3.5 w-3.5 text-brand-500" />
            Giới hạn 15 giây
          </span>
        </div>
      </header>

      <div className="card p-4 sm:p-5">
        <UrlForm
          onSubmit={handleSubmit}
          loading={status === 'analyzing'}
          defaultValue={lastUrl}
          submitLabel="Phân tích"
        />
      </div>

      {error && (
        <div className="flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50/80 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-rose-600 shadow-sm">
              <AlertCircle className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-bold text-rose-800">Không thể hoàn tất phân tích</p>
              <p className="mt-1 text-sm leading-relaxed text-rose-700">{error.message}</p>
              {error.code && (
                <p className="mt-1.5 font-mono text-[10px] uppercase tracking-wide text-rose-500">
                  Mã lỗi: {error.code}
                </p>
              )}
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            {lastUrl && (
              <button
                type="button"
                onClick={() => run(lastUrl)}
                className="btn-secondary btn-sm"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Thử lại
              </button>
            )}
            <button type="button" onClick={handleReset} className="btn-ghost btn-sm">
              Xóa trạng thái
            </button>
          </div>
        </div>
      )}

      {(status === 'analyzing' || (status === 'error' && progress.some((step) => step.status !== 'pending'))) && (
        <ProgressSteps steps={progress} status={status} onCancel={cancel} />
      )}

      {analysis && (
        <AnalysisReport
          analysis={analysis}
          review={review}
          aiStatus={aiStatus}
          aiError={aiError}
          onRetryAi={retryAi}
          comparison={comparison}
          onReanalyze={handleReanalyze}
          saved={saved}
        />
      )}

      {!analysis && status === 'idle' && (
        <div className="grid gap-5 lg:grid-cols-2">
          <section className="card p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <Sparkles className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-base font-bold text-ink-900">Sẵn sàng phân tích</h2>
                <p className="mt-1 text-sm leading-relaxed text-ink-500">
                  Nhập URL ở phía trên hoặc chọn một ví dụ. Hệ thống sẽ thực hiện các bước sau trên
                  dữ liệu thật của website.
                </p>
              </div>
            </div>

            <ol className="mt-5 space-y-3">
              {[
                'Kiểm tra URL, giao thức, cổng và chặn địa chỉ nội bộ.',
                'Kết nối HTTPS/HTTP, theo dõi chuyển hướng và tải tối đa 3 MB HTML.',
                'Phân tích 60 tiêu chí bằng bộ máy WEBCHECK v2.0, tính điểm theo trọng số P0–P3.',
                'Gửi dữ liệu đã lọc sang AI hoặc dùng bộ quy tắc dự phòng minh bạch.',
              ].map((item, index) => (
                <li key={item} className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink-900 text-[10px] font-bold text-white">
                    {index + 1}
                  </span>
                  <span className="text-sm leading-relaxed text-ink-600">{item}</span>
                </li>
              ))}
            </ol>

            <div className="mt-5 flex items-start gap-2 rounded-xl border border-emerald-100 bg-emerald-50/60 px-3.5 py-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <p className="text-xs leading-relaxed text-emerald-800">
                API key AI chỉ nằm ở backend. Frontend không bao giờ nhận hoặc lưu khóa bí mật.
              </p>
            </div>

            <section className="card p-5 sm:p-6">
              <h2 className="text-base font-bold text-ink-900">Bạn sẽ nhận được</h2>
              <p className="mt-1 text-sm leading-relaxed text-ink-500">
                Một báo cáo đầy đủ, có thể sao chép hoặc in trực tiếp.
              </p>
              <ul className="mt-4 space-y-3">
                {DELIVERABLES.map((item) => (
                  <li key={item.title} className="flex items-start gap-3 rounded-xl border border-ink-100 bg-ink-50/50 p-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-brand-600 shadow-sm">
                      <item.icon className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-bold text-ink-900">{item.title}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-ink-500">{item.description}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => navigate('/history')}
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-brand-700 hover:text-brand-800"
              >
                Xem lịch sử phân tích
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </section>
          </section>

          <section className="card p-5 sm:p-6">
            <h2 className="text-base font-bold text-ink-900">Phần 3: AI đánh giá & nhận xét</h2>
            <p className="mt-1 text-sm leading-relaxed text-ink-500">
              Dữ liệu quét website sẽ được gửi tới AI để phân tích 3 điểm mạnh và 3 điểm cần cải thiện.
            </p>
            <div id="part3-review-container" className="mt-4 min-h-[160px] rounded-xl border border-indigo-200 bg-indigo-50/50 p-4">
              <p className="text-sm text-indigo-600">Đang khởi tạo panel Phần 3…</p>
            </div>
          </section>
        </div>
      )}

      {!analysis && status === 'ai-pending' && (
        <div className="flex items-center gap-3 rounded-2xl border border-brand-100 bg-brand-50/60 px-4 py-3 text-sm text-brand-700">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          Điểm số đã sẵn sàng. AI đang hoàn thiện phần nhận xét…
        </div>
      )}

      {/* WebCheck client-side quick check */}
      <section className="grid gap-5 lg:grid-cols-2">
        <section className="card p-5 sm:p-6">
          <h2 className="text-base font-bold text-ink-900">Phần 1: Kiểm tra nhanh ngay trên trình duyệt</h2>
          <p className="mt-1 text-sm leading-relaxed text-ink-500">
            60 hạng mục nền tảng chấm nhanh theo 4 trạng thái (chưa tính điểm tổng): tiêu đề, mô tả,
            viewport, favicon, hình ảnh alt, liên kết, robots.txt, sitemap.xml và tốc độ tải.
          </p>
          <div id="webcheck-checklist-container" className="mt-4 min-h-[120px] rounded-xl border border-indigo-200 bg-indigo-50/30 p-4">
            <p className="text-sm text-indigo-600">Đang kiểm tra URL — vui lòng đợi trong giây lát…</p>
          </div>
          <div id="webcheck-summary" className="mt-3 rounded-xl border border-indigo-200 bg-indigo-50/30 p-2 text-sm text-indigo-600"></div>
        </section>

        <section className="card p-5 sm:p-6">
          <h2 className="text-base font-bold text-ink-900">Phần 2: Ba-rem chấm điểm WEBCHECK AI</h2>
          <p className="mt-1 text-sm leading-relaxed text-ink-500">
            Bộ máy v2.0 chấm đủ 60 tiêu chí theo trọng số mức ưu tiên: P0 đắt nhất (6 điểm thô) →
            P1 (4) → P2 (2) → P3 (1), chuẩn hóa về thang 100 và loại tiêu chí Không xác định khỏi
            mẫu số. Báo cáo đầy đủ kèm bằng chứng hiển thị ngay sau khi phân tích hoàn tất.
          </p>
        </section>
      </section>
    </div>
  );
}