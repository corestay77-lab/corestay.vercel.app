"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/lib/supabase";
import { ACCOUNT_LINES, ACCOUNT_SECTIONS, GROUP_LABELS, GROUP_ORDER, calculateBudget, emptyAccounts, numeric, sumGroup, type AccountValue, type AccountLine, type AccountGroup } from "@/lib/hotel-budget-final";

type Statistics = { days: string; rooms: string; outInventory: string; houseUse: string; outOfOrder: string; complimentary: string; roomPaid: string; occupancy: string; exchangeRate: string; averageSellingRate: string };
type ForecastMonth = { agDetails?:Record<string,string>; modDetails?:Record<string,string>; fbDetails?:Record<string,string>; roomDivisionDetails?:Record<string,string>; pomecDetails?:Record<string,string>; label:string; occupancy:string; adr:string; fbRevenue:string; phoneRevenue:string; otherRevenue:string; fbCostOfSales:string; phoneCostOfSales:string; modCostOfSales:string; roomPayroll:string; fbPayroll:string; phonePayroll:string; modPayroll:string; roomOtherExpenses:string; fbOtherExpenses:string; phoneOtherExpenses:string; modOtherExpenses:string; agPayroll:string; smPayroll:string; hrdPayroll:string; pomecPayroll:string; agOtherExpenses:string; smOtherExpenses:string; hrdOtherExpenses:string; pomecOtherExpenses:string; energyCost:string; operatingCosts:string; basicManagementFee:string; otherManagementFee:string; insuranceGeneral:string; landLease:string; ownerInsurance:string; maintenanceFee:string; operatorSharePercent:string; ownerOtherExpenses:string };
type ForecastYear = { label: string; days: string; rooms: string; occupancy: string; adr: string; fbRevenue: string; otherRevenue: string; operatingCosts: string };
type BudgetForm = {
  hotelName: string; period: string; yearStart: string; statistics: Statistics;
  accounts: Record<string, AccountValue>;
  budgetAllocations?: { parentPercentBySection: Record<string,string>; childPercentByCode: Record<string,string> };
  accountLines: AccountLine[];
  customAccounts: AccountLine[];
  forecast: { monthly: ForecastMonth[]; annual: ForecastYear[] };
  confirmAccountReview: boolean; notes: string; actionRecommendation: string; actionOwner: string; actionDue: string; actionTarget: string; actionStatus: string; actionProgress: string;
};
type SavedReport = { id: string; hotel_name: string; period_label: string; created_at: string; form_data: BudgetForm; calculated_data: any; validation_data: any };
const LOCAL_REPORTS_KEY = "corestay-hotel-budget-local-reports-v1";
const monthNames = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
const FB_BUDGET_GROUPS = [{title:"REVENUES",total:"TOTAL F & B REVENUE",rows:[["foodRevenue","FOOD"],["beverageRevenue","BEVERAGE"]]},{title:"COST OF SALES",total:"TOTAL COST OF SALES",rows:[["foodCost","FOOD"],["beverageCost","BEVERAGE"]]},{title:"PAYROLL & RELATED",total:"TOTAL PAYROLL & RELATED",rows:[["salaryWages","SALARY & WAGES"],["incomeTax","INCOME TAX"],["jamsostek","JAMSOSTEK"],["insurance","INSURANCE"],["thr","THR"],["mealAllowances","MEAL ALLOWANCES"]]},{title:"PROV. OP. EQUIPMENT",total:"TOTAL PROV. OP. EQUIPT.",rows:[["glassware","GLASSWARE"],["chinaware","CHINAWARE"],["silverware","SILVERWARE"],["linen","LINEN"]]},{title:"OTHER EXPENSES",total:"TOTAL OTHER EXPENSES",rows:[["decoration","DECORATION"],["duesSubscription","DUES & SUBSCRIPTION"],["extermDisinfectant","EXTERM / DESINFECTANT"],["kitchenFuel","KITCHEN FUEL"],["laundry","LAUNDRY"],["miscellaneous","MISCELLANEOUS"],["spoilage","SPOILAGE"],["cleaningSupplies","CLEANING SUPPLIES"],["guestSupplies","GUEST SUPPLIES"],["printingStationery","PRINTING & STATIONERY"],["telephone","TELEPHONE"],["uniform","UNIFORM"],["utensil","UTENSIL"],["contractCleaning","CONTRACT CLEANING"]]}] as const;
const POMEC_LINES = [{key:"salaryWages",label:"SALARY & WAGES",group:"payroll"},{key:"incomeTax",label:"INCOME TAX",group:"payroll"},{key:"jamsostek",label:"JAMSOSTEK",group:"payroll"},{key:"insurancePayroll",label:"INSURANCE",group:"payroll"},{key:"thr",label:"THR (1 YEAR)",group:"payroll"},{key:"mealAllowances",label:"MEAL ALLOWANCES",group:"payroll"},{key:"paintingDecoration",label:"PAINTING & DECORATION",group:"other"},{key:"engineeringSupplies",label:"ENGINEERING SUPPLIES & EQUIPMENT",group:"other"},{key:"bulbsLamp",label:"BULBS & LAMP",group:"other"},{key:"printingStationery",label:"PRINTING & STATIONERY",group:"other"},{key:"laundryUniform",label:"LAUNDRY UNIFORM",group:"other"},{key:"provisionUniform",label:"PROV. FOR UNIFORM",group:"other"},{key:"acMaintenance",label:"AC MAINTENANCE",group:"other"},{key:"buildingMaintenance",label:"BUILDING MAINTENANCE",group:"other"},{key:"electricityMaintenance",label:"ELECTRICITY MAINTENANCE",group:"other"},{key:"floorCovering",label:"FLOOR COVERING",group:"other"},{key:"furnitureFixtureRepair",label:"FURNITURE & FIXTURE REPAIRMENT",group:"other"},{key:"mechanicalElectrical",label:"MECHANICAL & ELECTRICAL MAINT",group:"other"},{key:"kitchenEquipment",label:"KITCHEN EQUIPMENT MAINTENANCE",group:"other"},{key:"refrigerator",label:"REFRIGERATOR MAINTENANCE",group:"other"},{key:"automobileRepair",label:"AUTO MOBILE REPAIR & SERVICES",group:"other"},{key:"plumbingHeating",label:"PLUMBING/HEATING MAINTENANCE",group:"other"},{key:"removalWaste",label:"REMOVAL WASTE",group:"other"},{key:"pomecOthers",label:"OTHERS",group:"other"},{key:"electricityConsumed",label:"ELECTRICITY CONSUMED",group:"energy"},{key:"waterConsumed",label:"WATER CONSUMED",group:"energy"},{key:"fuelDiesel",label:"FUEL / DIESEL CONSUMED",group:"energy"}] as const;
const pomecValue=(row:ForecastMonth,key:string)=>optional(row.pomecDetails?.[key]||"");
const pomecTotal=(row:ForecastMonth,group:"payroll"|"other"|"energy")=>{const vals=POMEC_LINES.filter(x=>x.group===group).map(x=>pomecValue(row,x.key));return vals.some(v=>v!==null)?vals.reduce<number>((n,v)=>n+(v??0),0):null;};
const makeMonthly = (year:number):ForecastMonth[] => monthNames.map((label,i)=>({agDetails:{},modDetails:{},fbDetails:{},roomDivisionDetails:{},pomecDetails:{},label:label+" "+year,occupancy:"",adr:"",fbRevenue:"",phoneRevenue:"",otherRevenue:"",fbCostOfSales:"",phoneCostOfSales:"",modCostOfSales:"",roomPayroll:"",fbPayroll:"",phonePayroll:"",modPayroll:"",roomOtherExpenses:"",fbOtherExpenses:"",phoneOtherExpenses:"",modOtherExpenses:"",agPayroll:"",smPayroll:"",hrdPayroll:"",pomecPayroll:"",agOtherExpenses:"",smOtherExpenses:"",hrdOtherExpenses:"",pomecOtherExpenses:"",energyCost:"",operatingCosts:"",basicManagementFee:"",otherManagementFee:"",insuranceGeneral:"",landLease:"",ownerInsurance:"",maintenanceFee:"",operatorSharePercent:"30",ownerOtherExpenses:""}));
const makeAnnual = (year: number): ForecastYear[] => Array.from({length:10},(_,i)=>({label:String(year+i),days:String((year+i)%4===0?366:365),rooms:"",occupancy:"",adr:"",fbRevenue:"",otherRevenue:"",operatingCosts:""}));
const makeBlank = (): BudgetForm => ({
  hotelName:"",period:"",yearStart:"2027",
  statistics:{days:"30",rooms:"",outInventory:"",houseUse:"",outOfOrder:"",complimentary:"",roomPaid:"",occupancy:"",exchangeRate:"",averageSellingRate:""},
  accounts:emptyAccounts(),budgetAllocations:{parentPercentBySection:{},childPercentByCode:{}},accountLines:ACCOUNT_LINES,customAccounts:[],forecast:{monthly:makeMonthly(2027),annual:makeAnnual(2027)},
  confirmAccountReview:false,notes:"",actionRecommendation:"",actionOwner:"",actionDue:"",actionTarget:"",actionStatus:"Belum dimulai",actionProgress:"0"
});
const idr = (value: number | null | undefined) => value===null||value===undefined||!Number.isFinite(value) ? "—" : new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(value);
const fmt = (value: number | null | undefined, digits=2) => value===null||value===undefined||!Number.isFinite(value) ? "—" : new Intl.NumberFormat("id-ID",{maximumFractionDigits:digits}).format(value);
const formatWholeRupiah = (value: string | number | null | undefined) => { const n=typeof value==="number"?value:Number(String(value??"").replace(/[^0-9-]/g,"")); return Number.isFinite(n)&&String(value??"").trim()!=="" ? new Intl.NumberFormat("id-ID",{maximumFractionDigits:0}).format(n) : ""; };
const optional = (value: string | undefined) => !value || value.trim()==="" ? null : numeric(value);
const percentOf = (value: number | null, base: number | null) => value===null||base===null||base===0 ? "—" : fmt(value/base*100)+"%";
const percentNumber = (value: number | null, base: number | null) => value===null||base===null||base===0 ? null : value/base*100;
const safeVal = (value: string) => value.trim()==="" ? null : Number(value);
const totalColumn = (groups: readonly (typeof GROUP_ORDER[number])[], accounts: Record<string,AccountValue>, column: keyof AccountValue, customLines: AccountLine[] = []) => {
  const values=groups.map(g=>sumGroup(accounts,g,column,customLines));
  return values.some(v=>v!==null) ? values.reduce<number>((s,v)=>s+(v??0),0) : null;
};
const calcMonthly = (row:ForecastMonth,year:number,index:number,rooms:string) => {
  const days=new Date(year,index+1,0).getDate(),roomCount=optional(rooms),occ=optional(row.occupancy),adr=optional(row.adr);
  const roomRevenue=roomCount!==null&&occ!==null&&adr!==null?days*roomCount*occ/100*adr:null;
  const fb=optional(row.fbRevenue),phone=optional(row.phoneRevenue),other=optional(row.otherRevenue);
  const revenueParts=[roomRevenue,fb,phone,other].filter((v):v is number=>v!==null);
  const revenue=revenueParts.length?revenueParts.reduce((a,b)=>a+b,0):null;
  const costs=optional(row.operatingCosts);
  return {days,roomRevenue,revenue,costs,gop:revenue!==null&&costs!==null?revenue-costs:null};
};
const calcAnnual = (row: ForecastYear) => {
  const days=optional(row.days), rooms=optional(row.rooms), occ=optional(row.occupancy), adr=optional(row.adr);
  const roomRevenue=days!==null&&rooms!==null&&occ!==null&&adr!==null?days*rooms*occ/100*adr:null;
  const fb=optional(row.fbRevenue), other=optional(row.otherRevenue), costs=optional(row.operatingCosts);
  const revenue=roomRevenue!==null||fb!==null||other!==null?(roomRevenue??0)+(fb??0)+(other??0):null;
  return {roomRevenue,revenue,costs,gop:revenue!==null&&costs!==null?revenue-costs:null};
};


