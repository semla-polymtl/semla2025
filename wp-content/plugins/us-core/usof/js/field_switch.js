/**
 * USOF Field: Switch
 */
! function( $, _undefined ) {

	if ( $ush.isUndefined( window.$usof ) ) {
		return;
	}

	$usof.field[ 'switch' ] = {
		/**
		 * Initializes the object.
		 */
		init: function() {
			const self = this;

			// Elements
			self.$hidden = $( 'input.wpb_vc_param_value', self.$row );

			// Events
			self.$input.on( 'change', ( e ) => {
				const value = self.getValue();
				e.target.value = value;

				// Hidden field linked from WPBakery
				if ( self.isVCParamValue() ) {
					self.$hidden.val( value ).trigger( 'change' )
				}
				self.trigger( 'change', [ value ] );
			} );
		},

		/**
		 * Determines if a value is a param for Visual Composer
		 * Note: Method overridden because a hidden field is used for the current control
		 *
		 * @return {Boolean} True if vc parameter value, False otherwise.
		 */
		isVCParamValue: function() {
			return !! this.$hidden.length;
		},

		/**
		 * Get the value
		 *
		 * @return {Number} Returns a value of 1 or 0 (data type is important here).
		 */
		getValue: function() {
			return this.$input.is( ':checked' ) ? 1 : 0;
		},

		/**
		 * Set the value
		 *
		 * @param {*} value The value
		 * @param {Boolean} quiet The quiet
		 */
		setValue: function( value, quiet ) {
			const self = this;
			value = $ush.parseInt( value );
			self.$input
				.val( value )
				.prop( 'checked', value );
			if ( ! quiet ) {
				self.trigger( 'change', [ value ] );
			}
		}
	};
}( jQuery );
