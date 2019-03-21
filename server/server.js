const express         = require('express');
const path            = require('path');
const https           = require('https');
const http            = require('http');
const fs              = require('fs');
const WebSocketServer = require('websocket').server;

/*--------------------------
/* COMMAND LINE PARAMETERS 
/*--------------------------*/

// -port=<Number> 
// sets the port to use by the server
let _port   = undefined;
// -port=<true|false> 
// enables/disables the use of SSL (Http/HTTPS)
let _ssl    = undefined;
// -client=<true|false> 
// enables/disables the delivery o the client
let _client = undefined;

let args = process.argv.slice(2);
args.forEach(function (parameter) {
    let option =parameter.split('=')[0];
    let value = parameter.split('=')[1];
    // SERVER PORT
    if( option === '-port' ){
        // Error if provided port is not a number, is smaller than 1 or is not an integer 
        if( isNaN( value ) ||  Number(value) < 1 ||  !Number.isInteger( Number(value) ) ){
            throw new Error('Invalid value for -port command line parameter. (Allowed : Port Number)');
        }
        _port =  value;
    }
    // USE SSL (HTTP/HTTPS)
    else if( option === '-ssl' ){
        // Accept only true or false
        if( value === 'true'  ) _ssl = true;
        else if( value === 'false' ) _ssl = false;
        else throw new Error('Invalid value for -ssl command line parameter (Allowed : true|false)');
    }
    // USE SSL (HTTP/HTTPS)
    else if( option === '-client' ){
        // Accept only true or false
        if( value === 'true'  ) _client = true;
        else if( value === 'false' ) _client = false;
        else throw new Error('Invalid value for -client command line parameter (Allowed : true|false)');
    }
});


/*----------------------
/* SERVER CONFIGURATION 
/*----------------------*/

// set server port
const SERVER_PORT = (typeof _port !== 'undefined') ? _port :  443;
// enable/disable SSL
const USE_SECURE_PROTOCOL = (typeof _ssl !== 'undefined') ? _ssl : true;
// const SERVER_PORT = (typeof _port !== 'undefined') ? _port :  443;
const SERVE_CLIENT = (typeof _client !== 'undefined') ? _client : true;
// set the max size for socket messages (default 6Mb)
const MAX_MESSAGE_SIZE = 1000000 *6;



/*----------------------
/* INTERNAL VARIABLES
/*----------------------*/

// get a timestamp in seconds
const SERVER_UPTIME = Math.floor(Date.now() / 1000);
// Store last Websocket server connection id .
let CONNECTION_ID = 0;



/*----------------------*/
/*  CHAT SERVER API
/*----------------------*/

