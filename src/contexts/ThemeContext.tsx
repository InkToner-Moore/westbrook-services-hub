import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface ThemeContextType {
  isDarkMode: boolean;
  toggleTheme: () => void;
  themeClasses: any;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Check localStorage for saved preference, default to false (light mode)
    const saved = localStorage.getItem('staff-theme');
    return saved !== null ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    // Save theme preference to localStorage
    localStorage.setItem('staff-theme', JSON.stringify(isDarkMode));

    // Drive Tailwind's `dark` variant and the shadcn CSS variables from the
    // same state. Without this, every Radix portal surface (Select menus,
    // dialogs, toasts) keeps the light `:root` variables no matter the theme.
    const root = document.documentElement;
    root.classList.toggle('dark', isDarkMode);
    // Makes native controls (scrollbars, date pickers) follow the theme too.
    root.style.colorScheme = isDarkMode ? 'dark' : 'light';
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  // Both themes are built on the same slate scale so surfaces stay in the same
  // family across a toggle. The light theme layers page (slate-100) < card
  // (white) < nested card (slate-100) so panels separate by value, not just by
  // a hairline border — the previous stone-on-stone palette washed together.
  const themeClasses = {
    background: isDarkMode
      ? 'bg-slate-900'
      : 'bg-slate-100',

    backgroundFloating: {
      // Kept very faint in light mode: mix-blend-multiply over a bright page
      // turns saturated blobs into muddy patches that fight the content.
      purple: isDarkMode ? 'bg-purple-500/20 opacity-30' : 'bg-purple-200/40 opacity-25',
      blue: isDarkMode ? 'bg-blue-500/20 opacity-30' : 'bg-blue-200/40 opacity-25',
      indigo: isDarkMode ? 'bg-indigo-500/20 opacity-30' : 'bg-indigo-200/40 opacity-25',
    },

    header: isDarkMode
      ? 'bg-slate-800 border-slate-700 backdrop-blur-xl'
      : 'bg-white/95 border-slate-200 backdrop-blur-xl shadow-sm',

    text: {
      primary: isDarkMode ? 'text-white' : 'text-slate-900',
      secondary: isDarkMode ? 'text-gray-300' : 'text-slate-600',
      muted: isDarkMode ? 'text-gray-400' : 'text-slate-500',
      accent: isDarkMode ? 'text-blue-400' : 'text-blue-700',
      inverted: isDarkMode ? 'text-gray-900' : 'text-white',
    },

    gradient: {
      title: isDarkMode
        ? 'bg-gradient-to-r from-white to-blue-300'
        : 'bg-gradient-to-r from-slate-900 to-blue-700',
    },

    card: {
      primary: isDarkMode
        ? 'bg-slate-800 border-slate-700'
        : 'bg-white border-slate-200 shadow-sm',
      secondary: isDarkMode
        ? 'bg-slate-700 border-slate-600'
        : 'bg-slate-100 border-slate-200',
      accent: isDarkMode
        ? 'bg-slate-800 border-blue-600'
        : 'bg-blue-50 border-blue-200',
    },

    button: {
      primary: isDarkMode
        ? 'bg-blue-600 hover:bg-blue-500 text-white border-blue-500 shadow-lg'
        : 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600 shadow-sm',
      // Light variants are tinted rather than white: a white button on a white
      // header/card has no edge to read against and stops looking clickable.
      secondary: isDarkMode
        ? 'bg-slate-700 hover:bg-slate-600 text-white border-slate-600 shadow-md'
        : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300 shadow-sm',
      ghost: isDarkMode
        ? 'bg-slate-700/70 hover:bg-slate-600 text-gray-200 border-slate-600 shadow-md'
        : 'bg-slate-50 hover:bg-slate-200 text-slate-700 border-slate-300 shadow-sm',
      danger: isDarkMode
        ? 'bg-red-600 hover:bg-red-500 text-white border-red-500 shadow-lg'
        : 'bg-red-600 hover:bg-red-700 text-white border-red-600 shadow-sm',
      success: isDarkMode
        ? 'bg-green-600 hover:bg-green-500 text-white border-green-500 shadow-lg'
        : 'bg-green-600 hover:bg-green-700 text-white border-green-600 shadow-sm',
    },

    input: isDarkMode
      ? 'bg-slate-800 border-slate-600 text-white placeholder:text-gray-400 focus:border-blue-400 focus:ring-blue-400/30'
      : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500/30',

    link: isDarkMode
      ? 'text-blue-400 hover:text-blue-300'
      : 'text-blue-700 hover:text-blue-800',

    status: {
      success: isDarkMode ? 'bg-green-800/60 text-green-200 border-green-600' : 'bg-green-100 text-green-800 border-green-300',
      warning: isDarkMode ? 'bg-yellow-800/60 text-yellow-200 border-yellow-600' : 'bg-amber-100 text-amber-900 border-amber-300',
      error: isDarkMode ? 'bg-red-800/60 text-red-200 border-red-600' : 'bg-red-100 text-red-800 border-red-300',
      info: isDarkMode ? 'bg-blue-800/60 text-blue-200 border-blue-600' : 'bg-blue-100 text-blue-800 border-blue-300',
    },

    interactive: {
      hover: isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100',
      active: isDarkMode ? 'active:bg-slate-600' : 'active:bg-slate-200',
      focus: isDarkMode ? 'focus:ring-2 focus:ring-blue-400/50 focus:outline-none' : 'focus:ring-2 focus:ring-blue-500/50 focus:outline-none',
    }
  };

  const value = {
    isDarkMode,
    toggleTheme,
    themeClasses,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};