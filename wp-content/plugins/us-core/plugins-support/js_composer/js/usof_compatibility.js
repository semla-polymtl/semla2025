/**
 * Compatibility and support for USOF in WPBakery Page Builder.
 */
! function( $, _undefined ) {
	"use strict";

	const _window = window;

	_window.$usof = _window.$usof || {};

	/**
	 * @type {RegExp} Regular expression for find space.
	 */
	const REGEXP_SPACE = /\p{Zs}/gu;

	/**
	 * @type {[]} All initialized usofField objects.
	 */
	let _allFieldObjects = {};

	// Functionality for $usof.field compatibility in WPBakery.
	if ( typeof $usof.field === 'function' ) {
		/**
		 * Get the related field.
		 *
		 * @return {$usof.field|undefined} Returns the related field object, otherwise undefined.
		 */
		$usof.field.prototype.getRelatedField = function() {
			const self = this;

			let relatedOn = $ush.toString( self.relatedOn );
			if ( ! relatedOn ) {
				return; // undefined
			}

			// WPBakery, the fields in the group contain a prefix of the group name, so we adjust it for compatibility.
			// relatedOn: `{group_name}|{param_name}` to `{group_name}_{param_name}`
			var $field = self.$row.closest( '.vc_shortcode-param' ),
				$relatedField = $( '[data-name="' + ( relatedOn.replace( '|', '_' ) ) + '"]:first', $field.parent() ),
				usofField = $relatedField.data( 'usofField' );
			//  Set name without a group? relatedOn: {group_name}|{param_name}
			if ( relatedOn.indexOf( '|' ) > -1 ) {
				usofField.name = relatedOn.split( '|' )[/* param_name */1] || relatedOn;
			}

			return usofField;
		};

		/**
		 * Get field object by its name.
		 *
		 * @param {String} name The name.
		 * @return {$usof.field|undefined} Returns a reference to a field object by its name, otherwise undefined.
		 */
		$usof.field.prototype.getFieldByName = ( name ) => {
			if ( name && _allFieldObjects[ name ] instanceof $usof.field ) {
				return _allFieldObjects[ name ];
			}
			return;
		};
	}

	/**
	 * Initializes the usof Field.
	 */
	function initField() {
		const $usofField = $( this );
		if ( $usofField.data( 'usofField' ) ) {
			return;
		}
		const usofField = $usofField.usofField();
		if ( usofField instanceof $usof.field ) {

			// Force value for WPBakery Page Builder.
			if ( usofField.type === 'design_options' ) {
				usofField.forceWPBValue()
			}

			usofField.trigger( 'beforeShow' );
			usofField.setValue( usofField.$input.val() );

			// For related fields, we fire an event to apply the value from this field.
			// Note: In $usof.field['autocomplete'] loads the default items.
			if ( usofField.relatedOn ) {
				var relatedField = usofField.getRelatedField();
				if ( relatedField instanceof $usof.field ) {
					relatedField.trigger( 'change' );
				}
			}

			// The separate hidden field is necessary because WPBakery Page Builder
			// generates additional events that can loop into the USColorPicker.
			if ( usofField.type === 'color' ) {
				var $vcInput = $( 'input.wpb_vc_param_value:first', usofField.$row );
				usofField.on( 'change', () => {
					$vcInput
						.val( usofField.getValue() )
						.attr( 'name', usofField.name )
						.trigger( 'change' );
				} );
			}

			// Run click event to initialize all group settings
			if ( $( 'input.wpb_vc_param_value[name=offset]' ).length == 0 ) {
				let isActive = false;
				$.each( $( '.vc_ui-tabs-line button' ).toArray().reverse(), () => {
					if ( isActive ) {
						return;
					}
					let $tabButton = $( this ),
						vcElementTarget = $tabButton.data( 'vc-ui-element-target' );
					if ( $ush.isUndefined( vcElementTarget ) ) {
						return;
					}
					if ( $( vcElementTarget ).hasClass( 'vc_active' ) ) {
						$tabButton.trigger( 'click' );
						isActive = true;
					}
				} );
			}

			// Save a reference to the field object by name.
			_allFieldObjects[ usofField.name ] = usofField;
		}
	}
	$( '.vc_ui-panel-window.vc_active [data-name]' ).each( initField );

	/**
	 * This handler is required to initialize the USOF fields in each new element of the group.
	 * Note: This handler is an internal callback mechanism that is not documented and is subject to change.
	 *
	 * @type {Function}
	 * @param {Node} $newParam This is a new group param.
	 * @param {String} action The action name.
	 */
	_window._usVcParamGroupAfterAddParam = $ush.debounce( ( $newParam, action ) => {
		if ( action == 'new' || action == 'clone' ) {
			$( '.usof-form-row[data-name]', $newParam ).each( initField );
		}
	}, 1 );

	/**
	 * @type {Function} Handler that implements the `show_if: [ 'param_name', 'str_contains', 'value' ]` functionality on the WPBakery side.
	 */
	_window.us_str_contains_callback = function() {
		$( '.vc_ui-panel-window.vc_active .vc_shortcode-param' ).each( ( i, field ) => {
			let $field = $( field ),
				field_settings = $field.data( 'param_settings' );
			if (
				! $ush.isUndefined( field_settings.dependency )
				&& ! $ush.isUndefined( field_settings.dependency.callback )
				&& field_settings.dependency.callback == 'us_str_contains_callback'
			) {
				// Found the field that has this callback
				let relatedFieldName = field_settings.dependency.callback_element,
					$relatedField = $( '.vc_ui-panel-window.vc_active [name=' + relatedFieldName + ']' ),
					needle = field_settings.dependency.needle;

				$relatedField.on( 'change', () => {
					let relatedValue = $relatedField.val();
					$field.toggleClass( 'vc_dependent-hidden', ! relatedValue.includes( needle ) );
				} );

				$relatedField.trigger( 'change' );
			}
		} );
	};

	// Finds all fields of WPBakery Page Builder type `param_group`
	$( '.vc_ui-panel-window.vc_active .wpb_el_type_param_group' ).each( function( _, node ) {
		// Slight delay to get data after initialization
		$ush.timeout( () => {
			let vcParamObject = $( node ).data( 'vcParamObject' ) || {};
			if ( $.isPlainObject( vcParamObject.options ) ) {
				$.extend( vcParamObject.options, {
					param: {
						callbacks: {
							after_add: '_usVcParamGroupAfterAddParam'
						}
					}
				} );
			}
		}, 800 );
	} );

	/**
	 * @class USIconSetValue USOF Field: Icon for WPBakery Page Builder.
	 * @param {Node} $container The container.
	 */
	function USIconSetValue( $container ) {
		let $select = $( '.us-icon-select', $container ),
			$input = $( '.us-icon-text', $container ),
			$value = $( '.us-icon-value', $container ),
			$preview = $( '.us-icon-preview > i', $container ),
			icon_set = $select.val(),
			icon_name = $input.val().trim(),
			icon_no_resize = icon_name.replace( /fa-\dx/gi, ' ' ),
			icon_val = '';
		if ( icon_name != '' ) {
			if ( icon_set == 'material' ) {
				icon_name = icon_name.replace( REGEXP_SPACE, '_' );
				$preview.attr( 'class', 'material-icons' ).html( icon_name );
			} else {
				$preview.attr( 'class', icon_set + ' fa-' + icon_no_resize ).html( '' );
			}
			icon_val = icon_set + '|' + icon_name;
		} else {
			// Case when remove all text in input at a time, "Crtl+A+Del", for instance
			$preview.removeAttr( 'class' ).html( '' );
		}
		$value.val( icon_val );
	};

	$( '.us-icon-select' ).off( 'change' ).on( 'change', function() {
		let $select = $( this ),
			$container = $select.closest( '.us-icon' ),
			$descContainer = $container.siblings( '.us-icon-desc:first' ),
			$selectedOption = $( ":selected", $select ),
			$setLink = $( '.us-icon-set-link', $descContainer );
		if ( $selectedOption.length ) {
			$setLink.attr( 'href', $selectedOption.data( 'info-url' ) );
		}
		USIconSetValue( $container );
	} );

	$( '.us-icon-text' ).off( 'change keyup' ).on( 'change keyup', function() {
		let $input = $( this ),
			$container = $input.closest( '.us-icon' ),
			val = $input.val();
		if ( val.toLowerCase().replace( REGEXP_SPACE, '' ) !== val ) {
			$input.val( $ush.toLowerCase( val ).trim() );
		}
		USIconSetValue( $container );
	} );

}( jQuery );
