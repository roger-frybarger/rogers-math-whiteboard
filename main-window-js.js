
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

var verticalBtnBarBtnIDs = ['fileBtn', 'colorBtn', 'sizeBtn', 'toolBtn', 'insertPageBtn', 'previousPageBtn', 'nextPageBtn'];

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

function getElementsByIDs(ids){
  if(ids == undefined || (typeof ids != 'object') || (ids.length == 0)){
    console.log('Expecting an array based parameter or there are no ids, exiting');
    return null;
  }
  var elems = [];
  for(var i = 0; i < ids.length; i++){
    elems[i] = document.getElementById(ids[i]);
  }
  
  return elems; 
}

function adjustSizeOfMenuButtonsToScreenSize(){
  //var vButtonBar = document.getElementById('verticalButtonBar');
  //var vButtonBarButtons = vButtonBar.getElementsByTagName('a');
  var vButtonBarButtons = getElementsByIDs(verticalBtnBarBtnIDs);
  
  var dropdowns = [];
  var el = document.getElementById('fileDropdown');
  //console.log(el);
  dropdowns = Array.prototype.slice.call(el.getElementsByTagName('a'));
  //console.log(dropdowns);
  el = document.getElementById('colorDropdown');
  dropdowns = dropdowns.concat(Array.prototype.slice.call(el.getElementsByTagName('a')));
  el = document.getElementById('sizeDropdown');
  dropdowns = dropdowns.concat(Array.prototype.slice.call(el.getElementsByTagName('a')));
  el = document.getElementById('toolDropdown');
  dropdowns = dropdowns.concat(Array.prototype.slice.call(el.getElementsByTagName('a')));
  el = document.getElementById('insertPageDropdown');
  dropdowns = dropdowns.concat(Array.prototype.slice.call(el.getElementsByTagName('a')));
  //console.log(dropdowns);

  //var screenH = screen.height;
  var screenH = window.innerHeight + 30;  // I know this is confusing. Originally I had planned to use screen hight, but then desided to pass in the window height instead.
  console.log(screenH);
  switch (true){
    case (screenH < 720):
      
      for(i = 0; i < vButtonBarButtons.length; ++i){
        vButtonBarButtons[i].style.padding = '15px 0px 14px 16px';
      }
      
      for(i = 0; i < dropdowns.length; ++i){
        dropdowns[i].style.padding = '12px 16px';
      }
      
      //document.getElementById('goBtnDivID').style.padding = '8px 0px 8px 0px';
      
      break;
    case (screenH >= 720 && screenH < 854):
      
      for(i = 0; i < vButtonBarButtons.length; ++i){
        vButtonBarButtons[i].style.padding = '20px 0px 19px 16px';
      }
      
      for(i = 0; i < dropdowns.length; ++i){
        dropdowns[i].style.padding = '17px 16px';
      }
      
      //document.getElementById('goBtnDivID').style.padding = '30px 0px 8px 0px';
      
      break;
    case (screenH >= 854 && screenH < 960):
      
      for(i = 0; i < vButtonBarButtons.length; ++i){
        vButtonBarButtons[i].style.padding = '26px 0px 25px 16px';
      }
      
      for(i = 0; i < dropdowns.length; ++i){
        dropdowns[i].style.padding = '23px 16px';
      }
      
      //document.getElementById('goBtnDivID').style.padding = '30px 0px 8px 0px';
      
      break;
    case (screenH >= 960):
      
      for(i = 0; i < vButtonBarButtons.length; ++i){
        vButtonBarButtons[i].style.padding = '31px 0px 30px 16px';
      }
      
      for(i = 0; i < dropdowns.length; ++i){
        dropdowns[i].style.padding = '28px 16px';
      }
      
      //document.getElementById('goBtnDivID').style.padding = '30px 0px 8px 0px';
      
      break;
    default:
      break;
  }
}



function test(){
  
  console.log('rtdytrdytrdytrd');
}
