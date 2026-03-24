/**
 * USOF Field: Css / Html
 */
! function( $, undefined ) {

	// Private variables that are used only in the context of this function, it is necessary to optimize the code
	var _window = window;

	// Check for is set objects
	_window.$ush = _window.$ush || {};

	if ( $ush.isUndefined( _window.$usof ) ) {
		return;
	}

	$usof.field[ 'css' ] = $usof.field[ 'html' ] = {

		/**
		 * Initializes the object
		 */
		init: function() {
			var self = this;

			// Variables
			self._params = {};
			self.editor = null;
			self.editorDoc = null;

			/**
			 * @var {{}} Bondable events
			 */
			self._events = {
				editorChange: self._editorChange.bind( self ),
				editorFocused: self._editorFocused.bind( self ),
			};

			// Init CodeEditor
			if ( wp.hasOwnProperty( 'codeEditor' ) ) {
				var $params = $( '.usof-form-row-control-params', self.$row );
				if ( $params.is( '[onclick]' ) ) {
					self._params = $params[0].onclick() || {};
					$params.removeAttr( 'onclick' );
				}
				if ( self._params.editor !== false ) {
					self._params.editor.codemirror.lint = false;
					self.editor = wp.codeEditor.initialize( self.$input[ 0 ], self._params.editor || {} );
					self.editorDoc = self.editor.codemirror.getDoc();
					self.setValue( self.$input.val() );
					// Events
					self.editor.codemirror.on( 'focus', self._events.editorFocused );
					self.editor.codemirror.on( 'blur', self._events.editorFocused );
				}

			} else {
				self.$input.on( 'keyup', function() {
					self.parentSetValue( self.getValue() );
					self.setValue( self.$input.val() );
				} );
			}
		},

		/**
		 * Editor change
		 *
		 * @event handler
		 */
		_editorChange: function() {
			this.parentSetValue( this.getValue() );
		},

		/**
		 * Focus state class delegation
		 *
		 * @event handler
		 * @param {{}} _ The editor's internal object
		 * @param {FocusEvent} e The Event interface represents an event which takes place in the DOM
		 */
		_editorFocused: function( _, e ) {
			this.$row.toggleClass( 'focused', ( e instanceof FocusEvent ) );
		},

		/**
		 * Determines if content encoded
		 *
		 * @return {Boolean} True if content encoded, False otherwise
		 */
		isContentEncoded: function() {
			return ( this._params || {} ).encoded;
		},

		/**
		 * Set the value
		 *
		 * @param {String} value The value
		 */
		setValue: function( value, quiet ) {
			var self = this;
			if ( self.isContentEncoded() ) {
				value = $ush.rawurldecode( $ush.base64Decode( value ) );
			}
			if ( ! $ush.isUndefined( self.editor ) && wp.hasOwnProperty( 'codeEditor' ) ) {
				self.editorDoc.off( 'change', self._events.editorChange );
				self.editorDoc.setValue( value );
				self.editorDoc.on( 'change', self._events.editorChange );

				// Note: CodeMirror on the JS side calculates positions and line numbers,
				// so every time the editor is initialized and after a value is set,
				// you need to call refresh to display
				$ush.timeout( function() { self.editorDoc.cm.refresh() }, 50 );
			}
		},

		/**
		 * Get the value
		 *
		 * @return {String} The value
		 */
		getValue: function() {
			var self = this,
				value = ( ! $ush.isUndefined( self.editor ) && wp.hasOwnProperty( 'codeEditor' ) )
					? self.editorDoc.getValue()
					: self.$input.val();
			return (
				self.isContentEncoded()
					? $ush.base64Encode( $ush.rawurlencode( value ) )
					: value
			);
		}
	};
}( jQuery );
