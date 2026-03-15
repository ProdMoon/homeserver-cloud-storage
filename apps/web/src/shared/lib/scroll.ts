export interface ScrollPosition {
  left: number;
  top: number;
}

export function captureWindowScroll(enabled: boolean | undefined): ScrollPosition | null {
  if (!enabled) {
    return null;
  }

  return {
    left: window.scrollX,
    top: window.scrollY
  };
}

export function restoreWindowScroll(position: ScrollPosition | null) {
  if (!position) {
    return;
  }

  window.requestAnimationFrame(() => {
    window.scrollTo(position.left, position.top);
  });
}

