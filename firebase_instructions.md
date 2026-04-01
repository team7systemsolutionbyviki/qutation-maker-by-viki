# How to Set Up Firebase for Team7 System Solution

Follow these step-by-step instructions to create your Firebase project and connect it to this application.

## Step 1: Create a Firebase Project
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Sign in with your Google account.
3. Click on **Add project** (or **Create a project**).
4. Enter a project name (e.g., "Team7 System Solution").
5. Disable Google Analytics for now (it's not needed for this app) and click **Create project**.
6. Wait for the project to be created, then click **Continue**.

## Step 2: Register Your Web App
1. In the Firebase console overview page, click the **Web icon (`</>`)** in the center of the screen to add an app.
2. Enter an app nickname (e.g., "Team7 Web App").
3. Leave "Also set up Firebase Hosting" unchecked for now.
4. Click **Register app**.
5. You will see a block of code containing your `firebaseConfig` object. It looks like this:
   ```javascript
   const firebaseConfig = {
     apiKey: "AIzaSyDoX...",
     authDomain: "team7-xxxx.firebaseapp.com",
     projectId: "team7-xxxx",
     storageBucket: "team7-xxxx.appspot.com",
     messagingSenderId: "1234567890",
     appId: "1:1234567890:web:abcdef"
   };
   ```
6. **Copy only the values** from this object (the strings in quotes).
7. Open the file `c:\Users\VIKI\Desktop\QUTATION MAKER\js\firebase.js` in your code editor.
8. Replace the placeholder values in the `firebaseConfig` object (around lines 7-14) with your real values.
9. Click **Continue to console**.

## Step 3: Enable Authentication
1. In the left sidebar of the Firebase console, click on **Build > Authentication**.
2. Click **Get started**.
3. In the "Sign-in method" tab, click on **Email/Password**.
4. Enable the first toggle switch ("Enable").
5. Click **Save**.

## Step 4: Set Up Firestore Database
1. In the left sidebar, click on **Build > Firestore Database**.
2. Click **Create database**.
3. Keep the default database ID and location, click **Next**.
4. Start in **Test mode** (this allows you to read/write without complex rules initially) and click **Enable**.
5. Once created, click on the **Rules** tab.
6. Replace the existing rules with these to secure the database so users can only access their own data:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
       }
       // Special rule to allow creating a document (where resource doesn't exist yet)
       match /{collection}/{documentId} {
         allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
       }
       // User profile docs use the UID as document ID
       match /users/{userId} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
       match /business/{userId} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
     }
   }
   ```
7. Click **Publish**.

## Step 5: Set Up Firebase Storage (For Logos)
1. In the left sidebar, click on **Build > Storage**.
2. Click **Get started**.
3. Start in **Test mode** and click **Next**.
4. Choose a location and click **Done**.
5. Once created, go to the **Rules** tab.
6. Replace the rules with these to ensure only logged-in users can upload and view logos:
   ```javascript
   rules_version = '2';
   service firebase.storage {
     match /b/{bucket}/o {
       match /logos/{fileName} {
         allow read: if true; // Public can see the logo on PDF
         allow write: if request.auth != null && fileName.matches(request.auth.uid + '.*');
       }
     }
   }
   ```
7. Click **Publish**.

## You're All Set! 🚀
You have successfully set up Firebase for your application. 

### How to Run the Application:
Because this application uses JavaScript Modules (`import` statements), you cannot open `index.html` directly in the browser by double-clicking it. You must use a local server.

If you are using **VS Code**:
1. Open the Extensions tab on the left (or press `Ctrl+Shift+X`).
2. Search for **Live Server** (by Ritwick Dey) and click Install.
3. Open `index.html` in VS Code.
4. Right-click anywhere in the code and select **Open with Live Server** (or click "Go Live" at the bottom right of the VS Code window).
5. The application will open in your browser (usually at `http://127.0.0.1:5500`).
6. Try signing up and creating a test business profile!
