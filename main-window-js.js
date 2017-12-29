
 /* Copyright 2016, 2017 Roger Frybarger

    This file is part of Roger's Math Whiteboard.

    Roger's Math Whiteboard is free software: you can redistribute
    it and/or modify it under the terms of the GNU General Public
    License version 2 as published by the Free Software Foundation.

    Roger's Math Whiteboard is distributed in the hope that it will
    be useful, but WITHOUT ANY WARRANTY; without even the implied
    warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR
    PURPOSE. See the GNU General Public License version 2 for more
    details.

    You should have received a copy of the GNU General Public
    License version 2 along with Roger's Math Whiteboard.  If not,
    see <http://www.gnu.org/licenses/>.*/

// These are global constants that allow us to access various functions within electron.
const { ipcRenderer } = require('electron');
const { dialog } = require('electron').remote;
const { desktopCapturer } = require('electron');
const { clipboard } = require('electron');
const remote = require('electron').remote;
const Menu = remote.Menu;
// Here we are getting a reference to the main window so we can use it for dialog boxes.
var theMainWindow = remote.getGlobal('theMainWindow');
var dateTimeOfThisRelease = remote.getGlobal('dateTimeOfThisRelease');
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

// When the window gets resized call the resize function:
window.addEventListener('resize', onWindowResize);

// Some global variables & constants related to errors:
var displayErrorMessages = true;
var errorTimestamps = [];
const errorDelimiter = '\n-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~\n'; // eslint-disable-next-line max-len
const platformAndVersionString = 'This is Roger\'s Math Whiteboard version ' + appVersion + '\nPlatform: ' + osModule.platform() + ' ' + osModule.release() + ' ' + osModule.arch() + '\nTotal RAM: ' + osModule.totalmem() + ' bytes.';

// Here is the event handler for uncaught errors:
// it basically tries to gather as much info as possible & put it into a log of sorts:
// From there it passes the error log off to the unexpectedErrorOccurred function.
process.on('uncaughtException', function (err){
  var tmpObj = {};
  var d = new Date();
  var n = d.getTime();
  tmpObj.timeOfErr = n;
  tmpObj.processFrom = 'Renderer'; // ----Visible!
  tmpObj.stackTrace = 'Empty :('; // ----Visible!
  tmpObj.messageTxt = 'Empty :('; // ----Visible!
  if(err.stack !== null && typeof err.stack !== 'undefined'){
    tmpObj.stackTrace = err.stack;
  }
  if(err.message !== null && typeof err.message !== 'undefined'){
    tmpObj.messageTxt = err.message;
  }
  unexpectedErrorOccurred(tmpObj);
});

ipcRenderer.on('unexpected-error-in-main', function (event, data){
  unexpectedErrorOccurred(data);
});

// Here is the error logging function. It takes care of logging the error if possible:
function unexpectedErrorOccurred(objToLog){
  try{
    var theBox = document.getElementById('SDErrorLogTextArea');
    var tmpStr = theBox.value;
    theBox.style.color = 'red';
    // If there isn't yet anything in there yet, we will put in the platform and version string
    // so at least we know what kind of system we are on.
    if(tmpStr === 'Empty'){
      tmpStr = platformAndVersionString;
    }
    tmpStr += errorDelimiter + 'Timestamp: ' + objToLog.timeOfErr;
    tmpStr += '\nProcess: ' + objToLog.processFrom;
    tmpStr += '\nMessage: ' + objToLog.messageTxt;
    tmpStr += '\nStack: ' + objToLog.stackTrace;
    var difference = 0;
    // We do have to stop logging errors somewhere or else the program could get really slow.
    if(tmpStr.length > 99999){
      difference = Math.abs(99999 - tmpStr.length);
      tmpStr = tmpStr.substring(difference, tmpStr.length);
      tmpStr = platformAndVersionString + errorDelimiter + tmpStr;
    }
    theBox.value = tmpStr;
    // Here is where we care about informing the user of what is happening:
    // If there have been 3 or more errors within 30 seconds, we will silence the notifications.
    // Otherwise, we will just give them one notification per error.
    errorTimestamps.unshift(objToLog.timeOfErr);
    if(displayErrorMessages){
      var threeErrorsWithin30Sec = false;
      if(errorTimestamps.length > 3){
        difference = errorTimestamps[0] - errorTimestamps[2];
        if(difference < 30000){
          threeErrorsWithin30Sec = true;
        }
      }
      if(threeErrorsWithin30Sec){
        // eslint-disable-next-line max-len
        dialog.showErrorBox('Multiple Unexpected Errors have Occurred. Save Your Work!', 'Unfortunately at least 3 unexpected errors have occurred within the past 30 seconds. Because of this, future error messages have been silenced. **It is highly recommended that you save your work and re-start this program as soon as possible!**. We are very sorry for any inconvenience these errors may cause. Also, after you save your work, please try to see the bottom of the settings dialog for details on how you can help us fix these errors.');
        displayErrorMessages = false;
      }
      else{
        // eslint-disable-next-line max-len
        dialog.showErrorBox('An Unexpected Error has Occurred.', 'Unfortunately, an unexpected error has occurred. We are sorry for any inconvenience this may cause. Please, if possible, see the bottom of the settings dialog for details on how you can help us fix this error.');
      }
    }
  }
  catch(e){
    // This means that the error occurred before the text area was ready to accept text.
    try{
      ipcRenderer.send('problem-before-logging-possible', objToLog);
    }
    catch(e2){
      // Well, this means that things are really messed up, and probably not worth
      // trying to recover from.
    }
  }
}

