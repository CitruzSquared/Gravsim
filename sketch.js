function setup() {
    w = windowWidth;
    createCanvas(windowWidth * 25 / 32, windowHeight - 5);
    generate();
    for (let i = 0; i < planets.length; i++) {
        planets[i].ID = i;
    }
    zoomlabel = createElement("h5", "Zoom Level");
    zoomlabel.position(w - 235, -5);
    zoomSlider = createSlider(0, 10, 6, 1);
    zoomSlider.position(w - 160, 15);
    zoomSlider.style('width', '120px');

    beg = createButton('Begin / Restart');
    beg.position(w - 160, 45);
    beg.mousePressed(begin);
    beg.size(120, 20);

    pbutton = createButton('Pause / Play');
    pbutton.position(w - 160, 70);
    pbutton.attribute('disabled', '');
    pbutton.mousePressed(pause);
    pbutton.size(120, 20);

    tr = createCheckbox('Trails', true);
    tr.position(w - 160, 95);
    tr.changed(toggleTrail);

    n = createCheckbox('ID & Names', false);
    n.position(w - 160, 115);
    n.changed(toggleNames);

    st = createCheckbox('Stats', false);
    st.position(w - 160, 135);
    st.changed(toggleStats);

    centerlabel = createElement("h5", "Center Camera");
    centerlabel.position(w - 260, 140);
    centerselect = createSelect();
    centerselect.position(w - 160, 160);
    centerselect.option("No Center (0, 0)");
    for (let i = 0; i < planets.length; i++) {
        centerselect.option(planets[i].ID.toString() + " || " + planets[i].name);
    }
    centerselect.changed(centerCamera);

    relative = createCheckbox('Relative Trails', false);
    relative.position(w - 160, 180);
    relative.attribute('disabled', '');
    relative.changed(relativity);

    cbutton = createButton('Create New Body');
    cbutton.mousePressed(createplanetmenu);
    cbutton.position(w - 160, 240);

    clearobject = createElement("h5", "Remove Object");
    clearobject.position(w - 263, 380);
    clearobjectselect = createSelect();
    clearobjectselect.position(w - 160, 400);
    for (let i = 0; i < planets.length; i++) {
        clearobjectselect.option(planets[i].ID + " || " + planets[i].name);
    }
    obutton = createButton('Remove');
    obutton.position(w - 160, 421);
    obutton.mousePressed(removeObject);
    obutton.size(70, 20);

    clbutton = createButton('Remove Everything');
    clbutton.position(w - 160, 445);
    clbutton.mousePressed(clearAll);
}

var clearobject, obutton, n, tr, st, relative, centerselect, clearobjectselect, beg;
var massinput, radiusinput, posxinput, posyinput, velocityxinput, velocityyinput, nameinput;
var label, masslabel, radiuslabel, poslabel, velocitylabel, namelabel;
var paused = false;
var began = false;
var creating = false;

var G = 1E8;
var planets = [];
var beginning = [];
var massScale = 1E3;
var maxHistory = 300;

var time = 0.005;
var zoom = 1;
var sizeScale = zoom * 1E3;
var trails = true;
var relativeTrails = false;
var stats = false;
var names = false;

class Planet {
    constructor(m, r, p, v, c, cent, n) {
        this.name = n;
        this.ID;
        this.hasSaved = false;
        this.central = cent;
        this.fixed = false;
        this.mass = m * massScale;
        this.radius = r * 1E3;
        this.position = p.mult(1E3);
        this.velocity = v.mult(1E3);
        this.acceleration = createVector(0, 0);
        this.col = c;
        this.force = createVector(0, 0);
        this.history = [];
    }

    drawPlanet(cv) {
        strokeWeight(2);
        stroke(this.col);
        fill(this.col);
        ellipseMode(RADIUS);
        ellipse(this.position.copy().sub(cv).x / sizeScale, this.position.copy().sub(cv).y / sizeScale, this.radius / sizeScale, this.radius / sizeScale);
    }

    hist(cv) {
        if (relativeTrails) {
            this.history.push(this.position.copy().sub(cv));
        }
        else {
            this.history.push(this.position.copy());
        }
        if (this.history.length >= maxHistory) {
            this.history.shift();
        }
    }

