import { useEffect, useRef, useState } from 'react';
import { RotateCcw, Send, Sparkles } from 'lucide-react';
import { ApiError, requestNinoChat } from '../lib/api.js';

const GREETING =
  'Xin chào! Mình là Nino — trợ lý AI hỏi-đáp của WEBCHECK AI. Mình chỉ trả lời dựa trên dữ liệu phân tích của website này (60 tiêu chí v2.0), không tự quét web và không tính lại điểm. Bạn muốn hỏi gì?';

const SUGGESTIONS = [
  'Website đang đạt bao nhiêu điểm?',
  'Điểm nào yếu nhất?',
  'Nên sửa điều gì trước?',
];

const emptyConversation = () => [{ role: 'assistant', content: GREETING, kind: 'greeting' }];

export function NinoChat({ analysis = null }) {
  const [messages, setMessages] = useState(emptyConversation);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(false);
  const listRef = useRef(null);

  // Đổi phiên phân tích → hội thoại Nino bắt đầu lại cho đúng ngữ cảnh.
  useEffect(() => {
    setMessages(emptyConversation());
    setDraft('');
  }, [analysis?.analysisId, analysis?.analyzedAt]);

  // Tự cuộn xuống tin nhắn mới nhất (cuộn BÊN TRONG khung chat, trang không dài ra).
  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages, pending]);

  if (!analysis) return null;

  const send = async (rawText) => {
    const question = String(rawText || '').trim();
    if (!question || pending) return;
    setDraft('');

    // Lịch sử gửi kèm chỉ gồm các lượt đã có câu trả lời thật (bỏ lời chào, tin lỗi),
    // bó 8 mục cuối — đúng shape server chấp nhận.
    const history = messages
      .filter((m) => m.kind !== 'greeting' && m.kind !== 'error' && m.kind !== 'pending')
      .slice(-8)
      .map((m) => ({ role: m.role, content: m.content }));

    setMessages((prev) => [
      ...prev,
      { role: 'user', content: question },
      { role: 'assistant', content: '', kind: 'pending' },
    ]);
    setPending(true);

    try {
      const chat = await requestNinoChat({
        analysisId: analysis.analysisId || undefined,
        analysis,
        question,
        history,
      });
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = {
          role: 'assistant',
          content: chat.reply,
          kind: 'reply',
          source: chat.source || null,
          notice: chat.notice || '',
        };
        return next;
      });
    } catch (error) {
      const text =
        error instanceof ApiError
          ? error.message
          : 'Nino tạm thời không trả lời được. Bạn thử lại sau ít phút nhé.';
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = { role: 'assistant', content: text, kind: 'error' };
        return next;
      });
    } finally {
      setPending(false);
    }
  };

  return (
    <section>
      <div className="card p-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-600">
              <Sparkles className="h-4.5 w-4.5" />
            </span>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Trợ lý AI hỏi-đáp · Nino
              </p>
              <p className="mt-0.5 text-sm font-semibold text-foreground">
                Hỏi Nino về website này
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMessages(emptyConversation())}
            disabled={pending}
            className="btn-ghost btn-sm shrink-0 disabled:opacity-50"
            title="Bắt đầu lại hội thoại"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Làm mới
          </button>
        </div>

        {/* Khung hội thoại — cuộn nội bộ, không đẩy trang dài ra */}
        <div
          ref={listRef}
          className="no-print mt-4 max-h-72 space-y-3 overflow-y-auto pr-1"
        >
          {messages.map((message, index) => {
            if (message.kind === 'pending') {
              return (
                <div key={index} className="flex items-start gap-2">
                  <div className="rounded-2xl rounded-tl-md bg-neutral-50/80 px-3.5 py-2.5 text-sm text-muted-foreground ring-1 ring-inset ring-ink-200/60">
                    <span className="inline-flex gap-1">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-400 [animation-delay:0ms]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-400 [animation-delay:150ms]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-400 [animation-delay:300ms]" />
                    </span>
                  </div>
                </div>
              );
            }

            if (message.role === 'user') {
              return (
                <div key={index} className="flex justify-end">
                  <p className="max-w-[85%] whitespace-pre-line rounded-2xl rounded-tr-md bg-brand-600 px-3.5 py-2.5 text-sm leading-relaxed text-white">
                    {message.content}
                  </p>
                </div>
              );
            }

            return (
              <div key={index} className="space-y-1.5">
                <p className="max-w-[95%] whitespace-pre-line rounded-2xl rounded-tl-md bg-neutral-50/80 px-3.5 py-2.5 text-sm leading-relaxed text-ink-700 ring-1 ring-inset ring-ink-200/60">
                  {message.content}
                </p>
                {message.kind === 'reply' && message.source === 'rules' && message.notice && (
                  <p className="max-w-[95%] rounded-xl bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-700">
                    {message.notice}
                  </p>
                )}
                {message.kind === 'error' && (
                  <p className="max-w-[95%] rounded-xl bg-rose-50 px-3 py-2 text-[11px] leading-relaxed text-rose-600">
                    Không gửi được câu hỏi này tới Nino.
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Gợi ý nhanh — chỉ hiện khi hội thoại còn lại lời chào */}
        {!pending && messages.length <= 2 && (
          <div className="no-print mt-3 flex flex-wrap gap-2">
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => send(suggestion)}
                className="rounded-xl bg-ink-100 px-3 py-1.5 text-xs font-medium text-ink-600 transition hover:bg-brand-50 hover:text-brand-700"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

        {/* Ô nhập câu hỏi */}
        <form
          className="no-print mt-4 flex items-center gap-2 border-t border-ink-200/80 pt-3"
          onSubmit={(event) => {
            event.preventDefault();
            send(draft);
          }}
        >
          <input
            type="text"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Hỏi Nino về báo cáo phân tích này…"
            maxLength={500}
            disabled={pending}
            className="min-w-0 flex-1 rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={pending || !draft.trim()}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white transition hover:bg-brand-700 active:scale-[0.97] disabled:opacity-50"
            title="Gửi câu hỏi cho Nino"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>

        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
          Nino chỉ đọc kết quả phân tích thuộc báo cáo này (60 tiêu chí v2.0), không tự quét web, không
          tính lại điểm và không hứa hẹn thứ hạng tìm kiếm. Mỗi câu hỏi dùng 1 lượt AI — tối đa 40 lượt
          mỗi 10 phút.
        </p>
      </div>
    </section>
  );
}
