import { auth, db, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, orderBy } from './firebase.js';
import { showToast, showLoader, hideLoader, formatCurrency, currentUser } from './app.js';

let Services = [];
const ServiceListEl = document.getElementById('ServiceList');
const searchInput = document.getElementById('searchInput');
const fabAddService = document.getElementById('fabAddService');
const modal = document.getElementById('ServiceModal');
const closeServiceModal = document.getElementById('closeServiceModal');
const ServiceForm = document.getElementById('ServiceForm');
const btnSync = document.getElementById('btnSync');

auth.onAuthStateChanged(user => {
    if(user) {
        loadServices();
    }
});

async function loadServices() {
    showLoader();
    try {
        const q = query(
            collection(db, "services"), 
            where("userId", "==", currentUser.uid)
        );
        const snap = await getDocs(q);
        
        Services = [];
        snap.forEach(d => Services.push({ id: d.id, ...d.data() }));

        // Manually sort to avoid Firebase composite index requirement error
        Services.sort((a,b) => (a.name || '').localeCompare(b.name || ''));
        
        renderServices(Services);
    } catch(error) {
        console.error("Error loading Services", error);
        showToast("Failed to load Services", true);
    } finally {
        hideLoader();
    }
}

function renderServices(data) {
    ServiceListEl.innerHTML = '';
    if(data.length === 0) {
        ServiceListEl.innerHTML = '<div class="text-center text-muted p-4"><i class="fas fa-box-open fa-3x mb-3"></i><p>No Services found.</p></div>';
        return;
    }
    
    data.forEach(prod => {
        const div = document.createElement('div');
        div.className = 'list-item';
        div.innerHTML = `
            <div class="list-item-content">
                <h4>${prod.name} ${prod.SAC ? `<span class="text-muted fs-6">(SAC: ${prod.SAC})</span>` : ''}</h4>
                <p>
                    <span class="text-success font-weight-bold" style="font-weight:600;">Price: ${formatCurrency(prod.sellingPrice)}</span> 
                    <small>| Unit: ${prod.unit} | GST: ${prod.gstRate}%</small>
                </p>
                ${prod.description ? `<p><small class="text-muted">${prod.description}</small></p>` : ''}
            </div>
            <div class="list-item-actions">
                <button class="action-btn edit" onclick="editService('${prod.id}')"><i class="fas fa-edit"></i></button>
                <button class="action-btn delete" onclick="deleteService('${prod.id}')"><i class="fas fa-trash-alt"></i></button>
            </div>
        `;
        ServiceListEl.appendChild(div);
    });
}

// Search
searchInput.addEventListener('input', (e) => {
    const val = e.target.value.toLowerCase();
    const filtered = Services.filter(p => 
        (p.name && p.name.toLowerCase().includes(val)) || 
        (p.SAC && p.SAC.toLowerCase().includes(val))
    );
    renderServices(filtered);
});

// Modal Actions
fabAddService.addEventListener('click', () => {
    ServiceForm.reset();
    document.getElementById('ServiceId').value = '';
    document.getElementById('modalTitle').textContent = 'Add Service';
    // default select values
    document.getElementById('ServiceUnit').value = 'pcs';
    document.getElementById('gstRate').value = '0';
    modal.style.display = 'flex';
});

closeServiceModal.addEventListener('click', () => {
    modal.style.display = 'none';
});

btnSync.addEventListener('click', loadServices);

