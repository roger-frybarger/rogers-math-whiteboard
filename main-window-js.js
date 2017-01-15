//window.addEventListener('touchstart', (evt) => console.log(evt.touches[0]));
window.addEventListener('touchstart', blah);
window.addEventListener('touchend', (evt) => console.log(evt.touches));
window.addEventListener('mousedown', (evt) => console.log(evt));
window.addEventListener('touchmove', (evt) => console.log(evt.touches));



function blah(event){
  
  console.log(event);
  
}
