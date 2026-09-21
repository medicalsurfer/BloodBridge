/*
  Backdrop for the standalone auth pages (forgot password, reset password).

  These pages are a single card on an otherwise empty page, and a near-white
  ground left the card floating in a void with nothing to sit on. The backdrop
  gives it a place: a warm tinted field a clear step darker than the card, so
  the card reads as lifted rather than merged into the page.

  Three quiet layers, in depth order:
    1. a warm garnet-tinted ground, radially lighter behind the card
    2. concentric hairline rings — the same motif as the landing hero's
       network diagram, so the auth pages belong to the same world
    3. two slow drifting glows, borrowed from the landing panels

  Everything is decorative and marked aria-hidden. Nothing here carries
  meaning, so a screen reader is told to skip all of it, and the drift stops
  under prefers-reduced-motion via the global rule in globals.css.
*/
export function AuthBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Lighter directly behind the card, deeper at the edges — a vignette in
          reverse, which is what makes a centred card feel placed. */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_72%_62%_at_50%_42%,oklch(99.5%_0.004_30),oklch(95%_0.014_22)_62%,oklch(89.5%_0.026_14))]" />

      {/* Concentric rings, centred on the card. */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        {[320, 520, 740, 980, 1240].map((size, index) => (
          <div
            key={size}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-garnet/[0.1]"
            style={{
              width: size,
              height: size,
              // Outer rings fade, so the field does not read as a target.
              opacity: 1 - index * 0.16,
            }}
          />
        ))}
      </div>

      {/* A fine dot grid for texture, faded out towards the edges so it never
          forms a hard boundary. */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(oklch(27.1% 0.105 12.094 / 0.16) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
          maskImage:
            "radial-gradient(ellipse 60% 52% at 50% 44%, transparent 18%, black 88%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 60% 52% at 50% 44%, transparent 18%, black 88%)",
        }}
      />

      <div
        className="absolute -top-32 -left-24 h-[460px] w-[460px] rounded-full bg-rose/[0.1] blur-3xl"
        style={{ animation: "var(--animate-drift)" }}
      />

      <div
        className="absolute -right-28 -bottom-32 h-[420px] w-[420px] rounded-full bg-ember/[0.09] blur-3xl"
        style={{ animation: "var(--animate-drift)", animationDelay: "-9s" }}
      />

      <div
        className="absolute top-1/3 right-1/4 h-[300px] w-[300px] rounded-full bg-plum/[0.07] blur-3xl"
        style={{ animation: "var(--animate-drift)", animationDelay: "-14s" }}
      />
    </div>
  );
}