    drawTrails(cv) {
        for (let i = 0; i < this.history.length - 1; i++) {
            let opacity = map(i, 0, this.history.length - 1, 0, 100);
            stroke(red(this.col), green(this.col), blue(this.col), opacity);
            if (relativeTrails) {
                line(this.history[i].copy().x / sizeScale, this.history[i].copy().y / sizeScale, this.history[i + 1].copy().x / sizeScale, this.history[i + 1].copy().y / sizeScale);
            }
            else {
                line(this.history[i].copy().sub(cv).x / sizeScale, this.history[i].copy().sub(cv).y / sizeScale, this.history[i + 1].copy().sub(cv).x / sizeScale, this.history[i + 1].copy().sub(cv).y / sizeScale);
            }
        }
    }

    displayStats(cv) {
        let textsize = 12;
        noStroke();
        fill(this.col);
        textAlign(LEFT);
        textSize(textsize);
        text("Mass : " + this.mass, this.position.copy().sub(cv).x / sizeScale + this.radius / sizeScale * 1.5, this.position.copy().sub(cv).y / sizeScale + this.radius / sizeScale * 1.5 - textsize * 5);
        text("Radius : " + round(this.radius), this.position.copy().sub(cv).x / sizeScale + this.radius / sizeScale * 1.5, this.position.copy().sub(cv).y / sizeScale + this.radius / sizeScale * 1.5 - textsize * 4);
        text("Position | X: " + (round(this.position.copy().x)) + ", Y: " + (-1 * round(this.position.copy().y)), this.position.copy().sub(cv).x / sizeScale + this.radius / sizeScale * 1.5, this.position.copy().sub(cv).y / sizeScale + this.radius / sizeScale * 1.5 - textsize * 3);
        text("Velocity | X: " + (round(this.velocity.copy().x)) + ", Y: " + (-1 * round(this.velocity.copy().y)) + " (Mag: " + round(this.velocity.copy().mag()) + ")", this.position.copy().sub(cv).x / sizeScale + this.radius / sizeScale * 1.5, this.position.copy().sub(cv).y / sizeScale + this.radius / sizeScale * 1.5 - textsize * 2);
        text("Acceleration | X: " + (round(this.acceleration.copy().x)) + ", Y: " + (-1 * round(this.acceleration.copy().y)) + " (Mag: " + round(this.acceleration.copy().mag()) + ")", this.position.copy().sub(cv).x / sizeScale + this.radius / sizeScale * 1.5, this.position.copy().sub(cv).y / sizeScale + this.radius / sizeScale * 1.5 - textsize);
    }

    displayNames(cv) {
        let textsize = 12;
        noStroke();
        fill(this.col);
        textSize(textsize);
        textAlign(CENTER);
        text(this.ID + " || " + this.name, this.position.copy().sub(cv).x / sizeScale, this.position.copy().sub(cv).y / sizeScale + this.radius / sizeScale + 15);
    }

    calculateGravity() {
        let gravity = createVector(0, 0);
        for (let p of planets) {
            if (p != this) {
                let distance = createVector(p.position.x - this.position.x, p.position.y - this.position.y);
                let gravitational = G * this.mass * p.mass / (distance.mag() * distance.mag());
                gravity.add(p5.Vector.fromAngle(distance.heading()).mult(gravitational));
            }
        }
        this.force = gravity;
    }

    clone() {
        return new Planet(this.mass / massScale, this.radius / 1E3, this.position.copy().div(1E3), this.velocity.copy().div(1E3), this.col, this.central, this.name);
    }
}

function generate() {
    planets.push(new Planet(25, 25, createVector(0, 0), createVector(0, 0), color(255, 148, 0), false, "Sun"));
    planets.push(new Planet(6, 6, createVector(0, 200), createVector(4, 0), color(140, 203, 255), false, "Planet"));

    beginning.push(new Planet(25, 25, createVector(0, 0), createVector(0, 0), color(255, 148, 0), false, "Sun"));
    beginning.push(new Planet(6, 6, createVector(0, 200), createVector(4, 0), color(140, 203, 255), false, "Planet"));
}

function update(p, t) {
    p.calculateGravity();
    p.acceleration = p.force.div(p.mass);
    p.acceleration.limit(1000);
    p.velocity.add(p.acceleration.copy().mult(t));
}

