"use client"

import { useState } from "react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { 
  Settings2, 
  Users, 
  Shield, 
  Database, 
  Bell, 
  ChevronRight,
  Server,
  FileText,
  Calendar,
  CalendarIcon
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar as CalendarUI } from "@/components/ui/calendar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

interface AdminSettingSection {
  id: string
  title: string
  icon: React.ElementType
  category: "système" | "utilisateurs" | "sécurité"
}

const adminSettingSections: AdminSettingSection[] = [
  {
    id: "general",
    title: "Paramètres généraux",
    icon: Settings2,
    category: "système"
  },
  {
    id: "leaves",
    title: "Système de congés",
    icon: Calendar,
    category: "système"
  },
  {
    id: "database",
    title: "Base de données",
    icon: Database,
    category: "système"
  },
  {
    id: "server",
    title: "Serveur",
    icon: Server,
    category: "système"
  },
  {
    id: "users",
    title: "Gestion des utilisateurs",
    icon: Users,
    category: "utilisateurs"
  },
  {
    id: "roles",
    title: "Rôles et permissions",
    icon: Shield,
    category: "utilisateurs"
  },
  {
    id: "security",
    title: "Sécurité",
    icon: Shield,
    category: "sécurité"
  },
  {
    id: "notifications",
    title: "Notifications système",
    icon: Bell,
    category: "sécurité"
  },
  {
    id: "logs",
    title: "Journaux d'audit",
    icon: FileText,
    category: "sécurité"
  }
]

