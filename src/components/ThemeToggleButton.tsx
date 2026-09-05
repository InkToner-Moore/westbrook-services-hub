import { Button } from "@/components/ui/button";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

// Dark/light theme toggle. Matches the button used in StaffHeader so pages
// with their own custom headers stay consistent.
const ThemeToggleButton = () => {
  const { isDarkMode, toggleTheme, themeClasses } = useTheme();

  return (
    <Button
      onClick={toggleTheme}
      variant="ghost"
      size="icon"
      aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
      className={`h-11 w-11 shrink-0 rounded-lg border transition-colors ${themeClasses.button.secondary} ${themeClasses.interactive.focus}`}
    >
      {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </Button>
  );
};

export default ThemeToggleButton;
