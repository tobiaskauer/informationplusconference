let target = "section#header"
let api = "https://viscussion.de:3003/api/visitor"
//api = "http://localhost:3003/api/visitor"
let updateInterval = 30000
let nodes = []
let colorScale = d3.scaleOrdinal().domain(["practitioner","educator","researcher"]).range(["#B01CF5","#778AFF","#1CF5F5"])


let visitorData = {
  id: null,
  start: Date.now(),
  browserOrigin: Intl.DateTimeFormat().resolvedOptions().timeZone,
  browserLanguage: navigator.language, 
  category: null,
  duration: 0

  //TODO: retrieve values from localStorage
}





//BEGIN: SEND USER DETAILS TO API
function sendVisitorData(id) {
  let url = (id) ? api+"/"+id : api
  let data = {
    "duration": visitorData.duration,
    "category": visitorData.category
}
  if(!id) {
    data.browserOrigin = visitorData.browserOrigin
    data.browserLanguage = visitorData.browserLanguage
  }  
  //console.log(`[sending] user trace`)
  $.ajax({
    type: 'POST',
    dataType:"json",
    data: JSON.stringify(data),
    url: url,
    contentType: "application/json; charset=utf-8",

    success: function (data, status, xhr) {
      if(!id) visitorData.id = data._id
      //console.log(`[received] user trace`)
    },

    error: function(error, status, xhr) {
        console.log(error, status, xhr)
    }
  });

}


const updateVisitor = (category) => {
  visitorData.duration = Date.now() - visitorData.start 
  if(category) {
    visitorData.category = category
    nodes[0].color = colorScale(category)
  }
  sendVisitorData(visitorData.id) 
  //TODO: Update nodes[0]
}

sendVisitorData() //initial data query
setInterval(() => {
  if(visitorData.id) updateVisitor()
}, updateInterval);
//END: SEND USER DETAILS TO API








//BEGIN: VISUALIZATION
const getVisitorData = () => {
  //console.log(`[waiting] for visitor data`)
  $.ajax({
      type: 'GET',
      dataType:"json",
      url: api,
      contentType: "application/json; charset=utf-8",

      success: function (data, status, xhr) {
        console.log(`[success] Received ${data.length} visitor traces from server.`)
        nodes = renderNodes(data)
        renderVis()
      },

      error: function(error, status, xhr) {
          console.log(error, status, xhr)
      }
    });
}

getVisitorData()

const generatePath = (r) => {
  let wobbleB = Math.random()*0.5+0.8
    let wobbleR = Math.random()*0.5+0.8
    return `
    M${wobbleR*r} ${.5*r}
    C${wobbleR*r} ${.75*r} ${.75*r} ${wobbleB*r} ${.5*r} ${wobbleB*r}
    C${0.25*r} ${wobbleB*r} 0 ${.75*r} 0 ${.5*r}
    C0 ${.25*r} ${.25*r} 0 ${.5*r} 0
    C${.75*r} 0 ${wobbleR*r} ${.25*r} ${wobbleR*r} ${.5*r}Z
    `
}

const renderNodes = (data) => {
  let radiusScale = d3.scaleLinear().domain(d3.extent(data, visit => visit.duration)).range([5,15])
  
  let nodes = data.map((node ,i)=> {
    let color = node.category ? colorScale(node.category) : "#ffce1e"
    let r = node.duration ? radiusScale(node.duration) : 1
    if (!i) r = 20
    return {
          radius: r,
          color: color,
          angle: Math.floor(Math.random()*360)
      }
  })

  return nodes
}

const renderVis = () => {    
let buffer = 20
  let width = $(target).width()
  let height = $(target).height()
  const svg = d3.select(target).append("svg").attr("width",width).attr("height",height).attr("style","position: absolute; z-index: -999")

const simulation = d3.forceSimulation(nodes)
.alphaTarget(0.3) // stay hot
.velocityDecay(0.09)
.force("x", d3.forceX().strength(0.005))
.force("y", d3.forceY(height/2).strength(0.02))
.force("center", d3.forceCenter(width /2, height/2).strength(.5))
.force("collide", d3.forceCollide().radius(d => d.radius ).iterations(2))
.force("charge", d3.forceManyBody().strength((d, i) => i ? -1 : 200))
.on("tick", ticked);


d3.select(target)
    .on("touchmove", event => event.preventDefault())
    .on("pointermove", pointed)
    .on("mouseleave", centerNode());

    
    function pointed(event) {
      const [x, y] = d3.pointer(event);
      nodes[0].fx = x;
      nodes[0].fy = y;
    }
    function centerNode() {
      //TODO: move first node to center
      nodes[0].fx = width * .75;
      nodes[0].fy = height/2;
    }

  function ticked() {
        var u = svg
        .selectAll('path')
        .data(nodes)

        u.enter()
        .append('path')
        .attr('d', d=> generatePath(d.radius))
        .merge(u)
        .attr("transform",d => {

          let x = d.x
          if(d.x < buffer) {
            x = buffer
          } else if(d.x >= width-buffer){
            x = width-buffer
          }

          let y = d.y
          if(d.y < buffer) {
            y = buffer
          } else if(d.y >= height-buffer){
            y = height-buffer
          }
          return `translate(${x-d.radius},${y-d.radius}) rotate(${d.angle})`

        })
        .attr("fill", d => d.color)
        .attr("opacity", (d,i) => i ? .3 : 1)

    
      u.exit().remove()
    }
}
//END: VIS


//BEGIN: USER FORM
$(document).ready(function() {
  $(".btn-group .btn").on("click",function(evt) {
    evt.stopPropagation();
    evt.preventDefault();
    $(".btn-group .btn").removeClass("active")
    $( this ).toggleClass( "active" );
    let category = $(this).children().val()
    updateVisitor(category)
  })

  $(".btn#toggle").on("click",function(evt) {
    evt.stopPropagation();
    evt.preventDefault();
    $(".stickyForm").toggle("slow")
    
    if($(this).text() == "Hide survey") {
      $(this).text("Show survey")
    } else {
      $(this).text("Hide survey")
    }

  })
})

