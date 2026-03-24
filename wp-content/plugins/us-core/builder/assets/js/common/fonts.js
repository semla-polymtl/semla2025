/**
 * Available spaces:
 *
 * _window.$usb - Basic object for mounting and initializing all extensions of the builder
 * _window.$usbcore - Auxiliary functions for the builder and his extensions
 * _window.$ush - US Helper Library
 *
 */
! function( $, undefined ) {
	var _window = window,
		isUndefined = $ush.isUndefined,
		isEmptyObject = $.isEmptyObject,
		isPlainObject = $.isPlainObject;

	if ( ! _window.$usb ) {
		return;
	}

	// Check for is set availability objects
	_window.$ush = _window.$ush || {};

	/**
	 * @class Fonts - Functionality for working with font settings
	 */
	function Fonts() {}

	// Fonts API
	$.extend( Fonts.prototype, {

		/**
		 * Set the google fonts
		 *
		 * @param {{}} themeOptions The theme options
		 */
		setGoogleFonts: function( themeOptions ) {
			if ( ! $usb.iframeIsReady ) {
				return;
			}
			var self = this,
				$node = $( 'link[id=' + $usb.config( 'typography.fonts_id' ) + ']', $usb.iframe.contentDocument );

			if ( $node.length ) {
				$node.attr( 'href', self._getGoogleEndpoint( themeOptions ) );
			} else {
				$( 'head', $usb.iframe.contentDocument ).append(
					'<link id="' + $usb.config( 'typography.fonts_id' )
					+ '" rel="stylesheet" href="'
					+ self._getGoogleEndpoint( themeOptions )
					+ '" media="all">'
				);
			}
		},

		/**
		 * Get the Google endpoint
		 *
		 * @param {{}} themeOptions The theme options
		 * @return {String} Returns the endpoint for connecting Google Fonts
		 */
		_getGoogleEndpoint: function( themeOptions ) {
			var self = this,
				usedFonts = {}, // all used fonts
				config = $usb.config( 'typography', {} ), // typography Configurations
				googleFonts = config.googleFonts || {}; // list of available Google Fonts

			var tags = config.tags || []; // tags for typography
			for ( var i in tags ) {
				var tag = tags[ i ], tagProps = themeOptions[ tag ];
				if ( ! isPlainObject( tagProps ) ) {
					continue;
				}
				// Get font family
				var fontFamily = tagProps[ 'font-family' ];
				if ( isUndefined( fontFamily ) ) {
					continue;
				}
				// Check if the name is in the list of Google fonts
				if ( isUndefined( googleFonts[ fontFamily ] ) ) {
					continue;
				}
				// Define italic and inherit family
				var _fontFamily = $ush.rawurlencode( fontFamily );

				// In any case, let's add the font to the list
				if ( fontFamily !== 'inherit' && isUndefined( usedFonts[ _fontFamily ] ) ) {
					usedFonts[ _fontFamily ] = $ush.toString( googleFonts[ fontFamily ] ).split( ',' );
				}
			}

			// Create inline fonts `Name:100,200,400italic...`
			var inlineFonts = [];
			for ( var fontFamily in usedFonts ) {
				var font = fontFamily,
					weights = usedFonts[ fontFamily ];
				if ( weights.length ) {
					font += ':' + weights.join( ',' );
				}
				inlineFonts.push( font );
			}

			// Create endpoint to connect Google Fonts
			if ( inlineFonts.length ) {
				// see https://developers.google.com/fonts/docs/getting_started
				return config.googleapis + '?family=' + inlineFonts.join( '|' ) + '&display=' + config.font_display;
			}
			return '';
		}

	} );

	// Export API
	$usb.fonts = new Fonts;

}( jQuery );
