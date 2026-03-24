/**
 * USOF Field: Hidden
 */
! function( $, undefined ) {

	// Private variables that are used only in the context of this function, it is necessary to optimize the code.
	var _window = window;

	if ( $ush.isUndefined( _window.$usof ) ) {
		return;
	}

	$usof.field[ 'hidden' ] = {
		init: function() {
			var self = this;

			/**
			 * @var {{}} Bondable events.
			 */
			self._events = {
				setUniqueValue: self._setUniqueValue.bind( self ),
			};

			// Subscribe to events from the dependent field, if any
			var autoGenerateValueBySwitchOn = $ush.toString( self.$row.data( 'auto_generate_value_by_switch_on' ) );
			if ( autoGenerateValueBySwitchOn ) {
				var usofField = self.getFieldByName( autoGenerateValueBySwitchOn );
				if ( usofField instanceof $usof.field ) {
					usofField.on( 'change', self._events.setUniqueValue );
				}
			}
		},

		/**
		 * Set a unique id if the switch is on.
		 *
		 * @event handler
		 * @param {usofField} _
		 * @param {Number} switchValue The switch value.
		 */
		_setUniqueValue: function( _, switchValue ) {
			this.setCurrentValue( switchValue ? $ush.uniqid() : '' );
		}
	};

}( jQuery );
