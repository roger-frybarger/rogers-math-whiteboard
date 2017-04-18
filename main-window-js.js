
const {ipcRenderer} = require('electron');
const {dialog} = require('electron').remote;

const {desktopCapturer} = require('electron');

var fs = require('fs');


const remote = require('electron').remote;
const Menu = remote.Menu;
var theMainWindow = remote.getGlobal('theMainWindow'); // Here we are getting a refference to the main window so we can use
// it for dialoug boxes.

const appVersion = require('electron').remote.app.getVersion();
const osModule = require('os');

// This enables the right-click menu over the text boxes. I found it at:
// https://github.com/electron/electron/issues/4068
const InputMenu = Menu.buildFromTemplate([{
        label: 'Undo',
        role: 'undo',
    }, {
        label: 'Redo',
        role: 'redo',
    }, {
        type: 'separator',
    }, {
        label: 'Cut',
        role: 'cut',
    }, {
        label: 'Copy',
        role: 'copy',
    }, {
        label: 'Paste',
        role: 'paste',
    }, {
        type: 'separator',
    }, {
        label: 'Select all',
        role: 'selectall',
    },
]);



window.addEventListener('resize', onWindowResize);

var userWantsErrorMessages = true





process.on('uncaughtException', function (err) {
  if(userWantsErrorMessages){
    var stk = "Empty :(";
    if(err != null){
      stk = err.stack;
    }
    dialog.showErrorBox('An Error has Occurred.', 'If you continue to receive this error, first check rogersmathwhiteboard.com to see if you are using the latest version of this program. If not, please try out the latest version and see if that resolves the issue. If that does not resolve the issue, please email the following message, along with a description of the problem to rogersmathwhiteboard@gmail.com Doing so will help solve the issue. Alternatively, if the app still seems to function normally despite this error, you can disable error messages in the settings screen. However, be aware that this may cause the app to malfunction further, and potentially become unusable. Here is the error message to send:\n\nThis is Roger\'s Math Whiteboard version ' + appVersion + '\nPlatform: ' + osModule.platform() + ' ' + osModule.arch() + '\nProcess: Render\nStack trace:\n' + stk);
  }
  else{
    throw err;
  }
});



var safeToClose = true; // Starting off as true and will be changed once changes are made to the board.
var allLoaded = false;

// This is the context used for drawing the image on the canvas:
var context;

// This is the context for the canvas used for the original images, which is where the eraser get's its data from.
var eraserContext;


var verticalBtnBarBtnIDs = ['fileBtn', 'colorBtn', 'sizeBtn', 'toolBtn', 'insertPageBtn', 'previousPageBtn', 'nextPageBtn'];


// Some variables used in drawing:
var canUseTool;
var tool = 'pen';
var prevX = 'NA';
var prevY = 'NA';
var instrumentWidth = 5;
var instrumentColor = 'rgba(78, 78, 255, 1.0)';

var maxNumberOfPages = 250;
var globalIntervalVarForFunction = null;
var tempCanvasForInterval = 'NA';
var tempCanvasForPasting = 'NA';
var tempCanvasForCopyPasteStorage = 'NA';
var copiedSectionOfCanvas = 'NA';
var tempX = 'NA';
var tempY = 'NA';
var areaSelected = false;
var tempTool = 'NOT APPLICABLE';

var textToInsert = '';

var imagesChangedSinceOpen = false;

var tempImageForWindowResize;

//var locationToCheckWhenPushingDataIntoLocalStorage;
var weGotKeyboardShortcuts = false;
var temporarilyDisabledKeyboardShortcuts = false;

var counterForRestoringImages;

var arrayOfDataURLsForRestoringDocument;

// var testObjectForStoringGlobalFunctions = {};

var maxUndoHistory = 31;  // This needs to be 1 higher than the actual number of operations desired.
var imageArrayForUndo = new Array(maxUndoHistory);
var currentPlaceInUndoArray;

// This is for re-sizing the drawing area:
var tempForTimer;

var arrayOfCurrentImages = new Array(1);
var arrayOfOriginalImages = new Array(1);
var arrayOfOriginalImagesX = new Array(1);
var arrayOfOriginalImagesY = new Array(1);

var currentPg = 1;

// There must be a better way to do this, probably through CSS, but until I/We figure it out,
// we will need these for various things. One example is where we draw, we need to subtract
// these out to align the mouse to the drawing spot.
var topToolbarWidth = 40;
var SideToolbarWidth = 150;


//function onWindowLoad(){
  //adjustSizeOfMenuButtonsToScreenSize();
//}

// Here is the function that executes when the close button signal is sent in from the main process, (main.js).
// It essentially delegates the validation work off to the userWantsToClose() function.
ipcRenderer.on('close-button-clicked', () => {
  userWantsToClose();
});

ipcRenderer.on('keyboard-shortcuts-not-registered', () => {
  weGotKeyboardShortcuts = false;
  temporarilyDisabledKeyboardShortcuts = false;
});

ipcRenderer.on('ctrl-z-pressed', () => {
  if(canUseTool == false){
    undoBtnFunction();
  }
});

ipcRenderer.on('ctrl-y-pressed', () => {
  if(canUseTool == false){
    redoBtnFunction();
  }
});

ipcRenderer.on('esc-pressed', () => {
  //console.log('Esc Pressed');
  cancelSelect();
  if(canUseTool){
    if(tool == 'line' || tool == 'select' || tool == 'text' || tool == 'identify' || tool == 'dot' || tool == 'PASTE'){
      // Paint the temporary canvas onto the the real canvas:
      context.drawImage(tempCanvasForInterval, 0, 0, context.canvas.width, context.canvas.height);
      // Disable the tool:
      canUseTool = false;
      // Do some cleanup:
      prevX = 'NA';
      prevY = 'NA';
      tempX = 'NA';
      tempY = 'NA';
      areaSelected = false;
    }
  }
});

ipcRenderer.on('alt-p-pressed', () => {
  cancelSelect();
  if(canUseTool == false){
    tool = 'pen';
    updateTextOfToolBtn();
  }
});

ipcRenderer.on('alt-e-pressed', () => {
  cancelSelect();
  if(canUseTool == false){
    tool = 'eraser';
    updateTextOfToolBtn();
  }
});

ipcRenderer.on('alt-l-pressed', () => {
  cancelSelect();
  if(canUseTool == false){
    tool = 'line';
    updateTextOfToolBtn();
  }
});

ipcRenderer.on('alt-s-pressed', () => {
  cancelSelect();
  if(canUseTool == false){
    tool = 'select';
    updateTextOfToolBtn();
  }
});

ipcRenderer.on('alt-i-pressed', () => {
  cancelSelect();
  if(canUseTool == false){
    tool = 'identify';
    updateTextOfToolBtn();
  }
});

ipcRenderer.on('alt-d-pressed', () => {
  cancelSelect();
  if(canUseTool == false){
    tool = 'dot';
    updateTextOfToolBtn();
  }
});

ipcRenderer.on('alt-b-pressed', () => {
  cancelSelect();
  if(canUseTool == false){
    instrumentColor = 'rgba(78, 78, 255, 1.0)';
    updateColorOfColorBtn();
  }
});

ipcRenderer.on('alt-k-pressed', () => {
  cancelSelect();
  if(canUseTool == false){
    instrumentColor = 'rgba(0, 0, 0, 1.0)';
    updateColorOfColorBtn();
  }
});

ipcRenderer.on('alt-r-pressed', () => {
  cancelSelect();
  if(canUseTool == false){
    instrumentColor = 'rgba(255, 0, 0, 1.0)';
    updateColorOfColorBtn();
  }
});

ipcRenderer.on('alt-g-pressed', () => {
  cancelSelect();
  if(canUseTool == false){
    instrumentColor = 'rgba(0, 109, 0, 1.0)';
    updateColorOfColorBtn();
  }
});

ipcRenderer.on('ctrl-a-pressed', () => {
  cancelSelect();
  if(canUseTool == false){
    tool = 'select';
    updateTextOfToolBtn();
    prevX = context.canvas.width;
    prevY = context.canvas.height;
    tempX = 0;
    tempY = 0;
    tempCanvasForInterval = 'NA';
    tempCanvasForInterval = new Image();
    tempCanvasForInterval.src = context.canvas.toDataURL('image/png');
    
    areaSelected = true;
    context.strokeStyle = 'rgba(0, 0, 0, 1.0)';
    context.lineJoin = 'round';
    context.lineWidth = 1;
    context.beginPath();
    // These have to be 1 back from the edges of the canvas so they will be visible.
    context.moveTo(tempX+1, tempY+1);
    context.lineTo(prevX-1, tempY+1);
    context.lineTo(prevX-1, prevY-1);
    context.lineTo(tempX+1, prevY-1);
    context.closePath();
    context.stroke();
    
    var tempWidth = Math.abs(tempX - prevX);
    var tempHeight = Math.abs(tempY - prevY);
    if(tempWidth == 0 || tempHeight == 0){
      cancelSelect();
    }
  }
});

ipcRenderer.on('ctrl-shift-a-pressed', () => {
  cancelSelect();
});

ipcRenderer.on('ctrl-c-pressed', () => {
  if(canUseTool == false){
    copyBtnFunction();
  }
});

ipcRenderer.on('ctrl-v-pressed', () => {
  if(canUseTool == false){
    cancelSelect();
    pasteBtnFunction();
  }
});

ipcRenderer.on('delete-pressed', () => {
  if(canUseTool == false){
    if(areaSelected == true){
      context.drawImage(tempCanvasForInterval, 0, 0, context.canvas.width, context.canvas.height);
      var sx = Math.min(tempX, prevX);
      var sy = Math.min(tempY, prevY);
      var lx = Math.max(tempX, prevX);
      var ly = Math.max(tempY, prevY);
      var tempImageData = eraserContext.getImageData(sx, sy, lx - sx, ly - sy);
      context.putImageData(tempImageData, sx, sy);
      prevX = 'NA';
      prevY = 'NA';
      tempX = 'NA';
      tempY = 'NA';
      areaSelected = false;
      pushStateIntoUndoArray();
    }
    else{
      tellUserToSelectAnAreaFirst();
    }
  }
});

ipcRenderer.on('app-finished-loading', () => {
  document.documentElement.style.overflow = 'hidden';
  adjustSizeOfMenuButtonsToScreenSize();
  initializeGlobalVariables();
  initializeCanvas();
  // Since we have to wait for an image to load, the startup process continues on in the continueAfterAppFinishedLoading1 function.
});

