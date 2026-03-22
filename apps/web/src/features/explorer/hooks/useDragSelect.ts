import { type RefObject, useEffect, useRef } from 'react';
import { useAppStore } from '../../../app/store/useAppStore';
import { selectToggleSelectedPath } from '../../../app/store/selectors';

function findRowPath(element: Element | null): string | null {
  const row = element?.closest<HTMLElement>('[data-path]');
  return row?.dataset.path ?? null;
}

function isCheckboxArea(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }

  return target.closest('[data-checkbox]') !== null;
}

export function useDragSelect(containerRef: RefObject<HTMLDivElement | null>) {
  const toggleSelectedPath = useAppStore(selectToggleSelectedPath);
  const toggleRef = useRef(toggleSelectedPath);
  toggleRef.current = toggleSelectedPath;

  const dragStateRef = useRef({
    active: false,
    toggled: new Set<string>(),
  });

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!isCheckboxArea(event.target)) {
        return;
      }

      const path = findRowPath(event.target as Element);

      if (!path) {
        return;
      }

      event.preventDefault();
      dragStateRef.current.active = true;
      dragStateRef.current.toggled = new Set([path]);
      container!.classList.add('touch-none');
      container!.setPointerCapture(event.pointerId);
    }

    function handlePointerMove(event: PointerEvent) {
      if (!dragStateRef.current.active) {
        return;
      }

      event.preventDefault();

      const element = document.elementFromPoint(event.clientX, event.clientY);
      const path = findRowPath(element);

      if (!path || dragStateRef.current.toggled.has(path)) {
        return;
      }

      dragStateRef.current.toggled.add(path);
      toggleRef.current(path);
    }

    function handlePointerUp(event: PointerEvent) {
      if (!dragStateRef.current.active) {
        return;
      }

      dragStateRef.current.active = false;
      dragStateRef.current.toggled.clear();
      container!.classList.remove('touch-none');

      try {
        container!.releasePointerCapture(event.pointerId);
      } catch {
        // Already released
      }
    }

    container.addEventListener('pointerdown', handlePointerDown);
    container.addEventListener('pointermove', handlePointerMove);
    container.addEventListener('pointerup', handlePointerUp);
    container.addEventListener('pointercancel', handlePointerUp);

    return () => {
      container.removeEventListener('pointerdown', handlePointerDown);
      container.removeEventListener('pointermove', handlePointerMove);
      container.removeEventListener('pointerup', handlePointerUp);
      container.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [containerRef]);
}
