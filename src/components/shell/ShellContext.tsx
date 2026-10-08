// Lets a tool page know it is being rendered inside the staff shell's center
// pane (so it should drop its own full-page chrome: header, min-h-screen, page
// background) rather than as a standalone route. StaffShell provides inShell:true;
// everything else defaults to false, so a deep-linked full page still works.
import { createContext, useContext } from 'react';

export interface ShellState {
  inShell: boolean;
  // Bring the artifact (the slip, a receipt) into view. On a phone that lifts
  // its sheet; on desktop it reopens the rail if it was tucked away.
  openWorkspace?: () => void;
}

export const ShellContext = createContext<ShellState>({ inShell: false });

export const useShell = () => useContext(ShellContext);
