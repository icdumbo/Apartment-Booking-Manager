// Fictional test data only; never imported by application sources.
const base={phone:'0700000000',status:'confirmed'};
const receipt=(id,date,amountCents,method='cash')=>({id,date,amountCents,method});
export const collectionsFixture={version:1,migrations:{originalDemoRemoved:true},apartments:[{id:'a',name:'Apartament Test A',address:'Adresă fictivă',city:'Oraș Test'},{id:'b',name:'Apartament Test B',address:'Adresă fictivă',city:'Oraș Test'}],bookings:[
 {...base,id:'cross',apartmentId:'a',guest:'Client Test Cross',checkIn:'2026-10-28',checkOut:'2026-11-03',totalAmountCents:100000,paidAmountCents:50000,legacyPaidAmountCents:0,payments:[receipt('sept','2026-09-30',10000),receipt('oct','2026-10-10',40000)]},
 {...base,id:'outside',apartmentId:'a',guest:'Client Test Outside',checkIn:'2026-01-10',checkOut:'2026-01-12',totalAmountCents:30000,paidAmountCents:30000,payments:[receipt('oct','2026-10-20',30000,'transfer')]},
 {...base,id:'eur',apartmentId:'b',guest:'Client Test EUR',checkIn:'2026-10-10',checkOut:'2026-10-12',currency:'EUR',totalAmountCents:50000,paidAmountCents:10000,payments:[receipt('eur','2026-10-15',10000,'card')]},
 {...base,id:'legacy',apartmentId:'b',guest:'Client Test Legacy',checkIn:'2026-10-15',checkOut:'2026-10-20',totalAmountCents:60000,paidAmountCents:20000},
 {...base,id:'unknown',apartmentId:'a',guest:'Client Test Unknown',checkIn:'2026-10-01',checkOut:'2026-10-02'},
 {...base,id:'mixed',apartmentId:'b',guest:'Client Test Mixed',checkIn:'2026-09-01',checkOut:'2026-09-05',totalAmountCents:40000,paidAmountCents:20000,legacyPaidAmountCents:10000,payments:[receipt('mixed','2026-10-05',10000)]},
 {...base,id:'ends',apartmentId:'a',guest:'Client Test Ends',checkIn:'2026-09-30',checkOut:'2026-10-01',totalAmountCents:10000},
 {...base,id:'starts',apartmentId:'b',guest:'Client Test Starts',checkIn:'2026-11-01',checkOut:'2026-11-02',totalAmountCents:10000}
]};
