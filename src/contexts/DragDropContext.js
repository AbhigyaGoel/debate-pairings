import React, { createContext, useContext, useState } from 'react';

const DragDropContext = createContext();

export const useDragDrop = () => {
  const context = useContext(DragDropContext);
  if (!context) {
    throw new Error('useDragDrop must be used within DragDropProvider');
  }
  return context;
};

export const DragDropProvider = ({ children }) => {
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverTarget, setDragOverTarget] = useState(null);

  return (
    <DragDropContext.Provider value={{ 
      draggedItem, 
      setDraggedItem, 
      dragOverTarget, 
      setDragOverTarget 
    }}>
      {children}
    </DragDropContext.Provider>
  );
};
