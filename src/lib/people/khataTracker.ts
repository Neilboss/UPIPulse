export interface KhataPerson {
  id: string;
  name: string;
  phone?: string;
  netBalance: number; // Positive = they owe you; Negative = you owe them
  entriesCount: number;
  lastUpdated: string;
}

export interface KhataEntry {
  id: string;
  personId: string;
  personName: string;
  amount: number;
  type: 'YOU_LENT' | 'YOU_BORROWED'; // YOU_LENT = they owe you, YOU_BORROWED = you owe them
  note: string;
  transactionId?: string;
  settled: boolean;
  settledAt?: string;
  createdAt: string;
}

export class KhataManager {
  private static STORAGE_KEY = 'upipulse_khata_entries';

  public static getEntries(): KhataEntry[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public static saveEntries(entries: KhataEntry[]) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(entries));
    } catch (e) {
      console.error('Failed to save khata entries', e);
    }
  }

  public static addEntry(entry: Omit<KhataEntry, 'id' | 'createdAt' | 'settled'>): KhataEntry {
    const entries = this.getEntries();
    const newEntry: KhataEntry = {
      ...entry,
      id: 'khata_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      createdAt: new Date().toISOString(),
      settled: false,
    };
    entries.unshift(newEntry);
    this.saveEntries(entries);
    return newEntry;
  }

  public static settleEntry(id: string): boolean {
    const entries = this.getEntries();
    const idx = entries.findIndex((e) => e.id === id);
    if (idx === -1) return false;
    entries[idx].settled = true;
    entries[idx].settledAt = new Date().toISOString();
    this.saveEntries(entries);
    return true;
  }

  public static deleteEntry(id: string): boolean {
    const entries = this.getEntries().filter((e) => e.id !== id);
    this.saveEntries(entries);
    return true;
  }

  public static getPeopleSummary(): {
    people: KhataPerson[];
    totalToReceive: number;
    totalToPay: number;
  } {
    const entries = this.getEntries().filter((e) => !e.settled);
    const peopleMap: Record<string, { name: string; netBalance: number; count: number; lastUpdated: string }> = {};

    let totalToReceive = 0;
    let totalToPay = 0;

    for (const e of entries) {
      const pKey = e.personName.trim().toLowerCase();
      if (!peopleMap[pKey]) {
        peopleMap[pKey] = {
          name: e.personName.trim(),
          netBalance: 0,
          count: 0,
          lastUpdated: e.createdAt,
        };
      }

      const delta = e.type === 'YOU_LENT' ? e.amount : -e.amount;
      peopleMap[pKey].netBalance += delta;
      peopleMap[pKey].count += 1;
      if (new Date(e.createdAt) > new Date(peopleMap[pKey].lastUpdated)) {
        peopleMap[pKey].lastUpdated = e.createdAt;
      }
    }

    const people: KhataPerson[] = Object.entries(peopleMap).map(([key, data]) => {
      if (data.netBalance > 0) totalToReceive += data.netBalance;
      if (data.netBalance < 0) totalToPay += Math.abs(data.netBalance);
      return {
        id: 'p_' + key,
        name: data.name,
        netBalance: data.netBalance,
        entriesCount: data.count,
        lastUpdated: data.lastUpdated,
      };
    });

    people.sort((a, b) => Math.abs(b.netBalance) - Math.abs(a.netBalance));

    return {
      people,
      totalToReceive,
      totalToPay,
    };
  }

  public static generateWhatsAppReminder(personName: string, amount: number, note?: string): string {
    const noteText = note ? ` for ${note}` : '';
    const text = `Hey ${personName}! Just a gentle reminder regarding ₹${amount.toLocaleString('en-IN')}${noteText} via UPI. Let me know when you can settle it. Thanks!`;
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  }
}
