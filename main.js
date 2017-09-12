const { app, BrowserWindow } = require('electron');
const path = require('path');
const url = require('url');
const ipcMain = require('electron').ipcMain;
const dialog = require('electron').dialog;
const shell = require('electron').shell;

const appVersion = app.getVersion();
const osModule = require('os');
const nativeImage = require('electron').nativeImage;
const { clipboard } = require('electron');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win;


const errorDelimiter = '-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~';
const platformAndVersionString = 'This is Roger\'s Math Whiteboard version ' + appVersion + '\nPlatform: ' + osModule.platform() + ' ' + osModule.arch();

var windowLoaded = false;
// This is critical for enabling touch events & disabling background process throttling:
app.commandLine.appendSwitch('touch-events', 'enabled');
app.commandLine.appendSwitch('disable-renderer-backgrounding');

var shouldQuit = app.makeSingleInstance(function (){
  // Someone tried to run a second instance, we should focus our window.
  if(win){
    win.focus();
  }
});

if(shouldQuit){
  app.quit();
  return;
}

process.on('uncaughtException', function (err){
  if(windowLoaded){
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
    win.webContents.send('unexpected-error-in-main', tmpObj);
  }
  else{
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
      windowLoaded = true; fuitfyf
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
  console.log(errorDelimiter);
  console.log(platformAndVersionString);
  console.log('Timestamp: ' + obj.timeOfErr);
  console.log('Process: ' + obj.processFrom);
  console.log('Message: ' + obj.messageTxt);
  console.log('Stack: ' + obj.stackTrace);
});

function open(url){
  shell.openExternal(url);
}
