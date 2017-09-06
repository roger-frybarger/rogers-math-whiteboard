
const { ipcRenderer } = require('electron');
const { dialog } = require('electron').remote;
const { desktopCapturer } = require('electron');
const { clipboard } = require('electron');
const remote = require('electron').remote;
const Menu = remote.Menu;
var theMainWindow = remote.getGlobal('theMainWindow'); // Here we are getting a reference to the main window so we can use
// it for dialog boxes.
const appVersion = require('electron').remote.app.getVersion();
const osModule = require('os');
const path = require('path');
var fs = require('fs');

// This enables the right-click menu over the text boxes.
// It is a simplified/modified version of the code written
// by raleksandar found at:                                 eslint-disable-line spellcheck
// https://github.com/electron/electron/issues/4068
const InputMenu = Menu.buildFromTemplate([{
  label: 'Cut', role: 'cut', },
  { label: 'Copy', role: 'copy', },
  { label: 'Paste', role: 'paste', },
  { type: 'separator', },
  { label: 'Select all', role: 'selectall', },
]);

window.addEventListener('resize', onWindowResize);

var userWantsErrorMessages = true;

var errorTimestampArray = [];

process.on('uncaughtException', function (err){
  if(userWantsErrorMessages){
    var stk = 'Empty :('; // ----Visible!
    if(err !== null && typeof err !== 'undefined'){
      stk = err.stack;
    }
    // eslint-disable-next-line max-len
    dialog.showErrorBox('An Error has Occurred.', 'If you continue to receive this error, first check rogersmathwhiteboard.com to see if you are using the latest version of this program. If not, please try out the latest version and see if that resolves the issue. If that does not resolve the issue, please email the following message, along with a description of the problem to rogersmathwhiteboard@gmail.com Doing so will help solve the issue. Alternatively, if the app still seems to function normally despite this error, you can disable error messages in the settings for this program. However, be aware that this may cause unpredictable behavior. Here is the error message to send:\n\nThis is Roger\'s Math Whiteboard version ' + appVersion + '\nPlatform: ' + osModule.platform() + ' ' + osModule.arch() + '\nProcess: Render\nStack trace:\n' + stk + '\nError:\n' + err);
    // Now we need to 1. push time stamp into array, 2. check if more than
    // 3 errors have occurred within the last 30 seconds. If this is the
    // case, then we will disable error messages and send an appropriate
    // warning to the user.
    var d = new Date();
    var n = d.getTime();
    errorTimestampArray.unshift(n);
    if(errorTimestampArray.length >= 3){
      var dif = errorTimestampArray[0] - errorTimestampArray[2];
      if(dif <= 30000){
        userWantsErrorMessages = false;
        try{
          ipcRenderer.send('user-doesnt-want-error-messages');
        }
        catch (e){
          // Nothing to do in here. We want to try to tell the main process what is going on, but
          // even if that isn't possible, we need to go on with the dialog.
        }
        // eslint-disable-next-line max-len
        dialog.showErrorBox('Multiple Errors Have Occurred. SAVE YOUR WORK NOW!', 'Because at least 3 errors have occurred within the last 30 seconds, error messages have been disabled. This likely means that this program is in an unstable state. YOU SHOULD IMMEDIATELY SAVE YOUR WORK AND RE-START THIS PROGRAM! Also, if you are using the latest stable version of this program, **please** email the following message, along with a description of the problem to rogersmathwhiteboard@gmail.com Doing so is vital to the problem diagnosis process and will hopefully lead to a resolution in the future. We are sorry for any inconvenience this has caused you. Here is the error message to send:\n\nThis is Roger\'s Math Whiteboard version ' + appVersion + '\nPlatform: ' + osModule.platform() + ' ' + osModule.arch() + '\nProcess: Render\nStack trace:\n' + stk + '\nError:\n' + err + '\nPotentially Recursive.');
      }
    }
  }
  else{
    throw err;
  }
});

ipcRenderer.on('recursive-problem-in-main' , () => {
  userWantsErrorMessages = false;
});

var safeToClose = true; // Starting off as true and will be changed once changes are made to the board.
var allLoaded = false;

// *****Here are some global variables that are directly related to drawing & working with the canvas:*****
var context; // This is the context used for drawing the image on the canvas
var eraserContext; // This is the context for the canvas used for the original images,
// which is where the eraser get's its data from.
var canUseTool; // This is used to determine when the tool/instrument can be used. For example, once the mouse is down,
// then the tool/instrument can be used. However, once the mouse is up, the tool/instrument cannot be used any more.
var tool = 'pen';
var prevX = 'NA'; // These two are typically used as the beginning of the line or the previous location of the instrument.
var prevY = 'NA';
var tempX = 'NA'; // These two are typically used to hold the current location of the instrument.
var tempY = 'NA';
var instrumentWidth = 5;
var instrumentColor = 'rgba(78, 78, 255, 1.0)';
var tempCanvasForInterval = 'NA';
var copiedSectionOfCanvas = 'NA';
var copiedSectionOfCanvasForScale = 'NA';
var areaSelected = false;
var textToInsert = '';
var maxUndoHistory = 31;  // This needs to be 1 higher than the actual number of operations desired.
var imageArrayForUndo = new Array(maxUndoHistory);
var currentPlaceInUndoArray;

// *****Here are some global variables that relate more to the programmatic side of things, and
// storing/ keeping track of the images.*****
var tempImageForWindowResize;

var maxNumberOfPages = 250;
var weGotKeyboardShortcuts = false;

var useWidescreenTemplates = false;

var dataUrlsToLoad;
var dataUrlsLoaded;

// This is for re-sizing the drawing area:
var tempForTimer;

// Here are the 4 arrays that store the current and original images and their original dimensions.
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

var hf = '';


// Here is the function that executes when the close button signal is sent in from the main process, (main.js).
// It essentially delegates the validation work off to the userWantsToClose() function.
ipcRenderer.on('close-button-clicked', () => {
  userWantsToClose();
});



ipcRenderer.on('app-finished-loading', () => {
  document.documentElement.style.overflow = 'hidden';
  adjustSizeOfMenuButtonsToScreenSize();
  initializeGlobalVariables();
  initializeCanvas();
  // Since we have to wait for an image to load, the startup process continues on in the
  // continueAfterAppFinishedLoading1 function.
});

// This function runs after the initializeCanvas() function finishes its job.
function continueAfterAppFinishedLoading1(){
  setUpGUIOnStartup();
  checkForScreenSizeIssues();
  enableRightClickMenu();
  document.addEventListener('keydown', validateKeyboardInputForDocument);
  allLoaded = true;
}

ipcRenderer.on('users-home-folder' , function (event , data){
  hf = data.hf;
});

function adjustSizeOfMenuButtonsToScreenSize(){
  // I know it is not good practice to hard-code this here, but I do not expect these to change
  // in any significant way, so for now, I am ok with hard-coding it. Furthermore, adding more
  // buttons to the GUI would take up valuable space. I feel that all the buttons that are necessary
  // are already here, and expandability can come within the drop down menus. In sum, I can't think
  // of a good reason to expand this in the future, so I don't see a problem with hard-coding it:
  var vButtonBarButtons = 
  document.querySelectorAll('#fileBtn, #colorBtn, #sizeBtn, #toolBtn, #insertPageBtn, #previousPageBtn, #nextPageBtn');
  
  // Essentially, this stuff just gets the dropdowns into an array so that we can work with them:
  var dropdowns = [];
  var el = document.getElementById('fileDropdown');
  dropdowns = Array.prototype.slice.call(el.getElementsByTagName('a'));
  el = document.getElementById('colorDropdown');
  dropdowns = dropdowns.concat(Array.prototype.slice.call(el.getElementsByTagName('a')));
  el = document.getElementById('sizeDropdown');
  dropdowns = dropdowns.concat(Array.prototype.slice.call(el.getElementsByTagName('a')));
  el = document.getElementById('toolDropdown');
  dropdowns = dropdowns.concat(Array.prototype.slice.call(el.getElementsByTagName('a')));
  el = document.getElementById('insertPageDropdown');
  dropdowns = dropdowns.concat(Array.prototype.slice.call(el.getElementsByTagName('a')));

  // I know this is confusing. Originally I had planned to use screen height,
  // but then decided to pass in the window height instead.
  var screenH = window.innerHeight + 30;
  
  // Now we will go through and adjust the size of everything so that the dropdowns appropriately use
  // the available screen real estate.
  var i = 0;
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

function initializeGlobalVariables(){ // These have to be done after the app has had a chance to load. Otherwise they will fail.
  context = document.getElementById('canvas1').getContext('2d');
  eraserContext = document.getElementById('eraserCanvas').getContext('2d');
}

function initializeCanvas(){
  var image = new Image();
  
  // Draw image on canvas temporarily here and get dimensions before re-drawing
  image.addEventListener('load', function (){
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
  });
  image.src = 'images/Blank_White_Page.png';
}

// Main canvas mouse down function:
function MCMDown(e){ // eslint-disable-line no-unused-vars
  instrumentDown(e.pageX - SideToolbarWidth, e.pageY - topToolbarWidth);
}

// Main canvas touch down/start function:
function MCTDown(e){ // eslint-disable-line no-unused-vars
  if(e.touches.length === 1){
    instrumentDown(e.changedTouches[0].pageX - SideToolbarWidth, e.changedTouches[0].pageY - topToolbarWidth);
    e.preventDefault();
  }
  else{
    // Here we are ignoring multi-touch. It is likely a stray elbow or something anyway, so no real reason to do anything.
    instrumentUp(prevX, prevY);
  }
}

// Main canvas mouse moved function:
function MCMMoved(e){ // eslint-disable-line no-unused-vars
  instrumentMoved(e.pageX - SideToolbarWidth, e.pageY - topToolbarWidth);
}

// Main canvas touch moved function:
function MCTMoved(e){ // eslint-disable-line no-unused-vars
  instrumentMoved(e.changedTouches[0].pageX - SideToolbarWidth, e.changedTouches[0].pageY - topToolbarWidth);
  e.preventDefault();
}

// Main canvas mouse ended function:
function MCMEnded(e){ // eslint-disable-line no-unused-vars
  instrumentUp(e.pageX - SideToolbarWidth, e.pageY - topToolbarWidth);
}

// Main canvas touch ended function:
function MCTEnded(e){ // eslint-disable-line no-unused-vars
  instrumentUp(e.changedTouches[0].pageX - SideToolbarWidth, e.changedTouches[0].pageY - topToolbarWidth);
}

function setUpGUIOnStartup(){
  updateColorOfColorBtn();
  document.getElementById('toolBtn').innerHTML = 'Tool: P';
  document.getElementById('sizeBtn').innerHTML = 'Size: M';
}

function checkForScreenSizeIssues(){
  var screenX = screen.width;
  var screenY = screen.height;
  if(screenX < 800 || screenY < 600){
    // eslint-disable-next-line max-len
    alert('Your screen resolution is too low to allow this program to display properly. A minimum screen resolution of 800 by 600 is required.', 'Error');
    ipcRenderer.send('terminate-this-app');
  }
  if(screenX > 1920 || screenY > 1080){
    // eslint-disable-next-line max-len
    alert('You are using a very high screen resolution. While this is good in most situations, it could potentially cause the following problems in the context of this program:\n\n1. The buttons/menus may be difficult to use with a touchscreen, because they appear smaller.\n\n2. If you broadcast this screen to a remote location, a higher resolution may use more bandwidth, and thus; could result in connection issues.\n\n3. If you record this screen for later viewing, a higher resolution could result in a larger file size, and may require more computing power to create/copy/move/upload, etc.\n\nIf you encounter any of these issues, consider lowering your screen resolution to something below 1920 by 1080.', 'Warning');
  }
}

function enableRightClickMenu(){
  // This enables the right-click menu over the text boxes.
  // It is a simplified/modified version of the code written
  // by raleksandar found at:                                eslint-disable-line spellcheck
  // https://github.com/electron/electron/issues/4068
  document.body.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    e.stopPropagation();
    let node = e.target;
    while(node){
      if(node.nodeName.match(/^(input|textarea)$/i) || node.isContentEditable){
        InputMenu.popup(remote.getCurrentWindow());
        break;
      }
      node = node.parentNode;
    }
  });
}

function validateKeyboardInputForDocument(e){
  if(weGotKeyboardShortcuts && e.target.nodeName === 'BODY'){
    e.preventDefault();
    passKeyboardInputOffToFunction(e);
  }
}

function recieveKeyboardInputFromCanvas(e){ // eslint-disable-line no-unused-vars
  if(weGotKeyboardShortcuts){
    e.preventDefault();
    passKeyboardInputOffToFunction(e);
  }
}

function passKeyboardInputOffToFunction(e){ // eslint-disable-line max-statements
  if(typeof e === 'undefined'){
    return;
  }
  if(e.ctrlKey === true && e.altKey === false && e.shiftKey === false && e.metaKey === false && e.key === 'z'){
    undoKeyboardShortcutPressed();
    return;
  }
  if(e.ctrlKey === true && e.altKey === false && e.shiftKey === false && e.metaKey === false && e.key === 'y'){
    redoKeyboardShortcutPressed();
    return;
  }
  if(e.ctrlKey === true && e.altKey === false && e.shiftKey === false && e.metaKey === false && e.key === 'c'){
    copyKeyboardShortcutPressed();
    return;
  }
  if(e.ctrlKey === true && e.altKey === false && e.shiftKey === false && e.metaKey === false && e.key === 'v'){
    pasteKeyboardShortcutPressed();
    return;
  }
  if(e.ctrlKey === true && e.altKey === false && e.shiftKey === false && e.metaKey === false && e.key === 's'){
    saveKeyboardShortcutPressed();
    return;
  }
  if(e.ctrlKey === true && e.altKey === false && e.shiftKey === false && e.metaKey === false && e.key === 'a'){
    selectAllKeyboardShortcutPressed();
    return;
  }
  if(e.ctrlKey === true && e.altKey === false && e.shiftKey === true && e.metaKey === false && e.key === 'A'){
    deselectAllKeyboardShortcutPressed();
    return;
  }
  if(e.ctrlKey === false && e.altKey === false && e.shiftKey === false && e.metaKey === false && e.key === 'p'){
    penKeyboardShortcutPressed();
    return;
  }
  if(e.ctrlKey === false && e.altKey === false && e.shiftKey === false && e.metaKey === false && e.key === 'e'){
    eraserKeyboardShortcutPressed();
    return;
  }
  if(e.ctrlKey === false && e.altKey === false && e.shiftKey === false && e.metaKey === false && e.key === 'l'){
    lineKeyboardShortcutPressed();
    return;
  }
  if(e.ctrlKey === false && e.altKey === false && e.shiftKey === false && e.metaKey === false && e.key === 's'){
    selectKeyboardShortcutPressed();
    return;
  }
  if(e.ctrlKey === false && e.altKey === false && e.shiftKey === false && e.metaKey === false && e.key === 'i'){
    identifierKeyboardShortcutPressed();
    return;
  }
  if(e.ctrlKey === false && e.altKey === false && e.shiftKey === false && e.metaKey === false && e.key === 'd'){
    dotKeyboardShortcutPressed();
    return;
  }
  if(e.ctrlKey === false && e.altKey === false && e.shiftKey === false && e.metaKey === false && e.key === 'b'){
    blueKeyboardShortcutPressed();
    return;
  }
  if(e.ctrlKey === false && e.altKey === false && e.shiftKey === false && e.metaKey === false && e.key === 'k'){
    blackKeyboardShortcutPressed();
    return;
  }
  if(e.ctrlKey === false && e.altKey === false && e.shiftKey === false && e.metaKey === false && e.key === 'w'){
    whiteKeyboardShortcutPressed();
    return;
  }
  if(e.ctrlKey === false && e.altKey === false && e.shiftKey === false && e.metaKey === false && e.key === 'r'){
    redKeyboardShortcutPressed();
    return;
  }
  if(e.ctrlKey === false && e.altKey === false && e.shiftKey === false && e.metaKey === false && e.key === 'g'){
    greenKeyboardShortcutPressed();
    return;
  }
  if(e.ctrlKey === false && e.altKey === false && e.shiftKey === false && e.metaKey === false && e.key === ' '){
    nextPageKeyboardShortcutPressed();
    return;
  }
  if(e.ctrlKey === false && e.altKey === false && e.shiftKey === true && e.metaKey === false && e.key === ' '){
    previousPageKeyboardShortcutPressed();
    return;
  }
  if(e.ctrlKey === false && e.altKey === false && e.shiftKey === false && e.metaKey === false && e.key === 'Escape'){
    escapeKeyboardShortcutPressed();
    return;
  }
  if(e.ctrlKey === false && e.altKey === false && e.shiftKey === false && e.metaKey === false && e.key === 'Delete'){
    deleteKeyboardShortcutPressed();
    return;
  }
}

