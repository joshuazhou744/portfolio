'use client';

import { useEffect, useState } from 'react';

/**
 * Tracks window inner width/height with a SSR-safe default and an `isMounted`
 * flag that flips to true after the first client effect runs.
 *
 * Replaces the duplicated useState+useEffect resize blocks across components.
 */
export function useWindowDimensions(initialWidth = 1024, initialHeight = 768) {
  const [dimensions, setDimensions] = useState({
    width: initialWidth,
    height: initialHeight,
  });
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);

    const update = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return {
    width: dimensions.width,
    height: dimensions.height,
    isMounted,
  };
}
