/*!
 * DecafMUD v0.9.0
 * http://decafmud.kicks-ass.net
 *
 * Copyright 2010, Stendec <stendec365@gmail.com>
 * Licensed under the MIT license.
 */

/**
 * @fileOverview DecafMUD Storage Provider: Standard
 * @author Stendec <stendec365@gmail.com>
 * @version 0.9.0
 */

(function(DecafMUD) {

/** <p>This is a storage provider for DecafMUD that users localStorage to provide
 *  storage for the client that persists across browser sessions.</p>
 *  <p>Alternatively, if this is called on an instance of itself, it can be used
 *  to make sub-objects for plugin-specific setting separation. That's done
 *  internally though.</p>
 * @name Storage
 * @class DecafMUD Storage Provider: Standard
 * @exports Storage as DecafMUD.plugins.Storage.standard
 * @param {DecafMUD} decaf The instance of DecafMUD using this plugin instance. */
var Storage = function(decaf,path) {
	// Handle the path. It defaults to '/' if we don't have any other name.
	if ( path === undefined ) { path = ''; }
	this.path = path+'/';
	
	// Were we handed a Storage?
	if ( decaf instanceof Storage ) {
		// Get Decaf from our parent.
		this.decaf = decaf.decaf;
		
		// Also push this onto our parent while we're at it.
		decaf.children.push(this);
	} else {
		// decaf is Decaf. Store it.
		this.decaf = decaf;
	}
	
	// Make a list for storing children.
	this.children = [];
	
	// Ensure that we have localStorage
	if ( ! 'localStorage' in window ) {
		throw "This storage backend can only be used in browsers supporting localStorage."; }
	
	return this;
}

/** Get a value from storage.
 * @param {String} key The key of the item to get.
 * @param {any} [def] The default value. */
Storage.prototype.get = function(key, def) {
	var val = window.localStorage[this.path+key];
	if ( val === undefined || val === null ) { return def; }
	return JSON.parse(val);
}

/** Set a value to storage.
 * @param {String} key The key of the item to set.
 * @param {any} val The value to set it to. */
Storage.prototype.set = function(key, val) {
	if (typeof val === "string") { val = '"'+val+'"'; }
	else { val = JSON.stringify(val); }
	window.localStorage[this.path+key] = val;
}

/** Delete a value in storage.
 * @param {String} key The key of the item to delete. */
Storage.prototype.del = function(key) {
	return delete window.localStorage[this.path+key]; }

/** Get a sub-storage instance for plugins to use.
 * @param {String} name The name of the plugin, for path purposes. */
Storage.prototype.sub = function(name) {
	return new Storage(this, this.path+name); }

/** Get a list of keys at this path. We generally want to avoid this as it's
 *  not the most efficient operation...
 * @returns {Array} A list of all the keys. */
Storage.prototype.keys = function() {
	var out = [], wl = window.localStorage.length, p = this.path;
	for(var i=0;i<wl;i++) {
		var k = window.localStorage.key(i);
		if ( k.indexOf(p) === -1 ) { continue; }
		
		out.push(k.substr(p.length));
	}
	return out;
}
	
/** Change the path of a storage instance, recursively changing all its children
 *  as well.
 * @param {String} path The new path to change it to. */
Storage.prototype.change = function(path) {
	var old = this.path, l = this.children.length;
	this.path = path + '/';
	
	for(var i=0;i<l;i++) {
		// Change the child's path.
		var nw = this.path + this.children[i].path.substr(old.length);
		nw = nw.substr(0, nw.length-1);
		this.children[i].change(nw);
	}
}
	
// Expose this to DecafMUD
DecafMUD.plugins.Storage.standard = Storage;
})(DecafMUD);
