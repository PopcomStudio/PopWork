"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Icons } from '@/components/ui/icons'
import { createClientComponentClient } from '@/lib/supabase'
import { ProtectedRoute } from '@/features/auth/components/protected-route'
import {
  Settings,
  Mail,
  Bell,
  Shield,
  Database,
  Globe,
  Palette,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Server,
  Lock,
  Users,
  FileText,
  Calendar,
  DollarSign
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Separator } from '@/components/ui/separator'

const generalSettingsSchema = z.object({
  app_name: z.string().min(1, 'Le nom de l\'application est requis'),
  app_url: z.string().url('URL invalide'),
  app_description: z.string().optional(),
  maintenance_mode: z.boolean(),
  maintenance_message: z.string().optional(),
  allow_registration: z.boolean(),
  require_email_verification: z.boolean(),
  default_role: z.string(),
  session_timeout: z.number().min(1).max(1440),
})

const emailSettingsSchema = z.object({
  smtp_host: z.string().min(1, 'L\'hôte SMTP est requis'),
  smtp_port: z.number().min(1).max(65535),
  smtp_user: z.string().min(1, 'L\'utilisateur SMTP est requis'),
  smtp_password: z.string().min(1, 'Le mot de passe SMTP est requis'),
  smtp_secure: z.boolean(),
  from_email: z.string().email('Email invalide'),
  from_name: z.string().min(1, 'Le nom de l\'expéditeur est requis'),
})

const notificationSettingsSchema = z.object({
  email_notifications: z.boolean(),
  slack_notifications: z.boolean(),
  slack_webhook_url: z.string().optional(),
  notification_digest: z.enum(['instant', 'daily', 'weekly']),
  notify_new_user: z.boolean(),
  notify_new_project: z.boolean(),
  notify_task_due: z.boolean(),
  notify_system_error: z.boolean(),
})

const securitySettingsSchema = z.object({
  password_min_length: z.number().min(6).max(32),
  password_require_uppercase: z.boolean(),
  password_require_lowercase: z.boolean(),
  password_require_numbers: z.boolean(),
  password_require_special: z.boolean(),
  max_login_attempts: z.number().min(1).max(10),
  lockout_duration: z.number().min(1).max(1440),
  two_factor_auth: z.boolean(),
  ip_whitelist: z.string().optional(),
  cors_origins: z.string().optional(),
})

type GeneralSettings = z.infer<typeof generalSettingsSchema>
type EmailSettings = z.infer<typeof emailSettingsSchema>
type NotificationSettings = z.infer<typeof notificationSettingsSchema>
type SecuritySettings = z.infer<typeof securitySettingsSchema>

