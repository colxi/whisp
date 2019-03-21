import {Client} from './client.js';
import {Request} from './server-request.js';


let RESOLVE_DISCONNECTION_REQUEST = undefined;
let RESOLVE_CONNECTION_REQUEST    = undefined;
let IS_REQUESTED_DISCONNECTION    = false;
let IS_CONNECTED                  = false;


/**
 * 
 */
const Server = {
    _requestId : 0,
    _requests  : {},
    /**
     * Server.Config{} : Collection to store the 
     * server connection configuration and parameters
     */
    Config : {
        maxMessageSize : undefined,
        serverUptime   : undefined,
        hostname       : undefined,
        port           : undefined,
    }, 
    /**
     * Server.isConnected() : Tests if the client is connected 
     * to the server. Returns a Boolean
     */
    isConnected : function(){
        return IS_CONNECTED;
    },
    /**
     * Server.connect() : Async - Stablishes a new connection to the Server,
     * and sets the necessary event handlers to manage the connection
     */
    connect : function( hostname, port ){
        // Block if an active connection already exists  
        if( Server.isConnected() ){
            console.log('Server.connect() : Already Connected. (Disconnect first)');
            return Promise.resolve( false );
        }else console.log('Server.connect() : Connecting...');
        
        // initialize websocket
        let protocol = ( location.protocol === 'http:' ) ? 'ws' : 'wss';
        Server._socket = new WebSocket(`${protocol}://${hostname}:${port}`, 'echo-protocol');
        // ...and set websocket event andlers
        Server._socket.onerror   = Server.Connection.onConnectionError;
        Server._socket.onopen    = Server.Connection.onConnect;
        Server._socket.onclose   = Server.Connection.onDisconnect;
        Server._socket.onmessage = Server.Connection.onMessage;
       
        // set the provided hostname and port in the config 
        Server.Config.hostname  = hostname;
        Server.Config.port      = port;
        // return a promise
        return new Promise( r => RESOLVE_CONNECTION_REQUEST = r );
    },
    /**
     * Server.disconnect() : Async - Performs the disconnection from
     * the server, and sets the requestedDisconnection flag to true
     */
    disconnect : function(){
        // block if there is no active connection
        if( !Server.isConnected() ){
            console.log('Server.disconnect() : Already disconnected. (Connect first)');
            return Promise.resolve( false );
        }else  console.log('Server.disconnect() : Disconnecting...');
        // set the requestedDisconnection flag to true
        IS_REQUESTED_DISCONNECTION = true;
        // terminate connection
        Server._socket.close();
        // return a promise
        return new Promise( r => RESOLVE_DISCONNECTION_REQUEST = r );
    },
    /**
     * Server.Connection{} : Container for socket events handlers 
     */
    Connection : {
        /**
         * Server.Connection.onConnectionError() : If any event error is triggered
         * log the error and retry connection. , and resolve the promise
         * generated by Server.connect() 
         */
        onConnectionError : async function(){
            console.log('Server.Connection.onConnectionError() : Websocket Connection error! ');
            // set the IS_CONNECTED flag to false, and the 
            // IS_REQUESTED_DISCONNECTION flag to false
            IS_CONNECTED               = false;
            IS_REQUESTED_DISCONNECTION = false;
            // unset  hostname and port in the config 
            Server.Config.hostname      = undefined;
            Server.Config.port          = undefined;
            // resolve the connection Promise created by Server.connect()
            RESOLVE_CONNECTION_REQUEST( false );
        },
        /**
         * Server.Connection.onConnect() : Handles the Socket connection
         * establishment. This event happens afte the Server.connect() 
         * method is called. onConnect resolves the promise that
         * Server.connect() has defined previously.
         */
        onConnect : async function(){
            console.log('Server.Connection.onConnect() : Connected!');
            IS_CONNECTED    = true;
            // resolve the prmise generated byServer.connect()
            RESOLVE_CONNECTION_REQUEST(true);
        },
        /**
         * Server.Connection.onDisconnect() : Handles the disconnection 
         * event, shows info in screen and display conneciton dialog
         */
        onDisconnect : async function(e){     
            // ignore disconnect events that happen when the
            // connection is not active
            if( !Server.isConnected() ) return;
            // set connected flag to false
            IS_CONNECTED = false;
            // remove session data
            Client.Session.logged     = false;
            Client.Session.username   = undefined;
            Client.Session.key        = undefined;
            Client.Session.group      = undefined;
            Client.Session.groupUsers = {};
            // unset  hostname and port in the config 
            Server.Config.hostname    = undefined;
            Server.Config.port        = undefined;
            // Disconnections can be caused by disconnection requests
            // or by unnexpected reasons.. behave as needed according
            // to each scenario
            if( IS_REQUESTED_DISCONNECTION ){
                // requested disconnect...resolve the promise
                // generated by Server.disconnect() call
                console.log(`Server.Connection.onDisconnect() : Disconnected! (Code: ${e.code})` );
                IS_REQUESTED_DISCONNECTION = false;
                RESOLVE_DISCONNECTION_REQUEST( true );
            }else{
                // unexpected disconnection... show the connection dialog
                console.log(`Server.Connection.onDisconnect() : Unexpected Disconnection! (Code: ${e.code}). Reconnecting` );      
                setTimeout( ()=>{
                    Client.UI.loginContainer.removeAttribute('hidden');
                }, 1000 );
            }
        },
        /**
         * 
         */
        onMessage :  async function(event){
            // Decode the JSON string message
            let data;
            try{ data = JSON.parse( event.data ) }
            catch(e){ 
                // invalid JSON string received. throw an error
                console.log('<<', event.data);
                throw new Error('Invalid JSON object found in received message.');
            }
            
            // Handle RESPONSES
            if( data.type === 'RESPONSE' ){
                console.log( '<<', data.id, 'RESPONSE', data.data );
                // call Request response handler
                Server.onResponse( data );
            }
            
            // Handle NOTIFICATIONS
            else if( data.type === 'NOTIFICATION' ){
                console.log( '<<', 'X', 'NOTIFICATION', data.id, data.data );
                // if there is no Hnadler for the recieved Notification, throw 
                // an error and block execution
                if( !Server.onNotification.hasOwnProperty( data.id ) ){
                    throw new Error( 'Recieved Notification type, is not supported' );
                }
                // call handler
                Server.onNotification[ data.id ]( data.data );
            }
            
            // Handle Unkwnown messages
            else{
                // If unknown message type is found throw an error
                throw new Error( `Invalid message type : ${data.type} ( Allowed values : RESPONSE | NOTIFICATION ).` );
            }		
        }
    },
    /**
     * 
     */
    onNotification :  {
        'MSG_GROUP' : data=>{
            Client.Render.message( data.username , data.message, data.type );
        },
        'USER_JOIN' : async data =>{
            Client.Render.info( data.username + ' joined the room' );
            let userMeta = await Server.Request.getUserMeta( data.username );
            if(!userMeta) throw new Error('cant get user meta');
            Client.Session.groupUsers[ userMeta.username ] = userMeta;
            Client.Render.user(userMeta);
        },
        'USER_LEFT' : data=>{
            Client.Render.info( data.username + ' left the room' );
            Client.UI.userListContainer.querySelector(`[data-username="${data.username}"]`).remove();
        },
        'USER_STATUS' : data=>{
            let userUI = Client.UI.userListContainer.querySelector(`[data-username="${data.username}"]`);
            userUI.setAttribute('data-status',data.status);
        },
        'SOCKET_CONFIG' : data=>{
            Server.Config.maxMessageSize = data.maxMessageSize;
            Server.Config.serverUptime   = data.serverUptime;
        }
    },
    /**
     * 
     */
    onResponse : function( data ){
        // retreive the Request resolver
        let resolver = Server._requests[ data.id ];
        if( !resolver ) throw new Error('aaaa');
        
        // remove the resolver from the resolvers list
        delete Server._requests[ data.id ];
        delete data.id;
        
        resolver( data.data );
    },
    /**
     * 
     */
    Request : function( data = {} ){
        if( !Server.isConnected() ){
            throw new Error('Server.Request() : No connection established.');
        }

        // increase the request id counter
        Server._requestId++;
        // prepare the packet to send
        let packet = {
            id   : Server._requestId,
            type : data.type,
            data : data.data || {}
        };
        console.log('>>', packet.id, packet.type, packet.data);
        // return a promise ( wil be resolved when the server response is received )
        return new Promise( resolve=>{
            // store the promise resolver
            Server._requests[packet.id] = resolve;
            // send the request to the server
            Server._socket.send( JSON.stringify( packet ) ); 
        });
    }
};


/**
 * Attach to Server.Request all the available methods in 
 * the module Resquests
 */
for( let request in Request ){
    if( !Request.hasOwnProperty(request) ) continue;
    Server.Request[ request ] = Request[request];
}

export { Server };