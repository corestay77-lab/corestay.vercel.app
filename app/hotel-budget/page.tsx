"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/lib/supabase";
import { ACCOUNT_LINES, ACCOUNT_SECTIONS, GROUP_LABELS, GROUP_ORDER, calculateBudget, emptyAccounts, numeric, sumGroup, type AccountValue, type AccountLine, type AccountGroup } from "@/lib/hotel-budget-final";

type AdditionalMeetingRoom = { id:string; name:string; units:string; eventsPerYear?:string; paxPerUnit:string; coverPercent:string; method?:"event"|"covers"|"transactions"|"direct"; volumePerDay?:string; averageCheck?:string; operatingDays?:string; annualRevenue?:string };
type FbEventRevenueSubcategory = { id:string; name:string; eventsPerYear:string; guestsPerEvent:string; revenuePerGuest:string; };
type FbMonthlyInput = { restaurantRevenue:string; meetingRoomARevenue:string; meetingRoomBRevenue:string; ballroomRevenue:string; additionalMeetingRevenue:string; historicalRestaurantRevenue:string; historicalMeetingRoomARevenue:string; historicalMeetingRoomBRevenue:string; historicalBallroomRevenue:string; historicalAdditionalMeetingRevenue:string; note:string };
const emptyFbMonthlyInput = ():FbMonthlyInput => ({restaurantRevenue:"",meetingRoomARevenue:"",meetingRoomBRevenue:"",ballroomRevenue:"",additionalMeetingRevenue:"",historicalRestaurantRevenue:"",historicalMeetingRoomARevenue:"",historicalMeetingRoomBRevenue:"",historicalBallroomRevenue:"",historicalAdditionalMeetingRevenue:"",note:""});
type Statistics = { fbBanquetEventsPerYear:string; fbBanquetGuestsPerEvent:string; fbBanquetRevenuePerGuest:string; fbRoomServiceOrdersPerDay:string; fbRoomServiceAverageOrderValue:string; fbOtherRevenueMethod:"direct"|"driver"; fbOtherAnnualRevenue:string; fbOtherDriverVolumePerDay:string; fbOtherDriverAverageCheck:string; fbOtherDriverOperatingDays:string; days: string; rooms: string; outInventory: string; houseUse: string; outOfOrder: string; complimentary: string; roomPaid: string; occupancy: string; exchangeRate: string; averageSellingRate: string; modBusinessCenterRevenue: string; modRentCarRevenue: string; modMassageRevenue: string; modLaundryRevenue: string; modTelephoneRevenue: string; modSportRecreationRevenue: string; modRentedSpaceRevenue: string; modOtherIncomeRevenue: string; modOtherRevenueDiscounts: string; fbRestaurantAnnualRevenue: string; fbMeetingEventAnnualRevenue: string; fbAverageGuestsPerRoom: string; fbLengthOfStay: string; fbRestaurantCoverPercent: string; fbAverageBreakfastCheck: string; fbMeetingRoomAUnits: string; fbMeetingRoomAEventsPerYear: string; fbMeetingRoomAPax: string; fbMeetingRoomACoverPercent: string; fbMeetingRoomBUnits: string; fbMeetingRoomBEventsPerYear: string; fbMeetingRoomBPax: string; fbMeetingRoomBCoverPercent: string; fbMeetingRoomOperatingDays: string; fbBallroomCapacity: string; fbBallroomCoverPercent: string; fbBallroomEventsPerYear: string; fbAverageMeetingCheck: string; fbAdditionalMeetingRooms?: AdditionalMeetingRoom[]; fbEventRevenueSubcategories?: FbEventRevenueSubcategory[]; fbMonthlyInputs?: FbMonthlyInput[] };
type ForecastMonth = { smDetails?:Record<string,string>; agDetails?:Record<string,string>; hrdDetails?:Record<string,string>; modDetails?:Record<string,string>; fbDetails?:Record<string,string>; roomDivisionDetails?:Record<string,string>; pomecDetails?:Record<string,string>; label:string; occupancy:string; adr:string; fbRevenue:string; phoneRevenue:string; otherRevenue:string; fbCostOfSales:string; phoneCostOfSales:string; modCostOfSales:string; roomPayroll:string; fbPayroll:string; phonePayroll:string; modPayroll:string; roomOtherExpenses:string; fbOtherExpenses:string; phoneOtherExpenses:string; modOtherExpenses:string; agPayroll:string; smPayroll:string; hrdPayroll:string; pomecPayroll:string; agOtherExpenses:string; smOtherExpenses:string; hrdOtherExpenses:string; pomecOtherExpenses:string; energyCost:string; operatingCosts:string; basicManagementFee:string; otherManagementFee:string; insuranceGeneral:string; landLease:string; ownerInsurance:string; maintenanceFee:string; operatorSharePercent:string; ownerOtherExpenses:string };
type ForecastYear = { label: string; days: string; rooms: string; occupancy: string; adr: string; fbRevenue: string; otherRevenue: string; operatingCosts: string };
type PayrollEmployee = { id:string; department:string; position:string; headcount:string; basicSalary:string; medical:string; meal:string; ptkpAnnual:string; insuranceMonthly:string; otherMonthly:string };
type BudgetForm = {
  payrollEmployees?: PayrollEmployee[];
  hotelName: string; period: string; yearStart: string; statistics: Statistics;
  accounts: Record<string, AccountValue>;
  budgetAllocations?: { parentPercentBySection: Record<string,string>; childPercentByCode: Record<string,string> };
  accountLines: AccountLine[];
  customAccounts: AccountLine[];
  itemLabelOverrides?: Record<string,string>;
  forecast: { monthly: ForecastMonth[]; annual: ForecastYear[] };
  confirmAccountReview: boolean; notes: string; actionRecommendation: string; actionOwner: string; actionDue: string; actionTarget: string; actionStatus: string; actionProgress: string;
};
type SavedReport = { id: string; hotel_name: string; period_label: string; created_at: string; form_data: BudgetForm; calculated_data: any; validation_data: any };
const LOCAL_REPORTS_KEY = "corestay-hotel-budget-local-reports-v1";
const LOCAL_DRAFT_KEY = "corestay-hotel-budget-draft-v1";
const monthNames = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
const FB_BUDGET_GROUPS = [{title:"REVENUES",total:"TOTAL F & B REVENUE",rows:[["foodRevenue","FOOD"],["beverageRevenue","BEVERAGE"]]},{title:"COST OF SALES",total:"TOTAL COST OF SALES",rows:[["foodCost","FOOD"],["beverageCost","BEVERAGE"]]},{title:"PAYROLL & RELATED",total:"TOTAL PAYROLL & RELATED",rows:[["salaryWages","SALARY & WAGES"],["incomeTax","INCOME TAX"],["jamsostek","JAMSOSTEK"],["insurance","INSURANCE"],["thr","THR"],["mealAllowances","MEAL ALLOWANCES"],["medical","MEDICAL / ASKES"],["otherPayroll","OTHER PAYROLL COST"]]},{title:"PROV. OP. EQUIPMENT",total:"TOTAL PROV. OP. EQUIPT.",rows:[["glassware","GLASSWARE"],["chinaware","CHINAWARE"],["silverware","SILVERWARE"],["linen","LINEN"]]},{title:"OTHER EXPENSES",total:"TOTAL OTHER EXPENSES",rows:[["decoration","DECORATION"],["duesSubscription","DUES & SUBSCRIPTION"],["extermDisinfectant","EXTERM / DESINFECTANT"],["kitchenFuel","KITCHEN FUEL"],["laundry","LAUNDRY"],["miscellaneous","MISCELLANEOUS"],["spoilage","SPOILAGE"],["cleaningSupplies","CLEANING SUPPLIES"],["guestSupplies","GUEST SUPPLIES"],["printingStationery","PRINTING & STATIONERY"],["telephone","TELEPHONE"],["uniform","UNIFORM"],["utensil","UTENSIL"],["contractCleaning","CONTRACT CLEANING"]]}] as const;
const POMEC_LINES = [{key:"salaryWages",label:"SALARY & WAGES",group:"payroll"},{key:"incomeTax",label:"INCOME TAX",group:"payroll"},{key:"jamsostek",label:"JAMSOSTEK",group:"payroll"},{key:"insurance",label:"INSURANCE",group:"payroll"},{key:"thr",label:"THR (1 YEAR)",group:"payroll"},{key:"mealAllowances",label:"MEAL ALLOWANCES",group:"payroll"},{key:"medical",label:"MEDICAL / ASKES",group:"payroll"},{key:"otherPayroll",label:"OTHER PAYROLL COST",group:"payroll"},{key:"paintingDecoration",label:"PAINTING & DECORATION",group:"other"},{key:"engineeringSupplies",label:"ENGINEERING SUPPLIES & EQUIPMENT",group:"other"},{key:"bulbsLamp",label:"BULBS & LAMP",group:"other"},{key:"printingStationery",label:"PRINTING & STATIONERY",group:"other"},{key:"laundryUniform",label:"LAUNDRY UNIFORM",group:"other"},{key:"provisionUniform",label:"PROV. FOR UNIFORM",group:"other"},{key:"acMaintenance",label:"AC MAINTENANCE",group:"other"},{key:"buildingMaintenance",label:"BUILDING MAINTENANCE",group:"other"},{key:"electricityMaintenance",label:"ELECTRICITY MAINTENANCE",group:"other"},{key:"floorCovering",label:"FLOOR COVERING",group:"other"},{key:"furnitureFixtureRepair",label:"FURNITURE & FIXTURE REPAIRMENT",group:"other"},{key:"mechanicalElectricalMaintenance",label:"MECHANICAL & ELECTRICAL MAINT",group:"other"},{key:"kitchenEquipmentMaintenance",label:"KITCHEN EQUIPMENT MAINTENANCE",group:"other"},{key:"refrigeratorMaintenance",label:"REFRIGERATOR MAINTENANCE",group:"other"},{key:"automobileRepair",label:"AUTO MOBILE REPAIR & SERVICES",group:"other"},{key:"plumbingHeatingMaintenance",label:"PLUMBING/HEATING MAINTENANCE",group:"other"},{key:"removalWaste",label:"REMOVAL WASTE",group:"other"},{key:"others",label:"OTHERS",group:"other"},{key:"electricityConsumed",label:"ELECTRICITY CONSUMED",group:"energy"},{key:"waterConsumed",label:"WATER CONSUMED",group:"energy"},{key:"fuelDieselConsumed",label:"FUEL / DIESEL CONSUMED",group:"energy"}] as const;
const pomecValue=(row:ForecastMonth,key:string)=>optional(row.pomecDetails?.[key]||"");
const pomecTotal=(row:ForecastMonth,group:"payroll"|"other"|"energy")=>{const vals=POMEC_LINES.filter(x=>x.group===group&&!(group==="payroll"&&x.key==="incomeTax")).map(x=>pomecValue(row,x.key));return vals.some(v=>v!==null)?vals.reduce<number>((n,v)=>n+(v??0),0):null;};
const smOtherTotal=(row:ForecastMonth)=>{const vals=Object.entries(row.smDetails??{}).filter(([key])=>key!=="operatingDays").map(([,raw])=>optional(raw));return vals.some(v=>v!==null)?vals.reduce<number>((n,v)=>n+(v??0),0):null;};
const makeMonthly = (year:number):ForecastMonth[] => monthNames.map((label,i)=>({agDetails:{},hrdDetails:{},modDetails:{},fbDetails:{},roomDivisionDetails:{},pomecDetails:{},label:label+" "+year,occupancy:"",adr:"",fbRevenue:"",phoneRevenue:"",otherRevenue:"",fbCostOfSales:"",phoneCostOfSales:"",modCostOfSales:"",roomPayroll:"",fbPayroll:"",phonePayroll:"",modPayroll:"",roomOtherExpenses:"",fbOtherExpenses:"",phoneOtherExpenses:"",modOtherExpenses:"",agPayroll:"",smPayroll:"",hrdPayroll:"",pomecPayroll:"",agOtherExpenses:"",smOtherExpenses:"",hrdOtherExpenses:"",pomecOtherExpenses:"",energyCost:"",operatingCosts:"",basicManagementFee:"",otherManagementFee:"",insuranceGeneral:"",landLease:"",ownerInsurance:"",maintenanceFee:"",operatorSharePercent:"30",ownerOtherExpenses:""}));
const makeAnnual = (year: number): ForecastYear[] => Array.from({length:10},(_,i)=>{const y=year+i;return {label:String(y),days:String(y%4===0&&(y%100!==0||y%400===0)?366:365),rooms:"",occupancy:"",adr:"",fbRevenue:"",otherRevenue:"",operatingCosts:""};});
const makeBlank = (): BudgetForm => ({
  hotelName:"",period:"",yearStart:"2027",payrollEmployees:[],
  statistics:{fbBanquetEventsPerYear:"",fbBanquetGuestsPerEvent:"",fbBanquetRevenuePerGuest:"",fbRoomServiceOrdersPerDay:"",fbRoomServiceAverageOrderValue:"",fbOtherRevenueMethod:"direct",fbOtherAnnualRevenue:"",fbOtherDriverVolumePerDay:"",fbOtherDriverAverageCheck:"",fbOtherDriverOperatingDays:"",days:"30",rooms:"",outInventory:"",houseUse:"",outOfOrder:"",complimentary:"",roomPaid:"",occupancy:"",exchangeRate:"",averageSellingRate:"",modBusinessCenterRevenue:"",modRentCarRevenue:"",modMassageRevenue:"",modLaundryRevenue:"",modTelephoneRevenue:"",modSportRecreationRevenue:"",modRentedSpaceRevenue:"",modOtherIncomeRevenue:"",modOtherRevenueDiscounts:"",fbRestaurantAnnualRevenue:"",fbMeetingEventAnnualRevenue:"",fbAverageGuestsPerRoom:"",fbLengthOfStay:"",fbRestaurantCoverPercent:"",fbAverageBreakfastCheck:"",fbMeetingRoomAUnits:"",fbMeetingRoomAEventsPerYear:"",fbMeetingRoomAPax:"",fbMeetingRoomACoverPercent:"",fbMeetingRoomBUnits:"",fbMeetingRoomBEventsPerYear:"",fbMeetingRoomBPax:"",fbMeetingRoomBCoverPercent:"",fbMeetingRoomOperatingDays:"200",fbBallroomCapacity:"",fbBallroomCoverPercent:"",fbBallroomEventsPerYear:"",fbAverageMeetingCheck:"",fbAdditionalMeetingRooms:[],fbMonthlyInputs:Array.from({length:12},()=>emptyFbMonthlyInput())},
  accounts:emptyAccounts(),budgetAllocations:{parentPercentBySection:{},childPercentByCode:{}},accountLines:ACCOUNT_LINES,customAccounts:[],itemLabelOverrides:{},forecast:{monthly:makeMonthly(2027),annual:makeAnnual(2027)},
  confirmAccountReview:false,notes:"",actionRecommendation:"",actionOwner:"",actionDue:"",actionTarget:"",actionStatus:"Belum dimulai",actionProgress:"0"
});
const idr = (value: number | null | undefined) => value===null||value===undefined||!Number.isFinite(value) ? "—" : new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(value);
const fmt = (value: number | null | undefined, digits=2) => value===null||value===undefined||!Number.isFinite(value) ? "—" : new Intl.NumberFormat("id-ID",{maximumFractionDigits:digits}).format(value);
const formatWholeRupiah = (value: string | number | null | undefined) => { const n=typeof value==="number"?value:Number(String(value??"").replace(/[^0-9-]/g,"")); return Number.isFinite(n)&&String(value??"").trim()!=="" ? new Intl.NumberFormat("id-ID",{maximumFractionDigits:0}).format(n) : ""; };
const formatIncomeTax = (value: string | number | null | undefined) => { if(value===null||value===undefined||String(value).trim()==="") return ""; const n=typeof value==="number"?value:Number(String(value).trim().replace(/\./g,"").replace(",", ".")); return Number.isFinite(n)?new Intl.NumberFormat("id-ID",{minimumFractionDigits:0,maximumFractionDigits:2}).format(n):""; };
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
  const calculatedRoomRevenue=roomCount!==null&&occ!==null&&adr!==null?days*roomCount*occ/100*adr:null;
  const roomRevenue=optional(row.roomDivisionDetails?.roomRevenue)??calculatedRoomRevenue;
  const fb=optional(row.fbRevenue),phone=optional(row.phoneRevenue),other=optional(row.otherRevenue);
  const revenueParts=[roomRevenue,fb,phone,other].filter((v):v is number=>v!==null);
  const revenue=revenueParts.length?revenueParts.reduce((a,b)=>a+b,0):null;
  const costs=optional(row.operatingCosts);
  return {days,roomRevenue,revenue,costs,gop:revenue!==null&&costs!==null?revenue-costs:null};
};
const calculateFbStatisticsMonthly = (statistics:Statistics, year:number, monthIndex:number) => {
  if(!Number.isFinite(year))return null;
  const days=new Date(year,monthIndex+1,0).getDate();
  const yearDays=Array.from({length:12},(_,i)=>new Date(year,i+1,0).getDate()).reduce((sum,value)=>sum+value,0);
  const monthlyInputs=statistics.fbMonthlyInputs||[];
  const input=monthlyInputs[monthIndex];
  const historicalKeys=["historicalRestaurantRevenue","historicalMeetingRoomARevenue","historicalMeetingRoomBRevenue","historicalAdditionalMeetingRevenue"] as const;
  const histValues=historicalKeys.map(key=>monthlyInputs.map(row=>optional(row?.[key]??"")));
  const historyComplete=(values:(number|null)[])=>values.length===12&&values.every(value=>value!==null)&&values.reduce<number>((sum,value)=>sum+(value??0),0)>0;
  const weight=(index:number,values:(number|null)[])=>historyComplete(values)?(values[index]??0)/values.reduce<number>((sum,value)=>sum+(value??0),0):new Date(year,index+1,0).getDate()/yearDays;
  const distribute=(annual:number|null,kind:number)=>annual===null?null:monthIndex===11?Math.round(annual)-Array.from({length:11},(_,i)=>Math.round(annual*weight(i,histValues[kind]))).reduce((sum,value)=>sum+value,0):Math.round(annual*weight(monthIndex,histValues[kind]));
  const rooms=optional(statistics.rooms),occupancy=optional(statistics.occupancy),averageGuests=optional(statistics.fbAverageGuestsPerRoom),lengthOfStay=optional(statistics.fbLengthOfStay);
  const arrivals=rooms!==null&&occupancy!==null&&averageGuests!==null&&lengthOfStay!==null&&lengthOfStay>0?rooms*days*occupancy/100*averageGuests/lengthOfStay:null;
  const restaurantCovers=arrivals!==null&&optional(statistics.fbRestaurantCoverPercent)!==null?arrivals*(optional(statistics.fbRestaurantCoverPercent)??0)/100:null;
  const restaurantDriver=restaurantCovers!==null&&optional(statistics.fbAverageBreakfastCheck)!==null?restaurantCovers*(optional(statistics.fbAverageBreakfastCheck)??0):null;
  const directRestaurant=optional(statistics.fbRestaurantAnnualRevenue);
  const restaurantBase=directRestaurant!==null?distribute(directRestaurant,0):restaurantDriver;
  const legacyBanquetEvents=optional(statistics.fbBanquetEventsPerYear),legacyBanquetGuests=optional(statistics.fbBanquetGuestsPerEvent),legacyBanquetRate=optional(statistics.fbBanquetRevenuePerGuest);
  const eventSubcategories=statistics.fbEventRevenueSubcategories||[];
  const eventSubcategoryValues=eventSubcategories.map(item=>{const events=optional(item.eventsPerYear),guests=optional(item.guestsPerEvent),rate=optional(item.revenuePerGuest);return events!==null&&guests!==null&&rate!==null?events*guests*rate:null;});
  const banquetAnnual=eventSubcategories.length?eventSubcategoryValues.some(value=>value!==null)?eventSubcategoryValues.reduce<number>((sum,value)=>sum+(value??0),0):null:legacyBanquetEvents!==null&&legacyBanquetGuests!==null&&legacyBanquetRate!==null?legacyBanquetEvents*legacyBanquetGuests*legacyBanquetRate:null;
  const banquetBase=banquetAnnual!==null?distribute(banquetAnnual,1):null;
  const ordersPerDay=optional(statistics.fbRoomServiceOrdersPerDay),orderValue=optional(statistics.fbRoomServiceAverageOrderValue);
  const roomServiceBase=ordersPerDay!==null&&orderValue!==null?ordersPerDay*orderValue*days:null;
  const otherMethod=statistics.fbOtherRevenueMethod||"direct";
  const otherAnnual=otherMethod==="direct"?optional(statistics.fbOtherAnnualRevenue):(()=>{const volume=optional(statistics.fbOtherDriverVolumePerDay),check=optional(statistics.fbOtherDriverAverageCheck),operatingDays=optional(statistics.fbOtherDriverOperatingDays);return volume!==null&&check!==null&&operatingDays!==null?volume*check*operatingDays:null;})();
  const otherBase=otherAnnual!==null?distribute(otherAnnual,3):null;
  const baseline={restaurantRevenue:restaurantBase,meetingRoomARevenue:banquetBase,meetingRoomBRevenue:roomServiceBase,ballroomRevenue:null,additionalMeetingRevenue:otherBase};
  const manual=(key:keyof Pick<FbMonthlyInput,"restaurantRevenue"|"meetingRoomARevenue"|"meetingRoomBRevenue"|"additionalMeetingRevenue">,base:number|null)=>{const raw=input?.[key];return raw!==undefined&&raw.trim()!==""?optional(raw):base;};
  const restaurantRevenue=manual("restaurantRevenue",restaurantBase);
  const meetingRoomARevenue=manual("meetingRoomARevenue",banquetBase);
  const meetingRoomBRevenue=manual("meetingRoomBRevenue",roomServiceBase);
  const additionalMeetingRevenue=manual("additionalMeetingRevenue",otherBase);
  const historical={restaurantRevenue:optional(input?.historicalRestaurantRevenue??""),meetingRoomARevenue:optional(input?.historicalMeetingRoomARevenue??""),meetingRoomBRevenue:optional(input?.historicalMeetingRoomBRevenue??""),ballroomRevenue:null,additionalMeetingRevenue:optional(input?.historicalAdditionalMeetingRevenue??"")};
  const parts=[restaurantRevenue,meetingRoomARevenue,meetingRoomBRevenue,additionalMeetingRevenue].filter((v):v is number=>v!==null);
  return {days,arrivals,restaurantCovers,baseline,historical,restaurantRevenue,meetingRoomARevenue,meetingRoomBRevenue,ballroomRevenue:null,additionalMeetingRevenue,total:parts.length?parts.reduce((sum,v)=>sum+v,0):null,restaurantHistoryComplete:historyComplete(histValues[0]),meetingHistoryComplete:historyComplete(histValues[1])};
};
const calculateFbStatisticsAnnualBreakdown = (statistics:Statistics, year:number) => {
  const months=Array.from({length:12},(_,i)=>calculateFbStatisticsMonthly(statistics,year,i));
  const sum=(key:"restaurantRevenue"|"meetingRoomARevenue"|"meetingRoomBRevenue"|"ballroomRevenue"|"additionalMeetingRevenue")=>{
    const values=months.map(m=>m?.[key]??null);
    return values.some(v=>v!==null)?values.reduce<number>((total,v)=>total+(v??0),0):null;
  };
  const directRestaurant=optional(statistics.fbRestaurantAnnualRevenue), directMeeting=optional(statistics.fbMeetingEventAnnualRevenue);
  const calculatedRestaurant=sum("restaurantRevenue");
  const restaurant=calculatedRestaurant!==null?calculatedRestaurant:directRestaurant;
  const meetingParts=[sum("meetingRoomARevenue"),sum("meetingRoomBRevenue"),sum("ballroomRevenue"),sum("additionalMeetingRevenue")];
  const calculatedMeeting=meetingParts.some(v=>v!==null)?meetingParts.reduce<number>((total,v)=>total+(v??0),0):null;
  const meeting=calculatedMeeting;
  const banquet=sum("meetingRoomARevenue");
  const roomService=sum("meetingRoomBRevenue");
  const otherFb=sum("additionalMeetingRevenue");
  return {restaurant,meeting,total:meeting,banquet,roomService,otherFb};
};
const calculateFbStatisticsAnnual = (statistics:Statistics, year:number) => calculateFbStatisticsAnnualBreakdown(statistics,year).total;
// Step 1 MOD assumptions mirror the revenue accounts shown in the MOD Budget P&L.
// Annual IDR inputs are allocated by calendar-day share and mapped to the same account codes.
const calculateModStatisticsAnnual = (statistics:Statistics) => {
  const values=[statistics.modBusinessCenterRevenue,statistics.modRentCarRevenue,statistics.modLaundryRevenue,statistics.modMassageRevenue,statistics.modTelephoneRevenue,statistics.modSportRecreationRevenue,statistics.modRentedSpaceRevenue,statistics.modOtherIncomeRevenue,statistics.modOtherRevenueDiscounts].map(optional);
  return values.some(value=>value!==null)?values.reduce<number>((sum,value)=>sum+(value??0),0):null;
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
    const avgPresent=(a:(number|null)[])=>{const valid=a.filter((v):v is number=>v!==null);return valid.length?valid.reduce((x,y)=>x+y,0)/valid.length:null;};
  const pct=(v:number|null,b:number|null)=>v===null||b===null||b===0?null:v/b*100;
  const val=(row:ForecastMonth,key:keyof ForecastMonth)=>optional(String(row[key]??""));
  const monthly=(key:keyof ForecastMonth)=>(form.forecast.monthly.map(r=>val(r,key)));
  const pomecMonthly=(group:"payroll"|"other"|"energy")=>form.forecast.monthly.map(r=>group==="payroll"?(val(r,"pomecPayroll")??pomecTotal(r,group)):pomecTotal(r,group));
  const roomRevenue=months.map(m=>m.roomRevenue), fb=monthly("fbRevenue"), phone=monthly("phoneRevenue"), other=monthly("otherRevenue");
  const revenue=months.map(m=>m.revenue), revenueTotal=sumPresent(revenue);
  const unavailableRooms=[form.statistics.outInventory,form.statistics.houseUse,form.statistics.outOfOrder].map(optional);
  const unavailableTotal=unavailableRooms.some(v=>v!==null)?unavailableRooms.reduce<number>((sum,v)=>sum+(v??0),0):0;
  const statisticsDays=optional(form.statistics.days);
  const available=months.map(m=>roomCount===null?null:Math.max(0,roomCount*m.days-(unavailableTotal>0&&statisticsDays!==null&&statisticsDays>0?unavailableTotal*m.days/statisticsDays:unavailableTotal)));
  const occupancyAssumption=form.forecast.monthly.map(row=>optional(row.occupancy)??optional(form.statistics.occupancy));
  const occupied=months.map((m,i)=>available[i]===null||occupancyAssumption[i]===null?null:available[i]!*occupancyAssumption[i]!/100);
  const complimentaryAnnual=optional(form.statistics.complimentary);
  const complimentary=months.map(m=>complimentaryAnnual===null?null:complimentaryAnnual*m.days/months.reduce((sum,x)=>sum+x.days,0));
  const totalOccupied=months.map((m,i)=>occupied[i]===null&&complimentary[i]===null?null:(occupied[i]??0)+(complimentary[i]??0));
  const roomAvailableTotal=sumPresent(available), occupiedTotal=sumPresent(occupied), roomRevenueTotal=sumPresent(roomRevenue);
  const monthlyCost=(row:ForecastMonth)=>{
    // Sum entered cost buckets so source-budget totals appear even when the report
    // has not yet been split into every department line.
    const sumEntered=(keys:(keyof ForecastMonth)[])=>{const values=keys.map(key=>val(row,key));return values.some(v=>v!==null)?values.reduce<number>((total,v)=>total+(v??0),0):null;};
    const cos=sumEntered(["fbCostOfSales","phoneCostOfSales","modCostOfSales"]);
    const payroll=sumEntered(["roomPayroll","fbPayroll","phonePayroll","modPayroll"]);
    const deptOther=sumEntered(["roomOtherExpenses","fbOtherExpenses","phoneOtherExpenses","modOtherExpenses"]);
    const pomecPayrollDetail=pomecTotal(row,"payroll"),pomecOtherDetail=pomecTotal(row,"other"),pomecEnergyDetail=pomecTotal(row,"energy");
    const pomecPayrollValue=val(row,"pomecPayroll")??pomecPayrollDetail;
    const pomecOtherValue=pomecOtherDetail;
    const pomecEnergyValue=pomecEnergyDetail;
    const agPayrollTotal=sumEntered(["agPayroll","smPayroll","hrdPayroll"]);
    const smOtherDetail=smOtherTotal(row);
    const agOtherTotal=sumEntered(["agOtherExpenses","hrdOtherExpenses"]);
    const overheadPayroll=agPayrollTotal===null&&pomecPayrollValue===null?null:(agPayrollTotal??0)+(pomecPayrollValue??0);
    const overheadOther=agOtherTotal===null&&smOtherDetail===null&&pomecOtherValue===null&&pomecEnergyValue===null?null:(agOtherTotal??0)+(smOtherDetail??0)+(pomecOtherValue??0)+(pomecEnergyValue??0);
    const detailed=[cos,payroll,deptOther,overheadPayroll,overheadOther];
    const detailKeys:(keyof ForecastMonth)[]=["fbCostOfSales","phoneCostOfSales","modCostOfSales","roomPayroll","fbPayroll","phonePayroll","modPayroll","roomOtherExpenses","fbOtherExpenses","phoneOtherExpenses","modOtherExpenses","agPayroll","smPayroll","hrdPayroll","pomecPayroll","agOtherExpenses","hrdOtherExpenses","pomecOtherExpenses","energyCost"];
    const hasDetail=detailKeys.some(k=>val(row,k)!==null)||smOtherDetail!==null;
    const detailTotal=sumPresent(detailed);
    return {cos,payroll,deptOther,overheadPayroll,overheadOther,hasDetail,detailTotal,fallback:val(row,"operatingCosts")};
  };
  const costParts=form.forecast.monthly.map(monthlyCost);
  // A total operating-cost figure is valid only when every required cost bucket is present,
  // or when the user supplied an explicit total. Never turn missing cost buckets into zero.
  const totalOperatingCosts=costParts.map((c,i)=>c.detailTotal??c.fallback??(revenue[i]!==null?0:null));
  const deptIncome=form.forecast.monthly.map((r,i)=>{
    const room=roomRevenue[i], rp=val(r,"roomPayroll"), ro=val(r,"roomOtherExpenses");
    const f=fb[i], fc=val(r,"fbCostOfSales"), fp=val(r,"fbPayroll"), fo=val(r,"fbOtherExpenses");
    const ph=phone[i], pc=val(r,"phoneCostOfSales"), pp=val(r,"phonePayroll"), po=val(r,"phoneOtherExpenses");
    const mo=other[i], mc=val(r,"modCostOfSales"), mp=val(r,"modPayroll"), mx=val(r,"modOtherExpenses");
    // Profit-by-department uses the entered revenue minus any costs entered for that department.
    // Blank cost inputs remain visually blank in their own rows, but are treated as 0 only in this calculation
    // so a missing cost line does not suppress all downstream profit subtotals.
    return {
      room:room!==null?room-(rp??0)-(ro??0):null,
      fb:f!==null?f-(fc??0)-(fp??0)-(fo??0):null,
      // The source 1 Year Consolidated sheet has no Telephone cost-of-sales line.
      phone:ph!==null?ph-(pp??0)-(po??0):null,
      mod:mo!==null?mo-(mc??0)-(mp??0)-(mx??0):null
    };
  });
  // Department income can be derived from total revenue less the three
  // departmental cost buckets even when the costs have not been allocated
  // to every individual department line.
  // Subtotals add all entered amounts, even if other account lines are still blank.  // Missing source values remain blank and are never converted to zero in the report.
  const departmentalOperatingCost=costParts.map(c=>sumPresent([c.cos,c.payroll,c.deptOther]));
  const deptIncomeTotal=deptIncome.map(d=>sumPresent([d.room,d.fb,d.phone,d.mod]));
  // Keep blank account rows blank, but allow available entered values to flow through all calculated subtotals.
  // For derived profit calculations only, unentered cost/fee rows contribute 0 until a value is entered.
  // Do not calculate downstream profit from incomplete cost groups: a blank is unknown, not zero.
  const overheadTotal=costParts.map(c=>c.overheadPayroll!==null&&c.overheadOther!==null?c.overheadPayroll+c.overheadOther:null);
  const houseProfit=form.forecast.monthly.map((r,i)=>revenue[i]!==null?revenue[i]!-(totalOperatingCosts[i]??0):null);
  const basicFee=monthly("basicManagementFee");
  const goi=houseProfit.map((v,i)=>v!==null?v-(basicFee[i]??0):null);
  const nonOp=form.forecast.monthly.map((r)=>sumPresent([val(r,"otherManagementFee"),val(r,"insuranceGeneral")]));
  const gop=goi.map((v,i)=>v!==null&&nonOp[i]!==null?v-nonOp[i]!:null);
  // Owner expense subtotals must reflect entered monthly values even when GOP/revenue is not yet available.
  // OSP and NOSP remain unavailable until their profit basis can be calculated; never replace unknown profit with zero.
  const otherExpense=form.forecast.monthly.map((r)=>sumPresent([val(r,"landLease"),val(r,"ownerInsurance"),val(r,"maintenanceFee")]));
  const osp=gop.map((v,i)=>v!==null&&otherExpense[i]!==null?v-otherExpense[i]!:null);
  const totalOwnerExpenses=form.forecast.monthly.map((r)=>val(r,"ownerOtherExpenses"));
  const nosp=osp.map((v,i)=>v!==null?v-(totalOwnerExpenses[i]??0):null);
  const rows:ConsolidatedRow[]=[];
  const section=(label:string)=>rows.push({label,kind:"section",values:[]});
  const add=(label:string,values:(number|null)[],kind:ConsolidatedRow["kind"]="money",inputKey?:keyof Omit<ForecastMonth,"label">,total?:number|null,base?:(number|null)[],editable?:boolean[])=>{
    // Preserve unknowns as null so reports show an em dash instead of a false zero.
    const displayValues=values;
    const t=total===undefined
      ? (kind==="sum"||kind==="money"?sumPresent(displayValues):(kind==="avg"||kind==="percent"?avgPresent(displayValues):null))
      : total;
    // Cost and expense rows default to total hotel revenue; department income can use its own department revenue.
    const percentageBase=base??revenue;
    rows.push({label,values:displayValues,kind,inputKey,total:t,base:percentageBase,totalPct:percentageBase?pct(t,sumPresent(percentageBase)):null,editable});
  };
  section("REVENUES");
  add("ROOMS",roomRevenue,"money",undefined,roomRevenueTotal,revenue);
  add("FOOD & BEVERAGE",fb,"money","fbRevenue",sumPresent(fb),revenue);
  add("TELEPHONE & FACSIMILE",phone,"money","phoneRevenue",sumPresent(phone),revenue);
  add("MINOR OPERATING DEPARTMENT",other,"money","otherRevenue",sumPresent(other),revenue);
  add("TOTAL REVENUES (EXCL. TAX)",revenue,"sum",undefined,revenueTotal,revenue);
  section("COST OF SALES");
  add("Food & Beverage",monthly("fbCostOfSales"),"money","fbCostOfSales",undefined,fb);
  add("Telephone & Facsimile",monthly("phoneCostOfSales"),"money","phoneCostOfSales",undefined,phone);
  add("Minor Operating Department",monthly("modCostOfSales"),"money","modCostOfSales",undefined,other);
  add("TOTAL COST OF SALES",costParts.map(c=>c.cos),"sum",undefined,sumPresent(costParts.map(c=>c.cos)),revenue);
  section("PAYROLL & RELATED EXPENSES");
  add("ROOM DIVISION",monthly("roomPayroll"),"money","roomPayroll",undefined,roomRevenue);
  add("FOOD & BEVERAGE",monthly("fbPayroll"),"money","fbPayroll",undefined,fb);
  add("TELEPHONE",monthly("phonePayroll"),"money","phonePayroll",undefined,phone);
  add("MINOR OPERATING DEPT.",monthly("modPayroll"),"money","modPayroll",undefined,other);
  add("TOTAL PAYROLL & RELATED EXPENSES",costParts.map(c=>c.payroll),"sum",undefined,sumPresent(costParts.map(c=>c.payroll)),revenue);
  section("OTHER DEPARTMENT EXPENSES");
  add("ROOM DIVISION",monthly("roomOtherExpenses"),"money","roomOtherExpenses",undefined,roomRevenue);
  add("FOOD & BEVERAGE",monthly("fbOtherExpenses"),"money","fbOtherExpenses",undefined,fb);
  add("TELEPHONE & FACSIMILE",monthly("phoneOtherExpenses"),"money","phoneOtherExpenses",undefined,phone);
  add("MINOR OPERATING DEPT.",monthly("modOtherExpenses"),"money","modOtherExpenses",undefined,other);
  add("TOTAL OTHER DEPARTMENT EXPENSES",costParts.map(c=>c.deptOther),"sum",undefined,sumPresent(costParts.map(c=>c.deptOther)),revenue);
  add("DEPARTMENT OPERATING COST & EXPENSES",departmentalOperatingCost,"sum",undefined,sumPresent(departmentalOperatingCost),revenue);
  add("TOTAL OPERATING COSTS",totalOperatingCosts,"sum","operatingCosts",sumPresent(totalOperatingCosts),revenue,costParts.map(c=>c.detailTotal===null));
  section("DEPARTMENT INCOME");
  add("ROOM",deptIncome.map(d=>d.room),"money",undefined,sumPresent(deptIncome.map(d=>d.room)),roomRevenue);
  add("FOOD & BEVERAGE",deptIncome.map(d=>d.fb),"money",undefined,sumPresent(deptIncome.map(d=>d.fb)),fb);
  add("TELEPHONE & FACSIMILE",deptIncome.map(d=>d.phone),"money",undefined,sumPresent(deptIncome.map(d=>d.phone)),phone);
  add("MINOR OPERATING DEPARTMENT",deptIncome.map(d=>d.mod),"money",undefined,sumPresent(deptIncome.map(d=>d.mod)),other);
  add("TOTAL DEPARTMENT INCOME",deptIncomeTotal,"sum",undefined,sumPresent(deptIncomeTotal),revenue);
  section("OVERHEAD DEPARTMENT — PAYROLL & RELATED");
  add("ADMINISTRATION & GENERAL",monthly("agPayroll"),"money","agPayroll");
  add("SALES & MARKETING",monthly("smPayroll"),"money","smPayroll");
  add("HUMAN RESOURCES",monthly("hrdPayroll"),"money","hrdPayroll");
  add("POMEC & UTILITIES",pomecMonthly("payroll"),"money","pomecPayroll");
  add("TOTAL OVERHEAD PAYROLL",costParts.map(c=>c.overheadPayroll),"sum",undefined,sumPresent(costParts.map(c=>c.overheadPayroll)),revenue);
  section("OVERHEAD DEPARTMENT — OTHER EXPENSES");
  add("ADMINISTRATION & GENERAL",monthly("agOtherExpenses"),"money","agOtherExpenses");
  add("SALES & MARKETING",form.forecast.monthly.map(row=>smOtherTotal(row)),"money","smOtherExpenses",sumPresent(form.forecast.monthly.map(row=>smOtherTotal(row))),revenue);
  add("HUMAN RESOURCES",monthly("hrdOtherExpenses"),"money","hrdOtherExpenses");
  add("POMEC & UTILITIES",pomecMonthly("other"),"money","pomecOtherExpenses");
  add("ENERGY COST",pomecMonthly("energy"),"money","energyCost");
  // The source workbook’s “1 Year Consolidated” sheet shows only summarized Engineering and Energy Cost rows. Detailed POMEC accounts remain in their source/input area and are rolled into those summary totals; do not duplicate them in this consolidated statement.
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
  add("OTHER OWNER EXPENSES",monthly("ownerOtherExpenses"),"money","ownerOtherExpenses");
  add("TOTAL OWNER EXPENSES",totalOwnerExpenses,"sum",undefined,sumPresent(totalOwnerExpenses),revenue);
  add("NET OWNER SHARE PROFIT (NOSP)",nosp,"sum",undefined,sumPresent(nosp),revenue);
  add("NET OWNER SHARE PROFIT / UNIT",nosp.map((v)=>v!==null&&roomCount!==null&&roomCount>0?v/roomCount:null),"money",undefined,roomCount!==null&&roomCount>0&&sumPresent(nosp)!==null?sumPresent(nosp)!/roomCount:null);
  return rows;
};


const buildStatisticsSheetRows=(form:BudgetForm,menuConfig?:{hidden?:string[];labels?:Record<string,string>}):ConsolidatedRow[]=>{
  const hiddenMenus=menuConfig?.hidden??[];
  const menuLabels=menuConfig?.labels??{};
  const menuLabel=(id:string,fallback:string)=>menuLabels[id]?.trim()||fallback;
  const year=Number(form.yearStart);
  const months=form.forecast.monthly.map((row,i)=>({row,days:new Date(year,i+1,0).getDate(),calc:calcMonthly(row,year,i,form.statistics.rooms)}));
  const n=months.length;
  const stat=form.statistics;
  const roomCount=optional(stat.rooms);
  const occupancy=months.map(({row})=>optional(row.occupancy)??optional(stat.occupancy));
  const unavailable=[stat.outInventory,stat.houseUse,stat.outOfOrder].map(optional);
  const unavailableTotal=unavailable.some(v=>v!==null)?unavailable.reduce<number>((s,v)=>s+(v??0),0):null;
  const baseDays=optional(stat.days);
  const available=months.map(({days})=>roomCount===null?null:Math.max(0,roomCount*days-(unavailableTotal!==null&&baseDays!==null&&baseDays>0?unavailableTotal*days/baseDays:unavailableTotal??0)));
  const occupied=available.map((v,i)=>v===null||occupancy[i]===null?null:v*occupancy[i]!/100);
  const complimentaryAnnual=optional(stat.complimentary);
  const complimentary=months.map(({days})=>complimentaryAnnual===null?null:complimentaryAnnual*days/months.reduce((s,m)=>s+m.days,0));
  const roomRevenue=months.map(({row,calc},i)=>{
    const sourceRevenue=optional(row.roomDivisionDetails?.roomRevenue);
    if(sourceRevenue!==null)return sourceRevenue;
    if(calc.roomRevenue!==null)return calc.roomRevenue;
    const rate=optional(row.adr)??optional(stat.averageSellingRate);
    return available[i]!==null&&occupancy[i]!==null&&rate!==null
      ? available[i]!*occupancy[i]!/100*rate
      : null;
  });
  const exchange=months.map(()=>optional(stat.exchangeRate));
  const arr=months.map(({row},i)=>roomRevenue[i]!==null&&occupied[i]!==null&&occupied[i]!>0?roomRevenue[i]!/occupied[i]!:optional(row.adr)??optional(stat.averageSellingRate));
  const arrUsd=arr.map((v,i)=>v!==null&&exchange[i]!==null&&exchange[i]!>0?v/exchange[i]!:null);
  const avgGuests=months.map(()=>optional(stat.fbAverageGuestsPerRoom));
  const los=months.map(()=>optional(stat.fbLengthOfStay));
  // Guest counts include paid occupied rooms plus complimentary room nights when supplied.
  // Preserve blank results when occupied-room data or average guests/room is missing.
  const occupiedForGuests=occupied.map((v,i)=>v===null&&complimentary[i]===null?null:(v??0)+(complimentary[i]??0));
  const guests=occupiedForGuests.map((v,i)=>v!==null&&avgGuests[i]!==null?v*avgGuests[i]!:null);
  const arrivals=guests.map((v,i)=>v!==null&&los[i]!==null&&los[i]!>0?v/los[i]!:null);
  const restaurantCover=months.map(()=>optional(stat.fbRestaurantCoverPercent));
  const restaurantCovers=arrivals.map((v,i)=>v!==null&&restaurantCover[i]!==null?v*restaurantCover[i]!/100:null);
  const breakfastCheck=months.map(()=>optional(stat.fbAverageBreakfastCheck));
  const meetingCheck=months.map(()=>optional(stat.fbAverageMeetingCheck));
  const legacyMeetingDays=optional(stat.fbMeetingRoomOperatingDays),ballroomEvents=optional(stat.fbBallroomEventsPerYear);
  const yearDays=months.reduce((sum,m)=>sum+m.days,0);
  const meetingACovers=months.map(({days})=>{const events=optional(stat.fbMeetingRoomAEventsPerYear)??(optional(stat.fbMeetingRoomAUnits)!==null&&legacyMeetingDays!==null?optional(stat.fbMeetingRoomAUnits)!*legacyMeetingDays:null),p=optional(stat.fbMeetingRoomAPax),c=optional(stat.fbMeetingRoomACoverPercent);return events!==null&&p!==null&&c!==null&&yearDays>0?events*days/yearDays*p*c/100:null;});
  const meetingBCovers=months.map(({days})=>{const events=optional(stat.fbMeetingRoomBEventsPerYear)??(optional(stat.fbMeetingRoomBUnits)!==null&&legacyMeetingDays!==null?optional(stat.fbMeetingRoomBUnits)!*legacyMeetingDays:null),p=optional(stat.fbMeetingRoomBPax),c=optional(stat.fbMeetingRoomBCoverPercent);return events!==null&&p!==null&&c!==null&&yearDays>0?events*days/yearDays*p*c/100:null;});
  const ballroomCovers=months.map(({days})=>{const p=optional(stat.fbBallroomCapacity),c=optional(stat.fbBallroomCoverPercent),events=ballroomEvents!==null&&yearDays>0?ballroomEvents*days/yearDays:null;return p!==null&&c!==null&&events!==null?p*events*c/100:null;});
  const fbMonthly=months.map((_,i)=>calculateFbStatisticsMonthly(
    {...stat,occupancy:occupancy[i]===null?stat.occupancy:String(occupancy[i])},
    year,i
  ));
  const restaurantRevenue=months.map((_,i)=>fbMonthly[i]?.restaurantRevenue??null);
  const meetingARevenue=months.map((_,i)=>fbMonthly[i]?.meetingRoomARevenue??null);
  const meetingBRevenue=months.map((_,i)=>fbMonthly[i]?.meetingRoomBRevenue??null);
  const ballroomRevenue=months.map((_,i)=>fbMonthly[i]?.ballroomRevenue??null);
  const fbc=months.map(({row},i)=>optional(row.fbRevenue)??fbMonthly[i]?.total??null);
  const modAnnual=calculateModStatisticsAnnual(stat);
  const mod=months.map(({row,days})=>optional(row.otherRevenue)??(modAnnual===null?null:modAnnual*days/months.reduce((s,m)=>s+m.days,0)));
  const phone=months.map(({row})=>optional(row.phoneRevenue));
  const totalRevenue=months.map((_,i)=>[roomRevenue[i],fbc[i],phone[i],mod[i]].some(v=>v!==null)?[roomRevenue[i],fbc[i],phone[i],mod[i]].reduce<number>((s,v)=>s+(v??0),0):null);
  const revpar=roomRevenue.map((v,i)=>v!==null&&available[i]!==null&&available[i]!>0?v/available[i]!:null);
  const total=(values:(number|null)[])=>values.some(v=>v!==null)?values.reduce<number>((s,v)=>s+(v??0),0):null;
  const avg=(values:(number|null)[])=>{const valid=values.filter((v):v is number=>v!==null);return valid.length?valid.reduce((s,v)=>s+v,0)/valid.length:null;};
  const pct=(v:number|null,b:number|null)=>v===null||b===null||b===0?null:v/b*100;
  const add=(label:string,values:(number|null)[],kind:ConsolidatedRow["kind"]="money",yearTotal?:number|null)=>{
    const t=yearTotal===undefined?(kind==="sum"||kind==="money"?total(values):avg(values)):yearTotal;
    rows.push({label,kind,values,total:t});
  };
  const rows:ConsolidatedRow[]=[];
  const section=(label:string)=>rows.push({label,kind:"section",values:[]});
  const blanks=()=>Array.from({length:n},()=>null as number|null);
  const paidTotal=total(occupied), availableTotal=total(available), roomRevenueTotal=total(roomRevenue);
  const occPct=pct(paidTotal,availableTotal);
  section("01 · PERIODE & INVENTORI KAMAR");
  add("# OF DAYS",months.map(m=>m.days),"sum",months.reduce((s,m)=>s+m.days,0));
  add("# OF ROOMS",months.map(()=>roomCount),"avg",roomCount);
  add("INVENTORY YEAR (ROOMS × DAYS)",months.map(m=>roomCount===null?null:roomCount*m.days),"sum",roomCount===null?null:months.reduce((s,m)=>s+m.days,0)*roomCount);
  add("ROOMS AVAILABLE",available,"sum",availableTotal);
  add("ROOM PAID",occupied,"sum",paidTotal);
  add("COMPLIMENTARY ROOM NIGHTS",complimentary,"sum",complimentaryAnnual);
  add("OCCUPIED ROOMS (PAID + COMPLIMENTARY)",occupied.map((v,i)=>v===null&&complimentary[i]===null?null:(v??0)+(complimentary[i]??0)),"sum",total(occupied.map((v,i)=>v===null&&complimentary[i]===null?null:(v??0)+(complimentary[i]??0))));
  section("02 · KINERJA KAMAR");
  add("OCCUPANCY (%)",occupied.map((v,i)=>pct(v,available[i])),"percent",occPct);
  add("ROOM REVENUE - RP",roomRevenue,"sum",roomRevenueTotal);
  add("AVERAGE ROOM RATE (ARR) - RP",arr,"money",paidTotal!==null&&paidTotal>0&&roomRevenueTotal!==null?roomRevenueTotal/paidTotal:optional(stat.averageSellingRate));
  add("AVERAGE ROOM RATE (ARR) - USD",arrUsd,"money",arrUsd.some(v=>v!==null)?avg(arrUsd):null);
  add("ADR",arr,"money",paidTotal!==null&&paidTotal>0&&roomRevenueTotal!==null?roomRevenueTotal/paidTotal:optional(stat.averageSellingRate));
  add("REVPAR - RP",revpar,"money",availableTotal!==null&&availableTotal>0&&roomRevenueTotal!==null?roomRevenueTotal/availableTotal:null);
  add("EXCHANGE RATE US $ TO RP",exchange,"avg",optional(stat.exchangeRate));
  section("03 · TAMU & POLA MENGINAP");
  add("TOTAL GUESTS IN HOUSE",guests,"sum",total(guests));
  add("AVERAGE GUEST / ROOM",avgGuests,"avg",avg(avgGuests));
  add("LENGTH OF STAY",los,"avg",avg(los));
  add("# OF ARRIVALS",arrivals,"sum",total(arrivals));
  section("04 · F&B — COVERS & AVERAGE CHECK");
  add(`# OF COVERS - ${menuLabel("restaurant","Restaurant & Breakfast")}`,restaurantCovers,"sum",total(restaurantCovers));
  add(`# OF COVERS - ${menuLabel("meetingA","Meeting Room A")}`,meetingACovers,"sum",total(meetingACovers));
  add(`# OF COVERS - ${menuLabel("meetingB","Meeting Room B")}`,meetingBCovers,"sum",total(meetingBCovers));
  add(`# OF COVERS - ${menuLabel("ballroom","Ballroom")}`,ballroomCovers,"sum",total(ballroomCovers));
  add("TOTAL PAX FOR MEETING ROOM",meetingACovers.map((v,i)=>[v,meetingBCovers[i],ballroomCovers[i]].some(x=>x!==null)?[v,meetingBCovers[i],ballroomCovers[i]].reduce<number>((s,x)=>s+(x??0),0):null),"sum",total(meetingACovers.map((v,i)=>[v,meetingBCovers[i],ballroomCovers[i]].some(x=>x!==null)?[v,meetingBCovers[i],ballroomCovers[i]].reduce<number>((s,x)=>s+(x??0),0):null)));
  add(`${menuLabel("restaurant","Restaurant & Breakfast")} — AVERAGE CHECK / GUEST`,breakfastCheck,"money",avg(breakfastCheck));
  add(`${menuLabel("pricing","Average Check — Meeting & Event")} — AVERAGE CHECK / PAX`,meetingCheck,"money",avg(meetingCheck));
  section("05 · PENDAPATAN PER OUTLET");  add(`REVENUE — ${menuLabel("restaurant","Restaurant & Breakfast")} - RP`,restaurantRevenue,"sum",total(restaurantRevenue));
  add(`REVENUE — ${menuLabel("meetingA","Meeting Room A")} - RP`,meetingARevenue,"sum",total(meetingARevenue));
  add(`REVENUE — ${menuLabel("meetingB","Meeting Room B")} - RP`,meetingBRevenue,"sum",total(meetingBRevenue));
  add(`REVENUE — ${menuLabel("ballroom","Ballroom")} - RP`,ballroomRevenue,"sum",total(ballroomRevenue));
  add("TOTAL F&B REVENUE - RP",fbc,"sum",total(fbc));
  add("TOTAL MOD",mod,"sum",total(mod));
  add("TELEPHONE & FACSIMILE REVENUE",phone,"sum",total(phone));
  add("TOTAL REVENUE - RP",totalRevenue,"sum",total(totalRevenue));
  section("06 · RINCIAN PER KATEGORI KAMAR");
  add("INVENTORY ROOM CATEGORY 1 — AVAILABLE FOR SALE",blanks(),"sum",null);
  add("INVENTORY ROOM CATEGORY 2 — AVAILABLE FOR SALE",blanks(),"sum",null);
  add("INVENTORY ROOM CATEGORY 3 — AVAILABLE FOR SALE",blanks(),"sum",null);
  add("TOTAL AVAILABLE FOR SALE",blanks(),"sum",null);
  add("ARR — INVENTORY ROOM CATEGORY 1",blanks(),"money",null);
  add("ARR — INVENTORY ROOM CATEGORY 2",blanks(),"money",null);
  add("ARR — INVENTORY ROOM CATEGORY 3",blanks(),"money",null);
  add("TOTAL / AVERAGE ARR BY ROOM CATEGORY",blanks(),"money",null);
  section("07 · REKONSILIASI PENDAPATAN & KURS");
  add("REVENUE IN USD — ROOM CATEGORY 1",blanks(),"money",null);
  add("REVENUE IN USD — ROOM CATEGORY 2",blanks(),"money",null);
  add("REVENUE IN USD — ROOM CATEGORY 3",blanks(),"money",null);
  add("TOTAL REVENUE IN USD",roomRevenue.map((v,i)=>v!==null&&exchange[i]!==null&&exchange[i]!>0?v/exchange[i]!:null),"sum",roomRevenueTotal!==null&&optional(stat.exchangeRate)!==null&&optional(stat.exchangeRate)!>0?roomRevenueTotal/optional(stat.exchangeRate)!:null);
  add("REVENUE IN IDR — ROOM CATEGORY 1",blanks(),"money",null);
  add("REVENUE IN IDR — ROOM CATEGORY 2",blanks(),"money",null);
  add("REVENUE IN IDR — ROOM CATEGORY 3",blanks(),"money",null);
  add("TOTAL REVENUE IN IDR",roomRevenue,"sum",roomRevenueTotal);
  add("EXCHANGE RATE (ESTIMATED)",exchange,"avg",optional(stat.exchangeRate));
  const hiddenReportRows=new Set<string>();
  if(hiddenMenus.includes("restaurant")) [
    `# OF COVERS - ${menuLabel("restaurant","Restaurant & Breakfast")}`,
    `${menuLabel("restaurant","Restaurant & Breakfast")} — AVERAGE CHECK / GUEST`,
    `REVENUE — ${menuLabel("restaurant","Restaurant & Breakfast")} - RP`,
  ].forEach(label=>hiddenReportRows.add(label));
  if(hiddenMenus.includes("meetingA")) [`# OF COVERS - ${menuLabel("meetingA","Meeting Room A")}`,`REVENUE — ${menuLabel("meetingA","Meeting Room A")} - RP`].forEach(label=>hiddenReportRows.add(label));
  if(hiddenMenus.includes("meetingB")) [`# OF COVERS - ${menuLabel("meetingB","Meeting Room B")}`,`REVENUE — ${menuLabel("meetingB","Meeting Room B")} - RP`].forEach(label=>hiddenReportRows.add(label));
  if(hiddenMenus.includes("ballroom")) [`# OF COVERS - ${menuLabel("ballroom","Ballroom")}`,`REVENUE — ${menuLabel("ballroom","Ballroom")} - RP`].forEach(label=>hiddenReportRows.add(label));
  if(hiddenMenus.includes("pricing")) hiddenReportRows.add(`${menuLabel("pricing","Average Check — Meeting & Event")} — AVERAGE CHECK / PAX`);
  const visible=rows.filter(line=>!hiddenReportRows.has(line.label));
  const find=(test:(label:string)=>boolean)=>visible.find(line=>test(line.label));
  const byLabel=(label:string,source:ConsolidatedRow|null|undefined)=>source?{...source,label}:null;
  const wanted:(ConsolidatedRow|null)[]=[
    byLabel("# of Days",find(x=>x==="# OF DAYS")),
    byLabel("# of Rooms",find(x=>x==="# OF ROOMS")),
    byLabel("# of Arrivals",find(x=>x==="# OF ARRIVALS")),
    byLabel("Occupancy (%)",find(x=>x==="OCCUPANCY (%)")),
    byLabel("Rooms Available",find(x=>x==="ROOMS AVAILABLE")),
    byLabel("Occupied Rooms",find(x=>x==="ROOM PAID")),
    byLabel("Total Guests in House",find(x=>x==="TOTAL GUESTS IN HOUSE")),
    byLabel("Average Guest / Room",find(x=>x==="AVERAGE GUEST / ROOM")),
    byLabel("Length of Stay",find(x=>x==="LENGTH OF STAY")),
    byLabel("Average Room Rate (ARR) - RP",find(x=>x==="AVERAGE ROOM RATE (ARR) - RP")),
    byLabel("Average Room Rate (ARR) - USD",find(x=>x==="AVERAGE ROOM RATE (ARR) - USD")),
    byLabel("ROOM REVENUE - RP",find(x=>x==="ROOM REVENUE - RP")),
    byLabel("TOTAL F&B REVENUE - RP",find(x=>x==="TOTAL F&B REVENUE - RP")),
    byLabel("TOTAL MOD",find(x=>x==="TOTAL MOD")),
    byLabel("TOTAL REVENUE - RP",find(x=>x==="TOTAL REVENUE - RP")),
    byLabel("REVPAR - RP",find(x=>x==="REVPAR - RP")),
    byLabel("Exchange Rate",find(x=>x==="EXCHANGE RATE US $ TO RP")),

  ];
  return wanted.filter((line):line is ConsolidatedRow=>line!==null);
};

export default function HotelBudgetPage() {
  const [form,setForm]=useState<BudgetForm>(makeBlank);
  const [draftSavedAt,setDraftSavedAt]=useState("");
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
  const displayWarnings=warnings.filter(item=>!((/actual/i.test(item)&&/ytd/i.test(item)&&/dilewati|tidak disiapkan/i.test(item))||/nilai kosong.*tidak dianggap nol/i.test(item)));
  const [orchestrator,setOrchestrator]=useState<"idle"|"checking"|"passed"|"failed">("idle");
  const [summary,setSummary]=useState("");
  const [currency,setCurrency]=useState<"IDR"|"USD">("IDR");
  const [annualGrowthPct,setAnnualGrowthPct]=useState(2);
  const [tenYearMode,setTenYearMode]=useState<"growth"|"manual"|"driver">("growth");
  const [tenYearOverrides,setTenYearOverrides]=useState<Record<string,string>>({});
  const [driverAssumptions,setDriverAssumptions]=useState<Record<string,string>>({rooms:"",fnb:"",mod:"",costOfSales:"",payroll:"",departmentExpenses:"",overhead:""});
  const [expandedFbSection,setExpandedFbSection]=useState("restaurant");
  const [forecastRecalcKey,setForecastRecalcKey]=useState(0);
  const [editingFbSection,setEditingFbSection]=useState("");
  const [hiddenFbSections,setHiddenFbSections]=useState<string[]>([]);
  const [fbMenuLabels,setFbMenuLabels]=useState<Record<string,string>>({"restaurant":"Restaurant & Breakfast","meetingA":"Meeting Room A","meetingB":"Meeting Room B","ballroom":"Ballroom","pricing":"Average Check — Meeting & Event"});
  const lastAutoForecastRef=useRef<{monthly:ForecastMonth[];annual:ForecastYear[]}|null>(null);
  const money=(value:number|null|undefined)=>value===null||value===undefined||!Number.isFinite(value)?"—":new Intl.NumberFormat(currency==="IDR"?"id-ID":"en-US",{style:"currency",currency,maximumFractionDigits:currency==="IDR"?0:2}).format(value);

  const buildTenYearRows=(source:BudgetForm)=>{
    type R={label:string;section?:boolean;values:(number|null)[];total:number|null;base?:(number|null)[];totalPct:number|null;kind?:"section"|"sum"|"avg"|"percent"|"money";inputKey?:keyof Omit<ForecastMonth,"label">};
    const oneYearRows=buildConsolidatedRows(source);
    const growth=(yearIndex:number)=>Math.pow(1+annualGrowthPct/100,yearIndex);
    const sumPresent=(items:(number|null)[])=>items.some(v=>v!==null)?items.reduce<number>((sum,v)=>sum+(v??0),0):null;
    const averagePresent=(items:(number|null)[])=>{const valid=items.filter((v):v is number=>v!==null);return valid.length?valid.reduce((sum,v)=>sum+v,0)/valid.length:null;};
    const pct=(value:number|null,base:number|null)=>value===null||base===null||base===0?null:value/base*100;
    const yearCount=Math.max(10,source.forecast.annual.length);
    const rows:R[]=oneYearRows.map((line,index)=>{
      if(line.kind==="section")return {label:line.label,section:true,values:[],total:null,totalPct:null,kind:"section"};
      const firstYear=line.total===undefined?null:line.total;
      const values=Array.from({length:yearCount},(_,yearIndex)=>{
        if(firstYear===null)return null;
        if(line.kind==="percent")return firstYear;
        if(tenYearMode!=="driver"||yearIndex===0)return firstYear*growth(yearIndex);
        const label=line.label.toUpperCase();
        let driver:"rooms"|"fnb"|"mod"|"costOfSales"|"payroll"|"departmentExpenses"|"overhead"|null=null;
        if(label==="ROOMS"||label.includes("ROOM REVENUE"))driver="rooms";
        else if(label.includes("FOOD & BEVERAGE")||label.includes("F&B")||label.includes("FOOD REVENUE")||label.includes("BEVERAGE REVENUE"))driver="fnb";
        else if(label.includes("MINOR OPERATING")||label==="MOD")driver="mod";
        else if(label.includes("COST OF SALES"))driver="costOfSales";
        else if(label.includes("PAYROLL")||label.includes("SALARIES")||label.includes("WAGES"))driver="payroll";
        else if(label.includes("DEPARTMENT EXPENSE"))driver="departmentExpenses";
        else if(label.includes("OVERHEAD")||label.includes("ADMINISTRATION & GENERAL")||label.includes("SALES & MARKETING")||label.includes("HUMAN RESOURCES")||label.includes("POMEC")||label.includes("ENERGY COST"))driver="overhead";
        const raw=driver?driverAssumptions[driver]:"";
        // Blank driver assumptions explicitly fall back to the existing Simple Growth assumption, never to 0%.
        const rate=raw!==undefined&&raw.trim()!==""&&driver?Number(raw):annualGrowthPct;
        return Number.isFinite(rate)?firstYear*Math.pow(1+rate/100,yearIndex):null;
      });
      const baseYear1=line.base?sumPresent(line.base):null;
      const base=baseYear1===null?undefined:Array.from({length:yearCount},(_,yearIndex)=>baseYear1*growth(yearIndex));
      return {label:line.label,values,total:null,base,totalPct:null,kind:line.kind,inputKey:line.inputKey};
    });
    const find=(label:string,occurrence=0)=>{let seen=0;for(let i=0;i<rows.length;i++){if(rows[i].label===label&&!rows[i].section){if(seen===occurrence)return i;seen++;}}return -1;};
    const get=(label:string,year:number,occurrence=0):number|null=>{const i=find(label,occurrence);return i<0?null:rows[i].values[year]??null;};
    const put=(label:string,year:number,value:number|null,occurrence=0)=>{const i=find(label,occurrence);if(i>=0)rows[i].values[year]=value;};
    if(tenYearMode==="manual") rows.forEach((line,index)=>{
      if(!line.inputKey||line.label==="TOTAL OPERATING COSTS"||line.section)return;
      for(let year=1;year<yearCount;year++){
        const raw=tenYearOverrides[`${index}:${year}`];
        if(raw===undefined||raw.trim()==="")continue;
        const parsed=Number(raw);if(Number.isFinite(parsed))line.values[year]=parsed;
      }
    });
    for(let year=0;year<yearCount;year++){
      // Preserve YEAR 1 exactly as the current 1 Year Consolidated source; only recalculate projected years after manual overrides.
      if(year===0)continue;
      const revenueParts=[get("ROOMS",year),get("FOOD & BEVERAGE",year,0),get("TELEPHONE & FACSIMILE",year,0),get("MINOR OPERATING DEPARTMENT",year,0)];
      const revenue=sumPresent(revenueParts);put("TOTAL REVENUES (EXCL. TAX)",year,revenue);
      const cos=sumPresent([get("Food & Beverage",year,0),get("Telephone & Facsimile",year,0),get("Minor Operating Department",year,0)]);put("TOTAL COST OF SALES",year,cos);
      const payroll=sumPresent([get("ROOM DIVISION",year,0),get("FOOD & BEVERAGE",year,1),get("TELEPHONE",year,0),get("MINOR OPERATING DEPT.",year,0)]);put("TOTAL PAYROLL & RELATED EXPENSES",year,payroll);
      const deptOther=sumPresent([get("ROOM DIVISION",year,1),get("FOOD & BEVERAGE",year,2),get("TELEPHONE & FACSIMILE",year,1),get("MINOR OPERATING DEPT.",year,1)]);put("TOTAL OTHER DEPARTMENT EXPENSES",year,deptOther);
      const deptOperating=sumPresent([cos,payroll,deptOther]);put("DEPARTMENT OPERATING COST & EXPENSES",year,deptOperating);
      const overheadPayroll=sumPresent([get("ADMINISTRATION & GENERAL",year,0),get("SALES & MARKETING",year,0),get("HUMAN RESOURCES",year,0),get("POMEC & UTILITIES",year,0)]);put("TOTAL OVERHEAD PAYROLL",year,overheadPayroll);
      const overheadOther=sumPresent([get("ADMINISTRATION & GENERAL",year,1),get("SALES & MARKETING",year,1),get("HUMAN RESOURCES",year,1),get("POMEC & UTILITIES",year,1),get("ENERGY COST",year)]);put("TOTAL OVERHEAD OTHER EXPENSES",year,overheadOther);
      const overhead=sumPresent([overheadPayroll,overheadOther]);put("TOTAL OVERHEAD DEPARTMENT",year,overhead);
      const operatingCosts=sumPresent([deptOperating,overhead]);put("TOTAL OPERATING COSTS",year,operatingCosts);
      const houseProfit=revenue!==null&&operatingCosts!==null?revenue-operatingCosts:null;put("HOUSE PROFIT",year,houseProfit);
      const goi=houseProfit!==null?houseProfit-(get("BASIC MANAGEMENT FEE",year)??0):null;put("GROSS OPERATING INCOME",year,goi);
      const nonOp=sumPresent([get("MANAGEMENT FEES",year),get("INSURANCE GENERAL",year)]);put("TOTAL OTHER NON-OPERATING EXPENSES",year,nonOp);
      const gop=goi!==null&&nonOp!==null?goi-nonOp:null;put("GROSS OPERATING PROFIT (GOP)",year,gop);put("% GOP",year,pct(gop,revenue));
      const ownerCost=sumPresent([get("LAND LEASE / HOLD",year),get("INSURANCE",year),get("MAINTENANCE FEE (SERVICE CHARGE)",year)]);put("TOTAL OTHER EXPENSES",year,ownerCost);
      const osp=gop!==null&&ownerCost!==null?gop-ownerCost:null;put("OWNER SHARE PROFIT (OSP)",year,osp);
      const otherOwner=get("OTHER OWNER EXPENSES",year);put("TOTAL OWNER EXPENSES",year,otherOwner);put("NET OWNER SHARE PROFIT (NOSP)",year,osp!==null?osp-(otherOwner??0):null);
      const rooms=optional(source.statistics.rooms),nosp=get("NET OWNER SHARE PROFIT (NOSP)",year);put("NET OWNER SHARE PROFIT / UNIT",year,nosp!==null&&rooms!==null&&rooms>0?nosp/rooms:null);
    }
    return rows.map(line=>{
      if(line.section)return {...line,total:null,totalPct:null};
      const total=line.kind==="percent"?averagePresent(line.values):sumPresent(line.values);
      const base=line.base?sumPresent(line.base):null;
      return {...line,total,totalPct:pct(total,base)};
    });
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
    try {
      const raw=window.localStorage.getItem(LOCAL_DRAFT_KEY);
      if(raw){const draft=JSON.parse(raw);if(draft?.form&&typeof draft.form==="object"){setForm(draft.form as BudgetForm);if(draft.currency==="IDR"||draft.currency==="USD")setCurrency(draft.currency);if(Number.isFinite(draft.annualGrowthPct))setAnnualGrowthPct(draft.annualGrowthPct);if(draft.tenYearMode==="manual"||draft.tenYearMode==="growth"||draft.tenYearMode==="driver")setTenYearMode(draft.tenYearMode);if(draft.tenYearOverrides&&typeof draft.tenYearOverrides==="object")setTenYearOverrides(draft.tenYearOverrides as Record<string,string>);if(draft.driverAssumptions&&typeof draft.driverAssumptions==="object")setDriverAssumptions({...{rooms:"",fnb:"",mod:"",costOfSales:"",payroll:"",departmentExpenses:"",overhead:""},...draft.driverAssumptions});if(typeof draft.savedAt==="string")setDraftSavedAt(draft.savedAt);}}
    } catch {}
  },[]);

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
    const sourceOccupancy=optional(form.statistics.occupancy)??values.paidOccupancy;
    const sourceAdr=values.adr;
    // Budget room revenue plus a supplied ARR gives a derived occupancy.
    // If ARR is absent, use observed occupancy (when available) to derive the budget ADR.
    const occupancyFromBudget=roomBudget!==null&&enteredAdr!==null&&enteredAdr>0&&roomNightsAtFullOccupancy!==null
      ? roomBudget/(roomNightsAtFullOccupancy*enteredAdr)*100
      : null;
    // Explicit Step 1 occupancy is the forecast assumption; otherwise derive it from Budget Room Revenue and ARR, then use observed statistics.
    // ARR + Budget Room Revenue define forecast occupancy; observed occupancy is only the fallback when that basis is unavailable.
    const occupancy=occupancyFromBudget!==null?occupancyFromBudget:sourceOccupancy;
    const occupiedRoomNights=roomNightsAtFullOccupancy!==null&&occupancy!==null?roomNightsAtFullOccupancy*occupancy/100:null;
    const adr=enteredAdr!==null&&enteredAdr>0?enteredAdr:
      roomBudget!==null&&occupiedRoomNights!==null&&occupiedRoomNights>0?roomBudget/occupiedRoomNights:sourceAdr;    const budgetByLabel=(group:AccountGroup,predicate:(label:string)=>boolean)=>{
      const lines=allAccountLines.filter(line=>line.group===group&&predicate(line.label));
      const nums=lines.map(line=>optional(form.accounts[line.code]?.budget||"")).filter((v):v is number=>v!==null);
      return nums.length?nums.reduce((a,b)=>a+b,0):null;
    };
    const labelHas=(label:string,...terms:string[])=>{const normalized=label.toLowerCase();return terms.some(term=>normalized.includes(term.toLowerCase()));};
    const deptBudget={
      roomOther:budgetByLabel("operatingExpenses",label=>labelHas(label,"room department","front office","housekeeping")),
      fbOther:budgetByLabel("operatingExpenses",label=>labelHas(label,"f&b department","food & beverage","food and beverage")),
      modOther:budgetByLabel("operatingExpenses",label=>labelHas(label,"other departments","minor operating","mod department")),
      pomecOther:budgetByLabel("overhead",label=>labelHas(label,"engineering","pomec","maintenance")),
      energy:budgetByLabel("overhead",label=>labelHas(label,"energy cost","electricity","water consumed","fuel / diesel")),
      smOther:budgetByLabel("overhead",label=>labelHas(label,"sales & marketing","sales and marketing")),
      agOther:budgetByLabel("overhead",label=>labelHas(label,"administrative & general","administration & general","a&g")),
      hrdOther:budgetByLabel("overhead",label=>labelHas(label,"human resources","hrd"))
    };
    const payrollByLabel=(predicate:(label:string)=>boolean)=>budgetByLabel("payroll",predicate);
    const payrollBudget={
      fo:payrollByLabel(label=>labelHas(label,"front office")),
      hk:payrollByLabel(label=>labelHas(label,"housekeeping")),
      fb:payrollByLabel(label=>labelHas(label,"food & beverage","food and beverage")),
      pomec:payrollByLabel(label=>labelHas(label,"engineering","pomec","security")),
      sm:payrollByLabel(label=>labelHas(label,"sales & marketing","sales and marketing")),
      ag:payrollByLabel(label=>labelHas(label,"administrative & general","administration & general","finance / accounting","finance & accounting")),
      hrd:payrollByLabel(label=>labelHas(label,"human resources","hrd","recruitment","training")),
      mod:payrollByLabel(label=>labelHas(label,"minor operating dept","minor operating department","mod department"))
    };
    return {
      roomBudget,
      occupancy:occupancy!==null&&Number.isFinite(occupancy)?occupancy:null,
      adr:adr!==null&&Number.isFinite(adr)?adr:null,
      fb:(()=>{const fb=calculateFbStatisticsAnnualBreakdown(form.statistics,year);const parts=[fb.restaurant,fb.meeting].filter((value):value is number=>value!==null);return parts.length?parts.reduce((sum,value)=>sum+value,0):total(["fbRevenue"]);})(),
      other:(()=>{
        const statByCode:Record<string,number|null>={"41301":optional(form.statistics.modBusinessCenterRevenue),"41302":optional(form.statistics.modRentCarRevenue),"41303":optional(form.statistics.modLaundryRevenue),"41304":optional(form.statistics.modMassageRevenue),"41305":optional(form.statistics.modTelephoneRevenue),"41306":optional(form.statistics.modSportRecreationRevenue),"41307":optional(form.statistics.modRentedSpaceRevenue),"41308":optional(form.statistics.modOtherIncomeRevenue),"41309":optional(form.statistics.modOtherRevenueDiscounts)};
        const values=allAccountLines.filter(line=>line.group==="otherRevenue").map(line=>statByCode[line.code]??optional(form.accounts[line.code]?.budget||""));
        return values.some(value=>value!==null)?values.reduce<number>((sum,value)=>sum+(value??0),0):null;
      })(),
      costOfSales:total(["costOfSales"]),
      payroll:total(["payroll"]),
      operatingExpenses:total(["operatingExpenses"]),
      overhead:total(["overhead"]),
      deptBudget,
      payrollBudget,
      // Map Step 3 account-level POMEC values to the matching detail rows.
      // Unmapped detail rows stay blank; do not copy one aggregate into multiple rows.
      roomDivisionDetailBudget:{
        foSalary:budgetByLabel("payroll",label=>label.toLowerCase().includes("front office")&&label.toLowerCase().includes("salary & wages")),
        foIncomeTax:budgetByLabel("payroll",label=>label.toLowerCase().includes("front office")&&label.toLowerCase().includes("income tax")),
        foJamsostek:budgetByLabel("payroll",label=>label.toLowerCase().includes("front office")&&label.toLowerCase().includes("jamsostek")),
        foInsurance:budgetByLabel("payroll",label=>label.toLowerCase().includes("front office")&&label.toLowerCase().includes("insurance")),
        foBonus:budgetByLabel("payroll",label=>label.toLowerCase().includes("front office")&&label.toLowerCase().includes("bonus")),
        foMeal:budgetByLabel("payroll",label=>label.toLowerCase().includes("front office")&&label.toLowerCase().includes("meal allowance")),
        foMedical:budgetByLabel("payroll",label=>label.toLowerCase().includes("front office")&&label.toLowerCase().includes("medical")),
        foOtherPayroll:budgetByLabel("payroll",label=>label.toLowerCase().includes("front office")&&label.toLowerCase().includes("other payroll")),
        foDecoration:budgetByLabel("operatingExpenses",label=>label.toLowerCase().includes("front office")&&label.toLowerCase().includes("decoration")),
        foDues:budgetByLabel("operatingExpenses",label=>label.toLowerCase().includes("front office")&&label.toLowerCase().includes("dues")),
        foEntertainment:budgetByLabel("operatingExpenses",label=>label.toLowerCase().includes("front office")&&label.toLowerCase().includes("entertainment")),
        foWelcomeDrink:budgetByLabel("operatingExpenses",label=>label.toLowerCase().includes("front office")&&label.toLowerCase().includes("welcome drink")),
        foLaundry:budgetByLabel("operatingExpenses",label=>label.toLowerCase().includes("front office")&&label.toLowerCase().includes("laundry")),
        foMisc:budgetByLabel("operatingExpenses",label=>label.toLowerCase().includes("front office")&&label.toLowerCase().includes("miscellaneous")),
        foPostage:budgetByLabel("operatingExpenses",label=>label.toLowerCase().includes("front office")&&label.toLowerCase().includes("postage")),
        foReservation:budgetByLabel("operatingExpenses",label=>label.toLowerCase().includes("front office")&&label.toLowerCase().includes("reservation")),
        foGuestSupplies:budgetByLabel("operatingExpenses",label=>label.toLowerCase().includes("front office")&&label.toLowerCase().includes("guest supplies")),
        foCleaning:budgetByLabel("operatingExpenses",label=>label.toLowerCase().includes("front office")&&label.toLowerCase().includes("cleaning supplies")),
        foPrinting:budgetByLabel("operatingExpenses",label=>label.toLowerCase().includes("front office")&&label.toLowerCase().includes("printing")),
        foUniform:budgetByLabel("operatingExpenses",label=>label.toLowerCase().includes("front office")&&label.toLowerCase().includes("uniform")),
        hkSalary:budgetByLabel("payroll",label=>label.toLowerCase().includes("housekeeping")&&label.toLowerCase().includes("salary & wages")),
        hkIncomeTax:budgetByLabel("payroll",label=>label.toLowerCase().includes("housekeeping")&&label.toLowerCase().includes("income tax")),
        hkJamsostek:budgetByLabel("payroll",label=>label.toLowerCase().includes("housekeeping")&&label.toLowerCase().includes("jamsostek")),
        hkInsurance:budgetByLabel("payroll",label=>label.toLowerCase().includes("housekeeping")&&label.toLowerCase().includes("insurance")),
        hkThr:budgetByLabel("payroll",label=>label.toLowerCase().includes("housekeeping")&&label.toLowerCase().includes("thr")),
        hkMeal:budgetByLabel("payroll",label=>label.toLowerCase().includes("housekeeping")&&label.toLowerCase().includes("meal allowance")),
        hkMedical:budgetByLabel("payroll",label=>label.toLowerCase().includes("housekeeping")&&label.toLowerCase().includes("medical")),
        hkOtherPayroll:budgetByLabel("payroll",label=>label.toLowerCase().includes("housekeeping")&&label.toLowerCase().includes("other payroll")),
        hkChina:budgetByLabel("operatingExpenses",label=>label.toLowerCase().includes("housekeeping")&&label.toLowerCase().includes("china")),
        hkGlass:budgetByLabel("operatingExpenses",label=>label.toLowerCase().includes("housekeeping")&&label.toLowerCase().includes("glass")),
        hkSilver:budgetByLabel("operatingExpenses",label=>label.toLowerCase().includes("housekeeping")&&label.toLowerCase().includes("silver")),
        hkLinen:budgetByLabel("operatingExpenses",label=>label.toLowerCase().includes("housekeeping")&&label.toLowerCase().includes("linen")),
        hkDecoration:budgetByLabel("operatingExpenses",label=>label.toLowerCase().includes("housekeeping")&&label.toLowerCase().includes("decoration")),
        hkWelcomeDrink:budgetByLabel("operatingExpenses",label=>label.toLowerCase().includes("housekeeping")&&label.toLowerCase().includes("welcome drink")),
        hkCable:budgetByLabel("operatingExpenses",label=>label.toLowerCase().includes("housekeeping")&&label.toLowerCase().includes("cable")),
        hkLaundry:budgetByLabel("operatingExpenses",label=>label.toLowerCase().includes("housekeeping")&&label.toLowerCase().includes("laundry")),
        hkGuestSupplies:budgetByLabel("operatingExpenses",label=>label.toLowerCase().includes("housekeeping")&&label.toLowerCase().includes("guest supplies")),
        hkCleaning:budgetByLabel("operatingExpenses",label=>label.toLowerCase().includes("housekeeping")&&label.toLowerCase().includes("cleaning supplies")),
        hkAmenities:budgetByLabel("operatingExpenses",label=>label.toLowerCase().includes("housekeeping")&&label.toLowerCase().includes("amenities")),
        hkPrinting:budgetByLabel("operatingExpenses",label=>label.toLowerCase().includes("housekeeping")&&label.toLowerCase().includes("printing")),
        hkUniform:budgetByLabel("operatingExpenses",label=>label.toLowerCase().includes("housekeeping")&&label.toLowerCase().includes("uniform")),
        hkInternet:budgetByLabel("operatingExpenses",label=>label.toLowerCase().includes("housekeeping")&&label.toLowerCase().includes("internet")),
        hkPest:budgetByLabel("operatingExpenses",label=>label.toLowerCase().includes("housekeeping")&&label.toLowerCase().includes("pest"))
      },
      pomecDetailBudget:{
        salaryWages:budgetByLabel("payroll",label=>labelHas(label,"engineering")&&labelHas(label,"salary & wages")),
        incomeTax:budgetByLabel("payroll",label=>labelHas(label,"engineering")&&labelHas(label,"income tax")),
        jamsostek:budgetByLabel("payroll",label=>labelHas(label,"engineering")&&labelHas(label,"jamsostek")),
        insurance:budgetByLabel("payroll",label=>labelHas(label,"engineering")&&labelHas(label,"medical & insurance")),
        thr:budgetByLabel("payroll",label=>labelHas(label,"engineering")&&labelHas(label,"thr")),
        mealAllowances:budgetByLabel("payroll",label=>labelHas(label,"engineering")&&labelHas(label,"meal allowance")),
        medical:null,
        otherPayroll:budgetByLabel("payroll",label=>labelHas(label,"engineering")&&labelHas(label,"other payroll")),
        engineeringSupplies:budgetByLabel("overhead",label=>labelHas(label,"engineering")&&labelHas(label,"tools & supplies")),
        others:budgetByLabel("overhead",label=>labelHas(label,"engineering")&&labelHas(label,"repairs & maintenance")),
        electricityConsumed:budgetByLabel("overhead",label=>labelHas(label,"energy cost")&&labelHas(label,"electricity")),
        waterConsumed:budgetByLabel("overhead",label=>labelHas(label,"energy cost")&&labelHas(label,"water")),
        fuelDieselConsumed:budgetByLabel("overhead",label=>labelHas(label,"energy cost")&&labelHas(label,"gas & fuel"))
      },
      fbCostOfSales:budgetByLabel("costOfSales",label=>labelHas(label,"f&b cost of sales","food & beverage cost")),
      modCostOfSales:budgetByLabel("costOfSales",label=>labelHas(label,"other department cost of sales","minor operating cost of sales","mod cost of sales")),
      costs:total(["costOfSales","payroll","operatingExpenses","overhead"])
    };
  },[form.accounts,allAccountLines,values.occupancy,values.paidOccupancy,values.adr,form.statistics,form.yearStart]);
  useEffect(()=>{
    const startYear=Number(form.yearStart);
    if(!Number.isInteger(startYear)||startYear<1900||startYear>2200)return;
    const baseOccupancy=forecastSource.occupancy;
    const baseAdr=forecastSource.adr;
    const baseFb=forecastSource.fb;
    const baseOther=forecastSource.other;
    const activePayrollEmployees=(form.payrollEmployees||[]).filter(payrollHasInputs);const masterPayrollMonthly=activePayrollEmployees.length?activePayrollEmployees.reduce((sum,emp)=>sum+payrollCalc(emp).total,0):null;
    const baseCosts=forecastSource.costs!==null&&masterPayrollMonthly!==null?forecastSource.costs-(forecastSource.payroll??0)+masterPayrollMonthly*12:forecastSource.costs;
    const daysInYear=Number.isInteger(startYear)&&startYear>=1900&&startYear<=2200?(startYear%4===0&&(startYear%100!==0||startYear%400===0)?366:365):365;
    const budgetForCode=(code:string)=>optional(form.accounts[code]?.budget||"");
    const foodPct=optional(form.budgetAllocations?.parentPercentBySection?.["__fbFoodPercent"]||"70")??70;
    const beveragePct=optional(form.budgetAllocations?.parentPercentBySection?.["__fbBeveragePercent"]||"30")??30;
    const modRevenueCodes=[["businessCenterRevenue","41301"],["rentCarRevenue","41302"],["laundryRevenue","41303"],["spaRevenue","41304"],["telephoneRevenue","41305"],["sportRecreationRevenue","41306"],["rentedSpaceRevenue","41307"],["miscellaneousRevenue","41308"],["otherRevenueDiscounts","41309"]] as const;
    const rooms=optional(form.statistics.rooms);
    // Allocate annual totals by calendar days and make December absorb rounding remainders.
    // This keeps monthly totals exactly aligned with the annual forecast without changing Jan–Nov values.
    const allocateAnnual=(value:number|null):string[]=>{
      if(value===null)return monthNames.map(()=>"");
      const allocated=monthNames.map((_,i)=>Math.round(value*new Date(startYear,i+1,0).getDate()/daysInYear));
      allocated[11]=Math.round(value)-allocated.slice(0,11).reduce<number>((sum,amount)=>sum+amount,0);
      return allocated.map(String);
    };
    const roomMonthlyValues=allocateAnnual(forecastSource.roomBudget);
    const modAnnualValues:Record<string,number|null>=Object.fromEntries(modRevenueCodes.map(([key,code])=>{
      const statValue:Record<string,number|null>={"41301":optional(form.statistics.modBusinessCenterRevenue),"41302":optional(form.statistics.modRentCarRevenue),"41303":optional(form.statistics.modLaundryRevenue),"41304":optional(form.statistics.modMassageRevenue),"41305":optional(form.statistics.modTelephoneRevenue),"41306":optional(form.statistics.modSportRecreationRevenue),"41307":optional(form.statistics.modRentedSpaceRevenue),"41308":optional(form.statistics.modOtherIncomeRevenue),"41309":optional(form.statistics.modOtherRevenueDiscounts)};
      const sourceValue=statValue[code]??budgetForCode(code);
      return [key,sourceValue];
    }));
    const modMonthlyValues:Record<string,string[]>=Object.fromEntries(modRevenueCodes.map(([key])=>[key,allocateAnnual(modAnnualValues[key])]));
    const operatingCostMonthlyValues=allocateAnnual(baseCosts);
    const fbCostOfSalesMonthlyValues=allocateAnnual(forecastSource.fbCostOfSales);
    const modCostOfSalesMonthlyValues=allocateAnnual(forecastSource.modCostOfSales);
    const roomDivisionDetailMonthlyValues=Object.fromEntries(
      Object.entries(forecastSource.roomDivisionDetailBudget||{}).map(([key,value])=>[key,allocateAnnual(value)])
    ) as Record<string,string[]>;
    const pomecDetailMonthlyValues=Object.fromEntries(
      Object.entries(forecastSource.pomecDetailBudget||{}).map(([key,value])=>[key,allocateAnnual(value)])
    ) as Record<string,string[]>;
    // Reconcile monthly F&B allocation to the same rounded annual base used by Annual Forecast.
    // Keep Jan–Nov allocation unchanged; December absorbs only the rounding remainder.
    const fbMonthlyValues:(number|null)[]=baseFb===null?monthNames.map(()=>null):monthNames.map((_,i)=>Math.round(baseFb*new Date(startYear,i+1,0).getDate()/daysInYear));
    if(baseFb!==null)fbMonthlyValues[11]=Math.round(baseFb)-fbMonthlyValues.slice(0,11).reduce<number>((sum,value)=>sum+(value??0),0);
    const monthly=monthNames.map((label,index)=>{
      const days=new Date(startYear,index+1,0).getDate();
      const share=days/daysInYear;
      const foodShare=foodPct+beveragePct>0?foodPct/(foodPct+beveragePct):0.7;
      const fbMonth=fbMonthlyValues[index];
      const fbFood=fbMonth===null?"":String(Math.round(fbMonth*foodShare));
      const fbBeverage=fbMonth===null?"":String(fbMonth-Number(fbFood||0));
      const modDetails=Object.fromEntries(modRevenueCodes.map(([key])=>[key,modMonthlyValues[key][index]]));
      const modTotal=Object.values(modDetails).some(v=>v!=="")?String(Object.values(modDetails).reduce((sum,v)=>sum+(v===""?0:Number(v)),0)):baseOther===null?"":String(Math.round(baseOther*share));
      return {
        ...makeMonthly(startYear)[index],
        label:label+" "+startYear,
        occupancy:baseOccupancy===null?"":String(Math.round(baseOccupancy*100)/100),
        adr:baseAdr===null?"":String(Math.round(baseAdr*100)/100),
        roomDivisionDetails:{...Object.fromEntries(Object.entries(roomDivisionDetailMonthlyValues).map(([key,values])=>[key,values[index]])),roomRevenue:roomMonthlyValues[index]},
        fbDetails:{foodRevenue:fbFood,beverageRevenue:fbBeverage},
        modDetails:{...modDetails},
        fbRevenue:fbMonth===null?"":String(fbMonth),
        otherRevenue:modTotal,
        fbCostOfSales:fbCostOfSalesMonthlyValues[index],
        modCostOfSales:modCostOfSalesMonthlyValues[index],
        roomPayroll:forecastSource.payroll===null?"":String(Math.round(forecastSource.payroll*share)),
        roomOtherExpenses:forecastSource.deptBudget.roomOther===null?"":String(Math.round(forecastSource.deptBudget.roomOther*share)),
        fbOtherExpenses:forecastSource.deptBudget.fbOther===null?"":String(Math.round(forecastSource.deptBudget.fbOther*share)),
        modOtherExpenses:forecastSource.deptBudget.modOther===null?"":String(Math.round(forecastSource.deptBudget.modOther*share)),
        pomecOtherExpenses:forecastSource.deptBudget.pomecOther===null?"":String(Math.round(forecastSource.deptBudget.pomecOther*share)),
        energyCost:forecastSource.deptBudget.energy===null?"":String(Math.round(forecastSource.deptBudget.energy*share)),
        smOtherExpenses:forecastSource.deptBudget.smOther===null?"":String(Math.round(forecastSource.deptBudget.smOther*share)),
        agOtherExpenses:forecastSource.deptBudget.agOther===null?"":String(Math.round(forecastSource.deptBudget.agOther*share)),
        hrdOtherExpenses:forecastSource.deptBudget.hrdOther===null?"":String(Math.round(forecastSource.deptBudget.hrdOther*share)),
        operatingCosts:operatingCostMonthlyValues[index]
      };
    });
    const annual=Array.from({length:10},(_,index)=>{
      const year=startYear+index;
      const factor=Math.pow(1+annualGrowthPct/100,index);
      const grow=(value:number|null)=>value===null?"":String(Math.round(value*factor));
      // Apply the annual growth assumption once to room revenue through ADR; growing occupancy and ADR together would compound growth twice.
      const occ=baseOccupancy;
      return {
        label:String(year),
        days:String(year%4===0&&(year%100!==0||year%400===0)?366:365),
        rooms:rooms===null?"":String(rooms),
        occupancy:occ===null?"":String(Math.round(occ*100)/100),
        adr:grow(baseAdr),
        fbRevenue:grow(baseFb),
        otherRevenue:grow(baseOther),        operatingCosts:grow(baseCosts)
      };
    });
    const previousAuto=lastAutoForecastRef.current;
    lastAutoForecastRef.current={monthly,annual};
    const preserveManual=(current:string|undefined,previousGenerated:string|undefined,nextGenerated:string|undefined)=>previousGenerated!==undefined&&current!==previousGenerated?(current??""):(nextGenerated??"");
    const annualWithManualOverrides=annual.map((row,i)=>{
      const prior=form.forecast.annual[i]||makeAnnual(startYear)[i];
      const old=previousAuto?.annual[i];
      return {...row,
        days:preserveManual(prior.days,old?.days,row.days),
        rooms:preserveManual(prior.rooms,old?.rooms,row.rooms),
        occupancy:preserveManual(prior.occupancy,old?.occupancy,row.occupancy),
        adr:preserveManual(prior.adr,old?.adr,row.adr),
        fbRevenue:preserveManual(prior.fbRevenue,old?.fbRevenue,row.fbRevenue),
        otherRevenue:preserveManual(prior.otherRevenue,old?.otherRevenue,row.otherRevenue),
        operatingCosts:preserveManual(prior.operatingCosts,old?.operatingCosts,row.operatingCosts)
      };
    });
    setForm(prev=>{
      const monthlyWithDetails=monthly.map((row,i)=>{
        const monthShare=new Date(startYear,i+1,0).getDate()/daysInYear;
        const prior=prev.forecast.monthly[i]||makeMonthly(startYear)[i];
        const agDetails=prior.agDetails||{},modDetails=prior.modDetails||{},fbDetails=prior.fbDetails||{},roomDivisionDetails=prior.roomDivisionDetails||{},pomecDetails=prior.pomecDetails||{},hrdDetails=prior.hrdDetails||{},smDetails=prior.smDetails||{};
        const has=(details:Record<string,string>)=>Object.values(details).some(v=>String(v??"").trim()!=="");
        const payrollEmployees=prev.payrollEmployees||[];const masterPayrollExists=payrollEmployees.length>0;
        const payrollTotal=(dept:string)=>{
          const aliases:Record<string,string[]>={FO:["FO","ROOM"],HRD:["HR","HRD","HUMAN RESOURCE","HUMAN RESOURCES","HUMAN RESOURCES DEPARTMENT"],MOD:["MOD","MINOR OPERATING DEPT","MINOR OPERATING DEPARTMENT"],AG:["AG","A&G","ADMINISTRATION & GENERAL","ADMINISTRATION AND GENERAL"],SM:["SM","S&M","SALES & MARKETING","SALES AND MARKETING"],POMEC:["POMEC","POMEC & UTILITIES","POMEC & UTILITIES MAINTENANCE DAN ENERGI","POMEC & UTILITIES MAINTENANCE AND ENERGY","SEC","SECURITY","ENG","ENGINEERING","SECURITY / ENGINEERING","SECURITY & ENGINEERING"]};
          const wanted=(aliases[dept]||[dept]).map(v=>v.toLowerCase());
          if(masterPayrollExists)return payrollEmployees.some(e=>wanted.includes(e.department.toLowerCase())&&payrollHasInputs(e))?String(payrollDepartmentMonthly(dept).total):"";
          const fallback:Record<string,number|null>={FO:forecastSource.payrollBudget.fo,HK:forecastSource.payrollBudget.hk,FB:forecastSource.payrollBudget.fb,MOD:forecastSource.payrollBudget.mod,AG:forecastSource.payrollBudget.ag,SM:forecastSource.payrollBudget.sm,HRD:forecastSource.payrollBudget.hrd,POMEC:forecastSource.payrollBudget.pomec};
          const value=fallback[dept];
          return value===null||value===undefined?"":String(Math.round(value*monthShare));
        };
        const foPayroll=payrollTotal("FO"),hkPayroll=payrollTotal("HK");
        const roomPayroll=(foPayroll!==""||hkPayroll!=="")?String(Number(foPayroll||0)+Number(hkPayroll||0)):"";
        const fbDetail=has(fbDetails),modDetail=has(modDetails),roomDetail=has(roomDivisionDetails),agDetail=has(agDetails),smDetail=has(smDetails),hrdDetail=has(hrdDetails),pomecDetail=has(pomecDetails);
        return {...row,
          occupancy:preserveManual(prior.occupancy,previousAuto?.monthly[i]?.occupancy,row.occupancy),
          adr:preserveManual(prior.adr,previousAuto?.monthly[i]?.adr,row.adr),
          fbRevenue:preserveManual(prior.fbRevenue,previousAuto?.monthly[i]?.fbRevenue,row.fbRevenue),
          fbCostOfSales:fbDetail?(prior.fbCostOfSales||row.fbCostOfSales):row.fbCostOfSales,
          fbOtherExpenses:fbDetail?(prior.fbOtherExpenses||row.fbOtherExpenses):row.fbOtherExpenses,
          otherRevenue:preserveManual(prior.otherRevenue,previousAuto?.monthly[i]?.otherRevenue,row.otherRevenue),
          operatingCosts:preserveManual(prior.operatingCosts,previousAuto?.monthly[i]?.operatingCosts,row.operatingCosts),
          modCostOfSales:modDetail?(prior.modCostOfSales||row.modCostOfSales):row.modCostOfSales,
          modOtherExpenses:modDetail?(prior.modOtherExpenses||row.modOtherExpenses):row.modOtherExpenses,
          roomOtherExpenses:roomDetail?(prior.roomOtherExpenses||row.roomOtherExpenses):row.roomOtherExpenses,
          agOtherExpenses:agDetail?(prior.agOtherExpenses||row.agOtherExpenses):row.agOtherExpenses,
          smOtherExpenses:smDetail?(prior.smOtherExpenses||row.smOtherExpenses):row.smOtherExpenses,
          hrdOtherExpenses:hrdDetail?(prior.hrdOtherExpenses||row.hrdOtherExpenses):row.hrdOtherExpenses,
          pomecOtherExpenses:pomecDetail?(prior.pomecOtherExpenses||row.pomecOtherExpenses):row.pomecOtherExpenses,
          energyCost:pomecDetail?(prior.energyCost||row.energyCost):row.energyCost,
          // Preserve any manually entered POMEC detail; otherwise fill each matching
          // detail line from its own Step 3 budget account, allocated by calendar days.
          pomecDetails:Object.fromEntries([...new Set([...Object.keys(pomecDetails),...Object.keys(pomecDetailMonthlyValues),...POMEC_LINES.filter(line=>line.group==="payroll").map(line=>line.key)])].map(key=>[
            key,
            POMEC_LINES.some(line=>line.group==="payroll"&&line.key===key)&&payrollEmployees.length>0
              ? payrollValueFor("POMEC",key)
              : String(pomecDetails[key]??"").trim()!==""?pomecDetails[key]:(pomecDetailMonthlyValues[key]?.[i]??"")
          ])),
          roomPayroll,
          fbPayroll:payrollTotal("FB"),
          modPayroll:payrollTotal("MOD"),
          agPayroll:payrollTotal("AG"),
          smPayroll:payrollTotal("SM"),
          hrdPayroll:payrollTotal("HRD"),
          pomecPayroll:payrollTotal("POMEC"),
          agDetails,modDetails:{...modDetails,...row.modDetails},fbDetails:{...fbDetails,...row.fbDetails},roomDivisionDetails:{...roomDivisionDetails,...row.roomDivisionDetails,roomRevenue:preserveManual(prior.roomDivisionDetails?.roomRevenue,previousAuto?.monthly[i]?.roomDivisionDetails?.roomRevenue,row.roomDivisionDetails?.roomRevenue)},hrdDetails,smDetails
        };
      });
      const sameMonthly=JSON.stringify(prev.forecast.monthly)===JSON.stringify(monthlyWithDetails);
      const sameAnnual=prev.forecast.annual.length===annualWithManualOverrides.length&&prev.forecast.annual.every((r,i)=>r.label===annualWithManualOverrides[i].label&&r.days===annualWithManualOverrides[i].days&&r.rooms===annualWithManualOverrides[i].rooms&&r.occupancy===annualWithManualOverrides[i].occupancy&&r.adr===annualWithManualOverrides[i].adr&&r.fbRevenue===annualWithManualOverrides[i].fbRevenue&&r.otherRevenue===annualWithManualOverrides[i].otherRevenue&&r.operatingCosts===annualWithManualOverrides[i].operatingCosts);
      if(sameMonthly&&sameAnnual)return prev;
      return {...prev,forecast:{monthly:monthlyWithDetails,annual:annualWithManualOverrides}};
    });
  },[forecastSource,form.yearStart,form.statistics.rooms,form.payrollEmployees,form.budgetAllocations,annualGrowthPct,forecastRecalcKey]);
  // Step 1 revenue outlets are the source of truth for matching Budget P&L Budget cells.
  // Only derived Budget values are updated; Actual, Last Year and YTD remain untouched.
  // The three Step 1 F&B revenue categories each sync to their own Step 3 Budget P&L account.
  // Budget is updated only; Actual, Last Year and YTD remain unchanged.
  useEffect(()=>{
    const fb=calculateFbStatisticsAnnualBreakdown(form.statistics,Number(form.yearStart));
    const year=Number(form.yearStart);
    const yearDays=Number.isInteger(year)&&year>=1900&&year<=2200?(year%4===0&&(year%100!==0||year%400===0)?366:365):365;
    const roomCount=optional(form.statistics.rooms);
    const roomOccupancy=optional(form.statistics.occupancy)??values.paidOccupancy;
    const roomArr=optional(form.statistics.averageSellingRate);
    const roomRevenueBudget=roomCount!==null&&roomCount>0&&roomOccupancy!==null&&roomArr!==null&&roomArr>0
      ?Math.round(roomCount*yearDays*roomOccupancy/100*roomArr):null;
    const sources:[string,number|null][]=[
      ["41101",roomRevenueBudget],
      ["41207",fb.banquet],
      ["41208",fb.roomService],
      ["41209",fb.otherFb],
      ["41301",optional(form.statistics.modBusinessCenterRevenue)],
      ["41302",optional(form.statistics.modRentCarRevenue)],
      ["41303",optional(form.statistics.modLaundryRevenue)],
      ["41304",optional(form.statistics.modMassageRevenue)],
      ["41305",optional(form.statistics.modTelephoneRevenue)],
      ["41306",optional(form.statistics.modSportRecreationRevenue)],
      ["41307",optional(form.statistics.modRentedSpaceRevenue)],
      ["41308",optional(form.statistics.modOtherIncomeRevenue)],
      ["41309",optional(form.statistics.modOtherRevenueDiscounts)]
    ];
    setForm(prev=>{
      let changed=false;
      const accounts={...prev.accounts};
      for(const [code,value] of sources){
        // Keep unsupported Step 1 outlets untouched; they remain available for manual entry.
        // Empty assumptions are not zero: preserve any existing Budget cell until a real value is calculated.
        // A blank Step 1 assumption must not erase a Budget value already entered in Step 2/3.
        if(value===null)continue;
        const raw=value===null?"":String(Math.round(value));
        const current=accounts[code]||{actual:"",budget:"",lastYear:"",ytdActual:"",ytdBudget:"",lastYearYtd:""};
        if(current.budget!==raw){
          accounts[code]={...current,budget:raw};
          changed=true;
        }
      }
      return changed?{...prev,accounts}:prev;
    });
  },[form.statistics,form.yearStart,values.paidOccupancy]);
  const revenueActual=totalColumn(["roomRevenue","fbRevenue","otherRevenue"],form.accounts,"actual",allAccountLines);
  const revenueBudget=totalColumn(["roomRevenue","fbRevenue","otherRevenue"],form.accounts,"budget",allAccountLines);
  const revenueLastYear=totalColumn(["roomRevenue","fbRevenue","otherRevenue"],form.accounts,"lastYear",allAccountLines);
  const costActual=totalColumn(["costOfSales","payroll","operatingExpenses","overhead"],form.accounts,"actual",allAccountLines);
  const costBudget=totalColumn(["costOfSales","payroll","operatingExpenses","overhead"],form.accounts,"budget",allAccountLines);
  const costLastYear=totalColumn(["costOfSales","payroll","operatingExpenses","overhead"],form.accounts,"lastYear",allAccountLines);
  const ytdRevenueActual=totalColumn(["roomRevenue","fbRevenue","otherRevenue"],form.accounts,"ytdActual",allAccountLines);
  const ytdRevenueBudget=totalColumn(["roomRevenue","fbRevenue","otherRevenue"],form.accounts,"ytdBudget",allAccountLines);
  const ytdRevenueLastYear=totalColumn(["roomRevenue","fbRevenue","otherRevenue"],form.accounts,"lastYearYtd",allAccountLines);
  const ytdCostActual=totalColumn(["costOfSales","payroll","operatingExpenses","overhead"],form.accounts,"ytdActual",allAccountLines);
  const ytdCostBudget=totalColumn(["costOfSales","payroll","operatingExpenses","overhead"],form.accounts,"ytdBudget",allAccountLines);
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
  const defaultFbEventSubcategories: FbEventRevenueSubcategory[] = [{id:"fb-event-banquet",name:"Banquet",eventsPerYear:"",guestsPerEvent:"",revenuePerGuest:""},{id:"fb-event-resto",name:"Resto",eventsPerYear:"",guestsPerEvent:"",revenuePerGuest:""},{id:"fb-event-meeting",name:"Meeting Room",eventsPerYear:"",guestsPerEvent:"",revenuePerGuest:""}];
  const fbEventSubcategories=form.statistics.fbEventRevenueSubcategories||defaultFbEventSubcategories;
  const updateFbEventSubcategory=(id:string,key:keyof Omit<FbEventRevenueSubcategory,"id">,value:string)=>setForm(prev=>{const items=prev.statistics.fbEventRevenueSubcategories||defaultFbEventSubcategories;return {...prev,statistics:{...prev.statistics,fbEventRevenueSubcategories:items.map(item=>item.id===id?{...item,[key]:value}:item)}};});
  const addFbEventSubcategory=()=>setForm(prev=>{const items=prev.statistics.fbEventRevenueSubcategories||defaultFbEventSubcategories;return {...prev,statistics:{...prev.statistics,fbEventRevenueSubcategories:[...items,{id:"fb-event-"+Date.now().toString(36),name:"Outlet baru",eventsPerYear:"",guestsPerEvent:"",revenuePerGuest:""}]}};});
  const removeFbEventSubcategory=(id:string)=>setForm(prev=>{const items=prev.statistics.fbEventRevenueSubcategories||defaultFbEventSubcategories;return {...prev,statistics:{...prev.statistics,fbEventRevenueSubcategories:items.filter(item=>item.id!==id)}};});
  const updateAdditionalMeetingRoom=(id:string,key:keyof Omit<AdditionalMeetingRoom,"id">,value:string)=>setForm(prev=>({...prev,statistics:{...prev.statistics,fbAdditionalMeetingRooms:(prev.statistics.fbAdditionalMeetingRooms||[]).map(room=>room.id===id?{...room,[key]:value}:room)}}));
  const updateFbMonthlyInput=(monthIndex:number,key:keyof FbMonthlyInput,value:string)=>setForm(prev=>{const inputs=Array.from({length:12},(_,i)=>({...emptyFbMonthlyInput(),...(prev.statistics.fbMonthlyInputs?.[i]||{})}));inputs[monthIndex]={...inputs[monthIndex],[key]:value};return {...prev,statistics:{...prev.statistics,fbMonthlyInputs:inputs}};});
  const addAdditionalMeetingRoom=()=>{const id="fb-meeting-"+Date.now().toString(36);setForm(prev=>({...prev,statistics:{...prev.statistics,fbAdditionalMeetingRooms:[...(prev.statistics.fbAdditionalMeetingRooms||[]),{id,name:"Outlet F&B tambahan",units:"",eventsPerYear:"",paxPerUnit:"20",coverPercent:"35",method:"event",volumePerDay:"",averageCheck:"",operatingDays:"",annualRevenue:""}]}}));setExpandedFbSection(id);};
  const removeAdditionalMeetingRoom=(id:string)=>setForm(prev=>({...prev,statistics:{...prev.statistics,fbAdditionalMeetingRooms:(prev.statistics.fbAdditionalMeetingRooms||[]).filter(room=>room.id!==id)}}));
  const updateRoomDivision=(monthIndex:number,key:string,value:string)=>setForm(prev=>({...prev,forecast:{...prev.forecast,monthly:prev.forecast.monthly.map((row,i)=>i===monthIndex?{...row,roomDivisionDetails:{...(row.roomDivisionDetails||{}),[key]:value}}:row)}}));
  const updateModDetail=(monthIndex:number,key:string,value:string)=>setForm(prev=>({...prev,forecast:{...prev.forecast,monthly:prev.forecast.monthly.map((row,i)=>{if(i!==monthIndex)return row;const details={...(row.modDetails||{}),[key]:value};const sum=(keys:string[])=>{const vals=keys.map(k=>details[k]===undefined||details[k]===""?null:Number(details[k])).filter((v):v is number=>v!==null&&Number.isFinite(v));return vals.length?String(vals.reduce((a,b)=>a+b,0)):"";};return {...row,modDetails:details,otherRevenue:sum(["businessCenterRevenue","rentCarRevenue","laundryRevenue","spaRevenue","telephoneRevenue","sportRecreationRevenue","rentedSpaceRevenue","miscellaneousRevenue","otherRevenueDiscounts"]),modCostOfSales:sum(["laundryCost"]),modPayroll:sum(["salaryWages","incomeTax","jamsostek","insurance","bonus","mealAllowances","medical","payrollOthers"]),modOtherExpenses:sum(["guestSupplies","paperSupplies","laundryValetSupplies","laundrySupplies","casual","cleaningSupplies","printingStationery","decoration","telephoneFax","laundryExpense","casualOther","laundryValetOther","cleaningOther","provisionUniform","pteb","uniform","otherExpenses"])};})}}));

  const updateModRevenueName=(key:"rentCarLabel"|"laundryLabel",value:string)=>setForm(prev=>({...prev,forecast:{...prev.forecast,monthly:prev.forecast.monthly.map(row=>({...row,modDetails:{...(row.modDetails||{}),[key]:value}}))}}));
  const updatePayrollEmployee=(id:string,key:keyof PayrollEmployee,value:string)=>setForm(prev=>({...prev,payrollEmployees:(prev.payrollEmployees||[]).map(emp=>emp.id===id?{...emp,[key]:value}:emp)}));
  const addPayrollEmployee=()=>setForm(prev=>({...prev,payrollEmployees:[...(prev.payrollEmployees||[]),{id:"pay-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,7),department:"FO",position:"",headcount:"",basicSalary:"",medical:"",meal:"",ptkpAnnual:"",insuranceMonthly:"",otherMonthly:""}]}));
  const removePayrollEmployee=(id:string)=>setForm(prev=>({...prev,payrollEmployees:(prev.payrollEmployees||[]).filter(emp=>emp.id!==id)}));
  const payrollHasInputs=(emp:PayrollEmployee)=>Number(emp.headcount)>0&&String(emp.basicSalary??"").trim()!=="";
   const payrollCalc=(emp:PayrollEmployee)=>{const n=(v:string)=>{let s=String(v??"").trim().replace(/[^0-9,.-]/g,"");if(!s)return 0;if(s.includes(",")&&s.includes(".")){s=s.lastIndexOf(",")>s.lastIndexOf(".")?s.replace(/\./g,"").replace(",","."):s.replace(/,/g,"");}else if(s.includes(",")){s=s.replace(",",".");}else if((s.match(/\./g)||[]).length>1||/\.\d{3}$/.test(s)){s=s.replace(/\./g,"");}const x=Number(s);return Number.isFinite(x)?x:0;};const count=Math.max(0,n(emp.headcount));const basic=n(emp.basicSalary),medical=n(emp.medical),meal=n(emp.meal),insurance=n(emp.insuranceMonthly),other=n(emp.otherMonthly);const thr=basic/12;const gross=basic+medical+meal+thr;const bpjsCompany=basic*.0489;const bpjsStaff=basic*.02;const grossAnnual=gross*12;const jobExpense=Math.min(grossAnnual*.05,6000000);const hasPtkp=String(emp.ptkpAnnual??"").trim()!=="";const ptkp=n(emp.ptkpAnnual);const pkp=hasPtkp?Math.max(0,Math.floor((grossAnnual-jobExpense-ptkp)/1000)*1000):0;const annualTax=(amount:number)=>{let left=amount,tax=0;const bands:[[number,number],[number,number],[number,number],[number,number],[number,number]]=[[60000000,.05],[190000000,.15],[250000000,.25],[4500000000,.30],[Infinity,.35]];for(const [cap,rate] of bands){const taxable=Math.min(left,cap);if(taxable>0)tax+=taxable*rate;left-=taxable;if(left<=0)break;}return tax;};const taxYear=hasPtkp?annualTax(pkp):0;const taxMonth=taxYear/12;
    // PPh 21 is withheld/remitted from employee income; it is not an extra employer cost
    // unless a separate gross-up/tax-borne-by-company policy is explicitly configured.
    const basicTotal=basic*count,medicalTotal=medical*count,mealTotal=meal*count,thrTotal=Math.round(thr*count),bpjsCompanyTotal=Math.round(bpjsCompany*count),bpjsStaffTotal=Math.round(bpjsStaff*count),grossTotal=basicTotal+medicalTotal+mealTotal+thrTotal,insuranceTotal=insurance*count,otherTotal=other*count;const total=grossTotal+bpjsCompanyTotal+insuranceTotal+otherTotal;return {count,hasPtkp,basic:basicTotal,medical:medicalTotal,thr:thrTotal,meal:mealTotal,bpjsCompany:bpjsCompanyTotal,bpjsStaff:bpjsStaffTotal,gross:grossTotal,ptkp:ptkp*count,jobExpense:jobExpense/12*count,pkp:pkp/12*count,pkpAnnual:pkp*count,taxYear:taxYear*count,taxMonth:taxMonth*count,insurance:insuranceTotal,other:otherTotal,total};};
  const payrollDepartmentAliases:Record<string,string[]>={FO:["FO"],HK:["HK"],FB:["FB","F&B","F & B","FOOD & BEVERAGE","FOOD AND BEVERAGE","FOOD & BEVERAGE DEPARTMENT"],MOD:["MOD","MINOR OPERATED DEPT","MINOR OPERATED DEPT.","MINOR OPERATED DEPARTMENT","MINOR OPERATING DEPT","MINOR OPERATING DEPT.","MINOR OPERATING DEPARTMENT"],AG:["AG","A&G","ADMINISTRATION & GENERAL","ADMINISTRATION AND GENERAL","EXECUTIVE / GENERAL AFFAIR","FN","FINANCE","FINANCE / ACCOUNTING","FINANCE & ACCOUNTING","ACCOUNTING"],FN:["FN","FINANCE","FINANCE / ACCOUNTING","ACCOUNTING"],HRD:["HR","HRD","HUMAN RESOURCE","HUMAN RESOURCES","HUMAN RESOURCES DEPARTMENT"],HR:["HR","HRD","HUMAN RESOURCE","HUMAN RESOURCES","HUMAN RESOURCES DEPARTMENT"],SEC:["SEC","SECURITY"],SM:["SM","S&M","SALES & MARKETING","SALES AND MARKETING"],ENG:["ENG","ENGINEERING"],POMEC:["POMEC","POMEC & UTILITIES","POMEC & UTILITIES MAINTENANCE DAN ENERGI","POMEC & UTILITIES MAINTENANCE AND ENERGY","SEC","SECURITY","ENG","ENGINEERING","SECURITY / ENGINEERING","SECURITY & ENGINEERING"],ROOM:["FO","HK"]};
  const payrollDepartmentMatches=(employee:PayrollEmployee,department:string)=>{const normalize=(value:string)=>String(value||"").trim().toUpperCase().replace(/\s+/g," ");const wanted=(payrollDepartmentAliases[department.toUpperCase()]||[department]).map(normalize);return wanted.includes(normalize(employee.department));};
  const payrollDepartmentHasInputs=(department:string)=>(form.payrollEmployees||[]).some(e=>payrollDepartmentMatches(e,department)&&payrollHasInputs(e));
  const payrollDepartmentMonthly=(department:string)=>{const employees=(form.payrollEmployees||[]).filter(e=>payrollDepartmentMatches(e,department)&&payrollHasInputs(e));return employees.reduce((acc,e)=>{const c=payrollCalc(e);acc.salary+=c.basic;acc.medical+=c.medical;acc.thr+=c.thr;acc.meal+=c.meal;acc.jamsostek+=c.bpjsCompany;acc.incomeTax+=c.taxMonth;acc.insurance+=c.insurance;acc.other+=c.other;acc.total+=c.total;return acc;},{salary:0,medical:0,thr:0,meal:0,jamsostek:0,incomeTax:0,insurance:0,other:0,total:0});};
  const payrollValueFor=(department:string,key:string)=>{const aliases:Record<string,string>={pomecSalary:"salaryWages",pomecIncomeTax:"incomeTax",pomecJamsostek:"jamsostek",pomecInsurance:"insurance",pomecThr:"thr",pomecMeal:"mealAllowances",pomecMedical:"medical",pomecOtherPayroll:"otherPayroll",rdSalary:"salaryWages",rdIncomeTax:"incomeTax",rdJamsostek:"jamsostek",rdInsurance:"insurance",rdThr:"thr",rdMeal:"mealAllowances",rdMedical:"medical",rdOtherPayroll:"otherPayroll",foSalary:"salaryWages",foIncomeTax:"incomeTax",foJamsostek:"jamsostek",foInsurance:"insurance",foBonus:"thr",foMeal:"mealAllowances",foMedical:"medical",foOtherPayroll:"otherPayroll",hkSalary:"salaryWages",hkIncomeTax:"incomeTax",hkJamsostek:"jamsostek",hkInsurance:"insurance",hkThr:"thr",hkMeal:"mealAllowances",hkMedical:"medical",hkOtherPayroll:"otherPayroll",payrollOthers:"otherPayroll"};const normalized=aliases[key]||key;const aliasesDept:Record<string,string[]>={FO:["FO"],HK:["HK"],FB:["FB","F&B","F & B","FOOD & BEVERAGE","FOOD AND BEVERAGE","FOOD & BEVERAGE DEPARTMENT"],MOD:["MOD","MINOR OPERATED DEPT","MINOR OPERATED DEPT.","MINOR OPERATED DEPARTMENT","MINOR OPERATING DEPT","MINOR OPERATING DEPT.","MINOR OPERATING DEPARTMENT"],AG:["AG","A&G","ADMINISTRATION & GENERAL","ADMINISTRATION AND GENERAL"],FN:["FN"],HRD:["HR","HRD","HUMAN RESOURCE","HUMAN RESOURCES","HUMAN RESOURCES DEPARTMENT"],SEC:["SEC"],SM:["SM","S&M","SALES & MARKETING","SALES AND MARKETING"],POMEC:["POMEC","POMEC & UTILITIES","POMEC & UTILITIES MAINTENANCE DAN ENERGI","POMEC & UTILITIES MAINTENANCE AND ENERGY","SEC","SECURITY","ENG","ENGINEERING","SECURITY / ENGINEERING","SECURITY & ENGINEERING"],ROOM:["FO","HK"]};if(!(form.payrollEmployees||[]).some(e=>payrollDepartmentMatches(e,department)&&payrollHasInputs(e)))return "";const totals=payrollDepartmentMonthly(department);const keys:Record<string,keyof typeof totals>={salaryWages:"salary",incomeTax:"incomeTax",jamsostek:"jamsostek",insurance:"insurance",insurancePayroll:"insurance",thr:"thr",bonusProvision:"thr",bonus:"thr",mealAllowances:"meal",medical:"medical",otherPayroll:"other",payrollOthers:"other"};const mapped=keys[normalized];if(mapped==="incomeTax")return "";return mapped?String(mapped==="thr"?Math.round(totals[mapped]):totals[mapped]):"";};
  const payrollInputKey=(key:string)=>["salaryWages","incomeTax","jamsostek","insurance","insurancePayroll","thr","bonusProvision","bonus","mealAllowances","medical","otherPayroll","payrollOthers","rdSalary","rdIncomeTax","rdJamsostek","rdInsurance","rdThr","rdMeal","rdMedical","rdOtherPayroll","foSalary","foIncomeTax","foJamsostek","foInsurance","foBonus","foMeal","foMedical","foOtherPayroll","hkSalary","hkIncomeTax","hkJamsostek","hkInsurance","hkThr","hkMeal","hkMedical","hkOtherPayroll","pomecSalary","pomecIncomeTax","pomecJamsostek","pomecInsurance","pomecThr","pomecMeal","pomecMedical","pomecOtherPayroll"].includes(key);
  // STEP 4 uses one normalized forecast source: detailed Step 3 inputs + Master Payroll.
  // This prevents the consolidated report/Excel export from reading stale summary fields.
  const consolidatedForm:BudgetForm = {
    ...form,
    forecast:{
      ...form.forecast,
      monthly:form.forecast.monthly.map((row,index)=>{
        const sumDetails=(details:Record<string,string>|undefined,keys?:string[])=>{
          if(!details)return null;
          const entries=Object.entries(details).filter(([key,value])=>(!keys||keys.includes(key))&&String(value??"").trim()!==""&&Number.isFinite(Number(value)));
          return entries.length?entries.reduce((total,[,value])=>total+Number(value),0):null;
        };
        const roomDetails=row.roomDivisionDetails||{};
        const roomCosts=sumDetails(roomDetails,Object.keys(roomDetails).filter(key=>key!=="roomRevenue"&&!key.toLowerCase().includes("percent")&&!payrollInputKey(key)));
        const fbRevenueDetails=sumDetails(row.fbDetails,["foodRevenue","beverageRevenue"]);
        const fbCosDetails=sumDetails(row.fbDetails,["foodCost","beverageCost"]);
        const fbOtherDetails=sumDetails(row.fbDetails,["glassware","chinaware","silverware","linen","decoration","duesSubscription","extermDisinfectant","kitchenFuel","laundry","miscellaneous","spoilage","cleaningSupplies","guestSupplies","printingStationery","telephone","uniform","utensil","contractCleaning"]);
        const modRevenueDetails=sumDetails(row.modDetails,["businessCenterRevenue","rentCarRevenue","laundryRevenue","spaRevenue","telephoneRevenue","sportRecreationRevenue","rentedSpaceRevenue","miscellaneousRevenue","otherRevenueDiscounts"]);
        const modCosDetails=sumDetails(row.modDetails,["laundryCost"]);
        const modOtherDetails=sumDetails(row.modDetails,["guestSupplies","paperSupplies","laundryValetSupplies","laundrySupplies","casual","cleaningSupplies","printingStationery","decoration","telephoneFax","laundryExpense","casualOther","laundryValetOther","cleaningOther","provisionUniform","pteb","uniform","otherExpenses"]);
        const payrollFor=(department:string,fallback:string|undefined)=>{
          if((form.payrollEmployees||[]).length>0)return payrollDepartmentHasInputs(department)?String(payrollDepartmentMonthly(department).total):"";
          return fallback??"";
        };        const roomPayrollFallback=sumDetails(roomDetails,Object.keys(roomDetails).filter(key=>payrollInputKey(key)));
        const roomPayroll=(form.payrollEmployees||[]).length>0
          ?payrollDepartmentHasInputs("ROOM")?String(payrollDepartmentMonthly("ROOM").total):""
          :roomPayrollFallback!==null?String(roomPayrollFallback):row.roomPayroll;
        const fbPayroll=payrollFor("FB",row.fbPayroll);
        const modPayroll=payrollFor("MOD",row.modPayroll);
        const agPayroll=payrollFor("AG",row.agPayroll);
        const smPayroll=payrollFor("SM",row.smPayroll);
        const hrdPayroll=payrollFor("HRD",row.hrdPayroll);
        const pomecPayroll=payrollFor("POMEC",row.pomecPayroll);
        const agOtherDetails=sumDetails(row.agDetails,["bankCharges","donation","duesTradeAssoc","entertainment","laundryUniforms","postageCourier","printingStationery","licenceInspection","transportation","travelling","telephone","creditCardCommission","companyHousing","auditBrand","contractService","payrollSystem","pmsHotelindo","edp","provisionUniform","others"]);
        const smOtherDetails=sumDetails(row.smDetails,["advertisingPromotion","brochureCollateral","directMail","duesTradeAssoc","entertainment","laundryUniforms","groupAdvertising","printingStationery","telephone","salesMarketingFee","photography","centralizedPromotionalProgram","promotionVipGift","salesMarketingKits","provisionUniform","others","transportation","salesCallOutside","tradeShows","travellingExpenses","printMediaNewspaper","otherMediaMagazine"]);
        const hrdOtherDetails=sumDetails(row.hrdDetails,["employeeRelation","casual","laundryUniforms","postageCourier","paperSupplies","cleaningSupplies","printingStationery","socialSportActivity","transportation","telephone","medicalExpenses","trainingEducation","recruitingAdvertisement","housePublication","provisionUniform","others"]);
        const pomecOtherDetails=sumDetails(row.pomecDetails,POMEC_LINES.filter(line=>line.group==="other").map(line=>line.key));
        const energyDetails=sumDetails(row.pomecDetails,POMEC_LINES.filter(line=>line.group==="energy").map(line=>line.key));
        return {
          ...row,
          roomDivisionDetails:roomDetails,
          fbRevenue:fbRevenueDetails!==null?String(fbRevenueDetails):row.fbRevenue,
          fbCostOfSales:fbCosDetails!==null?String(fbCosDetails):row.fbCostOfSales,
          fbPayroll,
          fbOtherExpenses:fbOtherDetails!==null?String(fbOtherDetails):row.fbOtherExpenses,
          otherRevenue:modRevenueDetails!==null?String(modRevenueDetails):row.otherRevenue,
          modCostOfSales:modCosDetails!==null?String(modCosDetails):row.modCostOfSales,
          modPayroll,
          modOtherExpenses:modOtherDetails!==null?String(modOtherDetails):row.modOtherExpenses,
          roomPayroll,
          roomOtherExpenses:roomCosts!==null?String(roomCosts):row.roomOtherExpenses,
          agPayroll,smPayroll,hrdPayroll,pomecPayroll,
          agOtherExpenses:agOtherDetails!==null?String(agOtherDetails):row.agOtherExpenses,
          smOtherExpenses:smOtherDetails!==null?String(smOtherDetails):row.smOtherExpenses,
          hrdOtherExpenses:hrdOtherDetails!==null?String(hrdOtherDetails):row.hrdOtherExpenses,
          pomecOtherExpenses:pomecOtherDetails!==null?String(pomecOtherDetails):row.pomecOtherExpenses,
          energyCost:energyDetails!==null?String(energyDetails):row.energyCost
        };
      })
    }
  };

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
  const updateFbDetail=(monthIndex:number,key:string,value:string)=>setForm(prev=>({...prev,forecast:{...prev.forecast,monthly:prev.forecast.monthly.map((row,i)=>{if(i!==monthIndex)return row;const details={...(row.fbDetails||{}),[key]:value};const sum=(keys:string[])=>{const vals=keys.map(k=>details[k]===undefined||details[k]===""?null:Number(details[k])).filter((v):v is number=>v!==null&&Number.isFinite(v));return vals.length?String(vals.reduce((a,b)=>a+b,0)):"";};return {...row,fbDetails:details,fbRevenue:sum(["foodRevenue","beverageRevenue"]),fbCostOfSales:sum(["foodCost","beverageCost"]),fbPayroll:sum(["salaryWages","incomeTax","jamsostek","insurance","thr","mealAllowances","medical","otherPayroll"]),fbOtherExpenses:sum(["glassware","chinaware","silverware","linen","decoration","duesSubscription","extermDisinfectant","kitchenFuel","laundry","miscellaneous","spoilage","cleaningSupplies","guestSupplies","printingStationery","telephone","uniform","utensil","contractCleaning"])};})}}));
  const updateFbCostPercent=(key:"foodCost"|"beverageCost",value:string)=>setForm(prev=>({...prev,forecast:{...prev.forecast,monthly:prev.forecast.monthly.map(row=>({...row,fbDetails:{...(row.fbDetails||{}),[key+"Percent"]:value}}))}}));
  const fillFbCostFromPercent=(key:"foodCost"|"beverageCost")=>setForm(prev=>({...prev,forecast:{...prev.forecast,monthly:prev.forecast.monthly.map(row=>{const details={...(row.fbDetails||{})};const rawPercent=details[key+"Percent"]??prev.forecast.monthly[0]?.fbDetails?.[key+"Percent"]??"";const percent=Number(rawPercent);const revenueKey=key==="foodCost"?"foodRevenue":"beverageRevenue";const revenueRaw=details[revenueKey];const revenue=revenueRaw===undefined||revenueRaw===""?null:Number(revenueRaw);const cost=rawPercent.trim()===""||!Number.isFinite(percent)||percent<0||revenue===null||!Number.isFinite(revenue)?null:Math.round(revenue*percent/100);details[key]=cost===null?"":String(cost);const sum=(keys:string[])=>{const vals=keys.map(k=>details[k]===undefined||details[k]===""?null:Number(details[k])).filter((v):v is number=>v!==null&&Number.isFinite(v));return vals.length?String(vals.reduce((a,b)=>a+b,0)):"";};return {...row,fbDetails:details,fbRevenue:sum(["foodRevenue","beverageRevenue"]),fbCostOfSales:sum(["foodCost","beverageCost"]),fbPayroll:sum(["salaryWages","incomeTax","jamsostek","insurance","thr","mealAllowances","medical","otherPayroll"]),fbOtherExpenses:sum(["glassware","chinaware","silverware","linen","decoration","duesSubscription","extermDisinfectant","kitchenFuel","laundry","miscellaneous","spoilage","cleaningSupplies","guestSupplies","printingStationery","telephone","uniform","utensil","contractCleaning"])};})}}));
  const updateAgDetail=(monthIndex:number,key:string,value:string)=>setForm(prev=>({...prev,forecast:{...prev.forecast,monthly:prev.forecast.monthly.map((row,i)=>{if(i!==monthIndex)return row;const details={...(row.agDetails||{}),[key]:value};const sum=(keys:string[])=>{const vals=keys.map(k=>details[k]===undefined||details[k]===""?null:Number(details[k])).filter((v):v is number=>v!==null&&Number.isFinite(v));return vals.length?String(vals.reduce((a,b)=>a+b,0)):"";};return {...row,agDetails:details,agPayroll:sum(["salaryWages","incomeTax","jamsostek","insurance","bonusProvision","mealAllowances","medical","otherPayroll"]),agOtherExpenses:sum(["bankCharges","donation","duesTradeAssoc","entertainment","laundryUniforms","postageCourier","printingStationery","licenceInspection","transportation","travelling","telephone","creditCardCommission","companyHousing","auditBrand","contractService","payrollSystem","pmsHotelindo","edp","provisionUniform","others"])};})}}));
    const updateSmDetail=(monthIndex:number,key:string,value:string)=>setForm(prev=>({...prev,forecast:{...prev.forecast,monthly:prev.forecast.monthly.map((row,i)=>{if(i!==monthIndex)return row;const details={...(row.smDetails||{}),[key]:value};const sum=(keys:string[])=>{const vals=keys.map(k=>details[k]===undefined||details[k]===""?null:Number(details[k])).filter((v):v is number=>v!==null&&Number.isFinite(v));return vals.length?String(vals.reduce((a,b)=>a+b,0)):"";};return {...row,smDetails:details,smPayroll:sum(["salaryWages","incomeTax","jamsostek","insurance","bonusProvision","mealAllowances","medical","otherPayroll"]),smOtherExpenses:sum(["advertisingPromotion","brochureCollateral","directMail","duesTradeAssoc","entertainment","laundryUniforms","groupAdvertising","printingStationery","telephone","salesMarketingFee","photography","centralizedPromotionalProgram","promotionVipGift","salesMarketingKits","provisionUniform","others","transportation","salesCallOutside","tradeShows","travellingExpenses","printMediaNewspaper","otherMediaMagazine"])};})}}));
     const updateHrdDetail=(monthIndex:number,key:string,value:string)=>setForm(prev=>({...prev,forecast:{...prev.forecast,monthly:prev.forecast.monthly.map((row,i)=>{if(i!==monthIndex)return row;const details={...(row.hrdDetails||{}),[key]:value};const sum=(keys:string[])=>{const vals=keys.map(k=>details[k]===undefined||details[k]===""?null:Number(details[k])).filter((v):v is number=>v!==null&&Number.isFinite(v));return vals.length?String(vals.reduce((a,b)=>a+b,0)):"";};return {...row,hrdDetails:details,hrdPayroll:sum(["salaryWages","incomeTax","jamsostek","insurance","bonusProvision","mealAllowances","medical","otherPayroll"]),hrdOtherExpenses:sum(["employeeRelation","casual","laundryUniforms","postageCourier","paperSupplies","cleaningSupplies","printingStationery","socialSportActivity","transportation","telephone","medicalExpenses","trainingEducation","recruitingAdvertisement","housePublication","provisionUniform","others"])};})}}));
    const updatePomecDetail=(monthIndex:number,key:string,value:string)=>setForm(prev=>({...prev,forecast:{...prev.forecast,monthly:prev.forecast.monthly.map((row,i)=>{if(i!==monthIndex)return row;const details={...(row.pomecDetails||{}),[key]:value};const sum=(keys:string[])=>{const vals=keys.map(k=>details[k]===undefined||details[k]===""?null:Number(details[k])).filter((v):v is number=>v!==null&&Number.isFinite(v));return vals.length?String(vals.reduce((a,b)=>a+b,0)):"";};return {...row,pomecDetails:details,pomecPayroll:sum(["salaryWages","incomeTax","jamsostek","insurance","thr","mealAllowances","medical","otherPayroll"]),pomecOtherExpenses:sum(["paintingDecoration","engineeringSupplies","bulbsLamp","printingStationery","laundryUniform","provisionUniform","acMaintenance","buildingMaintenance","electricityMaintenance","floorCovering","furnitureFixtureRepair","mechanicalElectricalMaintenance","kitchenEquipmentMaintenance","refrigeratorMaintenance","automobileRepair","plumbingHeatingMaintenance","removalWaste","others"]),energyCost:sum(["electricityConsumed","waterConsumed","fuelDieselConsumed"])};})}}));
  const updateYear=(index:number,key:keyof Omit<ForecastYear,"label">,value:string)=>setForm(prev=>({...prev,forecast:{...prev.forecast,annual:prev.forecast.annual.map((r,i)=>i===index?{...r,[key]:value}:r)}}));
  const itemLabel=(department:string,key:string,defaultLabel:string)=>form.itemLabelOverrides?.[department+":"+key]??defaultLabel;
  const editItemLabel=(department:string,key:string,defaultLabel:string)=>{const next=window.prompt("Edit nama item biaya",itemLabel(department,key,defaultLabel));if(next===null||!next.trim())return;setForm(prev=>({...prev,itemLabelOverrides:{...(prev.itemLabelOverrides||{}),[department+":"+key]:next.trim()}}));};
  const editLabelButton=(department:string,key:string,label:string)=><button type="button" className="ml-1 rounded border border-slate-300 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-50 print:hidden" title="Edit nama item" onClick={()=>editItemLabel(department,key,label)}>Edit nama</button>;
  // Isi satu akun biaya untuk 12 bulan dengan prorata hari kalender.
  // Nominal yang dimasukkan adalah biaya acuan untuk bulan 30 hari.
  const fillCostAcrossYear=(update:(monthIndex:number,key:string,value:string)=>void,key:string,label:string)=>{
    const raw=window.prompt("Isi biaya untuk 12 bulan: "+label+"\\nMasukkan biaya acuan untuk 30 hari. Nilai tiap bulan dihitung sesuai jumlah hari kalender (contoh: Rp 3000000).","3000000");
    if(raw===null)return;
    const base=Number(raw.replace(/[^0-9]/g,""));
    if(!Number.isFinite(base)||base<0)return;
    const year=Number(form.yearStart)||new Date().getFullYear();
    for(let monthIndex=0;monthIndex<12;monthIndex++){
      const days=new Date(year,monthIndex+1,0).getDate();
      update(monthIndex,key,String(Math.round(base*days/30)));
    }
  };
  const nonCostDetailKeys=new Set(["roomRevenue","foodRevenue","beverageRevenue","businessCenterRevenue","rentCarRevenue","laundryRevenue","spaRevenue","telephoneRevenue","sportRecreationRevenue","rentedSpaceRevenue","miscellaneousRevenue","otherRevenueDiscounts"]);
  const costFillButton=(_key:string,_label:string,_update:(monthIndex:number,key:string,value:string)=>void)=>null;
  const updateDepartmentCostPercent=(detailName:"roomDivisionDetails"|"fbDetails"|"modDetails"|"agDetails"|"smDetails"|"hrdDetails"|"pomecDetails",key:string,value:string)=>setForm(prev=>({...prev,forecast:{...prev.forecast,monthly:prev.forecast.monthly.map(row=>({...row,[detailName]:{...((row[detailName]||{}) as Record<string,string>),[key+"Percent"]:value}}))}}));
  const applyDepartmentCostPercent=(detailName:"roomDivisionDetails"|"fbDetails"|"modDetails"|"agDetails"|"smDetails"|"hrdDetails"|"pomecDetails",key:string,update:(monthIndex:number,key:string,value:string)=>void,base:"room"|"fb"|"mod"|"hotel")=>{
    const percentRaw=(form.forecast.monthly[0]?.[detailName] as Record<string,string>|undefined)?.[key+"Percent"]||"";
    const percent=Number(percentRaw);
    if(percentRaw.trim()===""||!Number.isFinite(percent)||percent<0){setMessage("Masukkan asumsi persentase biaya yang valid terlebih dahulu.");return;}
    form.forecast.monthly.forEach((row,i)=>{
      let revenue:number|null=null;
      if(base==="room") revenue=calcMonthly(row,Number(form.yearStart),i,form.statistics.rooms).revenue;
      else if(base==="fb") revenue=row.fbRevenue===""?null:Number(row.fbRevenue);
      else if(base==="mod") revenue=row.otherRevenue===""?null:Number(row.otherRevenue);
      else revenue=calcMonthly(row,Number(form.yearStart),i,form.statistics.rooms).revenue;
      if(revenue!==null&&Number.isFinite(revenue)) update(i,key,String(Math.round(revenue*percent/100)));
    });
  };
  const costPercentControl=(key:string,label:string,detailName:"roomDivisionDetails"|"fbDetails"|"modDetails"|"agDetails"|"smDetails"|"hrdDetails"|"pomecDetails",update:(monthIndex:number,key:string,value:string)=>void,base:"room"|"fb"|"mod"|"hotel")=>!payrollInputKey(key)&&!nonCostDetailKeys.has(key)?<details className="relative mt-1"><summary className="inline-flex cursor-pointer list-none items-center gap-1 whitespace-nowrap rounded border border-sky-200 bg-sky-50 px-2 py-1 text-[10px] font-bold text-sky-700 hover:bg-sky-100">Atur biaya <span aria-hidden="true">⌄</span></summary><div className="mt-1 flex min-w-44 flex-col gap-2 rounded-lg border border-slate-200 bg-white p-2 shadow-sm"><label className="flex items-center justify-between gap-2 text-[10px] font-semibold text-slate-600">% Revenue<input aria-label={label+" asumsi persentase biaya"} type="number" min="0" step="0.01" placeholder="%" className="w-20 rounded border border-slate-200 px-1.5 py-1 text-right text-xs font-semibold text-slate-700" value={((form.forecast.monthly[0]?.[detailName]||{}) as Record<string,string>)[key+"Percent"]||""} onChange={e=>updateDepartmentCostPercent(detailName,key,e.target.value)}/></label><button type="button" className="rounded border border-sky-200 bg-sky-50 px-2 py-1.5 text-left text-[10px] font-bold text-sky-700 hover:bg-sky-100" title="Hitung biaya bulanan dari persentase revenue dasar departemen" onClick={()=>applyDepartmentCostPercent(detailName,key,update,base)}>Isi berdasarkan % Revenue (12 bln)</button><button type="button" className="rounded border border-slate-200 bg-slate-50 px-2 py-1.5 text-left text-[10px] font-bold text-slate-700 hover:bg-slate-100" title="Isi item biaya ini ke 12 bulan sesuai jumlah hari kalender" onClick={()=>fillCostAcrossYear(update,key,label)}>Isi 12 bulan sesuai hari kalender</button></div></details>:null;


  const inputClass="w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100";
  const field=(label:string,value:string,onChange:(value:string)=>void,options:{type?:string;hint?:string;min?:string;max?:string;step?:string;placeholder?:string}={})=>(
    <label className="block min-w-0">
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</span>
      <input className={inputClass} type={options.type||"text"} value={value} onChange={e=>onChange(e.target.value)} min={options.min} max={options.max} step={options.step||"any"} placeholder={options.placeholder||"Isi sesuai sumber"} />
      {options.hint&&<span className="mt-1 block text-xs leading-5 text-slate-500">{options.hint}</span>}
    </label>
  );
  const statField=(key:Exclude<keyof Statistics,"fbAdditionalMeetingRooms">,label:string,hint?:string)=>field(label,form.statistics[key] as string,v=>updateStats(key,v),{type:"number",min:"0",hint,step:key==="days"||key==="rooms"?"1":"any"});
  const parseAmountInput=(value:string)=>{const trimmed=value.trim();if(!trimmed)return "";const normalized=trimmed.replace(/\s/g,"").replace(/\./g,"").replace(",",".").replace(/[^0-9.-]/g,"");return normalized==="-"||normalized==="."?"":normalized;};
  const displayAmountInput=(value:string)=>{if(value.trim()==="")return "";const n=Number(value);return Number.isFinite(n)?new Intl.NumberFormat("id-ID",{maximumFractionDigits:2,useGrouping:true}).format(n):value;};
  const numberInput=(value:string,onChange:(v:string)=>void,placeholder="—",allowNegative=false)=><input type="text" inputMode="decimal" min={allowNegative?undefined:"0"} className="w-28 rounded-lg border border-slate-200 bg-white px-2 py-2 text-right text-xs tabular-nums outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 sm:w-32" value={displayAmountInput(value)} onChange={e=>onChange(parseAmountInput(e.target.value))} placeholder={placeholder} />;

  function saveDraft(){
    try {
      const savedAt=new Date().toISOString();
      window.localStorage.setItem(LOCAL_DRAFT_KEY,JSON.stringify({form,currency,annualGrowthPct,tenYearMode,tenYearOverrides,driverAssumptions,savedAt}));
      setDraftSavedAt(savedAt);setMessage("Draft berhasil disimpan di browser/perangkat ini. Draft dapat dipulihkan setelah halaman di-refresh pada perangkat yang sama.");
    } catch { setMessage("Draft tidak dapat disimpan. Periksa ruang penyimpanan browser/perizinan perangkat."); }
  }

  async function saveFinal(){
    setMessage("");setIssues([]);setWarnings([]);setSummary("");setOrchestrator("checking");
    if(!form.hotelName.trim()||!form.period.trim()){setOrchestrator("failed");setIssues(["Nama hotel dan periode wajib diisi."]);setMessage("Lengkapi identitas laporan terlebih dahulu.");return;}
    // Mode uji coba: baris payroll identik lintas departemen tidak memblokir validasi final.
    // Validasi matematis dan pemeriksaan server tetap berjalan seperti biasa.
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
      if(data.report.storage==="local"){        const localReport={...data.report,form_data:form};
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
      ["Hotel",form.hotelName],["Periode",form.period],["Days in Period",optional(form.statistics.days)],["# OF ROOMS",optional(form.statistics.rooms)],["EXCHANGE RATE US $ TO RP",optional(form.statistics.exchangeRate)],["AVERAGE ROOM RATE (ARR)",optional(form.statistics.averageSellingRate)],
      ["Total Room Build",values.totalRoomBuild],["Out of Inventory",optional(form.statistics.outInventory)],["House Use",optional(form.statistics.houseUse)],
      ["Out of Order",optional(form.statistics.outOfOrder)],["ROOM AVAILABLE",values.roomAvailable],["OCCUPIED ROOMS",optional(form.statistics.complimentary)!==null&&optional(form.statistics.roomPaid)!==null?optional(form.statistics.complimentary)!+optional(form.statistics.roomPaid)!:null],["Complimentary Room Nights",optional(form.statistics.complimentary)],
      ["Paid Room Nights",optional(form.statistics.roomPaid)],["OCCUPANCY (%)",values.occupancy??optional(form.statistics.occupancy)],["AVERAGE ROOM RATE (ARR) (RP)",values.adr],["REVPAR",values.revpar],
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
    const statisticsLines=buildStatisticsSheetRows(form,{hidden:hiddenFbSections,labels:fbMenuLabels});
    const statisticsExport:any[][]=[
      ["CORESTAY ADVISORY — LAPORAN STATISTIK",...Array(13).fill("")],
      ["Hotel",form.hotelName,"Periode",form.period,"Tahun",Number(form.yearStart)],
      ["Description",form.forecast.monthly[11].label.toUpperCase(),...form.forecast.monthly.slice(0,11).map(row=>row.label.toUpperCase()),"YEAR TOTAL / AVG"]
    ];
    statisticsLines.forEach(line=>{if(line.kind==="section"){statisticsExport.push([line.label,...Array(13).fill("")]);return;}statisticsExport.push([line.label,line.values[11],...line.values.slice(0,11),line.total??null]);});
    const annualStatisticsExport:any[][]=[
      ["CORESTAY ADVISORY — 10 YEARS HOTEL STATISTICS",...Array(11).fill("")],
      ["Hotel",form.hotelName,"Period",form.yearStart+"–"+(Number(form.yearStart)+9)],
      ["Description",...form.forecast.annual.map((row,i)=>"YEAR "+(i+1)+" ("+row.label+")"),"TOTAL / AVG"]
    ];
    const annualStatsRows=[
      {label:"# OF DAYS",values:form.forecast.annual.map(row=>optional(row.days)),kind:"sum"},
      {label:"# OF ROOMS",values:form.forecast.annual.map(row=>optional(row.rooms)),kind:"avg"},
      {label:"ROOMS AVAILABLE",values:form.forecast.annual.map(row=>{const d=optional(row.days),rooms=optional(row.rooms);return d!==null&&rooms!==null?d*rooms:null;}),kind:"sum"},
      {label:"OCCUPANCY (%)",values:form.forecast.annual.map(row=>optional(row.occupancy)),kind:"percent"},
      {label:"OCCUPIED ROOMS",values:form.forecast.annual.map(row=>{const d=optional(row.days),rooms=optional(row.rooms),occ=optional(row.occupancy);return d!==null&&rooms!==null&&occ!==null?d*rooms*occ/100:null;}),kind:"sum"},
      {label:"ROOM REVENUE - RP",values:form.forecast.annual.map(row=>calcAnnual(row).roomRevenue),kind:"sum"},
      {label:"AVERAGE ROOM RATE (ARR) - RP",values:form.forecast.annual.map(row=>{const calc=calcAnnual(row),d=optional(row.days),rooms=optional(row.rooms),occ=optional(row.occupancy),paid=d!==null&&rooms!==null&&occ!==null?d*rooms*occ/100:null;return calc.roomRevenue!==null&&paid!==null&&paid>0?calc.roomRevenue/paid:optional(row.adr)??optional(form.statistics.averageSellingRate);}),kind:"avg"},
      {label:"REVPAR - RP",values:form.forecast.annual.map(row=>{const calc=calcAnnual(row),d=optional(row.days),rooms=optional(row.rooms),available=d!==null&&rooms!==null?d*rooms:null;return calc.roomRevenue!==null&&available!==null&&available>0?calc.roomRevenue/available:null;}),kind:"avg"},
      {label:"F&B REVENUE - RP",values:form.forecast.annual.map(row=>optional(row.fbRevenue)),kind:"sum"},
      {label:"MOD REVENUE - RP",values:form.forecast.annual.map(row=>optional(row.otherRevenue)),kind:"sum"},
      {label:"TOTAL REVENUE - RP",values:form.forecast.annual.map(row=>calcAnnual(row).revenue),kind:"sum"},
      {label:"EXCHANGE RATE US $ TO RP",values:form.forecast.annual.map(()=>optional(form.statistics.exchangeRate)),kind:"avg"}
    ];
    annualStatsRows.forEach(line=>{const valid=line.values.filter((v:number|null)=>v!==null);const total=valid.length?(line.kind==="sum"?valid.reduce((a:number,b:number)=>a+b,0):valid.reduce((a:number,b:number)=>a+b,0)/valid.length):null;annualStatisticsExport.push([line.label,...line.values,total]);});
    const workbook=XLSX.utils.book_new();
    const add=(name:string,rows:any[][],widths:number[],pageFit:"wide"|"single"="wide")=>{
      const ws=XLSX.utils.aoa_to_sheet(rows);
      rows.forEach((row,rowIndex)=>{if(/^(AVERAGE GUEST \/ ROOM|LENGTH OF STAY)$/i.test(String(row[0]??"").trim())){for(let col=1;col<row.length;col++){const cell=ws[XLSX.utils.encode_cell({r:rowIndex,c:col})];if(cell&&typeof cell.v==="number")cell.z="0.00";}}});
      ws["!cols"]=widths.map(w=>({wch:w}));
      ws["!freeze"]={xSplit:0,ySplit:1};
      ws["!autofilter"]={ref:ws["!ref"]||"A1"};
      ws["!pageSetup"]={orientation:"landscape",paperSize:8,fitToWidth:1,fitToHeight:pageFit==="single"?1:0};
      ws["!margins"]={left:0.2,right:0.2,top:0.3,bottom:0.3,header:0.1,footer:0.1};
      XLSX.utils.book_append_sheet(workbook,ws,name);
    };
    const consolidatedMonthly:any[][]=[["CORESTAY ADVISORY — 1 YEAR CONSOLIDATED",...Array(26).fill("")],["Hotel",form.hotelName,"Year",Number(form.yearStart),"Currency",currency],["Account / Description",...[11,0,1,2,3,4,5,6,7,8,9,10].flatMap(i=>[(i===11?"DES":monthNames[i]).toUpperCase()+" VALUE",(i===11?"DES":monthNames[i]).toUpperCase()+" %"]), "TOTAL / AVERAGE VALUE","TOTAL / AVERAGE %"]];
    buildConsolidatedRows(consolidatedForm).forEach(line=>{
      if(line.kind==="section"){consolidatedMonthly.push([line.label,...Array(26).fill("")]);return;}
      const vals:any[]=[line.label];
      [11,0,1,2,3,4,5,6,7,8,9,10].forEach(i=>{const v=line.values[i];const base=line.base?.[i]??null;vals.push(v??0,base!==null&&base!==0&&v!==null?v/base*100:0);});
      vals.push(line.total??0,line.totalPct??0);
      consolidatedMonthly.push(vals);
    });
    const consolidatedAnnual:any[][]=[["CORESTAY ADVISORY — 10 YEARS CONSOLIDATED",...Array(22).fill("")],["Hotel",form.hotelName,"Period",form.yearStart+"–"+(Number(form.yearStart)+9),"Currency",currency],["Account / Description",...form.forecast.annual.flatMap((row,i)=>["YEAR "+(i+1)+" VALUE","YEAR "+(i+1)+" %"]),"TOTAL / AVERAGE VALUE","TOTAL / AVERAGE %"]];
    buildTenYearRows(consolidatedForm).forEach(line=>{
      if(line.section){consolidatedAnnual.push([line.label,...Array(22).fill("")]);return;}
      const vals:any[]=[line.label];
      line.values.forEach((v,i)=>{const base=line.base?.[i]??null;vals.push(v,base!==null&&base!==0&&v!==null?v/base*100:null);});
      vals.push(line.total??null,line.totalPct??null);
      consolidatedAnnual.push(vals);
    });
    add("Summary",[[ "CORESTAY ADVISORY — HOTEL BUDGET & FORECASTING"],["Hotel",form.hotelName],["Period",form.period],[],["Metric","Value"],...statRows],[38,30],"wide");
    add("Laporan Statistik",statisticsExport,[38,...Array(12).fill(16),20],"wide");
    add("10-Year Statistics",annualStatisticsExport,[38,...Array(10).fill(18),20],"wide");
    add("Account P&L",pnlRows,[14,38,30,18,12,18,12,22,12,22,24,12,18,12,18,12,20,12,20,20,12],"wide");
    add("Monthly Forecast",monthlyRows,[22,10,16,18,22,20,20,22,22,22],"wide");
    add("1-Year Consolidated",consolidatedMonthly,[34,...Array(24).fill(11),16,12],"wide");
    add("10-Year Consolidated",consolidatedAnnual,[34,...Array(20).fill(11),16,12],"wide");
    add("10-Year Forecast",annualRows,[14,10,10,16,18,24,20,20,22,22,22],"single");
    const detailSources=[
      {name:"ROOM DIVISION",key:"roomDivisionDetails"},{name:"FOOD & BEVERAGE",key:"fbDetails"},{name:"MINOR OPERATING DEPT",key:"modDetails"},{name:"ADMIN & GENERAL",key:"agDetails"},{name:"SALES & MARKETING",key:"smDetails"},{name:"HUMAN RESOURCES",key:"hrdDetails"},{name:"POMEC & UTILITIES",key:"pomecDetails"}
    ] as const;
    const departmentExpenseRows:any[][]=[["DEPARTMENT","ACCOUNT / ITEM",...form.forecast.monthly.map(row=>row.label),"TOTAL"]];
    detailSources.forEach(dept=>{const keys=Array.from(new Set(form.forecast.monthly.flatMap(row=>Object.keys(((row as any)[dept.key]||{}) as Record<string,string>))));keys.forEach(key=>{const vals=form.forecast.monthly.map(row=>optional((((row as any)[dept.key]||{}) as Record<string,string>)[key]||""));const total=vals.some(v=>v!==null)?vals.reduce<number>((sum,v)=>sum+(Number(v??0)||0),0):null;const readable=key.replace(/([A-Z])/g," $1").replace(/^./,c=>c.toUpperCase()).replace(/\bthr\b/i,"THR");departmentExpenseRows.push([dept.name,readable,...vals,total]);});});
    add("Department Expenses",departmentExpenseRows,[28,38,...Array(12).fill(15),18],"wide");
    const ownerExpenseRows:any[][]=[
      ["OTHER EXPENSES / OWNER SHARE PROFIT"],
      ["ACCOUNT / DESCRIPTION","Dec",...monthNames.slice(0,11),"TOTAL"]
    ];
    const ownerOrder=[11,0,1,2,3,4,5,6,7,8,9,10];
    const ownerItems=[
      {key:"otherManagementFee",label:"MANAGEMENT & MARKETING FEES",group:"OTHER EXPENSES"},
      {key:"insuranceGeneral",label:"GENERAL INSURANCE",group:"OTHER EXPENSES"},
      {key:"landLease",label:"LAND LEASE / HOLD",group:"OWNER EXPENSES"},
      {key:"ownerInsurance",label:"OWNER INSURANCE",group:"OWNER EXPENSES"},
      {key:"maintenanceFee",label:"SERVICE CHARGE / MAINTENANCE FEE",group:"OWNER EXPENSES"},
      {key:"ownerOtherExpenses",label:"OTHER OWNER EXPENSES",group:"OWNER EXPENSES"}
    ] as const;
    const ownerValue=(i:number,key:string)=>optional(String(form.forecast.monthly[i]?.[key as keyof ForecastMonth]??""));
    const ownerGroupItems=(group:"OTHER EXPENSES"|"OWNER EXPENSES")=>ownerItems.filter(item=>item.group===group);
    const ownerGroupValue=(group:"OTHER EXPENSES"|"OWNER EXPENSES",i:number)=>{const vals=ownerGroupItems(group).map(item=>ownerValue(i,item.key));return vals.some(v=>v!==null)?vals.reduce<number>((n,v)=>n+(v??0),0):null;};
    const ownerCombinedValue=(i:number)=>{const vals=ownerItems.map(item=>ownerValue(i,item.key));return vals.some(v=>v!==null)?vals.reduce<number>((n,v)=>n+(v??0),0):null;};
    const ownerAnnual=(fn:(i:number)=>number|null)=>ownerOrder.some(i=>fn(i)!==null)?ownerOrder.reduce<number>((n,i)=>n+(fn(i)??0),0):null;
    ownerExpenseRows.push(["OTHER EXPENSES",...Array(13).fill(null)]);
    ownerGroupItems("OTHER EXPENSES").forEach(item=>ownerExpenseRows.push([itemLabel("owner",item.key,item.label),...ownerOrder.map(i=>ownerValue(i,item.key)),ownerAnnual(i=>ownerValue(i,item.key))]));
    ownerExpenseRows.push(["SUBTOTAL OTHER EXPENSES",...ownerOrder.map(i=>ownerGroupValue("OTHER EXPENSES",i)),ownerAnnual(i=>ownerGroupValue("OTHER EXPENSES",i))]);
    ownerExpenseRows.push(["OWNER EXPENSES",...Array(13).fill(null)]);
    ownerGroupItems("OWNER EXPENSES").forEach(item=>ownerExpenseRows.push([itemLabel("owner",item.key,item.label),...ownerOrder.map(i=>ownerValue(i,item.key)),ownerAnnual(i=>ownerValue(i,item.key))]));
    ownerExpenseRows.push(["SUBTOTAL OWNER EXPENSES",...ownerOrder.map(i=>ownerGroupValue("OWNER EXPENSES",i)),ownerAnnual(i=>ownerGroupValue("OWNER EXPENSES",i))]);
    ownerExpenseRows.push(["TOTAL OTHER EXPENSES + OWNER EXPENSES",...ownerOrder.map(i=>ownerCombinedValue(i)),ownerAnnual(i=>ownerCombinedValue(i))]);
    add("Owner Expenses",ownerExpenseRows,[38,...Array(12).fill(16),18],"wide");
    const payrollRows:any[][]=[["MASTER PAYROLL — DETAIL KARYAWAN & BIAYA"],["Department","Position","Headcount","Basic Salary / Month","Medical / Month","Meal / Month","THR / Month","BPJS Company / Month","PPh / Month","Insurance / Month","Other / Month","Monthly Total","Annual Total"]];
    (form.payrollEmployees||[]).forEach(emp=>{const c=payrollCalc(emp);const active=payrollHasInputs(emp);payrollRows.push([emp.department||"—",emp.position||"—",active?c.count:"—",active?c.basic:"—",active?c.medical:"—",active?c.meal:"—",active?c.thr:"—",active?c.bpjsCompany:"—",active&&c.hasPtkp?c.taxMonth:"—",active?c.insurance:"—",active?c.other:"—",active?c.total:"—",active?c.total*12:"—"]);});
    const payrollTotal=(form.payrollEmployees||[]).filter(payrollHasInputs).reduce((sum,emp)=>sum+payrollCalc(emp).total,0);
    payrollRows.push(["TOTAL PAYROLL & RELATED EXPENSES","",null,null,null,null,null,null,null,null,null,payrollTotal,payrollTotal*12]);payrollRows.push([]);
    payrollRows.push(["RINGKASAN PAYROLL PER DEPARTEMEN","Headcount","Monthly Payroll & Expenses","Annual Payroll & Expenses"]);
    [{label:"Front Office",aliases:["FO"]},{label:"House Keeping",aliases:["HK","HOUSE KEEPING","HOUSEKEEPING"]},{label:"Food & Beverage",aliases:["FB","F&B","FOOD & BEVERAGE"]},{label:"Minor Operating Department",aliases:["MOD"]},{label:"Administration & General",aliases:["AG","FN","FINANCE","FINANCE / ACCOUNTING","ACCOUNTING"]},{label:"Sales & Marketing",aliases:["SM"]},{label:"Human Resources",aliases:["HRD","HR"]},{label:"Security",aliases:["SEC","SECURITY"]},{label:"Engineering",aliases:["ENG","ENGINEERING"]},{label:"POMEC & Utilities",aliases:["POMEC"]}].forEach(dept=>{const people=(form.payrollEmployees||[]).filter(emp=>dept.aliases.includes(emp.department.trim().toUpperCase())&&payrollHasInputs(emp));const headcount=people.reduce((sum,emp)=>sum+payrollCalc(emp).count,0);const monthly=people.reduce((sum,emp)=>sum+payrollCalc(emp).total,0);payrollRows.push([dept.label,people.length?headcount:"—",people.length?monthly:"—",people.length?monthly*12:"—"]);});
    add("Payroll & Expenses",payrollRows,[28,32,14,20,17,16,16,20,16,18,16,20,20],"wide");
    const output=XLSX.write(workbook,{bookType:"xlsx",type:"array"});
    const url=URL.createObjectURL(new Blob([output],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}));
    const a=document.createElement("a");a.href=url;a.download="CoreStay-Hotel-Budget-PnL-"+(form.period||"report").replace(/[^a-z0-9-_]+/gi,"-")+".xlsx";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }

  const tabItems=[
    {id:"statistics",label:"Budget & Statistics",sub:"Identitas hotel dan kapasitas",color:"from-sky-500 to-blue-600",icon:"🏨",detail:"Mulai dari profil hotel, periode, kapasitas kamar, dan statistik operasional."},
    {id:"payroll",label:"Master Payroll",sub:"Data staf dan biaya karyawan",color:"from-emerald-500 to-teal-700",icon:"👥",detail:"Satu sumber data payroll untuk semua departemen; biaya dihitung otomatis."},
    {id:"pnl",label:"Budget P&L",sub:"Revenue dan biaya dept",color:"from-violet-500 to-purple-600",icon:"📊",detail:"Isi akun Actual, Budget, Last Year, dan YTD. Ringkasan dihitung otomatis dari data yang terisi."},
    {id:"forecast",label:"Monthly & Annual Forecast",sub:"Proyeksi 12 bulan & 10 tahun",color:"from-teal-500 to-emerald-600",icon:"📈",detail:"Bangun proyeksi berdasarkan hari, kamar, okupansi, ADR, pendapatan lain, dan biaya."},
    {id:"export",label:"Export PDF & Excel",sub:"",color:"from-indigo-500 to-blue-700",icon:"📄",detail:""}
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
  const annualStatisticsForPreview=[
    {label:"# OF DAYS",values:form.forecast.annual.map(row=>optional(row.days)),kind:"sum"},
    {label:"# OF ROOMS",values:form.forecast.annual.map(row=>optional(row.rooms)),kind:"avg"},
    {label:"ROOMS AVAILABLE",values:form.forecast.annual.map(row=>{const d=optional(row.days),rooms=optional(row.rooms);return d!==null&&rooms!==null?d*rooms:null;}),kind:"sum"},
    {label:"OCCUPANCY (%)",values:form.forecast.annual.map(row=>optional(row.occupancy)),kind:"percent"},
    {label:"OCCUPIED ROOMS",values:form.forecast.annual.map(row=>{const d=optional(row.days),rooms=optional(row.rooms),occ=optional(row.occupancy);return d!==null&&rooms!==null&&occ!==null?d*rooms*occ/100:null;}),kind:"sum"},
    {label:"ROOM REVENUE - RP",values:form.forecast.annual.map(row=>calcAnnual(row).roomRevenue),kind:"sum"},
    {label:"AVERAGE ROOM RATE (ARR) - RP",values:form.forecast.annual.map(row=>{const calc=calcAnnual(row),d=optional(row.days),rooms=optional(row.rooms),occ=optional(row.occupancy),paid=d!==null&&rooms!==null&&occ!==null?d*rooms*occ/100:null;return calc.roomRevenue!==null&&paid!==null&&paid>0?calc.roomRevenue/paid:optional(row.adr)??optional(form.statistics.averageSellingRate);}),kind:"avg"},
    {label:"REVPAR - RP",values:form.forecast.annual.map(row=>{const calc=calcAnnual(row),d=optional(row.days),rooms=optional(row.rooms),available=d!==null&&rooms!==null?d*rooms:null;return calc.roomRevenue!==null&&available!==null&&available>0?calc.roomRevenue/available:null;}),kind:"avg"},
    {label:"F&B REVENUE - RP",values:form.forecast.annual.map(row=>optional(row.fbRevenue)),kind:"sum"},
    {label:"MOD REVENUE - RP",values:form.forecast.annual.map(row=>optional(row.otherRevenue)),kind:"sum"},
    {label:"TOTAL REVENUE - RP",values:form.forecast.annual.map(row=>calcAnnual(row).revenue),kind:"sum"},
    {label:"EXCHANGE RATE US $ TO RP",values:form.forecast.annual.map(()=>optional(form.statistics.exchangeRate)),kind:"avg"}
  ];
  const roomStats=[
    ["# OF ROOMS",optional(form.statistics.rooms)],["ROOM AVAILABLE",values.roomAvailable],
    ["OCCUPIED ROOMS",optional(form.statistics.complimentary)!==null&&optional(form.statistics.roomPaid)!==null?optional(form.statistics.complimentary)!+optional(form.statistics.roomPaid)!:null],["OCCUPANCY (%)",values.occupancy],["AVERAGE ROOM RATE (ARR) (RP)",values.adr],["REVPAR",values.revpar]
  ] as [string,number|null][];
  const metric=(label:string,value:string,detail?:string)=><div key={label} className="min-w-0 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"><p className="text-xs font-semibold text-slate-500">{label}</p><p className="mt-1 break-words text-lg font-black tabular-nums text-slate-900">{value}</p>{detail&&<p className="mt-1 text-[11px] leading-4 text-slate-500">{detail}</p>}</div>;

  return <main className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-violet-50 px-3 pb-12 pt-20 text-slate-900 sm:px-6 lg:px-8 lg:pt-8">
    <div className="mx-auto max-w-[1500px]">
      <header className="mb-6 overflow-hidden rounded-[28px] bg-gradient-to-r from-[#173b67] via-[#245b8c] to-[#6554b7] p-5 text-white shadow-xl sm:p-8">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div><p className="mb-2 text-xs font-bold uppercase tracking-[.2em] text-sky-100">CORESTAY ADVISORY · HOTEL FINANCE WORKSPACE</p><h1 className="text-2xl font-black tracking-tight sm:text-4xl">Hotel Budget &amp; Forecasting</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-blue-50">Satu workspace untuk statistik hotel, rincian akun P&amp;L, perbandingan Actual vs Budget vs Last Year, proyeksi, dan tindakan manajemen.</p></div>
          <div className="min-w-[190px] rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur"><p className="text-xs text-blue-100">Status final validation</p><p className="mt-1 font-bold">{orchestrator==="passed"?"Lolos & tersimpan":orchestrator==="checking"?"Memvalidasi…":orchestrator==="failed"?"Perlu diperiksa":"Belum divalidasi"}</p><p className="mt-1 text-[11px] text-blue-100">{authStatus==="checking"?"Memeriksa sesi login":authStatus==="authenticated"?"Akun terhubung":"Bisa digunakan tanpa login"}</p></div>
        </div>
      </header>

      <nav className="mb-6" aria-label="Urutan tahapan pengisian">
        <div className="mb-3 flex items-center justify-between gap-3 px-1">
          <div><p className="text-xs font-extrabold uppercase tracking-[.16em] text-slate-500">Your workflow</p><p className="mt-1 text-sm font-bold text-slate-800">Langkah {sectionIndex+1} <span className="font-medium text-slate-400">dari 6</span></p></div>
          <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm">{Math.round(((sectionIndex+1)/tabItems.length)*100)}% perjalanan</span>
        </div>
        <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-gradient-to-r from-sky-500 via-violet-500 to-fuchsia-500 transition-all duration-500" style={{width:(((sectionIndex+1)/tabItems.length)*100)+"%"}} /></div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-7">
          {tabItems.map((tab,i)=><button type="button" key={tab.id} aria-current={activeTab===tab.id?"step":undefined} onClick={()=>{setActiveTab(tab.id);setIssues([]);setMessage("");window.scrollTo({top:0,behavior:"smooth"});}} className={"group min-w-0 rounded-2xl border p-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-sky-100 "+(activeTab===tab.id?"border-sky-300 bg-white shadow-lg ring-2 ring-sky-100":i<sectionIndex?"border-emerald-200 bg-emerald-50/80 shadow-sm":"border-white bg-white/80 shadow-sm hover:border-slate-200")}>
            <span className={"mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br text-xl shadow-sm "+tab.color}>{i<sectionIndex?<span className="text-sm font-black text-white">✓</span>:<span>{tab.icon}</span>}</span>
            <span className="block min-h-[2.5rem] text-xs font-extrabold leading-5 text-slate-800 sm:text-sm">{tab.label}</span>
            <span className="mt-1 block min-h-[2rem] text-[11px] leading-4 text-slate-500">{tab.sub}</span>
            <span className={"mt-3 block h-1 rounded-full transition-all "+(activeTab===tab.id?"bg-gradient-to-r "+tab.color:i<sectionIndex?"bg-emerald-300":"bg-slate-100 group-hover:bg-slate-200")}></span>
          </button>)}        </div>
      </nav>

      <div className="grid items-start gap-5 2xl:grid-cols-[minmax(0,1fr)_310px]">
        <section className="min-w-0 rounded-[26px] border border-white bg-white/95 p-4 shadow-lg shadow-slate-200/50 sm:p-6">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-3 rounded-2xl bg-gradient-to-r from-slate-50 via-white to-sky-50 p-4 sm:p-5"><div className="flex min-w-0 items-start gap-3"><div className={"flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-2xl shadow-sm "+(tabItems.find(x=>x.id===activeTab)?.color||"from-sky-500 to-blue-600")}>{tabItems.find(x=>x.id===activeTab)?.icon||"🏨"}</div><div><h2 className="mt-1 text-xl font-extrabold sm:text-2xl">{sectionLabel}</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">{tabItems.find(x=>x.id===activeTab)?.detail}{activeTab!=="export"&&" Nilai kosong tidak otomatis diubah menjadi nol."}</p></div></div><label className="flex items-center gap-2 self-start rounded-full border border-sky-100 bg-white px-3 py-1.5 text-xs font-bold text-sky-800 shadow-sm"><span>Mata uang</span><select aria-label="Pilih mata uang laporan" value={currency} onChange={e=>setCurrency(e.target.value as "IDR"|"USD")} className="rounded-lg border border-sky-200 bg-white px-2 py-1.5 font-bold text-slate-800"><option value="IDR">IDR · Rupiah</option><option value="USD">USD · US Dollar ($)</option></select></label></div>

          {activeTab==="payroll"&&<div className="space-y-5">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><h3 className="font-extrabold text-emerald-950">MASTER PAYROLL · SINGLE SOURCE OF TRUTH</h3><p className="mt-1 text-sm leading-6 text-emerald-900">Input data karyawan hanya di sini. Gaji, medical, THR, makan, Jamsostek perusahaan, dan PPh akan dihitung otomatis. Departemen pada Budget P&amp;L dan Forecast akan menggunakan master ini untuk komponen payroll terkait.</p><p className="mt-2 text-xs leading-5 text-emerald-900">Perhitungan pajak merupakan estimasi perencanaan berdasarkan tarif progresif tahunan; validasikan dengan payroll/tax advisor sebelum digunakan untuk penggajian resmi.</p></div>
            <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-lg font-extrabold text-slate-900">Data karyawan dan perhitungan biaya</h3><p className="text-xs text-slate-500">Kosongkan angka yang belum diketahui; tidak ada contoh nominal yang dimasukkan otomatis.</p></div><button type="button" onClick={addPayrollEmployee} className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800">+ Tambah karyawan / posisi</button></div>
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white"><table className="min-w-[2100px] border-collapse text-xs"><thead><tr className="bg-slate-900 text-white">{["No. staf","Departemen","Jabatan","Gaji pokok / bln","Medical / bln","Makan / bln","THR provisi / bln","Jamsostek perusahaan 4,89%","Jamsostek staf 2%","Gross income / bln","PTKP / tahun","Biaya jabatan / bln","PKP / bln","PKP / tahun","PPh / tahun","PPh / bln","Asuransi perusahaan / bln","Biaya lain / bln","TOTAL BIAYA PERUSAHAAN / bln","Aksi"].map(h=><th key={h} className="px-3 py-3 text-right font-bold">{h}</th>)}</tr></thead><tbody>
              {(form.payrollEmployees||[]).map((emp,index)=>{const c=payrollCalc(emp);const hasInputs=payrollHasInputs(emp);const money=(v:number)=>hasInputs?new Intl.NumberFormat("id-ID",{maximumFractionDigits:0}).format(v):"—";const input=(key:keyof PayrollEmployee,label:string,type="text")=><input aria-label={label} type={type} value={emp[key]} onChange={e=>updatePayrollEmployee(emp.id,key,e.target.value)} className="w-32 rounded-md border border-slate-200 px-2 py-2 text-right tabular-nums focus:border-emerald-500 focus:outline-none"/>;return <tr key={emp.id} className="border-t border-slate-100"><td className="px-3 py-2 text-center">{input("headcount","Jumlah staf "+(index+1),"number")}</td><td className="px-3 py-2"><select aria-label="Departemen" value={emp.department} onChange={e=>updatePayrollEmployee(emp.id,"department",e.target.value)} className="w-36 rounded-md border border-slate-200 px-2 py-2">{[["FO","Front Office"],["HK","Housekeeping"],["FB","Food & Beverage"],["MOD","Minor Operated Department"],["AG","Executive / General Affair"],["FN","Finance / Accounting"],["HR","Human Resource"],["SEC","Security"],["ENG","Engineering"],["POMEC","POMEC & Utilities"],["SM","Sales & Marketing"]].map(([v,l])=><option key={v} value={v}>{v==="AG"?"AG - EXEC":v==="FB"?"F&B":v} · {l}</option>)}</select></td><td className="px-3 py-2">{input("position","Jabatan")}</td><td className="px-3 py-2">{input("basicSalary","Gaji pokok","number")}</td><td className="px-3 py-2">{input("medical","Medical","number")}</td><td className="px-3 py-2">{input("meal","Makan","number")}</td><td className="px-3 py-2 text-right">{hasInputs?money(c.thr):"—"}</td><td className="px-3 py-2 text-right">{hasInputs?money(c.bpjsCompany):"—"}</td><td className="px-3 py-2 text-right">{hasInputs?money(c.bpjsStaff):"—"}</td><td className="px-3 py-2 text-right font-bold">{money(c.gross)}</td><td className="px-3 py-2">{input("ptkpAnnual","PTKP tahunan","number")}</td><td className="px-3 py-2 text-right">{money(c.jobExpense)}</td><td className="px-3 py-2 text-right">{hasInputs&&c.hasPtkp?money(c.pkp):"—"}</td><td className="px-3 py-2 text-right">{hasInputs&&c.hasPtkp?money(c.pkpAnnual):"—"}</td><td className="px-3 py-2 text-right">{hasInputs&&c.hasPtkp?money(c.taxYear):"—"}</td><td className="px-3 py-2 text-right">{hasInputs&&c.hasPtkp?money(c.taxMonth):"—"}</td><td className="px-3 py-2">{input("insuranceMonthly","Asuransi perusahaan","number")}</td><td className="px-3 py-2">{input("otherMonthly","Biaya lain perusahaan","number")}</td><td className="px-3 py-2 text-right font-black text-emerald-800">{money(c.total)}</td><td className="px-3 py-2"><button type="button" onClick={()=>removePayrollEmployee(emp.id)} className="rounded-md border border-rose-200 px-2 py-1.5 font-bold text-rose-700">Hapus</button></td></tr>})}
              {(form.payrollEmployees||[]).length===0&&<tr><td colSpan={20} className="px-5 py-12 text-center text-slate-500">Belum ada data karyawan. Pilih “Tambah karyawan / posisi” untuk mulai mengisi Master Payroll.</td></tr>}
              <tr className="bg-emerald-50 font-black"><td colSpan={3} className="px-3 py-3">GRAND TOTAL</td>{["basic","medical","meal","thr","bpjsCompany","bpjsStaff","gross","ptkp","jobExpense","pkp","pkpAnnual","taxYear","taxMonth","insurance","other","total"].map(key=><td key={key} className="px-3 py-3 text-right">{(()=>{const active=(form.payrollEmployees||[]).filter(payrollHasInputs);const taxKnown=active.some(e=>String(e.ptkpAnnual??"").trim()!=="");if(!active.length||(["ptkp","pkp","pkpAnnual","taxYear","taxMonth"].includes(key)&&!taxKnown))return "—";const value=active.reduce((sum,e)=>{const c=payrollCalc(e);return sum+(key==="ptkp"&&!c.hasPtkp?0:(c as any)[key]);},0);return new Intl.NumberFormat("id-ID",{maximumFractionDigits:0}).format(value);})()}</td>)}<td></td></tr>
              </tbody></table></div>
            <div className="rounded-xl border border-slate-200 bg-white p-4"><h4 className="font-extrabold text-slate-900">Rekap biaya per departemen</h4><div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{[["FO","Front Office"],["HK","Housekeeping"],["FB","Food & Beverage"],["MOD","Minor Operated Dept"],["AG","Administration & General"],["HR","Human Resource"],["SEC","Security / Engineering"],["SM","Sales & Marketing"],["POMEC","POMEC & Utilities"],["ROOM","Room Division"]].map(([key,label])=>{const v=payrollDepartmentMonthly(key);return <div key={key} className="rounded-lg border border-slate-100 bg-slate-50 p-3"><div className="font-bold">{label}</div><div className="mt-1 text-xs text-slate-500">Biaya payroll bulanan · {(form.payrollEmployees||[]).filter(e=>payrollDepartmentMatches(e,key)&&payrollHasInputs(e)).reduce((sum,e)=>sum+(Number(e.headcount)||0),0)} staf</div><div className="mt-2 text-lg font-black text-slate-900">{payrollDepartmentHasInputs(key)?idr(v.total):"—"}</div></div>})}</div></div>
          </div>}
          {activeTab==="statistics"&&<div className="space-y-5">
            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="bg-gradient-to-r from-[#173b67] via-[#245b8c] to-[#6554b7] px-5 py-5 text-white sm:px-7">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-2xl">🏨</div>
                  <div><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-sky-100">STEP 1 · HOTEL PROFILE</p><h2 className="mt-1 text-xl font-black sm:text-2xl">Hotel Statistics & Budget Assumptions</h2><p className="mt-1 max-w-2xl text-sm leading-5 text-blue-50">Satu sumber data untuk kapasitas kamar, occupancy, ARR, dan perhitungan forecast berikutnya.</p></div>
                </div>
              </div>
              <div className="space-y-5 p-4 sm:p-6">
                <div>
                  <div className="mb-3 flex items-center gap-2"><span className="h-5 w-1 rounded-full bg-sky-500"/><h3 className="text-sm font-extrabold uppercase tracking-wide text-slate-800">Identitas & Periode</h3></div>
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {field("Nama hotel",form.hotelName,v=>updateMeta("hotelName",v),{placeholder:"Contoh: CoreStay Hotel"})}
                    {field("Periode laporan",form.period,v=>updateMeta("period",v),{placeholder:"Contoh: Januari – Desember"})}
                    {field("Tahun awal forecast",form.yearStart,v=>updateMeta("yearStart",v),{type:"number",min:"1900",step:"1"})}
                  </div>
                </div>
                <div className="rounded-2xl border border-sky-100 bg-sky-50/60 p-4 sm:p-5">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div><h3 className="text-sm font-extrabold uppercase tracking-wide text-slate-800">Hotel Statistics</h3><p className="mt-1 text-xs leading-5 text-slate-600">Occupancy dan ARR menjadi acuan forecast. Room Available serta KPI hasil tetap dihitung dari rumus statistik.</p></div><span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-sky-800 ring-1 ring-sky-200">IDR · Rupiah</span></div>
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {statField("days","DAYS IN PERIOD","Jumlah hari pada periode statistik yang dipilih.")}
                    {statField("rooms","# OF ROOMS","Jumlah kamar fisik hotel.")}
                    {field("OCCUPANCY (%)",form.statistics.occupancy,v=>updateStats("occupancy",v),{type:"number",min:"0",step:"0.1",placeholder:"Contoh: 65",hint:"Asumsi occupancy forecast dalam persen (0–100)."})}
                    {field("AVERAGE ROOM RATE (ARR)",form.statistics.averageSellingRate,v=>updateStats("averageSellingRate",v),{type:"number",min:"0",step:"1",placeholder:"Contoh: 650000",hint:"ARR dalam Rupiah per kamar terjual; dipakai sebagai acuan forecast."})}
                    {field("AVERAGE GUEST / ROOM",form.statistics.fbAverageGuestsPerRoom,v=>updateStats("fbAverageGuestsPerRoom",v),{type:"number",min:"0",step:"0.1",placeholder:"Contoh: 1.8",hint:"Rata-rata jumlah tamu per kamar terisi."})}
                    {field("LENGTH OF STAY",form.statistics.fbLengthOfStay,v=>updateStats("fbLengthOfStay",v),{type:"number",min:"0",step:"0.1",placeholder:"Contoh: 2.3",hint:"Rata-rata lama menginap tamu dalam malam."})}
                    {field("EXCHANGE RATE US $ TO RP",form.statistics.exchangeRate,v=>updateStats("exchangeRate",v),{type:"number",min:"0",step:"any",hint:"Kurs USD ke Rupiah sesuai sumber/periode.",placeholder:"Contoh: 16000"})}
                  </div>
                </div>
                <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-amber-100 bg-gradient-to-r from-amber-50 via-white to-stone-50 p-4 text-slate-800 sm:p-5">
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-amber-800">STEP 1 · REVENUE BUDGET</p>
                    <h3 className="mt-1 text-xl font-black sm:text-2xl">F&amp;B Revenue Builder</h3>
                    <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-600 sm:text-sm">Isi asumsi langsung. Forecast dihitung otomatis dan dikirim ke Budget P&amp;L Step 3; Historical hanya pembanding, bukan tambahan revenue.</p>
                  </div>
                  {(() => {
                    const year=Number(form.yearStart);
                    const monthlyInputs=Array.from({length:12},(_,i)=>({...emptyFbMonthlyInput(),...(form.statistics.fbMonthlyInputs?.[i]||{})}));
                    const stats={...form.statistics,fbMonthlyInputs:monthlyInputs};
                    const months=Array.from({length:12},(_,i)=>calculateFbStatisticsMonthly(stats,year,i));
                    const annual=calculateFbStatisticsAnnualBreakdown(stats,year);
                    const rows=[
                      {key:"meetingRoomARevenue" as const,label:"Banquet / Wedding Event",formula:"Event/tahun × tamu/event × revenue/tamu",base:fbEventSubcategories.some(item=>optional(item.eventsPerYear)!==null&&optional(item.guestsPerEvent)!==null&&optional(item.revenuePerGuest)!==null)?fbEventSubcategories.reduce<number>((sum,item)=>sum+((optional(item.eventsPerYear)!==null&&optional(item.guestsPerEvent)!==null&&optional(item.revenuePerGuest)!==null)?Number(item.eventsPerYear)*Number(item.guestsPerEvent)*Number(item.revenuePerGuest):0),0):null},
                      {key:"meetingRoomBRevenue" as const,label:"Room Service",formula:"Orders/hari × average order value × hari",base:optional(stats.fbRoomServiceOrdersPerDay)!==null&&optional(stats.fbRoomServiceAverageOrderValue)!==null?Number(stats.fbRoomServiceOrdersPerDay)*Number(stats.fbRoomServiceAverageOrderValue)*Array.from({length:12},(_,i)=>new Date(year,i+1,0).getDate()).reduce((a,b)=>a+b,0):null},
                      {key:"additionalMeetingRevenue" as const,label:"Other F&B",formula:stats.fbOtherRevenueMethod==="direct"?"Revenue langsung":"Volume/hari × average check × hari operasi",base:stats.fbOtherRevenueMethod==="direct"?optional(stats.fbOtherAnnualRevenue):optional(stats.fbOtherDriverVolumePerDay)!==null&&optional(stats.fbOtherDriverAverageCheck)!==null&&optional(stats.fbOtherDriverOperatingDays)!==null?Number(stats.fbOtherDriverVolumePerDay)*Number(stats.fbOtherDriverAverageCheck)*Number(stats.fbOtherDriverOperatingDays):null}
                    ];
                    const histKeys={meetingRoomARevenue:"historicalMeetingRoomARevenue",meetingRoomBRevenue:"historicalMeetingRoomBRevenue",additionalMeetingRevenue:"historicalAdditionalMeetingRevenue"} as const;
                    const manualKeys={meetingRoomARevenue:"meetingRoomARevenue",meetingRoomBRevenue:"meetingRoomBRevenue",additionalMeetingRevenue:"additionalMeetingRevenue"} as const;
                    const histAnnual=(key:keyof typeof histKeys)=>{const values=monthlyInputs.map(row=>optional(row[histKeys[key]]));return values.some(v=>v!==null)?values.reduce<number>((sum,v)=>sum+(v??0),0):null;};
                    const monthlyTotal=(key:keyof typeof manualKeys)=>{const values=months.map(m=>m?.[key]??null);return values.some(v=>v!==null)?values.reduce<number>((sum,v)=>sum+(v??0),0):null;};
                    const fieldClass="w-full min-w-0 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-800 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100";
                    const monthField=(i:number,key:keyof FbMonthlyInput)=><input aria-label={String(key)+" "+monthNames[i]} type="number" min="0" step="any" value={monthlyInputs[i][key]} onChange={e=>updateFbMonthlyInput(i,key,e.target.value)} placeholder="—" className={fieldClass}/>;
                    return <div className="space-y-4 p-3 sm:p-5">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:col-span-3">
                          <p className="text-xs font-semibold text-amber-900">ESTIMASI TOTAL F&amp;B REVENUE / TAHUN</p>
                          <p className="mt-1 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">{idr(annual.meeting)}</p>
                          <p className="mt-2 text-xs text-slate-600">Total dari Banquet / Wedding Event + Room Service + Other F&amp;B</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
                        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                          <div className="mb-4 flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-800"><span className="text-lg">01</span></div>
                            <div><h4 className="font-bold text-slate-900">Banquet / Wedding Event</h4><p className="mt-1 text-xs text-slate-500">Event · Event × tamu/event × revenue/tamu</p></div>
                          </div>
                          <div className="space-y-3">{fbEventSubcategories.map((item)=>{const events=optional(item.eventsPerYear),guests=optional(item.guestsPerEvent),rate=optional(item.revenuePerGuest),amount=events!==null&&guests!==null&&rate!==null?events*guests*rate:null;return <div key={item.id} className="rounded-xl border border-slate-100 bg-slate-50/70 p-3"><div className="mb-3 flex items-center gap-2"><input aria-label="Nama subkategori" value={item.name} onChange={e=>updateFbEventSubcategory(item.id,"name",e.target.value)} className={fieldClass+" font-semibold"} placeholder="Nama event"/><button type="button" onClick={()=>removeFbEventSubcategory(item.id)} className="shrink-0 rounded-lg border border-rose-200 bg-white px-2 py-2 text-[11px] font-semibold text-rose-700">Hapus</button></div><div className="grid grid-cols-1 gap-2 sm:grid-cols-3">{field("Event / tahun",item.eventsPerYear,v=>updateFbEventSubcategory(item.id,"eventsPerYear",v),{type:"number",min:"0",step:"1"})}{field("Tamu / event",item.guestsPerEvent,v=>updateFbEventSubcategory(item.id,"guestsPerEvent",v),{type:"number",min:"0",step:"1"})}{field("Revenue / tamu (Rp)",item.revenuePerGuest,v=>updateFbEventSubcategory(item.id,"revenuePerGuest",v),{type:"number",min:"0",step:"1"})}</div><div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-200 pt-2"><span className="text-xs text-slate-500">Estimasi</span><span className="text-sm font-bold text-slate-900">{idr(amount)}</span></div></div>})}<button type="button" onClick={addFbEventSubcategory} className="w-full rounded-xl border border-dashed border-amber-300 bg-amber-50/50 px-3 py-2.5 text-sm font-semibold text-amber-900 hover:bg-amber-50">+ Tambah subkategori</button></div>
                          <div className="mt-4 rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Baseline / tahun</p><p className="mt-1 font-semibold text-slate-800">{idr(rows[0].base)}</p><div className="mt-2 flex items-center justify-between gap-2"><span className="text-xs text-slate-500">Forecast</span><span className="font-bold text-amber-800">{idr(monthlyTotal("meetingRoomARevenue"))}</span></div><div className="mt-1 flex items-center justify-between gap-2"><span className="text-xs text-slate-500">Historical</span><span className="text-sm text-slate-700">{idr(histAnnual("meetingRoomARevenue"))}</span></div></div>
                        </section>
                        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                          <div className="mb-4 flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800"><span className="text-lg">02</span></div><div><h4 className="font-bold text-slate-900">Room Service</h4><p className="mt-1 text-xs text-slate-500">Orders · Orders/hari × average order value × hari</p></div></div>
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1">{field("Orders / hari",stats.fbRoomServiceOrdersPerDay,v=>updateStats("fbRoomServiceOrdersPerDay",v),{type:"number",min:"0",step:"any"})}{field("Average order value (Rp)",stats.fbRoomServiceAverageOrderValue,v=>updateStats("fbRoomServiceAverageOrderValue",v),{type:"number",min:"0",step:"1"})}</div>
                          <div className="mt-4 rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Baseline / tahun</p><p className="mt-1 font-semibold text-slate-800">{idr(rows[1].base)}</p><div className="mt-2 flex items-center justify-between gap-2"><span className="text-xs text-slate-500">Forecast</span><span className="font-bold text-emerald-800">{idr(monthlyTotal("meetingRoomBRevenue"))}</span></div><div className="mt-1 flex items-center justify-between gap-2"><span className="text-xs text-slate-500">Historical</span><span className="text-sm text-slate-700">{idr(histAnnual("meetingRoomBRevenue"))}</span></div></div>
                        </section>
                        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                          <div className="mb-4 flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-800"><span className="text-lg">03</span></div><div><h4 className="font-bold text-slate-900">Other F&amp;B</h4><p className="mt-1 text-xs text-slate-500">Flexible · Pendapatan F&amp;B lainnya</p></div></div>
                          <div className="space-y-3"><label className="block text-xs font-semibold text-slate-600">Metode input<select value={stats.fbOtherRevenueMethod||"direct"} onChange={e=>updateStats("fbOtherRevenueMethod",e.target.value as "direct"|"driver")} className={fieldClass+" mt-1"}><option value="direct">Revenue tahunan langsung</option><option value="driver">Driver khusus</option></select></label>{stats.fbOtherRevenueMethod==="direct"?field("Revenue tahunan (Rp)",stats.fbOtherAnnualRevenue,v=>updateStats("fbOtherAnnualRevenue",v),{type:"number",min:"0",step:"1"}):<div className="grid grid-cols-1 gap-2">{field("Volume / hari",stats.fbOtherDriverVolumePerDay,v=>updateStats("fbOtherDriverVolumePerDay",v),{type:"number",min:"0",step:"any"})}{field("Average check (Rp)",stats.fbOtherDriverAverageCheck,v=>updateStats("fbOtherDriverAverageCheck",v),{type:"number",min:"0",step:"1"})}{field("Hari operasi / tahun",stats.fbOtherDriverOperatingDays,v=>updateStats("fbOtherDriverOperatingDays",v),{type:"number",min:"0",max:"366",step:"1"})}</div>}</div>
                          <div className="mt-4 rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Baseline / tahun</p><p className="mt-1 font-semibold text-slate-800">{idr(rows[2].base)}</p><div className="mt-2 flex items-center justify-between gap-2"><span className="text-xs text-slate-500">Forecast</span><span className="font-bold text-sky-800">{idr(monthlyTotal("additionalMeetingRevenue"))}</span></div><div className="mt-1 flex items-center justify-between gap-2"><span className="text-xs text-slate-500">Historical</span><span className="text-sm text-slate-700">{idr(histAnnual("additionalMeetingRevenue"))}</span></div></div>
                        </section>
                      </div>
                      <div className="flex flex-col gap-1 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-wide text-amber-900">Total 3 kategori</p><p className="mt-1 text-xs text-slate-600">Nilai yang belum diisi tetap —; Historical hanya pembanding, bukan tambahan revenue.</p></div><p className="text-xl font-black text-slate-900">{idr(annual.meeting)}</p></div>
                      
                    </div>;
                  })()}
                </div>
<div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                  <div className="bg-gradient-to-r from-violet-950 via-indigo-950 to-sky-900 p-4 text-white sm:p-5"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-200">MOD REVENUE BUILDER</p><h3 className="mt-1 text-lg font-black sm:text-xl">Minor Operating Departments Revenue</h3><p className="mt-1 text-xs leading-5 text-violet-100">Sembilan akun revenue mengikuti baris Revenue di MOD Budget P&amp;L Step 3. Isi anggaran tahunan dalam Rupiah; total dan alokasi bulanan dihitung otomatis dan disinkronkan ke akun Budget P&amp;L yang sama.</p><div className="mt-3 rounded-2xl border border-white/20 bg-white/10 px-4 py-3"><p className="text-[10px] font-bold uppercase tracking-wide text-violet-100">Estimasi MOD / Tahun</p><p className="mt-1 text-lg font-black">{idr(calculateModStatisticsAnnual(form.statistics))}</p></div></div>
                  <div className="grid gap-3 p-3 sm:grid-cols-2 sm:p-5">
                    {field("BUSINESS CENTER — REVENUE / YEAR (RP)",form.statistics.modBusinessCenterRevenue,v=>updateStats("modBusinessCenterRevenue",v),{type:"number",min:"0",step:"1",hint:"Akun Step 3: Business Center."})}
                    {field("RENT CAR / TRANSPORTATION — REVENUE / YEAR (RP)",form.statistics.modRentCarRevenue,v=>updateStats("modRentCarRevenue",v),{type:"number",min:"0",step:"1",hint:"Akun Step 3: Transportation / Rent Car."})}
                    {field("LAUNDRY — REVENUE / YEAR (RP)",form.statistics.modLaundryRevenue,v=>updateStats("modLaundryRevenue",v),{type:"number",min:"0",step:"1",hint:"Akun Step 3: Laundry."})}
                    {field("MASSAGE / SPA — REVENUE / YEAR (RP)",form.statistics.modMassageRevenue,v=>updateStats("modMassageRevenue",v),{type:"number",min:"0",step:"1",hint:"Akun Step 3: Spa."})}
                    {field("TELEPHONE — REVENUE / YEAR (RP)",form.statistics.modTelephoneRevenue,v=>updateStats("modTelephoneRevenue",v),{type:"number",min:"0",step:"1",hint:"Akun Step 3: Telephone."})}
                    {field("SPORT & RECREATION — REVENUE / YEAR (RP)",form.statistics.modSportRecreationRevenue,v=>updateStats("modSportRecreationRevenue",v),{type:"number",min:"0",step:"1",hint:"Akun Step 3: Sport & Recreation."})}
                    {field("RENTED SPACE — REVENUE / YEAR (RP)",form.statistics.modRentedSpaceRevenue,v=>updateStats("modRentedSpaceRevenue",v),{type:"number",min:"0",step:"1",hint:"Akun Step 3: Rented Space."})}
                    {field("MISCELLANEOUS OTHER REVENUE — REVENUE / YEAR (RP)",form.statistics.modOtherIncomeRevenue,v=>updateStats("modOtherIncomeRevenue",v),{type:"number",min:"0",step:"1",hint:"Akun Step 3: Miscellaneous Other Revenue."})}
                  </div>
                  <p className="mx-3 mb-3 rounded-xl bg-violet-50 px-3 py-2.5 text-xs leading-5 text-violet-950 sm:mx-5 sm:mb-5">Nilai revenue MOD dialokasikan ke bulan berdasarkan jumlah hari kalender dan disinkronkan ke akun Budget Step 3 dengan kode 41301–41309. Jika input Step 1 dikosongkan, Budget akun MOD terkait juga dikosongkan agar tidak tertinggal nilai lama; Actual, Last Year, dan YTD tidak ditimpa. Cost of Sales, Payroll &amp; Related, dan Other Expenses tetap mengikuti input biaya pada bagian terkait di Step 3.</p>
                </div>
              </div>
            </section>
          </div>}

          {activeTab==="pnl"&&<div className="space-y-5">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mt-5 space-y-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 sm:p-5">
<div className="space-y-4">
<div><h3 className="font-extrabold text-slate-800">DEPARTMENT EXPENSES</h3><p className="mt-1 text-sm text-slate-500">Pilih departemen untuk menampilkan rincian biaya. Di setiap departemen, bagian PAYROLL &amp; RELATED otomatis mengambil data dari Master Payroll dan seluruh nilainya terkunci—perubahan hanya dapat dilakukan di Master Payroll.</p></div>
<div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
{[{id:"room",label:"Room Division",sub:"Room Dept · Front Office · House Keeping",color:"border-sky-200 bg-sky-50 text-sky-900"},{id:"fb",label:"Food & Beverage",sub:"Revenue · Cost of Sales · Payroll · Expenses",color:"border-amber-200 bg-amber-50 text-amber-900"},{id:"mod",label:"Minor Operating Dept.",sub:"Pendapatan dan biaya departemen",color:"border-violet-200 bg-violet-50 text-violet-900"},{id:"ag",label:"Administration & General",sub:"Payroll dan biaya umum",color:"border-indigo-200 bg-indigo-50 text-indigo-900"},{id:"sm",label:"Sales & Marketing",sub:"Payroll dan biaya pemasaran",color:"border-pink-200 bg-pink-50 text-pink-900"},{id:"hrd",label:"Human Resources",sub:"Payroll dan biaya SDM",color:"border-emerald-200 bg-emerald-50 text-emerald-900"},{id:"pomec",label:"POMEC & Utilities",sub:"Maintenance dan energi",color:"border-orange-200 bg-orange-50 text-orange-900"},{id:"owner",label:"Other Expenses / Owner Share Profit",sub:"Other Expenses · Owner Expenses · Profit",color:"border-rose-200 bg-rose-50 text-rose-900"}].map(item=><button key={item.id} type="button" onClick={()=>setSelectedDepartment(item.id)} aria-pressed={selectedDepartment===item.id} className={"rounded-xl border p-3 text-left transition hover:shadow-sm "+item.color+(selectedDepartment===item.id?" ring-2 ring-slate-400 ring-offset-1 shadow-sm":" opacity-80")}><span className="block text-sm font-extrabold">{item.label}</span><span className="mt-1 block text-[11px] leading-4 opacity-80">{item.sub}</span></button>)}
</div>
</div>
                {selectedDepartment==="owner"&&<section className="mt-5 overflow-hidden rounded-xl border border-rose-200 bg-white">
                  <div className="bg-rose-900 px-4 py-3 text-white">
                    <h4 className="text-sm font-extrabold">OTHER EXPENSES / OWNER SHARE PROFIT</h4>
                    <p className="mt-1 text-xs text-rose-100">Input biaya owner per bulan. Nama item dapat diedit; nilai tersambung ke konsolidasi Step 4 serta ekspor PDF dan Excel.</p>
                  </div>
                  {(() => {
                    const order=[11,0,1,2,3,4,5,6,7,8,9,10];
                    const rows=[
                      {key:"otherManagementFee",label:"MANAGEMENT & MARKETING FEES",group:"OTHER EXPENSES"},
                      {key:"insuranceGeneral",label:"GENERAL INSURANCE",group:"OTHER EXPENSES"},
                      {key:"landLease",label:"LAND LEASE / HOLD",group:"OWNER EXPENSES"},
                      {key:"ownerInsurance",label:"OWNER INSURANCE",group:"OWNER EXPENSES"},
                      {key:"maintenanceFee",label:"SERVICE CHARGE / MAINTENANCE FEE",group:"OWNER EXPENSES"},
                      {key:"ownerOtherExpenses",label:"OTHER OWNER EXPENSES",group:"OWNER EXPENSES"}
                    ] as const;
                    const value=(i:number,key:string)=>optional(String(form.forecast.monthly[i]?.[key as keyof ForecastMonth]??""));
                    const sum=(key:string)=>order.some(i=>value(i,key)!==null)?order.reduce<number>((n,i)=>n+(value(i,key)??0),0):null;
                    const setValue=(i:number,key:string,v:string)=>setForm(prev=>({...prev,forecast:{...prev.forecast,monthly:prev.forecast.monthly.map((row,j)=>j===i?({...row,[key]:v}):row)}}));
                    const groupRows=(group:"OTHER EXPENSES"|"OWNER EXPENSES")=>rows.filter(row=>row.group===group);
                    const groupSum=(group:"OTHER EXPENSES"|"OWNER EXPENSES",monthIndex:number)=>{const items=groupRows(group).map(row=>value(monthIndex,row.key));return items.some(v=>v!==null)?items.reduce<number>((n,v)=>n+(v??0),0):null;};
                    const combinedSum=(monthIndex:number)=>{const items=rows.map(row=>value(monthIndex,row.key));return items.some(v=>v!==null)?items.reduce<number>((n,v)=>n+(v??0),0):null;};
                    const groupAnnual=(group:"OTHER EXPENSES"|"OWNER EXPENSES")=>order.some(i=>groupSum(group,i)!==null)?order.reduce<number>((n,i)=>n+(groupSum(group,i)??0),0):null;
                    const combinedAnnual=order.some(i=>combinedSum(i)!==null)?order.reduce<number>((n,i)=>n+(combinedSum(i)??0),0):null;
                    const displayTotal=(n:number|null)=>n===null?"—":new Intl.NumberFormat("id-ID",{maximumFractionDigits:0}).format(n);
                    const subtotalRow=(label:string,group:"OTHER EXPENSES"|"OWNER EXPENSES",combined=false)=><tr className="bg-rose-100 font-black"><td className="sticky left-0 z-[1] min-w-64 bg-rose-100 px-3 py-2.5 text-xs">{label}</td>{order.map(i=><td key={i} className="px-2 py-2.5 text-right text-xs tabular-nums">{displayTotal(combined?combinedSum(i):groupSum(group,i))}</td>)}<td className="px-3 py-2.5 text-right text-xs font-extrabold tabular-nums">{displayTotal(combined?combinedAnnual:groupAnnual(group))}</td></tr>;
                    const inputRow=(row:typeof rows[number])=><tr key={row.key} className="border-t border-slate-100"><td className="sticky left-0 z-[1] min-w-64 bg-white px-3 py-2 text-xs"><div className="flex min-w-56 flex-col items-start gap-1"><span>{itemLabel("owner",row.key,row.label)}</span>{editLabelButton("owner",row.key,row.label)}<details className="relative"><summary className="inline-flex cursor-pointer list-none items-center gap-1 whitespace-nowrap rounded border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] font-bold text-rose-800 hover:bg-rose-100">Atur biaya <span aria-hidden="true">⌄</span></summary><div className="mt-1 flex min-w-44 flex-col gap-2 rounded-lg border border-slate-200 bg-white p-2 shadow-sm"><label className="flex items-center justify-between gap-2 text-[10px] font-semibold text-slate-600">% Revenue Hotel<input aria-label={itemLabel("owner",row.key,row.label)+" asumsi persentase biaya"} type="number" min="0" step="0.01" placeholder="%" className="w-20 rounded border border-slate-200 px-1.5 py-1 text-right text-xs font-semibold text-slate-700" value={String(((form.forecast.monthly[0]||{}) as unknown as Record<string,string>)[row.key+"Percent"]||"")} onChange={e=>setForm(prev=>({...prev,forecast:{...prev.forecast,monthly:prev.forecast.monthly.map(month=>({...month,[row.key+"Percent"]:e.target.value}))}}))}/></label><button type="button" className="rounded border border-rose-200 bg-rose-50 px-2 py-1.5 text-left text-[10px] font-bold text-rose-800 hover:bg-rose-100" title="Hitung biaya owner dari persentase total revenue hotel per bulan" onClick={()=>{const raw=String(((form.forecast.monthly[0]||{}) as unknown as Record<string,string>)[row.key+"Percent"]||"");const percent=Number(raw);if(raw.trim()===""||!Number.isFinite(percent)||percent<0){setMessage("Masukkan asumsi persentase biaya owner yang valid terlebih dahulu.");return;}form.forecast.monthly.forEach((month,monthIndex)=>{const revenue=calcMonthly(month,Number(form.yearStart),monthIndex,form.statistics.rooms).revenue;if(revenue!==null&&Number.isFinite(revenue))setValue(monthIndex,row.key,String(Math.round(revenue*percent/100)));});}}>Isi berdasarkan % Revenue (12 bln)</button><button type="button" className="rounded border border-slate-200 bg-slate-50 px-2 py-1.5 text-left text-[10px] font-bold text-slate-700 hover:bg-slate-100" title="Isi biaya owner ke 12 bulan sesuai jumlah hari kalender" onClick={()=>fillCostAcrossYear((monthIndex,key,v)=>setValue(monthIndex,key,v),row.key,itemLabel("owner",row.key,row.label))}>Isi 12 bulan sesuai hari kalender</button></div></details></div></td>{order.map(i=><td key={i} className="px-2 py-1.5"><input aria-label={itemLabel("owner",row.key,row.label)+" "+form.forecast.monthly[i].label} inputMode="numeric" placeholder="—" className="w-28 rounded-md border border-slate-200 px-2 py-1.5 text-right text-xs tabular-nums focus:border-rose-400 focus:outline-none" value={String(form.forecast.monthly[i]?.[row.key as keyof ForecastMonth]??"")} onChange={e=>setValue(i,row.key,e.target.value.replace(/[^0-9]/g,""))}/></td>)}<td className="px-3 py-2 text-right text-xs font-extrabold tabular-nums">{displayTotal(sum(row.key))}</td></tr>;
                    return <div className="overflow-x-auto"><table className="min-w-max border-collapse"><thead><tr className="bg-rose-50"><th className="sticky left-0 z-10 min-w-64 bg-rose-50 px-3 py-3 text-left text-xs">ACCOUNT / DESCRIPTION</th>{order.map(i=><th key={i} className="min-w-28 px-2 py-3 text-right text-xs">{i===11?"Dec":monthNames[i].slice(0,3)}</th>)}<th className="min-w-32 px-3 py-3 text-right text-xs">TOTAL</th></tr></thead><tbody>
                    <tr><td colSpan={14} className="bg-slate-100 px-3 py-2 text-xs font-black">OTHER EXPENSES</td></tr>
                    {groupRows("OTHER EXPENSES").map(inputRow)}
                    {subtotalRow("SUBTOTAL OTHER EXPENSES","OTHER EXPENSES")}
                    <tr aria-hidden="true"><td colSpan={14} className="h-4 border-0 bg-white p-0"></td></tr>
                    <tr><td colSpan={14} className="bg-slate-100 px-3 py-2 text-xs font-black">OWNER EXPENSES</td></tr>
                    {groupRows("OWNER EXPENSES").map(inputRow)}
                    {subtotalRow("SUBTOTAL OWNER EXPENSES","OWNER EXPENSES")}
                    <tr aria-hidden="true"><td colSpan={14} className="h-3 border-0 bg-white p-0"></td></tr>
                    {subtotalRow("TOTAL OTHER EXPENSES + OWNER EXPENSES","OTHER EXPENSES",true)}
                    </tbody></table></div>;
                  })()}
                </section>}
                {selectedDepartment==="room"&&<div className="space-y-3"><div><h4 className="font-extrabold text-slate-800">ROOM DIVISION</h4><p className="mt-1 text-xs text-slate-500">Format laporan: ROOM DEPARTMENT, FRONT OFFICE &amp; RESERVATION, HOUSE KEEPING; subtotal biaya, total biaya departemen, dan departmental profit. Periode: Dec, Jan–Nov, TOTAL, %.</p></div>
{(() => {
const order=[11,0,1,2,3,4,5,6,7,8,9,10];
const groups=[
{title:"ROOM DEPARTMENT",sections:[{title:"REVENUE",rows:[["roomRevenue","ROOM REVENUE"]]},{title:"PAYROLL & RELATED",rows:[["rdSalary","SALARY & WAGES"],["rdIncomeTax","INCOME TAX"],["rdJamsostek","JAMSOSTEK"],["rdInsurance","INSURANCE"],["rdThr","THR / BONUS PROVISION"],["rdMeal","MEAL ALLOWANCES"],["rdMedical","MEDICAL / ASKES"],["rdOtherPayroll","OTHER PAYROLL COST"]]},{title:"PROV. OPERATING EQUIP.",rows:[["rdChina","CHINA WARE"],["rdGlass","GLASS WARE"],["rdSilver","SILVERWARE"],["rdLinen","LINEN"]]},{title:"OTHER EXPENSES",rows:[["rdDecoration","DECORATION"],["rdDues","DUES & SUBSCRIPTION"],["rdEntertainment","ENTERTAINMENT"],["rdWelcomeDrink","WELLCOME DRINK"],["rdCable","CABLE VISION"],["rdLaundry","LAUNDRY LINEN"],["rdMisc","MISCELLANEOUS"],["rdPostage","POSTAGE"],["rdGuestSupplies","GUEST SUPPLIES"],["rdCleaning","CLEANING SUPPLIES"],["rdAmenities","ROOM AMENITIES"],["rdPrinting","PRINTING & STATIONARY"],["rdTelephone","TELEPHONE & FACSIMILE"],["rdTransportGuest","TRANSPORTATION - GUEST"],["rdUniform","UNIFORM"],["rdInternet","PROVIDER INTERNET"],["rdPest","PEST CONTROL"]]}]},
{title:"FRONT OFFICE & RESERVATION",sections:[{title:"PAYROLL & RELATED",rows:[["foSalary","SALARY & WAGES"],["foIncomeTax","INCOME TAX"],["foJamsostek","JAMSOSTEK"],["foInsurance","INSURANCE"],["foBonus","PROV. FOR BONUS"],["foMeal","MEAL ALLOWANCES"],["foMedical","MEDICAL / ASKES"],["foOtherPayroll","OTHER PAYROLL COST"]]},{title:"OTHER EXPENSES",rows:[["foDecoration","DECORATION"],["foDues","DUES & SUBSCRIPTION"],["foEntertainment","ENTERTAINMENT"],["foWelcomeDrink","WELLCOME DRINK"],["foLaundry","LAUNDRY - UNIFORM"],["foMisc","MISCELANEOUS"],["foPostage","POSTAGE"],["foReservation","RESERVATION EXPENSES"],["foTelephone","TELEPHONE & FACSIMILE"],["foTransportGuest","TRANSPORTATION - GUEST"],["foGuestSupplies","GUEST SUPPLIES"],["foCleaning","CLEANING SUPPLIES"],["foPrinting","PRINTING & STATIONARY"],["foUniform","UNIFORM"]]}]},
{title:"HOUSE KEEPING",sections:[{title:"PAYROLL & RELATED",rows:[["hkSalary","SALARY & WAGES"],["hkIncomeTax","INCOME TAX"],["hkJamsostek","JAMSOSTEK"],["hkInsurance","INSURANCE"],["hkThr","THR"],["hkMeal","MEAL ALLOWANCES"],["hkMedical","MEDICAL / ASKES"],["hkOtherPayroll","OTHER PAYROLL COST"]]},{title:"PROV. OPERATING EQUIP.",rows:[["hkChina","CHINA WARE"],["hkGlass","GLASS WARE"],["hkSilver","SILVERWARE"],["hkLinen","LINEN"]]},{title:"OTHER EXPENSES",rows:[["hkDecoration","DECORATION"],["hkWelcomeDrink","WELLCOME DRINK"],["hkCable","CABLE VISION"],["hkLaundry","LAUNDRY LINEN"],["hkGuestSupplies","GUEST SUPPLIES"],["hkCleaning","CLEANING SUPPLIES"],["hkAmenities","ROOM AMENITIES"],["hkPrinting","PRINTING & STATIONARY"],["hkUniform","UNIFORM"],["hkInternet","PROVIDER INTERNET"],["hkPest","PEST CONTROLL"]]}]}
];
const value=(i:number,k:string):number|null=>{
const row=form.forecast.monthly[i];
if(k==="roomRevenue"){
const saved=optional(row?.roomDivisionDetails?.roomRevenue);
if(saved!==null)return saved;
const calculated=calcMonthly(row, Number(form.yearStart)||new Date().getFullYear(), i, form.statistics.rooms);
return calculated.roomRevenue;
}
if(k.startsWith("rd")){
const suffixMap:Record<string,string[]>={rdSalary:["foSalary","hkSalary"],rdIncomeTax:["foIncomeTax","hkIncomeTax"],rdJamsostek:["foJamsostek","hkJamsostek"],rdInsurance:["foInsurance","hkInsurance"],rdThr:["foBonus","hkThr"],rdMeal:["foMeal","hkMeal"],rdMedical:["foMedical","hkMedical"],rdOtherPayroll:["foOtherPayroll","hkOtherPayroll"],rdChina:["hkChina"],rdGlass:["hkGlass"],rdSilver:["hkSilver"],rdLinen:["hkLinen"],rdDecoration:["foDecoration","hkDecoration"],rdDues:["foDues"],rdEntertainment:["foEntertainment"],rdWelcomeDrink:["foWelcomeDrink","hkWelcomeDrink"],rdCable:["hkCable"],rdLaundry:["foLaundry","hkLaundry"],rdMisc:["foMisc"],rdPostage:["foPostage"],rdGuestSupplies:["foGuestSupplies","hkGuestSupplies"],rdCleaning:["foCleaning","hkCleaning"],rdAmenities:["hkAmenities"],rdPrinting:["foPrinting","hkPrinting"],rdTelephone:["foTelephone"],rdTransportGuest:["foTransportGuest"],rdUniform:["foUniform","hkUniform"],rdInternet:["hkInternet"],rdPest:["hkPest"]};
const keys=suffixMap[k]||[];
const values=keys.map(key=>{const pv=payrollInputKey(key)?payrollValueFor(key.startsWith("fo")?"FO":"HK",key):"";return optional(pv!==""?pv:row?.roomDivisionDetails?.[key]||"");});
return values.some(v=>v!==null)?values.reduce<number>((sum,v)=>sum+(v??0),0):null;
}
const payrollValue=payrollInputKey(k)?payrollValueFor(k.startsWith("fo")?"FO":"HK",k):"";
const detailValue=row?.roomDivisionDetails?.[k]||"";
return optional(payrollValue!==""?payrollValue:detailValue);
};
const total=(i:number,keys:string[])=>{const a=keys.map(k=>value(i,k));return a.some(v=>v!==null)?a.reduce<number>((s,v)=>s+(v??0),0):null};
const fmtMoney=(n:number|null)=>n===null?"—":new Intl.NumberFormat("id-ID",{maximumFractionDigits:0}).format(n);
const rev=order.every(i=>value(i,"roomRevenue")===null)?null:order.reduce<number>((s,i)=>s+(value(i,"roomRevenue")??0),0);
// Room Division consolidated cost = Front Office & Reservation + House Keeping. The ROOM DEPARTMENT block is shown separately and is not added into this source-template total.
const frontOfficeGroup=groups.find(g=>g.title==="FRONT OFFICE & RESERVATION")!;
const houseKeepingGroup=groups.find(g=>g.title==="HOUSE KEEPING")!;
const frontOfficeCostKeys=frontOfficeGroup.sections.flatMap(s=>s.rows.map(r=>r[0])).filter(k=>k!=="roomRevenue");
const houseKeepingCostKeys=houseKeepingGroup.sections.flatMap(s=>s.rows.map(r=>r[0])).filter(k=>k!=="roomRevenue");
const costKeys=[...frontOfficeCostKeys,...houseKeepingCostKeys];
const groupCostKeys=(g:typeof groups[number])=>g.sections.flatMap(section=>section.rows.map(row=>row[0])).filter(key=>key!=="roomRevenue");
const costTotal=order.every(i=>total(i,costKeys)===null)?null:order.reduce<number>((s,i)=>s+(total(i,costKeys)??0),0);
// Match the agreed Excel logic: Departmental Profit = Room Revenue - Front Office costs - House Keeping costs.
// Room Department cost lines mirror FO/HK values for presentation and must not be added a second time.
const departmentalProfit=(i:number):number|null=>{
  const roomRevenue=value(i,"roomRevenue");
  const frontOfficeCost=total(i,frontOfficeCostKeys);
  const houseKeepingCost=total(i,houseKeepingCostKeys);
  if(roomRevenue===null||(frontOfficeCost===null&&houseKeepingCost===null))return null;
  return roomRevenue-(frontOfficeCost??0)-(houseKeepingCost??0);
};
const departmentalProfitTotal=rev!==null&&costTotal!==null?rev-costTotal:null;
const pct=(n:number|null)=>n===null||rev===null||rev===0?"—":new Intl.NumberFormat("id-ID",{maximumFractionDigits:2}).format(n/rev*100)+"%";
const totalRow=(label:string,keys:string[])=><tr className="bg-slate-100 font-bold"><td className="sticky left-0 z-10 min-w-52 bg-slate-100 px-3 py-2 text-xs">{label}</td>{order.map(i=><td key={i} className="px-2 py-2 text-right text-xs tabular-nums">{fmtMoney(total(i,keys))}</td>)}<td className="px-2 py-2 text-right text-xs tabular-nums">{fmtMoney(order.every(i=>total(i,keys)===null)?null:order.reduce<number>((s,i)=>s+(total(i,keys)??0),0))}</td><td className="px-2 py-2 text-right text-xs">{pct(order.every(i=>total(i,keys)===null)?null:order.reduce<number>((s,i)=>s+(total(i,keys)??0),0))}</td></tr>;
return <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white"><table className="min-w-max border-collapse"><thead><tr className="bg-sky-900 text-white"><th className="sticky left-0 z-20 min-w-52 px-3 py-3 text-left text-xs">ROOM DIVISION — BUDGET P&amp;L</th>{order.map(i=><th key={i} className="min-w-28 px-2 py-3 text-right text-xs">{i===11?"Dec":monthNames[i].slice(0,3)}</th>)}<th className="min-w-32 px-2 py-3 text-right text-xs">TOTAL</th><th className="min-w-20 px-2 py-3 text-right text-xs">%</th></tr></thead><tbody>
{groups.map(g=><Fragment key={g.title}><tr className={g.title==="ROOM DEPARTMENT"?"border-t-4 border-blue-300 bg-blue-100":g.title==="FRONT OFFICE & RESERVATION"?"border-t-4 border-amber-300 bg-amber-100":"border-t-4 border-violet-300 bg-violet-100"}><td colSpan={15} className={g.title==="ROOM DEPARTMENT"?"px-3 py-3 text-xs font-black tracking-wide text-blue-950":g.title==="FRONT OFFICE & RESERVATION"?"px-3 py-3 text-xs font-black tracking-wide text-amber-950":"px-3 py-3 text-xs font-black tracking-wide text-violet-950"}><span className="mr-2 inline-block h-2 w-2 rounded-full bg-current align-middle"/>{g.title}</td></tr>{g.sections.map(s=><Fragment key={s.title}><tr><td colSpan={15} className="bg-slate-100 px-3 py-2 text-xs font-extrabold">{s.title}</td></tr>{s.rows.map(([key,label])=><tr key={key} className="border-t border-slate-100"><td className="sticky left-0 z-10 min-w-52 bg-white px-3 py-2 text-xs">{itemLabel("room",key,label)} {editLabelButton("room",key,label)} {costPercentControl(key,itemLabel("room",key,label),"roomDivisionDetails",updateRoomDivision,"room")} {costFillButton(key,itemLabel("room",key,label),updateRoomDivision)}</td>{order.map(i=><td key={i} className="px-2 py-1.5"><input aria-label={label+" "+form.forecast.monthly[i].label} inputMode="numeric" className="w-28 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-right text-xs tabular-nums focus:border-sky-400 focus:outline-none" placeholder="—" value={g.title==="ROOM DEPARTMENT"?(value(i,key)===null?"—":key==="rdIncomeTax"?formatIncomeTax(value(i,key)):formatWholeRupiah(value(i,key))):(key==="rdIncomeTax"||key==="foIncomeTax"||key==="hkIncomeTax")?formatIncomeTax(payrollInputKey(key)?(payrollValueFor(key.startsWith("rd")?"ROOM":key.startsWith("fo")?"FO":"HK",key)||form.forecast.monthly[i]?.roomDivisionDetails?.[key]||""):form.forecast.monthly[i]?.roomDivisionDetails?.[key]||""):formatWholeRupiah(payrollInputKey(key)?(payrollValueFor(key.startsWith("rd")?"ROOM":key.startsWith("fo")?"FO":"HK",key)||form.forecast.monthly[i]?.roomDivisionDetails?.[key]||""):form.forecast.monthly[i]?.roomDivisionDetails?.[key]||"")} readOnly={g.title==="ROOM DEPARTMENT"||payrollInputKey(key)||key==="roomRevenue"} disabled={g.title==="ROOM DEPARTMENT"||payrollInputKey(key)||key==="roomRevenue"} title={key==="roomRevenue"?"Otomatis dari forecast Revenue Room.":g.title==="ROOM DEPARTMENT"?"Akumulasi otomatis dari Front Office & Reservation dan House Keeping.":payrollInputKey(key)?"Dikunci: nilai otomatis dari Master Payroll. Ubah hanya di Master Payroll.":"Input manual"} onChange={e=>{if(g.title!=="ROOM DEPARTMENT"&&!payrollInputKey(key)&&key!=="roomRevenue")updateRoomDivision(i,key,e.target.value.replace(/[^0-9]/g,""));}}/></td>)}<td className="px-2 py-2 text-right text-xs font-bold tabular-nums">{fmtMoney(order.every(i=>value(i,key)===null)?null:order.reduce<number>((s,i)=>s+(value(i,key)??0),0))}</td><td className="px-2 py-2 text-right text-xs">{pct(order.every(i=>value(i,key)===null)?null:order.reduce<number>((s,i)=>s+(value(i,key)??0),0))}</td></tr>)}{g.title==="ROOM DEPARTMENT"&&s.title==="REVENUE"?totalRow("TOTAL ROOM REVENUE",s.rows.map(r=>r[0])):totalRow("TOTAL "+s.title,s.rows.map(r=>r[0]))}</Fragment>)}<tr className="bg-sky-100 font-bold"><td className="sticky left-0 z-10 bg-sky-100 px-3 py-2 text-xs">{g.title} — TOTAL COST &amp; EXPENSES</td>{order.map(i=><td key={i} className="px-2 py-2 text-right text-xs tabular-nums">{fmtMoney(total(i,groupCostKeys(g)))}</td>)}<td className="px-2 py-2 text-right text-xs tabular-nums">{fmtMoney(order.every(i=>total(i,groupCostKeys(g))===null)?null:order.reduce<number>((sum,i)=>sum+(total(i,groupCostKeys(g))??0),0))}</td><td className="px-2 py-2 text-right text-xs">{pct(order.every(i=>total(i,groupCostKeys(g))===null)?null:order.reduce<number>((sum,i)=>sum+(total(i,groupCostKeys(g))??0),0))}</td></tr>{g.title!=="HOUSE KEEPING"&&<tr aria-hidden="true"><td colSpan={15} className="h-4 border-y-2 border-slate-200 bg-slate-50 p-0"></td></tr>}</Fragment>)}
<tr className="bg-indigo-50 font-black"><td className="sticky left-0 z-10 bg-indigo-50 px-3 py-3 text-xs">TOTAL DEPT COST & EXPENSES</td>{order.map(i=><td key={i} className="px-2 py-3 text-right text-xs tabular-nums">{fmtMoney(total(i,costKeys))}</td>)}<td className="px-2 py-3 text-right text-xs tabular-nums">{fmtMoney(costTotal)}</td><td className="px-2 py-3 text-right text-xs">{pct(costTotal)}</td></tr>
<tr className="border-t-4 border-emerald-300 bg-emerald-50 font-black"><td className="sticky left-0 z-10 bg-emerald-50 px-3 py-3 text-xs">DEPARTMENTAL PROFIT</td>{order.map(i=><td key={i} className="px-2 py-3 text-right text-xs tabular-nums">{fmtMoney(departmentalProfit(i))}</td>)}<td className="px-2 py-3 text-right text-xs tabular-nums">{fmtMoney(departmentalProfitTotal)}</td><td className="px-2 py-3 text-right text-xs">{pct(departmentalProfitTotal)}</td></tr>
</tbody></table></div>;
})()}
</div>}
                {selectedDepartment==="fb"&&<div className="space-y-3">
                  <div><h4 className="font-extrabold text-slate-800">F &amp; B DEPARTMENT</h4><p className="mt-1 text-xs text-slate-500">Budget bulanan dengan total otomatis. Persentase Cost of Sales FOOD dihitung terhadap FOOD revenue; BEVERAGE terhadap BEVERAGE revenue; biaya lain terhadap total F&amp;B revenue.</p></div>
                  {(() => {
                    const order=[11,0,1,2,3,4,5,6,7,8,9,10];
                    const value=(i:number,key:string)=>{if(key==="foodRevenue"||key==="beverageRevenue"){const months=form.forecast.monthly;const monthlyRevenue=optional(months[i]?.fbRevenue);if(monthlyRevenue!==null){const totals=months.reduce((a,m)=>({food:a.food+(Number(m.fbDetails?.foodRevenue)||0),beverage:a.beverage+(Number(m.fbDetails?.beverageRevenue)||0)}),{food:0,beverage:0});const annualRevenue=months.reduce((a,m)=>a+(Number(m.fbRevenue)||0),0);const foodTarget=totals.food+totals.beverage>0?totals.food:Math.round(annualRevenue*0.7);const before=months.slice(0,i).reduce((a,m)=>a+(Number(m.fbRevenue)||0),0);const through=before+(Number(months[i]?.fbRevenue)||0);const food=Math.round(foodTarget*through/(annualRevenue||1))-Math.round(foodTarget*before/(annualRevenue||1));return key==="foodRevenue"?String(food):String(monthlyRevenue-food);}}return optional(payrollInputKey(key)?payrollValueFor("FB",key):form.forecast.monthly[i]?.fbDetails?.[key]||"");};
                    const total=(i:number,keys:readonly string[])=>{const vals=keys.map(key=>value(i,key));return vals.some(v=>v!==null)?vals.reduce<number>((sum,v)=>sum+(Number(v??0)||0),0):null;};
                    const annual=(keys:readonly string[])=>order.some(i=>total(i,keys)!==null)?order.reduce<number>((sum,i)=>sum+(total(i,keys)??0),0):null;
                    const revenueKeys=["foodRevenue","beverageRevenue"] as const;
                    const revenueByMonth=(i:number)=>total(i,revenueKeys);
                    const revenueTotal=annual(revenueKeys);
                    const fmtMoney=(amount:number|null)=>amount===null?"—":new Intl.NumberFormat("id-ID",{maximumFractionDigits:0}).format(amount);
                    const pct=(amount:number|null,base:number|null)=>amount===null||base===null||base===0?"—":new Intl.NumberFormat("id-ID",{maximumFractionDigits:2}).format(amount/base*100)+"%";
                    const costKeys=["foodCost","beverageCost","salaryWages","jamsostek","insurance","thr","mealAllowances","medical","otherPayroll","glassware","chinaware","silverware","linen","decoration","duesSubscription","extermDisinfectant","kitchenFuel","laundry","miscellaneous","spoilage","cleaningSupplies","guestSupplies","printingStationery","telephone","uniform","utensil","contractCleaning"] as const;
                    const totalRow=(label:string,keys:readonly string[],baseKeys:readonly string[]=revenueKeys)=><tr className="bg-slate-100 font-bold"><td className="sticky left-0 z-10 min-w-52 bg-slate-100 px-3 py-2 text-xs">{label}</td>{order.map(i=><td key={i} className="px-2 py-2 text-right text-xs tabular-nums">{fmtMoney(total(i,keys))}</td>)}<td className="px-2 py-2 text-right text-xs tabular-nums">{fmtMoney(annual(keys))}</td><td className="px-2 py-2 text-right text-xs">{pct(annual(keys),annual(baseKeys))}</td></tr>;                    return <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white"><table className="min-w-max border-collapse"><thead><tr className="bg-amber-800 text-white"><th className="sticky left-0 z-20 min-w-52 px-3 py-3 text-left text-xs">F &amp; B DEPARTMENT</th>{order.map(i=><th key={i} className="min-w-28 px-2 py-3 text-right text-xs">{i===11?"Dec":monthNames[i].slice(0,3)}</th>)}<th className="min-w-32 px-2 py-3 text-right text-xs">TOTAL</th><th className="min-w-20 px-2 py-3 text-right text-xs">%</th></tr></thead><tbody>
                      {FB_BUDGET_GROUPS.map(group=><Fragment key={group.title}><tr className="bg-amber-50"><td colSpan={15} className="px-3 py-2 text-xs font-black text-amber-950">{group.title}</td></tr>{group.rows.map(([key,label])=><tr key={key} className="border-t border-slate-100"><td className="sticky left-0 z-10 min-w-52 bg-white px-3 py-2 text-xs"><div className="flex min-w-52 flex-col items-start gap-1"><span>{itemLabel("fb",key,label)}</span>{editLabelButton("fb",key,label)}{(key==="foodCost"||key==="beverageCost")?<details className="relative"><summary className="inline-flex cursor-pointer list-none items-center gap-1 whitespace-nowrap rounded border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-800 hover:bg-amber-100">Atur biaya <span aria-hidden="true">⌄</span></summary><div className="mt-1 flex min-w-44 flex-col gap-2 rounded-lg border border-slate-200 bg-white p-2 shadow-sm"><label className="flex items-center justify-between gap-2 text-[10px] font-semibold text-slate-600">Cost % <input aria-label={label+" Cost of Sales percentage"} type="number" min="0" max="100" step="0.01" placeholder="%" className="w-20 rounded border border-amber-200 px-1.5 py-1 text-right text-xs font-semibold text-slate-700" value={form.forecast.monthly[0]?.fbDetails?.[key+"Percent"]||(annual([key])!==null&&annual([key==="foodCost"?"foodRevenue":"beverageRevenue"])!==null&&annual([key==="foodCost"?"foodRevenue":"beverageRevenue"])!>0?String(Number((annual([key])!/annual([key==="foodCost"?"foodRevenue":"beverageRevenue"])!*100).toFixed(2))):"")} onChange={e=>updateFbCostPercent(key,e.target.value)}/></label><button type="button" className="rounded border border-amber-200 bg-amber-50 px-2 py-1.5 text-left text-[10px] font-bold text-amber-800 hover:bg-amber-100" title="Hitung biaya setiap bulan sebagai persentase dari revenue FOOD atau BEVERAGE bulan tersebut" onClick={()=>fillFbCostFromPercent(key)}>Isi berdasarkan % Revenue (12 bln)</button><button type="button" className="rounded border border-slate-200 bg-slate-50 px-2 py-1.5 text-left text-[10px] font-bold text-slate-700 hover:bg-slate-100" title="Isi item biaya ini ke 12 bulan sesuai jumlah hari kalender" onClick={()=>fillCostAcrossYear(updateFbDetail,key,label)}>Isi 12 bulan sesuai hari kalender</button></div></details>:<>{costPercentControl(key,label,"fbDetails",updateFbDetail,"fb")}{costFillButton(key,label,updateFbDetail)}</>}</div></td>{order.map(i=><td key={i} className="px-2 py-1.5"><input aria-label={label+" "+form.forecast.monthly[i].label} inputMode="numeric" className="w-28 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-right text-xs tabular-nums focus:border-amber-400 focus:outline-none" placeholder="—" value={String(payrollInputKey(key)?payrollValueFor("FB",key):form.forecast.monthly[i]?.fbDetails?.[key]||"")} readOnly={payrollInputKey(key)||key==="foodRevenue"||key==="beverageRevenue"} disabled={payrollInputKey(key)||key==="foodRevenue"||key==="beverageRevenue"} title={key==="foodRevenue"||key==="beverageRevenue"?"Otomatis dari Budget P&L Step 2.":payrollInputKey(key)?"Dikunci: nilai otomatis dari Master Payroll. Ubah hanya di Master Payroll.":"Input manual"} onChange={e=>{if(!payrollInputKey(key)&&key!=="foodRevenue"&&key!=="beverageRevenue")updateFbDetail(i,key,e.target.value.replace(/[^0-9]/g,""));}}/></td>)}<td className="px-2 py-2 text-right text-xs font-bold tabular-nums">{fmtMoney(annual([key]))}</td><td className="px-2 py-2 text-right text-xs">{key==="foodCost"?pct(annual([key]),annual(["foodRevenue"])):key==="beverageCost"?pct(annual([key]),annual(["beverageRevenue"])):pct(annual([key]),revenueTotal)}</td></tr>)}{group.title==="REVENUES"&&<tr className="bg-amber-100 font-black"><td className="sticky left-0 z-10 bg-amber-100 px-3 py-2 text-xs">TOTAL F &amp; B REVENUE</td>{order.map(i=><td key={i} className="px-2 py-2 text-right text-xs tabular-nums">{fmtMoney(revenueByMonth(i))}</td>)}<td className="px-2 py-2 text-right text-xs tabular-nums">{fmtMoney(revenueTotal)}</td><td className="px-2 py-2 text-right text-xs">100,00%</td></tr>}{group.title!=="REVENUES"&&totalRow(group.total,group.rows.map(r=>r[0]).filter(key=>group.title!=="PAYROLL & RELATED"||key!=="incomeTax"))}</Fragment>)}
                      <tr className="bg-indigo-50 font-black"><td className="sticky left-0 z-10 bg-indigo-50 px-3 py-3 text-xs">TOTAL COST &amp; EXPENSES</td>{order.map(i=>{const n=total(i,costKeys);return <td key={i} className="px-2 py-3 text-right text-xs tabular-nums">{fmtMoney(n)}</td>})}<td className="px-2 py-3 text-right text-xs tabular-nums">{fmtMoney(annual(costKeys))}</td><td className="px-2 py-3 text-right text-xs">{pct(annual(costKeys),revenueTotal)}</td></tr>
                      <tr className="bg-emerald-50 font-black"><td className="sticky left-0 z-10 bg-emerald-50 px-3 py-3 text-xs">DEPT. PROFIT/LOSS</td>{order.map(i=>{const rev=revenueByMonth(i),cost=total(i,costKeys);return <td key={i} className="px-2 py-3 text-right text-xs tabular-nums">{fmtMoney(rev!==null&&cost!==null?rev-cost:null)}</td>})}<td className="px-2 py-3 text-right text-xs tabular-nums">{fmtMoney(revenueTotal!==null&&annual(costKeys)!==null?revenueTotal-annual(costKeys)!:null)}</td><td className="px-2 py-3 text-right text-xs">{pct(revenueTotal!==null&&annual(costKeys)!==null?revenueTotal-annual(costKeys)!:null,revenueTotal)}</td></tr>
                    </tbody></table></div>;
                  })()}
                </div>}
                {selectedDepartment==="mod"&&<div className="space-y-3">
                  <div><h4 className="font-extrabold text-slate-800">MINOR OPERATED DEPARTMENT</h4><p className="mt-1 text-xs text-slate-500">{form.forecast.monthly[0]?.modDetails?.rentCarLabel||"Rent Car"}, {form.forecast.monthly[0]?.modDetails?.laundryLabel||"Laundry"}, Cost of Sales, Payroll &amp; Related, dan Other Expenses. Kolom mengikuti Dec–Nov, TOTAL, %. Payroll MOD hanya untuk staf yang khusus menangani unit usaha minor (mis. petugas laundry, spa, business center, sopir rent car, atau staf rekreasi); jika tidak ada staf yang dialokasikan ke MOD, biarkan payroll kosong dan total tetap —.</p></div>
                  {(() => {
                    const rentCarName=(form.forecast.monthly[0]?.modDetails?.rentCarLabel||"RENT CAR").trim()||"RENT CAR";
                     const laundryName=(form.forecast.monthly[0]?.modDetails?.laundryLabel||"LAUNDRY").trim()||"LAUNDRY";
                     const displayModLabel=(label:string)=>label.replace(/RENT CAR/gi,()=>rentCarName).replace(/LAUNDRY/gi,()=>laundryName);
                     const order=[11,0,1,2,3,4,5,6,7,8,9,10];
                    const groups=[
                      {title:"REVENUE",rows:[["businessCenterRevenue","BUSINESS CENTER"],["rentCarRevenue","TRANSPORTATION / RENT CAR"],["laundryRevenue","LAUNDRY"],["spaRevenue","SPA"],["telephoneRevenue","TELEPHONE"],["sportRecreationRevenue","SPORT & RECREATION"],["rentedSpaceRevenue","RENTED SPACE"],["miscellaneousRevenue","MISCELLANEOUS OTHER REVENUE"],["otherRevenueDiscounts","OTHER REVENUE DISCOUNTS / ALLOWANCES"]]},
                      {title:"COST OF SALES",rows:[["laundryCost","LAUNDRY"]]},
                      {title:"PAYROLL & RELATED",rows:[["salaryWages","SALARY & WAGES"],["incomeTax","INCOME TAX"],["jamsostek","JAMSOSTEK"],["insurance","INSURANCE"],["bonus","PROV. FOR BONUS"],["mealAllowances","MEAL ALLOWANCES"],["medical","MEDICAL / ASKES"],["payrollOthers","OTHER PAYROLL COST"]]},
                      {title:"OTHER EXPENSES",rows:[["guestSupplies","GUEST SUPPLIES"],["paperSupplies","PAPER SUPPLIES"],["laundryValetSupplies","LAUNDRY & VALET SUPPLIES"],["laundrySupplies","LAUNDRY SUPPLIES"],["casual","CASUAL"],["cleaningSupplies","CLEANING SUPPLIES"],["printingStationery","PRINTING & STATIONERY"],["decoration","DECORATION"],["telephoneFax","TELEPHONE & FAX"],["laundryExpense","LAUNDRY"],["casualOther","CASUAL — OTHER"],["laundryValetOther","LAUNDRY & VALET SUPPLIES — OTHER"],["cleaningOther","CLEANING SUPPLIES — OTHER"],["provisionUniform","PROV. UNIFORM"],["pteb","PTEB"],["uniform","UNIFORM"],["otherExpenses","OTHERS"]]}
                    ] as const;
                    const value=(i:number,key:string)=>optional(payrollInputKey(key)?payrollValueFor("MOD",key):form.forecast.monthly[i]?.modDetails?.[key]||"");
                    const total=(i:number,keys:readonly string[])=>{const vals=keys.map(key=>value(i,key));return vals.some(v=>v!==null)?vals.reduce<number>((sum,v)=>sum+(Number(v??0)||0),0):null;};
                    const annual=(keys:readonly string[])=>order.some(i=>total(i,keys)!==null)?order.reduce<number>((sum,i)=>sum+(total(i,keys)??0),0):null;
                    const revenueKeys=["businessCenterRevenue","rentCarRevenue","laundryRevenue","spaRevenue","telephoneRevenue","sportRecreationRevenue","rentedSpaceRevenue","miscellaneousRevenue","otherRevenueDiscounts"] as const;
                    const costKeys=["laundryCost","salaryWages","incomeTax","jamsostek","insurance","bonus","mealAllowances","medical","payrollOthers","guestSupplies","paperSupplies","laundryValetSupplies","laundrySupplies","casual","cleaningSupplies","printingStationery","decoration","telephoneFax","laundryExpense","casualOther","laundryValetOther","cleaningOther","provisionUniform","pteb","uniform","otherExpenses"] as const;
                    const revenueTotal=annual(revenueKeys),costTotal=annual(costKeys);
                    const fmtMoney=(n:number|null)=>n===null?"—":new Intl.NumberFormat("id-ID",{maximumFractionDigits:0}).format(n);
                    const pct=(n:number|null,base:number|null)=>n===null||base===null||base===0?"—":new Intl.NumberFormat("id-ID",{maximumFractionDigits:2}).format(n/base*100)+"%";
                    const totalRow=(label:string,keys:readonly string[],base:readonly string[]=revenueKeys)=><tr className="bg-slate-100 font-bold"><td className="sticky left-0 z-10 min-w-52 bg-slate-100 px-3 py-2 text-xs">{label}</td>{order.map(i=><td key={i} className="px-2 py-2 text-right text-xs tabular-nums">{fmtMoney(total(i,keys))}</td>)}<td className="px-2 py-2 text-right text-xs tabular-nums">{fmtMoney(annual(keys))}</td><td className="px-2 py-2 text-right text-xs">{pct(annual(keys),annual(base))}</td></tr>;
                    return <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white"><table className="min-w-max border-collapse"><thead><tr className="bg-violet-900 text-white"><th className="sticky left-0 z-20 min-w-52 px-3 py-3 text-left text-xs">MINOR OPERATED DEPARTMENT</th>{order.map(i=><th key={i} className="min-w-28 px-2 py-3 text-right text-xs">{i===11?"Dec":monthNames[i].slice(0,3)}</th>)}<th className="min-w-32 px-2 py-3 text-right text-xs">TOTAL</th><th className="min-w-20 px-2 py-3 text-right text-xs">%</th></tr></thead><tbody>
                    <tr className="bg-slate-50"><td className="sticky left-0 z-10 bg-slate-50 px-3 py-2 text-xs font-bold">OPERATING DAYS</td>{order.map(i=><td key={i} className="px-2 py-1.5"><input aria-label={"Operating days "+form.forecast.monthly[i].label} inputMode="numeric" className="w-20 rounded-md border border-slate-200 px-2 py-1.5 text-right text-xs" placeholder="—" value={String(new Date(Number(form.yearStart),i+1,0).getDate())} readOnly title="Terisi otomatis sesuai jumlah hari dalam bulan"/></td>)}<td className="px-2 py-2 text-right text-xs">—</td><td className="px-2 py-2 text-right text-xs">—</td></tr>
                    {groups.map(group=><Fragment key={group.title}><tr className="bg-violet-50"><td colSpan={15} className="px-3 py-2 text-xs font-black text-violet-950">{group.title}</td></tr>{group.rows.map(([key,label])=><tr key={key} className="border-t border-slate-100"><td className="sticky left-0 z-10 min-w-52 bg-white px-2 py-2 text-xs">{itemLabel("mod",key,displayModLabel(label))} {editLabelButton("mod",key,displayModLabel(label))} {costPercentControl(key,itemLabel("mod",key,displayModLabel(label)),"modDetails",updateModDetail,"mod")} {costFillButton(key,itemLabel("mod",key,displayModLabel(label)),updateModDetail)}</td>{order.map(i=><td key={i} className="px-2 py-1.5"><input aria-label={displayModLabel(label)+" "+form.forecast.monthly[i].label} inputMode="numeric" className="w-28 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-right text-xs tabular-nums focus:border-violet-400 focus:outline-none" placeholder="—" value={String(payrollInputKey(key)?payrollValueFor("MOD",key):form.forecast.monthly[i]?.modDetails?.[key]||"")} readOnly={payrollInputKey(key)||["businessCenterRevenue","rentCarRevenue","laundryRevenue","spaRevenue","telephoneRevenue","sportRecreationRevenue","rentedSpaceRevenue","miscellaneousRevenue","otherRevenueDiscounts"].includes(key)} disabled={payrollInputKey(key)||["businessCenterRevenue","rentCarRevenue","laundryRevenue","spaRevenue","telephoneRevenue","sportRecreationRevenue","rentedSpaceRevenue","miscellaneousRevenue","otherRevenueDiscounts"].includes(key)} title={["businessCenterRevenue","rentCarRevenue","laundryRevenue","spaRevenue","telephoneRevenue","sportRecreationRevenue","rentedSpaceRevenue","miscellaneousRevenue","otherRevenueDiscounts"].includes(key)?"Otomatis dari Budget P&L Step 2.":payrollInputKey(key)?"Dikunci: nilai otomatis dari Master Payroll. Ubah hanya di Master Payroll.":"Input manual"} onChange={e=>{if(!payrollInputKey(key)&&!["businessCenterRevenue","rentCarRevenue","laundryRevenue","spaRevenue","telephoneRevenue","sportRecreationRevenue","rentedSpaceRevenue","miscellaneousRevenue","otherRevenueDiscounts"].includes(key))updateModDetail(i,key,e.target.value.replace(/[^0-9]/g,""));}}/></td>)}<td className="px-2 py-2 text-right text-xs font-bold tabular-nums">{fmtMoney(annual([key]))}</td><td className="px-2 py-2 text-right text-xs">{pct(annual([key]),revenueTotal)}</td></tr>)}{totalRow("TOTAL "+group.title,group.rows.map(r=>r[0]))}</Fragment>)}
                    <tr className="bg-indigo-50 font-black"><td className="sticky left-0 z-10 bg-indigo-50 px-3 py-3 text-xs">TOTAL DEPT. EXPENSES</td>{order.map(i=><td key={i} className="px-2 py-3 text-right text-xs tabular-nums">{fmtMoney(total(i,costKeys))}</td>)}<td className="px-2 py-3 text-right text-xs tabular-nums">{fmtMoney(costTotal)}</td><td className="px-2 py-3 text-right text-xs">{pct(costTotal,revenueTotal)}</td></tr>
                    <tr className="bg-emerald-50 font-black"><td className="sticky left-0 z-10 bg-emerald-50 px-3 py-3 text-xs">DEPARTMENTAL PROFIT</td>{order.map(i=>{const rev=total(i,revenueKeys),cost=total(i,costKeys);return <td key={i} className="px-2 py-3 text-right text-xs tabular-nums">{fmtMoney(rev!==null&&cost!==null?rev-cost:null)}</td>})}<td className="px-2 py-3 text-right text-xs tabular-nums">{fmtMoney(revenueTotal!==null&&costTotal!==null?revenueTotal-costTotal:null)}</td><td className="px-2 py-3 text-right text-xs">{pct(revenueTotal!==null&&costTotal!==null?revenueTotal-costTotal:null,revenueTotal)}</td></tr>
                    </tbody></table></div>;
                  })()}
                </div>}
                {selectedDepartment==="ag"&&<div className="space-y-3">
                  <div><h4 className="font-extrabold text-slate-800">ADMINISTRATION &amp; GENERAL</h4><p className="mt-1 text-xs text-slate-500">Rincian A&amp;G mengikuti urutan Dec, Jan–Nov, TOTAL, dan persentase terhadap total revenue hotel. PAYROLL &amp; RELATED otomatis dari Master Payroll dan tidak dapat diedit di sini; biaya operasional lainnya dapat diisi manual. Nilai dan subtotal dihitung otomatis.</p></div>
                  {(() => {
                    const order=[11,0,1,2,3,4,5,6,7,8,9,10];
                    const operatingDays=order.map(i=>new Date(Number(form.yearStart),i+1,0).getDate());
                    const payrollRows=[["salaryWages","SALARY & WAGES"],["incomeTax","INCOME TAX (PPh 21 — withheld, not employer expense)"],["jamsostek","JAMSOSTEK"],["insurance","INSURANCE"],["bonusProvision","PROV. FOR BONUS"],["mealAllowances","MEAL ALLOWANCES"],["medical","MEDICAL / ASKES"],["otherPayroll","OTHER PAYROLL COST"]] as const;
                    const otherRows=[["bankCharges","BANK CHARGES"],["donation","DONATION"],["duesTradeAssoc","DUES & TRADE ASSOC."],["entertainment","ENTERTAINMENT"],["laundryUniforms","LAUNDRY - UNIFORMS"],["postageCourier","POSTAGE & COURIER"],["printingStationery","PRINTING & STATIONERY"],["licenceInspection","LICENCE & INSPECTION"],["transportation","TRANSPORTATION"],["travelling","TRAVELLING"],["telephone","TELEPHONE"],["creditCardCommission","CREDIT CARD COMMISSION"],["companyHousing","COMPANY HOUSING"],["auditBrand","AUDIT BRAND"],["contractService","CONTRACT SERVICE"],["payrollSystem","PAYROLL SYSTEM"],["pmsHotelindo","PMS - Hotelindo"],["edp","EDP"],["provisionUniform","PROVISION UNIFORM"],["others","OTHERS"]] as const;
                    const value=(i:number,key:string)=>optional(payrollInputKey(key)?payrollValueFor("AG",key):form.forecast.monthly[i]?.agDetails?.[key]||"");
                    const total=(i:number,keys:readonly string[])=>{const vals=keys.map(key=>value(i,key));return vals.some(v=>v!==null)?vals.reduce<number>((sum,v)=>sum+(Number(v??0)||0),0):null;};
                    const annual=(keys:readonly string[])=>order.some(i=>total(i,keys)!==null)?order.reduce<number>((sum,i)=>sum+(total(i,keys)??0),0):null;
                    const revenueByMonth=order.map(i=>calcMonthly(form.forecast.monthly[i],Number(form.yearStart),i,form.statistics.rooms).revenue);
                    const hotelRevenueTotal=revenueByMonth.some(v=>v!==null)?revenueByMonth.reduce<number>((sum,v)=>sum+(v??0),0):null;
                    const fmtMoney=(n:number|null)=>n===null?"—":new Intl.NumberFormat("id-ID",{maximumFractionDigits:0}).format(n);
                    const pct=(n:number|null,base:number|null)=>n===null||base===null||base===0?"—":new Intl.NumberFormat("id-ID",{maximumFractionDigits:2}).format(n/base*100)+"%";
                    const payrollKeys=payrollRows.map(r=>r[0]);
                    // PPh 21 is employee withholding, not an additional employer expense.
                    const payrollExpenseKeys=payrollKeys.filter(key=>key!=="incomeTax");
                    const otherKeys=otherRows.map(r=>r[0]);
                    const allExpenseKeys=[...payrollExpenseKeys,...otherKeys];
                    const totalRow=(label:string,keys:readonly string[])=><tr className="bg-slate-100 font-bold"><td className="sticky left-0 z-10 min-w-52 bg-slate-100 px-3 py-2 text-xs">{label}</td>{order.map(i=><td key={i} className="px-2 py-2 text-right text-xs tabular-nums">{fmtMoney(total(i,keys))}</td>)}<td className="px-2 py-2 text-right text-xs tabular-nums">{fmtMoney(annual(keys))}</td><td className="px-2 py-2 text-right text-xs">{pct(annual(keys),hotelRevenueTotal)}</td></tr>;
                    const inputRow=(key:string,label:string)=><tr key={key} className="border-t border-slate-100"><td className="sticky left-0 z-10 min-w-52 bg-white px-2 py-2 text-xs">{itemLabel("ag",key,label)} {editLabelButton("ag",key,label)} {costPercentControl(key,itemLabel("ag",key,label),"agDetails",updateAgDetail,"hotel")} {costFillButton(key,itemLabel("ag",key,label),updateAgDetail)}</td>{order.map(i=><td key={i} className="px-2 py-1.5"><input aria-label={label+" "+form.forecast.monthly[i].label} inputMode="numeric" className="w-28 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-right text-xs tabular-nums focus:border-indigo-400 focus:outline-none" placeholder="—" value={String(payrollInputKey(key)?payrollValueFor("AG",key):form.forecast.monthly[i]?.agDetails?.[key]||"")} readOnly={payrollInputKey(key)} disabled={payrollInputKey(key)} title={payrollInputKey(key)?"Dikunci: nilai otomatis dari Master Payroll. Ubah hanya di Master Payroll.":"Input manual"} onChange={e=>{if(!payrollInputKey(key))updateAgDetail(i,key,e.target.value.replace(/[^0-9]/g,""));}}/></td>)}<td className="px-2 py-2 text-right text-xs font-bold tabular-nums">{fmtMoney(annual([key]))}</td><td className="px-2 py-2 text-right text-xs">{pct(annual([key]),hotelRevenueTotal)}</td></tr>;
                    return <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white"><table className="min-w-max border-collapse"><thead><tr className="bg-indigo-900 text-white"><th className="sticky left-0 z-20 min-w-52 px-3 py-3 text-left text-xs">ADMINISTRATION &amp; GENERAL</th>{order.map(i=><th key={i} className="min-w-28 px-2 py-3 text-right text-xs">{i===11?"Dec":monthNames[i].slice(0,3)}</th>)}<th className="min-w-32 px-2 py-3 text-right text-xs">TOTAL</th><th className="min-w-20 px-2 py-3 text-right text-xs">%</th></tr></thead><tbody>
                      <tr className="bg-slate-50"><td className="sticky left-0 z-10 bg-slate-50 px-3 py-2 text-xs font-bold">OPERATING DAYS</td>{order.map((i,j)=><td key={i} className="px-2 py-1.5"><input aria-label={"Operating days "+form.forecast.monthly[i].label} inputMode="numeric" className="w-20 rounded-md border border-slate-200 px-2 py-1.5 text-right text-xs" value={form.forecast.monthly[i]?.agDetails?.operatingDays??String(operatingDays[j])} readOnly title="Mengikuti kalender operasional yang ditetapkan"/></td>)}<td className="px-2 py-2 text-right text-xs">—</td><td className="px-2 py-2 text-right text-xs">—</td></tr>
                      <tr className="bg-indigo-50"><td colSpan={15} className="px-3 py-2 text-xs font-black text-indigo-950">PAYROLL &amp; RELATED</td></tr>
                      {payrollRows.map(([key,label])=>inputRow(key,label))}
                      {totalRow("TOTAL PAYROLL & RELATED",payrollExpenseKeys)}
                      <tr className="bg-indigo-50"><td colSpan={15} className="px-3 py-2 text-xs font-black text-indigo-950">OTHER EXPENSES</td></tr>
                      {otherRows.map(([key,label])=>inputRow(key,label))}
                      {totalRow("TOTAL OTHER EXPENSES",otherKeys)}
                      <tr className="bg-indigo-100 font-black"><td className="sticky left-0 z-10 bg-indigo-100 px-3 py-3 text-xs">TOTAL DEPARTMENT EXPENSES</td>{order.map(i=><td key={i} className="px-2 py-3 text-right text-xs tabular-nums">{fmtMoney(total(i,allExpenseKeys))}</td>)}<td className="px-2 py-3 text-right text-xs tabular-nums">{fmtMoney(annual(allExpenseKeys))}</td><td className="px-2 py-3 text-right text-xs">{pct(annual(allExpenseKeys),hotelRevenueTotal)}</td></tr>
                    </tbody></table></div>;
                  })()}
                </div>}
                {selectedDepartment==="sm"&&<div className="space-y-3">
                  <div><h4 className="font-extrabold text-slate-800">SALES &amp; MARKETING DEPARTMENT</h4><p className="mt-1 text-xs text-slate-500">Rincian S&amp;M mengikuti urutan Dec, Jan–Nov, TOTAL, dan persentase terhadap total revenue hotel. Semua baris PAYROLL &amp; RELATED otomatis dari Master Payroll dan terkunci; biaya pemasaran lainnya dapat diisi manual. Subtotal dihitung otomatis.</p></div>
                  {(() => {
                    const order=[11,0,1,2,3,4,5,6,7,8,9,10];
                    const operatingDays=order.map(i=>new Date(Number(form.yearStart),i+1,0).getDate());
                    const payrollRows=[["salaryWages","SALARY & WAGES"],["incomeTax","INCOME TAX"],["jamsostek","JAMSOSTEK"],["insurance","INSURANCE"],["bonusProvision","PROV. FOR BONUS"],["mealAllowances","MEAL ALLOWANCES"],["medical","MEDICAL / ASKES"],["otherPayroll","OTHER PAYROLL COST"]] as const;
                    const otherRows=[["advertisingPromotion","ADVERTISING & PROMOTION"],["brochureCollateral","BROCHURE / COLLATERAL"],["directMail","DIRECT MAIL"],["duesTradeAssoc","DUES & TRADE ASSOC."],["entertainment","ENTERTAINMENT"],["laundryUniforms","LAUNDRY - UNIFORMS"],["groupAdvertising","GROUP ADV. C"],["printingStationery","PRINTING & STATIONERY"],["telephone","TELEPHONE"],["salesMarketingFee","SALES & MARKETING FEE"],["photography","PHOTOGRAPHY"],["centralizedPromotionalProgram","CENTRALLIZED PROMOTIONAL PROGRAM"],["promotionVipGift","PROMOTION FOR VIP GIFT"],["salesMarketingKits","SALES & MARKETING KITS"],["provisionUniform","PROV. UNIFORM"],["others","OTHERS"]] as const;
                    const businessRows=[["transportation","TRANSPORTATION"],["salesCallOutside","SALES CALL OUTSIDE"],["tradeShows","TRADE SHOWS"],["travellingExpenses","TRAVELLING EXPENSES"]] as const;
                    const publicRelationsRows=[["printMediaNewspaper","PRINT MEDIA - NEWS PAPER"],["otherMediaMagazine","OTHER MEDIA - MAGAZINE"]] as const;
                    const value=(i:number,key:string)=>optional(payrollInputKey(key)?payrollValueFor("SM",key):form.forecast.monthly[i]?.smDetails?.[key]||"");
                    const total=(i:number,keys:readonly string[])=>{const vals=keys.map(key=>value(i,key));return vals.some(v=>v!==null)?vals.reduce<number>((sum,v)=>sum+(Number(v??0)||0),0):null;};
                    const annual=(keys:readonly string[])=>order.some(i=>total(i,keys)!==null)?order.reduce<number>((sum,i)=>sum+(total(i,keys)??0),0):null;
                    const revenueByMonth=order.map(i=>calcMonthly(form.forecast.monthly[i],Number(form.yearStart),i,form.statistics.rooms).revenue);
                    const hotelRevenueTotal=revenueByMonth.some(v=>v!==null)?revenueByMonth.reduce<number>((sum,v)=>sum+(v??0),0):null;
                    const fmtMoney=(n:number|null)=>n===null?"—":new Intl.NumberFormat("id-ID",{maximumFractionDigits:0}).format(n);
                    const pct=(n:number|null,base:number|null)=>n===null||base===null||base===0?"—":new Intl.NumberFormat("id-ID",{maximumFractionDigits:2}).format(n/base*100)+"%";
                    const payrollKeys=payrollRows.map(r=>r[0]).filter(key=>key!=="incomeTax");
                    const otherKeys=otherRows.map(r=>r[0]);
                    const businessKeys=businessRows.map(r=>r[0]);
                    const publicRelationsKeys=publicRelationsRows.map(r=>r[0]);
                    const allOtherKeys=[...otherKeys,...businessKeys,...publicRelationsKeys];
                    const allExpenseKeys=[...payrollKeys,...allOtherKeys];
                    const totalRow=(label:string,keys:readonly string[])=><tr className="bg-slate-100 font-bold"><td className="sticky left-0 z-10 min-w-52 bg-slate-100 px-3 py-2 text-xs">{label}</td>{order.map(i=><td key={i} className="px-2 py-2 text-right text-xs tabular-nums">{fmtMoney(total(i,keys))}</td>)}<td className="px-2 py-2 text-right text-xs tabular-nums">{fmtMoney(annual(keys))}</td><td className="px-2 py-2 text-right text-xs">{pct(annual(keys),hotelRevenueTotal)}</td></tr>;
                    const inputRow=(key:string,label:string)=><tr key={key} className="border-t border-slate-100"><td className="sticky left-0 z-10 min-w-52 bg-white px-2 py-2 text-xs">{itemLabel("sm",key,label)} {editLabelButton("sm",key,label)} {costPercentControl(key,itemLabel("sm",key,label),"smDetails",updateSmDetail,"hotel")} {costFillButton(key,itemLabel("sm",key,label),updateSmDetail)}</td>{order.map(i=><td key={i} className="px-2 py-1.5"><input aria-label={label+" "+form.forecast.monthly[i].label} inputMode="numeric" className="w-28 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-right text-xs tabular-nums focus:border-pink-400 focus:outline-none" placeholder="—" value={String(payrollInputKey(key)?payrollValueFor("SM",key):form.forecast.monthly[i]?.smDetails?.[key]||"")} readOnly={payrollInputKey(key)} disabled={payrollInputKey(key)} title={payrollInputKey(key)?"Dikunci: nilai otomatis dari Master Payroll. Ubah hanya di Master Payroll.":"Input manual"} onChange={e=>{if(!payrollInputKey(key))updateSmDetail(i,key,e.target.value.replace(/[^0-9]/g,""));}}/></td>)}<td className="px-2 py-2 text-right text-xs font-bold tabular-nums">{fmtMoney(annual([key]))}</td><td className="px-2 py-2 text-right text-xs">{pct(annual([key]),hotelRevenueTotal)}</td></tr>;
                    const groupRows=(title:string,rows:readonly (readonly [string,string])[],keys:readonly string[],subtotal:string)=><Fragment><tr className="bg-pink-50"><td colSpan={15} className="px-3 py-2 text-xs font-black text-pink-950">{title}</td></tr>{rows.map(([key,label])=>inputRow(key,label))}{totalRow(subtotal,keys)}</Fragment>;
                    return <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white"><table className="min-w-max border-collapse"><thead><tr className="bg-pink-900 text-white"><th className="sticky left-0 z-20 min-w-52 px-3 py-3 text-left text-xs">SALES &amp; MARKETING DEPARTMENT</th>{order.map(i=><th key={i} className="min-w-28 px-2 py-3 text-right text-xs">{i===11?"Dec":monthNames[i].slice(0,3)}</th>)}<th className="min-w-32 px-2 py-3 text-right text-xs">TOTAL</th><th className="min-w-20 px-2 py-3 text-right text-xs">%</th></tr></thead><tbody>
                      <tr className="bg-slate-50"><td className="sticky left-0 z-10 bg-slate-50 px-3 py-2 text-xs font-bold">OPERATING DAYS</td>{order.map((i,j)=><td key={i} className="px-2 py-1.5"><input aria-label={"Operating days "+form.forecast.monthly[i].label} inputMode="numeric" className="w-20 rounded-md border border-slate-200 px-2 py-1.5 text-right text-xs" value={form.forecast.monthly[i]?.smDetails?.operatingDays??String(operatingDays[j])} readOnly title="Mengikuti kalender operasional yang ditetapkan"/></td>)}<td className="px-2 py-2 text-right text-xs">—</td><td className="px-2 py-2 text-right text-xs">—</td></tr>
                      <tr className="bg-pink-50"><td colSpan={15} className="px-3 py-2 text-xs font-black text-pink-950">PAYROLL &amp; RELATED</td></tr>
                      {payrollRows.map(([key,label])=>inputRow(key,label))}
                      {totalRow("TOTAL PAYROLL & RELATED",payrollKeys)}
                      {groupRows("OTHER EXPENSES",otherRows,otherKeys,"TOTAL OTHER EXPENSES")}
                      {groupRows("BUSINESS DEVELOPMENT",businessRows,businessKeys,"TOTAL BUSINESS DEVELOPMENT")}
                      {groupRows("PUBLIC RELATION",publicRelationsRows,publicRelationsKeys,"TOTAL PUBLIC RELATION")}
                      <tr className="bg-pink-100 font-black"><td className="sticky left-0 z-10 bg-pink-100 px-3 py-3 text-xs">TOTAL OTHER S&amp;M EXPENSES</td>{order.map(i=><td key={i} className="px-2 py-3 text-right text-xs tabular-nums">{fmtMoney(total(i,allOtherKeys))}</td>)}<td className="px-2 py-3 text-right text-xs tabular-nums">{fmtMoney(annual(allOtherKeys))}</td><td className="px-2 py-3 text-right text-xs">{pct(annual(allOtherKeys),hotelRevenueTotal)}</td></tr>
                      <tr className="bg-pink-100 font-black"><td className="sticky left-0 z-10 bg-pink-100 px-3 py-3 text-xs">TOTAL COST &amp; EXPENSES</td>{order.map(i=><td key={i} className="px-2 py-3 text-right text-xs tabular-nums">{fmtMoney(total(i,allExpenseKeys))}</td>)}<td className="px-2 py-3 text-right text-xs tabular-nums">{fmtMoney(annual(allExpenseKeys))}</td><td className="px-2 py-3 text-right text-xs">{pct(annual(allExpenseKeys),hotelRevenueTotal)}</td></tr>
                    </tbody></table></div>;
                  })()}
                </div>}
                {selectedDepartment==="pomec"&&<div className="space-y-3">
                  <div><h4 className="font-extrabold text-slate-800">ENGINEERING DEPARTMENT — POMEC</h4><p className="mt-1 text-xs text-slate-500">Urutan bulan Dec–Nov, TOTAL dan persentase terhadap total revenue hotel. Semua baris PAYROLL &amp; RELATED otomatis dari Master Payroll dan terkunci; hanya biaya perawatan dan energi yang dapat diisi per bulan. Subtotal dan total dihitung otomatis.</p></div>
                  {(() => {
                    const order=[11,0,1,2,3,4,5,6,7,8,9,10];
                    const operatingDays=order.map(i=>new Date(Number(form.yearStart),i+1,0).getDate());
                    const payrollRows=[["salaryWages","SALARY & WAGES"],["incomeTax","INCOME TAX"],["jamsostek","JAMSOSTEK"],["insurance","INSURANCE"],["thr","THR (1 YEAR)"],["mealAllowances","MEAL ALLOWANCES"],["medical","MEDICAL / ASKES"],["otherPayroll","OTHER PAYROLL COST"]] as const;
                    const otherRows=[["paintingDecoration","PAINTING & DECORATION"],["engineeringSupplies","ENGINEERING SUPPLIES & EQUIPMENT"],["bulbsLamp","BULBS & LAMP"],["printingStationery","PRINTING & STATIONERY"],["laundryUniform","LAUNDRY UNIFORM"],["provisionUniform","PROV. FOR UNIFORM"],["acMaintenance","AC MAINTENANCE"],["buildingMaintenance","BUILDING MAINTENANCE"],["electricityMaintenance","ELECTRICITY MAINTENANCE"],["floorCovering","FLOOR COVERING"],["furnitureFixtureRepair","FURNITURE & FIXTURE REPAIRMENT"],["mechanicalElectricalMaintenance","MECHANICAL & ELECTRICAL MAINT"],["kitchenEquipmentMaintenance","KITCHEN EQUIPMENT MAINTENANCE"],["refrigeratorMaintenance","REFRIGERATOR MAINTENANCE"],["automobileRepair","AUTO MOBILE REPAIR & SERVICES"],["plumbingHeatingMaintenance","PLUMBING/HEATING MAINTENANCE"],["removalWaste","REMOVAL WASTE"],["others","OTHERS"]] as const;
                    const energyRows=[["electricityConsumed","ELECTRICITY CONSUMED"],["waterConsumed","WATER CONSUMED"],["fuelDieselConsumed","FUEL / DIESEL CONSUMED"]] as const;
                    const value=(i:number,key:string)=>optional(payrollInputKey(key)?payrollValueFor("POMEC",key):form.forecast.monthly[i]?.pomecDetails?.[key]||"");
                    const total=(i:number,keys:readonly string[])=>{const vals=keys.map(key=>value(i,key));return vals.some(v=>v!==null)?vals.reduce<number>((sum,v)=>sum+(Number(v??0)||0),0):null;};
                    const annual=(keys:readonly string[])=>order.some(i=>total(i,keys)!==null)?order.reduce<number>((sum,i)=>sum+(total(i,keys)??0),0):null;
                    const revenueByMonth=order.map(i=>calcMonthly(form.forecast.monthly[i],Number(form.yearStart),i,form.statistics.rooms).revenue);
                    const hotelRevenueTotal=revenueByMonth.some(v=>v!==null)?revenueByMonth.reduce<number>((sum,v)=>sum+(v??0),0):null;
                    const fmtMoney=(n:number|null)=>n===null?"—":new Intl.NumberFormat("id-ID",{maximumFractionDigits:0}).format(n);
                    const pct=(n:number|null,base:number|null)=>n===null||base===null||base===0?"—":new Intl.NumberFormat("id-ID",{maximumFractionDigits:2}).format(n/base*100)+"%";
                    const payrollKeys=payrollRows.map(r=>r[0]);
                    // PPh 21 is employee withholding, not an additional employer expense.
                    const payrollExpenseKeys=payrollKeys.filter(key=>key!=="incomeTax");
                    const otherKeys=otherRows.map(r=>r[0]),energyKeys=energyRows.map(r=>r[0]);
                    const allKeys=[...payrollExpenseKeys,...otherKeys,...energyKeys];
                    const totalRow=(label:string,keys:readonly string[],tone="bg-slate-100")=><tr className={tone+" font-bold"}><td className={"sticky left-0 z-10 min-w-56 "+tone+" px-3 py-2 text-xs"}>{label}</td>{order.map(i=><td key={i} className="px-2 py-2 text-right text-xs tabular-nums">{fmtMoney(total(i,keys))}</td>)}<td className="px-2 py-2 text-right text-xs tabular-nums">{fmtMoney(annual(keys))}</td><td className="px-2 py-2 text-right text-xs">{pct(annual(keys),hotelRevenueTotal)}</td></tr>;
                    const inputRow=(key:string,label:string)=><tr key={key} className="border-t border-slate-100"><td className="sticky left-0 z-10 min-w-56 bg-white px-2 py-2 text-xs">{itemLabel("pomec",key,label)} {editLabelButton("pomec",key,label)} {costPercentControl(key,itemLabel("pomec",key,label),"pomecDetails",updatePomecDetail,"hotel")} {costFillButton(key,itemLabel("pomec",key,label),updatePomecDetail)}</td>{order.map(i=><td key={i} className="px-2 py-1.5"><input aria-label={label+" "+form.forecast.monthly[i].label} inputMode="numeric" className="w-28 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-right text-xs tabular-nums focus:border-cyan-500 focus:outline-none" placeholder="—" value={String(payrollInputKey(key)?payrollValueFor("POMEC",key):form.forecast.monthly[i]?.pomecDetails?.[key]||"")} readOnly={payrollInputKey(key)} disabled={payrollInputKey(key)} title={payrollInputKey(key)?"Dikunci: nilai otomatis dari Master Payroll. Ubah hanya di Master Payroll.":"Input manual"} onChange={e=>{if(!payrollInputKey(key))updatePomecDetail(i,key,e.target.value.replace(/[^0-9]/g,""));}}/></td>)}<td className="px-2 py-2 text-right text-xs font-bold tabular-nums">{fmtMoney(annual([key]))}</td><td className="px-2 py-2 text-right text-xs">{pct(annual([key]),hotelRevenueTotal)}</td></tr>;
                    const groupRows=(title:string,rows:readonly (readonly [string,string])[],keys:readonly string[],subtotal:string)=><Fragment><tr className="bg-cyan-50"><td colSpan={15} className="px-3 py-2 text-xs font-black text-cyan-950">{title}</td></tr>{rows.map(([key,label])=>inputRow(key,label))}{totalRow(subtotal,keys)}</Fragment>;
                    return <div className="space-y-4">
                      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white"><table className="min-w-max border-collapse"><thead><tr className="bg-cyan-900 text-white"><th className="sticky left-0 z-20 min-w-56 px-3 py-3 text-left text-xs">ENGINEERING DEPARTMENT</th>{order.map(i=><th key={i} className="min-w-28 px-2 py-3 text-right text-xs">{i===11?"Dec":monthNames[i].slice(0,3)}</th>)}<th className="min-w-32 px-2 py-3 text-right text-xs">TOTAL</th><th className="min-w-20 px-2 py-3 text-right text-xs">%</th></tr></thead><tbody>
                        <tr className="bg-slate-50"><td className="sticky left-0 z-10 bg-slate-50 px-3 py-2 text-xs font-bold">OPERATING DAYS</td>{order.map((i,j)=><td key={i} className="px-2 py-1.5 text-right text-xs">{form.forecast.monthly[i]?.pomecDetails?.operatingDays??operatingDays[j]}</td>)}<td className="px-2 py-2 text-right text-xs">—</td><td className="px-2 py-2 text-right text-xs">—</td></tr>
                        <tr className="bg-cyan-50"><td colSpan={15} className="px-3 py-2 text-xs font-black text-cyan-950">PAYROLL &amp; RELATED</td></tr>
                        {payrollRows.map(([key,label])=>inputRow(key,label))}
                        {totalRow("TOTAL PAYROLL & RELATED",payrollExpenseKeys)}
                        {groupRows("OTHER EXPENSES",otherRows,otherKeys,"TOTAL OTHER EXPENSES")}
                        {groupRows("ENERGY COST",energyRows,energyKeys,"TOTAL ENERGY COST")}
                        {totalRow("TOTAL DEPT. COST & EXPENSES",allKeys,"bg-cyan-100")}
                      </tbody></table></div>
                    </div>;
                  })()}
                </div>}
                {selectedDepartment==="hrd"&&<div className="space-y-3">
                  <div><h4 className="font-extrabold text-slate-800">HUMAN RESOURCE</h4><p className="mt-1 text-xs text-slate-500">HRD mengikuti urutan Dec, Jan–Nov, TOTAL, dan persentase terhadap total revenue hotel. PAYROLL &amp; RELATED otomatis dari Master Payroll dan terkunci; hanya biaya non-payroll yang diisi manual. Angka contoh sumber tidak diisi otomatis.</p></div>
                  {(() => {
                    const order=[11,0,1,2,3,4,5,6,7,8,9,10];
                    const operatingDays=order.map(i=>new Date(Number(form.yearStart),i+1,0).getDate());
                    const payrollRows=[["salaryWages","SALARY & WAGES"],["incomeTax","INCOME TAX (PPh 21 employee withholding)"],["jamsostek","JAMSOSTEK"],["insurance","INSURANCE"],["bonusProvision","PROV. FOR BONUS"],["mealAllowances","MEAL ALLOWANCES"],["medical","MEDICAL / ASKES"],["otherPayroll","OTHER PAYROLL COST"]] as const;
                    const otherRows=[["employeeRelation","EMPLOYEE RELATION"],["casual","CASUAL"],["laundryUniforms","LAUNDRY - UNIFORMS"],["postageCourier","POSTAGE & COURIER"],["paperSupplies","PAPER SUPPLIES"],["cleaningSupplies","CLEANING SUPPLIES"],["printingStationery","PRINTING & STATIONERY"],["socialSportActivity","SOCIAL SPORT & ACTIVITY"],["transportation","TRANSPORTATION"],["telephone","TELEPHONE"],["medicalExpenses","MEDICAL EXPENSES"],["trainingEducation","TRAINING & EDUCATION"],["recruitingAdvertisement","RECRUITING & ADVERTISEMENT"],["housePublication","HOUSE PUBLICATION"],["provisionUniform","PROV. UNIFORM"],["others","OTHERS"]] as const;
                    const value=(i:number,key:string)=>optional(payrollInputKey(key)?payrollValueFor("HRD",key):form.forecast.monthly[i]?.hrdDetails?.[key]||"");
                    const total=(i:number,keys:readonly string[])=>{const vals=keys.map(key=>value(i,key));return vals.some(v=>v!==null)?vals.reduce<number>((sum,v)=>sum+(Number(v??0)||0),0):null;};
                    const annual=(keys:readonly string[])=>order.some(i=>total(i,keys)!==null)?order.reduce<number>((sum,i)=>sum+(total(i,keys)??0),0):null;
                    const revenueByMonth=order.map(i=>calcMonthly(form.forecast.monthly[i],Number(form.yearStart),i,form.statistics.rooms).revenue);
                    const hotelRevenueTotal=revenueByMonth.some(v=>v!==null)?revenueByMonth.reduce<number>((sum,v)=>sum+(v??0),0):null;
                    const fmtMoney=(n:number|null)=>n===null?"—":new Intl.NumberFormat("id-ID",{maximumFractionDigits:0}).format(n);
                    const pct=(n:number|null,base:number|null)=>n===null||base===null||base===0?"—":new Intl.NumberFormat("id-ID",{maximumFractionDigits:2}).format(n/base*100)+"%";
                    const payrollKeys=payrollRows.map(r=>r[0]).filter(key=>key!=="incomeTax");
                    const otherKeys=otherRows.map(r=>r[0]);
                    const allExpenseKeys=[...payrollKeys,...otherKeys];
                    const totalRow=(label:string,keys:readonly string[])=> <tr className="bg-slate-100 font-bold"><td className="sticky left-0 z-10 min-w-52 bg-slate-100 px-3 py-2 text-xs">{label}</td>{order.map(i=><td key={i} className="px-2 py-2 text-right text-xs tabular-nums">{fmtMoney(total(i,keys))}</td>)}<td className="px-2 py-2 text-right text-xs tabular-nums">{fmtMoney(annual(keys))}</td><td className="px-2 py-2 text-right text-xs">{pct(annual(keys),hotelRevenueTotal)}</td></tr>;
                    const inputRow=(key:string,label:string)=><tr key={key} className="border-t border-slate-100"><td className="sticky left-0 z-10 min-w-52 bg-white px-2 py-2 text-xs">{itemLabel("hrd",key,label)} {editLabelButton("hrd",key,label)} {costPercentControl(key,itemLabel("hrd",key,label),"hrdDetails",updateHrdDetail,"hotel")} {costFillButton(key,itemLabel("hrd",key,label),updateHrdDetail)}</td>{order.map(i=><td key={i} className="px-2 py-1.5"><input aria-label={label+" "+form.forecast.monthly[i].label} inputMode="numeric" className="w-28 rounded-md border border-slate-200 bg-white px-2 py-2 text-right text-xs tabular-nums focus:border-indigo-400 focus:outline-none" placeholder="—" value={String(payrollInputKey(key)?payrollValueFor("HR",key):form.forecast.monthly[i]?.hrdDetails?.[key]||"")} readOnly={payrollInputKey(key)} disabled={payrollInputKey(key)} title={payrollInputKey(key)?"Dikunci: nilai otomatis dari Master Payroll. Ubah hanya di Master Payroll.":"Input manual"} onChange={e=>{if(!payrollInputKey(key))updateHrdDetail(i,key,e.target.value.replace(/[^0-9]/g,""));}}/></td>)}<td className="px-2 py-2 text-right text-xs font-bold tabular-nums">{fmtMoney(annual([key]))}</td><td className="px-2 py-2 text-right text-xs">{pct(annual([key]),hotelRevenueTotal)}</td></tr>;
                    return <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white"><table className="min-w-max border-collapse"><thead><tr className="bg-indigo-900 text-white"><th className="sticky left-0 z-20 min-w-52 px-3 py-3 text-left text-xs">HUMAN RESOURCE</th>{order.map(i=><th key={i} className="min-w-28 px-2 py-3 text-right text-xs">{i===11?"Dec":monthNames[i].slice(0,3)}</th>)}<th className="min-w-32 px-2 py-3 text-right text-xs">TOTAL</th><th className="min-w-20 px-2 py-3 text-right text-xs">%</th></tr></thead><tbody>
                      <tr className="bg-slate-50"><td className="sticky left-0 z-10 bg-slate-50 px-3 py-2 text-xs font-bold">OPERATING DAYS</td>{order.map((i,j)=><td key={i} className="px-2 py-1.5"><input aria-label={"Operating days "+form.forecast.monthly[i].label} inputMode="numeric" className="w-20 rounded-md border border-slate-200 px-2 py-1.5 text-right text-xs" value={form.forecast.monthly[i]?.hrdDetails?.operatingDays??String(operatingDays[j])} readOnly title="Mengikuti kalender operasional yang ditetapkan"/></td>)}<td className="px-2 py-2 text-right text-xs">—</td><td className="px-2 py-2 text-right text-xs">—</td></tr>
                      <tr className="bg-indigo-50"><td colSpan={15} className="px-3 py-2 text-xs font-black text-indigo-950">PAYROLL &amp; RELATED</td></tr>
                      {payrollRows.map(([key,label])=>inputRow(key,label))}
                      {totalRow("TOTAL PAYROLL & RELATED",payrollKeys)}
                      <tr className="bg-indigo-50"><td colSpan={15} className="px-3 py-2 text-xs font-black text-indigo-950">OTHER EXPENSES</td></tr>
                      {otherRows.map(([key,label])=>inputRow(key,label))}
                      {totalRow("TOTAL OTHER EXPENSES",otherKeys)}
                      <tr className="bg-indigo-100 font-black"><td className="sticky left-0 z-10 bg-indigo-100 px-3 py-3 text-xs">TOTAL DEPT. EXPENSES</td>{order.map(i=><td key={i} className="px-2 py-3 text-right text-xs tabular-nums">{fmtMoney(total(i,allExpenseKeys))}</td>)}<td className="px-2 py-3 text-right text-xs tabular-nums">{fmtMoney(annual(allExpenseKeys))}</td><td className="px-2 py-3 text-right text-xs">{pct(annual(allExpenseKeys),hotelRevenueTotal)}</td></tr>
                    </tbody></table></div>;
                  })()}
                </div>}
                {!["room","fb","mod","ag","hrd","pomec"].includes(selectedDepartment)&&<div className="rounded-xl border border-dashed border-slate-300 bg-white p-5"><h4 className="font-extrabold text-slate-800">{({sm:"SALES & MARKETING",pomec:"POMEC & UTILITIES"} as Record<string,string>)[selectedDepartment]}</h4><p className="mt-2 text-sm leading-6 text-slate-600">Menu departemen sudah disiapkan. Rincian akun bagian ini akan disusun setelah modul departemen sebelumnya selesai.</p></div>}
                <p className="text-xs leading-5 text-slate-500">Subtotal, total biaya, departmental profit, dan persentase dihitung otomatis. Nilai yang belum diisi tetap ditampilkan sebagai —. Angka contoh dari sumber tidak dimasukkan otomatis.</p>
</div>
            </section>
          </div>}
          {activeTab==="forecast"&&<div className="space-y-7">
            <section className="overflow-hidden rounded-2xl border border-sky-200 bg-white shadow-sm">
              <div className="bg-gradient-to-r from-sky-900 via-blue-800 to-indigo-800 px-4 py-4 text-white sm:px-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-sky-200">STEP 4 · STATISTICS</p>
                <h3 className="mt-1 text-lg font-extrabold">LAPORAN STATISTIK — {form.yearStart}</h3>
                <p className="mt-1 text-xs leading-5 text-sky-100">Mengikuti item dan formula statistik hotel. Nilai bulanan, total tahunan, dan laporan 10 tahun memakai basis perhitungan yang sama; data yang belum tersedia tetap ditampilkan sebagai —.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-max min-w-[1956px] table-fixed border-collapse text-[11px]">
                  <thead><tr className="bg-slate-100 text-slate-700"><th className="sticky left-0 z-10 w-[240px] min-w-[240px] max-w-[240px] bg-slate-100 px-3 py-2 text-left">Description</th>{[11,0,1,2,3,4,5,6,7,8,9,10].map(i=><th key={form.forecast.monthly[i].label} className="w-[128px] min-w-[128px] max-w-[128px] px-3 py-2 text-right whitespace-nowrap">{i===11?"DES":monthNames[i].slice(0,3).toUpperCase()}</th>)}<th className="w-[180px] min-w-[180px] max-w-[180px] bg-sky-100 px-3 py-2 text-right whitespace-nowrap">YEAR TOTAL / AVG</th></tr></thead>
                  <tbody>{buildStatisticsSheetRows(form,{hidden:hiddenFbSections,labels:fbMenuLabels}).map((line,i)=>{
                    if(line.kind==="section") return <tr key={line.label}><th colSpan={14} className="border-t-2 border-slate-300 bg-sky-100 px-3 py-3 text-left text-xs font-black tracking-wider text-slate-800">{line.label}</th></tr>;
                    const isPercent=line.kind==="percent";
                    const isCount=/# OF ROOMS|DAYS|ROOMS AVAILABLE|OCCUPIED ROOMS|ROOM PAID|COMPLIMENTARY|GUESTS IN HOUSE|ARRIVALS|COVERS|TOTAL PAX|INVENTORY YEAR/i.test(line.label);
                    const isRate=/EXCHANGE RATE/i.test(line.label);
                    const isUsd=/\bUSD\b|\(USD\)|- USD/i.test(line.label);
                    const isGuestRoomOrStay=/^(AVERAGE GUEST \/ ROOM|LENGTH OF STAY)$/i.test(line.label.trim());
                     const display=(v:number|null|undefined)=>v===null||v===undefined||!Number.isFinite(v)?"—":isGuestRoomOrStay?new Intl.NumberFormat("id-ID",{minimumFractionDigits:2,maximumFractionDigits:2}).format(v):isPercent?fmt(v,1)+"%":isCount?fmt(v,0):isUsd?"$"+fmt(v,2):isRate?fmt(v,2):money(v);
                    return <tr key={line.label} className={i%2?"bg-slate-50":"bg-white"}><th className="sticky left-0 z-[1] w-[240px] min-w-[240px] max-w-[240px] border-t border-slate-200 bg-inherit px-3 py-2 text-left font-semibold whitespace-normal break-words">{line.label}</th>{[line.values[11],...line.values.slice(0,11)].map((v,j)=><td key={j} className="w-[128px] min-w-[128px] max-w-[128px] border-t border-slate-200 px-3 py-2 text-right tabular-nums whitespace-nowrap">{display(v)}</td>)}<td className="w-[180px] min-w-[180px] max-w-[180px] border-t border-slate-200 bg-sky-50 px-3 py-2 text-right font-extrabold tabular-nums whitespace-nowrap">{display(line.total)}</td></tr>;
                  })}</tbody>
                </table>
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-teal-200 bg-white shadow-sm">
              <div className="bg-gradient-to-r from-teal-900 via-emerald-800 to-cyan-800 px-4 py-4 text-white sm:px-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-teal-200">STEP 4 · MONTHLY & ANNUAL FORECAST</p>
                <h3 className="mt-1 text-lg font-extrabold">1 YEAR CONSOLIDATED — {form.yearStart}</h3>
                <p className="mt-1 text-xs leading-5 text-teal-100">Laporan konsolidasi 12 bulan. Revenue, cost of sales, payroll, biaya departemen, overhead, dan profit menggunakan perhitungan dari sumber forecast yang sama dengan ekspor Excel.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-max min-w-[2700px] table-fixed border-collapse text-[10px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700">
                      <th rowSpan={2} className="sticky left-0 z-20 w-[250px] min-w-[250px] max-w-[250px] bg-slate-100 px-3 py-2 text-left">ACCOUNT / DESCRIPTION</th>
                      {[11,0,1,2,3,4,5,6,7,8,9,10].map(i=><th key={form.forecast.monthly[i].label} colSpan={2} className="w-[180px] min-w-[180px] max-w-[180px] border-l border-slate-200 px-2 py-2 text-center whitespace-nowrap">{i===11?"DES":monthNames[i].slice(0,3).toUpperCase()}</th>)}
                      <th colSpan={2} className="w-[220px] min-w-[220px] max-w-[220px] border-l border-teal-200 bg-teal-100 px-3 py-2 text-center">TOTAL / AVERAGE</th>
                    </tr>
                    <tr className="bg-slate-50 text-slate-600">
                      {[11,0,1,2,3,4,5,6,7,8,9,10].map(i=><Fragment key={form.forecast.monthly[i].label}><th className="border-l border-slate-200 px-2 py-1.5 text-right">VALUE</th><th className="px-2 py-1.5 text-right">%</th></Fragment>)}
                      <th className="border-l border-teal-200 bg-teal-50 px-2 py-1.5 text-right">VALUE</th><th className="bg-teal-50 px-2 py-1.5 text-right">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...buildConsolidatedRows(consolidatedForm).filter(line=>!/(TELEPHONE|FACSIMILE)/i.test(line.label)).map(line=>({...line,label:({"OTHER DEPARTMENT EXPENSES":"OTHER EXPENSES","TOTAL OTHER DEPARTMENT EXPENSES":"TOTAL OTHER EXPENSES","TOTAL PAYROLL & RELATED EXPENSES":"TOTAL PAYROLL & RELATED EXP.","DEPARTMENT OPERATING COST & EXPENSES":"DEPART. OPERATING COST & EXP.","TOTAL DEPARTMENT INCOME":"TOTAL DEPTMENT INCOME","BASIC MANAGEMENT FEE":"LESS DEDUCTION","MANAGEMENT FEES":"MANAGEMENT & MARKETING FEES","OTHER OWNER EXPENSES":"OWNERS EXPENSE","NET OWNER SHARE PROFIT / UNIT":"NET OWNER SHARE PROFIT/UNIT"} as Record<string,string>)[line.label]??line.label}))].map((line,i)=>{
                      if(line.kind==="section") return <tr key={line.label}><th colSpan={27} className="border-t-2 border-slate-300 bg-slate-200 px-3 py-2 text-left text-[10px] font-black tracking-wider text-slate-800">{line.label}</th></tr>;
                      const isPercent=line.kind==="percent";
                      const displayValue=(v:number|null|undefined)=>v===null||v===undefined||!Number.isFinite(v)?"—":isPercent?fmt(v,1)+"%":money(v);
                      const displayPct=(v:number|null|undefined)=>v===null||v===undefined||!Number.isFinite(v)?"—":fmt(v,1)+"%";
                      return <tr key={line.label} className={i%2?"bg-slate-50":"bg-white"}>
                        <th className="sticky left-0 z-[1] w-[250px] min-w-[250px] max-w-[250px] border-t border-slate-200 bg-inherit px-3 py-2 text-left font-semibold whitespace-normal break-words">{line.label}</th>
                        {line.values.map((v,j)=>{
                          const base=line.base?.[j]??null;
                          const percentage=!isPercent&&v!==null&&base!==null&&base!==0?v/base*100:null;
                          const canOverride=tenYearMode==="manual"&&j>0&&!!line.inputKey&&line.label!=="TOTAL OPERATING COSTS"&&!isPercent;
                          const overrideKey=`${i}:${j}`;
                          return <Fragment key={j}>
                            <td className="w-[90px] min-w-[90px] max-w-[90px] border-t border-l border-slate-200 px-2 py-2 text-right tabular-nums whitespace-nowrap">{isPercent?"—":displayValue(v)}</td>
                            <td className="w-[90px] min-w-[90px] max-w-[90px] border-t border-slate-200 px-2 py-2 text-right tabular-nums whitespace-nowrap">{displayPct(isPercent?v:percentage)}</td>
                          </Fragment>;
                        })}
                        <td className="w-[110px] min-w-[110px] max-w-[110px] border-t border-l border-slate-200 bg-teal-50 px-2 py-2 text-right font-extrabold tabular-nums whitespace-nowrap">{isPercent?"—":displayValue(line.total)}</td>
                        <td className="w-[110px] min-w-[110px] max-w-[110px] border-t border-slate-200 bg-teal-50 px-2 py-2 text-right font-bold tabular-nums whitespace-nowrap">{displayPct(isPercent?line.total:line.totalPct)}</td>
                      </tr>;
                    })}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-[11px] leading-5 text-slate-600">
                Persentase setiap baris dihitung terhadap basis revenue atau basis departemen yang ditetapkan dalam rumus konsolidasi. TOTAL menjumlahkan nilai bulanan; baris persentase profit menampilkan rasio dan tidak menjumlahkan persentase bulanan. Nilai yang belum diinput ditampilkan sebagai 0 agar setiap baris terlihat telah melewati perhitungan; verifikasi sumber input sebelum menggunakan laporan final.
              </div>
            </section>

            <div className="flex flex-col gap-3 rounded-2xl border border-indigo-200 bg-indigo-50/70 p-4 lg:flex-row lg:items-center lg:justify-between"><div><h3 className="font-bold text-slate-900">Asumsi Pertumbuhan Tahunan — 10 Years Consolidated</h3><p className="mt-1 text-xs leading-5 text-slate-600">Simple Growth tetap menjadi default dengan asumsi 2% per tahun. Manual Override hanya mengubah akun rincian dan tahun yang diisi; subtotal, GOP, profit, dan margin dihitung ulang.</p><label className="mt-3 flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-700">Metode proyeksi <select value={tenYearMode} onChange={e=>setTenYearMode(e.target.value==="manual"?"manual":e.target.value==="driver"?"driver":"growth")} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900"><option value="growth">Simple Growth — Default</option><option value="driver">Driver-Based Budget</option><option value="manual">Manual Override</option></select></label></div>{tenYearMode==="growth"&&<label className="flex shrink-0 items-center gap-2 text-sm font-semibold text-slate-700">Pertumbuhan <input aria-label="Asumsi pertumbuhan tahunan persen" type="number" min="-100" max="100" step="0.1" value={annualGrowthPct} onChange={e=>setAnnualGrowthPct(Math.max(-100,Math.min(100,Number(e.target.value)||0)))} className="w-24 rounded-lg border border-slate-300 bg-white px-3 py-2 text-right font-bold text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200" /><span>% / tahun</span></label>}</div>
            {tenYearMode==="driver"&&<div className="rounded-2xl border border-sky-200 bg-white p-4 shadow-sm"><h4 className="font-bold text-slate-900">Driver-Based Budget — Asumsi Pertumbuhan per Kelompok</h4><p className="mt-1 text-xs leading-5 text-slate-600">Isi hanya penggerak yang relevan. Kolom kosong tidak dianggap 0%; kelompok tersebut tetap memakai Simple Growth {annualGrowthPct}% per tahun. Perubahan hanya berlaku untuk proyeksi tahun ke-2 dan seterusnya. Nilai tahun pertama tetap sama dengan 1 Year Consolidated.</p><div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">{([{key:"rooms",label:"Rooms"},{key:"fnb",label:"F&B"},{key:"mod",label:"MOD"},{key:"costOfSales",label:"Cost of Sales"},{key:"payroll",label:"Payroll"},{key:"departmentExpenses",label:"Biaya Departemen"},{key:"overhead",label:"Overhead"}] as const).map(item=><label key={item.key} className="text-xs font-semibold text-slate-700">{item.label} (% / tahun)<input type="number" step="0.1" min="-100" max="100" value={driverAssumptions[item.key]} onChange={e=>setDriverAssumptions(prev=>({...prev,[item.key]:e.target.value}))} placeholder={`Kosong = ${annualGrowthPct}%`} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"/></label>)}</div></div>}
            <section className="overflow-hidden rounded-2xl border border-indigo-200 bg-white shadow-sm">
              <div className="bg-gradient-to-r from-indigo-900 via-blue-900 to-violet-900 px-4 py-4 text-white sm:px-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-200">STEP 4 · MONTHLY & ANNUAL FORECAST</p>
                <h3 className="mt-1 text-lg font-extrabold">10 YEARS CONSOLIDATED — {form.yearStart}–{Number(form.yearStart)+9}</h3>
                <p className="mt-1 text-xs leading-5 text-indigo-100">Susunan item dan kelompok mengikuti 1 YEAR CONSOLIDATED. YEAR 1 menggunakan total laporan 1 tahun; YEAR 2–10 dihitung otomatis berdasarkan asumsi pertumbuhan tahunan di atas.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-max min-w-[2700px] table-fixed border-collapse text-[10px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700">
                      <th rowSpan={2} className="sticky left-0 z-20 w-[250px] min-w-[250px] max-w-[250px] bg-slate-100 px-3 py-2 text-left">ACCOUNT / DESCRIPTION</th>
                      {form.forecast.annual.map((row,i)=><th key={row.label} colSpan={2} className="w-[180px] min-w-[180px] max-w-[180px] border-l border-slate-200 px-2 py-2 text-center whitespace-nowrap">YEAR {i+1}<span className="block text-[9px] font-normal">{row.label}</span></th>)}
                      <th colSpan={2} className="w-[220px] min-w-[220px] max-w-[220px] border-l border-indigo-200 bg-indigo-100 px-3 py-2 text-center">TOTAL / AVERAGE</th>
                    </tr>
                    <tr className="bg-slate-50 text-slate-600">
                      {form.forecast.annual.map(row=><Fragment key={row.label}><th className="border-l border-slate-200 px-2 py-1.5 text-right">VALUE</th><th className="px-2 py-1.5 text-right">%</th></Fragment>)}
                      <th className="border-l border-indigo-200 bg-indigo-50 px-2 py-1.5 text-right">VALUE</th><th className="bg-indigo-50 px-2 py-1.5 text-right">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {buildTenYearRows(consolidatedForm).map((line,i)=>{
                      if(line.section) return <tr key={line.label}><th colSpan={23} className="border-t-2 border-slate-300 bg-slate-200 px-3 py-2 text-left text-[10px] font-black tracking-wider text-slate-800">{line.label}</th></tr>;
                      const isPercent=line.kind==="percent";
                      const displayValue=(v:number|null|undefined)=>v===null||v===undefined||!Number.isFinite(v)?"—":isPercent?fmt(v,1)+"%":money(v);
                      const displayPct=(v:number|null|undefined)=>v===null||v===undefined||!Number.isFinite(v)?"—":fmt(v,1)+"%";
                      return <tr key={line.label} className={i%2?"bg-slate-50":"bg-white"}>
                        <th className="sticky left-0 z-[1] w-[250px] min-w-[250px] max-w-[250px] border-t border-slate-200 bg-inherit px-3 py-2 text-left font-semibold whitespace-normal break-words">{line.label}</th>
                        {line.values.map((v,j)=>{
                          const base=line.base?.[j]??null;
                          const percentage=!isPercent&&v!==null&&base!==null&&base!==0?v/base*100:null;
                          return <Fragment key={j}>
                            <td className={`w-[90px] min-w-[90px] max-w-[90px] border-t border-l border-slate-200 px-1 py-2 text-right tabular-nums whitespace-nowrap ${tenYearMode==="manual"&&j>0&&!!line.inputKey&&line.kind!=="percent"?"bg-amber-50":""}`}>{tenYearMode==="manual"&&j>0&&!!line.inputKey&&line.kind!=="percent"?<input aria-label={`Manual override ${line.label} tahun ${Number(form.yearStart)+j}`} title="Isi nominal target untuk tahun ini. Kosongkan untuk kembali ke proyeksi otomatis." type="number" step="any" value={tenYearOverrides[`${i}:${j}`]??(v===null||v===undefined?"":String(v))} onChange={e=>setTenYearOverrides(prev=>({...prev,[`${i}:${j}`]:e.target.value}))} className="w-[82px] rounded border border-amber-300 bg-white px-1.5 py-1.5 text-right text-xs tabular-nums outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100" />:displayValue(v)}</td>
                            <td className="w-[90px] min-w-[90px] max-w-[90px] border-t border-slate-200 px-2 py-2 text-right tabular-nums whitespace-nowrap">{displayPct(isPercent?(v??null):percentage)}</td>
                          </Fragment>;
                        })}
                        <td className="w-[110px] min-w-[110px] max-w-[110px] border-t border-l border-slate-200 bg-indigo-50 px-2 py-2 text-right font-extrabold tabular-nums whitespace-nowrap">{displayValue(line.total)}</td>
                        <td className="w-[110px] min-w-[110px] max-w-[110px] border-t border-slate-200 bg-indigo-50 px-2 py-2 text-right font-bold tabular-nums whitespace-nowrap">{displayPct(line.totalPct)}</td>
                      </tr>;
                    })}
                  </tbody>
                </table>
              </div>
            </section>
            <div className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-teal-200 bg-teal-50 p-4 sm:flex-row sm:items-center">
              <div><h4 className="font-bold text-teal-950">Sinkronisasi &amp; Perhitungan Ulang</h4><p className="mt-1 text-sm leading-5 text-teal-800">Hitung ulang Monthly Forecast, 1 Year Consolidated, dan 10 Years Consolidated berdasarkan input terbaru. Data kosong tetap ditampilkan sebagai — dan perubahan manual tetap dipertahankan.</p></div>
              <button type="button" onClick={()=>{setForecastRecalcKey(value=>value+1);setMessage("Perhitungan ulang forecast dijalankan berdasarkan data terbaru.");setIssues([]);}} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-teal-700 px-5 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"><span aria-hidden="true">↻</span> Sinkronkan &amp; Hitung Ulang Forecast</button>
            </div>
          </div>}

          {activeTab==="variance"&&<div className="space-y-5">
            <div className="rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-950">Variance dihitung hanya jika Actual dan Budget sama-sama diisi. Untuk revenue, nilai positif biasanya berarti di atas budget. Untuk biaya, nilai positif berarti biaya di atas budget dan perlu ditinjau. Perbandingan wajib menggunakan periode yang sama.</div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{metric("Revenue Actual",money(revenueActual))}{metric("Revenue Budget",money(revenueBudget))}{metric("Revenue Variance",revenueActual===null||revenueBudget===null?"Belum lengkap":money(revenueActual-revenueBudget))}{metric("Revenue Last Year",money(revenueLastYear))}{metric("Cost Actual",money(costActual))}{metric("Cost Budget",money(costBudget))}{metric("Cost Variance",costActual===null||costBudget===null?"Belum lengkap":money(costActual-costBudget))}{metric("Cost Last Year",money(costLastYear))}{metric("GOP Margin",values.gopMargin===null?"—":fmt(values.gopMargin)+"%")}{metric("YTD Revenue Actual",money(ytdRevenueActual))}{metric("YTD Revenue Budget",money(ytdRevenueBudget))}{metric("YTD Revenue Variance",ytdRevenueActual===null||ytdRevenueBudget===null?"Belum lengkap":money(ytdRevenueActual-ytdRevenueBudget))}{metric("YTD Cost Actual",money(ytdCostActual))}{metric("YTD Cost Budget",money(ytdCostBudget))}{metric("YTD Cost Variance",ytdCostActual===null||ytdCostBudget===null?"Belum lengkap":money(ytdCostActual-ytdCostBudget))}</div>
            <div className="overflow-x-auto rounded-2xl border border-slate-200"><table className="w-full min-w-[750px] border-collapse text-sm"><thead className="bg-amber-100 text-amber-950"><tr>{["Kelompok akun","Actual","Budget","Variance A−B","Last Year","Variance A−LY"].map(x=><th key={x} className="px-3 py-3 text-right first:text-left">{x}</th>)}</tr></thead><tbody>{GROUP_ORDER.filter(group=>group!=="ownerCashItems").map((group,i)=>{const a=sumGroup(form.accounts,group,"actual",allAccountLines),b=sumGroup(form.accounts,group,"budget",allAccountLines),l=sumGroup(form.accounts,group,"lastYear",allAccountLines);return <tr key={group} className={i%2?"bg-slate-50":"bg-white"}><td className="border-t px-3 py-3 font-semibold">{GROUP_LABELS[group]}</td><td className="border-t px-3 py-3 text-right tabular-nums">{money(a)}</td><td className="border-t px-3 py-3 text-right tabular-nums">{money(b)}</td><td className="border-t px-3 py-3 text-right font-bold tabular-nums">{a!==null&&b!==null?money(a-b):"Belum lengkap"}</td><td className="border-t px-3 py-3 text-right tabular-nums">{money(l)}</td><td className="border-t px-3 py-3 text-right font-bold tabular-nums">{a!==null&&l!==null?money(a-l):"Belum lengkap"}</td></tr>;})}</tbody></table></div>
            <div className="mt-5"><h3 className="mb-3 text-lg font-extrabold">Year-to-Date (YTD) Variance &amp; Exception Report</h3><div className="overflow-x-auto rounded-2xl border border-slate-200"><table className="w-full min-w-[780px] border-collapse text-sm"><thead className="bg-violet-100 text-violet-950"><tr>{["Kelompok akun","YTD Actual","YTD Budget","Variance A−B","Last Year YTD","Variance A−LY"].map(x=><th key={x} className="px-3 py-3 text-right first:text-left">{x}</th>)}</tr></thead><tbody>{GROUP_ORDER.filter(group=>group!=="ownerCashItems").map((group,i)=>{const a=sumGroup(form.accounts,group,"ytdActual",allAccountLines),b=sumGroup(form.accounts,group,"ytdBudget",allAccountLines),l=sumGroup(form.accounts,group,"lastYearYtd",allAccountLines);return <tr key={group} className={i%2?"bg-slate-50":"bg-white"}><td className="border-t px-3 py-3 font-semibold">{GROUP_LABELS[group]}</td><td className="border-t px-3 py-3 text-right tabular-nums">{money(a)}</td><td className="border-t px-3 py-3 text-right tabular-nums">{money(b)}</td><td className="border-t px-3 py-3 text-right font-bold tabular-nums">{a!==null&&b!==null?money(a-b):"Belum lengkap"}</td><td className="border-t px-3 py-3 text-right tabular-nums">{money(l)}</td><td className="border-t px-3 py-3 text-right font-bold tabular-nums">{a!==null&&l!==null?money(a-l):"Belum lengkap"}</td></tr>;})}</tbody></table></div></div>
          </div>}

          {activeTab==="export"&&<section className="mt-2 space-y-6" aria-label="Export PDF dan Excel">
            <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-slate-950 via-blue-900 to-violet-800 p-6 text-white shadow-lg sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div><p className="text-xs font-bold uppercase tracking-[0.22em] text-sky-200">CORESTAY ADVISORY · FINAL WORKSPACE</p><h2 className="mt-2 text-2xl font-black sm:text-3xl">Export PDF &amp; Excel</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100">Simpan draft, tinjau laporan, unduh file, cetak, dan periksa konsistensi seluruh input sebelum laporan difinalisasi.</p></div>
                <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur"><p className="text-xs text-blue-100">Mata uang</p><p className="mt-1 text-lg font-extrabold">IDR · Rupiah</p></div>
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-2 text-xs"><span className="rounded-full bg-white/15 px-3 py-1.5">Hotel: {form.hotelName||"Belum diisi"}</span><span className="rounded-full bg-white/15 px-3 py-1.5">Periode: {form.period||form.yearStart}</span><span className="rounded-full bg-white/15 px-3 py-1.5">Draft: {draftSavedAt?new Date(draftSavedAt).toLocaleString("id-ID"):"Belum disimpan"}</span></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 to-white p-5 shadow-sm"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-600 text-xl text-white">▣</div><h3 className="mt-4 text-lg font-extrabold text-slate-900">1. Simpan Draft</h3><p className="mt-1 min-h-12 text-sm leading-5 text-slate-600">Simpan input sementara di perangkat ini. Data tetap tersedia setelah refresh pada browser yang sama.</p><button type="button" onClick={saveDraft} className="mt-4 w-full rounded-xl bg-sky-700 px-4 py-3 text-sm font-bold text-white hover:bg-sky-800">Simpan Draft</button></div>
              <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-5 shadow-sm"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-600 text-xl text-white">◉</div><h3 className="mt-4 text-lg font-extrabold text-slate-900">2. Preview Laporan</h3><p className="mt-1 min-h-12 text-sm leading-5 text-slate-600">Tinjau statistik, laporan konsolidasi, forecast, serta rincian departemen sebelum dicetak.</p><button type="button" onClick={()=>setPreviewOpen(true)} className="mt-4 w-full rounded-xl bg-violet-700 px-4 py-3 text-sm font-bold text-white hover:bg-violet-800">Preview Laporan</button></div>
              <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 text-xl text-white">⇩</div><h3 className="mt-4 text-lg font-extrabold text-slate-900">3. Download File</h3><p className="mt-1 min-h-12 text-sm leading-5 text-slate-600">Unduh workbook Excel berisi statistik, budget, forecast, dan rincian laporan.</p><button type="button" onClick={downloadExcel} className="mt-4 w-full rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-800">Download Excel (.xlsx)</button></div>
              <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 shadow-sm"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500 text-xl text-white">▤</div><h3 className="mt-4 text-lg font-extrabold text-slate-900">4. Print / Save PDF</h3><p className="mt-1 min-h-12 text-sm leading-5 text-slate-600">Buka preview laporan terlebih dahulu, lalu pilih Print / Save PDF dan pilih “Save as PDF” pada dialog cetak browser.</p><button type="button" onClick={()=>setPreviewOpen(true)} className="mt-4 w-full rounded-xl bg-amber-600 px-4 py-3 text-sm font-bold text-white hover:bg-amber-700">Preview &amp; Save PDF</button></div>
              <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-5 shadow-sm sm:col-span-2 xl:col-span-2"><div className="flex flex-wrap items-start justify-between gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-700 text-xl text-white">✓</div><span className={"rounded-full px-3 py-1 text-xs font-bold "+(orchestrator==="passed"?"bg-emerald-100 text-emerald-800":orchestrator==="checking"?"bg-amber-100 text-amber-800":orchestrator==="failed"?"bg-rose-100 text-rose-800":"bg-slate-100 text-slate-700")}>{orchestrator==="passed"?"Pemeriksaan lolos":orchestrator==="checking"?"Sedang memeriksa":orchestrator==="failed"?"Perlu ditinjau":"Belum diperiksa"}</span></div><h3 className="mt-4 text-lg font-extrabold text-slate-900">5. Validasi Akhir · CORESTAY VERIFIED — HOTEL BUDGET</h3><p className="mt-1 text-sm leading-5 text-slate-600">Periksa data dari tahap awal sampai akhir: konsistensi antar-laporan, subtotal dan total, formula hotel, serta keseimbangan pembukuan. Nilai kosong tidak otomatis dianggap nol. Temuan hanya ditampilkan bila ada ketidaksesuaian yang relevan.</p><button type="button" disabled={saving} onClick={()=>void saveFinal()} className="mt-4 w-full rounded-xl bg-gradient-to-r from-indigo-700 to-violet-700 px-4 py-3 text-sm font-bold text-white shadow-sm hover:from-indigo-800 hover:to-violet-800 disabled:cursor-not-allowed disabled:opacity-60">{saving?"AI Orchestrator sedang memeriksa…":"Jalankan Validasi Akhir & Simpan Laporan"}</button></div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600"><strong className="text-slate-800">Catatan penyimpanan:</strong> Simpan Draft menyimpan sementara di browser/perangkat ini dan bukan pengganti penyimpanan laporan final. Validasi akhir tetap memeriksa laporan sebelum disimpan. Jika angka dan total sudah konsisten, pemeriksaan tidak perlu meminta pengisian ulang yang tidak relevan.</div>
          </section>}

          {activeTab!=="export"&&<div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
            <button type="button" onClick={goPreviousStep} disabled={sectionIndex===0} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">← Tahap Sebelumnya</button>
            <button type="button" onClick={goNextStep} className="rounded-xl bg-gradient-to-r from-blue-700 to-violet-700 px-5 py-3 text-sm font-bold text-white shadow-md transition hover:-translate-y-0.5">Tahap Berikutnya →</button>
          </div>}
          {message&&<div className={"mt-4 rounded-xl border p-4 text-sm leading-6 "+(orchestrator==="passed"?"border-emerald-200 bg-emerald-50 text-emerald-900":orchestrator==="failed"?"border-rose-200 bg-rose-50 text-rose-900":"border-sky-200 bg-sky-50 text-sky-900")}>{message}{summary&&<p className="mt-2 font-semibold">{summary}</p>}</div>}
          {(issues.length>0||displayWarnings.length>0)&&<div className="mt-3 space-y-3">{issues.length>0&&<div className="rounded-xl border border-rose-200 bg-rose-50 p-4"><p className="font-bold text-rose-900">Temuan validasi — wajib ditangani</p><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-rose-800">{issues.map((item,i)=><li key={i}>{item}</li>)}</ul></div>}{displayWarnings.length>0&&<div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="font-bold text-amber-900">Peringatan data</p><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-800">{displayWarnings.map((item,i)=><li key={i}>{item}</li>)}</ul></div>}</div>}
        </section>

        <aside className="space-y-4">
          

        </aside>
      </div>
    </div>

    {previewOpen&&<div className="print-preview-overlay fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto bg-slate-950/60 p-3 pt-6 sm:p-8" role="dialog" aria-modal="true" aria-label="Preview laporan"><article className="print-report my-auto w-full max-w-5xl overflow-hidden rounded-2xl bg-white p-5 shadow-2xl sm:p-8">
      <div className="report-brand-header mb-5 flex items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-[#17365D] via-[#245B8C] to-[#6554B7] px-5 py-5 text-white print:rounded-none"><div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 text-2xl">🏨</div><div><p className="text-[10px] font-extrabold uppercase tracking-[.22em] text-sky-100">CORESTAY ADVISORY</p><h2 className="mt-1 text-xl font-black sm:text-2xl">HOTEL BUDGET &amp; FINANCIAL REPORT</h2><p className="mt-1 text-xs text-blue-100">{form.hotelName||"Nama hotel belum diisi"} · {form.period||"Periode belum diisi"} · {form.yearStart}</p></div></div><div className="text-right"><p className="text-[10px] font-bold uppercase tracking-widest text-sky-100">Confidential</p><p className="mt-1 text-xs text-white/90">Management Report</p><button type="button" onClick={()=>setPreviewOpen(false)} className="mt-2 rounded-full bg-white/15 px-3 py-1.5 text-sm font-bold text-white print:hidden" aria-label="Tutup preview">Tutup ✕</button></div></div>
      
      <section className="mt-7 print-statistics">
        <h3 className="mb-1 text-sm font-extrabold">1A. LAPORAN STATISTIK BULANAN — {form.yearStart}</h3>
        <p className="mb-3 text-[10px] leading-4 text-slate-600">Tampilan, susunan baris, kolom bulanan, dan YEAR TOTAL / AVG mengikuti LAPORAN STATISTIK pada tahap sebelumnya. Nilai dan formula menggunakan sumber yang sama; data kosong tetap —.</p>
        <div className="overflow-x-auto">
                <table className="w-max min-w-[1956px] table-fixed border-collapse text-[11px]">
                  <thead><tr className="bg-slate-100 text-slate-700"><th className="sticky left-0 z-10 w-[240px] min-w-[240px] max-w-[240px] bg-slate-100 px-3 py-2 text-left">Description</th>{[11,0,1,2,3,4,5,6,7,8,9,10].map(i=><th key={form.forecast.monthly[i].label} className="w-[128px] min-w-[128px] max-w-[128px] px-3 py-2 text-right whitespace-nowrap">{i===11?"DES":monthNames[i].slice(0,3).toUpperCase()}</th>)}<th className="w-[180px] min-w-[180px] max-w-[180px] bg-sky-100 px-3 py-2 text-right whitespace-nowrap">YEAR TOTAL / AVG</th></tr></thead>
                  <tbody>{buildStatisticsSheetRows(form,{hidden:hiddenFbSections,labels:fbMenuLabels}).map((line,i)=>{
                    if(line.kind==="section") return <tr key={line.label}><th colSpan={14} className="border-t-2 border-slate-300 bg-sky-100 px-3 py-3 text-left text-xs font-black tracking-wider text-slate-800">{line.label}</th></tr>;
                    const isPercent=line.kind==="percent";
                    const isCount=/# OF ROOMS|DAYS|ROOMS AVAILABLE|OCCUPIED ROOMS|ROOM PAID|COMPLIMENTARY|GUESTS IN HOUSE|ARRIVALS|COVERS|TOTAL PAX|INVENTORY YEAR/i.test(line.label);
                    const isRate=/EXCHANGE RATE/i.test(line.label);
                    const isUsd=/\bUSD\b|\(USD\)|- USD/i.test(line.label);
                    const isGuestRoomOrStay=/^(AVERAGE GUEST \/ ROOM|LENGTH OF STAY)$/i.test(line.label.trim());
                     const display=(v:number|null|undefined)=>v===null||v===undefined||!Number.isFinite(v)?"—":isGuestRoomOrStay?new Intl.NumberFormat("id-ID",{minimumFractionDigits:2,maximumFractionDigits:2}).format(v):isPercent?fmt(v,1)+"%":isCount?fmt(v,0):isUsd?"$"+fmt(v,2):isRate?fmt(v,2):money(v);
                    return <tr key={line.label} className={i%2?"bg-slate-50":"bg-white"}><th className="sticky left-0 z-[1] w-[240px] min-w-[240px] max-w-[240px] border-t border-slate-200 bg-inherit px-3 py-2 text-left font-semibold whitespace-normal break-words">{line.label}</th>{[line.values[11],...line.values.slice(0,11)].map((v,j)=><td key={j} className="w-[128px] min-w-[128px] max-w-[128px] border-t border-slate-200 px-3 py-2 text-right tabular-nums whitespace-nowrap">{display(v)}</td>)}<td className="w-[180px] min-w-[180px] max-w-[180px] border-t border-slate-200 bg-sky-50 px-3 py-2 text-right font-extrabold tabular-nums whitespace-nowrap">{display(line.total)}</td></tr>;
                  })}</tbody>
                </table>
        </div>
      </section>
      <section className="mt-7 break-before-page print-ten-year-statistics">
        <h3 className="mb-1 text-sm font-extrabold">1B. RINGKASAN STATISTIK 10 TAHUN — {form.yearStart}–{Number(form.yearStart)+9}</h3>
        <p className="mb-3 text-[10px] leading-4 text-slate-600">Ringkasan statistik tahunan dengan struktur kolom yang sama: YEAR 1–10 dan TOTAL / AVG. Menggunakan sumber forecast yang sama, tanpa mengubah input atau rumus forecast.</p>
        <div className="overflow-x-auto"><table className="w-max min-w-[1500px] border-collapse text-[9px]">
          <thead><tr className="bg-indigo-900 text-white"><th className="sticky left-0 z-10 min-w-[240px] bg-indigo-900 px-3 py-2 text-left">Description</th>{form.forecast.annual.map((row,i)=><th key={row.label} className="min-w-[112px] px-2 py-2 text-right">YEAR {i+1}<span className="block text-[8px] font-normal">{row.label}</span></th>)}<th className="min-w-[150px] bg-teal-700 px-2 py-2 text-right">TOTAL / AVG</th></tr></thead>
          <tbody>{annualStatisticsForPreview.map((line,i)=>{const valid=line.values.filter((v):v is number=>v!==null);const total=valid.length?(line.kind==="sum"?valid.reduce((a,b)=>a+b,0):valid.reduce((a,b)=>a+b,0)/valid.length):null;const isGuestRoomOrStay=/^(AVERAGE GUEST \/ ROOM|LENGTH OF STAY)$/i.test(line.label.trim());const display=(v:number|null)=>v===null||v===undefined||!Number.isFinite(v)?"—":isGuestRoomOrStay?new Intl.NumberFormat("id-ID",{minimumFractionDigits:2,maximumFractionDigits:2}).format(v):line.kind==="percent"?fmt(v,1)+"%":line.label==="# OF DAYS"||line.label==="ROOMS AVAILABLE"||line.label==="OCCUPIED ROOMS"?fmt(v,0):money(v);return <tr key={line.label} className={i%2?"bg-slate-50":"bg-white"}><th className="sticky left-0 z-[1] border-t border-slate-200 bg-inherit px-3 py-2 text-left font-semibold">{line.label}</th>{line.values.map((v,j)=><td key={j} className="border-t border-slate-200 px-2 py-2 text-right tabular-nums whitespace-nowrap">{display(v)}</td>)}<td className="border-t border-slate-200 bg-teal-50 px-2 py-2 text-right font-extrabold tabular-nums">{display(total)}</td></tr>;})}</tbody>
        </table></div>
      </section>
      <section className="mt-7 break-before-page print-one-year">
        <h3 className="mb-1 text-sm font-extrabold">2. 1 YEAR CONSOLIDATED — {form.yearStart}</h3>
        <p className="mb-3 text-[10px] leading-4 text-slate-600">Konsolidasi bulanan dari sumber forecast yang sama. Persentase dihitung terhadap basis pendapatan terkait; data yang belum tersedia ditampilkan sebagai —.</p>
        <div className="overflow-x-auto"><table className="w-max min-w-full border-collapse text-[8px]"><thead><tr className="bg-slate-800 text-white"><th className="sticky left-0 z-10 min-w-[180px] bg-slate-800 px-2 py-1.5 text-left">Account / Description</th>{[11,0,1,2,3,4,5,6,7,8,9,10].map(i=><th key={form.forecast.monthly[i].label} className="min-w-[86px] px-1 py-1.5 text-right">{i===11?"DES":monthNames[i].slice(0,3).toUpperCase()}<span className="block font-normal">Value / %</span></th>)}<th className="min-w-[105px] bg-teal-700 px-2 py-1.5 text-right">TOTAL / AVG</th></tr></thead>
        <tbody>{buildConsolidatedRows(consolidatedForm).map((line,i)=>line.kind==="section"?<tr key={line.label}><th colSpan={14} className="border-t border-slate-300 bg-slate-200 px-2 py-1.5 text-left font-black">{line.label}</th></tr>:<tr key={line.label} className={i%2?"bg-slate-50":""}><td className="border-b border-slate-200 px-2 py-1 font-semibold">{line.label}</td>{[11,0,1,2,3,4,5,6,7,8,9,10].map((monthIndex,j)=>{const v=line.values[monthIndex];const base=line.base?.[monthIndex]??null;const pct=base!==null&&base!==0&&v!==null?v/base*100:null;return <td key={j} className="border-b border-slate-200 px-1 py-1 text-right tabular-nums whitespace-nowrap">{v===null||v===undefined?"—":fmt(v,0)}<span className="block text-slate-500">{pct===null?"—":fmt(pct,1)+"%"}</span></td>;})}<td className="border-b border-slate-200 bg-teal-50 px-2 py-1 text-right font-bold tabular-nums">{line.total===null||line.total===undefined?"—":fmt(line.total,0)}<span className="block text-slate-500">{line.totalPct===null||line.totalPct===undefined?"—":fmt(line.totalPct,1)+"%"}</span></td></tr>)}</tbody></table></div>
      </section>
      <section className="mt-7 break-before-page print-ten-year">
        <h3 className="mb-1 text-sm font-extrabold">3. 10 YEARS CONSOLIDATED — {form.yearStart}–{Number(form.yearStart)+9}</h3>
        <p className="mb-3 text-[10px] leading-4 text-slate-600">Year 1 mengikuti sumber forecast tahunan. Year 2–10 mengikuti asumsi proyeksi yang tersimpan; tidak menambahkan akun baru.</p>
        <div className="overflow-x-auto"><table className="w-max min-w-full border-collapse text-[8px]"><thead><tr className="bg-indigo-900 text-white"><th className="sticky left-0 z-10 min-w-[180px] bg-indigo-900 px-2 py-1.5 text-left">Account / Description</th>{form.forecast.annual.map((row,i)=><th key={row.label} className="min-w-[90px] px-1 py-1.5 text-right">YEAR {i+1}<span className="block font-normal">{row.label}</span><span className="block font-normal">Value / %</span></th>)}<th className="min-w-[105px] bg-teal-700 px-2 py-1.5 text-right">TOTAL / AVG</th></tr></thead>
        <tbody>{buildTenYearRows(consolidatedForm).map((line,i)=>line.section?<tr key={line.label}><th colSpan={12} className="border-t border-slate-300 bg-indigo-100 px-2 py-1.5 text-left font-black">{line.label}</th></tr>:<tr key={line.label} className={i%2?"bg-slate-50":""}><td className="border-b border-slate-200 px-2 py-1 font-semibold">{line.label}</td>{line.values.map((v,j)=>{const base=line.base?.[j]??null;const pct=base!==null&&base!==0&&v!==null?v/base*100:null;const canOverride=tenYearMode==="manual"&&j>0&&!!line.inputKey&&line.label!=="TOTAL OPERATING COSTS"&&line.kind!=="percent";const overrideKey=`${i}:${j}`;return <td key={j} className="border-b border-slate-200 px-1 py-1 text-right tabular-nums whitespace-nowrap">{canOverride?<input aria-label={`Manual override ${line.label} year ${j+1}`} title="Isi target nominal; kosongkan untuk kembali ke proyeksi otomatis" type="number" step="any" value={tenYearOverrides[overrideKey]??(v===null?"":String(v))} onChange={e=>setTenYearOverrides(prev=>({...prev,[overrideKey]:e.target.value}))} className="w-[90px] rounded border border-amber-300 bg-amber-50 px-1 py-1 text-right text-xs tabular-nums focus:border-amber-500 focus:outline-none" />:(v===null||v===undefined?"—":fmt(v,0))}<span className="block text-slate-500">{pct===null?"—":fmt(pct,1)+"%"}</span></td>;})}<td className="border-b border-slate-200 bg-teal-50 px-2 py-1 text-right font-bold tabular-nums">{line.total===null||line.total===undefined?"—":fmt(line.total,0)}<span className="block text-slate-500">{line.totalPct===null||line.totalPct===undefined?"—":fmt(line.totalPct,1)+"%"}</span></td></tr>)}</tbody></table></div>
      </section>
      <section className="mt-7 break-before-page print-department-details">
        <h3 className="mb-1 rounded-lg bg-gradient-to-r from-cyan-950 to-blue-800 px-3 py-2 text-sm font-extrabold text-white">5. DETAIL ANGGARAN SEMUA DEPARTEMEN</h3>
        <p className="mb-3 text-[10px] leading-4 text-slate-600">Seluruh rincian mengikuti bagian DEPARTMENT EXPENSES pada tahap input: Room Division, Food & Beverage, Minor Operating Department, Administration & General, Sales & Marketing, Human Resources, serta POMEC & Utilities. PAYROLL & RELATED mengambil nilai dari Master Payroll dan tidak diedit dari laporan ini. Kolom kosong ditampilkan sebagai —.</p>
        {([
          {id:"room",title:"ROOM DIVISION — ROOM DEPT / FRONT OFFICE / HOUSE KEEPING",source:"roomDivisionDetails",groups:[
            {title:"ROOM DEPARTMENT",rows:[["roomRevenue","ROOM REVENUE"]]},
            {title:"FRONT OFFICE & RESERVATION — PAYROLL & RELATED",rows:[["foSalary","SALARY & WAGES"],["foIncomeTax","INCOME TAX"],["foJamsostek","JAMSOSTEK"],["foInsurance","INSURANCE"],["foBonus","PROV. FOR BONUS"],["foMeal","MEAL ALLOWANCES"],["foMedical","MEDICAL / ASKES"],["foOtherPayroll","OTHER PAYROLL COST"]]},
            {title:"FRONT OFFICE & RESERVATION — OTHER EXPENSES",rows:[["foDecoration","DECORATION"],["foDues","DUES & SUBSCRIPTION"],["foEntertainment","ENTERTAINMENT"],["foWelcomeDrink","WELCOME DRINK"],["foLaundry","LAUNDRY - UNIFORM"],["foMisc","MISCELLANEOUS"],["foPostage","POSTAGE"],["foReservation","RESERVATION EXPENSES"],["foGuestSupplies","GUEST SUPPLIES"],["foCleaning","CLEANING SUPPLIES"],["foPrinting","PRINTING & STATIONERY"],["foUniform","UNIFORM"]]},
            {title:"HOUSE KEEPING — PAYROLL & RELATED",rows:[["hkSalary","SALARY & WAGES"],["hkIncomeTax","INCOME TAX"],["hkJamsostek","JAMSOSTEK"],["hkInsurance","INSURANCE"],["hkThr","THR"],["hkMeal","MEAL ALLOWANCES"],["hkMedical","MEDICAL / ASKES"],["hkOtherPayroll","OTHER PAYROLL COST"]]},
            {title:"HOUSE KEEPING — PROV. OPERATING EQUIPMENT",rows:[["hkChina","CHINAWARE"],["hkGlass","GLASSWARE"],["hkSilver","SILVERWARE"],["hkLinen","LINEN"]]},
            {title:"HOUSE KEEPING — OTHER EXPENSES",rows:[["hkDecoration","DECORATION"],["hkWelcomeDrink","WELCOME DRINK"],["hkCable","CABLE VISION"],["hkLaundry","LAUNDRY LINEN"],["hkGuestSupplies","GUEST SUPPLIES"],["hkCleaning","CLEANING SUPPLIES"],["hkAmenities","ROOM AMENITIES"],["hkPrinting","PRINTING & STATIONERY"],["hkUniform","UNIFORM"],["hkInternet","INTERNET PROVIDER"],["hkPest","PEST CONTROL"]]}
          ]},          {id:"fb",title:"FOOD & BEVERAGE — REVENUE / COST OF SALES / PAYROLL / EXPENSES",source:"fbDetails",groups:[{title:"REVENUES",rows:[["foodRevenue","FOOD REVENUE"],["beverageRevenue","BEVERAGE REVENUE"]]},{title:"COST OF SALES",rows:[["foodCost","FOOD COST OF SALES"],["beverageCost","BEVERAGE COST OF SALES"]]},{title:"PAYROLL & RELATED",rows:[["salaryWages","SALARY & WAGES"],["incomeTax","INCOME TAX"],["jamsostek","JAMSOSTEK"],["insurance","INSURANCE"],["thr","THR"],["mealAllowances","MEAL ALLOWANCES"],["medical","MEDICAL / ASKES"],["otherPayroll","OTHER PAYROLL COST"]]},{title:"PROV. OPERATING EQUIPMENT",rows:[["glassware","GLASSWARE"],["chinaware","CHINAWARE"],["silverware","SILVERWARE"],["linen","LINEN"]]},{title:"OTHER EXPENSES",rows:[["decoration","DECORATION"],["duesSubscription","DUES & SUBSCRIPTION"],["extermDisinfectant","EXTERM / DISINFECTANT"],["kitchenFuel","KITCHEN FUEL"],["laundry","LAUNDRY"],["miscellaneous","MISCELLANEOUS"],["spoilage","SPOILAGE"],["cleaningSupplies","CLEANING SUPPLIES"],["guestSupplies","GUEST SUPPLIES"],["printingStationery","PRINTING & STATIONERY"],["telephone","TELEPHONE"],["uniform","UNIFORM"],["utensil","UTENSIL"],["contractCleaning","CONTRACT CLEANING"]]}]},
          {id:"mod",title:"MINOR OPERATING DEPARTMENT — REVENUE / COST / PAYROLL / EXPENSES",source:"modDetails",groups:[{title:"REVENUE",rows:[["businessCenterRevenue","BUSINESS CENTER REVENUE"],["rentCarRevenue","TRANSPORTATION / RENT CAR REVENUE"],["laundryRevenue","LAUNDRY REVENUE"],["spaRevenue","SPA REVENUE"],["telephoneRevenue","TELEPHONE REVENUE"],["sportRecreationRevenue","SPORT & RECREATION REVENUE"],["rentedSpaceRevenue","RENTED SPACE REVENUE"],["miscellaneousRevenue","MISCELLANEOUS OTHER REVENUE"],["otherRevenueDiscounts","OTHER REVENUE DISCOUNTS / ALLOWANCES"]]},{title:"COST OF SALES",rows:[["laundryCost","LAUNDRY COST OF SALES"]]},{title:"PAYROLL & RELATED",rows:[["salaryWages","SALARY & WAGES"],["incomeTax","INCOME TAX"],["jamsostek","JAMSOSTEK"],["insurance","INSURANCE"],["bonus","PROV. FOR BONUS"],["mealAllowances","MEAL ALLOWANCES"],["medical","MEDICAL / ASKES"],["payrollOthers","OTHER PAYROLL COST"]]},{title:"OTHER EXPENSES",rows:[["guestSupplies","GUEST SUPPLIES"],["paperSupplies","PAPER SUPPLIES"],["laundryValetSupplies","LAUNDRY & VALET SUPPLIES"],["laundrySupplies","LAUNDRY SUPPLIES"],["casual","CASUAL"],["cleaningSupplies","CLEANING SUPPLIES"],["printingStationery","PRINTING & STATIONERY"],["decoration","DECORATION"],["telephoneFax","TELEPHONE & FAX"],["laundryExpense","LAUNDRY EXPENSE"],["casualOther","CASUAL — OTHER"],["laundryValetOther","LAUNDRY & VALET SUPPLIES — OTHER"],["cleaningOther","CLEANING SUPPLIES — OTHER"],["provisionUniform","PROVISION UNIFORM"],["pteb","PTEB"],["uniform","UNIFORM"],["otherExpenses","OTHERS"]]}]},
          {id:"ag",title:"ADMINISTRATION & GENERAL — PAYROLL AND GENERAL EXPENSES",source:"agDetails",groups:[{title:"PAYROLL & RELATED",rows:[["salaryWages","SALARY & WAGES"],["incomeTax","INCOME TAX"],["jamsostek","JAMSOSTEK"],["insurance","INSURANCE"],["bonusProvision","PROV. FOR BONUS"],["mealAllowances","MEAL ALLOWANCES"],["medical","MEDICAL / ASKES"],["otherPayroll","OTHER PAYROLL COST"]]},{title:"OTHER EXPENSES",rows:[["bankCharges","BANK CHARGES"],["donation","DONATION"],["duesTradeAssoc","DUES & TRADE ASSOCIATIONS"],["entertainment","ENTERTAINMENT"],["laundryUniforms","LAUNDRY / UNIFORMS"],["postageCourier","POSTAGE & COURIER"],["printingStationery","PRINTING & STATIONERY"],["licenceInspection","LICENCE & INSPECTION"],["transportation","TRANSPORTATION"],["travelling","TRAVELLING"],["telephone","TELEPHONE"],["creditCardCommission","CREDIT CARD COMMISSION"],["companyHousing","COMPANY HOUSING"],["auditBrand","AUDIT BRAND"],["contractService","CONTRACT SERVICE"],["payrollSystem","PAYROLL SYSTEM"],["pmsHotelindo","PMS — HOTELINDO"],["edp","EDP"],["provisionUniform","PROVISION UNIFORM"],["others","OTHERS"]]}]},
          {id:"sm",title:"SALES & MARKETING — PAYROLL AND MARKETING EXPENSES",source:"smDetails",groups:[{title:"PAYROLL & RELATED",rows:[["salaryWages","SALARY & WAGES"],["incomeTax","INCOME TAX"],["jamsostek","JAMSOSTEK"],["insurance","INSURANCE"],["bonusProvision","PROV. FOR BONUS"],["mealAllowances","MEAL ALLOWANCES"],["medical","MEDICAL / ASKES"],["otherPayroll","OTHER PAYROLL COST"]]},{title:"OTHER EXPENSES",rows:[["advertisingPromotion","ADVERTISING & PROMOTION"],["brochureCollateral","BROCHURE / COLLATERAL"],["directMail","DIRECT MAIL"],["duesTradeAssoc","DUES & TRADE ASSOCIATIONS"],["entertainment","ENTERTAINMENT"],["laundryUniforms","LAUNDRY / UNIFORMS"],["groupAdvertising","GROUP ADVERTISING"],["printingStationery","PRINTING & STATIONERY"],["telephone","TELEPHONE"],["salesMarketingFee","SALES & MARKETING FEE"],["photography","PHOTOGRAPHY"],["centralizedPromotionalProgram","CENTRALIZED PROMOTIONAL PROGRAM"],["promotionVipGift","PROMOTION FOR VIP GIFT"],["salesMarketingKits","SALES & MARKETING KITS"],["provisionUniform","PROVISION UNIFORM"],["others","OTHERS"],["transportation","TRANSPORTATION"],["salesCallOutside","SALES CALL OUTSIDE"],["tradeShows","TRADE SHOWS"],["travellingExpenses","TRAVELLING EXPENSES"],["printMediaNewspaper","PRINT MEDIA — NEWSPAPER"],["otherMediaMagazine","OTHER MEDIA — MAGAZINE"]]}]},
          {id:"hrd",title:"HUMAN RESOURCES — PAYROLL AND HR EXPENSES",source:"hrdDetails",groups:[{title:"PAYROLL & RELATED",rows:[["salaryWages","SALARY & WAGES"],["incomeTax","INCOME TAX"],["jamsostek","JAMSOSTEK"],["insurance","INSURANCE"],["bonusProvision","PROV. FOR BONUS"],["mealAllowances","MEAL ALLOWANCES"],["medical","MEDICAL / ASKES"],["otherPayroll","OTHER PAYROLL COST"]]},{title:"OTHER EXPENSES",rows:[["employeeRelation","EMPLOYEE RELATION"],["casual","CASUAL"],["laundryUniforms","LAUNDRY / UNIFORMS"],["postageCourier","POSTAGE & COURIER"],["paperSupplies","PAPER SUPPLIES"],["cleaningSupplies","CLEANING SUPPLIES"],["printingStationery","PRINTING & STATIONERY"],["socialSportActivity","SOCIAL SPORT & ACTIVITY"],["transportation","TRANSPORTATION"],["telephone","TELEPHONE"],["medicalExpenses","MEDICAL EXPENSES"],["trainingEducation","TRAINING & EDUCATION"],["recruitingAdvertisement","RECRUITING & ADVERTISEMENT"],["housePublication","HOUSE PUBLICATION"],["provisionUniform","PROVISION UNIFORM"],["others","OTHERS"]]}]},
          {id:"pomec",title:"POMEC & UTILITIES — MAINTENANCE / ENERGY",source:"pomecDetails",groups:[{title:"PAYROLL & RELATED",rows:[["salaryWages","SALARY & WAGES"],["incomeTax","INCOME TAX"],["jamsostek","JAMSOSTEK"],["insurancePayroll","INSURANCE"],["thr","THR"],["mealAllowances","MEAL ALLOWANCES"],["medical","MEDICAL / ASKES"],["otherPayroll","OTHER PAYROLL COST"]]},{title:"MAINTENANCE EXPENSES",rows:[["paintingDecoration","PAINTING & DECORATION"],["engineeringSupplies","ENGINEERING SUPPLIES & EQUIPMENT"],["bulbsLamp","BULBS & LAMP"],["printingStationery","PRINTING & STATIONERY"],["laundryUniform","LAUNDRY UNIFORM"],["provisionUniform","PROVISION FOR UNIFORM"],["acMaintenance","AC MAINTENANCE"],["buildingMaintenance","BUILDING MAINTENANCE"],["electricityMaintenance","ELECTRICITY MAINTENANCE"],["floorCovering","FLOOR COVERING"],["furnitureFixtureRepair","FURNITURE & FIXTURE REPAIRMENT"],["mechanicalElectricalMaintenance","MECHANICAL & ELECTRICAL MAINTENANCE"],["kitchenEquipmentMaintenance","KITCHEN EQUIPMENT MAINTENANCE"],["refrigeratorMaintenance","REFRIGERATOR MAINTENANCE"],["automobileRepair","AUTOMOBILE REPAIR & SERVICES"],["plumbingHeatingMaintenance","PLUMBING / HEATING MAINTENANCE"],["removalWaste","REMOVAL WASTE"],["others","OTHERS"]]},{title:"UTILITIES / ENERGY",rows:[["electricityConsumed","ELECTRICITY CONSUMED"],["waterConsumed","WATER CONSUMED"],["fuelDieselConsumed","FUEL / DIESEL CONSUMED"]]}]}
        ] as const).map((department,di)=><div key={department.id} className="mb-5 break-inside-auto">
          <h4 className="mb-2 text-[11px] font-black">{String.fromCharCode(65+di)}. {department.title}</h4>
          {department.groups.map(group=><div key={group.title} className="mb-3">
            <p className="bg-slate-200 px-2 py-1 text-[9px] font-black">{group.title}</p>
            <div className="overflow-x-auto"><table className="w-full border-collapse text-[8px]">
              <thead><tr className="bg-slate-800 text-white"><th className="w-[180px] px-2 py-1.5 text-left">Description</th>{form.forecast.monthly.map((month,i)=><th key={month.label} className="px-1 py-1.5 text-right">{monthNames[i].slice(0,3)}</th>)}<th className="bg-teal-700 px-2 py-1.5 text-right">TOTAL</th></tr></thead>
              <tbody>{group.rows.map(([key,label],ri)=>{
                const payrollDept=department.id==="room"?(key.startsWith("fo")?"FO":key.startsWith("hk")?"HK":null):department.id==="fb"?"FB":department.id==="mod"?"MOD":department.id==="ag"?"AG":department.id==="sm"?"SM":department.id==="hrd"?"HRD":"POMEC";
                const isPayroll=payrollInputKey(key);
                const vals=form.forecast.monthly.map((month,i)=>{
                  if(isPayroll&&payrollDept)return optional(payrollValueFor(payrollDept,key));
                  if(department.id==="room"&&key==="roomRevenue")return optional(month.roomDivisionDetails?.roomRevenue||"")??calcMonthly(month,Number(form.yearStart),i,form.statistics.rooms).roomRevenue;
                  return optional(((month[department.source]||{}) as Record<string,string>)[key]||"");
                });
                const total=vals.some(v=>v!==null)?vals.reduce<number>((sum,v)=>sum+(Number(v??0)||0),0):null;
                return <tr key={key} className={ri%2?"bg-slate-50":""}><td className="border-b border-slate-200 px-2 py-1 font-medium">{label}{isPayroll?<span className="ml-1 text-[7px] font-bold text-indigo-700">MASTER PAYROLL</span>:null}</td>{vals.map((v,i)=><td key={i} className="border-b border-slate-200 px-1 py-1 text-right tabular-nums">{v===null?"—":fmt(v,0)}</td>)}<td className="border-b border-slate-200 bg-teal-50 px-2 py-1 text-right font-bold tabular-nums">{total===null?"—":fmt(total,0)}</td></tr>;
              })}</tbody>
            </table></div>
          </div>)}
        </div>)}
      </section>
      <section className="mt-7 break-before-page print-payroll-master">
        <h3 className="mb-1 rounded-lg bg-gradient-to-r from-indigo-950 to-sky-800 px-3 py-2 text-sm font-extrabold text-white">6A. LAPORAN PAYROLL — MASTER PAYROLL (STEP 2)</h3>
        <p className="mb-3 text-[10px] leading-4 text-slate-600">Laporan ini bersumber langsung dari Master Payroll. Nilai bulanan mengikuti perhitungan payroll pada form, sedangkan nilai tahunan merupakan estimasi 12 bulan. Perubahan data karyawan hanya dilakukan melalui Master Payroll.</p>
        <h4 className="mb-2 text-[11px] font-black">A. RINCIAN KARYAWAN &amp; BIAYA PAYROLL</h4>
        <div className="overflow-x-auto"><table className="w-full border-collapse text-[8px]">
          <thead><tr className="bg-slate-800 text-white"><th className="px-2 py-1.5 text-left">Department</th><th className="px-2 py-1.5 text-left">Position</th><th className="px-1 py-1.5 text-right">HC</th><th className="px-1 py-1.5 text-right">Basic / Month</th><th className="px-1 py-1.5 text-right">Medical</th><th className="px-1 py-1.5 text-right">Meal</th><th className="px-1 py-1.5 text-right">THR / Month</th><th className="px-1 py-1.5 text-right">BPJS Company</th><th className="px-1 py-1.5 text-right">Income Tax</th><th className="px-1 py-1.5 text-right">Insurance</th><th className="px-1 py-1.5 text-right">Other</th><th className="px-2 py-1.5 text-right">Monthly Total</th><th className="px-2 py-1.5 text-right">Annual Total</th></tr></thead>
          <tbody>{(form.payrollEmployees||[]).map((emp,i)=>{const c=payrollCalc(emp);const active=payrollHasInputs(emp);const n=(v:string)=>optional(v)??0;return <tr key={emp.id} className={i%2?"bg-slate-50":""}><td className="border-b border-slate-200 px-2 py-1">{emp.department||"—"}</td><td className="border-b border-slate-200 px-2 py-1">{emp.position||"—"}</td><td className="border-b border-slate-200 px-1 py-1 text-right">{active?fmt(c.count,0):"—"}</td><td className="border-b border-slate-200 px-1 py-1 text-right">{active?money(c.basic):"—"}</td><td className="border-b border-slate-200 px-1 py-1 text-right">{active?money(c.medical):"—"}</td><td className="border-b border-slate-200 px-1 py-1 text-right">{active?money(c.meal):"—"}</td><td className="border-b border-slate-200 px-1 py-1 text-right">{money(c.thr)}</td><td className="border-b border-slate-200 px-1 py-1 text-right">{money(c.bpjsCompany)}</td><td className="border-b border-slate-200 px-1 py-1 text-right">{active&&c.hasPtkp?money(c.taxMonth):"—"}</td><td className="border-b border-slate-200 px-1 py-1 text-right">{active?money(c.insurance):"—"}</td><td className="border-b border-slate-200 px-1 py-1 text-right">{active?money(c.other):"—"}</td><td className="border-b border-slate-200 bg-teal-50 px-2 py-1 text-right font-bold">{active?money(c.total):"—"}</td><td className="border-b border-slate-200 bg-teal-50 px-2 py-1 text-right font-bold">{active?money(c.total*12):"—"}</td></tr>;})}
          <tr className="bg-slate-200 font-black"><td colSpan={11} className="border-b border-slate-300 px-2 py-1.5">TOTAL PAYROLL &amp; RELATED EXPENSES</td><td className="border-b border-slate-300 px-2 py-1.5 text-right">{money((form.payrollEmployees||[]).filter(payrollHasInputs).reduce((sum,emp)=>sum+payrollCalc(emp).total,0))}</td><td className="border-b border-slate-300 px-2 py-1.5 text-right">{money((form.payrollEmployees||[]).filter(payrollHasInputs).reduce((sum,emp)=>sum+payrollCalc(emp).total*12,0))}</td></tr>
          </tbody>
        </table></div>
        <h4 className="mb-2 mt-5 text-[11px] font-black">B. RINGKASAN PAYROLL PER DEPARTEMEN</h4>
        <div className="overflow-x-auto"><table className="w-full border-collapse text-[8px]">
          <thead><tr className="bg-indigo-900 text-white"><th className="px-2 py-1.5 text-left">Department</th><th className="px-2 py-1.5 text-right">Headcount</th><th className="px-2 py-1.5 text-right">Monthly Payroll &amp; Expenses</th><th className="px-2 py-1.5 text-right">Annual Payroll &amp; Expenses</th></tr></thead>
          <tbody>{[{id:"FO",label:"Front Office / Room"},{id:"HK",label:"House Keeping"},{id:"FB",label:"Food & Beverage"},{id:"MOD",label:"Minor Operating Department"},{id:"AG",label:"Administration & General"},{id:"SM",label:"Sales & Marketing"},{id:"HRD",label:"Human Resources"},{id:"POMEC",label:"POMEC & Utilities"},{id:"OTHER",label:"Other Departments"}].map((dept,i)=>{const aliases:Record<string,string[]>={FO:["FO","ROOM"],HK:["HK","HOUSE KEEPING","HOUSEKEEPING"],FB:["FB","F&B","FOOD & BEVERAGE"],MOD:["MOD"],AG:["AG","FN"],SM:["SM"],HRD:["HRD","HR"],POMEC:["POMEC","POMEC & UTILITIES","POMEC & UTILITIES MAINTENANCE DAN ENERGI","POMEC & UTILITIES MAINTENANCE AND ENERGY","SEC","SECURITY","ENG","ENGINEERING","SECURITY / ENGINEERING","SECURITY & ENGINEERING"],OTHER:[]};const match=(form.payrollEmployees||[]).filter(emp=>aliases[dept.id].includes(emp.department.trim().toUpperCase())&&payrollHasInputs(emp));const people=dept.id==="OTHER"?(form.payrollEmployees||[]).filter(emp=>![...aliases.FO,...aliases.HK,...aliases.FB,...aliases.MOD,...aliases.AG,...aliases.SM,...aliases.HRD,...aliases.POMEC].includes(emp.department.trim().toUpperCase())&&payrollHasInputs(emp)):match;const total=people.reduce((sum,emp)=>sum+payrollCalc(emp).total,0);return <tr key={dept.id} className={i%2?"bg-slate-50":""}><td className="border-b border-slate-200 px-2 py-1">{dept.label}</td><td className="border-b border-slate-200 px-2 py-1 text-right">{people.length?fmt(people.reduce((sum,emp)=>sum+payrollCalc(emp).count,0),0):"—"}</td><td className="border-b border-slate-200 px-2 py-1 text-right">{people.length?money(total):"—"}</td><td className="border-b border-slate-200 px-2 py-1 text-right font-bold">{people.length?money(total*12):"—"}</td></tr>;})}</tbody>
        </table></div>
        {!(form.payrollEmployees||[]).length?<p className="mt-3 rounded border border-amber-200 bg-amber-50 p-2 text-[9px]">Data Master Payroll belum diisi. Silakan lengkapi Master Payroll agar rincian biaya payroll muncul di laporan.</p>:null}
      </section>
      <section className="mt-7 break-before-page print-owner-expenses">
        <h3 className="mb-1 rounded-lg bg-gradient-to-r from-rose-900 to-violet-800 px-3 py-2 text-sm font-extrabold text-white">6B. LAPORAN EXPENSES & OWNER COST (STEP 2)</h3>
        <p className="mb-3 text-[10px] leading-4 text-slate-600">Rincian biaya owner mengikuti input bulanan. Urutan periode mengikuti form input: Dec, Jan–Nov. Kolom kosong ditampilkan sebagai —.</p>
        {(() => {
          const order=[11,0,1,2,3,4,5,6,7,8,9,10];
          const rows=[
            {key:"otherManagementFee",label:"MANAGEMENT & MARKETING FEES",group:"OTHER EXPENSES"},
            {key:"insuranceGeneral",label:"GENERAL INSURANCE",group:"OTHER EXPENSES"},
            {key:"landLease",label:"LAND LEASE / HOLD",group:"OWNER EXPENSES"},
            {key:"ownerInsurance",label:"OWNER INSURANCE",group:"OWNER EXPENSES"},
            {key:"maintenanceFee",label:"SERVICE CHARGE / MAINTENANCE FEE",group:"OWNER EXPENSES"},
            {key:"ownerOtherExpenses",label:"OTHER OWNER EXPENSES",group:"OWNER EXPENSES"}
          ] as const;
          const value=(i:number,key:string)=>optional(String(form.forecast.monthly[i]?.[key as keyof ForecastMonth]??""));
          const sum=(key:string)=>order.some(i=>value(i,key)!==null)?order.reduce<number>((n,i)=>n+(value(i,key)??0),0):null;
          const groupRows=(group:"OTHER EXPENSES"|"OWNER EXPENSES")=>rows.filter(row=>row.group===group);
          const groupSum=(group:"OTHER EXPENSES"|"OWNER EXPENSES",i:number)=>{const vals=groupRows(group).map(row=>value(i,row.key));return vals.some(v=>v!==null)?vals.reduce<number>((n,v)=>n+(v??0),0):null;};
          const combinedSum=(i:number)=>{const vals=rows.map(row=>value(i,row.key));return vals.some(v=>v!==null)?vals.reduce<number>((n,v)=>n+(v??0),0):null;};
          const annual=(fn:(i:number)=>number|null)=>order.some(i=>fn(i)!==null)?order.reduce<number>((n,i)=>n+(fn(i)??0),0):null;
          const display=(v:number|null)=>v===null?"—":fmt(v,0);
          const subtotal=(label:string,group:"OTHER EXPENSES"|"OWNER EXPENSES"|null)=><tr className="bg-rose-100 font-black"><td className="border-b border-rose-200 px-2 py-1.5">{label}</td>{order.map(i=><td key={i} className="border-b border-rose-200 px-1 py-1.5 text-right tabular-nums">{display(group===null?combinedSum(i):groupSum(group,i))}</td>)}<td className="border-b border-rose-200 px-2 py-1.5 text-right tabular-nums">{display(annual(i=>group===null?combinedSum(i):groupSum(group,i)))}</td></tr>;
          return <div className="overflow-x-auto"><table className="w-full border-collapse text-[8px]">
            <thead><tr className="bg-rose-900 text-white"><th className="px-2 py-1.5 text-left">Account / Description</th>{order.map(i=><th key={i} className="px-1 py-1.5 text-right">{i===11?"Dec":monthNames[i].slice(0,3)}</th>)}<th className="px-2 py-1.5 text-right">TOTAL</th></tr></thead>
            <tbody>
              <tr><td colSpan={14} className="bg-slate-200 px-2 py-1 font-black">OTHER EXPENSES</td></tr>
              {groupRows("OTHER EXPENSES").map(row=><tr key={row.key}><td className="border-b border-slate-200 px-2 py-1">{itemLabel("owner",row.key,row.label)}</td>{order.map(i=><td key={i} className="border-b border-slate-200 px-1 py-1 text-right tabular-nums">{display(value(i,row.key))}</td>)}<td className="border-b border-slate-200 px-2 py-1 text-right font-bold tabular-nums">{display(sum(row.key))}</td></tr>)}
              {subtotal("SUBTOTAL OTHER EXPENSES","OTHER EXPENSES")}
              <tr><td colSpan={14} className="h-2"></td></tr>
              <tr><td colSpan={14} className="bg-slate-200 px-2 py-1 font-black">OWNER EXPENSES</td></tr>
              {groupRows("OWNER EXPENSES").map(row=><tr key={row.key}><td className="border-b border-slate-200 px-2 py-1">{itemLabel("owner",row.key,row.label)}</td>{order.map(i=><td key={i} className="border-b border-slate-200 px-1 py-1 text-right tabular-nums">{display(value(i,row.key))}</td>)}<td className="border-b border-slate-200 px-2 py-1 text-right font-bold tabular-nums">{display(sum(row.key))}</td></tr>)}
              {subtotal("SUBTOTAL OWNER EXPENSES","OWNER EXPENSES")}
              {subtotal("TOTAL OTHER EXPENSES + OWNER EXPENSES",null)}
            </tbody>
          </table></div>;
        })()}
      </section>
      <div className="report-brand-footer mt-6 flex flex-wrap items-center justify-between gap-3 border-t-2 border-sky-800 pt-3 text-[9px] text-slate-500 print:mt-4"><span className="font-bold tracking-wide text-slate-600">CORESTAY ADVISORY · HOTEL BUDGET &amp; P&amp;L</span><span>CONFIDENTIAL · {form.hotelName||"Hotel"} · {form.yearStart}</span></div>
      {orchestrator==="passed"&&<div className="mx-auto mt-5 flex max-w-3xl items-center gap-4 rounded-2xl border-2 border-emerald-600 bg-gradient-to-r from-emerald-50 via-white to-teal-50 p-4 text-emerald-950 print:break-inside-avoid print:border-2 print:border-emerald-700 print:bg-white">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-emerald-600 bg-emerald-100 text-3xl print:bg-white" aria-hidden="true">✓</div>
        <div className="min-w-0 flex-1"><p className="text-[10px] font-black uppercase tracking-[.2em] text-emerald-700 print:text-emerald-900">CORESTAY ADVISORY · VALIDATION SEAL</p><h3 className="mt-1 text-base font-black tracking-wide sm:text-lg">✓ CORESTAY VERIFIED — HOTEL BUDGET</h3><p className="mt-1 text-xs font-semibold">LULUS VALIDASI AKHIR · Pemeriksaan konsistensi data dan perhitungan telah diselesaikan.</p>{summary&&<p className="mt-1 text-[10px] leading-4 text-emerald-800 print:text-slate-700">{summary}</p>}</div>
        <div className="hidden rotate-[-8deg] rounded-lg border-2 border-emerald-600 px-3 py-2 text-center text-[9px] font-black uppercase tracking-widest text-emerald-700 sm:block print:block">PASSED<br/>CORESTAY</div>
      </div>}<div className="mt-6 flex flex-wrap justify-end gap-3 print:hidden"><button type="button" onClick={()=>setPreviewOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold">Kembali ke form</button><button type="button" onClick={downloadExcel} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white">Download Excel (.xlsx)</button><button type="button" onClick={()=>window.print()} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white">Print / Save PDF</button></div>
    </article></div>}

    <style jsx global>{`
      @media print {
        @page { size: A3 landscape; margin: 8mm 7mm 10mm; }
        body { background: #fff !important; color: #111827 !important; font-size: 7pt !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        html, body { width: 100% !important; margin: 0 !important; padding: 0 !important; }
        /* Remove the fixed, scrollable preview overlay from print layout; otherwise browsers clip the report to the modal/viewport. */
        .print-preview-overlay { position: static !important; inset: auto !important; display: block !important; width: 100% !important; height: auto !important; min-height: 0 !important; max-height: none !important; overflow: visible !important; padding: 0 !important; margin: 0 !important; background: transparent !important; }
        /* Keep only the report visible and let the browser paginate the complete document. */
        /* Collapse the application UI while printing; visibility:hidden alone preserves its full layout and creates blank leading pages. Keep only ancestors of the preview and the preview itself in layout. */
        body *:not(:has(.print-preview-overlay)):not(.print-preview-overlay):not(.print-preview-overlay *) { display: none !important; }
        .print-preview-overlay, .print-preview-overlay * { visibility: visible !important; }
        .print-report { position: static !important; inset: auto !important; display: block !important; width: 100% !important; max-width: none !important; height: auto !important; min-height: 0 !important; margin: 0 !important; padding: 0 !important; border-radius: 0 !important; box-shadow: none !important; overflow: visible !important; }
        .print-report section { display: block !important; width: 100% !important; max-width: none !important; overflow: visible !important; }
        .print-report .overflow-x-auto, .print-report .overflow-hidden { overflow: visible !important; }
        .print-statistics, .print-ten-year-statistics, .print-one-year, .print-ten-year, .print-department-details, .print-owner-expenses, .print-payroll-master { break-inside: auto !important; page-break-inside: auto !important; }
        /* Let the browser paginate naturally; forced page breaks can create blank sheets when a prior section ends at a page boundary. */
        .print-ten-year-statistics, .print-one-year, .print-ten-year, .print-department-details, .print-owner-expenses, .print-payroll-master { break-before: auto !important; page-break-before: auto !important; }
        .print-statistics table, .print-ten-year-statistics table, .print-one-year table, .print-ten-year table, .print-department-details table, .print-owner-expenses table, .print-payroll-master table { width: 100% !important; min-width: 0 !important; max-width: 100% !important; table-layout: fixed !important; border-collapse: collapse !important; }
        .print-statistics th:first-child, .print-statistics td:first-child { width: 30mm !important; min-width: 30mm !important; max-width: 30mm !important; }
        .print-one-year th:first-child, .print-one-year td:first-child { width: 27mm !important; min-width: 27mm !important; max-width: 27mm !important; }
        .print-ten-year th:first-child, .print-ten-year td:first-child { width: 34mm !important; min-width: 34mm !important; max-width: 34mm !important; }
        .print-statistics th, .print-statistics td, .print-ten-year-statistics th, .print-ten-year-statistics td { font-size: 5pt !important; padding: 1.2px !important; white-space: normal !important; }
        .print-one-year th, .print-one-year td { font-size: 5pt !important; padding: 1.2px !important; }
        .print-ten-year th, .print-ten-year td { font-size: 5.2pt !important; padding: 1.5px !important; }
        .print-report th, .print-report td { overflow-wrap: anywhere !important; word-break: normal !important; }
        /* Allow long tables to continue across pages instead of clipping or pushing content to extra sheets. */
        .print-report table { break-inside: auto !important; page-break-inside: auto !important; }
        .print-report thead { display: table-header-group !important; }
        .print-report tfoot { display: table-footer-group !important; }
        .print-report tr { break-inside: auto !important; page-break-inside: auto !important; }
        .report-brand-header { background: linear-gradient(110deg,#17365D,#245B8C,#6554B7) !important; color: #fff !important; border-bottom: 3px solid #D5A94D !important; }
        .report-brand-footer { border-top: 2px solid #245B8C !important; color: #475569 !important; }
        .print-statistics th, .print-ten-year-statistics th, .print-one-year th, .print-ten-year th, .print-department-details th, .print-payroll-master th { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        .print-report button { display: none !important; }
        * { box-shadow: none !important; }
      }
    `}</style>
  </main>;
}