window.onscroll = function() {scrollFunction()};

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
