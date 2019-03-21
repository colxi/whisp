import {Config} from './config.js'; 
import {Client} from './client.js'; 
import {Server} from './server.js'; 
import {Recorder} from './recorder.js'; 
import {CryptoJS} from './lib/crypto.js';

/**
 * If debug is enabled make the modules accessible
 * from the devtools console
 */
if( Config.debugMode ){
    console.log('Debug Mode : ON');
    // debug
    window.Client = Client;
    window.Server = Server;
    window.Config = Config;
    window.Recorder = Recorder;
    window.CryptoJS = CryptoJS;
}

// Initialize the Client when window is ready
window.onload = ()=> Client.init();


