import { useState } from "react";
import MenuScreen from "@/pages/MenuScreen";
import ConfigScreen from "@/pages/ConfigScreen";
import TimerScreen from "@/pages/TimerScreen";
import AccessGate from "@/pages/AccessGate";
import TrialBanner from "@/pages/TrialBanner";
import { checkLicense, markTrialUsed } from "@/lib/license";
import { WorkoutConfig, WorkoutMode } from "@/lib/types";

type Screen = "gate" | "gate-expired" | "trial-banner" | "menu" | "config" | "timer";

function getInitialScreen(): Screen {
  const status = checkLicense();
  if (status === "lifetime") return "menu";
  if (status === "trial-active") return "trial-banner";
  if (status === "trial-expired") {
    markTrialUsed();
    return "gate-expired";
  }
  return "gate";
}

export default function App() {
  const [screen, setScreen] = useState<Screen>(getInitialScreen);
  const [selectedMode, setSelectedMode] = useState<WorkoutMode | null>(null);
  const [activeConfig, setActiveConfig] = useState<WorkoutConfig | null>(null);

  function handleUnlock(type: "trial" | "lifetime") {
    if (type === "trial") {
      setScreen("trial-banner");
    } else {
      setScreen("menu");
    }
  }

  function handleTrialBannerDone() {
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
    <div style={{ width: "100vw", height: "100vh", background: "#121212", overflow: "hidden", position: "relative" }}>
      <div style={{ position: "relative", width: "100%", height: "100%" }}>
        {screen === "gate" && (
          <AccessGate mode="normal" onUnlock={handleUnlock} />
        )}
        {screen === "gate-expired" && (
          <AccessGate mode="expired" onUnlock={handleUnlock} />
        )}
        {screen === "trial-banner" && (
          <TrialBanner onDone={handleTrialBannerDone} />
        )}
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
    </div>
  );
}
