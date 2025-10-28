import { useEffect } from 'react';

export const useAutoScroll = (draggedItem) => {
  useEffect(() => {
    if (!draggedItem) return;

    let animationFrameId = null;
    let currentMouseY = null;

    const scroll = () => {
      if (currentMouseY === null) {
        animationFrameId = null;
        return;
      }

      const SCROLL_ZONE = 200;
      const MAX_SPEED = 15;
      const viewportHeight = window.innerHeight;
      let speed = 0;

      if (currentMouseY < SCROLL_ZONE) {
        speed = -MAX_SPEED * (1 - currentMouseY / SCROLL_ZONE);
      } else if (currentMouseY > viewportHeight - SCROLL_ZONE) {
        speed = MAX_SPEED * ((currentMouseY - (viewportHeight - SCROLL_ZONE)) / SCROLL_ZONE);
      }

      if (speed !== 0) window.scrollBy(0, speed);
      animationFrameId = requestAnimationFrame(scroll);
    };

    const handleDrag = (e) => {
      if (e.clientY !== 0) {
        currentMouseY = e.clientY;
        if (!animationFrameId) animationFrameId = requestAnimationFrame(scroll);
      }
    };

    const handleDragEnd = () => {
      currentMouseY = null;
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
    };

    document.addEventListener('drag', handleDrag);
    document.addEventListener('dragend', handleDragEnd);

    return () => {
      document.removeEventListener('drag', handleDrag);
      document.removeEventListener('dragend', handleDragEnd);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [draggedItem]);
};
