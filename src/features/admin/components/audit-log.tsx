"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createClientComponentClient } from '@/lib/supabase'
import { ProtectedRoute } from '@/features/auth/components/protected-route'
import { Icons } from '@/components/ui/icons'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Activity, 
  Search, 
  Filter, 
  Download, 
  RefreshCw,
  User,
  FileText,
  Settings,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  Building,
  Phone,
  UserCheck
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

interface AuditLogEntry {
  id: string
  user_id: string
  action: string
  entity_type: string
  entity_id: string | null
  changes: Record<string, unknown> | null
  created_at: string
  user?: {
    first_name: string
    last_name: string
    email: string
  }
}

const actionIcons: Record<string, React.ComponentType> = {
  create: CheckCircle,
  update: RefreshCw,
  delete: XCircle,
  login: Shield,
  logout: Shield,
  error: AlertTriangle,
  view: Info,
}

const actionColors: Record<string, string> = {
  create: 'success',
  update: 'default',
  delete: 'destructive',
  login: 'secondary',
  logout: 'secondary',
  error: 'destructive',
  view: 'outline',
}

const resourceIcons: Record<string, React.ComponentType> = {
  users: User,
  projects: FileText,
  tasks: FileText,
  teams: User,
  documents: FileText,
  settings: Settings,
  companies: Building,
  services: Phone,
  contacts: UserCheck,
}

