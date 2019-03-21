import {Config} from './config.js'; 
import {Client} from './client.js';
import {Server} from './server.js';
import {CryptoJS} from './lib/crypto.js' ;

/**
 * 
 */
const Request = {
    /**
     * 
     */
    login : async function(username, key){
        //
        username = username.trim();

        let response = await Server.Request({
            type : 'USER_LOGIN',
            data : {
                username : username,
                group    : CryptoJS.PBKDF2(key, Config.hashSalt).toString()
            }
        });

        if( !response ) return false;

        // set Session data
        Client.Session.logged     = true;
        Client.Session.username   = username;
        Client.Session.key        = key;
        Client.Session.group      = CryptoJS.PBKDF2(key, Config.hashSalt).toString();
        Client.Session.groupUsers = {};

        return response;
    },
    /**
     * 
     */
    getGroupUsers : async function(){
        if( !Client.Session.logged ) return false;
        let response = await Server.Request({
            type : 'GROUP_USERS'
        });
        return response;
    },
    /**
     * 
     */
    getUserMeta : async function( username='' ){
        if( !Client.Session.logged ) return false;

        let userMeta = await Server.Request({
            type : 'USER_META',
            data :  username
        });
        return userMeta;
    },
    /**
     * 
     */
    sendMessage : async function( msg, type='text' ){
        if( !Client.Session.logged ) return false;
        let encrypted = Client.Security.encrypt(msg);
        // block request if message is too long
        if( encrypted.length > Server.Config.maxMessageSize -100 ){
            console.warn(`Server.Request.sendMessage() : Request aborted. Message too big ( ${encrypted.length} / ${Server.Config.maxMessageSize}` );
            return false;
        }
        return await Server.Request({
            type : 'MSG_GROUP',
            data : {
                type     : type,
                message  : encrypted
            }
        });
    },
    /**
     * 
     */
    sendCommand : async function( msg ){
        if( !Client.Session.logged ) return false;

        return await Server.Request({
            type : 'SYS_COMMAND',
            data : msg
        });
    }
};

export { Request };