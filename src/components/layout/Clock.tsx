
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Clock as ClockIcon } from "lucide-react";

export function Clock() {
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, []);

  return (
    <div className="flex items-center text-sm">
      <ClockIcon className="mr-2 h-4 w-4" />
      <span className="hidden sm:inline">
        {format(currentDateTime, "dd/MM/yyyy | HH:mm:ss")}
      </span>
      <span className="sm:hidden">
        {format(currentDateTime, "HH:mm:ss")}
      </span>
    </div>
  );
}
