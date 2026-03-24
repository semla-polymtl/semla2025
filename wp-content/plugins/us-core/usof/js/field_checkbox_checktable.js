/**
 * USOF Fields: Checkbox & Check Table
 */
! function( $, undefined ) {
	var _window = window,
		_document = document,
		_undefined = undefined;

	if ( _window.$usof === _undefined ) {
		return;
	}

	/**
	 * Note: Do not set the field `input[type=checkbox]` name to disable links between the selection by the browser itself!
	 */
	$usof.field[ 'checkboxes' ] = {
		init: function() {
			var self = this;

			// Variables
			self._separator = self.$input.data( 'separator' ) || ',';
			self._isMetabox = self.$input.data( 'metabox' ) || false;

			// Elements
			self.$checkboxes = $( 'input[type=checkbox]', self.$row );

			// Event handlers
			self._events = {
				changeValue: self._changeValue.bind( self )
			};

			// Events
			self.$row
				.on( 'click', 'input[type=checkbox]', self._events.changeValue );

			// For control in html output
			var value = self.$input.val();

			if ( value ) {
				self.setValue( value );
			}
		},

		/**
		 * This is the checkbox change handler.
		 *
		 * @event handler
		 */
		_changeValue: function() {
			var self = this,
				values = [],
				checkboxes = self.$checkboxes.toArray();
			for ( var i in checkboxes ) {
				if ( !! checkboxes[ i ].checked && !! checkboxes[ i ].value ) {
					values.push( checkboxes[ i ].value );
				}
			}
			var value = values.join( self._separator );
			self.$input.val( value );
			self.trigger( 'change', [ value ] );
		},

		/**
		 * Get the value
		 *
		 * @return {string} Returning the value
		 */
		getValue: function() {
			return this.$input.val();
		},

		/**
		 * Set the value.
		 *
		 * @param {string||[]} value The value to be selected ()
		 */
		setValue: function( value ) {
			var self = this,
				/**
				* The input array of values
				* @type {[]}
				*/
				values = Array.isArray( value )
					? value
					: $ush.toString( value) .split( self._separator );

			// Mark selected checkboxes
			self.$checkboxes.each( ( _, node ) => {
				node.removeAttribute( 'checked' );
				node.checked = values.includes( node.value );
			});
			// Save value in field
			self.$input.val(
				Array.isArray( value )
					? value.join( self._separator )
					: value
			);
		}
	};

	$usof.field[ 'check_table' ] = {
		/**
		 * Get the value
		 *
		 * @return {[]} Returning the value
		 */
		getValue: function() {
			var self = this,
				value = {};
			$.each( self.$input, function() {
				value[ this.value ] = ( this.checked ) ? 1 : 0;
			} );
			return value;
		},

		/**
		 * Set the value.
		 *
		 * @param {[]} value The value to be selected
		 * @param {boolean} quiet Sets in quiet mode without events
		 */
		setValue: function( value, quiet ) {
			var self = this;
			$.each( self.$input, function() {
				$( this ).attr( 'checked', ( value[ this.value ] === _undefined || value[ this.value ] == 1 ) ? 'checked' : false );
			} );
		}
	};
}( jQuery );
