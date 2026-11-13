import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const PROME_SUPPLIERS_2026 = [
  // A - Stationery Supplier
  {
    supplierNumber: 'PROME-SUP-2026-A01',
    name: 'KMR BUSINESS BUREAU LTD',
    contactName: 'P. O Box 26948, Kampala, Plot 19, Nasser Road',
    phone: '07772407469, 0702407469',
    category: 'A - Stationery Supplier',
    status: 'Approved',
    approvalDate: new Date('2026-01-04'),
    nextEvaluationDate: new Date('2026-12-31'),
    notes: 'Official Supplier Master List PROME-IMSR-TO-31 (Category A: Stationery)'
  },
  {
    supplierNumber: 'PROME-SUP-2026-A02',
    name: 'STALANE ENTERPRISES LIMITED',
    contactName: 'P. O. Box 3135, Kampala',
    phone: '0700815802, 0705138596, 0785814047',
    category: 'A - Stationery Supplier',
    status: 'Approved',
    approvalDate: new Date('2026-01-04'),
    nextEvaluationDate: new Date('2026-12-31'),
    notes: 'Official Supplier Master List PROME-IMSR-TO-31 (Category A: Stationery)'
  },

  // B - Computer & Printers Suppliers
  {
    supplierNumber: 'PROME-SUP-2026-B01',
    name: 'MILLENEUM INFORSYSTEMS',
    contactName: 'Plot 23 Cooper Road, Kisementi, Kololo, Kampala',
    phone: '0414-231122, 0772-500120',
    category: 'B - Computer & Printers Suppliers',
    status: 'Approved',
    approvalDate: new Date('2026-01-04'),
    nextEvaluationDate: new Date('2026-12-31'),
    notes: 'Official Supplier Master List PROME-IMSR-TO-31 (Category B: Computers & Printers)'
  },

  // C - Newspaper Suppliers
  {
    supplierNumber: 'PROME-SUP-2026-C01',
    name: 'MONITOR PUBLICATIONS LTD',
    contactName: 'Plot 29-35, 8th Street Industrial Area, Kampala',
    phone: '0414-232367 / 236939, Fax: 253482 & 232369',
    category: 'C - Newspaper Suppliers',
    status: 'Approved',
    approvalDate: new Date('2026-01-04'),
    nextEvaluationDate: new Date('2026-12-31'),
    notes: 'Official Supplier Master List PROME-IMSR-TO-31 (Category C: Newspapers)'
  },
  {
    supplierNumber: 'PROME-SUP-2026-C02',
    name: 'NEW VISION PRINTING & PUBLISHING COMPANY LTD',
    contactName: 'Plot 19/21 3rd Street Industrial Area, P. O. Box 9815 Kampala',
    phone: '0414-337000, 344191/701',
    category: 'C - Newspaper Suppliers',
    status: 'Approved',
    approvalDate: new Date('2026-01-04'),
    nextEvaluationDate: new Date('2026-12-31'),
    notes: 'Official Supplier Master List PROME-IMSR-TO-31 (Category C: Newspapers)'
  },

  // D - Insurance
  {
    supplierNumber: 'PROME-SUP-2026-D01',
    name: 'UAP OLD MUTUAL INSURANCE',
    contactName: 'UAP Insurance Building, Plot 1 Kimathi Avenue, PO Box 7185, Kampala - UGANDA',
    phone: '+256-414-332700',
    category: 'D - Insurance Services',
    status: 'Approved',
    approvalDate: new Date('2026-01-04'),
    nextEvaluationDate: new Date('2026-12-31'),
    notes: 'Official Supplier Master List PROME-IMSR-TO-31 (Category D: Insurance)'
  },
  {
    supplierNumber: 'PROME-SUP-2026-D02',
    name: 'ICEA LION GENERAL INSURANCE',
    contactName: 'Rwenzori Courts, Ground, 1st and 2nd Floor, Lumumba Ave, Kampala',
    phone: '0417706774 / 0414232337 / 0800100120',
    category: 'D - Insurance Services',
    status: 'Approved',
    approvalDate: new Date('2026-01-04'),
    nextEvaluationDate: new Date('2026-12-31'),
    notes: 'Official Supplier Master List PROME-IMSR-TO-31 (Category D: Insurance)'
  },
  {
    supplierNumber: 'PROME-SUP-2026-D03',
    name: 'STATEWIDE INSURANCE COMPANY (SWICO)',
    contactName: 'Sure House, Plot 1 Bombo Road, P.O. Box 9393, Kampala, Uganda',
    phone: '+256-312-262119',
    category: 'D - Insurance Services',
    status: 'Approved',
    approvalDate: new Date('2026-01-04'),
    nextEvaluationDate: new Date('2026-12-31'),
    notes: 'Official Supplier Master List PROME-IMSR-TO-31 (Category D: Insurance)'
  },

  // E - Motor Vehicle/Motorcycle Supplier
  {
    supplierNumber: 'PROME-SUP-2026-E01',
    name: 'TOYOTA UGANDA LIMITED (CFAO MOBILITY)',
    contactName: '1 First Street, Industrial Area, P. O. Box 31732, Kampala',
    phone: '0312-301500',
    category: 'E - Motor Vehicle/Motorcycle Supplier',
    status: 'Approved',
    approvalDate: new Date('2026-01-04'),
    nextEvaluationDate: new Date('2026-12-31'),
    notes: 'Official Supplier Master List PROME-IMSR-TO-31 (Category E: Motor Vehicles)'
  },

  // F - Travel Services
  {
    supplierNumber: 'PROME-SUP-2026-F01',
    name: 'SATGURU TRAVEL & TOURS',
    contactName: 'Plot 11 Portal Avenue, P. O. Box 7392, Kampala',
    phone: '0414-344292 & 232185, Fax: 344801',
    category: 'F - Travel Services',
    status: 'Approved',
    approvalDate: new Date('2026-01-04'),
    nextEvaluationDate: new Date('2026-12-31'),
    notes: 'Official Supplier Master List PROME-IMSR-TO-31 (Category F: Travel)'
  },

  // G - Motor Vehicle Repairs & Spare Parts
  {
    supplierNumber: 'PROME-SUP-2026-G01',
    name: 'TOYOTA UGANDA LIMITED - SERVICE & SPARES',
    contactName: '1 First Street, Industrial Area, P. O. Box 31732, Kampala',
    phone: '0312-301500',
    category: 'G - M/Vehicle Repairs & Spare Parts',
    status: 'Approved',
    approvalDate: new Date('2026-01-04'),
    nextEvaluationDate: new Date('2026-12-31'),
    notes: 'Official Supplier Master List PROME-IMSR-TO-31 (Category G: Vehicle Repairs)'
  },
  {
    supplierNumber: 'PROME-SUP-2026-G02',
    name: 'CITY TIRES',
    contactName: 'Plot 42-44 Bombo Road, Kampala',
    phone: '0414-237339, 0393-261276',
    category: 'G - M/Vehicle Repairs & Spare Parts',
    status: 'Approved',
    approvalDate: new Date('2026-01-04'),
    nextEvaluationDate: new Date('2026-12-31'),
    notes: 'Official Supplier Master List PROME-IMSR-TO-31 (Category G: Tires & Vehicle Repairs)'
  },
  {
    supplierNumber: 'PROME-SUP-2026-G03',
    name: 'PADDY TIRE WORLD',
    contactName: 'Plot 1 Shop No. G.26 UMSC Building, Old Kampala',
    phone: '0774-036446, 0702-128083',
    category: 'G - M/Vehicle Repairs & Spare Parts',
    status: 'Approved',
    approvalDate: new Date('2026-01-04'),
    nextEvaluationDate: new Date('2026-12-31'),
    notes: 'Official Supplier Master List PROME-IMSR-TO-31 (Category G: Tires)'
  },
  {
    supplierNumber: 'PROME-SUP-2026-G04',
    name: 'TYRE EXPRESS (U) LTD',
    contactName: 'Plot 18/20 7th Street Industrial Area, Kampala',
    phone: '0414-256000, 0312-262444',
    category: 'G - M/Vehicle Repairs & Spare Parts',
    status: 'Approved',
    approvalDate: new Date('2026-01-04'),
    nextEvaluationDate: new Date('2026-12-31'),
    notes: 'Official Supplier Master List PROME-IMSR-TO-31 (Category G: Tires & Alignment)'
  },

  // H - Water Supplier
  {
    supplierNumber: 'PROME-SUP-2026-H01',
    name: 'NATIONAL WATER & SEWERAGE CORPORATION (NWSC)',
    contactName: 'P. O. Box 7053, Kampala, Plot 39 Jinja Road',
    phone: '0414-242171 / 242457, Toll Free: 0800-200977',
    category: 'H - Utilities (Water)',
    status: 'Approved',
    approvalDate: new Date('2026-01-04'),
    nextEvaluationDate: new Date('2026-12-31'),
    notes: 'Official Supplier Master List PROME-IMSR-TO-31 (Category H: Water)'
  },

  // I - Courier Services
  {
    supplierNumber: 'PROME-SUP-2026-I01',
    name: 'TNT INTERNATIONAL EXPRESS (FEDEX)',
    contactName: 'Kati House, front ground floor, Kyagwe Road, Plot 2, P. O. Box 34074, Kampala',
    phone: '0414-349049, Fax: 0414-349454',
    category: 'I - Courier Services',
    status: 'Approved',
    approvalDate: new Date('2026-01-04'),
    nextEvaluationDate: new Date('2026-12-31'),
    notes: 'Official Supplier Master List PROME-IMSR-TO-31 (Category I: Courier)'
  },
  {
    supplierNumber: 'PROME-SUP-2026-I02',
    name: 'DHL WORLDWIDE EXPRESS',
    contactName: 'Plot 1 Clement Hill Road, P. O. Box 1623 Kampala',
    phone: '0312-210006, 0414-256470',
    category: 'I - Courier Services',
    status: 'Approved',
    approvalDate: new Date('2026-01-04'),
    nextEvaluationDate: new Date('2026-12-31'),
    notes: 'Official Supplier Master List PROME-IMSR-TO-31 (Category I: Courier)'
  },
  {
    supplierNumber: 'PROME-SUP-2026-I03',
    name: 'EMS COURIERS (POSTA UGANDA)',
    contactName: 'General Post Office Building, Kampala Road',
    phone: '0414-258000 / 0414-258121',
    category: 'I - Courier Services',
    status: 'Approved',
    approvalDate: new Date('2026-01-04'),
    nextEvaluationDate: new Date('2026-12-31'),
    notes: 'Official Supplier Master List PROME-IMSR-TO-31 (Category I: Courier)'
  },

  // J - Security Services
  {
    supplierNumber: 'PROME-SUP-2026-J01',
    name: 'FALCON SECURICO GUARDS LTD',
    contactName: 'Plot 3/5 Bombo Road, P. O. Box 6142 Kampala',
    phone: '0414-251663, Fax: 0414-345831',
    category: 'J - Security Services',
    status: 'Approved',
    approvalDate: new Date('2026-01-04'),
    nextEvaluationDate: new Date('2026-12-31'),
    notes: 'Official Supplier Master List PROME-IMSR-TO-31 (Category J: Security)'
  },

  // K - Laundry Services & Supermarkets
  {
    supplierNumber: 'PROME-SUP-2026-K01',
    name: 'LANDIS (U) LTD',
    contactName: 'Plot 15/17 1st Street Industrial Area, P. O. Box 21508, Kampala',
    phone: '0414-346469, Fax: 0414-230069',
    category: 'K - Laundry Services & Consumables',
    status: 'Approved',
    approvalDate: new Date('2026-01-04'),
    nextEvaluationDate: new Date('2026-12-31'),
    notes: 'Official Supplier Master List PROME-IMSR-TO-31 (Category K: Laundry)'
  },
  {
    supplierNumber: 'PROME-SUP-2026-K02',
    name: 'CAPITAL SHOPPERS SUPERMARKET',
    contactName: 'Port Bell Road, Nakawa, Kampala',
    phone: '0414-220000, 0312-261900',
    category: 'K - Laundry Services & Consumables',
    status: 'Approved',
    approvalDate: new Date('2026-01-04'),
    nextEvaluationDate: new Date('2026-12-31'),
    notes: 'Official Supplier Master List PROME-IMSR-TO-31 (Category K: Office Consumables)'
  },
  {
    supplierNumber: 'PROME-SUP-2026-K03',
    name: 'MILLENNIUM SUPERMARKET',
    contactName: 'Cooper Road, Kisementi, Kololo, Kampala',
    phone: '0414-340000',
    category: 'K - Laundry Services & Consumables',
    status: 'Approved',
    approvalDate: new Date('2026-01-04'),
    nextEvaluationDate: new Date('2026-12-31'),
    notes: 'Official Supplier Master List PROME-IMSR-TO-31 (Category K: Office Consumables)'
  },
  {
    supplierNumber: 'PROME-SUP-2026-K04',
    name: 'NEW RHEMA HONEST STORE',
    contactName: 'Shop No. 9 Market Square, Nakasero, P. O. Box 341, Entebbe',
    phone: '0772-544353',
    category: 'K - Laundry Services & Consumables',
    status: 'Approved',
    approvalDate: new Date('2026-01-04'),
    nextEvaluationDate: new Date('2026-12-31'),
    notes: 'Official Supplier Master List PROME-IMSR-TO-31 (Category K: Cleaning Supplies)'
  },

  // L - Telephone Suppliers
  {
    supplierNumber: 'PROME-SUP-2026-L01',
    name: 'UTEL (UGANDA TELECOMMUNICATIONS CORP)',
    contactName: 'Rwenzori Courts, Lumumba Ave, P. O. Box 7171 Kampala',
    phone: '0800-12345, 0414-333000',
    category: 'L - Telephone & Internet Suppliers',
    status: 'Approved',
    approvalDate: new Date('2026-01-04'),
    nextEvaluationDate: new Date('2026-12-31'),
    notes: 'Official Supplier Master List PROME-IMSR-TO-31 (Category L: Telephones)'
  },
  {
    supplierNumber: 'PROME-SUP-2026-L02',
    name: 'MTN UGANDA LIMITED',
    contactName: 'Plot 69-71 Jinja Road / Clement Hill Road, Kampala',
    phone: '0312-120000, 0772-123100',
    category: 'L - Telephone & Internet Suppliers',
    status: 'Approved',
    approvalDate: new Date('2026-01-04'),
    nextEvaluationDate: new Date('2026-12-31'),
    notes: 'Official Supplier Master List PROME-IMSR-TO-31 (Category L: Telecom)'
  },
  {
    supplierNumber: 'PROME-SUP-2026-L03',
    name: 'AIRTEL UGANDA LIMITED',
    contactName: 'Plot 40 Wampewo Avenue, Kololo, Kampala',
    phone: '0752-600000, 0752-230110',
    category: 'L - Telephone & Internet Suppliers',
    status: 'Approved',
    approvalDate: new Date('2026-01-04'),
    nextEvaluationDate: new Date('2026-12-31'),
    notes: 'Official Supplier Master List PROME-IMSR-TO-31 (Category L: Telecom)'
  },

  // M - Phone Repairs
  {
    supplierNumber: 'PROME-SUP-2026-M01',
    name: 'ILOSON TEL SERVICES LTD',
    contactName: 'P. O. Box 1473 Kampala',
    phone: '0772-484363',
    category: 'M - Phone & Comms Repairs',
    status: 'Approved',
    approvalDate: new Date('2026-01-04'),
    nextEvaluationDate: new Date('2026-12-31'),
    notes: 'Official Supplier Master List PROME-IMSR-TO-31 (Category M: Phone Repairs)'
  },
  {
    supplierNumber: 'PROME-SUP-2026-M02',
    name: 'ULTRACOM SERVICES LTD',
    contactName: 'Bharwani House Plot 17 Nakasero Road, P. O. Box 21940, Kampala',
    phone: '0414-223894',
    category: 'M - Phone & Comms Repairs',
    status: 'Approved',
    approvalDate: new Date('2026-01-04'),
    nextEvaluationDate: new Date('2026-12-31'),
    notes: 'Official Supplier Master List PROME-IMSR-TO-31 (Category M: Comms Repairs)'
  },

  // N - Printing Services
  {
    supplierNumber: 'PROME-SUP-2026-N01',
    name: 'COLLEGE PUBLISHERS (U)',
    contactName: '1st Floor Conrad House, Jinja Road, Kampala',
    phone: '0414-255904, Fax: 0414-257823 & 344302',
    category: 'N - Printing Services',
    status: 'Approved',
    approvalDate: new Date('2026-01-04'),
    nextEvaluationDate: new Date('2026-12-31'),
    notes: 'Official Supplier Master List PROME-IMSR-TO-31 (Category N: Printing)'
  },
  {
    supplierNumber: 'PROME-SUP-2026-N02',
    name: 'CIRO SECRETARIAL SERVICES LTD',
    contactName: 'Plot 95, 6th Street Industrial Area, P. O. Box 8643 Kampala',
    phone: '0414-345598',
    category: 'N - Printing Services',
    status: 'Approved',
    approvalDate: new Date('2026-01-04'),
    nextEvaluationDate: new Date('2026-12-31'),
    notes: 'Official Supplier Master List PROME-IMSR-TO-31 (Category N: Secretarial & Printing)'
  },
  {
    supplierNumber: 'PROME-SUP-2026-N03',
    name: 'STALANE ENTERPRISES LIMITED - PRINTING',
    contactName: 'P. O. Box 3135, Kampala',
    phone: '0700815802, 0705138596, 0785814047',
    category: 'N - Printing Services',
    status: 'Approved',
    approvalDate: new Date('2026-01-04'),
    nextEvaluationDate: new Date('2026-12-31'),
    notes: 'Official Supplier Master List PROME-IMSR-TO-31 (Category N: Printing)'
  },
  {
    supplierNumber: 'PROME-SUP-2026-N04',
    name: 'KWIK COMPUTING LIMITED',
    contactName: 'Plot 15 7th Street Industrial Area, Kampala',
    phone: '0392-178141, 0414-235675, 0756-188141',
    category: 'N - Printing Services',
    status: 'Approved',
    approvalDate: new Date('2026-01-04'),
    nextEvaluationDate: new Date('2026-12-31'),
    notes: 'Official Supplier Master List PROME-IMSR-TO-31 (Category N: Large Format & Digital Printing)'
  },

  // P - Fuel and Service
  {
    supplierNumber: 'PROME-SUP-2026-P01',
    name: 'SHELL UGANDA (VIVO ENERGY UGANDA)',
    contactName: 'P. O. Box 37482, Kampala, 7th Street Industrial Area',
    phone: '0782-384881, 0414-343000',
    category: 'P - Fuel and Service',
    status: 'Approved',
    approvalDate: new Date('2026-01-04'),
    nextEvaluationDate: new Date('2026-12-31'),
    notes: 'Official Supplier Master List PROME-IMSR-TO-31 (Category P: Fleet Fuel & Lubricants)'
  },

  // Q - Office Furniture
  {
    supplierNumber: 'PROME-SUP-2026-Q01',
    name: 'FURNITURE CITY',
    contactName: 'Bukoto, Kampala',
    phone: '0414-530000, 0772-400100',
    category: 'Q - Office Furniture',
    status: 'Approved',
    approvalDate: new Date('2026-01-04'),
    nextEvaluationDate: new Date('2026-12-31'),
    notes: 'Official Supplier Master List PROME-IMSR-TO-31 (Category Q: Ergonomic Furniture)'
  },
  {
    supplierNumber: 'PROME-SUP-2026-Q02',
    name: 'NINA INTERIORS LIMITED',
    contactName: 'Plot 41 Jinja Road, P. O. Box 7258 Kampala',
    phone: '0414-251024, 0414-233379',
    category: 'Q - Office Furniture',
    status: 'Approved',
    approvalDate: new Date('2026-01-04'),
    nextEvaluationDate: new Date('2026-12-31'),
    notes: 'Official Supplier Master List PROME-IMSR-TO-31 (Category Q: Office Interior & Furniture)'
  },
  {
    supplierNumber: 'PROME-SUP-2026-Q03',
    name: 'PROMPT SUPPLY 2011 LIMITED',
    contactName: 'P. O. Box 7352, Opp Total Jinja Road, Kampala',
    phone: '0393-264988',
    category: 'Q - Office Furniture',
    status: 'Approved',
    approvalDate: new Date('2026-01-04'),
    nextEvaluationDate: new Date('2026-12-31'),
    notes: 'Official Supplier Master List PROME-IMSR-TO-31 (Category Q: Office Furniture)'
  }
];

