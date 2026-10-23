interface DocRecord {
  id: string;
  data: Record<string, any>;
  subcollections?: Record<string, Map<string, DocRecord>>;
}

/**
 * High-fidelity in-memory Firestore implementation used for local development and unit tests
 * when Google Application Default Credentials (ADC) or Firestore Emulators are not running.
 */
export class DevFirestore {
  private collections: Map<string, Map<string, DocRecord>> = new Map();

  constructor() {
    this.seedDefaultData();
  }

  getCollectionMap(path: string): Map<string, DocRecord> {
    if (!this.collections.has(path)) {
      this.collections.set(path, new Map());
    }
    return this.collections.get(path)!;
  }

  collection(path: string) {
    return new DevQuery(this, path);
  }

  batch() {
    const operations: Array<() => Promise<void>> = [];
    return {
      set: (docRef: any, data: any) => {
        operations.push(() => docRef.set(data));
        return this;
      },
      update: (docRef: any, data: any) => {
        operations.push(() => docRef.update(data));
        return this;
      },
      delete: (docRef: any) => {
        operations.push(() => docRef.delete());
        return this;
      },
      commit: async () => {
        for (const op of operations) {
          await op();
        }
      },
    };
  }

  async runTransaction<T>(updateFunction: (transaction: any) => Promise<T>): Promise<T> {
    const transaction = {
      get: async (docRef: any) => docRef.get(),
      set: (docRef: any, data: any) => docRef.set(data),
      update: (docRef: any, data: any) => docRef.update(data),
      delete: (docRef: any) => docRef.delete(),
    };
    return updateFunction(transaction);
  }