// This function runs after the initializeCanvas() function finishes its job.
function continueAfterAppFinishedLoading1(){
  initializeEventListenersForCanvas();
  initializeEventListenersForExternalDialogs();
  setUpGUIOnStartup();
  checkForScreenSizeIssues();
  allLoaded = true;
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
  //console.log(screenH);
  switch (true){
    case (screenH < 720):
      
      for(i = 0; i < vButtonBarButtons.length; ++i){
        vButtonBarButtons[i].style.padding = '15px 0px 14px 16px';
      }
      
      for(i = 0; i < dropdowns.length; ++i){
        dropdowns[i].style.padding = '12px 16px';
      }
      
      document.getElementById('goBtnDivID').style.padding = '8px 0px 8px 0px';
      
      break;
    case (screenH >= 720 && screenH < 854):
      
      for(i = 0; i < vButtonBarButtons.length; ++i){
        vButtonBarButtons[i].style.padding = '20px 0px 19px 16px';
      }
      
      for(i = 0; i < dropdowns.length; ++i){
        dropdowns[i].style.padding = '17px 16px';
      }
      
      document.getElementById('goBtnDivID').style.padding = '30px 0px 8px 0px';
      
      break;
    case (screenH >= 854 && screenH < 960):
      
      for(i = 0; i < vButtonBarButtons.length; ++i){
        vButtonBarButtons[i].style.padding = '26px 0px 25px 16px';
      }
      
      for(i = 0; i < dropdowns.length; ++i){
        dropdowns[i].style.padding = '23px 16px';
      }
      
      document.getElementById('goBtnDivID').style.padding = '30px 0px 8px 0px';
      
      break;
    case (screenH >= 960):
      
      for(i = 0; i < vButtonBarButtons.length; ++i){
        vButtonBarButtons[i].style.padding = '31px 0px 30px 16px';
      }
      
      for(i = 0; i < dropdowns.length; ++i){
        dropdowns[i].style.padding = '28px 16px';
      }
      
      document.getElementById('goBtnDivID').style.padding = '30px 0px 8px 0px';
      
      break;
    default:
      break;
  }
}

function initializeGlobalVariables(){
  context = document.getElementById('canvas1').getContext('2d');
  eraserContext = document.getElementById('eraserCanvas').getContext('2d');
}

function initializeCanvas(){
  var image = new Image();
  
  // Maybe draw image on canvas temporarily here and get dimensions before re-drawing?
  image.addEventListener('load', function() {
    context.drawImage(image, 0, 0);
    eraserContext.drawImage(image, 0, 0);
    resizeAndLoadImagesOntoCanvases(image, image, image.naturalWidth, image.naturalHeight);
    arrayOfCurrentImages[currentPg - 1] = new Image();
    arrayOfCurrentImages[currentPg - 1].src = context.canvas.toDataURL('image/png');
    arrayOfOriginalImages[currentPg - 1] = new Image();
    arrayOfOriginalImages[currentPg - 1].src = eraserContext.canvas.toDataURL('image/png');
    arrayOfOriginalImagesX[0] = image.naturalWidth;
    arrayOfOriginalImagesY[0] = image.naturalHeight;
    clearUndoHistory();
    continueAfterAppFinishedLoading1();
  }, false);
  image.src = 'images/Blank_White_Page.png';
}

function initializeEventListenersForCanvas(){
  // These add the event listeners to the canvas, and pass the appropriate information off to the applicable
  // function. I feel that we can safely ignore multi-touch, as the intended audience uses a pen anyway,
  // which is only 1 touch. However, one should also be able to use a mouse if no touch input is available.
  document.getElementById('canvas1').addEventListener('mousedown', function(e){
    instrumentDown(e.pageX - this.offsetLeft - SideToolbarWidth, e.pageY - this.offsetTop - topToolbarWidth);
  });

  document.getElementById('canvas1').addEventListener('touchstart', function(e){
    if(e.touches.length == 1)
    {
      instrumentDown(e.changedTouches[0].pageX - this.offsetLeft - SideToolbarWidth, e.changedTouches[0].pageY - this.offsetTop - topToolbarWidth);
      e.preventDefault();
    }
    else
    {
      instrumentUp(prevX, prevY);  // Here we are ignoring multi-touch. It is likely a stray elbow or something anyway, so no real reason to do anything.
    }
  });

  document.getElementById('canvas1').addEventListener('mousemove', function(e){
    instrumentMoved(e.pageX - this.offsetLeft - SideToolbarWidth, e.pageY - this.offsetTop - topToolbarWidth);
  });

  document.getElementById('canvas1').addEventListener('touchmove', function(e){
    instrumentMoved(e.changedTouches[0].pageX - this.offsetLeft - SideToolbarWidth, e.changedTouches[0].pageY - this.offsetTop - topToolbarWidth);
    e.preventDefault();
  });

  document.getElementById('canvas1').addEventListener('mouseup', function(e){
    instrumentUp(e.pageX - this.offsetLeft - SideToolbarWidth, e.pageY - this.offsetTop - topToolbarWidth);
  });

  document.getElementById('canvas1').addEventListener('mouseleave', function(e){
    instrumentUp(e.pageX - this.offsetLeft - SideToolbarWidth, e.pageY - this.offsetTop - topToolbarWidth);
  });

  document.getElementById('canvas1').addEventListener('touchend', function(e){
    instrumentUp(e.changedTouches[0].pageX - this.offsetLeft - SideToolbarWidth, e.changedTouches[0].pageY - this.offsetTop - topToolbarWidth);
  });

  document.getElementById('canvas1').addEventListener('touchleave', function(e){
    instrumentUp(e.changedTouches[0].pageX - this.offsetLeft - SideToolbarWidth, e.changedTouches[0].pageY - this.offsetTop - topToolbarWidth);
  });

  document.getElementById('canvas1').addEventListener('touchcancel', function(e){
    instrumentUp(e.changedTouches[0].pageX - this.offsetLeft - SideToolbarWidth, e.changedTouches[0].pageY - this.offsetTop - topToolbarWidth);
  });
  
  // This enables the right-click menu over the text boxes. I found it at:
  // https://github.com/electron/electron/issues/4068
  
  document.body.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();

      let node = e.target;

      while (node) {
          if (node.nodeName.match(/^(input|textarea)$/i) || node.isContentEditable) {
              InputMenu.popup(remote.getCurrentWindow());
              break;
          }
          node = node.parentNode;
      }
  });
    
  
}

/*
 * Here is the function that innitializes the event listeners for all of the external dialogs.
 * It has to be run only once on startup since runnung it in the code for each window will result
 * in the same functions being added to the events again each time the dialog is opened,
 * which results in noticable slowness.
*/
function initializeEventListenersForExternalDialogs(){
  
  // Here are the event listeners for the otherColorDialog:
  document.getElementById('OCDPickerCanvas').addEventListener('mousedown', function(e){
    var offset = getCoords(document.getElementById('OCDPickerCanvas'));
    //console.log(e.pageX - offset.left);
    //console.log(e.pageY - offset.top);
    OCDOnInstrumentDown(e.pageX - offset.left, e.pageY - offset.top);
  });

  document.getElementById('OCDPickerCanvas').addEventListener('touchstart', function(e){
    if(e.touches.length == 1)
    {
      var offset = getCoords(document.getElementById('OCDPickerCanvas'));
      //console.log(e.pageX - offset.left);
      //console.log(e.pageY - offset.top);
      OCDOnInstrumentDown(e.changedTouches[0].pageX - offset.left, e.changedTouches[0].pageY - offset.top);
      //onInstrumentDown(e.changedTouches[0].pageX - 20, e.changedTouches[0].pageY - 90);
      e.preventDefault();
    }
  });
  
  
}

function setUpGUIOnStartup(){
  updateColorOfColorBtn();
  document.getElementById('toolBtn').innerHTML = 'Tool: P';
  document.getElementById('sizeBtn').innerHTML = 'Size: M';
}

function checkForScreenSizeIssues(){
  var screenX = screen.width;
  var screenY = screen.height;
  //if(true){
  if(screenX < 800 || screenY < 600){
    alert('Your screen resolution is too low to allow this program to display properly. A minimum screen resolution of 800 by 600 is required.', 'Error');
    ipcRenderer.send('terminate-this-app');
  }
  //if(true){
  if(screenX > 1920 || screenY > 1080){
  
    alert('You are using a very high screen resolution. While this is good in most situations, it could potentially cause the following problems in the context of this program:\n\n1. The buttons/menus may be difficult to use with a touchscreen, because they appear smaller.\n\n2. If you broadcast this screen to a remote location, a higher resolution may use more bandwidth, and thus; could result in connection issues.\n\n3. If you record this screen for later viewing, a higher resolution could result in a larger file size, and may require more computing power to create/copy/move/upload, etc.\n\nIf you encounter any of these issues, consider lowering your screen resolution to something below 1920 by 1080.', 'Warning');
  }
}

// Here is the instrumentDown method. It accepts the x and y coordinates of where the tool/instrument started
// touching the main canvas. I am certain that eventually, this method will call other methods that correspond
// to the applicable tools that are available. This is because each tool will likely need to handle the
// event differently.
function instrumentDown(x, y)
{
  // Make sure we know that they may have changed the images(s):
  safeToClose = false;
  tempImageForWindowResize = null;
  
  // Obviously we want to close the dropdowns regardless of what tool is active.
  closeDropdowns();
  
  //And obviously, we can do things with our tool now:
  canUseTool = true;
  
  // Now let's pass the event off to the applicable method:
  switch(tool) {
  case 'pen':
    penToolMethod(x, y, 'down');
    break;
  case 'eraser':
    eraserToolMethod(x, y, 'down');
    break;
  case 'line':
    lineToolMethod(x, y, 'down');
    break;
  case 'select':
    selectToolMethod(x, y, 'down');
    break;
  case 'text':
    textToolMethod(x, y, 'down');
    break;
  case 'identify':
    identifyToolMethod(x, y, 'down');
    break;
  case 'dot':
    dotToolMethod(x, y, 'down');
    break;
  case 'PASTE':
    pasteToolMethod(x, y, 'down');
    break;
  case 'NA':
    break;
  default:
      console.log('ERROR: Invalid tool in instrumentDown method: ' + tool);
  }
}

