import { auth, signOut, onAuthStateChanged, db, getDoc, doc } from './firebase.js';

// Global Auth State
export let currentUser = null;
export let businessData = null;

export function setBusinessData(data) {
    businessData = data;
}

const IN_LOGIN_PAGE = window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/');

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        if (IN_LOGIN_PAGE) {
            window.location.href = 'dashboard.html';
        } else {
            // Load business profile globally as it's needed for PDFs
            try {
                const bDoc = await getDoc(doc(db, "business", user.uid));
                if (bDoc.exists()) {
                    businessData = bDoc.data();
                    
                    // Update Dashboard Welcome Message if exists
                    const welcomeName = document.querySelector('.card.bg-primary.text-white p.mb-0.fs-5');
                    if (welcomeName) {
                        welcomeName.textContent = businessData.name || user.email;
                    }
                }
            } catch (error) {
                console.error("Error loading business info", error);
            }
        }
    } else {
        currentUser = null;
        if (!IN_LOGIN_PAGE) {
            window.location.href = 'index.html';
        }
    }
});

// Logout handler
const btnLogout = document.getElementById('btnLogout');
if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
        if (confirm("Are you sure you want to logout?")) {
            await signOut(auth);
            window.location.href = 'index.html';
        }
    });
}

// Global Theme Handler
const savedTheme = localStorage.getItem('appTheme') || 'light';
if (savedTheme === 'dark') {
    document.body.setAttribute('data-theme', 'dark');
}

document.addEventListener('DOMContentLoaded', () => {
    const header = document.querySelector('.app-header');
    if (header) {
        let themeBtn = document.createElement('button');
        themeBtn.className = 'btn-icon';
        themeBtn.id = 'btnThemeToggle';
        themeBtn.style.marginRight = 'auto'; // pushes it away from right elements if flex is used
        themeBtn.style.marginLeft = '15px';
        themeBtn.title = 'Toggle Dark Mode';
        
        const updateIcon = () => {
            const isDark = document.body.getAttribute('data-theme') === 'dark';
            themeBtn.innerHTML = isDark ? '<i class="fas fa-sun text-warning"></i>' : '<i class="fas fa-moon"></i>';
        };
        
        updateIcon();
        
        themeBtn.addEventListener('click', () => {
            if (document.body.getAttribute('data-theme') === 'dark') {
                document.body.removeAttribute('data-theme');
                localStorage.setItem('appTheme', 'light');
            } else {
                document.body.setAttribute('data-theme', 'dark');
                localStorage.setItem('appTheme', 'dark');
            }
            updateIcon();
        });

        // Group the right-side elements to keep the flexbox layout intact
        const titleEl = header.querySelector('h1');
        let rightDiv = document.getElementById('headerRightGroup');
        if (!rightDiv) {
            rightDiv = document.createElement('div');
            rightDiv.id = 'headerRightGroup';
            rightDiv.style.display = 'flex';
            rightDiv.style.alignItems = 'center';
            rightDiv.style.gap = '5px';

            if (titleEl) {
                let next = titleEl.nextSibling;
                while (next) {
                    let curr = next;
                    next = next.nextSibling;
                    rightDiv.appendChild(curr);
                }
            }
            header.appendChild(rightDiv);
        }

        rightDiv.insertBefore(themeBtn, rightDiv.firstChild);
    }

    // Inject Global Developer Footer if not on the login page
    if (!IN_LOGIN_PAGE && !document.getElementById('globalDevFooter')) {
        let footer = document.createElement('div');
        footer.id = 'globalDevFooter';
        footer.style.textAlign = 'center';
        footer.style.padding = '20px 10px';
        footer.style.marginTop = '40px';
        footer.style.fontSize = '0.85rem';
        footer.style.color = '#888';
        footer.style.borderTop = '1px solid var(--border-color)';
        
        footer.innerHTML = `
            <p style="margin: 0; margin-bottom: 5px;">App developed by <strong style="color:var(--text-primary);">Vignesh</strong></p>
            <p style="margin: 0;"><i class="fas fa-phone-alt" style="font-size: 0.8rem;"></i> Contact: <a href="tel:9360039283" style="color:var(--accent-color); text-decoration:none;">9360039283</a></p>
        `;
        document.body.appendChild(footer);

        // Inject WhatsApp Floating Button with pure SVG to prevent broken icons
        let waBtn = document.createElement('a');
        waBtn.href = "https://wa.me/919360039283";
        waBtn.target = "_blank";
        waBtn.className = "whatsapp-fab";
        waBtn.title = "Contact Developer on WhatsApp";
        waBtn.innerHTML = '<svg viewBox="0 0 24 24" width="30" height="30" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zM12 21.821c-1.673 0-3.313-.448-4.757-1.295l-.34-.2-3.535.927.944-3.447-.22-.349a9.855 9.855 0 01-1.503-5.266c0-5.419 4.411-9.832 9.832-9.832 5.418 0 9.829 4.413 9.829 9.832 0 5.42-4.411 9.83-9.83 9.83H12zm0-21.821C5.372 0 0 5.373 0 12c0 2.125.553 4.192 1.604 6.01L.031 24l6.136-1.61C7.949 23.385 9.944 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/></svg>';
        document.body.appendChild(waBtn);
    }
});

// Global UI Helpers
export function showToast(message, isError = false) {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.style.backgroundColor = isError ? 'var(--danger-color)' : 'var(--success-color)';
    toast.textContent = message;
    
    container.appendChild(toast);
    
    // Trigger reflow
    void toast.offsetWidth;
    
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

export function showLoader() {
    let loader = document.getElementById('globalLoader');
    if (!loader) {
        loader = document.createElement('div');
        loader.id = 'globalLoader';
        loader.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(255,255,255,0.7); z-index:99999; display:flex; justify-content:center; align-items:center; backdrop-filter:blur(2px);';
        loader.innerHTML = '<i class="fas fa-circle-notch fa-spin text-primary" style="font-size:3rem; color:var(--primary-color);"></i>';
        document.body.appendChild(loader);
    }
    
    if(document.body.getAttribute('data-theme') === 'dark') {
        loader.style.background = 'rgba(0,0,0,0.7)';
    } else {
        loader.style.background = 'rgba(255,255,255,0.7)';
    }
    
    loader.style.display = 'flex';

    // Anti-Freeze Safeguard: Unblock screen after 10 seconds if Firebase hangs
    if (window.appLoaderTimeout) clearTimeout(window.appLoaderTimeout);
    window.appLoaderTimeout = setTimeout(() => {
        if (loader.style.display === 'flex') {
            loader.style.display = 'none';
            showToast("Connection timeout! Have you created your Firestore Database?", true);
        }
    }, 10000);
}

export function hideLoader() {
    if (window.appLoaderTimeout) clearTimeout(window.appLoaderTimeout);
    const loader = document.getElementById('globalLoader');
    if (loader) {
        loader.style.display = 'none';
    }
}

export function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR'
    }).format(amount);
}

export function generateId(prefix = '') {
    const date = new Date();
    const year = date.getFullYear().toString().substr(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${prefix}${year}${month}-${random}`;
}
