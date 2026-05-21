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
        overflow: "hidden",
      }}
    >
      <img
        src={logoUrl}
        alt=""
        style={{
          width: "100vw",
          height: "100vh",
          objectFit: "cover",
          opacity: 0.35,
          filter: "brightness(1.6) saturate(2.0)",
          mixBlendMode: "screen",
        }}
      />
    </div>
  );
}
