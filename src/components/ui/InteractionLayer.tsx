"use client";

import { useEffect } from "react";

/*
  One pointer listener for the whole app. As the mouse moves, the card under
  it (anything marked .bb-tile or .bb-spot) is told where the pointer is, and
  its ::after glow in globals.css follows it. One listener, throttled to the
  frame rate, instead of a handler on every card; touch screens, which have no
  hover, never trigger it.
*/
export function InteractionLayer() {
  useEffect(() => {
    let frame = 0;
    let last: PointerEvent | null = null;

    const update = () => {
      frame = 0;
      if (!last) return;
      const target = (last.target as Element | null)?.closest?.(".bb-tile, .bb-spot") as HTMLElement | null;
      if (!target) return;
      const box = target.getBoundingClientRect();
      target.style.setProperty("--mx", `${last.clientX - box.left}px`);
      target.style.setProperty("--my", `${last.clientY - box.top}px`);
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      last = event;
      if (!frame) frame = requestAnimationFrame(update);
    };

    document.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      document.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}
