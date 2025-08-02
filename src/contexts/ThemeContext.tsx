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
    // Check localStorage for saved preference, default to true (dark mode)
    const saved = localStorage.getItem('staff-theme');
    return saved !== null ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    // Save theme preference to localStorage
    localStorage.setItem('staff-theme', JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  // High contrast theme classes for better accessibility and readability
  const themeClasses = {
    background: isDarkMode 
      ? 'bg-slate-900' 
      : 'bg-stone-100',
    
    backgroundFloating: {
      purple: isDarkMode ? 'bg-purple-500/20 opacity-30' : 'bg-purple-300/20 opacity-40',
      blue: isDarkMode ? 'bg-blue-500/20 opacity-30' : 'bg-blue-300/20 opacity-40',
      indigo: isDarkMode ? 'bg-indigo-500/20 opacity-30' : 'bg-indigo-300/20 opacity-40',
    },
    
    header: isDarkMode 
      ? 'bg-slate-800 border-slate-700 backdrop-blur-xl' 
      : 'bg-stone-200/80 border-stone-300 backdrop-blur-xl shadow-sm',
    
    text: {
      primary: isDarkMode ? 'text-white' : 'text-stone-800',
      secondary: isDarkMode ? 'text-gray-300' : 'text-stone-600',
      muted: isDarkMode ? 'text-gray-400' : 'text-stone-500',
      accent: isDarkMode ? 'text-blue-400' : 'text-blue-700',
      inverted: isDarkMode ? 'text-gray-900' : 'text-white',
    },
    
    gradient: {
      title: isDarkMode 
        ? 'bg-gradient-to-r from-white to-blue-300' 
        : 'bg-gradient-to-r from-gray-900 to-blue-800',
    },
    
    card: {
      primary: isDarkMode 
        ? 'bg-slate-800 border-slate-700' 
        : 'bg-stone-50/60 border-stone-300 shadow-sm',
      secondary: isDarkMode 
        ? 'bg-slate-700 border-slate-600' 
        : 'bg-stone-200/70 border-stone-400',
      accent: isDarkMode
        ? 'bg-slate-800 border-blue-600'
        : 'bg-blue-50/70 border-blue-300',
    },
    
    button: {
      primary: isDarkMode 
        ? 'bg-blue-600 hover:bg-blue-500 text-white border-blue-500 shadow-lg' 
        : 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600 shadow-lg',
      secondary: isDarkMode 
        ? 'bg-slate-700 hover:bg-slate-600 text-white border-slate-600 shadow-md' 
        : 'bg-stone-300/80 hover:bg-stone-400/80 text-stone-800 border-stone-400 shadow-md',
      ghost: isDarkMode 
        ? 'bg-slate-700/70 hover:bg-slate-600 text-gray-200 border-slate-600 shadow-md' 
        : 'bg-stone-200/60 hover:bg-stone-300/60 text-stone-700 border-stone-300 shadow-sm',
      danger: isDarkMode
        ? 'bg-red-600 hover:bg-red-500 text-white border-red-500 shadow-lg'
        : 'bg-red-600 hover:bg-red-700 text-white border-red-600 shadow-lg',
      success: isDarkMode
        ? 'bg-green-600 hover:bg-green-500 text-white border-green-500 shadow-lg'
        : 'bg-green-600 hover:bg-green-700 text-white border-green-600 shadow-lg',
    },
    
    input: isDarkMode 
      ? 'bg-slate-800 border-slate-600 text-white placeholder:text-gray-400 focus:border-blue-400 focus:ring-blue-400/30' 
      : 'bg-stone-50/80 border-stone-300 text-stone-800 placeholder:text-stone-500 focus:border-blue-500 focus:ring-blue-500/30',
    
    link: isDarkMode 
      ? 'text-blue-400 hover:text-blue-300' 
      : 'text-blue-700 hover:text-blue-800',

    status: {
      success: isDarkMode ? 'bg-green-800/60 text-green-200 border-green-600' : 'bg-green-100 text-green-800 border-green-400',
      warning: isDarkMode ? 'bg-yellow-800/60 text-yellow-200 border-yellow-600' : 'bg-yellow-100 text-yellow-800 border-yellow-400',
      error: isDarkMode ? 'bg-red-800/60 text-red-200 border-red-600' : 'bg-red-100 text-red-800 border-red-400',
      info: isDarkMode ? 'bg-blue-800/60 text-blue-200 border-blue-600' : 'bg-blue-100 text-blue-800 border-blue-400',
    },

    interactive: {
      hover: isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-gray-200',
      active: isDarkMode ? 'active:bg-slate-600' : 'active:bg-gray-300',
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