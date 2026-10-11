declare global {
  interface Window {
    Capacitor?: any;
  }
}

export interface SmsMessage {
  body: string;
  address: string;
  date: number;
}

export class SmsBridge {
  public static isNativeAndroid(): boolean {
    return typeof window !== 'undefined' && !!window.Capacitor?.isNativePlatform?.();
  }

  public static async requestSmsPermissions(): Promise<{ granted: boolean }> {
    if (this.isNativeAndroid()) {
      try {
        const { Plugins } = window.Capacitor;
        if (Plugins?.SmsReaderPlugin) {
          return await Plugins.SmsReaderPlugin.requestPermissions();
        }
      } catch (e) {
        console.error('Failed to request SMS permissions via native plugin', e);
      }
    }
    // Web fallback
    return { granted: true };
  }

  public static async checkPermissions(): Promise<{ granted: boolean }> {
    if (this.isNativeAndroid()) {
      try {
        const { Plugins } = window.Capacitor;
        if (Plugins?.SmsReaderPlugin) {
          return await Plugins.SmsReaderPlugin.checkPermissions();
        }
      } catch (e) {
        console.error('Failed to check SMS permissions', e);
      }
    }
    return { granted: true };
  }

  public static async fetchHistoricalSms(days: number = 60): Promise<SmsMessage[]> {
    if (this.isNativeAndroid()) {
      try {
        const { Plugins } = window.Capacitor;
        if (Plugins?.SmsReaderPlugin) {
          const res = await Plugins.SmsReaderPlugin.getHistoricalSms({ days });
          return res.messages || [];
        }
      } catch (e) {
        console.error('Native getHistoricalSms failed', e);
      }
    }

    // Web simulation fixtures: realistic Indian bank and UPI alerts across last N days
    return this.getSimulatedSmsMessages(days);
  }

  public static registerIncomingSmsListener(onMessage: (msg: SmsMessage) => void) {
    if (this.isNativeAndroid()) {
      try {
        const { Plugins } = window.Capacitor;
        if (Plugins?.SmsReaderPlugin) {
          Plugins.SmsReaderPlugin.addListener('onSmsReceived', (data: SmsMessage) => {
            onMessage(data);
          });
        }
      } catch (e) {
        console.error('Failed to register SMS listener', e);
      }
    }
  }

  // Realistic sample Indian SMS messages for preview/testing
  public static getSimulatedSmsMessages(days: number): SmsMessage[] {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    const templates = [
      {
        body: 'Sent Rs.450.00 from HDFC Bank A/C **4321 to SWIGGY on 10-Oct-26. Avail Bal: INR 14,850.00. Ref: 427182930192',
        address: 'HDFCBK',
        daysAgo: 1,
      },
      {
        body: 'Paid Rs 250 to Blue Tokai Coffee via Google Pay UPI. UTR: 427182930200.',
        address: 'GOOGLEPAY',
        daysAgo: 2,
      },
      {
        body: 'Rs 120.00 debited from SBI a/c no. XX9876 on 08Oct26 by UPI Swiggy. Bal Rs 5230.10. Ref 428192837192',
        address: 'SBISMS',
        daysAgo: 4,
      },
      {
        body: 'Rs. 899.00 debited from ICICI Bank Acct XX098 on 05-Oct-26 for AMAZON. Avail Bal: Rs 28,150.75. UTR: 429182736451',
        address: 'ICICIB',
        daysAgo: 7,
      },
      {
        body: 'Debited INR 1,299.00 from Axis Bank A/C no. XX5678 on 01-Oct-26 via UPI to ZOMATO. Avl Bal: INR 15,400.00. Ref 430192847192',
        address: 'AXISBK',
        daysAgo: 11,
      },
      {
        body: 'Sent Rs.649.00 from HDFC Bank A/C **4321 to NETFLIX on 25-Sep-26. Avail Bal: INR 16,699.00. Ref: 421192837192',
        address: 'HDFCBK',
        daysAgo: 17,
      },
      {
        body: 'Rs 119.00 debited from SBI a/c no. XX9876 on 20Sep26 by UPI Spotify. Bal Rs 6098.00. Ref 418192837192',
        address: 'SBISMS',
        daysAgo: 22,
      },
      {
        body: 'INR 45,000.00 credited to HDFC Bank A/C **4321 on 30-Sep-26 by SALARY ACME TECH. Avail Bal: INR 56,200.00. Ref: 425192837192',
        address: 'HDFCBK',
        daysAgo: 12,
      },
      {
        body: 'Paid Rs 350 to Blinkit via PhonePe. Transaction ID: T26100214309871.',
        address: 'PHONEPE',
        daysAgo: 9,
      },
      {
        body: 'Rs. 1,450.00 debited from ICICI Bank Acct XX098 on 15-Sep-26 for BESCOM ELECTRICITY. Avail Bal: Rs 29,600.75. UTR: 419182736451',
        address: 'ICICIB',
        daysAgo: 27,
      },
    ];

    return templates
      .filter((t) => t.daysAgo <= days)
      .map((t) => ({
        body: t.body,
        address: t.address,
        date: now - t.daysAgo * dayMs,
      }));
  }
}
