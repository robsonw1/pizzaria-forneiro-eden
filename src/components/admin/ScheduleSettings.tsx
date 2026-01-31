import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useSettingsStore, WeekSchedule } from '@/store/useSettingsStore';
import { Clock, Power } from 'lucide-react';

const dayLabels: Record<keyof WeekSchedule, string> = {
  monday: 'Segunda-feira',
  tuesday: 'Terça-feira',
  wednesday: 'Quarta-feira',
  thursday: 'Quinta-feira',
  friday: 'Sexta-feira',
  saturday: 'Sábado',
  sunday: 'Domingo',
};

const dayOrder: (keyof WeekSchedule)[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

interface ScheduleSettingsProps {
  onScheduleChange?: (day: keyof WeekSchedule, updates: any) => void;
  onManualOpenToggle?: () => void;
}

export function ScheduleSettings({ onScheduleChange, onManualOpenToggle }: ScheduleSettingsProps) {
  const settings = useSettingsStore((s) => s.settings);
  const updateDaySchedule = useSettingsStore((s) => s.updateDaySchedule);
  const toggleManualOpen = useSettingsStore((s) => s.toggleManualOpen);
  const isStoreOpen = useSettingsStore((s) => s.isStoreOpen);

  const storeOpen = isStoreOpen();

  const handleDayScheduleChange = (day: keyof WeekSchedule, updates: any) => {
    updateDaySchedule(day, updates);
    onScheduleChange?.(day, updates);
  };

  const handleManualOpenToggle = () => {
    toggleManualOpen();
    onManualOpenToggle?.();
  };

  return (
    <div className="space-y-6">
      {/* Manual Open/Close Toggle */}
      <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-xl border">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            settings.isManuallyOpen ? 'bg-green-500/20' : 'bg-red-500/20'
          }`}>
            <Power className={`w-5 h-5 ${settings.isManuallyOpen ? 'text-green-500' : 'text-red-500'}`} />
          </div>
          <div>
            <p className="font-semibold">Estabelecimento</p>
            <p className="text-sm text-muted-foreground">
              {settings.isManuallyOpen ? 'Aberto para pedidos' : 'Fechado manualmente'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant={storeOpen ? 'default' : 'destructive'}>
            {storeOpen ? 'ABERTO AGORA' : 'FECHADO'}
          </Badge>
          <Button
            variant={settings.isManuallyOpen ? 'destructive' : 'default'}
            size="sm"
            onClick={handleManualOpenToggle}
          >
            {settings.isManuallyOpen ? 'Fechar Loja' : 'Abrir Loja'}
          </Button>
        </div>
      </div>

      {/* Schedule per day */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-primary" />
          <h4 className="font-semibold">Horário de Funcionamento por Dia</h4>
        </div>
        
        {dayOrder.map((day) => {
          const schedule = settings.schedule[day];
          return (
            <div 
              key={day} 
              className={`flex items-center justify-between p-3 rounded-lg border ${
                schedule.isOpen ? 'bg-card' : 'bg-secondary/30 opacity-60'
              }`}
            >
        <div className="flex items-center gap-4 flex-1">
                <Switch
                  checked={schedule.isOpen}
                  onCheckedChange={(checked) => handleDayScheduleChange(day, { isOpen: checked })}
                />
                <span className="font-medium w-32">{dayLabels[day]}</span>
              </div>
              
              {schedule.isOpen && (
                <div className="flex items-center gap-2">
                  <Input
                    type="time"
                    value={schedule.openTime}
                    onChange={(e) => handleDayScheduleChange(day, { openTime: e.target.value })}
                    className="w-28"
                  />
                  <span className="text-muted-foreground">às</span>
                  <Input
                    type="time"
                    value={schedule.closeTime}
                    onChange={(e) => handleDayScheduleChange(day, { closeTime: e.target.value })}
                    className="w-28"
                  />
                </div>
              )}
              
              {!schedule.isOpen && (
                <Badge variant="outline">Fechado</Badge>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
