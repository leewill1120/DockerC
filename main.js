const electron = require('electron');
const fs = require('fs');
const dialog = electron.dialog;
const nodeProcess = require('process');

// Module to control application life.
const {app} = electron;
// Module to create native browser window.
const {BrowserWindow} = electron;

const ipcMain = electron.ipcMain;

const Tray = electron.Tray;

const globalShortcut = electron.globalShortcut;

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win;
let tray;

global.sharedObject = {
  networkId:'',
  containerId:'',
  imageId:'',
  pid:nodeProcess.pid
};

function createWindow() {
  // Create the browser window.
  win = new BrowserWindow({
    width: 1024, 
    height: 660,
    frame:false,
    show:false,
  });

  win.loadURL(`file://${__dirname}/index.html`);
  // and load the index.html of the app.

  // Open the DevTools.
  //win.webContents.openDevTools();

  // Emitted when the window is closed.
  win.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    win = null;
  });

}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', function(){
  var ret = globalShortcut.register('ctrl+F12', function() {
      win.webContents.openDevTools();
    })

    if (!ret) {
      console.log('registration failed');
    }
  var win_welcome = new BrowserWindow({
    width: 512, 
    height: 287,
    frame:false,
    resizable:false,
  });
  win_welcome.loadURL(`file://${__dirname}/html/welcome.html`);

  createWindow();

  setTimeout(function(){
    win_welcome.close();
    //默认最大化
    win.maximize();
    win.show();
  }, 3000);

  tray = new Tray(`${__dirname}/image/logo.ico`);
  var options = {
    icon:`${__dirname}/image/docker.png`,
    title:'欢迎使用iDC',
    content:'Easy to build, ship and run your app.'
  };
  tray.displayBalloon(options);
});

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (win === null) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

ipcMain.on('asynchronous-message', function(event, arg){
  console.log(arg);
  switch(arg.cmd){
    case 'openPlugin':
      win1 = new BrowserWindow(arg.argument.window);
      win1.loadURL(`file://${__dirname}/../plugins/${arg.argument.dir}/${arg.argument.index}`);
      //win1.webContents.openDevTools();
      break;
    case 'reload':
      win.reload();
      break;
    case 'openAppMarket':
      win3 = new BrowserWindow({
        width: 960, 
        height: 620,
        frame:false,
      });
      win3.loadURL(`file://${__dirname}/html/appMarket.html`);
      break;
    default:
      console.log(arg);
  }
});