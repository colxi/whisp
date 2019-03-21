let Config = {
    // If enabled provides acces to API in devtools
    debugMode : true,
    // server port
    port : '443',
    // server hostname
    hostname : location.host,
    // time in seconds change user status to Idle 
    idleTime : 60, 
    // salt string used in room key hashing
    hashSalt : 's3cur3ch4t',
    // force client to connect over HTTPS (autoredirect)
    forceHttps : true,
    // enable/disablw progresive web app
    enablePWA : false
};

export {Config};