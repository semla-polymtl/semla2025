/**
 * Available spaces:
 *
 * _window.$ush - US Helper Library
 */
! function( $, _undefined ) {
	var _window = window;

	// Check for is set availability objects
	_window.$ush = _window.$ush || {};

	/**
	 * @type {RegExp} Regular expression for find space.
	 */
	const _REGEXP_SPACE_ = /\p{Zs}/u;

	/**
	 * @type {{}} Private storage of all data objects
	 */
	var _$$cache = {};

	/**
	 * @class Data storage
	 * @param {String} namespace
	 */
	var Data = function( namespace ) {
		self = this;
		// Variables
		self._$data = {}; // the data storage location
		self._namespace = namespace; // the namespace the class belongs to
	};

	/**
	 * @type {Prototype}
	 */
	dataPrototype = Data.prototype;

	/**
	 * Determines if empty data
	 *
	 * @return {Boolean} True if empty, False otherwise
	 */
	dataPrototype.isEmpty = function() {
		return $.isEmptyObject( this._$data );
	};

	/**
	 * Check for the presence of a key in the data
	 *
	 * @param {String} key Unique key for data
	 * @return {Boolean} Returns True if the entry exists, False otherwise
	 */
	dataPrototype.has = function( key ) {
		return ! $ush.isUndefined( this._$data[ key ] );
	};

	/**
	 * Get data from cache
	 *
	 * @param {String} key Unique key for data
	 * @param {Function|Mixed} value The value to be set if there is no value
	 * @return {*} Returns values from cache or `undefined`
	 */
	dataPrototype.get = function( key, value ) {
		var self = this;
		if ( ! self.has( key ) ) {
			// Get default data from a callback function
			if ( typeof value === 'function' ) {
				value = value.call( self );
			}
			if ( arguments.length === 2 ) {
				self._$data[ key ] = value;
			}
		}
		return self._$data[ key ];
	};

	/**
	 * Set data from cache
	 *
	 * @param {String|{}} args[0] Unique key or data object
	 * @param {Function|Mixed} value The value to be stored in the cache
	 * @return self
	 */
	dataPrototype.set = function() {
		var self = this,
			values = {},
			args = $ush.toArray( arguments );
		// Get values
		if ( args.length == 2 && typeof args[ /* key */0 ] === 'string' ) {
			values[ args[ /* key */0 ] ] = args[ /* value */1 ];
		} else if ( $.isPlainObject( args[ /* data */0 ] ) ) {
			values = args[ /* plain object */0 ];
		}
		$.extend( self._$data, values ); // merge values
		return self;
	};

	/**
	 * Get data object
	 *
	 * @return {{}} Returns the data object
	 */
	dataPrototype.data = function() {
		return this._$data; // Note: It is important to keep a reference to the data object!
	};

	/**
	 * Remove data by key
	 *
	 * @param {String} key Unique key for data
	 * @return self
	 */
	dataPrototype.remove = function( key ) {
		var self = this,
			args = $ush.toArray( arguments );
		for ( var i in args ) {
			if ( self.has( args[ i ] ) ) {
				delete self._$data[ args[ i ] ];
			}
		}
		return self;
	};

	/**
	 * Flushes an instance from global storage
	 */
	dataPrototype.flush = function() {
		var self = this;
		if ( ! $ush.isUndefined( _$$cache[ self._namespace ] ) ) {
			delete _$$cache[ self._namespace ];
		}
	};

	/**
	 * @type {{}} Auxiliary functions for the builder and his components
	 */
	$usbcore = {};

	/**
	 * Get difference between two objects
	 *
	 * @param {{}} objectA The object A [checked object]
	 * @param {{}} objectB The object B
	 * @return {{}} Returns the difference between two objects
	 */
	$usbcore.diffPlainObject = function( objectA, objectB ) {
		var self = this, result = {};
		if ( $ush.comparePlainObject( objectA, objectB ) ) {
			return result;
		}
		for ( var k in objectA ) {
			if ( $.isPlainObject( objectA[ k ] ) ) {
				var diff = self.diffPlainObject( objectA[ k ], $.isPlainObject( objectB[ k ] ) ? objectB[ k ] : {} );
				if ( ! $.isEmptyObject( diff ) ) {
					result[ k ] = diff;
				}
			} else if (
				$ush.isUndefined( objectB[ k ] )
				|| objectA[ k ] !== objectB[ k ]
			) {
				result[ k ] = objectA[ k ];
			}
		}
		return $.isEmptyObject( result ) ? result : $ush.clone( result );
	};

	/**
	 * Removing passed properties from an object
	 *
	 * @param {{}} data The input data
	 * @param {String|[]} props The property or properties to remove
	 * @return {{}} Returns a cleaned up new object
	 */
	$usbcore.clearPlainObject = function( data, props ) {
		var self = this;
		if ( ! $.isPlainObject( data ) ) {
			data = {};
		}
		if ( $ush.isUndefined( props ) ) {
			return data;
		}
		// Props to a single type
		if ( ! Array.isArray( props ) ) {
			props = [ '' + props ];
		}
		// Clone data to get rid of object references
		data = $ush.clone( data );
		// Remove all specified properties from an object
		for ( var k in props ) {
			var prop = props[ k ];
			if ( ! data.hasOwnProperty( prop ) ) {
				continue;
			}
			delete data[ prop ];
		}
		return data;
	}

	/**
	 * Find a value in data
	 *
	 * @param {String} value The value to be found.
	 * @param {{}|[]} data The object to check example: {one:'one',two:'two'}`, `['one','two']`
	 * @return {Boolean} Returns the index of the value on success, otherwise -1
	 */
	$usbcore.indexOf = function( value, data ) {
		var self = this;
		if ( $.isPlainObject( data ) ) {
			data = Object.values( data );
		}
		if ( Array.isArray( data ) ) {
			return data.indexOf( typeof value === 'number' ? value : '' + value );
		}
		return -1;
	};

	/**
	 * Deep search for a value along a path in a simple object
	 *
	 * @param {{}} dataObject Simple data object for search
	 * @param {String} path Dot-delimited path to get value from object
	 * @param {*} defaultValue Default value when no result
	 * @return {*}
	 */
	$usbcore.deepFind = function( dataObject, path, defaultValue ) {
		var self = this;
		// Remove all characters except the specified ones
		// Note: Some shortcodes use `-` as separator, example: `[us-name...][us_name...]`
		path = ( '' + path )
			.replace( /[^A-z\d\-\_\.]/g, '' )
			.trim();
		if ( ! path ) {
			return defaultValue;
		}
		// Get the path as an array of keys
		if ( path.indexOf( '.' ) > -1 ) {
			path = path.split( '.' ); // split string into array of paths
		} else {
			path = [ path ];
		}
		// Get the result based on an array of keys
		var result = ( typeof dataObject == 'object' ) ? dataObject : {};
		for ( k in path ) {
			result = result[ path[ k ] ];
			if ( $ush.isUndefined( result ) ) {
				return defaultValue;
			}
		}
		return result; // return the final result
	};

	/**
	 * Adds the specified class(es) to each element in the set of matched elements
	 *
	 * @param {Node} node The node from document
	 * @param {String} className One or more classes (separated by spaces) to be toggled for each element in the matched set
	 * @return self
	 */
	$usbcore.$addClass = function( node, className ) {
		var self = this;
		if ( $ush.isNode( node ) && className ) {
			node.classList.add( className );
		}
		return self;
	};

	/**
	 * Remove a single class or multiple classes from each element in the set of matched elements
	 *
	 * @param {Node} node The node from document
	 * @param {String} className One or more classes (separated by spaces) to be toggled for each element in the matched set
	 * @return self
	 */
	$usbcore.$removeClass = function( node, className ) {
		var self = this;
		if ( $ush.isNode( node ) && className ) {
			( '' + className ).split( _REGEXP_SPACE_ ).map( function( itemClassName ) {
				if ( ! itemClassName ) {
					return;
				}
				node.classList.remove( itemClassName );
			} );
		}
		return self;
	};

	/**
	 * Add or remove one or more classes from each element in the set of matched elements,
	 * depend on either the class's presence or the value of the state argument
	 *
	 * @param {Node} node The node from document
	 * @param {String} className One or more classes (separated by spaces) to be toggled for each element in the matched set
	 * @param {Boolean} state A boolean (not just truthy/falsy) value to determine whether the class should be added or removed
	 * @return self
	 */
	$usbcore.$toggleClass = function( node, className, state ) {
		var self = this;
		if ( $ush.isNode( node ) && className ) {
			self[ !! state ? '$addClass' : '$removeClass' ]( node, className );
		}
		return self;
	};

	/**
	 * Determine whether any of the matched elements are assigned the given class
	 *
	 * @param {Node} node The node from document
	 * @param {String} className The class name one or more separated by a space
	 * @return {Boolean} True, if there is at least one class, False otherwise
	 */
	$usbcore.$hasClass = function( node, className ) {
		var self = this;
		if ( $ush.isNode( node ) && className ) {
			var classList = ( '' + className ).split( _REGEXP_SPACE_ );
			for ( var i in classList ) {
				className = '' + classList[ i ];
				if ( ! className ) {
					continue;
				}
				// Note: node.className can be an object for SVG nodes
				if ( self.indexOf( className, ( '' + node.className ).split( _REGEXP_SPACE_ ) ) > -1 ) {
					return true;
				}
			}
		}
		return false;
	};

	/**
	 * Get or Set the attribute value for the passed node
	 *
	 * @param {Node} node The node from document
	 * @param {String} name The attribute name
	 * @param {String} value The value
	 * @return {*}
	 */
	$usbcore.$attr = function( node, name, value ) {
		var self = this;
		if ( ! $ush.isNode( node ) || ! name ) {
			return;
		}
		// Set value to attribute.
		if ( ! $ush.isUndefined( value ) ) {
			node.setAttribute( name, value );
			return self;
		}
		// Get value in attribute
		else if ( !! node[ 'getAttribute' ] ) {
			return node.getAttribute( name ) || '';
		}
		return;
	};

	/**
	 * Remove element
	 *
	 * @param {Node} node The node from document
	 * @return self
	 */
	$usbcore.$remove = function( node ) {
		var self = this;
		if ( $ush.isNode( node ) ) {
			node.remove();
		}
		return self;
	};

	/**
	 * Get a dedicated cache instance.
	 *
	 * @param {String} namespace The unique namespace.
	 * @return {Data} Returns the Data class.
	 */
	$usbcore.cache = function( namespace ) {
		var self = this;
		if ( ! $.isPlainObject( _$$cache ) ) {
			_$$cache = {};
		}
		if ( $ush.isUndefined( _$$cache[ namespace ] ) ) {
			_$$cache[ namespace ] = new Data( namespace );
		}
		if ( $ush.isUndefined( namespace ) ) {
			console.log( 'Error: Namespace not set', [ namespace ] );
		}
		return _$$cache[ namespace ];
	};

	/**
	 * Sets the text to caret position.
	 *
	 * @param {Node} node The node.
	 * @param {String} text
	 */
	$usbcore.setTextToCaretPosition = function( node, text ) {
		if ( $ush.isNode( node ) ) {
			let position = $ush.parseInt( node.selectionStart ),
				value = node.value;
			text = $ush.toString( text ).trim();
			node.value = value.slice( 0, position ) + text + value.slice( position );
			$ush.setCaretPosition( node, position + text.length || value.length );
		}
	};

	// Export API
	_window.$usbcore = $usbcore;

}( jQuery );
