import { FlaskConicalIcon } from 'lucide-react'
import { useId, useState } from 'react'

import { Button } from '@/shared/ui/button'
import { Label } from '@/shared/ui/label'
import { RadioGroup, RadioGroupItem } from '@/shared/ui/radio-group'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/shared/ui/sheet'

/**
 * Demo control for the simulated backend (present whenever mocks are on, including the
 * deployed demo): switch scenario, restore the seed data. Same API Playwright uses.
 */
export function MockPanel() {
  const control = window.__kurioMock
  const [scenario, setScenario] = useState(control?.scenario ?? 'default')
  const groupId = useId()
  if (!control) return null

  function apply() {
    control?.setScenario(scenario)
    window.location.reload()
  }

  function reset() {
    control?.reset()
    window.location.reload()
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="secondary"
          size="sm"
          className="fixed bottom-24 left-4 z-50 border-border-soft shadow-lg md:bottom-4"
        >
          <FlaskConicalIcon />
          Cenários
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Cenários do mock</SheetTitle>
          <SheetDescription>
            Simula rede e servidor. Credenciais: nova@kurio.art ou kai@kurio.art, senha kurio1234.
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-4 px-4 pb-6">
          <RadioGroup
            aria-labelledby={groupId}
            value={scenario}
            onValueChange={setScenario}
            className="gap-3"
          >
            <p id={groupId} className="text-body font-bold">
              Cenário ativo: {control.scenario}
            </p>
            {control.scenarios.map(({ name, description }) => (
              <div key={name} className="flex items-start gap-3">
                <RadioGroupItem id={`${groupId}-${name}`} value={name} className="mt-0.5" />
                <Label htmlFor={`${groupId}-${name}`} className="flex flex-col items-start gap-0.5">
                  <span className="font-bold">{name}</span>
                  <span className="text-caption font-normal text-muted-foreground">
                    {description}
                  </span>
                </Label>
              </div>
            ))}
          </RadioGroup>
          <Button onClick={apply}>Aplicar e recarregar</Button>
          <Button variant="outline" onClick={reset}>
            Restaurar dados iniciais
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
