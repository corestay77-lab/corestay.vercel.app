#!/usr/bin/env python3
"""Local Playwright + OpenAI smoke test for CoreStay Hotel Budget."""
from __future__ import annotations
import json, os, re, sys
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv
from openai import OpenAI
from playwright.sync_api import Page, TimeoutError as PlaywrightTimeoutError, sync_playwright

load_dotenv()
BASE_URL = os.getenv("CORESTAY_URL", "https://corestay.vercel.app/hotel-budget")
MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
OUT = Path(os.getenv("CORESTAY_TEST_OUTPUT", "test-results"))
OUT.mkdir(parents=True, exist_ok=True)
STAMP = datetime.now().strftime("%Y%m%d-%H%M%S")
REPORT = OUT / f"corestay-ai-audit-{STAMP}.md"
SHOT = OUT / f"corestay-ai-audit-{STAMP}.png"
checks = []

def record(name, status, detail):
    checks.append({"name": name, "status": status, "detail": detail})
    print(f"[{status}] {name}: {detail}")

def fill_label(page: Page, label: str, value: str) -> bool:
    try:
        loc = page.get_by_label(label, exact=False).first
        loc.wait_for(state="visible", timeout=2500)
        loc.fill(value)
        return True
    except Exception:
        return False

def click_button(page: Page, name: str) -> bool:
    loc = page.get_by_role("button", name=re.compile(name, re.I))
    for i in range(loc.count()):
        try:
            item = loc.nth(i)
            if item.is_visible():
                item.click(timeout=2500)
                return True
        except Exception:
            pass
    return False

def idr(n: int) -> str:
    return f"{n:,}".replace(",", ".")

def run(page: Page):
    page.goto(BASE_URL, wait_until="domcontentloaded", timeout=60000)
    page.wait_for_timeout(1800)
    title = page.title()
    body = page.locator("body").inner_text(timeout=15000)
    if ("hotel statistics" not in body.lower() and
        any(x in body.lower() for x in ("sign in", "log in", "masuk ke akun"))):
        record("Akses website", "BLOCKED", "Halaman meminta login. Gunakan sesi/test account yang sah; skrip tidak meminta atau menyimpan kredensial.")
        page.screenshot(path=str(SHOT), full_page=True)
        return {"title": title, "body": body[:18000], "expected": {}, "payroll_row": ""}

    # Step 1 test data lives only in this browser session. No Save/Reset buttons are pressed.
    fields = {
        "Nama hotel": "CoreStay QA Test Hotel",
        "Periode laporan": "Januari – Desember",
        "Tahun awal forecast": "2027",
        "# OF ROOMS": "100",
        "OCCUPANCY (%)": "60",
        "AVERAGE ROOM RATE (ARR)": "500000",
        "AVERAGE GUEST / ROOM": "1.8",
        "LENGTH OF STAY": "2.3",
        "EXCHANGE RATE US $ TO RP": "16000",
    }
    done, missing = [], []
    for label, value in fields.items():
        (done if fill_label(page, label, value) else missing).append(label)
    record("Step 1 — Hotel Profile", "PASS" if len(done) >= 6 and not missing else ("WARN" if len(done) >= 6 else "FAIL"),
           f"Field terisi {len(done)}/{len(fields)}; tidak ditemukan: {', '.join(missing) if missing else 'tidak ada'}.")

    days, rooms, occupancy, arr = 365, 100, 0.60, 500_000
    expected = {
        "room_available_nights": days * rooms,
        "occupied_room_nights": round(days * rooms * occupancy),
        "room_revenue": round(days * rooms * occupancy * arr),
        "revpar": round(arr * occupancy),
    }
    record("Step 1 — baseline independen", "INFO",
           f"Room available {expected['room_available_nights']}; occupied nights {expected['occupied_room_nights']}; "
           f"room revenue {idr(expected['room_revenue'])}; RevPAR {idr(expected['revpar'])}.")

    # Step 2 — Master Payroll test row.
    opened = click_button(page, "Master Payroll")
    if not opened:
        for role in ("tab", "link"):
            try:
                loc = page.get_by_role(role, name=re.compile("Master Payroll", re.I)).first
                if loc.is_visible():
                    loc.click(timeout=2500)
                    opened = True
                    break
            except Exception:
                pass
    if not opened:
        record("Step 2 — navigasi", "FAIL", "Tab/navigasi Master Payroll tidak ditemukan.")
        body = page.locator("body").inner_text()[:22000]
        page.screenshot(path=str(SHOT), full_page=True)
        return {"title": title, "body": body, "expected": expected, "payroll_row": ""}

    if not click_button(page, "Tambah karyawan / posisi"):
        record("Step 2 — form payroll", "FAIL", "Tombol tambah karyawan/posisi tidak ditemukan.")
        body = page.locator("body").inner_text()[:22000]
        page.screenshot(path=str(SHOT), full_page=True)
        return {"title": title, "body": body, "expected": expected, "payroll_row": ""}

    payroll_fields = [
        ("Jumlah staf 1", "1"), ("Jabatan", "QA Test Staff"),
        ("Gaji pokok", "6000000"), ("Medical", "200000"), ("Makan", "300000"),
        ("PTKP tahunan", "54000000"), ("Asuransi perusahaan", "100000"),
        ("Biaya lain perusahaan", "50000"),
    ]
    p_done, p_missing = [], []
    for label, value in payroll_fields:
        (p_done if fill_label(page, label, value) else p_missing).append(label)
    try:
        dept = page.get_by_label("Departemen", exact=True).last
        dept.select_option("FO")
        p_done.append("Departemen")
    except Exception:
        p_missing.append("Departemen")

    basic, medical, meal, insurance, other = 6_000_000, 200_000, 300_000, 100_000, 50_000
    thr = round(basic / 12)
    expected_gross = basic + medical + meal + thr
    expected_total = expected_gross + round(basic * 0.0489) + insurance + other
    expected["payroll_gross"] = expected_gross
    expected["payroll_employer_total"] = expected_total
    row_text = ""
    try:
        row_text = page.locator("input[aria-label='Jabatan']").last.locator("xpath=ancestor::tr[1]").inner_text(timeout=5000)
        record("Payroll gross", "PASS" if idr(expected_gross) in row_text else "FAIL",
               f"Expected {idr(expected_gross)}; teks baris: {row_text[:450]}")
        record("Total biaya perusahaan", "PASS" if idr(expected_total) in row_text else "FAIL",
               f"Expected {idr(expected_total)}; teks baris: {row_text[:450]}")
    except Exception as exc:
        record("Payroll calculations", "FAIL", f"Tidak bisa membaca baris payroll: {exc}")
    record("Step 2 — Master Payroll", "PASS" if len(p_done) >= 7 and not p_missing else "WARN",
           f"Field terisi {len(p_done)}/{len(payroll_fields)+1}; tidak ditemukan: {', '.join(p_missing) if p_missing else 'tidak ada'}.")
    page.screenshot(path=str(SHOT), full_page=True)
    body = page.locator("body").inner_text(timeout=15000)
    return {"title": title, "body": body[:22000], "expected": expected, "payroll_row": row_text}

