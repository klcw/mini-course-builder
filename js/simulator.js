// Passive-load switching simulator. Uses the slides' switching model, not a full transistor model.
(function () {
  // From the "Comparing E-MOSFETs" table (Malvino, Electronic Principles). Currents in amps.
  var DEVICES = [
    { name: "VN2406L", vth: 1.5, von: 2.5, idOn: 0.1, rdsOn: 10 },
    { name: "BS107", vth: 1.75, von: 2.6, idOn: 0.02, rdsOn: 28 },
    { name: "2N7000", vth: 2, von: 4.5, idOn: 0.075, rdsOn: 6 },
    { name: "VN10LM", vth: 2.5, von: 5, idOn: 0.2, rdsOn: 7.5 },
    { name: "MPF930", vth: 2.5, von: 10, idOn: 1, rdsOn: 0.9 },
    { name: "IRFD120", vth: 3, von: 10, idOn: 0.6, rdsOn: 0.3 }
  ];
  var RD_VALUES = [10, 22, 47, 100, 220, 470, 1000, 2200, 4700, 10000, 22000];
  // "Much smaller" needs a number to check against; 10 times is a common rule of thumb.
  var MUCH_SMALLER = 10;

  var form = document.getElementById("sim");
  var device = document.getElementById("sim-device");
  var vdd = document.getElementById("sim-vdd");
  var rd = document.getElementById("sim-rd");
  var vgs = document.getElementById("sim-vgs");
  var svg = document.getElementById("sim-svg");

  function $(id) {
    return document.getElementById(id);
  }

  function ohms(r) {
    if (r >= 1000) return trim(r / 1000) + " kΩ";
    return trim(r) + " Ω";
  }

  function amps(i) {
    if (i >= 1) return trim(i) + " A";
    return trim(i * 1000) + " mA";
  }

  function volts(v) {
    return trim(v) + " V";
  }

  // Up to 3 significant figures, without trailing zeros.
  function trim(n) {
    return String(Number(n.toPrecision(3)));
  }

  DEVICES.forEach(function (d, i) {
    var option = document.createElement("option");
    option.value = i;
    option.textContent = d.name;
    device.appendChild(option);
  });
  device.value = 2;

  function solve() {
    var d = DEVICES[device.value];
    var supply = Number(vdd.value);
    var r = RD_VALUES[rd.value];
    var gate = Number(vgs.value);
    var idSat = supply / r;
    var result = { d: d, supply: supply, r: r, gate: gate, idSat: idSat };

    if (gate < d.vth) {
      result.state = "off";
      result.id = 0;
      result.vout = supply;
    } else if (gate < d.von) {
      result.state = "partial";
    } else if (idSat < d.idOn) {
      result.state = "ohmic";
      result.vout = supply * d.rdsOn / (r + d.rdsOn);
      result.id = (supply - result.vout) / r;
    } else {
      result.state = "not-ohmic";
    }
    return result;
  }

  function sub(text) {
    // Turns "V_GS(th)" style names into HTML with a subscript.
    return text.replace(/_([A-Za-z()]+)/g, "<sub>$1</sub>");
  }

  function describe(s) {
    var d = s.d;
    if (s.state === "off") {
      return {
        state: "MOSFET is OFF (open switch)",
        working: sub("V_GS = " + volts(s.gate) + " is below V_GS(th) = " + volts(d.vth) +
          ", so no channel forms. I_D = 0, there is no voltage across R_D, and v_out = V_DD = " + volts(s.supply) + ".")
      };
    }
    if (s.state === "partial") {
      return {
        state: "MOSFET is only PARTLY ON",
        working: sub("V_GS = " + volts(s.gate) + " is above V_GS(th) = " + volts(d.vth) +
          " but below V_GS(on) = " + volts(d.von) +
          ". The MOSFET conducts, but it isn't hard on, so it can't be treated as R_DS(on). Raise V_GS to at least V_GS(on).")
      };
    }
    if (s.state === "ohmic") {
      return {
        state: "MOSFET is ON, in the ohmic region (closed switch)",
        working: sub("I_D(sat) = " + volts(s.supply) + " / " + ohms(s.r) + " = " + amps(s.idSat) +
          ", which is less than I_D(on) = " + amps(d.idOn) + ". So the MOSFET acts as R_DS(on) = " + ohms(d.rdsOn) +
          ", and v_out = " + ohms(d.rdsOn) + " / (" + ohms(s.r) + " + " + ohms(d.rdsOn) + ") × " + volts(s.supply) +
          " = " + volts(s.vout) + ".")
      };
    }
    return {
      state: "MOSFET is ON, but NOT in the ohmic region",
      working: sub("I_D(sat) = " + volts(s.supply) + " / " + ohms(s.r) + " = " + amps(s.idSat) +
        ", which is not less than I_D(on) = " + amps(d.idOn) +
        ". The Q point lands above Q_test, so R_DS(on) doesn't apply and this isn't a reliable switch. Use a larger R_D or a smaller V_DD.")
    };
  }

  function check(s) {
    var ratio = s.r / s.d.rdsOn;
    var text = "R_D is " + trim(ratio) + " times R_DS(on). ";
    if (ratio >= MUCH_SMALLER) {
      text += "R_DS(on) is much smaller than R_D, so the low output is close to 0 V.";
    } else {
      text += "That's under " + MUCH_SMALLER + " times, so R_DS(on) isn't much smaller than R_D and the low output may not read clearly as low.";
    }
    return sub(text);
  }

  function el(name, attrs, text) {
    var node = document.createElementNS("http://www.w3.org/2000/svg", name);
    for (var key in attrs) node.setAttribute(key, attrs[key]);
    if (text) node.textContent = text;
    svg.appendChild(node);
    return node;
  }

  function draw(s) {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    var left = 100, right = 325, top = 15, bottom = 190;
    var maxI = Math.max(s.idSat, s.d.idOn) * 1.15;
    function x(v) { return left + (v / s.supply) * (right - left); }
    function y(i) { return bottom - (i / maxI) * (bottom - top); }

    el("line", { x1: left, y1: bottom, x2: right, y2: bottom, "class": "axis" });
    el("line", { x1: left, y1: bottom, x2: left, y2: top, "class": "axis" });
    el("text", { x: right, y: bottom - 6, "text-anchor": "end", "class": "label" }, "VDS");
    el("text", { x: left - 6, y: top + 4, "text-anchor": "end", "class": "label" }, "ID");

    el("line", { x1: left, y1: y(s.d.idOn), x2: right, y2: y(s.d.idOn), "class": "idon" });
    // Nudges the ID(on) label up when it would sit on top of the ID(sat) label.
    var idOnLabelY = y(s.d.idOn) + 4;
    if (Math.abs(y(s.d.idOn) - y(s.idSat)) < 14) idOnLabelY = Math.min(y(s.d.idOn), y(s.idSat)) - 10;
    el("text", { x: left - 6, y: idOnLabelY, "text-anchor": "end", "class": "label" }, "ID(on) " + amps(s.d.idOn));

    el("line", { x1: x(0), y1: y(s.idSat), x2: x(s.supply), y2: y(0), "class": "loadline" });
    el("text", { x: left - 6, y: y(s.idSat) + 4, "text-anchor": "end", "class": "label" }, "ID(sat) " + amps(s.idSat));
    el("text", { x: x(s.supply), y: bottom + 18, "text-anchor": "middle", "class": "label" }, volts(s.supply));
    el("text", { x: left, y: bottom + 18, "text-anchor": "middle", "class": "label" }, "0");

    if (s.state === "off" || s.state === "ohmic") {
      el("circle", { cx: x(s.vout), cy: y(s.id), r: 6, "class": "qpoint" });
      el("text", { x: x(s.vout) + (s.state === "off" ? -10 : 10), y: y(s.id) - 10,
        "text-anchor": s.state === "off" ? "end" : "start", "class": "label" }, "Q");
    }
  }

  function update() {
    var s = solve();
    var text = describe(s);
    $("sim-vdd-out").textContent = volts(s.supply);
    $("sim-rd-out").textContent = ohms(s.r);
    $("sim-vgs-out").textContent = volts(s.gate);
    $("sim-thresholds").textContent = volts(s.d.vth) + " / " + volts(s.d.von);
    $("sim-idsat").textContent = amps(s.idSat);
    $("sim-idon").textContent = amps(s.d.idOn);
    $("sim-vout").textContent = s.vout === undefined ? "Not found by the switching model" : volts(s.vout);
    $("sim-state").textContent = text.state;
    $("sim-state").setAttribute("data-state", s.state);
    $("sim-working").innerHTML = text.working;
    $("sim-check").innerHTML = s.state === "ohmic" ? check(s) : "";
    draw(s);
  }

  $("sim-low").addEventListener("click", function () {
    vgs.value = 0;
    update();
  });
  $("sim-high").addEventListener("click", function () {
    vgs.value = DEVICES[device.value].von;
    update();
  });
  form.addEventListener("input", update);
  form.addEventListener("submit", function (e) { e.preventDefault(); });

  form.hidden = false;
  update();
})();