// The next several functions simply perform the applicable tasks when the respective keyboard shortcut is pressed:
function undoKeyboardShortcutPressed(){
  if(canUseTool === false){
    undoBtnFunction();
  }
}

function redoKeyboardShortcutPressed(){
  if(canUseTool === false){
    redoBtnFunction();
  }
}

function copyKeyboardShortcutPressed(){
  if(canUseTool === false){
    copyBtnFunction();
  }
}

function pasteKeyboardShortcutPressed(){
  if(canUseTool === false){
    cancelSelect();
    pasteBtnFunction();
  }
}

function saveKeyboardShortcutPressed(){
  // If save path is empty, open html dialog.
  // Otherwise, just save.
  saveCurrentImageToArrayBeforeMoving();
  if(SIDPath !== ''){
    SIDActuallySaveFiles(true);
  }
  else{
    document.getElementById('saveImagesBtn').click();
  }
}

function selectAllKeyboardShortcutPressed(){
  // The purpose of this function is to select the entire drawing area.
  cancelSelect();
  if(canUseTool === false){
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
    context.moveTo(tempX + 1, tempY + 1);
    context.lineTo(prevX - 1, tempY + 1);
    context.lineTo(prevX - 1, prevY - 1);
    context.lineTo(tempX + 1, prevY - 1);
    context.closePath();
    context.stroke();
    
    var tempWidth = Math.abs(tempX - prevX);
    var tempHeight = Math.abs(tempY - prevY);
    if(tempWidth === 0 || tempHeight === 0){
      cancelSelect();
    }
  }
}

function deselectAllKeyboardShortcutPressed(){
  cancelSelect();
}

function penKeyboardShortcutPressed(){
  cancelSelect();
  if(canUseTool === false){
    tool = 'pen';
    updateTextOfToolBtn();
  }
}

function eraserKeyboardShortcutPressed(){
  cancelSelect();
  if(canUseTool === false){
    tool = 'eraser';
    updateTextOfToolBtn();
  }
}

function lineKeyboardShortcutPressed(){
  cancelSelect();
  if(canUseTool === false){
    tool = 'line';
    updateTextOfToolBtn();
  }
}

function selectKeyboardShortcutPressed(){
  cancelSelect();
  if(canUseTool === false){
    tool = 'select';
    updateTextOfToolBtn();
  }
}

function identifierKeyboardShortcutPressed(){
  cancelSelect();
  if(canUseTool === false){
    tool = 'identify';
    updateTextOfToolBtn();
  }
}

function dotKeyboardShortcutPressed(){
  cancelSelect();
  if(canUseTool === false){
    tool = 'dot';
    updateTextOfToolBtn();
  }
}

function blueKeyboardShortcutPressed(){
  cancelSelect();
  if(canUseTool === false){
    instrumentColor = 'rgba(78, 78, 255, 1.0)';
    updateColorOfColorBtn();
  }
}

function blackKeyboardShortcutPressed(){
  cancelSelect();
  if(canUseTool === false){
    instrumentColor = 'rgba(0, 0, 0, 1.0)';
    updateColorOfColorBtn();
  }
}

function whiteKeyboardShortcutPressed(){
  cancelSelect();
  if(canUseTool === false){
    instrumentColor = 'rgba(255, 255, 255, 1.0)';
    updateColorOfColorBtn();
  }
}

function redKeyboardShortcutPressed(){
  cancelSelect();
  if(canUseTool === false){
    instrumentColor = 'rgba(255, 0, 0, 1.0)';
    updateColorOfColorBtn();
  }
}

function greenKeyboardShortcutPressed(){
  cancelSelect();
  if(canUseTool === false){
    instrumentColor = 'rgba(0, 109, 0, 1.0)';
    updateColorOfColorBtn();
  }
}

function nextPageKeyboardShortcutPressed(){
  nextPageBtnFunction();
}

function previousPageKeyboardShortcutPressed(){
  previousPageBtnFunction();
}

function escapeKeyboardShortcutPressed(){
  // If they press escape, then we should simply cancel whatever it was that they were doing, & paint the
  // temporary canvas on the drawing area.
  cancelSelect();
  if(canUseTool){
    if(tool === 'line' || 
    tool === 'select' || 
    tool === 'text' || 
    tool === 'identify' || 
    tool === 'dot' || 
    tool === 'PASTE' || 
    tool === 'PASTE-S' ||
    tool === 'central-line' || 
    tool === 'dashed-line' || 
    tool === 'dashed-central-line'){
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
}

function deleteKeyboardShortcutPressed(){
  // If delete is pressed, then we will erase the entire area that is selected.
  // Unless they haven't selected anything, in which case we will tell them to select something.
  if(canUseTool === false){
    if(areaSelected === true){
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
}

// Here is the instrumentDown function. It accepts the x and y coordinates of where the tool/instrument started
// touching the main canvas. It then calls other functions that correspond
// to the applicable tools that are available.
function instrumentDown(x, y){
  // Make sure we know that they may have changed the images(s):
  safeToClose = false;
  tempImageForWindowResize = null;
  
  // Obviously we want to close the dropdowns regardless of what tool is active.
  closeDropdowns();
  
  // And obviously, we can do things with our tool now:
  canUseTool = true;
  // Now let's pass the event off to the applicable function:
  switch(tool){
  case 'pen':
    penToolFunction(x, y, 'down');
    break;
  case 'eraser':
    eraserToolFunction(x, y, 'down');
    break;
  case 'line':
    lineToolFunction(x, y, 'down');
    break;
  case 'select':
    selectToolFunction(x, y, 'down');
    break;
  case 'text':
    textToolFunction(x, y, 'down');
    break;
  case 'identify':
    identifyToolFunction(x, y, 'down');
    break;
  case 'dot':
    dotToolFunction(x, y, 'down');
    break;
  case 'PASTE':
    pasteToolFunction(x, y, 'down');
    break;
  case 'central-line':
    centralLineToolFunction(x, y, 'down');
    break;
  case 'dashed-line':
    dashedLineToolFunction(x, y, 'down');
    break;
  case 'dashed-central-line':
    dashedCentralLineToolFunction(x, y, 'down');
    break;
  case 'PASTE-S':
    scaledPasteToolFunction(x, y, 'down');
    break;
  case 'NA':
    break;
  default:
    throw new Error('Invalid tool in instrumentDown function: ' + tool);
  }
}

// Here is the instrumentMoved function, which runs every time our tool/instrument is moved. It passes
// the event off to the applicable which then handles it appropriately.
function instrumentMoved(x, y){
  if(canUseTool){ // Note: This validation is critical here. Make sure to put future function calls inside of this if structure.
    // Now let's pass the event off to the applicable function:
    switch(tool){
    case 'pen':
      penToolFunction(x, y, 'move');
      break;
    case 'eraser':
      eraserToolFunction(x, y, 'move');
      break;
    case 'line':
      lineToolFunction(x, y, 'move');
      break;
    case 'select':
      selectToolFunction(x, y, 'move');
      break;
    case 'text':
      textToolFunction(x, y, 'move');
      break;
    case 'identify':
      identifyToolFunction(x, y, 'move');
      break;
    case 'dot':
      dotToolFunction(x, y, 'move');
      break;
    case 'PASTE':
      pasteToolFunction(x, y, 'move');
      break;
    case 'central-line':
      centralLineToolFunction(x, y, 'move');
      break;
    case 'dashed-line':
      dashedLineToolFunction(x, y, 'move');
      break;
    case 'dashed-central-line':
      dashedCentralLineToolFunction(x, y, 'move');
      break;
    case 'PASTE-S':
      scaledPasteToolFunction(x, y, 'move');
      break;
    case 'NA':
      break;
    default:
      throw new Error('Invalid tool in instrumentMoved function: ' + tool);
    }
  }
}

// Here is the instrumentUp function. This runs every time our tool is picked up off of the page, leaves
// the drawing area, or is canceled by multiple touches on the screen at once. Here again, this function calls
// multiple other functions for the applicable tools, which then handle the event in the appropriate manner.
function instrumentUp(x, y){
  if(canUseTool){ // Here again, this validation is critical. All future function calls must go inside this if structure
    // Now let's pass the event off to the applicable function:
    switch(tool){
    case 'pen':
      penToolFunction(x, y, 'up');
      pushStateIntoUndoArray();
      break;
    case 'eraser':
      eraserToolFunction(x, y, 'up');
      pushStateIntoUndoArray();
      break;
    case 'line':
      lineToolFunction(x, y, 'up');
      pushStateIntoUndoArray();
      break;
    case 'select':
      selectToolFunction(x, y, 'up');
      break;
    case 'text':
      textToolFunction(x, y, 'up');
      pushStateIntoUndoArray();
      break;
    case 'identify':
      identifyToolFunction(x, y, 'up');
      break;
    case 'dot':
      dotToolFunction(x, y, 'up');
      pushStateIntoUndoArray();
      break;
    case 'PASTE':
      pasteToolFunction(x, y, 'up');
      pushStateIntoUndoArray();
      break;
    case 'central-line':
      centralLineToolFunction(x, y, 'up');
      pushStateIntoUndoArray();
      break;
    case 'dashed-line':
      dashedLineToolFunction(x, y, 'up');
      pushStateIntoUndoArray();
      break;
    case 'dashed-central-line':
      dashedCentralLineToolFunction(x, y, 'up');
      pushStateIntoUndoArray();
      break;
    case 'PASTE-S':
      scaledPasteToolFunction(x, y, 'up');
      pushStateIntoUndoArray();
      break;
    case 'NA':
      break;
    default:
      throw new Error('Invalid tool in instrumentUp function: ' + tool);
    }
  }
  
  // Although it may seem counter-intuitive to have this OUTSIDE the validation, I wanted to make sure that 
  // regardless of whether the tool can be used or not; if this function is called, we need to make absolutely
  // sure that more drawing/action CANNOT take place. Remember, this may be called on multi-touch, so we
  // don't want stray lines appearing where they were not intended.
  canUseTool = false;
}

// Here are the functions that actually do the action that each tool needs to do. I have put them in the
// same order that they are in the tool dropdown with the extras below that:


// Here is the penToolFunction. It handles drawing on the canvas:
function penToolFunction(x, y, phase){
  var temp1 = instrumentColor.split(',');
  var temp2 = temp1[3].substring(1, (temp1[3].length - 1));
  var colorNotTransparent;
  if(temp2 === '1.0' || temp2 === '1'){
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
    throw new Error('Invalid phase in penToolFunction: ' + phase);
  }
}

// Here is the eraserToolFunction. It handles erasing areas of the canvas:
function eraserToolFunction(x, y, phase){
  if(phase === 'down' || phase === 'move' || phase === 'up'){
    // 1. grab section of original image under mouse, 2. draw it over the canvas where it belongs.
    var ofset = Math.pow(instrumentWidth, 2);
    var halfSmallerDimention = parseInt(Math.min(context.canvas.width, context.canvas.height) / 2, 10);
    if(ofset > halfSmallerDimention){
      ofset = halfSmallerDimention;
    }
    var tempImageData = eraserContext.getImageData(x - ofset, y - ofset, 2 * ofset, 2 * ofset);
    context.putImageData(tempImageData, x - ofset, y - ofset);
  }
  else{
    throw new Error('Invalid phase in eraserToolFunction: ' + phase);
  }
}

// Here is the lineToolFunction. It handles drawing straight lines on the canvas:
function lineToolFunction(x, y, phase){
  switch(phase){
  case 'down':
    
    //      1. save current canvas into tempCanvasForInterval.
    //      2. save x & y into both the variables that store the start point & the ones that store the current position.
    tempCanvasForInterval = 'NA';
    tempCanvasForInterval = new Image();
    tempCanvasForInterval.src = context.canvas.toDataURL('image/png');
    prevX = x;
    prevY = y;
    tempX = x;
    tempY = y;
    
    break;
  case 'move':
    
    // 1. Update the current position variables with the current values of x & y.
    // 2. repaint the tempCanvasForInterval onto the real canvas.
    // 3. paint an opaque gray line of set size onto the canvas between the starting point & current position.
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
    throw new Error('Invalid phase in lineToolFunction: ' + phase);
  }
}

// Here is the selectToolFunction. It handles selecting areas of the canvas:
function selectToolFunction(x, y, phase){
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
    if(tempWidth === 0 || tempHeight === 0){
      cancelSelect();
    }
    
    break;
  default:
    throw new Error('Invalid phase in selectToolFunction: ' + phase);
  }
}

// Here is the textToolFunction. It handles inserting text onto the canvas:
function textToolFunction(x, y, phase){
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
    throw new Error('Invalid phase in textToolFunction: ' + phase);
  }
}

// Here is the identifyToolFunction. It handles identifying areas of the canvas:
function identifyToolFunction(x, y, phase){
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
    throw new Error('Invalid phase in identifierToolFunction: ' + phase);
  }
}

// Here is the dotToolFunction. It handles putting a dot onto the canvas:
function dotToolFunction(x, y, phase){
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
    throw new Error('Invalid phase in dotToolFunction: ' + phase);
  }
}

// Here is the pasteToolFunction. It handles pasting onto the canvas:
function pasteToolFunction(x, y, phase){
  if(copiedSectionOfCanvas !== 'NA'){
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
      throw new Error('Invalid phase in pasteToolFunction: ' + phase);
    }
  }
}

// Here is the centralLineToolFunction. 
// It handles creating a line centered when the instrument went down:
function centralLineToolFunction(x, y, phase){
  var nx;
  var ny;
  switch(phase){
  case 'down':
    
    //      1. save current canvas into tempCanvasForInterval.
    //      2. save x & y into both the variables that store the start point & the ones that store the current position.
    tempCanvasForInterval = 'NA';
    tempCanvasForInterval = new Image();
    tempCanvasForInterval.src = context.canvas.toDataURL('image/png');
    prevX = x;
    prevY = y;
    tempX = x;
    tempY = y;
    
    break;
  case 'move':
    
    // 1. Update the current position variables with the current values of x & y.
    // 2. repaint the tempCanvasForInterval onto the real canvas.
    // 3. paint an opaque gray line of set size onto the canvas between the starting point & current position.
    prevX = x;
    prevY = y;
    
    context.drawImage(tempCanvasForInterval, 0, 0, context.canvas.width, context.canvas.height);
    
    context.strokeStyle = 'rgba(137, 137, 137, 0.6)';
    context.lineJoin = 'round';
    context.lineWidth = instrumentWidth;
    context.beginPath();
    nx = tempX + (tempX - prevX);
    ny = tempY + (tempY - prevY);
    context.moveTo(nx, ny);
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
    nx = tempX + (tempX - prevX);
    ny = tempY + (tempY - prevY);
    context.moveTo(nx, ny);
    context.lineTo(prevX, prevY);
    context.stroke();
    
    break;
  default:
    throw new Error('Invalid phase in centralLineToolFunction: ' + phase);
  }
}