type ConsolidatedRow = { label:string; kind:"section"|"sum"|"avg"|"percent"|"money"; values:(number|null)[]; total?:number|null; base?:(number|null)[]; totalPct?:number|null; inputKey?:keyof Omit<ForecastMonth,"label">; editable?:boolean[] };
const buildConsolidatedRows = (form:BudgetForm):ConsolidatedRow[] => {
  const year=Number(form.yearStart), months=form.forecast.monthly.map((r,i)=>calcMonthly(r,year,i,form.statistics.rooms));
  const roomCount=optional(form.statistics.rooms);
  const sumPresent=(a:(number|null)[])=>a.some(v=>v!==null)?a.reduce<number>((s,v)=>s+(v??0),0):null;
  const sumComplete=(a:(number|null)[])=>a.length&&a.every(v=>v!==null)?a.reduce<number>((s,v)=>s+(v??0),0):null;
  const avgPresent=(a:(number|null)[])=>{const valid=a.filter((v):v is number=>v!==null);return valid.length?valid.reduce((x,y)=>x+y,0)/valid.length:null;};
  const pct=(v:number|null,b:number|null)=>v===null||b===null||b===0?null:v/b*100;
  const val=(row:ForecastMonth,key:keyof ForecastMonth)=>optional(String(row[key]??""));
  const monthly=(key:keyof ForecastMonth)=>(form.forecast.monthly.map(r=>val(r,key)));
  const pomecMonthly=(group:"payroll"|"other"|"energy")=>form.forecast.monthly.map(r=>pomecTotal(r,group)??(group==="payroll"?val(r,"pomecPayroll"):group==="other"?val(r,"pomecOtherExpenses"):val(r,"energyCost")));
  const roomRevenue=months.map(m=>m.roomRevenue), fb=monthly("fbRevenue"), phone=monthly("phoneRevenue"), other=monthly("otherRevenue");
  const revenue=months.map(m=>m.revenue), revenueTotal=sumPresent(revenue);
  const available=months.map(m=>roomCount===null?null:m.days*roomCount);
  const occupied=months.map((m,i)=>available[i]===null||optional(form.forecast.monthly[i].occupancy)===null?null:available[i]!*optional(form.forecast.monthly[i].occupancy)!/100);
  const roomAvailableTotal=sumPresent(available), occupiedTotal=sumPresent(occupied), roomRevenueTotal=sumPresent(roomRevenue);
  const monthlyCost=(row:ForecastMonth)=>{
    // Sum entered cost buckets so source-budget totals appear even when the report
    // has not yet been split into every department line.
    const sumEntered=(keys:(keyof ForecastMonth)[])=>{const values=keys.map(key=>val(row,key));return values.some(v=>v!==null)?values.reduce<number>((total,v)=>total+(v??0),0):null;};
    const cos=sumEntered(["fbCostOfSales","phoneCostOfSales","modCostOfSales"]);
    const payroll=sumEntered(["roomPayroll","fbPayroll","phonePayroll","modPayroll"]);
    const deptOther=sumEntered(["roomOtherExpenses","fbOtherExpenses","phoneOtherExpenses","modOtherExpenses"]);
    const pomecPayrollDetail=pomecTotal(row,"payroll"),pomecOtherDetail=pomecTotal(row,"other"),pomecEnergyDetail=pomecTotal(row,"energy");
    const overheadPayroll=sumEntered(["agPayroll","smPayroll","hrdPayroll"])===null&&pomecPayrollDetail===null?null:(sumEntered(["agPayroll","smPayroll","hrdPayroll"])??0)+(pomecPayrollDetail??val(row,"pomecPayroll")??0);
    const overheadOther=sumEntered(["agOtherExpenses","smOtherExpenses","hrdOtherExpenses"])===null&&pomecOtherDetail===null&&pomecEnergyDetail===null?null:(sumEntered(["agOtherExpenses","smOtherExpenses","hrdOtherExpenses"])??0)+(pomecOtherDetail??val(row,"pomecOtherExpenses")??0)+(pomecEnergyDetail??val(row,"energyCost")??0);
    const detailed=[cos,payroll,deptOther,overheadPayroll,overheadOther];
    const detailKeys:(keyof ForecastMonth)[]=["fbCostOfSales","phoneCostOfSales","modCostOfSales","roomPayroll","fbPayroll","phonePayroll","modPayroll","roomOtherExpenses","fbOtherExpenses","phoneOtherExpenses","modOtherExpenses","agPayroll","smPayroll","hrdPayroll","pomecPayroll","agOtherExpenses","smOtherExpenses","hrdOtherExpenses","pomecOtherExpenses","energyCost"];
    const hasDetail=detailKeys.some(k=>val(row,k)!==null);
    const detailTotal=detailed.every(v=>v!==null)?sumPresent(detailed):null;
    return {cos,payroll,deptOther,overheadPayroll,overheadOther,hasDetail,detailTotal,fallback:val(row,"operatingCosts")};
  };
  const costParts=form.forecast.monthly.map(monthlyCost);
  const totalOperatingCosts=costParts.map(c=>c.detailTotal??c.fallback);
  const deptIncome=form.forecast.monthly.map((r,i)=>{
    const room=roomRevenue[i], rp=val(r,"roomPayroll"), ro=val(r,"roomOtherExpenses");
    const f=fb[i], fc=val(r,"fbCostOfSales"), fp=val(r,"fbPayroll"), fo=val(r,"fbOtherExpenses");
    const ph=phone[i], pc=val(r,"phoneCostOfSales"), pp=val(r,"phonePayroll"), po=val(r,"phoneOtherExpenses");
    const mo=other[i], mc=val(r,"modCostOfSales"), mp=val(r,"modPayroll"), mx=val(r,"modOtherExpenses");
    return {
      room:room!==null&&rp!==null&&ro!==null?room-rp-ro:null,
      fb:f!==null&&fc!==null&&fp!==null&&fo!==null?f-fc-fp-fo:null,
      phone:ph!==null&&pc!==null&&pp!==null&&po!==null?ph-pc-pp-po:null,
      mod:mo!==null&&mc!==null&&mp!==null&&mx!==null?mo-mc-mp-mx:null
    };
  });
  // Department income can be derived from total revenue less the three
  // departmental cost buckets even when the costs have not been allocated
  // to every individual department line.
  const departmentalOperatingCost=costParts.map(c=>sumComplete([c.cos,c.payroll,c.deptOther]));
  const deptIncomeTotal=deptIncome.map((d,i)=>{
    const detail=sumComplete([d.room,d.fb,d.phone,d.mod]);
    if(detail!==null)return detail;
    return revenue[i]!==null&&departmentalOperatingCost[i]!==null?revenue[i]!-departmentalOperatingCost[i]!:null;
  });
  // When the combined operating-cost input is available, overhead total is
  // the residual after departmental costs; this avoids a blank subtotal when
  // overhead payroll has not been split out but total costs are known.
  const overheadTotal=costParts.map((c,i)=>{
    const detail=sumComplete([c.overheadPayroll,c.overheadOther]);
    if(detail!==null)return detail;
    return totalOperatingCosts[i]!==null&&departmentalOperatingCost[i]!==null
      ?totalOperatingCosts[i]!-departmentalOperatingCost[i]!:null;
  });
  const houseProfit=deptIncomeTotal.map((v,i)=>v!==null&&overheadTotal[i]!==null?v-overheadTotal[i]!:null);
  const goi=houseProfit.map((v,i)=>v!==null&&val(form.forecast.monthly[i],"basicManagementFee")!==null?v-val(form.forecast.monthly[i],"basicManagementFee")!:null);
  const nonOp= form.forecast.monthly.map(r=>sumComplete([val(r,"otherManagementFee"),val(r,"insuranceGeneral")]));
  const gop=goi.map((v,i)=>v!==null&&nonOp[i]!==null?v-nonOp[i]!:revenue[i]!==null&&totalOperatingCosts[i]!==null?revenue[i]!-totalOperatingCosts[i]!:null);
  const otherExpense= form.forecast.monthly.map(r=>sumComplete([val(r,"landLease"),val(r,"ownerInsurance"),val(r,"maintenanceFee")]));
  const osp=gop.map((v,i)=>v!==null&&otherExpense[i]!==null?v-otherExpense[i]!:null);
  const operatorShare=osp.map((v,i)=>v!==null&&val(form.forecast.monthly[i],"operatorSharePercent")!==null?v*val(form.forecast.monthly[i],"operatorSharePercent")!/100:null);
  const ownerShare=osp.map((v,i)=>v!==null&&val(form.forecast.monthly[i],"operatorSharePercent")!==null?v*(100-val(form.forecast.monthly[i],"operatorSharePercent")!)/100:null);
  const nosp=ownerShare.map((v,i)=>v!==null&&val(form.forecast.monthly[i],"ownerOtherExpenses")!==null?v-val(form.forecast.monthly[i],"ownerOtherExpenses")!:null);
  const rows:ConsolidatedRow[]=[];
  const section=(label:string)=>rows.push({label,kind:"section",values:[]});
  const add=(label:string,values:(number|null)[],kind:ConsolidatedRow["kind"]="money",inputKey?:keyof Omit<ForecastMonth,"label">,total?:number|null,base?:(number|null)[],editable?:boolean[])=>{
    const t=total===undefined?(kind==="sum"||kind==="money"?sumPresent(values):(kind==="avg"||kind==="percent"?avgPresent(values):null)):total;
    rows.push({label,values,kind,inputKey,total:t,base,totalPct:base?pct(t,sumPresent(base)):undefined,editable});
  };
  section("STATISTICS");
  add("Days",months.map(m=>m.days),"sum",undefined,months.reduce((a,m)=>a+m.days,0));
  add("# OF ROOMS",months.map(()=>roomCount),"avg",undefined,roomCount);
  add("ROOM AVAILABLE",available,"sum",undefined,roomAvailableTotal);
  add("OCCUPIED ROOMS",occupied,"sum",undefined,occupiedTotal);
  add("OCCUPANCY (%)",form.forecast.monthly.map(r=>optional(r.occupancy)),"percent", "occupancy",pct(occupiedTotal,roomAvailableTotal));
  add("AVERAGE ROOM RATE / ADR (RP)",months.map((m,i)=>m.roomRevenue!==null&&occupied[i]!==null&&occupied[i]!>0?m.roomRevenue/occupied[i]!:optional(form.forecast.monthly[i].adr)),"money","adr",occupiedTotal!==null&&occupiedTotal>0&&roomRevenueTotal!==null?roomRevenueTotal/occupiedTotal:null);
  add("REVPAR (RP)",months.map((m,i)=>m.roomRevenue!==null&&available[i]!==null&&available[i]!>0?m.roomRevenue/available[i]!:null),"money",undefined,roomAvailableTotal!==null&&roomAvailableTotal>0&&roomRevenueTotal!==null?roomRevenueTotal/roomAvailableTotal:null);
  add("EXCHANGE RATE US $ TO RP",form.forecast.monthly.map(()=>optional(form.statistics.exchangeRate)),"money",undefined,optional(form.statistics.exchangeRate));
  add("AVERAGE SELLING RATE (RP)",months.map((m,i)=>m.roomRevenue!==null&&occupied[i]!==null&&occupied[i]!>0?m.roomRevenue/occupied[i]!:optional(form.statistics.averageSellingRate)),"money",undefined,occupiedTotal!==null&&occupiedTotal>0&&roomRevenueTotal!==null?roomRevenueTotal/occupiedTotal:optional(form.statistics.averageSellingRate));
  section("REVENUES");
  add("ROOMS",roomRevenue,"money",undefined,roomRevenueTotal,revenue);
  add("FOOD & BEVERAGE",fb,"money","fbRevenue",sumPresent(fb),revenue);
  add("TELEPHONE & FACSIMILE",phone,"money","phoneRevenue",sumPresent(phone),revenue);
  add("MINOR OPERATING DEPARTMENT",other,"money","otherRevenue",sumPresent(other),revenue);
  add("TOTAL REVENUES (EXCL. TAX)",revenue,"sum",undefined,revenueTotal,revenue);
  add("TOTAL REVENUES (INCL. 21% — reference workbook formula)",revenue.map(v=>v===null?null:v*1.21),"sum",undefined,revenueTotal===null?null:revenueTotal*1.21,revenue);
  section("COST OF SALES");
  add("Food & Beverage",monthly("fbCostOfSales"),"money","fbCostOfSales");
  add("Telephone & Facsimile",monthly("phoneCostOfSales"),"money","phoneCostOfSales");
  add("Minor Operating Department",monthly("modCostOfSales"),"money","modCostOfSales");
  add("TOTAL COST OF SALES",costParts.map(c=>c.cos),"sum",undefined,sumPresent(costParts.map(c=>c.cos)),revenue);
  section("PAYROLL & RELATED EXPENSES");
  add("ROOM",monthly("roomPayroll"),"money","roomPayroll");
  add("FOOD & BEVERAGE",monthly("fbPayroll"),"money","fbPayroll");
  add("TELEPHONE",monthly("phonePayroll"),"money","phonePayroll");
  add("MINOR OPERATING DEPARTMENT",monthly("modPayroll"),"money","modPayroll");
  add("TOTAL PAYROLL & RELATED EXPENSES",costParts.map(c=>c.payroll),"sum",undefined,sumPresent(costParts.map(c=>c.payroll)),revenue);
  section("OTHER DEPARTMENT EXPENSES");
  add("ROOM",monthly("roomOtherExpenses"),"money","roomOtherExpenses");
  add("FOOD & BEVERAGE",monthly("fbOtherExpenses"),"money","fbOtherExpenses");
  add("TELEPHONE & FACSIMILE",monthly("phoneOtherExpenses"),"money","phoneOtherExpenses");
  add("MINOR OPERATING DEPARTMENT",monthly("modOtherExpenses"),"money","modOtherExpenses");
  add("TOTAL OTHER DEPARTMENT EXPENSES",costParts.map(c=>c.deptOther),"sum",undefined,sumPresent(costParts.map(c=>c.deptOther)),revenue);
  add("DEPARTMENT OPERATING COST & EXPENSES",departmentalOperatingCost,"sum",undefined,sumPresent(departmentalOperatingCost),revenue);
  add("TOTAL OPERATING COSTS (DETAILED WHEN COMPLETE; OTHERWISE COMBINED INPUT)",totalOperatingCosts,"sum","operatingCosts",sumPresent(totalOperatingCosts),revenue,costParts.map(c=>c.detailTotal===null));
  section("DEPARTMENT INCOME");
  add("ROOM",deptIncome.map(d=>d.room),"money",undefined,sumPresent(deptIncome.map(d=>d.room)),roomRevenue);
  add("FOOD & BEVERAGE",deptIncome.map(d=>d.fb),"money",undefined,sumPresent(deptIncome.map(d=>d.fb)),fb);
  add("TELEPHONE & FACSIMILE",deptIncome.map(d=>d.phone),"money",undefined,sumPresent(deptIncome.map(d=>d.phone)),phone);
  add("MINOR OPERATING DEPARTMENT",deptIncome.map(d=>d.mod),"money",undefined,sumPresent(deptIncome.map(d=>d.mod)),other);
  add("TOTAL DEPARTMENT INCOME",deptIncomeTotal,"sum",undefined,sumPresent(deptIncomeTotal),revenue);
  section("OVERHEAD DEPARTMENT — PAYROLL & RELATED");
  add("A&G",monthly("agPayroll"),"money","agPayroll");
  add("S&M",monthly("smPayroll"),"money","smPayroll");
  add("HRD",monthly("hrdPayroll"),"money","hrdPayroll");
  add("POMEC / ENGINEERING",pomecMonthly("payroll"),"money","pomecPayroll");
  add("TOTAL OVERHEAD PAYROLL",costParts.map(c=>c.overheadPayroll),"sum",undefined,sumPresent(costParts.map(c=>c.overheadPayroll)),revenue);
  section("OVERHEAD DEPARTMENT — OTHER EXPENSES");
  add("A&G",monthly("agOtherExpenses"),"money","agOtherExpenses");
  add("S&M",monthly("smOtherExpenses"),"money","smOtherExpenses");
  add("HRD",monthly("hrdOtherExpenses"),"money","hrdOtherExpenses");
  add("POMEC / ENGINEERING",pomecMonthly("other"),"money","pomecOtherExpenses");
  add("ENERGY COST",pomecMonthly("energy"),"money","energyCost");
  section("POMEC / ENGINEERING — DETAIL FORECAST");
  POMEC_LINES.forEach(line=>add(line.label,form.forecast.monthly.map(row=>pomecValue(row,line.key)),"money",undefined,sumPresent(form.forecast.monthly.map(row=>pomecValue(row,line.key))),revenue));
  add("TOTAL OVERHEAD OTHER EXPENSES",costParts.map(c=>c.overheadOther),"sum",undefined,sumPresent(costParts.map(c=>c.overheadOther)),revenue);
  add("TOTAL OVERHEAD DEPARTMENT",overheadTotal,"sum",undefined,sumPresent(overheadTotal),revenue);
  add("HOUSE PROFIT",houseProfit,"sum",undefined,sumPresent(houseProfit),revenue);
  add("BASIC MANAGEMENT FEE",monthly("basicManagementFee"),"money","basicManagementFee",sumPresent(monthly("basicManagementFee")),revenue);
  add("GROSS OPERATING INCOME",goi,"sum",undefined,sumPresent(goi),revenue);
  section("OTHER NON-OPERATING EXPENSES / GOP");
  add("MANAGEMENT FEES",monthly("otherManagementFee"),"money","otherManagementFee");
  add("INSURANCE GENERAL",monthly("insuranceGeneral"),"money","insuranceGeneral");
  add("TOTAL OTHER NON-OPERATING EXPENSES",nonOp,"sum",undefined,sumPresent(nonOp),revenue);
  add("GROSS OPERATING PROFIT (GOP)",gop,"sum",undefined,sumPresent(gop),revenue);
  add("% GOP",gop.map((v,i)=>pct(v,revenue[i])),"percent",undefined,pct(sumPresent(gop),revenueTotal));
  section("OTHER EXPENSES / OWNER SHARE PROFIT");
  add("LAND LEASE / HOLD",monthly("landLease"),"money","landLease");
  add("INSURANCE",monthly("ownerInsurance"),"money","ownerInsurance");
  add("MAINTENANCE FEE (SERVICE CHARGE)",monthly("maintenanceFee"),"money","maintenanceFee");
  add("TOTAL OTHER EXPENSES",otherExpense,"sum",undefined,sumPresent(otherExpense),revenue);
  add("OWNER SHARE PROFIT (OSP)",osp,"sum",undefined,sumPresent(osp),revenue);
  add("OPERATOR SHARE RATE (%)",monthly("operatorSharePercent"),"percent","operatorSharePercent",avgPresent(monthly("operatorSharePercent")));
  add("PT / OPERATOR SHARE (RP)",operatorShare,"sum",undefined,sumPresent(operatorShare),osp);
  add("HOTEL / OWNER SHARE (RP)",ownerShare,"sum",undefined,sumPresent(ownerShare),osp);
  add("OTHER OWNER EXPENSES",monthly("ownerOtherExpenses"),"money","ownerOtherExpenses");
  add("TOTAL OWNER EXPENSES",form.forecast.monthly.map((r,i)=>sumComplete([operatorShare[i],ownerShare[i],val(r,"ownerOtherExpenses")])),"sum",undefined,sumPresent(form.forecast.monthly.map((r,i)=>sumComplete([operatorShare[i],ownerShare[i],val(r,"ownerOtherExpenses")]))),osp);
  add("NET OWNER SHARE PROFIT (NOSP)",nosp,"sum",undefined,sumPresent(nosp),revenue);
  add("NET OWNER SHARE PROFIT / UNIT",nosp.map((v)=>v!==null&&roomCount!==null&&roomCount>0?v/roomCount:null),"money",undefined,roomCount!==null&&roomCount>0&&sumPresent(nosp)!==null?sumPresent(nosp)!/roomCount:null);
  return rows;
};

