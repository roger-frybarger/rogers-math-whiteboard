
Basic Description: *************************************************************
Roger's Math Whiteboard is a simple Chrome Packaged App written in pure HTML5,
JavaScript, and CSS; which is intended to suit the speciffic needs of math
teachers. It is intended to be used while presenting course material on a
touchscreen or similar device. In its current form, it is best described as a
multi-page image editor with some additional features that suit the needs of the
intended audience.

Name & Version: ****************************************************************
Roger's Math Whiteboard Version 1.414.213.562
(Version numbers follow the signifficant mathematical constants with sqr(2) 
being the first version. Major re-writes use the next signifficant constant,
bug fixes increment the second to last set of digits, development versions
increment the last set of digits.)

Licence: ***********************************************************************
    Roger's Math Whiteboard
    Copyright 2016 Roger Frybarger
    This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License version 2 as published
    by the Free Software Foundation.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License version 2 in LICENCE.TXT for more details.

Contact Info: ******************************************************************
Roger Frybarger, (The amature programmer who created this app), can be emailed
at: rogersmathwhiteboard@gmail.com 
Note0: I reserve the right to ignore/delete any email(s) at my discression.
Note1: I am only an amature programmer. I have done my best on this app, but
       fully recognise that it probably isn't done professionally. Any pointers
       you can give me to improve my work would be greatly appreciated.
Note2: I will be wraping up my last semester in college very shortly. Thus; be
       understanding if your emails go unanswered between Aug 20, 2016 and
       December 31, 2016. I will be very, very, very, busy during that time.
Note3: Before sending me bug reports, please make sure it is not already listed
       in the Known Bugs section.

Instalation: *******************************************************************
See INSTALATION.TXT

Known Bugs: ********************************************************************
1. Restored documents may contain pages that have been deleted
2. Previous writing/drawing becomes permanant if the document is restored.

Other: *************************************************************************
Note0: For anyone who wishes to investigate the source code, here is the basic
       structure: The code behind the main window is located in 3 main files.
       MainWindow.html, MainWindowJavascript.js, and MainWindowStyleSheet.css
       The most interesting one is MainWindowJavascript.js. It is essentially
       the programatic heart of this beast. It controlls when, why & how other
       windows are created. The code behind each of these other windows is
       located in the other_windows folder, in a set of 3 appropriatly named
       files. Communication between the main window and other windows takes
       place via objects & variables located in background.js, that are
       innitilized when the main window starts, (in the onWindowLoad()
       function.)

Note1: Mouse/touch input on the canvas is handeled as follows: All types of
       input are funneled into either the instrumentDown() method, the
       instrumentMoved() method, or the instrumentUp() method. Touch input
       beyond 1 touch point instantly calls the instrumentUp() method and passes
       in the last known point of the first touch. This makes sense since the
       program is designed to be used with a stylus. Thus, other touches are
       probably unintentional and can be ignored. Once the input is inside of
       one of the 3 above listed methods, some applicable variables may be set,
       checks may be done, and functions may be called but essentially, the
       input is passed off to the applicable tool method, depending on what tool
       is selected at the time. 

Note2: The pages of the document are handeled as follows: The current state of
       each image is stored in the arrayOfCurrentImages array, and likely in
       chrome.storage.local under an object named rogersmathwhiteboardpageX with
       x being one less than the page number, (which should correspond with its
       index in the arrayOfCurrentImages array). The items in the
       arrayOfOriginalImages array are used for the erraser & eraser canvas.
       They represent the original state of the image/page that was inserted
       into the document.

Note3: File I/O is handeled in the JavaScript for the applicable window in the
       other_windows folder. The code behind the Open Images essentially accepts
       the applicable files, loads them into an array, and returns the array to
       the main window for loading. The Save Images window essentially grabs the
       arrayOfCurrentImages, accepts a folder from the user, and writes the
       files out to the folder. 

Note4: Since I, (Roger Frybarger), have developed this program on my own without
       any other coders involved, I have not bothered to use a version controll
       system such as git & GitHub. I am not opposed to using said systems, I
       just felt that it would have been one more thing to learn on top of
       learning HTML & CSS, neither of which I understood at the start of this
       project. As soon as I finish college, I plan on putting in the time &
       effort to learn git & GitHub, as I can clearly see the advantages for
       large projects. In the interium however, I plan on staying with the
       system that I already have in place. Thus; if you wish to contribute,
       feel free to email me a zip file containing the original source code,
       along with any changes you have made, already worked into the code, and
       I will review it when I have the time. Volunteers willing to help me
       learn git & GitHub are also welcome to email me.

Note5: For those willing to contribute to this project, it is my wish that you
       do not make drastic changes to how the main window looks & works. Take a
       lesson form Windows 8. Users tend not to like drastic changes. I am ok
       with adding features. However, any changes to the user interface need to
       be modest. You are welcome to take this code and make your own project
       under a different name, but if you want your code encorporated into this
       program, recognise that drastic UI changes will likely get ignored.




