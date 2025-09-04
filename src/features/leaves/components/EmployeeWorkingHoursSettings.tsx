'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { useFrenchLeaveCalculator } from '../hooks/use-french-leave-calculator'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Clock, Info, Calculator, Save } from 'lucide-react'
import { calculateRttDays, getFrenchReferenceYear } from '../utils/french-leave-calculator'

interface WorkingHoursSettingsProps {
  onUpdate?: () => void
}

export function EmployeeWorkingHoursSettings({ onUpdate }: WorkingHoursSettingsProps) {
  const { user } = useAuth()
  const { updateEmployeeWorkingHours, loading, error } = useFrenchLeaveCalculator()
  
  const [workingHoursPerWeek, setWorkingHoursPerWeek] = useState<number>(35)
  const [contractType, setContractType] = useState<string>('full_time')
  const [hasChanges, setHasChanges] = useState(false)
  const [calculatedRttDays, setCalculatedRttDays] = useState(0)

  useEffect(() => {
    if (user) {
      setWorkingHoursPerWeek(user.workingHoursPerWeek || 35)
      setContractType(user.contractType || 'full_time')
    }
  }, [user])

  useEffect(() => {
    const { start, end } = getFrenchReferenceYear()
    const rttDays = calculateRttDays({
      hireDate: user?.createdAt || new Date().toISOString(),
      workingHoursPerWeek,
      referenceYearStart: start,
      referenceYearEnd: end
    })
    setCalculatedRttDays(rttDays)
  }, [workingHoursPerWeek, user])

  const handleSave = async () => {
    if (!user) return

    const success = await updateEmployeeWorkingHours(user.id, workingHoursPerWeek)
    if (success) {
      setHasChanges(false)
      onUpdate?.()
    }
  }

  const handleWorkingHoursChange = (value: string) => {
    const hours = parseFloat(value)
    if (!isNaN(hours) && hours >= 1 && hours <= 60) {
      setWorkingHoursPerWeek(hours)
      setHasChanges(true)
    }
  }

  const getRttExplanation = () => {
    if (workingHoursPerWeek <= 35) {
      return "Aucun RTT accordé pour un temps de travail ≤ 35h/semaine"
    }
    
    const extraHours = workingHoursPerWeek - 35
    return `${extraHours}h supplémentaires par semaine = ${calculatedRttDays} jours RTT par an`
  }

  const contractTypeLabels = {
    full_time: 'Temps plein',
    part_time: 'Temps partiel',
    intern: 'Stagiaire',
    freelance: 'Freelance'
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Configuration du temps de travail
          </CardTitle>
          <CardDescription>
            Configurez vos horaires de travail pour calculer automatiquement vos droits aux congés et RTT selon le code du travail français.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="working-hours">Heures de travail par semaine</Label>
              <Input
                id="working-hours"
                type="number"
                min="1"
                max="60"
                step="0.5"
                value={workingHoursPerWeek}
                onChange={(e) => handleWorkingHoursChange(e.target.value)}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Durée légale : 35h/semaine. Au-delà, des RTT sont accordés.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contract-type">Type de contrat</Label>
              <Select value={contractType} onValueChange={setContractType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(contractTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* RTT Calculation Preview */}
          <Alert>
            <Calculator className="h-4 w-4" />
            <AlertDescription>
              <div className="flex items-center justify-between">
                <span>{getRttExplanation()}</span>
                {calculatedRttDays > 0 && (
                  <Badge variant="secondary">
                    {calculatedRttDays} jours RTT/an
                  </Badge>
                )}
              </div>
            </AlertDescription>
          </Alert>

          {/* French Labor Law Information */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
              <Info className="h-4 w-4" />
              Informations légales
            </h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Durée légale : 35 heures par semaine</li>
              <li>• Congés payés : 2,5 jours par mois travaillé (max 30 jours/an)</li>
              <li>• RTT : compensation pour heures &gt; 35h/semaine</li>
              <li>• Période de référence : du 1er juin au 31 mai</li>
              <li>• Les congés non posés avant le 31 mai sont perdus</li>
            </ul>
          </div>

          {hasChanges && (
            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={loading}>
                <Save className="mr-2 h-4 w-4" />
                {loading ? 'Enregistrement...' : 'Enregistrer les modifications'}
              </Button>
            </div>
          )}

          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertDescription className="text-red-700">
                {error}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Current Entitlements Summary */}
      {user && (
        <Card>
          <CardHeader>
            <CardTitle>Résumé de vos droits</CardTitle>
            <CardDescription>
              Basé sur vos paramètres actuels et la législation française
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-700">30</div>
                <div className="text-sm text-green-600">jours de congés payés maximum</div>
                <div className="text-xs text-muted-foreground mt-1">
                  (si 12 mois travaillés)
                </div>
              </div>
              
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-700">{calculatedRttDays}</div>
                <div className="text-sm text-blue-600">jours RTT par an</div>
                <div className="text-xs text-muted-foreground mt-1">
                  ({workingHoursPerWeek}h/sem)
                </div>
              </div>
              
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-700">35</div>
                <div className="text-sm text-orange-600">heures légales</div>
                <div className="text-xs text-muted-foreground mt-1">
                  par semaine
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}