/**
 * Available spaces:
 *
 * _window.$usb - Basic object for mounting and initializing all extensions of the builder
 * _window.$usbcore - Auxiliary functions for the builder and his extensions
 * _window.usGlobalData - Data for import into the USBuilder
 * _window.$usof - UpSolution CSS Framework
 * _window.$ush - US Helper Library
 *
 * Note: Double underscore `__funcname` is introduced for functions that are created through `$ush.debounce(...)`
 */
! function( $, _undefined ) {
	var _window = window;

	// Check for is set availability objects
	_window.$ush = _window.$ush || {};
	_window.usGlobalData = _window.usGlobalData || {};

	/**
	 * @type constants
	 * @type {{}} Types of notifications
	 * @see builder/assets/js/common/notify.js
	 */
	_window._NOTIFY_TYPE_ = {
		ERROR: 'error',
		INFO: 'info',
		SUCCESS: 'success'
	};

	/**
	 * @type constants
	 * @type {{}} Actions that are applied when content changes
	 * @see builder/assets/js/builder/history.js
	 */
	_window._CHANGED_ACTION_ = {
		CALLBACK: 'callback', // recovery via callback function
		CREATE: 'create', // create new shortcode and add to content
		MOVE: 'move', // move shortcode
		REMOVE: 'remove', // remove shortcode from content
		UPDATE: 'update' // update shortcode in content
	};

	/**
	 * @type {{}} Private temp data
	 */
	var _$tmp = {
		xhr: {} // XMLHttpRequests
	};

	/**
	 * @type {{}} Base object of the configurations of the entire developer
	 */
	var _$config = {
		actions: { // list of available builder actions
			site_settings: 'us-site-settings', // default
		},
	};

	/**
	 * @class USBInit - Basic object for mounting and initializing all extensions of the builder
	 * @param {String} container The main container
	 */
	function USBInit( container ) {
		var self = this;

		// Private "Variables"
		self.iframe;
		self.iframeIsReady = false;
		self._hotkeyStates = {}; // all hotkey states

		// This event is needed to get various data from the iframe
		_window.onmessage = self._onMessage.bind( self );

		/**
		 * @type {{}} Bondable events
		 */
		self._events = {
			iframeReady: self._iframeReady.bind( self ),
			urlManager: self._urlManager.bind( self ),
			keydown: self._keydown.bind( self ),
		};

		$( function() {

			// Base elements
			self.$document = $( document );
			self.$body = $( 'body' );

			// Elements
			self.$container = $( container );
			self.$panel = $( '#usb-panel' ); // Panel base container
			self.$panelBody = $( '.usb-panel-body', self.$panel );

			self.$iframe = $( 'iframe', self.$container );
			self.iframe = self.$iframe[0]; // set iframe node

			// Note: The object stores all received config from
			// the backend, this is a single entry point for config
			if ( self.$container.is( '[onclick]' ) ) {
				$usb.setConfig( $.extend( _$config, self.$container[0].onclick() || {} ) );
				self.$container.removeAttr( 'onclick' );
			}

			// Initialize frame reads
			if ( self.$iframe.is( '[data-src]' ) ) {
				self.$iframe
					.attr( 'src', self.$iframe.data( 'src' ) )
					.removeAttr( 'data-src' );
			}

			// Events
			self.$iframe
				// Handler of the ready document iframe
				.on( 'load', $ush.debounce( self._events.iframeReady, 1 ) );

			self.$document
				.on( 'keydown', self._events.keydown ); // capture keyboard shortcuts

			// The add information from `UserAgent` to bind styles to specific browsers or browser versions
			$( 'html' ).attr( 'data-useragent', $ush.ua );

			// Set MacOS shortcuts
			if ( $ush.isMacOS ) {
				$( '[data-macos-shortcuts]', self.$container ).each( function( _, node ) {
					var $node = $( node );
					$node.text( $node.data( 'macos-shortcuts' ) || '' );
				} );
			}

			// Run URL manager after ready
			self._urlManager( self.urlManager.getDataOfChange() );

		} );

		// Private events
		self.on( 'urlManager.changed', self._events.urlManager );
	}

	/**
	 * @type {Prototype}
	 */
	var prototype = USBInit.prototype;

	// Private events
	$.extend( prototype, $ush.mixinEvents, {
		/**
		 * Handler of change or move event on the history stack
		 *
		 * @event handler
		 * @param {{}|undefined} state Data object associated with history and current loaction
		 */
		_urlManager: function( state ) {
			var self = this,
				iframeSrc = self.iframe.src,
				action = state.setParams.action;

			if ( $usbcore.indexOf( action, self.config( 'actions', [] ) ) === -1 ) {
				action = self.config( 'actions.site_settings' ); // default as it is always available
			}

			// Add action class to the body of the page to apply specific styles when available
			self.$body.usMod( 'action', action || /* remove */false );
		},

		/**
		* Redirect messages from a frame to an object event
		*
		* @event handler
		* @param {Event} e The Event interface represents an event which takes place in the DOM
		* @param void
		*/
		_onMessage: function( e ) {
			var data, self = this;
			try {
				data = JSON.parse( e.data );
			} catch ( err ) {
				return;
			}
			if ( data instanceof Array && data[ /* namespace */ 0 ] === 'usb' && data[ /* event */ 1 ] !== _undefined ) {
				self.trigger( data[ /* event */ 1 ], data[ /* arguments */ 2 ] || [] );
			}
		},

		/**
		 * Iframe ready event handler
		 *
		 * @event handler
		 */
		_iframeReady: function() {
			var self = this;
			self.iframeIsReady = true;

			if ( ! self.iframe.contentDocument ) {
				return;
			}

			self.preview.hidePreloader(); // remove 'show_preloader' class if installed
			self.trigger( 'iframeReady' ); // event for react in extensions
		},

		/**
		 * Keyboard shortcut capture handler
		 * Note: When the developer panel is open, it keydown may not work due to focus outside the document
		 *
		 * @event handler
		 * @param {Event} e The Event interface represents an event which takes place in the DOM
		 */
		_keydown: function( e ) {
			if ( e.type !== 'keydown' ) {
				return;
			}

			var self = this,
				isCmd = ( e.metaKey || e.ctrlKey ),
				// Define hotkey states (see https://ss64.com/ascii.html)
				isUndo = ( isCmd && ! e.shiftKey && e.which === 90 ), // `(command|ctrl)+z` combination
				isRedo = ( isCmd && e.shiftKey && e.which === 90 ), // `(command|ctrl)+shift+z` combination
				isSave = ( isCmd && ! e.shiftKey && e.which === 83 ); // `(command|ctrl)+s` combination

			if ( $.isPlainObject( self._hotkeyStates ) ) {
				// Add states to the self._hotkeyStates
				$.extend( self._hotkeyStates, {
					'ctrl+z': isUndo,
					'ctrl+shift+z': isRedo,
					'ctrl+s': isSave
				} );

				// Trigger an event if the combination is successful
				for ( var combination in self._hotkeyStates ) {
					if ( self._hotkeyStates[ combination ] === true ) {
						self.trigger( 'hotkeys.' + combination ); // .on( 'hotkeys.ctrl+shift+z', ... )
					}
				}
			}

			if (
				isSave // exclude page save events when using 'ctrl+s' combination
				|| ( // exclude events the context of which form elements
					( isUndo || isRedo )
					&& $.inArray( $ush.toLowerCase( e.target.tagName || '' ), [ 'input', 'textarea' ] ) > -1
				)
			) {
				e.preventDefault();
			}
		},
	} );

	// Methods for send data and events outside the builder
	$.extend( prototype, {
		/**
		 * Send message to iframe
		 *
		 * @param {String} eventType A string contain event type
		 * @param {[]} extraParams Additional parameters to pass along to the event handler
		 * @chainable
		 */
		postMessage: function( eventType, extraParams ) {
			var self = this;
			if ( ! self.iframeIsReady ) {
				return;
			}
			self.iframe.contentWindow.postMessage( JSON.stringify( [ /* namespace */'usb', eventType, extraParams ] ) );
		},

		/**
		 * Forward events through document
		 * Note: Used to pass events through the document to other scripts, e.g. for $usof objects
		 *
		 * @param {String} eventType Type of event
		 * @param {[]} extraParams Additional params to pass along to the event handler
		 * @chainable
		 */
		triggerDocument: function( eventType, extraParams ) {
			this.$document.trigger( /* namespace */'usb.' + eventType, extraParams );
		}
	});

	// USBInit API
	$.extend( prototype, {
		/**
		 * Find a property by path with respect to the root ($usb)
		 * Note: If there is no property or object, it does not cause an error, but returns 'undefined'!
		 *
		 * @param {String} path Dot-delimited path to get value from object
		 * @param {*} defaultValue Default value when no result
		 * @return {*} Returns a value if successful, otherwise 'undefined'
		 */
		find: function( path, defaultValue ) {
			return path && $usbcore.deepFind( this, path, defaultValue || /* default */_undefined );
		},

		/**
		 * Reload current preview page
		 */
		reloadPreview: function() {
			var self = this;
			if ( ! self.iframeIsReady ) {
				return;
			}
			self.preview.showPreloader();
			self.iframe.contentWindow.location.reload();
		},

		/**
		 * Set the configuration in the global object
		 *
		 * @param {{}} config The configuration
		 */
		setConfig: function( config ) {
			if ( $.isPlainObject( config ) ) {
				_$config = $.extend( true, _$config, config );
				$usbcore.cache( 'config' ).flush(); // reset cache
			}
		},

		/**
		 * Get config value
		 * Note: The method is called many times, so performance is important here!
		 *
		 * @param {String} path Dot-delimited path to get value from config objects
		 * @param {*} defaultValue Default value when not in configs
		 * @return {*} Returns values from configuration
		 */
		config: function( path, defaultValue ) {
			// By default, we return a copy of the config without the ability to change it!
			if ( $ush.isUndefined( path ) ) {
				return $ush.clone( _$config );
			}
			// Note: All parameters are cached as this is a static view of the data
			return $usbcore.cache( 'config' ).get( path, function() {
				// If there is no data in the cache, we will return the data to be saved in the cache
				return $usbcore.deepFind( _$config, path, defaultValue );
			} );
		},

		/**
		 * Determining if a license is activated
		 *
		 * @return {Boolean} True if activated, False otherwise
		 */
		licenseIsActivated: function() {
			return !! this.config( 'license_is_activated', /* default */false );
		},

		/**
		 * Determining if a license is real activated
		 *
		 * @return {Boolean} True if activated, False otherwise
		 */
		licenseIsRealActivated: function() {
			return !! this.config( 'license_is_real_activated', /* default */false );
		},

		/**
		 * Checks for hotkey combination usage by key
		 *
		 * @param {String} ...keys The short command keys
		 * @return {Boolean} Returns True if used, otherwise False
		 */
		hotkeys: function() {
			var args = $ush.toArray( arguments );
			for ( var i in args ) if ( this._hotkeyStates[ '' + args[ i ] ] === true ) {
				return true;
			}
			return false;
		},

		/**
		 * Outputs a message or objects to the web console
		 *
		 * @param {String} text
		 * @param {*} data
		 */
		log: function() {
			var args = $ush.toArray( arguments );
			if ( ! args.length ) {
				args = [ 'log: called with no params' ];
			}
			console.log.apply( null, args );
		},

		/**
		 * Get text translation by key
		 *
		 * @param {String} key The key
		 * @return {String} The text
		 */
		getTextTranslation: function( key ) {
			if ( ! key ) {
				return '';
			}
			return ( _window.usGlobalData.textTranslations || {} )[ key ] || key;
		},

		/**
		 * Normalizing instructions for previews
		 * Note: `instructions = true` - force an ajax request to get the element code
		 *
		 * @param {*} instructions Instructions for preview elements
		 * @return {*}
		 */
		_normalizeInstructions: function( instructions ) {
			// The convert to an array of instructions
			if ( !! instructions && ! Array.isArray( instructions ) && instructions !== true ) {
				instructions = $.isPlainObject( instructions )
					? [ instructions ]
					: [];
			}
			return instructions;
		},

		/**
		 * Convert pattern to string from result
		 *
		 * @param {String} template The string template
		 * @param {{}} params The parameters { key: 'value'... }
		 * @return {String}
		 */
		buildString: function( template, params ) {
			if ( ! $.isPlainObject( params ) ) {
				params = {};
			}
			var self = this,
				// Create pattern for regular expression. Variable example: `{%var_name%}`
				pattern = $ush.escapePcre( $usb.config( 'startSymbol', '{%' ) );
				pattern += '([A-z\\_\\d]+)';
				pattern += $ush.escapePcre( $usb.config( 'endSymbol', '%}' ) );
			// Replace all variables with values
			return ( '' + template ).replace( new RegExp( pattern, 'gm' ), function( _, varName ) {
				return '' + ( params[ varName ] || '' );
			} );
		},

		/**
		 * Get the attachment
		 *
		 * @param {Number} id The attachment id
		 * @return {{}}
		 */
		getAttachment: function( id ) {
			if ( ! id || ! wp.media ) {
				return;
			}
			return wp.media.attachment( id );
		},

		/**
		 * Get the attachment url
		 *
		 * @param {Number} id The attachment id
		 * @return {String}
		 */
		getAttachmentUrl: function( id ) {
			if ( ! id ) {
				return '';
			}
			return ( this.getAttachment( id ) || { get: $.noop } ).get( 'url' ) || '';
		},

		/**
		 * Send data to the server using a HTTP POST request
		 *
		 * @param {String} requestId This is a unique id for the request
		 * @param {{}} settings A set of key/value pairs that configure the Ajax request
		 */
		ajax: function( requestId, settings ) {
			var self = this;
			if ( ! requestId || $.isEmptyObject( settings ) ) {
				return;
			}
			// Ajax settings
			settings = $ush.clone( settings, /* default */{
				data: {}, // data to be sent to the server
				abort: $.noop, // function to be called if the request abort
				complete: $.noop, // function to be called when the request finishes (after success and error callbacks are executed)
				error: $.noop, // function that will be called if an error occurs in the request
				success: $.noop // function to be called if the request succeeds
			} );

			// Abort prev request
			if ( ! $ush.isUndefined( _$tmp.xhr[ requestId ] ) ) {
				_$tmp.xhr[ requestId ].abort();
				if ( typeof settings.abort === 'function' ) {
					settings.abort.call( self, requestId );
				}
			}
			/**
			 * @see https://api.jquery.com/jquery.ajax
			 */
			_$tmp.xhr[ requestId ] = $.ajax({
				data: $.extend( {}, self.config( 'ajaxArgs', {} ), settings.data ),
				dataType: 'json',
				type: 'post',
				url: _window.ajaxurl,
				cache: false,
				/**
				 * Handler to be called if the request succeeds
				 * @see https://api.jquery.com/jquery.ajax/#jQuery-ajax-settings
				 *
				 * @param {{}} res
				 */
				success: function( res ) {
					delete _$tmp.xhr[ requestId ];
					// Standard output of notifications and errors.
					if ( ! res.success && $ush.isUndefined( res.data.usb_ignore_standard_notify ) ) {
						var message = (
							$ush.isUndefined( res.data )
								? 'Invalid `res.data`'
								: res.data.message
						);
						self.notify.add( 'XHR: ' + message, _NOTIFY_TYPE_.ERROR );
					}
					if ( typeof settings.success === 'function' ) {
						settings.success.call( self, res );
					}
				},
				/**
				 * Handler to be called if the request fails
				 * @see https://api.jquery.com/jquery.ajax/#jQuery-ajax-settings
				 */
				error: function( jqXHR, textStatus, errorThrown ) {
					if ( textStatus === 'abort' ) {
						return;
					}
					if ( typeof settings.error === 'function' ) {
						settings.error.call( self, requestId );
					}
					// The showing request jqXHR errors
					if ( ! errorThrown ) {
						errorThrown = 'Request was not sent';
					}
					self.log( 'XHR.error:' + errorThrown, jqXHR, requestId );
				},
				/**
				 * Handler to be called when the request finishes (after success and error callbacks are executed)
				 * @see https://api.jquery.com/jquery.ajax/#jQuery-ajax-settings
				 */
				complete: function( _, textStatus ) {
					if ( textStatus === 'abort' ) {
						return;
					}
					if ( typeof settings.complete === 'function' ) {
						settings.complete.call( self, requestId, textStatus );
					}
				}
			});
		},

		/**
		 * Redirects to another page
		 *
		 * @param {String} url The path or URL to redirect to
		 */
		redirect: function( url ) {
			var self = this;
			if ( url && typeof url === 'string' ) {
				self.iframeIsReady = false; // set a false to cancel the functionality associated with the preview
				location.href = url; // set new url
			}
		}

	} );

	// Export API
	_window.$usb = new USBInit( /* main container */'#usb-wrapper' );

}( jQuery );
