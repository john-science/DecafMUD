/**
 * Handle Discworld-specific ZMP commands.  This uses the plugin in
 * decafmud.telopt.zmp.js
 */

var progresscreated = false;
var xp, hp, gp, bdn, maxhp, maxgp;
var xpspan;

function start_zmp() {
  decaf.zmp.addFunction( "char.vitals",
                         function(cmd,val) {handle_variables(val);}
                       );
  decaf.zmp.addFunction( "Char.Vitals",
                         function(cmd,val) {handle_variables(val);}
                       );
  decaf.zmp.addFunction( "room.map",
                         function(cmd, val) {show_map(val);}
                       );
  decaf.zmp.addFunction( "lpc.edit",
                         function(cmd, val) {init_edit(val);}
                       );
  decaf.zmp.addFunction( "lpc.file",
                         function(cmd, val) {edit_file(val);}
                       );
  decaf.zmp.addFunction( "lpc.written",
                         function(path) { saved_file(path); }
                       );
}

function read_part(arr, part) {
  for (i = 0; i < arr.length-1; i++) {
    if (arr[i] == part) return arr[i+1];
  }
  return -1;
}

/********** ZMP ACTION: char.vitals **********/

function handle_variables(values) {
  hp = read_part(values, "hp");
  maxhp = read_part(values, "maxhp");
  gp = read_part(values, "gp");
  maxgp = read_part(values, "maxgp");
  xp = read_part(values, "xp");
  bdn = read_part(values, "burden");
/*
  prompttxt = "<span class=\"c1\">Hp:" + hp + "(" + maxhp + ")</span>/" +
              "<span class=\"c2\">Gp:" + gp + "(" + maxgp + ")</span>/" +
              "<span class=\"c6\">Xp:" + xp + "</span>";
  if (burden != "??")
    prompttxt += "/<span class=\"c3\">Burden:" + burden + "</span>";
  decaf.ui.display.message("["+prompttxt+"]");
*/

  update_bars();
}

function hex_perc(value) {
  value = Math.round(value * 255 / 100);
  var ret = value.toString(16);
  if (ret.length == 1) ret = "0"+ret;
  return ret;
}

function update_bars() {
  if (!progresscreated) {
    toggle_progressbars(true);
    decaf.ui.addProgressBar('Hp', 'green');
    decaf.ui.addProgressBar('Gp','#c50');
    decaf.ui.addProgressBar('Bdn', 'cyan');
    // and one for xp
    var tr = document.createElement("tr");
    decaf.ui.progresstable.appendChild(tr);
    var td = document.createElement("td");
    tr.appendChild(td);
    td.innerHTML = "Xp:";
    td = document.createElement("td");
    tr.appendChild(td);
    xpspan = document.createElement("span");
    td.appendChild(xpspan);
    
    // set up standard data
    progresscreated = true;
    var opt = document.getElementById("submenu_options");
    var lli = document.createElement("li");
    lli.innerHTML = "<a href=\"javascript:menu_progressbars()\">"+
      "Show/Hide Bars</a>";
    opt.appendChild(lli);
  }

  if (hp != -1 && maxhp != -1) {
    var perc = (hp*100/maxhp);
    var percred = (perc <= 50 ? 100 : (100-perc)*2);
    var percgreen = (perc >= 50 ? 100 : perc*2);
    var col = "#" + hex_perc(percred) + hex_perc(percgreen) + "00";
    decaf.ui.setProgressColor("Hp", col);
    decaf.ui.setProgress('Hp', perc, "" + hp + " (" + maxhp + ")");
  }
  if (gp != -1 && maxgp != -1)
    decaf.ui.setProgress('Gp', (gp*100/maxgp), "" + gp + " (" + maxgp + ")");
  if (bdn != -1)
    decaf.ui.setProgress('Bdn', bdn, "" + bdn + "%");
  xpspan.innerHTML = xp;
}

/********** ZMP ACTION: room.map **********/

function show_map(value) {
  if (value.length == 0) return;
  var mmap = value[0];

  if (!showmap) {
    toggle_map(true);
    // set up standard data
    var opt = document.getElementById("submenu_options");
    var lli = document.createElement("li");
    lli.id = "submenu_options_map";
    lli.innerHTML = "<a href=\"javascript:menu_map()\">"+
      "Hide Map</a>";
    opt.appendChild(lli);
  }

  mmap = htmlify(mmap);

  decaf.ui.mapdiv.innerHTML =
    "<hr><i>Map:</i><center>" + mmap + "</center>";
}

function htmlify(txt) {
  // basic stuff
  txt = txt.replace(/&/g,'&amp;').replace(/>/g,'&gt;').replace(/</g,'&lt;').replace(/\n/g,'<br>').replace(/ /g,'&nbsp;');
  
  // the rest of the work is getting the colour codes right!
  var colour = new Array();
  colour[0] = 7;
  colour[1] = 0;
  colour[2] = false;
  var ret = "";
  var sequence = DecafMUD.ESC + "[";

  var ind = txt.indexOf(sequence);
  while (ind != -1) {
    if (ind != 0) {
      ret += "<span class=\"" + get_span(colour) + "\">";
      ret += txt.substr(0,ind);
      ret += "</span>";
    }
    txt = txt.substring(ind+2);
    var m = txt.indexOf("m");
    if (m == -1) return ret;
    var code = txt.substring(0,m);
    parse_codes(code, colour);
    txt = txt.substring(m+1);
    ind = txt.indexOf(sequence);
  }
  if (txt != "") {
    ret += "<span class=\"" + get_span(colour) + "\">";
    ret += txt;
    ret += "</span>";
  }
  return ret;
}

function get_span(colourcodes) {
  if (colourcodes[2]) span = "c" + (colourcodes[0]+8);
  else span = "c" + colourcodes[0];
  if (colourcodes[1] != 0) span += " b" + colourcodes[1];
  return span;
}

function parse_codes(code, colour) {
  var k = code.indexOf(';');
  if (k != -1) {
    parse_codes(code.substring(0,k), colour);
    parse_codes(code.substring(k+1), colour);
  }

  if (code == "0") {
    colour[0] = 7; colour[1] = 0; colour[2] = false; return;
  }
  if (code == "1") {colour[2] = true; return}

  if (code.length != 2) return;
  if (code == "39") colour[0] = 7;
  else if (code.charAt(0) == '3') colour[0] = parseInt(code.charAt(1));
  if (code == "49") colour[1] = 0;
  else if (code.charAt(0) == '4') colour[1] = parseInt(code.charAt(1));
}

/********** ZMP ACTION: lpc.edit **********/

function init_edit(fname) {
  decaf.zmp.sendZMP("lpc.getfile", fname);
}

/********** ZMP ACTION: lpc.file *********/

var editing;

function edit_file(txt) {
  var fname = txt[0]
  var contents = txt[1];

  if (editing != undefined) {
    alert("Trying to edit " + fname + " failed, because you are " +
      "already editing " + editing + ".");
    return;
  }
  editing = fname;
  
  var savebtn = decaf.ui.createButton("Save File", "save_lpc_file()");
  var cancelbtn = decaf.ui.createButton("Close Editor", "cancel_lpc_file()");
  var textarea = open_editor("Editing " + editing, [savebtn,cancelbtn]);
  textarea.value = contents;
}

function saved_file(path) {
  alert("File " + editing + " succesfully saved.");
}

function save_lpc_file() {
  var text = document.getElementById("editor").value;
  decaf.zmp.sendChunked("lpc.writefile", [editing, text]);
}

function cancel_lpc_file() {
  close_popup();
  editing = undefined;
}

