'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RefreshCw, Globe, Server, Users, LogIn, LogOut, AppWindow } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { id as localeId } from 'date-fns/locale'

interface Activity {
  id: string
  type: string
  description: string
  createdAt: string
  user?: {
    id: string
    name: string
    email: string
    role: string
  }
}

export function RecentActivity() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchActivities = async () => {
    try {
      const response = await fetch('/api/activities?limit=10')
      if (response.ok) {
        const data = await response.json()
        setActivities(data.activities)
      }
    } catch (error) {
      console.error('Failed to fetch activities:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchActivities()
  }

  useEffect(() => {
    fetchActivities()
    
    // Set up polling for real-time updates
    const interval = setInterval(fetchActivities, 30000) // Refresh every 30 seconds
    
    return () => clearInterval(interval)
  }, [])

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'USER_LOGIN':
        return LogIn
      case 'USER_LOGOUT':
        return LogOut
      case 'DOMAIN_ADDED':
      case 'DOMAIN_UPDATED':
      case 'DOMAIN_DELETED':
        return Globe
      case 'SERVER_ADDED':
      case 'SERVER_UPDATED':
      case 'SERVER_DELETED':
        return Server
      case 'WEBSITE_ADDED':
      case 'WEBSITE_UPDATED':
      case 'WEBSITE_DELETED':
        return AppWindow
      case 'USER_CREATED':
      case 'USER_UPDATED':
      case 'USER_DELETED':
        return Users
      default:
        return Globe
    }
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'USER_LOGIN':
        return 'bg-mint text-on-mint'
      case 'USER_LOGOUT':
        return 'bg-sand text-st-draft'
      case 'DOMAIN_ADDED':
      case 'SERVER_ADDED':
      case 'WEBSITE_ADDED':
      case 'USER_CREATED':
        return 'bg-lilac text-violet'
      case 'DOMAIN_UPDATED':
      case 'SERVER_UPDATED':
      case 'WEBSITE_UPDATED':
      case 'USER_UPDATED':
        return 'bg-peach text-on-peach'
      case 'DOMAIN_DELETED':
      case 'SERVER_DELETED':
      case 'WEBSITE_DELETED':
      case 'USER_DELETED':
        return 'bg-rose text-st-no'
      default:
        return 'bg-sand text-st-draft'
    }
  }

  const formatTimeAgo = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { 
        addSuffix: true,
        locale: localeId,
      })
    } catch (error) {
      return 'Waktu tidak diketahui'
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Aktivitas terbaru</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="size-11 shrink-0 rounded-[16px] bg-sand motion-safe:animate-pulse"></div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 h-4 rounded-full bg-sand motion-safe:animate-pulse"></div>
                  <div className="h-3 w-16 rounded-full bg-cream motion-safe:animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Aktivitas terbaru</CardTitle>
          <Button
            variant="secondary"
            size="icon"
            onClick={handleRefresh}
            disabled={refreshing}
            aria-label="Muat ulang aktivitas"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="divide-y divide-sand">
          {activities.length === 0 ? (
            <div className="flex items-center gap-4 rounded-card border-2 border-dashed border-ink/15 p-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-[16px] bg-cream text-2xl" aria-hidden="true">🌤️</span>
              <p className="text-[15px] font-extrabold">Belum ada aktivitas</p>
            </div>
          ) : (
            activities.map((activity) => {
              const IconComponent = getActivityIcon(activity.type)
              const colorClass = getActivityColor(activity.type)
              
              return (
                <div key={activity.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <span className={`grid size-11 shrink-0 place-items-center rounded-[16px] ${colorClass}`}>
                    <IconComponent className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-extrabold leading-snug">{activity.description}</p>
                    <p className="truncate text-[13px] font-semibold text-muted">
                      {formatTimeAgo(activity.createdAt)}
                      {activity.user && ` · ${activity.user.name || activity.user.email}`}
                    </p>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </CardContent>
    </Card>
  )
}