// Here is the instrumentMoved method, which runs every time our tool is moved. Eventually, I am sure this
// will call multiple methods for the applicable tool, as each tool will likely need to react differently
// to the event.
function instrumentMoved(x, y)
{
  if(canUseTool) // Note: This validation is critical here. Make sure to put future method calls inside of this if structure.
  {
    
    // Now let's pass the event off to the applicable method:
    switch(tool) {
    case 'pen':
      penToolMethod(x, y, 'move');
      break;
    case 'eraser':
      eraserToolMethod(x, y, 'move');
      break;
    case 'line':
      lineToolMethod(x, y, 'move');
      break;
    case 'select':
      selectToolMethod(x, y, 'move');
      break;
    case 'text':
      textToolMethod(x, y, 'move');
      break;
    case 'identify':
      identifyToolMethod(x, y, 'move');
      break;
    case 'dot':
      dotToolMethod(x, y, 'move');
      break;
    case 'PASTE':
      pasteToolMethod(x, y, 'move');
      break;
    case 'NA':
      break;
    default:
        console.log('ERROR: Invalid tool in instrumentMoved method: ' + tool);
    }
  }
}

// Here is the instrumentUp method. This runs every time our tool is picked up off of the page, leaves
// the drawing area, or is canceled by multiple touches on the screen at once. Here again, it is likely that 
// this method will eventually call multiple other methods for the applicable tools, as each tool will
// probably need to handle the event differently.
function instrumentUp(x, y)
{
  if(canUseTool) // Here again, this validation is critical. All future method calls must go inside this if structure
  {
    
 // Now let's pass the event off to the applicable method:
    switch(tool) {
    case 'pen':
      penToolMethod(x, y, 'up');
      pushStateIntoUndoArray();
      break;
    case 'eraser':
      eraserToolMethod(x, y, 'up');
      pushStateIntoUndoArray();
      break;
    case 'line':
      lineToolMethod(x, y, 'up');
      pushStateIntoUndoArray();
      break;
    case 'select':
      selectToolMethod(x, y, 'up');
      break;
    case 'text':
      textToolMethod(x, y, 'up');
      pushStateIntoUndoArray();
      break;
    case 'identify':
      identifyToolMethod(x, y, 'up');
      break;
    case 'dot':
      dotToolMethod(x, y, 'up');
      pushStateIntoUndoArray();
      break;
    case 'PASTE':
      pasteToolMethod(x, y, 'up');
      pushStateIntoUndoArray();
      break;
    case 'NA':
      break;
    default:
        console.log('ERROR: Invalid tool in instrumentUp method: ' + tool);
    }
  }
  
  // Although it may seem counter-intuitive to have this OUTSIDE the validation, I wanted to make sure that 
  // regardless of whether the tool can be used or not; if this method is called, we need to make absolutely
  // sure that more drawing/action CANNOT take place. Remember, this may be called on multi-touch, so we
  // don't want stray lines appearing where they were not intended.
  canUseTool = false;
}

// Here are the functions that actually do the action that each tool needs to do. I have put them in the
// same order that they are in the tool dropdown:


// Here is the penToolMethod. It handles drawing on the canvas:
function penToolMethod(x, y, phase){
  var temp1 = instrumentColor.split(',');
  var temp2 = temp1[3].substring(1, (temp1[3].length - 1));
  var colorNotTransparent;
  if(temp2 == '1.0' || temp2 == '1'){
    colorNotTransparent = true;
  }
  else{
    colorNotTransparent = false;
  }
  switch(phase){
  case 'down':
    
    // These make sense here, because this is the start of drawing, so this point is really only significant
    // as the start of the line drawn when the instrument is moved.
    prevX = x;
    prevY = y;
    
    break;
  case 'move':
    
    context.strokeStyle = instrumentColor;
    context.lineJoin = 'round';
    context.lineWidth = instrumentWidth;
    
    if(colorNotTransparent){
      context.beginPath();
      context.moveTo(prevX, prevY);
      context.lineTo(x, y);
      context.stroke();
    }
    
    context.beginPath();
    context.arc(x, y, (instrumentWidth - 0.3) / 2, 0, 2 * Math.PI, false);
    context.fillStyle = instrumentColor;
    context.fill();
    
    // And of course, the coordinates of the end of this movement need to become the coordinates of the
    // beginning of the next action.
    prevX = x;
    prevY = y;
    
    break;
  case 'up':
    
    context.strokeStyle = instrumentColor;
    context.lineJoin = 'round';
    context.lineWidth = instrumentWidth;
    
    if(colorNotTransparent){
      context.beginPath();
      context.moveTo(prevX, prevY);
      context.lineTo(x, y);
      context.stroke();
    }
    
    context.beginPath();
    context.arc(x, y, instrumentWidth / 2, 0, 2 * Math.PI, false);
    context.fillStyle = instrumentColor;
    context.fill();

    prevX = 'NA';
    prevY = 'NA';
    
    break;
    default:
      console.log('ERROR: Invalid phase in penToolMethod: ' + phase);
    break;
  }
}

// Here is the eraserToolMethod. It handles erasing areas of the canvas:
function eraserToolMethod(x, y, phase){
  // 1. grab section of original image under mouse, 2. draw it over the canvas where it belongs.
  var ofset = Math.pow(instrumentWidth, 2);
  var halfSmallerDimention = parseInt(Math.min(context.canvas.width, context.canvas.height) / 2);
  if(ofset > halfSmallerDimention){
    ofset = halfSmallerDimention;
  }
  var tempImageData = eraserContext.getImageData(x - ofset, y - ofset, 2 * ofset, 2 * ofset);
  context.putImageData(tempImageData, x - ofset, y - ofset);
  
}

// Here is the lineToolMethod. It handles drawing straight lines on the canvas:
function lineToolMethod(x, y, phase){
  switch(phase){
  case 'down':
    
    //      1. save current canvas into tempCanvasForInterval.
    //      2. save x & y into tempX, tempY, prevX & prevY.
    tempCanvasForInterval = 'NA';
    tempCanvasForInterval = new Image();
    tempCanvasForInterval.src = context.canvas.toDataURL('image/png');
    prevX = x;
    prevY = y;
    tempX = x;
    tempY = y;
    
    break;
  case 'move':
    
    // 1. Update prevX & prevY with the current values of x & y.
    // 2. repaint the tempCanvasForInterval onto the real canvas.
    // 3. paint an opaque gray line of set size onto the canvas between the tempX, tempY; and prevX, prevY.
    prevX = x;
    prevY = y;
    
    context.drawImage(tempCanvasForInterval, 0, 0, context.canvas.width, context.canvas.height);
    
    context.strokeStyle = 'rgba(137, 137, 137, 0.6)';
    context.lineJoin = 'round';
    context.lineWidth = instrumentWidth;
    context.beginPath();
    context.moveTo(tempX, tempY);
    context.lineTo(prevX, prevY);
    context.stroke();
    
    break;
  case 'up':
    
    //      1. Paint tempCanvasForInterval onto the real canvas.
    //      2. draw line on real canvas using instrumentColor and instrumentWidth.
    context.drawImage(tempCanvasForInterval, 0, 0, context.canvas.width, context.canvas.height);
    context.strokeStyle = instrumentColor;
    context.lineJoin = 'round';
    context.lineWidth = instrumentWidth;
    context.beginPath();
    context.moveTo(tempX, tempY);
    context.lineTo(prevX, prevY);
    context.stroke();
    
    break;
    default:
      console.log('ERROR: Invalid phase in lineToolMethod: ' + phase);
    break;
  }
}

// Here is the selectToolMethod. It handles selecting areas of the canvas:
function selectToolMethod(x, y, phase){
  switch(phase){
  case 'down':
    
    //      1. call cancelSelect(); if there is already an area selected.
    //      2. save x & y into tempX, tempY, prevX & prevY.
    //      3. save canvas into tempCanvasForInterval.
    cancelSelect();
    prevX = x;
    prevY = y;
    tempX = x;
    tempY = y;
    tempCanvasForInterval = 'NA';
    tempCanvasForInterval = new Image();
    tempCanvasForInterval.src = context.canvas.toDataURL('image/png');
    
    break;
  case 'move':
    
    // 1. Update prevX & prevY with the current values of x & y.
    // 2. repaint the tempCanvasForInterval onto the real canvas.
    // 3. paint 4 opaque gray lines of set size onto the canvas between the tempX, tempY; and prevX, prevY.
    prevX = x;
    prevY = y;
    context.drawImage(tempCanvasForInterval, 0, 0, context.canvas.width, context.canvas.height);
    context.strokeStyle = 'rgba(0, 0, 0, 1.0)';
    context.lineJoin = 'round';
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(tempX, tempY);
    context.lineTo(prevX, tempY);
    context.lineTo(prevX, prevY);
    context.lineTo(tempX, prevY);
    context.closePath();
    context.stroke();
    
    break;
  case 'up':
    
    //      1. Paint tempCanvasForInterval onto the real canvas.
    //      2. draw 4 opaque gray lines of set size onto the canvas between the tempX, tempY; and prevX, prevY.
    //      3. set areaSelected to true, and keep the values in tempCanvasForInterval, tempX, tempY; and prevX, prevY.
    //      4. Calculate width & height of area selected. If either of them are 0, call cancelSelect.
    areaSelected = true;
    context.drawImage(tempCanvasForInterval, 0, 0, context.canvas.width, context.canvas.height);
    context.strokeStyle = 'rgba(0, 0, 0, 1.0)';
    context.lineJoin = 'round';
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(tempX, tempY);
    context.lineTo(prevX, tempY);
    context.lineTo(prevX, prevY);
    context.lineTo(tempX, prevY);
    context.closePath();
    context.stroke();
    
    var tempWidth = Math.abs(tempX - prevX);
    var tempHeight = Math.abs(tempY - prevY);
    if(tempWidth == 0 || tempHeight == 0){
      cancelSelect();
    }
    
    break;
    default:
      console.log('ERROR: Invalid phase in selectToolMethod: ' + phase);
    break;
  }
}

// Here is the textToolMethod. It handles inserting text onto the canvas:
function textToolMethod(x, y, phase){
  switch(phase){
  case 'down':
    
    //      1. save current canvas into tempCanvasForInterval.
    //      2. save x & y into prevX & prevY.
    //      3. draw the first piece of text where it belongs.
    tempCanvasForInterval = 'NA';
    tempCanvasForInterval = new Image();
    tempCanvasForInterval.src = context.canvas.toDataURL('image/png');
    prevX = x;
    prevY = y;
    
    context.font = (instrumentWidth + 8) + 'px sans-serif';
    context.fillStyle = instrumentColor;
    context.fillText(textToInsert, prevX, prevY);
    
    break;
  case 'move':
    
    // Update prevX & prevY with the current values of x & y.
    // Paint the temporary canvas onto the the real canvas:
    // Draw the text:
    prevX = x;
    prevY = y;
    context.drawImage(tempCanvasForInterval, 0, 0, context.canvas.width, context.canvas.height);
    context.font = (instrumentWidth + 8) + 'px sans-serif';
    context.fillStyle = instrumentColor;
    context.fillText(textToInsert, prevX, prevY);
        
    break;
  case 'up':
    
    //      1. Paint tempCanvasForInterval onto the real canvas.
    //      2. paint the text onto the canvas at prevX, prevY.
    context.drawImage(tempCanvasForInterval, 0, 0, context.canvas.width, context.canvas.height);
    context.font = (instrumentWidth + 8) + 'px sans-serif';
    context.fillStyle = instrumentColor;
    context.fillText(textToInsert, prevX, prevY);
    
    break;
    default:
      console.log('ERROR: Invalid phase in textToolMethod: ' + phase);
  }
}

