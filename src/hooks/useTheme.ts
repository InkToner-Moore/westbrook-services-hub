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

  // Theme classes for consistent styling
  const themeClasses = {
    background: isDarkMode 
      ? 'bg-gradient-to-br from-indigo-950 via-blue-900 to-purple-900' 
      : 'bg-gradient-to-br from-blue-50 via-indigo-100 to-purple-200',
    
    backgroundFloating: {
      purple: isDarkMode ? 'bg-purple-500' : 'bg-purple-300',
      blue: isDarkMode ? 'bg-blue-500' : 'bg-blue-300',
      indigo: isDarkMode ? 'bg-indigo-500' : 'bg-indigo-300',
    },
    
    header: isDarkMode 
      ? 'bg-white/10 border-white/20' 
      : 'bg-white/50 border-gray-200/50',
    
    text: {
      primary: isDarkMode ? 'text-white' : 'text-gray-800',
      secondary: isDarkMode ? 'text-blue-200' : 'text-blue-600',
      muted: isDarkMode ? 'text-blue-100' : 'text-gray-600',
    },
    
    gradient: {
      title: isDarkMode 
        ? 'bg-gradient-to-r from-white to-blue-100' 
        : 'bg-gradient-to-r from-gray-800 to-blue-600',
    },
    
    card: isDarkMode 
      ? 'bg-white/15 border-white/30' 
      : 'bg-white/30 border-gray-300/50',
    
    button: {
      ghost: isDarkMode 
        ? 'bg-white/20 hover:bg-white/30 text-white' 
        : 'bg-gray-200/50 hover:bg-gray-200/70 text-gray-700',
      border: isDarkMode ? 'border-white/30' : 'border-gray-300/50',
    },
    
    input: isDarkMode 
      ? 'bg-white/10 border-white/30 text-white placeholder:text-blue-200' 
      : 'bg-white/20 border-gray-300/50 text-gray-700 placeholder:text-gray-500',
    
    link: isDarkMode 
      ? 'text-blue-200 hover:text-white' 
      : 'text-blue-600 hover:text-blue-800',
  };

  return {
    isDarkMode,
    toggleTheme,
    themeClasses,
  };
};