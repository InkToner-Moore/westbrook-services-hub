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

  // The shop palette is shared with the customer page: warm paper in light,
  // graphite in dark. Ink navy is the brand and the primary button; indigo is
  // the accent for links and focus. Brass is the single warm accent.
  const themeClasses = {
    // Display face for page titles and the few big lines; body stays Plex.
    display: 'font-display font-semibold',
    // The single brand fill: ink on paper in light, paper-light on graphite in dark.
    ink: {
      fill: isDarkMode
        ? 'bg-[#eceef6] text-[#0e1014] border-[#eceef6]'
        : 'bg-[#15173a] text-white border-[#15173a]',
      soft: isDarkMode ? 'bg-[#1f232c]' : 'bg-[#f1efe9]',
      text: isDarkMode ? 'text-[#eceef6]' : 'text-[#15173a]',
    },
    accent: {
      fill: isDarkMode
        ? 'bg-[#8f9bff] text-[#0e1014] border-[#8f9bff]'
        : 'bg-[#2f3ad1] text-white border-[#2f3ad1]',
      soft: isDarkMode ? 'bg-[#1b1f33]' : 'bg-[#eef0fd]',
      text: isDarkMode ? 'text-[#8f9bff]' : 'text-[#2f3ad1]',
      border: isDarkMode ? 'border-[#3a4290]' : 'border-[#c9cdf5]',
    },
    brass: {
      text: isDarkMode ? 'text-[#d9a84a]' : 'text-[#8a5f12]',
      soft: isDarkMode ? 'bg-[#2a2212]' : 'bg-[#faf3e3]',
    },
    edge: isDarkMode ? 'border-[#2a2f3a]' : 'border-[#e4e1d9]',

    background: isDarkMode
      ? 'bg-[#0e1014]'
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
      danger: isDarkMode ? 'text-red-300' : 'text-red-700',
      primary: isDarkMode ? 'text-[#eceef6]' : 'text-[#15173a]',
      secondary: isDarkMode ? 'text-[#a3a8bd]' : 'text-[#5b5f76]',
      // The quietest text still has to pass AA on paper and on graphite.
      muted: isDarkMode ? 'text-[#8b90a6]' : 'text-[#676b82]',
      accent: isDarkMode ? 'text-[#8f9bff]' : 'text-[#2f3ad1]',
      inverted: isDarkMode ? 'text-[#0e1014]' : 'text-white',
    },

    gradient: {
      // Solid, not a gradient (see note above): renders solid graphite through
      // the existing `bg-clip-text text-transparent` at each call site.
      title: isDarkMode ? 'bg-[#eceef6]' : 'bg-[#15173a]',
    },

    card: {
      primary: isDarkMode
        ? 'bg-[#171a21] border-[#2a2f3a]'
        : 'bg-white border-[#e4e1d9]',
      secondary: isDarkMode
        ? 'bg-[#1f232c] border-[#2a2f3a]'
        : 'bg-[#f1efe9] border-[#e4e1d9]',
      accent: isDarkMode
        ? 'bg-[#1b1f33] border-[#3a4290]'
        : 'bg-[#eef0fd] border-[#c9cdf5]',
    },

    button: {
      primary: isDarkMode
        ? 'bg-[#eceef6] hover:bg-[#8f9bff] text-[#0e1014] border-[#eceef6]'
        : 'bg-[#15173a] hover:bg-[#2f3ad1] text-white border-[#15173a]',
      secondary: isDarkMode
        ? 'bg-[#1f232c] hover:bg-[#262b35] text-[#eceef6] border-[#2a2f3a]'
        : 'bg-[#f1efe9] hover:bg-[#e9e6df] text-[#15173a] border-[#e4e1d9]',
      ghost: isDarkMode
        ? 'bg-transparent hover:bg-[#1f232c] text-[#a3a8bd] border-transparent'
        : 'bg-transparent hover:bg-[#f1efe9] text-[#5b5f76] border-transparent',
      danger: isDarkMode
        ? 'bg-red-600 hover:bg-red-500 text-white border-red-500 shadow-sm'
        : 'bg-red-600 hover:bg-red-700 text-white border-red-600 shadow-sm',
      success: isDarkMode
        ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 shadow-sm'
        : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-sm',
    },

    input: isDarkMode
      ? 'bg-[#1f232c] border-[#2a2f3a] text-[#eceef6] ' +
        'placeholder:text-[#8b90a6] focus:border-[#8f9bff] focus:ring-[#8f9bff]/30'
      : 'bg-[#f1efe9] border-[#e4e1d9] text-[#15173a] ' +
        'placeholder:text-[#676b82] focus:border-[#2f3ad1] focus:ring-[#2f3ad1]/30',

    link: isDarkMode
      ? 'text-[#8f9bff] hover:text-[#b4bcff]'
      : 'text-[#2f3ad1] hover:text-[#15173a]',

    status: {
      success: isDarkMode ? 'bg-emerald-900/50 text-emerald-200 border-emerald-700' : 'bg-emerald-50 text-emerald-800 border-emerald-300',
      warning: isDarkMode ? 'bg-amber-900/50 text-amber-200 border-amber-700' : 'bg-amber-50 text-amber-900 border-amber-300',
      error: isDarkMode ? 'bg-red-900/50 text-red-200 border-red-700' : 'bg-red-50 text-red-800 border-red-300',
      info: isDarkMode
        ? 'bg-[#1b1f33] text-[#c5cbff] border-[#3a4290]'
        : 'bg-[#eef0fd] text-[#232ba3] border-[#c9cdf5]',
    },

    interactive: {
      hover: isDarkMode ? 'hover:bg-[#1f232c]' : 'hover:bg-[#f1efe9]',
      active: isDarkMode ? 'active:bg-[#262b35]' : 'active:bg-[#e9e6df]',
      focus: isDarkMode
        ? 'focus-visible:ring-2 focus-visible:ring-[#8f9bff] focus-visible:outline-none'
        : 'focus-visible:ring-2 focus-visible:ring-[#2f3ad1] focus-visible:outline-none',
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
