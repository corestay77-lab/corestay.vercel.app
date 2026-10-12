export type FinancialFigure = { label: string; value: string; period?: string };

export type FinancialRatio = {
  name: string;
  formula: string;
  value: string;
};

export type FinancialRatioGroup = {
  title: string;
  rows: FinancialRatio[];
};

const UNAVAILABLE = "Tidak tersedia — data sumber belum cukup";

function parseAmount(raw?: string): number | null {
  if (!raw) return null;
  const text = raw.trim();
  if (!text || /tidak tersedia|not available|n\/a|^—$|^-$|belum tersedia/i.test(text)) return null;
  const negative = /^\s*\(.*\)\s*$/.test(text) || /^\s*-/.test(text);
  let value = text.replace(/[()\s]/g, "").replace(/Rp|IDR|USD|\$|%/gi, "").replace(/[^\d.,-]/g, "");
  if (!value || !/\d/.test(value)) return null;
  const lastComma = value.lastIndexOf(",");
  const lastDot = value.lastIndexOf(".");
  if (lastComma >= 0 && lastDot >= 0) {
    if (lastComma > lastDot) value = value.replace(/\./g, "").replace(",", ".");
    else value = value.replace(/,/g, "");
  } else if (lastComma >= 0) {
    const decimals = value.length - lastComma - 1;
    value = decimals > 0 && decimals <= 2 ? value.replace(",", ".") : value.replace(/,/g, "");
  } else if (lastDot >= 0) {
    const decimals = value.length - lastDot - 1;
    if (decimals === 3) value = value.replace(/\./g, "");
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? (negative ? -Math.abs(parsed) : parsed) : null;
}

function findFigure(figures: FinancialFigure[], aliases: string[]): number | null {
  const normalizedAliases = aliases.map((s) => s.toLowerCase().replace(/[^a-z0-9]/g, ""));
  const found = figures.find((item) => {
    const label = item.label.toLowerCase().replace(/[^a-z0-9]/g, "");
    return normalizedAliases.includes(label);
  });
  return found ? parseAmount(found.value) : null;
}

function ratio(numerator: number | null, denominator: number | null, percent = true): string {
  if (numerator === null || denominator === null || denominator === 0) return UNAVAILABLE;
  const value = (numerator / denominator) * (percent ? 100 : 1);
  return Number.isFinite(value) ? `${value.toLocaleString("id-ID", { maximumFractionDigits: 2 })}${percent ? "%" : "x"}` : UNAVAILABLE;
}

function sum(figures: FinancialFigure[], aliasGroups: string[][]): number | null {
  const values = aliasGroups.map((aliases) => findFigure(figures, aliases));
  return values.some((value) => value === null) ? null : values.reduce<number>((total, value) => total + (value ?? 0), 0);
}

export function computeFinancialRatios(figures: FinancialFigure[]): FinancialRatioGroup[] {
  const f = (aliases: string[]) => findFigure(figures, aliases);
  const revenue = f(["Total Pendapatan", "Total Revenue", "Revenue", "Total Operating Revenue", "Total Income"]);
  const businessRevenue = f(["Pendapatan Usaha", "Business Revenue", "Operating Revenue"]);
  const costOfSales = f(["Beban Atas Pendapatan", "Cost of Sales", "Cost Of Revenue", "Direct Costs", "Departmental Expenses"]);
  const netProfit = f(["Laba Bersih", "Net Profit", "Net Income", "Net Profit/Loss", "Profit After Tax"]);
  const operatingProfit = f(["Laba Operasi", "Operating Profit", "Operating Income", "GOP", "Gross Operating Profit"]);
  const interest = f(["Bunga", "Interest Expense", "Interest"]);
  const tax = f(["Pajak", "Tax Expense", "Income Tax"]);
  const depreciation = f(["Penyusutan", "Depreciation"]);
  const amortization = f(["Amortisasi", "Amortization"]);
  const gopCurrent = f(["GOP Ini", "Current GOP", "GOP Current Period", "GOP This Period"]);
  const gopPrevious = f(["GOP Lalu", "Previous GOP", "GOP Previous Period", "GOP Last Period"]);
  const revenueCurrent = f(["Pendapatan Ini", "Current Revenue", "Revenue Current Period", "Revenue This Period"]);
  const revenuePrevious = f(["Pendapatan Lalu", "Previous Revenue", "Revenue Previous Period", "Revenue Last Period"]);
  const payroll = sum(figures, [
    ["Gaji", "Salaries", "Wages", "Payroll Salaries"],
    ["Jamsostek", "BPJS Ketenagakerjaan", "Social Security"],
    ["Casual", "Casual Labor", "Daily Workers"],
    ["Bonus/THR", "Bonus", "THR", "Bonus and THR"],
    ["Meals", "Staff Meals", "Employee Meals"],
  ]);
  const utilities = f(["Listrik & Air", "Utilities", "Electricity and Water", "Electricity & Water"]);
  const ag = f(["Beban Adm & Umum", "A&G", "Administrative and General", "Administration & General", "Admin and General"]);
  const salesMarketing = f(["Pemasaran & Iklan", "Sales & Marketing", "Sales and Marketing", "Marketing and Advertising"]);
  const pom = f(["Pemeliharaan", "POM", "Repairs and Maintenance", "Repair & Maintenance", "Property Operations and Maintenance"]);
  const otaCommission = f(["Komisi OTA", "OTA Commission", "OTA Commissions", "Online Travel Agent Commission"]);
  const totalOpex = f(["Total Beban Operasional", "Total Operating Expenses", "Total Opex", "Operating Expenses"]);
  const fixedCosts = f(["Beban Tetap", "Fixed Costs", "Fixed Expenses", "Total Fixed Costs"]);
  const variableCosts = f(["Beban Variabel", "Variable Costs", "Variable Expenses", "Total Variable Costs"]);
  const contributionMargin = f(["Margin Kontribusi", "Contribution Margin"]);
  const currentAssets = f(["Aset Lancar", "Current Assets"]);
  const currentLiabilities = f(["Kewajiban Lancar", "Current Liabilities"]);
  const cash = f(["Kas", "Cash", "Cash and Cash Equivalents"]);
  const receivables = f(["Piutang", "Accounts Receivable", "Trade Receivables"]);
  const liabilities = f(["Total Kewajiban", "Total Liabilities", "Total Debt and Liabilities"]);
  const equity = f(["Total Ekuitas", "Total Equity", "Shareholders Equity"]);
  const ebitda = f(["EBITDA"]);
  const principal = f(["Pokok Pinjaman", "Loan Principal", "Debt Principal", "Principal Repayment"]);
  const loanInterest = f(["Bunga Pinjaman", "Loan Interest", "Interest Payment", "Debt Interest"]);
  const assets = f(["Total Aset", "Total Assets"]);
  const annualNetProfit = f(["Laba Bersih Tahunan", "Annual Net Profit", "Annual Net Income"]);
  const investment = f(["Total Investasi", "Total Investment", "Property Investment"]);

  const profitability: FinancialRatio[] = [
    { name: "Departmental Margin", formula: "(Pendapatan Usaha − Beban Atas Pendapatan) ÷ Pendapatan Usaha × 100", value: ratio(businessRevenue !== null && costOfSales !== null ? businessRevenue - costOfSales : null, businessRevenue) },
    { name: "Gross Profit Margin", formula: "(Total Pendapatan − Beban Atas Pendapatan) ÷ Total Pendapatan × 100", value: ratio(revenue !== null && costOfSales !== null ? revenue - costOfSales : null, revenue) },
    { name: "GOP Margin", formula: "Laba Operasi ÷ Total Pendapatan × 100", value: ratio(operatingProfit, revenue) },
    { name: "EBITDA Margin", formula: "(Laba Bersih + Bunga + Pajak + Penyusutan + Amortisasi) ÷ Total Pendapatan × 100", value: ratio(sum(figures, [["Laba Bersih", "Net Profit", "Net Income", "Net Profit/Loss", "Profit After Tax"], ["Bunga", "Interest Expense", "Interest"], ["Pajak", "Tax Expense", "Income Tax"], ["Penyusutan", "Depreciation"], ["Amortisasi", "Amortization"]]), revenue) },
    { name: "EBIT Margin", formula: "(Laba Bersih + Bunga + Pajak) ÷ Total Pendapatan × 100", value: ratio(sum(figures, [["Laba Bersih", "Net Profit", "Net Income", "Net Profit/Loss", "Profit After Tax"], ["Bunga", "Interest Expense", "Interest"], ["Pajak", "Tax Expense", "Income Tax"]]), revenue) },
    { name: "Net Profit Margin", formula: "Laba Bersih ÷ Total Pendapatan × 100", value: ratio(netProfit, revenue) },
    { name: "Flow-through", formula: "(GOP Ini − GOP Lalu) ÷ (Pendapatan Ini − Pendapatan Lalu) × 100", value: ratio(gopCurrent !== null && gopPrevious !== null ? gopCurrent - gopPrevious : null, revenueCurrent !== null && revenuePrevious !== null ? revenueCurrent - revenuePrevious : null) },
  ];
  const expenses: FinancialRatio[] = [
    { name: "Cost of Sales", formula: "Beban Atas Pendapatan ÷ Total Pendapatan × 100", value: ratio(costOfSales, revenue) },
    { name: "Payroll", formula: "(Gaji + Jamsostek + Casual + Bonus/THR + Meals) ÷ Total Pendapatan × 100", value: ratio(payroll, revenue) },
    { name: "Utilities", formula: "Listrik & Air ÷ Total Pendapatan × 100", value: ratio(utilities, revenue) },
    { name: "A&G", formula: "Beban Adm & Umum ÷ Total Pendapatan × 100", value: ratio(ag, revenue) },
    { name: "Sales & Marketing", formula: "Pemasaran & Iklan ÷ Total Pendapatan × 100", value: ratio(salesMarketing, revenue) },
    { name: "POM", formula: "Pemeliharaan ÷ Total Pendapatan × 100", value: ratio(pom, revenue) },
    { name: "Distribution", formula: "Komisi OTA ÷ Total Pendapatan × 100", value: ratio(otaCommission, revenue) },
    { name: "Total Opex", formula: "Total Beban Operasional ÷ Total Pendapatan × 100", value: ratio(totalOpex, revenue) },
  ];
  const segments = figures.filter((item) => /revenue mix|pendapatan segmen|segment revenue|room revenue|f\&b revenue|food and beverage revenue|other operating revenue/i.test(item.label) && !/total/i.test(item.label));
  const revenueMixRows: FinancialRatio[] = segments.length
    ? segments.map((item) => ({ name: `Revenue Mix — ${item.label}`, formula: "Pendapatan Segmen ÷ Total Pendapatan × 100", value: ratio(parseAmount(item.value), revenue) }))
    : [{ name: "Revenue Mix", formula: "Pendapatan Segmen ÷ Total Pendapatan × 100", value: UNAVAILABLE }];
  const otaRoomRevenue = f(["Pendapatan Room OTA", "OTA Room Revenue", "OTA Room Sales", "Room Revenue OTA"]);
  const directRoomRevenue = f(["Pendapatan Room Langsung", "Direct Room Revenue", "Direct Room Sales", "Room Revenue Direct"]);
  const roomRevenue = f(["Pendapatan Room", "Room Revenue", "Rooms Revenue", "Room Department Revenue"]);
  const revenueStructure: FinancialRatio[] = [
    ...revenueMixRows,
    { name: "OTA Dependency", formula: "Pendapatan Room OTA ÷ Total Pendapatan × 100", value: ratio(otaRoomRevenue, revenue) },
    { name: "OTA Commission", formula: "Komisi OTA ÷ Pendapatan Room OTA × 100", value: ratio(otaCommission, otaRoomRevenue) },
    { name: "Direct Share", formula: "Pendapatan Room Langsung ÷ Pendapatan Room × 100", value: ratio(directRoomRevenue, roomRevenue) },
  ];
  const breakEven: FinancialRatio[] = [
    { name: "Break-even Revenue", formula: "Beban Tetap ÷ (1 − Beban Variabel ÷ Total Pendapatan)", value: fixedCosts !== null && variableCosts !== null && revenue !== null && revenue !== 0 && (1 - variableCosts / revenue) !== 0 ? (fixedCosts / (1 - variableCosts / revenue)).toLocaleString("id-ID", { maximumFractionDigits: 2 }) : UNAVAILABLE },
    { name: "Margin of Safety", formula: "(Pendapatan Aktual − Break-even) ÷ Pendapatan Aktual × 100", value: fixedCosts !== null && variableCosts !== null && revenue !== null && revenue !== 0 && (1 - variableCosts / revenue) !== 0 ? ratio(revenue - fixedCosts / (1 - variableCosts / revenue), revenue) : UNAVAILABLE },
    { name: "Operating Leverage", formula: "Margin Kontribusi ÷ Laba Operasi", value: ratio(contributionMargin, operatingProfit, false) },
  ];
  const balanceCash: FinancialRatio[] = [
    { name: "Current Ratio", formula: "Aset Lancar ÷ Kewajiban Lancar", value: ratio(currentAssets, currentLiabilities, false) },
    { name: "Quick Ratio", formula: "(Kas + Piutang) ÷ Kewajiban Lancar", value: ratio(cash !== null && receivables !== null ? cash + receivables : null, currentLiabilities, false) },
    { name: "Debt to Equity", formula: "Total Kewajiban ÷ Total Ekuitas", value: ratio(liabilities, equity, false) },
    { name: "DSCR", formula: "EBITDA ÷ (Pokok + Bunga Pinjaman)", value: ratio(ebitda, principal !== null && loanInterest !== null ? principal + loanInterest : null, false) },
    { name: "ROA", formula: "Laba Bersih ÷ Total Aset × 100", value: ratio(netProfit, assets) },
    { name: "ROE", formula: "Laba Bersih ÷ Total Ekuitas × 100", value: ratio(netProfit, equity) },
    { name: "ROI Properti", formula: "Laba Bersih Tahunan ÷ Total Investasi × 100", value: ratio(annualNetProfit, investment) },
    { name: "Payback Period", formula: "Total Investasi ÷ Laba Bersih Tahunan", value: annualNetProfit !== null && annualNetProfit !== 0 && investment !== null ? `${(investment / annualNetProfit).toLocaleString("id-ID", { maximumFractionDigits: 2 })} tahun` : UNAVAILABLE },
  ];
  return [
    { title: "A. PROFITABILITAS", rows: profitability },
    { title: "B. RASIO BEBAN", rows: expenses },
    { title: "C. STRUKTUR PENDAPATAN", rows: revenueStructure },
    { title: "D. BREAK-EVEN & LEVERAGE", rows: breakEven },
    { title: "E. NERACA & ARUS KAS", rows: balanceCash },
  ];
}
