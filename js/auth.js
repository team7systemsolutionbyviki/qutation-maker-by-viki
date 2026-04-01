import { auth, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, onAuthStateChanged, db, doc, setDoc } from './firebase.js';

const loginForm = document.getElementById('loginForm');
const toggleSignup = document.getElementById('toggleSignup');
let isLogin = true;

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const btn = loginForm.querySelector('button');
        
        try {
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
            btn.disabled = true;
            
            if (isLogin) {
                // Login
                await signInWithEmailAndPassword(auth, email, password);
                window.location.href = 'dashboard.html';
            } else {
                // Sign Up
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                
                // create initial user profile doc but DO NOT await it, 
                // so if Firestore isn't fully set up yet by the user, the app doesn't hang forever
                setDoc(doc(db, "users", userCredential.user.uid), {
                    email: email,
                    role: 'admin',
                    createdAt: new Date().toISOString()
                }).catch(e => console.error("Firestore not ready yet", e));
                
                alert('Account created successfully!');
                window.location.href = 'dashboard.html';
            }
        } catch (error) {
            console.error("Auth Error:", error);
            alert("Error: " + error.message);
        } finally {
            btn.innerHTML = isLogin ? 'Login' : 'Sign Up';
            btn.disabled = false;
        }
    });
}

if (toggleSignup) {
    toggleSignup.addEventListener('click', (e) => {
        e.preventDefault();
        isLogin = !isLogin;
        
        const btn = loginForm.querySelector('button');
        const heading = document.querySelector('.login-card h2');
        
        if (isLogin) {
            btn.textContent = 'Login';
            heading.textContent = 'Team7 System Solution';
            toggleSignup.textContent = 'Sign Up';
            toggleSignup.parentElement.childNodes[0].nodeValue = "Don't have an account? ";
        } else {
            btn.textContent = 'Sign Up';
            heading.textContent = 'Create Account';
            toggleSignup.textContent = 'Login';
            toggleSignup.parentElement.childNodes[0].nodeValue = "Already have an account? ";
        }
    });
}

// Global Auth State Observer (if not on index.html)
if (!window.location.pathname.includes('index.html') && !window.location.pathname.endsWith('/')) {
    onAuthStateChanged(auth, (user) => {
        if (!user) {
            window.location.href = 'index.html';
        }
    });
}

// Forgot Password Logic
const btnForgotPassword = document.getElementById('btnForgotPassword');
if (btnForgotPassword) {
    btnForgotPassword.addEventListener('click', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value.trim();
        
        if (!email) {
            alert("Please enter your email address in the Email field first!");
            return;
        }

        try {
            await sendPasswordResetEmail(auth, email);
            alert("Password reset email sent! Check your inbox.");
        } catch (error) {
            console.error("Reset Error:", error);
            alert("Error: " + error.message);
        }
    });
}
