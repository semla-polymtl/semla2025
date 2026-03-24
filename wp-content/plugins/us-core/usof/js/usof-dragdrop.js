! function( $, _undefined ) {
	"use strict";

	/**
	 * USOF Drag & Drop
	 * Triggers: init, initDragDrop, destroyDragDrop, dragstart, changed, drop, dragend
	 *
	 * @param {String|Node} container
	 * @param {String} itemSelector
	 * @param {Boolean} checkDraggable [optional]
	 * @return {$usof.dragDrop} Returns the Drag & Drop instance
	 */
	$usof.dragDrop = function( container, itemSelector, checkDraggable ) {
		let self = this;

		// Private "Variables"
		self.itemSelector = itemSelector;
		self.checkDraggable = checkDraggable;
		self.isPlaceAfter = false;

		/**
		 * @var {{}} Bondable events
		 */
		self._events = {
			dragstart: self._dragstart.bind( self ),
			dragover: self._dragover.bind( self ),
			drop: self._drop.bind( self ),
			dragend: self._dragend.bind( self ),
		};

		// Elements
		self.$container = $( container );
		self.init();
	};

	// Drag & Drop API
	$.extend( $usof.dragDrop.prototype, $usof.mixins.Events, {
		init: function() {
			let self = this;
			self.$container
				.addClass( 'usof-dragdrop' )
				.data( 'usof.dragDrop', self )
				.on( 'mousedown', self.itemSelector, function( e ) {
					if ( self.checkDraggable && ! e.target.className.includes( 'usof_draggable' ) ) {
						return true;
					}
					let $currentTarget = $( e.currentTarget );
					$currentTarget
						.addClass( 'drag_selected' );
					if ( ! $currentTarget.is( '[draggable="false"]' ) ) {
						$currentTarget.attr( 'draggable', true );
					}
					self.initDragDrop();
				} )
				.on( 'mouseup', self.itemSelector, function( e ) {
					$( '> [class*=drag_]', self.$container )
						.removeClass( 'drag_selected drag_place_before drag_place_after' );
					$( e.currentTarget )
						.removeAttr( 'draggable' );
					self.destroyDragDrop();
				} );

			self.trigger( 'init' );
		},

		initDragDrop: function() {
			let self = this,
				itemSelector = self.itemSelector;
			self.$container
				.on( 'dragstart', itemSelector, self._events.dragstart )
				.on( 'dragover', itemSelector, self._events.dragover )
				.on( 'drop', itemSelector, self._events.drop )
				.on( 'dragend', itemSelector, self._events.dragend )
				.addClass( 'init_dragdrop' );
			self.trigger( 'initDragDrop' );
		},

		destroyDragDrop: function() {
			let self = this,
				itemSelector = self.itemSelector;
			if ( ! self.$container.hasClass( 'initDragDrop' ) ) {
				return;
			}
			self.$container
				.off( 'dragstart', itemSelector, self._events.dragstart )
				.off( 'dragover', itemSelector, self._events.dragover )
				.off( 'drop', itemSelector, self._events.drop )
				.off( 'dragend', itemSelector, self._events.dragend )
				.removeClass( 'init_dragdrop' );
			self.trigger( 'destroyDragDrop' );
		},

		_dragstart: function( e ) {
			e.stopPropagation();
			let self = this,
				$currentTarget = $( e.currentTarget );
			self.$container.addClass( 'drag_moving' );
			$currentTarget.addClass( 'drag_move' );
			e.originalEvent.dataTransfer.effectAllowed = 'move';
			e.originalEvent.dataTransfer.setDragImage( e.currentTarget, 0, $ush.$rect( e.currentTarget ).height / 2 );
			self.startIndex = $currentTarget.index();
			self.trigger( 'dragstart' );
		},

		_dragover: function( e ) {
			e.preventDefault();
			let self = this,
				$currentTarget = $( e.currentTarget );
			self.isPlaceAfter = (
				$currentTarget.is( ':last-child' )
				&& e.offsetY >= ( $ush.$rect( e.currentTarget ).height / 2 )
			);
			$( '> [class*=drag_]', self.$container )
				.removeClass( 'drag_place_before drag_place_after' );
			$currentTarget
				.addClass( self.isPlaceAfter ? 'drag_place_after' : 'drag_place_before' );
		},

		_drop: function( e ) {
			e.stopPropagation();
			let self = this,
				$currentTarget = $( e.currentTarget ),
				currentIndex = $currentTarget.index(),
				$move = $( '.drag_move', self.$container );
			if ( self.isPlaceAfter ) {
				$currentTarget.after( $move );
			} else {
				$currentTarget.before( $move );
			}
			$currentTarget
				.removeClass( 'drag_move drag_place_before drag_place_after' );
			if ( currentIndex !== self.startIndex ) {
				self.trigger( 'changed' );
			}
			self.trigger( 'drop' );
		},

		_dragend: function( e ) {
			let self = this;
			e.stopPropagation();
			self.$container
				.removeClass( 'drag_moving' );
			$( '> [class*=drag_]', self.$container )
				.removeAttr( 'draggable' )
				.removeClass( 'drag_selected drag_move drag_place_before drag_place_after' );
			self.trigger( 'dragend' );
		}
	} );

	$.fn.usofDragDrop = function( options ) {
		return this.each( function() {
			if ( ! $.data( this, 'usofDragDrop' ) ) {
				$.data( this, 'usofDragDrop', new $usof.dragDrop( this, options ) );
			}
		} );
	};

} ( jQuery );