// Here is the dashedLineToolFunction. It handles creating a dashed line on the canvas:
function dashedLineToolFunction(x, y, phase){
  switch(phase){
  case 'down':
    
    //      1. save current canvas into tempCanvasForInterval.
    //      2. save x & y into both the variables that store the start point & the ones that store the current position.
    tempCanvasForInterval = 'NA';
    tempCanvasForInterval = new Image();
    tempCanvasForInterval.src = context.canvas.toDataURL('image/png');
    prevX = x;
    prevY = y;
    tempX = x;
    tempY = y;
    
    break;
  case 'move':
    
    // 1. Update the current position variables with the current values of x & y.
    // 2. repaint the tempCanvasForInterval onto the real canvas.
    // 3. paint an opaque gray line of set size onto the canvas between the starting point & current position.
    prevX = x;
    prevY = y;
    
    context.drawImage(tempCanvasForInterval, 0, 0, context.canvas.width, context.canvas.height);
    
    context.strokeStyle = 'rgba(137, 137, 137, 0.6)';
    context.lineJoin = 'round';
    context.lineWidth = instrumentWidth;
    context.setLineDash([10, 3]);
    context.beginPath();
    context.moveTo(tempX, tempY);
    context.lineTo(prevX, prevY);
    context.stroke();
    context.setLineDash([]);
    
    break;
  case 'up':
    
    //      1. Paint tempCanvasForInterval onto the real canvas.
    //      2. draw line on real canvas using instrumentColor and instrumentWidth.
    context.drawImage(tempCanvasForInterval, 0, 0, context.canvas.width, context.canvas.height);
    context.strokeStyle = instrumentColor;
    context.lineJoin = 'round';
    context.lineWidth = instrumentWidth;
    context.setLineDash([10, 3]);
    context.beginPath();
    context.moveTo(tempX, tempY);
    context.lineTo(prevX, prevY);
    context.stroke();
    context.setLineDash([]);
    
    break;
  default:
    throw new Error('Invalid phase in centralLineToolFunction: ' + phase);
  }
}

// Here is the dashedCentralLineToolFunction. It handles creating a dashed line
// centered where the instrument went down:
function dashedCentralLineToolFunction(x, y, phase){
  var nx;
  var ny;
  switch(phase){
  case 'down':
    
    //      1. save current canvas into tempCanvasForInterval.
    //      2. save x & y into both the variables that store the start point & the ones that store the current position.
    tempCanvasForInterval = 'NA';
    tempCanvasForInterval = new Image();
    tempCanvasForInterval.src = context.canvas.toDataURL('image/png');
    prevX = x;
    prevY = y;
    tempX = x;
    tempY = y;
    
    break;
  case 'move':
    
    // 1. Update the current position variables with the current values of x & y.
    // 2. repaint the tempCanvasForInterval onto the real canvas.
    // 3. paint an opaque gray line of set size onto the canvas between the starting point & current position.
    prevX = x;
    prevY = y;
    
    context.drawImage(tempCanvasForInterval, 0, 0, context.canvas.width, context.canvas.height);
    
    context.strokeStyle = 'rgba(137, 137, 137, 0.6)';
    context.lineJoin = 'round';
    context.lineWidth = instrumentWidth;
    context.setLineDash([10, 3]);
    context.beginPath();
    nx = tempX + (tempX - prevX);
    ny = tempY + (tempY - prevY);
    context.moveTo(nx, ny);
    context.lineTo(prevX, prevY);
    context.stroke();
    context.setLineDash([]);
    
    break;
  case 'up':
    
    //      1. Paint tempCanvasForInterval onto the real canvas.
    //      2. draw line on real canvas using instrumentColor and instrumentWidth.
    context.drawImage(tempCanvasForInterval, 0, 0, context.canvas.width, context.canvas.height);
    context.strokeStyle = instrumentColor;
    context.lineJoin = 'round';
    context.lineWidth = instrumentWidth;
    context.setLineDash([10, 3]);
    context.beginPath();
    nx = tempX + (tempX - prevX);
    ny = tempY + (tempY - prevY);
    context.moveTo(nx, ny);
    context.lineTo(prevX, prevY);
    context.stroke();
    context.setLineDash([]);
    
    break;
  default:
    throw new Error('Invalid phase in centralLineToolFunction: ' + phase);
  }
}

// Here is the scaledPasteToolFunction. It handles pasting scaled images onto the canvas:
function scaledPasteToolFunction(x, y, phase){
  if(copiedSectionOfCanvasForScale !== 'NA'){
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
      context.putImageData(copiedSectionOfCanvasForScale, prevX, (prevY - copiedSectionOfCanvasForScale.height));
      
      break;
    case 'move':
      
      // 1. Update prevX & prevY with the current values of x & y.
      // 2. repaint the tempCanvasForInterval onto the real canvas.
      // 3. paint the image in copiedSectionOfCanvas onto the canvas at prevX, prevY.
      prevX = x;
      prevY = y;
      context.drawImage(tempCanvasForInterval, 0, 0, context.canvas.width, context.canvas.height);
      context.putImageData(copiedSectionOfCanvasForScale, prevX, (prevY - copiedSectionOfCanvasForScale.height));
      
      break;
    case 'up':
      
      //      1. Paint tempCanvasForInterval onto the real canvas.
      //      2. paint the image in tempCanvasForPasting onto the canvas at prevX, prevY.
      context.drawImage(tempCanvasForInterval, 0, 0, context.canvas.width, context.canvas.height);
      context.putImageData(copiedSectionOfCanvasForScale, prevX, (prevY - copiedSectionOfCanvasForScale.height));
      
      break;
    default:
      throw new Error('Invalid phase in scaledPasteToolFunction: ' + phase);
    }
  }
}

