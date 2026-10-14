"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/lib/supabase";
import { ACCOUNT_LINES, ACCOUNT_SECTIONS, GROUP_LABELS, GROUP_ORDER, calculateBudget, emptyAccounts, numeric, sumGroup, type AccountValue, type AccountLine, type AccountGroup } from "@/lib/hotel-budget-final";

type Statistics = { days: string; rooms: string; outInventory: string; houseUse: string; outOfOrder: string; complimentary: string; roomPaid: string; exchangeRate: string; averageSellingRate: string };
type ForecastMonth = { label:string; occupancy:string; adr:string; fbRevenue:string; phoneRevenue:string; otherRevenue:string; fbCostOfSales:string; phoneCostOfSales:string; modCostOfSales:string; roomPayroll:string; fbPayroll:string; phonePayroll:string; modPayroll:string; roomOtherExpenses:string; fbOtherExpenses:string; phoneOtherExpenses:string; modOtherExpenses:string; agPayroll:string; smPayroll:string; hrdPayroll:string; pomecPayroll:string; agOtherExpenses:string; smOtherExpenses:string; hrdOtherExpenses:string; pomecOtherExpenses:string; energyCost:string; operatingCosts:string; basicManagementFee:string; otherManagementFee:string; insuranceGeneral:string; landLease:string; ownerInsurance:string; maintenanceFee:string; operatorSharePercent:string; ownerOtherExpenses:string };
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
const makeMonthly = (year:number):ForecastMonth[] => monthNames.map((label,i)=>({label:label+" "+year,occupancy:"",adr:"",fbRevenue:"",phoneRevenue:"",otherRevenue:"",fbCostOfSales:"",phoneCostOfSales:"",modCostOfSales:"",roomPayroll:"",fbPayroll:"",phonePayroll:"",modPayroll:"",roomOtherExpenses:"",fbOtherExpenses:"",phoneOtherExpenses:"",modOtherExpenses:"",agPayroll:"",smPayroll:"",hrdPayroll:"",pomecPayroll:"",agOtherExpenses:"",smOtherExpenses:"",hrdOtherExpenses:"",pomecOtherExpenses:"",energyCost:"",operatingCosts:"",basicManagementFee:"",otherManagementFee:"",insuranceGeneral:"",landLease:"",ownerInsurance:"",maintenanceFee:"",operatorSharePercent:"30",ownerOtherExpenses:""}));
const makeAnnual = (year: number): ForecastYear[] => Array.from({length:10},(_,i)=>({label:String(year+i),days:String((year+i)%4===0?366:365),rooms:"",occupancy:"",adr:"",fbRevenue:"",otherRevenue:"",operatingCosts:""}));
const makeBlank = (): BudgetForm => ({
  hotelName:"",period:"",yearStart:"2027",
  statistics:{days:"30",rooms:"",outInventory:"",houseUse:"",outOfOrder:"",complimentary:"",roomPaid:"",exchangeRate:"",averageSellingRate:""},
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
  const roomRevenue=months.map(m=>m.roomRevenue), fb=monthly("fbRevenue"), phone=monthly("phoneRevenue"), other=monthly("otherRevenue");
  const revenue=months.map(m=>m.revenue), revenueTotal=sumPresent(revenue);
  const available=months.map(m=>roomCount===null?null:m.days*roomCount);
  const occupied=months.map((m,i)=>available[i]===null||optional(form.forecast.monthly[i].occupancy)===null?null:available[i]!*optional(form.forecast.monthly[i].occupancy)!/100);
  const roomAvailableTotal=sumPresent(available), occupiedTotal=sumPresent(occupied), roomRevenueTotal=sumPresent(roomRevenue);
  const monthlyCost=(row:ForecastMonth)=>{
    const cos=sumComplete([val(row,"fbCostOfSales"),val(row,"phoneCostOfSales"),val(row,"modCostOfSales")]);
    const payroll=sumComplete([val(row,"roomPayroll"),val(row,"fbPayroll"),val(row,"phonePayroll"),val(row,"modPayroll")]);
    const deptOther=sumComplete([val(row,"roomOtherExpenses"),val(row,"fbOtherExpenses"),val(row,"phoneOtherExpenses"),val(row,"modOtherExpenses")]);
    const overheadPayroll=sumComplete([val(row,"agPayroll"),val(row,"smPayroll"),val(row,"hrdPayroll"),val(row,"pomecPayroll")]);
    const overheadOther=sumComplete([val(row,"agOtherExpenses"),val(row,"smOtherExpenses"),val(row,"hrdOtherExpenses"),val(row,"pomecOtherExpenses"),val(row,"energyCost")]);
    const detailed=[cos,payroll,deptOther,overheadPayroll,overheadOther];
    const detailKeys:(keyof ForecastMonth)[]=["fbCostOfSales","phoneCostOfSales","modCostOfSales","roomPayroll","fbPayroll","phonePayroll","modPayroll","roomOtherExpenses","fbOtherExpenses","phoneOtherExpenses","modOtherExpenses","agPayroll","smPayroll","hrdPayroll","pomecPayroll","agOtherExpenses","smOtherExpenses","hrdOtherExpenses","pomecOtherExpenses","energyCost"];
    const hasDetail=detailKeys.some(k=>val(row,k)!==null);
    const detailTotal=hasDetail?sumComplete(detailed):null;
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
  const deptIncomeTotal=deptIncome.map(d=>sumComplete([d.room,d.fb,d.phone,d.mod]));
  const houseProfit=deptIncomeTotal.map((v,i)=>v!==null&&costParts[i].overheadPayroll!==null&&costParts[i].overheadOther!==null?v-costParts[i].overheadPayroll-costParts[i].overheadOther:null);
  const goi=houseProfit.map((v,i)=>v!==null&&val(form.forecast.monthly[i],"basicManagementFee")!==null?v-val(form.forecast.monthly[i],"basicManagementFee")!:null);
  const nonOp= form.forecast.monthly.map(r=>sumComplete([val(r,"otherManagementFee"),val(r,"insuranceGeneral")]));
  const gop=goi.map((v,i)=>v!==null&&nonOp[i]!==null?v-nonOp[i]!:null);
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
  add("AVERAGE SELLING RATE (RP)",form.forecast.monthly.map(()=>optional(form.statistics.averageSellingRate)),"money",undefined,optional(form.statistics.averageSellingRate));
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
  add("DEPARTMENT OPERATING COST & EXPENSES",form.forecast.monthly.map((r,i)=>sumComplete([costParts[i].cos,costParts[i].payroll,costParts[i].deptOther])),"sum",undefined,sumPresent(form.forecast.monthly.map((r,i)=>sumComplete([costParts[i].cos,costParts[i].payroll,costParts[i].deptOther]))),revenue);
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
  add("POMEC / ENGINEERING",monthly("pomecPayroll"),"money","pomecPayroll");
  add("TOTAL OVERHEAD PAYROLL",costParts.map(c=>c.overheadPayroll),"sum",undefined,sumPresent(costParts.map(c=>c.overheadPayroll)),revenue);
  section("OVERHEAD DEPARTMENT — OTHER EXPENSES");
  add("A&G",monthly("agOtherExpenses"),"money","agOtherExpenses");
  add("S&M",monthly("smOtherExpenses"),"money","smOtherExpenses");
  add("HRD",monthly("hrdOtherExpenses"),"money","hrdOtherExpenses");
  add("POMEC / ENGINEERING",monthly("pomecOtherExpenses"),"money","pomecOtherExpenses");
  add("ENERGY COST",monthly("energyCost"),"money","energyCost");
  add("TOTAL OVERHEAD OTHER EXPENSES",costParts.map(c=>c.overheadOther),"sum",undefined,sumPresent(costParts.map(c=>c.overheadOther)),revenue);
  add("TOTAL OVERHEAD DEPARTMENT",form.forecast.monthly.map((r,i)=>sumComplete([costParts[i].overheadPayroll,costParts[i].overheadOther])),"sum",undefined,sumPresent(form.forecast.monthly.map((r,i)=>sumComplete([costParts[i].overheadPayroll,costParts[i].overheadOther]))),revenue);
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
      make("AVERAGE SELLING RATE (RP)",years.map(()=>null),"money"),
      section("REVENUES"),
      make("ROOMS",roomRevenue,"money",revenue),
      make("FOOD & BEVERAGE",fb,"money",revenue,"fbRevenue"),
      make("MINOR OPERATING DEPARTMENT",other,"money",revenue,"otherRevenue"),
      make("TOTAL REVENUES (EXCL. TAX)",revenue,"money",revenue,undefined,totalRevenue),
      make("TOTAL REVENUES (INCL. 21% — reference formula)",revenue.map(v=>v===null?null:v*1.21),"money",undefined,undefined,totalRevenue===null?null:totalRevenue*1.21),
      section("COST OF SALES"),
      make("FOOD & BEVERAGE — detail not entered",years.map(()=>null),"money",revenue),
      make("MINOR OPERATING DEPARTMENT — detail not entered",years.map(()=>null),"money",revenue),
      make("TOTAL COST OF SALES — detail not entered",years.map(()=>null),"money",revenue),
      section("PAYROLL & RELATED EXPENSES"),
      make("ROOM — detail not entered",years.map(()=>null),"money",revenue),
      make("FOOD & BEVERAGE — detail not entered",years.map(()=>null),"money",revenue),
      make("MINOR OPERATING DEPARTMENT — detail not entered",years.map(()=>null),"money",revenue),
      make("TOTAL PAYROLL & RELATED EXPENSES — detail not entered",years.map(()=>null),"money",revenue),
      section("OTHER DEPARTMENT EXPENSES"),
      make("ROOM — detail not entered",years.map(()=>null),"money",revenue),
      make("FOOD & BEVERAGE — detail not entered",years.map(()=>null),"money",revenue),
      make("MINOR OPERATING DEPARTMENT — detail not entered",years.map(()=>null),"money",revenue),
      make("TOTAL OTHER DEPARTMENT EXPENSES — detail not entered",years.map(()=>null),"money",revenue),
      make("DEPARTMENT OPERATING COST & EXPENSES — detail not entered",years.map(()=>null),"money",revenue),
      make("TOTAL OPERATING COSTS (COMBINED INPUT)",costs,"money",revenue,"operatingCosts"),
      section("DEPARTMENT INCOME"),
      make("ROOM — detail not entered",years.map(()=>null),"money",roomRevenue),
      make("FOOD & BEVERAGE — detail not entered",years.map(()=>null),"money",fb),
      make("MINOR OPERATING DEPARTMENT — detail not entered",years.map(()=>null),"money",other),
      make("TOTAL DEPARTMENT INCOME — detail not entered",years.map(()=>null),"money",revenue),
      section("OVERHEAD DEPARTMENT"),
      make("PAYROLL & RELATED — detail not entered",years.map(()=>null),"money",revenue),
      make("OTHER EXPENSES — detail not entered",years.map(()=>null),"money",revenue),
      make("TOTAL OVERHEAD DEPARTMENT — detail not entered",years.map(()=>null),"money",revenue),
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
        const monthly=prev.forecast.monthly.map((row,i)=>({...row,label:monthNames[i]+" "+start}));
        const annual=prev.forecast.annual.map((row,i)=>({...row,label:String(start+i),days:row.days||String((start+i)%4===0?366:365)}));
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
    const total=(groups:AccountGroup[])=>{
      const nums=groups.map(g=>sumGroup(form.accounts,g,"budget",allAccountLines)).filter((v):v is number=>v!==null);
      return nums.length?nums.reduce((a,b)=>a+b,0):null;
    };
    return {occupancy:values.occupancy,adr:values.adr,fb:total(["fbRevenue"]),other:total(["otherRevenue"]),costs:total(["costOfSales","payroll","operatingExpenses","overhead"])};
  },[form.accounts,allAccountLines,values.occupancy,values.adr]);
  useEffect(()=>{
    setForm(prev=>{
      const startYear=Number(prev.yearStart);
      // Do not fabricate monthly values by dividing annual P&L totals by 12.
      // Monthly forecast cells are editable source inputs; missing months remain blank.
      const monthly=prev.forecast.monthly.map((r,i)=>({...r,label:monthNames[i]+" "+startYear}));
      const annual=prev.forecast.annual.map((r,i)=>{
        const year=startYear+i;
        const factor=Math.pow(1.02,i);
        const grow=(current:string,source:number|null)=>{
          if(source===null)return current;
          const parsed=optional(current);
          // Keep existing manual entries; fill missing values from the base budget and apply 2% annual growth.
          if(!current.trim() && i===0)return String(Math.round(source));
          if(!current.trim())return String(Math.round(source*factor));
          if(i===0 && parsed!==null && Math.abs(parsed-source)<0.000001)return current;
          return current;
        };
        return {
          ...r,
          label:String(year),
          days:String(new Date(year,1,29).getMonth()===1?366:365),
          rooms:r.rooms.trim()||prev.statistics.rooms,
          occupancy:r.occupancy.trim()||forecastSource.occupancy===null?r.occupancy:String(Math.round(forecastSource.occupancy*100)/100),
          adr:grow(r.adr,forecastSource.adr),
          fbRevenue:grow(r.fbRevenue,forecastSource.fb),
          otherRevenue:grow(r.otherRevenue,forecastSource.other),
          operatingCosts:grow(r.operatingCosts,forecastSource.costs)
        };
      });
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
  const filteredLines=useMemo(()=>allAccountLines.filter(line=>departmentMatches(line,pnlDepartment)&&(line.code+" "+line.label+" "+line.section).toLowerCase().includes(search.toLowerCase())),[search,allAccountLines,pnlDepartment]);
  const selectedSaved=reports.find(r=>r.id===selectedReport);
  const updateStats=(key:keyof Statistics,value:string)=>setForm(prev=>({...prev,statistics:{...prev.statistics,[key]:value}}));
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
      ["Paid Room Nights",optional(form.statistics.roomPaid)],["OCCUPANCY (%)",values.occupancy],["AVERAGE ROOM RATE (RP)",values.adr],["REVPAR",values.revpar],
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
    {id:"pnl",label:"Budget P&L",sub:"Pendapatan dan biaya",color:"from-violet-500 to-purple-600",icon:"📊",detail:"Isi akun Actual, Budget, Last Year, dan YTD. Ringkasan dihitung otomatis dari data yang terisi."},
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
      const hasPnl=Object.values(form.accounts).some(row=>Object.values(row||{}).some(value=>String(value??"").trim()!==""));
      if(!hasPnl) problem="Isi minimal nilai P&L dari laporan sumber (Actual, Budget, Last Year, atau YTD) sebelum melanjutkan.";
    } else if(activeTab==="forecast"){
      const hasForecast=[...form.forecast.monthly,...form.forecast.annual].some(row=>Object.entries(row).some(([key,value])=>key!=="label"&&key!=="operatorSharePercent"&&key!=="days"&&String(value??"").trim()!==""));
      if(!hasForecast) problem="Isi minimal satu nilai pada Monthly atau Annual Forecast sebelum melanjutkan.";
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
              {field("EXCHANGE RATE US $ TO RP",form.statistics.exchangeRate,v=>updateStats("exchangeRate",v),{type:"number",min:"0",hint:"Kurs USD ke Rupiah sesuai sumber/periode.",placeholder:"Contoh: 16000"})}
              {field("AVERAGE SELLING RATE (RP)",form.statistics.averageSellingRate,v=>updateStats("averageSellingRate",v),{type:"number",min:"0",hint:"Rata-rata harga jual kamar dalam Rupiah.",placeholder:"Isi nilai rata-rata"})}
            </div>
            <div className="rounded-2xl bg-gradient-to-r from-sky-50 via-indigo-50 to-violet-50 p-4 sm:p-5"><h3 className="font-extrabold text-slate-900">Hotel Statistics — perhitungan otomatis</h3><p className="mt-1 text-xs leading-5 text-slate-500">ROOM AVAILABLE = kapasitas room nights (# OF ROOMS × hari periode) dikurangi Out of Inventory, House Use, dan Out of Order. OCCUPIED ROOMS dihitung dari paid room nights ditambah complimentary room nights. Nilai kosong tetap ditampilkan sebagai belum tersedia, bukan nol.</p><div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-5">{roomStats.map(([label,value])=>metric(label,label==="OCCUPANCY (%)"?(value===null?"—":fmt(value)+"%"):label==="AVERAGE ROOM RATE (RP)"||label==="REVPAR"?money(value):fmt(value,0)))}</div></div>
            <div className="rounded-2xl border border-sky-100 bg-white p-4"><h3 className="font-bold">Checklist statistik sebelum finalisasi</h3><ul className="mt-2 grid gap-2 text-sm leading-5 text-slate-600 sm:grid-cols-2"><li>• Gunakan hari operasional sesuai periode.</li><li>• Room nights tidak boleh melebihi Room Available.</li><li>• Isi angka 0 secara eksplisit jika telah dipastikan tidak ada nilai.</li><li>• Cocokkan Room Revenue dengan laporan sumber.</li></ul></div>
          </div>}

          {activeTab==="pnl"&&<div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{pnlView==="month"?<>{metric("Total Revenue — Actual",money(values.revenue),"Subtotal akun revenue yang terisi")}{metric("Operating Cost — Actual",money(values.costs),"Subtotal akun biaya operasional yang terisi")}{metric("GOP — estimasi",money(values.gop),"Revenue dikurangi cost of sales, payroll, departmental dan overhead")}{metric("GOP Margin",values.gopMargin===null?"—":fmt(values.gopMargin)+"%","Hanya dihitung jika revenue positif")}</>:<>{metric("YTD Total Revenue",money(values.ytdRevenue),"Subtotal akun YTD yang terisi")}{metric("YTD Operating Cost",money(values.ytdCosts),"Subtotal biaya YTD yang terisi")}{metric("YTD GOP — estimasi",money(values.ytdGop),"YTD Revenue dikurangi YTD operating cost")}{metric("YTD GOP Margin",values.ytdGopMargin===null?"—":fmt(values.ytdGopMargin)+"%","Hanya dihitung jika YTD revenue positif")}</>}</div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-950">Template mencakup This Month dan Year to Date (YTD). Persentase adalah persentase terhadap total revenue pada periode/kolom yang sama. Total hanya menjumlahkan baris terisi; baris kosong tidak otomatis dianggap nol.</div>
            <div className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-100 p-1.5">
              <button type="button" onClick={()=>setPnlView("month")} className={"rounded-lg px-4 py-2.5 text-sm font-bold "+(pnlView==="month"?"bg-white text-sky-800 shadow":"text-slate-600")}>This Month / Current Period</button>
              <button type="button" onClick={()=>setPnlView("ytd")} className={"rounded-lg px-4 py-2.5 text-sm font-bold "+(pnlView==="ytd"?"bg-white text-violet-800 shadow":"text-slate-600")}>Year to Date (YTD)</button>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sky-200 bg-sky-50 p-3"><div><p className="text-sm font-extrabold text-slate-800">Edit nomor dan nama akun langsung di tabel</p><p className="text-xs text-slate-600">Ubah kolom Kode atau Nama akun. Tambahkan akun baru melalui tombol di samping.</p></div><button type="button" onClick={()=>{const code="8"+String(Date.now()).slice(-4);const line:AccountLine={code,label:"Akun Baru",group:"otherRevenue",section:"Akun Kustom"};setForm(prev=>({...prev,accountLines:[...prev.accountLines,line],customAccounts:[...(prev.customAccounts||[]),line],accounts:{...prev.accounts,[code]:{actual:"",budget:"",lastYear:"",ytdActual:"",ytdBudget:"",lastYearYtd:""}}}));}} className="rounded-xl bg-sky-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-sky-800">+ Tambah Akun</button></div>
            <div className="rounded-2xl border border-sky-100 bg-sky-50/60 p-3">
              <p className="mb-2 text-sm font-extrabold text-slate-800">Pilih Departemen Budget P&amp;L</p>
              <div className="flex flex-wrap gap-2">
                {[{id:"all",label:"Semua / Konsolidasi"},{id:"room",label:"ROOM DIVISION"},{id:"fb",label:"F&B"},{id:"ag",label:"A&G"},{id:"hrd",label:"HRD"},{id:"sm",label:"S&M"},{id:"pomec",label:"POMEC"}].map(d=><button type="button" key={d.id} onClick={()=>{setPnlDepartment(d.id);setSearch("");}} className={"rounded-xl border px-3 py-2.5 text-xs font-extrabold transition "+(pnlDepartment===d.id?"border-sky-700 bg-sky-800 text-white shadow":"border-slate-200 bg-white text-slate-700 hover:border-sky-300")}>{d.label}</button>)}
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-600">{pnlDepartment==="all"?"Menampilkan seluruh akun untuk konsolidasi hotel. Setiap akun sumber tetap dihitung satu kali.":pnlDepartment==="room"?"Akun pendapatan kamar dan biaya yang teridentifikasi sebagai Room Division.":pnlDepartment==="fb"?"Akun pendapatan F&B serta biaya yang teridentifikasi sebagai F&B.":pnlDepartment==="ag"?"Akun administrasi dan umum (A&G).":pnlDepartment==="hrd"?"Akun payroll dan benefit yang dapat diidentifikasi sebagai SDM. Akun HRD khusus dapat ditambahkan jika belum tersedia di bagan akun.":pnlDepartment==="sm"?"Akun Sales & Marketing dan biaya terkait.":"Akun engineering, utilities, dan pemeliharaan (POMEC)."}</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><label className="block min-w-0 sm:max-w-md"><span className="mb-1 block text-xs font-bold text-slate-600">Cari kode akun / nama / bagian</span><input className={inputClass} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Contoh: 41101, payroll, utilities..." /></label><span className="text-xs text-slate-500">{filteredLines.length} baris akun ditemukan</span></div>
            <div className="space-y-5">
              {allAccountSections.map(section=>{const lines=filteredLines.filter(line=>line.section===section);if(!lines.length)return null;return <div key={section} className="overflow-hidden rounded-2xl border border-slate-200"><div className={"px-4 py-3 text-sm font-extrabold text-white "+(pnlView==="month"?"bg-gradient-to-r from-sky-800 to-blue-700":"bg-gradient-to-r from-violet-800 to-purple-700")}>{section}<span className="ml-2 text-xs font-medium text-white/70">({lines.length} akun)</span></div>{section==="Revenue"&&<div className="space-y-3 border-b border-slate-100 bg-sky-50/70 p-3"><div className="flex flex-wrap items-end gap-3"><label className="block w-64 text-xs font-bold text-slate-700">Total Revenue Budget — All Outlet (Rp)<input type="text" inputMode="numeric" className={inputClass+" mt-1 text-right tabular-nums"} value={formatWholeRupiah(form.budgetAllocations?.parentPercentBySection?.[revenueTotalKey]||"")} onChange={e=>{const digits=e.target.value.replace(/[^0-9]/g,"");updateAllocation(revenueTotalKey,digits)}} placeholder="Contoh: 5.000.000.000"/></label><p className="pb-2 text-xs text-slate-600">Masukkan nilai Rupiah penuh. Titik memisahkan setiap 3 digit; semua angka nol tetap ditampilkan. Target tiap sub-induk dihitung dari persentase yang Anda isi.</p></div><div className="grid gap-3 md:grid-cols-3">{([{group:"roomRevenue" as AccountGroup,label:"Room Revenue"},{group:"fbRevenue" as AccountGroup,label:"F&B Revenue"},{group:"otherRevenue" as AccountGroup,label:"Other Operating Revenue"}]).map(item=><div key={item.group} className="rounded-xl border border-sky-100 bg-white p-3"><div className="text-xs font-extrabold text-slate-800">{item.label}</div><div className="mt-2 flex items-end gap-2"><label className="min-w-0 flex-1 text-xs font-semibold text-slate-600">% dari Total Revenue<input type="number" min="0" max="100" step="0.01" className={inputClass+" mt-1 text-right"} value={form.budgetAllocations?.parentPercentBySection?.[revenueGroupPercentKey(item.group)]||""} onChange={e=>{const v=e.target.value;updateAllocation(revenueGroupPercentKey(item.group),v);}} onBlur={e=>{const v=e.target.value.trim();if(v!=="")applyRevenueGroup(item.group,v);}} placeholder="Contoh: 40"/></label><button type="button" onClick={()=>applyRevenueGroup(item.group)} className="rounded-lg bg-sky-700 px-3 py-2.5 text-xs font-bold text-white hover:bg-sky-800">Terapkan</button></div><p className="mt-2 text-xs text-slate-500">Target: {money((optional(form.budgetAllocations?.parentPercentBySection?.[revenueTotalKey]||"")??0)*(optional(form.budgetAllocations?.parentPercentBySection?.[revenueGroupPercentKey(item.group)]||"")??0)/100)}</p></div>)}</div></div>}{section!=="Revenue"&&section!=="Owner Cash Flow (di luar P&L)"&&<div className="flex flex-wrap items-end gap-3 border-b border-slate-100 bg-sky-50/70 p-3"><label className="block w-44 text-xs font-bold text-slate-700">Budget induk (% dari Budget Revenue)<input type="number" min="0" max="100" step="0.01" className={inputClass+" mt-1 text-right"} value={form.budgetAllocations?.parentPercentBySection?.[section]||""} onChange={e=>{const entered=e.target.value;updateAllocation(section,entered);if(entered.trim()!=="")applySectionAllocation(section,entered);}} onBlur={e=>{const entered=e.target.value.trim();if(entered!=="")applySectionAllocation(section,entered);}} placeholder="Contoh: 12.5"/></label><button type="button" onClick={()=>applySectionAllocation(section)} className="rounded-lg bg-sky-700 px-3 py-2.5 text-xs font-bold text-white hover:bg-sky-800">Terapkan % Induk</button></div>}<div className="overflow-x-auto"><table className="w-full min-w-[1530px] border-collapse text-xs"><thead className="bg-slate-50 text-slate-600"><tr><th className="px-3 py-3 text-left">Kode</th><th className="px-3 py-3 text-left">Nama akun</th>{section==="Revenue"&&<th className="px-3 py-3 text-right">Alokasi sub-induk %</th>}<th className="px-3 py-3 text-right">{pnlView==="month"?"Actual (Rp)":"YTD Actual (Rp)"}</th><th className="px-3 py-3 text-right">Actual %</th><th className="px-3 py-3 text-right">{pnlView==="month"?"Budget (Rp)":"YTD Budget (Rp)"}</th><th className="px-3 py-3 text-right">Budget %</th><th className="px-3 py-3 text-right">Variance A−B</th><th className="px-3 py-3 text-right">Var %</th><th className="px-3 py-3 text-right">{pnlView==="month"?"Last Year Same Month":"Last Year YTD"}</th><th className="px-3 py-3 text-right">Variance A−LY</th><th className="px-3 py-3 text-right">Var % LY</th></tr></thead><tbody>{lines.map((line,i)=>{const row=form.accounts[line.code]||{actual:"",budget:"",lastYear:"",ytdActual:"",ytdBudget:"",lastYearYtd:""};const actualKey:keyof AccountValue=pnlView==="month"?"actual":"ytdActual";const budgetKey:keyof AccountValue=pnlView==="month"?"budget":"ytdBudget";const lastYearKey:keyof AccountValue=pnlView==="month"?"lastYear":"lastYearYtd";const actual=optional(row[actualKey]),budget=optional(row[budgetKey]),lastYear=optional(row[lastYearKey]);const variance=actual!==null&&budget!==null?actual-budget:null;const varianceLastYear=actual!==null&&lastYear!==null?actual-lastYear:null;const isIncomeGroup=["roomRevenue","fbRevenue","otherRevenue","otherIncome"].includes(line.group);const varianceIsFavorable=variance===null?null:(isIncomeGroup?variance>=0:variance<=0);const baseActual=pnlView==="month"?revenueActual:ytdRevenueActual;const baseBudget=pnlView==="month"?revenueBudget:ytdRevenueBudget;const baseLastYear=pnlView==="month"?revenueLastYear:ytdRevenueLastYear;return <Fragment key={line.code}>{section==="Revenue"&&(i===0||lines[i-1].group!==line.group)&&<tr className="bg-sky-100/80"><td colSpan={12} className="border-t border-sky-200 px-3 py-2 font-extrabold text-sky-950">{GROUP_LABELS[line.group]}<span className="ml-2 text-xs font-medium text-sky-800">({lines.filter(item=>item.group===line.group).length} akun)</span></td></tr>}<tr className={i%2?"bg-slate-50/70":"bg-white"}><td className="whitespace-nowrap border-t border-slate-100 px-2 py-2"><input aria-label={"Nomor akun "+line.label} className="w-24 rounded-md border border-slate-200 bg-white px-2 py-2 font-mono text-[11px] text-slate-700" value={line.code} onChange={e=>{const next=e.target.value;setForm(prev=>{if(!next.trim()||prev.accountLines.some(a=>a.code===next&&a.code!==line.code))return prev;const accounts={...prev.accounts};const val=accounts[line.code]||{actual:"",budget:"",lastYear:"",ytdActual:"",ytdBudget:"",lastYearYtd:""};delete accounts[line.code];accounts[next]=val;return {...prev,accounts,accountLines:prev.accountLines.map(a=>a.code===line.code?{...a,code:next}:a),customAccounts:(prev.customAccounts||[]).map(a=>a.code===line.code?{...a,code:next}:a)}})}} /></td><td className="max-w-[260px] border-t border-slate-100 px-2 py-2"><input aria-label={"Nama akun "+line.code} className="w-56 rounded-md border border-slate-200 bg-white px-2 py-2 text-xs font-semibold text-slate-700" value={line.label} onChange={e=>setForm(prev=>({...prev,accountLines:prev.accountLines.map(a=>a.code===line.code?{...a,label:e.target.value}:a),customAccounts:(prev.customAccounts||[]).map(a=>a.code===line.code?{...a,label:e.target.value}:a)}))} /></td>{section==="Revenue"&&<td className="border-t border-slate-100 px-2 py-2"><input aria-label={"Persentase alokasi "+line.label} type="number" min="0" max="100" step="0.01" className="w-24 rounded-md border border-slate-200 px-2 py-2 text-right" value={form.budgetAllocations?.childPercentByCode?.[line.code]||""} onChange={e=>setForm(prev=>({...prev,budgetAllocations:{parentPercentBySection:prev.budgetAllocations?.parentPercentBySection||{},childPercentByCode:{...(prev.budgetAllocations?.childPercentByCode||{}),[line.code]:e.target.value}}}))} placeholder="0–100"/></td>}<td className="border-t border-slate-100 px-2 py-2">{numberInput(row[actualKey],v=>updateAccount(line.code,actualKey,v),"—",!!line.allowNegative)}</td><td className="border-t border-slate-100 px-3 py-2 text-right tabular-nums">{percentOf(actual,baseActual)}</td><td className="border-t border-slate-100 px-2 py-2">{numberInput(row[budgetKey],v=>updateAccount(line.code,budgetKey,v),"—",!!line.allowNegative)}</td><td className="border-t border-slate-100 px-3 py-2 text-right tabular-nums">{percentOf(budget,baseBudget)}</td><td className={"border-t border-slate-100 px-3 py-2 text-right font-bold tabular-nums "+(varianceIsFavorable===null?"text-slate-300":varianceIsFavorable?"text-emerald-700":"text-rose-600")}>{variance===null?"—":fmt(variance,0)}</td><td className="border-t border-slate-100 px-3 py-2 text-right tabular-nums">{percentOf(variance,budget)}</td><td className="border-t border-slate-100 px-2 py-2">{numberInput(row[lastYearKey],v=>updateAccount(line.code,lastYearKey,v),"—",!!line.allowNegative)}</td><td className="border-t border-slate-100 px-3 py-2 text-right font-bold tabular-nums">{varianceLastYear===null?"—":fmt(varianceLastYear,0)}</td><td className="border-t border-slate-100 px-3 py-2 text-right tabular-nums">{percentOf(varianceLastYear,lastYear)}</td></tr></Fragment>;})}<tr className="border-t-2 border-sky-300 bg-sky-50 font-extrabold text-slate-900"><td colSpan={section==="Revenue"?3:2} className="px-3 py-3">TOTAL INDUK — {section}</td><td className="px-3 py-3 text-right tabular-nums">{money(lines.reduce((sum,line)=>sum+(optional(form.accounts[line.code]?.[pnlView==="month"?"actual":"ytdActual"]||"")??0),0))}</td><td className="px-3 py-3 text-right">—</td><td className="px-3 py-3 text-right tabular-nums">{money(lines.reduce((sum,line)=>sum+(optional(form.accounts[line.code]?.[pnlView==="month"?"budget":"ytdBudget"]||"")??0),0))}</td><td className="px-3 py-3 text-right">—</td><td className="px-3 py-3 text-right tabular-nums">{money(lines.some(line=>optional(form.accounts[line.code]?.[pnlView==="month"?"actual":"ytdActual"]||"")!==null)&&lines.some(line=>optional(form.accounts[line.code]?.[pnlView==="month"?"budget":"ytdBudget"]||"")!==null)?lines.reduce((sum,line)=>sum+(optional(form.accounts[line.code]?.[pnlView==="month"?"actual":"ytdActual"]||"")??0)-(optional(form.accounts[line.code]?.[pnlView==="month"?"budget":"ytdBudget"]||"")??0),0):null)}</td><td className="px-3 py-3 text-right">—</td><td className="px-3 py-3 text-right tabular-nums">{money(lines.reduce((sum,line)=>sum+(optional(form.accounts[line.code]?.[pnlView==="month"?"lastYear":"lastYearYtd"]||"")??0),0))}</td><td className="px-3 py-3 text-right">—</td><td className="px-3 py-3 text-right">—</td></tr></tbody></table></div></div>;})}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">{metric("Other Income",money(values.otherIncome),"")}{metric("Other Expenses & Below GOP",money(values.otherExpenses),"Subtotal akun terisi")}{metric("Owner Share Profit — sebelum pajak",money(values.ownerShareProfitBeforeTax),"GOP + other income − biaya setelah GOP sebelum pajak")}{metric("Net Owner Profit — estimasi",money(values.netProfit),"Owner Share Profit dikurangi income tax")}{metric("Owner Cash After CapEx — perlu data arus kas",money(values.ownerCashAfterCapex),"Belum dihitung: perlu arus kas operasi dan belanja modal yang direkonsiliasi")}</div>

            <div className="rounded-2xl border border-sky-200 bg-sky-50/70 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-extrabold text-slate-900">Kustomisasi akun P&amp;L</h3><p className="mt-1 text-xs leading-5 text-slate-600">Tambah nomor dan nama akun khusus. Pilih kelompok agar nilai masuk ke subtotal P&amp;L yang sesuai.</p></div>
                <button type="button" onClick={()=>{const code="CUSTOM-"+String(Date.now()).slice(-6);const line:AccountLine={code,label:"Akun Baru",group:"otherRevenue",section:"Akun Kustom"};setForm(prev=>({...prev,accountLines:[...prev.accountLines,line],customAccounts:[...(prev.customAccounts||[]),line],accounts:{...prev.accounts,[code]:{actual:"",budget:"",lastYear:"",ytdActual:"",ytdBudget:"",lastYearYtd:""}}}));}} className="rounded-xl bg-sky-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-sky-800">+ Tambah Nomor &amp; Nama Akun</button>
              </div>
              {(form.customAccounts||[]).map(account=><div key={account.code} className="mt-3 grid gap-3 rounded-xl border border-white bg-white p-3 sm:grid-cols-2 xl:grid-cols-4">
                <label className="text-xs font-bold text-slate-600">No. Akun<input className={inputClass+" mt-1"} value={account.code} onChange={e=>{const next=e.target.value;setForm(prev=>({...prev,accountLines:prev.accountLines.map(a=>a.code===account.code?{...a,code:next}:a),customAccounts:prev.customAccounts.map(a=>a.code===account.code?{...a,code:next}:a),accounts:(()=>{const accounts={...prev.accounts};const value=accounts[account.code]||{actual:"",budget:"",lastYear:"",ytdActual:"",ytdBudget:"",lastYearYtd:""};delete accounts[account.code];accounts[next]=value;return accounts})()}));}} /></label>
                <label className="text-xs font-bold text-slate-600">Nama Akun<input className={inputClass+" mt-1"} value={account.label} onChange={e=>setForm(prev=>({...prev,accountLines:prev.accountLines.map(a=>a.code===account.code?{...a,label:e.target.value}:a),customAccounts:prev.customAccounts.map(a=>a.code===account.code?{...a,label:e.target.value}:a)}))} /></label>
                <label className="text-xs font-bold text-slate-600">Kelompok<select className={inputClass+" mt-1"} value={account.group} onChange={e=>setForm(prev=>({...prev,accountLines:prev.accountLines.map(a=>a.code===account.code?{...a,group:e.target.value as AccountGroup,section:e.target.value==="roomRevenue"||e.target.value==="fbRevenue"||e.target.value==="otherRevenue"?"Revenue":e.target.value==="costOfSales"?"Cost of Sales":e.target.value==="payroll"?"Payroll & Related Expenses":e.target.value==="operatingExpenses"?"Departmental Operating Expenses":e.target.value==="overhead"?"Undistributed / Overhead Expenses":"Akun Kustom"}:a)}))}>{GROUP_ORDER.map(g=><option key={g} value={g}>{GROUP_LABELS[g]}</option>)}</select></label>
                <div className="grid grid-cols-2 gap-2"><label className="text-[11px] font-semibold text-slate-500">Actual<input type="number" className={inputClass+" mt-1 text-right"} value={form.accounts[account.code]?.actual||""} onChange={e=>updateAccount(account.code,"actual",e.target.value)} /></label><label className="text-[11px] font-semibold text-slate-500">Budget<input type="number" className={inputClass+" mt-1 text-right"} value={form.accounts[account.code]?.budget||""} onChange={e=>updateAccount(account.code,"budget",e.target.value)} /></label><label className="text-[11px] font-semibold text-slate-500">Last Year<input type="number" className={inputClass+" mt-1 text-right"} value={form.accounts[account.code]?.lastYear||""} onChange={e=>updateAccount(account.code,"lastYear",e.target.value)} /></label><label className="text-[11px] font-semibold text-slate-500">YTD Actual<input type="number" className={inputClass+" mt-1 text-right"} value={form.accounts[account.code]?.ytdActual||""} onChange={e=>updateAccount(account.code,"ytdActual",e.target.value)} /></label></div>
                <button type="button" onClick={()=>setForm(prev=>{const accounts={...prev.accounts};delete accounts[account.code];return {...prev,accounts,accountLines:prev.accountLines.filter(a=>a.code!==account.code),customAccounts:prev.customAccounts.filter(a=>a.code!==account.code)}})} className="justify-self-start rounded-xl border border-rose-200 px-3 py-2 text-sm font-bold text-rose-700">Hapus akun</button>
              </div>)}
            </div>
            <label className="flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm leading-5 text-sky-950"><input type="checkbox" className="mt-1 h-4 w-4 accent-sky-700" checked={form.confirmAccountReview} onChange={e=>setForm(prev=>({...prev,confirmAccountReview:e.target.checked}))}/><span><strong>Saya telah meninjau seluruh akun yang relevan.</strong> Baris kosong telah diperiksa dan memang tidak berlaku atau tidak memiliki nilai untuk periode ini. Saya memahami baris kosong tidak otomatis dianggap nol.</span></label>
          </div>}

          {activeTab==="forecast"&&<div className="space-y-7">
            <div className="rounded-2xl bg-teal-50 p-4 text-sm leading-6 text-teal-950">Isi langsung sel bulanan pada baris Occupancy, ADR, Food &amp; Beverage, Other Revenue, dan Total Operating Costs. Room Revenue, total revenue, RevPAR, dan total tahunan dihitung otomatis. Baris departemen yang belum memiliki input terpisah tetap —; angka tahunan dari P&amp;L tidak dibagi rata ke bulan.</div>
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
                        <td className="border-t border-slate-200 px-1 py-2 text-right tabular-nums">{line.inputKey&&(line.editable?.[i]??true)?numberInput(form.forecast.monthly[i][line.inputKey],value=>updateMonth(i,line.inputKey!,value)):display(v)}</td>
                        <td className="border-t border-slate-200 px-1 py-2 text-right tabular-nums">{line.base?percentOf(v,line.base[i]??null):"—"}</td>
                      </Fragment>)}
                      <td className="border-t border-slate-200 bg-teal-50 px-2 py-2 text-right font-bold tabular-nums">{display(line.total)}</td>
                      <td className="border-t border-slate-200 bg-teal-50 px-2 py-2 text-right font-bold tabular-nums">{line.totalPct===null||line.totalPct===undefined?"—":fmt(line.totalPct,1)+"%"}</td>
                    </tr>;
                  })}</tbody>
                </table>
              </div>
            </div>
                        <div className="rounded-2xl border border-indigo-100 bg-white p-4"><div className="mb-3"><h3 className="text-lg font-extrabold">10 YEARS CONSOLIDATED — {form.yearStart}–{Number(form.yearStart)+9}</h3><p className="mt-1 text-xs leading-5 text-slate-600">Format 10 tahun mengikuti 1 YEAR CONSOLIDATED: setiap tahun memiliki Value dan %, disertai Total. Isian sumber tetap dapat diedit; detail departemen yang belum tersedia ditampilkan sebagai —.</p></div><div className="overflow-x-auto rounded-xl border border-slate-200"><table className="w-full min-w-[1900px] border-collapse text-[10px]"><thead><tr className="bg-indigo-900 text-white"><th rowSpan={2} className="sticky left-0 z-10 min-w-[260px] bg-indigo-900 px-2 py-2 text-left">10 YEARS CONSOLIDATED</th>{form.forecast.annual.map(row=><th key={row.label} colSpan={2} className="px-1 py-2 text-center">YEAR {Number(row.label)-Number(form.yearStart)+1}</th>)}<th colSpan={2} className="bg-teal-700 px-2 py-2 text-center">TOTAL</th></tr><tr className="bg-slate-100 text-slate-600">{form.forecast.annual.map(row=><Fragment key={row.label}><th className="px-1 py-1 text-right">Value</th><th className="px-1 py-1 text-right">%</th></Fragment>)}<th className="bg-teal-50 px-2 py-1 text-right">Value</th><th className="bg-teal-50 px-2 py-1 text-right">%</th></tr></thead><tbody>{buildTenYearRows(form).map((line,ri)=>{if(line.section)return <tr key={line.label}><th colSpan={23} className="border-t border-slate-300 bg-slate-200 px-2 py-2 text-left font-black">{line.label}</th></tr>;const display=(v:number|null|undefined)=>v===null||v===undefined||!Number.isFinite(v)?"—":line.kind==="percent"?fmt(v,2)+"%":line.kind==="count"?fmt(v,0):money(v);return <tr key={line.label} className={line.label.startsWith("TOTAL REVENUES")||line.label.includes("GOP")||line.label.includes("PROFIT")?"bg-teal-50 font-extrabold":ri%2?"bg-slate-50":"bg-white"}><th className="sticky left-0 z-[1] border-t border-slate-200 bg-inherit px-2 py-1.5 text-left">{line.label}</th>{line.values.map((v,i)=><Fragment key={i}><td className="border-t border-slate-200 px-1 py-1.5 text-right tabular-nums">{line.inputKey?numberInput(form.forecast.annual[i][line.inputKey],value=>updateYear(i,line.inputKey!,value)):display(v)}</td><td className="border-t border-slate-200 px-1 py-1.5 text-right tabular-nums">{line.base?percentOf(v,line.base[i]??null):"—"}</td></Fragment>)}<td className="border-t border-slate-200 bg-teal-50 px-2 py-1.5 text-right font-bold tabular-nums">{display(line.total)}</td><td className="border-t border-slate-200 bg-teal-50 px-2 py-1.5 text-right font-bold tabular-nums">{line.totalPct===null?"—":fmt(line.totalPct,2)+"%"}</td></tr>;})}</tbody></table></div></div>
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
      <section className="mt-7 break-before-page"><h3 className="mb-1 text-sm font-extrabold">4. 10 YEARS CONSOLIDATED — {form.yearStart}–{Number(form.yearStart)+9}</h3><p className="mb-3 text-[10px] leading-4 text-slate-600">Data menggunakan sumber forecast 10 tahun yang sama dengan form. Value dan persentase menggunakan perhitungan yang sama; rincian departemen yang belum diinput tetap —.</p><div className="overflow-x-auto"><table className="w-full min-w-[1900px] border-collapse text-[8px]"><thead><tr className="bg-indigo-900 text-white"><th rowSpan={2} className="sticky left-0 z-10 min-w-[260px] bg-indigo-900 px-2 py-2 text-left">10 YEARS CONSOLIDATED</th>{form.forecast.annual.map(row=><th key={row.label} colSpan={2} className="px-1 py-2 text-center">YEAR {Number(row.label)-Number(form.yearStart)+1}</th>)}<th colSpan={2} className="bg-teal-700 px-2 py-2 text-center">TOTAL</th></tr><tr className="bg-slate-100 text-slate-600">{form.forecast.annual.map(row=><Fragment key={row.label}><th className="px-1 py-1 text-right">Value</th><th className="px-1 py-1 text-right">%</th></Fragment>)}<th className="bg-teal-50 px-2 py-1 text-right">Value</th><th className="bg-teal-50 px-2 py-1 text-right">%</th></tr></thead><tbody>{buildTenYearRows(form).map((line,ri)=>{if(line.section)return <tr key={line.label} className="bg-slate-200"><th colSpan={23} className="border-t border-slate-300 px-2 py-1.5 text-left font-black">{line.label}</th></tr>;const display=(v:number|null|undefined)=>v===null||v===undefined||!Number.isFinite(v)?"—":line.kind==="percent"?fmt(v,2)+"%":line.kind==="count"?fmt(v,0):money(v);return <tr key={line.label} className={line.label.startsWith("TOTAL REVENUES")||line.label.includes("GOP")||line.label.includes("PROFIT")?"bg-teal-50 font-extrabold":ri%2?"bg-slate-50":"bg-white"}><th className="sticky left-0 z-[1] border-t border-slate-200 bg-inherit px-2 py-1.5 text-left">{line.label}</th>{line.values.map((v,i)=><Fragment key={i}><td className="border-t border-slate-200 px-1 py-1.5 text-right tabular-nums">{display(v)}</td><td className="border-t border-slate-200 px-1 py-1.5 text-right tabular-nums">{line.base?percentOf(v,line.base[i]??null):"—"}</td></Fragment>)}<td className="border-t border-slate-200 bg-teal-50 px-2 py-1.5 text-right font-bold tabular-nums">{display(line.total)}</td><td className="border-t border-slate-200 bg-teal-50 px-2 py-1.5 text-right font-bold tabular-nums">{line.totalPct===null?"—":fmt(line.totalPct,2)+"%"}</td></tr>;})}</tbody></table></div></section>
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