export default function HotelBudgetPage() {
  const [form,setForm]=useState<BudgetForm>(makeBlank);
  const [activeTab,setActiveTab]=useState("statistics");
  const [selectedDepartment,setSelectedDepartment]=useState("room");
  const [authStatus,setAuthStatus]=useState<"checking"|"authenticated"|"unauthenticated">("checking");
  const [accessToken,setAccessToken]=useState("");
  const [reports,setReports]=useState<SavedReport[]>([]);
  const [selectedReport,setSelectedReport]=useState("");
  const [search,setSearch]=useState("");
  const [pnlView,setPnlView]=useState<"month"|"ytd">("month");
  const [pnlDepartment,setPnlDepartment]=useState("all");
  const [previewOpen,setPreviewOpen]=useState(false);
  const [saving,setSaving]=useState(false);
  const [loadingReports,setLoadingReports]=useState(false);
  const [message,setMessage]=useState("");
  const [issues,setIssues]=useState<string[]>([]);
  const [warnings,setWarnings]=useState<string[]>([]);
  const [orchestrator,setOrchestrator]=useState<"idle"|"checking"|"passed"|"failed">("idle");
  const [summary,setSummary]=useState("");
  const [currency,setCurrency]=useState<"IDR"|"USD">("IDR");
  const money=(value:number|null|undefined)=>value===null||value===undefined||!Number.isFinite(value)?"—":new Intl.NumberFormat(currency==="IDR"?"id-ID":"en-US",{style:"currency",currency,maximumFractionDigits:currency==="IDR"?0:2}).format(value);

  const buildTenYearRows=(source:BudgetForm)=>{
    type R={label:string;section?:boolean;values:(number|null)[];total:number|null;base?:(number|null)[];totalPct:number|null;kind?:"percent"|"count"|"money";inputKey?:keyof Omit<ForecastYear,"label">};
    const years=source.forecast.annual.map(row=>({row,calc:calcAnnual(row),days:optional(row.days),rooms:optional(row.rooms),occ:optional(row.occupancy)}));
    const roomAvail=years.map(y=>y.days!==null&&y.rooms!==null?y.days*y.rooms:null);
    const occupied=years.map((y,i)=>roomAvail[i]!==null&&y.occ!==null?roomAvail[i]!*y.occ/100:null);
    const roomRevenue=years.map(y=>y.calc.roomRevenue);
    const fb=years.map(y=>optional(y.row.fbRevenue));
    const other=years.map(y=>optional(y.row.otherRevenue));
    const revenue=years.map(y=>y.calc.revenue);
    const costs=years.map(y=>y.calc.costs);
    const baseCost=(group:AccountGroup)=>sumGroup(source.accounts,group,"budget",Array.isArray(source.accountLines)?source.accountLines:ACCOUNT_LINES);
    const annualCost=(group:AccountGroup)=>years.map((y,i)=>{const base=baseCost(group);return base===null?null:base*Math.pow(1.02,i);});
    const costOfSales=annualCost("costOfSales"), payroll=annualCost("payroll"), deptExpenses=annualCost("operatingExpenses"), overhead=annualCost("overhead");
    const gop=years.map((y,i)=>revenue[i]!==null&&costs[i]!==null?revenue[i]!-costs[i]!:null);
    const sum=(a:(number|null)[])=>a.some(v=>v!==null)?a.reduce<number>((n,v)=>n+(v??0),0):null;
    const pct=(v:number|null,b:number|null)=>v===null||b===null||b===0?null:v/b*100;
    const totalRevenue=sum(revenue), totalRoomRev=sum(roomRevenue), totalAvailable=sum(roomAvail), totalOccupied=sum(occupied);
    const avg=(a:(number|null)[])=>{const x=a.filter((v):v is number=>v!==null);return x.length?x.reduce((n,v)=>n+v,0)/x.length:null;};
    const make=(label:string,values:(number|null)[],kind:R["kind"]="money",base?:(number|null)[],inputKey?:R["inputKey"],totalOverride?:number|null):R=>{
      const total=totalOverride===undefined?sum(values):totalOverride;
      return {label,values,kind,base,inputKey,total,totalPct:base?pct(total,sum(base)):null};
    };
    const section=(label:string):R=>({label,section:true,values:[],total:null,totalPct:null});
    return [
      section("STATISTICS"),
      make("Days",years.map(y=>y.days),"count",undefined,"days",sum(years.map(y=>y.days))),
      make("# OF ROOMS",years.map(y=>y.rooms),"count",undefined,"rooms",avg(years.map(y=>y.rooms))),
      make("ROOM AVAILABLE",roomAvail,"count",undefined,undefined,totalAvailable),
      make("OCCUPIED ROOMS",occupied,"count",undefined,undefined,totalOccupied),
      make("OCCUPANCY (%)",years.map(y=>y.occ),"percent",undefined,"occupancy",pct(totalOccupied,totalAvailable)),
      make("AVERAGE ROOM RATE / ADR (RP)",years.map((y,i)=>roomRevenue[i]!==null&&occupied[i]!==null&&occupied[i]!>0?roomRevenue[i]!/occupied[i]!:optional(y.row.adr)),"money",undefined,"adr",totalRoomRev!==null&&totalOccupied!==null&&totalOccupied>0?totalRoomRev/totalOccupied:null),
      make("REVPAR (RP)",years.map((y,i)=>roomRevenue[i]!==null&&roomAvail[i]!==null&&roomAvail[i]!>0?roomRevenue[i]!/roomAvail[i]!:null),"money",undefined,undefined,totalRoomRev!==null&&totalAvailable!==null&&totalAvailable>0?totalRoomRev/totalAvailable:null),
      make("AVERAGE SELLING RATE (RP)",years.map(y=>optional(y.row.adr)),"money",undefined,"adr",avg(years.map(y=>optional(y.row.adr)))),
      section("REVENUES"),
      make("ROOMS",roomRevenue,"money",revenue),
      make("FOOD & BEVERAGE",fb,"money",revenue,"fbRevenue"),
      make("MINOR OPERATING DEPARTMENT",other,"money",revenue,"otherRevenue"),
      make("TOTAL REVENUES (EXCL. TAX)",revenue,"money",revenue,undefined,totalRevenue),
      make("TOTAL REVENUES (INCL. 21% — reference formula)",revenue.map(v=>v===null?null:v*1.21),"money",undefined,undefined,totalRevenue===null?null:totalRevenue*1.21),
      section("COST OF SALES"),
      make("TOTAL COST OF SALES",costOfSales,"money",revenue),
      section("PAYROLL & RELATED EXPENSES"),
      make("TOTAL PAYROLL & RELATED EXPENSES",payroll,"money",revenue),
      section("OTHER DEPARTMENT EXPENSES"),
      make("TOTAL OTHER DEPARTMENT EXPENSES",deptExpenses,"money",revenue),
      make("TOTAL OVERHEAD / UNDISTRIBUTED EXPENSES",overhead,"money",revenue),
      make("TOTAL OPERATING COSTS",costs,"money",revenue,"operatingCosts"),
      section("DEPARTMENT INCOME"),
      make("ROOM — detail not entered",years.map(()=>null),"money",roomRevenue),
      make("FOOD & BEVERAGE — detail not entered",years.map(()=>null),"money",fb),
      make("MINOR OPERATING DEPARTMENT — detail not entered",years.map(()=>null),"money",other),
      make("TOTAL DEPARTMENT INCOME — detail not entered",years.map(()=>null),"money",revenue),
      section("OVERHEAD DEPARTMENT"),
      make("PAYROLL & RELATED — detail not entered",years.map(()=>null),"money",revenue),
      make("OTHER EXPENSES — detail not entered",years.map(()=>null),"money",revenue),
      make("TOTAL OVERHEAD DEPARTMENT — detail not entered",years.map(()=>null),"money",revenue),
      section("POMEC / ENGINEERING — DETAIL FORECAST"),
      ...POMEC_LINES.map(line=>{const base=source.forecast.monthly.reduce((n,row)=>n+(pomecValue(row,line.key)??0),0);const values=years.map((_,i)=>base===0&&source.forecast.monthly.every(row=>pomecValue(row,line.key)===null)?null:base*Math.pow(1.02,i));return make(line.label,values,"money",revenue);}),
      make("GROSS OPERATING PROFIT (GOP / CONTRIBUTION)",gop,"money",revenue),
      make("% GOP",gop.map((v,i)=>pct(v,revenue[i])),"percent",undefined,undefined,pct(sum(gop),totalRevenue)),
      section("OTHER NON-OPERATING / OWNER EXPENSES"),
      make("MANAGEMENT FEES — detail not entered",years.map(()=>null),"money",revenue),
      make("PROPERTY INSURANCE — detail not entered",years.map(()=>null),"money",revenue),
      make("LAND LEASE / CAPEX / OWNER EXPENSES — detail not entered",years.map(()=>null),"money",revenue),
      make("NET OWNER PROFIT — requires owner-level expenses",years.map(()=>null),"money",revenue)
    ];
  };

  const loadReports=useCallback(async(token:string)=>{
    setLoadingReports(true);
    try{
      const response=await fetch("/api/hotel-budget/final-reports",{headers:{Authorization:"Bearer "+token},cache:"no-store"});
      const data=await response.json();
      if(!response.ok) throw new Error(data.error||"Daftar laporan tidak dapat dibaca.");
      const list=Array.isArray(data.reports)?data.reports:[];
      let local: SavedReport[] = [];
      try { const parsed=JSON.parse(window.localStorage.getItem(LOCAL_REPORTS_KEY)||"[]"); if(Array.isArray(parsed)) local=parsed; } catch {}
      const combined=[...local,...list];
      setReports(combined);
      if(combined.length) setSelectedReport(prev=>prev||combined[0].id);
    }catch(e){setMessage(e instanceof Error?e.message:"Gagal membaca laporan tersimpan.");}
    finally{setLoadingReports(false);}
  },[]);

  useEffect(()=>{
    let alive=true;
    supabase.auth.getSession().then(({data})=>{
      if(!alive)return;
      const token=data.session?.access_token||"";
      setAccessToken(token);setAuthStatus(token?"authenticated":"unauthenticated");
      if(token) void loadReports(token);
      else { try { const local=JSON.parse(window.localStorage.getItem(LOCAL_REPORTS_KEY)||"[]"); if(Array.isArray(local)){setReports(local);if(local.length)setSelectedReport(prev=>prev||local[0].id);} } catch {} }
    }).catch(()=>{if(alive)setAuthStatus("unauthenticated");});
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{
      const token=session?.access_token||"";
      setAccessToken(token);setAuthStatus(token?"authenticated":"unauthenticated");
      if(token) void loadReports(token); else {setReports([]);setSelectedReport("");}
    });
    return()=>{alive=false;subscription.unsubscribe();};
  },[loadReports]);

  useEffect(()=>{
    const start=Number(form.yearStart);
    if(Number.isInteger(start)&&start>=1900&&start<=2200){
      setForm(prev=>{
        const monthly=prev.forecast.monthly.map((row,i)=>({...row,label:monthNames[i]+" "+start,modDetails:{...(row.modDetails||{}),operatingDays:String(new Date(start,i+1,0).getDate())}}));
        const annual=prev.forecast.annual.map((row,i)=>({...row,label:String(start+i),days:String((start+i)%4===0&&((start+i)%100!==0||(start+i)%400===0)?366:365)}));
        return {...prev,forecast:{monthly,annual}};
      });
    }
  },[form.yearStart]);

  const allAccountLines=useMemo(()=>{
    const savedLines=Array.isArray(form.accountLines)?form.accountLines:[];
    const customLines=Array.isArray(form.customAccounts)?form.customAccounts:[];
    // Always render built-in accounts from the canonical chart of accounts.
    // Legacy saved forms can contain blank/malformed labels or codes.
    const builtIn=ACCOUNT_LINES.map(canonical=>{
      const saved=savedLines.find(line=>line?.code===canonical.code);
      return {...canonical,...(saved||{}),code:canonical.code,label:canonical.label,group:canonical.group,section:canonical.section};
    });
    const extra=[...savedLines.filter(line=>line?.code&&!ACCOUNT_LINES.some(item=>item.code===line.code)&&line?.label?.trim()),...customLines]
      .filter((line,index,arr)=>arr.findIndex(item=>item.code===line.code)===index);
    return [...builtIn,...extra];
  },[form.accountLines,form.customAccounts]);
  const allAccountSections=useMemo(()=>[...new Set(allAccountLines.map(line=>line.section))],[allAccountLines]);
  const values=useMemo(()=>calculateBudget({...form, accountLines: allAccountLines}),[form,allAccountLines]);
  const forecastSource=useMemo(()=>{
    const total=(groups:AccountGroup[],column:keyof AccountValue="budget")=>{
      const nums=groups.map(g=>sumGroup(form.accounts,g,column,allAccountLines)).filter((v):v is number=>v!==null);
      return nums.length?nums.reduce((a,b)=>a+b,0):null;
    };
    const roomBudget=total(["roomRevenue"]);
    const rooms=optional(form.statistics.rooms);
    const year=Number(form.yearStart);
    const daysInYear=Number.isInteger(year)&&year>=1900&&year<=2200?(year%4===0&&(year%100!==0||year%400===0)?366:365):365;
    const roomNightsAtFullOccupancy=rooms!==null&&rooms>0?rooms*daysInYear:null;
    const enteredAdr=optional(form.statistics.averageSellingRate);
    const sourceOccupancy=values.occupancy??optional(form.statistics.occupancy);
    const sourceAdr=values.adr;
    // Budget room revenue plus a supplied ARR gives a derived occupancy.
    // If ARR is absent, use observed occupancy (when available) to derive the budget ADR.
    const occupancyFromBudget=roomBudget!==null&&enteredAdr!==null&&enteredAdr>0&&roomNightsAtFullOccupancy!==null
      ? roomBudget/(roomNightsAtFullOccupancy*enteredAdr)*100
      : null;
    const occupancy=occupancyFromBudget!==null?occupancyFromBudget:sourceOccupancy;
    const occupiedRoomNights=roomNightsAtFullOccupancy!==null&&occupancy!==null?roomNightsAtFullOccupancy*occupancy/100:null;
    const adr=enteredAdr!==null&&enteredAdr>0?enteredAdr:
      roomBudget!==null&&occupiedRoomNights!==null&&occupiedRoomNights>0?roomBudget/occupiedRoomNights:sourceAdr;
    return {
      occupancy:occupancy!==null&&Number.isFinite(occupancy)?occupancy:null,
      adr:adr!==null&&Number.isFinite(adr)?adr:null,
      fb:total(["fbRevenue"]),
      other:total(["otherRevenue"]),
      costOfSales:total(["costOfSales"]),
      payroll:total(["payroll"]),
      operatingExpenses:total(["operatingExpenses"]),
      overhead:total(["overhead"]),
      costs:total(["costOfSales","payroll","operatingExpenses","overhead"])
    };
  },[form.accounts,allAccountLines,values.occupancy,values.adr,form.statistics.averageSellingRate,form.statistics.rooms,form.yearStart]);
  useEffect(()=>{
    const startYear=Number(form.yearStart);
    if(!Number.isInteger(startYear)||startYear<1900||startYear>2200)return;
    const baseOccupancy=forecastSource.occupancy;
    const baseAdr=forecastSource.adr;
    const baseFb=forecastSource.fb;
    const baseOther=forecastSource.other;
    const baseCosts=forecastSource.costs;
    const rooms=optional(form.statistics.rooms);
    const monthly=monthNames.map((label,index)=>{
      const yearDays=new Date(startYear,0,1).getFullYear()===startYear?(startYear%4===0&&(startYear%100!==0||startYear%400===0)?366:365):365;
      const days=new Date(startYear,index+1,0).getDate();
      const share=days/yearDays;
      return {
        ...makeMonthly(startYear)[index],
        label:label+" "+startYear,
        occupancy:baseOccupancy===null?"":String(Math.round(baseOccupancy*100)/100),
        adr:baseAdr===null?"":String(Math.round(baseAdr*100)/100),
        fbRevenue:baseFb===null?"":String(Math.round(baseFb*share)),
        otherRevenue:baseOther===null?"":String(Math.round(baseOther*share)),
        fbCostOfSales:forecastSource.costOfSales===null?"":String(Math.round(forecastSource.costOfSales*share)),
        roomPayroll:forecastSource.payroll===null?"":String(Math.round(forecastSource.payroll*share)),
        roomOtherExpenses:forecastSource.operatingExpenses===null?"":String(Math.round(forecastSource.operatingExpenses*share)),
        agOtherExpenses:forecastSource.overhead===null?"":String(Math.round(forecastSource.overhead*share)),
        operatingCosts:baseCosts===null?"":String(Math.round(baseCosts*share))
      };
    });
    const annual=Array.from({length:10},(_,index)=>{
      const year=startYear+index;
      const factor=Math.pow(1.02,index);
      const grow=(value:number|null)=>value===null?"":String(Math.round(value*factor));
      const occ=baseOccupancy===null?null:baseOccupancy*factor;
      return {
        label:String(year),
        days:String(year%4===0&&(year%100!==0||year%400===0)?366:365),
        rooms:rooms===null?"":String(rooms),
        occupancy:occ===null?"":String(Math.round(occ*100)/100),
        adr:grow(baseAdr),
        fbRevenue:grow(baseFb),
        otherRevenue:grow(baseOther),
        operatingCosts:grow(baseCosts)
      };
    });
    setForm(prev=>{
      const monthlyWithDetails=monthly.map((row,i)=>({...row,agDetails:prev.forecast.monthly[i]?.agDetails||{},modDetails:prev.forecast.monthly[i]?.modDetails||{},fbDetails:prev.forecast.monthly[i]?.fbDetails||{},roomDivisionDetails:prev.forecast.monthly[i]?.roomDivisionDetails||{},pomecDetails:prev.forecast.monthly[i]?.pomecDetails||{}}));
      const sameMonthly=prev.forecast.monthly.length===monthlyWithDetails.length&&prev.forecast.monthly.every((r,i)=>r.label===monthlyWithDetails[i].label&&r.occupancy===monthlyWithDetails[i].occupancy&&r.adr===monthlyWithDetails[i].adr&&r.fbRevenue===monthlyWithDetails[i].fbRevenue&&r.otherRevenue===monthlyWithDetails[i].otherRevenue&&r.operatingCosts===monthlyWithDetails[i].operatingCosts);
      const sameAnnual=prev.forecast.annual.length===annual.length&&prev.forecast.annual.every((r,i)=>r.label===annual[i].label&&r.days===annual[i].days&&r.rooms===annual[i].rooms&&r.occupancy===annual[i].occupancy&&r.adr===annual[i].adr&&r.fbRevenue===annual[i].fbRevenue&&r.otherRevenue===annual[i].otherRevenue&&r.operatingCosts===annual[i].operatingCosts);
      if(sameMonthly&&sameAnnual)return prev;
      return {...prev,forecast:{monthly,annual}};
    });
  },[forecastSource,form.yearStart,form.statistics.rooms]);
  const revenueActual=totalColumn(["roomRevenue","fbRevenue","otherRevenue"],form.accounts,"actual",allAccountLines);
  const revenueBudget=totalColumn(["roomRevenue","fbRevenue","otherRevenue"],form.accounts,"budget",allAccountLines);
  const revenueLastYear=totalColumn(["roomRevenue","fbRevenue","otherRevenue"],form.accounts,"lastYear",allAccountLines);
  const costActual=totalColumn(["costOfSales","payroll","operatingExpenses","overhead"],form.accounts,"actual",allAccountLines);
  const costBudget=totalColumn(["costOfSales","payroll","operatingExpenses","overhead"],form.accounts,"budget",form.accountLines);
  const costLastYear=totalColumn(["costOfSales","payroll","operatingExpenses","overhead"],form.accounts,"lastYear",allAccountLines);
  const ytdRevenueActual=totalColumn(["roomRevenue","fbRevenue","otherRevenue"],form.accounts,"ytdActual",allAccountLines);
  const ytdRevenueBudget=totalColumn(["roomRevenue","fbRevenue","otherRevenue"],form.accounts,"ytdBudget",allAccountLines);
  const ytdRevenueLastYear=totalColumn(["roomRevenue","fbRevenue","otherRevenue"],form.accounts,"lastYearYtd",allAccountLines);
  const ytdCostActual=totalColumn(["costOfSales","payroll","operatingExpenses","overhead"],form.accounts,"ytdActual",allAccountLines);
  const ytdCostBudget=totalColumn(["costOfSales","payroll","operatingExpenses","overhead"],form.accounts,"ytdBudget",form.accountLines);
  const ytdCostLastYear=totalColumn(["costOfSales","payroll","operatingExpenses","overhead"],form.accounts,"lastYearYtd",allAccountLines);
  const departmentMatches=(line:AccountLine,department:string)=>{
    const label=(line.label+" "+line.section).toLowerCase();
    if(department==="all")return true;
    if(department==="room")return line.group==="roomRevenue"||label.includes("room department")||label.includes("front office")||label.includes("housekeeping");
    if(department==="fb")return line.group==="fbRevenue"||label.includes("f&b department")||label.includes("food & beverage");
    if(department==="ag")return label.includes("administrative & general")||label.includes("a&g");
    if(department==="hrd")return label.includes("human resources")||label.includes("hrd")||label.includes("recruitment")||label.includes("training")||label.includes("employee benefits")||label.includes("meal allowance")||label.includes("medical & insurance")||label.includes("jamsostek")||label.includes("pension")||label.includes("temporary staff")||label.includes("th r")||label.includes("salary & wages")&&line.code.startsWith("606");
    if(department==="sm")return label.includes("sales & marketing")||label.includes("s&m");
    if(department==="pomec")return label.includes("engineering")||label.includes("energy cost")||label.includes("electricity")||label.includes("water")||label.includes("gas & fuel")||label.includes("repairs & maintenance")||label.includes("tools & supplies")||label.includes("contract services");
    return true;
  };
  const filteredLines=useMemo(()=>(pnlDepartment==="room"||pnlDepartment==="fb"||pnlDepartment==="mod")?[]:allAccountLines.filter(line=>departmentMatches(line,pnlDepartment)&&(line.code+" "+line.label+" "+line.section).toLowerCase().includes(search.toLowerCase())),[search,allAccountLines,pnlDepartment]);
  const selectedSaved=reports.find(r=>r.id===selectedReport);
  const updateStats=(key:keyof Statistics,value:string)=>setForm(prev=>({...prev,statistics:{...prev.statistics,[key]:value}}));
  const updateRoomDivision=(monthIndex:number,key:string,value:string)=>setForm(prev=>({...prev,forecast:{...prev.forecast,monthly:prev.forecast.monthly.map((row,i)=>i===monthIndex?{...row,roomDivisionDetails:{...(row.roomDivisionDetails||{}),[key]:value}}:row)}}));
  const updateModDetail=(monthIndex:number,key:string,value:string)=>setForm(prev=>({...prev,forecast:{...prev.forecast,monthly:prev.forecast.monthly.map((row,i)=>{if(i!==monthIndex)return row;const details={...(row.modDetails||{}),[key]:value};const sum=(keys:string[])=>{const vals=keys.map(k=>details[k]===undefined||details[k]===""?null:Number(details[k])).filter((v):v is number=>v!==null&&Number.isFinite(v));return vals.length?String(vals.reduce((a,b)=>a+b,0)):"";};return {...row,modDetails:details,otherRevenue:sum(["rentCarRevenue","laundryRevenue"]),modCostOfSales:sum(["laundryCost"]),modPayroll:sum(["salaryWages","incomeTax","jamsostek","insurance","bonus","mealAllowances","payrollOthers"]),modOtherExpenses:sum(["guestSupplies","paperSupplies","laundryValetSupplies","laundrySupplies","casual","cleaningSupplies","printingStationery","decoration","telephoneFax","laundryExpense","casualOther","laundryValetOther","cleaningOther","provisionUniform","pteb","uniform","otherExpenses"])};})}}));

  const updateModRevenueName=(key:"rentCarLabel"|"laundryLabel",value:string)=>setForm(prev=>({...prev,forecast:{...prev.forecast,monthly:prev.forecast.monthly.map(row=>({...row,modDetails:{...(row.modDetails||{}),[key]:value}}))}}));
  const updateMeta=(key:"hotelName"|"period"|"yearStart"|"notes"|"actionRecommendation"|"actionOwner"|"actionDue"|"actionTarget"|"actionStatus"|"actionProgress",value:string)=>setForm(prev=>({...prev,[key]:value}));
  const updateAccount=(code:string,column:keyof AccountValue,value:string)=>setForm(prev=>({...prev,accounts:{...prev.accounts,[code]:{...(prev.accounts[code]||{actual:"",budget:"",lastYear:"",ytdActual:"",ytdBudget:"",lastYearYtd:""}),[column]:value}}}));
  const updateAllocation=(section:string,value:string)=>setForm(prev=>({...prev,budgetAllocations:{parentPercentBySection:{...(prev.budgetAllocations?.parentPercentBySection||{}),[section]:value},childPercentByCode:prev.budgetAllocations?.childPercentByCode||{}}}));
  const revenueTotalKey="__revenueAllOutletTotal";
  const revenueGroupPercentKey=(group:string)=>"__revenueGroupPercent_"+group;
  const applyRevenueGroup=(group:AccountGroup,enteredPercent?:string)=>{
    const percentText=enteredPercent??form.budgetAllocations?.parentPercentBySection?.[revenueGroupPercentKey(group)]??"";
    const percent=optional(percentText);
    if(percent===null||percent<0||percent>100){setMessage("Isi persentase sub-induk Revenue antara 0 dan 100%.");return;}
    const total=optional(form.budgetAllocations?.parentPercentBySection?.[revenueTotalKey]||"");
    if(total===null||total<=0){setMessage("Isi Total Revenue Budget — All Outlet di bagian atas terlebih dahulu.");return;}
    const percentMap=form.budgetAllocations?.parentPercentBySection||{};
    const groups:AccountGroup[]=["roomRevenue","fbRevenue","otherRevenue"];
    const sumOther=groups.filter(g=>g!==group).reduce((sum,g)=>sum+(optional(percentMap[revenueGroupPercentKey(g)])??0),0);
    if(sumOther+percent>100.000001){setMessage("Total persentase sub-induk Revenue tidak boleh melebihi 100%. Periksa persentase outlet lainnya.");return;}
    const target=Math.round(total*percent/100);
    const lines=allAccountLines.filter(line=>line.group===group);
    if(!lines.length){setMessage("Tidak ditemukan akun untuk sub-induk "+GROUP_LABELS[group]+".");return;}
    const budgetKey:keyof AccountValue=pnlView==="month"?"budget":"ytdBudget";
    const weightFor=(line:AccountLine)=>optional(form.accounts[line.code]?.[budgetKey]||"")??optional(form.accounts[line.code]?.[pnlView==="month"?"lastYear":"lastYearYtd"]||"")??optional(form.accounts[line.code]?.[pnlView==="month"?"actual":"ytdActual"]||"")??0;
    const percentMapByCode=form.budgetAllocations?.childPercentByCode||{};
    const enteredChildPercents=lines.map(line=>optional(percentMapByCode[line.code]||""));
    const hasChildPercents=enteredChildPercents.some(v=>v!==null);
    const childPercentTotal=enteredChildPercents.reduce<number>((sum,v)=>sum+(v??0),0);
    const weights=lines.map(weightFor);
    const totalWeight=weights.reduce((sum,w)=>sum+Math.max(0,w),0);
    const benchmarkShares:Record<string,number>=group==="fbRevenue"
      ?{"41201":42,"41202":13,"41203":20,"41204":15,"41205":10,"41206":0}
      :group==="otherRevenue"
      ?{"41301":5,"41302":10,"41303":10,"41304":15,"41305":2,"41306":8,"41307":20,"41308":30,"41309":0}
      :{};
    const useBenchmark=lines.length>1&&!hasChildPercents;
    if(lines.length>1&&hasChildPercents&&enteredChildPercents.some(v=>v===null)){
      setMessage("Lengkapi persentase semua akun anak pada sub-induk "+GROUP_LABELS[group]+".");
      return;
    }
    if(lines.length>1&&hasChildPercents&&Math.abs(childPercentTotal-100)>0.01){
      setMessage("Total persentase akun anak untuk "+GROUP_LABELS[group]+" harus tepat 100% (saat ini "+fmt(childPercentTotal)+"%).");
      return;
    }
    if(useBenchmark){
      const benchmarkTotal=lines.reduce((sum,line)=>sum+(benchmarkShares[line.code]??0),0);
      if(Math.abs(benchmarkTotal-100)>0.01){
        setMessage("Distribusi awal akun anak belum lengkap untuk "+GROUP_LABELS[group]+". Periksa kode akun dan persentase benchmark.");
        return;
      }
    }
    const effectiveShares=lines.map((line,index)=>hasChildPercents?(enteredChildPercents[index]??0)/100:useBenchmark?(benchmarkShares[line.code]??0)/100:lines.length===1?1:totalWeight>0?Math.max(0,weights[index])/totalWeight:0);
    let allocated=0;
    const amounts=lines.map((line,index)=>{
      const amount=index===lines.length-1?target-allocated:Math.round(target*effectiveShares[index]);
      allocated+=amount;
      return [line.code,amount] as const;
    });
    setForm(prev=>({...prev,accounts:{...prev.accounts,...Object.fromEntries(amounts.map(([code,amount])=>[code,{...(prev.accounts[code]||{actual:"",budget:"",lastYear:"",ytdActual:"",ytdBudget:"",lastYearYtd:""}),[budgetKey]:String(amount)}]))},budgetAllocations:{parentPercentBySection:prev.budgetAllocations?.parentPercentBySection||{},childPercentByCode:{...(prev.budgetAllocations?.childPercentByCode||{}),...(useBenchmark?Object.fromEntries(lines.map((line,index)=>[line.code,String(Math.round(effectiveShares[index]*10000)/100)])): {})}}}));
    const method=hasChildPercents?"persentase akun anak yang Anda tetapkan":useBenchmark?"distribusi awal benchmark yang dapat diedit":totalWeight>0?"komposisi Budget/Last Year/Actual yang tersedia":"satu akun langsung";
    setMessage("Sub-induk "+GROUP_LABELS[group]+" ditetapkan "+percent+"% dari Total Revenue All Outlet ("+money(target)+"). Pembagian memakai "+method+". Actual dan Last Year tidak diubah.");
  };
  const applySectionAllocation=(section:string, enteredPercent?:string)=>{
    const sectionLines=allAccountLines.filter(line=>line.section===section);
    const parentPct=optional(enteredPercent ?? form.budgetAllocations?.parentPercentBySection?.[section] ?? "");
    if(parentPct===null||parentPct<0||parentPct>100){setMessage("Isi persentase akun induk antara 0 dan 100%.");return;}
    if(!sectionLines.length){setMessage("Tidak ada akun anak untuk dibagikan pada "+section+".");return;}
    const allocationBase=pnlView==="month"?revenueBudget:ytdRevenueBudget;
    if(allocationBase===null||allocationBase<=0){setMessage("Isi Budget Revenue pada periode yang dipilih terlebih dahulu.");return;}
    const parentAmount=allocationBase*parentPct/100;
    const budgetKey:keyof AccountValue=pnlView==="month"?"budget":"ytdBudget";
    const actualKey:keyof AccountValue=pnlView==="month"?"actual":"ytdActual";
    const lastYearKey:keyof AccountValue=pnlView==="month"?"lastYear":"lastYearYtd";
    const val=(code:string,key:keyof AccountValue)=>optional(form.accounts[code]?.[key]||"");
    // Use positive existing values as the preferred distribution weights. Empty/zero
    // Budget cells must not block fallback to Last Year or Actual.
    const positiveValue=(...values:(number|null)[])=>values.find(value=>value!==null&&value>0)??0;
    let weights=sectionLines.map(line=>positiveValue(val(line.code,budgetKey),val(line.code,lastYearKey),val(line.code,actualKey)));
    let allocationMethod="proporsi Budget, Last Year, atau Actual";
    if(section==="Cost of Sales"){
      // Cost of Sales children follow their matching revenue departments first.
      const positiveGroupValue=(group:AccountGroup)=>{
        const candidates=[
          sumGroup(form.accounts,group,budgetKey,allAccountLines),
          sumGroup(form.accounts,group,lastYearKey,allAccountLines),
          sumGroup(form.accounts,group,actualKey,allAccountLines),
        ];
        return candidates.find(value=>value!==null&&value>0)??0;
      };
      const fnb=positiveGroupValue("fbRevenue");
      const other=positiveGroupValue("otherRevenue");
      if(fnb+other>0){
        weights=sectionLines.map(line=>line.code==="51101"?fnb:line.code==="51201"?other:0);
        allocationMethod="proporsi F&B Revenue dan Other Operating Revenue";
      }
    }
    let totalWeight=weights.reduce((sum,weight)=>sum+Math.max(0,weight),0);
    // Make parent percentage work even for a brand-new budget with no historical
    // child values. Equal split is only an initialization; users can edit each child.
    if(totalWeight<=0){
      weights=sectionLines.map(()=>1);
      totalWeight=weights.length;
      allocationMethod="pembagian awal merata karena belum ada data pembobot";
    }
    let allocated=0;
    const amounts=sectionLines.map((line,index)=>{const amount=index===sectionLines.length-1?Math.round(parentAmount)-allocated:Math.round(parentAmount*Math.max(0,weights[index])/totalWeight);allocated+=amount;return [line.code,amount] as const;});
    setForm(prev=>({...prev,accounts:{...prev.accounts,...Object.fromEntries(amounts.map(([code,amount])=>[code,{...(prev.accounts[code]||{actual:"",budget:"",lastYear:"",ytdActual:"",ytdBudget:"",lastYearYtd:""}),[budgetKey]:String(amount)}]))}}));
    setMessage("Budget induk "+parentPct+"% ("+money(Math.round(parentAmount))+") berhasil dialokasikan ke "+sectionLines.length+" akun pada "+section+" menggunakan "+allocationMethod+". Angka akhir disesuaikan agar total tepat; nominal tiap akun anak tetap bisa diedit manual. Actual dan Last Year tidak berubah.");
  };
  const updateMonth=(index:number,key:keyof Omit<ForecastMonth,"label">,value:string)=>setForm(prev=>({...prev,forecast:{...prev.forecast,monthly:prev.forecast.monthly.map((r,i)=>i===index?{...r,[key]:value}:r)}}));
  const updateFbDetail=(monthIndex:number,key:string,value:string)=>setForm(prev=>({...prev,forecast:{...prev.forecast,monthly:prev.forecast.monthly.map((row,i)=>{if(i!==monthIndex)return row;const details={...(row.fbDetails||{}),[key]:value};const sum=(keys:string[])=>{const vals=keys.map(k=>details[k]===undefined||details[k]===""?null:Number(details[k])).filter((v):v is number=>v!==null&&Number.isFinite(v));return vals.length?String(vals.reduce((a,b)=>a+b,0)):"";};return {...row,fbDetails:details,fbRevenue:sum(["foodRevenue","beverageRevenue"]),fbCostOfSales:sum(["foodCost","beverageCost"]),fbPayroll:sum(["salaryWages","incomeTax","jamsostek","insurance","thr","mealAllowances"]),fbOtherExpenses:sum(["decoration","duesSubscription","extermDisinfectant","kitchenFuel","laundry","miscellaneous","spoilage","cleaningSupplies","guestSupplies","printingStationery","telephone","uniform","utensil","contractCleaning"])};})}}));
  const updateAgDetail=(monthIndex:number,key:string,value:string)=>setForm(prev=>({...prev,forecast:{...prev.forecast,monthly:prev.forecast.monthly.map((row,i)=>{if(i!==monthIndex)return row;const details={...(row.agDetails||{}),[key]:value};const sum=(keys:string[])=>{const vals=keys.map(k=>details[k]===undefined||details[k]===""?null:Number(details[k])).filter((v):v is number=>v!==null&&Number.isFinite(v));return vals.length?String(vals.reduce((a,b)=>a+b,0)):"";};return {...row,agDetails:details,agPayroll:sum(["salaryWages","incomeTax","jamsostek","insurance","bonusProvision","mealAllowances"]),agOtherExpenses:sum(["bankCharges","donation","duesTradeAssoc","entertainment","laundryUniforms","postageCourier","printingStationery","licenceInspection","transportation","travelling","telephone","creditCardCommission","companyHousing","auditBrand","contractService","payrollSystem","pmsHotelindo","edp","provisionUniform","others"])};})}}));
    const updatePomecDetail=(monthIndex:number,key:string,value:string)=>setForm(prev=>({...prev,forecast:{...prev.forecast,monthly:prev.forecast.monthly.map((row,i)=>i===monthIndex?{...row,pomecDetails:{...(row.pomecDetails||{}),[key]:value}}:row)}}));
  const updateYear=(index:number,key:keyof Omit<ForecastYear,"label">,value:string)=>setForm(prev=>({...prev,forecast:{...prev.forecast,annual:prev.forecast.annual.map((r,i)=>i===index?{...r,[key]:value}:r)}}));

  const inputClass="w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100";
  const field=(label:string,value:string,onChange:(value:string)=>void,options:{type?:string;hint?:string;min?:string;step?:string;placeholder?:string}={})=>(
    <label className="block min-w-0">
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</span>
      <input className={inputClass} type={options.type||"text"} value={value} onChange={e=>onChange(e.target.value)} min={options.min} step={options.step||"any"} placeholder={options.placeholder||"Isi sesuai sumber"} />
      {options.hint&&<span className="mt-1 block text-xs leading-5 text-slate-500">{options.hint}</span>}
    </label>
  );
  const statField=(key:keyof Statistics,label:string,hint?:string)=>field(label,form.statistics[key],v=>updateStats(key,v),{type:"number",min:"0",hint,step:key==="days"||key==="rooms"?"1":"any"});
  const parseAmountInput=(value:string)=>{const trimmed=value.trim();if(!trimmed)return "";const normalized=trimmed.replace(/\s/g,"").replace(/\./g,"").replace(",",".").replace(/[^0-9.-]/g,"");return normalized==="-"||normalized==="."?"":normalized;};
  const displayAmountInput=(value:string)=>{if(value.trim()==="")return "";const n=Number(value);return Number.isFinite(n)?new Intl.NumberFormat("id-ID",{maximumFractionDigits:2,useGrouping:true}).format(n):value;};
  const numberInput=(value:string,onChange:(v:string)=>void,placeholder="—",allowNegative=false)=><input type="text" inputMode="decimal" min={allowNegative?undefined:"0"} className="w-28 rounded-lg border border-slate-200 bg-white px-2 py-2 text-right text-xs tabular-nums outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 sm:w-32" value={displayAmountInput(value)} onChange={e=>onChange(parseAmountInput(e.target.value))} placeholder={placeholder} />;

  async function saveFinal(){
    setMessage("");setIssues([]);setWarnings([]);setSummary("");setOrchestrator("checking");
    if(!form.hotelName.trim()||!form.period.trim()){setOrchestrator("failed");setIssues(["Nama hotel dan periode wajib diisi."]);setMessage("Lengkapi identitas laporan terlebih dahulu.");return;}
    setSaving(true);
    try{
      const headers:Record<string,string>={"Content-Type":"application/json"};if(accessToken)headers.Authorization="Bearer "+accessToken;
      const response=await fetch("/api/hotel-budget/final-reports",{method:"POST",headers,body:JSON.stringify({form})});
      const raw=await response.text();let data:any={};
      try{data=raw?JSON.parse(raw):{};}catch{throw new Error("Respons server tidak valid. Data tetap berada di form dan belum disimpan.");}
      if(!response.ok||data.passed!==true){
        setOrchestrator("failed");setIssues(Array.isArray(data.issues)&&data.issues.length?data.issues:[data.error||"Validasi final belum lolos."]);setWarnings(data.warnings||[]);setMessage(data.error||"Validasi final gagal. Laporan belum disimpan.");return;
      }
      setOrchestrator("passed");setWarnings(data.warnings||[]);setSummary(data.summary||"");setSelectedReport(data.report.id);
      if(data.report.storage==="local"){
        const localReport={...data.report,form_data:form};
        const existingLocal=reports.filter(r=>String(r.id).startsWith("local-")&&r.id!==localReport.id);
        const allLocal=[localReport,...existingLocal];
        window.localStorage.setItem(LOCAL_REPORTS_KEY,JSON.stringify(allLocal));
        setReports([...allLocal,...reports.filter(r=>!String(r.id).startsWith("local-"))]);
        setMessage("Laporan lolos pemeriksaan matematis dan AI Orchestrator, lalu tersimpan di browser/perangkat ini. Data tidak masuk ke database akun.");
      } else {
        setMessage("Laporan lolos pemeriksaan matematis dan AI Orchestrator, lalu tersimpan pada akun Anda.");
        await loadReports(accessToken);
      }
    }catch(e){setOrchestrator("failed");setIssues([e instanceof Error?e.message:"Validasi final gagal."]);setMessage("Laporan belum disimpan. Data tetap berada di form; coba kembali setelah masalah teratasi.");}
    finally{setSaving(false);}
  }

  function openSaved(report:SavedReport){
    if(report?.form_data){const year=Number(report.form_data.yearStart||2027);const savedForecast=report.form_data.forecast||makeBlank().forecast;setForm({...makeBlank(),...report.form_data,statistics:{...makeBlank().statistics,...(report.form_data.statistics||{})},forecast:{monthly:makeMonthly(year).map((blank,i)=>({...blank,...(savedForecast.monthly?.[i]||{}),label:monthNames[i]+" "+year})),annual:makeAnnual(year).map((blank,i)=>({...blank,...(savedForecast.annual?.[i]||{}),label:String(year+i)}))},accounts:{...emptyAccounts(),...(report.form_data.accounts||{})},accountLines:report.form_data.accountLines||[...ACCOUNT_LINES,...(report.form_data.customAccounts||[])],customAccounts:report.form_data.customAccounts||[]});setSelectedReport(report.id);setOrchestrator("passed");setWarnings(report.validation_data?.warnings||[]);setSummary(report.validation_data?.summary||"");setMessage("Laporan tersimpan dibuka. Perubahan pada form belum tersimpan sampai Anda menjalankan validasi dan simpan lagi.");setIssues([]);}
  }
  async function deleteSaved(report:SavedReport){
    if(String(report.id).startsWith("local-")){
      if(!window.confirm("Hapus laporan lokal "+report.hotel_name+" — "+report.period_label+"? Tindakan ini tidak dapat dibatalkan."))return;
      const next=reports.filter(r=>r.id!==report.id);const nextLocal=next.filter(r=>String(r.id).startsWith("local-"));
      window.localStorage.setItem(LOCAL_REPORTS_KEY,JSON.stringify(nextLocal));setReports(next);if(selectedReport===report.id){if(next[0])openSaved(next[0]);else setSelectedReport("");}setMessage("Laporan lokal dihapus dari browser ini.");return;
    }
    if(!accessToken||!window.confirm("Hapus laporan "+report.hotel_name+" — "+report.period_label+"? Tindakan ini tidak dapat dibatalkan."))return;
    try{
      const response=await fetch("/api/hotel-budget/final-reports?id="+encodeURIComponent(report.id),{method:"DELETE",headers:{Authorization:"Bearer "+accessToken}});
      const data=await response.json();if(!response.ok)throw new Error(data.error||"Laporan gagal dihapus.");
      const rest=reports.filter(r=>r.id!==report.id);setReports(rest);if(selectedReport===report.id){if(rest[0])openSaved(rest[0]);else setSelectedReport("");}setMessage("Laporan berhasil dihapus dari akun Anda.");
    }catch(e){setMessage(e instanceof Error?e.message:"Laporan gagal dihapus.");}
  }

  function downloadExcel(){
    const statRows=[
      ["Hotel",form.hotelName],["Periode",form.period],["Days in Period",optional(form.statistics.days)],["# OF ROOMS",optional(form.statistics.rooms)],["EXCHANGE RATE US $ TO RP",optional(form.statistics.exchangeRate)],["AVERAGE SELLING RATE (RP)",optional(form.statistics.averageSellingRate)],
      ["Total Room Build",values.totalRoomBuild],["Out of Inventory",optional(form.statistics.outInventory)],["House Use",optional(form.statistics.houseUse)],
      ["Out of Order",optional(form.statistics.outOfOrder)],["ROOM AVAILABLE",values.roomAvailable],["OCCUPIED ROOMS",optional(form.statistics.complimentary)!==null&&optional(form.statistics.roomPaid)!==null?optional(form.statistics.complimentary)!+optional(form.statistics.roomPaid)!:null],["Complimentary Room Nights",optional(form.statistics.complimentary)],
      ["Paid Room Nights",optional(form.statistics.roomPaid)],["OCCUPANCY (%)",values.occupancy??optional(form.statistics.occupancy)],["AVERAGE ROOM RATE (RP)",values.adr],["REVPAR",values.revpar],
      ["Total Revenue — akun terisi",values.revenue],["Total Operating Cost — akun terisi",values.costs],["GOP — estimasi akun terisi",values.gop],
      ["GOP Margin (%)",values.gopMargin],["YTD Total Revenue",values.ytdRevenue],["YTD Budget Revenue",values.ytdBudgetRevenue],["YTD Revenue Variance",values.ytdRevenue!==null&&values.ytdBudgetRevenue!==null?values.ytdRevenue-values.ytdBudgetRevenue:null],["YTD Operating Cost",values.ytdCosts],["YTD Budget Cost",ytdCostBudget],["YTD Cost Variance",values.ytdCosts!==null&&ytdCostBudget!==null?values.ytdCosts-ytdCostBudget:null],["YTD GOP",values.ytdGop],["YTD GOP Margin (%)",values.ytdGopMargin],["YTD Owner Share Profit — before tax",values.ytdOwnerShareProfitBeforeTax],["YTD Net Owner Profit",values.ytdNetProfit],["Other Income",values.otherIncome],["Other Expenses & Below GOP",values.otherExpenses],["Owner Share Profit — sebelum pajak",values.ownerShareProfitBeforeTax],["Net Owner Profit — estimasi",values.netProfit],["Owner Cash After CapEx — perlu data arus kas",values.ownerCashAfterCapex],
      ["Catatan",form.notes],["Rekomendasi / Tindakan",form.actionRecommendation],["PIC",form.actionOwner],["Deadline",form.actionDue],["Target",form.actionTarget],["Status",form.actionStatus],["Progress (%)",optional(form.actionProgress)]
    ];
    const pnlRows:any[][]=[["Account Code","Account / Description","Section","Actual","Actual %","Budget","Budget %","Variance Actual − Budget","Variance %","Last Year Same Month","Variance Actual − Last Year","Variance % LY","YTD Actual","YTD Actual %","YTD Budget","YTD Budget %","YTD Variance A−B","YTD Variance %","Last Year YTD","YTD Variance A−LY","YTD Variance % LY"]];
    for(const line of allAccountLines){
      const row=form.accounts[line.code]||{actual:"",budget:"",lastYear:"",ytdActual:"",ytdBudget:"",lastYearYtd:""};
      const a=optional(row.actual),b=optional(row.budget),l=optional(row.lastYear),ya=optional(row.ytdActual),yb=optional(row.ytdBudget),yl=optional(row.lastYearYtd);
      const variance=a!==null&&b!==null?a-b:null, varianceLastYear=a!==null&&l!==null?a-l:null;
      const ytdVariance=ya!==null&&yb!==null?ya-yb:null, ytdVarianceLastYear=ya!==null&&yl!==null?ya-yl:null;
      pnlRows.push([line.code,line.label,line.section,a,percentNumber(a,revenueActual),b,percentNumber(b,revenueBudget),variance,percentNumber(variance,b),l,varianceLastYear,percentNumber(varianceLastYear,l),ya,percentNumber(ya,ytdRevenueActual),yb,percentNumber(yb,ytdRevenueBudget),ytdVariance,percentNumber(ytdVariance,yb),yl,ytdVarianceLastYear,percentNumber(ytdVarianceLastYear,yl)]);
    }
    const monthlyRows:any[][]=[["Month","Days","Occupancy (%)","ADR / ARR","Room Revenue (calculated)","F&B Revenue","Other Revenue","Total Revenue","Operating Costs","GOP / Contribution"]];
    form.forecast.monthly.forEach((row,i)=>{const c=calcMonthly(row,Number(form.yearStart),i,form.statistics.rooms);monthlyRows.push([row.label,c.days,optional(row.occupancy),optional(row.adr),c.roomRevenue,optional(row.fbRevenue),optional(row.otherRevenue),c.revenue,optional(row.operatingCosts),c.gop]);});
    const annualRows:any[][]=[["Year","Days","Rooms","Occupancy (%)","ADR / ARR","Room Revenue (calculated)","F&B Revenue","Other Revenue","Total Revenue","Operating Costs","GOP / Contribution"]];
    form.forecast.annual.forEach(row=>{const c=calcAnnual(row);annualRows.push([row.label,optional(row.days),optional(row.rooms),optional(row.occupancy),optional(row.adr),c.roomRevenue,optional(row.fbRevenue),optional(row.otherRevenue),c.revenue,optional(row.operatingCosts),c.gop]);});
    const workbook=XLSX.utils.book_new();
    const add=(name:string,rows:any[][],widths:number[])=>{const ws=XLSX.utils.aoa_to_sheet(rows);ws["!cols"]=widths.map(w=>({wch:w}));ws["!freeze"]={xSplit:0,ySplit:1};ws["!autofilter"]={ref:ws["!ref"]||"A1"};XLSX.utils.book_append_sheet(workbook,ws,name);};
    add("Summary",[[ "CORESTAY ADVISORY — HOTEL BUDGET & P&L"],["Hotel",form.hotelName],["Period",form.period],[],["Metric","Value"],...statRows],[38,30]);
    add("Account P&L",pnlRows,[14,38,30,18,12,18,12,22,12,22,24,12,18,12,18,12,20,12,20,20,12]);
    add("Monthly Forecast",monthlyRows,[22,10,16,18,22,20,20,22,22,22]);
    add("10-Year Forecast",annualRows,[14,10,10,16,18,24,20,20,22,22,22]);
    const output=XLSX.write(workbook,{bookType:"xlsx",type:"array"});
    const url=URL.createObjectURL(new Blob([output],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}));
    const a=document.createElement("a");a.href=url;a.download="CoreStay-Hotel-Budget-PnL-"+(form.period||"report").replace(/[^a-z0-9-_]+/gi,"-")+".xlsx";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }

  const tabItems=[
    {id:"statistics",label:"Budget & Statistics",sub:"Identitas hotel dan kapasitas",color:"from-sky-500 to-blue-600",icon:"🏨",detail:"Mulai dari profil hotel, periode, kapasitas kamar, dan statistik operasional."},
    {id:"pnl",label:"Budget P&L",sub:"Revenue dan biaya dept",color:"from-violet-500 to-purple-600",icon:"📊",detail:"Isi akun Actual, Budget, Last Year, dan YTD. Ringkasan dihitung otomatis dari data yang terisi."},
    {id:"forecast",label:"Monthly & Annual Forecast",sub:"Proyeksi 12 bulan & 10 tahun",color:"from-teal-500 to-emerald-600",icon:"📈",detail:"Bangun proyeksi berdasarkan hari, kamar, okupansi, ADR, pendapatan lain, dan biaya."},
    {id:"variance",label:"Variance & Exception Report",sub:"Analisis selisih",color:"from-amber-500 to-orange-600",icon:"🔎",detail:"Temukan selisih Actual vs Budget dan Last Year, termasuk perbandingan YTD."},
    {id:"action-plan",label:"Management Action Plan",sub:"PIC, target, tenggat",color:"from-pink-500 to-rose-600",icon:"🎯",detail:"Ubah temuan menjadi tindakan terukur dengan penanggung jawab dan deadline."},
    {id:"export",label:"Export PDF & Excel",sub:"Validasi dan laporan akhir",color:"from-indigo-500 to-blue-700",icon:"📄",detail:"Tinjau ringkasan, jalankan validasi final, lalu cetak PDF atau unduh Excel."}
  ];
  const sectionIndex=tabItems.findIndex(x=>x.id===activeTab);
  const sectionLabel=tabItems.find(x=>x.id===activeTab)?.label||tabItems[0].label;
  const goNextStep=()=>{
    let problem="";
    if(activeTab==="statistics"){
      if(!form.hotelName.trim()||!form.period.trim()) problem="Isi Nama hotel dan Periode laporan sebelum melanjutkan.";
      else if(!form.statistics.days.trim()||!form.statistics.rooms.trim()) problem="Isi No. of Days dan No. of Room Build sebelum melanjutkan.";
    } else if(activeTab==="pnl"){
      // Budget P&L is intentionally blank while its revenue and department expense formats are rebuilt.
    } else if(activeTab==="forecast"){
      // Forecast is generated from Budget P&L and hotel statistics; no manual forecast input is required.
    }
    if(problem){setIssues([problem]);setMessage(problem);return;}
    setIssues([]);setMessage("");
    setActiveTab(tabItems[Math.min(sectionIndex+1,tabItems.length-1)].id);
    if(sectionIndex===tabItems.length-2) window.scrollTo({top:0,behavior:"smooth"});
  };
  const goPreviousStep=()=>{setIssues([]);setMessage("");setActiveTab(tabItems[Math.max(sectionIndex-1,0)].id);};
  const roomStats=[
    ["# OF ROOMS",optional(form.statistics.rooms)],["ROOM AVAILABLE",values.roomAvailable],
    ["OCCUPIED ROOMS",optional(form.statistics.complimentary)!==null&&optional(form.statistics.roomPaid)!==null?optional(form.statistics.complimentary)!+optional(form.statistics.roomPaid)!:null],["OCCUPANCY (%)",values.occupancy],["AVERAGE ROOM RATE (RP)",values.adr],["REVPAR",values.revpar]
  ] as [string,number|null][];
  const metric=(label:string,value:string,detail?:string)=><div key={label} className="min-w-0 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"><p className="text-xs font-semibold text-slate-500">{label}</p><p className="mt-1 break-words text-lg font-black tabular-nums text-slate-900">{value}</p>{detail&&<p className="mt-1 text-[11px] leading-4 text-slate-500">{detail}</p>}</div>;

  return <main className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-violet-50 px-3 pb-12 pt-20 text-slate-900 sm:px-6 lg:px-8 lg:pt-8">
    <div className="mx-auto max-w-[1500px]">
      <header className="mb-6 overflow-hidden rounded-[28px] bg-gradient-to-r from-[#173b67] via-[#245b8c] to-[#6554b7] p-5 text-white shadow-xl sm:p-8">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div><p className="mb-2 text-xs font-bold uppercase tracking-[.2em] text-sky-100">CORESTAY ADVISORY · HOTEL FINANCE WORKSPACE</p><h1 className="text-2xl font-black tracking-tight sm:text-4xl">Hotel Budget &amp; P&amp;L</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-blue-50">Satu workspace untuk statistik hotel, rincian akun P&amp;L, perbandingan Actual vs Budget vs Last Year, proyeksi, dan tindakan manajemen.</p></div>
          <div className="min-w-[190px] rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur"><p className="text-xs text-blue-100">Status final validation</p><p className="mt-1 font-bold">{orchestrator==="passed"?"Lolos & tersimpan":orchestrator==="checking"?"Memvalidasi…":orchestrator==="failed"?"Perlu diperiksa":"Belum divalidasi"}</p><p className="mt-1 text-[11px] text-blue-100">{authStatus==="checking"?"Memeriksa sesi login":authStatus==="authenticated"?"Akun terhubung":"Bisa digunakan tanpa login"}</p></div>
        </div>
      </header>

      <section className="mb-6 rounded-2xl border border-white bg-white/90 p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="min-w-0 flex-1"><label className="mb-1.5 block text-sm font-bold text-slate-700">Laporan tersimpan di akun</label><select className={inputClass} value={selectedReport} onChange={e=>{const id=e.target.value;setSelectedReport(id);const report=reports.find(r=>r.id===id);if(report)openSaved(report);}} disabled={loadingReports||reports.length===0}><option value="">{loadingReports?"Memuat laporan…":reports.length?"Pilih laporan tersimpan":"Belum ada laporan tersimpan"}</option>{reports.map(r=><option key={r.id} value={r.id}>{r.hotel_name} — {r.period_label} ({new Date(r.created_at).toLocaleDateString("id-ID")})</option>)}</select></div>
          {selectedSaved&&<button type="button" onClick={()=>void deleteSaved(selectedSaved)} className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700 hover:bg-rose-100">Hapus laporan terpilih</button>}
        </div>
        <p className="mt-2 text-xs leading-5 text-slate-500">Tanpa login, laporan final disimpan hanya di browser/perangkat ini. Jika login, laporan tersimpan di akun Anda dan tidak dapat diakses oleh akun lain.</p>
      </section>

      <nav className="mb-6" aria-label="Urutan tahapan pengisian">
        <div className="mb-3 flex items-center justify-between gap-3 px-1">
          <div><p className="text-xs font-extrabold uppercase tracking-[.16em] text-slate-500">Your workflow</p><p className="mt-1 text-sm font-bold text-slate-800">Langkah {sectionIndex+1} <span className="font-medium text-slate-400">dari 6</span></p></div>
          <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm">{Math.round(((sectionIndex+1)/tabItems.length)*100)}% perjalanan</span>
        </div>
        <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-gradient-to-r from-sky-500 via-violet-500 to-fuchsia-500 transition-all duration-500" style={{width:(((sectionIndex+1)/tabItems.length)*100)+"%"}} /></div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {tabItems.map((tab,i)=><button type="button" key={tab.id} aria-current={activeTab===tab.id?"step":undefined} onClick={()=>{setActiveTab(tab.id);setIssues([]);setMessage("");window.scrollTo({top:0,behavior:"smooth"});}} className={"group min-w-0 rounded-2xl border p-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-sky-100 "+(activeTab===tab.id?"border-sky-300 bg-white shadow-lg ring-2 ring-sky-100":i<sectionIndex?"border-emerald-200 bg-emerald-50/80 shadow-sm":"border-white bg-white/80 shadow-sm hover:border-slate-200")}>
            <span className={"mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br text-xl shadow-sm "+tab.color}>{i<sectionIndex?<span className="text-sm font-black text-white">✓</span>:<span>{tab.icon}</span>}</span>
            <span className="block min-h-[2.5rem] text-xs font-extrabold leading-5 text-slate-800 sm:text-sm">{tab.label}</span>
            <span className="mt-1 block min-h-[2rem] text-[11px] leading-4 text-slate-500">{tab.sub}</span>
            <span className={"mt-3 block h-1 rounded-full transition-all "+(activeTab===tab.id?"bg-gradient-to-r "+tab.color:i<sectionIndex?"bg-emerald-300":"bg-slate-100 group-hover:bg-slate-200")}></span>
          </button>)}
        </div>
      </nav>

      <div className="grid items-start gap-5 2xl:grid-cols-[minmax(0,1fr)_310px]">
        <section className="min-w-0 rounded-[26px] border border-white bg-white/95 p-4 shadow-lg shadow-slate-200/50 sm:p-6">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-3 rounded-2xl bg-gradient-to-r from-slate-50 via-white to-sky-50 p-4 sm:p-5"><div className="flex min-w-0 items-start gap-3"><div className={"flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-2xl shadow-sm "+(tabItems.find(x=>x.id===activeTab)?.color||"from-sky-500 to-blue-600")}>{tabItems.find(x=>x.id===activeTab)?.icon||"🏨"}</div><div><p className="text-xs font-extrabold uppercase tracking-[.18em] text-sky-700">STEP {tabItems.findIndex(x=>x.id===activeTab)+1} / 6 · CORESTAY WORKFLOW</p><h2 className="mt-1 text-xl font-extrabold sm:text-2xl">{sectionLabel}</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">{tabItems.find(x=>x.id===activeTab)?.detail} Nilai kosong tidak otomatis diubah menjadi nol.</p></div></div><label className="flex items-center gap-2 self-start rounded-full border border-sky-100 bg-white px-3 py-1.5 text-xs font-bold text-sky-800 shadow-sm"><span>Mata uang</span><select aria-label="Pilih mata uang laporan" value={currency} onChange={e=>setCurrency(e.target.value as "IDR"|"USD")} className="rounded-lg border border-sky-200 bg-white px-2 py-1.5 font-bold text-slate-800"><option value="IDR">IDR · Rupiah</option><option value="USD">USD · US Dollar ($)</option></select></label></div>

          {activeTab==="statistics"&&<div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {field("Nama hotel",form.hotelName,v=>updateMeta("hotelName",v),{placeholder:"Contoh: Hotel Marza 88"})}
              {field("Periode laporan",form.period,v=>updateMeta("period",v),{placeholder:"Contoh: Januari 2027 / FY 2027"})}
              {field("Tahun awal forecast",form.yearStart,v=>updateMeta("yearStart",v),{type:"number",min:"1900",step:"1"})}
              {statField("rooms","# OF ROOMS","Jumlah kamar fisik hotel.")}
              {field("OCCUPANCY (%)",form.statistics.occupancy,v=>updateStats("occupancy",v),{type:"number",min:"0",step:"0.1",hint:"Masukkan persentase okupansi acuan 0–100%. Digunakan untuk forecast jika okupansi tidak dapat dihitung dari room nights."})}
              {field("EXCHANGE RATE US $ TO RP",form.statistics.exchangeRate,v=>updateStats("exchangeRate",v),{type:"number",min:"0",hint:"Kurs USD ke Rupiah sesuai sumber/periode.",placeholder:"Contoh: 16000"})}
              {field("AVERAGE SELLING RATE (RP)",form.statistics.averageSellingRate,v=>updateStats("averageSellingRate",v),{type:"number",min:"0",hint:"ARR acuan dalam Rupiah. Jika diisi, okupansi forecast dihitung otomatis dari Room Revenue Budget ÷ (hari setahun × kamar × ARR). Jika dikosongkan, sistem memakai okupansi/ADR aktual bila tersedia.",placeholder:"Isi nilai rata-rata"})}
            </div>
            <div className="rounded-2xl bg-gradient-to-r from-sky-50 via-indigo-50 to-violet-50 p-4 sm:p-5"><h3 className="font-extrabold text-slate-900">Hotel Statistics — perhitungan otomatis</h3><p className="mt-1 text-xs leading-5 text-slate-500">ROOM AVAILABLE = kapasitas room nights (# OF ROOMS × hari periode) dikurangi Out of Inventory, House Use, dan Out of Order. OCCUPIED ROOMS dihitung dari paid room nights ditambah complimentary room nights. Nilai kosong tetap ditampilkan sebagai belum tersedia, bukan nol.</p><div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-5">{roomStats.map(([label,value])=>metric(label,label==="OCCUPANCY (%)"?(value===null?"—":fmt(value)+"%"):label==="AVERAGE ROOM RATE (RP)"||label==="REVPAR"?money(value):fmt(value,0)))}</div></div>
            <div className="rounded-2xl border border-sky-100 bg-white p-4"><h3 className="font-bold">Checklist statistik sebelum finalisasi</h3><ul className="mt-2 grid gap-2 text-sm leading-5 text-slate-600 sm:grid-cols-2"><li>• Gunakan hari operasional sesuai periode.</li><li>• Room nights tidak boleh melebihi Room Available.</li><li>• Isi angka 0 secara eksplisit jika telah dipastikan tidak ada nilai.</li><li>• Cocokkan Room Revenue dengan laporan sumber.</li></ul></div>
          </div>}

          {activeTab==="pnl"&&<div className="space-y-5">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-5 border-b border-slate-100 pb-4">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">STEP 2 / 6 · CORESTAY WORKFLOW</p>
                <h2 className="mt-2 text-2xl font-black text-slate-900">Budget P&amp;L</h2>
                <p className="mt-1 text-sm font-medium text-slate-600">Revenue dan biaya department</p>
              </div>
              <div className="overflow-hidden rounded-2xl border border-sky-200 bg-white shadow-sm">
                <div className="bg-gradient-to-r from-sky-800 via-blue-700 to-indigo-700 px-5 py-5 text-white sm:px-6">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-100">Budget P&amp;L · Revenue Setup</p>
                  <h3 className="mt-1 text-xl font-black sm:text-2xl">REVENUES</h3>
                  <p className="mt-1 max-w-2xl text-sm leading-6 text-sky-50">Tentukan total pendapatan budget, lalu atur persentase kontribusi setiap sumber revenue. Nilai alokasi dihitung otomatis dan dapat diterapkan ke akun terkait.</p>
                </div>
                <div className="space-y-5 p-4 sm:p-6">
                  <div className="grid gap-4 rounded-2xl border border-sky-100 bg-sky-50/70 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end sm:p-5">
                    <label className="block min-w-0">
                      <span className="mb-2 block text-sm font-bold text-slate-700">TOTAL REVENUE BUDGET — ALL OUTLET (Rp)</span>
                      <input className={inputClass+" text-lg font-extrabold tabular-nums"} inputMode="numeric" type="text" placeholder="Contoh: 1.500.000.000" value={formatWholeRupiah(form.budgetAllocations?.parentPercentBySection?.[revenueTotalKey]||"")} onChange={e=>updateAllocation(revenueTotalKey,e.target.value.replace(/[^0-9]/g,""))} />
                      <span className="mt-1.5 block text-xs text-slate-500">Masukkan total pendapatan yang direncanakan untuk periode budget terpilih.</span>
                    </label>
                    <div className="rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-sky-100 sm:min-w-[190px]">
                      <p className="text-xs font-semibold text-slate-500">TOTAL ALOKASI</p>
                      <p className="mt-1 text-xl font-black tabular-nums text-sky-800">{fmt((optional(form.budgetAllocations?.parentPercentBySection?.[revenueGroupPercentKey("roomRevenue")]||"")??0)+(optional(form.budgetAllocations?.parentPercentBySection?.[revenueGroupPercentKey("fbRevenue")]||"")??0)+(optional(form.budgetAllocations?.parentPercentBySection?.[revenueGroupPercentKey("otherRevenue")]||"")??0),2)}%</p>
                      <p className={"mt-1 text-xs font-semibold "+(Math.abs((optional(form.budgetAllocations?.parentPercentBySection?.[revenueGroupPercentKey("roomRevenue")]||"")??0)+(optional(form.budgetAllocations?.parentPercentBySection?.[revenueGroupPercentKey("fbRevenue")]||"")??0)+(optional(form.budgetAllocations?.parentPercentBySection?.[revenueGroupPercentKey("otherRevenue")]||"")??0)-100)<0.01?"text-emerald-700":"text-amber-700")}>{Math.abs((optional(form.budgetAllocations?.parentPercentBySection?.[revenueGroupPercentKey("roomRevenue")]||"")??0)+(optional(form.budgetAllocations?.parentPercentBySection?.[revenueGroupPercentKey("fbRevenue")]||"")??0)+(optional(form.budgetAllocations?.parentPercentBySection?.[revenueGroupPercentKey("otherRevenue")]||"")??0)-100)<0.01?"Pembagian sudah 100%":"Sesuaikan hingga 100%"}</p>
                    </div>
                  </div>
                  <div className="overflow-hidden rounded-xl border border-slate-200">
                    <div className="grid grid-cols-[minmax(0,1fr)_105px] gap-3 bg-slate-100 px-4 py-3 text-xs font-extrabold uppercase tracking-wide text-slate-600 sm:grid-cols-[minmax(0,1fr)_140px_180px]">
                      <span>Kelompok Revenue</span><span className="text-right">Persentase</span><span className="hidden text-right sm:block">Nilai Budget</span>
                    </div>
                    {([{group:"roomRevenue" as AccountGroup,label:"ROOMS",subtitle:"Pendapatan kamar",accent:"border-l-sky-500",percentBg:"bg-sky-50",icon:"▦"},{group:"fbRevenue" as AccountGroup,label:"FOOD & BEVERAGE REVENUE",subtitle:"Restoran, bar, banquet, dan F&B lainnya",accent:"border-l-amber-500",percentBg:"bg-amber-50",icon:"◈"},{group:"otherRevenue" as AccountGroup,label:"MINOR OPERATING DEPT.",subtitle:"Laundry, transportasi, spa, sewa, dan pendapatan operasional lainnya",accent:"border-l-violet-500",percentBg:"bg-violet-50",icon:"◇"}]).map(item=>{
                      const total=optional(form.budgetAllocations?.parentPercentBySection?.[revenueTotalKey]||"");
                      const pct=optional(form.budgetAllocations?.parentPercentBySection?.[revenueGroupPercentKey(item.group)]||"");
                      const allocated=total!==null&&pct!==null?Math.round(total*pct/100):null;
                      return <Fragment key={item.group}><div className={"grid grid-cols-[minmax(0,1fr)_105px] items-center gap-3 border-t border-l-4 border-slate-100 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_140px_180px] "+item.accent}>
                        <div className="min-w-0"><div className="flex items-center gap-2"><span className={"flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg font-black text-slate-700 "+item.percentBg}>{item.icon}</span><div className="min-w-0"><p className="text-sm font-extrabold text-slate-800">{item.label}</p><p className="mt-0.5 text-xs leading-5 text-slate-500">{item.subtitle}</p></div></div><p className="mt-2 text-sm font-bold tabular-nums text-slate-700 sm:hidden">{allocated===null?"Isi total dan %":money(allocated)}</p></div>
                        <label className="block"><span className="sr-only">Persentase {item.label}</span><div className="relative"><input className={inputClass+" pr-7 text-right font-bold tabular-nums"} type="number" min="0" max="100" step="0.1" placeholder="0" value={form.budgetAllocations?.parentPercentBySection?.[revenueGroupPercentKey(item.group)]||""} onChange={e=>updateAllocation(revenueGroupPercentKey(item.group),e.target.value)} /><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">%</span></div></label>
                        <div className="hidden text-right sm:block"><p className="font-extrabold tabular-nums text-slate-800">{allocated===null?"—":money(allocated)}</p><p className="mt-1 text-xs text-slate-400">{pct===null?"Persentase belum diisi":fmt(pct,2)+"% dari total"}</p></div>
                      </div>{item.group==="fbRevenue"&&(()=>{
                        const fbTotal=allocated;
                        const foodPct=optional(form.budgetAllocations?.parentPercentBySection?.["__fbFoodPercent"]||"70")??70;
                        const beveragePct=optional(form.budgetAllocations?.parentPercentBySection?.["__fbBeveragePercent"]||"30")??30;
                        const foodAmount=fbTotal!==null?Math.round(fbTotal*foodPct/100):null;
                        const beverageAmount=fbTotal!==null?Math.round(fbTotal*beveragePct/100):null;
                        const splitTotal=foodPct+beveragePct;
                        const splitValid=Math.abs(splitTotal-100)<0.01;
                        return <div className="border-t border-amber-100 bg-amber-50/50 py-3 pl-[60px] pr-3 sm:pl-[60px] sm:pr-4">
                          <div className="mb-2"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-800">F&amp;B DEPARTMENT — REVENUES</p><p className="mt-0.5 text-[11px] text-slate-500">Pembagian dari {fbTotal===null?"alokasi FOOD & BEVERAGE REVENUE":money(fbTotal)}</p></div>
                          <div className="grid gap-2 sm:grid-cols-2">
                            <div className="rounded-lg border border-slate-200 bg-white p-2.5">
                              <p className="text-xs font-extrabold text-slate-800">FOOD</p>
                              <p className="mt-0.5 text-base font-black tabular-nums text-slate-900">{foodAmount===null?"—":money(foodAmount)}</p>
                              <label className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] font-semibold text-slate-600"><span>Persentase dari total F&amp;B</span><span className="flex items-center gap-1"><input aria-label="Persentase FOOD dari total F&B" className={inputClass+" w-16 py-1 text-right text-xs font-bold tabular-nums"} type="number" min="0" max="100" step="0.1" value={form.budgetAllocations?.parentPercentBySection?.["__fbFoodPercent"]??"70"} onChange={e=>updateAllocation("__fbFoodPercent",e.target.value)}/><span>%</span></span></label>
                            </div>
                            <div className="rounded-lg border border-slate-200 bg-white p-2.5">
                              <p className="text-xs font-extrabold text-slate-800">BEVERAGE</p>
                              <p className="mt-0.5 text-base font-black tabular-nums text-slate-900">{beverageAmount===null?"—":money(beverageAmount)}</p>
                              <label className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] font-semibold text-slate-600"><span>Persentase dari total F&amp;B</span><span className="flex items-center gap-1"><input aria-label="Persentase BEVERAGE dari total F&B" className={inputClass+" w-16 py-1 text-right text-xs font-bold tabular-nums"} type="number" min="0" max="100" step="0.1" value={form.budgetAllocations?.parentPercentBySection?.["__fbBeveragePercent"]??"30"} onChange={e=>updateAllocation("__fbBeveragePercent",e.target.value)}/><span>%</span></span></label>
                            </div>
                          </div>
                          <div className={"mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg px-3 py-2 text-xs font-semibold "+(splitValid?"bg-emerald-50 text-emerald-800":"bg-amber-100 text-amber-900")}><span>Total pembagian</span><span className="font-extrabold tabular-nums">{fmt(splitTotal,2)}% · {splitValid?"Pembagian sudah 100%":"Sesuaikan hingga 100%"}</span></div>
                        </div>;
                      })()}</Fragment>;
                    })}
                  </div>
                  <div className="flex flex-col gap-2 rounded-xl border border-indigo-100 bg-indigo-50/70 p-4 text-sm leading-6 text-indigo-950 sm:flex-row sm:items-center sm:justify-between">
                    <p className="max-w-2xl">Setelah persentase ketiga kelompok berjumlah 100%, tekan tombol alokasi pada setiap kelompok untuk membagikan nilai budget ke akun revenue terkait. Actual dan Last Year tidak diubah.</p>
                    <button type="button" onClick={()=>{const totalPct=(optional(form.budgetAllocations?.parentPercentBySection?.[revenueGroupPercentKey("roomRevenue")]||"")??0)+(optional(form.budgetAllocations?.parentPercentBySection?.[revenueGroupPercentKey("fbRevenue")]||"")??0)+(optional(form.budgetAllocations?.parentPercentBySection?.[revenueGroupPercentKey("otherRevenue")]||"")??0);if(Math.abs(totalPct-100)>0.01){setMessage("Total persentase ROOMS, FOOD & BEVERAGE REVENUE, dan MINOR OPERATING DEPT. harus tepat 100%. Saat ini "+fmt(totalPct)+"%.");return;}setMessage("Persentase Revenue sudah tepat 100%. Silakan terapkan alokasi pada masing-masing kelompok.");}} className="shrink-0 rounded-xl bg-indigo-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-800">Validasi 100%</button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {[{group:"roomRevenue" as AccountGroup,label:"ROOMS",color:"bg-sky-700"},{group:"fbRevenue" as AccountGroup,label:"FOOD & BEVERAGE",color:"bg-amber-600"},{group:"otherRevenue" as AccountGroup,label:"MINOR OPERATING DEPT.",color:"bg-violet-700"}].map(item=><button key={item.group} type="button" onClick={()=>applyRevenueGroup(item.group)} className={"flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-extrabold text-white shadow-sm transition hover:brightness-110 "+item.color}><span>↗</span> Terapkan {item.label}</button>)}
                  </div>
                  {message&&<p role="status" className="rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm font-medium text-sky-900">{message}</p>}
                </div>
              </div>
              <div className="mt-5 space-y-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 sm:p-5">
