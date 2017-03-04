const {app, BrowserWindow} = require('electron');
const path = require('path');
const url = require('url');
const ipcMain = require('electron').ipcMain;
const globalShortcut = require('electron').globalShortcut;

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win;

// This is critical for enabeling touch events:
app.commandLine.appendSwitch('touch-events', 'enabled');

var shouldQuit = app.makeSingleInstance(function(commandLine, workingDirectory) {
  // Someone tried to run a second instance, we should focus our window.
  if (win) {
    if (win.isMinimized()) win.restore();
    win.focus();
  }
});

if (shouldQuit) {
  app.quit();
  return;
}


function createWindow () {
  // Create the browser window.
  win = new BrowserWindow({width: 800, height: 600, minWidth: 730, minHeight: 550, icon: __dirname + '/images/icons/scribble-128.png', frame: false});

  // and load the index.html of the app.
  win.loadURL(url.format({
    pathname: path.join(__dirname, 'index.html'),
    protocol: 'file:',
    slashes: true
  }));
  
  win.maximize();
  
  global.theMainWindow = win; //This allows us to get a refference to the main window in the render process.

  // Open the DevTools.  -- Comment this out before releasing the final version.
  win.webContents.openDevTools();
  
  //console.log('before sending');
  //win.webContents.send('app-finished-loading');
  //console.log('after sending');

  win.on('close', function(e){
    // Once the user tries to click the close button, first prevent the default action of closing the app:
    e.preventDefault();
    // Then send a message to the render process, (main-window-js.js), so that we can check for unsaved work.
    win.webContents.send('close-button-clicked');
    // The applicable function in that file can then determine if it is safe to close the app, and warn the user if it isn't.
  });
  
  win.webContents.on('did-finish-load', function() {
    //console.log('finished loading main');
    setTimeout(function() {win.webContents.send('app-finished-loading');},500);
    //win.webContents.send('app-finished-loading');
  });
  
  win.on('focus', registerShortcuts);
  win.on('blur', unregisterShortcuts);
  registerShortcuts();
}

function registerShortcuts () {
  globalShortcut.register('CommandOrControl+z', function () {
    win.webContents.send('ctrl-z-pressed');
  });
}

function unregisterShortcuts () {
  globalShortcut.unregister('CommandOrControl+z', function () {
    win.webContents.send('ctrl-z-pressed');
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  app.quit();
})

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (win === null) {
    createWindow()
  }
})

ipcMain.on('terminate-this-app', () => {
  win.destroy(); // necessary to bypass the repeat-quit-check in the render process.
  app.quit()
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
