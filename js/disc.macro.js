/**
 * This file defines a number of standard macros.
 */

function tryMacro(keycode) {
  // f-key macros
  if (112 <= keycode && keycode <= 121 && fkeys_enabled()) {
    var cmd = "f" + (keycode-111);
    decaf.sendInput(cmd);
    return 1;
  }

  // numpad walking
  if (96 <= keycode && keycode <= 105 && numpad_enabled()) {
    if (keycode ==  96) decaf.sendInput("score");
    if (keycode ==  97) decaf.sendInput("southwest");
    if (keycode ==  98) decaf.sendInput("south");
    if (keycode ==  99) decaf.sendInput("southeast");
    if (keycode == 100) decaf.sendInput("west");
    if (keycode == 101) decaf.sendInput("look");
    if (keycode == 102) decaf.sendInput("east");
    if (keycode == 103) decaf.sendInput("northwest");
    if (keycode == 104) decaf.sendInput("north");
    if (keycode == 105) decaf.sendInput("northeast");
    return 1;
  }

  // don't allow the tab key to do anything!
  if (keycode == 9) return 1;

  // anything else (not handled)
  return 0;
}

