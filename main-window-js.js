
const {ipcRenderer} = require('electron');
const {dialog} = require('electron').remote;


const remote = require('electron').remote;
var theMainWindow = remote.getGlobal('theMainWindow'); // Here we are getting a refference to the main window so we can use
// it for dialoug boxes.



//window.addEventListener('touchstart', (evt) => console.log(evt.touches[0]));
//window.addEventListener('touchstart', tstart);
//window.addEventListener('touchend', tend);
//window.addEventListener('touchmove', tmove);
//window.addEventListener('touchcancel', tcancel);
//window.addEventListener('mousedown', mdown);
//window.addEventListener('mousemove', mmove);
//window.addEventListener('mouseup', mup);

window.addEventListener('resize', onWindowResize);



//window.addEventListener('load', onWindowLoad);
//window.addEventListener('did-finish-load', onWindowLoad);

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
var intervarForRepainting = 80;
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

ipcRenderer.on('app-finished-loading', () => {
  document.documentElement.style.overflow = 'hidden';
  adjustSizeOfMenuButtonsToScreenSize();
  initializeGlobalVariables();
  initializeCanvas();
  // Since we have to wait for an image to load, the startup process continues on in the continueAfterAppFinishedLoading1 function.
});

ipcRenderer.on('ctrl-z-pressed', () => {
  console.log('Undo Pressed');
});

ipcRenderer.on('ctrl-y-pressed', () => {
  console.log('Redo Pressed');
});