<div className="space-y-4">
<div><h3 className="font-extrabold text-slate-800">DEPARTMENT EXPENSES</h3><p className="mt-1 text-sm text-slate-500">Pilih departemen untuk menampilkan rincian biaya di bawahnya agar layar tetap ringkas.</p></div>
<div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
{[{id:"room",label:"Room Division",sub:"Room Dept · Front Office · House Keeping",color:"border-sky-200 bg-sky-50 text-sky-900"},{id:"fb",label:"Food & Beverage",sub:"Revenue · Cost of Sales · Payroll · Expenses",color:"border-amber-200 bg-amber-50 text-amber-900"},{id:"mod",label:"Minor Operating Dept.",sub:"Pendapatan dan biaya departemen",color:"border-violet-200 bg-violet-50 text-violet-900"},{id:"ag",label:"Administration & General",sub:"Payroll dan biaya umum",color:"border-indigo-200 bg-indigo-50 text-indigo-900"},{id:"sm",label:"Sales & Marketing",sub:"Payroll dan biaya pemasaran",color:"border-pink-200 bg-pink-50 text-pink-900"},{id:"hrd",label:"Human Resources",sub:"Payroll dan biaya SDM",color:"border-emerald-200 bg-emerald-50 text-emerald-900"},{id:"pomec",label:"POMEC & Utilities",sub:"Maintenance dan energi",color:"border-orange-200 bg-orange-50 text-orange-900"}].map(item=><button key={item.id} type="button" onClick={()=>setSelectedDepartment(item.id)} aria-pressed={selectedDepartment===item.id} className={"rounded-xl border p-3 text-left transition hover:shadow-sm "+item.color+(selectedDepartment===item.id?" ring-2 ring-slate-400 ring-offset-1 shadow-sm":" opacity-80")}><span className="block text-sm font-extrabold">{item.label}</span><span className="mt-1 block text-[11px] leading-4 opacity-80">{item.sub}</span></button>)}
</div>
</div>
{selectedDepartment==="room"&&<div className="space-y-3"><div><h4 className="font-extrabold text-slate-800">ROOM DIVISION</h4><p className="mt-1 text-xs text-slate-500">Urutan: Dec, Jan–Nov, TOTAL, %.</p></div>
{(() => {
const order=[11,0,1,2,3,4,5,6,7,8,9,10];
const groups=[
{title:"ROOM DEPARTMENT",sections:[{title:"REVENUE",rows:[["roomRevenue","ROOM REVENUE"]]}]},
{title:"FRONT OFFICE & RESERVATION",sections:[{title:"PAYROLL & RELATED",rows:[["foSalary","SALARY & WAGES"],["foIncomeTax","INCOME TAX"],["foJamsostek","JAMSOSTEK"],["foInsurance","INSURANCE"],["foBonus","PROV. FOR BONUS"],["foMeal","MEAL ALLOWANCES"],["foOtherPayroll","OTHERS"]]},{title:"OTHER EXPENSES",rows:[["foDecoration","DECORATION"],["foDues","DUES & SUBSCRIPTION"],["foEntertainment","ENTERTAINMENT"],["foWelcomeDrink","WELLCOME DRINK"],["foLaundry","LAUNDRY - UNIFORM"],["foMisc","MISCELANEOUS"],["foPostage","POSTAGE"],["foReservation","RESERVATION EXPENSES"],["foGuestSupplies","GUEST SUPPLIES"],["foCleaning","CLEANING SUPPLIES"],["foPrinting","PRINTING & STATIONARY"],["foUniform","UNIFORM"]]}]},
{title:"HOUSE KEEPING",sections:[{title:"PAYROLL & RELATED",rows:[["hkSalary","SALARY & WAGES"],["hkIncomeTax","INCOME TAX"],["hkJamsostek","JAMSOSTEK"],["hkInsurance","INSURANCE"],["hkThr","THR"],["hkMeal","MEAL ALLOWANCES"],["hkOtherPayroll","OTHERS"]]},{title:"PROV. OPERATING EQUIP.",rows:[["hkChina","CHINA WARE"],["hkGlass","GLASS WARE"],["hkSilver","SILVERWARE"],["hkLinen","LINEN"]]},{title:"OTHER EXPENSES",rows:[["hkDecoration","DECORATION"],["hkWelcomeDrink","WELLCOME DRINK"],["hkCable","CABLE VISION"],["hkLaundry","LAUNDRY LINEN"],["hkGuestSupplies","GUEST SUPPLIES"],["hkCleaning","CLEANING SUPPLIES"],["hkAmenities","ROOM AMENITIES"],["hkPrinting","PRINTING & STATIONARY"],["hkUniform","UNIFORM"],["hkInternet","PROVIDER INTERNET"],["hkPest","PEST CONTROLL"]]}]}
];
const value=(i:number,k:string)=>optional(form.forecast.monthly[i]?.roomDivisionDetails?.[k]||"");
const total=(i:number,keys:string[])=>{const a=keys.map(k=>value(i,k));return a.some(v=>v!==null)?a.reduce<number>((s,v)=>s+(v??0),0):null};
const fmtMoney=(n:number|null)=>n===null?"—":new Intl.NumberFormat("id-ID",{maximumFractionDigits:0}).format(n);
const rev=order.every(i=>value(i,"roomRevenue")===null)?null:order.reduce<number>((s,i)=>s+(value(i,"roomRevenue")??0),0);
const costKeys=groups.flatMap(g=>g.sections.flatMap(s=>s.rows.map(r=>r[0]))).filter(k=>k!=="roomRevenue");
const costTotal=order.every(i=>total(i,costKeys)===null)?null:order.reduce<number>((s,i)=>s+(total(i,costKeys)??0),0);
const pct=(n:number|null)=>n===null||rev===null||rev===0?"—":new Intl.NumberFormat("id-ID",{maximumFractionDigits:2}).format(n/rev*100)+"%";
const totalRow=(label:string,keys:string[])=><tr className="bg-slate-100 font-bold"><td className="sticky left-0 z-10 min-w-52 bg-slate-100 px-3 py-2 text-xs">{label}</td>{order.map(i=><td key={i} className="px-2 py-2 text-right text-xs tabular-nums">{fmtMoney(total(i,keys))}</td>)}<td className="px-2 py-2 text-right text-xs tabular-nums">{fmtMoney(order.every(i=>total(i,keys)===null)?null:order.reduce<number>((s,i)=>s+(total(i,keys)??0),0))}</td><td className="px-2 py-2 text-right text-xs">{pct(order.every(i=>total(i,keys)===null)?null:order.reduce<number>((s,i)=>s+(total(i,keys)??0),0))}</td></tr>;
return <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white"><table className="min-w-max border-collapse"><thead><tr className="bg-sky-900 text-white"><th className="sticky left-0 z-20 min-w-52 px-3 py-3 text-left text-xs">ROOM DIVISION</th>{order.map(i=><th key={i} className="min-w-28 px-2 py-3 text-right text-xs">{i===11?"Dec":monthNames[i].slice(0,3)}</th>)}<th className="min-w-32 px-2 py-3 text-right text-xs">TOTAL</th><th className="min-w-20 px-2 py-3 text-right text-xs">%</th></tr></thead><tbody>
{groups.map(g=><Fragment key={g.title}><tr className="bg-sky-50"><td colSpan={15} className="px-3 py-2 text-xs font-black text-sky-900">{g.title}</td></tr>{g.sections.map(s=><Fragment key={s.title}><tr><td colSpan={15} className="bg-slate-100 px-3 py-2 text-xs font-extrabold">{s.title}</td></tr>{s.rows.map(([key,label])=><tr key={key} className="border-t border-slate-100"><td className="sticky left-0 z-10 min-w-52 bg-white px-3 py-2 text-xs">{label}</td>{order.map(i=><td key={i} className="px-2 py-1.5"><input aria-label={label+" "+form.forecast.monthly[i].label} inputMode="numeric" className="w-28 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-right text-xs tabular-nums focus:border-sky-400 focus:outline-none" placeholder="—" value={formatWholeRupiah(form.forecast.monthly[i]?.roomDivisionDetails?.[key]||"")} onChange={e=>updateRoomDivision(i,key,e.target.value.replace(/[^0-9]/g,""))}/></td>)}<td className="px-2 py-2 text-right text-xs font-bold tabular-nums">{fmtMoney(order.every(i=>value(i,key)===null)?null:order.reduce<number>((s,i)=>s+(value(i,key)??0),0))}</td><td className="px-2 py-2 text-right text-xs">{pct(order.every(i=>value(i,key)===null)?null:order.reduce<number>((s,i)=>s+(value(i,key)??0),0))}</td></tr>)}{totalRow("TOTAL "+s.title,s.rows.map(r=>r[0]))}</Fragment>)}</Fragment>)}
<tr className="bg-indigo-50 font-black"><td className="sticky left-0 z-10 bg-indigo-50 px-3 py-3 text-xs">TOTAL DEPT COST & EXPENSES</td>{order.map(i=><td key={i} className="px-2 py-3 text-right text-xs tabular-nums">{fmtMoney(total(i,costKeys))}</td>)}<td className="px-2 py-3 text-right text-xs tabular-nums">{fmtMoney(costTotal)}</td><td className="px-2 py-3 text-right text-xs">{pct(costTotal)}</td></tr>
<tr className="bg-emerald-50 font-black"><td className="sticky left-0 z-10 bg-emerald-50 px-3 py-3 text-xs">DEPARTMENTAL PROFIT</td>{order.map(i=>{const r=value(i,"roomRevenue"),co=total(i,costKeys);return <td key={i} className="px-2 py-3 text-right text-xs tabular-nums">{fmtMoney(r!==null&&co!==null?r-co:null)}</td>})}<td className="px-2 py-3 text-right text-xs tabular-nums">{fmtMoney(rev!==null&&costTotal!==null?rev-costTotal:null)}</td><td className="px-2 py-3 text-right text-xs">{pct(rev!==null&&costTotal!==null?rev-costTotal:null)}</td></tr>
</tbody></table></div>;
})()}
</div>}
                {selectedDepartment==="fb"&&<div className="space-y-3">
                  <div><h4 className="font-extrabold text-slate-800">F &amp; B DEPARTMENT</h4><p className="mt-1 text-xs text-slate-500">Budget bulanan dengan total otomatis. Persentase Cost of Sales FOOD dihitung terhadap FOOD revenue; BEVERAGE terhadap BEVERAGE revenue; biaya lain terhadap total F&amp;B revenue.</p></div>
                  {(() => {
                    const order=[11,0,1,2,3,4,5,6,7,8,9,10];
                    const value=(i:number,key:string)=>optional(form.forecast.monthly[i]?.fbDetails?.[key]||"");
                    const total=(i:number,keys:readonly string[])=>{const vals=keys.map(key=>value(i,key));return vals.some(v=>v!==null)?vals.reduce<number>((sum,v)=>sum+(v??0),0):null;};
                    const annual=(keys:readonly string[])=>order.some(i=>total(i,keys)!==null)?order.reduce<number>((sum,i)=>sum+(total(i,keys)??0),0):null;
                    const revenueKeys=["foodRevenue","beverageRevenue"] as const;
                    const revenueByMonth=(i:number)=>total(i,revenueKeys);
                    const revenueTotal=annual(revenueKeys);
                    const fmtMoney=(amount:number|null)=>amount===null?"—":new Intl.NumberFormat("id-ID",{maximumFractionDigits:0}).format(amount);
                    const pct=(amount:number|null,base:number|null)=>amount===null||base===null||base===0?"—":new Intl.NumberFormat("id-ID",{maximumFractionDigits:2}).format(amount/base*100)+"%";
                    const costKeys=["foodCost","beverageCost","salaryWages","incomeTax","jamsostek","insurance","thr","mealAllowances","glassware","chinaware","silverware","linen","decoration","duesSubscription","extermDisinfectant","kitchenFuel","laundry","miscellaneous","spoilage","cleaningSupplies","guestSupplies","printingStationery","telephone","uniform","utensil","contractCleaning"] as const;
                    const totalRow=(label:string,keys:readonly string[],baseKeys:readonly string[]=revenueKeys)=><tr className="bg-slate-100 font-bold"><td className="sticky left-0 z-10 min-w-52 bg-slate-100 px-3 py-2 text-xs">{label}</td>{order.map(i=><td key={i} className="px-2 py-2 text-right text-xs tabular-nums">{fmtMoney(total(i,keys))}</td>)}<td className="px-2 py-2 text-right text-xs tabular-nums">{fmtMoney(annual(keys))}</td><td className="px-2 py-2 text-right text-xs">{pct(annual(keys),annual(baseKeys))}</td></tr>;
                    return <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white"><table className="min-w-max border-collapse"><thead><tr className="bg-amber-800 text-white"><th className="sticky left-0 z-20 min-w-52 px-3 py-3 text-left text-xs">F &amp; B DEPARTMENT</th>{order.map(i=><th key={i} className="min-w-28 px-2 py-3 text-right text-xs">{i===11?"Dec":monthNames[i].slice(0,3)}</th>)}<th className="min-w-32 px-2 py-3 text-right text-xs">TOTAL</th><th className="min-w-20 px-2 py-3 text-right text-xs">%</th></tr></thead><tbody>
                      {FB_BUDGET_GROUPS.map(group=><Fragment key={group.title}><tr className="bg-amber-50"><td colSpan={15} className="px-3 py-2 text-xs font-black text-amber-950">{group.title}</td></tr>{group.rows.map(([key,label])=><tr key={key} className="border-t border-slate-100"><td className="sticky left-0 z-10 min-w-52 bg-white px-3 py-2 text-xs">{label}</td>{order.map(i=><td key={i} className="px-2 py-1.5"><input aria-label={label+" "+form.forecast.monthly[i].label} inputMode="numeric" className="w-28 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-right text-xs tabular-nums focus:border-amber-400 focus:outline-none" placeholder="—" value={formatWholeRupiah(form.forecast.monthly[i]?.fbDetails?.[key]||"")} onChange={e=>updateFbDetail(i,key,e.target.value.replace(/[^0-9]/g,""))}/></td>)}<td className="px-2 py-2 text-right text-xs font-bold tabular-nums">{fmtMoney(annual([key]))}</td><td className="px-2 py-2 text-right text-xs">{key==="foodCost"?pct(annual([key]),annual(["foodRevenue"])):key==="beverageCost"?pct(annual([key]),annual(["beverageRevenue"])):pct(annual([key]),revenueTotal)}</td></tr>)}{group.title==="REVENUES"&&<tr className="bg-amber-100 font-black"><td className="sticky left-0 z-10 bg-amber-100 px-3 py-2 text-xs">TOTAL F &amp; B REVENUE</td>{order.map(i=><td key={i} className="px-2 py-2 text-right text-xs tabular-nums">{fmtMoney(revenueByMonth(i))}</td>)}<td className="px-2 py-2 text-right text-xs tabular-nums">{fmtMoney(revenueTotal)}</td><td className="px-2 py-2 text-right text-xs">100,00%</td></tr>}{group.title!=="REVENUES"&&totalRow(group.total,group.rows.map(r=>r[0]))}</Fragment>)}
                      <tr className="bg-indigo-50 font-black"><td className="sticky left-0 z-10 bg-indigo-50 px-3 py-3 text-xs">TOTAL COST &amp; EXPENSES</td>{order.map(i=>{const n=total(i,costKeys);return <td key={i} className="px-2 py-3 text-right text-xs tabular-nums">{fmtMoney(n)}</td>})}<td className="px-2 py-3 text-right text-xs tabular-nums">{fmtMoney(annual(costKeys))}</td><td className="px-2 py-3 text-right text-xs">{pct(annual(costKeys),revenueTotal)}</td></tr>
                      <tr className="bg-emerald-50 font-black"><td className="sticky left-0 z-10 bg-emerald-50 px-3 py-3 text-xs">DEPT. PROFIT/LOSS</td>{order.map(i=>{const rev=revenueByMonth(i),cost=total(i,costKeys);return <td key={i} className="px-2 py-3 text-right text-xs tabular-nums">{fmtMoney(rev!==null&&cost!==null?rev-cost:null)}</td>})}<td className="px-2 py-3 text-right text-xs tabular-nums">{fmtMoney(revenueTotal!==null&&annual(costKeys)!==null?revenueTotal-annual(costKeys)!:null)}</td><td className="px-2 py-3 text-right text-xs">{pct(revenueTotal!==null&&annual(costKeys)!==null?revenueTotal-annual(costKeys)!:null,revenueTotal)}</td></tr>
                    </tbody></table></div>;
                  })()}
                </div>}
                {selectedDepartment==="mod"&&<div className="space-y-3">
                  <div><h4 className="font-extrabold text-slate-800">MINOR OPERATED DEPARTMENT</h4><p className="mt-1 text-xs text-slate-500">{form.forecast.monthly[0]?.modDetails?.rentCarLabel||"Rent Car"}, {form.forecast.monthly[0]?.modDetails?.laundryLabel||"Laundry"}, Cost of Sales, Payroll &amp; Related, dan Other Expenses. Kolom mengikuti Dec–Nov, TOTAL, %.</p></div>
                  {(() => {
                    const rentCarName=(form.forecast.monthly[0]?.modDetails?.rentCarLabel||"RENT CAR").trim()||"RENT CAR";
                     const laundryName=(form.forecast.monthly[0]?.modDetails?.laundryLabel||"LAUNDRY").trim()||"LAUNDRY";
                     const displayModLabel=(label:string)=>label.replace(/RENT CAR/gi,()=>rentCarName).replace(/LAUNDRY/gi,()=>laundryName);
                     const order=[11,0,1,2,3,4,5,6,7,8,9,10];
                    const groups=[
                      {title:"REVENUE",rows:[["rentCarRevenue","RENT CAR"],["laundryRevenue","LAUNDRY"]]},
                      {title:"COST OF SALES",rows:[["laundryCost","LAUNDRY"]]},
                      {title:"PAYROLL & RELATED",rows:[["salaryWages","SALARY & WAGES"],["incomeTax","INCOME TAX"],["jamsostek","JAMSOSTEK"],["insurance","INSURANCE"],["bonus","PROV. FOR BONUS"],["mealAllowances","MEAL ALLOWANCES"],["payrollOthers","OTHERS"]]},
                      {title:"OTHER EXPENSES",rows:[["guestSupplies","GUEST SUPPLIES"],["paperSupplies","PAPER SUPPLIES"],["laundryValetSupplies","LAUNDRY & VALET SUPPLIES"],["laundrySupplies","LAUNDRY SUPPLIES"],["casual","CASUAL"],["cleaningSupplies","CLEANING SUPPLIES"],["printingStationery","PRINTING & STATIONERY"],["decoration","DECORATION"],["telephoneFax","TELEPHONE & FAX"],["laundryExpense","LAUNDRY"],["casualOther","CASUAL — OTHER"],["laundryValetOther","LAUNDRY & VALET SUPPLIES — OTHER"],["cleaningOther","CLEANING SUPPLIES — OTHER"],["provisionUniform","PROV. UNIFORM"],["pteb","PTEB"],["uniform","UNIFORM"],["otherExpenses","OTHERS"]]}
                    ] as const;
                    const value=(i:number,key:string)=>optional(form.forecast.monthly[i]?.modDetails?.[key]||"");
                    const total=(i:number,keys:readonly string[])=>{const vals=keys.map(key=>value(i,key));return vals.some(v=>v!==null)?vals.reduce<number>((sum,v)=>sum+(v??0),0):null;};
                    const annual=(keys:readonly string[])=>order.some(i=>total(i,keys)!==null)?order.reduce<number>((sum,i)=>sum+(total(i,keys)??0),0):null;
                    const revenueKeys=["rentCarRevenue","laundryRevenue"] as const;
                    const costKeys=["laundryCost","salaryWages","incomeTax","jamsostek","insurance","bonus","mealAllowances","payrollOthers","guestSupplies","paperSupplies","laundryValetSupplies","laundrySupplies","casual","cleaningSupplies","printingStationery","decoration","telephoneFax","laundryExpense","casualOther","laundryValetOther","cleaningOther","provisionUniform","pteb","uniform","otherExpenses"] as const;
                    const revenueTotal=annual(revenueKeys),costTotal=annual(costKeys);
                    const fmtMoney=(n:number|null)=>n===null?"—":new Intl.NumberFormat("id-ID",{maximumFractionDigits:0}).format(n);
                    const pct=(n:number|null,base:number|null)=>n===null||base===null||base===0?"—":new Intl.NumberFormat("id-ID",{maximumFractionDigits:2}).format(n/base*100)+"%";
                    const totalRow=(label:string,keys:readonly string[],base:readonly string[]=revenueKeys)=><tr className="bg-slate-100 font-bold"><td className="sticky left-0 z-10 min-w-52 bg-slate-100 px-3 py-2 text-xs">{label}</td>{order.map(i=><td key={i} className="px-2 py-2 text-right text-xs tabular-nums">{fmtMoney(total(i,keys))}</td>)}<td className="px-2 py-2 text-right text-xs tabular-nums">{fmtMoney(annual(keys))}</td><td className="px-2 py-2 text-right text-xs">{pct(annual(keys),annual(base))}</td></tr>;
                    return <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white"><table className="min-w-max border-collapse"><thead><tr className="bg-violet-900 text-white"><th className="sticky left-0 z-20 min-w-52 px-3 py-3 text-left text-xs">MINOR OPERATED DEPARTMENT</th>{order.map(i=><th key={i} className="min-w-28 px-2 py-3 text-right text-xs">{i===11?"Dec":monthNames[i].slice(0,3)}</th>)}<th className="min-w-32 px-2 py-3 text-right text-xs">TOTAL</th><th className="min-w-20 px-2 py-3 text-right text-xs">%</th></tr></thead><tbody>
                    <tr className="bg-slate-50"><td className="sticky left-0 z-10 bg-slate-50 px-3 py-2 text-xs font-bold">OPERATING DAYS</td>{order.map(i=><td key={i} className="px-2 py-1.5"><input aria-label={"Operating days "+form.forecast.monthly[i].label} inputMode="numeric" className="w-20 rounded-md border border-slate-200 px-2 py-1.5 text-right text-xs" placeholder="—" value={form.forecast.monthly[i]?.modDetails?.operatingDays||String(new Date(Number(form.yearStart),i+1,0).getDate())} readOnly title="Terisi otomatis sesuai jumlah hari dalam bulan"/></td>)}<td className="px-2 py-2 text-right text-xs">—</td><td className="px-2 py-2 text-right text-xs">—</td></tr>
                    {groups.map(group=><Fragment key={group.title}><tr className="bg-violet-50"><td colSpan={15} className="px-3 py-2 text-xs font-black text-violet-950">{group.title}</td></tr>{group.rows.map(([key,label])=><tr key={key} className="border-t border-slate-100"><td className="sticky left-0 z-10 min-w-52 bg-white px-2 py-2 text-xs">{group.title==="REVENUE"&&(key==="rentCarRevenue"||key==="laundryRevenue")?<input aria-label={"Nama item "+label} className="w-full min-w-40 rounded-md border border-violet-200 px-2 py-1.5 text-xs focus:border-violet-400 focus:outline-none" value={form.forecast.monthly[0]?.modDetails?.[key==="rentCarRevenue"?"rentCarLabel":"laundryLabel"]??label} onChange={e=>updateModRevenueName(key==="rentCarRevenue"?"rentCarLabel":"laundryLabel",e.target.value)}/>:displayModLabel(label)}</td>{order.map(i=><td key={i} className="px-2 py-1.5"><input aria-label={displayModLabel(label)+" "+form.forecast.monthly[i].label} inputMode="numeric" className="w-28 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-right text-xs tabular-nums focus:border-violet-400 focus:outline-none" placeholder="—" value={formatWholeRupiah(form.forecast.monthly[i]?.modDetails?.[key]||"")} onChange={e=>updateModDetail(i,key,e.target.value.replace(/[^0-9]/g,""))}/></td>)}<td className="px-2 py-2 text-right text-xs font-bold tabular-nums">{fmtMoney(annual([key]))}</td><td className="px-2 py-2 text-right text-xs">{pct(annual([key]),revenueTotal)}</td></tr>)}{totalRow("TOTAL "+group.title,group.rows.map(r=>r[0]))}</Fragment>)}
                    <tr className="bg-indigo-50 font-black"><td className="sticky left-0 z-10 bg-indigo-50 px-3 py-3 text-xs">TOTAL DEPT. EXPENSES</td>{order.map(i=><td key={i} className="px-2 py-3 text-right text-xs tabular-nums">{fmtMoney(total(i,costKeys))}</td>)}<td className="px-2 py-3 text-right text-xs tabular-nums">{fmtMoney(costTotal)}</td><td className="px-2 py-3 text-right text-xs">{pct(costTotal,revenueTotal)}</td></tr>
                    <tr className="bg-emerald-50 font-black"><td className="sticky left-0 z-10 bg-emerald-50 px-3 py-3 text-xs">DEPARTMENTAL PROFIT</td>{order.map(i=>{const rev=total(i,revenueKeys),cost=total(i,costKeys);return <td key={i} className="px-2 py-3 text-right text-xs tabular-nums">{fmtMoney(rev!==null&&cost!==null?rev-cost:null)}</td>})}<td className="px-2 py-3 text-right text-xs tabular-nums">{fmtMoney(revenueTotal!==null&&costTotal!==null?revenueTotal-costTotal:null)}</td><td className="px-2 py-3 text-right text-xs">{pct(revenueTotal!==null&&costTotal!==null?revenueTotal-costTotal:null,revenueTotal)}</td></tr>
                    </tbody></table></div>;
                  })()}
                </div>}
                {selectedDepartment==="ag"&&<div className="space-y-3">
                  <div><h4 className="font-extrabold text-slate-800">ADMINISTRATION &amp; GENERAL</h4><p className="mt-1 text-xs text-slate-500">Rincian A&amp;G mengikuti urutan Dec, Jan–Nov, TOTAL, dan persentase terhadap total revenue hotel. Nilai dan subtotal dihitung otomatis.</p></div>
                  {(() => {
                    const order=[11,0,1,2,3,4,5,6,7,8,9,10];
                    const operatingDays=[0,0,0,7,30,31,30,31,31,30,31,30];
                    const payrollRows=[["salaryWages","SALARY & WAGES"],["incomeTax","INCOME TAX"],["jamsostek","JAMSOSTEK"],["insurance","INSURANCE"],["bonusProvision","PROV. FOR BONUS"],["mealAllowances","MEAL ALLOWANCES"]] as const;
                    const otherRows=[["bankCharges","BANK CHARGES"],["donation","DONATION"],["duesTradeAssoc","DUES & TRADE ASSOC."],["entertainment","ENTERTAINMENT"],["laundryUniforms","LAUNDRY - UNIFORMS"],["postageCourier","POSTAGE & COURIER"],["printingStationery","PRINTING & STATIONERY"],["licenceInspection","LICENCE & INSPECTION"],["transportation","TRANSPORTATION"],["travelling","TRAVELLING"],["telephone","TELEPHONE"],["creditCardCommission","CREDIT CARD COMMISSION"],["companyHousing","COMPANY HOUSING"],["auditBrand","AUDIT BRAND"],["contractService","CONTRACT SERVICE"],["payrollSystem","PAYROLL SYSTEM"],["pmsHotelindo","PMS - Hotelindo"],["edp","EDP"],["provisionUniform","PROVISION UNIFORM"],["others","OTHERS"]] as const;
                    const value=(i:number,key:string)=>optional(form.forecast.monthly[i]?.agDetails?.[key]||"");
                    const total=(i:number,keys:readonly string[])=>{const vals=keys.map(key=>value(i,key));return vals.some(v=>v!==null)?vals.reduce<number>((sum,v)=>sum+(v??0),0):null;};
                    const annual=(keys:readonly string[])=>order.some(i=>total(i,keys)!==null)?order.reduce<number>((sum,i)=>sum+(total(i,keys)??0),0):null;
                    const revenueByMonth=order.map(i=>calcMonthly(form.forecast.monthly[i],Number(form.yearStart),i,form.statistics.rooms).revenue);
                    const hotelRevenueTotal=revenueByMonth.some(v=>v!==null)?revenueByMonth.reduce<number>((sum,v)=>sum+(v??0),0):null;
                    const fmtMoney=(n:number|null)=>n===null?"—":new Intl.NumberFormat("id-ID",{maximumFractionDigits:0}).format(n);
                    const pct=(n:number|null,base:number|null)=>n===null||base===null||base===0?"—":new Intl.NumberFormat("id-ID",{maximumFractionDigits:2}).format(n/base*100)+"%";
                    const payrollKeys=payrollRows.map(r=>r[0]);
                    const otherKeys=otherRows.map(r=>r[0]);
                    const allExpenseKeys=[...payrollKeys,...otherKeys];
                    const totalRow=(label:string,keys:readonly string[])=><tr className="bg-slate-100 font-bold"><td className="sticky left-0 z-10 min-w-52 bg-slate-100 px-3 py-2 text-xs">{label}</td>{order.map(i=><td key={i} className="px-2 py-2 text-right text-xs tabular-nums">{fmtMoney(total(i,keys))}</td>)}<td className="px-2 py-2 text-right text-xs tabular-nums">{fmtMoney(annual(keys))}</td><td className="px-2 py-2 text-right text-xs">{pct(annual(keys),hotelRevenueTotal)}</td></tr>;
                    const inputRow=(key:string,label:string)=><tr key={key} className="border-t border-slate-100"><td className="sticky left-0 z-10 min-w-52 bg-white px-2 py-2 text-xs">{label}</td>{order.map(i=><td key={i} className="px-2 py-1.5"><input aria-label={label+" "+form.forecast.monthly[i].label} inputMode="numeric" className="w-28 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-right text-xs tabular-nums focus:border-indigo-400 focus:outline-none" placeholder="—" value={formatWholeRupiah(form.forecast.monthly[i]?.agDetails?.[key]||"")} onChange={e=>updateAgDetail(i,key,e.target.value.replace(/[^0-9]/g,""))}/></td>)}<td className="px-2 py-2 text-right text-xs font-bold tabular-nums">{fmtMoney(annual([key]))}</td><td className="px-2 py-2 text-right text-xs">{pct(annual([key]),hotelRevenueTotal)}</td></tr>;
                    return <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white"><table className="min-w-max border-collapse"><thead><tr className="bg-indigo-900 text-white"><th className="sticky left-0 z-20 min-w-52 px-3 py-3 text-left text-xs">ADMINISTRATION &amp; GENERAL</th>{order.map(i=><th key={i} className="min-w-28 px-2 py-3 text-right text-xs">{i===11?"Dec":monthNames[i].slice(0,3)}</th>)}<th className="min-w-32 px-2 py-3 text-right text-xs">TOTAL</th><th className="min-w-20 px-2 py-3 text-right text-xs">%</th></tr></thead><tbody>
                      <tr className="bg-slate-50"><td className="sticky left-0 z-10 bg-slate-50 px-3 py-2 text-xs font-bold">OPERATING DAYS</td>{order.map((i,j)=><td key={i} className="px-2 py-1.5"><input aria-label={"Operating days "+form.forecast.monthly[i].label} inputMode="numeric" className="w-20 rounded-md border border-slate-200 px-2 py-1.5 text-right text-xs" value={form.forecast.monthly[i]?.agDetails?.operatingDays??String(operatingDays[j])} readOnly title="Mengikuti kalender operasional yang ditetapkan"/></td>)}<td className="px-2 py-2 text-right text-xs">—</td><td className="px-2 py-2 text-right text-xs">—</td></tr>
                      <tr className="bg-indigo-50"><td colSpan={15} className="px-3 py-2 text-xs font-black text-indigo-950">PAYROLL &amp; RELATED</td></tr>
                      {payrollRows.map(([key,label])=>inputRow(key,label))}
                      {totalRow("TOTAL PAYROLL & RELATED",payrollKeys)}
                      <tr className="bg-indigo-50"><td colSpan={15} className="px-3 py-2 text-xs font-black text-indigo-950">OTHER EXPENSES</td></tr>
                      {otherRows.map(([key,label])=>inputRow(key,label))}
                      {totalRow("TOTAL OTHER EXPENSES",otherKeys)}
                      <tr className="bg-indigo-100 font-black"><td className="sticky left-0 z-10 bg-indigo-100 px-3 py-3 text-xs">TOTAL DEPARTMENT EXPENSES</td>{order.map(i=><td key={i} className="px-2 py-3 text-right text-xs tabular-nums">{fmtMoney(total(i,allExpenseKeys))}</td>)}<td className="px-2 py-3 text-right text-xs tabular-nums">{fmtMoney(annual(allExpenseKeys))}</td><td className="px-2 py-3 text-right text-xs">{pct(annual(allExpenseKeys),hotelRevenueTotal)}</td></tr>
                    </tbody></table></div>;
                  })()}
                </div>}
                {!["room","fb","mod","ag"].includes(selectedDepartment)&&<div className="rounded-xl border border-dashed border-slate-300 bg-white p-5"><h4 className="font-extrabold text-slate-800">{({sm:"SALES & MARKETING",hrd:"HUMAN RESOURCES",pomec:"POMEC & UTILITIES"} as Record<string,string>)[selectedDepartment]}</h4><p className="mt-2 text-sm leading-6 text-slate-600">Menu departemen sudah disiapkan. Rincian akun bagian ini akan disusun setelah modul departemen sebelumnya selesai.</p></div>}
                <p className="text-xs leading-5 text-slate-500">Subtotal, total biaya, departmental profit, dan persentase dihitung otomatis. Nilai yang belum diisi tetap ditampilkan sebagai —. Angka contoh dari sumber tidak dimasukkan otomatis.</p>
