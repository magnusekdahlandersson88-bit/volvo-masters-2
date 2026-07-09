importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyBx8LrLzDWoYAonfiWMvOIpkkDqOo2LC88",
  authDomain: "volvo-masters.firebaseapp.com",
  projectId: "volvo-masters",
  storageBucket: "volvo-masters.firebasestorage.app",
  messagingSenderId: "158093315460",
  appId: "1:158093315460:web:561b64a7f3d24db0fb61d1",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
    icon: "/icons.svg",
  });
});