// Save form
ServiceForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if(!currentUser || !currentUser.uid) {
        showToast("Session expired, please refresh", true);
        return;
    }

    const id = document.getElementById('ServiceId').value;
    const data = {
        userId: currentUser.uid,
        name: document.getElementById('ServiceName').value.trim(),
        description: document.getElementById('ServiceDesc').value.trim(),
        SAC: document.getElementById('SACCode').value.trim(),
        unit: document.getElementById('ServiceUnit').value,
        purchasePrice: parseFloat(document.getElementById('purchasePrice').value) || 0,
        sellingPrice: parseFloat(document.getElementById('sellingPrice').value) || 0,
        gstRate: parseInt(document.getElementById('gstRate').value) || 0,
        updatedAt: new Date().toISOString()
    };
    
    showLoader();
    try {
        if(id) {
            await updateDoc(doc(db, "Services", id), data);
            showToast("Service updated successfully");
        } else {
            data.createdAt = new Date().toISOString();
            await addDoc(collection(db, "Services"), data);
            showToast("Service added successfully");
        }
        modal.style.display = 'none';
        loadServices();
    } catch(error) {
        console.error("Error saving Service", error);
        showToast("Error saving Service: " + error.message, true);
    } finally {
        hideLoader();
    }
});

window.editService = (id) => {
    const prod = Services.find(p => p.id === id);
    if(prod) {
        document.getElementById('ServiceId').value = prod.id;
        document.getElementById('ServiceName').value = prod.name || '';
        document.getElementById('ServiceDesc').value = prod.description || '';
        document.getElementById('SACCode').value = prod.SAC || '';
        document.getElementById('ServiceUnit').value = prod.unit || 'pcs';
        document.getElementById('purchasePrice').value = prod.purchasePrice || '';
        document.getElementById('sellingPrice').value = prod.sellingPrice || '';
        document.getElementById('gstRate').value = prod.gstRate || '0';
        
        document.getElementById('modalTitle').textContent = 'Edit Service';
        modal.style.display = 'flex';
    }
};

window.deleteService = async (id) => {
    if(confirm("Are you sure you want to delete this Service?")) {
        showLoader();
        try {
            await deleteDoc(doc(db, "Services", id));
            showToast("Service deleted");
            loadServices();
        } catch(error) {
            console.error("Error deleting", error);
            showToast("Error deleting Service", true);
        } finally {
            hideLoader();
        }
    }
};

// --- EXCEL EXPORT & IMPORT ---
document.getElementById('btnExportExcel').addEventListener('click', () => {
    let data;
    if(Services.length === 0) {
        showToast("Exporting Sample Template...");
        data = [{
            "S.No": 1,
            "Service Name": "Sample Service",
            "Description": "Hardware Component",
            "SAC Code": "123456",
            "Unit": "pcs",
            "Purchase Price": 150.00,
            "Selling Price": 299.00,
            "GST Rate (%)": 18
        }];
    } else {
        data = Services.map((p, i) => ({
            "S.No": i + 1,
            "Service Name": p.name || "",
            "Description": p.description || "",
            "SAC Code": p.SAC || "",
            "Unit": p.unit || "pcs",
            "Purchase Price": p.purchasePrice || 0,
            "Selling Price": p.sellingPrice || 0,
            "GST Rate (%)": p.gstRate || 0
        }));
    }

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Services");
    XLSX.writeFile(workbook, "Services_Template.xlsx");
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
            // Mapping generic column names back to Service keys
            const name = row["Service Name"] || row["Name"] || row["name"] || "";
            if(!name.trim()) continue; // Name is required

            const docData = {
                userId: currentUser.uid,
                name: name.trim(),
                description: String(row["Description"] || row["Desc"] || ""),
                SAC: String(row["SAC Code"] || row["SAC"] || ""),
                unit: String(row["Unit"] || "pcs"),
                purchasePrice: parseFloat(row["Purchase Price"] || row["purchase"] || 0),
                sellingPrice: parseFloat(row["Selling Price"] || row["selling"] || row["Price"] || 0),
                gstRate: parseFloat(row["GST Rate (%)"] || row["GST"] || row["gst"] || 0),
                createdAt: new Date().toISOString()
            };

            await addDoc(collection(db, "Services"), docData);
            addedCount++;
        }
        
        showToast(`Successfully imported ${addedCount} Services!`);
        e.target.value = ''; // reset file input
        loadServices();
    } catch (err) {
        console.error(err);
        showToast("Failed to import Excel file", true);
    } finally {
        hideLoader();
    }
});