export function AuditLog() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterAction, setFilterAction] = useState<string>('all')
  const [filterResource, setFilterResource] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [refreshing, setRefreshing] = useState(false)
  
  const supabase = createClientComponentClient()
  const logsPerPage = 20

  const fetchLogs = async (page: number = 1) => {
    try {
      setLoading(true)
      
      let query = supabase
        .from('activity_log')
        .select(`
          *,
          user:users(
            first_name,
            last_name,
            email
          )
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * logsPerPage, page * logsPerPage - 1)

      // Apply filters
      if (filterAction !== 'all') {
        query = query.eq('action', filterAction)
      }
      
      if (filterResource !== 'all') {
        query = query.eq('entity_type', filterResource)
      }

      // Apply search
      if (searchTerm) {
        query = query.or(`action.ilike.%${searchTerm}%,entity_type.ilike.%${searchTerm}%`)
      }

      const { data, error: logsError, count } = await query
      
      if (logsError) throw logsError

      setLogs(data || [])
      setTotalPages(Math.ceil((count || 0) / logsPerPage))
      setCurrentPage(page)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des logs')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    setRefreshing(true)
    fetchLogs(currentPage)
  }

  const handleSearch = () => {
    fetchLogs(1)
  }

  const handleFilterChange = () => {
    fetchLogs(1)
  }

  const exportLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('activity_log')
        .select(`
          *,
          user:users(
            first_name,
            last_name,
            email
          )
        `)
        .order('created_at', { ascending: false })
        .limit(1000)

      if (error) throw error

      // Convert to CSV
      const csv = [
        ['Date', 'Utilisateur', 'Action', 'Ressource', 'ID Ressource', 'IP', 'Details'].join(','),
        ...(data || []).map(log => [
          new Date(log.created_at).toLocaleString('fr-FR'),
          log.user ? `${log.user.first_name} ${log.user.last_name}` : 'Système',
          log.action,
          log.entity_type,
          log.entity_id || '',
          log.ip_address || '',
          JSON.stringify(log.changes || {})
        ].join(','))
      ].join('\n')

      // Download CSV
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'export')
    }
  }

  const getActionIcon = (action: string) => {
    const Icon = actionIcons[action] || Activity
    return <Icon className="h-4 w-4" />
  }

  const getResourceIcon = (resource: string) => {
    const Icon = resourceIcons[resource] || FileText
    return <Icon className="h-4 w-4" />
  }

  const formatDetails = (changes: any) => {
    if (!changes) return '-'
    if (typeof changes === 'string') return changes
    
    // Format common detail patterns
    if (changes.changes) {
      const changedFields = Object.keys(changes.changes)
      if (changedFields.length > 0) {
        return `Modifié: ${changedFields.join(', ')}`
      }
    }
    if (changes.message) {
      return changes.message
    }
    if (changes.error) {
      return `Erreur: ${changes.error}`
    }
    
    return JSON.stringify(changes).substring(0, 100) + '...'
  }

  useEffect(() => {
    fetchLogs(1)
  }, [])

  useEffect(() => {
    handleFilterChange()
  }, [filterAction, filterResource])

  return (
    <ProtectedRoute requiredPermission="admin.*">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Journal d'audit</h2>
            <p className="text-muted-foreground">
              Historique complet des actions dans le système
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={exportLogs}
            >
              <Download className="mr-2 h-4 w-4" />
              Exporter CSV
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filtres</CardTitle>
            <CardDescription>
              Recherchez et filtrez les entrées du journal
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="pl-8"
                  />
                </div>
              </div>
              
              <Select value={filterAction} onValueChange={setFilterAction}>
                <SelectTrigger className="w-[150px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes actions</SelectItem>
                  <SelectItem value="create">Création</SelectItem>
                  <SelectItem value="update">Modification</SelectItem>
                  <SelectItem value="delete">Suppression</SelectItem>
                  <SelectItem value="login">Connexion</SelectItem>
                  <SelectItem value="logout">Déconnexion</SelectItem>
                  <SelectItem value="error">Erreur</SelectItem>
                  <SelectItem value="view">Consultation</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterResource} onValueChange={setFilterResource}>
                <SelectTrigger className="w-[150px]">
                  <FileText className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Ressource" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes ressources</SelectItem>
                  <SelectItem value="users">Utilisateurs</SelectItem>
                  <SelectItem value="projects">Projets</SelectItem>
                  <SelectItem value="tasks">Tâches</SelectItem>
                  <SelectItem value="teams">Équipes</SelectItem>
                  <SelectItem value="companies">Entreprises</SelectItem>
                  <SelectItem value="services">Services</SelectItem>
                  <SelectItem value="contacts">Contacts</SelectItem>
                  <SelectItem value="documents">Documents</SelectItem>
                  <SelectItem value="settings">Paramètres</SelectItem>
                </SelectContent>
              </Select>

              <Button onClick={handleSearch}>
                <Search className="mr-2 h-4 w-4" />
                Rechercher
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Logs Table */}
        <Card>
          <CardHeader>
            <CardTitle>Entrées du journal</CardTitle>
            <CardDescription>
              {logs.length} entrée{logs.length > 1 ? 's' : ''} trouvée{logs.length > 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Icons.spinner className="h-8 w-8 animate-spin" />
                <span className="ml-2">Chargement des logs...</span>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date/Heure</TableHead>
                      <TableHead>Utilisateur</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Ressource</TableHead>
                      <TableHead>Détails</TableHead>
                      <TableHead>IP</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm">
                          {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: fr })}
                        </TableCell>
                        <TableCell>
                          {log.user ? (
                            <div className="flex items-center space-x-2">
                              <User className="h-3 w-3" />
                              <span className="text-sm">
                                {log.user.first_name} {log.user.last_name}
                              </span>
                            </div>
                          ) : (
                            <Badge variant="outline">Système</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {getActionIcon(log.action)}
                            <Badge variant={actionColors[log.action] as any || 'default'}>
                              {log.action}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {getResourceIcon(log.entity_type)}
                            <span className="text-sm">
                              {log.entity_type}
                              {log.entity_id && (
                                <span className="text-muted-foreground ml-1">
                                  #{log.entity_id.substring(0, 8)}
                                </span>
                              )}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[300px]">
                          <span className="text-sm text-muted-foreground truncate">
                            {formatDetails(log.changes)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground">
                            {log.ip_address || '-'}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                    {logs.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          Aucune entrée trouvée
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-4">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious 
                            onClick={() => currentPage > 1 && fetchLogs(currentPage - 1)}
                            className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>
                        
                        {[...Array(Math.min(5, totalPages))].map((_, i) => {
                          const pageNum = i + 1
                          return (
                            <PaginationItem key={pageNum}>
                              <PaginationLink
                                onClick={() => fetchLogs(pageNum)}
                                isActive={pageNum === currentPage}
                                className="cursor-pointer"
                              >
                                {pageNum}
                              </PaginationLink>
                            </PaginationItem>
                          )
                        })}
                        
                        {totalPages > 5 && (
                          <PaginationItem>
                            <PaginationEllipsis />
                          </PaginationItem>
                        )}
                        
                        <PaginationItem>
                          <PaginationNext 
                            onClick={() => currentPage < totalPages && fetchLogs(currentPage + 1)}
                            className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  )
}