import { auth, db, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, orderBy } from './firebase.js';
import { showToast, showLoader, hideLoader, currentUser } from './app.js';

let customers = [];
const customerListEl = document.getElementById('customerList');
const searchInput = document.getElementById('searchInput');
const fabAddCustomer = document.getElementById('fabAddCustomer');
const modal = document.getElementById('customerModal');
const closeCustomerModal = document.getElementById('closeCustomerModal');
const customerForm = document.getElementById('customerForm');
const btnSync = document.getElementById('btnSync');

// Initialize
auth.onAuthStateChanged(user => {
    if(user) {
        loadCustomers();
    }
});

async function loadCustomers() {
    showLoader();
    try {
        const q = query(
            collection(db, "customers"), 
            where("userId", "==", currentUser.uid)
        );
        const snap = await getDocs(q);
        
        customers = [];
        snap.forEach(d => customers.push({ id: d.id, ...d.data() }));

        // Manually sort to avoid Firebase composite index requirement error
        customers.sort((a,b) => (a.name || '').localeCompare(b.name || ''));
        
        renderCustomers(customers);
    } catch(error) {
        console.error("Error loading customers", error);
        showToast("Failed to load customers", true);
    } finally {
        hideLoader();
    }
}

function renderCustomers(data) {
    customerListEl.innerHTML = '';
    if(data.length === 0) {
        customerListEl.innerHTML = '<div class="text-center text-muted p-4"><i class="fas fa-users fa-3x mb-3"></i><p>No customers found.</p></div>';
        return;
    }
    
    data.forEach(cust => {
        const div = document.createElement('div');
        div.className = 'list-item';
        div.innerHTML = `
            <div class="list-item-content">
                <h4>${cust.name} ${cust.company ? `<span class="text-muted fs-6">(${cust.company})</span>` : ''}</h4>
                <p><i class="fas fa-phone-alt mr-2 text-primary"></i> ${cust.phone}</p>
                ${cust.gst ? `<p><small>GST: ${cust.gst}</small></p>` : ''}
            </div>
            <div class="list-item-actions">
                <button class="action-btn edit" onclick="editCustomer('${cust.id}')"><i class="fas fa-edit"></i></button>
                <button class="action-btn delete" onclick="deleteCustomer('${cust.id}')"><i class="fas fa-trash-alt"></i></button>
            </div>
        `;
        customerListEl.appendChild(div);
    });
}

// Search
searchInput.addEventListener('input', (e) => {
    const val = e.target.value.toLowerCase();
    const filtered = customers.filter(c => 
        (c.name && c.name.toLowerCase().includes(val)) || 
        (c.company && c.company.toLowerCase().includes(val)) || 
        (c.phone && c.phone.includes(val))
    );
    renderCustomers(filtered);
});

// Modal Logic
fabAddCustomer.addEventListener('click', () => {
    customerForm.reset();
    document.getElementById('customerId').value = '';
    document.getElementById('modalTitle').textContent = 'Add Customer';
    modal.style.display = 'flex';
});

closeCustomerModal.addEventListener('click', () => {
    modal.style.display = 'none';
});

btnSync.addEventListener('click', loadCustomers);

// Form Submit (Add or Edit)
customerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('customerId').value;
    const data = {
        userId: currentUser.uid,
        name: document.getElementById('customerName').value.trim(),
        company: document.getElementById('companyName').value.trim(),
        phone: document.getElementById('customerPhone').value.trim(),
        email: document.getElementById('customerEmail').value.trim(),
        address: document.getElementById('customerAddress').value.trim(),
        gst: document.getElementById('customerGST').value.trim(),
        updatedAt: new Date().toISOString()
    };
    
    showLoader();
    try {
        if(id) {
            // Edit
            await updateDoc(doc(db, "customers", id), data);
            showToast("Customer updated successfully");
        } else {
            // Add
            data.createdAt = new Date().toISOString();
            await addDoc(collection(db, "customers"), data);
            showToast("Customer added successfully");
        }
        modal.style.display = 'none';
        loadCustomers();
    } catch(error) {
        console.error("Error saving customer", error);
        showToast("Error saving customer", true);
    } finally {
        hideLoader();
    }
});

// Expose functions to window for inline onclick attributes
window.editCustomer = (id) => {
    const cust = customers.find(c => c.id === id);
    if(cust) {
        document.getElementById('customerId').value = cust.id;
        document.getElementById('customerName').value = cust.name || '';
        document.getElementById('companyName').value = cust.company || '';
        document.getElementById('customerPhone').value = cust.phone || '';
        document.getElementById('customerEmail').value = cust.email || '';
        document.getElementById('customerAddress').value = cust.address || '';
        document.getElementById('customerGST').value = cust.gst || '';
        
        document.getElementById('modalTitle').textContent = 'Edit Customer';
        modal.style.display = 'flex';
    }
};

window.deleteCustomer = async (id) => {
    if(confirm("Are you sure you want to delete this customer?")) {
        showLoader();
        try {
            await deleteDoc(doc(db, "customers", id));
            showToast("Customer deleted");
            loadCustomers();
        } catch(error) {
            console.error("Error deleting", error);
            showToast("Error deleting customer", true);
        } finally {
            hideLoader();
        }
    }
};

// --- EXCEL EXPORT & IMPORT ---
document.getElementById('btnExportExcel').addEventListener('click', () => {
    let data;
    if(customers.length === 0) {
        // Export empty template
        data = [{
            "S.No": 1,
            "Name": "Sample Name",
            "Company": "Sample Company Pvt Ltd",
            "Phone": "9876543210",
            "Email": "sample@email.com",
            "Address": "123 Sample Street",
            "GSTIN": "22AAAAA0000A1Z5"
        }];
        showToast("Exporting Sample Template...");
    } else {
        data = customers.map((c, i) => ({
            "S.No": i + 1,
            "Name": c.name || "",
            "Company": c.company || "",
            "Phone": c.phone || "",
            "Email": c.email || "",
            "Address": c.address || "",
            "GSTIN": c.gst || ""
        }));
    }

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Customers");
    XLSX.writeFile(workbook, "Customers_Template.xlsx");
});

document.getElementById('importExcelInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if(!file) return;

    showLoader();
    try {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);

        if(json.length === 0) {
            showToast("Excel file is empty", true);
            hideLoader();
            return;
        }

        let addedCount = 0;
        for (const row of json) {
            const name = row["Name"] || row["name"] || row["Customer Name"] || "";
            if(!name.trim()) continue; // Name is required

            const docData = {
                userId: currentUser.uid,
                name: name.trim(),
                company: String(row["Company"] || row["company"] || ""),
                phone: String(row["Phone"] || row["phone"] || row["Mobile"] || ""),
                email: String(row["Email"] || row["email"] || ""),
                address: String(row["Address"] || row["address"] || ""),
                gst: String(row["GSTIN"] || row["GST"] || row["gst"] || ""),
                createdAt: new Date().toISOString()
            };

            await addDoc(collection(db, "customers"), docData);
            addedCount++;
        }
        
        showToast(`Successfully imported ${addedCount} customers!`);
        e.target.value = ''; // reset
        loadCustomers();
    } catch (err) {
        console.error(err);
        showToast("Failed to import Excel file", true);
    } finally {
        hideLoader();
    }
});
