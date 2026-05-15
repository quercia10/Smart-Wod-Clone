import { useState } from "react";
import MenuScreen from "@/pages/MenuScreen";
import ConfigScreen from "@/pages/ConfigScreen";
import TimerScreen from "@/pages/TimerScreen";
import AccessGate from "@/pages/AccessGate";
import { WorkoutConfig, WorkoutMode } from "@/lib/types";

type Screen = "gate" | "menu" | "config" | "timer";

function getInitialScreen(): Screen {
  try {
    return localStorage.getItem("smartwod_activated") === "true" ? "menu" : "gate";
  } catch {
    return "gate";
  }
}

export default function App() {
  const [screen, setScreen] = useState<Screen>(getInitialScreen);
  const [selectedMode, setSelectedMode] = useState<WorkoutMode | null>(null);
  const [activeConfig, setActiveConfig] = useState<WorkoutConfig | null>(null);

  function handleUnlock() {
    setScreen("menu");
  }

  function handleModeSelect(config: WorkoutConfig) {
    setSelectedMode(config.mode);
    setScreen("config");
  }

  function handleConfigStart(config: WorkoutConfig) {
    setActiveConfig(config);
    setScreen("timer");
  }

  function handleBack() {
    if (screen === "timer") {
      setScreen("menu");
      setActiveConfig(null);
    } else if (screen === "config") {
      setScreen("menu");
      setSelectedMode(null);
    }
  }

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#000", overflow: "hidden" }}>
      {screen === "gate" && <AccessGate onUnlock={handleUnlock} />}
      {screen === "menu" && <MenuScreen onSelect={handleModeSelect} />}
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
    </div>
  );
}
