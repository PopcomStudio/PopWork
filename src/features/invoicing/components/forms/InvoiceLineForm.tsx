"use client"

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Calculator, Save, X, AlertCircle } from 'lucide-react'
import type { InvoiceLine } from '@/shared/types/database'
import {
  calculateVATAmount,
  calculateAmountIncludingTax,
  formatAmount,
  roundAmount,
} from '../../utils/vat-calculator'

// Schéma de validation pour une ligne de facture
const invoiceLineSchema = z.object({
  description: z.string().min(1, 'La description est requise'),
  product_code: z.string().optional(),
  quantity: z.number().min(0.001, 'La quantité doit être supérieure à 0'),
  unit: z.string().min(1, 'L\'unité est requise'),
  unit_price_excluding_tax: z
    .number()
    .min(0, 'Le prix unitaire doit être positif'),
  discount_rate: z
    .number()
    .min(0, 'Le taux de remise doit être positif')
    .max(100, 'Le taux de remise ne peut pas dépasser 100%')
    .optional(),
  vat_rate: z.number().min(0, 'Le taux de TVA doit être positif'),
})

type InvoiceLineFormData = z.infer<typeof invoiceLineSchema>

interface InvoiceLineFormProps {
  mode: 'add' | 'edit'
  initialValues?: Partial<InvoiceLine>
  lineNumber: number
  onSubmit: (data: Omit<InvoiceLine, 'id' | 'invoice_id' | 'created_at' | 'updated_at'>) => void
  onCancel: () => void
}

// Unités de mesure courantes
const UNITS = [
  { value: 'unité', label: 'Unité' },
  { value: 'heure', label: 'Heure' },
  { value: 'jour', label: 'Jour' },
  { value: 'forfait', label: 'Forfait' },
  { value: 'kg', label: 'Kilogramme' },
  { value: 'm', label: 'Mètre' },
  { value: 'm²', label: 'Mètre carré' },
  { value: 'litre', label: 'Litre' },
  { value: 'lot', label: 'Lot' },
]

// Taux de TVA français
const VAT_RATES = [
  { value: 20, label: '20% (taux normal)' },
  { value: 10, label: '10% (taux intermédiaire)' },
  { value: 5.5, label: '5,5% (taux réduit)' },
  { value: 2.1, label: '2,1% (taux super réduit)' },
  { value: 0, label: '0% (exonéré)' },
]

