
/* Note that the code in this file runs in a seperate process from the code in the main-window-js.js file. 
 * The code in this file is generally closer to the underlying OS and is responsible for creating a window
 * and telling that window where to load its HTML from. This file/process also handles things that require
 * deeper interaction with the underlying OS. As such, it is extra important to be careful that the code
 * in this file works properly since it is more difficult to debug.
 * */

// Here are the global constants that allow us to use various electron features:
const { app, BrowserWindow } = require('electron');
const path = require('path');
const url = require('url');
const ipcMain = require('electron').ipcMain;
const shell = require('electron').shell;

const appVersion = app.getVersion();
const osModule = require('os');
const nativeImage = require('electron').nativeImage;
const { clipboard } = require('electron');

// Here is a global reference to the window object. It is necessary to keep this global reference
// so that the window is not closed when the object is garbage collected.
let win;

// This string is used to seperate error messages if any errors occur:
const errorDelimiter = '\n-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~\n'; // eslint-disable-next-line max-len
const platformAndVersionString = 'This is Roger\'s Math Whiteboard version ' + appVersion + '\nPlatform: ' + osModule.platform() + ' ' + osModule.release() + ' ' + osModule.arch() + '\nTotal RAM: ' + osModule.totalmem() + ' bytes.';

// This is needed to determine where to print error messages should they occur:
var windowLoaded = false;
// This is critical for enabling touch events & disabling background process throttling:
app.commandLine.appendSwitch('touch-events', 'enabled');
app.commandLine.appendSwitch('disable-renderer-backgrounding');

// This makes the app a single instance app. This means that the user cannot start two instances of the program at the same time.
// For more details see https://github.com/electron/electron/blob/master/docs/api/app.md#appmakesingleinstancecallback
var shouldQuit = app.makeSingleInstance(function (){
  // Someone tried to run a second instance, we should focus our window.
  if(win){
    win.focus();
  }
});

// This forces all second instances of this app to quit after focusing the main window:
if(shouldQuit){
  app.quit();
  return;
}

// Here is the event handler for uncaught exceptions.
process.on('uncaughtException', function (err){
  if(windowLoaded){
    // If the window is loaded, we will make an error message and try to send it to the main interface
    // so that it can be displayed in the error message textarea.
    var tmpObj = {};
    var d = new Date();
    var n = d.getTime();
    tmpObj.timeOfErr = n;
    tmpObj.processFrom = 'Main'; // ----Visible!
    tmpObj.stackTrace = 'Empty :('; // ----Visible!
    tmpObj.messageTxt = 'Empty :('; // ----Visible!
    if(err.stack !== null && typeof err.stack !== 'undefined'){
      tmpObj.stackTrace = err.stack;
    }
    if(err.message !== null && typeof err.message !== 'undefined'){
      tmpObj.messageTxt = err.message;
    }
    try{
      win.webContents.send('unexpected-error-in-main', tmpObj);
    }
    catch(e){
      // If something breaks while trying to send the error message, well, there
      // probably isn't much we can do about that.
      throw err;
    }
  }
  else{
    // If the window is not yet loaded, we will just throw the error so that it gets printed out on the terminal:
    throw err;
  }
});

function createWindow(){
  // Create the browser window. Note that it is created without a frame. This way we can customize the entire interface.
  win = new BrowserWindow({ width: 800, height: 600, minWidth: 730, minHeight: 550,
    icon: __dirname + '/images/icons/scribble-128.png', frame: false });

  // and load the index.html of the app.
  win.loadURL(url.format({
    pathname: path.join(__dirname, 'index.html'),
    protocol: 'file:',
    slashes: true
  }));
  
  win.maximize();
  
  global.theMainWindow = win; // This allows us to get a reference to the main window in the render process.

  // Open the Development Tools.  -- ***************COMMENT OUT BEFORE RELEASE***************
  win.webContents.openDevTools();
  
  // Here is the release date.    -- ***********PUT IN CURRENT TIME BEFORE RELEASE***********
  // To update it get num from: https://www.w3schools.com/jsref/tryit.asp?filename=tryjsref_gettime
  global.dateTimeOfThisRelease = 1506267641292;

  win.on('close', function (e){
    // Once the user tries to click the close button, first prevent the default action of closing the app:
    e.preventDefault();
    // Then send a message to the render process, (main-window-js.js), so that we can check for unsaved work.
    win.webContents.send('close-button-clicked');
    // The applicable function in that file can then determine if it is safe to close the app, and warn the user if it isn't.
  });
  
  win.webContents.on('did-finish-load', function (){
    setTimeout(function (){
      win.webContents.send('app-finished-loading');
      windowLoaded = true;
      var dir;
      try{
        dir = app.getPath('home');
      }
      catch(err){
        dir = '';
      }
      win.webContents.send('users-home-folder', { hf: dir });
    },500);
  });
  
  win.webContents.on('new-window', function (event, url){
    event.preventDefault();
    open(url);
  });
}




// This function will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open. However,
  // for the sake of consistency, we will not do that in this app.
  if (win === null){
    createWindow();
  }
});

ipcMain.on('terminate-this-app', () => {
  win.destroy(); // necessary to bypass the repeat-quit-check in the render process.
  app.quit();
});

ipcMain.on('maximize-main-win', () => {
  win.maximize();
});

ipcMain.on('focus-main-win', () => {
  win.focus();
});

ipcMain.on('minimize-main-win', () => {
  win.minimize();
});

ipcMain.on('export-to-clipboard', function (e, du){
  var natImg = nativeImage.createFromDataURL(du);
  clipboard.writeImage(natImg);
});

ipcMain.on('problem-before-logging-possible', function (e, obj){
  var textToLog = errorDelimiter;
  textToLog += platformAndVersionString;
  textToLog += '\nTimestamp: ' + obj.timeOfErr;
  textToLog += '\nProcess: ' + obj.processFrom;
  textToLog += '\nMessage: ' + obj.messageTxt;
  textToLog += '\nStack: ' + obj.stackTrace;
  console.log(textToLog); // eslint-disable-line no-console
});

function open(url){
  shell.openExternal(url);
}