ipcRenderer.on('esc-pressed', () => {
  console.log('Esc Pressed');
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
}

/*
 * Here is the function that innitializes the event listeners for all of the external dialogs.
 * It has to be run only once on startup since runnung it in the code for each window will result
 * in the same functions being added to the events again each time the dialog is opened,
 * which results in noticable slowness.
*/
function initializeEventListenersForExternalDialogs(){
  
  // Here are the event listeners for the settingsDialog:
  
  document.getElementById('SDUndoHistoryBox').addEventListener('input', SDInputValidation, false);
  document.getElementById('SDMaxPagesAllowedBox').addEventListener('input', SDInputValidation, false);
  
  // Here are the event listeners for the otherColorDialog:
  
  document.getElementById('OCDRedTextBox').addEventListener('input', OCDValidateInputAndUpdateIfApplicable, false);
  document.getElementById('OCDGreenTextBox').addEventListener('input', OCDValidateInputAndUpdateIfApplicable, false);
  document.getElementById('OCDBlueTextBox').addEventListener('input', OCDValidateInputAndUpdateIfApplicable, false);
  document.getElementById('OCDTransparencyTextBox').addEventListener('input', OCDValidateInputAndUpdateIfApplicable, false);
  
  document.getElementById('OCDRedTextBox').addEventListener('keydown', function (e) {
    var key = e.which || e.keyCode;
    if (key === 13) { // 13 is enter
      OCDOkBtnFunction();
    }
  });
  
  document.getElementById('OCDGreenTextBox').addEventListener('keydown', function (e) {
    var key = e.which || e.keyCode;
    if (key === 13) { // 13 is enter
      OCDOkBtnFunction();
    }
  });
  
  document.getElementById('OCDBlueTextBox').addEventListener('keydown', function (e) {
    var key = e.which || e.keyCode;
    if (key === 13) { // 13 is enter
      OCDOkBtnFunction();
    }
  });
  
  document.getElementById('OCDTransparencyTextBox').addEventListener('keydown', function (e) {
    var key = e.which || e.keyCode;
    if (key === 13) { // 13 is enter
      OCDOkBtnFunction();
    }
  });
  
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
  
  // Here are the event listeners for the otherSizeDialog:
  
  document.getElementById('OSDSizeTextBox').addEventListener('input', OSDValidateInput, false);
  
    document.getElementById('OSDSizeTextBox').addEventListener('keydown', function (e) {
    var key = e.which || e.keyCode;
    if (key === 13) { // 13 is enter
      OSDOkBtnFunction();
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
  
    alert('You are using a very high screen resolution. While this is good in most situations, it could potentially cause the following problems in the context of this program:\n\n1. The buttons/menus may be difficult to use with a touchscreen, because they appear smaller.\n\n2. If you broadcast this screen to a remote location, a higher resolution may use more bandwidth, and thus; could result in connection issues.\n\n3. If you record this screen for later viewing, a higher resolution will result in a larger file size, and will require more computing power to create/copy/move/upload, etc.\n\nIf you encounter any of these issues, consider lowering your screen resolution.', 'Warning');
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
    //textToolMethod(x, y, 'down');
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
      //textToolMethod(x, y, 'move');
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
      //textToolMethod(x, y, 'up');
      //pushStateIntoUndoArray();
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
    //      3. start interval which every 1/4 second does...
    //         a. repaints the tempCanvasForInterval onto the real canvas.
    //         b. paints an opaque gray line of set size onto the canvas between the tempX, tempY; and prevX, prevY.
    
    tempCanvasForInterval = 'NA';
    tempCanvasForInterval = new Image();
    tempCanvasForInterval.src = context.canvas.toDataURL('image/png');
    prevX = x;
    prevY = y;
    tempX = x;
    tempY = y;
    globalIntervalVarForFunction = setTimeout(lineIntervalPaintingFunction, intervarForRepainting);
    
    break;
  case 'move':
    
    // Update prevX & prevY with the current values of x & y.
    prevX = x;
    prevY = y;
    
    break;
  case 'up':
    
    //      1. Stop interval function.
    //      2. Paint tempCanvasForInterval onto the real canvas.
    //      3. draw line on real canvas using instrumentColor and instrumentWidth.
    clearTimeout(globalIntervalVarForFunction);
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
    //      3. start interval which every 1/4 second does...
    //         a. repaints the tempCanvasForInterval onto the real canvas.
    //         b. paints 4 opaque gray lines of set size onto the canvas between the tempX, tempY; and prevX, prevY.
    cancelSelect();
    prevX = x;
    prevY = y;
    tempX = x;
    tempY = y;
    tempCanvasForInterval = 'NA';
    tempCanvasForInterval = new Image();
    tempCanvasForInterval.src = context.canvas.toDataURL('image/png');
    globalIntervalVarForFunction = setTimeout(selectIntervalPaintingFunction, intervarForRepainting);
    
    break;
  case 'move':
    
    // Update prevX & prevY with the current values of x & y.
    prevX = x;
    prevY = y;
    
    break;
  case 'up':
    
    //      1. Stop interval function.
    //      2. Paint tempCanvasForInterval onto the real canvas.
    //      3. draw 4 opaque gray lines of set size onto the canvas between the tempX, tempY; and prevX, prevY.
    //      4. set areaSelected to true, and keep the values in tempCanvasForInterval, tempX, tempY; and prevX, prevY.
    //      5. Calculate width & height of area selected. If either of them are 0, call cancelSelect.
    areaSelected = true;
    clearTimeout(globalIntervalVarForFunction);
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


// **********Insert Text method goes here**************

// Here is the identifyToolMethod. It handles identifying areas of the canvas:
function identifyToolMethod(x, y, phase){
  switch(phase){
  case 'down':
    
    //      1. save current canvas into tempCanvasForInterval.
    //      2. save x & y into prevX & prevY.
    //      3. start interval which every 1/4 second does...
    //         a. repaints the tempCanvasForInterval onto the real canvas.
    //         b. paints a dot using instrumentColor & InstrumentWidth onto the canvas at prevX, prevY.
    
    tempCanvasForInterval = 'NA';
    tempCanvasForInterval = new Image();
    tempCanvasForInterval.src = context.canvas.toDataURL('image/png');
    prevX = x;
    prevY = y;
    globalIntervalVarForFunction = setTimeout(identifierIntervalPaintingFunction, intervarForRepainting);
    
    break;
  case 'move':
    
    // Update prevX & prevY with the current values of x & y.
    prevX = x;
    prevY = y;
    
    break;
  case 'up':
    
    //      1. Stop interval function.
    //      2. Paint tempCanvasForInterval onto the real canvas.
    
    clearTimeout(globalIntervalVarForFunction);
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
    //      3. start interval which every 1/4 second does...
    //         a. repaints the tempCanvasForInterval onto the real canvas.
    //         b. paints a dot using instrumentColor & InstrumentWidth onto the canvas at prevX, prevY.
    
    tempCanvasForInterval = 'NA';
    tempCanvasForInterval = new Image();
    tempCanvasForInterval.src = context.canvas.toDataURL('image/png');
    prevX = x;
    prevY = y;
    globalIntervalVarForFunction = setTimeout(dotIntervalPaintingFunction, intervarForRepainting);
    
    break;
  case 'move':
    
    // Update prevX & prevY with the current values of x & y.
    prevX = x;
    prevY = y;
    
    break;
  case 'up':
    
    //      1. Stop interval function.
    //      2. Paint tempCanvasForInterval onto the real canvas.
    //      3. put a dot at prevX, prevY.
    
    clearTimeout(globalIntervalVarForFunction);
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
      //      3. start interval which every 1/4 second does...
      //         a. repaints the tempCanvasForInterval onto the real canvas.
      //         b. paints the image in copiedSectionOfCanvas onto the canvas at prevX, prevY.
      tempCanvasForInterval = 'NA';
      tempCanvasForInterval = new Image();
      tempCanvasForInterval.src = context.canvas.toDataURL('image/png');
      prevX = x;
      prevY = y;
      tempX = x;
      tempY = y;
      globalIntervalVarForFunction = setTimeout(pasteIntervalPaintingFunction, intervarForRepainting);
      
      break;
    case 'move':
      
      // Update prevX & prevY with the current values of x & y.
      prevX = x;
      prevY = y;
      
      break;
    case 'up':
      
      //      1. Stop interval function.
      //      2. Paint tempCanvasForInterval onto the real canvas.
      //      3. paint the image in tempCanvasForPasting onto the canvas at prevX, prevY.
      clearTimeout(globalIntervalVarForFunction);
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
      ipcRenderer.send('terminate-this-app');
    }
    // If the user chooses to cancel, we will do nothing and let them save the file(s) on their own.
  }
  else{
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

//function tstart(event){
  
  //console.log('touchstart');
  
//}

//function tend(event){
  
  //console.log('touchend');
  
//}

//function tmove(event){
  
  //console.log('touchmove');
  
//}

//function tcancel(event){
  
  //console.log('touchcancel');
  
//}

//function mdown(event){
  
  //console.log('mousedown');
  
//}

//function mmove(event){
  
  //console.log('mousemove');
  
//}

//function mup(event){
  
  //console.log('mouseup');
  
//}

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



function test(){
  
  console.log('rtdytrdytrdytrd');
}

function test2(){
  
  //console.log('rtdytrdytrdytrd2');
  
  //console.log(context);

  //document.getElementById('OCDCloseBtn').click();  //Clicking the close btn on dialog after we are done with it.
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
    }
    else{
      ipcRenderer.send('user-doesnt-want-keyboard-shortcuts');
      weGotKeyboardShortcuts = false;
    }
    document.getElementById('SDCloseBtn').click();  //Clicking the close btn on dialog after we are done with it.
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

// Here is the code for the otherSizeDialog:

var OSDValid = true;

function OSDReadyOtherSizeDialog(){
  document.getElementById('OSDSizeTextBox').value = instrumentWidth;
  document.getElementById('OSDSizeTextBox').select();
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





// Here is the function that makes the line tool work on the timeout
function lineIntervalPaintingFunction(){
  context.drawImage(tempCanvasForInterval, 0, 0, context.canvas.width, context.canvas.height);
  
  context.strokeStyle = 'rgba(137, 137, 137, 0.6)';
  context.lineJoin = 'round';
  context.lineWidth = instrumentWidth;
  context.beginPath();
  context.moveTo(tempX, tempY);
  context.lineTo(prevX, prevY);
  context.stroke();
  
  globalIntervalVarForFunction = setTimeout(lineIntervalPaintingFunction, intervarForRepainting);
}

//Here is the function that makes the select tool work:
function selectIntervalPaintingFunction(){
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
  
  globalIntervalVarForFunction = setTimeout(selectIntervalPaintingFunction, intervarForRepainting);
}

// *************Text interval method goes here******************

// Here is the function that makes the identifier tool work:
function identifierIntervalPaintingFunction(){
  context.drawImage(tempCanvasForInterval, 0, 0, context.canvas.width, context.canvas.height);
  
  context.beginPath();
  context.arc(prevX, prevY, (instrumentWidth + 8) / 2, 0, 2 * Math.PI, false);
  context.fillStyle = 'rgba(0, 0, 0, 0.5)';
  context.fill();
  
  globalIntervalVarForFunction = setTimeout(identifierIntervalPaintingFunction, intervarForRepainting);
}

function dotIntervalPaintingFunction(){
  context.drawImage(tempCanvasForInterval, 0, 0, context.canvas.width, context.canvas.height);
  
  context.beginPath();
  context.arc(prevX, prevY, (instrumentWidth + 8) / 2, 0, 2 * Math.PI, false);
  context.fillStyle = 'rgba(0, 0, 0, 0.5)';
  context.fill();
  
  globalIntervalVarForFunction = setTimeout(dotIntervalPaintingFunction, intervarForRepainting);
}

//Here is the function that makes the paste tool work:
function pasteIntervalPaintingFunction(){
  context.drawImage(tempCanvasForInterval, 0, 0, context.canvas.width, context.canvas.height);
  
  context.putImageData(copiedSectionOfCanvas, prevX, (prevY - copiedSectionOfCanvas.height));
  
  globalIntervalVarForFunction = setTimeout(pasteIntervalPaintingFunction, intervarForRepainting);
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
