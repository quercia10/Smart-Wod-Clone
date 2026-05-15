const logoUrl = `${import.meta.env.BASE_URL}logo.png`.replace(/\/+/g, "/");

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
        src={logoUrl}
        alt=""
        style={{
          width: "clamp(180px, 42vmin, 520px)",
          height: "auto",
          maxWidth: "85vw",
          maxHeight: "85vh",
          objectFit: "contain",
          opacity: 0.12,
          filter: "brightness(3) saturate(0)",
          mixBlendMode: "screen",
        }}
      />
    </div>
  );
}