</div>
            </section>
          </div>}

          {activeTab==="forecast"&&<div className="space-y-7">
            
            <div className="rounded-2xl bg-teal-50 p-4 text-sm leading-6 text-teal-950">Forecast terisi otomatis dari input Budget P&amp;L dan statistik hotel. Room Revenue dihitung dari jumlah hari × kamar × okupansi × ADR. Pendapatan lain dan biaya mengikuti proporsi jumlah hari; proyeksi 10 tahun bertambah 2% per tahun. Tidak perlu menginput ulang angka pada laporan konsolidasi.</div>
            <div className="rounded-2xl border border-sky-200 bg-sky-50/70 p-4">
              <div className="mb-3"><h3 className="text-lg font-extrabold text-slate-900">1 YEAR CONSOLIDATED — {form.yearStart}</h3><p className="mt-1 text-xs leading-5 text-slate-600">Laporan tahunan Januari–Desember dengan kolom TOTAL / RATA-RATA. Nilai dihitung dari data yang tersedia; data yang belum ada tetap ditampilkan sebagai —.</p></div>
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="w-full min-w-[1800px] border-collapse text-[10px]">
                  <thead>
                    <tr className="bg-slate-800 text-white">
                      <th rowSpan={2} className="sticky left-0 z-10 min-w-[210px] bg-slate-800 px-3 py-2 text-left">1 YEAR CONSOLIDATED — {form.yearStart}</th>
                      {form.forecast.monthly.map((row,i)=><th key={row.label} colSpan={2} className="px-1 py-2 text-center">{monthNames[i].toUpperCase()}</th>)}
                      <th colSpan={2} className="bg-teal-700 px-2 py-2 text-center">TOTAL / RATA-RATA</th>
                    </tr>
                    <tr className="bg-slate-100 text-slate-600">
                      {form.forecast.monthly.map(row=><Fragment key={row.label}><th className="px-1 py-1 text-right">Value</th><th className="px-1 py-1 text-right">%</th></Fragment>)}
                      <th className="bg-teal-50 px-2 py-1 text-right">Value</th><th className="bg-teal-50 px-2 py-1 text-right">%</th>
                    </tr>
                  </thead>
                  <tbody>{buildConsolidatedRows(form).map((line,ri)=>{
                    if(line.kind==="section") return <tr key={line.label} className="bg-slate-200 text-slate-800"><th colSpan={27} className="border-t border-slate-300 px-3 py-2 text-left font-black tracking-wide">{line.label}</th></tr>;
                    const display=(v:number|null|undefined)=>v===null||v===undefined||!Number.isFinite(v)?"—":line.kind==="percent"?fmt(v,1)+"%":line.label==="Days"||line.label==="# OF ROOMS"||line.label==="ROOM AVAILABLE"||line.label==="OCCUPIED ROOMS"?fmt(v,0):money(v);
                    const values=line.values;
                    return <tr key={line.label} className={line.label.startsWith("TOTAL REVENUES")||line.label.includes("GOP")||line.label.includes("PROFIT")?"bg-teal-50 font-extrabold":ri%2?"bg-slate-50":"bg-white"}>
                      <th className="sticky left-0 z-[1] border-t border-slate-200 bg-inherit px-3 py-2 text-left">{line.label}</th>
                      {values.map((v,i)=><Fragment key={i}>
                        <td className="border-t border-slate-200 px-1 py-2 text-right tabular-nums">{display(v)}</td>
                        <td className="border-t border-slate-200 px-1 py-2 text-right tabular-nums">{line.base?percentOf(v,line.base[i]??null):"—"}</td>
                      </Fragment>)}
                      <td className="border-t border-slate-200 bg-teal-50 px-2 py-2 text-right font-bold tabular-nums">{display(line.total)}</td>
                      <td className="border-t border-slate-200 bg-teal-50 px-2 py-2 text-right font-bold tabular-nums">{line.totalPct===null||line.totalPct===undefined?"—":fmt(line.totalPct,1)+"%"}</td>
                    </tr>;
                  })}</tbody>
                </table>
              </div>
            </div>
                        <div className="rounded-2xl border border-indigo-100 bg-white p-4"><div className="mb-3"><h3 className="text-lg font-extrabold">10 YEARS CONSOLIDATED — {form.yearStart}–{Number(form.yearStart)+9}</h3><p className="mt-1 text-xs leading-5 text-slate-600">Proyeksi otomatis dari Budget P&amp;L dan statistik hotel, dengan kenaikan 2% per tahun. Setiap tahun memiliki Value dan %, disertai Total / Rata-rata; detail departemen yang tidak tersedia tetap ditampilkan sebagai —.</p></div><div className="overflow-x-auto rounded-xl border border-slate-200"><table className="w-full min-w-[1900px] border-collapse text-[10px]"><thead><tr className="bg-indigo-900 text-white"><th rowSpan={2} className="sticky left-0 z-10 min-w-[260px] bg-indigo-900 px-2 py-2 text-left">10 YEARS CONSOLIDATED</th>{form.forecast.annual.map(row=><th key={row.label} colSpan={2} className="px-1 py-2 text-center">YEAR {Number(row.label)-Number(form.yearStart)+1}</th>)}<th colSpan={2} className="bg-teal-700 px-2 py-2 text-center">TOTAL / RATA-RATA</th></tr><tr className="bg-slate-100 text-slate-600">{form.forecast.annual.map(row=><Fragment key={row.label}><th className="px-1 py-1 text-right">Value</th><th className="px-1 py-1 text-right">%</th></Fragment>)}<th className="bg-teal-50 px-2 py-1 text-right">Value</th><th className="bg-teal-50 px-2 py-1 text-right">%</th></tr></thead><tbody>{buildTenYearRows(form).map((line,ri)=>{if(line.section)return <tr key={line.label}><th colSpan={23} className="border-t border-slate-300 bg-slate-200 px-2 py-2 text-left font-black">{line.label}</th></tr>;const display=(v:number|null|undefined)=>v===null||v===undefined||!Number.isFinite(v)?"—":line.kind==="percent"?fmt(v,2)+"%":line.kind==="count"?fmt(v,0):money(v);return <tr key={line.label} className={line.label.startsWith("TOTAL REVENUES")||line.label.includes("GOP")||line.label.includes("PROFIT")?"bg-teal-50 font-extrabold":ri%2?"bg-slate-50":"bg-white"}><th className="sticky left-0 z-[1] border-t border-slate-200 bg-inherit px-2 py-1.5 text-left">{line.label}</th>{line.values.map((v,i)=><Fragment key={i}><td className="border-t border-slate-200 px-1 py-1.5 text-right tabular-nums">{display(v)}</td><td className="border-t border-slate-200 px-1 py-1.5 text-right tabular-nums">{line.base?percentOf(v,line.base[i]??null):"—"}</td></Fragment>)}<td className="border-t border-slate-200 bg-teal-50 px-2 py-1.5 text-right font-bold tabular-nums">{display(line.total)}</td><td className="border-t border-slate-200 bg-teal-50 px-2 py-1.5 text-right font-bold tabular-nums">{line.totalPct===null?"—":fmt(line.totalPct,2)+"%"}</td></tr>;})}</tbody></table></div></div>
          </div>}

          {activeTab==="variance"&&<div className="space-y-5">
            <div className="rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-950">Variance dihitung hanya jika Actual dan Budget sama-sama diisi. Untuk revenue, nilai positif biasanya berarti di atas budget. Untuk biaya, nilai positif berarti biaya di atas budget dan perlu ditinjau. Perbandingan wajib menggunakan periode yang sama.</div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{metric("Revenue Actual",money(revenueActual))}{metric("Revenue Budget",money(revenueBudget))}{metric("Revenue Variance",revenueActual===null||revenueBudget===null?"Belum lengkap":money(revenueActual-revenueBudget))}{metric("Revenue Last Year",money(revenueLastYear))}{metric("Cost Actual",money(costActual))}{metric("Cost Budget",money(costBudget))}{metric("Cost Variance",costActual===null||costBudget===null?"Belum lengkap":money(costActual-costBudget))}{metric("Cost Last Year",money(costLastYear))}{metric("GOP Margin",values.gopMargin===null?"—":fmt(values.gopMargin)+"%")}{metric("YTD Revenue Actual",money(ytdRevenueActual))}{metric("YTD Revenue Budget",money(ytdRevenueBudget))}{metric("YTD Revenue Variance",ytdRevenueActual===null||ytdRevenueBudget===null?"Belum lengkap":money(ytdRevenueActual-ytdRevenueBudget))}{metric("YTD Cost Actual",money(ytdCostActual))}{metric("YTD Cost Budget",money(ytdCostBudget))}{metric("YTD Cost Variance",ytdCostActual===null||ytdCostBudget===null?"Belum lengkap":money(ytdCostActual-ytdCostBudget))}</div>
            <div className="overflow-x-auto rounded-2xl border border-slate-200"><table className="w-full min-w-[750px] border-collapse text-sm"><thead className="bg-amber-100 text-amber-950"><tr>{["Kelompok akun","Actual","Budget","Variance A−B","Last Year","Variance A−LY"].map(x=><th key={x} className="px-3 py-3 text-right first:text-left">{x}</th>)}</tr></thead><tbody>{GROUP_ORDER.filter(group=>group!=="ownerCashItems").map((group,i)=>{const a=sumGroup(form.accounts,group,"actual",allAccountLines),b=sumGroup(form.accounts,group,"budget",allAccountLines),l=sumGroup(form.accounts,group,"lastYear",allAccountLines);return <tr key={group} className={i%2?"bg-slate-50":"bg-white"}><td className="border-t px-3 py-3 font-semibold">{GROUP_LABELS[group]}</td><td className="border-t px-3 py-3 text-right tabular-nums">{money(a)}</td><td className="border-t px-3 py-3 text-right tabular-nums">{money(b)}</td><td className="border-t px-3 py-3 text-right font-bold tabular-nums">{a!==null&&b!==null?money(a-b):"Belum lengkap"}</td><td className="border-t px-3 py-3 text-right tabular-nums">{money(l)}</td><td className="border-t px-3 py-3 text-right font-bold tabular-nums">{a!==null&&l!==null?money(a-l):"Belum lengkap"}</td></tr>;})}</tbody></table></div>
            <div className="mt-5"><h3 className="mb-3 text-lg font-extrabold">Year-to-Date (YTD) Variance &amp; Exception Report</h3><div className="overflow-x-auto rounded-2xl border border-slate-200"><table className="w-full min-w-[780px] border-collapse text-sm"><thead className="bg-violet-100 text-violet-950"><tr>{["Kelompok akun","YTD Actual","YTD Budget","Variance A−B","Last Year YTD","Variance A−LY"].map(x=><th key={x} className="px-3 py-3 text-right first:text-left">{x}</th>)}</tr></thead><tbody>{GROUP_ORDER.filter(group=>group!=="ownerCashItems").map((group,i)=>{const a=sumGroup(form.accounts,group,"ytdActual",allAccountLines),b=sumGroup(form.accounts,group,"ytdBudget",allAccountLines),l=sumGroup(form.accounts,group,"lastYearYtd",allAccountLines);return <tr key={group} className={i%2?"bg-slate-50":"bg-white"}><td className="border-t px-3 py-3 font-semibold">{GROUP_LABELS[group]}</td><td className="border-t px-3 py-3 text-right tabular-nums">{money(a)}</td><td className="border-t px-3 py-3 text-right tabular-nums">{money(b)}</td><td className="border-t px-3 py-3 text-right font-bold tabular-nums">{a!==null&&b!==null?money(a-b):"Belum lengkap"}</td><td className="border-t px-3 py-3 text-right tabular-nums">{money(l)}</td><td className="border-t px-3 py-3 text-right font-bold tabular-nums">{a!==null&&l!==null?money(a-l):"Belum lengkap"}</td></tr>;})}</tbody></table></div></div>
          </div>}

          {activeTab==="action-plan"&&<div className="space-y-5">
            <div className="rounded-2xl bg-pink-50 p-4 text-sm leading-6 text-pink-950">Catat tindakan yang didasarkan pada temuan data. Sistem tidak mengarang target atau mengubah hasil keuangan. Pastikan PIC, deadline, dan ukuran keberhasilan jelas.</div>
            <label className="block"><span className="mb-1.5 block text-sm font-semibold text-slate-700">Rekomendasi / tindakan</span><textarea className={inputClass} rows={4} value={form.actionRecommendation} onChange={e=>updateMeta("actionRecommendation",e.target.value)} placeholder="Uraikan tindakan spesifik berdasarkan temuan, termasuk langkah yang perlu dilakukan." /></label><div className="grid gap-4 sm:grid-cols-2">{field("Catatan laporan / temuan",form.notes,v=>updateMeta("notes",v),{placeholder:"Temuan, penyebab, konteks tambahan"})}{field("PIC / penanggung jawab",form.actionOwner,v=>updateMeta("actionOwner",v),{placeholder:"Nama atau jabatan"})}{field("Deadline",form.actionDue,v=>updateMeta("actionDue",v),{type:"date"})}{field("Target hasil",form.actionTarget,v=>updateMeta("actionTarget",v),{placeholder:"Target yang disetujui dan dapat diukur"})}{field("Progress (%)",form.actionProgress,v=>updateMeta("actionProgress",v),{type:"number",min:"0",step:"1",hint:"0 sampai 100 persen."})}<label className="block"><span className="mb-1.5 block text-sm font-semibold text-slate-700">Status tindakan</span><select className={inputClass} value={form.actionStatus} onChange={e=>updateMeta("actionStatus",e.target.value)}><option>Belum dimulai</option><option>Sedang berjalan</option><option>Selesai</option><option>Terhambat</option></select></label></div>
            <div className="rounded-2xl border border-pink-100 bg-white p-4"><h3 className="font-extrabold">Template tindak lanjut</h3><div className="mt-3 grid gap-3 sm:grid-cols-3">{metric("PIC",form.actionOwner||"Belum diisi")}{metric("Deadline",form.actionDue||"Belum diisi")}{metric("Target",form.actionTarget||"Belum diisi")}{metric("Status",form.actionStatus||"Belum dimulai")}{metric("Progress",form.actionProgress+"%")}{metric("Rekomendasi",form.actionRecommendation||"Belum diisi")}</div></div>
          </div>}

          {activeTab==="export"&&<div className="space-y-5">
            <div className="rounded-2xl bg-indigo-50 p-5"><h3 className="font-extrabold text-indigo-950">Preview, print PDF, dan Excel</h3><p className="mt-2 text-sm leading-6 text-indigo-900">Preview menampilkan identitas laporan, statistik, ringkasan P&amp;L, dan daftar akun. PDF dibuat dari dialog print browser; pilih “Save as PDF”. File Excel berisi empat sheet terpisah: Summary, Account P&amp;L, Monthly Forecast, dan 10-Year Forecast.</p></div>
            <div className="grid gap-3 sm:grid-cols-3"><button type="button" onClick={()=>setPreviewOpen(true)} className="rounded-xl bg-sky-600 px-4 py-3 text-sm font-bold text-white shadow hover:bg-sky-700">Preview laporan</button><button type="button" onClick={downloadExcel} className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow hover:bg-emerald-700">Download Excel (.xlsx)</button><button type="button" onClick={()=>setPreviewOpen(true)} className="rounded-xl bg-slate-800 px-4 py-3 text-sm font-bold text-white shadow hover:bg-slate-900">Preview &amp; Print PDF</button></div>
            <div className="rounded-2xl border border-indigo-100 bg-white p-4"><h3 className="font-bold">Ringkasan untuk export</h3><div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{metric("Hotel",form.hotelName||"Belum diisi")}{metric("Periode",form.period||"Belum diisi")}{metric("Total Revenue",money(values.revenue))}{metric("GOP",money(values.gop))}{metric("GOP Margin",values.gopMargin===null?"—":fmt(values.gopMargin)+"%")}{metric("Owner Share Profit",money(values.ownerShareProfitBeforeTax))}{metric("Net Owner Profit",money(values.netProfit))}{metric("Owner Cash After CapEx",money(values.ownerCashAfterCapex))}</div></div>
          </div>}

          <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
            <button type="button" onClick={goPreviousStep} disabled={sectionIndex===0} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">← Tahap Sebelumnya</button>
            {activeTab!=="export"?<button type="button" onClick={goNextStep} className="rounded-xl bg-gradient-to-r from-blue-700 to-violet-700 px-5 py-3 text-sm font-bold text-white shadow-md transition hover:-translate-y-0.5">Tahap Berikutnya →</button>:<div className="flex flex-wrap gap-3"><button type="button" onClick={()=>setPreviewOpen(true)} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50">Preview sebelum simpan</button><button type="button" disabled={saving} onClick={()=>void saveFinal()} className="rounded-xl bg-gradient-to-r from-blue-700 to-violet-700 px-5 py-3 text-sm font-bold text-white shadow-md transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60">{saving?"Validasi & simpan berjalan…":"Validasi Final Corestay & Simpan"}</button><button type="button" onClick={downloadExcel} className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800 hover:bg-emerald-100">Download Excel (.xlsx)</button></div>}
          </div>
          {message&&<div className={"mt-4 rounded-xl border p-4 text-sm leading-6 "+(orchestrator==="passed"?"border-emerald-200 bg-emerald-50 text-emerald-900":orchestrator==="failed"?"border-rose-200 bg-rose-50 text-rose-900":"border-sky-200 bg-sky-50 text-sky-900")}>{message}{summary&&<p className="mt-2 font-semibold">{summary}</p>}</div>}
          {(issues.length>0||warnings.length>0)&&<div className="mt-3 space-y-3">{issues.length>0&&<div className="rounded-xl border border-rose-200 bg-rose-50 p-4"><p className="font-bold text-rose-900">Temuan validasi — wajib ditangani</p><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-rose-800">{issues.map((item,i)=><li key={i}>{item}</li>)}</ul></div>}{warnings.length>0&&<div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="font-bold text-amber-900">Peringatan data</p><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-800">{warnings.map((item,i)=><li key={i}>{item}</li>)}</ul></div>}</div>}
        </section>

        <aside className="space-y-4">
          <div className="rounded-[24px] bg-white p-5 shadow-md ring-1 ring-slate-100"><p className="text-xs font-bold uppercase tracking-widest text-slate-500">Live summary</p><p className="mt-2 break-words text-sm text-slate-500">{form.hotelName||"Nama hotel belum diisi"}</p><div className="mt-4 space-y-3">{[["Total Revenue",money(values.revenue)],["Operating Cost",money(values.costs)],["GOP — estimasi",money(values.gop)],["GOP Margin",values.gopMargin===null?"—":fmt(values.gopMargin)+"%"],["Occupancy",values.occupancy===null?"—":fmt(values.occupancy)+"%"]].map(([label,value])=><div key={label} className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3 last:border-0 last:pb-0"><span className="text-xs text-slate-500">{label}</span><span className="max-w-[60%] break-words text-right text-sm font-extrabold tabular-nums">{value}</span></div>)}</div></div>
          <div className="rounded-[24px] bg-gradient-to-br from-slate-900 to-blue-950 p-5 text-white"><div className="flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10">✓</span><h3 className="font-extrabold">CORESTAY BUDGET ORCHESTRATOR</h3></div><p className="mt-3 text-sm leading-6 text-blue-100">Validasi matematis di server, pemeriksaan kapasitas kamar, rekonsiliasi akun, pemeriksaan forecast, lalu AI review. Penyimpanan hanya dilakukan setelah semua pemeriksaan wajib lolos.</p><p className="mt-3 text-xs text-blue-200">AI adalah lapisan review tambahan; angka final tetap harus dicocokkan dengan sumber akuntansi.</p></div>
          <div className="rounded-[24px] border border-sky-100 bg-sky-50 p-5"><p className="font-bold text-sky-950">Data &amp; privasi</p><p className="mt-2 text-sm leading-6 text-sky-900">Laporan final disimpan di Supabase dengan Row Level Security. Pengguna hanya dapat membaca dan menghapus laporan milik akunnya sendiri. Form yang belum disimpan tidak dikirim ke database.</p><p className="mt-3 text-xs leading-5 text-sky-800">Login tidak wajib. Tanpa login, laporan disimpan lokal di browser/perangkat ini; data lokal dapat hilang jika data browser dihapus atau perangkat diganti. Jika login, laporan tersimpan di akun Anda.</p></div>
        </aside>
      </div>
    </div>

    {previewOpen&&<div className="fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto bg-slate-950/60 p-3 pt-6 sm:p-8" role="dialog" aria-modal="true" aria-label="Preview laporan"><article className="print-report my-auto w-full max-w-5xl rounded-2xl bg-white p-5 shadow-2xl sm:p-8">
      <div className="mb-5 flex items-start justify-between gap-3 border-b border-slate-200 pb-4"><div><p className="text-xs font-bold uppercase tracking-widest text-sky-700">CORESTAY ADVISORY</p><h2 className="mt-1 text-xl font-black sm:text-2xl">Hotel Budget &amp; P&amp;L</h2><p className="mt-1 text-sm text-slate-500">{form.hotelName||"Nama hotel belum diisi"} · {form.period||"Periode belum diisi"}</p></div><button type="button" onClick={()=>setPreviewOpen(false)} className="rounded-full bg-slate-100 px-3 py-2 font-bold text-slate-600 print:hidden" aria-label="Tutup preview">✕</button></div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-6">{metric("Total Revenue",money(values.revenue))}{metric("Operating Cost",money(values.costs))}{metric("GOP — estimasi",money(values.gop))}{metric("GOP Margin",values.gopMargin===null?"—":fmt(values.gopMargin)+"%")}{metric("YTD Revenue",money(values.ytdRevenue))}{metric("YTD GOP",money(values.ytdGop))}{metric("YTD Owner Share Profit",money(values.ytdOwnerShareProfitBeforeTax))}{metric("YTD Net Owner Profit",money(values.ytdNetProfit))}</div>
      <h3 className="mt-6 mb-2 text-sm font-extrabold">1. Hotel Statistics</h3><div className="overflow-x-auto"><table className="w-full border-collapse text-xs"><tbody>{[["Hotel",form.hotelName],["Periode",form.period],["# OF ROOMS",form.statistics.rooms],["ROOM AVAILABLE",fmt(values.roomAvailable,0)],["OCCUPIED ROOMS",optional(form.statistics.complimentary)!==null&&optional(form.statistics.roomPaid)!==null?fmt(optional(form.statistics.complimentary)!+optional(form.statistics.roomPaid)!,0):"—"],["OCCUPANCY (%)",values.occupancy===null?"Tidak dapat dihitung":fmt(values.occupancy)+"%"],["AVERAGE ROOM RATE (RP)",money(values.adr)],["REVPAR",money(values.revpar)],["EXCHANGE RATE US $ TO RP",form.statistics.exchangeRate],["AVERAGE SELLING RATE (RP)",form.statistics.averageSellingRate]].map(([label,value],i)=><tr key={label} className={i%2?"bg-slate-50":""}><th className="w-[44%] border-b border-slate-200 px-3 py-2 text-left font-semibold text-slate-600">{label}</th><td className="break-words border-b border-slate-200 px-3 py-2 text-right font-medium tabular-nums">{value||"—"}</td></tr>)}</tbody></table></div>
      <section className="mt-7 break-before-page">
        <h3 className="mb-1 text-sm font-extrabold">2. 1 YEAR CONSOLIDATED</h3>
        <p className="mb-3 text-[10px] leading-4 text-slate-600">Tampilan mengikuti struktur laporan konsolidasi hotel sebagai acuan: statistik hotel, pendapatan, biaya, hasil operasi, GOP, dan profit pemilik. Nilai bulanan dihitung hanya dari data forecast yang tersedia; rincian departemen yang belum memiliki input bulanan ditampilkan sebagai —, bukan angka perkiraan.</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1800px] border-collapse text-[9px]">
            <thead><tr className="bg-slate-800 text-white"><th className="sticky left-0 z-10 min-w-[210px] bg-slate-800 px-2 py-2 text-left">1 YEAR CONSOLIDATED</th>{form.forecast.monthly.map((row,i)=><th key={row.label} colSpan={2} className="px-1 py-2 text-center">{monthNames[i].slice(0,3).toUpperCase()}</th>)}<th colSpan={2} className="bg-teal-700 px-2 py-2 text-center">TOTAL / RATA-RATA</th></tr><tr className="bg-slate-100 text-slate-600"><th className="sticky left-0 z-10 bg-slate-100 px-2 py-1 text-left">{form.hotelName||"Nama Hotel"} · {form.yearStart}</th>{form.forecast.monthly.map(row=><Fragment key={row.label}><th className="px-1 py-1 text-right">Value</th><th className="px-1 py-1 text-right">%</th></Fragment>)}<th className="bg-teal-50 px-2 py-1 text-right">Value</th><th className="bg-teal-50 px-2 py-1 text-right">%</th></tr></thead>
            <tbody>{buildConsolidatedRows(form).map((line,i)=>{
                if(line.kind==="section") return <tr key={line.label} className="bg-slate-200 text-slate-800"><th colSpan={27} className="border-t border-slate-300 px-2 py-1.5 text-left font-black">{line.label}</th></tr>;
                const display=(v:number|null|undefined,kind:ConsolidatedRow["kind"])=>v===null||v===undefined||!Number.isFinite(v)?"—":kind==="percent"?fmt(v,1)+"%":line.label==="Days"||line.label==="# OF ROOMS"||line.label==="ROOM AVAILABLE"||line.label==="OCCUPIED ROOMS"?fmt(v,0):money(v);
                return <tr key={line.label} className={line.label.startsWith("TOTAL REVENUES")||line.label.includes("GOP")||line.label.includes("PROFIT")?"bg-teal-50 font-extrabold":i%2?"bg-slate-50":"bg-white"}>
                  <th className="sticky left-0 z-[1] border-t border-slate-200 bg-inherit px-2 py-1.5 text-left">{line.label}</th>
                  {line.values.map((v,j)=><Fragment key={j}><td className="border-t border-slate-200 px-1 py-1.5 text-right tabular-nums">{display(v,line.kind)}</td><td className="border-t border-slate-200 px-1 py-1.5 text-right tabular-nums">{line.base?percentOf(v,line.base[j]??null):line.kind==="percent"?"—": "—"}</td></Fragment>)}
                  <td className="border-t border-slate-200 bg-teal-50 px-2 py-1.5 text-right font-bold tabular-nums">{display(line.total,line.kind)}</td><td className="border-t border-slate-200 bg-teal-50 px-2 py-1.5 text-right font-bold tabular-nums">{line.totalPct===null||line.totalPct===undefined?"—":fmt(line.totalPct,1)+"%"}</td>
                </tr>;
              })}</tbody>
          </table>
        </div>
      </section>
      <h3 className="mt-6 mb-2 text-sm font-extrabold">3. P&amp;L Summary</h3><div className="overflow-x-auto"><table className="w-full border-collapse text-xs"><thead><tr className="bg-slate-800 text-white"><th className="px-3 py-2 text-left">Account Group</th><th className="px-3 py-2 text-right">Actual</th><th className="px-3 py-2 text-right">Budget</th><th className="px-3 py-2 text-right">Variance</th><th className="px-3 py-2 text-right">Last Year</th></tr></thead><tbody>{GROUP_ORDER.filter(group=>group!=="ownerCashItems").map((group,i)=>{const a=sumGroup(form.accounts,group,"actual",allAccountLines),b=sumGroup(form.accounts,group,"budget",allAccountLines),l=sumGroup(form.accounts,group,"lastYear",allAccountLines);return <tr key={group} className={i%2?"bg-slate-50":""}><td className="border-b border-slate-200 px-3 py-2 font-semibold">{GROUP_LABELS[group]}</td><td className="border-b border-slate-200 px-3 py-2 text-right tabular-nums">{money(a)}</td><td className="border-b border-slate-200 px-3 py-2 text-right tabular-nums">{money(b)}</td><td className="border-b border-slate-200 px-3 py-2 text-right tabular-nums">{a!==null&&b!==null?money(a-b):"—"}</td><td className="border-b border-slate-200 px-3 py-2 text-right tabular-nums">{money(l)}</td></tr>;})}</tbody></table></div><div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">{metric("Owner Share Profit — sebelum pajak",money(values.ownerShareProfitBeforeTax))}{metric("Net Owner Profit — estimasi",money(values.netProfit))}{metric("Owner Cash After CapEx — perlu data arus kas",money(values.ownerCashAfterCapex))}</div>
      <section className="mt-7 break-before-page"><h3 className="mb-1 text-sm font-extrabold">4. 10 YEARS CONSOLIDATED — {form.yearStart}–{Number(form.yearStart)+9}</h3><p className="mb-3 text-[10px] leading-4 text-slate-600">Data menggunakan sumber forecast 10 tahun yang sama dengan form. Value dan persentase menggunakan perhitungan yang sama; rincian departemen yang belum diinput tetap —.</p><div className="overflow-x-auto"><table className="w-full min-w-[1900px] border-collapse text-[8px]"><thead><tr className="bg-indigo-900 text-white"><th rowSpan={2} className="sticky left-0 z-10 min-w-[260px] bg-indigo-900 px-2 py-2 text-left">10 YEARS CONSOLIDATED</th>{form.forecast.annual.map(row=><th key={row.label} colSpan={2} className="px-1 py-2 text-center">YEAR {Number(row.label)-Number(form.yearStart)+1}</th>)}<th colSpan={2} className="bg-teal-700 px-2 py-2 text-center">TOTAL / RATA-RATA</th></tr><tr className="bg-slate-100 text-slate-600">{form.forecast.annual.map(row=><Fragment key={row.label}><th className="px-1 py-1 text-right">Value</th><th className="px-1 py-1 text-right">%</th></Fragment>)}<th className="bg-teal-50 px-2 py-1 text-right">Value</th><th className="bg-teal-50 px-2 py-1 text-right">%</th></tr></thead><tbody>{buildTenYearRows(form).map((line,ri)=>{if(line.section)return <tr key={line.label} className="bg-slate-200"><th colSpan={23} className="border-t border-slate-300 px-2 py-1.5 text-left font-black">{line.label}</th></tr>;const display=(v:number|null|undefined)=>v===null||v===undefined||!Number.isFinite(v)?"—":line.kind==="percent"?fmt(v,2)+"%":line.kind==="count"?fmt(v,0):money(v);return <tr key={line.label} className={line.label.startsWith("TOTAL REVENUES")||line.label.includes("GOP")||line.label.includes("PROFIT")?"bg-teal-50 font-extrabold":ri%2?"bg-slate-50":"bg-white"}><th className="sticky left-0 z-[1] border-t border-slate-200 bg-inherit px-2 py-1.5 text-left">{line.label}</th>{line.values.map((v,i)=><Fragment key={i}><td className="border-t border-slate-200 px-1 py-1.5 text-right tabular-nums">{display(v)}</td><td className="border-t border-slate-200 px-1 py-1.5 text-right tabular-nums">{line.base?percentOf(v,line.base[i]??null):"—"}</td></Fragment>)}<td className="border-t border-slate-200 bg-teal-50 px-2 py-1.5 text-right font-bold tabular-nums">{display(line.total)}</td><td className="border-t border-slate-200 bg-teal-50 px-2 py-1.5 text-right font-bold tabular-nums">{line.totalPct===null?"—":fmt(line.totalPct,2)+"%"}</td></tr>;})}</tbody></table></div></section>
      <h3 className="mt-6 mb-2 text-sm font-extrabold">5. Management Action Plan</h3><div className="overflow-x-auto"><table className="w-full border-collapse text-xs"><tbody>{[["Catatan / Temuan",form.notes],["Rekomendasi / Tindakan",form.actionRecommendation],["PIC",form.actionOwner],["Deadline",form.actionDue],["Target",form.actionTarget],["Status",form.actionStatus],["Progress (%)",form.actionProgress]].map(([l,v],i)=><tr key={l} className={i%2?"bg-slate-50":""}><th className="w-[35%] border-b px-3 py-2 text-left">{l}</th><td className="whitespace-pre-wrap break-words border-b px-3 py-2">{v||"—"}</td></tr>)}</tbody></table></div>
      {orchestrator==="passed"&&<p className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-900 print:border-slate-300 print:bg-white">CORESTAY HOTEL BUDGET ORCHESTRATOR — final validation passed · {summary||"Pemeriksaan matematis dan AI selesai."}</p>}
      <div className="mt-6 flex flex-wrap justify-end gap-3 print:hidden"><button type="button" onClick={()=>setPreviewOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold">Kembali ke form</button><button type="button" onClick={downloadExcel} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white">Download Excel (.xlsx)</button><button type="button" onClick={()=>window.print()} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white">Print / Save PDF</button></div>
    </article></div>}

    <style jsx global>{`
      @media print {
        @page { size: A4 landscape; margin: 10mm; }
        body { background: #fff !important; color: #111827 !important; font-size: 9pt !important; }
        body * { visibility: hidden !important; }
        .print-report, .print-report * { visibility: visible !important; }
        .print-report { position: absolute !important; inset: 0 auto auto 0 !important; width: 100% !important; max-width: none !important; margin: 0 !important; padding: 0 !important; border-radius: 0 !important; box-shadow: none !important; overflow: visible !important; }
        .print-report button { display: none !important; }
        table { width: 100% !important; table-layout: fixed !important; border-collapse: collapse !important; }
        th, td { overflow-wrap: anywhere !important; word-break: normal !important; padding: 4px 5px !important; }
        tr { break-inside: avoid !important; }
        * { box-shadow: none !important; }
      }
    `}</style>
  </main>;
}
