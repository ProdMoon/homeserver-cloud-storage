import { useEffect, useRef } from 'react';

type EscapeHandler = () => void;

const stack: EscapeHandler[] = [];

function handleKeyDown(event: KeyboardEvent) {
  if (event.key === 'Escape' && stack.length > 0) {
    event.stopPropagation();
    const topHandler = stack[stack.length - 1];
    topHandler();
  }
}

document.addEventListener('keydown', handleKeyDown);

export function useEscapeStack(callback: EscapeHandler, active: boolean) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!active) {
      return;
    }

    const handler: EscapeHandler = () => callbackRef.current();
    stack.push(handler);

    return () => {
      const index = stack.indexOf(handler);
      if (index !== -1) {
        stack.splice(index, 1);
      }
    };
  }, [active]);
}