// These are the data urls for the cursor images
// I tried just using png images, but this was the only way I found to make it work:
const cursorImages = []; // eslint-disable-next-line max-len
cursorImages[0] = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB4AAAAtCAYAAAC53tuhAAADAFBMVEUAAAD/AAAA/wD//wAAAP//AP8A///////b29u2traSkpJtbW1JSUkkJCTbAAC2AACSAABtAABJAAAkAAAA2wAAtgAAkgAAbQAASQAAJADb2wC2tgCSkgBtbQBJSQAkJAAAANsAALYAAJIAAG0AAEkAACTbANu2ALaSAJJtAG1JAEkkACQA29sAtrYAkpIAbW0ASUkAJCT/29vbtra2kpKSbW1tSUlJJCT/trbbkpK2bW2SSUltJCT/kpLbbW22SUmSJCT/bW3bSUm2JCT/SUnbJCT/JCTb/9u227aStpJtkm1JbUkkSSS2/7aS25Jttm1JkkkkbSSS/5Jt221JtkkkkiRt/21J20kktiRJ/0kk2yQk/yTb2/+2ttuSkrZtbZJJSW0kJEm2tv+SktttbbZJSZIkJG2Skv9tbdtJSbYkJJJtbf9JSdskJLZJSf8kJNskJP///9vb27a2tpKSkm1tbUlJSST//7bb25K2tm2SkkltbST//5Lb2222tkmSkiT//23b20m2tiT//0nb2yT//yT/2//bttu2kraSbZJtSW1JJEn/tv/bktu2bbaSSZJtJG3/kv/bbdu2SbaSJJL/bf/bSdu2JLb/Sf/bJNv/JP/b//+229uStrZtkpJJbW0kSUm2//+S29tttrZJkpIkbW2S//9t29tJtrYkkpJt//9J29sktrZJ//8k29sk////27bbtpK2km2SbUltSSRJJAD/tpLbkm22bUmSSSRtJAD/ttvbkra2bZKSSW1tJElJACT/krbbbZK2SW2SJEltACTbtv+2ktuSbbZtSZJJJG0kAEm2kv+SbdttSbZJJJIkAG222/+SttttkrZJbZIkSW0AJEmStv9tkttJbbYkSZIAJG22/9uS27ZttpJJkm0kbUkASSSS/7Zt25JJtm0kkkkAbSTb/7a225KStm1tkklJbSQkSQC2/5KS221ttklJkiQkbQD/tgDbkgC2bQCSSQD/ALbbAJK2AG2SAEkAtv8AktsAbbYASZIAAAAAAADPKgIEAAADPElEQVRYw8XYz0s8dRzH8ed7ZsfADA+SFxEXE7q5FJ1EJE8rhAc9GFhXN+L7D1T243urTl6SQBFPXbqY64+DJR285cFEAsG+RYugtAp9V8hN3Hl12Vlmv9/5qrPujgN72fl8Po/P6z2fmQ8zAI95oEPAFw8FPwguQGYmM0sUl5kFqeU4TmK4MpmMlpaWEsfV39+vUqmkra2tMP55y+G+vj6dn59LkjY3N8P4Zy2F0+l0DU4Sfw5OCo+Ek8BfCEvSxsZGy/Ab4Qj808TgVuF3giPw2cRgSVpfX28aHgtuJh4bbhbeECxJa2trYfyTxOD74veCI/CPE4MbxZsCN4I3DY6LNxWWpHw+H8Y/SgyWpNXV1VvxlsDPPtvNrA5PNfLEuby8pFwuY2Y3thsZGWFhYYFcLgfwZXUSXzcMHx8fMzw8TFdX14sXjoTrurS3t2NmSAL4CnCqk4hf6kqlopmZmaCMZeAfoAQ8veV3AfwHfHBjYkmYGYVCgf39fcbHx5GE4zhMT0+zuLiI53l/ShoDrgGLGqNSqYT/sqDSkYl935cknZ6eanR0VAMDAyqVSrXzFxcXGhoaEiDXdd9uyu4UoCcnJ8pms7WVub29XXd+eXnZB9TW1vZ9KE1jcDhpNpsNBn4KKJfLqVKp1CZYKBSCSf1rZq/dO3EY9TzvF+ANMzsFdHh4WHdJZmdng3aP46ZWOp3W2dlZFLoHdAN4nvctoLm5OT9cmd3d3eA6PwHaYyXu7e1VqVRSsVjU2NhYGH01aOQ4zlvBm2UwSUkql8uamJgQoFQq9W6c1MpkMjo4ONDk5GQUWhvE87yfAeXz+brUKysrQb+fYiXu7u7W4OCgX511rbwh1ABSqdR7gKampvyrq6ta6mKxqJ6eHgG+4zhvxvkG4ld3kSg0fLziuu5fgPb29urugvn5+SD1N3cpt1OFzcz2fd/PAn9XO+mZtgZcOI7zHUB128PMuL6+pqOjAwDf998HeiL6Ryb+9ZakhBbZ60C5s7NTR0dH2tnZqa2N6kecP4DMXUr9213RWnSzH6or3A9t9r8Dj+LcUnHQoM07IfBJKpV6BLzcyPPaYrZ/CfjRzD50XddrZJz/AVAsT4UNpwycAAAAAElFTkSuQmCC';
// eslint-disable-next-line max-len
cursorImages[1] = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAA8CAYAAAAUufjgAAADAFBMVEUAAAD/AAAA/wD//wAAAP//AP8A///////b29u2traSkpJtbW1JSUkkJCTbAAC2AACSAABtAABJAAAkAAAA2wAAtgAAkgAAbQAASQAAJADb2wC2tgCSkgBtbQBJSQAkJAAAANsAALYAAJIAAG0AAEkAACTbANu2ALaSAJJtAG1JAEkkACQA29sAtrYAkpIAbW0ASUkAJCT/29vbtra2kpKSbW1tSUlJJCT/trbbkpK2bW2SSUltJCT/kpLbbW22SUmSJCT/bW3bSUm2JCT/SUnbJCT/JCTb/9u227aStpJtkm1JbUkkSSS2/7aS25Jttm1JkkkkbSSS/5Jt221JtkkkkiRt/21J20kktiRJ/0kk2yQk/yTb2/+2ttuSkrZtbZJJSW0kJEm2tv+SktttbbZJSZIkJG2Skv9tbdtJSbYkJJJtbf9JSdskJLZJSf8kJNskJP///9vb27a2tpKSkm1tbUlJSST//7bb25K2tm2SkkltbST//5Lb2222tkmSkiT//23b20m2tiT//0nb2yT//yT/2//bttu2kraSbZJtSW1JJEn/tv/bktu2bbaSSZJtJG3/kv/bbdu2SbaSJJL/bf/bSdu2JLb/Sf/bJNv/JP/b//+229uStrZtkpJJbW0kSUm2//+S29tttrZJkpIkbW2S//9t29tJtrYkkpJt//9J29sktrZJ//8k29sk////27bbtpK2km2SbUltSSRJJAD/tpLbkm22bUmSSSRtJAD/ttvbkra2bZKSSW1tJElJACT/krbbbZK2SW2SJEltACTbtv+2ktuSbbZtSZJJJG0kAEm2kv+SbdttSbZJJJIkAG222/+SttttkrZJbZIkSW0AJEmStv9tkttJbbYkSZIAJG22/9uS27ZttpJJkm0kbUkASSSS/7Zt25JJtm0kkkkAbSTb/7a225KStm1tkklJbSQkSQC2/5KS221ttklJkiQkbQD/tgDbkgC2bQCSSQD/ALbbAJK2AG2SAEkAtv8AktsAbbYASZIAAAAAAADPKgIEAAAEAUlEQVRo3s3YTUgjSRgG4LcqwYMBEcTbLDmuLngQ2dughxGNxp+5rYiX9eAKoh4cJ+v+zI8zszs6e1q8OBeHxagXQY1RxOOIu3OyQZxDEEEYwp7EgcVDoOubg11NbTrRTnfHVEEwJPV1PXmrurptAHgGzRsBeKo7UGsk6Y4k3ZHEGLOB1vun2iUYjUbzkU+00HHOCQDNzMzQ3t6edkgu35imiY6ODuzu7l7HSgTG2PNKI20gEQEAYrFYIeSvFQeqrQByFsAv2gCLIF9UAslv+lIHJL+tQ6WR3E2nWCyGnZ2diiC5245dXV1Ip9N3juSldO7u7i6E/FkbYBHky3IiuZeiIsiftAEWQb4qB5L7KS6CnNEGKJHb29sq8rcgkTyIg8Tj8bIheVC/tFxIHuR6icfjSKVSgSJ50GddT09PoMjAgTcgf9QGWAT5O4CENkCJ3NraUpGvS0WWFQgAvb29vpBlB96AfKwNsAhyzg3yzoBekXcKlMjNzU3XyDsHAkBfX59rZEWAErmxsZGPnNYGCAD9/f3/28wBzAN4pPYJBzEQEWFpaQmZTAZVVVX2c55bz1B+nU80GsX5+bn8+I3194/AgIwx1NXVYW5uztcxlB/2xprd+XBQ09XW1oampiYcHx8jFAqBiP5zWyuEyE+dA3gB4LMn4Pr6OlpbW1FfX29/Vltbi9HRUYyNjREAJoR4DeAtgAiuH4qWHCqAsP2EdXp6mty05eVlAkCpVMrx3enpKQEQFuh9MP+UlACUOAA0MDBAuVzO0WdycpIAkHXc+0oa5QVKHGNMDk6GYTj6HRwcEAARCoUIwDu/QFf7YDKZxNDQkH2mMXY9nryuqq25uRnt7e3MNE0wxh4CuOdxDbpLUE3OGmgcgAGAIpEIZbNZR00ymSQAIhwOk3IJY4EDC+BGrLKENbhYXV111GWzWaqurpY1HwFUBZ6glYL6GlHKvmKMfQZAnZ2ddHV15UDOzs4SALLWYp/nFAsBb8HJQf6yBheHh4cOoGEYBEBYx0/5TjCRSBAR0crKyk04Fdgma6emphzAXC5Hg4ODconkAHzje4rX1tZuw+W3D7Lv2dmZA5lOp9WTZd7rNBMAqqmpKQUnB/lBTvPi4qIDeHFxQY2NjTLFTwBqPd0tFXiNuKytY4z9C4BaWlro8vLSgVxYWFA37u+9pOgVJwf5U245+/v7REQkhLCBmUxGvT4f+E1w1EN9M+fcBEDDw8NkmqaNPDo6oomJCRVIAB6UmqIfnGz71jGEYRh0cnJC4+PjNkzZ6D8A+NZLgl5xMoXvJKKhocGGcc7ljcXfAB4WqHPV/CQnWwTAmYUUyu1WPszfrZfPFJ8ry+UfHWD57WtrjXUHCfsCgCXL0KFJxCkAAAAASUVORK5CYII=';
// eslint-disable-next-line max-len
cursorImages[2] = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAABLCAYAAAAyEtS4AAADAFBMVEUAAAD/AAAA/wD//wAAAP//AP8A///////b29u2traSkpJtbW1JSUkkJCTbAAC2AACSAABtAABJAAAkAAAA2wAAtgAAkgAAbQAASQAAJADb2wC2tgCSkgBtbQBJSQAkJAAAANsAALYAAJIAAG0AAEkAACTbANu2ALaSAJJtAG1JAEkkACQA29sAtrYAkpIAbW0ASUkAJCT/29vbtra2kpKSbW1tSUlJJCT/trbbkpK2bW2SSUltJCT/kpLbbW22SUmSJCT/bW3bSUm2JCT/SUnbJCT/JCTb/9u227aStpJtkm1JbUkkSSS2/7aS25Jttm1JkkkkbSSS/5Jt221JtkkkkiRt/21J20kktiRJ/0kk2yQk/yTb2/+2ttuSkrZtbZJJSW0kJEm2tv+SktttbbZJSZIkJG2Skv9tbdtJSbYkJJJtbf9JSdskJLZJSf8kJNskJP///9vb27a2tpKSkm1tbUlJSST//7bb25K2tm2SkkltbST//5Lb2222tkmSkiT//23b20m2tiT//0nb2yT//yT/2//bttu2kraSbZJtSW1JJEn/tv/bktu2bbaSSZJtJG3/kv/bbdu2SbaSJJL/bf/bSdu2JLb/Sf/bJNv/JP/b//+229uStrZtkpJJbW0kSUm2//+S29tttrZJkpIkbW2S//9t29tJtrYkkpJt//9J29sktrZJ//8k29sk////27bbtpK2km2SbUltSSRJJAD/tpLbkm22bUmSSSRtJAD/ttvbkra2bZKSSW1tJElJACT/krbbbZK2SW2SJEltACTbtv+2ktuSbbZtSZJJJG0kAEm2kv+SbdttSbZJJJIkAG222/+SttttkrZJbZIkSW0AJEmStv9tkttJbbYkSZIAJG22/9uS27ZttpJJkm0kbUkASSSS/7Zt25JJtm0kkkkAbSTb/7a225KStm1tkklJbSQkSQC2/5KS221ttklJkiQkbQD/tgDbkgC2bQCSSQD/ALbbAJK2AG2SAEkAtv8AktsAbbYASZIAAAAAAADPKgIEAAAFH0lEQVRo3t3bT2gcVRzA8e/sTDZQSWoPIq2nguSQgmINrZK0SEFKivlzSDCQW2xuHpRGo1ajIEWqiV7EQ1u9FgkkmzT/WaSLSUuFCpFALt02kJVSFiSLbGLjOj8PzltftrOb7O7sn8mDJf/em3mf9/v9XjIvCcBn7JMmwKf7BbIvMLJfMLJfMLJfMGmAYRi+xjyB0N4f8hVETby3t1fq6up8ixHLsgSQ+fl5iUQivo1MGjIzMyMiIrOzs77EpCHT09Oi2tzcnBvmE99BcmA+9g3Etm1fYrJGZBfMRd9BcmwAF30H8QNmz5Bqx+QFqWZM3hARkZmZmarDFAQREZmennbDfOQ7SLVhioLkwHzoO0gOzAe+g1QDxjNIpTGeQiqJ8RxSKUxJICIiU1NTZcWUDJIDM+g7iIjIjRs3yoIpOaRcmLJAREQmJydLiikbJAfmfd9BcmDe8x2kFJhApZ4d2tramJyc/G8lRTAMA+BLYMBXkByYrwrBVBTiJabiEK8wVQFRmImJiYIxVQMBaG9vLxhTVRCFCYVCeWOqDgLQ0dGRDXPBNxARSWPGx8czMcPZMFUHcSYMQGdnJ3NzcxiGkQY6mHczx1mlmtDDhw9ZXl6mpqZGn0TeqGAwSE9PD9evX9dBXztdvik5RERobW31NFIZC7IDU7LUOnLkCMPDwwDU1tZiWRaWZWGa5p5fqr8LQsdcKGlEAM6dO8fAwADb29tqIingL2cBBTCKCbpznS+AP61iUscwDKLRKPfu3ePs2bNP9GloaOD8+fNcu3aNQCCAbdtxoBVIAKYXGexgzIKeR9RvfdfX1+X48eNy6tQp2dzcdO0bDodFvwfQVRXHQTqiubk5/XB0+/Zt1/6JREJOnjwpgO08QP1UCkSgkHSKxWL09PSwtLREMBgEYGxszHVMfX09/f39AIZpmgCvAU0Vi4hbJLR0EUAePHjgOnZtbU31sZ2336ldtayQLAg1qfT4q1evZl2IwcFBASQQCAgQB54ta0R0REtLSyYiDCyqw4MTJ05IIpFwhdy5c0cAMU1TjX3b66hkheyCWARqnF0ofY1wOOwK2drakra2Nv3U5FePtuDckF0QPwMHnfF1wH0nZaS/v19SqZQrZnR0NLO2XvcyKln/OmgPCLXrfe6stA3I6uqqK+TRo0dy+PBhveh/LHlEYrGYnD59OhdCX8UGYNM0TQFkZGQka9FfvnxZ1YoASeB5zyFTU1PpSLggFrMgVBtTW+zRo0clHo+7QlZWVkSPHv//k4HhGSQcDks8Hs9W2NkQ6uNW/VqhUMgVkkqlpK+vT9+Ko8BTnkREFerIyIh0d3fnGwnVaoDf1Fbc1dUljx8/dsUsLCxkFv2bXkRFX53MvX6vCPW1C861bEDu3r3rCtnY2JCmpib956+wJxHRT8W13N0rQm/PAX+ooh8aGspa9FeuXNGj8g/wsmcQbVssBKH6/aCuFQwGJRaLuX6TjcVicuDAAf2e3xaTXoEMkAHcAt5wHn4M5/P5tO8BLMsytre3uXnz5o5jHnVKkkwmOXbsmPMpA6AbeKaA++0AqFW5BRzyoPCWnNy3z5w5I8lkMh2RaDQqly5d0tPZ1jLinWLurSOeLhKhxr2lbxqRSETW19d3ALRCVws5DrxUbI14FQnVDgG/q4k2NjaqehDAVpuB8xoDXnFZjLzbLx4jDO2oRk+d3QBFt4MeIvT2AvA3T/6nkBvA63t73mY1QAh41W8ANcEuIAK8WGrAvxtbu2ZEijxXAAAAAElFTkSuQmCC';
// eslint-disable-next-line max-len
cursorImages[3] = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB4AAAAtCAYAAAC53tuhAAADAFBMVEUAAAD/AAAA/wD//wAAAP//AP8A///////b29u2traSkpJtbW1JSUkkJCTbAAC2AACSAABtAABJAAAkAAAA2wAAtgAAkgAAbQAASQAAJADb2wC2tgCSkgBtbQBJSQAkJAAAANsAALYAAJIAAG0AAEkAACTbANu2ALaSAJJtAG1JAEkkACQA29sAtrYAkpIAbW0ASUkAJCT/29vbtra2kpKSbW1tSUlJJCT/trbbkpK2bW2SSUltJCT/kpLbbW22SUmSJCT/bW3bSUm2JCT/SUnbJCT/JCTb/9u227aStpJtkm1JbUkkSSS2/7aS25Jttm1JkkkkbSSS/5Jt221JtkkkkiRt/21J20kktiRJ/0kk2yQk/yTb2/+2ttuSkrZtbZJJSW0kJEm2tv+SktttbbZJSZIkJG2Skv9tbdtJSbYkJJJtbf9JSdskJLZJSf8kJNskJP///9vb27a2tpKSkm1tbUlJSST//7bb25K2tm2SkkltbST//5Lb2222tkmSkiT//23b20m2tiT//0nb2yT//yT/2//bttu2kraSbZJtSW1JJEn/tv/bktu2bbaSSZJtJG3/kv/bbdu2SbaSJJL/bf/bSdu2JLb/Sf/bJNv/JP/b//+229uStrZtkpJJbW0kSUm2//+S29tttrZJkpIkbW2S//9t29tJtrYkkpJt//9J29sktrZJ//8k29sk////27bbtpK2km2SbUltSSRJJAD/tpLbkm22bUmSSSRtJAD/ttvbkra2bZKSSW1tJElJACT/krbbbZK2SW2SJEltACTbtv+2ktuSbbZtSZJJJG0kAEm2kv+SbdttSbZJJJIkAG222/+SttttkrZJbZIkSW0AJEmStv9tkttJbbYkSZIAJG22/9uS27ZttpJJkm0kbUkASSSS/7Zt25JJtm0kkkkAbSTb/7a225KStm1tkklJbSQkSQC2/5KS221ttklJkiQkbQD/tgDbkgC2bQCSSQD/ALbbAJK2AG2SAEkAtv8AktsAbbYASZIAAAAAAADPKgIEAAACsklEQVRYw8XYPWgUQRjG8f/M3O1dTkxnQCQYsBALuSjaC4IarETEwspGkICV4GfUyg/SiSC2FhaCYGNjhEO0stHCiIhRxMaQKCZGSYjuY7Fzl4msudvL3WZhONjdm988737MzQFcYY02AZfXCl4TXIBM0nLF5ZZSy+aIa9Ba3SsUGrjLCdeAc/rhnJ4ZE+KXug5vdk5fnZNANWtDfKTrieuwQLXlyUdyg/PCU+E88P/C3cZXhFPwi7nB3cJbglPwC7nBncYzwZ3EM8OdwtuCU/DzucGrxVcFp+DncoMFqgU/JlrFOwK3g3cMzop3FE7Bz+YGt4p3BRboaYCbFDwzvAiaBy00aQI9CnDgTB0ttPOqmzKGExIAZoVVggUcUAQWk93X/e5rbcEbJbYZw2iCLwDzvkM1+ar1i8RvhWZrGwN8LpV4E0Xsn5tDEgY4AowmaT46OGDgd1oB5EcVbKZe6dRrHPvPyXJZe0slVaNIP4vFxvF50CF/7YqwpyOzU4gOlcuNm+N5FC07/sCYGFAE94M07cH/oDGgEswAOlUuS8EAp0D9yaB+Odiy6sQhWoQXwA7gC9ZqIii3QDeWUl/JmloDzmnaw5M9PSH6EugDiOA2oDuFQhxWZtyvtQxMGKhkStzvnGat1XSloqFKJUQ31E9ysAvQbmM0a0wj8R/QcT8fF+FoltSqWqvXvb06nI42OilCjWTiX5Z6zJe7CE8yJe6zVtWU8gao8fAxQMMQx8F1njFGg0nq2MHOLP+BxH4WSUPD18564BOgd77c9QHcXUp9q9Vyx/7meLUSWt8XwVVAN3256+2x78fCd2BTq4mboQQ32VZgfrt/jt+CTnvUtw9AtRV4vFU0iP4Q0L7l4HsDw2R4pLKg9XMOmiVwIkrAde28r03G80vAmIWTPcl0m7mfv6hWsQDMV+K4AAAAAElFTkSuQmCC';
// eslint-disable-next-line max-len
cursorImages[4] = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAA8CAYAAAAUufjgAAADAFBMVEUAAAD/AAAA/wD//wAAAP//AP8A///////b29u2traSkpJtbW1JSUkkJCTbAAC2AACSAABtAABJAAAkAAAA2wAAtgAAkgAAbQAASQAAJADb2wC2tgCSkgBtbQBJSQAkJAAAANsAALYAAJIAAG0AAEkAACTbANu2ALaSAJJtAG1JAEkkACQA29sAtrYAkpIAbW0ASUkAJCT/29vbtra2kpKSbW1tSUlJJCT/trbbkpK2bW2SSUltJCT/kpLbbW22SUmSJCT/bW3bSUm2JCT/SUnbJCT/JCTb/9u227aStpJtkm1JbUkkSSS2/7aS25Jttm1JkkkkbSSS/5Jt221JtkkkkiRt/21J20kktiRJ/0kk2yQk/yTb2/+2ttuSkrZtbZJJSW0kJEm2tv+SktttbbZJSZIkJG2Skv9tbdtJSbYkJJJtbf9JSdskJLZJSf8kJNskJP///9vb27a2tpKSkm1tbUlJSST//7bb25K2tm2SkkltbST//5Lb2222tkmSkiT//23b20m2tiT//0nb2yT//yT/2//bttu2kraSbZJtSW1JJEn/tv/bktu2bbaSSZJtJG3/kv/bbdu2SbaSJJL/bf/bSdu2JLb/Sf/bJNv/JP/b//+229uStrZtkpJJbW0kSUm2//+S29tttrZJkpIkbW2S//9t29tJtrYkkpJt//9J29sktrZJ//8k29sk////27bbtpK2km2SbUltSSRJJAD/tpLbkm22bUmSSSRtJAD/ttvbkra2bZKSSW1tJElJACT/krbbbZK2SW2SJEltACTbtv+2ktuSbbZtSZJJJG0kAEm2kv+SbdttSbZJJJIkAG222/+SttttkrZJbZIkSW0AJEmStv9tkttJbbYkSZIAJG22/9uS27ZttpJJkm0kbUkASSSS/7Zt25JJtm0kkkkAbSTb/7a225KStm1tkklJbSQkSQC2/5KS221ttklJkiQkbQD/tgDbkgC2bQCSSQD/ALbbAJK2AG2SAEkAtv8AktsAbbYASZIAAAAAAADPKgIEAAADdklEQVRo3s3aP4hcVRTH8e+5781kQ8jMJksKwbQJ2hmwCEYSsBMUtdEiTVCijVYmq4nmDxZJNlYWEazEwhU72Ua0CVn/hhQhhdjESlRcEAMRhpC8n8XcN/Nm5r3NzPszey8s+2fu2fuZc+6977AswDkCHwLOhg4MGqnQkQodKcsALUCkAD3mnNpmWeSZIHTOA0+32/o+ioRHulCQKfBEuy2Zad25sJDjQEEe8v2ggAXI94ICBoPcDBgE8mHALUdOA9xS5LRAgdbN5o+cBViAPB0UcID0cY0jywALkKeCAs4NWQVYgHw3KGDjyDqAjSLrAjaGrBPYCLJuYO3IJoAFyHeCAhYgl4MC1oJsGlgV6ebR0h2SWDcDIOkvehE4GQywAHlpGuTcgGWRcwUOkP7raZBzBwIcghGkbYLcEqA88lrme488EQTQ/OengetAxyOBFeDt7Ny4rkWvmnFbojVcbCpoDBww46qE9WMv+5c/rBUoM16TSgYPcOm47Ku7UhvwoMRzwBqkWbw7beyDyaw74APgzuxA51jrdHiq12N3rzf48YLEUTPWJAnsfv9p8QmwY4aqT+6AmZ7Fzmm12xVxrG86nYnX/zTTUv/mUOYmmVNH7Zw+73aFcwL06sKCHsTxxLwLvjGIhrdJ9uA2BEwz53EGwjn92m5PzL3Vn5P43/tp80DntLq4OMBlsqOVnTsl50bm3wcdG7ZW/wKPNlfiHBzwJnAT0N5WSxvbtk28qa/7ZU7i/vyTlbJYCMzHHfdhy37x5Ksc4D/Oad9wO/wCtOvNYBRpddeuIhzAXoM7gF6JIt0bK7NAV3ys3w7Pl87iCDDFLS2JKCrCpYt85kCYJbdygLf7f0dMr5y1yhlcbrWkOB7B2SQuCzycHpYLOYcrMdNbPosO7gGPVyvx9u36cs+eh+HGx8+AHgH9nYP8wR8W/0ZWypZZgLpxvFlZizqm1weHJef+/M9MR4aH5XdgsWz/OP5xfMrYJYO/AL0E6uVk8YvRK+dYmSyWxaWLfORLmNzwwCQD3DDT7uHz+buqGXyjRPwTke+Yzow3D6CPQQtDoIBnZs1iFVw6vsVD/gBtgK6AOqMw+UP1ZJkMlsWlWXg5/beCF0H7MjC/934EXsiJm2pUyVw6dgC/+Ssr2QRWrbOpmMXz6f1p8FMIsPGx3++xZ+uE/Q+v/u9twwSC+QAAAABJRU5ErkJggg==';
// eslint-disable-next-line max-len
cursorImages[5] = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAABLCAYAAAAyEtS4AAADAFBMVEUAAAD/AAAA/wD//wAAAP//AP8A///////b29u2traSkpJtbW1JSUkkJCTbAAC2AACSAABtAABJAAAkAAAA2wAAtgAAkgAAbQAASQAAJADb2wC2tgCSkgBtbQBJSQAkJAAAANsAALYAAJIAAG0AAEkAACTbANu2ALaSAJJtAG1JAEkkACQA29sAtrYAkpIAbW0ASUkAJCT/29vbtra2kpKSbW1tSUlJJCT/trbbkpK2bW2SSUltJCT/kpLbbW22SUmSJCT/bW3bSUm2JCT/SUnbJCT/JCTb/9u227aStpJtkm1JbUkkSSS2/7aS25Jttm1JkkkkbSSS/5Jt221JtkkkkiRt/21J20kktiRJ/0kk2yQk/yTb2/+2ttuSkrZtbZJJSW0kJEm2tv+SktttbbZJSZIkJG2Skv9tbdtJSbYkJJJtbf9JSdskJLZJSf8kJNskJP///9vb27a2tpKSkm1tbUlJSST//7bb25K2tm2SkkltbST//5Lb2222tkmSkiT//23b20m2tiT//0nb2yT//yT/2//bttu2kraSbZJtSW1JJEn/tv/bktu2bbaSSZJtJG3/kv/bbdu2SbaSJJL/bf/bSdu2JLb/Sf/bJNv/JP/b//+229uStrZtkpJJbW0kSUm2//+S29tttrZJkpIkbW2S//9t29tJtrYkkpJt//9J29sktrZJ//8k29sk////27bbtpK2km2SbUltSSRJJAD/tpLbkm22bUmSSSRtJAD/ttvbkra2bZKSSW1tJElJACT/krbbbZK2SW2SJEltACTbtv+2ktuSbbZtSZJJJG0kAEm2kv+SbdttSbZJJJIkAG222/+SttttkrZJbZIkSW0AJEmStv9tkttJbbYkSZIAJG22/9uS27ZttpJJkm0kbUkASSSS/7Zt25JJtm0kkkkAbSTb/7a225KStm1tkklJbSQkSQC2/5KS221ttklJkiQkbQD/tgDbkgC2bQCSSQD/ALbbAJK2AG2SAEkAtv8AktsAbbYASZIAAAAAAADPKgIEAAAEfElEQVRo3t3aT2gcVRzA8e97M2UTks3uQkMPgl7Eo0HMQVFIqFgsCF6iguDJgxZ6sLRJtWob6MGLxIvoRUTx5KUKjXhJhWK7gtgKXv0HgRWlpRCTFBub+XnY93bebmYm3Z3Z3Zl9sDDZvHnzPu/3e+/Nzi7AMiNSBDg3KpCRwMioYGRUMDIqmBZAFxyzB6HC47OFgtiOHyuV5H6lOmGFwYgPglKyNj4u17UWCoppQb4eGxMBqXteITF7IAJSj47MO4WCBMmYtwsVESkgJhGSgHmrcJCiYO4JUgTMPUPyjukKkmdM15C8YnqCJGDOFA6SN0wqSALmzcJBEjBvFA6SB0xmkGFjMoUISF2poWAyhwwL0xfIMDB9gyRgThcO0sLsfex0unCQQWEGAhkEZmCQBMxS4SAJmMXCQfqFGQokAXOqcJCsMUOFZIkZOiQrTC4gWWByA0mLyRVEQOrR32ueKhwkAXMyDqHz+l3H40DdHAeAah6+F4fJLcRifgSmTTgIMSc66/r96sRtoJFypAQ4BCxqzVIQoE10gBVT5f2+z5F/lJJZZwVK+1LR75/oe2qVRTium80fMDne64v21HLLip0zfj9z/JndXSaBrfCtu8C/ZgDF6WevmaeBd4FNP00rCvhjcpKG5/HkxsaeOoeARaU4J4IH7MIN4CiwAXhZfJYyGK+nOWK/vm6UyzI7MSFHqlXZiTn3mucJIF6Y1wu5eBzkIubK5WbntJafKpXI+ndBXm5O+sBM2G/7gdC9pNOf5TIvAZc3NykBBAGrOzvg7c0WD3ixeajMf+eB2aFFJCoSvrMUVn1f/vL9yHNvai0PmKiY+h+aa6uBQmIQtlMt0OcHD4ooFdnGR2ZPMXVvmLVgcBHZB7EGXLGb1ZGxMdmOGYxfws3Rnns866jEQlqIqSmZm5rqRFwxe91Ca1XSWr4fH4+OqlJyTGv3bvZ6RktwMmQfxHdAxW7iwO/2VnupVBLROhJzyfcFpdy59XSWUYn9mVOjUtkPYVe986200VrWYyb9llJyuH0p/qLvEWnUajJfrSYh3FF8CLhtR/qzGIiAfGrSy9TdBh7MHLJqII1aTeZrtag5UUlIhQtmlIOnlJKtmNVr3fOEJsa2u5xVeoU/ziyV5GatJnPdIezfR92luB4DEaVk2axg5rblN2Aik4jYiboyPS0vdB8JWw4AP9u2FuMgINfaVy8JN/90UQkbDW/wukXY/51094r1GMgdreXZ5rXspF/LJCLupzDVPcIt9wG37J3uxwlRudi+0+8Cj2YGIR3C1vvETvoZpWQjBnNLKZlpX4o/SJtenYirQLWHRm3dJ9xJf8lAgg7INsir7c+t/jYPTFJFxCLqQC2DiXfVdC54rQOxBbIKcjhM58AZzNfTXNtFVFMi7HmvuAP0K8gdkIsOwEkpW+9L4JG0EckqErbUgIbt6PMgzzmd9tsf71wAHosYjK7LDxkjlPOoRnQY8f0AqUslQ4RbHgb+c5b1JEDW1868fONM5K/M49xCAWwHF4DLwEy/Af8DqFpssdlCVb8AAAAASUVORK5CYII=';

