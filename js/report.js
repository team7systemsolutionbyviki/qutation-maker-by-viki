import { auth, db, collection, getDocs, query, where, orderBy } from './firebase.js';
import { showToast, showLoader, hideLoader, formatCurrency, currentUser } from './app.js';

const startDateEl = document.getElementById('startDate');
const endDateEl = document.getElementById('endDate');
const btnGenerate = document.getElementById('btnGenerate');
const btnThisMonth = document.getElementById('btnThisMonth');
const btnAllTime = document.getElementById('btnAllTime');
const btnExportExcel = document.getElementById('btnExportExcel');

const totalSalesEl = document.getElementById('totalSales');
const totalQuotesEl = document.getElementById('totalQuotes');
const totalCreditEl = document.getElementById('totalCredit');
const totalReceiptsEl = document.getElementById('totalReceipts');
const totalTotalExpensesEl = document.getElementById('totalTotalExpenses');
const reportTableBody = document.getElementById('reportTableBody');
const expenseReportTableBody = document.getElementById('expenseReportTableBody');

let reportData = []; // To hold the combined logs for exporting
let expenseData = []; // To hold the expense logs for exporting

auth.onAuthStateChanged(user => {
    if(user) {
        setThisMonth();
        generateReport();
    }
});

function setThisMonth() {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    
    // adjust to YYYY-MM-DD local
    const yyyy = firstDay.getFullYear();
    const mm = String(firstDay.getMonth() + 1).padStart(2, '0');
    const dd = String(firstDay.getDate()).padStart(2, '0');
    
    const tyyyy = today.getFullYear();
    const tmm = String(today.getMonth() + 1).padStart(2, '0');
    const tdd = String(today.getDate()).padStart(2, '0');

    startDateEl.value = `${yyyy}-${mm}-01`;
    endDateEl.value = `${tyyyy}-${tmm}-${tdd}`;
}

btnThisMonth.addEventListener('click', () => {
    setThisMonth();
    generateReport();
});

btnAllTime.addEventListener('click', () => {
    startDateEl.value = '2000-01-01';
    
    const today = new Date();
    const tyyyy = today.getFullYear();
    const tmm = String(today.getMonth() + 1).padStart(2, '0');
    const tdd = String(today.getDate()).padStart(2, '0');
    endDateEl.value = `${tyyyy}-${tmm}-${tdd}`;
    
    generateReport();
});

btnGenerate.addEventListener('click', generateReport);

