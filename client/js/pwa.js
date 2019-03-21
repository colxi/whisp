//let deferredPrompt;

/**
 * 
 */
let PWA = {
    sWorker : undefined,
    /**
     * 
     */
    init : async function(){
        console.log('Enabling PWA...');
        if( location.protocol !== 'https:' ){
            throw new Error('pwa.int() : PregoressiveWebApp needs to be executed under HTTPS protocol.'); 
        }
        // Register SERVICE WORKER
        PWA.sWorker = await navigator.serviceWorker.register('./service-worker.js');

        /*
        // Disable access to devtools and other browser
        // keyboard shortcuts
        if (window.matchMedia('(display-mode: standalone)').matches) {
            console.log("This is running as standalone.");
            window.addEventListener( 'input' , e=>{

            })
        }
        */

        /*
        window.addEventListener('beforeinstallprompt', function(e) {
        console.log('beforeinstallprompt Event fired');
        e.preventDefault();

        // Stash the event so it can be triggered later.
        deferredPrompt = e;

        return false;
        });

        btnSave.addEventListener('click', function() {
        if(deferredPrompt !== undefined) {
            // The user has had a postive interaction with our app and Chrome
            // has tried to prompt previously, so let's show the prompt.
            deferredPrompt.prompt();

            // Follow what the user has done with the prompt.
            deferredPrompt.userChoice.then(function(choiceResult) {

            console.log(choiceResult.outcome);

            if(choiceResult.outcome == 'dismissed') {
                console.log('User cancelled home screen install');
            }
            else {
                console.log('User added to home screen');
            }

            // We no longer need the prompt.  Clear it up.
            deferredPrompt = null;
            });
        }
        });

        */
        return true;
    }
};

export {PWA};