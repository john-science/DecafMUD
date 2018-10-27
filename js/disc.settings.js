/**
 * This file has functionality to change DecafMud settings.
 */

var fontpercentage = 100;
var fkeymacros = true;
var numpadwalking = true;

var showprogressbars = false;
var showmap = 0;  // don't show until something is sent

function set_fontsize(k) {
  fontpercentage = k;
  decaf.ui.el_display.style.fontSize = (k*110/100) + "%";
}

function get_fontsize() {
  return fontpercentage;
}

function fkeys_enabled() {
  return fkeymacros;
}

function toggle_fkeys(value) {
  fkeymacros = value;
}

function numpad_enabled() {
  return numpadwalking;
}

function toggle_numpad(value) {
  numpadwalking = value;
}

function progress_visible() {
  return showprogressbars;
}

function map_visible() {
  return showmap == 1;
}

function toggle_progressbars(value) {
  showprogressbars = value;
  if (value) {
    decaf.ui.showSidebar();
    decaf.ui.showProgressBars();
  }
  else {
    decaf.ui.hideProgressBars();
    if (showmap != 1) decaf.ui.hideSidebar();
  }
}

function toggle_map(value) {
  if (value) showmap = 1; // show it
  else showmap = -1; // never show it
  if (value) decaf.ui.showMap();
  else decaf.ui.hideMap();
  if (!value && !showprogressbars) decaf.ui.hideSidebar();
  else decaf.ui.showSidebar();
}

