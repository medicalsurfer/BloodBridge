"use client";

import { useLayoutEffect, useRef } from "react";

/*
  A figure that counts up to its value when it first appears, so a dashboard
  opens with its numbers arriving rather than sitting there. Only whole
  numbers count ("12", "1,250"); anything else — "Not set", "3 Oct" — is shown
  as it is. The final value is what renders on the server and without
  JavaScript, and reduced motion skips straight to it.

  The count writes to the DOM directly instead of through state, so the
  animation costs no re-renders.
*/
export function CountUp({ value, duration = 900 }: { value: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node || !/^\d{1,3}(,\d{3})*$|^\d+$/.test(value)) return;

    const target = Number(value.replace(/,/g, ""));
    if (target === 0 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const format = (n: number) => n.toLocaleString("en-GB");
    const start = performance.now();
    let frame = 0;

    node.textContent = "0";
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // Exponential ease-out: quick at first, settling onto the number.
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      node.textContent = format(Math.round(target * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      node.textContent = value;
    };
  }, [value, duration]);

  return <span ref={ref}>{value}</span>;
}
