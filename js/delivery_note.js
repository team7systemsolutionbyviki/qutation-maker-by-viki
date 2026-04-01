import { auth, db, collection, addDoc, getDocs, doc, deleteDoc, query, where, orderBy } from './firebase.js';
import { showToast, showLoader, hideLoader, currentUser, generateId } from './app.js';

const listSection = document.getElementById('listSection');
const makeSection = document.getElementById('makeSection');
const btnToggleView = document.getElementById('btnToggleView');
const pageTitle = document.getElementById('pageTitle');
const dNumber = document.getElementById('dNumber');
const dDate = document.getElementById('dDate');
const customerSelect = document.getElementById('customerSelect');
const itemsContainer = document.getElementById('itemsContainer');
const dnList = document.getElementById('dnList');

let isMakeMode = false;
let products = [];
let customers = [];
let dns = [];

auth.onAuthStateChanged(async user => {
    if(user) {
        toggleMode(false);
        try {
            await loadCustomers();
            await loadProducts();
            await loadDNs();
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
        pageTitle.textContent = 'Make Delivery Note';
        dNumber.value = generateId('DN-');
        dDate.valueAsDate = new Date();
        if(itemsContainer.children.length === 0) addItemRow();
    } else {
        makeSection.classList.remove('active-section');
        listSection.classList.add('active-section');
        btnToggleView.innerHTML = '<i class="fas fa-plus"></i>';
        pageTitle.textContent = 'Delivery Notes';
    }
}

btnToggleView.addEventListener('click', () => toggleMode());
document.getElementById('fabAdd').addEventListener('click', () => toggleMode(true));

async function loadCustomers() {
    const q = query(collection(db, "customers"), where("userId", "==", currentUser.uid));
    const snap = await getDocs(q);
    customers = [];
    snap.forEach(d => {
        let c = { id: d.id, ...d.data() };
        customers.push(c);
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

async function loadProducts() {
    const q = query(collection(db, "products"), where("userId", "==", currentUser.uid));
    const snap = await getDocs(q);
    products = [];
    snap.forEach(d => { products.push({ id: d.id, ...d.data() }); });
    products.sort((a,b) => (a.name || '').localeCompare(b.name || ''));
}

function addItemRow() {
    const rowId = `row_${Date.now()}`;
    const div = document.createElement('div');
    div.className = 'product-row list-item';
    div.id = rowId;
    
    let options = '<option value="">Select Item</option>';
    products.forEach(p => { options += `<option value="${p.id}">${p.name} (${p.unit})</option>`; });

    div.innerHTML = `
        <div>
            <label class="d-md-none">Product</label>
            <select class="form-control item-select" required>${options}</select>
        </div>
        <div>
            <label class="d-md-none">Qty</label>
            <input type="number" step="1" value="1" class="form-control item-qty" required>
        </div>
        <div>
            <button type="button" class="btn btn-sm btn-danger mt-md-4" onclick="removeRow('${rowId}')"><i class="fas fa-times"></i></button>
        </div>
    `;
    itemsContainer.appendChild(div);
}

document.getElementById('btnAddItemRow').addEventListener('click', addItemRow);
window.removeRow = (id) => document.getElementById(id).remove();

document.getElementById('dnForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    if(!customerSelect.value) { showToast("Select a customer", true); return; }
    
    const rows = document.querySelectorAll('.product-row');
    if(rows.length === 0) { showToast("Add at least one item", true); return; }

    const items = [];
    let hasEmpty = false;
    rows.forEach(row => {
        const sel = row.querySelector('.item-select');
        if(!sel.value) hasEmpty = true;
        
        items.push({
            productId: sel.value,
            name: sel.options[sel.selectedIndex].text,
            qty: parseFloat(row.querySelector('.item-qty').value) || 0
        });
    });

    if(hasEmpty) { showToast("Select products everywhere", true); return; }

    const customer = customers.find(c => c.id === customerSelect.value);
    const docData = {
        userId: currentUser.uid,
        dnNo: dNumber.value,
        date: dDate.value,
        customerId: customer.id,
        customerName: customer.name,
        customerCompany: customer.company || '',
        items: items,
        createdAt: new Date().toISOString()
    };

    showLoader();
    try {
        await addDoc(collection(db, "delivery_notes"), docData);
        showToast("Created!");
        loadDNs();
        document.getElementById('dnForm').reset();
        itemsContainer.innerHTML = '';
        toggleMode(false);
    } catch(err) { showToast("Error creating DN", true); } finally { hideLoader(); }
});

async function loadDNs() {
    const q = query(collection(db, "delivery_notes"), where("userId", "==", currentUser.uid));
    const snap = await getDocs(q);
    dns = [];
    snap.forEach(doc => { dns.push({ id: doc.id, ...doc.data() }); });
    dns.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
    render(dns);
}

function render(data) {
    dnList.innerHTML = '';
    if(data.length === 0) {
        dnList.innerHTML = '<div class="text-center text-muted p-4"><i class="fas fa-truck fa-3x mb-3"></i><p>No delivery notes.</p></div>';
        return;
    }

    data.forEach(dn => {
        const div = document.createElement('div');
        div.className = 'list-item';
        div.innerHTML = `
            <div class="list-item-content">
                <h4 class="text-secondary mb-1">${dn.dnNo} <span class="text-muted fs-6" style="float:right">${dn.date}</span></h4>
                <p class="font-weight-bold mb-0">${dn.customerName} ${dn.customerCompany ? `- ${dn.customerCompany}` : ''}</p>
                <p class="text-muted fs-6 mb-0">${dn.items.length} items</p>
            </div>
            <div class="list-item-actions ml-2">
                <button class="btn btn-sm btn-outline text-danger border-0" onclick="deleteDN('${dn.id}')"><i class="fas fa-trash"></i></button>
            </div>
        `;
        dnList.appendChild(div);
    });
}

document.getElementById('searchInput').addEventListener('input', (e) => {
    const v = e.target.value.toLowerCase();
    const f = dns.filter(q => q.dnNo.toLowerCase().includes(v) || q.customerName.toLowerCase().includes(v));
    render(f);
});

window.deleteDN = async (id) => {
    if(confirm("Delete delivery note?")) {
        showLoader();
        try {
            await deleteDoc(doc(db, "delivery_notes", id));
            showToast("Deleted");
            loadDNs();
        } catch(e) { showToast("Error", true); } finally { hideLoader(); }
    }
};
