self.addEventListener('fetch', function(event) {
    // Este código permite que o app funcione tecnicamente como PWA
    event.respondWith(fetch(event.request));
});