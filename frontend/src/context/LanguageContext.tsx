import React, { createContext, useContext, useState, useEffect } from 'react';
import { TRANSLATIONS, type AppLanguage } from '../i18n/translations';

export type { AppLanguage };

export interface NotificationItem {
  id: string;
  title: string;
  titleHi: string;
  message: string;
  messageHi: string;
  time: string;
  timeHi: string;
  type: 'warning' | 'info' | 'success';
  read: boolean;
  link?: string;
}

export interface NotificationPreferences {
  lowConfidenceAlerts: boolean;
  eveningTallyReminder: boolean;
  priceHikeAlerts: boolean;
  browserPushEnabled: boolean;
}

interface LanguageContextType {
  language: AppLanguage;
  isHindi: boolean;
  setLanguage: (lang: AppLanguage) => void;
  t: (key: string, varsOrFallback?: Record<string, string | number> | string, fallback?: string) => string;
  notifications: NotificationItem[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  addNotification: (notif: Omit<NotificationItem, 'id' | 'read'>) => void;
  triggerTestNotification: () => Promise<void>;
  notificationPrefs: NotificationPreferences;
  updateNotificationPrefs: (partial: Partial<NotificationPreferences>) => void;
}

const DEFAULT_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    title: '2 Receipts Need Verification',
    titleHi: '2 बिलों की जांच बाकी है',
    message: 'Handwritten totals or GST rates on recent bills require quick owner review.',
    messageHi: 'हाल के कच्चे बिलों के जोड़ या GST दरों की एक बार जांच कर लें।',
    time: '10 mins ago',
    timeHi: '10 मिनट पहले',
    type: 'warning',
    read: false,
    link: '/receipts?filter=needs_check',
  },
  {
    id: 'notif-2',
    title: 'Wholesale Rate Alert: Mustard Oil',
    titleHi: 'थोक रेट अलर्ट: सरसों तेल',
    message: 'Mustard Oil 1L rate changed by +₹4/unit on your latest wholesale slip.',
    messageHi: 'पिछले बिल में सरसों तेल 1L का भाव +₹4 प्रति यूनिट बढ़ा है।',
    time: '1 hour ago',
    timeHi: '1 घंटे पहले',
    type: 'info',
    read: false,
    link: '/analysis',
  },
  {
    id: 'notif-3',
    title: 'Hissaab Kitaab AI Ready',
    titleHi: 'Hissaab Kitaab AI तैयार है',
    message: 'Ask questions in Hindi, Hinglish, or English about your monthly spending.',
    messageHi: 'अपने मासिक खर्च और सप्लायर खातों के बारे में हिंदी या इंग्लिश में पूछें।',
    time: 'Today',
    timeHi: 'आज',
    type: 'success',
    read: false,
    link: '/ask-shopledger',
  },
];

const DEFAULT_PREFS: NotificationPreferences = {
  lowConfidenceAlerts: true,
  eveningTallyReminder: true,
  priceHikeAlerts: true,
  browserPushEnabled: false,
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<AppLanguage>(() => {
    const saved = localStorage.getItem('hk_language');
    return saved === 'hi' ? 'hi' : 'en';
  });

  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    try {
      const saved = localStorage.getItem('hk_notifications');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return DEFAULT_NOTIFICATIONS;
  });

  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences>(() => {
    try {
      const saved = localStorage.getItem('hk_notification_prefs');
      if (saved) return { ...DEFAULT_PREFS, ...JSON.parse(saved) };
    } catch {
      // ignore
    }
    return DEFAULT_PREFS;
  });

  useEffect(() => {
    localStorage.setItem('hk_language', language);
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    try {
      localStorage.setItem('hk_notifications', JSON.stringify(notifications));
    } catch {
      // ignore
    }
  }, [notifications]);

  useEffect(() => {
    try {
      localStorage.setItem('hk_notification_prefs', JSON.stringify(notificationPrefs));
    } catch {
      // ignore
    }
  }, [notificationPrefs]);

  const setLanguage = (lang: AppLanguage) => {
    setLanguageState(lang);
  };

  const t = (
    key: string,
    varsOrFallback?: Record<string, string | number> | string,
    fallback?: string
  ): string => {
    let raw = TRANSLATIONS[language]?.[key] ?? TRANSLATIONS.en?.[key];
    if (!raw) {
      if (typeof varsOrFallback === 'string') return varsOrFallback;
      return fallback ?? key;
    }

    if (varsOrFallback && typeof varsOrFallback === 'object') {
      for (const [vKey, val] of Object.entries(varsOrFallback)) {
        raw = raw.replace(new RegExp(`\\{${vKey}\\}`, 'g'), String(val));
      }
    }
    return raw;
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const addNotification = (notif: Omit<NotificationItem, 'id' | 'read'>) => {
    const newItem: NotificationItem = {
      ...notif,
      id: `notif-${Date.now()}`,
      read: false,
    };
    setNotifications((prev) => [newItem, ...prev]);
  };

  const updateNotificationPrefs = (partial: Partial<NotificationPreferences>) => {
    setNotificationPrefs((prev) => ({ ...prev, ...partial }));
  };

  const triggerTestNotification = async () => {
    const nowTime = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    addNotification({
      title: `Hissaab Kitaab Live Alert (${nowTime})`,
      titleHi: `हिसाब किताब लाइव अलर्ट (${nowTime})`,
      message: 'Notifications are active! You will be notified when bills are scanned or need review.',
      messageHi: 'सूचनाएं चालू हैं! नया बिल स्कैन होने या जांच की आवश्यकता होने पर आपको तुरंत अलर्ट मिलेगा।',
      time: 'Just now',
      timeHi: 'अभी',
      type: 'success',
      link: '/receipts',
    });

    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        let perm = Notification.permission;
        if (perm === 'default') {
          perm = await Notification.requestPermission();
        }
        if (perm === 'granted') {
          updateNotificationPrefs({ browserPushEnabled: true });
          new Notification(
            language === 'hi' ? 'हिसाब किताब (Hissaab Kitaab)' : 'Hissaab Kitaab Alert',
            {
              body:
                language === 'hi'
                  ? 'बही-खाता अलर्ट चालू हैं! आपके बिल और रसीदें सुरक्षित हैं।'
                  : 'Store notifications are working! Your bahi-khata alerts are active.',
              icon: '/logo.png',
            }
          );
        }
      } catch {
        // Fallback to in-app notification already added above
      }
    }
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        isHindi: language === 'hi',
        setLanguage,
        t,
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        clearNotifications,
        addNotification,
        triggerTestNotification,
        notificationPrefs,
        updateNotificationPrefs,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return ctx;
};
