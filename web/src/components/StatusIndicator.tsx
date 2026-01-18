import React from 'react';

export interface StatusIndicatorProps {
  status: string;
  isConnected: boolean;
  message?: string;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  isConnected,
  message,
}) => {
  const getStatusColor = () => {
    if (isConnected) return 'bg-green-500';
    if (status.includes('error')) return 'bg-red-500';
    return 'bg-yellow-500';
  };

  const getStatusText = () => {
    if (isConnected) return 'Connected';
    if (status.includes('error')) return 'Error';
    if (status.includes('connecting')) return 'Connecting...';
    return 'Disconnected';
  };

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-gray-800 border-b border-gray-700">
      <div className={`w-3 h-3 rounded-full ${getStatusColor()} animate-pulse`} />
      <span className="text-sm text-gray-300">
        {getStatusText()}
      </span>
      {message && (
        <span className="text-xs text-gray-500 ml-2">
          {message}
        </span>
      )}
    </div>
  );
};
