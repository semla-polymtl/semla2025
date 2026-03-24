/**
 * USOF Button Style Preview
 */
;! function( $, _undefined ) {

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

	function ButtonPreview( container ) {
		const self = this;

		// Elements
		self.$container = $( container );
		self.$button = $( '.usof-btn', self.$container );
		self.$groupParams = self.$container.closest( '.usof-form-group-item' );
		self.$style = $( 'style:first', self.$groupParams );

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
	$.extend( ButtonPreview.prototype, {

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
			const classRandomPart = $ush.uniqid();

			let className = '.usof-btn_' + classRandomPart,
				style = {
					default: '',
					hover: '',
				};
			self.$button.usMod( 'usof-btn', classRandomPart );

			// Font family
			let buttonFont = self.groupParams.getValue( 'font' ),
				typographyOptions = $usof.getData('typographyOptions') || {},
				fontFamily;

			if ( $.inArray( buttonFont, Object.keys( typographyOptions ) ) !== - 1 ) {
				fontFamily = ( typographyOptions[ buttonFont ] || {} )['font-family'] || ( ( typographyOptions[ buttonFont ] || {} ).default || {} )['font-family'] || '';
			} else {
				fontFamily = buttonFont;
			}
			if ( fontFamily !== 'none' && fontFamily !== '' && fontFamily !== 'null' ) {
				style.default += 'font-family: ' + fontFamily + '!important;';
			}

			// Text style
			if ( self.groupParams.getValue( 'text_style' ).indexOf( 'italic' ) !== - 1 ) {
				style.default += 'font-style: italic !important;';
			} else {
				style.default += 'font-style: normal !important;';
			}

			if ( self.groupParams.getValue( 'text_style' ).indexOf( 'uppercase' ) !== - 1 ) {
				style.default += 'text-transform: uppercase !important;';
			} else {
				style.default += 'text-transform: none !important;';
			}

			// Font size
			// Used min() for correct appearance of the button with huge font-size value, e.g. 20em
			style.default += 'font-size: min(' + self.groupParams.getValue( 'font_size' ) + ', 50px) !important;';

			// Line height
			style.default += 'line-height:' + self.groupParams.getValue( 'line_height' ) + ' !important;';

			// Font weight
			style.default += 'font-weight:' + self.groupParams.getValue( 'font_weight' ) + ' !important;';

			// Height & Width
			style.default += 'padding:' + self.groupParams.getValue( 'height' ) + ' ' + self.groupParams.getValue( 'width' ) + ' !important;';

			// Corners radius
			style.default += 'border-radius:' + self.groupParams.getValue( 'border_radius' ) + ' !important;';

			// Letter spacing
			style.default += 'letter-spacing:' + self.groupParams.getValue( 'letter_spacing' ) + ' !important;';

			// Colors
			let colorBg = self._getColorValue( 'color_bg' ),
				colorBorder = self._getColorValue( 'color_border' ),
				colorBgHover = self._getColorValue( 'color_bg_hover' ),
				colorBorderHover = self._getColorValue( 'color_border_hover' ),
				color;

			// Set default values if colors are empty
			if ( colorBg == '' ) {
				colorBg = 'transparent';
			}
			if ( colorBorder == '' ) {
				colorBorder = 'transparent';
			}
			if ( colorBgHover == '' ) {
				colorBgHover = 'transparent';
			}
			if ( colorBorderHover == '' ) {
				colorBorderHover = 'transparent';
			}

			style.default += 'background:' + colorBg + ' !important;';
			if ( colorBorder.indexOf( 'gradient' ) !== - 1 ) {
				style.default += 'border-image:' + colorBorder + ' 1 !important;';
			} else {
				style.default += 'border-color:' + colorBorder + ' !important;';
			}

			if ( self._getColorValue( 'color_text' ).indexOf( 'gradient' ) !== - 1 ) {
				color = usofColorPicker.gradientParser( self._getColorValue( 'color_text' ) ).hex;
				style.default += 'color:' + color + ' !important;';
			} else {
				self.$button.css( 'color', self._getColorValue( 'color_text' ) );
			}

			// Shadow
			if ( self._getColorValue( 'color_shadow' ) != '' ) {
				style.default += 'box-shadow:'
					+ self.groupParams.getValue( 'shadow_offset_h' ) + ' '
					+ self.groupParams.getValue( 'shadow_offset_v' ) + ' '
					+ self.groupParams.getValue( 'shadow_blur' ) + ' '
					+ self.groupParams.getValue( 'shadow_spread' ) + ' '
					+ self._getColorValue( 'color_shadow' ) + ' ';
				if ( $.inArray( '1', self.groupParams.getValue( 'shadow_inset' ) ) !== - 1 ) {
					style.default += 'inset';
				}
				style.default += '!important;';
			}

			// Hover class
			self.$container.usMod( 'hov', self.groupParams.getValue( 'hover' ) );

			// Background;
			if ( self.groupParams.getValue( 'hover' ) == 'fade' ) {
				style.hover += 'background:' + colorBgHover + ' !important;';
			} else if ( colorBgHover == 'transparent' ) {
				style.hover += 'background:' + colorBgHover + ' !important;';
			}

			// Shadow
			if ( self._getColorValue( 'color_shadow_hover' ) != '' ) {
				style.hover += 'box-shadow:'
					+ self.groupParams.getValue( 'shadow_hover_offset_h' ) + ' '
					+ self.groupParams.getValue( 'shadow_hover_offset_v' ) + ' '
					+ self.groupParams.getValue( 'shadow_hover_blur' ) + ' '
					+ self.groupParams.getValue( 'shadow_hover_spread' ) + ' '
					+ self._getColorValue( 'color_shadow_hover' ) + ' ';
				if ( $.inArray( '1', self.groupParams.getValue( 'shadow_hover_inset' ) ) !== - 1 ) {
					style.hover += 'inset';
				}
				style.hover += '!important;';
			}

			// Border color
			if ( colorBorderHover.indexOf( 'gradient' ) !== - 1 ) {
				style.hover += 'border-image:' + colorBorderHover + ' 1 !important;';
			} else {
				style.hover += 'border-color:' + colorBorderHover + ' !important;';
			}

			// Text color
			let colorHover;
			if ( self._getColorValue( 'color_text_hover' ).indexOf( 'gradient' ) !== - 1 ) {
				colorHover = ( usofColorPicker.gradientParser( self._getColorValue( 'color_text_hover' ) ) ).hex;
			} else {
				colorHover = self._getColorValue( 'color_text_hover' );
			}
			style.hover += 'color:' + colorHover + ' !important;';

			let compiledStyle = className + '{%s}'.replace( '%s', style.default );

			// Border Width
			compiledStyle += className + ':before {border-width:' + self.groupParams.getValue( 'border_width' ) + ' !important;}';
			compiledStyle += className + ':hover{%s}'.replace( '%s', style.hover );

			// Extra layer for "Slide" hover type OR for gradient backgrounds (cause gradients don't support transition)
			if (
				self.groupParams.getValue( 'hover' ) == 'slide'
				|| (
					colorBorder.indexOf( 'gradient' ) !== - 1
					|| colorBgHover.indexOf( 'gradient' ) !== - 1
				)
			) {
				compiledStyle += className + ':after {background:' + colorBgHover + '!important;}';
			}

			self.$style.text( compiledStyle );
		}

	} );

	$.fn.USOF_ButtonPreview = function() {
		return this.each( function() {
			$( this ).data( 'usof.buttonPreview', new ButtonPreview( this ) );
		} );
	};

}( jQuery );
