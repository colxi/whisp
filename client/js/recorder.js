import {Client} from './client.js';
import {Server} from './server.js';


// some recording engine variables and flags
let _audioChunks   = [];
let _mediaRecorder = undefined;
let _recording     = false;
let _resolver      = undefined;
let _stream 	   = undefined;

/**
 * 
 */
const Recorder = {
    /**
     * 
     */
    blobToAudioElement : function( blob ){
        let audioURL = window.URL.createObjectURL(blob);
        let audio    = document.createElement('audio');
        audio.src    = audioURL;
        audio.setAttribute('controls', true);
        return audio;
    },
    /**
     * 
     */
    base64ToAudioElement : function( b64 ){
        let blob = Recorder.base64ToBlob( b64 );
        return Recorder.blobToAudioElement( blob );
    },
    /**
     * 
     */
    blobToBase64 : function(blob) {
        return new Promise( resolve=>{
            let reader = new FileReader();
            reader.onload = function() {
                let dataUrl = reader.result;
                //let base64 = dataUrl.split(',')[1];
                resolve(dataUrl);
            };
            reader.readAsDataURL(blob);
        });
    },
    /**
     * 
     */
    base64ToBlob :  function (dataURI) {
        var BASE64_MARKER = ';base64,';
        var base64Index = dataURI.indexOf(BASE64_MARKER) + BASE64_MARKER.length;
        var base64 = dataURI.substring(base64Index);
        var raw = window.atob(base64);
        var rawLength = raw.length;
        var array = new Uint8Array(new ArrayBuffer(rawLength));

        for(let i = 0; i < rawLength; i++) array[i] = raw.charCodeAt(i);
        return new Blob([array], {type : 'audio/ogg'});
    },
    /**
     * enviroment tester, returns tr if browser can
     * record audio, or false if cant
     */
    canRecord : function(){
        return (navigator.mediaDevices.getUserMedia) ? true : false;
    },
    /**
     * (Async)  When execution starts recording audio. If engine is not 
     * initializated it will perform initialization
     */
    record : async function(){
        if( !Recorder.canRecord() || _recording ) return false;
        
        _recording   = true;

        _stream  = await navigator.mediaDevices.getUserMedia( { audio: true } );
        _mediaRecorder = new MediaRecorder(_stream);
        // if .stop() is called meanwhile _mediaRecorder was being async build
        // abort this recording initialization sequence
        if(!_recording){ 
            _stream.getTracks().forEach(track=> track.stop() );
            return;
        }

        // data available event handler : collect the audio data as soon as it  starts comming
        _mediaRecorder.ondataavailable = e=>{ 
            // ad the new chunk
            _audioChunks.push(e.data);
            // calculate the current total size
            let size = 0;
            for(let i = 0; i <_audioChunks.length ; i++){
                size += _audioChunks[i].size;
            }
            // check if current blob size reached the maxMessageSize limit
            // calculate the current size , assuming another chunk of data
            // will be added before the recording is totally stopped, 
            // and multiply that value x2, to get an aproximation of the 
            // final base64 string real size
            if( ( size + _audioChunks[0].size ) * 2 > Server.Config.maxMessageSize  - 1000 ) Client.Recorder.stop();
        };

        // media recorder stop event handler : Joins all
        // the audio data chunks and returns a blob
        // executing the promise resolve method
        _mediaRecorder.onstop  = ()=>{
            _stream.getTracks().forEach(track=> track.stop() );
            let blob 		= new Blob(_audioChunks, { 'type' : 'audio/ogg; codecs=opus' });
            _recording      = false;
            _stream 		= undefined;
            _mediaRecorder  = undefined;
            _resolver( blob );
        };
        
        
        _resolver    = undefined;
        _audioChunks = [];
        _mediaRecorder.start( 1000 );
        return true;
    },
    /**
     * (Async), when exected will stop recording, and return 
     * a promise that will be resolved when recorfded audio is ready
     * returning the resulting audio element
     */
    stop : function(){
        if( !_recording || !_mediaRecorder ){ 
            _recording= false;
            return Promise.resolve(false);
        }
        let promise = new Promise( resolve => _resolver = resolve );
        if(_mediaRecorder.state !== 'inactive' ) _mediaRecorder.stop();
        return promise;
    }
};

export {Recorder};