//window.addEventListener('touchstart', (evt) => console.log(evt.touches[0]));
window.addEventListener('touchstart', blah);
window.addEventListener('touchend', (evt) => console.log(evt.touches));
window.addEventListener('mousedown', (evt) => console.log(evt));
window.addEventListener('touchmove', (evt) => console.log(evt.touches));

var safe = false;

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




ipcRenderer.on('message', (event, message) => {
    console.log(message); // logs out "Hello second window!"
    setTimeout( function() {
      console.log("Before sending signal");
      ipcRenderer.send('quitter');
      console.log("after sending signal");
      //app.quit();
      //window.close();
    }, 1000 );
});


function blah(event){
  
  console.log(event);
  
}
