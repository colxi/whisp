/**
 * 
 */
let Player = function( audioElement ){	

    // Moves UI_Playhead as user drags
    function moveplayhead(event) {
        var newMargLeft = event.clientX - UI_Timeline.getBoundingClientRect().left;

        if(newMargLeft >= 0 && newMargLeft <= ( UI_Timeline.offsetWidth - UI_Playhead.offsetWidth ) ) {
            UI_Playhead.style.marginLeft = newMargLeft + 'px';
        }       
        if(newMargLeft < 0) {
            UI_Playhead.style.marginLeft = '0px';
        }
        if(newMargLeft > ( UI_Timeline.offsetWidth - UI_Playhead.offsetWidth ) ) {
            UI_Playhead.style.marginLeft = ( UI_Timeline.offsetWidth - UI_Playhead.offsetWidth ) + 'px';
        }
    }

    /*
		Generate the HTML UI , as the with the following structure :
		
		<div class="chat-message-player">
			<div id="chat-message-player-button">►</div>
			<div id="chat-message-player-timeline">    
				<div id="chat-message-player-head"></div>
			</div>
		</div>
	*/

    let UI_Container = document.createElement('div');
    let UI_Button    = document.createElement('div');
    let UI_Timeline  = document.createElement('div');
    let UI_Playhead  = document.createElement('div');

    UI_Container.className ='chat-message-player';
    UI_Button.innerHTML    = '►';
    UI_Button.className    = 'chat-message-player-button';
    UI_Timeline.className  = 'chat-message-player-timeline';
    UI_Playhead.className  = 'chat-message-player-head';

    UI_Container.appendChild( UI_Button );
    UI_Container.appendChild( UI_Timeline );
    UI_Timeline.appendChild( UI_Playhead );

    // Boolean value so that audio position is updated only when the UI_Playhead is released
    let _isDragging = false;
	
    // handle the player current time change
    audioElement.addEventListener('timeupdate', ()=>{
        if( _isDragging ) return;
        var playPercent = ( UI_Timeline.offsetWidth - UI_Playhead.offsetWidth ) * (audioElement.currentTime / audioElement.duration);
        UI_Playhead.style.marginLeft = playPercent + 'px';
        if (audioElement.currentTime == audioElement.duration) UI_Button.innerHTML ='►';
    }, false);
	
    // handle the play/pause button click evet
    UI_Button.addEventListener('click', ()=>{
        // start music
        if (audioElement.paused) {
            audioElement.play();
            UI_Button.innerHTML ='❚❚';
        } else { // pause music
            audioElement.pause();
            UI_Button.innerHTML ='►';
        }
    });

    // handle the timeine click event
    UI_Timeline.addEventListener('click', function(event) {
        moveplayhead(event);
        audioElement.currentTime = audioElement.duration * (event.clientX - UI_Timeline.getBoundingClientRect().left ) / ( UI_Timeline.offsetWidth - UI_Playhead.offsetWidth );
    }, false);

    // makes UI_Playhead draggable
    UI_Playhead.addEventListener('mousedown', ()=>{
        _isDragging = true;
        window.addEventListener('mousemove', moveplayhead, true);
    }, false);
    window.addEventListener('mouseup', event=>{
        if ( !_isDragging ) return;
        moveplayhead(event);
        window.removeEventListener('mousemove', moveplayhead, true);
        audioElement.currentTime = audioElement.duration * (event.clientX - UI_Timeline.getBoundingClientRect().left ) / ( UI_Timeline.offsetWidth - UI_Playhead.offsetWidth );
        _isDragging = false;
    }, false);


    // ready!
    return UI_Container;
};

export { Player };