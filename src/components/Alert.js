import React from 'react';
import { AlertCircle, X } from 'lucide-react';

export const Alert = ({ alert, onClose }) => {
  const borderColor = alert.type === "error" ? "border-l-red-400"
    : alert.type === "warning" ? "border-l-amber-400"
    : "border-l-emerald-400";

  const textColor = alert.type === "error" ? "text-red-600"
    : alert.type === "warning" ? "text-amber-600"
    : "text-emerald-600";

  return (
    <div className={`mb-4 glass rounded-xl border-l-4 ${borderColor} flex items-start gap-3 p-4`}>
      <AlertCircle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${textColor}`} />
      <span className={`flex-1 text-sm ${textColor}`}>{alert.message}</span>
      <button onClick={onClose} className="flex-shrink-0 hover:bg-gray-100 rounded-lg p-1 transition-all duration-150">
        <X className="w-4 h-4 text-gray-400" />
      </button>
    </div>
  );
};
