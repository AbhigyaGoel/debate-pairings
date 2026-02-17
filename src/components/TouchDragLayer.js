import { useEffect, useRef, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDragDrop } from '../contexts/DragDropContext';

function findDropTarget(x, y) {
  const el = document.elementFromPoint(x, y);
  let node = el;
  while (node) {
    if (node.dataset?.dropType) {
      const target = { type: node.dataset.dropType };
      if (node.dataset.dropChamber !== undefined)
        target.chamberIdx = parseInt(node.dataset.dropChamber);
      if (node.dataset.dropPosition)
        target.position = node.dataset.dropPosition;
      if (node.dataset.dropMember !== undefined)
        target.memberIdx = parseInt(node.dataset.dropMember);
      return target;
    }
    node = node.parentElement;
  }
  return null;
}

export const TouchDragLayer = ({ onDrop }) => {
  const { draggedItem, setDraggedItem, setDragOverTarget, touchStartRef } = useDragDrop();
  const [ghost, setGhost] = useState(null);
  const dragActiveRef = useRef(false);
  const onDropRef = useRef(onDrop);
  const draggedItemRef = useRef(draggedItem);
  const dropTargetRef = useRef(null);
  const scrollFrameRef = useRef(null);

  useEffect(() => { onDropRef.current = onDrop; }, [onDrop]);
  useEffect(() => { draggedItemRef.current = draggedItem; }, [draggedItem]);

  const startAutoScroll = useCallback((clientY) => {
    if (scrollFrameRef.current) cancelAnimationFrame(scrollFrameRef.current);
    const EDGE_ZONE = 80;
    const MAX_SPEED = 15;
    const viewportH = window.innerHeight;

    const tick = () => {
      let speed = 0;
      if (clientY < EDGE_ZONE) {
        speed = -MAX_SPEED * (1 - clientY / EDGE_ZONE);
      } else if (clientY > viewportH - EDGE_ZONE) {
        speed = MAX_SPEED * (1 - (viewportH - clientY) / EDGE_ZONE);
      }
      if (speed !== 0) {
        window.scrollBy(0, speed);
        scrollFrameRef.current = requestAnimationFrame(tick);
      } else {
        scrollFrameRef.current = null;
      }
    };
    tick();
  }, []);

  const stopAutoScroll = useCallback(() => {
    if (scrollFrameRef.current) {
      cancelAnimationFrame(scrollFrameRef.current);
      scrollFrameRef.current = null;
    }
  }, []);

  useEffect(() => {
    const handleTouchMove = (e) => {
      const pending = touchStartRef.current;
      if (!pending && !dragActiveRef.current) return;

      const touch = e.touches[0];
      const { clientX, clientY } = touch;

      if (!dragActiveRef.current && pending) {
        const dx = clientX - pending.x;
        const dy = clientY - pending.y;
        if (Math.sqrt(dx * dx + dy * dy) < 10) return;

        // Activate drag
        dragActiveRef.current = true;
        const item = { type: pending.dragType, ...pending.data };
        setDraggedItem(item);
        draggedItemRef.current = item;
        touchStartRef.current = null;

        const name = pending.dragType === 'team'
          ? pending.data.team?.members?.map(m => m.name).join(' & ') || 'Team'
          : pending.data.person?.name || 'Person';
        setGhost({ x: clientX, y: clientY, name });
      }

      if (dragActiveRef.current) {
        e.preventDefault();
        setGhost(prev => prev ? { ...prev, x: clientX, y: clientY } : null);

        // Hide ghost momentarily to let elementFromPoint find what's underneath
        const ghostEl = document.getElementById('touch-drag-ghost');
        if (ghostEl) ghostEl.style.display = 'none';
        const target = findDropTarget(clientX, clientY);
        if (ghostEl) ghostEl.style.display = '';

        dropTargetRef.current = target;
        setDragOverTarget(target);
        startAutoScroll(clientY);
      }
    };

    const handleTouchEnd = () => {
      stopAutoScroll();

      if (dragActiveRef.current && dropTargetRef.current && onDropRef.current) {
        // Create a synthetic event with preventDefault/stopPropagation
        const syntheticEvent = {
          preventDefault: () => {},
          stopPropagation: () => {},
        };
        onDropRef.current(syntheticEvent, dropTargetRef.current);
      }

      // Clean up all state
      dragActiveRef.current = false;
      touchStartRef.current = null;
      dropTargetRef.current = null;
      setGhost(null);
      setDraggedItem(null);
      setDragOverTarget(null);
    };

    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
    document.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchcancel', handleTouchEnd);
      stopAutoScroll();
    };
  }, [setDraggedItem, setDragOverTarget, touchStartRef, startAutoScroll, stopAutoScroll]);

  if (!ghost) return null;

  return createPortal(
    <div
      id="touch-drag-ghost"
      style={{
        position: 'fixed',
        left: ghost.x,
        top: ghost.y,
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        zIndex: 9999,
        background: '#4f46e5',
        color: 'white',
        padding: '6px 14px',
        borderRadius: '9999px',
        fontSize: '13px',
        fontWeight: 600,
        boxShadow: '0 4px 12px rgba(79,70,229,0.4)',
        whiteSpace: 'nowrap',
        opacity: 0.95,
      }}
    >
      {ghost.name}
    </div>,
    document.body
  );
};
