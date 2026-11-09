import { useEffect, useState } from 'react';
import { useNino } from './NinoProvider.jsx';
import { CharacterRenderer } from './CharacterRenderer.jsx';
import { useEyeTracking } from './EyeTracking.jsx';
import { useMovement } from './MovementController.jsx';
import './nino.css';

function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (event) => setReduced(event.matches);
    query.addEventListener?.('change', onChange);
    return () => query.removeEventListener?.('change', onChange);
  }, []);

  return reduced;
}

/* Mascot chỉ "công khai" khi trang ở đỉnh (khu hero — khoảng trống đáy phải).
 * Người dùng cuộn xuống để đọc/làm việc → Nino trượt khỏi màn hình, không bao
 * giờ đè nội dung_phá đang đọc. Chỉ transform, transition 200ms, listener
 * passive và được gỡ khi unmount. */
const SCROLL_HIDE_THRESHOLD = 32;

function useScrollHide() {
  const [hidden, setHidden] = useState(() => window.scrollY > SCROLL_HIDE_THRESHOLD);

  useEffect(() => {
    const onScroll = () => setHidden(window.scrollY > SCROLL_HIDE_THRESHOLD);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return hidden;
}

/* Nino hoàn chỉnh — mỗi tầng một việc:
 *  - useMovement: vị trí + dải đi bộ (desktop, tắt khi reduced-motion);
 *  - useEyeTracking: tròng mắt theo con trỏ (desktop + pointer fine);
 *  - nút mascot: bấm → reacting; chỉ vùng mascot nhận pointer, không chặn UI. */
export function Nino() {
  const { enabled, mood, setMood } = useNino();
  const reducedMotion = useReducedMotion();
  const hidden = useScrollHide();
  const [canWalk, setCanWalk] = useState(
    () => window.matchMedia('(min-width: 768px)').matches,
  );
  const pupil = useEyeTracking({ enabled, reducedMotion });
  const { x, facing } = useMovement({ enabled, canWalk, reducedMotion, setMood });

  useEffect(() => {
    const query = window.matchMedia('(min-width: 768px)');
    const onChange = (event) => setCanWalk(event.matches);
    query.addEventListener?.('change', onChange);
    return () => query.removeEventListener?.('change', onChange);
  }, []);

  if (!enabled) return null;

  const handleInteract = () => {
    setMood('reacting', { trigger: 'click' });
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 select-none">
      <div
        className="absolute bottom-12 h-24 w-full"
        style={{ transform: hidden ? 'translateY(115%)' : 'translateY(0)', transition: 'transform 220ms ease' }}
      >
        <div
          className="absolute bottom-0 w-[64px] md:w-[92px]"
          style={{ left: `${x}%`, transform: 'translateX(-50%)' }}
        >
          <button
            type="button"
            onClick={handleInteract}
            className="pointer-events-auto -m-2 cursor-pointer rounded-full p-2 outline-none transition-transform duration-150 hover:scale-105 active:scale-95 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            aria-label="Nino — trợ lý ảo của WEBCHECK AI (bấm để chào)"
          >
            <CharacterRenderer mood={mood} pupil={pupil} facing={facing} />
          </button>
        </div>
      </div>
    </div>
  );
}