// A global var to keep track of the cursor image/value:
var currentCursorValue = 'default';


var safeToClose = true; // Starting off as true and will be changed once changes are made to the board.
var allLoaded = false; // This is used to know if the app has finished loading.

// Some stuff for auto-save and regular save:
var currentAutosaveValue = 'never';
var autosaveInterval;
var pathOfFolderToSaveInto = '';

// *****Here are some global variables that are directly related to drawing & working with the canvas:*****
var context; // This is the context used for drawing the image on the canvas
var eraserContext; // This is the context for the canvas used for the original images,
// which is where the eraser gets its data from.
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

var useWidescreenTemplates = true;
var useColorInvertedTemplates = false;

// These are used to load a set of data urls into the array of images.
// I wish there was a better way to do things like this but the images 
// must load asynchronously so having a bunch of global variables to
// keep track of things seems like the only way to me.
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


// Here is the function that runs about 1/2 second after the main.js process has finished doing its thing.
// it basically sets up a bunch of GUI stuff & initializes some global variables.
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
  setUpErrorLog();
  checkAgeOfRelease();
}

// This just receives the path to the user's home folder and assigns it to the global variable.
// Note: this also happens about 1/2 second after main.js finishes doing its thing.
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
  image.src = 'images/Blank_White_Page-wide.png';
}

