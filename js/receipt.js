import { auth, db, collection, addDoc, getDocs, doc, deleteDoc, query, where, orderBy } from './firebase.js';
import { showToast, showLoader, hideLoader, formatCurrency, currentUser, generateId } from './app.js';

const listSection = document.getElementById('listSection');
const makeSection = document.getElementById('makeSection');
const btnToggleView = document.getElementById('btnToggleView');
const pageTitle = document.getElementById('pageTitle');
const rDate = document.getElementById('rDate');
const customerSelect = document.getElementById('customerSelect');
const invoiceRef = document.getElementById('invoiceRef');
const paymentMethod = document.getElementById('paymentMethod');
const amount = document.getElementById('amount');
const notes = document.getElementById('notes');

window.calculateReturn = () => {
    const total = parseFloat(amount.value) || 0;
    const given = parseFloat(document.getElementById('calcAmountGiven').value) || 0;
    const amountReturn = Math.max(0, given - total);
    document.getElementById('lblReturnAmount').textContent = formatCurrency(amountReturn);
};

window.updateFamilyFriendsMode = () => {
    const isMode = document.getElementById('chkFamilyFriends').checked;
    document.getElementById('familyFriendsNote').style.display = isMode ? 'block' : 'none';
};

// Add listener to amount to update return value live
if (amount) {
    amount.addEventListener('input', calculateReturn);
}
const receiptList = document.getElementById('receiptList');

let isMakeMode = false;
let customers = [];
let receipts = [];

auth.onAuthStateChanged(async user => {
    if(user) {
        toggleMode(false);
        try {
            await loadCustomers();
            await loadReceipts();
        } catch(e) {
            console.error("Error loading data", e);
            showToast("Failed to load data", true);
        }
    }
});

function toggleMode(forceMake = null) {
    if (forceMake !== null) isMakeMode = forceMake;
    else isMakeMode = !isMakeMode;
    
    if(isMakeMode) {
        listSection.classList.remove('active-section');
        makeSection.classList.add('active-section');
        btnToggleView.innerHTML = '<i class="fas fa-list"></i>';
        pageTitle.textContent = 'Make Receipt';
        rDate.valueAsDate = new Date();
    } else {
        makeSection.classList.remove('active-section');
        listSection.classList.add('active-section');
        btnToggleView.innerHTML = '<i class="fas fa-plus"></i>';
        pageTitle.textContent = 'Receipts';
    }
}

btnToggleView.addEventListener('click', () => toggleMode());
document.getElementById('fabAdd').addEventListener('click', () => toggleMode(true));

async function loadCustomers() {
    const q = query(collection(db, "customers"), where("userId", "==", currentUser.uid));
    const snap = await getDocs(q);
    customers = [];
    snap.forEach(doc => {
        customers.push({ id: doc.id, ...doc.data() });
    });
    customers.sort((a,b) => (a.name || '').localeCompare(b.name || ''));
    
    customerSelect.innerHTML = '<option value="">-- Choose Customer --</option>';
    customers.forEach(c => {
        let opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = `${c.name} ${c.company ? '- ' + c.company : ''}`;
        customerSelect.appendChild(opt);
    });
}

document.getElementById('receiptForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    if(!customerSelect.value) { showToast("Please select a customer", true); return; }

    const customer = customers.find(c => c.id === customerSelect.value);
    const docData = {
        userId: currentUser.uid,
        receiptNo: generateId('RCT-'),
        date: rDate.value,
        invoiceRef: invoiceRef.value.trim(),
        paymentMethod: paymentMethod.value,
        amount: parseFloat(amount.value) || 0,
        notes: notes.value.trim(),
        customerId: customer.id,
        customerName: customer.name,
        customerCompany: customer.company || '',
        isFamilyFriends: document.getElementById('chkFamilyFriends').checked,
        createdAt: new Date().toISOString()
    };

    showLoader();
    try {
        await addDoc(collection(db, "receipts"), docData);
        showToast("Receipt Generated!");
        loadReceipts();
        document.getElementById('receiptForm').reset();
        document.getElementById('chkFamilyFriends').checked = false;
        document.getElementById('familyFriendsNote').style.display = 'none';
        document.getElementById('lblReturnAmount').textContent = formatCurrency(0);
        document.getElementById('calcAmountGiven').value = '';
        toggleMode(false);
    } catch(err) {
        showToast("Error creating receipt", true);
    } finally { hideLoader(); }
});

// List Logic
async function loadReceipts() {
    const q = query(collection(db, "receipts"), where("userId", "==", currentUser.uid));
    const snap = await getDocs(q);
    receipts = [];
    snap.forEach(doc => { receipts.push({ id: doc.id, ...doc.data() }); });
    receipts.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
    render(receipts);
}

function render(data) {
    receiptList.innerHTML = '';
    if(data.length === 0) {
        receiptList.innerHTML = '<div class="text-center text-muted p-4"><i class="fas fa-money-bill-wave fa-3x mb-3"></i><p>You don\'t have any receipt</p></div>';
        return;
    }

    data.forEach(r => {
        const div = document.createElement('div');
        div.className = 'list-item';
        div.innerHTML = `
            <div class="list-item-content">
                <h4 class="text-danger mb-1">${r.receiptNo} <span class="text-muted fs-6" style="float:right">${r.date}</span></h4>
                <p class="font-weight-bold mb-1">${r.customerName} ${r.invoiceRef ? `<small class="text-muted">(Inv: ${r.invoiceRef})</small>` : ''}</p>
                <p>
                    <span style="font-weight:600;font-size:1.1rem" class="text-success">+ ${formatCurrency(r.amount)}</span>
                    <small class="pl-2">via ${r.paymentMethod}</small>
                </p>
            </div>
            <div class="list-item-actions ml-2">
                <button class="btn btn-sm btn-outline text-danger border-0" onclick="deleteRct('${r.id}')"><i class="fas fa-trash"></i></button>
            </div>
        `;
        receiptList.appendChild(div);
    });
}

document.getElementById('searchInput').addEventListener('input', (e) => {
    const v = e.target.value.toLowerCase();
    const f = receipts.filter(q => 
        q.receiptNo.toLowerCase().includes(v) || q.customerName.toLowerCase().includes(v)
    );
    render(f);
});

window.deleteRct = async (id) => {
    if(confirm("Delete this receipt?")) {
        showLoader();
        try {
            await deleteDoc(doc(db, "receipts", id));
            showToast("Deleted");
            loadReceipts();
        } catch(e) { showToast("Error", true); } finally { hideLoader(); }
    }
};
