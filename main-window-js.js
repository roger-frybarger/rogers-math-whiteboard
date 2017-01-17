//window.addEventListener('touchstart', (evt) => console.log(evt.touches[0]));
window.addEventListener('touchstart', blah);
window.addEventListener('touchend', (evt) => console.log(evt.touches));
window.addEventListener('mousedown', (evt) => console.log(evt));
window.addEventListener('touchmove', (evt) => console.log(evt.touches));

var safeToClose = false; // Eventually, this default will be true.

//const remote = require('remote');
//remote.getCurrentWindow().on('close', function() {
  //console.log("gfcuytfuyt");
//});

//var app = require('app');

const { ipcRenderer } = require('electron');
const { dialog } = require('electron').remote;


    //window.onbeforeunload = function (e) {
      //e.returnValue = false
    //// window.alert('try to close me');
      //if (true) {
      //// prompt - save or just quit?
        //console.log("prompt here");
        //ipcRenderer.send('quitter');
      //} else {
        //// file is saved and no new work has been done:
        //console.log("Send Message");
        //ipcRenderer.send('quitter');
      //}
    //}




ipcRenderer.on('message', () => {
  if(!safeToClose){
    ipcRenderer.send('maximize-main-win');
    var ret = dialog.showMessageBox({ type: "warning", message: "Warning: If you proceed, any\nchanges made to this set of\nimages will be lost.", buttons: ["Lose Changes", "Cancel"], defaultId: 1 });
      
    if(ret == 0){
      ipcRenderer.send('quitter');
    }
  }
});


function blah(event){
  
  console.log(event);
  
}