// *****The section below is a great place to see a basic summary of how the drawing process works*****

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

// *****As the 6 functions above show, all touch/mouse/pen input from the canvas ultimately get dumped into one of 3 functions:
//      1. instrumentDown()
//      2. instrumentMoved()  or
//      3. instrumentUp().
//      From there, the input gets passed out to the appropriate tool function depending on what tool is in use*****

function setUpGUIOnStartup(){
  updateColorOfColorBtn();
  document.getElementById('toolBtn').innerHTML = 'Tool: P';
  document.getElementById('sizeBtn').innerHTML = 'Size: M';
}

// This function runs about 1/2 second after main.js finishes doing its thing and just checks to see if the user's screen size
// is within the reasonable limits for this program.
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

function setUpErrorLog(){
  var tmpElement = document.getElementById('SDErrorLogTextArea');
  if(tmpElement.value === 'Empty'){
    tmpElement.value = platformAndVersionString;
  }
}

// This just checks to see if this version is more than 7 months old & tells the user to update it if it is.
// Remember that the intended audience is schools and they are often pretty out of date anyhow.
// Thus, the best that we can realistically hope for is to have them update it twice per year between
// the semesters. Other than that we need to assume that the program will run essentially offline and
// be embedded into the school's seasonally updated disk image twice a year.
function checkAgeOfRelease(){
  var d = new Date();
  var now = d.getTime();
  var difference = now - dateTimeOfThisRelease;
  if(difference > 18408222000){
    // eslint-disable-next-line max-len
    var ret = dialog.showMessageBox(theMainWindow, { title: ' ', type: 'info', message: 'Sorry to bother you, but it seems that this copy of Roger\'s Math Whiteboard is over 7 months old! Consider checking the downloads section of our website to see if there is a more recent version. \n\nFor reference this is Roger\'s Math Whiteboard version ' + appVersion, buttons: ['Use This Copy For Now', 'Open Website'], defaultId: 0, noLink: true });
    if(ret === 1){
      document.getElementById('ADMainSiteLink').click();
    }
  }
}

