import { auth, db, collection, addDoc, getDocs, doc, deleteDoc, updateDoc, query, where, orderBy } from './firebase.js';
import { showToast, showLoader, hideLoader, formatCurrency, currentUser } from './app.js';

const listSection = document.getElementById('listSection');
const makeSection = document.getElementById('makeSection');
const btnToggleView = document.getElementById('btnToggleView');
const pageTitle = document.getElementById('pageTitle');
const expenseForm = document.getElementById('expenseForm');
const expenseList = document.getElementById('expenseList');
const searchInput = document.getElementById('searchInput');
const fabAdd = document.getElementById('fabAdd');
const totalExpensesEl = document.getElementById('totalExpenses');

let isMakeMode = false;
let expenses = [];
let editingId = null;

// Initialize
auth.onAuthStateChanged(async user => {
    if(user) {
        showLoader();
        try {
            await loadExpenses();
        } catch(e) {
            console.error("Error loading expenses", e);
            showToast("Failed to load data", true);
        }
        hideLoader();
    }
});

function toggleMode(forceMake = null) {
    if (forceMake !== null) isMakeMode = forceMake;
    else isMakeMode = !isMakeMode;
    
    if(isMakeMode) {
        listSection.style.display = 'none';
        makeSection.style.display = 'block';
        btnToggleView.innerHTML = '<i class="fas fa-list"></i>';
        pageTitle.textContent = editingId ? 'Edit Expense' : 'Add Expense';
        
        if (!editingId) {
            expenseForm.reset();
            document.getElementById('eDate').valueAsDate = new Date();
        }
        fabAdd.style.display = 'none';
    } else {
        editingId = null;
        makeSection.style.display = 'none';
        listSection.style.display = 'block';
        btnToggleView.innerHTML = '<i class="fas fa-plus"></i>';
        pageTitle.textContent = 'Expenses';
        fabAdd.style.display = 'flex';
    }
}

btnToggleView.addEventListener('click', () => toggleMode());
fabAdd.addEventListener('click', () => {
    editingId = null;
    toggleMode(true);
});

async function loadExpenses() {
    const q = query(
        collection(db, "expenses"), 
        where("userId", "==", currentUser.uid)
    );
    const snap = await getDocs(q);
    expenses = [];
    snap.forEach(doc => { expenses.push({ id: doc.id, ...doc.data() }); });
    
    // Manual sort by date descending
    expenses.sort((a,b) => new Date(b.date) - new Date(a.date));
    
    renderExpenses(expenses);
    updateTotal(expenses);
}

function renderExpenses(data) {
    expenseList.innerHTML = '';
    if(data.length === 0) {
        expenseList.innerHTML = '<div class="text-center text-muted p-4"><i class="fas fa-wallet fa-3x mb-3"></i><p>No expenses recorded yet.</p></div>';
        return;
    }

    data.forEach(ex => {
        const div = document.createElement('div');
        div.className = 'list-item';
        div.innerHTML = `
            <div class="list-item-content">
                <h4 style="color: #8B4513; margin-bottom: 2px;">${ex.title}</h4>
                <p class="mb-1"><span class="badge" style="background:#f3f3f3; color:#555; padding:2px 8px; border-radius:4px;">${ex.category}</span> <small class="text-muted ml-2">${ex.date}</small></p>
                <div style="font-weight:700; font-size:1.1rem;">${formatCurrency(ex.amount)}</div>
                ${ex.notes ? `<p class="small text-muted mt-1">${ex.notes}</p>` : ''}
            </div>
            <div class="list-item-actions ml-2" style="display:flex; flex-direction:column; gap:8px;">
                <button class="btn btn-sm btn-outline" onclick="window.editExpense('${ex.id}')"><i class="fas fa-edit text-info"></i></button>
                <button class="btn btn-sm btn-outline text-danger border-0" onclick="window.deleteExpense('${ex.id}')"><i class="fas fa-trash"></i></button>
            </div>
        `;
        expenseList.appendChild(div);
    });
}

function updateTotal(data) {
    const total = data.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    totalExpensesEl.textContent = formatCurrency(total);
}

searchInput.addEventListener('input', (e) => {
    const v = e.target.value.toLowerCase();
    const f = expenses.filter(ex => 
        ex.title.toLowerCase().includes(v) || 
        ex.category.toLowerCase().includes(v) ||
        (ex.notes && ex.notes.toLowerCase().includes(v))
    );
    renderExpenses(f);
    updateTotal(f);
});

expenseForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const data = {
        date: document.getElementById('eDate').value,
        category: document.getElementById('eCategory').value,
        title: document.getElementById('eTitle').value.trim(),
        amount: parseFloat(document.getElementById('eAmount').value) || 0,
        paymentMethod: document.getElementById('ePaymentMethod').value,
        notes: document.getElementById('eNotes').value.trim(),
        updatedAt: new Date().toISOString()
    };

    showLoader();
    try {
        if (editingId) {
            await updateDoc(doc(db, "expenses", editingId), data);
            showToast("Expense updated!");
        } else {
            data.userId = currentUser.uid;
            data.createdAt = new Date().toISOString();
            await addDoc(collection(db, "expenses"), data);
            showToast("Expense recorded!");
        }
        await loadExpenses();
        toggleMode(false);
    } catch(err) {
        console.error(err);
        showToast("Error saving expense", true);
    } finally {
        hideLoader();
    }
});

window.editExpense = (id) => {
    const ex = expenses.find(x => x.id === id);
    if (!ex) return;
    
    editingId = id;
    toggleMode(true);
    
    document.getElementById('eDate').value = ex.date;
    document.getElementById('eCategory').value = ex.category;
    document.getElementById('eTitle').value = ex.title;
    document.getElementById('eAmount').value = ex.amount;
    document.getElementById('ePaymentMethod').value = ex.paymentMethod || 'Cash';
    document.getElementById('eNotes').value = ex.notes || '';
};

window.deleteExpense = async (id) => {
    if(confirm("Delete this expense record?")) {
        showLoader();
        try {
            await deleteDoc(doc(db, "expenses", id));
            showToast("Record deleted");
            await loadExpenses();
        } catch(e) {
            showToast("Error deleting", true);
        } finally {
            hideLoader();
        }
    }
};