const Server = {
    /**
     * Server.init() : Initializa the Server
     */
    start : function(){
        // create server. It will deliver the chat Client and
        // handle all the Client http requests  (imgs , css, js...) 
        const app = express();
        let server;
        // create an HTTP/HTTPS server depending in the
        // value of the USE_SECURE_PROTOCOL flag
        if( USE_SECURE_PROTOCOL ){
            // use the certificates located in /server/certificates 
            // directory to creat the https server
            server = https.createServer( {
                key: fs.readFileSync('./server/certificates/private.key'),
                cert: fs.readFileSync( './server/certificates/primary.crt' )
            }, app);
        }else server = http.createServer(app);
        if( SERVE_CLIENT ){ 
            // connect the server with express if SERVE_CLIENT is enabled
            app.use( express.static(path.join(__dirname, '../client')));
        }else{
            // if web server is disabled return error message to each http(s) request
            app.get('*', function(req, res) {
                res.send('No HTTP/HTTP connections are allowed');
            });
        }
        
        // Start server
        server.listen( SERVER_PORT, ()=>{ 
            console.log( `Socket server (${USE_SECURE_PROTOCOL?'WSS':'WS'}) listening at port ${SERVER_PORT}`);
            if(SERVE_CLIENT) console.log( `Web server is ENABLED (${USE_SECURE_PROTOCOL?'HTTPS':'HTTP'} Client Deliver)`);
            else console.log( 'Web server is DISABLED (No Client deliver)');
            console.log('----------------------------------------------');
        });

        // create new socket server. It will keep an open bidirectional 
        // channel betwen the Client and the Server
        let socketServer = new WebSocketServer({
            // WebSocket server is tied to a HTTP(s) server. WebSocket
            // request is just an enhanced HTTP(s) request.  
            httpServer: server,
            // The maximum allowed message size 
            // (for fragmented messages) in bytes. 
            maxReceivedMessageSize : MAX_MESSAGE_SIZE,
            maxReceivedFrameSize : MAX_MESSAGE_SIZE,
            // If true, the server will automatically send a ping to 
            // all clients every keepaliveInterval milliseconds. Each 
            // client has an independent keepalive timer, which is reset 
            // when any data is received from that client.
            keepalive : true,
            keepaliveInterval : 2000,
            dropConnectionOnKeepaliveTimeout : true,
            // If this is true, websocket connections will be accepted 
            // regardless of the path and protocol specified by the client. 
            // The protocol accepted will be the first that was requested
            // by the client. Clients from any origin will be accepted. 
            autoAcceptConnections: false,
        });

        // handle the new conection
        socketServer.on( 'request', request=>Server.Connection.onConnect(request) );
   
        // done!
        return true;
    },
    /**
     * Server.Connections : Container to store al the active connections
     */
    Connections  : new Set(),
    Connection   : {
        /**
         * Server.Connection.onConnect() : Handle new Socket connections
         */
        onConnect : function( request ){
            // Make sure we only accept requests from an allowed origin
            if (!Server.Security.originIsAllowed(request.origin)) {
                request.reject();
                console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
                return;
            }
        
            // Accept connection and create Session object
            let _connection = request.accept('echo-protocol', request.origin);
            CONNECTION_ID++;
            
            let Connection = {
                id      : CONNECTION_ID,
                ip      : request.remoteAddress,
                socket  : _connection,
                address : _connection.remoteAddress,
                Session : {
                    isLogged   : false,
                    username   : undefined,
                    group      : undefined
                }
            };
            
            console.log(`[${Connection.id}] New Connection accepted from ${Connection.ip}`);
            
            Server.Connections.add( Connection );

            // set listeners for onMessage and onClose events
            Connection.socket.on('message', message=>Server.Connection.onMessage(Connection, message) );
            Connection.socket.on('close', (reasonCode, description)=>Server.Connection.onDisconnect(Connection, reasonCode, description) );

            Server.User.sendNotification( Connection, 'SOCKET_CONFIG', {
                maxMessageSize  : MAX_MESSAGE_SIZE,
                serverUptime    : SERVER_UPTIME
            });
        },
        /**
         * Server.Connection.onConnect() : Handle new Socket disconnections
         */
        onDisconnect : function( Connection, reasonCode /*, description*/ ){
            console.log( `[${Connection.id}] Connection closed from ${Connection.ip} (${reasonCode})` );
            
            Server.Connections.delete( Connection );
            
            if( !Connection.Session.isLogged ) return;
            
            Server.Group.sendNotification( Connection , 'USER_LEFT', {
                username : Connection.Session.username 
            });
            
        },
        /**
         * Server.Connection.onConnect() : Handle new Socket incoming messages
         */
        onMessage : function(Connection, message){
            // accept only utf8 messages
            if(message.type !== 'utf8'){ 
                console.log( `[${Connection.id}] Unsupported message type reveived : ${message.type}. DISCARDED` );
                return;
            }
            // parse JSON string formated message
            let msg;
            try{ msg = JSON.parse(message.utf8Data) }
            catch (e){msg = false }
            
            // block if JSON parsing failed
            if(!msg || typeof msg !== 'object'){ 
                console.log( `[${Connection.id}] Invalid JSON format in mesage. DISCARDED` );
                return;
            }
                    
            console.log( `[${Connection.id}] Received message: ${msg.type}` );
            
            // if requested method is not implemented block the request
            if( !Server.onRequest.hasOwnProperty(msg.type) ){
                console.log( `[${Connection.id}] Invalid method requested : ${msg.type}. DISCARDED` );
                return false;
            }
            
            // call the reuestedm ethod
            let result   = Server.onRequest[msg.type]( Connection, msg.data );
            // JSON encode the response
            let response = JSON.stringify({
                type : 'RESPONSE',
                id   :  msg.id,
                data : result
            });
            
            // send response
            Connection.socket.sendUTF( response );
            // done!
            return;
        },
    },
    onRequest : {
        USER_LOGIN : function( Connection, data ){
            // only username with length>0 , alphanumeric characters ,
            // dashes and underscore are allowed. return false if 
            // username does not fit this rules
            let regexp = /^[a-zA-Z0-9-_]+$/;
            if( data.username.search(regexp) === -1 ) return false;

            // if user is already logger or username
            // already exists, return false;
            if( Connection.Session.isLogged  ||
                Server.User.exist( data.username ) ) return false;
            
            // login the user 
            Connection.Session.isLogged   = true;
            Connection.Session.username   = data.username;
            Connection.Session.group      = data.group;
            Connection.Session.status     = true;
            
            // notify all member of the group of new user
            Server.Group.sendNotification( Connection, 'USER_JOIN', {
                username : Connection.Session.username 
            });
            
            return  data.username;
        },
        GROUP_USERS : function( Connection ){
            if( !Connection.Session.isLogged ) return  false;
            let userList = Server.Group.getUsers( Connection.Session.group );
            return userList;
        },
        MSG_GROUP : function( Connection, data ){
            if( !Connection.Session.isLogged ) return  false;
            data.message = Server.Security.sanitize(data.message);
            let result   = Server.Group.sendMessage( Connection , data.type, data.message );
            return result;
        },
        USER_META : function( Connection, username ){
            if( !Connection.Session.isLogged ) return false;
            let user = Server.User.getConnection( username );
            if( !user ) return false;
            if( Connection.Session.group !== user.Session.group ) return false;
            return { 
                group     : user.Session.group,
                username  : user.Session.username,
                status    : user.Session.status         
            };
        },
        USER_STATUS : function( Connection, data ){
            if( !Connection.Session.isLogged ) return false;
            data.status = data.status ? true : false;

            Connection.Session.status = data.status;
            Server.Group.sendNotification( Connection, 'USER_STATUS', {
                username    : Connection.Session.username,
                status      : Connection.Session.status
            });
            return true;
        },
        SYS_COMMAND : function( Connection, data ){
            console.log('- Command Received!' , data );
            //Connection.close();
        }
    },
    Group : {
        sendMessage : function( senderConnection, msgType = 'text', message = ''){
            if( !senderConnection.Session.isLogged ) return false;
            Server.Group.sendNotification( senderConnection, 'MSG_GROUP', {
                type     : msgType,
                username : senderConnection.Session.username,
                message  : message
            });
            return true;
        },
        sendNotification : function( senderConnection, id,  data ){
            let group = senderConnection.Session.group;
            let connections = Server.Group.getConnections( group );
            for(let i=0; i<connections.length; i++){
                if(senderConnection === connections[i] ) continue;
                // JSON encode the packet
                let packet = JSON.stringify({
                    type : 'NOTIFICATION',
                    id   : id,
                    data : data
                });
                // send response
                connections[i].socket.sendUTF( packet );
            }
            return true;
        },
        getUsers : function( group ){
            let connections = Array.from( Server.Connections );
            let users = [];
            for(let i=0; i<connections.length; i++){
                if( !connections[i].Session.isLogged ||
                    connections[i].Session.group !== group ) continue;
                users.push( connections[i].Session.username );
            }
            return users;
        },
        getConnections : function( group ){
            let connections = Array.from( Server.Connections );
            let gconnections = [];
            for(let i=0; i<connections.length; i++){
                if( !connections[i].Session.isLogged ||
                    connections[i].Session.group !== group ) continue;
                gconnections.push( connections[i] );
            }
            return gconnections;
        }
    },
    User : {
        sendMessage : function( senderConnection, recieverConnection, message ){
            if( !senderConnection.Session.isLogged ) return false;
            recieverConnection.socket( message );
        },
        sendNotification : function( senderConnection,  id, data ){
            // JSON encode the packet
            let packet = JSON.stringify({
                type : 'NOTIFICATION',
                id   : id,
                data : data
            });
            // send response
            senderConnection.socket.sendUTF( packet );
            return true;
        },
        exist : function( username ){
            let connections = Array.from( Server.Connections );
            for(let i=0; i< connections.length; i++){
                if( connections[i].Session.username === username ) return true;
            }
            return false;
        },
        getConnection( username ){
            let connections = Array.from( Server.Connections );
            for(let i=0; i<connections.length; i++){
                if( connections[i].Session.username === username ) return connections[i];
            }
            return false;
        }
    },
    Security : {
        originIsAllowed : function originIsAllowed(/*origin*/) {
            // put logic here to detect whether the specified origin is allowed.
            //console.log(origin);
            return true;
        },
        sanitize : function(str){
            str = str.replace(/>/g, '&gt;').replace(/</g, '&lt;');
            return str;
        }
    }
};

// Start the server
Server.start();