export async function seedSuppliersMasterlist() {
  console.log('[Suppliers Seed] Seeding Master List of Suppliers 2026 (PROME-IMSR-TO-31)...');
  
  let inserted = 0;
  let updated = 0;

  for (const s of PROME_SUPPLIERS_2026) {
    const existing = await prisma.supplier.findFirst({
      where: {
        OR: [
          { supplierNumber: s.supplierNumber },
          { name: s.name }
        ]
      }
    });

    if (existing) {
      await prisma.supplier.update({
        where: { id: existing.id },
        data: {
          supplierNumber: s.supplierNumber,
          name: s.name,
          contactName: s.contactName,
          phone: s.phone,
          category: s.category,
          status: s.status,
          approvalDate: s.approvalDate,
          nextEvaluationDate: s.nextEvaluationDate,
          notes: s.notes
        }
      });
      updated++;
    } else {
      await prisma.supplier.create({
        data: s
      });
      inserted++;
    }
  }

  // Also remove dummy supplier if present
  try {
    await prisma.supplier.deleteMany({
      where: { name: 'New Supplier' }
    });
  } catch (e) {
    // ignore
  }

  console.log(`[Suppliers Seed] Complete: ${inserted} inserted, ${updated} updated.`);
}

if (require.main === module) {
  seedSuppliersMasterlist()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