function updatePos(p, t) {
    p.position.add(p.velocity.copy().mult(t));
}
var centerVector;
function draw() {
    background(30);
    z = 9 - zoomSlider.value();
    if (z >= 3) {
        zoom = z - 2;
    }
    else {
        zoom = 0.5 ** (3 - z);
    }
    sizeScale = zoom * 1E3;
    centerVector = createVector(0, 0);
    translate(width / 2, height / 2);
    for (let i = 0; i < planets.length; i++) {
        planets[i].hasSaved = false;
        if (planets[i].central) {
            centerVector = planets[i].position.copy();
        }
    }
    for (let i = 0; i < planets.length; i++) {
        if (trails) {
            if (!paused && began) {
                planets[i].hist(centerVector);
            }
            planets[i].drawTrails(centerVector);
        }
        if (stats) {
            planets[i].displayStats(centerVector);
        }
        if (names) {
            planets[i].displayNames(centerVector);
        }
    }
    for (let i = 0; i < planets.length; i++) {
        planets[i].drawPlanet(centerVector);
    }
    if (!paused && began) {
        for (var k = 0; k < 1 / time; k++) {
            for (let i = planets.length - 1; i >= 0; i--) {
                if (!planets[i].fixed) {
                    update(planets[i], time);
                }
            }
            for (let i = planets.length - 1; i >= 0; i--) {
                if (!planets[i].fixed) {
                    updatePos(planets[i], time);
                }
            }
        }
    }
    for (let i = planets.length - 1; i >= 0; i--) {
        for (let o of planets) {
            if (o !== planets[i] && dist(o.position.x, o.position.y, planets[i].position.x, planets[i].position.y) <= o.radius + planets[i].radius) {
                let j = planets.indexOf(o);

                let m = o.mass + planets[i].mass;
                let r = Math.cbrt(o.radius * o.radius * o.radius + planets[i].radius * planets[i].radius * planets[i].radius);
                let v = o.velocity.copy().mult(o.mass).add(planets[i].velocity.copy().mult(planets[i].mass));
                let isCent = false;
                let re = (red(o.col) + red(planets[i].col)) / 2;
                let g = (green(o.col) + green(planets[i].col)) / 2;
                let b = (blue(o.col) + blue(planets[i].col)) / 2;

                if (o.central || planets[i].central) {
                    isCent = true;
                }

                if (o.mass > planets[i].mass) {
                    let x = document.getElementsByTagName("select")[0];
                    for (let p = 0; p < x.length; p++) {
                        if (x.options[p].value.substring(0, x.value.indexOf(" ")) == planets[i].ID) {
                            x.remove(p);
                        }
                    }
                    x = document.getElementsByTagName("select")[1];
                    for (let p = 0; p < x.length; p++) {
                        if (x.options[p].value.substring(0, x.value.indexOf(" ")) == planets[i].ID) {
                            x.remove(p);
                        }
                    }
                    let h = o.history;
                    let id = o.ID;
                    planets[j] = new Planet(m / massScale, r / 1E3, o.position.div(1E3), v.div(m).div(1E3), color(re, g, b), isCent, o.name);
                    planets[j].ID = id;
                    planets[j].history = h;
                    if (isCent) {
                        centerselect.value(planets[j].ID.toString() + " || " + planets[j].name);
                    }
                    planets.splice(i, 1);
                }
                else {
                    let x = document.getElementsByTagName("select")[0];
                    for (let p = 0; p < x.length; p++) {
                        if (x.options[p].value.substring(0, x.value.indexOf(" ")) == o.ID) {
                            x.remove(p);
                        }
                    }
                    x = document.getElementsByTagName("select")[1];
                    for (let p = 0; p < x.length; p++) {
                        if (x.options[p].value.substring(0, x.value.indexOf(" ")) == o.ID) {
                            x.remove(p);
                        }
                    }
                    let h = planets[i].history;
                    let id = planets[i].ID;
                    planets[i] = new Planet(m / massScale, r / 1E3, planets[i].position.div(1E3), v.div(m).div(1E3), color(re, g, b), isCent, planets[i].name);
                    planets[i].ID = id;
                    planets[i].history = h;
                    if (isCent) {
                        centerselect.value(planets[i].ID.toString() + " || " + planets[i].name);
                    }
                    planets.splice(planets.indexOf(o), 1);
                }
                i = planets.length - 1;
            }
        }
    }
    if (paused && began) {
        textSize(32);
        noStroke();
        fill(255);
        textAlign(LEFT);
        text("PAUSED", -width / 2 + 20, -height / 2 + 40);
    }
    if (!began) {
        textSize(32);
        noStroke();
        fill(255);
        textAlign(LEFT);
        text("PRESS BEGIN TO START", -width / 2 + 20, -height / 2 + 40);
    }
}

