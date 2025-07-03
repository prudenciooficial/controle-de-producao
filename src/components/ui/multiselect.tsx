import React from 'react';
import { Check, ChevronDown } from 'lucide-react';

interface Option {
  label: string;
  value: string;
}

interface MultiSelectProps {
  options: Option[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  className?: string;
}

export const MultiSelect: React.FC<MultiSelectProps> = ({ options, value, onChange, placeholder, className }) => {
  const [open, setOpen] = React.useState(false);
  const toggleOption = (val: string) => {
    if (value.includes(val)) {
      onChange(value.filter(v => v !== val));
    } else {
      onChange([...value, val]);
    }
  };
  const display = value.length === 0 ? (placeholder || 'Selecione') : options.filter(o => value.includes(o.value)).map(o => o.label).join(', ');

  return (
    <div className={`relative w-full ${className || ''}`}>  
      <button
        type="button"
        className={
          'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1 transition-colors' +
          (open ? ' ring-2 ring-blue-500' : '')
        }
        onClick={() => setOpen(o => !o)}
        style={{ minHeight: 40 }}
      >
        <span className={value.length === 0 ? 'text-muted-foreground' : ''}>{display}</span>
        <ChevronDown className="h-4 w-4 opacity-50 ml-2" />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-popover text-popover-foreground border border-input rounded-md shadow-md max-h-60 overflow-auto data-[state=open]:animate-in">
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              className={`relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground ${value.includes(opt.value) ? 'font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30' : ''}`}
              onClick={() => toggleOption(opt.value)}
            >
              <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                {value.includes(opt.value) && <Check className="h-4 w-4 text-blue-600 dark:text-blue-300" />}
              </span>
              <span className="flex-1 text-left">{opt.label}</span>
            </button>
          ))}
        </div>
      )}
      {open && (
        <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
      )}
    </div>
  );
}; 