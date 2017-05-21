const { app, BrowserWindow } = require('electron');
const path = require('path');
const url = require('url');
const ipcMain = require('electron').ipcMain;
const globalShortcut = require('electron').globalShortcut;
const dialog = require('electron').dialog;

const appVersion = app.getVersion();
const osModule = require('os');

var userWantsKeyboardShortcuts = false;
var userWantsErrorMessagesMain = true;

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win;

// This is critical for enabling touch events:
app.commandLine.appendSwitch('touch-events', 'enabled');

var shouldQuit = app.makeSingleInstance(function (){
  // Someone tried to run a second instance, we should focus our window.
  if(win){
    if(win.isMinimized()) win.restore();
    win.focus();
  }
});

if (shouldQuit){
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
  }
  else{
    console.log(err.stack); // eslint-disable-line no-console
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
    },500);
  });
  
  win.on('focus', registerShortcuts);
  win.on('blur', unregisterShortcuts);
}

function registerShortcuts(){
  if(userWantsKeyboardShortcuts){
    /* eslint-disable indent, brace-style */
    var ret = globalShortcut.register('CommandOrControl+z', function (){ win.webContents.send('ctrl-z-pressed'); }) &&
              globalShortcut.register('CommandOrControl+y', function (){ win.webContents.send('ctrl-y-pressed'); }) &&
              globalShortcut.register('Escape', function (){ win.webContents.send('esc-pressed'); }) &&
              globalShortcut.register('Alt+p', function (){ win.webContents.send('alt-p-pressed'); }) &&
              globalShortcut.register('Alt+e', function (){ win.webContents.send('alt-e-pressed'); }) &&
              globalShortcut.register('Alt+l', function (){ win.webContents.send('alt-l-pressed'); }) &&
              globalShortcut.register('Alt+s', function (){ win.webContents.send('alt-s-pressed'); }) &&
              globalShortcut.register('Alt+i', function (){ win.webContents.send('alt-i-pressed'); }) &&
              globalShortcut.register('Alt+d', function (){ win.webContents.send('alt-d-pressed'); }) &&
              globalShortcut.register('Alt+b', function (){ win.webContents.send('alt-b-pressed'); }) &&
              globalShortcut.register('Alt+k', function (){ win.webContents.send('alt-k-pressed'); }) &&
              globalShortcut.register('Alt+r', function (){ win.webContents.send('alt-r-pressed'); }) &&
              globalShortcut.register('Alt+g', function (){ win.webContents.send('alt-g-pressed'); }) &&
              globalShortcut.register('CommandOrControl+a', function (){ win.webContents.send('ctrl-a-pressed'); }) &&
              globalShortcut.register('CommandOrControl+Shift+a', function (){ win.webContents.send('ctrl-shift-a-pressed'); }) &&
              globalShortcut.register('CommandOrControl+c', function (){ win.webContents.send('ctrl-c-pressed'); }) &&
              globalShortcut.register('CommandOrControl+v', function (){ win.webContents.send('ctrl-v-pressed'); }) &&
              globalShortcut.register('Delete', function (){ win.webContents.send('delete-pressed'); }) &&
              true;
              
    /* eslint-enable indent, brace-style */
    if(!ret){
      if(userWantsErrorMessagesMain){
        dialog.showErrorBox('Unable to Register Keyboard Shortcuts',
        'This is likely due to another program having registered some or all of the same shortcuts.');
      }
      else{
        console.log('Error: Unable to Register Keyboard Shortcuts. This is likely due to another program having registered some or all of the same shortcuts.'); // eslint-disable-line max-len, no-console
      }
      userWantsKeyboardShortcuts = false;
      unregisterShortcuts();
      win.webContents.send('keyboard-shortcuts-not-registered');
    }
  }
}

function unregisterShortcuts(){
  globalShortcut.unregisterAll();
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

ipcMain.on('user-wants-keyboard-shortcuts', () => {
  userWantsKeyboardShortcuts = true;
  registerShortcuts();
});

ipcMain.on('user-doesnt-want-keyboard-shortcuts', () => {
  userWantsKeyboardShortcuts = false;
  unregisterShortcuts();
});

ipcMain.on('launch-dev-tools', () => {
  win.webContents.openDevTools({ mode: 'undocked' });
});

ipcMain.on('close-dev-tools', () => {
  win.webContents.closeDevTools();
});

ipcMain.on('user-doesnt-want-error-messages', () => {
  userWantsErrorMessagesMain = false;
});