  public seedDefaultData() {
    const bizId = 'biz_sharma_kirana';
    const bizMap = this.getCollectionMap('businesses');

    // 1. Business Profile
    bizMap.set(bizId, {
      id: bizId,
      data: {
        id: bizId,
        name: 'Sharma Kirana Store',
        legalName: 'Sharma Provisions & General Merchants Pvt Ltd',
        businessType: 'kirana',
        gstin: '07AAACS1429B1Z8',
        ownerUid: 'user_ramesh_sharma',
        memberUids: ['user_ramesh_sharma', 'user_accountant_mukesh'],
        members: {
          user_ramesh_sharma: {
            uid: 'user_ramesh_sharma',
            role: 'owner',
            displayName: 'Ramesh Sharma',
            email: 'ramesh@sharmakiranastore.in',
            addedAt: '2024-01-01T00:00:00Z',
            addedBy: 'system',
          },
        },
        currency: 'INR',
        currencySymbol: '₹',
        address: {
          line1: 'Shop #14, Main Bazar',
          city: 'Delhi',
          state: 'Delhi',
          pincode: '110006',
          country: 'IN',
        },
        phone: '+91 98110 24891',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-10-24T00:00:00Z',
      },
      subcollections: {},
    });

    // 2. Seed Standard Kirana Receipts for October 2024 (Stitch accurate)
    const receiptsPath = `businesses/${bizId}/receipts`;
    const receiptsMap = this.getCollectionMap(receiptsPath);

    const suppliersList = [
      { id: 'sup-gupta-wholesale', name: 'Gupta Wholesale Mart', gstin: '07AACPG4819M1Z3', phone: '+91 98112 34567' },
      { id: 'sup-balaji-traders', name: 'Shree Balaji Traders', gstin: '07AABCB9812K1Z9', phone: '+91 98734 56789' },
      { id: 'sup-rk-agro', name: 'R.K. Agro Commodities Mandi', gstin: '07AAKCR2109P1ZZ', phone: '+91 98101 23456' },
      { id: 'sup-motherson-foods', name: 'Motherson Food Distributorship', gstin: '07AAXFM9988D1Z4', phone: '+91 98991 12233' },
      { id: 'sup-delhi-flour-mills', name: 'Delhi Flour & Grain Mandi', gstin: '07AABCD1122E1Z1', phone: '+91 98220 33445' },
      { id: 'sup-himalaya-dairy', name: 'Himalaya Dairy Cooperative', gstin: '07AAHDC4455F1Z2', phone: '+91 98330 44556' },
    ];

    const now = new Date();
    const currPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevPrefix = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

    const sampleReceiptConfigs = [
      {
        id: 'REC-2024-1089',
        invoiceNumber: 'GW-8821',
        purchaseDate: `${currPrefix}-24`,
        supplier: suppliersList[0],
        status: 'needs_review' as const,
        grandTotalMinor: 1245000,
        subtotalMinor: 1185714,
        taxTotalMinor: 59286,
        items: [
          { name: 'Aashirvaad Shudh Chakki Atta 10kg', category: 'Atta & Flour', qty: 10, unit: 'bag', priceMinor: 38000, totalMinor: 380000, taxRate: 5 },
          { name: 'Tata Salt Vacuum Evaporated 1kg', category: 'Spices & Salt', qty: 50, unit: 'packet', priceMinor: 2400, totalMinor: 120000, taxRate: 0 },
          { name: 'Fortune Sunlite Refined Oil 1L', category: 'Cooking Oils', qty: 30, unit: 'pouch', priceMinor: 14200, totalMinor: 426000, taxRate: 5, needsReview: true, reason: 'Digit ambiguous: ₹142 or ₹147?' },
          { name: 'Madhur Pure & Hygienic Sugar 5kg', category: 'Sugar & Jaggery', qty: 12, unit: 'bag', priceMinor: 21500, totalMinor: 258000, taxRate: 5 },
          { name: 'MDH Deggi Mirch 100g', category: 'Spices & Masala', qty: 15, unit: 'packet', priceMinor: 4066, totalMinor: 61000, taxRate: 5, needsReview: true, reason: 'Rounding difference of ₹0.10' },
        ],
      },
      {
        id: 'REC-2024-1088',
        invoiceNumber: 'SBT-4912',
        purchaseDate: `${currPrefix}-23`,
        supplier: suppliersList[1],
        status: 'verified' as const,
        grandTotalMinor: 3450000,
        subtotalMinor: 3285714,
        taxTotalMinor: 164286,
        items: [
          { name: 'Fortune Kachi Ghani Mustard Oil 1L', category: 'Cooking Oils', qty: 100, unit: 'pouch', priceMinor: 14800, totalMinor: 1480000, taxRate: 5 },
          { name: 'Madhur Pure Sugar M-30 50kg', category: 'Sugar & Jaggery', qty: 5, unit: 'bag', priceMinor: 212000, totalMinor: 1060000, taxRate: 5 },
          { name: 'Aashirvaad Shudh Chakki Atta 10kg', category: 'Atta & Flour', qty: 20, unit: 'bag', priceMinor: 38500, totalMinor: 770000, taxRate: 5 },
        ],
      },
      {
        id: 'REC-2024-1087',
        invoiceNumber: 'RKA-3011',
        purchaseDate: `${currPrefix}-21`,
        supplier: suppliersList[2],
        status: 'verified' as const,
        grandTotalMinor: 4890000,
        subtotalMinor: 4657143,
        taxTotalMinor: 232857,
        items: [
          { name: 'Basmati Rice Daily Feast 25kg', category: 'Rice & Grains', qty: 20, unit: 'bag', priceMinor: 145000, totalMinor: 2900000, taxRate: 5 },
          { name: 'Moong Dal Mogar 30kg', category: 'Dals & Pulses', qty: 5, unit: 'bag', priceMinor: 398000, totalMinor: 1990000, taxRate: 5 },
        ],
      },
      {
        id: 'REC-2024-1086',
        invoiceNumber: 'MFD-9102',
        purchaseDate: `${currPrefix}-18`,
        supplier: suppliersList[3],
        status: 'verified' as const,
        grandTotalMinor: 1820000,
        subtotalMinor: 1733333,
        taxTotalMinor: 86667,
        items: [
          { name: 'Britannia Good Day Biscuits 60g Carton', category: 'Snacks & Biscuits', qty: 10, unit: 'carton', priceMinor: 72000, totalMinor: 720000, taxRate: 5 },
          { name: 'Parle-G Gold 1kg Box', category: 'Snacks & Biscuits', qty: 20, unit: 'box', priceMinor: 55000, totalMinor: 1100000, taxRate: 5 },
        ],
      },
      {
        id: 'REC-2024-1085',
        invoiceNumber: 'HDC-1198',
        purchaseDate: `${currPrefix}-15`,
        supplier: suppliersList[5],
        status: 'verified' as const,
        grandTotalMinor: 920000,
        subtotalMinor: 876190,
        taxTotalMinor: 43810,
        items: [
          { name: 'Amul Taaza Homogenised Toned Milk 1L', category: 'Dairy & Beverages', qty: 80, unit: 'packet', priceMinor: 7200, totalMinor: 576000, taxRate: 5 },
          { name: 'Amul Butter 500g Block', category: 'Dairy & Beverages', qty: 12, unit: 'piece', priceMinor: 28500, totalMinor: 342000, taxRate: 5 },
        ],
      },
      {
        id: 'REC-2024-1084',
        invoiceNumber: 'GW-8742',
        purchaseDate: `${currPrefix}-11`,
        supplier: suppliersList[0],
        status: 'verified' as const,
        grandTotalMinor: 2540000,
        subtotalMinor: 2419048,
        taxTotalMinor: 120952,
        items: [
          { name: 'Fortune Sunlite Refined Oil 15L Tin', category: 'Cooking Oils', qty: 10, unit: 'tin', priceMinor: 218000, totalMinor: 2180000, taxRate: 5 },
          { name: 'MDH Garam Masala 100g', category: 'Spices & Masala', qty: 40, unit: 'packet', priceMinor: 9000, totalMinor: 360000, taxRate: 5 },
        ],
      },
      {
        id: 'REC-2024-1083',
        invoiceNumber: 'SBT-4809',
        purchaseDate: `${currPrefix}-06`,
        supplier: suppliersList[1],
        status: 'verified' as const,
        grandTotalMinor: 1280000,
        subtotalMinor: 1219048,
        taxTotalMinor: 60952,
        items: [
          { name: 'Madhur Pure Sugar M-30 50kg', category: 'Sugar & Jaggery', qty: 6, unit: 'bag', priceMinor: 204000, totalMinor: 1224000, taxRate: 5 },
        ],
      },
      {
        id: 'REC-2024-1082',
        invoiceNumber: 'DFM-0419',
        purchaseDate: `${currPrefix}-02`,
        supplier: suppliersList[4],
        status: 'needs_review' as const,
        grandTotalMinor: 890000,
        subtotalMinor: 847619,
        taxTotalMinor: 42381,
        items: [
          { name: 'Chana Besan Fine 25kg Bag', category: 'Atta & Flour', qty: 5, unit: 'bag', priceMinor: 178000, totalMinor: 890000, taxRate: 5, needsReview: true, reason: 'Weight smudge on mandi slip' },
        ],
      },
      // Previous Month Receipts for trend comparison
      {
        id: 'REC-2024-0981',
        invoiceNumber: 'GW-8610',
        purchaseDate: `${prevPrefix}-25`,
        supplier: suppliersList[0],
        status: 'verified' as const,
        grandTotalMinor: 3100000,
        subtotalMinor: 2952381,
        taxTotalMinor: 147619,
        items: [
          { name: 'Fortune Sunlite Refined Oil 15L Tin', category: 'Cooking Oils', qty: 15, unit: 'tin', priceMinor: 206666, totalMinor: 3100000, taxRate: 5 },
        ],
      },
      {
        id: 'REC-2024-0975',
        invoiceNumber: 'SBT-4720',
        purchaseDate: `${prevPrefix}-18`,
        supplier: suppliersList[1],
        status: 'verified' as const,
        grandTotalMinor: 2900000,
        subtotalMinor: 2761905,
        taxTotalMinor: 138095,
        items: [
          { name: 'Madhur Pure Sugar M-30 50kg', category: 'Sugar & Jaggery', qty: 15, unit: 'bag', priceMinor: 193333, totalMinor: 2900000, taxRate: 5 },
        ],
      },
      {
        id: 'REC-2024-0960',
        invoiceNumber: 'RKA-2950',
        purchaseDate: `${prevPrefix}-10`,
        supplier: suppliersList[2],
        status: 'verified' as const,
        grandTotalMinor: 3600000,
        subtotalMinor: 3428571,
        taxTotalMinor: 171429,
        items: [
          { name: 'Basmati Rice Daily Feast 25kg', category: 'Rice & Grains', qty: 25, unit: 'bag', priceMinor: 144000, totalMinor: 3600000, taxRate: 5 },
        ],
      },
      // Draft / Processing receipt (MUST be isolated from confirmed totals)
      {
        id: 'REC-2024-DRAFT-01',
        invoiceNumber: 'BUFFER-001',
        purchaseDate: `${currPrefix}-25`,
        supplier: { name: 'Raw Ingestion Buffer' },
        status: 'draft' as const,
        grandTotalMinor: 650000,
        subtotalMinor: 619048,
        taxTotalMinor: 30952,
        items: [],
      },
    ];

    for (const r of sampleReceiptConfigs) {
      const lineItems = (r.items || []).map((it, idx) => ({
        id: `line_${r.id}_${idx + 1}`,
        receiptId: r.id,
        businessId: bizId,
        lineIndex: idx,
        rawName: it.name,
        category: it.category,
        quantity: it.qty,
        unit: (it.unit || 'piece') as any,
        unitPriceMinor: it.priceMinor,
        discountMinor: 0,
        taxRatePercent: it.taxRate,
        taxAmountMinor: Math.round((it.totalMinor * (it.taxRate || 5)) / 100),
        lineTotalMinor: it.totalMinor,
        confidenceScore: (it as any).needsReview ? 0.72 : 0.98,
        needsReview: !!(it as any).needsReview,
        reviewReason: (it as any).reason,
        createdAt: `${r.purchaseDate}T10:00:00Z`,
        updatedAt: `${r.purchaseDate}T10:00:00Z`,
      }));

      const categories = Array.from(new Set(lineItems.map((l) => l.category)));

      const receiptRecord: DocRecord = {
        id: r.id,
        data: {
          id: r.id,
          businessId: bizId,
          invoiceNumber: r.invoiceNumber,
          receiptDate: r.purchaseDate,
          purchaseDate: r.purchaseDate,
          supplier: r.supplier,
          payment: { method: 'upi', status: 'paid' },
          currency: 'INR',
          subtotalMinor: r.subtotalMinor,
          taxTotalMinor: r.taxTotalMinor,
          discountTotalMinor: 0,
          roundOffMinor: 0,
          grandTotalMinor: r.grandTotalMinor,
          reviewStatus: r.status,
          imagePath: 'https://images.unsplash.com/photo-1554415707-9e4466bfe0dc?auto=format&fit=crop&q=80&w=600',
          lineItemCount: lineItems.length,
          categories,
          tags: ['mandi', 'wholesale'],
          isDeleted: false,
          createdAt: `${r.purchaseDate}T10:00:00Z`,
          updatedAt: `${r.purchaseDate}T10:00:00Z`,
        },
        subcollections: {
          items: new Map(lineItems.map((l) => [l.id, { id: l.id, data: l }])),
        },
      };

      receiptsMap.set(r.id, receiptRecord);

      const itemsCollectionMap = this.getCollectionMap(`${receiptsPath}/${r.id}/items`);
      for (const line of lineItems) {
        itemsCollectionMap.set(line.id, { id: line.id, data: line });
      }
    }

    // 3. Seed Normalized Suppliers Collection (businesses/{bizId}/suppliers)
    const suppliersMap = this.getCollectionMap(`businesses/${bizId}/suppliers`);
    const supplierDetails = [
      {
        ...suppliersList[0],
        businessId: bizId,
        contactPerson: 'Vikram Gupta',
        mandiMarket: 'Khari Baoli Wholesale Mandi, Old Delhi',
        aliases: ['Gupta Ji Mandi Wale', 'GWM Provisions', 'Gupta Wholesale'],
        notes: 'Delivers every Tuesday and Friday morning. 15-day credit cycle on edible oil tins.',
        totalReceiptsCount: 3,
        totalSpendMinor: 9740000,
        lastPurchaseDate: `${currPrefix}-19`,
        createdAt: '2024-04-01T00:00:00Z',
        updatedAt: `${currPrefix}-24T10:00:00Z`,
      },
      {
        ...suppliersList[1],
        businessId: bizId,
        contactPerson: 'Suresh Aggarwal',
        mandiMarket: 'Naya Bazar Grain & Oil Market',
        aliases: ['Balaji Traders', 'SBT Naya Bazar'],
        notes: 'Best rates on Fortune mustard oil pouches and M-30 sugar bags.',
        totalReceiptsCount: 3,
        totalSpendMinor: 7630000,
        lastPurchaseDate: `${currPrefix}-23`,
        createdAt: '2024-04-01T00:00:00Z',
        updatedAt: `${currPrefix}-23T10:00:00Z`,
      },
      {
        ...suppliersList[2],
        businessId: bizId,
        contactPerson: 'Rajesh Kumar',
        mandiMarket: 'Lawrence Road Industrial Area',
        aliases: ['RK Agro', 'R.K. Commodities'],
        notes: 'Primary supplier for Basmati rice and Moong Dal Mogar.',
        totalReceiptsCount: 2,
        totalSpendMinor: 8490000,
        lastPurchaseDate: `${currPrefix}-21`,
        createdAt: '2024-04-01T00:00:00Z',
        updatedAt: `${currPrefix}-21T10:00:00Z`,
      },
      {
        ...suppliersList[3],
        businessId: bizId,
        contactPerson: 'Anil Mehra',
        mandiMarket: 'Okhla Phase II FMCG Hub',
        aliases: ['Motherson Foods', 'MFD Okhla'],
        notes: 'Authorized distributor for Britannia and Parle biscuits.',
        totalReceiptsCount: 1,
        totalSpendMinor: 1820000,
        lastPurchaseDate: `${currPrefix}-18`,
        createdAt: '2024-04-01T00:00:00Z',
        updatedAt: `${currPrefix}-18T10:00:00Z`,
      },
      {
        ...suppliersList[4],
        businessId: bizId,
        contactPerson: 'Mahender Singh',
        mandiMarket: 'Najafgarh Grain Mandi',
        aliases: ['Delhi Flour Mills', 'DFM Najafgarh'],
        notes: 'Bulk chakki atta and chana besan supplier.',
        totalReceiptsCount: 1,
        totalSpendMinor: 890000,
        lastPurchaseDate: `${currPrefix}-02`,
        createdAt: '2024-04-01T00:00:00Z',
        updatedAt: `${currPrefix}-02T10:00:00Z`,
      },
      {
        ...suppliersList[5],
        businessId: bizId,
        contactPerson: 'Devender Rawat',
        mandiMarket: 'Mother Dairy / Patparganj Depot',
        aliases: ['Himalaya Dairy', 'HDC Dairy'],
        notes: 'Morning chilled delivery for Amul milk and butter.',
        totalReceiptsCount: 1,
        totalSpendMinor: 920000,
        lastPurchaseDate: `${currPrefix}-15`,
        createdAt: '2024-04-01T00:00:00Z',
        updatedAt: `${currPrefix}-15T10:00:00Z`,
      },
    ];
    for (const s of supplierDetails) {
      suppliersMap.set(s.id, { id: s.id, data: s });
    }

    // 4. Seed Normalized Product Catalog (businesses/{bizId}/items)
    const catalogMap = this.getCollectionMap(`businesses/${bizId}/items`);
    const catalogItems = [
      {
        id: 'item-fortune-mustard-1l',
        businessId: bizId,
        name: 'Fortune Kachi Ghani Mustard Oil 1L',
        category: 'Cooking Oils',
        hsnCode: '1514',
        defaultUnit: 'pouch',
        typicalPurchasePriceMinor: 14500,
        lastPurchasePriceMinor: 14800,
        lowestPriceMinor: 14200,
        highestPriceMinor: 14800,
        lastSupplierId: 'sup-balaji-traders',
        primarySupplierName: 'Shree Balaji Traders',
        stockQuantity: 85,
        lastPurchaseDate: `${currPrefix}-23`,
        createdAt: '2024-04-01T00:00:00Z',
        updatedAt: `${currPrefix}-23T10:00:00Z`,
      },
      {
        id: 'item-fortune-sunlite-15l',
        businessId: bizId,
        name: 'Fortune Sunlite Refined Oil 15L Tin',
        category: 'Cooking Oils',
        hsnCode: '1512',
        defaultUnit: 'tin',
        typicalPurchasePriceMinor: 215000,
        lastPurchasePriceMinor: 215000,
        lowestPriceMinor: 206666,
        highestPriceMinor: 218000,
        lastSupplierId: 'sup-gupta-wholesale',
        primarySupplierName: 'Gupta Wholesale Mart',
        stockQuantity: 18,
        lastPurchaseDate: `${currPrefix}-19`,
        createdAt: '2024-04-01T00:00:00Z',
        updatedAt: `${currPrefix}-19T10:00:00Z`,
      },
      {
        id: 'item-aashirvaad-atta-10kg',
        businessId: bizId,
        name: 'Aashirvaad Shudh Chakki Atta 10kg',
        category: 'Atta & Flour',
        hsnCode: '1101',
        defaultUnit: 'bag',
        typicalPurchasePriceMinor: 38000,
        lastPurchasePriceMinor: 38500,
        lowestPriceMinor: 38000,
        highestPriceMinor: 38500,
        lastSupplierId: 'sup-balaji-traders',
        primarySupplierName: 'Shree Balaji Traders',
        stockQuantity: 32,
        lastPurchaseDate: `${currPrefix}-23`,
        createdAt: '2024-04-01T00:00:00Z',
        updatedAt: `${currPrefix}-23T10:00:00Z`,
      },
      {
        id: 'item-madhur-sugar-50kg',
        businessId: bizId,
        name: 'Madhur Pure Sugar M-30 50kg',
        category: 'Sugar & Jaggery',
        hsnCode: '1701',
        defaultUnit: 'bag',
        typicalPurchasePriceMinor: 204000,
        lastPurchasePriceMinor: 212000,
        lowestPriceMinor: 193333,
        highestPriceMinor: 212000,
        lastSupplierId: 'sup-balaji-traders',
        primarySupplierName: 'Shree Balaji Traders',
        stockQuantity: 14,
        lastPurchaseDate: `${currPrefix}-23`,
        createdAt: '2024-04-01T00:00:00Z',
        updatedAt: `${currPrefix}-23T10:00:00Z`,
      },
      {
        id: 'item-basmati-rice-25kg',
        businessId: bizId,
        name: 'Basmati Rice Daily Feast 25kg',
        category: 'Rice & Grains',
        hsnCode: '1006',
        defaultUnit: 'bag',
        typicalPurchasePriceMinor: 145000,
        lastPurchasePriceMinor: 145000,
        lowestPriceMinor: 144000,
        highestPriceMinor: 145000,
        lastSupplierId: 'sup-rk-agro',
        primarySupplierName: 'R.K. Agro Commodities Mandi',
        stockQuantity: 22,
        lastPurchaseDate: `${currPrefix}-21`,
        createdAt: '2024-04-01T00:00:00Z',
        updatedAt: `${currPrefix}-21T10:00:00Z`,
      },
    ];
    for (const item of catalogItems) {
      catalogMap.set(item.id, { id: item.id, data: item });
    }

    // 5. Seed Store Categories (businesses/{bizId}/categories)
    const categoriesMap = this.getCollectionMap(`businesses/${bizId}/categories`);
    const storeCategories = [
      { id: 'cat-cooking-oils', businessId: bizId, name: 'Cooking Oils', gstSlabPercent: 5 },
      { id: 'cat-atta-flour', businessId: bizId, name: 'Atta & Flour', gstSlabPercent: 5 },
      { id: 'cat-rice-grains', businessId: bizId, name: 'Rice & Grains', gstSlabPercent: 5 },
      { id: 'cat-dals-pulses', businessId: bizId, name: 'Dals & Pulses', gstSlabPercent: 5 },
      { id: 'cat-sugar-jaggery', businessId: bizId, name: 'Sugar & Jaggery', gstSlabPercent: 5 },
      { id: 'cat-spices-masala', businessId: bizId, name: 'Spices & Masala', gstSlabPercent: 5 },
      { id: 'cat-snacks-biscuits', businessId: bizId, name: 'Snacks & Biscuits', gstSlabPercent: 12 },
      { id: 'cat-dairy-beverages', businessId: bizId, name: 'Dairy & Beverages', gstSlabPercent: 5 },
    ];
    for (const cat of storeCategories) {
      categoriesMap.set(cat.id, { id: cat.id, data: cat });
    }
  }

