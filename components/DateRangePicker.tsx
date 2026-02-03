import { useState, useRef, useEffect } from "react";
import { Calendar, ChevronDown, X } from "lucide-react";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths } from "date-fns";
import { cn } from "@/lib/utils";

export type DateRange = {
    start: Date | null;
    end: Date | null;
    label: string;
};

interface DateRangePickerProps {
    value: DateRange;
    onChange: (range: DateRange) => void;
}

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const presets = [
        {
            label: "Hoy",
            action: () => {
                const now = new Date();
                onChange({ start: now, end: now, label: "Hoy" });
            }
        },
        {
            label: "Esta Semana",
            action: () => {
                const now = new Date();
                onChange({ start: startOfWeek(now), end: endOfWeek(now), label: "Esta Semana" });
            }
        },
        {
            label: "Este Mes",
            action: () => {
                const now = new Date();
                onChange({ start: startOfMonth(now), end: endOfMonth(now), label: "Este Mes" });
            }
        },
        {
            label: "Mes Pasado",
            action: () => {
                const now = new Date();
                const lastMonth = subMonths(now, 1);
                onChange({ start: startOfMonth(lastMonth), end: endOfMonth(lastMonth), label: "Mes Pasado" });
            }
        },
        {
            label: "Este Año",
            action: () => {
                const now = new Date();
                onChange({ start: startOfYear(now), end: endOfYear(now), label: "Este Año" });
            }
        },
        {
            label: "Todo el Historial",
            action: () => {
                onChange({ start: null, end: null, label: "Todo" });
            }
        }
    ];

    const handleCustomDateChange = (type: "start" | "end", dateStr: string) => {
        if (!dateStr) return;
        const newDate = new Date(dateStr);
        // Adjust time to ensure inclusive range
        if (type === "start") newDate.setHours(0, 0, 0, 0);
        if (type === "end") newDate.setHours(23, 59, 59, 999);

        const newRange = {
            ...value,
            [type]: newDate,
            label: "Personalizado"
        };
        onChange(newRange);
    };

    return (
        <div className="relative" ref={containerRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="btn-secondary flex items-center gap-2 min-w-[200px] justify-between"
            >
                <div className="flex items-center gap-2 text-sm">
                    <Calendar size={18} className="text-muted-foreground" />
                    <span>{value.label}</span>
                </div>
                <ChevronDown size={14} className={cn("transition-transform", isOpen ? "rotate-180" : "")} />
            </button>

            {isOpen && (
                <div className="absolute right-0 top-12 z-50 w-[320px] bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-2 grid grid-cols-2 gap-1 border-b border-[var(--border)] bg-[var(--muted)]/30">
                        {presets.map((preset) => (
                            <button
                                key={preset.label}
                                onClick={() => {
                                    preset.action();
                                    setIsOpen(false);
                                }}
                                className={cn(
                                    "px-3 py-2 rounded-lg text-xs font-medium text-left transition-colors hover:bg-[var(--card)]",
                                    value.label === preset.label ? "bg-[var(--primary)] text-white hover:bg-[var(--primary)]" : "text-muted-foreground"
                                )}
                            >
                                {preset.label}
                            </button>
                        ))}
                    </div>

                    <div className="p-4 space-y-4 bg-[var(--card)]">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Rango Personalizado</p>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-[10px] uppercase font-bold text-muted-foreground">Desde</label>
                                <input
                                    type="date"
                                    className="w-full input-premium py-1 text-sm"
                                    value={value.start ? value.start.toISOString().split("T")[0] : ""}
                                    onChange={(e) => handleCustomDateChange("start", e.target.value)}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] uppercase font-bold text-muted-foreground">Hasta</label>
                                <input
                                    type="date"
                                    className="w-full input-premium py-1 text-sm"
                                    value={value.end ? value.end.toISOString().split("T")[0] : ""}
                                    onChange={(e) => handleCustomDateChange("end", e.target.value)}
                                />
                            </div>
                        </div>
                        {value.label === "Personalizado" && (
                            <button
                                onClick={() => setIsOpen(false)}
                                className="w-full btn-primary py-2 text-xs"
                            >
                                Aplicar Filtro
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
