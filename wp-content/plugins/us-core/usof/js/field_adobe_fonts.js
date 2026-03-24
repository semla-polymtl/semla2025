/**
 * USOF Field: Abobe Fonts
 */
! function( $, undefined ) {
	var _window = window,
		_document = document;

	if ( _window.$usof === undefined ) {
		return;
	}

	$usof.field[ 'adobe_fonts' ] = {

		init: function() {
			var self = this;

			// Elements
			self.$btnAdobeFontsApply = self.$row.find( '.usof-button.type_adobe_fonts_apply' );
			self.$btnAdobeFontsReset = self.$row.find( '.usof-button.type_adobe_fonts_reset' );
			self.$typeKitIdField = self.$row.find( 'input[name="typekit_id"]' );
			self.adobeFontsMessage = self.$row.find( '.usof-message' );

			// Events
			self.$btnAdobeFontsApply.on( 'click', self.getAdobeFonts.bind( self ) );
			self.$btnAdobeFontsReset.on( 'click', self.resetAdobeFonts.bind( self ) );
			self.$typeKitIdField.on( 'change paste keyup', self.controlFields.bind( self ) );


			self.loadAdobeFonts();
			self.controlFields();
		},

		getAdobeFonts: function() {
			var self = this;

			// Save any changes made before applying Adobe fonts
			self.saveChanges();

			self.$btnAdobeFontsApply.addClass( 'loading' );
			self.$typeKitIdField.attr( 'disabled', '' );
			$.ajax( {
				type: 'POST',
				url: $usof.ajaxUrl,
				dataType: 'json',
				data: {
					action: 'usof_save_adobe_typekit',
					typekit_id: `${ self.$typeKitIdField.val() }`,
				},
				success: function() {
					location.reload();
				},
				error: function( response ) {
					self.$btnAdobeFontsApply.removeClass( 'loading' );
					self.$typeKitIdField.removeAttr( 'disabled' );
					self.adobeFontsMessage.addClass( 'status_error' ).text( response.responseJSON.message );
				},
			} );
		},

		resetAdobeFonts: function() {
			var self = this;

			// Save any changes made before resetting Adobe fonts
			self.saveChanges();

			self.$btnAdobeFontsReset.addClass( 'loading' );
			self.$typeKitIdField.attr( 'disabled', '' );
			$.ajax( {
				type: 'POST',
				url: $usof.ajaxUrl,
				dataType: 'json',
				data: {
					action: 'usof_reset_adobe_typekit',
				},
				success: function() {
					location.reload();
				}.bind( this )
			} );
		},

		loadAdobeFonts: function() {
			var self = this;

			if ( self.$typeKitIdField.val() ) {
				$( 'head' ).append( '<link rel="stylesheet" href="https://use.typekit.net/' + self.$typeKitIdField.val() + '.css">' );
			}
		},

		controlFields: function() {
			var self = this;

			if ( ! self.$typeKitIdField.val() ) {
				self.$btnAdobeFontsApply.attr( 'disabled', '' );
			} else {
				self.$btnAdobeFontsApply.removeAttr( 'disabled' );
			}
		},

		saveChanges: function() {
			$usof.instance.save();
		}
	};
}( jQuery );
