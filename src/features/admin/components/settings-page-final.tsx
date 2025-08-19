"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  User,
  Bell,
  Shield,
  Palette,
  Database,
  Download,
  Trash2,
  Settings,
  Save,
  Moon,
  Sun,
  Globe,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react"
import { ProfileForm } from "./settings/profile-form"

// Mock user data
const mockUser = {
  firstName: "Alexandre",
  lastName: "Dupont",
  email: "alexandre.dupont@popcom.studio",
  phone: "+33 1 23 45 67 89",
  bio: "Développeur Full-Stack passionné par les technologies web modernes.",
  company: "PopCom Studio",
  position: "Lead Developer",
  avatar: "/avatars/alexandre.jpg"
}

export function SettingsPageFinal() {
  const [darkMode, setDarkMode] = useState(false)
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    marketing: false,
  })
  const [privacy, setPrivacy] = useState({
    profilePublic: true,
    showEmail: false,
    allowDirectMessages: true,
  })
  const [saving, setSaving] = useState(false)

  const handleProfileSubmit = async (data: any) => {
    setSaving(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000))
    console.log('Profile updated:', data)
    setSaving(false)
  }

  const handleExportData = () => {
    // Simulate data export
    console.log('Exporting user data...')
  }

  const handleDeleteAccount = () => {
    // Simulate account deletion
    console.log('Account deletion requested...')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Paramètres</h1>
        <p className="text-muted-foreground">
          Gérez vos préférences de compte et de confidentialité
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Profil
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="privacy" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Confidentialité
          </TabsTrigger>
          <TabsTrigger value="appearance" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Apparence
          </TabsTrigger>
          <TabsTrigger value="account" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Compte
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informations personnelles</CardTitle>
              <CardDescription>
                Modifiez vos informations de profil visibles par les autres utilisateurs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProfileForm
                initialData={mockUser}
                currentAvatar={mockUser.avatar}
                onSubmit={handleProfileSubmit}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Préférences de notification</CardTitle>
              <CardDescription>
                Choisissez comment vous souhaitez être notifié
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Notifications par email</Label>
                  <div className="text-sm text-muted-foreground">
                    Recevez des notifications par email pour les activités importantes
                  </div>
                </div>
                <Switch
                  checked={notifications.email}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, email: checked })
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Notifications push</Label>
                  <div className="text-sm text-muted-foreground">
                    Recevez des notifications push sur vos appareils
                  </div>
                </div>
                <Switch
                  checked={notifications.push}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, push: checked })
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Communications marketing</Label>
                  <div className="text-sm text-muted-foreground">
                    Recevez des emails sur les nouveautés et les offres
                  </div>
                </div>
                <Switch
                  checked={notifications.marketing}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, marketing: checked })
                  }
                />
              </div>

              <div className="flex justify-end">
                <Button>
                  <Save className="h-4 w-4 mr-2" />
                  Enregistrer
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="privacy" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Paramètres de confidentialité</CardTitle>
              <CardDescription>
                Contrôlez qui peut voir vos informations et comment elles sont utilisées
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Profil public
                  </Label>
                  <div className="text-sm text-muted-foreground">
                    Votre profil est visible par tous les utilisateurs de l'équipe
                  </div>
                </div>
                <Switch
                  checked={privacy.profilePublic}
                  onCheckedChange={(checked) =>
                    setPrivacy({ ...privacy, profilePublic: checked })
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base flex items-center gap-2">
                    {privacy.showEmail ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    Afficher l'email
                  </Label>
                  <div className="text-sm text-muted-foreground">
                    Votre adresse email est visible sur votre profil public
                  </div>
                </div>
                <Switch
                  checked={privacy.showEmail}
                  onCheckedChange={(checked) =>
                    setPrivacy({ ...privacy, showEmail: checked })
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Messages directs
                  </Label>
                  <div className="text-sm text-muted-foreground">
                    Les autres utilisateurs peuvent vous envoyer des messages privés
                  </div>
                </div>
                <Switch
                  checked={privacy.allowDirectMessages}
                  onCheckedChange={(checked) =>
                    setPrivacy({ ...privacy, allowDirectMessages: checked })
                  }
                />
              </div>

              <div className="flex justify-end">
                <Button>
                  <Save className="h-4 w-4 mr-2" />
                  Enregistrer
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Apparence de l'interface</CardTitle>
              <CardDescription>
                Personnalisez l'apparence de l'application selon vos préférences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base flex items-center gap-2">
                    {darkMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                    Mode sombre
                  </Label>
                  <div className="text-sm text-muted-foreground">
                    Activez le thème sombre pour réduire la fatigue oculaire
                  </div>
                </div>
                <Switch
                  checked={darkMode}
                  onCheckedChange={setDarkMode}
                />
              </div>

              <Separator />

              <div className="space-y-3">
                <Label className="text-base">Couleur d'accent</Label>
                <div className="flex gap-3">
                  {[
                    { name: 'Bleu', color: 'bg-blue-500' },
                    { name: 'Vert', color: 'bg-green-500' },
                    { name: 'Rouge', color: 'bg-red-500' },
                    { name: 'Violet', color: 'bg-purple-500' },
                    { name: 'Orange', color: 'bg-orange-500' },
                  ].map((color) => (
                    <button
                      key={color.name}
                      className={`w-8 h-8 rounded-full ${color.color} ring-2 ring-offset-2 ring-offset-background hover:ring-muted-foreground transition-all`}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              <div className="flex justify-end">
                <Button>
                  <Save className="h-4 w-4 mr-2" />
                  Enregistrer
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="account" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Gestion du compte</CardTitle>
              <CardDescription>
                Gérez vos données et paramètres de compte
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Statut du compte</h4>
                  <Badge variant="secondary" className="mb-4">
                    Compte actif depuis mars 2024
                  </Badge>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base flex items-center gap-2">
                      <Database className="h-4 w-4" />
                      Exporter mes données
                    </Label>
                    <div className="text-sm text-muted-foreground">
                      Téléchargez une copie de toutes vos données
                    </div>
                  </div>
                  <Button variant="outline" onClick={handleExportData}>
                    <Download className="h-4 w-4 mr-2" />
                    Exporter
                  </Button>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base flex items-center gap-2 text-destructive">
                      <Trash2 className="h-4 w-4" />
                      Supprimer le compte
                    </Label>
                    <div className="text-sm text-muted-foreground">
                      Supprimez définitivement votre compte et toutes vos données
                    </div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Supprimer
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Êtes-vous absolument sûr ?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Cette action est irréversible. Votre compte sera définitivement supprimé
                          et toutes vos données seront perdues.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDeleteAccount}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Oui, supprimer mon compte
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