// Here is the stuff that accepts keyboard input when the document has focus:
function validateKeyboardInputForDocument(e){
  if(weGotKeyboardShortcuts && e.target.nodeName === 'BODY'){
    e.preventDefault();
    passKeyboardInputOffToFunction(e);
  }
}

// Here is the stuff that accepts keyboard input when the canvas has focus:
function recieveKeyboardInputFromCanvas(e){ // eslint-disable-line no-unused-vars
  if(weGotKeyboardShortcuts){
    e.preventDefault();
    passKeyboardInputOffToFunction(e);
  }
}

// Here is the function that actually determines what to do depending on what keyboard shortcut was pressed:
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
  if(pathOfFolderToSaveInto !== ''){
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
  cancelSelect();
  if(canUseTool === false){
    nextPageBtnFunction();
  }
}

function previousPageKeyboardShortcutPressed(){
  cancelSelect();
  if(canUseTool === false){
    previousPageBtnFunction();
  }
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
      if(typeof tool !== 'undefined'){ 
        // This validation should help to reduce unnecessary error logs & help debugging.
        // That way, if/when things go south, we are more likely to find the root of the
        // problem instead of being overloaded by an error message for every mouse move.
        throw new Error('Invalid tool in instrumentMoved function: ' + tool);
      }
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
// Note that if the color is not transparent we will connect the dots.
// However if the color is transparent, we will not connect them to
// reduce the transparency overlap.
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
    tempCanvasForInterval = 'NA';
    
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
    if(useColorInvertedTemplates){
      context.strokeStyle = 'rgba(255, 255, 255, 1.0)';
    }
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
    if(useColorInvertedTemplates){
      context.strokeStyle = 'rgba(255, 255, 255, 1.0)';
    }
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
    tempCanvasForInterval = 'NA';
    
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
    if(useColorInvertedTemplates){
      context.fillStyle = 'rgba(255, 255, 255, 0.5)';
    }
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
    if(useColorInvertedTemplates){
      context.fillStyle = 'rgba(255, 255, 255, 0.5)';
    }
    context.fill();
    
    break;
  case 'up':
    
    //      Paint tempCanvasForInterval onto the real canvas.
    
    context.drawImage(tempCanvasForInterval, 0, 0, context.canvas.width, context.canvas.height);
    tempCanvasForInterval = 'NA';
    
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
    if(useColorInvertedTemplates){
      context.fillStyle = 'rgba(255, 255, 255, 0.5)';
    }
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
    if(useColorInvertedTemplates){
      context.fillStyle = 'rgba(255, 255, 255, 0.5)';
    }
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
    tempCanvasForInterval = 'NA';
    
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
      tempCanvasForInterval = 'NA';
      
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
    tempCanvasForInterval = 'NA';
    
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
    // 3. paint an opaque gray line onto the canvas between the starting point & current position.
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
    tempCanvasForInterval = 'NA';
    
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
    tempCanvasForInterval = 'NA';
    
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
      // 3. paint the image in copiedSectionOfCanvasForScale onto the canvas at prevX, prevY.
      prevX = x;
      prevY = y;
      context.drawImage(tempCanvasForInterval, 0, 0, context.canvas.width, context.canvas.height);
      context.putImageData(copiedSectionOfCanvasForScale, prevX, (prevY - copiedSectionOfCanvasForScale.height));
      
      break;
    case 'up':
      
      //      1. Paint tempCanvasForInterval onto the real canvas.
      //      2. paint the image in copiedSectionOfCanvasForScale onto the canvas at prevX, prevY.
      context.drawImage(tempCanvasForInterval, 0, 0, context.canvas.width, context.canvas.height);
      context.putImageData(copiedSectionOfCanvasForScale, prevX, (prevY - copiedSectionOfCanvasForScale.height));
      tempCanvasForInterval = 'NA';
      
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
      weGotKeyboardShortcuts = false;
      ipcRenderer.send('terminate-this-app');
    }
    // If the user chooses to cancel, we will do nothing and let them save the file(s) on their own.
  }
  else{
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
  
  // And if they don't click on one of a few select buttons, we should cancel select.
  var id = e.target.id;
  if(id !== 'canvas1' && id !== 'copyBtn' && id !== 'drawRectangleBtn' && id !== 'fillRectangleBtn' &&
  id !== 'drawEllipseBtn' && id !== 'fillEllipseBtn' && id !== 'topRightMinimizeBtn'){
    cancelSelect();
  }
  
  // And if they haven't clicked on the page text box or the go button, let's update the page number.
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


// Here is the set of functions that handle asynchronously loading a set of dataURLs:
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

// When all of the dataURLs have finished loading, this function is called to load the first image onto the canvas:
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
  eraserContext.canvas.style.top = (screen.height + topToolbarWidth) + 'px';

  // Maybe there is a better way to do this than fixed positioning in the CSS.
  // However, for now, we will do it this way:
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

// Here is the function that executes when the user wants to insert a template from one of the 
// ones on the main dropdown. Take note of the naming convention used to differentiate
// between normal templates and widescreen, & inverted color templates.
function mainUIInsertTemplateAsPage(location){ // eslint-disable-line no-unused-vars
  var before = location.substring(0, (location.length - 4));
  if(useWidescreenTemplates){
    before += '-wide';
  }
  if(useColorInvertedTemplates){
    before += '-b';
  }
  before += '.png';
  insertTemplateAsPage(before);
}

// This function simply loads a template in from an image and then passes the image off to the function that inserts
// pages using images:
function insertTemplateAsPage(locationOfTemplate){
  // Get the image from the string that was passed in, then call insertPageUsingImage() and pass in the image.
  var tempImageForInserting = new Image();
  tempImageForInserting.addEventListener('load', function (){
    insertPageUsingImage(tempImageForInserting);
  });
  tempImageForInserting.src = locationOfTemplate;
}

// This function inserts a page using an image unless the user has exceeded the pages maximum.
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

// This function simply updates the entry in the pages array with the latest image on the canvas
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

// Updates the page numbers on the main user interface:
function updatePageNumsOnGui(){
  var box = document.getElementById('pageTextBoxID');
  box.value = currentPg;
  box.style.backgroundColor = 'white';
  box.setAttribute('max', arrayOfCurrentImages.length);
  document.getElementById('totalPagesDivID').innerHTML = 'Total Pages: ' + arrayOfCurrentImages.length;
}

// Sanitizing the input from the page text box and changing the color of the box as appropriate:
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

// If they hit enter in the page text box the page should probably change to the number
// they entered:
function pageInputBoxCheckForEnter(e){ // eslint-disable-line no-unused-vars
  var key = e.which || e.keyCode;
  if (key === 13){ // 13 is enter
    goBtnFunction();
  }
}

// This is the function that goes back one page:
function previousPageBtnFunction(){ // eslint-disable-line no-unused-vars
  if(currentPg > 1){
    loadPage(currentPg - 1);
  }
}

// This is the function that goes forward one page:
function nextPageBtnFunction(){ // eslint-disable-line no-unused-vars
  if(currentPg < arrayOfCurrentImages.length){
    loadPage(currentPg + 1);
  }
}

// This is the function that runs when the GO button is clicked/tapped:
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

// Here is the function that handles testing to see if we can delete a page:
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

// Here is the function that handles actually deleting a page:
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

// This is the function that gets called when the user wants to paste something wile re-sizing it:
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

// This function sanitizes the input from the percentage text box on the Tool -> Other dialog
// and changes its color appropriately: 
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

// This is the function that initializes the settings dialog when they choose the gear icon/button.
function SDReadySettingsDialog(){ // eslint-disable-line no-unused-vars
  document.getElementById('SDCursorDropdown').value = currentCursorValue;
  document.getElementById('SDAutosaveDropdown').value = currentAutosaveValue;
  // Remember the global variable is always 1 more than the number of entries actually stored:
  document.getElementById('SDUndoHistoryBox').value = maxUndoHistory - 1;
  document.getElementById('SDMaxPagesAllowedBox').value = maxNumberOfPages;
  
  if(weGotKeyboardShortcuts){
    document.getElementById('SDEnableKeyboardShortcuts').checked = true;
  }
  else{
    document.getElementById('SDEnableKeyboardShortcuts').checked = false;
  }
  
  if(displayErrorMessages){
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
  if(useColorInvertedTemplates){
    document.getElementById('SDUseColorInvertedTemplates').checked = true;
  }
  else{
    document.getElementById('SDUseColorInvertedTemplates').checked = false;
  }
  SDInputValidation();
}

// This function sanitizes the input for the settings dialog:
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

// This function first tests to see if the user has entered valid data. If that check passes, it takes 
// the settings that the user specified and updates the applicable global variables or calls other
// functions that do the actual updating.
function SDOkBtnFunction(){
  if(SDValid){
    var e = document.getElementById('SDCursorDropdown');
    SDSetCursor(e.options[e.selectedIndex].value);
    
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
      displayErrorMessages = false;
    }
    else{
      displayErrorMessages = true;
    }
    
    if(document.getElementById('SDUseWidscreenTemplates').checked){
      useWidescreenTemplates = true;
    }
    else{
      useWidescreenTemplates = false;
    }
    if(document.getElementById('SDUseColorInvertedTemplates').checked){
      useColorInvertedTemplates = true;
    }
    else{
      useColorInvertedTemplates = false;
    }
    e = document.getElementById('SDAutosaveDropdown');
    SDSetUpAutoSave(e.options[e.selectedIndex].value);
    document.getElementById('SDCloseBtn').click();  // Clicking the close button on dialog after we are done with it.
  }
}

// Here is a function that just sets the length of the undo array:
function SDActuallySetUndoLength(){
  var distanceFromEnd = (imageArrayForUndo.length - 1) - currentPlaceInUndoArray;
  var tempArray = [];
  if(maxUndoHistory > imageArrayForUndo.length){
    tempArray.length = maxUndoHistory - imageArrayForUndo.length;
    tempArray.fill(null);
    imageArrayForUndo = tempArray.concat(imageArrayForUndo);
  }
  if(maxUndoHistory < imageArrayForUndo.length){
    tempArray = imageArrayForUndo.splice((imageArrayForUndo.length - 1) - maxUndoHistory, maxUndoHistory);
    imageArrayForUndo = tempArray;
  }
  currentPlaceInUndoArray = (imageArrayForUndo.length - 1) - distanceFromEnd;
  if(currentPlaceInUndoArray < 0){
    clearUndoHistory();
  }
}

// Here is a function that starts the autosave process:
function SDSetUpAutoSave(vlue){
  currentAutosaveValue = vlue;
  if(vlue !== 'never'){
    var num = parseInt(vlue, 10) * 60 * 1000;
    clearInterval(autosaveInterval);
    autosaveInterval = setInterval(SDCalledToSaveAutomatically, num);
  }
  else{
    clearInterval(autosaveInterval);
  }
}

// When the autosave interval is up, this function gets called to save the files:
function SDCalledToSaveAutomatically(){
  if(pathOfFolderToSaveInto !== ''){
    if(tempCanvasForInterval === 'NA' && areaSelected === false){
      saveCurrentImageToArrayBeforeMoving();
      // If it is determined that we can actually save the images, the function in the saveImagesDialog section is called:
      SIDActuallySaveFiles(true);
    }
    else{
      setTimeout(SDCalledToSaveAutomatically, 1000);
    }
  }
}

// This function sets the cursor that is displayed over the main canvas:
// See the values in the HTML for a better understanding of how & why
// this is set up how it is:
function SDSetCursor(vle){
  currentCursorValue = vle;
  if(vle.substring(0, 1) === 'u'){
    var indx = parseInt(vle.substring(1), 10);
    document.getElementById('canvas1').style.cursor = 'url(\'' + cursorImages[indx] + '\'), auto';
  }
  else{
    document.getElementById('canvas1').style.cursor = vle;
  }
}

// If the user hits enter in one of the text boxes in the settings dialog, it should probably try to
// save the settings if it can:
function SDCheckForEnter(e){ // eslint-disable-line no-unused-vars
  var key = e.which || e.keyCode;
  if (key === 13){ // 13 is enter
    SDOkBtnFunction();
  }
}

// Here is the function that is called if the user tries to copy the error log to their clipboard:
function SDCopyLogInfoErrorLog(){ // eslint-disable-line no-unused-vars
  try{
    copyStrToClipboard(document.getElementById('SDErrorLogTextArea').value);
  }
  catch(e){
    // Since this is part of error handling, if we can't copy
    // stuff to the clipboard, there probably isn't much hope of recovering,
    // so nothing to do here.
  }
}



// ********Here is the code for the Open Images Dialog:********
var OIDHalfMaxPages;
var OIDFilesArray = null;
var OIDTempFilesArray = null;
var OIDFilesHandled;
var OIDFilesToHandle;
var OIDSomeSkipped = false;

// This just gets the dialog ready:
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

// If the user selects some files this is the function that handles that event:
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

// This function cleans the files array and re-fills it with the new files that the user just chose:
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

// This function loops through the list of files and starts them off loading asynchronously:
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
  // In either case, we need to keep track of how many files have been handled so that
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


// ********Here is the code for the saveImagesDialog:********

var SIDNameForFiles = '';
var SIDValidInput = true;
var SIDValidCharsString = 'abcdefghijklmnopqrstuvwxyz-ABCDEFGHIJKLMNOPQRSTUVWXYZ_1234567890';
var SIDFilesToHandle;
var SIDFilesHandled;
var SIDFilesToDelete;
var SIDFilesDeleted;
var SIDErrorsSavingFiles = false;
var SIDSaveViaCtrlS = false;

// This function simply sets up the save images dialog:
function SIDReadySaveImagesDialog(){ // eslint-disable-line no-unused-vars
  saveCurrentImageToArrayBeforeMoving();
  document.getElementById('SIDHeader').innerHTML = 'Save Images';
  pathOfFolderToSaveInto = '';
  SIDNameForFiles = '';
}

// Validation for the file name text box.
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

// This function checks for strange characters in the file name that the user specified.
function SIDGoodChar(chr){
  if(SIDValidCharsString.indexOf(chr) === -1){
    return false;
  }
  else{
    return true;
  }
}

// Validation for the choose folder button so the user must enter a valid file name before being allowed to choose a folder
function SIDChooseFolderBtnFunction(){ // eslint-disable-line no-unused-vars
  if(SIDValidInput){
    SIDLaunchOpenFolderWindow();
  }
  else{
    alert('Error: Please choose a valid name to put on all of the files or leave the field empty.', '');
  }
}

// After the file name validation passes this function runs to launch the open folder window:
function SIDLaunchOpenFolderWindow(){
  SIDNameForFiles = document.getElementById('SIDFileNamesTextBox').value;
  dialog.showOpenDialog(theMainWindow, { title: 'Choose Folder', defaultPath: hf,
    properties: ['openDirectory', 'createDirectory'] }, function (paths){
      if (typeof paths === 'undefined' || paths === null){
        return;
      }
      pathOfFolderToSaveInto = paths[0];
      SIDHandleFolderPath();
    });
}

// Here is the function that actually handles the folder that the user chose:
function SIDHandleFolderPath(){
  document.getElementById('SIDHeader').innerHTML = 'Processing...';
  document.getElementById('saveImagesDialog').style.cursor = 'wait';
  fs.readdir(pathOfFolderToSaveInto, function (err, files){
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

// Here is the function that handles actually saving the images to the folder.
// Note that this can be called internally by SIDHandleFolderPath(), via
// keyboard shortcut, and also internally if the user has enabled autosave.
function SIDActuallySaveFiles(ctl_s = false){
  SIDSaveViaCtrlS = ctl_s;
  fs.readdir(pathOfFolderToSaveInto, function (err, files){
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
        var name = pathOfFolderToSaveInto + path.sep + SIDNameForFiles + i + '.png';
        fs.unlink(name, SIDFileDeleted);
      }
    }
    else{
      // If there are no extra images, we can just continue:
      SIDContinueSavingFiles();
    }
  });
}

// This function basically just counts the number of files deleted and calls the next function if all
// of the files that need to be deleted have been deleted:
function SIDFileDeleted(){
  ++SIDFilesDeleted;
  if(SIDFilesDeleted === SIDFilesToDelete){
    SIDContinueSavingFiles();
  }
}

// This function actually saves the files:
function SIDContinueSavingFiles(){
  SIDErrorsSavingFiles = false;
  SIDFilesToHandle = arrayOfCurrentImages.length;
  SIDFilesHandled = 0;
  for(var i = 0; i < SIDFilesToHandle; ++i){
    var name = pathOfFolderToSaveInto + path.sep + SIDNameForFiles + (i + 1) + '.png';
    fs.writeFile(name, SIDDecodeBase64Image(arrayOfCurrentImages[i].src), SIDFileSaved);
  }
}

// This function runs every time a file is saved and then hands control off to the incrementing function:
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

// This function just checks to see if all the files have been handled and calls the finishing function once
// all the files have been handled.
function SIDIncrementAndCheck(){
  ++SIDFilesHandled;
  if(SIDFilesHandled === SIDFilesToHandle){
    SIDFinishedSaving();
  }
}

// This function gets called once all of the files have been handled.
// It cleans up the gui of necessary and notifies the user if something
// didn't go right.
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


// ********Here is the code for the aboutDialog:********

// This function readies the about dialog.
function ADReadyAboutDialog(){ // eslint-disable-line no-unused-vars
  // eslint-disable-next-line max-len
  document.getElementById('ADVersionLine').innerHTML = '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Roger’s Math Whiteboard version ' + appVersion + ' can be best understood as a multi-page image editor designed around the specific needs of math and science teachers who want to take advantage of pen/touch/stylus input while presenting. It is designed to be used while presenting content in class, and/or while working through questions from students.';
}

// ********Here is the code for the fileOtherDialog:********

var FODPercentValid = true;
var FODImagesToLoad;
var FODImagesLoaded;
var FODImgForInsertion1;
var FODImgForInsertion2;
var FODOrgX;
var FODOrgY;

// Here is what happens when the user chooses to duplicate the page:
function FODDuplicatePage(){ // eslint-disable-line no-unused-vars
  saveCurrentImageToArrayBeforeMoving();
  insertPageUsingImage(arrayOfCurrentImages[currentPg - 1]);
  arrayOfOriginalImages[currentPg - 1] = arrayOfOriginalImages[currentPg - 2];
  loadPage(currentPg);
  document.getElementById('FODCloseBtn').click();
}

// This function is executed when the user chooses to make the current drawing permanant.
function FODMakeCurrentDrawingPermanent(){ // eslint-disable-line no-unused-vars
  saveCurrentImageToArrayBeforeMoving();
  arrayOfOriginalImages[currentPg - 1] = arrayOfCurrentImages[currentPg - 1];
  loadPage(currentPg);
  document.getElementById('FODCloseBtn').click();
}

// This function executes when the user chooses to rotate the page in a particular direction:
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

// This is essentially a helper function that continues the process of rotating a page
// after the image loads.
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

// This function allows the user to import an image from their clipboard:
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

// This is the function that actually gets called by the import image from clipboard & resize button
// It then calls the function above which actually does the work:
function FODImportFromSystemResize(){ // eslint-disable-line no-unused-vars
  if(FODPercentValid){
    FODImportFromSystem(document.getElementById('FODPercentInput').value);
  }
  else{
    alert('Error: Please enter a valid percent.', ' ');
  }
}

// Here is the input validation function for the scale percent input
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

// Here is the function that allows the user to export an image on the program's clipboard to
// their system's clipboard.
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


// ********Here is the code for the insertTextDialog:********
var ITDValid = true;

// Here is the function that readies the insertTextDialog:
function ITDReadyInsertTextDialog(){ // eslint-disable-line no-unused-vars
  document.getElementById('ITDTextBox').value = textToInsert;
  ITDValidationFunction();
  document.getElementById('ITDTextBox').focus();
  document.getElementById('ITDTextBox').select();
}

// Here is the function that adds a character to the text field:
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

// Here is the function that removes a character from the textbox based on where the cursor is.
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

// Here is the function that clears out the entire textbox:
function ITDClear(){ // eslint-disable-line no-unused-vars
  document.getElementById('ITDTextBox').value = '';
  document.getElementById('ITDTextBox').focus();
  ITDValidationFunction();
}

// Here is the input validation function for the textbox.
// It basically makes sure there is at least 1 character
// in the textbox and sets the box to red if there isn't.
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

// Here is the function that executes when the OK button is pressed on the insert text dialog:
function ITDOkBtnFunction(){
  if(ITDValid){
    textToInsert = document.getElementById('ITDTextBox').value;
    tool = 'text';
    updateTextOfToolBtn();
    document.getElementById('ITDCloseBtn').click();  // Clicking the close button on dialog after we are done with it.
  }
}

// If the user hits enter while typing in the textbox that should ne the same as choosing OK:
function ITDCheckForEnter(e){ // eslint-disable-line no-unused-vars
  var key = e.which || e.keyCode;
  if (key === 13){ // 13 is enter
    ITDOkBtnFunction();
  }
}

// ********Here is the code for the otherToolDialog:********

// This function just closes the dialog:
function OTDCloseDialog(){ // eslint-disable-line no-unused-vars
  document.getElementById('OTDCloseBtn').click();  // Clicking the close button on dialog after we are done with it.
}


// ********Here is the code for the otherColorDialog:********
var OCDColor = 'rgba(78, 78, 255, 1.0)';
var OCDRed = 78;
var OCDGreen = 78;
var OCDBlue = 78;
var OCDAlpha = 1.0;
var OCDValid = true;

// This function readies the color picker dialog:
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

// This function basically draws the color circles:
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

// This function executes when the mouse goes down on the color selection canvas:
function OCDMouseDown(e){ // eslint-disable-line no-unused-vars
  var offset = getCoords(document.getElementById('OCDPickerCanvas'));
  OCDOnInstrumentDown(e.pageX - offset.left, e.pageY - offset.top);
}

// This function executes when the user touches somewhere on the color selection canvas:
function OCDTouchStart(e){ // eslint-disable-line no-unused-vars
  if(e.touches.length === 1){
    var offset = getCoords(document.getElementById('OCDPickerCanvas'));
    OCDOnInstrumentDown(e.changedTouches[0].pageX - offset.left, e.changedTouches[0].pageY - offset.top);
    e.preventDefault();
  }
}

// This function basically updates the textboxes according to the color the user chose.
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

// This function executes whenever the user clicks/touches somewhere on the color selection canvas:
// It basically gets the pixel directly under their click/touch and gets its color & updates the GUI.
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

// This function validates the input on the otherColor dialog and sets the appropriate box to red
// if it finds something that isn't valid.
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

// This function updates the color example so that the user can see what color they have chosen:
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

// Here is the function that executes when the user chooses the OK button.
// It basically makes sure there are no invalid entries in the textboxe 
// and then updates the color if that is the case.
function OCDOkBtnFunction(){
  if (OCDValid){
    instrumentColor = OCDColor;
    updateColorOfColorBtn();
    document.getElementById('OCDCloseBtn').click();  // Clicking the close button on dialog after we are done with it.
  }
}

// If the user presses enter inside of one of the textboxes, we will run the ok button function:
function OCDCheckForEnter(e){ // eslint-disable-line no-unused-vars
  var key = e.which || e.keyCode;
  if (key === 13){ // 13 is enter
    OCDOkBtnFunction();
  }
}

// ********Here is the code for the otherSizeDialog:********
var OSDValid = true;

// Here is the function that readies the other size dialog:
function OSDReadyOtherSizeDialog(){ // eslint-disable-line no-unused-vars
  document.getElementById('OSDSizeTextBox').value = instrumentWidth;
  document.getElementById('OSDSizeTextBox').select();
}

// Here is the function that adds a character to the size textbox.
// Note that because we used a number input field, we cannot place
// the new character where the cursor is. Unfortunetly we can only
// place it at the end of the existing content.
function OSDAddCharacter(chr){ // eslint-disable-line no-unused-vars
  var textBox = document.getElementById('OSDSizeTextBox');
  var alreadyThere = textBox.value;
  textBox.value = alreadyThere + chr;
  OSDValidateInput();
}

// Here is the backspace function. It just removes one character from the end of the
// content in the number input field.
function OSDBackspace(){ // eslint-disable-line no-unused-vars
  var textBox = document.getElementById('OSDSizeTextBox');
  var alreadyThere = textBox.value;
  textBox.value = alreadyThere.substring(0, alreadyThere.length - 1);
  OSDValidateInput();
}

// Here is the clear function is clears the number input field.
function OSDClear(){ // eslint-disable-line no-unused-vars
  document.getElementById('OSDSizeTextBox').value = '';
  document.getElementById('OSDSizeTextBox').focus();
  OSDValidateInput();
}

// Here is the validation function for the number input field.
// It basically ensures that the number entered is within the
// limits defined and marks the field red if it isn't.
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

// Here is the OK button function. It basically checks that the number entered is
// within the acceptable limits and proceeds only if that is the case.
function OSDOkBtnFunction(){
  if (OSDValid){
    instrumentWidth = parseInt(document.getElementById('OSDSizeTextBox').value, 10);
    updateTextOfSizeBtn();
    document.getElementById('OSDCloseBtn').click();  // Clicking the close button on dialog after we are done with it.
  }
}

// If the user presses enter in the number input box, we will click the ok button for them.
function OSDCheckForEnter(e){ // eslint-disable-line no-unused-vars
  var key = e.which || e.keyCode;
  if (key === 13){ // 13 is enter
    OSDOkBtnFunction();
  }
}

// ********Here is the code for the insertScreenshotDialog:********

// Here are the variables used in the screenshot process:
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
var ISDExtraBreak3 = null;
var ISDExtraTextLabel2 = null;
var ISDExtraTextLabel3 = null;
var ISDBackgroundColorDropdown = null;
var ISDCroppingMethodDropdown = null;

// Here is the function that readies the insert screenshot dialog:
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
    document.getElementById('ISDContentHeader').innerHTML = 'Click/tap on the screen or window that you would like to capture:<br>Note that this list does not automatically update. Also, if the window/screen that you would like to insert only appears as a black page, see the help dialog, (File → Help), for an alternate method of inserting screenshots.';
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

// Here is the function that runs whenever one of the thumbnail images is chosen:
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

// Assuming everything goes well, this function will execute to handle the stream:
// It basically gets a video feed of the thing the user chose and uses that to
// obtain an image from the video feed.
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

// When the image has been obtained we will start the process of cropping it:
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
}

// This function attempts to crop the canvas and remove the black borders:
// It also takes the image and renders a preview of it so that the user
// can see all of it & perhaps crop it.
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

// This function adds the dropdowns and related HTML elements for the select region dropdown
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

// This function adds the HTML elements related to the location dropdown:
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

// This function adds the HTML elements related to the cropping dropdown:
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
  var options = ['paste within displayed size', 'cut to selection']; // ----Visible!
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

// This function displays the image on the canvas at an appropriate size for the avaliable
// viewing area:
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

// This function gets the avaliable viewing area so that we can determine how big to make the screenshot preview.
function ISDGetAvaliableDialogSpace(){
  // Note that this will need to be adjusted if the insert screenshot dialog css is changed in the future:
  var x = (0.88 * window.innerWidth) - 145;
  var y = (0.68 * window.innerHeight) - 21;
  x = Math.round(x);
  y = Math.round(y);
  return { availableWidth: x, availableHeight: y };
}

// These three functions handle touch/mouse input from the preview:
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

// This function is essentially the same as the one for the regular select tool,
// it is only speciffic to the screenshot dialog:
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
      ISDCancelSelect();
    }
    
    break;
  default:
    throw new Error('Invalid phase in ISDSelectFunction: ' + phase);
  }
}

