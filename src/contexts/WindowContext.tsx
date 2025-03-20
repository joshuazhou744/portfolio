import { createContext, useContext, useState, ReactNode, useCallback } from 'react';

interface WindowContextType {
  bringToFront: (windowId: string) => void;
  getZIndex: (windowId: string) => number;
}

const WindowContext = createContext<WindowContextType | undefined>(undefined);

const BASE_Z_INDEX = 100;

export function WindowProvider({ children }: { children: ReactNode }) {
  // Track window order in a stack - higher index means higher z-index
  const [windowStack, setWindowStack] = useState<string[]>([]);

  // Use useCallback to memoize functions and prevent recreation on each render
  const bringToFront = useCallback((windowId: string) => {
    setWindowStack(prev => {
      // If window is already at the top, don't change anything
      if (prev.length > 0 && prev[prev.length - 1] === windowId) {
        return prev;
      }
      
      // Remove window from its current position (if exists)
      const newStack = prev.filter(id => id !== windowId);
      // Add window to the top of the stack
      return [...newStack, windowId];
    });
  }, []);

  // Calculate z-index without modifying state during render
  const getZIndex = useCallback((windowId: string): number => {
    const index = windowStack.indexOf(windowId);
    
    // If window is in the stack, return its index-based z-index
    if (index !== -1) {
      return BASE_Z_INDEX + index;
    }
    
    // For windows not yet in the stack, return base z-index
    // This is just temporary - they should call bringToFront after render
    return BASE_Z_INDEX;
  }, [windowStack]);

  return (
    <WindowContext.Provider value={{ bringToFront, getZIndex }}>
      {children}
    </WindowContext.Provider>
  );
}

export function useWindow() {
  const context = useContext(WindowContext);
  if (context === undefined) {
    throw new Error('useWindow must be used within a WindowProvider');
  }
  return context;
} 