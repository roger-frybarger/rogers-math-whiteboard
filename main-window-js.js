
const {ipcRenderer} = require('electron');
const {dialog} = require('electron').remote;


const remote = require('electron').remote;
var theMainWindow = remote.getGlobal('theMainWindow'); // Here we are getting a refference to the main window so we can use
// it for dialoug boxes.



//window.addEventListener('touchstart', (evt) => console.log(evt.touches[0]));
window.addEventListener('touchstart', tstart);
window.addEventListener('touchend', tend);
window.addEventListener('touchmove', tmove);
window.addEventListener('touchcancel', tcancel);
window.addEventListener('mousedown', mdown);
//window.addEventListener('mousemove', mmove);
window.addEventListener('mouseup', mup);

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

var locationToCheckWhenPushingDataIntoLocalStorage;

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
});

function continueAfterAppFinishedLoading1(){
  initializeEventListenersForCanvas();
  allLoaded = true;
}

function initializeGlobalVariables(){
  context = document.getElementById('canvas1').getContext('2d');
  eraserContext = document.getElementById('eraserCanvas').getContext('2d');
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
    //clearUndoHistory();
    continueAfterAppFinishedLoading1();
  }, false);
  image.src = 'images/Blank_White_Page.png';
}

// Here is the instrumentDown method. It accepts the x and y coordinates of where the tool/instrument started
// touching the page. I am certain that eventually, this method will call other methods that correspond
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
    //eraserToolMethod(x, y, 'down');
    break;
  case 'line':
    //lineToolMethod(x, y, 'down');
    break;
  case 'select':
    //selectToolMethod(x, y, 'down');
    break;
  case 'text':
    //textToolMethod(x, y, 'down');
    break;
  case 'identify':
    //identifyToolMethod(x, y, 'down');
    break;
  case 'dot':
    //dotToolMethod(x, y, 'down');
    break;
  case 'PASTE':
    //pasteToolMethod(x, y, 'down');
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
      //eraserToolMethod(x, y, 'move');
      break;
    case 'line':
      //lineToolMethod(x, y, 'move');
      break;
    case 'select':
      //selectToolMethod(x, y, 'move');
      break;
    case 'text':
      //textToolMethod(x, y, 'move');
      break;
    case 'identify':
      //identifyToolMethod(x, y, 'move');
      break;
    case 'dot':
      //dotToolMethod(x, y, 'move');
      break;
    case 'PASTE':
      //pasteToolMethod(x, y, 'move');
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
      //pushStateIntoUndoArray();
      break;
    case 'eraser':
      //eraserToolMethod(x, y, 'up');
      //pushStateIntoUndoArray();
      break;
    case 'line':
      //lineToolMethod(x, y, 'up');
      //pushStateIntoUndoArray();
      break;
    case 'select':
      //selectToolMethod(x, y, 'up');
      break;
    case 'text':
      //textToolMethod(x, y, 'up');
      //pushStateIntoUndoArray();
      break;
    case 'identify':
      //identifyToolMethod(x, y, 'up');
      break;
    case 'dot':
      //dotToolMethod(x, y, 'up');
      //pushStateIntoUndoArray();
      break;
    case 'PASTE':
      //pasteToolMethod(x, y, 'up');
      //pushStateIntoUndoArray();
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
  adjustSizeOfMenuButtonsToScreenSize();
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
  
  console.log('rtdytrdytrdytrd2');

  document.getElementById('openModalTestCloseBtn').click();  //Clicking the close btn on dialoug after we are done with it.
}
