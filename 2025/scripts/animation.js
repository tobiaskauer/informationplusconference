let sketchHeight = 700;
let scaleFactor =  1;
let paths;
let velocity = -1;
let fold = true;
const foldAngleRange = {min:20,max:179};
const foldSteps = 400; // control anumate rate
let foldAngle = foldAngleRange.min;


function preload() {
  paths = loadJSON('scripts/path-data.json');
}


function setup() {
    describe('Information+ Conference 2025, Boston, MA.');
    let canvas = createCanvas(windowWidth - 20, sketchHeight, WEBGL);  // Create a canvas with the WEBGL renderer
    canvas.parent('animation');
    angleMode(DEGREES);
    rectMode(CORNER);
}


function draw() {
    background(255, 255, 255, 0); 

    // Lighting
    lights();
    directionalLight(222, 110, 0, -width, 200, 400);    
    directionalLight(20, 110, 220, width, -200, 400);    

    // Mouse rotation
    let rotationY = 0, rotationX = 0;
    if (mouseY <= height && mouseY >= 0 &&
        mouseX >= 0 && mouseX <= width) {
        rotationY = map(mouseX, 0, width, -15, 15);
        rotationX = map(mouseY, 0, height, 15, -15);
    }
    rotateY(rotationY)
    rotateX(rotationX)

    // Scaling
    translate(0, -50);
    scale(0.78);
    // Responseive scale
    scale(scaleFactor);

    // Animation steps
    if (frameCount % foldSteps === 0) fold = !fold;
    let foldStep = fold ? frameCount % foldSteps: foldSteps - (frameCount % foldSteps);
    foldAngle = map(foldStep, 0, foldSteps, foldAngleRange.min, foldAngleRange.max);
    
    // I
    translate(-350, -190, 0);
    drawPaths(paths.i);
    drawRect(120,40,40,80,0);
    drawRect(40,120,40,80,180);

    // N
    translate(180, 0, 0);
    drawPaths(paths.n);
    drawTriangle(40,53.3333,40,106.6667,69.444 + 270);
    drawTriangle(120,106.6667,40,106.6667,69.444 + 90);

    // F
    translate(180, 0, 0);
    drawPaths(paths.f);
    drawRect(80,40,80,40,0);
    drawRect(80,120,80,40,0);

    // O
    translate(180, 0, 0);
    drawPaths(paths.o,paths.o_void);
    drawTriangle(40,0,40,40,45);
    drawTriangle(160,40,40,40,135);
    drawTriangle(120,160,40,40,225);
    drawTriangle(0,120,40,40,-45);
    drawTriangle(60,60,40,40,-45);

    // P
    translate(-540, 220, 0);
    drawPaths(paths.p, paths.p_void);
    drawTriangle(160,40,40,40,135);
    drawTriangle(120,120,40,40,225);
    drawTriangle(80,40,40,40,-45);
    drawRect(80,120,80,40,0);

    // L
    translate(180, 0, 0);
    drawPaths(paths.l);
    drawRect(80,0,80,120,0);

    // U
    translate(180, 0, 0);
    drawPaths(paths.u);
    drawTriangle(120,160,40,40,225);
    drawTriangle(0,120,40,40,-45);
    drawRect(80,0,40,120,0);

    // S
    translate(180, 0, 0);
    drawPaths(paths.s);
    drawTriangle(40,0,40,40,45);
    drawTriangle(120,160,40,40,225);
    drawRect(40,60,20,120,-90);
    drawRect(120,100,20,120,-270);
}


function windowResized() {
    if (windowWidth < 550) {
        scaleFactor = (windowWidth - 30) / 550;
    } else {
        scaleFactor = 1;
    }
    resizeCanvas(windowWidth -20, sketchHeight);
}


function drawPaths(path_data, contour_data){
    push();
    specularMaterial(255, 255, 255);
    beginShape();
    noStroke();
    fill(255,255,255);
    for (let point of path_data) {
        vertex(point[0], point[1], 0); 
    }
    if (contour_data) {
        // mind the winding order: path = counterclockwise, contour = clockwise
        beginContour();
        for (let cp of contour_data) {
            vertex(cp[0], cp[1], 0); 
        }
        endContour(); 
    }
    endShape(CLOSE); 
    pop();
}


function drawRect(x,y,w,h,angle){
    push()
    translate(x,y);
    noStroke();
    rotate(angle);
    rotateY(-foldAngle);    
    fill(255, 255, 255);
    rect(0, 0, w, h);
    pop()
}


function drawTriangle(x,y,w,h,angle){
    push()
    translate(x,y);
    noStroke();
    const hypotenuse = Math.sqrt(Math.pow(w, 2) + Math.pow(h, 2));
    // Calculate the angle in radians
    const angleRadians = Math.atan(h / w);
    // Convert the angle to degrees
    const angleDegrees = angleRadians * (180 / Math.PI);
    rotate(angle);
    rotateY(foldAngle);    
    rotate(90 - angleDegrees)
    fill(255,255,255)
    triangle(0, 0, w, h, 0, h)
    pop()
}