  getAllCollections(): Map<string, Map<string, DocRecord>> {
    return this.collections;
  }
}

export class DevQuery {
  private db: DevFirestore;
  private path: string;
  private filters: Array<{ field: string; op: string; val: any }> = [];
  private orderFields: Array<{ field: string; dir: 'asc' | 'desc' }> = [];
  private limitCount?: number;
  private offsetCount?: number;

  constructor(db: DevFirestore, path: string) {
    this.db = db;
    this.path = path;
  }

  doc(id?: string) {
    const docId = id || `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    return new DevDocRef(this.db, this.path, docId);
  }

  where(field: string, op: string, val: any) {
    const q = new DevQuery(this.db, this.path);
    q.filters = [...this.filters, { field, op, val }];
    q.orderFields = [...this.orderFields];
    q.limitCount = this.limitCount;
    q.offsetCount = this.offsetCount;
    return q;
  }

  orderBy(field: string, dir: 'asc' | 'desc' = 'asc') {
    const q = new DevQuery(this.db, this.path);
    q.filters = [...this.filters];
    q.orderFields = [...this.orderFields, { field, dir }];
    q.limitCount = this.limitCount;
    q.offsetCount = this.offsetCount;
    return q;
  }

  limit(count: number) {
    const q = new DevQuery(this.db, this.path);
    q.filters = [...this.filters];
    q.orderFields = [...this.orderFields];
    q.limitCount = count;
    q.offsetCount = this.offsetCount;
    return q;
  }

  offset(count: number) {
    const q = new DevQuery(this.db, this.path);
    q.filters = [...this.filters];
    q.orderFields = [...this.orderFields];
    q.limitCount = this.limitCount;
    q.offsetCount = count;
    return q;
  }

  count() {
    return {
      get: async () => {
        const snap = await this.get();
        return {
          data: () => ({ count: snap.docs.length }),
        };
      },
    };
  }

  async get() {
    const map = this.db.getCollectionMap(this.path);
    let records = Array.from(map.values()).map((r) => r.data);

    for (const f of this.filters) {
      records = records.filter((rec) => {
        const parts = f.field.split('.');
        let val = rec;
        for (const p of parts) {
          val = val?.[p];
        }

        if (f.op === '==') return val === f.val;
        if (f.op === '!=') return val !== f.val;
        if (f.op === '>=') return val >= f.val;
        if (f.op === '<=') return val <= f.val;
        if (f.op === '>') return val > f.val;
        if (f.op === '<') return val < f.val;
        if (f.op === 'array-contains') return Array.isArray(val) && val.includes(f.val);
        return true;
      });
    }

    for (const o of this.orderFields) {
      records.sort((a, b) => {
        const valA = a[o.field] ?? '';
        const valB = b[o.field] ?? '';
        if (valA < valB) return o.dir === 'asc' ? -1 : 1;
        if (valA > valB) return o.dir === 'asc' ? 1 : -1;
        return 0;
      });
    }

    if (this.offsetCount) {
      records = records.slice(this.offsetCount);
    }
    if (this.limitCount) {
      records = records.slice(0, this.limitCount);
    }

    return {
      empty: records.length === 0,
      size: records.length,
      docs: records.map((data) => ({
        id: data.id,
        data: () => ({ ...data }),
        ref: new DevDocRef(this.db, this.path, data.id),
      })),
    };
  }
}

export class DevDocRef {
  private db: DevFirestore;
  private collectionPath: string;
  public id: string;

  constructor(db: DevFirestore, collectionPath: string, id: string) {
    this.db = db;
    this.collectionPath = collectionPath;
    this.id = id;
  }

  collection(subPath: string) {
    return new DevQuery(this.db, `${this.collectionPath}/${this.id}/${subPath}`);
  }

  async get() {
    const map = this.db.getCollectionMap(this.collectionPath);
    const rec = map.get(this.id);
    return {
      exists: !!rec,
      id: this.id,
      data: () => (rec ? { ...rec.data } : undefined),
      ref: this,
    };
  }

  async set(data: any, options?: { merge?: boolean }) {
    const map = this.db.getCollectionMap(this.collectionPath);
    const existing = map.get(this.id);
    const newData = options?.merge && existing ? { ...existing.data, ...data } : { ...data, id: this.id };
    map.set(this.id, {
      id: this.id,
      data: newData,
      subcollections: existing?.subcollections || {},
    });
  }

  async update(data: any) {
    const map = this.db.getCollectionMap(this.collectionPath);
    const existing = map.get(this.id);
    if (!existing) {
      throw new Error(`Document ${this.id} does not exist for update`);
    }
    const updatedData = { ...existing.data, ...data };
    map.set(this.id, {
      ...existing,
      data: updatedData,
    });
  }

  async delete() {
    const map = this.db.getCollectionMap(this.collectionPath);
    map.delete(this.id);
  }
}
