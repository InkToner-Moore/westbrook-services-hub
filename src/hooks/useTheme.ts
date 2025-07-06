import { useState, useEffect } from 'react';

export const useTheme = () => {
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

  // Improved theme classes for better readability and contrast
  const themeClasses = {
    background: isDarkMode 
      ? 'bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800' 
      : 'bg-gradient-to-br from-gray-50 via-white to-blue-50',
    
    backgroundFloating: {
      purple: isDarkMode ? 'bg-purple-600/30' : 'bg-purple-200/40',
      blue: isDarkMode ? 'bg-blue-600/30' : 'bg-blue-200/40',
      indigo: isDarkMode ? 'bg-indigo-600/30' : 'bg-indigo-200/40',
    },
    
    header: isDarkMode 
      ? 'bg-slate-800/80 border-slate-700/50 backdrop-blur-xl' 
      : 'bg-white/90 border-gray-200/60 backdrop-blur-xl',
    
    text: {
      primary: isDarkMode ? 'text-gray-100' : 'text-gray-900',
      secondary: isDarkMode ? 'text-gray-300' : 'text-gray-700',
      muted: isDarkMode ? 'text-gray-400' : 'text-gray-500',
      accent: isDarkMode ? 'text-blue-400' : 'text-blue-600',
    },
    
    gradient: {
      title: isDarkMode 
        ? 'bg-gradient-to-r from-gray-100 to-blue-200' 
        : 'bg-gradient-to-r from-gray-900 to-blue-700',
    },
    
    card: {
      primary: isDarkMode 
        ? 'bg-slate-800/60 border-slate-700/50 backdrop-blur-sm' 
        : 'bg-white/80 border-gray-200/60 backdrop-blur-sm',
      secondary: isDarkMode 
        ? 'bg-slate-700/40 border-slate-600/50' 
        : 'bg-gray-50/80 border-gray-300/60',
      accent: isDarkMode
        ? 'bg-blue-900/40 border-blue-700/50'
        : 'bg-blue-50/80 border-blue-200/60',
    },
    
    button: {
      primary: isDarkMode 
        ? 'bg-blue-600 hover:bg-blue-500 text-white border-blue-500' 
        : 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600',
      secondary: isDarkMode 
        ? 'bg-slate-700 hover:bg-slate-600 text-gray-200 border-slate-600' 
        : 'bg-gray-200 hover:bg-gray-300 text-gray-800 border-gray-300',
      ghost: isDarkMode 
        ? 'bg-slate-700/50 hover:bg-slate-600/60 text-gray-200 border-slate-600/50' 
        : 'bg-gray-100/60 hover:bg-gray-200/80 text-gray-700 border-gray-300/60',
      danger: isDarkMode
        ? 'bg-red-600 hover:bg-red-500 text-white border-red-500'
        : 'bg-red-600 hover:bg-red-700 text-white border-red-600',
      success: isDarkMode
        ? 'bg-green-600 hover:bg-green-500 text-white border-green-500'
        : 'bg-green-600 hover:bg-green-700 text-white border-green-600',
    },
    
    input: isDarkMode 
      ? 'bg-slate-800/60 border-slate-600/60 text-gray-100 placeholder:text-gray-400 focus:border-blue-500 focus:ring-blue-500/20' 
      : 'bg-white/80 border-gray-300/80 text-gray-900 placeholder:text-gray-500 focus:border-blue-500 focus:ring-blue-500/20',
    
    link: isDarkMode 
      ? 'text-blue-400 hover:text-blue-300' 
      : 'text-blue-600 hover:text-blue-800',

    status: {
      success: isDarkMode ? 'bg-green-900/40 text-green-300 border-green-700/50' : 'bg-green-100 text-green-800 border-green-300',
      warning: isDarkMode ? 'bg-yellow-900/40 text-yellow-300 border-yellow-700/50' : 'bg-yellow-100 text-yellow-800 border-yellow-300',
      error: isDarkMode ? 'bg-red-900/40 text-red-300 border-red-700/50' : 'bg-red-100 text-red-800 border-red-300',
      info: isDarkMode ? 'bg-blue-900/40 text-blue-300 border-blue-700/50' : 'bg-blue-100 text-blue-800 border-blue-300',
    },

    interactive: {
      hover: isDarkMode ? 'hover:bg-slate-700/50' : 'hover:bg-gray-100/80',
      active: isDarkMode ? 'active:bg-slate-600/60' : 'active:bg-gray-200/80',
      focus: 'focus:ring-2 focus:ring-blue-500/20 focus:outline-none',
    }
  };

  return {
    isDarkMode,
    toggleTheme,
    themeClasses,
  };
};