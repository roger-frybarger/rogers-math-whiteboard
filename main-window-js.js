
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

var safeToClose = true; // Starting off as true and will be changed once changes are made to the board.


// Here is the function that executes when the close button signal is sent in from the main process, (main.js).
// It essentially delegates the validation work off to the userWantsToClose() function.
ipcRenderer.on('close-button-clicked', () => {
  userWantsToClose();
});

// Here is the function that executes when the user wants to close the program.
// It essentially checks to see if it is safe to close the app, and warns the user if it isn't.
function userWantsToClose(){
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
}


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

function fileBtnFunction(){
  document.getElementById('fileDropdown').classList.toggle('show');
}

function test(){
  
  console.log('rtdytrdytrdytrd');
}
