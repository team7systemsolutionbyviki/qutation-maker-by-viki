import { auth, db, collection, addDoc, getDocs, doc, getDoc, updateDoc, deleteDoc, setDoc, storage, ref, uploadBytesResumable, getDownloadURL, query, where, orderBy } from './firebase.js';
import { showToast, showLoader, hideLoader, currentUser, setBusinessData } from './app.js';

let profiles = [];
const businessList = document.getElementById('businessList');
const businessForm = document.getElementById('businessForm');
const listSection = document.getElementById('listSection');
const formSection = document.getElementById('formSection');
const btnToggleView = document.getElementById('btnToggleView');
const toggleIcon = document.getElementById('toggleIcon');
const fabAdd = document.getElementById('fabAdd');

const logoContainer = document.getElementById('logoContainer');
const logoUpload = document.getElementById('logoUpload');
const logoImg = document.getElementById('logoImg');
const logoPlaceholder = document.getElementById('logoPlaceholder');

let logoFile = null;

auth.onAuthStateChanged(async (user) => {
    if (user) {
        await loadProfiles();
    }
});

function toggleView(forceList = false) {
    if (forceList || formSection.classList.contains('active-section')) {
        formSection.classList.remove('active-section');
        listSection.classList.add('active-section');
        toggleIcon.className = 'fas fa-plus';
    } else {
        listSection.classList.remove('active-section');
        formSection.classList.add('active-section');
        toggleIcon.className = 'fas fa-times';
    }
}

btnToggleView.addEventListener('click', () => {
    if (listSection.classList.contains('active-section')) {
        resetForm();
    }
    toggleView();
});
fabAdd.addEventListener('click', () => {
    resetForm();
    toggleView();
});

function resetForm() {
    businessForm.reset();
    document.getElementById('profileId').value = '';
    document.getElementById('logoUrl').value = '';
    logoImg.src = '';
    logoImg.style.display = 'none';
    logoPlaceholder.style.display = 'inline-block';
    logoFile = null;
}

async function loadProfiles() {
    showLoader();
    try {
        const q = query(collection(db, "business_profiles"), where("userId", "==", currentUser.uid));
        const snap = await getDocs(q);

        profiles = [];
        snap.forEach(d => profiles.push({ id: d.id, ...d.data() }));

        // Manually sort to avoid Firebase composite index requirement error
        profiles.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        // Legacy Support: If empty, check if they have a legacy profile in doc(db, "business", uid)
        if (profiles.length === 0) {
            const legSnap = await getDoc(doc(db, "business", currentUser.uid));
            if (legSnap.exists()) {
                const legData = legSnap.data();
                legData.isDefault = true;
                legData.createdAt = new Date().toISOString();
                const newProfRef = await addDoc(collection(db, "business_profiles"), legData);
                legData.id = newProfRef.id;
                profiles.push(legData);
            }
        } else {
            // Sanitize: enforce exactly ONE default profile 
            let defaultCount = 0;
            for (let i = 0; i < profiles.length; i++) {
                if (profiles[i].isDefault) {
                    defaultCount++;
                    if (defaultCount > 1) {
                        profiles[i].isDefault = false;
                        updateDoc(doc(db, "business_profiles", profiles[i].id), { isDefault: false });
                    }
                }
            }
            if (defaultCount === 0) {
                profiles[0].isDefault = true;
                updateDoc(doc(db, "business_profiles", profiles[0].id), { isDefault: true });
                setDoc(doc(db, "business", currentUser.uid), profiles[0]);
            }
        }

        renderProfiles(profiles);
    } catch (err) {
        console.error("Error loading business profiles:", err);
        showToast("Error loading profiles", true);
    } finally {
        hideLoader();
    }
}

function renderProfiles(data) {
    businessList.innerHTML = '';
    if (data.length === 0) {
        businessList.innerHTML = '<div class="text-center text-muted p-4">You have no business profiles. Click + to add one.</div>';
        return;
    }

    data.forEach(p => {
        const div = document.createElement('div');
        div.className = `list-item ${p.isDefault ? 'border-primary shadow-sm' : ''}`;
        div.innerHTML = `
            <div class="list-item-content">
                <h4 class="mb-1">
                    ${p.name} 
                    ${p.isDefault ? '<span class="badge" style="background:var(--primary-color);color:#fff;font-size:10px;padding:3px 6px;border-radius:3px;vertical-align:middle;margin-left:5px;">DEFAULT</span>' : ''}
                </h4>
                <p class="mb-1"><small>${p.owner ? p.owner + ' | ' : ''}${p.phone}</small></p>
                ${p.gst ? `<p class="mb-0" style="font-size:11px;color:#666;">GST: ${p.gst}</p>` : ''}
            </div>
            <div class="list-item-actions d-flex flex-column" style="gap:10px;">
                ${!p.isDefault ? `<button class="btn btn-sm btn-outline text-success border-success" onclick="makeDefault('${p.id}')">Set Default</button>` : ''}
                <div class="d-flex justify-content-end" style="gap:5px;">
                    <button class="action-btn edit" onclick="editProfile('${p.id}')"><i class="fas fa-edit"></i></button>
                    ${!p.isDefault ? `<button class="action-btn delete" onclick="deleteProfile('${p.id}')"><i class="fas fa-trash"></i></button>` : ''}
                </div>
            </div>
        `;
        businessList.appendChild(div);
    });
}

