"use client";

import { useEffect } from "react";

/*
  Scroll reveal for the landing page.

  The hidden state lives in CSS behind `.js`, which a beforeInteractive script
  in the root layout sets before first paint — so the page renders complete
  when JavaScript is disabled or still loading, and there is no flash of
  hidden content when it is not.

  One observer serves the whole page, and each element unobserves itself once
  it has appeared: a reveal is a one-way door, not a scroll-linked effect.
*/
export function Reveal() {
  useEffect(() => {
    const nodes = document.querySelectorAll<HTMLElement>("[data-reveal]");

    const reveal = (node: HTMLElement) => node.classList.add("is-visible");

    if (
      !("IntersectionObserver" in window) ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      nodes.forEach(reveal);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          reveal(entry.target as HTMLElement);
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.08 },
    );

    nodes.forEach((node) => observer.observe(node));

    return () => observer.disconnect();
  }, []);

  return null;
}
