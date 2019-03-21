console.log('Serviceworker - Starting service worker...');

const CACHE_NAME = 'whisp-chat-v1.1.2';

let installCache = [
    /*
    '/index.html',
    '/manifest.json',
    '/css/_main.css',
    '/js/client.js',
    */
];


/**
 * 
 */
self.addEventListener( 'install', async event=>{
    console.log('Serviceworker - Installing...');
    /*
    event.waitUntil( async ()=>{
        let appCache = await caches.open( CACHE_NAME );
        console.log('Serviceworker Installed!');
        appCache.addAll(installCache);
        return;
    });
    */
});

/**
 * 
 */
self.addEventListener("activate", event => {
    // clients.claim() tells the active service worker to take immediate
    // control of all of the clients under its scope
    self.clients.claim();
    console.log('Serviceworker - Activate!');
});


/* 
 * HANDLE FETCH REQUESTS 
 */
addEventListener('fetch', event => {
    // Prevent the default, and handle the request ourselves.
    event.respondWith( async function() {
        let request          = event.request;
        // Try to get the response from a cache.
        const appCache       = await caches.open( CACHE_NAME );
        const cachedResponse = await appCache.match( request );
        // Return it if we found one.
        if ( cachedResponse ) return cachedResponse;
        // If we didn't find a match in the cache, use the network.
        //console.log( 'ServiceWorker - Fetch : Not cached!' );
        const response = await fetch( request );
        // if response is found, cache it
        
        // DEVELOPER MODE..disable caching...
        if( response.status === 200 ) appCache.add( request );

        // return fetch response
        return response;
    }() );
});
