/**
 * USOF Field: Font
 */
! function( $, undefined ) {
	var _window = window,
		_document = document,
		isUndefined = $ush.isUndefined;

	if ( isUndefined( _window.$usof ) ) {
		return;
	}

	$usof.field[ 'font' ] = {
		init: function( options ) {
			var self = this;

			self.parentInit( options );

			// Elements
			self.$preview = $( '.usof-text-preview', self.$row );
			self.$weightsContainer = $( '.usof-checkbox-list', self.$row );
			self.$weightCheckboxes = $( '.usof-checkbox', self.$weightsContainer );
			self.$weights = $( 'input', self.$weightsContainer );

			// Variables
			self.fieldFontFamily = {};
			self.fontFamily = 'none';

			// Update font value
			function _updateValue() {
				self.setValue( self.getFontValue() );
			}

			// Init font autocomplete
			var $fieldFontFamily = $( '.type_autocomplete', self.$row );
			if ( $fieldFontFamily.length ) {
				var fieldFontFamily = new $usof.field( $fieldFontFamily );
				fieldFontFamily.trigger( 'beforeShow' );
				self.fontFamily = fieldFontFamily.getValue();
				fieldFontFamily.setValue( self.fontFamily );
				fieldFontFamily.on( 'change', _updateValue );
				self.fieldFontFamily = fieldFontFamily;
			}
			self.updatePreview();

			// Events
			self.$weights.on( 'change', _updateValue );

			// Set default value
			_updateValue();
		},

		/**
		 * Loads a Google font stylesheet
		 */
		loadGoogleFont: function() {
			var self = this,
				fontFamily = self.fontFamily;
			if ( [ 'get_h1', 'none' ].indexOf( fontFamily ) > -1 ) {
				return;
			}
			fontFamily = fontFamily.replace( /\s+/g, '+' );
			var $head = $( 'head' );
			if ( ! $( 'link[data-family="' + fontFamily + '"]', $head ).length ) {
				$head.append( '<link href="//fonts.googleapis.com/css?family=' + fontFamily + '" rel="stylesheet" data-family="' + fontFamily + '" />' );
			}
		},

		/**
		 * Update preview.
		 */
		updatePreview: function() {
			var self = this;
			self.loadGoogleFont();

			// Set 'font-family' to preview
			var fontFamily = $ush.toString( self.fontFamily );
			if ( fontFamily == 'none' ) {
				fontFamily = '';
			}
			if ( fontFamily.indexOf( ' ' ) > -1 ) {
				fontFamily = "'" + fontFamily + "'";
			}
			var fallback = ( $usof.googleFonts[ self.fontFamily ] !== undefined )
					? $usof.googleFonts[ self.fontFamily ].fallback || 'sans-serif'
					: 'sans-serif' ;
			self.$preview.css( 'font-family', fontFamily + ', ' + fallback );
		},

		/**
		 * Gets the font value.
		 *
		 * @return {string} he font value "fontFamily|fontWeights".
		 */
		getFontValue: function() {
			var self = this,
				fontFamily = $ush.toString( self.fieldFontFamily.getValue() ),
				fontWeights = [];

			self.$weights.filter( ':checked' ).each( function( _, node ) {
				var value = $ush.toString( node.value );
				var variants = ( $usof.googleFonts[ self.fontFamily ] !== undefined )
						? $usof.googleFonts[ fontFamily ].variants || []
						: [];
				if ( variants.indexOf( value ) > -1 ) {
					fontWeights.push( value );
				}
			} );

			return fontFamily + '|' + fontWeights.join( ',' );
		},

		/**
		 * Set the value.
		 *
		 * @param {String} value The value.
		 * @param {Boolean} quiet The quiet.
		 */
		setValue: function( value, quiet ) {
			var self = this,
				fontValues = $ush.toString( value ).split( '|' ),
				fontFamily = $ush.toString( fontValues[0] || 'none' ),
				fontWeights = $ush.toString( fontValues[1] || '400,700' ).split( ',' );

			self.parentSetValue( value, quiet );
			self.fieldFontFamily.setValue( fontFamily, /* quiet */true );

			if ( fontFamily !== self.fontFamily ) {
				self.$weightCheckboxes.each( function( _, node ) {
					var $node = $( node ),
						checkboxValue = $ush.toString( node.dataset['value'] ),
						variants = ( $usof.googleFonts[ self.fontFamily ] !== undefined )
							? $usof.googleFonts[ fontFamily ].variants || []
							: [],
						hasVariant = variants.indexOf( checkboxValue ) < 0;
					$node
						.toggleClass( 'hidden', hasVariant )
						.find( 'input' )
						.prop( ':checked', fontWeights.indexOf( checkboxValue ) > -1 );
				} );
			}

			self.fontFamily = fontFamily;
			self.updatePreview();

			if ( ! quiet ) {
				self.trigger( 'change', [ value ] );
			}
		}

	};
}( jQuery );
