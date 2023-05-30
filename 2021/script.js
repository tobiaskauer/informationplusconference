var canvas = document.querySelector("canvas");
    context = canvas.getContext("2d");
    offscreen = document.querySelector(".offscreen");
    offscreenContext = offscreen.getContext("2d");
    gui = new dat.GUI();



// canvas.width = window.innerWidth;

var width = window.innerWidth,
    height = 400,
    numBoids = 300,
    flockmateRadius = 50,
    separationDistance = 30,
    maxVelocity = 2,
    separationForce = 0.03,
    alignmentForce = 0.3,
    cohesionForce = 0.03,
    startingPosition = "Random",
    // coloring = "By Movement",
    boids;

d3.select("canvas").attr("width", window.innerWidth);
d3.select(".offscreen").attr("width", window.innerWidth);

offscreenContext.globalAlpha = 0.85;

// gui.add(window, "flockmateRadius", 0, 500).step(1);
// gui.add(window, "separationDistance", 0, 100).step(1);
// gui.add(window, "maxVelocity", 0, 5).step(0.25);
// gui.add(window, "cohesionForce", 0, 0.25);
// gui.add(window, "alignmentForce", 0, 0.25);
// gui.add(window, "separationForce", 0, 0.25);
// gui.add(window, "numBoids", 1, 600).step(1).onChange(restart);
// gui.add(window, "startingPosition", ["Random", "CircleIn", "CircleRandom", "Sine", "Phyllotaxis"]).onChange(restart);
// gui.add(window, "coloring", ["Rainbow", "By Movement"]);
// gui.add(window, "restart");

// d3.select("canvas").on("click", function(){
//   var xy = d3.mouse(this);
//   boids.push({
//     color: d3.interpolateRainbow((boids.length / 10) % 1),
//     position: new Vec2(xy[0], xy[1]),
//     velocity: randomVelocity(),
//     last: []
//   });
// });

restart();
requestAnimationFrame(tick);

function tick() {
	
	var rect = canvas.getBoundingClientRect();
	if (rect.bottom<0) {
		setTimeout(function() { requestAnimationFrame(tick); }, 1000);
		return;
	}

  offscreenContext.clearRect(0, 0, width, height);
  offscreenContext.drawImage(canvas, 0, 0, width, height);
  context.clearRect(0, 0, width, height);
  context.drawImage(offscreen, 0, 0, width, height);

  boids.forEach(function(b){

    var forces = {
      alignment: new Vec2(),
      cohesion: new Vec2(),
      separation: new Vec2()
    };

    b.acceleration = new Vec2();

    boids.forEach(function(b2){
      if (b === b2) return;

      var diff = b2.position.clone().subtract(b.position),
          distance = diff.length();

      if (distance && distance < separationDistance) {
        forces.separation.add(diff.clone().scaleTo(-1 / distance)).active = true;
      }

      if (distance < flockmateRadius) {
        forces.cohesion.add(diff).active = true;
        forces.alignment.add(b2.velocity).active = true;
      }

    });


    for (var key in forces) {
      if (forces[key].active) {
        forces[key].scaleTo(maxVelocity)
          .subtract(b.velocity)
          .truncate(window[key + "Force"]);
        b.acceleration.add(forces[key]);
      }
    }

    // if (coloring === "By Movement") {
      b.last.push(b.acceleration.length() / (alignmentForce + cohesionForce + separationForce));
      if (b.last.length > 20) b.last.shift();      
    // }

  });

  boids.forEach(updateBoid);
  requestAnimationFrame(tick);
}

function updateBoid(b) {
  b.position.add(b.velocity.add(b.acceleration).truncate(maxVelocity));

  if (b.position.y > height) {
    b.position.y -= height;
  } else if (b.position.y < 0) {
    b.position.y += height;
  }

  if (b.position.x > width) {
    b.position.x -= width;
  } else if (b.position.x < 0) {
    b.position.x += width;
  }

  context.beginPath();
  // if (coloring === "Rainbow") {
  //   context.fillStyle = b.color;
  // } else {
  context.fillStyle = d3.interpolateWarm(d3.mean(b.last));
  // }
  context.arc(b.position.x, b.position.y, 2, 0, 2 * Math.PI);
  context.fill();
}

function initializeRandom() {
  return d3.range(numBoids).map(function(d, i){
    return {
      position: new Vec2(Math.random() * width, Math.random() * height),
      velocity: randomVelocity()
    };
  });
}

function initializePhyllotaxis() {
  return d3.range(numBoids).map(function(d, i){
    var θ = Math.PI * i * (Math.sqrt(5) - 1),
        r = Math.sqrt(i) * 200 / Math.sqrt(numBoids);

    return {
      position: new Vec2(width / 2 + r * Math.cos(θ),height / 2 - r * Math.sin(θ)),
      velocity: radialVelocity(i / numBoids)
    };
  });
}

function initializeSine() {
  return d3.range(numBoids).map(function(i){
    var angle = 2 * Math.PI * i / numBoids,
        x = width * i / numBoids,
        y = height / 2 + Math.sin(angle) * height / 4;

    return {
      position: new Vec2(x, y),
      velocity: radialVelocity(i / numBoids)
    };
  });
}

function initializeCircleIn() {
  return d3.range(numBoids).map(function(i){
    var angle = i * 2 * Math.PI / numBoids,
        x = 200 * Math.sin(angle),
        y = 200 * Math.cos(angle);

    return {
      position: new Vec2(x + width / 2, y + height / 2),
      velocity: new Vec2(-x, -y).scale(maxVelocity)
    };
  });
}

function initializeCircleRandom() {
  return d3.range(numBoids).map(function(i){
    var angle = i * 2 * Math.PI / numBoids,
        x = 200 * Math.sin(angle),
        y = 200 * Math.cos(angle);

    return {
      position: new Vec2(x + width / 2, y + height / 2),
      velocity: randomVelocity().scale(maxVelocity)
    };
  });
}

function randomVelocity() {
  return new Vec2(1 - Math.random() * 2, 1 - Math.random() * 2).scale(maxVelocity);
}

function radialVelocity(p) {
  return new Vec2(Math.sin(2 * Math.PI * p), Math.cos(2 * Math.PI * p)).scale(maxVelocity);
}

function restart() {
  offscreenContext.clearRect(0, 0, width, height);
  context.clearRect(0, 0, width, height);
  boids = window["initialize" + startingPosition]();
  boids.forEach(function(b, i){
    b.color = d3.interpolateRainbow(i / numBoids);
    b.last = [];
  });
}


