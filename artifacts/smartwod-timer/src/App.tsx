import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import MenuScreen from "@/pages/MenuScreen";
import ConfigScreen from "@/pages/ConfigScreen";
import TimerScreen from "@/pages/TimerScreen";
import { WorkoutConfig, WorkoutMode } from "@/lib/types";

type Screen = "menu" | "config" | "timer";

const SCREEN_ORDER: Screen[] = ["menu", "config", "timer"];

const variants = {
  enter: (dir: number) => ({
    opacity: 0,
    x: dir >= 0 ? 40 : -40,
    scale: 0.98,
  }),
  center: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { duration: 0.38, ease: [0.25, 0.46, 0.45, 0.94] as any },
  },
  exit: (dir: number) => ({
    opacity: 0,
    x: dir >= 0 ? -40 : 40,
    scale: 0.98,
    transition: { duration: 0.28, ease: [0.55, 0, 0.1, 1] as any },
  }),
};

export default function App() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [prevScreen, setPrevScreen] = useState<Screen>("menu");
  const [selectedMode, setSelectedMode] = useState<WorkoutMode | null>(null);
  const [activeConfig, setActiveConfig] = useState<WorkoutConfig | null>(null);

  const direction = SCREEN_ORDER.indexOf(screen) - SCREEN_ORDER.indexOf(prevScreen);

  function navigate(next: Screen) {
    setPrevScreen(screen);
    setScreen(next);
  }

  function handleModeSelect(config: WorkoutConfig) {
    setSelectedMode(config.mode);
    navigate("config");
  }

  function handleConfigStart(config: WorkoutConfig) {
    setActiveConfig(config);
    navigate("timer");
  }

  function handleBack() {
    if (screen === "timer") {
      navigate("menu");
    } else if (screen === "config") {
      setSelectedMode(null);
      navigate("menu");
    }
  }

  /* ── TV / Android back button (MiBox3, Fire TV, ecc.) ──
     Il tasto Back fisico del telecomando gestisce popstate. */
  const handleBackRef = useRef(handleBack);
  handleBackRef.current = handleBack;

  useEffect(() => {
    if (screen === "config" || screen === "timer") {
      window.history.pushState({ appScreen: screen }, "");
    }
  }, [screen]);

  useEffect(() => {
    function onPopState() {
      handleBackRef.current();
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#121212", overflow: "hidden", position: "relative" }}>
      <AnimatePresence initial={false} custom={direction} mode="sync">
        <motion.div
          key={screen}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        >
          {screen === "menu" && (
            <MenuScreen onSelect={handleModeSelect} />
          )}
          {screen === "config" && selectedMode && (
            <ConfigScreen
              mode={selectedMode}
              onStart={handleConfigStart}
              onBack={handleBack}
            />
          )}
          {screen === "timer" && activeConfig && (
            <TimerScreen config={activeConfig} onBack={handleBack} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
