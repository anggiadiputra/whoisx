'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RefreshCw, User, Globe, Server, Monitor, Users } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

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
      case 'USER_LOGOUT':
        return User
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
        return Monitor
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
        return 'bg-green-500'
      case 'USER_LOGOUT':
        return 'bg-gray-500'
      case 'DOMAIN_ADDED':
      case 'SERVER_ADDED':
      case 'WEBSITE_ADDED':
      case 'USER_CREATED':
        return 'bg-blue-500'
      case 'DOMAIN_UPDATED':
      case 'SERVER_UPDATED':
      case 'WEBSITE_UPDATED':
      case 'USER_UPDATED':
        return 'bg-orange-500'
      case 'DOMAIN_DELETED':
      case 'SERVER_DELETED':
      case 'WEBSITE_DELETED':
      case 'USER_DELETED':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  const formatTimeAgo = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { 
        addSuffix: true
      })
    } catch (error) {
      return 'Unknown time'
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-gray-300 rounded-full mt-2 animate-pulse"></div>
                <div className="flex-1 min-w-0">
                  <div className="h-4 bg-gray-200 rounded animate-pulse mb-1"></div>
                  <div className="h-3 bg-gray-100 rounded animate-pulse w-16"></div>
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
          <CardTitle className="text-lg">Recent Activity</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-sm text-gray-500">No recent activity</p>
            </div>
          ) : (
            activities.map((activity) => {
              const IconComponent = getActivityIcon(activity.type)
              const colorClass = getActivityColor(activity.type)
              
              return (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className={`w-2 h-2 ${colorClass} rounded-full mt-2`}></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <IconComponent className="w-3 h-3 text-gray-400" />
                      <p className="text-sm text-gray-900">{activity.description}</p>
                    </div>
                    <div className="flex items-center space-x-2 mt-1">
                      <p className="text-xs text-gray-500">
                        {formatTimeAgo(activity.createdAt)}
                      </p>
                      {activity.user && (
                        <>
                          <span className="text-xs text-gray-300">•</span>
                          <Badge variant="outline" className="text-xs">
                            {activity.user.name || activity.user.email}
                          </Badge>
                        </>
                      )}
                    </div>
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