// Here is the identifyToolMethod. It handles identifying areas of the canvas:
function identifyToolMethod(x, y, phase){
  switch(phase){
  case 'down':
    
    //      1. save current canvas into tempCanvasForInterval.
    //      2. save x & y into prevX & prevY.
    //      3. Draw a dot where the mouse went down
    
    tempCanvasForInterval = 'NA';
    tempCanvasForInterval = new Image();
    tempCanvasForInterval.src = context.canvas.toDataURL('image/png');
    prevX = x;
    prevY = y;
    context.beginPath();
    context.arc(prevX, prevY, (instrumentWidth + 8) / 2, 0, 2 * Math.PI, false);
    context.fillStyle = 'rgba(0, 0, 0, 0.5)';
    context.fill();
    
    break;
  case 'move':
    
    // 1. Update prevX & prevY with the current values of x & y.
    // 2. repaint the tempCanvasForInterval onto the real canvas.
    // 3. paint a dot using fixed color & InstrumentWidth onto the canvas at prevX, prevY.
    prevX = x;
    prevY = y;
    context.drawImage(tempCanvasForInterval, 0, 0, context.canvas.width, context.canvas.height);
    context.beginPath();
    context.arc(prevX, prevY, (instrumentWidth + 8) / 2, 0, 2 * Math.PI, false);
    context.fillStyle = 'rgba(0, 0, 0, 0.5)';
    context.fill();
    
    break;
  case 'up':
    
    //      Paint tempCanvasForInterval onto the real canvas.
    
    context.drawImage(tempCanvasForInterval, 0, 0, context.canvas.width, context.canvas.height);
    
    break;
    default:
      console.log('ERROR: Invalid phase in identifierToolMethod: ' + phase);
    break;
  }
}

// Here is the dotToolMethod. It handles putting a dot onto the canvas:
function dotToolMethod(x, y, phase){
  switch(phase){
  case 'down':
    
    //      1. save current canvas into tempCanvasForInterval.
    //      2. save x & y into prevX & prevY.
    //      3. paint a dot on the canvas where the mouse went down
    
    tempCanvasForInterval = 'NA';
    tempCanvasForInterval = new Image();
    tempCanvasForInterval.src = context.canvas.toDataURL('image/png');
    prevX = x;
    prevY = y;
    context.beginPath();
    context.arc(prevX, prevY, (instrumentWidth + 8) / 2, 0, 2 * Math.PI, false);
    context.fillStyle = 'rgba(0, 0, 0, 0.5)';
    context.fill();
    
    break;
  case 'move':
    
    // 1. Update prevX & prevY with the current values of x & y.
    // 2. repaint the tempCanvasForInterval onto the real canvas.
    // 3. paint a dot using fixed color & InstrumentWidth onto the canvas at prevX, prevY.
    prevX = x;
    prevY = y;
    context.drawImage(tempCanvasForInterval, 0, 0, context.canvas.width, context.canvas.height);
    context.beginPath();
    context.arc(prevX, prevY, (instrumentWidth + 8) / 2, 0, 2 * Math.PI, false);
    context.fillStyle = 'rgba(0, 0, 0, 0.5)';
    context.fill();
    
    break;
  case 'up':
    
    //      1. Paint tempCanvasForInterval onto the real canvas.
    //      2. put a dot at prevX, prevY using instrumentColor.
    
    context.drawImage(tempCanvasForInterval, 0, 0, context.canvas.width, context.canvas.height);
    context.beginPath();
    context.arc(prevX, prevY, (instrumentWidth + 8) / 2, 0, 2 * Math.PI, false);
    context.fillStyle = instrumentColor;
    context.fill();
    
    break;
    default:
      console.log('ERROR: Invalid phase in dotToolMethod: ' + phase);
    break;
  }
}

// Here is the pasteToolMethod. It handles pasting onto the canvas:
function pasteToolMethod(x, y, phase){
  if(copiedSectionOfCanvas != 'NA'){
    switch(phase){
    case 'down':
      
      //      1. save current canvas into tempCanvasForInterval.
      //      2. save x & y into prevX & prevY.
      //      3. Put the copied section on the canvas where the mouse went down.
      
      tempCanvasForInterval = 'NA';
      tempCanvasForInterval = new Image();
      tempCanvasForInterval.src = context.canvas.toDataURL('image/png');
      prevX = x;
      prevY = y;
      tempX = x;
      tempY = y;
      context.putImageData(copiedSectionOfCanvas, prevX, (prevY - copiedSectionOfCanvas.height));
      
      break;
    case 'move':
      
      // 1. Update prevX & prevY with the current values of x & y.
      // 2. repaint the tempCanvasForInterval onto the real canvas.
      // 3. paint the image in copiedSectionOfCanvas onto the canvas at prevX, prevY.
      prevX = x;
      prevY = y;
      context.drawImage(tempCanvasForInterval, 0, 0, context.canvas.width, context.canvas.height);
      context.putImageData(copiedSectionOfCanvas, prevX, (prevY - copiedSectionOfCanvas.height));
      
      break;
    case 'up':
      
      //      1. Paint tempCanvasForInterval onto the real canvas.
      //      2. paint the image in tempCanvasForPasting onto the canvas at prevX, prevY.
      context.drawImage(tempCanvasForInterval, 0, 0, context.canvas.width, context.canvas.height);
      context.putImageData(copiedSectionOfCanvas, prevX, (prevY - copiedSectionOfCanvas.height));
      
      break;
      default:
        console.log('ERROR: Invalid phase in pasteToolMethod: ' + phase);
      break;
    }
  }
}

// Here is the function that executes when the user wants to close the program.
// It essentially checks to see if it is safe to close the app, and warns the user if it isn't.
function userWantsToClose(){
  if(!safeToClose){
    ipcRenderer.send('focus-main-win');
    var ret = dialog.showMessageBox(theMainWindow, { title: ' ', type: 'warning', message: 'Warning: If you proceed, any\nchanges made to this set of\nimages will be lost.', buttons: ['Lose Changes', 'Cancel'], defaultId: 1, noLink: true});
      
    if(ret == 0){
      ipcRenderer.send('user-doesnt-want-keyboard-shortcuts');
      weGotKeyboardShortcuts = false;
      ipcRenderer.send('terminate-this-app');
    }
    // If the user chooses to cancel, we will do nothing and let them save the file(s) on their own.
  }
  else{
    ipcRenderer.send('user-doesnt-want-keyboard-shortcuts');
    weGotKeyboardShortcuts = false;
    ipcRenderer.send('terminate-this-app');
  }
}

function onWindowResize()
{
  // First clear the timer, (Remember, if the user is dragging the edge, we only want to fix the image once.)
  clearTimeout(tempForTimer);
  
  // Then set the timer for half a second, so that the re-sizing is not happening continuously:
  tempForTimer = setTimeout(fixThingsAfterRezizeIsDone, 500);
}

function fixThingsAfterRezizeIsDone(){
  cancelSelect();
  //adjustSizeOfMenuButtonsToScreenSize();
  if(allLoaded){
    if(tempImageForWindowResize == null){
      tempImageForWindowResize = new Image();
      tempImageForWindowResize.src = context.canvas.toDataURL('image/png');
      resizeAndLoadImagesOntoCanvases(tempImageForWindowResize, arrayOfOriginalImages[currentPg - 1], tempImageForWindowResize.naturalWidth, tempImageForWindowResize.naturalHeight);
      adjustSizeOfMenuButtonsToScreenSize();
    }
    else{
      resizeAndLoadImagesOntoCanvases(tempImageForWindowResize, arrayOfOriginalImages[currentPg - 1], tempImageForWindowResize.naturalWidth, tempImageForWindowResize.naturalHeight);
      adjustSizeOfMenuButtonsToScreenSize();
    }
  }
}

// If the user clicks on a blank area of the window, the dropdowns should probably close:
window.onclick = function(e) {
  if (!e.target.matches('.dropbtn')) {
    closeDropdowns();
  }
  
  var id = e.target.id;
  if(id != 'canvas1' && id != 'copyBtn' && id != 'drawRectangleBtn' && id != 'fillRectangleBtn' && id != 'drawEllipseBtn' && id != 'fillEllipseBtn' && id != 'topRightMinimizeBtn'){
    cancelSelect();
  }
  if(id != 'pageTextBoxID' && id != 'goBtnID'){
    updatePageNumsOnGui();
  }
}

//Closes all the other dropdowns except for the one with the name passed in.
function closeDropdowns(buttonName){
  var dropdowns = document.getElementsByClassName('dropdown-content');
  for (var d = 0; d < dropdowns.length; d++) {
    var openDropdown = dropdowns[d];
    if (openDropdown.classList.contains('show')) {
      if(openDropdown.id.toString() != buttonName){
        openDropdown.classList.remove('show');
      }
    }
  }
}



function fileBtnFunction(){
  closeDropdowns('fileDropdown');
  document.getElementById('fileDropdown').classList.toggle('show');
}

function toolBtnFunction(){
  closeDropdowns('toolDropdown');
  document.getElementById('toolDropdown').classList.toggle('show');
}

function colorBtnFunction(){
  closeDropdowns('colorDropdown');
  document.getElementById('colorDropdown').classList.toggle('show');
}

function sizeBtnFunction(){
  closeDropdowns('sizeDropdown');
  document.getElementById('sizeDropdown').classList.toggle('show');
}

