import { useState } from "react";
import MenuScreen from "@/pages/MenuScreen";
import ConfigScreen from "@/pages/ConfigScreen";
import TimerScreen from "@/pages/TimerScreen";
import { WorkoutConfig, WorkoutMode } from "@/lib/types";

type Screen = "menu" | "config" | "timer";

export default function App() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [selectedMode, setSelectedMode] = useState<WorkoutMode | null>(null);
  const [activeConfig, setActiveConfig] = useState<WorkoutConfig | null>(null);

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
