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
      size="sm"
      aria-label="Toggle dark mode"
      className={`p-2 rounded-lg transition-all duration-300 hover:scale-105 border ${themeClasses.button.secondary} ${themeClasses.interactive.focus}`}
    >
      {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </Button>
  );
};

export default ThemeToggleButton;