function insertPageBtnFunction(){
  closeDropdowns('insertPageDropdown');
  document.getElementById('insertPageDropdown').classList.toggle('show');
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




// Here is the function that takes care of scaling the image/drawing area in the optimal way, given the
// size of the window.
function resizeAndLoadImagesOntoCanvases(img, orgImg, incommingWidth, incommingHeight){
  if(incommingWidth == 0 || incommingHeight == 0){
    console.log('ERROR: You have called resizeAndLoadImagesOntoCanvases before the image has loaded!');
  }
  
  eraserContext.canvas.style.position = 'absolute';
  eraserContext.canvas.style.left = SideToolbarWidth + 'px';
  eraserContext.canvas.style.top =  (screen.height + topToolbarWidth) + 'px';

  
  var avalibleWidth = window.innerWidth - SideToolbarWidth;   // Maybe there is a better way to do this than fixed positioning in the CSS?
  var avalibleHeight = window.innerHeight - topToolbarWidth;   // Maybe there is a better way to do this than fixed positioning in the CSS?
  
  
  var proportionalHeight = (incommingHeight * avalibleWidth) / incommingWidth;
  if(proportionalHeight > window.innerHeight - topToolbarWidth)
    {  //this means height is limiting dimension.
      var canvasHeight = avalibleHeight;
      var canvasWidth = (incommingWidth * avalibleHeight) / incommingHeight;
      canvasWidth = Math.round(canvasWidth);   // Without this line the image width is potentially reduced by 1px on every repaint.
      context.canvas.width = canvasWidth;
      context.canvas.height = canvasHeight;
      context.drawImage(img, 0, 0, canvasWidth, canvasHeight);
      eraserContext.canvas.width = canvasWidth;
      eraserContext.canvas.height = canvasHeight;
      eraserContext.drawImage(orgImg, 0, 0, canvasWidth, canvasHeight);
    }
  else
    {  //this means width is limiting dimension.
      var canvasWidth = avalibleWidth;
      var canvasHeight = (incommingHeight * avalibleWidth) / incommingWidth;
      canvasHeight = Math.round(canvasHeight);   // Without this line the image height is potentially reduced by 1px on every repaint.
      context.canvas.width = canvasWidth;
      context.canvas.height = canvasHeight;
      context.drawImage(img, 0, 0, canvasWidth, canvasHeight);
      eraserContext.canvas.width = canvasWidth;
      eraserContext.canvas.height = canvasHeight;
      eraserContext.drawImage(orgImg, 0, 0, canvasWidth, canvasHeight);
    }
}




/*
 * Here is the code related to inserting/removing pages:
*/

function loadPage(numberOfPageToLoad){
  // load the page that was passed in.
  saveCurrentImageToArrayBeforeMoving();
  currentPg = numberOfPageToLoad;
  resizeAndLoadImagesOntoCanvases(arrayOfCurrentImages[currentPg - 1], arrayOfOriginalImages[currentPg - 1], arrayOfOriginalImagesX[currentPg - 1], arrayOfOriginalImagesY[currentPg - 1]);
  updatePageNumsOnGui();
  clearUndoHistory();
}

function insertTemplateAsPage(locationOfTemplate){
  // Get the image from the string that was passed in, then call insertPageUsingImage() and pass in the image.
  var tempImageForInserting = new Image();
  tempImageForInserting.src = locationOfTemplate;
  tempImageForInserting.addEventListener('load', function() {
    insertPageUsingImage(tempImageForInserting);
  }, false);
}

function insertPageUsingImage(img){
  // load the image onto the screen, then into the pages arrays.
  if(arrayOfCurrentImages.length < maxNumberOfPages){
    safeToClose = false;
    tempImageForWindowResize = null;
    saveCurrentImageToArrayBeforeMoving();
    context.drawImage(img, 0, 0);
    eraserContext.drawImage(img, 0, 0);
    resizeAndLoadImagesOntoCanvases(img, img, img.naturalWidth, img.naturalHeight);
    var tempImageForInserting = new Image();
    tempImageForInserting.src = context.canvas.toDataURL('image/png');
    arrayOfCurrentImages.splice(currentPg, 0, tempImageForInserting);
    
    tempImageForInserting.src = eraserContext.canvas.toDataURL('image/png');
    arrayOfOriginalImages.splice(currentPg, 0, tempImageForInserting);
    arrayOfOriginalImagesX.splice(currentPg, 0, img.naturalWidth);
    arrayOfOriginalImagesY.splice(currentPg, 0, img.naturalHeight);
    currentPg++;
    updatePageNumsOnGui();
    clearUndoHistory();
  }
  else{
    tellUserTheyHaveExcededMaxPages();
  }
}

function saveCurrentImageToArrayBeforeMoving(){
  var tempImageForInserting = new Image();
  //console.log(context.canvas.toDataURL('image/png'));
  tempImageForInserting.src = context.canvas.toDataURL('image/png');
  arrayOfCurrentImages[currentPg - 1] = tempImageForInserting;
}

function tellUserTheyHaveExcededMaxPages(){
  // Here we explain why they can't insert another page:
  dialog.showMessageBox(theMainWindow, { title: ' ', type: 'warning', message: 'Sorry, The document can only have up to ' + maxNumberOfPages + ' pages.\nThis leaves you with essentially two options:\n\n1. Save this set of pages and then open another set.\n2. Adjust the \"Max Pages Allowed\" value in the settings to allow more pages to be inserted.\n\nRegardless of which option you choose, please remember that few audiences can absorb ' + maxNumberOfPages +' slides in a single sitting. Thus, consider giving them a short break between sets if possible.', buttons: ['OK'], defaultId: 0, noLink: true});
}

function updatePageNumsOnGui(){
  var box = document.getElementById('pageTextBoxID');
  box.value = currentPg;
  box.style.backgroundColor = 'white';
  box.setAttribute('max', arrayOfCurrentImages.length);
  document.getElementById('totalPagesDivID').innerHTML = 'Total Pages: ' + arrayOfCurrentImages.length;
}

function pageInputBoxValidator(){
  var input = document.getElementById('pageTextBoxID').value;
  var tempNum = parseInt(input);
  if(isNaN(tempNum) || tempNum > arrayOfCurrentImages.length || tempNum < 1){
    document.getElementById('pageTextBoxID').style.backgroundColor = 'red';
  }
  else{
    if(tempNum != currentPg){
      document.getElementById('pageTextBoxID').style.backgroundColor = 'yellow';
    }
    else{
      document.getElementById('pageTextBoxID').style.backgroundColor = 'white';
    }
  }
}

function pageInputBoxCheckForEnter(e){
  var key = e.which || e.keyCode;
  if (key === 13) { // 13 is enter
    goBtnFunction();
  }
}

function previousPageBtnFunction(){
  if(currentPg > 1){
    loadPage(currentPg - 1);
  }
}

function nextPageBtnFunction(){
  if(currentPg < arrayOfCurrentImages.length){
    loadPage(currentPg + 1);
  }
}

function goBtnFunction(){
  var input = document.getElementById('pageTextBoxID').value;
  var tempNum = parseInt(input);
  if(isNaN(tempNum) || tempNum > arrayOfCurrentImages.length || tempNum < 1){
    document.getElementById('pageTextBoxID').style.backgroundColor = 'red';
  }
  else{
    document.getElementById('pageTextBoxID').style.backgroundColor = 'white';
    loadPage(tempNum);
  }
}


function deletePageBtnFunction(){
  if(arrayOfCurrentImages.length > 1){
    //Here we question them if they want to delete the page, and delete it if they say yes.
    
    var ret = dialog.showMessageBox(theMainWindow, { title: ' ', type: 'warning', message: 'Are you sure you want to delete this page?', buttons: ['No', 'Yes'], defaultId: 0, noLink: true});
      
    if(ret == 1){
      //Delete page...
      deleteCurrentPage();
    }
    
  }
  else{
    // Here we tell them that the document must have at least one page:
    alert('The document must have at least one page at all times.\nHowever, you can add another page and then come back and delete this one.', '');
  }
}

function deleteCurrentPage(){
  arrayOfCurrentImages.splice(currentPg - 1, 1);
  arrayOfOriginalImages.splice(currentPg - 1, 1);
  arrayOfOriginalImagesX.splice(currentPg - 1, 1);
  arrayOfOriginalImagesY.splice(currentPg - 1, 1);
  if(currentPg > 1){
    --currentPg;
  }
  resizeAndLoadImagesOntoCanvases(arrayOfCurrentImages[currentPg - 1], arrayOfOriginalImages[currentPg - 1], arrayOfOriginalImagesX[currentPg - 1], arrayOfOriginalImagesY[currentPg - 1]);
  updatePageNumsOnGui();
  clearUndoHistory();
}











function test(){
  
  console.log('rtdytrdytrdytrd');
}

function test2(v){
  
  console.log('test2 happening ' + v);
  
  //console.log(context);

  //document.getElementById('OCDCloseBtn').click();  //Clicking the close btn on dialog after we are done with it.
}


function unregisterShortcutsOnModalDialogOpen(){
  ipcRenderer.send('user-doesnt-want-keyboard-shortcuts');
  temporarilyDisabledKeyboardShortcuts = true;
}

function registerShortcutsOnModalDialogClose(){
  if(temporarilyDisabledKeyboardShortcuts == true && weGotKeyboardShortcuts == true){
    ipcRenderer.send('user-wants-keyboard-shortcuts');
    temporarilyDisabledKeyboardShortcuts = false;
  }
}


// ********* Below is the javascript related to the modal dialogs: **********
// Variables that need to be global but are still only realted to the applicable dialog
// are named beginning with the innitials of the dialoug's id.
// Functions are also named starting with the same innitials.

var SDValid = true;

// Here is the code for the settingsDialog:

function SDReadySettingsDialog(){
  
  if(document.getElementById('canvas1').style.cursor == 'none'){
    document.getElementById('SDRemoveMousePointerOnCanvas').checked = true;
  }
  else{
    document.getElementById('SDRemoveMousePointerOnCanvas').checked = false;
  }
  
  document.getElementById('SDUndoHistoryBox').value = maxUndoHistory - 1;
  document.getElementById('SDMaxPagesAllowedBox').value = maxNumberOfPages;
  
  if(weGotKeyboardShortcuts){
    document.getElementById('SDEnableKeyboardShortcuts').checked = true;
  }
  else{
    document.getElementById('SDEnableKeyboardShortcuts').checked = false;
  }
  
  if(userWantsErrorMessages){
    document.getElementById('SDSilenceErrorMessages').checked = false;
  }
  else{
    document.getElementById('SDSilenceErrorMessages').checked = true;
  }
  SDInputValidation();
}

function SDInputValidation(){
  var rawUndoHistory = parseInt(document.getElementById('SDUndoHistoryBox').value);
  var rawMaxPages = parseInt(document.getElementById('SDMaxPagesAllowedBox').value);
  var undoHistoryGood = false;
  var maxPagesGood = false;
  
  if(isNaN(rawUndoHistory) || rawUndoHistory < 10 || rawUndoHistory > 100){
    undoHistoryGood = false;
    document.getElementById('SDUndoHistoryBox').style.backgroundColor = 'red';
  }
  else{
    undoHistoryGood = true;
    document.getElementById('SDUndoHistoryBox').style.backgroundColor = 'white';
  }
  
  if(isNaN(rawMaxPages) || rawMaxPages < 200 || rawMaxPages > 999){
    maxPagesGood = false;
    document.getElementById('SDMaxPagesAllowedBox').style.backgroundColor = 'red';
  }
  else{
    maxPagesGood = true;
    document.getElementById('SDMaxPagesAllowedBox').style.backgroundColor = 'white';
  }
  
  if(undoHistoryGood && maxPagesGood){
    SDValid = true;
  }
  else{
    SDValid = false;
  }
  
}

function SDOkBtnFunction(){
  //console.log('Settings Function');
  
  if(SDValid){
    
    if(document.getElementById('SDRemoveMousePointerOnCanvas').checked){
      document.getElementById('canvas1').style.cursor = 'none';
    }
    else{
      document.getElementById('canvas1').style.cursor = 'default';
    }
    
    maxUndoHistory = parseInt(document.getElementById('SDUndoHistoryBox').value) + 1;
    maxNumberOfPages = parseInt(document.getElementById('SDMaxPagesAllowedBox').value);
    
    if(document.getElementById('SDEnableKeyboardShortcuts').checked){
      ipcRenderer.send('user-wants-keyboard-shortcuts');
      weGotKeyboardShortcuts = true;
      temporarilyDisabledKeyboardShortcuts = false;
    }
    else{
      ipcRenderer.send('user-doesnt-want-keyboard-shortcuts');
      weGotKeyboardShortcuts = false;
    }
    
    if(document.getElementById('SDSilenceErrorMessages').checked){
      userWantsErrorMessages = false;
      ipcRenderer.send('user-doesnt-want-error-messages');
    }
    else{
      userWantsErrorMessages = true;
      ipcRenderer.send('user-wants-error-messages');
    }
    document.getElementById('SDCloseBtn').click();  //Clicking the close btn on dialog after we are done with it.
  }
}

function SDCheckForEnter(e){
  var key = e.which || e.keyCode;
  if (key === 13) { // 13 is enter
    SDOkBtnFunction();
  }
}

// Here is the code for the insertTextDialog:

var ITDValid = true;

function ITDReadyInsertTextDialog(){
  document.getElementById('ITDTextBox').value = textToInsert;
  ITDValidationFunction();
  document.getElementById('ITDTextBox').focus();
  document.getElementById('ITDTextBox').select();
}

function ITDAddCharacter(chr){
  var textBox = document.getElementById('ITDTextBox');
  var alreadyThere = textBox.value;
  var sStart = textBox.selectionStart;
  var sEnd = textBox.selectionEnd;
  var beforeSelection = alreadyThere.substring(0, sStart);
  var afterSelection = alreadyThere.substring(sEnd);
  textBox.value = beforeSelection + chr + afterSelection;
  textBox.focus();
  textBox.setSelectionRange(sStart + 1, sStart + 1);
  ITDValidationFunction();
}

function ITDBackspace(){
  var textBox = document.getElementById('ITDTextBox');
  var alreadyThere = textBox.value;
  var sStart = textBox.selectionStart;
  var sEnd = textBox.selectionEnd;
  if(sStart == sEnd){
    var beforeSelection = alreadyThere.substring(0, sStart - 1);
    var afterSelection = alreadyThere.substring(sEnd);
    textBox.value = beforeSelection + afterSelection;
    textBox.focus();
    textBox.setSelectionRange(sStart - 1, sStart - 1);
    ITDValidationFunction();
  }
  else{
    var beforeSelection = alreadyThere.substring(0, sStart);
    var afterSelection = alreadyThere.substring(sEnd);
    textBox.value = beforeSelection + afterSelection;
    textBox.focus();
    textBox.setSelectionRange(sStart, sStart);
    ITDValidationFunction();
  }
}

function ITDClear(){
  document.getElementById('ITDTextBox').value = '';
  document.getElementById('ITDTextBox').focus();
  ITDValidationFunction();
}

function ITDValidationFunction(){
  var input = document.getElementById('ITDTextBox').value
  if(input.length < 1){
    ITDValid = false;
    document.getElementById('ITDTextBox').style.backgroundColor = 'red';
  }
  else{
    ITDValid = true;
    document.getElementById('ITDTextBox').style.backgroundColor = 'white';
  }
}

function ITDOkBtnFunction(){
  if(ITDValid){
    textToInsert = document.getElementById('ITDTextBox').value;
    tool = 'text';
    updateTextOfToolBtn();
    document.getElementById('ITDCloseBtn').click();  //Clicking the close btn on dialog after we are done with it.
  }
}

function ITDCheckForEnter(e){
  var key = e.which || e.keyCode;
  if (key === 13) { // 13 is enter
    ITDOkBtnFunction();
  }
}


// Here is the code for the otherColorDialog:

var OCDColor = 'rgba(78, 78, 255, 1.0)';
var OCDRed = 78;
var OCDGreen = 78;
var OCDBlue = 78;
var OCDAlpha = 1.0;
var OCDValid = true;

function OCDReadyOtherColorDialog(){

  // Create the color wheel for them to choose from:
  var canvas = document.getElementById('OCDPickerCanvas');
  var context = canvas.getContext('2d');
  var x = canvas.width / 2;
  var y = canvas.height / 2;
  var radius = 175;
  context.rect(0, 0, canvas.width, canvas.height);
  context.fillStyle = 'white';
  context.fill();
  for(var angle = 0; angle <= 360; angle += 1){
      var startAngle = (angle - 1) * Math.PI / 180;
      var endAngle = (angle + 1) * Math.PI / 180;
      context.beginPath();
      context.moveTo(x, y);
      context.arc(x, y, radius, startAngle, endAngle);
      context.closePath();
      var gradient = context.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0,'hsl('+angle+', 10%, 100%)');
      gradient.addColorStop(1,'hsl('+angle+', 100%, 50%)');
      context.fillStyle = gradient;
      context.fill();
  }
  
  var value = instrumentColor.split(',');
  OCDRed = parseInt(value[0].substring(5));
  OCDGreen = parseInt(value[1].substring(1));
  OCDBlue = parseInt(value[2].substring(1));
  var temp = value[3].substring(1);
  OCDAlpha = parseFloat(temp.substring(0, temp.length - 1));
  
  document.getElementById('OCDRedTextBox').value = OCDRed;
  document.getElementById('OCDRedTextBox').style.backgroundColor = 'white';
  document.getElementById('OCDGreenTextBox').value = OCDGreen;
  document.getElementById('OCDGreenTextBox').style.backgroundColor = 'white';
  document.getElementById('OCDBlueTextBox').value = OCDBlue;
  document.getElementById('OCDBlueTextBox').style.backgroundColor = 'white';
  temp = 100 - (parseInt(OCDAlpha * 100));
  document.getElementById('OCDTransparencyTextBox').value = temp;
  document.getElementById('OCDTransparencyTextBox').style.backgroundColor = 'white';
  document.getElementById('OCDRedTextBox').select();
  
  OCDValidateInputAndUpdateIfApplicable();
  OCDUpdateExample();
  
}

