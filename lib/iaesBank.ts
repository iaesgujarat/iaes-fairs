// Single source of truth for IAES bank details shown on the proforma
// invoice (after registration) and the tax invoice (after payment).
// Update here and every invoice renderer (PDF + on-screen) stays in sync.

export const IAES_BANK = {
  // Center's Bank Details for Local Currency (INR) Payment
  inr: {
    bankName: "Kotak Mahindra Bank Limited",
    accountNumber: "4012075995",
    branchAndIfsCode: "C G Road & KKBK0002583",
    accountName: "INDO AMERICAN EDUCATION SOCIETY",
    bankAddress:
      "Ground Floor, Rembrandt Building, C.G. Road, Ellisbridge, A'bad- 380006",
    swiftCode: "KKBKINBBXXX",
    ifscCode: "KKBK0002583",
  },
  // Correspondent bank detail for USD currency
  usdCorrespondent: {
    correspondentBank: "Citi Bank NA",
    correspondentBankAddress: "111, Wall Street, New York, NY 10043",
    intermediaryBankAccountNo: "36317907",
    swift: "CITIUS33",
    fedwireRoutingNo: "0210 0008-9",
  },
} as const;

// Ordered [label, value] pairs — faithful to the official invoice layout.
export const IAES_BANK_INR_ROWS: ReadonlyArray<readonly [string, string]> = [
  ["Bank Name", IAES_BANK.inr.bankName],
  ["A/c No.", IAES_BANK.inr.accountNumber],
  ["Branch & IFS Code", IAES_BANK.inr.branchAndIfsCode],
  ["Account Name", IAES_BANK.inr.accountName],
  ["Bank Address", IAES_BANK.inr.bankAddress],
  ["Bank Swift Code", IAES_BANK.inr.swiftCode],
  ["IFSC Code", IAES_BANK.inr.ifscCode],
];

export const IAES_BANK_USD_ROWS: ReadonlyArray<readonly [string, string]> = [
  ["Correspondent Bank", IAES_BANK.usdCorrespondent.correspondentBank],
  [
    "Correspondent Bank Address",
    IAES_BANK.usdCorrespondent.correspondentBankAddress,
  ],
  ["Intermediary Bank Acc. No.", IAES_BANK.usdCorrespondent.intermediaryBankAccountNo],
  ["Swift", IAES_BANK.usdCorrespondent.swift],
  ["Fedwire Routing no", IAES_BANK.usdCorrespondent.fedwireRoutingNo],
];