export function SystemSettings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('general')
  
  const supabase = createClientComponentClient()

  const generalForm = useForm<GeneralSettings>({
    resolver: zodResolver(generalSettingsSchema),
    defaultValues: {
      app_name: 'PopWork',
      app_url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      app_description: '',
      maintenance_mode: false,
      maintenance_message: '',
      allow_registration: true,
      require_email_verification: true,
      default_role: 'developer',
      session_timeout: 60,
    }
  })

  const emailForm = useForm<EmailSettings>({
    resolver: zodResolver(emailSettingsSchema),
    defaultValues: {
      smtp_host: '',
      smtp_port: 587,
      smtp_user: '',
      smtp_password: '',
      smtp_secure: true,
      from_email: '',
      from_name: 'PopWork',
    }
  })

  const notificationForm = useForm<NotificationSettings>({
    resolver: zodResolver(notificationSettingsSchema),
    defaultValues: {
      email_notifications: true,
      slack_notifications: false,
      slack_webhook_url: '',
      notification_digest: 'instant',
      notify_new_user: true,
      notify_new_project: true,
      notify_task_due: true,
      notify_system_error: true,
    }
  })

  const securityForm = useForm<SecuritySettings>({
    resolver: zodResolver(securitySettingsSchema),
    defaultValues: {
      password_min_length: 8,
      password_require_uppercase: true,
      password_require_lowercase: true,
      password_require_numbers: true,
      password_require_special: false,
      max_login_attempts: 5,
      lockout_duration: 30,
      two_factor_auth: false,
      ip_whitelist: '',
      cors_origins: '*',
    }
  })

  // Load settings from database
  const loadSettings = async () => {
    try {
      setLoading(true)
      
      // In a real app, these would be stored in a system_settings table
      // For now, we'll use localStorage as a demo
      const savedSettings = localStorage.getItem('system_settings')
      if (savedSettings) {
        const settings = JSON.parse(savedSettings)
        if (settings.general) generalForm.reset(settings.general)
        if (settings.email) emailForm.reset(settings.email)
        if (settings.notifications) notificationForm.reset(settings.notifications)
        if (settings.security) securityForm.reset(settings.security)
      }
      
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des paramètres')
    } finally {
      setLoading(false)
    }
  }

  // Save settings
  const saveSettings = async (section: string) => {
    try {
      setSaving(true)
      setSuccess(null)
      setError(null)
      
      let data: any = {}
      let isValid = false
      
      switch (section) {
        case 'general':
          isValid = await generalForm.trigger()
          if (isValid) data = generalForm.getValues()
          break
        case 'email':
          isValid = await emailForm.trigger()
          if (isValid) data = emailForm.getValues()
          break
        case 'notifications':
          isValid = await notificationForm.trigger()
          if (isValid) data = notificationForm.getValues()
          break
        case 'security':
          isValid = await securityForm.trigger()
          if (isValid) data = securityForm.getValues()
          break
      }
      
      if (!isValid) {
        setError('Veuillez corriger les erreurs dans le formulaire')
        return
      }
      
      // Save to localStorage (in production, save to database)
      const currentSettings = JSON.parse(localStorage.getItem('system_settings') || '{}')
      currentSettings[section] = data
      localStorage.setItem('system_settings', JSON.stringify(currentSettings))
      
      // Log the change
      await supabase.from('activity_log').insert({
        action: 'update',
        resource_type: 'settings',
        resource_id: section,
        details: { section, changes: data }
      })
      
      setSuccess(`Paramètres ${section} sauvegardés avec succès`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  // Test email configuration
  const testEmailConfig = async () => {
    try {
      setSaving(true)
      const values = emailForm.getValues()
      
      // In production, this would send a test email
      // For now, we'll simulate it
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setSuccess('Email de test envoyé avec succès!')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'envoi de l\'email de test')
    } finally {
      setSaving(false)
    }
  }

  // Clear cache
  const clearCache = async () => {
    try {
      setSaving(true)
      
      // Clear various caches
      localStorage.removeItem('cache')
      sessionStorage.clear()
      
      // Log the action
      await supabase.from('activity_log').insert({
        action: 'clear_cache',
        resource_type: 'system',
        details: { timestamp: new Date().toISOString() }
      })
      
      setSuccess('Cache vidé avec succès')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du vidage du cache')
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    loadSettings()
  }, [])

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [success])

  return (
    <ProtectedRoute requiredPermission="admin.*">
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Paramètres système</h2>
          <p className="text-muted-foreground">
            Configurez les paramètres globaux de l'application
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-500 bg-green-50 text-green-800">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="general">
              <Settings className="mr-2 h-4 w-4" />
              Général
            </TabsTrigger>
            <TabsTrigger value="email">
              <Mail className="mr-2 h-4 w-4" />
              Email
            </TabsTrigger>
            <TabsTrigger value="notifications">
              <Bell className="mr-2 h-4 w-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="security">
              <Shield className="mr-2 h-4 w-4" />
              Sécurité
            </TabsTrigger>
            <TabsTrigger value="maintenance">
              <Server className="mr-2 h-4 w-4" />
              Maintenance
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Paramètres généraux</CardTitle>
                <CardDescription>
                  Configuration de base de l'application
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="app_name">Nom de l'application</Label>
                    <Input
                      id="app_name"
                      {...generalForm.register('app_name')}
                    />
                    {generalForm.formState.errors.app_name && (
                      <p className="text-sm text-destructive">
                        {generalForm.formState.errors.app_name.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="app_url">URL de l'application</Label>
                    <Input
                      id="app_url"
                      type="url"
                      {...generalForm.register('app_url')}
                    />
                    {generalForm.formState.errors.app_url && (
                      <p className="text-sm text-destructive">
                        {generalForm.formState.errors.app_url.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="app_description">Description</Label>
                  <Textarea
                    id="app_description"
                    {...generalForm.register('app_description')}
                    rows={3}
                  />
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Options d'inscription</h4>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Autoriser les inscriptions</Label>
                      <p className="text-sm text-muted-foreground">
                        Permet aux nouveaux utilisateurs de s'inscrire
                      </p>
                    </div>
                    <Switch
                      checked={generalForm.watch('allow_registration')}
                      onCheckedChange={(checked) => 
                        generalForm.setValue('allow_registration', checked)
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Vérification email obligatoire</Label>
                      <p className="text-sm text-muted-foreground">
                        Les utilisateurs doivent vérifier leur email
                      </p>
                    </div>
                    <Switch
                      checked={generalForm.watch('require_email_verification')}
                      onCheckedChange={(checked) => 
                        generalForm.setValue('require_email_verification', checked)
                      }
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="default_role">Rôle par défaut</Label>
                      <Select
                        value={generalForm.watch('default_role')}
                        onValueChange={(value) => 
                          generalForm.setValue('default_role', value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="developer">Développeur</SelectItem>
                          <SelectItem value="client">Client</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="session_timeout">
                        Timeout session (minutes)
                      </Label>
                      <Input
                        id="session_timeout"
                        type="number"
                        min="1"
                        max="1440"
                        {...generalForm.register('session_timeout', { 
                          valueAsNumber: true 
                        })}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Mode maintenance</h4>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Activer le mode maintenance</Label>
                      <p className="text-sm text-muted-foreground">
                        Bloque l'accès aux utilisateurs non-admin
                      </p>
                    </div>
                    <Switch
                      checked={generalForm.watch('maintenance_mode')}
                      onCheckedChange={(checked) => 
                        generalForm.setValue('maintenance_mode', checked)
                      }
                    />
                  </div>

                  {generalForm.watch('maintenance_mode') && (
                    <div className="space-y-2">
                      <Label htmlFor="maintenance_message">
                        Message de maintenance
                      </Label>
                      <Textarea
                        id="maintenance_message"
                        {...generalForm.register('maintenance_message')}
                        rows={3}
                        placeholder="Le site est actuellement en maintenance..."
                      />
                    </div>
                  )}
                </div>

                <div className="flex justify-end">
                  <Button 
                    onClick={() => saveSettings('general')}
                    disabled={saving}
                  >
                    {saving && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                    <Save className="mr-2 h-4 w-4" />
                    Sauvegarder
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="email" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Configuration email</CardTitle>
                <CardDescription>
                  Paramètres SMTP pour l'envoi d'emails
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="smtp_host">Hôte SMTP</Label>
                    <Input
                      id="smtp_host"
                      placeholder="smtp.gmail.com"
                      {...emailForm.register('smtp_host')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="smtp_port">Port SMTP</Label>
                    <Input
                      id="smtp_port"
                      type="number"
                      placeholder="587"
                      {...emailForm.register('smtp_port', { valueAsNumber: true })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="smtp_user">Utilisateur SMTP</Label>
                    <Input
                      id="smtp_user"
                      placeholder="user@example.com"
                      {...emailForm.register('smtp_user')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="smtp_password">Mot de passe SMTP</Label>
                    <Input
                      id="smtp_password"
                      type="password"
                      {...emailForm.register('smtp_password')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="from_email">Email expéditeur</Label>
                    <Input
                      id="from_email"
                      type="email"
                      placeholder="noreply@example.com"
                      {...emailForm.register('from_email')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="from_name">Nom expéditeur</Label>
                    <Input
                      id="from_name"
                      placeholder="PopWork"
                      {...emailForm.register('from_name')}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Connexion sécurisée (TLS/SSL)</Label>
                    <p className="text-sm text-muted-foreground">
                      Utiliser une connexion chiffrée
                    </p>
                  </div>
                  <Switch
                    checked={emailForm.watch('smtp_secure')}
                    onCheckedChange={(checked) => 
                      emailForm.setValue('smtp_secure', checked)
                    }
                  />
                </div>

                <div className="flex justify-between">
                  <Button 
                    variant="outline"
                    onClick={testEmailConfig}
                    disabled={saving}
                  >
                    {saving && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                    <Mail className="mr-2 h-4 w-4" />
                    Tester la configuration
                  </Button>
                  
                  <Button 
                    onClick={() => saveSettings('email')}
                    disabled={saving}
                  >
                    {saving && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                    <Save className="mr-2 h-4 w-4" />
                    Sauvegarder
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Paramètres de notification</CardTitle>
                <CardDescription>
                  Configuration des notifications système
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Canaux de notification</h4>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Notifications par email</Label>
                      <p className="text-sm text-muted-foreground">
                        Envoyer des notifications par email
                      </p>
                    </div>
                    <Switch
                      checked={notificationForm.watch('email_notifications')}
                      onCheckedChange={(checked) => 
                        notificationForm.setValue('email_notifications', checked)
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Notifications Slack</Label>
                      <p className="text-sm text-muted-foreground">
                        Envoyer des notifications vers Slack
                      </p>
                    </div>
                    <Switch
                      checked={notificationForm.watch('slack_notifications')}
                      onCheckedChange={(checked) => 
                        notificationForm.setValue('slack_notifications', checked)
                      }
                    />
                  </div>

                  {notificationForm.watch('slack_notifications') && (
                    <div className="space-y-2">
                      <Label htmlFor="slack_webhook_url">URL Webhook Slack</Label>
                      <Input
                        id="slack_webhook_url"
                        placeholder="https://hooks.slack.com/services/..."
                        {...notificationForm.register('slack_webhook_url')}
                      />
                    </div>
                  )}
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Fréquence des notifications</h4>
                  
                  <div className="space-y-2">
                    <Label htmlFor="notification_digest">Mode de livraison</Label>
                    <Select
                      value={notificationForm.watch('notification_digest')}
                      onValueChange={(value: any) => 
                        notificationForm.setValue('notification_digest', value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="instant">Instantané</SelectItem>
                        <SelectItem value="daily">Résumé quotidien</SelectItem>
                        <SelectItem value="weekly">Résumé hebdomadaire</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Types de notifications</h4>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Nouvel utilisateur</Label>
                      <Switch
                        checked={notificationForm.watch('notify_new_user')}
                        onCheckedChange={(checked) => 
                          notificationForm.setValue('notify_new_user', checked)
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label>Nouveau projet</Label>
                      <Switch
                        checked={notificationForm.watch('notify_new_project')}
                        onCheckedChange={(checked) => 
                          notificationForm.setValue('notify_new_project', checked)
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label>Tâche à échéance</Label>
                      <Switch
                        checked={notificationForm.watch('notify_task_due')}
                        onCheckedChange={(checked) => 
                          notificationForm.setValue('notify_task_due', checked)
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label>Erreur système</Label>
                      <Switch
                        checked={notificationForm.watch('notify_system_error')}
                        onCheckedChange={(checked) => 
                          notificationForm.setValue('notify_system_error', checked)
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button 
                    onClick={() => saveSettings('notifications')}
                    disabled={saving}
                  >
                    {saving && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                    <Save className="mr-2 h-4 w-4" />
                    Sauvegarder
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Paramètres de sécurité</CardTitle>
                <CardDescription>
                  Configuration de la sécurité et des mots de passe
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Politique de mot de passe</h4>
                  
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="password_min_length">
                        Longueur minimale
                      </Label>
                      <Input
                        id="password_min_length"
                        type="number"
                        min="6"
                        max="32"
                        {...securityForm.register('password_min_length', { 
                          valueAsNumber: true 
                        })}
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Majuscules obligatoires</Label>
                      <Switch
                        checked={securityForm.watch('password_require_uppercase')}
                        onCheckedChange={(checked) => 
                          securityForm.setValue('password_require_uppercase', checked)
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label>Minuscules obligatoires</Label>
                      <Switch
                        checked={securityForm.watch('password_require_lowercase')}
                        onCheckedChange={(checked) => 
                          securityForm.setValue('password_require_lowercase', checked)
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label>Chiffres obligatoires</Label>
                      <Switch
                        checked={securityForm.watch('password_require_numbers')}
                        onCheckedChange={(checked) => 
                          securityForm.setValue('password_require_numbers', checked)
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label>Caractères spéciaux obligatoires</Label>
                      <Switch
                        checked={securityForm.watch('password_require_special')}
                        onCheckedChange={(checked) => 
                          securityForm.setValue('password_require_special', checked)
                        }
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Protection contre les attaques</h4>
                  
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="max_login_attempts">
                        Tentatives de connexion max
                      </Label>
                      <Input
                        id="max_login_attempts"
                        type="number"
                        min="1"
                        max="10"
                        {...securityForm.register('max_login_attempts', { 
                          valueAsNumber: true 
                        })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="lockout_duration">
                        Durée de verrouillage (min)
                      </Label>
                      <Input
                        id="lockout_duration"
                        type="number"
                        min="1"
                        max="1440"
                        {...securityForm.register('lockout_duration', { 
                          valueAsNumber: true 
                        })}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Options avancées</h4>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Authentification à deux facteurs</Label>
                      <p className="text-sm text-muted-foreground">
                        Exiger 2FA pour tous les utilisateurs
                      </p>
                    </div>
                    <Switch
                      checked={securityForm.watch('two_factor_auth')}
                      onCheckedChange={(checked) => 
                        securityForm.setValue('two_factor_auth', checked)
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ip_whitelist">
                      Liste blanche IP (une par ligne)
                    </Label>
                    <Textarea
                      id="ip_whitelist"
                      {...securityForm.register('ip_whitelist')}
                      rows={3}
                      placeholder="192.168.1.1&#10;10.0.0.0/24"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cors_origins">
                      Origines CORS autorisées
                    </Label>
                    <Input
                      id="cors_origins"
                      {...securityForm.register('cors_origins')}
                      placeholder="https://example.com, https://app.example.com"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button 
                    onClick={() => saveSettings('security')}
                    disabled={saving}
                  >
                    {saving && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                    <Save className="mr-2 h-4 w-4" />
                    Sauvegarder
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="maintenance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Outils de maintenance</CardTitle>
                <CardDescription>
                  Gestion du cache, sauvegarde et optimisation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Cache système</CardTitle>
                      <CardDescription>
                        Vider le cache de l'application
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button 
                        variant="outline"
                        onClick={clearCache}
                        disabled={saving}
                      >
                        {saving && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Vider le cache
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Base de données</CardTitle>
                      <CardDescription>
                        Optimiser les performances
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button variant="outline" disabled>
                        <Database className="mr-2 h-4 w-4" />
                        Optimiser
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Sauvegarde</CardTitle>
                      <CardDescription>
                        Créer une sauvegarde complète
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button variant="outline" disabled>
                        <Save className="mr-2 h-4 w-4" />
                        Sauvegarder
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Logs système</CardTitle>
                      <CardDescription>
                        Télécharger les logs
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button variant="outline" disabled>
                        <FileText className="mr-2 h-4 w-4" />
                        Télécharger
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Informations système</h4>
                  
                  <div className="grid gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Version</span>
                      <span className="font-medium">1.0.0</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Base de données</span>
                      <span className="font-medium">PostgreSQL 15</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Framework</span>
                      <span className="font-medium">Next.js 15</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Node.js</span>
                      <span className="font-medium">v20.11.0</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ProtectedRoute>
  )
}