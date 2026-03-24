/**
 * UpSolution Element: Grid
 */
;( function( $, _undefined ) {
	"use strict";

	var _document = document,
		_window = window;

	$us.WGrid = function( container, options ) {
		this.init( container, options );
	};

	$us.WGrid.prototype = {
		init: function( container, options ) {
			const self = this;

			// Elements
			this.$container = $( container );
			this.$filters = $( '.g-filters-item', this.$container ); // Built-in filters
			this.$list = $( '.w-grid-list', this.$container );
			this.$loadmore = $( '.g-loadmore', this.$container );
			this.$pagination = $( '> .pagination', this.$container );
			this.$preloader = $( '.w-grid-preloader', this.$container );
			this.$style = $( '> style:first', this.$container );

			// Variables
			this.loading = false;
			this.changeUpdateState = false;
			this.gridFilter = null;

			this.curFilterTaxonomy = '';
			this.paginationType = this.$pagination.length
				? 'regular'
				: ( this.$loadmore.length ? 'ajax' : 'none' );
			this.filterTaxonomyName = this.$list.data( 'filter_taxonomy_name' )
				? this.$list.data( 'filter_taxonomy_name' )
				: 'category';

			// Prevent double init.
			if ( this.$container.data( 'gridInit' ) == 1 ) {
				return;
			}
			this.$container.data( 'gridInit', 1 );

			// Bondable events
			self._events = {
				updateState: self._updateState.bind( self ),
				updateOrderBy: self._updateOrderBy.bind( self ),
				initMagnificPopup: self._initMagnificPopup.bind( self ),
				usbReloadIsotopeLayout: self._usbReloadIsotopeLayout.bind( self ),
			};

			var $jsonContainer = $( '.w-grid-json', this.$container );
			if ( $jsonContainer.length && $jsonContainer.is( '[onclick]' ) ) {
				this.ajaxData = $jsonContainer[ 0 ].onclick() || {};
				// Delete data everywhere except for the preview of the USBuilder, the data may be needed again to restore the elements.
				if ( ! $us.usbPreview() ) $jsonContainer.remove();
				// In case JSON data container isn't present.
			} else {
				this.ajaxData = {};
				this.ajaxUrl = '';
			}

			if ( this.$list.hasClass( 'owl-carousel' ) ) {

				// Predefined options suitable for content carousel
				// https://owlcarousel2.github.io/OwlCarousel2/docs/api-options.html
				let carouselOptions = {
					navElement: 'button',
					navText: [ '', '' ],
					responsiveRefreshRate: 100,
				}

				$.extend( carouselOptions, this.ajaxData.carousel_settings || {} );

				// To prevent scroll blocking on mobiles
				if ( $us.$html.hasClass( 'touch' ) || $us.$html.hasClass( 'ios-touch' ) ) {
					$.extend( carouselOptions, {
						mouseDrag: false,
					} );
				}

				// Override specific options for proper operation in Live Builder
				if ( $us.usbPreview() ) {
					$.extend( carouselOptions, {
						autoplayHoverPause: true,
						mouseDrag: false,
						touchDrag: false,
						loop: false,
					} );
				}

				if ( carouselOptions.autoplayContinual ) {
					carouselOptions.slideTransition = 'linear';
					carouselOptions.autoplaySpeed = carouselOptions.autoplayTimeout;
					carouselOptions.smartSpeed = carouselOptions.autoplayTimeout;
					if ( ! carouselOptions.autoWidth ) {
						carouselOptions.slideBy = 1;
					}
				}

				// Re-init for "Show More" link after carousel init to set correct height.
				self.$list.on( 'initialized.owl.carousel', function( e ) {
					var $list = self.$list,
						$toggleLinks = $( '[data-content-height]', e.currentTarget );
					// Refresh for Toggle Links
					$toggleLinks.each( ( _, node ) => {
						var $node = $( node ),
							usCollapsibleContent = $node.data( 'usCollapsibleContent' );
						// Init for nodes that are cloned
						if ( $ush.isUndefined( usCollapsibleContent ) ) {
							usCollapsibleContent = $node.usCollapsibleContent().data( 'usCollapsibleContent' );
						}
						usCollapsibleContent.setHeight();
						$ush.timeout( () => {
							$list.trigger( 'refresh.owl.carousel' );
						}, 1 );
					} );
					// Refresh for active tabs
					if ( $.isMobile && $list.closest( '.w-tabs-section.active' ).length ) {
						$ush.timeout( () => {
							$list.trigger( 'refresh.owl.carousel' );
						}, 50 );
					}
					// Updates the carousel height to expanded and collapsed text
					if ( carouselOptions.autoHeight ) {
						$toggleLinks.on( 'showContent', () => {
							$list.trigger( 'refresh.owl.carousel' );
						} );
					}
				} );

				// Due to the nature of the carousel, we perform the completion of movements,
				// sometimes errors occur here when clicking on third-party elements.
				self.$list.on( 'mousedown.owl.core', ( e ) => {
					if ( $( e.target ).is( '[class^="collapsible-content-"]' ) ) {
						let owlCarousel = self.$list.data( 'owl.carousel' );
						if ( owlCarousel.settings.mouseDrag ) {
							owlCarousel.$stage.trigger( 'mouseup.owl.core' );
						}
						if ( owlCarousel.settings.touchDrag ) {
							owlCarousel.$stage.trigger( 'touchcancel.owl.core' );
						}
					}
				} );

				var owlCarousel = self.$list.owlCarousel( carouselOptions ).data( 'owl.carousel' );

				if ( owlCarousel && carouselOptions.autoplayContinual ) {
					this.$list.trigger( 'next.owl.carousel' );
				}

				// Set aria labels for navigation
				if (
					owlCarousel
					&& carouselOptions.aria_labels.prev
					&& carouselOptions.aria_labels.next
				) {
					owlCarousel.$element.find( '.owl-prev' ).attr( 'aria-label', carouselOptions.aria_labels.prev );
					owlCarousel.$element.find( '.owl-next' ).attr( 'aria-label', carouselOptions.aria_labels.next );
				}
			}

			// Note: Product List has its own handler for displaying products in the popup.
			if (
				this.$container.hasClass( 'open_items_in_popup' )
				&& ! this.$container.hasClass( 'us_post_list' )
				&& ! this.$container.hasClass( 'us_product_list' )
				&& ! $ush.isUndefined( this.ajaxData )
			) {

				// Variables
				this.lightboxOpened = false;
				this.lightboxTimer = null;
				this.originalURL = _window.location.href;

				// Elements
				this.$popup = $( '.l-popup', this.$container );
				this.$popupBox = $( '.l-popup-box', this.$popup );
				this.$popupContentPreloader = $( '.l-popup-box-content .g-preloader', this.$popup );
				this.$popupContentFrame = $( '.l-popup-box-content-frame', this.$popup );
				this.$popupNextArrow = $( '.l-popup-arrow.to_next', this.$popup );
				this.$popupPrevArrow = $( '.l-popup-arrow.to_prev', this.$popup );

				$us.$body.append( this.$popup );

				// Initializes the lightbox anchors
				this.initLightboxAnchors();

				// Events
				this.$popup
					.on( 'click', '.l-popup-closer', this.hideLightbox.bind( this ) )
					.on( 'click', '.l-popup-box', this.hideLightbox.bind( this ) )
					.on( 'click', '.l-popup-box-content', function( e ) {
						e.stopPropagation();
					} );

				$us.$window.on( 'resize', function() {
					if ( this.lightboxOpened && $us.$window.width() < $us.canvasOptions.disableEffectsWidth ) {
						this.hideLightbox();
					}
				}.bind( this ) );
			}

			if ( this.$list.hasClass( 'owl-carousel' ) ) {
				return;
			}

			if ( this.paginationType != 'none' || this.$filters.length ) {
				if ( this.ajaxData == _undefined ) {
					return;
				}

				this.templateVars = this.ajaxData.template_vars || {};
				if ( this.filterTaxonomyName ) {
					this.initialFilterTaxonomy = this.$list.data( 'filter_default_taxonomies' )
						? this.$list.data( 'filter_default_taxonomies' ).toString().split( ',' )
						: '';
					this.curFilterTaxonomy = this.initialFilterTaxonomy;
				}

				this.curPage = this.ajaxData.current_page || 1;
				this.infiniteScroll = this.ajaxData.infinite_scroll || 0;
			}

			if ( this.$container.hasClass( 'with_isotope' ) ) {

				this.$list.imagesLoaded( function() {
					var smallestItemSelector,
						isotopeOptions = {
							itemSelector: '.w-grid-item',
							layoutMode: ( this.$container.hasClass( 'isotope_fit_rows' ) ) ? 'fitRows' : 'masonry',
							isOriginLeft: ! $( '.l-body' ).hasClass( 'rtl' ),
							transitionDuration: 0
						};

					if ( this.$list.find( '.size_1x1' ).length ) {
						smallestItemSelector = '.size_1x1';
					} else if ( this.$list.find( '.size_1x2' ).length ) {
						smallestItemSelector = '.size_1x2';
					} else if ( this.$list.find( '.size_2x1' ).length ) {
						smallestItemSelector = '.size_2x1';
					} else if ( this.$list.find( '.size_2x2' ).length ) {
						smallestItemSelector = '.size_2x2';
					}
					if ( smallestItemSelector ) {
						smallestItemSelector = smallestItemSelector || '.w-grid-item';
						isotopeOptions.masonry = { columnWidth: smallestItemSelector };
					}

					// Launching CSS animation locally after building elements in isotope.
					this.$list.on( 'layoutComplete', function() {
						if ( _window.USAnimate ) {
							$( '.w-grid-item.off_autostart', this.$list )
								.removeClass( 'off_autostart' );
							new USAnimate( this.$list );
						}
						// Trigger scroll event to check the positions for $us.waypoints.
						$us.$window.trigger( 'scroll.waypoints' );
					}.bind( this ) );

					this.$list.isotope( isotopeOptions );

					if ( this.paginationType == 'ajax' ) {
						this.initAjaxPagination();
					}
					$us.$canvas.on( 'contentChange', function() {
						this.$list.imagesLoaded( function() {
							this.$list.isotope( 'layout' );
						}.bind( this ) );
					}.bind( this ) );

				}.bind( this ) );

				// Events
				self.$container.on( 'usbReloadIsotopeLayout', self._events.usbReloadIsotopeLayout );

			} else if ( this.paginationType == 'ajax' ) {
				this.initAjaxPagination();
			}

			this.$filters.each( function( index, filter ) {
				var $filter = $( filter ),
					taxonomy = $filter.data( 'taxonomy' );
				$filter.on( 'click', function() {
					if ( taxonomy != this.curFilterTaxonomy ) {
						if ( this.loading ) {
							return;
						}
						this.setState( 1, taxonomy );
						this.$filters.removeClass( 'active' );
						$filter.addClass( 'active' );
					}
				}.bind( this ) )
			}.bind( this ) );

			// This is necessary for interaction from the Grid Filter or Grid Order.
			if ( this.$container.closest( '.l-main' ).length ) {
				$us.$body
					.on( 'us_grid.updateState', self._events.updateState )
					.on( 'us_grid.updateOrderBy', self._events.updateOrderBy );
			}

			// Events
			this.$list.on( 'click', '[ref=magnificPopup]', self._events.initMagnificPopup );
		},

		/**
		 * Update Grid State.
		 *
		 * @param {Event} e
		 * @param {string} queryString Query string containing Grid Filter parameters
		 * @param {number} page
		 * @param {object} gridFilter
		 */
		_updateState: function( e, queryString, page, gridFilter ) {
			var $container = this.$container;
			if (
				! $container.is( '[data-filterable="true"]' )
				|| ! $container.hasClass( 'used_by_grid_filter' )
				|| (
					! $container.is( ':visible' )
					&& ! $container.hasClass( 'hidden' )
				)
			) {
				return;
			}

			page = page || 1;
			this.changeUpdateState = true;
			this.gridFilter = gridFilter;

			// Is load grid content
			if ( this.ajaxData === _undefined ) {
				this.ajaxData = {};
			}

			if ( ! this.hasOwnProperty( 'templateVars' ) ) {
				this.templateVars = this.ajaxData.template_vars || {
					query_args: {}
				};
			}
			this.templateVars.us_grid_filter_query_string = queryString;
			if ( this.templateVars.query_args !== false ) {
				this.templateVars.query_args.paged = page;
			}

			// Related parameters for getting data, number of records for taxonomy, price range for WooCommerce,
			// etc.
			this.templateVars.filters_args = gridFilter.filtersArgs || {};
			this.setState( page );

			// Reset pagination
			if ( this.paginationType === 'regular' && /page(=|\/)/.test( location.href ) ) {
				var url = location.href.replace( /(page(=|\/))(\d+)(\/?)/, '$1' + page + '$2' );
				if ( history.replaceState ) {
					history.replaceState( _document.title, _document.title, url );
				}
			}
		},

		/**
		 * Update Grid orderby.
		 *
		 * @param {Event} e
		 * @param string orderby String for order by params.
		 * @param {number} page
		 * @param {object} gridOrder
		 */
		_updateOrderBy: function( e, orderby, page, gridOrder ) {
			if (
				! this.$container.is( '[data-filterable="true"]' )
				|| ! this.$container.hasClass( 'used_by_grid_order' )
			) {
				return;
			}

			page = page || 1;
			this.changeUpdateState = true;
			if ( ! this.hasOwnProperty( 'templateVars' ) ) {
				this.templateVars = this.ajaxData.template_vars || {
					query_args: {}
				};
			}
			if ( this.templateVars.query_args !== false ) {
				this.templateVars.query_args.paged = page;
			}
			this.templateVars.grid_orderby = orderby;
			this.setState( page );
		},

		/**
		 * Initializing MagnificPopup for AJAX loaded items.
		 *
		 * @param {Event} e
		 */
		_initMagnificPopup: function( e ) {
			e.stopPropagation();
			e.preventDefault();
			var $target = $( e.currentTarget );
			if ( $target.data( 'magnificPopup' ) === _undefined ) {
				$target.magnificPopup( {
					type: 'image',
					mainClass: 'mfp-fade'
				} );
				$target.trigger( 'click' );
			}
		},

		/**
		 * Reload layout in the Live Builder context.
		 *
		 * @event handler
		 */
		_usbReloadIsotopeLayout: function() {
			const self = this;
			if ( self.$container.hasClass( 'with_isotope' ) ) {
				self.$list.isotope( 'layout' );
			}
		},

		/**
		 * Initializes the lightbox anchors
		 */
		initLightboxAnchors: function() {
			var self = this;
			$( '.w-grid-item-anchor:not(.lightbox_init)', self.$list ).on( 'click', function( e ) {
				var $item = $( e.target ).closest( '.w-grid-item' ),
					url = $( '.w-grid-item-anchor', $item ).attr( 'href' );
				if ( ! $item.hasClass( 'custom-link' ) ) {
					if ( $us.$window.width() >= $us.canvasOptions.disableEffectsWidth ) {
						e.stopPropagation();
						e.preventDefault();
						self.openLightboxItem( url, $item );
						$item.addClass( 'lightbox_init' );
					}
				}
			} );
		},

		// Pagination and Filters functions.
		initAjaxPagination: function() {
			this.$loadmore.on( 'click', function() {
				if ( this.curPage < this.ajaxData.max_num_pages ) {
					this.setState( this.curPage + 1 );
				}
			}.bind( this ) );

			if ( this.infiniteScroll ) {
				$us.waypoints.add( this.$loadmore, /* offset */'-70%', function() {
					if ( ! this.loading ) {
						this.$loadmore.click();
					}
				}.bind( this ) );
			}
		},
		setState: function( page, taxonomy ) {
			if ( this.loading && ! this.changeUpdateState ) {
				return;
			}

			if (
				page !== 1
				&& this.paginationType == 'ajax'
				&& this.none !== _undefined
				&& this.none == true
			) {
				return;
			}

			this.none = false;
			this.loading = true;

			// Hide element by default
			this.$container
				.next( '.w-grid-none' )
				.addClass( 'hidden' );

			// Create params for built-in filter
			if ( this.$filters.length && ! this.changeUpdateState ) {
				taxonomy = taxonomy || this.curFilterTaxonomy;
				if ( taxonomy == '*' ) {
					taxonomy = this.initialFilterTaxonomy;
				}

				if ( taxonomy != '' ) {
					var newTaxArgs = {
							'taxonomy': this.filterTaxonomyName,
							'field': 'slug',
							'terms': taxonomy
						},
						taxQueryFound = false;
					if ( this.templateVars.query_args.tax_query == _undefined ) {
						this.templateVars.query_args.tax_query = [];
					} else {
						$.each( this.templateVars.query_args.tax_query, function( index, taxArgs ) {
							if ( taxArgs != null && taxArgs.taxonomy == this.filterTaxonomyName ) {
								this.templateVars.query_args.tax_query[ index ] = newTaxArgs;
								taxQueryFound = true;
								return false;
							}
						}.bind( this ) );
					}
					if ( ! taxQueryFound ) {
						this.templateVars.query_args.tax_query.push( newTaxArgs );
					}
				} else if ( this.templateVars.query_args.tax_query != _undefined ) {
					$.each( this.templateVars.query_args.tax_query, function( index, taxArgs ) {
						if ( taxArgs != null && taxArgs.taxonomy == this.filterTaxonomyName ) {
							this.templateVars.query_args.tax_query[ index ] = null;
							return false;
						}
					}.bind( this ) );
				}
			}

			if ( this.templateVars.query_args !== false ) {
				this.templateVars.query_args.paged = page;
			}

			if ( this.paginationType == 'ajax' ) {
				if ( page == 1 ) {
					this.$loadmore.addClass( 'done' );
				} else {
					this.$loadmore.addClass( 'loading' );
				}
				if ( ! this.infiniteScroll ) {
					this.prevScrollTop = $us.$window.scrollTop();
				}
			}

			if ( this.paginationType != 'ajax' || page == 1 ) {
				this.$preloader.addClass( 'active' );
				if ( this.$list.data( 'isotope' ) ) {
					this.$list.isotope( 'remove', this.$container.find( '.w-grid-item' ) );
					this.$list.isotope( 'layout' );
				} else {
					this.$container.find( '.w-grid-item' ).remove();
				}
			}

			this.ajaxData.template_vars = JSON.stringify( this.templateVars );

			var isotope = this.$list.data( 'isotope' );
			// Clear isotope elements on first page load
			if ( isotope && page == 1 ) {
				this.$list.html( '' );
				isotope.remove( isotope.items );
				isotope.reloadItems();
			}

			// Abort prev request
			if ( this.xhr !== _undefined ) {
				this.xhr.abort();
			}

			this.xhr = $.ajax( {
				type: 'post',
				url: $us.ajaxUrl,
				data: this.ajaxData,
				cache: false,
				beforeSend: function() {
					// Display the grid before submitting the request
					this.$container
						.removeClass( 'hidden' );
				}.bind( this ),
				success: function( html ) {
					var $result = $( html ),
						// Note: Get the `first()` list since there may be several of them due to
						// the output of grids in `w-grid-none`
						$container = $( '.w-grid-list', $result ).first(),
						$pagination = $( '.pagination > *', $result ),
						$items = $container.children(),
						smallestItemSelector;

					// Hide the grid if there is no result if action 'Hide this Grid' is enabled
					this.$container
						.toggleClass( 'hidden', ! $items.length );

					$container.imagesLoaded( function() {
						this.beforeAppendItems( $items );
						//isotope.options.hiddenStyle.transform = '';
						$items.appendTo( this.$list );
						$container.html( '' );
						var $sliders = $items.find( '.w-slider' );

						if ( isotope ) {
							isotope.insert( $items );
							isotope.reloadItems();
						}

						if ( $sliders.length ) {
							$sliders.each( function( index, slider ) {
								$( slider ).usImageSlider().find( '.royalSlider' ).data( 'royalSlider' ).ev.on( 'rsAfterInit', function() {
									if ( isotope ) {
										this.$list.isotope( 'layout' );
									}
								} );
							}.bind( this ) );

						}

						if ( isotope ) {
							if ( this.$list.find( '.size_1x1' ).length ) {
								smallestItemSelector = '.size_1x1';
							} else if ( this.$list.find( '.size_1x2' ).length ) {
								smallestItemSelector = '.size_1x2';
							} else if ( this.$list.find( '.size_2x1' ).length ) {
								smallestItemSelector = '.size_2x1';
							} else if ( this.$list.find( '.size_2x2' ).length ) {
								smallestItemSelector = '.size_2x2';
							}
							if ( isotope.options.masonry ) {
								isotope.options.masonry.columnWidth = smallestItemSelector || '.w-grid-item';
							}
							this.$list.isotope( 'layout' );
							this.$list.trigger( 'layoutComplete' );
						}

						if ( this.paginationType == 'ajax' ) {

							if ( page == 1 ) {
								var $jsonContainer = $result.find( '.w-grid-json' );
								if ( $jsonContainer.length ) {
									var ajaxData = $jsonContainer[ 0 ].onclick() || {};
									this.ajaxData.max_num_pages = ajaxData.max_num_pages || this.ajaxData.max_num_pages;
								} else {
									this.ajaxData.max_num_pages = 1;
								}
							}

							if ( this.templateVars.query_args.paged >= this.ajaxData.max_num_pages || ! $items.length ) {
								this.$loadmore.addClass( 'done' );
							} else {
								this.$loadmore
									.removeClass( 'done' )
									.removeClass( 'loading' );
							}

							if ( this.infiniteScroll ) {
								$us.waypoints.add( this.$loadmore, /* offset */'-70%', function() {
									if ( ! this.loading ) {
										// check none
										this.$loadmore.click();
									}
								}.bind( this ) );

								// If the scroll value has changed, then scroll to the starting position,
								// as in some browsers this is not true. After loading the data, the scroll is not
								// calculated correctly.
							} else if ( Math.round( this.prevScrollTop ) != Math.round( $us.$window.scrollTop() ) ) {
								$us.$window.scrollTop( this.prevScrollTop );
							}

						} else if ( this.paginationType === 'regular' && this.changeUpdateState ) {
							// Pagination Link Correction
							$( 'a[href]', $pagination ).each( function( _, item ) {
								var $item = $( item ),
									pathname = location.pathname.replace( /((\/page.*)?)\/$/, '' );
								$item.attr( 'href', pathname + $item.attr( 'href' ) );
							} );
							this.$pagination.html( $pagination );
						}

						// Initialize all new anchors for lightbox
						if ( this.$container.hasClass( 'open_items_in_popup' ) ) {
							this.initLightboxAnchors();
						}

						// The display a message in the absence of data.
						var $result_none = $result.next( '.w-grid-none' );
						if ( this.changeUpdateState && $result_none.length ) {
							var $none = this.$container.next( '.w-grid-none' );
							if ( $none.length ) {
								$none.removeClass( 'hidden' );
							} else {
								this.$container.after( $result_none );
							}
							// If the result contains a grid that can be Reusable Block, then we will initialize
							var $nextGrid = $( '.w-grid:first', this.$container.next( '.w-grid-none' ) );
							if ( $nextGrid.length ) {
								$nextGrid.wGrid();
							}
							this.none = true;
						}

						// Send the result to the filter grid.
						if ( this.changeUpdateState && this.gridFilter ) {
							var $jsonData = $result.filter( '.w-grid-filter-json-data:first' );
							if ( $jsonData.length ) {
								this.gridFilter
									.trigger( 'us_grid_filter.update-items-amount', $jsonData[ 0 ].onclick() || {} );
							}
							$jsonData.remove();
						}

						// Add custom styles to Grid.
						var customStyles = $( 'style#grid-post-content-css', $result ).html() || '';
						if ( customStyles ) {
							if ( ! this.$style.length ) {
								this.$style = $( '<style></style>' );
								this.$container.append( this.$style );
							}
							this.$style.text( this.$style.text() + customStyles );
						}

						// Resize canvas to avoid Parallax calculation issues.
						$us.$canvas.resize();
						this.$preloader.removeClass( 'active' );

						// Init load animation
						if ( _window.USAnimate && this.$container.hasClass( 'with_css_animation' ) ) {
							new USAnimate( this.$container );
						}

						// List items loaded
						$ush.timeout( () => {
							$us.$document.trigger( 'usGrid.itemsLoaded', [ $items ] );
						}, 1 );

					}.bind( this ) );

					// Scroll to top of grid
					this._scrollToGrid();

					this.loading = false;

					// Trigger custom event on success, might be used by 3rd party devs
					// TODO: Remove the trigger and prompt customers to register at "usGrid.itemsLoaded".
					this.$container.trigger( 'USGridItemsLoaded' );

				}.bind( this ),
				error: function() {
					this.$loadmore.removeClass( 'loading' );
				}.bind( this )
			} );

			this.curPage = page;
			this.curFilterTaxonomy = taxonomy;
		},
		// Scroll to top of grid
		_scrollToGrid: function() {
			var self = this;
			// Check, if it's not load more and orderby
			if ( self.curPage !== 1 ) {
				return;
			}
			var gridPos = $ush.parseInt( this.$container.offset().top ),
				scrollTop = $us.$window.scrollTop();
			if (
				scrollTop >= gridPos
				|| gridPos >= ( scrollTop + _window.innerHeight )
			) {
				$us.$htmlBody
					.stop( true, false )
					.animate( { scrollTop: ( gridPos - $us.header.getCurrentHeight() ) }, 500 );
			}
		},
		// Lightbox Functions.
		_hasScrollbar: function() {
			return _document.documentElement.scrollHeight > _document.documentElement.clientHeight;
		},
		_getScrollbarSize: function() {
			if ( $us.scrollbarSize === _undefined ) {
				var scrollDiv = _document.createElement( 'div' );
				scrollDiv.style.cssText = 'width: 99px; height: 99px; overflow: scroll; position: absolute; top: -9999px;';
				_document.body.appendChild( scrollDiv );
				$us.scrollbarSize = scrollDiv.offsetWidth - scrollDiv.clientWidth;
				_document.body.removeChild( scrollDiv );
			}
			return $us.scrollbarSize;
		},
		openLightboxItem: function( itemUrl, $item ) {
			this.showLightbox();

			var prevIndex,
				nextIndex,
				currentIndex = 0,
				items = $( '.w-grid-item:visible:not(.custom-link)', this.$container ).toArray();
			for ( var i in items ) {
				if ( $item.is( items[ i ] ) ) {
					currentIndex = parseInt( i );
					break;
				}
			}
			// Get prev/next index
			if ( currentIndex > 0 ) {
				prevIndex = currentIndex - 1;
			}
			if ( currentIndex < items.length ) {
				nextIndex = currentIndex + 1;
			}

			var $prevItem = $( typeof prevIndex === 'number' ? items[ prevIndex ] : '' ),
				$nextItem = $( typeof nextIndex === 'number' ? items[ nextIndex ] : '' );

			if ( $nextItem.length > 0 ) {
				this.$popupNextArrow.removeClass( 'hidden' );
				this.$popupNextArrow.attr( 'title', $nextItem.find( '.w-grid-item-title' ).text() );
				this.$popupNextArrow.off( 'click' ).click( function( e ) {
					var $nextItemAnchor = $nextItem.find( '.w-grid-item-anchor' ),
						nextItemUrl = $nextItemAnchor.attr( 'href' );
					e.stopPropagation();
					e.preventDefault();

					this.openLightboxItem( nextItemUrl, $nextItem );
				}.bind( this ) );
			} else {
				this.$popupNextArrow.attr( 'title', '' );
				this.$popupNextArrow.addClass( 'hidden' );
			}

			if ( $prevItem.length > 0 ) {
				this.$popupPrevArrow.removeClass( 'hidden' );
				this.$popupPrevArrow.attr( 'title', $prevItem.find( '.w-grid-item-title' ).text() );
				this.$popupPrevArrow.off( 'click' ).on( 'click', function( e ) {
					var $prevItemAnchor = $prevItem.find( '.w-grid-item-anchor' ),
						prevItemUrl = $prevItemAnchor.attr( 'href' );
					e.stopPropagation();
					e.preventDefault();

					this.openLightboxItem( prevItemUrl, $prevItem );
				}.bind( this ) );
			} else {
				this.$popupPrevArrow.attr( 'title', '' );
				this.$popupPrevArrow.addClass( 'hidden' );
			}

			if ( itemUrl.indexOf( '?' ) !== - 1 ) {
				this.$popupContentFrame.attr( 'src', itemUrl + '&us_iframe=1' );
			} else {
				this.$popupContentFrame.attr( 'src', itemUrl + '?us_iframe=1' );
			}

			// Replace window location with item's URL
			if ( history.replaceState ) {
				history.replaceState( null, null, itemUrl );
			}
			this.$popupContentFrame.off( 'load' ).on( 'load', function() {
				this.lightboxContentLoaded();
			}.bind( this ) );

		},
		lightboxContentLoaded: function() {
			this.$popupContentPreloader.css( 'display', 'none' );
			this.$popupContentFrame
				.contents()
				.find( 'body' )
				.off( 'keyup.usCloseLightbox' )
				.on( 'keyup.usCloseLightbox', function( e ) {
					if ( $ush.toLowerCase( e.key ) === 'escape' ) {
						this.hideLightbox();
					}
				}.bind( this ) );
		},
		showLightbox: function() {
			clearTimeout( this.lightboxTimer );
			this.$popup.addClass( 'active' );
			this.lightboxOpened = true;

			this.$popupContentPreloader.css( 'display', 'block' );
			$us.$html.addClass( 'usoverlay_fixed' );

			if ( ! $.isMobile ) {
				// Storing the value for the whole popup visibility session
				this.windowHasScrollbar = this._hasScrollbar();
				if ( this.windowHasScrollbar && this._getScrollbarSize() ) {
					$us.$html.css( 'margin-right', this._getScrollbarSize() );
				}
			}
			this.lightboxTimer = setTimeout( function() {
				this.afterShowLightbox();
			}.bind( this ), 25 );
		},
		afterShowLightbox: function() {
			clearTimeout( this.lightboxTimer );

			this.$container.on( 'keyup', function( e ) {
				if ( this.$container.hasClass( 'open_items_in_popup' ) ) {
					if ( $ush.toLowerCase( e.key ) === 'escape' ) {
						this.hideLightbox();
					}
				}
			}.bind( this ) );

			this.$popupBox.addClass( 'show' );
			$us.$canvas.trigger( 'contentChange' );
			$us.$window.trigger( 'resize' );
		},
		hideLightbox: function() {
			clearTimeout( this.lightboxTimer );
			this.lightboxOpened = false;
			this.$popupBox.removeClass( 'show' );

			// Replace window location back to original URL
			if ( history.replaceState ) {
				history.replaceState( null, null, this.originalURL );
			}

			this.lightboxTimer = setTimeout( function() {
				this.afterHideLightbox();
			}.bind( this ), 500 );
		},
		afterHideLightbox: function() {
			this.$container.off( 'keyup' );
			clearTimeout( this.lightboxTimer );
			this.$popup.removeClass( 'active' );

			this.$popupContentFrame.attr( 'src', 'about:blank' );
			$us.$html.removeClass( 'usoverlay_fixed' );
			if ( ! $.isMobile ) {
				if ( this.windowHasScrollbar ) {
					$us.$html.css( 'margin-right', '' );
				}
			}
		},
		/**
		 * Overloadable function for themes.
		 *
		 * @param $items
		 */
		beforeAppendItems: function( $items ) {
			// Init `Show More` for grid items loaded by AJAX
			if ( $( '[data-content-height]', $items ).length ) {
				var handle = $ush.timeout( function() {
					$( '[data-content-height]', $items ).usCollapsibleContent();
					$ush.clearTimeout( handle );
				}, 1 );
			}
		}

	};

	$.fn.wGrid = function( options ) {
		return this.each( function() {
			$( this ).data( 'wGrid', new $us.WGrid( this, options ) );
		} );
	};

	$( function() {
		$( '.w-grid' ).wGrid();
	} );

	$( '.w-grid-list' ).each( function() {
		var $list = $( this );
		if ( ! $list.find( '[ref=magnificPopupGrid]' ).length ) {
			return;
		}
		var delegateStr = 'a[ref=magnificPopupGrid]:visible',
			popupOptions;
		if ( $list.hasClass( 'owl-carousel' ) ) {
			delegateStr = '.owl-item:not(.cloned) a[ref=magnificPopupGrid]';
		}
		popupOptions = {
			type: 'image',
			delegate: delegateStr,
			gallery: {
				enabled: true,
				navigateByImgClick: true,
				preload: [0, 1],
				tPrev: $us.langOptions.magnificPopup.tPrev, // Alt text on left arrow
				tNext: $us.langOptions.magnificPopup.tNext, // Alt text on right arrow
				tCounter: $us.langOptions.magnificPopup.tCounter // Markup for "1 of 7" counter
			},
			image: {
				titleSrc: 'aria-label'
			},
			removalDelay: 300,
			mainClass: 'mfp-fade',
			fixedContentPos: true,
			callbacks: {
				beforeOpen: function() {
					var owlCarousel = $list.data( 'owl.carousel' );
					if ( owlCarousel && owlCarousel.settings.autoplay ) {
						$list.trigger( 'stop.owl.autoplay' );
					}
				},
				beforeClose: function() {
					var owlCarousel = $list.data( 'owl.carousel' );
					if ( owlCarousel && owlCarousel.settings.autoplay ) {
						$list.trigger( 'play.owl.autoplay' );
					}
				}
			}
		};
		$list.magnificPopup( popupOptions );
		if ( $list.hasClass( 'owl-carousel' ) ) {
			$list.on( 'initialized.owl.carousel', function( initEvent ) {
				var $currentList = $( initEvent.currentTarget ),
					items = {};
				$( '.owl-item:not(.cloned)', $currentList ).each( function( _, item ) {
					var $item = $( item ),
						id = $item.find( '[data-id]' ).data( 'id' );
					if ( ! items.hasOwnProperty( id ) ) {
						items[ id ] = $item;
					}
				} );
				$currentList.on( 'click', '.owl-item.cloned', function( e ) {
					e.preventDefault();
					e.stopPropagation();
					var id = $( '[data-id]', e.currentTarget ).data( 'id' );
					if ( items.hasOwnProperty( id ) ) {
						$( 'a[ref=magnificPopupGrid]', items[ id ] )
							.trigger( 'click' );
					}
				} );
			} );
		}
	} );

} )( jQuery );