def ai_review(payload):
    key = os.getenv("OPENAI_API_KEY")
    if not key:
        return "Review AI dilewati karena OPENAI_API_KEY belum diisi. Pemeriksaan Playwright tetap berjalan."
    data = {"url": BASE_URL, "title": payload.get("title"), "expected_calculations": payload.get("expected"),
            "payroll_row_visible_text": payload.get("payroll_row"), "visible_page_text": payload.get("body"),
            "automated_checks": checks}
    response = OpenAI(api_key=key).chat.completions.create(
        model=MODEL, temperature=0,
        messages=[
            {"role":"system","content":"Anda auditor QA aplikasi budgeting hotel. Bandingkan teks UI dengan baseline aritmetika. Jangan mengarang nilai yang tidak terlihat. Pisahkan BUG TERKONFIRMASI, POTENSI MASALAH, dan TIDAK DAPAT DIVERIFIKASI. Jelaskan bukti. Jawab Bahasa Indonesia. Ini hanya smoke test, bukan audit menyeluruh."},
            {"role":"user","content":json.dumps(data, ensure_ascii=False)}
        ])
    return response.choices[0].message.content or "AI tidak memberi review."

def main():
    payload = {"title":"", "body":"", "expected":{}, "payroll_row":""}
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=os.getenv("HEADLESS", "true").lower() != "false")
            context = browser.new_context(viewport={"width":1440,"height":1000}, locale="id-ID")
            page = context.new_page()
            page.set_default_timeout(7000)
            payload = run(page)
            context.close()
            browser.close()
    except Exception as exc:
        record("Runner", "FAIL", f"{type(exc).__name__}: {exc}")
    try:
        review = ai_review(payload)
    except Exception as exc:
        review = f"Review AI gagal: {type(exc).__name__}: {exc}"
    lines = ["# CoreStay AI Tester — Hasil Uji", "",
             f"- Waktu: {datetime.now().astimezone().isoformat(timespec='seconds')}",
             f"- URL: {BASE_URL}", f"- Model AI: {MODEL}", f"- Screenshot: {SHOT.as_posix()}", "",
             "## Pemeriksaan otomatis", ""]
    for c in checks:
        lines.append(f"- **{c['status']} — {c['name']}**: {c['detail']}")
    lines += ["", "## Review AI", "", review, "",
              "> Skrip tidak menekan Simpan, Reset, atau Validasi Akhir. Gunakan akun/lingkungan uji, bukan data operasional produksi.", ""]
    REPORT.write_text("\\n".join(lines), encoding="utf-8")
    print(f"\\nLaporan: {REPORT}\\nScreenshot: {SHOT}\\n\\n{review}")
    return 1 if any(c["status"] == "FAIL" for c in checks) else 0

if __name__ == "__main__":
    sys.exit(main())