function mouseClicked() {
    if (creating && mouseX >= 0 && mouseX <= 1000 && mouseY >= 0 && mouseY <= 574) {
        posxinput.value((mouseX - 500) * 1E3);
        posyinput.value((mouseY - 287) * -1E3);
    }
}

function pause() {
    if (paused) {
        paused = false;
    }
    else {
        paused = true;
    }
}

function clearAll() {
    let m = document.getElementsByTagName("select")[0];
    for (let p = m.length - 1; p >= 1; p--) {
        m.remove(p);
    }
    m = document.getElementsByTagName("select")[1];
    for (let p = m.length - 1; p >= 0; p--) {
        m.remove(p);
    }
    beginning = [];
    planets = [];
}

function removeObject() {
    for (let i = planets.length - 1; i >= 0; i--) {
        if (planets[i].ID == clearobjectselect.value().substring(0, clearobjectselect.value().indexOf(" "))) {
            if (planets[i].central = true && centerselect.value() !== "No Center (0, 0)") {
                planets[i].central = false;
                for (let j = 0; j < planets.length; j++) {
                    if (j != i) {
                        centerselect.value(planets[j].ID.toString() + " || " + planets[j].name);
                        planets[j].central = true;
                    }
                }
            }
            let x = document.getElementsByTagName("select")[0];
            for (let p = 0; p < x.length; p++) {
                if (x.options[p].value == clearobjectselect.value()) {
                    x.remove(p);
                }
            }
            x = document.getElementsByTagName("select")[1];
            x.remove(x.selectedIndex);
            planets.splice(i, 1);
            if (!began) {
                beginning.splice(i, 1);
            }
            break;
        }
    }
}

function centerCamera() {
    if (relative.checked()) {
        for (let i = 0; i < planets.length; i++) {
            planets[i].history = [];
        }
    }
    if (centerselect.value() !== "No Center (0, 0)") {
        if (tr.checked()) {
            relative.removeAttribute('disabled');
        }
        for (let i = 0; i < planets.length; i++) {
            planets[i].central = false;
            if (planets[i].ID == centerselect.value().substring(0, centerselect.value().indexOf(" "))) {

                planets[i].central = true;
            }
        }
    }
    else {
        for (let i = 0; i < planets.length; i++) {
            planets[i].central = false;
        }
        relative.attribute('disabled', '');
    }
}

function relativity() {
    if (centerselect.value() !== "No Center (0, 0)") {
        if (relative.checked()) {
            for (let i = 0; i < planets.length; i++) {
                planets[i].history = [];
            }
            relativeTrails = true;
        }
        else {
            for (let i = 0; i < planets.length; i++) {
                planets[i].history = [];
            }
            relativeTrails = false;

        }
    }
}

function toggleTrail() {
    if (tr.checked()) {
        for (let i = 0; i < planets.length; i++) {
            planets[i].history = [];
        }
        if (centerselect.value() !== "No Center (0, 0)") {
            relative.removeAttribute('disabled');
        }
        trails = true;
    }
    else {
        trails = false;
        relative.attribute('disabled', '');
    }
}

function toggleStats() {
    if (st.checked()) {
        stats = true;
    }
    else {
        stats = false;
    }
}

function toggleNames() {
    if (n.checked()) {
        names = true;
    }
    else {
        names = false;
    }
}

function begin() {
    if (began) {
        reset();
        began = false;
        pbutton.attribute('disabled', '');
    }
    else {
        began = true;
        pbutton.removeAttribute('disabled');
    }
}