export function InvoiceLineForm({
  mode,
  initialValues,
  lineNumber,
  onSubmit,
  onCancel,
}: InvoiceLineFormProps) {
  const [calculatedTotals, setCalculatedTotals] = useState({
    subtotalExcludingTax: 0,
    subtotalAfterDiscount: 0,
    vatAmount: 0,
    totalIncludingTax: 0,
  })

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<InvoiceLineFormData>({
    resolver: zodResolver(invoiceLineSchema),
    defaultValues: {
      description: initialValues?.description || '',
      product_code: initialValues?.product_code || '',
      quantity: initialValues?.quantity ? Number(initialValues.quantity) : 1,
      unit: initialValues?.unit || 'unité',
      unit_price_excluding_tax: initialValues?.unit_price_excluding_tax
        ? Number(initialValues.unit_price_excluding_tax)
        : 0,
      discount_rate: initialValues?.discount_rate
        ? Number(initialValues.discount_rate)
        : 0,
      vat_rate: initialValues?.vat_rate ? Number(initialValues.vat_rate) : 20,
    },
  })

  // Observer les changements pour recalculer les totaux
  const quantity = watch('quantity')
  const unitPrice = watch('unit_price_excluding_tax')
  const discountRate = watch('discount_rate') || 0
  const vatRate = watch('vat_rate')

  // Recalculer les totaux à chaque changement
  useEffect(() => {
    // Sous-total HT = quantité × prix unitaire
    const subtotal = roundAmount(quantity * unitPrice)

    // Montant de la remise
    const discountAmount = roundAmount(subtotal * (discountRate / 100))

    // Sous-total après remise
    const subtotalAfterDiscount = roundAmount(subtotal - discountAmount)

    // TVA
    const vat = calculateVATAmount(subtotalAfterDiscount, vatRate)

    // Total TTC
    const totalTTC = roundAmount(subtotalAfterDiscount + vat)

    setCalculatedTotals({
      subtotalExcludingTax: subtotal,
      subtotalAfterDiscount,
      vatAmount: vat,
      totalIncludingTax: totalTTC,
    })
  }, [quantity, unitPrice, discountRate, vatRate])

  const handleFormSubmit = (data: InvoiceLineFormData) => {
    // Calculer tous les montants pour la ligne
    const subtotalExcludingTax = roundAmount(data.quantity * data.unit_price_excluding_tax)
    const discountAmount = data.discount_rate
      ? roundAmount(subtotalExcludingTax * (data.discount_rate / 100))
      : 0
    const subtotalAfterDiscount = roundAmount(subtotalExcludingTax - discountAmount)
    const vatAmount = calculateVATAmount(subtotalAfterDiscount, data.vat_rate)
    const totalIncludingTax = roundAmount(subtotalAfterDiscount + vatAmount)

    // Construire l'objet ligne
    const lineData = {
      line_number: lineNumber,
      description: data.description,
      product_code: data.product_code || null,
      quantity: data.quantity,
      unit: data.unit,
      unit_price_excluding_tax: data.unit_price_excluding_tax,
      subtotal_excluding_tax: subtotalExcludingTax,
      discount_rate: data.discount_rate || null,
      discount_amount: discountAmount > 0 ? discountAmount : null,
      subtotal_after_discount: subtotalAfterDiscount,
      vat_rate: data.vat_rate,
      vat_amount: vatAmount,
      total_including_tax: totalIncludingTax,
    }

    onSubmit(lineData)
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {mode === 'add' ? `Ajouter une ligne` : `Modifier la ligne ${lineNumber}`}
        </h3>
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Calculator className="h-4 w-4" />
          <span>Calculs automatiques</span>
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">
          Description <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="description"
          {...register('description')}
          placeholder="Décrivez le produit ou service..."
          rows={3}
          className={errors.description ? 'border-destructive' : ''}
        />
        {errors.description && (
          <p className="text-sm text-destructive">{errors.description.message}</p>
        )}
      </div>

      {/* Code produit (optionnel) */}
      <div className="space-y-2">
        <Label htmlFor="product_code">Code produit</Label>
        <Input
          id="product_code"
          {...register('product_code')}
          placeholder="REF-001"
        />
      </div>

      {/* Grille : Quantité, Unité, Prix unitaire */}
      <div className="grid grid-cols-3 gap-4">
        {/* Quantité */}
        <div className="space-y-2">
          <Label htmlFor="quantity">
            Quantité <span className="text-destructive">*</span>
          </Label>
          <Input
            id="quantity"
            type="number"
            step="0.001"
            {...register('quantity', { valueAsNumber: true })}
            className={errors.quantity ? 'border-destructive' : ''}
          />
          {errors.quantity && (
            <p className="text-sm text-destructive">{errors.quantity.message}</p>
          )}
        </div>

        {/* Unité */}
        <div className="space-y-2">
          <Label htmlFor="unit">
            Unité <span className="text-destructive">*</span>
          </Label>
          <Select
            onValueChange={(value) => setValue('unit', value)}
            defaultValue={watch('unit')}
          >
            <SelectTrigger className={errors.unit ? 'border-destructive' : ''}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {UNITS.map((unit) => (
                <SelectItem key={unit.value} value={unit.value}>
                  {unit.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.unit && (
            <p className="text-sm text-destructive">{errors.unit.message}</p>
          )}
        </div>

        {/* Prix unitaire HT */}
        <div className="space-y-2">
          <Label htmlFor="unit_price_excluding_tax">
            Prix unitaire HT <span className="text-destructive">*</span>
          </Label>
          <Input
            id="unit_price_excluding_tax"
            type="number"
            step="0.01"
            {...register('unit_price_excluding_tax', { valueAsNumber: true })}
            className={errors.unit_price_excluding_tax ? 'border-destructive' : ''}
          />
          {errors.unit_price_excluding_tax && (
            <p className="text-sm text-destructive">
              {errors.unit_price_excluding_tax.message}
            </p>
          )}
        </div>
      </div>

      {/* Grille : Remise, TVA */}
      <div className="grid grid-cols-2 gap-4">
        {/* Remise (%) */}
        <div className="space-y-2">
          <Label htmlFor="discount_rate">Remise (%)</Label>
          <Input
            id="discount_rate"
            type="number"
            step="0.01"
            min="0"
            max="100"
            {...register('discount_rate', { valueAsNumber: true })}
            placeholder="0"
            className={errors.discount_rate ? 'border-destructive' : ''}
          />
          {errors.discount_rate && (
            <p className="text-sm text-destructive">{errors.discount_rate.message}</p>
          )}
        </div>

        {/* Taux de TVA */}
        <div className="space-y-2">
          <Label htmlFor="vat_rate">
            Taux de TVA <span className="text-destructive">*</span>
          </Label>
          <Select
            onValueChange={(value) => setValue('vat_rate', Number(value))}
            defaultValue={watch('vat_rate').toString()}
          >
            <SelectTrigger className={errors.vat_rate ? 'border-destructive' : ''}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VAT_RATES.map((rate) => (
                <SelectItem key={rate.value} value={rate.value.toString()}>
                  {rate.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.vat_rate && (
            <p className="text-sm text-destructive">{errors.vat_rate.message}</p>
          )}
        </div>
      </div>

      {/* Calculs en temps réel */}
      <Alert>
        <Calculator className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-1 font-mono text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sous-total HT:</span>
              <span className="font-medium">
                {formatAmount(calculatedTotals.subtotalExcludingTax)}
              </span>
            </div>
            {discountRate > 0 && (
              <div className="flex justify-between text-orange-600">
                <span>Remise ({discountRate}%):</span>
                <span>
                  -
                  {formatAmount(
                    calculatedTotals.subtotalExcludingTax -
                      calculatedTotals.subtotalAfterDiscount
                  )}
                </span>
              </div>
            )}
            {discountRate > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sous-total après remise:</span>
                <span className="font-medium">
                  {formatAmount(calculatedTotals.subtotalAfterDiscount)}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">TVA ({vatRate}%):</span>
              <span className="font-medium">
                {formatAmount(calculatedTotals.vatAmount)}
              </span>
            </div>
            <div className="flex justify-between border-t pt-1">
              <span className="font-semibold">Total TTC:</span>
              <span className="font-bold text-lg">
                {formatAmount(calculatedTotals.totalIncludingTax)}
              </span>
            </div>
          </div>
        </AlertDescription>
      </Alert>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          <X className="mr-2 h-4 w-4" />
          Annuler
        </Button>
        <Button type="submit">
          <Save className="mr-2 h-4 w-4" />
          {mode === 'add' ? 'Ajouter la ligne' : 'Enregistrer'}
        </Button>
      </div>
    </form>
  )
}
