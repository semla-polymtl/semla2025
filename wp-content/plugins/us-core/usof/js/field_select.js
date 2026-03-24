/**
 * USOF Field: Select
 */
! function( $, _undefined ) {

	if ( $ush.isUndefined( window.$usof ) ) {
		return;
	}

	$usof.field[ 'select' ] = {
		init: function( options ) {
			const self = this;

			// Private "Variables"
			self.hintsData = {};

			// Bondable events
			self._events = {
				changeSelect: self._changeSelect.bind( self ),
				syncResponsiveValue: self._syncResponsiveValue.bind( self ),
			};

			// Elements
			self.$select = $( 'select:first', self.$row );
			self.$container = $( '.usof-select', self.$row );
			self.$hint = $( '.usof-form-row-hint', self.$row );

			// Load hints data
			if ( self.$hint.is( '[onclick]' ) ) {
				let hintsData = self.$hint[ 0 ].onclick();
				if ( ! $.isPlainObject( hintsData ) ) {
					hintsData = {};
				}
				self.hintsData = hintsData;
				self.$hint.removeAttr( 'onclick' );
			}

			// Events
			self.$row.on( 'change', 'select', self._events.changeSelect );

			// Sync value for current screen
			if ( self.hasResponsive() ) {
				self.on( 'setResponsiveState', self._events.syncResponsiveValue );
			}

			// Sync selected value with select
			self._syncSelected();
		},

		/**
		 * Handler for changes in select.
		 *
		 * @event handler
		 * @param {Event} e The Event interface represents an event which takes place in the DOM.
		 */
		_changeSelect: function() {
			const self = this;
			const value = self.$select.val();

			// Set current value
			self.setCurrentValue( value );
			self._syncSelected( value ); // sync selected value with select

			// Show or hide dynamic description for Grig Layout
			self._showGridLayoutDesc();
		},

		/**
		 * Sync value for responsive screen.
		 *
		 * @event handler
		 */
		_syncResponsiveValue: function() {
			this._syncSelected(); // sync selected value with select
		},

		/**
		 * Sync selected value with select.
		 *
		 * @param {String} value The value.
		 */
		_syncSelected: function( value ) {
			const self = this;
			if ( $ush.isUndefined( value ) ) {
				value = self.getCurrentValue();
			}

			// Set current value
			self.$select.val( value );
			self._setEditLink( value );

			// Note: The attribute is required to assign styles when selecting specific values
			self.$container.attr( 'selected-value', value );

			// Show or hide dynamic description for Grig Layout
			self._showGridLayoutDesc();
		},

		/**
		 * Set the edit link.
		 *
		 * @param {String} value The value.
		 */
		_setEditLink: function( value ) {
			const self = this;
			let defaultLayout = $( 'option:selected', self.$select ).data( 'default-layout' );
			if ( ! $.isPlainObject( defaultLayout ) ) {
				defaultLayout = {};
			}
			// Show or hide layout link
			if ( $ush.parseInt( defaultLayout.id ) ) {
				value = $ush.toString( defaultLayout.id );
			}
			if ( ! self.hintsData.no_posts ) {
				if ( value && $ush.parseInt( value ) ) {
					let hint = '';
					if ( self.hintsData.hasOwnProperty( 'edit_url' ) ) {
						const regex = /(<a [^{]+)({{post_id}})([^{]+)({{hint}})([^>]+>)/;
						let title = (
							defaultLayout.title
								? self.hintsData.edit_specific + ' ' + defaultLayout.title
								: self.hintsData.edit
						);
						hint = self.hintsData.edit_url.replace( regex, '$1' + value + '$3' + title + '$5' );
					}
					self.$hint.html( hint );
				} else {
					self.$hint.html( '' );
				}
			}
		},

		/**
		 * Show or hide dynamic description for Grid > Appearance > Grig Layout.
		 */
		_showGridLayoutDesc: function() {
			const self = this;
			if ( ! self.$row.hasClass( 'for_grid_layouts' ) ) {
				return;
			}
			let value = self.getCurrentValue(),
				isVC = self.isVCParamValue(),
				isNumericValue = $ush.parseInt( value ) !== 0,
				$addDesc = $( '.us-grid-layout-desc-add', isVC ? self.$row.parent() : self.$row ),
				$editLink = $( '.us-grid-layout-desc-edit', isVC ? self.$row.parent() : self.$row );
			if ( isNumericValue ) {
				$( '.edit-link', $editLink )
					.attr( 'href', ( self.$container.data( 'edit_link' ) || '' )
					.replace( '%d', value ) );
			}
			$addDesc[ isNumericValue ? 'addClass' : 'removeClass' ]( 'hidden' );
			$editLink[ isNumericValue ? 'removeClass' : 'addClass' ]( 'hidden' );
		},

		/**
		 * Set the value.
		 *
		 * @param {String} value.
		 * @param {Boolean} quiet The quiet.
		 */
		setValue: function( value, quiet ) {
			const self = this;

			// Set current value
			self.parentSetValue( '' + value );
			self._syncSelected(); // sync selected value with select

			if ( ! quiet ) {
				self.$input.trigger( 'change' );
			}
		}
	};
}( jQuery );
