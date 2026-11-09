import { useEffect, useRef, useState } from 'react';

/* Vùng đi bộ của Nino: sát GÓC PHẢI trên footer — Nino ở ~90% thời gian tại chân góc,
 * thỉnh thoảng (9–17 giây) mới bước dạo trong một dải rất hẹp [86%..96%] rồi quay về.
 * Mobile hoặc reduced-motion: đứng yên tại "chân đế" mặc định (94%, sát góc phải dưới). */

const LANE_MIN = 86;
const LANE_MAX = 96;
const HOME = 94;

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

export function useMovement({ enabled, canWalk, reducedMotion, setMood }) {
  const [{ x, facing }, setPosition] = useState({ x: HOME, facing: 1 });
  const positionRef = useRef({ x: HOME, facing: 1 });
  const timeoutRef = useRef(0);
  const settleRef = useRef(0);

  useEffect(() => {
    const active = enabled && canWalk && !reducedMotion;
    if (!active) {
      window.clearTimeout(timeoutRef.current);
      window.clearTimeout(settleRef.current);
      positionRef.current = { x: HOME, facing: 1 };
      setPosition({ x: HOME, facing: 1 });
      return undefined;
    }

    let cancelled = false;

    const scheduleWalk = () => {
      if (cancelled) return;
      timeoutRef.current = window.setTimeout(walkNow, randomBetween(9000, 17000));
    };

    const walkNow = () => {
      if (cancelled) return;
      const from = positionRef.current.x;
      let next = randomBetween(LANE_MIN, LANE_MAX);
      // Hạn chế bước quá ngắn (như "run rẩy") và quá dài (mất thời gian).
      if (Math.abs(next - from) < 10) next = from + (next > from ? 12 : -12);
      next = Math.max(LANE_MIN, Math.min(LANE_MAX, next));

      const distance = Math.abs(next - from);
      const walkingTime = Math.min(2400, 450 + distance * 26); // ms

      positionRef.current = { x: next, facing: next < from ? -1 : 1 };
      setPosition(positionRef.current);
      setMood('walking', { destination: next });

      settleRef.current = window.setTimeout(() => {
        if (cancelled) return;
        setMood('idle');
        scheduleWalk();
      }, walkingTime + 650);
    };

    scheduleWalk();

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutRef.current);
      window.clearTimeout(settleRef.current);
    };
  }, [enabled, canWalk, reducedMotion, setMood]);

  useEffect(
    () => () => {
      // Dọn mọi timer còn treo khi unmount.
      window.clearTimeout(timeoutRef.current);
      window.clearTimeout(settleRef.current);
    },
    [],
  );

  return { x, facing };
}
