import { createContext, useContext, useState, ReactNode, useCallback } from 'react';

interface WindowContextType {
  bringToFront: (windowId: string) => void;
  getZIndex: (windowId: string) => number;
}

const WindowContext = createContext<WindowContextType | undefined>(undefined);

const BASE_Z_INDEX = 100;

export function WindowProvider({ children }: { children: ReactNode }) {
  const [windowStack, setWindowStack] = useState<string[]>([]);

  const bringToFront = useCallback((windowId: string) => {
    setWindowStack(prev => {
      if (prev.length > 0 && prev[prev.length - 1] === windowId) {
        return prev;
      }
      
      const newStack = prev.filter(id => id !== windowId);
      return [...newStack, windowId];
    });
  }, []);

  const getZIndex = useCallback((windowId: string): number => {
    const index = windowStack.indexOf(windowId);
    
    if (index !== -1) {
      return BASE_Z_INDEX + index;
    }
    

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