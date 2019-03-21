import {Config} from './config.js';
import {Server} from './server.js';
import {Recorder} from './recorder.js'; 
import {Player} from './player.js';
import {CryptoJS} from './lib/crypto.js';
import {PWA} from './pwa.js';


/**
 * 
 */
const Client = {
    /**
     * 
     */
    init : async function(){
        console.log('Client.init() : Client Initiation...');

        // Redirect to https if insecure protocol is used
        if( Config.forceHttps && location.protocol !== 'https:' ){
            console.log('INSECURE CONNECTION! Redirecting to https');
            location = 'https://'+ location.hostname + location.pathname;
            return;
        }
        
        // Create all the UI references
        // document.querySelectorAll('[id]').forEach(e=>{
        // convert to camelCase
        // var camelCased = myString.replace(/-([a-z])/g, function (g) { return g[1].toUpperCase(); });
        // console.log(e.id) 
        // })

        // detect if app is rinning in mobile device and set a flag if true
        let isMobile = false;
        (function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))) isMobile = true;})(navigator.userAgent||navigator.vendor||window.opera);
        if(isMobile) document.body.setAttribute('data-mobile-device',true);
        
        // if Progressive Web App is enabled, initiaize it
        if( Config.enablePWA ) await PWA.init();
           
        // initilize the 'user Active status' handler. It tracks user 
        // activity in the app, and if no activity is detected in the
        // idleTime interval, sets user as innactive and notifies the
        // other users in the room
        let _appUserInteraction = function(){
            Client.Session.lastActivity = new Date();
            if( !Client.Session.enabled ) Client.updateUserStatus();
        };
        window.addEventListener('mousemove',_appUserInteraction );
        window.addEventListener('keydown',  _appUserInteraction );
        setInterval( Client.updateUserStatus , Config.idleTime*1000 );

        // login form Submit element listener
        Client.UI.loginSubmit.addEventListener('click', ()=>{
            Client.connect();
        });
        
        // login form Username input element listener
        Client.UI.usernameInput.addEventListener('keydown', e=>{
            if( e.key === 'Enter' ) Client.connect();
        });
        
        // chat  Message input element listeners
        Client.UI.messageInput.addEventListener('keydown', e=>{
            if( e.key !== 'Enter' ) return;
            let msg = Client.UI.messageInput.value.trim();
            if(!msg.length) return;
            Client.UI.messageInput.value = '';
            Client.sendMessage( msg );
            Client.UI.messageRecord.removeAttribute('data-send');     
        });
        Client.UI.messageInput.addEventListener('input', ()=>{
            let msg = Client.UI.messageInput.value.trim();
            if( msg.length ) Client.UI.messageRecord.setAttribute('data-send',true);
            else Client.UI.messageRecord.removeAttribute('data-send');          
        });

        // Audio Recorder Button 
        Client.UI.messageRecord.addEventListener( 'click', ()=>{
            let msg = Client.UI.messageInput.value.trim();

            if( msg.length){
                Client.sendMessage( msg );
                Client.UI.messageInput.value = '';
                Client.UI.messageRecord.removeAttribute('data-send');   
                Client.UI.messageInput.focus();  
                return;
            }
            Client.Recorder.start();
        }, false);		
        Client.UI.modalRecord.addEventListener( 'click', Client.Recorder.stop, false);	
      

        // display user list
        Client.UI.viewUsers.addEventListener( 'click', ()=>{
            Client.UI.userListContainer.setAttribute('data-unfold',true);
            Client.UI.headerLogo.setAttribute('hidden',true);
            Client.UI.headerBack.removeAttribute('hidden');
            Client.onClickBack = function(){
                Client.UI.userListContainer.removeAttribute('data-unfold');
            };
        }, false);	

        // handle header back button click
        Client.UI.headerBack.addEventListener( 'click', ()=>{
            Client.UI.headerBack.setAttribute('hidden',true);
            Client.UI.headerLogo.removeAttribute('hidden');
            Client.onClickBack();
        }, false);

        Client.UI.messageFileInput.addEventListener('change', (e)=>{
            var file = e.target.files[0]; 
            if( !file ) return;
            if( !file.type.match('image.*') ) return;

            let reader = new FileReader();
            reader.onload = function(e){
                let base64 = e.target.result;
                if( base64.length > Server.Config.maxMessageSize - 200 ){
                    Client.Modal.show('File is too big.');
                    setTimeout( Client.Modal.hide() , 2000 );
                    return;
                }
                Client.sendMessage( base64 , 'image' );
            };
            // Read in the image file as a data URL.
            reader.readAsDataURL(file);
        }, false);


        // set focus to Message input element on tab focus
        window.addEventListener('focus', ()=>{
            if( Client.Session.logged ) Client.UI.messageInput.focus();
        });
        
        // show connection dialog
        Client.UI.loginHostName.value = Config.hostname;
        Client.UI.loginHostPort.value = Config.port;
        Client.Modal.hide();
        Client.UI.loginContainer.removeAttribute( 'hidden' );
        Client.UI.usernameInput.focus();
        
        console.log('Client.init() : Client Initiation done.');
        return true;
    },
    /**
     * 
     */
    UI : {
        notificationBox   : document.getElementById('app-notification'),
        loginContainer    : document.getElementById('login-container'),
        loginMsg          : document.getElementById('login-container-msg'),
        loginSubmit       : document.getElementById('login-container-submit'),
        loginHostName     : document.getElementById('login-server-host'),
        loginHostPort     : document.getElementById('login-server-port'),
        usernameInput     : document.getElementById('nick'),
        keyInput          : document.getElementById('key'),
        msgContainer      : document.getElementById('chat-messages-container'),
        messageInput      : document.getElementById('chat-message-input'),  
        messageRecord     : document.getElementById('chat-message-record'),  
        userListContainer : document.getElementById('chat-users'),
        headerUsername    : document.getElementById('chat-header-user-nick'),
        headerAvatar      : document.getElementById('chat-header-user-avatar'),
        modalRecord       : document.getElementById('chat-modal-recording'),
        stopRecord        : document.getElementById('chat-modal-recording-button'),
        viewUsers         : document.getElementById('chat-view-users'),
        headerLogo        : document.getElementById('chat-header-logo'),
        headerBack        : document.getElementById('chat-header-back'),      
        messageFileInput  : document.getElementById('chat-message-file-input'),      
    },
    /**
     * 
     */
    Session : {
        groupUsers   : {}, 
        lastActivity : new Date(),
        //
        logged       : false,
        username     : undefined,
        key          : undefined,
        group        : undefined,
        status       : true,
    },
    /**
     * 
     */
    Security : {
        /**
         * 
         */
        encrypt : function( txt = '' ){
            if( !Client.Session.logged ) return false;
            // Encrypt the provided string using Client.Session.key
            var ciphertext = CryptoJS.AES.encrypt(txt, Client.Session.key);
            return ciphertext.toString();
        },
        /**
         * 
         */
        decrypt : function(txt=''){
            if( !Client.Session.logged ) return false;
            // Decrypt the provided string using Client.Session.key
            var bytes  = CryptoJS.AES.decrypt( txt , Client.Session.key);
            var plaintext = bytes.toString(CryptoJS.enc.Utf8);
            return plaintext;
        }
    },
    /**
     * 
     */
    Render : {
        /**
         * 
         */
        message : function(user, msg, type='text'){
            if( user !== Client.Session.username) msg = Client.Security.decrypt(msg);
            
            //
            let t = new Date();
            let time = t.getHours() +':'+t.getMinutes() + ':' + t.getSeconds();
            let owner = user===Client.Session.username ? 'chat-message-entry-own' : '';
            let e = document.createElement('div');
            e.className = 'chat-message-entry ' + owner;
            e.innerHTML = `
                <div class="chat-message-entry-container">
                    <div class="chat-message-entry-avatar">${ user[0].toUpperCase() }</div>
                    <div class="chat-message-entry-body" data-message-type="${type}">
                        <div class="chat-message-entry-username">${user}</div> 
                        <div class="chat-message-entry-message"></div>
                        <div class="chat-message-entry-media"></div>
                        <div class="chat-message-entry-time">${time}</div>
                    </div>
                </div>
            `;
            Client.UI.msgContainer.appendChild(e); 
            let container = e.querySelector('.chat-message-entry-message');
            let mediaContainer = e.querySelector('.chat-message-entry-media');
            
            switch( type ){
                case 'text' :{
                    // prevent html injection
                    msg = msg.replace(/>/g, '&gt;').replace(/</g, '&lt;');
                    container.innerHTML = msg;
                    break;
                }
                case 'audio' :{
                    let audio = Recorder.base64ToAudioElement(msg);
                    // A bug in Chrome causes a missreading of the audio
                    // duration property, returning alwaqys Infinity
                    // https://bugs.chromium.org/p/chromium/issues/detail?id=642012	
                    // bug workarround :
                    audio.onloadedmetadata = function() {
                        // set the currentTime to a high value over real duration
                        audio.currentTime = Number.MAX_SAFE_INTEGER;
                        audio.ontimeupdate = function() {
                            audio.ontimeupdate = function(){};
                            audio.currentTime = 0.1;
                            audio.currentTime = 0;
                            let audioPlayer   = Player(audio);
                            mediaContainer.appendChild( audioPlayer );
                        };
                    };
                    break;
                }
                case 'image' :{
                    let img = document.createElement('img');
                    img.className = 'message-image';
                    img.src = msg;
                    mediaContainer.appendChild( img );
                    break;
                }
                default : {
                    throw new Error('Uknown message type : ' + type);
                }
            }
            Client.UI.msgContainer.scrollTop = Client.UI.msgContainer.scrollHeight;
        },
        /**
         * 
         */
        info : function(msg){
            let e= document.createElement('div');
            let t = new Date();
            let time = t.getHours() +':'+t.getMinutes() + ':' + t.getSeconds();
            e.className = 'chat-info-entry';
            e.innerHTML = `<span>${time}</span> <span class="chat-message-notification">${msg}</span>`;
            Client.UI.msgContainer.appendChild(e); 
            Client.UI.msgContainer.scrollTop = Client.UI.msgContainer.scrollHeight;
        },
        /**
         * 
         */
        usersList : function(){
            Client.UI.userListContainer.innerHTML =  '';
            for(let u in Client.Session.groupUsers){
                Client.Render.user( Client.Session.groupUsers[u] );
            }
        },
        /**
         * 
         */
        user : function(user){
            Client.UI.userListContainer.innerHTML +=  `
                    <div class="chat-users-user" data-username="${user.username}" data-status="${user.status}" ${ (user.username === Client.Session.username) ? 'data-self="true"' : '' } >
                        <div class="chat-users-user-avatar">${ user.username[0].toUpperCase() }</div>
                        <div class="chat-users-user-data">      
                            <div class="chat-users-user-nick">${user.username}</div>
                            <div class="chat-users-user-state">${ user.state ? user.state : '' }</div>
                        </div>
                        <div class="chat-users-user-statusicon"></div>      
                    </div>
                `;
            return true;
        },
        
    },
    /**
     * 
     */
    Recorder : {
        /**
         * 
         */
        start : async function(){  
            Client.UI.modalRecord.removeAttribute('hidden');
         
            //Client.UI.messageRecord.setAttribute( 'data-recording', true);
            Recorder.record();
        },
        /**
         * 
         */
        stop :  async function(){
            Client.UI.modalRecord.setAttribute('hidden',true);
            setTimeout( async ()=>{
                Client.UI.messageRecord.removeAttribute( 'data-recording');
                let blob = await Recorder.stop();
                // if audio message is too short, blob value will be false
                // abort audio processing
                if( !blob || blob.size <  2000 ) return false;
                let base64 = await Recorder.blobToBase64( blob );
                Client.sendMessage( base64, 'audio' );
            },500);
        }
    },
    /**
     * 
     */
    Modal : {
        /**
         * 
         */
        show : function(msg=''){
            Client.UI.notificationBox.removeAttribute('hidden');
            Client.UI.notificationBox.innerHTML = msg;
            return true;
        },
        /**
         * 
         */
        hide : function(){
            Client.UI.notificationBox.setAttribute('hidden',true);
            return true;
        }
    },
    /**
     * 
     */
    updateUserStatus : function(){
        if( !Client.Session.logged ) return false;
        let ellapsedTime = ( new Date() - Client.Session.lastActivity ) / 1000;
        let available = ellapsedTime > Config.idleTime ? false : true;
        if( available !== Client.Session.status ){
            // set new status
            Client.Session.status = available;
            
            let userUI = Client.UI.userListContainer.querySelector(`[data-username="${Client.Session.username}"]`);
            userUI.setAttribute('data-status',available);
        
            Client.UI.headerAvatar.setAttribute('data-status',available);
            
            // notify new status
            Server.Request({
                type : 'USER_STATUS',
                data : {
                    status : available
                }
            });
        }
        return Client.Session.status;
    },
    /**
     * 
     */
    connect : async function(){
        // block if already logged
        if( Client.Session.logged ) return false;

        Client.UI.loginContainer.removeAttribute('hidden');

        let username = Client.UI.usernameInput.value.trim();
        let key      = Client.UI.keyInput.value.trim();
        let hostname = Client.UI.loginHostName.value.trim();
        let port     = Client.UI.loginHostPort.value.trim();
        if( !username.length || !hostname.length || !port.length ) return false;

        // if Server is already connected force
        // server disconnection
        if( Server.isConnected() ) await Server.disconnect();
        
        // initialize connection with server
        Client.Modal.show( 'Connecting to server...' );
        let connected = await Server.connect(hostname, port);

        // if connection fails, block  sequence and show message 
        if( !connected ){
            Client.Modal.show( `Can't connect to : ${hostname}:${port}` );
            setTimeout( Client.Modal.hide, 2000);
            return false;
        }

        // perform login request to the server
        let logged = await Server.Request.login( username, key );

        // if login fails disconnect from server, notify failure to user,
        // and display the login dialog again
        if( !logged ){ 
            await Server.disconnect();
            Client.Modal.show('Invalid username or already in use. Try again' ); 
            Client.UI.loginContainer.removeAttribute('hidden');
            Client.UI.usernameInput.focus();
            setTimeout( Client.Modal.hide, 2000);
            return false;
        }

        // get group users
        let groupUsers = await Server.Request.getGroupUsers();

        // get group users meta
        for(let i=0; i<groupUsers.length; i++){
            let userMeta = await Server.Request.getUserMeta(groupUsers[i]);
            if(!userMeta)  continue;
            Client.Session.groupUsers[ userMeta.username ] = userMeta;
        }
        
        // update GUI
        Client.Modal.hide();
        Client.Render.usersList();
        Client.UI.headerUsername.innerHTML = username;
        Client.UI.loginContainer.setAttribute('hidden',true);
        Client.UI.messageInput.focus();
        Client.Render.info( 'Connected to server...' );
        Client.Render.info( 'Logged in!' );
        Client.Render.info( 'There are ' + groupUsers.length + ' users in the room' );
        Client.UI.headerAvatar.innerHTML = username[0].toUpperCase();
        //jjj
        // done!
        return true;
    },
    /**
     * 
     */
    sendMessage: async function( msg, type='text' ){
        if( !Client.Session.logged ) return false;

        if(type === 'text' && msg[0] === '/'){
            console.log('Command!');
            Server.Request.sendCommand( msg.slice(1) );
            return;
        } 

        let succes = await Server.Request.sendMessage( msg, type);
        if( succes ){
            Client.Render.message( Client.Session.username , msg , type);
        }
        return succes;
    },
    /**
     * 
     */
    onClickBack : function(){}
};

export {Client};