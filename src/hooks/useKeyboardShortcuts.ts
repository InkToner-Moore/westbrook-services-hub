import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';

interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  action: () => void;
  description: string;
  category: 'navigation' | 'actions' | 'search' | 'system';
}

export const useKeyboardShortcuts = (isStaffPortal: boolean = false) => {
  const navigate = useNavigate();

  // Define all keyboard shortcuts
  const shortcuts: KeyboardShortcut[] = [
    // Navigation shortcuts
    {
      key: 'h',
      ctrl: true,
      action: () => navigate('/'),
      description: 'Go to home page',
      category: 'navigation'
    },
    {
      key: 'd',
      ctrl: true,
      action: () => isStaffPortal ? navigate('/staff/dashboard') : navigate('/staff'),
      description: 'Go to dashboard',
      category: 'navigation'
    },
    {
      key: 'i',
      ctrl: true,
      action: () => navigate('/staff/inventory'),
      description: 'Go to inventory',
      category: 'navigation'
    },
    {
      key: 'r',
      ctrl: true,
      action: () => navigate('/staff/receipts'),
      description: 'Go to receipts',
      category: 'navigation'
    },
    {
      key: 'c',
      ctrl: true,
      action: () => navigate('/staff/cartridges'),
      description: 'Go to cartridges',
      category: 'navigation'
    },
    {
      key: 'n',
      ctrl: true,
      action: () => navigate('/staff/notes'),
      description: 'Go to notes',
      category: 'navigation'
    },
    {
      key: 'b',
      ctrl: true,
      action: () => navigate('/staff/blog'),
      description: 'Go to blog',
      category: 'navigation'
    },
    {
      key: 's',
      ctrl: true,
      shift: true,
      action: () => navigate('/staff/settings'),
      description: 'Go to settings',
      category: 'navigation'
    },

    // Search shortcuts
    {
      key: '/',
      action: () => {
        const searchInput = document.querySelector('input[placeholder*="search"], input[placeholder*="Search"]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      },
      description: 'Focus search field',
      category: 'search'
    },
    {
      key: 'Escape',
      action: () => {
        // Clear focus from any input
        const activeElement = document.activeElement as HTMLElement;
        if (activeElement) {
          activeElement.blur();
        }
      },
      description: 'Clear focus/close dialogs',
      category: 'system'
    },

    // System shortcuts
    {
      key: '?',
      shift: true,
      action: () => showShortcutsHelp(),
      description: 'Show keyboard shortcuts',
      category: 'system'
    },
    {
      key: 't',
      ctrl: true,
      action: () => {
        // Toggle theme (if theme context is available)
        const themeToggle = document.querySelector('[aria-label*="theme"], [title*="theme"]') as HTMLButtonElement;
        if (themeToggle) {
          themeToggle.click();
        }
      },
      description: 'Toggle theme',
      category: 'system'
    },

    // Quick actions
    {
      key: 'n',
      ctrl: true,
      shift: true,
      action: () => {
        // Try to find and click "Add New" or "Create" buttons
        const addButtons = document.querySelectorAll('button');
        const addButton = Array.from(addButtons).find(btn => 
          btn.textContent?.toLowerCase().includes('add') ||
          btn.textContent?.toLowerCase().includes('create') ||
          btn.textContent?.toLowerCase().includes('new')
        );
        if (addButton) {
          addButton.click();
        }
      },
      description: 'Create new item',
      category: 'actions'
    }
  ];

  const showShortcutsHelp = useCallback(() => {
    const shortcutsList = shortcuts
      .filter(s => isStaffPortal || s.category !== 'navigation' || s.key === 'h')
      .map(s => {
        const keys = [];
        if (s.ctrl) keys.push('Ctrl');
        if (s.alt) keys.push('Alt');
        if (s.shift) keys.push('Shift');
        keys.push(s.key.toUpperCase());
        return `${keys.join(' + ')}: ${s.description}`;
      })
      .join('\n');

    const shortcutsText = shortcuts
      .filter(s => isStaffPortal || s.key === 'h')
      .map(s => {
        const keys = [s.ctrl && 'Ctrl', s.alt && 'Alt', s.shift && 'Shift', s.key.toUpperCase()]
          .filter(Boolean)
          .join(' + ');
        return `${keys}: ${s.description}`;
      })
      .join('\n');

    toast({
      title: "Keyboard Shortcuts",
      description: shortcutsText,
      duration: 10000
    });
  }, [shortcuts, isStaffPortal]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in inputs
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
      // Exception: allow Escape to clear focus
      if (event.key !== 'Escape') {
        return;
      }
    }

    // Find matching shortcut
    const shortcut = shortcuts.find(s => 
      s.key.toLowerCase() === event.key.toLowerCase() &&
      !!s.ctrl === event.ctrlKey &&
      !!s.alt === event.altKey &&
      !!s.shift === event.shiftKey
    );

    if (shortcut) {
      event.preventDefault();
      event.stopPropagation();
      
      try {
        shortcut.action();
      } catch (error) {
        console.error('Error executing keyboard shortcut:', error);
      }
    }
  }, [shortcuts]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // Return shortcuts for documentation purposes
  return {
    shortcuts: shortcuts.filter(s => isStaffPortal || s.category !== 'navigation' || s.key === 'h'),
    showHelp: showShortcutsHelp
  };
};

export default useKeyboardShortcuts;