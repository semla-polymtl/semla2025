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
		isPlainObject = $.isPlainObject,
		isEmptyObject = $.isEmptyObject;

	if ( ! _window.$usb ) {
		return;
	}

	// Check for is set availability objects
	_window.$ush = _window.$ush || {};

	/**
	 * @class CSSGenerator - Functionality for generating css based on collections
	 * @param {{}} collection
	 *
	 * collection: `{
	 * 		'default': {
	 * 			":root": {
	 * 				"--var-name": "value",
	 * 			},
	 * 			"class_name": {
	 * 				"font-family": "name",
	 * 				"font-size": "size",
	 * 			},
	 * 			'class_name_2': {
	 * 				"color": "yellow",
	 * 			}
	 * 		},
	 * 		"laptops": {
	 * 			":root": {
	 * 				"--var-name": "value_2",
	 * 			},
	 * 			"class_name": {
	 * 				"font-family": "name_2",
	 * 				"font-size": "size_2",
	 * 			}
	 * 		},
	 * 		"tablets": {...},
	 * 		"mobiles": {...}
	 * }`
	 */
	function CSSGenerator( collections ) {
		if ( ! isPlainObject( collections ) ) {
			return '';
		}
		var self = this, result = '';
		for ( var screen in collections ) {
			if ( isEmptyObject( collections[ screen ] ) ) {
				continue;
			}
			var collection = collections[ screen ],
				styles = ''; // final css styles
			for ( var name in collection ) {
				if ( ! name || ! isPlainObject( collection[ name ] ) ) {
					continue;
				}
				var props = collection[ name ];
				for ( var prop_name in props ) {
					var prop_value = '' + props[ prop_name ];
					if ( ! prop_name && prop_value === '' ) {
						continue;
					}
					// Wrap in quotes a name that contains a space
					if (
						prop_value.indexOf( ' ' ) > -1
						&& prop_value.indexOf( ',' ) == -1
						&& prop_name.indexOf( 'font-family' ) > -1

					) {
						prop_value = '"' + prop_value + '"';
					}
					// Add a property to styles
					styles += prop_name + ':' + prop_value;
					// If the name is not a variable, then add the !important modifier
					if ( prop_name.indexOf( '--' ) !== 0 ) {
						styles += '!important';
					}
					styles += ';';
				}
				if ( styles ) {
					// Not for pseudo-(classes|elements), add a dot to the name
					if ( name.indexOf( ':' ) !== 0 ) {
						name = '.' + name;
					}
					styles = name + '{' + styles + '}';
				}
			}
			// Check for a breakpoint
			var breakpoint = $usb.config( 'breakpoints.' + screen + '.media', /* default */'' );
			if ( screen !== 'default' && breakpoint ) {
				result += '@media '+ breakpoint + '{' + styles + '}';
			} else {
				result += styles;
			}
		}
		return result + ''; // to string
	}

	// Export API
	$usb.cssGenerator = CSSGenerator;

}( jQuery );