// Here is the function that cancles a selected region for the screenshot preview:
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

// Here is the function that runs when the user chooses to insert their screenshot.
// It manages the entire process of geting the necessary information, cropping if
// necessary, placing the selection in the appropriate place, cleanup, etc...
function ISDOkBtnFunction(){ // eslint-disable-line no-unused-vars, max-statements
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
      if(useColorInvertedTemplates){
        bgColor = 'black';
      }
      if(ISDBackgroundColorDropdown.value !== 'white'){
        bgColor = instrumentColor;
      }
      
      // At this point, we have all the information we need to start working with the canvas...
      
      ISDCanvas.width = ISDImageToReturn.width;
      ISDCanvas.height = ISDImageToReturn.height;
      ISDContext.drawImage(ISDImageToReturn, 0, 0, ISDImageToReturn.width, ISDImageToReturn.height);
      
      // Here is where we can make sure the selection is within the borders of the image:
      var difference = 0;
      if(selectionLocationX < 0){
        difference = Math.abs(0 - selectionLocationX);
        selectionLocationX = 0;
        selectionWidth = selectionWidth - difference;
      }
      if(selectionLocationY < 0){
        difference = Math.abs(0 - selectionLocationY);
        selectionLocationY = 0;
        selectionHeight = selectionHeight - difference;
      }
      if((selectionLocationX + selectionWidth) > ISDImageToReturn.width){
        difference = Math.abs((selectionLocationX + selectionWidth) - ISDImageToReturn.width);
        selectionWidth = selectionWidth - difference;
      }
      if((selectionLocationY + selectionHeight) > ISDImageToReturn.height){
        difference = Math.abs((selectionLocationY + selectionHeight) - ISDImageToReturn.height);
        selectionHeight = selectionHeight - difference;
      }
      
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

// This is the function that calculates the insertion point for the screenshot.
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

// Here is the first cleanup function for the insert screenshot section. It manages the
// entire cleanup process calling other functions where needed.
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

// Here is a helper function for the above cleanup function. It focuses on cleaning up the various
// variables used.
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


// ********Here is the code for the otherPageDialog:********

// Here is the function that inserts pages from the otherPage dialog.
// Note the pattern used in naming files and how they are used 
// depending on whether widscreen or inverted colors is selected.
function OPDInsertPage(e){ // eslint-disable-line no-unused-vars
  var locOfTem = e.target.src;
  var before = locOfTem.substring(0, (locOfTem.length - 4));
  if(useWidescreenTemplates){
    before += '-wide';
  }
  if(useColorInvertedTemplates){
    before += '-b';
  }
  before += '.png';
  insertTemplateAsPage(before);
  document.getElementById('OPDCloseBtn').click();  // Clicking the close button on dialog after we are done with it.
}

// Here is the function that inserts a colored page:
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

// Here is the function that inserts an page consisting of an image that the user opens:
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
          // If it looks like the image exists and is a reasonable size, we will open it just like we were opening a template:
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
// The functions below are of a more general nature. They are intended to be avaliable
// to all other parts of the code. Typically they are used to manage various aspects
// of the main interface or the drawing area. It can kinda be thought of as the
// miscellaneous functions section.



// Here is the function that cancels the selected region if there is a region of the whiteboard that
// is selected.
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




// Here is the function that updates the color of the text on the color button.
function updateColorOfColorBtn(){
  document.getElementById('colorBtn').style.color = instrumentColor;
}

// Here is the function that updates the text of the size button:
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

// Here is the function that updates the text of the tool button:
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

// This is the function that executes when the undo button is pressed:
function undoBtnFunction(){
  if(currentPlaceInUndoArray > 0){
    if(imageArrayForUndo[currentPlaceInUndoArray - 1] !== null){
      --currentPlaceInUndoArray;
      resizeAndLoadImagesOntoCanvases(imageArrayForUndo[currentPlaceInUndoArray], arrayOfOriginalImages[currentPg - 1],
      arrayOfOriginalImagesX[currentPg - 1], arrayOfOriginalImagesY[currentPg - 1]);
    }
  }
}

// This is the function that executes when the redo button is pressed:
function redoBtnFunction(){
  if(currentPlaceInUndoArray < imageArrayForUndo.length - 1){
    if(imageArrayForUndo[currentPlaceInUndoArray + 1] !== null){
      ++currentPlaceInUndoArray;
      resizeAndLoadImagesOntoCanvases(imageArrayForUndo[currentPlaceInUndoArray], arrayOfOriginalImages[currentPg - 1],
      arrayOfOriginalImagesX[currentPg - 1], arrayOfOriginalImagesY[currentPg - 1]);
    }
  }
}

// This is the function that executes when the copy button is pressed:
function copyBtnFunction(){
  if(areaSelected === true){
    context.drawImage(tempCanvasForInterval, 0, 0, context.canvas.width, context.canvas.height);
    var drawingX = Math.min(tempX, prevX);
    var drawingY = Math.min(tempY, prevY);
    var drawingWidth = Math.abs(tempX - prevX);
    var drawingHeight = Math.abs(tempY - prevY);
    var difference = 0;
    if(drawingX < 0){
      difference = Math.abs(drawingX - 0);
      drawingX = 0;
      drawingWidth = drawingWidth - difference;
    }
    if(drawingY < 0){
      difference = Math.abs(drawingY - 0);
      drawingY = 0;
      drawingHeight = drawingHeight - difference;
    }
    if((drawingX + drawingWidth) > context.canvas.width){
      difference = Math.abs((drawingX + drawingWidth) - context.canvas.width);
      drawingWidth = drawingWidth - difference;
    }
    if((drawingY + drawingHeight) > context.canvas.height){
      difference = Math.abs((drawingY + drawingHeight) - context.canvas.height);
      drawingHeight = drawingHeight - difference;
    }
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

// This is the function that executes when the paste button is pressed:
function pasteBtnFunction(){
  if(copiedSectionOfCanvas !== 'NA'){
    tool = 'PASTE';
    updateTextOfToolBtn();
  }
  else{
    tellUserToCopySomethingFirst();
  }
}

// This is the function that executes when the draw rectangle button is pressed:
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
    tempCanvasForInterval = 'NA';
  }
  else{
    tellUserToSelectAnAreaFirst();
  }
}

// This is the function that executes when the fill rectangle button is pressed:
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
    tempCanvasForInterval = 'NA';
  }
  else{
    tellUserToSelectAnAreaFirst();
  }
}

// This is the function that executes when the draw ellipse button is pressed:
function drawEllipseBtnFunction(){ // eslint-disable-line no-unused-vars, max-statements
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
    tempCanvasForInterval = 'NA';
  }
  else{
    tellUserToSelectAnAreaFirst();
  }
}

// This is the function that executes when the fill ellipse button is pressed:
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
    tempCanvasForInterval = 'NA';
  }
  else{
    tellUserToSelectAnAreaFirst();
  }
}






// Here is the function that pushes the current state of the whiteboard into the undo array:
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

// Here is the function that clears all of the history out of the undo array:
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

// This function is used to copy the content of textareas to the user's clipboard.
function copyTextareaValueToClipboard(elid){ // eslint-disable-line no-unused-vars
  var txt = document.getElementById(elid).value;
  clipboard.writeText(txt);
  alert('Copied');
}

// This function simply copies a string to the user's clipboard.
function copyStrToClipboard(s){ // eslint-disable-line no-unused-vars
  clipboard.writeText(s);
  alert('Copied');
}

