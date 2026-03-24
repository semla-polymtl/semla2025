/**
 * USOF Field Style Preview
 */
; ! function( $, _undefined ) {

	if ( $ush.isUndefined( window.$usof ) ) {
		return;
	}

	const dependsOn = [
		'h1_font_family',
		'h2_font_family',
		'h3_font_family',
		'h4_font_family',
		'h5_font_family',
		'h6_font_family',
		'body_font_family',
	];

	function InputFieldPreview( container ) {
		const self = this;

		// Elements
		self.$container = $( container );
		self.$groupParams = self.$container.closest( '.usof-form-group-item' );
		self.$previewBox = $( '.usof-input-preview', self.$groupParams );

		// Private "Variables"
		self.groupParams = self.$groupParams.data( 'usof.GroupParams' );

		// Bondable events
		self._events = {
			applyStyles: self.applyStyles.bind( self ),
		};

		// Apply style to button preview on dependant fields change
		for ( const fieldId in $usof.instance.fields ) {
			if ( ! $usof.instance.fields.hasOwnProperty( fieldId ) ) {
				continue;
			}
			if ( dependsOn.includes( $usof.instance.fields[ fieldId ].name ) ) {
				$usof.instance.fields[ fieldId ].on( 'change', self._events.applyStyles );
			}
		}

		// Apply style to button preview on button's group params change
		for ( const fieldId in self.groupParams.fields ) {
			if ( ! self.groupParams.fields.hasOwnProperty( fieldId ) ) {
				continue;
			}
			self.groupParams.fields[ fieldId ].on( 'change', self._events.applyStyles );
		}

		self.applyStyles();
	};

	// Export API
	$.extend( InputFieldPreview.prototype, {

		/**
		 * Get the color value.
		 *
		 * @param {String} name The field name.
		 * @return {String} Returns the current color in HEX, RGB(A) or Gradient.
		 */
		_getColorValue: function( name ) {
			const self = this;
			if (
				self.groupParams instanceof $usof.GroupParams
				&& self.groupParams.fields[ name ] !== _undefined
				&& self.groupParams.fields[ name ].type === 'color'
				&& self.groupParams.fields[ name ].hasOwnProperty( 'getColorValue' )
			) {
				return self.groupParams.fields[ name ].getColorValue();
			}
			return '';
		},
		/**
		 * Apply styles for form elements a preview
		 */
		applyStyles: function() {
			const self = this;

			// Font family
			let fieldFont = self.groupParams.getValue( 'font' ),
				typographyOptions = $usof.getData('typographyOptions') || {},
				fontFamily;
			if ( $.inArray( fieldFont, Object.keys( typographyOptions ) ) !== - 1 ) {
				fontFamily = ( typographyOptions[ fieldFont ] || {} )['font-family'] || ( ( typographyOptions[ fieldFont ] || {} ).default || {} )['font-family'] || '';
			} else {
				fontFamily = fieldFont;
			}

			let style = '';
			if ( fontFamily != 'none' && fontFamily != '' ) {
				style += '--inputs-font-family: ' + fontFamily + ';';
			}

			style += '--inputs-font-size:' + self.groupParams.getValue( 'font_size' ) + ';';
			style += '--inputs-font-weight:' + self.groupParams.getValue( 'font_weight' ) + ';';
			style += '--inputs-letter-spacing:' + self.groupParams.getValue( 'letter_spacing' ) + ';';
			style += '--inputs-text-transform:' + self.groupParams.getValue( 'text_transform' ) + ';';
			style += '--inputs-height:' + self.groupParams.getValue( 'height' ) + ';';
			style += '--inputs-padding: ' + self.groupParams.getValue( 'padding' ) + ';';
			style += '--inputs-border-radius:' + self.groupParams.getValue( 'border_radius' ) + ';';
			style += '--inputs-border-width:' + self.groupParams.getValue( 'border_width' ) + ';';
			style += '--inputs-checkbox-size:' + self.groupParams.getValue( 'checkbox_size' ) + ';';

			// Colors
			if ( self._getColorValue( 'color_bg' ) ) {
				style += '--inputs-background:' + self._getColorValue( 'color_bg' ) + ';';
			}
			if ( self._getColorValue( 'color_border' ) ) {
				style += '--inputs-border-color:' + self._getColorValue( 'color_border' ) + ';';
			}
			if ( self._getColorValue( 'color_text' ) ) {
				style += '--inputs-text-color:' + self._getColorValue( 'color_text' ) + ';';
			}

			// Colors on focus
			if ( self._getColorValue( 'color_bg_focus' ) ) {
				style += '--inputs-focus-background:' + self._getColorValue( 'color_bg_focus' ) + ';';
			}
			if ( self._getColorValue( 'color_border_focus' ) ) {
				style += '--inputs-focus-border-color:' + self._getColorValue( 'color_border_focus' ) + ';';
			}
			if ( self._getColorValue( 'color_text_focus' ) ) {
				style += '--inputs-focus-text-color:' + self._getColorValue( 'color_text_focus' ) + ';';
			}

			// Shadow
			if ( self._getColorValue( 'color_shadow' ) != '' ) {
				style += '--inputs-box-shadow:'
					+ self.groupParams.getValue( 'shadow_offset_h' ) + ' '
					+ self.groupParams.getValue( 'shadow_offset_v' ) + ' '
					+ self.groupParams.getValue( 'shadow_blur' ) + ' '
					+ self.groupParams.getValue( 'shadow_spread' ) + ' '
					+ self._getColorValue( 'color_shadow' ) + ' ';
				if ( $.inArray( '1', self.groupParams.getValue( 'shadow_inset' ) ) !== - 1 ) {
					style += 'inset';
				}
				style += ';';
			}

			// Shadow on focus
			if ( self._getColorValue( 'color_shadow_focus' ) != '' || self._getColorValue( 'color_shadow' ) != '' ) {
				style += '--inputs-focus-box-shadow:'
					+ self.groupParams.getValue( 'shadow_focus_offset_h' ) + ' '
					+ self.groupParams.getValue( 'shadow_focus_offset_v' ) + ' '
					+ self.groupParams.getValue( 'shadow_focus_blur' ) + ' '
					+ self.groupParams.getValue( 'shadow_focus_spread' ) + ' ';

				if ( self._getColorValue( 'color_shadow_focus' ) != '' ) {
					style += self._getColorValue( 'color_shadow_focus' ) + ' ';
				} else {
					style += self._getColorValue( 'color_shadow' ) + ' ';
				}
				if ( $.inArray( '1', self.groupParams.getValue( 'shadow_focus_inset' ) ) !== - 1 ) {
					style += 'inset';
				}
				style += ';';
			}

			self.$previewBox.attr( 'style', style );
		},
	} );

	$.fn.USOF_InputFieldPreview = function() {
		return this.each( function() {
			$( this ).data( 'usof.InputFieldPreview', new InputFieldPreview( this ) );
		} );
	};

}( jQuery );
