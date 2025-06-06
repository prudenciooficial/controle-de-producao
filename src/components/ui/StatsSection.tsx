
import React from 'react';

interface StatsSectionProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

const StatsSection: React.FC<StatsSectionProps> = ({ title, children, className = '' }) => {
  return (
    <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
};

export default StatsSection;
