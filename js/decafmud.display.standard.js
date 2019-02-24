/**
 * @fileOverview DecafMUD Display Provider: Standard
 */

(function(DecafMUD) {

var addEvent = function(node, etype, func) {
		if ( node.addEventListener ) {
			node.addEventListener(etype, func, false); return; }
		
		// Add on to it.
		etype = 'on' + etype;
		
		if ( node.attachEvent ) {
			node.attachEvent(etype, func); }
		else {
			node[etype] = func; }
	},
	delEvent = function(node, etype, func) {
		if ( node.removeEventListener ) {
			node.removeEventListener(etype, func, false); }
	};

/** This is the standard display handler for DecafMUD, and should generally be
 *  good enough for just about anything you'd need to do. It has support for
 *  many ANSI sequences, XTERM-style 256 colors, MXP, multiple output panes,
 *  and limiting available scrollback for performance reasons.
 *
 * @example
 * var ESC = "\x1B";
 * decaf.display.handleData(ESC + "[0m"); // Reset the ANSI SGR Settings
 *
 * @name Display
 * @class DecafMUD Display Provider: Standard
 * @exports Display as DecafMUD.plugins.Display.standard
 */
var Display = function(decaf, ui, disp) {
	// Store DecafMUD, the Interface, and the Display element.
	this.decaf		= decaf;
	this.ui			= ui;
	this._display	= disp;
	
	// Create an element for the display.
	this.display	= document.createElement('div');
	this.display.id = 'mud-display';
	this.display.className = 'decafmud display ' + this.decaf.options.set_display.fgclass + '7';
	this._display.appendChild(this.display);

	// Attach the scroll event.
	var d = this;
	addEvent(this._display, 'scroll', function(e){d.onScroll()});
	
	// Attach an event for detecting middle-clicks.
	addEvent(this._display, 'mousedown', function(e){
		if ( e.which == 1 && open_menu !== -1 ) { close_menus(); }
		if ( e.which !== 2 || !d.decaf.store.get('ui/middle-click-scroll',false) ) { return; }
		d.scroll();
		if ( e.cancelBubble ) { e.cancelBubble = true; }
		e.preventDefault();
	});
	
	// Any HTML currently within the display is our splash text.
	this.splash		= this.display.innerHTML;
	this.orig_title	= null;
	
	// Clear the display, initializing the default state as well.
	this.clear();
	
	// Display the DecafMUD banner.
	this.message('<br>DecafMUD v' + DecafMUD.version + '<br>');
	if ( this.splash.length > 0 ) {
		this.message(this.splash + '<br>'); }
};

// Flags
var BRIGHT		= parseInt('00000001',2),
	NEGATIVE	= parseInt('00000010',2),
	ITALIC		= parseInt('00000100',2),
	BLINK		= parseInt('00001000',2),
	UNDERLINE	= parseInt('00010000',2),
	FAINT		= parseInt('00100000',2),
	STRIKE		= parseInt('01000000',2),
	DBLUNDER	= parseInt('10000000',2);

// Defaults
Display.prototype.state	= 0;
Display.prototype.c_fg	= 7;
Display.prototype.c_bg	= 0;
Display.prototype.c_fnt	= 0;
Display.prototype.readyClear = false;
Display.prototype.endSpace = false;
Display.prototype.scrollTime = null;
Display.prototype.willScroll = false;
Display.prototype.mxp = false;
Display.prototype.triggers = JSON.parse(localStorage.getItem('triggers')) || [];
Display.prototype.triggerSounds = {};

// Clear the display.
Display.prototype.clear = function() {
	clearTimeout(this.scrollTime);
	this.display.innerHTML = '';
	this.reset();
	
	this.inbuf = [];
	this.outbuf = [];
}

// Reset the display.
Display.prototype.reset = function() {
	this.state	= 0;
	this.c_fg	= 7;
	this.c_bg	= 0;
	this.c_fnt	= 0;
	this.readyClear = false;
	this.endSpace = false;
}

// Get the scrollbar width.
Display.prototype.sbw = undefined;
Display.prototype.scrollbarWidth = function() {
	if ( this.sbw ) { return this.sbw; }
	
	// Can we do this the easy way?
	var old = this._display.style.overflowY;
	this._display.style.overflowY = 'scroll';
	if ( this._display.offsetWidth > this._display.clientWidth ) {
		this.sbw = this._display.offsetWidth - this._display.clientWidth
		return this.sbw;
	}
	this._display.style.overflowY = old;
	
	// Assume 15 if we can't guess it.
	return 15;
}

// Get the size for TELOPT_NAWS
Display.prototype.cz = undefined;
Display.prototype.charSize = function() {
	if ( this.cz ) { return this.cz; }
	// Get the size of a single character.
	var span = document.createElement('span');
	span.innerHTML = 'W';
	this.display.appendChild(span);
	var w = span.offsetWidth, h = span.offsetHeight;
	this.display.removeChild(span);
	this.cz = [w,h];
	return this.cz;
}

Display.prototype.getSize = function() {
	// Get the inner height and width of the main display.
	var sbw;
	if ( this.decaf.options.set_display.scrollbarwidth ) {
		sbw = this.decaf.options.set_display.scrollbarwidth;
	} else { sbw = this.scrollbarWidth(); }
	
	var tw = this._display.clientWidth - sbw,
		th = this._display.clientHeight,
		sz = this.charSize();
	
	var w = sz[0], h = sz[1];
	return [ Math.floor(tw/w) + 1, Math.floor(th/h) ];
};

///////////////////////////////////////////////////////////////////////////////
// Trigger Functionality
///////////////////////////////////////////////////////////////////////////////

/** Just a getter for trigger phrases */
Display.prototype.getTriggers = function() {
	var self = this;
	return self.triggers;
};

/** Helper to add trigger: check that it doesn't already exist */
Display.prototype.already_in_triggers = function(phraz) {
	var self = this;
	for (i=0; i < self.triggers.length; i++) {
		if (phraz == self.triggers[i][0]) {
			return true;
		}
	}
	return false;
};

/** Helper to add trigger: Ensuring we don't stomp on HTML */
Display.prototype.looks_like_html = function(s) {
	return ["NBSP", "SPA", "SPAN", "ASS", "LASS", "CLASS", "HTML"].indexOf(s) > -1;
};

/** Not a full setter, just addig a single phraz to the trigger list */
Display.prototype.addTrigger = function(new_phrase, color, sound) {
	var self = this;
	var add_error = "";

	var phrase = new_phrase.trim().toUpperCase();

	if (phrase.length < 3) {
		add_error = "Too Short: need length > 2";
	} else if (self.already_in_triggers(phrase)) {
		add_error = "Trigger already exists";
	} else if (phrase.indexOf("<") > -1 || phrase.indexOf("<") > -1 || phrase.indexOf('"') > -1) {
		add_error = 'Forbidden Symbols: <, >, "';
	} else if (self.looks_like_html(phrase)) {
		add_error = "HTML codes don't work";
	} else {
		self.triggers.push([phrase, color, sound]);
		localStorage.setItem('triggers', JSON.stringify(self.triggers));
	}

	return add_error;
};

/** Remove a trigger from this class object and localStorage */
Display.prototype.remove_trigger = function(word) {
	var self = this;
	var new_triggers = [];
	for (i = 0; i < self.triggers.length; i++) {
		if (self.triggers[i][0] !== word) {
			new_triggers.push(self.triggers[i]);
		}
	}
	self.triggers = new_triggers;
	localStorage.setItem('triggers', JSON.stringify(self.triggers));
};

/** Add a tool to escape all RegEx from a string,
essentially just leave the string alone. */
RegExp.escape = function(s) {
	return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
};

Display.prototype.playTriggerSound = function(soundName) {
	var self = this;
	/** The user may not want to play a sound. */
	if (soundName === "no_sound") {return;}

	/** Play a sound. Load it if you haven't already. */
	if (!(soundName in self.triggerSounds)) {
		self.triggerSounds[soundName] = new Audio("resources/" + soundName + ".wav");
	}
	self.triggerSounds[soundName].play();
}

/** Wrap any highlightable words in custom CSS.
 @param {String} data The data to be displayed. */
Display.prototype.handleHighlighting = function(data) {
	var self = this;
	var new_data = "";
	for (i = 0; i < self.triggers.length; i++) {
		new_data = data.replace(new RegExp(RegExp.escape(self.triggers[i][0]), 'gi'), '<span class="' + self.triggers[i][1] + '">' + self.triggers[i][0] + '</span>');
		if (new_data.length > data.length) {
			var soundName = self.triggers[i][2];
			self.playTriggerSound(soundName);
		}
		data = new_data;
	}
	return data;
};


///////////////////////////////////////////////////////////////////////////////
// Data Processing
///////////////////////////////////////////////////////////////////////////////

/** Process recieved data.
 @param {String} data The data to be displayed. */
Display.prototype.handleData = function(data) {
	// Add this to the buffer, and process it.
	this.inbuf.push(data);
	this.processData();
};

Display.prototype.processData = function() {
	// If we don't have any data, quit.
	if ( this.inbuf.length < 1 ) { return; }
	
	// Convert the data to a string.
	var data = this.inbuf.join('');
	this.inbuf = [];
	
	// Cache variables, because the stack is evil.
	var ESC = '```1`1212';
	var ESC = DecafMUD.ESC;//+'~';
	
	var splitter = /\x1B/;
	
	// Loop through the string.
	while ( data.length > 0 ) {
		// Find the first important character
		var ind = data.indexOf(ESC); //data.search(splitter); //indexOf(ESC);
		
		// If we don't have an important character, break.
		if ( ind === -1 ) {
			this.outbuf.push(data.replace(/</g,'&lt;'));
			break;
		}
		
		// Push the pre-sequence text (if any) to the output buffer.
		if ( ind > 0 ) {
			// Reset readyClear if ind isn't 0.
			this.readyClear = false;
			this.outbuf.push(data.substr(0, ind).replace(/</g,'&lt;'));
			data = data.substr(ind);
		}
		
		// Handle the ANSI code. If readANSI returns false, we don't have the
		// whole code yet, so push the remaining data back on the input buffer
		// and break
		var out = this.readANSI(data);
		if ( out === false ) {
			this.inbuf.push(data);
			break;
		}
		
		//this.outbuf.push(data.substr(0,data.length-out.length));
		
		data = out;
	}
	
	// Push the output buffer to the display, first handle any highlighting that is needed
	var data = this.handleHighlighting(this.outbuf.join(''));
	this.outbuf = [];
	this.outColor(false);
	
	this.needline = !data.endsWith('\n');
	
	// Set ARIA busy.
	this._display.setAttribute('aria-busy',true);
	
	var span = document.createElement('span');

	span.innerHTML = data.replace(/\n/g,'<br>').replace(/> /g,'>&nbsp;').replace(/ ( +)/g, function(m) { if (m.length ===2){return ' &nbsp;';} return ' ' + new Array(m.length-1).join('&nbsp;') + ' '; });
	this.shouldScroll();
	this.display.appendChild(span);
	this.doScroll();
}

/** Read an ANSI sequence from the provided data and handle it, then return the
 *  remaining text. If the sequence is not complete, then return false.
 * @param {String} data The data to read an ANSI sequence from.
 * @returns {String|boolean} A string if an ANSI sequence has been read
 *	successfully, else the boolean false. */
Display.prototype.readANSI = function(data) {
	if ( data.length < 2 ) { return false; }
	
	// If the second character is '[', read until the next letter.
	if ( data.charAt(1) == '[' ) {
		var ind = data.substr(2).search(/[\x40-\x7E]/);
		if ( ind === -1 ) { return false; }
		ind += 2;
		this.handleAnsiCSI(data.substr(2, ind-1));
		return data.substr(ind+1);
	}
	
	// If the second character is ']', read until either a BEL or a 'ESC\'.
	else if ( data.charAt(1) == ']' ) {
		var ind = data.substr(2).indexOf(DecafMUD.BEL);
		var in2 = data.substr(2).indexOf(DecafMUD.ESC + '\\');
		if ( in2 < ind || ind === -1 ) { ind = in2; }
		if ( ind === -1 ) { return false; }
		ind += 2;
		// this.handleAnsiOSC(data.substr(2, ind-1));
		return data.substr(ind);// + 1);
	}
	
	// Just push the ESC off the stack since it's obviously bad.
	return data.substr(1);
}

/** Handle an ANSI CSI ( ESC[ ) sequence. This is for internal use only.
 * @param {String} seq The sequence to handle. */
Display.prototype.handleAnsiCSI = function(seq) {
	switch(seq.charAt(seq.length-1)) {
		// SGR (Select Graphic Rendition) is first because it's the most likely
		// to occur and we don't want to waste time comparing against other
		// possibilities first.
		case 'm': 
			var old = this.state, old_fg = this.c_fg, old_bg = this.c_bg,
				old_fnt = this.c_fnt;
			if ( seq.length === 1 ) { seq = '0m'; }
			var cs = seq.substr(0, seq.length-1).split(';');
			var l = cs.length;
			for(var i=0;i < l; i++) {
				var c = parseInt(cs[i]);
				if ( c === 38 ) { // XTERM Foreground Color
					i++;i++; if ( i >= l ) { break; }
					this.c_fg = parseInt(cs[i]); }
				else if ( c === 39 ) { // Default Color
					this.c_fg = 7; }
				else if ( c === 48 ) { // XTERM Background Color
					i++;i++; if ( i >= l ) { break; }
					this.c_bg = parseInt(cs[i]); }
				else if ( 29 < c && c < 38 ) { // Foreground Color
					this.c_fg = c - 30; continue; }
				else if ( 39 < c && c < 48 ) { // Background Color
					this.c_bg = c - 40; continue; }
				
				else if ( c === 0 ) { // Reset
					this.state = 0; this.c_fg = 7; this.c_bg = 0; this.c_fnt = 0; continue; }
				else if ( c === 1 ) { // Bright
					this.state |= BRIGHT; this.state &= ~FAINT; continue; }
				else if ( c === 2 ) { // Faint
					this.state &= ~BRIGHT; this.state |= FAINT; }
				else if ( c === 3 ) { // Italic
					this.state |= ITALIC; }
				else if ( c === 4 ) { // Under
					this.state |= UNDERLINE; this.state &= ~DBLUNDER; }
				else if ( c < 7   ) { // Blink
					this.state |= BLINK; }
				else if ( c === 7 ) { // Negative
					this.state |= NEGATIVE; }
				else if ( c === 8 ) { continue; } // Conceal Not Supported
				else if ( c === 9 ) { // Strike
					this.state |= STRIKE; }
				else if ( c < 20 ) { // Font
					this.c_fnt = c - 10; }
				else if ( c === 21 ) { // Double Underline
					this.state |= DBLUNDER; this.state &= ~UNDERLINE; }
				else if ( c === 22 ) { // Normal Intensity
					this.state &= ~(BRIGHT | FAINT); }
				else if ( c === 23 ) { // Italic: Off
					this.state &= ~ITALIC; }
				else if ( c === 24 ) { // Underline: Off
					this.state &= ~(UNDERLINE | DBLUNDER); }
				else if ( c === 25 ) { // Blink: Off
					this.state &= ~BLINK; }
				else if ( c === 27 ) { // Negative: Off
					this.state &= ~NEGATIVE; }
				else if ( c === 29 ) { // Strike: Off
					this.state &= ~STRIKE; }
				else if ( c === 49 ) { // Default Back Color
					this.c_bg = 0; }
				else if ( 89 < c && c < 98 ) { // Bright Foreground Color
					this.state |= BRIGHT; this.state &= ~FAINT;
					this.c_fg = c - 90; }
				else if ( 99 < c && c < 108 ) { // Bright Background Color
					this.c_bg = c - 92; }
			}
			
			// Do we need a fresh tag?
			if ( this.state !== old || old_fg !== this.c_fg || old_bg !== this.c_bg || old_fnt !== this.c_fnt ) {
				this.outColor(); }
			this.readyClear = false;
			return;
		
		case '@': // Insert Characters
		case 'C': // Move Cursor Ahead
			var count = 1;
			if ( seq.length > 1 ) {
				count = parseInt(seq.substr(0, seq.length - 1)); }
			this.outbuf.push(new Array(count+1).join(' '));
			this.readyClear = false;
			return;
		
		case 'H':
			if ( seq.length === 1 ) { this.readyClear = true; }
			return;
		
		case 'J': // Clear Screen
			if ( this.readyClear || ( seq.length > 1 && seq.charAt(0) !== '0' ) ) {
				this.clear(); }
			this.readyClear = false;
			return;
	}
	
	this.decaf.debugString('Unhandled ANSI Sequence: ESC [' + seq);
}

///////////////////////////////////////////////////////////////////////////////
// Output
///////////////////////////////////////////////////////////////////////////////

/** Write a formatting tag to the buffer. */
Display.prototype.outColor = function(closing, ret) {
	var f = this.c_fg, b = this.c_bg, s = this.state, out,
		opt = this.decaf.options.set_display;
	
	if ( s & BRIGHT && f < 8 ) { f += 8; }
	
	out = ( closing !== false ? '</span>' : '' ) + '<span class="';
	
	if ( s & ITALIC		) { out += 'italic '; }
	if ( s & BLINK		) { out += 'blink '; }
	if ( s & UNDERLINE	) { out += 'underline '; }
	if ( s & DBLUNDER	) { out += 'doubleunderline '; }
	if ( s & FAINT		) { out += 'faint '; }
	if ( s & STRIKE		) { out += 'strike '; }
	if ( s & NEGATIVE	) { b = f; f = this.c_bg; }
	
	if ( this.c_fnt !== 0 ) { out += opt.fntclass + this.c_fnt + ' '; }
	if ( f !== 7 ) { out += opt.fgclass + f + ' '; }
	if ( b !== 0 ) { out += opt.bgclass + b; }
	out += '">';
	
	if ( ret === true ) { return out; }
	this.outbuf.push(out);
}

/** Append a message to the display's output. This is always displayed on a new
 *  line with a special class to allow for highlighting.
 * @param {String} text	  The text to display.
 * @param {String} className The class name for the message's container.
 * @param {boolean} needLine If this is false, the message won't be forced onto
 *	a new line. */
Display.prototype.message = function(text, className, needLine) {
	if ( className === undefined ) { className = 'message'; }
	var span = document.createElement('span');
	if ( this.needline && ( needLine !== false ) ) { span.innerHTML = '<br>'; }
	this.needline = false;
	span.innerHTML += text + '<br>';
	this.shouldScroll();
	this.display.appendChild(span);
	this.doScroll();
}

/** Determine if we should be scrolling to the bottom of the output, and do so
    after a short delay if we should. Otherwise, display an element letting the
	user know they have have content to read if they scroll down. */
Display.prototype.shouldScroll = function(addTarget) {
	if ( this.willScroll !== undefined || this._display.style.overflowY === 'hidden' ) { return; }
	this.willScroll = this._display.scrollTop >= (this._display.scrollHeight - this._display.offsetHeight);
	
	// If we aren't scrolling, and the element isn't there, add our scroll helper.
	if ( addTarget !== false && this.willScroll === false && !this.scrollTarget) {
		var st = document.createElement('hr');
		st.className = 'scroll-point';
		this.scrollTarget = st;
		this.display.appendChild(st);
		
		if ( this.ui && this.ui.showScrollButton ) {
			this.ui.showScrollButton(); }
	}
}

/** Scroll the pane, if we should. */
Display.prototype.doScroll = function() {
	var d = this;
	clearTimeout(this.scrollTime);
	if ( this.willScroll ) {
		this.scrollTime = setTimeout(function(){
			if ( d.scrollTarget ) {
				d.scrollTarget.parentNode.removeChild(d.scrollTarget);
				d.scrollTarget = undefined; }
			d._display.setAttribute('aria-busy',false);
			d.scroll();
			d.willScroll = undefined;
		},5);
	} else {
		this.scrollTime = setTimeout(function(){
			d._display.setAttribute('aria-busy',false);
			d.willScroll = undefined;
		},5);
	}
}

/** Scroll to the start of new content, as marked by scrollTarget. */
Display.prototype.scrollNew = function() {
	if (! this.scrollTarget ) { return; }
	var to = this.scrollTarget.offsetTop;
	if ( to > this._display.scrollTop ) {
		// Scroll to new.
		this._display.scrollTop = to;
	} else {
		// Scroll to end.
		this.scroll();
	}
}

/** Scroll to the bottom of the available output. Internal use. */
Display.prototype.scroll = function() {
	if ( this._display.style.overflowY === 'hidden' ) { return; }
	this._display.scrollTop = this._display.scrollHeight; }

/** If we've scrolled to the end, kill the scroll helper. */
Display.prototype.onScroll = function() {
	if ( this.scrollTarget === undefined ) { return; }
	if (!(this._display.scrollTop >= (this._display.scrollHeight - this._display.offsetHeight))) {
		return; }
	
	if ( this.scrollTarget ) {
		this.scrollTarget.parentNode.removeChild(this.scrollTarget);
		this.scrollTarget = undefined; }
	
	if ( this.ui && this.ui.hideScrollButton ) {
		this.ui.hideScrollButton(); }
}

/** Scroll up a page. */
Display.prototype.scrollUp = function() {
	var top = this._display.scrollTop - this._display.clientHeight * 0.9;
	if ( top < 0 ) { top = 0; }
	this._display.scrollTop = top;
}

/** Scroll down a page. */
Display.prototype.scrollDown = function() {
	var top = this._display.scrollTop + this._display.clientHeight * 0.9;
	this._display.scrollTop = top;
}
	
///////////////////////////////////////////////////////////////////////////////
// MXP Specific Code
///////////////////////////////////////////////////////////////////////////////

// Build a massive array of MXP tags.
Display.prototype.tags = {
	'VAR'		: {
		'default'	: true,
		'secure'	: true,
		'want'		: true,
		'open_tag'	: '',
		'close_tag'	: '',
		'arg_order'	: ['name','desc','private','publish','delete','add','remove'],
		'arguments'	: {
			'name'		: '',
			'desc'		: '',
			'private'	: false,
			'publish'	: true,
			'delete'	: false,
			'add'		: true,
			'remove'	: false },
		'handler'	: function() { }
	},
	
	'B'			: {
		'default'	: true,
		'secure'	: false,
		'want'		: false,
		'open_tag'	: '<b class="mxp">',
		'close_tag'	: '</b>'
	},
	'BOLD'		: 'B',
	'STRONG'	: 'B',
	
	'I'			: {
		'default'	: true,
		'secure'	: false,
		'want'		: false,
		'open_tag'	: '<i class="mxp">',
		'close_tag'	: '</i>'
	},
	'ITALIC'	: 'I',
	'EM'		: 'I',
	
	'U'			: {
		'default'	: true,
		'secure'	: false,
		'want'		: false,
		'open_tag'	: '<u class="mxp">',
		'close_tag'	: '</u>'
	},
	'UNDERLINE'	: 'U',
	
	'S'			: {
		'default'	: true,
		'secure'	: false,
		'want'		: false,
		'open_tag'	: '<s class="mxp">',
		'close_tag'	: '</s>'
	},
	'STRIKEOUT'	: 'S',
	
	'COLOR'		: {
		'default'	: true,
		'secure'	: false,
		'want'		: false,
		'open_tag'	: '<span class="mxp mxp-color" style="color:&fore;;background-color:&back;">',
		'close_tag'	: '</span>',
		'arg_order'	: ['fore','back'],
		'arguments'	: {
			'fore'		: 'inherit',
			'back'		: 'inherit'
		}
	},
	'C'			: 'COLOR',
	
	'HIGH'		: {
		'default'	: true,
		'secure'	: false,
		'want'		: true
	}
}


// Expose the display to DecafMUD
DecafMUD.plugins.Display.standard = Display;
})(DecafMUD);