window.makeDefault = async (id) => {
    showLoader();
    try {
        const prof = profiles.find(x => x.id === id);
        if (!prof) return;

        // 1. Unset old default
        for (let p of profiles) {
            if (p.isDefault) {
                await updateDoc(doc(db, "business_profiles", p.id), { isDefault: false });
            }
        }

        // 2. Set new default
        await updateDoc(doc(db, "business_profiles", id), { isDefault: true });

        // 3. Mirror the default profile into the global legacy `business` doc so the entire app immediately works without breaking changes!
        prof.isDefault = true;
        await setDoc(doc(db, "business", currentUser.uid), prof);

        showToast(`"${prof.name}" is now the active default!`);
        import('./app.js').then(module => {
            if (module.setBusinessData) { module.setBusinessData(prof); }
        });

        await loadProfiles();
    } catch (err) {
        console.error(err);
        showToast("Error changing default", true);
    } finally {
        hideLoader();
    }
};

window.editProfile = (id) => {
    const p = profiles.find(x => x.id === id);
    if (p) {
        resetForm();
        document.getElementById('profileId').value = p.id;
        document.getElementById('bizName').value = p.name || '';
        document.getElementById('bizOwner').value = p.owner || '';
        document.getElementById('bizPhone').value = p.phone || '';
        document.getElementById('bizEmail').value = p.email || '';
        document.getElementById('bizAddress').value = p.address || '';
        document.getElementById('bizGST').value = p.gst || '';
        document.getElementById('bizUPI').value = p.upi || '';
        document.getElementById('bizSignature').value = p.signature || '';

        if (p.logoUrl) {
            document.getElementById('logoUrl').value = p.logoUrl;
            logoImg.src = p.logoUrl;
            logoImg.style.display = 'block';
            logoPlaceholder.style.display = 'none';
        }
        toggleView();
    }
};

window.deleteProfile = async (id) => {
    if (confirm("Delete this business profile forever?")) {
        await deleteDoc(doc(db, "business_profiles", id));
        loadProfiles();
    }
};

logoContainer.addEventListener('click', () => logoUpload.click());
logoUpload.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
        logoFile = e.target.files[0];
        const reader = new FileReader();
        reader.onload = function (evt) {
            logoImg.src = evt.target.result;
            logoImg.style.display = 'block';
            logoPlaceholder.style.display = 'none';
        }
        reader.readAsDataURL(logoFile);
    }
});

businessForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoader();
    try {
        let currentLogoUrl = document.getElementById('logoUrl').value;
        if (logoFile) {
            // Bypass Firebase Storage completely to avoid "Upgrade Project" billing
            // Store the logo directly inside the Firestore Database as a Base64 string!
            currentLogoUrl = logoImg.src;
        }

        const isFirst = profiles.length === 0;
        const id = document.getElementById('profileId').value;

        const data = {
            userId: currentUser.uid,
            name: document.getElementById('bizName').value.trim(),
            owner: document.getElementById('bizOwner').value.trim(),
            phone: document.getElementById('bizPhone').value.trim(),
            email: document.getElementById('bizEmail').value.trim(),
            address: document.getElementById('bizAddress').value.trim(),
            gst: document.getElementById('bizGST').value.trim(),
            upi: document.getElementById('bizUPI').value.trim(),
            signature: document.getElementById('bizSignature').value.trim(),
            logoUrl: currentLogoUrl,
            updatedAt: new Date().toISOString()
        };

        if (id) {
            await updateDoc(doc(db, "business_profiles", id), data);

            const prof = profiles.find(x => x.id === id);
            if (prof && prof.isDefault) {
                // Keep mirrored doc in sync
                await setDoc(doc(db, "business", currentUser.uid), { ...data, isDefault: true });
            }
            showToast("Profile Updated!");
        } else {
            data.createdAt = new Date().toISOString();
            if (isFirst) data.isDefault = true;

            const newRef = await addDoc(collection(db, "business_profiles"), data);

            if (isFirst) {
                await setDoc(doc(db, "business", currentUser.uid), data);
            }
            showToast("New Profile Added!");
        }

        toggleView(true);
        loadProfiles();
    } catch (err) {
        console.error(err);
        showToast("Error saving profile", true);
    } finally {
        hideLoader();
    }
});
