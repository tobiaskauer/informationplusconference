function visualizeSessions(target) {
  let api = "https://viscussion.de:3003/api/visitor";
  //api = "http://localhost:3003/api/visitor";
  let updateInterval = 30000;
  let network = {};
  let opacityScale = d3.scaleLinear().domain([0, 100]).range([1, 0]);
  let colorScale = d3
    .scaleOrdinal()
    .domain(["practitioner", "educator", "researcher"])
    .range(["#B01CF5", "#778AFF", "#1CF5F5"]);

  let visitorData = {
    id: null,
    start: Date.now(),
    browserOrigin: Intl.DateTimeFormat().resolvedOptions().timeZone,
    browserLanguage: navigator.language,
    category: null,
    duration: 0,

    //TODO: retrieve values from localStorage
  };

  //BEGIN: SEND USER DETAILS TO API
  function sendVisitorData(id) {
    let url = id ? api + "/" + id : api;
    let data = {
      duration: visitorData.duration,
      category: visitorData.category,
    };
    if (!id) {
      data.browserOrigin = visitorData.browserOrigin;
      data.browserLanguage = visitorData.browserLanguage;
    }
    //console.log(`[sending] user trace`)
    $.ajax({
      type: "POST",
      dataType: "json",
      data: JSON.stringify(data),
      url: url,
      contentType: "application/json; charset=utf-8",

      success: function (data, status, xhr) {
        if (!id) visitorData.id = data._id;
        //console.log(`[received] user trace`)
      },

      error: function (error, status, xhr) {
        console.log(error, status, xhr);
      },
    });
  }

  const updateVisitor = (category) => {
    visitorData.duration = Date.now() - visitorData.start;
    if (category) {
      visitorData.category = category;
      network.nodes[0].color = colorScale(category);
    }
    sendVisitorData(visitorData.id);
    //TODO: Update nodes[0]
  };

  sendVisitorData(); //initial data query
  setInterval(() => {
    if (visitorData.id) updateVisitor();
  }, updateInterval);
  //END: SEND USER DETAILS TO API

  //BEGIN: VISUALIZATION
  const getVisitorData = () => {
    //console.log(`[waiting] for visitor data`)
    $.ajax({
      type: "GET",
      dataType: "json",
      url: api,
      contentType: "application/json; charset=utf-8",

      success: function (data, status, xhr) {
        console.log(
          `[success] Received ${data.length} visitor traces from server.`
        );
        data = data.filter((session) => session.category);
        data = data.concat(data);
        data = data.concat(data);
        data.splice(0, 0, { category: null });
        network = renderNetwork(data);
        renderVis();
      },

      error: function (error, status, xhr) {
        console.log(error, status, xhr);
      },
    });
  };

  getVisitorData();

  const generatePath = (r) => {
    //values between .8 and 1.3
    let wobbleB = Math.random() * 0.5 + 0.8;
    let wobbleR = Math.random() * 0.5 + 0.8;

    return `
    M${wobbleR * r} ${0.5 * r}
    C${wobbleR * r} ${0.75 * r} ${0.75 * r} ${wobbleB * r} ${0.5 * r} ${
      wobbleB * r
    }
    C${0.25 * r} ${wobbleB * r} 0 ${0.75 * r} 0 ${0.5 * r}
    C0 ${0.25 * r} ${0.25 * r} 0 ${0.5 * r} 0
    C${0.75 * r} 0 ${wobbleR * r} ${0.25 * r} ${wobbleR * r} ${0.5 * r}Z
    `;
  };

  const renderNetwork = (data) => {
    let radiusScale = d3
      .scaleLinear()
      //.domain(d3.extent(data, (visit) => visit.duration))
      .domain([1000, 100000])
      .range([5, 15])
      .clamp(true);

    let nodes = data.map((node, i) => {
      let color = node.category ? colorScale(node.category) : "#ffce1e";
      let r = node.duration ? radiusScale(node.duration) : 1;
      if (!i) r = 20;
      return {
        radius: r,
        color: color,
        angle: Math.floor(Math.random() * 360),
      };
    });

    nodes = nodes.map((node, i) => {
      node.index = i;
      return node;
    });

    let links = nodes.map((node, i) => {
      return {
        source: 0,
        target: node.index,
      };
    });

    return {
      nodes: nodes,
      links: links,
    };
  };

  const renderVis = () => {
    let buffer = 20;
    let width = $(target).outerWidth();
    if (width < 576) return false; //dont render vis on mobile

    let height = $(target).outerHeight();
    const svg = d3
      .select(target)
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .attr("style", "position: absolute; z-index: -999; top: 0");

    const nodes = svg.append("g").attr("class", "nodes");
    const links = svg.append("g").attr("class", "links");

    const simulation = d3
      .forceSimulation(network.nodes)
      .alphaTarget(0.3) // stay hot
      .velocityDecay(0.1)
      .force("x", d3.forceX(width / 2).strength(0.001))
      .force("y", d3.forceY(height / 2).strength(0.009))
      //.force("center", d3.forceCenter(width / 2, height / 2).strength(1))
      .force(
        "collide",
        d3
          .forceCollide()
          .radius((d, i) => (i ? d.radius : 60))
          .iterations(2)
          .strength(0.5)
      )
      /*.force(
        "charge",
        d3.forceManyBody().strength((d, i) => (i ? -1 : 0.1))
      )*/
      .force("link", d3.forceLink().links(network.links).strength(0.0))

      .on("tick", ticked);

    d3.select(target)
      .on("touchmove", (event) => event.preventDefault())
      .on("pointermove", pointed)
      .on("click", pulse)
      .on("mouseleave", centerNode());

    function pointed(event) {
      const [x, y] = d3.pointer(event);
      network.nodes[0].fx = x;
      network.nodes[0].fy = y;
    }
    function centerNode() {
      //TODO: move first node to center
      network.nodes[0].fx = width * 0.75;
      network.nodes[0].fy = height / 2;
    }
    function pulse() {
      simulation.force(
        "collide",
        d3
          .forceCollide()
          .radius((d, i) => (i ? d.radius : 200))
          .iterations(1)
          .strength(0.11)
      );
      setTimeout(function () {
        simulation.force(
          "collide",
          d3
            .forceCollide()
            .radius((d, i) => (i ? d.radius : 80))
            .iterations(2)
            .strength(0.1)
        );
      }, 200);
    }

    function ticked() {
      var u = nodes.selectAll("path").data(network.nodes);

      u.enter()
        .append("path")
        .attr("d", (d) => generatePath(d.radius))
        .merge(u)
        .attr("transform", (d) => {
          let x = d.x;
          /*if (d.x < buffer) {
            x = buffer;
          } else if (d.x >= width - buffer) {
            x = width - buffer;
          }*/

          let y = d.y;
          /*if (d.y < buffer) {
            y = buffer;
          } else if (d.y >= height - buffer) {
            y = height - buffer;
          }*/
          return `translate(${x},${y}) rotate(${d.angle})`;
        })
        .attr("fill", (d) => d.color)
        .attr("opacity", (d, i) => (i ? 0.3 : 1));

      u.exit().remove();

      var l = links.selectAll("line").data(network.links);
      l.enter()
        .append("line")

        .attr("stroke-width", 2)
        .merge(l)
        .attr(
          "stroke",
          (d) =>
            //d.target.color
            network.nodes[0].color
        )
        .attr("x1", (d) => d.source.x)
        .attr("y1", (d) => d.source.y)
        .attr("x2", (d) => d.target.x)
        .attr("y2", (d) => d.target.y)
        .attr("opacity", (d) => {
          function dist(p1, p2) {
            let dx = p2.x - p1.x;
            let dy = p2.y - p1.y;
            return Math.sqrt(dx * dx + dy * dy);
          }
          return opacityScale(dist(d.source, d.target));
        });

      l.exit().remove();
    }
  };
  //END: VIS

  //BEGIN: USER FORM
  $(document).ready(function () {
    $("button.userType").on("click", function (evt) {
      evt.stopPropagation();
      evt.preventDefault();
      $("button.userType").removeClass("active");
      $(this).toggleClass("active");
      let category = $(this).val();
      updateVisitor(category);
    });
    /*  $(".btn-group .btn").on("click", function (evt) {
      evt.stopPropagation();
      evt.preventDefault();
      $(".btn-group .btn").removeClass("active");
      $(this).toggleClass("active");
      let category = $(this).children().val();
      updateVisitor(category);
    });

    $(".btn#toggle").on("click", function (evt) {
      evt.stopPropagation();
      evt.preventDefault();
      $(".stickyForm").toggle("slow");

      if ($(this).text() == "Hide survey") {
        $(this).text("Show survey");
      } else {
        $(this).text("Hide survey");
      }
    });*/
  });
}
