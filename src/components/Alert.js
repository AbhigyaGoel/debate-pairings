import React from 'react';
import { AlertCircle, X } from 'lucide-react';

export const Alert = ({ alert, onClose }) => {
  const bgColor = alert.type === "error" ? "bg-red-50 text-red-800" 
    : alert.type === "warning" ? "bg-yellow-50 text-yellow-800" 
    : "bg-green-50 text-green-800";

  return (
    <div className={`mb-4 p-4 rounded-lg flex items-start gap-3 ${bgColor}`}>
      <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
      <span className="flex-1">{alert.message}</span>
      <button onClick={onClose} className="flex-shrink-0">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
