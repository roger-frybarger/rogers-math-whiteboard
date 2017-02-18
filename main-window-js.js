
const {ipcRenderer} = require('electron');
const {dialog} = require('electron').remote;





//window.addEventListener('touchstart', (evt) => console.log(evt.touches[0]));
window.addEventListener('touchstart', tstart);
window.addEventListener('touchend', tend);
window.addEventListener('touchmove', tmove);
window.addEventListener('touchcancel', tcancel);
window.addEventListener('mousedown', mdown);
window.addEventListener('mousemove', mmove);
window.addEventListener('mouseup', mup);

var safeToClose = true; // Eventually, this default will be true.


// Here is the function that executes when the close button signal is sent in from the main process, (main.js).
// It essentially checks to see if it is safe to close the app, and warns the user if it isn't.
ipcRenderer.on('close-button-clicked', () => {
  if(!safeToClose){
    ipcRenderer.send('maximize-main-win');
    var ret = dialog.showMessageBox({ title: 'Warning:', type: 'warning', message: 'Warning: If you proceed, any\nchanges made to this set of\nimages will be lost.', buttons: ['Lose Changes', 'Cancel'], defaultId: 1 });
      
    if(ret == 0){
      ipcRenderer.send('terminate-this-app');
    }
    // If the user chooses to cancel, we will do nothing and let them save the file(s) on their own.
  }
  else{
    ipcRenderer.send('terminate-this-app');
  }
});


function tstart(event){
  
  console.log('touchstart');
  
}

function tend(event){
  
  console.log('touchend');
  
}

function tmove(event){
  
  console.log('touchmove');
  
}

function tcancel(event){
  
  console.log('touchcancel');
  
}

function mdown(event){
  
  console.log('mousedown');
  
}

function mmove(event){
  
  console.log('mousemove');
  
}

function mup(event){
  
  console.log('mouseup');
  
}

function fu(){
  console.log('rtdytrdytrdytrd');
}
