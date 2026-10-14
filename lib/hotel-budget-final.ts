export type AccountValue = { actual: string; budget: string; lastYear: string; ytdActual: string; ytdBudget: string; lastYearYtd: string };
export type AccountGroup =
  | "roomRevenue" | "fbRevenue" | "otherRevenue" | "costOfSales" | "payroll"
  | "operatingExpenses" | "overhead" | "otherIncome" | "otherExpenses"
  | "operatorFees" | "provisions" | "depreciation" | "amortization" | "interest" | "tax" | "ownerCashItems";
export type AccountLine = { code: string; label: string; group: AccountGroup; section: string; allowNegative?: boolean };
export const ACCOUNT_LINES: AccountLine[] = [
  {code:"41101",label:"Room Revenue",group:"roomRevenue",section:"Revenue"},
  {code:"41201",label:"Restaurant & Bar",group:"fbRevenue",section:"Revenue"},
  {code:"41202",label:"Bar & Lounge",group:"fbRevenue",section:"Revenue"},
  {code:"41203",label:"Banquet & Meeting Package — Food",group:"fbRevenue",section:"Revenue"},
  {code:"41204",label:"Banquet & Meeting Package — Beverage",group:"fbRevenue",section:"Revenue"},
  {code:"41205",label:"Banquet & Meeting Package — Other",group:"fbRevenue",section:"Revenue"},
  {code:"41206",label:"F&B Discounts / Allowances",group:"fbRevenue",section:"Revenue",allowNegative:true},
  {code:"41301",label:"Business Center",group:"otherRevenue",section:"Revenue"},
  {code:"41302",label:"Transportation",group:"otherRevenue",section:"Revenue"},
  {code:"41303",label:"Laundry",group:"otherRevenue",section:"Revenue"},
  {code:"41304",label:"Spa",group:"otherRevenue",section:"Revenue"},
  {code:"41305",label:"Telephone",group:"otherRevenue",section:"Revenue"},
  {code:"41306",label:"Sport & Recreation",group:"otherRevenue",section:"Revenue"},
  {code:"41307",label:"Rented Space",group:"otherRevenue",section:"Revenue"},
  {code:"41308",label:"Miscellaneous Other Revenue",group:"otherRevenue",section:"Revenue"},
  {code:"41309",label:"Other Revenue Discounts / Allowances",group:"otherRevenue",section:"Revenue",allowNegative:true},
  {code:"51101",label:"F&B Cost of Sales",group:"costOfSales",section:"Cost of Sales"},
  {code:"51201",label:"Other Department Cost of Sales",group:"costOfSales",section:"Cost of Sales"},
  ...["Front Office","Housekeeping","Food & Beverage","Engineering","Sales & Marketing","Administrative & General"].flatMap((department,di)=>
    ["Salary & Wages","Overtime","THR","Bonus / Incentive","Income Tax Allowance","Meal Allowance","Jamsostek / BPJS","Medical & Insurance","Pension","Temporary Staff","Employee Benefits","Other Payroll"].map((item,i)=>({
      code:"6"+String(di+1).padStart(2,"0")+String(i+1).padStart(2,"0"),
      label:department+" — "+item,group:"payroll" as const,section:"Payroll & Related Expenses"
    }))
  ),
  ...[
    ["Room Department","Cleaning Supplies"],["Room Department","Guest Supplies"],["Room Department","Laundry & Linen"],["Room Department","Commissions"],["Room Department","Other Room Expenses"],
    ["F&B Department","Kitchen Supplies"],["F&B Department","Crockery & Cutlery"],["F&B Department","Cleaning Supplies"],["F&B Department","Music & Entertainment"],["F&B Department","Other F&B Expenses"],
    ["Other Departments","Operating Supplies"],["Other Departments","Commissions"],["Other Departments","Other Department Expenses"],
    ["Engineering","Repairs & Maintenance"],["Engineering","Tools & Supplies"],["Engineering","Contract Services"],
    ["Energy Cost","Electricity"],["Energy Cost","Water"],["Energy Cost","Gas & Fuel"],["Energy Cost","Other Utilities"],
    ["Sales & Marketing","Advertising & Promotion"],["Sales & Marketing","Travel & Entertainment"],["Sales & Marketing","Online Travel Agency Fees"],["Sales & Marketing","Other S&M Expenses"],
    ["Administrative & General","Office Supplies"],["Administrative & General","IT & Software"],["Administrative & General","Licenses & Permits"],["Administrative & General","Professional Fees"],["Administrative & General","Security"],["Administrative & General","Bank & Credit Card Charges"],["Administrative & General","Bad Debt / Provision"],["Administrative & General","Other A&G Expenses"]
  ].map(([dept,item],i)=>({code:"7"+String(i+1).padStart(3,"0"),label:dept+" — "+item,group:dept==="Engineering"||dept==="Energy Cost"||dept==="Sales & Marketing"||dept==="Administrative & General"?"overhead" as const:"operatingExpenses" as const,section:dept==="Room Department"||dept==="F&B Department"||dept==="Other Departments"?"Departmental Operating Expenses":"Undistributed / Overhead Expenses"})),
  {code:"80101",label:"Other Operating Income",group:"otherIncome",section:"Other Income & Expenses"},
  {code:"80201",label:"Other Expenses",group:"otherExpenses",section:"Other Income & Expenses"},
  {code:"80301",label:"Owner Expenses",group:"otherExpenses",section:"Other Income & Expenses"},
  {code:"80302",label:"Property Insurance / Tax / Rent",group:"otherExpenses",section:"Other Income & Expenses"},
  {code:"80303",label:"Renovation / Consultant Fee",group:"otherExpenses",section:"Other Income & Expenses"},
  {code:"80401",label:"Management Fee",group:"operatorFees",section:"Operator Fees"},
  {code:"80402",label:"Marketing Fee",group:"operatorFees",section:"Operator Fees"},
  {code:"80403",label:"Royalty / Franchise Fee",group:"operatorFees",section:"Operator Fees"},
  {code:"80501",label:"THR / Bonus Provision",group:"provisions",section:"Provisions"},
  {code:"80502",label:"FF&E Replacement Provision",group:"provisions",section:"Provisions"},
  {code:"80503",label:"Capital Expenditure (cash movement; outside GOP)",group:"ownerCashItems",section:"Owner Cash Flow (di luar P&L)"},
  {code:"80504",label:"FF&E Replacement Cash Payment",group:"ownerCashItems",section:"Owner Cash Flow (di luar P&L)"},
  {code:"80505",label:"Other Owner Cash Payment",group:"ownerCashItems",section:"Owner Cash Flow (di luar P&L)"},
  {code:"80601",label:"Depreciation",group:"depreciation",section:"Other Income & Expenses"},
  {code:"80602",label:"Amortization",group:"amortization",section:"Other Income & Expenses"},
  {code:"80701",label:"Interest / Finance Cost",group:"interest",section:"Other Income & Expenses"},
  {code:"80801",label:"Income Tax",group:"tax",section:"Other Income & Expenses"}
];
export const GROUP_LABELS: Record<AccountGroup,string> = {
  roomRevenue:"Room Revenue",fbRevenue:"F&B Revenue",otherRevenue:"Other Operating Revenue",
  costOfSales:"Cost of Sales",payroll:"Payroll & Related Expenses",
  operatingExpenses:"Other Departmental Operating Expenses",overhead:"Undistributed / Overhead Expenses",
  otherIncome:"Other Income",otherExpenses:"Other Expenses",operatorFees:"Operator Fees",
  provisions:"Provisions",depreciation:"Depreciation",amortization:"Amortization",interest:"Interest / Finance Cost",tax:"Income Tax",ownerCashItems:"Owner Cash Items (outside P&L)"
};
export const GROUP_ORDER: AccountGroup[] = ["roomRevenue","fbRevenue","otherRevenue","costOfSales","payroll","operatingExpenses","overhead","otherIncome","otherExpenses","operatorFees","provisions","depreciation","amortization","interest","tax","ownerCashItems"];
export const ACCOUNT_SECTIONS = [...new Set(ACCOUNT_LINES.map(x=>x.section))];
export const emptyAccounts = (): Record<string,AccountValue> => Object.fromEntries(ACCOUNT_LINES.map(x=>[x.code,{actual:"",budget:"",lastYear:"",ytdActual:"",ytdBudget:"",lastYearYtd:""}]));
export const numeric = (value: unknown): number | null => {
  if (value === "" || value === null || value === undefined) return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
};
export const sumGroup = (accounts: Record<string,AccountValue>, group: AccountGroup, column: keyof AccountValue, customLines: AccountLine[] = []): number | null => {
  const lines=(customLines.length?customLines:ACCOUNT_LINES).filter(x=>x.group===group);
  const present=lines.map(x=>numeric(accounts?.[x.code]?.[column])).filter((x):x is number=>x!==null);
  return present.length ? present.reduce((a,b)=>a+b,0) : null;
};
export const calculateBudget = (form: any) => {
  const days=numeric(form?.statistics?.days), rooms=numeric(form?.statistics?.rooms);
  const totalRoomBuild=days!==null&&rooms!==null?days*rooms:null;
  const outInventory=numeric(form?.statistics?.outInventory), houseUse=numeric(form?.statistics?.houseUse), outOfOrder=numeric(form?.statistics?.outOfOrder);
  const deductionsComplete=outInventory!==null&&houseUse!==null&&outOfOrder!==null;
  const roomAvailable=totalRoomBuild===null||!deductionsComplete?null:totalRoomBuild-outInventory-houseUse-outOfOrder;
  const complimentary=numeric(form?.statistics?.complimentary), paid=numeric(form?.statistics?.roomPaid);
  const occupied=complimentary!==null&&paid!==null?complimentary+paid:null;
  const customLines: AccountLine[] = Array.isArray(form?.accountLines) ? form.accountLines : [...ACCOUNT_LINES,...(Array.isArray(form?.customAccounts)?form.customAccounts:[])];
  const roomRevenue=sumGroup(form?.accounts||{},"roomRevenue","actual",customLines);
  const revenueGroups=["roomRevenue","fbRevenue","otherRevenue"] as const;
  const revenueValues=revenueGroups.map(g=>sumGroup(form?.accounts||{},g,"actual",customLines));
  const revenue=revenueValues.some(v=>v!==null)?revenueValues.reduce<number>((s,v)=>s+(v??0),0):null;
  const costGroups=["costOfSales","payroll","operatingExpenses","overhead"] as const;
  const costValues=costGroups.map(g=>sumGroup(form?.accounts||{},g,"actual",customLines));
  const costs=costValues.some(v=>v!==null)?costValues.reduce<number>((s,v)=>s+(v??0),0):null;
  const ytdRevenueValues=revenueGroups.map(g=>sumGroup(form?.accounts||{},g,"ytdActual",customLines));
  const ytdRevenue=ytdRevenueValues.some(v=>v!==null)?ytdRevenueValues.reduce<number>((s,v)=>s+(v??0),0):null;
  const ytdCostValues=costGroups.map(g=>sumGroup(form?.accounts||{},g,"ytdActual",customLines));
  const ytdCosts=ytdCostValues.some(v=>v!==null)?ytdCostValues.reduce<number>((s,v)=>s+(v??0),0):null;
  const otherIncomeValue=sumGroup(form?.accounts||{},"otherIncome","actual",customLines);
  const otherIncome=otherIncomeValue??0;
  const belowGopGroups=["otherExpenses","operatorFees","provisions","depreciation","amortization","interest"] as const;
  const belowGopValues=belowGopGroups.map(g=>sumGroup(form?.accounts||{},g,"actual",customLines));
  const belowGopExpenses=belowGopValues.some(v=>v!==null)?belowGopValues.reduce<number>((s,v)=>s+(v??0),0):null;
  const tax=sumGroup(form?.accounts||{},"tax","actual",customLines);
  const ownerCashItems=sumGroup(form?.accounts||{},"ownerCashItems","actual",customLines);
  const otherExpenseGroups=[...belowGopGroups,"tax"] as const;
  const otherExpenseValues=otherExpenseGroups.map(g=>sumGroup(form?.accounts||{},g,"actual",customLines));
  const otherExpenses=otherExpenseValues.some(v=>v!==null)?otherExpenseValues.reduce<number>((s,v)=>s+(v??0),0):null;
  const gop=revenue!==null&&costs!==null?revenue-costs:null;
  const ownerShareProfitBeforeTax=gop!==null&&otherIncomeValue!==null&&belowGopExpenses!==null?gop+otherIncome-belowGopExpenses:null;
  const netProfit=ownerShareProfitBeforeTax!==null&&tax!==null?ownerShareProfitBeforeTax-tax:null;
  // Net profit is not operating cash flow; cash after CapEx requires a reconciled cash-flow statement.
  const ownerCashAfterCapex:null=null;
  const ytdOtherIncomeValue=sumGroup(form?.accounts||{},"otherIncome","ytdActual",customLines);
  const ytdOtherIncome=ytdOtherIncomeValue??0;
  const ytdBelowGopValues=belowGopGroups.map(g=>sumGroup(form?.accounts||{},g,"ytdActual",customLines));
  const ytdBelowGopExpenses=ytdBelowGopValues.some(v=>v!==null)?ytdBelowGopValues.reduce<number>((s,v)=>s+(v??0),0):null;
  const ytdTax=sumGroup(form?.accounts||{},"tax","ytdActual",customLines);
  const ytdOwnerCashItems=sumGroup(form?.accounts||{},"ownerCashItems","ytdActual",customLines);
  const ytdGop=ytdRevenue!==null&&ytdCosts!==null?ytdRevenue-ytdCosts:null;
  const ytdGopMargin=ytdRevenue!==null&&ytdRevenue>0&&ytdGop!==null?ytdGop/ytdRevenue*100:null;
  const ytdOwnerShareProfitBeforeTax=ytdGop!==null&&ytdOtherIncomeValue!==null&&ytdBelowGopExpenses!==null?ytdGop+ytdOtherIncome-ytdBelowGopExpenses:null;
  const ytdNetProfit=ytdOwnerShareProfitBeforeTax!==null&&ytdTax!==null?ytdOwnerShareProfitBeforeTax-ytdTax:null;
  const ytdOwnerCashAfterCapex:null=null;
  return {
    totalRoomBuild,roomAvailable,occupied,occupancy:roomAvailable!==null&&roomAvailable>0&&occupied!==null?occupied/roomAvailable*100:null,
    adr:paid!==null&&paid>0&&roomRevenue!==null?roomRevenue/paid:null,
    revpar:roomAvailable!==null&&roomAvailable>0&&roomRevenue!==null?roomRevenue/roomAvailable:null,
    roomRevenue,revenue,costs,gop,gopMargin:revenue!==null&&revenue>0&&gop!==null?gop/revenue*100:null,
    otherIncome,otherExpenses,ownerShareProfitBeforeTax,ownerCashItems,ownerCashAfterCapex,netProfit,
    ytdRevenue,ytdCosts,ytdGop,ytdGopMargin,ytdOtherIncome,ytdOwnerShareProfitBeforeTax,ytdNetProfit,ytdOwnerCashItems,ytdOwnerCashAfterCapex,
    revenueGroups:Object.fromEntries(revenueGroups.map(g=>[g,sumGroup(form?.accounts||{},g,"actual",customLines)])),
    costGroups:Object.fromEntries(costGroups.map(g=>[g,sumGroup(form?.accounts||{},g,"actual",customLines)])),
    budgetRevenue: revenueGroups.map(g=>sumGroup(form?.accounts||{},g,"budget",customLines)).some(v=>v!==null)?revenueGroups.reduce((s,g)=>s+(sumGroup(form?.accounts||{},g,"budget",customLines)??0),0):null,
    lastYearRevenue: revenueGroups.map(g=>sumGroup(form?.accounts||{},g,"lastYear",customLines)).some(v=>v!==null)?revenueGroups.reduce((s,g)=>s+(sumGroup(form?.accounts||{},g,"lastYear",customLines)??0),0):null,
    ytdBudgetRevenue: revenueGroups.map(g=>sumGroup(form?.accounts||{},g,"ytdBudget",customLines)).some(v=>v!==null)?revenueGroups.reduce((s,g)=>s+(sumGroup(form?.accounts||{},g,"ytdBudget",customLines)??0),0):null,
    lastYearYtdRevenue: revenueGroups.map(g=>sumGroup(form?.accounts||{},g,"lastYearYtd",customLines)).some(v=>v!==null)?revenueGroups.reduce((s,g)=>s+(sumGroup(form?.accounts||{},g,"lastYearYtd",customLines)??0),0):null
  };
};
