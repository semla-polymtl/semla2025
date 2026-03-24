/**
 * Available spaces:
 *
 * _window.$usb - Basic object for mounting and initializing all extensions of the builder
 * _window.$usbcore - Auxiliary functions for the builder and his extensions
 *
 * TODO: Update script based on $ush.url()
 */
! function( $, _undefined ) {
	var _history = history,
		_location = location,
		_window = window;

	if ( ! _window.$usb ) {
		return;
	}

	// Check for is set availability objects
	_window.$ush = _window.$ush || {};
	_window.$usbcore = _window.$usbcore || {};

	/**
	 * @type {[]} Reserved params
	 */
	const _RESERVED_PARAMS_ = [ 'post' ];

	/**
	 * @type {String} Last set location
	 */
	var _$locationHref = _location.href;

	/**
	 * @type {URL} Set start URL (object)
	 */
	var _$url = new URL( _$locationHref );

	/**
	 * @class URLManager - Functionality for interaction with the address bar
	 */
	function URLManager() {
		var self = this;

		// Events
		// See https://developer.mozilla.org/en-US/docs/Web/API/Window/popstate_event
		_window.onpopstate = function( e ) {
			// Update to the URL class (important to update before the trigger is called!)
			self.setUrl( _location );

			// Get current state
			var state = $.isPlainObject( e.state )
				? $ush.clone( e.state )
				: {};
			$.extend( state, self.getDataOfChange() )

			// Trigger a change or move event on the history stack
			$usb.trigger( 'urlManager.changed', state );

			// Set the last location
			_$locationHref = _location.href;
		};
	}

	// URL Manager API
	$.extend( URLManager.prototype, {
		/**
		 * Set the URL
		 *
		 * @param {String} url The new url
		 * @return self
		 */
		setUrl: function( url ) {
			_$url = new URL( url );
			return this;
		},

		/**
		 * Get the current URL
		 *
		 * @return {String} Returns the URL
		 */
		getHref: function() {
			return _location.href;
		},

		/**
		 * Build a href based on the object's URL data
		 *
		 * @return {String} Returns the generated URL
		 */
		buildHref: function() {
			return _$url.toString();
		},

		/**
		 * Determines if change
		 *
		 * @return {Boolean} True if change, False otherwise
		 */
		hasChange: function() {
			var self = this;
			return self.getHref() !== self.buildHref();
		},

		/**
		 * Determines if parameter and value
		 *
		 * @param {String} key The key
		 * @param {String|Number} value [optional] The value
		 * @return {Boolean} True if there is a parameter (and the value corresponds), False otherwise
		 */
		hasParam: function( key, value ) {
			if ( typeof key === 'string' ) {
				var hasKey = _$url.searchParams.has( key );
				if ( ! value ) {
					return hasKey;
				}
				return hasKey && _$url.searchParams.get( key ) === value;
			}
			return false;
		},

		/**
		 * Set the param
		 *
		 * @param {String} key The key name
		 * @param {String} value The value (A value of 'undefined' will remove the params)
		 * @return self
		 */
		setParam: function( key, value ) {
			if ( typeof key === 'string' ) {
				// A value of 'undefined' will remove the params
				if ( $ush.isUndefined( value ) ) {
					_$url.searchParams.delete( key );
				} else {
					_$url.searchParams.set( key, value || '' );
				}
			}
			return this;
		},

		/**
		 * Set the params
		 *
		 * @param {{}} values The params '{ key: value, key2: value2, ... }'
		 * @return self
		 */
		setParams: function( params ) {
			var self = this;
			if ( $.isPlainObject( params ) ) {
				for ( var k in params ) {
					if ( params[ k ] ) {
						self.setParam( k, params[ k ] );
					}
				}
			}
			return self;
		},

		/**
		 * Get the param value
		 *
		 * @param {String} key The key
		 * @return {string} Returns a value if there is one, otherwise 'undefined'
		 */
		getParam: function( key ) {
			if ( key && this.hasParam( key ) ) {
				return _$url.searchParams.get( key );
			}
			return _undefined; // no param
		},

		/**
		 * Get the param values
		 *
		 * @param {[]|undefined} keys The param keys
		 * @return {{}} Returns values for params in '{ key: value }' format
		 */
		getParams: function( keys ) {
			var self = this,
				result = {};
			_$url.searchParams.forEach( function( value, key ) {
				if ( Array.isArray( keys ) && keys.indexOf( key ) === -1 ) {
					return;
				}
				result[ key ] = value;
			} );
			return result;
		},

		/**
		 * Remove the param
		 *
		 * @param {String} key The param key
		 * @return self
		 */
		removeParam: function( key ) {
			var self = this;
			if ( self.hasParam( key ) ) {
				_$url.searchParams.delete( key );
			}
			return self;
		},

		/**
		 * Remove the params
		 *
		 * @param {[]} keys The param keys
		 * @return self
		 */
		removeParams: function( keys ) {
			var self = this;
			if ( Array.isArray( keys ) ) {
				keys.map( self.removeParam.bind( self ) );
			}
			return self;
		},

		/**
		 * Get the data of change
		 *
		 * @return {{}} Returns the change data object
		 */
		getDataOfChange: function() {
			var self = this,
				data = {
					setParams: {}, // all set params
					oldParams: {} // old params that have been changed or deleted
				};
			// Add old params
			( new URL( _$locationHref ) ).searchParams.forEach( function( value, key ) {
				if (
					$usbcore.indexOf( key, _RESERVED_PARAMS_ ) === -1
					&& ! self.hasParam( key, value )
				) {
					data.oldParams[ key ] = value;
				}
			} );
			// Add set params
			_$url.searchParams.forEach( function( value, key ) {
				if (
					$usbcore.indexOf( key, _RESERVED_PARAMS_ ) === -1
					|| (
						! $ush.isUndefined( data.oldParams[ key ] )
						&& data.oldParams[ key ] !== value
					)
				) {
					data.setParams[ key ] = value;
				}
			} );
			return data;
		},

		/**
		 * Push entry in the browser session history stack
		 */
		push: function ( state ) {
			var self = this;
			if ( ! self.hasChange() ) {
				return;
			}

			// Get current state
			state = $.isPlainObject( state )
				? $ush.clone( state )
				: {};
			$.extend( state, self.getDataOfChange() );

			// Add an entry to the browser's session history stack
			_history.pushState( state, '', self.buildHref() );

			// Trigger a change or move event on the history stack
			// Note: it is important to be trigger after history.pushState()!
			$usb.trigger( 'urlManager.changed', state );

			// Set the last location
			_$locationHref = _location.href;
		}
	} );

	// Export API
	$usb.urlManager = new URLManager;

}( jQuery );

