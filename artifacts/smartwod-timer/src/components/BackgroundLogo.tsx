export default function BackgroundLogo() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 0,
        pointerEvents: "none",
        userSelect: "none",
      }}
    >
      <img
        src="/logo.png"
        alt=""
        style={{
          width: "clamp(200px, 35vw, 520px)",
          height: "auto",
          opacity: 0.08,
          filter: "grayscale(100%)",
        }}
      />
    </div>
  );
}