// Here is the function that executes when the user wants to close the program.
// It essentially checks to see if it is safe to close the app, and warns the user if it isn't.
function userWantsToClose(){
  if(!safeToClose){
    ipcRenderer.send('focus-main-win');
    // eslint-disable-next-line max-len
    var ret = dialog.showMessageBox(theMainWindow, { title: ' ', type: 'warning', message: 'Warning: If you proceed, any\nchanges made to this set of\nimages will be lost.', buttons: ['Lose Changes', 'Cancel'], defaultId: 1, noLink: true });
      
    if(ret === 0){
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

// Here is the function that executes every time the window resize event is fired:
function onWindowResize(){
  // First clear the timer, (Remember, if the user is dragging the edge, we only want to fix the image once.)
  clearTimeout(tempForTimer);
  // Then set the timer for half a second, so that the re-sizing is not happening continuously:
  tempForTimer = setTimeout(fixThingsAfterRezizeIsDone, 500);
}

// Here is the function the executes half a second after the user has finished re-sizing the window:
function fixThingsAfterRezizeIsDone(){
  cancelSelect();
  if(allLoaded){
    if(tempImageForWindowResize === null || typeof tempImageForWindowResize === 'undefined'){
      tempImageForWindowResize = new Image();
      tempImageForWindowResize.src = context.canvas.toDataURL('image/png');
      resizeAndLoadImagesOntoCanvases(tempImageForWindowResize, arrayOfOriginalImages[currentPg - 1],
      tempImageForWindowResize.naturalWidth, tempImageForWindowResize.naturalHeight);
      adjustSizeOfMenuButtonsToScreenSize();
    }
    else{
      resizeAndLoadImagesOntoCanvases(tempImageForWindowResize, arrayOfOriginalImages[currentPg - 1],
      tempImageForWindowResize.naturalWidth, tempImageForWindowResize.naturalHeight);
      adjustSizeOfMenuButtonsToScreenSize();
    }
  }
}

// If the user clicks on a blank area of the window, the dropdowns should probably close:
window.onclick = function (e){
  if (!e.target.matches('.dropbtn')){
    closeDropdowns();
  }
  
  var id = e.target.id;
  if(id !== 'canvas1' && id !== 'copyBtn' && id !== 'drawRectangleBtn' && id !== 'fillRectangleBtn' &&
  id !== 'drawEllipseBtn' && id !== 'fillEllipseBtn' && id !== 'topRightMinimizeBtn'){
    cancelSelect();
  }
  if(id !== 'pageTextBoxID' && id !== 'goBtnID'){
    updatePageNumsOnGui();
  }
};

// Closes all the other dropdowns except for the one with the name passed in.
function closeDropdowns(buttonName){
  var dropdowns = document.getElementsByClassName('dropdown-content');
  for (var d = 0; d < dropdowns.length; d++){
    var openDropdown = dropdowns[d];
    if (openDropdown.classList.contains('show')){
      if(openDropdown.id.toString() !== buttonName){
        openDropdown.classList.remove('show');
      }
    }
  }
}

// Here are all of the functions that execute whenever the applicable button on the side bar is clicked or tapped.
// Essentially, they just reveal or hide the applicable dropdown:
function fileBtnFunction(){ // eslint-disable-line no-unused-vars
  closeDropdowns('fileDropdown');
  document.getElementById('fileDropdown').classList.toggle('show');
}

function toolBtnFunction(){ // eslint-disable-line no-unused-vars
  closeDropdowns('toolDropdown');
  document.getElementById('toolDropdown').classList.toggle('show');
}

function colorBtnFunction(){ // eslint-disable-line no-unused-vars
  closeDropdowns('colorDropdown');
  document.getElementById('colorDropdown').classList.toggle('show');
}

function sizeBtnFunction(){ // eslint-disable-line no-unused-vars
  closeDropdowns('sizeDropdown');
  document.getElementById('sizeDropdown').classList.toggle('show');
}

function insertPageBtnFunction(){ // eslint-disable-line no-unused-vars
  closeDropdowns('insertPageDropdown');
  document.getElementById('insertPageDropdown').classList.toggle('show');
}


function loadImagesUsingArrayOfDataURLs(arrayOfURLs){
  arrayOfOriginalImages = [];  // Clear out the arrays that store page data.
  arrayOfCurrentImages = [];
  arrayOfOriginalImagesX = [];
  arrayOfOriginalImagesY = [];
  dataUrlsToLoad = arrayOfURLs.length;
  dataUrlsLoaded = 0;
  for(var i = 0; i < arrayOfURLs.length; ++i){
    var justAnotherTempImage = new Image();
    justAnotherTempImage.onload = loadingFromDataUrlsImageLoaded;
    justAnotherTempImage.theLocationIndex = i;
    justAnotherTempImage.src = arrayOfURLs[i];
  }
}

function loadingFromDataUrlsImageLoaded(){
  arrayOfOriginalImages[this.theLocationIndex] = this;
  arrayOfCurrentImages[this.theLocationIndex] = this;
  arrayOfOriginalImagesX[this.theLocationIndex] = this.naturalWidth;
  arrayOfOriginalImagesY[this.theLocationIndex] = this.naturalHeight;
  ++dataUrlsLoaded;
  if(dataUrlsLoaded === dataUrlsToLoad){
    finishLoadingImagesUsingArrayOfDataURLs();
  }
}

function finishLoadingImagesUsingArrayOfDataURLs(){
  currentPg = 1;
  // eslint-disable-next-line max-len
  resizeAndLoadImagesOntoCanvases(arrayOfCurrentImages[currentPg - 1], arrayOfOriginalImages[currentPg - 1], arrayOfOriginalImagesX[currentPg - 1], arrayOfOriginalImagesY[currentPg - 1]);
  updatePageNumsOnGui();
  clearUndoHistory();
}


// Here is the function that takes care of scaling the image/drawing area in the optimal way, given the
// size of the window.
function resizeAndLoadImagesOntoCanvases(img, orgImg, incommingWidth, incommingHeight){
  if(incommingWidth === 0 || incommingHeight === 0 || typeof incommingWidth === 'undefined' ||
  typeof incommingHeight === 'undefined' || incommingWidth === null || incommingHeight === null){
    throw new Error('resizeAndLoadImagesOntoCanvases has been called before the image has loaded!');
  }
  
  eraserContext.canvas.style.position = 'absolute';
  eraserContext.canvas.style.left = SideToolbarWidth + 'px';
  eraserContext.canvas.style.top =  (screen.height + topToolbarWidth) + 'px';

  // Maybe there is a better way to do this than fixed positioning in the CSS:
  var avalibleWidth = window.innerWidth - SideToolbarWidth;
  var avalibleHeight = window.innerHeight - topToolbarWidth;
  var canvasHeight;
  var canvasWidth;
  
  var proportionalHeight = (incommingHeight * avalibleWidth) / incommingWidth;
  if(proportionalHeight > window.innerHeight - topToolbarWidth){
    // this means height is limiting dimension.
    canvasHeight = avalibleHeight;
    canvasWidth = (incommingWidth * avalibleHeight) / incommingHeight;
    canvasWidth = Math.round(canvasWidth);   // Without this line the image width is potentially reduced by 1 pixel every repaint.
    context.canvas.width = canvasWidth;
    context.canvas.height = canvasHeight;
    context.drawImage(img, 0, 0, canvasWidth, canvasHeight);
    eraserContext.canvas.width = canvasWidth;
    eraserContext.canvas.height = canvasHeight;
    eraserContext.drawImage(orgImg, 0, 0, canvasWidth, canvasHeight);
  }
  else  { // this means width is limiting dimension.
    canvasWidth = avalibleWidth;
    canvasHeight = (incommingHeight * avalibleWidth) / incommingWidth;
    canvasHeight = Math.round(canvasHeight);// Without this line the image height is potentially reduced by 1 pixel every repaint.
    context.canvas.width = canvasWidth;
    context.canvas.height = canvasHeight;
    context.drawImage(img, 0, 0, canvasWidth, canvasHeight);
    eraserContext.canvas.width = canvasWidth;
    eraserContext.canvas.height = canvasHeight;
    eraserContext.drawImage(orgImg, 0, 0, canvasWidth, canvasHeight);
  }
}




// Here is the code related to inserting/removing pages:
function loadPage(numberOfPageToLoad){
  // load the page that was passed in.
  saveCurrentImageToArrayBeforeMoving();
  currentPg = numberOfPageToLoad;
  resizeAndLoadImagesOntoCanvases(arrayOfCurrentImages[currentPg - 1], arrayOfOriginalImages[currentPg - 1],
  arrayOfOriginalImagesX[currentPg - 1], arrayOfOriginalImagesY[currentPg - 1]);
  updatePageNumsOnGui();
  clearUndoHistory();
}

function mainUIInsertTemplateAsPage(location){ // eslint-disable-line no-unused-vars
  if(useWidescreenTemplates){
    var before = location.substring(0, (location.length - 4));
    var combined = before + '-wide.png';
    insertTemplateAsPage(combined);
  }
  else{
    insertTemplateAsPage(location);
  }
}

function insertTemplateAsPage(locationOfTemplate){
  // Get the image from the string that was passed in, then call insertPageUsingImage() and pass in the image.
  var tempImageForInserting = new Image();
  tempImageForInserting.src = locationOfTemplate;
  tempImageForInserting.addEventListener('load', function (){
    insertPageUsingImage(tempImageForInserting);
  });
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
  tempImageForInserting.src = context.canvas.toDataURL('image/png');
  arrayOfCurrentImages[currentPg - 1] = tempImageForInserting;
}

function tellUserTheyHaveExcededMaxPages(){
  // Here we explain why they can't insert another page:
  // eslint-disable-next-line max-len
  dialog.showMessageBox(theMainWindow, { title: ' ', type: 'warning', message: 'Sorry, The document can only have up to ' +  maxNumberOfPages + ' pages.\nThis leaves you with essentially two options:\n\n1. Save this set of pages and then open another set.\n2. Adjust the "Max Pages Allowed" value in the settings to allow more pages to be inserted.\n\nRegardless of which option you choose, please remember that few audiences can absorb ' + maxNumberOfPages + ' slides in a single sitting. Thus, consider giving them a short break between sets if possible.', buttons: ['OK'], defaultId: 0, noLink: true });
}

function updatePageNumsOnGui(){
  var box = document.getElementById('pageTextBoxID');
  box.value = currentPg;
  box.style.backgroundColor = 'white';
  box.setAttribute('max', arrayOfCurrentImages.length);
  document.getElementById('totalPagesDivID').innerHTML = 'Total Pages: ' + arrayOfCurrentImages.length;
}

function pageInputBoxValidator(){ // eslint-disable-line no-unused-vars
  var input = document.getElementById('pageTextBoxID').value;
  var tempNum = parseInt(input, 10);
  if(isNaN(tempNum) || tempNum > arrayOfCurrentImages.length || tempNum < 1){
    document.getElementById('pageTextBoxID').style.backgroundColor = 'red';
  }
  else{
    if(tempNum !== currentPg){
      document.getElementById('pageTextBoxID').style.backgroundColor = 'yellow';
    }
    else{
      document.getElementById('pageTextBoxID').style.backgroundColor = 'white';
    }
  }
}

function pageInputBoxCheckForEnter(e){ // eslint-disable-line no-unused-vars
  var key = e.which || e.keyCode;
  if (key === 13){ // 13 is enter
    goBtnFunction();
  }
}

function previousPageBtnFunction(){ // eslint-disable-line no-unused-vars
  if(currentPg > 1){
    loadPage(currentPg - 1);
  }
}

function nextPageBtnFunction(){ // eslint-disable-line no-unused-vars
  if(currentPg < arrayOfCurrentImages.length){
    loadPage(currentPg + 1);
  }
}

function goBtnFunction(){
  var input = document.getElementById('pageTextBoxID').value;
  var tempNum = parseInt(input, 10);
  if(isNaN(tempNum) || tempNum > arrayOfCurrentImages.length || tempNum < 1){
    document.getElementById('pageTextBoxID').style.backgroundColor = 'red';
  }
  else{
    document.getElementById('pageTextBoxID').style.backgroundColor = 'white';
    loadPage(tempNum);
  }
}


function deletePageBtnFunction(){ // eslint-disable-line no-unused-vars
  if(arrayOfCurrentImages.length > 1){
    // Here we question them if they want to delete the page, and delete it if they say yes.
    // eslint-disable-next-line max-len
    var ret = dialog.showMessageBox(theMainWindow, { title: ' ', type: 'warning', message: 'Are you sure you want to delete this page?', buttons: ['No', 'Yes'], defaultId: 0, noLink: true });
      
    if(ret === 1){
      // Delete the page...
      deleteCurrentPage();
    }
  }
  else{
    // Here we tell them that the document must have at least one page:
    // eslint-disable-next-line max-len
    alert('Sorry, the document must have at least one page at all times.\nHowever, you can add another page and then come back and delete this one.', '');
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
  resizeAndLoadImagesOntoCanvases(arrayOfCurrentImages[currentPg - 1], arrayOfOriginalImages[currentPg - 1],
  arrayOfOriginalImagesX[currentPg - 1], arrayOfOriginalImagesY[currentPg - 1]);
  updatePageNumsOnGui();
  clearUndoHistory();
}

function pasteAndResizeToolFunction(){ // eslint-disable-line no-unused-vars
  var incomming = document.getElementById('OTDPercentInput').value;
  incomming = parseInt(incomming, 10);
  if(isNaN(incomming) || incomming > 400 || incomming < 10){
    alert('Error: Please enter a valid percent.', ' ');
  }
  else{
    if(copiedSectionOfCanvas !== 'NA'){
      var tempCanvas1 = document.createElement('canvas');
      var tempContext1 = tempCanvas1.getContext('2d');
      tempCanvas1.width = copiedSectionOfCanvas.width;
      tempCanvas1.height = copiedSectionOfCanvas.height;
      tempContext1.putImageData(copiedSectionOfCanvas, 0, 0);
      var dataUrl = tempCanvas1.toDataURL();
      var someImage = new Image();
      someImage.theScaleFactor = incomming;
      someImage.onload = function (){
        var tempCanvas2 = document.createElement('canvas');
        var tempContext2 = tempCanvas2.getContext('2d');
        var finalX = this.naturalWidth * (this.theScaleFactor / 100);
        var finalY = this.naturalHeight * (this.theScaleFactor / 100);
        finalX = parseInt(finalX, 10);
        finalY = parseInt(finalY, 10);
        tempCanvas2.width = finalX;
        tempCanvas2.height = finalY;
        tempContext2.drawImage(this, 0, 0, finalX, finalY);
        copiedSectionOfCanvasForScale = tempContext2.getImageData(0, 0, finalX, finalY);
        tool = 'PASTE-S';
        updateTextOfToolBtn();
        OTDCloseDialog();
      };
      someImage.src = dataUrl;
    }
    else{
      tellUserToCopySomethingFirst();
    }
  }
}

function OTDCheckPercentInput(){ // eslint-disable-line no-unused-vars
  var elm = document.getElementById('OTDPercentInput');
  var incomming = elm.value;
  incomming = parseInt(incomming, 10);
  if(isNaN(incomming) || incomming > 400 || incomming < 10){
    elm.style.backgroundColor = 'red';
  }
  else{
    elm.style.backgroundColor = 'white';
  }
}





// ******************************************************************************
// *********                                                           **********
// *********   Below is the javascript related to the modal dialogs:   **********
// *********                                                           **********
// ******************************************************************************
// Variables that need to be global but are still only related to the applicable dialog
// are named beginning with the initials of the dialog's id.
// Functions are also named starting with the same initials.


// Here is the code for the settingsDialog:
var SDValid = true;

function SDReadySettingsDialog(){ // eslint-disable-line no-unused-vars
  if(document.getElementById('canvas1').style.cursor === 'none'){
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
  
  if(useWidescreenTemplates){
    document.getElementById('SDUseWidscreenTemplates').checked = true;
  }
  else{
    document.getElementById('SDUseWidscreenTemplates').checked = false;
  }
  SDInputValidation();
}

function SDInputValidation(){
  var rawUndoHistory = parseInt(document.getElementById('SDUndoHistoryBox').value, 10);
  var rawMaxPages = parseInt(document.getElementById('SDMaxPagesAllowedBox').value, 10);
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
  if(SDValid){
    if(document.getElementById('SDRemoveMousePointerOnCanvas').checked){
      document.getElementById('canvas1').style.cursor = 'none';
    }
    else{
      document.getElementById('canvas1').style.cursor = 'default';
    }
    
    maxUndoHistory = parseInt(document.getElementById('SDUndoHistoryBox').value, 10) + 1;
    SDActuallySetUndoLength();
    maxNumberOfPages = parseInt(document.getElementById('SDMaxPagesAllowedBox').value, 10);
    
    if(document.getElementById('SDEnableKeyboardShortcuts').checked){
      weGotKeyboardShortcuts = true;
    }
    else{
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
    
    if(document.getElementById('SDUseWidscreenTemplates').checked){
      useWidescreenTemplates = true;
    }
    else{
      useWidescreenTemplates = false;
    }
    document.getElementById('SDCloseBtn').click();  // Clicking the close button on dialog after we are done with it.
  }
}

function SDActuallySetUndoLength(){
  var distanceFromEnd = (imageArrayForUndo.length - 1) - currentPlaceInUndoArray;
  if(maxUndoHistory > imageArrayForUndo.length){
    var tempArray = [];
    tempArray.length = maxUndoHistory - imageArrayForUndo.length;
    tempArray.fill(null);
    imageArrayForUndo = tempArray.concat(imageArrayForUndo);
  }
  if(maxUndoHistory < imageArrayForUndo.length){
    var tempArray = imageArrayForUndo.splice((imageArrayForUndo.length - 1) - maxUndoHistory, maxUndoHistory);
    imageArrayForUndo = tempArray;
  }
  currentPlaceInUndoArray = (imageArrayForUndo.length - 1) - distanceFromEnd;
  if(currentPlaceInUndoArray < 0){
    clearUndoHistory();
  }
}

function SDCheckForEnter(e){ // eslint-disable-line no-unused-vars
  var key = e.which || e.keyCode;
  if (key === 13){ // 13 is enter
    SDOkBtnFunction();
  }
}



// Here is the code for the Open Images Dialog:
var OIDHalfMaxPages;
var OIDFilesArray = null;
var OIDTempFilesArray = null;
var OIDFilesHandled;
var OIDFilesToHandle;
var OIDSomeSkipped = false;

function OIDReadyOpenImagesDialog(){ // eslint-disable-line no-unused-vars
  document.getElementById('OIDHeader').innerHTML = 'Open Images';
  OIDHalfMaxPages = Math.round(maxNumberOfPages / 2);
  // Clear out any files that they chose the last time they opened the dialog.
  document.getElementById('OIDChooseFilesBtn').value = '';
  // eslint-disable-next-line max-len
  document.getElementById('OIDImportWarningLine').innerHTML = 'If you try to open/import more than ' + OIDHalfMaxPages + ' images/slides at once, you will find that only the first ' + OIDHalfMaxPages + ' are imported. If you need to import more than ' + OIDHalfMaxPages + ' images/slides, you will need to break them up into sets of ' + OIDHalfMaxPages + ' each. However, remember that few audiences can remain attentive after viewing ' + OIDHalfMaxPages + ' slides in one sitting. Thus; this limit provides a convenient point for a short break if nothing else. Also note that this limit can be adjusted by changing the "Max Pages Allowed" parameter in the settings. It will always be about half of this value.';
  // Clean out some variables:
  OIDFilesArray = [];
  OIDTempFilesArray = [];
  OIDFilesHandled = 0;
  OIDFilesToHandle = 0;
}

function OIDFilesSelectedFunction(){ // eslint-disable-line no-unused-vars
  var files = document.getElementById('OIDChooseFilesBtn').files;
  // First we will check to see if the user selected any files:
  if(files.length !== 0){
    // Now that we know they did select one or more files, let's see if there are unsaved changes to deal with:
    if(safeToClose){
      // Ok, so now we can continue safely:
      OIDCleanArray(files);
    }
    else{
      // Here we have to ask the user if they want to save their changes:
      // eslint-disable-next-line max-len
      var ret = dialog.showMessageBox(theMainWindow, { title: ' ', type: 'warning', message: 'Warning: If you proceed, any changes\nmade to the current set of\nimages will be lost.', buttons: ['Lose Changes', 'Cancel'], defaultId: 1, noLink: true });
        
      if(ret === 0){
        // Here we can continue anyway because the user said it was ok.
        OIDCleanArray(files);
      }
    }
  }
}

function OIDCleanArray(filesArray){
  OIDSomeSkipped = false;
  document.getElementById('OIDHeader').innerHTML = 'Processing...';
  document.getElementById('openImagesDialog').style.cursor = 'wait';
  // First let's get the state of the check box:
  var excludeThumbnails = document.getElementById('OIDIgnoreThumbnailsCheckbox').checked;
  // And calculate the limit for the list of good files:
  var limit = Math.min(filesArray.length, OIDHalfMaxPages);
  
  var i = 0;
  if(excludeThumbnails){
    // If we are excluding thumbnails, then we will go through the filesArray, and...
    for(i = 0; i < filesArray.length; ++i){
      // Check the name for thumb...
      if(filesArray[i].name.substring(0, 5) !== 'thumb'){
        // And if it isn't found, we will check to see that it is a png file within the size limits:
        if(filesArray[i].size > 0 && filesArray[i].size < 25000000 && filesArray[i].type === 'image/png'){
          // If it looks like a good file, we will push it into the array:
          OIDFilesArray.push(filesArray[i]);
          // And quit the loop if the list of good files has reached its size limit:
          if(OIDFilesArray.length >= limit){
            if(OIDFilesArray.length === OIDHalfMaxPages){
              OIDSomeSkipped = true;
            }
            i = filesArray.length;
          }
        }
        else{
          OIDSomeSkipped = true;
        }
      }
    }
  }
  else{
    // If we are not excluding thumbnails, then we will go through the filesArray array, and...
    for(i = 0; i < filesArray.length; ++i){
      // Check to see that it is a png file within the size limits:
      if(filesArray[i].size > 0 && filesArray[i].size < 25000000 && filesArray[i].type === 'image/png'){
        // If it looks like a good file, we will push it into the array:
        OIDFilesArray.push(filesArray[i]);
        // And quit the loop if the list of good files has reached its size limit:
        if(OIDFilesArray.length >= limit){
          if(OIDFilesArray.length === OIDHalfMaxPages){
            OIDSomeSkipped = true;
          }
          i = filesArray.length;
        }
      }
      else{
        OIDSomeSkipped = true;
      }
    }
  }
  // Now let's set up an empty array to use as a landing place for the files as they load asynchronously.
  // Eventually, (once all the files have loaded), we will go through this list and remove any empty entries.
  OIDTempFilesArray = null;
  OIDTempFilesArray = new Array(OIDFilesArray.length);
  OIDTempFilesArray.fill(''); 
  // We also need to know how many files there are that need to be loaded:
  OIDFilesToHandle = OIDFilesArray.length;
  // Now that the array has the correct files in it, we can work on actually loading them:
  OIDActuallyLoadImages();
}

function OIDActuallyLoadImages(){
  // First check to see if there are actually files to load:
  if(OIDFilesToHandle <= 0){
    OIDFinalizeArray();
    return;
  }
  // Loop through the list of files to load and...
  for(var i = 0; i < OIDFilesToHandle; ++i){
    // Give each file a new FileReader object with...
    var reader = new FileReader();
    // The current index of the loop, so that we know where each image should be placed in
    // the array of landing places:
    reader.theIndex = i;
    // An onload function that places the base64 data url into the applicable location in the
    // array of landing places once the image finishes loading, and then checks to see if all
    // of the images have been handled:
    reader.onload = OIDOnImageLoaded;
    // An onerror function that simply checks to see if all of the images have been handled:
    reader.onerror = OIDLoadFailed;
    // And finally, the file to load:
    reader.readAsDataURL(OIDFilesArray[i]);
  }
}

function OIDOnImageLoaded(e){
  OIDTempFilesArray[this.theIndex] = e.target.result;
  OIDIncrementAndCheck();
}

function OIDLoadFailed(){
  OIDIncrementAndCheck();
  OIDSomeSkipped = true;
}

function OIDIncrementAndCheck(){
  // Each time this function is called, it means that either:
  // 1. A file has finished loading, or:
  // 2. A file has failed to load.
  // In either case, we need to keep track of how many files have handled so that
  // we can move on to the next step once all of them have been handled. Thus:
  // we will increment the OIDFilesHandled counter, and...
  ++OIDFilesHandled;
  document.getElementById('OIDHeader').innerHTML = 'Processing file ' + OIDFilesHandled + ' of ' + OIDFilesToHandle;
  // check to see if all of the files have been handled:
  if(OIDFilesHandled === OIDFilesToHandle){
    // If they have all been handled, we will move on to the next step:
    OIDFinalizeArray();
  }
}

function OIDFinalizeArray(){
  document.getElementById('OIDHeader').innerHTML = 'Cleaning Up...';
  // Here is where we need to go through the temp array and remove any empty or invalid entries.
  // From there, we can assign the temp array to the main one & null out the temp one.
  
  // First, let's copy all of the entries in the OIDTempFilesArray into a different
  // local array so that if somehow OIDTempFilesArray changes while we are working,
  // we will be working on a snapshot of it instead of the real thing:
  var tmp = [];
  var i = 0;
  for(i = 0; i < OIDTempFilesArray.length; ++i){
    tmp.push(OIDTempFilesArray[i]);
  }
  // Now we will empty out the main OIDFilesArray...
  OIDFilesArray = [];
  // And loop through the local array and only push entries into the main array if they are not empty
  // and seem to be valid png images:
  for(i = 0; i < tmp.length; ++i){
    if(tmp[i] !== ''){
      if(checkPNGImage(tmp[i])){
        OIDFilesArray.push(tmp[i]);
      }
      else{
        OIDSomeSkipped = true;
      }
    }
  }
  
  // Now that the main array has the finalized set of data URLs in it, it is time for some cleanup:
  tmp = [];
  OIDTempFilesArray = [];
  // Let's also let the user know how things worked out:
  OIDInformIfNecessary();
  // And loading the end result if that is possible:
  if(OIDFilesArray.length > 0){
    loadImagesUsingArrayOfDataURLs(OIDFilesArray);
  }
  else{
    alert('Error: No valid images were found', '');
  }
  // And finally, the last bit of cleanup:
  OIDFilesArray = [];
  document.getElementById('openImagesDialog').style.cursor = 'default';
  document.getElementById('OIDCloseBtn').click();  // Clicking the close button on dialog after we are done with it.
}

function OIDInformIfNecessary(){
  if(OIDSomeSkipped){
    // eslint-disable-next-line max-len
    alert('Note: Some files were skipped because one or more of the following situations applied:\n\n1. More than ' + OIDHalfMaxPages + ' images were selected\n2. One or more images was larger than 25MB\n3. One or more images failed to load\n4. One or more files had a size of 0 bytes\n5. One or more files was not a PNG image\n6. One or more files was corrupt.', '');
  }
}


// Here is the code for the saveImagesDialog:

var SIDPath = '';
var SIDNameForFiles = '';
var SIDValidInput = true;
var SIDValidCharsString = 'abcdefghijklmnopqrstuvwxyz-ABCDEFGHIJKLMNOPQRSTUVWXYZ_1234567890';
var SIDFilesToHandle;
var SIDFilesHandled;
var SIDFilesToDelete;
var SIDFilesDeleted;
var SIDErrorsSavingFiles = false;
var SIDSaveViaCtrlS = false;

function SIDReadySaveImagesDialog(){ // eslint-disable-line no-unused-vars
  saveCurrentImageToArrayBeforeMoving();
  document.getElementById('SIDHeader').innerHTML = 'Save Images';
  SIDPath = '';
  SIDNameForFiles = '';
}

function SIDFileNamesInputTextboxValidator(){ // eslint-disable-line no-unused-vars
  var rawInput = document.getElementById('SIDFileNamesTextBox').value;
  if(rawInput.length === 0){
    document.getElementById('SIDFileNamesTextBox').style.backgroundColor = 'white';
    SIDValidInput = true;
  }
  else{
    if(rawInput.length > 50){
      document.getElementById('SIDFileNamesTextBox').style.backgroundColor = 'red';
      SIDValidInput = false;
    }
    else{
      for(var i = 0; i < rawInput.length; ++i){
        if(!SIDGoodChar(rawInput.charAt(i))){
          document.getElementById('SIDFileNamesTextBox').style.backgroundColor = 'red';
          SIDValidInput = false;
          i = rawInput.length;
        }
        else{
          document.getElementById('SIDFileNamesTextBox').style.backgroundColor = 'white';
          SIDValidInput = true;
        }
      }
    }
  }
}

function SIDGoodChar(chr){
  if(SIDValidCharsString.indexOf(chr) === -1){
    return false;
  }
  else{
    return true;
  }
}

function SIDChooseFolderBtnFunction(){ // eslint-disable-line no-unused-vars
  if(SIDValidInput){
    SIDLaunchOpenFolderWindow();
  }
  else{
    alert('Error: Please choose a valid name to put on all of the files or leave the field empty.', '');
  }
}

function SIDLaunchOpenFolderWindow(){
  SIDNameForFiles = document.getElementById('SIDFileNamesTextBox').value;
  dialog.showOpenDialog(theMainWindow, { title: 'Choose Folder', defaultPath: hf,
    properties: ['openDirectory', 'createDirectory'] }, function (paths){
      if (typeof paths === 'undefined' || paths === null){
        return;
      }
      SIDPath = paths[0];
      SIDHandleFolderPath();
    });
}

function SIDHandleFolderPath(){
  document.getElementById('SIDHeader').innerHTML = 'Processing...';
  document.getElementById('saveImagesDialog').style.cursor = 'wait';
  fs.readdir(SIDPath, function (err, files){
    if (err){
      // eslint-disable-next-line max-len
      alert('Error: An error occurred while trying to inspect the folder you selected. Here is the error: ' + err + '\n\nEnsure that the folder you choose exists, is empty, and that you are allowed to create files there', '');
      document.getElementById('SIDHeader').innerHTML = 'Save Images';
      document.getElementById('saveImagesDialog').style.cursor = 'default';
      return;
    }
    if(files.length !== 0){
      // Here we have to ask the user if they want to continue:
      // eslint-disable-next-line max-len
      var ret = dialog.showMessageBox(theMainWindow, { title: ' ', type: 'warning', message: 'Warning: The folder that you have selected is not empty. If you continue, some or all of its contents may be deleted and replaced. Are you sure you want to continue?', buttons: ['Overwrite', 'Cancel'], defaultId: 1, noLink: true });
      if(ret === 0){
        // Here we can continue anyway because the user said it was ok.
        SIDActuallySaveFiles();
      }
      else{
        return;
      }
    }
    else{
      // Here we are good to move on to the next step.
      SIDActuallySaveFiles();
    }
  });
}

function SIDActuallySaveFiles(ctl_s = false){
  SIDSaveViaCtrlS = ctl_s;
  fs.readdir(SIDPath, function (err, files){
    if(err){
      // eslint-disable-next-line max-len
      alert('Error: An error occurred while trying to open the folder you selected. Here is the error: ' + err + '\n\nEnsure that the folder you choose exists and that you are allowed to create files there. Use the "Save Images" option in the file menu to choose a different folder if necessary.', '');
      return;
    }
    if(files.length > arrayOfCurrentImages.length){
      // Here is where we need to go through and delete the extra images if they exist:
      var numCurrentImages = arrayOfCurrentImages.length;
      SIDFilesToDelete = files.length - numCurrentImages;
      SIDFilesDeleted = 0;
      for(var i = files.length; i > numCurrentImages; --i){
        var name = SIDPath + path.sep + SIDNameForFiles + i + '.png';
        fs.unlink(name, SIDFileDeleted);
      }
    }
    else{
      // If there are no extra images, we can just continue:
      SIDContinueSavingFiles();
    }
  });
}

function SIDFileDeleted(){
  ++SIDFilesDeleted;
  if(SIDFilesDeleted === SIDFilesToDelete){
    SIDContinueSavingFiles();
  }
}

function SIDContinueSavingFiles(){
  SIDErrorsSavingFiles = false;
  SIDFilesToHandle = arrayOfCurrentImages.length;
  SIDFilesHandled = 0;
  for(var i = 0; i < SIDFilesToHandle; ++i){
    var name = SIDPath + path.sep + SIDNameForFiles + (i + 1) + '.png';
    fs.writeFile(name, SIDDecodeBase64Image(arrayOfCurrentImages[i].src), SIDFileSaved);
  }
}

function SIDFileSaved(err){
  if(SIDSaveViaCtrlS === false){
    document.getElementById('SIDHeader').innerHTML = 'Processing file ' + SIDFilesHandled + ' of ' + SIDFilesToHandle;
  }
  if(err){
    SIDErrorsSavingFiles = true;
    SIDIncrementAndCheck();
  }
  else{
    SIDIncrementAndCheck();
  }
}

function SIDIncrementAndCheck(){
  ++SIDFilesHandled;
  if(SIDFilesHandled === SIDFilesToHandle){
    SIDFinishedSaving();
  }
}

function SIDFinishedSaving(){
  if(SIDSaveViaCtrlS === false){
    document.getElementById('saveImagesDialog').style.cursor = 'default';
    document.getElementById('SIDHeader').innerHTML = 'Save Images';
    if(SIDErrorsSavingFiles){
      // eslint-disable-next-line max-len
      alert('Error: One or more files did not save correctly. Ensure that the folder you choose exists, is empty, and that you are allowed to create files there', '');
    }
    else{
      // Here we can simply close the dialog, set the mouse back to normal if applicable, and
      // set the applicable variable to true so that they can close the document without the warning.
      safeToClose = true;
      document.getElementById('SIDCloseBtn').click();  // Clicking the close button on dialog after we are done with it.
    }
  }
  else{
    if(SIDErrorsSavingFiles){
      // eslint-disable-next-line max-len
      alert('Error: One or more files did not save correctly. Ensure that the folder you choose exists, and that you are allowed to create files there', '');
    }
    else{
      safeToClose = true;
    }
  }
}

// The function below is a modified version of the function found at:
// https://stackoverflow.com/a/20272545
// I appreciate Julian Lannigan's work!      eslint-disable-line spellcheck
function SIDDecodeBase64Image(dataString){
  var matches = dataString.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);

  if(matches.length !== 3){
    throw new Error('Invalid base64 input string in SIDDecodeBase64Image');
  }

  return new Buffer(matches[2], 'base64');
}

// Here is the code for the aboutDialog:

function ADReadyAboutDialog(){ // eslint-disable-line no-unused-vars
  // eslint-disable-next-line max-len
  document.getElementById('ADVersionLine').innerHTML = '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Roger’s Math Whiteboard version ' + appVersion + ' can be best understood as a multi-page image editor designed around the specific needs of math and science teachers who want to take advantage of pen/touch/stylus input while presenting. It is designed to be used while presenting content in class, and/or while working through questions from students.';
}

// Here is the code for the fileOtherDialog:

var FODPercentValid = true;
var FODImagesToLoad;
var FODImagesLoaded;
var FODImgForInsertion1;
var FODImgForInsertion2;
var FODOrgX;
var FODOrgY;

function FODDuplicatePage(){ // eslint-disable-line no-unused-vars
  saveCurrentImageToArrayBeforeMoving();
  insertPageUsingImage(arrayOfCurrentImages[currentPg - 1]);
  arrayOfOriginalImages[currentPg - 1] = arrayOfOriginalImages[currentPg - 2];
  loadPage(currentPg);
  document.getElementById('FODCloseBtn').click();
}

function FODMakeCurrentDrawingPermanent(){ // eslint-disable-line no-unused-vars
  saveCurrentImageToArrayBeforeMoving();
  arrayOfOriginalImages[currentPg - 1] = arrayOfCurrentImages[currentPg - 1];
  loadPage(currentPg);
  document.getElementById('FODCloseBtn').click();
}

function FODRotateDrawingSurface(direction){ // eslint-disable-line max-statements, no-unused-vars
  saveCurrentImageToArrayBeforeMoving();
  var currentImageOnScreen = arrayOfCurrentImages[currentPg - 1];
  var currentOriginalImage = arrayOfOriginalImages[currentPg - 1];
  var ofscreenCanvas1 = document.createElement('canvas');
  var ofscreenCanvas2 = document.createElement('canvas');
  FODOrgX = context.canvas.width;
  FODOrgY = context.canvas.height;
  ofscreenCanvas1.width = FODOrgY;
  ofscreenCanvas1.height = FODOrgX;
  ofscreenCanvas2.width = arrayOfOriginalImagesY[currentPg - 1];
  ofscreenCanvas2.height = arrayOfOriginalImagesX[currentPg - 1];
  var contextR1 = ofscreenCanvas1.getContext('2d');
  var contextR2 = ofscreenCanvas2.getContext('2d');
  var xcord1;
  var ycord1;
  var xcord2;
  var ycord2;
  if(direction === 'clockwise'){
    contextR1.rotate(90 * Math.PI / 180);
    contextR2.rotate(90 * Math.PI / 180);
    xcord1 = 0;
    xcord2 = 0;
    ycord1 = -FODOrgY;
    ycord2 = -arrayOfOriginalImagesY[currentPg - 1];
  }
  else{
    contextR1.rotate(-90 * Math.PI / 180);
    contextR2.rotate(-90 * Math.PI / 180);
    xcord1 = -FODOrgX;
    xcord2 = -arrayOfOriginalImagesX[currentPg - 1];
    ycord1 = 0;
    ycord2 = 0;
  }
  contextR1.drawImage(currentImageOnScreen, xcord1, ycord1, FODOrgX, FODOrgY);
  contextR2.drawImage(currentOriginalImage, xcord2, ycord2,
  arrayOfOriginalImagesX[currentPg - 1], arrayOfOriginalImagesY[currentPg - 1]);
  var du1 = ofscreenCanvas1.toDataURL();
  var du2 = ofscreenCanvas2.toDataURL();
  FODImagesToLoad = 2;
  FODImagesLoaded = 0;
  FODImgForInsertion1 = null;
  FODImgForInsertion1 = new Image();
  FODImgForInsertion1.onload = FODContinueRotateDrawingSurfaceClockwise;
  FODImgForInsertion1.src = du1;
  FODImgForInsertion2 = null;
  FODImgForInsertion2 = new Image();
  FODImgForInsertion2.onload = FODContinueRotateDrawingSurfaceClockwise;
  FODImgForInsertion2.src = du2;
}

function FODContinueRotateDrawingSurfaceClockwise(){
  ++FODImagesLoaded;
  if(FODImagesLoaded === FODImagesToLoad){
    arrayOfCurrentImages[currentPg - 1] = FODImgForInsertion1;
    arrayOfOriginalImages[currentPg - 1] = FODImgForInsertion2;
    var tmpx = arrayOfOriginalImagesX[currentPg - 1];
    var tmpy = arrayOfOriginalImagesY[currentPg - 1];
    arrayOfOriginalImagesX[currentPg - 1] = tmpy;
    arrayOfOriginalImagesY[currentPg - 1] = tmpx;
    resizeAndLoadImagesOntoCanvases(FODImgForInsertion1, FODImgForInsertion2, tmpy, tmpx);
    updatePageNumsOnGui();
    clearUndoHistory();
    document.getElementById('FODCloseBtn').click();
  }
}

function FODImportFromSystem(scle){ // eslint-disable-line no-unused-vars
  var imageIn = clipboard.readImage();
  var dataUrl = imageIn.toDataURL();
  if(dataUrl === 'data:image/png;base64,'){
    alert('Error: It appears there is no image on your clipboard.', ' ');
    return;
  }
  var tempImage = new Image();
  tempImage.theScaleFactor = parseInt(scle, 10);
  tempImage.onload = function (){
    if(isNaN(this.theScaleFactor)){
      alert('Error: You did not enter a valid percent. Reverting to 100%.', ' ');
      this.theScaleFactor = 100;
    }
    var finalX = this.naturalWidth * (this.theScaleFactor / 100);
    var finalY = this.naturalHeight * (this.theScaleFactor / 100);
    finalX = parseInt(finalX, 10);
    finalY = parseInt(finalY, 10);
    var canvas = document.createElement('canvas');
    var tempContext = canvas.getContext('2d');
    canvas.width = finalX;
    canvas.height = finalY;
    tempContext.drawImage(this, 0, 0, finalX, finalY);
    copiedSectionOfCanvas = tempContext.getImageData(0, 0, finalX, finalY);
    tool = 'PASTE';
    updateTextOfToolBtn();
  };
  tempImage.src = dataUrl;
  document.getElementById('FODCloseBtn').click();
}

function FODImportFromSystemResize(){ // eslint-disable-line no-unused-vars
  if(FODPercentValid){
    FODImportFromSystem(document.getElementById('FODPercentInput').value);
  }
  else{
    alert('Error: Please enter a valid percent.', ' ');
  }
}

function FODCheckPercentInput(){ // eslint-disable-line no-unused-vars
  var elm = document.getElementById('FODPercentInput');
  var incomming = elm.value;
  incomming = parseInt(incomming, 10);
  if(isNaN(incomming) || incomming > 400 || incomming < 10){
    elm.style.backgroundColor = 'red';
    FODPercentValid = false;
  }
  else{
    elm.style.backgroundColor = 'white';
    FODPercentValid = true;
  }
}

function FODExportCopiedSection(){ // eslint-disable-line no-unused-vars
  if(copiedSectionOfCanvas !== 'NA'){
    var canvas = document.createElement('canvas');
    var tempContext = canvas.getContext('2d');
    canvas.width = copiedSectionOfCanvas.width;
    canvas.height = copiedSectionOfCanvas.height;
    tempContext.putImageData(copiedSectionOfCanvas, 0, 0);
    var dataUrl = canvas.toDataURL();
    ipcRenderer.send('export-to-clipboard', dataUrl);
    document.getElementById('FODCloseBtn').click();
  }
  else{
    alert('Error: You have not yet copied a region of the whiteboard, thus nothing to export yet.', ' ');
  }
}


// Here is the code for the insertTextDialog:
var ITDValid = true;

function ITDReadyInsertTextDialog(){ // eslint-disable-line no-unused-vars
  document.getElementById('ITDTextBox').value = textToInsert;
  ITDValidationFunction();
  document.getElementById('ITDTextBox').focus();
  document.getElementById('ITDTextBox').select();
}

function ITDAddCharacter(chr){ // eslint-disable-line no-unused-vars
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

function ITDBackspace(){ // eslint-disable-line no-unused-vars
  var textBox = document.getElementById('ITDTextBox');
  var alreadyThere = textBox.value;
  var sStart = textBox.selectionStart;
  var sEnd = textBox.selectionEnd;
  var beforeSelection;
  var afterSelection;
  if(sStart === sEnd){
    beforeSelection = alreadyThere.substring(0, sStart - 1);
    afterSelection = alreadyThere.substring(sEnd);
    textBox.value = beforeSelection + afterSelection;
    textBox.focus();
    textBox.setSelectionRange(sStart - 1, sStart - 1);
    ITDValidationFunction();
  }
  else{
    beforeSelection = alreadyThere.substring(0, sStart);
    afterSelection = alreadyThere.substring(sEnd);
    textBox.value = beforeSelection + afterSelection;
    textBox.focus();
    textBox.setSelectionRange(sStart, sStart);
    ITDValidationFunction();
  }
}

function ITDClear(){ // eslint-disable-line no-unused-vars
  document.getElementById('ITDTextBox').value = '';
  document.getElementById('ITDTextBox').focus();
  ITDValidationFunction();
}

function ITDValidationFunction(){
  var input = document.getElementById('ITDTextBox').value;
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
    document.getElementById('ITDCloseBtn').click();  // Clicking the close button on dialog after we are done with it.
  }
}

function ITDCheckForEnter(e){ // eslint-disable-line no-unused-vars
  var key = e.which || e.keyCode;
  if (key === 13){ // 13 is enter
    ITDOkBtnFunction();
  }
}

// Here is the code for the otherToolDialog:

function OTDCloseDialog(){ // eslint-disable-line no-unused-vars
  document.getElementById('OTDCloseBtn').click();  // Clicking the close button on dialog after we are done with it.
}


// Here is the code for the otherColorDialog:
var OCDColor = 'rgba(78, 78, 255, 1.0)';
var OCDRed = 78;
var OCDGreen = 78;
var OCDBlue = 78;
var OCDAlpha = 1.0;
var OCDValid = true;

function OCDReadyOtherColorDialog(){ // eslint-disable-line no-unused-vars
  // Set up the canvas on which the two color wheels will be painted:
  var canvas = document.getElementById('OCDPickerCanvas');
  var context = canvas.getContext('2d');
  var x = canvas.width / 2;
  var y = canvas.height / 4;
  var radius = canvas.width / 2;
  
  context.fillStyle = 'white';
  context.fillRect(0, 0, canvas.width, (canvas.height / 2));

  context.fillStyle = 'black';
  context.fillRect(0, (canvas.height / 2), canvas.width, (canvas.height / 2));
  
  // Draw the two color wheels:
  OCDDrawColorCircle(x, y, radius, context, false);
  OCDDrawColorCircle(x, 3 * y, radius, context, true);
  
  var value = instrumentColor.split(',');
  OCDRed = parseInt(value[0].substring(5), 10);
  OCDGreen = parseInt(value[1].substring(1), 10);
  OCDBlue = parseInt(value[2].substring(1), 10);
  var temp = value[3].substring(1);
  OCDAlpha = parseFloat(temp.substring(0, temp.length - 1));
  
  OCDUpdateTextBoxes();
  OCDValidateInputAndUpdateIfApplicable();
  OCDUpdateExample();
}

function OCDDrawColorCircle(x, y, r, ctx, drk){
  // Create a color circle:
  // This code is a modified version of the code written by shoo found at:
  // https://stackoverflow.com/a/29452034
  // I appreciate shoo's work! It makes a great color circle.
  var prcent = 100;
  if(drk){
    prcent = 0;
  }
  
  for(var angle = 0; angle <= 360; angle += 1){
    var startAngle = (angle - 1) * Math.PI / 180;
    var endAngle = (angle + 1) * Math.PI / 180;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, r, startAngle, endAngle);
    ctx.closePath();
    var gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
    gradient.addColorStop(0,'hsl(' + angle + ', 10%, ' + prcent + '%)');
    gradient.addColorStop(1,'hsl(' + angle + ', 100%, 50%)');
    ctx.fillStyle = gradient;
    ctx.fill();
  }
}

function OCDMouseDown(e){ // eslint-disable-line no-unused-vars
  var offset = getCoords(document.getElementById('OCDPickerCanvas'));
  OCDOnInstrumentDown(e.pageX - offset.left, e.pageY - offset.top);
}

function OCDTouchStart(e){ // eslint-disable-line no-unused-vars
  if(e.touches.length === 1){
    var offset = getCoords(document.getElementById('OCDPickerCanvas'));
    OCDOnInstrumentDown(e.changedTouches[0].pageX - offset.left, e.changedTouches[0].pageY - offset.top);
    e.preventDefault();
  }
}

function OCDUpdateTextBoxes(){
  document.getElementById('OCDRedTextBox').value = OCDRed;
  document.getElementById('OCDRedTextBox').style.backgroundColor = 'white';
  document.getElementById('OCDGreenTextBox').value = OCDGreen;
  document.getElementById('OCDGreenTextBox').style.backgroundColor = 'white';
  document.getElementById('OCDBlueTextBox').value = OCDBlue;
  document.getElementById('OCDBlueTextBox').style.backgroundColor = 'white';
  var temp = 100 - (parseInt(OCDAlpha * 100, 10));
  document.getElementById('OCDTransparencyTextBox').value = temp;
  document.getElementById('OCDTransparencyTextBox').style.backgroundColor = 'white';
  document.getElementById('OCDRedTextBox').select();
}

function OCDOnInstrumentDown(x, y){
  var canvas = document.getElementById('OCDPickerCanvas');
  var context = canvas.getContext('2d');
  var temp = context.getImageData(x, y, 1, 1);
  OCDRed = temp.data[0];
  OCDGreen = temp.data[1];
  OCDBlue = temp.data[2];
  OCDAlpha = 1.0;
  OCDColor = 'rgba(' + OCDRed + ', ' + OCDGreen + ', ' + OCDBlue + ', ' + OCDAlpha + ')';
  
  OCDUpdateTextBoxes();
  OCDValidateInputAndUpdateIfApplicable();
  OCDUpdateExample();
}

function OCDValidateInputAndUpdateIfApplicable(){ // eslint-disable-line max-statements
  var tempRed = parseInt(document.getElementById('OCDRedTextBox').value, 10);
  var tempGreen = parseInt(document.getElementById('OCDGreenTextBox').value, 10);
  var tempBlue = parseInt(document.getElementById('OCDBlueTextBox').value, 10);
  var tempAlpha = parseInt(document.getElementById('OCDTransparencyTextBox').value, 10);
  
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
    document.getElementById('OCDCloseBtn').click();  // Clicking the close button on dialog after we are done with it.
  }
}

function OCDCheckForEnter(e){ // eslint-disable-line no-unused-vars
  var key = e.which || e.keyCode;
  if (key === 13){ // 13 is enter
    OCDOkBtnFunction();
  }
}

// Here is the code for the otherSizeDialog:
var OSDValid = true;

function OSDReadyOtherSizeDialog(){ // eslint-disable-line no-unused-vars
  document.getElementById('OSDSizeTextBox').value = instrumentWidth;
  document.getElementById('OSDSizeTextBox').select();
}

function OSDAddCharacter(chr){ // eslint-disable-line no-unused-vars
  var textBox = document.getElementById('OSDSizeTextBox');
  var alreadyThere = textBox.value;
  textBox.value = alreadyThere + chr;
  OSDValidateInput();
}

function OSDBackspace(){ // eslint-disable-line no-unused-vars
  var textBox = document.getElementById('OSDSizeTextBox');
  var alreadyThere = textBox.value;
  textBox.value = alreadyThere.substring(0, alreadyThere.length - 1);
  OSDValidateInput();
}

function OSDClear(){ // eslint-disable-line no-unused-vars
  document.getElementById('OSDSizeTextBox').value = '';
  document.getElementById('OSDSizeTextBox').focus();
  OSDValidateInput();
}

function OSDValidateInput(){
  var rawInput = parseInt(document.getElementById('OSDSizeTextBox').value, 10);
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
    instrumentWidth = parseInt(document.getElementById('OSDSizeTextBox').value, 10);
    updateTextOfSizeBtn();
    document.getElementById('OSDCloseBtn').click();  // Clicking the close button on dialog after we are done with it.
  }
}

function OSDCheckForEnter(e){ // eslint-disable-line no-unused-vars
  var key = e.which || e.keyCode;
  if (key === 13){ // 13 is enter
    OSDOkBtnFunction();
  }
}

// Here is the code for the insertScreenshotDialog:
var ISDCanInsert = false;
var ISDCanUseTool = false;
var ISDAreaSelected = false;
var ISDScreenShotORIGINAL;
var ISDXScale;
var ISDYScale;
var ISDImageToReturn;
var ISDCanvas = null;
var ISDTempCanvasForInterval = 'NA';
var ISDContext = 'NA';
var ISDTempX = 'NA';
var ISDTempY = 'NA';
var ISDPrevX = 'NA';
var ISDPrevY = 'NA';
var ISDClearSelectionBtn = null;
var ISDLocationDropdown = null;
var ISDExtraTextLabel = null;
var ISDExtraBreak = null;
var ISDExtraBreak2 = null;
var ISDExtraBreak3 = null; // new
var ISDExtraTextLabel2 = null;
var ISDExtraTextLabel3 = null; // new
var ISDBackgroundColorDropdown = null;
var ISDCroppingMethodDropdown = null; // new

function ISDReadyInsertScreenshotDialog(){ // eslint-disable-line no-unused-vars
  ISDCanInsert = false;
  ISDAreaSelected = false;
  // Get thumbnails of each screen/window & insert into the dialog.
  desktopCapturer.getSources({ types: ['window', 'screen'], thumbnailSize: { width: 400, height: 400 } }, (error, sources) => {
    if (error){
      alert('Unable to obtain screenshot sources.', 'Error:');
      return;
    }
    // clear out the dialog:
    // eslint-disable-next-line max-len
    document.getElementById('ISDContentHeader').innerHTML = 'Click/tap on the screen or window that you would like to capture:<br>Note that this list does not automatically update. Also, if the window/screen that you would like to insert only appears as a black page, see the FAQ section of our website for an alternate method of inserting screenshots.';
    document.getElementById('ISDContentDiv').innerHTML = '';
    // Prepare the dialog with some spaces:
    var br = document.createElement('br');
    document.getElementById('ISDContentDiv').appendChild(br);
    document.getElementById('ISDContentDiv').appendChild(br);
    document.getElementById('ISDContentDiv').appendChild(br);
    // Now loop through each source and put its thumbnail in the dialog:
    for (let i = 0; i < sources.length; ++i){  // For each one we will...
      // Make the image element:
      var elem = document.createElement('img');
      elem.setAttribute('src', sources[i].thumbnail.toDataURL());
      var str = 'ISDThumbnailClicked("' + sources[i].id + '");';
      elem.setAttribute('onclick', str);
      // Make a name element:
      var elem2 = document.createElement('p');
      var str2 = sources[i].name;
      if(str2.length > 40){
        str2 = str2.substring(0, 40) + '...'; // ----Visible!
      }
      elem2.innerHTML = '↑ ' + str2;
      // Make a line break element:
      var elem3 = document.createElement('br');
      // Add all 3 elements to the dialog:
      document.getElementById('ISDContentDiv').appendChild(elem);
      document.getElementById('ISDContentDiv').appendChild(elem2);
      document.getElementById('ISDContentDiv').appendChild(elem3);
    }
  });
}

function ISDThumbnailClicked(id){ // eslint-disable-line no-unused-vars
  // 1. clear out the dialog & put up new message
  document.getElementById('ISDContentHeader').innerHTML = 'Capturing Screenshot...';
  document.getElementById('ISDContentDiv').innerHTML = '';
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
}

function ISDHandleError(e){
  alert('An error occurred while obtaining the screenshot. Here is the error:\n\n' + e.name, 'Error:');
}

function ISDHandleStream(stream){
  // Create hidden video tag
  var video = document.createElement('video');
  video.style.cssText = 'position:absolute;top:-10000px;left:-10000px;';
  // Event connected to stream
  video.onloadedmetadata = function (){
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
    
    setTimeout(ISDReadyForCroping, 500);

    // Remove hidden video tag
    video.remove();
    try {
      // Destroy connect to stream
      stream.getTracks()[0].stop();
    }
    catch (e){// Nothing to do in here. We want to try to stop the stream, but if it doesn't work, its not a big deal.
    }
  };
  video.src = URL.createObjectURL(stream);
  document.body.appendChild(video);
}

function ISDReadyForCroping(){
  // 3. re-focus main window
  ipcRenderer.send('focus-main-win');
  // 4. Put screenshot in canvas of right size
  var img = new Image();
  img.onload = function (){
    ISDCanvas = null;
    ISDCanvas = document.createElement('canvas');
    ISDCanvas.width = img.naturalWidth;
    ISDCanvas.height = img.naturalHeight;
    document.getElementById('ISDContentDiv').appendChild(ISDCanvas);
    ISDContext = ISDCanvas.getContext('2d');
    ISDContext.drawImage(img, 0, 0, ISDCanvas.width, ISDCanvas.height);
    
    ISDFixCanvas();
  };
  img.src = ISDScreenShotORIGINAL;

  
  // 5. set ISDCanInsert to true & area selected to false.
  // 6. allow cropping.
  // 7. If area gets selected, store area & set ISDAreaSelected to true.
  // 8. make button for canceling select.
}

function ISDFixCanvas(){
  var horizontalPixels = ISDContext.getImageData(0, 360, 640, 1);
  var verticalPixels = ISDContext.getImageData(640, 0, 1, 360);
  var xPixelsToCrop = 0;
  var yPixelsToCrop = 0;
  var pixelCounter = 0;
  var i = 0;
  
  for (i = 0; i < horizontalPixels.data.length; i += 4){
    if(horizontalPixels.data[i] !== 0 || horizontalPixels.data[i + 1] !== 0 || horizontalPixels.data[i + 2] !== 0){
      xPixelsToCrop = pixelCounter;
      i = horizontalPixels.data.length;
    }
    else{
      pixelCounter += 1;
    }
  }
  
  pixelCounter = 0;
  
  for (i = 0; i < verticalPixels.data.length; i += 4){
    if(verticalPixels.data[i] !== 0 || verticalPixels.data[i + 1] !== 0 || verticalPixels.data[i + 2] !== 0){
      yPixelsToCrop = pixelCounter;
      i = verticalPixels.data.length;
    }
    else{
      pixelCounter += 1;
    }
  }
  
  var picture = ISDContext.getImageData(0, 0, ISDContext.canvas.width, ISDContext.canvas.height);
  ISDCanvas.width = ISDCanvas.width - (2 * xPixelsToCrop);
  ISDCanvas.height = ISDCanvas.height - (2 * yPixelsToCrop);
  ISDContext.putImageData(picture, (0 - xPixelsToCrop), (0 - yPixelsToCrop));
  // 1. capture image from canvas & save for inserting, 2. draw preview to fit into window size.
  
  ISDImageToReturn = null;
  ISDImageToReturn = new Image();
  ISDImageToReturn.onload = function (){
    ISDDisplayImageOnCanvas(ISDImageToReturn, ISDImageToReturn.naturalWidth, ISDImageToReturn.naturalHeight);
    
    // Here seems to be the right place to add the event listeners to the canvas.
    // We just have to remember to remove them when the window closes.
    ISDAddTouchAndClickEventHandelers();
    // eslint-disable-next-line max-len
    document.getElementById('ISDContentHeader').innerHTML = 'Select the region you would like to insert, or click/tap OK to insert the entire screenshot.<br>You can also specify the location where the selected region is placed using the drop-down below the image.';
    // And add the clear selection button, insertion location dropdown, * background color dropdown:
    
    ISDAddElementsForSelectRegion();
    
    // Also here is where to make the ok button work.
    ISDCanInsert = true;
  };
  ISDImageToReturn.src = ISDContext.canvas.toDataURL('image/png');
}

// Here is the function that adds the event handlers for the canvas that allows the user to select a region of
// the captured screenshot to insert. This is an important exception from the formality of making these linkages
// inside of the HTML.
function ISDAddTouchAndClickEventHandelers(){
  ISDCanvas.addEventListener('mousedown', function (e){
    var offset = getCoords(ISDCanvas);
    ISDInstrumentDown(e.pageX - offset.left, e.pageY - offset.top);
  });
  ISDCanvas.addEventListener('touchstart', function (e){
    var offset = getCoords(ISDCanvas);
    if(e.touches.length === 1){
      ISDInstrumentDown(e.changedTouches[0].pageX - offset.left, e.changedTouches[0].pageY - offset.top);
      e.preventDefault();
    }
    else    {
      // Here we are ignoring multi-touch. It is likely a stray elbow or something anyway, so no real reason to do anything.
      ISDInstrumentUp(ISDPrevX, ISDPrevY);
    }
  });
  ISDCanvas.addEventListener('mousemove', function (e){
    var offset = getCoords(ISDCanvas);
    ISDInstrumentMoved(e.pageX - offset.left, e.pageY - offset.top);
  });
  ISDCanvas.addEventListener('touchmove', function (e){
    var offset = getCoords(ISDCanvas);
    ISDInstrumentMoved(e.changedTouches[0].pageX - offset.left, e.changedTouches[0].pageY - offset.top);
    e.preventDefault();
  });
  ISDCanvas.addEventListener('mouseup', function (e){
    var offset = getCoords(ISDCanvas);
    ISDInstrumentUp(e.pageX - offset.left, e.pageY - offset.top);
  });
  ISDCanvas.addEventListener('mouseleave', function (e){
    var offset = getCoords(ISDCanvas);
    ISDInstrumentUp(e.pageX - offset.left, e.pageY - offset.top);
  });
  ISDCanvas.addEventListener('touchend', function (e){
    var offset = getCoords(ISDCanvas);
    ISDInstrumentUp(e.changedTouches[0].pageX - offset.left, e.changedTouches[0].pageY - offset.top);
    e.preventDefault();
  });
  ISDCanvas.addEventListener('touchleave', function (e){
    var offset = getCoords(ISDCanvas);
    ISDInstrumentUp(e.changedTouches[0].pageX - offset.left, e.changedTouches[0].pageY - offset.top);
    e.preventDefault();
  });
  ISDCanvas.addEventListener('touchcancel', function (e){
    var offset = getCoords(ISDCanvas);
    ISDInstrumentUp(e.changedTouches[0].pageX - offset.left, e.changedTouches[0].pageY - offset.top);
    e.preventDefault();
  });
}

function ISDAddElementsForSelectRegion(){
  ISDExtraBreak = document.createElement('br');
  document.getElementById('ISDContentDiv').appendChild(ISDExtraBreak);
  
  ISDClearSelectionBtn = document.createElement('a');
  ISDClearSelectionBtn.setAttribute('class', 'modalBoxKeypadBtns');
  ISDClearSelectionBtn.setAttribute('onclick', 'ISDCancelSelect();');
  ISDClearSelectionBtn.innerHTML = 'Clear Selection';
  
  document.getElementById('ISDContentDiv').appendChild(ISDClearSelectionBtn);
  
  ISDExtraTextLabel = document.createElement('p');
  ISDExtraTextLabel.innerHTML = 'Place selected region in:';
  document.getElementById('ISDContentDiv').appendChild(ISDExtraTextLabel);
  
  ISDAddLocationDropdown();
  
  ISDExtraBreak2 = document.createElement('br');
  document.getElementById('ISDContentDiv').appendChild(ISDExtraBreak2);
  
  ISDExtraTextLabel2 = document.createElement('p');
  ISDExtraTextLabel2.innerHTML = 'Background Color:';
  document.getElementById('ISDContentDiv').appendChild(ISDExtraTextLabel2);
  
  ISDBackgroundColorDropdown = document.createElement('select');
  ISDBackgroundColorDropdown.style.fontSize = '30px';
  ISDBackgroundColorDropdown.style.margin = '0px 0px 0px 0px';
  
  // Add the entries to the background color dropdown:
  var options = ['white', 'color chosen']; // ----Visible!
  var optionValues = ['white', 'globalcolor'];
  
  var opt = null;
  
  for(var i = 0; i < options.length; i++){
    opt = document.createElement('option');
    opt.setAttribute('value', optionValues[i]);
    opt.innerHTML = options[i];
    ISDBackgroundColorDropdown.appendChild(opt);
  }
  
  document.getElementById('ISDContentDiv').appendChild(ISDBackgroundColorDropdown);
  ISDAddCroppingMethodDropdown();
}

function ISDAddLocationDropdown(){
  ISDLocationDropdown = document.createElement('select');
  ISDLocationDropdown.style.fontSize = '30px';
  
  // Add the entries to the location dropdown:
  var options = ['top left corner', 'top right corner', 'bottom left corner', 'bottom right corner', 'center']; // ----Visible!
  var optionValues = ['topleft', 'topright', 'bottomleft', 'bottomright', 'center'];
  
  var opt = null;
  
  for(var i = 0; i < options.length; i++){
    opt = document.createElement('option');
    opt.setAttribute('value', optionValues[i]);
    opt.innerHTML = options[i];
    ISDLocationDropdown.appendChild(opt);
  }
  
  document.getElementById('ISDContentDiv').appendChild(ISDLocationDropdown);
}

function ISDAddCroppingMethodDropdown(){
  ISDExtraBreak3 = document.createElement('br');
  document.getElementById('ISDContentDiv').appendChild(ISDExtraBreak3);
  
  ISDExtraTextLabel3 = document.createElement('p');
  ISDExtraTextLabel3.innerHTML = 'Cropping Method:';
  document.getElementById('ISDContentDiv').appendChild(ISDExtraTextLabel3);
  
  ISDCroppingMethodDropdown = document.createElement('select');
  ISDCroppingMethodDropdown.style.fontSize = '30px';
  ISDCroppingMethodDropdown.style.margin = '0px 0px 25px 0px';
  
  // Add the entries to the background color dropdown:
  var options = ['paste within window size', 'cut to selection']; // ----Visible!
  var optionValues = ['windowsize', 'selection'];
  
  var opt = null;
  
  for(var i = 0; i < options.length; i++){
    opt = document.createElement('option');
    opt.setAttribute('value', optionValues[i]);
    opt.innerHTML = options[i];
    ISDCroppingMethodDropdown.appendChild(opt);
  }
  
  document.getElementById('ISDContentDiv').appendChild(ISDCroppingMethodDropdown);
}

function ISDDisplayImageOnCanvas(img, incommingWidth, incommingHeight){
  if(incommingWidth === 0 || incommingHeight === 0 || typeof incommingWidth === 'undefined' ||
  typeof incommingHeight === 'undefined' || incommingWidth === null || incommingHeight === null){
    throw new Error('ISDDisplayImageOnCanvas has been called before the image has loaded!');
  }
  var dlg = ISDGetAvaliableDialogSpace();
  var canvasHeight;
  var canvasWidth;
  
  var proportionalHeight = (incommingHeight * dlg.availableWidth) / incommingWidth;
  if(proportionalHeight > dlg.availableHeight){
    // this means height is limiting dimension.
    canvasHeight = dlg.availableHeight;
    canvasWidth = (incommingWidth * dlg.availableHeight) / incommingHeight;
    canvasWidth = Math.round(canvasWidth); // Without this line the image width is potentially reduced by 1 pixel every repaint.
    ISDCanvas.width = canvasWidth;
    ISDCanvas.height = canvasHeight;
    ISDContext.drawImage(img, 0, 0, canvasWidth, canvasHeight);
  }
  else  {  // this means width is limiting dimension.
    canvasWidth = dlg.availableWidth;
    canvasHeight = (incommingHeight * dlg.availableWidth) / incommingWidth;
    canvasHeight = Math.round(canvasHeight);// Without this line the image height is potentially reduced by 1 pixel every repaint.
    ISDCanvas.width = canvasWidth;
    ISDCanvas.height = canvasHeight;
    ISDContext.drawImage(img, 0, 0, canvasWidth, canvasHeight);
  }
  
  // Calculate & save scale factor in relation to actual image.
  ISDXScale = ISDImageToReturn.naturalWidth / ISDCanvas.width;
  ISDYScale = ISDImageToReturn.naturalHeight / ISDCanvas.height;
}

function ISDGetAvaliableDialogSpace(){
  // Note that this will need to be adjusted if the insert screenshot dialog css is changed in the future:
  var x = (0.88 * window.innerWidth) - 145;
  var y = (0.68 * window.innerHeight) - 21;
  x = Math.round(x);
  y = Math.round(y);
  return { availableWidth: x, availableHeight: y };
}

function ISDInstrumentDown(x, y){
  ISDCanUseTool = true;
  ISDSelectFunction(x, y, 'down');
}

function ISDInstrumentMoved(x, y){
  if(ISDCanUseTool){
    ISDSelectFunction(x, y, 'move');
  }
}

function ISDInstrumentUp(x, y){
  if(ISDCanUseTool){
    ISDSelectFunction(x, y, 'up');
  }
  ISDCanUseTool = false;
}

function ISDSelectFunction(x, y, phase){
  switch(phase){
  case 'down':
    
    ISDCancelSelect();
    ISDPrevX = x;
    ISDPrevY = y;
    ISDTempX = x;
    ISDTempY = y;
    ISDTempCanvasForInterval = 'NA';
    ISDTempCanvasForInterval = new Image();
    ISDTempCanvasForInterval.src = ISDContext.canvas.toDataURL('image/png');
    
    break;
  case 'move':
    
    ISDPrevX = x;
    ISDPrevY = y;
    ISDContext.drawImage(ISDTempCanvasForInterval, 0, 0, ISDContext.canvas.width, ISDContext.canvas.height);
    ISDContext.strokeStyle = 'rgba(0, 0, 0, 1.0)';
    ISDContext.lineJoin = 'round';
    ISDContext.lineWidth = 1;
    ISDContext.beginPath();
    ISDContext.moveTo(ISDTempX, ISDTempY);
    ISDContext.lineTo(ISDPrevX, ISDTempY);
    ISDContext.lineTo(ISDPrevX, ISDPrevY);
    ISDContext.lineTo(ISDTempX, ISDPrevY);
    ISDContext.closePath();
    ISDContext.stroke();
    
    break;
  case 'up':
    
    ISDAreaSelected = true;
    ISDContext.drawImage(ISDTempCanvasForInterval, 0, 0, ISDContext.canvas.width, ISDContext.canvas.height);
    ISDContext.strokeStyle = 'rgba(0, 0, 0, 1.0)';
    ISDContext.lineJoin = 'round';
    ISDContext.lineWidth = 1;
    ISDContext.beginPath();
    ISDContext.moveTo(ISDTempX, ISDTempY);
    ISDContext.lineTo(ISDPrevX, ISDTempY);
    ISDContext.lineTo(ISDPrevX, ISDPrevY);
    ISDContext.lineTo(ISDTempX, ISDPrevY);
    ISDContext.closePath();
    ISDContext.stroke();
    
    var tempWidth = Math.abs(ISDTempX - ISDPrevX);
    var tempHeight = Math.abs(ISDTempY - ISDPrevY);
    if(tempWidth === 0 || tempHeight === 0){
      cancelSelect();
    }
    
    break;
  default:
    throw new Error('Invalid phase in ISDSelectFunction: ' + phase);
  }
}

function ISDCancelSelect(){
  if(ISDAreaSelected){
    ISDContext.drawImage(ISDTempCanvasForInterval, 0, 0, ISDContext.canvas.width, ISDContext.canvas.height);
    ISDPrevX = 'NA';
    ISDPrevY = 'NA';
    ISDTempX = 'NA';
    ISDTempY = 'NA';
    ISDAreaSelected = false;
  }
}

function ISDOkBtnFunction(){ // eslint-disable-line no-unused-vars
  if(ISDCanInsert){
    if(ISDAreaSelected){
      // Now we have to determine where the user wants the selected region, what background color they want,
      // scale the coordinates to original size, re-size canvas to size of ISDImageToReturn, pant ISDImageToReturn onto it,
      // grab selected region from canvas, paint canvas with applicable color, paint selected region in correct spot,
      // grab data from canvas, make image from data, call insertPageUsingImage() when the image loads.
      
      var selectionWidth = Math.abs(ISDTempX - ISDPrevX);
      var selectionHeight = Math.abs(ISDTempY - ISDPrevY);
      selectionWidth = Math.round(selectionWidth * ISDXScale);
      selectionHeight = Math.round(selectionHeight * ISDYScale);
      
      var selectionLocationX = Math.min(ISDTempX, ISDPrevX);
      var selectionLocationY = Math.min(ISDTempY, ISDPrevY);
      selectionLocationX = Math.round(selectionLocationX * ISDXScale);
      selectionLocationY = Math.round(selectionLocationY * ISDYScale);
      
      var insertionPoint = { x: 0, y: 0 };
      if(ISDCroppingMethodDropdown.value === 'windowsize'){
        insertionPoint = ISDCalculateInsertionPoint(ISDLocationDropdown.value, ISDImageToReturn.width, ISDImageToReturn.height,
        selectionWidth, selectionHeight);
      }
      
      var bgColor = 'white';
      if(ISDBackgroundColorDropdown.value !== 'white'){
        bgColor = instrumentColor;
      }
      
      // At this point, we have all the information we need to start working with the canvas...
      
      ISDCanvas.width = ISDImageToReturn.width;
      ISDCanvas.height = ISDImageToReturn.height;
      ISDContext.drawImage(ISDImageToReturn, 0, 0, ISDImageToReturn.width, ISDImageToReturn.height);
      
      var selectionData = ISDContext.getImageData(selectionLocationX, selectionLocationY, selectionWidth, selectionHeight);
      
      if(ISDCroppingMethodDropdown.value !== 'windowsize'){
        ISDCanvas.width = selectionWidth;
        ISDCanvas.height = selectionHeight;
      }
      
      ISDContext.beginPath();
      ISDContext.fillStyle = bgColor;
      ISDContext.rect(0, 0, ISDContext.canvas.width, ISDContext.canvas.height);
      ISDContext.fill();
      
      ISDContext.putImageData(selectionData, insertionPoint.x, insertionPoint.y);
      
      ISDImageToReturn = null;
      ISDImageToReturn = new Image();
      ISDImageToReturn.onload = function (){
        insertPageUsingImage(this);
      };
      ISDImageToReturn.src = ISDContext.canvas.toDataURL('image/png');
    }
    else{
      // Here we need to call insertPageUsingImage(). At this point the image will already exist and be loaded.
      insertPageUsingImage(ISDImageToReturn);
    }
    document.getElementById('ISDCloseBtn').click();  // Clicking the close button on dialog after we are done with it.
  }
}

function ISDCalculateInsertionPoint(insertionLocationStr, orgImageX, orgImageY, selSizeX, selSizeY){
  var toRet = { x: 0, y: 0 };
  switch(insertionLocationStr){
  case 'topright':
    
    toRet.x = orgImageX - selSizeX;
    
    break;
  case 'bottomleft':
    
    toRet.y = orgImageY - selSizeY;
    
    break;
  case 'bottomright':
    
    toRet.x = orgImageX - selSizeX;
    toRet.y = orgImageY - selSizeY;
    
    break;
  case 'center':
    
    var halfOrgImageX = Math.round(orgImageX / 2);
    var halfOrgImageY = Math.round(orgImageY / 2);
    var halfSelSizeX = Math.round(selSizeX / 2);
    var halfSelSizeY = Math.round(selSizeY / 2);
    
    toRet.x = halfOrgImageX - halfSelSizeX;
    toRet.y = halfOrgImageY - halfSelSizeY;
    
    break;
  default:
    // Here we do nothing since for the top left, the coordinates are already correct. 
    // Also, if something weird happens, we want to put it in the top left corner anyhow, so doing nothing works.
    break;
  }
  return toRet;
}

function ISDCleanupFunction(){ // eslint-disable-line no-unused-vars, max-statements
  // Here is where we will remove the event listeners from the canvas & do any other necessary cleanup.
  ISDSimpleVariableCleanup();
  if(ISDCanvas !== null && typeof ISDCanvas !== 'undefined'){
    document.getElementById('ISDContentDiv').removeChild(ISDCanvas);
    ISDCanvas = null;
  }
  if(ISDExtraBreak !== null && typeof ISDExtraBreak !== 'undefined'){
    document.getElementById('ISDContentDiv').removeChild(ISDExtraBreak);
    ISDExtraBreak = null;
  }
  if(ISDClearSelectionBtn !== null && typeof ISDClearSelectionBtn !== 'undefined'){
    document.getElementById('ISDContentDiv').removeChild(ISDClearSelectionBtn);
    ISDClearSelectionBtn = null;
  }
  if(ISDExtraTextLabel !== null && typeof ISDExtraTextLabel !== 'undefined'){
    document.getElementById('ISDContentDiv').removeChild(ISDExtraTextLabel);
    ISDExtraTextLabel = null;
  }
  if(ISDLocationDropdown !== null && typeof ISDLocationDropdown !== 'undefined'){
    while (ISDLocationDropdown.firstChild){
      ISDLocationDropdown.removeChild(ISDLocationDropdown.firstChild);
    }
    document.getElementById('ISDContentDiv').removeChild(ISDLocationDropdown);
    ISDLocationDropdown = null;
  }
  if(ISDExtraBreak2 !== null && typeof ISDExtraBreak2 !== 'undefined'){
    document.getElementById('ISDContentDiv').removeChild(ISDExtraBreak2);
    ISDExtraBreak2 = null;
  }
  if(ISDExtraTextLabel2 !== null && typeof ISDExtraTextLabel2 !== 'undefined'){
    document.getElementById('ISDContentDiv').removeChild(ISDExtraTextLabel2);
    ISDExtraTextLabel2 = null;
  }
  if(ISDBackgroundColorDropdown !== null && typeof ISDBackgroundColorDropdown !== 'undefined'){
    while(ISDBackgroundColorDropdown.firstChild){
      ISDBackgroundColorDropdown.removeChild(ISDBackgroundColorDropdown.firstChild);
    }
    document.getElementById('ISDContentDiv').removeChild(ISDBackgroundColorDropdown);
    ISDBackgroundColorDropdown = null;
  }
  if(ISDExtraBreak3 !== null && typeof ISDExtraBreak3 !== 'undefined'){
    document.getElementById('ISDContentDiv').removeChild(ISDExtraBreak3);
    ISDExtraBreak3 = null;
  }
  if(ISDExtraTextLabel3 !== null && typeof ISDExtraTextLabel3 !== 'undefined'){
    document.getElementById('ISDContentDiv').removeChild(ISDExtraTextLabel3);
    ISDExtraTextLabel3 = null;
  }
  if(ISDCroppingMethodDropdown !== null && typeof ISDCroppingMethodDropdown !== 'undefined'){
    while(ISDCroppingMethodDropdown.firstChild){
      ISDCroppingMethodDropdown.removeChild(ISDCroppingMethodDropdown.firstChild);
    }
    document.getElementById('ISDContentDiv').removeChild(ISDCroppingMethodDropdown);
    ISDCroppingMethodDropdown = null;
  }
}

function ISDSimpleVariableCleanup(){
  ISDPrevX = 'NA';
  ISDPrevY = 'NA';
  ISDTempX = 'NA';
  ISDTempY = 'NA';
  ISDAreaSelected = false;
  ISDCanInsert = false;
  ISDCanUseTool = false;
  ISDScreenShotORIGINAL = null;
  ISDXScale = null;
  ISDYScale = null;
  ISDImageToReturn = null;
  ISDTempCanvasForInterval = 'NA';
  ISDContext = 'NA';
}


// Here is the code for the otherPageDialog:

function OPDInsertPage(e){ // eslint-disable-line no-unused-vars
  var locOfTem = e.target.src;
  if(useWidescreenTemplates){
    var before = locOfTem.substring(0, (locOfTem.length - 4));
    locOfTem = before + '-wide.png';
    insertTemplateAsPage(locOfTem);
  }
  else{
    insertTemplateAsPage(locOfTem);
  }
  document.getElementById('OPDCloseBtn').click();  // Clicking the close button on dialog after we are done with it.
}

function OPDInsertColoredPage(){ // eslint-disable-line no-unused-vars
  var whiteImage = new Image();
  whiteImage.onload = function (){
    var orgWidth = context.canvas.width;
    var orgHeight = context.canvas.height;
    var originalImageOnCanvas = new Image();
    originalImageOnCanvas.onload = function (){
      if(useWidescreenTemplates){
        context.canvas.width = 2867;
      }
      else{
        context.canvas.width = 2200;
      }
      context.canvas.height = 1700;
      context.drawImage(whiteImage, 0, 0);
      context.fillStyle = instrumentColor;
      context.fillRect(0, 0, context.canvas.width, context.canvas.height);
      var imageToInsert = new Image();
      imageToInsert.onload = function (){
        insertPageUsingImage(this);
      };
      imageToInsert.src = context.canvas.toDataURL('image/png');
      context.canvas.width = orgWidth;
      context.canvas.height = orgHeight;
      context.drawImage(originalImageOnCanvas, 0, 0);
    };
    originalImageOnCanvas.src = context.canvas.toDataURL('image/png');
  };
  if(useWidescreenTemplates){
    whiteImage.src = 'images/Blank_White_Page-wide.png';
  }
  else{
    whiteImage.src = 'images/Blank_White_Page.png';
  }
  document.getElementById('OPDCloseBtn').click();  // Clicking the close button on dialog after we are done with it.
}

function OPDInsertPageFromImage(){ // eslint-disable-line no-unused-vars
  dialog.showOpenDialog(theMainWindow, { title: 'Open Image', filters: [
    { name: 'Image', extensions: ['png', 'jpeg', 'jpg', 'gif'] } // ----Visible!
  ] }, function (fileNames){
    if (typeof fileNames === 'undefined' || fileNames === null){
      return;
    }
    var fileName = fileNames[0];
    // Now we check to see if the file exists before loading it in.
    
    fs.stat(fileName, function (err, stats){
      if(err === null){
        if(stats.size < 1){
          alert('Error: That file seems to be empty, broken or corrupt.\nTry opening a different one.', ' ');
        }
        else if(stats.size > 25000000){
          // eslint-disable-next-line max-len
          alert('Error: That file is larger than the size limit of 25MB.\nIf you wish to open it, you will need to scale it down using\nan image editing program such as mtPaint or Microsoft Paint.', ' ');
        }
        else{
          insertTemplateAsPage(fileName);
        }
      }
      else if(err.code === 'ENOENT'){
        // file does not exist
        alert('Error: That file does not seem to exist.\nTry opening a different one.', ' ');
      }
      else {
        throw err;
      }
    });
    document.getElementById('OPDCloseBtn').click();  // Clicking the close button on dialog after we are done with it.
  });
}




// ***************************** END OF CODE FOR OTHER WINDOWS!!!




function cancelSelect(){
  if(areaSelected === true){
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
  case 'central-line':
    document.getElementById('toolBtn').innerHTML = 'Tool: CL';
    break;
  case 'dashed-line':
    document.getElementById('toolBtn').innerHTML = 'Tool: DL';
    break;
  case 'dashed-central-line':
    document.getElementById('toolBtn').innerHTML = 'Tool: DCL';
    break;
  case 'PASTE-S':
    document.getElementById('toolBtn').innerHTML = 'Tool: Paste-S';
    break;
  default:
    throw new Error('Invalid tool. Cant update tool button text: ' + tool);
  }
}







// Below are the functions that execute whenever the applicable buttons are clicked.
// They are in order from right to left.

function undoBtnFunction(){
  if(currentPlaceInUndoArray > 0){
    if(imageArrayForUndo[currentPlaceInUndoArray - 1] !== null){
      --currentPlaceInUndoArray;
      resizeAndLoadImagesOntoCanvases(imageArrayForUndo[currentPlaceInUndoArray], arrayOfOriginalImages[currentPg - 1],
      arrayOfOriginalImagesX[currentPg - 1], arrayOfOriginalImagesY[currentPg - 1]);
    }
  }
}

function redoBtnFunction(){
  if(currentPlaceInUndoArray < imageArrayForUndo.length - 1){
    if(imageArrayForUndo[currentPlaceInUndoArray + 1] !== null){
      ++currentPlaceInUndoArray;
      resizeAndLoadImagesOntoCanvases(imageArrayForUndo[currentPlaceInUndoArray], arrayOfOriginalImages[currentPg - 1],
      arrayOfOriginalImagesX[currentPg - 1], arrayOfOriginalImagesY[currentPg - 1]);
    }
  }
}

function copyBtnFunction(){
  if(areaSelected === true){
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
  if(copiedSectionOfCanvas !== 'NA'){
    tool = 'PASTE';
    updateTextOfToolBtn();
  }
  else{
    tellUserToCopySomethingFirst();
  }
}

function drawRectangleBtnFunction(){ // eslint-disable-line no-unused-vars
  if(areaSelected === true){
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

function fillRectangleBtnFunction(){ // eslint-disable-line no-unused-vars
  if(areaSelected === true){
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

function drawEllipseBtnFunction(){ // eslint-disable-line no-unused-vars
  if(areaSelected === true){
    context.drawImage(tempCanvasForInterval, 0, 0, context.canvas.width, context.canvas.height);
    
    var widthOfSelection = Math.abs(tempX - prevX);
    var heightOfSelection = Math.abs(tempY - prevY);
    var minRadius = parseInt(Math.min(widthOfSelection, heightOfSelection) / 2, 10);
    var minX = Math.min(tempX, prevX);
    var minY = Math.min(tempY, prevY);
    var centerOfSelectionX = minX + (parseInt(widthOfSelection / 2, 10));
    var centerOfSelectionY = minY + (parseInt(heightOfSelection / 2, 10));
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

function fillEllipseBtnFunction(){ // eslint-disable-line no-unused-vars
  if(areaSelected === true){
    context.drawImage(tempCanvasForInterval, 0, 0, context.canvas.width, context.canvas.height);
    var drawingX = Math.min(tempX, prevX);
    var drawingY = Math.min(tempY, prevY);
    var rw = (Math.abs(tempX - prevX)) / 2;
    var rh = (Math.abs(tempY - prevY)) / 2;
    context.beginPath();
    context.fillStyle = instrumentColor;
    context.ellipse((drawingX + rw), (drawingY + rh), rw, rh, 0, 0, Math.PI * 2, false);
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
  if(currentPlaceInUndoArray !== imageArrayForUndo.length - 1){
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
    var tempImageForInserting = new Image();
    tempImageForInserting.src = context.canvas.toDataURL('image/png');
    imageArrayForUndo.push(tempImageForInserting);
    imageArrayForUndo.shift();
  }
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

function tellUserToCopySomethingFirst(){
  alert('Error: You have not yet copied a region of the whiteboard, thus nothing to paste yet.', ' ');
}




// This function was taken from:
// http://stackoverflow.com/a/26230989
// I appreciate basil's work!!! It works perfectly where nothing else did!
// It essentially returns the current location of the top left corner of 
// the applicable element regardless of where it is in the scrollable
// area. The coordinates returned are relative to the top left corner of
// the main window. This is great for the modal dialogs, because once
// this location is known, the combination of it and the location of the
// click can be used to calculate the location of the click on the element.
function getCoords(elem){ // cross browser version
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


// This function was taken from:
// https://jsfiddle.net/Lnyxuchw/
// Which was referenced in a post by Panama Prophet located at:
// http://stackoverflow.com/a/41635312
// I appreciate the work of Panama Prophet or whomever created
// this function. It seems to work quite well for validating PNG
// images before they are loaded. I have also added the try-catch
// structure so that if the string is not a base64 string, the
// function correctly returns false instead of throwing an exception.

function checkPNGImage(base64string){
  var src = base64string;
  var imageData = [];
  try{
    imageData = Uint8Array.from(atob(src.replace('data:image/png;base64,', '')), c => c.charCodeAt(0));
  }
  catch(err){
    // If the string cannot even be decoded correctly, there is no reason to continue checking it,
    // since it will obviously be invalid:
    return false;
  }
  if(imageData.length < 12){
    return false;
  }
  var sequence = [0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130]; // in hex: 

  // check the last 12 elements of the array to see if they contain the correct values:
  for(var i = 12; i > 0; i--){
    if(imageData[imageData.length - i] !== sequence[12 - i]){
      // If any incorrect values are found, immediately return false:
      return false;
    }
  }
  return true;
}

function copyTextareaValueToClipboard(elid){ // eslint-disable-line no-unused-vars
  var txt = document.getElementById(elid).value;
  clipboard.writeText(txt);
  alert('Copied');
}

function copyStrToClipboard(s){ // eslint-disable-line no-unused-vars
  clipboard.writeText(s);
  alert('Copied');
}

