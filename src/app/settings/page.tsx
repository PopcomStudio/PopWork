"use client"

import { useState, useRef } from "react"
import { 
  User, 
  Bell, 
  Globe, 
  Settings2, 
  Users, 
  CreditCard,
  ChevronRight,
  Languages
} from "lucide-react"
import { PageLayout } from "@/components/PageLayout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { useProfile } from "@/features/settings/hooks/use-profile"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ImageCropModal } from "@/components/ImageCropModal"
import { useTranslation, type Language } from "@/features/translation/contexts/translation-context"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface SettingSection {
  id: string
  title: string
  icon: React.ElementType
  category: "general" | "workspace"
}

// Settings sections are now defined inside the component to use translations
const getSettingSections = (t: (key: string) => string): SettingSection[] => [
  {
    id: "account",
    title: t("settings.sidebar.account"),
    icon: User,
    category: "general"
  },
  {
    id: "notifications",
    title: t("settings.sidebar.notifications"),
    icon: Bell,
    category: "general"
  },
  {
    id: "language",
    title: t("settings.sidebar.languageRegion"),
    icon: Globe,
    category: "general"
  },
  {
    id: "general",
    title: t("settings.sidebar.general"),
    icon: Settings2,
    category: "workspace"
  },
  {
    id: "members",
    title: t("settings.sidebar.members"),
    icon: Users,
    category: "workspace"
  },
  {
    id: "billing",
    title: t("settings.sidebar.billing"),
    icon: CreditCard,
    category: "workspace"
  }
]

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState("account")
  const [formData, setFormData] = useState({ firstName: "", lastName: "" })
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [cropModalOpen, setCropModalOpen] = useState(false)
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { user } = useAuth()
  const { profile, updating, updateProfile, uploadAvatar, removeAvatar } = useProfile()
  const { t, language, setLanguage, availableLanguages } = useTranslation()

  const firstName = profile?.first_name || user?.user_metadata?.first_name || ""
  const lastName = profile?.last_name || user?.user_metadata?.last_name || ""
  const email = user?.email || ""
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url
  const initials = firstName && lastName 
    ? `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
    : email.charAt(0).toUpperCase()

  const handleProfileUpdate = async () => {
    if (formData.firstName || formData.lastName) {
      await updateProfile({
        first_name: formData.firstName || firstName,
        last_name: formData.lastName || lastName,
      })
    }
  }

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setError("")
      setSelectedImageFile(file)
      setCropModalOpen(true)
      // Reset l'input pour permettre de re-sélectionner le même fichier
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleCropComplete = async (croppedFile: File) => {
    setError("")
    setSuccess("")
    const result = await uploadAvatar(croppedFile)
    if (result.error) {
      setError(result.error)
    } else {
      setSuccess(t("settings.messages.avatarUpdated"))
      setTimeout(() => setSuccess(""), 3000)
    }
    setSelectedImageFile(null)
  }

  const handleCropCancel = () => {
    setSelectedImageFile(null)
  }

  const handleRemoveAvatar = async () => {
    setError("")
    setSuccess("")
    const result = await removeAvatar()
    if (result.error) {
      setError(result.error)
    } else {
      setSuccess(t("settings.messages.avatarRemoved"))
      setTimeout(() => setSuccess(""), 3000)
    }
  }

  const renderContent = () => {
    switch (activeSection) {
      case "account":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold mb-1">{t("settings.sections.account.title")}</h2>
              <p className="text-sm text-muted-foreground">
                {t("settings.sections.account.subtitle")}
              </p>
            </div>

            <Separator />

            <div>
              <h3 className="text-lg font-medium mb-4">{t("settings.sections.account.profile.title")}</h3>
              
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              {success && (
                <Alert className="mb-4 border-green-200 bg-green-50">
                  <AlertDescription className="text-green-800">{success}</AlertDescription>
                </Alert>
              )}
              
              <div className="flex items-center space-x-4 mb-6">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={avatarUrl} />
                  <AvatarFallback className="text-lg">{initials}</AvatarFallback>
                </Avatar>
                <div className="space-x-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleAvatarChange}
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    className="hidden"
                  />
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={updating}
                  >
                    {updating ? t("settings.sections.account.profile.uploading") : t("settings.sections.account.profile.changeImage")}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-muted-foreground"
                    onClick={handleRemoveAvatar}
                    disabled={updating || !avatarUrl}
                  >
                    {t("settings.sections.account.profile.removeImage")}
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-6">
                {t("settings.sections.account.profile.imageRequirements")}
              </p>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="space-y-2">
                  <Label htmlFor="firstName">{t("settings.sections.account.profile.firstName")}</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName || firstName}
                    onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                    onBlur={handleProfileUpdate}
                    placeholder={t("settings.sections.account.profile.enterFirstName")}
                    disabled={updating}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">{t("settings.sections.account.profile.lastName")}</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName || lastName}
                    onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                    onBlur={handleProfileUpdate}
                    placeholder={t("settings.sections.account.profile.enterLastName")}
                    disabled={updating}
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-lg font-medium mb-4">{t("settings.sections.account.security.title")}</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>{t("settings.sections.account.profile.email")}</Label>
                    <p className="text-sm text-muted-foreground mt-1">{email}</p>
                  </div>
                  <Button variant="outline" size="sm">
                    {t("settings.sections.account.security.changeEmail")}
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>{t("settings.sections.account.security.password")}</Label>
                    <p className="text-sm text-muted-foreground mt-1">••••••••</p>
                  </div>
                  <Button variant="outline" size="sm">
                    {t("settings.sections.account.security.changePassword")}
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>{t("settings.sections.account.security.twoFactor")}</Label>
                    <p className="text-sm text-muted-foreground">
                      {t("settings.sections.account.security.twoFactorDescription")}
                    </p>
                  </div>
                  <Switch />
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-lg font-medium mb-4">{t("settings.sections.account.management.title")}</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>{t("settings.sections.account.management.logoutAllDevices")}</Label>
                    <p className="text-sm text-muted-foreground">
                      {t("settings.sections.account.management.logoutAllDevicesDescription")}
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    {t("settings.sections.account.management.logout")}
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-red-600">{t("settings.sections.account.management.deleteAccount")}</Label>
                    <p className="text-sm text-muted-foreground">
                      {t("settings.sections.account.management.deleteAccountDescription")}
                    </p>
                  </div>
                  <Button variant="destructive" size="sm">
                    {t("settings.sections.account.management.delete")}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )

      case "notifications":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold mb-1">{t("settings.sections.notifications.title")}</h2>
              <p className="text-sm text-muted-foreground">
                {t("settings.sections.notifications.subtitle")}
              </p>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>{t("settings.sections.notifications.email.title")}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t("settings.sections.notifications.email.description")}
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>{t("settings.sections.notifications.push.title")}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t("settings.sections.notifications.push.description")}
                  </p>
                </div>
                <Switch />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>{t("settings.sections.notifications.taskReminders.title")}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t("settings.sections.notifications.taskReminders.description")}
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>{t("settings.sections.notifications.weeklyReports.title")}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t("settings.sections.notifications.weeklyReports.description")}
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </div>
          </div>
        )

      case "language":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold mb-1">{t("settings.sections.language.title")}</h2>
              <p className="text-sm text-muted-foreground">
                {t("settings.sections.language.subtitle")}
              </p>
            </div>

            <Separator />

            <div className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-medium">{t("settings.sections.language.language.title")}</Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    {t("settings.sections.language.language.description")}
                  </p>
                  <Select value={language} onValueChange={(value) => setLanguage(value as Language)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableLanguages.map((lang) => (
                        <SelectItem key={lang.code} value={lang.code}>
                          <div className="flex items-center space-x-2">
                            <Languages className="w-4 h-4" />
                            <span>{lang.name}</span>
                            {language === lang.code && (
                              <Badge variant="secondary" className="ml-2">
                                {language === "fr" ? "Actuel" : "Current"}
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-base font-medium">{t("settings.sections.language.timezone.title")}</Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    {t("settings.sections.language.timezone.description")}
                  </p>
                  <Select defaultValue="Europe/Paris">
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Europe/Paris">Europe/Paris (UTC+1)</SelectItem>
                      <SelectItem value="America/New_York">America/New_York (UTC-5)</SelectItem>
                      <SelectItem value="Asia/Tokyo">Asia/Tokyo (UTC+9)</SelectItem>
                      <SelectItem value="Australia/Sydney">Australia/Sydney (UTC+11)</SelectItem>
                      <SelectItem value="America/Los_Angeles">America/Los_Angeles (UTC-8)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-base font-medium">{t("settings.sections.language.dateFormat.title")}</Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    {t("settings.sections.language.dateFormat.description")}
                  </p>
                  <Select defaultValue="dd/mm/yyyy">
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select date format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dd/mm/yyyy">
                        <span className="font-mono">31/12/2024</span>
                        <span className="text-muted-foreground ml-2">(DD/MM/YYYY)</span>
                      </SelectItem>
                      <SelectItem value="mm/dd/yyyy">
                        <span className="font-mono">12/31/2024</span>
                        <span className="text-muted-foreground ml-2">(MM/DD/YYYY)</span>
                      </SelectItem>
                      <SelectItem value="yyyy-mm-dd">
                        <span className="font-mono">2024-12-31</span>
                        <span className="text-muted-foreground ml-2">(YYYY-MM-DD)</span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              {/* Language Preview */}
              <div>
                <h3 className="text-lg font-semibold mb-1">
                  {language === "fr" ? "Aperçu" : "Preview"}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {language === "fr" 
                    ? "Voyez comment le contenu apparaît dans votre langue sélectionnée"
                    : "See how content appears in your selected language"}
                </p>
                <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Navigation:</span>
                    <div className="flex space-x-2">
                      {["navigation.dashboard", "navigation.projects", "navigation.settings"].map(key => (
                        <Badge key={key} variant="outline">{t(key)}</Badge>
                      ))}
                    </div>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Message:</span>
                    <span className="text-sm text-muted-foreground">{t("messages.success.saved")}</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Actions:</span>
                    <div className="flex space-x-2">
                      {["common.save", "common.cancel", "common.delete"].map(key => (
                        <Badge key={key} variant="secondary">{t(key)}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )

      case "general":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold mb-1">{t("settings.sections.general.title")}</h2>
              <p className="text-sm text-muted-foreground">
                {t("settings.sections.general.subtitle")}
              </p>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t("settings.sections.general.workspaceName.title")}</Label>
                <Input defaultValue="PopWork Agency" />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>{t("settings.sections.general.darkMode.title")}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t("settings.sections.general.darkMode.description")}
                  </p>
                </div>
                <Switch />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>{t("settings.sections.general.compactMode.title")}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t("settings.sections.general.compactMode.description")}
                  </p>
                </div>
                <Switch />
              </div>
            </div>
          </div>
        )

      case "members":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold mb-1">{t("settings.sections.members.title")}</h2>
              <p className="text-sm text-muted-foreground">
                {t("settings.sections.members.subtitle")}
              </p>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-medium">{t("settings.sections.members.teamMembers.title")}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t("settings.sections.members.teamMembers.description")}
                  </p>
                </div>
                <Button>{t("settings.sections.members.inviteMember")}</Button>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Avatar>
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{firstName} {lastName}</p>
                      <p className="text-sm text-muted-foreground">{email}</p>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">{t("settings.sections.members.owner")}</div>
                </div>
              </div>
            </div>
          </div>
        )

      case "billing":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold mb-1">{t("settings.sections.billing.title")}</h2>
              <p className="text-sm text-muted-foreground">
                {t("settings.sections.billing.subtitle")}
              </p>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="p-4 border rounded-lg">
                <h3 className="font-medium mb-2">{t("settings.sections.billing.currentPlan.title")}</h3>
                <p className="text-2xl font-bold mb-1">{t("settings.sections.billing.currentPlan.professional")}</p>
                <p className="text-sm text-muted-foreground mb-4">{t("settings.sections.billing.currentPlan.price")}</p>
                <Button variant="outline">{t("settings.sections.billing.changePlan")}</Button>
              </div>

              <div className="space-y-2">
                <Label>{t("settings.sections.billing.paymentMethod.title")}</Label>
                <div className="p-3 border rounded-lg flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-5 bg-blue-600 rounded"></div>
                    <span>•••• •••• •••• 4242</span>
                  </div>
                  <Button variant="ghost" size="sm">{t("settings.sections.billing.update")}</Button>
                </div>
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <PageLayout>
      <div className="flex bg-gray-50 -mx-4 lg:-mx-6 -my-4 md:-my-6 h-[calc(100vh-var(--header-height))]">
        {/* Settings Sidebar */}
        <div className="w-64 bg-white border-r flex flex-col h-full">
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="space-y-6">
              <div>
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                  {t("settings.categories.general")}
                </h3>
                <div className="space-y-1">
                  {getSettingSections(t)
                    .filter(section => section.category === "general")
                    .map((section) => {
                      const Icon = section.icon
                      return (
                        <button
                          key={section.id}
                          onClick={() => setActiveSection(section.id)}
                          className={cn(
                            "w-full flex items-center px-3 py-2 text-sm rounded-lg transition-colors text-left",
                            activeSection === section.id
                              ? "bg-gray-100 text-gray-900"
                              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
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
                  {t("settings.categories.workspace")}
                </h3>
                <div className="space-y-1">
                  {getSettingSections(t)
                    .filter(section => section.category === "workspace")
                    .map((section) => {
                      const Icon = section.icon
                      return (
                        <button
                          key={section.id}
                          onClick={() => setActiveSection(section.id)}
                          className={cn(
                            "w-full flex items-center px-3 py-2 text-sm rounded-lg transition-colors text-left",
                            activeSection === section.id
                              ? "bg-gray-100 text-gray-900"
                              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
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

      {/* Modal de crop d'image */}
      <ImageCropModal
        open={cropModalOpen}
        onOpenChange={setCropModalOpen}
        imageFile={selectedImageFile}
        onCropComplete={handleCropComplete}
        onCancel={handleCropCancel}
      />
    </PageLayout>
  )
}