function OCDOnInstrumentDown(x, y){
  if(x < 0){x = 0;}
  if(y < 0){y = 0;}
  
  var canvas = document.getElementById('OCDPickerCanvas');
  var context = canvas.getContext('2d');
  var temp = context.getImageData(x, y, 1, 1);
  OCDRed = temp.data[0];
  OCDGreen = temp.data[1];
  OCDBlue = temp.data[2];
  OCDAlpha = 1.0;
  OCDColor = 'rgba(' + OCDRed + ', ' + OCDGreen + ', ' + OCDBlue + ', ' + OCDAlpha + ')';
  
  document.getElementById('OCDRedTextBox').value = OCDRed;
  document.getElementById('OCDRedTextBox').style.backgroundColor = 'white';
  document.getElementById('OCDGreenTextBox').value = OCDGreen;
  document.getElementById('OCDGreenTextBox').style.backgroundColor = 'white';
  document.getElementById('OCDBlueTextBox').value = OCDBlue;
  document.getElementById('OCDBlueTextBox').style.backgroundColor = 'white';
  temp = 100 - (parseInt(OCDAlpha * 100));
  document.getElementById('OCDTransparencyTextBox').value = temp;
  document.getElementById('OCDTransparencyTextBox').style.backgroundColor = 'white';
  document.getElementById('OCDRedTextBox').select();
  
  OCDValidateInputAndUpdateIfApplicable();
  OCDUpdateExample();
}

function OCDValidateInputAndUpdateIfApplicable(){
  var tempRed = parseInt(document.getElementById('OCDRedTextBox').value);
  var tempGreen = parseInt(document.getElementById('OCDGreenTextBox').value);
  var tempBlue = parseInt(document.getElementById('OCDBlueTextBox').value);
  var tempAlpha = parseInt(document.getElementById('OCDTransparencyTextBox').value);
  
  var redIsGood = false;
  var greenIsGood = false;
  var blueIsGood = false;
  var alphaIsGood = false;

  if(isNaN(tempRed) || tempRed < 0 || tempRed > 255){
    redIsGood = false;
    document.getElementById('OCDRedTextBox').style.backgroundColor = 'red';
  }
  else{
    redIsGood = true;
    document.getElementById('OCDRedTextBox').style.backgroundColor = 'white';
  }
  
  if(isNaN(tempGreen) || tempGreen < 0 || tempGreen > 255){
    greenIsGood = false;
    document.getElementById('OCDGreenTextBox').style.backgroundColor = 'red';
  }
  else{
    greenIsGood = true;
    document.getElementById('OCDGreenTextBox').style.backgroundColor = 'white';
  }
  
  if(isNaN(tempBlue) || tempBlue < 0 || tempBlue > 255){
    blueIsGood = false;
    document.getElementById('OCDBlueTextBox').style.backgroundColor = 'red';
  }
  else{
    blueIsGood = true;
    document.getElementById('OCDBlueTextBox').style.backgroundColor = 'white';
  }
  
  if(isNaN(tempAlpha) || tempAlpha < 0 || tempAlpha > 100){
    alphaIsGood = false;
    document.getElementById('OCDTransparencyTextBox').style.backgroundColor = 'red';
  }
  else{
    alphaIsGood = true;
    document.getElementById('OCDTransparencyTextBox').style.backgroundColor = 'white';
  }
  
  if(redIsGood && greenIsGood && blueIsGood && alphaIsGood){
    OCDValid = true;
    OCDRed = tempRed;
    OCDGreen = tempGreen;
    OCDBlue = tempBlue;
    OCDAlpha = 1.0 - (tempAlpha / 100);
    OCDColor = 'rgba(' + OCDRed + ', ' + OCDGreen + ', ' + OCDBlue + ', ' + OCDAlpha + ')';
    OCDUpdateExample();
  }
  else{
    OCDValid = false;
  }
}

