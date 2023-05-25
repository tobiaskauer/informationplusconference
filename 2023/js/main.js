window.onscroll = function() {scrollFunction()};

// POC getting span ids from selection and/or clicking
function getSelectionHtml() {
  var html = "";
  if (typeof window.getSelection != "undefined") {
      var sel = window.getSelection();
      if (sel.rangeCount) {
          var container = document.createElement("div");
          for (var i = 0, len = sel.rangeCount; i < len; ++i) {
              container.appendChild(sel.getRangeAt(i).cloneContents());
          }
          html = container.innerHTML;
      }
  } else if (typeof document.selection != "undefined") {
      if (document.selection.type == "Text") {
          html = document.selection.createRange().htmlText;
      }
  }
  return html;
}

/*document.addEventListener('mouseup', function(){
  var selectedHTML = getSelectionHtml();
  if( selectedHTML )
  // console.log(selectedHTML)
//    console.log( 'ids: ', selectedHTML.match(/id=\"unique([0-9]+)\"/) ) //change regex to return all unique class id (not just one, exclude html)
    //<([^\s]+).*?id="([^"]*?)".*?>(.+?)</\1>    

});*/

let string = "Information+ is an <span id='unique1'>interdisciplinary</span> <span id='unique2'>conference</span> <span id='unique30137'>that</span> bringstogether researchers, educators, a"
// console.log([...string.matchAll(/unique\d*/g)])

//END POC


function scrollFunction() {
  if (document.body.scrollTop > 100 || document.documentElement.scrollTop > 100) {
    document.getElementById("navbar").style.top = "0";
  } else {
    document.getElementById("navbar").style.top = "-150px";
  }
}

function myFunction() {
  var x = document.getElementById("myBottomnav");
  if (x.className === "bottomnav") {
    x.className += " responsive";
  } else {
    x.className = "bottomnav";
  }
};