function reset() {
    paused = false;
    let m = document.getElementsByTagName("select")[0];
    for (let p = m.length - 1; p >= 1; p--) {
        m.remove(p);
    }
    m = document.getElementsByTagName("select")[1];
    for (let p = m.length - 1; p >= 0; p--) {
        m.remove(p);
    }
    planets = [];
    for (let i = 0; i < beginning.length; i++) {
        planets.push(beginning[i].clone());
    }
    for (let i = 0; i < planets.length; i++) {
        planets[i].ID = i;
    }
    for (let i = 0; i < planets.length; i++) {
        centerselect.option(planets[i].ID.toString() + " || " + planets[i].name);
        clearobjectselect.option(planets[i].ID.toString() + " || " + planets[i].name);
    }
    if (centerselect.value() == "No Center (0, 0)") {
        if (tr.checked()) {
            relative.attribute('disabled', '');
        }
    }
}

function createplanetmenu() {
    creating = true;
    cbutton.remove();

    label = createElement("h4", "Create Object");
    label.position(w - 150, 195);

    masslabel = createElement("h5", "Mass : ");
    masslabel.position(w - 208, 220);
    massinput = createInput();
    massinput.position(w - 160, 240);
    massinput.size(120);

    radiuslabel = createElement("h5", "Radius : ");
    radiuslabel.position(w - 219, 240);
    radiusinput = createInput();
    radiusinput.position(w - 160, 260);
    radiusinput.size(120);

    poslabel = createElement("h5", "Screen Pos X, Y : ");
    poslabel.position(w - 275, 260);
    posxinput = createInput();
    posxinput.position(w - 160, 280);
    posxinput.size(60);
    posyinput = createInput();
    posyinput.position(w - 95, 280);
    posyinput.size(55);

    velocitylabel = createElement("h5", "Velocity X, Y : ");
    velocitylabel.position(w - 253, 280);
    velocityxinput = createInput();
    velocityxinput.position(w - 160, 300);
    velocityxinput.size(60);
    velocityyinput = createInput();
    velocityyinput.position(w - 95, 300);
    velocityyinput.size(55);

    namelabel = createElement("h5", "Name : ");
    namelabel.position(w - 210, 300);
    nameinput = createInput();
    nameinput.position(w - 160, 320);
    nameinput.size(120);

    colorlabel = createElement("h5", "Color : ");
    colorlabel.position(w - 209, 320);
    colorpicker = createColorPicker(color(255, 255, 255));
    colorpicker.position(w - 160, 340);
    colorpicker.size(121, 20);

    okbutton = createButton('Create');
    okbutton.position(w - 160, 363);
    okbutton.size(65, 20);
    okbutton.mousePressed(createPlanet);

    canbutton = createButton('Cancel');
    canbutton.position(w - 95, 363);
    canbutton.size(63, 20);
    canbutton.mousePressed(cancelcreate);
}

function cancelcreate() {
    cbutton = createButton('Create New Planet');
    cbutton.mousePressed(createplanetmenu);
    cbutton.position(w - 160, 240);

    label.remove();
    masslabel.remove();
    radiuslabel.remove();
    poslabel.remove();
    velocitylabel.remove();
    namelabel.remove();
    massinput.remove();
    radiusinput.remove();
    posxinput.remove();
    posyinput.remove();
    velocityxinput.remove();
    velocityyinput.remove();
    nameinput.remove();
    colorlabel.remove();
    colorpicker.remove();
    okbutton.remove();
    canbutton.remove();
}

function createPlanet() {
    print(sizeScale);
    if (!isNaN(massinput.value()) && !isNaN(radiusinput.value()) && !isNaN(posxinput.value()) && !isNaN(posyinput.value()) && !isNaN(velocityxinput.value()) && !isNaN(velocityyinput.value())) {
        if (massinput.value() > 0 && radiusinput.value() > 0 && nameinput.value() != "") {
            maxid = 0;
            for (let i = 0; i < planets.length; i++) {
                if (planets[i].ID >= maxid) {
                    maxid = planets[i].ID;
                }
            }
            let p = new Planet(massinput.value() / massScale, radiusinput.value() / 1E3, createVector(parseFloat(posxinput.value()) * zoom + centerVector.copy().x, centerVector.copy().y - parseFloat(posyinput.value()) * zoom).div(1E3), createVector(velocityxinput.value() / 1E3, velocityyinput.value() / -1E3), colorpicker.value(), false, nameinput.value());
            planets.push(p);
            if (!began) {
                beginning.push(p.clone());
            }
            p.ID = maxid + 1;

            centerselect.option(p.ID.toString() + " || " + p.name);
            clearobjectselect.option(p.ID.toString() + " || " + p.name);
        }
    }
}