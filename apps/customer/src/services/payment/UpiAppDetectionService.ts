import { Linking, Platform } from 'react-native';

export interface InstalledUpiApp {
  id: string;
  name: string;
  packageName: string;
  scheme: string;
  brand: 'GPAY' | 'PHONEPE' | 'PAYTM' | 'BHIM' | 'WHATSAPP' | 'AMAZONPAY' | 'GENERIC_UPI';
  isInstalled: boolean;
}

const KNOWN_UPI_APPS: Omit<InstalledUpiApp, 'isInstalled'>[] = [
  {
    id: 'gpay',
    name: 'Google Pay',
    packageName: 'com.google.android.apps.nbu.paisa.user',
    scheme: 'tez://upi/pay',
    brand: 'GPAY',
  },
  {
    id: 'phonepe',
    name: 'PhonePe',
    packageName: 'com.phonepe.app',
    scheme: 'phonepe://pay',
    brand: 'PHONEPE',
  },
  {
    id: 'paytm',
    name: 'Paytm UPI',
    packageName: 'net.one97.paytm',
    scheme: 'paytmmp://upi/pay',
    brand: 'PAYTM',
  },
  {
    id: 'bhim',
    name: 'BHIM UPI',
    packageName: 'in.org.npci.upiapp',
    scheme: 'bhim://upi/pay',
    brand: 'BHIM',
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp Pay',
    packageName: 'com.whatsapp',
    scheme: 'whatsapp://pay',
    brand: 'WHATSAPP',
  },
  {
    id: 'amazonpay',
    name: 'Amazon Pay',
    packageName: 'in.amazon.mShop.android.shopping',
    scheme: 'amazonpay://upi/pay',
    brand: 'AMAZONPAY',
  },
];

class UpiAppDetectionService {
  /**
   * Real-time query to check which UPI apps can handle deep-linking on the current device.
   */
  async getInstalledUpiApps(): Promise<InstalledUpiApp[]> {
    if (Platform.OS !== 'android' && Platform.OS !== 'ios') {
      return [];
    }

    const results = await Promise.all(
      KNOWN_UPI_APPS.map(async (app) => {
        try {
          // Check app-specific scheme (e.g. tez://upi/pay, phonepe://pay)
          let canOpen = await Linking.canOpenURL(app.scheme);
          
          // Also try base scheme if available
          if (!canOpen && app.scheme.includes('://')) {
            const base = `${app.scheme.split('://')[0]}://`;
            canOpen = await Linking.canOpenURL(base);
          }

          return {
            ...app,
            isInstalled: canOpen,
          };
        } catch (e) {
          return {
            ...app,
            isInstalled: false,
          };
        }
      })
    );

    let installed = results.filter((app) => app.isInstalled);

    // If device is Android and specific schemes are restricted by OS, detect standard UPI handler
    if (installed.length === 0 && Platform.OS === 'android') {
      try {
        const canOpenGenericUpi = await Linking.canOpenURL('upi://pay');
        if (canOpenGenericUpi) {
          // Add known top UPI providers that handle standard upi://pay
          installed = [
            {
              id: 'gpay',
              name: 'Google Pay',
              packageName: 'com.google.android.apps.nbu.paisa.user',
              scheme: 'tez://upi/pay',
              brand: 'GPAY',
              isInstalled: true,
            },
            {
              id: 'phonepe',
              name: 'PhonePe',
              packageName: 'com.phonepe.app',
              scheme: 'phonepe://pay',
              brand: 'PHONEPE',
              isInstalled: true,
            },
            {
              id: 'paytm',
              name: 'Paytm UPI',
              packageName: 'net.one97.paytm',
              scheme: 'paytmmp://upi/pay',
              brand: 'PAYTM',
              isInstalled: true,
            },
          ];
        }
      } catch (err) {
        console.warn('[UpiAppDetectionService] Generic UPI check failed:', err);
      }
    }

    return installed;
  }

  /**
   * Launches official UPI payment URI directly into the chosen UPI app
   */
  async launchUpiApp(app: InstalledUpiApp, params: {
    pa: string; // VPA
    pn: string; // Payee Name
    am: number; // Amount in rupees
    tr: string; // Transaction Ref / Internal Payment ID
    tn?: string; // Note
  }): Promise<boolean> {
    const rawUpiUri = `upi://pay?pa=${encodeURIComponent(params.pa)}&pn=${encodeURIComponent(params.pn)}&am=${params.am.toFixed(2)}&tr=${encodeURIComponent(params.tr)}&cu=INR&tn=${encodeURIComponent(params.tn || 'Serventica Order')}`;

    try {
      // First try app-specific scheme
      if (app.scheme.includes('://')) {
        const baseScheme = app.scheme.split('://')[0];
        const appSpecificUri = `${baseScheme}://upi/pay?pa=${encodeURIComponent(params.pa)}&pn=${encodeURIComponent(params.pn)}&am=${params.am.toFixed(2)}&tr=${encodeURIComponent(params.tr)}&cu=INR&tn=${encodeURIComponent(params.tn || 'Serventica Order')}`;
        
        const canOpen = await Linking.canOpenURL(appSpecificUri);
        if (canOpen) {
          await Linking.openURL(appSpecificUri);
          return true;
        }
      }

      // Fallback to standard UPI intent
      const canOpenStandard = await Linking.canOpenURL(rawUpiUri);
      if (canOpenStandard) {
        await Linking.openURL(rawUpiUri);
        return true;
      }

      return false;
    } catch (err) {
      console.warn('[UpiAppDetectionService] Failed to open UPI app:', err);
      return false;
    }
  }
}

export const upiAppDetectionService = new UpiAppDetectionService();
