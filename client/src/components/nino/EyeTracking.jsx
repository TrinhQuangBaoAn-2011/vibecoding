import { useEffect, useRef, useState } from 'react';

/* Mắt Nino nhìn theo con trỏ — chạy ở client, chỉ transform nhỏ trên SVG:
 *  - offset chuẩn hoá [-1..1] quanh tâm viewport, clamp chặt (giới hạn biên);
 *  - lerp 10%/frame qua rAF để mắt dừng mềm, không giật theo từng pixel;
 *  - CHẶN trên mobile (touch, không pointer fine) và khi reduced-motion;
 *  - listener passive, rAF + listener được dọn sạch khi unmount. */

const MAX_OFFSET = 0.9; // biên chuẩn hoá — tương đương tối đa ~2.2px trên mắt

export function useEyeTracking({ enabled, reducedMotion }) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const offsetRef = useRef(offset);
  offsetRef.current = offset;

  useEffect(() => {
    const canTrack =
      enabled &&
      !reducedMotion &&
      typeof window !== 'undefined' &&
      window.matchMedia('(min-width: 768px) and (pointer: fine)').matches;

    if (!canTrack) {
      setOffset({ x: 0, y: 0 });
      return undefined;
    }

    const target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };
    let raf = 0;

    const handleMove = (event) => {
      const width = window.innerWidth || 1;
      const height = window.innerHeight || 1;
      const x = ((event.clientX / width) * 2 - 1) * MAX_OFFSET;
      const y = ((event.clientY / height) * 2 - 1) * MAX_OFFSET * 0.55; // nhìn ngang nhiều hơn dọc
      target.x = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, x));
      target.y = Math.max(-MAX_OFFSET * 0.5, Math.min(MAX_OFFSET * 0.5, y));
    };

    const tick = () => {
      current.x += (target.x - current.x) * 0.1;
      current.y += (target.y - current.y) * 0.1;

      const previous = offsetRef.current;
      if (
        Math.abs(current.x - previous.x) > 0.002 ||
        Math.abs(current.y - previous.y) > 0.002
      ) {
        const next = { x: current.x, y: current.y };
        offsetRef.current = next;
        setOffset(next);
      }

      raf = window.requestAnimationFrame(tick);
    };

    window.addEventListener('pointermove', handleMove, { passive: true });
    raf = window.requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.cancelAnimationFrame(raf);
    };
  }, [enabled, reducedMotion]);

  return offset;
}
