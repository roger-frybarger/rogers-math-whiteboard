# Roger's Math Whiteboard

Roger's Math Whiteboard is a simple Electron App written in pure HTML5, JavaScript, and CSS; which is intended to suit the speciffic needs of math teachers. It is intended to be used while presenting course material on a touchscreen or similar device. In its current form, it is best described as a multi-page image editor with some additional features that suit the needs of the intended audience.

### Installing

Please see INSTALLATION.TXT for the installation details.

## Contributing

Please read CONTRIBUTING.md for details on our code of conduct, and the process for submitting pull requests to us.

## Versioning

Version numbers follow the signifficant mathematical constants with sqr(2) being the first version. Major re-writes use the next signifficant constant, bug fixes increment the second to last set of digits, development versions increment the last set of digits.

## Authors

* **Roger Frybarger** - *Initial work*

## License

    Roger's Math Whiteboard
    Copyright 2016, 2017 Roger Frybarger
    This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License version 2 as published
    by the Free Software Foundation.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License version 2 in LICENCE.TXT for more details.

## Other:

If you are just looking to download & use this program for everyday use please see the Download page of our website at www.rogersmathwhiteboard.com

Please note that this is the first time I have used Git & Github to host/control/maintain an open source project, so this is very unfamiliar territory for me. If you find something that you think I could improve on, please tell me about it & explain in lameness terms what you think I should do to fix it. You can contact me via the feedback section of the website for this project, (www.rogersmathwhiteboard.com).

Also, note that the source code in this repository is only the source code that is specific to this app. It does not include the underlying Electron framework. However, it relies on this underlying framework in order to operate. I have not included this underlying framework both for size reasons and because I wish to maintain a healthy level of distance between the code for this app and the underlying framework. This will hopefully allow this app to run with any particular version of the underlying Electron framework. With that said, I have used Electron version 1.4.13 while building & testing this app.

Furthermore, regarding code quality, I have been using Eslint to enforce some rudimentary coding standards on the js files. The standards I have been using are in the .eslintrc.json file. I recognize fully that this code is not perfect! I have used far too many global variables to do things that I felt I should have been able to do via other methods. However, for the time being, I cannot hope to know all there is to know about programming, and in it’s current state it does what I need it to do. I welcome advice/ pull requests that help clean up this code. My focus is on the interface and creating back-end code that is as efficient and sane as I currently know how to make it. If I don’t know that my code could be cleaned up in a certain way, I can’t hope to code it in such a manner. Sometimes these methods are not easy to comprehend. This is at the core of why I am open-sourcing this project. I hope that others who have a deeper understanding of things like this will be able to help me understand how to clean up this code and in turn, make me a better programmer.
