const { app, BrowserWindow } = require('electron');
const path = require('path');
const url = require('url');
const ipcMain = require('electron').ipcMain;
const dialog = require('electron').dialog;
const shell = require('electron').shell;

const appVersion = app.getVersion();
const osModule = require('os');

var userWantsErrorMessagesMain = true;

var errorTimestampArray = [];

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win;

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
  if(userWantsErrorMessagesMain){
    var stk = 'Empty :('; // ----Visible!
    if(err !== null && typeof err !== 'undefined'){
      stk = err.stack;
    }
    dialog.showErrorBox('An Error has Occurred.', 'If you continue to receive this error, first check rogersmathwhiteboard.com to see if you are using the latest version of this program. If not, please try out the latest version and see if that resolves the issue. If that does not resolve the issue, please email the following message, along with a description of the problem to rogersmathwhiteboard@gmail.com Doing so will help solve the issue. Here is the error message to send:\n\nThis is Roger\'s Math Whiteboard version ' + appVersion + '\nPlatform: ' + osModule.platform() + ' ' + osModule.arch() + '\nProcess: Main\nStack trace:\n' + stk + '\nError:\n' + err); // eslint-disable-line max-len
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
        userWantsErrorMessagesMain = false;
        try{
          win.webContents.send('recursive-problem-in-main');
        }
        catch (e){
          // Nothing to do in here. We want to try to tell the render process what is going on, but
          // even if that isn't possible, we need to go on with the dialog.
        }
        dialog.showErrorBox('Multiple Errors Have Occurred. SAVE YOUR WORK NOW!', 'Because at least 3 errors have occurred within the last 30 seconds, error messages have been disabled. This likely means that this program is in an unstable state. YOU SHOULD IMMEDIATELY SAVE YOUR WORK AND RE-START THIS PROGRAM! Also, if you are using the latest stable version of this program, **please** email the following message, along with a description of the problem to rogersmathwhiteboard@gmail.com Doing so is vital to the problem diagnosis process and will hopefully lead to a resolution in the future. We are sorry for any inconvenience this has caused you. Here is the error message to send:\n\nThis is Roger\'s Math Whiteboard version ' + appVersion + '\nPlatform: ' + osModule.platform() + ' ' + osModule.arch() + '\nProcess: Main\nStack trace:\n' + stk + '\nError:\n' + err + '\nPotentially Recursive.'); // eslint-disable-line max-len
      }
    }
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

ipcMain.on('user-doesnt-want-error-messages', () => {
  userWantsErrorMessagesMain = false;
});

function open(url){
  shell.openExternal(url);
}