function OCDUpdateExample(){
  var canvas = document.getElementById('OCDColorChosenExampleCanvas');
  var context = canvas.getContext('2d');
  context.rect(0, 0, canvas.width, canvas.height);
  context.fillStyle = 'white';
  context.fill();
  
  context.font = '20px sans-serif';
  context.fillStyle = 'black';
  context.fillText('I\'m Transparent!', 15, 25);
  
  context.rect(0, 0, canvas.width, canvas.height);
  context.fillStyle = OCDColor;
  context.fill();
}

function OCDOkBtnFunction(){
  
  if (OCDValid){
    instrumentColor = OCDColor;
    updateColorOfColorBtn();
    document.getElementById('OCDCloseBtn').click();  //Clicking the close btn on dialog after we are done with it.
  }
}

function OCDCheckForEnter(e){
  var key = e.which || e.keyCode;
  if (key === 13) { // 13 is enter
    OCDOkBtnFunction();
  }
}

// Here is the code for the otherSizeDialog:

var OSDValid = true;

function OSDReadyOtherSizeDialog(){
  document.getElementById('OSDSizeTextBox').value = instrumentWidth;
  document.getElementById('OSDSizeTextBox').select();
}

function OSDAddCharacter(chr){
  var textBox = document.getElementById('OSDSizeTextBox');
  var alreadyThere = textBox.value;
  textBox.value = alreadyThere + chr;
  OSDValidateInput();
}

function OSDBackspace(){
  var textBox = document.getElementById('OSDSizeTextBox');
  var alreadyThere = textBox.value;
  textBox.value = alreadyThere.substring(0, alreadyThere.length-1);
  OSDValidateInput();
}

function OSDClear(){
  document.getElementById('OSDSizeTextBox').value = '';
  document.getElementById('OSDSizeTextBox').focus();
  OSDValidateInput();
}

function OSDValidateInput(){
  var rawInput = parseInt(document.getElementById('OSDSizeTextBox').value);
  if(isNaN(rawInput) || rawInput < 2 || rawInput > 2000){
    OSDValid = false;
    document.getElementById('OSDSizeTextBox').style.backgroundColor = 'red';
  }
  else{
    OSDValid = true;
    document.getElementById('OSDSizeTextBox').style.backgroundColor = 'white';
  }
}

function OSDOkBtnFunction(){
  
  if (OSDValid){
    instrumentWidth = parseInt(document.getElementById('OSDSizeTextBox').value);
    updateTextOfSizeBtn();
    document.getElementById('OSDCloseBtn').click();  //Clicking the close btn on dialog after we are done with it.
  }
}

function OSDCheckForEnter(e){
  var key = e.which || e.keyCode;
    if (key === 13) { // 13 is enter
      OSDOkBtnFunction();
    }
}

// Here is the code for the insertScreenshotDialog:

var ISDCanInsert = false;
var ISDAreaSelected = false;
var ISDScreenShotORIGINAL;

function ISDReadyInsertScreenshotDialog(){
  ISDCanInsert = false;
  ISDAreaSelected = false;
  // get thumnails of each screen/window & insert into the dialog.
  desktopCapturer.getSources({types: ['window', 'screen'], thumbnailSize: {width: 400, height: 400}}, (error, sources) => {
    if (error) {
      alert('Unable to obtain screenshot sources.', 'Error:');
      return;
    }
    // clear out the dialog:
    document.getElementById('ISDContentHeader').innerHTML = 'Click/tap on the screen or window that you would like to capture:<br>Note that this list does not automatically update.';
    document.getElementById("ISDContentDiv").innerHTML = '';
    // Prepare the dialog with some spaces:
    var br = document.createElement('br');
    document.getElementById("ISDContentDiv").appendChild(br);
    document.getElementById("ISDContentDiv").appendChild(br);
    document.getElementById("ISDContentDiv").appendChild(br);
    // Now loop through each source and put its thumbnail in the dialog:
    for (let i = 0; i < sources.length; ++i) {  // For each one we will...
      // Make the image element:
      var elem = document.createElement('img');
      elem.setAttribute('src', sources[i].thumbnail.toDataURL());
      var str = 'ISDThumbnailClicked("' + sources[i].id + '");';
      elem.setAttribute('onclick', str);
      // Make a name element:
      var elem2 = document.createElement('p');
      var str2 = sources[i].name;
      if(str2.length > 40){
        str2 = str2.substring(0, 40) + '...';
      }
      elem2.innerHTML = '↑ ' + str2;
      // Make a line break element:
      var elem3 = document.createElement('br');
      // Add all 3 elements to the dialog:
      document.getElementById("ISDContentDiv").appendChild(elem);
      document.getElementById("ISDContentDiv").appendChild(elem2);
      document.getElementById("ISDContentDiv").appendChild(elem3);
      
    }
  });
  
}

function ISDThumbnailClicked(id){
  // 1. clear out the dialog & put up new message
  document.getElementById('ISDContentHeader').innerHTML = 'Capturing Screenshot...';
  document.getElementById("ISDContentDiv").innerHTML = '';
  // 2. use id to get screenshot of desired thing
  navigator.webkitGetUserMedia({
    audio: false,
    video: {
      mandatory: {
        chromeMediaSource: 'desktop',
        chromeMediaSourceId: id,
        minWidth: 1280,
        maxWidth: 1280,
        minHeight: 720,
        maxHeight: 720
      }
    }
  }, ISDHandleStream, ISDHandleError);

  //console.log(id);
}

function ISDHandleError(e){
  alert('An error occured while obtaining the screenshot. Here is the error:\n\n' + e.name, 'Error:');
}

function ISDHandleStream(stream){
  console.log('got stream');
  
  // Create hidden video tag
  var video = document.createElement('video');
  video.style.cssText = 'position:absolute;top:-10000px;left:-10000px;';
  // Event connected to stream
  video.onloadedmetadata = function () {
    // Set video ORIGINAL height (screenshot)
    video.style.height = this.videoHeight + 'px'; // videoHeight
    video.style.width = this.videoWidth + 'px'; // videoWidth

    // Create canvas
    var canvas = document.createElement('canvas');
    canvas.width = this.videoWidth;
    canvas.height = this.videoHeight;
    var ctx = canvas.getContext('2d');
    // Draw video on canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Save screenshot to base64
    ISDScreenShotORIGINAL = canvas.toDataURL('image/png');
    
    setTimeout(ISDReadyForCroping, 1000);
    //ISDReadyForCroping();

    // Remove hidden video tag
    video.remove();
    try {
        // Destroy connect to stream
        stream.getTracks()[0].stop();
    } catch (e) {}
  }
  video.src = URL.createObjectURL(stream);
  document.body.appendChild(video);
  
}

function ISDReadyForCroping(){
  // 3. re-focus main window
  ipcRenderer.send('focus-main-win');
  // 4. Put screenshot in canvas of right size
  console.log(ISDGetAvaliableDialogSpace());
  // 5. set ISDCanInsert to true & area selected to false.
  // 6. allow croping.
  // 7. If area gets selected, store area & set ISDAreaSelected to true.
  // 8. make btn for de-select.
}

function ISDGetAvaliableDialogSpace(){
  var x = (0.88 * window.innerWidth) - 145; // Note that this will need to be adjusted if the insert screenshot dialog css is changed in the future.
  var y = (0.68 * window.innerHeight) - 21; // Note that this will need to be adjusted if the insert screenshot dialog css is changed in the future.
  x = Math.round(x);
  y = Math.round(y);
  return {avaliableWidth: x, avaliableHeight: y };
}

function ISDOkBtnFunction(){
  // check ISDCanInsert before doing anything.
  // then check if area selected
  // if not, simply grab data & insert.
  // Otherwise, grab data, paint white, paint data in upper corner, grab data & insert, all without degregating image quality.
  // Eventually, after we get the trimmed screenshot & insert it in the appropriate place, we will close:
  document.getElementById('ISDCloseBtn').click();  //Clicking the close btn on dialog after we are done with it.
}


// Here is the code for the otherPageDialog:

function OPDInsertPage(e){
  var locOfTem = e.target.src;
  insertTemplateAsPage(locOfTem);
  document.getElementById('OPDCloseBtn').click();  //Clicking the close btn on dialog after we are done with it.
}

function OPDInsertColoredPage(){
  var whiteImage = new Image();
  whiteImage.addEventListener('load', function() {
    var orgWidth = context.canvas.width;
    var orgHeight = context.canvas.height;
    var originalImageOnCanvas = new Image();
    originalImageOnCanvas.src = context.canvas.toDataURL('image/png');
    context.canvas.width = 2200;
    context.canvas.height = 1700;
    context.drawImage(whiteImage, 0, 0);
    context.fillStyle = instrumentColor;
    context.fillRect(0, 0, context.canvas.width, context.canvas.height);
    var imageToInsert = new Image();
    imageToInsert.src = context.canvas.toDataURL('image/png');
    context.canvas.width = orgWidth;
    context.canvas.height = orgHeight;
    context.drawImage(originalImageOnCanvas, 0, 0);
    insertPageUsingImage(imageToInsert);
  }, false);
  whiteImage.src = 'images/Blank_White_Page.png';
  document.getElementById('OPDCloseBtn').click();  //Clicking the close btn on dialog after we are done with it.
}

function OPDInsertPageFromImage(){
  dialog.showOpenDialog(theMainWindow, { title: 'Open Image', filters: [
   { name: 'Image', extensions: ['png', 'jpeg', 'jpg'] }
    ]}, function (fileNames) {
    if (fileNames === undefined) return;
    var fileName = fileNames[0];
    insertTemplateAsPage(fileName);
    document.getElementById('OPDCloseBtn').click();  //Clicking the close btn on dialog after we are done with it.
 });
}




// ***************************** END OF CODE FOR OTHER WINDOWS!!!




function cancelSelect(){
  if(areaSelected == true){
    context.drawImage(tempCanvasForInterval, 0, 0, context.canvas.width, context.canvas.height);
    prevX = 'NA';
    prevY = 'NA';
    tempX = 'NA';
    tempY = 'NA';
    areaSelected = false;
  }
}








function updateColorOfColorBtn(){
  document.getElementById('colorBtn').style.color = instrumentColor;
}

function updateTextOfSizeBtn(){
  switch(instrumentWidth){
    case 2:
      document.getElementById('sizeBtn').innerHTML = 'Size: S';
    break;
    case 5:
      document.getElementById('sizeBtn').innerHTML = 'Size: M';
    break;
    case 10:
      document.getElementById('sizeBtn').innerHTML = 'Size: L';
    break;
    default:
      document.getElementById('sizeBtn').innerHTML = 'Size: ' + instrumentWidth;
    break;
    
  }
}

