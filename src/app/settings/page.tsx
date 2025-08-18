"use client"

import { useState, useRef } from "react"
import { 
  IconUser, 
  IconBell, 
  IconWorld, 
  IconSettings2, 
  IconUsers, 
  IconCreditCard,
  IconShield,
  IconChevronRight
} from "@tabler/icons-react"
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

interface SettingSection {
  id: string
  title: string
  icon: React.ElementType
  category: "general" | "workspace"
}

const settingSections: SettingSection[] = [
  {
    id: "account",
    title: "Account",
    icon: IconUser,
    category: "general"
  },
  {
    id: "notifications",
    title: "Notifications",
    icon: IconBell,
    category: "general"
  },
  {
    id: "language",
    title: "Language & Region",
    icon: IconWorld,
    category: "general"
  },
  {
    id: "general",
    title: "General",
    icon: IconSettings2,
    category: "workspace"
  },
  {
    id: "members",
    title: "Members",
    icon: IconUsers,
    category: "workspace"
  },
  {
    id: "billing",
    title: "Billing",
    icon: IconCreditCard,
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
      setSuccess("Avatar mis à jour avec succès !")
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
      setSuccess("Avatar supprimé avec succès !")
      setTimeout(() => setSuccess(""), 3000)
    }
  }

  const renderContent = () => {
    switch (activeSection) {
      case "account":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold mb-1">Account Settings</h2>
              <p className="text-sm text-muted-foreground">
                Manage your account settings and preferences
              </p>
            </div>

            <Separator />

            <div>
              <h3 className="text-lg font-medium mb-4">My Profile</h3>
              
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
                    {updating ? "Uploading..." : "Change Image"}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-muted-foreground"
                    onClick={handleRemoveAvatar}
                    disabled={updating || !avatarUrl}
                  >
                    Remove Image
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-6">
                We support PNGs, JPEGs and WebP under 10MB.
              </p>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName || firstName}
                    onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                    onBlur={handleProfileUpdate}
                    placeholder="Enter your first name"
                    disabled={updating}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName || lastName}
                    onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                    onBlur={handleProfileUpdate}
                    placeholder="Enter your last name"
                    disabled={updating}
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-lg font-medium mb-4">Account Security</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Email</Label>
                    <p className="text-sm text-muted-foreground mt-1">{email}</p>
                  </div>
                  <Button variant="outline" size="sm">
                    Change email
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Password</Label>
                    <p className="text-sm text-muted-foreground mt-1">••••••••</p>
                  </div>
                  <Button variant="outline" size="sm">
                    Change password
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>2-Step Verifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Add an additional layer of security to your account during login.
                    </p>
                  </div>
                  <Switch />
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-lg font-medium mb-4">Account Management</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Log out of all devices</Label>
                    <p className="text-sm text-muted-foreground">
                      Log out of all other active sessions on other devices besides this one.
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    Log out
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-red-600">Delete my account</Label>
                    <p className="text-sm text-muted-foreground">
                      Permanently delete the account and remove access from all workspaces.
                    </p>
                  </div>
                  <Button variant="destructive" size="sm">
                    Delete Account
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
              <h2 className="text-2xl font-semibold mb-1">Notifications</h2>
              <p className="text-sm text-muted-foreground">
                Configure how you receive notifications
              </p>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Email notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive email updates about your projects and tasks
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Push notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive push notifications on your device
                  </p>
                </div>
                <Switch />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Task reminders</Label>
                  <p className="text-sm text-muted-foreground">
                    Get reminded about upcoming task deadlines
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Weekly reports</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive weekly productivity reports
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
              <h2 className="text-2xl font-semibold mb-1">Language & Region</h2>
              <p className="text-sm text-muted-foreground">
                Customize your language and regional settings
              </p>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Language</Label>
                <select className="w-full p-2 border rounded-md">
                  <option value="fr">Français</option>
                  <option value="en">English</option>
                  <option value="es">Español</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>Timezone</Label>
                <select className="w-full p-2 border rounded-md">
                  <option value="Europe/Paris">Europe/Paris (UTC+1)</option>
                  <option value="America/New_York">America/New_York (UTC-5)</option>
                  <option value="Asia/Tokyo">Asia/Tokyo (UTC+9)</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>Date format</Label>
                <select className="w-full p-2 border rounded-md">
                  <option value="dd/mm/yyyy">DD/MM/YYYY</option>
                  <option value="mm/dd/yyyy">MM/DD/YYYY</option>
                  <option value="yyyy-mm-dd">YYYY-MM-DD</option>
                </select>
              </div>
            </div>
          </div>
        )

      case "general":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold mb-1">General</h2>
              <p className="text-sm text-muted-foreground">
                General workspace settings
              </p>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Workspace name</Label>
                <Input defaultValue="PopWork Agency" />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Dark mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Use dark theme across the application
                  </p>
                </div>
                <Switch />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Compact mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Use a more compact layout to show more content
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
              <h2 className="text-2xl font-semibold mb-1">Members</h2>
              <p className="text-sm text-muted-foreground">
                Manage team members and permissions
              </p>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-medium">Team members</h3>
                  <p className="text-sm text-muted-foreground">
                    Invite and manage your team members
                  </p>
                </div>
                <Button>Invite member</Button>
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
                  <div className="text-sm text-muted-foreground">Owner</div>
                </div>
              </div>
            </div>
          </div>
        )

      case "billing":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold mb-1">Billing</h2>
              <p className="text-sm text-muted-foreground">
                Manage your subscription and billing information
              </p>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="p-4 border rounded-lg">
                <h3 className="font-medium mb-2">Current Plan</h3>
                <p className="text-2xl font-bold mb-1">Professional</p>
                <p className="text-sm text-muted-foreground mb-4">€29/month</p>
                <Button variant="outline">Change plan</Button>
              </div>

              <div className="space-y-2">
                <Label>Payment method</Label>
                <div className="p-3 border rounded-lg flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-5 bg-blue-600 rounded"></div>
                    <span>•••• •••• •••• 4242</span>
                  </div>
                  <Button variant="ghost" size="sm">Update</Button>
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
                  General Settings
                </h3>
                <div className="space-y-1">
                  {settingSections
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
                            <IconChevronRight className="w-4 h-4 ml-auto" />
                          )}
                        </button>
                      )
                    })}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                  Workspace Settings
                </h3>
                <div className="space-y-1">
                  {settingSections
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
                            <IconChevronRight className="w-4 h-4 ml-auto" />
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
