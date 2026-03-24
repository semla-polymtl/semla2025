/**
 * Available spaces:
 *
 * _window.$usbp - USBSitePreview The class displays changes to the site settings
 * _window.parent.$usb - Basic object for mounting and initializing all extensions of the builder
 * _window.parent.$usbcore - Auxiliary functions for the builder and his extensions
 * _window.$ush - US Helper Library
 * _window.$us - UpSolution Theme Core JavaScript Code
 *
 * Note: Double underscore `__funcname` is introduced for functions that are created through `$ush.debounce(...)`.
 */
! function( $, undefined ) {
	var _document = document,
		_window = window;

	// Get parent window
	var parent = _window.parent || {};

	// Check for is set availability objects
	_window.$ush = _window.$ush || parent.$ush || {};

	// If there is no parent window object, we will complete the execute script
	if ( ! parent.$usb ) {
		// Note: Reload is necessary to get rid of the referral,
		// on the basis of which the identification of the preview
		$usb.reloadPreview();
 		return;
	}

	var $usb = parent.$usb,
		$usbcore = parent.$usbcore || {}; // get $usbcore helpers

	/**
	 * @type {String} Cookie name for preview live options
	 */
	const _COOKIE_NAME_FOR_PREVIEW_OPTIONS_ = 'usb_preview_site_options';

	/**
	 * @class USBSite Preview - The class displays changes to the site settings
	 */
	var USBSitePreview = function() {
		var self = this;

		// Duplicate identification parameters from the referral to the current link,
		// to be able to identify previews after clicking on links within a frame
		var siteParam = $usb.config( 'preview.url_site_param' );
		if ( siteParam && ( _document.referrer + '' ).indexOf( siteParam ) > -1 ) {
			var siteNonce = $usb.config( 'preview.url_site_nonce', /* default */'' );
			// Set identification parameters in the current URL without reloading the page
			var url = new URL( location );
				url.searchParams.set( siteParam, siteNonce );
			history.pushState( {}, '', url.toString() );
		}

		// This event is needed to get various data from the iframe
		_window.onmessage = $usb._onMessage.bind( self );

		// Set the 'show_preloader' class before load the document
		_window.onbeforeunload = function() {
			if ( ! $usb.iframeIsReady ) {
				return;
			}
			$usb.preview.showPreloader();
		};

		// Elements
		self.$document = $( _document );

		/**
		 * @type {{}} Bondable dddevents
		 */
		self._events = {
			clearCookies: self._clearCookies.bind( self ),
			onPreviewChange: self._onPreviewChange.bind( self ),
		};

		// Events
		self.$document
			// Capture keyboard shortcuts
			.on( 'keydown', $usb._events.keydown );

		// Private event
		self
			.on( 'clearCookies', self._events.clearCookies )
			.on( 'onPreviewChange', self._events.onPreviewChange );
	}

	// Site Preview API
	$.extend( USBSitePreview.prototype, $ush.mixinEvents, {

		/**
		 * Clear cookie data for preview
		 *
		 * @event handle
		 */
		_clearCookies: function() {
			$ush.removeCookie( _COOKIE_NAME_FOR_PREVIEW_OPTIONS_ );
		},

		/**
		 * Function call after 30ms
		 *
		 * @type debounced
		 * @param {Function} fn Function to wrap
		 */
		debounce_fn_30ms: $ush.debounce( $ush.fn, /* wait */30 ),

		/**
		 * Apply the changes to the preview page
		 *
		 * instruction: `
		 * {
		 * 		'attr': 'html|text|tag|{attribute}(style|class|...)',
		 * 		'css': '{selectors}',
		 * 		'elm': '{selectors}',
		 * 		'mod': '{name}',
		 * 		'toggle_atts': {
		 * 			'attribute': '{value}',
		 * 			'attribute2': '{value2}',
		 * 		},
		 * 		'toggle_class': '{class name}',
		 * 		'toggle_class_inverse': '{class name}',
		 * }`
		 * or array instructions: `
		 * [
		 *        {...},
		 *        {...}
		 * ]`
		 *
		 * @event handler
		 * @param {{}} instructions The are instructions for update page
		 * @param {*} value The value
		 * @param {String} fieldType The $usof.field type
		 * @param {String} data The additional data
		 */
		_onPreviewChange: function( instructions, value, fieldType, data ) {
			var self = this,
				isUndefined = $ush.isUndefined,
				isPlainObject = $.isPlainObject;

			// Get additional data
			var _data = {
				changed: '', // changed data relative to saved options
				liveOptions: '', // the current live options
			};
			if ( isPlainObject( data ) ) {
				$.extend( /* deep */true, _data, data );
			}

			// Clear cookie data for preview
			if ( ! $usb.siteSettings.isChanged() ) {
				self.trigger( 'clearCookies' );
			}
			// Save live options to apply to preview pages (after saving this record should be deleted)
			else if ( typeof _data.changed === 'string' ) {
				$ush.setCookie( _COOKIE_NAME_FOR_PREVIEW_OPTIONS_, _data.changed, /* days */15 );
			}

			// Refresh current preview page
			if ( instructions === true ) {
				self.debounce_fn_30ms( $usb.reloadPreview.bind( $usb ) );
				return;
			}

			if ( isUndefined( instructions[ 0 ] ) ) {
				instructions = [ instructions || {} ];
			}

			// Apply the instructions to the elements
			for ( var i in instructions ) {
				var instruction = instructions[ i ];
				if ( isUndefined( instruction[ 'elm' ] ) ) {
					continue;
				}

				// Define the element to change
				var $elm = $( instruction[ 'elm' ] );
				if ( ! $elm.length ) {
					continue;
				}

				// Change the class modifier of an element
				if ( ! isUndefined( instruction[ 'mod' ] ) ) {
					var mod = '' + instruction[ 'mod' ],
						// Expression for remove classes
						pcre = new RegExp( '((^|\\s)'+ $ush.escapePcre( mod ) + '[a-zA-Z0-9\_\-]+)', 'g' );

					// Remove all classes from modifier
					$elm.each( function( _, elm ) {
						elm.className = elm.className.replace( pcre, '' );
					} );

					// If the value is not responsive, check for a set and turn it into an array
					value = Array.isArray( value ) ? value : ( '' + value ).split( ',' );
					$.each( value || [], function( _, value ) {
						if ( value ) {
							$elm.addClass( mod + '_' + value );
						}
					} );
				}

				// Change the inline parameter
				if ( ! isUndefined( instruction[ 'css' ] ) ) {
					// Get url to image by id
					if (
						fieldType === 'upload'
						&& typeof value === 'number'
						&& instruction['css'].indexOf( 'background' ) === 0
					) {
						value = 'url(%s)'.replace( '%s', $usb.getAttachmentUrl( value ) );
					}
					$elm.css( instruction[ 'css' ], value );
				}

				// Change the typography options
				if ( ! isUndefined( instruction[ 'typography' ] ) ) {
					$ush.debounce_fn_1ms( function() {
						var liveOptions = $ush.toPlainObject( _data.liveOptions );
						if ( $.isEmptyObject( liveOptions ) ) {
							return;
						}
						// Create a collection for css compilation
						var collections = {};
						$.each( $usb.config('typography.tags', [] ), function( _, tagName ) {
							var options = liveOptions[ tagName ];
							if ( isUndefined( options ) ) {
								return;
							}

							$.each( $usb.config( 'breakpoints', {} ), function( screen, _ ) {
								if ( ! isPlainObject( collections[ screen ] ) ) {
									collections[ screen ] = { ':root': {} };
								}
								$.each( options, function( key, value ) {
									key = ( tagName == 'body' )
										? '--' + key // global options do not have a tagName prefix
										: '--' + tagName + '-' + key;

									var maybeResponsiveValue = $ush.toPlainObject( value );

									if ( ! $ush.isUndefined( maybeResponsiveValue.default ) ) {
										value = ( ! $ush.isUndefined( maybeResponsiveValue[ screen ] ) )
											? maybeResponsiveValue[ screen ]
											: maybeResponsiveValue.default;
									}

									collections[ screen ][':root'][ key ] = value;
								} );
							} );
						} );
						// Set google fonts
						$usb.fonts.setGoogleFonts( liveOptions );
						// Set new generated styles based on collection
						$elm.text( $usb.cssGenerator( collections ) );
					} );
				}
			}
		}
	} );

	// Export API
	_window.$usbp = new USBSitePreview;

}( jQuery );