async function generateReport() {
    if(!startDateEl.value || !endDateEl.value) {
        showToast("Please select a valid date range.", true);
        return;
    }

    showLoader();
    try {
        const start = startDateEl.value;
        const end = endDateEl.value;
        
        reportData = [];
        expenseData = [];
        let r_sales = 0;
        let r_quotes = 0;
        let r_credit = 0;
        let r_receipts = 0;
        let r_expenses = 0;

        // 1. Fetch Invoices
        const invQ = query(collection(db, "invoices"), where("userId", "==", currentUser.uid));
        const invSnap = await getDocs(invQ);
        const invoices = [];
        invSnap.forEach(d => invoices.push(d.data()));

        // 2. Fetch Quotations
        const qQ = query(collection(db, "quotations"), where("userId", "==", currentUser.uid));
        const qSnap = await getDocs(qQ);
        const quotes = [];
        qSnap.forEach(d => quotes.push(d.data()));

        // 3. Fetch Receipts
        const recQ = query(collection(db, "receipts"), where("userId", "==", currentUser.uid));
        const recSnap = await getDocs(recQ);
        const receipts = [];
        recSnap.forEach(d => receipts.push(d.data()));

        // 4. Fetch Expenses
        const expQ = query(collection(db, "expenses"), where("userId", "==", currentUser.uid));
        const expSnap = await getDocs(expQ);
        const expenses = [];
        expSnap.forEach(d => expenses.push(d.data()));
        
        // --- PROCESS INVOICES ---
        invoices.forEach(inv => {
            const rowDate = inv.date;
            if(rowDate >= start && rowDate <= end) {
                const total = inv.grandTotal || 0;
                r_sales += total;
                
                const paid = inv.amountPaid || 0;
                if(inv.paymentMode === 'Credit' || paid < total) {
                    const balance = total - paid;
                    r_credit += balance;
                }
                
                reportData.push({
                    type: "Invoice",
                    date: rowDate,
                    ref: inv.invoiceNo,
                    customer: inv.customerName,
                    amount: total
                });
            }
        });

        // --- PROCESS QUOTES ---
        quotes.forEach(q => {
            const rowDate = q.date;
            if(rowDate >= start && rowDate <= end) {
                r_quotes++;
            }
        });

        // --- PROCESS RECEIPTS ---
        receipts.forEach(r => {
            const rowDate = r.date;
            if(rowDate >= start && rowDate <= end) {
                const amount = r.amount || 0;
                r_receipts += amount;
            }
        });

        // --- PROCESS EXPENSES ---
        expenses.forEach(ex => {
            const rowDate = ex.date;
            if(rowDate >= start && rowDate <= end) {
                const amount = ex.amount || 0;
                r_expenses += amount;
                expenseData.push({
                    date: rowDate,
                    category: ex.category || 'Other',
                    title: ex.title || 'No Title',
                    amount: amount
                });
            }
        });

        // Update UI Summary
        totalSalesEl.textContent = formatCurrency(r_sales);
        totalQuotesEl.textContent = r_quotes;
        totalCreditEl.textContent = formatCurrency(r_credit);
        totalReceiptsEl.textContent = formatCurrency(r_receipts);
        totalTotalExpensesEl.textContent = formatCurrency(r_expenses);

        // Sort Data by Date Descending
        reportData.sort((a, b) => b.date.localeCompare(a.date));
        expenseData.sort((a, b) => b.date.localeCompare(a.date));

        // Render Sales Table
        reportTableBody.innerHTML = '';
        if(reportData.length === 0) {
            reportTableBody.innerHTML = '<tr><td colspan="4" class="text-center text-muted p-4">No sales found in this date range.</td></tr>';
        } else {
            reportData.forEach(row => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="white-space:nowrap;">${row.date}</td>
                    <td><span class="badge" style="background:var(--primary-color);color:white;font-size:10px;padding:3px 5px;margin-right:5px;">${row.type}</span> <strong>${row.ref}</strong></td>
                    <td>${row.customer}</td>
                    <td style="text-align: right; font-weight: 600;" class="text-success">${formatCurrency(row.amount)}</td>
                `;
                reportTableBody.appendChild(tr);
            });
        }

        // Render Expenses Table
        expenseReportTableBody.innerHTML = '';
        if(expenseData.length === 0) {
            expenseReportTableBody.innerHTML = '<tr><td colspan="4" class="text-center text-muted p-4">No expenses found in this date range.</td></tr>';
        } else {
            expenseData.forEach(row => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="white-space:nowrap;">${row.date}</td>
                    <td><span class="badge" style="background:#8B4513;color:white;font-size:10px;padding:3px 5px;margin-right:5px;">${row.category}</span></td>
                    <td>${row.title}</td>
                    <td style="text-align: right; font-weight: 600; color: #dc3545;">${formatCurrency(row.amount)}</td>
                `;
                expenseReportTableBody.appendChild(tr);
            });
        }

    } catch(err) {
        console.error("Error generating report", err);
        showToast("Error generating report", true);
    } finally {
        hideLoader();
    }
}

// Export to Excel Engine
btnExportExcel.addEventListener('click', () => {
    if(reportData.length === 0 && expenseData.length === 0) {
        showToast("No data to export for this date range.", true);
        return;
    }

    const workbook = XLSX.utils.book_new();

    if(reportData.length > 0) {
        const sData = reportData.map((r, i) => ({
            "S.No": i + 1,
            "Date": r.date,
            "Record Type": r.type,
            "Reference Number": r.ref,
            "Customer Name": r.customer,
            "Total Amount": r.amount
        }));
        const sWS = XLSX.utils.json_to_sheet(sData);
        XLSX.utils.book_append_sheet(workbook, sWS, "Sales Report");
    }

    if(expenseData.length > 0) {
        const eData = expenseData.map((r, i) => ({
            "S.No": i + 1,
            "Date": r.date,
            "Category": r.category,
            "Description": r.title,
            "Amount": r.amount
        }));
        const eWS = XLSX.utils.json_to_sheet(eData);
        XLSX.utils.book_append_sheet(workbook, eWS, "Expenses Report");
    }

    XLSX.writeFile(workbook, `Business_Report_${startDateEl.value}_to_${endDateEl.value}.xlsx`);
});
