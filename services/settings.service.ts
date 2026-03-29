import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase/config';

export interface SystemSettings {
  slaDays: {
    high: number;
    medium: number;
    low: number;
  };
  notifications: {
    newComplaintAlerts: boolean;
    slaBreachAlerts: boolean;
    dailySummary: boolean;
  };
  updatedAt?: Date;
  updatedBy?: string;
}

const DEFAULT_SETTINGS: SystemSettings = {
  slaDays: {
    high: 1,
    medium: 3,
    low: 7,
  },
  notifications: {
    newComplaintAlerts: true,
    slaBreachAlerts: true,
    dailySummary: false,
  },
};

export async function getSystemSettings(): Promise<SystemSettings> {
  try {
    const ref = doc(db, 'settings', 'system');
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      return DEFAULT_SETTINGS;
    }

    const data = snap.data();
    return {
      slaDays: {
        high: data?.slaDays?.high ?? DEFAULT_SETTINGS.slaDays.high,
        medium: data?.slaDays?.medium ?? DEFAULT_SETTINGS.slaDays.medium,
        low: data?.slaDays?.low ?? DEFAULT_SETTINGS.slaDays.low,
      },
      notifications: {
        newComplaintAlerts:
          data?.notifications?.newComplaintAlerts ?? DEFAULT_SETTINGS.notifications.newComplaintAlerts,
        slaBreachAlerts:
          data?.notifications?.slaBreachAlerts ?? DEFAULT_SETTINGS.notifications.slaBreachAlerts,
        dailySummary: data?.notifications?.dailySummary ?? DEFAULT_SETTINGS.notifications.dailySummary,
      },
      updatedAt: data?.updatedAt?.toDate?.(),
      updatedBy: data?.updatedBy,
    };
  } catch (error) {
    console.error('Error fetching system settings:', error);
    return DEFAULT_SETTINGS;
  }
}

export async function saveSystemSettings(
  settings: SystemSettings,
  updatedBy?: string
): Promise<boolean> {
  try {
    const ref = doc(db, 'settings', 'system');
    await setDoc(
      ref,
      {
        ...settings,
        updatedBy: updatedBy || null,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    return true;
  } catch (error) {
    console.error('Error saving system settings:', error);
    return false;
  }
}
