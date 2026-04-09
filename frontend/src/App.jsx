import { useEffect, useState } from "react";
import Dashboard from "./pages/Dashboard";
import AuthPage from "./pages/AuthPage";

const defaultSettings = {
  themeMode: "light",
  accentColor: "#2473c1",
  themePreset: "classic",
  timeFormat: "12h",
  timezone: "Asia/Calcutta",
  desktopNotifications: true,
  soundNotifications: false,
  reducedMotion: false,
  highContrast: false,
  signatures: [
    {
      id: "sig-default",
      name: "Workspace signature",
      content: "Best regards,\nWorkspace Team",
      includeBookings: false,
    },
  ],
  defaultSignatureNew: "sig-default",
  defaultSignatureReply: "sig-default",
};

const getStoredSettings = () => {
  try {
    const value = localStorage.getItem("app-settings");
    return value ? { ...defaultSettings, ...JSON.parse(value) } : defaultSettings;
  } catch {
    return defaultSettings;
  }
};

const hexToRgb = (hex) => {
  const normalized = hex.replace("#", "");
  const value =
    normalized.length === 3
      ? normalized
          .split("")
          .map((part) => part + part)
          .join("")
      : normalized;

  const int = Number.parseInt(value, 16);

  return `${(int >> 16) & 255}, ${(int >> 8) & 255}, ${int & 255}`;
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    Boolean(localStorage.getItem("token"))
  );
  const [systemTheme, setSystemTheme] = useState(() =>
    window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
  );
  const [settings, setSettings] = useState(getStoredSettings);

  const theme = settings.themeMode === "system" ? systemTheme : settings.themeMode;

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = (event) => setSystemTheme(event.matches ? "dark" : "light");
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);

  useEffect(() => {
    localStorage.setItem("app-settings", JSON.stringify(settings));
    document.body.classList.toggle("theme-dark", theme === "dark");
    document.body.classList.toggle("reduced-motion", settings.reducedMotion);
    document.body.classList.toggle("high-contrast", settings.highContrast);
    document.body.dataset.themePreset = settings.themePreset;
    document.body.style.setProperty("--accent-color", settings.accentColor);
    document.body.style.setProperty("--accent-rgb", hexToRgb(settings.accentColor));
  }, [settings, theme]);

  const toggleTheme = () => {
    setSettings((current) => ({
      ...current,
      themeMode: theme === "dark" ? "light" : "dark",
    }));
  };

  if (!isAuthenticated) {
    return (
      <AuthPage
        onAuthenticated={() => setIsAuthenticated(true)}
        settings={settings}
        onSettingsChange={setSettings}
        onToggleTheme={toggleTheme}
        theme={theme}
      />
    );
  }

  return (
    <Dashboard
      onToggleTheme={toggleTheme}
      onSettingsChange={setSettings}
      settings={settings}
      theme={theme}
    />
  );
}

export default App;
