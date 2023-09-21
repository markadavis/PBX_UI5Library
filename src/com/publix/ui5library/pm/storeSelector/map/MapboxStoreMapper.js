sap.ui.define([
    "sap/ui/core/Control",
    "sap/base/Log",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/resource/ResourceModel",
    "sap/m/MessageBox"
], function (Control, Log, JSONModel, ResourceModel, MessageBox) {
    "use strict";

    return Control.extend("com.publix.ui5library.pm.storeSelector.map.StoreMapper", {
        _scriptsLoaded: null, _oMap: null, _oMarker: null, _oGeoCoder: null, _centerChangedTimerId: null,

        metadata: {
            properties: {
                /**
                 * Externalize the key in order to get it from parameters (maybe OData).
                 */
                "accessToken": {
                    "type": "string",
                    "defaultValue": "pk.eyJ1IjoicHVibGl4LW1hcmstZGF2aXMiLCJhIjoiY2xtNmkxcXVpMTViZjNtcXJzOHFwZWNyNiJ9.bHwm4-V3ngk4PGDBtK4A9A"  // TODO  !!!  THIS IS MARK'S API KEY - REMOVE BEFORE USING  !!!
                },
                "latitude": {
                    "type": "float",
                    "default": 0
                },
                "longitude": {
                    "type": "float",
                    "default": 0
                },
                "positionIP": {
                    "type": "string",
                    "default": ""
                },
                "address": {
                    "type": "string",
                    "defaultValue": ""
                },
                "defaultAddress": {
                    "type": "string",
                    "defaultValue": ""
                },
                "title": {
                    "type": "string",
                    "defaultValue": ""
                },
                "description": {
                    "type": "string",
                    "defaultValue": ""
                },
                "width": {
                    "type": "sap.ui.core.CSSSize",
                    "defaultValue": "100%"
                },
                "height": {
                    "type": "sap.ui.core.CSSSize",
                    "defaultValue": "600px"
                },
                "backgroundColor": {
                    "type": "sap.ui.core.CSSColor",
                    "defaultValue": "#C6BEBE"
                },
                "mapZoom": {
                    "type": "int",
                    "defaultValue": 10
                }
            },
            events:{
                centerChanged: {},  // After the map center has changed
                mapClicked: {}      // After the user clicks on the map
            },
            aggregations: {}
        },


        /* =========================================================== */
		/*  Lifecycle methods                                          */
		/* =========================================================== */

        init: function() {
            this.logger = Log.getLogger("com.publix.ui5library.pm.storeSelector.map.StoreMapper");

            const sImagesUri = jQuery.sap.getModulePath("com.publix.ui5library.pm.storeSelector.images") + ".json";
            this.imageModel = new JSONModel({});
            this.imageModel.loadData(sImagesUri);

            this._oResourceModel = new ResourceModel({
				bundleName: "com.publix.ui5library.pm.storeSelector.i18n.StoreSelector"
			});
			this._oResourceBundle = this._oResourceModel.getResourceBundle();

            this.setDescription(this._oResourceBundle.getText("storeMapper_apiDescription"));
            this.setTitle(this._oResourceBundle.getText("storeMapper_dialogTitle"));
            this.setDefaultAddress(this._oResourceBundle.getText("storeMapper_defaultAddress"));

            this._scriptsLoaded = this._loadScripts().catch(this._showError.bind(this));
        },

        renderer: function(oRm, oControl) {
            //Load Styles - TODO externalise this CSS/LESS
            const sGlobalStyle = `width:${oControl.getWidth()};height:${oControl.getHeight()};background:${oControl.getBackgroundColor()}`,
                sLoadingStyle = `color:#A09494;text-align:center;font-size:1rem;padding-top:2rem`;

            //   Target
            //   <div id='idMapLoading' style='width:100%;height:400px;background:#C6BEBE'>
            //  	<h1>Loading ...</h1>
            //   </div>
            oRm.write('<div');
            oRm.writeControlData(oControl);
            oRm.writeAttributeEscaped("style", sGlobalStyle);
            oRm.write('><div id="idMapBoxContent"');
            oRm.writeAttributeEscaped("style", sLoadingStyle);
            oRm.write(`></div>`)
            oRm.write('</div>')
        },

        onAfterRendering: function(oEvent) {
            // No API Key, No Google Map!
            if (!this.getAccessToken()) {
                this._showError('The MapBox Access Token is required.');
                return;
            }

            this._scriptsLoaded.then(() => {
                this._displayAddress();
            });
        },



        /* =========================================================== */
		/*  Public methods                                             */
		/* =========================================================== */

        search: function(sQuery) {
            return new Promise((fnResolve, fnReject) => {
                try {
                    const sUrl = `GET: https://api.mapbox.com/geocoding/v5/mapbox.places/${sQuery}.json?`
                        + `country=us&proximity=${this.getLongitude()}%2C${this.getLatitude()}`
                        + `&language=en`
                        + `&worldview=us`
                        + `&access_token=${this.getAccessToken()}`;
                    fetch(sUrl).then(oResponse => {
                        if (oResponse) {
                            fnResolve(oResponse.features || []);
                        }
                    }).catch(oError => {
                        this.logger.error(oError.message, this.sControlId + ".plugin.IpGeoLocation.getCurrentPosition()");
                        fnReject(oError);
                    });
                } catch(oError) {
                    this._showError(oError);
                    fnReject(oError);
                }
            });
        },



        /* =========================================================== */
		/*  Private methods                                            */
		/* =========================================================== */

        _loadScripts: function() {
            const sMapUrl = `https://api.mapbox.com/mapbox-gl-js/v2.14.1/mapbox-gl.js`,
                sGeoCoderUrl = `https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-geocoder/v5.0.0/mapbox-gl-geocoder.min.js`;

            return new Promise((fnResolve, fnReject) => {
                try {
                    // Check to see if it already exists - Load it only once!
                    if (mapboxgl) {
                        fnResolve();
                    }
                } catch (oError) {
                    // If MapBox API was not loaded we get something like a 'ReferenceError'
                    // Try to load the MapBox API
                    if (oError instanceof ReferenceError) {
                        // TODO maybe remove jQuery and replace with JS 'fetch'.
                        $.getScript(sMapUrl).done((sScript, sStatus) => {
                            mapboxgl.accessToken = this.getAccessToken();
                            $.getScript(sGeoCoderUrl).done((sScript, sStatus) => {
                                fnResolve();
                            }).fail((jqxhr, oSettings, oException) => {
                                fnReject(new Error(this._oResourceBundle.getText("storeMapper_apiUnableToLoad")));
                            });

                        }).fail((jqxhr, oSettings, oException) => {
                            fnReject(new Error(this._oResourceBundle.getText("storeMapper_apiUnableToLoad")));
                        });
                    } else {
                        fnReject(new Error(this._oResourceBundle.getText("storeMapper_apiUnableToLoad")));
                    }
                }
            })
        },

        _getMap(oConfig) {
            this._oMap = null;

            // Create the map.
            this._oMap = new mapboxgl.Map({ // Choose from Mapbox's core styles, or make your own style with Mapbox Studio
                container: 'idMapBoxContent',                                   // container ID
                style: 'mapbox://styles/mapbox/streets-v12',        // style URL
                center: [this.getLongitude(), this.getLatitude()],  // starting position [lng, lat]
                zoom: this.getMapZoom()                             // starting zoom
            });

            return this._oMap;
        },

        _showError: function(oError) {
            const sMessage = typeof(oError) === "string" ? oError : oError.message;
            MessageBox.error(sMessage);
        },

        _displayAddress: function() {
            const fnLookup = (sAddress) => {
                // Get the Geo Location info for the given address.
                const oSearchAddress = new Promise((fnResolve, fnReject) => {
                    if (!this._oGeoCoder) {
                        this._oGeoCoder = new MapboxGeocoder({
                            accessToken: mapboxgl.accessToken,
                            mapboxgl: mapboxgl
                        });

                        map.addControl(this._oGeoCoder);
                    }

                    const sUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/`
                        +`${this.getLongitude()}%2C${this.getLatitude()}.json`
                        + `?&access_token=${this.getAccessToken()}`;
                    fetch(sUrl).then(oResponse => {
                        let oPlace = oResponse.features & oResponse.features.length > 0 ? oResponse.features[0] : null;
                        if (oPlace) {
                            this.setDefaultAddress(oPlace.address || "");
                            this.setLongitude(oPlace.center[0]);
                            this.setLatitude(oPlace.center[1]);
                        }
                        fnResolve();
                    }).catch(oError => {
                        this.logger.error(oError.message, this.sControlId + ".plugin.IpGeoLocation.getCurrentPosition()");
                        fnReject(oError);
                    });
                });

                // Launch the address lookup and return control to the Mapper.
                oSearchAddress
                    // .then(() => {/* do something */})
                    .catch(this._showError.bind(this));            
            };

            if (!this.getLatitude() || !this.getLongitude()) {
                let sAddress = this.getAddress();
                if (sAddress) {
                    fnLookup(sAddress);
                } else {
                    this.search(this._oResourceBundle.getText("storeMapper_apiDefaultSearch")).then(aPlaces => {
                        let oPlace = aPlaces.length > 0 ? aPlaces[0] : null;
                        sAddress = oPlace ? oPlace.formatted_address : "";
                        if (sAddress) {
                            this._oMarker.setTitle(oPlace.name || "Publix");
                            fnLookup(sAddress);
                        }
                    }).catch(oError => {
                        // TODO - log error view in dialog.
                    });
                }
            }
        }

    });
});