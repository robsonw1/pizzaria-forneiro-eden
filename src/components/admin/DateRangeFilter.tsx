import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CalendarIcon } from 'lucide-react';
import { format, startOfDay, endOfDay, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type PresetOption = 
  | 'today'
  | 'yesterday'
  | 'last7days'
  | 'last30days'
  | 'last60days'
  | 'last90days'
  | 'thisMonth'
  | 'allTime'
  | 'custom';

const presetLabels: Record<PresetOption, string> = {
  today: 'Hoje',
  yesterday: 'Ontem',
  last7days: 'Últimos 7 dias',
  last30days: 'Últimos 30 dias',
  last60days: 'Últimos 60 dias',
  last90days: 'Últimos 90 dias',
  thisMonth: 'Este mês',
  allTime: 'Todo o período',
  custom: 'Personalizado',
};

interface DateRangeFilterProps {
  onRangeChange: (startDate: Date, endDate: Date) => void;
}

export function DateRangeFilter({ onRangeChange }: DateRangeFilterProps) {
  const [preset, setPreset] = useState<PresetOption>('today');
  const [customStart, setCustomStart] = useState<Date | undefined>(new Date());
  const [customEnd, setCustomEnd] = useState<Date | undefined>(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const getDateRange = (selectedPreset: PresetOption): { start: Date; end: Date } => {
    const now = new Date();
    
    switch (selectedPreset) {
      case 'today':
        return { start: startOfDay(now), end: endOfDay(now) };
      case 'yesterday':
        const yesterday = subDays(now, 1);
        return { start: startOfDay(yesterday), end: endOfDay(yesterday) };
      case 'last7days':
        return { start: startOfDay(subDays(now, 7)), end: endOfDay(now) };
      case 'last30days':
        return { start: startOfDay(subDays(now, 30)), end: endOfDay(now) };
      case 'last60days':
        return { start: startOfDay(subDays(now, 60)), end: endOfDay(now) };
      case 'last90days':
        return { start: startOfDay(subDays(now, 90)), end: endOfDay(now) };
      case 'thisMonth':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'allTime':
        return { start: new Date(2020, 0, 1), end: endOfDay(now) };
      case 'custom':
        return {
          start: customStart ? startOfDay(customStart) : startOfDay(now),
          end: customEnd ? endOfDay(customEnd) : endOfDay(now),
        };
      default:
        return { start: startOfDay(now), end: endOfDay(now) };
    }
  };

  const handlePresetChange = (value: PresetOption) => {
    setPreset(value);
    if (value !== 'custom') {
      const { start, end } = getDateRange(value);
      onRangeChange(start, end);
    }
  };

  const handleCustomDateChange = (date: Date | undefined, isStart: boolean) => {
    if (isStart) {
      setCustomStart(date);
      if (date && customEnd) {
        onRangeChange(startOfDay(date), endOfDay(customEnd));
      }
    } else {
      setCustomEnd(date);
      if (customStart && date) {
        onRangeChange(startOfDay(customStart), endOfDay(date));
      }
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select value={preset} onValueChange={(v) => handlePresetChange(v as PresetOption)}>
        <SelectTrigger className="w-[180px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(presetLabels).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {preset === 'custom' && (
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <CalendarIcon className="w-4 h-4" />
                {customStart ? format(customStart, 'dd/MM/yyyy', { locale: ptBR }) : 'Início'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={customStart}
                onSelect={(date) => handleCustomDateChange(date, true)}
                locale={ptBR}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <span className="text-muted-foreground">até</span>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <CalendarIcon className="w-4 h-4" />
                {customEnd ? format(customEnd, 'dd/MM/yyyy', { locale: ptBR }) : 'Fim'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={customEnd}
                onSelect={(date) => handleCustomDateChange(date, false)}
                locale={ptBR}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      )}
    </div>
  );
}