export function AdminSettingsLayout() {
  const [activeSection, setActiveSection] = useState("general")
  const [referenceStartDate, setReferenceStartDate] = useState<Date | undefined>(new Date(new Date().getFullYear(), 5, 1))

  const renderContent = () => {
    switch (activeSection) {
      case "general":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold mb-1">Paramètres généraux</h2>
              <p className="text-sm text-muted-foreground">
                Configuration générale de l'application
              </p>
            </div>

            <Separator />

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Informations de l'application</CardTitle>
                  <CardDescription>
                    Paramètres de base de votre instance PopWork
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="appName">Nom de l'application</Label>
                      <Input id="appName" defaultValue="PopWork" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="appVersion">Version</Label>
                      <Input id="appVersion" defaultValue="1.0.0" readOnly />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="appDescription">Description</Label>
                    <Textarea 
                      id="appDescription" 
                      defaultValue="Application de gestion d'agence web collaborative"
                      className="min-h-[80px]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Nom de l'entreprise</Label>
                    <Input id="companyName" defaultValue="PopWork Agency" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Paramètres de langue et région</CardTitle>
                  <CardDescription>
                    Configuration par défaut pour tous les utilisateurs
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Langue par défaut</Label>
                      <Select defaultValue="fr">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fr">🇫🇷 Français</SelectItem>
                          <SelectItem value="en">🇺🇸 English</SelectItem>
                          <SelectItem value="es">🇪🇸 Español</SelectItem>
                          <SelectItem value="de">🇩🇪 Deutsch</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Fuseau horaire</Label>
                      <Select defaultValue="Europe/Paris">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Europe/Paris">Europe/Paris (UTC+1)</SelectItem>
                          <SelectItem value="America/New_York">America/New_York (UTC-5)</SelectItem>
                          <SelectItem value="Asia/Tokyo">Asia/Tokyo (UTC+9)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button>
                  <Settings2 className="w-4 h-4 mr-2" />
                  Sauvegarder les modifications
                </Button>
              </div>
            </div>
          </div>
        )

      case "leaves":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold mb-1">Système de congés</h2>
              <p className="text-sm text-muted-foreground">
                Configuration du système de congés conforme au code du travail français
              </p>
            </div>

            <Separator />

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Paramètres légaux</CardTitle>
                  <CardDescription>
                    Configuration des droits et limites selon la législation française
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="legalWorkingHours">Durée légale du travail (h/semaine)</Label>
                    <Input id="legalWorkingHours" type="number" defaultValue="35" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Période de référence</CardTitle>
                  <CardDescription>
                    Définition de l'année de référence pour l'acquisition des congés
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Date de début de la période de référence</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {referenceStartDate ? (
                            format(referenceStartDate, 'dd MMMM', { locale: fr })
                          ) : (
                            <span>Sélectionnez une date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarUI
                          mode="single"
                          selected={referenceStartDate}
                          onSelect={setReferenceStartDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="autoReset" defaultChecked />
                    <Label htmlFor="autoReset">Reset automatique annuel des soldes</Label>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Notifications</CardTitle>
                  <CardDescription>
                    Alertes automatiques pour l'expiration des congés
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="expirationWarning">Alerte expiration (jours avant)</Label>
                      <Input id="expirationWarning" type="number" defaultValue="30" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reminderFreq">Fréquence des rappels (jours)</Label>
                      <Input id="reminderFreq" type="number" defaultValue="7" />
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="emailNotifications" defaultChecked />
                    <Label htmlFor="emailNotifications">Notifications par email</Label>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button>
                  <Calendar className="w-4 h-4 mr-2" />
                  Sauvegarder la configuration
                </Button>
              </div>
            </div>
          </div>
        )

      case "database":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold mb-1">Base de données</h2>
              <p className="text-sm text-muted-foreground">
                Surveillance et gestion de la base de données
              </p>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Connexions actives</CardTitle>
                  <Database className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">24</div>
                  <p className="text-xs text-muted-foreground">
                    +2% par rapport à hier
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Taille de la DB</CardTitle>
                  <Database className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">2.4 GB</div>
                  <p className="text-xs text-muted-foreground">
                    +180MB ce mois
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Requêtes/sec</CardTitle>
                  <Database className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">156</div>
                  <p className="text-xs text-muted-foreground">
                    Moyenne sur 5min
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Maintenance de la base</CardTitle>
                <CardDescription>
                  Outils de maintenance et d'optimisation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Sauvegarde automatique</p>
                    <p className="text-sm text-muted-foreground">Dernière sauvegarde: Il y a 2 heures</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Optimisation automatique</p>
                    <p className="text-sm text-muted-foreground">Optimise les index toutes les nuits</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator />
                <div className="flex gap-2 pt-4">
                  <Button variant="outline">Créer une sauvegarde</Button>
                  <Button variant="outline">Optimiser maintenant</Button>
                  <Button variant="outline">Analyser les performances</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )

      case "users":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold mb-1">Gestion des utilisateurs</h2>
              <p className="text-sm text-muted-foreground">
                Configuration des paramètres utilisateur par défaut
              </p>
            </div>

            <Separator />

            <Card>
              <CardHeader>
                <CardTitle>Paramètres d'inscription</CardTitle>
                <CardDescription>
                  Contrôlez comment les nouveaux utilisateurs rejoignent votre instance
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Inscription publique</p>
                    <p className="text-sm text-muted-foreground">Autoriser l'auto-inscription</p>
                  </div>
                  <Switch />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Validation par email</p>
                    <p className="text-sm text-muted-foreground">Obliger la validation d'email</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Approbation admin</p>
                    <p className="text-sm text-muted-foreground">Les admins doivent approuver les comptes</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Rôle par défaut</CardTitle>
                <CardDescription>
                  Rôle attribué automatiquement aux nouveaux utilisateurs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Select defaultValue="user">
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">👤 Utilisateur</SelectItem>
                    <SelectItem value="editor">✏️ Éditeur</SelectItem>
                    <SelectItem value="moderator">🛡️ Modérateur</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          </div>
        )

      case "security":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold mb-1">Sécurité</h2>
              <p className="text-sm text-muted-foreground">
                Configuration de la sécurité et des accès
              </p>
            </div>

            <Separator />

            <Card>
              <CardHeader>
                <CardTitle>Authentification</CardTitle>
                <CardDescription>
                  Paramètres de sécurité pour l'authentification
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Longueur minimale du mot de passe</Label>
                    <Select defaultValue="8">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="6">6 caractères</SelectItem>
                        <SelectItem value="8">8 caractères</SelectItem>
                        <SelectItem value="10">10 caractères</SelectItem>
                        <SelectItem value="12">12 caractères</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Durée de session (minutes)</Label>
                    <Select defaultValue="60">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="60">1 heure</SelectItem>
                        <SelectItem value="120">2 heures</SelectItem>
                        <SelectItem value="480">8 heures</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Authentification à deux facteurs</p>
                    <p className="text-sm text-muted-foreground">Obliger 2FA pour tous les utilisateurs</p>
                  </div>
                  <Switch />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Restrictions d'accès</CardTitle>
                <CardDescription>
                  Contrôlez les accès à votre instance
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Adresses IP autorisées</Label>
                  <Textarea 
                    placeholder="192.168.1.0/24&#10;10.0.0.0/8&#10;Laissez vide pour autoriser toutes les IPs"
                    className="min-h-[100px]"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Mode maintenance</p>
                    <p className="text-sm text-muted-foreground">Seuls les admins peuvent se connecter</p>
                  </div>
                  <Switch />
                </div>
              </CardContent>
            </Card>
          </div>
        )

      default:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold mb-1">Section en développement</h2>
              <p className="text-sm text-muted-foreground">
                Cette section sera bientôt disponible.
              </p>
            </div>
          </div>
        )
    }
  }

  return (
    <div className="flex bg-background -mx-4 lg:-mx-6 -my-4 md:-my-6 h-[calc(100vh-var(--header-height))]">
      {/* Settings Sidebar */}
      <div className="w-64 bg-background border-r flex flex-col h-full">
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-6">
            <div>
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                Système
              </h3>
              <div className="space-y-1">
                {adminSettingSections
                  .filter(section => section.category === "système")
                  .map((section) => {
                    const Icon = section.icon
                    return (
                      <button
                        key={section.id}
                        onClick={() => setActiveSection(section.id)}
                        className={cn(
                          "w-full flex items-center px-3 py-2 text-sm rounded-lg transition-colors text-left",
                          activeSection === section.id
                            ? "bg-accent text-accent-foreground"
                            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        )}
                      >
                        <Icon className="w-4 h-4 mr-3" />
                        {section.title}
                        {activeSection === section.id && (
                          <ChevronRight className="w-4 h-4 ml-auto" />
                        )}
                      </button>
                    )
                  })}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                Utilisateurs
              </h3>
              <div className="space-y-1">
                {adminSettingSections
                  .filter(section => section.category === "utilisateurs")
                  .map((section) => {
                    const Icon = section.icon
                    return (
                      <button
                        key={section.id}
                        onClick={() => setActiveSection(section.id)}
                        className={cn(
                          "w-full flex items-center px-3 py-2 text-sm rounded-lg transition-colors text-left",
                          activeSection === section.id
                            ? "bg-accent text-accent-foreground"
                            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        )}
                      >
                        <Icon className="w-4 h-4 mr-3" />
                        {section.title}
                        {activeSection === section.id && (
                          <ChevronRight className="w-4 h-4 ml-auto" />
                        )}
                      </button>
                    )
                  })}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                Sécurité
              </h3>
              <div className="space-y-1">
                {adminSettingSections
                  .filter(section => section.category === "sécurité")
                  .map((section) => {
                    const Icon = section.icon
                    return (
                      <button
                        key={section.id}
                        onClick={() => setActiveSection(section.id)}
                        className={cn(
                          "w-full flex items-center px-3 py-2 text-sm rounded-lg transition-colors text-left",
                          activeSection === section.id
                            ? "bg-accent text-accent-foreground"
                            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        )}
                      >
                        <Icon className="w-4 h-4 mr-3" />
                        {section.title}
                        {activeSection === section.id && (
                          <ChevronRight className="w-4 h-4 ml-auto" />
                        )}
                      </button>
                    )
                  })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto h-full">
        <div className="max-w-4xl mx-auto p-8">
          {renderContent()}
        </div>
      </div>
    </div>
  )
}