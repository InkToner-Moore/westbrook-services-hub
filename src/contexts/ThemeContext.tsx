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
    // Check localStorage for saved preference, default to false (light mode).
    // The storage key is versioned: bumping it (staff-theme -> staff-theme-v2)
    // is a one-time hard reset that drops every browser's old saved preference,
    // so everyone lands on the light default once. A later toggle persists under
    // the new key as usual.
    const saved = localStorage.getItem('staff-theme-v2');
    return saved !== null ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    // Save theme preference to localStorage
    localStorage.setItem('staff-theme-v2', JSON.stringify(isDarkMode));

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

  // The counter/paper palette (see docs/ui-rehaul/DESIGN-SPEC.md). Both themes
  // share one warm-neutral spine so a light/dark toggle only changes value, never
  // layout. Light is warm paper on a paper-grey counter; dark is graphite. Ink
  // (indigo) is the brand + AI signature; blue is the action colour; brass (amber)
  // is the single warm accent. Borders + a step in surface value carry hierarchy;
  // heavy shadows are gone.
  const themeClasses = {
    background: isDarkMode
      ? 'bg-[#0f1115]'
      : 'bg-[#f6f5f2]',

    // Two former Lovable tells are neutralised here, at the token, so they vanish
    // everywhere at once without editing the ~8 pages that still reference them:
    //  - backgroundFloating: the animated blur blobs render invisibly now.
    //  - gradient.title: a solid colour, so every `bg-clip-text` title paints
    //    solid graphite instead of a gradient.
    // Owners still delete the dead JSX when they touch a file; this keeps the app
    // coherent in the meantime.
    backgroundFloating: {
      purple: 'bg-transparent opacity-0',
      blue: 'bg-transparent opacity-0',
      indigo: 'bg-transparent opacity-0',
    },

    header: isDarkMode
      ? 'bg-[#171a21]/95 border-[#2a2f3a] backdrop-blur-xl'
      : 'bg-white/90 border-[#e4e1d9] backdrop-blur-xl',

    text: {
      primary: isDarkMode ? 'text-[#f3f4f6]' : 'text-[#1a1d23]',
      secondary: isDarkMode ? 'text-[#9aa4b2]' : 'text-[#5b6270]',
      muted: isDarkMode ? 'text-[#6b7280]' : 'text-[#8a8f9a]',
      accent: isDarkMode ? 'text-blue-400' : 'text-blue-700',
      inverted: isDarkMode ? 'text-[#1a1d23]' : 'text-white',
    },

    gradient: {
      // Solid, not a gradient (see note above): renders solid graphite through
      // the existing `bg-clip-text text-transparent` at each call site.
      title: isDarkMode ? 'bg-[#f3f4f6]' : 'bg-[#1a1d23]',
    },

    card: {
      primary: isDarkMode
        ? 'bg-[#171a21] border-[#2a2f3a]'
        : 'bg-white border-[#e4e1d9]',
      secondary: isDarkMode
        ? 'bg-[#1f232c] border-[#2a2f3a]'
        : 'bg-[#f1efe9] border-[#e4e1d9]',
      accent: isDarkMode
        ? 'bg-[#171a21] border-blue-700'
        : 'bg-blue-50 border-blue-200',
    },

    button: {
      primary: isDarkMode
        ? 'bg-blue-500 hover:bg-blue-400 text-white border-blue-500 shadow-sm'
        : 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600 shadow-sm',
      secondary: isDarkMode
        ? 'bg-[#1f232c] hover:bg-[#262b35] text-[#f3f4f6] border-[#2a2f3a]'
        : 'bg-[#f1efe9] hover:bg-[#e9e6df] text-[#1a1d23] border-[#e4e1d9]',
      ghost: isDarkMode
        ? 'bg-transparent hover:bg-[#1f232c] text-[#9aa4b2] border-transparent'
        : 'bg-transparent hover:bg-[#f1efe9] text-[#5b6270] border-transparent',
      danger: isDarkMode
        ? 'bg-red-600 hover:bg-red-500 text-white border-red-500 shadow-sm'
        : 'bg-red-600 hover:bg-red-700 text-white border-red-600 shadow-sm',
      success: isDarkMode
        ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 shadow-sm'
        : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-sm',
    },

    input: isDarkMode
      ? 'bg-[#1f232c] border-[#2a2f3a] text-[#f3f4f6] placeholder:text-[#6b7280] focus:border-blue-400 focus:ring-blue-400/30'
      : 'bg-[#f1efe9] border-[#e4e1d9] text-[#1a1d23] placeholder:text-[#8a8f9a] focus:border-blue-500 focus:ring-blue-500/30',

    link: isDarkMode
      ? 'text-blue-400 hover:text-blue-300'
      : 'text-blue-700 hover:text-blue-800',

    status: {
      success: isDarkMode ? 'bg-emerald-900/50 text-emerald-200 border-emerald-700' : 'bg-emerald-50 text-emerald-800 border-emerald-300',
      warning: isDarkMode ? 'bg-amber-900/50 text-amber-200 border-amber-700' : 'bg-amber-50 text-amber-900 border-amber-300',
      error: isDarkMode ? 'bg-red-900/50 text-red-200 border-red-700' : 'bg-red-50 text-red-800 border-red-300',
      info: isDarkMode ? 'bg-blue-900/50 text-blue-200 border-blue-700' : 'bg-blue-50 text-blue-800 border-blue-300',
    },

    interactive: {
      hover: isDarkMode ? 'hover:bg-[#1f232c]' : 'hover:bg-[#f1efe9]',
      active: isDarkMode ? 'active:bg-[#262b35]' : 'active:bg-[#e9e6df]',
      focus: isDarkMode ? 'focus:ring-2 focus:ring-blue-400/50 focus:outline-none' : 'focus:ring-2 focus:ring-blue-500/50 focus:outline-none',
    },
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