function updateTextOfToolBtn(){
  switch(tool){
    case 'pen':
      document.getElementById('toolBtn').innerHTML = 'Tool: P';
    break;
    case 'eraser':
      document.getElementById('toolBtn').innerHTML = 'Tool: E';
    break;
    case 'line':
      document.getElementById('toolBtn').innerHTML = 'Tool: L';
    break;
    case 'select':
      document.getElementById('toolBtn').innerHTML = 'Tool: S';
    break;
    case 'text':
      document.getElementById('toolBtn').innerHTML = 'Tool: T';
    break;
    case 'identify':
      document.getElementById('toolBtn').innerHTML = 'Tool: I';
    break;
    case 'dot':
      document.getElementById('toolBtn').innerHTML = 'Tool: D';
    break;
    case 'PASTE':
      document.getElementById('toolBtn').innerHTML = 'Tool: Paste';
    break;
    default:
      console.log('ERROR: Invalid tool. Cant update tool btn text: ' + tool);
    break;
    
  }
}







// Below are the functions that execute whenever the applicable buttons are clicked.
// They are in order from right to left.

function undoBtnFunction(){
  if(currentPlaceInUndoArray > 0){
    if(imageArrayForUndo[currentPlaceInUndoArray - 1] != null){
      --currentPlaceInUndoArray;
      resizeAndLoadImagesOntoCanvases(imageArrayForUndo[currentPlaceInUndoArray], arrayOfOriginalImages[currentPg - 1], arrayOfOriginalImagesX[currentPg - 1], arrayOfOriginalImagesY[currentPg - 1]);
    }
  }
}

function redoBtnFunction(){
  if(currentPlaceInUndoArray < imageArrayForUndo.length - 1){
    if(imageArrayForUndo[currentPlaceInUndoArray + 1] != null){
      ++currentPlaceInUndoArray;
      resizeAndLoadImagesOntoCanvases(imageArrayForUndo[currentPlaceInUndoArray], arrayOfOriginalImages[currentPg - 1], arrayOfOriginalImagesX[currentPg - 1], arrayOfOriginalImagesY[currentPg - 1]);
    }
  }
}

function copyBtnFunction(){
  if(areaSelected == true){
    
    context.drawImage(tempCanvasForInterval, 0, 0, context.canvas.width, context.canvas.height);
    var drawingX = Math.min(tempX, prevX);
    var drawingY = Math.min(tempY, prevY);
    var drawingWidth = Math.abs(tempX - prevX);
    var drawingHeight = Math.abs(tempY - prevY);
    copiedSectionOfCanvas = 'NA';
    copiedSectionOfCanvas = new Image();
    copiedSectionOfCanvas = context.getImageData(drawingX, drawingY, drawingWidth, drawingHeight);
    
    prevX = 'NA';
    prevY = 'NA';
    tempX = 'NA';
    tempY = 'NA';
    areaSelected = false;
  }
  else{
    tellUserToSelectAnAreaFirst();
  }
}

function pasteBtnFunction(){
  if(copiedSectionOfCanvas != 'NA'){
    tool = 'PASTE';
    updateTextOfToolBtn();
  }
}

function drawRectangleBtnFunction(){
  if(areaSelected == true){
    
    context.drawImage(tempCanvasForInterval, 0, 0, context.canvas.width, context.canvas.height);
    
    context.strokeStyle = instrumentColor;
    context.lineJoin = 'round';
    context.lineWidth = instrumentWidth;
    context.beginPath();
    context.moveTo(tempX, tempY);
    context.lineTo(prevX, tempY);
    context.lineTo(prevX, prevY);
    context.lineTo(tempX, prevY);
    context.closePath();
    context.stroke();
    
    prevX = 'NA';
    prevY = 'NA';
    tempX = 'NA';
    tempY = 'NA';
    areaSelected = false;
    pushStateIntoUndoArray();
  }
  else{
    tellUserToSelectAnAreaFirst();
  }
}

function fillRectangleBtnFunction(){
  if(areaSelected == true){
    
    context.drawImage(tempCanvasForInterval, 0, 0, context.canvas.width, context.canvas.height);
    var drawingX = Math.min(tempX, prevX);
    var drawingY = Math.min(tempY, prevY);
    var drawingWidth = Math.abs(tempX - prevX);
    var drawingHeight = Math.abs(tempY - prevY);
    context.fillStyle = instrumentColor;
    context.fillRect(drawingX, drawingY, drawingWidth, drawingHeight);
    
    prevX = 'NA';
    prevY = 'NA';
    tempX = 'NA';
    tempY = 'NA';
    areaSelected = false;
    pushStateIntoUndoArray();
  }
  else{
    tellUserToSelectAnAreaFirst();
  }
}

function drawEllipseBtnFunction(){
  if(areaSelected == true){
    
    context.drawImage(tempCanvasForInterval, 0, 0, context.canvas.width, context.canvas.height);
    
    var widthOfSelection = Math.abs(tempX - prevX);
    var heightOfSelection = Math.abs(tempY - prevY);
    var minRadius = parseInt(Math.min(widthOfSelection, heightOfSelection) / 2);
    var minX = Math.min(tempX, prevX);
    var minY = Math.min(tempY, prevY);
    var centerOfSelectionX = minX + (parseInt(widthOfSelection / 2));
    var centerOfSelectionY = minY + (parseInt(heightOfSelection / 2));
    var xScaleFactor;
    var yScaleFactor;
    var longerDimention;
    if(widthOfSelection < heightOfSelection){
      // width (x) is limiting:
      xScaleFactor = 1;
      longerDimention = heightOfSelection / 2;
      yScaleFactor = longerDimention / minRadius;
    }
    else{
      // height (y) is limiting or same:
      yScaleFactor = 1;
      longerDimention = widthOfSelection / 2;
      xScaleFactor = longerDimention / minRadius;
    }
    
    context.save();
    context.translate(centerOfSelectionX, centerOfSelectionY);
    context.scale(xScaleFactor, yScaleFactor);
    context.beginPath();
    context.arc(0, 0, minRadius, 0, 2 * Math.PI, false);
    context.restore();
    context.lineWidth = instrumentWidth;
    context.strokeStyle = instrumentColor;
    context.stroke();
    
    prevX = 'NA';
    prevY = 'NA';
    tempX = 'NA';
    tempY = 'NA';
    areaSelected = false;
    pushStateIntoUndoArray();
  }
  else{
    tellUserToSelectAnAreaFirst();
  }
}

function fillEllipseBtnFunction(){
  if(areaSelected == true){
    
    context.drawImage(tempCanvasForInterval, 0, 0, context.canvas.width, context.canvas.height);
    var drawingX = Math.min(tempX, prevX);
    var drawingY = Math.min(tempY, prevY);
    var rw = (Math.abs(tempX - prevX)) / 2;
    var rh = (Math.abs(tempY - prevY)) / 2;
    context.beginPath();
    context.fillStyle = instrumentColor;
    context.ellipse((drawingX + rw), (drawingY + rh), rw, rh, 0, 0, Math.PI*2, false);
    context.fill();
    
    prevX = 'NA';
    prevY = 'NA';
    tempX = 'NA';
    tempY = 'NA';
    areaSelected = false;
    pushStateIntoUndoArray();
  }
  else{
    tellUserToSelectAnAreaFirst();
  }
}







function pushStateIntoUndoArray(){
  //console.log(currentPlaceInUndoArray + ' ' + imageArrayForUndo.length);
  if(currentPlaceInUndoArray != imageArrayForUndo.length - 1){
    //console.log('just undone and moved on');
    // This means they have just undone something, and are going on from there, so we have to get the remainder
    // of the undo array, (if applicable), and make the undo array just contain that. Then re-set the 
    // currentPlaceInUndoArray to imageArrayForUndo.length - 1, and also push in the current state.
    
    var tempArray = imageArrayForUndo.slice(0, currentPlaceInUndoArray + 1);
    var currentImage = new Image();
    currentImage.src = context.canvas.toDataURL('image/png');
    imageArrayForUndo.fill(null);
    for(var i = 0; i < tempArray.length; ++i){
      imageArrayForUndo.push(tempArray[i]);
      imageArrayForUndo.shift();
    }
    imageArrayForUndo.push(currentImage);
    imageArrayForUndo.shift();
    currentPlaceInUndoArray = imageArrayForUndo.length - 1;
    
  }
  else{
    //console.log('tipical storage');
    var tempImageForInserting = new Image();
    tempImageForInserting.src = context.canvas.toDataURL('image/png');
    imageArrayForUndo.push(tempImageForInserting);
    imageArrayForUndo.shift();
  }
  
  //pushDataIntoLocalStorage(context.canvas.toDataURL('image/png'), currentPg - 1, arrayOfCurrentImages.length);
  
}

function clearUndoHistory(){
  // 1. fill array with nulls, 2. grab current image and insert it in last slot, 3. re-set 
  // currentPlaceInUndoArray to imageArrayForUndo.length - 1
  imageArrayForUndo.fill(null);
  var tempImageForInserting = new Image();
  tempImageForInserting.src = context.canvas.toDataURL('image/png');
  imageArrayForUndo.push(tempImageForInserting);
  imageArrayForUndo.shift();
  currentPlaceInUndoArray = imageArrayForUndo.length - 1;
}









function tellUserToSelectAnAreaFirst(){
  // open up a window telling the user to select an area.
  alert('Please use the Select tool to select a region first.', '');
}





// This function was taken from: http://stackoverflow.com/a/26230989
// I appreciate basil's work!!! It works perfectly where nothing else did!
// It essentially returns the current location of the top left corner of 
// the applicable element regardless of where it is in the scrollable
// area. The corrdinates returned are relative to the top left corner of
// the main window. This is great for the modal dialogs, because once
// this location is known, the combination of it and the location of the
// click can be used to calculate the location of the click on the element.
function getCoords(elem) { // crossbrowser version
    var box = elem.getBoundingClientRect();

    var body = document.body;
    var docEl = document.documentElement;

    var scrollTop = window.pageYOffset || docEl.scrollTop || body.scrollTop;
    var scrollLeft = window.pageXOffset || docEl.scrollLeft || body.scrollLeft;

    var clientTop = docEl.clientTop || body.clientTop || 0;
    var clientLeft = docEl.clientLeft || body.clientLeft || 0;

    var top  = box.top +  scrollTop - clientTop;
    var left = box.left + scrollLeft - clientLeft;

    return { top: Math.round(top), left: Math.round(left) };
}
